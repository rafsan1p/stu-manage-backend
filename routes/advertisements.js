const express = require('express');
const router = express.Router();
const BatchAdvertisement = require('../models/BatchAdvertisement');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Get all active advertisements (for public)
router.get('/', async (req, res, next) => {
    try {
        const now = new Date();
        const ads = await BatchAdvertisement.find({ 
            isActive: true, 
            startDate: { $gte: now } 
        }).sort({ startDate: 1 });
        res.json(ads);
    } catch (err) { next(err); }
});

// Get all advertisements (admin)
router.get('/all', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const ads = await BatchAdvertisement.find().sort({ startDate: -1 });
        res.json(ads);
    } catch (err) { next(err); }
});

// Create advertisement (admin)
router.post('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const ad = await BatchAdvertisement.create(req.body);
        res.status(201).json(ad);
    } catch (err) { next(err); }
});

// Update advertisement (admin)
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const ad = await BatchAdvertisement.findByIdAndUpdate(
            req.params.id,
            req.body,
            { returnDocument: 'after' }
        );
        res.json(ad);
    } catch (err) { next(err); }
});

// Delete advertisement (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        await BatchAdvertisement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Advertisement deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
