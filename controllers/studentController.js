import Student from '../models/Student.js';
import University from "../models/University.js";
import Course from "../models/Course.js";
import CoursePackage from "../models/CoursePackage.js";
import BatchPreference from "../models/BatchPreference.js";
import CourseMode from "../models/CourseMode.js";
import Nationality from "../models/Nationality.js";

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

// Register multiple students in bulk
// export const registerStudentsBulk = async (req, res) => {
//     try {
//         const students = req.body.students; // Array of valid students

//         if (!students || !Array.isArray(students)) {
//             return res.status(400).json({ error: "Invalid students data" });
//         }

//         const insertedStudents = await Student.insertMany(students, { ordered: false });

//         res.status(201).json({
//             success: true,
//             insertedCount: insertedStudents.length,
//             insertedStudents,
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };


export const getNextRollNumber = async (req, res) => {
    try {
        const count = await Student.countDocuments();
        const nextRoll = count + 1;
        const rollNumber = `STU${String(nextRoll).padStart(3, '0')}`;

        res.json({ rollNumber });
    } catch (error) {
        res.status(500).json({ error: "Failed to get next roll number" });
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



export const registerStudentsBulk = async (req, res) => {
    try {
        const studentsRaw = req.body.students;

        if (!Array.isArray(studentsRaw)) {
            return res.status(400).json({ error: "Invalid student data format." });
        }

        const errors = [];
        const validStudents = [];

        // Pre-fetch mappings to avoid repeated DB queries
        const [universities, courses, packages, batches, modes, nationalities] = await Promise.all([
            University.find(),
            Course.find(),
            CoursePackage.find(),
            BatchPreference.find(),
            CourseMode.find(),
            Nationality.find()
        ]);

        const mapByName = (array) => Object.fromEntries(array.map(item => [item.name, item._id]));

        const universityMap = mapByName(universities);
        const courseMap = mapByName(courses);
        const packageMap = mapByName(packages);
        const batchMap = mapByName(batches);
        const modeMap = mapByName(modes);
        const nationalityMap = mapByName(nationalities);

        for (let i = 0; i < studentsRaw.length; i++) {
            const s = studentsRaw[i];
            const rowNum = i + 2;

            try {
                // Basic validation
                if (!s.name || !s.rollNumber) {
                    throw new Error("Missing required fields: name or rollNumber");
                }

                // Map names to ObjectIds
                const student = {
                    ...s,
                    university: universityMap[s.university],
                    course: courseMap[s.course],
                    coursePackage: packageMap[s.coursePackage],
                    batchPreference: batchMap[s.batchPreference],
                    courseMode: modeMap[s.courseMode],
                    nationality: nationalityMap[s.nationality],
                };

                // Check for any missing ObjectIds
                if (
                    !student.university ||
                    !student.course ||
                    !student.coursePackage ||
                    !student.batchPreference ||
                    !student.courseMode ||
                    !student.nationality
                ) {
                    throw new Error("Invalid reference values for university/course/etc.");
                }

                validStudents.push(student);
            } catch (err) {
                errors.push(`Row ${rowNum}: ${err.message}`);
            }
        }

        const insertedStudents = await Student.insertMany(validStudents, {
            ordered: false,
        });

        res.status(201).json({
            total: studentsRaw.length,
            successful: insertedStudents.length,
            failed: errors.length,
            errors,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
