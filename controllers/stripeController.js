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
        // Log webhook request details for debugging
        console.log('Webhook request received', {
            hasSignature: !!signature,
            bodyType: typeof req.body,
            bodyIsBuffer: Buffer.isBuffer(req.body),
            bodyLength: req.body ? (Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length) : 0,
            timestamp: new Date().toISOString()
        });

        if (!signature) {
            console.error('Webhook signature missing');
            return res.status(400).send('Webhook signature missing');
        }

        if (!stripeConfig.webhookSecret) {
            console.error('Webhook secret not configured');
            return res.status(500).send('Webhook secret not configured');
        }

        // Verify and construct the event
        const event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            stripeConfig.webhookSecret
        );

        console.log(`Webhook event received: ${event.type}`, {
            eventId: event.id,
            eventType: event.type,
            timestamp: new Date().toISOString()
        });

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

        res.json({ received: true, eventType: event.type });
    } catch (err) {
        console.error('Webhook error:', {
            message: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString()
        });
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

// Handle successful payment
async function handlePaymentSuccess(paymentIntent) {
    try {
        const { paymentId, emiPaymentId } = paymentIntent.metadata;

        console.log('Processing payment success webhook', {
            paymentIntent: paymentIntent.id,
            metadata: paymentIntent.metadata,
            amount: paymentIntent.amount,
            paymentId,
            emiPaymentId,
            timestamp: new Date().toISOString()
        });

        if (paymentId) {
            // Update main payment record
            const payment = await Payment.findById(paymentId);
            if (payment) {
                // Determine if this is a deposit payment
                const isDepositPayment =
                    payment.depositAmount > 0 &&
                    Math.abs(payment.depositAmount - (paymentIntent.amount / 100)) < 0.01;

                console.log('Payment Details', {
                    totalAmount: payment.totalAmount,
                    depositAmount: payment.depositAmount,
                    paymentIntentAmount: paymentIntent.amount / 100,
                    isDepositPayment
                });

                // Update payment status
                if (isDepositPayment) {
                    payment.status = 'partial';
                } else if (payment.totalAmount <= (paymentIntent.amount / 100)) {
                    payment.status = 'completed';
                }

                // Ensure gateway payment details are updated
                payment.gatewayPaymentId = paymentIntent.id;
                payment.gatewayResponse = JSON.stringify(paymentIntent);

                await payment.save();

                // If it's a deposit payment, ENSURE no EMIs are marked as paid
                if (isDepositPayment) {
                    const emiPayments = await EMIPayment.find({ payment: payment._id });

                    for (const emi of emiPayments) {
                        console.log(`Resetting EMI ${emi._id} to pending status`);
                        emi.status = 'pending';
                        emi.paidDate = null;
                        emi.transactionId = null;
                        emi.gatewayPaymentId = null;
                        await emi.save();
                    }
                }

                return payment;
            }
        }
    } catch (error) {
        console.error('Error in handlePaymentSuccess', error);
        throw error;
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

        // First, check if this is an EMI payment
        let emiPayment = await EMIPayment.findById(paymentId);

        // If not found directly, check in EMI payments with the payment intent ID
        if (!emiPayment) {
            emiPayment = await EMIPayment.findOne({ gatewayPaymentId: paymentIntentId });

            if (emiPayment) {
                console.log(`EMI payment found by payment intent ID instead of payment ID. EMI ID: ${emiPayment._id}`);
            }
        }

        // If still not found, check for metadata in the payment intent
        if (!emiPayment && paymentIntent.metadata && paymentIntent.metadata.emiPaymentId) {
            emiPayment = await EMIPayment.findById(paymentIntent.metadata.emiPaymentId);
            if (emiPayment) {
                console.log(`EMI payment found using metadata from payment intent. EMI ID: ${emiPayment._id}`);
            }
        }

        // If still not found, try to find any EMI payment for the student in the payment intent metadata
        if (!emiPayment && paymentIntent.metadata && paymentIntent.metadata.studentId) {
            const studentEmiPayments = await EMIPayment.find({
                student: paymentIntent.metadata.studentId,
                status: { $in: ['pending', 'overdue'] }
            }).sort({ dueDate: 1 }).limit(1);

            if (studentEmiPayments && studentEmiPayments.length > 0) {
                emiPayment = studentEmiPayments[0];
                console.log(`EMI payment found by student ID from metadata. EMI ID: ${emiPayment._id}`);
            }
        }

        if (emiPayment) {
            console.log('Found EMI payment record, redirecting to EMI update handler');
            // Use the EMI payment update handler instead
            return manualEMIPaymentUpdate({
                params: { id: emiPayment._id.toString() },
                body: {
                    paymentIntentId,
                    status: 'paid',
                    paidDate: new Date().toISOString(),
                    paymentMethod: 'online',
                    transactionId: paymentIntentId
                }
            }, res);
        }

        // If not an EMI payment, continue with regular payment processing
        // Find the corresponding payment in the database
        // Try to find by gatewayPaymentId first, then by _id if provided
        let payment = await Payment.findOne({
            gatewayPaymentId: paymentIntentId
        });

        // If not found by gatewayPaymentId, try to find by _id (paymentId)
        if (!payment && paymentId) {
            payment = await Payment.findById(paymentId);
        }

        // If still not found, check for metadata in the payment intent
        if (!payment && paymentIntent.metadata && paymentIntent.metadata.paymentId) {
            payment = await Payment.findById(paymentIntent.metadata.paymentId);
            if (payment) {
                console.log(`Payment found using metadata from payment intent. Payment ID: ${payment._id}`);
            }
        }

        // If still not found, try to find any payment for the student in the payment intent metadata
        if (!payment && paymentIntent.metadata && paymentIntent.metadata.studentId) {
            const studentPayments = await Payment.find({
                student: paymentIntent.metadata.studentId,
                status: { $in: ['pending', 'partial'] }
            }).sort({ createdAt: -1 }).limit(1);

            if (studentPayments && studentPayments.length > 0) {
                payment = studentPayments[0];
                console.log(`Payment found by student ID from metadata. Payment ID: ${payment._id}`);
            }
        }

        // Last resort: try to find payments with similar IDs (in case of typos)
        if (!payment && paymentId && paymentId.length >= 20) {
            // Get first 20 chars of the ID to match on
            const idPrefix = paymentId.substring(0, 20);
            console.log(`Trying to find payment with similar ID prefix: ${idPrefix}`);

            // Use regex to find payments with similar IDs
            const similarPayments = await Payment.find({
                _id: { $regex: new RegExp('^' + idPrefix) }
            }).limit(1);

            if (similarPayments && similarPayments.length > 0) {
                payment = similarPayments[0];
                console.log(`Found payment with similar ID. Actual ID: ${payment._id}, Requested ID: ${paymentId}`);
            }
        }

        if (!payment) {
            console.error(`Payment not found for Payment Intent: ${paymentIntentId} or Payment ID: ${paymentId}`);
            return res.status(404).json({
                error: 'Payment record not found',
                details: { paymentIntentId, paymentId }
            });
        }

        // If found by ID but gatewayPaymentId doesn't match, update it
        if (payment && !payment.gatewayPaymentId) {
            payment.gatewayPaymentId = paymentIntentId;
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
        console.log(`Payment ${payment._id} successfully updated to completed`, {
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

// Manual update for EMI payments
export const manualEMIPaymentUpdate = async (req, res) => {
    console.log('Manual EMI Payment Update Request Received', {
        body: req.body,
        params: req.params,
        user: req.user ? req.user._id : 'No User',
        timestamp: new Date().toISOString()
    });

    const { id } = req.params;
    const { status, paidDate, paymentMethod, paymentIntentId, transactionId } = req.body;

    // Validate input
    if (!id) {
        console.warn('Invalid input for manual EMI payment update', { id });
        return res.status(400).json({
            error: 'EMI Payment ID is required',
            details: { id }
        });
    }

    try {
        // Find the EMI payment
        const emiPayment = await EMIPayment.findById(id);

        if (!emiPayment) {
            console.warn(`EMI Payment not found: ${id}`);
            return res.status(404).json({
                error: 'EMI Payment not found',
                details: { id }
            });
        }

        // Retrieve the associated payment
        const payment = await Payment.findById(emiPayment.payment);

        if (!payment) {
            console.warn(`Payment not found for EMI Payment: ${id}`);
            return res.status(404).json({
                error: 'Associated Payment not found',
                details: { emiPaymentId: id }
            });
        }

        // Prevent status changes during deposit payments
        const isDepositPayment = payment.depositAmount > 0;
        if (isDepositPayment) {
            console.warn(`Attempted to update EMI status during deposit payment: ${id}`);
            return res.status(400).json({
                error: 'Cannot update EMI status during deposit payment',
                details: {
                    emiPaymentId: id,
                    paymentId: payment._id,
                    depositAmount: payment.depositAmount
                }
            });
        }

        // Update EMI payment details
        emiPayment.status = 'paid';
        emiPayment.paidDate = new Date(paidDate || Date.now());
        emiPayment.paymentMethod = paymentMethod || 'online';
        if (paymentIntentId) emiPayment.gatewayPaymentId = paymentIntentId;
        if (transactionId) emiPayment.transactionId = transactionId;

        // Save the updated EMI payment
        await emiPayment.save();

        // Check if all EMIs are paid for this payment
        const pendingEMIs = await EMIPayment.countDocuments({
            payment: emiPayment.payment,
            status: { $in: ['pending', 'overdue'] }
        });

        // Retrieve all EMI payments for this payment
        const allEMIPayments = await EMIPayment.find({ payment: emiPayment.payment });

        // Update main payment status based on EMIs
        const mainPaymentToUpdate = await Payment.findById(emiPayment.payment);
        if (mainPaymentToUpdate) {
            // Determine new payment status
            if (pendingEMIs === 0) {
                mainPaymentToUpdate.status = 'completed';
            } else {
                mainPaymentToUpdate.status = 'partial';
            }
            await mainPaymentToUpdate.save();

            // Update student record
            const student = await Student.findById(mainPaymentToUpdate.student);
            if (student) {
                // Calculate how much has been paid in total (deposit + paid EMIs)
                const paidEMIs = allEMIPayments.filter(emi => emi.status === 'paid');
                const totalPaidInEMIs = paidEMIs.reduce((total, emi) => total + (emi.amount || 0), 0);
                const totalPaid = (mainPaymentToUpdate.depositAmount || 0) + totalPaidInEMIs;

                student.paidAmount = totalPaid;
                student.remainingAmount = (student.totalFees || mainPaymentToUpdate.totalAmount) - totalPaid;

                // Update fee status
                if (student.remainingAmount <= 0) {
                    student.feeStatus = 'complete';
                    student.status = 'active-paid';
                } else {
                    student.feeStatus = 'partial';
                    student.status = 'active';
                }

                // If there are more pending EMIs, set the next due date
                if (pendingEMIs > 0) {
                    const nextEMI = await EMIPayment.findOne({
                        payment: mainPaymentToUpdate._id,
                        status: { $in: ['pending', 'overdue'] }
                    }).sort({ dueDate: 1 });

                    if (nextEMI) {
                        student.nextPaymentDue = nextEMI.dueDate;
                    }
                } else {
                    student.nextPaymentDue = null; // No more payments due
                }

                await student.save();
            }
        }

        console.log(`EMI Payment updated successfully: ${emiPayment._id}`, {
            status: emiPayment.status,
            pendingEMIs: pendingEMIs
        });

        return res.status(200).json({
            message: 'EMI Payment status updated successfully',
            emiPaymentId: emiPayment._id,
            status: emiPayment.status,
            pendingEMIs: pendingEMIs
        });
    } catch (error) {
        console.error('Error in manual EMI payment update', error);
        return res.status(500).json({
            error: 'Internal server error',
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