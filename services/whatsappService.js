import axios from 'axios';
import ultramsgConfig from '../config/ultramsg.js';

export const sendWhatsAppMessage = async (phoneNumber, message) => {
    try {
        const { instanceId, token, baseUrl } = ultramsgConfig;

        const url = `${baseUrl}/${instanceId}/messages/chat`;

        const response = await axios.post(url, {
            to: phoneNumber,
            body: message
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            }
        });

        console.log('✅ WhatsApp message sent:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ WhatsApp error:', error.response?.data || error.message);
        throw error;
    }
};
