const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const AdmissionRequest = require('../models/AdmissionRequest');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const StudyMaterial = require('../models/StudyMaterial');
const StudentBatch = require('../models/StudentBatch');
const verifyToken = require('../middleware/verifyToken');
const requireRole = require('../middleware/requireRole');

// Admin dashboard
router.get('/admin', verifyToken, requireRole('admin'), async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().toISOString().slice(0, 7);

        const [totalStudents, totalTeachers, totalBatches, todayAttendance, recentAdmissions, overdueFees, visitorStats] = await Promise.all([
            User.countDocuments({ role: 'student', isActive: true, isApproved: true }),
            User.countDocuments({ role: 'teacher', isActive: true }),
            Batch.countDocuments({ isActive: true }),
            Attendance.countDocuments({ date: today, status: 'present' }),
            AdmissionRequest.find().sort({ submittedAt: -1 }).limit(5),
            Fee.find({ status: 'unpaid', createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
                .populate('studentId', 'name studentId').populate('batchId', 'name').limit(20),
            (async () => {
                const Visitor = require('mongoose').models.Visitor;
                if (!Visitor) return { today: 0, total: 0 };
                const todayDoc = await Visitor.findOne({ date: today });
                const totalResult = await Visitor.aggregate([{ $group: { _id: null, total: { $sum: '$count' } } }]);
                return { today: todayDoc?.count || 0, total: totalResult[0]?.total || 0 };
            })(),
        ]);

        // Income chart — last 6 months
        const incomeChart = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const month = d.toISOString().slice(0, 7);
            const fees = await Fee.find({ month }).lean();
            incomeChart.push({
                month,
                collected: fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
                due: fees.filter(f => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0),
            });
        }

        // Monthly fee summary
        const monthFees = await Fee.find({ month: currentMonth }).lean();
        const monthlyIncome = {
            collected: monthFees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0),
            due: monthFees.filter(f => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0),
        };

        res.json({ totalStudents, totalTeachers, totalBatches, todayAttendance, recentAdmissions, overdueFees, incomeChart, monthlyIncome, visitorStats });
    } catch (err) { next(err); }
});

// Teacher dashboard
router.get('/teacher', verifyToken, requireRole('admin', 'teacher'), async (req, res, next) => {
    try {
        const teacherId = req.user.dbId;
        const batches = await Batch.find({ teacherId, isActive: true });
        const batchIds = batches.map(b => b._id);
        const totalStudents = await StudentBatch.countDocuments({ batchId: { $in: batchIds }, isActive: true });
        res.json({ batches, totalStudents });
    } catch (err) { next(err); }
});

// Student dashboard
router.get('/student', verifyToken, requireRole('student'), async (req, res, next) => {
    try {
        const studentId = req.user.dbId;
        const currentMonth = new Date().toISOString().slice(0, 7);
        const today = new Date();
        const sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const enrollments = await StudentBatch.find({ studentId, isActive: true }).lean();
        const batchIds = enrollments.map(e => e.batchId);

        const [attendanceSummary, currentFees, recentResults, upcomingExams, recentMaterials] = await Promise.all([
            Attendance.find({ studentId, date: { $gte: `${currentMonth}-01` } }).lean(),
            Fee.find({ studentId, month: currentMonth }).populate('batchId', 'name'),
            Result.find({ studentId }).populate('examId', 'title scheduledAt totalMarks').sort({ submittedAt: -1 }).limit(5),
            Exam.find({ batchId: { $in: batchIds }, isPublished: true, scheduledAt: { $gte: today, $lte: sevenDays } })
                .populate('batchId', 'name classLevel stream').sort({ scheduledAt: 1 }),
            StudyMaterial.find({ batchIds: { $in: batchIds } })
                .populate('batchIds', 'name classLevel stream').sort({ uploadedAt: -1 }).limit(5),
        ]);

        const present = attendanceSummary.filter(a => a.status === 'present').length;
        const total = attendanceSummary.length;
        const attendancePercent = total > 0 ? Math.round((present / total) * 100) : 0;

        res.json({ attendancePercent, currentFees, recentResults, upcomingExams, recentMaterials });
    } catch (err) { next(err); }
});

module.exports = router;
