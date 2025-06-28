import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true }
});

export default mongoose.model('Batch', batchSchema);
