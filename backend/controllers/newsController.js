/**
 * News Controller - Global Intel Feed
 * 
 * Fetches news from NewsAPI with trust scoring based on source credibility
 */

// Source credibility tiers
const SOURCE_TIERS = {
    // Tier 1: Most trusted international news agencies (85-100)
    HIGH_TIER: [
        'Reuters', 'Associated Press', 'AP News', 'AFP', 'BBC News', 'BBC',
        'The Guardian', 'The New York Times', 'The Washington Post', 'NPR',
        'PBS', 'The Wall Street Journal', 'Financial Times', 'The Economist',
        'Bloomberg', 'Al Jazeera English', 'Deutsche Welle', 'France 24',
        'The Hindu', 'Times of India', 'NDTV', 'The Indian Express'
    ],

    // Tier 2: Reputable regional/specialized sources (60-84)
    MID_TIER: [
        'CNN', 'ABC News', 'CBS News', 'NBC News', 'MSNBC', 'Sky News',
        'USA Today', 'Los Angeles Times', 'Chicago Tribune', 'Axios',
        'Politico', 'The Atlantic', 'Wired', 'Ars Technica', 'TechCrunch',
        'The Verge', 'Business Insider', 'Forbes', 'Fortune', 'CNBC',
        'Hindustan Times', 'India Today', 'News18', 'Scroll.in', 'The Wire'
    ],

    // Tier 3: Tabloid/Biased/Sensational sources (0-40)
    TABLOID_TIER: [
        'Daily Mail', 'The Sun', 'New York Post', 'Daily Mirror', 'The Daily Star',
        'Breitbart', 'InfoWars', 'The Gateway Pundit', 'OAN', 'Newsmax',
        'BuzzFeed News', 'Huffington Post', 'Salon', 'Vox', 'Vice News',
        'RT', 'Sputnik', 'Daily Express', 'Daily Record', 'Mirror Online'
    ]
};

/**
 * Calculate trust score based on source name
 */
const calculateTrustScore = (sourceName) => {
    if (!sourceName) return 50;

    const normalizedName = sourceName.toLowerCase().trim();

    // Check High Tier (85-100)
    if (SOURCE_TIERS.HIGH_TIER.some(s => normalizedName.includes(s.toLowerCase()))) {
        return 85 + Math.floor(Math.random() * 15); // 85-99
    }

    // Check Mid Tier (60-84)
    if (SOURCE_TIERS.MID_TIER.some(s => normalizedName.includes(s.toLowerCase()))) {
        return 60 + Math.floor(Math.random() * 24); // 60-83
    }

    // Check Tabloid Tier (15-40)
    if (SOURCE_TIERS.TABLOID_TIER.some(s => normalizedName.includes(s.toLowerCase()))) {
        return 15 + Math.floor(Math.random() * 25); // 15-39
    }

    // Unknown sources get a neutral score (45-65)
    return 45 + Math.floor(Math.random() * 20);
};

/**
 * Get trust tier label
 */
const getTrustTier = (score) => {
    if (score >= 75) return 'VERIFIED';
    if (score >= 50) return 'MODERATE';
    return 'CAUTION';
};

/**
 * Fetch news from NewsAPI with trust scoring
 */
const fetchNews = async (req, res) => {
    try {
        const {
            q = 'technology OR world news',
            category,
            pageSize = 20,
            page = 1,
            sortBy = 'publishedAt',
            language = 'en'
        } = req.query;

        const NEWS_API_KEY = process.env.NEWS_API_KEY;

        if (!NEWS_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'News API key not configured'
            });
        }

        // Build NewsAPI URL
        let apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&pageSize=${pageSize}&page=${page}&sortBy=${sortBy}&language=${language}&apiKey=${NEWS_API_KEY}`;

        // If category specified, use top-headlines endpoint instead
        if (category) {
            apiUrl = `https://newsapi.org/v2/top-headlines?category=${category}&pageSize=${pageSize}&page=${page}&language=${language}&apiKey=${NEWS_API_KEY}`;
        }

        console.log(`[Intel Feed] Fetching news: page ${page}, pageSize ${pageSize}`);

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.status !== 'ok') {
            console.error('[Intel Feed] NewsAPI Error:', data.message);
            return res.status(400).json({
                success: false,
                error: data.message || 'Failed to fetch news'
            });
        }

        // Process articles with trust scoring
        const processedArticles = data.articles
            .filter(article => article.title && article.title !== '[Removed]')
            .map((article, index) => {
                const trustScore = calculateTrustScore(article.source?.name);
                const trustTier = getTrustTier(trustScore);

                return {
                    id: `${article.source?.id || 'unknown'}-${Date.now()}-${index}`,
                    title: article.title,
                    description: article.description,
                    content: article.content,
                    url: article.url,
                    urlToImage: article.urlToImage,
                    publishedAt: article.publishedAt,
                    source: {
                        id: article.source?.id,
                        name: article.source?.name
                    },
                    author: article.author,
                    // Custom trust fields
                    trustScore,
                    trustTier,
                    isTrusted: trustScore >= 70,
                    isTableoid: trustScore < 40
                };
            });

        console.log(`[Intel Feed] Processed ${processedArticles.length} articles`);

        return res.json({
            success: true,
            data: {
                articles: processedArticles,
                totalResults: data.totalResults,
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                hasMore: (page * pageSize) < data.totalResults
            }
        });

    } catch (error) {
        console.error('[Intel Feed] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch news feed'
        });
    }
};

/**
 * Summarize article using OpenRouter AI
 */
const summarizeArticle = async (req, res) => {
    try {
        const { title, content, url } = req.body;

        if (!title && !content) {
            return res.status(400).json({
                success: false,
                error: 'Please provide article title or content'
            });
        }

        const prompt = `You are an intelligence analyst. Summarize this news article in exactly 3 bullet points.
Each bullet should be concise (max 15 words) and capture a key insight.
Format: Return ONLY 3 lines starting with "•" - no other text.

Article Title: ${title}
Article Content: ${content || 'Content not available - summarize based on title'}`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'VerityAI Intel Feed'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Intel Feed] OpenRouter Error:', response.status, errorText);
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const summary = data.choices[0]?.message?.content?.trim() || '';

        // Parse bullets
        const bullets = summary
            .split('\n')
            .filter(line => line.trim().startsWith('•'))
            .map(line => line.trim())
            .slice(0, 3);

        return res.json({
            success: true,
            data: {
                summary: bullets.length > 0 ? bullets : ['• Analysis unavailable', '• Try again later', '• Check original source'],
                analyzedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('[Intel Feed] Summarize Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to generate summary'
        });
    }
};

module.exports = {
    fetchNews,
    summarizeArticle,
    calculateTrustScore,
    SOURCE_TIERS
};
