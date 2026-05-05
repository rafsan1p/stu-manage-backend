const mongoose = require('mongoose');

const advertisementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    classLevel: { type: String, required: true, enum: ['Class 11', 'Class 12'] },
    schedule: { type: String, required: true, enum: ['Sat-Mon-Wed', 'Sun-Tue-Thu'] },
    startDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BatchAdvertisement', advertisementSchema);
