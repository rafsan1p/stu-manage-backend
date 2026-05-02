const Exam = require('../models/Exam');
const Result = require('../models/Result');

async function submitMCQExam(examId, studentId, answers) {
    const exam = await Exam.findById(examId);
    if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

    const now = new Date();
    const start = new Date(exam.scheduledAt);
    const end = new Date(start.getTime() + exam.durationMinutes * 60 * 1000);

    if (now < start || now > end) {
        throw Object.assign(new Error('This exam is not currently available'), { status: 403 });
    }

    // Check if already submitted
    const existing = await Result.findOne({ studentId, examId });
    if (existing) throw Object.assign(new Error('Already submitted'), { status: 409 });

    // Calculate score
    const score = exam.questions.reduce((total, q, i) => {
        return total + (answers[i] === q.correctIndex ? 1 : 0);
    }, 0);

    const result = await Result.create({
        studentId,
        examId,
        batchId: exam.batchId,
        score,
        totalMarks: exam.totalMarks,
        answers,
        submittedAt: new Date(),
    });

    const percentage = Math.round((score / exam.totalMarks) * 10000) / 100;
    return { score, totalMarks: exam.totalMarks, percentage, resultId: result._id };
}

async function getExamResults(examId) {
    const results = await Result.find({ examId })
        .populate('studentId', 'name studentId photoURL')
        .sort({ score: -1 })
        .lean();

    // Assign ranks (tied scores share rank)
    let rank = 1;
    for (let i = 0; i < results.length; i++) {
        if (i > 0 && results[i].score < results[i - 1].score) {
            rank = i + 1;
        }
        results[i].rank = rank;
    }
    return results;
}

module.exports = { submitMCQExam, getExamResults };
