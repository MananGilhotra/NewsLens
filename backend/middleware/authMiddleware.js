/**
 * Auth Middleware
 * Verifies JWT tokens for protected routes
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'newslens_super_secret_key_2026';

const protect = async (req, res, next) => {
    try {
        let token;

        // Check for Bearer token in header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { id: decoded.id };
        next();

    } catch (error) {
        console.error('[Auth Middleware] Token verification failed:', error.message);
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

module.exports = { protect };
