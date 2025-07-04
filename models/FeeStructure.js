import mongoose from 'mongoose';

const feeStructureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['recurring', 'one-time'], default: 'recurring' },
  amount: { type: Number, required: true },
  frequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'annually', 'once'],
    default: 'monthly'
  },
  category: { type: String, default: 'tuition' },
  description: String,
  dueDate: Number, // 1-31 (day of month) or null for one-time fees
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Automatically update updatedAt on save
feeStructureSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('FeeStructure', feeStructureSchema); 