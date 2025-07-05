import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16', // Use latest API version
});

// Configuration for different payment modes
const stripeConfig = {
    // Payment methods supported
    paymentMethods: ['card', 'upi', 'netbanking'],

    // Currency configuration
    currency: {
        default: 'INR',
        supported: ['INR', 'USD', 'EUR', 'GBP']
    },

    // Webhook secret for verifying events
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

    // Public key for frontend
    publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
};

export { stripe, stripeConfig }; 