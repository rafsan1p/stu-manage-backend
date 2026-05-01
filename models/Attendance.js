const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    status: { type: String, enum: ['present', 'absent'], required: true },
    smsSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Compound index to prevent duplicate records
attendanceSchema.index({ studentId: 1, batchId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
