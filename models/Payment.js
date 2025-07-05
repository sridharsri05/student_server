import mongoose from 'mongoose';

const installmentSchema = new mongoose.Schema({
    month: { type: Number, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue', 'cancelled'],
        default: 'pending'
    },
    paidDate: Date,
    paidAmount: Number,
    transactionId: String,
    notes: String
});

const paymentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    courseName: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    depositAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number },
    installmentMonths: { type: Number, default: 1 },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque'],
        required: true
    },
    status: {
        type: String,
        enum: ['completed', 'pending', 'failed', 'refunded'],
        default: 'pending'
    },
    dueDate: { type: Date },
    notes: String,
    installments: [installmentSchema],
    invoiceNumber: { type: String, unique: true },
    receiptNumber: { type: String, unique: true },
    transactionId: String,
    feeStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Calculate remaining amount before saving
paymentSchema.pre('save', function (next) {
    this.remainingAmount = this.totalAmount - this.depositAmount;
    this.updatedAt = new Date();

    // Validate dueDate only if payment is not completed
    if (this.status !== 'completed' && !this.dueDate) {
        const error = new Error('Due date is required for non-completed payments');
        return next(error);
    }

    next();
});

// Auto-generate invoice and receipt numbers
paymentSchema.pre('save', async function (next) {
    if (this.isNew) {
        const count = await mongoose.model('Payment').countDocuments();
        this.invoiceNumber = `INV${String(count + 1).padStart(6, '0')}`;
        if (this.depositAmount > 0) {
            this.receiptNumber = `RCP${String(count + 1).padStart(6, '0')}`;
        }
    }
    next();
});

export default mongoose.model('Payment', paymentSchema);
