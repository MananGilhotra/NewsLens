/**
 * Auth Controller
 * Handles user registration, login, and profile retrieval
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

const generateToken = (userId) => jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: config.jwtExpire });

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, createdAt: user.createdAt });

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide name, email and password' });
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }
        if (await User.exists({ email })) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }

        const user = await User.create({ name, email, password });
        res.status(201).json({ success: true, data: { token: generateToken(user._id), user: publicUser(user) } });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors)[0]?.message || 'Invalid details';
            return res.status(400).json({ success: false, error: message });
        }
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'Email already registered' });
        }
        console.error('[Auth] Register error:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        res.json({ success: true, data: { token: generateToken(user._id), user: publicUser(user) } });
    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, data: publicUser(user) });
    } catch (error) {
        console.error('[Auth] Get profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
};

module.exports = { register, login, getProfile };
