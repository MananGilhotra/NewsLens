/**
 * Auth Middleware
 * Verifies JWT tokens for protected routes
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config');

const readToken = (req) => {
    const header = req.headers.authorization || '';
    return header.startsWith('Bearer ') ? header.slice(7) : null;
};

const protect = (req, res, next) => {
    const token = readToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = { id: decoded.id };
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};

/** Attaches req.user when a valid token is sent, but never blocks the request. */
const optionalAuth = (req, res, next) => {
    const token = readToken(req);
    if (token) {
        try {
            req.user = { id: jwt.verify(token, config.jwtSecret).id };
        } catch {
            // anonymous request
        }
    }
    next();
};

const isDbReady = () => mongoose.connection.readyState === 1;

/** Fails fast with a clear message instead of hanging when MongoDB is down. */
const requireDb = (req, res, next) => {
    if (isDbReady()) return next();
    return res.status(503).json({
        success: false,
        error: 'Database unavailable. Start MongoDB locally or set MONGODB_URI in backend/.env.'
    });
};

module.exports = { protect, optionalAuth, requireDb, isDbReady };
