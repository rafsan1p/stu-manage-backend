const express = require('express');
const router = express.Router();
const AdmissionRequest = require('../models/AdmissionRequest');
const User = require('../models/User');
const Batch = require('../models/Batch');
const generateStudentId = require('../utils/generateStudentId');
const { enrollStudent } = require('../services/batchService');
const { sendSMS } = require('../services/smsService');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Submit admission form — requires login
router.post('/', verifyToken, async (req, res, next) => {
    try {
        const data = req.body;
        data.submittedByEmail = req.user.email;
        const existingAdmission = await AdmissionRequest.findOne({
            guardianPhone: data.guardianPhone,
            status: 'pending'
        });
        data.isDuplicate = !!existingAdmission;
        const admission = await AdmissionRequest.create(data);
        res.status(201).json({ message: 'Admission request submitted successfully', id: admission._id });
    } catch (err) { next(err); }
});

// List admission requests (admin)
router.get('/', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        const admissions = await AdmissionRequest.find(filter).sort({ submittedAt: -1 });
        res.json(admissions);
    } catch (err) { next(err); }
});

// Get single admission request (admin)
router.get('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const admission = await AdmissionRequest.findById(req.params.id);
        if (!admission) return res.status(404).json({ error: 'Not found' });
        res.json(admission);
    } catch (err) { next(err); }
});

// Approve admission (admin)
router.patch('/:id/approve', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { batchId } = req.body;
        if (!batchId) return res.status(400).json({ error: 'Batch ID is required' });

        const admission = await AdmissionRequest.findById(req.params.id);
        if (!admission) return res.status(404).json({ error: 'Not found' });
        if (admission.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

        const studentId = await generateStudentId();

        // Get the selected batch
        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        if (!batch.isActive) return res.status(400).json({ error: 'Batch is not active' });

        // Find existing Firebase user by email (if they registered)
        let studentUser = await User.findOne({ email: admission.submittedByEmail });

        if (studentUser) {
            // Update existing user to student role with full info
            studentUser = await User.findByIdAndUpdate(studentUser._id, {
                name: admission.studentName,
                role: 'student',
                isApproved: true,
                studentId,
                guardianName: admission.guardianName,
                guardianPhone: admission.guardianPhone,
                guardianEmail: admission.guardianEmail,
                guardianRelationship: admission.guardianRelationship,
                address: admission.address,
                institution: admission.institution,
                gender: admission.gender,
                dateOfBirth: admission.dateOfBirth,
                phone: admission.guardianPhone,
            }, { new: true });
        } else {
            // Create new user record
            studentUser = await User.create({
                name: admission.studentName,
                email: admission.submittedByEmail || `${studentId.toLowerCase()}@gic.local`,
                role: 'student',
                isApproved: true,
                studentId,
                guardianName: admission.guardianName,
                guardianPhone: admission.guardianPhone,
                guardianEmail: admission.guardianEmail,
                guardianRelationship: admission.guardianRelationship,
                address: admission.address,
                institution: admission.institution,
                gender: admission.gender,
                dateOfBirth: admission.dateOfBirth,
                phone: admission.guardianPhone,
            });
        }

        // Enroll student in batch
        try {
            await enrollStudent(batch._id.toString(), studentUser._id.toString());
        } catch (enrollErr) {
            // Already enrolled — ignore
            console.log('Enroll note:', enrollErr.message);
        }

        // Update admission record
        admission.status = 'approved';
        admission.reviewedBy = req.user.dbId;
        admission.reviewedAt = new Date();
        admission.createdStudentId = studentUser._id;
        await admission.save();

        // Send welcome SMS
        const welcomeMsg = `স্বাগতম! ${admission.studentName} Genuine ICT Care-এ ভর্তি হয়েছে। Student ID: ${studentId}, Batch: ${batchName}। ধন্যবাদ।`;
        sendSMS(admission.guardianPhone, welcomeMsg, req.user.dbId, studentUser._id).catch(console.error);

        res.json({ message: 'Approved', student: studentUser, batch, admission });
    } catch (err) { next(err); }
});

// Reject admission (admin)
router.patch('/:id/reject', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const admission = await AdmissionRequest.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected', reviewedBy: req.user.dbId, reviewedAt: new Date() },
            { returnDocument: 'after' }
        );
        res.json(admission);
    } catch (err) { next(err); }
});

module.exports = router;
