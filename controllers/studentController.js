import Student from '../models/Student.js';

// Register a new student
export const registerStudent = async (req, res) => {
    try {
        const student = new Student(req.body);
        await student.save();
        res.status(201).json(student);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};


// Get all students
export const getStudents = async (_, res) => {
    try {
        const students = await Student.find()
            .populate('university course coursePackage batch batchPreference courseMode nationality');
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// Get students by filters
export const getStudentsByFilters = async (req, res) => {
    const { course, batch, paid, due } = req.query;

    let query = {};

    if (course) query.course = course;
    if (batch) query.batch = batch;
    if (paid === 'true') query.dueBalance = 0;
    if (due === 'true') query.dueBalance = { $gt: 0 };

    try {
        const students = await Student.find(query)
            .populate('university course batch nationality');
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};




// Update student
export const updateStudent = async (req, res) => {
    try {
        const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ error: 'Student not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete student
export const deleteStudent = async (req, res) => {
    try {
        const deleted = await Student.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Student not found' });
        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

