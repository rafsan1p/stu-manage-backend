const admin = require('../config/firebaseAdmin');
const User = require('../models/User');

async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized — no token provided' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        // Fetch role from MongoDB
        const dbUser = await User.findOne({ email: decoded.email }).lean();
        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            role: dbUser?.role || 'student',
            dbId: dbUser?._id?.toString(),
            isApproved: dbUser?.isApproved || false,
        };
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized — invalid token' });
    }
}

module.exports = verifyToken;
