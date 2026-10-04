/**
 * Analyze Routes - /api/analyze
 */

const express = require('express');
const router = express.Router();
const { analyze, history, deepfake } = require('../controllers/analyzeController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

/**
 * POST /api/analyze
 * Body: { text } or { url }
 * Returns a combined credibility score (0-100), verdict, confidence, reasoning and the individual signals.
 */
router.post('/', optionalAuth, analyze);

/**
 * GET /api/analyze/history?limit=10
 * The signed-in user's recent checks.
 */
router.get('/history', protect, history);

/**
 * POST /api/analyze/deepfake
 * Body: { frames: [{ data, mediaType }], original?, isVideo, fileName }
 */
router.post('/deepfake', deepfake);

module.exports = router;
