/**
 * Shared text helpers for HTML and RSS content.
 */

const ENTITY_MAP = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
    rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', pound: '£', euro: '€', copy: '©'
};

const decodeEntities = (text) => String(text || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITY_MAP[name.toLowerCase()] ?? match);

/** HTML -> plain text that keeps paragraph breaks (block elements become blank lines). */
const htmlToText = (html) => decodeEntities(String(html || '')
    .replace(/<(script|style|noscript|figure|figcaption|button|nav|aside)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|section|article|tr|ul|ol|pre|header|footer)>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

module.exports = { decodeEntities, htmlToText };
