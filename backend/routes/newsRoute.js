/**
 * News Routes - Global Intel Feed API
 */

const express = require('express');
const router = express.Router();
const { fetchNews, summarizeArticle } = require('../controllers/newsController');

/**
 * GET /api/news
 * Fetch news with trust scoring (NewsAPI when configured, public RSS feeds otherwise)
 *
 * Query params:
 *   q - Search query (empty = top stories)
 *   category - general, technology, business, science, health, entertainment, sports
 *   pageSize - Articles per page (default: 12, max: 50)
 *   page - Page number (default: 1)
 */
router.get('/', fetchNews);

/**
 * POST /api/news/summarize
 * Get a 3-point summary of an article
 *
 * Body:
 *   title - Article title
 *   content - Article content or description
 *   url - Article URL (optional, enables full-article summaries)
 */
router.post('/summarize', summarizeArticle);

module.exports = router;
