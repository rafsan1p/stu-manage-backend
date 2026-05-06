const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    classLevel: {
        type: String,
        required: true,
        enum: ['Class 11', 'Class 12']
    },
    stream: {
        type: String,
        default: null,
    },
    subjects: [{ type: String }],
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    schedule: {
        days: [{ type: String }],
        time: { type: String, default: '' }
    },
    maxCapacity: { type: Number, required: true, default: 40 },
    enrolledCount: { type: Number, default: 0 },
    monthlyFee: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// Compound unique index to prevent duplicate batches (stream removed — ICT only platform)
batchSchema.index({ name: 1, classLevel: 1 }, { unique: true });

module.exports = mongoose.model('Batch', batchSchema);
