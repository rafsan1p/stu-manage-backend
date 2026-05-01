const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const StudentBatch = require('../models/StudentBatch');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Create announcement (admin)
router.post('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const ann = await Announcement.create({ ...req.body, createdBy: req.user.dbId });
        res.status(201).json(ann);
    } catch (err) { next(err); }
});

// Get active announcements for user's context
router.get('/', verifyToken, async (req, res, next) => {
    try {
        const now = new Date();
        let batchIds = [];

        if (req.user.role === 'student' && req.user.dbId) {
            const mongoose = require('mongoose');
            const studentObjectId = new mongoose.Types.ObjectId(req.user.dbId);
            const enrollments = await StudentBatch.find({ studentId: studentObjectId, isActive: true }).lean();
            batchIds = enrollments.map(e => e.batchId);
        }

        const announcements = await Announcement.find({
            expiresAt: { $gt: now },
            $or: [
                { targetType: 'all' },
                { targetType: 'batch', targetBatchId: { $in: batchIds } }
            ]
        }).sort({ createdAt: -1 });

        res.json(announcements);
    } catch (err) { next(err); }
});

// Update announcement (admin)
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const ann = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(ann);
    } catch (err) { next(err); }
});

// Delete announcement (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
