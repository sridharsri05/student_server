import mongoose from 'mongoose';

const emiPaymentSchema = new mongoose.Schema({
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    installmentNumber: { type: Number, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paidDate: Date,
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue', 'cancelled', 'processing'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'online']
    },
    transactionId: String,
    receiptNumber: String,
    notes: String,
    lateFee: { type: Number, default: 0 },
    remindersSent: [{
        date: Date,
        method: String, // 'whatsapp', 'email', etc.
        status: String
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // Payment gateway fields
    gatewayProvider: {
        type: String,
        enum: ['stripe', 'razorpay', 'paypal', null],
        default: null
    },
    gatewayPaymentId: String,
    gatewayResponse: String,
    currency: {
        type: String,
        enum: ['INR', 'USD', 'EUR', 'GBP'],
        default: 'INR'
    },
    paymentUrl: String,
    paymentAttempts: [{
        date: Date,
        status: String,
        gatewayResponse: String
    }]
});

// Auto-update status based on due date
emiPaymentSchema.pre('save', function (next) {
    const now = new Date();

    // Only update status if it's not explicitly set
    if (!this.isModified('status')) {
        // Require both paidDate AND transactionId to mark as paid
        // This prevents accidental status changes during deposit payments
        if (this.paidDate && this.transactionId && this.gatewayPaymentId) {
            this.status = 'paid';
        }
        // If past due date and not being processed, mark as overdue
        else if (now > this.dueDate && this.status !== 'processing') {
            this.status = 'overdue';
        } else {
            // Ensure status remains pending by default
            this.status = 'pending';
        }
    }

    this.updatedAt = now;
    next();
});

// Generate receipt number when paid
emiPaymentSchema.pre('save', async function (next) {
    if (this.isModified('status') && this.status === 'paid' && !this.receiptNumber) {
        const count = await mongoose.model('EMIPayment').countDocuments();
        this.receiptNumber = `EMI${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

export default mongoose.model('EMIPayment', emiPaymentSchema);
