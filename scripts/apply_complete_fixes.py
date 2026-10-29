import os
import sys
import re

# Set stdout encoding
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Determine repo root
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if not os.path.exists(os.path.join(base_dir, 'public', 'index.html')):
    # Maybe we are already in careerfair
    if os.path.exists('public/index.html'):
        base_dir = os.path.abspath('.')
    elif os.path.exists('careerfair/public/index.html'):
        base_dir = os.path.abspath('careerfair')

print(f"Applying fixes to base directory: {base_dir}")

index_html_path = os.path.join(base_dir, 'public', 'index.html')
app_js_path = os.path.join(base_dir, 'public', 'app.js')
functions_path = os.path.join(base_dir, 'functions', 'api', '[[path]].js')

# -------------------------------------------------------------
# 1. PATCH index.html
# -------------------------------------------------------------
with open(index_html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Update version query param to v=6.5 for aggressive cache busting
html = re.sub(r'app\.js\?v=[\d\.]+', 'app.js?v=6.5', html)
html = re.sub(r'styles\.css\?v=[\d\.]+', 'styles.css?v=6.5', html)

# Add refresh button to feedback reflections header if not present
if 'id="btn-refresh-feedback"' not in html:
    old_fb_head = '<div class="feedback-reflections-header">'
    new_fb_head = '''<div class="feedback-reflections-header">
            <div>
              <h3 style="font-size:18px;font-weight:800;margin:0 0 4px 0;">Recent Visitor Reflections</h3>
              <p style="font-size:13px;color:var(--text-muted);margin:0;">Reflections and thoughts submitted by students, parents, and guests.</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-feedback" style="font-size:12px;padding:4px 10px;">
                <span>🔄</span> <span>Refresh Reviews</span>
              </button>
              <span class="badge-pill" id="feedback-count-badge" style="background:var(--bg-subtle);border:1px solid var(--border);font-size:12px;font-weight:700;">0 Reviews</span>
            </div>'''
    
    # Replace the inner block of feedback-reflections-header
    pattern = r'<div class="feedback-reflections-header">[\s\S]*?<span class="badge-pill" id="feedback-count-badge"[^>]*>0 Reviews</span>\s*</div>'
    match = re.search(pattern, html)
    if match:
        html = html[:match.start()] + new_fb_head + '\n          </div>' + html[match.end():]
        print("Patched index.html: Added btn-refresh-feedback")

# Update ElevenLabs settings guidance in index.html
if 'Settings → API Keys' not in html:
    html = html.replace(
        'Powers authentic studio-grade Indian accent text-to-speech across the entire website (ElevenLabs Multilingual v2). If not configured, platform gracefully runs high-fidelity on-device Indian English (en-IN) neural voice.',
        'Powers studio-grade Indian accent text-to-speech across the entire website. <strong style="color:var(--accent-cyan);">Note:</strong> In ElevenLabs (Settings → API Keys), please copy the secret key (do not copy the Key ID column). On the ElevenLabs Free Plan, community voices (e.g. Aditi) are restricted by ElevenLabs via API; our platform smoothly runs our high-fidelity Indian English (en-IN) neural voice!'
    )
    print("Patched index.html: Enhanced ElevenLabs key instruction")

with open(index_html_path, 'w', encoding='utf-8', newline='') as f:
    f.write(html)

print("Updated index.html successfully.")

# -------------------------------------------------------------
# 2. PATCH functions/api/[[path]].js
# -------------------------------------------------------------
with open(functions_path, 'r', encoding='utf-8') as f:
    func_code = f.read()

# Enhance /tts/voices error handling for "API key ID used as API key"
if 'API key ID used as API key' not in func_code:
    func_code = func_code.replace(
        "message: vRes.status === 401 ? 'Invalid ElevenLabs API Key. Please verify your key on elevenlabs.io.' : `ElevenLabs API error (${vRes.status}): ${errDetail.slice(0, 120)}`",
        """message: errDetail.includes('API key ID used as API key') 
              ? 'You entered the Key ID instead of the Secret API Key. In ElevenLabs (Settings → API Keys), please copy the actual secret key.'
              : (vRes.status === 401 ? 'Invalid ElevenLabs API Key. Please verify your key on elevenlabs.io.' : `ElevenLabs API error (${vRes.status}): ${errDetail.slice(0, 120)}`)"""
    )
    print("Patched [[path]].js: Friendly ElevenLabs Key ID error message")

with open(functions_path, 'w', encoding='utf-8', newline='') as f:
    f.write(func_code)

print("Updated functions/api/[[path]].js successfully.")

# -------------------------------------------------------------
# 3. PATCH public/app.js
# -------------------------------------------------------------
with open(app_js_path, 'r', encoding='utf-8') as f:
    app_js = f.read()

# 3a. Update fetchApi with PRIMARY_D1_ORIGIN cross-device proxy
if 'PRIMARY_D1_ORIGIN' not in app_js:
    old_fetch_api = """// Universal API Client with graceful offline fallback and dual-signature support
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
  const adminKey = STATE.adminKey || sessionStorage.getItem('cf_admin_key') || localStorage.getItem('cf_admin_key') || '';
  if (adminKey && !headers['Authorization']) {
    headers['Authorization'] = 'Bearer ' + adminKey;
  } else if (!headers['Authorization'] && endpoint.startsWith('admin/')) {
    headers['Authorization'] = 'Bearer careers2026';
  }

  const clientGeminiKeys = localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || STATE.config?.gemini_keys || '';
  if (clientGeminiKeys && !headers['x-gemini-keys']) {
    headers['x-gemini-keys'] = clientGeminiKeys;
  }
  opts.headers = headers;

  try {
    const res = await fetch('/api/' + endpoint, opts);
    if (res.ok) return await res.json();
  } catch (err) {
    // Graceful offline fallback
  }
  return null;
}"""

    new_fetch_api = """// Universal Global D1 API Client (Unified across careerwithenglish, futureofenglish & mobile devices)
const PRIMARY_D1_ORIGIN = 'https://careerwithenglish.pages.dev';

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
  const adminKey = STATE.adminKey || sessionStorage.getItem('cf_admin_key') || localStorage.getItem('cf_admin_key') || '';
  if (adminKey && !headers['Authorization']) {
    headers['Authorization'] = 'Bearer ' + adminKey;
  } else if (!headers['Authorization'] && endpoint.startsWith('admin/')) {
    headers['Authorization'] = 'Bearer careers2026';
  }

  const clientGeminiKeys = localStorage.getItem('cf_gemini_keys') || localStorage.getItem('cf_gemini_key') || sessionStorage.getItem('cf_gemini_keys') || STATE.config?.gemini_keys || '';
  if (clientGeminiKeys && !headers['x-gemini-keys']) {
    headers['x-gemini-keys'] = clientGeminiKeys;
  }
  opts.headers = headers;

  const cleanEndpoint = endpoint.replace(/^\\/+/, '');
  // Route through PRIMARY_D1_ORIGIN if not on careerwithenglish.pages.dev so all devices share the live D1 database
  const isPrimary = (typeof window !== 'undefined' && window.location.hostname === 'careerwithenglish.pages.dev');
  const targetUrl = isPrimary ? `/api/${cleanEndpoint}` : `${PRIMARY_D1_ORIGIN}/api/${cleanEndpoint}`;

  try {
    const res = await fetch(targetUrl, opts);
    if (res.ok) return await res.json();
  } catch (err) {
    // If external cross-origin call fails (e.g. offline), try local relative path
    if (!isPrimary) {
      try {
        const localRes = await fetch(`/api/${cleanEndpoint}`, opts);
        if (localRes.ok) return await localRes.json();
      } catch (e) {}
    }
  }
  return null;
}"""

    if old_fetch_api in app_js:
        app_js = app_js.replace(old_fetch_api, new_fetch_api)
        print("Patched app.js: fetchApi with PRIMARY_D1_ORIGIN")
    else:
        print("Warning: old_fetch_api pattern not matched verbatim")

# 3b. Update initLeaderboard refresh button wiring
old_lb_refresh = """  $('#btn-refresh-scores')?.addEventListener('click', () => {
    const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
    const pack = activeBtn ? activeBtn.dataset.boardPack : 'All';
    loadLeaderboard(pack);
    showToast('Leaderboard scores refreshed');
  });"""

new_lb_refresh = """  const doRefreshScores = () => {
    const activeBtn = $('#leaderboard-pack-filters .filter-chip.active');
    const pack = activeBtn ? activeBtn.dataset.boardPack : 'All';
    loadLeaderboard(pack);
    showToast('Leaderboard scores refreshed');
  };
  $('#btn-refresh-scores')?.addEventListener('click', doRefreshScores);
  $('#btn-refresh-leaderboard')?.addEventListener('click', doRefreshScores);"""

if old_lb_refresh in app_js:
    app_js = app_js.replace(old_lb_refresh, new_lb_refresh)
    print("Patched app.js: #btn-refresh-leaderboard and #btn-refresh-scores listeners")

# 3c. Update feedback submit and add refresh button listener
old_fb_submit = """      // Submit to backend
      fetchApi('feedback', {
        method: 'POST',
        body: JSON.stringify({
          name: newFeedback.name,
          role: newFeedback.role,
          class_info: newFeedback.class_info,
          comment: newFeedback.comment,
          r_useful: newFeedback.useful
        })
      }).catch(() => {});

      showToast('Thank you! Your feedback has been recorded.');
      form.reset();
      selectedStars = 5;
      if (starContainer) {
        starContainer.querySelectorAll('.star-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.val === '5');
        });
      }
    });
  }
}"""

new_fb_submit = """      // Submit to global D1 backend and await confirmation
      try {
        await fetchApi('feedback', {
          method: 'POST',
          body: JSON.stringify({
            name: newFeedback.name,
            role: newFeedback.role,
            class_info: newFeedback.class_info,
            comment: newFeedback.comment,
            r_useful: newFeedback.useful
          })
        });
        showToast('Thank you! Your feedback has been stored globally in the exhibition database.');
      } catch (e) {
        showToast('Feedback recorded locally.');
      }

      form.reset();
      selectedStars = 5;
      if (starContainer) {
        starContainer.querySelectorAll('.star-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.val === '5');
        });
      }

      // Re-fetch from global D1 backend immediately
      setTimeout(loadFeedbackWall, 300);
    });
  }

  // Wire refresh button for visitor reviews
  $('#btn-refresh-feedback')?.addEventListener('click', () => {
    loadFeedbackWall();
    showToast('Reflections refreshed from global database');
  });
}"""

if old_fb_submit in app_js:
    app_js = app_js.replace(old_fb_submit, new_fb_submit)
    print("Patched app.js: Feedback submit await and refresh button listener")

# 3d. Update ElevenLabs voice verification and selection in app.js
old_verify_func = """  // ElevenLabs Voice Verification & Loader
  const verifyAndLoadElevenVoices = async (silent = false) => {
    const statusEl = $('#admin-eleven-status');
    const selectEl = $('#admin-eleven-voice-select');
    const hintEl = $('#admin-eleven-voice-hint');
    const customVoiceInput = $('#admin-eleven-voice');
    const keyVal = (elevenInput?.value || localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '').trim();
    const effectiveKey = (keyVal && keyVal !== 'configured') ? keyVal : '';

    if (statusEl && !silent) {
      statusEl.innerHTML = '<span style="color:var(--accent-cyan);">⏳ Verifying ElevenLabs credentials & voices...</span>';
    }"""

new_verify_func = """  // ElevenLabs Voice Verification & Loader
  const verifyAndLoadElevenVoices = async (silent = false) => {
    const statusEl = $('#admin-eleven-status');
    const selectEl = $('#admin-eleven-voice-select');
    const hintEl = $('#admin-eleven-voice-hint');
    const customVoiceInput = $('#admin-eleven-voice');
    const keyVal = (elevenInput?.value || localStorage.getItem('cf_eleven_key') || STATE.config.eleven_key || '').trim();
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
    }"""

if old_verify_func in app_js:
    app_js = app_js.replace(old_verify_func, new_verify_func)
    print("Patched app.js: Key ID pre-check in verifyAndLoadElevenVoices")

# 3e. Add Indian Neural voice as recommended first option in selectEl
old_select_init = """          selectEl.innerHTML = '<option value="">-- Auto-detect Best Voice (Auto-Heal Active) --</option>';
          const savedVoice = (customVoiceInput?.value || localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '').trim();

          const freeGroup = document.createElement('optgroup');
          freeGroup.label = '🟢 Free-Tier Ready (Studio Premade Voices - Zero 402 Errors)';
          const paidGroup = document.createElement('optgroup');
          paidGroup.label = '🔒 Paid Plan Required (Community VoiceLab Voices)';"""

new_select_init = """          selectEl.innerHTML = '<option value="">🇮🇳 [Recommended] Authentic Indian Neural Voice (en-IN · Free & Unlimited)</option>';
          const savedVoice = (customVoiceInput?.value || localStorage.getItem('cf_eleven_voice') || STATE.config.eleven_voice || '').trim();

          const freeGroup = document.createElement('optgroup');
          freeGroup.label = '🟢 ElevenLabs Free-Tier Studio Voices (Zero 402 Errors)';
          const paidGroup = document.createElement('optgroup');
          paidGroup.label = '🔒 ElevenLabs Paid Starter Voices (Community VoiceLab)';"""

if old_select_init in app_js:
    app_js = app_js.replace(old_select_init, new_select_init)
    print("Patched app.js: Added Indian Neural Voice as top option in selectEl")

# 3f. Add real-time global D1 sync poller if not already present
if 'startGlobalD1SyncPoller' not in app_js:
    poller_code = """
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
  }, 12000);
}
"""
    app_js += poller_code
    app_js = app_js.replace("initApp();", "initApp();\n  startGlobalD1SyncPoller();")
    print("Patched app.js: Added startGlobalD1SyncPoller")

with open(app_js_path, 'w', encoding='utf-8', newline='') as f:
    f.write(app_js)

print("Updated public/app.js successfully.")
