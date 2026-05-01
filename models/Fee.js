const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    month: { type: String, required: true }, // "YYYY-MM"
    amount: { type: Number, required: true },
    status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
    paidAt: { type: Date, default: null },
    receiptNumber: { type: String, unique: true, sparse: true },
    paymentNote: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

feeSchema.index({ studentId: 1, batchId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Fee', feeSchema);
