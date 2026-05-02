const Attendance = require('../models/Attendance');

async function bulkUpsertAttendance(records) {
    const ops = records.map(r => ({
        updateOne: {
            filter: { studentId: r.studentId, batchId: r.batchId, date: r.date },
            update: { $set: { status: r.status } },
            upsert: true,
        }
    }));
    await Attendance.bulkWrite(ops);
    return records.filter(r => r.status === 'absent').map(r => r.studentId);
}

async function getAttendanceSummary(studentId, startDate, endDate) {
    const query = { studentId };
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
    }
    const records = await Attendance.find(query).lean();
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const total = present + absent;
    const percentage = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;
    return { present, absent, total, percentage };
}

async function generateMonthlyReport(batchId, month) {
    // month: "YYYY-MM"
    const records = await Attendance.find({
        batchId,
        date: { $gte: `${month}-01`, $lte: `${month}-31` }
    }).populate('studentId', 'name studentId').lean();

    const studentMap = {};
    const dateSet = new Set();

    for (const r of records) {
        const sid = r.studentId._id.toString();
        if (!studentMap[sid]) {
            studentMap[sid] = { id: sid, name: r.studentId.name, studentId: r.studentId.studentId, dates: {} };
        }
        studentMap[sid].dates[r.date] = r.status;
        dateSet.add(r.date);
    }

    const dates = Array.from(dateSet).sort();
    const students = Object.values(studentMap);
    return { students, dates, month };
}

module.exports = { bulkUpsertAttendance, getAttendanceSummary, generateMonthlyReport };
