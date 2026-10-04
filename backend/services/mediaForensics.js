/**
 * Metadata forensics for uploaded images/video frames - runs locally, no API needed.
 *
 * Looks for provenance evidence inside the file bytes:
 *   - generator signatures (Stable Diffusion / ComfyUI parameters, Midjourney, DALL-E, Firefly, ...)
 *   - IPTC "trainedAlgorithmicMedia" digital-source-type (the standard AI-generated label)
 *   - C2PA / Content Credentials manifests
 *   - camera EXIF (maker names) and editing software tags
 * Metadata can be stripped or forged, so absence of evidence is reported as such.
 */

const AI_SIGNATURES = [
    ['trainedAlgorithmicMedia', 'IPTC tag declares the image AI-generated'],
    ['compositeWithTrainedAlgorithmicMedia', 'IPTC tag declares AI-generated elements'],
    ['Stable Diffusion', 'Stable Diffusion generation parameters'],
    ['sd-metadata', 'Stable Diffusion metadata'],
    ['Negative prompt:', 'Diffusion-model prompt parameters'],
    ['ComfyUI', 'ComfyUI workflow'],
    ['"class_type"', 'ComfyUI node graph'],
    ['Midjourney', 'Midjourney signature'],
    ['DALL-E', 'DALL-E signature'],
    ['DALL·E', 'DALL-E signature'],
    ['Adobe Firefly', 'Adobe Firefly signature'],
    ['NovelAI', 'NovelAI signature'],
    ['Leonardo.Ai', 'Leonardo.Ai signature'],
    ['Ideogram', 'Ideogram signature'],
    ['Made with Google AI', 'Google AI signature'],
    ['Imagen', 'Google Imagen signature'],
    ['Bing Image Creator', 'Bing Image Creator signature'],
    ['GPT-4o', 'OpenAI image generation signature'],
    ['Flux.1', 'FLUX model signature'],
    ['invokeai', 'InvokeAI metadata']
];
const CAMERA_MAKERS = ['Canon', 'NIKON', 'SONY', 'Apple', 'samsung', 'Google', 'FUJIFILM', 'OLYMPUS', 'Panasonic', 'HUAWEI',
    'Xiaomi', 'OnePlus', 'LEICA', 'PENTAX', 'RICOH', 'GoPro', 'DJI', 'HMD Global', 'motorola', 'OPPO', 'vivo'];
const EDITORS = ['Adobe Photoshop', 'Lightroom', 'GIMP', 'Snapseed', 'Pixelmator', 'Affinity Photo', 'Canva', 'PicsArt', 'Facetune'];

const MAX_SCAN = 4 * 1024 * 1024;

function detectFormat(buffer) {
    if (buffer.length < 12) return 'unknown';
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
    if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buffer.slice(0, 4).toString('latin1') === 'RIFF' && buffer.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
    if (buffer.slice(0, 3).toString('latin1') === 'GIF') return 'gif';
    if (buffer.slice(4, 8).toString('latin1') === 'ftyp') return 'mp4';
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return 'webm';
    return 'unknown';
}

/**
 * @param {Buffer} buffer original file bytes (or the first few MB of them)
 */
function scan(buffer) {
    const bytes = buffer.length > MAX_SCAN ? buffer.subarray(0, MAX_SCAN) : buffer;
    const text = bytes.toString('latin1');
    const lower = text.toLowerCase();
    const has = (needle) => lower.includes(needle.toLowerCase());

    const aiSignatures = [...new Set(AI_SIGNATURES.filter(([needle]) => has(needle)).map(([, label]) => label))];
    const hasPngParameters = /tEXtparameters\0[\s\S]{0,4000}Steps: \d+/.test(text);
    if (hasPngParameters && !aiSignatures.includes('Diffusion-model prompt parameters')) aiSignatures.push('Diffusion-model prompt parameters');

    const hasExif = text.includes('Exif\0\0');
    const exifWindow = hasExif ? text.slice(text.indexOf('Exif\0\0'), text.indexOf('Exif\0\0') + 65536) : '';
    const cameraMake = hasExif ? CAMERA_MAKERS.find((maker) => exifWindow.includes(maker)) || null : null;
    const editingSoftware = EDITORS.filter((editor) => has(editor));
    const hasC2pa = has('c2pa') || has('jumbf');

    const notes = [];
    let score = 55;
    if (aiSignatures.length) {
        score = 6;
        notes.push(`File metadata contains AI-generation evidence: ${aiSignatures.join(', ')}.`);
    } else {
        if (cameraMake) {
            score += 14;
            notes.push(`Camera EXIF data found (${cameraMake}).`);
        } else if (hasExif) {
            score += 5;
            notes.push('EXIF metadata present but no camera maker recorded.');
        } else {
            notes.push('No camera metadata - common for screenshots, social-media re-uploads and AI images alike.');
        }
        if (hasC2pa) {
            score += 6;
            notes.push('Content Credentials (C2PA) manifest present without an AI-generation claim.');
        }
        if (editingSoftware.length) {
            score -= 8;
            notes.push(`Edited with ${editingSoftware.join(', ')} (editing is not proof of manipulation).`);
        }
    }

    return {
        format: detectFormat(bytes),
        bytesScanned: bytes.length,
        aiSignatures,
        hasExif,
        cameraMake,
        hasC2pa,
        editingSoftware,
        score: Math.max(0, Math.min(100, score)),
        decisive: aiSignatures.length > 0,
        notes
    };
}

module.exports = { scan, detectFormat };
