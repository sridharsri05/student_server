import mongoose from 'mongoose';

const batchPreferenceSchema = new mongoose.Schema({
    timeSlot: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'weekend'],
        required: true
    },
    mode: {
        type: String,
        enum: ['offline', 'online', 'hybrid'],
        required: true
    },
    location: String,
    daysPreference: [{
        day: {
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        },
        preferred: { type: Boolean, default: false }
    }],
    startDatePreference: Date,
    additionalNotes: String,
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('BatchPreference', batchPreferenceSchema);
