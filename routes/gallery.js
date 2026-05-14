const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Simple in-memory + MongoDB approach using a Settings collection
const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    thumb: { type: String, default: '' },
    isLocal: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
    name: { type: String, default: '' },
}, { timestamps: true });

const Gallery = mongoose.models.Gallery || mongoose.model('Gallery', gallerySchema);

// GET all gallery images — public
router.get('/', async (req, res, next) => {
    try {
        const images = await Gallery.find().sort({ addedAt: -1 }).lean();
        
        // If no images in DB, return default local images
        if (images.length === 0) {
            const defaults = Array.from({ length: 32 }, (_, i) => ({
                id: `s${i + 1}`,
                url: `/students/s${i + 1}.jpg`,
                isLocal: true,
                addedAt: new Date(2024, 0, i + 1).toISOString(),
            }));
            return res.json(defaults);
        }
        
        res.json(images);
    } catch (err) { next(err); }
});

// POST add image — admin only
router.post('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { id, url, thumb, name } = req.body;
        if (!id || !url) return res.status(400).json({ error: 'id and url required' });
        
        const img = await Gallery.create({ id, url, thumb, name, isLocal: false });
        res.status(201).json(img);
    } catch (err) { next(err); }
});

// DELETE image — admin only
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        await Gallery.findOneAndDelete({ id: req.params.id });
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
