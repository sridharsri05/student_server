import Batch from '../models/Batch.js';
import Student from '../models/Student.js';

// Get all batches with filters
export const getBatches = async (req, res) => {
    try {
        const { status, mode, search } = req.query;
        let query = {};

        if (status) query.status = status;
        if (mode) query.mode = mode;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { instructor: { $regex: search, $options: 'i' } }
            ];
        }

        // Ensure course is always populated
        const batches = await Batch.find(query).populate('course').populate('coursePackage');

        // Get analytics data (optional, keep if used by frontend)
        const totalBatches = await Batch.countDocuments();
        const activeBatches = await Batch.countDocuments({ status: 'active' });
        const totalStudents = await Student.countDocuments();
        const classesToday = await Batch.countDocuments({
            status: 'active',
            $or: [
                { 'schedule.monday.enabled': true },
                { 'schedule.tuesday.enabled': true },
                { 'schedule.wednesday.enabled': true },
                { 'schedule.thursday.enabled': true },
                { 'schedule.friday.enabled': true },
                { 'schedule.saturday.enabled': true },
                { 'schedule.sunday.enabled': true }
            ]
        });

        res.json({
            batches,
            analytics: {
                totalBatches,
                activeBatches,
                totalStudents,
                classesToday,
                averageCapacity: batches.reduce((acc, batch) =>
                    acc + (batch.currentEnrollment / batch.maxCapacity) * 100, 0) / (batches.length || 1)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get batch by ID
export const getBatchById = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id).populate('course').populate('coursePackage');
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        res.json(batch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create new batch
export const createBatch = async (req, res) => {
    try {
        const batch = new Batch(req.body);
        const savedBatch = await batch.save();
        res.status(201).json(savedBatch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update batch
export const updateBatch = async (req, res) => {
    try {
        const batch = await Batch.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        res.json(batch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete batch
export const deleteBatch = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        // Check if batch has enrolled students
        const enrolledStudents = await Student.countDocuments({ batch: req.params.id });
        if (enrolledStudents > 0) {
            return res.status(400).json({
                message: 'Cannot delete batch with enrolled students. Please transfer or remove students first.'
            });
        }

        await batch.remove();
        res.json({ message: 'Batch deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get batch schedule
export const getBatchSchedule = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        const query = {};
        if (status) query.status = status;

        if (startDate && endDate) {
            query.startDate = { $lte: new Date(endDate) };
            query.endDate = { $gte: new Date(startDate) };
        }

        const batches = await Batch.find(query)
            .select('name course instructor schedule venue currentEnrollment status')
            .populate('course', 'name');

        const scheduleData = batches.map(batch => {
            const scheduleItems = [];
            Object.entries(batch.schedule).forEach(([day, schedule]) => {
                if (schedule.enabled) {
                    scheduleItems.push({
                        id: `${batch._id}-${day}`,
                        batchName: batch.name,
                        course: batch.course.name,
                        instructor: batch.instructor,
                        time: schedule.startTime,
                        duration: `${schedule.startTime} - ${schedule.endTime}`,
                        venue: batch.venue,
                        students: batch.currentEnrollment,
                        status: batch.status,
                        day
                    });
                }
            });
            return scheduleItems;
        }).flat();

        res.json(scheduleData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update batch enrollment
export const updateBatchEnrollment = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { action } = req.body; // 'increment' or 'decrement'

        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (action === 'increment') {
            if (batch.currentEnrollment >= batch.maxCapacity) {
                return res.status(400).json({ message: 'Batch is already at maximum capacity' });
            }
            batch.currentEnrollment += 1;
        } else if (action === 'decrement') {
            if (batch.currentEnrollment <= 0) {
                return res.status(400).json({ message: 'Batch enrollment cannot be negative' });
            }
            batch.currentEnrollment -= 1;
        }

        await batch.save();
        res.json(batch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get batch analytics
export const getBatchAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.startDate = { $gte: new Date(startDate) };
            query.endDate = { $lte: new Date(endDate) };
        }

        const [
            totalBatches,
            activeBatches,
            upcomingBatches,
            completedBatches,
            totalStudents,
            batchesWithCapacity
        ] = await Promise.all([
            Batch.countDocuments(),
            Batch.countDocuments({ status: 'active' }),
            Batch.countDocuments({ status: 'upcoming' }),
            Batch.countDocuments({ status: 'completed' }),
            Student.countDocuments(),
            Batch.find({ status: 'active' }).select('currentEnrollment maxCapacity')
        ]);

        // Calculate average capacity
        const avgCapacity = batchesWithCapacity.reduce((acc, batch) => {
            return acc + (batch.currentEnrollment / batch.maxCapacity) * 100;
        }, 0) / (batchesWithCapacity.length || 1);

        // Get mode distribution
        const modeDistribution = await Batch.aggregate([
            { $group: { _id: '$mode', count: { $sum: 1 } } }
        ]);

        res.json({
            totalBatches,
            activeBatches,
            upcomingBatches,
            completedBatches,
            totalStudents,
            averageCapacity: Math.round(avgCapacity),
            modeDistribution,
            classesToday: await getClassesForToday()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get batch students
export const getBatchStudents = async (req, res) => {
    try {
        const { batchId } = req.params;
        const students = await Student.find({ currentBatch: batchId })
            .select('name email phone status feeStatus photo rollNumber')
            .populate('course', 'name');

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add student to batch
export const addStudentToBatch = async (req, res) => {
    try {
        const { batchId, studentId } = req.params;

        const [batch, student] = await Promise.all([
            Batch.findById(batchId),
            Student.findById(studentId)
        ]);

        if (!batch || !student) {
            return res.status(404).json({ message: 'Batch or Student not found' });
        }

        if (batch.currentEnrollment >= batch.maxCapacity) {
            return res.status(400).json({ message: 'Batch is at maximum capacity' });
        }

        // Update student's batch information
        student.currentBatch = batchId;
        student.batchHistory.push({
            batch: batchId,
            joinDate: new Date(),
            status: 'active'
        });

        // Update batch enrollment
        batch.currentEnrollment += 1;

        await Promise.all([student.save(), batch.save()]);

        res.json({ message: 'Student added to batch successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Remove student from batch
export const removeStudentFromBatch = async (req, res) => {
    try {
        const { batchId, studentId } = req.params;

        const [batch, student] = await Promise.all([
            Batch.findById(batchId),
            Student.findById(studentId)
        ]);

        if (!batch || !student) {
            return res.status(404).json({ message: 'Batch or Student not found' });
        }

        // Update student's batch history
        const batchHistoryEntry = student.batchHistory.find(
            history => history.batch.toString() === batchId && history.status === 'active'
        );

        if (batchHistoryEntry) {
            batchHistoryEntry.status = 'dropped';
            batchHistoryEntry.endDate = new Date();
        }

        student.currentBatch = null;
        batch.currentEnrollment = Math.max(0, batch.currentEnrollment - 1);

        await Promise.all([student.save(), batch.save()]);

        res.json({ message: 'Student removed from batch successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to get classes for today
const getClassesForToday = async () => {
    const today = new Date();
    const dayOfWeek = today.toLocaleLowerCase();

    return await Batch.countDocuments({
        status: 'active',
        [`schedule.${dayOfWeek}.enabled`]: true
    });
}; 