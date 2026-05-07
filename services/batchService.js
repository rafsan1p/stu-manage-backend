const Batch = require('../models/Batch');
const StudentBatch = require('../models/StudentBatch');

async function createBatch(data) {
    // Force stream to null — not needed for ICT-only platform
    data.stream = null;

    // Check for duplicate batch
    const existing = await Batch.findOne({
        name: data.name,
        classLevel: data.classLevel,
    });

    if (existing) {
        const err = new Error('এই নাম ও ক্লাস দিয়ে ইতিমধ্যে একটি ব্যাচ আছে');
        err.status = 409;
        throw err;
    }

    return Batch.create(data);
}

async function enrollStudent(batchId, studentId) {
    const batch = await Batch.findById(batchId);
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });
    if (!batch.isActive) throw Object.assign(new Error('Batch is deactivated'), { status: 400 });
    if (batch.enrolledCount >= batch.maxCapacity) {
        throw Object.assign(new Error(`This batch is full (max ${batch.maxCapacity} students)`), { status: 409 });
    }

    // Upsert StudentBatch
    const existing = await StudentBatch.findOne({ studentId, batchId });
    if (existing) {
        if (existing.isActive) throw Object.assign(new Error('Student already enrolled'), { status: 409 });
        existing.isActive = true;
        existing.enrolledAt = new Date();
        await existing.save();
    } else {
        await StudentBatch.create({ studentId, batchId });
    }

    await Batch.findByIdAndUpdate(batchId, { $inc: { enrolledCount: 1 } });
    return { success: true };
}

async function removeStudent(batchId, studentId) {
    const sb = await StudentBatch.findOne({ studentId, batchId, isActive: true });
    if (!sb) throw Object.assign(new Error('Enrollment not found'), { status: 404 });
    sb.isActive = false;
    await sb.save();
    await Batch.findByIdAndUpdate(batchId, { $inc: { enrolledCount: -1 } });
    return { success: true };
}

async function getStudentsInBatch(batchId) {
    return StudentBatch.find({ batchId, isActive: true })
        .populate('studentId', 'name email phone studentId photoURL guardianPhone isApproved')
        .lean();
}

module.exports = { createBatch, enrollStudent, removeStudent, getStudentsInBatch };
