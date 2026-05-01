const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { bulkUpsertAttendance, getAttendanceSummary, generateMonthlyReport } = require('../services/attendanceService');
const { sendAbsenceSMS } = require('../services/smsService');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Bulk upsert attendance (teacher + admin)
router.post('/', verifyToken, requireRole('admin', 'teacher'), async (req, res, next) => {
    try {
        const records = req.body; // [{ studentId, batchId, date, status }]
        const absentIds = await bulkUpsertAttendance(records);

        // Send SMS for absent students (non-blocking)
        const batchName = req.body[0]?.batchName || 'ব্যাচ';
        const date = req.body[0]?.date || new Date().toISOString().split('T')[0];
        absentIds.forEach(sid => sendAbsenceSMS(sid, batchName, date, req.user.dbId).catch(console.error));

        res.json({ message: 'Attendance saved', absentCount: absentIds.length });
    } catch (err) { next(err); }
});

// Get attendance for batch on date
router.get('/batch/:batchId/date/:date', verifyToken, async (req, res, next) => {
    try {
        const records = await Attendance.find({ batchId: req.params.batchId, date: req.params.date })
            .populate('studentId', 'name studentId photoURL guardianPhone');
        res.json(records);
    } catch (err) { next(err); }
});

// Get attendance for batch (date range)
router.get('/batch/:batchId', verifyToken, async (req, res, next) => {
    try {
        const filter = { batchId: req.params.batchId };
        if (req.query.startDate || req.query.endDate) {
            filter.date = {};
            if (req.query.startDate) filter.date.$gte = req.query.startDate;
            if (req.query.endDate) filter.date.$lte = req.query.endDate;
        }
        const records = await Attendance.find(filter)
            .populate('studentId', 'name studentId')
            .sort({ date: -1 });
        res.json(records);
    } catch (err) { next(err); }
});

// Get attendance for student
router.get('/student/:studentId', verifyToken, async (req, res, next) => {
    try {
        const records = await Attendance.find({ studentId: req.params.studentId })
            .populate('batchId', 'name classLevel stream')
            .sort({ date: -1 });
        res.json(records);
    } catch (err) { next(err); }
});

// Get attendance summary for student
router.get('/student/:studentId/summary', verifyToken, async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const summary = await getAttendanceSummary(req.params.studentId, startDate, endDate);
        res.json(summary);
    } catch (err) { next(err); }
});

// Mark SMS sent
router.patch('/:id/sms', verifyToken, requireRole('admin', 'teacher'), async (req, res, next) => {
    try {
        const record = await Attendance.findByIdAndUpdate(req.params.id, { smsSent: true }, { new: true });
        res.json(record);
    } catch (err) { next(err); }
});

// Monthly report
router.get('/report/batch/:batchId/month/:month', verifyToken, async (req, res, next) => {
    try {
        const report = await generateMonthlyReport(req.params.batchId, req.params.month);
        res.json(report);
    } catch (err) { next(err); }
});

module.exports = router;
