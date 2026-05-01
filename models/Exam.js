const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: { type: [String], validate: v => v.length === 4 },
    correctIndex: { type: Number, min: 0, max: 3, required: true },
}, { _id: true });

const examSchema = new mongoose.Schema({
    title: { type: String, required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    type: { type: String, enum: ['mcq', 'written'], default: 'mcq' },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, default: 30 },
    questions: [questionSchema],
    totalMarks: { type: Number, required: true },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Exam', examSchema);
