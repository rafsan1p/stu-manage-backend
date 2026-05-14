const MessageLog = require('../models/MessageLog');
const User = require('../models/User');

async function sendSMS(to, message, sentBy = null, relatedStudentId = null) {
    let status = 'sent';
    let errorCode = '';

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
            if (!res.ok || text.includes('ERROR')) throw new Error(`SSL Wireless error: ${text}`);
        } else if (process.env.SMS_PROVIDER === 'twilio') {
            const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            await client.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: `+${phone}` });
        } else {
            console.log(`[SMS - Dev] To: ${phone} | Message: ${message}`);
        }
    } catch (err) {
        status = 'failed';
        errorCode = err.message;
        console.error(`[SMS Error] To: ${phone} | Error: ${err.message}`);
    }

    await MessageLog.create({ type: 'sms', recipient: to, body: message, status, errorCode, sentBy, relatedStudentId });
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
        const nodemailer = require('nodemailer');
        const gmailUser = process.env.GMAIL_USER;
        const gmailPass = process.env.GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailPass) {
            console.log(`[Email - Dev] To: ${to} | Subject: ${subject}\n${body}`);
        } else {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: gmailUser, pass: gmailPass },
            });

            await transporter.sendMail({
                from: `"Genuine ICT Care" <${gmailUser}>`,
                to,
                subject,
                text: body,
                html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
                    <div style="background:#4f46e5;padding:20px;border-radius:8px;text-align:center;margin-bottom:20px">
                        <h2 style="color:white;margin:0">Genuine ICT Care</h2>
                    </div>
                    <div style="color:#374151;line-height:1.8">${body.replace(/\n/g, '<br>')}</div>
                    <div style="margin-top:20px;padding-top:15px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px">
                        Genuine ICT Care — Jashore
                    </div>
                </div>`,
            });
            console.log(`[Email - Sent] To: ${to}`);
        }
    } catch (err) {
        status = 'failed';
        errorCode = err.message;
        console.error(`[Email Error] To: ${to} | Error: ${err.message}`);
    }

    await MessageLog.create({ type: 'email', recipient: to, subject, body, status, errorCode, sentBy, relatedStudentId });
    return { success: status === 'sent', errorCode };
}

module.exports = { sendSMS, sendAbsenceSMS, sendEmail };
