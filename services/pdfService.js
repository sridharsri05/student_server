import PDFDocument from 'pdfkit';
import fs from 'fs';
import { format } from 'date-fns';

const NEON_CYAN = '#00D4FF';

/**
 * Common PDF styling utilities
 */
const applyHeaderStyle = (doc) => {
    doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(NEON_CYAN);
};

const applyBodyStyle = (doc) => {
    doc.font('Helvetica')
        .fontSize(12)
        .fillColor('black');
};

const createTable = (doc, headers, rows, startX, startY, colWidths) => {
    // Draw headers
    doc.font('Helvetica-Bold').fontSize(10);
    headers.forEach((header, i) => {
        doc.text(header, startX + (colWidths.slice(0, i).reduce((a, b) => a + b, 0)), startY);
    });

    // Draw rows
    doc.font('Helvetica').fontSize(10);
    let y = startY + 20;
    rows.forEach(row => {
        row.forEach((cell, i) => {
            doc.text(cell.toString(),
                startX + (colWidths.slice(0, i).reduce((a, b) => a + b, 0)),
                y);
        });
        y += 15;
    });
};

/**
 * Generates a professional invoice PDF
 */
export const generateInvoicePDF = async (student, payment) => {
    try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header
        applyHeaderStyle(doc);
        doc.text('EduFlow Academy', 50, 50);
        doc.moveDown();
        doc.text('INVOICE', { align: 'right' });

        // Invoice details
        applyBodyStyle(doc);
        doc.text(`Invoice #: INV-${payment.invoiceNumber || payment._id}`, 50, 120);
        doc.text(`Date: ${format(new Date(), 'PPP')}`, 50, 140);
        doc.text(`Due Date: ${payment.dueDate ? format(new Date(payment.dueDate), 'PPP') : 'N/A'}`, 50, 160);

        // Student details
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Bill To:', 50);
        applyBodyStyle(doc);
        doc.text(student.name || 'Student');
        doc.text(student.email || 'N/A');
        doc.text(student.phone || 'N/A');

        // Payment details table
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Payment Details:', 50);

        const headers = ['Description', 'Amount'];
        const rows = [
            [`Course Fee - ${payment.courseName || 'Course'}`, `₹${(payment.totalAmount || 0).toLocaleString()}`]
        ];

        if (payment.depositAmount > 0) {
            rows.push(['Deposit Paid', `-₹${payment.depositAmount.toLocaleString()}`]);
        }

        createTable(doc, headers, rows, 50, doc.y + 20, [300, 150]);

        // Total
        doc.moveDown(3);
        doc.font('Helvetica-Bold')
            .text('Total Due:', 300)
            .text(`₹${((payment.totalAmount || 0) - (payment.depositAmount || 0)).toLocaleString()}`, 400);

        // Installment schedule if applicable
        if (payment.installments?.length > 0) {
            doc.moveDown(2);
            doc.font('Helvetica-Bold').text('Installment Schedule:', 50);
            applyBodyStyle(doc);

            const installmentHeaders = ['Month', 'Due Date', 'Amount', 'Status'];
            const installmentRows = payment.installments.map(inst => [
                `Month ${inst.month}`,
                inst.dueDate ? format(new Date(inst.dueDate), 'PPP') : 'N/A',
                `₹${(inst.amount || 0).toLocaleString()}`,
                inst.status || 'pending'
            ]);

            createTable(doc, installmentHeaders, installmentRows, 50, doc.y + 20, [100, 150, 100, 100]);
        }

        // Terms and conditions
        doc.moveDown(2);
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .text('Terms & Conditions:', 50);
        doc.font('Helvetica')
            .text('1. All fees must be paid by the due date specified above.')
            .text('2. Late payments may incur additional charges.')
            .text('3. This is a computer-generated invoice and requires no signature.');

        // Footer
        doc.fontSize(10)
            .text('Thank you for choosing EduFlow Academy!', 50, doc.page.height - 100, {
                align: 'center'
            });

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);
        });
    } catch (error) {
        console.error('Error generating invoice PDF:', error);
        throw new Error('Failed to generate invoice PDF');
    }
};

/**
 * Generates a professional receipt PDF
 */
export const generateReceiptPDF = async (student, payment) => {
    try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header
        applyHeaderStyle(doc);
        doc.text('EduFlow Academy', 50, 50);
    doc.moveDown();
        doc.text('PAYMENT RECEIPT', { align: 'right' });

        // Receipt details
        applyBodyStyle(doc);
        doc.text(`Receipt #: RCP-${payment.receiptNumber || payment._id}`, 50, 120);
        doc.text(`Date: ${format(new Date(), 'PPP')}`, 50, 140);
        doc.text(`Payment Method: ${payment.paymentMethod || 'N/A'}`, 50, 160);

        // Student details
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Received From:', 50);
        applyBodyStyle(doc);
        doc.text(student.name || 'Student');
        doc.text(student.email || 'N/A');

        // Payment details table
        doc.moveDown(2);
        const headers = ['Description', 'Amount'];
        const rows = [[
            payment.description || `Payment for ${payment.courseName || 'Course'}`,
            `₹${(payment.amount || payment.depositAmount || 0).toLocaleString()}`
        ]];

        createTable(doc, headers, rows, 50, doc.y + 20, [300, 150]);

        // Total amount
        doc.moveDown(3);
        doc.font('Helvetica-Bold')
            .text('Amount Received:', 300)
            .text(`₹${(payment.amount || payment.depositAmount || 0).toLocaleString()}`, 400);

        // Authentication
        doc.moveDown(2);
        doc.fontSize(10)
            .text('This is a computer-generated receipt.')
            .text('No signature is required.');

        // Footer
        doc.fontSize(10)
            .text('Thank you for your payment!', 50, doc.page.height - 100, {
                align: 'center'
            });

    doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);
        });
    } catch (error) {
        console.error('Error generating receipt PDF:', error);
        throw new Error('Failed to generate receipt PDF');
    }
};

/**
 * Generates a comprehensive payment report PDF
 */
export const generatePaymentReportPDF = async (payments, analytics, filters = {}) => {
    try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header
        applyHeaderStyle(doc);
        doc.text('Payment Report', 50, 50);

        // Report period
        applyBodyStyle(doc);
        doc.moveDown();
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`);

        if (filters.dateFrom && filters.dateTo) {
            doc.text(`Period: ${format(new Date(filters.dateFrom), 'PPP')} - ${format(new Date(filters.dateTo), 'PPP')}`);
        }

        // Analytics summary
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Payment Summary');
        applyBodyStyle(doc);
    doc.moveDown();
        doc.text(`Total Revenue: ₹${analytics.totalRevenue?.toLocaleString() || 0}`);
        doc.text(`Successful Payments: ${analytics.successfulPayments || 0}`);
        doc.text(`Pending Payments: ₹${analytics.pendingPayments?.toLocaleString() || 0}`);
        doc.text(`Failed Payments: ${analytics.failedPayments || 0}`);

        // Payment details table
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Payment Details');

        const headers = ['Student', 'Amount', 'Method', 'Status', 'Date'];
        const rows = payments.map(payment => [
            payment.students?.name || payment.studentName || 'Unknown',
            `₹${payment.amount?.toLocaleString() || 0}`,
            payment.payment_method || payment.method || 'Unknown',
            payment.status || 'Unknown',
            format(new Date(payment.created_at || payment.date), 'PP')
        ]);

        createTable(doc, headers, rows, 50, doc.y + 20, [150, 100, 100, 80, 100]);

    doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);
        });
    } catch (error) {
        console.error('Error generating payment report PDF:', error);
        throw new Error('Failed to generate payment report PDF');
    }
};
