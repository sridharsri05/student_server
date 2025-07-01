import mongoose from 'mongoose';

const courseModeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

export default mongoose.model('CourseMode', courseModeSchema);
