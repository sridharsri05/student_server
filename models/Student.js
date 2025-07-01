// import mongoose from 'mongoose';

// const studentSchema = new mongoose.Schema({
//     name: String,
//     matrixNumber: { type: String, unique: true },
//     email: String,
//     phone: String,
//     address: String,
//     university: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
//     course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
//     batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
//     nationality: { type: mongoose.Schema.Types.ObjectId, ref: 'Nationality' },
//     createdAt: { type: Date, default: Date.now }
// });

// export default mongoose.model('Student', studentSchema);


import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    // matrixNumber: { type: String, unique: true, required: true },
    email: { type: String },
    phone: { type: String },
    dob: { type: String, required: true }, // Format: dd-mm-yyyy
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true }, // Frontend only (static)
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    rollNumber: { type: String, required: true, unique: true },
    parentGuardian: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String },
        relationship: { type: String, enum: ['Father', 'Mother', 'Guardian', 'Brother', 'Sister', 'Relative'], required: true }, // Frontend only (static)
    },
    status: {
        type: String,
        enum: ['active-paid', 'active-pending', 'pending', 'overdue'],
        default: 'pending'
    },

    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    coursePackage: { type: mongoose.Schema.Types.ObjectId, ref: 'CoursePackage', required: true },
    semester: { type: String, required: true },

    // batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    batchPreference: { type: mongoose.Schema.Types.ObjectId, ref: 'BatchPreference', required: true },
    courseMode: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseMode', required: true },

    nationality: { type: mongoose.Schema.Types.ObjectId, ref: 'Nationality', required: true },

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Student', studentSchema);

