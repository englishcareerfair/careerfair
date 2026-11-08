import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== 1. Updating public/index.html (Move Feedback QR to Section Header) ===")
with open('public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_sec_feedback_head = """    <!-- ── SECTION: FEEDBACK & TESTIMONIALS ── -->
    <section class="section-shell" id="sec-feedback" hidden>
      <div class="section-head">
        <div>
          <div class="section-label">VISITOR THOUGHTS &amp; COMMUNITY VOICES</div>
          <h2 class="section-title">Fair Feedback &amp; Review Wall</h2>
        </div>
        <p class="section-desc">
          Share your reflections on the Career Fair exhibits. Your ratings and feedback help shape future student learning initiatives!
        </p>
      </div>

      <div class="feedback-container">
        <!-- 1. Leave Your Feedback (Entry Box on Top) -->
        <div class="card feedback-form-card">
          <div class="feedback-card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:240px;">
              <div class="feedback-header-icon" style="font-size:24px;">✍️</div>
              <div>
                <h3 style="font-size:19px;font-weight:800;margin:0 0 4px 0;">Leave Your Feedback</h3>
                <p style="font-size:13px;color:var(--text-muted);margin:0;">Share your experience and thoughts about the exhibits, games, and career guidance.</p>
              </div>
            </div>
            <!-- Direct QR Code for Feedback -->
            <div id="feedback-qr-mount" style="display:flex;align-items:center;gap:10px;background:var(--bg-subtle);padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;" title="Scan QR Code to open Feedback on phone">
              <div id="fb-qr-code-box" style="width:48px;height:48px;background:#ffffff;border-radius:4px;display:grid;place-items:center;overflow:hidden;padding:2px;"></div>
              <div style="font-size:11.5px;line-height:1.3;">
                <strong style="color:var(--text-main);display:block;font-size:12px;">📱 Scan & Review</strong>
                <span style="color:var(--text-muted);">Open directly on phone</span>
              </div>
            </div>
          </div>"""

new_sec_feedback_head = """    <!-- ── SECTION: FEEDBACK & TESTIMONIALS ── -->
    <section class="section-shell" id="sec-feedback" hidden>
      <div class="section-head feedback-section-head">
        <div class="feedback-head-text">
          <div class="section-label">VISITOR THOUGHTS &amp; COMMUNITY VOICES</div>
          <h2 class="section-title">Fair Feedback &amp; Review Wall</h2>
          <p class="section-desc" style="margin:6px 0 0 0;">
            Share your reflections on the Career Fair exhibits. Your ratings and feedback help shape future student learning initiatives!
          </p>
        </div>
        <!-- Moved Feedback QR Code directly to section header as requested -->
        <div id="feedback-qr-mount" class="feedback-qr-pill" title="Scan QR Code to open Feedback on phone">
          <div id="fb-qr-code-box"></div>
          <div class="feedback-qr-copy">
            <strong>📱 Scan &amp; Review</strong>
            <span>Open directly on phone</span>
          </div>
        </div>
      </div>

      <div class="feedback-container">
        <!-- 1. Leave Your Feedback (Entry Box on Top) -->
        <div class="card feedback-form-card">
          <div class="feedback-card-header" style="display:flex;align-items:center;gap:14px;">
            <div class="feedback-header-icon" style="font-size:24px;">✍️</div>
            <div>
              <h3 style="font-size:19px;font-weight:800;margin:0 0 4px 0;">Leave Your Feedback</h3>
              <p style="font-size:13px;color:var(--text-muted);margin:0;">Share your experience and thoughts about the exhibits, games, and career guidance.</p>
            </div>
          </div>"""

assert old_sec_feedback_head in html, "old_sec_feedback_head not found in index.html"
html = html.replace(old_sec_feedback_head, new_sec_feedback_head, 1)

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated public/index.html successfully!")


print("\n=== 2. Updating public/styles.css (Styles for feedback-section-head & feedback-qr-pill) ===")
with open('public/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

extra_css = """
/* Feedback Section Header QR Code Pill (Prominent Fair Scan Badge) */
.feedback-section-head {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 16px !important;
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.feedback-head-text {
  flex: 1;
  min-width: 260px;
}

.feedback-qr-pill {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  background: var(--surface-card) !important;
  padding: 8px 14px !important;
  border: 1.5px solid var(--border-strong) !important;
  border-radius: var(--radius-lg, 14px) !important;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.feedback-qr-pill:hover {
  transform: translateY(-2px);
  border-color: var(--accent-cyan, #00f0ff) !important;
  box-shadow: 0 6px 20px rgba(0, 240, 255, 0.22);
}

#fb-qr-code-box {
  width: 46px;
  height: 46px;
  background: #ffffff;
  border-radius: 6px;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 2px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
}

.feedback-qr-copy {
  font-size: 12px;
  line-height: 1.35;
}

.feedback-qr-copy strong {
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
}

.feedback-qr-copy span {
  color: var(--text-muted);
  font-size: 11px;
}
"""

if '.feedback-section-head' not in css:
    css += extra_css
    with open('public/styles.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Updated public/styles.css successfully!")
else:
    print("public/styles.css already has .feedback-section-head")


print("\n=== 3. Updating functions/api/[[path]].js (Add update-feedback-user and update-score-user) ===")
with open('functions/api/[[path]].js', 'r', encoding='utf-8') as f:
    api_js = f.read()

old_del_fb = """  if (path === '/admin/del-feedback' && method === 'POST') {
    const authCheck = await verifyAuth(request, env, db, 'manage:config', url);
    if (!authCheck.ok) return err(authCheck.error, authCheck.status);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const id = body.id;
    const comment = body.comment ? String(body.comment).trim() : '';

    // 1. Purge from in-memory cache
    GLOBAL_CACHE.feedback = (GLOBAL_CACHE.feedback || []).filter(f => {
      if (id && String(f.id).trim() === String(id).trim()) return false;
      if (comment && (f.comment || '').trim() === comment) return false;
      return true;
    });

    // 2. Purge from persistent Cloudflare D1 database
    if (db) {
      try {
        if (id && !isNaN(Number(id))) {
          await db.prepare('DELETE FROM feedback WHERE id=?').bind(Number(id)).run();
        }
        if (id) {
          await db.prepare('DELETE FROM feedback WHERE id=?').bind(String(id)).run();
        }
        if (comment) {
          await db.prepare('DELETE FROM feedback WHERE TRIM(comment)=?').bind(comment).run();
          await db.prepare('DELETE FROM feedback WHERE comment=?').bind(comment).run();
        }
      } catch (e) {
        console.warn('D1 feedback delete error:', e);
      }
    }
    return json({ ok: true, message: 'Feedback deleted' });
  }"""

new_del_fb_and_update = """  if (path === '/admin/del-feedback' && method === 'POST') {
    const authCheck = await verifyAuth(request, env, db, 'manage:config', url);
    if (!authCheck.ok) return err(authCheck.error, authCheck.status);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const id = body.id;
    const comment = body.comment ? String(body.comment).trim() : '';

    // 1. Purge from in-memory cache
    GLOBAL_CACHE.feedback = (GLOBAL_CACHE.feedback || []).filter(f => {
      if (id && String(f.id).trim() === String(id).trim()) return false;
      if (comment && (f.comment || '').trim() === comment) return false;
      return true;
    });

    // 2. Purge from persistent Cloudflare D1 database
    if (db) {
      try {
        if (id && !isNaN(Number(id))) {
          await db.prepare('DELETE FROM feedback WHERE id=?').bind(Number(id)).run();
        }
        if (id) {
          await db.prepare('DELETE FROM feedback WHERE id=?').bind(String(id)).run();
        }
        if (comment) {
          await db.prepare('DELETE FROM feedback WHERE TRIM(comment)=?').bind(comment).run();
          await db.prepare('DELETE FROM feedback WHERE comment=?').bind(comment).run();
        }
      } catch (e) {
        console.warn('D1 feedback delete error:', e);
      }
    }
    return json({ ok: true, message: 'Feedback deleted' });
  }

  // ── Admin: Rename Feedback User ──
  if (path === '/admin/update-feedback-user' && method === 'POST') {
    const authCheck = await verifyAuth(request, env, db, 'manage:config', url);
    if (!authCheck.ok) return err(authCheck.error, authCheck.status);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { id, comment, oldName, newName } = body;
    if (!newName || !newName.trim()) return err('newName is required');

    const cleanNewName = String(newName).trim().slice(0, 50);

    // Update in-memory persistent cache
    (GLOBAL_CACHE.feedback || []).forEach(f => {
      if (id && String(f.id).trim() === String(id).trim()) {
        f.name = cleanNewName;
      } else if (comment && (f.comment || '').trim() === String(comment).trim()) {
        f.name = cleanNewName;
      } else if (oldName && (f.name || '').trim().toLowerCase() === String(oldName).trim().toLowerCase()) {
        f.name = cleanNewName;
      }
    });

    // Update Cloudflare D1 database
    if (db) {
      try {
        if (id && !isNaN(Number(id))) {
          await db.prepare('UPDATE feedback SET name = ? WHERE id = ?').bind(cleanNewName, Number(id)).run();
        } else if (id) {
          await db.prepare('UPDATE feedback SET name = ? WHERE id = ?').bind(cleanNewName, String(id)).run();
        }
        if (comment) {
          await db.prepare('UPDATE feedback SET name = ? WHERE TRIM(comment) = ?').bind(cleanNewName, String(comment).trim()).run();
        }
        if (oldName) {
          await db.prepare('UPDATE feedback SET name = ? WHERE TRIM(LOWER(name)) = ?').bind(cleanNewName, String(oldName).trim().toLowerCase()).run();
        }
      } catch (e) {
        console.warn('D1 feedback name update error:', e);
      }
    }

    return json({ ok: true, message: 'User name updated', name: cleanNewName });
  }

  // ── Admin: Rename Leaderboard Player ──
  if (path === '/admin/update-score-user' && method === 'POST') {
    const authCheck = await verifyAuth(request, env, db, 'manage:config', url);
    if (!authCheck.ok) return err(authCheck.error, authCheck.status);
    let body;
    try { body = await request.json(); } catch { return err('Invalid JSON'); }
    const { id, oldName, newName } = body;
    if (!newName || !newName.trim()) return err('newName is required');

    const cleanNewName = String(newName).trim().slice(0, 50);

    // Update in-memory persistent cache
    (GLOBAL_CACHE.scores || []).forEach(s => {
      if (id && String(s.id).trim() === String(id).trim()) {
        s.name = cleanNewName;
      } else if (oldName && (s.name || '').trim().toLowerCase() === String(oldName).trim().toLowerCase()) {
        s.name = cleanNewName;
      }
    });

    // Update Cloudflare D1 database
    if (db) {
      try {
        if (id && !isNaN(Number(id))) {
          await db.prepare('UPDATE scores SET name = ? WHERE id = ?').bind(cleanNewName, Number(id)).run();
        } else if (id) {
          await db.prepare('UPDATE scores SET name = ? WHERE id = ?').bind(cleanNewName, String(id)).run();
        }
        if (oldName) {
          await db.prepare('UPDATE scores SET name = ? WHERE TRIM(LOWER(name)) = ?').bind(cleanNewName, String(oldName).trim().toLowerCase()).run();
        }
      } catch (e) {
        console.warn('D1 score name update error:', e);
      }
    }

    return json({ ok: true, message: 'Player name updated', name: cleanNewName });
  }"""

assert old_del_fb in api_js, "old_del_fb not found in [[path]].js"
api_js = api_js.replace(old_del_fb, new_del_fb_and_update, 1)

with open('functions/api/[[path]].js', 'w', encoding='utf-8') as f:
    f.write(api_js)
print("Updated functions/api/[[path]].js successfully!")
