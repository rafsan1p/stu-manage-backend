const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    classLevel: {
        type: String,
        required: true,
        enum: [
            'Class 1','Class 2','Class 3','Class 4','Class 5',
            'Class 6','Class 7','Class 8',
            'Class 9','Class 10','Class 11','Class 12',
            'Admission'
        ]
    },
    stream: {
        type: String,
        enum: ['Science', 'Arts', 'Commerce', null, undefined],
        default: null,
        set: v => (v === '' || v === undefined) ? null : v,
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

module.exports = mongoose.model('Batch', batchSchema);
