import mongoose from 'mongoose';

const coursePackageSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

export default mongoose.model('CoursePackage', coursePackageSchema);
