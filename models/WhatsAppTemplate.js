import mongoose from 'mongoose';

const whatsAppTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    usage: {
        type: Number,
        default: 0
    },
    variables: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to extract variables from content
whatsAppTemplateSchema.pre('save', function (next) {
    // Extract variables from content (format: {variable_name})
    const variableRegex = /\{([^}]+)\}/g;
    const variables = [];
    let match;

    while ((match = variableRegex.exec(this.content)) !== null) {
        variables.push(match[1]);
    }

    // Remove duplicates
    this.variables = [...new Set(variables)];

    // Update updatedAt timestamp
    this.updatedAt = Date.now();

    next();
});

const WhatsAppTemplate = mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema);
export default WhatsAppTemplate; 