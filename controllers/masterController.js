import University from '../models/University.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import Nationality from '../models/Nationality.js';
import FeeMaster from '../models/FeeMaster.js';
import PaymentMode from '../models/PaymentMode.js';

// Universities
export const createUniversity = async (req, res) => {
    const data = new University(req.body);
    await data.save();
    res.json(data);
};
export const getUniversities = async (_, res) => res.json(await University.find());

// Courses
export const createCourse = async (req, res) => {
    const data = new Course(req.body);
    await data.save();
    res.json(data);
};
export const getCourses = async (_, res) => res.json(await Course.find().populate('university'));

// Batches
export const createBatch = async (req, res) => {
    const data = new Batch(req.body);
    await data.save();
    res.json(data);
};
export const getBatches = async (_, res) => res.json(await Batch.find());

// Update batch
export const updateBatch = async (req, res) => {
    try {
        const updated = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Batch not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// Delete batch
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
export const createNationality = async (req, res) => {
    const data = new Nationality(req.body);
    await data.save();
    res.json(data);
};
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

// Fee Master
export const createFeeMaster = async (req, res) => {
    const data = new FeeMaster(req.body);
    await data.save();
    res.json(data);
};
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
export const createPaymentMode = async (req, res) => {
    const data = new PaymentMode(req.body);
    await data.save();
    res.json(data);
};
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

// Update course
export const updateCourse = async (req, res) => {
    try {
        const updated = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Course not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// Delete course
export const deleteCourse = async (req, res) => {
    try {
        const deleted = await Course.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Course not found' });
        res.json({ message: 'Course deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Update university
export const updateUniversity = async (req, res) => {
    try {
        const updated = await University.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'University not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete university
export const deleteUniversity = async (req, res) => {
    try {
        const deleted = await University.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'University not found' });
        res.json({ message: 'University deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

