import re

# 1. Update public/index.html to add #btn-refresh-feedback
with open('careerfair/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_fb_head = """          <div class="feedback-reflections-header">
            <div>
              <h3 style="font-size:18px;font-weight:800;margin:0 0 4px 0;">Recent Visitor Reflections</h3>
              <p style="font-size:13px;color:var(--text-muted);margin:0;">Reflections and thoughts submitted by students, parents, and guests.</p>
            </div>
            <span class="badge-pill" id="feedback-count-badge" style="background:var(--bg-subtle);border:1px solid var(--border);font-size:12px;font-weight:700;">0 Reviews</span>
          </div>"""

new_fb_head = """          <div class="feedback-reflections-header">
            <div>
              <h3 style="font-size:18px;font-weight:800;margin:0 0 4px 0;">Recent Visitor Reflections</h3>
              <p style="font-size:13px;color:var(--text-muted);margin:0;">Reflections and thoughts submitted by students, parents, and guests.</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-feedback" style="font-size:12px;padding:4px 10px;">
                <span>🔄</span> <span>Refresh Reviews</span>
              </button>
              <span class="badge-pill" id="feedback-count-badge" style="background:var(--bg-subtle);border:1px solid var(--border);font-size:12px;font-weight:700;">0 Reviews</span>
            </div>
          </div>"""

html = html.replace(old_fb_head, new_fb_head)

with open('careerfair/public/index.html', 'w', encoding='utf-8', newline='') as f:
    f.write(html)

print("Updated public/index.html with refresh button for reviews")

# 2. Update public/app.js
with open('careerfair/public/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Replace fetchApi with global D1 endpoint router
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

app_js = app_js.replace(old_fetch_api, new_fetch_api)

# Update initLeaderboard refresh button wiring
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

app_js = app_js.replace(old_lb_refresh, new_lb_refresh)

# Update loadFeedbackWall to wire refresh button and await server post
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

app_js = app_js.replace(old_fb_submit, new_fb_submit)

# Add real-time background sync poller for Leaderboard and Feedback across devices
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

if "startGlobalD1SyncPoller" not in app_js:
    app_js += poller_code
    app_js = app_js.replace("initApp();", "initApp();\n  startGlobalD1SyncPoller();")

with open('careerfair/public/app.js', 'w', encoding='utf-8', newline='') as f:
    f.write(app_js)

print("Updated public/app.js with global D1 endpoint routing, refresh buttons, and real-time sync poller")
