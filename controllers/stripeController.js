import { stripe, stripeConfig } from '../config/stripe.js';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import EMIPayment from '../models/EMIPayment.js';

// Create a payment intent for Stripe
export const createPaymentIntent = async (req, res) => {
    try {
        const { paymentId, currency = stripeConfig.currency.default } = req.body;

        // Fetch payment details
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Get student details for the payment
        const student = await Student.findById(payment.student);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Stripe requires amounts in the smallest currency unit
        const amount = Math.round((payment.remainingAmount || payment.totalAmount) * 100);

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                paymentId: payment._id.toString(),
                studentId: student._id.toString(),
            },
        });

        // Update payment with Stripe details
        payment.gatewayProvider = 'stripe';
        payment.gatewayPaymentId = paymentIntent.id;
        await payment.save();

        // Return client secret
        res.json({
            clientSecret: paymentIntent.client_secret,
            publicKey: stripeConfig.publicKey
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create a payment intent for EMI payment
export const createEMIPaymentIntent = async (req, res) => {
    try {
        const { emiPaymentId, currency = stripeConfig.currency.default } = req.body;

        // Get EMI payment details from database
        const emiPayment = await EMIPayment.findById(emiPaymentId).populate('student');

        if (!emiPayment) {
            return res.status(404).json({ error: 'EMI Payment not found' });
        }

        // Amount in smallest currency unit (cents/paisa)
        const amount = Math.round(emiPayment.amount * 100);

        // Create payment intent for EMI
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            metadata: {
                emiPaymentId: emiPayment._id.toString(),
                studentId: emiPayment.student._id.toString(),
                installmentNumber: emiPayment.installmentNumber.toString()
            },
            receipt_email: emiPayment.student.email,
            description: `EMI Payment #${emiPayment.installmentNumber}`,
        });

        // Save the payment intent ID to our EMI payment record
        emiPayment.gatewayPaymentId = paymentIntent.id;
        emiPayment.gatewayProvider = 'stripe';
        await emiPayment.save();

        // Return client secret to frontend
        res.json({
            clientSecret: paymentIntent.client_secret,
            emiPaymentId: emiPayment._id,
            amount: amount / 100,
            currency,
            publicKey: stripeConfig.publicKey
        });
    } catch (error) {
        console.error('Error creating EMI payment intent:', error);
        res.status(500).json({
            error: 'Failed to create EMI payment intent',
            details: error.message
        });
    }
};

// Handle Stripe webhook events
export const handleWebhook = async (req, res) => {
    const signature = req.headers['stripe-signature'];

    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            stripeConfig.webhookSecret
        );

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailure(event.data.object);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error(`Webhook error: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

// Handle successful payment
async function handlePaymentSuccess(paymentIntent) {
    try {
        const { paymentId, emiPaymentId } = paymentIntent.metadata;

        if (paymentId) {
            // Update main payment record
            const payment = await Payment.findById(paymentId);
            if (payment) {
                payment.status = 'completed';
                payment.transactionId = paymentIntent.id;
                payment.paidDate = new Date();
                payment.gatewayResponse = JSON.stringify(paymentIntent);

                if (!payment.receiptNumber) {
                    const count = await Payment.countDocuments();
                    payment.receiptNumber = `RCP${String(count + 1).padStart(6, '0')}`;
                }

                await payment.save();

                // Fetch the student record
                const student = await Student.findById(payment.student);

                if (student) {
                    // Calculate the payment amount
                    const paymentAmount = payment.depositAmount > 0 ? payment.depositAmount : payment.totalAmount;

                    // Update student's fee information
                    // If totalFees is 0, set it to the total amount from payment
                    if (student.totalFees === 0) {
                        student.totalFees = payment.totalAmount;
                    }

                    // Update paid amount - add this payment to any existing paid amount
                    student.paidAmount = (student.paidAmount || 0) + paymentAmount;

                    // Calculate remaining amount
                    student.remainingAmount = student.totalFees - student.paidAmount;

                    // Update status
                    student.status = 'active';
                    student.feeStatus = student.remainingAmount <= 0 ? 'complete' : 'partial';

                    // Save the updated student record
                    await student.save();

                    console.log('Student record updated with payment information via webhook', {
                        studentId: student._id,
                        totalFees: student.totalFees,
                        paidAmount: student.paidAmount,
                        remainingAmount: student.remainingAmount,
                        feeStatus: student.feeStatus
                    });
                } else {
                    console.warn(`Student not found for payment: ${payment._id}`);
                }
            }
        }

        if (emiPaymentId) {
            // Update EMI payment record
            const emiPayment = await EMIPayment.findById(emiPaymentId);
            if (emiPayment) {
                emiPayment.status = 'paid';
                emiPayment.paidDate = new Date();
                emiPayment.transactionId = paymentIntent.id;
                emiPayment.paymentMethod = 'online';

                if (!emiPayment.receiptNumber) {
                    const count = await EMIPayment.countDocuments();
                    emiPayment.receiptNumber = `EMI${String(count + 1).padStart(6, '0')}`;
                }

                await emiPayment.save();

                // Check if all EMIs are paid and update main payment
                const mainPayment = await Payment.findById(emiPayment.payment);
                if (mainPayment) {
                    const pendingEMIs = await EMIPayment.countDocuments({
                        payment: mainPayment._id,
                        status: { $in: ['pending', 'overdue'] }
                    });

                    if (pendingEMIs === 0) {
                        mainPayment.status = 'completed';
                        await mainPayment.save();

                        // Fetch the student record
                        const student = await Student.findById(mainPayment.student);

                        if (student) {
                            // Update student's fee information for EMI completion
                            // Calculate total paid amount from all EMIs
                            const paidEMIs = await EMIPayment.find({
                                payment: mainPayment._id,
                                status: 'paid'
                            });

                            const totalPaid = paidEMIs.reduce((sum, emi) => sum + (emi.amount || 0), 0);

                            // Update student record
                            student.paidAmount = totalPaid;
                            student.status = 'active';
                            student.feeStatus = 'complete';

                            // Save the updated student record
                            await student.save();

                            console.log('Student record updated with EMI payment completion', {
                                studentId: student._id,
                                totalFees: student.totalFees,
                                paidAmount: student.paidAmount,
                                remainingAmount: student.remainingAmount,
                                feeStatus: student.feeStatus
                            });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error processing payment success:', error);
    }
}

// Handle failed payment
async function handlePaymentFailure(paymentIntent) {
    try {
        const { paymentId, emiPaymentId } = paymentIntent.metadata;

        if (paymentId) {
            const payment = await Payment.findById(paymentId);
            if (payment) {
                payment.gatewayResponse = JSON.stringify(paymentIntent);
                await payment.save();
            }
        }

        if (emiPaymentId) {
            const emiPayment = await EMIPayment.findById(emiPaymentId);
            if (emiPayment) {
                emiPayment.notes = `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`;
                await emiPayment.save();
            }
        }
    } catch (error) {
        console.error('Error processing payment failure:', error);
    }
}

// Add this method after handlePaymentFailure function
export const manualPaymentStatusUpdate = async (req, res) => {
    console.log('Manual Payment Status Update Request Received', {
        body: req.body,
        user: req.user ? req.user._id : 'No User',
        timestamp: new Date().toISOString()
    });

    const { paymentId, paymentIntentId } = req.body;

    // Validate input
    if (!paymentId || !paymentIntentId) {
        console.warn('Invalid input for manual payment status update', {
            paymentId,
            paymentIntentId
        });
        return res.status(400).json({
            error: 'Payment ID and Payment Intent ID are required',
            details: { paymentId, paymentIntentId }
        });
    }

    try {
        // Log the incoming update request
        console.log(`Attempting to update payment status for Payment ID: ${paymentId}, Payment Intent: ${paymentIntentId}`);

        // Retrieve the payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        console.log('Stripe Payment Intent Retrieved', {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
        });

        // Find the corresponding payment in the database
        // Try to find by gatewayPaymentId first, then by _id if provided
        let payment = await Payment.findOne({
            gatewayPaymentId: paymentIntentId
        });

        // If not found by gatewayPaymentId, try to find by _id (paymentId)
        if (!payment && paymentId) {
            payment = await Payment.findById(paymentId);

            // If found by ID but gatewayPaymentId doesn't match, update it
            if (payment && !payment.gatewayPaymentId) {
                payment.gatewayPaymentId = paymentIntentId;
            }
        }

        if (!payment) {
            console.error(`Payment not found for Payment Intent: ${paymentIntentId} or Payment ID: ${paymentId}`);
            return res.status(404).json({
                error: 'Payment record not found',
                details: { paymentIntentId, paymentId }
            });
        }

        // Check payment intent status
        if (paymentIntent.status !== 'succeeded') {
            console.warn(`Payment Intent ${paymentIntentId} status is not 'succeeded'. Current status: ${paymentIntent.status}`);
            return res.status(400).json({
                error: 'Payment not yet completed',
                currentStatus: paymentIntent.status
            });
        }

        // Update payment status
        payment.status = 'completed';
        payment.paidDate = new Date();
        payment.transactionId = paymentIntent.id;

        // Generate receipt number if not already set
        if (!payment.receiptNumber) {
            const count = await Payment.countDocuments();
            payment.receiptNumber = `RCP${String(count + 1).padStart(6, '0')}`;
        }

        // Save the updated payment
        await payment.save();

        // Fetch the student record
        const student = await Student.findById(payment.student);

        if (!student) {
            console.warn(`Student not found for payment: ${payment._id}`);
            return res.status(404).json({
                error: 'Student record not found',
                details: { studentId: payment.student }
            });
        }

        // Calculate the payment amount
        const paymentAmount = payment.depositAmount > 0 ? payment.depositAmount : payment.totalAmount;

        // Update student's fee information
        // If totalFees is 0, set it to the total amount from payment
        if (student.totalFees === 0) {
            student.totalFees = payment.totalAmount;
        }

        // Update paid amount - add this payment to any existing paid amount
        student.paidAmount = (student.paidAmount || 0) + paymentAmount;

        // Calculate remaining amount
        student.remainingAmount = student.totalFees - student.paidAmount;

        // Update status
        student.status = 'active';
        student.feeStatus = student.remainingAmount <= 0 ? 'complete' : 'partial';

        // Save the updated student record
        await student.save();

        console.log('Student record updated with payment information', {
            studentId: student._id,
            totalFees: student.totalFees,
            paidAmount: student.paidAmount,
            remainingAmount: student.remainingAmount,
            feeStatus: student.feeStatus
        });

        // Log successful update
        console.log(`Payment ${paymentId} successfully updated to completed`, {
            paymentDetails: {
                _id: payment._id,
                studentId: payment.student,
                amount: payment.totalAmount,
                courseName: payment.courseName
            },
            studentUpdated: true
        });

        return res.status(200).json({
            message: 'Payment status updated successfully',
            paymentId: payment._id,
            status: 'completed'
        });

    } catch (error) {
        // Log any unexpected errors
        console.error('Error in manual payment status update', {
            error: error.message,
            stack: error.stack,
            paymentId,
            paymentIntentId
        });

        return res.status(500).json({
            error: 'Internal server error during payment status update',
            details: error.message
        });
    }
};

// Get payment methods for a customer
export const getPaymentMethods = async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // If student doesn't have a Stripe customer ID, create one
        if (!student.stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: student.email,
                name: student.name,
                phone: student.phone,
                metadata: {
                    studentId: student._id.toString()
                }
            });

            student.stripeCustomerId = customer.id;
            await student.save();
        }

        // Get saved payment methods for the customer
        const paymentMethods = await stripe.paymentMethods.list({
            customer: student.stripeCustomerId,
            type: 'card'
        });

        res.json({ paymentMethods: paymentMethods.data });
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({
            error: 'Failed to fetch payment methods',
            details: error.message
        });
    }
};

// Get Stripe configuration
export const getConfig = async (req, res) => {
    try {
        res.json({
            publicKey: stripeConfig.publicKey
        });
    } catch (error) {
        console.error('Error getting Stripe config:', error);
        res.status(500).json({ error: 'Failed to get Stripe configuration' });
    }
}; 