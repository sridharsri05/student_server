import { sendWhatsAppMessage } from '../services/whatsappService.js';

// Send a single WhatsApp message
export const sendMessage = async (req, res) => {
    try {
        const { to, message } = req.body;
        if (!to || !message) return res.status(400).json({ message: 'to and message are required' });

        const response = await sendWhatsAppMessage(to, message);
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Broadcast message to multiple recipients
export const broadcastMessage = async (req, res) => {
    try {
        const { recipients, message } = req.body; // recipients = array of phone numbers
        if (!Array.isArray(recipients) || recipients.length === 0 || !message) {
            return res.status(400).json({ message: 'recipients array and message are required' });
        }

        const results = [];
        for (const phone of recipients) {
            // eslint-disable-next-line no-await-in-loop
            const resp = await sendWhatsAppMessage(phone, message);
            results.push({ phone, resp });
        }

        res.json({ success: true, sent: results.length, results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 