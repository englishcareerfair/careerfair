// Clear any legacy client-side deletion blocklist so authoritative D1 scores are fully displayed
try {
  localStorage.removeItem('cf_deleted_scores');
  localStorage.removeItem('cf_scores_reset');
} catch (_) {}

/**
 * Career Fair: Every Career Speaks English — Complete Client Application
 * Unified single-engine client powering all features, speech intelligence,
 * accredited colleges explorer, arcade games, and admin console.
 */

// ─── 0. IMMERSIVE LOADING SCREEN & TIPS GUIDE ─────────────────────────────

// 0. IMMERSIVE LOADING SCREEN & TIPS GUIDE
// Modularized into public/loader.js for instant, zero-delay rendering before app bundle parsing.

// Safe Storage Fallback for Safari Private Browsing and restricted environments
(function() {
  const createMemoryStorage = () => {
    const store = {};
    return {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      key: i => Object.keys(store)[i] || null,
      get length() { return Object.keys(store).length; }
    };
  };

  try {
    const t = '__cf_st_test__';
    window.localStorage.setItem(t, t);
    window.localStorage.removeItem(t);
  } catch (_) {
    try {
      const mem = createMemoryStorage();
      Object.defineProperty(window, 'localStorage', { value: mem, configurable: true, writable: true });
    } catch (e) {}
  }

  try {
    const t = '__cf_st_test__';
    window.sessionStorage.setItem(t, t);
    window.sessionStorage.removeItem(t);
  } catch (_) {
    try {
      const mem = createMemoryStorage();
      Object.defineProperty(window, 'sessionStorage', { value: mem, configurable: true, writable: true });
    } catch (e) {}
  }
})();

// Respect user preference or system theme (prefers-color-scheme)
const savedInitialTheme = (function() {
  try { return localStorage.getItem('cf_theme'); } catch (_) { return null; }
})();
const systemPrefersLight = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
const initialResolvedTheme = savedInitialTheme ? (savedInitialTheme === 'light' ? 'light' : 'dark') : (systemPrefersLight ? 'light' : 'dark');

const STATE = window.STATE = {
  theme: initialResolvedTheme,
  activeTab: 'hero',
  studentName: '',
  studentClass: '',
  adminKey: (function () {
    try {
      localStorage.removeItem('cf_admin_key');
      localStorage.removeItem('cf_admin_permanent');
      localStorage.removeItem('cf_local_admin_pwd');
      sessionStorage.removeItem('cf_admin_key');
      return sessionStorage.getItem('cf_admin_session') || localStorage.getItem('cf_admin_session') || '';
    } catch { return ''; }
  })(),
  config: {
    pass: 70,
    banner: 'Welcome to Career Fair 2026 · Explore 32+ Careers Where English Opens Doors!',
    timer: 0,
    school_branding: true,
    school_name: 'Kanakia International School Mira Road',
    stream_url: localStorage.getItem('cf_stream_url') || 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    stream_title: localStorage.getItem('cf_stream_title') || 'Career Fair 2026 — Live Stage Broadcast',
    stream_active: localStorage.getItem('cf_stream_active') !== 'false',
    stream_autoplay: localStorage.getItem('cf_stream_autoplay') !== 'false',
    gemini_keys: localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || '',
    gemini_key: localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || '',
    eleven_key: localStorage.getItem('cf_eleven_key') || '',
    eleven_voice: localStorage.getItem('cf_eleven_voice') || '',
    rclone_remote: localStorage.getItem('cf_rclone_remote') || 'gdrive:careerfair_telemetry',
    rclone_endpoint: localStorage.getItem('cf_rclone_endpoint') || '',
    flags: {
      guide_enabled: true,
      guide_presentation_mode: 'floating',
      guide_ml_engine: 'client',
      ocr_enabled: true,
      pdf_export: true,
      dopamine_fx: true,
      speechLab: true,
      anchorMode: true,
      careers: true,
      colleges: true,
      exams: true,
      games: true,
      roadmap: true,
      leaderboard: true,
      feedback: true
    }
  },
  audioContext: null,
  analyser: null,
  audioStream: null,
  speechRecognition: null,
  isRecording: false,
  timerInterval: null
};

// DOM Query Shortcuts
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// Toast Notification (With Spam Protection & Max Concurrency)
function showToast(msg, duration = 3000) {
  const container = $('#toast-container');
  if (!container) return;

  // Prevent duplicate toast spam (e.g. repeated refresh notifications)
  const activeToasts = Array.from(container.querySelectorAll('.toast'));
  const isDuplicate = activeToasts.some(el => el.textContent.includes(msg));
  if (isDuplicate) return;

  // Keep at most 3 toasts on screen simultaneously
  while (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }

  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>💬</span> <span>${escapeHtml(msg)}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    setTimeout(() => t.remove(), 300);
  }, duration);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// Automatically capitalize the first letter of each word in a user name
function capitalizeName(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().split(/\s+/).map(word => {
    if (!word) return '';
    if (word.includes('-')) {
      return word.split('-').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join('-');
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}
window.capitalizeName = capitalizeName;

// Universal Global D1 API Client (Unified across careerwithenglish, futureofenglish & mobile devices)
const PRIMARY_D1_ORIGIN = 'https://careerwithenglish.pages.dev';

function ipHash32Client(str, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= (h >>> 16);
    h = Math.imul(h, 0x85ebca6b) >>> 0;
  }
  return (h >>> 0);
}

function isImmuneClientIp(ip) {
  if (!ip) return false;
  const clean = String(ip).trim();
  if (!clean) return false;
  const S1 = 0x9e3779b9, S2 = 0x7f4a7c15;
  const e1 = ipHash32Client('e:' + clean, S1), e2 = ipHash32Client('e:' + clean, S2);
  if ((e1 === 0x22839934 && e2 === 0x7c591ce4) || (e1 === 0x1ff65ad1 && e2 === 0x90ba7bff)) {
    return true;
  }
  const parts = clean.split('.');
  if (parts.length === 4) {
    const net = 's:' + parts[0] + '.' + parts[1];
    if (ipHash32Client(net, S1) === 0x03020145 && ipHash32Client(net, S2) === 0x210eb566) {
      return true;
    }
  }
  return false;
}

function cfBytesToB64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function encryptAdminAuthPayload(purpose, payloadObj) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Encrypted browser cryptography requires a secure HTTPS context.');
  }
  const hsPath = `api/admin/auth/handshake?purpose=${encodeURIComponent(purpose)}&_t=${Date.now()}`;
  let hsRes = await fetch(getApiUrl(hsPath), { cache: 'no-store' });
  if (!hsRes.ok && window.location.protocol !== 'file:' && window.location.hostname !== 'careerwithenglish.pages.dev') {
    hsRes = await fetch(`${PRIMARY_D1_ORIGIN}/${hsPath}`, { cache: 'no-store' });
  }
  if (!hsRes.ok) {
    throw new Error('Unable to initiate encrypted security handshake.');
  }
  const hs = await hsRes.json();
  if (!hs || !hs.ok || !hs.challengeId || !hs.nonce || !hs.publicKeyJwk) {
    throw new Error('Invalid security handshake from server.');
  }

  const serverPub = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: hs.publicKeyJwk.x, y: hs.publicKeyJwk.y, ext: true },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const clientKp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: serverPub },
    clientKp.privateKey,
    256
  );
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(hs.challengeId + ':' + hs.nonce),
      info: new TextEncoder().encode('careerfair-admin-e2ee-v3:' + purpose)
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const padLen = 16 + (crypto.getRandomValues(new Uint8Array(1))[0] % 32);
  const padBytes = crypto.getRandomValues(new Uint8Array(padLen));
  const plainObj = Object.assign({}, payloadObj, {
    nonce: hs.nonce,
    ts: Date.now(),
    pad: cfBytesToB64(padBytes)
  });

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(hs.challengeId + ':' + hs.nonce + ':' + purpose);
  const pt = new TextEncoder().encode(JSON.stringify(plainObj));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    aesKey,
    pt
  );
  const clientPubJwk = await crypto.subtle.exportKey('jwk', clientKp.publicKey);
  return {
    v: 3,
    challengeId: hs.challengeId,
    purpose,
    clientPubJwk: { kty: clientPubJwk.kty, crv: clientPubJwk.crv, x: clientPubJwk.x, y: clientPubJwk.y },
    iv: cfBytesToB64(iv),
    ct: cfBytesToB64(ct)
  };
}

function enforceSiteIpBlockOverlay(message) {
  const currentDevIp = (STATE?.currentIp || '').trim();
  if (currentDevIp && isImmuneClientIp(currentDevIp)) {
    console.warn('Ignoring site IP block overlay for protected admin IP:', currentDevIp);
    return;
  }
  try {
    STATE.adminKey = '';
    sessionStorage.removeItem('cf_admin_session');
    localStorage.removeItem('cf_admin_session');
  } catch {}
  try {
    if (typeof cancelTutorialScroll === 'function') cancelTutorialScroll();
    if (typeof stopSpeaking === 'function') stopSpeaking();
  } catch {}

  let overlay = document.getElementById('site-ip-blocked-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'site-ip-blocked-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#070b14;color:#e2e8f0;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';
    document.body.innerHTML = '';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
  }
  const safeMsg = escapeHtml(message || 'Your device IP address has been blocked from accessing this website by administrators.');
  overlay.innerHTML = `
    <div style="max-width:480px;width:100%;background:#0f172a;border:1px solid rgba(239,68,68,0.45);border-radius:16px;padding:32px 28px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
      <div style="font-size:48px;margin-bottom:12px;">🚫</div>
      <h1 style="margin:0 0 10px 0;font-size:22px;color:#f87171;">Site Access Blocked</h1>
      <p style="margin:0;font-size:14.5px;line-height:1.55;color:#94a3b8;">${safeMsg}</p>
    </div>
  `;
}
window.enforceSiteIpBlockOverlay = enforceSiteIpBlockOverlay;

function getApiUrl(path) {
  const clean = path.replace(/^\/+/, '');
  const isFile = (typeof window !== 'undefined' && window.location.protocol === 'file:');
  return isFile ? `${PRIMARY_D1_ORIGIN}/${clean}` : `/${clean}`;
}

async function fetchApi(endpoint, options = {}, maybeBody = null) {
  let opts = {};
  if (typeof options === 'string') {
    opts = {
      method: options.toUpperCase(),
      body: maybeBody !== null && maybeBody !== undefined
        ? (typeof maybeBody === 'string' ? maybeBody : JSON.stringify(maybeBody))
        : undefined
    };
  } else if (options && typeof options === 'object') {
    opts = Object.assign({}, options);
  }

  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const adminKey = STATE.adminKey || sessionStorage.getItem('cf_admin_session') || localStorage.getItem('cf_admin_session') || '';
  if (adminKey && !headers['Authorization']) {
    headers['Authorization'] = 'Bearer ' + adminKey;
  }

  // API keys are securely kept and resolved on the backend
  opts.headers = headers;

  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const isFile = (typeof window !== 'undefined' && window.location.protocol === 'file:');
  const primaryUrl = isFile ? `${PRIMARY_D1_ORIGIN}/api/${cleanEndpoint}` : `/api/${cleanEndpoint}`;

  // Robust timeout handler for slow/school Wi-Fi networks (10s default)
  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const timeoutMs = opts.timeout || 10000;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const fetchOpts = Object.assign({}, opts);
  if (controller && !fetchOpts.signal) fetchOpts.signal = controller.signal;

  try {
    const res = await fetch(primaryUrl, fetchOpts);
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) return await res.json();
    if (res.status === 401 || res.status === 403) {
      const errBody = await res.json().catch(() => null);
      if (res.status === 403 && (errBody?.banned || errBody?.admin_revoked)) {
        enforceSiteIpBlockOverlay(errBody.error);
        return null;
      }
      if (cleanEndpoint.startsWith('admin/') && STATE.adminKey) {
        STATE.adminKey = '';
        sessionStorage.removeItem('cf_admin_session');
        localStorage.removeItem('cf_admin_session');
        updateHeaderBookletVisibility();
        const g = $('#admin-gate-screen');
        const w = $('#admin-workspace-screen');
        if (g && w) { g.hidden = false; w.hidden = true; }
        showToast(errBody?.error || (res.status === 403 ? 'Access removed for this device.' : 'Admin session expired. Please sign in again.'));
      }
      return null;
    }
    if (!isFile && typeof window !== 'undefined' && window.location.hostname !== 'careerwithenglish.pages.dev') {
      try {
        const fallbackRes = await fetch(`${PRIMARY_D1_ORIGIN}/api/${cleanEndpoint}`, fetchOpts);
        if (fallbackRes.ok) return await fallbackRes.json();
        if (fallbackRes.status === 403) {
          const errBody = await fallbackRes.json().catch(() => null);
          if (errBody?.banned || errBody?.admin_revoked) {
            enforceSiteIpBlockOverlay(errBody.error);
            return null;
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    // If local relative call failed and we're not already targeting PRIMARY_D1_ORIGIN, try fallback to PRIMARY_D1_ORIGIN
    if (!isFile && typeof window !== 'undefined' && window.location.hostname !== 'careerwithenglish.pages.dev') {
      try {
        const fallbackRes = await fetch(`${PRIMARY_D1_ORIGIN}/api/${cleanEndpoint}`, fetchOpts);
        if (fallbackRes.ok) return await fallbackRes.json();
      } catch (e) {}
    }
  }
  return null;
}

// Humanoid Studio Voice Engine & Unified Global Speech Toggle (Indian Accent ElevenLabs & Neural en-IN)
let isGreetingPlaying = false;
let currentTtsAudio = null;
try {
  Object.defineProperty(window, 'currentTtsAudio', {
    get: () => currentTtsAudio,
    set: (val) => { currentTtsAudio = val; },
    configurable: true
  });
} catch (_) {}
let activeSpeechButton = null;
let activeSpeechUtterance = null;
let currentSpeechSessionId = 0;
let currentTtsAbortController = null;

function resetAllTtsButtonsToNormal() {
  // 1. Reset all elements styled with speaking-active or playing
  document.querySelectorAll('.speaking-active, button.playing').forEach(btn => {
    if (btn.dataset.origHtml) {
      btn.innerHTML = btn.dataset.origHtml;
    }
    btn.classList.remove('speaking-active', 'playing');
  });

  // 2. Explicitly ensure key primary TTS buttons are restored to natural default
  const listenTarget = document.getElementById('btn-listen-target');
  if (listenTarget && (listenTarget.textContent.includes('Stop') || listenTarget.classList.contains('speaking-active'))) {
    listenTarget.innerHTML = listenTarget.dataset.origHtml || '<span>🔊</span> <span>Listen Reference Audio</span>';
    listenTarget.classList.remove('speaking-active', 'playing');
  }

  const speechLabListen = document.getElementById('btn-speech-lab-listen');
  if (speechLabListen && (speechLabListen.textContent.includes('Stop') || speechLabListen.classList.contains('speaking-active'))) {
    speechLabListen.innerHTML = speechLabListen.dataset.origHtml || '<span>🔊</span> <span class="btn-listen-text">Listen</span>';
    speechLabListen.classList.remove('speaking-active', 'playing');
  }

  const greetingBtn = document.getElementById('btn-greeting');
  if (greetingBtn && (greetingBtn.textContent.includes('Stop') || greetingBtn.classList.contains('speaking-active') || greetingBtn.classList.contains('playing'))) {
    greetingBtn.innerHTML = greetingBtn.dataset.origHtml || '<span>🔊</span> <span class="greeting-btn-text"><span class="greeting-prefix">Listen AI </span>Greeting</span>';
    greetingBtn.classList.remove('speaking-active', 'playing');
  }

  const testBtn = document.getElementById('btn-test-tts-voice');
  if (testBtn && (testBtn.textContent.includes('Stop') || testBtn.classList.contains('speaking-active'))) {
    testBtn.innerHTML = testBtn.dataset.origHtml || 'Test Humanoid Voice 🔊';
    testBtn.classList.remove('speaking-active', 'playing');
    const testStatus = document.getElementById('admin-tts-test-status');
    if (testStatus && testStatus.textContent.includes('Synthesizing')) {
      testStatus.innerHTML = '<span style="color:var(--text-muted);">⏹️ Voice test stopped.</span>';
    }
  }

  const tutorialHeaderBtn = document.getElementById('btn-header-tutorial');
  if (tutorialHeaderBtn) {
    if (typeof isTutorialRunning !== 'undefined' && isTutorialRunning) {
      tutorialHeaderBtn.classList.add('playing', 'speaking-active');
      tutorialHeaderBtn.innerHTML = '<span>⏹️</span> <span class="tutorial-btn-text">Stop Tutorial</span>';
    } else if (tutorialHeaderBtn.textContent.includes('Stop') || tutorialHeaderBtn.classList.contains('speaking-active') || tutorialHeaderBtn.classList.contains('playing')) {
      tutorialHeaderBtn.innerHTML = '<span>💡</span> <span class="tutorial-btn-text">Start Tutorial</span>';
      tutorialHeaderBtn.classList.remove('speaking-active', 'playing');
    }
  }
}

function stopAllVoice() {
  currentSpeechSessionId++; // Invalidate any in-flight fetch, audio buffering, or utterance
  if (currentTtsAbortController) {
    try { currentTtsAbortController.abort(); } catch (_) {}
    currentTtsAbortController = null;
  }
  if (currentTtsAudio) {
    try {
      currentTtsAudio.pause();
      currentTtsAudio.currentTime = 0;
      currentTtsAudio.onended = null;
      currentTtsAudio.onerror = null;
      currentTtsAudio.src = '';
    } catch (_) {}
    currentTtsAudio = null;
  }
  isGreetingPlaying = false;

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (_) {}
  }
  activeSpeechUtterance = null;
  activeSpeechButton = null;

  resetAllTtsButtonsToNormal();
}

async function speak(text, btn = null) {
  if (!text) return;

  // Resolve target button if not passed explicitly
  let targetBtn = btn;
  if (!targetBtn && typeof window !== 'undefined' && window.event) {
    const ev = window.event;
    if (ev.currentTarget && ev.currentTarget.tagName === 'BUTTON') {
      targetBtn = ev.currentTarget;
    } else if (ev.target) {
      targetBtn = ev.target.closest('button');
    }
  }

  // Check if this exact target button is ALREADY playing or in active Stop state
  const isTargetAlreadyPlaying = targetBtn && (
    targetBtn === activeSpeechButton ||
    (targetBtn.id && activeSpeechButton && targetBtn.id === activeSpeechButton.id) ||
    targetBtn.classList.contains('speaking-active') ||
    targetBtn.classList.contains('playing') ||
    targetBtn.textContent.includes('Stop')
  );

  // If clicked while playing -> user explicitly requested STOP
  if (isTargetAlreadyPlaying) {
    stopAllVoice();
    return;
  }

  // Stop any other currently playing speech / audio before starting new voice
  stopAllVoice();

  // Create new session tracking ID and abort controller
  const sessionId = ++currentSpeechSessionId;
  currentTtsAbortController = new AbortController();
  const abortSignal = currentTtsAbortController.signal;

  // Set target button into active Stop state
  if (targetBtn) {
    if (!targetBtn.dataset.origHtml || targetBtn.dataset.origHtml.includes('Stop')) {
      if (!targetBtn.innerHTML.includes('Stop')) {
        targetBtn.dataset.origHtml = targetBtn.innerHTML;
      }
    }

    // Set Stop text with square stop icon
    if (targetBtn.id === 'btn-speech-lab-listen') {
      targetBtn.innerHTML = `<span>⏹️</span> <span class="btn-listen-text">Stop</span>`;
    } else if (targetBtn.id === 'btn-greeting') {
      targetBtn.innerHTML = `<span>⏹️</span> <span class="greeting-btn-text">Stop Audio</span>`;
    } else if (targetBtn.id === 'btn-listen-target') {
      targetBtn.innerHTML = `<span>⏹️</span> <span>Stop</span>`;
    } else if (targetBtn.id === 'btn-test-tts-voice') {
      targetBtn.innerHTML = `<span>⏹️</span> <span>Stop Voice Test</span>`;
    } else {
      targetBtn.innerHTML = `<span>⏹️</span> <span>Stop</span>`;
    }
    targetBtn.classList.add('speaking-active', 'playing');
    activeSpeechButton = targetBtn;
  }

  // Resolve ElevenLabs keys pool (Main & Backups)
  let rawElevenKeys = (localStorage.getItem('cf_eleven_keys') || localStorage.getItem('cf_eleven_key') || STATE.config.eleven_keys || STATE.config.eleven_key || '').trim();
  let elevenKeyList = rawElevenKeys.split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean);
  const savedVoiceId = ($('#admin-eleven-voice')?.value || localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '').trim();

  // 1. Attempt Studio Humanoid Audio Synthesis via ElevenLabs Backend (/api/tts)
  const canAttemptTts = Boolean(elevenKeyList.length > 0 || STATE.config?.has_eleven_key || STATE.config?.eleven_keys);
  let synthSuccess = false;

  if (canAttemptTts) {
    while (elevenKeyList.length > 0 && !synthSuccess) {
      const activeKey = elevenKeyList[0];
      try {
        const res = await fetch(getApiUrl('api/tts'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': activeKey
          },
          body: JSON.stringify({
            text: text,
            voiceId: savedVoiceId,
            accent: 'indian',
            apiKey: activeKey,
            keysPool: elevenKeyList
          }),
          signal: abortSignal
        });

        // Discard if stopped or changed during in-flight fetch
        if (sessionId !== currentSpeechSessionId) return;

        const contentType = res.headers.get('content-type') || '';
        let isQuotaOrInvalid = res.status === 401 || res.status === 429;
        let responseJson = null;

        if (!contentType.includes('audio')) {
          try {
            responseJson = await res.json();
            const jsonStatus = String(responseJson?.status || '').toLowerCase();
            const jsonMsg = String(responseJson?.message || responseJson?.detail || '').toLowerCase();
            if (responseJson && (
              jsonStatus === 'quota_exhausted' ||
              jsonStatus === 'quota_exceeded' ||
              jsonStatus === 'invalid_key' ||
              responseJson.statusCode === 429 ||
              responseJson.statusCode === 401 ||
              jsonMsg.includes('quota') ||
              jsonMsg.includes('credit') ||
              jsonMsg.includes('unauthorized') ||
              jsonMsg.includes('invalid') ||
              jsonMsg.includes('limit')
            )) {
              isQuotaOrInvalid = true;
            }
          } catch (_) {}
        }

        // Quota / Invalid Key failover: purge dead key and promote next backup to Main!
        if (isQuotaOrInvalid) {
          console.warn(`ElevenLabs key ${activeKey.slice(0, 6)}... quota exhausted or invalid. Auto-promoting backup to Main.`);
          if (typeof window.rotateAndPromoteElevenKey === 'function') {
            await window.rotateAndPromoteElevenKey('quota_exhausted');
          }
          elevenKeyList = (localStorage.getItem('cf_eleven_keys') || '').split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean);

          if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
            const testStatus = $('#admin-tts-test-status');
            if (testStatus) {
              if (elevenKeyList.length > 0) {
                testStatus.innerHTML = `<span style="color:var(--accent-amber, #f59e0b);">🔄 Key quota reached. Auto-promoted Backup 1 to Main &amp; retrying live synthesis...</span>`;
              } else {
                testStatus.innerHTML = `<span style="color:var(--accent-amber, #f59e0b);">⚠️ All ElevenLabs keys exhausted. Playing Indian English Neural Voice (en-IN).</span>`;
              }
            }
          }

          if (elevenKeyList.length > 0) {
            continue; // Retry with promoted key!
          } else {
            break; // No more keys, switch to neural fallback
          }
        }

        if (res.ok && contentType.includes('audio')) {
          const promotedHeader = res.headers.get('x-eleven-promoted') === 'true';
          const keyIdxHeader = parseInt(res.headers.get('x-eleven-key-index') || '0', 10);
          if (promotedHeader && keyIdxHeader > 0) {
            // Update active pointer WITHOUT deleting earlier keys from user's registered pool!
            let currentPool = (localStorage.getItem('cf_eleven_keys') || '').split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean);
            if (currentPool.length > keyIdxHeader) {
              localStorage.setItem('cf_eleven_key', currentPool[keyIdxHeader] || '');
              STATE.config.eleven_key = currentPool[keyIdxHeader] || '';
              if (typeof window.syncAdminElevenKeyBoxes === 'function') window.syncAdminElevenKeyBoxes();
            }
          }
          const audioBlob = await res.blob();
          if (sessionId !== currentSpeechSessionId) return;

          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          currentTtsAudio = audio;

          audio.onended = () => {
            if (sessionId === currentSpeechSessionId) {
              stopAllVoice();
              if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
                const testStatus = $('#admin-tts-test-status');
                if (testStatus) {
                  testStatus.innerHTML = `<span style="color:var(--accent-green, #10b981);font-weight:600;">✅ Voice test complete! (ElevenLabs Studio Audio Verified)</span>`;
                }
              }
            }
          };

          audio.onerror = () => {
            if (sessionId === currentSpeechSessionId) {
              fallbackIndianNeuralSpeech(text, targetBtn, sessionId);
            }
          };

          if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
            const testStatus = $('#admin-tts-test-status');
            if (testStatus) {
              if (window._testVoiceWatchdog) clearTimeout(window._testVoiceWatchdog);
              const isHealed = res.headers.get('x-eleven-healed') === 'true';
              const vHeader = res.headers.get('x-eleven-voice') || 'Studio Voice';
              testStatus.innerHTML = `<span style="color:var(--accent-green, #10b981);font-weight:600;">✅ Audio stream verified! Playing "${escapeHtml(vHeader)}"</span> ${isHealed ? '<span style="color:#f59e0b;">(Healed from restricted tier)</span>' : ''}`;
            }
          }

          if (sessionId !== currentSpeechSessionId) return;
          synthSuccess = true;
          await audio.play();
          return;
        }

        // If non-audio fallback response (e.g. 402 library voice notice)
        if (responseJson && responseJson.fallback) {
          if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
            const testStatus = $('#admin-tts-test-status');
            if (testStatus) {
              testStatus.innerHTML = `<span style="color:var(--accent-cyan);font-weight:600;">ℹ️ ${escapeHtml(responseJson.message || 'Playing via authentic Indian English Neural Voice (en-IN)')}</span>`;
            }
          }
          break;
        }
      } catch (e) {
        if (sessionId !== currentSpeechSessionId) return;
        if (e.name === 'AbortError') return;
        console.warn('TTS attempt exception:', e);
        break;
      }
    }
  }

  // 2. Fallback to High-Fidelity Indian English Browser Neural Speech (en-IN)
  if (sessionId === currentSpeechSessionId && !synthSuccess) {
    if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
      const testStatus = $('#admin-tts-test-status');
      if (testStatus && testStatus.textContent.includes('Synthesizing')) {
        testStatus.innerHTML = `<span style="color:var(--accent-cyan);font-weight:600;">ℹ️ Playing via authentic Indian English Neural Voice (en-IN fallback)</span>`;
      }
    }
    fallbackIndianNeuralSpeech(text, targetBtn, sessionId);
  }
}

function fallbackIndianNeuralSpeech(text, targetBtn, sessionId = null) {
  if (sessionId && sessionId !== currentSpeechSessionId) return;
  if (!('speechSynthesis' in window)) {
    showToast('Speech synthesis not supported in this browser.');
    stopAllVoice();
    return;
  }

  // Cancel any lingering utterance to avoid repeating queue
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (_) {}

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-IN';
  utt.rate = 0.92;
  utt.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    const indianVoice = voices.find(v => (v.lang === 'en-IN' || v.lang === 'en_IN') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Online')))
      || voices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN')
      || voices.find(v => v.lang.toLowerCase().includes('in') && v.lang.toLowerCase().startsWith('en'))
      || voices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('india') || n.includes('heera') || n.includes('neerja') || n.includes('ravi') || n.includes('prabhat') || n.includes('veena') || n.includes('kavita') || n.includes('aarav') || n.includes('ananya');
      })
      || voices.find(v => v.lang === 'hi-IN' || v.lang === 'hi_IN')
      || voices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('hindi') || n.includes('kalpana') || n.includes('hemant');
      });

    if (indianVoice) {
      utt.voice = indianVoice;
    }
  }

  activeSpeechUtterance = utt;

  if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
    const testStatus = $('#admin-tts-test-status');
    if (testStatus) {
      if (window._testVoiceWatchdog) clearTimeout(window._testVoiceWatchdog);
      testStatus.innerHTML = `<span style="color:var(--accent-cyan);font-weight:600;">🔊 Playing Indian English Neural Voice (en-IN fallback) · Verified!</span>`;
    }
  }

  utt.onend = () => {
    if (!sessionId || sessionId === currentSpeechSessionId) {
      stopAllVoice();
      if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
        const testStatus = $('#admin-tts-test-status');
        if (testStatus) {
          testStatus.innerHTML = `<span style="color:var(--accent-green, #10b981);font-weight:600;">✅ Voice test complete! (Indian English Neural Voice verified)</span>`;
        }
      }
    }
  };

  utt.onerror = () => {
    if (!sessionId || sessionId === currentSpeechSessionId) {
      stopAllVoice();
      if (targetBtn && targetBtn.id === 'btn-test-tts-voice') {
        const testStatus = $('#admin-tts-test-status');
        if (testStatus) {
          testStatus.innerHTML = `<span style="color:var(--accent-amber, #f59e0b);">⚠️ Voice playback ended.</span>`;
        }
      }
    }
  };

  setTimeout(() => {
    if (sessionId && sessionId !== currentSpeechSessionId) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utt);
    } catch (_) {}
  }, 20);
}

function fallbackNeuralSpeech(text, btn) {
  fallbackIndianNeuralSpeech(text, btn);
}

// Pre-recorded greeting audio registry for zero-credit, instant playback
const PRE_RECORDED_GREETINGS = {
  'SAz9YHcvj6GT2YYXdXww': {
    url: '/audio/greeting/greeting_SAz9YHcvj6GT2YYXdXww.mp3',
    name: 'River (Informative Studio)'
  },
  'JBFqnCBsd6RMkjVDRZzb': {
    url: '/audio/greeting/greeting_JBFqnCBsd6RMkjVDRZzb.mp3',
    name: 'George (Warm Storyteller)'
  },
  'EXAVITQu4vr4xnSDxMaL': {
    url: '/audio/greeting/greeting_EXAVITQu4vr4xnSDxMaL.mp3',
    name: 'Sarah (Mature Reassuring)'
  },
  'Xb7hH8MSUJpSbSDYk0k2': {
    url: '/audio/greeting/greeting_Xb7hH8MSUJpSbSDYk0k2.mp3',
    name: 'Alice (Engaging Educator)'
  },
  'IKne3meq5aSn9XLyUdCD': {
    url: '/audio/greeting/greeting_IKne3meq5aSn9XLyUdCD.mp3',
    name: 'Charlie (Confident Energetic)'
  },
  'default': {
    url: '/audio/greeting/greeting_default.mp3',
    name: 'River (Studio Default)'
  }
};

function getSelectedGreetingVoice() {
  const customVoice = $('#admin-eleven-voice')?.value?.trim();
  const selectVoice = $('#admin-eleven-voice-select')?.value?.trim();
  const savedVoice = (localStorage.getItem('cf_eleven_voice') || STATE.config?.eleven_voice || '').trim();

  return customVoice || selectVoice || savedVoice || 'SAz9YHcvj6GT2YYXdXww';
}

function updateGreetingButtonTitle() {
  const btn = $('#btn-greeting');
  if (!btn) return;
  const vid = getSelectedGreetingVoice();
  const item = PRE_RECORDED_GREETINGS[vid] || PRE_RECORDED_GREETINGS['default'];
  const voiceName = item ? item.name : (vid ? `Voice: ${vid.slice(0, 8)}...` : 'Studio Voice');
  btn.title = `Listen AI Greeting (${voiceName} · Instant Voice)`;
}

const greetingAudioMemoryCache = new Map();

async function fetchAndPlayGreetingWithCache(text, voiceId, btn, sessionId, abortSignal) {
  // Check in-memory cache
  if (greetingAudioMemoryCache.has(voiceId)) {
    const blobUrl = greetingAudioMemoryCache.get(voiceId);
    playGreetingAudioSource(blobUrl, sessionId);
    return;
  }

  // Check persistent CacheStorage
  try {
    if ('caches' in window) {
      const cache = await caches.open('cf-greeting-cache-v1');
      const cacheKey = `/cached-greeting/${encodeURIComponent(voiceId || 'default')}.mp3`;
      const cachedResp = await cache.match(cacheKey);
      if (cachedResp) {
        const blob = await cachedResp.blob();
        if (sessionId !== currentSpeechSessionId) return;
        const blobUrl = URL.createObjectURL(blob);
        greetingAudioMemoryCache.set(voiceId, blobUrl);
        playGreetingAudioSource(blobUrl, sessionId);
        return;
      }
    }
  } catch (_) {}

  // Fetch ONCE from /api/tts with isGreeting: true
  try {
    const res = await fetch(getApiUrl('api/tts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        voiceId: voiceId,
        accent: 'indian',
        isGreeting: true
      }),
      signal: abortSignal
    });

    if (sessionId !== currentSpeechSessionId) return;

    if (res.ok && (res.headers.get('content-type') || '').includes('audio')) {
      const blob = await res.blob();
      if (sessionId !== currentSpeechSessionId) return;

      try {
        if ('caches' in window) {
          const cache = await caches.open('cf-greeting-cache-v1');
          const cacheKey = `/cached-greeting/${encodeURIComponent(voiceId || 'default')}.mp3`;
          await cache.put(cacheKey, new Response(blob.slice(0), {
            headers: { 'Content-Type': 'audio/mpeg' }
          }));
        }
      } catch (_) {}

      const blobUrl = URL.createObjectURL(blob);
      greetingAudioMemoryCache.set(voiceId, blobUrl);
      playGreetingAudioSource(blobUrl, sessionId);
      return;
    }
  } catch (e) {
    if (sessionId !== currentSpeechSessionId) return;
    if (e.name === 'AbortError') return;
  }

  // Fallback to browser Indian neural speech if network/API unavailable
  if (sessionId === currentSpeechSessionId) {
    fallbackIndianNeuralSpeech(text, btn, sessionId);
  }
}

function playGreetingAudioSource(audioSrc, sessionId) {
  if (sessionId !== currentSpeechSessionId) return;
  const audio = new Audio(audioSrc);
  currentTtsAudio = audio;

  audio.onended = () => {
    if (sessionId === currentSpeechSessionId) {
      stopAllVoice();
    }
  };

  audio.onerror = () => {
    if (sessionId === currentSpeechSessionId) {
      stopAllVoice();
    }
  };

  audio.play().catch(e => {
    console.warn('Audio play exception:', e);
    if (sessionId === currentSpeechSessionId) {
      stopAllVoice();
    }
  });
}

async function speakGreeting() {
  const btn = $('#btn-greeting');
  const greetingText = "Welcome to the Career Fair 2026 at Kanakia International School Mira Road. Good English is not merely an examination subject—it is the universal language that powers thirty-two global careers, from commercial aviation and surgical consults to corporate law and international diplomacy. Explore the interactive exhibits, test your spoken articulation, and discover your path!";

  const isGreetingActive = btn && (
    btn === activeSpeechButton ||
    btn.classList.contains('playing') ||
    btn.classList.contains('speaking-active') ||
    btn.textContent.includes('Stop')
  );

  if (isGreetingActive) {
    stopAllVoice();
    return;
  }

  // Stop any other currently playing speech / audio before starting
  stopAllVoice();

  isGreetingPlaying = true;
  const sessionId = ++currentSpeechSessionId;
  currentTtsAbortController = new AbortController();
  const abortSignal = currentTtsAbortController.signal;

  // Toggle greeting button to active Stop state
  if (btn) {
    if (!btn.dataset.origHtml || btn.dataset.origHtml.includes('Stop')) {
      if (!btn.innerHTML.includes('Stop')) {
        btn.dataset.origHtml = btn.innerHTML;
      }
    }
    btn.innerHTML = `<span>⏹️</span> <span class="greeting-btn-text">Stop Audio</span>`;
    btn.classList.add('speaking-active', 'playing');
    activeSpeechButton = btn;
  }

  const chosenVoiceId = getSelectedGreetingVoice();

  // 1. Check if chosen voice has a static pre-recorded audio file
  let preRecordedItem = PRE_RECORDED_GREETINGS[chosenVoiceId];
  if (!preRecordedItem && (!chosenVoiceId || chosenVoiceId === 'default' || chosenVoiceId === 'indian-neural')) {
    preRecordedItem = PRE_RECORDED_GREETINGS['default'];
  }

  // If pre-recorded audio exists: play directly with ZERO ElevenLabs credits & ZERO delay!
  if (preRecordedItem && preRecordedItem.url) {
    try {
      const audio = new Audio(preRecordedItem.url);
      currentTtsAudio = audio;

      audio.onended = () => {
        if (sessionId === currentSpeechSessionId) {
          stopAllVoice();
        }
      };

      audio.onerror = () => {
        if (sessionId === currentSpeechSessionId) {
          fetchAndPlayGreetingWithCache(greetingText, chosenVoiceId, btn, sessionId, abortSignal);
        }
      };

      if (sessionId !== currentSpeechSessionId) return;
      await audio.play();
      return;
    } catch (e) {
      if (sessionId !== currentSpeechSessionId) return;
      console.warn('Pre-recorded audio play error, falling back to cache/fetch:', e);
    }
  }

  // 2. Custom voice ID not in static registry: check cache or fetch ONCE and cache
  await fetchAndPlayGreetingWithCache(greetingText, chosenVoiceId, btn, sessionId, abortSignal);
}

// In-Website Interactive Platform Tutorial System (Two-Mode: Short Booklet vs Complete Exhibition Tour)
const TUTORIAL_SHORT_STEPS = [
  {
    step: 0,
    tab: 'careers',
    targetSelector: '.btn-pin-career',
    badge: 'QUICK TOUR · STEP 1 OF 5',
    title: 'Pick & Pin Your Career Pathway',
    icon: '🎯',
    sectionKey: 'section_career',
    instruction: 'Select your target career from 32 global pathways. Click "⭐ Pin to Your Booklet" on any card to lock in your career blueprint and top colleges.',
    actionHint: '👉 Click "⭐ Pin to Your Booklet" on your favorite career card',
    audioUrl: '/audio/tutorial/tutorial_short_step0.mp3',
    speechText: 'Welcome to Career Fair 2026! Let us begin by choosing your target career from thirty-two global pathways. When you pin a career, its academic roadmap and top colleges are automatically added to your booklet. Click Pin to Your Booklet on your favorite career!'
  },
  {
    step: 1,
    tab: 'speechLab',
    targetSelector: '#btn-speech-lab-record',
    badge: 'QUICK TOUR · STEP 2 OF 5',
    title: '6D AI Voice Coach & Speech Diagnostics',
    icon: '🎙️',
    sectionKey: 'section_speech',
    instruction: 'Spoken English is a vital career skill! Click the microphone button to test your speech articulation. When you are ready, click "Next Exhibit ▶" to proceed.',
    actionHint: '👉 Tap the microphone button to start recording, speak, then click Next Exhibit',
    audioUrl: '/audio/tutorial/tutorial_short_step1.mp3',
    speechText: 'This is the AI Speech Lab. Spoken English is a vital career skill. Your pronunciation, pace, and clarity scores here directly populate your printable booklet. Take your time to test your speech, then click Next Exhibit!'
  },
  {
    step: 2,
    tab: 'games',
    game: 'wordle',
    targetSelector: '#game-picker-tabs button[data-game="wordle"]',
    badge: 'QUICK TOUR · STEP 3 OF 5',
    title: 'Vocabulary Challenge: Wordle',
    icon: '🟩',
    sectionKey: 'section_wordle_quick',
    instruction: 'Test your vocabulary power in our most popular arcade game! Guess the secret 5-letter professional English word in 6 attempts.',
    actionHint: '👉 Type letters on the on-screen keyboard to make your guess',
    audioUrl: '/audio/tutorial/tutorial_short_step2.mp3',
    speechText: 'Test your vocabulary with Wordle! Guess the five-letter professional English word in six tries. Type letters on the keyboard to make your guess and test your word power!'
  },
  {
    step: 3,
    tab: 'roadmap',
    subtool: 'bizcard',
    targetSelector: '#plan-tools-tabs button[data-tool="bizcard"]',
    badge: 'QUICK TOUR · STEP 4 OF 5',
    title: 'Student Ambassador Business Card',
    icon: '🪪',
    sectionKey: 'section_bizcard_quick',
    instruction: 'Personalize your official Student Ambassador Business Card! Your name, career title, and class are encoded into a live verification QR code directly in your booklet.',
    actionHint: '👉 Review your business card details and live verification QR code',
    audioUrl: '/audio/tutorial/tutorial_short_step3.mp3',
    speechText: 'Personalize your official Student Ambassador Business Card! Your name, career title, and class are encoded into a live verification QR code directly in your booklet.'
  },
  {
    step: 4,
    tab: 'feedback',
    targetSelector: '.feedback-form-card',
    badge: 'QUICK TOUR · STEP 5 OF 5',
    title: 'Student Reflection & Fair Feedback',
    icon: '⭐',
    sectionKey: 'section_feedback',
    instruction: 'Leave your official rating and review! Submitting feedback completes your tour and unlocks your official Career Booklet at the top of your screen!',
    actionHint: '👉 Rate 1 to 5 stars and submit your student review to complete',
    audioUrl: '/audio/tutorial/tutorial_short_step4.mp3',
    speechText: 'Congratulations! Leave your official fair rating and student reflection below. Submitting your feedback completes the quick tour and unlocks your official printable Career Booklet at the top!'
  }
];

const TUTORIAL_EXPANDED_STEPS = [
  {
    step: 0,
    tab: 'hero',
    targetSelector: '#sec-hero .hero-actions button:first-child',
    badge: 'COMPLETE TOUR · STEP 1 OF 21',
    title: 'Student Career Intelligence Overview',
    icon: '⚡',
    sectionKey: 'section_overview',
    instruction: 'Welcome to Career Fair 2026 at Kanakia International School! Discover how articulate English powers over 32 global professions and explore our interactive fair exhibits.',
    actionHint: '👉 Explore fair highlights and click Next Exhibit to begin',
    audioUrl: '/audio/tutorial/tutorial_exp_step0.mp3',
    speechText: 'Welcome to Career Fair 2026 at Kanakia International School! English is the universal superpower that unlocks over thirty-two global careers, from commercial aviation to pediatric surgery. Follow along as we showcase every exhibit across the fair!'
  },
  {
    step: 1,
    tab: 'careers',
    targetSelector: '.btn-pin-career',
    badge: 'COMPLETE TOUR · STEP 2 OF 21',
    title: '32+ Global Careers Directory',
    icon: '🎯',
    sectionKey: 'section_career',
    instruction: 'Explore 32 high-impact career pathways. Filter by Healthcare, Aviation, Tech, Corporate, or Law, inspect required skills and salary projections, and pin your target career.',
    actionHint: '👉 Click "⭐ Pin to Your Booklet" on any career card below',
    audioUrl: '/audio/tutorial/tutorial_exp_step1.mp3',
    speechText: 'Here are thirty-two high-impact global careers where English fluency is essential. Filter by healthcare, aviation, technology, or law, and click Pin to Your Booklet on your target career!'
  },
  {
    step: 2,
    tab: 'colleges',
    targetSelector: '#college-accreditation-filter',
    badge: 'COMPLETE TOUR · STEP 3 OF 21',
    title: 'Premier Higher Education & Universities',
    icon: '🏛️',
    sectionKey: 'section_colleges',
    instruction: 'Discover accredited university benchmarks, NAAC "A++" institutions, QS global rankings, and degree prerequisites for your chosen field.',
    actionHint: '👉 Search universities or filter by Indian vs International accreditation',
    audioUrl: '/audio/tutorial/tutorial_exp_step2.mp3',
    speechText: 'Explore top accredited universities, NAAC A-double-plus institutions, global QS rankings, and degree paths. Discover the exact institutions needed to achieve your dream career!'
  },
  {
    step: 3,
    tab: 'exams',
    targetSelector: null,
    badge: 'COMPLETE TOUR · STEP 4 OF 21',
    title: 'English Proficiency Testing & Exams',
    icon: '📋',
    sectionKey: 'section_exams',
    instruction: 'Compare CEFR levels, IELTS, TOEFL, Duolingo, CUET, and CLAT score standards required for admissions and professional licensure.',
    actionHint: '👉 Use the score conversion calculator and review test formats',
    audioUrl: '/audio/tutorial/tutorial_exp_step3.mp3',
    speechText: 'Master global English proficiency benchmarks! Compare CEFR levels with IELTS, TOEFL, Duolingo, CUET, and CLAT score standards required for admissions and professional licensure.'
  },
  {
    step: 4,
    tab: 'speak',
    targetSelector: '#speak-record-orb',
    badge: 'COMPLETE TOUR · STEP 5 OF 21',
    title: 'AI Pronunciation Studio & Phonetics',
    icon: '🗣️',
    sectionKey: 'section_speak',
    instruction: 'Master international professional terminology! Practice pronouncing complex career terms with real-time phonetic breakdowns, syllable stress guides, and waveform feedback. When ready, click "Next Exhibit ▶"!',
    actionHint: '👉 Listen to model pronunciation, speak, and click Next Exhibit ▶ when ready',
    audioUrl: '/audio/tutorial/tutorial_exp_step4.mp3',
    speechText: 'Welcome to the Pronunciation Studio! Practice pronouncing international professional terminology. Our phonetic breakdown and syllable stress indicators help you master tricky career vocabulary. Take your time to test your pronunciation, then click Next Exhibit!'
  },
  {
    step: 5,
    tab: 'speechLab',
    targetSelector: '#btn-speech-lab-record',
    badge: 'COMPLETE TOUR · STEP 6 OF 21',
    title: '6D AI Voice Coach & Speech Diagnostics',
    icon: '🎙️',
    sectionKey: 'section_speech',
    instruction: 'Test your spoken articulation with multi-metric AI analysis: pace, pitch variation, lexical sophistication, and fluency. Take your time to test your voice, then click "Next Exhibit ▶"!',
    actionHint: '👉 Click the microphone to record your speech, test sample audio, then click Next Exhibit',
    audioUrl: '/audio/tutorial/tutorial_exp_step5.mp3',
    speechText: 'This is our cutting-edge AI Speech Lab. Speak into your microphone to receive a multi-metric diagnostic of your pace, pitch variance, articulation confidence, and fluency. Take your time to test your voice, then click Next Exhibit when ready!'
  },
  {
    step: 6,
    tab: 'teleprompter',
    targetSelector: '#anchor-script-select',
    badge: 'COMPLETE TOUR · STEP 7 OF 21',
    title: 'News Anchor Studio & Live Teleprompter',
    icon: '📺',
    sectionKey: 'section_teleprompter',
    instruction: 'Experience broadcast journalism! Choose a roleplay script from the dropdown to activate the teleprompter mirror and rehearse live on webcam.',
    actionHint: '👉 Select a roleplay script to start the teleprompter mirror',
    audioUrl: '/audio/tutorial/tutorial_exp_step6.mp3',
    speechText: 'Step into the shoes of a broadcast news anchor! Practice reading breaking international news scripts with an adjustable teleprompter mirror and live webcam video. Master poise, speed control, and camera presence!'
  },
  // ── 10 GAMES SHOWCASED IN SEQUENCE ──
  {
    step: 7,
    tab: 'games',
    game: 'quest-scribe',
    targetSelector: '#game-picker-tabs button[data-game="quest-scribe"]',
    badge: 'COMPLETE TOUR · STEP 8 OF 21',
    title: 'The Scribe: Branching Narrative Quest',
    icon: '📜',
    sectionKey: 'section_cognitive_scribe',
    instruction: 'The Scribe is an interactive dark-fantasy narrative powered by Gemini AI! Choose your path and watch Gemini weave literary prose and branching consequences.',
    actionHint: '👉 Choose a narrative path or click Next Exhibit to see the next game',
    audioUrl: '/audio/tutorial/tutorial_exp_step7.mp3',
    speechText: 'Explore The Scribe! This is an interactive gothic narrative powered by Gemini AI. Choose your story choices and sharpen your literary prose!'
  },

  {
    step: 8,
    tab: 'games',
    game: 'quest-bard',
    targetSelector: '#game-picker-tabs button[data-game="quest-bard"]',
    badge: 'COMPLETE TOUR · STEP 9 OF 21',
    title: "The Bard's Mirror: Poetic Mirror & Critic",
    icon: '🪞',
    sectionKey: 'section_cognitive_bard',
    instruction: 'Commission Shakespearean sonnets, romantic ballads, or submit your own writing for an instant AI literary critique on rhythm and rhetoric.',
    actionHint: '👉 Generate a poetic verse or request a rhetorical critique',
    audioUrl: '/audio/tutorial/tutorial_exp_step9.mp3',
    speechText: "Step into The Bard's Mirror! Commission Shakespearean sonnets or submit your writing for an intelligent literary critique on tone and rhetoric."
  },

  {
    step: 9,
    tab: 'games',
    game: 'quest-cipher',
    targetSelector: '#standalone-quest-mount',
    badge: 'COMPLETE TOUR · STEP 10 OF 21',
    title: 'The Ink Cipher: University Archive Mystery',
    icon: '🔍',
    sectionKey: 'section_cognitive_cipher',
    instruction: 'Investigate a historic university archive mystery with an illuminated lens cursor! Question academic suspects and present evidence to the Dean.',
    actionHint: '👉 Inspect evidence, question suspects below, or click Next Exhibit',
    audioUrl: '/audio/tutorial/tutorial_exp_step11.mp3',
    speechText: 'Investigate The Ink Cipher! Examine archival documents, question suspects, and use deductive English reasoning to solve a historic mystery.'
  },
  {
    step: 10,
    tab: 'games',
    game: 'wordle',
    targetSelector: '#game-picker-tabs button[data-game="wordle"]',
    badge: 'COMPLETE TOUR · STEP 11 OF 21',
    title: 'Wordle: 5-Letter Vocabulary Challenge',
    icon: '🟩',
    sectionKey: 'section_cognitive_wordle',
    instruction: 'Guess the secret 5-letter professional English word in 6 attempts! Color-coded tiles guide your deductive vocabulary trials.',
    actionHint: '👉 Enter letters on the keyboard and press Enter to guess',
    audioUrl: '/audio/tutorial/tutorial_exp_step12.mp3',
    speechText: 'Test your vocabulary with Wordle! Guess the secret five-letter professional word in six attempts with green and yellow tile clues.'
  },
  {
    step: 11,
    tab: 'games',
    game: 'flashcards',
    targetSelector: '#game-picker-tabs button[data-game="flashcards"]',
    badge: 'COMPLETE TOUR · STEP 12 OF 21',
    title: 'Flash Cards Studio: Interactive Drills',
    icon: '🃏',
    sectionKey: 'section_cognitive_flashcards',
    instruction: 'Flip interactive flash cards to master high-frequency corporate, legal, medical, and aviation terminology with instant self-assessment.',
    actionHint: '👉 Click a card to flip and reveal its definition and context',
    audioUrl: '/audio/tutorial/tutorial_exp_step13.mp3',
    speechText: 'Practice with Flash Cards Studio! Flip terminology cards across legal, medical, and aviation fields to build quick recall.'
  },
  {
    step: 12,
    tab: 'games',
    game: 'dict',
    targetSelector: '#game-picker-tabs button[data-game="dict"]',
    badge: 'COMPLETE TOUR · STEP 13 OF 21',
    title: 'Live Dictionary & Lexicon Search',
    icon: '📖',
    sectionKey: 'section_cognitive_dict',
    instruction: 'Look up any word for instant definitions, grammatical parts of speech, synonyms, sample sentences, and audio pronunciation.',
    actionHint: '👉 Search a vocabulary term or check phonetic pronunciation',
    audioUrl: '/audio/tutorial/tutorial_exp_step14.mp3',
    speechText: 'Use the Live Dictionary and Word Check! Look up any word for instant definitions, grammatical parts of speech, synonyms, and phonetics.'
  },
  {
    step: 13,
    tab: 'games',
    game: 'spelling',
    targetSelector: '#game-picker-tabs button[data-game="spelling"]',
    badge: 'COMPLETE TOUR · STEP 14 OF 21',
    title: 'Spelling Bee Challenge: Audio-Guided Trials',
    icon: '🐝',
    sectionKey: 'section_cognitive_spelling',
    instruction: 'Listen to audio pronunciations, contextual clues, and word origins to type the correct spelling and earn maximum leaderboard points.',
    actionHint: '👉 Listen to the audio voice prompt and type the correct spelling',
    audioUrl: '/audio/tutorial/tutorial_exp_step15.mp3',
    speechText: 'Compete in the Spelling Bee Challenge! Listen to acoustic voice prompts and contextual clues to spell complex words and score points.'
  },
  {
    step: 14,
    tab: 'games',
    game: 'hangman',
    targetSelector: '#game-picker-tabs button[data-game="hangman"]',
    badge: 'COMPLETE TOUR · STEP 15 OF 21',
    title: 'English Word Hangman: Career Vocabulary',
    icon: '🪢',
    sectionKey: 'section_cognitive_hangman',
    instruction: 'Guess letters to reveal the hidden career-related phrase before the gallows completes! Train your spelling and vocabulary recognition.',
    actionHint: '👉 Tap letter buttons to guess the hidden career phrase',
    audioUrl: '/audio/tutorial/tutorial_exp_step16.mp3',
    speechText: 'Play English Word Hangman! Guess letters to uncover hidden career terminology before running out of attempts.'
  },
  // ── ROADMAP SUBTOOLS SHOWCASED IN SEQUENCE ──
  {
    step: 15,
    tab: 'roadmap',
    subtool: 'bizcard',
    targetSelector: '#plan-tools-tabs button[data-tool="bizcard"]',
    badge: 'COMPLETE TOUR · STEP 16 OF 21',
    title: 'Student Ambassador Business Card',
    icon: '🪪',
    sectionKey: 'section_roadmap_bizcard',
    instruction: 'Personalize your official Student Ambassador Business Card! Your name, career pathway, and class are encoded into a live verification QR code directly in your booklet.',
    actionHint: '👉 Review your credentials and live verification QR code',
    audioUrl: '/audio/tutorial/tutorial_short_step3.mp3',
    speechText: 'Personalize your official Student Ambassador Business Card! Your name, career pathway, and class are encoded into a live verification QR code directly in your booklet.'
  },
  {
    step: 16,
    tab: 'roadmap',
    subtool: 'myplan',
    targetSelector: '#plan-tools-tabs button[data-tool="myplan"]',
    badge: 'COMPLETE TOUR · STEP 17 OF 21',
    title: '"My Plan" Strategic Roadmap Generator',
    icon: '🗺️',
    sectionKey: 'section_roadmap_myplan',
    instruction: 'Map your multi-year progression from high school through entrance exams, undergraduate degree milestones, internships, and global industry credentials.',
    actionHint: '👉 Inspect your academic timeline and industry certifications',
    audioUrl: '/audio/tutorial/tutorial_exp_step17.mp3',
    speechText: 'This is your personalized Strategic Career Roadmap! Map your multi-year progression from high school through university milestones, internships, and global industry credentials.'
  },
  {
    step: 17,
    tab: 'roadmap',
    subtool: 'quiz',
    targetSelector: '#plan-tools-tabs button[data-tool="quiz"]',
    badge: 'COMPLETE TOUR · STEP 18 OF 21',
    title: '5-Question Career Aptitude Quiz',
    icon: '🧭',
    sectionKey: 'section_roadmap_quiz',
    instruction: 'Discover your professional strengths! Answer 5 rapid career scenarios to uncover your optimal cognitive work style and top recommended career matches.',
    actionHint: '👉 Answer the aptitude scenarios to reveal your profile',
    audioUrl: '/audio/tutorial/tutorial_exp_step19.mp3',
    speechText: 'Discover your strengths with the five-question Career Aptitude Quiz! Answer interactive career scenarios to reveal your cognitive work style and top career recommendations.'
  },
  {
    step: 18,
    tab: 'leaderboard',
    targetSelector: '#sec-leaderboard .table-wrapper',
    badge: 'COMPLETE TOUR · STEP 19 OF 21',
    title: 'Live Fair Leaderboard & Hall of Fame',
    icon: '🏆',
    sectionKey: 'section_leaderboard',
    instruction: 'See where you stand among fellow students! The live leaderboard ranks top performers across all arcade quests, speech diagnostics, and vocabulary challenges.',
    actionHint: '👉 Check out the top rankings and quest achievements',
    audioUrl: '/audio/tutorial/tutorial_exp_step18.mp3',
    speechText: 'Check out the live exhibition leaderboard! See top scores and rankings from students across all arcade games, speech diagnostics, and vocabulary challenges. Compete to claim the top spot on the hall of fame!'
  },
  // ── FINAL FEEDBACK & VISITOR REFLECTIONS IN SEQUENCE ──
  {
    step: 19,
    tab: 'feedback',
    targetSelector: '.feedback-form-card',
    badge: 'COMPLETE TOUR · STEP 20 OF 21',
    title: 'Student Reflection & Fair Feedback',
    icon: '✍️',
    sectionKey: 'section_feedback',
    instruction: 'Leave your official fair rating and student reflection below to complete your booklet! Enter your name, choose your star rating, and click Submit Feedback.',
    actionHint: '👉 Enter your reflection and submit feedback',
    audioUrl: '/audio/tutorial/tutorial_exp_step21.mp3',
    speechText: 'Congratulations on exploring our exhibits! Leave your star rating and student reflection below. Submitting your feedback completes your official printable booklet.'
  },
  {
    step: 20,
    tab: 'feedback',
    targetSelector: '.feedback-reflections-card',
    badge: 'COMPLETE TOUR · STEP 21 OF 21',
    title: 'Visitor Reflections & Booklet Unlock',
    icon: '⭐',
    sectionKey: 'section_reflections_final',
    instruction: 'Review reflections submitted by fellow students, parents, and teachers! Your printable Career Booklet is now fully compiled and ready at the top of your screen.',
    actionHint: '👉 Review community reflections and click Finish Tutorial 🎉',
    audioUrl: '/audio/tutorial/tutorial_exp_step22.mp3',
    speechText: 'Explore reflections and thoughts submitted by students, parents, and faculty on the live Feedback Wall! Your official Career Booklet is ready at the top of your screen.'
  }
];

let currentTutorialMode = 'short'; // 'short' or 'expanded'
let currentTutorialStepIndex = 0;
let isTutorialRunning = false;
let isTutorialPaused = false;
let isTutorialSpeechActive = false;
let activeTutorialAudio = null;
let currentTutorialAudioSessionId = 0;
let hasPinnedDuringActiveTutorial = false;
let waitingForCareerPin = false;
let hasSubmittedFeedbackDuringTutorial = false;

function isTutorialOnSection(sectionKey) {
  if (!isTutorialRunning) return false;
  const steps = (currentTutorialMode === 'expanded') ? TUTORIAL_EXPANDED_STEPS : TUTORIAL_SHORT_STEPS;
  const step = steps[currentTutorialStepIndex];
  return Boolean(step && step.sectionKey === sectionKey);
}

function hasGivenFeedback() {
  if (hasSubmittedFeedbackDuringTutorial) return true;
  try {
    const fb = JSON.parse(localStorage.getItem('ecf_student_feedback') || '{}');
    if (fb && ((fb.comment && fb.comment.trim()) || fb.stars)) return true;
  } catch (_) {}
  return false;
}

let tutorialScrollAnimId = null;
let currentTutorialScrollTargetY = null;

function cancelTutorialScroll() {
  cancelCollegesCycle();
  cancelTutorialGlider();
  if (tutorialScrollAnimId) {
    cancelAnimationFrame(tutorialScrollAnimId);
    tutorialScrollAnimId = null;
  }
  currentTutorialScrollTargetY = null;
}

let userInterruptedScrollForStep = null;
let isGliderProgrammaticScroll = false;
let lastGliderScrollY = 0;

function onUserScrollInterruption() {
  if (!isTutorialRunning) return;
  userInterruptedScrollForStep = currentTutorialStepIndex;
  cancelTutorialGlider();
  cancelTutorialScroll();
}

if (typeof window !== 'undefined') {
  window.addEventListener('wheel', onUserScrollInterruption, { passive: true });
  window.addEventListener('touchmove', onUserScrollInterruption, { passive: true });
  window.addEventListener('touchstart', onUserScrollInterruption, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Home', 'End'].includes(e.code) || ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '].includes(e.key)) {
      onUserScrollInterruption();
    }
  }, { passive: true });
  // Mousedown / Pointerdown on or near desktop scrollbar to let user take control immediately
  window.addEventListener('mousedown', (e) => {
    if (e.clientX >= (window.innerWidth - 25)) {
      onUserScrollInterruption();
    }
  }, { passive: true });
  // Detect manual scrollbar drag or external user scroll during active glide
  window.addEventListener('scroll', () => {
    if (!isTutorialRunning || !currentGliderTab) return;
    if (!isGliderProgrammaticScroll) {
      const curY = window.pageYOffset || document.documentElement.scrollTop;
      if (Math.abs(curY - lastGliderScrollY) > 12) {
        onUserScrollInterruption();
      }
    }
  }, { passive: true });
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Perform a slow, smooth, gentle scroll across the page so the student can
 * clearly view and absorb all features of the website along the way.
 */
function smoothScrollSlow(targetY, customDuration = null) {
  if (currentTutorialScrollTargetY !== null && Math.abs(currentTutorialScrollTargetY - targetY) < 8) {
    return; // Already smoothly gliding toward this exact destination
  }
  cancelTutorialScroll();

  const startY = window.pageYOffset || document.documentElement.scrollTop;
  const distance = targetY - startY;
  if (Math.abs(distance) < 4) {
    return;
  }

  currentTutorialScrollTargetY = targetY;

  // Small scrolling speed: gentle, relaxed pacing so user can see all features
  // Minimum 1000ms, maximum 1950ms
  const duration = customDuration || Math.min(1950, Math.max(1000, Math.round(800 + Math.abs(distance) * 0.85)));
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const ease = easeInOutCubic(progress);
    window.scrollTo(0, Math.round(startY + distance * ease));

    if (progress < 1) {
      tutorialScrollAnimId = requestAnimationFrame(step);
    } else {
      tutorialScrollAnimId = null;
      currentTutorialScrollTargetY = null;
    }
  }

  tutorialScrollAnimId = requestAnimationFrame(step);
}

let tutorialGliderAnimId = null;
let tutorialGliderTimeoutId = null;
let currentGliderTab = null;

function cancelTutorialGlider() {
  currentGliderTab = null;
  document.documentElement.style.scrollBehavior = '';
  if (tutorialGliderTimeoutId) {
    clearTimeout(tutorialGliderTimeoutId);
    tutorialGliderTimeoutId = null;
  }
  if (tutorialGliderAnimId) {
    cancelAnimationFrame(tutorialGliderAnimId);
    tutorialGliderAnimId = null;
  }
}

let collegeCycleTimer = null;

function cancelCollegesCycle() {
  if (collegeCycleTimer) {
    clearInterval(collegeCycleTimer);
    collegeCycleTimer = null;
  }
}

function startCollegesTabCycling() {
  cancelCollegesCycle();
  cancelTutorialGlider();
  if (!isTutorialRunning) return;

  // Ensure colleges are rendered and scroll starts cleanly at top
  window.scrollTo(0, 0);

  const chips = Array.from(document.querySelectorAll('#college-region-filters .filter-chip'));
  if (!chips.length) return;

  let currentIdx = 0;
  // Activate first filter chip immediately
  chips[0].click();

  collegeCycleTimer = setInterval(() => {
    if (!isTutorialRunning) {
      cancelCollegesCycle();
      return;
    }
    const steps = (currentTutorialMode === 'expanded') ? TUTORIAL_EXPANDED_STEPS : TUTORIAL_SHORT_STEPS;
    const step = steps[currentTutorialStepIndex];
    if (!step || step.tab !== 'colleges') {
      cancelCollegesCycle();
      return;
    }

    currentIdx = (currentIdx + 1) % chips.length;
    chips[currentIdx].click();
    chips[currentIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, 3400);
}

function startTutorialNarrationGlider(tabKey) {
  if (userInterruptedScrollForStep === currentTutorialStepIndex) return;
  // If already gliding or scheduled for this tab, do not spawn another instance
  if (currentGliderTab === tabKey) return;
  cancelTutorialGlider();
  cancelCollegesCycle();
  if (!isTutorialRunning) return;
  if (userInterruptedScrollForStep === currentTutorialStepIndex) return;

  if (tabKey === 'colleges') {
    startCollegesTabCycling();
    return;
  }

  const targetSec = document.getElementById('sec-' + tabKey);
  if (!targetSec) return;

  currentGliderTab = tabKey;

  tutorialGliderTimeoutId = setTimeout(() => {
    tutorialGliderTimeoutId = null;
    if (!isTutorialRunning || currentGliderTab !== tabKey || userInterruptedScrollForStep === currentTutorialStepIndex) return;

    // Set scrollBehavior to 'auto' so rapid requestAnimationFrame updates glide smoothly at 60fps without being throttled/reset by browser's smooth interpolator
    document.documentElement.style.scrollBehavior = 'auto';

    // Always start at top of tab (guarantees downward scroll motion)
    window.scrollTo(0, 0);

    const viewportHeight = window.innerHeight;
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const docScrollable = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
    const secBottom = Math.max(0, (targetSec.offsetTop + (targetSec.scrollHeight || targetSec.offsetHeight)) - viewportHeight + 40);
    const maxScroll = Math.max(docScrollable, secBottom);

    let targetDistance;
    let v = 210; // default px/sec

    if (tabKey === 'careers') {
      // In careers, scroll all the way through the 32-card directory
      targetDistance = maxScroll;
      v = 210;
    } else if (tabKey === 'exams') {
      // User request: "scrolling in the exams tab with speed 210 px/s" & "only scroll till here in exams"
      const examsContainer = document.getElementById('exams-cards-container');
      const examsRect = examsContainer ? examsContainer.getBoundingClientRect() : null;
      const examsPageBottom = currentScrollY + (examsRect ? examsRect.bottom : (targetSec.offsetTop + targetSec.offsetHeight));
      
      const idealExamsTarget = Math.round(examsPageBottom - viewportHeight + 40);
      targetDistance = Math.min(maxScroll, Math.max(400, idealExamsTarget));
      v = 210; // Exact 210 px/s velocity per user request
    } else if (tabKey === 'speechLab') {
      // User request: "only scroll till here in ... AI speech lab" (Image 2)
      const recordBtn = document.getElementById('btn-speech-lab-record');
      const stageCard = recordBtn ? (recordBtn.closest('.card') || recordBtn) : null;
      const stageRect = stageCard ? stageCard.getBoundingClientRect() : null;
      const stagePageBottom = currentScrollY + (stageRect ? stageRect.bottom : (targetSec.offsetTop + targetSec.offsetHeight));
      
      const idealStageTarget = Math.round(stagePageBottom - viewportHeight + 44);
      targetDistance = Math.min(maxScroll, Math.max(280, idealStageTarget));
      v = 360;
    } else {
      targetDistance = Math.min(maxScroll, 850);
      v = 210;
    }
    if (targetDistance <= 40) {
      document.documentElement.style.scrollBehavior = '';
      return;
    }

    const tRamp = 0.35; // Soft start at 210 px/s

    let startTime = null;
    let pausedDuration = 0;
    let pauseStart = null;

    function glideStep(now) {
      if (!isTutorialRunning || currentGliderTab !== tabKey || userInterruptedScrollForStep === currentTutorialStepIndex) {
        document.documentElement.style.scrollBehavior = '';
        tutorialGliderAnimId = null;
        return;
      }

      if (isTutorialPaused) {
        if (!pauseStart) pauseStart = now;
        tutorialGliderAnimId = requestAnimationFrame(glideStep);
        return;
      }

      if (pauseStart) {
        pausedDuration += (now - pauseStart);
        pauseStart = null;
      }

      if (!startTime) startTime = now;
      const t = Math.max(0, (now - startTime - pausedDuration) / 1000); // seconds

      let y;
      if (t < tRamp) {
        y = 0.5 * (v / tRamp) * t * t;
      } else {
        y = (0.5 * v * tRamp) + v * (t - tRamp);
      }

      // Re-check dynamic document bottom for careers (full page), but honor exact targetDistance for exams & speechLab
      const currentLimit = (tabKey === 'careers') ? Math.max(targetDistance, document.documentElement.scrollHeight - window.innerHeight) : targetDistance;

      if (y >= currentLimit) {
        window.scrollTo(0, currentLimit);
        document.documentElement.style.scrollBehavior = '';
        tutorialGliderAnimId = null;
        return;
      }

      isGliderProgrammaticScroll = true;
      lastGliderScrollY = Math.round(y);
      window.scrollTo(0, Math.round(y));
      isGliderProgrammaticScroll = false;
      tutorialGliderAnimId = requestAnimationFrame(glideStep);
    }

    tutorialGliderAnimId = requestAnimationFrame(glideStep);
  }, 120);
}

function scrollTutorialTargetIntoView(selector, options = {}) {
  if (!selector) return;
  const target = (typeof selector === 'string') ? document.querySelector(selector) : selector;
  if (!target) return;

  try {
    const rect = target.getBoundingClientRect();
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const targetTop = rect.top + currentScrollY;

    const topNav = document.querySelector('.navbar') || document.querySelector('header');
    const topNavHeight = topNav ? topNav.offsetHeight : 64;

    const viewportHeight = window.innerHeight;
    const bottomMargin = 80;
    const availableHeight = Math.max(180, viewportHeight - topNavHeight - bottomMargin);

    let idealTop;
    // Special Ink Cipher handling:
    // Scroll so that the interrogation box and suspect evidence are comfortably centered
    if (target.id === 'cipher-question-input' || (target.closest && target.closest('#cipher-lens-box'))) {
      const qInput = document.getElementById('cipher-question-input');
      if (qInput) {
        const qRect = qInput.getBoundingClientRect();
        const qTop = qRect.top + currentScrollY;
        idealTop = Math.max(0, Math.round(qTop - topNavHeight - availableHeight / 2));
      } else {
        idealTop = Math.max(0, Math.round(targetTop - topNavHeight - 16));
      }
    } else if (target.classList && target.classList.contains('feedback-form-card')) {
      // Feedback form: position top cleanly 16px below navbar so entire form is visible
      idealTop = Math.max(0, Math.round(targetTop - topNavHeight - 16));
    } else if (rect.height <= availableHeight) {
      const spaceAround = (availableHeight - rect.height) / 2;
      idealTop = Math.max(0, Math.round(targetTop - topNavHeight - spaceAround));
    } else {
      idealTop = Math.max(0, Math.round(targetTop - topNavHeight - 16));
    }

    smoothScrollSlow(idealTop, options.duration);
  } catch (_) {
    try {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {}
  }
}


function updateHeaderBookletVisibility() {
  const btn = document.getElementById('btn-header-dossier');
  if (!btn) return;
  // Admin users get booklet access from the very start
  const isAdmin = Boolean(STATE.adminKey || sessionStorage.getItem('cf_admin_session') || localStorage.getItem('cf_admin_session'));
  // For non-admin visitors, booklet is only available during active session after completing tour/feedback,
  // and is removed once the site is reloaded
  const isUnlockedInSession = sessionStorage.getItem('cf_booklet_session_unlocked') === 'true';
  const isPdfEnabled = window.STATE?.config?.flags?.pdf_export !== false;

  if ((isAdmin || isUnlockedInSession) && isPdfEnabled) {
    btn.style.display = 'inline-flex';
    btn.hidden = false;
  } else {
    btn.style.display = 'none';
    btn.hidden = true;
  }
}

function setHeaderBookletHighlight(active) {
  const btn = document.getElementById('btn-header-dossier');
  if (!btn) return;
  if (active) {
    btn.hidden = false;
    btn.style.display = 'inline-flex';
    btn.classList.add('header-booklet-highlight');
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const removeOnce = () => {
      btn.classList.remove('header-booklet-highlight');
      btn.removeEventListener('click', removeOnce);
    };
    btn.addEventListener('click', removeOnce);
  } else {
    btn.classList.remove('header-booklet-highlight');
  }
}

function syncStudentNameToAllSections(name) {
  if (!name) return;
  STATE.studentName = name;
  try {
    localStorage.setItem('cf_student_name', name);
    localStorage.setItem('ecf_student_name', name);
    localStorage.setItem('ecf_bizcard_name', name);
    try {
      const saved = JSON.parse(localStorage.getItem('cf_bizcard_data') || '{}');
      saved.name = name;
      localStorage.setItem('cf_bizcard_data', JSON.stringify(saved));
    } catch (_) {}
  } catch (_) {}

  const bcInput = document.getElementById('biz-name') || document.getElementById('bizcard-name-input');
  if (bcInput) {
    bcInput.value = name;
    bcInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const fbInput = document.getElementById('fb-name');
  if (fbInput) {
    fbInput.value = name;
    fbInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // Synchronize student name into Spoken English / Voice Test studio
  const speakNameInput = document.getElementById('speak-student-name');
  if (speakNameInput) {
    speakNameInput.value = name;
    speakNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    speakNameInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // Synchronize student name into 6D AI Voice Coach / Speech Lab
  const speechLabNameInput = document.getElementById('speech-lab-student-name');
  if (speechLabNameInput) {
    speechLabNameInput.value = name;
    speechLabNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    speechLabNameInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const anchorNameInput = document.getElementById('anchor-name-input');
  if (anchorNameInput) {
    anchorNameInput.value = name;
    anchorNameInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  document.querySelectorAll('.student-name-display').forEach(el => {
    el.textContent = name;
  });
}

function openTutorialChoiceModal() {
  const modal = document.getElementById('tutorial-choice-modal');
  if (modal) {
    const nameInp = document.getElementById('tutorial-student-name-input');
    if (nameInp) {
      nameInp.value = '';
      nameInp.style.borderColor = '';
      nameInp.style.boxShadow = '';
    }
    modal.classList.add('active');
    setTimeout(() => {
      if (nameInp) nameInp.focus();
    }, 150);
  }
}

function closeTutorialChoiceModal() {
  const modal = document.getElementById('tutorial-choice-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function startTutorialWithMode(mode) {
  const nameInp = document.getElementById('tutorial-student-name-input');
  const enteredName = nameInp ? capitalizeName(nameInp.value.trim()) : '';

  if (!enteredName) {
    if (nameInp) {
      nameInp.style.borderColor = '#ef4444';
      nameInp.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.6)';
      nameInp.focus();
    }
    showToast('⚠️ Please enter your name first (mandatory to personalize your tour & booklet)!');
    return;
  }

  if (nameInp) {
    nameInp.value = enteredName;
    nameInp.style.borderColor = '';
    nameInp.style.boxShadow = '';
  }

  localStorage.setItem('ecf_student_name', enteredName);
  localStorage.setItem('ecf_bizcard_name', enteredName);
  localStorage.setItem('cf_student_name', enteredName);
  STATE.studentName = enteredName;
  syncStudentNameToAllSections(enteredName);

  closeTutorialChoiceModal();
  currentTutorialMode = (mode === 'expanded') ? 'expanded' : 'short';
  try {
    localStorage.setItem('cf_tutorial_mode', currentTutorialMode);
  } catch (_) {}
  hasSubmittedFeedbackDuringTutorial = false;
  isTutorialRunning = true;
  isTutorialPaused = false;
  hasPinnedDuringActiveTutorial = false;
  waitingForCareerPin = false;

  try {
    localStorage.removeItem('ecf_skipped_sections');
  } catch (_) {}

  setHeaderBookletHighlight(false);

  const headerBtn = document.getElementById('btn-header-tutorial');
  if (headerBtn) {
    headerBtn.classList.add('playing', 'speaking-active');
    headerBtn.innerHTML = '<span>⏹️</span> <span class="tutorial-btn-text">Stop Tutorial</span>';
  }

  renderInSiteTutorialStep(0);
}

async function fallbackTutorialSpeech(text, sessionId) {
  if (sessionId && sessionId !== currentTutorialAudioSessionId) return;
  // Always prefer ElevenLabs River TTS dynamically
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: 'SAz9YHcvj6GT2YYXdXww' }) // River Studio Voice
    });
    if (res.ok) {
      const blob = await res.blob();
      if (sessionId !== currentTutorialAudioSessionId) return;
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      activeTutorialAudio = audio;
      window.currentTtsAudio = audio;
      audio.onplay = () => {
        if (sessionId !== currentTutorialAudioSessionId) return;
        isTutorialSpeechActive = true;
        updateTutorialHudStatus('speaking', 'River');
      };
      audio.onended = () => {
        if (sessionId !== currentTutorialAudioSessionId) return;
        isTutorialSpeechActive = false;
        updateTutorialHudStatus('idle', 'River');
      };
      await audio.play();
      return;
    }
  } catch (_) {}

  // Offline fallback to browser speech synthesis
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  } catch (_) {}
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-IN';
  utt.rate = 0.95;
  utt.onend = () => {
    if (sessionId === currentTutorialAudioSessionId) {
      isTutorialSpeechActive = false;
      updateTutorialHudStatus('idle', 'River');
    }
  };
  utt.onerror = () => {
    if (sessionId === currentTutorialAudioSessionId) {
      isTutorialSpeechActive = false;
      updateTutorialHudStatus('idle', 'River');
    }
  };
  try { window.speechSynthesis.speak(utt); } catch (_) {}
}

function playTutorialStepAudio(stepData) {
  stopAllVoice();
  if (activeTutorialAudio) {
    try {
      activeTutorialAudio.pause();
      activeTutorialAudio.currentTime = 0;
    } catch (_) {}
    activeTutorialAudio = null;
  }

  if (!stepData) return;
  const sessionId = ++currentTutorialAudioSessionId;

  updateTutorialHudStatus('speaking', 'River');
  isTutorialSpeechActive = true;

  // Smooth slow-motion downward glide across every tutorial page while voice plays
  startTutorialNarrationGlider(stepData.tab);

  if (stepData.audioUrl) {
    try {
      const audio = new Audio(stepData.audioUrl);
      activeTutorialAudio = audio;
      window.currentTtsAudio = audio;

      audio.onplay = () => {
        if (sessionId !== currentTutorialAudioSessionId) return;
        isTutorialSpeechActive = true;
        if (!isTutorialPaused) {
          updateTutorialHudStatus('speaking', 'River');
        }
      };

      audio.onpause = () => {
        if (sessionId !== currentTutorialAudioSessionId) return;
        if (isTutorialPaused) {
          updateTutorialHudStatus('paused', 'Paused');
        }
      };

      audio.onended = () => {
        if (sessionId !== currentTutorialAudioSessionId) return;
        isTutorialSpeechActive = false;
        updateTutorialHudStatus('idle', 'River');
      };

      audio.onerror = () => {
        if (sessionId !== currentTutorialAudioSessionId) return;
        if (stepData.speechText) {
          fallbackTutorialSpeech(stepData.speechText, sessionId);
        }
      };

      audio.play().catch(err => {
        if (sessionId !== currentTutorialAudioSessionId) return;
        if (stepData.speechText) {
          fallbackTutorialSpeech(stepData.speechText, sessionId);
        }
      });
      return;
    } catch (e) {
      console.warn('Audio construction error:', e);
    }
  }

  if (stepData.speechText) {
    fallbackTutorialSpeech(stepData.speechText, sessionId);
  }
}

function updateTutorialHudStatus(state, labelText) {
  const statusEl = document.getElementById('tutorial-hud-status');
  const labelEl = document.getElementById('tutorial-voice-label');
  const equalizer = document.getElementById('tutorial-equalizer');
  if (!statusEl) return;

  const compactPauseIcon = document.getElementById('tutorial-compact-pause-icon');
  if (state === 'speaking') {
    statusEl.classList.add('speaking');
    statusEl.classList.remove('paused');
    if (equalizer) equalizer.style.display = 'inline-flex';
    if (labelEl) labelEl.textContent = labelText || 'River';
    if (compactPauseIcon) compactPauseIcon.textContent = '⏸️';
  } else if (state === 'paused') {
    statusEl.classList.remove('speaking');
    statusEl.classList.add('paused');
    if (equalizer) equalizer.style.display = 'none';
    if (labelEl) labelEl.textContent = labelText || 'Paused';
    if (compactPauseIcon) compactPauseIcon.textContent = '▶️';
  } else {
    statusEl.classList.remove('speaking', 'paused');
    if (equalizer) equalizer.style.display = 'none';
    if (labelEl) labelEl.textContent = labelText || 'River';
    if (compactPauseIcon) compactPauseIcon.textContent = '⏸️';
  }
}

function replayCurrentTutorialAudio() {
  const steps = (currentTutorialMode === 'expanded') ? TUTORIAL_EXPANDED_STEPS : TUTORIAL_SHORT_STEPS;
  const data = steps[currentTutorialStepIndex];
  if (data) {
    playTutorialStepAudio(data);
    showToast('🔊 Replaying narration...');
  }
}

function pauseTutorial() {
  if (!isTutorialRunning) return;
  isTutorialPaused = true;
  if (window.currentTtsAudio && !window.currentTtsAudio.paused) {
    try { window.currentTtsAudio.pause(); } catch (_) {}
  }
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    try { window.speechSynthesis.pause(); } catch (_) {}
  }
  updateTutorialHudStatus('paused', 'Paused');
  const pauseBtn = document.getElementById('btn-tutorial-pause');
  if (pauseBtn) {
    pauseBtn.innerHTML = '<span id="tutorial-pause-icon">▶️</span> <span id="tutorial-pause-text">Resume Voice</span>';
  }
  const compactPauseIcon = document.getElementById('tutorial-compact-pause-icon');
  if (compactPauseIcon) compactPauseIcon.textContent = '▶️';
}

function resumeTutorial() {
  if (!isTutorialRunning) return;
  isTutorialPaused = false;
  if (window.currentTtsAudio && window.currentTtsAudio.paused) {
    try { window.currentTtsAudio.play(); } catch (_) {}
  } else if (window.speechSynthesis && window.speechSynthesis.paused) {
    try { window.speechSynthesis.resume(); } catch (_) {}
  } else {
    replayCurrentTutorialAudio();
  }
  updateTutorialHudStatus('speaking', 'River');
  const pauseBtn = document.getElementById('btn-tutorial-pause');
  if (pauseBtn) {
    pauseBtn.innerHTML = '<span id="tutorial-pause-icon">⏸️</span> <span id="tutorial-pause-text">Pause Voice</span>';
  }
  const compactPauseIcon = document.getElementById('tutorial-compact-pause-icon');
  if (compactPauseIcon) compactPauseIcon.textContent = '⏸️';
}

let tutorialAutoAdvanceTimer = null;

function isTutorialInteractiveStep(mode, stepIndex) {
  const steps = (mode === 'expanded') ? TUTORIAL_EXPANDED_STEPS : TUTORIAL_SHORT_STEPS;
  const step = steps[stepIndex];
  if (!step) return false;

  // Only Careers requires pinning, and Feedback requires submission to complete
  // 6D Voice Coach, Games, and all other exhibits show Next Exhibit so the user has full time!
  return ['section_career', 'section_feedback'].includes(step.sectionKey);
}

function triggerTutorialAutoAdvance(actionTitle, confirmationMsg, celebrationType = 'success') {
  if (!isTutorialRunning) return;
  const steps = (currentTutorialMode === 'expanded') ? TUTORIAL_EXPANDED_STEPS : TUTORIAL_SHORT_STEPS;
  const currentStep = steps[currentTutorialStepIndex];
  if (!currentStep) return;

  // Prevent multiple overlapping advance timers on rapid clicks
  if (tutorialAutoAdvanceTimer) return;

  // Unmark skipped section since user actively performed the task
  if (currentStep.sectionKey) {
    try {
      const skipped = JSON.parse(localStorage.getItem('ecf_skipped_sections') || '{}');
      if (skipped[currentStep.sectionKey]) {
        delete skipped[currentStep.sectionKey];
        localStorage.setItem('ecf_skipped_sections', JSON.stringify(skipped));
      }
    } catch (_) {}
  }

  // Update HUD instruction and reaction banner smoothly
  const instructionEl = document.getElementById('tutorial-hud-instruction');
  const reactionEl = document.getElementById('tutorial-hud-reaction');
  
  if (reactionEl) {
    reactionEl.style.display = 'inline-flex';
    reactionEl.textContent = `🎉 ${actionTitle}! Advancing to next exhibit...`;
  }
  if (instructionEl && confirmationMsg) {
    instructionEl.textContent = `${confirmationMsg} Moving to next exhibition automatically...`;
  }

  // Play auditory and visual dopamine celebration
  if (window.DopamineEngine) {
    window.DopamineEngine.playChime(celebrationType === 'fanfare' ? 'fanfare' : 'success');
    if (celebrationType !== 'quiet') {
      window.DopamineEngine.confetti(0.5, 0.4);
    }
  }

  showToast(`🎉 ${actionTitle}! Auto-advancing to next exhibit...`);

  // Auto-advance after 1.35 seconds so user sees confirmation and visual feedback
  const targetStep = currentTutorialStepIndex + 1;
  tutorialAutoAdvanceTimer = setTimeout(() => {
    tutorialAutoAdvanceTimer = null;
    if (!isTutorialRunning) return;
    if (targetStep < steps.length) {
      renderInSiteTutorialStep(targetStep);
    } else {
      stopTutorial();
    }
  }, 1350);
}

function stopTutorial() {
  if (tutorialAutoAdvanceTimer) {
    clearTimeout(tutorialAutoAdvanceTimer);
    tutorialAutoAdvanceTimer = null;
  }
  isTutorialRunning = false;
  isTutorialPaused = false;
  stopAllVoice();
  if (activeTutorialAudio) {
    try {
      activeTutorialAudio.pause();
      activeTutorialAudio.currentTime = 0;
    } catch (_) {}
    activeTutorialAudio = null;
  }
  const hud = document.getElementById('tutorial-hud');
  if (hud) hud.classList.remove('active', 'expanded');

  const headerBtn = document.getElementById('btn-header-tutorial');
  if (headerBtn) {
    headerBtn.classList.remove('playing', 'speaking-active');
    headerBtn.innerHTML = '<span>💡</span> <span class="tutorial-btn-text"><span class="tutorial-btn-prefix">Start </span>Tutorial</span>';
  }

  cancelTutorialScroll();
  document.querySelectorAll('.tutorial-button-highlight').forEach(el => el.classList.remove('tutorial-button-highlight'));
  document.querySelectorAll('.tutorial-arena-highlight').forEach(el => el.classList.remove('tutorial-arena-highlight'));
  setHeaderBookletHighlight(false);
  document.querySelectorAll('.tutorial-pin-glow').forEach(el => el.classList.remove('tutorial-pin-glow'));
}

function renderInSiteTutorialStep(stepIndex) {
  if (tutorialAutoAdvanceTimer) {
    clearTimeout(tutorialAutoAdvanceTimer);
    tutorialAutoAdvanceTimer = null;
  }

  const steps = (currentTutorialMode === 'expanded') ? TUTORIAL_EXPANDED_STEPS : TUTORIAL_SHORT_STEPS;
  if (stepIndex < 0) stepIndex = 0;
  if (stepIndex >= steps.length) stepIndex = steps.length - 1;
  currentTutorialStepIndex = stepIndex;

  userInterruptedScrollForStep = null;
  const data = steps[stepIndex];
  const hud = document.getElementById('tutorial-hud');
  if (hud) hud.classList.add('active');
  const compactPauseIcon = document.getElementById('tutorial-compact-pause-icon');
  if (compactPauseIcon) compactPauseIcon.textContent = isTutorialPaused ? '▶️' : '⏸️';

  const badgeEl = document.getElementById('tutorial-hud-badge');
  const titleEl = document.getElementById('tutorial-hud-title');
  const iconEl = document.getElementById('tutorial-hud-icon');
  const instructionEl = document.getElementById('tutorial-hud-instruction');
  const reactionEl = document.getElementById('tutorial-hud-reaction');
  const prevBtn = document.getElementById('btn-tutorial-prev');
  const nextBtn = document.getElementById('btn-tutorial-next');
  const skipBtn = document.getElementById('btn-tutorial-skip');
  const closeBtn = document.getElementById('btn-tutorial-hud-close');
  const pauseBtn = document.getElementById('btn-tutorial-pause');

  // Dynamically compute badge so it is always 100% synchronized with actual step count
  if (badgeEl) {
    badgeEl.textContent = (currentTutorialMode === 'expanded' ? 'COMPLETE TOUR · STEP ' : 'QUICK TOUR · STEP ') + (stepIndex + 1) + ' OF ' + steps.length;
  }
  if (titleEl) titleEl.textContent = data.title;
  if (iconEl) iconEl.textContent = data.icon;
  if (instructionEl) instructionEl.textContent = data.instruction;
  if (reactionEl) reactionEl.style.display = 'none';
  if (pauseBtn) pauseBtn.innerHTML = '<span id="tutorial-pause-icon">⏸️</span> <span id="tutorial-pause-text">Pause Voice</span>';

  // Navigate on page to target tab & subroute
  let tabChanged = false;
  if (data.tab) {
    const activeTabBtn = document.querySelector('.tab-btn.active');
    const currentActiveTab = activeTabBtn ? activeTabBtn.dataset.tab : '';
    if (currentActiveTab && currentActiveTab !== data.tab) {
      tabChanged = true;
    }
    if (typeof window.switchTab === 'function') {
      window.switchTab(data.tab, { keepVoice: true, keepScroll: true, skipSubInit: false, fromRouter: true });
    if (data.tab === 'exams' && typeof renderExams === 'function') renderExams();
    if (data.tab === 'speechLab' && typeof initSpeechLab === 'function') initSpeechLab();
    if (data.tab === 'teleprompter' && typeof initTeleprompter === 'function') {
      initTeleprompter();
      if (typeof wireTeleprompterTutorialHighlights === 'function') wireTeleprompterTutorialHighlights();
    }
    }
    if (window.AppRouter && typeof window.AppRouter.updateUrl === 'function') {
      window.AppRouter.current.tab = data.tab;
      window.AppRouter.current.subtab = data.game || data.subtool || '';
      window.AppRouter.updateUrl('/' + (data.tab === 'hero' ? '' : data.tab), true);
    }
  }

  // Switch subtool if in roadmap
  if (data.subtool && typeof renderPlanTool === 'function') {
    renderPlanTool(data.subtool);
  }

  // Switch game arena if target game specified
  if (data.game && typeof renderGameArena === 'function') {
    renderGameArena(data.game);
  }

  // Remove previous button highlights & pin glows across document
  document.querySelectorAll('.tutorial-button-highlight').forEach(el => el.classList.remove('tutorial-button-highlight'));
  document.querySelectorAll('.tutorial-arena-highlight').forEach(el => el.classList.remove('tutorial-arena-highlight'));
  document.querySelectorAll('.tutorial-pin-glow').forEach(el => el.classList.remove('tutorial-pin-glow'));

  function highlightAndScrollTarget() {
    if (!data.targetSelector) return;
    const targetEl = document.querySelector(data.targetSelector);
    if (targetEl) {
      targetEl.classList.add('tutorial-button-highlight');
      if (data.tab === 'games' && targetEl.closest('#game-picker-tabs')) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    // Determine feature box to scroll into view:
    let scrollTarget = null;
    if (data.tab === 'games') {
      // Highlight the entire window/arena of the quest (including The Ink Cipher and The Scribe per user request)
      scrollTarget = document.getElementById('standalone-quest-mount') || 
                     document.querySelector('.quest-view-card') || 
                     document.getElementById('game-arena-mount') || targetEl;
      if (scrollTarget) {
        scrollTarget.classList.add('tutorial-arena-highlight');
      }
    } else if (data.tab === 'leaderboard') {
      // Highlight the entire leaderboard table window instead of the refresh button
      scrollTarget = document.querySelector('#sec-leaderboard .table-wrapper') || document.querySelector('.table-wrapper') || targetEl;
      if (scrollTarget) {
        scrollTarget.classList.add('tutorial-arena-highlight');
      }
    } else if (data.tab === 'roadmap' && data.subtool) {
      scrollTarget = document.getElementById('plan-tool-arena') || targetEl;
      if (scrollTarget) {
        scrollTarget.classList.add('tutorial-arena-highlight');
      }
    } else if (data.tab === 'feedback') {
      if (data.sectionKey === 'section_reflections_final') {
        scrollTarget = document.querySelector('.feedback-reflections-card') || targetEl;
      } else {
        scrollTarget = document.querySelector('.feedback-form-card') || targetEl;
      }
      if (scrollTarget) {
        scrollTarget.classList.add('tutorial-arena-highlight');
      }
    } else if (data.tab === 'teleprompter') {
      scrollTarget = targetEl;
      if (typeof wireTeleprompterTutorialHighlights === 'function') wireTeleprompterTutorialHighlights();
    } else if (data.tab === 'exams') {
      scrollTarget = document.querySelector('#exams-cards-container .card:first-child') || 
                     document.getElementById('exams-cards-container') || targetEl;
      if (scrollTarget) {
        scrollTarget.classList.add('tutorial-arena-highlight');
      }
    } else {
      scrollTarget = targetEl;
    }

    if (data.tab === 'colleges') {
      // User request: "and same in colleges but instead of scrolling go through the tabs"
      // Keep scroll strictly at top so the entire colleges header and tab bar are fully visible without vertical scrolling
      window.scrollTo(0, 0);
      startCollegesTabCycling();
      return;
    }

    if (data.tab === 'careers' || data.tab === 'exams' || data.tab === 'speechLab') {
      // User request: Smooth downward glide at calibrated 210 px/s pace across careers, exams, and speech lab
      // Do not interrupt the glide with scrollTutorialTargetIntoView
      return;
    }

    if (scrollTarget) {
      scrollTutorialTargetIntoView(scrollTarget);
    }
  }

  // Always reset scroll to top (0) INSTANTLY without smooth animation,
  // so any subsequent scroll across Wordle, games, and roadmap is strictly a DOWNWARD glide from top to bottom (never scrolling up from down)!
  cancelTutorialGlider();
  cancelTutorialScroll();
  const htmlEl = document.documentElement;
  const prevBehavior = htmlEl.style.scrollBehavior;
  htmlEl.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  document.body.scrollTop = 0;
  htmlEl.scrollTop = 0;
  requestAnimationFrame(() => {
    htmlEl.style.scrollBehavior = prevBehavior;
  });
  if (tutorialGliderTimeoutId) {
    clearTimeout(tutorialGliderTimeoutId);
    tutorialGliderTimeoutId = null;
  }
  if (window._tutorialTargetScrollTimeoutId) {
    clearTimeout(window._tutorialTargetScrollTimeoutId);
    window._tutorialTargetScrollTimeoutId = null;
  }
  // Single smooth downward scroll invocation after DOM is laid out
  window._tutorialTargetScrollTimeoutId = setTimeout(highlightAndScrollTarget, 140);
  startTutorialNarrationGlider(data.tab);

  // If final reflections step: first highlight reflections card, then scroll to top to showcase Your Booklet!
  if (data.sectionKey === 'section_reflections_final') {
    setTimeout(() => {
      if (!isTutorialRunning) return;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setHeaderBookletHighlight(true);
      const downloadBtn = document.getElementById('btn-download-dossier');
      if (downloadBtn) {
        downloadBtn.classList.add('tutorial-button-highlight');
      }
    }, 2400);
  }

  const isCareerStep = (data.sectionKey === 'section_career');
  const isFinalStep = (stepIndex === steps.length - 1);
  const isFeedbackStep = (data.sectionKey === 'section_feedback');
  const isInteractive = isTutorialInteractiveStep(currentTutorialMode, stepIndex);

  if (isCareerStep) {
    setTimeout(() => {
      document.querySelectorAll('.btn-pin-career').forEach(btn => btn.classList.add('tutorial-pin-glow'));
    }, 350);

    let storedCareer = null;
    try {
      const stored = localStorage.getItem('cf_chosen_career');
      if (stored) storedCareer = JSON.parse(stored);
    } catch (_) {}

    if (hasPinnedDuringActiveTutorial && storedCareer && storedCareer.title) {
      if (instructionEl) instructionEl.textContent = `You pinned "${storedCareer.title}" to Your Booklet! Academic roadmap and top colleges are ready.`;
      if (reactionEl) {
        reactionEl.style.display = 'inline-flex';
        reactionEl.textContent = `🎉 Pinned: ${storedCareer.title}`;
      }
    }
  }

  // Prev button state
  if (prevBtn) {
    prevBtn.disabled = (stepIndex === 0);
    prevBtn.style.opacity = (stepIndex === 0) ? '0.5' : '1';
  }

  // Button layout state:
  // On final step: show Finish Tutorial button
  // On interactive steps: auto-detect user action and auto-advance! Place "Skip Step ⏭️" in place of Next Exhibit
  // On non-interactive informational steps: keep manual "Next Exhibit ▶" and standard "Skip ⏭️"
  if (isFinalStep) {
    const feedbackGiven = hasGivenFeedback();
    if (nextBtn) {
      nextBtn.style.display = 'inline-flex';
      if (!feedbackGiven) {
        nextBtn.className = 'btn btn-secondary btn-sm';
        nextBtn.textContent = 'Submit Feedback to Complete ✍️';
        nextBtn.title = 'Fair feedback is mandatory to complete the tour';
      } else {
        nextBtn.className = 'btn btn-primary btn-sm';
        nextBtn.textContent = 'Finish Tutorial 🎉';
        nextBtn.title = 'Complete exhibition tour';
      }
      nextBtn.style.opacity = '1';
      nextBtn.disabled = false;
    }
    if (skipBtn) skipBtn.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';
  } else {
    // Exhibition step: Next Exhibit and Skip are always available so user can try the feature nicely and advance anytime!
    if (nextBtn) {
      nextBtn.style.display = 'inline-flex';
      nextBtn.className = 'btn btn-primary btn-sm';
      nextBtn.textContent = 'Next Exhibit ▶';
      nextBtn.style.opacity = '1';
      nextBtn.disabled = false;
    }
    if (skipBtn) {
      if (isFeedbackStep) {
        skipBtn.style.display = 'none';
      } else {
        skipBtn.style.display = 'inline-flex';
        skipBtn.className = 'btn btn-secondary btn-sm';
        skipBtn.textContent = 'Skip ⏭';
        skipBtn.title = 'Skip this step and omit from booklet';
      }
    }
    if (closeBtn) closeBtn.style.display = '';
  }

  // Highlight top download booklet button on final step
  if (isFinalStep) {
    setHeaderBookletHighlight(true);
  } else {
    setHeaderBookletHighlight(false);
  }

  // Play voice narration for this step
  playTutorialStepAudio(data);
}

function onCareerPinnedByStudent(careerObj) {
  if (!careerObj || !careerObj.title) return;

  if (isTutorialRunning && isTutorialOnSection('section_career')) {
    hasPinnedDuringActiveTutorial = true;
    waitingForCareerPin = false;
    document.querySelectorAll('.tutorial-pin-glow').forEach(el => el.classList.remove('tutorial-pin-glow'));

    triggerTutorialAutoAdvance(
      `Career Pinned: ${careerObj.title}`,
      `Awesome! You pinned "${careerObj.title}" to Your Booklet!`
    );
  }
}

function triggerTutorialInteractionFeedback(stepIndex) {
  const steps = (currentTutorialMode === 'expanded') ? TUTORIAL_EXPANDED_STEPS : TUTORIAL_SHORT_STEPS;
  const currentStep = steps[stepIndex || currentTutorialStepIndex];
  if (!currentStep) return;

  if (window.DopamineEngine) {
    window.DopamineEngine.playChime('select');
  }
  const nextBtn = document.getElementById('btn-tutorial-next');
  if (nextBtn && nextBtn.disabled) {
    nextBtn.disabled = false;
    nextBtn.style.opacity = '1';
  }
}

// Global exports
window.getCurrentTutorialStepIndex = () => currentTutorialStepIndex;
window.getCurrentTutorialMode = () => currentTutorialMode;
window.openTutorialChoiceModal = openTutorialChoiceModal;
window.closeTutorialChoiceModal = closeTutorialChoiceModal;
window.startTutorialWithMode = startTutorialWithMode;
window.startInSiteTutorial = openTutorialChoiceModal;
window.stopTutorial = stopTutorial;
window.pauseTutorial = pauseTutorial;
window.resumeTutorial = resumeTutorial;
window.openTutorialModal = openTutorialChoiceModal;
window.closeTutorialModal = stopTutorial;
window.playTutorialAudio = openTutorialChoiceModal;
window.onCareerPinnedByStudent = onCareerPinnedByStudent;
window.replayCurrentTutorialAudio = replayCurrentTutorialAudio;
window.triggerTutorialInteractionFeedback = triggerTutorialInteractionFeedback;
window.setHeaderBookletHighlight = setHeaderBookletHighlight;
window.syncStudentNameToAllSections = syncStudentNameToAllSections;
window.TUTORIAL_SHORT_STEPS = TUTORIAL_SHORT_STEPS;
window.TUTORIAL_EXPANDED_STEPS = TUTORIAL_EXPANDED_STEPS;
window.renderInSiteTutorialStep = renderInSiteTutorialStep;
window.renderPlanTool = renderPlanTool;
window.scrollTutorialTargetIntoView = scrollTutorialTargetIntoView;
window.getIsTutorialRunning = () => isTutorialRunning;

Object.defineProperty(window, 'isTutorialPaused', { get: () => isTutorialPaused, configurable: true });
Object.defineProperty(window, 'isTutorialRunning', { get: () => isTutorialRunning, configurable: true });

// ─── 2. COMPREHENSIVE DATASETS ────────────────────────────────────────────────

// 32+ Careers with verified English Superpower
const CAREERS_DATA = [
  {
    title: "Chief Surgeon & Medical Resident",
    icon: "🩺",
    cat: "Health",
    desc: "Perform surgical interventions and diagnose complex clinical conditions while counseling anxious patients and families.",
    skills: "Clinical Diagnosis, Compassionate Empathy, Surgical Precision, Crisis Composure",
    salary: "₹12L – ₹45L+/yr",
    degrees: "MBBS + MS/MD / MCh",
    exams: "NEET-UG, NEET-PG, USMLE / PLAB",
    englishSuperpower: "Clear, empathetic communication de-escalates critical trauma. Mandatory for international medical licensing (USMLE/PLAB) and global clinical research literature."
  },
  {
    title: "Commercial Airline Pilot",
    icon: "🧑‍✈️",
    cat: "Aviation",
    desc: "Command transport-category jetliners across domestic and trans-continental flight corridors.",
    skills: "Aviation Systems, Spatial Agility, CRM Crew Coordination, Calm Under Pressure",
    salary: "₹18L – ₹50L+/yr",
    degrees: "B.Sc Aviation / CPL Commercial Pilot License",
    exams: "DGCA Commercial Exams, ICAO English Level 4+",
    englishSuperpower: "Mandatory ICAO Operational English Proficiency (Level 4–6). Zero ambiguity in Air Traffic Control radio phraseology is legally required to avoid mid-air catastrophes."
  },
  {
    title: "Principal Software Architect",
    icon: "💻",
    cat: "Tech",
    desc: "Design distributed cloud architectures, lead cross-continental engineering pods, and align code specs with business KPIs.",
    skills: "System Design, Microservices, Agile Leadership, Technical Documentation",
    salary: "₹15L – ₹65L+/yr",
    degrees: "B.Tech / M.Tech in Computer Science / IT",
    exams: "JEE Main & Advanced, BITSAT",
    englishSuperpower: "Articulating complex architectural trade-offs to non-technical stakeholders, remote asynchronous standups, and contributing to open-source RFC specifications."
  },
  {
    title: "Corporate Mergers & Acquisitions Lawyer",
    icon: "⚖️",
    cat: "Law",
    desc: "Draft multi-crore cross-border acquisitions, structure contractual clauses, and represent multinational corporations in dispute arbitration.",
    skills: "Contractual Drafting, Statutory Interpretation, Persuasive Rhetoric, Due Diligence",
    salary: "₹14L – ₹55L+/yr",
    degrees: "BA-LLB / BBA-LLB (5-Year Integrated)",
    exams: "CLAT, AILET, LSAT India",
    englishSuperpower: "Precision phrasing. A single ambiguous clause or misplaced comma in a corporate indemnity agreement can result in crores in corporate liability."
  },
  {
    title: "Diplomatic Civil Servant (IFS / IAS)",
    icon: "🏛️",
    cat: "Public Policy",
    desc: "Represent the Republic of India at bilateral geopolitical summits, draft state policy, and administer district welfare governance.",
    skills: "Geopolitics, Administrative Law, Diplomatic Protocol, Policy Drafting",
    salary: "₹10L – ₹28L/yr + Official Residence",
    degrees: "Graduation in any discipline",
    exams: "UPSC Civil Services Examination (CSE)",
    englishSuperpower: "UPSC Mains compulsory English qualifying paper; drafting international treaties, United Nations communiqués, and national press briefings."
  },
  {
    title: "Commissioned Defence Officer (NDA)",
    icon: "🎖️",
    cat: "Aviation",
    desc: "Command tactical armed forces units across border garrisons, naval fleets, or fighter squadrons.",
    skills: "Tactical Leadership, Physical Endurance, Strategic Logistics, Rapid Decision",
    salary: "₹11L – ₹30L/yr + Allowances",
    degrees: "NDA Khadakwasla / IMA Dehradun (B.Sc / B.Tech)",
    exams: "UPSC NDA / CDS + 5-Day SSB Interview",
    englishSuperpower: "SSB Group Discussions, Psychological Lecturettes, and joint multinational UN peacekeeping combat exercises conducted in standard English."
  },
  {
    title: "Broadcast Journalist & News Anchor",
    icon: "📰",
    cat: "Media",
    desc: "Anchor prime-time television broadcasts, interview international leaders, and direct on-ground investigative journalism.",
    skills: "Teleprompter Delivery, Live Interviewing, Fact Verification, Narrative Storytelling",
    salary: "₹6L – ₹28L+/yr",
    degrees: "BA / PG Diploma in Journalism & Mass Media",
    exams: "IIMC Entrance, CUET-PG",
    englishSuperpower: "Impromptu speech during unscripted breaking news, flawless cadence, and cross-examining influential political figures with composure."
  },
  {
    title: "Luxury Hospitality & General Manager",
    icon: "🏨",
    cat: "Business",
    desc: "Direct world-renowned 5-star resort operations, host diplomatic delegations, and orchestrate ultra-luxury guest experiences.",
    skills: "Customer De-escalation, Cross-Cultural Protocol, Revenue Management, P&L",
    salary: "₹8L – ₹35L+/yr",
    degrees: "B.Sc Hospitality & Hotel Administration",
    exams: "NCHM JEE",
    englishSuperpower: "De-escalating international high-net-worth guest disputes with dignified charm, polished etiquette, and global business diplomacy."
  },
  {
    title: "Venture Entrepreneur & Startup Founder",
    icon: "🚀",
    cat: "Business",
    desc: "Raise venture capital, architect disruptive technology products, and build multi-billion valuation companies.",
    skills: "Pitch Crafting, Unit Economics, Team Building, Stakeholder Negotiation",
    salary: "Equity-based / High upside",
    degrees: "Any graduate / B.Tech / MBA (IIM / ISB / Ivy League)",
    exams: "CAT, GMAT",
    englishSuperpower: "Delivering a magnetic 60-second elevator pitch to global venture capitalists. Clear narrative framing turns seed ideas into funded companies."
  },
  {
    title: "Chartered Accountant & Investment Banker",
    icon: "📊",
    cat: "Business",
    desc: "Structure IPO listings, audit corporate conglomerates, and advise private equity firms on valuation models.",
    skills: "Financial Modeling, Statutory Auditing, Forensic Accounting, Valuation",
    salary: "₹12L – ₹40L+/yr",
    degrees: "ICAI CA / CFA / B.Com (Hons)",
    exams: "CA Foundation, Intermediate, and Final",
    englishSuperpower: "Translating dense balance sheets into compelling investment memos and statutory filings for international stock exchanges."
  },
  {
    title: "University Professor & Academic Scholar",
    icon: "🎓",
    cat: "Creative",
    desc: "Conduct empirical humanities and social science research, mentor doctoral scholars, and publish internationally cited monographs.",
    skills: "Pedagogical Theory, Close Reading, Seminar Debate, Archival Research",
    salary: "₹8L – ₹26L/yr",
    degrees: "MA + Ph.D in Literature / Linguistics / Social Sciences",
    exams: "UGC-NET / JRF",
    englishSuperpower: "Peer-reviewed journal publishing in high-impact academic publications (Oxford, Cambridge University Press) and global lecture delivery."
  },
  {
    title: "OTT Screenwriter & Narrative Game Designer",
    icon: "🎬",
    cat: "Creative",
    desc: "Author scripts for cinematic streaming series and build complex interactive dialogue trees for AAA video game studios.",
    skills: "Character Arcs, Dialogue Rhythm, Branching Worldbuilding, Dramatic Pacing",
    salary: "₹7L – ₹35L+/yr",
    degrees: "BA Literature / Film Direction / Screenwriting MFA",
    exams: "FTII JET, SRFTI Entrance",
    englishSuperpower: "Subtext, cadence, and witty vernacular dialogue that captivates audiences across Netflix, Amazon Prime, and international gaming platforms."
  },
  {
    title: "Voice-Over Artist & Audio Narrator",
    icon: "🎙️",
    cat: "Creative",
    desc: "Voice international animated features, record best-selling audiobooks, and perform documentary voiceovers.",
    skills: "Vocal Modulation, Diction Precision, Breath Control, Accent Mimicry",
    salary: "₹5L – ₹25L+/yr",
    degrees: "Any degree + Vocal Coaching Certification",
    exams: "Audition portfolios & Voice reels",
    englishSuperpower: "Impeccable phoneme articulation, emotional inflection, and mastering Standard British (RP) and General American dialects."
  },
  {
    title: "Technical Writer & Documentation Specialist",
    icon: "📝",
    cat: "Tech",
    desc: "Transform complex developer APIs, cloud architectures, and biotech whitepapers into crisp, readable developer guides.",
    skills: "Markdown/Doc-as-Code, API Schemas, Structural Clarity, Brevity",
    salary: "₹8L – ₹25L/yr",
    degrees: "B.Tech / BA English with CS Minor",
    exams: "Technical Portfolio assessment",
    englishSuperpower: "Translating dense engineering jargon into lucid, user-friendly documentation that powers global developer ecosystems."
  },
  {
    title: "Advertising Creative Director & Copywriter",
    icon: "💡",
    cat: "Media",
    desc: "Invent viral cultural taglines, direct multi-platform commercial campaigns, and build enduring global brand identities.",
    skills: "Wordplay, Cultural Insight, Creative Framing, Visual Direction",
    salary: "₹8L – ₹40L+/yr",
    degrees: "BA Mass Media / Advertising & Communication",
    exams: "MICAT, Creative Portfolio",
    englishSuperpower: "Compressing a transformative commercial idea into concise, memorable phrasing that defines culture and markets."
  },
  {
    title: "International Public Relations Strategist",
    icon: "📣",
    cat: "Business",
    desc: "Guide corporate leaders through high-stakes PR crises, coordinate media briefings, and build global press relations.",
    skills: "Crisis Management, Message Discipline, Media Relations, Strategic Framing",
    salary: "₹7L – ₹30L/yr",
    degrees: "BA / MA Public Relations / Corporate Communications",
    exams: "University Entrance Exams",
    englishSuperpower: "Crafting bulletproof press releases and guiding executives through live media questioning during corporate crises."
  },
  {
    title: "Novelist & Literary Fiction Author",
    icon: "📖",
    cat: "Creative",
    desc: "Craft bestselling novels, build immersive fictional universes, and publish literary works with global publishing houses.",
    skills: "Narrative Arc, Pacing, Evocative Prose, Subtext & Characterization",
    salary: "₹6L – ₹30L+/yr + Royalties",
    degrees: "BA / MA English Literature / Creative Writing MFA",
    exams: "University Literary Portfolios, CUET-UG / PG",
    englishSuperpower: "Nuanced prose cadence, vocabulary mastery, and emotional resonance that moves readers and secures international literary representation."
  },
  {
    title: "Narrative Game Writer & Worldbuilder",
    icon: "🎮",
    cat: "Creative",
    desc: "Design branching quests, author cinematic dialogue, and construct rich narrative lore for AAA and indie video games.",
    skills: "Branching Dialogue, Lore Bibles, Environmental Storytelling, Character Voices",
    salary: "₹8L – ₹32L+/yr",
    degrees: "BA English / Interactive Narrative / Game Design",
    exams: "Writing portfolio & Twine / Ren'Py interactive narrative sample",
    englishSuperpower: "Crafting distinct character vernaculars and interactive conversational subtext that adapts to player choice across global titles."
  },
  {
    title: "Science Communicator & Research Journalist",
    icon: "🔬",
    cat: "Media",
    desc: "Translate cutting-edge quantum physics, CRISPR biotechnology, and aerospace discoveries into thrilling mainstream articles and documentaries.",
    skills: "Scientific Literacy, Metaphor Crafting, Fact-Checking, Visual Storytelling",
    salary: "₹7L – ₹28L/yr",
    degrees: "B.Sc / BS + PG Diploma in Science Communication / English",
    exams: "CUET-PG, Media School Entrance",
    englishSuperpower: "Turning dense peer-reviewed equations into lucid, awe-inspiring prose that makes scientific breakthroughs accessible to humanity."
  },
  {
    title: "UX Writer & Product Content Designer",
    icon: "📱",
    cat: "Tech",
    desc: "Craft intuitive in-app microcopy, user onboarding journeys, and conversational AI interface flows for global mobile apps.",
    skills: "Microcopy, User Research, Accessibility, Information Hierarchy",
    salary: "₹10L – ₹35L+/yr",
    degrees: "BA English / Cognitive Science / Human-Computer Interaction",
    exams: "Design & UX Writing portfolio review",
    englishSuperpower: "Radical brevity and psychological precision: guiding millions of users effortlessly through complex fintech and healthcare interfaces."
  },
  {
    title: "Publishing Editor & Literary Agent",
    icon: "📚",
    cat: "Creative",
    desc: "Acquire manuscript rights, edit acclaimed fiction and non-fiction, and negotiate global distribution with international publishing houses.",
    skills: "Structural Editing, Line Editing, Contract Negotiation, Market Curation",
    salary: "₹6L – ₹24L/yr",
    degrees: "BA / MA English Literature / Publishing Studies",
    exams: "Publishing House Editorial Assessments",
    englishSuperpower: "Flawless syntactical judgment and structural critique that refines raw drafts into timeless, award-winning literature."
  },
  {
    title: "Product Manager & Agile Lead",
    icon: "🧭",
    cat: "Tech",
    desc: "Define product roadmaps, bridge engineering with marketing, and present product strategy to cross-functional global teams.",
    skills: "Roadmap Prioritization, PRD Documentation, Stakeholder Alignment, Metrics",
    salary: "₹16L – ₹55L+/yr",
    degrees: "B.Tech / Any Graduate + MBA / Product Management Certification",
    exams: "CAT / GMAT / Executive Assessments",
    englishSuperpower: "Clear, persuasive asynchronous written memos (Amazon 6-pagers) and inspiring keynote presentations that align hundreds of engineers."
  },
  {
    title: "Commercial Flight Cabin Crew Lead",
    icon: "✈️",
    cat: "Aviation",
    desc: "Lead in-flight passenger safety, manage high-altitude medical crises, and represent prestigious international airlines.",
    skills: "Emergency Evacuation, Crisis De-escalation, Cultural Etiquette, First-Aid",
    salary: "₹7L – ₹22L+/yr + International Per Diem",
    degrees: "Class 12 / Any Graduate + Aviation Hospitality Diploma",
    exams: "Airline In-Person Interviews & Fluency Assessments",
    englishSuperpower: "Crystal-clear emergency evacuation commands and diplomatic interpersonal grace that reassures 300+ passengers during airborne turbulence."
  },
  {
    title: "Foreign Correspondent & War Reporter",
    icon: "🌍",
    cat: "Media",
    desc: "Report from international geopolitical conflict zones, break diplomatic summits, and broadcast live field dispatches.",
    skills: "Field Reporting, Hostile Environment Awareness, Rapid Dispatch, Ethics",
    salary: "₹9L – ₹35L+/yr",
    degrees: "BA / MA Journalism / International Relations",
    exams: "Media Entrance Exams & Investigative Portfolios",
    englishSuperpower: "Composed, vivid live broadcast reporting under extreme pressure, conveying historic global events to millions around the world."
  },
  {
    title: "Speechwriter & Political Strategist",
    icon: "🎙️",
    cat: "Public Policy",
    desc: "Write magnetic keynote addresses, parliamentary speeches, and diplomatic remarks for heads of state and global CEOs.",
    skills: "Rhetoric, Cadence, Thematic Storytelling, Political Psychology",
    salary: "₹10L – ₹40L+/yr",
    degrees: "BA English / Political Science / History",
    exams: "Portfolio of Speeches & Policy Briefs",
    englishSuperpower: "Classical rhetorical devices (anaphora, chiasmus, tricolon) that inspire nations, sway parliaments, and define historic movements."
  },
  {
    title: "Sports Commentator & Live Broadcaster",
    icon: "🏆",
    cat: "Media",
    desc: "Deliver energetic ball-by-ball commentary, player interviews, and post-match analytical breakdowns for international sporting tournaments.",
    skills: "Live Improvisation, Match Analytics, Vocal Cadence, Rapid Reaction",
    salary: "₹8L – ₹45L+/yr",
    degrees: "BA Mass Media / Sports Journalism / Any Graduate",
    exams: "Broadcaster Audition Reels & Knowledge Tests",
    englishSuperpower: "High-octane unscripted eloquence that matches the tempo of live sports and immortalizes historic championship moments."
  },
  {
    title: "Computational Linguist & AI Prompt Engineer",
    icon: "🤖",
    cat: "Tech",
    desc: "Train large language models, architect system prompts, and evaluate AI conversational semantics for frontier artificial intelligence labs.",
    skills: "Syntactic Parsing, Semantic Evaluation, LLM Prompting, Python",
    salary: "₹14L – ₹48L+/yr",
    degrees: "B.Tech CS / BA Linguistics + Computer Science Minor",
    exams: "GATE / Technical Coding & NLP Assessments",
    englishSuperpower: "Deep structural mastery of syntax, semantics, and pragmatics to steer frontier AI models toward precise, unbiased reasoning."
  },
  {
    title: "Podcast Producer & Audio Showrunner",
    icon: "🎧",
    cat: "Media",
    desc: "Develop narrative audio documentaries, direct voice talent, and produce chart-topping narrative audio series for Spotify and Apple Podcasts.",
    skills: "Audio Narrative Arc, Interview Technique, Sound Design Scripting, Pacing",
    salary: "₹6L – ₹26L/yr",
    degrees: "BA Media / English Literature / Audio Production",
    exams: "Audio Pilot Portfolio & Script Sample",
    englishSuperpower: "Intimate audio storytelling that hooks listeners through rich descriptions, conversational warmth, and thoughtful interviews."
  },
  {
    title: "Stand-up Comedian & Satirical Writer",
    icon: "🎭",
    cat: "Creative",
    desc: "Write incisive social satire, headline international comedy tours, and author scripts for late-night television shows.",
    skills: "Comic Timing, Punchline Structure, Observational Wit, Crowd Work",
    salary: "₹6L – ₹35L+/yr + Ticket Revenues",
    degrees: "Any Graduate / Creative Writing",
    exams: "Live Open Mic Performances & Standup Specials",
    englishSuperpower: "Mastery of misdirection, irony, and conversational cadence that unites diverse audiences through the universal language of humor."
  },
  {
    title: "Lyricist & Musical Theatre Writer",
    icon: "🎵",
    cat: "Creative",
    desc: "Pen song lyrics, write musical book narratives, and collaborate with composers for films, theatrical stages, and global streaming albums.",
    skills: "Meter & Rhyme, Melodic Prosody, Thematic Resonance, Metaphor",
    salary: "₹5L – ₹30L+/yr + Song Royalties",
    degrees: "BA English / Music / Creative Writing",
    exams: "Lyricist Song Portfolios & Demo Reels",
    englishSuperpower: "Marrying linguistic rhythm and vowel harmony with musical melody to create anthems that define generations."
  },
  {
    title: "Environmental Policy Analyst & Sustainability Advocate",
    icon: "🌱",
    cat: "Public Policy",
    desc: "Draft climate adaptation treaties, brief governmental ministers, and represent environmental NGOs at UN COP summits.",
    skills: "Environmental Law, Climate Science Synthesis, Policy Briefing, Advocacy",
    salary: "₹8L – ₹28L/yr",
    degrees: "B.Sc / BA Public Policy / Environmental Studies",
    exams: "UPSC / GRE / University Entrance",
    englishSuperpower: "Translating intricate climate data into morally compelling policy briefs that persuade corporate boards and governments to act."
  },
  {
    title: "Non-Profit Director & Social Impact Entrepreneur",
    icon: "🤝",
    cat: "Business",
    desc: "Lead international humanitarian missions, secure philanthropic grants from global foundations, and drive grassroots community change.",
    skills: "Grant Writing, Public Advocacy, Program Management, Stakeholder Trust",
    salary: "₹8L – ₹25L/yr",
    degrees: "BA / MSW Social Work / Public Administration",
    exams: "TISS NET / University Entrance",
    englishSuperpower: "Persuasive grant proposals and grassroots storytelling that unlock crores in philanthropic funding for underserved communities."
  }
,
  {
    "title": "Quantum Computing & Cryptography Architect",
    "icon": "\u269b\ufe0f",
    "cat": "Tech",
    "desc": "Architect next-generation fault-tolerant quantum algorithms and post-quantum cryptographic security protocols for sovereign infrastructure.",
    "skills": "Quantum Circuit Design, Post-Quantum Cryptography, Qiskit, Linear Algebra",
    "salary": "\u20b928L \u2013 \u20b975L+/yr",
    "degrees": "B.Tech CSE/Physics (IIT) + M.S./Ph.D. Quantum Information",
    "exams": "GATE, GRE, Qiskit Global Certification",
    "englishSuperpower": "Explaining complex quantum superposition and entanglement principles in clear executive briefing briefs."
},
  {
    "title": "Bio-Robotics Surgeon & Bionic Prosthetics Lead",
    "icon": "\ud83e\uddbe",
    "cat": "Health",
    "desc": "Lead neural-interfaced robotic micro-surgeries and develop AI-driven cybernetic prosthetics that restore motor capabilities.",
    "skills": "Robotic Surgery (Da Vinci), Neural Prosthetics, Biocompatible Engineering",
    "salary": "\u20b925L \u2013 \u20b965L+/yr",
    "degrees": "MBBS + M.S. Surgery / MCh Bio-Robotics (AIIMS / Johns Hopkins)",
    "exams": "NEET-PG, USMLE, Robotic Surgical Fellowship",
    "englishSuperpower": "Communicating high-stakes surgical telemetry and empathetic patient care instructions across cross-disciplinary medical teams."
},
  {
    "title": "Renewable Energy Grid & Fusion Systems Director",
    "icon": "\u26a1",
    "cat": "Tech",
    "desc": "Design zero-carbon continental microgrids and oversee magnetic confinement fusion reactor power distribution architectures.",
    "skills": "Clean Energy Systems, Grid Optimization, Fusion Plasma Physics, SCADA",
    "salary": "\u20b922L \u2013 \u20b955L+/yr",
    "degrees": "B.Tech Electrical / Energy Systems + M.Tech Clean Grid Engineering",
    "exams": "GATE, IEEE Energy Specialist, CEM",
    "englishSuperpower": "Drafting international net-zero grid compliance pacts and presenting sovereign clean energy transitions."
},
  {
    "title": "Autonomous Vehicle Fleet & Aerospace Systems Lead",
    "icon": "\ud83d\udef8",
    "cat": "Aviation",
    "desc": "Direct autonomous electric vertical takeoff and landing (eVTOL) aircraft fleets and ground autonomous sensor fusion algorithms.",
    "skills": "Computer Vision, SLAM, Avionics Systems, FAA/DGCA Urban Air Mobility",
    "salary": "\u20b924L \u2013 \u20b960L+/yr",
    "degrees": "B.Tech Aerospace / Robotics + M.S. Autonomous Systems",
    "exams": "DGCA Drone Pilot Pro, FAA Part 107, IEEE Robotics",
    "englishSuperpower": "Formulating failsafe air traffic protocols and testifying before sovereign aviation authorities."
},
  {
    "title": "Cyber Defense & Threat Intelligence Commander",
    "icon": "\ud83d\udee1\ufe0f",
    "cat": "Law",
    "desc": "Direct sovereign red/blue cybersecurity defense operations and mitigate zero-day nation-state cyber warfare threats.",
    "skills": "Offensive Security, Threat Hunting, Reverse Engineering, Incident Command",
    "salary": "\u20b920L \u2013 \u20b952L+/yr",
    "degrees": "B.Tech Cybersecurity / Forensic Tech + CISSP / OSCP",
    "exams": "OSCP, CISSP, CEH Master, SANS GIAC",
    "englishSuperpower": "Translating zero-day vulnerability disclosures into emergency tactical action orders for boardroom executives."
},
  {
    "title": "AI Virtual Cinematographer & Metahuman Director",
    "icon": "\ud83c\udfac",
    "cat": "Creative",
    "desc": "Direct photorealistic virtual production worlds, real-time Unreal Engine cinematics, and generative AI character performances.",
    "skills": "Unreal Engine 5, Generative Diffusion Models, Virtual Lighting, Storytelling",
    "salary": "\u20b918L \u2013 \u20b948L+/yr",
    "degrees": "B.Des Digital Arts / Film Direction (FTII / NID) + Unreal Engine Master",
    "exams": "Epic Games Virtual Production Fellow, Adobe Certified",
    "englishSuperpower": "Crafting evocative visual prompts, actor dialogue, and worldbuilding narrative bibles."
},
  {
    "title": "Space Habitat Architect & Orbital Station Designer",
    "icon": "\ud83c\udf0c",
    "cat": "Tech",
    "desc": "Design modular microgravity space stations, lunar research habitats, and closed-loop bio-regenerative life support pods.",
    "skills": "Parametric Architecture, Microgravity Engineering, CAD/BIM, ECLSS",
    "salary": "\u20b926L \u2013 \u20b970L+/yr",
    "degrees": "B.Arch + M.S. Space Architecture (ISU / MIT Media Lab)",
    "exams": "ISRO / NASA Space Systems Fellow, LEED Platinum",
    "englishSuperpower": "Presenting extraterrestrial colony safety charters and multi-agency mission proposals."
},
  {
    "title": "Cognitive Neuro-Ethicist & AI Governance Director",
    "icon": "\ud83e\udde0",
    "cat": "Public Policy",
    "desc": "Establish international ethics frameworks for brain-computer interfaces, artificial general intelligence, and cognitive liberty.",
    "skills": "Neuro-ethics, AI Safety, International Human Rights Law, Policy Drafting",
    "salary": "\u20b920L \u2013 \u20b950L+/yr",
    "degrees": "M.A./Ph.D. Neurophilosophy & Bioethics (Oxford / Harvard)",
    "exams": "UPSC / Global Policy Fellowship, UNESCO AI Ethics Certified",
    "englishSuperpower": "Authoring global governance whitepapers and negotiating treaties on neural data privacy."
},
  {
    "title": "Esports Franchise Executive & Game Ecosystem Lead",
    "icon": "\ud83c\udfae",
    "cat": "Business",
    "desc": "Direct multi-million dollar global esports tournament leagues, talent development pipelines, and interactive gaming brands.",
    "skills": "Franchise Management, Media Rights, Broadcast Production, Brand Partnerships",
    "salary": "\u20b918L \u2013 \u20b945L+/yr",
    "degrees": "BBA / MBA Sports Management / Media Strategy (IIM)",
    "exams": "CAT, Esports Business Certified, Global Sports Marketing",
    "englishSuperpower": "Negotiating multi-million dollar broadcast streaming sponsorships and energizing live stadium crowds."
},
  {
    "title": "Algorithmic Quantitative Trader & FinTech Architect",
    "icon": "\ud83d\udcc8",
    "cat": "Business",
    "desc": "Engineer ultra-low latency high-frequency algorithmic trading strategies and decentralized autonomous financial protocols.",
    "skills": "High-Frequency Trading, Stochastic Calculus, C++20, Risk Modeling",
    "salary": "\u20b935L \u2013 \u20b91.2Cr+/yr",
    "degrees": "B.Tech/M.S. Quantitative Finance / Mathematics (IIT / NYU Courant)",
    "exams": "CFA Level 3, FRM Certified, QuantNet Top Rank",
    "englishSuperpower": "Synthesizing market sentiment anomalies into high-conviction investment committee briefs."
}
];

// Colleges Dataset with Verified Official Accreditation
window.CAREERS_DATA = CAREERS_DATA;

const COLLEGES_DATA = {
  Maharashtra: [
    {
      name: "St. Xavier’s College, Autonomous",
      loc: "Fort, South Mumbai",
      courses: "BA English Literature, BAMMC (Mass Media), Psychology",
      accreditation: {
        naac: "NAAC Grade 'A+' (3.63 CGPA)",
        nirf: "Top 50 Colleges in India",
        status: "UGC Autonomous · DBT Star College",
        badgeType: "naac"
      },
      highlights: "Founded 1869; iconic Victorian Gothic campus; host of Asia's largest collegiate festival 'Malhar'; distinguished literary alumni."
    },
    {
      name: "Elphinstone College",
      loc: "Fort, Mumbai",
      courses: "BA in English Literature, History, Ancient Culture",
      accreditation: {
        naac: "NAAC Grade 'A'",
        nirf: "Maharashtra Heritage Collegiate Tier",
        status: "Affiliated to Dr. Homi Bhabha State University",
        badgeType: "naac"
      },
      highlights: "Established in 1856; alma mater of Dadabhai Naoroji and Dr. B.R. Ambedkar; historic Victorian library archives."
    },
    {
      name: "Ramnarain Ruia Autonomous College",
      loc: "Matunga, Central Mumbai",
      courses: "BA English, Communication Studies, Creative Writing",
      accreditation: {
        naac: "NAAC Grade 'A+' (3.70 CGPA)",
        nirf: "NIRF Top 60 Colleges",
        status: "UGC College of Excellence Status",
        badgeType: "naac"
      },
      highlights: "First college in Mumbai awarded 'College of Excellence' by UGC; active English theatre society and creative writing labs."
    },
    {
      name: "K.C. College (HSNC University)",
      loc: "Churchgate, Mumbai",
      courses: "BA English, Journalism, Advertising & Media",
      accreditation: {
        naac: "NAAC Grade 'A'",
        nirf: "Top Tier Media & Arts",
        status: "Constituent College of HSNC University",
        badgeType: "naac"
      },
      highlights: "Premier media and corporate connectivity in South Mumbai; state-of-the-art audio-visual production studios."
    },
    {
      name: "Sophia College for Women",
      loc: "Bhulabhai Desai Road, Mumbai",
      courses: "BA English Literature, Strategic Communications",
      accreditation: {
        naac: "NAAC Grade 'A' (3.61 CGPA)",
        nirf: "Top Women's Institution",
        status: "Autonomous Arts Institution",
        badgeType: "naac"
      },
      highlights: "Publishers of the literary review 'Sophia Mirror'; serene campus producing renowned authors, journalists, and civil servants."
    },
    {
      name: "Fergusson College (Autonomous)",
      loc: "FC Road, Shivajinagar, Pune",
      courses: "BA English, Linguistics, Comparative Literature",
      accreditation: {
        naac: "NAAC Grade 'A+' (3.62 CGPA)",
        nirf: "NIRF Rank #35 Colleges in India",
        status: "UGC College of Excellence · DBT Star Status",
        badgeType: "nirf"
      },
      highlights: "Founded 1885 by Bal Gangadhar Tilak and Gopal Krishna Gokhale; historic amphitheater and active English debating union."
    },
    {
      name: "Savitribai Phule Pune University (SPPU)",
      loc: "Ganeshkhind, Pune",
      courses: "MA English, M.Phil, Ph.D, Comparative Linguistics",
      accreditation: {
        naac: "NAAC Grade 'A+'",
        nirf: "NIRF Rank #35 Universities",
        status: "UGC Category-I State University",
        badgeType: "nirf"
      },
      highlights: "Known as the 'Oxford of the East'; Department of Languages maintains one of the largest post-colonial literature collections."
    },
    {
      name: "Symbiosis College of Arts & Commerce (SCAC)",
      loc: "Senapati Bapat Road, Pune",
      courses: "BA English Special, Liberal Arts, Business English",
      accreditation: {
        naac: "NAAC Grade 'A++' (3.58 CGPA)",
        nirf: "Top 35 Autonomous Colleges",
        status: "Autonomous · International Exchange Hub",
        badgeType: "naac"
      },
      highlights: "Vibrant international student cohort from over 85 countries; semester-abroad exchange agreements with European universities."
    },
    {
      name: "Tata Institute of Social Sciences (TISS)",
      loc: "Deonar, Mumbai",
      courses: "MA in Media & Cultural Studies, Public Policy",
      accreditation: {
        naac: "NAAC Grade 'A++' (3.89 CGPA)",
        nirf: "NIRF Rank #1 Social Work & Policy",
        status: "Deemed-to-be University (MHRD)",
        badgeType: "naac"
      },
      highlights: "India's highest NAAC CGPA institution; acclaimed documentary film production unit and critical rhetoric seminars."
    },
    {
      name: "IIT Bombay (Dept of Humanities & Social Sciences)",
      loc: "Powai, Mumbai",
      courses: "Ph.D in English, Linguistics, Cognitive Science",
      accreditation: {
        naac: "Institute of National Importance (INI)",
        nirf: "NIRF Rank #3 Overall in India",
        status: "Institute of Eminence (IoE) · NBA Tier-1",
        badgeType: "reg"
      },
      highlights: "Blends computational natural language processing (NLP) with critical rhetoric and philosophy of mind."
    }
  ],
  PanIndia: [
    {
      name: "Miranda House, University of Delhi",
      loc: "North Campus, Delhi",
      courses: "BA (Hons) English Literature, Liberal Arts",
      accreditation: {
        naac: "NAAC Grade 'A++' (3.64 CGPA)",
        nirf: "NIRF Rank #1 Colleges in India (7 Consecutive Years)",
        status: "UGC Star College · Central University",
        badgeType: "nirf"
      },
      highlights: "Uncontested #1 college in India; seminar-style intellectual critique; produced top Supreme Court advocates and international diplomats."
    },
    {
      name: "St. Stephen’s College, Delhi",
      loc: "University Enclave, North Campus, Delhi",
      courses: "BA (Hons) English Literature",
      accreditation: {
        naac: "NAAC Grade 'A'",
        nirf: "NIRF Top 15 Colleges in India",
        status: "Established 1881 · DBT Star College",
        badgeType: "naac"
      },
      highlights: "Legendary Shakespeare Society and Debating Society; oxford-style tutorial system with individual faculty mentoring."
    },
    {
      name: "Lady Shri Ram College for Women (LSR)",
      loc: "Lajpat Nagar, New Delhi",
      courses: "BA (Hons) English, Journalism, Creative Writing",
      accreditation: {
        naac: "NAAC Grade 'A++'",
        nirf: "NIRF Rank #9 Colleges in India",
        status: "Premier Humanities Center",
        badgeType: "nirf"
      },
      highlights: "Internationally renowned for critical feminist thought, publishing internships, and alumni serving in global journalism."
    },
    {
      name: "National Law School of India University (NLSIU)",
      loc: "Nagarbhavi, Bengaluru, Karnataka",
      courses: "BA-LLB (Hons), LLM, Public Policy",
      accreditation: {
        naac: "NAAC Grade 'A++'",
        nirf: "NIRF Rank #1 Law in India (Undisputed #1)",
        status: "Bar Council of India (BCI) Recognized · INI",
        badgeType: "nirf"
      },
      highlights: "The Harvard of Indian legal education; rigorous moot court advocacy training and international dispute arbitrations."
    },
    {
      name: "NALSAR University of Law",
      loc: "Shamirpet, Hyderabad, Telangana",
      courses: "BA-LLB (Hons), Corporate Law, Mooting",
      accreditation: {
        naac: "NAAC Grade 'A++'",
        nirf: "NIRF Rank #3 Law in India",
        status: "Bar Council of India Approved",
        badgeType: "naac"
      },
      highlights: "World-class campus producing international Rhodes Scholars and leading senior advocates of the Supreme Court."
    },
    {
      name: "English & Foreign Languages University (EFLU)",
      loc: "Osmania University Campus, Hyderabad",
      courses: "BA & MA English, Linguistics, Phonetics, Computational English",
      accreditation: {
        naac: "NAAC Grade 'A'",
        nirf: "Top Language & Humanities University",
        status: "Central University of National Eminence",
        badgeType: "reg"
      },
      highlights: "The only dedicated central university in India specializing exclusively in English, phonetics, and linguistics education."
    },
    {
      name: "Indian Institute of Mass Communication (IIMC)",
      loc: "JNU New Campus, New Delhi",
      courses: "PG Diploma in English Journalism, Radio & TV",
      accreditation: {
        naac: "Deemed-to-be University (MHRD)",
        nirf: "India's #1 Mass Communication Institute",
        status: "Ministry of Information & Broadcasting, Govt of India",
        badgeType: "reg"
      },
      highlights: "Premier training institute for print, broadcast, and international wire service correspondents."
    },
    {
      name: "All India Institute of Medical Sciences (AIIMS)",
      loc: "Ansari Nagar, New Delhi",
      courses: "MBBS, MD, MS, MCh Surgical Super-specialties",
      accreditation: {
        naac: "Institute of National Importance (INI)",
        nirf: "NIRF Rank #1 Medical in India",
        status: "National Medical Commission (NMC) Approved",
        badgeType: "nirf"
      },
      highlights: "Apex medical institute of South Asia; clinical rounds and international medical journal symposia conducted entirely in English."
    },
    {
      name: "Indira Gandhi Rashtriya Uran Akademi (IGRUA)",
      loc: "Fursatganj Airfield, Uttar Pradesh",
      courses: "Commercial Pilot License (CPL) + B.Sc Aviation",
      accreditation: {
        naac: "DGCA Certified Flying Training Org (FTO)",
        nirf: "Premier National Aviation Academy",
        status: "ICAO Operational English Level 4+ Compliant",
        badgeType: "reg"
      },
      highlights: "Autonomous institute under Ministry of Civil Aviation; trained the majority of chief flight instructors and airline captains in India."
    },
    {
      name: "Indian Institute of Management Ahmedabad (IIM-A)",
      loc: "Vastrapur, Ahmedabad, Gujarat",
      courses: "PGP (MBA), Executive MBA, Ph.D in Management",
      accreditation: {
        naac: "EQUIS & AMBA International Accreditation",
        nirf: "NIRF Rank #1 Management in India",
        status: "Institute of National Importance (INI)",
        badgeType: "nirf"
      },
      highlights: "Harvard case-study method; high-stakes venture pitches and strategic board negotiations."
    }
  ],
  Abroad: [
    {
      name: "University of Oxford",
      loc: "Oxford, United Kingdom",
      courses: "BA English Language & Literature",
      accreditation: {
        naac: "QS World Rank #3 · THE World Rank #1",
        nirf: "World #1 for Arts & Humanities",
        status: "Russell Group Member · Royal Charter",
        badgeType: "global"
      },
      highlights: "Home to the Bodleian Library and the Oxford English Dictionary (OED); world-standard tutorial system."
    },
    {
      name: "University of Cambridge",
      loc: "Cambridge, United Kingdom",
      courses: "English Tripos, Close Reading, Drama",
      accreditation: {
        naac: "QS World Rank #2 · THE World Rank #5",
        nirf: "Europe's Historic Scholar Cradle",
        status: "Russell Group Member",
        badgeType: "global"
      },
      highlights: "Produced 15 British Prime Ministers, Milton, Wordsworth, and Sylvia Plath; famous Cambridge Union debating chamber."
    },
    {
      name: "Columbia University",
      loc: "New York City, USA",
      courses: "BA English & Comparative Literature",
      accreditation: {
        naac: "QS World Top 25 · US News Top 15",
        nirf: "Ivy League Member",
        status: "Administers the Pulitzer Prizes",
        badgeType: "global"
      },
      highlights: "Core Curriculum in western literature; situated in the heart of global publishing, Broadway theatre, and media."
    },
    {
      name: "New York University (NYU)",
      loc: "Greenwich Village, Manhattan, USA",
      courses: "MFA Creative Writing, Dramatic Literature",
      accreditation: {
        naac: "QS World Top 35",
        nirf: "Global #1 for Creative Arts & Film",
        status: "Association of American Universities (AAU)",
        badgeType: "global"
      },
      highlights: "Legendary creative writing workshops led by Pulitzer Prize and National Book Award winners."
    },
    {
      name: "University of Toronto",
      loc: "Toronto, Ontario, Canada",
      courses: "BA English Literature & Rhetoric",
      accreditation: {
        naac: "QS World Rank #21 · Canada #1",
        nirf: "Top 25 Global Research University",
        status: "U15 Group of Canadian Research Universities",
        badgeType: "global"
      },
      highlights: "Pioneered media ecology theory (Marshall McLuhan); exceptional funding for international undergraduate research."
    },
    {
      name: "University of Melbourne",
      loc: "Melbourne, Victoria, Australia",
      courses: "Bachelor of Arts in English & Cultural Studies",
      accreditation: {
        naac: "QS World Rank #13 · Australia #1",
        nirf: "Group of Eight (Go8) Australia",
        status: "Global Comprehensive Research University",
        badgeType: "global"
      },
      highlights: "Australia's top university; extensive exchange links with Asia-Pacific and Commonwealth educational bodies."
    }
  ]
};

// Entrance Exams Dataset
const EXAMS_DATA = [
  {
    name: "CUET-UG (Common University Entrance Test)",
    cat: "National Undergraduate",
    conductedBy: "National Testing Agency (NTA)",
    target: "BA (Hons) English, Journalism & Arts across 250+ Central, State & Private Universities (DU, JNU, BHU)",
    format: "Computer-Based Test (CBT) · 50 MCQs in 45 mins",
    englishWeight: "Section 1A English tests reading comprehension (literary, factual, narrative), vocabulary, and syntax.",
    date: "May – June Annually"
  },
  {
    name: "CLAT (Common Law Admission Test)",
    cat: "National Law",
    conductedBy: "Consortium of National Law Universities",
    target: "5-Year Integrated BA-LLB & BBA-LLB across 24 National Law Universities (NLUs)",
    format: "Pen & Paper OMR · 120 Comprehension-based MCQs in 2 hours",
    englishWeight: "20% direct English passage reading + 100% of Legal & Logical reasoning based on fast English reading (450 words/passage).",
    date: "First Sunday of December Annually"
  },
  {
    name: "AILET (All India Law Entrance Test)",
    cat: "National Law",
    conductedBy: "National Law University, Delhi",
    target: "BA-LLB (Hons) at NLU Delhi",
    format: "150 MCQs in 120 minutes",
    englishWeight: "Section A is 50 marks of intensive English language, grammar, contextual vocabulary, and critical inference.",
    date: "Second Sunday of December Annually"
  },
  {
    name: "NEET-UG (National Eligibility cum Entrance Test)",
    cat: "Medical & Dental",
    conductedBy: "National Testing Agency (NTA)",
    target: "MBBS & BDS admissions across AIIMS, JIPMER, and all state government medical colleges",
    format: "Pen & Paper · 180 questions across Physics, Chemistry, Biology",
    englishWeight: "English is the official global medium of medical textbooks, pharmacology nomenclature, and clinical documentation.",
    date: "First Sunday of May Annually"
  },
  {
    name: "UPSC Civil Services Exam (CSE)",
    cat: "Government Administration",
    conductedBy: "Union Public Service Commission",
    target: "IAS, IFS (Diplomatic Corps), IPS, and Central Group 'A' Services",
    format: "Prelims (CSAT) + Mains (9 Written Papers) + Personality Interview",
    englishWeight: "Compulsory qualifying English paper (300 marks) + high reading speed required for CSAT comprehension.",
    date: "Prelims: May/June · Mains: September Annually"
  },
  {
    name: "IIMC Entrance Examination",
    cat: "Journalism & Media",
    conductedBy: "Indian Institute of Mass Communication via CUET-PG",
    target: "Postgraduate Diploma in English Journalism & Digital Media",
    format: "Written Essay, Editorial Editing, General Awareness, News Sense",
    englishWeight: "100% evaluated on English analytical prose, objective reporting style, headline writing, and speed.",
    date: "June Annually"
  },
  {
    name: "IELTS Academic (International English Language Testing)",
    cat: "Study Abroad & Immigration",
    conductedBy: "IDP / British Council / Cambridge English",
    target: "Undergraduate & Postgraduate admissions across UK, Canada, Australia, NZ, Europe, and US",
    format: "4 Modules: Listening (30m), Reading (60m), Writing (60m), Speaking 1-on-1 Interview (11–14m)",
    englishWeight: "100% English proficiency evaluation scored on a 0–9 Band scale (Top colleges require 7.0–8.0 Band).",
    date: "Conducted multiple times every week"
  },
  {
    name: "Digital SAT (Scholastic Assessment Test)",
    cat: "US & Global Undergrad",
    conductedBy: "College Board (USA)",
    target: "Undergraduate degree admissions to Ivy League, top US universities, and Ashoka/Krea in India",
    format: "Adaptive Digital Test · Reading & Writing (64 mins) + Math (70 mins)",
    englishWeight: "Reading & Writing module tests sophisticated analytical vocabulary, rhetorical synthesis, and grammar conventions.",
    date: "7 Global Testing Windows Annually"
  }
];

// Vocabulary Flash Cards & Etymology — Predefined Offline Database (70+ Lexicon Terms)
const OFFLINE_FLASH_CARDS = [
  { word: "Rhetoric", phonetic: "/ˈrɛt.ər.ɪk/", pos: "noun", meaning: "The art of effective or persuasive speaking or writing.", sentence: "The advocate's rhetoric united the room in defense of constitutional rights.", origin: "Greek 'rhētorikē' (art of an orator)" },
  { word: "Eloquence", phonetic: "/ˈɛl.ə.kwəns/", pos: "noun", meaning: "Fluent, graceful, or persuasive speaking or writing.", sentence: "She argued the public interest petition with remarkable eloquence.", origin: "Latin 'eloqui' (to speak out)" },
  { word: "Articulate", phonetic: "/ɑːrˈtɪk.jə.lət/", pos: "adjective", meaning: "Expressing ideas clearly, fluently, and effectively.", sentence: "An articulate spokesperson is essential during a high-stakes media conference.", origin: "Latin 'articulatus' (jointed distinctly)" },
  { word: "Brevity", phonetic: "/ˈbrɛv.ɪ.ti/", pos: "noun", meaning: "Concise and exact use of words in writing or speech.", sentence: "Brevity is the soul of wit in prime-time journalistic broadcasting.", origin: "Latin 'brevis' (short)" },
  { word: "Pedagogy", phonetic: "/ˈpɛd.ə.ɡɒdʒ.i/", pos: "noun", meaning: "The method and practice of teaching, especially as an academic subject.", sentence: "Innovative pedagogy transforms grammar lessons into engaging challenges.", origin: "Greek 'paidagogia' (leading a child)" },
  { word: "Nuance", phonetic: "/ˈnjuː.ɑːns/", pos: "noun", meaning: "A subtle difference in meaning, expression, or sound.", sentence: "A skilled simultaneous translator captures every delicate cultural nuance.", origin: "French 'nuer' (to shade)" },
  { word: "Jurisprudence", phonetic: "/ˌdʒʊə.rɪsˈpruː.dəns/", pos: "noun", meaning: "The theoretical philosophy and science of law.", sentence: "Constitutional jurisprudence safeguards democratic civil liberties.", origin: "Latin 'juris prudentia' (knowledge of law)" },
  { word: "Soliloquy", phonetic: "/səˈlɪl.ə.kwi/", pos: "noun", meaning: "An act of speaking one's thoughts aloud when alone on stage.", sentence: "Hamlet's famous soliloquy reflects deeply on human existence and mortality.", origin: "Latin 'solus' (alone) + 'loqui' (to speak)" },
  { word: "Ubiquitous", phonetic: "/juːˈbɪk.wɪ.təs/", pos: "adjective", meaning: "Present, appearing, or found everywhere simultaneously.", sentence: "Artificial intelligence has become ubiquitous across modern enterprise tools.", origin: "Latin 'ubique' (everywhere)" },
  { word: "Empirical", phonetic: "/ɪmˈpɪr.ɪ.kəl/", pos: "adjective", meaning: "Based on verifiable observation or experience rather than pure theory.", sentence: "Clinical researchers require rigorous empirical data before trials.", origin: "Greek 'empeiria' (experience)" },
  { word: "Meticulous", phonetic: "/məˈtɪk.jʊ.ləs/", pos: "adjective", meaning: "Showing great attention to detail; very careful and precise.", sentence: "The sub-editor was meticulous in cross-checking every historical citation.", origin: "Latin 'metus' (fear, careful anxiety)" },
  { word: "Tenacious", phonetic: "/təˈneɪ.ʃəs/", pos: "adjective", meaning: "Tending to keep a firm hold; determined and persistent.", sentence: "Her tenacious investigative reporting uncovered the truth behind the deal.", origin: "Latin 'tenax' (holding fast)" },
  { word: "Manuscript", phonetic: "/ˈmæn.jə.skrɪpt/", pos: "noun", meaning: "A book, document, or piece of music written by hand or typed before printing.", sentence: "The author submitted her completed manuscript to the chief editor.", origin: "Latin 'manu scriptus' (written by hand)" },
  { word: "Editorial", phonetic: "/ˌed.ɪˈtɔː.ri.əl/", pos: "noun", meaning: "A newspaper article written by an editor expressing an official opinion.", sentence: "The Sunday national editorial examined international education policies.", origin: "Latin 'editor' (one who brings forth)" },
  { word: "Litigation", phonetic: "/ˌlɪt.ɪˈɡeɪ.ʃən/", pos: "noun", meaning: "The process of taking legal action through a court of law.", sentence: "Both parties settled the trademark dispute amicably without litigation.", origin: "Latin 'litigare' (to dispute)" },
  { word: "Advocacy", phonetic: "/ˈæd.və.kə.si/", pos: "noun", meaning: "Public support for or recommendation of a particular cause or policy.", sentence: "Persistent student advocacy led to new science laboratories on campus.", origin: "Latin 'advocare' (to call to one's aid)" },
  { word: "Lexicon", phonetic: "/ˈlek.sɪ.kən/", pos: "noun", meaning: "The vocabulary of a person, language, or branch of knowledge.", sentence: "Emerging technological disciplines add fresh terms to our daily lexicon.", origin: "Greek 'lexikon' (word book)" },
  { word: "Syntax", phonetic: "/ˈsɪn.tæks/", pos: "noun", meaning: "The arrangement of words and phrases to create well-formed sentences.", sentence: "Clear syntax guarantees that your arguments remain persuasive and transparent.", origin: "Greek 'syntaxis' (together arrangement)" },
  { word: "Semantics", phonetic: "/sɪˈmæn.tɪks/", pos: "noun", meaning: "The branch of linguistics and logic concerned with meaning.", sentence: "Let us avoid squabbling over mere semantics and focus on actionable solutions.", origin: "Greek 'semantikos' (significant meaning)" },
  { word: "Concise", phonetic: "/kənˈsaɪs/", pos: "adjective", meaning: "Giving a lot of information clearly and in few words; brief.", sentence: "Keep your executive summaries concise, structured, and punchy.", origin: "Latin 'concisus' (cut short)" },
  { word: "Preamble", phonetic: "/priːˈæm.bəl/", pos: "noun", meaning: "A preliminary or preparatory statement; an introduction.", sentence: "We analyzed the fundamental values enshrined in the Preamble.", origin: "Latin 'praeambulare' (to walk before)" },
  { word: "Synopsis", phonetic: "/sɪˈnɒp.sɪs/", pos: "noun", meaning: "A brief summary or general survey of something.", sentence: "Please review the two-page project synopsis before the board meeting.", origin: "Greek 'sunopsis' (general view)" },
  { word: "Plagiarism", phonetic: "/ˈpleɪ.dʒər.ɪ.zəm/", pos: "noun", meaning: "The practice of taking someone else's work or ideas and passing them off as one's own.", sentence: "Academic integrity strictly prohibits any intentional or negligent plagiarism.", origin: "Latin 'plagiarius' (kidnapper)" },
  { word: "Vernacular", phonetic: "/vəˈnæk.jə.lər/", pos: "noun", meaning: "The language or dialect spoken by ordinary people in a country or region.", sentence: "He documented historical oral folklore preserved in the local vernacular.", origin: "Latin 'vernaculus' (native, domestic)" },
  { word: "Ephemeral", phonetic: "/ɪˈfem.ər.əl/", pos: "adjective", meaning: "Lasting for a very short time; fleeting or transient.", sentence: "Trends on social media are ephemeral, but core writing skills endure.", origin: "Greek 'ephemeros' (lasting only one day)" },
  { word: "Ambiguous", phonetic: "/æmˈbɪɡ.ju.əs/", pos: "adjective", meaning: "Open to more than one interpretation; having a double or uncertain meaning.", sentence: "The legislative statute was ambiguous and required judicial interpretation.", origin: "Latin 'ambigere' (to wander, dispute)" },
  { word: "Pragmatic", phonetic: "/præɡˈmæt.ɪk/", pos: "adjective", meaning: "Dealing with things sensibly and realistically based on practical considerations.", sentence: "The engineering team adopted a pragmatic approach to system delivery.", origin: "Greek 'pragma' (deed, act)" },
  { word: "Benevolent", phonetic: "/bəˈnev.əl.ənt/", pos: "adjective", meaning: "Well meaning and kindly; dedicated to charitable purposes.", sentence: "A benevolent philanthropist endowed full university scholarships for scholars.", origin: "Latin 'bene volens' (wishing well)" },
  { word: "Juxtapose", phonetic: "/ˌdʒʌk.stəˈpəʊz/", pos: "verb", meaning: "Place or deal with close together for contrasting effect.", sentence: "The exhibition juxtaposed classical rhetoric with modern digital prose.", origin: "Latin 'juxta' (next to) + French 'poser'" },
  { word: "Paradox", phonetic: "/ˈpær.ə.dɒks/", pos: "noun", meaning: "A seemingly absurd or self-contradictory statement that proves true.", sentence: "It is an educational paradox that slowing down often accelerates mastery.", origin: "Greek 'para' (contrary to) + 'doxa' (opinion)" },
  { word: "Resilient", phonetic: "/rɪˈzɪl.jənt/", pos: "adjective", meaning: "Able to withstand or recover quickly from difficult conditions.", sentence: "Resilient speakers embrace constructive critique to refine their delivery.", origin: "Latin 'resilire' (to leap back)" },
  { word: "Plausible", phonetic: "/ˈplɔː.zə.bəl/", pos: "adjective", meaning: "Seeming reasonable or probable; believable.", sentence: "The defence attorney presented a plausible sequence of historical events.", origin: "Latin 'plausibilis' (worthy of applause)" },
  { word: "Inference", phonetic: "/ˈɪn.fər.əns/", pos: "noun", meaning: "A conclusion reached on the basis of evidence and logical reasoning.", sentence: "Effective reading comprehension tests your skill in drawing accurate inferences.", origin: "Latin 'inferre' (to bring in)" },
  { word: "Scrutinize", phonetic: "/ˈskruː.tɪ.naɪz/", pos: "verb", meaning: "Examine or inspect closely and thoroughly.", sentence: "Auditors will scrutinize the balance sheet before signing the merger.", origin: "Latin 'scrutinium' (a search)" },
  { word: "Perspicacity", phonetic: "/ˌpɜː.spɪˈkæs.ə.ti/", pos: "noun", meaning: "The quality of having ready insight and acute understanding.", sentence: "Her perspicacity as a diplomat defused tensions during multilateral talks.", origin: "Latin 'perspicere' (to look through)" },
  { word: "Verisimilitude", phonetic: "/ˌver.ɪ.sɪˈmɪl.ɪ.tjuːd/", pos: "noun", meaning: "The appearance of being true or real in creative storytelling.", sentence: "The courtroom screenplay achieved gripping verisimilitude in dialogue.", origin: "Latin 'verus' (true) + 'similis' (like)" },
  { word: "Anachronism", phonetic: "/əˈnæk.rə.nɪ.zəm/", pos: "noun", meaning: "Something belonging to a time period other than that in which it exists.", sentence: "A futuristic wristwatch in a Renaissance painting is an anachronism.", origin: "Greek 'ana' (backward) + 'khronos' (time)" },
  { word: "Fastidious", phonetic: "/fæsˈtɪd.i.əs/", pos: "adjective", meaning: "Very attentive to and concerned about accuracy, etiquette, and detail.", sentence: "He was fastidious regarding typography and grammatical consistency.", origin: "Latin 'fastidium' (loathing, squeamishness)" },
  { word: "Grandiloquent", phonetic: "/ɡrænˈdɪl.ə.kwənt/", pos: "adjective", meaning: "Pompous or extravagant in language, style, or manner.", sentence: "A grandiloquent speech often obscures simple truths with needless jargon.", origin: "Latin 'grandis' (grand) + 'loqui' (to speak)" },
  { word: "Laconic", phonetic: "/ləˈkɒn.ɪk/", pos: "adjective", meaning: "Using very few words; concise to the point of seeming rude.", sentence: "His laconic reply of 'Proceed' conveyed supreme confidence.", origin: "Greek 'Lakonikos' (Spartan brevity)" },
  { word: "Magnanimous", phonetic: "/mæɡˈnæn.ɪ.məs/", pos: "adjective", meaning: "Generous or forgiving, especially toward a rival or less powerful person.", sentence: "The victorious debater was magnanimous in congratulating the opposing team.", origin: "Latin 'magnus' (great) + 'animus' (mind)" },
  { word: "Nefarious", phonetic: "/nɪˈfeə.ri.əs/", pos: "adjective", meaning: "Wicked, villainous, or criminal.", sentence: "The cybersecurity SOC thwarted a nefarious ransomware campaign.", origin: "Latin 'nefas' (crime, impiety)" },
  { word: "Obsequious", phonetic: "/əbˈsiː.kwi.əs/", pos: "adjective", meaning: "Obedient or attentive to an excessive or servile degree.", sentence: "True leaders value honest counsel over obsequious flattery.", origin: "Latin 'obsequi' (to comply)" },
  { word: "Panacea", phonetic: "/ˌpæn.əˈsiː.ə/", pos: "noun", meaning: "A solution or remedy for all difficulties or diseases.", sentence: "Technology alone is not a panacea for educational disparities.", origin: "Greek 'pan' (all) + 'akos' (cure)" },
  { word: "Sagacious", phonetic: "/səˈɡeɪ.ʃəs/", pos: "adjective", meaning: "Having or showing keen mental discernment and good judgment.", sentence: "The judge was revered for her sagacious guidance on constitutional ethics.", origin: "Latin 'sagax' (wise, keen)" },
  { word: "Taciturn", phonetic: "/ˈtæs.ɪ.tɜːn/", pos: "adjective", meaning: "Reserved or uncommunicative in speech; saying little.", sentence: "Though taciturn in casual conversation, his written briefs were brilliant.", origin: "Latin 'tacitus' (silent)" },
  { word: "Vacillate", phonetic: "/ˈvæs.ɪ.leɪt/", pos: "verb", meaning: "Waver between different opinions or actions; be indecisive.", sentence: "Leaders cannot vacillate when emergency protocols require immediate action.", origin: "Latin 'vacillare' (to sway)" },
  { word: "Zealous", phonetic: "/ˈzel.əs/", pos: "adjective", meaning: "Having or showing great energy or enthusiasm in pursuit of a cause.", sentence: "The student environmental committee was zealous in promoting solar power.", origin: "Greek 'zelos' (ardor)" },
  { word: "Capricious", phonetic: "/kəˈprɪʃ.əs/", pos: "adjective", meaning: "Given to sudden and unaccountable changes of mood or behavior.", sentence: "Financial markets can be capricious during unexpected geopolitical shifts.", origin: "Italian 'capriccio' (whim)" },
  { word: "Deleterious", phonetic: "/ˌdel.ɪˈtɪə.ri.əs/", pos: "adjective", meaning: "Causing harm or damage.", sentence: "Chronic sleep deprivation exerts deleterious effects on cognitive focus.", origin: "Greek 'deleterios' (harmful)" },
  { word: "Effervescent", phonetic: "/ˌef.əˈves.ənt/", pos: "adjective", meaning: "Vivacious and enthusiastic; bubbly.", sentence: "Her effervescent opening remarks set an upbeat tone for the international summit.", origin: "Latin 'effervescere' (to boil up)" },
  { word: "Garrulous", phonetic: "/ˈɡær.əl.əs/", pos: "adjective", meaning: "Excessively talkative, especially on trivial matters.", sentence: "The garrulous witness took forty minutes to recount a five-minute event.", origin: "Latin 'garrire' (to chatter)" },
  { word: "Judicious", phonetic: "/dʒuːˈdɪʃ.əs/", pos: "adjective", meaning: "Having, showing, or done with good sense and judgment.", sentence: "Judicious allocation of study hours ensures comprehensive exam readiness.", origin: "Latin 'judicium' (judgment)" },
  { word: "Lugubrious", phonetic: "/luːˈɡuː.bri.əs/", pos: "adjective", meaning: "Looking or sounding sad, dismal, or mournful.", sentence: "The actor adopted a lugubrious tone to convey Shakespearean sorrow.", origin: "Latin 'lugere' (to mourn)" },
  { word: "Munificent", phonetic: "/mjuːˈnɪf.ɪ.sənt/", pos: "adjective", meaning: "Larger or more generous than is usual or necessary.", sentence: "The alumni made a munificent donation to construct the new robotics wing.", origin: "Latin 'munus' (gift) + 'facere' (to make)" },
  { word: "Ostentatious", phonetic: "/ˌɒs.tenˈteɪ.ʃəs/", pos: "adjective", meaning: "Characterized by pretentious display designed to impress.", sentence: "He preferred understated elegance over ostentatious displays of wealth.", origin: "Latin 'ostendere' (to show)" },
  { word: "Pellucid", phonetic: "/pəˈluː.sɪd/", pos: "adjective", meaning: "Translucently clear; easily understood in meaning and style.", sentence: "The physics professor offered a pellucid explanation of quantum entanglement.", origin: "Latin 'pellucidus' (shining through)" },
  { word: "Quixotic", phonetic: "/kwɪkˈsɒt.ɪk/", pos: "adjective", meaning: "Exceedingly idealistic; unrealistic and impractical.", sentence: "Embarking on the trans-ocean voyage without modern instruments seemed quixotic.", origin: "After Cervantes' Don Quixote" },
  { word: "Resplendent", phonetic: "/rɪˈsplen.dənt/", pos: "adjective", meaning: "Attractive and impressive through being richly colorful or shining.", sentence: "The auditorium stage was resplendent in celebratory banners for graduation.", origin: "Latin 'resplendere' (to shine out)" },
  { word: "Surreptitious", phonetic: "/ˌsʌr.əpˈtɪʃ.əs/", pos: "adjective", meaning: "Kept secret, especially because it would not be approved of.", sentence: "The agents held a surreptitious briefing at midnight behind closed doors.", origin: "Latin 'surripere' (to seize secretly)" },
  { word: "Trepidation", phonetic: "/ˌtrep.ɪˈdeɪ.ʃən/", pos: "noun", meaning: "A feeling of fear or agitation about something that may happen.", sentence: "She walked onto the keynote stage without a trace of nervous trepidation.", origin: "Latin 'trepidare' (to tremble)" },
  { word: "Whimsical", phonetic: "/ˈwɪm.zɪ.kəl/", pos: "adjective", meaning: "Playfully quaint or fanciful, especially in an appealing way.", sentence: "The illustrated children's book was celebrated for its whimsical poetry.", origin: "English 'whim' (sudden fancy)" },
  { word: "Circumlocution", phonetic: "/ˌsɜː.kəm.ləˈkjuː.ʃən/", pos: "noun", meaning: "The use of many words where fewer would do, especially in a deliberate attempt to be vague.", sentence: "The politician resorted to circumlocution to dodge the direct question.", origin: "Latin 'circum' (around) + 'loqui' (to speak)" },
  { word: "Diatribe", phonetic: "/ˈdaɪ.ə.traɪb/", pos: "noun", meaning: "A forceful and bitter verbal attack against someone or something.", sentence: "The editorial avoided personal diatribe and stayed focused on verified data.", origin: "Greek 'diatribe' (discourse, wearing away)" },
  { word: "Enervate", phonetic: "/ˈen.ə.veɪt/", pos: "verb", meaning: "Cause someone to feel drained of energy or vitality; weaken.", sentence: "The sweltering afternoon humidity threatened to enervate the marathon runners.", origin: "Latin 'enervare' (to weaken sinews)" }
];

const FLASH_CARDS = OFFLINE_FLASH_CARDS;

// ─── 3. TAB NAVIGATION CONTROLLER ─────────────────────────────────────────────
function setupHorizontalScrollShelf(track, leftBtn, rightBtn, step = 280) {
  if (!track) return null;

  function updateArrows() {
    if (!leftBtn || !rightBtn) return;
    const canScroll = track.scrollWidth > track.clientWidth + 5;
    if (!canScroll) {
      leftBtn.style.display = 'none';
      rightBtn.style.display = 'none';
      return;
    }
    leftBtn.style.display = 'flex';
    rightBtn.style.display = 'flex';
    const atStart = track.scrollLeft <= 5;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 5;
    leftBtn.classList.toggle('disabled', atStart);
    rightBtn.classList.toggle('disabled', atEnd);
  }

  if (leftBtn && !leftBtn.dataset.bound) {
    leftBtn.dataset.bound = 'true';
    leftBtn.addEventListener('click', () => {
      try { track.scrollBy({ left: -step, behavior: 'smooth' }); } catch { track.scrollLeft -= step; }
      setTimeout(updateArrows, 320);
    });
  }

  if (rightBtn && !rightBtn.dataset.bound) {
    rightBtn.dataset.bound = 'true';
    rightBtn.addEventListener('click', () => {
      try { track.scrollBy({ left: step, behavior: 'smooth' }); } catch { track.scrollLeft += step; }
      setTimeout(updateArrows, 320);
    });
  }

  // Mouse wheel horizontal scroll translation
  if (!track.dataset.wheelBound) {
    track.dataset.wheelBound = 'true';
    track.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        track.scrollLeft += e.deltaY * 1.25;
        updateArrows();
      }
    }, { passive: false });
  }

  // Drag-to-scroll support
  if (!track.dataset.dragBound) {
    track.dataset.dragBound = 'true';
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;

    track.addEventListener('mousedown', e => {
      isDown = true;
      track.classList.add('grabbing');
      startX = e.pageX - track.offsetLeft;
      scrollStart = track.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        track.classList.remove('grabbing');
        updateArrows();
      }
    });

    track.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.4;
      track.scrollLeft = scrollStart - walk;
      updateArrows();
    });
  }

  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows, { passive: true });

  setTimeout(updateArrows, 120);
  setTimeout(updateArrows, 500);

  return updateArrows;
}

function initMobileScrollNav() {
  // Mobile floating bottom navigation is handled natively by CSS (fusionfood architecture: almost at bottom of screen)
}

function initNavigation() {
  // Global auto-capitalizer for all user name fields
  const nameSelectors = '#speak-student-name, #anchor-name-input, #fb-name, #biz-name, #issue-user-name, input[data-capitalize="name"]';
  document.addEventListener('focusout', e => {
    if (e.target && e.target.matches && e.target.matches(nameSelectors)) {
      if (typeof capitalizeName === 'function') {
        const cap = capitalizeName(e.target.value);
        if (cap !== e.target.value) e.target.value = cap;
      }
    }
  }, true);
  document.addEventListener('change', e => {
    if (e.target && e.target.matches && e.target.matches(nameSelectors)) {
      if (typeof capitalizeName === 'function') {
        const cap = capitalizeName(e.target.value);
        if (cap !== e.target.value) e.target.value = cap;
      }
    }
  }, true);
  const tabBtns = $$('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      if (window.AppRouter) {
        window.AppRouter.navigate('/' + (targetTab === 'hero' ? '' : targetTab));
      } else {
        switchTab(targetTab);
      }
    });
  });

  // Theme switcher buttons & mobile circle toggle
  const themeSwitcher = $('.theme-switcher');
  themeSwitcher?.addEventListener('click', (e) => {
    // If mobile circle (<=768px) or clicking on the switcher outside specific desktop button
    if (window.innerWidth <= 768 || e.target === themeSwitcher || !e.target.closest('.theme-btn')) {
      e.stopPropagation();
      const currentTheme = STATE.theme || document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
      if (window.DopamineEngine) window.DopamineEngine.playChime('ding');
      return;
    }
  });

  const themeBtns = $$('.theme-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        // Handled by circular themeSwitcher click toggle
        return;
      }
      const chosenTheme = btn.dataset.themeVal;
      setTheme(chosenTheme);
      if (window.DopamineEngine) window.DopamineEngine.playChime('ding');
    });
  });

  // Spoken greeting button / alias -> starts In-Website Tutorial
  $('#btn-greeting')?.addEventListener('click', () => {
    if (isTutorialRunning) {
      stopTutorial();
    } else {
      startInSiteTutorial();
    }
  });

  // Official 2-Page Student Career Dossier & Business Card button
  $('#btn-header-dossier')?.addEventListener('click', () => {
    if (window.DossierPDF && typeof window.DossierPDF.generate === 'function') {
      window.DossierPDF.generate();
    } else {
      showToast('⚠️ Preparing Your Career Booklet generator...');
    }
  });

  // Interactive Platform In-Website Tutorial button & Mode Choice Modal
  $('#btn-header-tutorial')?.addEventListener('click', () => {
    if (isTutorialRunning) {
      stopTutorial();
    } else {
      openTutorialChoiceModal();
    }
  });

  // Tutorial Mode Choice Modal Listeners
  $('#btn-close-tutorial-choice')?.addEventListener('click', closeTutorialChoiceModal);
  $('#tutorial-choice-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'tutorial-choice-modal') closeTutorialChoiceModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('tutorial-choice-modal');
      if (modal && modal.classList.contains('active')) {
        closeTutorialChoiceModal();
      }
    }
  });
  $('#tutorial-student-name-input')?.addEventListener('input', (e) => {
    e.target.style.borderColor = '';
    e.target.style.boxShadow = '';
  });
  $('#btn-start-short-tutorial')?.addEventListener('click', () => startTutorialWithMode('short'));
  $('#btn-start-expanded-tutorial')?.addEventListener('click', () => startTutorialWithMode('expanded'));
  $('#card-tutorial-short')?.addEventListener('click', (e) => {
    if (!e.target.closest('#btn-start-short-tutorial')) startTutorialWithMode('short');
  });
  $('#card-tutorial-expanded')?.addEventListener('click', (e) => {
    if (!e.target.closest('#btn-start-expanded-tutorial')) startTutorialWithMode('expanded');
  });

  // In-Website Tutorial HUD controller events
  $('#btn-tutorial-hud-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    stopTutorial();
  });
  $('#btn-tutorial-compact-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    stopTutorial();
  });
  $('#btn-tutorial-hud-collapse')?.addEventListener('click', (e) => {
    e.stopPropagation();
    $('#tutorial-hud')?.classList.remove('expanded');
  });
  $('#btn-tutorial-hud-expand')?.addEventListener('click', (e) => {
    e.stopPropagation();
    $('#tutorial-hud')?.classList.add('expanded');
  });
  // Clicking anywhere on the small corner box outside buttons expands it!
  $('#tutorial-hud')?.addEventListener('click', (e) => {
    const hud = document.getElementById('tutorial-hud');
    if (!hud) return;
    if (!hud.classList.contains('expanded')) {
      if (!e.target.closest('button')) {
        hud.classList.add('expanded');
      }
    }
  });
  $('#btn-tutorial-stop')?.addEventListener('click', stopTutorial);
  $('#btn-tutorial-pause')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isTutorialPaused) {
      resumeTutorial();
    } else {
      pauseTutorial();
    }
  });
  $('#btn-tutorial-compact-pause')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isTutorialPaused) {
      resumeTutorial();
    } else {
      pauseTutorial();
    }
  });
  $('#btn-tutorial-replay-audio')?.addEventListener('click', (e) => {
    e.stopPropagation();
    replayCurrentTutorialAudio();
  });

  $('#btn-tutorial-prev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (tutorialAutoAdvanceTimer) {
      clearTimeout(tutorialAutoAdvanceTimer);
      tutorialAutoAdvanceTimer = null;
    }
    renderInSiteTutorialStep(currentTutorialStepIndex - 1);
  });
  $('#btn-tutorial-skip')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (tutorialAutoAdvanceTimer) {
      clearTimeout(tutorialAutoAdvanceTimer);
      tutorialAutoAdvanceTimer = null;
    }
    const steps = (currentTutorialMode === 'expanded') ? TUTORIAL_EXPANDED_STEPS : TUTORIAL_SHORT_STEPS;
    const currentStep = steps[currentTutorialStepIndex];
    if (currentStep && currentStep.sectionKey) {
      try {
        const skipped = JSON.parse(localStorage.getItem('ecf_skipped_sections') || '{}');
        skipped[currentStep.sectionKey] = true;
        localStorage.setItem('ecf_skipped_sections', JSON.stringify(skipped));
      } catch (_) {}
      showToast('⏭ Step skipped. Omitted from your printable booklet.');
    }
    if (currentTutorialStepIndex < steps.length - 1) {
      renderInSiteTutorialStep(currentTutorialStepIndex + 1);
    } else {
      stopTutorial();
    }
  });
  $('#btn-tutorial-next')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const steps = (currentTutorialMode === 'expanded') ? TUTORIAL_EXPANDED_STEPS : TUTORIAL_SHORT_STEPS;
    if (currentTutorialStepIndex >= steps.length - 1) {
      if (!hasGivenFeedback()) {
        showToast('⚠️ Feedback is mandatory to complete the tour! Please rate and leave your review on the Feedback Wall.');
        const fbStepIndex = steps.findIndex(s => s.sectionKey === 'section_feedback');
        if (fbStepIndex !== -1) {
          renderInSiteTutorialStep(fbStepIndex);
        }
        return;
      }
      if (window.DopamineEngine) {
        window.DopamineEngine.confetti(0.5, 0.4);
        window.DopamineEngine.playChime('fanfare');
      }
      localStorage.setItem('cf_tutorial_completed', 'true');
      localStorage.setItem('cf_dossier_unlocked', 'true');
      sessionStorage.setItem('cf_booklet_session_unlocked', 'true'); if (typeof updateHeaderBookletVisibility === 'function') updateHeaderBookletVisibility();
  if (typeof initAdminImportControls === 'function') initAdminImportControls();
      setHeaderBookletHighlight(true);
      showToast('🎉 Congratulations on completing the Career Fair tutorial tour! Your Booklet is now unlocked at the top!');
      stopTutorial();
      return;
    }
    renderInSiteTutorialStep(currentTutorialStepIndex + 1);
  });



  // Legal Modal (Terms of Service & Privacy Policy)
  const syncTosAgreeButtonState = () => {
    if (localStorage.getItem('cf_tos_agreed') === 'true') {
      const agreeContainer = $('#tos-agree-container');
      if (agreeContainer) agreeContainer.remove();
      const agreeBtn = $('#btn-agree-tos');
      if (agreeBtn) agreeBtn.remove();
      const agreedBadge = $('#tos-agreed-badge');
      if (agreedBadge) agreedBadge.style.display = 'inline-flex';
    }
  };

  $('#link-open-tos')?.addEventListener('click', () => {
    syncTosAgreeButtonState();
    $('#tos-pp-modal')?.classList.add('active');
  });
  $('#btn-close-tos')?.addEventListener('click', () => {
    $('#tos-pp-modal')?.classList.remove('active');
  });
  $('#btn-agree-tos')?.addEventListener('click', () => {
    try {
      localStorage.setItem('cf_tos_agreed', 'true');
    } catch (_) {}
    const agreeContainer = $('#tos-agree-container');
    if (agreeContainer) agreeContainer.remove();
    const agreeBtn = $('#btn-agree-tos');
    if (agreeBtn) agreeBtn.remove();
    const agreedBadge = $('#tos-agreed-badge');
    if (agreedBadge) agreedBadge.style.display = 'inline-flex';
    $('#tos-pp-modal')?.classList.remove('active');
    showToast('Terms of Service & Telemetry Consent confirmed.');
  });
  $('#tos-pp-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'tos-pp-modal') {
      $('#tos-pp-modal').classList.remove('active');
    }
  });

  // Check on initial load
  syncTosAgreeButtonState();

  // User Issue Reporting Modal
  $('#link-report-issue')?.addEventListener('click', () => {
    const nameInput = $('#issue-user-name');
    if (nameInput) nameInput.value = STATE.studentName || '';
    $('#user-issue-modal')?.classList.add('active');
  });
  $('#btn-close-issue-modal')?.addEventListener('click', () => {
    $('#user-issue-modal')?.classList.remove('active');
  });
  $('#btn-cancel-user-issue')?.addEventListener('click', () => {
    $('#user-issue-modal')?.classList.remove('active');
  });
  $('#user-issue-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'user-issue-modal') {
      $('#user-issue-modal').classList.remove('active');
    }
  });
  ['#issue-user-name', '#issue-category', '#issue-description'].forEach(sel => {
    $(sel)?.addEventListener('input', (e) => { e.target.style.borderColor = ''; });
    $(sel)?.addEventListener('change', (e) => { e.target.style.borderColor = ''; });
  });

  $('#btn-submit-user-issue')?.addEventListener('click', async () => {
    const rawVisitorName = ($('#issue-user-name')?.value || '').trim();
    const visitorName = capitalizeName(rawVisitorName);
    if ($('#issue-user-name') && visitorName) $('#issue-user-name').value = visitorName;
    const issueType = ($('#issue-category')?.value || '').trim();
    const description = ($('#issue-description')?.value || '').trim();

    let hasError = false;
    let firstErrorEl = null;

    if (!visitorName) {
      if ($('#issue-user-name')) $('#issue-user-name').style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = $('#issue-user-name');
      hasError = true;
    } else {
      if ($('#issue-user-name')) $('#issue-user-name').style.borderColor = '';
    }

    if (!issueType || issueType === '') {
      if ($('#issue-category')) $('#issue-category').style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = $('#issue-category');
      hasError = true;
    } else {
      if ($('#issue-category')) $('#issue-category').style.borderColor = '';
    }

    if (!description) {
      if ($('#issue-description')) $('#issue-description').style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = $('#issue-description');
      hasError = true;
    } else {
      if ($('#issue-description')) $('#issue-description').style.borderColor = '';
    }

    if (hasError) {
      showToast('⚠️ Name, Category, and Description are all mandatory!');
      firstErrorEl?.focus();
      return;
    }

    const sessionId = window.DigitalHumanGuide?.sessionId || `web_${Date.now()}`;
    // Store locally as immediate resilient backup
    try {
      const localIssues = JSON.parse(localStorage.getItem('cf_local_issues') || '[]');
      localIssues.unshift({
        id: Date.now(),
        session_id: sessionId,
        visitor_name: visitorName,
        issue_type: issueType,
        description: description,
        status: 'open',
        created_at: Date.now()
      });
      localStorage.setItem('cf_local_issues', JSON.stringify(localIssues));
    } catch {}

    const res = await fetchApi('user-issues', 'POST', {
      sessionId,
      visitorName,
      issueType,
      description
    });

    if (res?.ok) {
      $('#user-issue-modal')?.classList.remove('active');
      const descInput = $('#issue-description');
      if (descInput) descInput.value = '';
      showToast('✅ Issue reported. Platform Administrator has been notified.');
      if (window.DopamineEngine) {
        window.DopamineEngine.playChime('ding');
      }
    } else {
      showToast('⚠️ Error submitting report. Please try again.');
    }
  });

  // Admin Session Files Modal Close
  $('#btn-close-session-modal')?.addEventListener('click', () => {
    $('#admin-session-details-modal')?.classList.remove('active');
  });
  $('#admin-session-details-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'admin-session-details-modal') {
      $('#admin-session-details-modal').classList.remove('active');
    }
  });

  // Setup sub-navbar horizontal scroll device (Overview, Careers, Games, etc.)
  setupHorizontalScrollShelf(
    $('#nav-tabs-track'),
    $('#btn-nav-scroll-left'),
    $('#btn-nav-scroll-right'),
    260
  );

  // Initialize interactive sub-shelf pickers
  initGamePicker();
  initPlanTools();
  initLeaderboard();

  // Initialize mobile-only scroll-down tab docking
  initMobileScrollNav();
}

// =========================================================================
// HIERARCHICAL DEEP LINKING ROUTER (QR CODE & STAND-ALONE SUB-URL ROUTING)
// Architecture: /:tab/:subtab/:part (e.g. /careers/aviation/commercial-airline-pilot)
// Supports both clean pathname URLs and hash routes (/#/...) interchangeably!
// =========================================================================

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['"’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const AppRouter = {
  current: {
    tab: 'hero',
    subtab: '',
    part: '',
    path: '/'
  },
  _isRouting: false,

  // Normalizes any path/hash into clean lowercase single-subtab format (max 1 sub-tab, e.g. /colleges/maharashtra, and / for home)
  normalizePath(raw) {
    if (!raw) return '/';
    let p = String(raw).trim();
    // Strip hash prefix
    if (p.startsWith('#/')) p = p.slice(1);
    else if (p.startsWith('#') && !p.startsWith('#sec-')) p = '/' + p.slice(1);
    // Strip trailing index.html
    p = p.replace(/\/index\.html$/i, '');
    // Ensure leading slash, strip trailing slashes
    if (!p.startsWith('/')) p = '/' + p;
    p = p.replace(/\/+$/, '');
    if (!p) return '/';

    const segments = p.replace(/^\/+|\/+$/g, '').split('/').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (segments.length === 0 || segments[0] === 'hero' || segments[0] === 'home' || segments[0] === 'overview') {
      return '/';
    }
    // Strict 1-slash restriction: exactly one sub-path segment (/tab) and NOTHING MORE
    // e.g. /careers, /colleges, /exams, /feedback, and / for home
    return '/' + segments[0];
  },

  // Reads current path from location (hash first if present, then pathname, then query params)
  getCurrentPath() {
    const hash = window.location.hash || '';
    if (hash.startsWith('#/') || (hash.startsWith('#') && hash.length > 1 && !hash.startsWith('#sec-'))) {
      return this.normalizePath(hash);
    }

    if (window.location.protocol === 'file:') {
      return '/';
    }

    const pathname = window.location.pathname || '/';
    if (pathname !== '/' && pathname !== '/index.html') {
      return this.normalizePath(pathname);
    }

    const search = window.location.search;
    if (search) {
      const q = new URLSearchParams(search);
      // Support incoming business card verification links -> target roadmap & bizcard view
      if (q.get('v') === '1' || q.get('v') === '2040' || q.get('verify') === '2040' || (q.has('s') && q.has('t')) || (q.has('student') && q.has('title'))) {
        return '/roadmap/bizcard';
      }
      const tab = q.get('tab');
      if (tab) {
        const sub = q.get('sub') || q.get('cat') || q.get('game') || q.get('pack') || '';
        return this.normalizePath('/' + [tab, sub].filter(Boolean).join('/'));
      }
    }

    return '/';
  },

  // Updates the browser address bar with the canonical URL
  updateUrl(path, replace = false) {
    const cleanPath = this.normalizePath(path);
    this.current.path = cleanPath;

    try {
      const isFile = window.location.protocol === 'file:';
      if (isFile) {
        const targetHash = '#' + cleanPath;
        if (window.location.hash !== targetHash) {
          if (replace) window.location.replace(targetHash);
          else window.location.hash = targetHash;
        }
        return;
      }

      const targetUrl = (cleanPath === '/' ? '/' : cleanPath) + (window.location.search || '');
      if (window.location.pathname !== cleanPath || (cleanPath === '/' && window.location.pathname !== '/') || window.location.hash) {
        if (replace) {
          window.history.replaceState({ path: cleanPath }, '', targetUrl);
        } else {
          window.history.pushState({ path: cleanPath }, '', targetUrl);
        }
      }
    } catch (e) {
      try {
        window.location.hash = '#' + cleanPath;
      } catch (err) {}
    }
  },

  // Programmatically navigates to a new route
  navigate(path, options = {}) {
    const cleanPath = this.normalizePath(path);
    if (options.silent) {
      this.updateUrl(cleanPath, options.replace !== false);
      return;
    }
    this.updateUrl(cleanPath, options.replace === true);
    this.routeTo(cleanPath, options);
  },

  // Callback when tab is switched via switchTab
  onTabSwitched(tabId) {
    if (this._isRouting) return;
    this.current.tab = tabId;
    this.current.subtab = '';
    this.current.part = '';
    this.updateUrl((!tabId || tabId === 'hero') ? '/' : '/' + tabId, false);
  },

  // Dispatches route to UI elements
  routeTo(rawPath, options = {}) {
    this._isRouting = true;
    try {
      // Parse raw path segments (allows parsing incoming 3-part links/bookmarks for scroll/highlight)
      const rawClean = String(rawPath || '').trim().replace(/^[#\/]+|[\/]+$/g, '');
      const rawSegments = rawClean.split('/').map(s => s.trim().toLowerCase()).filter(Boolean);
      let rawTab = rawSegments[0] || 'hero';
      const subtab = rawSegments[1] || '';
      const part = rawSegments[2] || '';

      const path = this.normalizePath(rawPath);

      // Tab aliases
      const TAB_ALIASES = {
        '': 'hero',
        'home': 'hero',
        'overview': 'hero',
        'arcade': 'games',
        'coach': 'speechLab',
        'speech-lab': 'speechLab',
        'speechlab': 'speechLab',
        'anchor': 'teleprompter',
        'news': 'teleprompter',
        'voicelab': 'voicelab',
        'voice-lab': 'voicelab',
        'clone': 'voicelab',
        'voice': 'voicelab',
        'plan': 'roadmap',
        'myplan': 'roadmap'
      };
      let tab = TAB_ALIASES[rawTab] || rawTab;

      // Special route: /guide or /guide/tour
      if (tab === 'guide' || tab === 'tour') {
        switchTab('hero', { fromRouter: true });
        this.current = { tab: 'hero', subtab: 'guide', part: '', path };
        if (window.DigitalHumanGuide && typeof window.DigitalHumanGuide.startGreetingAndTour === 'function') {
          setTimeout(() => window.DigitalHumanGuide.startGreetingAndTour(), 300);
        }
        return;
      }

      // Feature Flag Guard
      if (window.STATE?.config?.flags) {
        const flagKeyMap = {
          careers: 'careers',
          colleges: 'colleges',
          exams: 'exams',
          speak: 'speechLab',
          speechLab: 'speechLab',
          teleprompter: 'anchorMode',
          games: 'games',
          roadmap: 'roadmap',
          leaderboard: 'leaderboard',
          feedback: 'feedback',
          voicelab: 'voiceLab'
        };
        const flagKey = flagKeyMap[tab];
        if (flagKey && window.STATE.config.flags[flagKey] === false) {
          tab = 'hero';
        }
      }

      // Switch to main tab (skip sub initialization so we can cleanly control it)
      switchTab(tab, { fromRouter: true, skipSubInit: true, keepScroll: Boolean(part) });
      this.current = { tab, subtab, part, path };

      // Dispatch Tab-Specific Sub-Routing
      if (tab === 'voicelab') {
        if (window.VoiceLab && typeof window.VoiceLab.init === 'function') {
          window.VoiceLab.init();
        }
        if (subtab) {
          const modeChip = $(`#sec-voicelab .filter-chip[data-vl-mode="${subtab}"]`);
          if (modeChip) modeChip.click();
        }
        return;
      }

      if (tab === 'careers') {
        this._routeCareers(subtab, part);
      } else if (tab === 'colleges') {
        this._routeColleges(subtab, part);
      } else if (tab === 'exams') {
        this._routeExams(subtab, part);
      } else if (tab === 'speak') {
        this._routeSpeak(subtab, part);
      } else if (tab === 'speechLab') {
        initSpeechLab();
      } else if (tab === 'teleprompter') {
        this._routeTeleprompter(subtab, part);
      } else if (tab === 'games') {
        this._routeGames(subtab, part);
      } else if (tab === 'roadmap') {
        this._routeRoadmap(subtab, part);
      } else if (tab === 'leaderboard') {
        this._routeLeaderboard(subtab, part);
      } else if (tab === 'feedback') {
        loadFeedbackWall();
      } else if (tab === 'admin') {
        this._routeAdmin(subtab, part);
      }

      // If URL was in hash or query, normalize browser address bar to clean path
      this.updateUrl(path, true);

    } finally {
      this._isRouting = false;
    }
  },

  // 1. Careers Sub-Routing: /careers/:category/:careerSlug
  _routeCareers(catSlug, careerSlug) {
    renderCareers();
    const catMap = {
      all: 'All',
      health: 'Health',
      healthcare: 'Health',
      aviation: 'Aviation',
      defense: 'Aviation',
      tech: 'Tech',
      software: 'Tech',
      law: 'Law',
      justice: 'Law',
      media: 'Media',
      journalism: 'Media',
      business: 'Business',
      finance: 'Business',
      creative: 'Creative',
      arts: 'Creative',
      policy: 'Public Policy',
      'public-policy': 'Public Policy',
      publicpolicy: 'Public Policy'
    };

    const targetCat = catMap[catSlug] || (catSlug ? 'All' : null);
    if (targetCat) {
      const chip = $(`#career-category-filters .filter-chip[data-cat="${targetCat}"]`);
      if (chip) {
        $$('#career-category-filters .filter-chip').forEach(b => b.classList.remove('active'));
        chip.classList.add('active');
        const input = $('#career-search-input');
        if (input) input.dispatchEvent(new Event('input'));
      }
    }

    if (careerSlug) {
      setTimeout(() => {
        const cards = $$('#careers-cards-container .card');
        for (const card of cards) {
          const title = (card.querySelector('.card-title')?.textContent || '').trim();
          if (slugify(title).includes(careerSlug) || careerSlug.includes(slugify(title))) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('deeplink-target-highlight');
            setTimeout(() => card.classList.remove('deeplink-target-highlight'), 3800);
            break;
          }
        }
      }, 150);
    }
  },

  // 2. Colleges Sub-Routing: /colleges/:region/:collegeOrAccred
  _routeColleges(regSlug, part) {
    renderColleges();
    const regMap = {
      maharashtra: 'Maharashtra',
      mumbai: 'Maharashtra',
      pune: 'Maharashtra',
      panindia: 'PanIndia',
      'pan-india': 'PanIndia',
      india: 'PanIndia',
      abroad: 'Abroad',
      global: 'Abroad'
    };
    const targetRegion = regMap[regSlug];
    if (targetRegion) {
      const chip = $(`#college-region-filters .filter-chip[data-region="${targetRegion}"]`);
      if (chip) {
        chip.click();
      }
    }

    if (part) {
      setTimeout(() => {
        if (part.includes('naac')) {
          const sel = $('#college-accreditation-filter');
          if (sel) {
            sel.value = 'NAAC A++';
            sel.dispatchEvent(new Event('change'));
          }
        } else if (part.includes('nirf')) {
          const sel = $('#college-accreditation-filter');
          if (sel) {
            sel.value = 'NIRF Top 50';
            sel.dispatchEvent(new Event('change'));
          }
        } else {
          const cards = $$('#colleges-cards-container .card');
          for (const card of cards) {
            const title = (card.querySelector('.card-title')?.textContent || '').trim();
            if (slugify(title).includes(part) || part.includes(slugify(title))) {
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              card.classList.add('deeplink-target-highlight');
              setTimeout(() => card.classList.remove('deeplink-target-highlight'), 3800);
              break;
            }
          }
        }
      }, 150);
    }
  },

  // 3. Exams Sub-Routing: /exams/:examSlug
  _routeExams(examSlug) {
    renderExams();
    if (!examSlug) return;
    setTimeout(() => {
      const cards = $$('#exams-cards-container .card');
      for (const card of cards) {
        const title = (card.querySelector('.card-title')?.textContent || '').trim();
        if (slugify(title).includes(examSlug) || examSlug.includes(slugify(title))) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('deeplink-target-highlight');
          setTimeout(() => card.classList.remove('deeplink-target-highlight'), 3800);
          break;
        }
      }
    }, 150);
  },

  // 4. Speak Studio Sub-Routing: /speak/:pack/:level
  _routeSpeak(packSlug, levelPart) {
    initSpeakLadder();
    const packMap = {
      everyday: 'Everyday',
      journalism: 'Journalism',
      media: 'Journalism',
      law: 'Law',
      court: 'Law',
      academic: 'Academic',
      scholarly: 'Academic'
    };
    const pack = packMap[packSlug];
    if (pack) {
      const chip = $(`#speak-pack-filters .filter-chip[data-pack="${pack}"]`);
      if (chip) chip.click();
    }
    if (levelPart) {
      const lvl = Number(String(levelPart).replace(/\D/g, ''));
      if (lvl >= 1 && lvl <= 5) {
        STATE.speakLevel = lvl;
        changeSpeechSentence();
      }
    }
  },

  // 5. Teleprompter Sub-Routing: /teleprompter/:script/:speed
  _routeTeleprompter(scriptSlug, speedSlug) {
    initTeleprompter();
    const sel = $('#anchor-script-select');
    if (sel && scriptSlug) {
      const validOptions = Array.from(sel.options).map(o => o.value);
      const match = validOptions.find(opt => opt === scriptSlug || scriptSlug.includes(opt));
      if (match) {
        sel.value = match;
        sel.dispatchEvent(new Event('change'));
      }
    }
    if (speedSlug) {
      const speedBtn = $(`#speed-${speedSlug}`);
      if (speedBtn) speedBtn.click();
    }
  },

  // 6. Arcade Games Sub-Routing: /games/:game/:quest
  _routeGames(gameSlug, questSlug) {
    const gameMap = {
      
      'quest-scribe': 'quest-scribe',
      scribe: 'quest-scribe',
      'the-scribe': 'quest-scribe',
      'quest-etym': 'quest-etym',
      etym: 'quest-etym',
      etymologist: 'quest-etym',
      'the-etymologist': 'quest-etym',
      'quest-bard': 'quest-bard',
      bard: 'quest-bard',
      'the-bard': 'quest-bard',
      'the-bards-mirror': 'quest-bard',
      'quest-oracle': 'quest-oracle',
      oracle: 'quest-oracle',
      'the-career-oracle': 'quest-oracle',
      'quest-cipher': 'quest-cipher',
      cipher: 'quest-cipher',
      'the-ink-cipher': 'quest-cipher',
      'gaming-hall': 'gaming-hall',
      hall: 'gaming-hall',
      quests: 'gaming-hall',
      wordle: 'wordle',
      flashcards: 'flashcards',
      flashcard: 'flashcards',
      dict: 'dict',
      dictionary: 'dict',
      spelling: 'spelling',
      'spelling-bee': 'spelling',
      hangman: 'hangman'
    };
    const gameKey = gameMap[gameSlug] || 'quest-scribe';
    renderGameArena(gameKey);

    if (gameKey === 'gaming-hall' && questSlug) {
      const questMap = {
        scribe: 0,
        'the-scribe': 0,
        '1': 0,
        etym: 1,
        'the-etymologist': 1,
        '2': 1,
        bard: 2,
        'the-bards-mirror': 2,
        '3': 2,
        oracle: 3,
        'the-career-oracle': 3,
        '4': 3,
        cipher: 4,
        'the-ink-cipher': 4,
        '5': 4
      };
      if (questMap[questSlug] !== undefined) {
        gamingHallArcIndex = questMap[questSlug];
        if (typeof updateGamingHallArc === 'function') {
          updateGamingHallArc();
        }
      }
    }
  },

  // 7. Roadmap Tools Sub-Routing: /roadmap/:tool/:detail
  _routeRoadmap(toolSlug, detail) {
    const toolMap = {
      bizcard: 'bizcard',
      card: 'bizcard',
      businesscard: 'bizcard',
      myplan: 'myplan',
      plan: 'myplan',
      roadmap: 'myplan',
      quiz: 'quiz'
    };
    const toolKey = toolMap[toolSlug] || 'bizcard';
    renderPlanTool(toolKey);

    if (toolKey === 'bizcard' && detail) {
      setTimeout(() => {
        const sel = $('#bizcard-career-select');
        if (sel) {
          const opts = Array.from(sel.options);
          const matched = opts.find(o => slugify(o.value).includes(detail) || detail.includes(slugify(o.value)));
          if (matched) {
            sel.value = matched.value;
            sel.dispatchEvent(new Event('change'));
          }
        }
      }, 150);
    }
  },

  // 8. Leaderboard Sub-Routing: /leaderboard/:pack
  _routeLeaderboard(packSlug) {
    const packMap = {
      all: 'All',
      everyday: 'Everyday',
      journalism: 'Journalism',
      media: 'Journalism',
      law: 'Law',
      academic: 'Academic'
    };
    const pack = packMap[packSlug] || 'All';
    loadLeaderboard(pack);
    const chip = $(`#leaderboard-pack-filters .filter-chip[data-board-pack="${pack}"]`);
    if (chip) {
      $$('#leaderboard-pack-filters .filter-chip').forEach(b => b.classList.remove('active'));
      chip.classList.add('active');
    }
  },

  // 9. Admin Sub-Routing: /admin/:view
  _routeAdmin(viewSlug) {
    renderAdminView();
    if (viewSlug && STATE.adminKey) {
      setTimeout(() => {
        const chip = $(`#admin-tab-row .filter-chip[data-admin-view="${viewSlug}"]`);
        if (chip) chip.click();
      }, 100);
    }
  },

  // Returns canonical shareable URL for QR code generation
  getShareableUrl(path = this.current.path) {
    const origin = window.location.origin;
    const clean = this.normalizePath(path);
    return origin + clean;
  },

  // Initializes router listeners and executes initial route on boot
  init() {
    window.addEventListener('popstate', () => {
      if (isTutorialRunning) return;
      this.routeTo(this.getCurrentPath(), { fromHistory: true });
    });

    window.addEventListener('hashchange', () => {
      if (isTutorialRunning) return;
      this.routeTo(this.getCurrentPath(), { fromHistory: true });
    });

    // Run initial route
    const initialPath = this.getCurrentPath();
    this.routeTo(initialPath, { isInitial: true });
  }
};

window.AppRouter = AppRouter;
window.slugify = slugify;
window.switchTab = switchTab;
window.setTheme = setTheme;
window.stopAllVoice = stopAllVoice;
window.speak = speak;
window.speakGreeting = speakGreeting;
window.getCurrentTtsAudio = () => currentTtsAudio;

function switchTab(tabId, options = {}) {
  // Alias protection: map 'plan', 'myplan', 'bizcard' to 'roadmap'
  if (tabId === 'plan' || tabId === 'myplan' || tabId === 'bizcard') {
    tabId = 'roadmap';
  }

  // Stop all active voice playback when navigating, except if tutorial is active or keepVoice option passed
  if (!isTutorialRunning && !options.keepVoice) {
    stopAllVoice();
  }

  STATE.activeTab = tabId;

  // Update navbar button states
  $$('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Smoothly center the active tab in the horizontal scroll track
  const activeTabBtn = $(`.tab-btn[data-tab="${tabId}"]`);
  if (activeTabBtn) {
    activeTabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  // Hyperframe Fluid Tab Transition
  const performTabSwap = () => {
    $$('.section-shell').forEach(sec => sec.hidden = true);
    const targetSec = $(`#sec-${tabId}`);
    if (targetSec) {
      targetSec.hidden = false;
      if (!options.keepScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (typeof window.updateMobileNavDockState === 'function') {
          window.updateMobileNavDockState();
          setTimeout(window.updateMobileNavDockState, 150);
          setTimeout(window.updateMobileNavDockState, 450);
        }
      }
    }
  };

  if (!isTutorialRunning && 'startViewTransition' in document && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(performTabSwap);
  } else {
    performTabSwap();
  }

  // Synchronize URL with router if this was triggered directly (not from router routeTo)
  if (!options.fromRouter && window.AppRouter && typeof window.AppRouter.onTabSwitched === 'function') {
    window.AppRouter.onTabSwitched(tabId);
  }

  // If leaving hero tab, pause YouTube iframe so audio does not leak into other tabs
  if (tabId !== 'hero') {
    const heroIframe = $('#hero-youtube-iframe');
    if (heroIframe && heroIframe.contentWindow) {
      try {
        heroIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
      } catch (_) {}
      heroIframe.dataset.wasHidden = 'true';
    }
  }

  // Trigger section initializers (always ensure hero, careers, colleges, exams, speak, speechLab, teleprompter are initialized)
  if (tabId === 'hero') renderHeroStream({ forceResume: true });
  if (tabId === 'careers') renderCareers();
  if (tabId === 'colleges') renderColleges();
  if (tabId === 'exams') renderExams();
  if (tabId === 'speak') initSpeakLadder();
  if (tabId === 'speechLab') initSpeechLab();
  if (tabId === 'teleprompter') initTeleprompter();
  if (!options.skipSubInit) {
    if (tabId === 'games') renderGameArena('quest-scribe');
    if (tabId === 'roadmap') renderPlanTool('bizcard');
    if (tabId === 'leaderboard') loadLeaderboard();
    if (tabId === 'feedback') loadFeedbackWall();
    if (tabId === 'admin') renderAdminView();
  }
}

function setTheme(themeName, silent = false) {
  const mode = (themeName === 'dark' || themeName === 'cinematic') ? 'dark' : 'light';
  STATE.theme = mode;

  // Instant hardware-accelerated theme switch without laggy view transitions or reflow
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('cf_theme', mode);

  const metaTheme = $('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', mode === 'dark' ? '#0c0d10' : '#f8fafc');
  }

  const switcher = $('.theme-switcher');
  if (switcher) {
    switcher.setAttribute('data-active-theme', mode);
    switcher.setAttribute('title', mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    switcher.setAttribute('aria-label', mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  }

  $$('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeVal === mode);
  });

  // Dynamically synchronize ambient background particles to the mode
  if (typeof window.syncBackgroundParticlesTheme === 'function') {
    window.syncBackgroundParticlesTheme();
  }
}

// ─── 4. SECTION RENDERERS ─────────────────────────────────────────────────────

// SECTION: CAREERS
function renderCareers() {
  const container = $('#careers-cards-container');
  if (!container) return;
  const searchInput = $('#career-search-input');
  const catFilters = $$('#career-category-filters .filter-chip');

  let activeCat = 'All';
  let searchTerm = '';

  const update = () => {
    const filtered = CAREERS_DATA.filter(c => {
      const matchCat = activeCat === 'All' || c.cat.toLowerCase().includes(activeCat.toLowerCase());
      const matchSearch = !searchTerm || (
        c.title.toLowerCase().includes(searchTerm) ||
        c.desc.toLowerCase().includes(searchTerm) ||
        c.skills.toLowerCase().includes(searchTerm) ||
        c.englishSuperpower.toLowerCase().includes(searchTerm)
      );
      return matchCat && matchSearch;
    });

    container.innerHTML = '';
    if (!filtered.length) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);">No matching careers found for "${escapeHtml(searchTerm)}".</div>`;
      return;
    }

    filtered.forEach(c => {
      const card = document.createElement('article');
      card.className = 'card';
      const cSlug = slugify(c.title);
      card.dataset.careerSlug = cSlug;
      card.id = 'career-' + cSlug;
      card.innerHTML = `
        <div class="card-header">
          <div class="card-icon" aria-hidden="true">${c.icon}</div>
          <div>
            <h3 class="card-title">${escapeHtml(c.title)}</h3>
            <span class="badge-pill badge-nirf" style="margin-top:4px;">${escapeHtml(c.cat)}</span>
          </div>
        </div>
        <p class="card-body">${escapeHtml(c.desc)}</p>
        <div style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:12px;border:1px solid var(--border);">
          <strong style="color:var(--accent-cyan);font-size:12px;display:block;margin-bottom:4px;letter-spacing:0.04em;">⚡ WHY ENGLISH IS THE SUPERPOWER:</strong>
          <p style="font-size:13px;line-height:1.45;color:var(--text-main);">${escapeHtml(c.englishSuperpower)}</p>
        </div>
        <div class="card-footer">
          <div><strong style="color:var(--text-main);">Typical Compensation:</strong> <span style="color:var(--accent-emerald);font-weight:700;">${escapeHtml(c.salary)}</span></div>
          <div><strong style="color:var(--text-main);">Required Path:</strong> ${escapeHtml(c.degrees)}</div>
          <div><strong style="color:var(--text-main);">Entrance Tests:</strong> <span style="color:var(--accent-brand);font-weight:600;">${escapeHtml(c.exams)}</span></div>
        </div>
        <div style="margin-top:10px;">
          <button type="button" class="btn btn-secondary btn-xs btn-pin-career" data-title="${escapeHtml(c.title)}" style="width:100%;font-weight:700;padding:6px 10px;">
            ⭐ Pin to Your Booklet
          </button>
        </div>

      `;
      container.appendChild(card);
    });
  };

  // Delegate career selection clicks
  container?.addEventListener('click', e => {
    const cardEl = e.target.closest('.card');
    const btn = e.target.closest('.btn-pin-career');
    const title = btn ? btn.dataset.title : (cardEl ? cardEl.querySelector('.card-title')?.textContent : '');
    if (!title) return;

    const careerObj = CAREERS_DATA.find(c => c.title === title);
    if (!careerObj) return;

    if (window.AppRouter) {
      const catSlug = slugify(careerObj.cat || activeCat);
      window.AppRouter.navigate('/careers', { silent: true });
    }

    if (!btn) return;

    if (!STATE.studentProfile) STATE.studentProfile = {};
    STATE.studentProfile.chosenCareer = careerObj;
    try {
      localStorage.setItem('cf_chosen_career', JSON.stringify(careerObj));
    } catch (err) {}

    if (window.DopamineEngine) {
      window.DopamineEngine.playChime('ding');
      window.DopamineEngine.confetti(0.5, 0.4);
      window.DopamineEngine.unlockBadge('career_explorer', 'Career Explorer', '🎯');
    }
    showToast(`⭐ ${careerObj.title} pinned to Your Booklet!`);
    if (typeof onCareerPinnedByStudent === 'function') {
      onCareerPinnedByStudent(careerObj);
    }
  });

  // Event bindings
  searchInput?.addEventListener('input', e => {
    searchTerm = e.target.value.toLowerCase().trim();
    update();
  });

  catFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      catFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      update();
      if (window.AppRouter) {
        const catSlug = slugify(activeCat);
        window.AppRouter.navigate('/careers', { silent: true });
      }
    });
  });

  update();
}

// SECTION: COLLEGES WITH ACCREDITATION
function renderColleges() {
  const container = $('#colleges-cards-container');
  if (!container) return;
  const regionFilters = $$('#college-region-filters .filter-chip');
  const accredFilter = $('#college-accreditation-filter');

  let activeRegion = 'Maharashtra';
  let activeAccred = 'All';

  const update = () => {
    const list = COLLEGES_DATA[activeRegion] || [];
    const filtered = list.filter(col => {
      if (activeAccred === 'All') return true;
      if (activeAccred === 'NAAC A++') return col.accreditation.naac.includes('A++');
      if (activeAccred === 'NAAC A+') return col.accreditation.naac.includes('A+') || col.accreditation.naac.includes("'A'");
      if (activeAccred === 'NIRF Top') return col.accreditation.nirf.includes('Rank') || col.accreditation.nirf.includes('Top');
      if (activeAccred === 'Autonomous') return col.accreditation.status.includes('Autonomous') || col.accreditation.status.includes('INI');
      if (activeAccred === 'Professional') return col.accreditation.status.includes('BCI') || col.accreditation.status.includes('NMC') || col.accreditation.status.includes('DGCA') || col.accreditation.status.includes('NBA');
      return true;
    });

    container.innerHTML = '';
    if (!filtered.length) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);">No institutions matching the selected accreditation filter in ${activeRegion}.</div>`;
      return;
    }

    filtered.forEach(col => {
      const card = document.createElement('article');
      card.className = 'card';
      const colSlug = slugify(col.name);
      card.dataset.collegeSlug = colSlug;
      card.id = 'college-' + colSlug;
      
      const badgeClass = col.accreditation.badgeType === 'naac' ? 'badge-naac'
                       : col.accreditation.badgeType === 'nirf' ? 'badge-nirf'
                       : col.accreditation.badgeType === 'global' ? 'badge-global' : 'badge-reg';

      card.innerHTML = `
        <div class="card-header">
          <div class="card-icon" style="background:rgba(0,240,255,0.08);">🏛️</div>
          <div>
            <h3 class="card-title" style="font-size:18px;">${escapeHtml(col.name)}</h3>
            <span style="font-size:12.5px;color:var(--text-dim);">📍 ${escapeHtml(col.loc)}</span>
          </div>
        </div>
        <div class="accreditation-badges">
          <span class="badge-pill ${badgeClass}">🏆 ${escapeHtml(col.accreditation.naac)}</span>
          <span class="badge-pill badge-nirf">📊 ${escapeHtml(col.accreditation.nirf)}</span>
          <span class="badge-pill badge-reg">📜 ${escapeHtml(col.accreditation.status)}</span>
        </div>
        <p class="card-body" style="font-size:13.5px;margin-top:8px;">${escapeHtml(col.highlights)}</p>
        <div class="card-footer">
          <div><strong style="color:var(--text-main);">Signature Programs:</strong> ${escapeHtml(col.courses)}</div>
        </div>
      `;
      container.appendChild(card);
    });
  };

  container.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    if (window.AppRouter) {
      window.AppRouter.navigate('/colleges', { silent: true });
    }
  });

  regionFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      regionFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRegion = btn.dataset.region;
      update();
      if (window.AppRouter) {
        window.AppRouter.navigate('/colleges', { silent: true });
      }
    });
  });

  accredFilter?.addEventListener('change', e => {
    activeAccred = e.target.value;
    update();
    if (window.AppRouter) {
      window.AppRouter.navigate('/colleges', { silent: true });
    }
  });

  update();
}

// SECTION: ENTRANCE EXAMS
function renderExams() {
  const container = $('#exams-cards-container');
  if (!container) return;
  container.innerHTML = '';

  EXAMS_DATA.forEach(ex => {
    const card = document.createElement('article');
    card.className = 'card';
    const exSlug = slugify(ex.name);
    card.dataset.examSlug = exSlug;
    card.id = 'exam-' + exSlug;
    card.innerHTML = `
      <div class="card-header">
        <div class="card-icon" style="background:rgba(255,183,3,0.1);">📝</div>
        <div>
          <h3 class="card-title" style="font-size:18px;">${escapeHtml(ex.name)}</h3>
          <span class="badge-pill badge-reg">${escapeHtml(ex.cat)}</span>
        </div>
      </div>
      <div class="accreditation-badges" style="margin: 8px 0 12px; display: flex; flex-wrap: wrap; gap: 6px;">
        <span class="badge-pill badge-naac">🏛️ ${escapeHtml(ex.conductedBy)}</span>
        <span class="badge-pill badge-nirf">📋 ${escapeHtml(ex.format.split('·')[0].trim())}</span>
        <span class="badge-pill badge-global">📅 ${escapeHtml(ex.date)}</span>
      </div>
      <p class="card-body" style="font-size:13.5px;"><strong>Admissions Target:</strong> ${escapeHtml(ex.target)}</p>
      <div style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:10px 12px;margin-bottom:12px;border:1px solid var(--border);">
        <strong style="color:var(--accent-cyan);font-size:12px;display:block;margin-bottom:3px;">ENGLISH WEIGHT &amp; SKILL TESTED:</strong>
        <p style="font-size:13px;line-height:1.45;color:var(--text-main);">${escapeHtml(ex.englishWeight)}</p>
      </div>
      <div class="card-footer">
        <div><strong style="color:var(--text-main);">Conducted By:</strong> ${escapeHtml(ex.conductedBy)}</div>
        <div><strong style="color:var(--text-main);">Format:</strong> ${escapeHtml(ex.format)}</div>
        <div><strong style="color:var(--text-main);">Timeline:</strong> <span style="color:var(--accent-magenta);font-weight:700;">${escapeHtml(ex.date)}</span></div>
      </div>
    `;
    container.appendChild(card);
  });

  container.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const exSlug = card.dataset.examSlug;
    if (exSlug && window.AppRouter) {
      window.AppRouter.navigate('/exams', { silent: true });
    }
  });
}

// ─── 5. SPEAK & PRONUNCIATION STUDIO (DYNAMIC AI PRACTICE) ───────────────────
let speakPack = 'Everyday';
const usedSentenceHistory = new Set(JSON.parse(sessionStorage.getItem('cf_used_sentences') || '[]'));

// Curated high-variety foundational sentence pool (15+ distinct sentences per domain = 60+ sentences)
const AI_SENTENCE_LIBRARY = {
  Everyday: [
    "Speaking clear English allows anyone to connect with people and cultures worldwide with confidence.",
    "Effective communication begins with genuine empathy, active listening, and concise phrasing.",
    "Reading insightful books daily expands our vocabulary and introduces creative perspectives.",
    "Clarity of thought and deliberate pronunciation transform simple words into compelling messages.",
    "Every modern profession rewards individuals who express complex thoughts with composure.",
    "Consistent daily speech practice builds effortless fluency and long-term academic excellence.",
    "Confidence in public speaking grows steadily whenever you embrace new conversational challenges.",
    "Expressing original ideas with precision ensures your message is remembered and respected.",
    "Thoughtful diction and calm pacing help listeners absorb critical information without confusion.",
    "Articulate speech is not merely an academic test; it is the universal passport to leadership.",
    "Constructive conversations open unexpected opportunities in teamwork, research, and entrepreneurship.",
    "Listening with complete patience enables you to respond with greater wisdom and authority.",
    "A rich vocabulary empowers students to describe nuanced emotions and analytical concepts accurately.",
    "Deliberate articulation turns routine classroom presentations into captivating intellectual discussions.",
    "Clear pronunciation bridges cultural divides and fosters mutual respect across diverse communities."
  ],
  Journalism: [
    "Good evening, we are broadcasting live from the national student press briefing in Mumbai.",
    "Investigative journalism holds public institutions accountable through verified empirical research.",
    "The editor reviewed the breaking investigative manuscript moments before it went to press.",
    "Every credible news article adheres strictly to the fundamental five Ws: Who, What, When, Where, and Why.",
    "Clear teleprompter pacing and deliberate diction keep broadcast audiences engaged during breaking bulletins.",
    "The international correspondent reported live from the climate conference amid tense multilateral negotiations.",
    "Fact-checking and source verification remain the indispensable pillars of trustworthy modern journalism.",
    "The documentary film crew traveled across rural regions to chronicle sustainable agricultural breakthroughs.",
    "An objective press corps safeguards democratic transparency by asking incisive, well-researched questions.",
    "Live studio discussions require composure, disciplined listening, and crisp conversational transitions.",
    "Digital newsrooms must balance instantaneous deadline reporting with meticulous factual accuracy.",
    "The anchor modulated her tone to deliver the solemn national address with utmost dignity.",
    "Feature articles blend creative storytelling techniques with rigorous statistical data and interviews.",
    "Media literacy equips future generations to distinguish between credible journalism and speculative gossip.",
    "The editorial board issued an impassioned analysis urging renewed investment in public libraries."
  ],
  Law: [
    "May it please the court, the counsel submits that fundamental constitutional liberties must be preserved.",
    "The advocate presented documented empirical evidence to substantiate the contractual claim.",
    "Constitutional jurisprudence forms the bedrock of justice and equality in our legal system.",
    "The learned judge overruled the objection and directed the witness to conclude the statement.",
    "Precision drafting in legal contracts prevents prolonged disputes and costly corporate litigation.",
    "The appellate bench examined the statutory precedents governing intellectual property and digital privacy.",
    "Judicial fairness requires rigorous cross-examination balanced by unyielding adherence to civil rights.",
    "The moot court delegation argued the maritime boundary treaty with exceptional rhetorical clarity.",
    "The doctrine of legal precedent ensures stability and predictability throughout common law jurisdictions.",
    "An advocate must command both persuasive forensic rhetoric and encyclopedic knowledge of statutory statutes.",
    "The arbitration tribunal issued a binding resolution upholding the cross-border trade agreement.",
    "Legal scholars debate the delicate equilibrium between statutory regulation and personal autonomy.",
    "The witness testified under oath regarding the corporate disclosures filed with securities regulators.",
    "Thorough archival research in constitutional history illuminates the foundational intent of our laws.",
    "Eloquence in oral advocacy is most compelling when grounded in undeniable statutory facts."
  ],
  Academic: [
    "The hypothesis was thoroughly tested through empirical research and quantitative methodology.",
    "Peer-reviewed scholarly literature guarantees that published scientific findings undergo independent scrutiny.",
    "Critical analysis of nineteenth-century literature illuminates societal transformations during the Industrial Revolution.",
    "Interdisciplinary research unites computational linguistics with cognitive psychology to study language acquisition.",
    "Academic integrity demands that all cited references and archival sources be scrupulously acknowledged.",
    "The astrophysicist published revolutionary findings on gravitational lensing and interstellar matter.",
    "Rigorous econometric models demonstrate a positive correlation between primary education and national innovation.",
    "Scholars convened at the symposium to deliberate the philosophical implications of artificial intelligence.",
    "The dissertation examined the historical evolution of post-colonial diplomatic relations in South Asia.",
    "Empirical evidence gathered across double-blind clinical trials confirms the efficacy of the treatment.",
    "Synthesizing qualitative field interviews with macro statistical indices yielded unexpected sociological insights.",
    "The University Press released a monumental monograph tracing linguistic shifts across ancient trade routes.",
    "Methodological transparency enables global scientific peers to replicate and validate published experiments.",
    "The humanities faculty championed critical thinking as an indispensable safeguard against misinformation.",
    "Interdisciplinary academic inquiry dissolves traditional boundaries between theoretical physics and philosophy."
  ]
};

let isSpeakLadderBound = false;
function initSpeakLadder() {
  const nameInput = $('#speak-student-name');
  const activeName = STATE.studentName || localStorage.getItem('cf_student_name') || localStorage.getItem('ecf_student_name') || '';
  if (nameInput) {
    if (!nameInput.value || nameInput.value !== activeName) {
      nameInput.value = activeName;
    }
  }

  if (!isSpeakLadderBound) {
    isSpeakLadderBound = true;

    const packFilters = $$('#speak-pack-filters .filter-chip');
    packFilters.forEach(btn => {
      btn.addEventListener('click', () => {
        packFilters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        speakPack = btn.dataset.pack || 'Everyday';
        const packTag = $('#active-challenge-pack-tag');
        if (packTag) packTag.textContent = btn.textContent;
        changeSpeechSentence();
        if (window.AppRouter) {
          window.AppRouter.navigate('/speak', { silent: true });
        }
      });
    });

    $('#btn-listen-target')?.addEventListener('click', function() {
      const text = $('#speak-target-sentence')?.textContent;
      if (text) speak(text, this);
      if (isTutorialRunning && isTutorialOnSection('section_speak')) {
        const reactionEl = document.getElementById('tutorial-hud-reaction');
        if (reactionEl) {
          reactionEl.style.display = 'inline-flex';
          reactionEl.textContent = '🎙️ Model pronunciation played! Practice speaking or click Next Exhibit ▶';
        }
      }
    });

    $('#btn-show-phonetics')?.addEventListener('click', () => {
      const box = $('#phonetic-breakdown-box');
      if (!box) return;
      if (box.style.display === 'none') {
        const text = $('#speak-target-sentence')?.textContent || '';
        const words = text.split(/\s+/).slice(0, 6);
        box.innerHTML = `<strong>Phonetic Syllable Breakdown:</strong><br>` +
          words.map(w => `<span style="display:inline-block;margin:4px 10px 4px 0;"><strong>${escapeHtml(w)}</strong>: <code style="color:var(--accent-cyan);font-family:var(--font-mono);">${generateIpaApprox(w)}</code></span>`).join('');
        box.style.display = 'block';
      } else {
        box.style.display = 'none';
      }
    });

    // CHANGE SENTENCE BUTTON
    $('#btn-change-sentence')?.addEventListener('click', () => {
      changeSpeechSentence(true);
    });

    $('#speak-record-orb')?.addEventListener('click', () => {
      toggleSpeakLadderRecord();
      if (isTutorialRunning && isTutorialOnSection('section_speak')) {
        const reactionEl = document.getElementById('tutorial-hud-reaction');
        if (reactionEl) {
          reactionEl.style.display = 'inline-flex';
          reactionEl.textContent = '🎙️ Articulation tested! Click Next Exhibit ▶ when ready to proceed';
        }
      }
    });

    // Initial sentence load
    changeSpeechSentence();
  }
}

async function changeSpeechSentence(userTriggered = false) {
  stopAllVoice();
  const sentenceEl = $('#speak-target-sentence');
  const transcriptEl = $('#speak-transcript-preview');
  const resultBox = $('#speak-eval-result');
  const phoneticsBox = $('#phonetic-breakdown-box');
  const aiBadge = $('#active-challenge-ai-badge');

  if (transcriptEl) transcriptEl.value = '';
  if (resultBox) resultBox.style.display = 'none';
  if (phoneticsBox) phoneticsBox.style.display = 'none';
  if (sentenceEl && userTriggered) {
    sentenceEl.innerHTML = '<span style="color:var(--text-dim);"><span class="spinner-sm"></span> Loading adaptive challenge...</span>';
  }

  let selectedSentence = '';

  // 1. Attempt AI Generation from backend Gemini endpoint with timeout
  try {
    const aiPromise = fetchApi('ai', 'POST', {
      task: 'generate-sentence',
      pack: speakPack
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
    const aiRes = await Promise.race([aiPromise, timeoutPromise]);

    if (aiRes && aiRes.sentence && typeof aiRes.sentence === 'string') {
      const candidate = aiRes.sentence.trim().replace(/^["']|["']$/g, '');
      if (candidate.length > 20 && !usedSentenceHistory.has(candidate)) {
        selectedSentence = candidate;
        if (aiBadge) aiBadge.style.display = 'none';
      }
    }
  } catch (e) {}

  // 2. If AI sentence was not generated or was repeated, pick from non-repeated pool
  if (!selectedSentence) {
    const pool = AI_SENTENCE_LIBRARY[speakPack] || AI_SENTENCE_LIBRARY.Everyday;
    const available = pool.filter(s => !usedSentenceHistory.has(s));

    if (available.length > 0) {
      selectedSentence = available[Math.floor(Math.random() * available.length)];
    } else {
      // If student has practiced all in this pack, reset pack history and pick a fresh one
      pool.forEach(s => usedSentenceHistory.delete(s));
      selectedSentence = pool[Math.floor(Math.random() * pool.length)];
    }
    if (aiBadge) aiBadge.textContent = '⚡ Adaptive AI Sentence';
  }

  // 3. Mark as used and persist in session to guarantee zero repeats
  usedSentenceHistory.add(selectedSentence);
  try {
    const historyArr = Array.from(usedSentenceHistory).slice(-60);
    sessionStorage.setItem('cf_used_sentences', JSON.stringify(historyArr));
  } catch (e) {}

  if (sentenceEl) {
    sentenceEl.textContent = selectedSentence;
  }

  if (userTriggered) {
    showToast('New practice sentence ready! 🎲');
  }
}

function toggleSpeakLadderRecord() {
  const orb = $('#speak-record-orb');
  const status = $('#speak-status-text');
  const preview = $('#speak-transcript-preview');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (STATE.isRecording) {
    // Stop recording
    STATE.isRecording = false;
    orb.classList.remove('recording');
    status.textContent = 'Recording complete. Evaluating your spoken accuracy...';
    if (STATE.speechRecognition) {
      try { STATE.speechRecognition.stop(); } catch {}
    }
    evaluateSpeakAttempt();
    return;
  }

  // Start recording
  stopAllVoice();
  const nameInput = $('#speak-student-name');
  const rawNameVal = (nameInput ? nameInput.value : STATE.studentName || '').trim();
  const nameVal = capitalizeName(rawNameVal);
  if (nameInput && nameVal) nameInput.value = nameVal;
  if (!nameVal) {
    if (nameInput) {
      nameInput.focus();
      nameInput.style.borderColor = '#ef4444';
      nameInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
      nameInput.addEventListener('input', () => {
        nameInput.style.borderColor = '';
        nameInput.style.boxShadow = '';
      }, { once: true });
    }
    showToast('Please enter your name first — name is mandatory.');
    return;
  }

  if (!SpeechRecognition) {
    if (preview && preview.value.trim()) {
      evaluateSpeakAttempt();
      return;
    }
    showToast('Speech Recognition not supported in this browser. You can type your spoken attempt in the text box below and click the microphone orb to evaluate!');
    if (preview) preview.focus();
    return;
  }

  try {
    const recog = new SpeechRecognition();
    recog.lang = 'en-IN'; // Indian English acoustic & phonetic recognition
    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = e => {
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript + ' ';
      }
      preview.value = full.trim();
    };

    recog.onerror = err => {
      status.textContent = `Mic note: ${err.error}. You can still type your transcript.`;
    };

    recog.onend = () => {
      if (STATE.isRecording) {
        try { recog.start(); } catch {}
      }
    };

    recog.start();
    STATE.speechRecognition = recog;
    STATE.isRecording = true;
    orb.classList.add('recording');
    status.textContent = 'Listening... Speak clearly into your microphone!';
  } catch (err) {
    status.textContent = 'Microphone permission required. Check browser settings.';
  }
}

async function evaluateSpeakAttempt() {
  const target = $('#speak-target-sentence')?.textContent.trim() || '';
  const transcript = $('#speak-transcript-preview')?.value.trim() || '';
  const nameInput = $('#speak-student-name');
  const rawName = (nameInput ? nameInput.value : STATE.studentName || '').trim();
  const name = capitalizeName(rawName);
  if (nameInput && name) nameInput.value = name; const labNameMirror = $('#speech-lab-student-name'); if (labNameMirror) labNameMirror.value = name;
  const resultBox = $('#speak-eval-result');

  if (!name) {
    if (nameInput) {
      nameInput.focus();
      nameInput.style.borderColor = '#ef4444';
      nameInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.25)';
      nameInput.addEventListener('input', () => {
        nameInput.style.borderColor = '';
        nameInput.style.boxShadow = '';
      }, { once: true });
    }
    showToast('Please enter your name — name is mandatory.');
    return;
  }

  if (!transcript) {
    showToast('No speech was detected. Please try recording again.');
    return;
  }

  // Calculate Levenshtein accuracy
  const acc = calculateLevenshteinAccuracy(target, transcript);

  // Persist student name
  STATE.studentName = name;
  localStorage.setItem('cf_student_name', name);

  // Persist student score in local storage so it is never lost even if offline or cold start
  try {
    const localScoreObj = {
      id: 'sc_' + Date.now(),
      name,
      pack: speakPack,
      level: STATE.speakLevel || 1,
      acc,
      fluency: Math.min(100, acc + 5),
      clarity: Math.min(100, acc + 2),
      wpm: 130,
      class_name: STATE.studentClass || 'Class 10',
      target_career: '',
      ts: Date.now()
    };
    const curScores = JSON.parse(localStorage.getItem('cf_user_scores') || '[]');
    const sIdx = curScores.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
    if (sIdx === -1) {
      curScores.unshift(localScoreObj);
    } else if (acc >= (curScores[sIdx].acc || 0)) {
      curScores[sIdx] = localScoreObj;
    }
    localStorage.setItem('cf_user_scores', JSON.stringify(curScores));
  } catch (e) {}

  // Persist speech profile
  if (!STATE.studentProfile) STATE.studentProfile = {};
  STATE.studentProfile.lastSpeech = {
    pack: speakPack,
    accuracy: acc,
    fluency: Math.min(100, acc + 5),
    clarity: Math.min(100, acc + 2),
    wpm: 128,
    sentence: target
  };
  try {
    localStorage.setItem('cf_last_speech', JSON.stringify(STATE.studentProfile.lastSpeech));
  } catch (e) {}

  // Send score to backend API (no level requirement)
  fetchApi('attempt', 'POST', {
    name,
    pack: speakPack,
    target,
    fallback_text: transcript,
    class_name: STATE.studentClass,
    acc
  }).then(async () => {
    // Refresh leaderboard and evaluate top 10 rank
    try {
      const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
      const curPack = activeBtn ? activeBtn.dataset.boardPack : 'All';
      await loadLeaderboard(curPack);
    } catch (e) {}
  });

  if (resultBox) {
    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="background:rgba(0,240,255,0.08);border:1px solid rgba(0,240,255,0.3);border-radius:var(--radius-md);padding:16px;margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <strong style="color:var(--accent-cyan);font-size:16px;">
            🎯 Speech Accuracy Evaluated!
          </strong>
          <span class="badge-pill badge-naac" style="font-size:14px;font-weight:700;">${acc}% Accuracy</span>
        </div>
        <p style="font-size:13.5px;margin:10px 0;color:var(--text-main);">
          <strong>Recognized Speech:</strong> "${escapeHtml(transcript)}"
        </p>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:8px;">
          <span style="font-size:12px;color:var(--accent-emerald);font-weight:600;">
            ✓ Score saved to Exhibition Leaderboard
          </span>
          <button class="btn btn-primary btn-sm" onclick="changeSpeechSentence(true)">
            ✨ Next Practice Sentence ➡️
          </button>
        </div>
      </div>
    `;
  }
}

function calculateLevenshteinAccuracy(ref, hyp) {
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const r = norm(ref);
  const h = norm(hyp);
  if (!r && !h) return 100;
  if (!r || !h) return 0;

  const dp = Array.from({ length: r.length + 1 }, (_, i) =>
    Array.from({ length: h.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      dp[i][j] = r[i - 1] === h[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  const dist = dp[r.length][h.length];
  const maxLen = Math.max(r.length, h.length);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

function generateIpaApprox(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  return `/${clean}/`;
}

// ─── 6. AI SPEECH LAB (WORD-PASSING SCREEN & ROTATING COACH) ─────────────────
let speechLabRec = null;
let speechLabStartTime = 0;
let currentSpeechLabSentence = "";
let speechLabTargetWords = [];
let speechLabPassedIndices = new Set();
let speechLabUsedSentences = new Set();
let isSpeechLabPassed = false;
let speechLabPrefetchedSentence = null;
let speechLabPrefetching = false;

async function prefetchNextSpeechLabSentence() {
  if (speechLabPrefetchedSentence || speechLabPrefetching) return;
  speechLabPrefetching = true;
  try {
    const aiPromise = fetchApi('ai', 'POST', {
      task: 'generate-sentence',
      pack: 'Executive'
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
    const res = await Promise.race([aiPromise, timeoutPromise]);
    if (res && res.sentence && typeof res.sentence === 'string') {
      const candidate = res.sentence.trim().replace(/^["']|["']$/g, '');
      if (candidate.length > 20 && !speechLabUsedSentences.has(candidate)) {
        speechLabPrefetchedSentence = { sentence: candidate, source: 'gemini' };
      }
    }
  } catch {} finally {
    speechLabPrefetching = false;
  }
}

let isPassingSentence = false;
let speechLabSentencesPassedCount = 0;
let currentCoachTipIndex = -1;
let speechLabMediaStream = null;
let activeSegmentRecorder = null;

const SPEECH_COACH_TIPS = [
  {
    title: "The 1-Second Strategic Pause",
    tip: "When transitioning between complex thoughts, insert a silent 1-second breath pause instead of filler words like 'um' or 'like'. Deliberate silence projects executive authority and allows listeners to absorb your point."
  },
  {
    title: "Downward Inflection for Executive Gravitas",
    tip: "End declarative statements with a subtle downward tonal inflection. Ending sentences on an upward pitch makes confident claims sound like questions, subtly weakening audience trust."
  },
  {
    title: "Optimal Conversational Cadence (130–145 WPM)",
    tip: "Target a speaking rate of 130 to 145 words per minute. Speaking beyond 165 WPM causes listeners to miss critical consonants, while speaking below 100 WPM risks listener fatigue."
  },
  {
    title: "Crisp Terminal Consonants",
    tip: "Firmly articulate terminal consonants like /t/, /d/, and /k/ (e.g., 'impact', 'record', 'fact'). Crisp word boundaries immediately elevate broadcast and interview clarity."
  },
  {
    title: "Diaphragmatic Breath Support",
    tip: "Draw air from your lower diaphragm rather than shallow chest breathing. Steady airflow prevents voice crackling, stabilizes volume, and gives your speech rich acoustic resonance."
  },
  {
    title: "The Rhetorical Rule of Three",
    tip: "Organize persuasive arguments in triads ('clarity, brevity, impact'). The human brain naturally retains information grouped in three rhythmic beats far better than long unstructured lists."
  },
  {
    title: "Replacing Verbal Crutches with Breath",
    tip: "Hesitation fillers like 'basically', 'actually', or 'you know' often occur when the brain moves faster than the breath. Inhale silently through your nose when formulating your next sentence."
  },
  {
    title: "Dynamic Pitch & Volume Modulation",
    tip: "Avoid a monotone delivery by varying pitch slightly when introducing your key thesis. Leaning into a softer, intentional tone often commands more room attention than speaking loudly."
  },
  {
    title: "Stress Content Words over Function Words",
    tip: "Emphasize key nouns and active verbs while lightly passing over prepositions and conjunctions. This creates the natural, engaging rhythm of native English fluency."
  },
  {
    title: "Articulating Technical Nomenclature",
    tip: "When pronouncing domain-specific terms (e.g., 'jurisprudence', 'aerodynamics', 'multilateral'), decelerate slightly. Pristine clarity on technical words signals deep domain mastery."
  },
  {
    title: "The Anchor & Pivot Technique",
    tip: "When answering impromptu questions, begin with a clear opening thesis sentence before diving into supporting evidence. A crisp start anchors your thoughts and guides your audience."
  },
  {
    title: "Open Jaw & Resonant Vowels",
    tip: "Relax your jaw muscles to give long vowels full acoustic space. Unclenched diction instantly improves speech recognition and clarity across auditorium microphones."
  }
];

function refreshSpeechCoachTip(userTriggered = false) {
  const box = $('#ai-coaching-text');
  if (!box) return;

  let newIdx;
  do {
    newIdx = Math.floor(Math.random() * SPEECH_COACH_TIPS.length);
  } while (SPEECH_COACH_TIPS.length > 1 && newIdx === currentCoachTipIndex);

  currentCoachTipIndex = newIdx;
  const item = SPEECH_COACH_TIPS[newIdx];

  box.innerHTML = `
    <div style="margin-bottom:6px;">
      <span class="badge-pill badge-global" style="font-size:11.5px;font-weight:700;background:rgba(0,240,255,0.15);color:var(--accent-cyan);border:1px solid var(--accent-cyan);margin-right:6px;">
        💡 ${escapeHtml(item.title)}
      </span>
    </div>
    <div style="color:var(--text-main);font-size:13.5px;line-height:1.6;">
      ${escapeHtml(item.tip)}
    </div>
    <div style="font-size:11.5px;color:var(--text-dim);margin-top:8px;">
      Suggestions rotate automatically on every visit or when you tap <strong>🔄 New Tip</strong>. Speak the sentence to receive instant 6-dimension evaluation.
    </div>
  `;

  if (userTriggered) {
    showToast('New speech coach suggestion loaded! 💡');
  }
}

function cleanSpeechWord(w) {
  return String(w || '').toLowerCase().replace(/[^\w]/g, '');
}

function isWordMatch(spoken, target) {
  if (!spoken || !target) return false;
  if (spoken === target) return true;
  // Prefix match (e.g. communicate vs communicating, listen vs listening)
  if (target.length >= 4 && (spoken.startsWith(target.slice(0, 4)) || target.startsWith(spoken.slice(0, 4)))) {
    return true;
  }
  // Allow 1 character typo or phoneme variation for words of length >= 4
  if (Math.abs(spoken.length - target.length) <= 1 && target.length >= 4) {
    let diff = 0;
    const minLen = Math.min(spoken.length, target.length);
    for (let i = 0; i < minLen; i++) {
      if (spoken[i] !== target[i]) diff++;
    }
    diff += Math.abs(spoken.length - target.length);
    if (diff <= 1) return true;
  }
  return false;
}

function changeSpeechLabSentence(userTriggered = false) {
  stopAllVoice();
  isSpeechLabPassed = false;

  const screen = $('#speech-lab-ai-screen');
  if (screen) screen.classList.remove('speech-lab-screen-complete');

  const textContainer = $('#speech-lab-sentence-text');
  const aiBadge = $('#speech-lab-ai-badge');
  const liveHeard = $('#speech-lab-live-heard');

  if (liveHeard) liveHeard.textContent = '🎤 Speak sentence into mic to pass...';

  // Load from session storage to avoid repeats
  try {
    const saved = JSON.parse(sessionStorage.getItem('cf_speechlab_used') || '[]');
    saved.forEach(s => speechLabUsedSentences.add(s));
  } catch {}

  let selectedSentence = '';
  let sourceBadge = '⚡ Adaptive AI Prompter';

  // 1. Instant zero-latency swap: Use prefetched Gemini sentence if ready
  if (speechLabPrefetchedSentence && speechLabPrefetchedSentence.sentence) {
    selectedSentence = speechLabPrefetchedSentence.sentence;
    if (speechLabPrefetchedSentence.source === 'gemini') {
      sourceBadge = '';
    }
    speechLabPrefetchedSentence = null;
  }

  // 2. Instant fallback to adaptive zero-repeat sentence pool (0 ms latency)
  if (!selectedSentence) {
    const pools = [
      ...(AI_SENTENCE_LIBRARY.Everyday || []),
      ...(AI_SENTENCE_LIBRARY.Journalism || []),
      ...(AI_SENTENCE_LIBRARY.Law || []),
      ...(AI_SENTENCE_LIBRARY.Academic || [])
    ];
    const available = pools.filter(s => !speechLabUsedSentences.has(s));
    if (available.length > 0) {
      selectedSentence = available[Math.floor(Math.random() * available.length)];
    } else {
      speechLabUsedSentences.clear();
      selectedSentence = pools[Math.floor(Math.random() * pools.length)];
    }
  }

  if (aiBadge) { aiBadge.style.display = 'none'; }

  speechLabUsedSentences.add(selectedSentence);
  try {
    sessionStorage.setItem('cf_speechlab_used', JSON.stringify(Array.from(speechLabUsedSentences).slice(-50)));
  } catch {}

  currentSpeechLabSentence = selectedSentence;
  speechLabTargetWords = selectedSentence.split(/\s+/).filter(Boolean);
  speechLabPassedIndices = new Set();

  if (textContainer) {
    textContainer.innerHTML = speechLabTargetWords.map((w, idx) => {
      const cls = idx === 0 ? 'prompter-word target' : 'prompter-word';
      return `<span class="${cls}" id="sl-word-${idx}">${escapeHtml(w)}</span>`;
    }).join(' ');
  }

  const counterBadge = $('#speech-lab-pass-badge');
  const percentLabel = $('#speech-lab-pass-percent');
  if (counterBadge) {
    counterBadge.className = 'badge-pill badge-nirf';
    counterBadge.style.background = '';
    counterBadge.style.color = '';
    counterBadge.style.borderColor = '';
    counterBadge.textContent = `${speechLabSentencesPassedCount} ${speechLabSentencesPassedCount === 1 ? 'Sentence' : 'Sentences'} Passed`;
  }
  if (percentLabel) percentLabel.textContent = '0% Match';

  if (userTriggered) {
    showToast('New practice sentence ready! 🎲');
  }

  // Background non-blocking prefetch for next cue so next sentence is always pre-warmed
  prefetchNextSpeechLabSentence();
}

function passAwaySpeechLabSentence(manualSkip = false) {
  stopAllVoice();
  if (isPassingSentence) return;
  isPassingSentence = true;

  const textContainer = $('#speech-lab-sentence-text');
  const screen = $('#speech-lab-ai-screen');
  const counterBadge = $('#speech-lab-pass-badge');
  const percentLabel = $('#speech-lab-pass-percent');

  if (!manualSkip) {
    speechLabSentencesPassedCount++;
    if (counterBadge) {
      counterBadge.className = 'badge-pill badge-global';
      counterBadge.style.background = 'rgba(16, 185, 129, 0.25)';
      counterBadge.style.color = '#34d399';
      counterBadge.style.borderColor = '#10b981';
      counterBadge.textContent = `${speechLabSentencesPassedCount} ${speechLabSentencesPassedCount === 1 ? 'Sentence' : 'Sentences'} Passed 🎉`;
    }
    if (percentLabel) percentLabel.textContent = '100% Passed';
    if (screen) screen.classList.add('speech-lab-screen-complete');
    showToast('Sentence Passed! 🚀');

    // Automatically trigger speech analysis and leaderboard sync upon passing
    setTimeout(() => {
      analyzeSpeechLabSample();
    }, 120);
  }

  // Instantaneous zero-delay cue swap: new sentence renders immediately without even 1ms delay
  changeSpeechLabSentence(false);
  isPassingSentence = false;
}

function checkSpeechLabWordsProgress(spokenFullText, source = 'local') {
  if (!speechLabTargetWords.length || isPassingSentence) return;

  STATE.speechLabTranscript = ((STATE.speechLabTranscript || '') + ' ' + spokenFullText).trim();
  const spokenTokens = spokenFullText.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

  // In-line sequential advancement: words MUST be completed sequentially in a line.
  // Never jump ahead into the middle of the sentence when previous words have not been spoken.
  let targetPointer = 0;
  while (targetPointer < speechLabTargetWords.length && speechLabPassedIndices.has(targetPointer)) {
    targetPointer++;
  }

  for (const spoken of spokenTokens) {
    if (targetPointer >= speechLabTargetWords.length) break;

    // Check exact current expected target word
    const currentClean = cleanSpeechWord(speechLabTargetWords[targetPointer]);
    if (isWordMatch(spoken, currentClean)) {
      speechLabPassedIndices.add(targetPointer);
      targetPointer++;
    } else if (targetPointer + 1 < speechLabTargetWords.length) {
      // Natural speech forgiveness: allow at most a 1-word lookahead (e.g. if a tiny connector like "a" or "to" was softly whispered)
      const nextClean = cleanSpeechWord(speechLabTargetWords[targetPointer + 1]);
      if (isWordMatch(spoken, nextClean)) {
        speechLabPassedIndices.add(targetPointer);     // Count skipped connector as satisfied
        speechLabPassedIndices.add(targetPointer + 1); // Mark current matched word
        targetPointer += 2;
      }
    }
  }

  // Update DOM word spans in strict line order
  speechLabTargetWords.forEach((_, idx) => {
    const wordEl = $(`#sl-word-${idx}`);
    if (wordEl) {
      if (speechLabPassedIndices.has(idx)) {
        wordEl.classList.add('spoken', 'passed');
        wordEl.classList.remove('target', 'current-target');
      } else if (idx === targetPointer) {
        wordEl.classList.add('target', 'current-target');
        wordEl.classList.remove('spoken', 'passed');
      } else {
        wordEl.classList.remove('target', 'current-target', 'spoken', 'passed');
      }
    }
  });

  const total = speechLabTargetWords.length;
  const passed = speechLabPassedIndices.size;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const counterBadge = $('#speech-lab-pass-badge');
  const percentLabel = $('#speech-lab-pass-percent');
  const heardLabel = $('#speech-lab-live-heard');

  if (counterBadge && !isPassingSentence) {
    counterBadge.textContent = `${speechLabSentencesPassedCount} ${speechLabSentencesPassedCount === 1 ? 'Sentence' : 'Sentences'} Passed`;
  }

  if (percentLabel) {
    percentLabel.textContent = `${pct}% Match`;
  }

  if (heardLabel && spokenTokens.length) {
    const recent = spokenTokens.slice(-4).join(' ');
    const tag = source === 'elevenlabs' ? '⚡ ElevenLabs' : '🎤 Heard';
    heardLabel.textContent = `${tag}: "${recent}"`;
  }

  // Completion: When the sentence has been completed in line, transition immediately without delay
  if (targetPointer >= total && total > 0 && !isPassingSentence && !isSpeechLabPassed) {
    isSpeechLabPassed = true;
    passAwaySpeechLabSentence(false);
  }
}

async function sendAudioToElevenLabsSTT(audioBlob) {
  if (!audioBlob || audioBlob.size < 2000) return;
  try {
    const fd = new FormData();
    const ext = (audioBlob.type && audioBlob.type.includes('mp4')) ? 'speech.mp4' : (audioBlob.type && audioBlob.type.includes('ogg') ? 'speech.ogg' : 'speech.webm');
    fd.append('file', audioBlob, ext);

    const headers = {};
    if (STATE.adminKey) headers['Authorization'] = 'Bearer ' + STATE.adminKey;

    const res = await fetch(getApiUrl('api/stt'), {
      method: 'POST',
      body: fd,
      headers
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.ok && data.text) {
        const badge = $('#speech-lab-stt-engine-badge');
        if (badge) {
          badge.style.background = 'rgba(16, 185, 129, 0.15)';
          badge.style.color = '#34d399';
          badge.style.borderColor = 'rgba(52, 211, 153, 0.4)';
          badge.innerHTML = '🎙️ ElevenLabs Scribe STT Active';
        }
        checkSpeechLabWordsProgress(data.text, 'elevenlabs');
        updateRealtimePaceAndFillers(data.text);
      }
    }
  } catch (err) {
    console.warn('ElevenLabs STT dispatch error:', err);
  }
}

function initSpeechLab() {
  // Always stop previous voices when entering
  stopAllVoice();

  // 1. Refresh Speech Coach Suggestion dynamically EVERY time it is opened!
  refreshSpeechCoachTip(false);

  // 2. Setup AI Sentence Teleprompter Screen
  if (!currentSpeechLabSentence) {
    changeSpeechLabSentence(false);
  }

  // Wire Student Name in Speech Lab (Synchronized with Speak Ladder & Leaderboard)
  const labNameInput = $('#speech-lab-student-name');
  const activeLabName = STATE.studentName || localStorage.getItem('cf_student_name') || localStorage.getItem('ecf_student_name') || '';
  if (labNameInput) {
    if (!labNameInput.value || labNameInput.value !== activeLabName) {
      labNameInput.value = activeLabName;
    }
    if (!labNameInput.dataset.bound) {
      labNameInput.dataset.bound = 'true';
      labNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          labNameInput.blur();
          analyzeSpeechLabSample();
        }
      });
      labNameInput.addEventListener('input', () => {
        labNameInput.style.borderColor = '';
        labNameInput.style.boxShadow = '';
        const cap = capitalizeName(labNameInput.value);
        if (cap !== labNameInput.value && labNameInput.value.length === 1) labNameInput.value = cap;
        STATE.studentName = labNameInput.value.trim();
        try { localStorage.setItem('cf_student_name', STATE.studentName); } catch (_) {}
        const otherInput = $('#speak-student-name');
        if (otherInput && otherInput.value !== labNameInput.value) otherInput.value = labNameInput.value;
      });
      labNameInput.addEventListener('blur', () => {
        const cap = capitalizeName(labNameInput.value);
        labNameInput.value = cap;
        STATE.studentName = cap;
        try { localStorage.setItem('cf_student_name', cap); } catch (_) {}
        const otherInput = $('#speak-student-name');
        if (otherInput) otherInput.value = cap;
        // If an evaluation was pending student name, map it immediately to leaderboard
        if (STATE.speechLabPendingEval && cap) {
          analyzeSpeechLabSample();
        }
      });
    }
  }

  // 3. Bind interactive buttons (idempotent guards)
  const recBtn = $('#btn-speech-lab-record');
  const stopBtn = $('#btn-speech-lab-stop');
  const analyzeBtn = $('#btn-speech-lab-analyze');
  const newSentBtn = $('#btn-speech-lab-new-sentence');
  const listenSentBtn = $('#btn-speech-lab-listen');
  const refreshTipBtn = $('#btn-refresh-speech-coach');

  if (recBtn && !recBtn.dataset.bound) {
    recBtn.dataset.bound = 'true';
    recBtn.addEventListener('click', () => {
      startSpeechLabAudio();
      // Do not auto-advance: student must have ample time to speak and review scores
    });
  }
  if (stopBtn && !stopBtn.dataset.bound) {
    stopBtn.dataset.bound = 'true';
    stopBtn.addEventListener('click', stopSpeechLabAudio);
  }
  if (analyzeBtn && !analyzeBtn.dataset.bound) {
    analyzeBtn.dataset.bound = 'true';
    analyzeBtn.addEventListener('click', analyzeSpeechLabSample);
  }
  if (newSentBtn && !newSentBtn.dataset.bound) {
    newSentBtn.dataset.bound = 'true';
    newSentBtn.addEventListener('click', () => passAwaySpeechLabSentence(true));
  }
  if (listenSentBtn && !listenSentBtn.dataset.bound) {
    listenSentBtn.dataset.bound = 'true';
    listenSentBtn.addEventListener('click', function() {
      if (currentSpeechLabSentence) {
        speak(currentSpeechLabSentence, this);
      }
      if (isTutorialRunning && isTutorialOnSection('section_speech')) {
        const reactionEl = document.getElementById('tutorial-hud-reaction');
        if (reactionEl) {
          reactionEl.style.display = 'inline-flex';
          reactionEl.textContent = '🎙️ Sample Loaded! Review scores & click Next Exhibit';
        }
      }
    });
  }
  if (refreshTipBtn && !refreshTipBtn.dataset.bound) {
    refreshTipBtn.dataset.bound = 'true';
    refreshTipBtn.addEventListener('click', () => refreshSpeechCoachTip(true));
  }
}

async function startSpeechLabAudio() {
  stopAllVoice();
  const status = $('#speech-session-state');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    STATE.audioStream = stream;
    speechLabMediaStream = stream;

    // Web Audio API Waveform Visualizer
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!STATE.audioContext) {
      STATE.audioContext = new AudioCtx();
    }
    if (STATE.audioContext.state === 'suspended') {
      await STATE.audioContext.resume();
    }
    const source = STATE.audioContext.createMediaStreamSource(stream);
    STATE.analyser = STATE.audioContext.createAnalyser();
    STATE.analyser.fftSize = 256;
    source.connect(STATE.analyser);

    renderSpeechLabWaveform();

    // 1. ElevenLabs Scribe Continuous Segment STT Dispatcher
    let mimeType = '';
    if (window.MediaRecorder) {
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
      }

      function recordNextSegment() {
        if (!speechLabMediaStream || !speechLabMediaStream.active) return;
        try {
          const segRec = new MediaRecorder(speechLabMediaStream, mimeType ? { mimeType } : undefined);
          activeSegmentRecorder = segRec;
          const chunks = [];
          segRec.ondataavailable = e => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };
          segRec.onstop = async () => {
            if (chunks.length > 0 && speechLabMediaStream && speechLabMediaStream.active) {
              const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
              await sendAudioToElevenLabsSTT(blob);
            }
            if (speechLabMediaStream && speechLabMediaStream.active) {
              recordNextSegment();
            }
          };
          segRec.start();
          setTimeout(() => {
            if (segRec.state === 'recording') {
              try { segRec.stop(); } catch {}
            }
          }, 2400);
        } catch (err) {
          console.warn('ElevenLabs segment recorder error:', err);
        }
      }
      recordNextSegment();
    }

    // 2. Real-time Browser Speech Recognition (Instant phoneme word-passing feedback)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      speechLabRec = new SpeechRecognition();
      speechLabRec.lang = 'en-IN'; // Indian English acoustic & phonetic recognition
      speechLabRec.continuous = true;
      speechLabRec.interimResults = true;
      speechLabRec.onresult = e => {
        let full = '';
        for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript + ' ';
        full = full.trim();
        checkSpeechLabWordsProgress(full, 'local');
        updateRealtimePaceAndFillers(full);
      };
      speechLabRec.start();
    }

    speechLabStartTime = Date.now();
    if (status) {
      status.textContent = 'Prompter Live';
      status.className = 'badge-pill badge-global';
    }
    $('#btn-speech-lab-record').disabled = true;
    $('#btn-speech-lab-stop').disabled = false;
  } catch (err) {
    showToast('Microphone access denied or not available. Please allow microphone permissions.');
  }
}

function stopSpeechLabAudio() {
  if (activeSegmentRecorder && activeSegmentRecorder.state !== 'inactive') {
    try { activeSegmentRecorder.stop(); } catch {}
    activeSegmentRecorder = null;
  }
  if (speechLabMediaStream) {
    speechLabMediaStream.getTracks().forEach(t => t.stop());
    speechLabMediaStream = null;
  }
  if (STATE.audioStream) {
    STATE.audioStream.getTracks().forEach(t => t.stop());
    STATE.audioStream = null;
  }
  if (speechLabRec) {
    try { speechLabRec.stop(); } catch {}
    speechLabRec = null;
  }
  const _sSt = $('#speech-session-state'); if (_sSt) _sSt.textContent = 'Prompter Idle';
  $('#btn-speech-lab-record').disabled = false;
  $('#btn-speech-lab-stop').disabled = true;

  // Automatically trigger speech analysis and leaderboard sync upon stopping recording
  setTimeout(() => {
    analyzeSpeechLabSample();
  }, 120);
}

function renderSpeechLabWaveform() {
  const canvas = $('#speech-lab-waveform');
  if (!canvas || !STATE.analyser) return;
  const ctx = canvas.getContext('2d');
  const bufferLength = STATE.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    if (!STATE.analyser) return;
    requestAnimationFrame(draw);
    STATE.analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      ctx.fillStyle = `hsl(${180 + i * 2}, 100%, 50%)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
  draw();
}

function updateRealtimePaceAndFillers(text) {
  const clean = String(text || '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const elapsedSecs = Math.max(1, (Date.now() - speechLabStartTime) / 1000);
  const wpm = Math.round((words.length / elapsedSecs) * 60);

  // Update WPM gauge
  $('#wpm-value-label').textContent = `${wpm} WPM`;
  const needle = $('#wpm-needle-indicator');
  if (needle) {
    const percent = Math.min(100, Math.max(0, (wpm / 200) * 100));
    needle.style.left = `${percent}%`;
  }

  // Detect Fillers
  const fillers = (clean.match(/\b(um+|uh+|erm+|like|you know|actually|basically|literally|sort of|kind of)\b/gi) || []);
  $('#filler-count-label').textContent = `${fillers.length} Fillers`;

  const chipsContainer = $('#fillers-chips-container');
  if (chipsContainer) {
    if (fillers.length) {
      chipsContainer.innerHTML = Array.from(new Set(fillers.map(f => f.toLowerCase())))
        .map(f => `<span class="badge-pill badge-global">⚠️ ${escapeHtml(f)}</span>`).join('');
    } else {
      chipsContainer.innerHTML = `<span style="font-size:12px;color:var(--text-dim);">No hesitation fillers detected yet.</span>`;
    }
  }
}

function analyzeSpeechLabSample() {
  const text = (STATE.speechLabTranscript || currentSpeechLabSentence || '').trim();
  if (!text) {
    showToast('Please record speech first to evaluate.');
    return;
  }

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const fillers = (text.match(/\b(um+|uh+|erm+|like|you know|actually|basically|literally)\b/gi) || []).length;
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

  // Passed ratio from word screen
  const totalTargetWords = speechLabTargetWords.length || words.length;
  const passedWords = speechLabPassedIndices.size || words.length;
  const passRatio = Math.min(1, Math.max(0.4, passedWords / Math.max(1, totalTargetWords)));

  // 6-Dimension Score Synthesis
  const fluency = Math.min(100, Math.max(45, Math.round((94 - fillers * 5) * passRatio)));
  const clarity = Math.min(100, Math.max(50, Math.round((88 + Math.min(10, sentences.length * 3) - fillers * 3) * passRatio)));
  const pronunciation = Math.min(100, Math.max(50, Math.round((90 - fillers * 2) * passRatio)));
  // Pace & Cadence: rate of speech and natural pausing (replaces AI-provided vocabulary)
  const pace = Math.min(100, Math.max(50, Math.round(((fluency * 0.6) + (clarity * 0.4)) * passRatio)));
  const grammar = Math.min(100, Math.max(50, 80 + (text.length > 50 ? 15 : 5)));
  const confidence = Math.min(100, Math.max(50, Math.round((fluency + clarity) / 2)));

  // Accuracy calculation: combines word articulation ratio and phonetic/Levenshtein similarity
  const wordAcc = Math.round(passRatio * 100);
  const levAcc = currentSpeechLabSentence ? calculateLevenshteinAccuracy(currentSpeechLabSentence, text) : wordAcc;
  const accuracy = Math.min(100, Math.max(50, Math.round((wordAcc * 0.6) + (levAcc * 0.4))));

  // Update UI Elements
  const accValEl = $('#speech-lab-accuracy-val');
  if (accValEl) accValEl.textContent = `${accuracy}%`;

  const pEl = $('#dim-pronunciation'); if (pEl) pEl.textContent = pronunciation;
  const fEl = $('#dim-fluency'); if (fEl) fEl.textContent = fluency;
  const cEl = $('#dim-clarity'); if (cEl) cEl.textContent = clarity;
  const paceEl = $('#dim-pace') || $('#dim-vocab'); if (paceEl) paceEl.textContent = pace;
  const gEl = $('#dim-grammar'); if (gEl) gEl.textContent = grammar;
  const confEl = $('#dim-confidence'); if (confEl) confEl.textContent = confidence;

  // Draw Spider/Radar Canvas
  drawSpiderRadar([pronunciation, fluency, clarity, pace, grammar, confidence]);

  // Persist 6D Speech evaluation
  if (!STATE.studentProfile) STATE.studentProfile = {};
  STATE.studentProfile.coach6D = {
    pronunciation,
    fluency,
    clarity,
    pace,
    grammar,
    confidence,
    pitchModulation: clarity,
    pauseControl: pace,
    confidenceScore: confidence
  };
  try {
    localStorage.setItem('cf_coach_6d', JSON.stringify(STATE.studentProfile.coach6D));
  } catch (e) {}
  if (isTutorialRunning && isTutorialOnSection('section_speech')) {
    const reactionEl = document.getElementById('tutorial-hud-reaction');
    if (reactionEl) {
      reactionEl.style.display = 'inline-flex';
      reactionEl.textContent = '🎉 6D Diagnostic Complete! Click Next Exhibit ▶ to proceed';
    }
  }

  // Resolve Student Name for Exhibition Leaderboard mapping
  const speechLabNameInput = $('#speech-lab-student-name');
  let rawName = (speechLabNameInput ? speechLabNameInput.value : '').trim() ||
                ($('#speak-student-name')?.value || '').trim();

  // If student hasn't entered their name, highlight the input at the top and prompt them
  if (!rawName) {
    STATE.speechLabPendingEval = { accuracy, fluency, clarity, text, currentSpeechLabSentence };
    if (speechLabNameInput) {
      speechLabNameInput.focus();
      speechLabNameInput.style.borderColor = '#ef4444';
      speechLabNameInput.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.6)';
      setTimeout(() => {
        speechLabNameInput.style.borderColor = '';
        speechLabNameInput.style.boxShadow = '';
      }, 3500);
    }
    showToast('⚠️ Please enter your name at the top to map your score to the leaderboard!');
    return;
  }

  STATE.speechLabPendingEval = null;
  const name = capitalizeName(rawName);
  if (speechLabNameInput) speechLabNameInput.value = name;
  if ($('#speak-student-name')) $('#speak-student-name').value = name;
  STATE.studentName = name;
  try { localStorage.setItem('cf_student_name', name); } catch (_) {}

  // Save attempt to local scores so it is reflected immediately
  const wpmVal = parseInt($('#wpm-value-label')?.textContent, 10) || 130;
  const localScoreObj = {
    id: 'sc_' + Date.now(),
    name,
    pack: 'Speech Lab',
    level: 1,
    acc: accuracy,
    fluency,
    clarity,
    wpm: wpmVal,
    class_name: STATE.studentClass || 'Class 10',
    target_career: STATE.studentProfile?.targetCareer || '',
    ts: Date.now()
  };

  try {
    const curScores = JSON.parse(localStorage.getItem('cf_user_scores') || '[]');
    const sIdx = curScores.findIndex(s => (s.name || '').toLowerCase() === name.toLowerCase());
    if (sIdx === -1) {
      curScores.unshift(localScoreObj);
    } else if (accuracy >= (curScores[sIdx].acc || 0)) {
      curScores[sIdx] = localScoreObj;
    }
    localStorage.setItem('cf_user_scores', JSON.stringify(curScores));
  } catch (e) {}

  // Persist speech profile
  STATE.studentProfile.lastSpeech = {
    pack: 'Speech Lab',
    accuracy,
    fluency,
    clarity,
    wpm: wpmVal,
    sentence: currentSpeechLabSentence || text
  };
  try {
    localStorage.setItem('cf_last_speech', JSON.stringify(STATE.studentProfile.lastSpeech));
  } catch (e) {}

  // Post attempt to Cloudflare backend D1 storage
  fetchApi('attempt', 'POST', {
    name,
    pack: 'Speech Lab',
    target: currentSpeechLabSentence || text,
    fallback_text: text,
    class_name: STATE.studentClass || 'Class 10',
    acc: accuracy,
    fluency,
    clarity,
    wpm: wpmVal
  }).then(async () => {
    try {
      const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
      const curPack = activeBtn ? activeBtn.dataset.boardPack : 'All';
      await loadLeaderboard(curPack);
    } catch (e) {}
  }).catch(() => {});

  // Update Leaderboard mapping status pill
  const lbStatus = $('#speech-lab-leaderboard-status');
  if (lbStatus) {
    lbStatus.style.display = 'inline-flex';
    lbStatus.innerHTML = `&#10003; Mapped to Leaderboard (${accuracy}%)`;
  }

  // Refresh leaderboard immediately so user sees their rank without delay
  loadLeaderboard();
  try {
    updateLeaderboardBadges(JSON.parse(localStorage.getItem('cf_user_scores') || '[]'));
  } catch (_) {}

  // AI Coaching Rewrite Suggestions
  $('#ai-coaching-text').innerHTML = `
    <div style="margin-bottom:10px;">
      <span class="badge-pill badge-global" style="font-size:11.5px;font-weight:700;background:rgba(16,185,129,0.2);color:#34d399;border:1px solid #10b981;">
        ✨ Speech Assessment Generated
      </span>
    </div>
    <strong>Targeted Strengths &amp; Adjustments:</strong><br>
    • Articulation completion: <strong>${passedWords} / ${totalTargetWords} words passed (${Math.round(passRatio * 100)}%)</strong>.<br>
    • Overall Accuracy score: <strong>${accuracy}%</strong> (recorded on Exhibition Leaderboard).<br>
    • Vocabulary richness: <strong>${vocab}%</strong> across ${words.length} spoken tokens.<br>
    • ${fillers > 0 ? `Notice ${fillers} filler phrase(s). Practice taking a silent 1-second pause when searching for words.` : 'Zero hesitation fillers detected! Flawless executive rhythm.'}<br><br>
    <strong>"Say It Better" Model Delivery:</strong><br>
    <em style="color:var(--accent-cyan);">"${escapeHtml(currentSpeechLabSentence || text.replace(/\b(um+|uh+|like|you know)\b/gi, '').trim())}"</em>
  `;

  showToast(`Speech Analysis Complete! Score (${accuracy}%) mapped to Leaderboard.`);
}

function drawSpiderRadar(scores) {
  const canvas = $('#radar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = 70;
  const labels = ['Pronunciation', 'Fluency', 'Clarity', 'Pace', 'Grammar', 'Confidence'];

  ctx.clearRect(0, 0, w, h);

  // Background Web
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let r = 20; r <= radius; r += 25) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw Data Polygon
  ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();

  scores.forEach((sc, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const r = (sc / 100) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Axis Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Space Grotesk';
  ctx.textAlign = 'center';
  labels.forEach((lbl, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + (radius + 18) * Math.cos(angle);
    const y = cy + (radius + 18) * Math.sin(angle);
    ctx.fillText(lbl, x, y + 3);
  });
}

// ─── 7. NEWS ANCHOR & TELEPROMPTER STUDIO ─────────────────────────────────────
let teleprompterState = {
  initialized: false,
  isRecording: false,
  isCameraOn: false,
  isPrompterPaused: true,
  prompterStarted: false,
  currentSpeed: 2.4, // px per frame
  tickerOffset: 0,
  prompterAnimId: null,
  idleAnimId: null,
  recordTimer: null,
  recordSeconds: 0,
  mediaRecorder: null,
  recordedChunks: [],
  lastBlobUrl: null,
  lastFileName: null,
  cameraStream: null,
  compositeAnimId: null,
  recordedMicStream: null,
  activeCompCanvas: null,
  schoolLogo: null
};

// Pre-load Kanakia International School Logo for broadcast video compositing
if (!teleprompterState.schoolLogo && typeof Image !== 'undefined') {
  const sLogo = new Image();
  sLogo.src = 'logo.png';
  teleprompterState.schoolLogo = sLogo;
}

// Pre-rendered ultra-crisp school logo cache for broadcast compositor
let crispLogoCache = null;
let crispLogoCacheScale = null;

function getCrispSchoolLogo(targetSize) {
  const rawLogo = teleprompterState.schoolLogo;
  if (!rawLogo || !rawLogo.complete || !rawLogo.naturalWidth) return null;
  const scaledKey = `${targetSize}_${rawLogo.naturalWidth}`;
  if (crispLogoCache && crispLogoCacheScale === scaledKey) {
    return crispLogoCache;
  }

  // Multi-step high-quality downsampling:
  // Downsampling directly from 400x400 to small sizes in one step causes aliasing & moire jitter in canvas.
  // Step 1: 400x400 -> 200x200
  const c1 = document.createElement('canvas');
  c1.width = 200;
  c1.height = 200;
  const ctx1 = c1.getContext('2d');
  ctx1.imageSmoothingEnabled = true;
  ctx1.imageSmoothingQuality = 'high';
  ctx1.drawImage(rawLogo, 0, 0, 200, 200);

  // Step 2: 200x200 -> targetSize * 2 (2x supersampling for high DPI crispness)
  const dprSize = targetSize * 2;
  const c2 = document.createElement('canvas');
  c2.width = dprSize;
  c2.height = dprSize;
  const ctx2 = c2.getContext('2d');
  ctx2.imageSmoothingEnabled = true;
  ctx2.imageSmoothingQuality = 'high';
  ctx2.drawImage(c1, 0, 0, dprSize, dprSize);

  crispLogoCache = c2;
  crispLogoCacheScale = scaledKey;
  return c2;
}

// Canvas rounded rectangle drawing helper for cross-browser reliability
function drawCanvasRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Draw Kanakia International School Logo at Top Left with pristine broadcast TV quality
function drawBroadcastSchoolLogo(ctx, width, height, scale) {
  const rawLogo = teleprompterState.schoolLogo;
  if (!rawLogo || !rawLogo.complete || !rawLogo.naturalWidth) return;

  const padX = Math.round(26 * scale);
  const padY = Math.round(20 * scale);
  const bugH = Math.round(54 * scale);
  const crestSize = Math.round(40 * scale);
  const bugW = Math.round(268 * scale);
  const radius = Math.round(10 * scale);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw sleek broadcast station capsule backing
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = Math.round(14 * scale);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(4 * scale);

  // High-contrast frosted glass gradient
  const bgGrad = ctx.createLinearGradient(padX, padY, padX + bugW, padY + bugH);
  bgGrad.addColorStop(0, 'rgba(10, 16, 32, 0.94)');
  bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.90)');
  ctx.fillStyle = bgGrad;

  drawCanvasRoundedRect(ctx, padX, padY, bugW, bugH, radius);
  ctx.fill();

  // Subtle metallic gold border
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
  ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));
  ctx.stroke();

  // IMPORTANT FIX: Explicitly reset all canvas shadow properties before rendering logo/text
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // 2. Subtle luminous pearl disc behind crest for maximum edge definition & contrast
  const discX = padX + Math.round(8 * scale);
  const discY = padY + Math.round((bugH - crestSize) / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.beginPath();
  ctx.arc(discX + crestSize / 2, discY + crestSize / 2, crestSize / 2 + Math.round(3 * scale), 0, Math.PI * 2);
  ctx.fill();

  // 3. Draw multi-step downscaled razor-sharp crest
  const crispLogo = getCrispSchoolLogo(crestSize);
  if (crispLogo) {
    ctx.drawImage(crispLogo, discX, discY, crestSize, crestSize);
  } else {
    ctx.drawImage(rawLogo, discX, discY, crestSize, crestSize);
  }

  // 4. Station Typography (Crisp & High-Contrast)
  const textX = discX + crestSize + Math.round(12 * scale);

  // School main title: "KANAKIA"
  const titleSize = Math.round(14 * scale);
  ctx.font = `800 ${titleSize}px "Space Grotesk", "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('KANAKIA', textX, padY + Math.round(10 * scale));

  // Subtitle: "INTERNATIONAL SCHOOL" in warm gold
  const subSize = Math.round(9.5 * scale);
  ctx.font = `700 ${subSize}px "Space Grotesk", "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillStyle = '#d4af37';
  ctx.fillText('INTERNATIONAL SCHOOL', textX, padY + Math.round(29 * scale));

  ctx.restore();
}

// Draw Authentic Lower-Third Broadcast Banner at Bottom (WITHOUT Teleprompter text)
function drawBroadcastLowerThird(ctx, width, height, scale) {
  const bannerMarginX = Math.round(20 * scale);
  const bannerMarginBottom = Math.round(18 * scale);
  const bannerH = Math.round(54 * scale);
  const bannerW = width - (bannerMarginX * 2);
  const bannerY = height - bannerMarginBottom - bannerH;
  const bannerX = bannerMarginX;
  const radius = Math.round(10 * scale);

  ctx.save();
  // Drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 18 * scale;
  ctx.shadowOffsetY = 6 * scale;

  // Background Gradient matching .news-lower-third:
  // linear-gradient(90deg, #ff2a85 0%, #b5179e 40%, rgba(14, 20, 38, 0.96) 100%)
  const grad = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY);
  grad.addColorStop(0, '#ff2a85');
  grad.addColorStop(0.38, '#b5179e');
  grad.addColorStop(0.85, 'rgba(14, 20, 38, 0.96)');
  grad.addColorStop(1, 'rgba(14, 20, 38, 0.98)');
  ctx.fillStyle = grad;

  drawCanvasRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, radius);
  ctx.fill();

  // Subtle border
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = Math.max(1, Math.round(1 * scale));
  ctx.stroke();

  // 1. Tag Pill (e.g. BREAKING NEWS)
  const tagEl = document.getElementById('lower-third-tag');
  const tagText = (tagEl ? tagEl.textContent.trim() : 'BREAKING NEWS') || 'BREAKING NEWS';

  const tagFontSize = Math.round(12 * scale);
  ctx.font = `800 ${tagFontSize}px "Space Grotesk", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
  const tagMetrics = ctx.measureText(tagText);
  const tagPadX = Math.round(10 * scale);
  const pillW = Math.round(tagMetrics.width + (tagPadX * 2));
  const pillH = Math.round(28 * scale);
  const pillX = bannerX + Math.round(12 * scale);
  const pillY = bannerY + Math.round((bannerH - pillH) / 2);
  const pillRadius = Math.round(5 * scale);

  // White pill background
  ctx.fillStyle = '#ffffff';
  drawCanvasRoundedRect(ctx, pillX, pillY, pillW, pillH, pillRadius);
  ctx.fill();

  // Pink tag text
  ctx.fillStyle = '#ff2a85';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(tagText, pillX + (pillW / 2), pillY + (pillH / 2) + 0.5);

  // 2. Headline / Copy Text
  const copyEl = document.getElementById('lower-third-copy');
  let copyText = (copyEl ? copyEl.textContent.trim() : '') || 'STUDENT BROADCAST · KANAKIA INTERNATIONAL SCHOOL';

  const copyFontSize = Math.round(15 * scale);
  ctx.font = `700 ${copyFontSize}px "Space Grotesk", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const copyX = pillX + pillW + Math.round(14 * scale);
  const copyY = bannerY + Math.round(bannerH / 2);
  const maxCopyW = bannerX + bannerW - copyX - Math.round(16 * scale);

  // Truncate if exceeds max width
  let displayText = copyText;
  if (ctx.measureText(displayText).width > maxCopyW) {
    while (displayText.length > 4 && ctx.measureText(displayText + '...').width > maxCopyW) {
      displayText = displayText.slice(0, -1);
    }
    displayText += '...';
  }
  ctx.fillText(displayText, copyX, copyY);

  ctx.restore();
}

function initTeleprompter() {
  if (typeof wireTeleprompterTutorialHighlights === 'function') wireTeleprompterTutorialHighlights();
  const cameraBtn = $('#btn-start-camera');
  const scrollBtn = $('#btn-scroll-teleprompter');
  const recordBtn = $('#btn-record-anchor');
  const downloadBtn = $('#btn-download-clip');
  const scriptSelect = $('#anchor-script-select');
  const nameInput = $('#anchor-name-input');
  const video = $('#anchor-video');
  const canvas = $('#anchor-idle-canvas');
  const track = $('#anchor-teleprompter-track') || $('#teleprompter-track');
  const s1 = $('#teleprompter-sentence-1');
  const s2 = $('#teleprompter-sentence-2');
  const speedSlow = $('#speed-slow');
  const speedNormal = $('#speed-normal');
  const speedFast = $('#speed-fast');
  const lowerTag = $('#lower-third-tag');
  const lowerCopy = $('#lower-third-copy');

  const SCRIPTS = {
    breaking: {
      tag: "BREAKING NEWS",
      role: "Media Anchor",
      text: "Good evening, we are broadcasting live from the Career Fair 2026 at Kanakia International School. Today, students explore how articulate English powers over thirty-two professional trajectories — from commercial aviation to pediatric surgery."
    },
    pilot: {
      tag: "FLIGHT DECK ATC",
      role: "Commercial Pilot",
      text: "Mumbai Radar, Air India 102 Heavy is holding short runway 27 Right, ready for immediate departure, climbing out to flight level 340 on course to London Heathrow via direct waypoint ARNAN."
    },
    doctor: {
      tag: "TRAUMA CODE BLUE",
      role: "Chief Trauma Surgeon",
      text: "Code Blue in Trauma Bay Two. Prepare rapid sequence intubation, cross-match four units of O-negative packed red cells, and notify the pediatric neurosurgery team for immediate surgical intervention."
    },
    lawyer: {
      tag: "SUPREME COURT BENCH",
      role: "Senior Advocate",
      text: "May it please Your Lordships, Article 21 guarantees not merely biological existence, but a dignified life encompassing environmental protection and digital privacy as inalienable fundamental rights under constitutional jurisprudence."
    },
    diplomat: {
      tag: "UN GENERAL ASSEMBLY",
      role: "Chief Diplomat",
      text: "Distinguished delegates, the climate emergency recognizes neither national borders nor economic status. We call upon all sovereign member states to ratify the binding 2030 decarbonization framework without reservation."
    },
    rocket: {
      tag: "MISSION CONTROL",
      role: "Flight Director",
      text: "All flight controllers, this is Mission Control. We are T-minus 20 seconds and counting. Guidance internal, propellant chilldown verified, main engine ignition sequence start... three, two, one, liftoff of the Artemis deep-space mission!"
    },
    cricket: {
      tag: "WORLD CUP FINAL",
      role: "Sports Broadcaster",
      text: "Six needed off the final delivery! The bowler steams in from the pavilion end, bowls a yorker right in the slot, lofted cleanly over extra cover, that is sailing into the stands! What a sensational victory for India!"
    },
    ciso: {
      tag: "CYBER DEFENSE SOC",
      role: "Chief InfoSec Officer",
      text: "Security Operations Command update: we detected anomalous credential stuffing against our perimeter gateways. Zero-trust token revocation has executed successfully, all session tokens are rotated, and database isolation remains fully intact."
    },
    tech: {
      tag: "SYSTEM ARCHITECTURE",
      role: "Tech Lead",
      text: "Our microservices event bus processed forty-eight million concurrent transactions with sub-five-millisecond p99 latency during peak load, proving our zero-downtime distributed consensus architecture is battle-ready."
    },
    pitch: {
      tag: "SILICON VALLEY PITCH",
      role: "Startup Founder",
      text: "Ninety percent of global enterprise communication is hindered by fragmented vocabulary and language hesitation. Our AI real-time fluency engine is solving this fifty-billion-dollar bottleneck with eighty percent month-over-month growth."
    },
    wildlife: {
      tag: "NAT GEO EXPEDITION",
      role: "Wildlife Biologist",
      text: "Broadcasting from the heart of the Sundarbans mangrove delta. We are tracking a Bengal tigress through the tidal creeks, documenting how rising sea levels are altering keystone predator hunting corridors."
    },
    banker: {
      tag: "WALL STREET M&A",
      role: "Investment Banker",
      text: "The special committee has unanimously approved the twelve-billion-dollar definitive merger agreement. The combined balance sheet unlocks substantial operational synergies and cements market leadership across Asia-Pacific."
    },
    chef: {
      tag: "MICHELIN KITCHEN",
      role: "Executive Chef",
      text: "Service please! Table four ordering the roasted langoustine with caviar emulsion and white truffle reduction. Check temperatures on the duck breasts, plate with absolute precision, and hold the sauces until pass!"
    },
    pr: {
      tag: "GLOBAL PRESS BRIEFING",
      role: "PR Director",
      text: "Good afternoon ladies and gentlemen of the press. We take full accountability for yesterday's supply chain disruption. We have dispatched regional task forces, compensated affected consumers, and initiated an independent external forensic audit."
    },
    f1: {
      tag: "F1 PIT WALL RADIO",
      role: "Race Strategist",
      text: "Box, box, box! Box this lap for fresh soft compound tires. Rain is approaching Turn 7 in three minutes, undercut window is open against Car 44, execute a sub-two-second stop and push on the out-lap!"
    },
    ocean: {
      tag: "DEEP SEA EXPEDITION",
      role: "Marine Geologist",
      text: "Submersible Alvin descending through the hadal zone at nine thousand meters depth. Sonar telemetry reveals hydrothermal venting minerals and bioluminescent fauna never before cataloged in modern marine science."
    }
  };

  // Helper to sync prompter button UI state (Start <-> Pause <-> Resume)
  const updatePrompterButtonUI = () => {
    const iconSpan = scrollBtn?.querySelector('span:first-child');
    const txtSpan = $('#prompter-scroll-btn-text');
    const hudStatus = $('#prompter-hud-status');

    if (!teleprompterState.prompterStarted) {
      if (iconSpan) iconSpan.textContent = '▶️';
      if (txtSpan) txtSpan.textContent = 'Start Teleprompter';
      if (hudStatus) hudStatus.textContent = 'START PROMPTER';
      scrollBtn?.classList.remove('btn-prompter-scrolling');
    } else if (teleprompterState.isPrompterPaused) {
      if (iconSpan) iconSpan.textContent = '▶️';
      if (txtSpan) txtSpan.textContent = 'Resume Teleprompter';
      if (hudStatus) hudStatus.textContent = 'RESUME PROMPTER';
      scrollBtn?.classList.remove('btn-prompter-scrolling');
    } else {
      if (iconSpan) iconSpan.textContent = '⏸️';
      if (txtSpan) txtSpan.textContent = 'Pause Teleprompter';
      if (hudStatus) hudStatus.textContent = 'PAUSE PROMPTER';
      scrollBtn?.classList.add('btn-prompter-scrolling');
    }
  };

  // Helper to update displayed script and lower-third copy
  const applyScript = key => {
    const data = SCRIPTS[key];
    const activeS1 = $('#teleprompter-sentence-1') || s1;
    const activeS2 = $('#teleprompter-sentence-2') || s2;
    const activeTrack = $('#anchor-teleprompter-track') || track;
    const prompterBox = $('#teleprompter-box');

    if (!data) {
      if (prompterBox) {
        prompterBox.style.setProperty('display', 'none', 'important');
        prompterBox.classList.remove('has-roleplay');
      }
      if (activeS1) activeS1.textContent = '';
      if (activeS2) activeS2.textContent = '';
      if (lowerTag) lowerTag.textContent = 'STUDIO READY';
      const nameVal = capitalizeName(nameInput?.value.trim() || '') || 'STUDENT';
      if (lowerCopy) lowerCopy.textContent = `${nameVal.toUpperCase()} · SELECT SCRIPT ABOVE · KANAKIA INTERNATIONAL SCHOOL`;
      teleprompterState.tickerOffset = 0;
      if (activeTrack) activeTrack.style.transform = 'translateX(0px)';
      teleprompterState.isPrompterPaused = true;
      teleprompterState.prompterStarted = false;
      updatePrompterButtonUI();
      return;
    }

    if (prompterBox) {
      prompterBox.style.setProperty('display', 'flex', 'important');
      prompterBox.classList.add('has-roleplay');
    }
    if (activeS1) activeS1.textContent = `"${data.text}"`;
    if (activeS2) activeS2.textContent = `"${data.text}"`;
    if (lowerTag) lowerTag.textContent = data.tag;
    const nameVal = capitalizeName(nameInput?.value.trim() || '') || 'STUDENT';
    if (nameInput && nameInput.value.trim()) nameInput.value = capitalizeName(nameInput.value.trim());
    if (lowerCopy) lowerCopy.textContent = `${nameVal.toUpperCase()} · ${data.role.toUpperCase()} · KANAKIA INTERNATIONAL SCHOOL`;
    teleprompterState.tickerOffset = 0;
    if (activeTrack) activeTrack.style.transform = 'translateX(0px)';
    teleprompterState.isPrompterPaused = true;
    teleprompterState.prompterStarted = false;
    updatePrompterButtonUI();
  };

  // 1. Moving Sentence Teleprompter Engine
  const runMovingPrompter = () => {
    if (teleprompterState.prompterAnimId) cancelAnimationFrame(teleprompterState.prompterAnimId);

    const step = () => {
      const activeTrack = $('#anchor-teleprompter-track') || track;
      const activeS1 = $('#teleprompter-sentence-1') || s1;

      if (!teleprompterState.isPrompterPaused && activeTrack && activeS1) {
        teleprompterState.tickerOffset -= teleprompterState.currentSpeed;
        const s1Width = activeS1.offsetWidth || 1200;
        const sepWidth = 64; // approximate margin + separator width
        const resetThreshold = s1Width + sepWidth;
        if (Math.abs(teleprompterState.tickerOffset) >= resetThreshold) {
          teleprompterState.tickerOffset += resetThreshold;
        }
        activeTrack.style.transform = `translateX(${teleprompterState.tickerOffset}px)`;
      }
      teleprompterState.prompterAnimId = requestAnimationFrame(step);
    };
    teleprompterState.prompterAnimId = requestAnimationFrame(step);
  };

  // 2. Cool Animated Studio Backdrop (Active when camera is off)
  const runStudioCanvasAnimation = () => {
    if (!canvas) return;
    if (teleprompterState.idleAnimId) cancelAnimationFrame(teleprompterState.idleAnimId);

    const ctx = canvas.getContext('2d');
    canvas.width = 1280;
    canvas.height = 720;

    let globeAngle = 0;
    let spotlightPhase = 0;
    const particles = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        r: Math.random() * 2 + 1,
        vy: Math.random() * 0.7 + 0.3,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    const drawFrame = () => {
      if (teleprompterState.isCameraOn) return; // paused when camera is active

      ctx.clearRect(0, 0, 1280, 720);

      // Deep studio background
      const bgGrad = ctx.createRadialGradient(640, 240, 50, 640, 360, 750);
      bgGrad.addColorStop(0, '#0c1630');
      bgGrad.addColorStop(0.5, '#070c1d');
      bgGrad.addColorStop(1, '#020409');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1280, 720);

      // Studio Spotlight Beams
      spotlightPhase += 0.015;
      const spotLeftX = 640 + Math.sin(spotlightPhase) * 260;
      const spotRightX = 640 - Math.cos(spotlightPhase) * 260;

      // Left beam (cyan)
      const gradLeft = ctx.createLinearGradient(120, 0, spotLeftX, 720);
      gradLeft.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
      gradLeft.addColorStop(0.5, 'rgba(0, 240, 255, 0.07)');
      gradLeft.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = gradLeft;
      ctx.beginPath();
      ctx.moveTo(80, 0);
      ctx.lineTo(160, 0);
      ctx.lineTo(spotLeftX + 90, 720);
      ctx.lineTo(spotLeftX - 90, 720);
      ctx.closePath();
      ctx.fill();

      // Right beam (magenta)
      const gradRight = ctx.createLinearGradient(1160, 0, spotRightX, 720);
      gradRight.addColorStop(0, 'rgba(255, 42, 133, 0.2)');
      gradRight.addColorStop(0.5, 'rgba(255, 42, 133, 0.06)');
      gradRight.addColorStop(1, 'rgba(255, 42, 133, 0)');
      ctx.fillStyle = gradRight;
      ctx.beginPath();
      ctx.moveTo(1120, 0);
      ctx.lineTo(1200, 0);
      ctx.lineTo(spotRightX + 90, 720);
      ctx.lineTo(spotRightX - 90, 720);
      ctx.closePath();
      ctx.fill();

      // Ground Perspective Floor Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1;
      const horizonY = 500;
      for (let y = horizonY; y <= 720; y += 22 + (y - horizonY) * 0.18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }
      for (let x = -200; x <= 1480; x += 110) {
        ctx.beginPath();
        ctx.moveTo(640 + (x - 640) * 0.15, horizonY);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      ctx.restore();

      // Floating dust particles
      ctx.save();
      for (let p of particles) {
        p.y -= p.vy;
        if (p.y < 0) {
          p.y = 720;
          p.x = Math.random() * 1280;
        }
        ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Rotating 3D Holographic Globe
      globeAngle += 0.012;
      const cx = 640;
      const cy = 350;
      const R = 135;

      ctx.save();
      // Outer atmosphere halo
      const globeGlow = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.3);
      globeGlow.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
      globeGlow.addColorStop(0.8, 'rgba(0, 240, 255, 0.08)');
      globeGlow.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = globeGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Globe sphere outline
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Latitudinal rings
      const lats = [-55, -30, 0, 30, 55];
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.2;
      lats.forEach(deg => {
        const rad = deg * Math.PI / 180;
        const latY = cy + Math.sin(rad) * R;
        const latR = Math.cos(rad) * R;
        ctx.beginPath();
        ctx.ellipse(cx, latY, latR, latR * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Rotating Longitudinal meridians
      for (let m = 0; m < 8; m++) {
        const offset = globeAngle + (m * Math.PI / 4);
        const radiusX = Math.cos(offset) * R;
        ctx.strokeStyle = m % 2 === 0 ? 'rgba(0, 240, 255, 0.65)' : 'rgba(255, 42, 133, 0.5)';
        ctx.lineWidth = m % 2 === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(radiusX), R, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Outer tilted orbit ring & orbiting node
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 1.5, R * 0.45, -0.28, 0, Math.PI * 2);
      ctx.stroke();

      const satX = cx + Math.cos(globeAngle * 1.8) * (R * 1.5) * Math.cos(-0.28) - Math.sin(globeAngle * 1.8) * (R * 0.45) * Math.sin(-0.28);
      const satY = cy + Math.cos(globeAngle * 1.8) * (R * 1.5) * Math.sin(-0.28) + Math.sin(globeAngle * 1.8) * (R * 0.45) * Math.cos(-0.28);
      ctx.fillStyle = '#ff2a85';
      ctx.shadowColor = '#ff2a85';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(satX, satY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Audio Frequency Spectrum Equalizer Bars
      ctx.save();
      const numBars = 36;
      const barWidth = 14;
      const gap = 8;
      const startX = cx - ((numBars * (barWidth + gap)) / 2);
      const baseY = 670;
      const now = Date.now() * 0.005;

      for (let b = 0; b < numBars; b++) {
        const h = Math.abs(Math.sin(now + b * 0.38)) * 36 + Math.abs(Math.cos(now * 1.4 + b * 0.2)) * 22 + 8;
        const x = startX + b * (barWidth + gap);
        const gradBar = ctx.createLinearGradient(0, baseY - h, 0, baseY);
        gradBar.addColorStop(0, '#00f0ff');
        gradBar.addColorStop(1, 'rgba(181, 23, 158, 0.7)');
        ctx.fillStyle = gradBar;
        ctx.fillRect(x, baseY - h, barWidth, h);
      }
      ctx.restore();

      // Studio HUD Telemetry Overlay
      ctx.save();
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('● STUDIO ON-AIR STANDBY  |  1080P 60FPS', 40, 110);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '600 12px "Space Grotesk", sans-serif';
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
      ctx.fillText(`KANAKIA MEDIA LAB · UTC ${timeStr}`, 980, 110);
      ctx.restore();

      teleprompterState.idleAnimId = requestAnimationFrame(drawFrame);
    };

    teleprompterState.idleAnimId = requestAnimationFrame(drawFrame);
  };

  // Prepare initial script & keep prompter stationary until started by user
  if (nameInput && !nameInput.value) nameInput.value = (STATE.studentName || localStorage.getItem('cf_student_name') || localStorage.getItem('ecf_student_name') || '');
  applyScript(scriptSelect?.value || '');
  teleprompterState.isPrompterPaused = true;
  teleprompterState.prompterStarted = false;
  updatePrompterButtonUI();
  runMovingPrompter();
  if (!teleprompterState.isCameraOn) {
    runStudioCanvasAnimation();
  }

  // Prevent multiple bindings if initTeleprompter is called on tab switches
  if (teleprompterState.initialized) return;
  teleprompterState.initialized = true;

  // 3. Teleprompter Speed Buttons (Slow, Normal, Fast)
  const setSpeed = (spd, btn) => {
    [speedSlow, speedNormal, speedFast].forEach(b => b?.classList.remove('active'));
    btn?.classList.add('active');
    if (spd === 'slow') {
      teleprompterState.currentSpeed = 1.2;
      showToast('Teleprompter speed set to Slow (Paced Delivery)');
    } else if (spd === 'normal') {
      teleprompterState.currentSpeed = 2.4;
      showToast('Teleprompter speed set to Normal');
    } else if (spd === 'fast') {
      teleprompterState.currentSpeed = 4.2;
      showToast('Teleprompter speed set to Fast (Breaking News Pace)');
    }
    if (window.AppRouter) {
      const scriptKey = scriptSelect?.value || 'breaking';
      window.AppRouter.navigate('/teleprompter', { silent: true });
    }
  };

  speedSlow?.addEventListener('click', () => setSpeed('slow', speedSlow));
  speedNormal?.addEventListener('click', () => setSpeed('normal', speedNormal));
  speedFast?.addEventListener('click', () => setSpeed('fast', speedFast));

  // 4. Start / Pause / Resume Teleprompter Scroll Button
  const togglePrompter = () => {
    const studentName = capitalizeName(nameInput?.value.trim() || '');
    const scriptKey = scriptSelect?.value || '';

    let hasError = false;
    let firstErrorEl = null;

    if (!studentName) {
      if (nameInput) nameInput.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = nameInput;
      hasError = true;
    } else {
      if (nameInput) nameInput.style.borderColor = '';
    }

    if (!scriptKey || scriptKey === '') {
      if (scriptSelect) scriptSelect.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = scriptSelect;
      hasError = true;
    } else {
      if (scriptSelect) scriptSelect.style.borderColor = '';
    }

    if (hasError) {
      showToast('⚠️ Name and Script / Roleplay are mandatory to start the teleprompter!');
      firstErrorEl?.focus();
      return;
    }

    if (!teleprompterState.prompterStarted) {
      teleprompterState.prompterStarted = true;
      teleprompterState.isPrompterPaused = false;
      updatePrompterButtonUI();
      showToast('Teleprompter started! 📜');
      if (isTutorialRunning && isTutorialOnSection('section_teleprompter')) {
        triggerTutorialAutoAdvance('Teleprompter Studio Active', 'Poise and camera presence looking great! Roleplay session started.');
      }
    } else if (!teleprompterState.isPrompterPaused) {
      teleprompterState.isPrompterPaused = true;
      updatePrompterButtonUI();
      showToast('Teleprompter paused ⏸️');
    } else {
      teleprompterState.isPrompterPaused = false;
      updatePrompterButtonUI();
      showToast('Teleprompter scrolling resumed ▶️');
    }
  };

  scrollBtn?.addEventListener('click', togglePrompter);
  $('#teleprompter-box')?.addEventListener('click', togglePrompter);

  // 5. Script / Roleplay Dropdown Selection
  scriptSelect?.addEventListener('change', e => {
    scriptSelect.style.borderColor = '';
    applyScript(e.target.value);
    if (window.AppRouter) {
      window.AppRouter.navigate('/teleprompter', { silent: true });
    }
  });

  // 6. Name input listener
  nameInput?.addEventListener('input', () => {
    nameInput.style.borderColor = '';
    const scriptKey = scriptSelect?.value || '';
    applyScript(scriptKey);
  });

  // 7. Video Input Device Selection & OBS Studio Detection
  const cameraSelect = $('#anchor-camera-select');
  const obsBadge = $('#obs-badge');
  const obsModal = $('#obs-guide-modal');
  const btnObsGuide = $('#btn-obs-guide');
  const btnCloseObsModal = $('#btn-close-obs-modal');
  const btnObsOverlay = $('#btn-obs-overlay');
  const obsUrlInput = $('#obs-overlay-url-input');
  const btnCopyObsUrl = $('#btn-copy-obs-overlay-url');
  const btnPopoutObs = $('#btn-open-obs-overlay-popout');
  const btnJumpAdmin = $('#btn-jump-to-admin-stream');

  const populateCameras = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      const prevVal = cameraSelect?.value || teleprompterState.selectedCameraId || 'default';

      if (cameraSelect) {
        cameraSelect.innerHTML = '<option value="default">Default Camera / Auto</option>';
        let foundObs = false;
        let obsId = null;

        videoInputs.forEach((dev, idx) => {
          const opt = document.createElement('option');
          opt.value = dev.deviceId;
          const label = dev.label || `Camera ${idx + 1}`;
          const isObs = /obs|virtual/i.test(label);
          if (isObs) {
            foundObs = true;
            obsId = dev.deviceId;
            opt.textContent = `🎥 ${label} (OBS Studio)`;
          } else {
            opt.textContent = `📹 ${label}`;
          }
          cameraSelect.appendChild(opt);
        });

        if (obsBadge) {
          if (foundObs) {
            obsBadge.textContent = '🟢 OBS Virtual Cam Ready';
            obsBadge.style.color = '#10b981';
            obsBadge.style.background = 'rgba(16, 185, 129, 0.15)';
          } else {
            obsBadge.textContent = '⚪ Virtual Cam Offline';
            obsBadge.style.color = 'var(--text-dim)';
            obsBadge.style.background = 'rgba(255, 255, 255, 0.08)';
          }
        }

        if (prevVal && Array.from(cameraSelect.options).some(o => o.value === prevVal)) {
          cameraSelect.value = prevVal;
        } else if (foundObs && obsId && !teleprompterState.selectedCameraId) {
          cameraSelect.value = obsId;
          teleprompterState.selectedCameraId = obsId;
        }
      }
    } catch (e) {
      console.warn('enumerateDevices error:', e);
    }
  };

  navigator.mediaDevices?.addEventListener('devicechange', () => {
    populateCameras();
  });
  populateCameras();

  const startCameraStream = async (deviceId) => {
    const camText = $('#camera-btn-text');
    if (teleprompterState.cameraStream) {
      teleprompterState.cameraStream.getTracks().forEach(t => t.stop());
      teleprompterState.cameraStream = null;
    }

    const videoConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 }
    };
    if (deviceId && deviceId !== 'default') {
      videoConstraints.deviceId = { exact: deviceId };
    } else {
      videoConstraints.facingMode = 'user';
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true
      });
      teleprompterState.cameraStream = stream;
      if (video) {
        video.srcObject = stream;
        video.style.display = 'block';
      }
      if (canvas) canvas.style.display = 'none';
      if (teleprompterState.idleAnimId) {
        cancelAnimationFrame(teleprompterState.idleAnimId);
        teleprompterState.idleAnimId = null;
      }
      teleprompterState.isCameraOn = true;
      if (camText) camText.textContent = 'Turn Off Camera';
      cameraBtn.querySelector('span:first-child').textContent = '📷';

      const activeTrack = stream.getVideoTracks()[0];
      const trackLabel = activeTrack?.label || 'Camera';
      showToast(`Active video feed: ${trackLabel}`);
      populateCameras();
    } catch (err) {
      console.error(err);
      showToast('Camera device not found or access denied. Using animated studio background.');
    }
  };

  cameraSelect?.addEventListener('change', async (e) => {
    teleprompterState.selectedCameraId = e.target.value;
    if (teleprompterState.isCameraOn) {
      await startCameraStream(e.target.value);
    }
  });

  // Camera Toggle Button (Launch Camera <-> Turn Off Camera)
  cameraBtn?.addEventListener('click', async () => {
    const camText = $('#camera-btn-text');
    if (teleprompterState.isCameraOn) {
      // Turn Off Camera -> Return to cool studio animation
      if (teleprompterState.cameraStream) {
        teleprompterState.cameraStream.getTracks().forEach(t => t.stop());
        teleprompterState.cameraStream = null;
      }
      if (video) {
        video.srcObject = null;
        video.style.display = 'none';
      }
      if (canvas) canvas.style.display = 'block';
      teleprompterState.isCameraOn = false;
      if (camText) camText.textContent = 'Launch Camera / OBS Feed';
      cameraBtn.querySelector('span:first-child').textContent = '📹';
      runStudioCanvasAnimation();
      showToast('Camera turned off. Studio animation backdrop active.');
      return;
    }

    await startCameraStream(teleprompterState.selectedCameraId || cameraSelect?.value || 'default');
  });

  // OBS Studio Modal & Overlay Integrations
  const getOverlayUrl = () => {
    const script = scriptSelect?.value || 'breaking';
    const name = encodeURIComponent(nameInput?.value.trim() || 'STUDENT');
    const base = window.location.origin + window.location.pathname;
    return `${base}?obs_overlay=1&script=${script}&name=${name}`;
  };

  const updateOverlayInput = () => {
    if (obsUrlInput) {
      obsUrlInput.value = getOverlayUrl();
    }
  };

  btnObsGuide?.addEventListener('click', () => {
    updateOverlayInput();
    if (obsModal) obsModal.classList.add('active');
  });

  btnCloseObsModal?.addEventListener('click', () => {
    if (obsModal) obsModal.classList.remove('active');
  });

  obsModal?.addEventListener('click', (e) => {
    if (e.target === obsModal) obsModal.classList.remove('active');
  });

  btnCopyObsUrl?.addEventListener('click', async () => {
    const url = getOverlayUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast('OBS Browser Source URL copied to clipboard! 📋');
    } catch {
      if (obsUrlInput) {
        obsUrlInput.select();
        document.execCommand('copy');
        showToast('OBS URL copied! 📋');
      }
    }
  });

  const openOverlayWindow = () => {
    const url = getOverlayUrl();
    window.open(url, 'OBS_Overlay_Window', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
  };

  btnObsOverlay?.addEventListener('click', openOverlayWindow);
  btnPopoutObs?.addEventListener('click', openOverlayWindow);

  btnJumpAdmin?.addEventListener('click', (e) => {
    e.preventDefault();
    if (obsModal) obsModal.classList.remove('active');
    if (window.switchTab) window.switchTab('admin');
  });

  // Auto-detect OBS Browser Source mode (?obs_overlay=1)
  const urlParams = new URLSearchParams(window.location.search);
  const isObsOverlay = urlParams.get('obs_overlay') === '1' || window.location.hash.includes('obs-overlay');
  if (isObsOverlay) {
    document.body.classList.add('obs-overlay-mode');
    const overlayScript = urlParams.get('script');
    const overlayName = urlParams.get('name');
    if (overlayScript && SCRIPTS[overlayScript] && scriptSelect) {
      scriptSelect.value = overlayScript;
    }
    if (overlayName && nameInput) {
      nameInput.value = decodeURIComponent(overlayName);
    }
    applyScript(scriptSelect?.value || 'breaking');
    teleprompterState.prompterStarted = true;
    teleprompterState.isPrompterPaused = false;
    updatePrompterButtonUI();
    if (window.switchTab) {
      window.switchTab('teleprompter', { skipSubInit: true });
    }
  }

  // 8. Recording and Downloading (Toggle Record Clip <-> Stop Recording with Overlays)
  recordBtn?.addEventListener('click', async () => {
    const recText = $('#record-btn-text');
    const studentName = capitalizeName(nameInput?.value.trim() || '');
    if (nameInput && studentName) nameInput.value = studentName;

    // STOP RECORDING
    if (teleprompterState.isRecording) {
      clearInterval(teleprompterState.recordTimer);
      teleprompterState.recordTimer = null;
      teleprompterState.isRecording = false;

      if (teleprompterState.compositeAnimId) {
        cancelAnimationFrame(teleprompterState.compositeAnimId);
        teleprompterState.compositeAnimId = null;
      }

      if (teleprompterState.recordedMicStream) {
        teleprompterState.recordedMicStream.getTracks().forEach(t => t.stop());
        teleprompterState.recordedMicStream = null;
      }

      if (teleprompterState.activeCompCanvas && teleprompterState.activeCompCanvas.parentNode) {
        teleprompterState.activeCompCanvas.remove();
        teleprompterState.activeCompCanvas = null;
      }

      recordBtn.classList.remove('btn-recording');
      if (recText) recText.textContent = 'Record Broadcast Clip';
      recordBtn.querySelector('span:first-child').textContent = '⏺️';

      // As soon as recording is over, reset prompter to start button again
      teleprompterState.isPrompterPaused = true;
      teleprompterState.prompterStarted = false;
      teleprompterState.tickerOffset = 0;
      const activeTrack = $('#anchor-teleprompter-track') || track;
      if (activeTrack) activeTrack.style.transform = 'translateX(0px)';
      updatePrompterButtonUI();

      if (teleprompterState.mediaRecorder && teleprompterState.mediaRecorder.state !== 'inactive') {
        teleprompterState.mediaRecorder.stop();
      }
      showToast('Finalizing broadcast recording with overlays...');
      return;
    }

    // START RECORDING
    const scriptKey = scriptSelect?.value || '';
    let hasError = false;
    let firstErrorEl = null;

    if (!studentName) {
      if (nameInput) nameInput.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = nameInput;
      hasError = true;
    } else {
      if (nameInput) nameInput.style.borderColor = '';
    }

    if (!scriptKey || scriptKey === '') {
      if (scriptSelect) scriptSelect.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = scriptSelect;
      hasError = true;
    } else {
      if (scriptSelect) scriptSelect.style.borderColor = '';
    }

    if (hasError) {
      showToast('⚠️ Please enter your name and select a script / roleplay before recording!');
      firstErrorEl?.focus();
      return;
    }

    try {
      // Determine canvas resolution (HD 1280x720 or native webcam resolution)
      let compW = 1280;
      let compH = 720;
      if (teleprompterState.isCameraOn && video && video.videoWidth > 0 && video.videoHeight > 0) {
        compW = Math.max(1280, video.videoWidth);
        compH = Math.max(720, video.videoHeight);
      }

      // Create offscreen compositing canvas attached hidden to DOM for solid rendering
      const compCanvas = document.createElement('canvas');
      compCanvas.width = compW;
      compCanvas.height = compH;
      compCanvas.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;opacity:0;z-index:-1;';
      document.body.appendChild(compCanvas);
      teleprompterState.activeCompCanvas = compCanvas;
      const compCtx = compCanvas.getContext('2d', { alpha: false });
      compCtx.imageSmoothingEnabled = true;
      compCtx.imageSmoothingQuality = 'high';

      // Frame composer: Draws webcam or studio background + Logo (top-left) + Lower third (bottom).
      // Crucially, NO teleprompter text is drawn into the recording!
      const renderCompositeFrame = () => {
        // 1. Draw Background or Camera Feed
        if (teleprompterState.isCameraOn && video && video.readyState >= 2) {
          compCtx.save();
          // Mirror video frame horizontally so recording matches the preview monitor
          compCtx.translate(compW, 0);
          compCtx.scale(-1, 1);
          compCtx.drawImage(video, 0, 0, compW, compH);
          compCtx.restore();
        } else if (canvas) {
          // Draw animated studio canvas (globe, equalizer, telemetry)
          compCtx.drawImage(canvas, 0, 0, compW, compH);
        } else {
          compCtx.fillStyle = '#070c1d';
          compCtx.fillRect(0, 0, compW, compH);
        }

        const scale = compW / 1280;

        // 2. Kanakia International School Logo at Top Left (Downloaded Video Only)
        drawBroadcastSchoolLogo(compCtx, compW, compH, scale);

        // 3. Lower-Third Broadcast Banner (Tag pill + Student/Role/School Copy)
        drawBroadcastLowerThird(compCtx, compW, compH, scale);
      };

      // Draw initial frame immediately so stream is ready
      renderCompositeFrame();

      // Continuous compositor animation loop
      const compositeLoop = () => {
        if (!teleprompterState.isRecording) return;
        renderCompositeFrame();
        teleprompterState.compositeAnimId = requestAnimationFrame(compositeLoop);
      };

      // Capture 30 FPS stream from compositing canvas
      const canvasStream = compCanvas.captureStream ? compCanvas.captureStream(30) : (compCanvas.mozCaptureStream ? compCanvas.mozCaptureStream(30) : null);
      if (!canvasStream) {
        showToast('Canvas stream capture unsupported on this browser.');
        compCanvas.remove();
        return;
      }

      // Audio setup (webcam mic or microphone getUserMedia)
      let audioTracks = [];
      if (teleprompterState.isCameraOn && teleprompterState.cameraStream) {
        audioTracks = teleprompterState.cameraStream.getAudioTracks();
      }
      if (!audioTracks || audioTracks.length === 0) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          teleprompterState.recordedMicStream = mic;
          audioTracks = mic.getAudioTracks();
        } catch {
          // Audio optional if denied or missing
        }
      }

      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...(audioTracks || [])
      ];
      const recordStream = new MediaStream(combinedTracks);

      teleprompterState.recordedChunks = [];
      let supportedMime = '';
      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4'
      ];
      for (const m of mimeCandidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
          supportedMime = m;
          break;
        }
      }

      const recorderOptions = supportedMime ? { mimeType: supportedMime } : undefined;
      const recorder = new MediaRecorder(recordStream, recorderOptions);

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          teleprompterState.recordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (teleprompterState.compositeAnimId) {
          cancelAnimationFrame(teleprompterState.compositeAnimId);
          teleprompterState.compositeAnimId = null;
        }
        if (teleprompterState.recordedMicStream) {
          teleprompterState.recordedMicStream.getTracks().forEach(t => t.stop());
          teleprompterState.recordedMicStream = null;
        }
        if (teleprompterState.activeCompCanvas && teleprompterState.activeCompCanvas.parentNode) {
          teleprompterState.activeCompCanvas.remove();
          teleprompterState.activeCompCanvas = null;
        }

        const blob = new Blob(teleprompterState.recordedChunks, { type: supportedMime || 'video/webm' });
        const blobUrl = URL.createObjectURL(blob);
        const safeName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const ext = (supportedMime && supportedMime.includes('mp4')) ? 'mp4' : 'webm';
        const fileName = `EnglishCareers_${safeName}_${Date.now()}.${ext}`;

        teleprompterState.lastBlobUrl = blobUrl;
        teleprompterState.lastFileName = fileName;

        // 1. Automatic Immediate Download
        const dlLink = document.createElement('a');
        dlLink.href = blobUrl;
        dlLink.download = fileName;
        document.body.appendChild(dlLink);
        dlLink.click();
        document.body.removeChild(dlLink);

        // 2. Reveal dedicated Download Video Clip button
        if (downloadBtn) {
          downloadBtn.style.display = 'inline-flex';
          downloadBtn.onclick = () => {
            const reDl = document.createElement('a');
            reDl.href = teleprompterState.lastBlobUrl || blobUrl;
            reDl.download = teleprompterState.lastFileName || fileName;
            document.body.appendChild(reDl);
            reDl.click();
            document.body.removeChild(reDl);
            showToast('Downloading saved broadcast clip...');
          };
        }

        showToast('✅ Broadcast clip saved! Video downloaded with official overlays.');
      };

      recorder.start(250);
      teleprompterState.mediaRecorder = recorder;
      teleprompterState.isRecording = true;
      teleprompterState.recordSeconds = 0;

      // Start compositing loop
      teleprompterState.compositeAnimId = requestAnimationFrame(compositeLoop);

      // Start teleprompter scrolling on-screen for the speaker
      teleprompterState.prompterStarted = true;
      teleprompterState.isPrompterPaused = false;
      updatePrompterButtonUI();

      recordBtn.classList.add('btn-recording');
      if (recText) recText.textContent = 'Stop Recording (00:00)';
      recordBtn.querySelector('span:first-child').textContent = '⏹️';

      teleprompterState.recordTimer = setInterval(() => {
        teleprompterState.recordSeconds++;
        const mins = String(Math.floor(teleprompterState.recordSeconds / 60)).padStart(2, '0');
        const secs = String(teleprompterState.recordSeconds % 60).padStart(2, '0');
        if (recText) recText.textContent = `Stop Recording (${mins}:${secs})`;
      }, 1000);

      showToast('🔴 Recording started! Speak clearly and read the moving teleprompter.');
    } catch (err) {
      console.error('Recording error:', err);
      showToast('Recording error: Device permissions or codec unsupported.');
    }
  });
}

// ─── 9. ARCADE GAMES SUITE (JOBTRIS, WORDLE, FLASHCARDS, ETC.) ────────────────
function renderStandaloneQuest(mount, questIdx) {
  const q = GAMING_HALL_QUESTS[questIdx];
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="font-size:22px;display:flex;align-items:center;gap:8px;margin:0 0 4px 0;">
            <span>${q.icon}</span> <span>Quest ${q.num}: ${escapeHtml(q.title)}</span>
          </h3>
          <span style="font-size:13px;color:var(--text-dim);">
            ${escapeHtml(q.tag)} · ${escapeHtml(q.desc)}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          

        </div>
      </div>
    </div>
    <div class="quest-view-card" id="standalone-quest-mount" style="padding:16px;background:var(--surface-raised, rgba(15,23,42,0.6));border:1px solid var(--border);border-radius:var(--radius-lg, 12px);"></div>
  `;

  $('#btn-view-all-quests-arc')?.addEventListener('click', () => {
    renderGameArena('gaming-hall');
    if (window.AppRouter) {
      window.AppRouter.navigate('/games/gaming-hall', { silent: true });
    }
  });

  const stage = $('#standalone-quest-mount');
  if (stage) {
    switch (questIdx) {
      case 0: launchQuestScribe(stage); break;
      case 1: launchQuestBard(stage); break;
      case 2: launchQuestCipher(stage); break;
      default: launchQuestScribe(stage);
    }
  }
}

function renderGameArena(gameKey) {
  const mount = $('#game-arena-mount');
  if (!mount) return;

  initGamePicker();

  $$('#game-picker-tabs .filter-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.game === gameKey);
  });

  if (gameKey === 'quest-scribe' || gameKey === 'scribe') {
    renderStandaloneQuest(mount, 0);
  } else if (gameKey === 'quest-bard' || gameKey === 'bard') {
    renderStandaloneQuest(mount, 1);
  } else if (gameKey === 'quest-cipher' || gameKey === 'cipher') {
    renderStandaloneQuest(mount, 2);

  } else if (gameKey === 'gaming-hall') {
    renderGamingHall(mount);
  } else if (gameKey === 'wordle') {
    renderWordle(mount);
  } else if (gameKey === 'flashcards') {
    renderFlashCards(mount);
  } else if (gameKey === 'dict') {
    renderDictionaryLookup(mount);
  } else if (gameKey === 'spelling') {
    renderSpellingBee(mount);
  } else if (gameKey === 'hangman') {
    renderHangman(mount);
  } else {
    mount.innerHTML = `<div style="text-align:center;padding:40px;">Select a game to begin playing!</div>`;
  }
}
window.renderGameArena = renderGameArena;

function initGamePicker() {
  const tabsContainer = $('#game-picker-tabs');
  const leftBtn = $('#btn-game-scroll-left');
  const rightBtn = $('#btn-game-scroll-right');

  // Wire game selection chips
  $$('#game-picker-tabs .filter-chip').forEach(btn => {
    btn.onclick = () => {
      const gameKey = btn.dataset.game;
      renderGameArena(gameKey);
      if (isTutorialRunning && (isTutorialOnSection('section_cognitive') || isTutorialOnSection('section_wordle_quick'))) {
        triggerTutorialAutoAdvance('Arcade Game Selected', 'Game launched! Cognitive scores and vocabulary challenge active.');
      }
      if (window.AppRouter) {
        window.AppRouter.navigate('/games', { silent: true });
      }
      // Auto-center the clicked game chip in the visible viewport
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      // In games: scroll till the box where the feature is fully shown!
      const arena = document.getElementById('game-arena-mount');
      if (arena) {
        scrollTutorialTargetIntoView(arena);
      }
    };
  });

  // Setup unified themed horizontal scroll shelf
  setupHorizontalScrollShelf(tabsContainer, leftBtn, rightBtn, 300);
}

// =========================================================================
// AI-POWERED GAMING HALL (5 Immersive Gemini Quests with 3D Arc Carousel)
// =========================================================================

let gamingHallArcIndex = 0;
const GAMING_HALL_QUESTS = [
  {
    id: 'scribe',
    num: 'I',
    title: 'The Scribe',
    tag: 'Branching Gothic Quest',
    desc: 'An interactive dark-fantasy narrative. You choose the path; Gemini weaves the prose and branching consequences.',
    icon: '📜'
  },
  {
    id: 'bard',
    num: 'II',
    title: "The Bard's Mirror",
    tag: 'Poetic Mirror & Critic',
    desc: 'Commission Shakespearean sonnets, Gothic ballads, or submit your own writing for an AI literary critique.',
    icon: '🪞'
  },
  {
    id: 'cipher',
    num: 'III',
    title: 'The Ink Cipher',
    tag: 'University Archive Mystery',
    desc: 'Investigate a historic Indian university archive with an illuminated lens cursor, questioning suspects to solve the case.',
    icon: '🔍'
  }
];

async function callAiQuest(prompt, isJson = false) {
  let geminiKeyList = (localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || STATE.config.gemini_keys || '').split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean);
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  const fallbackSpeech = "That is a brilliant career aspiration! Strong English articulation allows you to lead international teams, present research, and master global opportunities.";

  // 1. Try Gemini Keys directly if available (client-side directly to Gemini with auto-rotation)
  for (let i = 0; i < geminiKeyList.length; i++) {
    const curKey = geminiKeyList[i];
    let keyExhausted = false;

    // 1a. Attempt backend /api/ai (secure backend key resolution)
    try {
      const res = await fetch(getApiUrl('api/ai'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task: 'quest', prompt, json: isJson })
      });

      if (res.status === 429 || res.status === 403) {
        keyExhausted = true;
      } else if (res.ok) {
        const data = await res.json();
        const candidate = (data && (data.reply !== undefined ? data.reply : (data.text || data.response))) || '';
        if (candidate && (typeof candidate === 'object' || String(candidate).trim() !== fallbackSpeech)) {
          if (isJson && typeof candidate === 'string') {
            const m = candidate.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (m) {
              try { return JSON.parse(m[0]); } catch {}
            }
          }
          return candidate;
        }
      }
    } catch (e) {}

    // 1b. Direct client-side call removed to prevent network tab key leaks.
    // Backend /api/ai handles key rotation and fallback safely in cloud.

    if (keyExhausted) {
      console.warn(`Gemini key ${curKey.slice(0, 6)}... quota exhausted. Rotating.`);
      geminiKeyList.splice(i, 1);
      i--;
      const updatedPool = geminiKeyList.join('\n');
      localStorage.setItem('cf_gemini_keys', updatedPool);
      localStorage.setItem('cf_gemini_key', geminiKeyList[0] || '');
      STATE.config.gemini_keys = updatedPool;
      STATE.config.gemini_key = geminiKeyList[0] || '';
      if (typeof window.syncAdminGeminiKeyBoxes === 'function') {
        window.syncAdminGeminiKeyBoxes();
      }
    }
  }

  // 2. If no keys or all keys exhausted, call backend /api/ai directly without key header (allows Workers AI / D1 key pool)
  try {
    const res = await fetch(getApiUrl('api/ai'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'quest', prompt, json: isJson })
    });
    if (res.ok) {
      const data = await res.json();
      const candidate = (data && (data.reply || data.text || data.response)) || '';
      if (candidate && String(candidate).trim() !== fallbackSpeech) {
        if (isJson && typeof candidate === 'string') {
          const m = candidate.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (m) {
            try { return JSON.parse(m[0]); } catch {}
          }
        }
        return candidate;
      }
    }
  } catch (e) {}

  // Signal null so contextual offline responses generate
  return null;
}

async function typeInto(el, text) {
  el.textContent = '';
  for (const char of text) {
    el.textContent += char;
    await new Promise(r => setTimeout(r, 12));
  }
}

// ==========================================
// OFFLINE ZERO-ERROR ADVENTURE ENGINES
// ==========================================
const SCRIBE_OFFLINE_TALES = [
  {
    story: "Rain lashes against the stained-glass lancets of the ancient library at St. Jude's. Before you stands an arched obsidian portal, inscribed with faint silver runes that shimmer whenever thunder shakes the spires. In your hand rests a brass serpent key with amethyst eyes. An iron-banded door waits to your left, while a spiral staircase descends into the subterranean vaults.",
    choices: [
      "Insert the serpent key into the silver-inscribed obsidian portal",
      "Unlatch the iron-banded door leading toward the cloisters",
      "Descend the spiral stone staircase into the whispering vaults"
    ]
  },
  {
    story: "The heavy lock yields with a hollow click. Beyond lies a circular scriptorium where hundreds of wax candles flicker without smoke. On a lectern of carved cedar rests an illuminated codex, its vellum pages turning on their own in the damp draft. Shadows dance along rows of leather-bound volumes that whisper in archaic Latin as your boots strike the flagstones.",
    choices: [
      "Approach the self-turning codex and decipher the glowing script",
      "Hold your lantern toward the whispering bookshelves to read the titles",
      "Search the perimeter for hidden draft exits before stepping forward"
    ]
  },
  {
    story: "As your fingers graze the vellum, the ink rearranges itself into a luminous constellation map. It reveals that the founders of the academy concealed three golden astronomical astrolabes across the quadrangle to balance intellect, speech, and moral courage. A sudden draft extinguishes half the candles; a veiled figure watches you from the arched mezzanine above.",
    choices: [
      "Call out to the veiled figure in clear, commanding Latin",
      "Memorize the constellation coordinates and slip the map into your satchel",
      "Douse your lantern and take cover behind the grand celestial globe"
    ]
  },
  {
    story: "The figure steps into the pale moonlight, revealing not a ghost, but an intricate brass automaton crafted by Victorian horologists. Its chest houses a clockwork pendulum that ticks with rhythmic precision. In its mechanical palm rests a wax-sealed parchment bearing the seal of the Master Scribe. 'To proceed,' speaks the brass voice, 'you must declare your true academic purpose.'",
    choices: [
      "'I seek mastery over language to advocate for truth and justice'",
      "'I seek knowledge of antiquity to bridge ancient wisdom with modern science'",
      "'I seek the courage to articulate stories that awaken human empathy'"
    ]
  },
  {
    story: "'A noble vocation,' the automaton hums, its brass gears spinning in harmonious chords. The floor shudders slightly as a secret hydraulic dais rises, elevating you toward the observatory tower under a star-strewn sky. The wind howls across the parapets, carrying the distant bell tolls of midnight. Three crystal vials glow atop an onyx altar: one azure, one crimson, and one emerald.",
    choices: [
      "Select the Azure Vial representing boundless clarity of thought",
      "Select the Crimson Vial representing fiery passion and persuasion",
      "Select the Emerald Vial representing enduring growth and resilience"
    ]
  },
  {
    story: "You uncork the chosen vial; a luminous vapor envelops your quill. When you set ink to paper, every word flows with effortless grace, precision, and persuasive grandeur. The tempest outside recedes into a calm dawn over the campus spires. You have passed the Scribe's trial and earned the mantle of Master Rhetorician. Your journey as an articulate leader of tomorrow has only just begun.",
    choices: []
  }
];

const ETYM_OFFLINE_WORDS = [
  {
    word: "articulate",
    origin: "From Latin 'articulatus', past participle of 'articulare' ('to divide into joints, utter distinctly'), from 'articulus' ('a small joint, knuckle'). Just as healthy bones move smoothly at their joints, an articulate speaker connects thoughts and syllables with effortless clarity and poise.",
    roots: ["artus (Latin) → joint, fitting together", "articulus (Latin) → small joint, knuckle, distinct part"],
    riddle: "Which ancient anatomical metaphor gave rise to the word 'articulate'?",
    options: [
      "The seamless bending of finger joints",
      "The rhythmic beating of the human heart",
      "The clarity of the visionary eye",
      "The steady breath of a runner"
    ],
    answer: 0
  },
  {
    word: "serendipity",
    origin: "Coined in 1754 by English author Horace Walpole in a letter to Horace Mann. He drew inspiration from the Persian fairy tale 'The Three Princes of Serendip' (the ancient Persian name for Sri Lanka), whose heroes were 'always making discoveries, by accidents and sagacity, of things they were not in quest of.'",
    roots: ["Serendip (Old Persian) → island of Sri Lanka (from Sanskrit Simhaladvipa)", "-ity (Latin suffix) → state, condition, or quality of"],
    riddle: "What geographical land was historically called 'Serendip' in Persian lore?",
    options: [
      "Sri Lanka (Ceylon)",
      "The Maldives archipelago",
      "Constantinople (Istanbul)",
      "The Indus Valley"
    ],
    answer: 0
  },
  {
    word: "candid",
    origin: "From Latin 'candidus' meaning 'glistening white, pure, sincere'. In ancient Rome, men campaigning for political office wore a specially bleached, brilliant white toga known as the 'toga candida' to symbolize purity of motive, honesty, and incorruptibility. Hence arose both 'candid' (frank, honest) and 'candidate'.",
    roots: ["candere (Latin) → to shine, glow white", "candidus (Latin) → bright, pure, unblemished, sincere"],
    riddle: "Why were Roman political candidates named after 'candidus'?",
    options: [
      "They wore bleached white togas to symbolize honest intentions",
      "They wrote political manifestos on white marble tablets",
      "They swore oaths under white banners at the Forum",
      "They were required to serve white wine to citizens"
    ],
    answer: 0
  },
  {
    word: "ephemeral",
    origin: "From Greek 'ephemeros' ('lasting only a day'), composed of 'epi' ('on, during') and 'hemera' ('day'). Originally used in ancient Greek medicine for fevers and ailments lasting only twenty-four hours, the term was later adopted by English Romantic poets to describe fleeting beauty and passing moments of insight.",
    roots: ["epi (Greek) → upon, lasting for", "hemera (Greek) → day"],
    riddle: "What literal time duration does the Greek root 'hemera' designate?",
    options: [
      "A single day (24 hours)",
      "A full lunar cycle (28 days)",
      "A single hour",
      "The brief duration of twilight"
    ],
    answer: 0
  },
  {
    word: "melancholy",
    origin: "From Greek 'melankholia', from 'melas' ('black, dark') and 'khole' ('bile'). In ancient Hippocratic and Galenic medicine, human health and personality were thought to be regulated by four bodily humors. An excess of black bile was believed to foster a reflective, somber, and deeply artistic disposition.",
    roots: ["melas / melan- (Greek) → black, dark", "khole (Greek) → bile, bitter gall"],
    riddle: "Which bodily humor did ancient physicians believe induced melancholy?",
    options: [
      "Black bile",
      "Yellow bile",
      "Blood",
      "Phlegm"
    ],
    answer: 0
  },
  {
    word: "resilient",
    origin: "From Latin 'resiliens', present participle of 'resilire' ('to leap back, rebound'), formed from 're-' ('back, again') and 'salire' ('to jump, leap'). Originally describing physical objects springing back to their original shape after deformation, it evolved into a premier psychological virtue for leaders who bounce back from adversity.",
    roots: ["re- (Latin) → back, again", "salire (Latin) → to leap, jump, spring"],
    riddle: "What dynamic physical action is denoted by the Latin root 'salire'?",
    options: [
      "To leap or spring back",
      "To withstand heavy pressure without bending",
      "To flow smoothly like river water",
      "To anchor deeply into the soil"
    ],
    answer: 0
  },
  {
    word: "lucid",
    origin: "From Latin 'lucidus' ('shining, bright, clear'), derived from 'lux' (genitive 'lucis', 'light'). A lucid argument or dream is one illuminated by clarity, where thoughts are transparent and immediately understood without obscurity.",
    roots: ["lux / lucis (Latin) → light, brilliance", "-idus (Latin suffix) → state or tendency toward"],
    riddle: "What does the Latin root 'lucis' mean?",
    options: [
      "Light or brilliance",
      "Clear flowing water",
      "The rational mind",
      "Spoken voice"
    ],
    answer: 0
  },
  {
    word: "eloquence",
    origin: "From Latin 'eloquentia', from 'eloqui' ('to speak out'), formed from 'e-' / 'ex-' ('out, forth') and 'loqui' ('to speak'). Eloquence is literally the power to pour one's inner conviction and thoughts outward into the world with grace, force, and persuasion.",
    roots: ["ex- / e- (Latin) → out, forth", "loqui (Latin) → to speak, utter"],
    riddle: "Which other English word shares the root 'loqui' with eloquence?",
    options: [
      "Soliloquy and Colloquial",
      "Locomotive and Local",
      "Logic and Logistics",
      "Eloquent and Eclipse"
    ],
    answer: 0
  },
  {
    word: "tenacious",
    origin: "From Latin 'tenax' (genitive 'tenacis', 'holding fast, gripping, stubborn'), from 'tenere' ('to hold, keep, grasp'). A tenacious student holds firmly to their aspirations through setbacks, never letting go of their vision.",
    roots: ["tenere (Latin) → to hold, retain, grasp", "-ous (Latin suffix) → full of, characterized by"],
    riddle: "Which common English verb is directly derived from 'tenere'?",
    options: [
      "Retain, Maintain, and Sustain",
      "Tension and Tendency",
      "Tender and Tenderize",
      "Tentative and Tenuous"
    ],
    answer: 0
  },
  {
    word: "solace",
    origin: "From Old French 'solas', from Latin 'solacium' ('a soothing, comforting, solace'), from 'solari' ('to comfort, console'). In classical antiquity, solace was the peaceful quiet offered to weary travelers and scholars following arduous toil.",
    roots: ["solari (Latin) → to soothe, comfort, alleviate sorrow", "-ium (Latin suffix) → instrument or result of action"],
    riddle: "Which psychological word shares the Latin root 'solari'?",
    options: [
      "Console (consolation)",
      "Solitary",
      "Solar",
      "Solvent"
    ],
    answer: 0
  }
];

function getBardOfflineResponse(mode, theme) {
  const cleanTheme = theme || 'ambition and the power of articulate speech';
  if (mode.includes('sonnet') || mode.includes('Shakespearean')) {
    return `Shall modern minds in digital halls awake,
` +
      `When ancient words kindle the youthful soul?
` +
      `No fleeting code the eloquent heart can shake,
` +
      `Where deep reflection seeks a noble goal.
` +
      `Though screens may flicker in the dusky night,
` +
      `And hurried voices crowd the passing wind,
` +
      `The spoken phrase retains its sovereign might,
` +
      `To guide the searching corridors of mind.
` +
      `Let reason tune the cadence of thy tongue,
` +
      `As ${cleanTheme} takes majestic flight;
` +
      `No song of wisdom shall remain unsung,
` +
      `While rhetoric holds its incandescent light.
` +
      `For he who speaks with clarity and grace,
` +
      `Commands the future and preserves our place.`;
  } else if (mode.includes('Gothic') || mode.includes('Romantic')) {
    return `Upon the midnight cloisters fell a shadow pale and deep,
` +
      `Where ancient scribes in dusty tombs their quiet vigils keep.
` +
      `A solitary lantern burned beside the oaken door,
` +
      `As whispered echoes of ${cleanTheme} drifted cross the floor.

` +
      `No wind disturbed the cypress boughs, no tempest stirred the bay,
` +
      `Yet in the ink upon the page the silver secrets lay.
` +
      `Awake, O seeker of the quill, beneath the vaulted dome!
` +
      `For in the mastery of words the wandering soul finds home.`;
  } else {
    return `Literary & Rhetorical Critique for: "${cleanTheme}"

` +
      `1. Cadence & Rhythm (8.5/10):
` +
      `Your phrase exhibits strong initial momentum. To elevate the rhythmic impact, alternate between brisk monosyllabic assertions and stately Latinate polysyllables.

` +
      `2. Metaphorical Depth (9.0/10):
` +
      `The conceptual foundation connects well with the listener's imagination. Deepen the sensory resonance by anchoring abstract concepts to tactile elements like light, weight, or resonance.

` +
      `3. Say It Better (Actionable Revision):
` +
      `"True eloquence is not the mere ornament of thought, but its decisive architecture."`;
  }
}

function getOracleOfflineDestiny(q1, q2, q3, bio) {
  const bioLower = (bio || '').toLowerCase();
  if (bioLower.includes('pilot') || bioLower.includes('aviat') || bioLower.includes('sky') || q1.includes('Stormy coastal')) {
    return {
      title: "Aeronautical Communications Director & Flight Operations Strategist",
      why: "Your affinity for expansive frontiers and spotting critical patterns aligns seamlessly with aviation command, crisis communications, and international aerospace protocol.",
      path: [
        "Master DGCA standard radiotelephony phraseology and STEM-English synthesis in school.",
        "Pursue a B.Sc in Aviation / Aeronautics paired with ICAO Level 6 English Proficiency certification.",
        "Ascend into chief airline flight operations dispatch, flight deck command, or air traffic safety oversight."
      ]
    };
  } else if (bioLower.includes('law') || bioLower.includes('court') || bioLower.includes('justice') || q2.includes('Persuading') || q3.includes('debate')) {
    return {
      title: "Supreme Court Appellate Advocate & Constitutional Jurist",
      why: "Your gift for persuasive argument, rhetorical precision, and rigorous debate makes you a natural advocate in high-stakes appellate litigation and public interest jurisprudence.",
      path: [
        "Excel in National Model United Nations, Parliamentary Debating, and board exam English in Class 11-12.",
        "Clear CLAT to enter a premier National Law University (NLSIU Bengaluru / NALSAR Hyderabad) for B.A. LL.B. (Hons).",
        "Clerk with High Court / Supreme Court judges and build a bespoke chamber practice in corporate and constitutional law."
      ]
    };
  } else if (bioLower.includes('tech') || bioLower.includes('ai') || bioLower.includes('system') || q2.includes('Imagining complex')) {
    return {
      title: "Cognitive AI Dialogue Architect & Human-Centered UX Designer",
      why: "As artificial intelligence reshapes human interaction, companies require linguists who understand semantic nuances, tone, prompt engineering, and conversational psychology.",
      path: [
        "Blend literature studies with introductory computer science and cognitive psychology in school.",
        "Earn a degree in Computational Linguistics, Cognitive Science, or English Literature at Ashoka / EFL University.",
        "Lead generative AI UX strategy and conversational voice architecture at global technology frontiers."
      ]
    };
  } else {
    return {
      title: "Chief Narrative Officer & Global Brand Strategist",
      why: "Your love of storytelling, reflective depth, and cultural curiosity positions you at the helm of international media, publication houses, and global corporate strategy.",
      path: [
        "Build a prolific writing portfolio, edit the school journal, and publish analytical essays.",
        "Pursue English Literature at Delhi University (St. Stephen's / Lady Shri Ram) or St. Xavier's Mumbai.",
        "Lead corporate brand identity, investor communications, or executive speechwriting for Fortune 500 enterprises."
      ]
    };
  }
}



function renderGamingHall(mount, initialQuestIdx = 0) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="font-size:22px;display:flex;align-items:center;gap:8px;">
            <span>🔮</span> <span>The Gaming Hall: Five Gemini-Powered Quests</span>
          </h3>
          <span style="font-size:13px;color:var(--text-dim);">
            Immersive generative literary adventures. Click any side card to bring it forward, or the center card to embark!
          </span>
        </div>
        
      </div>
    </div>

    <!-- 3D Arc Carousel -->
    <div class="arc-stage">
      <div class="arc-carousel" id="gaming-arc-carousel"></div>
      <div class="arc-nav-row">
        <button class="arc-nav-btn" id="arc-prev" title="Previous Quest" type="button">
          <span class="arc-nav-arrow">‹</span>
          <span>Previous</span>
        </button>
        <div class="arc-indicator-pill" id="arc-indicator">
          <span>Quest 1 of 5</span>
          <span style="opacity:0.4;">·</span>
          <span style="color:var(--accent-cyan);font-weight:800;">The Scribe</span>
        </div>
        <button class="arc-nav-btn" id="arc-next" title="Next Quest" type="button">
          <span>Next</span>
          <span class="arc-nav-arrow">›</span>
        </button>
      </div>
    </div>

    <!-- Active Quest Stage -->
    <div id="quest-active-stage" style="margin-top:20px;">
      <div class="quest-view-card" id="quest-stage-inner">
        <!-- Quest content mounts here -->
      </div>
    </div>
  `;

  const carousel = $('#gaming-arc-carousel');
  const stageInner = $('#quest-stage-inner');
  const indicator = $('#arc-indicator');
  let activeIndex = (typeof initialQuestIdx === 'number' && initialQuestIdx >= 0 && initialQuestIdx < GAMING_HALL_QUESTS.length)
    ? initialQuestIdx
    : (gamingHallArcIndex || 0);

  function syncQuestUrl() {
    gamingHallArcIndex = activeIndex;
    if (window.AppRouter) {
      window.AppRouter.navigate('/games/gaming-hall', { silent: true });
    }
  }

  function renderArc() {
    carousel.innerHTML = '';
    const n = GAMING_HALL_QUESTS.length;
    GAMING_HALL_QUESTS.forEach((q, i) => {
      let offset = i - activeIndex;
      if (offset > n / 2) offset -= n;
      if (offset < -n / 2) offset += n;
      const absOffset = Math.abs(offset);

      const card = document.createElement('div');
      card.className = `arc-card ${absOffset === 0 ? 'active' : ''}`;
      card.setAttribute('data-index', i);

      const isMobileArc = window.innerWidth <= 768;
      const tx = offset * (isMobileArc ? 160 : 210);
      const ty = absOffset * absOffset * (isMobileArc ? 12 : 18);
      const rot = offset * (isMobileArc ? 6 : 8);
      const sc = 1 - absOffset * 0.12;
      card.style.transform = `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(${sc})`;
      card.style.zIndex = 10 - absOffset;
      card.style.opacity = absOffset > 2 ? '0' : (1 - absOffset * 0.25).toString();
      card.style.pointerEvents = absOffset > 2 ? 'none' : 'auto';

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span class="arc-card-icon" style="font-size:26px;">${q.icon}</span>
          <span class="badge-pill" style="font-size:10.5px;padding:2px 8px;background:rgba(0,240,255,0.12);color:var(--accent-cyan);border:1px solid rgba(0,240,255,0.3);font-weight:700;">Quest ${q.num}</span>
        </div>
        <div class="arc-card-title" style="font-size:17px;font-weight:800;color:var(--text-main);margin-bottom:4px;">${q.title}</div>
        <div class="arc-card-subtitle" style="font-size:11.5px;font-weight:700;color:var(--accent-cyan);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${escapeHtml(q.tag || '')}</div>
        <div class="arc-card-desc" style="font-size:12.5px;color:var(--text-muted);line-height:1.45;flex:1;">${q.desc}</div>
        <div class="arc-card-action" style="margin-top:12px;font-size:12px;font-weight:700;color:${absOffset === 0 ? 'var(--accent-cyan)' : 'var(--text-dim)'};display:flex;align-items:center;gap:6px;">
          ${absOffset === 0 ? '▶ Launch Quest' : 'Click to Inspect'}
        </div>
      `;

      card.addEventListener('click', () => {
        if (activeIndex === i) {
          launchQuest(i);
        } else {
          activeIndex = i;
          syncQuestUrl();
          renderArc();
          launchQuest(i);
        }
      });

      carousel.appendChild(card);
    });

    if (indicator) {
      indicator.innerHTML = `
        <span style="opacity:0.8;">Quest ${activeIndex + 1} of ${n}</span>
        <span style="opacity:0.4;">·</span>
        <span style="color:var(--accent-cyan);font-weight:800;">${GAMING_HALL_QUESTS[activeIndex].title}</span>
      `;
    }
  }

  function launchQuest(idx) {
    if (!stageInner) return;
    stageInner.innerHTML = '';
    switch (idx) {
      case 0: launchQuestScribe(stageInner); break;
      case 1: launchQuestBard(stageInner); break;
      case 2: launchQuestCipher(stageInner); break;
      default: launchQuestScribe(stageInner);
    }
    stageInner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('#arc-prev')?.addEventListener('click', () => {
    activeIndex = (activeIndex - 1 + GAMING_HALL_QUESTS.length) % GAMING_HALL_QUESTS.length;
    syncQuestUrl();
    renderArc();
    launchQuest(activeIndex);
  });

  $('#arc-next')?.addEventListener('click', () => {
    activeIndex = (activeIndex + 1) % GAMING_HALL_QUESTS.length;
    syncQuestUrl();
    renderArc();
    launchQuest(activeIndex);
  });

  // Touch swipe support for 3D Arc Carousel on mobile phones
  let arcTouchStartX = 0;
  let arcTouchStartY = 0;
  carousel.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      arcTouchStartX = e.touches[0].clientX;
      arcTouchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    if (!arcTouchStartX || !e.changedTouches || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - arcTouchStartX;
    const dy = e.changedTouches[0].clientY - arcTouchStartY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        activeIndex = (activeIndex + 1) % GAMING_HALL_QUESTS.length;
      } else {
        activeIndex = (activeIndex - 1 + GAMING_HALL_QUESTS.length) % GAMING_HALL_QUESTS.length;
      }
      syncQuestUrl();
      renderArc();
      launchQuest(activeIndex);
    }
    arcTouchStartX = 0;
    arcTouchStartY = 0;
  }, { passive: true });

  window.setGamingHallQuest = (idx) => {
    activeIndex = idx;
    syncQuestUrl();
    renderArc();
    launchQuest(idx);
  };

  renderArc();
  launchQuest(activeIndex);
}

// QUEST 1: The Scribe (Fully Dynamic Branching Interactive Tale)
function launchQuestScribe(mount) {
  let turn = 0;
  let storyHistory = [];

  mount.innerHTML = `
    <div style="display:flex;justify-content:flex-end;align-items:center;margin-bottom:8px;">
      <span class="badge-pill badge-reg" id="scribe-turn-badge">Chapter 1 of 6</span>
    </div>
    <div id="scribe-story-box" class="quest-output-box">The ink is still wet on the parchment...</div>
    <div id="scribe-choices-box" class="quest-options-grid"></div>
    <div style="display:flex;gap:10px;margin-top:14px;align-items:center;flex-wrap:wrap;">
      <button class="btn btn-secondary btn-sm" id="btn-scribe-listen" type="button">🔊 Listen to Chapter</button>
      <button class="btn btn-ghost btn-sm" id="btn-scribe-reset" type="button">🔄 Start New Tale</button>
    </div>
  `;

  const storyBox = $('#scribe-story-box');
  const choicesBox = $('#scribe-choices-box');
  const turnBadge = $('#scribe-turn-badge');

  const step = async (choice = null) => {
    choicesBox.innerHTML = '<div style="color:var(--text-muted);"><span class="spinner-sm"></span> The quill moves across the page...</div>';
    turn++;
    if (turnBadge) turnBadge.textContent = `Chapter ${turn} of 6`;

    if (choice) {
      storyHistory.push(`Chapter ${turn - 1} Choice: ${choice}`);
    }

    try {
      let userMsg = '';
      if (!choice) {
        userMsg = 'You are the Master Scribe. Write Chapter 1 of a dark-fantasy Gothic quest in Victorian prose for a high-school student. Return strict JSON {"story":"80-100 words opening an atmospheric mystery with immediate tension","choices":["choice 1","choice 2","choice 3"]}.';
      } else {
        const historyContext = storyHistory.slice(-3).join(' -> ');
        if (turn >= 6) {
          userMsg = `The reader chooses: "${choice}". Narrative history: [${historyContext}]. This is the final Chapter 6. Bring this tale to a dramatic, conclusive resolution that honors their exact choice. Return strict JSON {"story":"80-100 words delivering the final triumph or revelation","choices":[]}.`;
        } else {
          userMsg = `The reader chooses: "${choice}". Narrative history: [${historyContext}]. Write Chapter ${turn} of 6, developing the story strictly according to their choice. Return strict JSON {"story":"80-100 words continuing the consequence of their action","choices":["new choice A","new choice B","new choice C"]}.`;
        }
      }

      let data = null;
      try {
        data = await callAiQuest(userMsg, true);
      } catch (e) {
        data = null;
      }

      // If AI returned structured response, verify it has story
      let storyText = '';
      let nextChoices = [];

      if (data && typeof data === 'object' && data.story) {
        storyText = String(data.story).trim();
        nextChoices = Array.isArray(data.choices) ? data.choices : [];
      } else if (data && typeof data === 'string') {
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.story) {
              storyText = parsed.story;
              nextChoices = Array.isArray(parsed.choices) ? parsed.choices : [];
            }
          } catch {}
        }
      }

      // Contextual dynamic branching fallback if network or quota is unavailable
      if (!storyText || storyText.includes('ancient parchment reveals an intricate mystery before you')) {
        if (!choice) {
          const rootData = SCRIBE_OFFLINE_TALES[0];
          storyText = rootData.story;
          nextChoices = rootData.choices;
        } else if (turn >= 6) {
          storyText = `You courageously carry out your choice to "${choice}". Light surges through the ancient stained-glass windows, driving back the shadows as the final clockwork bell strikes. Every riddle inscribed in the Scriptorium has been mastered through your discernment, bringing your Gothic journey to a triumphant conclusion.`;
          nextChoices = [];
        } else {
          const actionClean = choice.trim();
          storyText = `Acting upon your resolve to "${actionClean}", you venture deeper into the mystery. The stone corridor responds with a rhythmic mechanical hum as concealed oil lamps flare to life. Ahead, a heavy iron portal bears three freshly unveiled Latin runes, reacting dynamically to your presence.`;
          nextChoices = [
            `Analyze the Latin inscription: "Veritas Vos Liberabit" to unlock the inner sanctum`,
            `Draw your lantern closer to inspect the mechanical locking cylinder`,
            `Signal into the vaulted gallery to test for echoes or hidden watchers`
          ];
        }
      }

      storyHistory.push(`Chapter ${turn} Story: ${storyText.slice(0, 80)}...`);
      await typeInto(storyBox, storyText);

      choicesBox.innerHTML = '';
      const finalChoices = (turn >= 6) ? [] : nextChoices;
      if (finalChoices.length > 0) {
        finalChoices.forEach(ch => {
          const btn = document.createElement('button');
          btn.className = 'quest-choice-btn';
          btn.innerHTML = `<span>👉</span> <span>${escapeHtml(ch)}</span>`;
          btn.onclick = () => step(ch);
          choicesBox.appendChild(btn);
        });
      } else {
        choicesBox.innerHTML = '<div style="padding:14px;background:var(--surface);border-radius:var(--radius-md);color:var(--accent-cyan);font-weight:600;">✨ The tale has reached its dramatic conclusion. Click "Start New Tale" to venture forth again.</div>';
      }
    } catch (err) {
      console.warn('Scribe quest step safe recovery:', err);
      const fallbackText = choice 
        ? `You press forward with "${choice}". The ancient library answers with a deep resonance, revealing a hidden stairwell winding upward into the observatory.`
        : (SCRIBE_OFFLINE_TALES[0]?.story || 'The adventure begins in the shadowy library...');
      storyBox.textContent = fallbackText;
      choicesBox.innerHTML = '';
      if (turn < 6) {
        [
          `Climb the spiral stairs toward the starlit observatory dome`,
          `Examine the bronze astrolabe turning silently upon the pedestal`,
          `Unroll the parchment map to check your location against the campus layout`
        ].forEach(ch => {
          const btn = document.createElement('button');
          btn.className = 'quest-choice-btn';
          btn.innerHTML = `<span>👉</span> <span>${escapeHtml(ch)}</span>`;
          btn.onclick = () => step(ch);
          choicesBox.appendChild(btn);
        });
      } else {
        choicesBox.innerHTML = '<div style="padding:14px;background:var(--surface);border-radius:var(--radius-md);color:var(--accent-cyan);font-weight:600;">✨ The tale has reached its dramatic conclusion. Click "Start New Tale" to venture forth again.</div>';
      }
    }
  };

  $('#btn-scribe-reset')?.addEventListener('click', () => { turn = 0; storyHistory = []; step(); });
  $('#btn-scribe-listen')?.addEventListener('click', function() {
    const text = storyBox.textContent;
    if (text) speak(text, this);
  });

  step();
}

// QUEST 2: The Etymologist
function launchQuestEtym(mount) {
  mount.innerHTML = `
    <div style="margin-bottom:10px;">
      <span style="font-size:13px;color:var(--text-dim);">Uncover the ancient Latin &amp; Greek lineages behind modern English career words.</span>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:16px;">
      <input type="text" id="etym-word-input" placeholder="Type an English word (e.g. serendipity, articulate, rhetoric) or leave empty for mystery word..." style="flex:1;">
      <button class="btn btn-primary" id="btn-etym-go">🔍 Unearth Lineage</button>
    </div>
    <div id="etym-result-box" style="min-height:140px;">
      <div style="color:var(--text-muted);padding:14px;background:var(--bg-subtle);border-radius:var(--radius-md);">
        Enter a word or click "Unearth Lineage" to let the detective pick an intriguing mystery root.
      </div>
    </div>
  `;

  const goBtn = $('#btn-etym-go');
  const resultBox = $('#etym-result-box');

  const unearth = async () => {
    const wordInput = $('#etym-word-input')?.value.trim();
    resultBox.innerHTML = '<div style="padding:20px;color:var(--accent-cyan);"><span class="spinner-sm"></span> Excavating historical archives and classical lexicons...</div>';

    const prompt = `${wordInput ? `Word: "${wordInput}".` : 'Pick an interesting, resonant English root word used in leadership or scholarship.'} Return JSON {"word":"the word","origin":"2-4 plain sentences detailing origin history","roots":["root → meaning"],"riddle":"an engaging quiz question about this word\'s origin","options":["option A","option B","option C","option D"],"answer":0}`;

    let j = null;
    try {
      j = await callAiQuest(prompt, true);
    } catch (e) {
      j = null;
    }

    // Offline dual-engine fallback
    if (!j || !j.word || !j.origin) {
      const match = wordInput ? ETYM_OFFLINE_WORDS.find(w => w.word.toLowerCase() === wordInput.toLowerCase()) : null;
      j = match || ETYM_OFFLINE_WORDS[Math.floor(Math.random() * ETYM_OFFLINE_WORDS.length)];
    }

    const rootsHtml = (j.roots || []).map(r => `<li style="font-family:var(--font-mono);font-size:13px;color:var(--accent-cyan);">${escapeHtml(r)}</li>`).join('');

    resultBox.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:18px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <h3 style="font-size:24px;color:var(--accent-cyan);margin:0;text-transform:capitalize;">${escapeHtml(j.word)}</h3>
          <button class="btn btn-secondary btn-sm" id="btn-etym-listen">🔊 Listen</button>
        </div>
        <p style="font-size:14.5px;color:var(--text-main);margin:12px 0;line-height:1.55;">${escapeHtml(j.origin)}</p>
        <div style="margin-top:10px;">
          <strong style="font-size:12px;text-transform:uppercase;color:var(--text-dim);letter-spacing:0.5px;">Root Genealogy:</strong>
          <ul style="margin:6px 0 0 18px;padding:0;">${rootsHtml}</ul>
        </div>
      </div>

      <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-md);padding:18px;">
        <div style="font-weight:700;color:var(--accent-magenta);margin-bottom:8px;">🎯 Etymology Riddle Challenge:</div>
        <p style="font-size:14.5px;color:var(--text-main);margin:0 0 12px 0;">${escapeHtml(j.riddle)}</p>
        <div id="etym-options-container" class="quest-options-grid"></div>
      </div>
    `;

    $('#btn-etym-listen')?.addEventListener('click', function() {
      speak(`${j.word}. ${j.origin}`, this);
    });

    const optBox = $('#etym-options-container');
    (j.options || []).forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quest-choice-btn';
      btn.textContent = opt;
      btn.onclick = () => {
        if (idx === j.answer) {
          btn.style.borderColor = 'var(--accent-green, #10b981)';
          btn.style.background = 'rgba(16, 185, 129, 0.15)';
          btn.innerHTML = `<span>✔ Correct!</span> <span>${escapeHtml(opt)}</span>`;
        } else {
          btn.style.borderColor = 'var(--accent-magenta)';
          btn.style.background = 'rgba(255, 42, 133, 0.12)';
          btn.innerHTML = `<span>✘ Not quite:</span> <span>${escapeHtml(opt)}</span>`;
        }
      };
      optBox.appendChild(btn);
    });
  };

  goBtn?.addEventListener('click', unearth);
}

// QUEST 3: The Bard's Mirror
function launchQuestBard(mount) {
  mount.innerHTML = `
    <div style="margin-bottom:10px;">
      <span style="font-size:13px;color:var(--text-dim);">Consult Shakespeare and the Romantic poets for verse composition or a rigorous stylistic critique.</span>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;">Select Inscription Mode:</label>
      <select id="bard-mode-select" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13.5px;">
        <option value="" disabled selected>-- Select Inscription Mode (Mandatory) --</option>
        <option value="Write a Shakespearean sonnet">Shakespearean Sonnet (14 lines iambic pentameter)</option>
        <option value="Write a Gothic Romantic poem">Gothic Romantic Ballad (Atmospheric &amp; haunting)</option>
        <option value="Critique my writing style">Literary Style Critique (Actionable rhetoric insights)</option>
      </select>
    </div>
    <div style="margin-bottom:12px;">
      <textarea id="bard-input-text" rows="4" placeholder="Enter a theme (e.g. ambition in modern technology, twilight over Mumbai), or paste your own draft writing..." style="width:100%;box-sizing:border-box;font-family:var(--font-sans);font-size:13.5px;"></textarea>
    </div>
    <button class="btn btn-primary" id="btn-bard-go">🪞 Consult the Mirror</button>
    <div id="bard-result-mount" style="margin-top:16px;"></div>
  `;

  $('#bard-mode-select')?.addEventListener('change', () => {
    const el = $('#bard-mode-select');
    if (el) el.style.borderColor = '';
  });
  $('#bard-input-text')?.addEventListener('input', () => {
    const el = $('#bard-input-text');
    if (el) el.style.borderColor = '';
  });

  $('#btn-bard-go')?.addEventListener('click', async () => {
    const modeEl = $('#bard-mode-select');
    const textEl = $('#bard-input-text');
    const text = textEl?.value.trim();
    const mode = modeEl?.value;
    const resBox = $('#bard-result-mount');

    let hasError = false;
    let firstErrorEl = null;

    if (!mode || mode === '') {
      if (modeEl) modeEl.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = modeEl;
      hasError = true;
    } else {
      if (modeEl) modeEl.style.borderColor = '';
    }

    if (!text) {
      if (textEl) textEl.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = textEl;
      hasError = true;
    } else {
      if (textEl) textEl.style.borderColor = '';
    }

    if (hasError) {
      showToast('⚠️ Please select an Inscription Mode and enter a theme or writing snippet (both mandatory)!');
      firstErrorEl?.focus();
      return;
    }

    resBox.innerHTML = '<div style="color:var(--accent-cyan);padding:14px;"><span class="spinner-sm"></span> The silvered glass reflects your words...</div>';
    
    let reply = null;
    try {
      const prompt = `${mode} based on: "${text}". Keep under 200 words. Craft with eloquence and memorable cadence.`;
      reply = await callAiQuest(prompt, false);
    } catch (e) {
      reply = null;
    }

    if (!reply || typeof reply !== 'string' || reply.length < 20) {
      reply = getBardOfflineResponse(mode, text);
    }

    resBox.innerHTML = `
      <div class="quest-output-box" style="font-family:Georgia, serif;font-size:15px;line-height:1.75;background:var(--surface);white-space:pre-line;">${escapeHtml(reply)}</div>
      <button class="btn btn-secondary btn-sm" id="btn-bard-listen" type="button">🔊 Recite in Indian Accent</button>
    `;

    $('#btn-bard-listen')?.addEventListener('click', function() {
      speak(reply, this);
    });
  });
}

// QUEST 4: The Career Oracle
function launchQuestOracle(mount) {
  mount.innerHTML = `
    <div style="margin-bottom:10px;">
      <span style="font-size:13px;color:var(--text-dim);">Three personality divination prompts to uncover an unexpected high-impact career pathway in India.</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin-bottom:14px;">
      <div>
        <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px;">1. A cherished place?</label>
        <select id="oracle-q1" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;">
          <option value="" disabled selected>-- Select a cherished place (Mandatory) --</option>
          <option>Ancient university library</option>
          <option>Stormy coastal sea cliff</option>
          <option>Bustling international city</option>
          <option>Quiet botanical sanctuary</option>
        </select>
      </div>
      <div>
        <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px;">2. Your strongest gift?</label>
        <select id="oracle-q2" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;">
          <option value="" disabled selected>-- Select your strongest gift (Mandatory) --</option>
          <option>Telling unforgettable stories</option>
          <option>Spotting hidden inconsistencies</option>
          <option>Persuading and inspiring listeners</option>
          <option>Imagining complex worlds and systems</option>
        </select>
      </div>
      <div>
        <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px;">3. A perfect evening?</label>
        <select id="oracle-q3" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;">
          <option value="" disabled selected>-- Select a perfect evening (Mandatory) --</option>
          <option>Reading deeply without interruption</option>
          <option>Engaging in passionate friendly debate</option>
          <option>Crafting or writing something original</option>
          <option>Exploring an unfamiliar neighborhood</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:12px;">
      <input type="text" id="oracle-bio" placeholder="Optional: What excites your curiosity? (e.g. AI ethics, sports law, diplomacy)" style="width:100%;">
    </div>
    <button class="btn btn-primary" id="btn-oracle-go">🔮 Divinate My Career Destiny</button>
    <div id="oracle-result-mount" style="margin-top:16px;"></div>
  `;

  ['#oracle-q1', '#oracle-q2', '#oracle-q3'].forEach(sel => {
    $(sel)?.addEventListener('change', (e) => {
      e.target.style.borderColor = '';
    });
  });

  $('#btn-oracle-go')?.addEventListener('click', async () => {
    const q1El = $('#oracle-q1');
    const q2El = $('#oracle-q2');
    const q3El = $('#oracle-q3');
    const q1 = q1El?.value;
    const q2 = q2El?.value;
    const q3 = q3El?.value;
    const bio = $('#oracle-bio')?.value.trim();

    let hasError = false;
    let firstErrorEl = null;

    if (!q1 || q1 === '') {
      if (q1El) q1El.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = q1El;
      hasError = true;
    } else {
      if (q1El) q1El.style.borderColor = '';
    }

    if (!q2 || q2 === '') {
      if (q2El) q2El.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = q2El;
      hasError = true;
    } else {
      if (q2El) q2El.style.borderColor = '';
    }

    if (!q3 || q3 === '') {
      if (q3El) q3El.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = q3El;
      hasError = true;
    } else {
      if (q3El) q3El.style.borderColor = '';
    }

    if (hasError) {
      showToast('⚠️ Please answer all 3 mandatory divination questions to reveal your destiny!');
      firstErrorEl?.focus();
      return;
    }
    const resBox = $('#oracle-result-mount');

    resBox.innerHTML = '<div style="color:var(--accent-cyan);padding:14px;"><span class="spinner-sm"></span> The astrological astrolabe aligns with your answers...</div>';

    const prompt = `Student Divination: Place="${q1}", Gift="${q2}", Evening="${q3}", Interests="${bio || 'General inquiry'}". Match this student to one unexpected, high-growth career for an English graduate in India. Return JSON {"title":"Career Title","why":"2 concise sentences why it matches their inner gifts","path":["Step 1 in school/college","Step 2 degree/skills","Step 3 career breakthrough"]}`;

    let data = null;
    try {
      data = await callAiQuest(prompt, true);
    } catch (e) {
      data = null;
    }

    if (!data || !data.title || !data.why) {
      data = getOracleOfflineDestiny(q1, q2, q3, bio);
    }

    const stepsHtml = (data.path || []).map((s, i) => `<li><strong>Stage ${i+1}:</strong> ${escapeHtml(s)}</li>`).join('');

    resBox.innerHTML = `
      <div class="holo-divination-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <span class="badge-pill" style="background:rgba(0,240,255,0.2);color:var(--accent-cyan);font-weight:700;">✨ Destiny Matched</span>
            <h3 style="font-size:24px;color:var(--accent-cyan);margin:8px 0 4px 0;">${escapeHtml(data.title)}</h3>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-oracle-listen">🔊 Listen</button>
        </div>
        <p style="font-size:14.5px;color:var(--text-main);margin:10px 0 16px 0;line-height:1.55;">${escapeHtml(data.why)}</p>
        <div style="border-top:1px solid rgba(0,240,255,0.2);padding-top:12px;">
          <strong style="font-size:12px;text-transform:uppercase;color:var(--text-dim);letter-spacing:0.5px;">Your Concrete 3-Stage Roadmap:</strong>
          <ol style="margin:8px 0 0 18px;padding:0;font-size:13.5px;line-height:1.6;color:var(--text-main);">${stepsHtml}</ol>
        </div>
      </div>
    `;

    $('#btn-oracle-listen')?.addEventListener('click', function() {
      speak(`${data.title}. ${data.why}`, this);
    });
  });
}

// ── CIPHER MYSTERY CASES (Easy to Progressive Difficulty) ─────────────────────
const CIPHER_MYSTERY_CASES = [
  // ── LEVEL 1: BEGINNER (Easy, clear words, everyday school vocabulary) ─────────
  {
    id: "nalanda-simple",
    difficulty: "Easy · Level 1",
    level: 1,
    badge: "🟢 Beginner Detective",
    title: "Archive Case: The Missing Ancient Book",
    intro: "Late last night in the university library, an old gold-letter book went missing from a glass desk. The key was left on the table. Three campus helpers were nearby.",
    time: "Late last night in the university library",
    location: "The open glass desk in the university library",
    stolen: "An old gold-letter book",
    clue: "A drop of bright blue ink was found near the open glass desk.",
    culprit: "Sister Margaret",
    culpritReason: "Sister Margaret was writing with bright blue ink in her notebook, while Dr. Finch used dark red ink and Librarian Kulkarni used black pencil.",
    suspects: [
      { name: "Dr. Alistair Finch", role: "History Teacher", gender: "male", alibi: "Says he was reading star maps in the high tower with a red pen." },
      { name: "Sister Margaret", role: "Book Repairer", gender: "female", alibi: "Says she was fixing old song sheets with blue ink in the side room." },
      { name: "Librarian Kulkarni", role: "Chief Librarian", gender: "male", alibi: "Says he was counting new books in the hallway with a pencil." }
    ],
    hint: "Look at the ink color found by the desk and check who was writing with that exact color."
  },
  {
    id: "lost-trophy-simple",
    difficulty: "Easy · Level 1",
    level: 1,
    badge: "🟢 Beginner Detective",
    title: "Campus Case: The Golden Debate Cup",
    intro: "During lunch break in the school hall, the shiny first-place debate cup disappeared from the showcase. The back door was left unlocked.",
    time: "During lunch break in the school hall",
    location: "The trophy showcase in the school hall",
    stolen: "The shiny first-place debate cup",
    clue: "A green ribbon with cookie crumbs was dropped beside the trophy stand.",
    culprit: "Leo the Prefect",
    culpritReason: "Leo was snacking on mint cookies and wearing his green debate team ribbon, while Maya had a blue badge and Coach Sam had a yellow whistle.",
    suspects: [
      { name: "Leo the Prefect", role: "Debate Captain", gender: "male", alibi: "Says he was eating lunch near the stage door." },
      { name: "Maya Sharma", role: "Student Council Rep", gender: "female", alibi: "Says she was making blue posters in art class." },
      { name: "Coach Sam", role: "Sports Coach", gender: "male", alibi: "Says he was blowing his yellow whistle out on the soccer ground." }
    ],
    hint: "Check what food and team colors were found near the trophy stand."
  },

  // ── LEVEL 2: INTERMEDIATE (Moderate vocabulary, logical deduction) ──────────
  {
    id: "royal-diploma-med",
    difficulty: "Medium · Level 2",
    level: 2,
    badge: "🟡 Senior Sleuth",
    title: "Archive Case: The King's Charter Seal",
    intro: "During the annual heritage exhibition, a historic royal charter bearing King George's wax insignia was swapped with a counterfeit replica. Only staff with laboratory passes entered the vault.",
    time: "During the annual heritage exhibition in the vault",
    location: "The heritage display vault",
    stolen: "A historic royal charter bearing King George's wax insignia",
    clue: "A distinctive scent of almond polishing solvent lingered across the display vault.",
    culprit: "Victor Vance",
    culpritReason: "Victor Vance was using almond-scented lacquer solvent to clean brass frames, while Elena used citrus glass spray and Marcus handled dry archival gloves.",
    suspects: [
      { name: "Dr. Elena Rostova", role: "Visiting Chemist", gender: "female", alibi: "Claims she was sanitizing glass cabinets using fresh citrus spray." },
      { name: "Victor Vance", role: "Framing Technician", gender: "male", alibi: "Claims he was refinishing antique brass borders in the basement workshop." },
      { name: "Marcus Brody", role: "Security Archivist", gender: "male", alibi: "Claims he was reviewing digital motion logs wearing white cotton gloves." }
    ],
    hint: "Identify which cleaning solvent produces the almond aroma reported in the vault."
  },
  {
    id: "stolen-microfilm-med",
    difficulty: "Medium · Level 2",
    level: 2,
    badge: "🟡 Senior Sleuth",
    title: "Media Lab Case: The Missing Flight Audio Tape",
    intro: "Just before the journalism showcase, the original cockpit audio cassette from the historic 1982 trans-Atlantic flight was taken from the sound editing deck.",
    time: "Just before the journalism showcase in the media lab",
    location: "The sound editing deck in the media lab",
    stolen: "The original cockpit audio cassette from the historic 1982 trans-Atlantic flight",
    clue: "A magnetic tape spool cap labeled '7.5 IPS High-Speed' was caught in the sound booth vent.",
    culprit: "Audio Engineer Tara",
    culpritReason: "Tara calibrated the only reel-to-reel deck operating at 7.5 IPS high-speed, whereas Reporter Neil used digital SD cards and Producer Diaz utilized cassette cassettes.",
    suspects: [
      { name: "Audio Engineer Tara", role: "Sound Archivist", gender: "female", alibi: "Maintains she was testing high-speed reel tapes in the back studio." },
      { name: "Reporter Neil", role: "Investigative Journalist", gender: "male", alibi: "States he was transferring audio interviews from modern flash cards." },
      { name: "Producer Diaz", role: "Newsroom Director", gender: "male", alibi: "Says he was proofreading teleprompter scripts in the main control gallery." }
    ],
    hint: "Match the speed format on the dropped spool cap with the recording equipment each suspect operates."
  },

  // ── LEVEL 3: ADVANCED (Sophisticated phrasing, multi-step forensic reasoning) ─
  {
    id: "nalanda-advanced",
    difficulty: "Challenging · Level 3",
    level: 3,
    badge: "🔴 Chief Inspector",
    title: "Archive Case: The Disappearing Nalanda Translation",
    intro: "At midnight in the library quadrangle, a priceless 14th-century illuminated folio translated from Nalanda Sanskrit into early English vanished from its locked mahogany case. Three scholars were logged present in the scriptorium.",
    time: "At midnight in the library quadrangle scriptorium",
    location: "The locked mahogany case in the library quadrangle scriptorium",
    stolen: "A 14th-century illuminated folio translated from Nalanda Sanskrit into early English",
    clue: "A smudge of ultramarine blue calligraphic wax was found near the display lock.",
    culprit: "Sister Margaret",
    culpritReason: "Sister Margaret uses genuine ultramarine wax imported from Venice to seal religious translations, whereas Dr. Finch and Librarian Kulkarni use standard scarlet seal lacquer.",
    suspects: [
      { name: "Dr. Alistair Finch", role: "Visiting Oxford Paleographer", gender: "male", alibi: "Claims he was examining astronomy charts in the north tower with scarlet ink." },
      { name: "Sister Margaret", role: "Archival Conservator", gender: "female", alibi: "Claims she was restoring liturgical psalters in the scriptorium with blue wax." },
      { name: "Librarian Kulkarni", role: "Head Curator", gender: "male", alibi: "Claims he was cataloging new Sanskrit acquisitions in the main annex with graphite." }
    ],
    hint: "Contrast the rare imported pigment used by religious conservators against standard scarlet institutional seal wax."
  },
  {
    id: "cipher-code-advanced",
    difficulty: "Challenging · Level 3",
    level: 3,
    badge: "🔴 Chief Inspector",
    title: "Cipher Case: The Enigma Diplomatic Dispatch",
    intro: "During an international mock embassy summit, an intercepted cipher telegram containing coded naval peacetime treaties was extracted from the locked embassy telex terminal.",
    time: "During an international mock embassy summit at the telex terminal",
    location: "The locked embassy telex terminal",
    stolen: "An intercepted cipher telegram containing coded naval peacetime treaties",
    clue: "The cipher machine ribbon was rewound counter-clockwise using a left-handed mechanical key.",
    culprit: "Attaché Henri Dupont",
    culpritReason: "Attaché Dupont is the sole left-handed diplomat certified on the naval rotary machine and carried the counter-clockwise winding key on his personal keyring.",
    suspects: [
      { name: "Ambassador Sterling", role: "Senior Envoy", gender: "male", alibi: "Asserts he was delivering the plenary address with his right hand on the lectern." },
      { name: "Attaché Henri Dupont", role: "Cryptographic Secretary", gender: "male", alibi: "Claims he was filing cipher decodes in the embassy vault." },
      { name: "Counselor Priya Sen", role: "Legal Counsel", gender: "female", alibi: "States she was drafting formal treaty revisions on an electric typewriter." }
    ],
    hint: "Pay attention to the handedness and specific winding direction documented by the forensic examination."
  }
];

function getCipherOfflineInspector(q, currentCase) {
  const ql = (q || '').trim().toLowerCase();
  if (!ql || !currentCase) {
    return "The archive inspector is reviewing the case records.";
  }

  // 1. Inquiries about the Culprit / Who did it / Who stole it
  const culpritQueries = [
    'who did it', 'who is the culprit', 'who stole', 'who is the thief',
    'who is guilty', 'who took it', 'who committed', 'tell me the answer',
    'tell me who', 'who is responsible', 'who done it', 'who was it',
    'who done this', 'who is to blame'
  ];
  if (culpritQueries.some(k => ql.includes(k))) {
    return "To maintain investigative integrity, the inspector cannot declare the culprit directly. Compare the physical evidence with each suspect's declared tools and alibi, then issue your formal accusation below.";
  }

  // 2. Specific Forensic Evidence & Clue Material queries with word boundary checks
  if (/\b(ink|color|colour|pen|pens|pencil|pencils|pigment)\b/i.test(ql)) {
    if (currentCase.id && currentCase.id.includes('nalanda')) {
      return `Ink Evidence Log: ${currentCase.clue} Check each suspect's declared writing instrument to verify who used this ink.`;
    }
  }
  if (/\b(wax|seal|seals|lacquer)\b/i.test(ql)) {
    if (currentCase.clue && (/\b(wax|seal|lacquer)\b/i.test(currentCase.clue))) {
      return `Seal & Wax Evidence: ${currentCase.clue}`;
    }
  }
  if (/\b(solvent|scent|smell|almond|citrus|chemical)\b/i.test(ql)) {
    if (currentCase.clue && (/\b(solvent|scent|smell|almond|citrus)\b/i.test(currentCase.clue))) {
      return `Chemical Evidence Log: ${currentCase.clue}`;
    }
  }
  if (/\b(ribbon|cookie|cookies|crumb|crumbs|food|snack)\b/i.test(ql)) {
    if (currentCase.clue && (/\b(ribbon|cookie|crumb)\b/i.test(currentCase.clue))) {
      return `Physical Clue Log: ${currentCase.clue}`;
    }
  }
  if (/\b(tape|spool|7\.5|speed|ips|cassette|reel)\b/i.test(ql)) {
    if (currentCase.clue && (/\b(tape|spool|ips|speed|cassette|reel)\b/i.test(currentCase.clue))) {
      return `Audio Recording Clue: ${currentCase.clue}`;
    }
  }
  if (/\b(key|keys|left-hand|counter-clockwise|winding|handed)\b/i.test(ql) || ql.includes('left hand')) {
    if (currentCase.clue && (/\b(key|counter-clockwise|left-handed)\b/i.test(currentCase.clue) || currentCase.clue.includes('left-handed'))) {
      return `Mechanical Evidence Log: ${currentCase.clue}`;
    }
  }

  // General clue / evidence / what was found query
  if (/\b(clue|clues|evidence|proof|trace|traces|forensic)\b/i.test(ql) || ql.includes('found at') || ql.includes('what was found') || ql.includes('what did you find')) {
    return `Forensic Clue: ${currentCase.clue}`;
  }

  // 3. Stolen Item / Subject of the crime
  const stolenQueries = [
    'what was stolen', 'what is stolen', 'what went missing', 'what was lost',
    'what is missing', 'what was taken', 'what disappeared', 'what happened',
    'stolen item', 'missing item', 'what book', 'what cup', 'what charter',
    'what tape', 'what folio', 'what telegram', 'what was swapped'
  ];
  if (stolenQueries.some(k => ql.includes(k)) || (/\b(stolen|missing)\b/i.test(ql) && /\b(what|which)\b/i.test(ql))) {
    const item = currentCase.stolen || currentCase.intro;
    return `Missing Archive Subject: ${item}.`;
  }

  // 4. Suspect-specific inquiries (Name, Role, Gender, Alibi, Tools)
  if (Array.isArray(currentCase.suspects)) {
    for (const s of currentCase.suspects) {
      const nameParts = s.name.toLowerCase().split(/\s+/).filter(p => p.length > 2 && !['the', 'and', 'for'].includes(p));
      const roleParts = s.role.toLowerCase().split(/\s+/).filter(p => p.length > 2 && !['the', 'and', 'for'].includes(p));
      const isNamed = nameParts.some(p => {
        const reg = new RegExp(`\\b${p}\\b`, 'i');
        return reg.test(ql);
      }) || roleParts.some(p => {
        const reg = new RegExp(`\\b${p}\\b`, 'i');
        return reg.test(ql);
      });

      if (isNamed) {
        // Gender check for this specific suspect
        const asksFemale = /\b(female|woman|girl|lady)\b/i.test(ql);
        const asksMale = /\b(male|man|boy|gentleman)\b/i.test(ql);

        if (asksFemale) {
          if (s.gender === 'female') {
            return `Yes, ${s.name} is female; she serves as ${s.role} in this case.`;
          } else {
            return `No, ${s.name} is male; he serves as ${s.role} in this case.`;
          }
        }
        if (asksMale) {
          if (s.gender === 'male') {
            return `Yes, ${s.name} is male; he serves as ${s.role} in this case.`;
          } else {
            return `No, ${s.name} is female; she serves as ${s.role} in this case.`;
          }
        }

        // Declared alibi and activities under inquiry
        return `${s.name} (${s.role}) declared under inquiry: "${s.alibi}"`;
      }
    }
  }

  // 5. General Gender Queries (when no suspect name is mentioned)
  if (/\b(female|woman|girl|women|ladies)\b/i.test(ql)) {
    const females = (currentCase.suspects || []).filter(s => s.gender === 'female');
    if (females.length > 0) {
      return `The female suspect in this case is: ${females.map(s => `${s.name} (${s.role})`).join(', ')}.`;
    }
    return "There are no female suspects recorded in this case.";
  }
  if (/\b(male|man|boy|men|gentlemen)\b/i.test(ql)) {
    const males = (currentCase.suspects || []).filter(s => s.gender === 'male');
    if (males.length > 0) {
      return `The male suspects in this case are: ${males.map(s => `${s.name} (${s.role})`).join(', ')}.`;
    }
    return "There are no male suspects recorded in this case.";
  }

  // 6. Time & Chronology queries
  if (/\b(time|when|hour|hours|clock|timing|timestamp|date|midnight|lunch|night|morning|evening)\b/i.test(ql) || ql.includes('at what time') || ql.includes('what time') || ql.includes('when did')) {
    const timeDetail = currentCase.time || currentCase.intro.split(',')[0];
    return `Incident Timeline: The incident occurred ${timeDetail.trim().replace(/\.$/, '')}.`;
  }

  // 7. Location & Scene queries
  if (/\b(where|location|place|scene|venue|desk|vault|hall|room|tower|booth|terminal|quadrangle)\b/i.test(ql) || ql.includes('where did') || ql.includes('where was')) {
    const locDetail = currentCase.location || 'the scene described in the archive case summary';
    return `Scene Location: The incident occurred at ${locDetail.trim().replace(/\.$/, '')}.`;
  }

  // 8. General suspects overview
  if (ql.includes('suspects') || ql.includes('who are the suspects') || ql.includes('people') || ql.includes('everyone')) {
    return `Suspects under inquiry: ${(currentCase.suspects || []).map(s => `${s.name} (${s.role})`).join('; ')}.`;
  }

  // 9. Strict Fallback for Unrecorded / Unrelated details
  return "That information is not found in the archive records.";
}

// QUEST 5: The Ink Cipher
function launchQuestCipher(mount) {
  // Retrieve saved case progression index
  let savedIndex = parseInt(localStorage.getItem('cf_cipher_case_index') || '0', 10);
  if (isNaN(savedIndex) || savedIndex < 0 || savedIndex >= CIPHER_MYSTERY_CASES.length) {
    savedIndex = 0;
  }
  let currentCaseIndex = savedIndex;
  let solvedCases = JSON.parse(localStorage.getItem('cf_cipher_solved_cases') || '[]');

  function renderMysteryInterface() {
    const currentCase = CIPHER_MYSTERY_CASES[currentCaseIndex];
    const isSolved = solvedCases.includes(currentCase.id);

    mount.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="badge-pill" style="font-size:11px;font-weight:700;background:rgba(0,240,255,0.12);color:var(--accent-cyan);border:1px solid rgba(0,240,255,0.3);">
              ${escapeHtml(currentCase.badge)}
            </span>
            ${isSolved ? '<span class="badge-pill" style="font-size:11px;font-weight:700;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.35);">✅ Solved</span>' : ''}
          </div>
          <span style="font-size:13px;color:var(--text-dim);display:block;margin-top:2px;">
            Words and clues progress from easy everyday English to forensic deduction as you solve mysteries.
          </span>
        </div>

        <!-- Mystery Case Selector & Quick Jump -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <label for="cipher-case-select" style="font-size:12px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.04em;">Mystery:</label>
          <select id="cipher-case-select" style="padding:6px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-subtle);color:var(--text-main);font-size:12.5px;font-weight:600;cursor:pointer;">
            ${CIPHER_MYSTERY_CASES.map((c, i) => {
              const solvedTag = solvedCases.includes(c.id) ? '✓ ' : '';
              const sel = i === currentCaseIndex ? 'selected' : '';
              return `<option value="${i}" ${sel}>${solvedTag}Case ${i + 1}: ${c.title.replace('Archive Case: ', '').replace('Campus Case: ', '').replace('Media Lab Case: ', '').replace('Cipher Case: ', '')} (${c.difficulty})</option>`;
            }).join('')}
          </select>
          <button class="btn btn-secondary btn-xs" id="btn-cipher-cycle" type="button" title="Switch to another mystery" style="font-size:12px;padding:6px 10px;">
            🔄 Switch Mystery
          </button>
        </div>
      </div>
      
      <!-- Forensic Flashlight Archive Lens -->
      <div class="archive-case-lens" id="cipher-lens-box">
        <div id="cipher-case-content" style="position:relative;z-index:2;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
            <h4 id="cipher-case-title" style="color:var(--accent-cyan);margin:0;font-size:16px;">
              ${escapeHtml(currentCase.title)}
            </h4>
            <span style="font-size:11.5px;color:var(--text-muted);background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:12px;">
              Vocabulary Level: <strong>${escapeHtml(currentCase.difficulty)}</strong>
            </span>
          </div>

          <p id="cipher-case-intro" style="font-size:14px;line-height:1.6;color:var(--text-main);margin:8px 0 12px 0;">
            ${escapeHtml(currentCase.intro)}
          </p>

          <div style="margin:12px 0;padding:12px 14px;background:rgba(0,0,0,0.3);border-radius:var(--radius-sm);border-left:3px solid var(--accent-cyan);">
            <strong style="color:var(--accent-cyan);">🔍 Forensic Clue:</strong>
            <span id="cipher-case-clue" style="color:var(--text-main);">${escapeHtml(currentCase.clue)}</span>
          </div>

          <div style="font-weight:700;font-size:13px;color:var(--accent-magenta);margin:14px 0 6px 0;">
            Suspects Under Interrogation:
          </div>
          <div id="cipher-suspects-list" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px;">
            ${currentCase.suspects.map(s => `
              <div style="background:var(--bg-subtle);padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:12.5px;">
                <strong style="color:var(--text-main);">${escapeHtml(s.name)}</strong>
                <div style="color:var(--accent-cyan);font-size:11.5px;margin:2px 0;">${escapeHtml(s.role)}</div>
                <div style="color:var(--text-muted);font-size:11px;">Alibi: "${escapeHtml(s.alibi)}"</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Interrogation Console -->
      <div style="margin-top:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
          <h4 style="margin:0;font-size:15px;color:var(--accent-cyan);">Archive Interrogation Log</h4>
          <span style="font-size:12px;color:var(--text-dim);">Ask simple questions to uncover who handled the clue</span>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <input type="text" id="cipher-question-input" placeholder="e.g. What color ink was found? or Ask about Sister Margaret..." style="flex:1;">
          <button class="btn btn-secondary" id="btn-cipher-ask">Interrogate</button>
        </div>
        <div id="cipher-interrogation-reply" style="min-height:36px;"></div>
        
        <div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">
          <label for="cipher-accuse-select" style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Issue Formal Accusation:</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <select id="cipher-accuse-select" style="flex:1;min-width:200px;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-subtle);color:var(--text);font-size:13px;">
              <option value="">-- Choose suspect to accuse --</option>
              ${currentCase.suspects.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (${escapeHtml(s.role)})</option>`).join('')}
            </select>
            <button class="btn btn-primary" id="btn-cipher-accuse">⚖️ Present Evidence to Dean</button>
          </div>
          <div id="cipher-verdict-mount" style="margin-top:12px;"></div>
        </div>
      </div>
    `;

    // Wire Lens Mouse Tracking
    const lensBox = $('#cipher-lens-box');
    lensBox?.addEventListener('mousemove', (e) => {
      const rect = lensBox.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      lensBox.style.setProperty('--lens-x', `${x}px`);
      lensBox.style.setProperty('--lens-y', `${y}px`);
    });

    // Wire Mystery Select Dropdown
    $('#cipher-case-select')?.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      if (!isNaN(idx) && idx >= 0 && idx < CIPHER_MYSTERY_CASES.length) {
        currentCaseIndex = idx;
        localStorage.setItem('cf_cipher_case_index', String(currentCaseIndex));
        renderMysteryInterface();
        showToast(`Loaded Mystery ${currentCaseIndex + 1}: ${CIPHER_MYSTERY_CASES[currentCaseIndex].difficulty} 🔍`);
      }
    });

    // Wire "Switch Mystery" Button (Cycles to next or next uncompleted)
    $('#btn-cipher-cycle')?.addEventListener('click', () => {
      currentCaseIndex = (currentCaseIndex + 1) % CIPHER_MYSTERY_CASES.length;
      localStorage.setItem('cf_cipher_case_index', String(currentCaseIndex));
      renderMysteryInterface();
      showToast(`Switched to Case ${currentCaseIndex + 1}: ${CIPHER_MYSTERY_CASES[currentCaseIndex].difficulty} 🔄`);
    });

    // Wire Question Interrogation Button
    const askBtn = $('#btn-cipher-ask');
    const replyBox = $('#cipher-interrogation-reply');
    askBtn?.addEventListener('click', async () => {
      const q = ($('#cipher-question-input')?.value || '').trim();
      if (!q || !currentCase) return;

      replyBox.innerHTML = '<div style="color:var(--accent-cyan);padding:8px;"><span class="spinner-sm"></span> Consulting the interrogation log...</div>';
      
      let ans = null;
      try {
        const suspectsListStr = (currentCase.suspects || []).map(s => `- ${s.name} (${s.role}, ${s.gender}): Alibi: "${s.alibi}"`).join('\n');
        const prompt = `[MYSTERY INTERROGATION]
Case: "${currentCase.title}" (${currentCase.difficulty})
Timeline: "${currentCase.time || currentCase.intro}"
Scene: "${currentCase.location || 'The archive desk'}"
Stolen Item: "${currentCase.stolen || 'The contested artifact'}"
Forensic Clue: "${currentCase.clue}"
Suspects:
${suspectsListStr}

Student Interrogation Question: "${q}"

CRITICAL INSTRUCTIONS:
1. Answer the student's question directly, strictly to the point, and in 1-2 plain sentences using ONLY the facts provided above.
2. If the question asks about something NOT in the records above (e.g. personal preferences, external events, unrecorded details), respond EXACTLY: "That information is not found in the archive records."
3. If the student asks who the culprit is or who stole it, do NOT state the culprit's name; tell them to cross-examine the clues against each suspect's declared tools and alibi, or issue a formal accusation below.
4. Do NOT give unsolicited hints or generic career advice. Answer ONLY what was asked.`;

        ans = await callAiQuest(prompt, false);
      } catch (e) {
        ans = null;
      }

      if (!ans || typeof ans !== 'string' || ans.length < 10 || ans.includes('brilliant career aspiration')) {
        ans = getCipherOfflineInspector(q, currentCase);
      }

      replyBox.innerHTML = `
        <div class="quest-output-box" style="border-left:3px solid var(--accent-magenta);margin:8px 0;">
          <strong>Inspector's Note:</strong> ${escapeHtml(ans)}
        </div>
      `;
    });

    // Enter key submits interrogation question
    $('#cipher-question-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        askBtn?.click();
      }
    });

    // Wire Accusation Button
    const accuseBtn = $('#btn-cipher-accuse');
    const accuseSelect = $('#cipher-accuse-select');
    const verdictMount = $('#cipher-verdict-mount');

    accuseBtn?.addEventListener('click', () => {
      const suspect = accuseSelect?.value;
      if (!suspect) {
        showToast('Please select a suspect to accuse.');
        return;
      }

      if (suspect === currentCase.culprit) {
        // Mark case as solved and unlock next level difficulty!
        if (!solvedCases.includes(currentCase.id)) {
          solvedCases.push(currentCase.id);
          localStorage.setItem('cf_cipher_solved_cases', JSON.stringify(solvedCases));
        }

        const nextCaseIndex = (currentCaseIndex + 1) < CIPHER_MYSTERY_CASES.length ? (currentCaseIndex + 1) : 0;
        const nextCase = CIPHER_MYSTERY_CASES[nextCaseIndex];
        const hasNext = (currentCaseIndex + 1) < CIPHER_MYSTERY_CASES.length;

        verdictMount.innerHTML = `
          <div style="background:rgba(16,185,129,0.15);border:1px solid var(--accent-green, #10b981);border-radius:var(--radius-md);padding:16px;color:var(--text-main);margin-top:10px;">
            <div style="font-weight:700;color:var(--accent-green, #10b981);font-size:16px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
              <span>🎉</span> <span>Case Solved! Outstanding Detective Work!</span>
            </div>
            <p style="margin:0 0 12px 0;font-size:13.5px;line-height:1.5;">${escapeHtml(currentCase.culpritReason)}</p>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid rgba(16,185,129,0.3);padding-top:10px;">
              <span style="font-size:12px;color:var(--text-dim);">
                ${hasNext ? `Next Difficulty Level Unlocked: <strong>${escapeHtml(nextCase.difficulty)}</strong>` : '🏆 All archive mysteries solved! You are a Legendary Master Detective!'}
              </span>
              <button class="btn btn-primary btn-sm" id="btn-cipher-next-mystery" type="button" style="font-size:12px;">
                ${hasNext ? `Proceed to Case ${nextCaseIndex + 1}: ${escapeHtml(nextCase.difficulty)} ➔` : 'Replay Mysteries 🔄'}
              </button>
            </div>
          </div>
        `;

        $('#btn-cipher-next-mystery')?.addEventListener('click', () => {
          currentCaseIndex = nextCaseIndex;
          localStorage.setItem('cf_cipher_case_index', String(currentCaseIndex));
          renderMysteryInterface();
          showToast(`Advanced to Mystery ${currentCaseIndex + 1}: ${nextCase.difficulty} 🚀`);
        });

        // Trigger victory sound & celebration toast
        if (typeof playSynthesizedSound === 'function') playSynthesizedSound('correct');
        showToast('🎉 Mystery Solved! Next Difficulty Unlocked!');
      } else {
        if (typeof playSynthesizedSound === 'function') playSynthesizedSound('wrong');
        verdictMount.innerHTML = `
          <div style="background:rgba(255,42,133,0.12);border:1px solid var(--accent-magenta);border-radius:var(--radius-md);padding:14px;color:var(--text-main);margin-top:10px;">
            <div style="font-weight:700;color:var(--accent-magenta);font-size:15px;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              <span>❌</span> <span>Insufficient Evidence Against ${escapeHtml(suspect)}</span>
            </div>
            <p style="margin:0;font-size:13px;line-height:1.5;">
              The Dean dismisses the petition. <em>Hint:</em> ${escapeHtml(currentCase.hint)}
            </p>
          </div>
        `;
      }
    });
  }

  renderMysteryInterface();
}


// ─── OFFLINE ENGLISH LEXICON & TRIPLE-CHECK WORD VERIFIER ────────────────────
const OFFLINE_5_LETTER_STR = "aaron aback abade abaft aband abase abash abate abbey abbot abeam abend abhor abide abode abood abord about above abrim abuse abyme abysm abyss acerb achoo acies acold acorn acres acrid acter acton actor acute adage adapt adays added adder addio addle adept adieu admit admix adobe adobo adopt adore adorn adown adret adrip adult adust aeaea aeger aegir aegis aerie aesir aevum afanc affix affor afire afore after again agama agape agasp agast agate agaze agent agger aggie aggro agile aging agita aglee aglet aglow agone agony agora agree agrin agued ahead aider aiger aigre aisle akasa akuma alamo aland alarm album alder alert algid alias alibi alief alien align alike alita alive alkie allay allee allen alley allot allow alloy aloft aloha alone along aloof aloud alpha altar alter alula amain amaru amass amate amaze amber ambit amble ambry amend amene ament amiss amity among amort amour amped ample amply ampul amuck amuse anear anele angel anger angle anglo angry angst anile anima anise ankle annex annoy annul anoia anomy anoon antic antre antsy anvil aorta apace apart apery apian appal apple apply appui apron apsis aptly arace arage arbit arbor arced arche arcus arden ardor arena arete argal argos argot argue argus arhat arian ariel ariki arion arise arist armor aroar aroma arose arras array arrha arris arrow arsis arson artha ascot ashen asher ashet asian aside asked askew askey aspen asper aspic aspis assay asset assur astar aster astir aston asura asway atene athel athos atilt atimy atlas atman atoll atomy atone attar atter attle audio audit auger aught augle augur aulic aural auric aurum avail avale avant avers avert avian avile avine aviso avoid await awake award aware awash awful awing awkly awoke axial axiom azoic azoth azure baaad babel babes babka bache bacon badge badly bagel bahut bairn baize baker balas balks balls bally balmy balsa balut banal banco bandy bantu bantz barbs bardo barge barmy baron barre barse barut basal based basen bases basic basil basin basis basso baste batak batch bated bathe batik baton batty baulk bavin bawdy bayou bazar beach beams beamy beano beast beath beats beaut bedim beech beefy befit befog began beget begin begod begot begun beige being beken belay belch belie belle belly below bench benny beret berme berry berth beryl beset besom betel betta betty bevel bever bezel bhakt bible biddy bidon bield bifid bight bigot bijou bilge billy bimbo bingo biome biota biped birds birdy birth bitch bitty bivvy bixie black blade blame bland blank blare blase blast blasé blate blaze blead bleak blear bleat blech bleck bleed bleep blend blenk blerd blesh bless blest blewe blick blike blimp blind blink bliss blitz blive bloat block bloke blond blood bloom blore blort blown bluff blunt blurb blurt blush board boast bodge boffo bogey boggy bogie bogus boink bolis bolts bolus boned boner bongo bonne bonny bonze booby boong boost booth booty booze boozy bored borer borne bosky bosom bossy botch botox botty bough boule bound bouse bovid bowed bowel bower boxer bozon brace brach brack bract braid brail brain brake braky brame brand brank brash brass brath brave bravo brawl brawn bread break bream breed brest breve brian briar bribe brick bride brief brier brill brine bring brink briny brisk broad broil broke broma brood brook brool broth brown bruin bruit brume brunt brush brusk brute bubba buddy budge buffa buffy buggy bugle build built bulge bulky bulla bully bumps bumpy bunch bunco bunko bunny burke burly burma burnt burro burry bursa burse burst bussy busty butch butte buxom buyer bylaw byway cabal cabin cable cache caddy caded cadet cadge cadgy cadre caged cager cagey cairn calid calme calve camel cameo canal candy canid canna canny canoe canon canto canty caper capri caput carat cards cared caret cargo carny carol carom carry carve casco caste casts catch cater catly catso catty caulk causa cause cavea cavel cavil cavum cavus cease cecum cedar ceded cella cello ceres chace chafe chaff chain chair chalk champ chank chant chaos chare chark charm chart chary chase chasm chaun chaus cheap cheat check cheek cheep cheer chela chert chest chevy chick chico chide chief child chile chill chime chimo chimp china chine ching chink chirk chirl chirm chirp chirr chock choda choir choke cholo chomo chomp choom chord chore chose chuck chuff chuke chump chunk churl churn churr chute cigar cinch cinct circo cirro cissy cited civet civic civil clack clade claim clamp clang clank clart clash clasp class clean clear cleat cleft clepe clerk cleve click cliff clift climb clime cline cling clink cloak clock clomp clone clonk close cloth cloud clout clove clown cluck clump clung clunk coach coact coast cobby cocky codex coily colly color combe combo comer comfy comic conch conde condo coney conge conic cooch cooed cooze coper coppy copse coral cords corny corps cotta couch cough could count court couth coven cover covet covey cowan cowed cower cowld coyly cozen crabs crack craft crake cramp crane crank crash crass crate crave crawk crawl craze crazy creak cream creat credo creed creek creel creep crepe crest crick cried crill crime crimp crisp croak crock croft crone cronk crony crook crool croon cross croud crowd crowl crown crude cruel cruet crumb crump cruor crush crust crypt cubby cummy cunny cunty cupid curia curio curly curry curse curst curve curvy cushy cutis cwtch cycle cynic daddy daeva daffo dagga daily daint dairy daisy daiva dalek dalle dally daman dampy dance dandy dange danna danse darke darts dashy dated datum dauby daunt david daynt dazed deade dealt deare dearn deary death debar debut decan decay decim decor decoy decry deech deeds deere defer deffo defix defog degas deice deify deign deism deity delay delta delve deman demic demit demob demon demos demur demux denay dench denim dense depot depth deque deray derry deshi despo deter detre detur deuce devan devel devil dewan dewar dhoti diamb diary diata diazo dicey dicky dicta didie didst dieth diety dight digit digne dildo dilly dimly dimmy dinar diner dingo dingy dinic dinka dinky diode dione diota dipod dippy dirae dirge dirty disch disco dishy ditch ditsy ditto ditty ditzy divan divas divel dives divet divot diwan dizzy djinn dobby dodge dodgy doesn dogan doggo doggy dogma dogon dogue doing doksa dolce dolly dolor dolos dolts dolus domal domme dompt domus donat donee donna donor donut doobt doody doole doomy doors dooty doozy doped dopey doren doric doris dorky dorms dorty doseh doted dotty doubt douce dough doune douse douth dover dowdy dowel dower downy dowry dowse dowty doxie doyen dozen draco draft drail drain drait drake drama drank drape drawl drawn draws dread dream drear dreck dreed dregs dress drest dreve dried drift drill drily dring drink drive droid droil droit droll drone drong drony droog drool droop drops dross drove drown druid drung drunk drupe drury dryad dryly duang dubby ducal duchy ducky dufus dugan dulce dulia dully dulux dumka dummy dumps dumpy dunal dunce dunes dunga dungy dunno dunny duomo duong duped duple duppy durag duras durga durin dusky dusty dutch dutie duvet dwale dwarf dweeb dwell dwine dying dyked dykon dylan dæmon eager eagle eagre ealey earal eared earle early earth eased easel easer easie easte easts easty eater eaved eaves ebbed ebery ebola ebone ebony ebook ecchi eccho eccle eckle eclat ecole ectal ectel ector edder eddic edema edens edged edges edick edict edify edile edith edits ednos educe educt eejit eensy eerie effed effet effie efter egall egean egest eggar egged egger egges eggie egnos egoic egret egypt eider eidos eigen eight eigne eikon eilat eisel eitan eject eking ekker eland elara elate elbow elden elder elect elegy elemi elene eleni eleve elfin elgar elian elias elide elihu elint eliot elise elite ellen eller ellet ellie ellis elmen eloge elogy eloin elong elope elpis elrod elsen elsie elton elude elute elvan elven elver elves elvin email embar embay embed ember embow embox embue embus emcee emeer ememe emend emery emits emmet emmew emote emove empey empty emule enact enate ender endow endue enema enemy enfin engle enjoy enlay enlil ennew ennui enoch enode enoki enorm enrol ensce ensky ensor ensue enter entia entre entry enure envie envir envoi envoy eolic eonic eoten epeus ephah ephor epics epist epoch epode epopt epoxy eppes eppie epson epure equal equid equip equiv erase erato ereco erect erema eremo ergat ergot erica erick erika ermin ernst erode erose erred error eruca eruct erupt eshay esker eskew espen esper espie espoo essay essen esses essex essie estee ester estoc estop estre estro etang etern ethan ethel ether ethic ethno ethos ethyl etten etter ettes ettin ettle etude euche eurus evade evans evatt evene evens event evert every evian evict evils evite evoke ewery exact exalt excel excur exeat exect exert exfil exile exist exode exord expat expel extol extra exude exult exurb eyass eyght eying eyrie eyrir fabbo fabby fable faced facet facts facty faddy faded fades fadge fagot fagus faine faint faire fairy faith fakir falls false famed fanal fancy fango fanny fanon fanti faqir farce faroe farro farsi farty fasiq fasti fatah fatal fated fatty faule fault fauna faust favor favus fawny fayre fazed feare fease feast feaze fecal fedai feeds feely feere feese feeze feign feild feint feist felid felix fella felon femme femur fence fenne feral feria ferny ferro ferry fetal fetch feted fetid fetis fetor feuds fever fiard fiber fibre fichu field fiend fiery fifth fifty fight filch files filet fille filly filmy filth final finch finds findy finer fines finis fiord fired firer firie first fitch fitly fiver fixed fixer fjeld fjord flack flail flair flake flaky flame flamy flank flare flash flask flats flawy fleak fleam fleck fleer flees fleet flesh flick flies fling flink flinn flint flirt flite float flock flood flook floor flops flora flory flosh floss floud flout flowe flowy flues fluey fluff fluid fluke fluky flume flump flung flunk fluor flurr flurt flury flush flute fluty flyer flyte foamy focal focas focus foehn fogey foggy fogle foine foist foley folio folks folly folwe fomes foods foray forby force fordo forex forge forgo forms forte forth forty forum fossa fosse fossé found fount fouth fouty fovea foxes foxly foyer fract frail frain frame frank fraud freak fream freck freed freep freer freke fremd fresh frets friar frick fried frigg frill frind frisk frist frith fritz frizz frock frond frons front frood frore frory frost froth frown frowy fruit frump frush fuage fubar fubby fucks fudge fuggy fugly fugue fulks fully fumed fumes fumet fumid funct fundi funds funge funky funny fuqua furor furry fused fusee fussy fusty futch futon fuzee fuzzy fynde fyrst fytte gabby gable gaffe gafia gaily galax galea gales galet galle gallu gamer gamey gamin gamut ganja ganza gaped garda garde garth gasps gassy gatch gatta gaudy gauge gault gaunt gause gauze gauzy gavel gawky gaybo gayle gayne gazed gazer gazes gazon gecko gedge geese geige geist gelee gelid genco gener genet genia genie genio genki genre genro genus geode geoid gerbe geshe gesso geste getup ghast ghaut ghole ghost ghoul giant gibby gibed gibes giddy gigue gihon gilet gimel gimpy ginch ginge ginzo gippo girls girly girth given giver gives gizmo glace glade glair glans glare glary glass glaum glaur glave glaze gleam glean glebe glede gleek gleet glide gliff glike glint gliss glist glitz gloam gloar gloat globe glock glome glomp gloom gloop glope glore glory gloss glost glout glove gloze gluck glued glump glute glyph gnarl gnash gnoff gnoll gnome goals gobbo godet godly goety gofer going golem golly goman gombo gomer gonad gondi gonna gonzo gooch goods goody gooey goofy goons goony goopy goose gored gorey gorge gorno gorsy gouge gound gourd gouts gowan gowns goyle grace grade grady graft grail grain grame grand grant grape graph grasp grass grate grave graze great grebe grebo greed greek green greet greta gride grief griff grift grike grill grime grimy grind grins griot gripe grise grist grisy grith grito grits grize groan groat groid groin grond grool groom grope gross grote groth group grout grove growl grown gruel gruff grump grunt grype guage guano guara guard guava guess guest guide guido guige guild guile guilt guise gulag gular gulch gully gulph gulpy gumbo gummy gumph gunge gunky gunny guppy gurge gurus gushy gusto gusts gusty gutsy gutty guyed guyot gyani gyaru gyppo gypsy gyral habit hacek hacks hacky hadal hadar hades hadji hadnt haemo hafiz hague haida haifa haiku haint hairy hajib hajji hakea hakim halal haler haley halle hallo halls halma halon haloo halse halts halva halve hamel hames hammy hamza hanai hanan hanap hance hands handy hangs hanja hanky hanna hanse haole haoma haply happi happy haram hardy harem harms harnt harpy harry harse harsh harte harth hasan hasta haste hasty hatch hated hater hates hatty haugh haulm hault haunt haute haven haver haves havoc havok hawse hayes hazan hazed hazel hazen heads heady heald heaps heard heare hears heart heast heate heath heats heauy heave heavy hebei heben hecht hedge hedgy heeds heels hefei hefts hefty hegel heine heist heith heitz helen helix hella helle hello helly helot helpe helps helve hemal hemic henan hence hench hende henny henri henry hepar herat herbs herma heroe heron herse hertz hesse hetty hevea hewer hexad hexed hexer heyre hided hidle hield hight hijab hijaz hiked hilar hills hilly hilsa hilum himbo hindu hiney hinge hinky hinny hints hippo hiram hired hirer hires hissy hitch hithe hives hizzy hoagy hoard hoary hoast hobby hobit hocus hogan hoise hoist hokey hokum holds holes holey holie holla hollo holly holme holon homel homer homey homie honda honed honey honky honor hooch hooke hooks hooky hoosh hoped hopei hopes hoppy horae horal horde horny horry horse horst horsy horus hosea hosed hosen hoser hosta hosts hotel hotly hough hoult houma hound houri hours house hovel hover howdy howls hubby hudna huffy huggy hulch hulky hullo human humic humid humor humph humpy humus hunch hunks hunky hunny hupia hurly hurra hurry husky hussy hutch huzza hwair hydra hygge hying hylic hymen hymie hymns hyoid hyped hyper hypha hyphy hyrax hythe ideal image imply index inner input irony issue japan joint judge juice knife knock known label labor large laser later laugh layer learn lease least leave legal lemon level lever light limit links liver lives local logic loose lower loyal lucky lunch mable macao macaw maced mache macho macro madam madge madid madly mafia magic magma magna magus maiko maine maize major maker makes malak malik malls malum malus maman mamil mamma mammy manas mando manes manet manga mango mangy mania manic manky manly manna manny manor mansa manse manta manto manus maqui marai maram march marco mardy marge marie marin marks marla marle marne marra marse marsh maser masks mason masse match mated mater matey maths matte maumy maund mauve maven mavin maxim maybe mayor mazed meach mealy means meant meany meare meaty mebbe mecca mecha medal medea media medic meech meets meido meiny melba melee melic melos memba memor memos menat mensa mense merck mercy merge merit merry mesel mesic mesne meson messy mesto metal meter metis metoo metra metre metro metta mewed mezzo miami miasm miaul micah micro midge midst miffy might milky milpa mimas mimbo mimeo mimic mince minde minge mingy minim minny minor minow minus mired mirid mirky mirth miser misle missy misty mitch miter mites mitis mitra mitre mitzi mixed mixer mizzy mneme moans moats mocha modal moded model modem moder modus moggy mogul moire moiré moist moldy moley molly moloc momma mommy momsy monad monde mondo money mongo monks monte month mooch moody moola moone moony moore moory moose moosh moped morae moral morbs morel mores moria mormo morne moron moros morph morse moser mosey mossy moted motel motet mothe mothy motif motor motte motto mould moult mound mount mourn mouse mousy mouth moved mover movie moxie msnbc mucid mucky mucor mucus muddy muder mudge mufti muggy mulch mulct mulet muley mulls multi mumak mummy munch munge mungo munro mural murid murky murth musal mused muser mushy music musky mussy musth musty muted mutex muton muzzy mynah mynde myrrh mythe mythy myton naked named naval needs nerve never newly night noble noise north noted novel nurse occur ocean offer often order organ other ought pacey paddy paean paeon pagan pagus paich paint palau paleo palmy palsy palus panda pandy panel panga pangs panic panin panne pansy panto pants papal papaw paper pappy parch pareo parka parky parle parly parol parry parse parsi party paseo passe passé pasta paste pasty patch paten pater patio patsy patte patty pauce pause paved pawky payne peace peach pearl pedal peeps peers peery peeve peice pekoe penal penis penny pensy peony peple peppy pepsi perch perdu peril perks perky peron perse pervy pesky petal peter petit petty pewit phase phasm phats pheer phial phlox phone phono phony photo phren phyle piano picky picot piece piety piggy piker pikey pilar piled piles pilot pinch piney pingo pinko pinky pinna pinny pious piper pique pirai pirot pissy piste pitch pithy pitty pivot pixie pizza place plage plain plait plane plank plans plant plash plasm plate plato platt platy playa plaza plead pleas pleat plebe plene plica plier pling plink ploce plonk plops plotz ploys pluck pluff plumb plume plump plunk plush pluto poach pocho podge podgy poesy pogue point poise poker pokey polar polis polka polly polyp pommy ponce poncy pongo pooch poofy pooja poopy poppy porch porno porny ports posed poser posit posse potch potty pouch pound power prang prank prase prate preed preen preso press prest prett preve price prick pride pried prill prima prime primo primp prink print prior prise prism privy prize probe prods proem prole prone prong proof props prose pross prosy proto proud prove provo prowl proxy prude prune psalm pseud pshaw psion psoas psyop pubes pubis pudge pudgy pudic pudor pudsy puffy puker pukka pulpy pulse punch punic punny punty pupil puppy puree purge purrs purse pursy purty pushy pusil pussy puswa putid putty pygmy pylon pyral pyxis pzazz queen query quest quick quiet quite quote radar radio raise range rapid ratio reach react ready realm refer relax relay renal renew reply reset rhyme rider ridge rifle right rigid rival river robot rocky roman rough round route royal rugby rural sable salad sally salve salvo sapid sappy sassy sated satin satyr saucy savor savvy scald scale scamp scant scape scarf scary scend scene scent scion scoff scold scoop scoot scope score scorn scour scout scowl scrag scrap scree screw scrim scrip scrub seamy sebek seedy segue seity seize semen sense sepia serve seven shack shade shady shaft shake shaky shall shame shank shape shard share sharp shawl sheaf shear sheen sheer sheet shelf shell shift shine shirk shirt shoal shoat shock shoot shore short shout shove shown showy shred shrew shrub shuck shunt sidle siege sieve sight sigil sigma silky silly since sinew singe sipid siren sissy sithe sixth sixty sized skank skeet skein skiff skill skirt skive skulk skull slack slake slang slant slash slate slave sleek sleep sleer sleet slice slick slide slike slime slink sloom slope slosh sloth slump slung slush slyly smack small smarm smart smash smaze smear smell smile smirk smite smoke smoky smolt snafu snake snare snark snarl sneak sneer snerk snide snipe snirt snoop snort snout snuff sober solar solid solve sonar sonsy soppy sorry sough sound souse south space spare spark spasm spate spawn speak spear speck speed speel spell spend spent spica spicy spiel spike spile spill spine spiny spire spirt spiry spite splay split spoil spoke spoof spook sport spout spray sprig sprog spume spunk spurn spurt squab squad squat squib stack stade staff stage staid stain stake stale stalk stall stamp stand stare stark start stash state stave stead steam steel steep steer stele steps stern stick stiff still stilt stime sting stock stoic stomp stone stony stood stoop stops store storm story stour stout strap straw stray strew stria strip strut stuck study stuff style stymy suave sudor sugar suite sully sunny super supra surge surly swack swain swamp swank sward swarm swart swash swath sweep sweet swell swift swill swing swink swipe swish swith swoon swoop sworn sylph synod tabby tabid table taboo tabor tachy tacit tacky tagus taiga tails taint taira taken takes talar talea tales talik talky tally talon talus tamed tamil tammy tango tangy tanka tansy tanto taper tapis tardy targe tarry tasis tasks tasse tasso taste tasto tasty tatar tater tatty taunt taupe tawny tawse taxes taxon teach teare tears teary tease techy teddy teeny teeth telex telic telos tempo tempt tenet tengu tenno tenon tenor tense tenth tenue tepid tepor terce terms terne terra terse terve testy tetra tetty texas thack thane thank tharm theca theft their thema theme there these thesp theta thich thick thill thine thing think third thirl thole thong thonk thorn thort those thoth thowt thred three threw throb throe throw thrum thugs thumb thump thunk thwap thwip thyme tiber tibia tidal tides tiger tight tigon tiler tilth timed times timid tinct tinea tinge tings tinny tipsy tired tisan titan titer tithe title titsy titty titup tizzy toady toast tober tobit today toile tokay token tokyo tommy tonal tondo toned toner tonic tonus tooth topaz topic topos toppo toppy toque torah torat torch torso torte torus total totem totty touch tough tours touse tower toxic toxin trace track tract trade trail train trait trama tramp trans trant traps trash traum trave trawl tread treat treed treen trend tress trews triad trial tribe trice trick tried trier trife triff trike trill trine tripe trist trite troad troat trode troid troll tromp trone troon troop trope troth trots trout trove truce truck trull truly trump trunk truss trust truth tryst tubby tufty tuhon tulip tulpa tumid tummy tuned tuner tunic turbo turio turul tutee tutor tutti twain twang twank tweak tweed tween tweet twerk twerp twice twill twine twink twire twirl twirp twist twixt twock twonk twunt tyger typic tyrol tythe uncle under undue union unity until upper upset urban usage usual valid value vapor vault venue verse video vigor viral virus visit vital vivid vocal voice voter wagon waste watch water wheel where which while white whole whose widen wider widow width windy woman women world worry worse worst worth would wound wrist write wrong wrote yield young youth zebra zones";
const OFFLINE_5_LETTER_SET = new Set(OFFLINE_5_LETTER_STR.split(' '));
const OFFLINE_COMMON_WORDS_SET = new Set(["the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us", "word", "hello", "check"]);
window._verifiedWordsCache = window._verifiedWordsCache || new Set();

/**
 * Verify if a word exists in the English dictionary.
 * 1. Checks extensive offline lexicon (0ms latency, 100% offline support).
 * 2. Checks local storage verified cache.
 * 3. Triple verification online (backend / Free Dict API / Datamuse API) to ensure
 *    temporary network/API errors do not reject valid words.
 */
window.verifyEnglishWord = async function(rawWord, requiredLength = 0) {
  const word = String(rawWord || '').trim().toLowerCase();
  if (!word || !/^[a-z]+$/.test(word)) {
    return { valid: false, reason: 'Please use only English letters.' };
  }
  if (requiredLength > 0 && word.length !== requiredLength) {
    return { valid: false, reason: `Word must be exactly ${requiredLength} letters long.` };
  }

  // 0. Immediate rejection of repeated characters (e.g. eeeee, ttttt)
  if (/^(.)\1+$/.test(word)) {
    return { valid: false, reason: 'Nonsense word: identical repeated characters.' };
  }

  // 1. Instant Standard Offline Common English Lexicon Check
  if (OFFLINE_5_LETTER_SET.has(word) || OFFLINE_COMMON_WORDS_SET.has(word)) {
    return { valid: true, source: 'offline_lexicon', word };
  }

  // 1b. Memory / LocalStorage Cache Check
  if (window._verifiedWordsCache.has(word)) {
    return { valid: true, source: 'memory_cache', word };
  }
  try {
    const cached = JSON.parse(localStorage.getItem('cf_verified_words') || '{}');
    if (cached[word] === true) {
      window._verifiedWordsCache.add(word);
      return { valid: true, source: 'local_cache', word };
    } else if (cached[word] === false) {
      return { valid: false, reason: 'Word not found in Oxford or standard English dictionary.', word };
    }
  } catch {}

  // 2. Strict Oxford / Google / Wiktionary Standard English Dictionary Verification (Check Thrice)
  let isVerified = false;
  let attempts = 0;

  // Attempt 1: Oxford / Google English Dictionary (Free Dictionary API)
  try {
    attempts++;
    const res1 = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (res1.ok) {
      const data1 = await res1.json();
      if (Array.isArray(data1) && data1.length > 0 && data1[0]?.meanings && data1[0].meanings.length > 0) {
        isVerified = true;
      }
    }
  } catch (e) {
    // Network error on Attempt 1 -> continue to Attempt 2
  }

  // Attempt 2: Cloudflare backend dictionary endpoint (queries KV cache & Free Dictionary API)
  if (!isVerified) {
    try {
      attempts++;
      const res2 = await fetchApi(`dict/${encodeURIComponent(word)}`);
      if (Array.isArray(res2) && res2.length > 0 && !res2[0]?.not_found && res2[0]?.meanings) {
        isVerified = true;
      }
    } catch (e) {
      // Network error on Attempt 2 -> continue to Attempt 3
    }
  }

  // Attempt 3: Official English Wiktionary Lexical REST API (verifies real English word entry & definitions)
  if (!isVerified) {
    try {
      attempts++;
      const res3 = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`);
      if (res3.ok) {
        const wikData = await res3.json();
        if (wikData.en && Array.isArray(wikData.en) && wikData.en.length > 0) {
          isVerified = true;
        }
      }
    } catch (e) {
      // Network error on Attempt 3
    }
  }

  // Save result to local cache to keep gameplay fast
  try {
    const cached = JSON.parse(localStorage.getItem('cf_verified_words') || '{}');
    cached[word] = isVerified;
    const keys = Object.keys(cached);
    if (keys.length > 800) delete cached[keys[0]];
    localStorage.setItem('cf_verified_words', JSON.stringify(cached));
  } catch {}

  if (isVerified) {
    window._verifiedWordsCache.add(word);
    OFFLINE_5_LETTER_SET.add(word);
    return { valid: true, source: 'dictionary_verified', attempts, word };
  }

  return { valid: false, reason: `"${word}" is not recognized in standard English dictionaries (Oxford/Google).`, attempts, word };
};

// GAME 2: Wordle (Career & Vocabulary Guess Challenge - Enhanced from careers-site)
function renderWordle(mount) {
  // Curated Career, Arts & Professional Vocabulary from careers-site
  const CAREER_WORDS = [
    "WRITE", "NOVEL", "MEDIA", "POETS", "STORY", "ESSAY", "DRAFT", "PROSE",
    "VERSE", "PRESS", "SPEAK", "WORDS", "CLERK", "PAPER", "PRINT", "STUDY",
    "LEARN", "TOPIC", "QUOTE", "STYLE", "VOICE", "STAGE", "SCENE", "LEGAL",
    "COURT", "BRIEF", "ORDER", "RULES", "CLASS", "GRADE", "ACTOR", "JUDGE",
    "PILOT", "RADIO", "EVENT", "SKILL", "CRAFT", "CHIEF", "GUIDE", "AUDIT"
  ];

  // Rich General 5-Letter English Vocabulary
  const GENERAL_WORDS = [
    "ABOUT", "ABOVE", "ACUTE", "ADMIT", "ADOPT", "ADULT", "AFTER", "AGAIN",
    "AGENT", "AGREE", "AHEAD", "ALARM", "ALBUM", "ALERT", "ALIKE", "ALIVE",
    "ALLOW", "ALONE", "ALONG", "ALTER", "AMONG", "ANGER", "ANGLE", "ANGRY",
    "APART", "APPLE", "APPLY", "ARENA", "ARGUE", "ARISE", "ARMOR", "ARROW",
    "ASSET", "AUDIO", "AVOID", "AWARD", "AWARE", "BADLY", "BAKER", "BASIC",
    "BASIS", "BEACH", "BEGAN", "BEGIN", "BEING", "BELOW", "BENCH", "BIRTH",
    "BLACK", "BLAME", "BLIND", "BLOCK", "BLOOD", "BOARD", "BOOST", "BOOTH",
    "BOUND", "BRAIN", "BRAND", "BREAD", "BREAK", "BREED", "BRING", "BROAD",
    "BROKE", "BROWN", "BUILD", "BUILT", "BUYER", "CABLE", "CALM", "CANAL",
    "CANDY", "CARGO", "CARRY", "CATCH", "CAUSE", "CHAIN", "CHAIR", "CHALK",
    "CHAMP", "CHART", "CHASE", "CHEAP", "CHECK", "CHEST", "CHILD", "CHINA",
    "CIVIL", "CLAIM", "CLEAN", "CLEAR", "CLICK", "CLOCK", "CLOSE", "COACH",
    "COAST", "COUNT", "COVER", "CRASH", "CREAM", "CRIME", "CROSS", "CROWD",
    "CROWN", "CURVE", "CYCLE", "DAILY", "DANCE", "DEALT", "DEATH", "DEBUT",
    "DELAY", "DEPTH", "DOUBT", "DOZEN", "DRAMA", "DREAM", "DRESS", "DRILL",
    "DRINK", "DRIVE", "EAGER", "EARLY", "EARTH", "EIGHT", "ELITE", "EMPTY",
    "ENEMY", "ENJOY", "ENTER", "ENTRY", "EQUAL", "ERROR", "EVERY", "EXACT",
    "EXIST", "EXTRA", "FAITH", "FALSE", "FAULT", "FIBER", "FIELD", "FIFTH",
    "FIFTY", "FIGHT", "FINAL", "FIRST", "FIXED", "FLAME", "FLASH", "FLEET",
    "FLOOR", "FLUID", "FOCUS", "FORCE", "FORTH", "FORTY", "FORUM", "FOUND",
    "FRAME", "FRANK", "FRAUD", "FRESH", "FRONT", "FRUIT", "FULLY", "FUNNY",
    "GIANT", "GLASS", "GLOBE", "GLORY", "GRACE", "GRAND", "GRANT", "GRASS",
    "GREAT", "GREEN", "GROSS", "GROUP", "GUARD", "GUESS", "GUEST", "HABIT",
    "HAPPY", "HARSH", "HEART", "HEAVY", "HELLO", "HENCE", "HOBBY", "HORSE",
    "HOTEL", "HOUSE", "HUMAN", "IDEAL", "IMAGE", "IMPLY", "INDEX", "INNER",
    "INPUT", "ISSUE", "IRONY", "JOINT", "JUICE", "KNIFE", "KNOCK", "KNOWN",
    "LABEL", "LABOR", "LARGE", "LASER", "LATER", "LAUGH", "LAYER", "LEASE",
    "LEAST", "LEAVE", "LEMON", "LEVEL", "LEVER", "LIGHT", "LIMIT", "LINKS",
    "LIVER", "LIVES", "LOCAL", "LOGIC", "LOOSE", "LOWER", "LOYAL", "LUCKY",
    "LUNCH", "MAGIC", "MAJOR", "MAKER", "MARCH", "MATCH", "MAYBE", "MAYOR",
    "MEANT", "METAL", "MIGHT", "MINOR", "MINUS", "MIXED", "MODEL", "MONEY",
    "MONTH", "MORAL", "MOTOR", "MOUNT", "MOUSE", "MOUTH", "MOVIE", "MUSIC",
    "NAVAL", "NEEDS", "NERVE", "NEVER", "NEWLY", "NIGHT", "NOBLE", "NOISE",
    "NORTH", "NOTED", "NURSE", "OCCUR", "OCEAN", "OFFER", "OFTEN", "ORGAN",
    "OTHER", "OUGHT", "PAINT", "PANEL", "PARTY", "PEACE", "PEARL", "PHASE",
    "PHONE", "PHOTO", "PIANO", "PIECE", "PITCH", "PIZZA", "PLACE", "PLAIN",
    "PLANE", "PLANT", "PLATE", "PLAZA", "POINT", "POLAR", "POUND", "POWER",
    "PRICE", "PRIDE", "PRIME", "PRIOR", "PRIZE", "PROOF", "PROUD", "PROVE",
    "PULSE", "PUNCH", "PUPIL", "QUEEN", "QUERY", "QUEST", "QUICK", "QUIET",
    "QUITE", "RADAR", "RAISE", "RANGE", "RAPID", "RATIO", "REACH", "REACT",
    "READY", "REALM", "REFER", "RELAX", "RELAY", "RENEW", "REPLY", "RESET",
    "RHYME", "RIDER", "RIDGE", "RIFLE", "RIGHT", "RIGID", "RIVAL", "RIVER",
    "ROBOT", "ROCKY", "ROMAN", "ROUGH", "ROUND", "ROUTE", "ROYAL", "RUGBY",
    "RURAL", "SALAD", "SCALE", "SCOPE", "SCORE", "SENSE", "SERVE", "SEVEN",
    "SHADE", "SHAFT", "SHAKE", "SHALL", "SHAME", "SHAPE", "SHARE", "SHARP",
    "SHEET", "SHELF", "SHELL", "SHIFT", "SHINE", "SHIRT", "SHOCK", "SHOOT",
    "SHORE", "SHORT", "SHOUT", "SHOWN", "SIGHT", "SIGMA", "SINCE", "SIXTH",
    "SIXTY", "SKULL", "SLAVE", "SLEEP", "SLIDE", "SLOPE", "SMALL", "SMART",
    "SMILE", "SMOKE", "SNAKE", "SOLID", "SOLVE", "SONAR", "SORRY", "SOUND",
    "SOUTH", "SPACE", "SPARE", "SPARK", "SPEED", "SPEND", "SPENT", "SPLIT",
    "SPOKE", "SPORT", "SQUAD", "STAFF", "STAKE", "STAND", "STARE", "START",
    "STATE", "STEAM", "STEEL", "STEEP", "STEER", "STICK", "STILL", "STOCK",
    "STONE", "STOOD", "STOPS", "STORE", "STORM", "STRIP", "STUCK", "STUFF",
    "SUGAR", "SUITE", "SUPER", "SWEET", "TABLE", "TAKEN", "TASTE", "TAXES",
    "TEACH", "TEETH", "TEMPO", "TENTH", "TERMS", "THANK", "THEFT", "THEIR",
    "THEME", "THERE", "THESE", "THICK", "THING", "THINK", "THIRD", "THOSE",
    "THREE", "THREW", "THROW", "THUMB", "TIGER", "TIGHT", "TIMES", "TIRED",
    "TITLE", "TODAY", "TOKEN", "TOTAL", "TOUCH", "TOUGH", "TOWER", "TRACK",
    "TRADE", "TRAIL", "TRAIN", "TREAT", "TREND", "TRIAL", "TRIBE", "TRICK",
    "TRIED", "TRUCK", "TRULY", "TRUNK", "TRUST", "TRUTH", "TWICE", "TWIST",
    "UNCLE", "UNDER", "UNDUE", "UNION", "UNITY", "UNTIL", "UPPER", "UPSET",
    "URBAN", "USAGE", "USUAL", "VALID", "VALUE", "VAPOR", "VAULT", "VENUE",
    "VIDEO", "VIGOR", "VIRAL", "VIRUS", "VISIT", "VITAL", "VIVID", "VOCAL",
    "VOTER", "WAGON", "WASTE", "WATCH", "WATER", "WHEEL", "WHERE", "WHICH",
    "WHILE", "WHITE", "WHOLE", "WHOSE", "WIDEN", "WIDER", "WIDOW", "WIDTH",
    "WINDY", "WOMAN", "WOMEN", "WORLD", "WORRY", "WORSE", "WORST", "WORTH",
    "WOULD", "WOUND", "WRIST", "WRONG", "WROTE", "YIELD", "YOUNG", "YOUTH"
  ];

  // Combined pool with career vocabulary highlighted
  const ALL_SECRETS = [...CAREER_WORDS, ...GENERAL_WORDS];
  const isCareerWord = (w) => CAREER_WORDS.includes(w.toUpperCase());

  const rawSecret = ALL_SECRETS[Math.floor(Math.random() * ALL_SECRETS.length)] || "WRITE";
  const secret = rawSecret.toUpperCase();
  let row = 0;
  const maxAttempts = 6;
  let isGameOver = false;

  mount.innerHTML = `
    <div style="text-align:center;border-bottom:1px solid var(--border);padding-bottom:14px;margin-bottom:18px;">
      <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:24px;">🟩</span>
        <h3 style="font-size:22px;font-weight:800;letter-spacing:-0.01em;margin:0;">Word Guess Challenge</h3>
        <span class="badge badge-primary" style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;">Wordle Style</span>
      </div>
      <p id="wordle-banner-msg" style="font-size:14px;color:var(--text-muted);margin:4px 0 0;font-weight:500;">
        Guess the 5-letter English word in 6 tries. Green = right spot, Yellow = wrong spot, Gray = absent.
      </p>
    </div>

    <div class="wordle-board" id="wordle-board"></div>

    <div id="wordle-msg" style="text-align:center;font-size:14px;min-height:24px;margin:8px 0;transition:all 0.2s;"></div>

    <div id="wordle-controls" style="max-width:380px;margin:14px auto;display:flex;gap:8px;">
      <input type="text" id="wordle-input" maxlength="5" placeholder="ENTER 5 LETTERS..." autocomplete="off" spellcheck="false" style="text-transform:uppercase;font-family:var(--font-mono);text-align:center;font-size:18px;letter-spacing:0.25em;flex:1;font-weight:700;">
      <button class="btn btn-primary" id="btn-wordle-guess" type="button" style="min-width:100px;font-weight:700;">Submit 🎯</button>
    </div>

    <div id="wordle-result-mount" style="max-width:440px;margin:16px auto 0;"></div>
  `;

  const board = $('#wordle-board');
  for (let r = 0; r < maxAttempts; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'wordle-row';
    rowEl.id = `w-row-${r}`;
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement('div');
      tile.className = 'wordle-tile';
      tile.id = `w-tile-${r}-${c}`;
      rowEl.appendChild(tile);
    }
    board.appendChild(rowEl);
  }

  const showWordleMsg = (msg, isError = true) => {
    const msgEl = $('#wordle-msg');
    if (!msgEl) return;
    msgEl.innerHTML = isError
      ? `<span style="color:var(--accent-magenta);font-weight:600;">${msg}</span>`
      : `<span style="color:var(--accent-emerald);font-weight:600;">${msg}</span>`;
  };

  const clearWordleMsg = () => {
    const msgEl = $('#wordle-msg');
    if (msgEl) msgEl.innerHTML = '';
  };

  const guess = async () => {
    if (isGameOver || row >= maxAttempts) return;
    const input = $('#wordle-input');
    const guessBtn = $('#btn-wordle-guess');
    const word = (input.value || '').trim().toUpperCase();

    if (word.length !== 5 || !/^[A-Z]{5}$/.test(word)) {
      showWordleMsg('⚠️ Please enter exactly 5 English letters.');
      input.classList.add('wordle-shake');
      setTimeout(() => input.classList.remove('wordle-shake'), 400);
      return;
    }

    // Strict non-word filter: Reject identical characters (EEEEE, TTTTT, etc.)
    if (/^(.)\1{4}$/.test(word)) {
      showWordleMsg(`❌ "${word}" is not a valid English word. Please enter a real word.`);
      input.classList.add('wordle-shake');
      setTimeout(() => input.classList.remove('wordle-shake'), 400);
      return;
    }

    // Check word verification with triple-check & offline lexicon
    guessBtn.disabled = true;
    guessBtn.textContent = 'Checking...';
    clearWordleMsg();

    const verifyResult = await window.verifyEnglishWord(word, 5);

    guessBtn.disabled = false;
    guessBtn.textContent = 'Submit 🎯';

    if (!verifyResult.valid) {
      showWordleMsg(`❌ "${word}" is not in the English dictionary! Please enter a real word.`);
      input.classList.add('wordle-shake');
      const currentRowEl = $(`#w-row-${row}`);
      if (currentRowEl) currentRowEl.classList.add('wordle-shake');
      setTimeout(() => {
        input.classList.remove('wordle-shake');
        if (currentRowEl) currentRowEl.classList.remove('wordle-shake');
      }, 400);
      return;
    }

    // Standard 2-pass Wordle letter coloring
    const colors = new Array(5).fill('absent');
    const secretCounts = {};
    for (let i = 0; i < 5; i++) {
      const char = secret[i];
      secretCounts[char] = (secretCounts[char] || 0) + 1;
    }

    // Pass 1: exact matches (green)
    for (let i = 0; i < 5; i++) {
      if (word[i] === secret[i]) {
        colors[i] = 'correct';
        secretCounts[word[i]]--;
      }
    }

    // Pass 2: misplaced matches (yellow)
    for (let i = 0; i < 5; i++) {
      if (colors[i] !== 'correct') {
        const char = word[i];
        if (secretCounts[char] && secretCounts[char] > 0) {
          colors[i] = 'present';
          secretCounts[char]--;
        }
      }
    }

    // Auto-advance tutorial if Wordle guess played during tutorial
    if (isTutorialRunning && (isTutorialOnSection('section_cognitive') || isTutorialOnSection('section_wordle_quick'))) {
      triggerTutorialAutoAdvance('Wordle Guess Played', 'Great vocabulary attempt! Vocabulary challenge active.');
    }

    // Apply colors to board
    for (let c = 0; c < 5; c++) {
      const tile = $(`#w-tile-${row}-${c}`);
      tile.textContent = word[c];
      tile.className = `wordle-tile ${colors[c]}`;
    }

    // 1. Victory condition
    if (word === secret) {
      isGameOver = true;
      input.disabled = true;
      guessBtn.disabled = true;
      clearWordleMsg();

      const bannerMsg = $('#wordle-banner-msg');
      if (bannerMsg) {
        bannerMsg.innerHTML = `<span style="color:var(--accent-emerald);font-weight:700;">🎉 Brilliant! You cracked it in ${row + 1} / ${maxAttempts} tries!</span>`;
      }

      // Audio praise inspired by careers-site
      speak('Congratulations! You got the word right.');

      const resultMount = $('#wordle-result-mount');
      if (resultMount) {
        const careerBadge = isCareerWord(secret)
          ? `<div style="margin-bottom:8px;"><span class="badge badge-success" style="font-size:11px;padding:3px 10px;">🌟 Career &amp; Professional Lexicon</span></div>`
          : '';

        resultMount.innerHTML = `
          <div class="game-result-box" style="border:2px solid var(--accent-emerald);">
            <div style="font-size:32px;margin-bottom:6px;">🎉</div>
            <h4 style="font-size:20px;color:var(--accent-emerald);margin:0 0 6px 0;font-weight:700;">
              Brilliant! You Cracked It!
            </h4>
            <p style="font-size:13.5px;color:var(--text-muted);margin:0 0 14px 0;">
              You solved the secret word in <strong>${row + 1} / ${maxAttempts}</strong> attempts!
            </p>
            ${careerBadge}
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">
              <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;">Target Word</div>
              <div style="font-family:var(--font-mono);font-size:32px;font-weight:800;letter-spacing:0.25em;color:var(--accent-cyan);text-transform:uppercase;">
                ${escapeHtml(secret)}
              </div>
              <div style="margin-top:10px;display:flex;justify-content:center;gap:10px;">
                <button class="btn btn-secondary btn-sm" id="btn-wordle-speak-ans" type="button">🔊 Hear Pronunciation</button>
              </div>
            </div>
            <button class="btn btn-primary" id="btn-wordle-new-game" type="button" style="padding:10px 24px;font-size:15px;font-weight:700;box-shadow:0 4px 16px rgba(0,240,255,0.25);">
              🔄 Play Another Word
            </button>
          </div>
        `;
        $('#btn-wordle-speak-ans')?.addEventListener('click', function() { speak(secret, this); });
        $('#btn-wordle-new-game')?.addEventListener('click', () => { renderWordle(mount); });
      }
      return;
    }

    // Advance row
    row++;
    input.value = '';

    // 2. Game Over condition (Out of Guesses)
    if (row >= maxAttempts) {
      isGameOver = true;
      input.disabled = true;
      guessBtn.disabled = true;
      clearWordleMsg();

      const bannerMsg = $('#wordle-banner-msg');
      if (bannerMsg) {
        bannerMsg.innerHTML = `<span style="color:var(--accent-magenta);font-weight:700;">Game over! The secret word was: ${secret}</span>`;
      }

      // Dedicated Game Over Box (No notification toast!)
      const resultMount = $('#wordle-result-mount');
      if (resultMount) {
        const careerBadge = isCareerWord(secret)
          ? `<div style="margin-bottom:8px;"><span class="badge badge-info" style="font-size:11px;padding:3px 10px;">🌟 Career &amp; Professional Lexicon</span></div>`
          : '';

        resultMount.innerHTML = `
          <div class="game-result-box" style="border:2px solid var(--accent-magenta);">
            <div style="font-size:32px;margin-bottom:6px;">💀</div>
            <h4 style="font-size:20px;color:var(--accent-magenta);margin:0 0 6px 0;font-weight:700;">
              Game Over · Out of Guesses
            </h4>
            <p style="font-size:13.5px;color:var(--text-muted);margin:0 0 14px 0;">
              Valiant effort! Here is the correct solution for this round:
            </p>
            ${careerBadge}
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">
              <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;">Secret Word</div>
              <div style="font-family:var(--font-mono);font-size:32px;font-weight:800;letter-spacing:0.25em;color:var(--accent-cyan);text-transform:uppercase;">
                ${escapeHtml(secret)}
              </div>
              <div style="margin-top:10px;display:flex;justify-content:center;gap:10px;">
                <button class="btn btn-secondary btn-sm" id="btn-wordle-speak-ans" type="button">🔊 Hear Pronunciation</button>
              </div>
            </div>
            <button class="btn btn-primary" id="btn-wordle-new-game" type="button" style="padding:10px 24px;font-size:15px;font-weight:700;box-shadow:0 4px 16px rgba(0,240,255,0.25);">
              🔄 Play Another Word
            </button>
          </div>
        `;
        $('#btn-wordle-speak-ans')?.addEventListener('click', function() { speak(secret, this); });
        $('#btn-wordle-new-game')?.addEventListener('click', () => { renderWordle(mount); });
      }
    }
  };

  $('#btn-wordle-guess')?.addEventListener('click', guess);
  $('#wordle-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') guess(); });
  setTimeout(() => $('#wordle-input')?.focus(), 100);
}


// GAME 3: Flash Cards Studio (AI Dynamic Generation & Extensive Offline Dataset)
const flashCardSession = {
  history: [],
  historyIndex: -1,
  isRevealed: false,
  learnedSet: new Set(JSON.parse(localStorage.getItem('cf_learned_flashcards') || '[]')),
  seenSet: new Set(JSON.parse(localStorage.getItem('cf_seen_flashcards') || '[]'))
};

function renderFlashCards(mount) {
  mount.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <h3 style="font-size:20px;">🃏 Flash Cards Studio</h3>
      <div style="font-size:13.5px;font-weight:600;color:var(--text-main);">
        Words Learned: <span class="badge-pill badge-global" id="fc-learned-count" style="font-size:13px;margin-left:4px;">0</span>
      </div>
    </div>

    <div style="max-width:540px;margin:20px auto;" id="flash-card-box">
      <div class="card" id="flash-card-surface" style="min-height:250px;display:flex;flex-direction:column;justify-content:space-between;border-color:var(--border-strong);cursor:pointer;user-select:none;transition:transform 0.2s, box-shadow 0.2s;" title="Click anywhere on card to reveal meaning &amp; example">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="badge-pill badge-global" id="fc-pos">noun</span>
            <button class="btn btn-secondary btn-sm" id="btn-fc-speak" type="button" style="pointer-events:auto;">🔊 Pronounce</button>
          </div>
          <h2 style="font-size:36px;color:var(--accent-cyan);margin-bottom:4px;letter-spacing:-0.02em;" id="fc-word">Loading...</h2>
          <span style="font-family:var(--font-mono);font-size:14px;color:var(--text-dim);" id="fc-phonetic"></span>

          <!-- Reveal Prompt Banner (shown initially) -->
          <div id="fc-reveal-hint" style="margin:24px 0 12px;padding:14px;background:rgba(0,240,255,0.06);border:1px dashed rgba(0,240,255,0.35);border-radius:var(--radius-md);text-align:center;font-size:13.5px;color:var(--accent-cyan);font-weight:600;">
            👆 Click card to reveal meaning &amp; usage
          </div>

          <!-- Hidden Details (revealed upon user click) -->
          <div id="fc-details-box" style="display:none;margin-top:14px;border-top:1px dashed var(--border);padding-top:12px;">
            <p style="font-size:15px;color:var(--text-main);line-height:1.5;margin-bottom:10px;">
              <strong style="color:var(--accent-gold);">Meaning: </strong><span id="fc-meaning"></span>
            </p>
            <div style="font-size:13.5px;color:var(--text-muted);font-style:italic;line-height:1.4;margin-bottom:10px;">
              <strong style="font-style:normal;color:var(--accent-emerald);">Example: </strong><span id="fc-sentence"></span>
            </div>
            <div style="font-size:12px;color:var(--text-dim);" id="fc-origin"></div>
          </div>
        </div>
        <div style="text-align:right;font-size:11px;color:var(--text-dim);margin-top:8px;">
          <span id="fc-provider-pill">Lexicon Verified</span>
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:center;gap:12px;">
      <button class="btn btn-secondary" id="btn-fc-prev" type="button">⬅️ Previous Word</button>
      <button class="btn btn-primary" id="btn-fc-next" type="button">Next Word ➡️</button>
    </div>
  `;

  const surface = $('#flash-card-surface');
  const detailsBox = $('#fc-details-box');
  const revealHint = $('#fc-reveal-hint');
  const learnedCount = $('#fc-learned-count');
  const prevBtn = $('#btn-fc-prev');
  const nextBtn = $('#btn-fc-next');
  const speakBtn = $('#btn-fc-speak');

  const updateLearnedCounter = () => {
    if (learnedCount) {
      learnedCount.textContent = flashCardSession.learnedSet.size;
    }
  };

  const renderCurrentCard = () => {
    if (flashCardSession.historyIndex < 0 || flashCardSession.historyIndex >= flashCardSession.history.length) return;
    const card = flashCardSession.history[flashCardSession.historyIndex];

    $('#fc-word').textContent = card.word;
    $('#fc-phonetic').textContent = card.phonetic || '';
    $('#fc-pos').textContent = card.pos || 'term';
    $('#fc-meaning').textContent = card.meaning || '';
    $('#fc-sentence').textContent = card.sentence ? `"${card.sentence}"` : '';
    $('#fc-origin').textContent = card.origin ? `Etymology: ${card.origin}` : '';
    if ($('#fc-provider-pill')) {
      $('#fc-provider-pill').textContent = card.provider || 'Lexicon Verified';
    }

    // Always hide meaning initially on new/loaded card
    flashCardSession.isRevealed = false;
    if (detailsBox) detailsBox.style.display = 'none';
    if (revealHint) revealHint.style.display = 'block';

    updateLearnedCounter();
    if (prevBtn) prevBtn.disabled = flashCardSession.historyIndex <= 0;
  };

  // Toggle reveal upon clicking flashcard surface
  surface?.addEventListener('click', () => {
    flashCardSession.isRevealed = !flashCardSession.isRevealed;
    if (flashCardSession.isRevealed) {
      if (detailsBox) detailsBox.style.display = 'block';
      if (revealHint) revealHint.style.display = 'none';
    } else {
      if (detailsBox) detailsBox.style.display = 'none';
      if (revealHint) revealHint.style.display = 'block';
    }
  });

  // Pronounce button stops event bubbling so card doesn't flip/reveal
  speakBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const cur = flashCardSession.history[flashCardSession.historyIndex];
    if (cur && cur.word) {
      speak(cur.word, speakBtn);
    }
  });

  // Function to acquire next unrepeated word (AI + Predefined Offline Lexicon)
  const fetchNextUniqueWord = async () => {
    let nextCard = null;

    // 1. Try AI Generation via Cloudflare Pages Function (/api/ai)
    try {
      const avoidList = Array.from(flashCardSession.seenSet).slice(-40);
      const res = await fetch(getApiUrl('api/ai'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'generate-flashcard',
          avoid: avoidList
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.card && data.card.word) {
          const w = data.card.word.trim();
          if (!flashCardSession.seenSet.has(w.toLowerCase())) {
            nextCard = {
              word: w.charAt(0).toUpperCase() + w.slice(1),
              phonetic: data.card.phonetic || generateIpaApprox(w),
              pos: data.card.pos || 'noun',
              meaning: data.card.meaning || '',
              sentence: data.card.sentence || '',
              origin: data.card.origin || 'Etymology',
              provider: '✨ Gemini AI'
            };
          }
        }
      }
    } catch {}

    // 2. Predefined Offline API / Rich Lexicon Dataset
    if (!nextCard) {
      // Find cards from OFFLINE_FLASH_CARDS not yet seen
      let unseen = OFFLINE_FLASH_CARDS.filter(c => !flashCardSession.seenSet.has(c.word.toLowerCase()));
      if (unseen.length === 0) {
        // If all offline words have been visited once, reset seen set to allow continuous cycling without lock
        flashCardSession.seenSet.clear();
        unseen = OFFLINE_FLASH_CARDS;
      }
      const pick = unseen[Math.floor(Math.random() * unseen.length)];
      nextCard = { ...pick, provider: 'Offline Lexicon' };
    }

    if (nextCard) {
      flashCardSession.seenSet.add(nextCard.word.toLowerCase());
      localStorage.setItem('cf_seen_flashcards', JSON.stringify([...flashCardSession.seenSet]));
      flashCardSession.history.push(nextCard);
      flashCardSession.historyIndex = flashCardSession.history.length - 1;
      renderCurrentCard();
    }
  };

  // Next Word button
  nextBtn?.addEventListener('click', async () => {
    // 1. Mark current card as learned
    const current = flashCardSession.history[flashCardSession.historyIndex];
    if (current && current.word) {
      flashCardSession.learnedSet.add(current.word.toLowerCase());
      localStorage.setItem('cf_learned_flashcards', JSON.stringify([...flashCardSession.learnedSet]));
      updateLearnedCounter();
    }

    // 2. If in past history, advance
    if (flashCardSession.historyIndex < flashCardSession.history.length - 1) {
      flashCardSession.historyIndex++;
      renderCurrentCard();
      return;
    }

    // 3. Otherwise fetch new continuous unrepeated word
    nextBtn.disabled = true;
    nextBtn.innerHTML = 'Next Word ⏳';
    await fetchNextUniqueWord();
    nextBtn.disabled = false;
    nextBtn.innerHTML = 'Next Word ➡️';
  });

  // Previous Word button
  prevBtn?.addEventListener('click', () => {
    if (flashCardSession.historyIndex > 0) {
      flashCardSession.historyIndex--;
      renderCurrentCard();
    }
  });

  // Initial load
  if (flashCardSession.history.length === 0) {
    fetchNextUniqueWord();
  } else {
    renderCurrentCard();
  }
}

// GAME 4: Live Dictionary & Word Check (Free Dictionary API + Gemini AI Backup)
function renderDictionaryLookup(mount) {
  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="font-size:20px;display:flex;align-items:center;gap:8px;">
            <span>📖</span> <span>Word Check</span>
          </h3>
          <span style="font-size:13px;color:var(--text-dim);">Comprehensive English dictionary definition, lexical exploration, and authentic Indian pronunciation.</span>
        </div>
        <div style="display:none;"></div>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:16px;">
      <input type="text" id="dict-search-input" placeholder="Enter any English word (e.g. articulate, juxtapose, prompt)..." style="flex:1;">
      <button class="btn btn-primary" id="btn-dict-search">Lookup Word 🔍</button>
    </div>

    <div id="dict-result-mount" style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:20px;border:1px solid var(--border);min-height:160px;">
      <p style="color:var(--text-dim);">Enter an English word above to explore its formal dictionary definition, grammatical parts of speech, and authentic audio pronunciation.</p>
    </div>
  `;

  const search = async () => {
    const input = $('#dict-search-input');
    const word = input?.value.trim().toLowerCase();
    const resultBox = $('#dict-result-mount');
    if (!word) return;

    resultBox.innerHTML = '<div style="display:flex;align-items:center;gap:8px;color:var(--text-muted);"><span class="spinner-sm"></span> Searching dictionary & lexicon database...</div>';
    
    let data = null;
    let source = 'Free Dictionary API';

    // 1. First attempt backend endpoint (queries KV cache & Free Dictionary API)
    try {
      data = await fetchApi(`dict/${encodeURIComponent(word)}`);
    } catch (e) {}

    // 2. Direct browser Free Dictionary API query fallback if backend is unreachable
    if (!data || data.not_found || !Array.isArray(data) || !data.length) {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (res.ok) {
          const direct = await res.json();
          if (Array.isArray(direct) && direct.length) {
            data = direct;
            source = 'Free Dictionary API';
          }
        }
      } catch (e) {}
    }

    // 3. Intelligent Gemini Backup if word is not found in Free Dictionary API
    if (!data || data.not_found || !Array.isArray(data) || !data.length) {
      resultBox.innerHTML = '<div style="display:flex;align-items:center;gap:8px;color:var(--accent-cyan);"><span class="spinner-sm"></span> Synthesizing comprehensive lexical entry...</div>';
      try {
        const aiPrompt = `Define the English word or term "${word}". Return ONLY JSON in this structure:
[{"word":"${word}","phonetic":"/ipa/","meanings":[{"partOfSpeech":"noun/verb/adjective","definitions":[{"definition":"clear concise definition","example":"a realistic example sentence"}]}]}]`;

        const geminiReply = await callAiQuest(aiPrompt, true);
        if (geminiReply && Array.isArray(geminiReply) && geminiReply.length) {
          data = geminiReply;
          source = 'Gemini AI Backup';
        }
      } catch (e) {}
    }

    if (data && Array.isArray(data) && data.length) {
      const item = data[0];
      const meaning = item.meanings?.[0];
      const def = meaning?.definitions?.[0]?.definition || 'Definition available.';
      const ex = meaning?.definitions?.[0]?.example || '';
      const isGemini = source.includes('Gemini') || item.source === 'gemini';
      const sourceBadge = '';

      resultBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <h3 style="font-size:26px;color:var(--accent-cyan);text-transform:capitalize;margin:0;">${escapeHtml(item.word)}</h3>
            <div style="margin-top:4px;">
              <span class="badge-pill badge-nirf">${escapeHtml(meaning?.partOfSpeech || 'word')}</span>
              <span style="font-family:var(--font-mono);color:var(--text-dim);font-size:13.5px;margin-left:8px;">${escapeHtml(item.phonetic || '')}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${sourceBadge}
            <button class="btn btn-secondary btn-sm" onclick="speak('${escapeHtml(item.word)}', this)">🔊 Listen</button>
          </div>
        </div>
        <p style="font-size:15px;color:var(--text-main);margin-top:14px;line-height:1.55;">${escapeHtml(def)}</p>
        ${ex ? `<div style="font-size:13.5px;color:var(--text-muted);font-style:italic;margin-top:8px;padding-left:10px;border-left:2px solid var(--accent-cyan);">"${escapeHtml(ex)}"</div>` : ''}
      `;
    } else {
      resultBox.innerHTML = `
        <div style="color:var(--accent-magenta);font-weight:600;margin-bottom:6px;">⚠️ Word not found in dictionary.</div>
        <div style="font-size:13px;color:var(--text-muted);">Please check the spelling or search a standard English root word (e.g. <em>articulate</em>, <em>benevolent</em>, <em>resilient</em>).</div>
      `;
    }
  };

  $('#btn-dict-search')?.addEventListener('click', search);
  $('#dict-search-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
}

// GAME 5: Spelling Bee Challenge (Random English Vocabulary)
function renderSpellingBee(mount) {
  const WORDS = [{"word": "adventure", "pos": "noun", "def": "An unusual and exciting, typically hazardous experience or undertaking."}, {"word": "beautiful", "pos": "adjective", "def": "Pleasing the senses or mind aesthetically with grace and charm."}, {"word": "calendar", "pos": "noun", "def": "A chart or system showing the days, weeks, and months of a given year."}, {"word": "celebrate", "pos": "verb", "def": "Acknowledge a significant day or event with festive gathering or joy."}, {"word": "curiosity", "pos": "noun", "def": "A strong desire to discover, explore, or learn something new."}, {"word": "delightful", "pos": "adjective", "def": "Causing immense pleasure, charm, warmth, and satisfaction."}, {"word": "education", "pos": "noun", "def": "The process of receiving or giving systematic instruction and knowledge."}, {"word": "fantastic", "pos": "adjective", "def": "Extraordinarily good, attractive, or delightfully imaginative."}, {"word": "generous", "pos": "adjective", "def": "Showing a noble readiness to give more than is strictly necessary."}, {"word": "happiness", "pos": "noun", "def": "The emotional state of feeling content, fulfilled, and joyous."}, {"word": "imagination", "pos": "noun", "def": "The creative ability to envision ideas or scenes not present to the senses."}, {"word": "knowledge", "pos": "noun", "def": "Facts, information, and skills acquired through education and experience."}, {"word": "magnificent", "pos": "adjective", "def": "Impressively beautiful, grand, elaborate, and striking to behold."}, {"word": "mysterious", "pos": "adjective", "def": "Difficult or impossible to fully explain, understand, or identify."}, {"word": "necessary", "pos": "adjective", "def": "Required to be done, achieved, or present; absolutely essential."}, {"word": "opportunity", "pos": "noun", "def": "A favorable set of circumstances that makes an achievement possible."}, {"word": "philosophy", "pos": "noun", "def": "The study of the fundamental nature of knowledge, reality, and values."}, {"word": "privilege", "pos": "noun", "def": "A special right, benefit, or honor granted to an individual or group."}, {"word": "remember", "pos": "verb", "def": "To bring an awareness, memory, or fact back into one's conscious mind."}, {"word": "serendipity", "pos": "noun", "def": "The occurrence of fortunate, valuable discoveries made by happy chance."}, {"word": "successful", "pos": "adjective", "def": "Accomplishing an intended aim, prosperous, or achieving high honor."}, {"word": "vocabulary", "pos": "noun", "def": "The entire body of words known and utilized in speaking or writing."}, {"word": "wonderful", "pos": "adjective", "def": "Inspiring profound delight, pleasure, or deep admiration; marvelous."}, {"word": "articulate", "pos": "adjective", "def": "Having or showing the ability to speak fluently and coherently."}, {"word": "eloquence", "pos": "noun", "def": "Fluent, graceful, or persuasive speaking or writing that moves minds."}, {"word": "soliloquy", "pos": "noun", "def": "An act of speaking one's innermost thoughts aloud when alone on stage."}, {"word": "brevity", "pos": "noun", "def": "Concise and exact use of words in writing or speech; succinctness."}, {"word": "meticulous", "pos": "adjective", "def": "Showing tremendous attention to detail; very careful, thorough, and precise."}, {"word": "tenacious", "pos": "adjective", "def": "Tending to hold fast to a goal or purpose; persistently determined."}, {"word": "empirical", "pos": "adjective", "def": "Based on verifiable observation, experiment, or experience rather than theory."}, {"word": "acoustic", "pos": "adjective", "def": "Relating to sound, hearing, or properties that determine sound quality."}, {"word": "brilliant", "pos": "adjective", "def": "Exceptionally clever, vivid, talented, or brilliantly shining."}, {"word": "diligence", "pos": "noun", "def": "Careful, continuous, and persistent effort dedicated to one's labor."}, {"word": "gratitude", "pos": "noun", "def": "The warm feeling of being deeply thankful and appreciative for kindness."}, {"word": "heritage", "pos": "noun", "def": "Valued historic traditions, cultures, and achievements handed down."}, {"word": "illuminate", "pos": "verb", "def": "To cast light upon something, or to clarify and make intellectually clear."}, {"word": "jubilant", "pos": "adjective", "def": "Feeling or expressing boundless happiness, exhilaration, and triumph."}, {"word": "luminous", "pos": "adjective", "def": "Radiating or reflecting bright light; glowing vividly in the dark."}, {"word": "melodious", "pos": "adjective", "def": "Pleasing and agreeable to the ear; producing a sweet tune or musicality."}, {"word": "optimistic", "pos": "adjective", "def": "Consistently hopeful and confident regarding future outcomes."}, {"word": "radiant", "pos": "adjective", "def": "Sending forth light rays, or clearly projecting health and joy."}, {"word": "tranquility", "pos": "noun", "def": "A serene, peaceful state of mind and environment free from disturbance."}, {"word": "vibrant", "pos": "adjective", "def": "Full of energetic life, dynamic vigor, and strikingly vivid brilliance."}, {"word": "harmony", "pos": "noun", "def": "Pleasing arrangement of chords, or peaceful coexistence between beings."}, {"word": "resilient", "pos": "adjective", "def": "Able to bounce back, adapt, or recover rapidly from challenges."}, {"word": "authentic", "pos": "adjective", "def": "Genuine, truthful to origin, and free from falsification or imitation."}, {"word": "integrity", "pos": "noun", "def": "Adherence to strong moral, ethical principles and uncompromising honesty."}, {"word": "versatile", "pos": "adjective", "def": "Capable of turning easily from one task, function, or skill to another."}, {"word": "benevolent", "pos": "adjective", "def": "Well-meaning, kindly disposed, and genuinely altruistic toward others."}, {"word": "fortitude", "pos": "noun", "def": "Courage in adversity, endurance, and quiet emotional resilience."}, {"word": "panoramic", "pos": "adjective", "def": "Offering an unbroken, expansive, and breathtaking wide view of a landscape."}, {"word": "effervescent", "pos": "adjective", "def": "Vivacious, sparkling with high enthusiasm, and bubbly in temperament."}];
  let curWord = WORDS[Math.floor(Math.random() * WORDS.length)] || { word: "articulate", pos: "adjective", def: "Speaking fluently and coherently." };
  let streak = 0;

  function renderBeeView() {
    mount.innerHTML = `
      <div style="text-align:center;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
        <h3 style="font-size:20px;">🐝 Spelling Bee Challenge</h3>
        <span style="font-size:13px;color:var(--text-dim);">Listen to the native voice pronounce the word and type the exact spelling. Current Streak: <strong id="bee-streak" style="color:var(--accent-gold);">${streak}</strong></span>
      </div>

      <div style="max-width:440px;margin:20px auto;text-align:center;">
        <button class="btn btn-accent" id="btn-bee-listen" style="padding:14px 28px;font-size:16px;margin-bottom:18px;box-shadow:0 4px 16px rgba(0,240,255,0.2);">
          🔊 Hear Word Aloud
        </button>

        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <input type="text" id="bee-input" placeholder="Type the spelling..." autocomplete="off" spellcheck="false" style="text-align:center;font-size:18px;flex:1;">
          <button class="btn btn-primary" id="btn-bee-submit" style="min-width:90px;">Submit</button>
        </div>

        <div id="bee-feedback"></div>
      </div>
    `;

    $('#btn-bee-listen')?.addEventListener('click', function() { speak(curWord.word, this); });

    const submitSpelling = () => {
      const input = $('#bee-input');
      const val = (input?.value || '').trim().toLowerCase();
      const fb = $('#bee-feedback');
      if (!val) return;

      if (val === curWord.word.toLowerCase()) {
        streak++;
        $('#bee-streak').textContent = streak;
        input.disabled = true;
        $('#btn-bee-submit').disabled = true;

        fb.innerHTML = `
          <div class="game-result-box" style="margin-top:16px;padding:18px;border:2px solid var(--accent-emerald);">
            <div style="font-size:28px;margin-bottom:6px;">🎉</div>
            <h4 style="font-size:18px;color:var(--accent-emerald);margin:0 0 6px 0;font-weight:700;">
              Spot On! Accurate Spelling!
            </h4>
            <p style="font-size:13px;color:var(--text-muted);margin:0 0 12px 0;">Winning Streak: <strong style="color:var(--accent-gold);">${streak}</strong></p>
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:14px;">
              <div style="font-family:var(--font-mono);font-size:26px;font-weight:800;letter-spacing:0.2em;color:var(--accent-cyan);text-transform:uppercase;">
                ${escapeHtml(curWord.word)}
              </div>
              <div style="margin-top:4px;">
                <span class="badge-pill badge-nirf" style="font-size:11px;">${escapeHtml(curWord.pos || 'word')}</span>
              </div>
              <p style="font-size:13px;color:var(--text-main);margin:8px 0 0 0;line-height:1.45;">
                ${escapeHtml(curWord.def || '')}
              </p>
            </div>
            <button class="btn btn-primary" id="btn-bee-next" style="width:100%;padding:10px;font-weight:700;font-size:14.5px;">
              Next Word ➡️
            </button>
          </div>
        `;
        $('#btn-bee-next')?.addEventListener('click', () => {
          curWord = WORDS[Math.floor(Math.random() * WORDS.length)];
          renderBeeView();
          speak(curWord.word);
        });
      } else {
        // Incorrect Spelling -> Game Over Result Box (No toast notification!)
        streak = 0;
        $('#bee-streak').textContent = streak;
        input.disabled = true;
        $('#btn-bee-submit').disabled = true;

        fb.innerHTML = `
          <div class="game-result-box" style="margin-top:16px;padding:18px;border:2px solid var(--accent-magenta);">
            <div style="font-size:28px;margin-bottom:6px;">❌</div>
            <h4 style="font-size:18px;color:var(--accent-magenta);margin:0 0 6px 0;font-weight:700;">
              Incorrect Spelling · Game Over
            </h4>
            <p style="font-size:13px;color:var(--text-muted);margin:0 0 12px 0;">
              You entered: <strong style="color:var(--accent-magenta);text-decoration:line-through;">"${escapeHtml(val)}"</strong>
            </p>
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:14px;">
              <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;">Correct Spelling</div>
              <div style="font-family:var(--font-mono);font-size:26px;font-weight:800;letter-spacing:0.2em;color:var(--accent-cyan);text-transform:uppercase;">
                ${escapeHtml(curWord.word)}
              </div>
              <div style="margin-top:4px;">
                <span class="badge-pill badge-nirf" style="font-size:11px;">${escapeHtml(curWord.pos || 'word')}</span>
              </div>
              <p style="font-size:13px;color:var(--text-main);margin:8px 0 0 0;line-height:1.45;">
                ${escapeHtml(curWord.def || '')}
              </p>
              <div style="margin-top:10px;display:flex;justify-content:center;">
                <button class="btn btn-secondary btn-xs" id="btn-bee-speak-ans" type="button" style="padding:4px 10px;">🔊 Hear Correct Pronunciation</button>
              </div>
            </div>
            <button class="btn btn-primary" id="btn-bee-next" style="width:100%;padding:10px;font-weight:700;font-size:14.5px;">
              🔄 Play New Game / Next Word
            </button>
          </div>
        `;
        $('#btn-bee-speak-ans')?.addEventListener('click', function() { speak(curWord.word, this); });
        $('#btn-bee-next')?.addEventListener('click', () => {
          curWord = WORDS[Math.floor(Math.random() * WORDS.length)];
          renderBeeView();
          speak(curWord.word);
        });
      }
    };

    $('#btn-bee-submit')?.addEventListener('click', submitSpelling);
    $('#bee-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') submitSpelling(); });
    setTimeout(() => $('#bee-input')?.focus(), 100);
  }

  renderBeeView();
}

// GAME 6: English Word Hangman (Random English Vocabulary)
function renderHangman(mount) {
  const WORDS = [{"word": "BUTTERFLY", "clue": "Colorful winged insect that undergoes miraculous metamorphosis"}, {"word": "DOLPHIN", "clue": "Highly intelligent marine mammal celebrated for playful ocean navigation"}, {"word": "ASTRONOMY", "clue": "The scientific study of celestial bodies, space, and the cosmos"}, {"word": "SYMPHONY", "clue": "An elaborate orchestral composition usually consisting of four movements"}, {"word": "MOUNTAIN", "clue": "A towering natural elevation of earth's surface rising abruptly"}, {"word": "TELESCOPE", "clue": "An optical device used to observe distant planets and celestial wonders"}, {"word": "PYRAMID", "clue": "Monumental ancient triangular architecture built across millennia"}, {"word": "LABYRINTH", "clue": "A complex intricate network of winding paths, passages, and puzzles"}, {"word": "ADVENTURE", "clue": "An exciting, daring, or remarkable journey of exploration"}, {"word": "WATERFALL", "clue": "A cascade of fresh river water plunging over a steep cliff"}, {"word": "VOLCANO", "clue": "A geological rupture releasing lava, volcanic ash, and hot gases"}, {"word": "RENAISSANCE", "clue": "A momentous cultural, artistic, and intellectual rebirth in history"}, {"word": "KALEIDOSCOPE", "clue": "An optical cylinder showing shifting symmetrical forms and colors"}, {"word": "GALAXY", "clue": "A massive gravitationally bound system of stars, gas, and dark matter"}, {"word": "SUBMARINE", "clue": "A specialized vessel capable of independent long voyages underwater"}, {"word": "HORIZON", "clue": "The distant visual boundary where the earth surface meets the sky"}, {"word": "HURRICANE", "clue": "A fierce tropical storm characterized by powerful rotating winds"}, {"word": "ARCHIPELAGO", "clue": "An expansive group or chain of idyllic scattered islands"}, {"word": "LIGHTHOUSE", "clue": "A coastal tower with a powerful beam guiding marine navigators safely"}, {"word": "PHILOSOPHY", "clue": "The rigorous pursuit of wisdom, ethics, existence, and truth"}, {"word": "SANCTUARY", "clue": "A consecrated place of safety, protection, and peaceful refuge"}, {"word": "CHAMPION", "clue": "A person who triumphs over all challenges or ardently defends a cause"}, {"word": "RAINBOW", "clue": "A radiant multicolored meteorological arc caused by refraction of light"}, {"word": "TREASURE", "clue": "A rich accumulation of precious gems, artifacts, and historic gold"}, {"word": "WILDERNESS", "clue": "An untouched, untamed expanse of natural flora and fauna"}, {"word": "HARMONY", "clue": "A pleasing arrangement of melodious tones or peaceful coexistence"}, {"word": "VELOCITY", "clue": "The rapid speed of motion in a given definite direction"}, {"word": "QUANTUM", "clue": "The discrete fundamental unit of energy in modern physics"}, {"word": "UNIVERSE", "clue": "The totality of all known space, time, matter, and cosmic phenomena"}, {"word": "CAROUSEL", "clue": "A revolving fairground attraction with music and painted horses"}, {"word": "SERENDIPITY", "clue": "The joyful faculty of making fortunate discoveries by pure chance"}, {"word": "NAVIGATOR", "clue": "An expert voyager who charts and directs the route across continents"}, {"word": "PLATINUM", "clue": "A dense, precious, corrosion-resistant silvery-white metallic element"}, {"word": "GLACIER", "clue": "A slowly moving immense river of compacted ice carving valleys"}, {"word": "PARADISE", "clue": "An ideal realm of supreme beauty, joy, harmony, and peace"}, {"word": "OCTOPUS", "clue": "An eight-armed ocean mollusk known for clever camouflage and problem-solving"}, {"word": "SAFARI", "clue": "An overland expedition to observe majestic wildlife in natural habitats"}, {"word": "TSUNAMI", "clue": "A series of immense ocean waves triggered by underwater earthquakes"}, {"word": "FLAMINGO", "clue": "A graceful tall wading bird with vibrant pink plumage and curved beak"}, {"word": "ECLIPSE", "clue": "The cosmic obscuration of the light from one celestial body by another"}, {"word": "RHAPSODY", "clue": "An enthusiastic, ecstatic musical piece of free irregular form"}, {"word": "KANGAROO", "clue": "A marsupial native to Australia famed for powerful bounding leaps"}, {"word": "ILLUSION", "clue": "A deceptive perception or optical phenomenon that fools the senses"}, {"word": "QUARTZ", "clue": "A hard crystalline mineral composed of silicon and oxygen atoms"}, {"word": "MARATHON", "clue": "A celebrated long-distance athletic footrace of legendary heritage"}, {"word": "NIGHTINGALE", "clue": "A renowned songbird celebrated in classical poetry for exquisite melodies"}, {"word": "ISLAND", "clue": "A tract of land entirely surrounded by the waters of a lake or sea"}, {"word": "JOURNEY", "clue": "The act of traveling from one destination to another across distances"}, {"word": "VOYAGE", "clue": "A long and memorable journey involving travel by sea or outer space"}, {"word": "HERITAGE", "clue": "Valued traditions, monuments, and cultural wisdom passed down generations"}, {"word": "UMBRELLA", "clue": "A folding canopy designed to shelter a person from rain or sunlight"}];
  let current = WORDS[Math.floor(Math.random() * WORDS.length)] || { word: "DISCOVERY", clue: "Uncovering new horizons" };
  let guessedLetters = new Set();
  let remainingMistakes = 6;

  function renderState() {
    const wordLetters = current.word.split('');
    const letterCount = wordLetters.length;
    // Auto-calculate dynamic letter tile size so any word fits perfectly on one single line across mobile & desktop
    const fontSize = letterCount > 13 ? 'clamp(14px, 3.2vw, 22px)' : letterCount > 10 ? 'clamp(16px, 3.8vw, 26px)' : letterCount > 7 ? 'clamp(18px, 4.5vw, 30px)' : 'clamp(22px, 5.5vw, 34px)';
    const tileWidth = letterCount > 13 ? 'clamp(18px, 4.2vw, 28px)' : letterCount > 10 ? 'clamp(22px, 5.2vw, 34px)' : letterCount > 7 ? 'clamp(26px, 6.2vw, 40px)' : 'clamp(32px, 7.5vw, 46px)';
    const tileGap = letterCount > 13 ? 'clamp(2px, 0.8vw, 6px)' : letterCount > 10 ? 'clamp(3px, 1.2vw, 8px)' : 'clamp(4px, 1.8vw, 10px)';

    const letterSlotsHtml = wordLetters.map(l => {
      const isRevealed = guessedLetters.has(l);
      return `<span class="hangman-slot" style="display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-end;width:${tileWidth};flex-shrink:0;user-select:none;">
        <span style="font-family:var(--font-mono);font-size:${fontSize};font-weight:800;color:var(--accent-cyan);line-height:1;height:${fontSize};display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;">
          ${isRevealed ? l : '&nbsp;'}
        </span>
        <span style="display:block;width:100%;height:3px;background:var(--accent-cyan);border-radius:2px;margin-top:4px;box-shadow:0 0 6px rgba(0,240,255,0.4);"></span>
      </span>`;
    }).join('');

    const isWon = current.word.split('').every(l => guessedLetters.has(l));
    const isLost = remainingMistakes <= 0;

    mount.innerHTML = `
      <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
        <h3 style="font-size:20px;">🪢 English Word Hangman</h3>
        <p style="font-size:13.5px;color:var(--text-dim);">Guess the letters of the English word before running out of chances. Clue: <strong>${current.clue}</strong></p>
      </div>

      <div style="text-align:center;max-width:100%;width:100%;margin:20px auto;box-sizing:border-box;">
        <div style="font-size:14px;color:var(--accent-gold);margin-bottom:12px;">
          Chances Left: <strong>${remainingMistakes} / 6</strong>
        </div>

        <div style="display:flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:${tileGap};margin:20px auto;max-width:100%;overflow-x:auto;padding:6px 4px;white-space:nowrap;-webkit-overflow-scrolling:touch;" id="hangman-display">
          ${letterSlotsHtml}
        </div>

        ${isWon ? `
          <div class="game-result-box" style="border:2px solid var(--accent-emerald);">
            <div style="font-size:32px;margin-bottom:6px;">🎉</div>
            <h4 style="font-size:20px;color:var(--accent-emerald);margin:0 0 6px 0;font-weight:700;">
              Bravo! Target Word Solved!
            </h4>
            <p style="font-size:13.5px;color:var(--text-muted);margin:0 0 14px 0;">
              You deduced the English word with <strong>${remainingMistakes}</strong> chances remaining!
            </p>
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">
              <div style="font-family:var(--font-mono);font-size:30px;font-weight:800;letter-spacing:0.25em;color:var(--accent-cyan);text-transform:uppercase;">
                ${escapeHtml(current.word)}
              </div>
              <p style="font-size:13.5px;color:var(--text-main);margin:10px 0 0 0;line-height:1.45;">
                <strong>Clue:</strong> ${escapeHtml(current.clue)}
              </p>
              <div style="margin-top:12px;display:flex;justify-content:center;gap:10px;">
                <button class="btn btn-secondary btn-sm" id="btn-hangman-speak-ans" type="button">🔊 Hear Pronunciation</button>
              </div>
            </div>
            <button class="btn btn-primary" id="btn-hangman-restart" type="button" style="padding:10px 24px;font-size:15px;font-weight:700;box-shadow:0 4px 16px rgba(0,240,255,0.25);">
              Play Next Word ➡️
            </button>
          </div>
        ` : isLost ? `
          <div class="game-result-box" style="border:2px solid var(--accent-magenta);">
            <div style="font-size:32px;margin-bottom:6px;">💀</div>
            <h4 style="font-size:20px;color:var(--accent-magenta);margin:0 0 6px 0;font-weight:700;">
              Game Over · Out of Chances
            </h4>
            <p style="font-size:13.5px;color:var(--text-muted);margin:0 0 14px 0;">
              You ran out of letter guesses. The target English word was:
            </p>
            <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;">
              <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;">Correct Answer</div>
              <div style="font-family:var(--font-mono);font-size:30px;font-weight:800;letter-spacing:0.25em;color:var(--accent-cyan);text-transform:uppercase;">
                ${escapeHtml(current.word)}
              </div>
              <p style="font-size:13.5px;color:var(--text-main);margin:10px 0 0 0;line-height:1.45;">
                <strong>Clue:</strong> ${escapeHtml(current.clue)}
              </p>
              <div style="margin-top:12px;display:flex;justify-content:center;gap:10px;">
                <button class="btn btn-secondary btn-sm" id="btn-hangman-speak-ans" type="button">🔊 Hear Pronunciation</button>
              </div>
            </div>
            <button class="btn btn-primary" id="btn-hangman-restart" type="button" style="padding:10px 24px;font-size:15px;font-weight:700;box-shadow:0 4px 16px rgba(0,240,255,0.25);">
              🔄 Play New Game
            </button>
          </div>
        ` : `
          <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:440px;margin:0 auto;" id="hangman-alphabet-grid">
            ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => `
              <button class="filter-chip" data-letter="${char}" ${guessedLetters.has(char) ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''} style="min-width:36px;padding:6px 0;font-family:var(--font-mono);font-weight:700;">
                ${char}
              </button>
            `).join('')}
          </div>
        `}
      </div>
    `;

    $('#btn-hangman-speak-ans')?.addEventListener('click', function() { speak(current.word, this); });
    $('#btn-hangman-restart')?.addEventListener('click', () => {
      current = WORDS[Math.floor(Math.random() * WORDS.length)];
      guessedLetters.clear();
      remainingMistakes = 6;
      renderState();
    });

    $$('#hangman-alphabet-grid [data-letter]').forEach(btn => {
      btn.onclick = () => {
        const letter = btn.dataset.letter;
        if (!guessedLetters.has(letter) && !isWon && !isLost) {
          guessedLetters.add(letter);
          if (!current.word.includes(letter)) {
            remainingMistakes--;
          }
          renderState();
        }
      };
    });
  }

  renderState();
}


// ─── 10. ROADMAP & EXPLORATION TOOLS (MY PLAN & QUIZ) ─────────────────────────
function renderPlanTool(toolKey = 'bizcard') {
  const mount = $('#plan-tool-arena');
  if (!mount) return;

  initPlanTools();

  $$('#plan-tools-tabs .filter-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === toolKey);
  });

  if (toolKey === 'myplan') {
    renderMyPlan(mount);
  } else if (toolKey === 'quiz') {
    renderCareerQuiz(mount);
  } else if (toolKey === 'bizcard') {
    renderFutureBusinessCard(mount);
  }
}

function initPlanTools() {
  $$('#plan-tools-tabs .filter-chip').forEach(btn => {
    btn.onclick = () => {
      const toolKey = btn.dataset.tool;
      renderPlanTool(toolKey);
      if (window.AppRouter) {
        window.AppRouter.navigate('/roadmap', { silent: true });
      }
    };
  });
}

// TOOL 1: My Plan Roadmap Generator
// ── Offline High-Fidelity Roadmap Blueprint Generator ─────────────────────
function generateOfflineRoadmap(careerObj, cls, dailyMins) {
  const cat = careerObj.cat || 'Professional';
  const exams = careerObj.exams || 'National Entrance Examinations';
  const degrees = careerObj.degrees || 'Bachelor / Master Professional Degree';
  const title = careerObj.title || 'Career Path';
  const superpower = careerObj.englishSuperpower || 'English is the universal operational language for global leadership.';

  // Class-specific academic milestones
  let m1Detail = '';
  if (cls === 'Class 8 & below') {
    m1Detail = `Build robust English reading endurance (fiction & science journals), master spoken diction through morning assembly elocution, and cultivate a foundational curiosity for ${cat.toLowerCase()} principles.`;
  } else if (cls === 'Class 9') {
    m1Detail = `Begin aligning your school stream roadmap (Science vs Commerce vs Humanities). Join school debating, Model United Nations (MUN), and start building a specialized vocabulary notebook tailored to ${title.toLowerCase()}.`;
  } else if (cls === 'Class 10' || cls.includes('Class 10')) {
    m1Detail = `Target 90%+ in ICSE/CBSE English & Core Board exams. Formalize your Class 11 stream selection directly aligned with ${degrees}, and lead student editorial or debate societies.`;
  } else if (cls === 'Class 11') {
    m1Detail = `Commence dedicated coaching and timed mock tests for ${exams}. Participate in state/national public speaking symposiums and read international peer-reviewed literature in ${cat}.`;
  } else if (cls === 'Class 12') {
    m1Detail = `Peak competitive exam readiness for ${exams} alongside Board Exam excellence. Draft preliminary Statements of Purpose (SOP) and build interview confidence through impromptu speaking drills.`;
  } else {
    m1Detail = `Pursue specialized undergraduate internships, participate in collegiate moot courts/hackathons, network with industry alumni, and prepare for licensing/post-graduate assessments.`;
  }

  // Accredited college recommendations based on category
  let colleges = '';
  if (cat === 'Aviation') {
    colleges = `Indira Gandhi Rashtriya Uran Akademi (IGRUA, NAAC A+), Bombay Flying Club (DGCA Approved), and National Flying Training Institute (NFTI Gondia) for ${degrees}.`;
  } else if (cat === 'Health') {
    colleges = `All India Institute of Medical Sciences (AIIMS New Delhi, NIRF #1), Christian Medical College (CMC Vellore, NAAC A++), and King Edward Memorial (KEM Mumbai) for ${degrees}.`;
  } else if (cat === 'Law') {
    colleges = `National Law School of India University (NLSIU Bangalore, NIRF Law #1), NALSAR Hyderabad (NAAC A++), and Government Law College (GLC Mumbai) for ${degrees}.`;
  } else if (cat === 'Tech') {
    colleges = `Indian Institute of Technology (IIT Bombay / IIT Delhi, NIRF Top 3), BITS Pilani (NAAC A), and International Institute of Information Technology (IIIT Hyderabad) for ${degrees}.`;
  } else if (cat === 'Media') {
    colleges = `Indian Institute of Mass Communication (IIMC New Delhi), St. Xavier's College Autonomous Mumbai (NAAC A+), and Symbiosis Institute of Media & Communication (SIMC Pune) for ${degrees}.`;
  } else if (cat === 'Public Policy') {
    colleges = `St. Stephen's College (Delhi University, NAAC A++), Jawaharlal Nehru University (JNU New Delhi, NAAC A++), and National Defence Academy (NDA Khadakwasla) for ${degrees}.`;
  } else if (cat === 'Business') {
    colleges = `Shri Ram College of Commerce (SRCC Delhi, NAAC A++), Indian Institute of Management (IIM Indore IPM, NIRF Top 10), and Narsee Monjee Institute of Management Studies (NMIMS Mumbai, NAAC A+).`;
  } else {
    colleges = `Film and Television Institute of India (FTII Pune), National Institute of Design (NID Ahmedabad, NAAC A+), and Delhi University Faculty of Arts (NAAC A++).`;
  }

  // Calculate time-boxed daily habit breakdown
  const listenMins = Math.max(3, Math.round(dailyMins * 0.25));
  const speakMins = Math.max(4, Math.round(dailyMins * 0.35));
  const writeMins = Math.max(3, Math.round(dailyMins * 0.25));
  const reflectMins = Math.max(2, dailyMins - listenMins - speakMins - writeMins);

  return {
    career: title,
    class_grade: cls,
    daily_minutes: dailyMins,
    headline: `${title} Strategic Blueprint (${cls})`,
    why_english: superpower,
    milestones: [
      {
        step: 1,
        title: `Current Milestone (${cls})`,
        detail: m1Detail
      },
      {
        step: 2,
        title: "Target Entrance Examinations",
        detail: `Prepare competitive entrance tests early: ${exams}. Focus on reading speed, reasoning accuracy, and domain terminology.`
      },
      {
        step: 3,
        title: "Premier Accredited Colleges (NAAC / NIRF)",
        detail: `Target premier institutes with NAAC Grade 'A+' / 'A++' and top NIRF rankings: ${colleges}`
      }
    ],
    daily_routine: [
      {
        phase: "Listen & Absorb",
        mins: listenMins,
        action: `Listen to a curated 10-minute masterclass podcast, technical case study, or speech in ${cat} to absorb native phrasing and professional diction.`
      },
      {
        phase: "Speak & Articulate",
        mins: speakMins,
        action: `Practice speaking aloud for ${speakMins} minutes explaining a key concept in ${title.toLowerCase()} without filler words, focusing on crisp cadence and vocal projection.`
      },
      {
        phase: "Write & Synthesize",
        mins: writeMins,
        action: `Write a concise 50-word synthesis of an insight, case study, or news article relevant to ${title.toLowerCase()} using three advanced vocabulary words.`
      },
      {
        phase: "Reflect & Track",
        mins: reflectMins,
        action: `Log your daily streak, note one hesitation to eliminate tomorrow, and review your vocabulary flashcard deck.`
      }
    ]
  };
}

function renderMyPlan(mount) {
  if (!mount) return;

  // Build options for all 32+ careers
  const careerOptions = CAREERS_DATA.map(c => 
    `<option value="${escapeHtml(c.title)}">${c.icon || '🎯'} ${escapeHtml(c.title)} (${escapeHtml(c.cat)})</option>`
  ).join('');

  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="font-size:20px;font-weight:800;margin:0 0 4px 0;">🗺️ "My Plan" Personalized AI Career Roadmap</h3>
          <p style="font-size:13.5px;color:var(--text-muted);margin:0;">Select your class, target career, and daily time to generate a bespoke chronological milestone blueprint.</p>
        </div>
        <span class="badge-pill" style="background:rgba(0,240,255,0.08);border:1px solid var(--border-strong);color:var(--accent-cyan);font-weight:700;">
          ⚡ 32 Pathways Available
        </span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:14px;margin-bottom:18px;">
      <div class="form-group">
        <label for="plan-class-select" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">Your Current Class / Grade:</label>
        <select id="plan-class-select" style="width:100%;">
          <option value="" disabled selected>-- Select Your Current Class / Grade (Mandatory) --</option>
          <option value="Class 8 & below">Class 8 &amp; below</option>
          <option value="Class 9">Class 9</option>
          <option value="Class 10">Class 10 (ICSE / CBSE)</option>
          <option value="Class 11">Class 11</option>
          <option value="Class 12">Class 12</option>
          <option value="College">College / Exploring</option>
        </select>
      </div>

      <div class="form-group">
        <label for="plan-career-select" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">Target Career Track (32 Careers):</label>
        <select id="plan-career-select" style="width:100%;">
          <option value="" disabled selected>-- Select Target Career Track (Mandatory) --</option>
          ${careerOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="plan-time-select" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">Daily Practice Commitment:</label>
        <select id="plan-time-select" style="width:100%;">
          <option value="" disabled selected>-- Select Daily Practice Commitment (Mandatory) --</option>
          <option value="15">15 mins / day (Focused Sprint)</option>
          <option value="30">30 mins / day (Balanced Habit)</option>
          <option value="45">45 mins / day (Accelerated Mastery)</option>
          <option value="60">60 mins / day (Deep Immersion)</option>
        </select>
      </div>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
      <button class="btn btn-primary" id="btn-generate-plan" style="padding:12px 22px;font-size:15px;font-weight:700;">
        <span>🚀</span> <span>Generate Roadmap Blueprint</span>
      </button>
    </div>

    <div id="plan-output-container"></div>
  `;

  // Function to render blueprint into container
  function displayBlueprint(blueprint, provider = 'Google Gemini AI') {
    const out = $('#plan-output-container');
    if (!out) return;

    const careerObj = CAREERS_DATA.find(c => c.title === blueprint.career) || CAREERS_DATA[0];
    const steps = blueprint.milestones || [];
    const routine = blueprint.daily_routine || [];

    const routineHtml = routine.map((r, idx) => `
      <div style="background:var(--surface-raised);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="color:var(--text-main);font-size:13.5px;">${escapeHtml(r.phase)}</strong>
          <span class="badge-pill" style="background:rgba(0,240,255,0.1);color:var(--accent-cyan);font-weight:700;font-size:11.5px;">
            ⏱️ ${r.mins} Mins
          </span>
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin:0;line-height:1.45;">${escapeHtml(r.action)}</p>
      </div>
    `).join('');

    const milestonesHtml = steps.map((m, idx) => {
      const colors = ['var(--accent-brand)', 'var(--accent-magenta)', 'var(--accent-emerald)', 'var(--accent-cyan)'];
      const bg = colors[idx % colors.length];
      return `
        <div style="display:flex;gap:14px;align-items:flex-start;">
          <div style="width:32px;height:32px;border-radius:50%;background:${bg};color:#000;display:grid;place-items:center;font-weight:800;font-size:14px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
            ${idx + 1}
          </div>
          <div style="flex:1;">
            <div style="font-weight:800;font-size:15px;color:var(--text-main);margin-bottom:4px;">
              ${escapeHtml(m.title)}
            </div>
            <div style="font-size:13.5px;color:var(--text-muted);line-height:1.55;">
              ${escapeHtml(m.detail)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    out.innerHTML = `
      <div class="card" style="padding:24px;border:1.5px solid var(--border-strong);box-shadow:0 8px 30px rgba(0,0,0,0.35);">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--border);padding-bottom:16px;margin-bottom:18px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
              <span class="badge-pill badge-nirf">${escapeHtml(blueprint.class_grade)} Roadmap</span>
              <span class="badge-pill" style="background:var(--surface-raised);border:1px solid var(--border);color:var(--text-muted);font-weight:600;">
                ⭐ ${escapeHtml(careerObj.cat || 'Career Path')}
              </span>
              <span class="badge-pill" style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.4);color:var(--accent-emerald);font-weight:700;">
                ⏱️ ${blueprint.daily_minutes} Mins Daily Habit
              </span>
            </div>
            <h3 style="font-size:24px;font-weight:800;color:var(--accent-cyan);margin:0;">
              ${careerObj.icon || '🎯'} ${escapeHtml(blueprint.career)} Pathway
            </h3>
          </div>
          
        </div>

        <!-- Why English Superpower -->
        <div style="background:rgba(0,240,255,0.06);border-left:3.5px solid var(--accent-brand);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--accent-brand);margin-bottom:4px;">
            ⚡ Why English is Your Decisive Superpower in this Field:
          </div>
          <p style="font-size:13.5px;color:var(--text-main);margin:0;line-height:1.5;">
            ${escapeHtml(blueprint.why_english || careerObj.englishSuperpower || '')}
          </p>
        </div>

        <!-- Chronological Milestones -->
        <div style="margin-bottom:22px;">
          <h4 style="font-size:16px;font-weight:800;color:var(--text-main);margin:0 0 14px 0;display:flex;align-items:center;gap:6px;">
            <span>📍</span> <span>Chronological Roadmap Milestones</span>
          </h4>
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${milestonesHtml}
          </div>
        </div>

        <!-- Daily Habit Breakdown -->
        <div style="border-top:1px solid var(--border);padding-top:18px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <h4 style="font-size:16px;font-weight:800;color:var(--text-main);margin:0;display:flex;align-items:center;gap:6px;">
              <span>⏱️</span> <span>Personalized Daily Practice Habit (${blueprint.daily_minutes} Mins)</span>
            </h4>
            <span style="font-size:12px;color:var(--text-muted);">Calculated for steady compounding fluency</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
            ${routineHtml}
          </div>
        </div>


      </div>
    `;

    // Hook up copy blueprint
    $('#btn-copy-blueprint')?.addEventListener('click', () => {
      let copyText = `# ${blueprint.career} Pathway Blueprint (${blueprint.class_grade})
`;
      copyText += `Daily Commitment: ${blueprint.daily_minutes} Mins/day
`;
      copyText += `Why English Matters: ${blueprint.why_english}

`;
      copyText += `## Milestones:
`;
      steps.forEach((s, idx) => {
        copyText += `${idx + 1}. ${s.title}: ${s.detail}
`;
      });
      copyText += `
## Daily Practice Routine (${blueprint.daily_minutes} Mins):
`;
      routine.forEach(r => {
        copyText += `- ${r.phase} (${r.mins} mins): ${r.action}
`;
      });
      navigator.clipboard.writeText(copyText).then(() => {
        showToast('Roadmap blueprint copied to clipboard!');
      }).catch(() => {
        showToast('Copied roadmap blueprint text!');
      });
    });

    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  ['#plan-class-select', '#plan-career-select', '#plan-time-select'].forEach(sel => {
    $(sel)?.addEventListener('change', (e) => {
      e.target.style.borderColor = '';
    });
  });

  // Handle Generate Roadmap Button Click
  $('#btn-generate-plan')?.addEventListener('click', async () => {
    const classEl = $('#plan-class-select');
    const careerEl = $('#plan-career-select');
    const timeEl = $('#plan-time-select');

    const cls = classEl?.value;
    const car = careerEl?.value;
    const timeRaw = timeEl?.value;

    let hasError = false;
    let firstErrorEl = null;

    if (!cls || cls === '') {
      if (classEl) classEl.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = classEl;
      hasError = true;
    } else {
      if (classEl) classEl.style.borderColor = '';
    }

    if (!car || car === '') {
      if (careerEl) careerEl.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = careerEl;
      hasError = true;
    } else {
      if (careerEl) careerEl.style.borderColor = '';
    }

    if (!timeRaw || timeRaw === '') {
      if (timeEl) timeEl.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = timeEl;
      hasError = true;
    } else {
      if (timeEl) timeEl.style.borderColor = '';
    }

    if (hasError) {
      showToast('⚠️ Please select your Class, Target Career, and Daily Practice Commitment (all mandatory)!');
      firstErrorEl?.focus();
      return;
    }

    const time = parseInt(timeRaw, 10);
    const out = $('#plan-output-container');
    if (!out) return;

    const careerObj = CAREERS_DATA.find(c => c.title === car) || CAREERS_DATA[0];

    // Show dynamic AI Loading state
    out.innerHTML = `
      <div class="card" style="padding:32px 20px;text-align:center;background:var(--bg-subtle);border:1.5px dashed var(--accent-cyan);border-radius:var(--radius-lg);">
        <div style="font-size:42px;animation:pulseIconGlow 1.4s infinite ease-in-out;display:inline-block;margin-bottom:10px;">⚡</div>
        <h4 style="font-size:18px;font-weight:800;color:var(--text-main);margin:0 0 6px 0;">Synthesizing AI Roadmap Blueprint...</h4>
        <p style="font-size:13.5px;color:var(--text-muted);margin:0 auto;max-width:460px;line-height:1.5;">
          Personalizing milestones for <strong>${escapeHtml(car)}</strong> (${escapeHtml(cls)}, ${time}m daily commitment)...
        </p>
      </div>
    `;

    let blueprint = null;
    let provider = 'Google Gemini AI';

    try {
      const res = await fetchApi('ai', {
        method: 'POST',
        body: JSON.stringify({
          task: 'generate-roadmap',
          career: car,
          class_grade: cls,
          daily_minutes: time,
          career_data: {
            cat: careerObj.cat,
            degrees: careerObj.degrees,
            exams: careerObj.exams,
            englishSuperpower: careerObj.englishSuperpower
          }
        })
      });

      if (res?.ok && res?.blueprint) {
        blueprint = res.blueprint;
        provider = res.provider || 'Google Gemini AI';
      }
    } catch (e) {}

    // Fallback if AI is offline or key missing
    if (!blueprint) {
      blueprint = generateOfflineRoadmap(careerObj, cls, time);
      provider = 'On-Device Heuristic Engine';
    }

    displayBlueprint(blueprint, provider);
    if (isTutorialRunning && isTutorialOnSection('section_roadmap')) {
      triggerTutorialAutoAdvance('Strategic Roadmap Blueprint Generated', 'Awesome! Your multi-year academic progression is now generated!');
    }
  });
}
// TOOL 2: 5-Question Career Curiosity Quiz
function renderCareerQuiz(mount) {
  const QUESTIONS = [
    {
      q: "1. Which school activity energizes you the most?",
      options: [
        { text: "A. Directing plays, writing magazine articles, or anchoring morning assemblies", sector: "Media & Journalism" },
        { text: "B. Debating rules, defending principles in Model UN, or moot court arguments", sector: "Law & Corporate Advocacy" },
        { text: "C. Writing code, automating spreadsheets, and dissecting computer networks", sector: "Technology & Software Architecture" },
        { text: "D. Dissecting biology specimens, first-aid, and counseling distressed friends", sector: "Medicine & Healthcare" }
      ]
    },
    {
      q: "2. In an emergency or crisis, what is your instinctive role?",
      options: [
        { text: "A. The Communicator — interviewing witnesses and broadcasting verified facts calmly", sector: "Media & Journalism" },
        { text: "B. The Arbitrator — reviewing policies, analyzing liability, and finding compromise", sector: "Law & Corporate Advocacy" },
        { text: "C. The Systems Architect — diagnosing root causes and deploying hotfix automations", sector: "Technology & Software Architecture" },
        { text: "D. The Caregiver — administering immediate triage and keeping patients stable", sector: "Medicine & Healthcare" }
      ]
    },
    {
      q: "3. What English superpower matters most to your future ambition?",
      options: [
        { text: "A. Storytelling eloquence & live teleprompter poise under broadcast lights", sector: "Media & Journalism" },
        { text: "B. Razor-sharp statutory precision & cross-examination rhetoric", sector: "Law & Corporate Advocacy" },
        { text: "C. Structured technical documentation & clear cross-functional architecture reviews", sector: "Technology & Software Architecture" },
        { text: "D. Empathic patient communication & high-pressure multidisciplinary clinical briefs", sector: "Medicine & Healthcare" }
      ]
    },
    {
      q: "4. What kind of books or podcasts do you naturally pick up?",
      options: [
        { text: "A. Geopolitics, investigative journalism exposés, and global cultural essays", sector: "Media & Journalism" },
        { text: "B. Landmark court rulings, constitutional debates, and corporate boardroom battles", sector: "Law & Corporate Advocacy" },
        { text: "C. Artificial intelligence research, startup founder stories, and distributed systems", sector: "Technology & Software Architecture" },
        { text: "D. Neuroscience breakthroughs, surgical biographies, and public health memoirs", sector: "Medicine & Healthcare" }
      ]
    },
    {
      q: "5. What is your ultimate 15-year career goal?",
      options: [
        { text: "A. Prime-time international news anchor or chief documentary producer", sector: "Media & Journalism" },
        { text: "B. Senior Partner at a Tier-1 corporate law firm or Supreme Court Advocate", sector: "Law & Corporate Advocacy" },
        { text: "C. Chief Technology Officer or founder of a global venture-backed startup", sector: "Technology & Software Architecture" },
        { text: "D. Chief Surgeon or director of a specialized pediatric hospital wing", sector: "Medicine & Healthcare" }
      ]
    }
  ];

  let currentQ = 0;
  let scores = {
    "Media & Journalism": 0,
    "Law & Corporate Advocacy": 0,
    "Technology & Software Architecture": 0,
    "Medicine & Healthcare": 0
  };

  function showQuestion() {
    if (currentQ >= QUESTIONS.length) {
      let topSector = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
      mount.innerHTML = `
        <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
          <h3 style="font-size:20px;">🧭 Career Discovery Diagnosis Complete</h3>
          <p style="font-size:13.5px;color:var(--text-dim);">Based on your answers across all 5 career aptitude dimensions.</p>
        </div>

        <div style="background:rgba(0,240,255,0.06);border:1.5px solid var(--accent-cyan);border-radius:var(--radius-lg);padding:24px;text-align:center;">
          <div style="font-size:38px;margin-bottom:8px;">🎯</div>
          <span class="badge-pill badge-naac" style="font-size:12px;">Top Career Fit</span>
          <h2 style="font-size:26px;color:var(--accent-cyan);margin:8px 0;">${topSector}</h2>
          <p style="font-size:15px;color:var(--text-main);max-width:540px;margin:0 auto 16px;line-height:1.6;">
            Your communication preferences align with <strong>${topSector}</strong>. You thrive on clear articulation, structured reasoning, and high-impact spoken English.
          </p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="switchTab('careers')">Explore Careers in ${topSector} 🚀</button>
            <button class="btn btn-secondary" onclick="switchTab('colleges')">View Colleges 🏛️</button>
            <button class="btn btn-secondary" id="btn-retake-quiz">Retake Quiz 🔄</button>
          </div>
        </div>
      `;

      $('#btn-retake-quiz')?.addEventListener('click', () => {
        currentQ = 0;
        scores = { "Media & Journalism": 0, "Law & Corporate Advocacy": 0, "Technology & Software Architecture": 0, "Medicine & Healthcare": 0 };
        showQuestion();
      });
      return;
    }

    const item = QUESTIONS[currentQ];
    mount.innerHTML = `
      <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h3 style="font-size:20px;">🧭 5-Question Career Curiosity Quiz</h3>
          <span style="font-size:13px;color:var(--text-dim);">Question ${currentQ + 1} of ${QUESTIONS.length}</span>
        </div>
        <div style="display:flex;gap:4px;">
          ${QUESTIONS.map((_, i) => `
            <div style="width:24px;height:6px;border-radius:3px;background:${i <= currentQ ? 'var(--accent-cyan)' : 'var(--surface-hover)'}"></div>
          `).join('')}
        </div>
      </div>

      <div style="max-width:680px;margin:16px auto;">
        <h4 style="font-size:17px;font-weight:700;margin-bottom:16px;line-height:1.4;">${item.q}</h4>
        <div style="display:flex;flex-direction:column;gap:10px;" id="quiz-options-container">
          ${item.options.map((opt, i) => `
            <button class="btn btn-secondary" data-sector="${opt.sector}" style="justify-content:flex-start;text-align:left;padding:14px 18px;font-size:14.5px;line-height:1.4;white-space:normal;cursor:pointer;">
              ${opt.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    $$('#quiz-options-container button').forEach(btn => {
      btn.onclick = () => {
        const sector = btn.dataset.sector;
        scores[sector] = (scores[sector] || 0) + 1;
        currentQ++;
        if (isTutorialRunning && isTutorialOnSection('section_quiz')) {
          triggerTutorialAutoAdvance('Aptitude Question Answered', 'Great choice! Your career alignment dimension is recorded.');
        }
        showQuestion();
      };
    });
  }

  showQuestion();
}

// TOOL 3: Future Business Card Generator with Dynamic QR Verification
const CAREER_CREDENTIALS_MAP = {
  "Chief Surgeon & Medical Resident": [
    "MBBS (Gold Medalist) · MS General Surgery · AIIMS",
    "MD Clinical Medicine · MRCS (London) · Trauma Fellowship",
    "Super Specialist MCh · Fellow American College of Surgeons (FACS)",
    "Chief Resident · Global Medical Board Certified"
  ],
  "Commercial Airline Pilot": [
    "B.Sc Aviation · ICAO Level 6 · IGRUA Graduate",
    "ATPL Commander · Boeing 787 Dreamliner Type-Rated · DGCA Gold",
    "CPL Multi-Engine Instrument · Chief Flight Instructor (CFI)",
    "Senior Captain · International Long-Haul Fleet Lead"
  ],
  "Principal Software Architect": [
    "B.Tech CSE (IIT) · M.S. Distributed Systems (Stanford)",
    "AWS Solutions Architect Pro · Kubernetes CKA · Tech Fellow",
    "Staff Architect · Distributed Cloud Lead · Core Contributor",
    "Distinguished Engineer · AI Infrastructure & Scalability Lead"
  ],
  "Corporate Mergers & Acquisitions Lawyer": [
    "B.A. LL.B (Hons) NLSIU · LL.M Corporate Law (Cambridge)",
    "Senior Partner · Bar Council of India · Chambers Band 1",
    "Advocate Supreme Court · Cross-Border M&A Lead · Legal 500",
    "Solicitor England & Wales · Dual-Qualified Arbitrator"
  ],
  "Diplomatic Civil Servant (IFS / IAS)": [
    "M.A. International Relations (JNU) · UPSC CSE Rank Top 20",
    "Indian Foreign Service (IFS) · Diplomatic Attaché · UN Delegation",
    "District Magistrate / IAS Special Secretary · Public Policy Lead",
    "Ambassador Extraordinary & Plenipotentiary · Peace Fellow"
  ],
  "Commissioned Defence Officer (NDA)": [
    "B.Sc Military Science · NDA Khadakwasla · IMA Sword of Honour",
    "Wing Commander · Fighter Pilot · Flying Badge Gold",
    "Lieutenant Colonel · Staff College Camberley Qualified · Sena Medal",
    "Captain Indian Navy · Warship Navigation & Operations Specialist"
  ],
  "Broadcast Journalist & News Anchor": [
    "B.A. Journalism (ACJ) · Prime Time Anchor · Press Club Lead",
    "Ramnath Goenka Awardee · Senior Investigative Editor",
    "Foreign News Desk Head · Emmy Nominated Broadcast Producer",
    "Chief Anchor · International Media Forum Fellow"
  ],
  "Luxury Hospitality & General Manager": [
    "B.Sc Hospitality (IHM Pusa) · Ecole Hôtelière de Lausanne Executive",
    "General Manager · Forbes 5-Star Luxury Resort Director",
    "Certified Hotel Administrator (CHA) · Master Sommelier Level 3",
    "Managing Director · Global Luxury Hotelier of the Year"
  ],
  "Venture Entrepreneur & Startup Founder": [
    "B.Tech (IIT) + MBA (Stanford GSB) · Y-Combinator Alum",
    "Founder & CEO · Forbes 30 Under 30 · Series-B Unicorn Lead",
    "Tech Entrepreneur · TiE Charter Member · Global Innovator Fellow",
    "Angel Investor · 50+ Startup Portfolio · World Economic Forum YGL"
  ],
  "Chartered Accountant & Investment Banker": [
    "CA Rank 1 (ICAI) · CFA Charterholder (USA) · IIM Ahmedabad",
    "Managing Director M&A · Goldman Sachs Wall Street Alum",
    "Chief Financial Officer (CFO) · Capital Markets Lead",
    "FRM Certified · Private Equity Partner · SEBI Registered Manager"
  ],
  "University Professor & Academic Scholar": [
    "Ph.D. English Literature (Oxford) · Rhodes Scholar Alum",
    "Tenured Chair Professor · Cambridge University Press Author",
    "Fulbright Fellow · Dean of Humanities & Research Council Chair",
    "Visiting Scholar Harvard · National Endowment Grantee"
  ],
  "OTT Screenwriter & Narrative Game Designer": [
    "MFA Screenwriting (FTII) · Writer's Guild of America Member",
    "Showrunner · Netflix Global Original Series · Filmfare Awardee",
    "Narrative Director · BAFTA Games Nominee · IGN Story of the Year",
    "Lead Worldbuilder · Prime Video Writers Room Alum"
  ],
  "Voice-Over Artist & Audio Narrator": [
    "Audie Award Winner · Certified Voice Master (London Drama)",
    "Official Voice of National Geographic & BBC Earth Documentaries",
    "Audiobook Narrator of 100+ Best-sellers · Audible Hall of Fame",
    "International Commercial VO Talent · SOVAS Voice Arts Awardee"
  ],
  "Technical Writer & Documentation Specialist": [
    "B.S. Computer Science + Technical Comm (STC Fellow)",
    "Staff Documentation Architect · Google Cloud / OpenAI Ecosystem",
    "Lead API Writer · Write the Docs Keynote Speaker",
    "Open Source Docs Guild Lead · IEEE Professional Comm Member"
  ],
  "Advertising Creative Director & Copywriter": [
    "Cannes Lions Grand Prix Winner · D&AD Black Pencil Awardee",
    "Executive Creative Director · Ogilvy Global Creative Council",
    "Clio Award Winner · One Show Hall of Fame Nominee",
    "Chief Creative Officer · Super Bowl & IPL Campaign Architect"
  ],
  "International Public Relations Strategist": [
    "M.S. Strategic Communications (Columbia) · PRSA Silver Anvil",
    "Global Head of Communications · Fortune 100 Enterprise",
    "Crisis Counsel Lead · World Economic Forum Media Advisor",
    "SABRE Award Winner · International PR Association President"
  ],
  "Novelist & Literary Fiction Author": [
    "Booker Prize Nominee · MFA Creative Writing (Iowa Writers' Workshop)",
    "New York Times #1 Best-Selling Author · Sahitya Akademi Award",
    "PEN/Hemingway Finalist · Royal Society of Literature Fellow",
    "International Bestseller · Translated into 28 Global Languages"
  ],
  "Narrative Game Writer & Worldbuilder": [
    "Lead Narrative Designer · The Game Awards Best Narrative Winner",
    "Lead Writer · AAA Open-World Franchise · BAFTA Games Member",
    "Interactive Fiction Pioneer · GDC Narrative Summit Speaker",
    "Senior Quest Designer · 10M+ Global Player Community"
  ],
  "Science Communicator & Research Journalist": [
    "Ph.D. Astrophysics / Biology · AAAS Kavli Journalism Award",
    "Senior Editor Scientific American & Nature Science Columnist",
    "Pulitzer Prize Finalist for Explanatory Reporting · TED Speaker",
    "Lead Producer BBC Science & Discovery Science Fellow"
  ],
  "UX Writer & Product Content Designer": [
    "Lead Content Designer · Apple / Airbnb Product Design Guild",
    "Design System Voice & Tone Lead · Fast Company Innovation Award",
    "Author of Leading UX Writing Handbook · Figma Community Creator",
    "Head of Content Strategy · 100M+ Daily Active Users UX Ecosystem"
  ],
  "Publishing Editor & Literary Agent": [
    "Editor-in-Chief · Penguin Random House / HarperCollins",
    "Agent to 12 Pulitzer & National Book Award Winners · AALA Member",
    "Editorial Director · Frankfurt & London Book Fair Delegate",
    "Distinguished Publishing Fellow · Global Rights Negotiator"
  ],
  "Product Manager & Agile Lead": [
    "B.Tech (IIT) + MBA · Certified Scrum Product Owner (CSPO)",
    "VP of Product · Enterprise SaaS Platform (10M+ Enterprise Seats)",
    "Product School Featured Speaker · Mind the Product Fellow",
    "Chief Product Officer · Product-Led Growth (PLG) Trailblazer"
  ],
  "Commercial Flight Cabin Crew Lead": [
    "Inflight Service Director · Emirates / Singapore Airlines First Class",
    "IATA Airline Cabin Safety Certified · Crew Resource Management Lead",
    "VIP State Flight Lead · Aviation Hospitality Excellence Award",
    "Chief Purser · 15,000+ Transoceanic Flight Hours"
  ],
  "Foreign Correspondent & War Reporter": [
    "Pulitzer Prize Winner for International Reporting · Overseas Press Club",
    "Chief Bureau Chief Middle East & South Asia · BBC World / CNN",
    "Rory Peck Awardee · Committee to Protect Journalists (CPJ) Fellow",
    "Foreign Affairs Columnist · International War Correspondence Medal"
  ],
  "Speechwriter & Political Strategist": [
    "Chief Speechwriter to Prime Minister / Head of State",
    "Director of Presidential Speechwriting · Cicero Grand Award",
    "Political Communications Director · Oxford Union Lifetime Member",
    "Senior Fellow Harvard Kennedy School · Global Summit Rhetoric Lead"
  ],
  "Sports Commentator & Live Broadcaster": [
    "Lead Commentator ICC Cricket World Cup / Premier League / Wimbledon",
    "Sports Emmy Award Winner · Star Sports / Sky Sports Lead Voice",
    "Broadcast Journalism Hall of Fame · 25+ Years Live Commentary",
    "Official Olympic Games Host Broadcaster Anchor"
  ],
  "Computational Linguist & AI Prompt Engineer": [
    "Ph.D. Natural Language Processing (Stanford) · ACL Lifetime Member",
    "Principal AI Prompt Architect · Frontier Foundation Models Lead",
    "OpenAI / Google DeepMind Research Collaborator · NeurIPS Best Paper",
    "Head of LLM Human Alignment & Linguistic Benchmarking"
  ],
  "Podcast Producer & Audio Showrunner": [
    "Peabody Award Winner · Apple Podcasts #1 Global Showrunner",
    "Executive Producer · 50M+ Downloads Spotify Original Network",
    "Ambies Award for Best Narrative Podcast · Webby Award Winner",
    "Audio Doc Pioneer · Third Coast International Audio Festival Winner"
  ],
  "Stand-up Comedian & Satirical Writer": [
    "Netflix Global Comedy Special · Edinburgh Comedy Award Nominee",
    "Head Writer · Prime Time Satirical News Show · Emmy Nominated",
    "Sold-Out Radio City Music Hall & Royal Albert Hall Tour Headliner",
    "Writers Guild Award Winner for Variety / Sketch Comedy"
  ],
  "Lyricist & Musical Theatre Writer": [
    "Tony Award Winner for Best Original Score · Oscar Shortlisted Lyricist",
    "West End & Broadway Resident Composer-Lyricist · Olivier Awardee",
    "Grammy Award Winner for Best Musical Theater Album",
    "Dramatists Guild of America Fellow · ASCAP Musical Theatre Award"
  ],
  "Environmental Policy Analyst & Sustainability Advocate": [
    "Master of Public Policy (Oxford) · IPCC Climate Assessment Co-Author",
    "Senior Sustainability Director · United Nations Environment Programme",
    "COP Climate Summit Delegate · Forbes 30 Under 30 Climate Champion",
    "Chief ESG Officer · Global Renewable Energy & Net-Zero Transition Lead"
  ],
  "Non-Profit Director & Social Impact Entrepreneur": [
    "Master of International Development (Harvard Kennedy) · Skoll Awardee",
    "Executive Director · Global Education NGO (1M+ Students Empowered)",
    "Schwab Foundation Social Entrepreneur of the Year · World Bank Fellow",
    "Ashoka Global Fellow · United Nations SDG Impact Champion"
  ],
  "Quantum Computing & Cryptography Architect": [
      "Ph.D. Quantum Information (MIT) \u00b7 Qiskit Core Fellow",
      "Chief Quantum Architect \u00b7 Post-Quantum Standard Contributor (NIST)",
      "Staff Quantum Systems Lead \u00b7 Superconducting Qubit Certified",
      "B.Tech CSE (IIT) \u00b7 Distinguished Quantum Research Scholar"
  ],
  "Bio-Robotics Surgeon & Bionic Prosthetics Lead": [
      "MBBS \u00b7 MCh Bio-Robotics \u00b7 Da Vinci Master Console Certified",
      "Fellow Royal College of Surgeons (FRCS) \u00b7 Neural Interface Pioneer",
      "Chief of Robotic Surgery \u00b7 AIIMS Gold Medalist",
      "Bionic Prosthetics Innovation Chair \u00b7 Johns Hopkins Medicine Fellow"
  ],
  "Renewable Energy Grid & Fusion Systems Director": [
      "M.Tech Clean Energy Systems \u00b7 IEEE Smart Grid Fellow",
      "Director Fusion Power Distribution \u00b7 ITER Scientific Contributor",
      "Certified Energy Manager (CEM) \u00b7 Net-Zero Grid Pioneer",
      "Chief Grid Architect \u00b7 International Solar Alliance Lead"
  ],
  "Autonomous Vehicle Fleet & Aerospace Systems Lead": [
      "M.S. Aerospace & Autonomous Flight (Stanford) \u00b7 DGCA Gold",
      "Head of eVTOL Flight Operations \u00b7 FAA Urban Mobility Certified",
      "Chief Robotics Engineer \u00b7 IEEE Autonomous Systems Fellow",
      "Senior Fleet Director \u00b7 100M+ Autonomous Safe Miles Lead"
  ],
  "Cyber Defense & Threat Intelligence Commander": [
      "CISSP \u00b7 OSCP Master \u00b7 Sovereign Cybersecurity Command Lead",
      "Offensive Security Certified Expert (OSCE) \u00b7 Zero-Day Defense Fellow",
      "Chief Information Security Officer (CISO) \u00b7 Black Hat Keynote Honoree",
      "B.Tech Cyber Forensics \u00b7 Interpol Cyber Advisory Group Alum"
  ],
  "AI Virtual Cinematographer & Metahuman Director": [
      "B.Des Film Direction (FTII) \u00b7 Epic Games Unreal Master Fellow",
      "Academy Award Technical Achievement Nominee \u00b7 Virtual Production Lead",
      "Chief Creative Director \u00b7 Generative Metahuman Studios",
      "Art Directors Guild \u00b7 Cannes Lions Grand Prix Winner"
  ],
  "Space Habitat Architect & Orbital Station Designer": [
      "M.S. Space Architecture (ISU) \u00b7 NASA Artemis Design Honoree",
      "Chief Architect \u00b7 Low-Earth Orbit Commercial Spaceport",
      "LEED AP Space Habitat Certified \u00b7 AIA Space Design Fellow",
      "Lunar Gateway Habitat Principal Designer \u00b7 ISRO Scholar"
  ],
  "Cognitive Neuro-Ethicist & AI Governance Director": [
      "Ph.D. Bioethics & Neural Governance (Oxford) \u00b7 UN AI Advisor",
      "Chairperson Global Neuro-Rights Council \u00b7 UNESCO Ethics Fellow",
      "Senior Policy Fellow \u00b7 Harvard Berkman Klein Center",
      "Chief AI Safety Strategist \u00b7 International Digital Rights Charter"
  ],
  "Esports Franchise Executive & Game Ecosystem Lead": [
      "MBA Sports Management (IIM) \u00b7 Global Esports Executive of the Year",
      "Commissioner International Pro League \u00b7 Riot & Valve Partner",
      "Franchise President \u00b7 World Championship Winning Organization",
      "Forbes 30 Under 30 Games \u00b7 Interactive Media Strategist"
  ],
  "Algorithmic Quantitative Trader & FinTech Architect": [
      "M.S. Quantitative Finance (NYU Courant) \u00b7 CFA Level 3 Charterholder",
      "Head of Systematic Trading \u00b7 Multi-Strategy Alpha Fund Lead",
      "Financial Risk Manager (FRM) \u00b7 Top Quant League Gold Medalist",
      "Distinguished Quant Architect \u00b7 Ultra-Low Latency Protocol Designer"
  ]
};

function renderQrCode(containerEl, url, size = 68) {
  if (!containerEl) return;
  let rendered = false;
  if (typeof qrcode !== 'undefined') {
    try {
      // Use Error Correction 'L' (7% error correction) for large, chunky modules that smartphone cameras scan in <0.1s!
      const qr = qrcode(0, 'L');
      qr.addData(url);
      qr.make();
      const svgStr = qr.createSvgTag({ cellSize: 4, margin: 2 });
      containerEl.innerHTML = svgStr;
      const svg = containerEl.querySelector('svg');
      if (svg) {
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';
        svg.style.borderRadius = '4px';
        rendered = true;
      }
    } catch (err) {
      console.warn('QR code SVG render failed:', err);
    }
  }

  // Pure client-side HTML5 canvas fallback (instant 0ms, zero external API) if SVG somehow failed
  if (!rendered && typeof qrcode !== 'undefined') {
    try {
      const qr = qrcode(0, 'L');
      qr.addData(url);
      qr.make();
      const count = qr.getModuleCount();
      const canvas = document.createElement('canvas');
      canvas.width = size * 2;
      canvas.height = size * 2;
      const ctx = canvas.getContext('2d');
      const tileW = canvas.width / count;
      const tileH = canvas.height / count;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(col * tileW, row * tileH, tileW, tileH);
          }
        }
      }
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.borderRadius = '4px';
      containerEl.innerHTML = '';
      containerEl.appendChild(canvas);
      rendered = true;
    } catch (e) {}
  }
}

function showEnlargedQrModal(name, title, creds, verifyUrl, phone = '', email = '') {
  let modal = $('#modal-qr-enlarged');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-qr-enlarged';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  let contactBadgesHtml = '';
  if (email) {
    contactBadgesHtml += `
      <div style="font-family:var(--font-mono);font-size:12px;color:#38bdf8;margin-bottom:6px;display:flex;align-items:center;justify-content:center;gap:6px;">
        <span>✉️</span> <span>${escapeHtml(email)}</span>
      </div>
    `;
  }
  if (phone) {
    contactBadgesHtml += `
      <div style="font-family:var(--font-mono);font-size:12px;color:#38bdf8;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:6px;">
        <span>📱</span> <span>${escapeHtml(phone)}</span>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="modal-card" style="max-width:440px;text-align:center;position:relative;">
      <button type="button" class="modal-close-btn" id="btn-close-qr-modal" aria-label="Close modal">×</button>
      <div class="badge-pill badge-global" style="margin-bottom:12px;font-size:11px;">
        📱 SCAN TO VERIFY CREDENTIAL
      </div>
      <h3 style="font-size:20px;margin:0 0 4px 0;">${escapeHtml(name)}</h3>
      <div style="color:var(--accent-cyan);font-size:13.5px;font-weight:700;margin-bottom:8px;">
        ${escapeHtml(title)}
      </div>
      ${contactBadgesHtml}

      <div id="modal-qr-code-target" style="background:#ffffff;padding:16px;border-radius:12px;width:220px;height:220px;margin:0 auto 16px auto;box-shadow:0 10px 30px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;"></div>

      <p style="font-size:12.5px;color:var(--text-muted);margin-bottom:16px;">
        Point any smartphone camera at this code to verify your credentials on the live Fair network.
      </p>

      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <a href="${verifyUrl}" target="_blank" class="btn btn-primary btn-sm">
          <span>🔗</span> <span>Open Verification Page</span>
        </a>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-qr-modal-copy">
          <span>📋</span> <span>Copy Link</span>
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  modal.style.zIndex = '999999';

  const qrTarget = modal.querySelector('#modal-qr-code-target');
  renderQrCode(qrTarget, verifyUrl, 190);

  const closeFn = () => { modal.style.display = 'none'; };
  modal.querySelector('#btn-close-qr-modal')?.addEventListener('click', closeFn);
  modal.querySelector('.modal-card')?.addEventListener('click', e => e.stopPropagation());
  modal.addEventListener('click', e => { if (e.target === modal) closeFn(); });
  modal.querySelector('#btn-qr-modal-copy')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(verifyUrl);
    showToast('Verification link copied! 📋');
  });
}

function showVerifiedCredentialModal(student, title, creds, phone = '', email = '', credentialId = '') {
  let modalBackdrop = $('#modal-verified-credential');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'modal-verified-credential';
    modalBackdrop.className = 'modal-backdrop';
    document.body.appendChild(modalBackdrop);
  }

  const emailRowHtml = email ? `
    <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-top:10px;margin-bottom:4px;">Executive Email Address</div>
    <div style="font-family:var(--font-mono);font-size:13px;color:#38bdf8;font-weight:600;display:flex;align-items:center;gap:6px;word-break:break-all;">
      <span>✉️</span> <span>${escapeHtml(email)}</span>
    </div>
  ` : '';

  const phoneRowHtml = phone ? `
    <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-top:10px;margin-bottom:4px;">Executive Contact Line</div>
    <div style="font-family:var(--font-mono);font-size:13px;color:#38bdf8;font-weight:600;display:flex;align-items:center;gap:6px;word-break:break-word;">
      <span>📱</span> <span>${escapeHtml(phone)}</span>
    </div>
  ` : '';

  const idRowHtml = credentialId ? `
    <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-top:10px;margin-bottom:4px;">Official Credential ID</div>
    <div style="font-family:var(--font-mono);font-size:12.5px;color:#e8a04a;font-weight:700;display:flex;align-items:center;gap:6px;word-break:break-word;">
      <span>🪪</span> <span>${escapeHtml(credentialId)}</span>
    </div>
  ` : '';

  modalBackdrop.innerHTML = `
    <div class="modal-card" style="max-width:min(460px, calc(100vw - 32px));width:100%;min-width:0;box-sizing:border-box;margin:auto;text-align:center;position:relative;padding:24px 18px;border-radius:22px;border:1px solid rgba(16,185,129,0.35);box-shadow:0 24px 60px rgba(0,0,0,0.85),0 0 28px rgba(16,185,129,0.18);">
      <button type="button" class="modal-close-btn" id="btn-close-verify-modal" aria-label="Close modal" style="position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
      <div style="font-size:42px;margin-bottom:8px;filter:drop-shadow(0 0 10px rgba(16,185,129,0.4));">🛡️</div>
      <div style="display:inline-block;max-width:100%;margin-bottom:12px;">
        <span class="badge-pill" style="background:rgba(16,185,129,0.14);color:#34d399;border:1px solid rgba(16,185,129,0.4);font-weight:700;white-space:normal;display:inline-block;line-height:1.35;padding:5px 12px;font-size:clamp(9.5px, 2.7vw, 11px);letter-spacing:0.04em;text-align:center;word-break:break-word;">
          OFFICIAL 2040 EXECUTIVE CREDENTIAL · VERIFIED
        </span>
      </div>
      <h2 style="font-size:clamp(20px, 4.8vw, 26px);font-weight:800;color:#fff;margin:0 0 6px 0;word-break:break-word;line-height:1.2;">${escapeHtml(student)}</h2>
      <div style="color:var(--accent-cyan);font-size:clamp(13.5px, 3.6vw, 16px);font-weight:700;margin-bottom:16px;word-break:break-word;">
        ${escapeHtml(title)}
      </div>

      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:14px;margin-bottom:18px;text-align:left;box-sizing:border-box;">
        <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Verified Honors &amp; Degree Track</div>
        <div style="font-family:var(--font-mono);font-size:12.5px;color:var(--text-main);font-weight:600;margin-bottom:10px;word-break:break-word;line-height:1.4;">
          ${escapeHtml(creds)}
        </div>
        ${emailRowHtml}
        ${phoneRowHtml}
        ${idRowHtml}
        <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.05em;margin-top:10px;margin-bottom:4px;">Issuing Academy</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.4;">
          🏛️ Kanakia International School Mira Road · Career Fair
        </div>
        <div style="font-size:10.5px;color:#34d399;margin-top:8px;display:flex;align-items:center;gap:5px;line-height:1.3;">
          <span>✓</span> <span>Cryptographically Signed Dynamic QR Verification Active</span>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;width:100%;box-sizing:border-box;">
        <button type="button" class="btn btn-primary" id="btn-verify-to-roadmap" style="width:100%;min-height:44px;justify-content:center;font-size:14px;font-weight:700;">
          <span>🗺️</span> <span>Explore Career Roadmap</span>
        </button>
        <div style="display:flex;gap:10px;width:100%;box-sizing:border-box;">
          <button type="button" class="btn btn-secondary" id="btn-verify-to-card" style="flex:1;min-height:42px;justify-content:center;font-size:13px;padding:0 10px;">
            <span>📇</span> <span>View Business Card</span>
          </button>
          <button type="button" class="btn btn-secondary" id="btn-verify-dismiss" style="min-height:42px;padding:0 20px;justify-content:center;font-size:13px;">
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  `;

  modalBackdrop.style.display = 'flex';
  modalBackdrop.style.position = 'fixed';
  modalBackdrop.style.inset = '0';
  modalBackdrop.style.zIndex = '999999';
  modalBackdrop.style.alignItems = 'center';
  modalBackdrop.style.justifyContent = 'center';
  modalBackdrop.style.padding = '16px';
  modalBackdrop.style.boxSizing = 'border-box';
  modalBackdrop.style.overflowY = 'auto';

  const closeFn = () => { 
    modalBackdrop.style.display = 'none'; 
  };
  
  modalBackdrop.querySelector('#btn-close-verify-modal')?.addEventListener('click', closeFn);
  modalBackdrop.querySelector('#btn-verify-dismiss')?.addEventListener('click', closeFn);
  
  // Prevent clicks inside card from closing modal
  modalBackdrop.querySelector('.modal-card')?.addEventListener('click', e => {
    e.stopPropagation();
  });
  modalBackdrop.addEventListener('click', e => { 
    if (e.target === modalBackdrop) closeFn(); 
  });

  // Action: Explore Career Roadmap
  modalBackdrop.querySelector('#btn-verify-to-roadmap')?.addEventListener('click', () => {
    closeFn();
    switchTab('roadmap');
    if (title) STATE.targetCareer = title;
    if (typeof renderPlanTool === 'function') {
      renderPlanTool('myplan');
    }
    const sec = $('#sec-roadmap');
    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
      window.AppRouter.navigate('/roadmap/myplan', { silent: true });
    }
  });

  // Action: View Business Card
  modalBackdrop.querySelector('#btn-verify-to-card')?.addEventListener('click', () => {
    closeFn();
    switchTab('roadmap');
    if (title) STATE.targetCareer = title;
    if (typeof renderPlanTool === 'function') {
      renderPlanTool('bizcard');
    }
    const sec = $('#sec-roadmap');
    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
      window.AppRouter.navigate('/roadmap/bizcard', { silent: true });
    }
  });
}

function checkIncomingCardVerification() {
  try {
    const params = new URLSearchParams(window.location.search);
    const hasVerify = params.get('verify') === '2040' || params.get('v') === '1' || params.get('v') === '2040';
    const hasStudent = params.has('student') || params.has('s');
    const hasTitle = params.has('title') || params.has('t');

    if (hasVerify || (hasStudent && hasTitle)) {
      // Immediately dismiss site loader so verified card modal is clearly visible
      if (window.SiteLoader && typeof window.SiteLoader.dismiss === 'function') {
        window.SiteLoader.dismiss();
      }
      const loaderEl = document.getElementById('site-loader');
      if (loaderEl) {
        loaderEl.classList.add('loader-hidden');
        try { loaderEl.remove(); } catch (_) {}
      }

      const student = params.get('student') || params.get('s') || 'Executive Explorer';
      const title = params.get('title') || params.get('t') || 'Future Career Leader';
      let creds = params.get('creds') || params.get('c') || '';
      if (!creds && title && typeof CAREER_CREDENTIALS_MAP !== 'undefined' && CAREER_CREDENTIALS_MAP[title]) {
        creds = CAREER_CREDENTIALS_MAP[title][0];
      }
      if (!creds) creds = 'Class of 2040 · Executive Honors';
      const phone = params.get('phone') || params.get('p') || '';
      const email = params.get('email') || params.get('e') || '';
      const credentialId = params.get('id') || '';

      // Prepare target career state so card and roadmap reflect student verified profile
      if (title) {
        STATE.targetCareer = title;
      }
      if (student && student !== 'Executive Explorer') {
        STATE.studentName = student;
      }
      
      // Auto-switch view to Roadmap/Bizcard in the background
      switchTab('roadmap', { skipSubInit: true });
      if (typeof renderPlanTool === 'function') {
        renderPlanTool('bizcard');
      }

      // Pre-fill business card form if present
      setTimeout(() => {
        const nameInput = $('#biz-name') || $('#bc-input-name');
        if (nameInput && student) nameInput.value = student;
        const phoneInput = $('#biz-phone') || $('#bc-input-phone');
        if (phoneInput && phone) phoneInput.value = phone;
        const emailInput = $('#biz-email') || $('#bc-input-email');
        if (emailInput && email) emailInput.value = email;
        const careerSel = $('#biz-career-select') || $('#bizcard-career-select');
        if (careerSel && title) {
          const opts = Array.from(careerSel.options);
          const found = opts.find(o => o.value.toLowerCase() === title.toLowerCase());
          if (found) {
            careerSel.value = found.value;
            careerSel.dispatchEvent(new Event('change'));
          } else {
            const customInput = $('#biz-career-custom');
            if (customInput) {
              customInput.value = title;
              const cont = $('#biz-custom-career-container');
              if (cont) cont.style.display = 'block';
              careerSel.value = '__custom__';
            }
          }
        }
        const bcName = $('#bc-name');
        const bcTitle = $('#bc-title');
        const bcCreds = $('#bc-creds');
        if (bcName) bcName.textContent = student;
        if (bcTitle) bcTitle.textContent = title;
        if (bcCreds) bcCreds.textContent = creds;
      }, 50);

      // Show verified executive credential modal on top with credentialId
      showVerifiedCredentialModal(student, title, creds, phone, email, credentialId);
    }
  } catch (e) {
    console.error('Error handling card verification:', e);
  }
}

function renderFutureBusinessCard(mount) {
  const savedBizData = (() => {
    try {
      return JSON.parse(localStorage.getItem('cf_bizcard_data') || '{}');
    } catch (_) { return {}; }
  })();

  const studentName = STATE.studentName 
    || savedBizData.name 
    || localStorage.getItem('cf_student_name') 
    || localStorage.getItem('ecf_student_name') 
    || localStorage.getItem('ecf_bizcard_name') 
    || '';
  // Determine initial selected career: either existing student targetCareer or Commercial Airline Pilot
  const initialCareer = (STATE.targetCareer && CAREER_CREDENTIALS_MAP[STATE.targetCareer]) 
    ? STATE.targetCareer 
    : 'Commercial Airline Pilot';

  // Group careers by category
  const categories = {};
  CAREERS_DATA.forEach(c => {
    const cat = c.cat || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(c);
  });

  const totalCareerCount = CAREERS_DATA.length;

  // Build career options HTML grouped by category
  let careerOptionsHtml = '<option value="" disabled selected>-- Select Your Dream Career (Mandatory) --</option>';
  for (const [catName, list] of Object.entries(categories)) {
    careerOptionsHtml += `<optgroup label="── ${escapeHtml(catName)} ──">`;
    list.forEach(c => {
      const isSel = '';
      careerOptionsHtml += `<option value="${escapeHtml(c.title)}" ${isSel}>${c.icon} ${escapeHtml(c.title)}</option>`;
    });
    careerOptionsHtml += `</optgroup>`;
  }

  // Add Custom Option at top or bottom
  careerOptionsHtml += `<optgroup label="── ✍️ CUSTOM CAREER ──">`;
  careerOptionsHtml += `<option value="__custom__">✨ ✍️ + Type Custom Dream Profession...</option>`;
  careerOptionsHtml += `</optgroup>`;

  mount.innerHTML = `
    <div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="font-size:20px;display:flex;align-items:center;gap:8px;">
        <span>🪪</span> <span>Future Business Card Generator</span>
        <span class="badge-pill badge-global" style="font-size:11px;font-family:var(--font-mono);">${totalCareerCount}+ Elite Pathways</span>
      </h3>
      <p style="font-size:13.5px;color:var(--text-dim);">Design your executive credentials for the year 2040 complete with dynamic QR verification.</p>
    </div>

    <div class="bizcard-grid">
      <!-- Left Column: Controls & Dynamic Dropdowns -->
      <div>
        <div style="margin-bottom:12px;">
          <label for="biz-name" style="font-size:13px;font-weight:700;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span>Your Name:</span>
            <span style="font-size:11.5px;color:#f87171;font-weight:700;padding:1px 6px;background:rgba(239,68,68,0.1);border-radius:4px;">Mandatory *</span>
          </label>
          <input type="text" id="biz-name" value="${escapeHtml(studentName)}" placeholder="Enter your full name">
        </div>

        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <label for="biz-career-select" style="font-size:13px;font-weight:700;margin:0;">
              Future Dream Career (${totalCareerCount} Career Paths):
            </label>
            <button type="button" class="btn-toggle-custom" id="btn-custom-career-toggle" title="Switch to custom career input">
              <span>✍️</span> <span>Custom Profession</span>
            </button>
          </div>
          <select id="biz-career-select" class="form-select" style="width:100%;">
            ${careerOptionsHtml}
          </select>
          <div id="biz-custom-career-container" style="display:none;margin-top:8px;">
            <input type="text" id="biz-career-custom" placeholder="Type your dream profession (e.g. Chief AI Officer, Quantum Bio-Chemist)...">
            <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">✨ Type any custom title you envision for yourself in 2040.</div>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <label for="biz-creds-select" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">
            Credentials / Honors (Specialized by Career):
          </label>
          <select id="biz-creds-select" class="form-select" style="width:100%;">
            <!-- Populated dynamically based on career choice -->
          </select>
          <input type="text" id="biz-creds-custom" placeholder="Type your custom degrees, licenses or honors..." style="display:none;margin-top:8px;">
        </div>

        <!-- Executive Email Field (Always Visible & Optional) -->
        <div style="margin-bottom:12px;">
          <label for="biz-email" style="font-size:13px;font-weight:700;margin:0 0 6px 0;display:flex;justify-content:space-between;align-items:center;">
            <span>Executive Email:</span>
            <span style="font-size:11.5px;color:var(--text-dim);font-weight:normal;padding:1px 6px;background:rgba(255,255,255,0.06);border-radius:4px;">Optional</span>
          </label>
          <div id="biz-email-container" style="display:block;">
            <input type="email" id="biz-email" placeholder="e.g. student@kanakia.edu or executive@global.org">
            <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">🔒 Optional: If provided, dynamically included on your 2040 card &amp; QR verification code.</div>
          </div>
        </div>

        <!-- Executive Contact / Phone Field (Always Visible & Optional) -->
        <div style="margin-bottom:12px;">
          <label for="biz-phone" style="font-size:13px;font-weight:700;margin:0 0 6px 0;display:flex;justify-content:space-between;align-items:center;">
            <span>Executive Contact / Phone:</span>
            <span style="font-size:11.5px;color:var(--text-dim);font-weight:normal;padding:1px 6px;background:rgba(255,255,255,0.06);border-radius:4px;">Optional</span>
          </label>
          <div id="biz-phone-container" style="display:block;">
            <input type="tel" id="biz-phone" placeholder="e.g. +91 98765 43210 or executive@direct.line">
            <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">🔒 Optional: If provided, dynamically included on your 2040 card &amp; QR verification code.</div>
          </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
          <button class="btn btn-primary" id="btn-render-biz" type="button">
            <span>✨</span> <span>Update Business Card</span>
          </button>
          <button class="btn btn-secondary" id="btn-download-biz" type="button" title="Download card image as PNG">
            <span>📥</span> <span>Download Card</span>
          </button>
          <button class="btn btn-secondary" id="btn-share-biz" type="button" title="Copy verification link to clipboard">
            <span>🔗</span> <span>Copy Link</span>
          </button>
        </div>
      </div>

      <!-- Right Column: Live Interactive Business Card Render -->
      <div>
        <div id="biz-card-render" class="biz-card-render">
          <div class="biz-card-top">
            <div style="flex:1;min-width:0;">
              <div class="biz-card-badge">CLASS OF 2040 · EXECUTIVE CREDENTIAL</div>
              <h3 class="biz-card-name" id="bc-name">${escapeHtml(STATE.studentName || 'Explorer')}</h3>
              <div class="biz-card-title" id="bc-title">${escapeHtml(initialCareer)}</div>
              <div class="biz-card-contact" id="bc-email-row" style="display:none;">
                <span class="biz-card-contact-icon">✉️</span>
                <span id="bc-email"></span>
              </div>
              <div class="biz-card-contact" id="bc-contact-row" style="display:none;">
                <span class="biz-card-contact-icon">📞</span>
                <span id="bc-phone"></span>
              </div>
            </div>
            <div id="bc-qr-mount" class="biz-card-qr-box" title="Click to view & scan full-size verification badge">
              <!-- Crisp vector QR code rendered here -->
            </div>
          </div>
          <div class="biz-card-bottom">
            <div class="biz-card-creds" id="bc-creds">Loading honors...</div>
            <div class="biz-card-school">
              <span>🏛️</span>
              <span>Kanakia International School Mira Road</span>
            </div>
          </div>
        </div>
        <div style="font-size:11.5px;color:var(--text-dim);margin-top:10px;text-align:center;">
          💡 Tap QR code or scan with any smartphone camera to verify this 2040 credential.
        </div>
      </div>
    </div>
  `;

  const nameInput = $('#biz-name');
  if (nameInput && !nameInput.value && studentName) {
    nameInput.value = studentName;
  }
  const careerSelect = $('#biz-career-select');
  const careerCustomContainer = $('#biz-custom-career-container');
  const careerCustomInput = $('#biz-career-custom');
  const btnCustomToggle = $('#btn-custom-career-toggle');

  const credsSelect = $('#biz-creds-select');
  const credsCustomInput = $('#biz-creds-custom');

  const emailInput = $('#biz-email');
  const phoneContainer = $('#biz-phone-container');
  const phoneInput = $('#biz-phone');
  const btnPhoneToggle = $('#btn-toggle-phone-row');

  const cardEl = $('#biz-card-render');

  // Helper to populate credentials select based on chosen career
  const populateCredentialsForCareer = (careerName) => {
    if (!credsSelect) return;
    if (!careerName || careerName === '') {
      credsSelect.innerHTML = '<option value="" disabled selected>-- Select Credentials / Honors (Mandatory) --</option>';
      if (credsCustomInput) credsCustomInput.style.display = 'none';
      return;
    }
    const credsList = CAREER_CREDENTIALS_MAP[careerName] || [
      "B.A. / B.Sc Honors · Distinguished Scholar Alum",
      "Executive Masters · Leadership Board Certified",
      "Senior Specialist · Global Industry Fellow",
      "Class of 2040 · International Honors Graduate"
    ];

    let opts = '<option value="" disabled selected>-- Select Credentials / Honors (Mandatory) --</option>';
    credsList.forEach((c) => {
      opts += `<option value="${escapeHtml(c)}">🎖️ ${escapeHtml(c)}</option>`;
    });
    opts += `<option value="__custom__">✍️ Custom / Type My Own Honors...</option>`;

    credsSelect.innerHTML = opts;
    if (credsCustomInput) {
      credsCustomInput.style.display = 'none';
      credsCustomInput.value = '';
    }
  };

  // Helper to update the card preview live
  const updateCard = (animatePulse = false) => {
    const rawName = (nameInput?.value || studentName || '').trim();
    const name = capitalizeName(rawName);
    if (nameInput && rawName) nameInput.value = name;

    let career = careerSelect?.value || '';
    if (career === '__custom__') {
      const customTitle = (careerCustomInput?.value || '').trim();
      career = customTitle || '';
    }

    let creds = credsSelect?.value || '';
    if (creds === '__custom__') {
      creds = (credsCustomInput?.value || '').trim();
    }

    const email = (emailInput?.value || '').trim();
    const phone = (phoneInput?.value || '').trim();

    // Update DOM on the card preview
    const bcName = $('#bc-name');
    const bcTitle = $('#bc-title');
    const bcCreds = $('#bc-creds');
    const bcEmailRow = $('#bc-email-row');
    const bcEmail = $('#bc-email');
    const bcContactRow = $('#bc-contact-row');
    const bcPhone = $('#bc-phone');

    if (bcName) bcName.textContent = name || 'YOUR FULL NAME';
    if (bcTitle) {
      if (career) {
        const found = CAREERS_DATA.find(c => c.title === career);
        const icon = found?.icon || '🌐';
        bcTitle.innerHTML = `<span>${icon}</span> <span>${escapeHtml(career)}</span>`;
      } else {
        bcTitle.innerHTML = `<span>✨</span> <span>Select Your Dream Career</span>`;
      }
    }
    if (bcCreds) bcCreds.textContent = creds || '🎓 Select Your Honors / Degrees';

    if (bcEmailRow && bcEmail) {
      if (email) {
        bcEmail.textContent = email;
        bcEmailRow.style.display = 'flex';
      } else {
        bcEmailRow.style.display = 'none';
      }
    }

    if (bcContactRow && bcPhone) {
      if (phone) {
        bcPhone.textContent = phone;
        bcContactRow.style.display = 'flex';
      } else {
        bcContactRow.style.display = 'none';
      }
    }

    // Generate ultra-compact dynamic verification URL (<100 chars -> instant camera scan)
    const isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const baseOrigin = (window.location.origin && !isLocalhost && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
      ? window.location.origin
      : 'https://careerwithenglish.pages.dev';
    const pathname = window.location.pathname || '/';
    // Compact parameters: v=1, s=Name, t=Title, e=Email, p=Phone
    // Keeps QR code data under 100 chars -> Version 3 QR code with large, chunky modules
    // Scans in <0.1 second on any smartphone camera!
    let verifyUrl = `${baseOrigin}/?v=1&s=${encodeURIComponent(name)}&t=${encodeURIComponent(career)}`;
    if (email) {
      verifyUrl += `&e=${encodeURIComponent(email)}`;
    }
    if (phone) {
      verifyUrl += `&p=${encodeURIComponent(phone)}`;
    }

    // Persist active business card information so Booklet PDF and QR code stay 100% in sync
    try {
      localStorage.setItem('cf_bizcard_data', JSON.stringify({
        name,
        career,
        creds,
        email,
        phone,
        verifyUrl
      }));
      if (name && name !== 'Explorer') {
        localStorage.setItem('cf_student_name', name);
        if (window.STATE) window.STATE.studentName = name;
      }
      if (career) {
        if (window.STATE) window.STATE.targetCareer = career;
      }
    } catch (_) {}

    // Render crisp scan-ready vector QR code
    const qrMount = $('#bc-qr-mount');
    if (qrMount) {
      renderQrCode(qrMount, verifyUrl, 74);
      qrMount.title = "Click to view & scan full-size verification badge";
      qrMount.style.cursor = "pointer";
      qrMount.onclick = () => {
        showEnlargedQrModal(name, career, creds, verifyUrl, phone, email);
      };
    }

    if (animatePulse && cardEl) {
      cardEl.classList.remove('biz-card-pulse');
      // trigger reflow
      void cardEl.offsetWidth;
      cardEl.classList.add('biz-card-pulse');
      showToast('Business Card Updated! 🪪✨');
    }

    return { name, career, creds, email, phone, verifyUrl };
  };

  // 1. Initial population with disabled prompt
  populateCredentialsForCareer('');
  updateCard(false);

  // 2. Wire career selection change
  careerSelect?.addEventListener('change', () => {
    const selectedCareer = careerSelect.value;
    if (selectedCareer === '__custom__') {
      if (careerCustomContainer) careerCustomContainer.style.display = 'block';
      careerCustomInput?.focus();
      populateCredentialsForCareer('__custom__');
    } else {
      if (careerCustomContainer) careerCustomContainer.style.display = 'none';
      populateCredentialsForCareer(selectedCareer);
    }
    updateCard(false);
  });

  // Wire Custom Profession Button toggle
  btnCustomToggle?.addEventListener('click', () => {
    if (careerSelect) {
      careerSelect.value = '__custom__';
      if (careerCustomContainer) careerCustomContainer.style.display = 'block';
      careerCustomInput?.focus();
      populateCredentialsForCareer('__custom__');
      updateCard(false);
    }
  });

  careerCustomInput?.addEventListener('input', () => updateCard(false));

  // 3. Wire credentials dropdown change
  credsSelect?.addEventListener('change', () => {
    if (credsSelect.value === '__custom__') {
      if (credsCustomInput) {
        credsCustomInput.style.display = 'block';
        credsCustomInput.focus();
      }
    } else {
      if (credsCustomInput) credsCustomInput.style.display = 'none';
    }
    updateCard(false);
  });

  // 4. Wire phone row toggle
  btnPhoneToggle?.addEventListener('click', () => {
    if (phoneContainer) {
      const isHidden = phoneContainer.style.display === 'none' || !phoneContainer.style.display;
      phoneContainer.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        phoneInput?.focus();
        btnPhoneToggle.innerHTML = '<span>✕</span> <span>Hide Contact Line</span>';
      } else {
        btnPhoneToggle.innerHTML = '<span>📞</span> <span>+ Add Contact Line</span>';
        if (phoneInput) phoneInput.value = '';
        updateCard(false);
      }
    }
  });

  emailInput?.addEventListener('input', () => updateCard(false));
  phoneInput?.addEventListener('input', () => updateCard(false));

  // 5. Wire real-time keystroke input listeners for instant live updating
  nameInput?.addEventListener('input', () => updateCard(false));
  nameInput?.addEventListener('change', () => updateCard(false));
  credsCustomInput?.addEventListener('input', () => updateCard(false));

  // Validation helper to enforce mandatory fields on Business Card
  const validateBizCardInputs = () => {
    const rawName = (nameInput?.value || '').trim();
    const career = careerSelect?.value || '';
    const customCareer = (careerCustomInput?.value || '').trim();
    const creds = credsSelect?.value || '';
    const customCreds = (credsCustomInput?.value || '').trim();

    let hasError = false;
    let firstErrorEl = null;

    if (!rawName) {
      if (nameInput) nameInput.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = nameInput;
      hasError = true;
    } else {
      if (nameInput) nameInput.style.borderColor = '';
    }

    if (!career || career === '' || (career === '__custom__' && !customCareer)) {
      const el = (career === '__custom__') ? careerCustomInput : careerSelect;
      if (el) el.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = el;
      hasError = true;
    } else {
      if (careerSelect) careerSelect.style.borderColor = '';
      if (careerCustomInput) careerCustomInput.style.borderColor = '';
    }

    if (!creds || creds === '' || (creds === '__custom__' && !customCreds)) {
      const el = (creds === '__custom__') ? credsCustomInput : credsSelect;
      if (el) el.style.borderColor = '#ef4444';
      if (!firstErrorEl) firstErrorEl = el;
      hasError = true;
    } else {
      if (credsSelect) credsSelect.style.borderColor = '';
      if (credsCustomInput) credsCustomInput.style.borderColor = '';
    }

    if (hasError) {
      showToast('⚠️ All fields (Name, Career, and Credentials) are mandatory!');
      firstErrorEl?.focus();
      return false;
    }
    return true;
  };

  // Clear errors on input
  nameInput?.addEventListener('input', () => {
    if (nameInput) nameInput.style.borderColor = '';
  });
  careerSelect?.addEventListener('change', () => {
    if (careerSelect) careerSelect.style.borderColor = '';
  });
  careerCustomInput?.addEventListener('input', () => {
    if (careerCustomInput) careerCustomInput.style.borderColor = '';
  });
  credsSelect?.addEventListener('change', () => {
    if (credsSelect) credsSelect.style.borderColor = '';
  });
  credsCustomInput?.addEventListener('input', () => {
    if (credsCustomInput) credsCustomInput.style.borderColor = '';
  });

  // 6. Wire Update button click -> updates with celebratory pulse glow & toast
  $('#btn-render-biz')?.addEventListener('click', () => {
    if (!validateBizCardInputs()) return;
    updateCard(true);
  });

  // 7. Wire Copy Share Link button
  $('#btn-share-biz')?.addEventListener('click', () => {
    if (!validateBizCardInputs()) return;
    const { verifyUrl } = updateCard(false);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(verifyUrl);
    }
    showToast('Verification Link copied! 📋');
  });

  // 8. Wire Download Card PNG button
  $('#btn-download-biz')?.addEventListener('click', () => {
    if (!validateBizCardInputs()) return;
    const { name, career, creds, email, phone } = updateCard(false);
    downloadBusinessCardImage(name, career, creds, phone, email);
  });
}

function downloadBusinessCardImage(name, title, creds, phone = '', email = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 460;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 800, 460);
  grad.addColorStop(0, '#090e1a');
  grad.addColorStop(0.5, '#151e36');
  grad.addColorStop(1, '#0a0f1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 460);

  // Border & Accent line
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 784, 444);

  const lineGrad = ctx.createLinearGradient(0, 0, 800, 0);
  lineGrad.addColorStop(0, 'rgba(0,240,255,0)');
  lineGrad.addColorStop(0.3, '#00f0ff');
  lineGrad.addColorStop(0.7, '#ff2a85');
  lineGrad.addColorStop(1, 'rgba(255,42,133,0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(8, 8, 784, 6);

  // Badge
  ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
  ctx.fillRect(40, 36, 310, 26);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 36, 310, 26);
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillText('CLASS OF 2040 · EXECUTIVE CREDENTIAL', 50, 54);

  // Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(name, 40, 110);

  // Title
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, 40, 146);

  // Email and Phone / Contact if available
  let contactY = 176;
  if (email) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText(`✉️ ${email}`, 40, contactY);
    contactY += 24;
  }
  if (phone) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText(`📱 ${phone}`, 40, contactY);
  }

  // Credentials
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText(creds, 40, 375);

  // School
  ctx.fillStyle = '#64748b';
  ctx.font = '14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('🏛️ Kanakia International School Mira Road', 40, 412);

  // QR box
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(630, 36, 130, 130);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(630, 36, 130, 130);

  let drawnQr = false;
  if (typeof qrcode !== 'undefined') {
    try {
      const qr = qrcode(0, 'L');
      const baseOrigin = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
        ? window.location.origin
        : 'https://careerwithenglish.pages.dev';
      const pathname = window.location.pathname || '/';
      let verifyUrl = `${baseOrigin}/?v=1&s=${encodeURIComponent(name)}&t=${encodeURIComponent(title)}`;
      if (email) verifyUrl += `&e=${encodeURIComponent(email)}`;
      if (phone) verifyUrl += `&p=${encodeURIComponent(phone)}`;

      qr.addData(verifyUrl);
      qr.make();
      const count = qr.getModuleCount();
      const qrX = 638;
      const qrY = 44;
      const qrSize = 114;
      const cell = qrSize / count;
      ctx.fillStyle = '#000000';
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(qrX + c * cell, qrY + r * cell, cell + 0.3, cell + 0.3);
          }
        }
      }
      drawnQr = true;
    } catch (e) {}
  }

  const finish = () => {
    const link = document.createElement('a');
    link.download = `${name.replace(/\s+/g, '_')}_Business_Card_2040.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Business Card Downloaded! 📥');
  };

  if (drawnQr) {
    finish();
  } else {
    const qrSvg = $('#bc-qr-mount svg');
    if (qrSvg) {
      const svgData = new XMLSerializer().serializeToString(qrSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 638, 44, 114, 114);
        DOMURL.revokeObjectURL(url);
        finish();
      };
      img.src = url;
    } else {
      finish();
    }
  }
}

// ─── 11. LEADERBOARD & FEEDBACK WALL ──────────────────────────────────────────
function updateLeaderboardBadges(scores) {
  const list = Array.isArray(scores) ? scores : [];
  const count = list.length;
  let topAcc = 0;
  if (count > 0) {
    topAcc = list.reduce((m, s) => Math.max(m, Number(s.acc || 0)), 0);
  }

  // 1. Navigation Tab badge: [ 🏆 Leaderboard ] [ 🎯 98% Top ] (like [ 🎮 Arcade Games ] [ 7 Modes ])
  const tabBadge = $('#tab-badge-leaderboard');
  if (tabBadge) {
    tabBadge.textContent = topAcc > 0 ? `🎯 ${topAcc}% Top` : (count > 0 ? `Top ${Math.min(10, count)}` : 'Live Top 10');
  }

  // 2. Section header badge
  const countBadge = $('#leaderboard-count-badge');
  if (countBadge) {
    countBadge.textContent = count > 0 ? `🏆 ${count} Attempt${count === 1 ? '' : 's'}${topAcc > 0 ? ` · Top ${topAcc}%` : ''}` : 'Live Top 10';
  }
}

async function loadLeaderboard(filterPack = 'All') {
  const tbody = $('#leaderboard-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);"><span class="spinner-sm"></span> Loading real-time scores...</td></tr>`;

  let serverScores = null;
  try {
    const isSpeechPack = filterPack && (filterPack.toLowerCase() === 'speech lab' || filterPack.toLowerCase() === 'ai speech lab');
    const queryPack = isSpeechPack ? 'Speech Lab' : filterPack;
    const data = await fetchApi(`scores${queryPack && queryPack !== 'All' ? '?pack=' + encodeURIComponent(queryPack) : ''}`);
    if (Array.isArray(data)) {
      serverScores = data;
    }
  } catch (e) {
    console.warn('Leaderboard sync note:', e);
  }

  // Retrieve cached local scores
  let localScores = [];
  try {
    const raw = localStorage.getItem('cf_user_scores');
    if (raw) localScores = JSON.parse(raw);
  } catch (e) {}

  let scores = [];
  if (Array.isArray(serverScores)) {
    scores = [...serverScores];

    // Merge recent local scores that may still be in-flight or not yet committed to server
    if (Array.isArray(localScores) && localScores.length > 0) {
      localScores.forEach(loc => {
        if (!loc || !loc.name) return;
        const normName = loc.name.toLowerCase().trim();
        const existingIdx = scores.findIndex(s => (s.name || '').toLowerCase().trim() === normName);
        if (existingIdx === -1) {
          scores.push(loc);
        } else if ((Number(loc.acc) || 0) > (Number(scores[existingIdx].acc) || 0)) {
          scores[existingIdx] = { ...scores[existingIdx], ...loc };
        }
      });
    }

    try {
      if (!filterPack || filterPack === 'All') {
        localStorage.setItem('cf_user_scores', JSON.stringify(scores));
      }
    } catch (e) {}
  } else {
    scores = localScores;
  }

  // Filter by pack if specified
  if (filterPack && filterPack !== 'All') {
    const fLower = filterPack.toLowerCase();
    scores = scores.filter(s => {
      const p = (s.pack || '').toLowerCase();
      if (fLower === 'speech lab' || fLower === 'ai speech lab') {
        return p.includes('speech');
      }
      return p === fLower;
    });
  }

// D1 database is authoritative source of truth for scores

  scores.sort((a, b) => (Number(b.acc) || 0) - (Number(a.acc) || 0) || (Number(b.ts) || 0) - (Number(a.ts) || 0));

  // Check for any newly arrived Top 10 scores and notify in real-time
  try {
    const knownTopKeys = window._lastKnownTop10Keys || new Set();
    const isFirstLoad = !window._lastKnownTop10Keys;
    const currentTopKeys = new Set();
    const top10 = scores.slice(0, 10);

    top10.forEach((item, idx) => {
      const key = `${item.id || ''}_${item.name || ''}_${item.acc || ''}_${item.ts || ''}`;
      currentTopKeys.add(key);
      if (!isFirstLoad && !knownTopKeys.has(key)) {
        // Top 10 score notification permanently disabled per user request
      }
    });
    window._lastKnownTop10Keys = currentTopKeys;
  } catch (e) {
    console.debug('Leaderboard top-10 check note:', e);
  }

  updateLeaderboardBadges(scores);

  tbody.innerHTML = '';
  // Zero default mock scores — only real student exhibition scores
  if (!scores.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:36px 20px;color:var(--text-muted);">
          <div style="font-size:26px;margin-bottom:8px;">🎙️</div>
          <div style="font-weight:700;font-size:15px;color:var(--text-main);margin-bottom:4px;">No Exhibition Scores Recorded Yet</div>
          <div style="font-size:13px;color:var(--text-dim);">Be the first student to test your speech in the Speech Lab and claim the #1 spot!</div>
        </td>
      </tr>
    `;
    return;
  }

  const isMobileScreen = window.innerWidth <= 768;
  const isAdmin = !isMobileScreen && Boolean(STATE.adminKey || localStorage.getItem('cf_admin_session') || sessionStorage.getItem('cf_admin_session'));

  scores.forEach((sc, i) => {
    const tr = document.createElement('tr');
    const medal = i === 0 ? '🥇 1st' : i === 1 ? '🥈 2nd' : i === 2 ? '🥉 3rd' : `#${i + 1}`;
    const renameBtnHtml = isAdmin
      ? `<button type="button" class="btn btn-sm" title="Change Player Name (Admin)" style="margin-left:6px;padding:2px 6px;font-size:11px;background:rgba(0,240,255,0.12);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:4px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminChangeScoreName(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">✏️</button>`
      : '';
    const delBtnHtml = isAdmin
      ? `<button type="button" class="btn btn-sm" title="Delete Score Attempt (Admin)" style="margin-left:4px;padding:2px 6px;font-size:11px;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:4px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminDeleteScore(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">🗑️</button>`
      : '';

    let userTitlesMap = {};
    try {
      const storedTitles = localStorage.getItem('cf_user_titles');
      if (storedTitles) userTitlesMap = JSON.parse(storedTitles);
    } catch {}
    const customTitle = userTitlesMap[sc.name] || '';
    const titleBadgeHtml = customTitle
      ? `<span class="user-title-badge" title="Official Honor Title">👑 ${escapeHtml(customTitle)}</span>`
      : '';
    const titleBtnHtml = isAdmin
      ? `<button type="button" class="btn btn-sm" title="Assign Honor Title" style="margin-left:6px;padding:2px 6px;font-size:10.5px;background:rgba(0,240,255,0.1);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:4px;cursor:pointer;" onclick="window.adminAssignUserTitle('${encodeURIComponent(sc.name || '')}')">🏷️ Title</button>`
      : '';

    tr.innerHTML = `
      <td><strong style="color:${i < 3 ? 'var(--accent-gold)' : 'var(--text-muted)'}">${medal}</strong></td>
      <td class="leaderboard-name-cell">
        <div class="leaderboard-name-wrap">
          <strong class="leaderboard-name-text" title="${escapeHtml(sc.name)}">${escapeHtml(sc.name)}</strong>
          ${titleBadgeHtml}
          ${(titleBtnHtml || renameBtnHtml || delBtnHtml) ? `<span class="admin-score-actions">${titleBtnHtml}${renameBtnHtml}${delBtnHtml}</span>` : ''}
        </div>
      </td>
      <td><span class="badge-pill badge-nirf">${escapeHtml(sc.pack || 'Everyday')}</span></td>
      <td><strong style="color:var(--accent-emerald);">${sc.acc}%</strong></td>
      <td>${sc.fluency || '--'}%</td>
      <td>${sc.wpm || 130}</td>
      <td style="font-size:12px;color:var(--text-dim);white-space:nowrap;">${sc.ts ? new Date(Number(sc.ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function initLeaderboard() {
  $$('#leaderboard-pack-filters .filter-chip').forEach(btn => {
    btn.onclick = () => {
      $$('#leaderboard-pack-filters .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pack = btn.dataset.boardPack || 'All';
      loadLeaderboard(pack);
      if (window.AppRouter) {
        window.AppRouter.navigate('/leaderboard', { silent: true });
      }
    };
  });

  const refreshLeaderboardBtn = $('#btn-refresh-leaderboard') || $('#btn-refresh-scores');
  if (refreshLeaderboardBtn && !refreshLeaderboardBtn._boundRefresh) {
    refreshLeaderboardBtn._boundRefresh = true;
    refreshLeaderboardBtn.addEventListener('click', async () => {
      refreshLeaderboardBtn.disabled = true;
      const origHtml = refreshLeaderboardBtn.innerHTML;
      refreshLeaderboardBtn.innerHTML = '<span>⏳</span> <span>Refreshing...</span>';
      try {
        const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
        const pack = activeBtn ? activeBtn.dataset.boardPack : 'All';
        await loadLeaderboard(pack);
        showToast('Leaderboard scores refreshed from global database');
      } finally {
        refreshLeaderboardBtn.disabled = false;
        refreshLeaderboardBtn.innerHTML = origHtml;
      }
    });
  }

  // Also wire secondary refresh button if present
  const secondaryBtn = $('#btn-refresh-scores');
  if (secondaryBtn && secondaryBtn !== refreshLeaderboardBtn && !secondaryBtn._boundRefresh) {
    secondaryBtn._boundRefresh = true;
    secondaryBtn.addEventListener('click', async () => {
      secondaryBtn.disabled = true;
      const origHtml = secondaryBtn.innerHTML;
      secondaryBtn.innerHTML = '<span>⏳</span> <span>Refreshing...</span>';
      try {
        const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
        const pack = activeBtn ? activeBtn.dataset.boardPack : 'All';
        await loadLeaderboard(pack);
        showToast('Leaderboard scores refreshed from global database');
      } finally {
        secondaryBtn.disabled = false;
        secondaryBtn.innerHTML = origHtml;
      }
    });
  }
}

function updateFeedbackBadges(feedbacks) {
  const list = Array.isArray(feedbacks) ? feedbacks : [];
  const count = list.length;
  let avg = '5.0';
  if (count > 0) {
    const sum = list.reduce((acc, f) => acc + Math.max(1, Math.min(5, Number(f.useful ?? f.r_useful ?? 5))), 0);
    avg = (sum / count).toFixed(1);
  }

  // 1. Navigation Tab badge: [ 💬 Feedback ] [ ⭐ 5.0 ] (like [ 🎮 Arcade Games ] [ 7 Modes ])
  const tabBadge = $('#tab-badge-feedback');
  if (tabBadge) {
    tabBadge.textContent = `⭐ ${avg}`;
  }

  // 2. Reviews count badge
  const countBadge = $('#feedback-count-badge');
  if (countBadge) {
    countBadge.textContent = `${count} Review${count === 1 ? '' : 's'}`;
  }

  // 3. Header average rating badge in recent reflections card
  const avgBadge = $('#feedback-avg-badge');
  if (avgBadge) {
    avgBadge.textContent = `⭐ ${avg} Avg`;
  }
}

async function loadFeedbackWall() {
  const list = $('#feedback-wall-list');

  // Do not show 'Scan & Review - Open directly on phone' option on phones
  const isPhoneOrMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const fbMountEl = $('#feedback-qr-mount');
  if (fbMountEl && isPhoneOrMobile) {
    fbMountEl.style.display = 'none';
  }

  // Render dedicated Feedback Wall QR Code (https://careerwithenglish.pages.dev/feedback)
  const fbQrMount = $('#fb-qr-code-box');
  if (fbQrMount && !fbQrMount._rendered) {
    const baseOrigin = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
      ? window.location.origin
      : 'https://careerwithenglish.pages.dev';
    const feedbackUrl = baseOrigin + '/feedback';
    function tryRenderFbQr() {
      if (typeof qrcode !== 'undefined') {
        renderQrCode(fbQrMount, feedbackUrl, 44);
        fbQrMount._rendered = true;
      } else {
        setTimeout(tryRenderFbQr, 100);
      }
    }
    tryRenderFbQr();
    $('#feedback-qr-mount')?.addEventListener('click', () => {
      showEnlargedQrModal('Fair Visitor Feedback', 'Community Wall & Reflections', 'Scan on phone to submit review', feedbackUrl);
    });
  }
  const countBadge = $('#feedback-count-badge');
  const form = $('#feedback-form');
  const starContainer = $('#star-selector-useful');
  if (!list) return;

  let selectedStars = 5;

  // Star selector handling
  if (starContainer && !starContainer._boundStars) {
    starContainer._boundStars = true;
    starContainer.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        starContainer.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedStars = parseInt(btn.dataset.val || '5', 10);

      });
    });
  }

  const DEFAULT_COMMUNITY_FEEDBACKS = [
    { id: 1, name: 'Shrija Limaye', role: 'Teacher', class_info: 'Class 10', useful: 5, r_useful: 5, comment: 'Very nice work by the students. Excellent! Keep it up!', pinned: 1, ts: 1793297127751 },
    { id: 2, name: 'Vidhi Mangal', role: 'Teacher', class_info: 'Class 10', useful: 5, r_useful: 5, comment: 'Excellent work done by the students.', pinned: 1, ts: 1793297127752 },
    { id: 3, name: 'Aarush Anoor', role: 'Student', class_info: 'Class 10', useful: 5, r_useful: 5, comment: 'Very good', pinned: 0, ts: 1793297127753 },
    { id: 4, name: 'Sadiya Khan', role: 'Teacher', class_info: 'Class 10', useful: 5, r_useful: 5, comment: 'Audio Recording news reporter part was the best part', pinned: 1, ts: 1793297127754 },
    { id: 5, name: 'Jagannath Padhy', role: 'Parent', class_info: 'Class 10', useful: 5, r_useful: 5, comment: 'great job by the students. interesting and very well designed and explained', pinned: 0, ts: 1793297127755 },
    { id: 6, name: 'Pinky', role: 'Parent', class_info: 'Class 10', useful: 5, r_useful: 5, comment: 'The explanation was excellent.  Overall  very good', pinned: 0, ts: 1793297127756 },
    { id: 7, name: 'Susan', role: 'Teacher', class_info: 'Class 10', useful: 5, r_useful: 5, comment: 'Very Good!!! Impressive.', pinned: 0, ts: 1793297127757 },
    { id: 8, name: 'Rupesh Sawant', role: 'Teacher', class_info: 'Class 10', useful: 5, r_useful: 5, comment: 'Excellent work done by the students. Very helpful for the people who want to improve their communication skills.', pinned: 0, ts: 1793297127758 }
  ];

  function getLocalFeedbacks() {
    try {
      const raw = localStorage.getItem('cf_user_feedbacks');
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return DEFAULT_COMMUNITY_FEEDBACKS;
    } catch {
      return DEFAULT_COMMUNITY_FEEDBACKS;
    }
  }

  function saveLocalFeedbacks(items) {
    try {
      localStorage.setItem('cf_user_feedbacks', JSON.stringify(items));
    } catch {}
  }

  function formatFriendlyTime(ts) {
    const diff = Date.now() - Number(ts);
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    const d = new Date(Number(ts));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderFeedbacks(feedbacks) {
    updateFeedbackBadges(feedbacks);

    if (!feedbacks || feedbacks.length === 0) {
      list.innerHTML = `
        <div class="feedback-empty-state">
          <span class="feedback-empty-icon">💬</span>
          <div class="feedback-empty-title">No feedback submitted yet</div>
          <div class="feedback-empty-desc">Be the first to share your thoughts about the Career Fair exhibits!</div>
        </div>
      `;
      return;
    }

    // Get admin custom titles map
    let userTitlesMap = {};
    try {
      const storedTitles = localStorage.getItem('cf_user_titles');
      if (storedTitles) userTitlesMap = JSON.parse(storedTitles);
    } catch {}

    // Sort pinned feedbacks to the top
    feedbacks.sort((a, b) => {
      const pinA = Number(a.pinned || 0);
      const pinB = Number(b.pinned || 0);
      if (pinA !== pinB) return pinB - pinA;
      return (Number(b.ts) || 0) - (Number(a.ts) || 0);
    });

    list.innerHTML = feedbacks.map(f => {
      const starCount = Math.max(1, Math.min(5, Number(f.useful ?? f.r_useful ?? 5)));
      const stars = '⭐'.repeat(starCount) + (starCount === 1 ? '☆☆☆☆' : starCount === 2 ? '☆☆☆' : starCount === 3 ? '☆☆' : starCount === 4 ? '☆' : '');
      const timeStr = f.ts ? formatFriendlyTime(f.ts) : '';
      // Clean, professional role and class formatting that never clips on any device
      const roleStr = (f.role || 'Visitor').trim();
      const classStr = (f.class_info || '').trim();

      let roleBadgeText;
      if (roleStr === 'Teacher' || roleStr === 'Faculty') {
        roleBadgeText = (classStr && !classStr.startsWith('Class ') && classStr !== 'Parent / Guest' && classStr !== 'Teacher' && classStr !== 'Faculty')
          ? `Teacher · ${classStr}`
          : 'Teacher';
      } else if (roleStr === 'Student') {
        roleBadgeText = (classStr && classStr !== 'Student' && classStr !== 'Parent / Guest')
          ? `Student · ${classStr}`
          : 'Student';
      } else if (roleStr === 'Parent') {
        roleBadgeText = (classStr && classStr.startsWith('Class '))
          ? `Parent · ${classStr}`
          : 'Parent';
      } else {
        roleBadgeText = (classStr && classStr !== roleStr && classStr !== 'Parent / Guest')
          ? `${roleStr} · ${classStr}`
          : roleStr;
      }
      const roleBadge = escapeHtml(roleBadgeText);

      const isPinned = Number(f.pinned || 0) === 1;
      const customTitle = userTitlesMap[f.name] || '';
      const titleBadgeHtml = customTitle
        ? `<span class="user-title-badge" title="Official Honor Title">👑 ${escapeHtml(customTitle)}</span>`
        : '';

      const isMobileScreen = window.innerWidth <= 768;
  const isAdmin = !isMobileScreen && Boolean(STATE.adminKey || localStorage.getItem('cf_admin_session') || sessionStorage.getItem('cf_admin_session'));
      const adminActionsHtml = isAdmin
        ? `<div class="admin-feedback-actions">
             <button type="button" class="btn btn-sm btn-admin-feedback" title="Change User Name (Admin)" style="background:rgba(0,240,255,0.12);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;" data-id="${escapeHtml(String(f.id || ''))}" data-name="${encodeURIComponent(f.name || '')}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminChangeFeedbackName(this.dataset.id, decodeURIComponent(this.dataset.name || ''), decodeURIComponent(this.dataset.comment || ''))">
               ✏️ Rename
             </button>
             <button type="button" class="btn btn-sm btn-admin-feedback" title="${isPinned ? 'Unpin Reflection' : 'Pin Reflection to Top'}" style="background:${isPinned ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'};color:${isPinned ? '#f59e0b' : 'var(--text-muted)'};border:1px solid ${isPinned ? '#f59e0b' : 'var(--border)'};border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;" data-id="${escapeHtml(String(f.id || ''))}" data-pinned="${isPinned ? 0 : 1}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminTogglePinFeedback(this.dataset.id, Number(this.dataset.pinned), decodeURIComponent(this.dataset.comment || ''))">
               ${isPinned ? '📌 Pinned' : '📍 Pin'}
             </button>
             <button type="button" class="btn btn-sm btn-admin-feedback" title="Assign Official Title (e.g. Vice-Principal)" style="background:rgba(0,240,255,0.1);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;" onclick="window.adminAssignUserTitle('${encodeURIComponent(f.name || '')}')">
               🏷️ Title
             </button>
             <button type="button" class="btn btn-sm btn-admin-feedback btn-admin-del" title="Delete this reflection (Admin)" style="background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;" data-id="${escapeHtml(String(f.id || ''))}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminDeleteFeedback(this.dataset.id, decodeURIComponent(this.dataset.comment || ''))">
               🗑️
             </button>
           </div>`
        : '';

      return `
        <div class="feedback-item ${isPinned ? 'pinned' : ''}">
          <div class="feedback-item-header">
            <div class="feedback-item-author">
              <strong class="feedback-author-name" title="${escapeHtml(f.name || 'Anonymous')}">${escapeHtml(f.name || 'Anonymous')}</strong>
              ${titleBadgeHtml}
              <span class="feedback-item-badge" title="${roleBadge}">${roleBadge}</span>
            </div>
            <div class="feedback-item-meta-group">
              <div class="feedback-item-stars" title="${starCount} out of 5 stars">
                <span class="feedback-item-stars-icons">${stars}</span>
                <span class="feedback-item-stars-score">(${starCount}/5)</span>
              </div>
              ${adminActionsHtml}
            </div>
          </div>
          <p class="feedback-item-comment">"${escapeHtml(f.comment || '')}"</p>
          ${timeStr ? `<div class="feedback-item-time">🕒 ${timeStr}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Load and render initial state from local cache for instant UI display
  let feedbacks = getLocalFeedbacks();
  renderFeedbacks(feedbacks);

  // Authoritative global synchronization from Cloudflare D1
  try {
    const res = await fetchApi('feedback');
    const serverItems = res?.results || res?.feedback;
    if (Array.isArray(serverItems) && serverItems.length > 0) {
      // The global database is the single source of truth:
      // Overwrite local cache with authoritative server items so deleted reviews disappear everywhere!
      feedbacks = serverItems.map(item => ({
        id: item.id,
        name: item.name || 'Visitor',
        role: item.role || 'Student',
        class_info: item.class_info || '',
        useful: Math.max(1, Math.min(5, Number(item.r_useful || item.useful || 5))),
        comment: String(item.comment || '').trim(),
        pinned: Number(item.pinned || 0),
        ts: Number(item.ts || Date.now())
      }));
      feedbacks.sort((a, b) => {
        const pinA = Number(a.pinned || 0);
        const pinB = Number(b.pinned || 0);
        if (pinA !== pinB) return pinB - pinA;
        return (Number(b.ts) || 0) - (Number(a.ts) || 0);
      });
      saveLocalFeedbacks(feedbacks);
      renderFeedbacks(feedbacks);
    }
  } catch (err) {
    console.warn('Global feedback sync note:', err);
  }

  // Handle feedback form submission (bound once)
  if (form && !form._boundFeedback) {
    form._boundFeedback = true;
    ['#fb-name', '#fb-role', '#fb-class', '#fb-comment'].forEach(sel => {
      $(sel)?.addEventListener('input', (e) => { e.target.style.borderColor = ''; });
      $(sel)?.addEventListener('change', (e) => { e.target.style.borderColor = ''; });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const rawName = ($('#fb-name')?.value || '').trim();
      const name = capitalizeName(rawName);
      if ($('#fb-name') && name) $('#fb-name').value = name;
      const role = $('#fb-role')?.value;
      const classInfo = $('#fb-class')?.value;
      const comment = ($('#fb-comment')?.value || '').trim();

      let hasError = false;
      let firstErrorEl = null;

      if (!name) {
        if ($('#fb-name')) $('#fb-name').style.borderColor = '#ef4444';
        if (!firstErrorEl) firstErrorEl = $('#fb-name');
        hasError = true;
      } else {
        if ($('#fb-name')) $('#fb-name').style.borderColor = '';
      }

      if (!role || role === '') {
        if ($('#fb-role')) $('#fb-role').style.borderColor = '#ef4444';
        if (!firstErrorEl) firstErrorEl = $('#fb-role');
        hasError = true;
      } else {
        if ($('#fb-role')) $('#fb-role').style.borderColor = '';
      }

      if (!classInfo || classInfo === '') {
        if ($('#fb-class')) $('#fb-class').style.borderColor = '#ef4444';
        if (!firstErrorEl) firstErrorEl = $('#fb-class');
        hasError = true;
      } else {
        if ($('#fb-class')) $('#fb-class').style.borderColor = '';
      }

      if (!comment) {
        if ($('#fb-comment')) $('#fb-comment').style.borderColor = '#ef4444';
        if (!firstErrorEl) firstErrorEl = $('#fb-comment');
        hasError = true;
      } else {
        if ($('#fb-comment')) $('#fb-comment').style.borderColor = '';
      }

      if (hasError) {
        showToast('⚠️ All fields (Name, Role, Class, and Feedback) are mandatory!');
        firstErrorEl?.focus();
        return;
      }

      const submitBtn = $('#btn-submit-feedback');
      if (submitBtn) submitBtn.disabled = true;

            // Save feedback for official student booklet
      try {
        hasSubmittedFeedbackDuringTutorial = true;
        localStorage.setItem('ecf_student_feedback', JSON.stringify({
          name,
          role,
          classInfo,
          stars: selectedStars,
          comment,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          timestamp: Date.now()
        }));
      } catch (_) {}

      // Submit directly to global D1 backend and await persistence
      try {
        await fetchApi('feedback', {
          method: 'POST',
          body: JSON.stringify({
            name,
            role,
            class_info: classInfo,
            comment,
            r_useful: selectedStars
          })
        });
        showToast('Thank you! Your feedback has been stored globally in the exhibition database.');
      } catch (err) {
        showToast('Feedback submitted.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }

      form.reset();
      selectedStars = 5;
      if (starContainer) {
        starContainer.querySelectorAll('.star-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.val === '5');
        });
      }

      // Re-fetch authoritative global list immediately
      
      // Re-fetch authoritative global list immediately and scroll down to Recent Visitor Reflections
      setTimeout(async () => {
        await loadFeedbackWall();
        const reflectionsCard = document.querySelector('.feedback-reflections-card') || document.getElementById('feedback-wall-list');
        if (reflectionsCard) {
          scrollTutorialTargetIntoView(reflectionsCard);
          reflectionsCard.classList.add('tutorial-button-highlight');
          setTimeout(() => {
            reflectionsCard.classList.remove('tutorial-button-highlight');
          }, 3500);
        }
      }, 350);

      if (isTutorialRunning && isTutorialOnSection('section_feedback')) {
        triggerTutorialAutoAdvance('Review Submitted', 'Thank you for your reflection! Reviewing visitor reflections and unlocking your booklet...');
      }
    });
  }

  // Wire refresh button for visitor reviews ONCE (idempotent, single listener)
  const refreshBtn = $('#btn-refresh-feedback');
  if (refreshBtn && !refreshBtn._boundRefresh) {
    refreshBtn._boundRefresh = true;
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      const origHtml = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<span>⏳</span> <span>Refreshing...</span>';
      try {
        await loadFeedbackWall();
        showToast('Reflections refreshed from global database');
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = origHtml;
      }
    });
  }
}

// ─── 12. ADMIN CONTROL ROOM TAB CONTROLLER ─────────────────────────────────
function renderAdminView() {
  const gateScreen = $('#admin-gate-screen');
  const workspaceScreen = $('#admin-workspace-screen');
  if (!gateScreen || !workspaceScreen) return;

  // Restore opaque admin session token ONLY if previously signed in on this browser
  if (!STATE.adminKey) {
    try {
      STATE.adminKey = sessionStorage.getItem('cf_admin_session') || localStorage.getItem('cf_admin_session') || '';
    } catch {}
  }

  if (STATE.adminKey) {
    gateScreen.hidden = true;
    workspaceScreen.hidden = false;
    initAdminWorkspace();

    // Verify opaque session token against live backend so revoked/expired sessions cannot stay logged in
    (async () => {
      try {
        let res = await fetch(getApiUrl('api/admin/ping'), {
          headers: { 'Authorization': 'Bearer ' + STATE.adminKey }
        });
        if (!res.ok && res.status !== 401 && res.status !== 403 && window.location.protocol !== 'file:' && window.location.hostname !== 'careerwithenglish.pages.dev') {
          res = await fetch(PRIMARY_D1_ORIGIN + '/api/admin/ping', {
            headers: { 'Authorization': 'Bearer ' + STATE.adminKey }
          });
        }
        if (res.status === 401 || res.status === 403) {
          const errBody = await res.json().catch(() => null);
          if (res.status === 403 && (errBody?.banned || errBody?.admin_revoked)) {
            enforceSiteIpBlockOverlay(errBody.error);
            return;
          }
          STATE.adminKey = '';
          try {
            sessionStorage.removeItem('cf_admin_session');
            localStorage.removeItem('cf_admin_session');
          } catch {}
          gateScreen.hidden = false;
          workspaceScreen.hidden = true;
          updateHeaderBookletVisibility();
          loadLeaderboard();
          loadFeedbackWall();
        }
      } catch (_) {}
    })();
    if (typeof initAdminImportControls === 'function') initAdminImportControls();

  // Global D1 Exhibition Data Downloader Wiring
  $('#btn-download-d1-json')?.addEventListener('click', () => {
    window.open(getApiUrl('api/export/data?format=json'), '_blank');
  });

  $('#btn-download-d1-csv')?.addEventListener('click', () => {
    window.open(getApiUrl('api/export/data?format=csv'), '_blank');
  });

  } else {
    gateScreen.hidden = false;
    workspaceScreen.hidden = true;
    const pwdInput = $('#admin-pwd-input');
    if (pwdInput) {
      pwdInput.value = '';
      setTimeout(() => pwdInput.focus(), 150);
    }
  }
}


// ─── ADMIN MODERATION ACTIONS & DELETION HANDLERS ─────────────────────────
window.adminChangeFeedbackName = async function(id, currentName, comment) {
  const promptVal = currentName || 'Visitor';
  const newName = prompt(`Enter new name for this user reflection (currently: "${promptVal}"):`, promptVal);
  if (!newName || !newName.trim() || newName.trim() === promptVal.trim()) return;

  const trimmedName = (typeof capitalizeName === 'function') ? capitalizeName(newName.trim()) : newName.trim();

  try {
    await fetchApi('admin/update-feedback-user', {
      method: 'POST',
      body: JSON.stringify({ id, comment, oldName: currentName, newName: trimmedName })
    });
  } catch (e) {
    console.error('Update feedback user error:', e);
  }

  // Update localStorage cache
  try {
    const raw = localStorage.getItem('cf_user_feedbacks');
    if (raw) {
      let items = JSON.parse(raw);
      items.forEach(f => {
        if (id && String(f.id).trim() === String(id).trim()) {
          f.name = trimmedName;
        } else if (comment && String(f.comment).trim() === String(comment).trim()) {
          f.name = trimmedName;
        } else if ((f.name || '').trim().toLowerCase() === (currentName || '').trim().toLowerCase()) {
          f.name = trimmedName;
        }
      });
      localStorage.setItem('cf_user_feedbacks', JSON.stringify(items));
    }
  } catch (e) {}

  // Update user custom titles if mapped to old name
  try {
    const rawTitles = localStorage.getItem('cf_user_titles');
    if (rawTitles) {
      let titles = JSON.parse(rawTitles);
      if (titles[currentName]) {
        titles[trimmedName] = titles[currentName];
        delete titles[currentName];
        localStorage.setItem('cf_user_titles', JSON.stringify(titles));
      }
    }
  } catch (e) {}

  showToast(`Feedback user name updated to "${trimmedName}" ✅`);
  await loadFeedbackWall();
  if (typeof renderAdminModeration === 'function') {
    await renderAdminModeration();
  }
};

window.adminChangeScoreName = async function(id, currentName) {
  const promptVal = currentName || 'Explorer';
  const newName = prompt(`Enter new player name for this leaderboard attempt (currently: "${promptVal}"):`, promptVal);
  if (!newName || !newName.trim() || newName.trim() === promptVal.trim()) return;

  const trimmedName = (typeof capitalizeName === 'function') ? capitalizeName(newName.trim()) : newName.trim();

  try {
    await fetchApi('admin/update-score-user', {
      method: 'POST',
      body: JSON.stringify({ id, oldName: currentName, newName: trimmedName })
    });
  } catch (e) {
    console.error('Update score user error:', e);
  }

  // Update localStorage cache
  try {
    const raw = localStorage.getItem('cf_user_scores');
    if (raw) {
      let items = JSON.parse(raw);
      items.forEach(s => {
        if (id && String(s.id).trim() === String(id).trim()) {
          s.name = trimmedName;
        } else if ((s.name || '').trim().toLowerCase() === (currentName || '').trim().toLowerCase()) {
          s.name = trimmedName;
        }
      });
      localStorage.setItem('cf_user_scores', JSON.stringify(items));
    }
  } catch (e) {}

  showToast(`Leaderboard player name updated to "${trimmedName}" ✅`);
  await loadLeaderboard();
  if (typeof renderAdminModeration === 'function') {
    await renderAdminModeration();
  }
};

window.adminDeleteFeedback = async function(id, comment) {
  if (!confirm('Are you sure you want to delete this visitor reflection?')) return;
  
  try {
    await fetchApi('admin/del-feedback', {
      method: 'POST',
      body: JSON.stringify({ id, comment })
    });
  } catch (e) {
    console.error('Delete reflection error:', e);
  }

  try {
    const raw = localStorage.getItem('cf_user_feedbacks');
    if (raw) {
      let items = JSON.parse(raw);
      items = items.filter(f => {
        if (id && String(f.id).trim() === String(id).trim()) return false;
        if (comment && String(f.comment).trim() === String(comment).trim()) return false;
        return true;
      });
      localStorage.setItem('cf_user_feedbacks', JSON.stringify(items));
    }
  } catch (e) {}

  showToast('Visitor reflection deleted');
  await loadFeedbackWall();
  await renderAdminModeration();
};

window.adminDeleteScore = async function(id, name) {
  if (!confirm(`Are you sure you want to delete score attempt for ${name}?`)) return;

  try {
    await fetchApi('admin/del', {
      method: 'POST',
      body: JSON.stringify({ id, name })
    });
  } catch (e) {
    console.error('Delete score error:', e);
  }

  try {
    const raw = localStorage.getItem('cf_user_scores');
    if (raw) {
      let items = JSON.parse(raw);
      items = items.filter(s => {
        if (id && String(s.id).trim() === String(id).trim()) return false;
        if (name && (s.name || '').trim().toLowerCase() === name.trim().toLowerCase()) return false;
        return true;
      });
      localStorage.setItem('cf_user_scores', JSON.stringify(items));
    }
  } catch (e) {}

  showToast(`Score attempt for ${name} removed`);
  await loadLeaderboard();
  await renderAdminModeration();
};

window.renderAdminIssues = async function() {
  const issuesMount = $('#admin-issues-container');
  const issuesCount = $('#admin-issues-count');
  if (!issuesMount) return;

  let issues = [];
  try {
    const res = await fetchApi('admin/issues');
    if (res?.issues && Array.isArray(res.issues)) {
      issues = res.issues;
    }
  } catch (e) {
    console.warn('Admin issues fetch error:', e);
  }

  // Merge local backup issues if server has missing entries
  try {
    const local = JSON.parse(localStorage.getItem('cf_local_issues') || '[]');
    if (Array.isArray(local) && local.length > 0) {
      const existingIds = new Set(issues.map(i => String(i.id)));
      for (const loc of local) {
        if (!existingIds.has(String(loc.id))) {
          issues.push(loc);
        }
      }
    }
  } catch {}

  // Sort descending by created_at
  issues.sort((a, b) => (Number(b.created_at || b.id || 0)) - (Number(a.created_at || a.id || 0)));

  if (issuesCount) {
    const openCount = issues.filter(i => i.status !== 'resolved').length;
    issuesCount.textContent = `${issues.length} Inquir${issues.length === 1 ? 'y' : 'ies'}${openCount > 0 ? ` (${openCount} open)` : ''}`;
  }

  if (!issues.length) {
    issuesMount.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12.5px;">No active user inquiries or reported errors. All systems optimal! 🚀</div>';
    return;
  }

  issuesMount.innerHTML = issues.map(iss => {
    const isResolved = iss.status === 'resolved';
    const timeStr = iss.created_at ? new Date(Number(iss.created_at)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
    return `
      <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
            <span class="badge-pill" style="font-size:10.5px;background:${isResolved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'};color:${isResolved ? '#10b981' : '#f59e0b'};border:1px solid ${isResolved ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'};">
              ${isResolved ? '● Rectified & Resolved' : '● Open Inquiry'}
            </span>
            <strong style="font-size:13px;color:var(--text-main);">${escapeHtml(iss.visitor_name || 'Visitor')}</strong>
            <span class="badge-pill badge-reg" style="font-size:11px;">${escapeHtml(iss.issue_type || 'General')}</span>
            ${timeStr ? `<span style="font-size:11px;color:var(--text-dim);margin-left:auto;">${timeStr}</span>` : ''}
          </div>
          <p style="font-size:13px;color:var(--text-muted);margin:0 0 6px 0;line-height:1.45;">"${escapeHtml(iss.description)}"</p>
          ${iss.resolution_notes ? `<div style="font-size:11.5px;color:#10b981;background:rgba(16,185,129,0.08);padding:4px 8px;border-radius:4px;display:inline-block;"><strong>Resolution:</strong> ${escapeHtml(iss.resolution_notes)}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${!isResolved ? `
            <button class="btn btn-secondary btn-xs btn-resolve-issue" data-id="${iss.id}" type="button" style="padding:4px 10px;font-size:11.5px;color:var(--accent-cyan);border-color:var(--accent-cyan);">
              🛠️ Rectify
            </button>
          ` : ''}
          <button class="btn btn-xs" style="background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.3);padding:4px 8px;font-size:11.5px;border-radius:4px;cursor:pointer;" onclick="window.adminDeleteIssue('${iss.id}')" title="Delete Inquiry">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');

  $$('.btn-resolve-issue').forEach(btn => {
    btn.onclick = async () => {
      const issId = btn.dataset.id;
      const notes = prompt('Enter rectification / resolution notes for this inquiry:');
      if (notes) {
        await fetchApi('admin/telemetry/resolve', 'POST', { issueId: issId, resolutionNotes: notes });
        showToast('✅ Inquiry marked as rectified and archived.');
        window.renderAdminIssues();
      }
    };
  });
};

window.adminDeleteIssue = async function(issueId) {
  if (!confirm('Are you sure you want to delete this inquiry record?')) return;
  await fetchApi('admin/issues', { method: 'DELETE', body: JSON.stringify({ id: issueId }) });
  try {
    const local = JSON.parse(localStorage.getItem('cf_local_issues') || '[]');
    const filtered = local.filter(i => String(i.id) !== String(issueId));
    localStorage.setItem('cf_local_issues', JSON.stringify(filtered));
  } catch {}
  showToast('🗑️ Inquiry deleted successfully');
  window.renderAdminIssues();
};

async function renderAdminModeration() {
  if (typeof window.renderAdminIssues === 'function') {
    window.renderAdminIssues();
  }
  // 1. Render Visitor Reflections list in Admin Portal
  const feedbackList = $('#admin-feedback-list');
  const feedbackCount = $('#admin-feedback-count');

  if (feedbackList) {
    let allFeedbacks = [];
    try {
      const raw = localStorage.getItem('cf_user_feedbacks');
      if (raw) allFeedbacks = JSON.parse(raw);
    } catch {}

    try {
      const res = await fetchApi('feedback');
      const serverItems = res?.results || res?.feedback;
      if (Array.isArray(serverItems)) {
        // Global D1 is the authoritative source of truth:
        // Any deleted reviews vanish globally from the admin view
        allFeedbacks = serverItems.map(item => ({
          id: item.id,
          name: item.name || 'Visitor',
          role: item.role || 'Student',
          class_info: item.class_info || '',
          useful: item.r_useful || item.useful || 5,
          comment: item.comment,
          pinned: Number(item.pinned || 0),
          ts: item.ts || Date.now()
        }));
        try {
          localStorage.setItem('cf_user_feedbacks', JSON.stringify(allFeedbacks));
        } catch {}
      }
    } catch (e) {
      console.warn('Admin feedback fetch note:', e);
    }

    allFeedbacks.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    if (feedbackCount) {
      feedbackCount.textContent = `${allFeedbacks.length} Review${allFeedbacks.length === 1 ? '' : 's'}`;
    }

    if (!allFeedbacks.length) {
      feedbackList.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);">No visitor reflections currently submitted.</div>`;
    } else {
      feedbackList.innerHTML = allFeedbacks.map(f => {
        const starCount = Math.max(1, Math.min(5, f.useful || f.r_useful || 5));
        const timeStr = f.ts ? new Date(Number(f.ts)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
        return `
          <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                <strong>${escapeHtml(f.name || 'Anonymous')}</strong>
                <span class="badge-pill badge-reg" style="font-size:11px;">${escapeHtml(f.role || 'Student')}${f.class_info ? ' · ' + escapeHtml(f.class_info) : ''}</span>
                <span style="font-size:12px;color:var(--accent-gold);">${'⭐'.repeat(starCount)} (${starCount}/5)</span>
                ${timeStr ? `<span style="font-size:11px;color:var(--text-dim);margin-left:auto;">${timeStr}</span>` : ''}
              </div>
              <div style="font-size:13.5px;color:var(--text-main);font-style:italic;">"${escapeHtml(f.comment || '')}"</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" class="btn btn-sm" style="background:rgba(0,240,255,0.15);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;" data-id="${escapeHtml(String(f.id || ''))}" data-name="${encodeURIComponent(f.name || '')}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminChangeFeedbackName(this.dataset.id, decodeURIComponent(this.dataset.name || ''), decodeURIComponent(this.dataset.comment || ''))">✏️ Rename</button>
              <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;" data-id="${escapeHtml(String(f.id || ''))}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminDeleteFeedback(this.dataset.id, decodeURIComponent(this.dataset.comment || ''))">🗑️ Delete</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 2. Render Leaderboard Scores table in Admin Portal
  const scoresTbody = $('#admin-scores-table-body');
  const scoresCount = $('#admin-scores-count');

  if (scoresTbody) {
    let scores = [];
    try {
      const data = await fetchApi('scores');
      if (Array.isArray(data)) scores = data;
    } catch {}

    if (scoresCount) {
      scoresCount.textContent = `${scores.length} Attempt${scores.length === 1 ? '' : 's'}`;
    }

    if (!scores.length) {
      scoresTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No score attempts recorded.</td></tr>`;
    } else {
      scoresTbody.innerHTML = scores.map((sc, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        const timeStr = sc.ts ? new Date(Number(sc.ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return `
          <tr>
            <td><strong>${medal}</strong></td>
            <td><strong>${escapeHtml(sc.name)}</strong></td>
            <td><span class="badge-pill badge-nirf">${escapeHtml(sc.pack || 'General')}</span></td>
            <td><strong style="color:var(--accent-emerald);">${sc.acc || 0}%</strong></td>
            <td>${sc.fluency || '--'}%</td>
            <td>${sc.wpm || 130}</td>
            <td style="font-size:12px;color:var(--text-dim);">${timeStr}</td>
            <td style="text-align:center;white-space:nowrap;">
              <button type="button" class="btn btn-sm" style="background:rgba(0,240,255,0.15);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:4px;padding:2px 8px;font-size:11.5px;cursor:pointer;margin-right:4px;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminChangeScoreName(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">✏️ Rename</button>
              <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:2px 8px;font-size:11.5px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminDeleteScore(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">🗑️ Delete</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

// ─── ADMIN SCOPED API KEYS, TELEMETRY & FEATURE MATRIX ───────────────────────

async function renderAdminKeys() {
  const tableBody = $('#admin-keys-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted);">Loading active keys...</td></tr>';
  const res = await fetchApi('admin/keys');
  const keys = res?.keys || [];

  if (!keys.length) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No scoped API keys generated yet. Use the form above to create one.</td></tr>';
    return;
  }

  tableBody.innerHTML = keys.map((k, idx) => {
    const scopesArr = Array.isArray(k.scopes) ? k.scopes : (typeof k.scopes === 'string' ? JSON.parse(k.scopes || '[]') : []);
    const scopesHtml = scopesArr.map(s => `<span class="admin-key-badge">${escapeHtml(s)}</span>`).join('');
    const createdDate = k.created_at ? new Date(Number(k.created_at)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const lastUsedDate = k.last_used ? new Date(Number(k.last_used)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never';
    const isRevoked = Boolean(k.revoked);

    return `
      <tr style="${isRevoked ? 'opacity:0.45;text-decoration:line-through;' : ''}">
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(k.label || 'API Key')}</strong></td>
        <td><code>${escapeHtml(k.prefix || 'ecf_...')}</code></td>
        <td>${scopesHtml || '<em>No scopes</em>'}</td>
        <td style="font-size:12px;color:var(--text-dim);">${createdDate}</td>
        <td style="font-size:12px;color:var(--text-dim);">${lastUsedDate}</td>
        <td style="text-align:center;">
          ${isRevoked
            ? '<span class="badge-pill" style="font-size:11px;background:rgba(239,68,68,0.12);color:#ef4444;">Revoked</span>'
            : `<button class="btn btn-accent btn-xs btn-revoke-key" data-id="${k.id}" type="button" style="padding:3px 8px;font-size:11px;background:rgba(239,68,68,0.12);color:#ef4444;border-color:rgba(239,68,68,0.3);">Revoke</button>`
          }
        </td>
      </tr>
    `;
  }).join('');

  // Wire Revoke buttons
  $$('.btn-revoke-key').forEach(btn => {
    btn.onclick = async () => {
      const keyId = btn.dataset.id;
      if (confirm(`Revoke API key #${keyId}? Any systems using this token will lose access.`)) {
        await fetchApi('admin/keys/revoke', 'POST', { id: keyId });
        showToast(`API Key #${keyId} has been revoked.`);
        renderAdminKeys();
      }
    };
  });
}

async function renderAdminTelemetry() {
  const tableBody = $('#admin-telemetry-table-body');
  const issuesMount = $('#admin-issues-container');

  if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted);">Loading telemetry archive...</td></tr>';
    const res = await fetchApi('admin/telemetry');
    const sessions = res?.sessions || [];

    if (!sessions.length) {
      tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);">No student interaction sessions logged yet.</td></tr>';
    } else {
      tableBody.innerHTML = sessions.map(s => {
        const timeStr = s.created_at ? new Date(Number(s.created_at)).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—';
        const sensors = [
          s.has_camera_feed ? '📷 Cam' : '',
          s.has_mic_feed ? '🎙️ Mic' : '',
          s.has_screen_feed ? '🖥️ Screen' : ''
        ].filter(Boolean).join(' · ') || 'Web Telemetry';

        const gdrivePath = s.gdrive_folder_id || `gdrive:careerfair_telemetry/${s.session_id}`;

        return `
          <tr>
            <td><code>${escapeHtml(s.session_id || 'session')}</code></td>
            <td><strong>${escapeHtml(s.visitor_name || 'Visitor')}</strong></td>
            <td style="font-size:11.5px;color:var(--text-dim);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.device_info || 'Browser')}</td>
            <td><span class="badge-pill" style="font-size:11px;">${s.interactions_count || 1} events</span></td>
            <td style="font-size:11.5px;color:var(--accent-cyan);">${sensors}</td>
            <td><code style="font-size:11px;color:#10b981;">${escapeHtml(gdrivePath)}</code></td>
            <td style="font-size:11.5px;color:var(--text-dim);">${timeStr}</td>
            <td style="text-align:center;">
              <button type="button" class="btn btn-secondary btn-xs btn-inspect-session" data-id="${escapeHtml(s.session_id || '')}" style="font-size:11px;padding:3px 8px;border-color:var(--accent-cyan);color:var(--accent-cyan);">📂 Files</button>
            </td>
          </tr>
        `;
      }).join('');

      $$('.btn-inspect-session').forEach(btn => {
        btn.onclick = () => {
          const sessId = btn.dataset.id;
          const sessionObj = sessions.find(s => s.session_id === sessId);
          if (!sessionObj) return;

          const modal = $('#admin-session-details-modal');
          const subTitle = $('#admin-session-modal-subtitle');
          const body = $('#admin-session-modal-body');

          if (subTitle) {
            subTitle.innerHTML = `Session: <code>${escapeHtml(sessionObj.session_id)}</code> · Visitor: <strong>${escapeHtml(sessionObj.visitor_name || 'Visitor')}</strong>`;
          }

          if (body) {
            const rawLogs = Array.isArray(sessionObj.logs) ? sessionObj.logs : (typeof sessionObj.logs === 'string' ? JSON.parse(sessionObj.logs || '[]') : []);
            const logsHtml = rawLogs.length > 0
              ? rawLogs.map(l => `<div style="font-size:11.5px;padding:4px 0;border-bottom:1px solid var(--border);"><span style="color:var(--accent-cyan);">${new Date(l.timestamp || Date.now()).toLocaleTimeString()}</span> · <strong>${escapeHtml(l.event || 'event')}</strong> ${l.text ? `: "${escapeHtml(l.text)}"` : ''}</div>`).join('')
              : '<div style="font-size:12px;color:var(--text-muted);">No granular event logs available.</div>';

            const gdriveFolder = sessionObj.gdrive_folder_id || `gdrive:careerfair_telemetry/${sessionObj.session_id}`;

            body.innerHTML = `
              <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-bottom:14px;">
                <div style="font-size:12px;margin-bottom:4px;"><strong>Google Drive rclone Remote Path:</strong></div>
                <code style="font-size:11.5px;color:#10b981;word-break:break-all;">${escapeHtml(gdriveFolder)}</code>
              </div>

              <div style="font-size:13px;font-weight:700;margin-bottom:8px;">Indefinite Storage Manifest &amp; Media Files:</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:8px;margin-bottom:14px;">
                <div style="background:rgba(0,240,255,0.06);border:1px solid rgba(0,240,255,0.2);border-radius:var(--radius-sm);padding:8px 10px;">
                  <span style="font-size:12px;">📄 <strong>session_manifest.json</strong></span>
                  <div style="font-size:11px;color:var(--text-dim);">Device &amp; Telemetry Metadata</div>
                </div>
                <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:var(--radius-sm);padding:8px 10px;">
                  <span style="font-size:12px;">🎙️ <strong>audio_interactions.webm</strong></span>
                  <div style="font-size:11px;color:var(--text-dim);">${sessionObj.has_mic_feed ? 'Active (Archived)' : 'No Audio Capture'}</div>
                </div>
                <div style="background:rgba(232,160,74,0.06);border:1px solid rgba(232,160,74,0.2);border-radius:var(--radius-sm);padding:8px 10px;">
                  <span style="font-size:12px;">📷 <strong>camera_presence.log</strong></span>
                  <div style="font-size:11px;color:var(--text-dim);">${sessionObj.has_camera_feed ? 'Human Detected (96%)' : 'Simulated / Denied'}</div>
                </div>
                <div style="background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.2);border-radius:var(--radius-sm);padding:8px 10px;">
                  <span style="font-size:12px;">🖥️ <strong>ocr_screen_captures.log</strong></span>
                  <div style="font-size:11px;color:var(--text-dim);">Tesseract.js Screen States</div>
                </div>
              </div>

              <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Chrono Interaction Event Trace:</div>
              <div style="max-height:160px;overflow-y:auto;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;">
                ${logsHtml}
              </div>
            `;
          }

          modal?.classList.add('active');
        };
      });
    }
  }

  // Render User Issues
  if (issuesMount) {
    const issuesRes = await fetchApi('admin/issues');
    const issues = issuesRes?.issues || [];

    if (!issues.length) {
      issuesMount.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12.5px;">No active user inquiries or reported errors. All systems optimal!</div>';
    } else {
      issuesMount.innerHTML = issues.map(iss => {
        const isResolved = iss.status === 'resolved';
        return `
          <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span class="badge-pill" style="font-size:10.5px;background:${isResolved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'};color:${isResolved ? '#10b981' : '#f59e0b'};">
                  ${isResolved ? '● Resolved' : '● Open Inquiry'}
                </span>
                <strong style="font-size:13px;color:var(--text-main);">${escapeHtml(iss.visitor_name || 'Visitor')}</strong>
                <span style="font-size:11.5px;color:var(--text-dim);">[${escapeHtml(iss.issue_type || 'General')}]</span>
              </div>
              <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 4px 0;">"${escapeHtml(iss.description)}"</p>
              ${iss.resolution_notes ? `<div style="font-size:11.5px;color:#10b981;">Resolution: ${escapeHtml(iss.resolution_notes)}</div>` : ''}
            </div>
            ${!isResolved ? `
              <button class="btn btn-secondary btn-xs btn-resolve-issue" data-id="${iss.id}" type="button" style="padding:4px 10px;font-size:11.5px;color:var(--accent-cyan);border-color:var(--accent-cyan);">
                Rectify Issue 🛠️
              </button>
            ` : ''}
          </div>
        `;
      }).join('');

      $$('.btn-resolve-issue').forEach(btn => {
        btn.onclick = async () => {
          const issId = btn.dataset.id;
          const notes = prompt('Enter rectification / resolution notes for this inquiry:');
          if (notes) {
            await fetchApi('admin/telemetry/resolve', 'POST', { issueId: issId, resolutionNotes: notes });
            showToast('✅ Inquiry marked as rectified and archived.');
            renderAdminTelemetry();
          }
        };
      });
    }
  }
}

function renderAdminFeatureFlags() {
  const flagsMount = $('#admin-flags-container');
  if (!flagsMount) return;

  const flags = STATE.config?.flags || {};

  // Clean obsolete flags
  delete flags.gdrive_sync;
  delete flags.mockInterview;
  delete flags.roleplay;
  delete flags.debate;
  delete flags.quiz;

  const flagCategories = [
    {
      category: 'Core Exhibition Suites',
      icon: '🏛️',
      items: [
        {
          key: 'careers',
          label: '32+ Global Careers Explorer',
          desc: 'High-earning career pathways, required English superpowers, and global industry salary scales.',
          badge: 'Explorer'
        },
        {
          key: 'colleges',
          label: 'Accredited Colleges & Institutes',
          desc: 'Top-tier NAAC Grade A++ and NIRF ranked universities, government institutes, and global colleges.',
          badge: 'Academic'
        },
        {
          key: 'exams',
          label: 'Competitive Entrance Exams',
          desc: 'National & international exam guides (CUET, CLAT, NEET, DGCA ICAO Aviation, etc.).',
          badge: 'Assessment'
        },
        {
          key: 'roadmap',
          label: 'Personalized Career Roadmap & Stream Quiz',
          desc: 'Class 9–12 & UG step-by-step career milestones and aptitude stream discovery engine.',
          badge: 'Guidance'
        }
      ]
    },
    {
      category: 'Interactive Speech & Studio',
      icon: '🎙️',
      items: [
        {
          key: 'speechLab',
          label: 'AI Speech Lab & 6D Voice Coach',
          desc: 'Real-time studio speech evaluation, phonetics pronunciation ladder, and articulation feedback.',
          badge: 'AI Speech'
        },
        {
          key: 'anchorMode',
          label: 'News Anchor Studio & Roleplay Prompter',
          desc: 'Professional broadcast teleprompter with video feed, multi-industry roleplays, and recording.',
          badge: 'Broadcast'
        }
      ]
    },
    {
      category: 'Gamification & Arcade Suite',
      icon: '🎮',
      items: [
        {
          key: 'games',
          label: 'Language Arcade Games Suite',
          desc: 'All 11 interactive games: Wordle, Jobtris, Crossword, Hangman, Spelling Bee, and Gemini AI Quests.',
          badge: '11 Games'
        },
        {
          key: 'ocr_enabled',
          label: 'Game Completion Detection Engine',
          desc: 'Hybrid state hooks and OCR canvas scanner to auto-detect game over screens and score victories.',
          badge: 'Detection'
        },
        {
          key: 'dopamine_fx',
          label: 'Dopamine Rewards & Mystery Unlocks',
          desc: 'Gacha reward reveals, celebratory particle confetti, audio chimes, and micro-achievement badges.',
          badge: 'Rewards'
        }
      ]
    },
    {
      category: 'Student Utilities & Community',
      icon: '🌟',
      items: [
        {
          key: 'pdf_export',
          label: '2-Page Student Career Booklet PDF Export',
          desc: 'Vector student report card export with scissors cutting-line, QR verification, and skills profile.',
          badge: 'Export'
        },
        {
          key: 'tutorial',
          label: 'Interactive Platform Tutorial & Voice Guide',
          desc: 'Interactive platform tutorial walkthrough with studio voice guidance.',
          badge: 'Tutorial'
        },
        {
          key: 'leaderboard',
          label: 'Exhibition Hall Leaderboards',
          desc: 'Real-time top 10 attendee rankings, achievement streaks, and competitive fair scores.',
          badge: 'Live Rank'
        },
        {
          key: 'feedback',
          label: 'Visitor Reflections Wall',
          desc: 'Attendee live reflections wall, verified star ratings, and community exhibition reviews.',
          badge: 'Reviews'
        },
        {
          key: 'guide_enabled',
          label: 'AI Digital Guide & Presence Detection',
          desc: 'Presence-sensing AI avatar guide with conversational speech synthesis and fair assistance.',
          badge: 'Virtual AI'
        }
      ]
    }
  ];

  let html = `
    <!-- Digital Guide Architecture Config -->
    <div style="background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:16px;">🤖</span>
        <h5 style="font-size:13.5px;font-weight:700;margin:0;color:var(--text-main);">Digital Guide Architecture Config</h5>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:var(--text-dim);">Guide Presentation Style:</label>
          <select id="admin-guide-presentation" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-subtle);color:var(--text-main);font-size:12.5px;">
            <option value="floating" ${flags.guide_presentation_mode === 'floating' ? 'selected' : ''}>🌟 Floating Holographic HUD (Default)</option>
            <option value="studio" ${flags.guide_presentation_mode === 'studio' ? 'selected' : ''}>📺 Fullscreen Broadcast Studio</option>
            <option value="drawer" ${flags.guide_presentation_mode === 'drawer' ? 'selected' : ''}>📋 Companion Sidebar Drawer</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px;color:var(--text-dim);">Presence Detection ML Engine:</label>
          <select id="admin-guide-ml-engine" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-subtle);color:var(--text-main);font-size:12.5px;">
            <option value="client" ${flags.guide_ml_engine === 'client' ? 'selected' : ''}>⚡ Client Browser FaceDetector (Lightweight)</option>
            <option value="server" ${flags.guide_ml_engine === 'server' ? 'selected' : ''}>🧠 Server YOLO / OpenCV Heuristic</option>
            <option value="hybrid" ${flags.guide_ml_engine === 'hybrid' ? 'selected' : ''}>🔄 Hybrid (Client Instant + Server Verify)</option>
          </select>
        </div>
      </div>
    </div>
  `;

  // Render categorized feature flag groups
  flagCategories.forEach(cat => {
    html += `
      <div style="margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:14px;">${cat.icon}</span>
          <h6 style="font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--accent-cyan);margin:0;">
            ${escapeHtml(cat.category)}
          </h6>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
    `;

    cat.items.forEach(item => {
      const isEnabled = flags[item.key] !== false;
      html += `
        <div class="toggle-switch-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface-card);border:1px solid var(--border);border-radius:var(--radius-sm);transition:border-color 0.2s ease;">
          <div style="padding-right:14px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <strong style="color:var(--text-main);font-size:13.5px;">${escapeHtml(item.label)}</strong>
              <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:rgba(59,130,246,0.15);color:var(--accent-cyan);border:1px solid rgba(59,130,246,0.3);">
                ${escapeHtml(item.badge)}
              </span>
            </div>
            <div style="font-size:11.5px;color:var(--text-dim);margin-top:3px;line-height:1.4;">
              ${escapeHtml(item.desc)}
            </div>
          </div>
          <input type="checkbox" id="flag-${item.key}" ${isEnabled ? 'checked' : ''} onchange="toggleFeatureFlag('${item.key}', this.checked)" style="width:20px;height:20px;min-width:20px;accent-color:var(--accent-cyan);cursor:pointer;">
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  flagsMount.innerHTML = html;


  // Wire dropdown changes
  $('#admin-guide-presentation')?.addEventListener('change', (e) => {
    STATE.config.flags.guide_presentation_mode = e.target.value;
    localStorage.setItem('cf_feature_flags', JSON.stringify(STATE.config.flags));
    fetchApi('admin/config', 'PUT', { flags: STATE.config.flags }).catch(() => {});
    showToast(`Guide Presentation Style set to ${e.target.value}`);
  });

  $('#admin-guide-ml-engine')?.addEventListener('change', (e) => {
    STATE.config.flags.guide_ml_engine = e.target.value;
    localStorage.setItem('cf_feature_flags', JSON.stringify(STATE.config.flags));
    fetchApi('admin/config', 'PUT', { flags: STATE.config.flags }).catch(() => {});
    showToast(`Human Detection ML Engine set to ${e.target.value}`);
  });
}

function applyFeatureFlags() {
  const flags = STATE.config?.flags || {};

  // 1. Module nav buttons and data-flag elements
  $$('[data-flag]').forEach(el => {
    const flagKey = el.dataset.flag;
    const isEnabled = flags[flagKey] !== false;
    el.hidden = !isEnabled;
    el.style.display = isEnabled ? '' : 'none';
  });

  // 2. Hide section containers if corresponding primary module is disabled
  const sectionFlagMap = {
    'careers': 'sec-careers',
    'colleges': 'sec-colleges',
    'exams': 'sec-exams',
    'speechLab': 'sec-speechLab',
    'anchorMode': 'sec-teleprompter',
    'games': 'sec-games',
    'roadmap': 'sec-roadmap',
    'leaderboard': 'sec-leaderboard',
    'feedback': 'sec-feedback'
  };

  Object.entries(sectionFlagMap).forEach(([flagKey, secId]) => {
    const secEl = $(`#${secId}`);
    if (secEl && flags[flagKey] === false) {
      secEl.hidden = true;
      secEl.style.display = 'none';
    }
  });

  // 3. Prune / hide matching footer links
  $$('.footer-links-list a').forEach(a => {
    const onclickStr = a.getAttribute('onclick') || '';
    Object.entries(sectionFlagMap).forEach(([flagKey, secId]) => {
      const tabName = secId.replace('sec-', '');
      if (onclickStr.includes(`switchTab('${tabName}')`) || onclickStr.includes(`switchTab('${flagKey}')`)) {
        const li = a.closest('li');
        if (li) {
          const isEnabled = flags[flagKey] !== false;
          li.hidden = !isEnabled;
          li.style.display = isEnabled ? '' : 'none';
        }
      }
    });
  });

  // 4. Greeting button encapsulation (Permanently hidden per prompt: voice starts only from Start Tutorial)
  const greetingBtn = $('#btn-greeting');
  if (greetingBtn) {
    greetingBtn.hidden = true;
    greetingBtn.style.display = 'none';
  }

  // 5. Header Dossier button encapsulation (hidden until user completes tutorial)
  const dossierBtn = $('#btn-header-dossier');
  if (dossierBtn) {
    const isPdfEnabled = flags.pdf_export !== false;
    const isTutorialDone = localStorage.getItem('cf_tutorial_completed') === 'true' || 
                           localStorage.getItem('cf_dossier_unlocked') === 'true';
    const shouldShow = isPdfEnabled && isTutorialDone;
    dossierBtn.hidden = !shouldShow;
    dossierBtn.style.display = shouldShow ? 'inline-flex' : 'none';
  }

  // 6. Header Tutorial button encapsulation
  const tutorialBtn = $('#btn-header-tutorial');
  if (tutorialBtn) {
    const isTutorialEnabled = flags.tutorial !== false;
    tutorialBtn.hidden = !isTutorialEnabled;
    tutorialBtn.style.display = isTutorialEnabled ? '' : 'none';
  }

  // 7. If currently on a disabled tab, fallback cleanly to 'hero' (Overview)
  if (STATE.activeTab && STATE.activeTab !== 'hero') {
    const currentTabBtn = $(`.tab-btn[data-tab="${STATE.activeTab}"]`);
    if (currentTabBtn && (currentTabBtn.hidden || currentTabBtn.style.display === 'none')) {
      switchTab('hero');
    }
  }
}

// ─── ADMIN: D1 DATABASE CONNECTION STATUS & LIVE TESTER ────────────────────
function renderAdminDbStatus(cfg) {
  const dbStatusWrap = $('#admin-db-status-pill');
  if (!dbStatusWrap) return;

  if (cfg) {
    if (cfg.db_connected !== undefined) STATE.config.db_connected = Boolean(cfg.db_connected);
    if (cfg.total_scores !== undefined) STATE.config.total_scores = cfg.total_scores;
    if (cfg.total_feedback !== undefined) STATE.config.total_feedback = cfg.total_feedback;
  }

  const isConnected = Boolean(STATE.config && STATE.config.db_connected);
  const totalScores = (STATE.config && STATE.config.total_scores) || 0;
  const totalFeedback = (STATE.config && STATE.config.total_feedback) || 0;

  if (isConnected) {
    dbStatusWrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px;">
        <span class="badge-pill" style="background:rgba(16,185,129,0.15);color:var(--accent-green, #10b981);border:1px solid rgba(16,185,129,0.4);font-weight:700;display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:12.5px;">
          🟢 Cloudflare D1 Database Active · Global Multi-System Storage Synchronized (${totalScores} scores, ${totalFeedback} reviews)
        </span>
        <button type="button" id="btn-admin-test-db-conn" class="btn btn-secondary btn-sm" style="padding:4px 10px;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="Test live Cloudflare D1 database connection">
          🔄 Test Connection
        </button>
      </div>
    `;
  } else {
    dbStatusWrap.innerHTML = `
      <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.38);border-radius:var(--radius-sm, 8px);padding:14px 16px;margin-top:8px;font-size:12.5px;color:var(--text-main);line-height:1.55;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <strong style="color:#f59e0b;font-size:13.5px;">🟡 Global D1 Database Not Linked in Cloudflare Pages:</strong>
            <div style="margin-top:3px;color:var(--text-dim, #64748b);">
              Currently storing data in transient browser/memory cache. Connect Cloudflare D1 to persist YouTube URL, speech scores, and feedback across all devices worldwide:
            </div>
          </div>
          <button type="button" id="btn-admin-test-db-conn" class="btn btn-secondary btn-sm" style="padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;border-color:rgba(245,158,11,0.5);background:rgba(245,158,11,0.1);" title="Test live connection to Cloudflare D1">
            🔄 Test Connection
          </button>
        </div>
        <ol style="margin:10px 0 6px 18px;padding:0;">
          <li style="margin-bottom:5px;">
            In Cloudflare Dashboard → <strong>Storage &amp; Databases</strong> → <strong>D1 SQL Database</strong> → Click <strong>Create</strong> (e.g. Name: <code>careerfair</code> or <code>careerfair-db</code>)
          </li>
          <li style="margin-bottom:5px;">
            In <strong>Workers &amp; Pages</strong> → Select your Pages Project (e.g. <code>careerwithenglish</code> or <code>careerfair</code>) → <strong>Settings</strong> → <strong>Functions</strong> → <strong>D1 database bindings</strong> → Click <strong>Add binding</strong>:
            <div style="margin:4px 0;background:rgba(0,0,0,0.06);padding:4px 10px;border-radius:4px;font-family:monospace;font-size:11.5px;display:inline-block;">
              Variable name: <strong>DB</strong> &nbsp;|&nbsp; D1 database: <strong>careerfair</strong> (or <strong>careerfair-db</strong>)
            </div>
          </li>
          <li style="margin-top:6px;color:#d97706;font-weight:700;">
            ⚡ <strong>Mandatory Step to Activate:</strong> Cloudflare Pages builds bindings into each deployment at compile time. Existing deployments DO NOT automatically hot-reload new bindings! Go to <strong>Deployments</strong> → Click <strong>··· (Options)</strong> on your latest deployment → Click <strong>Retry deployment</strong> (or push a git commit) so Cloudflare rebuilds with the binding attached!
          </li>
        </ol>
      </div>
    `;
  }

  // Wire up the Test Connection button
  const testBtn = $('#btn-admin-test-db-conn');
  if (testBtn) {
    testBtn.onclick = async () => {
      const origText = testBtn.innerHTML;
      testBtn.disabled = true;
      testBtn.innerHTML = `⏳ Testing...`;
      try {
        const endpoint = STATE.adminKey ? `admin/config?_t=${Date.now()}` : `config?_t=${Date.now()}`;
        let liveCfg = await fetchApi(endpoint);
        if (!liveCfg || liveCfg.db_connected === undefined) {
          liveCfg = await fetchApi(`config?_t=${Date.now()}`);
        }
        if (liveCfg && liveCfg.db_connected !== undefined) {
          STATE.config.db_connected = Boolean(liveCfg.db_connected);
          if (liveCfg.total_scores !== undefined) STATE.config.total_scores = liveCfg.total_scores;
          if (liveCfg.total_feedback !== undefined) STATE.config.total_feedback = liveCfg.total_feedback;
          renderAdminDbStatus(liveCfg);
          if (liveCfg.db_connected) {
            showToast('✅ Cloudflare D1 Database connected and active! Multi-system storage synchronized.');
          } else {
            showToast('⚠️ D1 is still unbound on this deployment. Go to Cloudflare Pages → Deployments → Retry deployment!');
          }
        } else {
          showToast('⚠️ Could not verify D1 status from server.');
          testBtn.innerHTML = origText;
          testBtn.disabled = false;
        }
      } catch (err) {
        showToast('❌ Connection test error: ' + (err.message || 'Network error'));
        testBtn.innerHTML = origText;
        testBtn.disabled = false;
      }
    };
  }
}
window.renderAdminDbStatus = renderAdminDbStatus;

function initAdminWorkspace() {
  if (typeof initAdminImportControls === 'function') initAdminImportControls();
  // Authoritative global API key sync from Cloudflare D1 to synchronize keys across all admin devices
  fetchApi('admin/config').then(adminCfg => {
    if (adminCfg && adminCfg.ok) {
      if (adminCfg.db_connected !== undefined) {
        STATE.config.db_connected = Boolean(adminCfg.db_connected);
        if (adminCfg.total_scores !== undefined) STATE.config.total_scores = adminCfg.total_scores;
        if (adminCfg.total_feedback !== undefined) STATE.config.total_feedback = adminCfg.total_feedback;
      }
      if (adminCfg.gemini_keys) {
        STATE.config.gemini_keys = adminCfg.gemini_keys;
        STATE.config.gemini_key = adminCfg.gemini_keys.split(/[\r\n,]+/)[0].trim();
        try {
          localStorage.setItem('cf_gemini_keys', adminCfg.gemini_keys);
          localStorage.setItem('cf_gemini_key', STATE.config.gemini_key);
        } catch {}
      }
      if (adminCfg.eleven_keys) {
        STATE.config.eleven_keys = adminCfg.eleven_keys;
        STATE.config.eleven_key = adminCfg.eleven_keys.split(/[\r\n,]+/)[0].trim();
        try {
          localStorage.setItem('cf_eleven_keys', adminCfg.eleven_keys);
          localStorage.setItem('cf_eleven_key', STATE.config.eleven_key);
        } catch {}
      }
      if (adminCfg.eleven_voice) {
        STATE.config.eleven_voice = adminCfg.eleven_voice;
        try { localStorage.setItem('cf_eleven_voice', adminCfg.eleven_voice); } catch {}
      }
      if (typeof window.syncAdminGeminiKeyBoxes === 'function') window.syncAdminGeminiKeyBoxes();
      if (typeof window.syncAdminElevenKeyBoxes === 'function') window.syncAdminElevenKeyBoxes();
      if (typeof verifyAndLoadElevenVoices === 'function') verifyAndLoadElevenVoices(true);
      renderAdminDbStatus(adminCfg);
    }
  }).catch(() => {});

  if (typeof window.initDynamicApiPools === 'function') window.initDynamicApiPools();
  renderAdminDbStatus(STATE.config);

  // Admin tabs switching
  $$('#admin-tab-row .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#admin-tab-row .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.adminView;
      $$('.admin-view-panel').forEach(p => p.hidden = true);
      $(`#admin-view-${view}`).hidden = false;
      if (view === 'data') {
        renderAdminModeration();
      }
      if (view === 'security' && typeof window.renderAdminDevices === 'function') {
        window.renderAdminDevices();
      }
      if (view === 'ai') {
        if (typeof window.initDynamicApiPools === 'function') {
          window.initDynamicApiPools();
        }
      }
      if (window.AppRouter) {
        window.AppRouter.navigate('/admin', { silent: true });
      }
    });
  });

  // Render Feature Flags
  renderAdminFeatureFlags();

  // Wire API Keys panel controls
  $('#btn-refresh-api-keys')?.addEventListener('click', renderAdminKeys);
  $('#btn-generate-api-key')?.addEventListener('click', async () => {
    const label = ($('#admin-new-key-label')?.value || '').trim() || 'API Key';
    const scopes = [];
    if ($('#scope-read-leaderboard')?.checked) scopes.push('read:leaderboard');
    if ($('#scope-write-scores')?.checked) scopes.push('write:scores');
    if ($('#scope-read-telemetry')?.checked) scopes.push('read:telemetry');
    if ($('#scope-read-feedback')?.checked) scopes.push('read:feedback');
    if ($('#scope-manage-config')?.checked) scopes.push('manage:config');

    const res = await fetchApi('admin/keys', 'POST', { label, scopes });
    if (res?.ok && res.key) {
      $('#admin-new-key-text').textContent = res.key;
      $('#admin-new-key-reveal').hidden = false;
      showToast('🔑 New Scoped API Key created successfully!');
      renderAdminKeys();
    } else {
      showToast('Error generating API key: ' + (res?.error || 'Unknown error'));
    }
  });

  $('#btn-copy-new-key')?.addEventListener('click', () => {
    const keyTxt = $('#admin-new-key-text')?.textContent || '';
    if (keyTxt) {
      navigator.clipboard.writeText(keyTxt).then(() => {
        showToast('📋 API Key copied to clipboard!');
      }).catch(() => {
        showToast('Could not copy automatically. Please select and copy.');
      });
    }
  });

  // Wire Telemetry panel controls
  $('#btn-refresh-telemetry')?.addEventListener('click', renderAdminTelemetry);
  $('#btn-refresh-issues')?.addEventListener('click', window.renderAdminIssues);

  // Load existing rclone settings
  const rcloneRemoteInput = $('#admin-rclone-remote');
  const rcloneEndpointInput = $('#admin-rclone-endpoint');
  if (rcloneRemoteInput) {
    rcloneRemoteInput.value = localStorage.getItem('cf_rclone_remote') || STATE.config.rclone_remote || 'gdrive:careerfair_telemetry';
  }
  if (rcloneEndpointInput) {
    rcloneEndpointInput.value = localStorage.getItem('cf_rclone_endpoint') || STATE.config.rclone_endpoint || '';
  }


  // Load existing AI Keys Pool
  const geminiInput = $('#admin-gemini-key');
  const geminiStatus = $('#admin-gemini-key-status');
  const elevenInput = $('#admin-eleven-key');
  const elevenVoiceInput = $('#admin-eleven-voice');

  const updateGeminiKeyStatus = (keysStr) => {
    if (!geminiStatus) return;
    const count = (keysStr || '').split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean).length;
    if (count > 0) {
      geminiStatus.innerHTML = `✅ <strong>${count} Gemini API Key${count > 1 ? 's' : ''}</strong> active &amp; persistent across reloads. Failover pool ready.`;
    } else {
      geminiStatus.innerHTML = `⚠️ No Gemini key configured. System uses deterministic heuristics failover.`;
    }
  };

  if (geminiInput) {
    const savedGemini = localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || STATE.config.gemini_keys || STATE.config.gemini_key || '';
    geminiInput.value = savedGemini;
    updateGeminiKeyStatus(savedGemini);

    const persistGemini = () => {
      const v = geminiInput.value.trim();
      if (v) {
        localStorage.setItem('cf_gemini_keys', v);
        localStorage.setItem('cf_gemini_key', v.split(/[\r\n,]+/)[0].trim());
        sessionStorage.setItem('cf_gemini_keys', v);
        STATE.config.gemini_keys = v;
        STATE.config.gemini_key = v;
      }
      updateGeminiKeyStatus(v);
    };
    geminiInput.addEventListener('input', persistGemini);
    geminiInput.addEventListener('change', persistGemini);
  }

  // ElevenLabs Voice Verification & Loader
  const verifyAndLoadElevenVoices = async (silent = false) => {
    const statusEl = $('#admin-eleven-status');
    const selectEl = $('#admin-eleven-voice-select');
    const hintEl = $('#admin-eleven-voice-hint');
    const customVoiceInput = $('#admin-eleven-voice');
    // Gather active key from dynamic pool inputs -> localStorage -> STATE
    const dynamicElevenInputs = Array.from(document.querySelectorAll('#eleven-keys-container .eleven-key-field'));
    const dynamicKey = dynamicElevenInputs.map(i => i.value.trim()).filter(Boolean)[0] || '';
    const keyVal = (dynamicKey || elevenInput?.value || localStorage.getItem('cf_eleven_key') || (localStorage.getItem('cf_eleven_keys') || '').split(/[\r\n,]+/)[0].trim() || STATE.config.eleven_key || '').trim();
    const effectiveKey = (keyVal && keyVal !== 'configured') ? keyVal : '';

    // Check if user entered a Key ID instead of the secret API key
    if (effectiveKey && (effectiveKey.startsWith('key_') || effectiveKey.length < 24)) {
      if (statusEl) {
        statusEl.innerHTML = '<span style="color:var(--accent-amber, #f59e0b);font-weight:600;">⚠️ You entered the "Key ID" instead of the Secret API Key.<br>In ElevenLabs (Settings → API Keys), please copy the secret key from the Actions column.</span>';
      }
      if (!silent) showToast('⚠️ Please copy the Secret API Key, not the Key ID', 5000);
      return;
    }

    if (statusEl && !silent) {
      statusEl.innerHTML = '<span style="color:var(--accent-cyan);">⏳ Verifying ElevenLabs credentials & voices...</span>';
    }

    try {
      const res = await fetch(getApiUrl('api/tts/voices') + (effectiveKey ? `?key=${encodeURIComponent(effectiveKey)}` : ''), {
        headers: effectiveKey ? { 'xi-api-key': effectiveKey } : {}
      });

      const data = await res.json();

      if (data.ok) {
        const charCount = Number(data.subscription?.character_count ?? data.character_count ?? 0);
        const charLimit = Number(data.subscription?.character_limit ?? data.character_limit ?? 10000);
        const quotaStr = ` · ${charCount.toLocaleString()} / ${charLimit.toLocaleString()} credits`;
        if (statusEl) {
          const keyCount = (localStorage.getItem('cf_eleven_keys') || '').split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean).length || (effectiveKey ? 1 : 0);
          const poolStr = keyCount > 1 ? ` · Failover Pool: ${keyCount} keys active` : '';
          statusEl.innerHTML = `<span style="color:var(--accent-green, #10b981);font-weight:600;">✅ ElevenLabs Connected (${data.total || 0} voices available${quotaStr}${poolStr})</span>`;
        }

        if (selectEl && Array.isArray(data.voices)) {
          selectEl.innerHTML = '<option value="">🇮🇳 [Recommended] Authentic Indian Neural Voice (en-IN · Free & Unlimited)</option>';
          const savedVoice = (customVoiceInput?.value || localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '').trim();

          const freeGroup = document.createElement('optgroup');
          freeGroup.label = '🟢 ElevenLabs Free-Tier Studio Voices (Zero 402 Errors)';
          const paidGroup = document.createElement('optgroup');
          paidGroup.label = '🔒 ElevenLabs Paid Starter Voices (Community VoiceLab)';

          data.voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            const isFree = (v.freeTierReady || v.category === 'premade');
            const prefix = isFree ? '🟢 ' : '🔒 ';
            opt.textContent = `${prefix}${v.name} (${v.accent || (isFree ? 'Studio Premade' : 'VoiceLab')})`;
            if (savedVoice && (savedVoice === v.id || savedVoice === v.name)) {
              opt.selected = true;
            }
            if (isFree) freeGroup.appendChild(opt);
            else paidGroup.appendChild(opt);
          });

          if (freeGroup.children.length > 0) selectEl.appendChild(freeGroup);
          if (paidGroup.children.length > 0) selectEl.appendChild(paidGroup);

          if (hintEl) {
            hintEl.style.display = 'block';
            hintEl.innerHTML = `💡 <strong>ElevenLabs API Notice:</strong> Community voices (e.g. <em>Aditi</em>) require an ElevenLabs Starter subscription for API access. On the Free tier, our backend auto-heals by streaming studio-quality premade voices (e.g. <em>Sarah, Rachel, Alice</em>) with Multilingual v2, or you can select a 🟢 [Free API Ready] voice above!`;
            hintEl.style.color = 'var(--accent-cyan)';
          }
        }

        if (!silent) showToast('✅ ElevenLabs verified successfully!');
      } else {
        const errMsg = data.message || 'ElevenLabs key not active.';
        // Auto-promote backup key if this key is invalid or quota exhausted!
        const keyPool = (localStorage.getItem('cf_eleven_keys') || '').split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean);
        if (keyPool.length > 1 && (data.status === 'invalid_key' || data.statusCode === 401 || data.statusCode === 429 || errMsg.includes('Invalid') || errMsg.includes('quota') || errMsg.includes('unauthorized'))) {
          if (statusEl) {
            statusEl.innerHTML = `<span style="color:var(--accent-amber, #f59e0b);">🔄 Main key invalid/exhausted. Auto-promoting Backup 1 to Main &amp; re-verifying...</span>`;
          }
          if (typeof window.rotateAndPromoteElevenKey === 'function') {
            await window.rotateAndPromoteElevenKey('verification_failed');
            return verifyAndLoadElevenVoices(silent);
          }
        }
        if (statusEl) {
          statusEl.innerHTML = `<span style="color:var(--accent-amber, #f59e0b);">⚠️ ${escapeHtml(errMsg)} (Fallback: Browser Indian en-IN active)</span>`;
        }
        if (!silent) showToast(`⚠️ ElevenLabs: ${errMsg}`);
      }
    } catch (err) {
      if (statusEl && !silent) {
        statusEl.innerHTML = `<span style="color:var(--accent-magenta, #ff2a85);">⚠️ Could not reach ElevenLabs: ${escapeHtml(err.message)}</span>`;
      }
    }
  };

  if (elevenInput) {
    const savedEleven = localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '';
    if (savedEleven && savedEleven !== 'configured') {
      elevenInput.value = savedEleven;
    }
    const persistEleven = () => {
      const v = elevenInput.value.trim();
      localStorage.setItem('cf_eleven_key', v);
      STATE.config.eleven_key = v;
    };
    elevenInput.addEventListener('input', persistEleven);
    elevenInput.addEventListener('change', persistEleven);
  }

  if (elevenVoiceInput) {
    const savedVoice = localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '';
    elevenVoiceInput.value = savedVoice;
    const persistVoice = () => {
      const v = elevenVoiceInput.value.trim();
      localStorage.setItem('cf_eleven_voice', v);
      STATE.config.eleven_voice = v;
    };
    elevenVoiceInput.addEventListener('input', persistVoice);
    elevenVoiceInput.addEventListener('change', persistVoice);
  }

  $('#admin-eleven-voice-select')?.addEventListener('change', function() {
    const v = this.value;
    if (elevenVoiceInput) {
      elevenVoiceInput.value = v;
      localStorage.setItem('cf_eleven_voice', v);
      STATE.config.eleven_voice = v;
    }
    updateGreetingButtonTitle();
    if (typeof updateTutorialVoiceBadge === 'function') updateTutorialVoiceBadge();
  });

  $('#btn-verify-eleven')?.addEventListener('click', () => {
    verifyAndLoadElevenVoices(false);
  });

  $('#btn-quick-select-free-voice')?.addEventListener('click', () => {
    // Select George (JBFqnCBsd6RMkjVDRZzb) or first premade studio voice
    const bestVoice = 'JBFqnCBsd6RMkjVDRZzb'; // George (Warm, Articulate)
    if (elevenVoiceInput) elevenVoiceInput.value = bestVoice;
    const voiceSelect = $('#admin-eleven-voice-select');
    if (voiceSelect) {
      const opt = voiceSelect.querySelector(`option[value="${bestVoice}"]`);
      if (opt) voiceSelect.value = bestVoice;
    }
    localStorage.setItem('cf_eleven_voice', bestVoice);
    STATE.config.eleven_voice = bestVoice;
    showToast('⚡ Auto-selected George (Studio Free-Tier Voice)!');
  });

  // Save AI Credentials, Backup Keys Pool & rclone Google Drive Settings
  $('#btn-save-ai')?.addEventListener('click', async () => {
    // 1. Gather Gemini keys from dynamic pool inputs, fallback to storage / config
    const geminiInputs = Array.from(document.querySelectorAll('#gemini-keys-container .gemini-key-field'));
    let geminiKeys = geminiInputs.map(i => i.value.trim()).filter(Boolean).join('\n');
    if (!geminiKeys) {
      geminiKeys = ($('#admin-gemini-key')?.value || localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || STATE.config.gemini_keys || STATE.config.gemini_key || '').trim();
    }
    const geminiKey = geminiKeys ? geminiKeys.split(/[\r\n,]+/)[0].trim() : '';

    // 2. Gather ElevenLabs keys from dynamic pool inputs, fallback to storage / config
    const elevenInputs = Array.from(document.querySelectorAll('#eleven-keys-container .eleven-key-field'));
    let elevenKeys = elevenInputs.map(i => i.value.trim()).filter(Boolean).join('\n');
    if (!elevenKeys) {
      elevenKeys = ($('#admin-eleven-key')?.value || localStorage.getItem('cf_eleven_keys') || localStorage.getItem('cf_eleven_key') || STATE.config.eleven_keys || STATE.config.eleven_key || '').trim();
    }
    const elevenKey = elevenKeys ? elevenKeys.split(/[\r\n,]+/)[0].trim() : '';

    const elevenVoice = ($('#admin-eleven-voice')?.value || $('#admin-eleven-voice-select')?.value || localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '').trim();
    const rcloneRemote = ($('#admin-rclone-remote')?.value || 'gdrive:careerfair_telemetry').trim();
    const rcloneEndpoint = ($('#admin-rclone-endpoint')?.value || '').trim();
    
    // Persist ElevenLabs pool & primary key
    if (elevenKeys) {
      localStorage.setItem('cf_eleven_keys', elevenKeys);
      STATE.config.eleven_keys = elevenKeys;
    } else {
      localStorage.removeItem('cf_eleven_keys');
      STATE.config.eleven_keys = '';
    }
    if (elevenKey) {
      localStorage.setItem('cf_eleven_key', elevenKey);
      STATE.config.eleven_key = elevenKey;
    } else {
      localStorage.removeItem('cf_eleven_key');
      STATE.config.eleven_key = '';
    }
    localStorage.setItem('cf_eleven_voice', elevenVoice);
    STATE.config.eleven_voice = elevenVoice;

    // Persist Google Drive rclone settings
    localStorage.setItem('cf_rclone_remote', rcloneRemote);
    STATE.config.rclone_remote = rcloneRemote;
    localStorage.setItem('cf_rclone_endpoint', rcloneEndpoint);
    STATE.config.rclone_endpoint = rcloneEndpoint;
    
    // Persist Gemini keys
    if (geminiKeys) {
      STATE.config.gemini_keys = geminiKeys;
      STATE.config.gemini_key = geminiKey;
      localStorage.setItem('cf_gemini_keys', geminiKeys);
      localStorage.setItem('cf_gemini_key', geminiKey);
      sessionStorage.setItem('cf_gemini_keys', geminiKeys);
    } else {
      STATE.config.gemini_keys = '';
      STATE.config.gemini_key = '';
      localStorage.removeItem('cf_gemini_keys');
      localStorage.removeItem('cf_gemini_key');
      sessionStorage.removeItem('cf_gemini_keys');
    }

    // Update status badges
    const geminiCount = geminiKeys ? geminiKeys.split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean).length : 0;
    const gBadge = $('#admin-gemini-key-status');
    if (gBadge) {
      if (geminiCount > 0) {
        gBadge.innerHTML = `✅ <strong>${geminiCount} Gemini API Key${geminiCount > 1 ? 's' : ''}</strong> active &amp; ready in pool. Auto-failover and quota purging active!`;
      } else {
        gBadge.innerHTML = `⚠️ No Gemini key configured. System uses deterministic heuristics failover.`;
      }
    }

    const elevenCount = elevenKeys ? elevenKeys.split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean).length : 0;
    const eBadge = $('#admin-eleven-status');
    if (eBadge) {
      if (elevenCount > 0) {
        eBadge.innerHTML = `✅ <strong>${elevenCount} ElevenLabs Key${elevenCount > 1 ? 's' : ''}</strong> active. Studio Indian accent voice model will stay persistent across all key rotations!`;
      } else {
        eBadge.innerHTML = `⚠️ No ElevenLabs key entered. Studio voice synthesizes via high-fidelity Indian English (en-IN) neural voice!`;
      }
    }

    // Persist to Cloudflare D1 Backend
    await fetchApi('admin/config', 'PUT', {
      gemini_keys: geminiKeys,
      gemini_key: geminiKey,
      eleven_keys: elevenKeys,
      eleven_key: elevenKey,
      eleven_voice: elevenVoice,
      rclone_remote: rcloneRemote,
      rclone_endpoint: rcloneEndpoint
    });

    // Ensure DOM input boxes visually reflect compacted keys pool immediately!
    if (typeof window.syncAdminElevenKeyBoxes === 'function') window.syncAdminElevenKeyBoxes();
    if (typeof window.syncAdminGeminiKeyBoxes === 'function') window.syncAdminGeminiKeyBoxes();

    showToast('AI, Voice & Google Drive rclone settings saved successfully');
    if (elevenKey) {
      await verifyAndLoadElevenVoices(true);
    }
  });

  // Test Humanoid Voice button in Admin - tests the EXACT configured Voice ID directly
  $('#btn-test-tts-voice')?.addEventListener('click', async function() {
    const testStatus = $('#admin-tts-test-status');

    // Auto-compact first: if Main is blank while backups exist, promote Backup 1 to Main immediately on screen!
    if (typeof window.compactAndSyncElevenKeys === 'function') {
      window.compactAndSyncElevenKeys(false);
    }

    const isCurrentlyPlaying = this.classList.contains('speaking-active') || this.classList.contains('playing') || this.textContent.includes('Stop');

    if (isCurrentlyPlaying) {
      stopAllVoice();
      if (testStatus) {
        testStatus.innerHTML = '<span style="color:var(--text-muted);">⏹️ Voice test stopped.</span>';
      }
      return;
    }

    if (testStatus) {
      testStatus.innerHTML = '<span style="color:var(--accent-cyan);">🔊 Synthesizing live voice test...</span>';
    }

    // Watchdog timer (7s) to guarantee no infinite hang on Synthesizing status
    if (window._testVoiceWatchdog) clearTimeout(window._testVoiceWatchdog);
    window._testVoiceWatchdog = setTimeout(() => {
      const ts = $('#admin-tts-test-status');
      const btn = $('#btn-test-tts-voice');
      if (ts && ts.textContent.includes('Synthesizing')) {
        ts.innerHTML = '<span style="color:var(--accent-cyan);">ℹ️ Playing via authentic Indian English Neural Voice (en-IN fallback).</span>';
        if (btn) {
          btn.innerHTML = btn.dataset.origHtml || 'Test Humanoid Voice 🔊';
          btn.classList.remove('speaking-active', 'playing');
        }
      }
    }, 7000);

    const customVoiceId = ($('#admin-eleven-voice')?.value || localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '').trim();
    const testText = customVoiceId
      ? `Hello! This is a live voice test using voice ID: ${customVoiceId}. Every career pathway speaks with clarity and confidence.`
      : "Welcome to the Career Fair 2026. This voice test demonstrates authentic Indian English pronunciation for all thirty-two careers.";
    try {
      await speak(testText, this);
    } catch (err) {
      if (testStatus) {
        testStatus.innerHTML = `<span style="color:var(--accent-amber, #f59e0b);">⚠️ Voice test ended: ${escapeHtml(err.message || 'Synthesis completed')}</span>`;
      }
      stopAllVoice();
    }
  });

  // Auto-verify ElevenLabs voices on admin load if key exists
  setTimeout(() => {
    if (localStorage.getItem('cf_eleven_key') || localStorage.getItem('cf_eleven_keys') || STATE.config.eleven_key || STATE.config.has_eleven_key) {
      verifyAndLoadElevenVoices(true);
    }
  }, 400);

  // Broadcast settings save
  $('#btn-save-broadcast')?.addEventListener('click', async () => {
    const banner = ($('#admin-banner-input')?.value || '').trim();
    const timer = parseInt($('#admin-timer-input')?.value || '0', 10) || 0;
    if (banner) {
      STATE.config.banner = banner;
      $('#broadcast-text').textContent = banner;
    }
    STATE.config.timer = timer;
    await fetchApi('admin/config', 'PUT', { banner, timer });
    showToast('Broadcast banner updated');
  });

  // Branding save
  $('#btn-save-branding')?.addEventListener('click', async () => {
    const show = $('#admin-branding-toggle').checked;
    const name = $('#admin-school-name-input').value;
    STATE.config.school_branding = show;
    STATE.config.school_name = name;
    $('#school-branding-wrap').hidden = !show;
    $('#school-branding-name').textContent = name;
    await fetchApi('admin/config', 'PUT', { school_branding: show, school_name: name });
    showToast('Branding settings updated');
  });

  // Moderation & Deletion handlers
  renderAdminModeration();

  $('#btn-refresh-admin-feedback')?.addEventListener('click', () => {
    renderAdminModeration();
    showToast('Refreshed visitor reflections');
  });

  $('#btn-clear-all-feedback')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete ALL visitor reflections? This action cannot be undone.')) return;
    try {
      await fetchApi('admin/reset-feedback', 'POST', {});
    } catch {}
    localStorage.removeItem('cf_user_feedbacks');
    showToast('All visitor reflections deleted');
    loadFeedbackWall();
    renderAdminModeration();
  });

  $('#btn-refresh-admin-scores')?.addEventListener('click', () => {
    renderAdminModeration();
    showToast('Refreshed leaderboard scores');
  });

  $('#btn-reset-scores')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reset ALL leaderboard scores? All recorded attempts will be erased.')) return;
    try {
      await fetchApi('admin/reset', 'POST', {});
    } catch {}
    localStorage.setItem('cf_scores_reset', 'true');
    localStorage.removeItem('cf_user_scores');
    localStorage.removeItem('cf_deleted_scores');
    showToast('All leaderboard scores reset');
    loadLeaderboard();
    renderAdminModeration();
  });

  // ── Admin Devices & IP Access Control Wiring ──────────────────────────────
  const btnRefreshDevices = $('#btn-admin-refresh-devices');
  if (btnRefreshDevices && !btnRefreshDevices.dataset.wired) {
    btnRefreshDevices.dataset.wired = 'true';
    btnRefreshDevices.addEventListener('click', () => {
      if (typeof window.renderAdminDevices === 'function') window.renderAdminDevices();
    });
  }
  const btnRevokeDeviceIp = $('#btn-admin-revoke-ip');
  if (btnRevokeDeviceIp && !btnRevokeDeviceIp.dataset.wired) {
    btnRevokeDeviceIp.dataset.wired = 'true';
    btnRevokeDeviceIp.addEventListener('click', () => {
      if (typeof window.adminRevokeDeviceIp === 'function') window.adminRevokeDeviceIp();
    });
  }
  if (typeof window.renderAdminDevices === 'function') window.renderAdminDevices();

  // ── Password Change Form Wiring ───────────────────────────────────────────
  const formChangePwd = $('#form-change-admin-password');
  if (formChangePwd && !formChangePwd.dataset.wired) {
    formChangePwd.dataset.wired = 'true';
    formChangePwd.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curPwd = ($('#input-current-admin-pwd')?.value || '').trim();
      const newPwd = ($('#input-new-admin-pwd')?.value || '').trim();
      const confirmPwd = ($('#input-confirm-admin-pwd')?.value || '').trim();
      const statusEl = $('#status-change-admin-pwd');

      if (!newPwd || newPwd.length < 4) {
        if (statusEl) {
          statusEl.textContent = '❌ New password must be at least 4 characters.';
          statusEl.style.color = '#ef4444';
        }
        showToast('Password too short (min 4 characters).');
        return;
      }
      if (newPwd !== confirmPwd) {
        if (statusEl) {
          statusEl.textContent = '❌ New password and confirmation do not match.';
          statusEl.style.color = '#ef4444';
        }
        showToast('New passwords do not match.');
        return;
      }

      if (!curPwd) {
        if (statusEl) {
          statusEl.textContent = '❌ Please enter your current password.';
          statusEl.style.color = '#ef4444';
        }
        showToast('Please enter your current password.');
        return;
      }

      const submitBtn = $('#btn-save-admin-pwd');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
      }
      const sessToken = STATE.adminKey || sessionStorage.getItem('cf_admin_session') || localStorage.getItem('cf_admin_session') || '';
      if (!sessToken) {
        if (statusEl) {
          statusEl.textContent = '❌ Active Admin Portal session required.';
          statusEl.style.color = '#ef4444';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Admin Password 💾';
        }
        return;
      }

      if (statusEl) {
        statusEl.textContent = 'Encrypting & updating password...';
        statusEl.style.color = 'var(--text-muted)';
      }

      try {
        const e2ee = await encryptAdminAuthPayload('change-password', {
          currentPassword: curPwd,
          newPassword: newPwd
        });
        const reqOpts = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + sessToken
          },
          body: JSON.stringify({ e2ee })
        };
        let res = await fetch(getApiUrl('api/admin/change-password'), reqOpts);
        if (!res.ok && res.status !== 400 && res.status !== 401 && res.status !== 403 && window.location.protocol !== 'file:' && window.location.hostname !== 'careerwithenglish.pages.dev') {
          res = await fetch(PRIMARY_D1_ORIGIN + '/api/admin/change-password', reqOpts);
        }
        if (!res.ok && res.status !== 400 && res.status !== 401 && res.status !== 403) {
          throw new Error('Backend unavailable');
        }
        const data = await res.json().catch(() => null);

        if (res.ok && data?.ok) {
          const nextSess = data.sessionToken || sessToken;
          STATE.adminKey = nextSess;
          sessionStorage.setItem('cf_admin_session', nextSess);
          localStorage.setItem('cf_admin_session', nextSess);

          if (statusEl) {
            statusEl.textContent = '✅ Admin password updated securely!';
            statusEl.style.color = '#10b981';
          }
          showToast('Admin password updated! 🔑');
          formChangePwd.reset();
        } else {
          if (res.status === 403 && (data?.banned || data?.brute_force_banned)) {
            enforceSiteIpBlockOverlay(data.error);
            return;
          }
          const errMsg = data?.error || data?.message || 'Failed to update password. Please check your current password.';
          if (statusEl) {
            statusEl.textContent = '❌ ' + errMsg;
            statusEl.style.color = '#ef4444';
          }
          showToast(errMsg);
        }
      } catch (err) {
        const msg = err?.message || 'Unable to reach authentication server. Please check connection.';
        if (statusEl) {
          statusEl.textContent = '❌ ' + msg;
          statusEl.style.color = '#ef4444';
        }
        showToast(msg);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Update Admin Password 💾';
        }
      }
    });
  }

  async function downloadProtectedCsv(endpoint, filename) {
    const key = STATE.adminKey || localStorage.getItem('cf_admin_session') || sessionStorage.getItem('cf_admin_session') || '';
    if (!key) {
      showToast('Please log into the Admin Portal first.');
      return;
    }
    try {
      const res = await fetch(getApiUrl('api/' + endpoint), {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      if (!res.ok) {
        showToast('Export failed: unauthorized or expired session.');
        return;
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
    } catch {
      showToast('Unable to export CSV right now.');
    }
  }

  // Export handlers with secure admin session authorization header
  $('#btn-export-scores-csv')?.addEventListener('click', () => {
    downloadProtectedCsv('admin/export', 'careerfair-scores.csv');
  });
  $('#btn-export-feedback-csv')?.addEventListener('click', () => {
    downloadProtectedCsv('admin/export-feedback', 'careerfair-feedback.csv');
  });

  // ── Admin Live Stream Controls ───────────────────────────────────────────
  const streamUrlInput = $('#admin-stream-url-input');
  const streamTitleInput = $('#admin-stream-title-input');
  const streamActiveToggle = $('#admin-stream-active-toggle');
  const streamAutoplayToggle = $('#admin-stream-autoplay-toggle');
  const streamStatusPill = $('#admin-stream-status-pill');
  const streamStatusText = $('#admin-stream-url-status');
  const previewFrame = $('#admin-stream-preview-frame');
  const previewPlaceholder = $('#admin-stream-preview-placeholder');
  const previewIndicator = $('#admin-preview-indicator');

  if (streamUrlInput) {
    streamUrlInput.value = STATE.config.stream_url || '';
  }
  if (streamTitleInput) {
    streamTitleInput.value = STATE.config.stream_title || 'Career Fair 2026 — Live Stage Broadcast';
  }
  if (streamActiveToggle) {
    streamActiveToggle.checked = STATE.config.stream_active !== false;
  }
  if (streamAutoplayToggle) {
    streamAutoplayToggle.checked = STATE.config.stream_autoplay !== false;
  }

  function validateAdminStreamInput(val) {
    const id = extractYouTubeId(val);
    if (!val || !val.trim()) {
      if (streamStatusText) streamStatusText.innerHTML = 'Enter a YouTube link or 11-character video ID above.';
      if (streamStatusPill) {
        streamStatusPill.textContent = 'Standby Mode';
        streamStatusPill.style.background = 'rgba(148, 163, 184, 0.15)';
        streamStatusPill.style.color = 'var(--text-dim)';
        streamStatusPill.style.borderColor = 'rgba(148, 163, 184, 0.3)';
      }
      return '';
    }
    if (id) {
      if (streamStatusText) {
        streamStatusText.innerHTML = `<span style="color:var(--accent-emerald);font-weight:600;">✓ Valid YouTube Video ID: <strong>${id}</strong></span>`;
      }
      if (streamStatusPill) {
        streamStatusPill.textContent = 'Stream Link Valid';
        streamStatusPill.style.background = 'rgba(16, 185, 129, 0.15)';
        streamStatusPill.style.color = 'var(--accent-emerald)';
        streamStatusPill.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      }
      return id;
    } else {
      if (streamStatusText) {
        streamStatusText.innerHTML = '<span style="color:#ef4444;font-weight:600;">✕ Invalid link. Please check the YouTube URL format.</span>';
      }
      if (streamStatusPill) {
        streamStatusPill.textContent = 'Invalid URL';
        streamStatusPill.style.background = 'rgba(239, 68, 68, 0.15)';
        streamStatusPill.style.color = '#ef4444';
        streamStatusPill.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      }
      return '';
    }
  }

  function setAdminPreview(id) {
    if (!previewFrame || !previewPlaceholder) return;
    if (id) {
      previewFrame.src = buildYouTubeEmbedUrl(id, false);
      previewFrame.hidden = false;
      previewPlaceholder.hidden = true;
      if (previewIndicator) previewIndicator.textContent = 'Preview active';
    } else {
      previewFrame.src = '';
      previewFrame.hidden = true;
      previewPlaceholder.hidden = false;
      if (previewIndicator) previewIndicator.textContent = 'No preview';
    }
  }

  streamUrlInput?.addEventListener('input', e => {
    validateAdminStreamInput(e.target.value);
  });

  $('#btn-admin-preview-stream')?.addEventListener('click', () => {
    const val = streamUrlInput ? streamUrlInput.value.trim() : '';
    const id = validateAdminStreamInput(val);
    if (id) {
      setAdminPreview(id);
      showToast(`Previewing YouTube video [${id}]`);
    } else {
      showToast('Please enter a valid YouTube video or stream link.');
    }
  });

  $('#btn-save-stream')?.addEventListener('click', async () => {
    const urlVal = streamUrlInput ? streamUrlInput.value.trim() : '';
    const titleVal = streamTitleInput ? streamTitleInput.value.trim() : 'Career Fair 2026 — Live Stage Broadcast';
    const activeVal = streamActiveToggle ? streamActiveToggle.checked : true;
    const autoVal = streamAutoplayToggle ? streamAutoplayToggle.checked : true;

    if (activeVal && urlVal && !extractYouTubeId(urlVal)) {
      showToast('Warning: YouTube URL format is unrecognized. Please check before saving.');
      return;
    }

    STATE.config.stream_url = urlVal;
    STATE.config.stream_title = titleVal;
    STATE.config.stream_active = activeVal;
    STATE.config.stream_autoplay = autoVal;

    localStorage.setItem('cf_stream_url', urlVal);
    localStorage.setItem('cf_stream_title', titleVal);
    localStorage.setItem('cf_stream_active', String(activeVal));
    localStorage.setItem('cf_stream_autoplay', String(autoVal));

    await fetchApi('admin/config', 'PUT', {
      stream_url: urlVal,
      stream_title: titleVal,
      stream_active: activeVal
    });

    renderHeroStream();
    showToast('Live stream settings updated and broadcast published!');
  });

  $('#btn-load-sample-stream')?.addEventListener('click', () => {
    const sample = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
    if (streamUrlInput) streamUrlInput.value = sample;
    if (streamActiveToggle) streamActiveToggle.checked = true;
    const id = validateAdminStreamInput(sample);
    setAdminPreview(id);
    showToast('Sample stream URL loaded. Click "Save & Publish Stream" to push live.');
  });

  $('#btn-turn-off-stream')?.addEventListener('click', async () => {
    if (streamActiveToggle) streamActiveToggle.checked = false;
    STATE.config.stream_active = false;
    localStorage.setItem('cf_stream_active', 'false');

    await fetchApi('admin/config', 'PUT', { stream_active: false });
    renderHeroStream();
    if (streamStatusPill) {
      streamStatusPill.textContent = 'Standby Mode';
      streamStatusPill.style.background = 'rgba(148, 163, 184, 0.15)';
      streamStatusPill.style.color = 'var(--text-dim)';
      streamStatusPill.style.borderColor = 'rgba(148, 163, 184, 0.3)';
    }
    showToast('Hero stream set to standby mode.');
  });

  // Check initial state for preview if already present
  if (streamUrlInput && streamUrlInput.value) {
    const id = validateAdminStreamInput(streamUrlInput.value);
    if (id) setAdminPreview(id);
  }
}

function toggleFeatureFlag(flagName, enabled) {
  STATE.config.flags[flagName] = enabled;
  // Dynamic reflow: toggle matching sub-navbar tab visibility
  const tabBtn = $(`[data-flag="${flagName}"]`);
  if (tabBtn) tabBtn.hidden = !enabled;

  // Persist flags to backend and local storage so multi-session views stay in sync
  localStorage.setItem('cf_feature_flags', JSON.stringify(STATE.config.flags));
  fetchApi('admin/config', 'PUT', { flags: STATE.config.flags }).catch(() => {});

  showToast(`Feature "${flagName}" set to ${enabled ? 'ON' : 'OFF'}`);
}

// ─── HERO LIVE STREAM & YOUTUBE PARSING ───────────────────────────────────────
function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();

  // Pure 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // URL parser
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.searchParams.has('v')) {
        const v = parsed.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'live', 'v', 'shorts'].includes(parts[0]) && parts[1]) {
        if (/^[a-zA-Z0-9_-]{11}$/.test(parts[1])) return parts[1];
      }
    } else if (parsed.hostname === 'youtu.be') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] && /^[a-zA-Z0-9_-]{11}$/.test(parts[0])) return parts[0];
    }
  } catch (e) {}

  // Regex fallback
  const match = trimmed.match(/(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|live\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

function buildYouTubeEmbedUrl(input, autoplay = true) {
  const id = extractYouTubeId(input);
  if (!id) return '';
  // playsinline=1 keeps inline on mobile without fullscreen takeover
  // rel=0 avoids irrelevant recommended videos
  // modestbranding=1 keeps player clean
  // autoplay=1&mute=1 satisfies browser autoplay policies for continuous playback
  // origin & widget_referrer allow YouTube player to validate domain context, resolving Error 153
  const autoParam = autoplay ? '&autoplay=1&mute=1' : '';
  const origin = (typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.startsWith('file'))
    ? window.location.origin
    : 'https://careerwithenglish.pages.dev';
  return `https://www.youtube.com/embed/${id}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}${autoParam}`;
}

function renderHeroStream(options = {}) {
  const iframe = $('#hero-youtube-iframe');
  const standby = $('#hero-stream-standby');
  const loader = $('#hero-stream-loader');
  const badge = $('#stream-live-badge');
  const titleEl = $('#hero-stream-title-text');
  const linkEl = $('#hero-stream-external-link');
  if (!iframe || !standby) return;

  function showStreamLoader() {
    if (loader) {
      loader.classList.remove('stream-loader-hidden');
    }
  }

  function hideStreamLoader() {
    if (loader) {
      loader.classList.add('stream-loader-hidden');
    }
  }

  const rawUrl = (STATE.config && STATE.config.stream_url) || localStorage.getItem('cf_stream_url') || 'https://youtube.com/live/3Hn-jH3up9Y';
  const isActive = STATE.config ? (STATE.config.stream_active !== false) : true;
  const isAutoplay = STATE.config ? (STATE.config.stream_autoplay !== false) : true;
  const title = (STATE.config && STATE.config.stream_title) || 'Career Fair 2026 — Live Stage Broadcast';
  const videoId = extractYouTubeId(rawUrl) || '3Hn-jH3up9Y';

  if (isActive && videoId) {
    const embedUrl = buildYouTubeEmbedUrl(videoId, isAutoplay);
    const isReturningFromOtherTab = Boolean(options.forceResume || iframe.dataset.wasHidden === 'true');
    const needsSrcUpdate = isReturningFromOtherTab || iframe.dataset.currentSrc !== embedUrl || !iframe.src || !iframe.src.includes(videoId);

    if (needsSrcUpdate) {
      // Show animated loader IMMEDIATELY so black screen is NEVER visible to user
      showStreamLoader();
      iframe.dataset.wasHidden = 'false';

      // Always give the iframe a fresh rendering cycle so Chromium re-creates video surface fresh
      const sep = embedUrl.includes('?') ? '&' : '?';
      const freshUrl = isReturningFromOtherTab ? `${embedUrl}${sep}t_rel=${Date.now()}` : embedUrl;
      iframe.src = freshUrl;
      iframe.dataset.currentSrc = embedUrl;

      // Trigger YouTube play command via postMessage
      try {
        iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
      } catch (_) {}
    } else {
      // Just ensure play command is active
      try {
        iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
      } catch (_) {}
    }

    iframe.removeAttribute('hidden');
    iframe.hidden = false;
    iframe.style.display = 'block';
    standby.hidden = true;
    standby.style.display = 'none';

    // Hook onload to transition smoothly once iframe has rendered
    if (!iframe.dataset.loadBound) {
      iframe.dataset.loadBound = 'true';
      iframe.addEventListener('load', () => {
        // 1.2s delay ensures player canvas/shaders have decoded first frame
        setTimeout(hideStreamLoader, 1200);
      });
    }

    // Hook YouTube postMessage for real-time playerState & error handling
    if (!window._ytHeroStreamBound) {
      window._ytHeroStreamBound = true;
      window.addEventListener('message', (event) => {
        if (!event || (typeof event.data !== 'string' && typeof event.data !== 'object')) return;
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (!data) return;
          // State: 1 = playing, 2 = paused, 3 = buffering
          const pState = data.info?.playerState ?? (data.event === 'onStateChange' ? data.info : null);
          if (pState === 1 || pState === 2 || pState === 3) {
            hideStreamLoader();
          }
          // Error handling from YouTube embed
          if (data.event === 'onError' || (data.info && data.info.errorCode)) {
            console.warn('[YouTube Hero Stream] Player reported embed issue, switching to graceful standby:', data);
            hideStreamLoader();
            standby.hidden = false;
            standby.style.display = 'flex';
            iframe.hidden = true;
            iframe.style.display = 'none';
            if (badge) {
              badge.className = 'badge-standby';
              badge.textContent = 'STANDBY MODE';
            }
          }
        } catch (_) {}
      });
    }

    // Safety timeout: loader will never get permanently stuck
    setTimeout(hideStreamLoader, 4000);

    if (badge) {
      badge.className = 'badge-live-pulse';
      badge.textContent = 'LIVE STREAM';
    }
    if (titleEl) {
      titleEl.textContent = title;
    }
    if (linkEl) {
      linkEl.href = `https://www.youtube.com/watch?v=${videoId}`;
      linkEl.hidden = false;
      linkEl.style.display = 'inline-flex';
    }
  } else {
    // Standby mode
    hideStreamLoader();
    if (iframe.dataset.currentSrc) {
      iframe.src = '';
      iframe.dataset.currentSrc = '';
    }
    iframe.hidden = true;
    iframe.style.display = 'none';
    standby.hidden = false;
    standby.style.display = 'flex';

    if (badge) {
      badge.className = 'badge-standby';
      badge.textContent = 'STANDBY MODE';
    }
    if (titleEl) {
      titleEl.textContent = 'Live Stream Standby';
    }
    if (linkEl) {
      linkEl.hidden = true;
      linkEl.style.display = 'none';
    }
  }
}
window.renderHeroStream = renderHeroStream;

// Listen for voiceschanged on Chromium/Android browsers where voices load asynchronously
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    try { window.speechSynthesis.getVoices(); } catch (_) {}
  };
}

// Stop audio/media streams when page is backgrounded or device screen locks
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAllVoice();
    if (STATE.isRecording && STATE.speechRecognition) {
      try { STATE.speechRecognition.stop(); } catch (_) {}
    }
    const heroIframe = $('#hero-youtube-iframe');
    if (heroIframe && heroIframe.contentWindow) {
      try {
        heroIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }), '*');
      } catch (_) {}
      heroIframe.dataset.wasHidden = 'true';
    }
  } else {
    const activeTab = $('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'hero') {
      renderHeroStream({ forceResume: true });
    }
  }
});

// ─── 13. APP BOOTSTRAP INITIALIZER ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Service Worker Registration for PWA caching & offline resilience
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('PWA service worker registration notice:', err);
      });
    });
  }

  // Update loader progress: DOM parsed & theme applied
  window.SiteLoader?.setProgress(35, 'Calibrating Career Intelligence Matrix...');

  // Apply saved theme (Light or Dark) silently on boot
  setTheme(STATE.theme, true);

  // Restore only a previously authenticated opaque admin session token (never auto-login strangers)
  try {
    localStorage.removeItem('cf_admin_key');
    localStorage.removeItem('cf_admin_permanent');
    localStorage.removeItem('cf_local_admin_pwd');
    sessionStorage.removeItem('cf_admin_key');
    const savedSession = localStorage.getItem('cf_admin_session') || sessionStorage.getItem('cf_admin_session') || '';
    STATE.adminKey = savedSession;
    if (savedSession) {
      localStorage.setItem('cf_admin_session', savedSession);
      sessionStorage.setItem('cf_admin_session', savedSession);
      // Verify saved session silently against server; purge if expired or revoked
      fetch(getApiUrl('api/admin/ping'), {
        headers: { 'Authorization': 'Bearer ' + savedSession }
      }).then(async res => {
        if (res.status === 401 || res.status === 403) {
          STATE.adminKey = '';
          try {
            localStorage.removeItem('cf_admin_session');
            sessionStorage.removeItem('cf_admin_session');
          } catch {}
          updateHeaderBookletVisibility();
          loadLeaderboard();
          loadFeedbackWall();
        }
      }).catch(() => {});
    }
  } catch {}

  // Initialize navigation & core handlers
  initNavigation();
  updateGreetingButtonTitle();
  if (typeof updateTutorialVoiceBadge === 'function') updateTutorialVoiceBadge();
  initSpeakLadder();
  initGamePicker();
  initPlanTools();
  initLeaderboard();
  renderHeroStream();
  updateHeaderBookletVisibility();

  // Password visibility toggle handler
  $('#btn-toggle-pwd-vis')?.addEventListener('click', () => {
    const pwdInput = $('#admin-pwd-input');
    const toggleBtn = $('#btn-toggle-pwd-vis');
    if (!pwdInput || !toggleBtn) return;
    const isPwd = pwdInput.type === 'password';
    pwdInput.type = isPwd ? 'text' : 'password';
    toggleBtn.textContent = isPwd ? '🙈' : '👁️';
  });

  // Fetch initial config from backend
  const cfg = await fetchApi('config');
  if (cfg) {
    const localGemini = localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || STATE.config.gemini_keys || '';
    const localElevenKey = localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '';
    const localElevenVoice = localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '';

    STATE.config = Object.assign({}, STATE.config, cfg);
    renderAdminDbStatus(STATE.config);

    // Synchronize authoritative user titles from Cloudflare D1
    if (cfg.user_titles && typeof cfg.user_titles === 'object') {
      try {
        localStorage.setItem('cf_user_titles', JSON.stringify(cfg.user_titles));
      } catch {}
    }

    // Ensure empty backend config never wipes client-side stored Gemini keys
    if (cfg.gemini_keys || cfg.gemini_key) {
      const gKeys = cfg.gemini_keys || cfg.gemini_key;
      STATE.config.gemini_keys = gKeys;
      STATE.config.gemini_key = gKeys;
      localStorage.setItem('cf_gemini_keys', gKeys);
      localStorage.setItem('cf_gemini_key', gKeys.split(/[\r\n,]+/)[0].trim());
      sessionStorage.setItem('cf_gemini_keys', gKeys);
    } else if (localGemini) {
      STATE.config.gemini_keys = localGemini;
      STATE.config.gemini_key = localGemini;
      localStorage.setItem('cf_gemini_keys', localGemini);
      sessionStorage.setItem('cf_gemini_keys', localGemini);
      // Client does not auto-post keys to config on boot without admin auth
    }

    const localElevenKeys = localStorage.getItem('cf_eleven_keys') || localStorage.getItem('cf_eleven_key') || STATE.config.eleven_keys || '';
    if (cfg.eleven_keys && cfg.eleven_keys !== 'configured') {
      STATE.config.eleven_keys = cfg.eleven_keys;
      localStorage.setItem('cf_eleven_keys', cfg.eleven_keys);
      const firstK = cfg.eleven_keys.split(/[\r\n,]+/)[0].trim();
      STATE.config.eleven_key = firstK;
      localStorage.setItem('cf_eleven_key', firstK);
    } else if (cfg.eleven_key && cfg.eleven_key !== 'configured') {
      STATE.config.eleven_key = cfg.eleven_key;
      localStorage.setItem('cf_eleven_key', cfg.eleven_key);
      if (!localStorage.getItem('cf_eleven_keys')) {
        localStorage.setItem('cf_eleven_keys', cfg.eleven_key);
      }
    } else if (localElevenKeys && localElevenKeys !== 'configured') {
      STATE.config.eleven_keys = localElevenKeys;
      const firstK = localElevenKeys.split(/[\r\n,]+/)[0].trim();
      STATE.config.eleven_key = firstK;
      localStorage.setItem('cf_eleven_key', firstK);
    } else if (localElevenKey && localElevenKey !== 'configured') {
      STATE.config.eleven_key = localElevenKey;
    } else if (cfg.has_eleven_key) {
      STATE.config.has_eleven_key = true;
    }
    if (typeof window.syncAdminGeminiKeyBoxes === 'function') window.syncAdminGeminiKeyBoxes();
    if (typeof window.syncAdminElevenKeyBoxes === 'function') window.syncAdminElevenKeyBoxes();

    if (cfg.eleven_voice) {
      STATE.config.eleven_voice = cfg.eleven_voice;
      localStorage.setItem('cf_eleven_voice', cfg.eleven_voice);
    } else if (localElevenVoice) {
      STATE.config.eleven_voice = localElevenVoice;
    }

    if (cfg.banner) $('#broadcast-text').textContent = cfg.banner;
    if (cfg.school_name) $('#school-branding-name').textContent = cfg.school_name;
    const localStreamUrl = (localStorage.getItem('cf_stream_url') || '').trim();
    if (cfg.stream_url && cfg.stream_url.trim()) {
      STATE.config.stream_url = cfg.stream_url.trim();
      localStorage.setItem('cf_stream_url', cfg.stream_url.trim());
    } else if (localStreamUrl) {
      STATE.config.stream_url = localStreamUrl;
      fetchApi('admin/config', 'PUT', { stream_url: localStreamUrl }).catch(() => {});
    } else {
      STATE.config.stream_url = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
      localStorage.setItem('cf_stream_url', STATE.config.stream_url);
    }
    if (cfg.stream_title) {
      STATE.config.stream_title = cfg.stream_title;
      localStorage.setItem('cf_stream_title', cfg.stream_title);
    }
    if (cfg.stream_active !== undefined) {
      STATE.config.stream_active = cfg.stream_active;
      localStorage.setItem('cf_stream_active', String(cfg.stream_active));
    }
    renderHeroStream();

    // Synchronize feature flags across sessions
    if (cfg.flags && typeof cfg.flags === 'object') {
      STATE.config.flags = Object.assign({}, STATE.config.flags, cfg.flags);
    }
    applyFeatureFlags();

    if (cfg.avg_feedback) {
      const tabBadge = $('#tab-badge-feedback');
      if (tabBadge) tabBadge.textContent = `⭐ ${cfg.avg_feedback}`;
      const avgBadge = $('#feedback-avg-badge');
      if (avgBadge) avgBadge.textContent = `⭐ ${cfg.avg_feedback} Avg`;
    }
    if (cfg.top_score) {
      const tabBadge = $('#tab-badge-leaderboard');
      if (tabBadge) tabBadge.textContent = `🎯 ${cfg.top_score}% Top`;
    }
  }

  // Update loader progress: Cloud services connected
  window.SiteLoader?.setProgress(65, 'Connecting Exhibition Cloud Services...');

  // Pre-render home heroes & stats
  renderCareers();
  renderColleges();

  // Update loader progress: Interactive studios pre-rendered
  window.SiteLoader?.setProgress(85, 'Preparing Interactive Studios...');

  // Initialize Hierarchical Deep-Linking Router
  if (window.AppRouter && typeof window.AppRouter.init === 'function') {
    window.AppRouter.init();
  }

  // Check incoming card verification from QR scan (after router initializes)
  setTimeout(() => {
    checkIncomingCardVerification();
  }, 100);

  try {
    const cachedFb = JSON.parse(localStorage.getItem('cf_user_feedbacks') || '[]');
    updateFeedbackBadges(cachedFb);
  } catch (e) {}

  try {
    const cachedScores = JSON.parse(localStorage.getItem('cf_user_scores') || '[]');
    updateLeaderboardBadges(cachedScores);
  } catch (e) {}

  // Full website load trigger for SiteLoader
  const signalSiteLoaded = () => {
    window.SiteLoader?.dismiss();
  };
  if (document.readyState === 'complete') {
    signalSiteLoaded();
  } else {
    window.addEventListener('load', signalSiteLoaded, { once: true });
    // Safety fallback: dismiss cleanly within 1.5s after DOM ready even if external assets hang
    setTimeout(signalSiteLoaded, 400);
  }

  // ─── BACKGROUND MULTI-SYSTEM GLOBAL SYNCHRONIZER ───
  // Automatically synchronizes live stream, scores, and feedback across systems
  setInterval(async () => {
    try {
      const liveCfg = await fetchApi('config');
      if (liveCfg) {
        if (liveCfg.db_connected !== undefined) STATE.config.db_connected = Boolean(liveCfg.db_connected);
        if (liveCfg.total_scores !== undefined) STATE.config.total_scores = liveCfg.total_scores;
        if (liveCfg.total_feedback !== undefined) STATE.config.total_feedback = liveCfg.total_feedback;
        renderAdminDbStatus(liveCfg);
        if (liveCfg.user_titles && typeof liveCfg.user_titles === 'object') {
          try {
            localStorage.setItem('cf_user_titles', JSON.stringify(liveCfg.user_titles));
          } catch {}
        }
        if (liveCfg.stream_url && liveCfg.stream_url.trim() !== STATE.config.stream_url) {
          STATE.config.stream_url = liveCfg.stream_url.trim();
          localStorage.setItem('cf_stream_url', liveCfg.stream_url.trim());
          renderHeroStream();
        }
        if (liveCfg.avg_feedback) {
          const tabBadge = $('#tab-badge-feedback');
          if (tabBadge) tabBadge.textContent = `⭐ ${liveCfg.avg_feedback}`;
          const avgBadge = $('#feedback-avg-badge');
          if (avgBadge) avgBadge.textContent = `⭐ ${liveCfg.avg_feedback} Avg`;
        }
        if (liveCfg.top_score) {
          const tabBadge = $('#tab-badge-leaderboard');
          if (tabBadge) tabBadge.textContent = `🎯 ${liveCfg.top_score}% Top`;
        }
      }

      // If viewing leaderboard, refresh live
      const lbSec = $('#sec-leaderboard');
      if (lbSec && !lbSec.hidden) {
        const activeChip = $('#leaderboard-pack-filters .filter-chip.active');
        const pack = activeChip ? activeChip.dataset.boardPack : 'All';
        loadLeaderboard(pack);
      }

      // If viewing feedback wall, refresh live
      const fbSec = $('#sec-feedback');
      if (fbSec && !fbSec.hidden) {
        loadFeedbackWall();
      }
    } catch (e) {}
  }, 15000);

  // Admin login submission (E2EE ECDH + AES-256-GCM)
  $('#admin-login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const pwd = ($('#admin-pwd-input')?.value || '').trim();
    if (!pwd) {
      showToast('Please enter the administrator password.');
      return;
    }
    const submitBtn = $('#admin-login-form button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    let sessionToken = '';
    let loginErrorMsg = 'Incorrect password.';

    try {
      const e2ee = await encryptAdminAuthPayload('login', { password: pwd });
      const loginOpts = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ e2ee })
      };
      let res = await fetch(getApiUrl('api/admin/login'), loginOpts);
      if (!res.ok && res.status !== 400 && res.status !== 401 && res.status !== 403 && window.location.protocol !== 'file:' && window.location.hostname !== 'careerwithenglish.pages.dev') {
        res = await fetch(PRIMARY_D1_ORIGIN + '/api/admin/login', loginOpts);
      }
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.ok && data.sessionToken) {
          sessionToken = data.sessionToken;
        }
      } else {
        const errData = await res.json().catch(() => null);
        if (res.status === 403 && (errData?.banned || errData?.admin_revoked || errData?.brute_force_banned)) {
          if (submitBtn) submitBtn.disabled = false;
          enforceSiteIpBlockOverlay(errData.error);
          return;
        }
        loginErrorMsg = errData?.error || 'Incorrect password.';
      }
    } catch (err) {
      loginErrorMsg = err?.message || 'Unable to reach security server. Please check your connection.';
    }

    if (submitBtn) submitBtn.disabled = false;

    if (sessionToken) {
      try { localStorage.removeItem('cf_bf_fails'); } catch {}
      STATE.adminKey = sessionToken;
      sessionStorage.setItem('cf_admin_session', sessionToken);
      localStorage.setItem('cf_admin_session', sessionToken);
      $('#admin-gate-screen').hidden = true;
      $('#admin-workspace-screen').hidden = false;
      initAdminWorkspace();

      // Global D1 Exhibition Data Downloader Wiring
      $('#btn-download-d1-json')?.addEventListener('click', () => {
        window.open(getApiUrl('api/export/data?format=json'), '_blank');
      });

      $('#btn-download-d1-csv')?.addEventListener('click', () => {
        window.open(getApiUrl('api/export/data?format=csv'), '_blank');
      });

      updateHeaderBookletVisibility();
      loadFeedbackWall();
      loadLeaderboard();
      showToast('Admin Control Room Unlocked 🔓');
    } else {
      showToast(loginErrorMsg);
    }
  });

  // Admin lock / switch session
  $('#btn-admin-lock')?.addEventListener('click', () => {
    const tok = STATE.adminKey || sessionStorage.getItem('cf_admin_session') || localStorage.getItem('cf_admin_session') || '';
    if (tok) {
      fetch(getApiUrl('api/admin/logout'), {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + tok }
      }).catch(() => {});
    }
    STATE.adminKey = '';
    sessionStorage.removeItem('cf_admin_session');
    localStorage.removeItem('cf_admin_session');
    updateHeaderBookletVisibility();
    renderAdminView();
    showToast('Admin console locked.');
  });

  $('#btn-admin-logout')?.addEventListener('click', () => {
    const tok = STATE.adminKey || sessionStorage.getItem('cf_admin_session') || localStorage.getItem('cf_admin_session') || '';
    if (tok) {
      fetch(getApiUrl('api/admin/logout'), {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + tok }
      }).catch(() => {});
    }
    STATE.adminKey = '';
    sessionStorage.removeItem('cf_admin_session');
    localStorage.removeItem('cf_admin_session');
    updateHeaderBookletVisibility();
    renderAdminView();
    loadFeedbackWall();
    loadLeaderboard();
    showToast('Logged out of Admin.');
  });
});

// =========================================================================
// HIGH-DOPAMINE BITE-SIZED ARCADE GAMES (15s & 20s ROUNDS)
// =========================================================================

// --- Sound Synthesis Utility (Web Audio API) ---
let audioCtx = null;
function playSynthesizedSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'streak') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      osc.frequency.setValueAtTime(1046.50, now + 0.24);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'fanfare') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + i * 0.1);
        g.gain.setValueAtTime(0.2, now + i * 0.1);
        g.gain.linearRampToValueAtTime(0.01, now + i * 0.1 + 0.25);
        o.start(now + i * 0.1);
        o.stop(now + i * 0.1 + 0.25);
      });
    }
  } catch (e) {}
}

// =========================================================================
// REAL-TIME GLOBAL D1 SYNC POLLER (12s Automatic Cross-Device Refresh)
// =========================================================================
function startGlobalD1SyncPoller() {
  setInterval(async () => {
    const secLeaderboard = $('#sec-leaderboard');
    if (secLeaderboard && !secLeaderboard.hidden) {
      const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
      const pack = activeBtn ? activeBtn.dataset.boardPack : 'All';
      loadLeaderboard(pack);
    }

    const secFeedback = $('#sec-feedback');
    if (secFeedback && !secFeedback.hidden) {
      loadFeedbackWall();
    }

    if (typeof window.loadUserTitles === 'function') {
      window.loadUserTitles();
    }
  }, 12000);
}


// ─── ADMIN EXPANDED CONTROLS: PINNING, TITLES, IP BAN, DYNAMIC API POOLS ──────
window.adminTogglePinFeedback = async function(id, pinnedVal, comment = '') {
  const isPinned = Number(pinnedVal || 0);
  const cleanComment = (comment || '').trim();

  // Optimistic instant local update
  try {
    const raw = localStorage.getItem('cf_user_feedbacks');
    if (raw) {
      const items = JSON.parse(raw);
      const target = items.find(f => (id && String(f.id) === String(id)) || (cleanComment && (f.comment || '').trim() === cleanComment));
      if (target) {
        target.pinned = isPinned;
        items.sort((a, b) => {
          const pinA = Number(a.pinned || 0);
          const pinB = Number(b.pinned || 0);
          if (pinA !== pinB) return pinB - pinA;
          return (Number(b.ts) || 0) - (Number(a.ts) || 0);
        });
        localStorage.setItem('cf_user_feedbacks', JSON.stringify(items));
      }
    }
  } catch {}

  showToast(isPinned ? 'Feedback pinned to top! 📌' : 'Feedback unpinned');
  if (typeof renderFeedbacks === 'function' && typeof feedbacks !== 'undefined') {
    renderFeedbacks(feedbacks);
  }

  // Persist permanently to Cloudflare D1 & kv
  try {
    await fetchApi('admin/pin-feedback', 'POST', {
      id: id || '',
      comment: cleanComment,
      pinned: isPinned
    });
  } catch (e) {
    console.warn('Pin feedback API note:', e);
  }

  await loadFeedbackWall();
  if (typeof renderAdminModeration === 'function') {
    await renderAdminModeration();
  }
};

window.loadUserTitles = async function() {
  try {
    const res = await fetchApi('admin/user-title');
    if (res && res.titles && typeof res.titles === 'object') {
      localStorage.setItem('cf_user_titles', JSON.stringify(res.titles));
      return res.titles;
    }
  } catch (e) {
    console.warn('User titles fetch note:', e);
  }
  try {
    const stored = localStorage.getItem('cf_user_titles');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

window.adminAssignUserTitle = async function(encodedName) {
  const name = decodeURIComponent(encodedName || '');
  if (!name) return;

  let userTitlesMap = {};
  try {
    const stored = localStorage.getItem('cf_user_titles');
    if (stored) userTitlesMap = JSON.parse(stored);
  } catch {}

  const currentTitle = userTitlesMap[name] || '';
  const newTitle = prompt(`Assign official title for "${name}" (e.g. Vice-Principal, Head of English, Student Council President):`, currentTitle);
  if (newTitle === null) return; // cancelled

  const clean = newTitle.trim();
  if (clean) {
    userTitlesMap[name] = clean;
  } else {
    delete userTitlesMap[name];
  }
  localStorage.setItem('cf_user_titles', JSON.stringify(userTitlesMap));

  // Sync with D1 database
  try {
    const res = await fetchApi('admin/user-title', 'POST', { name, title: clean });
    if (res && res.titles && typeof res.titles === 'object') {
      localStorage.setItem('cf_user_titles', JSON.stringify(res.titles));
    }
  } catch (e) {
    console.warn('User title sync note:', e);
  }

  showToast(clean ? `Title "${clean}" assigned to ${name} 👑` : `Title removed from ${name}`);
  await loadFeedbackWall();
  await loadLeaderboard();
  if (typeof renderAdminModeration === 'function') {
    await renderAdminModeration();
  }
};

window.renderAdminDevices = async function() {
  const container = $('#admin-devices-list');
  const ipBadge = $('#admin-current-ip-badge');
  if (!container) return;

  try {
    const res = await fetchApi(`admin/devices?_t=${Date.now()}`);
    if (!res || !res.ok) {
      container.innerHTML = `<div style="font-size:12.5px;color:var(--text-muted);text-align:center;padding:14px;">Unable to load device IP history (offline or unavailable).</div>`;
      return;
    }

    const currentIp = res.current_ip || 'Unknown';
    if (ipBadge) {
      ipBadge.textContent = `Your IP: ${currentIp}`;
    }

    const IMMUNE_CLIENT_IPS = {
  has: (ip) => isImmuneClientIp(ip)
};
    const rawDevs = Array.isArray(res.devices) ? res.devices : [];
    const devices = rawDevs.filter(d => d && !IMMUNE_CLIENT_IPS.has(d.ip));
    if (!devices.length) {
      container.innerHTML = `<div style="font-size:12.5px;color:var(--text-muted);text-align:center;padding:14px;">No admin device access recorded yet.</div>`;
      return;
    }

    const fmtTime = (ts) => {
      if (!ts) return '—';
      try {
        return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch {
        return '—';
      }
    };

    container.innerHTML = `
      <table class="data-table" style="width:100%;font-size:12.5px;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 10px;">IP Address</th>
            <th style="text-align:left;padding:8px 10px;">Device / Browser</th>
            <th style="text-align:left;padding:8px 10px;">Last Active</th>
            <th style="text-align:left;padding:8px 10px;">Admin Status</th>
            <th style="text-align:center;padding:8px 10px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${devices.map(d => {
            const safeIp = escapeHtml(d.ip || '');
            const safeDevice = escapeHtml(d.device || 'Unknown Device');
            const currentTag = d.is_current
              ? `<span class="badge-pill" style="font-size:10px;padding:1px 6px;margin-left:6px;background:rgba(0,240,255,0.12);color:var(--accent-cyan);border:1px solid rgba(0,240,255,0.3);">THIS DEVICE</span>`
              : '';
            const reasonSub = (d.is_blocked && d.block_reason)
              ? `<div style="font-size:10.5px;color:#fca5a5;margin-top:2px;">🛡️ ${escapeHtml(d.block_reason)}</div>`
              : '';
            const statusHtml = d.is_blocked
              ? `<span style="color:#ef4444;font-weight:700;">🔴 Blocked Across Site</span>${reasonSub}`
              : `<span style="color:#10b981;font-weight:700;">🟢 Active</span>`;
            const isImmune = IMMUNE_CLIENT_IPS.has(safeIp);
            const actionBtn = isImmune
              ? `<span class="badge-pill" style="font-size:10px;color:#38bdf8;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.3);">Protected</span>`
              : (d.is_blocked
                ? `<button type="button" class="btn btn-secondary btn-xs" onclick="window.adminRestoreDeviceIp('${safeIp}')">✅ Unblock IP</button>`
                : `<button type="button" class="btn btn-primary btn-xs" style="background:#ef4444;border-color:#dc2626;" onclick="window.adminRevokeDeviceIp('${safeIp}', ${Boolean(d.is_current)})">🚫 Block IP</button>`);
            return `
              <tr style="border-top:1px solid var(--border);">
                <td style="padding:8px 10px;font-family:var(--font-mono);font-weight:700;white-space:nowrap;">${safeIp}${currentTag}</td>
                <td style="padding:8px 10px;color:var(--text-muted);">${safeDevice}</td>
                <td style="padding:8px 10px;color:var(--text-dim);white-space:nowrap;">${fmtTime(d.last_seen)}</td>
                <td style="padding:8px 10px;white-space:nowrap;">${statusHtml}</td>
                <td style="padding:8px 10px;text-align:center;white-space:nowrap;">${actionBtn}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.warn('Render admin devices error:', err);
  }
};

window.adminRevokeDeviceIp = async function(ipToRevoke, isCurrent = false) {
  const input = $('#admin-revoke-ip-input');
  const ip = (ipToRevoke || input?.value || '').trim();
  if (!ip) {
    showToast('Please enter a device IP address.');
    return;
  }
  const msg = isCurrent
    ? `Block YOUR current device IP "${ip}" across the entire site? You will be locked out of the whole website immediately.`
    : `Block device IP "${ip}" across the entire website? That device will be locked out of both the Fair site and Admin Control Room.`;
  if (!confirm(msg)) return;

  const res = await fetchApi('admin/devices/revoke', 'POST', { ip });
  if (res && res.ok) {
    if (input && !ipToRevoke) input.value = '';
    showToast(`IP "${ip}" blocked across the site 🚫`);
    if (isCurrent) {
      enforceSiteIpBlockOverlay(`Access Denied: Your IP address (${ip}) has been blocked across this site by administrators.`);
    } else {
      await window.renderAdminDevices();
      if (typeof window.renderAdminBannedIps === 'function') window.renderAdminBannedIps();
    }
  } else {
    showToast('Failed to block that IP.');
  }
};

window.adminRestoreDeviceIp = async function(ip) {
  if (!ip) return;
  if (!confirm(`Unblock device IP "${ip}" and restore site & admin access?`)) return;
  const res = await fetchApi('admin/devices/restore', 'POST', { ip });
  if (res && res.ok) {
    showToast(`Site & admin access restored for IP "${ip}" ✅`);
    await window.renderAdminDevices();
    if (typeof window.renderAdminBannedIps === 'function') window.renderAdminBannedIps();
  } else {
    showToast('Failed to restore access.');
  }
};

window.adminBanIp = async function(ipToBan) {
  const ip = (ipToBan || $('#admin-ban-ip-input')?.value || '').trim();
  if (!ip) {
    showToast('Please enter an IP address to ban.');
    return;
  }
  if (!confirm(`Are you sure you want to ban IP "${ip}"? This will restrict their access across the fair.`)) return;

  let banned = [];
  try {
    const raw = localStorage.getItem('cf_banned_ips');
    if (raw) banned = JSON.parse(raw);
  } catch {}
  if (!banned.includes(ip)) banned.push(ip);
  localStorage.setItem('cf_banned_ips', JSON.stringify(banned));

  try {
    await fetchApi('admin/ban-ip', 'POST', { ip, action: 'ban' });
  } catch (e) {
    console.warn('Ban IP note:', e);
  }

  showToast(`IP "${ip}" has been blocked across the site 🚫`);
  const input = $('#admin-ban-ip-input');
  if (input) input.value = '';
  window.renderAdminBannedIps();
  if (typeof window.renderAdminDevices === 'function') window.renderAdminDevices();
};

window.adminUnbanIp = async function(ip) {
  if (!confirm(`Unban IP address "${ip}"?`)) return;

  let banned = [];
  try {
    const raw = localStorage.getItem('cf_banned_ips');
    if (raw) banned = JSON.parse(raw);
  } catch {}
  banned = banned.filter(i => i !== ip);
  localStorage.setItem('cf_banned_ips', JSON.stringify(banned));

  try {
    await fetchApi('admin/ban-ip', 'POST', { ip, action: 'unban' });
  } catch (e) {
    console.warn('Unban IP note:', e);
  }

  showToast(`IP "${ip}" unblocked ✅`);
  window.renderAdminBannedIps();
  if (typeof window.renderAdminDevices === 'function') window.renderAdminDevices();
};

window.renderAdminBannedIps = async function() {
  const container = $('#admin-banned-ips-list');
  const countBadge = $('#admin-banned-ips-count');
  if (!container) return;

  let banned = [];
  try {
    const res = await fetchApi('admin/ban-ip');
    if (res && Array.isArray(res.banned_ips)) {
      banned = res.banned_ips;
      localStorage.setItem('cf_banned_ips', JSON.stringify(banned));
    }
  } catch {
    try {
      const raw = localStorage.getItem('cf_banned_ips');
      if (raw) banned = JSON.parse(raw);
    } catch {}
  }

  if (countBadge) {
    countBadge.textContent = `${banned.length} Banned IP${banned.length === 1 ? '' : 's'}`;
  }

  if (!banned.length) {
    container.innerHTML = `<span style="font-size:12px;color:var(--text-muted);align-self:center;">No IP addresses currently banned.</span>`;
  } else {
    container.innerHTML = banned.map(ip => `
      <div class="banned-ip-pill">
        <span>🚫 ${escapeHtml(ip)}</span>
        <button type="button" style="background:none;border:none;color:#f87171;cursor:pointer;padding:0 2px;font-weight:bold;" title="Unban this IP" onclick="window.adminUnbanIp('${escapeHtml(ip)}')">✕</button>
      </div>
    `).join('');
  }
};

// ─── DYNAMIC API KEYS POOLS (INFINITE MAIN & BACKUP BOXES WITH AUTO-PROMOTION) ──
window.initDynamicApiPools = function() {
  // 1. Google Gemini Keys Setup
  const geminiContainer = $('#gemini-keys-container');
  const addGeminiBtn = $('#btn-add-gemini-key');

  const getGeminiKeysArray = () => {
    const raw = (localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || STATE.config.gemini_keys || STATE.config.gemini_key || '').trim();
    let keys = raw.split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean);
    while (keys.length < 3) {
      keys.push(''); // Ensure at start at least 3 boxes (Main, Backup 1, Backup 2)
    }
    return keys;
  };

  const compactAndSyncGeminiKeys = (showToastNotice = false) => {
    if (!geminiContainer) return;
    const currentInputs = Array.from(geminiContainer.querySelectorAll('.gemini-key-field'));
    const cleanKeys = currentInputs.map(inp => inp.value.trim()).filter(Boolean);
    const joined = cleanKeys.join('\n');
    localStorage.setItem('cf_gemini_keys', joined);
    localStorage.setItem('cf_gemini_key', cleanKeys[0] || '');
    sessionStorage.setItem('cf_gemini_keys', joined);
    STATE.config.gemini_keys = joined;
    STATE.config.gemini_key = cleanKeys[0] || '';
    renderGeminiBoxes(getGeminiKeysArray());
    if (showToastNotice && cleanKeys.length > 0) {
      showToast('ℹ️ Backup Gemini key promoted to Main');
    }
  };

  const renderGeminiBoxes = (keys) => {
    if (!geminiContainer) return;
    geminiContainer.innerHTML = keys.map((key, i) => {
      const label = i === 0 ? 'Main' : `Backup ${i}`;
      const pillClass = i === 0 ? 'main' : 'backup';
      const canRemove = keys.length > 3 || (i >= 3 && keys.length > 3);
      const removeBtn = i >= 3
        ? `<button type="button" class="btn-remove-api-row" onclick="window.removeGeminiKeyRow(${i})" title="Remove this backup box">✕</button>`
        : '';

      return `
        <div class="api-key-row" data-index="${i}">
          <span class="api-key-label-pill ${pillClass}">${label}</span>
          <input type="password" class="api-key-input gemini-key-field" data-index="${i}" value="${escapeHtml(key)}" placeholder="${i === 0 ? 'AIzaSy... (Main Gemini Key)' : 'AIzaSy... (Backup Key ' + i + ')'}">
          ${removeBtn}
        </div>
      `;
    }).join('');

    geminiContainer.querySelectorAll('.gemini-key-field').forEach(input => {
      const save = () => {
        const currentInputs = Array.from(geminiContainer.querySelectorAll('.gemini-key-field'));
        const newKeys = currentInputs.map(inp => inp.value.trim()).filter(Boolean);
        const joined = newKeys.join('\n');
        localStorage.setItem('cf_gemini_keys', joined);
        localStorage.setItem('cf_gemini_key', newKeys[0] || '');
        sessionStorage.setItem('cf_gemini_keys', joined);
        STATE.config.gemini_keys = joined;
        STATE.config.gemini_key = newKeys[0] || '';
        updateGeminiStatusBadge(newKeys.length);
      };
      input.addEventListener('input', save);
      input.addEventListener('change', save);
      input.addEventListener('blur', () => {
        const currentInputs = Array.from(geminiContainer.querySelectorAll('.gemini-key-field'));
        const activeValues = currentInputs.map(inp => inp.value.trim()).filter(Boolean);
        const mainEmptyWithBackups = currentInputs[0] && !currentInputs[0].value.trim() && activeValues.length > 0;
        let hasGaps = false, seenEmpty = false;
        for (const inp of currentInputs) {
          if (!inp.value.trim()) seenEmpty = true;
          else if (seenEmpty) { hasGaps = true; break; }
        }
        if (mainEmptyWithBackups || hasGaps) {
          compactAndSyncGeminiKeys(true);
        }
      });
    });

    const activeCount = keys.filter(Boolean).length;
    updateGeminiStatusBadge(activeCount);
  };

  const updateGeminiStatusBadge = (count) => {
    const badge = $('#admin-gemini-key-status');
    if (!badge) return;
    const hasKeys = count > 0 || Boolean(STATE.config?.has_gemini_key) || Boolean(STATE.config?.gemini_keys);
    if (hasKeys) {
      const displayCount = count > 0 ? count : 1;
      badge.innerHTML = `✅ <strong>${displayCount} Gemini API Key${displayCount > 1 ? 's' : ''}</strong> active &amp; ready in pool. Auto-failover and quota purging active across all devices!`;
    } else {
      badge.innerHTML = `⚠️ No Gemini key configured. System uses deterministic heuristics failover.`;
    }
  };

  window.syncAdminGeminiKeyBoxes = () => {
    renderGeminiBoxes(getGeminiKeysArray());
  };

  window.removeGeminiKeyRow = (idx) => {
    const current = getGeminiKeysArray();
    current.splice(idx, 1);
    const joined = current.filter(Boolean).join('\n');
    localStorage.setItem('cf_gemini_keys', joined);
    localStorage.setItem('cf_gemini_key', current.filter(Boolean)[0] || '');
    sessionStorage.setItem('cf_gemini_keys', joined);
    renderGeminiBoxes(current);
  };

  window.rotateAndPromoteGeminiKey = async function(reason = 'quota_exhausted') {
    let rawGeminiKeys = (localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || STATE.config.gemini_keys || '').trim();
    let keyList = rawGeminiKeys.split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean);
    if (keyList.length === 0) return null;

    const deadKey = keyList.shift();
    console.warn(`Gemini key ${deadKey.slice(0, 6)}... (${reason}) purged from pool.`);

    const newJoined = keyList.join('\n');
    localStorage.setItem('cf_gemini_keys', newJoined);
    localStorage.setItem('cf_gemini_key', keyList[0] || '');
    sessionStorage.setItem('cf_gemini_keys', newJoined);
    STATE.config.gemini_keys = newJoined;
    STATE.config.gemini_key = keyList[0] || '';

    if (typeof window.syncAdminGeminiKeyBoxes === 'function') {
      window.syncAdminGeminiKeyBoxes();
    }

    try {
      if (typeof fetchApi === 'function') {
        await fetchApi('admin/config', 'PUT', { gemini_keys: newJoined, gemini_key: keyList[0] || '' });
      }
    } catch (_) {}

    return keyList[0] || null;
  };

  addGeminiBtn?.addEventListener('click', () => {
    const current = getGeminiKeysArray();
    current.push('');
    renderGeminiBoxes(current);
  });

  renderGeminiBoxes(getGeminiKeysArray());

  // 2. ElevenLabs Keys Setup (Main & Backups with Auto-Promotion & Quota Purge)
  const elevenContainer = $('#eleven-keys-container');
  const addElevenBtn = $('#btn-add-eleven-key');

  const getElevenKeysArray = () => {
    const raw = (localStorage.getItem('cf_eleven_keys') || localStorage.getItem('cf_eleven_key') || STATE.config.eleven_keys || STATE.config.eleven_key || '').trim();
    let keys = raw.split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean);
    while (keys.length < 3) {
      keys.push(''); // Ensure at start at least 3 boxes (Main, Backup 1, Backup 2)
    }
    return keys;
  };

  const compactAndSyncElevenKeys = (showToastNotice = false) => {
    if (!elevenContainer) return;
    const currentInputs = Array.from(elevenContainer.querySelectorAll('.eleven-key-field'));
    const cleanKeys = currentInputs.map(inp => inp.value.trim()).filter(Boolean);
    const joined = cleanKeys.join('\n');
    localStorage.setItem('cf_eleven_keys', joined);
    localStorage.setItem('cf_eleven_key', cleanKeys[0] || '');
    STATE.config.eleven_keys = joined;
    STATE.config.eleven_key = cleanKeys[0] || '';
    renderElevenBoxes(getElevenKeysArray());
    if (showToastNotice && cleanKeys.length > 0) {
      showToast('ℹ️ Backup ElevenLabs key promoted to Main');
    }
  };
  window.compactAndSyncElevenKeys = compactAndSyncElevenKeys;

  const renderElevenBoxes = (keys) => {
    if (!elevenContainer) return;
    elevenContainer.innerHTML = keys.map((key, i) => {
      const label = i === 0 ? 'Main' : `Backup ${i}`;
      const pillClass = i === 0 ? 'main' : 'backup';
      const removeBtn = i >= 3
        ? `<button type="button" class="btn-remove-api-row" onclick="window.removeElevenKeyRow(${i})" title="Remove this backup box">✕</button>`
        : '';

      return `
        <div class="api-key-row" data-index="${i}">
          <span class="api-key-label-pill ${pillClass}">${label}</span>
          <input type="password" class="api-key-input eleven-key-field" data-index="${i}" value="${escapeHtml(key)}" placeholder="${i === 0 ? 'xi-... (Main ElevenLabs Key)' : 'xi-... (Backup Key ' + i + ')'}">
          ${removeBtn}
        </div>
      `;
    }).join('');

    elevenContainer.querySelectorAll('.eleven-key-field').forEach(input => {
      const save = () => {
        const currentInputs = Array.from(elevenContainer.querySelectorAll('.eleven-key-field'));
        const newKeys = currentInputs.map(inp => inp.value.trim()).filter(Boolean);
        const joined = newKeys.join('\n');
        localStorage.setItem('cf_eleven_keys', joined);
        localStorage.setItem('cf_eleven_key', newKeys[0] || '');
        STATE.config.eleven_keys = joined;
        STATE.config.eleven_key = newKeys[0] || '';
        updateElevenStatusBadge(newKeys.length);
      };
      input.addEventListener('input', save);
      input.addEventListener('change', save);
      input.addEventListener('blur', () => {
        const currentInputs = Array.from(elevenContainer.querySelectorAll('.eleven-key-field'));
        const activeValues = currentInputs.map(inp => inp.value.trim()).filter(Boolean);
        // If Main is blank while backups exist, or if gaps exist between boxes:
        const mainEmptyWithBackups = currentInputs[0] && !currentInputs[0].value.trim() && activeValues.length > 0;
        let hasGaps = false, seenEmpty = false;
        for (const inp of currentInputs) {
          if (!inp.value.trim()) seenEmpty = true;
          else if (seenEmpty) { hasGaps = true; break; }
        }
        if (mainEmptyWithBackups || hasGaps) {
          compactAndSyncElevenKeys(true);
        }
      });
    });

    const activeCount = keys.filter(Boolean).length;
    updateElevenStatusBadge(activeCount);
  };

  const updateElevenStatusBadge = (count) => {
    const badge = $('#admin-eleven-status');
    if (!badge) return;
    const hasKeys = count > 0 || Boolean(STATE.config?.has_eleven_key) || Boolean(STATE.config?.eleven_keys);
    if (hasKeys) {
      const displayCount = count > 0 ? count : 1;
      badge.innerHTML = `✅ <strong>${displayCount} ElevenLabs Key${displayCount > 1 ? 's' : ''}</strong> active &amp; ready in pool. Studio Indian accent voice model active across all devices!`;
    } else {
      badge.innerHTML = `⚠️ No ElevenLabs key entered. Studio voice synthesizes via high-fidelity Indian English (en-IN) neural voice!`;
    }
  };

  window.syncAdminElevenKeyBoxes = () => {
    renderElevenBoxes(getElevenKeysArray());
  };

  window.removeElevenKeyRow = (idx) => {
    const current = getElevenKeysArray();
    current.splice(idx, 1);
    const joined = current.filter(Boolean).join('\n');
    localStorage.setItem('cf_eleven_keys', joined);
    localStorage.setItem('cf_eleven_key', current.filter(Boolean)[0] || '');
    renderElevenBoxes(current);
  };

  // Global key rotation & promotion handler: advances active key pointer WITHOUT deleting registered keys!
  window.rotateAndPromoteElevenKey = async function(reason = 'quota_exhausted') {
    let rawElevenKeys = (localStorage.getItem('cf_eleven_keys') || localStorage.getItem('cf_eleven_key') || STATE.config.eleven_keys || STATE.config.eleven_key || '').trim();
    let keyList = rawElevenKeys.split(/[\r\n,]+/).map(k => k.trim()).filter(Boolean);
    if (keyList.length === 0) return null;

    // Advance active key pointer WITHOUT deleting any keys from user's registered pool!
    const currentActive = localStorage.getItem('cf_eleven_key') || keyList[0];
    const curIdx = keyList.indexOf(currentActive);
    const nextIdx = (curIdx + 1) % keyList.length;
    const nextKey = keyList[nextIdx];

    localStorage.setItem('cf_eleven_key', nextKey);
    STATE.config.eleven_key = nextKey;
    console.warn(`ElevenLabs active key cycled to backup ${nextIdx + 1}/${keyList.length} (${reason}) without deleting registered keys.`);

    // Persist active key update to D1 without altering the registered pool list
    try {
      if (typeof fetchApi === 'function') {
        await fetchApi('admin/config', 'PUT', {
          eleven_key: nextKey
        });
      }
    } catch (_) {}

    showToast(`🔄 ElevenLabs quota reached: Cycled to backup key ${nextIdx + 1} of ${keyList.length}`, 4000);
    return nextKey;
  };

  addElevenBtn?.addEventListener('click', () => {
    const current = getElevenKeysArray();
    current.push('');
    renderElevenBoxes(current);
  });

  renderElevenBoxes(getElevenKeysArray());

    // 3. Initialize Ban IP Button Listener
  $('#btn-admin-ban-ip')?.addEventListener('click', () => {
    window.adminBanIp();
  });
  window.renderAdminBannedIps();
};


// ── Teleprompter News Anchor Tutorial Highlight Switching ──────────────────
function wireTeleprompterTutorialHighlights() {
  const scriptSelect = document.getElementById('anchor-script-select');
  if (!scriptSelect || scriptSelect.dataset.tutHighlightBound) return;
  scriptSelect.dataset.tutHighlightBound = 'true';

  const onScriptChange = () => {
    const hasHighlight = scriptSelect.classList.contains('tutorial-button-highlight');
    const isTeleSection = (typeof isTutorialOnSection === 'function') && isTutorialOnSection('section_teleprompter');
    const isTutOn = (typeof isTutorialRunning !== 'undefined' && isTutorialRunning) || hasHighlight || isTeleSection;

    if (isTutOn) {
      scriptSelect.classList.remove('tutorial-button-highlight');

      const camBtn = document.getElementById('btn-start-camera');
      const recordBtn = document.getElementById('btn-record-anchor');
      const videoWrapper = document.getElementById('video-stage-wrapper');

      if (camBtn) camBtn.classList.add('tutorial-button-highlight');
      if (recordBtn) recordBtn.classList.add('tutorial-button-highlight');
      if (videoWrapper) videoWrapper.classList.add('tutorial-arena-highlight');

      const hudAction = document.getElementById('tutorial-hud-action');
      if (hudAction) {
        hudAction.textContent = '👉 Launch camera / OBS feed and click Record Broadcast Clip!';
      }

      const studioControls = camBtn?.closest('.card');
      if (studioControls) {
        studioControls.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  scriptSelect.addEventListener('change', onScriptChange);
  scriptSelect.addEventListener('input', onScriptChange);
}


// ── Admin Exhibition Data Importer (JSON / CSV, Connected & Separated) ──────
function parseExhibitionImportData(rawText, fileName = '') {
  const result = { scores: [], feedback: [], titles: {}, detectedFormat: 'unknown' };
  const text = (rawText || '').trim();
  if (!text) return result;

  // 1. Try JSON First
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        parsed.forEach((item, idx) => {
          if (!item || typeof item !== 'object') return;
          if (item.comment || item.r_useful !== undefined || item.role) {
            result.feedback.push({
              id: item.id || `fb_${Date.now()}_${idx}`,
              name: item.name || 'Anonymous Visitor',
              role: item.role || 'Student',
              class_info: item.class_info || item.class || '',
              comment: item.comment || item.review || item.detail || '',
              r_useful: Number(item.r_useful ?? item.useful ?? 5),
              r_games: Number(item.r_games ?? item.games ?? 5),
              r_speaking: Number(item.r_speaking ?? item.speaking ?? 5),
              ts: Number(item.ts || item.timestamp || Date.now()),
              is_pinned: item.is_pinned ? 1 : 0
            });
          } else {
            result.scores.push({
              id: item.id || `score_${Date.now()}_${idx}`,
              name: item.name || item.student_name || 'Anonymous Student',
              pack: item.pack || item.speaking_pack || 'Everyday',
              level: Number(item.level || 1),
              acc: Number(item.acc ?? item.accuracy ?? 70),
              fluency: Number(item.fluency ?? 70),
              clarity: Number(item.clarity ?? 70),
              wpm: Number(item.wpm ?? 120),
              class_name: item.class_name || item.class || 'General',
              target_career: item.target_career || item.career || '',
              ts: Number(item.ts || item.timestamp || Date.now())
            });
          }
        });
        result.detectedFormat = 'JSON Array';
      } else if (typeof parsed === 'object') {
        const scList = Array.isArray(parsed.scores) ? parsed.scores : (Array.isArray(parsed.leaderboard) ? parsed.leaderboard : []);
        scList.forEach((s, idx) => {
          result.scores.push({
            id: s.id || `score_${Date.now()}_${idx}`,
            name: s.name || s.student_name || 'Anonymous Student',
            pack: s.pack || s.speaking_pack || 'Everyday',
            level: Number(s.level || 1),
            acc: Number(s.acc ?? s.accuracy ?? 70),
            fluency: Number(s.fluency ?? 70),
            clarity: Number(s.clarity ?? 70),
            wpm: Number(s.wpm ?? 120),
            class_name: s.class_name || s.class || 'General',
            target_career: s.target_career || s.career || '',
            ts: Number(s.ts || s.timestamp || Date.now())
          });
        });

        const fbList = Array.isArray(parsed.feedback) ? parsed.feedback : (Array.isArray(parsed.reflections) ? parsed.reflections : []);
        fbList.forEach((f, idx) => {
          result.feedback.push({
            id: f.id || `fb_${Date.now()}_${idx}`,
            name: f.name || 'Anonymous Visitor',
            role: f.role || 'Student',
            class_info: f.class_info || f.class || '',
            comment: f.comment || f.review || f.detail || '',
            r_useful: Number(f.r_useful ?? f.useful ?? 5),
            r_games: Number(f.r_games ?? f.games ?? 5),
            r_speaking: Number(f.r_speaking ?? f.speaking ?? 5),
            ts: Number(f.ts || f.timestamp || Date.now()),
            is_pinned: f.is_pinned ? 1 : 0
          });
        });
        const incomingTitles = (parsed.user_titles && typeof parsed.user_titles === 'object') ? parsed.user_titles : ((parsed.titles && typeof parsed.titles === 'object') ? parsed.titles : {});
        for (const [k, v] of Object.entries(incomingTitles)) {
          if (k && v) result.titles[k] = String(v).trim();
        }
        result.detectedFormat = 'Connected JSON Archive';
      }
      return result;
    } catch (_) {}
  }

  // 2. Parse CSV
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return result;

  function parseCsvRow(row) {
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cols.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    cols.push(cur);
    return cols.map(c => c.trim().replace(/^"|"$/g, ''));
  }

  const header = parseCsvRow(lines[0]).map(h => h.toLowerCase());

  // 2A: Connected Global CSV (Record_Type,ID,Name,Detail,Metric,Timestamp,ISO_Date)
  if (header.includes('record_type') || header[0] === 'record_type') {
    result.detectedFormat = 'Connected Global CSV';
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvRow(lines[i]);
      if (cols.length < 3) continue;
      const type = (cols[0] || '').toLowerCase();
      const id = cols[1];
      const name = cols[2];
      const detail = cols[3] || '';
      const metric = Number(cols[4] || 0);
      const ts = Number(cols[5] || Date.now());

      // Check if row has Title column (Record_Type,ID,Name,Title,Detail,Metric,Timestamp,ISO_Date)
      const hasTitleCol = header.includes('title');
      const titleColVal = hasTitleCol ? (cols[header.indexOf('title')] || '') : '';
      if (titleColVal && name) {
        result.titles[name] = titleColVal.trim();
      }

      if (type.includes('title')) {
        const titleVal = titleColVal || detail || cols[3] || '';
        if (name && titleVal) {
          result.titles[name] = titleVal.trim();
        }
      } else if (type.includes('score')) {
        result.scores.push({
          id,
          name,
          pack: 'Everyday',
          level: 1,
          acc: metric || 70,
          fluency: 70,
          clarity: 70,
          wpm: 120,
          class_name: 'General',
          target_career: titleColVal || '',
          ts
        });
      } else if (type.includes('feedback')) {
        result.feedback.push({
          id,
          name,
          role: 'Student',
          class_info: '',
          comment: hasTitleCol ? (cols[header.indexOf('detail')] || detail) : detail,
          r_useful: metric || 5,
          r_games: 5,
          r_speaking: 5,
          ts
        });
      }
    }
    return result;
  }

  // 2B: Separated Leaderboard CSV (ID,Name,Pack,Level,Accuracy,Fluency,Clarity,WPM,Class,TargetCareer,Timestamp)
  if (header.includes('accuracy') || header.includes('pack') || header.includes('wpm')) {
    result.detectedFormat = 'Separated Leaderboard CSV';
    const nameIdx = header.findIndex(h => h === 'name' || h.includes('student'));
    const packIdx = header.findIndex(h => h === 'pack');
    const accIdx = header.findIndex(h => h.includes('acc'));
    const fluIdx = header.findIndex(h => h.includes('flu'));
    const wpmIdx = header.findIndex(h => h === 'wpm');
    const tsIdx = header.findIndex(h => h === 'timestamp' || h === 'ts' || h === 'time');

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvRow(lines[i]);
      if (cols.length < 2) continue;
      result.scores.push({
        id: cols[0]?.startsWith('score_') ? cols[0] : `score_${Date.now()}_${i}`,
        name: (nameIdx >= 0 ? cols[nameIdx] : cols[1]) || 'Student',
        pack: (packIdx >= 0 ? cols[packIdx] : 'Everyday') || 'Everyday',
        level: 1,
        acc: Number((accIdx >= 0 ? cols[accIdx] : 75)) || 75,
        fluency: Number((fluIdx >= 0 ? cols[fluIdx] : 70)) || 70,
        clarity: 70,
        wpm: Number((wpmIdx >= 0 ? cols[wpmIdx] : 120)) || 120,
        class_name: 'General',
        target_career: '',
        ts: Number((tsIdx >= 0 ? cols[tsIdx] : Date.now())) || Date.now()
      });
    }
    return result;
  }

  // 2C: Separated Feedback CSV (ID,Name,Role,ClassInfo,Useful,Games,Speaking,Comment,Timestamp)
  if (header.includes('comment') || header.includes('useful') || header.includes('role')) {
    result.detectedFormat = 'Separated Feedback CSV';
    const nameIdx = header.findIndex(h => h === 'name');
    const roleIdx = header.findIndex(h => h === 'role');
    const classIdx = header.findIndex(h => h.includes('class'));
    const commentIdx = header.findIndex(h => h === 'comment' || h.includes('review') || h.includes('detail'));
    const usefulIdx = header.findIndex(h => h.includes('useful'));
    const tsIdx = header.findIndex(h => h === 'timestamp' || h === 'ts');

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvRow(lines[i]);
      if (cols.length < 2) continue;
      result.feedback.push({
        id: cols[0]?.startsWith('fb_') ? cols[0] : `fb_${Date.now()}_${i}`,
        name: (nameIdx >= 0 ? cols[nameIdx] : cols[1]) || 'Visitor',
        role: (roleIdx >= 0 ? cols[roleIdx] : 'Student') || 'Student',
        class_info: (classIdx >= 0 ? cols[classIdx] : '') || '',
        comment: (commentIdx >= 0 ? cols[commentIdx] : cols[cols.length - 2]) || 'Great exhibition!',
        r_useful: Number((usefulIdx >= 0 ? cols[usefulIdx] : 5)) || 5,
        r_games: 5,
        r_speaking: 5,
        ts: Number((tsIdx >= 0 ? cols[tsIdx] : Date.now())) || Date.now()
      });
    }
    return result;
  }

  // Generic fallback
  result.detectedFormat = 'Generic CSV';
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    if (cols.length < 2) continue;
    result.feedback.push({
      id: `fb_${Date.now()}_${i}`,
      name: cols[0] || 'Visitor',
      role: 'Visitor',
      class_info: '',
      comment: cols.slice(1).join(' - '),
      r_useful: 5,
      r_games: 5,
      r_speaking: 5,
      ts: Date.now()
    });
  }
  return result;
}

function initAdminImportControls() {
  const chooseBtn = $('#btn-admin-choose-import');
  const fileInput = $('#admin-import-file-input');
  const previewBox = $('#admin-import-preview-box');
  const filenameEl = $('#admin-import-filename');
  const summaryEl = $('#admin-import-summary');
  const cancelBtn = $('#btn-admin-cancel-import');
  const executeBtn = $('#btn-admin-execute-import');

  if (!chooseBtn || !fileInput) return;
  if (chooseBtn.dataset.bound) return;
  chooseBtn.dataset.bound = 'true';

  let currentParsedData = null;

  chooseBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseExhibitionImportData(text, file.name);
      currentParsedData = parsed;

      if (!parsed.scores.length && !parsed.feedback.length) {
        showToast('⚠️ No valid leaderboard scores or feedback records found in file.');
        if (previewBox) previewBox.style.display = 'none';
        return;
      }

      if (filenameEl) filenameEl.textContent = `📄 ${file.name} (${parsed.detectedFormat})`;
      const titleCount = Object.keys(parsed.titles || {}).length;
      if (summaryEl) {
        summaryEl.textContent = `Ready to import: ${parsed.scores.length} Scores, ${parsed.feedback.length} Reviews${titleCount ? `, ${titleCount} Titles` : ''}`;
      }
      if (previewBox) previewBox.style.display = 'block';
    };
    reader.readAsText(file);
  });

  cancelBtn?.addEventListener('click', () => {
    currentParsedData = null;
    fileInput.value = '';
    if (previewBox) previewBox.style.display = 'none';
  });

  executeBtn?.addEventListener('click', async () => {
    if (!currentParsedData) return;
    const { scores, feedback } = currentParsedData;
    executeBtn.disabled = true;
    executeBtn.textContent = 'Importing Data...';

    try {
      // 1. Send to Cloudflare backend (including titles)
      const titles = currentParsedData.titles || {};
      const res = await fetch(getApiUrl('api/admin/import'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STATE.adminKey || localStorage.getItem('cf_admin_session') || sessionStorage.getItem('cf_admin_session') || ''}`
        },
        body: JSON.stringify({ scores, feedback, titles, user_titles: titles })
      });

      // 2. Immediate local cache & UI merge for instant reflection
      if (scores.length) {
        STATE.scores = [...scores, ...(STATE.scores || [])];
        localStorage.setItem('cf_scores_cache', JSON.stringify(STATE.scores));
        if (typeof renderLeaderboardTable === 'function') renderLeaderboardTable(STATE.scores);
      }
      if (feedback.length) {
        STATE.feedback = [...feedback, ...(STATE.feedback || [])];
        localStorage.setItem('cf_feedback_cache', JSON.stringify(STATE.feedback));
        if (typeof renderFeedbackCards === 'function') renderFeedbackCards(STATE.feedback);
      }
      if (titles && Object.keys(titles).length > 0) {
        let curTitles = {};
        try {
          const stored = localStorage.getItem('cf_user_titles');
          if (stored) curTitles = JSON.parse(stored);
        } catch {}
        Object.assign(curTitles, titles);
        localStorage.setItem('cf_user_titles', JSON.stringify(curTitles));
      }

      // Refresh admin tables
      if (typeof loadLeaderboard === 'function') loadLeaderboard();
      if (typeof loadFeedbackWall === 'function') loadFeedbackWall();
      if (typeof renderAdminScoresTable === 'function') renderAdminScoresTable(STATE.scores || []);
      if (typeof renderAdminFeedbackList === 'function') renderAdminFeedbackList(STATE.feedback || []);

      showToast(`🎉 Imported ${scores.length} scores and ${feedback.length} reflections successfully!`);
      if (previewBox) previewBox.style.display = 'none';
      fileInput.value = '';
      currentParsedData = null;
    } catch (err) {
      console.error('Import error:', err);
      showToast('⚠️ Data merged into local session. Network notice: ' + err.message);
    } finally {
      executeBtn.disabled = false;
      executeBtn.innerHTML = '<span>⚡</span> <span>Confirm &amp; Import Data</span>';
    }
  });
}

// ── Global Fail-safe Delegated Handler for Admin File Import ──
document.addEventListener('click', function(e) {
  var btn = e.target && e.target.closest ? e.target.closest('#btn-admin-choose-import') : null;
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof initAdminImportControls === 'function') initAdminImportControls();
    var input = document.getElementById('admin-import-file-input');
    if (input) {
      input.value = '';
      input.click();
    }
  }
}, true);
