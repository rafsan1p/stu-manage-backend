const express = require('express');
const router = express.Router();
const MessageLog = require('../models/MessageLog');
const User = require('../models/User');
const StudentBatch = require('../models/StudentBatch');
const { sendSMS, sendEmail } = require('../services/smsService');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Send SMS (admin)
router.post('/sms', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { to, message, batchId } = req.body;

        if (batchId) {
            // Batch SMS — send to all guardian phones in batch
            const enrollments = await StudentBatch.find({ batchId, isActive: true })
                .populate('studentId', 'guardianPhone name');
            const results = [];
            for (const e of enrollments) {
                if (e.studentId?.guardianPhone) {
                    const r = await sendSMS(e.studentId.guardianPhone, message, req.user.dbId, e.studentId._id);
                    results.push(r);
                }
            }
            return res.json({ sent: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length });
        }

        if (!to) return res.status(422).json({ error: 'to or batchId is required' });
        const result = await sendSMS(to, message, req.user.dbId);
        res.json(result);
    } catch (err) { next(err); }
});

// Send email (admin)
router.post('/email', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { to, subject, body } = req.body;
        if (!to || !subject || !body) return res.status(422).json({ error: 'to, subject, and body are required' });
        const result = await sendEmail(to, subject, body, req.user.dbId);
        res.json(result);
    } catch (err) { next(err); }
});

// Message history (admin)
router.get('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const logs = await MessageLog.find()
            .populate('sentBy', 'name')
            .populate('relatedStudentId', 'name studentId')
            .sort({ sentAt: -1 })
            .limit(200);
        res.json(logs);
    } catch (err) { next(err); }
});

module.exports = router;
