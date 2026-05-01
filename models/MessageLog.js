const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema({
    type: { type: String, enum: ['sms', 'email'], required: true },
    recipient: { type: String, required: true },
    subject: { type: String, default: '' },
    body: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    errorCode: { type: String, default: '' },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sentAt: { type: Date, default: Date.now },
    relatedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

module.exports = mongoose.model('MessageLog', messageLogSchema);
