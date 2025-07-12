const mongoose = require('mongoose');
const EMIPayment = require('../models/EMIPayment');
const Payment = require('../models/Payment');
const Student = require('../models/Student');

class PaymentValidator {
  static async validateEMIPayment(emiPayment) {
    // Comprehensive EMI payment validation
    const errors = [];

    // 1. Check student existence
    if (!emiPayment.student) {
      errors.push('Student reference is required');
    }

    // 2. Validate amount
    if (emiPayment.amount <= 0) {
      errors.push('Invalid payment amount');
    }

    // 3. Check installment number
    if (emiPayment.installmentNumber <= 0) {
      errors.push('Invalid installment number');
    }

    // 4. Due date validation
    if (!emiPayment.dueDate || emiPayment.dueDate < new Date()) {
      errors.push('Invalid or past due date');
    }

    return errors;
  }

  static async processPaymentStatus(emiPayment) {
    const now = new Date();

    // Advanced status management
    if (emiPayment.paidDate) {
      emiPayment.status = 'paid';
    } else if (now > emiPayment.dueDate) {
      // Implement smart overdue logic
      const daysSinceDue = Math.ceil((now - emiPayment.dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceDue <= 7) {
        emiPayment.status = 'overdue';
      } else if (daysSinceDue > 7 && daysSinceDue <= 30) {
        emiPayment.status = 'seriously_overdue';
        // Trigger notification
        await this.sendOverdueNotification(emiPayment);
      } else {
        emiPayment.status = 'default';
        // Potential legal/collection process
      }
    }

    return emiPayment;
  }

  static async sendOverdueNotification(emiPayment) {
    // Implement notification logic (WhatsApp, Email)
    // This is a placeholder - replace with actual notification service
    console.log(`Overdue notification for EMI: ${emiPayment._id}`);
  }

  static async reconcileStudentPayments(studentId) {
    const student = await Student.findById(studentId);
    if (!student) return;

    const payments = await Payment.find({ student: studentId });
    const emiPayments = await EMIPayment.find({ student: studentId });

    // Calculate total paid and remaining amounts
    const totalPaid = emiPayments
      .filter(emi => emi.status === 'paid')
      .reduce((sum, emi) => sum + emi.amount, 0);

    student.paidAmount = totalPaid;
    student.remainingAmount = student.totalFees - totalPaid;
    
    // Update fee status
    student.feeStatus = totalPaid >= student.totalFees ? 'complete' : 'partial';

    await student.save();
  }
}

module.exports = PaymentValidator; 