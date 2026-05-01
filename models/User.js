const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    photoURL: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'student' },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    phone: { type: String, default: '' },
    studentId: { type: String, unique: true, sparse: true },

    // Student & Teacher common
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', ''] , default: '' },
    address: { type: String, default: '' },
    institution: { type: String, default: '' }, // school/college name

    // Student specific
    guardianName: { type: String, default: '' },
    guardianPhone: { type: String, default: '' },
    guardianEmail: { type: String, default: '' },
    guardianRelationship: { type: String, default: '' },

    // Teacher specific
    subjectSpecialization: { type: String, default: '' },

    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
