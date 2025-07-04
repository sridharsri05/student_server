import { stripe, stripeConfig } from '../config/stripe.js';
import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import EMIPayment from '../models/EMIPayment.js';

// Create a payment intent for Stripe
export const createPaymentIntent = async (req, res) => {
    try {
        const { paymentId, currency = stripeConfig.currency.default } = req.body;

        // Get payment details from database
        const payment = await Payment.findById(paymentId).populate('student');

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Amount in smallest currency unit (cents/paisa)
        // Stripe requires amounts in the smallest currency unit
        const amount = Math.round(payment.remainingAmount * 100);

        if (amount <= 0) {
            return res.status(400).json({ error: 'Payment amount must be greater than 0' });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            metadata: {
                paymentId: payment._id.toString(),
                studentId: payment.student._id.toString(),
                studentName: payment.student.name,
                invoiceNumber: payment.invoiceNumber
            },
            receipt_email: payment.student.email,
            description: `Payment for ${payment.courseName}`,
        });

        // Save the payment intent ID to our payment record
        payment.gatewayPaymentId = paymentIntent.id;
        payment.gatewayProvider = 'stripe';
        await payment.save();

        // Return client secret and payment details to frontend
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentId: payment._id,
            amount: amount / 100,
            currency,
            publicKey: stripeConfig.publicKey
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({
            error: 'Failed to create payment intent',
            details: error.message
        });
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

                // Update student status
                await Student.findByIdAndUpdate(payment.student, {
                    status: 'active-paid',
                    feeStatus: 'paid'
                });
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

                        // Update student status
                        await Student.findByIdAndUpdate(mainPayment.student, {
                            status: 'active-paid',
                            feeStatus: 'paid'
                        });
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