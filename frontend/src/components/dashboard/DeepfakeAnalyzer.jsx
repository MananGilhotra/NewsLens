/**
 * Deepfake / AI-image check. Images are downscaled in the browser, videos are sampled at three
 * points; the first 4 MB of the original file go along for metadata forensics.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UploadCloud, X, ScanFace, Loader2, RotateCcw, Camera, FileBadge, Wand2, Sparkles, AlertTriangle } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useHealth } from '../../context/HealthContext';
import { toneForVerdict } from '../../lib/verdict';
import ScoreGauge from '../ui/ScoreGauge';

const ease = [0.16, 1, 0.3, 1];
const MAX_BYTES = 100 * 1024 * 1024;
const HEAD_BYTES = 4 * 1024 * 1024;

function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
}

function canvasJpeg(source, width, height, maxSide = 1600) {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL('image/jpeg', 0.9).split(',')[1], mediaType: 'image/jpeg' };
}

async function imageFrames(url) {
    const img = new Image();
    img.src = url;
    await img.decode();
    return [canvasJpeg(img, img.naturalWidth, img.naturalHeight)];
}

async function videoFrames(url) {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = () => reject(new Error('This video format cannot be decoded by your browser'));
    });
    const frames = [];
    for (const point of [0.15, 0.5, 0.85]) {
        video.currentTime = Math.max(0, (video.duration || 0) * point);
        await new Promise((resolve) => { video.onseeked = resolve; });
        frames.push(canvasJpeg(video, video.videoWidth, video.videoHeight, 1280));
    }
    return frames;
}

function Dropzone({ onFile }) {
    const [drag, setDrag] = useState(false);
    const handle = (files) => files?.[0] && onFile(files[0]);
    return (
        <label
            htmlFor="media-input"
            onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
            className={`group relative flex min-h-[22rem] flex-col items-center justify-center overflow-hidden rounded-3xl p-10 text-center transition-colors duration-300 ${drag ? 'bg-violet/[0.08]' : 'bg-ink-800/60 hover:bg-white/[0.02]'}`}
        >
            <div aria-hidden="true" className={`pointer-events-none absolute inset-0 rounded-3xl border-[1.5px] border-dashed transition-colors duration-300 ${drag ? 'border-violet' : 'border-white/15 group-hover:border-white/25'}`} />
            <motion.div animate={drag ? { scale: 1.12, y: -6 } : { scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <UploadCloud className="h-7 w-7 text-violet" strokeWidth={1.5} />
            </motion.div>
            <p className="mt-6 font-display text-2xl text-paper">{drag ? 'Drop to inspect' : 'Drop an image or video'}</p>
            <p className="mt-2 text-sm text-muted">or <span className="text-lens underline-offset-4 group-hover:underline">browse your files</span> - JPG, PNG, WebP, GIF, MP4, WebM, MOV up to 100 MB</p>
            <input id="media-input" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => handle(e.target.files)} />
        </label>
    );
}

function ForensicRow({ icon: Icon, label, value, tone }) {
    const color = tone === 'good' ? 'text-real' : tone === 'bad' ? 'text-fake' : 'text-muted';
    return (
        <li className="flex items-center justify-between gap-4 py-3">
            <span className="flex items-center gap-2.5 text-sm text-paper"><Icon className="h-4 w-4 text-faint" strokeWidth={1.75} /> {label}</span>
            <span className={`text-right font-mono text-xs ${color}`}>{value}</span>
        </li>
    );
}

export default function DeepfakeAnalyzer() {
    const { health } = useHealth();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const previewRef = useRef(null);

    useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

    const choose = (selected) => {
        setError('');
        setResult(null);
        if (!/^(image|video)\//.test(selected.type)) return setError('Please choose an image or a video file.');
        if (selected.size > MAX_BYTES) return setError('That file is larger than 100 MB.');
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        return undefined;
    };

    const reset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError('');
    };

    const analyze = async () => {
        setAnalyzing(true);
        setError('');
        try {
            const isVideo = file.type.startsWith('video/');
            const [frames, head] = await Promise.all([
                isVideo ? videoFrames(preview) : imageFrames(preview),
                file.slice(0, HEAD_BYTES).arrayBuffer()
            ]);
            const response = await api.post('/analyze/deepfake', { frames, original: toBase64(head), isVideo, fileName: file.name });
            setResult(response.data.data);
        } catch (err) {
            setError(err.response ? errorMessage(err, 'Analysis failed') : err.message || 'Could not read this file');
        } finally {
            setAnalyzing(false);
        }
    };

    const isVideo = file?.type.startsWith('video/');
    const tone = result ? toneForVerdict(result.verdict) : null;
    const meta = result?.signals?.forensics;
    const vision = result?.signals?.vision;

    return (
        <div>
            <p className="eyebrow">Media forensics</p>
            <h1 className="mt-3 font-display text-display-md font-light text-paper">Real, or <em className="text-violet">rendered?</em></h1>
            <p className="mt-3 max-w-2xl text-muted">Check a photo or a video frame for signs of AI generation or manipulation. Files are processed for this check only.</p>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
                <div className="card p-3">
                    <AnimatePresence mode="wait">
                        {!file ? (
                            <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <Dropzone onFile={choose} />
                            </motion.div>
                        ) : (
                            <motion.div key="preview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease }}>
                                <div ref={previewRef} className="relative overflow-hidden rounded-[1.25rem] bg-ink-800">
                                    {isVideo
                                        ? <video src={preview} className="max-h-[30rem] w-full object-contain" controls muted />
                                        : <img src={preview} alt="Selected upload" className="max-h-[30rem] w-full object-contain" />}
                                    <AnimatePresence>
                                        {analyzing && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0">
                                                <div className="absolute inset-0 bg-[linear-gradient(rgba(167,139,250,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(167,139,250,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
                                                <motion.div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-violet/40 to-transparent"
                                                    animate={{ top: ['-15%', '100%'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <button type="button" onClick={reset} disabled={analyzing} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink/80 text-muted backdrop-blur transition-colors hover:text-fake" aria-label="Remove file">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-2 pt-4">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm text-paper">{file.name}</div>
                                        <div className="font-mono text-[0.65rem] uppercase text-faint">{file.type} · {(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                    </div>
                                    {!result && (
                                        <button type="button" onClick={analyze} disabled={analyzing} className="btn-primary">
                                            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Inspecting…</> : <><ScanFace className="h-4 w-4" /> Inspect {isVideo ? 'video' : 'image'}</>}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {error && (
                        <div className="m-3 flex items-start gap-3 rounded-2xl border border-fake/30 bg-fake/10 p-4 text-sm text-fake" role="alert">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                        </div>
                    )}
                </div>

                <div>
                    <AnimatePresence mode="wait">
                        {result ? (
                            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease }} className={`card p-6 md:p-8 ${tone.glow}`}>
                                <div className="flex flex-col items-center text-center">
                                    <ScoreGauge score={result.score} size={190} label="Authenticity" tone={tone} />
                                    <p className={`mt-5 font-display text-4xl font-light ${tone.text}`}>{result.verdict}</p>
                                    <p className="mt-1 eyebrow">{result.confidence} confidence</p>
                                </div>
                                <p className="mt-6 text-sm leading-relaxed text-muted">{result.analysis}</p>

                                {meta && (
                                    <ul className="mt-6 divide-y divide-white/[0.06] border-y border-white/[0.06]">
                                        <ForensicRow icon={Wand2} label="AI-generation tags" value={meta.aiSignatures.length ? meta.aiSignatures.join(', ') : 'None found'} tone={meta.aiSignatures.length ? 'bad' : 'good'} />
                                        <ForensicRow icon={Camera} label="Camera metadata" value={meta.cameraMake || (meta.hasExif ? 'EXIF, no maker' : 'Not present')} tone={meta.cameraMake ? 'good' : 'neutral'} />
                                        <ForensicRow icon={FileBadge} label="Content Credentials" value={meta.hasC2pa ? 'C2PA manifest' : 'Not present'} tone={meta.hasC2pa ? 'good' : 'neutral'} />
                                        <ForensicRow icon={Sparkles} label="Editing software" value={meta.editingSoftware.length ? meta.editingSoftware.join(', ') : 'None recorded'} tone="neutral" />
                                    </ul>
                                )}

                                {vision?.artifacts?.length > 0 && (
                                    <div className="mt-6">
                                        <p className="eyebrow mb-3">Visual clues</p>
                                        <ul className="space-y-2">
                                            {vision.artifacts.map((a, i) => (
                                                <motion.li key={a} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }} className="flex gap-2.5 text-sm text-paper-dim">
                                                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet" /> {a}
                                                </motion.li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {!vision && !health?.services?.llm?.enabled && (
                                    <p className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs leading-relaxed text-faint">
                                        Visual AI inspection isn’t enabled on this server - this result is based on file metadata only.
                                    </p>
                                )}
                                <button type="button" onClick={reset} className="btn-ghost mt-6 w-full"><RotateCcw className="h-4 w-4" /> Inspect another file</button>
                            </motion.div>
                        ) : (
                            <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                {[
                                    ['Provenance metadata', 'Generator tags (Stable Diffusion, Midjourney, DALL-E, Firefly…), IPTC “AI-generated” labels and C2PA Content Credentials.', Wand2],
                                    ['Camera fingerprints', 'EXIF maker data from phones and cameras - and editing software traces.', Camera],
                                    ['Visual inspection', health?.services?.llm?.enabled ? 'A vision model checks skin, hands, eyes, lighting, text and background geometry.' : 'Available when AI is enabled on the server: a vision model checks faces, hands, lighting and text.', ScanFace]
                                ].map(([title, text, Icon], i) => (
                                    <motion.div key={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08, ease }} className="card flex gap-4 p-5">
                                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-violet" strokeWidth={1.6} />
                                        <div>
                                            <h3 className="text-sm font-medium text-paper">{title}</h3>
                                            <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                                        </div>
                                    </motion.div>
                                ))}
                                <p className="px-1 pt-2 text-xs leading-relaxed text-faint">
                                    Metadata can be stripped or forged and detectors can be fooled - treat a result as evidence, not proof.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
