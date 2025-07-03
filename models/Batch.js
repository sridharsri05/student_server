import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    startTime: String,
    endTime: String
});

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    instructor: { type: String, required: true },
    instructorImage: { type: String },
    maxCapacity: { type: Number, required: true },
    currentEnrollment: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    mode: {
        type: String,
        enum: ['offline', 'online', 'hybrid'],
        required: true
    },
    venue: String,
    fees: { type: Number, required: true },
    description: String,
    prerequisites: String,
    status: {
        type: String,
        enum: ['active', 'upcoming', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    schedule: {
        monday: scheduleSchema,
        tuesday: scheduleSchema,
        wednesday: scheduleSchema,
        thursday: scheduleSchema,
        friday: scheduleSchema,
        saturday: scheduleSchema,
        sunday: scheduleSchema
    },
    createdAt: { type: Date, default: Date.now }
});

// Auto-update status based on dates
batchSchema.pre('save', function (next) {
    const now = new Date();
    if (now < this.startDate) {
        this.status = 'upcoming';
    } else if (now > this.endDate) {
        this.status = 'completed';
    } else {
        this.status = 'active';
    }
    next();
});

export default mongoose.model('Batch', batchSchema);
