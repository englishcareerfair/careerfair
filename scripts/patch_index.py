with open('careerfair/public/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Bump versions to v=6.4
html = html.replace('href="styles.css?v=6.3"', 'href="styles.css?v=6.4"')
html = html.replace('src="app.js?v=6.3"', 'src="app.js?v=6.4"')

# 2. Add high-dopamine bite-sized games to game-picker-tabs
old_chips = """          <button class="filter-chip active" data-game="jobtris">🎮 Jobtris (Semantic Tetris)</button>
          <button class="filter-chip" data-game="gaming-hall">🔮 The Gaming Hall (AI Quests)</button>
          <button class="filter-chip" data-game="wordle">🟩 Wordle (6-Guess Vocabulary)</button>"""

new_chips = """          <button class="filter-chip active" data-game="jobtris">🎮 Jobtris (Semantic Tetris)</button>
          <button class="filter-chip" data-game="blitz">⚡ Word Blitz 15s (Speed Rush)</button>
          <button class="filter-chip" data-game="slap">💥 Grammar Slap 20s (Reflex Slap)</button>
          <button class="filter-chip" data-game="gaming-hall">🔮 The Gaming Hall (AI Quests)</button>
          <button class="filter-chip" data-game="wordle">🟩 Wordle (6-Guess Vocabulary)</button>"""

html = html.replace(old_chips, new_chips)

# 3. Enhance Admin Voice Settings with Free-Tier button and clear guidance
old_admin_voice = """            <select id="admin-eleven-voice-select" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;margin-bottom:6px;">
              <option value="">-- Auto-detect Best Indian Voice in Account --</option>
            </select>
            <div id="admin-eleven-voice-hint" style="font-size:11.5px;color:var(--accent-cyan);margin-bottom:6px;display:none;"></div>
            <details style="font-size:12px;color:var(--text-dim);margin-top:4px;">
              <summary style="cursor:pointer;color:var(--text-muted);font-weight:600;">Custom Voice ID Override (Advanced)</summary>
              <div style="margin-top:6px;">
                <input type="text" id="admin-eleven-voice" placeholder="e.g. EtEf6yOMlronn3UoIDrF (Ankit) or VoiceLab ID">
                <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">
                  Tip: In ElevenLabs, go to <strong>Voice Library</strong>, search <em>'Ankit'</em> or <em>'Aditi'</em>, click <strong>'Add to VoiceLab'</strong>. Community voices must be added to your VoiceLab before they can be used via API.
                </div>
              </div>
            </details>"""

new_admin_voice = """            <select id="admin-eleven-voice-select" style="width:100%;padding:8px 10px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;margin-bottom:6px;">
              <option value="">-- Auto-detect Best Studio Voice (Free Tier Compatible) --</option>
            </select>
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
              <button type="button" class="btn btn-secondary btn-xs" id="btn-quick-select-free-voice" style="font-size:11px;padding:4px 10px;border-radius:var(--radius-full);background:rgba(56,189,248,0.12);border-color:var(--accent-cyan);color:var(--accent-cyan);">⚡ Auto-Select Free-Tier Studio Voice</button>
            </div>
            <div id="admin-eleven-voice-hint" style="font-size:12px;color:var(--accent-cyan);margin-bottom:6px;display:none;background:var(--bg-subtle);padding:8px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);"></div>
            <details style="font-size:12px;color:var(--text-dim);margin-top:6px;">
              <summary style="cursor:pointer;color:var(--text-muted);font-weight:600;">Custom Voice ID Override &amp; Plan Guide</summary>
              <div style="margin-top:6px;">
                <input type="text" id="admin-eleven-voice" placeholder="e.g. JBFqnCBsd6RMkjVDRZzb (George - Free) or VoiceLab ID">
                <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px;line-height:1.45;">
                  <strong>💡 ElevenLabs Free Plan Notice:</strong> ElevenLabs restricts Community VoiceLab voices (like <em>Aditi</em> or custom shared IDs) to Paid Starter plans. On the Free tier, our server automatically auto-heals to an authentic pre-made studio voice (e.g. <em>George, Alice, Charlie</em>), or you can use high-fidelity on-device Indian English (en-IN).
                </div>
              </div>
            </details>"""

html = html.replace(old_admin_voice, new_admin_voice)

with open('careerfair/public/index.html', 'w', encoding='utf-8', newline='') as f:
    f.write(html)

print("Updated public/index.html to v6.4 with new game chips and voice settings UI")
