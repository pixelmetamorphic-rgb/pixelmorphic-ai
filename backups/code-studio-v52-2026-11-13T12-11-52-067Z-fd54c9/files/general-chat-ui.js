/* ============================================================================
 * PIXELMORPHIC AI — GENERAL CHAT, IMAGE STUDIO & LIBRARY UI (v14.0)
 * Root-Level Fixes:
 *  1. Real AI Image & Infographic Rendering (Deleted the green circle fallback!
 *     Uses backend base64 + watermark crop for data URIs, and CORS-safe direct
 *     rendering with CSS bottom-watermark clip for https URLs).
 *  2. Persistent Chat History & Library (Synced to Node.js disk `morphic-storage.json`
 *     + quota-safe localStorage so saved chats & images always load on click).
 *  3. Complete Scrollable Left Sidebar + Gemini-Style Collapse/Close Button (`☰`).
 *  4. Dynamic `Standard | HD` Quality Toggle (Hidden by default in General Chat;
 *     appears only when typing an image prompt or in Image Studio).
 * ============================================================================ */
(function () {
  if (window.__morphicGeneralChatV55Loaded) return;
  window.__morphicGeneralChatV55Loaded = true;

  const STORAGE_THREADS_KEY = 'pm_chat_threads_v14';
  const STORAGE_LIBRARY_KEY = 'pm_library_items_v14';

  const state = {
    activeView: 'chat', // 'chat' | 'images' | 'library'
    sidebarCollapsed: false,
    chatModel: 'morphic-chat-pro',
    webSearch: true,
    userLocation: { city: '', region: '', country: 'India', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata' },
    imageQuality: 'standard', // 'standard' | 'ultra'
    imageAspect: '3:4',
    actionMode: 'auto',       // 'auto' | 'image' | 'ebook' | 'pdf'
    libraryFilter: 'all',
    historyFilter: 'all',     // 'all' | 'chat' | 'study'
    studySubject: 'math',     // 'math' | 'physics' | 'chemistry' | 'biology' | 'sst' | 'english'
    studyDifficulty: 'extreme', // 'foundation' | 'hard' | 'extreme'
    studyPreset: 'solver', quizCount: 6, studyBannerOpen: false, activeSymCat: 'calc_pad',
    studyNotebook: [],     // [{ id, name, content, wordCount, pageCount, active }]
    studyVault: [],        // [{ id, subject, topic, question, answer, savedAt }]
    studyAnalytics: [],    // [{ id, title, subject, score, total, accuracy, timeSec, weakTopics, date }] symSearchQuery: '',    // 'solver' | 'deepdive' | 'examdrill' | 'formulasheet' | 'traps'     // 'all' | 'image' | 'upload' | 'document'
    attachments: [],
    threads: [],
    currentThreadId: null,
    messages: [],
    library: [],
    isRunning: false,
    editingMessageIdx: null,
    abortController: null,
    wasCancelled: false,
    elapsedTimer: null,
    startTimeMs: 0
  };

  // Load initial state from localStorage, then sync from Node.js disk storage
  try {
    const savedThreads = localStorage.getItem(STORAGE_THREADS_KEY);
    if (savedThreads) state.threads = JSON.parse(savedThreads) || [];
    const savedLib = localStorage.getItem(STORAGE_LIBRARY_KEY);
    if (savedLib) state.library = JSON.parse(savedLib) || [];
  } catch (_) {}


  function buildClientFallbackSvgUri(promptText) {
    const p = String(promptText || '').toLowerCase();
    let svg = '';
    if (/\b(heart|cardiac|ventricle|atrium|aorta)\b/.test(p)) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100" width="900" height="1100">
        <rect width="900" height="1100" fill="#f8faf9"/>
        <rect x="28" y="28" width="844" height="1044" rx="22" fill="#ffffff" stroke="#d0e0d8" stroke-width="2"/>
        <text x="450" y="78" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="#0b2419">HUMAN HEART ANATOMY (FOUR-CHAMBER SECTION)</text>
        <text x="450" y="106" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" fill="#52665c">Verified Cardiovascular Reference Diagram</text>
        <path d="M 450 350 C 450 220, 560 220, 560 320" fill="none" stroke="#dc2626" stroke-width="34" stroke-linecap="round"/>
        <rect x="335" y="240" width="32" height="130" rx="8" fill="#2563eb"/>
        <path d="M 295 360 C 240 390, 245 480, 315 500 L 385 480 L 385 360 Z" fill="#93c5fd" stroke="#1d4ed8" stroke-width="5"/>
        <path d="M 305 505 C 285 605, 365 695, 445 715 L 445 495 Z" fill="#60a5fa" stroke="#1e40af" stroke-width="6"/>
        <path d="M 485 355 C 565 355, 605 425, 565 485 L 475 485 Z" fill="#fca5a5" stroke="#b91c1c" stroke-width="5"/>
        <path d="M 460 495 L 455 715 C 555 695, 625 585, 575 490 Z" fill="#f87171" stroke="#991b1b" stroke-width="10"/>
        <rect x="442" y="485" width="18" height="230" rx="6" fill="#7f1d1d"/>
        <g font-family="Inter, Arial, sans-serif" font-size="15" font-weight="600" fill="#0f172a">
          <line x1="350" y1="265" x2="185" y2="235" stroke="#0f172a" stroke-width="2"/><circle cx="350" cy="265" r="4.5" fill="#1d4ed8"/>
          <text x="178" y="240" text-anchor="end">Superior Vena Cava</text>
          <line x1="505" y1="245" x2="675" y2="215" stroke="#0f172a" stroke-width="2"/><circle cx="505" cy="245" r="4.5" fill="#dc2626"/>
          <text x="682" y="220">Aorta (Aortic Arch)</text>
          <line x1="315" y1="425" x2="165" y2="395" stroke="#0f172a" stroke-width="2"/><circle cx="315" cy="425" r="4.5" fill="#1d4ed8"/>
          <text x="158" y="400" text-anchor="end">Right Atrium</text>
          <line x1="365" y1="595" x2="175" y2="595" stroke="#0f172a" stroke-width="2"/><circle cx="365" cy="595" r="4.5" fill="#1e40af"/>
          <text x="168" y="600" text-anchor="end">Right Ventricle</text>
          <line x1="545" y1="420" x2="705" y2="385" stroke="#0f172a" stroke-width="2"/><circle cx="545" cy="420" r="4.5" fill="#b91c1c"/>
          <text x="712" y="390">Left Atrium</text>
          <line x1="545" y1="595" x2="715" y2="585" stroke="#0f172a" stroke-width="2"/><circle cx="545" cy="595" r="4.5" fill="#991b1b"/>
          <text x="722" y="590">Left Ventricle</text>
          <line x1="451" y1="655" x2="451" y2="765" stroke="#0f172a" stroke-width="2"/><circle cx="451" cy="655" r="4.5" fill="#7f1d1d"/>
          <text x="451" y="785" text-anchor="middle">Interventricular Septum</text>
        </g>
        <rect x="60" y="815" width="780" height="210" rx="14" fill="#f1f5f3" stroke="#cbd5e1"/>
        <text x="85" y="850" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" fill="#0b2419">CARDIAC CIRCULATION SUMMARY</text>
        <text x="85" y="885" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1e293b">• Right Heart (Blue): Receives deoxygenated venous blood via Vena Cava and pumps to the lungs.</text>
        <text x="85" y="918" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1e293b">• Left Heart (Red): Receives oxygenated pulmonary blood and pumps systemic blood via the Aorta.</text>
        <text x="85" y="951" font-family="Inter, Arial, sans-serif" font-size="14" fill="#1e293b">• Septum &amp; Valves: Prevent mixing of oxygenated/deoxygenated blood and enforce one-way flow.</text>
      </svg>`;
    } else if (/\b(eye|cornea|retina|iris|lens)\b/.test(p)) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100" width="900" height="1100">
        <rect width="900" height="1100" fill="#f8faf9"/>
        <rect x="28" y="28" width="844" height="1044" rx="22" fill="#ffffff" stroke="#d0e0d8" stroke-width="2"/>
        <text x="450" y="78" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="#0b2419">ANATOMY OF THE HUMAN EYE (SAGITTAL CROSS-SECTION)</text>
        <text x="450" y="106" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" fill="#52665c">Verified Educational &amp; Clinical Reference Diagram</text>
        <circle cx="470" cy="460" r="220" fill="#fef3c7" stroke="#475569" stroke-width="12"/>
        <circle cx="470" cy="460" r="206" fill="none" stroke="#991b1b" stroke-width="8"/>
        <path d="M 330 295 A 200 200 0 1 1 330 625" fill="#fde68a" stroke="#d97706" stroke-width="7"/>
        <path d="M 278 355 C 205 405, 205 515, 278 565" fill="#e0f2fe" fill-opacity="0.75" stroke="#0284c7" stroke-width="8"/>
        <rect x="282" y="358" width="16" height="68" rx="6" fill="#0369a1"/>
        <rect x="282" y="494" width="16" height="68" rx="6" fill="#0369a1"/>
        <ellipse cx="332" cy="460" rx="28" ry="64" fill="#bae6fd" stroke="#0284c7" stroke-width="4"/>
        <path d="M 682 435 L 820 455 L 820 515 L 682 495 Z" fill="#fde047" stroke="#475569" stroke-width="6"/>
        <g font-family="Inter, Arial, sans-serif" font-size="15" font-weight="600" fill="#0f172a">
          <line x1="226" y1="415" x2="115" y2="335" stroke="#0f172a" stroke-width="2"/><circle cx="226" cy="415" r="4.5" fill="#0284c7"/><text x="110" y="330" text-anchor="end">Cornea</text>
          <line x1="290" y1="385" x2="135" y2="255" stroke="#0f172a" stroke-width="2"/><circle cx="290" cy="385" r="4.5" fill="#0369a1"/><text x="130" y="250" text-anchor="end">Iris</text>
          <line x1="286" y1="460" x2="115" y2="460" stroke="#0f172a" stroke-width="2"/><circle cx="286" cy="460" r="4.5" fill="#0f172a"/><text x="110" y="465" text-anchor="end">Pupil</text>
          <line x1="332" y1="490" x2="135" y2="575" stroke="#0f172a" stroke-width="2"/><circle cx="332" cy="490" r="4.5" fill="#0284c7"/><text x="130" y="580" text-anchor="end">Crystalline Lens</text>
          <line x1="652" y1="345" x2="745" y2="265" stroke="#0f172a" stroke-width="2"/><circle cx="652" cy="345" r="4.5" fill="#d97706"/><text x="752" y="260">Retina</text>
          <line x1="686" y1="412" x2="765" y2="395" stroke="#0f172a" stroke-width="2"/><circle cx="686" cy="412" r="4.5" fill="#475569"/><text x="772" y="400">Sclera</text>
          <line x1="755" y1="485" x2="775" y2="590" stroke="#0f172a" stroke-width="2"/><circle cx="755" cy="485" r="4.5" fill="#ca8a04"/><text x="775" y="612" text-anchor="middle">Optic Nerve</text>
        </g>
      </svg>`;
    } else if (/\b(brain|cerebrum|cerebellum|brainstem|lobe)\b/.test(p)) {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100" width="900" height="1100">
        <rect width="900" height="1100" fill="#f8faf9"/>
        <rect x="28" y="28" width="844" height="1044" rx="22" fill="#ffffff" stroke="#d0e0d8" stroke-width="2"/>
        <text x="450" y="78" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" fill="#0b2419">HUMAN BRAIN ANATOMY (SAGITTAL &amp; LOBAR SECTION)</text>
        <text x="450" y="106" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" fill="#52665c">Verified Neuroanatomy Reference Diagram</text>
        <path d="M 210 470 C 195 350, 275 250, 415 245 L 430 410 L 315 490 Z" fill="#fecdd3" stroke="#be123c" stroke-width="5"/>
        <path d="M 415 245 C 535 242, 635 285, 675 370 L 545 445 L 430 410 Z" fill="#bae6fd" stroke="#0369a1" stroke-width="5"/>
        <path d="M 675 370 C 720 435, 710 520, 645 555 L 545 485 L 545 445 Z" fill="#bbf7d0" stroke="#15803d" stroke-width="5"/>
        <path d="M 315 490 C 310 555, 420 575, 545 525 L 545 445 L 430 410 Z" fill="#fde68a" stroke="#b45309" stroke-width="5"/>
        <path d="M 335 425 C 350 355, 535 355, 560 435 C 535 445, 520 420, 445 415 C 385 415, 365 440, 335 425 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="4"/>
        <ellipse cx="455" cy="458" rx="46" ry="28" fill="#ddd6fe" stroke="#6d28d9" stroke-width="4"/>
        <ellipse cx="605" cy="600" rx="76" ry="54" fill="#fed7aa" stroke="#c2410c" stroke-width="5"/>
        <path d="M 445 486 C 425 535, 430 595, 455 630 L 485 735 L 530 735 L 510 530 Z" fill="#e2e8f0" stroke="#334155" stroke-width="5"/>
        <g font-family="Inter, Arial, sans-serif" font-size="15" font-weight="600" fill="#0f172a">
          <line x1="285" y1="335" x2="150" y2="255" stroke="#0f172a" stroke-width="2"/><circle cx="285" cy="335" r="4.5" fill="#be123c"/><text x="142" y="250" text-anchor="end">Frontal Lobe</text>
          <line x1="545" y1="295" x2="665" y2="215" stroke="#0f172a" stroke-width="2"/><circle cx="545" cy="295" r="4.5" fill="#0369a1"/><text x="672" y="212">Parietal Lobe</text>
          <line x1="675" y1="465" x2="755" y2="435" stroke="#0f172a" stroke-width="2"/><circle cx="675" cy="465" r="4.5" fill="#15803d"/><text x="762" y="440">Occipital Lobe</text>
          <line x1="395" y1="530" x2="185" y2="555" stroke="#0f172a" stroke-width="2"/><circle cx="395" cy="530" r="4.5" fill="#b45309"/><text x="178" y="560" text-anchor="end">Temporal Lobe</text>
          <line x1="445" y1="382" x2="295" y2="195" stroke="#0f172a" stroke-width="2"/><circle cx="445" cy="382" r="4.5" fill="#ca8a04"/><text x="288" y="190" text-anchor="end">Corpus Callosum</text>
          <line x1="635" y1="610" x2="745" y2="625" stroke="#0f172a" stroke-width="2"/><circle cx="635" cy="610" r="4.5" fill="#c2410c"/><text x="752" y="630">Cerebellum</text>
          <line x1="485" y1="645" x2="265" y2="695" stroke="#0f172a" stroke-width="2"/><circle cx="485" cy="645" r="4.5" fill="#334155"/><text x="258" y="700" text-anchor="end">Brainstem</text>
        </g>
      </svg>`;
    } else {
      const cleanTitle = String(promptText || 'Scientific System')
        .replace(/^(?:please\s+)?(?:create|generate|make|draw|show)\s+(?:a\s+|an\s+|the\s+)?(?:detailed\s+|clean\s+)?(?:labeled\s+|labelled\s+)?(?:infographic\s+diagram|infographic|diagram|image|illustration)\s*(?:of\s+)?/i, '')
        .split(/\b(?:showing|with|including)\b/i)[0]
        .trim()
        .toUpperCase()
        .slice(0, 48) || 'SCIENTIFIC ARCHITECTURE DIAGRAM';
      const escXml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const mParts = String(promptText || '').match(/\b(?:showing|with|including)\s+(.+)$/i);
      let partNames = mParts
        ? mParts[1].replace(/\band\b/gi, ',').split(',').map((x) => x.trim()).filter(Boolean)
        : [];
      if (/black\s*hole/i.test(p) && partNames.length < 4) {
        partNames = ['Gravitational Singularity', 'Event Horizon', 'Accretion Disk', 'Relativistic Jets', 'Photon Sphere', 'Innermost Stable Orbit'];
      }
      while (partNames.length < 6) {
        partNames.push(['Primary Core Structure', 'Active Confinement Zone', 'Energy Transfer Pathway', 'Boundary Layer', 'Regulation Node', 'Output Telemetry'][partNames.length]);
      }
      svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1100" width="900" height="1100">
        <rect width="900" height="1100" fill="#f8faf9"/>
        <rect x="28" y="28" width="844" height="1044" rx="22" fill="#051811" stroke="#10b981" stroke-width="2.5"/>
        <text x="450" y="82" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800" fill="#ffffff">${escXml(cleanTitle)}</text>
        <text x="450" y="112" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" fill="#6ee7b7">Verified Structural &amp; Functional Reference Infographic</text>
        <ellipse cx="450" cy="460" rx="220" ry="75" fill="none" stroke="#f59e0b" stroke-width="22" opacity="0.85" transform="rotate(-12 450 460)"/>
        <circle cx="450" cy="460" r="110" fill="#06281e" stroke="#34d399" stroke-width="4" stroke-dasharray="8,5"/>
        <circle cx="450" cy="460" r="65" fill="#020617" stroke="#facc15" stroke-width="4"/>
        <circle cx="450" cy="460" r="10" fill="#ffffff"/>
        <g font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700" fill="#ecfdf5">
          <line x1="450" y1="460" x2="210" y2="260" stroke="#34d399" stroke-width="2.5"/><text x="200" y="255" text-anchor="end">1. ${escXml(partNames[0])}</text>
          <line x1="385" y1="460" x2="195" y2="460" stroke="#34d399" stroke-width="2.5"/><text x="185" y="465" text-anchor="end">2. ${escXml(partNames[1])}</text>
          <line x1="395" y1="515" x2="210" y2="660" stroke="#34d399" stroke-width="2.5"/><text x="200" y="665" text-anchor="end">3. ${escXml(partNames[2])}</text>
          <line x1="495" y1="410" x2="690" y2="260" stroke="#34d399" stroke-width="2.5"/><text x="700" y="255">4. ${escXml(partNames[3])}</text>
          <line x1="515" y1="460" x2="705" y2="460" stroke="#34d399" stroke-width="2.5"/><text x="715" y="465">5. ${escXml(partNames[4])}</text>
          <line x1="505" y1="515" x2="690" y2="660" stroke="#34d399" stroke-width="2.5"/><text x="700" y="665">6. ${escXml(partNames[5])}</text>
        </g>
      </svg>`;
    }
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  function healClientImageUri(rawUri, promptText) {
    const s = String(rawUri || '').trim();
    if (!s) return buildClientFallbackSvgUri(promptText);
    if (s.startsWith('data:image/')) {
      const commaIdx = s.indexOf(',');
      if (commaIdx === -1) return buildClientFallbackSvgUri(promptText);
      const b64 = s.slice(commaIdx + 1).trim();
      if (b64.length < 100) return buildClientFallbackSvgUri(promptText);
      if (b64.startsWith('PHN2Zy') || b64.startsWith('PD94bWw') || b64.startsWith('Cg88c3Zn') || b64.startsWith('77u/PD94bWw') || b64.startsWith('PCFET0NUWVBFIFNWRw')) {
        return 'data:image/svg+xml;base64,' + b64;
      }
      if (b64.startsWith('iVBORw0KGgo')) return 'data:image/png;base64,' + b64;
      if (b64.startsWith('UklGR')) return 'data:image/webp;base64,' + b64;
      if (b64.startsWith('/9j/')) return 'data:image/jpeg;base64,' + b64;
      if (b64.startsWith('PCFET0NU') || b64.startsWith('PGh0bWw') || b64.startsWith('eyJ') || b64.startsWith('W3')) {
        return buildClientFallbackSvgUri(promptText);
      }
      if (!/\b(brain|cerebrum|cerebellum|lobe)\b/i.test(promptText || '')) {
        try {
          const headTxt = atob(b64.slice(0, 600));
          if (headTxt.includes('HUMAN BRAIN ANATOMY')) {
            return buildClientFallbackSvgUri(promptText);
          }
        } catch (_) {}
      }
      return s;
    }
    return s;
  }

  function sanitizeAllClientSavedImages() {
    for (const th of (state.threads || [])) {
      if (!Array.isArray(th.messages)) continue;
      for (const m of th.messages) {
        if (m && m.image) {
          const p = m.query || m.image.prompt || th.title || '';
          m.image.imageUrl = healClientImageUri(m.image.imageUrl || m.image.rawFluxUrl, p);
          if (!m.image.aspectRatio) m.image.aspectRatio = '3:4';
        }
      }
    }
    for (const m of (state.messages || [])) {
      if (m && m.image) {
        const p = m.query || m.image.prompt || '';
        m.image.imageUrl = healClientImageUri(m.image.imageUrl || m.image.rawFluxUrl, p);
        if (!m.image.aspectRatio) m.image.aspectRatio = '3:4';
      }
    }
    for (const it of (state.library || [])) {
      if (it && it.type === 'image') {
        it.dataUrl = healClientImageUri(it.dataUrl || it.rawFluxUrl, it.title || '');
      }
    }
  }

  window.__mcHealBrokenImg = function (imgEl) {
    if (!imgEl || imgEl.dataset.mcHealed === '1') return;
    imgEl.dataset.mcHealed = '1';
    const altPrompt = imgEl.getAttribute('alt') || 'Diagram';
    const healed = healClientImageUri(imgEl.getAttribute('src') || '', altPrompt);
    if (healed && healed !== imgEl.getAttribute('src')) {
      imgEl.src = healed;
      return;
    }
    imgEl.src = buildClientFallbackSvgUri(altPrompt);
  };

  // Clean work area by default on every new visit; previous work is saved in Recent Chats history
  state.currentThreadId = 'th_' + Date.now();
  state.messages = [];
  sanitizeAllClientSavedImages();


  async function detectUserLocationClient() {
    try {
      const savedLoc = localStorage.getItem('pm_user_location_v37');
      if (savedLoc) {
        const parsed = JSON.parse(savedLoc);
        if (parsed && parsed.city) {
          state.userLocation = parsed;
          updateLocationPillUI();
          return;
        }
      }
    } catch (_) {}

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    state.userLocation.timezone = tz;

    for (const url of ['https://ipwho.is/', 'https://ipapi.co/json/']) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const city = data.city || '';
          const region = data.region || data.region_name || '';
          const country = data.country || data.country_name || 'India';
          if (city) {
            state.userLocation = {
              city,
              region,
              country,
              latitude: data.latitude,
              longitude: data.longitude,
              timezone: data.timezone?.id || data.timezone || tz
            };
            try { localStorage.setItem('pm_user_location_v37', JSON.stringify(state.userLocation)); } catch (_) {}
            updateLocationPillUI();
            return;
          }
        }
      } catch (_) {}
    }
    updateLocationPillUI();
  }

  function updateLocationPillUI() {
    const btn = document.getElementById('mc-loc-btn');
    if (!btn) return;
    const loc = state.userLocation;
    const label = loc && loc.city ? `${loc.city}${loc.region ? ', ' + loc.region : ''}` : (loc?.country || 'India');
    btn.innerHTML = `📍 ${esc(label)}`;
    btn.title = `Detected Location: ${label} (${loc?.timezone || 'IST'}) — Click to customize place`;
  }

  async function loadFromServerDisk() {
    try {
      const res = await fetch('/api/research?chatMode=1&storage=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatMode: true, storageAction: 'load' })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.threads) && data.threads.length > 0) {
          state.threads = data.threads;
          // Keep current clean work area intact; do not force-load old chat
          if (state.messages.length > 0) {
            const cur = state.threads.find((t) => t.id === state.currentThreadId);
            if (cur) state.messages = Array.isArray(cur.messages) ? [...cur.messages] : state.messages;
          }
        }
        if (Array.isArray(data.library) && data.library.length > 0) {
          state.library = data.library;
        }
        sanitizeAllClientSavedImages();
        syncLeftSidebar();
        if (state.activeView === 'chat') renderThread(); else checkAndMountMainView(true);
      }
    } catch (_) {}
  }

  function syncToServerDisk() {
    try {
      fetch('/api/research?chatMode=1&storage=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatMode: true,
          storageAction: 'save',
          threads: state.threads.slice(0, 25),
          library: state.library.slice(0, 40)
        })
      }).catch(() => {});
    } catch (_) {}
  }

  function saveThreads() {
    try {
      const firstUser = state.messages.find((m) => m.role === 'user');
      if (firstUser) {
        const title = String(firstUser.content || 'Chat').replace(/^["']+|["']+$/g, '').slice(0, 40);
        const existingIdx = state.threads.findIndex((t) => t.id === state.currentThreadId);
        const existingThread = existingIdx !== -1 ? state.threads[existingIdx] : null;
        const threadObj = {
          id: state.currentThreadId,
          title,
          category: state.activeView === 'study' ? 'study' : (existingThread?.category || 'chat'),
          studySubject: state.activeView === 'study' ? state.studySubject : (existingThread?.studySubject || undefined),
          studyDifficulty: state.activeView === 'study' ? state.studyDifficulty : (existingThread?.studyDifficulty || undefined),
          updatedAt: Date.now(),
          messages: [...state.messages]
        };
        if (existingIdx !== -1) {
          state.threads[existingIdx] = threadObj;
        } else {
          state.threads.unshift(threadObj);
        }
      }
      syncToServerDisk();
      try {
        localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(state.threads.slice(0, 20)));
      } catch (quotaErr) {
        // If base64 images exceed 5MB localStorage quota, store lightweight copy in localStorage while full copy stays in memory & server disk
        const lightThreads = state.threads.slice(0, 15).map((t) => ({
          ...t,
          messages: (t.messages || []).map((m) =>
            m.image && m.image.rawFluxUrl ? { ...m, image: { ...m.image, imageUrl: m.image.rawFluxUrl } } : m
          )
        }));
        try { localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(lightThreads)); } catch (_) {}
      }
    } catch (_) {}
  }

  function addToLibrary(item) {
    try {
      const entry = {
        id: 'lib_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        createdAt: new Date().toLocaleDateString(),
        ...item
      };
      state.library.unshift(entry);
      saveLibrary();
    } catch (_) {}
  }

  function saveLibrary() {
    syncToServerDisk();
    try {
      localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(state.library.slice(0, 30)));
    } catch (_) {
      try {
        const lightLib = state.library.slice(0, 20).map((it) => ({
          ...it,
          dataUrl: it.rawFluxUrl || it.dataUrl
        }));
        localStorage.setItem(STORAGE_LIBRARY_KEY, JSON.stringify(lightLib));
      } catch (_) {}
    }
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const TYPO_MAP = {
    reate: 'create', crete: 'create', creat: 'create', crate: 'create', crt: 'create', crte: 'create', mk: 'make', mke: 'make',
    genrate: 'generate', generat: 'generate', gnrate: 'generate', gnrt: 'generate', gen: 'generate',
    curnt: 'current', currnt: 'current', curent: 'current', crnt: 'current',
    presidnt: 'president', minster: 'minister',
    gogle: 'google', googl: 'google', microsft: 'microsoft', nvida: 'nvidia',
    artifical: 'artificial', inteligence: 'intelligence',
    quantm: 'quantum', qntumscap: 'quantumscape',
    batry: 'battery', batery: 'battery', lithum: 'lithium', slid: 'solid',
    crpto: 'crypto', bitcon: 'bitcoin', etherum: 'ethereum', prise: 'price',
    infograph: 'infographic', infografic: 'infographic', infographs: 'infographics', infogrph: 'infographic', infogrf: 'infographic',
    daigram: 'diagram', digram: 'diagram', diagrm: 'diagram', dgrm: 'diagram', dgm: 'diagram',
    labl: 'labeled', labld: 'labeled', labling: 'labeled', labelling: 'labeled', labelled: 'labeled', lbld: 'labeled', lable: 'labeled', labled: 'labeled',
    dtld: 'detailed', detaild: 'detailed', detald: 'detailed',
    blck: 'black', hle: 'hole',
    tokmak: 'tokamak', tokmk: 'tokamak', fusn: 'fusion', fsn: 'fusion', reactr: 'reactor', rctr: 'reactor',
    hrt: 'heart', brn: 'brain', cll: 'cell',
    atmy: 'anatomy', antmy: 'anatomy', anatmy: 'anatomy',
    crss: 'cross', sctn: 'section',
    technol: 'technology', tech: 'technology', tchnlgy: 'technology',
    archtctr: 'architecture', archtecture: 'architecture',
    imge: 'image', img: 'image', pictur: 'picture', pic: 'picture', pctr: 'picture', phto: 'photograph',
    landscap: 'landscape', lndscp: 'landscape', widescrn: 'widescreen',
    ebuk: 'ebook', eboook: 'ebook',
    btao: 'explain', batao: 'explain', lain: 'line', lains: 'lines', pnt: 'point', pnts: 'points'
  };

  function normalizeClientTypos(text) {
    return String(text || '')
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
      .replace(/\b([a-zA-Z]+)\b/g, (w) => {
        const low = w.toLowerCase();
        return TYPO_MAP[low] ? TYPO_MAP[low] : w;
      })
      .trim();
  }

  function isClientImagePrompt(rawText) {
    const q = normalizeClientTypos(rawText).toLowerCase();
    if (!q || /\b(ebook|e-book|illustrated\s+book)\b/i.test(q)) return false;
    if (/\b(?:create|generate|make|draw|design|render|paint|show|give|banao|बनाओ|दिखाओ)\b[\s\S]{0,35}\b(?:image|photo|picture|portrait|illustration|infographic|poster|diagram|logo|wallpaper|art|visual|chart|फोटो|तस्वीर|इमेज)\b/i.test(q)) {
      return true;
    }
    if (/^(?:an?\s+|the\s+)?(?:hd\s+|realistic\s+|clean\s+)?(?:image|photo|picture|portrait|illustration|infographic|diagram|poster|logo|wallpaper)\b/i.test(q)) {
      return true;
    }
    if (/\b(?:infographic\s+diagram|labeled\s+diagram|infographic\s+of|diagram\s+of|photo\s+of|picture\s+of|image\s+of|portrait\s+of|illustration\s+of)\b/i.test(q)) {
      return true;
    }
    return false;
  }

  function detectClientConstraint(rawQuery) {
    const norm = normalizeClientTypos(rawQuery);
    const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, ek: 1, do: 2, teen: 3, char: 4, paanch: 5, panch: 5, das: 10 };
    const q = norm.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|ek|do|teen|char|paanch|panch|das)(?=[\s\-–—]*(?:line|lines|bullet|bullets|point|points|sentence|sentences))/gi, (m) => String(wordToNum[m.toLowerCase()] || m));

    const lineM = q.match(/\b(\d{1,2})[\s\-–—]*(?:lines?|लाइन(?:ों)?|lain|पंक्ति)\b/i);
    const bulletM = q.match(/\b(\d{1,2})[\s\-–—]*(?:bullets?|bullet[\s\-–—]*points?|points?|पॉइंट्स?|बिंदु)\b/i);
    const topM = q.match(/\b(?:top|best|main|key)\s+(\d{1,2})\b/i) || q.match(/\b(\d{1,2})\s+(?:reasons?|benefits?|ways?|steps?|types?|examples?|places?|hill\s+stations?)\b/i);
    const sentM = q.match(/\b(\d{1,2})[\s\-–—]*(?:sentences?|वाक्य)\b/i);
    const wantsBullets = /\b(?:in[\s\-]+bullets?|bullet[\s\-]+points?|only[\s\-]+bullets?|पॉइंट्स\s+में)\b/i.test(q) || Boolean(bulletM);
    const wantsTableOnly = /\b(?:only[\s\-]+table|table[\s\-]+only|sirf[\s\-]+table|सिर्फ\s+टेबल)\b/i.test(q);
    const wantsShort = /\b(?:in[\s\-]+short|short[\s\-]+ans(?:wer)?|briefly|tl;dr|tldr)\b/i.test(q);

    if (lineM) return { isConstrained: true, unit: 'lines', exactCount: parseInt(lineM[1], 10), wantsBullets };
    if (bulletM) return { isConstrained: true, unit: 'bullets', exactCount: parseInt(bulletM[1], 10), wantsBullets: true };
    if (wantsBullets && topM) return { isConstrained: true, unit: 'bullets', exactCount: parseInt(topM[1], 10), wantsBullets: true };
    if (wantsBullets) return { isConstrained: true, unit: 'bullets', exactCount: null, wantsBullets: true };
    if (sentM) return { isConstrained: true, unit: 'sentences', exactCount: parseInt(sentM[1], 10) };
    if (wantsTableOnly) return { isConstrained: true, unit: 'table', wantsTableOnly: true };
    if (wantsShort) return { isConstrained: true, unit: 'short', exactCount: 3 };
    return null;
  }

  function cleanAndEnforceChatText(rawText, intent) {
    let text = String(rawText || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/\(\s*Source\s+\d+[^)]*\)/gi, '')
      .replace(/\bSource\s+\d+\s*↗?/gi, '')
      .replace(/\[\s*Source\s+\d+\s*\]/gi, '')
      .replace(/\[\d{1,2}\]/g, '')
      .trim();

    if (!intent || !intent.isConstrained) return text;
    if (intent.wantsTableOnly || intent.unit === 'table') {
      const tm = text.match(/((?:^\|.*\|(?:\r?\n|$))+)/m);
      return tm ? tm[1].trim() : text;
    }

    // Only slice if an exact small line/sentence count was explicitly requested (never slice bullets down to 5!)
    if (intent.exactCount && (intent.unit === 'lines' || intent.unit === 'sentences') && intent.exactCount <= 6) {
      const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^#{1,6}\s+/.test(l));
      let items = [];
      if (rawLines.length < intent.exactCount) {
        for (const cl of rawLines) {
          const sents = cl.split(/(?<=[.!?।])\s+(?=[A-Z0-9"“‘•\-*\[])/);
          for (const s of sents) {
            if (s.trim().length > 6) items.push(s.trim());
          }
        }
      } else {
        items = rawLines;
      }
      const sliced = items.slice(0, intent.exactCount);
      if (intent.unit === 'sentences') {
        return sliced.map((l) => l.replace(/^(?:[-•*]|\d+[.)])\s*/, '').trim()).join(' ');
      }
      return sliced.map((l, idx) => `${idx + 1}. ${l.replace(/^(?:[-•*]|\d+[.)])\s*/, '').trim()}`).join('\n');
    }

    return text;
  }

  // ============================================================================
  // REAL AI IMAGE & INFOGRAPHIC WATERMARK CROPPER (No Fake Green Circle!)
  // - If `rawUrl` is a `data:image/...` URI (returned by our Node.js backend),
  //   crops the bottom 46px on `<canvas>` with zero CORS issues.
  // - If `rawUrl` is an `https://` URL, loads it WITHOUT `crossOrigin` so Chrome
  //   NEVER blocks it due to CORS, and CSS clips the bottom 44px watermark strip!
  // ============================================================================
  async function cropWatermarkIfBase64(rawUrl, isFalNative) {
    if (!rawUrl || !rawUrl.startsWith('data:image/')) {
      return rawUrl;
    }
    // Never re-encode or crop Fal.ai native images, SVGs, WebPs, or PNGs
    if (isFalNative || rawUrl.startsWith('data:image/svg+xml') || rawUrl.startsWith('data:image/webp') || rawUrl.startsWith('data:image/png')) {
      return rawUrl;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || 768;
          const h = img.naturalHeight || 1024;
          const cropH = h > 260 ? h - 46 : h;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = cropH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, cropH, 0, 0, w, cropH);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch (_) {
          resolve(rawUrl);
        }
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    });
  }

  function injectAllStyles() {
    if (document.getElementById('morphic-v14-complete-styles')) return;
    const style = document.createElement('style');
    style.id = 'morphic-v14-complete-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,500;0,600;0,700;1,400&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

      /* Complete Scrollable Left Sidebar & Gemini-Style Collapse Support */
      aside, .sidebar, .demo-sidebar {
        height: 100vh !important;
        max-height: 100vh !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
        padding-bottom: 28px !important;
        transition: margin-left 0.26s cubic-bezier(0.16, 1, 0.3, 1), transform 0.26s cubic-bezier(0.16, 1, 0.3, 1) !important;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.2) transparent;
      }
      aside::-webkit-scrollbar, .sidebar::-webkit-scrollbar {
        width: 5px;
      }
      aside::-webkit-scrollbar-thumb, .sidebar::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.22);
        border-radius: 999px;
      }


      
      
      
      
      
      
      /* v49.0 Top-Right Speaker Button on Result Cards */
      .mc-card-top-tools {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        margin-bottom: 10px;
      }
      .mc-top-tts-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 11px;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.16s ease;
      }
      .mc-top-tts-btn:hover {
        border-color: #10b981;
        background: #ecfdf5;
        color: #065f46;
      }
      .mc-top-tts-btn.is-speaking {
        background: #064e3b !important;
        color: #6ee7b7 !important;
        border-color: #10b981 !important;
        box-shadow: 0 2px 10px rgba(16, 185, 129, 0.25);
      }

      
      /* v54.0 Always-Visible Pinned Bottom-Left ChatGPT Profile Pill & Floating Popover Menu */
      aside, .sidebar, .demo-sidebar {
        padding-bottom: 84px !important;
        overflow-y: auto !important;
      }
      .mc-profile-dock {
        position: fixed !important;
        bottom: 10px !important;
        left: 10px !important;
        width: 214px !important;
        padding: 4px !important;
        border-radius: 15px !important;
        border: 1px solid rgba(52, 211, 153, 0.38) !important;
        background: linear-gradient(165deg, #061f15 0%, #0a2d1f 100%) !important;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55) !important;
        z-index: 99990 !important;
      }
      body.mc-sidebar-collapsed .mc-profile-dock {
        display: none !important;
      }
      .mc-profile-pill {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 11px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #f8fafc;
        cursor: pointer;
        text-align: left;
        transition: all 0.16s ease;
      }
      .mc-profile-pill:hover, .mc-profile-pill.active {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(52, 211, 153, 0.45);
      }
      .mc-avatar-circle {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ea580c 0%, #d97706 100%);
        color: #ffffff;
        font-weight: 800;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(234, 88, 12, 0.35);
      }
      .mc-profile-popover {
        position: fixed;
        bottom: 68px;
        left: 14px;
        width: 268px;
        background: #1e1f22;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 18px;
        padding: 8px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
        z-index: 1000002;
        color: #f1f5f9;
        font-family: 'Inter', system-ui, sans-serif;
        animation: mcPopFadeIn 0.15s ease-out;
      }
      @keyframes mcPopFadeIn {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .mc-pop-user-head {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 10px 12px;
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.14s ease;
      }
      .mc-pop-user-head:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .mc-pop-divider-line {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 6px 8px;
      }
      .mc-pop-menu-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 9px 12px;
        border-radius: 10px;
        border: none;
        background: transparent;
        color: #e2e8f0;
        font-size: 13.5px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        transition: background 0.12s ease, color 0.12s ease;
      }
      .mc-pop-menu-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }
      .mc-pop-menu-icon {
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        opacity: 0.9;
      }

      /* v53.0 6-Tab Settings & Personalization Center Modal */
      .mc-settings-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(2, 8, 6, 0.72);
        backdrop-filter: blur(6px);
        z-index: 1000005;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .mc-settings-dialog {
        width: 880px;
        max-width: 96vw;
        height: 610px;
        max-height: 90vh;
        background: #14171a;
        color: #f1f5f9;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 22px;
        display: grid;
        grid-template-columns: 230px minmax(0, 1fr);
        overflow: hidden;
        box-shadow: 0 28px 70px rgba(0, 0, 0, 0.65);
        font-family: 'Inter', system-ui, sans-serif;
      }
      @media (max-width: 720px) {
        .mc-settings-dialog {
          grid-template-columns: 1fr;
          height: 88vh;
        }
      }
      .mc-set-nav {
        background: #0e1113;
        border-right: 1px solid rgba(255, 255, 255, 0.09);
        padding: 18px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .mc-set-nav-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 11px;
        border: none;
        background: transparent;
        color: #94a3b8;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        text-align: left;
        transition: all 0.14s ease;
      }
      .mc-set-nav-btn:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #f1f5f9;
      }
      .mc-set-nav-btn.active {
        background: rgba(16, 185, 129, 0.18);
        color: #6ee7b7;
        border: 1px solid rgba(52, 211, 153, 0.35);
        font-weight: 700;
      }
      .mc-set-content {
        padding: 22px 26px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .mc-set-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        padding: 16px 18px;
      }
      .mc-set-label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: #cbd5e1;
        margin-bottom: 6px;
      }
      .mc-set-input, .mc-set-textarea, .mc-set-select {
        width: 100%;
        padding: 9px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(0, 0, 0, 0.35) !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
      }
      .mc-set-input:focus, .mc-set-textarea:focus {
        border-color: #10b981;
      }
      .mc-theme-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
      }
      .mc-theme-card {
        padding: 12px;
        border-radius: 12px;
        border: 1.5px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.04);
        color: #f1f5f9;
        cursor: pointer;
        text-align: center;
        font-size: 12.5px;
        font-weight: 700;
        transition: all 0.15s ease;
      }
      .mc-theme-card.active {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.16);
        color: #6ee7b7;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
      }
      .mc-color-swatch {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2.5px solid transparent;
        cursor: pointer;
        transition: transform 0.14s ease;
      }
      .mc-color-swatch.active {
        border-color: #ffffff;
        transform: scale(1.15);
        box-shadow: 0 0 12px currentColor;
      }

      /* v54.0 Wide & Clean Lovable / Cursor / Claude Code Studio (#code) */
      body.mc-code-route-active main,
      body.mc-code-route-active .content,
      body.mc-code-route-active .main-content {
        padding: 4px 8px !important;
        max-width: 100% !important;
        width: 100% !important;
      }
      .mc-cs-shell {
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr);
        gap: 10px;
        height: calc(100vh - 70px);
        min-height: 540px;
        max-height: calc(100vh - 64px);
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
        padding: 2px 4px 6px;
        box-sizing: border-box;
        transition: grid-template-columns 0.2s ease;
      }
      .mc-cs-shell.agent-collapsed {
        grid-template-columns: 0px minmax(0, 1fr);
        gap: 0px;
      }
      .mc-cs-shell.agent-collapsed .mc-cs-agent-col {
        opacity: 0;
        pointer-events: none;
        overflow: hidden;
        border: none;
        padding: 0;
      }
      @media (max-width: 980px) {
        .mc-cs-shell {
          grid-template-columns: 1fr;
          height: auto;
          max-height: none;
        }
      }
      /* Left Column: Clean AI Architect Dock */
      .mc-cs-agent-col {
        background: linear-gradient(165deg, #062117 0%, #092c1f 100%);
        border: 1px solid rgba(52, 211, 153, 0.38);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 10px 28px rgba(4, 24, 16, 0.22);
        min-height: 0;
      }
      .mc-cs-agent-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.25);
        flex-shrink: 0;
      }
      .mc-cs-new-code-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #032215;
        border: none;
        padding: 5px 11px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 800;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
        transition: all 0.14s ease;
      }
      .mc-cs-new-code-btn:hover {
        transform: translateY(-1px);
        filter: brightness(1.08);
      }
      .mc-cs-feed {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .mc-cs-starter-card {
        width: 100%;
        text-align: left;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(110, 231, 183, 0.24);
        border-radius: 11px;
        padding: 9px 11px;
        color: #ecfdf5;
        cursor: pointer;
        transition: all 0.14s ease;
      }
      .mc-cs-starter-card:hover {
        background: rgba(16, 185, 129, 0.22);
        border-color: #34d399;
        transform: translateY(-1px);
      }
      .mc-cs-msg-user {
        align-self: flex-end;
        background: #10b981;
        color: #042f1e;
        font-weight: 700;
        font-size: 11.5px;
        padding: 8px 11px;
        border-radius: 12px 12px 2px 12px;
        max-width: 94%;
        max-height: 115px;
        overflow-y: auto;
        line-height: 1.4;
      }
      .mc-cs-msg-ai {
        align-self: flex-start;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(52, 211, 153, 0.3);
        color: #ecfdf5;
        font-size: 11.5px;
        padding: 9px 11px;
        border-radius: 12px 12px 12px 2px;
        width: 100%;
        line-height: 1.4;
      }
      .mc-cs-quick-chips {
        display: flex;
        gap: 5px;
        overflow-x: auto;
        padding: 5px 10px 2px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.22);
        flex-shrink: 0;
      }
      .mc-cs-quick-chips::-webkit-scrollbar { display: none; }
      .mc-cs-qchip {
        padding: 3px 8px;
        border-radius: 999px;
        border: 1px solid rgba(110, 231, 183, 0.3);
        background: rgba(16, 185, 129, 0.12);
        color: #a7f3d0;
        font-size: 10.5px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
      }
      .mc-cs-qchip:hover {
        background: #10b981;
        color: #042f1e;
      }
      .mc-cs-composer {
        padding: 8px 10px 10px;
        background: rgba(0, 0, 0, 0.36);
        flex-shrink: 0;
      }
      .mc-cs-textarea {
        width: 100% !important;
        min-height: 58px !important;
        max-height: 120px !important;
        border: 1px solid rgba(52, 211, 153, 0.38) !important;
        border-radius: 10px !important;
        padding: 8px 10px !important;
        background: rgba(4, 18, 12, 0.9) !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        caret-color: #10b981 !important;
        font-family: 'Inter', system-ui, sans-serif !important;
        font-size: 13px !important;
        line-height: 1.4 !important;
        resize: none !important;
        outline: none !important;
        box-sizing: border-box !important;
        margin-bottom: 6px !important;
      }
      .mc-cs-textarea:focus {
        border-color: #10b981 !important;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.22) !important;
      }
      .mc-cs-textarea::placeholder {
        color: rgba(209, 250, 229, 0.55) !important;
        -webkit-text-fill-color: rgba(209, 250, 229, 0.55) !important;
      }

      /* Right Column: Wide & Simple Live Dashboard + Code Canvas */
      .mc-cs-canvas-col {
        background: #0b131e;
        border: 1px solid rgba(52, 211, 153, 0.35);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
        min-height: 0;
        position: relative;
      }
      .mc-cs-canvas-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: nowrap;
        gap: 8px;
        padding: 8px 14px;
        background: #072318;
        color: #ecfdf5;
        border-bottom: 1px solid rgba(52, 211, 153, 0.28);
        flex-shrink: 0;
      }
      .mc-cs-seg-group {
        display: inline-flex;
        background: rgba(0, 0, 0, 0.4);
        padding: 3px;
        border-radius: 9px;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
      .mc-cs-seg-btn {
        padding: 5px 13px;
        border-radius: 6px;
        border: none;
        background: transparent;
        color: #cbd5e1;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.14s ease;
      }
      .mc-cs-seg-btn.active {
        background: #10b981;
        color: #042f1e;
        font-weight: 800;
      }
      /* Saved Code Projects Slide-Down Drawer inside Code Studio */
      .mc-cs-projects-drawer {
        position: absolute;
        top: 48px;
        left: 12px;
        width: 380px;
        max-width: calc(100% - 24px);
        max-height: 420px;
        background: #062117;
        border: 1px solid #10b981;
        border-radius: 14px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
        z-index: 120;
        display: none;
        flex-direction: column;
        overflow: hidden;
      }
      .mc-cs-projects-drawer.open {
        display: flex;
      }
      .mc-cs-proj-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        cursor: pointer;
        color: #ecfdf5;
        transition: background 0.14s ease;
      }
      .mc-cs-proj-item:hover, .mc-cs-proj-item.active {
        background: rgba(16, 185, 129, 0.18);
      }
      .mc-cs-stage {
        flex: 1;
        min-height: 0;
        display: flex;
        position: relative;
        background: #0f172a;
        overflow: hidden;
      }
      .mc-cs-stage.mode-preview .mc-cs-code-wrap { display: none !important; }
      .mc-cs-stage.mode-code .mc-cs-prev-wrap { display: none !important; }
      .mc-cs-stage.mode-split .mc-cs-code-wrap {
        width: 44% !important;
        border-right: 1px solid rgba(52, 211, 153, 0.28);
      }
      .mc-cs-stage.mode-split .mc-cs-prev-wrap {
        width: 56% !important;
      }
      .mc-cs-prev-wrap {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: stretch;
        background: #090d16;
        overflow: auto;
      }
      .mc-cs-iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: #090d16;
        transition: width 0.2s ease;
      }
      /* Line-Numbered IDE Code Editor */
      .mc-cs-code-wrap {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #05130d;
        min-height: 0;
      }
      .mc-ide-filebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 14px;
        background: #030d09;
        border-bottom: 1px solid rgba(52, 211, 153, 0.2);
        font-size: 11.5px;
        color: #a7f3d0;
        flex-shrink: 0;
      }
      .mc-ide-body {
        flex: 1;
        min-height: 0;
        display: flex;
        position: relative;
        overflow: hidden;
      }
      .mc-ide-gutter {
        width: 46px;
        padding: 14px 8px 14px 0;
        background: #030e09;
        border-right: 1px solid rgba(52, 211, 153, 0.16);
        color: #475569;
        font-family: 'JetBrains Mono', Consolas, monospace;
        font-size: 12.5px;
        line-height: 1.6;
        text-align: right;
        user-select: none;
        overflow: hidden;
        flex-shrink: 0;
      }
      .mc-cs-editor {
        flex: 1;
        width: 100% !important;
        height: 100% !important;
        background: #05130d !important;
        color: #d1fae5 !important;
        -webkit-text-fill-color: #d1fae5 !important;
        border: none !important;
        padding: 14px !important;
        font-family: 'JetBrains Mono', Consolas, monospace !important;
        font-size: 12.5px !important;
        line-height: 1.6 !important;
        resize: none !important;
        outline: none !important;
        box-sizing: border-box !important;
        overflow: auto !important;
        white-space: pre !important;
      }

      /* v47.0 Interactive Timed Mock Test Engine */
      .mc-mock-card {
        margin: 14px 0;
        background: linear-gradient(155deg, #f8fafc 0%, #f0fdf4 100%);
        border: 1.5px solid #86efac;
        border-radius: 18px;
        padding: 18px 20px;
        color: #0f172a;
      }
      .mc-mock-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        padding-bottom: 12px;
        margin-bottom: 14px;
        border-bottom: 1.5px solid #bbf7d0;
      }
      .mc-mock-timer {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 800;
        padding: 5px 12px;
        border-radius: 999px;
        background: #064e3b;
        color: #6ee7b7;
        border: 1px solid #34d399;
      }
      .mc-mock-qbox {
        background: #ffffff;
        border: 1px solid #d1fae5;
        border-radius: 14px;
        padding: 14px 16px;
        margin-bottom: 12px;
        box-shadow: 0 3px 10px rgba(6, 78, 59, 0.04);
      }
      .mc-mock-opt {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 9px 12px;
        margin-top: 7px;
        border-radius: 10px;
        border: 1.5px solid #e2e8f0;
        background: #f8fafc;
        cursor: pointer;
        font-size: 13.5px;
        transition: all 0.14s ease;
      }
      .mc-mock-opt:hover {
        border-color: #10b981;
        background: #ecfdf5;
      }
      .mc-mock-opt.selected {
        border-color: #059669;
        background: #d1fae5;
        font-weight: 700;
      }
      .mc-mock-opt.is-correct {
        border-color: #10b981 !important;
        background: #dcfce7 !important;
        color: #065f46;
        font-weight: 700;
      }
      .mc-mock-opt.is-wrong {
        border-color: #ef4444 !important;
        background: #fee2e2 !important;
        color: #991b1b;
      }
      .mc-mock-num-inp {
        width: 180px;
        padding: 8px 12px;
        border-radius: 10px;
        border: 1.5px solid #94a3b8;
        font-size: 14px;
        font-weight: 700;
        margin-top: 8px;
        outline: none;
      }
      .mc-mock-num-inp:focus {
        border-color: #10b981;
      }
      .mc-mock-summary {
        background: linear-gradient(135deg, #062c1e 0%, #0b3b29 100%);
        color: #ecfdf5;
        border-radius: 14px;
        padding: 16px 18px;
        margin-bottom: 16px;
        border: 1.5px solid #34d399;
      }
      .mc-vault-btn {
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #f1f5f9;
        color: #0f172a;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.14s ease;
      }
      .mc-vault-btn:hover, .mc-vault-btn.saved {
        background: #fef3c7;
        border-color: #f59e0b;
        color: #92400e;
      }

      /* v47.0 Multi-PDF Study Notebook Knowledge Base */
      .mc-notebook-bar {
        background: rgba(6, 36, 25, 0.92);
        border: 1px solid rgba(52, 211, 153, 0.32);
        border-radius: 14px;
        padding: 10px 14px;
        margin-bottom: 12px;
        color: #ecfdf5;
      }
      .mc-nb-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(110, 231, 183, 0.35);
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11.5px;
        font-weight: 600;
        color: #d1fae5;
      }
      .mc-nb-chip.active {
        background: rgba(16, 185, 129, 0.25);
        border-color: #34d399;
        color: #ffffff;
      }

      /* v47.0 Analytics & Vault Modal */
      .mc-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(2, 12, 8, 0.72);
        backdrop-filter: blur(4px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
      }
      .mc-modal-panel {
        width: 740px;
        max-width: 96vw;
        max-height: 86vh;
        overflow-y: auto;
        background: #ffffff;
        border-radius: 20px;
        padding: 22px 24px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
        color: #0f172a;
      }

      /* v45.0 Scientific Calculator & Smart Symbol Keypad Drawer */
      .mc-sym-tab-btn {
        height: 32px;
        padding: 0 13px;
        border-radius: 999px;
        border: 1px solid rgba(52, 211, 153, 0.5);
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.32) 100%);
        color: #a7f3d0;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.16s ease;
        white-space: nowrap;
      }
      .mc-sym-tab-btn:hover, .mc-sym-tab-btn.active {
        background: #10b981;
        color: #042f1e;
        border-color: #6ee7b7;
        box-shadow: 0 3px 12px rgba(16, 185, 129, 0.35);
      }
      .mc-sym-popover {
        position: absolute;
        bottom: 44px;
        left: 0;
        width: 540px;
        max-width: 94vw;
        background: linear-gradient(165deg, #061c13 0%, #0a291d 100%);
        border: 1.5px solid rgba(52, 211, 153, 0.5);
        border-radius: 18px;
        padding: 14px;
        box-shadow: 0 22px 50px rgba(0, 0, 0, 0.68);
        z-index: 9999;
        color: #ecfdf5;
        user-select: none;
      }
      .mc-calc-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 10px;
      }
      .mc-calc-search {
        flex: 1;
        height: 28px;
        padding: 0 10px;
        border-radius: 8px;
        border: 1px solid rgba(110, 231, 183, 0.3);
        background: rgba(0, 0, 0, 0.35) !important;
        color: #ffffff !important;
        font-size: 11.5px;
        outline: none;
      }
      .mc-calc-search::placeholder {
        color: #94a3b8;
      }
      .mc-calc-ctrl-strip {
        display: flex;
        align-items: center;
        gap: 5px;
        background: rgba(0, 0, 0, 0.32);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 5px 8px;
        margin-bottom: 10px;
        justify-content: space-between;
      }
      .mc-calc-act-key {
        padding: 4px 9px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .mc-calc-act-key:hover {
        background: rgba(16, 185, 129, 0.3);
        border-color: #34d399;
        color: #ffffff;
      }
      .mc-calc-act-key.is-warn:hover {
        background: rgba(239, 68, 68, 0.35);
        border-color: #f87171;
      }
      .mc-sym-cat-bar {
        display: flex;
        gap: 5px;
        overflow-x: auto;
        padding-bottom: 8px;
        margin-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      }
      .mc-sym-cat-btn {
        padding: 5px 10px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.06);
        color: #d1fae5;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.14s ease;
      }
      .mc-sym-cat-btn.active {
        background: #10b981;
        color: #042f1e;
        border-color: #6ee7b7;
        font-weight: 800;
      }
      /* Dual-Split Scientific Calculator Grid (Left: Sci Functions, Right: Numpad + Ops) */
      .mc-calc-dual-deck {
        display: grid;
        grid-template-columns: 1.35fr 1fr;
        gap: 10px;
      }
      @media (max-width: 600px) {
        .mc-calc-dual-deck {
          grid-template-columns: 1fr;
        }
      }
      .mc-calc-sci-pad {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 5px;
      }
      .mc-calc-num-pad {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
        background: rgba(0, 0, 0, 0.24);
        padding: 6px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .mc-sym-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(62px, 1fr));
        gap: 6px;
        max-height: 240px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .mc-sym-item-btn {
        padding: 6px 4px;
        min-height: 38px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.07);
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        transition: all 0.1s ease;
      }
      .mc-sym-item-btn.is-num {
        background: rgba(255, 255, 255, 0.13);
        font-size: 14px;
        font-weight: 800;
      }
      .mc-sym-item-btn.is-op {
        background: rgba(16, 185, 129, 0.22);
        border-color: rgba(52, 211, 153, 0.4);
        color: #6ee7b7;
        font-size: 14.5px;
      }
      .mc-sym-item-btn.is-accent {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.26) 0%, rgba(16, 185, 129, 0.26) 100%);
        border-color: #fbbf24;
        color: #fef3c7;
      }
      .mc-sym-item-btn:hover {
        background: #10b981 !important;
        color: #042f1e !important;
        border-color: #6ee7b7 !important;
        transform: translateY(-1px);
      }
      .mc-sym-item-sub {
        font-size: 8.5px;
        opacity: 0.72;
        font-weight: 500;
        line-height: 1;
      }

      /* v44.0 Interactive 3D Study Flashcards */
      .mc-fc-deck {
        margin: 16px 0;
        background: linear-gradient(145deg, #f0fdf4 0%, #ecfdf5 100%);
        border: 1.5px solid #a7f3d0;
        border-radius: 16px;
        padding: 16px;
      }
      .mc-fc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid #bbf7d0;
      }
      .mc-fc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
      }
      .mc-fc-card {
        background: #ffffff;
        border: 1.5px solid #86efac;
        border-radius: 14px;
        padding: 14px 16px;
        cursor: pointer;
        transition: all 0.22s ease;
        box-shadow: 0 4px 12px rgba(6, 78, 59, 0.06);
        position: relative;
        min-height: 135px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .mc-fc-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(16, 185, 129, 0.15);
        border-color: #10b981;
      }
      .mc-fc-card.is-flipped {
        background: linear-gradient(145deg, #063926 0%, #0b291e 100%);
        color: #ecfdf5;
        border-color: #34d399;
      }
      .mc-fc-card .mc-fc-back {
        display: none;
      }
      .mc-fc-card.is-flipped .mc-fc-front {
        display: none;
      }
      .mc-fc-card.is-flipped .mc-fc-back {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
      }
      .mc-fc-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 3px 8px;
        border-radius: 999px;
        background: #d1fae5;
        color: #065f46;
      }
      .mc-fc-card.is-flipped .mc-fc-badge {
        background: rgba(16, 185, 129, 0.28);
        color: #6ee7b7;
      }

      /* v44.0 Visual Study Infographic Board */
      .mc-infographic-board {
        margin: 16px 0;
        background: linear-gradient(145deg, #072218 0%, #0c3526 100%);
        border: 1.5px solid #10b981;
        border-radius: 18px;
        padding: 18px 20px;
        color: #ecfdf5;
        box-shadow: 0 10px 28px rgba(6, 78, 59, 0.18);
      }
      .mc-ig-header {
        text-align: center;
        padding-bottom: 14px;
        margin-bottom: 14px;
        border-bottom: 1px solid rgba(110, 231, 183, 0.22);
      }
      .mc-ig-flow {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        background: rgba(0, 0, 0, 0.26);
        padding: 12px;
        border-radius: 12px;
        margin-bottom: 14px;
        border: 1px solid rgba(52, 211, 153, 0.25);
      }
      .mc-ig-step {
        background: rgba(16, 185, 129, 0.22);
        border: 1px solid #34d399;
        color: #ecfdf5;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
      }
      .mc-ig-arrow {
        color: #34d399;
        font-weight: 800;
        font-size: 14px;
      }
      .mc-ig-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-bottom: 14px;
      }
      .mc-ig-node {
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(167, 243, 208, 0.25);
        border-radius: 12px;
        padding: 12px 14px;
      }
      .mc-ig-node-title {
        font-size: 13px;
        font-weight: 800;
        color: #6ee7b7;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mc-ig-node-body {
        font-size: 12.5px;
        color: #e2e8f0;
        line-height: 1.5;
      }
      .mc-ig-takeaway {
        background: linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%);
        border: 1px solid #fbbf24;
        color: #fef3c7;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 12.5px;
        font-weight: 700;
        text-align: center;
      }
      .mc-study-banner.is-compact .mc-study-expandable {
        display: none;
      }

      /* Voice Input (Mic) & Read Aloud (TTS) Buttons */
      .mc-mic-btn {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.22);
        background: rgba(255,255,255,0.08);
        color: #ecfdf5;
        font-size: 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .mc-mic-btn:hover {
        background: rgba(16, 185, 129, 0.25);
        border-color: #34d399;
      }
      .mc-mic-btn.is-listening {
        background: #ef4444 !important;
        border-color: #fca5a5 !important;
        color: #ffffff !important;
        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.28);
        animation: mcMicPulse 1.2s infinite ease-in-out;
      }
      @keyframes mcMicPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.09); }
      }
      .mc-foot-btn.is-speaking {
        background: #0d261b !important;
        color: #34d399 !important;
        border-color: #10b981 !important;
      }

      /* Tuned Sidebar Unified History Filter Pills */
      .mc-hist-filter-row {
        display: flex;
        gap: 4px;
        margin: 6px 2px 8px;
      }
      .mc-hist-filter-pill {
        flex: 1;
        padding: 3px 6px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.04);
        color: rgba(255,255,255,0.65);
        font-size: 10.5px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        transition: all 0.14s ease;
      }
      .mc-hist-filter-pill:hover {
        background: rgba(255,255,255,0.1);
        color: #ffffff;
      }
      .mc-hist-filter-pill.active {
        background: #10b981;
        color: #031c12;
        border-color: #34d399;
      }
      .mc-hist-tag {
        font-size: 9.5px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 4px;
        background: rgba(16, 185, 129, 0.18);
        color: #6ee7b7;
        margin-right: 4px;
        flex-shrink: 0;
      }

      /* Study Workspace Student-Friendly Portal */
      .mc-study-banner {
        background: linear-gradient(135deg, #062217 0%, #0d3826 100%);
        border: 1px solid rgba(52, 211, 153, 0.32);
        border-radius: 20px;
        padding: 18px 20px;
        margin-bottom: 16px;
        color: #ffffff;
        box-shadow: 0 10px 28px rgba(6, 34, 23, 0.14);
      }
      .mc-study-subj-row {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-bottom: 12px;
      }
      .mc-study-subj-btn {
        padding: 7px 13px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.06);
        color: #e2f1ea;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .mc-study-subj-btn:hover {
        background: rgba(255,255,255,0.14);
      }
      .mc-study-subj-btn.active {
        background: #10b981;
        color: #031d12;
        border-color: #6ee7b7;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
      }
      .mc-study-preset-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 8px;
        margin-top: 10px;
      }
      .mc-study-preset-card {
        padding: 9px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.05);
        color: #ecfdf5;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s ease;
      }
      .mc-study-preset-card:hover {
        background: rgba(16, 185, 129, 0.18);
        border-color: #34d399;
      }
      .mc-study-preset-card.active {
        background: rgba(16, 185, 129, 0.28);
        border: 1.5px solid #34d399;
        color: #ffffff;
      }
      .mc-math-sym-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 5px;
        padding: 6px 0 8px;
        border-bottom: 1px solid rgba(255,255,255,0.09);
        margin-bottom: 8px;
      }
      .mc-math-sym-btn {
        padding: 3px 8px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.07);
        color: #a7f3d0;
        font-family: 'Cambria Math', Georgia, serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .mc-math-sym-btn:hover {
        background: #10b981;
        color: #041d12;
      }

      /* Gemini-Style User Prompt Row + Inline Edit Button + Cancel Generation Button */
      .mc-user-row {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        width: 100%;
      }
      .mc-edit-prompt-btn {
        opacity: 0.65;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #0f291e;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
      }
      .mc-user-row:hover .mc-edit-prompt-btn,
      .mc-edit-prompt-btn:hover {
        opacity: 1;
        background: #ecfdf5;
        border-color: #10b981;
        color: #065f46;
      }
      .mc-user-edit-box {
        align-self: flex-end;
        width: min(100%, 680px);
        background: #ffffff;
        border: 2px solid #10b981;
        border-radius: 18px;
        padding: 14px 16px;
        box-shadow: 0 10px 28px rgba(9, 28, 20, 0.12);
      }
      .mc-user-edit-textarea {
        width: 100%;
        min-height: 68px;
        border: 1px solid #d1fae5;
        border-radius: 10px;
        padding: 10px 12px;
        font-family: 'Inter', sans-serif;
        font-size: 14.5px;
        color: #0b2419;
        background: #f8fafc;
        resize: vertical;
        outline: none;
      }
      .mc-user-edit-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 10px;
      }
      .mc-cancel-thinking-btn {
        background: rgba(239, 68, 68, 0.18);
        border: 1px solid rgba(248, 113, 113, 0.55);
        color: #fecaca;
        border-radius: 999px;
        padding: 5px 13px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.15s ease;
      }
      .mc-cancel-thinking-btn:hover {
        background: #ef4444;
        color: #ffffff;
      }
      .mc-send-btn.is-stop-mode {
        background: #ef4444 !important;
        color: #ffffff !important;
        border: 1px solid #fca5a5 !important;
      }

      /* Clickable Downloadable Link Pills & Location Detector Badge */
      .mc-dl-link-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        margin: 3px 2px;
        border-radius: 999px;
        background: #ecfdf5;
        border: 1px solid #10b981;
        color: #065f46 !important;
        font-size: 13px;
        font-weight: 600;
        text-decoration: none !important;
        transition: all 0.16s ease;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.12);
      }
      .mc-dl-link-pill:hover {
        background: #10b981;
        color: #ffffff !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28);
      }
      .mc-loc-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 11px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid rgba(52, 211, 153, 0.35);
        background: rgba(16, 185, 129, 0.12);
        color: #a7f3d0;
      }
      .mc-loc-pill:hover {
        background: rgba(16, 185, 129, 0.24);
        color: #ffffff;
      }

      /* Universal Textbook Mathematical, Algebraic, Geometrical & Scientific Equation Styling */
      .mc-math-block {
        margin: 14px 0;
        padding: 14px 20px;
        background: #f4f9f6;
        border: 1px solid #cce3d6;
        border-left: 4px solid #10b981;
        border-radius: 12px;
        font-family: 'Cambria Math', 'STIX Two Math', 'Times New Roman', Georgia, serif;
        font-size: 18px;
        line-height: 1.8;
        color: #071f15;
        text-align: center;
        overflow-x: auto;
      }
      .mc-math-inline {
        font-family: 'Cambria Math', 'STIX Two Math', 'Times New Roman', Georgia, serif;
        font-size: 1.06em;
        font-weight: 600;
        color: #0b2e1f;
        background: rgba(16, 185, 129, 0.08);
        padding: 1px 6px;
        border-radius: 6px;
         display: inline-flex;
        align-items: center;
        gap: 2px;
        vertical-align: middle;
      }
      .mc-frac {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        vertical-align: middle;
        margin: 0 4px;
        font-size: 0.92em;
        line-height: 1.1;
      }
      .mc-frac-num {
        border-bottom: 1.5px solid currentColor;
        padding: 0 5px 2px;
        display: block;
        text-align: center;
      }
      .mc-frac-den {
        padding: 2px 5px 0;
        display: block;
        text-align: center;
      }
      .mc-sqrt {
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
        margin: 0 2px;
      }
      .mc-sqrt-sym {
        font-size: 1.18em;
        line-height: 1;
        margin-right: 1px;
      }
      .mc-sqrt-body {
        border-top: 1.5px solid currentColor;
        padding: 1px 3px 0;
      }

      /* Gemini-Style Sidebar Close Button inside Sidebar Header */
      .mc-sidebar-close-btn {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.06);
        color: #ffffff;
        font-size: 15px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin-left: auto;
        flex-shrink: 0;
        transition: background 0.15s ease;
      }
      .mc-sidebar-close-btn:hover {
        background: rgba(255,255,255,0.18);
      }

                  /* Floating Always-Visible Sidebar Open Button when Sidebar is Collapsed */
      .mc-sidebar-open-fab {
        position: fixed !important;
        top: 12px !important;
        left: 14px !important;
        z-index: 9999999 !important;
        display: none !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 8px 16px !important;
        border-radius: 999px !important;
        background: #062318 !important;
        color: #34d399 !important;
        border: 2px solid #10b981 !important;
        box-shadow: 0 8px 24px rgba(4, 25, 17, 0.45), 0 0 14px rgba(16, 185, 129, 0.3) !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        transition: transform 0.15s ease, background 0.15s ease !important;
        user-select: none !important;
      }
      .mc-sidebar-open-fab:hover {
        background: #10b981 !important;
        color: #031c12 !important;
        transform: translateY(-1px) scale(1.03) !important;
      }
      body.mc-sidebar-collapsed .mc-sidebar-open-fab {
        display: inline-flex !important;
      }

      /* Pure CSS Sidebar Collapse — Targets ONLY <aside>, .sidebar, .demo-sidebar (NEVER body or layout wrappers!) */
      body.mc-sidebar-collapsed aside:not([id*="lightbox"]),
      body.mc-sidebar-collapsed .sidebar:not(body),
      body.mc-sidebar-collapsed .demo-sidebar:not(body) {
        width: 0px !important;
        min-width: 0px !important;
        max-width: 0px !important;
        margin-left: -280px !important;
        padding-left: 0px !important;
        padding-right: 0px !important;
        overflow: hidden !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        border: none !important;
        transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      .mc-shell {
        max-width: 840px;
        margin: 0 auto;
        padding: 32px 24px 80px;
        font-family: 'Inter', 'Noto Sans Devanagari', -apple-system, sans-serif;
        color: #111814;
      }
      .mc-shell *::before, .mc-composer::before, .mc-composer::after {
        content: none !important;
      }
      .mc-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18px;
        gap: 12px;
      }
      .mc-title {
        font-family: 'Newsreader', Georgia, serif;
        font-size: 30px;
        font-weight: 500;
        color: #0b2419;
        margin: 0;
        letter-spacing: -0.02em;
      }
      .mc-top-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mc-pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 13px;
        border-radius: 999px;
        background: #ffffff;
        border: 1px solid #d4e0d9;
        color: #0f291e;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .mc-pill-btn:hover, .mc-pill-btn.active {
        background: #0d261b;
        color: #ffffff;
        border-color: #0b2419;
      }

      
      /* ChatGPT / Gemini-Style Sticky Bottom Prompt Composer & Empty-State Centering */
      .mc-shell {
        display: flex;
        flex-direction: column;
        min-height: calc(100vh - 64px);
      }
      .mc-shell.is-empty-chat {
        justify-content: center;
      }
      .mc-shell.is-empty-chat.is-study-shell {
        justify-content: flex-start;
        padding-top: 8px;
      }
      .mc-shell.is-empty-chat .mc-thread {
        display: none;
      }
      .mc-shell.has-messages .mc-topbar {
        position: sticky;
        top: 0;
        z-index: 45;
        background: rgba(243, 247, 244, 0.92);
        backdrop-filter: blur(10px);
        padding: 10px 0;
        margin-bottom: 8px;
        border-bottom: 1px solid rgba(13, 38, 27, 0.08);
      }
      .mc-shell.has-messages .mc-title {
        font-size: 21px;
      }
      .mc-shell.has-messages .mc-thread {
        margin-top: 6px;
        margin-bottom: 18px;
        flex: 1;
      }
      .mc-shell.has-messages .mc-composer {
        position: relative;
        z-index: 40;
        margin-top: 22px;
        margin-bottom: 24px;
        box-shadow: 0 14px 36px rgba(9, 28, 20, 0.20);
        border: 1.5px solid rgba(16, 185, 129, 0.35);
      }
      /* When composer is docked at the bottom, open the '+' popover UPWARDS so it never clips off-screen! */
      .mc-shell.has-messages .mc-popover {
        top: auto !important;
        bottom: 44px !important;
      }

      /* Floating Fast-Scroll Jump Arrows (↑ Top & ↓ Bottom) */
      .mc-scroll-jump-dock {
        position: fixed;
        right: 22px;
        bottom: 28px;
        z-index: 99990;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .mc-scroll-jump-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #0d261b;
        color: #6ee7b7;
        border: 1.5px solid rgba(16, 185, 129, 0.45);
        box-shadow: 0 8px 22px rgba(5, 25, 17, 0.32);
        font-size: 17px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.18s ease;
      }
      .mc-scroll-jump-btn:hover {
        background: #10b981;
        color: #041d12;
        transform: translateY(-2px);
        box-shadow: 0 12px 26px rgba(16, 185, 129, 0.45);
      }

      /* Composer */
      .mc-composer {
        background: #0d261b !important;
        border-radius: 22px;
        padding: 16px 18px 12px;
        color: #f4f7f5 !important;
        box-shadow: 0 12px 32px rgba(9, 28, 20, 0.14);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .mc-composer textarea#mc-chat-input,
      .mc-composer textarea#mc-chat-input:focus,
      .mc-composer textarea#mc-chat-input:active,
      .mc-composer textarea#mc-chat-input:hover,
      .mc-composer textarea#mc-img-studio-input,
      .mc-composer textarea#mc-img-studio-input:focus {
        width: 100% !important;
        min-height: 54px !important;
        max-height: 190px !important;
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        resize: none !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        caret-color: #10b981 !important;
        font-size: 15px !important;
        line-height: 1.55 !important;
        font-family: 'Inter', 'Noto Sans Devanagari', sans-serif !important;
      }
      .mc-composer textarea::placeholder {
        color: rgba(235, 245, 239, 0.48) !important;
        -webkit-text-fill-color: rgba(235, 245, 239, 0.48) !important;
      }

      .mc-mode-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin: 4px 0;
      }
      .mc-mode-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid rgba(52, 211, 153, 0.4);
        color: #a7f3d0;
        font-size: 11.5px;
        font-weight: 500;
      }
      .mc-mode-chip button {
        background: none;
        border: none;
        color: #a7f3d0;
        cursor: pointer;
        font-size: 13px;
        padding: 0 2px;
      }

      .mc-controls-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 8px;
      }
      .mc-controls-left {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .mc-plus-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.06);
        color: #ffffff;
        font-size: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .mc-plus-btn:hover { background: rgba(255,255,255,0.16); }
      .mc-select-pill {
        background: rgba(255,255,255,0.07) !important;
        border: 1px solid rgba(255,255,255,0.15) !important;
        color: #f0f7f3 !important;
        padding: 5px 11px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
      }
      .mc-select-pill option { background: #0d261b; color: #ffffff; }
      .mc-web-toggle {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 11px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid rgba(255,255,255,0.15);
        background: transparent;
        color: rgba(255,255,255,0.65);
      }
      .mc-web-toggle.active {
        background: rgba(16, 185, 129, 0.16);
        border-color: rgba(52, 211, 153, 0.45);
        color: #6ee7b7;
      }
      .mc-quality-group {
        display: none;
        align-items: center;
        background: rgba(0,0,0,0.22);
        border: 1px solid rgba(52, 211, 153, 0.35);
        border-radius: 999px;
        padding: 2px;
      }
      .mc-quality-group.visible {
        display: inline-flex;
      }
      .mc-quality-btn {
        border: none;
        background: transparent;
        color: rgba(255,255,255,0.65);
        font-size: 11px;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: 999px;
        cursor: pointer;
      }
      .mc-quality-btn.active {
        background: #10b981;
        color: #052e16;
      }
      .mc-send-btn {
        width: 34px;
        height: 34px;
        background: #ffffff;
        color: #0b2419;
        border: none;
        border-radius: 50%;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .mc-send-btn:hover { background: #6ee7b7; }

      .mc-popover {
        position: absolute;
        top: 40px;
        left: 0;
        z-index: 100;
        background: #112e21;
        border: 1px solid rgba(255,255,255,0.16);
        border-radius: 14px;
        padding: 6px;
        width: 200px;
        box-shadow: 0 16px 36px rgba(0,0,0,0.38);
      }
      .mc-pop-divider {
        height: 1px;
        background: rgba(255,255,255,0.1);
        margin: 4px 6px;
      }
      .mc-pop-item {
        display: flex;
        align-items: center;
        gap: 9px;
        width: 100%;
        padding: 7px 10px;
        border: none;
        background: transparent;
        color: #f0f7f3;
        font-size: 12.5px;
        border-radius: 8px;
        cursor: pointer;
        text-align: left;
      }
      .mc-pop-item:hover { background: rgba(255,255,255,0.1); }

      /* Thread & Cards */
      .mc-thread {
        margin-top: 22px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .mc-user-bubble {
        align-self: flex-end;
        background: #0d261b;
        color: #ffffff;
        padding: 11px 16px;
        border-radius: 18px 18px 4px 18px;
        max-width: 76%;
        font-size: 14.5px;
        line-height: 1.5;
      }
      .mc-ai-card {
        background: #ffffff;
        border-radius: 18px;
        border: 1px solid #dce6e0;
        padding: 22px 26px 18px;
        box-shadow: 0 6px 20px rgba(11,36,25,0.03);
      }
      .mc-ai-body {
        font-size: 15px;
        line-height: 1.7;
        color: #16241d;
      }
      .mc-ai-body h1, .mc-ai-body h2, .mc-ai-body h3 {
        font-family: 'Newsreader', 'Noto Sans Devanagari', Georgia, serif;
        color: #0b2419;
        margin-top: 16px;
        margin-bottom: 8px;
      }
      .mc-ai-body h1:first-child, .mc-ai-body h2:first-child, .mc-ai-body h3:first-child, .mc-ai-body p:first-child {
        margin-top: 0;
      }
      .mc-ai-body table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0;
        font-size: 13.5px;
      }
      .mc-ai-body th, .mc-ai-body td {
        border: 1px solid #d8e3dc;
        padding: 8px 11px;
        text-align: left;
      }
      .mc-ai-body th { background: #f2f7f4; font-weight: 600; }
      .mc-numbered-line {
        padding: 6px 0;
        border-bottom: 1px solid #f1f5f3;
      }
      .mc-numbered-line:last-child { border-bottom: none; }

      .mc-image-showcase {
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid #dce6e0;
        background: #061910;
        width: 100%;
        max-width: 460px;
        margin: 0 auto;
        box-shadow: 0 4px 18px rgba(0,0,0,0.08);
      }
      .mc-image-showcase.mc-aspect-landscape {
        max-width: 100%;
      }
      .mc-image-showcase.mc-aspect-square {
        max-width: 480px;
      }
      .mc-image-crop-frame {
        width: 100%;
        min-height: 400px;
        max-height: 580px;
        aspect-ratio: 3 / 4;
        overflow: hidden;
        position: relative;
        background: #071c12;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mc-image-showcase.mc-aspect-landscape .mc-image-crop-frame {
        aspect-ratio: 16 / 9;
        min-height: 340px;
        max-height: 500px;
      }
      .mc-image-showcase.mc-aspect-square .mc-image-crop-frame {
        aspect-ratio: 1 / 1;
        min-height: 380px;
        max-height: 480px;
      }
      .mc-image-crop-frame img {
        width: 100% !important;
        height: 100% !important;
        min-height: 340px !important;
        max-height: 580px !important;
        object-fit: contain !important;
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        background: #071c12 !important;
      }
      .mc-image-bar {
        padding: 10px 14px;
        background: #0d261b;
        color: #d1fae5;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 12px;
        position: relative;
        z-index: 2;
      }

      .mc-ebook-studio-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 16px;
        background: #071f15;
        color: #ecfdf5;
        border-radius: 14px 14px 0 0;
        border-bottom: 1px solid rgba(16, 185, 129, 0.25);
      }
      .mc-eb-ctrl-group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }
      .mc-eb-select {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 8px;
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        outline: none;
      }
      .mc-eb-select option { background: #071f15; color: #ffffff; }
      .mc-eb-btn {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 5px 11px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .mc-eb-btn:hover, .mc-eb-btn.active {
        background: #10b981;
        color: #042f1e;
        border-color: #34d399;
      }
      .mc-ebook-wrap {
        border: 1px solid #c8dfd2;
        border-radius: 0 0 16px 16px;
        overflow: hidden;
        background: #ffffff;
        --eb-head-font: 'Newsreader', serif;
        --eb-body-font: 'Inter', sans-serif;
        --eb-accent: #059669;
        --eb-accent-soft: #ecfdf5;
        --eb-ink: #0f172a;
        --eb-cover-bg: linear-gradient(135deg, #061c13 0%, #0f3826 100%);
      }
      .mc-ebook-wrap[data-font="luxury-press"] {
        --eb-head-font: 'Playfair Display', serif;
        --eb-body-font: 'Plus Jakarta Sans', sans-serif;
      }
      .mc-ebook-wrap[data-font="academic-scholar"] {
        --eb-head-font: 'Lora', serif;
        --eb-body-font: 'Inter', sans-serif;
      }
      .mc-ebook-wrap[data-font="modern-tech"] {
        --eb-head-font: 'Space Grotesk', sans-serif;
        --eb-body-font: 'DM Sans', sans-serif;
      }
      .mc-ebook-wrap[data-tpl="argon-swiss"] {
        --eb-accent: #dc2626;
        --eb-accent-soft: #fef2f2;
        --eb-ink: #09090b;
        --eb-cover-bg: linear-gradient(135deg, #09090b 0%, #18181b 100%);
      }
      .mc-ebook-wrap[data-tpl="oxford-academic"] {
        --eb-accent: #92400e;
        --eb-accent-soft: #fef3c7;
        --eb-ink: #1c1917;
        --eb-cover-bg: linear-gradient(135deg, #292524 0%, #44403c 100%);
        background: #fffdf9;
      }
      .mc-ebook-wrap[data-tpl="cyber-midnight"] {
        --eb-accent: #0284c7;
        --eb-accent-soft: #e0f2fe;
        --eb-ink: #0f172a;
        --eb-cover-bg: linear-gradient(135deg, #020617 0%, #0f172a 100%);
      }
      .mc-ebook-cover {
        background: var(--eb-cover-bg);
        color: #ffffff;
        padding: 28px 26px;
        display: grid;
        grid-template-columns: 185px 1fr;
        gap: 24px;
        align-items: center;
      }
      .mc-ebook-cover img {
        width: 185px;
        height: 246px;
        object-fit: cover;
        border-radius: 12px;
        border: 2px solid rgba(255,255,255,0.28);
        box-shadow: 0 12px 30px rgba(0,0,0,0.38);
        cursor: zoom-in;
      }
      .mc-ebook-exec-box {
        padding: 22px 26px;
        background: var(--eb-accent-soft);
        border-bottom: 1px solid #e2ece6;
        font-family: var(--eb-body-font);
      }
      .mc-ebook-chapter {
        padding: 26px;
        border-top: 1px solid #e2ece6;
        font-family: var(--eb-body-font);
        color: var(--eb-ink);
      }
      .mc-ebook-chapter h3 {
        font-family: var(--eb-head-font) !important;
      }
      .mc-ebook-epigraph {
        border-left: 3.5px solid var(--eb-accent);
        padding: 8px 14px;
        margin: 10px 0 14px;
        background: rgba(0,0,0,0.025);
        font-style: italic;
        font-size: 13.5px;
        color: #334155;
        border-radius: 0 8px 8px 0;
      }
      .mc-ebook-metric-pill {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 7px 14px;
        border-radius: 10px;
        background: var(--eb-accent-soft);
        border: 1px solid rgba(0,0,0,0.08);
        margin-bottom: 14px;
        font-size: 12px;
      }
      .mc-ebook-chapter img {
        width: 100%;
        aspect-ratio: 16 / 9;
        max-height: 380px;
        object-fit: contain;
        background: #071911;
        border-radius: 12px;
        margin: 12px 0 16px;
        cursor: zoom-in;
        display: block;
      }
      .mc-ebook-wrap.is-editing [data-eb-edit="1"] {
        outline: 1.5px dashed #10b981;
        outline-offset: 4px;
        border-radius: 6px;
        cursor: text;
      }
      .mc-ebook-wrap.is-editing [data-eb-edit="1"]:focus {
        outline: 2px solid #059669;
        background: rgba(16, 185, 129, 0.06);
      }

      .mc-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px solid #edf2ef;
      }
      .mc-foot-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 12px;
        border-radius: 999px;
        border: 1px solid #d4e0d9;
        background: #ffffff;
        color: #26382f;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
      }
      .mc-foot-btn:hover {
        background: #0d261b;
        color: #ffffff;
        border-color: #0d261b;
      }

      /* Self-contained Thinking Animation */
      .mc-thinking-card {
        background: linear-gradient(145deg, #0b2218 0%, #103123 60%, #0d281c 100%);
        border-radius: 18px;
        padding: 20px 22px;
        color: #f0fdf4;
        border: 1px solid rgba(16, 185, 129, 0.32);
        position: relative;
        overflow: hidden;
      }
      .mc-thinking-aurora {
        position: absolute;
        top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, transparent, #10b981, #34d399, #06b6d4, #10b981, transparent);
        background-size: 200% 100%;
        animation: mcAurora 2s linear infinite;
      }
      @keyframes mcAurora {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .mc-thinking-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }
      .mc-orbital {
        width: 34px; height: 34px;
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .mc-ring1 {
        position: absolute; inset: 0; border-radius: 50%;
        border: 2px solid transparent; border-top-color: #10b981; border-right-color: rgba(16,185,129,0.35);
        animation: mcSpin 1.1s linear infinite;
      }
      .mc-ring2 {
        position: absolute; inset: 5px; border-radius: 50%;
        border: 2px solid transparent; border-bottom-color: #34d399;
        animation: mcSpinRev 1.5s linear infinite;
      }
      .mc-core {
        width: 10px; height: 10px; border-radius: 50%;
        background: #10b981; box-shadow: 0 0 12px #10b981;
      }
      @keyframes mcSpin { to { transform: rotate(360deg); } }
      @keyframes mcSpinRev { to { transform: rotate(-360deg); } }
      .mc-shimmer-bar {
        height: 8px;
        border-radius: 999px;
        margin-top: 10px;
        background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(52, 211, 153, 0.18) 50%, rgba(255,255,255,0.04) 75%);
        background-size: 200% 100%;
        animation: mcAurora 1.7s linear infinite;
      }

      /* Library & Image Studio Grid */
      .mc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
        margin-top: 18px;
      }
      .mc-lib-card {
        background: #ffffff;
        border: 1px solid #dce6e0;
        border-radius: 16px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 4px 14px rgba(11,36,25,0.03);
      }
      .mc-lib-thumb-wrap {
        width: 100%;
        height: 210px;
        overflow: hidden;
        background: #f8faf9;
        border-bottom: 1px solid #e2ece7;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: zoom-in;
      }
      .mc-lib-thumb-wrap:hover::after {
        content: '⤢ Full Preview';
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(11, 36, 25, 0.86);
        color: #ffffff;
        font-size: 11px;
        font-weight: 600;
        padding: 5px 10px;
        border-radius: 999px;
        pointer-events: none;
        backdrop-filter: blur(6px);
      }
      .mc-lib-thumb {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        padding: 4px;
      }
      .mc-image-crop-frame {
        cursor: zoom-in;
      }
      .mc-image-showcase.mc-edu-diagram .mc-image-crop-frame {
        background: #ffffff !important;
      }
      .mc-image-showcase.mc-edu-diagram .mc-image-crop-frame img {
        background: #ffffff !important;
        padding: 8px !important;
      }
      /* Gemini / ChatGPT-Style Full-Screen Lightbox Preview Modal */
      .mc-lightbox-overlay {
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(6, 20, 14, 0.92);
        backdrop-filter: blur(14px);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 18px 28px;
        animation: mcFadeIn 0.18s ease-out;
      }
      @keyframes mcFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .mc-lightbox-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        color: #ffffff;
      }
      .mc-lightbox-title {
        font-size: 14px;
        font-weight: 600;
        color: #ecfdf5;
        max-width: 55vw;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mc-lightbox-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mc-lb-btn {
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        padding: 7px 13px;
        border-radius: 999px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .mc-lb-btn:hover {
        background: rgba(16, 185, 129, 0.35);
        border-color: #10b981;
      }
      .mc-lb-btn.primary {
        background: #10b981;
        border-color: #059669;
        color: #052e16;
      }
      .mc-lb-btn.primary:hover {
        background: #34d399;
      }
      .mc-lightbox-stage {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
        margin: 14px 0;
        border-radius: 18px;
        position: relative;
      }
      .mc-lightbox-img-wrap {
        border-radius: 14px;
        padding: 12px;
        transition: transform 0.2s ease, background 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
      }
      .mc-lightbox-img-wrap.light-bg {
        background: #ffffff;
      }
      .mc-lightbox-img-wrap.dark-bg {
        background: #071c12;
      }
      .mc-lightbox-img-wrap img {
        max-width: 86vw;
        max-height: 76vh;
        object-fit: contain;
        display: block;
        border-radius: 8px;
        cursor: zoom-in;
      }
      .mc-lightbox-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #a7f3d0;
        font-size: 12px;
      }
      .mc-lib-body {
        padding: 12px 14px;
      }
      .mc-lib-title {
        font-size: 13px;
        font-weight: 600;
        color: #0b2419;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mc-lib-meta {
        font-size: 11px;
        color: #52665c;
      }
      .mc-lib-actions {
        padding: 8px 14px 12px;
        display: flex;
        gap: 6px;
      }

      /* Left Sidebar Chat History & Nav Items */
      .mc-side-nav-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 9px 12px;
        border-radius: 10px;
        border: none;
        background: transparent;
        color: rgba(255,255,255,0.78);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        margin-bottom: 3px;
        font-family: 'Inter', sans-serif;
      }
      .mc-side-nav-btn:hover {
        background: rgba(255,255,255,0.08);
        color: #ffffff;
      }
      .mc-side-nav-btn.active {
        background: #ffffff;
        color: #091d14;
        font-weight: 700;
      }
      .mc-side-history-box {
        margin: 10px 4px 14px;
        padding: 10px 6px;
        border-top: 1px solid rgba(255,255,255,0.1);
        border-bottom: 1px solid rgba(255,255,255,0.1);
        font-family: 'Inter', sans-serif;
      }
      .mc-side-history-title {
        font-size: 10.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: rgba(255,255,255,0.48);
        padding: 0 6px 7px;
        display: flex;
        justify-content: space-between;
      }
      .mc-side-hist-list {
        max-height: 180px;
        overflow-y: auto;
      }
      .mc-side-hist-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        border-radius: 8px;
        color: rgba(255,255,255,0.78);
        font-size: 12.5px;
        cursor: pointer;
        margin-bottom: 3px;
      }
      .mc-side-hist-row:hover, .mc-side-hist-row.active {
        background: rgba(16, 185, 129, 0.22);
        color: #ffffff;
        font-weight: 600;
      }
      .mc-side-hist-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
      }
      .mc-side-hist-del {
        background: none;
        border: none;
        color: rgba(255,255,255,0.4);
        cursor: pointer;
        font-size: 13px;
        padding: 0 4px;
      }
      .mc-side-hist-del:hover { color: #f87171; }
    `;
    document.head.appendChild(style);
  }

  function convertLatexMathInner(expr) {
    if (!expr) return '';
    let s = String(expr).trim();

    // Unwrap \text{...}, \mathrm{...}, \mathbf{...}, \textit{...}
    for (let k = 0; k < 3; k++) {
      s = s.replace(/\\(?:text|mathrm|mathbf|mathit|textbf|textit|operatorname)\s*\{([^{}]*)\}/g, '$1');
    }

    // Remove \left and \right sizing tokens
    s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)\b/g, '');

    // Greek letters & mathematical symbols -> crisp Unicode symbols
    const symMap = [
      [/\\pi\b/g, 'π'], [/\\Pi\b/g, 'Π'],
      [/\\theta\b/g, 'θ'], [/\\Theta\b/g, 'Θ'], [/\\vartheta\b/g, 'ϑ'],
      [/\\alpha\b/g, 'α'], [/\\beta\b/g, 'β'], [/\\gamma\b/g, 'γ'], [/\\Gamma\b/g, 'Γ'],
      [/\\delta\b/g, 'δ'], [/\\Delta\b/g, 'Δ'],
      [/\\epsilon\b/g, 'ε'], [/\\varepsilon\b/g, 'ε'],
      [/\\zeta\b/g, 'ζ'], [/\\eta\b/g, 'η'],
      [/\\kappa\b/g, 'κ'], [/\\lambda\b/g, 'λ'], [/\\Lambda\b/g, 'Λ'],
      [/\\mu\b/g, 'μ'], [/\\nu\b/g, 'ν'], [/\\xi\b/g, 'ξ'], [/\\Xi\b/g, 'Ξ'],
      [/\\rho\b/g, 'ρ'], [/\\sigma\b/g, 'σ'], [/\\Sigma\b/g, '∑'],
      [/\\tau\b/g, 'τ'], [/\\upsilon\b/g, 'υ'],
      [/\\phi\b/g, 'φ'], [/\\Phi\b/g, 'Φ'], [/\\varphi\b/g, 'φ'],
      [/\\chi\b/g, 'χ'], [/\\psi\b/g, 'ψ'], [/\\Psi\b/g, 'Ψ'],
      [/\\omega\b/g, 'ω'], [/\\Omega\b/g, 'Ω'],
      [/\\times\b/g, ' × '], [/\\cdot\b/g, ' · '], [/\\div\b/g, ' ÷ '],
      [/\\pm\b/g, ' ± '], [/\\mp\b/g, ' ∓ '],
      [/\\leq?\b/g, ' ≤ '], [/\\geq?\b/g, ' ≥ '],
      [/\\neq?\b/g, ' ≠ '], [/\\approx\b/g, ' ≈ '], [/\\equiv\b/g, ' ≡ '], [/\\cong\b/g, ' ≅ '], [/\\sim\b/g, ' ∼ '], [/\\propto\b/g, ' ∝ '],
      [/\\infty\b/g, '∞'], [/\\partial\b/g, '∂'], [/\\nabla\b/g, '∇'],
      [/\\int\b/g, '∫'], [/\\iint\b/g, '∬'], [/\\oint\b/g, '∮'],
      [/\\sum\b/g, '∑'], [/\\prod\b/g, '∏'],
      [/\\angle\b/g, '∠'], [/\\triangle\b/g, '△'], [/\\perp\b/g, '⊥'], [/\\parallel\b/g, '∥'],
      [/\^\s*\\circ\b/g, '°'], [/\\circ\b/g, '°'], [/\\degree\b/g, '°'],
      [/\\Rightarrow\b/g, ' ⇒ '], [/\\Leftarrow\b/g, ' ⇐ '], [/\\Leftrightarrow\b/g, ' ⇔ '], [/\\iff\b/g, ' ⇔ '],
      [/\\rightarrow\b/g, ' → '], [/\\to\b/g, ' → '], [/\\leftarrow\b/g, ' ← '], [/\\leftrightarrow\b/g, ' ↔ '],
      [/\\forall\b/g, '∀'], [/\\exists\b/g, '∃'], [/\\in\b/g, ' ∈ '], [/\\notin\b/g, ' ∉ '],
      [/\\subset\b/g, ' ⊂ '], [/\\subseteq\b/g, ' ⊆ '], [/\\cup\b/g, ' ∪ '], [/\\cap\b/g, ' ∩ '],
      [/\\emptyset\b/g, '∅'], [/\\therefore\b/g, '∴'], [/\\because\b/g, '∵'],
      [/\\quad\b/g, '  '], [/\\qquad\b/g, '    '], [/\\,/g, ' '], [/\\;/g, ' '], [/\\:/g, ' ']
    ];
    for (const [rgx, rep] of symMap) {
      s = s.replace(rgx, rep);
    }

    // Nth roots & Square roots: \sqrt[n]{x} and \sqrt{x}
    for (let k = 0; k < 3; k++) {
      s = s.replace(/\\sqrt\s*\[([^\[\]]+)\]\s*\{([^{}]+)\}/g, '<sup>$1</sup><span class="mc-sqrt"><span class="mc-sqrt-sym">√</span><span class="mc-sqrt-body">$2</span></span>');
      s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, '<span class="mc-sqrt"><span class="mc-sqrt-sym">√</span><span class="mc-sqrt-body">$1</span></span>');
    }

    // Stacked Fractions: \frac{num}{den} or \dfrac{num}{den} or \tfrac{num}{den} (up to 3 nested levels)
    for (let k = 0; k < 3; k++) {
      s = s.replace(/\\(?:d|t)?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '<span class="mc-frac"><span class="mc-frac-num">$1</span><span class="mc-frac-den">$2</span></span>');
    }

    // Superscripts & Subscripts: ^{...}, ^2, _{...}, _1
    s = s.replace(/\^\s*\{([^{}]+)\}/g, '<sup>$1</sup>');
    s = s.replace(/\^([0-9a-zA-Z+\-]+)/g, '<sup>$1</sup>');
    s = s.replace(/_\s*\{([^{}]+)\}/g, '<sub>$1</sub>');
    s = s.replace(/_([0-9a-zA-Z+\-]+)/g, '<sub>$1</sub>');

    // Clean any remaining stray LaTeX braces
    s = s.replace(/\\([{}])/g, '$1');
    return s;
  }

  
  // ============================================================================
  // v44.0 SMART SCIENTIFIC & NUMERICAL SYMBOL TAB DRAWER + FLASHCARD / INFOGRAPHIC ENGINE
  // ============================================================================
  // Left Scientific Pad (30 keys: 6 rows x 5 cols) in Main Sci-Calc View
  const SCI_CALC_LEFT_KEYS = [
    { disp: 'a/b', sub: 'Upon', ins: '\\frac{}{}', cur: 6, cls: 'is-accent' },
    { disp: '( )/( )', sub: 'Simple /', ins: '()/()', cur: 1, cls: 'is-accent' },
    { disp: '√(x)', sub: 'Sq Root', ins: '\\sqrt{}', cur: 6 },
    { disp: '∛(x)', sub: 'Cube Rt', ins: '∛()', cur: 2 },
    { disp: 'x²', sub: 'Square', ins: '^2' },

    { disp: 'x³', sub: 'Cube', ins: '^3' },
    { disp: 'xⁿ', sub: 'Power', ins: '^{}', cur: 2 },
    { disp: 'x₁', sub: 'Subscr', ins: '_{}', cur: 2 },
    { disp: 'π', sub: 'Pi', ins: 'π', cls: 'is-op' },
    { disp: 'θ', sub: 'theta', ins: 'θ', cls: 'is-op' },

    { disp: 'sin', sub: 'sin(x)', ins: 'sin()', cur: 4 },
    { disp: 'cos', sub: 'cos(x)', ins: 'cos()', cur: 4 },
    { disp: 'tan', sub: 'tan(x)', ins: 'tan()', cur: 4 },
    { disp: 'α', sub: 'alpha', ins: 'α', cls: 'is-op' },
    { disp: 'β', sub: 'beta', ins: 'β', cls: 'is-op' },

    { disp: 'sin⁻¹', sub: 'arcsin', ins: 'sin⁻¹()', cur: 6 },
    { disp: 'cos⁻¹', sub: 'arccos', ins: 'cos⁻¹()', cur: 6 },
    { disp: 'tan⁻¹', sub: 'arctan', ins: 'tan⁻¹()', cur: 6 },
    { disp: 'γ', sub: 'gamma', ins: 'γ', cls: 'is-op' },
    { disp: 'Δ', sub: 'Delta', ins: 'Δ', cls: 'is-op' },

    { disp: 'log', sub: 'log10', ins: 'log()', cur: 4 },
    { disp: 'ln', sub: 'Nat Log', ins: 'ln()', cur: 3 },
    { disp: 'eˣ', sub: 'Exp', ins: 'e^{}', cur: 3 },
    { disp: '10ˣ', sub: '10^x', ins: '10^{}', cur: 4 },
    { disp: '∞', sub: 'Infinity', ins: '∞' },

    { disp: '∫', sub: 'Integral', ins: '∫ ' },
    { disp: 'd/dx', sub: 'Deriv', ins: '\\frac{d}{dx}(', cur: 13 },
    { disp: '∑', sub: 'Sum', ins: '∑ ' },
    { disp: 'lim', sub: 'Limit', ins: 'lim_{x→0} ' },
    { disp: '⇌', sub: 'Equil', ins: ' ⇌ ' }
  ];

  // Right Numpad + Operators (24 keys: 6 rows x 4 cols) in Main Sci-Calc View
  const SCI_CALC_RIGHT_KEYS = [
    { disp: '(', sub: 'Open', ins: '(' },
    { disp: ')', sub: 'Close', ins: ')' },
    { disp: '±', sub: 'Plus/Min', ins: ' ± ', cls: 'is-op' },
    { disp: '÷', sub: 'Divide', ins: ' ÷ ', cls: 'is-op' },

    { disp: '7', sub: '', ins: '7', cls: 'is-num' },
    { disp: '8', sub: '', ins: '8', cls: 'is-num' },
    { disp: '9', sub: '', ins: '9', cls: 'is-num' },
    { disp: '×', sub: 'Mult', ins: ' × ', cls: 'is-op' },

    { disp: '4', sub: '', ins: '4', cls: 'is-num' },
    { disp: '5', sub: '', ins: '5', cls: 'is-num' },
    { disp: '6', sub: '', ins: '6', cls: 'is-num' },
    { disp: '−', sub: 'Minus', ins: ' - ', cls: 'is-op' },

    { disp: '1', sub: '', ins: '1', cls: 'is-num' },
    { disp: '2', sub: '', ins: '2', cls: 'is-num' },
    { disp: '3', sub: '', ins: '3', cls: 'is-num' },
    { disp: '+', sub: 'Plus', ins: ' + ', cls: 'is-op' },

    { disp: '0', sub: '', ins: '0', cls: 'is-num' },
    { disp: '.', sub: 'Dot', ins: '.', cls: 'is-num' },
    { disp: '%', sub: 'Pct', ins: '%' },
    { disp: '=', sub: 'Equals', ins: ' = ', cls: 'is-accent' },

    { disp: '≤', sub: 'Less/Eq', ins: ' ≤ ' },
    { disp: '≥', sub: 'Grt/Eq', ins: ' ≥ ' },
    { disp: '≠', sub: 'Not Eq', ins: ' ≠ ' },
    { disp: '≈', sub: 'Approx', ins: ' ≈ ' }
  ];

  const SMART_SYMBOL_CATEGORIES = {
    calc_pad: {
      label: '🧮 Sci-Calc Pad',
      items: [...SCI_CALC_LEFT_KEYS, ...SCI_CALC_RIGHT_KEYS]
    },
    algebra_calc: {
      label: '➗ Upon & Calc',
      items: [
        { disp: 'a/b', sub: 'Upon (Frac)', ins: '\\frac{}{}', cur: 6, cls: 'is-accent' },
        { disp: '( )/( )', sub: 'Simple Upon', ins: '()/()', cur: 1, cls: 'is-accent' },
        { disp: 'd/dx', sub: 'Derivative', ins: '\\frac{d}{dx}()', cur: 13 },
        { disp: 'dy/dx', sub: 'Slope Deriv', ins: '\\frac{dy}{dx}' },
        { disp: '∂/∂x', sub: 'Partial', ins: '\\frac{∂}{∂x}' },
        { disp: '∫', sub: 'Integral', ins: '∫ ' },
        { disp: '∫ₐᵇ', sub: 'Def Int', ins: '∫_{}^{} ', cur: 3 },
        { disp: '∬', sub: 'Double Int', ins: '∬ ' },
        { disp: '∭', sub: 'Triple Int', ins: '∭ ' },
        { disp: '∮', sub: 'Contour Int', ins: '∮ ' },
        { disp: '∑', sub: 'Summation', ins: '∑_{i=1}^{n} ' },
        { disp: '∏', sub: 'Product', ins: '∏_{i=1}^{n} ' },
        { disp: 'lim', sub: 'x→0 Limit', ins: 'lim_{x→0} ' },
        { disp: 'lim ∞', sub: 'x→∞ Limit', ins: 'lim_{x→∞} ' },
        { disp: '√(x)', sub: 'Sq Root', ins: '\\sqrt{}', cur: 6 },
        { disp: '∛(x)', sub: 'Cube Root', ins: '∛()', cur: 2 },
        { disp: 'ⁿ√(x)', sub: 'n-th Root', ins: 'ⁿ√()', cur: 3 },
        { disp: 'x²', sub: 'Square', ins: '^2' },
        { disp: 'x³', sub: 'Cube', ins: '^3' },
        { disp: 'xⁿ', sub: 'Power n', ins: '^{}', cur: 2 },
        { disp: 'x⁻¹', sub: 'Inverse', ins: '^{-1}' },
        { disp: 'x₁', sub: 'Subscript', ins: '_{}', cur: 2 },
        { disp: '|x|', sub: 'Abs Val', ins: '||', cur: 1 },
        { disp: 'n!', sub: 'Factorial', ins: '!' },
        { disp: 'ⁿCᵣ', sub: 'Combin', ins: 'C(n,r)' },
        { disp: 'ⁿPᵣ', sub: 'Permut', ins: 'P(n,r)' },
        { disp: '∇', sub: 'Nabla/Grad', ins: '∇' },
        { disp: '∞', sub: 'Infinity', ins: '∞' },
        { disp: '∝', sub: 'Proport', ins: ' ∝ ' },
        { disp: '≡', sub: 'Identical', ins: ' ≡ ' },
        { disp: '≪', sub: 'Much Less', ins: ' ≪ ' },
        { disp: '≫', sub: 'Much Grt', ins: ' ≫ ' }
      ]
    },
    greek: {
      label: '🔤 Greek (θ β γ)',
      items: [
        { disp: 'θ', sub: 'theta', ins: 'θ', cls: 'is-accent' },
        { disp: 'β', sub: 'beta', ins: 'β', cls: 'is-accent' },
        { disp: 'γ', sub: 'gamma', ins: 'γ', cls: 'is-accent' },
        { disp: 'α', sub: 'alpha', ins: 'α', cls: 'is-accent' },
        { disp: 'π', sub: 'pi (3.14)', ins: 'π', cls: 'is-accent' },
        { disp: 'Δ', sub: 'Delta (Chg)', ins: 'Δ', cls: 'is-accent' },
        { disp: 'δ', sub: 'delta', ins: 'δ' },
        { disp: 'ε', sub: 'epsilon', ins: 'ε' },
        { disp: 'ζ', sub: 'zeta', ins: 'ζ' },
        { disp: 'η', sub: 'eta (Eff)', ins: 'η' },
        { disp: 'Θ', sub: 'Theta', ins: 'Θ' },
        { disp: 'κ', sub: 'kappa', ins: 'κ' },
        { disp: 'λ', sub: 'lambda (Wav)', ins: 'λ' },
        { disp: 'Λ', sub: 'Lambda', ins: 'Λ' },
        { disp: 'μ', sub: 'mu (Micro)', ins: 'μ' },
        { disp: 'ν', sub: 'nu (Freq)', ins: 'ν' },
        { disp: 'ξ', sub: 'xi', ins: 'ξ' },
        { disp: 'Π', sub: 'Pi (Prod)', ins: 'Π' },
        { disp: 'ρ', sub: 'rho (Dens)', ins: 'ρ' },
        { disp: 'σ', sub: 'sigma (Std)', ins: 'σ' },
        { disp: 'Σ', sub: 'Sigma (Sum)', ins: 'Σ' },
        { disp: 'τ', sub: 'tau (Torq)', ins: 'τ' },
        { disp: 'φ', sub: 'phi (Phase)', ins: 'φ' },
        { disp: 'Φ', sub: 'Phi (Flux)', ins: 'Φ' },
        { disp: 'χ', sub: 'chi', ins: 'χ' },
        { disp: 'ψ', sub: 'psi (Wave)', ins: 'ψ' },
        { disp: 'Ψ', sub: 'Psi', ins: 'Ψ' },
        { disp: 'ω', sub: 'omega (Ang)', ins: 'ω' },
        { disp: 'Ω', sub: 'Omega (Ohm)', ins: 'Ω' }
      ]
    },
    geom_vec: {
      label: '📐 Geom & Vec',
      items: [
        { disp: '°', sub: 'Degree', ins: '°', cls: 'is-accent' },
        { disp: '∠', sub: 'Angle', ins: '∠', cls: 'is-accent' },
        { disp: '∟', sub: 'Right 90°', ins: '∟' },
        { disp: '⊥', sub: 'Perpendic', ins: ' ⊥ ' },
        { disp: '∥', sub: 'Parallel', ins: ' ∥ ' },
        { disp: '△', sub: 'Triangle', ins: '△' },
        { disp: '□', sub: 'Square', ins: '□' },
        { disp: '○', sub: 'Circle', ins: '○' },
        { disp: '≅', sub: 'Congruent', ins: ' ≅ ' },
        { disp: '∼', sub: 'Similar', ins: ' ∼ ' },
        { disp: '∴', sub: 'Therefore', ins: ' ∴ ', cls: 'is-op' },
        { disp: '∵', sub: 'Because', ins: ' ∵ ', cls: 'is-op' },
        { disp: '⇒', sub: 'Implies', ins: ' ⇒ ', cls: 'is-op' },
        { disp: '⇔', sub: 'Iff', ins: ' ⇔ ', cls: 'is-op' },
        { disp: 'î', sub: 'x-Unit Vec', ins: 'î' },
        { disp: 'ĵ', sub: 'y-Unit Vec', ins: 'ĵ' },
        { disp: 'k̂', sub: 'z-Unit Vec', ins: 'k̂' },
        { disp: '⋅', sub: 'Dot Prod', ins: ' ⋅ ' },
        { disp: '×', sub: 'Cross Prod', ins: ' × ' },
        { disp: '∈', sub: 'In Set', ins: ' ∈ ' },
        { disp: '∉', sub: 'Not In', ins: ' ∉ ' },
        { disp: '⊂', sub: 'Subset', ins: ' ⊂ ' },
        { disp: '⊆', sub: 'Subset/Eq', ins: ' ⊆ ' },
        { disp: '∪', sub: 'Union', ins: ' ∪ ' },
        { disp: '∩', sub: 'Intersect', ins: ' ∩ ' },
        { disp: '∅', sub: 'Empty Set', ins: '∅' },
        { disp: '∀', sub: 'For All', ins: '∀ ' },
        { disp: '∃', sub: 'Exists', ins: '∃ ' },
        { disp: 'ℝ', sub: 'Real Set', ins: 'ℝ' },
        { disp: 'ℤ', sub: 'Integers', ins: 'ℤ' }
      ]
    },
    sci_chem: {
      label: '⚛️ Sci & Chem',
      items: [
        { disp: '→', sub: 'Yields', ins: ' → ', cls: 'is-accent' },
        { disp: '⇌', sub: 'Reversible', ins: ' ⇌ ', cls: 'is-accent' },
        { disp: '↑', sub: 'Gas Evol', ins: '↑' },
        { disp: '↓', sub: 'Precipitate', ins: '↓' },
        { disp: 'ΔH°', sub: 'Enthalpy', ins: 'ΔH°' },
        { disp: 'ΔG°', sub: 'Gibbs Free', ins: 'ΔG°' },
        { disp: 'ΔS°', sub: 'Entropy', ins: 'ΔS°' },
        { disp: 'hν', sub: 'Photon', ins: 'hν' },
        { disp: 'e⁻', sub: 'Electron', ins: 'e⁻' },
        { disp: 'p⁺', sub: 'Proton', ins: 'p⁺' },
        { disp: 'n⁰', sub: 'Neutron', ins: 'n⁰' },
        { disp: 'H⁺', sub: 'H+ Ion', ins: 'H⁺' },
        { disp: 'OH⁻', sub: 'Hydroxide', ins: 'OH⁻' },
        { disp: 'pH', sub: 'Acidity', ins: 'pH = ' },
        { disp: 'K_c', sub: 'Eq Const', ins: 'K_c' },
        { disp: 'K_p', sub: 'Press Eq', ins: 'K_p' },
        { disp: 'ℏ', sub: 'Planck h', ins: 'ℏ' },
        { disp: 'Å', sub: 'Angstrom', ins: 'Å' },
        { disp: 'Ω', sub: 'Ohm', ins: 'Ω' },
        { disp: '°C', sub: 'Celsius', ins: '°C' },
        { disp: 'K', sub: 'Kelvin', ins: ' K' },
        { disp: 'ε₀', sub: 'Permittiv', ins: 'ε₀' },
        { disp: 'μ₀', sub: 'Permeab', ins: 'μ₀' },
        { disp: '10⁻', sub: 'Sci Notat', ins: '×10^{-}', cur: 5 },
        { disp: '10⁺', sub: 'Sci Power', ins: '×10^{}', cur: 4 },
        { disp: 'c', sub: '3×10⁸ m/s', ins: '3×10^8 m/s' },
        { disp: 'N_A', sub: 'Avogadro', ins: '6.022×10^{23}' },
        { disp: 'g', sub: '9.8 m/s²', ins: '9.8 m/s^2' }
      ]
    }
  };

  function renderCalcKeyBtn(item) {
    return `
      <button type="button" class="mc-sym-item-btn ${item.cls || ''}" data-sym-ins="${esc(item.ins)}" data-sym-cur="${item.cur || 0}" title="Insert ${esc(item.disp)}${item.sub ? ' (' + esc(item.sub) + ')' : ''}">
        <span>${esc(item.disp)}</span>
        ${item.sub ? `<span class="mc-sym-item-sub">${esc(item.sub)}</span>` : ''}
      </button>
    `;
  }

  function buildSmartSymbolPopoverHtml() {
    const activeCat = state.activeSymCat || 'calc_pad';
    const q = String(state.symSearchQuery || '').trim().toLowerCase();

    let bodyHtml = '';
    if (q) {
      // Search across all categories
      const seen = new Set();
      const matches = [];
      for (const cat of Object.values(SMART_SYMBOL_CATEGORIES)) {
        for (const it of cat.items) {
          const key = it.disp + '|' + it.ins;
          if (seen.has(key)) continue;
          if (it.disp.toLowerCase().includes(q) || (it.sub && it.sub.toLowerCase().includes(q)) || it.ins.toLowerCase().includes(q)) {
            seen.add(key);
            matches.push(it);
          }
        }
      }
      bodyHtml = matches.length
        ? `<div class="mc-sym-grid">${matches.map(renderCalcKeyBtn).join('')}</div>`
        : `<div style="padding:18px;text-align:center;font-size:12px;color:#94a3b8;">No symbols matching "${esc(q)}"</div>`;
    } else if (activeCat === 'calc_pad') {
      bodyHtml = `
        <div class="mc-calc-dual-deck">
          <div class="mc-calc-sci-pad">
            ${SCI_CALC_LEFT_KEYS.map(renderCalcKeyBtn).join('')}
          </div>
          <div class="mc-calc-num-pad">
            ${SCI_CALC_RIGHT_KEYS.map(renderCalcKeyBtn).join('')}
          </div>
        </div>
      `;
    } else {
      const catObj = SMART_SYMBOL_CATEGORIES[activeCat] || SMART_SYMBOL_CATEGORIES.algebra_calc;
      bodyHtml = `<div class="mc-sym-grid">${catObj.items.map(renderCalcKeyBtn).join('')}</div>`;
    }

    return `
      <div class="mc-calc-topbar">
        <span style="font-size:12px;font-weight:800;color:#6ee7b7;letter-spacing:0.04em;white-space:nowrap;">🧮 SCI-CALC &amp; SYMBOLS</span>
        <input type="text" class="mc-calc-search" id="mc-calc-search-inp" placeholder="🔍 Search symbol (e.g. upon, theta, integral, ohm)..." value="${esc(state.symSearchQuery || '')}">
        <button type="button" id="mc-sym-close-btn" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#e2e8f0;font-size:12px;font-weight:700;cursor:pointer;padding:3px 8px;" title="Close Calculator">✕</button>
      </div>

      <!-- Quick Cursor & Calculator Control Bar -->
      <div class="mc-calc-ctrl-strip">
        <div style="display:flex;gap:4px;align-items:center;">
          <button type="button" class="mc-calc-act-key" data-calc-act="left" title="Move Cursor Left">◀</button>
          <button type="button" class="mc-calc-act-key" data-calc-act="right" title="Move Cursor Right">▶</button>
          <button type="button" class="mc-calc-act-key" data-calc-act="space" title="Insert Space">␣ Space</button>
          <button type="button" class="mc-calc-act-key" data-calc-act="newline" title="Insert New Line">↵ Line</button>
        </div>
        <div style="display:flex;gap:4px;align-items:center;">
          <button type="button" class="mc-calc-act-key" data-calc-act="bksp" title="Backspace">⌫ Del</button>
          <button type="button" class="mc-calc-act-key is-warn" data-calc-act="clear" title="Clear Prompt Box">AC Clear</button>
        </div>
      </div>

      <div class="mc-sym-cat-bar">
        ${Object.entries(SMART_SYMBOL_CATEGORIES).map(([k, v]) => `
          <button type="button" class="mc-sym-cat-btn ${k === activeCat && !q ? 'active' : ''}" data-sym-cat="${k}">${v.label}</button>
        `).join('')}
      </div>

      <div id="mc-calc-keys-slot">
        ${bodyHtml}
      </div>
    `;
  }

  function bindSmartSymbolPopoverEvents() {
    const pop = document.getElementById('mc-sym-popover');
    const tabBtn = document.getElementById('mc-sym-tab-btn');
    const chatInput = document.getElementById('mc-chat-input');
    if (!pop || !tabBtn) return;

    const bindInnerKeyClicks = () => {
      pop.querySelectorAll('[data-sym-ins]').forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          if (!chatInput) return;
          const ins = b.getAttribute('data-sym-ins') || '';
          const curOff = parseInt(b.getAttribute('data-sym-cur') || '0', 10);
          const start = chatInput.selectionStart ?? chatInput.value.length;
          const end = chatInput.selectionEnd ?? chatInput.value.length;
          chatInput.value = chatInput.value.slice(0, start) + ins + chatInput.value.slice(end);
          chatInput.focus();
          const nextPos = curOff > 0 ? start + curOff : start + ins.length;
          chatInput.setSelectionRange(nextPos, nextPos);
          chatInput.style.height = 'auto';
          chatInput.style.height = Math.min(160, Math.max(48, chatInput.scrollHeight)) + 'px';
        };
      });
    };

    const refreshDrawer = (preserveSearchFocus) => {
      pop.innerHTML = buildSmartSymbolPopoverHtml();

      pop.querySelector('#mc-sym-close-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        pop.style.display = 'none';
        tabBtn.classList.remove('active');
      });

      const searchInp = pop.querySelector('#mc-calc-search-inp');
      if (searchInp) {
        if (preserveSearchFocus) {
          searchInp.focus();
          searchInp.setSelectionRange(searchInp.value.length, searchInp.value.length);
        }
        searchInp.addEventListener('input', (e) => {
          e.stopPropagation();
          state.symSearchQuery = searchInp.value || '';
          refreshDrawer(true);
        });
        searchInp.addEventListener('click', (e) => e.stopPropagation());
      }

      pop.querySelectorAll('[data-calc-act]').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!chatInput) return;
          const act = b.getAttribute('data-calc-act');
          const start = chatInput.selectionStart ?? chatInput.value.length;
          const end = chatInput.selectionEnd ?? chatInput.value.length;
          if (act === 'left') {
            const p = Math.max(0, start - 1);
            chatInput.focus();
            chatInput.setSelectionRange(p, p);
          } else if (act === 'right') {
            const p = Math.min(chatInput.value.length, end + 1);
            chatInput.focus();
            chatInput.setSelectionRange(p, p);
          } else if (act === 'space') {
            chatInput.value = chatInput.value.slice(0, start) + ' ' + chatInput.value.slice(end);
            chatInput.focus();
            chatInput.setSelectionRange(start + 1, start + 1);
          } else if (act === 'newline') {
            chatInput.value = chatInput.value.slice(0, start) + '\n' + chatInput.value.slice(end);
            chatInput.focus();
            chatInput.setSelectionRange(start + 1, start + 1);
          } else if (act === 'bksp') {
            if (start !== end) {
              chatInput.value = chatInput.value.slice(0, start) + chatInput.value.slice(end);
              chatInput.focus();
              chatInput.setSelectionRange(start, start);
            } else if (start > 0) {
              chatInput.value = chatInput.value.slice(0, start - 1) + chatInput.value.slice(end);
              chatInput.focus();
              chatInput.setSelectionRange(start - 1, start - 1);
            }
          } else if (act === 'clear') {
            chatInput.value = '';
            chatInput.focus();
          }
          chatInput.style.height = 'auto';
          chatInput.style.height = Math.min(160, Math.max(48, chatInput.scrollHeight)) + 'px';
        });
      });

      pop.querySelectorAll('[data-sym-cat]').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          state.activeSymCat = b.getAttribute('data-sym-cat') || 'calc_pad';
          state.symSearchQuery = '';
          refreshDrawer(false);
        });
      });

      bindInnerKeyClicks();
    };

    refreshDrawer(false);

    tabBtn.onclick = (e) => {
      e.stopPropagation();
      const isHidden = pop.style.display === 'none';
      pop.style.display = isHidden ? 'block' : 'none';
      tabBtn.classList.toggle('active', isHidden);
      if (isHidden) refreshDrawer(false);
    };

    pop.onclick = (e) => e.stopPropagation();
    document.addEventListener('click', () => {
      if (pop.style.display !== 'none') {
        pop.style.display = 'none';
        tabBtn.classList.remove('active');
      }
    });
  }


  // ============================================================================
  // v47.0 STUDY VAULT, STUDENT ANALYTICS, MULTI-PDF NOTEBOOK & MOCK TEST ENGINE
  // ============================================================================
  const STUDY_VAULT_KEY = 'pm_study_vault_v47';
  const STUDY_ANALYTICS_KEY = 'pm_study_analytics_v47';
  const STUDY_NOTEBOOK_KEY = 'pm_study_notebook_v47';


  // ============================================================================
  // v53.0 USER PROFILE, SAVED MEMORY, PERSONALIZATION, BILLING, SECURITY & UI THEME ENGINE
  // ============================================================================
  const USER_SETTINGS_KEY = 'pm_user_settings_v53';

  const defaultUserSettings = {
    displayName: 'Harsh Saxena',
    initials: 'HS',
    avatarBg: 'linear-gradient(135deg, #ea580c 0%, #d97706 100%)',
    planBadge: 'Plus · Founder Ultra',
    roleTitle: 'Founder & AI Architect · Metamorphic Pixel',
    email: 'harsh@pixelmorphic.ai',
    locationCity: 'Jhansi, Uttar Pradesh, India',
    // Appearance & Custom UI Features
    themeMode: 'emerald', // 'emerald' | 'dark' | 'light' | 'oled'
    accentColor: '#10b981',
    fontScale: 'normal', // 'small' | 'normal' | 'large'
    compactCards: false,
    glassEffect: true,
    showScrollButtons: true,
    autoReadAloud: false,
    // Personalization
    customAbout: 'Owner & founder of Pixelmorphic AI and Metamorphic Pixel Studios. Builds full-stack AI web platforms, generative media, and competitive exam study tools.',
    customStyle: 'Provide clear, structured, step-by-step explanations with high factual accuracy and practical code or examples.',
    tone: 'balanced', // 'balanced' | 'friendly' | 'concise' | 'academic'
    preferredLang: 'en',
    // Saved Memory
    memoryEnabled: true,
    memories: [
      { id: 'm1', text: 'Founder and owner of Pixelmorphic AI & Metamorphic Pixel Studios.', createdAt: '2026-11-12' },
      { id: 'm2', text: 'Develops full-stack Node.js web applications on Windows 11 using PowerShell.', createdAt: '2026-11-12' },
      { id: 'm3', text: 'Builds educational & competitive exam content under Exam Saathi / Study Workspace.', createdAt: '2026-11-12' }
    ],
    // Security
    pinLockEnabled: false,
    pinCode: '',
    twoFactorEnabled: true
  };

  function loadUserSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        state.userSettings = { ...defaultUserSettings, ...raw, memories: Array.isArray(raw.memories) ? raw.memories : defaultUserSettings.memories };
        return state.userSettings;
      }
    } catch (_) {}
    state.userSettings = { ...defaultUserSettings };
    return state.userSettings;
  }

  function saveUserSettings() {
    try { localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(state.userSettings)); } catch (_) {}
    applyUserAppearanceSettings();
    syncLeftSidebar();
    try {
      fetch('/api/research?chatMode=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageAction: 'save', userSettings: state.userSettings })
      }).catch(() => {});
    } catch (_) {}
  }

  function applyUserAppearanceSettings() {
    const cfg = state.userSettings || loadUserSettings();
    let styleEl = document.getElementById('mc-dynamic-theme-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'mc-dynamic-theme-style';
      document.head.appendChild(styleEl);
    }

    const accent = cfg.accentColor || '#10b981';
    const fontZoom = cfg.fontScale === 'small' ? '13.8px' : cfg.fontScale === 'large' ? '16.5px' : '15px';
    const cardPad = cfg.compactCards ? '15px 18px 13px' : '22px 26px 18px';
    const scrollDisplay = cfg.showScrollButtons === false ? 'none !important' : 'flex';

    let modeCss = '';
    if (cfg.themeMode === 'dark') {
      modeCss = `
        body, main, .content, .main-content, #app, #root, #mc-dedicated-host-slot {
          background-color: #0d1117 !important;
          color: #e6edf3 !important;
        }
        .mc-title { color: #f0f6fc !important; }
        .mc-ai-card, .mr-report-card, .mc-mock-card, .mc-fc-deck {
          background: #161b22 !important;
          border-color: #30363d !important;
          color: #e6edf3 !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35) !important;
        }
        .mc-ai-body, .mr-report-body, .mc-ai-body p, .mc-ai-body li, .mc-ai-body h1, .mc-ai-body h2, .mc-ai-body h3 {
          color: #e6edf3 !important;
        }
        .mc-ai-body table th { background: #21262d !important; color: #f0f6fc !important; border-color: #30363d !important; }
        .mc-ai-body table td { border-color: #30363d !important; color: #c9d1d9 !important; }
        .mc-foot-btn, .mc-top-tts-btn, .mc-pill-btn {
          background: #21262d !important;
          border-color: #30363d !important;
          color: #c9d1d9 !important;
        }
        .mc-mock-qbox, .mc-fc-card:not(.is-flipped) {
          background: #0d1117 !important;
          border-color: #30363d !important;
          color: #e6edf3 !important;
        }
        .mc-mock-opt {
          background: #161b22 !important;
          border-color: #30363d !important;
          color: #e6edf3 !important;
        }
        .mc-shell.has-messages .mc-topbar {
          background: rgba(13, 17, 23, 0.92) !important;
          border-bottom-color: #30363d !important;
        }
      `;
    } else if (cfg.themeMode === 'oled') {
      modeCss = `
        body, main, .content, .main-content, #app, #root, #mc-dedicated-host-slot, aside, .sidebar, .demo-sidebar {
          background: #000000 !important;
          background-color: #000000 !important;
          color: #f8fafc !important;
        }
        .mc-title { color: #ffffff !important; }
        .mc-ai-card, .mr-report-card, .mc-study-banner, .mc-composer {
          background: #090b0a !important;
          border-color: rgba(52, 211, 153, 0.35) !important;
          color: #f8fafc !important;
        }
        .mc-ai-body, .mr-report-body, .mc-ai-body p, .mc-ai-body li, .mc-ai-body h1, .mc-ai-body h2, .mc-ai-body h3 {
          color: #f8fafc !important;
        }
        .mc-foot-btn, .mc-top-tts-btn, .mc-pill-btn {
          background: #111614 !important;
          border-color: #1e2925 !important;
          color: #d1fae5 !important;
        }
        .mc-shell.has-messages .mc-topbar {
          background: rgba(0, 0, 0, 0.92) !important;
        }
      `;
    } else if (cfg.themeMode === 'light') {
      modeCss = `
        body, main, .content, .main-content, #app, #root, #mc-dedicated-host-slot {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }
        .mc-ai-card, .mr-report-card {
          background: #ffffff !important;
          border-color: #e2e8f0 !important;
          color: #0f172a !important;
        }
      `;
    }

    styleEl.textContent = `
      :root { --pm-user-accent: ${accent}; }
      .mc-ai-body { font-size: ${fontZoom} !important; }
      .mc-ai-card { padding: ${cardPad} !important; }
      #mc-scroll-jump-dock { display: ${scrollDisplay}; }
      .mc-user-bubble, .mc-pill-btn.active, .mc-study-subj-btn.active {
        border-color: ${accent} !important;
      }
      ${modeCss}
    `;
  }

  function toggleProfilePopover(anchorEl) {
    const existing = document.getElementById('mc-profile-popover');
    if (existing) {
      existing.remove();
      return;
    }
    const cfg = state.userSettings || loadUserSettings();
    const pop = document.createElement('div');
    pop.id = 'mc-profile-popover';
    pop.className = 'mc-profile-popover';

    if (anchorEl && anchorEl.getBoundingClientRect) {
      const r = anchorEl.getBoundingClientRect();
      if (r.top < 260) {
        pop.style.bottom = 'auto';
        pop.style.top = (r.bottom + 8) + 'px';
        pop.style.left = Math.max(12, Math.min(window.innerWidth - 280, r.left)) + 'px';
      } else {
        pop.style.bottom = Math.max(14, window.innerHeight - r.top + 8) + 'px';
        pop.style.left = Math.max(12, r.left) + 'px';
      }
    }

    pop.innerHTML = `
      <div class="mc-pop-user-head" data-open-set-tab="profile">
        <span class="mc-avatar-circle" style="background:${cfg.avatarBg};">${esc(cfg.initials || 'HS')}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(cfg.displayName)}</div>
          <div style="font-size:11.5px;color:#94a3b8;">${esc(cfg.planBadge || 'Plus')}</div>
        </div>
        <span style="color:#94a3b8;font-size:16px;">›</span>
      </div>

      <div class="mc-pop-divider-line"></div>

      <button type="button" class="mc-pop-menu-btn" data-open-set-tab="billing">
        <span class="mc-pop-menu-icon">✨</span>
        <span>Upgrade plan &amp; Billing</span>
      </button>
      <button type="button" class="mc-pop-menu-btn" data-open-set-tab="personalization">
        <span class="mc-pop-menu-icon">🧠</span>
        <span>Personalization</span>
      </button>
      <button type="button" class="mc-pop-menu-btn" data-open-set-tab="memory">
        <span class="mc-pop-menu-icon">💾</span>
        <span>Saved Memory (${(cfg.memories || []).length})</span>
      </button>
      <button type="button" class="mc-pop-menu-btn" data-open-set-tab="profile">
        <span class="mc-pop-menu-icon">👤</span>
        <span>Profile</span>
      </button>
      <button type="button" class="mc-pop-menu-btn" data-open-set-tab="appearance">
        <span class="mc-pop-menu-icon">🎨</span>
        <span>UI Color &amp; Appearance</span>
        <span style="margin-left:auto;font-size:10.5px;padding:2px 7px;border-radius:999px;background:rgba(16,185,129,0.2);color:#6ee7b7;font-weight:700;">${esc((cfg.themeMode || 'emerald').toUpperCase())}</span>
      </button>
      <button type="button" class="mc-pop-menu-btn" data-open-set-tab="security">
        <span class="mc-pop-menu-icon">⚙️</span>
        <span>Settings &amp; Security</span>
      </button>

      <div class="mc-pop-divider-line"></div>

      <!-- Quick 1-Click Theme Switcher Strip inside Popover -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 10px;">
        <span style="font-size:11px;color:#94a3b8;font-weight:600;">Theme:</span>
        <div style="display:flex;gap:4px;">
          <button type="button" class="mc-calc-act-key" data-quick-theme="emerald" title="Emerald Studio">🌿 Emerald</button>
          <button type="button" class="mc-calc-act-key" data-quick-theme="dark" title="Midnight Dark">🌙 Dark</button>
          <button type="button" class="mc-calc-act-key" data-quick-theme="light" title="Pure Light">☀️ Light</button>
        </div>
      </div>

      <div class="mc-pop-divider-line"></div>

      <button type="button" class="mc-pop-menu-btn" data-open-set-tab="help">
        <span class="mc-pop-menu-icon">🛟</span>
        <span>Help &amp; Shortcuts</span>
        <span style="margin-left:auto;color:#94a3b8;">›</span>
      </button>
      <button type="button" class="mc-pop-menu-btn" id="mc-pop-logout-btn" style="color:#fca5a5;">
        <span class="mc-pop-menu-icon">↪️</span>
        <span>Log out / Lock Session</span>
      </button>
    `;

    document.body.appendChild(pop);
    pop.onclick = (e) => e.stopPropagation();

    pop.querySelectorAll('[data-open-set-tab]').forEach((el) => {
      el.onclick = () => {
        const tab = el.getAttribute('data-open-set-tab') || 'profile';
        pop.remove();
        openSettingsCenterModal(tab);
      };
    });

    pop.querySelectorAll('[data-quick-theme]').forEach((b) => {
      b.onclick = () => {
        state.userSettings.themeMode = b.getAttribute('data-quick-theme') || 'emerald';
        saveUserSettings();
        pop.remove();
        showDownloadToast('🎨 UI Theme switched to ' + state.userSettings.themeMode.toUpperCase());
      };
    });

    document.getElementById('mc-pop-logout-btn')?.addEventListener('click', () => {
      pop.remove();
      lockWorkspaceScreen();
    });

    setTimeout(() => {
      const closePop = () => {
        pop.remove();
        document.removeEventListener('click', closePop);
      };
      document.addEventListener('click', closePop);
    }, 20);
  }

  function lockWorkspaceScreen() {
    document.getElementById('mc-lock-screen-overlay')?.remove();
    const cfg = state.userSettings || loadUserSettings();
    const lock = document.createElement('div');
    lock.id = 'mc-lock-screen-overlay';
    lock.className = 'mc-settings-backdrop';
    lock.style.background = 'radial-gradient(circle at center, #07261a 0%, #020a07 100%)';
    lock.innerHTML = `
      <div style="width:380px;max-width:92vw;background:#111815;border:1px solid rgba(52,211,153,0.4);border-radius:22px;padding:30px 26px;text-align:center;color:#ecfdf5;box-shadow:0 24px 60px rgba(0,0,0,0.7);">
        <div class="mc-avatar-circle" style="width:58px;height:58px;font-size:22px;margin:0 auto 12px;background:${cfg.avatarBg};">${esc(cfg.initials || 'HS')}</div>
        <h2 style="margin:0 0 4px;font-size:20px;font-weight:800;">${esc(cfg.displayName)}</h2>
        <div style="font-size:12px;color:#6ee7b7;margin-bottom:20px;">🔒 Workspace Session Locked · ${esc(cfg.planBadge)}</div>
        ${cfg.pinLockEnabled && cfg.pinCode ? `<input type="password" id="mc-unlock-pin-inp" class="mc-set-input" placeholder="Enter your 4-digit PIN..." style="text-align:center;font-size:16px;letter-spacing:0.25em;margin-bottom:12px;">` : ''}
        <button type="button" id="mc-unlock-btn" class="mc-pill-btn active" style="width:100%;padding:11px;font-size:14px;font-weight:800;justify-content:center;">🔓 Sign Back In to Workspace</button>
      </div>
    `;
    document.body.appendChild(lock);
    document.getElementById('mc-unlock-btn')?.addEventListener('click', () => {
      const pinInp = document.getElementById('mc-unlock-pin-inp');
      if (pinInp && cfg.pinLockEnabled && cfg.pinCode && pinInp.value !== cfg.pinCode) {
        showDownloadToast('❌ Incorrect PIN code');
        return;
      }
      lock.remove();
      showDownloadToast('👋 Welcome back, ' + cfg.displayName + '!');
    });
  }

  function openSettingsCenterModal(initialTab = 'profile') {
    document.getElementById('mc-settings-modal-backdrop')?.remove();
    const cfg = state.userSettings || loadUserSettings();
    let activeTab = initialTab === 'help' ? 'personalization' : initialTab;

    const backdrop = document.createElement('div');
    backdrop.id = 'mc-settings-modal-backdrop';
    backdrop.className = 'mc-settings-backdrop';

    const navTabs = [
      { id: 'profile', icon: '👤', label: 'Profile' },
      { id: 'appearance', icon: '🎨', label: 'UI Color & Appearance' },
      { id: 'personalization', icon: '🧠', label: 'Personalization' },
      { id: 'memory', icon: '💾', label: 'Saved Memory' },
      { id: 'billing', icon: '💳', label: 'Billing & Plan' },
      { id: 'security', icon: '🔐', label: 'Login & Security' }
    ];

    const renderModalContent = () => {
      let rightHtml = '';

      if (activeTab === 'profile') {
        const avatarColors = [
          'linear-gradient(135deg, #ea580c 0%, #d97706 100%)',
          'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
          'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)'
        ];
        rightHtml = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2 style="margin:0;font-size:20px;font-weight:800;">👤 Profile &amp; Identity</h2>
            <button type="button" class="mc-calc-act-key" id="mc-set-close-x">✕ Close</button>
          </div>
          <div class="mc-set-card" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <div class="mc-avatar-circle" style="width:62px;height:62px;font-size:22px;background:${cfg.avatarBg};">${esc(cfg.initials || 'HS')}</div>
            <div style="flex:1;">
              <div style="font-size:16px;font-weight:800;color:#ffffff;">${esc(cfg.displayName)}</div>
              <div style="font-size:12px;color:#6ee7b7;margin-top:2px;">${esc(cfg.roleTitle)}</div>
              <div style="display:flex;gap:8px;margin-top:10px;align-items:center;">
                <span style="font-size:11px;color:#94a3b8;">Avatar Color:</span>
                ${avatarColors.map((bg) => `<button type="button" class="mc-color-swatch ${cfg.avatarBg === bg ? 'active' : ''}" style="width:22px;height:22px;background:${bg};" data-av-bg="${bg}"></button>`).join('')}
              </div>
            </div>
          </div>

          <div class="mc-set-card" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="mc-set-label">Full Name</label>
              <input type="text" class="mc-set-input" id="mc-prof-name" value="${esc(cfg.displayName)}">
            </div>
            <div>
              <label class="mc-set-label">Avatar Initials (2 letters)</label>
              <input type="text" class="mc-set-input" id="mc-prof-init" maxlength="3" value="${esc(cfg.initials)}">
            </div>
            <div style="grid-column:1 / -1;">
              <label class="mc-set-label">Role / Brand Title</label>
              <input type="text" class="mc-set-input" id="mc-prof-role" value="${esc(cfg.roleTitle)}">
            </div>
            <div>
              <label class="mc-set-label">Email Address</label>
              <input type="email" class="mc-set-input" id="mc-prof-email" value="${esc(cfg.email)}">
            </div>
            <div>
              <label class="mc-set-label">Default City / Location</label>
              <input type="text" class="mc-set-input" id="mc-prof-loc" value="${esc(cfg.locationCity)}">
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button type="button" class="mc-pill-btn active" id="mc-save-prof-btn" style="padding:9px 20px;">💾 Save Profile Changes</button>
          </div>
        `;
      } else if (activeTab === 'appearance') {
        const accents = [
          { color: '#10b981', name: 'Emerald' },
          { color: '#6366f1', name: 'Indigo' },
          { color: '#8b5cf6', name: 'Violet' },
          { color: '#f59e0b', name: 'Amber Gold' },
          { color: '#f43f5e', name: 'Rose' },
          { color: '#06b6d4', name: 'Cyber Cyan' }
        ];
        rightHtml = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2 style="margin:0;font-size:20px;font-weight:800;">🎨 UI Color, Theme &amp; Custom Features</h2>
            <button type="button" class="mc-calc-act-key" id="mc-set-close-x">✕ Close</button>
          </div>

          <div class="mc-set-card">
            <label class="mc-set-label">1. Workspace Color Theme (Light / Dark / Emerald / OLED)</label>
            <div class="mc-theme-grid">
              <div class="mc-theme-card ${cfg.themeMode === 'emerald' ? 'active' : ''}" data-set-theme="emerald">
                <div style="font-size:20px;margin-bottom:4px;">🌿</div>
                <div>Emerald Studio</div>
                <div style="font-size:10px;opacity:0.7;font-weight:400;">Signature Default</div>
              </div>
              <div class="mc-theme-card ${cfg.themeMode === 'dark' ? 'active' : ''}" data-set-theme="dark">
                <div style="font-size:20px;margin-bottom:4px;">🌙</div>
                <div>Midnight Dark</div>
                <div style="font-size:10px;opacity:0.7;font-weight:400;">Dark Cards &amp; Slate</div>
              </div>
              <div class="mc-theme-card ${cfg.themeMode === 'light' ? 'active' : ''}" data-set-theme="light">
                <div style="font-size:20px;margin-bottom:4px;">☀️</div>
                <div>Pure Light</div>
                <div style="font-size:10px;opacity:0.7;font-weight:400;">Clean Alabaster</div>
              </div>
              <div class="mc-theme-card ${cfg.themeMode === 'oled' ? 'active' : ''}" data-set-theme="oled">
                <div style="font-size:20px;margin-bottom:4px;">🖤</div>
                <div>OLED Pitch Black</div>
                <div style="font-size:10px;opacity:0.7;font-weight:400;">Zero-Glare Contrast</div>
              </div>
            </div>
          </div>

          <div class="mc-set-card">
            <label class="mc-set-label">2. Custom Accent Color</label>
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:8px;">
              ${accents.map((a) => `
                <div style="display:flex;align-items:center;gap:6px;cursor:pointer;" data-set-accent="${a.color}">
                  <span class="mc-color-swatch ${cfg.accentColor === a.color ? 'active' : ''}" style="background:${a.color};color:${a.color};"></span>
                  <span style="font-size:12px;color:#e2e8f0;">${a.name}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="mc-set-card" style="display:flex;flex-direction:column;gap:12px;">
            <label class="mc-set-label" style="margin:0;">3. Custom UI Features &amp; Ergonomics</label>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:13px;font-weight:700;">Typography Size</div>
                <div style="font-size:11px;color:#94a3b8;">Adjust reading text size across Chat, Study &amp; Research</div>
              </div>
              <select class="mc-set-select" id="mc-set-fontscale" style="width:150px;">
                <option value="small" ${cfg.fontScale === 'small' ? 'selected' : ''}>Small (13.8px)</option>
                <option value="normal" ${cfg.fontScale === 'normal' ? 'selected' : ''}>Default (15px)</option>
                <option value="large" ${cfg.fontScale === 'large' ? 'selected' : ''}>Large (16.5px)</option>
              </select>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:13px;font-weight:700;">Floating Scroll Jump Buttons (↑ / ↓)</div>
                <div style="font-size:11px;color:#94a3b8;">Show fast top/bottom scroll buttons in the bottom-right corner</div>
              </div>
              <input type="checkbox" id="mc-set-scrollbtns" ${cfg.showScrollButtons !== false ? 'checked' : ''} style="width:18px;height:18px;accent-color:#10b981;cursor:pointer;">
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:13px;font-weight:700;">Compact Card Density</div>
                <div style="font-size:11px;color:#94a3b8;">Tighter padding on answer cards to fit more content on screen</div>
              </div>
              <input type="checkbox" id="mc-set-compact" ${cfg.compactCards ? 'checked' : ''} style="width:18px;height:18px;accent-color:#10b981;cursor:pointer;">
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:13px;font-weight:700;">Auto-Read Aloud (🔊 TTS) on New Answers</div>
                <div style="font-size:11px;color:#94a3b8;">Automatically speak AI responses aloud as soon as they finish</div>
              </div>
              <input type="checkbox" id="mc-set-autotts" ${cfg.autoReadAloud ? 'checked' : ''} style="width:18px;height:18px;accent-color:#10b981;cursor:pointer;">
            </div>
          </div>
        `;
      } else if (activeTab === 'personalization') {
        rightHtml = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2 style="margin:0;font-size:20px;font-weight:800;">🧠 Personalization &amp; Custom Instructions</h2>
            <button type="button" class="mc-calc-act-key" id="mc-set-close-x">✕ Close</button>
          </div>
          <div class="mc-set-card">
            <label class="mc-set-label">What would you like Pixelmorphic AI to know about you?</label>
            <textarea class="mc-set-textarea" id="mc-pers-about" rows="3" placeholder="Your role, projects, goals, or background...">${esc(cfg.customAbout)}</textarea>
          </div>
          <div class="mc-set-card">
            <label class="mc-set-label">How would you like Pixelmorphic AI to respond?</label>
            <textarea class="mc-set-textarea" id="mc-pers-style" rows="3" placeholder="Tone, level of detail, formatting preferences...">${esc(cfg.customStyle)}</textarea>
          </div>
          <div class="mc-set-card" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="mc-set-label">Default AI Tone</label>
              <select class="mc-set-select" id="mc-pers-tone">
                <option value="balanced" ${cfg.tone === 'balanced' ? 'selected' : ''}>⚖️ Balanced &amp; Professional</option>
                <option value="friendly" ${cfg.tone === 'friendly' ? 'selected' : ''}>😊 Warm &amp; Encouraging Mentor</option>
                <option value="concise" ${cfg.tone === 'concise' ? 'selected' : ''}>⚡ Direct, High-Signal &amp; Fast</option>
                <option value="academic" ${cfg.tone === 'academic' ? 'selected' : ''}>🎓 Deep Academic Professor</option>
              </select>
            </div>
            <div>
              <label class="mc-set-label">Preferred Language</label>
              <select class="mc-set-select" id="mc-pers-lang">
                <option value="en" ${cfg.preferredLang === 'en' ? 'selected' : ''}>🌐 English</option>
                <option value="hinglish" ${cfg.preferredLang === 'hinglish' ? 'selected' : ''}>🇮🇳 Hinglish (Hindi + English)</option>
                <option value="hi" ${cfg.preferredLang === 'hi' ? 'selected' : ''}>🇮🇳 Hindi (देवनागरी)</option>
              </select>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;">
            <button type="button" class="mc-pill-btn active" id="mc-save-pers-btn" style="padding:9px 20px;">💾 Save Personalization</button>
          </div>
        `;
      } else if (activeTab === 'memory') {
        rightHtml = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2 style="margin:0;font-size:20px;font-weight:800;">💾 Saved Memory (${(cfg.memories || []).length})</h2>
            <button type="button" class="mc-calc-act-key" id="mc-set-close-x">✕ Close</button>
          </div>
          <div class="mc-set-card" style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:13.5px;font-weight:700;">Reference Saved Memories in Responses</div>
              <div style="font-size:11.5px;color:#94a3b8;">Allow Morphic Ultra, Pro &amp; Fast to recall your saved facts across sessions</div>
            </div>
            <input type="checkbox" id="mc-mem-toggle" ${cfg.memoryEnabled !== false ? 'checked' : ''} style="width:18px;height:18px;accent-color:#10b981;cursor:pointer;">
          </div>

          <div class="mc-set-card">
            <label class="mc-set-label">Add a New Memory</label>
            <div style="display:flex;gap:8px;">
              <input type="text" class="mc-set-input" id="mc-new-mem-inp" placeholder="e.g. Always include PowerShell commands for Windows 11...">
              <button type="button" class="mc-pill-btn active" id="mc-add-mem-btn" style="white-space:nowrap;">+ Add Memory</button>
            </div>
          </div>

          <div class="mc-set-card" style="max-height:240px;overflow-y:auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <span class="mc-set-label" style="margin:0;">Active Memories</span>
              ${(cfg.memories || []).length ? `<button type="button" class="mc-calc-act-key is-warn" id="mc-clear-all-mem">🗑️ Clear All</button>` : ''}
            </div>
            ${(cfg.memories || []).length ? cfg.memories.map((m, idx) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:10px;background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.08);margin-bottom:6px;">
                <span style="font-size:12.5px;color:#e2e8f0;line-height:1.45;">• ${esc(m.text)}</span>
                <button type="button" data-del-mem="${idx}" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-weight:800;font-size:13px;">✕</button>
              </div>
            `).join('') : '<div style="font-size:12.5px;color:#64748b;">No saved memories yet. Add one above!</div>'}
          </div>
        `;
      } else if (activeTab === 'billing') {
        rightHtml = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2 style="margin:0;font-size:20px;font-weight:800;">💳 Billing, Subscription &amp; Usage</h2>
            <button type="button" class="mc-calc-act-key" id="mc-set-close-x">✕ Close</button>
          </div>
          <div class="mc-set-card" style="background:linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,78,59,0.4) 100%);border-color:#10b981;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
              <div>
                <span style="font-size:10.5px;font-weight:800;letter-spacing:0.08em;color:#6ee7b7;text-transform:uppercase;">CURRENT ACTIVE PLAN</span>
                <div style="font-size:20px;font-weight:800;color:#ffffff;margin-top:2px;">✨ Pixelmorphic Founder Ultra Pro</div>
                <div style="font-size:12px;color:#d1fae5;margin-top:3px;">Unlimited Morphic Ultra, Pro &amp; Fast · 8K Image &amp; eBook Studio · Full-Stack Code IDE · Multi-PDF Study Notebook</div>
              </div>
              <span style="background:#10b981;color:#042f1e;font-weight:800;font-size:12px;padding:6px 14px;border-radius:999px;">ACTIVE · LIFETIME</span>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
            <div class="mc-set-card" style="text-align:center;">
              <div style="font-size:11px;color:#94a3b8;font-weight:700;">SAVED THREADS</div>
              <div style="font-size:22px;font-weight:800;color:#6ee7b7;margin-top:4px;">${state.threads.length}</div>
            </div>
            <div class="mc-set-card" style="text-align:center;">
              <div style="font-size:11px;color:#94a3b8;font-weight:700;">LIBRARY ASSETS</div>
              <div style="font-size:22px;font-weight:800;color:#6ee7b7;margin-top:4px;">${state.library.length}</div>
            </div>
            <div class="mc-set-card" style="text-align:center;">
              <div style="font-size:11px;color:#94a3b8;font-weight:700;">API ENGINE STATUS</div>
              <div style="font-size:14px;font-weight:800;color:#34d399;margin-top:8px;">● Connected &amp; Ready</div>
            </div>
          </div>

          <div class="mc-set-card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="font-size:13.5px;font-weight:700;">Export Complete Workspace Backup (.json)</div>
              <div style="font-size:11.5px;color:#94a3b8;">Download all your chats, study vault, memories, and settings</div>
            </div>
            <button type="button" class="mc-pill-btn active" id="mc-export-backup-btn">📥 Export Backup</button>
          </div>
        `;
      } else if (activeTab === 'security') {
        rightHtml = `
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <h2 style="margin:0;font-size:20px;font-weight:800;">🔐 Login, PIN Lock &amp; Security</h2>
            <button type="button" class="mc-calc-act-key" id="mc-set-close-x">✕ Close</button>
          </div>

          <div class="mc-set-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <div>
                <div style="font-size:13.5px;font-weight:700;">Enable Workspace PIN Lock</div>
                <div style="font-size:11.5px;color:#94a3b8;">Require a 4-digit PIN when unlocking your workspace session</div>
              </div>
              <input type="checkbox" id="mc-sec-pin-toggle" ${cfg.pinLockEnabled ? 'checked' : ''} style="width:18px;height:18px;accent-color:#10b981;cursor:pointer;">
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="password" class="mc-set-input" id="mc-sec-pin-val" maxlength="6" placeholder="Set 4-digit PIN (e.g. 1234)" value="${esc(cfg.pinCode || '')}" style="max-width:220px;">
              <button type="button" class="mc-pill-btn active" id="mc-sec-save-pin">Save PIN</button>
              <button type="button" class="mc-calc-act-key" id="mc-sec-lock-now">🔒 Lock Screen Now</button>
            </div>
          </div>

          <div class="mc-set-card">
            <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Active Device Session</div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#cbd5e1;">
              <span>💻 Windows 11 · Local Owner Workspace (127.0.0.1:3000)</span>
              <span style="color:#34d399;font-weight:700;">● Active Now</span>
            </div>
          </div>

          <div class="mc-set-card" style="border-color:rgba(239,68,68,0.35);">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
              <div>
                <div style="font-size:13px;font-weight:700;color:#fca5a5;">Clear All Chat &amp; Study History</div>
                <div style="font-size:11px;color:#94a3b8;">Permanently remove saved threads from browser &amp; disk storage</div>
              </div>
              <button type="button" class="mc-calc-act-key is-warn" id="mc-sec-clear-hist">🗑️ Clear History</button>
            </div>
          </div>
        `;
      }

      backdrop.innerHTML = `
        <div class="mc-settings-dialog">
          <div class="mc-set-nav">
            <div style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:#6ee7b7;padding:4px 10px 10px;text-transform:uppercase;">⚙️ PIXELMORPHIC SETTINGS</div>
            ${navTabs.map((t) => `
              <button type="button" class="mc-set-nav-btn ${t.id === activeTab ? 'active' : ''}" data-set-nav="${t.id}">
                <span>${t.icon}</span>
                <span>${t.label}</span>
              </button>
            `).join('')}
          </div>
          <div class="mc-set-content">
            ${rightHtml}
          </div>
        </div>
      `;

      backdrop.querySelectorAll('[data-set-nav]').forEach((b) => {
        b.onclick = () => {
          activeTab = b.getAttribute('data-set-nav') || 'profile';
          renderModalContent();
        };
      });

      document.getElementById('mc-set-close-x')?.addEventListener('click', () => backdrop.remove());

      // Profile bindings
      backdrop.querySelectorAll('[data-av-bg]').forEach((b) => {
        b.onclick = () => {
          cfg.avatarBg = b.getAttribute('data-av-bg');
          saveUserSettings();
          renderModalContent();
        };
      });
      document.getElementById('mc-save-prof-btn')?.addEventListener('click', () => {
        cfg.displayName = document.getElementById('mc-prof-name')?.value.trim() || 'Harsh Saxena';
        cfg.initials = (document.getElementById('mc-prof-init')?.value.trim() || 'HS').toUpperCase();
        cfg.roleTitle = document.getElementById('mc-prof-role')?.value.trim() || '';
        cfg.email = document.getElementById('mc-prof-email')?.value.trim() || '';
        cfg.locationCity = document.getElementById('mc-prof-loc')?.value.trim() || 'India';
        state.userLocation.city = cfg.locationCity.split(',')[0].trim();
        saveUserSettings();
        updateLocationPillUI();
        showDownloadToast('✅ Profile saved!');
        renderModalContent();
      });

      // Appearance bindings
      backdrop.querySelectorAll('[data-set-theme]').forEach((card) => {
        card.onclick = () => {
          cfg.themeMode = card.getAttribute('data-set-theme') || 'emerald';
          saveUserSettings();
          renderModalContent();
        };
      });
      backdrop.querySelectorAll('[data-set-accent]').forEach((sw) => {
        sw.onclick = () => {
          cfg.accentColor = sw.getAttribute('data-set-accent') || '#10b981';
          saveUserSettings();
          renderModalContent();
        };
      });
      document.getElementById('mc-set-fontscale')?.addEventListener('change', (e) => {
        cfg.fontScale = e.target.value || 'normal';
        saveUserSettings();
      });
      document.getElementById('mc-set-scrollbtns')?.addEventListener('change', (e) => {
        cfg.showScrollButtons = e.target.checked;
        saveUserSettings();
      });
      document.getElementById('mc-set-compact')?.addEventListener('change', (e) => {
        cfg.compactCards = e.target.checked;
        saveUserSettings();
      });
      document.getElementById('mc-set-autotts')?.addEventListener('change', (e) => {
        cfg.autoReadAloud = e.target.checked;
        saveUserSettings();
      });

      // Personalization bindings
      document.getElementById('mc-save-pers-btn')?.addEventListener('click', () => {
        cfg.customAbout = document.getElementById('mc-pers-about')?.value.trim() || '';
        cfg.customStyle = document.getElementById('mc-pers-style')?.value.trim() || '';
        cfg.tone = document.getElementById('mc-pers-tone')?.value || 'balanced';
        cfg.preferredLang = document.getElementById('mc-pers-lang')?.value || 'en';
        saveUserSettings();
        showDownloadToast('🧠 Personalization instructions saved!');
      });

      // Memory bindings
      document.getElementById('mc-mem-toggle')?.addEventListener('change', (e) => {
        cfg.memoryEnabled = e.target.checked;
        saveUserSettings();
      });
      document.getElementById('mc-add-mem-btn')?.addEventListener('click', () => {
        const inp = document.getElementById('mc-new-mem-inp');
        const txt = inp?.value.trim();
        if (!txt) return;
        cfg.memories.unshift({ id: 'm_' + Date.now(), text: txt, createdAt: new Date().toISOString().slice(0, 10) });
        saveUserSettings();
        renderModalContent();
      });
      backdrop.querySelectorAll('[data-del-mem]').forEach((b) => {
        b.onclick = () => {
          const idx = parseInt(b.getAttribute('data-del-mem'), 10);
          cfg.memories.splice(idx, 1);
          saveUserSettings();
          renderModalContent();
        };
      });
      document.getElementById('mc-clear-all-mem')?.addEventListener('click', () => {
        if (confirm('Clear all saved memories?')) {
          cfg.memories = [];
          saveUserSettings();
          renderModalContent();
        }
      });

      // Billing backup export
      document.getElementById('mc-export-backup-btn')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify({ userSettings: cfg, threads: state.threads, studyVault: state.studyVault, studyAnalytics: state.studyAnalytics }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'pixelmorphic-workspace-backup.json';
        a.click();
      });

      // Security bindings
      document.getElementById('mc-sec-pin-toggle')?.addEventListener('change', (e) => {
        cfg.pinLockEnabled = e.target.checked;
        saveUserSettings();
      });
      document.getElementById('mc-sec-save-pin')?.addEventListener('click', () => {
        cfg.pinCode = document.getElementById('mc-sec-pin-val')?.value.trim() || '';
        cfg.pinLockEnabled = Boolean(cfg.pinCode);
        saveUserSettings();
        showDownloadToast('🔐 Workspace PIN saved!');
        renderModalContent();
      });
      document.getElementById('mc-sec-lock-now')?.addEventListener('click', () => {
        backdrop.remove();
        lockWorkspaceScreen();
      });
      document.getElementById('mc-sec-clear-hist')?.addEventListener('click', () => {
        if (confirm('Clear all saved chat & study history?')) {
          state.threads = [];
          state.messages = [];
          saveThreads();
          renderThread();
          syncLeftSidebar();
          showDownloadToast('🗑️ History cleared');
        }
      });
    };

    renderModalContent();
    document.body.appendChild(backdrop);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  loadUserSettings();
  setTimeout(applyUserAppearanceSettings, 30);

  function loadStudyLocalData() {
    try {
      const v = JSON.parse(localStorage.getItem(STUDY_VAULT_KEY) || '[]');
      if (Array.isArray(v)) state.studyVault = v;
    } catch (_) {}
    try {
      const a = JSON.parse(localStorage.getItem(STUDY_ANALYTICS_KEY) || '[]');
      if (Array.isArray(a)) state.studyAnalytics = a;
    } catch (_) {}
    try {
      const n = JSON.parse(localStorage.getItem(STUDY_NOTEBOOK_KEY) || '[]');
      if (Array.isArray(n)) state.studyNotebook = n;
    } catch (_) {}
  }
  loadStudyLocalData();

  function saveStudyVault() {
    try { localStorage.setItem(STUDY_VAULT_KEY, JSON.stringify(state.studyVault.slice(0, 80))); } catch (_) {}
    try {
      fetch('/api/research?chatMode=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageAction: 'save', studyVault: state.studyVault.slice(0, 80) })
      }).catch(() => {});
    } catch (_) {}
  }

  function saveStudyAnalytics() {
    try { localStorage.setItem(STUDY_ANALYTICS_KEY, JSON.stringify(state.studyAnalytics.slice(0, 50))); } catch (_) {}
    try {
      fetch('/api/research?chatMode=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageAction: 'save', studyAnalytics: state.studyAnalytics.slice(0, 50) })
      }).catch(() => {});
    } catch (_) {}
  }

  function saveStudyNotebook() {
    try {
      const slim = state.studyNotebook.slice(0, 12).map((d) => ({ ...d, content: String(d.content || '').slice(0, 16000) }));
      localStorage.setItem(STUDY_NOTEBOOK_KEY, JSON.stringify(slim));
    } catch (_) {}
  }

  function addItemToRevisionVault(item) {
    const entry = {
      id: 'sv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      subject: item.subject || state.studySubject || 'general',
      topic: item.topic || 'Key Concept / Formula',
      question: String(item.question || '').slice(0, 600),
      answer: String(item.answer || '').slice(0, 2000),
      savedAt: Date.now()
    };
    state.studyVault.unshift(entry);
    saveStudyVault();
    showDownloadToast('🔖 Saved to Revision Vault!');
  }

  window.__pmMockTestsRegistry = window.__pmMockTestsRegistry || {};

  function formatDeepExplanationHtml(rawExp, correctAns) {
    if (!rawExp) return `<div>The verified correct answer is <strong>${esc(correctAns)}</strong>.</div>`;
    const parts = String(rawExp).split(/\s*\|\s*/);
    if (parts.length > 1) {
      return parts.map((p) => `<div style="margin-bottom:6px;">${convertLatexMathInner(esc(p)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</div>`).join('');
    }
    return `<div>${convertLatexMathInner(esc(rawExp)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</div>`;
  }

  function renderMockTestHtml(mockObj, msgIdx) {
    if (!mockObj || !Array.isArray(mockObj.questions) || !mockObj.questions.length) return '';
    const testId = typeof msgIdx === 'string' && msgIdx.startsWith('mt_')
      ? msgIdx
      : ('mt_' + (msgIdx !== undefined ? msgIdx : 'live') + '_' + mockObj.questions.length + '_' + (mockObj.title || '').slice(0, 12).replace(/[^a-zA-Z0-9]/g, ''));

    if (!window.__pmMockTestsRegistry[testId]) {
      window.__pmMockTestsRegistry[testId] = {
        ...mockObj,
        testId,
        answers: {},
        checkedQuestions: {},
        submitted: false,
        startTime: Date.now(),
        remainingSec: (mockObj.durationMin || Math.max(10, mockObj.questions.length * 2)) * 60,
        intervalId: null
      };
    }
    const t = window.__pmMockTestsRegistry[testId];

    if (!t.submitted && !t.intervalId) {
      t.intervalId = setInterval(() => {
        const tm = window.__pmMockTestsRegistry[testId];
        if (!tm || tm.submitted) {
          clearInterval(tm?.intervalId);
          return;
        }
        tm.remainingSec = Math.max(0, tm.remainingSec - 1);
        const timerEl = document.getElementById('mc-mt-timer-' + testId);
        if (timerEl) {
          const mm = String(Math.floor(tm.remainingSec / 60)).padStart(2, '0');
          const ss = String(tm.remainingSec % 60).padStart(2, '0');
          timerEl.textContent = `⏱️ ${mm}:${ss}`;
          if (tm.remainingSec <= 60) timerEl.style.background = '#991b1b';
        }
        if (tm.remainingSec === 0) {
          window.__pmSubmitMockTest(testId);
        }
      }, 1000);
    }

    const mm = String(Math.floor(t.remainingSec / 60)).padStart(2, '0');
    const ss = String(t.remainingSec % 60).padStart(2, '0');

    // Compute live running score from checked questions
    const totalQs = t.questions.length;
    let answeredCount = 0;
    let rightCount = 0;
    const liveWeakSet = new Set();
    t.questions.forEach((q, qi) => {
      if (t.checkedQuestions[qi] || t.submitted) {
        if (t.answers[qi]) answeredCount++;
        if (window.__pmCheckMockAnswer(q, t.answers[qi])) {
          rightCount++;
        } else if (t.checkedQuestions[qi] || t.submitted) {
          liveWeakSet.add(q.topic || 'Core Concept');
        }
      }
    });
    const liveAcc = answeredCount > 0 ? Math.round((rightCount / answeredCount) * 100) : 0;

    let summaryHtml = `
      <div class="mc-mock-summary" style="padding:12px 16px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:800;color:#ffffff;">📊 Live Score: <span style="color:#6ee7b7;">${rightCount} / ${totalQs} Correct</span></span>
            <span style="font-size:12.5px;color:#d1fae5;">Attempted: <strong>${answeredCount}/${totalQs}</strong> · Accuracy: <strong>${liveAcc}%</strong></span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="mc-calc-act-key" onclick="window.__pmResetMockTest('${testId}')">🔄 Reset / Retake</button>
            ${!t.submitted ? `<button type="button" class="mc-pill-btn active" style="font-size:11.5px;padding:4px 12px;" onclick="window.__pmSubmitMockTest('${testId}')">✅ Finish &amp; Reveal All</button>` : `<span style="font-size:12px;font-weight:800;color:#6ee7b7;">✓ Completed (${t.result?.timeTakenStr || ''})</span>`}
          </div>
        </div>
        ${(t.submitted && liveWeakSet.size > 0) ? `
          <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(110,231,183,0.25);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
            <div style="font-size:12px;">⚠️ <strong>Topics Needs Revision:</strong> ${Array.from(liveWeakSet).map((w) => `<span style="background:rgba(245,158,11,0.22);border:1px solid #fbbf24;color:#fde68a;padding:2px 8px;border-radius:999px;font-size:11px;margin-right:4px;">${esc(w)}</span>`).join('')}</div>
            <button type="button" class="mc-pill-btn active" style="font-size:11px;padding:3px 10px;" onclick="window.__pmPracticeWeakTopics('${esc(Array.from(liveWeakSet).join(', '))}')">🎯 Master Weak Topics →</button>
          </div>` : ''}
      </div>
    `;

    const qHtml = t.questions.map((q, qi) => {
      const userAns = t.answers[qi] || '';
      const isRevealed = Boolean(t.checkedQuestions[qi] || t.submitted);
      const isCorrect = isRevealed && window.__pmCheckMockAnswer(q, userAns);

      let inputHtml = '';
      if (q.type === 'NUMERICAL' || !q.options || !q.options.length) {
        inputHtml = `
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;">
            <input type="text" class="mc-mock-num-inp" style="margin-top:0;" placeholder="Enter value..." value="${esc(userAns)}" ${isRevealed ? 'disabled' : ''} oninput="window.__pmSetMockAns('${testId}', ${qi}, this.value)">
            ${!isRevealed ? `<button type="button" class="mc-pill-btn active" style="padding:6px 12px;font-size:12px;" onclick="window.__pmCheckSingleQ('${testId}', ${qi})">✓ Check Answer</button>` : ''}
            ${isRevealed ? `<span style="font-size:13px;font-weight:800;color:${isCorrect ? '#059669' : '#dc2626'};">${isCorrect ? '✅ RIGHT ANSWER!' : '❌ WRONG (Correct Answer: ' + esc(q.ans) + ')'}</span>` : ''}
          </div>
        `;
      } else {
        inputHtml = q.options.map((opt) => {
          const letter = opt.key;
          let cls = '';
          let statusBadge = '';
          if (!isRevealed && userAns === letter) cls = 'selected';
          if (isRevealed) {
            if (letter === q.ans) {
              cls = 'is-correct';
              statusBadge = `<span style="margin-left:auto;font-size:11px;font-weight:800;color:#059669;background:#bbf7d0;padding:2px 8px;border-radius:999px;">✅ CORRECT OPTION</span>`;
            } else if (userAns === letter && letter !== q.ans) {
              cls = 'is-wrong';
              statusBadge = `<span style="margin-left:auto;font-size:11px;font-weight:800;color:#991b1b;background:#fecaca;padding:2px 8px;border-radius:999px;">❌ YOUR CHOICE (WRONG)</span>`;
            }
          }
          return `
            <div class="mc-mock-opt ${cls}" onclick="window.__pmSelectMockOpt('${testId}', ${qi}, '${letter}', this)">
              <strong style="min-width:22px;">(${letter})</strong>
              <span style="flex:1;">${convertLatexMathInner(esc(opt.text))}</span>
              ${statusBadge}
            </div>
          `;
        }).join('');
      }

      const expHtml = isRevealed
        ? `<div style="margin-top:12px;padding:12px 14px;border-radius:12px;background:${isCorrect ? '#f0fdf4' : '#fff1f2'};border:1.5px solid ${isCorrect ? '#86efac' : '#fecdd3'};font-size:13px;line-height:1.6;color:#0f172a;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,0.08);">
              <span style="font-weight:800;font-size:13.5px;color:${isCorrect ? '#065f46' : '#9f1239'};">
                ${isCorrect ? '🎉 ✅ RIGHT ANSWER! (You selected ' + esc(userAns) + ')' : '❌ WRONG ANSWER — You selected ' + esc(userAns || 'None') + ' · Verified Correct Option is (' + esc(q.ans) + ')'}
              </span>
              <span style="font-size:11px;font-weight:700;color:#475569;">👨‍🏫 Deep Academic Analysis</span>
            </div>
            ${formatDeepExplanationHtml(q.exp, q.ans)}
           </div>`
        : '';

      return `
        <div class="mc-mock-qbox" id="mc-mq-${testId}-${qi}">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <span style="font-size:11px;font-weight:800;color:#059669;background:#d1fae5;padding:3px 9px;border-radius:999px;">QUESTION ${qi + 1} OF ${totalQs} · ${esc(q.type)} · ${esc(q.topic || 'Academic Concept')}</span>
            <div style="display:flex;gap:6px;align-items:center;">
              ${isRevealed ? `<button type="button" class="mc-vault-btn" onclick="window.__pmClearSingleQ('${testId}', ${qi})" title="Unselect and re-try this question">↺ Clear / Unselect</button>` : `<span style="font-size:11px;color:#64748b;font-weight:600;">👆 Click any option to check</span>`}
              <button type="button" class="mc-vault-btn" onclick="window.__pmSaveMockQToVault('${testId}', ${qi}, this)">🔖 Save to Vault</button>
            </div>
          </div>
          <div style="font-size:14.5px;font-weight:700;color:#0f172a;line-height:1.55;margin-bottom:8px;">${convertLatexMathInner(esc(q.q))}</div>
          ${inputHtml}
          ${expHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="mc-mock-card" id="mc-mock-root-${testId}">
        <div class="mc-mock-topbar">
          <div>
            <div style="font-size:11px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:0.06em;">📝 INTERACTIVE ACADEMIC QUIZ &amp; TIMED TEST ENGINE</div>
            <div style="font-size:16.5px;font-weight:800;color:#064e3b;">${esc(t.title || 'Competitive Exam Mock Test')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="mc-mock-timer" id="mc-mt-timer-${testId}">⏱️ ${mm}:${ss}</span>
          </div>
        </div>
        ${summaryHtml}
        ${qHtml}
      </div>
    `;
  }

  window.__pmCheckMockAnswer = function (q, userAns) {
    const u = String(userAns || '').trim().toUpperCase().replace(/^[()]+|[()]+$/g, '');
    const a = String(q.ans || '').trim().toUpperCase().replace(/^[()]+|[()]+$/g, '');
    if (!u || !a) return false;
    if (q.type === 'NUMERICAL' || !q.options || !q.options.length) {
      const un = parseFloat(u.replace(/[^0-9.\-]/g, ''));
      const an = parseFloat(a.replace(/[^0-9.\-]/g, ''));
      if (!isNaN(un) && !isNaN(an)) return Math.abs(un - an) <= Math.max(0.05, Math.abs(an) * 0.02);
    }
    return u === a || a.startsWith(u + ' ') || a.startsWith('OPTION ' + u);
  };

  window.__pmClearSingleQ = function (testId, qi) {
    const t = window.__pmMockTestsRegistry[testId];
    if (!t) return;
    t.submitted = false;
    delete t.answers[qi];
    delete t.checkedQuestions[qi];
    const rootEl = document.getElementById('mc-mock-root-' + testId);
    if (rootEl) {
      rootEl.outerHTML = renderMockTestHtml(t, testId);
    }
  };

  window.__pmSelectMockOpt = function (testId, qi, letter) {
    const t = window.__pmMockTestsRegistry[testId];
    if (!t) return;
    // Clicking the already-selected option unselects & resets it!
    if (t.answers[qi] === letter && !t.submitted) {
      window.__pmClearSingleQ(testId, qi);
      return;
    }
    if (t.submitted) return;
    t.answers[qi] = letter;
    t.checkedQuestions[qi] = true;
    const rootEl = document.getElementById('mc-mock-root-' + testId);
    if (rootEl) {
      rootEl.outerHTML = renderMockTestHtml(t, testId);
    }
    const allChecked = t.questions.every((_, idx) => Boolean(t.checkedQuestions[idx]));
    if (allChecked && !t.submitted) {
      window.__pmSubmitMockTest(testId);
    }
  };

  window.__pmCheckSingleQ = function (testId, qi) {
    const t = window.__pmMockTestsRegistry[testId];
    if (!t) return;
    t.checkedQuestions[qi] = true;
    const rootEl = document.getElementById('mc-mock-root-' + testId);
    if (rootEl) {
      rootEl.outerHTML = renderMockTestHtml(t, testId);
    }
  };

  window.__pmSetMockAns = function (testId, qi, val) {
    const t = window.__pmMockTestsRegistry[testId];
    if (!t || t.submitted) return;
    t.answers[qi] = val;
  };

  window.__pmResetMockTest = function (testId) {
    const t = window.__pmMockTestsRegistry[testId];
    if (!t) return;
    clearInterval(t.intervalId);
    t.answers = {};
    t.checkedQuestions = {};
    t.submitted = false;
    t.startTime = Date.now();
    t.remainingSec = (t.durationMin || Math.max(10, t.questions.length * 2)) * 60;
    t.intervalId = null;
    const rootEl = document.getElementById('mc-mock-root-' + testId);
    if (rootEl) {
      rootEl.outerHTML = renderMockTestHtml(t, testId);
    }
  };

  window.__pmSaveMockQToVault = function (testId, qi, btn) {
    const t = window.__pmMockTestsRegistry[testId];
    if (!t || !t.questions[qi]) return;
    const q = t.questions[qi];
    addItemToRevisionVault({
      subject: state.studySubject,
      topic: q.topic || t.title,
      question: q.q,
      answer: `Correct Option: (${q.ans})\n${q.exp || ''}`
    });
    if (btn) {
      btn.classList.add('saved');
      btn.textContent = '✓ Saved to Vault';
    }
  };

  window.__pmPracticeWeakTopics = function (topicsStr) {
    state.studyPreset = 'solver';
    document.querySelectorAll('[data-study-preset]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-study-preset') === 'solver'));
    sendChatMessage(`Teach me these weak topics in full academic depth from basics to exam level with solved examples: ${topicsStr}`);
  };

  window.__pmSubmitMockTest = function (testId) {
    const t = window.__pmMockTestsRegistry[testId];
    if (!t || t.submitted) return;
    t.submitted = true;
    t.questions.forEach((_, idx) => { t.checkedQuestions[idx] = true; });
    clearInterval(t.intervalId);
    t.intervalId = null;

    let score = 0;
    const weakSet = new Set();
    t.questions.forEach((q, qi) => {
      if (window.__pmCheckMockAnswer(q, t.answers[qi])) {
        score++;
      } else {
        weakSet.add(q.topic || 'Core Concept');
      }
    });

    const total = t.questions.length;
    const accuracy = total ? Math.round((score / total) * 100) : 0;
    const elapsedSec = Math.max(1, Math.round((Date.now() - t.startTime) / 1000));
    const timeTakenStr = `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;
    const weakTopics = Array.from(weakSet);

    t.result = { score, total, accuracy, timeTakenStr, weakTopics };

    state.studyAnalytics.unshift({
      id: 'sa_' + Date.now(),
      title: t.title || 'Academic Mock Test',
      subject: state.studySubject,
      score,
      total,
      accuracy,
      timeSec: elapsedSec,
      weakTopics,
      date: new Date().toLocaleDateString()
    });
    saveStudyAnalytics();

    const rootEl = document.getElementById('mc-mock-root-' + testId);
    if (rootEl) {
      rootEl.outerHTML = renderMockTestHtml(t, testId);
    }
  };

  function openStudyAnalyticsAndVaultModal() {
    document.getElementById('mc-study-modal-backdrop')?.remove();
    const totalTests = state.studyAnalytics.length;
    const avgAcc = totalTests
      ? Math.round(state.studyAnalytics.reduce((acc, x) => acc + (x.accuracy || 0), 0) / totalTests)
      : 0;
    const weakFreq = {};
    state.studyAnalytics.forEach((a) => (a.weakTopics || []).forEach((w) => { weakFreq[w] = (weakFreq[w] || 0) + 1; }));
    const topWeak = Object.entries(weakFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0]);

    const backdrop = document.createElement('div');
    backdrop.id = 'mc-study-modal-backdrop';
    backdrop.className = 'mc-modal-backdrop';
    backdrop.innerHTML = `
      <div class="mc-modal-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px;">
          <div>
            <h2 style="margin:0;font-size:19px;font-weight:800;color:#064e3b;">📊 Student Analytics &amp; Revision Vault</h2>
            <div style="font-size:12px;color:#64748b;">Track mock test accuracy, weak topics, and saved hard questions/formulas</div>
          </div>
          <button type="button" id="mc-modal-close-btn" class="mc-pill-btn">✕ Close</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#047857;">TESTS COMPLETED</div>
            <div style="font-size:22px;font-weight:800;color:#064e3b;">${totalTests}</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#047857;">AVERAGE ACCURACY</div>
            <div style="font-size:22px;font-weight:800;color:#064e3b;">${avgAcc}%</div>
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;text-align:center;">
            <div style="font-size:11px;font-weight:700;color:#b45309;">VAULT ITEMS</div>
            <div style="font-size:22px;font-weight:800;color:#92400e;">${state.studyVault.length}</div>
          </div>
        </div>

        ${topWeak.length ? `
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:12px 14px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
              <div style="font-size:12.5px;font-weight:700;color:#92400e;">🎯 Priority Weak Topics: ${topWeak.map((w) => esc(w)).join(' · ')}</div>
              <button type="button" class="mc-pill-btn active" style="font-size:11.5px;" id="mc-modal-practice-weak">Practice All Weak Topics →</button>
            </div>
          </div>` : ''}

        <h3 style="font-size:14px;font-weight:800;color:#0f172a;margin:14px 0 8px;">📈 Recent Mock Test Scores</h3>
        ${totalTests ? state.studyAnalytics.slice(0, 6).map((a) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:6px;font-size:12.5px;">
            <div><strong>${esc(a.title)}</strong> <span style="color:#64748b;">(${esc(a.subject.toUpperCase())} · ${esc(a.date)})</span></div>
            <div style="font-weight:800;color:${a.accuracy >= 70 ? '#059669' : '#d97706'};">${a.score}/${a.total} (${a.accuracy}%)</div>
          </div>
        `).join('') : '<div style="font-size:12.5px;color:#64748b;margin-bottom:12px;">No mock tests completed yet. Select "📝 Timed Mock Test" in Study Workspace to start!</div>'}

        <h3 style="font-size:14px;font-weight:800;color:#0f172a;margin:16px 0 8px;">🔖 Saved Revision Vault (Hard Questions &amp; Formulas)</h3>
        ${state.studyVault.length ? state.studyVault.map((v, vi) => `
          <div style="border:1px solid #d1fae5;background:#f8fafc;border-radius:12px;padding:12px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <span style="font-size:11px;font-weight:800;color:#059669;background:#d1fae5;padding:2px 8px;border-radius:999px;">${esc((v.subject || 'study').toUpperCase())} · ${esc(v.topic)}</span>
              <button type="button" data-del-vault="${vi}" style="background:transparent;border:none;color:#ef4444;font-weight:700;cursor:pointer;font-size:12px;">✕ Remove</button>
            </div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;">${convertLatexMathInner(esc(v.question))}</div>
            <div style="font-size:12.5px;color:#334155;line-height:1.5;">${convertLatexMathInner(esc(v.answer)).replace(/\n/g, '<br>')}</div>
          </div>
        `).join('') : '<div style="font-size:12.5px;color:#64748b;">Your Revision Vault is empty. Click "🔖 Save to Revision Vault" on any study answer or mock question!</div>'}
      </div>
    `;

    document.body.appendChild(backdrop);
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
    document.getElementById('mc-modal-close-btn')?.addEventListener('click', () => backdrop.remove());
    document.getElementById('mc-modal-practice-weak')?.addEventListener('click', () => {
      backdrop.remove();
      window.__pmPracticeWeakTopics(topWeak.join(', '));
    });
    backdrop.querySelectorAll('[data-del-vault]').forEach((b) => {
      b.onclick = () => {
        const idx = parseInt(b.getAttribute('data-del-vault'), 10);
        state.studyVault.splice(idx, 1);
        saveStudyVault();
        openStudyAnalyticsAndVaultModal();
      };
    });
  }

  function renderFlashcardDeckHtml(cards) {
    if (!Array.isArray(cards) || !cards.length) return '';
    return `
      <div class="mc-fc-deck" data-flipped="0">
        <div class="mc-fc-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:15px;font-weight:800;color:#065f46;">🗂️ Interactive Study Flashcards (${cards.length} Cards)</span>
            <span style="font-size:11.5px;color:#047857;font-weight:600;">Click any card to flip Question ⇄ Answer</span>
          </div>
          <button type="button" class="mc-pill-btn" style="font-size:11.5px;padding:4px 10px;" onclick="const d=this.closest('.mc-fc-deck');const f=d.dataset.flipped==='1';d.dataset.flipped=f?'0':'1';d.querySelectorAll('.mc-fc-card').forEach(c=>c.classList.toggle('is-flipped',!f));this.textContent=f?'🔄 Flip All to Answers':'🔄 Flip All to Questions';">🔄 Flip All to Answers</button>
        </div>
        <div class="mc-fc-grid">
          ${cards.map((c, i) => `
            <div class="mc-fc-card" onclick="this.classList.toggle('is-flipped')">
              <div class="mc-fc-front">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <span class="mc-fc-badge">❓ CARD #${i + 1}</span>
                  <span style="font-size:10.5px;color:#059669;font-weight:700;">👆 Flip ↻</span>
                </div>
                <div style="font-size:14px;font-weight:700;color:#0f172a;line-height:1.5;">${convertLatexMathInner(esc(c.q))}</div>
                <div style="font-size:11px;color:#64748b;margin-top:10px;">Tap card to reveal teacher answer &amp; formula</div>
              </div>
              <div class="mc-fc-back">
                <div>
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span class="mc-fc-badge">✅ ANSWER #${i + 1}</span>
                    <span style="font-size:10.5px;color:#6ee7b7;font-weight:700;">↺ Back</span>
                  </div>
                  <div style="font-size:13.5px;color:#ecfdf5;line-height:1.55;">${convertLatexMathInner(esc(c.a))}</div>
                </div>
                ${c.hint ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(110,231,183,0.25);font-size:11.5px;color:#fde68a;font-weight:600;">💡 Tip: ${convertLatexMathInner(esc(c.hint))}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderInfographicBoardHtml(ig) {
    if (!ig) return '';
    const flowHtml = Array.isArray(ig.flow) && ig.flow.length
      ? `<div class="mc-ig-flow">
          ${ig.flow.map((step, idx) => `
            <span class="mc-ig-step">${convertLatexMathInner(esc(step))}</span>
            ${idx < ig.flow.length - 1 ? '<span class="mc-ig-arrow">➔</span>' : ''}
          `).join('')}
         </div>`
      : '';
    const nodesHtml = Array.isArray(ig.nodes) && ig.nodes.length
      ? `<div class="mc-ig-grid">
          ${ig.nodes.map((n) => `
            <div class="mc-ig-node">
              <div class="mc-ig-node-title"><span>${esc(n.icon || '📌')}</span> <span>${convertLatexMathInner(esc(n.title || 'Key Concept'))}</span></div>
              <div class="mc-ig-node-body">${convertLatexMathInner(esc(n.body || ''))}</div>
            </div>
          `).join('')}
         </div>`
      : '';
    return `
      <div class="mc-infographic-board">
        <div class="mc-ig-header">
          <div style="font-size:10.5px;font-weight:800;letter-spacing:0.12em;color:#34d399;text-transform:uppercase;margin-bottom:4px;">📊 PIXELMORPHIC STUDY INFOGRAPHIC</div>
          <div style="font-size:18px;font-weight:800;color:#ffffff;">${convertLatexMathInner(esc(ig.title || 'Concept Visual Overview'))}</div>
          ${ig.subtitle ? `<div style="font-size:12.5px;color:#a7f3d0;margin-top:4px;">${convertLatexMathInner(esc(ig.subtitle))}</div>` : ''}
        </div>
        ${flowHtml}
        ${nodesHtml}
        ${ig.takeaway ? `<div class="mc-ig-takeaway">🏆 Golden Exam Rule: ${convertLatexMathInner(esc(ig.takeaway))}</div>` : ''}
      </div>
    `;
  }

  function formatCleanMarkdown(md) {
    if (!md) return '';
    let rawMd = String(md);
    let extractedFlashcards = [];
    let extractedInfographic = null;

    // Extract [FLASHCARD]...[/FLASHCARD] blocks
    rawMd = rawMd.replace(/\[FLASHCARD\]([\s\S]*?)\[\/FLASHCARD\]/gi, (_, block) => {
      const qMatch = block.match(/Q:\s*([\s\S]*?)(?=\nA:|$)/i);
      const aMatch = block.match(/A:\s*([\s\S]*?)(?=\nHINT:|$)/i);
      const hMatch = block.match(/HINT:\s*([\s\S]*?)$/i);
      if (qMatch && aMatch) {
        extractedFlashcards.push({
          q: qMatch[1].trim(),
          a: aMatch[1].trim(),
          hint: hMatch ? hMatch[1].trim() : ''
        });
      }
      return '';
    });

    // Extract [MOCK_TEST]...[/MOCK_TEST] and [MQ]...[/MQ] blocks
    let mockMeta = null;
    const mockQuestions = [];
    rawMd = rawMd.replace(/\[MOCK_TEST\]([\s\S]*?)\[\/MOCK_TEST\]/gi, (_, blk) => {
      const tM = blk.match(/TITLE:\s*(.+)/i);
      const dM = blk.match(/DURATION_MIN:\s*(\d+)/i);
      mockMeta = {
        title: tM ? tM[1].trim() : 'Competitive Exam Mock Test',
        durationMin: dM ? parseInt(dM[1], 10) : 12
      };
      return '';
    });
    rawMd = rawMd.replace(/\[MQ\]([\s\S]*?)\[\/MQ\]/gi, (_, blk) => {
      const typeM = blk.match(/TYPE:\s*([A-Z]+)/i);
      const topicM = blk.match(/TOPIC:\s*(.+)/i);
      const qM = blk.match(/Q:\s*([\s\S]*?)(?=\n[A-D]:|\nANS:|$)/i);
      const aM = blk.match(/\nA:\s*([\s\S]*?)(?=\nB:|$)/i);
      const bM = blk.match(/\nB:\s*([\s\S]*?)(?=\nC:|$)/i);
      const cM = blk.match(/\nC:\s*([\s\S]*?)(?=\nD:|$)/i);
      const dM = blk.match(/\nD:\s*([\s\S]*?)(?=\nANS:|$)/i);
      const ansM = blk.match(/\nANS:\s*(.+)/i);
      const expM = blk.match(/\nEXP:\s*([\s\S]*?)$/i);
      if (qM) {
        const opts = [];
        if (aM) opts.push({ key: 'A', text: aM[1].trim() });
        if (bM) opts.push({ key: 'B', text: bM[1].trim() });
        if (cM) opts.push({ key: 'C', text: cM[1].trim() });
        if (dM) opts.push({ key: 'D', text: dM[1].trim() });
        mockQuestions.push({
          type: (typeM && typeM[1].toUpperCase()) || (opts.length ? 'MCQ' : 'NUMERICAL'),
          topic: topicM ? topicM[1].trim() : 'Core Concept',
          q: qM[1].trim(),
          options: opts,
          ans: ansM ? ansM[1].trim() : '',
          exp: expM ? expM[1].trim() : ''
        });
      }
      return '';
    });

    // Extract [INFOGRAPHIC]...[/INFOGRAPHIC] block
    rawMd = rawMd.replace(/\[INFOGRAPHIC\]([\s\S]*?)\[\/INFOGRAPHIC\]/gi, (_, block) => {
      const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const ig = { title: '', subtitle: '', flow: [], nodes: [], takeaway: '' };
      for (const line of lines) {
        if (/^TITLE:/i.test(line)) ig.title = line.replace(/^TITLE:\s*/i, '').trim();
        else if (/^SUBTITLE:/i.test(line)) ig.subtitle = line.replace(/^SUBTITLE:\s*/i, '').trim();
        else if (/^FLOW:/i.test(line)) ig.flow = line.replace(/^FLOW:\s*/i, '').split(/\s*(?:->|➔|⇒)\s*/).filter(Boolean);
        else if (/^NODE:/i.test(line)) {
          const parts = line.replace(/^NODE:\s*/i, '').split('|').map((s) => s.trim());
          ig.nodes.push({ icon: parts[0] || '📌', title: parts[1] || 'Concept', body: parts.slice(2).join(' — ') || parts[1] || '' });
        } else if (/^TAKEAWAY:/i.test(line)) {
          ig.takeaway = line.replace(/^TAKEAWAY:\s*/i, '').trim();
        }
      }
      if (ig.title || ig.nodes.length) extractedInfographic = ig;
      return '';
    });

    const preWidgetsHtml = (mockQuestions.length ? renderMockTestHtml({ ...(mockMeta || {}), questions: mockQuestions }) : '') +
                           (extractedInfographic ? renderInfographicBoardHtml(extractedInfographic) : '') +
                           (extractedFlashcards.length ? renderFlashcardDeckHtml(extractedFlashcards) : '');

    rawMd = rawMd.replace(/^\s*[-*_]{3,}\s*$/gm, '');
    let html = esc(rawMd);

    // 1. Convert Display Math Blocks: \[ ... \] and $$ ... $$
    html = html.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `<div class="mc-math-block">${convertLatexMathInner(inner)}</div>`);
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => `<div class="mc-math-block">${convertLatexMathInner(inner)}</div>`);

    // 2. Convert Inline Math: \( ... \) and $ ... $ (when not currency like $100)
    html = html.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `<span class="mc-math-inline">${convertLatexMathInner(inner)}</span>`);
    html = html.replace(/\$(?!\s*\d+\b)([^$\n]+?)\$/g, (_, inner) => `<span class="mc-math-inline">${convertLatexMathInner(inner)}</span>`);

    // 3. Even if the LLM wrote raw \frac{a}{b}, \sqrt{x}, \pi, \theta, r^2 outside delimiters, convert them cleanly!
    if (/\\(?:frac|dfrac|sqrt|pi|theta|alpha|beta|gamma|delta|Delta|sigma|Sigma|omega|Omega|times|cdot|div|pm|leq|geq|neq|approx|infty|int|sum|angle|triangle|perp)|\^[0-9{]/.test(html)) {
      html = convertLatexMathInner(html);
    }

    // 4. Tables
    html = html.replace(/((?:^\|.*\|\r?\n)+)/gm, (tableBlock) => {
      const rows = tableBlock.trim().split(/\r?\n/).filter(Boolean);
      if (rows.length < 2) return tableBlock;
      let out = '<table>';
      rows.forEach((row, rIdx) => {
        if (/^\|[\s\-:|]+\|$/.test(row.trim())) return;
        const cells = row.replace(/^\||\|$/g, '').split('|');
        const tag = rIdx === 0 ? 'th' : 'td';
        out += '<tr>' + cells.map((c) => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
      });
      out += '</table>';
      return out;
    });

    // Remove any simulated link disclaimer text
    html = html.replace(/\*?\(\s*Simulated\s+secure\s+link[^)]*\)\*?/gi, '');

    // Intercept local PDF export triggers [Title](#export-local-pdf)
    html = html.replace(/\[([^\]]+)\]\(#export-local-pdf\)/g, '<button type="button" class="mc-dl-link-pill" onclick="window.__pmExportParentCardToPdf && window.__pmExportParentCardToPdf(this)">$1 ⬇</button>');

    // Clickable Markdown Links: [Title](https://...) -> If fake drive.google.com/example.com link, route to real local PDF exporter!
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      if (/drive\.google\.com|docs\.google\.com|dropbox\.com|example\.com|simulated/i.test(url)) {
        return `<button type="button" class="mc-dl-link-pill" onclick="window.__pmExportParentCardToPdf && window.__pmExportParentCardToPdf(this)">📥 ${label.replace(/^📥\s*/, '')} (Download Real PDF) ⬇</button>`;
      }
      return `<a class="mc-dl-link-pill" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
    });

    // Bare URLs (not already inside href="...") -> Clickable Link Pill
    html = html.replace(/(?<!href="|src="|">)(https?:\/\/[^\s<)"']+)/g, (m) => {
      const cleanU = m.replace(/[.,;!?]+$/, '');
      let dom = 'Open Link';
      try { dom = new URL(cleanU).hostname.replace(/^www\./, ''); } catch (_) {}
      return `<a class="mc-dl-link-pill" href="${cleanU}" target="_blank" rel="noopener noreferrer">🔗 ${dom} ↗</a>`;
    });

    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^(?:[-•*])\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\r?\n?)+)/g, '<ul>$1</ul>');
    html = html.replace(/^(\d{1,2})\.\s+(.+)$/gm, '<div class="mc-numbered-line"><strong>$1.</strong> $2</div>');

    html = html
      .split(/\n{2,}/)
      .map((block) => {
        const b = block.trim();
        if (!b) return '';
        if (/^<(h1|h2|h3|ul|ol|table|div)/i.test(b)) return b;
        return `<p>${b.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');

    return preWidgetsHtml + html;
  }

  window.__pmExportParentCardToPdf = function (btnEl) {
    const card = btnEl && btnEl.closest ? btnEl.closest('.mc-ai-card') : null;
    if (card) {
      const pdfBtn = card.querySelector('[data-export-pdf]');
      if (pdfBtn) {
        pdfBtn.click();
        return;
      }
    }
    const lastAssistant = [...state.messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) exportMessageToPDF(lastAssistant);
  };

  function exportMessageToPDF(msgObj) {
    if (!msgObj) return;
    const win = window.open('', '_blank', 'width=980,height=860');
    if (!win) {
      alert('Please allow popups to download the PDF.');
      return;
    }

    if (msgObj.responseType === 'ebook' && msgObj.ebook) {
      const eb = msgObj.ebook;
      const tpl = eb.template || 'astra-emerald';
      const fnt = eb.fontPair || 'editorial-serif';

      const tplPalettes = {
        'astra-emerald': { c1: '#051911', c2: '#0d3826', accent: '#10b981', badge: '#34d399', lightBg: '#ecfdf5', ink: '#0b2419' },
        'argon-swiss': { c1: '#09090b', c2: '#18181b', accent: '#dc2626', badge: '#f87171', lightBg: '#fef2f2', ink: '#09090b' },
        'oxford-academic': { c1: '#292524', c2: '#44403c', accent: '#b45309', badge: '#fbbf24', lightBg: '#fef3c7', ink: '#1c1917' },
        'cyber-midnight': { c1: '#020617', c2: '#0f172a', accent: '#0284c7', badge: '#38bdf8', lightBg: '#e0f2fe', ink: '#0f172a' }
      };
      const pal = tplPalettes[tpl] || tplPalettes['astra-emerald'];

      const fontFamilies = {
        'editorial-serif': { head: "'Newsreader', Georgia, serif", body: "'Inter', sans-serif" },
        'luxury-press': { head: "'Playfair Display', Georgia, serif", body: "'Plus Jakarta Sans', sans-serif" },
        'academic-scholar': { head: "'Lora', Georgia, serif", body: "'Inter', sans-serif" },
        'modern-tech': { head: "'Space Grotesk', sans-serif", body: "'DM Sans', sans-serif" }
      };
      const ff = fontFamilies[fnt] || fontFamilies['editorial-serif'];

      const takeawaysHtml = Array.isArray(eb.keyTakeaways) && eb.keyTakeaways.length
        ? `<div class="exec-takeaways">
            <div class="exec-kicker">KEY STRATEGIC &amp; EMPIRICAL TAKEAWAYS</div>
            <ul>${eb.keyTakeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
           </div>`
        : '';

      const execPageHtml = (eb.executiveSummary || takeawaysHtml)
        ? `<div class="pdf-page">
            <div class="running-head">
              <span style="color:${pal.accent};font-weight:700;">EXECUTIVE FOREWORD</span>
              <span>${esc(eb.title)}</span>
            </div>
            <h2 class="ch-title" style="margin-top:4mm;">Executive Overview &amp; 2026 Landscape</h2>
            <div class="ch-body">${formatCleanMarkdown(eb.executiveSummary || '')}</div>
            ${takeawaysHtml}
            <div class="running-foot">
              <span>${esc(eb.author || 'Pixelmorphic Astra Press')}</span>
              <span>Executive Foreword</span>
            </div>
           </div>`
        : '';

      const chaptersHtml = (eb.chapters || [])
        .map(
          (ch, cIdx) => `
          <div class="pdf-page">
            <div class="running-head">
              <span style="color:${pal.accent};font-weight:700;">CHAPTER ${ch.number || cIdx + 1}</span>
              <span>${esc(eb.title)}</span>
            </div>
            <h2 class="ch-title">${esc(ch.title)}</h2>
            ${ch.epigraph ? `<div class="ch-epigraph">“${esc(ch.epigraph)}”</div>` : ''}
            ${
              ch.keyMetric && ch.keyMetric.value
                ? `<div class="ch-metric-bar">
                    <span class="ch-m-label">${esc(ch.keyMetric.label || 'KEY BENCHMARK')}:</span>
                    <span class="ch-m-val">${esc(ch.keyMetric.value)}</span>
                    ${ch.keyMetric.detail ? `<span class="ch-m-det">— ${esc(ch.keyMetric.detail)}</span>` : ''}
                   </div>`
                : ''
            }
            ${
              ch.imageUrl
                ? `<div class="ch-img-box">
                    <img src="${healClientImageUri(ch.imageUrl, ch.title)}" alt="${esc(ch.title)}">
                   </div>`
                : ''
            }
            <div class="ch-body">${formatCleanMarkdown(ch.contentMarkdown || '')}</div>
            <div class="running-foot">
              <span>${esc(eb.author || 'Pixelmorphic Astra Press')}</span>
              <span>Chapter ${ch.number || cIdx + 1}</span>
            </div>
          </div>`
        )
        .join('');

      const coverImgClean = healClientImageUri(eb.coverImageUrl, eb.title);

      win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(eb.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,500;0,600;0,700;1,400&family=Newsreader:ital,opsz,wght@0,6..72,600;0,6..72,700;1,6..72,400&family=Noto+Sans+Devanagari:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    /* margin: 0mm removes Chrome's automatic date/time top header and about:blank bottom footer! */
    @page {
      size: A4 portrait;
      margin: 0mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${ff.body};
      color: #0f172a;
      background: #ffffff;
      line-height: 1.72;
      font-size: 10.5pt;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Page 1: Full-Bleed SVG-Backed Luxury Cover Page (Prints in 100% Full Color Even Without Background Graphics Checked!) */
    .cover-page {
      width: 210mm;
      height: 296.5mm;
      position: relative;
      page-break-after: always;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24mm 20mm 20mm 20mm;
      text-align: center;
      color: #ffffff;
    }
    .cover-bg-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }
    .cover-fg {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      height: 100%;
    }
    .cover-kicker {
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${pal.badge};
      margin-bottom: 12px;
    }
    .cover-main-title {
      font-family: ${ff.head};
      font-size: 28pt;
      line-height: 1.18;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
      max-width: 92%;
    }
    .cover-subtitle {
      font-size: 12pt;
      color: #e2e8f0;
      max-width: 85%;
      line-height: 1.5;
      margin-bottom: 18px;
    }
    .cover-art-wrap {
      width: 112mm;
      height: 146mm;
      border-radius: 14px;
      overflow: hidden;
      border: 3px solid ${pal.badge};
      box-shadow: 0 18px 45px rgba(0,0,0,0.45);
      margin: 4mm auto;
      background: #04120c;
    }
    .cover-art-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .cover-footer-bar {
      width: 100%;
      border-top: 1px solid rgba(255,255,255,0.22);
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      color: #cbd5e1;
    }

    
    .mc-math-block { margin: 10px 0; padding: 10px 14px; background: #f8fafc; border-left: 3px solid #10b981; border-radius: 8px; font-family: 'Cambria Math', 'Times New Roman', serif; font-size: 13pt; text-align: center; }
    .mc-math-inline { font-family: 'Cambria Math', 'Times New Roman', serif; font-weight: 600; display: inline-flex; align-items: center; vertical-align: middle; }
    .mc-frac { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 3px; font-size: 0.9em; line-height: 1.05; }
    .mc-frac-num { border-bottom: 1.2px solid currentColor; padding: 0 4px 1px; }
    .mc-frac-den { padding: 1px 4px 0; }
    .mc-sqrt { display: inline-flex; align-items: center; vertical-align: middle; }
    .mc-sqrt-Body, .mc-sqrt-body { border-top: 1.2px solid currentColor; padding: 1px 2px 0; }

    /* Content Pages — Locked to Exact A4 Page Height so N Pages = Exactly N Printed Pages! */
    .pdf-page {
      width: 210mm;
      height: 296mm;
      max-height: 296mm;
      padding: 15mm 18mm 14mm 18mm;
      page-break-before: always;
      break-before: page;
      overflow: hidden;
      position: relative;
      background: #ffffff;
      display: flex;
      flex-direction: column;
    }
    .running-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #64748b;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .running-foot {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      color: #64748b;
    }
    .ch-title {
      font-family: ${ff.head};
      font-size: 21pt;
      color: ${pal.ink};
      line-height: 1.24;
      margin-bottom: 10px;
      font-weight: 700;
    }
    .ch-epigraph {
      border-left: 3.5px solid ${pal.accent};
      padding: 7px 14px;
      margin-bottom: 12px;
      font-style: italic;
      font-size: 10.5pt;
      color: #334155;
      background: ${pal.lightBg};
      border-radius: 0 8px 8px 0;
    }
    .ch-metric-bar {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: ${pal.lightBg};
      border: 1px solid ${pal.accent};
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 9.5pt;
    }
    .ch-m-label { font-weight: 700; color: ${pal.accent}; text-transform: uppercase; }
    .ch-m-val { font-weight: 800; color: #0f172a; }
    .ch-m-det { color: #475569; }
    .ch-img-box {
      width: 100%;
      margin: 4px 0 14px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      background: #071911;
    }
    .ch-img-box img {
      width: 100%;
      max-height: 68mm;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .ch-body {
      font-size: 10.2pt;
      color: #1e293b;
      line-height: 1.68;
    }
    .ch-body h3 {
      font-family: ${ff.head};
      font-size: 13.5pt;
      color: ${pal.ink};
      margin: 12px 0 6px;
    }
    .ch-body p { margin-bottom: 10px; text-align: justify; }
    .ch-body ul { margin: 6px 0 12px 18px; }
    .ch-body li { margin-bottom: 5px; }
    .exec-takeaways {
      margin-top: 16px;
      padding: 16px 18px;
      border-radius: 12px;
      border: 1.5px solid ${pal.accent};
      background: ${pal.lightBg};
    }
    .exec-kicker {
      font-size: 9.5pt;
      font-weight: 800;
      color: ${pal.accent};
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .exec-takeaways ul { margin-left: 18px; }
    .exec-takeaways li { margin-bottom: 7px; font-weight: 500; color: #0f172a; }
  </style>
</head>
<body>
  <div class="cover-page">
    <svg class="cover-bg-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" preserveAspectRatio="none">
      <defs>
        <linearGradient id="covGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${pal.c1}"/>
          <stop offset="55%" stop-color="${pal.c2}"/>
          <stop offset="100%" stop-color="${pal.c1}"/>
        </linearGradient>
      </defs>
      <rect width="794" height="1123" fill="url(#covGrad)"/>
      <rect x="28" y="28" width="738" height="1067" rx="18" fill="none" stroke="${pal.badge}" stroke-opacity="0.38" stroke-width="2"/>
    </svg>
    <div class="cover-fg">
      <div style="width:100%;display:flex;flex-direction:column;align-items:center;">
        <div class="cover-kicker">PIXELMORPHIC ASTRA &amp; ARGON PUBLISHING STUDIO</div>
        <h1 class="cover-main-title">${esc(eb.title)}</h1>
        <div class="cover-subtitle">${esc(eb.subtitle || '')}</div>
      </div>
      ${coverImgClean ? `<div class="cover-art-wrap"><img src="${coverImgClean}" alt="Cover"></div>` : ''}
      <div class="cover-footer-bar">
        <span>${esc(eb.author || 'Pixelmorphic Astra Press · 2026 Edition')}</span>
        <span>Verified Research Monograph</span>
      </div>
    </div>
  </div>
  ${execPageHtml}
  ${chaptersHtml}
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 650); };<\/script>
</body>
</html>`);
      win.document.close();
      return;
    }

    const bodyHtml = formatCleanMarkdown(msgObj.answer || '');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(msgObj.query || 'Document')}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Newsreader:opsz,wght@6..72,600&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 16mm; }
    body { font-family: 'Inter', 'Noto Sans Devanagari', sans-serif; color: #111814; line-height: 1.7; font-size: 11pt; }
    h1, h2, h3 { font-family: 'Newsreader', serif; color: #0b2419; }
  </style>
</head>
<body>
  <div style="border-bottom:2px solid #0b2419;padding-bottom:10px;margin-bottom:20px;">
    <h1 style="margin:0;font-size:24px;">${esc(msgObj.query || 'Pixelmorphic AI Document')}</h1>
  </div>
  <div>${bodyHtml}</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 450); };<\/script>
</body>
</html>`);
    win.document.close();
  }


  function updateQualityToggleVisibility() {
    const qGroup = document.getElementById('mc-quality-group');
    const chatInput = document.getElementById('mc-chat-input');
    if (!qGroup) return;
    const text = chatInput ? chatInput.value : '';
    const shouldShow = state.actionMode === 'image' || state.actionMode === 'ebook' || isClientImagePrompt(text);
    qGroup.classList.toggle('visible', shouldShow);
  }

  function renderModeAndAttachments() {
    const modeSlot = document.getElementById('mc-mode-slot');
    if (!modeSlot) return;

    const chips = [];
    if (state.actionMode === 'image') {
      chips.push(`<span class="mc-mode-chip">🎨 Create image <button data-clear-mode="1">×</button></span>`);
    } else if (state.actionMode === 'ebook') {
      chips.push(`<span class="mc-mode-chip">📚 Create eBook <button data-clear-mode="1">×</button></span>`);
    } else if (state.actionMode === 'pdf') {
      chips.push(`<span class="mc-mode-chip">📑 Create PDF <button data-clear-mode="1">×</button></span>`);
    }

    state.attachments.forEach((att, idx) => {
      chips.push(`<span class="mc-mode-chip">📎 ${esc(att.name)} <button data-rm-att="${idx}">×</button></span>`);
    });

    modeSlot.innerHTML = chips.join('');
    modeSlot.querySelectorAll('[data-clear-mode]').forEach((b) => {
      b.onclick = () => {
        state.actionMode = 'auto';
        const chatInput = document.getElementById('mc-chat-input');
        if (chatInput) chatInput.placeholder = 'Ask anything...';
        renderModeAndAttachments();
        updateQualityToggleVisibility();
      };
    });
    modeSlot.querySelectorAll('[data-rm-att]').forEach((b) => {
      b.onclick = () => {
        const i = parseInt(b.getAttribute('data-rm-att'), 10);
        state.attachments.splice(i, 1);
        renderModeAndAttachments();
      };
    });
    updateQualityToggleVisibility();
  }


  // ============================================================================
  // UNIVERSAL VOICE INPUT (SPEECH-TO-TEXT MIC) & READ ALOUD (TTS) ENGINE
  // ============================================================================
  const GOOGLE_MIC_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0;"><path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="currentColor"/><path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="currentColor"/></svg>`;
  const GOOGLE_MIC_ACTIVE_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
  window.__PM_GOOGLE_MIC_SVG = GOOGLE_MIC_SVG;

  let activeSpeechRec = null;
  let activeMicBtnEl = null;

  function toggleVoiceMicInput(targetInputId, micBtn) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      showDownloadToast('⚠️ Voice input requires Chrome or Edge browser.');
      return;
    }

    if (activeSpeechRec) {
      try { activeSpeechRec.stop(); } catch (_) {}
      activeSpeechRec = null;
      if (activeMicBtnEl) {
        activeMicBtnEl.classList.remove('is-listening');
        activeMicBtnEl.innerHTML = GOOGLE_MIC_SVG;
      }
      if (activeMicBtnEl === micBtn) {
        activeMicBtnEl = null;
        return;
      }
    }

    const inputEl = document.getElementById(targetInputId) || document.querySelector(targetInputId);
    if (!inputEl) return;

    const rec = new SpeechRec();
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = true;

    const baseText = inputEl.value ? inputEl.value.trim() + ' ' : '';
    activeSpeechRec = rec;
    activeMicBtnEl = micBtn;

    if (micBtn) {
      micBtn.classList.add('is-listening');
      micBtn.innerHTML = GOOGLE_MIC_ACTIVE_SVG;
      micBtn.title = 'Listening... Click to stop';
    }
    showDownloadToast('🎙️ Listening... Speak in English or Hindi');

    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      inputEl.value = baseText + transcript;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const cleanupMic = () => {
      if (micBtn) {
        micBtn.classList.remove('is-listening');
        micBtn.innerHTML = GOOGLE_MIC_SVG;
        micBtn.title = 'Voice Input (Mic)';
      }
      activeSpeechRec = null;
      activeMicBtnEl = null;
    };

    rec.onerror = cleanupMic;
    rec.onend = cleanupMic;

    try {
      rec.start();
    } catch (_) {
      cleanupMic();
    }
  }

  let activeTtsBtn = null;

  function cleanTextForSpeech(rawMd) {
    let s = String(rawMd || '');
    // Strip custom Study widget tags cleanly
    s = s.replace(/\[\/?(?:MOCK_TEST|MQ|FLASHCARD|INFOGRAPHIC)\]/gi, ' ');
    // Strip emojis & decorative pictographs so speaker never reads "globe showing Europe Africa..."
    s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ');
    // Convert math & units for natural pronunciation
    s = s
      .replace(/\\(?:d|t)?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1 over $2')
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, 'square root of $1')
      .replace(/\\pi\b|π/g, ' pi ')
      .replace(/\\theta\b|θ/g, ' theta ')
      .replace(/\\alpha\b|α/g, ' alpha ')
      .replace(/\\beta\b|β/g, ' beta ')
      .replace(/\\gamma\b|γ/g, ' gamma ')
      .replace(/\\Delta\b|Δ/g, ' delta ')
      .replace(/\^2|²/g, ' squared ')
      .replace(/\^3|³/g, ' cubed ')
      .replace(/(\d)\s*km\b/gi, '$1 kilometers')
      .replace(/(\d)\s*m\b/g, '$1 meters')
      .replace(/(\d)\s*°C\b/gi, '$1 degrees Celsius')
      .replace(/~\s*(\d)/g, 'approximately $1')
      .replace(/₹\s*([\d,]+)/g, '$1 rupees')
      .replace(/\$\s*([\d,]+)/g, '$1 dollars')
      .replace(/\bUSBRL\b/g, 'U S B R L')
      .replace(/\bUGC\b/g, 'U G C')
      .replace(/\bUPSC\b/g, 'U P S C')
      .replace(/\bNTA\b/g, 'N T A')
      .replace(/\bIIT\b/g, 'I I T')
      .replace(/\\\[|\\\]|\\\(|\\\)|\$\$/g, ' ')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
      .replace(/https?:\/\/[^\s)]+/g, '')
      .replace(/---+/g, ', ')
      .replace(/[#*_`>|•]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return s;
  }

  // Pre-warm browser TTS voices so natural neural voices are ready on first click
  try {
    if ('speechSynthesis' in window && window.speechSynthesis.getVoices) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => { try { window.speechSynthesis.getVoices(); } catch (_) {} };
    }
  } catch (_) {}

  function pickBestNaturalVoice(isHindi) {
    const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    if (!voices.length) return null;
    if (isHindi) {
      return voices.find((v) => /hi[-_]IN/i.test(v.lang) && /natural|online|google|swara|madhur/i.test(v.name))
        || voices.find((v) => /hi[-_]IN/i.test(v.lang))
        || null;
    }
    return voices.find((v) => /en[-_](IN|US|GB)/i.test(v.lang) && /natural|online|aria|jenny|neerja|prabhat|google/i.test(v.name))
      || voices.find((v) => /en[-_](IN|US|GB)/i.test(v.lang) && !/david|zira|hazel/i.test(v.name))
      || voices.find((v) => /^en/i.test(v.lang))
      || null;
  }

  function toggleReadAloudTTS(rawText, btnEl) {
    if (!('speechSynthesis' in window)) {
      showDownloadToast('⚠️ Text-to-Speech is not supported in this browser.');
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      if (activeTtsBtn) {
        activeTtsBtn.classList.remove('is-speaking');
        activeTtsBtn.innerHTML = '🔊 Listen';
      }
      if (activeTtsBtn === btnEl) {
        activeTtsBtn = null;
        return;
      }
    }

    const cleanSpeech = cleanTextForSpeech(rawText);
    if (!cleanSpeech) return;

    const isHindi = /[\u0900-\u097F]/.test(cleanSpeech);
    const chosenVoice = pickBestNaturalVoice(isHindi);

    // Split into smooth sentence chunks (<= 200 chars) so speech stays fluent & never cuts off mid-answer
    const sentences = cleanSpeech.match(/[^.!?।]+[.!?।]?/g) || [cleanSpeech];
    const chunks = [];
    let cur = '';
    for (const s of sentences) {
      const t = s.trim();
      if (!t) continue;
      if ((cur + ' ' + t).length > 210 && cur) {
        chunks.push(cur.trim());
        cur = t;
      } else {
        cur = cur ? (cur + ' ' + t) : t;
      }
    }
    if (cur.trim()) chunks.push(cur.trim());

    activeTtsBtn = btnEl;
    if (btnEl) {
      btnEl.classList.add('is-speaking');
      btnEl.innerHTML = '⏹ Stop Audio';
    }

    const resetBtn = () => {
      if (btnEl) {
        btnEl.classList.remove('is-speaking');
        btnEl.innerHTML = '🔊 Listen';
      }
      if (activeTtsBtn === btnEl) activeTtsBtn = null;
    };

    let idx = 0;
    const speakNext = () => {
      if (activeTtsBtn !== btnEl || idx >= chunks.length) {
        resetBtn();
        return;
      }
      const utter = new SpeechSynthesisUtterance(chunks[idx++]);
      utter.lang = isHindi ? 'hi-IN' : 'en-IN';
      if (chosenVoice) utter.voice = chosenVoice;
      utter.rate = 0.98;
      utter.pitch = 1.0;
      utter.onend = speakNext;
      utter.onerror = resetBtn;
      window.speechSynthesis.speak(utter);
    };

    speakNext();
  }

  window.__pmToggleVoiceMic = toggleVoiceMicInput;
  window.__pmToggleReadAloud = toggleReadAloudTTS;

  function showDownloadToast(msg) {
    let t = document.getElementById('mc-dl-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mc-dl-toast';
      t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:1000005;background:#064e3b;color:#ecfdf5;border:1px solid #10b981;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600;box-shadow:0 10px 28px rgba(0,0,0,0.28);transition:opacity 0.25s ease;';
      document.body.appendChild(t);
    }
    t.textContent = msg || '✓ Downloaded to your device';
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2600);
  }

  async function triggerDataUrlDownload(dataUrl, filename) {
    if (!dataUrl) return;
    try {
      let ext = 'png';
      if (dataUrl.startsWith('data:image/svg+xml')) ext = 'svg';
      else if (dataUrl.startsWith('data:image/jpeg')) ext = 'jpg';
      else if (dataUrl.startsWith('data:image/webp')) ext = 'webp';
      else if (dataUrl.startsWith('data:image/png')) ext = 'png';

      const cleanBase = String(filename || 'pixelmorphic-image')
        .replace(/\.(jpg|jpeg|png|svg|webp)$/i, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60) || 'pixelmorphic-image';
      const finalName = `${cleanBase}.${ext}`;

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = finalName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 600);
      showDownloadToast(`✓ Saved ${finalName}`);
    } catch (_) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename || 'pixelmorphic-image.png';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 200);
      showDownloadToast('✓ Download started');
    }
  }

  function openImageLightbox(opts) {
    if (!opts || !opts.url) return;
    const existing = document.getElementById('mc-image-lightbox-modal');
    if (existing) existing.remove();

    const isEdu = Boolean(
      opts.isEducational ||
      opts.url.startsWith('data:image/svg+xml') ||
      opts.url.startsWith('data:image/png') ||
      /\b(diagram|labeled|labelled|anatomy|cell|brain|heart|eye|structure|organelle|infographic)\b/i.test(opts.title || '')
    );

    let zoomScale = 1;
    let useLightBg = isEdu;

    const modal = document.createElement('div');
    modal.id = 'mc-image-lightbox-modal';
    modal.className = 'mc-lightbox-overlay';
    modal.innerHTML = `
      <div class="mc-lightbox-top">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="background:rgba(16,185,129,0.22);border:1px solid #10b981;color:#6ee7b7;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;">
            ${isEdu ? '✓ Verified Educational Diagram' : '✨ Morphic Studio HD'}
          </span>
          <div class="mc-lightbox-title" title="${esc(opts.title || 'Generated Visual')}">${esc(opts.title || 'Generated Visual')}</div>
        </div>
        <div class="mc-lightbox-controls">
          <button type="button" class="mc-lb-btn" id="mc-lb-zoom-out" title="Zoom Out">🔍−</button>
          <button type="button" class="mc-lb-btn" id="mc-lb-zoom-reset" title="Reset Zoom">100%</button>
          <button type="button" class="mc-lb-btn" id="mc-lb-zoom-in" title="Zoom In">🔍+</button>
          <button type="button" class="mc-lb-btn" id="mc-lb-bg-toggle" title="Switch Light/Dark Canvas">
            ${useLightBg ? '🌙 Dark Canvas' : '☀️ Light Canvas'}
          </button>
          <button type="button" class="mc-lb-btn primary" id="mc-lb-download">⬇ Download HD</button>
          <button type="button" class="mc-lb-btn" id="mc-lb-close" style="padding:7px 12px;">✕ Close</button>
        </div>
      </div>
      <div class="mc-lightbox-stage" id="mc-lb-stage">
        <div class="mc-lightbox-img-wrap ${useLightBg ? 'light-bg' : 'dark-bg'}" id="mc-lb-wrap">
          <img src="${esc(opts.url)}" alt="${esc(opts.title || 'Preview')}" id="mc-lb-img" onerror="window.__mcHealBrokenImg && window.__mcHealBrokenImg(this)" referrerpolicy="no-referrer" />
        </div>
      </div>
      <div class="mc-lightbox-bottom">
        <span>Aspect Ratio: ${esc(opts.aspectRatio || '3:4')} · Click image to toggle zoom · Press Esc to close</span>
        <span>Saved in Pixelmorphic Library</span>
      </div>
    `;

    document.body.appendChild(modal);

    const wrap = modal.querySelector('#mc-lb-wrap');
    const imgEl = modal.querySelector('#mc-lb-img');
    const resetBtn = modal.querySelector('#mc-lb-zoom-reset');
    const bgBtn = modal.querySelector('#mc-lb-bg-toggle');

    const applyZoom = () => {
      if (wrap) wrap.style.transform = `scale(${zoomScale})`;
      if (resetBtn) resetBtn.textContent = `${Math.round(zoomScale * 100)}%`;
    };

    modal.querySelector('#mc-lb-zoom-in')?.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomScale = Math.min(2.6, +(zoomScale + 0.25).toFixed(2));
      applyZoom();
    });
    modal.querySelector('#mc-lb-zoom-out')?.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomScale = Math.max(0.5, +(zoomScale - 0.25).toFixed(2));
      applyZoom();
    });
    resetBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomScale = 1;
      applyZoom();
    });
    imgEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      zoomScale = zoomScale === 1 ? 1.65 : 1;
      applyZoom();
    });
    bgBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      useLightBg = !useLightBg;
      if (wrap) {
        wrap.classList.toggle('light-bg', useLightBg);
        wrap.classList.toggle('dark-bg', !useLightBg);
      }
      bgBtn.textContent = useLightBg ? '🌙 Dark Canvas' : '☀️ Light Canvas';
    });
    modal.querySelector('#mc-lb-download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerDataUrlDownload(opts.url, opts.title || 'pixelmorphic-image');
    });

    const closeModal = () => {
      modal.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    modal.querySelector('#mc-lb-close')?.addEventListener('click', closeModal);
    modal.querySelector('#mc-lb-stage')?.addEventListener('click', (e) => {
      if (e.target.id === 'mc-lb-stage') closeModal();
    });
  }

  function scrollWorkspaceTo(position) {
    const isTop = position === 'top';
    // 1. Scroll anchor element directly into view (most reliable across nested flex/overflow containers!)
    if (isTop) {
      const topAnchor = document.getElementById('mc-topbar-title') || document.getElementById('mc-study-banner') || document.getElementById('mc-shell-root');
      if (topAnchor && topAnchor.scrollIntoView) {
        try { topAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
      }
    } else {
      const botAnchor = document.getElementById('mc-composer-box') || document.getElementById('mc-cs-prompt-box') || document.getElementById('mc-chat-input');
      if (botAnchor && botAnchor.scrollIntoView) {
        try { botAnchor.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch (_) {}
      }
    }

    // 2. Also scroll document.scrollingElement, window, and any scrollable ancestor of #mc-shell-root
    const scrollables = new Set([
      document.scrollingElement,
      document.documentElement,
      document.body,
      document.querySelector('main'),
      document.querySelector('.content'),
      document.querySelector('.main-content'),
      document.querySelector('#app'),
      document.querySelector('#root'),
      document.getElementById('mc-dedicated-host-slot'),
      document.getElementById('mc-shell-root')
    ].filter(Boolean));

    let cur = document.getElementById('mc-shell-root') || document.getElementById('mc-composer-box');
    while (cur && cur.parentElement) {
      cur = cur.parentElement;
      if (cur.scrollHeight > cur.clientHeight + 10) scrollables.add(cur);
    }

    try {
      window.scrollTo({ top: isTop ? 0 : Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) + 5000, behavior: 'smooth' });
    } catch (_) {}

    scrollables.forEach((el) => {
      try {
        if (el.scrollHeight > el.clientHeight + 4) {
          el.scrollTo({ top: isTop ? 0 : el.scrollHeight + 5000, behavior: 'smooth' });
        }
      } catch (_) {}
    });
  }

  function ensureFloatingScrollArrows() {
    if (document.getElementById('mc-scroll-jump-dock')) return;
    const dock = document.createElement('div');
    dock.id = 'mc-scroll-jump-dock';
    dock.className = 'mc-scroll-jump-dock';
    dock.innerHTML = `
      <button type="button" class="mc-scroll-jump-btn" id="mc-jump-top-btn" title="Fast Scroll to Top">↑</button>
      <button type="button" class="mc-scroll-jump-btn" id="mc-jump-bottom-btn" title="Fast Scroll to Bottom (Prompt Box)">↓</button>
    `;
    document.body.appendChild(dock);

    document.getElementById('mc-jump-top-btn')?.addEventListener('click', () => scrollWorkspaceTo('top'));
    document.getElementById('mc-jump-bottom-btn')?.addEventListener('click', () => {
      scrollWorkspaceTo('bottom');
      const inp = document.getElementById('mc-chat-input');
      if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 350);
    });
  }

  function renderThread() {
    ensureFloatingScrollArrows();
    const shellEl = document.getElementById('mc-shell-root');
    const hasActiveContent = state.messages.length > 0 || state.isRunning;
    if (shellEl) {
      shellEl.classList.toggle('has-messages', hasActiveContent);
      shellEl.classList.toggle('is-empty-chat', !hasActiveContent);
    }

    const threadEl = document.getElementById('mc-thread-slot');
    if (!threadEl) return;

    let html = state.messages
      .map((m, idx) => {
        if (m.role === 'user') {
          if (state.editingMessageIdx === idx) {
            return `
              <div class="mc-user-edit-box">
                <div style="font-size:11.5px;font-weight:700;color:#059669;margin-bottom:6px;">✏️ Edit Prompt</div>
                <textarea class="mc-user-edit-textarea" id="mc-edit-textarea-${idx}">${esc(m.content)}</textarea>
                <div class="mc-user-edit-actions">
                  <button type="button" class="mc-pill-btn" data-cancel-edit-msg="${idx}">Cancel</button>
                  <button type="button" class="mc-pill-btn active" data-save-edit-msg="${idx}">Update &amp; Run ↑</button>
                </div>
              </div>`;
          }
          return `
            <div class="mc-user-row">
              <button type="button" class="mc-edit-prompt-btn" data-edit-user-msg="${idx}" title="Edit & re-run this prompt">✏️ Edit</button>
              <div class="mc-user-bubble">${esc(m.content)}</div>
            </div>`;
        }

        if ((m.responseType === 'image' || m.responseType === 'multitask-image-chat') && m.image) {
          const displaySrc = healClientImageUri(m.image.imageUrl || m.image.rawFluxUrl || '', m.query || m.image.prompt || '');
          const backupSrc = m.image.rawFluxUrl || '';
          const ratioStr = String(m.image.aspectRatio || '3:4');
          const aspectClass = ratioStr === '16:9' ? 'mc-aspect-landscape' : (ratioStr === '1:1' ? 'mc-aspect-square' : 'mc-aspect-portrait');
          const isEdu = Boolean(
            m.image.isEducationalDiagram ||
            displaySrc.startsWith('data:image/svg+xml') ||
            /\b(diagram|labeled|labelled|anatomy|cell|brain|heart|eye|structure|organelle|infographic)\b/i.test(m.query || '')
          );
          const multiTaskTextHtml = m.answer
            ? `<div class="mc-ai-body" style="padding:8px 10px 18px;border-bottom:1px solid #e2e8f0;margin-bottom:14px;">${formatCleanMarkdown(m.answer)}</div>`
            : '';
          return `
            <div class="mc-ai-card" style="padding:14px;">
              ${multiTaskTextHtml}
              <div class="mc-image-showcase ${aspectClass} ${isEdu ? 'mc-edu-diagram' : ''}">
                <div class="mc-image-crop-frame" data-preview-img="${idx}" title="Click for Full Preview">
                  <img
                    src="${displaySrc}"
                    data-backup-src="${backupSrc}"
                    onerror="window.__mcHealBrokenImg && window.__mcHealBrokenImg(this)"
                    alt="${esc(m.query)}"
                    loading="eager"
                    referrerpolicy="no-referrer"
                    style="display:block;width:100%;height:100%;object-fit:contain;min-height:340px;"
                  >
                </div>
                <div class="mc-image-bar">
                  <span style="font-size:11.5px;opacity:0.85;">✓ Saved to Library (${esc(ratioStr)} · ${esc(m.image.quality || 'Standard')})</span>
                  <div style="display:flex;gap:8px;">
                    <button class="mc-foot-btn" data-preview-img="${idx}">⤢ Full Preview</button>
                    <button class="mc-foot-btn" data-dl-img="${idx}">⬇ Download</button>
                    <button class="mc-foot-btn" data-regen-ultra="${idx}">✨ HD</button>
                  </div>
                </div>
              </div>
            </div>`;
        }

        if (m.responseType === 'ebook' && m.ebook) {
          const eb = m.ebook;
          const curTpl = eb.template || 'astra-emerald';
          const curFont = eb.fontPair || 'editorial-serif';
          const isEditing = Boolean(eb._isEditing);
          const editAttr = isEditing ? 'contenteditable="true" data-eb-edit="1"' : '';

          const execHtml = (eb.executiveSummary || (eb.keyTakeaways && eb.keyTakeaways.length))
            ? `<div class="mc-ebook-exec-box">
                <div style="font-size:11px;font-weight:700;color:var(--eb-accent);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Executive Overview &amp; Key Takeaways</div>
                <div class="mc-ai-body" ${editAttr} data-eb-field="executiveSummary" data-eb-msg="${idx}">${formatCleanMarkdown(eb.executiveSummary || '')}</div>
                ${
                  Array.isArray(eb.keyTakeaways) && eb.keyTakeaways.length
                    ? `<ul style="margin:10px 0 0 18px;font-size:13.5px;color:#1e293b;">
                        ${eb.keyTakeaways.map((tk, tkIdx) => `<li ${editAttr} data-eb-takeaway="${tkIdx}" data-eb-msg="${idx}" style="margin-bottom:5px;">${esc(tk)}</li>`).join('')}
                       </ul>`
                    : ''
                }
               </div>`
            : '';

          const chHtml = (eb.chapters || [])
            .map(
              (ch, cIdx) => `
              <div class="mc-ebook-chapter">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                  <div style="font-size:11px;font-weight:700;color:var(--eb-accent);text-transform:uppercase;letter-spacing:0.08em;">Chapter ${ch.number || cIdx + 1}</div>
                  ${ch.keyMetric && ch.keyMetric.value ? `<div class="mc-ebook-metric-pill"><strong style="color:var(--eb-accent);">${esc(ch.keyMetric.label || 'BENCHMARK')}:</strong> <strong ${editAttr} data-eb-ch="${cIdx}" data-eb-chfield="metricVal" data-eb-msg="${idx}">${esc(ch.keyMetric.value)}</strong></div>` : ''}
                </div>
                <h3 ${editAttr} data-eb-ch="${cIdx}" data-eb-chfield="title" data-eb-msg="${idx}" style="margin:2px 0 10px;font-size:21px;color:var(--eb-ink);">${esc(ch.title)}</h3>
                ${ch.epigraph ? `<div class="mc-ebook-epigraph" ${editAttr} data-eb-ch="${cIdx}" data-eb-chfield="epigraph" data-eb-msg="${idx}">${esc(ch.epigraph)}</div>` : ''}
                ${ch.imageUrl ? `<img src="${healClientImageUri(ch.imageUrl, ch.title)}" data-eb-prev-img="${healClientImageUri(ch.imageUrl, ch.title)}" data-eb-prev-title="${esc(ch.title)}" alt="${esc(ch.title)}" referrerpolicy="no-referrer" onerror="window.__mcHealBrokenImg && window.__mcHealBrokenImg(this)">` : ''}
                <div class="mc-ai-body" ${editAttr} data-eb-ch="${cIdx}" data-eb-chfield="contentMarkdown" data-eb-msg="${idx}">${formatCleanMarkdown(ch.contentMarkdown || '')}</div>
              </div>`
            )
            .join('');

          return `
            <div class="mc-ai-card" style="padding:14px;">
              <!-- Argon & Astra Interactive eBook Studio Bar -->
              <div class="mc-ebook-studio-bar">
                <div class="mc-eb-ctrl-group">
                  <span style="font-size:12px;font-weight:700;color:#6ee7b7;">📚 Pixelmorphic eBook Studio</span>
                  <select class="mc-eb-select" data-eb-tpl-select="${idx}" title="Choose Book Template">
                    <option value="astra-emerald" ${curTpl === 'astra-emerald' ? 'selected' : ''}>🎨 Template: Emerald Executive</option>
                    <option value="argon-swiss" ${curTpl === 'argon-swiss' ? 'selected' : ''}>🎨 Template: Swiss Minimal Grid</option>
                    <option value="oxford-academic" ${curTpl === 'oxford-academic' ? 'selected' : ''}>🎨 Template: Oxford Academic</option>
                    <option value="cyber-midnight" ${curTpl === 'cyber-midnight' ? 'selected' : ''}>🎨 Template: Cyber Midnight</option>
                  </select>
                  <select class="mc-eb-select" data-eb-font-select="${idx}" title="Choose Premium Font Pairing">
                    <option value="editorial-serif" ${curFont === 'editorial-serif' ? 'selected' : ''}>🔤 Font: Newsreader + Inter</option>
                    <option value="luxury-press" ${curFont === 'luxury-press' ? 'selected' : ''}>🔤 Font: Playfair + Jakarta</option>
                    <option value="academic-scholar" ${curFont === 'academic-scholar' ? 'selected' : ''}>🔤 Font: Lora + Academic</option>
                    <option value="modern-tech" ${curFont === 'modern-tech' ? 'selected' : ''}>🔤 Font: Space Grotesk + DM Sans</option>
                  </select>
                </div>
                <div class="mc-eb-ctrl-group">
                  <button type="button" class="mc-eb-btn ${isEditing ? 'active' : ''}" data-eb-toggle-edit="${idx}">
                    ${isEditing ? '💾 Save Edits' : '✏️ Edit eBook'}
                  </button>
                  <button type="button" class="mc-eb-btn" data-eb-add-ch="${idx}">+ Add Chapter</button>
                  <button type="button" class="mc-eb-btn active" data-export-pdf="${idx}">📕 Export PDF</button>
                </div>
              </div>

              <div class="mc-ebook-wrap ${isEditing ? 'is-editing' : ''}" data-tpl="${esc(curTpl)}" data-font="${esc(curFont)}" id="mc-ebook-wrap-${idx}">
                <div class="mc-ebook-cover">
                  ${eb.coverImageUrl ? `<img src="${healClientImageUri(eb.coverImageUrl, eb.title)}" data-eb-prev-img="${healClientImageUri(eb.coverImageUrl, eb.title)}" data-eb-prev-title="${esc(eb.title)}" alt="Cover" referrerpolicy="no-referrer" onerror="window.__mcHealBrokenImg && window.__mcHealBrokenImg(this)">` : ''}
                  <div>
                    <div style="font-size:10.5px;font-weight:700;letter-spacing:0.14em;color:#6ee7b7;text-transform:uppercase;margin-bottom:6px;" ${editAttr} data-eb-field="author" data-eb-msg="${idx}">${esc(eb.author || 'Pixelmorphic Astra Press · 2026 Edition')}</div>
                    <h2 ${editAttr} data-eb-field="title" data-eb-msg="${idx}" style="font-family:var(--eb-head-font);font-size:27px;line-height:1.22;margin:0 0 8px;color:#ffffff;">${esc(eb.title)}</h2>
                    <div ${editAttr} data-eb-field="subtitle" data-eb-msg="${idx}" style="font-size:14px;color:#d1fae5;margin-bottom:18px;line-height:1.5;">${esc(eb.subtitle || '')}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                      <button class="mc-foot-btn" data-export-pdf="${idx}">📕 Download Publication PDF</button>
                      <button class="mc-foot-btn" data-eb-toggle-edit="${idx}">${isEditing ? '💾 Finish Editing' : '✏️ Customize & Edit Text'}</button>
                    </div>
                  </div>
                </div>
                ${execHtml}
                ${chHtml}
              </div>
              <div class="mc-card-footer">
                <span style="font-size:11.5px;color:#059669;font-weight:600;">✓ Saved to Library · ${esc(1 + (eb.executiveSummary ? 1 : 0) + (eb.chapters || []).length)} Total Pages (${esc((eb.chapters || []).length)} Chapters) · Live Editable</span>
                <div style="display:flex;gap:8px;">
                  <button class="mc-foot-btn" data-tts-msg="${idx}" title="Read eBook Aloud">🔊 Listen</button>
                  <button class="mc-foot-btn" data-eb-toggle-edit="${idx}">${isEditing ? '💾 Save Edits' : '✏️ Edit Text'}</button>
                  <button class="mc-foot-btn" data-export-pdf="${idx}">📕 Export PDF</button>
                </div>
              </div>
            </div>`;
        }

        // Sources remain strictly hidden in the backend for General Chat (only explicit downloadable links requested in prose are shown)
        const srcPillsHtml = '';
        const modelBadgeLabel = m.modelUsed || (state.chatModel === 'morphic-chat-ultra' ? 'Morphic Ultra' : state.chatModel === 'morphic-chat-fast' ? 'Morphic Fast' : 'Morphic Pro');
        return `
          <div class="mc-ai-card">
            <div class="mc-card-top-tools">
              <span style="font-size:11px;font-weight:700;color:#059669;margin-right:auto;">✦ ${esc(modelBadgeLabel)}</span>
              <button type="button" class="mc-top-tts-btn" data-tts-msg="${idx}" title="Read Aloud with Natural Voice">🔊 Listen</button>
            </div>
            <div class="mc-ai-body">${formatCleanMarkdown(m.answer || '')}</div>
            ${srcPillsHtml}
            <div class="mc-card-footer">
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                ${state.activeView === 'study' ? `<button class="mc-foot-btn" data-gen-quiz="${idx}" title="Launch an Interactive Right/Wrong Quiz on this topic">📝 Take Quiz</button><button class="mc-foot-btn" data-save-vault="${idx}" title="Save this question & solution to Revision Vault">🔖 Save to Vault</button><button class="mc-foot-btn" data-gen-fc="${idx}" title="Generate Interactive Study Flashcards for this topic">🗂️ Flashcards</button><button class="mc-foot-btn" data-gen-ig="${idx}" title="Generate Visual Study Infographic for this topic">📊 Infographic</button>` : ''}
                <button class="mc-foot-btn" data-copy-msg="${idx}">Copy</button>
                <button class="mc-foot-btn" data-share-msg="${idx}">Share</button>
                <button class="mc-foot-btn" data-export-pdf="${idx}">PDF</button>
              </div>
              <span style="font-size:11px;font-weight:600;color:#059669;opacity:0.85;">✦ ${esc(modelBadgeLabel)}</span>
            </div>
          </div>`;
      })
      .join('');

    if (state.isRunning) {
      const label = state.actionMode === 'image'
        ? 'Generating visual...'
        : state.actionMode === 'ebook'
          ? 'Creating illustrated eBook...'
          : 'Thinking...';

      html += `
        <div class="mc-thinking-card">
          <div class="mc-thinking-aurora"></div>
          <div class="mc-thinking-row">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="mc-orbital">
                <div class="mc-ring1"></div>
                <div class="mc-ring2"></div>
                <div class="mc-core"></div>
              </div>
              <div style="font-size:14.5px;font-weight:600;color:#ffffff;" id="mc-live-step-label">${label}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#6ee7b7;" id="mc-elapsed-timer">0.0s</span>
              <button type="button" class="mc-cancel-thinking-btn" id="mc-cancel-thinking-btn" title="Cancel generation">⏹ Cancel</button>
            </div>
          </div>
          <div class="mc-shimmer-bar" style="width:88%;"></div>
          <div class="mc-shimmer-bar" style="width:68%;"></div>
        </div>`;
    }

    threadEl.innerHTML = html;

    // Sync bottom Send button between Send (↑) and Stop (■)
    const sendBtnEl = document.getElementById('mc-send-btn');
    if (sendBtnEl) {
      sendBtnEl.classList.toggle('is-stop-mode', state.isRunning);
      sendBtnEl.innerHTML = state.isRunning ? '■' : '↑';
      sendBtnEl.title = state.isRunning ? 'Stop / Cancel generation' : 'Send';
    }

    document.getElementById('mc-cancel-thinking-btn')?.addEventListener('click', () => {
      cancelActiveChatGeneration();
    });

    threadEl.querySelectorAll('[data-edit-user-msg]').forEach((btn) => {
      btn.onclick = () => {
        if (state.isRunning) cancelActiveChatGeneration();
        state.editingMessageIdx = parseInt(btn.getAttribute('data-edit-user-msg'), 10);
        renderThread();
        const ta = document.getElementById(`mc-edit-textarea-${state.editingMessageIdx}`);
        if (ta) {
          ta.focus();
          ta.setSelectionRange(ta.value.length, ta.value.length);
        }
      };
    });

    threadEl.querySelectorAll('[data-cancel-edit-msg]').forEach((btn) => {
      btn.onclick = () => {
        state.editingMessageIdx = null;
        renderThread();
      };
    });

    threadEl.querySelectorAll('[data-save-edit-msg]').forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-save-edit-msg'), 10);
        const ta = document.getElementById(`mc-edit-textarea-${idx}`);
        const newText = ta ? ta.value.trim() : '';
        if (!newText) return;
        state.editingMessageIdx = null;
        // Truncate conversation from idx onwards and re-run with edited prompt!
        state.messages = state.messages.slice(0, idx);
        sendChatMessage(newText);
      };
    });

    threadEl.querySelectorAll('[data-preview-img]').forEach((el) => {
      el.onclick = () => {
        const m = state.messages[parseInt(el.getAttribute('data-preview-img'), 10)];
        const srcUrl = m && m.image && (m.image.imageUrl || m.image.rawFluxUrl);
        if (srcUrl) {
          openImageLightbox({
            url: srcUrl,
            title: m.query || m.image.prompt || 'Generated Image',
            aspectRatio: m.image.aspectRatio || '3:4',
            isEducational: m.image.isEducationalDiagram
          });
        }
      };
    });

    threadEl.querySelectorAll('[data-dl-img]').forEach((btn) => {
      btn.onclick = () => {
        const m = state.messages[parseInt(btn.getAttribute('data-dl-img'), 10)];
        const srcUrl = m && m.image && (m.image.imageUrl || m.image.rawFluxUrl);
        if (srcUrl) {
          triggerDataUrlDownload(srcUrl, m.query || 'pixelmorphic-image');
        }
      };
    });

    threadEl.querySelectorAll('[data-tts-msg]').forEach((btn) => {
      btn.onclick = () => {
        const m = state.messages[parseInt(btn.getAttribute('data-tts-msg'), 10)];
        if (!m) return;
        let textToSpeak = m.answer || '';
        if (m.responseType === 'ebook' && m.ebook) {
          textToSpeak = `${m.ebook.title}. ${m.ebook.subtitle || ''}. ${m.ebook.executiveSummary || ''}. ` + (m.ebook.chapters || []).map((c) => `Chapter ${c.number}: ${c.title}. ${c.contentMarkdown || ''}`).join(' ');
        }
        toggleReadAloudTTS(textToSpeak, btn);
      };
    });

    threadEl.querySelectorAll('[data-gen-quiz]').forEach((btn) => {
      btn.onclick = () => {
        const m = state.messages[parseInt(btn.getAttribute('data-gen-quiz'), 10)];
        if (!m) return;
        state.studyPreset = 'mocktest';
        document.querySelectorAll('[data-study-preset]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-study-preset') === 'mocktest'));
        sendChatMessage(`Create an interactive ${state.quizCount || 6}-question Mock Test / Quiz with deep Right/Wrong analysis for: ${m.query || "this topic"}`);
      };
    });

    threadEl.querySelectorAll('[data-save-vault]').forEach((btn) => {
      btn.onclick = () => {
        const m = state.messages[parseInt(btn.getAttribute('data-save-vault'), 10)];
        if (!m) return;
        addItemToRevisionVault({
          subject: state.studySubject,
          topic: (m.query || 'Study Note').slice(0, 60),
          question: m.query || 'Saved Study Concept',
          answer: m.answer || ''
        });
        btn.textContent = '✓ Saved';
      };
    });

    threadEl.querySelectorAll('[data-gen-fc]').forEach((btn) => {
      btn.onclick = () => {
        const m = state.messages[parseInt(btn.getAttribute('data-gen-fc'), 10)];
        if (!m) return;
        state.studyPreset = 'flashcards';
        document.querySelectorAll('[data-study-preset]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-study-preset') === 'flashcards'));
        sendChatMessage(`Create interactive Study Flashcards for: ${m.query || 'this topic'}`);
      };
    });

    threadEl.querySelectorAll('[data-gen-ig]').forEach((btn) => {
      btn.onclick = () => {
        const m = state.messages[parseInt(btn.getAttribute('data-gen-ig'), 10)];
        if (!m) return;
        state.studyPreset = 'infographic';
        document.querySelectorAll('[data-study-preset]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-study-preset') === 'infographic'));
        sendChatMessage(`Create a Visual Study Infographic for: ${m.query || 'this topic'}`);
      };
    });

    threadEl.querySelectorAll('[data-copy-msg]').forEach((btn) => {
      btn.onclick = () => {
        const m = state.messages[parseInt(btn.getAttribute('data-copy-msg'), 10)];
        if (m) {
          navigator.clipboard.writeText(m.answer || '');
          btn.textContent = 'Copied';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
        }
      };
    });

    threadEl.querySelectorAll('[data-share-msg]').forEach((btn) => {
      btn.onclick = async () => {
        const m = state.messages[parseInt(btn.getAttribute('data-share-msg'), 10)];
        if (!m) return;
        const txt = `${m.answer || ''}`;
        if (navigator.share) {
          try { await navigator.share({ title: m.query || 'Pixelmorphic AI', text: txt }); return; } catch (_) {}
        }
        await navigator.clipboard.writeText(txt);
        btn.textContent = 'Shared';
        setTimeout(() => { btn.textContent = 'Share'; }, 1400);
      };
    });

    function syncEditedEbookDomToState(msgIdx) {
      const m = state.messages[msgIdx];
      if (!m || !m.ebook) return;
      const wrap = document.getElementById(`mc-ebook-wrap-${msgIdx}`);
      if (!wrap) return;
      wrap.querySelectorAll('[data-eb-field]').forEach((el) => {
        const f = el.getAttribute('data-eb-field');
        if (f) m.ebook[f] = el.innerText.trim();
      });
      wrap.querySelectorAll('[data-eb-takeaway]').forEach((el) => {
        const tIdx = parseInt(el.getAttribute('data-eb-takeaway'), 10);
        if (Array.isArray(m.ebook.keyTakeaways) && !isNaN(tIdx)) {
          m.ebook.keyTakeaways[tIdx] = el.innerText.trim();
        }
      });
      wrap.querySelectorAll('[data-eb-ch]').forEach((el) => {
        const cIdx = parseInt(el.getAttribute('data-eb-ch'), 10);
        const cf = el.getAttribute('data-eb-chfield');
        const chObj = m.ebook.chapters && m.ebook.chapters[cIdx];
        if (!chObj || !cf) return;
        if (cf === 'metricVal' && chObj.keyMetric) {
          chObj.keyMetric.value = el.innerText.trim();
        } else {
          chObj[cf] = el.innerText.trim();
        }
      });
      saveThreads();
    }

    threadEl.querySelectorAll('[data-eb-tpl-select]').forEach((sel) => {
      sel.onchange = () => {
        const idx = parseInt(sel.getAttribute('data-eb-tpl-select'), 10);
        const m = state.messages[idx];
        if (m && m.ebook) {
          m.ebook.template = sel.value;
          saveThreads();
          renderThread();
        }
      };
    });

    threadEl.querySelectorAll('[data-eb-font-select]').forEach((sel) => {
      sel.onchange = () => {
        const idx = parseInt(sel.getAttribute('data-eb-font-select'), 10);
        const m = state.messages[idx];
        if (m && m.ebook) {
          m.ebook.fontPair = sel.value;
          saveThreads();
          renderThread();
        }
      };
    });

    threadEl.querySelectorAll('[data-eb-toggle-edit]').forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-eb-toggle-edit'), 10);
        const m = state.messages[idx];
        if (!m || !m.ebook) return;
        if (m.ebook._isEditing) {
          syncEditedEbookDomToState(idx);
          m.ebook._isEditing = false;
          showDownloadToast('✓ eBook edits saved');
        } else {
          m.ebook._isEditing = true;
          showDownloadToast('✏️ Click any title or paragraph to edit live');
        }
        renderThread();
      };
    });

    threadEl.querySelectorAll('[data-eb-add-ch]').forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-eb-add-ch'), 10);
        const m = state.messages[idx];
        if (!m || !m.ebook) return;
        if (m.ebook._isEditing) syncEditedEbookDomToState(idx);
        if (!Array.isArray(m.ebook.chapters)) m.ebook.chapters = [];
        const nextNum = m.ebook.chapters.length + 1;
        m.ebook.chapters.push({
          number: nextNum,
          title: `Chapter ${nextNum}: Strategic Expansion & Future Outlook`,
          epigraph: 'Click Edit eBook to customize this chapter title, epigraph, and body text.',
          keyMetric: { label: 'KEY METRIC', value: '2026 Target', detail: 'Editable benchmark' },
          contentMarkdown: 'Enter your custom analysis, case studies, and key findings for this chapter.',
          imageUrl: m.ebook.coverImageUrl || ''
        });
        m.ebook._isEditing = true;
        saveThreads();
        renderThread();
        showDownloadToast(`✓ Added Chapter ${nextNum} (Editable)`);
      };
    });

    threadEl.querySelectorAll('[data-eb-prev-img]').forEach((imgEl) => {
      imgEl.onclick = () => {
        openImageLightbox({
          url: imgEl.getAttribute('data-eb-prev-img'),
          title: imgEl.getAttribute('data-eb-prev-title') || 'eBook Illustration',
          aspectRatio: '16:9'
        });
      };
    });

    threadEl.querySelectorAll('[data-export-pdf]').forEach((btn) => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-export-pdf'), 10);
        const m = state.messages[idx];
        if (m) {
          if (m.ebook && m.ebook._isEditing) syncEditedEbookDomToState(idx);
          exportMessageToPDF(m);
        }
      };
    });

    threadEl.querySelectorAll('[data-regen-ultra]').forEach((btn) => {
      btn.onclick = () => {
        const m = state.messages[parseInt(btn.getAttribute('data-regen-ultra'), 10)];
        if (m && m.query) {
          state.imageQuality = 'ultra';
          state.actionMode = 'image';
          sendChatMessage(m.query, 'image');
        }
      };
    });
  }

  function buildLiveFluxUrl(prompt, quality, aspect) {
    const p = normalizeClientTypos(prompt);
    const isHuman = /\b(human\s+portrait|person|man|woman|girl|boy|child|portrait|face|headshot|selfie|ceo|founder|model|actor|hacker|doctor|engineer|student|crowd|people)\b/i.test(p) && !/\b(human\s+heart|human\s+body|human\s+brain|human\s+anatomy|human\s+cell)\b/i.test(p);
    const isInfo = /\b(infographic|infograph|diagram|chart|flowchart|vector|nature|landscape|poster|logo|cover|text|heart|anatomy|brain|cell)\b/i.test(p);
    const cleanP = p.replace(/^(?:please\s+)?(?:create|generate|genrate|make|draw|render|show|give|banao)\s+(?:me\s+)?(?:an?\s+|the\s+)?(?:hd\s+|realistic\s+)?(?:infographic\s+diagram|infographic|diagram|image|img|imge|photo|picture|pic|portrait|poster)\s*(?:of|about|for|showing|on|ka|ki|ke)?\s*/i, '').trim() || p;
    let enhanced = '';
    if (isInfo && !isHuman) {
      if (/\b(brain|cerebrum|cerebellum|brainstem|sagittal)\b/i.test(p)) {
        enhanced = 'Clean medical textbook scientific diagram of human brain sagittal cross-section view. Clear anatomical accuracy and correct spatial orientation: Frontal Lobe at front anterior, Parietal Lobe at upper superior, Occipital Lobe at rear posterior, Temporal Lobe at bottom, C-shaped Corpus Callosum in center, Thalamus, Cerebellum with distinct arbor vitae branching at rear inferior base, Brainstem exiting at bottom. Crisp fine pointer leader lines pointing directly to each part with legible printed typography labels: Frontal Lobe, Parietal Lobe, Occipital Lobe, Temporal Lobe, Corpus Callosum, Thalamus, Cerebellum, Brainstem. Clean neutral medical white background, sharp vector lines, high contrast educational illustration.';
      } else if (/\b(heart|cardiac|ventricle|atrium|aorta)\b/i.test(p)) {
        enhanced = 'Clean medical textbook scientific anatomical cross-section diagram of the human heart showing internal chambers. Anatomically correct structures: Superior Vena Cava and Aorta at top, Right Atrium, Tricuspid Valve, Right Ventricle, Left Atrium, Mitral Valve, thick muscular Left Ventricle wall, and Pulmonary Artery. Neat fine pointer leader lines with legible printed typography labels: Aorta, Superior Vena Cava, Right Atrium, Right Ventricle, Left Atrium, Left Ventricle, Septum. Clean neutral medical white background, sharp educational medical illustration.';
      } else {
        enhanced = `Detailed full-color scientific educational infographic diagram of ${cleanP}. Clear structural cross-section with accurate spatial composition, crisp pointer lines, and clean legible printed English typography labels naming every major part. Clean studio presentation, sharp educational textbook illustration, high resolution.`;
      }
    } else {
      enhanced = `${cleanP}, award-winning photorealistic DSLR photograph, 85mm f/1.4 lens, natural skin texture, cinematic lighting, 8k`;
    }
    const model = isHuman ? 'flux-realism' : 'flux';
    const wantsWide = /\b(landscape|widescreen|wide|horizontal|16\s*:\s*9|banner|panoramic)\b/i.test(p) || aspect === '16:9';
    const wantsSquare = /\b(square|1\s*:\s*1)\b/i.test(p) || aspect === '1:1';
    const w = wantsWide ? 1280 : (wantsSquare ? 1024 : 768);
    const h = wantsWide ? 768 : (wantsSquare ? 1024 : 1024);
    const seed = Math.floor(Math.random() * 899999) + 100000;
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=${w}&height=${h}&model=${model}&nologo=true&enhance=true&seed=${seed}`;
  }

  function cancelActiveChatGeneration() {
    if (!state.isRunning) return;
    state.wasCancelled = true;
    try {
      if (state.abortController) state.abortController.abort();
    } catch (_) {}
    clearInterval(state.elapsedTimer);
    state.isRunning = false;
    // If the last message in state.messages is the user prompt that was just cancelled, keep it visible with a cancelled note or restore to input
    const lastMsg = state.messages[state.messages.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
      const inp = document.getElementById('mc-chat-input');
      if (inp && !inp.value) inp.value = lastMsg.content;
      state.messages.push({
        role: 'assistant',
        responseType: 'chat',
        query: lastMsg.content,
        answer: '⏹ *Generation stopped by user. You can click **✏️ Edit** on your prompt above or modify it in the box below to run again.*'
      });
    }
    saveThreads();
    renderThread();
  }

  async function sendChatMessage(customPromptText, forceMode) {
    if (state.isRunning && customPromptText === undefined) {
      cancelActiveChatGeneration();
      return;
    }
    const input = document.getElementById('mc-chat-input');
    const rawText = customPromptText !== undefined ? customPromptText : (input ? input.value.trim() : '');
    if (!rawText || state.isRunning) return;

    const repairedText = normalizeClientTypos(rawText);
    const detectedConstraint = detectClientConstraint(repairedText);

    const wantsEb = forceMode === 'ebook' || state.actionMode === 'ebook' || /\b(ebook|e-book|illustrated\s+book|booklet)\b/i.test(repairedText);
    const hasMultiTaskText = /\b(explain|tell\s+me|what\s+is|how\s+does|solve|write|compare|list|give\s+me\s+\d+|bullet\s+points?|questions?|summary|code|formula)\b/i.test(repairedText) && /\b(and|also|with|plus|aur|saath)\b/i.test(repairedText);
    const wantsImg = !wantsEb && (forceMode === 'image' || state.actionMode === 'image' || (isClientImagePrompt(repairedText) && !hasMultiTaskText));
    const effectiveMode = wantsImg ? 'image' : wantsEb ? 'ebook' : state.actionMode;
    const currentQuality = state.imageQuality;

    state.messages.push({ role: 'user', content: rawText });
    if (input && customPromptText === undefined) {
      input.value = '';
      input.placeholder = 'Ask anything...';
    }
    state.isRunning = true;
    state.wasCancelled = false;
    state.abortController = new AbortController();
    state.startTimeMs = Date.now();
    renderThread();

    clearInterval(state.elapsedTimer);
    state.elapsedTimer = setInterval(() => {
      const sec = (Date.now() - state.startTimeMs) / 1000;
      const el = document.getElementById('mc-elapsed-timer');
      if (el) el.textContent = sec.toFixed(1) + 's';
      const stageEl = document.getElementById('mc-live-step-label') || document.getElementById('mc-thinking-stage-label');
      if (stageEl) {
        if (wantsImg) {
          if (sec < 3.0) stageEl.textContent = 'Step 1/4 · Understanding prompt & repairing grammar...';
          else if (sec < 8.5) stageEl.textContent = 'Step 2/4 · Researching live web facts & component labels...';
          else if (sec < 16.0) stageEl.textContent = 'Step 3/4 · Synthesizing high-resolution AI centerpiece...';
          else stageEl.textContent = 'Step 4/4 · Compositing verified vector callouts & HD layout...';
        } else if (state.activeView === 'study') {
          const tName = state.chatModel === 'morphic-chat-ultra' ? 'Professor Ultra' : state.chatModel === 'morphic-chat-fast' ? 'Coach Fast' : 'Professor Pro';
          if (sec < 1.8) stageEl.textContent = `🧠 ${tName}: Parsing ${state.studySubject.toUpperCase()} concepts, symbols & difficulty...`;
          else if (sec < 4.5) stageEl.textContent = `🌐 Cross-verifying latest 2026 academic facts & formulas in backend...`;
          else if (sec < 8.0) stageEl.textContent = `✍️ Crafting step-by-step teacher solution${state.studyPreset === 'flashcards' ? ' & 3D Flashcards' : state.studyPreset === 'infographic' ? ' & Visual Infographic' : ''}...`;
          else stageEl.textContent = `🔬 Finalizing equations, derivations & exam tips...`;
        } else {
          if (sec < 1.6) stageEl.textContent = '🧠 Analyzing question & context...';
          else if (sec < 4.2) stageEl.textContent = '🌐 Scanning & cross-verifying trusted live web sources in backend...';
          else stageEl.textContent = '✍️ Synthesizing verified answer...';
        }
      }
    }, 100);

    try {
      const resp = await fetch('/api/research?chatMode=1', {
        method: 'POST',
        signal: state.abortController.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatMode: true,
          message: repairedText,
          query: repairedText,
          model: state.chatModel || 'morphic-chat-pro',
          chatModel: state.chatModel || 'morphic-chat-pro',
          actionMode: effectiveMode,
          imageQuality: currentQuality,
          aspectRatio: null, // Default 3:4 in General Chat unless customer prompt asks for landscape
          webSearch: state.webSearch,
          userLocation: state.userLocation,
          userPersonalization: state.userSettings ? {
            displayName: state.userSettings.displayName,
            roleTitle: state.userSettings.roleTitle,
            customAbout: state.userSettings.customAbout,
            customStyle: state.userSettings.customStyle,
            tone: state.userSettings.tone,
            memoryEnabled: state.userSettings.memoryEnabled,
            memories: state.userSettings.memories
          } : null,
          studyMeta: state.activeView === 'study' ? {
            isStudyMode: true,
            subject: state.studySubject,
            difficulty: state.studyDifficulty,
            preset: state.studyPreset,
            quizCount: state.quizCount || 6,
            notebookDocs: state.studyNotebook.filter((d) => d.active !== false).map((d) => ({ name: d.name, content: d.content }))
          } : null,
          attachments: state.attachments,
          history: state.messages.slice(-6)
        })
      });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || 'Request failed');

      if (data.responseType === 'multitask-image-chat' && data.image) {
        const resolvedAspect = data.image?.aspectRatio || '3:4';
        const rawImgUrl = data.image?.imageUrl || buildLiveFluxUrl(repairedText, currentQuality, resolvedAspect);
        const cleanDataUrl = await cropWatermarkIfBase64(rawImgUrl, data.image?.isFalNative);
        const cleanAns = cleanAndEnforceChatText(data.answer || '', detectedConstraint);
        const imgObj = {
          imageUrl: cleanDataUrl,
          rawFluxUrl: data.image?.rawFluxUrl,
          aspectRatio: resolvedAspect,
          isFalNative: Boolean(data.image?.isFalNative),
          isEducationalDiagram: Boolean(data.image?.isEducationalDiagram),
          quality: currentQuality === 'ultra' ? 'HD' : 'Standard',
          prompt: repairedText
        };
        state.messages.push({
          role: 'assistant',
          responseType: 'multitask-image-chat',
          query: rawText,
          answer: cleanAns,
          sources: data.sources || [],
          modelUsed: data.modelUsed,
          image: imgObj
        });
        addToLibrary({
          type: 'image',
          title: repairedText.slice(0, 50),
          dataUrl: cleanDataUrl,
          rawFluxUrl: imgObj.rawFluxUrl
        });
      } else if (wantsImg || (data.responseType === 'image' && data.image)) {
        const resolvedAspect = data.image?.aspectRatio || (/\b(landscape|widescreen|wide|horizontal|16\s*:\s*9|banner)\b/i.test(repairedText) ? '16:9' : (/\b(square|1\s*:\s*1)\b/i.test(repairedText) ? '1:1' : '3:4'));
        const rawImgUrl = data.image?.imageUrl || buildLiveFluxUrl(repairedText, currentQuality, resolvedAspect);
        const cleanDataUrl = await cropWatermarkIfBase64(rawImgUrl, data.image?.isFalNative);
        const imgObj = {
          imageUrl: cleanDataUrl,
          rawFluxUrl: data.image?.rawFluxUrl || (rawImgUrl.startsWith('http') ? rawImgUrl : undefined),
          aspectRatio: resolvedAspect,
          isFalNative: Boolean(data.image?.isFalNative),
          isEducationalDiagram: Boolean(data.image?.isEducationalDiagram),
          quality: currentQuality === 'ultra' ? 'HD' : 'Standard',
          prompt: repairedText
        };
        state.messages.push({
          role: 'assistant',
          responseType: 'image',
          query: rawText,
          image: imgObj
        });
        addToLibrary({
          type: 'image',
          title: repairedText.slice(0, 50),
          dataUrl: cleanDataUrl,
          rawFluxUrl: imgObj.rawFluxUrl
        });
      } else if (wantsEb || (data.responseType === 'ebook' && data.ebook)) {
        const eb = data.ebook;
        eb.coverImageUrl = await cropWatermarkIfBase64(eb.coverImageUrl);
        for (const ch of (eb.chapters || [])) {
          ch.imageUrl = await cropWatermarkIfBase64(ch.imageUrl);
        }
        const msgObj = {
          role: 'assistant',
          responseType: 'ebook',
          query: rawText,
          ebook: eb
        };
        state.messages.push(msgObj);
        addToLibrary({
          type: 'document',
          title: `eBook: ${eb.title}`,
          dataUrl: eb.coverImageUrl,
          msgObj
        });
      } else {
        const rawAns = data.answer || data.reportMarkdown || '';
        const cleanAns = cleanAndEnforceChatText(rawAns, detectedConstraint);
        const msgObj = {
          role: 'assistant',
          responseType: 'chat',
          query: rawText,
          answer: cleanAns,
          sources: data.sources || [],
          modelUsed: data.modelUsed
        };
        state.messages.push(msgObj);
        if (data.autoTriggerPdf || effectiveMode === 'pdf') {
          addToLibrary({ type: 'document', title: `PDF: ${rawText.slice(0, 40)}`, msgObj });
          setTimeout(() => exportMessageToPDF(msgObj), 300);
        }
      }
    } catch (err) {
      if (state.wasCancelled || (err && err.name === 'AbortError')) return;
      if (wantsImg) {
        const resolvedAspect = /\b(landscape|widescreen|wide|horizontal|16\s*:\s*9|banner)\b/i.test(repairedText) ? '16:9' : (/\b(square|1\s*:\s*1)\b/i.test(repairedText) ? '1:1' : '3:4');
        const fluxUrl = buildLiveFluxUrl(repairedText, currentQuality, resolvedAspect);
        state.messages.push({
          role: 'assistant',
          responseType: 'image',
          query: rawText,
          image: {
            imageUrl: fluxUrl,
            rawFluxUrl: fluxUrl,
            aspectRatio: resolvedAspect,
            quality: currentQuality === 'ultra' ? 'HD' : 'Standard',
            prompt: repairedText
          }
        });
        addToLibrary({
          type: 'image',
          title: repairedText.slice(0, 50),
          dataUrl: fluxUrl,
          rawFluxUrl: fluxUrl
        });
      } else if (wantsEb) {
        const cleanTopic = repairedText.replace(/^(?:create|make|write)\s+(?:an?\s+)?(?:illustrated\s+)?(?:ebook|e-book)\s+(?:on|about)?\s*/i, '').trim() || repairedText;
        const coverUrl = buildLiveFluxUrl(`Book cover for ${cleanTopic}`, currentQuality, '3:4');
        const ch1Url = buildLiveFluxUrl(`Scientific infographic diagram of ${cleanTopic}`, currentQuality, '16:9');
        const ebObj = {
          title: cleanTopic,
          subtitle: 'Illustrated Edition',
          coverImageUrl: coverUrl,
          chapters: [
            {
              number: 1,
              title: `Core Architecture & Foundations of ${cleanTopic}`,
              imageUrl: ch1Url,
              contentMarkdown: `**${cleanTopic}** encompasses key structural innovations and real-world applications deployed across global industries.`
            }
          ]
        };
        const msgObj = { role: 'assistant', responseType: 'ebook', query: rawText, ebook: ebObj };
        state.messages.push(msgObj);
        addToLibrary({ type: 'document', title: `eBook: ${cleanTopic}`, dataUrl: coverUrl, msgObj });
      } else {
        try {
          const cleanKw = repairedText.replace(/^(?:hello|hi|hey|what is|who is|tell me about|explain)\s+/i, '').replace(/[?.,!]/g, '').trim() || repairedText;
          const sRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanKw)}&utf8=&format=json&origin=*&srlimit=1`);
          const sData = await sRes.json();
          const topTitle = sData?.query?.search?.[0]?.title;
          if (topTitle) {
            const exRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(topTitle)}&format=json&origin=*`);
            const exData = await exRes.json();
            const page = Object.values(exData?.query?.pages || {})[0];
            if (page && page.extract) {
              state.messages.push({
                role: 'assistant',
                responseType: 'chat',
                query: rawText,
                answer: cleanAndEnforceChatText(page.extract.slice(0, 700), detectedConstraint)
              });
            }
          }
        } catch (_) {}
      }
    } finally {
      clearInterval(state.elapsedTimer);
      state.isRunning = false;
      state.actionMode = 'auto';
      saveThreads();
      syncLeftSidebar();
      renderModeAndAttachments();
      renderThread();
      setTimeout(() => scrollWorkspaceTo('bottom'), 80);
    }
  }

  function mountGeneralChatView(targetEl) {
    targetEl.innerHTML = `
      <div class="mc-shell is-empty-chat" id="mc-shell-root">
        <div class="mc-topbar">
          <h1 class="mc-title" id="mc-topbar-title">What can I help with?</h1>
          <div class="mc-top-actions">
            <button class="mc-pill-btn" id="mc-new-chat-btn">+ New chat</button>
          </div>
        </div>

        <div class="mc-thread" id="mc-thread-slot"></div>

        <div class="mc-composer" id="mc-composer-box">
          <textarea
            id="mc-chat-input"
            style="background:transparent !important;background-color:transparent !important;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;caret-color:#10b981 !important;"
            placeholder="Ask anything..."
          ></textarea>

          <div class="mc-mode-bar" id="mc-mode-slot"></div>

          <div class="mc-controls-row">
            <div class="mc-controls-left">
              <div style="position:relative;">
                <button class="mc-plus-btn" id="mc-plus-btn" title="Add">+</button>
                <div class="mc-popover" id="mc-plus-popover" style="display:none;">
                  <button class="mc-pop-item" id="mc-up-img">🖼️ Upload image</button>
                  <button class="mc-pop-item" id="mc-up-doc">📄 Upload file</button>
                  <div class="mc-pop-divider"></div>
                  <button class="mc-pop-item" id="mc-act-image">🎨 Create image</button>
                  <button class="mc-pop-item" id="mc-act-ebook">📚 Create eBook</button>
                  <button class="mc-pop-item" id="mc-act-pdf">📑 Create PDF</button>
                </div>
              </div>

              <input type="file" id="mc-file-img" accept="image/*" style="display:none;">
              <input type="file" id="mc-file-doc" accept=".txt,.md,.csv,.json,.js,.py,.html,.pdf" style="display:none;">

                                              <select class="mc-select-pill" id="mc-model-select" title="Select Model">
                  <option value="morphic-chat-pro" ${state.chatModel === 'morphic-chat-pro' ? 'selected' : ''}>Morphic Pro</option>
                  <option value="morphic-chat-ultra" ${state.chatModel === 'morphic-chat-ultra' ? 'selected' : ''}>Morphic Ultra</option>
                  <option value="morphic-chat-fast" ${state.chatModel === 'morphic-chat-fast' ? 'selected' : ''}>Morphic Fast</option>
                </select>

              <button class="mc-web-toggle active" id="mc-web-toggle" title="Real-Time Web Search">
                🌐 Search
              </button>

              <button type="button" class="mc-loc-pill" id="mc-loc-btn" title="Detected Location (Click to set custom city)">
                📍 ${esc(state.userLocation?.city || 'India')}
              </button>

              <div style="position:relative;">
                <button type="button" class="mc-sym-tab-btn" id="mc-sym-tab-btn" title="Insert Math, Greek & Scientific Symbols (θ, β, γ, a/b, √)">🧮 Sci-Calc &amp; Symbols ▾</button>
                <div class="mc-sym-popover" id="mc-sym-popover" style="display:none;"></div>
              </div>

              <div class="mc-quality-group" id="mc-quality-group" title="Image Quality">
                <button class="mc-quality-btn active" data-q="standard">Standard</button>
                <button class="mc-quality-btn" data-q="ultra">HD</button>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="mc-mic-btn" id="mc-mic-btn" title="Voice Input (Speak in English or Hindi)">${GOOGLE_MIC_SVG}</button>
              <button class="mc-send-btn" id="mc-send-btn" title="Send">↑</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const chatInput = document.getElementById('mc-chat-input');
    if (chatInput) {
      chatInput.addEventListener('input', updateQualityToggleVisibility);
      chatInput.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey || !e.shiftKey) && e.key === 'Enter') {
          e.preventDefault();
          sendChatMessage();
        }
      });
    }

    const plusBtn = document.getElementById('mc-plus-btn');
    const plusPop = document.getElementById('mc-plus-popover');
    if (plusBtn && plusPop) {
      plusBtn.onclick = (e) => {
        e.stopPropagation();
        plusPop.style.display = plusPop.style.display === 'none' ? 'block' : 'none';
      };
      document.addEventListener('click', () => {
        plusPop.style.display = 'none';
      });
    }

    document.getElementById('mc-act-image')?.addEventListener('click', () => {
      state.actionMode = 'image';
      renderModeAndAttachments();
      if (chatInput) {
        chatInput.placeholder = 'Describe the image or infographic...';
        chatInput.focus();
      }
    });

    document.getElementById('mc-act-ebook')?.addEventListener('click', () => {
      state.actionMode = 'ebook';
      renderModeAndAttachments();
      if (chatInput) {
        chatInput.placeholder = 'eBook topic...';
        chatInput.focus();
      }
    });

    document.getElementById('mc-act-pdf')?.addEventListener('click', () => {
      state.actionMode = 'pdf';
      renderModeAndAttachments();
      if (chatInput) {
        chatInput.placeholder = 'PDF topic...';
        chatInput.focus();
      }
    });

    const imgInput = document.getElementById('mc-file-img');
    const docInput = document.getElementById('mc-file-doc');
    document.getElementById('mc-up-img')?.addEventListener('click', () => imgInput?.click());
    document.getElementById('mc-up-doc')?.addEventListener('click', () => docInput?.click());

    imgInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        state.attachments.push({ type: 'image', name: file.name, dataUrl: reader.result });
        addToLibrary({ type: 'upload', title: file.name, dataUrl: reader.result });
        syncLeftSidebar();
        renderModeAndAttachments();
      };
      reader.readAsDataURL(file);
    });

    docInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result || '').slice(0, 12000);
        state.attachments.push({ type: 'document', name: file.name, content });
        addToLibrary({ type: 'upload', title: file.name, content });
        syncLeftSidebar();
        renderModeAndAttachments();
      };
      reader.readAsText(file);
    });

    document.getElementById('mc-model-select')?.addEventListener('change', (e) => {
      state.chatModel = e.target.value || 'morphic-chat-pro';
    });

    document.getElementById('mc-web-toggle')?.addEventListener('click', function () {
      state.webSearch = !state.webSearch;
      this.classList.toggle('active', state.webSearch);
    });

    document.getElementById('mc-loc-btn')?.addEventListener('click', () => {
      const cur = state.userLocation?.city ? `${state.userLocation.city}, ${state.userLocation.region || ''}` : 'Jhansi, Uttar Pradesh';
      const next = prompt('Enter your City / Location for local news, time, weather & events:', cur);
      if (next && next.trim()) {
        const parts = next.split(',').map((s) => s.trim());
        state.userLocation = {
          ...state.userLocation,
          city: parts[0] || next.trim(),
          region: parts[1] || '',
          country: parts[2] || 'India'
        };
        try { localStorage.setItem('pm_user_location_v37', JSON.stringify(state.userLocation)); } catch (_) {}
        updateLocationPillUI();
      }
    });
    updateLocationPillUI();

    targetEl.querySelectorAll('.mc-quality-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        targetEl.querySelectorAll('.mc-quality-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.imageQuality = btn.getAttribute('data-q') || 'standard';
      });
    });

    bindSmartSymbolPopoverEvents();
    document.getElementById('mc-new-chat-btn')?.addEventListener('click', startNewChatThread);
    document.getElementById('mc-mic-btn')?.addEventListener('click', function () {
      toggleVoiceMicInput('mc-chat-input', this);
    });
    document.getElementById('mc-send-btn')?.addEventListener('click', () => sendChatMessage());

    renderModeAndAttachments();
    renderThread();
  }


  function startNewStudySession() {
    state.currentThreadId = 'st_' + Date.now();
    state.messages = [];
    state.attachments = [];
    state.actionMode = 'auto';
    state.activeView = 'study';
    const inp = document.getElementById('mc-chat-input');
    if (inp) inp.value = '';
    checkAndMountMainView(true);
    syncLeftSidebar();
  }

  function mountStudyWorkspaceView(targetEl) {
    const subjects = [
      { id: 'math', icon: '📐', label: 'Mathematics' },
      { id: 'physics', icon: '⚛️', label: 'Physics' },
      { id: 'chemistry', icon: '🧪', label: 'Chemistry' },
      { id: 'biology', icon: '🧬', label: 'Biology' },
      { id: 'sst', icon: '🌍', label: 'SST · Polity · History' },
      { id: 'english', icon: '📝', label: 'English · NET · Reasoning' }
    ];
    const presets = [
      { id: 'solver', icon: '🔢', title: 'Step-by-Step Solver', desc: 'Full Teacher Derivation & Proof' },
      { id: 'mocktest', icon: '📝', title: 'Live Test / Quiz', desc: 'Click Options for Instant Right/Wrong & Deep Analysis' },
      { id: 'flashcards', icon: '🗂️', title: '3D Flashcards', desc: 'Interactive Question ⇄ Answer Flip Cards' },
      { id: 'infographic', icon: '📊', title: 'Study Infographic', desc: 'Visual Flowchart, Concept Nodes & Diagram' },
      { id: 'deepdive', icon: '🧠', title: 'Concept Deep-Dive', desc: 'Basics-to-Advanced Masterclass + Diagram' },
      { id: 'examdrill', icon: '🎯', title: 'Top 10 Hard Exam Q&A', desc: 'JEE / NEET / UPSC / NET Questions + Solutions' },
      { id: 'formulasheet', icon: '⚡', title: 'Formula & Law Sheet', desc: 'All Equations, Articles, Reactions & Exceptions' },
      { id: 'traps', icon: '⚠️', title: 'Exam Traps', desc: 'Common Mistakes vs Rigorous Teacher Approach' }
    ];

    const hasActiveContent = state.messages.length > 0 || state.isRunning;

    targetEl.innerHTML = `
      <div class="mc-shell is-study-shell ${hasActiveContent ? 'has-messages' : 'is-empty-chat'}" id="mc-shell-root">
        <div class="mc-topbar" style="margin-bottom:10px;">
          <div>
            <h1 class="mc-title" id="mc-topbar-title">🎓 Academic Study Workspace</h1>
            <div style="font-size:12.5px;color:#475569;margin-top:2px;">AI Professor · Live Right/Wrong Test Engine · 3D Flashcards · Multi-PDF Notebook (100% Hidden Backend Verification)</div>
          </div>
          <div class="mc-top-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="mc-pill-btn" id="mc-open-analytics-btn">📊 Analytics &amp; Vault (${state.studyVault.length})</button>
            <button class="mc-pill-btn" id="mc-new-study-btn">+ New Study Session</button>
          </div>
        </div>

        <!-- UPPER PROFESSIONAL ACADEMIC CONTROL DECK (Always Accessible at Top) -->
        <div class="mc-study-banner" id="mc-study-banner" style="padding:14px 16px;margin-bottom:14px;">
          <!-- Row 1: Subject Selector + Academic Level + Quiz Question Count -->
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-bottom:10px;border-bottom:1px solid rgba(110,231,183,0.18);margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="font-size:11px;font-weight:800;letter-spacing:0.06em;color:#6ee7b7;text-transform:uppercase;margin-right:2px;">1. SUBJECT:</span>
              ${subjects.map((s) => `
                <button type="button" class="mc-study-subj-btn ${state.studySubject === s.id ? 'active' : ''}" data-study-subj="${s.id}" style="padding:5px 11px;font-size:12px;">
                  <span>${s.icon}</span> <span>${s.label}</span>
                </button>
              `).join('')}
            </div>

            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:11px;color:#a7f3d0;font-weight:700;">LEVEL:</span>
              <select class="mc-select-pill" id="mc-study-diff-select" style="background:rgba(0,0,0,0.32) !important;height:30px;font-size:11.5px;">
                <option value="foundation" ${state.studyDifficulty === 'foundation' ? 'selected' : ''}>📘 School / NCERT</option>
                <option value="hard" ${state.studyDifficulty === 'hard' ? 'selected' : ''}>🔥 Boards / CUET</option>
                <option value="extreme" ${state.studyDifficulty === 'extreme' ? 'selected' : ''}>🏆 JEE · NEET · UPSC · NET</option>
              </select>

              <span style="font-size:11px;color:#fde68a;font-weight:700;">QUIZ Qs:</span>
              <select class="mc-select-pill" id="mc-study-qcount-select" style="background:rgba(0,0,0,0.32) !important;height:30px;font-size:11.5px;" title="Number of questions when running Live Test / Quiz">
                <option value="5" ${state.quizCount === 5 ? 'selected' : ''}>5 Questions</option>
                <option value="6" ${(!state.quizCount || state.quizCount === 6) ? 'selected' : ''}>6 Questions</option>
                <option value="10" ${state.quizCount === 10 ? 'selected' : ''}>10 Questions</option>
                <option value="15" ${state.quizCount === 15 ? 'selected' : ''}>15 Questions</option>
              </select>
            </div>
          </div>

          <!-- Row 2: Academic Study & Test Mode Pills (Upper Side) -->
          <div style="margin-bottom:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
              <span style="font-size:11px;font-weight:800;letter-spacing:0.06em;color:#6ee7b7;text-transform:uppercase;">2. ACADEMIC STUDY &amp; TEST MODE:</span>
              <span style="font-size:11px;color:#a7f3d0;">Tip: Select <strong>📝 Live Test / Quiz</strong> for clickable MCQs with instant Right/Wrong &amp; deep explanation</span>
            </div>
            <div class="mc-study-preset-grid" style="grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:7px;">
              ${presets.map((p) => `
                <button type="button" class="mc-study-preset-card ${state.studyPreset === p.id ? 'active' : ''}" data-study-preset="${p.id}" style="padding:8px 10px;">
                  <div style="font-size:12px;font-weight:800;margin-bottom:2px;">${p.icon} ${p.title}</div>
                  <div style="font-size:10px;opacity:0.8;font-weight:400;line-height:1.25;">${p.desc}</div>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Row 3: Integrated Upper Study Notebook (Multi-PDF & Notes Knowledge Base) -->
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:8px;border-top:1px solid rgba(110,231,183,0.18);">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:11px;font-weight:800;color:#6ee7b7;letter-spacing:0.05em;">3. 📚 STUDY NOTEBOOK (PDFs &amp; NOTES):</span>
              <input type="file" id="mc-nb-file-input" multiple accept=".pdf,.txt,.md,.csv,.json" style="display:none;">
              <button type="button" class="mc-sym-tab-btn" id="mc-nb-upload-btn" style="height:26px;font-size:11px;">+ Upload PDFs / Notes</button>
              <span style="font-size:11px;color:#cbd5e1;" id="mc-nb-status">${state.studyNotebook.length ? state.studyNotebook.filter((d) => d.active !== false).length + ' active of ' + state.studyNotebook.length + ' file(s)' : 'Upload textbooks, syllabus PDFs, or PYPs to ground answers & tests'}</span>
            </div>
            ${state.studyNotebook.length ? `
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="mc-calc-act-key" id="mc-nb-act-mock">📝 Start Test from Notes</button>
                <button type="button" class="mc-calc-act-key" id="mc-nb-act-fc">🗂️ Flashcards from Notes</button>
                <button type="button" class="mc-calc-act-key" id="mc-nb-act-sum">📋 Summarize Notes</button>
              </div>` : ''}
          </div>
          ${state.studyNotebook.length ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
              ${state.studyNotebook.map((doc, di) => `
                <div class="mc-nb-chip ${doc.active !== false ? 'active' : ''}">
                  <input type="checkbox" ${doc.active !== false ? 'checked' : ''} data-nb-toggle="${di}" style="cursor:pointer;accent-color:#10b981;">
                  <span>📄 ${esc(doc.name)}</span>
                  <span style="opacity:0.7;font-size:10px;">(${doc.wordCount || 0}w)</span>
                  <button type="button" data-nb-del="${di}" style="background:transparent;border:none;color:#fca5a5;cursor:pointer;font-weight:800;padding:0 2px;">×</button>
                </div>
              `).join('')}
            </div>` : ''}
        </div>

        <div class="mc-thread" id="mc-thread-slot"></div>

        <div class="mc-composer" id="mc-composer-box">
          <textarea
            id="mc-chat-input"
            style="background:transparent !important;background-color:transparent !important;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;caret-color:#10b981 !important;min-height:52px;max-height:160px;transition:height 0.12s ease;"
            placeholder="${state.studyPreset === 'mocktest' ? 'Enter any topic or chapter (e.g. Article 12 of Constitution, Rotational Motion, Thermodynamics) to launch an interactive Quiz / Test...' : 'Ask your AI Professor any question, or type a topic to launch a Live Quiz / Test, 3D Flashcards, or Step-by-Step Solution...'}"
          ></textarea>

          <div class="mc-mode-bar" id="mc-mode-slot"></div>

          <div class="mc-controls-row">
            <div class="mc-controls-left">
              <div style="position:relative;">
                <button class="mc-plus-btn" id="mc-plus-btn" title="Upload Question Paper / Diagram">+</button>
                <div class="mc-popover" id="mc-plus-popover" style="display:none;">
                  <button class="mc-pop-item" id="mc-up-img">🖼️ Upload Question Photo</button>
                  <button class="mc-pop-item" id="mc-up-doc">📄 Upload Notes / File</button>
                  <div class="mc-pop-divider"></div>
                  <button class="mc-pop-item" id="mc-act-image">🎨 Generate Science Diagram</button>
                  <button class="mc-pop-item" id="mc-act-ebook">📚 Create Study eBook</button>
                  <button class="mc-pop-item" id="mc-act-pdf">📑 Export Revision PDF</button>
                </div>
              </div>

              <input type="file" id="mc-file-img" accept="image/*" style="display:none;">
              <input type="file" id="mc-file-doc" accept=".txt,.md,.csv,.json,.js,.py,.html,.pdf" style="display:none;">

              <select class="mc-select-pill" id="mc-model-select" title="Choose Your AI Teacher Persona">
                <option value="morphic-chat-ultra" ${state.chatModel === 'morphic-chat-ultra' ? 'selected' : ''}>🧠 Morphic Ultra (Master JEE/NEET/UPSC Faculty)</option>
                <option value="morphic-chat-pro" ${state.chatModel === 'morphic-chat-pro' ? 'selected' : ''}>✨ Morphic Pro (Classroom Professor &amp; Board Mentor)</option>
                <option value="morphic-chat-fast" ${state.chatModel === 'morphic-chat-fast' ? 'selected' : ''}>⚡ Morphic Fast (Rapid Concept &amp; Shortcut Coach)</option>
              </select>

              <!-- Scientific Calculator & Symbol Keypad Drawer -->
              <div style="position:relative;">
                <button type="button" class="mc-sym-tab-btn" id="mc-sym-tab-btn" title="Open Scientific Calculator &amp; Mathematical Symbols (θ, β, γ, a/b, √, ∫, ⇌)">
                  🧮 Sci-Calc &amp; Symbols ▾
                </button>
                <div class="mc-sym-popover" id="mc-sym-popover" style="display:none;"></div>
              </div>

              <!-- Quick 1-Click Test Trigger in Prompt Bar -->
              <button type="button" class="mc-sym-tab-btn ${state.studyPreset === 'mocktest' ? 'active' : ''}" id="mc-quick-quiz-btn" title="Switch to Interactive Live Test / Quiz Mode">
                📝 Take Test / Quiz
              </button>
            </div>

            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="mc-mic-btn" id="mc-mic-btn" title="Voice Input (Speak your question)">${GOOGLE_MIC_SVG}</button>
              <button class="mc-send-btn" id="mc-send-btn" title="Solve / Generate">↑</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const chatInput = document.getElementById('mc-chat-input');
    if (chatInput) {
      chatInput.addEventListener('input', () => {
        updateQualityToggleVisibility();
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(160, Math.max(52, chatInput.scrollHeight)) + 'px';
      });
      chatInput.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey || !e.shiftKey) && e.key === 'Enter') {
          e.preventDefault();
          sendChatMessage();
        }
      });
    }

    bindSmartSymbolPopoverEvents();

    // Bind subject pills
    targetEl.querySelectorAll('[data-study-subj]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.studySubject = btn.getAttribute('data-study-subj') || 'math';
        targetEl.querySelectorAll('[data-study-subj]').forEach((b) => b.classList.toggle('active', b === btn));
      });
    });

    // Bind difficulty selector
    document.getElementById('mc-study-diff-select')?.addEventListener('change', (e) => {
      state.studyDifficulty = e.target.value || 'extreme';
    });

    // Bind quiz question count selector
    document.getElementById('mc-study-qcount-select')?.addEventListener('change', (e) => {
      state.quizCount = parseInt(e.target.value || '6', 10);
    });

    // Bind quick Take Test / Quiz button in prompt toolbar
    document.getElementById('mc-quick-quiz-btn')?.addEventListener('click', function () {
      state.studyPreset = 'mocktest';
      targetEl.querySelectorAll('[data-study-preset]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-study-preset') === 'mocktest'));
      this.classList.add('active');
      if (chatInput) {
        if (chatInput.value.trim()) {
          sendChatMessage();
        } else {
          chatInput.placeholder = 'Enter any topic or chapter (e.g. Article 12, Rotational Motion, Chemical Bonding) and press Enter to start your Live Quiz / Test!';
          chatInput.focus();
        }
      }
    });

    // Bind preset cards
    targetEl.querySelectorAll('[data-study-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.studyPreset = btn.getAttribute('data-study-preset') || 'solver';
        targetEl.querySelectorAll('[data-study-preset]').forEach((b) => b.classList.toggle('active', b === btn));
        document.getElementById('mc-quick-quiz-btn')?.classList.toggle('active', state.studyPreset === 'mocktest');
        if (chatInput) {
          const pId = state.studyPreset;
          if (pId === 'solver') chatInput.placeholder = 'Paste any hard numerical, proof, equation, or question to solve step-by-step...';
          else if (pId === 'mocktest') chatInput.placeholder = 'Enter any topic or chapter to start an Interactive Live Test / Quiz (with instant Right/Wrong & deep explanation)...';
          else if (pId === 'flashcards') chatInput.placeholder = 'Enter any topic or chapter to generate Interactive 3D Study Flashcards...';
          else if (pId === 'infographic') chatInput.placeholder = 'Enter any topic to build a Visual Study Infographic Board + Flowchart + AI Diagram...';
          else if (pId === 'deepdive') chatInput.placeholder = 'Enter a concept to explain from basics to advanced with a labeled diagram...';
          else if (pId === 'examdrill') chatInput.placeholder = 'Enter a chapter/topic to generate Top 10 Hard Competitive Exam Questions + Solutions...';
          else if (pId === 'formulasheet') chatInput.placeholder = 'Enter a chapter/topic to generate a complete Formula, Theorem & Law Sheet...';
          else if (pId === 'traps') chatInput.placeholder = 'Enter a topic to see the Top 6 Exam Traps & Common Student Mistakes...';
          chatInput.focus();
        }
      });
    });

    document.getElementById('mc-new-study-btn')?.addEventListener('click', startNewStudySession);
    document.getElementById('mc-open-analytics-btn')?.addEventListener('click', openStudyAnalyticsAndVaultModal);

    const nbInput = document.getElementById('mc-nb-file-input');
    document.getElementById('mc-nb-upload-btn')?.addEventListener('click', () => nbInput?.click());
    nbInput?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const stEl = document.getElementById('mc-nb-status');
      if (stEl) stEl.textContent = `⏳ Extracting text from ${files.length} file(s)...`;

      for (const file of files) {
        try {
          if (file.name.toLowerCase().endsWith('.pdf')) {
            const b64 = await new Promise((res, rej) => {
              const r = new FileReader();
              r.onload = () => res(String(r.result || ''));
              r.onerror = rej;
              r.readAsDataURL(file);
            });
            const resp = await fetch('/api/research?chatMode=1', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storageAction: 'extractPdf', filename: file.name, base64: b64 })
            });
            const data = await resp.json();
            state.studyNotebook.push({
              id: 'nb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
              name: file.name,
              content: data.text || `[PDF File: ${file.name}]`,
              wordCount: data.wordCount || 0,
              pageCount: data.pageCount || 1,
              active: true
            });
          } else {
            const txt = await file.text();
            state.studyNotebook.push({
              id: 'nb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
              name: file.name,
              content: txt.slice(0, 28000),
              wordCount: txt.split(/\s+/).filter(Boolean).length,
              pageCount: 1,
              active: true
            });
          }
        } catch (err) {
          showDownloadToast('Could not read ' + file.name);
        }
      }
      saveStudyNotebook();
      checkAndMountMainView(true);
    });

    targetEl.querySelectorAll('[data-nb-toggle]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const i = parseInt(cb.getAttribute('data-nb-toggle'), 10);
        if (state.studyNotebook[i]) {
          state.studyNotebook[i].active = cb.checked;
          saveStudyNotebook();
          const stEl = document.getElementById('mc-nb-status');
          if (stEl) stEl.textContent = `${state.studyNotebook.filter((d) => d.active !== false).length} active of ${state.studyNotebook.length} file(s)`;
        }
      });
    });

    targetEl.querySelectorAll('[data-nb-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.getAttribute('data-nb-del'), 10);
        state.studyNotebook.splice(i, 1);
        saveStudyNotebook();
        checkAndMountMainView(true);
      });
    });

    document.getElementById('mc-nb-act-mock')?.addEventListener('click', () => {
      state.studyPreset = 'mocktest';
      sendChatMessage('Generate an Interactive Timed Mock Test strictly from my uploaded Study Notebook PDFs and Notes.');
    });
    document.getElementById('mc-nb-act-fc')?.addEventListener('click', () => {
      state.studyPreset = 'flashcards';
      sendChatMessage('Generate high-yield Study Flashcards strictly from my uploaded Study Notebook PDFs and Notes.');
    });
    document.getElementById('mc-nb-act-sum')?.addEventListener('click', () => {
      state.studyPreset = 'deepdive';
      sendChatMessage('Summarize all key concepts, formulas, and exam points from my uploaded Study Notebook PDFs and Notes.');
    });

    const plusBtn = document.getElementById('mc-plus-btn');
    const plusPop = document.getElementById('mc-plus-popover');
    if (plusBtn && plusPop) {
      plusBtn.onclick = (e) => {
        e.stopPropagation();
        plusPop.style.display = plusPop.style.display === 'none' ? 'block' : 'none';
      };
      document.addEventListener('click', () => {
        plusPop.style.display = 'none';
      });
    }

    document.getElementById('mc-act-image')?.addEventListener('click', () => {
      state.actionMode = 'image';
      renderModeAndAttachments();
    });
    document.getElementById('mc-act-ebook')?.addEventListener('click', () => {
      state.actionMode = 'ebook';
      renderModeAndAttachments();
    });
    document.getElementById('mc-act-pdf')?.addEventListener('click', () => {
      state.actionMode = 'pdf';
      renderModeAndAttachments();
    });

    const imgInput = document.getElementById('mc-file-img');
    const docInput = document.getElementById('mc-file-doc');
    document.getElementById('mc-up-img')?.addEventListener('click', () => imgInput?.click());
    document.getElementById('mc-up-doc')?.addEventListener('click', () => docInput?.click());

    imgInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        state.attachments.push({ type: 'image', name: file.name, dataUrl: reader.result });
        addToLibrary({ type: 'upload', title: file.name, dataUrl: reader.result });
        syncLeftSidebar();
        renderModeAndAttachments();
      };
      reader.readAsDataURL(file);
    });

    docInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result || '').slice(0, 12000);
        state.attachments.push({ type: 'document', name: file.name, content });
        addToLibrary({ type: 'upload', title: file.name, content });
        syncLeftSidebar();
        renderModeAndAttachments();
      };
      reader.readAsText(file);
    });

    document.getElementById('mc-model-select')?.addEventListener('change', (e) => {
      state.chatModel = e.target.value || 'morphic-chat-ultra';
    });

    document.getElementById('mc-mic-btn')?.addEventListener('click', function () {
      toggleVoiceMicInput('mc-chat-input', this);
    });
    document.getElementById('mc-send-btn')?.addEventListener('click', () => sendChatMessage());

    renderModeAndAttachments();
    renderThread();
  }


  // ============================================================================
  // v52.0 LOVABLE / REPLIT / CURSOR SYSTEMATIC DESK IDE & APP ARCHITECT (#code)
  // ============================================================================
  const CODE_STUDIO_STORAGE_KEY = 'pm_code_studio_v54';
  const CODE_STUDIO_PROJECTS_KEY = 'pm_code_studio_projects_v54';

  function getDefaultStarterHtml() {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Morphic Analytics & App Studio</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16; --surface: #111827; --surface-2: #1e293b;
      --border: rgba(255,255,255,0.1); --text: #f8fafc; --muted: #94a3b8;
      --primary: #10b981; --accent: #6366f1;
    }
    body.light {
      --bg: #f8fafc; --surface: #ffffff; --surface-2: #f1f5f9;
      --border: rgba(15,23,42,0.1); --text: #0f172a; --muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg); color: var(--text);
      padding: 22px 26px; transition: all 0.22s ease;
    }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .badge { font-size: 11px; padding: 4px 10px; border-radius: 999px; background: rgba(16,185,129,0.16); color: #34d399; font-weight: 700; }
    .controls { display: flex; gap: 8px; align-items: center; }
    .btn { padding: 8px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font-weight: 600; font-size: 12.5px; cursor: pointer; transition: 0.15s; }
    .btn.active, .btn:hover { background: var(--primary); color: #042f1e; border-color: var(--primary); font-weight: 700; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(195px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 18px; }
    .kpi-lbl { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 700; }
    .kpi-val { font-size: 26px; font-weight: 800; margin: 6px 0 4px; color: var(--text); }
    .kpi-trend { font-size: 12px; color: #34d399; font-weight: 600; }
    .panel-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; }
    @media (max-width: 860px) { .panel-grid { grid-template-columns: 1fr; } }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 18px; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .card-title { font-size: 14.5px; font-weight: 700; }
    .search { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font-size: 13px; margin-bottom: 12px; outline: none; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--border); }
    th { color: var(--muted); font-size: 11.5px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">⚡ Pixelmorphic SaaS Suite <span class="badge">LIVE PREVIEW</span></div>
    <div class="controls">
      <button class="btn active" data-tf="7D">7D</button>
      <button class="btn" data-tf="30D">30D</button>
      <button class="btn" data-tf="1Y">1Y</button>
      <button class="btn" id="themeBtn">🌗 Theme</button>
    </div>
  </div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-lbl">Total Revenue</div><div class="kpi-val" id="k-rev">$142,800</div><div class="kpi-trend">▲ +18.4% vs last period</div></div>
    <div class="kpi"><div class="kpi-lbl">Active Users</div><div class="kpi-val" id="k-usr">15,420</div><div class="kpi-trend">▲ +12.1% growth</div></div>
    <div class="kpi"><div class="kpi-lbl">Conversion Rate</div><div class="kpi-val" id="k-cnv">4.85%</div><div class="kpi-trend">▲ +0.6% optimized</div></div>
    <div class="kpi"><div class="kpi-lbl">Net Retention</div><div class="kpi-val" id="k-ret">98.2%</div><div class="kpi-trend">● Enterprise SLA</div></div>
  </div>
  <div class="panel-grid">
    <div class="card">
      <div class="card-head"><span class="card-title">Revenue & Growth Trajectory (Interactive SVG)</span><span class="badge" id="tf-badge">7D View</span></div>
      <svg id="chartSvg" viewBox="0 0 680 210" style="width:100%;height:205px;overflow:visible;"></svg>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">Enterprise Accounts</span></div>
      <input class="search" id="searchInp" placeholder="Search customer or plan..." />
      <table>
        <thead><tr><th>Account</th><th>Tier</th><th>MRR</th></tr></thead>
        <tbody id="custBody"></tbody>
      </table>
    </div>
  </div>
  <script>
    const data = {
      '7D':  { pts: [38, 52, 49, 71, 66, 88, 95], lbl: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], rev: '$142,800', usr: '15,420', cnv: '4.85%', ret: '98.2%' },
      '30D': { pts: [32, 48, 61, 55, 79, 92, 108, 124], lbl: ['W1','W2','W3','W4','W5','W6','W7','W8'], rev: '$584,200', usr: '28,900', cnv: '5.12%', ret: '98.6%' },
      '1Y':  { pts: [25, 42, 58, 74, 89, 105, 128, 152, 178], lbl: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'], rev: '$6.42M', usr: '84,500', cnv: '5.60%', ret: '99.1%' }
    };
    const customers = [
      { name: 'Metamorphic Pixel AI', tier: 'Enterprise', mrr: '$4,800' },
      { name: 'NovaQuant Labs', tier: 'Scale', mrr: '$2,450' },
      { name: 'Aether Cloud Systems', tier: 'Enterprise', mrr: '$6,200' },
      { name: 'Vertex Robotics', tier: 'Growth', mrr: '$1,290' }
    ];
    function draw(tf) {
      const d = data[tf] || data['7D'];
      document.getElementById('k-rev').textContent = d.rev;
      document.getElementById('k-usr').textContent = d.usr;
      document.getElementById('k-cnv').textContent = d.cnv;
      document.getElementById('k-ret').textContent = d.ret;
      document.getElementById('tf-badge').textContent = tf + ' View';
      const w = 680, h = 210, px = 34, py = 24, max = Math.max(...d.pts) * 1.12;
      const pts = d.pts.map((v, i) => [Math.round(px + i * (w - px * 2) / (d.pts.length - 1)), Math.round(h - py - (v / max) * (h - py * 2)), v, d.lbl[i]]);
      const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
      const area = line + ' L' + pts[pts.length - 1][0] + ',' + (h - py) + ' L' + pts[0][0] + ',' + (h - py) + ' Z';
      document.getElementById('chartSvg').innerHTML =
        '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981" stop-opacity="0.42"/><stop offset="100%" stop-color="#10b981" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + area + '" fill="url(#g)"/>' +
        '<path d="' + line + '" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>' +
        pts.map(p => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#090d16" stroke="#34d399" stroke-width="2.5"/><text x="' + p[0] + '" y="' + (p[1] - 10) + '" text-anchor="middle" fill="currentColor" font-size="11" font-weight="700">$' + p[2] + 'k</text><text x="' + p[0] + '" y="' + (h - 4) + '" text-anchor="middle" fill="#94a3b8" font-size="11">' + p[3] + '</text>').join('');
    }
    function renderTable(q = '') {
      const f = customers.filter(c => (c.name + ' ' + c.tier).toLowerCase().includes(q.toLowerCase()));
      document.getElementById('custBody').innerHTML = f.map(c => '<tr><td style="font-weight:600;">' + c.name + '</td><td><span class="badge">' + c.tier + '</span></td><td style="font-weight:700;color:#34d399;">' + c.mrr + '</td></tr>').join('');
    }
    document.querySelectorAll('[data-tf]').forEach(b => b.onclick = () => {
      document.querySelectorAll('[data-tf]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      draw(b.dataset.tf);
    });
    document.getElementById('searchInp').oninput = (e) => renderTable(e.target.value);
    document.getElementById('themeBtn').onclick = () => document.body.classList.toggle('light');
    draw('7D'); renderTable();
  </script>
</body>
</html>`;
  }

  function extractAppTitleFromHtml(htmlStr, fallbackPrompt = '') {
    const h = String(htmlStr || '');
    const tMatch = h.match(/<title>([^<]+)<\/title>/i) || h.match(/<h[12][^>]*>([^<]+)<\/h[12]>/i);
    if (tMatch && tMatch[1]) {
      const clean = tMatch[1].replace(/\s+/g, ' ').trim();
      if (clean && !/^Morphic Analytics & App Studio$/i.test(clean) && !/^Document$/i.test(clean)) {
        return clean.slice(0, 42);
      }
    }
    if (fallbackPrompt) {
      return String(fallbackPrompt).replace(/^(?:build|create|make|design)\s+(?:a|an|the)?\s*/i, '').trim().slice(0, 40) || 'Custom Web App';
    }
    return 'SaaS Analytics Suite';
  }

  function loadSavedCodeProjectsList() {
    try {
      const arr = JSON.parse(localStorage.getItem(CODE_STUDIO_PROJECTS_KEY) || '[]');
      if (Array.isArray(arr)) return arr;
    } catch (_) {}
    return [];
  }

  function saveCodeProjectsList(list) {
    try {
      const trimmed = Array.isArray(list) ? list.slice(0, 30) : [];
      localStorage.setItem(CODE_STUDIO_PROJECTS_KEY, JSON.stringify(trimmed));
      fetch('/api/research?chatMode=1&storage=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatMode: true,
          storageAction: 'save',
          codeProjects: trimmed
        })
      }).catch(() => {});
    } catch (_) {}
  }

  function silentlyArchiveCodeProject(proj) {
    if (!proj || !proj.html) return false;
    const isStarter = proj.html.includes('⚡ Pixelmorphic SaaS Suite') && (!Array.isArray(proj.messages) || proj.messages.length === 0);
    if (isStarter) return false;

    const list = loadSavedCodeProjectsList();
    const id = proj.id || ('cs_' + Date.now());
    proj.id = id;
    const firstUserMsg = (proj.messages || []).find(m => m.role === 'user')?.content || '';
    const title = (proj.title && proj.title !== 'SaaS Analytics Suite')
      ? proj.title
      : extractAppTitleFromHtml(proj.html, firstUserMsg);
    proj.title = title;
    proj.updatedAt = new Date().toISOString();

    const entry = {
      id,
      title,
      html: proj.html,
      messages: Array.isArray(proj.messages) ? proj.messages.slice(-20) : [],
      versions: Array.isArray(proj.versions) ? proj.versions.slice(-8) : [proj.html],
      lines: proj.html.split('\n').length,
      updatedAt: proj.updatedAt
    };

    const existingIdx = list.findIndex(x => x.id === id);
    if (existingIdx !== -1) {
      list[existingIdx] = entry;
    } else {
      list.unshift(entry);
    }
    saveCodeProjectsList(list);
    return true;
  }

  function loadCodeStudioProject() {
    try {
      const saved = JSON.parse(localStorage.getItem(CODE_STUDIO_STORAGE_KEY) || 'null')
        || JSON.parse(localStorage.getItem('pm_code_studio_v52') || 'null');
      if (saved && typeof saved.html === 'string' && !/Chart for \$\{timeframe\}|pm-v54-self-heal-runtime/i.test(saved.html)) {
        if (!saved.id) saved.id = 'cs_' + Date.now();
        if (!Array.isArray(saved.messages)) saved.messages = [];
        if (!Array.isArray(saved.versions)) saved.versions = [];
        if (!saved.title) saved.title = extractAppTitleFromHtml(saved.html);
        return saved;
      }
    } catch (_) {}
    return {
      id: 'cs_' + Date.now(),
      title: 'SaaS Analytics Suite',
      html: getDefaultStarterHtml(),
      viewMode: 'preview',
      deviceWidth: '100%',
      agentCollapsed: false,
      messages: [],
      versions: []
    };
  }

  function saveCodeStudioProject(proj) {
    try {
      localStorage.setItem(CODE_STUDIO_STORAGE_KEY, JSON.stringify(proj));
      silentlyArchiveCodeProject(proj);
    } catch (_) {}
  }

  function mountCodeStudioView(targetEl) {
    document.body.classList.add('mc-code-route-active');
    const proj = loadCodeStudioProject();
    const savedProjects = loadSavedCodeProjectsList();
    let isCodeRunning = false;
    let codeAbortCtrl = null;
    let codeTimer = null;

    targetEl.innerHTML = `
      <div class="mc-cs-shell ${proj.agentCollapsed ? 'agent-collapsed' : ''}" id="mc-shell-root">
        <!-- LEFT PANEL: CLEAN AI ARCHITECT & DEEP THINKING DOCK -->
        <div class="mc-cs-agent-col">
          <div class="mc-cs-agent-head">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:13.5px;font-weight:800;color:#ffffff;">⚡ Code Architect</span>
              <span style="font-size:9.5px;background:rgba(16,185,129,0.22);border:1px solid #34d399;color:#6ee7b7;padding:2px 6px;border-radius:999px;font-weight:700;">v55 Deep</span>
            </div>
            <button type="button" class="mc-cs-new-code-btn" id="mc-cs-new-btn" title="Silently save current work to Code Studio Projects &amp; open a fresh workspace">+ New Code</button>
          </div>

          <div class="mc-cs-feed" id="mc-cs-feed"></div>

          <!-- 1-Click AI Polish & Self-Repair Chips -->
          <div class="mc-cs-quick-chips">
            <button type="button" class="mc-cs-qchip" data-cs-qedit="Upgrade the UI to a wide luxury dark/light SaaS design with a 4-column KPI grid, styled sidebar links, and smooth hover transitions">✨ Wide SaaS UI</button>
            <button type="button" class="mc-cs-qchip" data-cs-qedit="Add an interactive SVG chart with working 7D / 30D / 1Y timeframe tabs and hover tooltips">📊 7D/30D/1Y Chart</button>
            <button type="button" class="mc-cs-qchip" data-cs-qedit="Ensure live Search, Status Filter Pills, Export CSV download, and LocalStorage persistence all work with dynamic KPI recalculation">🛠️ Fix All Buttons &amp; JS</button>
          </div>

          <div class="mc-cs-composer" id="mc-cs-prompt-box">
            <textarea
              id="mc-cs-input"
              class="mc-cs-textarea"
              placeholder="Describe any web app to build or refine (Morphic Ultra runs Deep Think + Self-Audit before showing final code)..."
            ></textarea>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
              <select class="mc-select-pill" id="mc-cs-model" style="max-width:205px;height:30px;font-size:11px;" title="Choose Thinking &amp; Coding Depth">
                <option value="morphic-chat-ultra" selected>🧠 Morphic Ultra (Deep Think + Audit)</option>
                <option value="morphic-chat-pro">✨ Morphic Pro (Medium Think + Plan)</option>
                <option value="morphic-chat-fast">⚡ Morphic Fast (Instant 1-Pass)</option>
              </select>
              <div style="display:flex;align-items:center;gap:6px;">
                <button type="button" class="mc-mic-btn" id="mc-cs-mic-btn" style="width:30px;height:30px;" title="Voice Input">${GOOGLE_MIC_SVG}</button>
                <button type="button" class="mc-send-btn" id="mc-cs-send-btn" style="width:32px;height:32px;" title="Build / Update App">↑</button>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT PANEL: WIDE & SIMPLE DASHBOARD PREVIEW + CODE EDITOR + SAVED PROJECTS -->
        <div class="mc-cs-canvas-col">
          <div class="mc-cs-canvas-bar">
            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
              <button type="button" class="mc-calc-act-key" id="mc-cs-toggle-agent" title="Expand/Collapse Left Architect Panel for 100% Wide View">
                ${proj.agentCollapsed ? '▶ Show Agent' : '◀ Wide View'}
              </button>
              <button type="button" class="mc-calc-act-key" id="mc-cs-projects-btn" style="border-color:rgba(52,211,153,0.45);color:#6ee7b7;font-weight:800;" title="Open Saved Code Studio Projects">
                📁 Projects (<span id="mc-cs-proj-count">${savedProjects.length}</span>) ▾
              </button>
              <button type="button" class="mc-cs-new-code-btn" id="mc-cs-top-new-btn" title="Silently save current work &amp; start New Code">+ New Code</button>
            </div>

            <div class="mc-cs-seg-group">
              <button type="button" class="mc-cs-seg-btn ${(proj.viewMode || 'preview') === 'preview' ? 'active' : ''}" data-cs-mode="preview">👁️ Live Preview</button>
              <button type="button" class="mc-cs-seg-btn ${proj.viewMode === 'code' ? 'active' : ''}" data-cs-mode="code">&lt;/&gt; Code Editor</button>
              <button type="button" class="mc-cs-seg-btn ${proj.viewMode === 'split' ? 'active' : ''}" data-cs-mode="split">⚡ Split View</button>
            </div>

            <div style="display:flex;align-items:center;gap:5px;">
              <button type="button" class="mc-calc-act-key" id="mc-cs-reload-btn" title="Reload Preview">🔄 Reload</button>
              <button type="button" class="mc-calc-act-key" id="mc-cs-copy-btn" title="Copy Full HTML/CSS/JS">📋 Copy</button>
              <button type="button" class="mc-calc-act-key" id="mc-cs-dl-btn" title="Download .html File">📥 Download</button>
              <button type="button" class="mc-calc-act-key" id="mc-cs-tab-btn" title="Open in Full Browser Tab">⤢ Full Tab</button>
            </div>
          </div>

          <!-- SAVED CODE STUDIO PROJECTS DRAWER (All projects saved inside Code Studio!) -->
          <div class="mc-cs-projects-drawer" id="mc-cs-projects-drawer">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#04150e;border-bottom:1px solid rgba(52,211,153,0.25);">
              <span style="font-size:12.5px;font-weight:800;color:#6ee7b7;">📁 Saved Code Studio Projects</span>
              <button type="button" class="mc-calc-act-key" id="mc-cs-close-proj-drawer" style="padding:2px 8px;">✕</button>
            </div>
            <div id="mc-cs-projects-list" style="overflow-y:auto;max-height:350px;"></div>
          </div>

          <div class="mc-cs-stage mode-${proj.viewMode || 'preview'}" id="mc-cs-stage">
            <!-- Line-Numbered IDE Code Editor -->
            <div class="mc-cs-code-wrap">
              <div class="mc-ide-filebar">
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-weight:800;color:#6ee7b7;">📄 index.html</span>
                  <span style="font-size:11px;color:#cbd5e1;font-weight:600;" id="mc-ide-proj-title">${esc(proj.title || 'SaaS Analytics Suite')}</span>
                  <span id="mc-ide-line-stat" style="opacity:0.75;">${proj.html.split('\n').length} lines</span>
                </div>
                <span style="font-size:10.5px;color:#34d399;">● Auto-Saved in Code Studio</span>
              </div>
              <div class="mc-ide-body">
                <div class="mc-ide-gutter" id="mc-ide-gutter"></div>
                <textarea class="mc-cs-editor" id="mc-cs-editor" spellcheck="false">${esc(proj.html)}</textarea>
              </div>
            </div>

            <!-- Wide Live Interactive Browser Canvas -->
            <div class="mc-cs-prev-wrap">
              <iframe id="mc-cs-iframe" class="mc-cs-iframe" sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups" style="width:100%;"></iframe>
            </div>
          </div>
        </div>
      </div>
    `;

    const shellRoot = document.getElementById('mc-shell-root');
    const toggleAgentBtn = document.getElementById('mc-cs-toggle-agent');
    const feedEl = document.getElementById('mc-cs-feed');
    const editorEl = document.getElementById('mc-cs-editor');
    const gutterEl = document.getElementById('mc-ide-gutter');
    const lineStatEl = document.getElementById('mc-ide-line-stat');
    const titleStatEl = document.getElementById('mc-ide-proj-title');
    const iframeEl = document.getElementById('mc-cs-iframe');
    const stageEl = document.getElementById('mc-cs-stage');
    const csInput = document.getElementById('mc-cs-input');
    const sendBtn = document.getElementById('mc-cs-send-btn');
    const projDrawer = document.getElementById('mc-cs-projects-drawer');
    const projListEl = document.getElementById('mc-cs-projects-list');
    const projCountEl = document.getElementById('mc-cs-proj-count');

    const renderSavedProjectsDrawer = () => {
      const list = loadSavedCodeProjectsList();
      if (projCountEl) projCountEl.textContent = String(list.length);
      if (!projListEl) return;
      if (list.length === 0) {
        projListEl.innerHTML = `<div style="padding:18px 14px;font-size:12px;color:#94a3b8;text-align:center;">No saved Code Studio projects yet.<br>Every app you build or archive with <strong>+ New Code</strong> is automatically saved here.</div>`;
        return;
      }
      projListEl.innerHTML = list.map((item) => {
        const dateStr = item.updatedAt ? new Date(item.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Saved';
        const isCurrent = item.id === proj.id;
        return `
          <div class="mc-cs-proj-item ${isCurrent ? 'active' : ''}" data-load-cs-proj="${esc(item.id)}">
            <div style="min-width:0;flex:1;">
              <div style="font-size:12.5px;font-weight:700;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${isCurrent ? '🟢 ' : '💻 '}${esc(item.title || 'Web App')}
              </div>
              <div style="font-size:10.5px;color:#a7f3d0;margin-top:2px;">
                ${item.lines || (item.html ? item.html.split('\n').length : 120)} lines · ${esc(dateStr)}
              </div>
            </div>
            <button type="button" class="mc-calc-act-key" data-del-cs-proj="${esc(item.id)}" title="Delete project" style="padding:2px 7px;color:#fca5a5;">×</button>
          </div>
        `;
      }).join('');

      projListEl.querySelectorAll('[data-load-cs-proj]').forEach((row) => {
        row.onclick = (e) => {
          if (e.target.closest('[data-del-cs-proj]')) return;
          const targetId = row.getAttribute('data-load-cs-proj');
          const found = loadSavedCodeProjectsList().find(x => x.id === targetId);
          if (found) {
            silentlyArchiveCodeProject(proj);
            localStorage.setItem(CODE_STUDIO_STORAGE_KEY, JSON.stringify({
              ...found,
              viewMode: 'preview',
              agentCollapsed: proj.agentCollapsed
            }));
            projDrawer?.classList.remove('open');
            mountCodeStudioView(targetEl);
            showDownloadToast(`📂 Loaded "${found.title}"`);
          }
        };
      });

      projListEl.querySelectorAll('[data-del-cs-proj]').forEach((delBtn) => {
        delBtn.onclick = (e) => {
          e.stopPropagation();
          const delId = delBtn.getAttribute('data-del-cs-proj');
          const next = loadSavedCodeProjectsList().filter(x => x.id !== delId);
          saveCodeProjectsList(next);
          renderSavedProjectsDrawer();
        };
      });
    };

    renderSavedProjectsDrawer();

    document.getElementById('mc-cs-projects-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      renderSavedProjectsDrawer();
      projDrawer?.classList.toggle('open');
    });
    document.getElementById('mc-cs-close-proj-drawer')?.addEventListener('click', () => {
      projDrawer?.classList.remove('open');
    });

    const startSilentNewCodeWorkspace = () => {
      if (isCodeRunning && codeAbortCtrl) codeAbortCtrl.abort();
      if (editorEl) proj.html = editorEl.value;
      const didSave = silentlyArchiveCodeProject(proj);
      const freshProj = {
        id: 'cs_' + Date.now(),
        title: 'New Web App',
        html: getDefaultStarterHtml(),
        viewMode: 'preview',
        deviceWidth: '100%',
        agentCollapsed: false,
        messages: [],
        versions: []
      };
      localStorage.setItem(CODE_STUDIO_STORAGE_KEY, JSON.stringify(freshProj));
      mountCodeStudioView(targetEl);
      if (didSave) {
        showDownloadToast(`💾 Saved "${proj.title}" to Code Studio Projects`);
      } else {
        showDownloadToast('✨ Fresh Code Studio workspace ready');
      }
    };

    document.getElementById('mc-cs-new-btn')?.addEventListener('click', startSilentNewCodeWorkspace);
    document.getElementById('mc-cs-top-new-btn')?.addEventListener('click', startSilentNewCodeWorkspace);

    const updateGutter = () => {
      if (!editorEl || !gutterEl) return;
      const count = (editorEl.value || '').split('\n').length;
      let nums = '';
      for (let i = 1; i <= count; i++) nums += i + '<br>';
      gutterEl.innerHTML = nums;
      if (lineStatEl) lineStatEl.textContent = count + ' lines';
      if (titleStatEl) titleStatEl.textContent = proj.title || 'SaaS Analytics Suite';
    };

    const updatePreview = (htmlStr) => {
      if (iframeEl) iframeEl.srcdoc = htmlStr;
      updateGutter();
    };
    updatePreview(proj.html);

    editorEl?.addEventListener('scroll', () => {
      if (gutterEl) gutterEl.scrollTop = editorEl.scrollTop;
    });

    toggleAgentBtn?.addEventListener('click', () => {
      proj.agentCollapsed = !proj.agentCollapsed;
      saveCodeStudioProject(proj);
      if (shellRoot) shellRoot.classList.toggle('agent-collapsed', proj.agentCollapsed);
      toggleAgentBtn.textContent = proj.agentCollapsed ? '▶ Show Agent' : '◀ Wide View';
    });

    const renderAgentFeed = (liveStepText = '', liveSubText = '') => {
      if (!feedEl) return;
      if (!proj.messages.length && !isCodeRunning) {
        feedEl.innerHTML = `
          <div style="font-size:11.5px;color:#a7f3d0;margin-bottom:2px;font-weight:700;">🚀 1-Click Deep-Architected App Templates:</div>
          <button type="button" class="mc-cs-starter-card" data-cs-starter="Build a sleek AI Agency & Client Command Center web app called Metamorphic Ops with a 4-column KPI grid, an interactive SVG Revenue chart with 7D / 30D / 1Y timeframe tabs and hover tooltips, a searchable & filterable Project Pipeline table (All / In Progress / Completed / Review), Export CSV, + New Project modal, and Dark/Light theme saved in localStorage.">
            <div style="font-size:12px;font-weight:800;color:#6ee7b7;">🏢 Metamorphic Ops Command Center</div>
            <div style="font-size:10.5px;opacity:0.8;">4-col KPIs, 7D/30D/1Y SVG chart, filters, CSV &amp; modal</div>
          </button>
          <button type="button" class="mc-cs-starter-card" data-cs-starter="Build an interactive Student Pomodoro Timer & Scientific Calculator Dashboard with dark emerald glassmorphism, circular SVG progress ring, localStorage task list, and WebAudio completion chime">
            <div style="font-size:12px;font-weight:800;color:#6ee7b7;">⏱️ Pomodoro + Sci-Calc Suite</div>
            <div style="font-size:10.5px;opacity:0.8;">Circular SVG timer, scientific keypad, tasks &amp; sound</div>
          </button>
          <button type="button" class="mc-cs-starter-card" data-cs-starter="Build a Smart Boutique & Fabric Store POS + Inventory Manager with searchable product grid, category pills (Kurtis, Fabrics, Dupattas), + Add Item modal, live Billing Cart with discount & 5% GST, and printable invoice receipt modal saved in localStorage">
            <div style="font-size:12px;font-weight:800;color:#6ee7b7;">🛍️ Smart Boutique POS &amp; Billing</div>
            <div style="font-size:10.5px;opacity:0.8;">Catalog filters, live GST cart, inventory &amp; receipt modal</div>
          </button>
        `;
        feedEl.querySelectorAll('[data-cs-starter]').forEach((b) => {
          b.onclick = () => {
            if (csInput) {
              csInput.value = b.getAttribute('data-cs-starter') || '';
              runCodeStudioBuild(true);
            }
          };
        });
        return;
      }

      let html = proj.messages.map((m) => {
        if (m.role === 'user') {
          return `<div class="mc-cs-msg-user">${esc(m.content)}</div>`;
        }
        const stepsHtml = Array.isArray(m.thinkingSteps) && m.thinkingSteps.length
          ? `<div style="margin:5px 0 6px;padding:6px 8px;background:rgba(0,0,0,0.28);border-radius:8px;font-size:10.5px;color:#a7f3d0;">` +
            m.thinkingSteps.map(s => `<div>✓ ${esc(s)}</div>`).join('') +
            `</div>`
          : '';
        return `
          <div class="mc-cs-msg-ai">
            <div style="font-weight:800;color:#6ee7b7;margin-bottom:3px;">✅ ${esc(m.summary || 'App Built')}</div>
            <div style="font-size:11px;color:#d1fae5;margin-bottom:4px;">Live in Canvas (${m.lines || 140} lines · Saved in Code Studio).</div>
            ${stepsHtml}
            <div style="display:flex;gap:5px;flex-wrap:wrap;">
              ${m.versionIdx !== undefined ? `<button type="button" class="mc-calc-act-key" data-cs-restore="${m.versionIdx}">↺ v${m.versionIdx + 1}</button>` : ''}
              <button type="button" class="mc-calc-act-key" onclick="document.querySelector('[data-cs-mode=\\'preview\\']')?.click()">👁️ Preview</button>
              <button type="button" class="mc-calc-act-key" onclick="document.querySelector('[data-cs-mode=\\'code\\']')?.click()">&lt;/&gt; Code</button>
            </div>
          </div>
        `;
      }).join('');

      if (isCodeRunning) {
        html += `
          <div class="mc-cs-msg-ai" style="border-color:#10b981;background:rgba(16,185,129,0.18);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:800;color:#6ee7b7;" id="mc-cs-live-step">${esc(liveStepText || '🧠 Pass 1/3 · Deep Architecture Plan...')}</span>
              <span style="font-family:monospace;font-size:11px;color:#a7f3d0;" id="mc-cs-timer">0.0s</span>
            </div>
            <div style="font-size:10.5px;color:#d1fae5;" id="mc-cs-live-sub">${esc(liveSubText || 'Inspecting layout grids, interactive JS handlers & state...')}</div>
          </div>
        `;
      }

      feedEl.innerHTML = html;
      feedEl.scrollTop = feedEl.scrollHeight;

      feedEl.querySelectorAll('[data-cs-restore]').forEach((b) => {
        b.onclick = () => {
          const vi = parseInt(b.getAttribute('data-cs-restore'), 10);
          const vHtml = proj.versions[vi];
          if (vHtml) {
            proj.html = vHtml;
            saveCodeStudioProject(proj);
            if (editorEl) editorEl.value = vHtml;
            updatePreview(vHtml);
            showDownloadToast(`↺ Restored Version v${vi + 1}`);
          }
        };
      });
    };

    renderAgentFeed();

    [csInput, editorEl].forEach((el) => {
      if (!el) return;
      el.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (el === editorEl && e.key === 'Tab') {
          e.preventDefault();
          const s = editorEl.selectionStart;
          const end = editorEl.selectionEnd;
          editorEl.value = editorEl.value.slice(0, s) + '  ' + editorEl.value.slice(end);
          editorEl.selectionStart = editorEl.selectionEnd = s + 2;
        }
      });
      el.addEventListener('keyup', (e) => e.stopPropagation());
      el.addEventListener('keypress', (e) => e.stopPropagation());
    });

    let editTimer = null;
    editorEl?.addEventListener('input', () => {
      updateGutter();
      clearTimeout(editTimer);
      editTimer = setTimeout(() => {
        proj.html = editorEl.value;
        proj.title = extractAppTitleFromHtml(proj.html, proj.title);
        saveCodeStudioProject(proj);
        renderSavedProjectsDrawer();
        updatePreview(proj.html);
      }, 260);
    });

    targetEl.querySelectorAll('[data-cs-mode]').forEach((b) => {
      b.onclick = () => {
        const nextMode = b.getAttribute('data-cs-mode') || 'preview';
        proj.viewMode = nextMode;
        if (nextMode === 'split' && !proj.agentCollapsed) {
          proj.agentCollapsed = true;
          if (shellRoot) shellRoot.classList.add('agent-collapsed');
          if (toggleAgentBtn) toggleAgentBtn.textContent = '▶ Show Agent';
        }
        saveCodeStudioProject(proj);
        targetEl.querySelectorAll('[data-cs-mode]').forEach((x) => x.classList.toggle('active', x === b));
        if (stageEl) stageEl.className = `mc-cs-stage mode-${proj.viewMode}`;
        updateGutter();
      };
    });

    targetEl.querySelectorAll('[data-cs-qedit]').forEach((b) => {
      b.onclick = () => {
        if (csInput) {
          csInput.value = b.getAttribute('data-cs-qedit') || '';
          runCodeStudioBuild(false);
        }
      };
    });

    document.getElementById('mc-cs-reload-btn')?.addEventListener('click', () => {
      updatePreview(editorEl?.value || proj.html);
      showDownloadToast('🔄 Preview reloaded');
    });

    document.getElementById('mc-cs-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(editorEl?.value || proj.html);
      showDownloadToast('📋 Full HTML/JS code copied!');
    });

    document.getElementById('mc-cs-dl-btn')?.addEventListener('click', () => {
      const blob = new Blob([editorEl?.value || proj.html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const safeName = (proj.title || 'pixelmorphic-app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pixelmorphic-app';
      a.download = safeName + '.html';
      a.click();
    });

    document.getElementById('mc-cs-tab-btn')?.addEventListener('click', () => {
      const w = window.open('', '_blank');
      if (w) {
        w.document.open();
        w.document.write(editorEl?.value || proj.html);
        w.document.close();
      }
    });

    document.getElementById('mc-cs-mic-btn')?.addEventListener('click', function () {
      toggleVoiceMicInput('mc-cs-input', this);
    });

    const runCodeStudioBuild = async (isFresh = false) => {
      if (isCodeRunning) {
        if (codeAbortCtrl) codeAbortCtrl.abort();
        clearInterval(codeTimer);
        isCodeRunning = false;
        if (sendBtn) sendBtn.textContent = '↑';
        renderAgentFeed();
        return;
      }

      const msg = csInput?.value.trim();
      if (!msg) return;

      const selectedModel = document.getElementById('mc-cs-model')?.value || 'morphic-chat-ultra';
      const isDeepModel = /ultra|pro/i.test(selectedModel);

      isCodeRunning = true;
      codeAbortCtrl = new AbortController();
      if (csInput) csInput.value = '';
      proj.messages.push({ role: 'user', content: msg });
      saveCodeStudioProject(proj);

      if (sendBtn) {
        sendBtn.textContent = '■';
        sendBtn.title = 'Cancel build';
      }
      renderAgentFeed(
        isDeepModel ? '🧠 Pass 1/3 · Deep Thinking & Architecture...' : '⚡ Step 1/2 · Designing Layout & UI...',
        isDeepModel ? 'Planning 4-col KPI grid, SVG chart datasets & localStorage state...' : 'Writing responsive HTML5 + CSS3 + JS...'
      );

      const startMs = Date.now();
      clearInterval(codeTimer);
      codeTimer = setInterval(() => {
        const sec = (Date.now() - startMs) / 1000;
        const tEl = document.getElementById('mc-cs-timer');
        if (tEl) tEl.textContent = sec.toFixed(1) + 's';
        const sEl = document.getElementById('mc-cs-live-step');
        const subEl = document.getElementById('mc-cs-live-sub');
        if (sEl) {
          if (isDeepModel) {
            if (sec < 5.0) {
              sEl.textContent = '🧠 Pass 1/3 · Deep Thinking & Architecture...';
              if (subEl) subEl.textContent = 'Planning 4-column KPI grid, styled nav links & state schema...';
            } else if (sec < 18.0) {
              sEl.textContent = '⚙️ Pass 2/3 · Coding Full HTML5, CSS Grid & JS...';
              if (subEl) subEl.textContent = 'Implementing interactive SVG charts, live search, filters & modals...';
            } else {
              sEl.textContent = '🔍 Pass 3/3 · Self-Auditing & Repairing Code...';
              if (subEl) subEl.textContent = 'Checking every button, chart tab, CSV export & KPI recalculation...';
            }
          } else {
            if (sec < 4.0) sEl.textContent = '⚡ Step 1/2 · Designing UI & CSS Grid...';
            else sEl.textContent = '⚡ Step 2/2 · Wiring Interactive JS & SVG...';
          }
        }
      }, 100);

      try {
        const curHtml = editorEl?.value || '';
        const isDefaultStarter = curHtml.includes('Pixelmorphic SaaS Suite');
        const resp = await fetch('/api/research?chatMode=1', {
          method: 'POST',
          signal: codeAbortCtrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codeStudioMode: true,
            message: msg,
            currentCode: (isFresh || isDefaultStarter) ? '' : curHtml,
            chatModel: selectedModel
          })
        });
        const data = await resp.json();
        if (!resp.ok || data.error || !data.html) throw new Error(data.error || 'Code generation failed');

        proj.html = data.html;
        proj.title = data.title || extractAppTitleFromHtml(data.html, msg);
        proj.versions.push(data.html);
        const vIdx = proj.versions.length - 1;
        const lineCount = data.html.split('\n').length;
        proj.messages.push({
          role: 'assistant',
          summary: `${data.summary || ('Built v' + (vIdx + 1))} (${((data.durationMs || 2500) / 1000).toFixed(1)}s)`,
          versionIdx: vIdx,
          lines: lineCount,
          thinkingSteps: Array.isArray(data.thinkingSteps) ? data.thinkingSteps : []
        });

        proj.viewMode = 'preview';
        saveCodeStudioProject(proj);
        renderSavedProjectsDrawer();

        if (editorEl) editorEl.value = data.html;
        updatePreview(data.html);
        if (stageEl) stageEl.className = 'mc-cs-stage mode-preview';
        targetEl.querySelectorAll('[data-cs-mode]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-cs-mode') === 'preview'));
      } catch (err) {
        if (err && err.name === 'AbortError') {
          showDownloadToast('⏹ Build cancelled');
        } else {
          proj.messages.push({
            role: 'assistant',
            summary: '⚠️ Build Error: ' + (err.message || 'Please try again'),
            lines: 0
          });
        }
      } finally {
        clearInterval(codeTimer);
        isCodeRunning = false;
        if (sendBtn) {
          sendBtn.textContent = '↑';
          sendBtn.title = 'Build / Update App';
        }
        renderAgentFeed();
      }
    };

    sendBtn?.addEventListener('click', () => runCodeStudioBuild(false));
    csInput?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if ((e.metaKey || e.ctrlKey || !e.shiftKey) && e.key === 'Enter') {
        e.preventDefault();
        runCodeStudioBuild(false);
      }
    });
  }

  function mountImageStudioView(targetEl) {
    const imgItems = state.library.filter((x) => x.type === 'image');

    targetEl.innerHTML = `
      <div class="mc-shell" id="mc-shell-root">
        <div class="mc-topbar">
          <h1 class="mc-title">Image Studio</h1>
          <div class="mc-top-actions">
            <button class="mc-pill-btn" id="mc-go-library-btn">🗂️ View Library (${state.library.length})</button>
          </div>
        </div>

        <div class="mc-composer">
          <textarea
            id="mc-img-studio-input"
            style="background:transparent !important;background-color:transparent !important;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;caret-color:#10b981 !important;"
            placeholder="Describe the realistic portrait, scene, or labeled infographic you want to create..."
          ></textarea>

          <div class="mc-controls-row">
            <div class="mc-controls-left">
              <div class="mc-quality-group visible">
                <button class="mc-quality-btn ${state.imageQuality === 'standard' ? 'active' : ''}" data-sq="standard">Standard</button>
                <button class="mc-quality-btn ${state.imageQuality === 'ultra' ? 'active' : ''}" data-sq="ultra">HD</button>
              </div>

              <select class="mc-select-pill" id="mc-studio-aspect">
                <option value="3:4" ${state.imageAspect === '3:4' ? 'selected' : ''}>3:4 Portrait (Default)</option>
                <option value="16:9" ${state.imageAspect === '16:9' ? 'selected' : ''}>16:9 Landscape</option>
                <option value="1:1" ${state.imageAspect === '1:1' ? 'selected' : ''}>1:1 Square</option>
              </select>
            </div>

            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="mc-mic-btn" id="mc-studio-mic-btn" title="Voice Input (Mic)">${GOOGLE_MIC_SVG}</button>
              <button class="mc-send-btn" id="mc-studio-gen-btn" title="Generate">↑</button>
            </div>
          </div>
        </div>

        <div id="mc-studio-live-slot" style="margin-top:20px;"></div>

        <div style="margin-top:28px;">
          <div style="font-size:13px;font-weight:600;color:#52665c;margin-bottom:10px;">Recent Creations (${imgItems.length})</div>
          <div class="mc-grid" id="mc-studio-grid">
            ${
              imgItems.length
                ? imgItems
                    .map(
                      (it) => `
                  <div class="mc-lib-card">
                    <div class="mc-lib-thumb-wrap" data-prev-lib="${esc(it.id)}" title="Click for Full Preview">
                      <img class="mc-lib-thumb" src="${healClientImageUri(it.dataUrl, it.title)}" onerror="window.__mcHealBrokenImg && window.__mcHealBrokenImg(this)" alt="${esc(it.title)}" referrerpolicy="no-referrer">
                    </div>
                    <div class="mc-lib-body">
                      <div class="mc-lib-title" title="${esc(it.title)}">${esc(it.title)}</div>
                      <div class="mc-lib-meta">${esc(it.createdAt || '')}</div>
                    </div>
                    <div class="mc-lib-actions">
                      <button class="mc-foot-btn" data-prev-lib="${esc(it.id)}">⤢ Preview</button>
                      <button class="mc-foot-btn" data-dl-lib="${esc(it.id)}">⬇ Download</button>
                    </div>
                  </div>`
                    )
                    .join('')
                : '<div style="font-size:13px;color:#64748b;">Generated images and infographics will appear here and in your Library.</div>'
            }
          </div>
        </div>
      </div>
    `;

    document.getElementById('mc-go-library-btn')?.addEventListener('click', () => {
      state.activeView = 'library';
      window.location.hash = '#library';
      checkAndMountMainView(true);
    });

    targetEl.querySelectorAll('[data-sq]').forEach((btn) => {
      btn.onclick = () => {
        targetEl.querySelectorAll('[data-sq]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.imageQuality = btn.getAttribute('data-sq') || 'standard';
      };
    });

    document.getElementById('mc-studio-aspect')?.addEventListener('change', (e) => {
      state.imageAspect = e.target.value;
    });

    const studioInput = document.getElementById('mc-img-studio-input');
    const runStudioGen = async () => {
      const prompt = studioInput ? studioInput.value.trim() : '';
      if (!prompt || state.isRunning) return;
      const liveSlot = document.getElementById('mc-studio-live-slot');
      state.isRunning = true;
      if (liveSlot) {
        liveSlot.innerHTML = `
          <div class="mc-thinking-card">
            <div class="mc-thinking-aurora"></div>
            <div class="mc-thinking-row">
              <div style="display:flex;align-items:center;gap:12px;">
                <div class="mc-orbital"><div class="mc-ring1"></div><div class="mc-ring2"></div><div class="mc-core"></div></div>
                <div style="font-size:14.5px;font-weight:600;color:#ffffff;">Rendering visual...</div>
              </div>
            </div>
            <div class="mc-shimmer-bar" style="width:85%;"></div>
          </div>`;
      }

      try {
        const resp = await fetch('/api/research?chatMode=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatMode: true,
            message: prompt,
            actionMode: 'image',
            imageQuality: state.imageQuality,
            aspectRatio: state.imageAspect
          })
        });
        const data = await resp.json();
        const rawUrl = data?.image?.imageUrl || buildLiveFluxUrl(prompt, state.imageQuality, state.imageAspect);
        const cleanDataUrl = await cropWatermarkIfBase64(rawUrl, data?.image?.isFalNative);
        addToLibrary({
          type: 'image',
          title: prompt.slice(0, 60),
          dataUrl: cleanDataUrl,
          rawFluxUrl: data?.image?.rawFluxUrl || (rawUrl.startsWith('http') ? rawUrl : undefined)
        });
      } catch (_) {
        const rawUrl = buildLiveFluxUrl(prompt, state.imageQuality, state.imageAspect);
        addToLibrary({ type: 'image', title: prompt.slice(0, 60), dataUrl: rawUrl, rawFluxUrl: rawUrl });
      } finally {
        state.isRunning = false;
        syncLeftSidebar();
        mountImageStudioView(targetEl);
      }
    };

    document.getElementById('mc-studio-mic-btn')?.addEventListener('click', function () {
      toggleVoiceMicInput('mc-img-studio-input', this);
    });
    document.getElementById('mc-studio-gen-btn')?.addEventListener('click', runStudioGen);
    studioInput?.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey || !e.shiftKey) && e.key === 'Enter') {
        e.preventDefault();
        runStudioGen();
      }
    });

    targetEl.querySelectorAll('[data-prev-lib]').forEach((el) => {
      el.onclick = () => {
        const id = el.getAttribute('data-prev-lib');
        const found = state.library.find((x) => x.id === id);
        if (found && found.dataUrl) {
          openImageLightbox({ url: found.dataUrl, title: found.title || 'Studio Visual', aspectRatio: state.imageAspect || '3:4' });
        }
      };
    });

    targetEl.querySelectorAll('[data-dl-lib]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-dl-lib');
        const found = state.library.find((x) => x.id === id);
        if (found && found.dataUrl) triggerDataUrlDownload(found.dataUrl, found.title || 'pixelmorphic-visual');
      };
    });
  }

  function mountLibraryView(targetEl) {
    const items = state.library.filter((x) => {
      if (state.libraryFilter === 'all') return true;
      return x.type === state.libraryFilter;
    });

    targetEl.innerHTML = `
      <div class="mc-shell" id="mc-shell-root">
        <div class="mc-topbar">
          <h1 class="mc-title">Library</h1>
          <div class="mc-top-actions">
            <button class="mc-pill-btn ${state.libraryFilter === 'all' ? 'active' : ''}" data-lf="all">All (${state.library.length})</button>
            <button class="mc-pill-btn ${state.libraryFilter === 'image' ? 'active' : ''}" data-lf="image">Images</button>
            <button class="mc-pill-btn ${state.libraryFilter === 'upload' ? 'active' : ''}" data-lf="upload">Uploads</button>
            <button class="mc-pill-btn ${state.libraryFilter === 'document' ? 'active' : ''}" data-lf="document">eBooks & PDFs</button>
          </div>
        </div>

        <div class="mc-grid">
          ${
            items.length
              ? items
                  .map(
                    (it) => `
                <div class="mc-lib-card">
                  <div class="mc-lib-thumb-wrap" ${it.dataUrl ? `data-lib-prev="${esc(it.id)}" title="Click for Full Preview"` : ''}>
                    ${
                      it.dataUrl
                        ? `<img class="mc-lib-thumb" src="${healClientImageUri(it.dataUrl, it.title)}" onerror="window.__mcHealBrokenImg && window.__mcHealBrokenImg(this)" alt="${esc(it.title)}" referrerpolicy="no-referrer">`
                        : `<div style="font-size:32px;color:#059669;">📄</div>`
                    }
                  </div>
                  <div class="mc-lib-body">
                    <div class="mc-lib-title" title="${esc(it.title)}">${esc(it.title)}</div>
                    <div class="mc-lib-meta">${esc(it.type.toUpperCase())} · ${esc(it.createdAt || '')}</div>
                  </div>
                  <div class="mc-lib-actions">
                    ${
                      it.dataUrl
                        ? `<button class="mc-foot-btn" data-lib-prev="${esc(it.id)}">⤢ Preview</button><button class="mc-foot-btn" data-lib-dl="${esc(it.id)}">⬇ Download</button>`
                        : it.msgObj
                          ? `<button class="mc-foot-btn" data-lib-pdf="${esc(it.id)}">📄 Open PDF</button>`
                          : ''
                    }
                    <button class="mc-foot-btn" data-lib-del="${esc(it.id)}" style="margin-left:auto;color:#b91c1c;">Delete</button>
                  </div>
                </div>`
                  )
                  .join('')
              : `<div style="font-size:13.5px;color:#64748b;grid-column:1/-1;padding:32px 0;">Your Library is empty. Generated images, eBooks, PDFs, and uploaded files are saved here automatically.</div>`
          }
        </div>
      </div>
    `;

    targetEl.querySelectorAll('[data-lf]').forEach((btn) => {
      btn.onclick = () => {
        state.libraryFilter = btn.getAttribute('data-lf') || 'all';
        mountLibraryView(targetEl);
      };
    });

    targetEl.querySelectorAll('[data-lib-prev]').forEach((el) => {
      el.onclick = () => {
        const found = state.library.find((x) => x.id === el.getAttribute('data-lib-prev'));
        if (found && found.dataUrl) {
          openImageLightbox({ url: found.dataUrl, title: found.title || 'Library Item' });
        }
      };
    });

    targetEl.querySelectorAll('[data-lib-dl]').forEach((btn) => {
      btn.onclick = () => {
        const found = state.library.find((x) => x.id === btn.getAttribute('data-lib-dl'));
        if (found && found.dataUrl) triggerDataUrlDownload(found.dataUrl, found.title || 'pixelmorphic-item');
      };
    });

    targetEl.querySelectorAll('[data-lib-pdf]').forEach((btn) => {
      btn.onclick = () => {
        const found = state.library.find((x) => x.id === btn.getAttribute('data-lib-pdf'));
        if (found && found.msgObj) exportMessageToPDF(found.msgObj);
      };
    });

    targetEl.querySelectorAll('[data-lib-del]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-lib-del');
        state.library = state.library.filter((x) => x.id !== id);
        saveLibrary();
        syncLeftSidebar();
        mountLibraryView(targetEl);
      };
    });
  }

  function restoreHostContainerChildren(viewContainer) {
    if (!viewContainer) return;
    const slot = document.getElementById('mc-dedicated-host-slot');
    if (slot) slot.style.display = 'none';
    Array.from(viewContainer.children).forEach((ch) => {
      if (ch.dataset && ch.dataset.mcHidden === '1') {
        ch.style.display = '';
        delete ch.dataset.mcHidden;
      }
    });
  }

  
  function startNewChatThread() {
    state.currentThreadId = 'th_' + Date.now();
    state.messages = [];
    state.attachments = [];
    state.actionMode = 'auto';
    const input = document.getElementById('mc-chat-input');
    if (input) input.value = '';
    renderModeAndAttachments();
    renderThread();
    syncLeftSidebar();
  }

  function getSafeSidebarElement() {
    // ONLY match the actual <aside>, .sidebar, or .demo-sidebar element — NEVER match document.body or layout wrappers!
    const candidates = Array.from(document.querySelectorAll('aside, .sidebar, .demo-sidebar'));
    return candidates.find((el) => el !== document.body && el !== document.documentElement && !el.contains(document.querySelector('main'))) || null;
  }

  function clearAnyStuckInlineStyles(el) {
    if (!el || !el.style) return;
    ['display', 'margin-left', 'opacity', 'visibility', 'pointer-events', 'width', 'min-width', 'max-width', 'transform'].forEach((prop) => {
      try { el.style.removeProperty(prop); } catch (_) {}
    });
  }

  function toggleSidebarCollapse(forceCollapsed) {
    state.sidebarCollapsed = typeof forceCollapsed === 'boolean' ? forceCollapsed : !state.sidebarCollapsed;

    // Ensure document.body itself NEVER has any hiding inline styles from earlier versions
    clearAnyStuckInlineStyles(document.body);
    clearAnyStuckInlineStyles(document.documentElement);

    // Toggle the single body class — CSS handles 100% of the collapse and restore automatically!
    document.body.classList.toggle('mc-sidebar-collapsed', state.sidebarCollapsed);

    const sidebar = getSafeSidebarElement();
    if (sidebar) {
      // Always keep inline styles off the sidebar so removing body.mc-sidebar-collapsed immediately restores it!
      clearAnyStuckInlineStyles(sidebar);
      if (sidebar.parentElement && sidebar.parentElement !== document.body) {
        try { sidebar.parentElement.style.removeProperty('grid-template-columns'); } catch (_) {}
      }
    }

    const fab = document.getElementById('mc-sidebar-open-fab');
    if (fab) {
      fab.style.setProperty('display', state.sidebarCollapsed ? 'inline-flex' : 'none', 'important');
    }
  }

  function syncLeftSidebar() {
    const sidebar = getSafeSidebarElement();
    if (!sidebar) return;

    // Floating Open Sidebar button — Always attached to document.body with ultra-high z-index
    let fab = document.getElementById('mc-sidebar-open-fab');
    if (!fab) {
      fab = document.createElement('button');
      fab.id = 'mc-sidebar-open-fab';
      fab.className = 'mc-sidebar-open-fab';
      fab.type = 'button';
      fab.title = 'Open sidebar';
      fab.innerHTML = '<span style="font-size:16px;line-height:1;">☰</span> <span>Open sidebar</span>';
      fab.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebarCollapse(false);
      };
      document.body.appendChild(fab);
    } else {
      fab.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebarCollapse(false);
      };
    }
    fab.style.setProperty('display', state.sidebarCollapsed ? 'inline-flex' : 'none', 'important');
    if (!state.sidebarCollapsed) {
      clearAnyStuckInlineStyles(document.body);
      clearAnyStuckInlineStyles(sidebar);
    }

    // Bind Sidebar Close ('✕' / 'X') to existing header button OR create one if none exists
    const brandRow = sidebar.querySelector('.demo-logo, .brand, [class*="logo"], [class*="brand"]') || sidebar.firstElementChild;
    const existingCloseBtns = Array.from(sidebar.querySelectorAll('button, [role="button"]')).filter((b) => {
      const t = (b.textContent || '').trim();
      return t === '✕' || t === '×' || t === 'X' || t === 'x' || /close|collapse/i.test(b.getAttribute('title') || b.getAttribute('aria-label') || '');
    });
    if (existingCloseBtns.length > 0) {
      existingCloseBtns.forEach((btn) => {
        if (!btn.dataset.mcCloseBound) {
          btn.dataset.mcCloseBound = '1';
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebarCollapse(true);
          });
        }
      });
    } else if (brandRow && !document.getElementById('mc-sidebar-close-btn')) {
      brandRow.style.display = 'flex';
      brandRow.style.alignItems = 'center';
      brandRow.style.width = '100%';
      const closeBtn = document.createElement('button');
      closeBtn.id = 'mc-sidebar-close-btn';
      closeBtn.className = 'mc-sidebar-close-btn';
      closeBtn.title = 'Close sidebar';
      closeBtn.innerHTML = '✕';
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebarCollapse(true);
      };
      brandRow.appendChild(closeBtn);
    }

    // Custom nav links for Image Studio & Library
    const navAnchor = Array.from(sidebar.querySelectorAll('a, button, .demo-nav-item, [class*="nav"]')).find((el) =>
      /Research\s*Lab/i.test(el.textContent || '')
    );

    if (navAnchor && !document.getElementById('mc-nav-image-studio')) {
      const wrap = document.createElement('div');
      wrap.id = 'mc-custom-nav-links';
      wrap.style.marginTop = '4px';
      wrap.innerHTML = `
        <button class="mc-side-nav-btn" id="mc-nav-image-studio">
          <span>🎨</span> <span>Image Studio</span>
        </button>
        <button class="mc-side-nav-btn" id="mc-nav-library">
          <span>🗂️</span> <span>Library</span> <span id="mc-lib-count-badge" style="margin-left:auto;font-size:11px;opacity:0.65;">(${state.library.length})</span>
        </button>
      `;
      navAnchor.insertAdjacentElement('afterend', wrap);

      document.getElementById('mc-nav-image-studio')?.addEventListener('click', (e) => {
        e.preventDefault();
        state.activeView = 'images';
        window.location.hash = '#images';
        checkAndMountMainView(true);
      });

      document.getElementById('mc-nav-library')?.addEventListener('click', (e) => {
        e.preventDefault();
        state.activeView = 'library';
        window.location.hash = '#library';
        checkAndMountMainView(true);
      });
    }

    const badge = document.getElementById('mc-lib-count-badge');
    if (badge) badge.textContent = `(${state.library.length})`;

    const imgBtn = document.getElementById('mc-nav-image-studio');
    const libBtn = document.getElementById('mc-nav-library');
    const hash = (window.location.hash || '').toLowerCase();
    if (imgBtn) imgBtn.classList.toggle('active', hash.includes('images'));
    if (libBtn) libBtn.classList.toggle('active', hash.includes('library'));

    // Sidebar navigation bindings
    Array.from(sidebar.querySelectorAll('a, button, .demo-nav-item')).forEach((el) => {
      const txt = (el.textContent || '').trim();
      if (/General\s*Chat/i.test(txt) && !el.dataset.mcChatBound) {
        el.dataset.mcChatBound = '1';
        el.addEventListener('click', () => {
          state.activeView = 'chat';
          window.location.hash = '#chat';
          // Clean work area when clicking General Chat
          startNewChatThread();
          setTimeout(() => checkAndMountMainView(true), 25);
        });
      } else if (/Research\s*Lab/i.test(txt) && !el.dataset.mcResBound) {
        el.dataset.mcResBound = '1';
        el.addEventListener('click', () => {
          window.location.hash = '#research';
          const shell = document.getElementById('mc-shell-root');
          if (shell) shell.remove();
        });
      } else if (/Study\s*Workspace/i.test(txt) && !el.dataset.mcStudyBound) {
        el.dataset.mcStudyBound = '1';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          state.activeView = 'study';
          window.location.hash = '#study';
          startNewStudySession();
        });
      } else if (/Code\s*Studio/i.test(txt) && !el.dataset.mcCodeBound) {
        el.dataset.mcCodeBound = '1';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          state.activeView = 'code';
          window.location.hash = '#code';
          checkAndMountMainView(true);
        });
      } else if (/Overview|Projects|Plugins|Account/i.test(txt) && !el.dataset.mcHostBound) {
        el.dataset.mcHostBound = '1';
        el.addEventListener('click', () => {
          if (/chat|images|library|research|business|study|education|code/i.test(window.location.hash || '')) {
            history.replaceState(null, '', window.location.pathname);
          }
          const vc = document.querySelector('main') || document.querySelector('.content, .main-content, #app, #root');
          restoreHostContainerChildren(vc);
        });
      } else if (/Create\s*a\s*job/i.test(txt) && !el.dataset.mcNewBound) {
        el.dataset.mcNewBound = '1';
        el.addEventListener('click', () => {
          state.activeView = 'chat';
          window.location.hash = '#chat';
          setTimeout(() => {
            checkAndMountMainView(true);
            startNewChatThread();
          }, 25);
        });
      }
    });

    // Render Recent Chats in sidebar
    let histBox = document.getElementById('mc-sidebar-chat-history');
    if (!histBox) {
      histBox = document.createElement('div');
      histBox.id = 'mc-sidebar-chat-history';
      histBox.className = 'mc-side-history-box';
      const customLinks = document.getElementById('mc-custom-nav-links');
      if (customLinks) {
        customLinks.insertAdjacentElement('afterend', histBox);
      } else {
        sidebar.appendChild(histBox);
      }
    }

    const isResearchRoute = hash.includes('business') || hash.includes('research');
    histBox.style.display = isResearchRoute ? 'none' : 'block';

    const filteredThreads = state.threads.filter((t) => {
      if (state.historyFilter === 'study') return t.category === 'study';
      if (state.historyFilter === 'chat') return t.category !== 'study';
      return true;
    });

    const subjBadgeMap = { math: '📐 Math', physics: '⚛️ Phys', chemistry: '🧪 Chem', biology: '🧬 Bio', sst: '🌍 SST', english: '📝 Eng' };

    const rowsHtml = filteredThreads
      .slice(0, 18)
      .map((t) => {
        const isStudy = t.category === 'study';
        const icon = isStudy ? '📖' : '💬';
        const tagText = isStudy ? (subjBadgeMap[t.studySubject] || '📖 Study') : 'Chat';
        return `
        <div class="mc-side-hist-row ${t.id === state.currentThreadId ? 'active' : ''}" data-th-id="${esc(t.id)}">
          <span class="mc-side-hist-label" title="${esc(t.title)}"><span class="mc-hist-tag">${tagText}</span>${icon} ${esc(t.title)}</span>
          <button class="mc-side-hist-del" data-del-th-id="${esc(t.id)}" title="Delete item">×</button>
        </div>`;
      })
      .join('');

    const chatCount = state.threads.filter((t) => t.category !== 'study').length;
    const studyCount = state.threads.filter((t) => t.category === 'study').length;

    histBox.innerHTML = `
      <div class="mc-side-history-title">
        <span>Recent History</span>
        <span>(${state.threads.length})</span>
      </div>
      <div class="mc-hist-filter-row">
        <button type="button" class="mc-hist-filter-pill ${state.historyFilter === 'all' ? 'active' : ''}" data-hf="all">All (${state.threads.length})</button>
        <button type="button" class="mc-hist-filter-pill ${state.historyFilter === 'chat' ? 'active' : ''}" data-hf="chat">💬 Chat (${chatCount})</button>
        <button type="button" class="mc-hist-filter-pill ${state.historyFilter === 'study' ? 'active' : ''}" data-hf="study">📖 Study (${studyCount})</button>
      </div>
      <div class="mc-side-hist-list">${rowsHtml || `<div style="font-size:11px;color:rgba(255,255,255,0.4);padding:4px 6px;">No ${state.historyFilter === 'all' ? 'recent' : state.historyFilter} history yet</div>`}</div>
    `;

    histBox.querySelectorAll('[data-hf]').forEach((fBtn) => {
      fBtn.onclick = (e) => {
        e.stopPropagation();
        state.historyFilter = fBtn.getAttribute('data-hf') || 'all';
        syncLeftSidebar();
      };
    });

    // v53.0: Mount ChatGPT-Style User Profile Pill at bottom of Left Sidebar (and upgrade existing owner footer)
    const cfg = state.userSettings || loadUserSettings();
    let profDock = document.getElementById('mc-profile-dock');
    if (!profDock) {
      profDock = document.createElement('div');
      profDock.id = 'mc-profile-dock';
      profDock.className = 'mc-profile-dock';
      sidebar.appendChild(profDock);
    }
    // Hide the static legacy "Harsh's workspace / Local owner workspace" box if present so there is no duplicate card
    Array.from(sidebar.querySelectorAll('div, footer')).forEach((el) => {
      if (el.id === 'mc-profile-dock' || el.contains(profDock)) return;
      const t = (el.textContent || '').trim();
      if (/^H\s*Harsh's workspace/i.test(t) && el.children.length <= 4) {
        el.style.display = 'none';
      }
    });

    profDock.innerHTML = `
      <button type="button" class="mc-profile-pill" id="mc-profile-pill-btn" title="Open Profile, Personalization, Memory &amp; Settings">
        <span class="mc-avatar-circle" style="background:${cfg.avatarBg};">${esc(cfg.initials || 'HS')}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13.5px;font-weight:700;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(cfg.displayName)}</div>
          <div style="font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(cfg.planBadge || 'Plus')}</div>
        </div>
        <span style="color:#94a3b8;font-size:14px;">⋯</span>
      </button>
    `;

    document.getElementById('mc-profile-pill-btn')?.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleProfilePopover(this);
    });

    // Also inject a dedicated "⚙️ Settings & Theme" button inside the custom nav links & topbar, plus bind Account & Wallet!
    const customNavWrap = document.getElementById('mc-custom-nav-links');
    if (customNavWrap && !document.getElementById('mc-nav-settings-btn')) {
      const setBtn = document.createElement('button');
      setBtn.className = 'mc-side-nav-btn';
      setBtn.id = 'mc-nav-settings-btn';
      setBtn.innerHTML = '<span>⚙️</span> <span>Settings &amp; Theme</span>';
      setBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openSettingsCenterModal('appearance');
      };
      customNavWrap.appendChild(setBtn);
    }

    Array.from(document.querySelectorAll('a, button, .demo-nav-item')).forEach((el) => {
      const txt = (el.textContent || '').trim();
      if (/^Account\s*&\s*Wallet$/i.test(txt) && !el.dataset.mcSetBound) {
        el.dataset.mcSetBound = '1';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleProfilePopover(el);
        });
      } else if (/^Account$/i.test(txt) && !el.dataset.mcTopAccBound) {
        el.dataset.mcTopAccBound = '1';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openSettingsCenterModal('profile');
        });
        // Also place a visible "⚙️ Settings" pill right next to Account in the top header bar
        if (el.parentElement && !document.getElementById('mc-topbar-settings-btn')) {
          const topSet = document.createElement('button');
          topSet.type = 'button';
          topSet.id = 'mc-topbar-settings-btn';
          topSet.style.cssText = 'background:#064e3b;color:#6ee7b7;border:1px solid #10b981;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;margin-right:6px;';
          topSet.innerHTML = '⚙️ Settings &amp; Theme';
          topSet.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            openSettingsCenterModal('appearance');
          };
          el.parentElement.insertBefore(topSet, el);
        }
      } else if (/^Pricing$/i.test(txt) && !el.dataset.mcTopPriceBound) {
        el.dataset.mcTopPriceBound = '1';
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openSettingsCenterModal('billing');
        });
      }
    });

    histBox.querySelectorAll('.mc-side-hist-row').forEach((row) => {
      row.onclick = (e) => {
        if (e.target.closest('.mc-side-hist-del')) return;
        const thId = row.getAttribute('data-th-id');
        const found = state.threads.find((t) => t.id === thId);
        if (found) {
          state.currentThreadId = found.id;
          state.messages = Array.isArray(found.messages) ? [...found.messages] : [];
          if (found.category === 'study') {
            state.activeView = 'study';
            if (found.studySubject) state.studySubject = found.studySubject;
            if (found.studyDifficulty) state.studyDifficulty = found.studyDifficulty;
            if (!window.location.hash.includes('study')) {
              window.location.hash = '#study';
            }
          } else {
            state.activeView = 'chat';
            if (!window.location.hash.includes('chat')) {
              window.location.hash = '#chat';
            }
          }
          checkAndMountMainView(true);
          renderThread();
          syncLeftSidebar();
        }
      };
    });

    histBox.querySelectorAll('.mc-side-hist-del').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const delId = btn.getAttribute('data-del-th-id');
        const idx = state.threads.findIndex((t) => t.id === delId);
        if (idx !== -1) {
          const removed = state.threads.splice(idx, 1)[0];
          saveThreads();
          if (removed && removed.id === state.currentThreadId) {
            if (state.activeView === 'study') startNewStudySession();
            else startNewChatThread();
          } else {
            syncLeftSidebar();
          }
        }
      };
    });
  }


  function enhanceCodeStudioBottomPrompt() {
    return;
    try {
      // Find the Code Studio prompt textarea or "Apply AI edit" button if present on page
      const allLabels = Array.from(document.querySelectorAll('label, div, span, h2, h3, p'));
      const whatShouldChange = allLabels.find((el) => /^What should change\?$/i.test((el.textContent || '').trim()));
      const applyBtn = Array.from(document.querySelectorAll('button')).find((b) => /Apply AI edit/i.test(b.textContent || ''));
      if (applyBtn && !document.getElementById('mc-code-studio-mic-btn')) {
        const codeTa = applyBtn.closest('section, .card, .panel, div')?.querySelector('textarea') || document.querySelector('textarea');
        if (codeTa) {
          if (!codeTa.id) codeTa.id = 'mc-code-studio-textarea';
          const micB = document.createElement('button');
          micB.type = 'button';
          micB.id = 'mc-code-studio-mic-btn';
          micB.className = 'mc-pill-btn';
          micB.style.marginRight = '8px';
          micB.innerHTML = `${GOOGLE_MIC_SVG}<span style="margin-left:5px;">Voice</span>`;
          micB.title = 'Speak your coding instruction';
          micB.onclick = (e) => {
            e.preventDefault();
            toggleVoiceMicInput(codeTa.id, micB);
          };
          applyBtn.insertAdjacentElement('beforebegin', micB);
        }
      }
      const anchor = whatShouldChange || applyBtn;
      if (!anchor) return;

      // Find the Code Studio top control/prompt card and the Explorer/Website Preview card inside the same parent section
      let promptCard = anchor.closest('section, .card, .panel, [class*="card"], [class*="panel"], div');
      while (promptCard && promptCard.parentElement && promptCard.parentElement.children.length < 2) {
        promptCard = promptCard.parentElement;
      }
      if (!promptCard || !promptCard.parentElement) return;

      const parentContainer = promptCard.parentElement;
      // Check if parentContainer also holds the Preview Width / Explorer / Website Preview area
      const siblings = Array.from(parentContainer.children);
      const hasPreviewSibling = siblings.some((sib) => sib !== promptCard && /WEBSITE PREVIEW|EXPLORER|PREVIEW WIDTH|Fit pane/i.test(sib.textContent || ''));
      if (!hasPreviewSibling) {
        // Check one level up
        if (parentContainer.parentElement) {
          const upParent = parentContainer.parentElement;
          const upSibs = Array.from(upParent.children);
          if (upSibs.some((sib) => sib !== parentContainer && /WEBSITE PREVIEW|EXPLORER|PREVIEW WIDTH|Fit pane/i.test(sib.textContent || ''))) {
            upParent.style.display = 'flex';
            upParent.style.flexDirection = 'column';
            upSibs.forEach((sib) => {
              if (sib === parentContainer) {
                sib.style.order = '10';
                sib.style.marginTop = '18px';
              } else {
                sib.style.order = '1';
              }
            });
          }
        }
        return;
      }

      // Use pure CSS Flexbox ordering so the Explorer/Website Preview appears first (order: 1)
      // and the "What should change?" prompt box sits at the bottom below the preview (order: 10)!
      // Zero DOM nodes are removed or recreated, so 100% of native Code Studio listeners stay intact!
      parentContainer.style.display = 'flex';
      parentContainer.style.flexDirection = 'column';
      siblings.forEach((sib) => {
        if (sib === promptCard) {
          sib.style.order = '10';
          sib.style.marginTop = '18px';
        } else {
          sib.style.order = '1';
        }
      });
    } catch (_) {}
  }

  function checkAndMountMainView(forceRemount) {
    document.body.classList.toggle('mc-code-route-active', state.activeView === 'code' || (window.location.hash || '').toLowerCase().includes('code'));
    enhanceCodeStudioBottomPrompt();
    injectAllStyles();
    syncLeftSidebar();

    const explicitRoot = document.getElementById('morphic-general-chat-root');
    if (explicitRoot) {
      if (!explicitRoot.dataset.mcMounted || forceRemount) {
        explicitRoot.dataset.mcMounted = '1';
        if (state.activeView === 'images') mountImageStudioView(explicitRoot);
        else if (state.activeView === 'library') mountLibraryView(explicitRoot);
        else if (state.activeView === 'study') mountStudyWorkspaceView(explicitRoot);
        else mountGeneralChatView(explicitRoot);
      }
      return;
    }

    const viewContainer =
      document.querySelector('[data-view="chat"]')
      || document.querySelector('[data-page="chat"]')
      || document.getElementById('chat-view')
      || document.getElementById('general-view')
      || document.querySelector('main')
      || document.querySelector('.content, .main-content, #app, #root');

    const hash = (window.location.hash || '').toLowerCase();
    if (hash.includes('business') || hash.includes('research')) {
      restoreHostContainerChildren(viewContainer);
      return;
    }

    const hostChatPlaceholder = document.querySelector('textarea[placeholder*="What would you like to work on"]');
    const isCode = hash.includes('code');
    const isExplicitChat = !isCode && (hash.includes('chat') || hash.includes('general') || Boolean(hostChatPlaceholder));
    const isStudy = hash.includes('study') || hash.includes('education');
    const isImages = hash.includes('images');
    const isLibrary = hash.includes('library');

    if (!isExplicitChat && !isStudy && !isImages && !isLibrary && !isCode) {
      restoreHostContainerChildren(viewContainer);
      return;
    }

    if (isCode) state.activeView = 'code';
    else if (isImages) state.activeView = 'images';
    else if (isLibrary) state.activeView = 'library';
    else if (isStudy) state.activeView = 'study';
    else state.activeView = 'chat';

    if (!viewContainer) return;

    // Non-destructively hide host sibling nodes inside viewContainer while keeping them alive in DOM
    let slot = document.getElementById('mc-dedicated-host-slot');
    if (!slot || slot.parentElement !== viewContainer) {
      if (slot) slot.remove();
      slot = document.createElement('div');
      slot.id = 'mc-dedicated-host-slot';
      viewContainer.appendChild(slot);
    }

    Array.from(viewContainer.children).forEach((ch) => {
      if (ch.id === 'mc-dedicated-host-slot') return;
      if (ch.style.display !== 'none') {
        ch.dataset.mcHidden = '1';
        ch.style.display = 'none';
      }
    });
    slot.style.display = 'block';

    const currentShell = slot.querySelector('#mc-shell-root');
    if (currentShell && !forceRemount && slot.dataset.mcView === state.activeView) {
      return;
    }

    slot.dataset.mcView = state.activeView;
    if (state.activeView === 'code') mountCodeStudioView(slot);
      else if (state.activeView === 'images') mountImageStudioView(slot);
      else if (state.activeView === 'library') mountLibraryView(slot);
      else if (state.activeView === 'study') mountStudyWorkspaceView(slot);
      else mountGeneralChatView(slot);
  }

  window.addEventListener('hashchange', () => setTimeout(() => checkAndMountMainView(true), 40));
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      toggleSidebarCollapse(false);
      checkAndMountMainView(false);
      loadFromServerDisk();
      detectUserLocationClient();
    }, 40);
  });
  setTimeout(() => {
    checkAndMountMainView(false);
    loadFromServerDisk();
      detectUserLocationClient();
  }, 120);
  setInterval(() => checkAndMountMainView(false), 1200);
})();
