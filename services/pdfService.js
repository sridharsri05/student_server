import PDFDocument from 'pdfkit';
import fs from 'fs';
import { format } from 'date-fns';
import path from 'path';

// Modern color scheme
const BRAND_COLOR = '#0f766e'; // Teal 700
const ACCENT_COLOR = '#14b8a6'; // Teal 500
const TEXT_COLOR = '#1f2937'; // Gray 800
const LIGHT_BG = '#f9fafb'; // Gray 50

/**
 * Common PDF styling utilities
 */
const applyHeaderStyle = (doc) => {
    doc.font('Helvetica-Bold')
        .fontSize(22)
        .fillColor(BRAND_COLOR);
};

const applySubHeaderStyle = (doc) => {
    doc.font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(BRAND_COLOR);
};

const applyBodyStyle = (doc) => {
    doc.font('Helvetica')
        .fontSize(11)
        .fillColor(TEXT_COLOR);
};

const applyLabelStyle = (doc) => {
    doc.font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(TEXT_COLOR);
};

// Draw a branded header with logo
const drawHeader = (doc, title) => {
    // Draw brand logo (using vector graphics since we don't have an actual image file)
    doc.save();
    doc.translate(50, 40);

    // Draw logo background
    doc.roundedRect(0, 0, 40, 40, 5)
        .fillColor(BRAND_COLOR);

    // Draw stylized "S" for Student Registration System
    doc.fillColor('white')
        .moveTo(10, 10)
        .bezierCurveTo(25, 5, 35, 15, 30, 25)
        .bezierCurveTo(25, 35, 15, 30, 10, 20)
        .bezierCurveTo(5, 10, 15, 5, 20, 10)
        .fill();

    doc.restore();

    // Draw company name
    doc.font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(BRAND_COLOR)
        .text('Student Registration System', 100, 45);

    // Draw document title
    doc.fontSize(24)
        .text(title, 400, 45, { align: 'right' });

    // Draw divider line
    doc.moveTo(50, 80)
        .lineTo(550, 80)
        .strokeColor(ACCENT_COLOR)
        .lineWidth(1)
        .stroke();
};

// Create a better looking table with borders and alternating row colors
const createTable = (doc, headers, rows, startX, startY, colWidths) => {
    const rowHeight = 25;
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    // Draw table header background
    doc.rect(startX, startY, tableWidth, rowHeight)
        .fillColor(BRAND_COLOR)
        .fill();

    // Draw header text
    doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
    headers.forEach((header, i) => {
        const xPos = startX + (colWidths.slice(0, i).reduce((a, b) => a + b, 0));
        doc.text(header, xPos + 5, startY + 8, { width: colWidths[i] - 10 });
    });

    // Draw rows with alternating background
    let y = startY + rowHeight;
    rows.forEach((row, rowIndex) => {
        // Draw row background
        if (rowIndex % 2 === 0) {
            doc.rect(startX, y, tableWidth, rowHeight)
                .fillColor('#f8fafc')
                .fill();
        }

        // Draw cell borders and text
        doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(10);
        row.forEach((cell, i) => {
            const xPos = startX + (colWidths.slice(0, i).reduce((a, b) => a + b, 0));

            // Draw cell text
            doc.text(cell.toString(),
                xPos + 5,
                y + 8,
                { width: colWidths[i] - 10 }
            );

            // Draw cell border
            doc.rect(xPos, y, colWidths[i], rowHeight)
                .strokeColor('#e2e8f0')
                .lineWidth(0.5)
                .stroke();
        });

        y += rowHeight;
    });

    return y; // Return the Y position after the table
};

/**
 * Generates a professional invoice PDF
 */
export const generateInvoicePDF = async (student, payment) => {
    try {
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            info: {
                Title: `Invoice ${payment.invoiceNumber || payment._id}`,
                Author: 'Student Registration System'
            }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header with logo
        drawHeader(doc, 'INVOICE');

        // Invoice details box
        doc.roundedRect(50, 100, 240, 80, 5)
            .fillColor(LIGHT_BG)
            .fill();

        doc.fillColor(BRAND_COLOR).fontSize(12).font('Helvetica-Bold');
        doc.text('INVOICE DETAILS', 60, 110);

        applyLabelStyle(doc);
        doc.text('Invoice Number:', 60, 130);
        doc.text('Date Issued:', 60, 150);
        doc.text('Due Date:', 60, 170);

        applyBodyStyle(doc);
        doc.text(`${payment.invoiceNumber || payment._id}`, 160, 130);
        doc.text(`${format(new Date(), 'PPP')}`, 160, 150);
        doc.text(`${payment.dueDate ? format(new Date(payment.dueDate), 'PPP') : 'N/A'}`, 160, 170);

        // Student details box
        doc.roundedRect(310, 100, 240, 80, 5)
            .fillColor(LIGHT_BG)
            .fill();

        doc.fillColor(BRAND_COLOR).fontSize(12).font('Helvetica-Bold');
        doc.text('BILLED TO', 320, 110);

        applyBodyStyle(doc);
        doc.text(student.name || 'Student', 320, 130);
        doc.text(student.email || 'N/A', 320, 150);
        doc.text(student.phone || 'N/A', 320, 170);

        // Payment details section
        applySubHeaderStyle(doc);
        doc.text('Payment Details', 50, 210);

        const headers = ['Description', 'Amount'];
        const rows = [
            [`Course Fee - ${payment.courseName || 'Course'}`, `₹${(payment.totalAmount || 0).toLocaleString()}`]
        ];

        if (payment.depositAmount > 0) {
            rows.push(['Deposit Paid', `-₹${payment.depositAmount.toLocaleString()}`]);
        }

        let yPos = createTable(doc, headers, rows, 50, 230, [350, 150]);

        // Total amount section with highlighted box
        doc.roundedRect(350, yPos + 20, 150, 40, 5)
            .fillColor(BRAND_COLOR)
            .fill();

        doc.fillColor('white').font('Helvetica-Bold').fontSize(14);
        doc.text('Total Due:', 360, yPos + 30);
        doc.text(`₹${((payment.totalAmount || 0) - (payment.depositAmount || 0)).toLocaleString()}`,
            360, yPos + 30, { align: 'right', width: 130 });

        // Installment schedule if applicable
        if (payment.installments?.length > 0) {
            applySubHeaderStyle(doc);
            doc.text('Installment Schedule', 50, yPos + 80);

            const installmentHeaders = ['Month', 'Due Date', 'Amount', 'Status'];
            const installmentRows = payment.installments.map(inst => [
                `Month ${inst.month}`,
                inst.dueDate ? format(new Date(inst.dueDate), 'PPP') : 'N/A',
                `₹${(inst.amount || 0).toLocaleString()}`,
                inst.status || 'pending'
            ]);

            createTable(doc, installmentHeaders, installmentRows, 50, yPos + 100, [100, 150, 100, 100]);
        }

        // Terms and conditions
        doc.moveDown(4);
        applySubHeaderStyle(doc);
        doc.text('Terms & Conditions', 50, doc.y);

        applyBodyStyle(doc);
        doc.moveDown();
        doc.list([
            'All fees must be paid by the due date specified above.',
            'Late payments may incur additional charges.',
            'This is a computer-generated invoice and requires no signature.'
        ], { bulletRadius: 2, textIndent: 10 });

        // Footer with brand color bar
        doc.rect(0, doc.page.height - 40, doc.page.width, 40)
            .fillColor(BRAND_COLOR)
            .fill();

        doc.fillColor('white').fontSize(10).font('Helvetica');
        doc.text('Thank you for choosing Student Registration System!', 0, doc.page.height - 25, {
            align: 'center',
            width: doc.page.width
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
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            info: {
                Title: `Receipt ${payment.receiptNumber || payment._id}`,
                Author: 'Student Registration System'
            }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header with logo
        drawHeader(doc, 'RECEIPT');

        // Receipt details box
        doc.roundedRect(50, 100, 240, 80, 5)
            .fillColor(LIGHT_BG)
            .fill();

        doc.fillColor(BRAND_COLOR).fontSize(12).font('Helvetica-Bold');
        doc.text('RECEIPT DETAILS', 60, 110);

        applyLabelStyle(doc);
        doc.text('Receipt Number:', 60, 130);
        doc.text('Payment Date:', 60, 150);
        doc.text('Payment Method:', 60, 170);

        applyBodyStyle(doc);
        doc.text(`${payment.receiptNumber || payment._id}`, 160, 130);
        doc.text(`${format(new Date(payment.paidDate || new Date()), 'PPP')}`, 160, 150);
        doc.text(`${payment.paymentMethod || 'N/A'}`, 160, 170);

        // Student details box
        doc.roundedRect(310, 100, 240, 80, 5)
            .fillColor(LIGHT_BG)
            .fill();

        doc.fillColor(BRAND_COLOR).fontSize(12).font('Helvetica-Bold');
        doc.text('RECEIVED FROM', 320, 110);

        applyBodyStyle(doc);
        doc.text(student.name || 'Student', 320, 130);
        doc.text(student.email || 'N/A', 320, 150);
        doc.text(student.phone || 'N/A', 320, 170);

        // Payment details section
        applySubHeaderStyle(doc);
        doc.text('Payment Details', 50, 210);

        const headers = ['Description', 'Amount'];
        const rows = [[
            payment.description || `Payment for ${payment.courseName || 'Course'}`,
            `₹${(payment.amount || payment.depositAmount || 0).toLocaleString()}`
        ]];

        let yPos = createTable(doc, headers, rows, 50, 230, [350, 150]);

        // Total amount section with highlighted box
        doc.roundedRect(350, yPos + 20, 150, 40, 5)
            .fillColor(BRAND_COLOR)
            .fill();

        doc.fillColor('white').font('Helvetica-Bold').fontSize(14);
        doc.text('Amount Received:', 360, yPos + 30);
        doc.text(`₹${(payment.amount || payment.depositAmount || 0).toLocaleString()}`,
            360, yPos + 30, { align: 'right', width: 130 });

        // Authentication
        doc.moveDown(4);

        // Add a "PAID" watermark
        doc.save();
        doc.rotate(-45, { origin: [300, 400] });
        doc.fontSize(100).fillColor('rgba(15, 118, 110, 0.1)');
        doc.text('PAID', 100, 400);
        doc.restore();

        applyBodyStyle(doc);
        doc.fontSize(10);
        doc.text('This is a computer-generated receipt. No signature is required.', 50, doc.y + 20);

        // Footer with brand color bar
        doc.rect(0, doc.page.height - 40, doc.page.width, 40)
            .fillColor(BRAND_COLOR)
            .fill();

        doc.fillColor('white').fontSize(10).font('Helvetica');
        doc.text('Thank you for your payment!', 0, doc.page.height - 25, {
            align: 'center',
            width: doc.page.width
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
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            info: {
                Title: 'Payment Report',
                Author: 'Student Registration System'
            }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        // Header with logo
        drawHeader(doc, 'PAYMENT REPORT');

        // Report period
        applyBodyStyle(doc);
        doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 50, 100);

        if (filters.dateFrom && filters.dateTo) {
            doc.text(`Period: ${format(new Date(filters.dateFrom), 'PPP')} - ${format(new Date(filters.dateTo), 'PPP')}`, 50, 120);
        }

        // Analytics summary with boxes
        doc.moveDown(2);

        // Create a grid of metric boxes
        const boxWidth = 125;
        const boxHeight = 80;
        const boxGap = 10;
        const startY = 150;

        // Total Revenue Box
        doc.roundedRect(50, startY, boxWidth, boxHeight, 5)
            .fillColor(BRAND_COLOR)
            .fill();

        doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
        doc.text('TOTAL REVENUE', 50 + 10, startY + 15, { width: boxWidth - 20, align: 'center' });
        doc.fontSize(16);
        doc.text(`₹${analytics.totalRevenue?.toLocaleString() || 0}`, 50 + 10, startY + 40, { width: boxWidth - 20, align: 'center' });

        // Successful Payments Box
        doc.roundedRect(50 + boxWidth + boxGap, startY, boxWidth, boxHeight, 5)
            .fillColor(ACCENT_COLOR)
            .fill();

        doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
        doc.text('SUCCESSFUL', 50 + boxWidth + boxGap + 10, startY + 15, { width: boxWidth - 20, align: 'center' });
        doc.fontSize(16);
        doc.text(`${analytics.successfulPayments || 0}`, 50 + boxWidth + boxGap + 10, startY + 40, { width: boxWidth - 20, align: 'center' });

        // Pending Payments Box
        doc.roundedRect(50 + (boxWidth + boxGap) * 2, startY, boxWidth, boxHeight, 5)
            .fillColor('#f59e0b')  // Amber 500
            .fill();

        doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
        doc.text('PENDING', 50 + (boxWidth + boxGap) * 2 + 10, startY + 15, { width: boxWidth - 20, align: 'center' });
        doc.fontSize(16);
        doc.text(`₹${analytics.pendingPayments?.toLocaleString() || 0}`, 50 + (boxWidth + boxGap) * 2 + 10, startY + 40, { width: boxWidth - 20, align: 'center' });

        // Failed Payments Box
        doc.roundedRect(50 + (boxWidth + boxGap) * 3, startY, boxWidth, boxHeight, 5)
            .fillColor('#ef4444')  // Red 500
            .fill();

        doc.fillColor('white').fontSize(12).font('Helvetica-Bold');
        doc.text('FAILED', 50 + (boxWidth + boxGap) * 3 + 10, startY + 15, { width: boxWidth - 20, align: 'center' });
        doc.fontSize(16);
        doc.text(`${analytics.failedPayments || 0}`, 50 + (boxWidth + boxGap) * 3 + 10, startY + 40, { width: boxWidth - 20, align: 'center' });

        // Payment details table
        applySubHeaderStyle(doc);
        doc.text('Payment Details', 50, startY + boxHeight + 30);

        const headers = ['Student', 'Amount', 'Method', 'Status', 'Date'];
        const rows = payments.map(payment => [
            payment.students?.name || payment.studentName || 'Unknown',
            `₹${payment.amount?.toLocaleString() || 0}`,
            payment.payment_method || payment.method || 'Unknown',
            payment.status || 'Unknown',
            format(new Date(payment.created_at || payment.date), 'PP')
        ]);

        createTable(doc, headers, rows, 50, startY + boxHeight + 50, [150, 100, 100, 80, 100]);

        // Footer with brand color bar
        doc.rect(0, doc.page.height - 40, doc.page.width, 40)
            .fillColor(BRAND_COLOR)
            .fill();

        doc.fillColor('white').fontSize(10).font('Helvetica');
        doc.text('Student Registration System - Confidential', 0, doc.page.height - 25, {
            align: 'center',
            width: doc.page.width
        });

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
