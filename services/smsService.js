const MessageLog = require('../models/MessageLog');
const User = require('../models/User');

/**
 * Send SMS to a phone number.
 * Currently a placeholder — swap with Twilio/SSL Wireless by setting SMS_PROVIDER env.
 */
async function sendSMS(to, message, sentBy = null, relatedStudentId = null) {
    let status = 'sent';
    let errorCode = '';

    try {
        if (process.env.SMS_PROVIDER === 'twilio') {
            // Twilio integration (uncomment when credentials are ready)
            // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            // await client.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to });
            console.log(`[SMS - Twilio] To: ${to} | Message: ${message}`);
        } else {
            // Placeholder — log to console
            console.log(`[SMS - Placeholder] To: ${to} | Message: ${message}`);
        }
    } catch (err) {
        status = 'failed';
        errorCode = err.message;
        console.error(`[SMS Error] To: ${to} | Error: ${err.message}`);
    }

    // Always log regardless of success/failure
    await MessageLog.create({
        type: 'sms',
        recipient: to,
        body: message,
        status,
        errorCode,
        sentBy,
        relatedStudentId,
    });

    return { success: status === 'sent', errorCode };
}

async function sendAbsenceSMS(studentId, batchName, date, sentBy = null) {
    const student = await User.findById(studentId).lean();
    if (!student?.guardianPhone) return { success: false, errorCode: 'No guardian phone' };

    const message = `প্রিয় অভিভাবক, ${student.name} আজ (${date}) ${batchName} ব্যাচে অনুপস্থিত ছিল। - EduTrack`;
    return sendSMS(student.guardianPhone, message, sentBy, studentId);
}

async function sendEmail(to, subject, body, sentBy = null, relatedStudentId = null) {
    let status = 'sent';
    let errorCode = '';

    try {
        // Email placeholder — integrate with Nodemailer/SendGrid when ready
        console.log(`[Email - Placeholder] To: ${to} | Subject: ${subject}`);
    } catch (err) {
        status = 'failed';
        errorCode = err.message;
    }

    await MessageLog.create({
        type: 'email',
        recipient: to,
        subject,
        body,
        status,
        errorCode,
        sentBy,
        relatedStudentId,
    });

    return { success: status === 'sent', errorCode };
}

module.exports = { sendSMS, sendAbsenceSMS, sendEmail };
