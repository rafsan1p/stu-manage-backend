const Batch = require('../models/Batch');
const StudentBatch = require('../models/StudentBatch');

const CLASS_9_12 = ['Class 9', 'Class 10', 'Class 11', 'Class 12'];
const VALID_STREAMS = ['Science', 'Arts', 'Commerce'];

function validateBatchData(data) {
    const { classLevel, stream } = data;
    if (CLASS_9_12.includes(classLevel)) {
        if (!VALID_STREAMS.includes(stream)) {
            const err = new Error(`Stream must be Science, Arts, or Commerce for ${classLevel}`);
            err.status = 422;
            throw err;
        }
    } else {
        // Force null for Class 1-8 and Admission
        data.stream = null;
    }
    return data;
}

async function createBatch(data) {
    validateBatchData(data);
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

module.exports = { createBatch, enrollStudent, removeStudent, getStudentsInBatch, validateBatchData };
