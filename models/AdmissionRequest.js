const mongoose = require('mongoose');

const admissionRequestSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    dateOfBirth: { type: Date },
    gender: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    classLevel: { type: String, required: true },
    stream: { type: String, default: '' },
    institution: { type: String, default: '' },
    subjects: [{ type: String }],
    guardianName: { type: String, required: true },
    guardianRelationship: { type: String, default: '' },
    guardianPhone: { type: String, required: true },
    guardianEmail: { type: String, default: '' },
    address: { type: String, default: '' },
    notes: { type: String, default: '' },
    submittedByEmail: { type: String, default: '' }, // Firebase email of the logged-in user
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isDuplicate: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    createdStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AdmissionRequest', admissionRequestSchema);
