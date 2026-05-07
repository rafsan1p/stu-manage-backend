const MessageLog = require('../models/MessageLog');
const User = require('../models/User');

async function sendSMS(to, message, sentBy = null, relatedStudentId = null) {
    let status = 'sent';
    let errorCode = '';

    // Normalize BD phone number to 88XXXXXXXXXXX format
    let phone = to.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '88' + phone;
    if (!phone.startsWith('88')) phone = '88' + phone;

    try {
        if (process.env.SMS_PROVIDER === 'sslwireless') {
            const url = `https://sms.sslwireless.com/pushapi/dynamic/server.php` +
                `?api_token=${process.env.SSL_WIRELESS_API_TOKEN}` +
                `&sid=${process.env.SSL_WIRELESS_SID}` +
                `&msisdn=${phone}` +
                `&sms=${encodeURIComponent(message)}` +
                `&csmsid=${Date.now()}`;

            const res = await fetch(url);
            const text = await res.text();
            if (!res.ok || text.includes('ERROR')) {
                throw new Error(`SSL Wireless error: ${text}`);
            }
            console.log(`[SMS - SSL Wireless] To: ${phone} | Status: ${text}`);

        } else if (process.env.SMS_PROVIDER === 'twilio') {
            const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            await client.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: `+${phone}` });

        } else {
            // Dev mode — just log
            console.log(`[SMS - Dev] To: ${phone} | Message: ${message}`);
        }
    } catch (err) {
        status = 'failed';
        errorCode = err.message;
        console.error(`[SMS Error] To: ${phone} | Error: ${err.message}`);
    }

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

    const message = `প্রিয় অভিভাবক, আপনার সন্তান ${student.name} আজ (${date}) Genuine ICT Care এর ${batchName} ব্যাচে অনুপস্থিত ছিল। যোগাযোগ করুন।`;
    return sendSMS(student.guardianPhone, message, sentBy, studentId);
}

async function sendEmail(to, subject, body, sentBy = null, relatedStudentId = null) {
    let status = 'sent';
    let errorCode = '';
    try {
        console.log(`[Email - Placeholder] To: ${to} | Subject: ${subject}`);
    } catch (err) {
        status = 'failed';
        errorCode = err.message;
    }
    await MessageLog.create({ type: 'email', recipient: to, subject, body, status, errorCode, sentBy, relatedStudentId });
    return { success: status === 'sent', errorCode };
}

module.exports = { sendSMS, sendAbsenceSMS, sendEmail };
