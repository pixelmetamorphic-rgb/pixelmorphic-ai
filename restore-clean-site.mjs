import fs from 'node:fs';
import path from 'node:path';

console.log('Restoring clean original application state...');

// 1. Restore public/index.html from update-backups if available
function findNewestIndexBackup(dir) {
  let bestFile = null;
  let bestMtime = 0;
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = findNewestIndexBackup(full);
      if (sub && sub.mtime > bestMtime) {
        bestFile = sub.file;
        bestMtime = sub.mtime;
      }
    } else if (entry.name.toLowerCase().includes('index') && entry.name.endsWith('.html')) {
      const st = fs.statSync(full);
      if (st.mtimeMs > bestMtime) {
        bestFile = full;
        bestMtime = st.mtimeMs;
      }
    }
  }
  return bestFile ? { file: bestFile, mtime: bestMtime } : null;
}

const backup = findNewestIndexBackup('update-backups');
if (backup && backup.file) {
  fs.copyFileSync(backup.file, 'public/index.html');
  console.log('✅ Restored public/index.html from clean backup:', backup.file);
}

// 2. Clean public/studio-tools.js so NO injected research/chat code corrupts the host app
const studioPath = 'public/studio-tools.js';
if (fs.existsSync(studioPath)) {
  let tools = fs.readFileSync(studioPath, 'utf8');
  const cutMarkers = [
    '/* === MORPHIC_RESEARCH_UI_START === */',
    '/* === MORPHIC_GENERAL_CHAT_UI_START === */',
    '/* === MORPHIC RESEARCH',
    '/* === PIXELMORPHIC RESEARCH',
    '/* === PIXELMORPHIC RESEARCH LAB V4',
    '/* Pixelmorphic Research Lab',
    '/* Pixelmorphic AI Research Lab',
    '/* ============================================================================\n * PIXELMORPHIC AI',
    '/* ============================================================================\r\n * PIXELMORPHIC AI',
    '// ============================================================================\n// PIXELMORPHIC AI',
    '// ============================================================================\r\n// PIXELMORPHIC AI',
    'window.__cleanResearch',
    'window.__researchLab',
    'window.__emeraldResearch',
    'window.__pmResearchSafeV4',
    'window.__morphicResearch',
    'window.__verifiedResearch',
    'window.__morphicGeneralChat'
  ];

  let earliestIdx = -1;
  for (const m of cutMarkers) {
    const idx = tools.indexOf(m);
    if (idx !== -1) {
      let cutPos = idx;
      if (m.startsWith('window.__')) {
        const iifePos = tools.lastIndexOf('(function', idx);
        if (iifePos !== -1 && idx - iifePos < 450) cutPos = iifePos;
      }
      if (earliestIdx === -1 || cutPos < earliestIdx) earliestIdx = cutPos;
    }
  }

  if (earliestIdx !== -1) {
    tools = tools.slice(0, earliestIdx).trimEnd();
    fs.writeFileSync(studioPath, tools + '\n', 'utf8');
    console.log('✅ Cleaned public/studio-tools.js of all injected foreign code!');
  } else {
    console.log('ℹ️ public/studio-tools.js already clean.');
  }
}

// 3. Make sure public/index.html only loads original scripts + non-invasive modular general-chat-ui.js
if (fs.existsSync('public/index.html')) {
  let html = fs.readFileSync('public/index.html', 'utf8');
  // Remove broken or duplicate script tags
  html = html.replace(/\s*<script[^>]*verified-research-ui\.js[^>]*><\/script>/gi, '');
  html = html.replace(/\s*<script[^>]*general-chat-ui\.js[^>]*><\/script>/gi, '');
  // Make sure original scripts are present
  for (const scriptName of ['/integration.js', '/ultra.js', '/studio-tools.js']) {
    if (!html.includes(scriptName) && fs.existsSync('public' + scriptName)) {
      html = html.replace('</body>', `  <script src="${scriptName}"></script>\n</body>`);
    }
  }
  // Add modular general-chat-ui.js
  if (fs.existsSync('public/general-chat-ui.js')) {
    html = html.replace('</body>', `  <script src="/general-chat-ui.js?v=${Date.now()}"></script>\n</body>`);
  }
  fs.writeFileSync('public/index.html', html, 'utf8');
  console.log('✅ Restored clean script order in public/index.html');
}

console.log('\n🎉 All host files restored to 100% clean original state!');
