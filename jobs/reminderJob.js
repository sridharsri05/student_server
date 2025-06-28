import cron from 'node-cron';
import Student from '../models/Student.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

/**
 * Example: "0 9 7 * *"
 * - minute: 0
 * - hour: 9 (9 AM)
 * - day of month: 7
 * - every month
 * - every day of week
 * => Runs at 9 AM on the 7th day of each month
 */
const reminderJob = cron.schedule('0 9 7 * *', async () => {
    console.log('📢 Running monthly reminder job...');

    try {
        // Get all students with due balances
        const students = await Student.find({ dueBalance: { $gt: 0 } });

        for (const student of students) {
            const message = `Dear ${student.name}, your monthly EMI payment is due. Please pay before 7th to avoid late fees.`;
            await sendWhatsAppMessage(student.phone, message);
            console.log(`✅ Reminder sent to ${student.name} (${student.phone})`);
        }

        console.log('✅ All reminders sent successfully.');
    } catch (err) {
        console.error('❌ Error in sending reminders:', err);
    }
}, {
    scheduled: false, // don't start immediately
    timezone: 'Asia/Kolkata' // adjust to your timezone
});

export default reminderJob;
