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
    deleted: { type: Boolean, default: false }, // for soft-deleting local images
    addedAt: { type: Date, default: Date.now },
    name: { type: String, default: '' },
}, { timestamps: true });

const Gallery = mongoose.models.Gallery || mongoose.model('Gallery', gallerySchema);

// GET all gallery images — public
router.get('/', async (req, res, next) => {
    try {
        const dbImages = await Gallery.find().sort({ addedAt: -1 }).lean();

        // Always include default local images (s1-s32) at the end
        const defaults = Array.from({ length: 32 }, (_, i) => ({
            id: `s${i + 1}`,
            url: `/students/s${i + 1}.jpg`,
            isLocal: true,
            addedAt: new Date(2024, 0, i + 1).toISOString(),
        }));

        // Merge: uploaded images first (newest), then local defaults
        // Remove any local defaults that were manually deleted from DB
        const deletedLocalIds = new Set(
            (await Gallery.find({ id: /^s\d+$/, deleted: true }).lean()).map(d => d.id)
        );

        const localImages = defaults.filter(d => !deletedLocalIds.has(d.id));

        res.json([...dbImages, ...localImages]);
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
        const id = req.params.id;
        // Check if it's a local image (s1-s32)
        if (/^s\d+$/.test(id)) {
            // Soft delete — mark as deleted so it won't show in GET
            await Gallery.findOneAndUpdate(
                { id },
                { id, url: `/students/${id}.jpg`, isLocal: true, deleted: true },
                { upsert: true, new: true }
            );
        } else {
            await Gallery.findOneAndDelete({ id });
        }
        res.json({ success: true });
    } catch (err) { next(err); }
});

module.exports = router;
