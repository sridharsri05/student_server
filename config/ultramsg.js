const ultramsgConfig = {
    instanceId: process.env.ULTRAMSG_INSTANCE_ID,
    token: process.env.ULTRAMSG_TOKEN,
    baseUrl: process.env.ULTRAMSG_BASE_URL || 'https://api.ultramsg.com',
    settings: {
        businessName: process.env.ULTRAMSG_BUSINESS_NAME || 'EduFlow Institute',
        messageQueue: process.env.ULTRAMSG_MESSAGE_QUEUE === 'true',
        deliveryReports: process.env.ULTRAMSG_DELIVERY_REPORTS === 'true',
        autoReply: process.env.ULTRAMSG_AUTO_REPLY === 'true',
        rateLimiting: process.env.ULTRAMSG_RATE_LIMIT || 'standard', // low, standard, high
    },
    templates: {
        // These are fallback templates if not found in database
        fee_reminder: 'Hi {student_name}, this is a reminder that your fee payment of ₹{amount} is due on {due_date}. Please make the payment to avoid any inconvenience.',
        class_update: 'Dear {student_name}, your class for {subject} on {date} has been rescheduled to {new_time}. Please join accordingly.',
        welcome: 'Welcome to our institute, {student_name}! We\'re excited to have you join {course_name}. Your classes begin on {start_date}.',
        payment_confirmation: 'Thank you {student_name}! Your payment of ₹{amount} has been received successfully. Receipt: {receipt_number}'
    }
};

export default ultramsgConfig;
