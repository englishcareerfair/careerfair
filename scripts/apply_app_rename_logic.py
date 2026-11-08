import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=== Updating public/app.js with Admin Rename Functions & Buttons ===")
with open('public/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# 1. Add window.adminChangeFeedbackName and window.adminChangeScoreName right above window.adminDeleteFeedback
old_del_marker = """// ─── ADMIN MODERATION ACTIONS & DELETION HANDLERS ─────────────────────────
window.adminDeleteFeedback = async function(id, comment) {"""

new_rename_handlers = """// ─── ADMIN MODERATION ACTIONS & DELETION HANDLERS ─────────────────────────
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

window.adminDeleteFeedback = async function(id, comment) {"""

assert old_del_marker in app_js, "old_del_marker not found in app.js"
app_js = app_js.replace(old_del_marker, new_rename_handlers, 1)

# 2. Add Rename button in loadFeedbackWall adminActionsHtml
old_fb_admin_actions = """      const isAdmin = Boolean(STATE.adminKey || localStorage.getItem('cf_admin_key'));
      const adminActionsHtml = isAdmin
        ? `<div class="admin-feedback-actions">
             <button type="button" class="btn btn-sm btn-admin-feedback" title="${isPinned ? 'Unpin Reflection' : 'Pin Reflection to Top'}" """

new_fb_admin_actions = """      const isAdmin = Boolean(STATE.adminKey || localStorage.getItem('cf_admin_key'));
      const adminActionsHtml = isAdmin
        ? `<div class="admin-feedback-actions">
             <button type="button" class="btn btn-sm btn-admin-feedback" title="Change User Name (Admin)" style="background:rgba(0,240,255,0.12);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:6px;padding:3px 7px;font-size:11px;cursor:pointer;" data-id="${escapeHtml(String(f.id || ''))}" data-name="${encodeURIComponent(f.name || '')}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminChangeFeedbackName(this.dataset.id, decodeURIComponent(this.dataset.name || ''), decodeURIComponent(this.dataset.comment || ''))">
               ✏️ Rename
             </button>
             <button type="button" class="btn btn-sm btn-admin-feedback" title="${isPinned ? 'Unpin Reflection' : 'Pin Reflection to Top'}" """

assert old_fb_admin_actions in app_js, "old_fb_admin_actions not found in app.js"
app_js = app_js.replace(old_fb_admin_actions, new_fb_admin_actions, 1)

# 3. Add Rename button in renderAdminModeration for visitor reflections
old_mod_del_btn = """            <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;" data-id="${escapeHtml(String(f.id || ''))}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminDeleteFeedback(this.dataset.id, decodeURIComponent(this.dataset.comment || ''))">🗑️ Delete</button>"""

new_mod_del_btn = """            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" class="btn btn-sm" style="background:rgba(0,240,255,0.15);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;" data-id="${escapeHtml(String(f.id || ''))}" data-name="${encodeURIComponent(f.name || '')}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminChangeFeedbackName(this.dataset.id, decodeURIComponent(this.dataset.name || ''), decodeURIComponent(this.dataset.comment || ''))">✏️ Rename</button>
              <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap;" data-id="${escapeHtml(String(f.id || ''))}" data-comment="${encodeURIComponent(f.comment || '')}" onclick="window.adminDeleteFeedback(this.dataset.id, decodeURIComponent(this.dataset.comment || ''))">🗑️ Delete</button>
            </div>"""

assert old_mod_del_btn in app_js, "old_mod_del_btn not found in app.js"
app_js = app_js.replace(old_mod_del_btn, new_mod_del_btn, 1)

# 4. Add Rename button in loadLeaderboard public table
old_lb_del = """    const delBtnHtml = isAdmin
      ? `<button type="button" class="btn btn-sm" title="Delete Score Attempt (Admin)" style="margin-left:8px;padding:2px 6px;font-size:11px;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:4px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminDeleteScore(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">🗑️</button>`
      : '';"""

new_lb_del = """    const renameBtnHtml = isAdmin
      ? `<button type="button" class="btn btn-sm" title="Change Player Name (Admin)" style="margin-left:6px;padding:2px 6px;font-size:11px;background:rgba(0,240,255,0.12);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:4px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminChangeScoreName(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">✏️</button>`
      : '';
    const delBtnHtml = isAdmin
      ? `<button type="button" class="btn btn-sm" title="Delete Score Attempt (Admin)" style="margin-left:4px;padding:2px 6px;font-size:11px;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:4px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminDeleteScore(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">🗑️</button>`
      : '';"""

assert old_lb_del in app_js, "old_lb_del not found in app.js"
app_js = app_js.replace(old_lb_del, new_lb_del, 1)

# In leaderboard row, add renameBtnHtml next to delBtnHtml
old_lb_row_name = """        <td style="font-weight:700;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span>${escapeHtml(sc.name)}</span>
            ${badgeHtml}
            ${delBtnHtml}
          </div>
        </td>"""

new_lb_row_name = """        <td style="font-weight:700;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span>${escapeHtml(sc.name)}</span>
            ${badgeHtml}
            ${renameBtnHtml}
            ${delBtnHtml}
          </div>
        </td>"""

if old_lb_row_name in app_js:
    app_js = app_js.replace(old_lb_row_name, new_lb_row_name, 1)
    print("Added rename button to leaderboard rows!")
else:
    print("Notice: checking alternative pattern for lb row...")
    # Let's inspect where delBtnHtml is rendered in leaderboard row
    assert "${delBtnHtml}" in app_js, "${delBtnHtml} not found in app.js"
    app_js = app_js.replace("${delBtnHtml}", "${renameBtnHtml}${delBtnHtml}", 1)
    print("Replaced ${delBtnHtml} with ${renameBtnHtml}${delBtnHtml} in leaderboard rows!")

# 5. Add Rename button in renderAdminModeration for scores
old_scores_del_td = """            <td style="text-align:center;">
              <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:2px 8px;font-size:11.5px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminDeleteScore(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">🗑️ Delete</button>
            </td>"""

new_scores_del_td = """            <td style="text-align:center;white-space:nowrap;">
              <button type="button" class="btn btn-sm" style="background:rgba(0,240,255,0.15);color:#38bdf8;border:1px solid rgba(0,240,255,0.3);border-radius:4px;padding:2px 8px;font-size:11.5px;cursor:pointer;margin-right:4px;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminChangeScoreName(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">✏️ Rename</button>
              <button type="button" class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:4px;padding:2px 8px;font-size:11.5px;cursor:pointer;" data-id="${escapeHtml(String(sc.id || ''))}" data-name="${encodeURIComponent(sc.name || '')}" onclick="window.adminDeleteScore(this.dataset.id, decodeURIComponent(this.dataset.name || ''))">🗑️ Delete</button>
            </td>"""

assert old_scores_del_td in app_js, "old_scores_del_td not found in app.js"
app_js = app_js.replace(old_scores_del_td, new_scores_del_td, 1)

with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("SUCCESS: public/app.js updated successfully!")
