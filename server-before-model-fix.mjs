import http from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE_URL = 'https://api.samuraiapi.io/v1';

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function integer(value, fallback, min, max) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error('Invalid numeric server configuration.');
  }
  return n;
}

function isPrivateOrLocalHost(hostname) {
  const h = hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h === '0.0.0.0' ||
    h === '[::1]' ||
    h === '[::]' ||
    h.endsWith('.local') ||
    h.endsWith('.localhost')
  ) {
    return true;
  }
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) {
    return true;
  }
  const m172 = h.match(/^172\.(\d{1,3})\./);
  if (m172 && Number(m172[1]) >= 16 && Number(m172[1]) <= 31) {
    return true;
  }
  return false;
}

function detectProviderMeta(hostname, explicitScheme) {
  const h = hostname.toLowerCase();
  const isFal = h === 'fal.run' || h.endsWith('.fal.run') || h === 'fal.ai' || h.endsWith('.fal.ai');
  const authScheme = explicitScheme || (isFal ? 'Key' : 'Bearer');
  if (!['Bearer', 'Key'].includes(authScheme)) {
    throw new Error('Unsupported AI_AUTH_SCHEME. Use Bearer or Key.');
  }

  let providerName = hostname;
  if (h.includes('samuraiapi.io')) providerName = 'Samurai API';
  else if (isFal) providerName = 'fal.ai (OpenRouter)';
  else if (h.includes('openrouter.ai')) providerName = 'OpenRouter';
  else if (h.includes('deepseek.com')) providerName = 'DeepSeek API';
  else if (h.includes('googleapis.com')) providerName = 'Google Gemini API';
  else if (h.includes('groq.com')) providerName = 'GroqCloud';
  else if (h.includes('openai.com')) providerName = 'OpenAI API';
  else if (h.includes('together.xyz')) providerName = 'Together AI';

  return { providerName, authScheme, isFal };
}

export function validateBaseUrl(rawUrl) {
  const trimmed = (rawUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid AI_BASE_URL format. Provide a full https:// URL.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('AI_BASE_URL must use https:// for API key security.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('AI_BASE_URL must not contain credentials, query parameters, or fragments.');
  }
  if (!parsed.hostname || isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error('AI_BASE_URL must point to a public HTTPS API provider.');
  }
  return { baseUrl: trimmed, hostname: parsed.hostname };
}

export function configuration(env = process.env) {
  const { baseUrl, hostname } = validateBaseUrl(env.AI_BASE_URL);
  const { providerName, authScheme, isFal } = detectProviderMeta(
    hostname,
    env.AI_AUTH_SCHEME?.trim()
  );
  const limitField = env.AI_OUTPUT_LIMIT_FIELD || 'max_tokens';
  if (!['max_tokens', 'max_completion_tokens'].includes(limitField)) {
    throw new Error('Unsupported output limit field.');
  }
  return {
    baseUrl,
    providerName,
    authScheme,
    isFal,
    key: env.AI_API_KEY?.trim() || '',
    model: env.AI_MODEL?.trim() || '',
    enabled: env.AI_ENABLE_GENERATION === 'true',
    limitField,
    maxTokens: integer(env.AI_MAX_OUTPUT_TOKENS, 4096, 128, 16384),
    timeout: integer(env.AI_TIMEOUT_MS, 120000, 100, 300000),
    maxRequests: integer(env.AI_MAX_REQUESTS_PER_SESSION, 10, 1, 100),
    port: integer(env.PORT, 3000, 1, 65535)
  };
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

async function limitedText(stream, max) {
  if (!stream) return '';
  let n = 0;
  const chunks = [];
  for await (const chunk of stream) {
    const b = Buffer.from(chunk);
    n += b.length;
    if (n > max) {
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request or response exceeded the size limit.');
    }
    chunks.push(b);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function usageOf(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const k of ['prompt_tokens', 'completion_tokens', 'total_tokens']) {
    if (Number.isSafeInteger(raw[k]) && raw[k] >= 0) out[k] = raw[k];
  }
  for (const [from, to] of [
    ['prompt_tokens_details', 'cached_tokens'],
    ['completion_tokens_details', 'reasoning_tokens']
  ]) {
    if (Number.isSafeInteger(raw[from]?.[to]) && raw[from][to] >= 0) out[to] = raw[from][to];
  }
  return Object.keys(out).length ? out : null;
}

function providerError(status) {
  if ([401, 403].includes(status)) {
    return new ApiError(502, 'PROVIDER_AUTH', 'Provider rejected the key or model access. Check your server settings.');
  }
  if (status === 429) {
    return new ApiError(429, 'PROVIDER_RATE_LIMIT', 'Provider rate or quota limit reached. Check the provider dashboard before retrying.');
  }
  if ([400, 404, 422].includes(status)) {
    return new ApiError(502, 'PROVIDER_REQUEST', 'Provider rejected the model or request format. Check its model ID and API documentation.');
  }
  if (status === 402) {
    return new ApiError(502, 'PROVIDER_BALANCE', 'Provider requires balance or billing activation.');
  }
  return new ApiError(502, 'PROVIDER_UNAVAILABLE', 'Provider request failed. Check the provider dashboard before another attempt.');
}

function sanitizeDiagnosticText(text, key) {
  if (typeof text !== 'string' || !text.trim()) return '';
  let clean = text;
  if (key) clean = clean.split(key).join('[redacted]');
  clean = clean
    .replace(/\b(sk|key|pk|rk|or-v1)-[a-zA-Z0-9_-]{8,}\b/gi, '[redacted-key]')
    .replace(/Bearer\s+[a-zA-Z0-9._:-]+/gi, 'Bearer [redacted]')
    .replace(/Key\s+[a-zA-Z0-9._:-]+/gi, 'Key [redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.slice(0, 240);
}

// Pixelmorphic safe provider diagnostics v2 (Universal + redacted detail).
async function providerDiagnostic(response, key) {
  const info = {
    httpStatus: response.status,
    reasonHint: 'unrecognized',
    bodyStatus: 'unavailable'
  };
  let text = '';
  try {
    text = await limitedText(response.body, 16384);
  } catch {
    return info;
  }
  if (!text.trim()) return info;

  let raw;
  try {
    raw = JSON.parse(text);
    info.bodyStatus = 'json';
  } catch {
    info.bodyStatus = 'text';
    const lowerText = sanitizeDiagnosticText(text, key).toLowerCase();
    if (/cloudflare|just a moment|attention required|captcha| firewall/.test(lowerText)) {
      info.reasonHint = 'gateway_block';
    }
    return info;
  }

  const error = raw?.error;
  for (const value of [error?.code, error?.type, raw?.code, raw?.detail?.type]) {
    if ((typeof value === 'string' || typeof value === 'number') && String(value) !== key) {
      const codeStr = sanitizeDiagnosticText(String(value), key).slice(0, 64);
      if (codeStr) {
        info.providerCode = codeStr;
        break;
      }
    }
  }

  const rawMsg =
    typeof error === 'string'
      ? error
      : error?.message ?? error?.metadata?.raw ?? raw?.message ?? raw?.detail ?? '';
  const safeDetail = sanitizeDiagnosticText(typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg), key);
  if (safeDetail) info.safeDetail = safeDetail;
  const message = safeDetail.toLowerCase();

  if (/invalid.{0,20}(api.?key|token)|incorrect.{0,20}api.?key|authentication failed|unauthorized|invalid_api_key/.test(message))
    info.reasonHint = 'credential_rejected';
  else if (/insufficient.{0,20}(balance|quota|credit)|quota.{0,20}exceed|balance.{0,20}(low|exhaust|insufficient)|exhausted balance|locked/.test(message))
    info.reasonHint = 'quota_or_balance';
  else if (/model.{0,50}(not allowed|not found|not available|not supported|access denied)|no access.{0,30}model|no available channel|channel.{0,30}not found|distributor/.test(message))
    info.reasonHint = 'model_access';
  else if (/(subscription|plan|group).{0,40}(expired|inactive|not active|not allowed|permission)/.test(message))
    info.reasonHint = 'subscription_access';
  else if (/ip.{0,20}(blocked|not allowed|whitelist)|whitelist/.test(message))
    info.reasonHint = 'ip_restriction';
  else if (/cloudflare|captcha|firewall|waf/.test(message))
    info.reasonHint = 'gateway_block';

  return info;
}

function extractHtmlDocument(rawContent) {
  if (typeof rawContent !== 'string') return '';
  let content = rawContent.trim();
  content = content.replace(/^<think>[\s\S]*?<\/think>\s*/i, '').trim();
  const fenced = content.match(/```(?:html)?\s*([\s\S]*?)\s*```/i);
  if (fenced && /<html[\s>]/i.test(fenced[1])) {
    content = fenced[1].trim();
  } else {
    content = content.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const htmlMatch = content.match(/(?:<!doctype html>\s*)?<html[\s>][\s\S]*<\/html>/i);
  if (htmlMatch) {
    return htmlMatch[0].trim();
  }
  return content;
}

async function diskAudit(entry) {
  const folder = join(root, 'logs');
  await mkdir(folder, { recursive: true, mode: 0o700 });
  await appendFile(join(folder, 'api.jsonl'), JSON.stringify(entry) + '\n', { mode: 0o600 });
}

export function createApp(config, { fetchImpl = fetch, audit = diskAudit } = {}) {
  const inFlight = new Set();
  const results = new Map();
  const events = [];
  let attempts = 0;

  async function record(entry) {
    events.unshift(entry);
    events.splice(100);
    try {
      await audit(entry);
    } catch {
      console.error('Audit file unavailable; metadata retained in process memory.');
    }
  }

  async function provider(path, init = {}) {
    let response;
    try {
      const authScheme = config.authScheme || 'Bearer';
      response = await fetchImpl(config.baseUrl + path, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(config.timeout),
        headers: {
          Authorization: `${authScheme} ${config.key}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const detail = await providerDiagnostic(response, config.key);
        const failure = providerError(response.status);
        failure.providerDiagnostic = detail;
        failure.message +=
          ' HTTP ' +
          detail.httpStatus +
          '; diagnostic hint: ' +
          detail.reasonHint +
          (detail.providerCode ? '; provider code: ' + detail.providerCode : '') +
          (detail.safeDetail ? '; provider detail: "' + detail.safeDetail + '"' : '') +
          '. Hints are not a confirmed diagnosis.';
        throw failure;
      }
      const text = await limitedText(response.body, 2_000_000);
      try {
        return JSON.parse(text);
      } catch {
        throw new ApiError(502, 'INVALID_PROVIDER_JSON', 'Provider returned an unexpected response format.');
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (['TimeoutError', 'AbortError'].includes(e.name)) {
        throw new ApiError(504, 'PROVIDER_TIMEOUT', 'Provider timed out. Billing status is unknown; check the provider dashboard before retrying.');
      }
      throw new ApiError(502, 'PROVIDER_NETWORK', 'Provider could not be reached. No automatic retry was sent.');
    }
  }

  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const port = req.socket.localPort;
    const hosts = [`localhost:${port}`, `127.0.0.1:${port}`];
    if (!hosts.includes(req.headers.host)) {
      return json(res, 403, { error: 'LOCAL_ONLY', message: 'Use localhost or 127.0.0.1.' });
    }
    // Allow both localhost and 127.0.0.1 origins on the current port to prevent ORIGIN_REJECTED mismatch
    const allowedOrigins = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
      return json(res, 403, { error: 'ORIGIN_REJECTED', message: 'Cross-origin requests are blocked.' });
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') {
      return json(res, 403, { error: 'ORIGIN_REJECTED' });
    }

    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && ['/', '/index.html', '/integration.js'].includes(path)) {
      const file = path === '/integration.js' ? 'integration.js' : 'index.html';
      try {
        res.writeHead(200, {
          'Content-Type': file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Security-Policy':
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-src 'self' about:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
        });
        return res.end(await readFile(join(root, 'public', file)));
      } catch {
        return res.end('Application file unavailable.');
      }
    }

    if (req.method === 'GET' && path === '/api/status') {
      return json(res, 200, {
        provider: config.providerName || 'Samurai API',
        baseUrl: config.baseUrl,
        authScheme: config.authScheme || 'Bearer',
        keyConfigured: !!config.key,
        model: config.model,
        enabled: config.enabled,
        ready: !!(config.key && config.model && config.enabled),
        remainingAttempts: Math.max(0, config.maxRequests - attempts),
        maxOutputTokens: config.maxTokens,
        chatMaxOutputTokens: Math.min(config.maxTokens, 2048),
        chatEnabled: true,
        protocol: 'Universal OpenAI-compatible Chat Completions',
        mode: 'local-owner-only'
      });
    }

    if (req.method === 'GET' && path === '/api/logs') return json(res, 200, { events });
    if (req.method !== 'POST' || !['/api/models', '/api/generate', '/api/chat'].includes(path)) {
      return json(res, 404, { error: 'NOT_FOUND' });
    }
    if (req.headers['x-pixelmorphic-client'] !== 'workspace' || !req.headers['content-type']?.startsWith('application/json')) {
      return json(res, 403, { error: 'CLIENT_REQUIRED' });
    }

    let id, start, requestKey, admitted = false;
    try {
      if (!config.key) throw new ApiError(503, 'KEY_REQUIRED', 'Add AI_API_KEY in the server .env file and restart.');

      if (path === '/api/models') {
        const raw = await provider('/models');
        if (!Array.isArray(raw.data)) {
          throw new ApiError(502, 'MODEL_LIST_FORMAT', 'Provider model listing is unsupported. Use its dashboard to verify exact IDs.');
        }
        return json(res, 200, {
          models: raw.data.filter(m => typeof m?.id === 'string').slice(0, 2000).map(m => m.id)
        });
      }

      if (!config.model || !config.enabled) {
        throw new ApiError(503, 'GENERATION_DISABLED', 'Set AI_MODEL and AI_ENABLE_GENERATION=true in .env, then restart.');
      }

      let body;
      try {
        body = JSON.parse(await limitedText(req, path === '/api/chat' ? 128000 : 32000));
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(400, 'INVALID_JSON', 'Invalid request JSON.');
      }

      const isChat = path === '/api/chat';
      let chatMessages;
      if (isChat) {
        if (!Array.isArray(body?.messages) || body.messages.length < 1 || body.messages.length > 24 ||
            body.messages.some((m,i) => !m || m.role !== (i % 2 ? 'assistant' : 'user') ||
              typeof m.content !== 'string' || !m.content.trim() || m.content.length > 6000) ||
            body.messages.at(-1)?.role !== 'user' ||
            body.messages.reduce((n,m) => n + m.content.length, 0) > 18000) {
          throw new ApiError(400, 'INVALID_MESSAGES', 'Provide alternating user/assistant messages ending with a user message, up to 6000 characters each and 18000 total.');
        }
        if (body.language !== undefined && !['English', 'Hindi', 'Hinglish'].includes(body.language)) {
          throw new ApiError(400, 'INVALID_LANGUAGE', 'Choose English, Hindi or Hinglish.');
        }
        chatMessages = body.messages.map(m => ({ role: m.role, content: m.content.trim() }));
      } else if (typeof body?.brief !== 'string' || body.brief.trim().length < 15 || body.brief.length > 6000 || body.category !== 'code') {
        throw new ApiError(400, 'INVALID_BRIEF', 'Provide a coding brief between 15 and 6000 characters.');
      }
      requestKey = createHash('sha256').update(JSON.stringify(isChat
        ? { path, messages: chatMessages, language: body.language || 'English' }
        : { path, brief: body.brief })).digest('hex');
      if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(body.requestId)) {
        throw new ApiError(400, 'INVALID_REQUEST_ID', 'A valid request ID is required.');
      }

      id = body.requestId;
      if (results.has(id)) {
        const saved = results.get(id);
        if (saved.requestKey !== requestKey) {
          throw new ApiError(409, 'REQUEST_ID_REUSED', 'Use a new request ID for a different brief.');
        }
        return json(res, saved.status, saved.payload);
      }
      if (inFlight.has(id)) throw new ApiError(409, 'JOB_RUNNING', 'This request is already running.');
      if (inFlight.size >= 1) throw new ApiError(429, 'BUSY', 'One job is already running. Wait for it to finish.');
      if (attempts >= config.maxRequests) {
        throw new ApiError(429, 'SESSION_LIMIT', 'Local session request limit reached. Review provider spending before restarting.');
      }

      attempts++;
      inFlight.add(id);
      admitted = true;
      start = Date.now();

      const raw = await provider('/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: config.model,
          stream: false,
          [config.limitField]: isChat ? Math.min(config.maxTokens, 2048) : config.maxTokens,
          messages: isChat ? [
            {role: 'system', content: `You are Pixelmorphic AI, a helpful assistant. Reply in ${body.language || 'English'}. Be accurate and acknowledge uncertainty. You have no live web search, file access or execution tools in this chat. Do not claim to have searched, opened files or run code. Give concise explanations and useful steps.`},
            ...chatMessages
          ] : [
            {
              role: 'system',
              content:
                'Create a complete responsive single-file HTML/CSS website for the brief. Return only HTML starting with <!doctype html>. Use inline CSS, no JavaScript, no external resources, no forms that submit data. Use placeholders for missing business facts. Do not claim working payments or authentication. Do not include secrets. The result will be previewed with scripts and network disabled.'
            },
            { role: 'user', content: body.brief.trim() }
          ]
        })
      });

      const usage = usageOf(raw.usage);
      const choice = raw.choices?.[0];
      if (isChat) {
        const text = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : '';
        if (!text) {
          const payload = { error: 'EMPTY_RESPONSE', message: 'Provider returned no visible answer. Usage may have been billed; inspect provider logs before retrying.', requestId: id, usage };
          results.set(id, { requestKey, status: 502, payload });
          await record({ time: new Date().toISOString(), requestId: id, kind: 'chat', status: 'empty', usage, durationMs: Date.now() - start, cost: null });
          return json(res, 502, payload);
        }
        const payload = { requestId: id, provider: config.providerName, model: config.model, text, usage,
          truncated: choice.finish_reason === 'length' || choice.finish_reason === 'max_tokens',
          finishReason: choice.finish_reason || null, cost: null,
          costNote: 'Cost not calculated: provider rate card not configured.' };
        results.set(id, { requestKey, status: 200, payload });
        await record({ time: new Date().toISOString(), requestId: id, kind: 'chat', provider: config.providerName,
          model: config.model, status: payload.truncated ? 'truncated' : 'completed', durationMs: Date.now() - start, usage, cost: null });
        return json(res, 200, payload);
      }
      const html = extractHtmlDocument(choice?.message?.content);
      const finishOk = !choice?.finish_reason || ['stop', 'end_turn'].includes(choice.finish_reason);
      const complete =
        finishOk &&
        typeof html === 'string' &&
        /^(?:<!doctype html>\s*)?<html[\s>]/i.test(html) &&
        /<\/html>\s*$/i.test(html);

      if (!complete) {
        const payload = {
          error: 'INCOMPLETE_OUTPUT',
partialOutput: typeof choice?.message?.content === 'string' ? choice.message.content : '',
finishReason: choice?.finish_reason || null,
provider: config.providerName,
model: config.model,
          message: 'Model did not return a complete HTML document. Usage may be billed. Review the brief or token limit before a new attempt.',
          requestId: id,
          usage
        };
        results.set(id, { requestKey, status: 502, payload });
        await record({
          time: new Date().toISOString(),
          requestId: id,
          provider: config.providerName,
          model: config.model,
          status: 'incomplete',
          durationMs: Date.now() - start,
          usage,
          cost: null
        });
        return json(res, 502, payload);
      }

      const payload = {
        requestId: id,
        provider: config.providerName,
        model: config.model,
        html,
        usage,
        cost: null,
        costNote: 'Cost not calculated: provider rate card not configured.'
      };
      results.set(id, { requestKey, status: 200, payload });
      await record({
        time: new Date().toISOString(),
        requestId: id,
        provider: config.providerName,
        model: config.model,
        status: 'completed',
        durationMs: Date.now() - start,
        usage,
        cost: null
      });
      return json(res, 200, payload);
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(500, 'SERVER_ERROR', 'Unexpected server error. Check local server status.');
      const payload = {
        error: e.code,
        message: e.message,
        ...(id ? { requestId: id } : {}),
        ...(e.providerDiagnostic ? { providerDiagnostic: e.providerDiagnostic } : {})
      };
      if (admitted) {
        results.set(id, { requestKey, status: e.status, payload });
        await record({
          time: new Date().toISOString(),
          requestId: id,
          provider: config.providerName,
          model: config.model,
          status: 'failed',
          error: e.code,
          durationMs: Date.now() - start,
          usage: null,
          cost: null,
          billingStatus: 'unknown',
          ...(e.providerDiagnostic ? { providerDiagnostic: e.providerDiagnostic } : {})
        });
      }
      return json(res, e.status, payload);
    } finally {
      if (admitted) inFlight.delete(id);
    }
  });
}

// Single-request safe CLI diagnostic mode: node --env-file=.env server.mjs --test-chat
export async function runDiagnosticChat(cfg, fetchImpl = fetch) {
  console.log('=== PIXELMORPHIC AI — 1-REQUEST CHAT DIAGNOSTIC ===');
  console.log(`Provider     : ${cfg.providerName}`);
  console.log(`Base URL     : ${cfg.baseUrl}`);
  console.log(`Auth Scheme  : ${cfg.authScheme} (key loaded: ${!!cfg.key})`);
  console.log(`Model        : ${cfg.model || '(not set)'}`);
  console.log('Prompt       : "Reply only: OK" (max 16 tokens, 0 retries)');
  console.log('---------------------------------------------------');

  if (!cfg.key) {
    console.error('[LOCAL CONFIG ERROR] AI_API_KEY is missing in .env.');
    process.exitCode = 1;
    return;
  }
  if (!cfg.model) {
    console.error('[LOCAL CONFIG ERROR] AI_MODEL is missing in .env.');
    process.exitCode = 1;
    return;
  }

  const start = Date.now();
  try {
    const response = await fetchImpl(cfg.baseUrl + '/chat/completions', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(cfg.timeout),
      headers: {
        Authorization: `${cfg.authScheme} ${cfg.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: cfg.model,
        stream: false,
        [cfg.limitField]: 16,
        messages: [{ role: 'user', content: 'Reply only: OK' }]
      })
    });

    const durationMs = Date.now() - start;
    if (!response.ok) {
      const diag = await providerDiagnostic(response, cfg.key);
      console.error(`[PROVIDER HTTP ${response.status} FAILURE] (${durationMs} ms)`);
      console.error('Diagnostic:', JSON.stringify(diag, null, 2));
      process.exitCode = 1;
      return;
    }

    const raw = JSON.parse(await limitedText(response.body, 200_000));
    const reply = raw?.choices?.[0]?.message?.content?.trim() ?? '(empty content)';
    const usage = usageOf(raw?.usage);
    console.log(`[SUCCESS — HTTP ${response.status}] (${durationMs} ms)`);
    console.log(`Model Reply  : ${reply}`);
    console.log(`Token Usage  : ${usage ? JSON.stringify(usage) : 'not reported'}`);
  } catch (err) {
    console.error(`[NETWORK / RUNTIME FAILURE] (${Date.now() - start} ms): ${err.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const cfg = configuration();
    if (process.argv.includes('--test-chat')) {
      await runDiagnosticChat(cfg);
    } else {
      createApp(cfg).listen(cfg.port, '127.0.0.1', () =>
        console.log(
          `Pixelmorphic local workspace: http://127.0.0.1:${cfg.port}\nProvider: ${cfg.providerName} (${cfg.authScheme} auth)\nAPI key configured: ${!!cfg.key}; model configured: ${!!cfg.model}; generation enabled: ${cfg.enabled}`
        )
      );
    }
  } catch (err) {
    console.error(`Server configuration is invalid: ${err.message}`);
    process.exitCode = 1;
  }
}