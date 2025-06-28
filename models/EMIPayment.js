import mongoose from 'mongoose';

const emiPaymentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    month: String,
    amount: Number,
    paymentMode: String,
    paymentDate: { type: Date, default: Date.now }
});

export default mongoose.model('EMIPayment', emiPaymentSchema);
