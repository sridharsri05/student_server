import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  code: { 
    type: String, 
    unique: true,
    trim: true,
    uppercase: true
  },
  type: { 
    type: String, 
    enum: ['percentage', 'fixed', 'scholarship'],
    required: true,
    default: 'percentage'
  },
  value: { 
    type: Number, 
    required: true,
    min: 0
  },
  maxAmount: {
    type: Number,
    min: 0
  },
  applicableCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  applicableFeeStructures: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure'
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  minPurchaseAmount: {
    type: Number,
    default: 0
  },
  maxUsageCount: Number,
  currentUsageCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Middleware to update the updatedAt field
discountSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual property to check if discount is expired
discountSchema.virtual('isExpired').get(function() {
  if (!this.endDate) return false;
  return new Date() > this.endDate;
});

// Virtual property to check if discount is valid (active and not expired)
discountSchema.virtual('isValid').get(function() {
  if (!this.isActive) return false;
  if (this.isExpired) return false;
  if (this.maxUsageCount && this.currentUsageCount >= this.maxUsageCount) return false;
  return true;
});

// Method to calculate discount amount
discountSchema.methods.calculateDiscount = function(originalAmount) {
  if (!this.isValid) return 0;
  
  let discountAmount = 0;
  
  if (originalAmount < this.minPurchaseAmount) return 0;
  
  if (this.type === 'percentage') {
    discountAmount = originalAmount * (this.value / 100);
    if (this.maxAmount && discountAmount > this.maxAmount) {
      discountAmount = this.maxAmount;
    }
  } else if (this.type === 'fixed' || this.type === 'scholarship') {
    discountAmount = this.value;
    if (discountAmount > originalAmount) {
      discountAmount = originalAmount;
    }
  }
  
  return discountAmount;
};

export default mongoose.model('Discount', discountSchema); 