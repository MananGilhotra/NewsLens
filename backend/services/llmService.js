/**
 * LLM access with automatic failover between providers (order: LLM_PROVIDER_ORDER):
 *   - Groq (https://groq.com)            - very fast open models, built-in web search, vision
 *   - OpenRouter (https://openrouter.ai) - optional alternative, live web search with citations
 * A provider that fails with auth/credit/quota/overload errors is skipped for a cooldown period,
 * so one dead provider doesn't add latency to every request.
 * Every caller must handle `null` - the app keeps working without any LLM.
 */

const config = require('../config');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 25000;

const cooldowns = new Map(); // provider -> timestamp until which it is skipped
const COOLDOWN_MS = { 401: 10 * 60e3, 402: 10 * 60e3, 403: 10 * 60e3, 404: 60e3, 429: 60e3, 503: 45e3 };

class ProviderError extends Error {
    constructor(provider, status, message) {
        super(`${provider} ${status}: ${message}`);
        this.provider = provider;
        this.status = status;
    }
}

async function postJson(url, headers, body, provider) {
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body)
        });
    } catch (error) {
        throw new ProviderError(provider, error.name === 'TimeoutError' ? 'timeout' : 'network', error.message);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = data.error?.message || data.error?.metadata?.raw || JSON.stringify(data).slice(0, 200);
        throw new ProviderError(provider, response.status, message);
    }
    return data;
}

/* ------------------------------------- Groq ------------------------------------- */

async function callGroq(messages, { vision, temperature, maxTokens, json, webSearch }) {
    const primary = vision ? config.groq.visionModel : config.groq.model;
    const models = vision ? [primary] : [...new Set([primary, config.groq.fallbackModel])];
    let lastError;
    for (const candidate of models) {
        const isGptOss = candidate.startsWith('openai/gpt-oss');
        // Groq's built-in browser_search runs on the gpt-oss models. If a search attempt fails
        // (e.g. the model calls a tool that doesn't exist), retry the same model without search.
        for (const search of webSearch && isGptOss ? [true, false] : [false]) {
            try {
                const data = await postJson(GROQ_URL, { Authorization: `Bearer ${config.groq.apiKey}` }, {
                    model: candidate,
                    messages,
                    temperature,
                    // reasoning tokens share the completion budget
                    max_completion_tokens: Math.max(1024, maxTokens * 2),
                    ...(isGptOss ? { reasoning_effort: 'low' } : {}),
                    ...(candidate.startsWith('qwen/') ? { reasoning_format: 'hidden' } : {}),
                    // Groq rejects JSON mode together with tools - the prompt asks for JSON and parseJson extracts it
                    ...(json && !search ? { response_format: { type: 'json_object' } } : {}),
                    // always search: obvious hoaxes are exactly where published fact-checks matter most
                    ...(search ? { tools: [{ type: 'browser_search' }], tool_choice: 'required' } : {})
                }, 'groq');
                const message = data.choices?.[0]?.message || {};
                const content = String(message.content || '')
                    .replace(/<think>[\s\S]*?<\/think>/g, '')
                    .replace(/【[^】]*】/g, '') // inline citation markers like 【1†L16-L31】
                    .trim();
                if (!content) throw new ProviderError('groq', 'empty', 'empty response');
                const tools = message.executed_tools || [];
                const opened = new Set(tools.filter((t) => t.type !== 'browser_search').flatMap((t) => (t.search_results?.results || []).map((r) => r.url)));
                const sources = tools
                    .filter((t) => t.type === 'browser_search')
                    .flatMap((t) => t.search_results?.results || [])
                    .filter((r) => r.url)
                    .map((r) => ({ title: r.title || r.url, url: r.url }))
                    .sort((a, b) => Number(opened.has(b.url)) - Number(opened.has(a.url))); // pages it actually read first
                return { content, model: candidate, provider: 'groq', sources };
            } catch (error) {
                lastError = error;
                console.error(`[LLM] groq/${candidate}${search ? ' +web' : ''} failed: ${error.message.slice(0, 160)}`);
                if (error.status === 401) throw error;
                if (error.status === 429) break; // rate limited: the same model won't answer a retry either
            }
        }
    }
    throw lastError;
}

/* ---------------------------------- OpenRouter ---------------------------------- */

async function callOpenRouter(messages, { model, vision, temperature, maxTokens, json, webSearch }) {
    const primary = model || (vision ? config.openRouter.visionModel : config.openRouter.model);
    const models = [...new Set([primary, config.openRouter.fallbackModel])];
    let lastError;
    for (const candidate of models) {
        // Live web search costs a little extra - if the account can't pay for it, retry without
        for (const withSearch of webSearch ? [true, false] : [false]) {
            try {
                const data = await postJson(OPENROUTER_URL, {
                    Authorization: `Bearer ${config.openRouter.apiKey}`,
                    'HTTP-Referer': config.openRouter.siteUrl,
                    'X-Title': 'NewsLens'
                }, {
                    model: candidate,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                    ...(json ? { response_format: { type: 'json_object' } } : {}),
                    ...(withSearch ? { plugins: [{ id: 'web', max_results: 4 }] } : {})
                }, 'openrouter');
                const message = data.choices?.[0]?.message;
                const content = typeof message?.content === 'string' ? message.content : '';
                if (!content.trim()) throw new ProviderError('openrouter', 'empty', 'empty response');
                const sources = (message.annotations || [])
                    .filter((a) => a.type === 'url_citation' && a.url_citation?.url)
                    .map((a) => ({ title: a.url_citation.title || a.url_citation.url, url: a.url_citation.url }));
                return { content, model: data.model || candidate, provider: 'openrouter', sources };
            } catch (error) {
                lastError = error;
                console.error(`[LLM] openrouter/${candidate}${withSearch ? ' +web' : ''} failed: ${error.message.slice(0, 160)}`);
                if (error.status === 401) throw error; // bad key: no other model will work
                if (error.status === 402 && !withSearch) throw error; // out of credit
            }
        }
    }
    throw lastError;
}

/* ----------------------------------- Routing ------------------------------------ */

const PROVIDERS = {
    groq: { configured: () => Boolean(config.groq.apiKey), call: callGroq },
    openrouter: { configured: () => Boolean(config.openRouter.apiKey), call: callOpenRouter }
};

const configuredProviders = () => config.llmProviderOrder.filter((name) => PROVIDERS[name]?.configured());
const isConfigured = () => configuredProviders().length > 0;

/**
 * Sends a chat request (OpenAI message format; image parts as data URLs) to the first healthy provider.
 * @returns {Promise<null | { content: string, model: string, provider: string, sources: {title: string, url: string}[] }>}
 */
async function chat(messages, { model, vision = false, temperature = 0.1, maxTokens = 600, json = false, webSearch = false } = {}) {
    const providers = configuredProviders();
    const available = providers.filter((name) => (cooldowns.get(name) || 0) <= Date.now());
    // if every provider is cooling down, still try them rather than giving up immediately
    for (const name of available.length ? available : providers) {
        try {
            const result = await PROVIDERS[name].call(messages, { model: name === 'openrouter' ? model : undefined, vision, temperature, maxTokens, json, webSearch });
            cooldowns.delete(name);
            return result;
        } catch (error) {
            const wait = COOLDOWN_MS[error.status] || (error.status === 'timeout' ? 30e3 : 0);
            if (wait) cooldowns.set(name, Date.now() + wait);
            console.error(`[LLM] ${name} unavailable${wait ? ` - skipping it for ${Math.round(wait / 1000)}s` : ''}`);
        }
    }
    return null;
}

/** Extracts the first JSON object from a model reply (handles code fences and chatter). */
function parseJson(text) {
    if (!text) return null;
    const cleaned = text.replace(/```(?:json)?/gi, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end <= start) return null;
        try {
            return JSON.parse(cleaned.slice(start, end + 1));
        } catch {
            return null;
        }
    }
}

async function chatJson(messages, options = {}) {
    const reply = await chat(messages, { ...options, json: true });
    if (!reply) return null;
    const parsed = parseJson(reply.content);
    if (!parsed) {
        console.error('[LLM] Could not parse JSON reply:', reply.content.slice(0, 200));
        return null;
    }
    return { data: parsed, model: reply.model, provider: reply.provider, sources: reply.sources };
}

/** Public status for /api/health (no secrets). */
function status() {
    return {
        enabled: isConfigured(),
        providers: configuredProviders().map((name) => ({
            name,
            model: { groq: config.groq.model, openrouter: config.openRouter.model }[name],
            coolingDown: (cooldowns.get(name) || 0) > Date.now()
        })),
        webSearch: config.factCheckWebSearch && (PROVIDERS.groq.configured() || PROVIDERS.openrouter.configured())
    };
}

module.exports = { isConfigured, chat, chatJson, parseJson, status };
