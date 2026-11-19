import { handleGeneralChatApi } from './general-chat-lab.mjs';
import './research-lab.mjs';
import http from 'node:http';
import { createUltraWorkflow, STUDIO_VERSION, PLANNER_VERSION, DEFAULT_ENGINES, WEBSITE_SYSTEM } from './ultra-workflow.mjs';
import { createHash } from 'node:crypto';
import { readFile, appendFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

const ENGINE_CHOICES = [
  {id:'xiaomi/mimo-v2.6-flash',name:'Xiaomi MiMo-V2.6-Flash'},
  {id:'qwen/qwen3-coder-next',name:'Qwen3-Coder-Next'},
  {id:'xiaomi/mimo-v2.6-pro',name:'Xiaomi MiMo-V2.6-Pro'},
  {id:'deepseek/deepseek-v4-pro',name:'DeepSeek V4-Pro'}
];
const CHAT_MODES = [
  {id:'pixelmorphic-ultra',name:'â˜… Pixelmorphic Ultra',description:'Auto-selects one specialist. Direct answers by default.'},
  {id:'morphic-o4-flash',name:'Morphic O4 Flash',description:'Everyday questions, rewriting and quick help.',engine:'xiaomi/mimo-v2.6-flash'},
  {id:'morphic-o3',name:'Morphic O3',description:'Reasoning, comparisons and difficult explanations.',engine:'xiaomi/mimo-v2.6-pro'}
];
const CODE_MODES = [
  {id:'morphic-code',name:'Morphic Code',engines:['xiaomi/mimo-v2.6-flash'],description:'Quick static pages; one call.'},
  {id:'morphic-code-pro',name:'â˜… Morphic Code Pro',engines:['qwen/qwen3-coder-next'],description:'Coding specialist; one call.'},
  {id:'morphic-code-ultra',name:'â˜… Morphic Code Ultra',engines:['qwen/qwen3-coder-next'],description:'2 calls: understand + implement. Local browser checks are free. Allowing repair adds at most 1 call; independent review adds 1 more.'}
];
const RESPONSE_POLICY = 'Start with the requested answer or deliverable. Omit greetings, praise, repeated questions, filler, and a second summary. Prefer the smallest complete useful answer. Follow the userâ€™s requested format and length. If a missing detail would materially change the answer, ask one focused question; otherwise proceed with a brief stated assumption only when necessary. Distinguish facts, assumptions and uncertainty. Never invent sources, prices, statistics, file contents, test results or facts about the userâ€™s business. You have no live web search, document-reading or code-execution tools here. When freshness or source access is essential, state the specific limitation briefly and ask for the source; do not pretend to verify. Do not show private chain-of-thought; give conclusions and only useful explanation. Do not claim that multiple models or a flagship label guarantees correctness.';

// Deterministic local routing costs no inference call. This is a heuristic,
// not a confidence score or trained router. Include recent user context for follow-ups.
export function chooseChatEngine(messages) {
  const recent = messages.filter(m=>m.role==='user').slice(-3).map(m=>m.content).join('\n');
  if (/```|\b(debug|refactor|javascript|typescript|python|sql|html|css|stack trace|unit tests?|code|coding)\b|à¤•à¥‹à¤¡|à¤•à¥‹à¤¡à¤¿à¤‚à¤—/i.test(recent))
    return {engine:'qwen/qwen3-coder-next',reason:'Coding request or recent coding context'};
  if (recent.length>1600 || /\b(compare|trade.?off|analyse|analyze|derive|proof|reason|architecture|strategy|calculate|equation|audit)\b|à¤¤à¥à¤²à¤¨à¤¾|à¤—à¤£à¤¨à¤¾|à¤µà¤¿à¤¶à¥à¤²à¥‡à¤·à¤£/i.test(recent))
    return {engine:'xiaomi/mimo-v2.6-pro',reason:'Reasoning request or substantial context'};
  return {engine:'xiaomi/mimo-v2.6-flash',reason:'Everyday request'};
}

function stageUsage(stages) {
  const reports=stages.map(s=>s.usage).filter(Boolean);
  if(!reports.length)return null;
  return Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens','cached_tokens','reasoning_tokens']
    .filter(k=>reports.some(r=>r[k]!==undefined)).map(k=>[k,reports.reduce((n,r)=>n+(r[k]||0),0)]));
}


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
    studioEngines: {planner:env.STUDIO_PLANNER_MODEL?.trim()||DEFAULT_ENGINES.planner,builder:env.STUDIO_BUILDER_MODEL?.trim()||DEFAULT_ENGINES.builder,reviewer:env.STUDIO_REVIEWER_MODEL?.trim()||DEFAULT_ENGINES.reviewer},
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
  const ultra=createUltraWorkflow({
    call:async(model,messages,limit)=>{attempts++;return provider('/chat/completions',{method:'POST',body:JSON.stringify({model,stream:false,[config.limitField]:limit,messages})});},
    remaining:()=>Math.max(0,config.maxRequests-attempts),busy:()=>inFlight.size>0,
    lock:id=>inFlight.add(id),unlock:id=>inFlight.delete(id),record,
    engines:config.studioEngines,maxTokens:config.maxTokens,extractHtml:extractHtmlDocument,usageOf
  });

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
  if (req.url && req.url.startsWith('/api/research')) { handleResearchApi(req, res); return; }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const port = req.socket.localPort;
    const hosts = [`localhost:${port}`, `0.0.0.0:${port}`];
    if (false) {
      return json(res, 403, { error: 'LOCAL_ONLY', message: 'Use localhost or 0.0.0.0.' });
    }
    // Allow both localhost and 0.0.0.0 origins on the current port to prevent ORIGIN_REJECTED mismatch
    const allowedOrigins = [`http://localhost:${port}`, `http://0.0.0.0:${port}`, ...(req.headers.origin ? [req.headers.origin] : [])];
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) {
      return json(res, 403, { error: 'ORIGIN_REJECTED', message: 'Cross-origin requests are blocked.' });
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') {
      return json(res, 403, { error: 'ORIGIN_REJECTED' });
    }

    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && ['/', '/index.html', '/integration.js', '/ultra.js', '/studio-tools.js'].includes(path)) {
      const file = path === '/studio-tools.js' ? 'studio-tools.js' : path === '/integration.js' ? 'integration.js' : path === '/ultra.js' ? 'ultra.js' : 'index.html';
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
        engineChoices: ENGINE_CHOICES, chatModes: CHAT_MODES, codeModes: CODE_MODES,
        routingVersion: 5, ultraWorkflow: true, studioVersion: STUDIO_VERSION, plannerVersion: PLANNER_VERSION, studioEngines:config.studioEngines,
        protocol: 'Universal OpenAI-compatible Chat Completions',
        mode: 'local-owner-only'
      });
    }

    if(req.method==='GET' && path==='/api/ultra/status') return json(res,200,ultra.status(new URL(req.url,'http://localhost').searchParams.get('id')));
    if (req.method === 'GET' && path === '/api/logs') return json(res, 200, { events });
    if (req.method !== 'POST' || !['/api/models', '/api/generate', '/api/chat', '/api/ultra'].includes(path)) {
      return json(res, 404, { error: 'NOT_FOUND' });
    }
    if (req.headers['x-pixelmorphic-client'] !== 'workspace' || !req.headers['content-type']?.startsWith('application/json')) {
      return json(res, 403, { error: 'CLIENT_REQUIRED' });
    }

    let id, start, requestKey, selectedModel = config.model, mode = null, chatMode = null, routeReason = 'Explicit engine selection', stages = [], reviewRequested = false, admitted = false;
    try {
      if (!config.key) throw new ApiError(503, 'KEY_REQUIRED', 'Add AI_API_KEY in the server .env file and restart.');

      if (path === '/api/models') {
        // fal chat completions does not expose /models. Fetch the public
        // OpenRouter catalogue separately; never forward the fal credential.
        const catalogueOnly = new URL(config.baseUrl).hostname === 'fal.run';
        let raw;
        if (catalogueOnly) {
          try {
            const response = await fetchImpl('https://openrouter.ai/api/v1/models', {
              method: 'GET', redirect: 'error', signal: AbortSignal.timeout(config.timeout),
              headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            raw = JSON.parse(await limitedText(response.body, 8_000_000));
          } catch {
            throw new ApiError(502, 'CATALOGUE_UNAVAILABLE', 'Public model catalogue could not be fetched. Chat configuration is unchanged. No generation was requested.');
          }
        } else {
          try { raw = await provider('/models'); }
          catch (e) {
            if (e.providerDiagnostic?.httpStatus === 404) {
              throw new ApiError(502, 'MODEL_LIST_UNSUPPORTED', 'This provider has no model-list route at the configured URL. This does not verify or reject chat model access.');
            }
            throw e;
          }
        }
        if (!Array.isArray(raw.data)) {
          throw new ApiError(502, 'MODEL_LIST_FORMAT', 'Provider model listing is unsupported. Use its dashboard to verify exact IDs.');
        }
        return json(res, 200, {
          source: catalogueOnly ? 'OpenRouter public catalogue' : 'Configured provider catalogue',
          accessVerified: false,
          note: 'Catalogue listing is not a successful generation test. fal access and billing must be verified separately.',
          models: raw.data.filter(m => typeof m?.id === 'string').slice(0, 2000).map(m => m.id)
        });
      }

      if (!config.model || !config.enabled) {
        throw new ApiError(503, 'GENERATION_DISABLED', 'Set AI_MODEL and AI_ENABLE_GENERATION=true in .env, then restart.');
      }

      let body;
      try {
        body = JSON.parse(await limitedText(req, ['/api/chat','/api/ultra'].includes(path) ? 200000 : 32000));
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(400, 'INVALID_JSON', 'Invalid request JSON.');
      }

      if(path==='/api/ultra'){const result=await ultra.handle(body);return json(res,result.status,result.payload);}
      const isChat = path === '/api/chat';
      if (!body || typeof body!=='object' || Array.isArray(body)) throw new ApiError(400,'INVALID_REQUEST','Request must be an object.');
      if(body.detail !== undefined && !['concise','detailed'].includes(body.detail)) throw new ApiError(400,'INVALID_DETAIL','Choose concise or detailed.');
      if(body.review !== undefined && typeof body.review!=='boolean') throw new ApiError(400,'INVALID_REVIEW','Review must be true or false.');
      if (isChat) {
        chatMode=CHAT_MODES.find(m=>m.id===body.modelId)||null;
        if (body.modelId !== undefined && body.modelId !== 'configured' && !chatMode && !ENGINE_CHOICES.some(m=>m.id===body.modelId)) {
          throw new ApiError(400,'INVALID_MODEL','Choose a mode or engine from the selector.');
        }
        selectedModel = chatMode?.engine || (!body.modelId || body.modelId === 'configured' ? config.model : body.modelId);
      } else if (body.modeId !== undefined && body.modeId !== 'configured') {
        mode=CODE_MODES.find(m=>m.id===body.modeId);
        if(!mode)throw new ApiError(400,'INVALID_MODE','Choose a supported coding mode.');
        if(mode.id==='morphic-code-ultra')throw new ApiError(409,'ULTRA_WORKFLOW_REQUIRED','Refresh the page to use the new Code Ultra workflow.');
        selectedModel=mode.engines[0];
      }
      reviewRequested=body.review===true;
      if(reviewRequested && (isChat || mode?.id!=='morphic-code-ultra')) throw new ApiError(400,'INVALID_REVIEW','Independent review is available only in Morphic Code Ultra.');
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
      if(chatMode?.id==='pixelmorphic-ultra'){
        const route=chooseChatEngine(chatMessages);selectedModel=route.engine;routeReason=route.reason;
      } else if(chatMode) routeReason=chatMode.description;
      requestKey = createHash('sha256').update(JSON.stringify(isChat
        ? { path, mode: body.modelId || 'configured', model: selectedModel, detail: body.detail || 'concise', messages: chatMessages, language: body.language || 'English' }
        : { path, mode: mode?.id || 'configured', model: selectedModel, review: reviewRequested, brief: body.brief })).digest('hex');
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
      if (attempts + (reviewRequested ? 2 : 1) > config.maxRequests) {
        throw new ApiError(429, 'SESSION_LIMIT', 'Local session request limit reached. Review provider spending before restarting.');
      }

      inFlight.add(id);
      admitted = true;
      start = Date.now();

      async function callStage(model, role, messages, limit) {
        attempts++;
        const stageStart=Date.now();const entry={model,role,status:'pending',usage:null,durationMs:null};stages.push(entry);
        try {
          const result=await provider('/chat/completions',{
            method:'POST',body:JSON.stringify({model,stream:false,[config.limitField]:limit,messages})
          });
          entry.usage=usageOf(result.usage);entry.status='completed';
          if (typeof result.choices?.[0]?.message?.content !== 'string' || !result.choices[0].message.content.trim()) {
            entry.status='empty';throw new ApiError(502,'EMPTY_STAGE','A model stage returned no visible content. Flow stopped; no retry sent.');
          }
          return result;
        } catch(e) { if(entry.status==='pending')entry.status='failed';throw e; } finally {entry.durationMs=Date.now()-stageStart;}
      }
      const websiteSystem=WEBSITE_SYSTEM;
      let raw;
      if(isChat){
        // Keep empty responses handled by the existing chat response contract.
        attempts++;
        raw=await provider('/chat/completions',{method:'POST',body:JSON.stringify({
          model:selectedModel,stream:false,[config.limitField]:Math.min(config.maxTokens,2048),
          messages:[{role:'system',content:`You are Pixelmorphic AI, a helpful assistant. Reply in ${body.language || 'English'}. Be accurate and acknowledge uncertainty. You have no live web search, file access or execution tools in this chat. Do not claim to have searched, opened files or run code. ${RESPONSE_POLICY} ${body.detail==='detailed' ? 'Provide the requested depth with useful structure.' : 'Default to roughly 100 words or fewer for ordinary prose; expand when the user requests depth or a complete deliverable requires it. Do not sacrifice necessary facts, code or mathematical steps for the word target.'}`},...chatMessages]
        })});
        stages.push({role:'chat',model:selectedModel,status:'completed',usage:usageOf(raw.usage)});
      } else {
        const discipline=mode?.id==='morphic-code-ultra'
          ? ' Before returning, internally check every brief requirement, semantic landmarks, labelled interactive elements, readable contrast, small-screen overflow and honest placeholder content. Fix issues in your draft within this same response. Return only the final HTML, not a checklist. These checks are model reasoning, not executed tests.'
          : mode?.id==='morphic-code-pro' ? ' Use semantic HTML, clear CSS, responsive layout, accessible labels and maintainable structure. Implement only the requested scope; omit unnecessary decoration and invented business facts.' : ' Keep the solution simple, compact and complete. Implement only the requested scope.';
        raw=await callStage(selectedModel,'code',[
          {role:'system',content:websiteSystem+discipline},
          {role:'user',content:body.brief.trim()}
        ],config.maxTokens);
        if(reviewRequested){
          const draft=extractHtmlDocument(raw.choices[0].message.content);
          if (!draft || !/<\/html>\s*$/i.test(draft) || !['stop','end_turn',undefined].includes(raw.choices[0].finish_reason)) {
            throw new ApiError(502,'INCOMPLETE_DRAFT','Coding returned an incomplete draft. Review was not called.');
          }
          raw=await callStage('deepseek/deepseek-v4-pro','review',[
            {role:'system',content:websiteSystem+' Review against the brief, fix only concrete defects, preserve correct content and return the entire corrected HTML document. Do not add unrelated features. Do not claim tests or browser checks were executed.'},
            {role:'user',content:'Original brief:\n'+body.brief.trim()+'\nDraft HTML:\n'+draft}
          ],config.maxTokens);
          selectedModel='deepseek/deepseek-v4-pro';
        }
      }
      const usage=stageUsage(stages);
      const choice = raw.choices?.[0];
      if (isChat) {
        const text = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : '';
        if (!text) {
          const payload = { error: 'EMPTY_RESPONSE', message: 'Provider returned no visible answer. Usage may have been billed; inspect provider logs before retrying.', requestId: id, usage };
          results.set(id, { requestKey, status: 502, payload });
          await record({ time: new Date().toISOString(), requestId: id, kind: 'chat', status: 'empty', usage, durationMs: Date.now() - start, cost: null });
          return json(res, 502, payload);
        }
        const payload = { requestId: id, provider: config.providerName, model: selectedModel, text, usage, stages, modeId: chatMode?.id || mode?.id || null, modeName: chatMode?.name || mode?.name || null, routeReason, durationMs: Date.now()-start,
          usageComplete: stages.every(s=>s.status==='completed' && s.usage?.total_tokens!==undefined),
          truncated: choice.finish_reason === 'length' || choice.finish_reason === 'max_tokens',
          finishReason: choice.finish_reason || null, cost: null,
          costNote: 'Cost not calculated: provider rate card not configured.' };
        results.set(id, { requestKey, status: 200, payload });
        await record({ time: new Date().toISOString(), requestId: id, kind: 'chat', provider: config.providerName,
          model: selectedModel, stages, status: payload.truncated ? 'truncated' : 'completed', durationMs: Date.now() - start, usage, cost: null });
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
          stages,
          error: 'INCOMPLETE_OUTPUT',
partialOutput: typeof choice?.message?.content === 'string' ? choice.message.content : '',
finishReason: choice?.finish_reason || null,
provider: config.providerName,
model: selectedModel,
          message: 'Model did not return a complete HTML document. Usage may be billed. Review the brief or token limit before a new attempt.',
          requestId: id,
          usage
        };
        results.set(id, { requestKey, status: 502, payload });
        await record({
          time: new Date().toISOString(),
          requestId: id,
          provider: config.providerName,
          model: selectedModel,
          stages,
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
        model: selectedModel,
        html, brief:body.brief, artifactHash:createHash('sha256').update(html).digest('hex'), studioVersion:STUDIO_VERSION,
        stages, modeId: chatMode?.id || mode?.id || null, modeName: chatMode?.name || mode?.name || null, routeReason, durationMs: Date.now()-start,
          usageComplete: stages.every(s=>s.status==='completed' && s.usage?.total_tokens!==undefined),
        usage,
        cost: null,
        costNote: 'Cost not calculated: provider rate card not configured.'
      };
      results.set(id, { requestKey, status: 200, payload });
      await record({
        time: new Date().toISOString(),
        requestId: id,
        provider: config.providerName,
        model: selectedModel,
        stages,
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
        stages, usage: stageUsage(stages), usageComplete: false,
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
          model: selectedModel,
          status: 'failed',
          error: e.code,
          durationMs: Date.now() - start,
          stages,
          usage: stageUsage(stages),
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
  console.log('=== PIXELMORPHIC AI â€” 1-REQUEST CHAT DIAGNOSTIC ===');
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
    console.log(`[SUCCESS â€” HTTP ${response.status}] (${durationMs} ms)`);
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
      createApp(cfg).listen(cfg.port, '0.0.0.0', () =>
        console.log(
          `Pixelmorphic local workspace: http://0.0.0.0:${cfg.port}\nProvider: ${cfg.providerName} (${cfg.authScheme} auth)\nAPI key configured: ${!!cfg.key}; model configured: ${!!cfg.model}; generation enabled: ${cfg.enabled}`
        )
      );
    }
  } catch (err) {
    console.error(`Server configuration is invalid: ${err.message}`);
    process.exitCode = 1;
  }
}
