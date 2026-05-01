const express = require('express');
const router = express.Router();
const StudyMaterial = require('../models/StudyMaterial');
const StudentBatch = require('../models/StudentBatch');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB

// Upload material (teacher + admin)
router.post('/', verifyToken, requireRole('admin', 'teacher'), async (req, res, next) => {
    try {
        const { title, description, type, fileUrl, batchIds } = req.body;
        if (!title || !type || !fileUrl) {
            return res.status(422).json({ error: 'title, type, and fileUrl are required' });
        }
        const material = await StudyMaterial.create({
            title, description, type, fileUrl,
            batchIds: batchIds || [],
            uploadedBy: req.user.dbId,
        });
        res.status(201).json(material);
    } catch (err) { next(err); }
});

// List all materials (admin + teacher)
router.get('/', verifyToken, requireRole('admin', 'teacher'), async (req, res, next) => {
    try {
        const materials = await StudyMaterial.find()
            .populate('batchIds', 'name classLevel stream')
            .populate('uploadedBy', 'name')
            .sort({ uploadedAt: -1 });
        res.json(materials);
    } catch (err) { next(err); }
});

// Materials for a batch (all authenticated)
router.get('/batch/:batchId', verifyToken, async (req, res, next) => {
    try {
        const materials = await StudyMaterial.find({ batchIds: req.params.batchId })
            .populate('uploadedBy', 'name')
            .sort({ uploadedAt: -1 });
        res.json(materials);
    } catch (err) { next(err); }
});

// Materials for student (only their enrolled batches)
router.get('/my', verifyToken, requireRole('student'), async (req, res, next) => {
    try {
        const enrollments = await StudentBatch.find({ studentId: req.user.dbId, isActive: true }).lean();
        const batchIds = enrollments.map(e => e.batchId);
        const materials = await StudyMaterial.find({ batchIds: { $in: batchIds } })
            .populate('batchIds', 'name classLevel stream')
            .populate('uploadedBy', 'name')
            .sort({ uploadedAt: -1 });
        res.json(materials);
    } catch (err) { next(err); }
});

// Delete material (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        await StudyMaterial.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
