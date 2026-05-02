const Counter = require('../models/Counter');

async function generateStudentId() {
    const year = new Date().getFullYear();
    const counterId = `student_${year}`;
    const counter = await Counter.findByIdAndUpdate(
        counterId,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    const padded = String(counter.seq).padStart(4, '0');
    return `ET-${year}-${padded}`;
}

module.exports = generateStudentId;
