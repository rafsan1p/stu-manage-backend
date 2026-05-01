const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const { submitMCQExam, getExamResults } = require('../services/examService');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Submit MCQ exam (student)
router.post('/submit', verifyToken, requireRole('student'), async (req, res, next) => {
    try {
        const { examId, answers } = req.body;
        const result = await submitMCQExam(examId, req.user.dbId, answers);
        res.json(result);
    } catch (err) { next(err); }
});

// Enter written result (admin + teacher)
router.post('/written', verifyToken, requireRole('admin', 'teacher'), async (req, res, next) => {
    try {
        const { studentId, examId, batchId, score, totalMarks, subject } = req.body;
        const result = await Result.create({
            studentId, examId, batchId, score, totalMarks, subject,
            enteredBy: req.user.dbId,
        });
        res.status(201).json(result);
    } catch (err) { next(err); }
});

// All results for an exam (with ranks)
router.get('/exam/:examId', verifyToken, async (req, res, next) => {
    try {
        const results = await getExamResults(req.params.examId);
        res.json(results);
    } catch (err) { next(err); }
});

// All results for a student
router.get('/student/:studentId', verifyToken, async (req, res, next) => {
    try {
        const results = await Result.find({ studentId: req.params.studentId })
            .populate('examId', 'title scheduledAt totalMarks type')
            .populate('batchId', 'name classLevel stream')
            .sort({ submittedAt: -1 });
        res.json(results);
    } catch (err) { next(err); }
});

// Recent 5 results for student
router.get('/student/:studentId/recent', verifyToken, async (req, res, next) => {
    try {
        const results = await Result.find({ studentId: req.params.studentId })
            .populate('examId', 'title scheduledAt totalMarks')
            .sort({ submittedAt: -1 })
            .limit(5);
        res.json(results);
    } catch (err) { next(err); }
});

module.exports = router;
