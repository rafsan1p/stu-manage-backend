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

        // Check if already has a PENDING submission (not rejected/approved)
        const alreadySubmitted = await AdmissionRequest.findOne({
            submittedByEmail: req.user.email,
            status: 'pending'
        });
        if (alreadySubmitted) {
            return res.status(409).json({ error: 'আপনি ইতিমধ্যে ভর্তি আবেদন করেছেন এবং এটি এখনো pending আছে' });
        }

        const existingAdmission = await AdmissionRequest.findOne({
            guardianPhone: data.guardianPhone,
            status: 'pending'
        });
        data.isDuplicate = !!existingAdmission;
        const admission = await AdmissionRequest.create(data);

        // Mark user as having submitted admission
        await User.findOneAndUpdate(
            { email: req.user.email },
            { hasSubmittedAdmission: true }
        );

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

        // Send welcome SMS (non-blocking, don't let it crash the response)
        const welcomeMsg = `স্বাগতম! ${admission.studentName} Genuine ICT Care-এ ভর্তি হয়েছে। Student ID: ${studentId}, Batch: ${batch.name}। ধন্যবাদ।`;
        sendSMS(admission.guardianPhone, welcomeMsg, req.user.dbId, studentUser._id).catch(() => {});

        res.json({ message: 'Approved', student: studentUser, batch, admission });
    } catch (err) { next(err); }
});

const crypto = require('crypto');

function generatePassword() {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';
    const all = upper + lower + digits + special;
    let pwd = upper[Math.floor(Math.random() * upper.length)]
        + lower[Math.floor(Math.random() * lower.length)]
        + digits[Math.floor(Math.random() * digits.length)]
        + special[Math.floor(Math.random() * special.length)];
    for (let i = 4; i < 8; i++) pwd += all[Math.floor(Math.random() * all.length)];
    return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

router.post('/admin-enroll', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const { batchId, studentEmail, studentName, photoUrl, ...admissionData } = req.body;
        if (!batchId) return res.status(400).json({ error: 'batchId required' });
        if (!studentEmail) return res.status(400).json({ error: 'studentEmail required' });

        const batch = await Batch.findById(batchId);
        if (!batch || !batch.isActive) return res.status(400).json({ error: 'Batch not found or inactive' });
        if (batch.enrolledCount >= batch.maxCapacity) return res.status(409).json({ error: 'Batch is full' });

        const studentId = await generateStudentId();
        const password = generatePassword();

        let studentUser = await User.findOne({ email: studentEmail });
        if (!studentUser) {
            studentUser = await User.create({
                name: admissionData.studentName || studentName,
                email: studentEmail,
                role: 'student',
                isApproved: true,
                studentId,
                hasSubmittedAdmission: true,
                photoURL: photoUrl || '',
                phone: admissionData.studentPhone || admissionData.guardianPhone || '',
                guardianName: admissionData.guardianName,
                guardianPhone: admissionData.guardianPhone,
                guardianRelationship: admissionData.guardianRelationship,
                address: admissionData.address,
                institution: admissionData.institution,
                gender: admissionData.gender,
                dateOfBirth: admissionData.dateOfBirth || null,
            });
        } else {
            studentUser = await User.findByIdAndUpdate(studentUser._id, {
                name: admissionData.studentName || studentName,
                role: 'student',
                isApproved: true,
                studentId,
                hasSubmittedAdmission: true,
                photoURL: photoUrl || studentUser.photoURL,
            }, { new: true });
        }

        await enrollStudent(batchId, studentUser._id.toString());

        const admission = await AdmissionRequest.create({
            ...admissionData,
            studentName: admissionData.studentName || studentName,
            photoUrl: photoUrl || '',
            submittedByEmail: studentEmail,
            status: 'approved',
            reviewedBy: req.user.dbId,
            reviewedAt: new Date(),
            createdStudentId: studentUser._id,
        });

        const { sendEmail } = require('../services/smsService');
        const emailBody = `স্বাগতম ${studentUser.name}!\n\nGenuine ICT Care এ আপনার ভর্তি সম্পন্ন হয়েছে।\n\nLogin করুন:\nEmail: ${studentEmail}\nPassword: ${password}\n\nStudent ID: ${studentId}\nBatch: ${batch.name}\n\nLogin link: https://edutrack-bd.web.app/login\n\nপ্রথম login এর পর অবশ্যই password পরিবর্তন করুন।`;
        sendEmail(studentEmail, 'Genuine ICT Care — Login Credentials', emailBody, req.user.dbId, studentUser._id).catch(() => {});

        res.status(201).json({ message: 'Student enrolled successfully', student: studentUser, password });
    } catch (err) { next(err); }
});
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
