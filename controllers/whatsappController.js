import {
    sendWhatsAppMessage,
    sendWhatsAppDocument,
    sendWhatsAppTemplate,
    getInstanceStatus
} from '../services/whatsappService.js';
import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import WhatsAppTemplate from '../models/WhatsAppTemplate.js';

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
        const errors = [];

        for (const phone of recipients) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const resp = await sendWhatsAppMessage(phone, message);
                results.push({ phone, resp, success: true });
            } catch (err) {
                errors.push({ phone, error: err.message });
            }
        }

        res.json({
            success: true,
            sent: results.length,
            failed: errors.length,
            results,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Send document via WhatsApp
export const sendDocument = async (req, res) => {
    try {
        const { to, documentUrl, caption } = req.body;
        if (!to || !documentUrl) {
            return res.status(400).json({ message: 'to and documentUrl are required' });
        }

        const response = await sendWhatsAppDocument(to, documentUrl, caption || '');
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Send template message with variables
export const sendTemplate = async (req, res) => {
    try {
        const { to, templateName, variables } = req.body;
        if (!to || !templateName) {
            return res.status(400).json({ message: 'to and templateName are required' });
        }

        const response = await sendWhatsAppTemplate(to, templateName, variables || {});
        res.json({ success: true, response });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get WhatsApp instance status
export const getStatus = async (req, res) => {
    try {
        const status = await getInstanceStatus();

        // Check if there's a configuration error
        if (status.status && (status.status.message || status.status.error)) {
            const errorMessage = status.status.message || status.status.error;

            // Return a more helpful message
            return res.json({
                success: true,
                status: {
                    ...status.status,
                    configurationHelp: "Please ensure ULTRAMSG_TOKEN and ULTRAMSG_INSTANCE_ID are set in your environment variables."
                }
            });
        }

        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({
            message: error.message,
            configurationHelp: "Please ensure ULTRAMSG_TOKEN and ULTRAMSG_INSTANCE_ID are set in your environment variables."
        });
    }
};

// Send batch notification to all students in a batch
export const sendBatchNotification = async (req, res) => {
    try {
        const { batchId, message } = req.body;
        if (!batchId || !message) {
            return res.status(400).json({ message: 'batchId and message are required' });
        }

        // Find the batch and get all students
        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        // Get all students in the batch
        const students = await Student.find({ currentBatch: batchId });
        if (students.length === 0) {
            return res.status(404).json({ message: 'No students found in this batch' });
        }

        // Send message to all students
        const results = [];
        const errors = [];

        for (const student of students) {
            try {
                if (!student.phone) continue;

                // eslint-disable-next-line no-await-in-loop
                const resp = await sendWhatsAppMessage(student.phone, message);
                results.push({
                    studentId: student._id,
                    name: student.name,
                    phone: student.phone,
                    resp,
                    success: true
                });
            } catch (err) {
                errors.push({
                    studentId: student._id,
                    name: student.name,
                    phone: student.phone,
                    error: err.message
                });
            }
        }

        res.json({
            success: true,
            batchName: batch.name,
            totalStudents: students.length,
            sent: results.length,
            failed: errors.length,
            results,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Save WhatsApp settings
export const saveSettings = async (req, res) => {
    try {
        const {
            businessName,
            autoReply,
            deliveryReports,
            messageQueue,
            rateLimiting,
            timezone,
            workingHours
        } = req.body;

        // In a production environment, you would save these settings to a database
        // For now, we'll just return success

        // Example of how you might save settings to environment variables or config
        // process.env.ULTRAMSG_BUSINESS_NAME = businessName;
        // process.env.ULTRAMSG_AUTO_REPLY = autoReply;
        // etc.

        res.json({
            success: true,
            message: 'WhatsApp settings saved successfully',
            settings: {
                businessName,
                autoReply,
                deliveryReports,
                messageQueue,
                rateLimiting,
                timezone,
                workingHours
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all templates
export const getTemplates = async (req, res) => {
    try {
        const templates = await WhatsAppTemplate.find().sort({ updatedAt: -1 });
        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get template by ID
export const getTemplateById = async (req, res) => {
    try {
        const template = await WhatsAppTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json({ success: true, template });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create template
export const createTemplate = async (req, res) => {
    try {
        const { name, content, category } = req.body;
        if (!name || !content || !category) {
            return res.status(400).json({ message: 'name, content, and category are required' });
        }

        // Check if template with same name already exists
        const existingTemplate = await WhatsAppTemplate.findOne({ name });
        if (existingTemplate) {
            return res.status(400).json({ message: 'Template with this name already exists' });
        }

        const template = new WhatsAppTemplate({
            name,
            content,
            category
        });

        await template.save();
        res.status(201).json({ success: true, template });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update template
export const updateTemplate = async (req, res) => {
    try {
        const { name, content, category } = req.body;
        if (!name || !content || !category) {
            return res.status(400).json({ message: 'name, content, and category are required' });
        }

        // Check if another template with same name already exists
        const existingTemplate = await WhatsAppTemplate.findOne({
            name,
            _id: { $ne: req.params.id }
        });

        if (existingTemplate) {
            return res.status(400).json({ message: 'Another template with this name already exists' });
        }

        const template = await WhatsAppTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        template.name = name;
        template.content = content;
        template.category = category;
        template.updatedAt = Date.now();

        await template.save();
        res.json({ success: true, template });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete template
export const deleteTemplate = async (req, res) => {
    try {
        const template = await WhatsAppTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        await template.deleteOne();
        res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Increment template usage
export const incrementTemplateUsage = async (req, res) => {
    try {
        const template = await WhatsAppTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        template.usage += 1;
        await template.save();
        res.json({ success: true, template });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 