import Payment from '../models/Payment.js';
import EMIPayment from '../models/EMIPayment.js';
import Student from '../models/Student.js';
import { generateInvoicePDF, generateReceiptPDF } from '../services/pdfService.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

export const initiatePayment = async (req, res) => {
    try {
        const data = new Payment(req.body);
        await data.save();
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getPayments = async (_, res) => {
    const payments = await Payment.find().populate('student');
    res.json(payments);
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

export const generateInvoice = async (req, res) => {
    const { studentId, paymentId } = req.params;
    const student = await Student.findById(studentId);
    const payment = await Payment.findById(paymentId);

    if (!student || !payment) {
        return res.status(404).json({ error: 'Student or Payment not found' });
    }

    const filename = `server/pdfs/invoice-${studentId}.pdf`;
    generateInvoicePDF(student, payment, filename);

    res.json({ message: 'Invoice PDF generated', filename });
};

export const generateReceipt = async (req, res) => {
    const { studentId, paymentId } = req.params;
    const student = await Student.findById(studentId);
    const payment = await Payment.findById(paymentId);

    if (!student || !payment) {
        return res.status(404).json({ error: 'Student or Payment not found' });
    }

    const filename = `server/pdfs/receipt-${studentId}.pdf`;
    generateReceiptPDF(student, payment, filename);

    res.json({ message: 'Receipt PDF generated', filename });
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
