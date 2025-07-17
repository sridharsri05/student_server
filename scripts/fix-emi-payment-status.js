// Script to fix incorrectly marked EMI payments
import mongoose from 'mongoose';
import EMIPayment from '../models/EMIPayment.js';
import Payment from '../models/Payment.js';
import dotenv from 'dotenv';

// Configure environment variables
dotenv.config();

async function fixEMIPayments() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all EMI payments marked as paid but without a valid paidDate or transactionId
        const incorrectEMIs = await EMIPayment.find({
            status: 'paid',
            $or: [
                { paidDate: null },
                { paidDate: { $exists: false } },
                { transactionId: null },
                { transactionId: { $exists: false } },
                { transactionId: '' }
            ]
        });

        console.log(`Found ${incorrectEMIs.length} incorrectly marked EMI payments`);

        // Fix each incorrect EMI payment
        for (const emi of incorrectEMIs) {
            console.log(`Fixing EMI payment #${emi.installmentNumber} (${emi._id})`);

            // Reset to pending status
            emi.status = 'pending';
            emi.paidDate = null;

            await emi.save();
            console.log(`Reset EMI payment #${emi.installmentNumber} to pending status`);

            // Update the main payment status if needed
            const mainPayment = await Payment.findById(emi.payment);
            if (mainPayment) {
                const pendingEMIs = await EMIPayment.countDocuments({
                    payment: mainPayment._id,
                    status: { $in: ['pending', 'overdue'] }
                });

                if (pendingEMIs > 0 && mainPayment.status === 'completed') {
                    mainPayment.status = 'partial';
                    await mainPayment.save();
                    console.log(`Updated payment ${mainPayment._id} status to partial`);
                }
            }
        }

        console.log('EMI payment status correction completed successfully');
    } catch (error) {
        console.error('Error fixing EMI payments:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the fix function
fixEMIPayments(); 