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

                // Update student status
                await Student.findByIdAndUpdate(payment.student, {
                    status: 'active',
                    feeStatus: 'complete'
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
                            status: 'active',
                            feeStatus: 'complete'
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

// Add this method after handlePaymentFailure function
export const manualPaymentStatusUpdate = async (req, res) => {
    try {
        const { paymentId, paymentIntentId } = req.body;

        // Verify the payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            // Use existing success handler logic
            await handlePaymentSuccess(paymentIntent);

            return res.status(200).json({ 
                message: 'Payment status updated successfully',
                status: 'completed'
            });
        } else {
            return res.status(400).json({ 
                message: 'Payment not yet succeeded', 
                currentStatus: paymentIntent.status 
            });
        }
    } catch (error) {
        console.error('Error in manual payment status update:', error);
        res.status(500).json({ 
            error: 'Failed to update payment status', 
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