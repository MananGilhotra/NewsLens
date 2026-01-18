/**
 * Analyze Route - POST /api/analyze
 * 
 * Accepts either a URL or text snippet for fact-checking analysis.
 */

const express = require('express');
const router = express.Router();
const { analyzeContent } = require('../services/geminiService');
const AnalysisLog = require('../models/AnalysisLog');

/**
 * POST /api/analyze
 * 
 * Request body:
 *   { url: string } - URL to analyze
 *   OR
 *   { text: string } - Text snippet to analyze
 * 
 * Response:
 *   {
 *     success: boolean,
 *     data: {
 *       score: number (0-100),
 *       verdict: 'Real' | 'Fake' | 'Inconclusive',
 *       reasoning: string
 *     }
 *   }
 */
router.post('/', async (req, res) => {
    try {
        const { url, text } = req.body;

        // Validate input - must have either url or text
        if (!url && !text) {
            return res.status(400).json({
                success: false,
                error: 'Please provide either a URL or text to analyze'
            });
        }

        // Determine input type and content
        const inputType = url ? 'url' : 'text';
        const content = url || text;

        // Validate content length
        if (content.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Content is too short. Please provide more text to analyze.'
            });
        }

        if (content.length > 10000) {
            return res.status(400).json({
                success: false,
                error: 'Content is too long. Please limit to 10,000 characters.'
            });
        }

        // Perform analysis using Gemini
        console.log(`[NewsLens] Analyzing ${inputType}: ${content.substring(0, 50)}...`);
        const result = await analyzeContent(content);

        // Log the analysis to MongoDB
        try {
            const log = new AnalysisLog({
                inputType,
                content: content.substring(0, 5000), // Truncate for storage
                score: result.score,
                verdict: result.verdict,
                reasoning: result.reasoning
            });
            await log.save();
            console.log(`[NewsLens] Analysis logged with ID: ${log._id}`);
        } catch (dbError) {
            // Don't fail the request if logging fails
            console.error('[NewsLens] Failed to log analysis:', dbError.message);
        }

        // Return the analysis result
        return res.json({
            success: true,
            data: {
                score: result.score,
                verdict: result.verdict,
                reasoning: result.reasoning,
                analyzedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[NewsLens] Analysis error:', error);

        // Handle specific API errors
        if (error.message?.includes('API_KEY')) {
            return res.status(500).json({
                success: false,
                error: 'AI service configuration error. Please check the API key.'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Failed to analyze content. Please try again.'
        });
    }
});

/**
 * GET /api/analyze/history
 * 
 * Returns recent analysis logs
 */
router.get('/history', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);

        const logs = await AnalysisLog.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('-content'); // Exclude full content for privacy

        return res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        console.error('[NewsLens] History fetch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch history'
        });
    }
});

/**
 * POST /api/analyze/deepfake
 * 
 * Analyzes images/videos for deepfake detection
 */
router.post('/deepfake', async (req, res) => {
    try {
        const { media, mediaType, fileName, isVideo } = req.body;

        if (!media) {
            return res.status(400).json({
                success: false,
                error: 'Please provide media to analyze'
            });
        }

        console.log(`[NewsLens] Analyzing deepfake: ${fileName} (${mediaType})`);

        // Call OpenRouter for deepfake analysis
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'NewsLens Deepfake Detector'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `You are a deepfake detection expert. Analyze this ${isVideo ? 'video frame' : 'image'} for signs of AI generation or manipulation.

Look for:
1. Unnatural facial features, skin texture, or expressions
2. Inconsistent lighting or shadows
3. Blurry edges around face/hair
4. Artifacts, distortions, or glitches
5. Unnatural eye reflections or blinking patterns
6. Background inconsistencies

Respond with ONLY this JSON format:
{
  "score": <0-100 authenticity score>,
  "verdict": "<Likely Real | Uncertain | Likely Fake>",
  "confidence": "<High | Medium | Low>",
  "analysis": "<Brief 1-2 sentence explanation of findings>"
}`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mediaType};base64,${media}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.2,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Deepfake] OpenRouter Error:', response.status, errorText);
            throw new Error(`AI analysis failed: ${response.status}`);
        }

        const data = await response.json();
        let resultText = data.choices[0]?.message?.content?.trim() || '';

        // Parse JSON response
        let cleanedText = resultText;
        if (cleanedText.startsWith('```json')) cleanedText = cleanedText.slice(7);
        if (cleanedText.startsWith('```')) cleanedText = cleanedText.slice(3);
        if (cleanedText.endsWith('```')) cleanedText = cleanedText.slice(0, -3);
        cleanedText = cleanedText.trim();

        const analysisResult = JSON.parse(cleanedText);

        return res.json({
            success: true,
            data: {
                score: Math.max(0, Math.min(100, analysisResult.score)),
                verdict: analysisResult.verdict,
                confidence: analysisResult.confidence,
                analysis: analysisResult.analysis,
                analyzedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[Deepfake] Analysis error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to analyze media. Please try again.'
        });
    }
});

module.exports = router;

