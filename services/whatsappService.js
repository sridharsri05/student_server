import axios from 'axios';
import ultramsgConfig from '../config/ultramsg.js';
import WhatsAppTemplate from '../models/WhatsAppTemplate.js';

export const sendWhatsAppMessage = async (phoneNumber, message) => {
    try {
        const { instanceId, token, baseUrl } = ultramsgConfig;
        const url = `${baseUrl}/${instanceId}/messages/chat`;

        // Format phone number if needed (remove spaces, ensure it starts with country code)
        const formattedPhone = formatPhoneNumber(phoneNumber);

        const params = new URLSearchParams();
        params.append('token', token);
        params.append('to', formattedPhone);
        params.append('body', message);
        params.append('priority', '10'); // High priority
        params.append('type', 'text');

        const response = await axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        console.log('✅ WhatsApp message sent:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ WhatsApp error:', error.response?.data || error.message);
        throw error;
    }
};

export const sendWhatsAppDocument = async (phoneNumber, documentUrl, caption = '') => {
    try {
        const { instanceId, token, baseUrl } = ultramsgConfig;
        const url = `${baseUrl}/${instanceId}/messages/document`;

        const formattedPhone = formatPhoneNumber(phoneNumber);

        const params = new URLSearchParams();
        params.append('token', token);
        params.append('to', formattedPhone);
        params.append('document', documentUrl);
        params.append('caption', caption);

        const response = await axios.post(url, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        });

        console.log('✅ WhatsApp document sent:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ WhatsApp document error:', error.response?.data || error.message);
        throw error;
    }
};

export const sendWhatsAppTemplate = async (phoneNumber, templateNameOrId, variables = {}) => {
    try {
        let templateContent;

        // Check if templateNameOrId is a MongoDB ObjectId
        if (templateNameOrId.match(/^[0-9a-fA-F]{24}$/)) {
            // It's an ObjectId, fetch from database
            const template = await WhatsAppTemplate.findById(templateNameOrId);
            if (!template) {
                throw new Error(`Template with ID "${templateNameOrId}" not found`);
            }

            templateContent = template.content;

            // Increment usage count
            template.usage += 1;
            await template.save();
        } else {
            // It's a template name, try to find in database first
            const template = await WhatsAppTemplate.findOne({ name: templateNameOrId });

            if (template) {
                templateContent = template.content;

                // Increment usage count
                template.usage += 1;
                await template.save();
            } else {
                // Fallback to predefined templates in config
                templateContent = ultramsgConfig.templates[templateNameOrId];

                if (!templateContent) {
                    throw new Error(`Template "${templateNameOrId}" not found`);
                }
            }
        }

        // Replace variables in template
        for (const [key, value] of Object.entries(variables)) {
            templateContent = templateContent.replace(new RegExp(`{${key}}`, 'g'), value);
        }

        // Send the message with the filled template
        return await sendWhatsAppMessage(phoneNumber, templateContent);
    } catch (error) {
        console.error('❌ WhatsApp template error:', error.message);
        throw error;
    }
};

export const getInstanceStatus = async () => {
    try {
        const { instanceId, token, baseUrl } = ultramsgConfig;
        const url = `${baseUrl}/${instanceId}/instance/status?token=${token}`;

        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('❌ WhatsApp status error:', error.response?.data || error.message);
        throw error;
    }
};

// Helper function to format phone numbers
const formatPhoneNumber = (phone) => {
    // Remove spaces, dashes, and other non-numeric characters
    let formatted = phone.replace(/\D/g, '');

    // Ensure it starts with country code (default to India +91 if not present)
    if (!formatted.startsWith('91') && !formatted.startsWith('+91')) {
        formatted = '91' + formatted;
    }

    // Remove + if present
    formatted = formatted.replace('+', '');

    return formatted;
};
