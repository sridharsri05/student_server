import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    name: String,
    matrixNumber: { type: String, unique: true },
    email: String,
    phone: String,
    address: String,
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    nationality: { type: mongoose.Schema.Types.ObjectId, ref: 'Nationality' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Student', studentSchema);
