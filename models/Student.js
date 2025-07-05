

import mongoose from 'mongoose';

const parentGuardianSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    relationship: { type: String, required: true }
});

const studentSchema = new mongoose.Schema({
    // Basic Information
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    dob: { type: String, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    rollNumber: { type: String, unique: true },
    photo: { type: String, default: null },

    // Guardian Information
    parentGuardian: parentGuardianSchema,

    // Academic Information
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    coursePackage: { type: mongoose.Schema.Types.ObjectId, ref: 'CoursePackage', required: true },
    semester: String,
    nationality: { type: mongoose.Schema.Types.ObjectId, ref: 'Nationality', required: true },
    courseMode: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseMode', required: true },

    // Batch Information
    currentBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    batchPreference: { type: mongoose.Schema.Types.ObjectId, ref: 'BatchPreference' },
    batchHistory: [{
        batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
        joinDate: Date,
        endDate: Date,
        status: { type: String, enum: ['active', 'completed', 'dropped'] }
    }],

    // Fee and Payment Information
    feeStatus: {
        type: String,
        enum: ['pending', 'partial', 'complete', 'overdue'],
        default: 'pending'
    },
    totalFees: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number },
    nextPaymentDue: Date,

    // Status Information
    status: {
        type: String,
        enum: ['active', 'inactive', 'pending', 'graduated', 'dropped'],
        default: 'pending'
    },
    joinDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // Add Stripe customer ID for payment integration
    stripeCustomerId: { type: String },
    paymentMethods: [{ 
        provider: String, 
        type: String, 
        lastFour: String, 
        expiryDate: String, 
        isDefault: Boolean 
    }],
});

// Pre-save middleware to calculate remaining amount
studentSchema.pre('save', function (next) {
    if (this.totalFees && this.paidAmount) {
        this.remainingAmount = this.totalFees - this.paidAmount;
    }
    next();
});

// Pre-save middleware to update fee status
studentSchema.pre('save', function (next) {
    if (this.remainingAmount === 0) {
        this.feeStatus = 'complete';
    } else if (this.paidAmount > 0) {
        this.feeStatus = 'partial';
    }
    next();
});

// Auto-generate roll number
studentSchema.pre('save', async function (next) {
    if (!this.isNew) return next();

    const count = await mongoose.model('Student').countDocuments();
    const nextRoll = count + 1;
    this.rollNumber = `STU${String(nextRoll).padStart(3, '0')}`;
    next();
});

// Virtual for getting age
studentSchema.virtual('age').get(function () {
    if (!this.dob) return null;
    const [day, month, year] = this.dob.split('-');
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

const Student = mongoose.model('Student', studentSchema);
export default Student;


