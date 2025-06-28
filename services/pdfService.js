import PDFDocument from 'pdfkit';
import fs from 'fs';

export const generateInvoicePDF = (student, payment, filename = 'invoice.pdf') => {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filename));

    doc.fontSize(20).text('Student Course Fee Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Name: ${student.name}`);
    doc.text(`Matrix Number: ${student.matrixNumber}`);
    doc.text(`Course Fee: ₹${payment.totalFee}`);
    doc.text(`Deposit Paid: ₹${payment.depositPaid}`);
    doc.text(`Due Balance: ₹${payment.dueBalance}`);
    doc.text(`Selected Months: ${payment.selectedMonths.join(', ')}`);

    doc.end();
};

export const generateReceiptPDF = (student, payment, filename = 'receipt.pdf') => {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filename));

    doc.fontSize(20).text('Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Name: ${student.name}`);
    doc.text(`Matrix Number: ${student.matrixNumber}`);
    doc.text(`Amount Paid: ₹${payment.depositPaid}`);
    doc.text(`Payment Date: ${new Date().toLocaleDateString()}`);

    doc.end();
};
