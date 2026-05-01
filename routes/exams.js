const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const { submitMCQExam, getExamResults } = require('../services/examService');
const StudentBatch = require('../models/StudentBatch');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Create exam (teacher + admin)
router.post('/', verifyToken, requireRole('admin', 'teacher'), async (req, res, next) => {
    try {
        const exam = await Exam.create({ ...req.body, createdBy: req.user.dbId });
        res.status(201).json(exam);
    } catch (err) { next(err); }
});

// List exams
router.get('/', verifyToken, async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.batchId) filter.batchId = req.query.batchId;
        if (req.user.role === 'student') filter.isPublished = true;
        const exams = await Exam.find(filter)
            .populate('batchId', 'name classLevel stream')
            .sort({ scheduledAt: -1 });
        res.json(exams);
    } catch (err) { next(err); }
});

// Upcoming exams for student's batches
router.get('/upcoming/student', verifyToken, async (req, res, next) => {
    try {
        const enrollments = await StudentBatch.find({ studentId: req.user.dbId, isActive: true }).lean();
        const batchIds = enrollments.map(e => e.batchId);
        const now = new Date();
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const exams = await Exam.find({
            batchId: { $in: batchIds },
            isPublished: true,
            scheduledAt: { $gte: now, $lte: sevenDays }
        }).populate('batchId', 'name classLevel stream').sort({ scheduledAt: 1 });
        res.json(exams);
    } catch (err) { next(err); }
});

// Get exam by ID (strip correctIndex for students)
router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('batchId', 'name classLevel stream');
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        if (req.user.role === 'student') {
            const safeExam = exam.toObject();
            safeExam.questions = safeExam.questions.map(({ correctIndex, ...q }) => q);
            return res.json(safeExam);
        }
        res.json(exam);
    } catch (err) { next(err); }
});

// Update exam
router.patch('/:id', verifyToken, requireRole('admin', 'teacher'), async (req, res, next) => {
    try {
        const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(exam);
    } catch (err) { next(err); }
});

// Publish/unpublish exam
router.patch('/:id/publish', verifyToken, requireRole('admin', 'teacher'), async (req, res, next) => {
    try {
        const exam = await Exam.findByIdAndUpdate(req.params.id, { isPublished: req.body.isPublished }, { new: true });
        res.json(exam);
    } catch (err) { next(err); }
});

// Delete exam (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        await Exam.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
