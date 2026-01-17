/**
 * VerityAI Backend Server
 * 
 * Express server for the AI Fake News & Content Verification Platform
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL // Add your Vercel URL here via env variable
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(allowed => origin.startsWith(allowed) || allowed === origin)) {
            return callback(null, true);
        }
        // In production, also allow any vercel.app subdomain
        if (origin.includes('.vercel.app')) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'VerityAI',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Routes
const analyzeRoute = require('./routes/analyzeRoute');
const newsRoute = require('./routes/newsRoute');
const authRoute = require('./routes/authRoute');
app.use('/api/analyze', analyzeRoute);
app.use('/api/news', newsRoute);
app.use('/api/auth', authRoute);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    app.use(express.static(path.join(__dirname, '../frontend/dist')));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
    });
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/verityai';
        await mongoose.connect(mongoURI);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.log('⚠️  Server will continue without database logging');
    }
};

// Start server
const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ██╗   ██╗███████╗██████╗ ██╗████████╗██╗   ██╗         ║
║   ██║   ██║██╔════╝██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝         ║
║   ██║   ██║█████╗  ██████╔╝██║   ██║    ╚████╔╝          ║
║   ╚██╗ ██╔╝██╔══╝  ██╔══██╗██║   ██║     ╚██╔╝           ║
║    ╚████╔╝ ███████╗██║  ██║██║   ██║      ██║            ║
║     ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝            ║
║                                                          ║
║   AI Fake News & Content Verification Platform           ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║   🚀 Server running on: http://localhost:${PORT}            ║
║   📡 API endpoint: POST /api/analyze                     ║
║   💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}                              ║
╚══════════════════════════════════════════════════════════╝
    `);
    });
};

startServer();
