import mongoose from 'mongoose';

const paymentModeSchema = new mongoose.Schema({
    name: { type: String, required: true }
});

export default mongoose.model('PaymentMode', paymentModeSchema);
