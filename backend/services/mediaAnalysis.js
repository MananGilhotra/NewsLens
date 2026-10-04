/**
 * Deepfake / AI-image analysis: local metadata forensics + optional vision-LLM inspection.
 */

const llm = require('./llmService');
const forensics = require('./mediaForensics');

const PROMPT = (isVideo, frameCount) => `You are a digital media forensics expert. Analyse ${isVideo ? `${frameCount} frame(s) taken from a video` : 'this image'} for signs of AI generation, deepfake face-swapping or manipulation.
Check: skin texture and pores, hands/fingers and teeth, eyes (reflections, pupils, symmetry), hair and ear edges, lighting and shadow consistency,
text and logos (garbled lettering), background geometry, repeated patterns, compression or blending seams${isVideo ? ', and consistency between frames' : ''}.
Real photos can be low quality - blur or noise alone is not evidence of manipulation.

Reply with ONLY a JSON object:
{
  "score": <integer 0-100 authenticity, 0 = certainly AI-generated/manipulated, 100 = certainly authentic>,
  "verdict": "Likely Real" | "Uncertain" | "Likely Fake",
  "confidence": "High" | "Medium" | "Low",
  "analysis": "<2-3 sentence explanation>",
  "artifacts": ["<specific visual clue you observed>"]
}`;

const verdictFor = (score) => (score >= 65 ? 'Likely Real' : score <= 35 ? 'Likely Fake' : 'Uncertain');

async function visionAssessment(frames, isVideo) {
    const reply = await llm.chatJson([{
        role: 'user',
        content: [
            { type: 'text', text: PROMPT(isVideo, frames.length) },
            ...frames.map((frame) => ({ type: 'image_url', image_url: { url: `data:${frame.mediaType};base64,${frame.data}` } }))
        ]
    }], { vision: true, maxTokens: 500, temperature: 0.1 });
    const data = reply?.data;
    if (!data || typeof data.score !== 'number') return null;
    return {
        score: Math.max(0, Math.min(100, Math.round(data.score))),
        confidence: ['High', 'Medium', 'Low'].includes(data.confidence) ? data.confidence : 'Medium',
        analysis: String(data.analysis || '').slice(0, 800),
        artifacts: (Array.isArray(data.artifacts) ? data.artifacts : []).slice(0, 5).map((a) => String(a).slice(0, 120)),
        model: reply.model
    };
}

/**
 * @param {{ frames: {data: string, mediaType: string}[], original?: Buffer, isVideo: boolean }} input
 */
async function analyzeMedia({ frames, original, isVideo }) {
    const meta = forensics.scan(original || Buffer.from(frames[0].data, 'base64'));
    const vision = await visionAssessment(frames, isVideo);

    let score;
    let confidence;
    if (meta.decisive) {
        score = Math.min(meta.score, vision ? vision.score : 100);
        confidence = 'High';
    } else if (vision) {
        score = Math.round(vision.score * 0.85 + meta.score * 0.15);
        confidence = vision.confidence;
    } else {
        score = meta.score;
        confidence = 'Low';
    }

    const analysis = [
        vision?.analysis,
        ...meta.notes,
        !vision && !meta.decisive && (llm.isConfigured()
            ? 'The visual AI check could not run right now, so this verdict relies on metadata only.'
            : 'Visual AI inspection is not enabled on this server, so this verdict relies on metadata only.')
    ].filter(Boolean).join(' ');

    return {
        score,
        verdict: verdictFor(score),
        confidence,
        analysis,
        engine: [vision && 'vision-llm', 'metadata-forensics'].filter(Boolean),
        signals: {
            vision,
            forensics: {
                format: meta.format,
                aiSignatures: meta.aiSignatures,
                cameraMake: meta.cameraMake,
                hasExif: meta.hasExif,
                hasC2pa: meta.hasC2pa,
                editingSoftware: meta.editingSoftware,
                score: meta.score
            }
        }
    };
}

module.exports = { analyzeMedia };
