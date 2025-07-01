import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
    label: String,
    path: String,
});

const menuSchema = new mongoose.Schema({
    role: { type: String, required: true, unique: true },
    items: [menuItemSchema],
});

export default mongoose.model('Menu', menuSchema);
