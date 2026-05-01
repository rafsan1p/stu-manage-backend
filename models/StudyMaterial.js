const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['pdf', 'video'], required: true },
    fileUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, default: '' },
    batchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
