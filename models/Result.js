const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    score: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
    answers: [{ type: Number }], // student's chosen option indices (MCQ)
    subject: { type: String, default: '' }, // for written exams
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

resultSchema.index({ studentId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
