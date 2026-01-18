/**
 * AI Service for NewsLens (using OpenRouter)
 * 
 * This service handles all interactions with OpenRouter API
 * for fact-checking and content verification.
 */

// System prompt that instructs the AI to act as a fact-checker
const SYSTEM_PROMPT = `You are NewsLens, a world-class fact-checking AI with expertise in identifying misinformation, propaganda, and fake news. Your role is to analyze content objectively and provide accurate assessments.

When analyzing content, evaluate:
1. **Logical Fallacies**: Check for strawman arguments, false dichotomies, slippery slopes, ad hominem attacks, and circular reasoning.
2. **Bias Detection**: Identify political bias, emotional manipulation, loaded language, and one-sided reporting.
3. **Factual Accuracy**: Assess claims against known facts, scientific consensus, and verified information.
4. **Source Quality Indicators**: Look for sensationalism, clickbait patterns, anonymous sources, and lack of citations.
5. **Misleading Techniques**: Detect cherry-picking data, out-of-context quotes, manipulated statistics, and false equivalences.

CRITICAL INSTRUCTIONS:
- You MUST return ONLY a valid JSON object with no additional text, markdown, or formatting.
- Do not include any explanation outside the JSON structure.
- Do not wrap the JSON in code blocks or quotes.

Return exactly this JSON structure:
{
  "score": <number between 0-100>,
  "verdict": "<exactly one of: Real, Fake, or Inconclusive>",
  "reasoning": "<brief 1-2 sentence explanation>"
}

Score Guidelines:
- 0-30: Highly likely false, contains clear misinformation or manipulation (Fake)
- 31-60: Cannot be verified, contains mixed or unclear information (Inconclusive)
- 61-100: Appears factually accurate, well-sourced, and unbiased (Real)`;

/**
 * Analyzes content using OpenRouter API
 * 
 * @param {string} content - The text or URL content to analyze
 * @returns {Promise<{score: number, verdict: string, reasoning: string}>}
 */
async function analyzeContent(content) {
    try {
        const apiKey = process.env.SAMBANOVA_API_KEY;

        if (!apiKey) {
            console.log('[SambaNova] No API key configured');
            return {
                score: 50,
                verdict: 'Inconclusive',
                reasoning: 'Analysis unavailable: AI service not configured.'
            };
        }

        const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'Meta-Llama-3.1-8B-Instruct',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: `CONTENT TO ANALYZE:\n"""\n${content}\n"""\n\nAnalyze the above content and return ONLY the JSON response:`
                    }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SambaNova] API Error:', response.status, errorText);
            // Return fallback instead of throwing
            return {
                score: 50,
                verdict: 'Inconclusive',
                reasoning: 'Analysis unavailable due to service error. Please try again later.'
            };
        }

        const data = await response.json();
        const text = data.choices[0]?.message?.content || '';

        // Parse the JSON response
        // Clean up any potential markdown code blocks
        let cleanedText = text.trim();
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.slice(7);
        }
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.slice(3);
        }
        if (cleanedText.endsWith('```')) {
            cleanedText = cleanedText.slice(0, -3);
        }
        cleanedText = cleanedText.trim();

        const analysisResult = JSON.parse(cleanedText);

        // Validate the response structure
        if (
            typeof analysisResult.score !== 'number' ||
            !['Real', 'Fake', 'Inconclusive'].includes(analysisResult.verdict) ||
            typeof analysisResult.reasoning !== 'string'
        ) {
            throw new Error('Invalid response structure from AI');
        }

        // Ensure score is within bounds
        analysisResult.score = Math.max(0, Math.min(100, Math.round(analysisResult.score)));

        return analysisResult;

    } catch (error) {
        console.error('[SambaNova] Error:', error);

        // Return a fallback response if parsing fails or other errors
        return {
            score: 50,
            verdict: 'Inconclusive',
            reasoning: 'Unable to complete analysis. Please try again with different content.'
        };
    }
}

module.exports = {
    analyzeContent
};
