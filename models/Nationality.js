import mongoose from 'mongoose';

const nationalitySchema = new mongoose.Schema({
    name: { type: String, required: true }
});

export default mongoose.model('Nationality', nationalitySchema);
