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

export const getEMIPayments = async (req, res) => {
    try {
        const { student, payment, status } = req.query;
        const query = {};

        // Apply filters if provided
        if (student) {
            query.student = student;
        }

        if (payment) {
            query.payment = payment;
        }

        if (status) {
            query.status = status;
        }

        // Fetch EMI payments with student details
        let emiPayments = await EMIPayment.find(query)
            .populate('student', 'name email phone')
            .populate('payment')
            .sort({ dueDate: 1 });

        // Add default student info for entries with null student
        emiPayments = emiPayments.map(payment => {
            // If the payment is returned as a plain object (not a mongoose document)
            const paymentObj = payment.toObject ? payment.toObject() : payment;

            // If student is null, add a placeholder
            if (!paymentObj.student) {
                paymentObj.student = {
                    _id: 'unknown',
                    name: 'Unknown Student',
                    email: '',
                    phone: ''
                };
            }

            return paymentObj;
        });

        res.json(emiPayments);
    } catch (error) {
        console.error('Error fetching EMI payments:', error);
        res.status(500).json({ error: error.message });
    }
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
        if (updates.status === 'paid' && emiPayment.payment) {
            const mainPayment = await Payment.findById(emiPayment.payment);
            if (mainPayment) {
                const pendingEMIs = await EMIPayment.countDocuments({
                    payment: mainPayment._id,
                    status: { $in: ['pending', 'overdue'] }
                });

                if (pendingEMIs === 0) {
                    mainPayment.status = 'completed';
                    await mainPayment.save();

                    // Update student status if student reference exists
                    if (mainPayment.student) {
                        await Student.findByIdAndUpdate(mainPayment.student, {
                            status: 'active',
                            feeStatus: 'complete'
                        });
                    }
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

        // Calculate monthly revenue for the last 6 months
        const monthlyRevenue = await Payment.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: {
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    total: { $sum: '$totalAmount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

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
            monthlyRevenue: monthlyRevenue.map(item => ({
                month: item._id.month,
                year: item._id.year,
                total: item.total
            })),
            paymentMethodDistribution,
            successRate: (successfulPayments / totalPayments) * 100 || 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createPayment = async (req, res) => {
    try {
        // Extract installmentPlan from request body if it exists
        const { installmentPlan, ...paymentData } = req.body;

        // Create the payment object with modified data
        const paymentDataWithInstallments = { ...paymentData };

        // If installmentPlan exists, set the installments array and installmentMonths
        if (installmentPlan && installmentPlan.installments && installmentPlan.installments.length > 0) {
            paymentDataWithInstallments.installments = installmentPlan.installments.map(inst => ({
                ...inst,
                dueDate: new Date(inst.dueDate), // Convert string dates to Date objects
                amount: parseFloat(inst.amount)  // Convert string amounts to numbers
            }));
            paymentDataWithInstallments.installmentMonths = installmentPlan.totalMonths || installmentPlan.installments.length;
        }

        const payment = new Payment(paymentDataWithInstallments);

        // Calculate remaining amount
        const totalAmount = payment.totalAmount || 0;
        const depositAmount = payment.depositAmount || 0;
        payment.remainingAmount = totalAmount - depositAmount;

        // Determine proper payment status based on deposit vs total
        if (depositAmount >= totalAmount) {
            payment.status = 'completed';
        } else if (depositAmount > 0) {
            payment.status = 'partial';
        } else {
            payment.status = 'pending';
        }

        const savedPayment = await payment.save();

        // Create EMI records if there are installments and there's a remaining amount
        if ((payment.installmentMonths > 1 || (payment.installments && payment.installments.length > 0)) && payment.remainingAmount > 0) {
            let nextDueDate = null;

            // Use installments array if available, otherwise calculate based on installmentMonths
            if (payment.installments && payment.installments.length > 0) {
                // Create EMI records from the installments array
                for (let i = 0; i < payment.installments.length; i++) {
                    const installment = payment.installments[i];
                    const dueDate = new Date(installment.dueDate);

                    // Save the first due date as the next payment due date
                    if (i === 0) {
                        nextDueDate = dueDate;
                    }

                    // IMPORTANT: Always set initial status to 'pending' regardless of deposit
                    // This ensures that installments must be explicitly paid
                    await new EMIPayment({
                        payment: savedPayment._id,
                        student: payment.student,
                        installmentNumber: installment.month || (i + 1),
                        amount: parseFloat(installment.amount),
                        dueDate: dueDate,
                        status: 'pending', // Always pending initially
                        paymentMethod: payment.paymentMethod,
                        currency: payment.currency || 'INR'
                    }).save();
                }
            } else {
                // Calculate installments based on installmentMonths
                const monthlyAmount = payment.remainingAmount / payment.installmentMonths;

                // Create EMI payment records
                for (let i = 0; i < payment.installmentMonths; i++) {
                    const dueDate = new Date(payment.dueDate);
                    dueDate.setMonth(dueDate.getMonth() + i + 1);

                    // Save the first due date as the next payment due date
                    if (i === 0) {
                        nextDueDate = dueDate;
                    }

                    await new EMIPayment({
                        payment: savedPayment._id,
                        student: payment.student,
                        installmentNumber: i + 1,
                        amount: monthlyAmount,
                        dueDate: dueDate,
                        status: 'pending', // Always pending initially
                        paymentMethod: payment.paymentMethod,
                        currency: payment.currency || 'INR'
                    }).save();
                }
            }

            // Update student payment information
            const student = await Student.findById(payment.student);
            if (student) {
                // Update total fees if not set
                if (!student.totalFees || student.totalFees === 0) {
                    student.totalFees = payment.totalAmount;
                }

                // Update paid amount
                student.paidAmount = (student.paidAmount || 0) + payment.depositAmount;

                // Calculate remaining amount
                student.remainingAmount = student.totalFees - student.paidAmount;

                // Update fee status
                if (student.remainingAmount <= 0) {
                    student.feeStatus = 'complete';
                } else if (student.paidAmount > 0) {
                    student.feeStatus = 'partial';
                } else {
                    student.feeStatus = 'pending';
                }

                // Set next payment due date
                if (nextDueDate) {
                    student.nextPaymentDue = nextDueDate;
                }

                await student.save();
            }
        }

        // Update student payment information and status
        const student = await Student.findById(payment.student);
        if (student) {
            // Update total fees if not set
            if (!student.totalFees || student.totalFees === 0) {
                student.totalFees = payment.totalAmount;
            }

            // Update paid amount
            student.paidAmount = (student.paidAmount || 0) + payment.depositAmount;

            // Calculate remaining amount
            student.remainingAmount = student.totalFees - student.paidAmount;

            // Update fee status
            if (student.remainingAmount <= 0) {
                student.feeStatus = 'complete';
            } else if (student.paidAmount > 0) {
                student.feeStatus = 'partial';
            } else {
                student.feeStatus = 'pending';
            }

            // Only update student to active-paid when payment is actually completed
            if (payment.status === 'completed') {
                student.status = 'active-paid';
            } else if (student.status !== 'active-paid') {
                // Otherwise set to active if they've made a partial payment
                student.status = payment.depositAmount > 0 ? 'active' : student.status;
            }

            // Set next payment due date if there's remaining amount
            if (student.remainingAmount > 0 && payment.dueDate) {
                const nextDueDate = new Date(payment.dueDate);
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                student.nextPaymentDue = nextDueDate;
            }

            await student.save();
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
        const validStatuses = ['completed', 'pending', 'failed', 'refunded', 'processing', 'partial'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid payment status: ${status}`
            });
        }

        const payment = await Payment.findById(id);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Update the payment status
        payment.status = status;
        payment.transactionId = transactionId;

        await payment.save();

        // If payment is marked as paid, check if all EMIs are paid
        if (status === 'paid' && payment.installments && payment.installments.length > 0) {
            const emiPayments = await EMIPayment.find({ payment: payment._id });
            const allEMIsPaid = await Promise.all(emiPayments.map(async emi => {
                emi.status = 'paid';
                await emi.save();
                return emi.status === 'paid';
            }));

            if (allEMIsPaid.every(paid => paid)) {
                payment.status = 'completed';
                await payment.save();

                // Update student status if student reference exists
                if (payment.student) {
                    await Student.findByIdAndUpdate(payment.student, {
                        status: 'active',
                        feeStatus: 'complete'
                    });
                }
            }
        }

        res.json(payment);
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the payment
        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Delete associated EMI payments
        await EMIPayment.deleteMany({ payment: id });

        // Delete the payment
        await Payment.findByIdAndDelete(id);

        // Update student's payment information if applicable
        if (payment.student) {
            const student = await Student.findById(payment.student);
            if (student) {
                // Recalculate total fees and paid amount
                student.paidAmount = (student.paidAmount || 0) - (payment.depositAmount || 0);
                student.remainingAmount = (student.totalFees || 0) - student.paidAmount;

                // Update fee status
                if (student.remainingAmount <= 0) {
                    student.feeStatus = 'complete';
                } else if (student.paidAmount > 0) {
                    student.feeStatus = 'partial';
                } else {
                    student.feeStatus = 'pending';
                }

                await student.save();
            }
        }

        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: error.message });
    }
};

export const generatePaymentReport = async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;

        const query = {};

        // Add date filter if both startDate and endDate are provided
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Add status filter if provided
        if (status) {
            query.status = status;
        }

        // Fetch payments with populated student details
        const payments = await Payment.find(query)
            .populate('student', 'name email phone')
            .populate('feeStructure', 'name')
            .sort({ createdAt: -1 });

        // Generate PDF report
        const pdfBuffer = await generatePaymentReportPDF(payments);

        // Send PDF as response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payment-report-${new Date().toISOString().split('T')[0]}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating payment report:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getPendingPayments = async (req, res) => {
    try {
        const { studentId } = req.query;

        const query = {
            status: { $in: ['pending', 'partial', 'processing'] }
        };

        // Optional filter by student
        if (studentId) {
            query.student = studentId;
        }

        // Fetch pending payments with populated student details
        const pendingPayments = await Payment.find(query)
            .populate('student', 'name email phone')
            .populate('feeStructure', 'name')
            .sort({ createdAt: -1 });

        res.json(pendingPayments);
    } catch (error) {
        console.error('Error fetching pending payments:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;

        const payment = await Payment.findById(id)
            .populate('student', 'name email phone')
            .populate('feeStructure', 'name');

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(payment);
    } catch (error) {
        console.error('Error fetching payment by ID:', error);
        res.status(500).json({ error: error.message });
    }
};