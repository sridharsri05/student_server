import express from 'express';
import {
    createUniversity, getUniversities,
    createCourse, getCourses,
    createBatch, getBatches,
    createNationality, getNationalities,
    createFeeMaster, getFeeMasters,
    createPaymentMode, getPaymentModes,
    updateCourse,
    deleteCourse,
    updateUniversity,
    deleteUniversity,
    updateBatch,
    deleteBatch,
    updateNationality,
    deleteNationality,
    updateFeeMaster,
    deleteFeeMaster,
    updatePaymentMode,
    deletePaymentMode
} from '../controllers/masterController.js';

import {
    registerStudent, getStudents, getStudentsByFilters,
    updateStudent,
    deleteStudent
} from '../controllers/studentController.js';

import {
    initiatePayment, getPayments,
    addEMIPayment, getEMIPayments,
    generateInvoice, generateReceipt,
    sendPaymentReminder
} from '../controllers/paymentController.js';

import { register, login, refresh, logout } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';

const router = express.Router();

router.get('/test', (_, res) => res.send('API working ✅'));

// ----- Auth -----
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/refresh', refresh);
router.post('/auth/logout', logout);

// ----- Example Dashboards -----
router.get('/admin/dashboard', authenticate, authorize(['admin']), (req, res) => {
    res.json({ message: 'Welcome Admin Dashboard ✅' });
});

router.get('/student/dashboard', authenticate, authorize(['student']), (req, res) => {
    res.json({ message: 'Welcome Student Dashboard ✅' });
});

// ----- Master Data (optionally protect for admin only) -----
router.post('/universities', authenticate, authorize(['admin']), createUniversity);
router.get('/universities', getUniversities);
router.put('/universities/:id', authenticate, authorize(['admin']), updateUniversity);
router.delete('/universities/:id', authenticate, authorize(['admin']), deleteUniversity);


router.post('/courses', authenticate, authorize(['admin']), createCourse);
router.get('/courses', getCourses);
router.put('/courses/:id', authenticate, authorize(['admin']), updateCourse);
router.delete('/courses/:id', authenticate, authorize(['admin']), deleteCourse);

router.post('/batches', authenticate, authorize(['admin']), createBatch);
router.get('/batches', getBatches);
router.put('/batches/:id', authenticate, authorize(['admin']), updateBatch);
router.delete('/batches/:id', authenticate, authorize(['admin']), deleteBatch);


router.post('/nationalities', authenticate, authorize(['admin']), createNationality);
router.get('/nationalities', getNationalities);
router.put('/nationalities/:id', authenticate, authorize(['admin']), updateNationality);
router.delete('/nationalities/:id', authenticate, authorize(['admin']), deleteNationality);


router.post('/fee-masters', authenticate, authorize(['admin']), createFeeMaster);
router.get('/fee-masters', getFeeMasters);
router.put('/fee-masters/:id', authenticate, authorize(['admin']), updateFeeMaster);
router.delete('/fee-masters/:id', authenticate, authorize(['admin']), deleteFeeMaster);


router.post('/payment-modes', authenticate, authorize(['admin']), createPaymentMode);
router.get('/payment-modes', getPaymentModes);
router.put('/payment-modes/:id', authenticate, authorize(['admin']), updatePaymentMode);
router.delete('/payment-modes/:id', authenticate, authorize(['admin']), deletePaymentMode);


// ----- Students -----
router.post('/students/register', registerStudent);
router.get('/students', authenticate, authorize(['admin']), getStudents);
router.get('/students/filter', authenticate, authorize(['admin']), getStudentsByFilters);
router.put('/students/:id', authenticate, authorize(['admin']), updateStudent);
router.delete('/students/:id', authenticate, authorize(['admin']), deleteStudent);

// ----- Payments -----
router.post('/payments/initiate', authenticate, authorize(['admin']), initiatePayment);
router.get('/payments', authenticate, authorize(['admin']), getPayments);

router.post('/payments/emi', authenticate, authorize(['admin']), addEMIPayment);
router.get('/payments/emi', authenticate, authorize(['admin']), getEMIPayments);

// ----- PDF -----
router.get('/pdf/invoice/:studentId/:paymentId', authenticate, authorize(['admin']), generateInvoice);
router.get('/pdf/receipt/:studentId/:paymentId', authenticate, authorize(['admin']), generateReceipt);

// ----- WhatsApp Reminder -----
router.post('/reminder/:studentId', authenticate, authorize(['admin']), sendPaymentReminder);


// ----- Admin Analytics -----
// Get summary of students and payments

router.get('/admin/summary', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const studentCount = await Student.countDocuments();
        const dueStudents = await Student.countDocuments({ dueBalance: { $gt: 0 } });
        const paidStudents = await Student.countDocuments({ dueBalance: 0 });

        // Sum of all paid amounts
        const payments = await Payment.find();
        const totalCollected = payments.reduce((acc, pay) => acc + (pay.depositAmount || 0) + (pay.totalPaid || 0), 0);

        // Sum of all outstanding dues
        const students = await Student.find();
        const totalOutstanding = students.reduce((acc, student) => acc + (student.dueBalance || 0), 0);

        res.json({
            totalStudents: studentCount,
            fullyPaidStudents: paidStudents,
            dueStudents: dueStudents,
            totalCollectedAmount: totalCollected,
            totalOutstandingAmount: totalOutstanding
        });
    } catch (err) {
        console.error('❌ Analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
