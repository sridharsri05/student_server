const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const EMIPayment = require('../models/EMIPayment');

async function fixEMIPaymentStatus() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Find EMI payments that need status correction
        const emiPayments = await EMIPayment.find({
            $or: [
                { status: { $ne: 'paid' }, paidDate: { $exists: true } },
                { status: 'pending', dueDate: { $lt: new Date() } }
            ]
        });

        console.log(`Found ${emiPayments.length} EMI payments to update`);

        // Update each payment
        for (const payment of emiPayments) {
            console.log(`Updating EMI Payment ID: ${payment._id}`);

            // If paid date exists, mark as paid
            if (payment.paidDate) {
                payment.status = 'paid';
            }

            // If due date has passed and not already processed
            if (new Date() > payment.dueDate && payment.status !== 'paid') {
                payment.status = 'overdue';
            }

            // Generate receipt number if not exists and paid
            if (payment.status === 'paid' && !payment.receiptNumber) {
                const count = await EMIPayment.countDocuments();
                payment.receiptNumber = `EMI${String(count + 1).padStart(6, '0')}`;
            }

            await payment.save();
            console.log(`Updated status to: ${payment.status}`);
        }

        console.log('EMI payment status update complete');
    } catch (error) {
        console.error('Error updating EMI payments:', error);
    } finally {
        await mongoose.connection.close();
    }
}

fixEMIPaymentStatus(); 