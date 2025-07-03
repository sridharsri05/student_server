import mongoose from 'mongoose';

const coursePackageSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    fee: { type: Number, required: true }
});

export default mongoose.model('CoursePackage', coursePackageSchema);
