import Discount from '../models/Discount.js';
import Course from '../models/Course.js';
import FeeStructure from '../models/FeeStructure.js';
import mongoose from 'mongoose';

// Get all discounts
export const getAllDiscounts = async (req, res) => {
    try {
        const discounts = await Discount.find()
            .populate('applicableCourses', 'name')
            .populate('applicableFeeStructures', 'name')
            .populate('createdBy', 'name');

        res.status(200).json(discounts);
    } catch (error) {
        console.error('Error fetching discounts:', error);
        res.status(500).json({ message: 'Failed to fetch discounts', error: error.message });
    }
};

// Get a single discount by ID
export const getDiscountById = async (req, res) => {
    try {
        const discount = await Discount.findById(req.params.id)
            .populate('applicableCourses', 'name')
            .populate('applicableFeeStructures', 'name')
            .populate('createdBy', 'name');

        if (!discount) {
            return res.status(404).json({ message: 'Discount not found' });
        }

        res.status(200).json(discount);
    } catch (error) {
        console.error('Error fetching discount:', error);
        res.status(500).json({ message: 'Failed to fetch discount', error: error.message });
    }
};

// Create a new discount
export const createDiscount = async (req, res) => {
    try {
        const {
            name,
            code,
            type,
            value,
            maxAmount,
            applicableCourses,
            applicableFeeStructures,
            startDate,
            endDate,
            minPurchaseAmount,
            maxUsageCount,
            isActive,
            description
        } = req.body;

        // Validate required fields
        if (!name || !type || value === undefined) {
            return res.status(400).json({ message: 'Name, type, and value are required fields' });
        }

        // Validate discount code uniqueness if provided
        if (code) {
            const existingDiscount = await Discount.findOne({ code });
            if (existingDiscount) {
                return res.status(400).json({ message: 'Discount code already exists' });
            }
        }

        // Create new discount
        const discount = new Discount({
            name,
            code,
            type,
            value,
            maxAmount,
            applicableCourses,
            applicableFeeStructures,
            startDate: startDate || new Date(),
            endDate,
            minPurchaseAmount,
            maxUsageCount,
            isActive: isActive !== undefined ? isActive : true,
            description,
            createdBy: req.user ? req.user._id : null
        });

        await discount.save();

        res.status(201).json(discount);
    } catch (error) {
        console.error('Error creating discount:', error);
        res.status(500).json({ message: 'Failed to create discount', error: error.message });
    }
};

// Update a discount
export const updateDiscount = async (req, res) => {
    try {
        const {
            name,
            code,
            type,
            value,
            maxAmount,
            applicableCourses,
            applicableFeeStructures,
            startDate,
            endDate,
            minPurchaseAmount,
            maxUsageCount,
            currentUsageCount,
            isActive,
            description
        } = req.body;

        // Check if discount exists
        const discount = await Discount.findById(req.params.id);
        if (!discount) {
            return res.status(404).json({ message: 'Discount not found' });
        }

        // If code is being changed, check for uniqueness
        if (code && code !== discount.code) {
            const existingDiscount = await Discount.findOne({ code });
            if (existingDiscount) {
                return res.status(400).json({ message: 'Discount code already exists' });
            }
        }

        // Update fields
        if (name) discount.name = name;
        if (code) discount.code = code;
        if (type) discount.type = type;
        if (value !== undefined) discount.value = value;
        if (maxAmount !== undefined) discount.maxAmount = maxAmount;
        if (applicableCourses) discount.applicableCourses = applicableCourses;
        if (applicableFeeStructures) discount.applicableFeeStructures = applicableFeeStructures;
        if (startDate) discount.startDate = startDate;
        if (endDate !== undefined) discount.endDate = endDate;
        if (minPurchaseAmount !== undefined) discount.minPurchaseAmount = minPurchaseAmount;
        if (maxUsageCount !== undefined) discount.maxUsageCount = maxUsageCount;
        if (currentUsageCount !== undefined) discount.currentUsageCount = currentUsageCount;
        if (isActive !== undefined) discount.isActive = isActive;
        if (description !== undefined) discount.description = description;

        await discount.save();

        res.status(200).json(discount);
    } catch (error) {
        console.error('Error updating discount:', error);
        res.status(500).json({ message: 'Failed to update discount', error: error.message });
    }
};

// Delete a discount
export const deleteDiscount = async (req, res) => {
    try {
        const discount = await Discount.findByIdAndDelete(req.params.id);

        if (!discount) {
            return res.status(404).json({ message: 'Discount not found' });
        }

        res.status(200).json({ message: 'Discount deleted successfully' });
    } catch (error) {
        console.error('Error deleting discount:', error);
        res.status(500).json({ message: 'Failed to delete discount', error: error.message });
    }
};

// Validate a discount code
export const validateDiscountCode = async (req, res) => {
    try {
        const { code, courseId, feeStructureId, amount } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Discount code is required' });
        }

        const discount = await Discount.findOne({ code, isActive: true });

        if (!discount) {
            return res.status(404).json({ message: 'Invalid discount code' });
        }

        // Check if discount is expired
        if (discount.endDate && new Date() > discount.endDate) {
            return res.status(400).json({ message: 'Discount code has expired' });
        }

        // Check if discount has reached max usage
        if (discount.maxUsageCount && discount.currentUsageCount >= discount.maxUsageCount) {
            return res.status(400).json({ message: 'Discount code usage limit reached' });
        }

        // Check if minimum purchase amount is met
        if (amount && discount.minPurchaseAmount > amount) {
            return res.status(400).json({
                message: `Minimum purchase amount of ${discount.minPurchaseAmount} required for this discount`
            });
        }

        // Check if discount is applicable to the course
        if (courseId && discount.applicableCourses && discount.applicableCourses.length > 0) {
            const courseObjectId = mongoose.Types.ObjectId(courseId);
            if (!discount.applicableCourses.some(id => id.equals(courseObjectId))) {
                return res.status(400).json({ message: 'Discount not applicable to this course' });
            }
        }

        // Check if discount is applicable to the fee structure
        if (feeStructureId && discount.applicableFeeStructures && discount.applicableFeeStructures.length > 0) {
            const feeStructureObjectId = mongoose.Types.ObjectId(feeStructureId);
            if (!discount.applicableFeeStructures.some(id => id.equals(feeStructureObjectId))) {
                return res.status(400).json({ message: 'Discount not applicable to this fee structure' });
            }
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (amount) {
            discountAmount = discount.calculateDiscount(amount);
        }

        res.status(200).json({
            valid: true,
            discount,
            discountAmount,
            finalAmount: amount ? amount - discountAmount : null
        });
    } catch (error) {
        console.error('Error validating discount code:', error);
        res.status(500).json({ message: 'Failed to validate discount code', error: error.message });
    }
};

// Apply discount (increment usage count)
export const applyDiscount = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Discount code is required' });
        }

        const discount = await Discount.findOne({ code, isActive: true });

        if (!discount) {
            return res.status(404).json({ message: 'Invalid discount code' });
        }

        // Increment usage count
        discount.currentUsageCount += 1;
        await discount.save();

        res.status(200).json({
            message: 'Discount applied successfully',
            discount
        });
    } catch (error) {
        console.error('Error applying discount:', error);
        res.status(500).json({ message: 'Failed to apply discount', error: error.message });
    }
};

// Get available discounts for a specific course or fee structure
export const getAvailableDiscounts = async (req, res) => {
    try {
        const { courseId, feeStructureId } = req.query;

        let query = { isActive: true };

        // Add date range condition
        const now = new Date();
        query.$and = [
            { startDate: { $lte: now } },
            {
                $or: [
                    { endDate: { $exists: false } },
                    { endDate: null },
                    { endDate: { $gt: now } }
                ]
            }
        ];

        // Add usage count condition
        query.$and.push({
            $or: [
                { maxUsageCount: { $exists: false } },
                { maxUsageCount: null },
                { $expr: { $lt: ['$currentUsageCount', '$maxUsageCount'] } }
            ]
        });

        // Course-specific or general discounts
        if (courseId) {
            query.$and.push({
                $or: [
                    { applicableCourses: { $exists: false } },
                    { applicableCourses: { $size: 0 } },
                    { applicableCourses: mongoose.Types.ObjectId(courseId) }
                ]
            });
        }

        // Fee structure-specific or general discounts
        if (feeStructureId) {
            query.$and.push({
                $or: [
                    { applicableFeeStructures: { $exists: false } },
                    { applicableFeeStructures: { $size: 0 } },
                    { applicableFeeStructures: mongoose.Types.ObjectId(feeStructureId) }
                ]
            });
        }

        const discounts = await Discount.find(query)
            .populate('applicableCourses', 'name')
            .populate('applicableFeeStructures', 'name');

        res.status(200).json(discounts);
    } catch (error) {
        console.error('Error fetching available discounts:', error);
        res.status(500).json({ message: 'Failed to fetch available discounts', error: error.message });
    }
}; 