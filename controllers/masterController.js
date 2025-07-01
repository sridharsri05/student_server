// import University from '../models/University.js';
// import Course from '../models/Course.js';
// import Batch from '../models/Batch.js';
// import Nationality from '../models/Nationality.js';
// import FeeMaster from '../models/FeeMaster.js';
// import PaymentMode from '../models/PaymentMode.js';
// import CourseMode from '../models/CourseMode.js';
// import CoursePackage from '../models/CoursePackage.js';
// import BatchPreference from '../models/BatchPreference.js';


// // Universities
// export const createUniversity = async (req, res) => {
//     const data = new University(req.body);
//     await data.save();
//     res.json(data);
// };
// export const getUniversities = async (_, res) => res.json(await University.find());

// // Courses
// export const createCourse = async (req, res) => {
//     const data = new Course(req.body);
//     await data.save();
//     res.json(data);
// };
// export const getCourses = async (_, res) => res.json(await Course.find().populate('university'));

// // Batches
// export const createBatch = async (req, res) => {
//     const data = new Batch(req.body);
//     await data.save();
//     res.json(data);
// };
// export const getBatches = async (_, res) => res.json(await Batch.find());

// // Update batch
// export const updateBatch = async (req, res) => {
//     try {
//         const updated = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!updated) return res.status(404).json({ error: 'Batch not found' });
//         res.json(updated);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };
// // Delete batch
// export const deleteBatch = async (req, res) => {
//     try {
//         const deleted = await Batch.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ error: 'Batch not found' });
//         res.json({ message: 'Batch deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };



// // Nationalities
// export const createNationality = async (req, res) => {
//     const data = new Nationality(req.body);
//     await data.save();
//     res.json(data);
// };
// export const getNationalities = async (_, res) => res.json(await Nationality.find());

// export const updateNationality = async (req, res) => {
//     try {
//         const updated = await Nationality.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!updated) return res.status(404).json({ error: 'Nationality not found' });
//         res.json(updated);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// export const deleteNationality = async (req, res) => {
//     try {
//         const deleted = await Nationality.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ error: 'Nationality not found' });
//         res.json({ message: 'Nationality deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // Fee Master
// export const createFeeMaster = async (req, res) => {
//     const data = new FeeMaster(req.body);
//     await data.save();
//     res.json(data);
// };
// export const getFeeMasters = async (_, res) => res.json(await FeeMaster.find().populate('course'));

// export const updateFeeMaster = async (req, res) => {
//     try {
//         const updated = await FeeMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!updated) return res.status(404).json({ error: 'Fee master not found' });
//         res.json(updated);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// export const deleteFeeMaster = async (req, res) => {
//     try {
//         const deleted = await FeeMaster.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ error: 'Fee master not found' });
//         res.json({ message: 'Fee master deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // Payment Modes
// export const createPaymentMode = async (req, res) => {
//     const data = new PaymentMode(req.body);
//     await data.save();
//     res.json(data);
// };
// export const getPaymentModes = async (_, res) => res.json(await PaymentMode.find());

// export const updatePaymentMode = async (req, res) => {
//     try {
//         const updated = await PaymentMode.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!updated) return res.status(404).json({ error: 'Payment mode not found' });
//         res.json(updated);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// export const deletePaymentMode = async (req, res) => {
//     try {
//         const deleted = await PaymentMode.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ error: 'Payment mode not found' });
//         res.json({ message: 'Payment mode deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // Update course
// export const updateCourse = async (req, res) => {
//     try {
//         const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!updated) return res.status(404).json({ error: 'Course not found' });
//         res.json(updated);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };



// // Delete course
// export const deleteCourse = async (req, res) => {
//     try {
//         const deleted = await Course.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ error: 'Course not found' });
//         res.json({ message: 'Course deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };


// // Update university
// export const updateUniversity = async (req, res) => {
//     try {
//         const updated = await University.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!updated) return res.status(404).json({ error: 'University not found' });
//         res.json(updated);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // Delete university
// export const deleteUniversity = async (req, res) => {
//     try {
//         const deleted = await University.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ error: 'University not found' });
//         res.json({ message: 'University deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };


// // Course Packages
// export const createCoursePackage = async (req, res) => {
//     const data = new CoursePackage(req.body);
//     await data.save();
//     res.json(data);
// };

// export const getCoursePackages = async (_, res) => res.json(await CoursePackage.find());

// export const updateCoursePackage = async (req, res) => {
//     try {
//         const updated = await CoursePackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!updated) return res.status(404).json({ error: 'Course package not found' });
//         res.json(updated);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// export const deleteCoursePackage = async (req, res) => {
//     try {
//         const deleted = await CoursePackage.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ error: 'Course package not found' });
//         res.json({ message: 'Course package deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // Batch Preferences
// export const createBatchPreference = async (req, res) => {
//     const data = new BatchPreference(req.body);
//     await data.save();
//     res.json(data);
// };

// export const getBatchPreferences = async (_, res) => res.json(await BatchPreference.find());

// export const updateBatchPreference = async (req, res) => {
//     try {
//         const updated = await BatchPreference.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!updated) return res.status(404).json({ error: 'Batch preference not found' });
//         res.json(updated);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// export const deleteBatchPreference = async (req, res) => {
//     try {
//         const deleted = await BatchPreference.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ error: 'Batch preference not found' });
//         res.json({ message: 'Batch preference deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// // Course Modes
// export const createCourseMode = async (req, res) => {
//     const data = new CourseMode(req.body);
//     await data.save();
//     res.json(data);
// };

// export const getCourseModes = async (_, res) => res.json(await CourseMode.find());

// export const updateCourseMode = async (req, res) => {
//     try {
//         const updated = await CourseMode.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!updated) return res.status(404).json({ error: 'Course mode not found' });
//         res.json(updated);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// export const deleteCourseMode = async (req, res) => {
//     try {
//         const deleted = await CourseMode.findByIdAndDelete(req.params.id);
//         if (!deleted) return res.status(404).json({ error: 'Course mode not found' });
//         res.json({ message: 'Course mode deleted successfully' });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };





import University from '../models/University.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import Nationality from '../models/Nationality.js';
import FeeMaster from '../models/FeeMaster.js';
import PaymentMode from '../models/PaymentMode.js';
import CourseMode from '../models/CourseMode.js';
import CoursePackage from '../models/CoursePackage.js';
import BatchPreference from '../models/BatchPreference.js';

// Helper function for single or bulk create
const handleCreate = async (Model, req, res, name) => {
    try {
        if (Array.isArray(req.body)) {
            const data = await Model.insertMany(req.body);
            res.status(201).json({ message: `Inserted multiple ${name} successfully`, data });
        } else {
            const data = new Model(req.body);
            await data.save();
            res.status(201).json({ message: `Inserted single ${name} successfully`, data });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Universities
export const createUniversity = (req, res) => handleCreate(University, req, res, 'university');
export const getUniversities = async (_, res) => res.json(await University.find());
export const updateUniversity = async (req, res) => {
    try {
        const updated = await University.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'University not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deleteUniversity = async (req, res) => {
    try {
        const deleted = await University.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'University not found' });
        res.json({ message: 'University deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Courses
export const createCourse = (req, res) => handleCreate(Course, req, res, 'course');
export const getCourses = async (_, res) => res.json(await Course.find().populate('university'));
export const updateCourse = async (req, res) => {
    try {
        const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Course not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deleteCourse = async (req, res) => {
    try {
        const deleted = await Course.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Course not found' });
        res.json({ message: 'Course deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Batches
export const createBatch = (req, res) => handleCreate(Batch, req, res, 'batch');
export const getBatches = async (_, res) => res.json(await Batch.find());
export const updateBatch = async (req, res) => {
    try {
        const updated = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Batch not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deleteBatch = async (req, res) => {
    try {
        const deleted = await Batch.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Batch not found' });
        res.json({ message: 'Batch deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Nationalities
export const createNationality = (req, res) => handleCreate(Nationality, req, res, 'nationality');
export const getNationalities = async (_, res) => res.json(await Nationality.find());
export const updateNationality = async (req, res) => {
    try {
        const updated = await Nationality.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Nationality not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deleteNationality = async (req, res) => {
    try {
        const deleted = await Nationality.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Nationality not found' });
        res.json({ message: 'Nationality deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Fee Masters
export const createFeeMaster = (req, res) => handleCreate(FeeMaster, req, res, 'fee master');
export const getFeeMasters = async (_, res) => res.json(await FeeMaster.find().populate('course'));
export const updateFeeMaster = async (req, res) => {
    try {
        const updated = await FeeMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Fee master not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deleteFeeMaster = async (req, res) => {
    try {
        const deleted = await FeeMaster.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Fee master not found' });
        res.json({ message: 'Fee master deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Payment Modes
export const createPaymentMode = (req, res) => handleCreate(PaymentMode, req, res, 'payment mode');
export const getPaymentModes = async (_, res) => res.json(await PaymentMode.find());
export const updatePaymentMode = async (req, res) => {
    try {
        const updated = await PaymentMode.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Payment mode not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deletePaymentMode = async (req, res) => {
    try {
        const deleted = await PaymentMode.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Payment mode not found' });
        res.json({ message: 'Payment mode deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Course Packages
export const createCoursePackage = (req, res) => handleCreate(CoursePackage, req, res, 'course package');
export const getCoursePackages = async (_, res) => res.json(await CoursePackage.find());
export const updateCoursePackage = async (req, res) => {
    try {
        const updated = await CoursePackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Course package not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deleteCoursePackage = async (req, res) => {
    try {
        const deleted = await CoursePackage.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Course package not found' });
        res.json({ message: 'Course package deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Batch Preferences
export const createBatchPreference = (req, res) => handleCreate(BatchPreference, req, res, 'batch preference');
export const getBatchPreferences = async (_, res) => res.json(await BatchPreference.find());
export const updateBatchPreference = async (req, res) => {
    try {
        const updated = await BatchPreference.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Batch preference not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deleteBatchPreference = async (req, res) => {
    try {
        const deleted = await BatchPreference.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Batch preference not found' });
        res.json({ message: 'Batch preference deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Course Modes
export const createCourseMode = (req, res) => handleCreate(CourseMode, req, res, 'course mode');
export const getCourseModes = async (_, res) => res.json(await CourseMode.find());
export const updateCourseMode = async (req, res) => {
    try {
        const updated = await CourseMode.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Course mode not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
export const deleteCourseMode = async (req, res) => {
    try {
        const deleted = await CourseMode.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Course mode not found' });
        res.json({ message: 'Course mode deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
