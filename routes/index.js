import express from 'express';
import {
    createUniversity, getUniversities,
    createCourse, getCourses,
    createNationality, getNationalities,
    createPaymentMode, getPaymentModes,
    updateCourse,
    deleteCourse,
    updateUniversity,
    deleteUniversity,
    updateNationality,
    deleteNationality,
    updatePaymentMode,
    deletePaymentMode, createCoursePackage, getCoursePackages, updateCoursePackage, deleteCoursePackage,
    createBatchPreference, getBatchPreferences, updateBatchPreference, deleteBatchPreference,
    createCourseMode, getCourseModes, updateCourseMode, deleteCourseMode
} from '../controllers/masterController.js';

import {
    registerStudent, getStudents, getStudentsByFilters,
    updateStudent,
    deleteStudent,
    registerStudentsBulk,
    getNextRollNumber
} from '../controllers/studentController.js';

import {
    generateInvoice, generateReceipt,
    sendPaymentReminder
} from '../controllers/paymentController.js';

import { register, login, refresh, logout } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import { getMenus } from '../controllers/menuController.js';
import * as batchController from '../controllers/batchController.js';
import * as paymentController from '../controllers/paymentController.js';
import * as feeController from '../controllers/feeController.js';
import * as whatsappController from '../controllers/whatsappController.js';
import * as discountController from '../controllers/discountController.js';
import * as stripeController from '../controllers/stripeController.js';

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




router.post('/nationalities', authenticate, authorize(['admin']), createNationality);
router.get('/nationalities', getNationalities);
router.put('/nationalities/:id', authenticate, authorize(['admin']), updateNationality);
router.delete('/nationalities/:id', authenticate, authorize(['admin']), deleteNationality);


router.post('/payment-modes', authenticate, authorize(['admin']), createPaymentMode);
router.get('/payment-modes', getPaymentModes);
router.put('/payment-modes/:id', authenticate, authorize(['admin']), updatePaymentMode);
router.delete('/payment-modes/:id', authenticate, authorize(['admin']), deletePaymentMode);


// ----- Students -----
router.post('/students/register', registerStudent);
router.get("/next-roll-number", getNextRollNumber);
router.post('/students/register-bulk', authenticate, authorize(['admin']), registerStudentsBulk);
router.get('/students', authenticate, authorize(['admin']), getStudents);
router.get('/students/filter', authenticate, authorize(['admin']), getStudentsByFilters);
router.put('/students/:id', authenticate, authorize(['admin']), updateStudent);
router.delete('/students/:id', authenticate, authorize(['admin']), deleteStudent);

// ----- Payments -----
router.post('/payments', paymentController.createPayment);
router.get('/payments', paymentController.getPayments);
router.post('/payments/emi', paymentController.addEMIPayment);
router.get('/payments/emi', paymentController.getEMIPayments);
router.put('/emi-payments/:id', paymentController.updateEMIPayment);
router.delete('/payments/:id', authenticate, authorize(['admin']), paymentController.deletePayment);

// ----- PDF -----
router.get('/pdf/invoice/:studentId/:paymentId', authenticate, authorize(['admin']), generateInvoice);
router.get('/pdf/receipt/:studentId/:paymentId', authenticate, authorize(['admin']), generateReceipt);

// Add additional routes for the frontend to use
router.get('/payments/:studentId/:paymentId/invoice', generateInvoice);
router.get('/payments/:studentId/:paymentId/receipt', generateReceipt);

// ----- WhatsApp Reminder -----
router.post('/reminder/:studentId', authenticate, authorize(['admin']), sendPaymentReminder);

// ----- WhatsApp Messaging -----
router.post('/whatsapp/send', authenticate, authorize(['admin']), whatsappController.sendMessage);
router.post('/whatsapp/broadcast', authenticate, authorize(['admin']), whatsappController.broadcastMessage);

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




// Course Packages
router.post('/course-packages', authenticate, authorize(['admin']), createCoursePackage);
router.get('/course-packages', getCoursePackages);
router.put('/course-packages/:id', authenticate, authorize(['admin']), updateCoursePackage);
router.delete('/course-packages/:id', authenticate, authorize(['admin']), deleteCoursePackage);

// Batch Preferences
router.post('/batch-preferences', authenticate, authorize(['admin']), createBatchPreference);
router.get('/batch-preferences', getBatchPreferences);
router.put('/batch-preferences/:id', authenticate, authorize(['admin']), updateBatchPreference);
router.delete('/batch-preferences/:id', authenticate, authorize(['admin']), deleteBatchPreference);

// Course Modes
router.post('/course-modes', authenticate, authorize(['admin']), createCourseMode);
router.get('/course-modes', getCourseModes);
router.put('/course-modes/:id', authenticate, authorize(['admin']), updateCourseMode);
router.delete('/course-modes/:id', authenticate, authorize(['admin']), deleteCourseMode);


router.get('/menus', getMenus);

// Batch routes
router.get('/batches', authenticate, batchController.getBatches);
router.get('/batches/schedule', authenticate, batchController.getBatchSchedule);
router.post('/batches', authenticate, authorize(['admin']), batchController.createBatch);
router.get('/batches/:id', authenticate, batchController.getBatchById);
router.put('/batches/:id', authenticate, authorize(['admin']), batchController.updateBatch);
router.delete('/batches/:id', authenticate, authorize(['admin']), batchController.deleteBatch);
router.get('/batches/analytics', authenticate, authorize(['admin']), batchController.getBatchAnalytics);
router.get('/batches/:batchId/students', authenticate, batchController.getBatchStudents);
router.post('/batches/:batchId/students/:studentId', authenticate, authorize(['admin']), batchController.addStudentToBatch);
router.delete('/batches/:batchId/students/:studentId', authenticate, authorize(['admin']), batchController.removeStudentFromBatch);

// Payment routes
router.get('/payments/analytics', paymentController.getPaymentAnalytics);
router.get('/payments/report', paymentController.generatePaymentReport);
router.get('/payments/pending', paymentController.getPendingPayments);
router.get('/payments/:id', paymentController.getPaymentById);
router.patch('/payments/:id/status', paymentController.updatePaymentStatus);
router.get('/payments/:studentId/:paymentId/invoice', paymentController.generateInvoice);
router.get('/payments/:studentId/:paymentId/receipt', paymentController.generateReceipt);

// ----- Fee Structures -----
router.get('/fee-structures', authenticate, feeController.getFeeStructures);
router.get('/fee-structures/:id', authenticate, feeController.getFeeStructureById);
router.post('/fee-structures', authenticate, authorize(['admin']), feeController.createFeeStructure);
router.put('/fee-structures/:id', authenticate, authorize(['admin']), feeController.updateFeeStructure);
router.delete('/fee-structures/:id', authenticate, authorize(['admin']), feeController.deleteFeeStructure);

// ----- Discounts -----
router.get('/discounts', authenticate, discountController.getAllDiscounts);
router.get('/discounts/available', authenticate, discountController.getAvailableDiscounts);
router.get('/discounts/:id', authenticate, discountController.getDiscountById);
router.post('/discounts', authenticate, authorize(['admin']), discountController.createDiscount);
router.put('/discounts/:id', authenticate, authorize(['admin']), discountController.updateDiscount);
router.delete('/discounts/:id', authenticate, authorize(['admin']), discountController.deleteDiscount);
router.post('/discounts/validate', authenticate, discountController.validateDiscountCode);
router.post('/discounts/apply', authenticate, discountController.applyDiscount);

// Payment Gateway Routes
router.post('/stripe/create-payment-intent', authenticate, stripeController.createPaymentIntent);
router.post('/stripe/create-emi-payment-intent', authenticate, stripeController.createEMIPaymentIntent);
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeController.handleWebhook);
router.get('/stripe/payment-methods/:studentId', authenticate, stripeController.getPaymentMethods);

export default router;
