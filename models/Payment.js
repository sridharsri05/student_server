import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    totalFee: Number,
    depositPaid: Number,
    dueBalance: Number,
    selectedMonths: [String],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Payment', paymentSchema);
