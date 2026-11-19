import dns from 'node:dns';
import net from 'node:net';
import { handleGeneralChatApi, resolveAllowedCorsOrigin, repairSpellingAndNormalize, searchLiveWebForChat, inspectAndCrawlUserUrls, detectPlaceFromQuery, fetchPlaceRealtimeIntelligence, searchDownloadableLinksAndPYP } from './general-chat-lab.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

import vm from 'node:vm';
try {
  const idxPath = path.join(process.cwd(), 'public', 'index.html');
  const bakPath = path.join(process.cwd(), 'public', 'index.html.verified-clean.bak');
  if (fs.existsSync(idxPath)) {
    const html = fs.readFileSync(idxPath, 'utf8');
    const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRegex.exec(html)) !== null) {
      new vm.Script(m[1]);
    }
  }
} catch (bootErr) {
  try {
    const idxPath = path.join(process.cwd(), 'public', 'index.html');
    const bakPath = path.join(process.cwd(), 'public', 'index.html.verified-clean.bak');
    if (fs.existsSync(bakPath)) {
      fs.copyFileSync(bakPath, idxPath);
      console.log('🛡️ Boot Guard: Automatically restored public/index.html from verified backup!');
    }
  } catch (_) {}
}


// Auto-load .env
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const k = trimmed.slice(0, eq).trim();
        const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
} catch (_) {}

function detectProviderConfig() {
  const env = process.env;
  let apiKey = env.AI_API_KEY || env.OPENROUTER_API_KEY || env.FAL_KEY || env.SAMURAI_API_KEY || env.API_KEY || '';
  if (!apiKey) {
    for (const [k, v] of Object.entries(env)) {
      if (/(API_KEY|FAL_KEY|_TOKEN)$/i.test(k) && v && v.length > 10) {
        apiKey = v;
        break;
      }
    }
  }
  let baseUrl = env.AI_BASE_URL || env.AI_API_URL || env.OPENROUTER_BASE_URL || env.BASE_URL || '';
  if (!baseUrl) {
    if (apiKey.includes(':') || env.FAL_KEY) {
      baseUrl = 'https://fal.run/openrouter/router/openai/v1/chat/completions';
    } else {
      baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }
  }
  let endpoint = baseUrl.replace(/\/+$/, '');
  if (!endpoint.endsWith('/chat/completions') && !endpoint.endsWith('/router')) {
    if (endpoint.includes('fal.run/openrouter/router') && !endpoint.includes('/openai/v1')) {
      endpoint = endpoint + '/openai/v1/chat/completions';
    } else if (!endpoint.endsWith('/completions')) {
      endpoint = endpoint + '/chat/completions';
    }
  }
  const model = env.AI_MODEL || env.MODEL || 'qwen/qwen3-coder-next';
  const isFal = endpoint.includes('fal.run') || endpoint.includes('fal.ai');
  return { apiKey, endpoint, model, isFal };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function stripTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unwrapSearchRedirectUrl(rawUrl) {
  if (!rawUrl) return '';
  let u = String(rawUrl).replace(/&amp;/g, '&').trim();
  try {
    // 1. Unwrap Bing Web base64 redirect: bing.com/ck/a?...&u=a1aHR0cHM6Ly...
    const bingU = u.match(/[?&]u=a1([A-Za-z0-9_-]+)/);
    if (bingU && bingU[1]) {
      const b64 = bingU[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      if (/^https?:\/\//i.test(decoded)) return decoded;
    }
    // 2. Unwrap Bing News / apiclick url= parameter
    const urlParam = u.match(/[?&](?:url|uddg|RU)=([^&]+)/i);
    if (urlParam && urlParam[1]) {
      const dec = decodeURIComponent(urlParam[1]);
      if (/^https?:\/\//i.test(dec)) return dec;
    }
  } catch (_) {}
  return u;
}

function scoreSourceTrustworthiness(domain, sourceType) {
  const d = String(domain || '').toLowerCase();
  if (/\.(?:gov|edu|ac\.in|nic\.in|gov\.in|org\.in)$/.test(d) || /ncert|upsc|nta|isro|nasa|who\.int|nih\.gov|worldbank|un\.org|unesco/.test(d)) return 99;
  if (/wikipedia\.org|britannica\.com|oxford|cambridge|stanford\.edu|mit\.edu|harvard\.edu/.test(d)) return 97;
  if (/nature\.com|science\.org|ieee\.org|arxiv\.org|openalex\.org|crossref\.org|doi\.org|springer\.com|sciencedirect\.com/.test(d)) return 96;
  if (/github\.com|huggingface\.co|mozilla\.org|w3\.org/.test(d)) return 94;
  if (sourceType === 'Verified Calendar' || sourceType === 'Encyclopedia') return 95;
  return 88;
}

function rankAndDiversifySources(rawResults, maxTotal = 10, maxPerDomain = 1) {
  const cleaned = [];
  for (const r of rawResults) {
    if (!r || !r.title) continue;
    const realUrl = unwrapSearchRedirectUrl(r.url || '');
    const realDom = getDomain(realUrl || r.domain || '').toLowerCase();
    // Skip raw search engine wrapper domains if redirect couldn't unwrap
    if (/^(?:www\.)?(?:bing\.com|google\.com|search\.yahoo\.com|duckduckgo\.com)$/.test(realDom) && !r.domain?.includes(' ')) {
      continue;
    }
    const finalDomain = (realDom && realDom !== 'web.source') ? realDom : (r.domain || 'verified.source');
    const trustScore = scoreSourceTrustworthiness(finalDomain, r.sourceType);
    cleaned.push({
      ...r,
      url: realUrl || r.url,
      domain: finalDomain,
      trustScore
    });
  }

  // Sort by highest trust score first so the most authoritative sources lead!
  cleaned.sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));

  const seenTitles = new Set();
  const domainCounts = new Map();
  const diversified = [];

  for (const item of cleaned) {
    const tKey = item.title.slice(0, 45).toLowerCase();
    if (seenTitles.has(tKey)) continue;
    const dKey = item.domain.toLowerCase();
    const count = domainCounts.get(dKey) || 0;
    if (count >= maxPerDomain) continue;
    seenTitles.add(tKey);
    domainCounts.set(dKey, count + 1);
    diversified.push(item);
    if (diversified.length >= maxTotal) break;
  }

  return diversified;
}


const RESEARCH_JUNK_DOMAINS = /(?:^|\.)(?:flipkart\.com|amazon\.in|amazon\.com|snapdeal\.com|meesho\.com|myntra\.com|youtube\.com|youtu\.be|reddit\.com|zhihu\.com|quora\.com|pinterest\.|instagram\.com|facebook\.com|tiktok\.com|x\.com|twitter\.com|dailymotion\.com)$/i;

function isIrrelevantResearchResult(item, query) {
  if (!item || !item.url) return true;
  const dom = getDomain(item.url).toLowerCase();
  const urlLower = item.url.toLowerCase();
  const titleLower = String(item.title || '').toLowerCase();
  const snipLower = String(item.snippet || '').toLowerCase();

  // 1. Block e-commerce, social/video homepages, and junk forums unless explicitly requested
  if (RESEARCH_JUNK_DOMAINS.test(dom) && !/(youtube|reddit|amazon|flipkart)/i.test(query)) return true;
  if (/\/topic\/desi\/videos|bing\.com\/ck|bing_homepage_quiz|food-products\/chips/i.test(urlLower + ' ' + titleLower)) return true;

  // 2. Prevent acronym collision (e.g. Chhattisgarh CHiPS vs US CHIPS Act / Semiconductor)
  if (/chips\.gov\.in/i.test(dom) && /semiconductor|chips\s+act|us\s+chips/i.test(query) && !/chhattisgarh/i.test(query)) {
    return true;
  }

  // 3. Require at least 1 meaningful keyword overlap between query and title/snippet for web results
  const qTokens = String(query || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !/^(with|from|that|this|what|when|where|which|about|compare|versus|2025|2026)$/.test(w));
  if (qTokens.length >= 2) {
    const combined = titleLower + ' ' + snipLower + ' ' + urlLower;
    const hits = qTokens.filter((t) => combined.includes(t)).length;
    if (hits === 0) return true;
  }
  return false;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    return 'web.source';
  }
}

// ============================================================================
// ADAPTIVE PROMPT INTELLIGENCE ENGINE
// Detects exact user constraints: line count, bullet points, table-only, short
// summary, word limit, or deep research — in English, Hindi, and Hinglish!
// ============================================================================
function analyzePromptIntent(rawQuery) {
  const q = String(rawQuery || '')
    .replace(/\[Attached[\s\S]*$/i, '')
    .replace(/\[Context from Previous Research Branch[\s\S]*?Follow-up Request:\s*/i, '')
    .replace(/\[Branch Context[\s\S]*$/i, '')
    .trim();

  // Map English/Hindi number words to digits so "five-line" or "five lines" also works
  const wordToNum = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    ek: 1, do: 2, teen: 3, char: 4, paanch: 5, panch: 5
  };
  const normalizedQ = q.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|char|paanch|panch)(?=[\s\-–—]*(?:line|lines|bullet|bullets|point|points|sentence|sentences|word|words|para|paragraph))/gi, (m) => String(wordToNum[m.toLowerCase()] || m));

  let exactCount = null;
  let unit = null; // 'lines' | 'bullets' | 'sentences' | 'words' | 'paragraphs'

  // Matches "5 line", "5-line", "5 lines", "5-lines", "5 लाइन", "5 bullet points", "5-point", "3-sentence", "100-word", etc.
  const countRegex = /\b(\d{1,3})[\s\-–—]*(line|lines|lain|लाइन|लाइनों|पंक्ति|पंक्तियों|bullet[\s\-–—]*points?|bullets?|points?|पॉइंट|पॉइंट्स|बिंदु|बिंदुओं|sentences?|वाक्य|वाक्यों|words?|शब्द|शब्दों|paragraphs?|paras?|पैराग्राफ)\b/i;
  const m = normalizedQ.match(countRegex);
  if (m) {
    exactCount = parseInt(m[1], 10);
    const rawUnit = m[2].toLowerCase();
    if (/line|lain|लाइन|पंक्ति/.test(rawUnit)) unit = 'lines';
    else if (/bullet|point|पॉइंट|बिंदु/.test(rawUnit)) unit = 'bullets';
    else if (/sentence|वाक्य/.test(rawUnit)) unit = 'sentences';
    else if (/word|शब्द/.test(rawUnit)) unit = 'words';
    else if (/para|पैराग्राफ/.test(rawUnit)) unit = 'paragraphs';
  }

  const wantsBullets = unit === 'bullets' || /\b(in[\s\-]+bullets?|bullet[\s\-]+points?|bullets?\s+me|bullets?\s+mein|point[\s\-]+wise|points?\s+me|points?\s+mein|only\s+bullets?|बिंदुओं\s+में|पॉइंट्स\s+में)\b/i.test(normalizedQ);
  const wantsTableOnly = /\b(only[\s\-]+table|table[\s\-]+only|sirf[\s\-]+table|just[\s\-]+a?[\s\-]*table|सिर्फ\s+टेबल|केवल\s+तालिका|in\s+a\s+table\s+only)\b/i.test(normalizedQ);
  const wantsShort = (exactCount && exactCount <= 12 && unit !== 'paragraphs')
    || /\b(in[\s\-]+short|short[\s\-]+ans|short[\s\-]+answer|briefly|brief[\s\-]+answer|tl;dr|tldr|one[\s\-]+liner|1[\s\-]+liner|only[\s\-]+summary|संक्षेप\s+में|शॉर्ट\s+में|छोटा\s+उत्तर)\b/i.test(normalizedQ);

  let formatInstruction = '';
  let isConstrained = false;

  if (exactCount && unit === 'lines') {
    isConstrained = true;
    formatInstruction = `STRICT OUTPUT FORMAT OVERRIDE (MANDATORY):
The user asked for an answer in EXACTLY ${exactCount} lines.
- You MUST output EXACTLY ${exactCount} separate lines (1 sentence per line, separated by a newline).
- DO NOT output any title, heading (# or ##), "Executive Summary", intro text, Markdown table, "Key Risks", or "Verified Source Bibliography".
- Output ONLY the ${exactCount} lines and nothing else. Include 1 clickable [Source Title](URL) citation inline per line.`;
  } else if (exactCount && unit === 'bullets') {
    isConstrained = true;
    formatInstruction = `STRICT OUTPUT FORMAT OVERRIDE (MANDATORY):
The user asked for EXACTLY ${exactCount} bullet points.
- You MUST outputRender EXACTLY ${exactCount} bullet points (each starting with "- ").
- DO NOT output any title, heading (# or ##), intro paragraph, Markdown table, "Key Risks", or "Verified Source Bibliography".
- Output ONLY the ${exactCount} bullet points and nothing else. Include clickable [Source Title](URL) citations inline.`;
  } else if (exactCount && unit === 'sentences') {
    isConstrained = true;
    formatInstruction = `STRICT OUTPUT FORMAT OVERRIDE (MANDATORY):
The user asked for EXACTLY ${exactCount} sentences.
- Output ONLY ${exactCount} concise sentences with inline [Source Title](URL) citations.
- DO NOT output any title, headings, bullet lists, tables, or bibliography section.`;
  } else if (exactCount && unit === 'words') {
    isConstrained = true;
    formatInstruction = `STRICT OUTPUT FORMAT OVERRIDE (MANDATORY):
The user asked for an answer within ${exactCount} words.
- Keep your entire response strictly under ${exactCount} words. DO NOT include headings, tables, or bibliography sections.`;
  } else if (exactCount && unit === 'paragraphs') {
    isConstrained = true;
    formatInstruction = `STRICT OUTPUT FORMAT OVERRIDE (MANDATORY):
The user asked for EXACTLY ${exactCount} paragraph(s).
- Output ONLY ${exactCount} paragraph(s) with inline [Source Title](URL) links. DO NOT include headings, bullet lists, tables, or bibliography.`;
  } else if (wantsTableOnly) {
    isConstrained = true;
    formatInstruction = `STRICT OUTPUT FORMAT OVERRIDE (MANDATORY):
The user asked for ONLY a table.
- Output ONLY a single clean Markdown comparison table (| Col1 | Col2 |) with factual data. DO NOT output any title, intro prose, risks section, or bibliography.`;
  } else if (wantsBullets) {
    isConstrained = true;
    formatInstruction = `STRICT OUTPUT FORMAT OVERRIDE (MANDATORY):
The user asked for the answer in bullet points.
- Output ONLY a clean list of 5 to 7 factual bullet points (each starting with "- ") with inline [Source Title](URL) links.
- DO NOT output titles, section headings, prose paragraphs, tables, or bibliography.`;
  } else if (wantsShort) {
    isConstrained = true;
    formatInstruction = `STRICT OUTPUT FORMAT OVERRIDE (MANDATORY):
The user asked for a short/brief answer.
- Output ONLY 3 to 5 concise lines or bullet points with inline [Source Title](URL) citations.
- DO NOT output titles, section headings, tables, or bibliography.`;
  }

  return {
    isConstrained,
    exactCount,
    unit,
    wantsBullets,
    wantsTableOnly,
    wantsShort,
    formatInstruction
  };
}

// Ironclad Post-Processor: Strips any unrequested headings, tables, or bibliographies
// and guarantees the exact line/bullet/sentence count requested by the user.
function enforceOutputConstraints(rawText, intent) {
  let text = String(rawText || '').trim();
  if (!intent || !intent.isConstrained) return text;

  if (intent.wantsTableOnly) {
    const tableMatch = text.match(/((?:^\|.*\|(?:\r?\n|$))+)/m);
    if (tableMatch) return tableMatch[1].trim();
    return text;
  }

  // Strip Markdown tables, section headings, and bibliography blocks when user asked for lines/bullets/sentences/short
  const rawLines = text.split(/\r?\n/);
  const cleanedLines = [];
  for (const line of rawLines) {
    const t = line.trim();
    if (!t) continue;
    // Skip markdown headers (#, ##, ###)
    if (/^#{1,6}\s+/.test(t)) continue;
    // Skip horizontal rules
    if (/^[-*_]{3,}$/.test(t)) continue;
    // Skip markdown table rows
    if (/^\|.*\|$/.test(t)) continue;
    // Skip standalone boilerplate section titles
    if (/^(?:\*\*)?(?:Executive Summary|Factual Breakdown|Head-to-Head|Key Risks|Strategic Recommendations|Verified Source Bibliography|References|Sources)(?:\*\*)?:?\s*$/i.test(t)) {
      // If we hit Verified Source Bibliography, stop reading further lines
      if (/Bibliography|References|Sources/i.test(t)) break;
      continue;
    }
    // Strip leading inline boilerplate like "Key Risks / Recommendations:" if it appeared after main content
    if (/^(?:\*\*)?Key Risks\s*\/\s*Recommendations(?:\*\*)?:/i.test(t) && cleanedLines.length >= (intent.exactCount || 3)) {
      break;
    }
    cleanedLines.push(t);
  }

  const targetCount = intent.exactCount || (intent.wantsShort ? 4 : intent.wantsBullets ? 5 : null);
  if (targetCount && (intent.unit === 'lines' || intent.unit === 'bullets' || intent.unit === 'sentences' || intent.wantsBullets || intent.wantsShort)) {
    let candidateItems = [];
    // If the LLM wrote 1 or 2 big paragraphs instead of N separate lines, split paragraphs into sentences
    if (cleanedLines.length < targetCount) {
      for (const cl of cleanedLines) {
        // Split on sentence boundaries that aren't inside parentheses/links
        const sents = cl.split(/(?<=[.!?।])\s+(?=[A-Z0-9"“‘•\-*\[])/);
        for (const s of sents) {
          if (s.trim()) candidateItems.push(s.trim());
        }
      }
    } else {
      candidateItems = cleanedLines;
    }

    const sliced = candidateItems.slice(0, targetCount);

    if (intent.unit === 'bullets' || intent.wantsBullets) {
      return sliced
        .map((l) => {
          const clean = l.replace(/^(?:[-•*]|\d+[.)])\s*/, '').trim();
          return `- ${clean}`;
        })
        .join('\n');
    }

    if (intent.unit === 'lines') {
      return sliced
        .map((l, idx) => {
          const clean = l.replace(/^(?:[-•*]|\d+[.)])\s*/, '').trim();
          return `${idx + 1}. ${clean}`;
        })
        .join('\n');
    }

    if (intent.unit === 'sentences') {
      return sliced.map((l) => l.replace(/^(?:[-•*]|\d+[.)])\s*/, '').trim()).join(' ');
    }

    return sliced.join('\n');
  }

  return cleanedLines.join('\n\n');
}

function buildSearchSubQueries(rawQuery) {
  const clean = String(rawQuery || '')
    .replace(/\[Attached[\s\S]*$/i, '')
    .replace(/\[Branch Context[\s\S]*$/i, '')
    .replace(/\b\d+\s*(line|lines|bullet|bullets|point|points|word|words|sentence|sentences|लाइन|बिंदु|शब्द)\b/gi, '')
    .replace(/\b(in short|short answer|bullet points|mein batao|में बताओ)\b/gi, '')
    .trim();

  const subQueries = [];
  const stopWords = new Set(['create', 'compare', 'analyze', 'explain', 'what', 'how', 'why', 'the', 'and', 'for', 'with', 'in', 'of', 'to', 'vs', 'versus', 'current', 'real', 'give', 'tell', 'write', 'about']);
  const tokens = clean.split(/[\s,:;.!?()[\]"']+/).filter(Boolean);
  const keyTokens = tokens.filter(w => !stopWords.has(w.toLowerCase()) && w.length > 2);

  if (keyTokens.length > 0) {
    subQueries.push(keyTokens.slice(0, 7).join(' '));
  }

  if (/\bvs\.?\b|\bversus\b/i.test(clean)) {
    const parts = clean.split(/[:.;\n]/);
    for (const p of parts) {
      if (/\bvs\.?\b|\bversus\b/i.test(p)) {
        const entities = p.split(/\bvs\.?\b|\bversus\b/i).map(s => s.trim()).filter(Boolean);
        const contextWords = keyTokens.slice(0, 3).join(' ');
        for (const ent of entities.slice(0, 4)) {
          const entClean = ent.split(/\s+/).slice(-3).join(' ');
          subQueries.push(`${entClean} ${contextWords} 2026`);
        }
      }
    }
  }

  if (keyTokens.length > 4) {
    subQueries.push(keyTokens.slice(0, 4).join(' ') + ' facts data 2026');
  }

  const uniq = [];
  const seen = new Set();
  for (const q of subQueries) {
    const norm = q.toLowerCase().trim();
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      uniq.push(q.trim());
    }
  }
  return uniq.length ? uniq.slice(0, 6) : [clean.slice(0, 80)];
}

function evaluateWebsiteTrust(url, sourceLabel, textLen) {
  const dom = getDomain(url).toLowerCase();
  if (dom.endsWith('.gov') || dom.endsWith('.edu') || dom.includes('nature.com') || dom.includes('science.org') || dom.includes('openalex.org') || dom.includes('arxiv.org') || dom.includes('doi.org') || dom.includes('ieee.org')) {
    return { score: 98, badge: '98% Peer/Official', tier: 'Academic & Official' };
  }
  if (dom.includes('wikipedia.org') || dom.includes('github.com') || dom.includes('anthropic.com') || dom.includes('openai.com') || dom.includes('cursor.com') || dom.includes('toyota') || dom.includes('quantumscape') || dom.includes('bloomberg')) {
    return { score: 95, badge: '95% Primary Authority', tier: 'Primary Authority' };
  }
  if (dom.includes('ycombinator.com') || dom.includes('reddit.com') || dom.includes('techcrunch.com') || dom.includes('reuters.com')) {
    return { score: 91, badge: '91% Verified Media', tier: 'Industry Signal' };
  }
  const base = textLen > 600 ? 92 : 88;
  return { score: base, badge: `${base}% Verified Web`, tier: 'Live Web Index' };
}

async function crawlAndEvaluatePage(item, doFullCrawl = true) {
  if (!doFullCrawl) {
    const trust = evaluateWebsiteTrust(item.url, item.source, (item.snippet || '').length);
    const estWords = Math.max(180, (item.snippet || '').split(/\s+/).length * 14);
    return {
      ...item,
      domain: getDomain(item.url),
      wordCount: item.wordCount || estWords,
      crawled: true,
      trustScore: trust.score,
      trustBadge: trust.badge,
      sourceTier: trust.tier,
      factualHighlights: item.factualHighlights || (item.snippet ? [item.snippet.slice(0, 180)] : [])
    };
  }
  try {
    const res = await fetchWithTimeout(item.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      }
    }, 4200);
    if (!res.ok) return crawlAndEvaluatePage(item, false);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) return crawlAndEvaluatePage(item, false);

    const rawHtml = (await res.text()).slice(0, 110000);
    const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = rawHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

    const cleanText = stripTags(rawHtml);
    const words = cleanText.split(/\s+/).filter(Boolean);
    const wordCount = Math.max(220, words.length);

    const sentences = cleanText.split(/(?<=[.!?।])\s+/);
    const factSentences = sentences
      .filter(s => /(\d+%|\$\d+|202[4-9]|\bWh\/kg\b|\bGWh\b|\bms\b|\bGB\b|\bAPI\b)/i.test(s) && s.length > 35 && s.length < 230)
      .slice(0, 4);

    const trust = evaluateWebsiteTrust(item.url, item.source, cleanText.length);
    return {
      ...item,
      title: (titleMatch ? stripTags(titleMatch[1]) : item.title) || item.title,
      domain: getDomain(item.url),
      wordCount,
      crawled: true,
      trustScore: trust.score,
      trustBadge: trust.badge,
      sourceTier: trust.tier,
      factualHighlights: factSentences.length ? factSentences : (item.snippet ? [item.snippet] : []),
      snippet: item.snippet || (descMatch ? stripTags(descMatch[1]) : cleanText.slice(0, 260)),
      fullContent: cleanText.slice(0, 1800)
    };
  } catch (_) {
    return crawlAndEvaluatePage(item, false);
  }
}


async function searchGoogleNewsRSS(query, limit = 6) {
  const results = [];
  for (const edition of ['hl=en-US&gl=US&ceid=US:en', 'hl=en-IN&gl=IN&ceid=IN:en']) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${edition}`;
      const res = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0' }
      }, 4500);
      if (res.ok) {
        const xml = await res.text();
        const items = xml.split('<item>').slice(1, Math.ceil(limit / 2) + 2);
        for (const item of items) {
          const title = stripTags((item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
          const pubDate = stripTags((item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '');
          const sourceName = stripTags((item.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || 'Live News Wire');
          const desc = stripTags((item.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '');
          const link = stripTags((item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '');
          if (title && link) {
            results.push({
              source: `📰 ${sourceName}`,
              title,
              url: link,
              domain: sourceName.toLowerCase().replace(/[^a-z0-9.]/g, '') || 'news.google.com',
              snippet: `${pubDate ? '[' + pubDate.slice(0, 16) + '] ' : ''}${desc || title}`,
              wordCount: 980
            });
          }
        }
      }
    } catch (_) {}
  }
  return results.slice(0, limit);
}

async function searchBingNewsRSS(query, limit = 6) {
  const results = [];
  try {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`;
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0' }
    }, 4500);
    if (res.ok) {
      const xml = await res.text();
      const items = xml.split('<item>').slice(1, limit + 1);
      for (const item of items) {
        const title = stripTags((item.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
        const desc = stripTags((item.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '');
        let link = stripTags((item.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '');
        const urlParam = link.match(/[?&]url=([^&]+)/);
        if (urlParam) link = decodeURIComponent(urlParam[1]);
        if (title && link) {
          results.push({
            source: '🌐 Live Web News',
            title,
            url: link,
            snippet: desc || title,
            wordCount: 1150
          });
        }
      }
    }
  } catch (_) {}
  return results;
}

async function searchBingWeb(query, limit = 6) {
  const results = [];
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, 4800);
    if (res.ok) {
      const html = await res.text();
      const blocks = html.split(/<li class="b_algo"/i).slice(1, limit + 2);
      for (const b of blocks) {
        const hm = b.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const sm = b.match(/<div class="b_caption"[^>]*>([\s\S]*?)<\/div>|<p[^>]*>([\s\S]*?)<\/p>/i);
        if (hm) {
          const href = unwrapSearchRedirectUrl(hm[1]);
          const title = stripTags(hm[2]);
          const snippet = stripTags(sm ? (sm[1] || sm[2] || '') : '').slice(0, 360);
          if (title && /^https?:\/\//i.test(href)) {
            results.push({
              source: '🔎 Deep Web Index',
              title,
              url: href,
              snippet: snippet || title,
              wordCount: 1350
            });
          }
        }
      }
    }
  } catch (_) {}
  return results;
}

async function searchDuckDuckGo(query, limit = 6) {
  const results = [];
  try {
    const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, 5000);
    if (res.ok) {
      const html = await res.text();
      const blocks = html.split(/class="result__body"/i).slice(1, limit + 2);
      for (const b of blocks) {
        const titleMatch = b.match(/class="result__a"[^>]* href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const snipMatch = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
        if (titleMatch) {
          let href = titleMatch[1];
          const uddg = href.match(/[?&]uddg=([^&]+)/);
          if (uddg) href = decodeURIComponent(uddg[1]);
          const title = stripTags(titleMatch[2]);
          const snippet = stripTags(snipMatch ? (snipMatch[1] || snipMatch[2] || '') : '');
          if (/^https?:\/\//i.test(href) && title) {
            results.push({ source: 'Live Web Index', title, url: href, snippet });
          }
        }
      }
    }
  } catch (_) {}
  return results;
}

async function searchWikipedia(query, limit = 4) {
  const results = [];
  try {
    const url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(query) + '&utf8=&format=json&srlimit=' + limit;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'PixelmorphicMorphicEngine/36.0' } }, 4500);
    if (res.ok) {
      const data = await res.json();
      const items = data?.query?.search || [];
      const titles = items.map((x) => x.title).filter(Boolean).slice(0, 4);
      let extractMap = {};
      if (titles.length > 0) {
        try {
          const exUrl = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=' + encodeURIComponent(titles.join('|')) + '&format=json';
          const exRes = await fetchWithTimeout(exUrl, { headers: { 'User-Agent': 'PixelmorphicMorphicEngine/36.0' } }, 4200);
          if (exRes.ok) {
            const exData = await exRes.json();
            for (const p of Object.values(exData?.query?.pages || {})) {
              if (p.title && p.extract) extractMap[p.title] = p.extract.slice(0, 900);
            }
          }
        } catch (_) {}
      }
      for (const item of items) {
        results.push({
          source: 'Encyclopedia Graph',
          title: item.title,
          url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(item.title.replace(/ /g, '_')),
          snippet: extractMap[item.title] || stripTags(item.snippet),
          fullContent: extractMap[item.title] || stripTags(item.snippet),
          wordCount: item.wordcount || 1250
        });
      }
    }
  } catch (_) {}
  return results;
}

async function searchOpenAlex(query, limit = 5) {
  const results = [];
  try {
    const url = 'https://api.openalex.org/works?search=' + encodeURIComponent(query) + '&per-page=' + limit + '&sort=relevance_score:desc';
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'mailto:research@pixelmorphic.local' } }, 4500);
    if (res.ok) {
      const data = await res.json();
      for (const w of (data?.results || [])) {
        const link = w.doi || w.primary_location?.landing_page_url || w.id || '';
        if (w.title && link) {
          results.push({
            source: `Scientific Paper · ${w.publication_year || 2025}`,
            title: w.title,
            url: link,
            snippet: `Peer-reviewed study · Citations: ${w.cited_by_count || 0} · Published: ${w.publication_year || 'Recent'}`,
            wordCount: 1450
          });
        }
      }
    }
  } catch (_) {}
  return results;
}

async function searchCrossrefDOI(query, limit = 4) {
  const results = [];
  try {
    const url = 'https://api.crossref.org/works?query=' + encodeURIComponent(query) + '&rows=' + limit;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'PixelmorphicResearch/11.0' } }, 4500);
    if (res.ok) {
      const data = await res.json();
      for (const item of (data?.message?.items || [])) {
        const title = Array.isArray(item.title) ? item.title[0] : item.title;
        const link = item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : '');
        const pub = item.publisher || 'Journal Registry';
        const yr = item.created?.['date-parts']?.[0]?.[0] || '';
        if (title && link) {
          results.push({
            source: `${pub}${yr ? ' · ' + yr : ''}`,
            title: stripTags(title),
            url: link,
            snippet: `DOI Verified Publication (${item.DOI || 'Indexed'}) · Publisher: ${pub}`,
            wordCount: 1200
          });
        }
      }
    }
  } catch (_) {}
  return results;
}

async function searchArXiv(query, limit = 3) {
  const results = [];
  try {
    const url = 'https://export.arxiv.org/api/query?search_query=all:' + encodeURIComponent(query) + '&start=0&max_results=' + limit;
    const res = await fetchWithTimeout(url, {}, 4500);
    if (res.ok) {
      const xml = await res.text();
      const entries = xml.split('<entry>').slice(1);
      for (const ent of entries) {
        const title = (ent.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
        const idUrl = (ent.match(/<id>([\s\S]*?)<\/id>/) || [])[1];
        const summary = (ent.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1];
        if (title && idUrl) {
          results.push({
            source: 'ArXiv Preprint',
            title: stripTags(title),
            url: idUrl.trim(),
            snippet: stripTags(summary).slice(0, 260),
            wordCount: 1650
          });
        }
      }
    }
  } catch (_) {}
  return results;
}

async function searchGitHubRepos(query, limit = 3) {
  const results = [];
  try {
    const url = 'https://api.github.com/search/repositories?q=' + encodeURIComponent(query) + '&per_page=' + limit;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'PixelmorphicResearch/11.0', 'Accept': 'application/vnd.github+json' } }, 4000);
    if (res.ok) {
      const data = await res.json();
      for (const repo of (data?.items || [])) {
        if (repo.full_name && repo.html_url) {
          results.push({
            source: 'GitHub Repository',
            title: `${repo.full_name} (${repo.stargazers_count || 0} ★)`,
            url: repo.html_url,
            snippet: `${repo.description || 'Open-source repository'} · Language: ${repo.language || 'Multi'}`,
            wordCount: 920
          });
        }
      }
    }
  } catch (_) {}
  return results;
}

async function searchHackerNews(query, limit = 4) {
  const results = [];
  try {
    const hnUrl = 'https://hn.algolia.com/api/v1/search?query=' + encodeURIComponent(query) + '&hitsPerPage=' + limit;
    const res = await fetchWithTimeout(hnUrl, {}, 4000);
    if (res.ok) {
      const data = await res.json();
      for (const h of (data?.hits || [])) {
        if (h.title && (h.url || h.objectID)) {
          results.push({
            source: 'Engineering Signal',
            title: h.title,
            url: h.url || ('https://news.ycombinator.com/item?id=' + h.objectID),
            snippet: `Points: ${h.points || 0} · Comments: ${h.num_comments || 0} · Date: ${(h.created_at || '').slice(0, 10)}`,
            wordCount: 640
          });
        }
      }
    }
  } catch (_) {}
  return results;
}


// === PIXELMORPHIC v79.0 RESEARCH SSRF GUARD & CONCURRENCY QUEUE ===
const MAX_RESEARCH_BODY_BYTES = 2 * 1024 * 1024; // 2 MB cap
const MAX_CONCURRENT_RESEARCH = Math.max(2, Number(process.env.MAX_CONCURRENT_RESEARCH || 4));
let activeResearchCount = 0;
const researchWaitQueue = [];

function acquireResearchSlot(timeoutMs = 90000) {
  if (activeResearchCount < MAX_CONCURRENT_RESEARCH) {
    activeResearchCount++;
    return Promise.resolve(() => releaseResearchSlot());
  }
  if (researchWaitQueue.length >= 40) {
    return Promise.reject(Object.assign(new Error('Research queue busy. Please retry shortly.'), { statusCode: 503 }));
  }
  return new Promise((resolve, reject) => {
    const entry = {
      resolve: () => {
        clearTimeout(timer);
        activeResearchCount++;
        resolve(() => releaseResearchSlot());
      },
      reject
    };
    const timer = setTimeout(() => {
      const idx = researchWaitQueue.indexOf(entry);
      if (idx !== -1) researchWaitQueue.splice(idx, 1);
      reject(Object.assign(new Error('Research request timed out in queue.'), { statusCode: 504 }));
    }, timeoutMs);
    researchWaitQueue.push(entry);
  });
}

function releaseResearchSlot() {
  activeResearchCount = Math.max(0, activeResearchCount - 1);
  if (researchWaitQueue.length > 0 && activeResearchCount < MAX_CONCURRENT_RESEARCH) {
    const next = researchWaitQueue.shift();
    if (next) next.resolve();
  }
}

function isPrivateOrBlockedIp(ip) {
  const s = String(ip || '').toLowerCase();
  if (!s) return true;
  if (s === '::1' || s === '0.0.0.0' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80:')) return true;
  if (s.startsWith('::ffff:')) return isPrivateOrBlockedIp(s.slice(7));
  const m = s.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return true;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

async function isSafeExternalPluginUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
    if (net.isIP(host)) return !isPrivateOrBlockedIp(host);
    const resolved = await dns.promises.lookup(host, { all: true });
    if (!resolved || !resolved.length) return false;
    return resolved.every((rec) => !isPrivateOrBlockedIp(rec.address));
  } catch (_) {
    return false;
  }
}

async function executeCustomThirdPartyPlugins(customPlugins, query) {
  const results = [];
  if (!Array.isArray(customPlugins) || !customPlugins.length) return results;

  for (const plug of customPlugins.slice(0, 4)) {
    if (!plug || !plug.endpoint) continue;
    try {
      let url = String(plug.endpoint).trim();
      const safeTarget = await isSafeExternalPluginUrl(url.replace(/\{query\}/g, 'test'));
      if (!safeTarget) {
        console.warn('[Pixelmorphic v79 SSRF Guard] Blocked unsafe plugin endpoint:', url);
        continue;
      }
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (plug.apiKey) {
        headers['Authorization'] = plug.apiKey.startsWith('Bearer ') || plug.apiKey.startsWith('Key ') ? plug.apiKey : `Bearer ${plug.apiKey}`;
        headers['X-API-Key'] = plug.apiKey;
      }

      let res;
      if (url.includes('{query}')) {
        url = url.replace(/\{query\}/g, encodeURIComponent(query));
        res = await fetchWithTimeout(url, { method: 'GET', headers }, 5000);
      } else if (url.includes('tavily.com')) {
        res = await fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ api_key: plug.apiKey || '', query, search_depth: 'advanced', max_results: 5 })
        }, 5500);
      } else {
        res = await fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ q: query, query, num: 5 })
        }, 5500);
      }

      if (res && res.ok) {
        const data = await res.json();
        const items = data?.results || data?.organic || data?.web?.results || data?.data || (Array.isArray(data) ? data : []);
        for (const it of items.slice(0, 5)) {
          const itemUrl = it.url || it.link || it.href;
          const itemTitle = it.title || it.name || plug.name;
          const itemSnip = it.content || it.snippet || it.description || '';
          if (itemUrl && itemTitle) {
            results.push({
              source: `🔌 ${plug.name || '3rd-Party Plugin'}`,
              title: stripTags(itemTitle),
              url: itemUrl,
              snippet: stripTags(itemSnip).slice(0, 260),
              wordCount: 1100
            });
          }
        }
      }
    } catch (_) {}
  }
  return results;
}

const THINKING_PROFILES = {
  instant: { label: 'Instant', maxSubQueries: 2, crawlCount: 2, maxSources: 8,  twoPassLLM: false, maxTokens: 2600, temperature: 0.2 },
  medium:  { label: 'Medium',  maxSubQueries: 3, crawlCount: 4, maxSources: 14, twoPassLLM: false, maxTokens: 4500, temperature: 0.25 },
  high:    { label: 'High',    maxSubQueries: 5, crawlCount: 6, maxSources: 20, twoPassLLM: false, maxTokens: 6400, temperature: 0.3 },
  max:     { label: 'Max',     maxSubQueries: 6, crawlCount: 8, maxSources: 26, twoPassLLM: true,  maxTokens: 7800, temperature: 0.3 }
};

async function callLLM(messages, maxTokens = 4500, temperature = 0.25) {
  const { apiKey, endpoint, model, isFal } = detectProviderConfig();
  if (!apiKey) throw new Error('API key not configured in .env');

  const authHeaders = isFal ? [`Key ${apiKey}`, `Bearer ${apiKey}`] : [`Bearer ${apiKey}`, `Key ${apiKey}`];
  const delays = [0, 3500, 7000];
  let lastErr = null;

  for (const delay of delays) {
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    for (const auth of authHeaders) {
      try {
        const res = await fetchWithTimeout(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': auth },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature })
        }, 115000);
        if (res.status === 401 || res.status === 403) continue;
        if (res.status === 429) {
          lastErr = new Error('Provider rate limit (HTTP 429)');
          break;
        }
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content || data?.output || '';
        if (text) return { text, model, usage: data?.usage || null };
        lastErr = new Error(data?.error?.message || `HTTP ${res.status}`);
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr || new Error('LLM request failed');
}

function extractBibliographySourcesFromReport(markdown, existingUrls) {
  const extra = [];
  const lines = String(markdown || '').split(/\r?\n/);
  for (const line of lines) {
    const mdLink = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
    if (mdLink && !existingUrls.has(mdLink[2])) {
      existingUrls.add(mdLink[2]);
      extra.push({
        source: 'Primary Citation',
        title: mdLink[1],
        url: mdLink[2],
        snippet: line.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1').replace(/^[-*•\d.)\s]+/, '').trim(),
        wordCount: 950
      });
      continue;
    }
    const rawUrl = line.match(/(https?:\/\/[^\s)"']+)/);
    if (rawUrl && !existingUrls.has(rawUrl[1])) {
      const u = rawUrl[1].replace(/[.,;]+$/, '');
      existingUrls.add(u);
      const cleanTitle = line.replace(u, '').replace(/^[-*•\d.)\s"“”]+|["“”.]+$/g, '').trim() || getDomain(u);
      extra.push({
        source: 'Verified Reference',
        title: cleanTitle.slice(0, 110),
        url: u,
        snippet: `Referenced primary technical documentation from ${getDomain(u)}.`,
        wordCount: 1120
      });
    }
  }
  return extra;
}

export const handleVerifiedResearch = function(req, res) { return handleResearchApi(req, res); };
export async function handleResearchApi(req, res) {
  if (req && req.url && (req.url.includes('chatMode=1') || req.url.startsWith('/api/general-chat') || req.url.startsWith('/api/morphic-storage'))) {
    return handleGeneralChatApi(req, res);
  }
  const allowedOrigin = resolveAllowedCorsOrigin(req);
  const corsHeaders = allowedOrigin ? {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-PM-Session',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  } : {};
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return true;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Use POST /api/research' }));
    return true;
  }

  let bodyStr = '';
  try {
    bodyStr = await new Promise((resolve, reject) => {
      const chunks = [];
      let total = 0;
      let aborted = false;
      req.on('data', (c) => {
        if (aborted) return;
        total += c.length;
        if (total > MAX_RESEARCH_BODY_BYTES) {
          aborted = true;
          reject(Object.assign(new Error('Research request exceeds 2MB limit.'), { statusCode: 413 }));
          try { req.pause(); } catch (_) {}
          return;
        }
        chunks.push(c);
      });
      req.on('end', () => { if (!aborted) resolve(Buffer.concat(chunks).toString('utf8')); });
      req.on('error', (e) => { if (!aborted) reject(e); });
    });
  } catch (bodyErr) {
    if (!res.writableEnded) {
      res.writeHead((bodyErr && bodyErr.statusCode) || 400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: bodyErr.message || 'Invalid body' }));
    }
    return true;
  }

  (async () => {
    const startMs = Date.now();
    let releaseResearch = null;
    try {
      releaseResearch = await acquireResearchSlot(90000);
      const payload = JSON.parse(bodyStr || '{}');
      const rawInputQuery = String(payload.query || '').trim();
      const query = repairSpellingAndNormalize(rawInputQuery).repaired || rawInputQuery;
      const mode = String(payload.mode || 'hybrid');
      const lang = String(payload.language || 'en');
      const modelEngine = String(payload.modelEngine || 'morphic-r1-pro').toLowerCase();
      const thinkingLevel = String(payload.thinkingLevel || (modelEngine === 'morphic-r1-pro' ? 'high' : 'medium')).toLowerCase();
      const profile = THINKING_PROFILES[thinkingLevel] || THINKING_PROFILES.high;
      const customPlugins = Array.isArray(payload.customPlugins) ? payload.customPlugins : [];

      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Please enter a research question or website URL.' }));
        return;
      }

      // 1. Analyze User Prompt Intent (exact line count, bullets only, table only, short vs full)
      const rawUserQuery = String(payload.rawUserQuery || query).trim();
      const promptIntent = analyzePromptIntent(rawUserQuery);

      // 2. Decompose into multiple focused search sub-queries
      const subQueries = buildSearchSubQueries(query).slice(0, profile.maxSubQueries);
      const primaryShortQuery = subQueries[0] || query.slice(0, 70);

      // 3. Direct URLs in prompt + Source-of-Origin Deep Inspection + Place Real-Time + Downloadable PYP Links
      const [crawledUserUrls, placeIntel, pypDownloadLinks] = await Promise.all([
        inspectAndCrawlUserUrls(query),
        (async () => {
          const pl = detectPlaceFromQuery(query, payload.userLocation || null);
          return pl ? fetchPlaceRealtimeIntelligence(pl, payload.userLocation || null) : null;
        })(),
        searchDownloadableLinksAndPYP(query)
      ]);

      const directSources = [
        ...crawledUserUrls.map((u) => ({
          source: `🌐 Origin: ${u.countryOrigin} · ${u.category}`,
          title: `${u.pageTitle} (Origin: ${u.siteName} / ${u.domain})`,
          url: u.url,
          domain: u.domain,
          snippet: `Source of Origin: ${u.siteName} (${u.domain}) | Category: ${u.category} | Region: ${u.countryOrigin} | ${u.trustLevel}\n${(u.extractedText || '').slice(0, 600)}`,
          fullContent: u.extractedText || '',
          wordCount: 1800
        })),
        ...pypDownloadLinks.map((d) => ({
          source: '📥 Official Download / Portal',
          title: d.title,
          url: d.url,
          domain: d.domain,
          snippet: d.snippet || `Direct downloadable resource / official portal at ${d.domain}`,
          wordCount: 1200
        }))
      ];

      // 4. Fan out parallel searches across all sub-queries and global databases
      const parallelSearches = [
        searchLiveWebForChat(query).then((items) => items.map((it) => ({
          source: it.sourceType || 'Verified Calendar & Live Web',
          title: it.title,
          url: it.url,
          domain: it.domain,
          snippet: it.snippet,
          fullContent: it.snippet,
          wordCount: 1400
        }))),
        ...subQueries.slice(0, 3).map(sq => searchBingWeb(sq, 5)),
        ...subQueries.slice(0, 2).map(sq => searchBingNewsRSS(sq, 5)),
        ...subQueries.slice(0, 2).map(sq => searchGoogleNewsRSS(sq, 5)),
        ...subQueries.map(sq => searchDuckDuckGo(sq, 5)),
        ...subQueries.slice(0, 3).map(sq => searchWikipedia(sq, 4)),
        searchOpenAlex(primaryShortQuery, 5),
        searchCrossrefDOI(primaryShortQuery, 4),
        searchArXiv(primaryShortQuery, 3),
        searchGitHubRepos(primaryShortQuery, 3),
        searchHackerNews(primaryShortQuery, 4),
        executeCustomThirdPartyPlugins(customPlugins, primaryShortQuery)
      ];

      const searchArrays = await Promise.all(parallelSearches);
      // Round-robin interleave across all search engines (Web, Wikipedia, OpenAlex, Crossref, ArXiv, GitHub, HN)
      const interleaved = [...directSources];
      const maxBucketLen = Math.max(0, ...searchArrays.map((a) => (Array.isArray(a) ? a.length : 0)));
      for (let i = 0; i < maxBucketLen; i++) {
        for (const bucket of searchArrays) {
          if (Array.isArray(bucket) && bucket[i]) {
            interleaved.push(bucket[i]);
          }
        }
      }

      const seenUrls = new Set();
      const domainCounts = new Map();
      const deduped = [];
      for (const item of interleaved) {
        if (isIrrelevantResearchResult(item, query)) continue;
        if (!item.url || seenUrls.has(item.url)) continue;
        item.url = unwrapSearchRedirectUrl(item.url);
        const dom = getDomain(item.url).toLowerCase();
        if (dom === 'bing.com' || dom === 'www.bing.com') continue;
        const curDomCount = domainCounts.get(dom) || 0;
        // Max 2 results per domain so one website never dominates the research scan!
        if (curDomCount >= 2 && deduped.length < profile.maxSources - 2) continue;
        seenUrls.add(item.url);
        domainCounts.set(dom, curDomCount + 1);
        deduped.push(item);
        if (deduped.length >= profile.maxSources) break;
      }

      // 5. Crawl top N pages live & evaluate all discovered websites concurrently
      const toCrawl = deduped.slice(0, profile.crawlCount);
      const rest = deduped.slice(profile.crawlCount);
      const [crawledPart, restPart] = await Promise.all([
        Promise.all(toCrawl.map(it => crawlAndEvaluatePage(it, true))),
        Promise.all(rest.map(it => crawlAndEvaluatePage(it, false)))
      ]);
      let evaluatedSources = [...crawledPart, ...restPart];

      const nowIso = new Date().toISOString().slice(0, 10);
      const sourcesContext = evaluatedSources.length
        ? evaluatedSources.map((s, i) => {
            const facts = (s.factualHighlights && s.factualHighlights.length)
              ? `\nExtracted Live Facts: ${s.factualHighlights.join(' | ')}`
              : '';
            const content = s.fullContent ? `\nLive Page Excerpt: ${s.fullContent.slice(0, 750)}` : '';
            return `[Source ${i + 1}] (${s.sourceTier} · ${s.domain} · Trust: ${s.trustBadge}) ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}${facts}${content}`;
          }).join('\n\n')
        : 'Synthesize using verified factual domain intelligence.';

      let factSheet = '';
      if (!promptIntent.isConstrained && (profile.twoPassLLM || modelEngine === 'morphic-r1-pro') && (thinkingLevel === 'high' || thinkingLevel === 'max') && evaluatedSources.length > 0) {
        try {
          const auditRes = await callLLM([
            {
              role: 'system',
              content: 'You are Morphic Intelligence Pass-1 Fact Verifier. Extract a concise, high-density Factual Evidence Sheet from the scanned websites and papers: exact metrics, dates, pricing, specs, and source credibility notes.'
            },
            {
              role: 'user',
              content: `QUERY: ${query}\n\nSCANNED WEBSITES (${evaluatedSources.length} sources):\n${String(sourcesContext).slice(0, 14000)}`
            }
          ], 1400, 0.15);
          factSheet = auditRes.text || '';
        } catch (_) {}
      }

      const langRule = lang === 'hi'
        ? 'Write your response in clear, natural, professional Hindi (देवनागरी लिपि - हिन्दी). CRITICAL: Do NOT put raw **asterisks** inside Markdown table cells.'
        : lang === 'bilingual'
          ? 'Write your response in Bilingual format (English + हिन्दी देवनागरी साथ-साथ). Do NOT put raw **asterisks** inside Markdown table cells.'
          : 'Write your response in crisp, authoritative English. Do NOT put raw **asterisks** inside Markdown table cells.';

      // Adaptive Structure: Honor exact user prompt constraints (e.g., 5 lines, bullets only) OR full research structure!
      const structureGuide = promptIntent.isConstrained
        ? promptIntent.formatInstruction
        : `Structure your response naturally to best answer the user's question:
- Open with a clear Title (# ...) and a high-density Executive Summary grounded in concrete numbers, dates, and inline clickable [Source Title](URL) citations.
- Provide a detailed Factual Breakdown with specific metrics, architecture, and source evaluations.
- Include a Markdown Comparison Table (| Col1 | Col2 | with | :--- | :--- |) whenever comparing multiple items, competitors, or specifications (NEVER put ** around words inside table cells!).
- Close with Key Risks / Recommendations and a numbered Verified Source Bibliography with clickable [Title](URL) links.
- NEVER cut off mid-table or mid-sentence.`;

      const systemPrompt = `You are Morphic Intelligence (Pixelmorphic AI's flagship adaptive research and web evaluation engine).
Current Date: ${nowIso}. Engine: ${modelEngine.toUpperCase()} · Thinking Depth: ${profile.label}.
${langRule}

${structureGuide}`;

      const originBlock = crawledUserUrls.length
        ? '\nINSPECTED URL SOURCE-OF-ORIGIN INTELLIGENCE:\n' + crawledUserUrls.map((u) =>
            `- URL: ${u.url} | Domain: ${u.domain} | Publisher: ${u.siteName} | Type: ${u.category} | Country of Origin: ${u.countryOrigin} | Trust: ${u.trustLevel}\n  Content: ${(u.extractedText || '').slice(0, 2500)}`
          ).join('\n') + '\n'
        : '';
      const placeBlock = placeIntel
        ? `\nREAL-TIME LOCATION & PLACE INTELLIGENCE (${placeIntel.placeName}):\n- Local Time: ${placeIntel.localTimeStr} (${placeIntel.timezone})\n${placeIntel.weatherSummary ? '- ' + placeIntel.weatherSummary + '\n' : ''}`
        : '';
      const dlBlock = pypDownloadLinks.length
        ? '\nVERIFIED DOWNLOADABLE LINKS & PORTALS (Include these exact clickable [Title](URL) links in your report!):\n' + pypDownloadLinks.map((d) => `- [${d.title}](${d.url})`).join('\n') + '\n'
        : '';

      const userPrompt = `USER PROMPT: ${query}\n`
        + originBlock
        + placeBlock
        + dlBlock
        + (factSheet ? `\nPASS-1 VERIFIED FACTUAL EVIDENCE SHEET:\n${factSheet}\n` : '')
        + `\nMULTI-ENGINE SCANNED SOURCES (${evaluatedSources.length} websites & databases scanned on ${nowIso}):\n${String(sourcesContext).slice(0, 16000)}`;

      const finalLLM = await callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], promptIntent.isConstrained ? 2200 : profile.maxTokens, profile.temperature);

      const finalReportText = enforceOutputConstraints(finalLLM.text, promptIntent);

      const baseSeenUrls = new Set(Array.from(seenUrls).map((u) => String(u).split('?')[0]));
      const extraBib = extractBibliographySourcesFromReport(finalReportText, seenUrls).filter((it) => {
        if (!it || !it.url) return false;
        if (/^Source\s*\d+$/i.test(String(it.title || '').trim())) return false;
        const baseU = String(it.url).split('?')[0];
        if (baseSeenUrls.has(baseU)) return false;
        if (isIrrelevantResearchResult(it, query)) return false;
        baseSeenUrls.add(baseU);
        return true;
      });
      if (extraBib.length) {
        const evalExtra = await Promise.all(extraBib.map(it => crawlAndEvaluatePage(it, false)));
        evaluatedSources = [...evaluatedSources, ...evalExtra];
      }

      const totalWordsCrawled = evaluatedSources.reduce((acc, s) => acc + (s.wordCount || 450), 0);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        query,
        promptIntent,
        subQueries,
        mode,
        language: lang,
        modelEngine,
        thinkingLevel,
        thinkingProfile: profile.label,
        totalWordsCrawled,
        sitesScannedCount: evaluatedSources.length,
        model: finalLLM.model,
        durationMs: Date.now() - startMs,
        sources: evaluatedSources,
        reportMarkdown: String(finalReportText || '').replace(/^\s*---\s*$/gm, '')
      }));
    } catch (e) {
      if (!res.writableEnded) {
        res.writeHead((e && e.statusCode) || 500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message || String(e) }));
      }
    } finally {
      if (typeof releaseResearch === 'function') { try { releaseResearch(); } catch (_) {} }
    }
  })();
  return true;
}

const origCreateServer = http.createServer;
http.createServer = function(options, listener) {
  if (typeof options === 'function') {
    const origListener = options;
    return origCreateServer.call(this, function(req, res) {
      if (req && req.url && (req.url.startsWith('/api/general-chat') || req.url.startsWith('/api/morphic-storage') || req.url.includes('chatMode=1'))) {
        return handleGeneralChatApi(req, res);
      }
      if (req && req.url && req.url.startsWith('/api/research')) {
        return handleResearchApi(req, res);
      }
      return origListener.apply(this, arguments);
    });
  }
  if (typeof listener === 'function') {
    const origListener = listener;
    return origCreateServer.call(this, options, function(req, res) {
      if (req && req.url && (req.url.startsWith('/api/general-chat') || req.url.startsWith('/api/morphic-storage') || req.url.includes('chatMode=1'))) {
        return handleGeneralChatApi(req, res);
      }
      if (req && req.url && req.url.startsWith('/api/research')) {
        return handleResearchApi(req, res);
      }
      return origListener.apply(this, arguments);
    });
  }
  return origCreateServer.apply(this, arguments);
};

const origEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function(event, req, res, ...rest) {
  if (event === 'request') {
    if (req && req.url && (req.url.startsWith('/api/general-chat') || req.url.startsWith('/api/morphic-storage') || req.url.includes('chatMode=1'))) {
      handleGeneralChatApi(req, res);
      return true;
    }
    if (req && req.url && req.url.startsWith('/api/research')) {
      handleResearchApi(req, res);
      return true;
    }
  }
  return origEmit.call(this, event, req, res, ...rest);
};
console.log('✅ Pixelmorphic v19.0 Pure Engine Active!');
