import { parse } from './pixelmorphic-acorn-v52.mjs';

export const VERSION = '52.0.0';
export const LIMITS = Object.freeze({ files: 24, projectBytes: 240000, prompt: 12000, bodyBytes: 420000, fileBytes: 160000 });
const bytes = s => new TextEncoder().encode(s).length;
export function safePath(value) {
  if (typeof value !== 'string' || value.length > 120 || !/^[a-zA-Z0-9_./ -]+\.(html|css|js|json|svg|md|txt)$/i.test(value) || value.startsWith('/') || value.includes('\\') || value.split('/').some(s => !s || s === '.' || s === '..') || /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(value.split('/').pop())) throw new Error('Use a relative HTML, CSS, JS, JSON, SVG, MD or TXT filename.');
  return value;
}
export function normalizeFiles(files, allowEmpty = false) {
  if (!Array.isArray(files) || files.length > LIMITS.files || (!allowEmpty && !files.length)) throw new Error(`A project needs 1–${LIMITS.files} text files.`);
  const seen = new Set();
  let total = 0;
  const clean = files.map(f => {
    if (!f || typeof f.content !== 'string') throw new Error('Each file must contain text.');
    const path = safePath(f.path);
    const key = path.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate filename: ${path}`);
    seen.add(key);
    const size = bytes(f.content);
    if (size > LIMITS.fileBytes) throw new Error(`${path} exceeds the 160 KB per-file limit. Split it into smaller files.`);
    total += size;
    return { path, content: f.content };
  });
  if (total > LIMITS.projectBytes) throw new Error('The project exceeds 240 KB of source. Nothing was truncated; reduce its size before continuing.');
  return clean;
}
export function localPath(ref, from = 'index.html') {
  if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return null;
  const result = ref.startsWith('/') ? [] : from.split('/').slice(0, -1);
  for (const part of ref.split(/[?#]/)[0].split('/')) {
    if (part === '..') { if (!result.length) return null; result.pop(); }
    else if (part && part !== '.') result.push(part);
  }
  return result.join('/');
}
export function parseJS(code, mode = 'script') {
  return parse(code, { ecmaVersion: 'latest', sourceType: mode === 'module' ? 'module' : 'script', allowReturnOutsideFunction: mode === 'handler', locations: true });
}
export function walk(ast, visit) {
  const todo = [ast];
  while (todo.length) {
    const node = todo.pop();
    if (!node || typeof node.type !== 'string') continue;
    visit(node);
    for (const [k, val] of Object.entries(node)) {
      if (k === 'loc') continue;
      if (Array.isArray(val)) { for (const child of val) if (child && typeof child.type === 'string') todo.push(child); }
      if (val && typeof val.type === 'string') todo.push(val);
    }
  }
}
export function guardJS(code, guardName, mode = 'script') {
  const ast = parseJS(code, mode);
  const inserts = [];
  const put = (at, text) => inserts.push({ at, text });
  walk(ast, node => {
    if (['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type) && node.source) throw new Error('Module imports need a bundler. Use classic script files for this preview.');
    if (node.type === 'ImportExpression') throw new Error('Dynamic imports are unavailable in the isolated preview.');
    if (/^(ForStatement|ForInStatement|ForOfStatement|WhileStatement|DoWhileStatement)$/.test(node.type)) {
      if (node.body.type === 'BlockStatement') put(node.body.start + 1, `${guardName}();`);
      else { put(node.body.start, `{${guardName}();`); put(node.body.end, '}'); }
    }
    if (/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type)) {
      if (node.body.type === 'BlockStatement') {
        let at = node.body.start + 1;
        for (const statement of node.body.body) { if (statement.directive) at = statement.end; else break; }
        put(at, `;${guardName}();`);
      } else { put(node.body.start, `(${guardName}(),(`); put(node.body.end, '))'); }
    }
  });
  // Stable ordering matters for nested expressions sharing an end position.
  inserts.sort((a,b) => b.at - a.at);
  let result = code;
  for (const i of inserts) result = result.slice(0,i.at) + i.text + result.slice(i.at);
  parseJS(result, mode);
  return result;
}
export function validateProject(input) {
  const files = normalizeFiles(input);
  const checks = [];
  const add = (level, file, message, line) => checks.push({ level, file, message, ...(line ? {line} : {}) });
  const paths = new Set(files.map(f=>f.path));
  if (!paths.has('index.html')) add('error','index.html','Add index.html as the preview entry point.');
  const jsCheck = (content, file, mode, offset = 0) => {
    try {
      const ast = parseJS(content, mode);
      walk(ast, n => { if (n.type === 'ImportDeclaration' || n.type === 'ImportExpression' || (n.type.startsWith('Export') && n.source)) add('warning',file,'Module imports are not bundled in preview. Use local classic scripts.',(n.loc?.start.line || 1)+offset); });
    } catch (e) { add('error',file,`JavaScript: ${e.message}`, (e.loc?.line || 1)+offset); }
  };
  for (const f of files) {
    if (/\.js$/i.test(f.path)) jsCheck(f.content,f.path, /(^|\n)\s*(import |export )/.test(f.content) ? 'module' : 'script');
    if (/\.json$/i.test(f.path)) { try { JSON.parse(f.content); } catch(e) { add('error',f.path,`JSON: ${e.message}`); } }
    if (/\.html$/i.test(f.path)) {
      const html = f.content.replace(/<!--[\s\S]*?-->/g,'');
      if (!/<html\b/i.test(html) || !/<\/html\s*>/i.test(html) || !/<body\b/i.test(html) || !/<\/body\s*>/i.test(html)) add('error',f.path,'Incomplete HTML document: opening and closing html/body tags are required.');
      if (!/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html)) add('warning',f.path,'Add a viewport meta tag for mobile layouts.');
      if (!/<html\b[^>]*\blang\s*=/i.test(html)) add('warning',f.path,'Set the document language for screen readers.');
      const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
      if ((html.match(/<script\b/gi)||[]).length !== scripts.length) add('error',f.path,'An unclosed script tag was found.');
      for (const s of scripts) {
        const type = s[1].match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1] || '';
        if (!/\bsrc\s*=/.test(s[1]) && (!type || /^(module|text\/javascript|application\/javascript)$/i.test(type))) jsCheck(s[2],f.path,type === 'module' ? 'module' : 'script',html.slice(0,s.index).split('\n').length-1);
      }
      for (const m of html.matchAll(/<(script|link|img)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
        const resolved = localPath(m[2],f.path);
        if (resolved && !paths.has(resolved)) add('error',f.path,`Missing local asset: ${resolved}`);
        if (!resolved && /^(script|link)$/i.test(m[1]) && /^https?:|^\/\//i.test(m[2])) add('warning',f.path,'External scripts/styles are blocked in offline preview. Bundle the dependency locally.');
      }
      for (const m of html.matchAll(/<img\b[^>]*>/gi)) if (!/\balt\s*=/i.test(m[0])) add('warning',f.path,'An image is missing alternative text.');
    }
    if (/\.css$/i.test(f.path) && /@import\b/i.test(f.content)) add('warning',f.path,'CSS @import is blocked in preview. Keep styles in local linked CSS files.');
  }
  if (!checks.some(c=>c.level==='error')) add('pass','project','HTML structure, local references and JavaScript syntax checks passed.');
  add('info','project','These are static checks. Test behavior, layout and accessibility in Preview.');
  return checks.slice(0,60);
}
export function mergeOutput(current, output) {
  if (!output || typeof output !== 'object' || !Array.isArray(output.files) || !output.files.length) throw new Error('The model did not return a files array. Your current files are unchanged.');
  const changes = normalizeFiles(output.files);
  const map = new Map(normalizeFiles(current,true).map(f=>[f.path,f]));
  for (const file of changes) map.set(file.path,file);
  // Deleting files is a user action in the editor, never an implicit AI operation.
  return normalizeFiles([...map.values()]);
}
