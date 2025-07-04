import FeeStructure from '../models/FeeStructure.js';

// Get all fee structures (optionally filter by category, type, isActive)
export const getFeeStructures = async (req, res) => {
    try {
        const { category, type, status } = req.query;
        const query = {};

        if (category) query.category = category;
        if (type) query.type = type;
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;

        const fees = await FeeStructure.find(query).sort({ createdAt: -1 });
        res.json({ feeStructures: fees });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single fee structure by ID
export const getFeeStructureById = async (req, res) => {
    try {
        const fee = await FeeStructure.findById(req.params.id);
        if (!fee) return res.status(404).json({ message: 'Fee structure not found' });
        res.json(fee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create new fee structure
export const createFeeStructure = async (req, res) => {
    try {
        const fee = new FeeStructure(req.body);
        const saved = await fee.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update fee structure
export const updateFeeStructure = async (req, res) => {
    try {
        const updated = await FeeStructure.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: 'Fee structure not found' });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete fee structure
export const deleteFeeStructure = async (req, res) => {
    try {
        const deleted = await FeeStructure.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Fee structure not found' });
        res.json({ message: 'Fee structure deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 