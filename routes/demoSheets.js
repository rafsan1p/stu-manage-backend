const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

const sheetSchema = new mongoose.Schema({
    title: { type: String, required: true },
    chapter: { type: String, default: '' },
    description: { type: String, default: '' },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
});

const DemoSheet = mongoose.models.DemoSheet || mongoose.model('DemoSheet', sheetSchema);

router.get('/', verifyToken, async (req, res, next) => {
    try {
        const sheets = await DemoSheet.find().populate('uploadedBy', 'name').sort({ uploadedAt: -1 });
        res.json(sheets);
    } catch (err) { next(err); }
});

router.post('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { title, chapter, description, fileUrl } = req.body;
        if (!title || !fileUrl) return res.status(422).json({ error: 'title and fileUrl required' });
        const sheet = await DemoSheet.create({ title, chapter, description, fileUrl, uploadedBy: req.user.dbId });
        res.status(201).json(sheet);
    } catch (err) { next(err); }
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        await DemoSheet.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
