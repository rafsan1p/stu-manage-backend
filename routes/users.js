const express = require('express');
const router = express.Router();
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Create teacher account (admin only)
router.post('/create-teacher', verifyToken, requireRole('admin'), async (req, res, next) => {
    const { name, email, phone, subjectSpecialization, address } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ error: 'এই email দিয়ে ইতিমধ্যে account আছে' });
        const user = await User.create({
            name, email, phone, subjectSpecialization, address,
            role: 'teacher', isApproved: true,
        });
        res.status(201).json(user);
    } catch (err) { next(err); }
});

// Public — upsert user after Firebase login
router.post('/', async (req, res, next) => {
    const { email, name, photoURL, phone } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ email, name, photoURL, phone });
        } else {
            const updates = {};
            if (name && !user.name) updates.name = name;
            if (photoURL && !user.photoURL) updates.photoURL = photoURL;
            if (phone && !user.phone) updates.phone = phone;
            if (Object.keys(updates).length) {
                user = await User.findOneAndUpdate({ email }, updates, { new: true });
            }
        }
        res.json(user);
    } catch (err) { next(err); }
});

// Get all users (admin) — filterable by role, isActive
router.get('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.role) filter.role = req.query.role;
        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
        const users = await User.find(filter).sort({ createdAt: -1 });
        res.json(users);
    } catch (err) { next(err); }
});

// Get user by email (admin)
router.get('/email/:email', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { next(err); }
});

// Get user by ID
router.get('/:id', verifyToken, async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { next(err); }
});

// Hard delete student — removes from DB and all related data (admin)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const StudentBatch = require('../models/StudentBatch');
        const Batch = require('../models/Batch');
        const Attendance = require('../models/Attendance');
        const Fee = require('../models/Fee');
        const Result = require('../models/Result');
        const AdmissionRequest = require('../models/AdmissionRequest');

        // Remove from all batches and update enrolledCount
        const enrollments = await StudentBatch.find({ studentId: req.params.id, isActive: true });
        for (const e of enrollments) {
            await Batch.findByIdAndUpdate(e.batchId, { $inc: { enrolledCount: -1 } });
        }
        await StudentBatch.deleteMany({ studentId: req.params.id });

        // Delete attendance records
        await Attendance.deleteMany({ studentId: req.params.id });

        // Delete fee records
        await Fee.deleteMany({ studentId: req.params.id });

        // Delete result records
        await Result.deleteMany({ studentId: req.params.id });

        // Delete admission request
        await AdmissionRequest.deleteOne({ studentId: req.params.id });

        // Delete the user
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'Student deleted successfully from all sections' });
    } catch (err) { next(err); }
});

// Update user profile (admin)
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { next(err); }
});

// Approve student + enroll in batch
router.patch('/:id/approve', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { batchId } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });

        // Enroll in selected batch if provided
        if (batchId) {
            const Batch = require('../models/Batch');
            const StudentBatch = require('../models/StudentBatch');
            const batch = await Batch.findById(batchId);
            
            if (!batch) {
                return res.status(404).json({ error: 'Batch not found' });
            }
            
            if (!batch.isActive) {
                return res.status(400).json({ error: 'Batch is not active' });
            }
            
            if (batch.enrolledCount >= batch.maxCapacity) {
                return res.status(409).json({ error: 'Batch is full' });
            }
            
            const existing = await StudentBatch.findOne({ studentId: user._id, batchId });
            if (!existing) {
                await StudentBatch.create({ studentId: user._id, batchId });
                await Batch.findByIdAndUpdate(batchId, { $inc: { enrolledCount: 1 } });
            } else if (!existing.isActive) {
                existing.isActive = true;
                existing.enrolledAt = new Date();
                await existing.save();
                await Batch.findByIdAndUpdate(batchId, { $inc: { enrolledCount: 1 } });
            }
        }

        res.status(200).json(user);
    } catch (err) { 
        next(err); 
    }
});

// Deactivate user (soft delete)
router.patch('/:id/deactivate', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        res.json(user);
    } catch (err) { next(err); }
});

// Change role
router.patch('/:id/role', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
        res.json(user);
    } catch (err) { next(err); }
});

// Make admin by email
router.patch('/make-admin/:email', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const user = await User.findOneAndUpdate(
            { email: req.params.email },
            { role: 'admin', isApproved: true },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: `${user.email} is now admin`, user });
    } catch (err) { next(err); }
});

module.exports = router;
