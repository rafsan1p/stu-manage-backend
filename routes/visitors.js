const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

const visitorSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
});

const Visitor = mongoose.models.Visitor || mongoose.model('Visitor', visitorSchema);

router.post('/track', async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        await Visitor.findOneAndUpdate({ date: today }, { $inc: { count: 1 } }, { upsert: true });
        res.json({ success: true });
    } catch (err) { next(err); }
});

router.get('/stats', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const todayDoc = await Visitor.findOne({ date: today });
        const totalResult = await Visitor.aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }]);
        res.json({
            today: todayDoc?.count || 0,
            total: totalResult[0]?.total || 0,
        });
    } catch (err) { next(err); }
});

module.exports = router;
