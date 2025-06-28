import mongoose from 'mongoose';

const feeMasterSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    totalFee: Number,
    depositAmount: Number,
    durationMonths: Number
});

export default mongoose.model('FeeMaster', feeMasterSchema);
