const mongoose = require('mongoose');

const studentBatchSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    enrolledAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
});

studentBatchSchema.index({ studentId: 1, batchId: 1 }, { unique: true });

module.exports = mongoose.model('StudentBatch', studentBatchSchema);
