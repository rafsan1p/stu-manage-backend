const Fee = require('../models/Fee');
const StudentBatch = require('../models/StudentBatch');
const Counter = require('../models/Counter');

async function generateMonthlyFees(month) {
    // Find all active enrollments
    const enrollments = await StudentBatch.find({ isActive: true })
        .populate('batchId', 'monthlyFee isActive')
        .lean();

    let created = 0;
    let skipped = 0;

    for (const enrollment of enrollments) {
        if (!enrollment.batchId?.isActive) { skipped++; continue; }
        const existing = await Fee.findOne({
            studentId: enrollment.studentId,
            batchId: enrollment.batchId._id,
            month,
        });
        if (existing) { skipped++; continue; }
        await Fee.create({
            studentId: enrollment.studentId,
            batchId: enrollment.batchId._id,
            month,
            amount: enrollment.batchId.monthlyFee,
            status: 'unpaid',
        });
        created++;
    }
    return { created, skipped };
}

async function generateReceiptNumber(month) {
    const monthKey = month.replace('-', '');
    const counterId = `receipt_${monthKey}`;
    const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return `RCP-${monthKey}-${String(counter.seq).padStart(4, '0')}`;
}

async function recordPayment(feeId, amount, note = '') {
    const receiptNumber = await generateReceiptNumber(new Date().toISOString().slice(0, 7));
    return Fee.findByIdAndUpdate(
        feeId,
        { status: 'paid', paidAt: new Date(), amount, paymentNote: note, receiptNumber },
        { new: true }
    );
}

async function getMonthlySummary(month) {
    const fees = await Fee.find({ month }).lean();
    const totalCollected = fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
    const totalDue = fees.filter(f => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const totalOverdue = fees
        .filter(f => f.status === 'unpaid' && new Date(f.createdAt) < thirtyDaysAgo)
        .reduce((s, f) => s + f.amount, 0);

    return { totalCollected, totalDue, totalOverdue };
}

module.exports = { generateMonthlyFees, recordPayment, getMonthlySummary };
