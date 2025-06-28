import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University' }
});

export default mongoose.model('Course', courseSchema);
