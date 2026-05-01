require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected — edutrack database');
        app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    })
    .catch(err => console.error('❌ MongoDB connection error:', err.message));
