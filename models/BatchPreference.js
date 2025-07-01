import mongoose from 'mongoose';

const batchPreferenceSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

export default mongoose.model('BatchPreference', batchPreferenceSchema);
