import mongoose from 'mongoose';

const universitySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

export default mongoose.model('University', universitySchema);
