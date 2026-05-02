// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// MongoDB connection cache for serverless
let cachedDb = null;
async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
    const db = await mongoose.connect(process.env.MONGODB_URI);
    cachedDb = db;
    return db;
}

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB BEFORE routes
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/results', require('./routes/results'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'EduTrack Server is running!', version: '2.0' });
});

// Global error handler (must be last)
app.use(errorHandler);

// Export for Vercel Serverless Function
module.exports = app;
