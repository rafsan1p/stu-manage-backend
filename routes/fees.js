const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const { generateMonthlyFees, recordPayment, getMonthlySummary } = require('../services/feeService');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Create fee record (admin)
router.post('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const fee = await Fee.create(req.body);
        res.status(201).json(fee);
    } catch (err) { next(err); }
});

// Auto-generate monthly fees (admin)
router.post('/generate-monthly', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const month = req.body.month || new Date().toISOString().slice(0, 7);
        const result = await generateMonthlyFees(month);
        res.json(result);
    } catch (err) { next(err); }
});

// Monthly income summary (admin)
router.get('/summary/:month', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const summary = await getMonthlySummary(req.params.month);
        res.json(summary);
    } catch (err) { next(err); }
});

// Due list — unpaid current month (admin)
router.get('/due', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const month = req.query.month || new Date().toISOString().slice(0, 7);
        const filter = { status: 'unpaid', month };
        if (req.query.batchId) filter.batchId = req.query.batchId;
        const fees = await Fee.find(filter)
            .populate('studentId', 'name studentId phone guardianPhone')
            .populate('batchId', 'name classLevel stream');
        res.json(fees);
    } catch (err) { next(err); }
});

// Overdue list — unpaid > 30 days (admin)
router.get('/overdue', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const fees = await Fee.find({ status: 'unpaid', createdAt: { $lt: thirtyDaysAgo } })
            .populate('studentId', 'name studentId phone')
            .populate('batchId', 'name classLevel stream');
        res.json(fees);
    } catch (err) { next(err); }
});

// All fees (admin) — filterable
router.get('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.month) filter.month = req.query.month;
        if (req.query.batchId) filter.batchId = req.query.batchId;
        if (req.query.status) filter.status = req.query.status;
        const fees = await Fee.find(filter)
            .populate('studentId', 'name studentId')
            .populate('batchId', 'name classLevel stream')
            .sort({ createdAt: -1 });
        res.json(fees);
    } catch (err) { next(err); }
});

// Fee history for student
router.get('/student/:studentId', verifyToken, async (req, res, next) => {
    try {
        const fees = await Fee.find({ studentId: req.params.studentId })
            .populate('batchId', 'name classLevel stream')
            .sort({ month: -1 });
        res.json(fees);
    } catch (err) { next(err); }
});

// Record payment (admin)
router.patch('/:id/pay', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { amount, note } = req.body;
        const fee = await recordPayment(req.params.id, amount, note);
        res.json(fee);
    } catch (err) { next(err); }
});

// Delete fee record (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        await Fee.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
});

// Update fee record (admin)
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(fee);
    } catch (err) { next(err); }
});

module.exports = router;
