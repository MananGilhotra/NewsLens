/**
 * Auth Routes
 * /api/auth - Authentication endpoints
 */

const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { protect, requireDb } = require('../middleware/authMiddleware');

router.use(requireDb);

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getProfile);

module.exports = router;
