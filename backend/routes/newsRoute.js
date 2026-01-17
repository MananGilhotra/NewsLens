/**
 * News Routes - Global Intel Feed API
 */

const express = require('express');
const router = express.Router();
const { fetchNews, summarizeArticle } = require('../controllers/newsController');

/**
 * GET /api/news
 * Fetch news with trust scoring
 * 
 * Query params:
 *   q - Search query (default: 'technology OR world news')
 *   category - News category (business, technology, science, etc.)
 *   pageSize - Articles per page (default: 20, max: 100)
 *   page - Page number (default: 1)
 *   sortBy - Sort order: publishedAt, relevancy, popularity
 *   language - Language code (default: en)
 */
router.get('/', fetchNews);

/**
 * POST /api/news/summarize
 * Get AI summary of an article
 * 
 * Body:
 *   title - Article title
 *   content - Article content
 *   url - Article URL (optional)
 */
router.post('/summarize', summarizeArticle);

module.exports = router;
