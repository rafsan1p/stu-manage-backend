const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const { createBatch, enrollStudent, removeStudent, getStudentsInBatch } = require('../services/batchService');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// One-time utility: assign admin as teacher to all batches that have no teacher
router.patch('/assign-admin-teacher', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const result = await Batch.updateMany(
            { teacherId: { $in: [null, undefined] } },
            { $set: { teacherId: req.user.dbId } }
        );
        // Also update batches that have teacherId set to something else (optional: update all)
        const resultAll = await Batch.updateMany(
            {},
            { $set: { teacherId: req.user.dbId } }
        );
        res.json({ message: `${resultAll.modifiedCount} batch updated`, adminId: req.user.dbId });
    } catch (err) { next(err); }
});

// List batches — admin sees all, teacher sees assigned
router.get('/', verifyToken, async (req, res, next) => {
    try {
        let filter = {};
        if (req.user.role === 'teacher') filter.teacherId = req.user.dbId;
        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
        const batches = await Batch.find(filter).populate('teacherId', 'name email').sort({ classLevel: 1, name: 1 });
        res.json(batches);
    } catch (err) { next(err); }
});

// Create batch (admin) — auto-assigns admin as teacher
router.post('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        // Auto-assign the admin as teacher
        const data = { ...req.body, teacherId: req.user.dbId };
        const batch = await createBatch(data);
        res.status(201).json(batch);
    } catch (err) { next(err); }
});

// Get batch detail with students
router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        const batch = await Batch.findById(req.params.id).populate('teacherId', 'name email');
        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        const students = await getStudentsInBatch(req.params.id);
        res.json({ ...batch.toObject(), students });
    } catch (err) { next(err); }
});

// Update batch (admin)
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json(batch);
    } catch (err) { next(err); }
});

// Deactivate batch (admin)
router.patch('/:id/deactivate', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const batch = await Batch.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        res.json(batch);
    } catch (err) { next(err); }
});

// Enroll student(s) into batch (admin)
router.post('/:id/enroll', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { studentId } = req.body;
        const result = await enrollStudent(req.params.id, studentId);
        res.status(200).json(result);
    } catch (err) { 
        next(err); 
    }
});

// Transfer student from one batch to another (admin)
// Carries over any paid fees for current month to new batch
router.post('/:id/transfer', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { studentId, targetBatchId } = req.body;
        if (!studentId || !targetBatchId) {
            return res.status(400).json({ error: 'studentId and targetBatchId are required' });
        }

        const Fee = require('../models/Fee');
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Remove from current batch
        await removeStudent(req.params.id, studentId);

        // Enroll in new batch
        await enrollStudent(targetBatchId, studentId);

        // If student already paid this month in old batch, mark new batch fee as paid too
        const oldFee = await Fee.findOne({
            studentId,
            batchId: req.params.id,
            month: currentMonth,
            status: 'paid',
        });

        if (oldFee) {
            // Delete old batch fee record — student is now in new batch
            await Fee.findByIdAndDelete(oldFee._id);

            // Check if fee record exists for new batch this month
            const newFee = await Fee.findOne({ studentId, batchId: targetBatchId, month: currentMonth });
            if (newFee) {
                // Mark as paid (transferred)
                await Fee.findByIdAndUpdate(newFee._id, {
                    status: 'paid',
                    paidAt: oldFee.paidAt,
                    paymentNote: 'Batch transfer — fee carried over',
                    receiptNumber: oldFee.receiptNumber,
                });
            } else {
                // Create a paid fee record for new batch
                const newBatch = await Batch.findById(targetBatchId);
                await Fee.create({
                    studentId,
                    batchId: targetBatchId,
                    month: currentMonth,
                    amount: newBatch?.monthlyFee || oldFee.amount,
                    status: 'paid',
                    paidAt: oldFee.paidAt,
                    paymentNote: 'Batch transfer — fee carried over',
                    receiptNumber: oldFee.receiptNumber,
                });
            }
        }

        res.json({ success: true, message: 'Student transferred successfully' });
    } catch (err) { next(err); }
});

// Remove student from batch (admin)
router.delete('/:id/enroll/:studentId', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const result = await removeStudent(req.params.id, req.params.studentId);
        res.json(result);
    } catch (err) { next(err); }
});

// List students in batch
router.get('/:id/students', verifyToken, async (req, res, next) => {
    try {
        const students = await getStudentsInBatch(req.params.id);
        res.json(students);
    } catch (err) { next(err); }
});

module.exports = router;
