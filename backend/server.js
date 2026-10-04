/**
 * NewsLens Backend Server
 *
 * Express server for the AI Fake News & Content Verification Platform
 */

const config = require('./config');
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const mlModel = require('./services/mlModel');
const llm = require('./services/llmService');
const factCheck = require('./services/factCheck');
const sourceCredibility = require('./services/sourceCredibility');
const { isDbReady } = require('./middleware/authMiddleware');

// Fail fast instead of queueing queries for 10s when the database is down
mongoose.set('bufferCommands', false);

const app = express();

app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint - also tells the UI which capabilities are live
app.get('/api/health', (req, res) => {
    const model = mlModel.getInfo();
    res.json({
        status: 'online',
        service: 'NewsLens',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        services: {
            database: isDbReady() ? 'connected' : 'unavailable',
            llm: llm.status(),
            news: config.newsApiKey ? 'newsapi+rss' : 'rss',
            factCheck: factCheck.isConfigured(),
            model: model.loaded
                ? { loaded: true, name: model.name, version: model.version, testAccuracy: model.metrics.test?.overall?.accuracy }
                : { loaded: false }
        }
    });
});

// Model card: datasets and held-out metrics of the credibility model
app.get('/api/model', (req, res) => {
    res.json({ success: true, data: { ...mlModel.getInfo(), sourcesRated: sourceCredibility.count() } });
});

// Routes
app.use('/api/analyze', require('./routes/analyzeRoute'));
app.use('/api/news', require('./routes/newsRoute'));
app.use('/api/auth', require('./routes/authRoute'));

// Serve static files in production
if (config.isProduction) {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get(/^(?!\/api\/).*/, (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
    });
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, error: 'Upload is too large' });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
    console.error('[Server Error]', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// MongoDB connection
const connectDB = async () => {
    let mongoURI = config.mongoUri;
    if (!mongoURI) {
        if (config.isProduction) {
            console.error('❌ MONGODB_URI environment variable is required in production!');
            process.exit(1);
        }
        console.log('⚠️  No MONGODB_URI set, using localhost for development');
        mongoURI = 'mongodb://localhost:27017/newslens';
    }

    const maskedURI = mongoURI.replace(/:([^:@/]+)@/, ':****@');
    console.log(`[db] Attempting to connect to: ${maskedURI}`);

    try {
        await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('💡 TIP: If you use MongoDB Atlas, check Network Access - your server IP must be allowed.');
        if (config.isProduction) {
            console.error('🔥 Cannot start server without database in production');
            process.exit(1);
        }
        console.log('⚠️  Server will continue without database (login, signup and history are disabled)');
    }
};

// Start server
const startServer = async () => {
    await connectDB();
    mlModel.isReady();
    // Warm the RSS cache so the first feed request is instant
    require('./services/newsSources').getNews({}).catch(() => {});

    const server = app.listen(config.port, () => {
        const WIDTH = 56;
        const rule = (left, right) => `  ${left}${'─'.repeat(WIDTH)}${right}`;
        const row = (label, value = '') => {
            const text = label ? `  ${label.padEnd(11)}${value}` : `  ${value}`;
            return `  │${(text.length > WIDTH ? `${text.slice(0, WIDTH - 1)}…` : text).padEnd(WIDTH)}│`;
        };
        console.log([
            '',
            rule('┌', '┐'),
            row('', 'NEWSLENS  ·  AI Fake News & Content Verification'),
            rule('├', '┤'),
            row('Server', `http://localhost:${config.port}`),
            row('Database', isDbReady() ? 'connected' : 'unavailable'),
            row('ML model', mlModel.isReady() ? 'loaded' : 'missing - run ml/train_fake_news.py'),
            row('LLM', llm.isConfigured() ? `on  ${llm.status().providers.map((p) => p.name).join(' -> ')}` : 'off - add a Groq or OpenRouter key'),
            row('Web check', llm.status().webSearch ? 'on  live search for AI fact-checks' : 'off'),
            row('News', config.newsApiKey ? 'NewsAPI + RSS fallback' : 'RSS feeds (set NEWS_API_KEY for NewsAPI)'),
            row('FactCheck', factCheck.isConfigured() ? 'on  Google Fact Check Tools' : llm.status().webSearch ? 'on  found via AI web search' : 'off'),
            rule('└', '┘'),
            ''
        ].join('\n'));
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`\n❌ Port ${config.port} is already in use - another NewsLens backend is probably running.`);
            console.error(`   Stop it (lsof -ti tcp:${config.port} | xargs kill) or set a different PORT in backend/.env.\n`);
            process.exit(1);
        }
        throw error;
    });
};

startServer();
