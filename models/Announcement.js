const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    targetType: { type: String, enum: ['all', 'batch'], default: 'all' },
    targetBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
    expiresAt: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Announcement', announcementSchema);
