import Payment from '../models/Payment.js';
import EMIPayment from '../models/EMIPayment.js';
import Student from '../models/Student.js';
import { generateInvoicePDF, generateReceiptPDF, generatePaymentReportPDF } from '../services/pdfService.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths } from 'date-fns';

export const initiatePayment = async (req, res) => {
    try {
        const data = new Payment(req.body);
        await data.save();
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getPayments = async (req, res) => {
    try {
        const {
            status,
            paymentMethod,
            dateFrom,
            dateTo,
            amountMin,
            amountMax,
            search
        } = req.query;

        let query = {};

        if (status) query.status = status;
        if (paymentMethod) query.paymentMethod = paymentMethod;
        if (dateFrom && dateTo) {
            query.createdAt = {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo)
            };
        }
        if (amountMin || amountMax) {
            query.totalAmount = {};
            if (amountMin) query.totalAmount.$gte = parseFloat(amountMin);
            if (amountMax) query.totalAmount.$lte = parseFloat(amountMax);
        }
        if (search) {
            const students = await Student.find({
                name: { $regex: search, $options: 'i' }
            }).select('_id');
            const studentIds = students.map(s => s._id);

            query.$or = [
                { student: { $in: studentIds } },
                { invoiceNumber: { $regex: search, $options: 'i' } },
                { receiptNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const payments = await Payment.find(query)
            .populate('student', 'name phone email')
            .populate('feeStructure', 'name')
            .sort({ createdAt: -1 });

        res.json({ payments });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addEMIPayment = async (req, res) => {
    try {
        const data = new EMIPayment(req.body);
        await data.save();
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getEMIPayments = async (_, res) => {
    const emiPayments = await EMIPayment.find().populate('student');
    res.json(emiPayments);
};

export const updateEMIPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validate status if provided
        if (updates.status && !['pending', 'paid', 'overdue', 'cancelled', 'processing'].includes(updates.status)) {
            return res.status(400).json({
                error: `Payment validation failed: status: \`${updates.status}\` is not a valid enum value for path \`status\`.`
            });
        }

        const emiPayment = await EMIPayment.findById(id);

        if (!emiPayment) {
            return res.status(404).json({ error: 'EMI Payment not found' });
        }

        // Update the EMI payment
        Object.keys(updates).forEach(key => {
            emiPayment[key] = updates[key];
        });

        await emiPayment.save();

        // If payment is marked as paid, check if all EMIs are paid
        if (updates.status === 'paid') {
            const mainPayment = await Payment.findById(emiPayment.payment);
            if (mainPayment) {
                const pendingEMIs = await EMIPayment.countDocuments({
                    payment: mainPayment._id,
                    status: { $in: ['pending', 'overdue'] }
                });

                if (pendingEMIs === 0) {
                    mainPayment.status = 'completed';
                    await mainPayment.save();

                    // Update student status
                    await Student.findByIdAndUpdate(mainPayment.student, {
                        status: 'active',
                        feeStatus: 'complete'
                    });
                }
            }
        }

        res.json(emiPayment);
    } catch (error) {
        console.error('Error updating EMI payment:', error);
        res.status(500).json({ error: error.message });
    }
};

export const generateInvoice = async (req, res) => {
    try {
        const { studentId, paymentId } = req.params;
        console.log(`Generating invoice for student: ${studentId}, payment: ${paymentId}`);

        const student = await Student.findById(studentId);
        if (!student) {
            console.error(`Student not found: ${studentId}`);
            return res.status(404).json({ error: 'Student not found' });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            console.error(`Payment not found: ${paymentId}`);
            return res.status(404).json({ error: 'Payment not found' });
        }

        console.log('Found student and payment, generating PDF...');
        const pdfBuffer = await generateInvoicePDF(student, payment);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment.invoiceNumber || paymentId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ error: 'Failed to generate invoice', details: error.message });
    }
};

export const generateReceipt = async (req, res) => {
    try {
        const { studentId, paymentId } = req.params;
        console.log(`Generating receipt for student: ${studentId}, payment: ${paymentId}`);

        const student = await Student.findById(studentId);
        if (!student) {
            console.error(`Student not found: ${studentId}`);
            return res.status(404).json({ error: 'Student not found' });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            console.error(`Payment not found: ${paymentId}`);
            return res.status(404).json({ error: 'Payment not found' });
        }

        console.log('Found student and payment, generating receipt PDF...');
        const pdfBuffer = await generateReceiptPDF(student, payment);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.receiptNumber || paymentId}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating receipt:', error);
        res.status(500).json({ error: 'Failed to generate receipt', details: error.message });
    }
};

export const sendPaymentReminder = async (req, res) => {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);

    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }

    const message = `Dear ${student.name}, your EMI payment is due. Please pay before 7th to avoid late fees.`;
    await sendWhatsAppMessage(student.phone, message);

    res.json({ message: 'Reminder sent via WhatsApp' });
};

export const getPaymentAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get basic stats
        const [totalPayments, successfulPayments, pendingPayments, failedPayments] = await Promise.all([
            Payment.countDocuments(query),
            Payment.countDocuments({ ...query, status: 'completed' }),
            Payment.countDocuments({ ...query, status: 'pending' }),
            Payment.countDocuments({ ...query, status: 'failed' })
        ]);

        // Calculate total revenue and pending amount
        const [revenueData, pendingData] = await Promise.all([
            Payment.aggregate([
                { $match: { ...query, status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Payment.aggregate([
                { $match: { ...query, status: 'pending' } },
                { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
            ])
        ]);

        // Get monthly revenue trend (last 6 months)
        const monthlyRevenue = await getMonthlyRevenue();

        // Get payment method distribution
        const paymentMethodDistribution = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$paymentMethod', count: { $sum: 1 } } }
        ]);

        res.json({
            totalRevenue: revenueData[0]?.total || 0,
            pendingPayments: pendingData[0]?.total || 0,
            successfulPayments,
            failedPayments,
            totalPayments,
            monthlyRevenue,
            paymentMethodDistribution,
            successRate: (successfulPayments / totalPayments) * 100 || 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createPayment = async (req, res) => {
    try {
        const payment = new Payment(req.body);
        const savedPayment = await payment.save();

        // Update student status if needed
        if (payment.status === 'completed') {
            await Student.findByIdAndUpdate(payment.student, {
                status: 'active-paid',
                feeStatus: 'paid'
            });
        }

        res.status(201).json(savedPayment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, transactionId } = req.body;

        // Validate status
        const validStatuses = ['completed', 'pending', 'failed', 'refunded', 'processing'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Update status and transaction ID if provided
        if (status) {
            payment.status = status;
        }
        if (transactionId) {
            payment.transactionId = transactionId;
        }

        // Set paid date if status is completed
        if (status === 'completed') {
            payment.paidDate = new Date();

            // Update student status
            await Student.findByIdAndUpdate(payment.student, {
                status: 'active',
                feeStatus: 'complete'
            });

            // Generate receipt number if not already generated
            if (!payment.receiptNumber) {
                const count = await Payment.countDocuments();
                payment.receiptNumber = `RCP${String(count + 1).padStart(6, '0')}`;
            }
        }

        await payment.save();

        res.json({
            message: 'Payment status updated successfully',
            payment
        });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({
            error: 'Failed to update payment status',
            details: error.message
        });
    }
};

export const getPendingPayments = async (req, res) => {
    try {
        const pendingPayments = await Payment.find({ status: 'pending' })
            .populate('student', 'name phone email')
            .sort({ dueDate: 1 });

        res.json({ pendingPayments });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('student', 'name phone email');

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get EMI analytics
export const getEMIAnalytics = async (req, res) => {
    try {
        const [
            totalEMIs,
            paidEMIs,
            overdueEMIs,
            upcomingEMIs
        ] = await Promise.all([
            EMIPayment.countDocuments(),
            EMIPayment.countDocuments({ status: 'paid' }),
            EMIPayment.countDocuments({ status: 'overdue' }),
            EMIPayment.countDocuments({
                status: 'pending',
                dueDate: { $gt: new Date() }
            })
        ]);

        // Calculate collection efficiency
        const collectionEfficiency = (paidEMIs / (paidEMIs + overdueEMIs)) * 100 || 0;

        // Get monthly EMI collection trend
        const monthlyCollection = await EMIPayment.aggregate([
            { $match: { status: 'paid' } },
            {
                $group: {
                    _id: {
                        year: { $year: '$paidDate' },
                        month: { $month: '$paidDate' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
        ]);

        res.json({
            totalEMIs,
            paidEMIs,
            overdueEMIs,
            upcomingEMIs,
            collectionEfficiency,
            monthlyCollection
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to get monthly revenue
const getMonthlyRevenue = async () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const startDate = startOfMonth(subMonths(new Date(), i));
        const endDate = endOfMonth(subMonths(new Date(), i));

        const monthData = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$totalAmount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        months.push({
            month: startDate.toLocaleString('default', { month: 'short' }),
            revenue: monthData[0]?.revenue || 0,
            payments: monthData[0]?.count || 0
        });
    }
    return months;
};

export const generatePaymentReport = async (req, res) => {
    try {
        const { startDate, endDate, filters } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get payments with student details
        const payments = await Payment.find(query)
            .populate('student', 'name email phone')
            .sort({ createdAt: -1 });

        // Get analytics data
        const analytics = await getAnalyticsSummary(query);

        // Generate PDF report
        const pdfBuffer = await generatePaymentReportPDF(payments, analytics, {
            dateFrom: startDate,
            dateTo: endDate,
            ...filters
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=payment-report.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating payment report:', error);
        res.status(500).json({ error: 'Failed to generate payment report' });
    }
};

// Helper function to get analytics summary
const getAnalyticsSummary = async (query = {}) => {
    const [revenueData, pendingData, counts] = await Promise.all([
        Payment.aggregate([
            { $match: { ...query, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        Payment.aggregate([
            { $match: { ...query, status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
        ]),
        Payment.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const statusCounts = counts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
    }, {});

    return {
        totalRevenue: revenueData[0]?.total || 0,
        pendingPayments: pendingData[0]?.total || 0,
        successfulPayments: statusCounts['completed'] || 0,
        failedPayments: statusCounts['failed'] || 0
    };
};

/**
 * Delete a payment by ID
 * @route DELETE /payments/:id
 * @access Private (Admin only)
 */
export const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;

        const payment = await Payment.findById(id);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Check if payment has related EMI payments
        const relatedEMIs = await EMIPayment.find({ payment: id });

        // Delete related EMI payments if any
        if (relatedEMIs.length > 0) {
            await EMIPayment.deleteMany({ payment: id });
        }

        // Delete the payment
        await Payment.findByIdAndDelete(id);

        // If payment was completed, update student status
        if (payment.status === 'completed' && payment.student) {
            // Check if student has any other completed payments
            const otherCompletedPayments = await Payment.countDocuments({
                student: payment.student,
                status: 'completed',
                _id: { $ne: id }
            });

            if (otherCompletedPayments === 0) {
                // No other completed payments, update student status
                await Student.findByIdAndUpdate(payment.student, {
                    status: 'active',
                    feeStatus: 'pending'
                });
            }
        }

        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ message: error.message });
    }
};
