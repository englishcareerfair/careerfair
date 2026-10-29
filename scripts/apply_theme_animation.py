import os
import sys
from pathlib import Path

# Force UTF-8 encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

script_dir = Path(__file__).resolve().parent
careerfair_root = script_dir.parent

html_path = careerfair_root / "public" / "index.html"
css_path = careerfair_root / "public" / "styles.css"
app_path = careerfair_root / "public" / "app.js"

# 1. Update index.html
with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

old_switcher = """        <!-- Interactive Theme Switcher (Light / Dark) -->
        <div class="theme-switcher" role="radiogroup" aria-label="Select visual theme">
          <button class="theme-btn active" data-theme-val="light" title="Light Corporate Mode">☀️ Light</button>
          <button class="theme-btn" data-theme-val="dark" title="Dark Corporate Mode">🌙 Dark</button>
        </div>"""

new_switcher = """        <!-- Interactive Animated Theme Switcher (Light / Dark) -->
        <div class="theme-switcher" role="radiogroup" aria-label="Select visual theme" data-active-theme="light">
          <div class="theme-switcher-slider" aria-hidden="true"></div>
          <button class="theme-btn active" data-theme-val="light" title="Light Corporate Mode" type="button">
            <span class="theme-btn-icon">☀️</span> <span class="theme-btn-text">Light</span>
          </button>
          <button class="theme-btn" data-theme-val="dark" title="Dark Corporate Mode" type="button">
            <span class="theme-btn-icon">🌙</span> <span class="theme-btn-text">Dark</span>
          </button>
        </div>"""

if old_switcher in html:
    html = html.replace(old_switcher, new_switcher)
    print("Updated index.html with sliding glider element and icon spans.")
else:
    print("Warning: old_switcher not found verbatim in index.html, searching with regex...")
    import re
    pat = r'<div class="theme-switcher"[^>]*>[\s\S]*?</div>'
    match = re.search(pat, html)
    if match:
        html = html[:match.start()] + new_switcher.strip() + html[match.end():]
        print("Replaced theme-switcher block via regex in index.html.")

with open(html_path, "w", encoding="utf-8", newline="") as f:
    f.write(html)

# 2. Update styles.css
with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

animated_theme_css = """/* =========================================================================
   ANIMATED THEME SWITCHER (Physical Sliding Pill & Micro-Animations)
   ========================================================================= */
.theme-switcher {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: var(--surface-raised, #f1f5f9);
  border: 1px solid var(--border, #cbd5e1);
  border-radius: var(--radius-full, 9999px);
  padding: 3px;
  user-select: none;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: background-color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
}

[data-theme="dark"] .theme-switcher {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.35);
}

/* Sliding Glider Pill */
.theme-switcher-slider {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(50% - 3px);
  background: #ffffff;
  border-radius: var(--radius-full, 9999px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: transform 0.38s cubic-bezier(0.34, 1.45, 0.64, 1),
              background-color 0.35s ease,
              box-shadow 0.35s ease,
              width 0.2s ease;
  pointer-events: none;
  z-index: 1;
  will-change: transform;
}

/* Dark mode position of the glider */
.theme-switcher[data-active-theme="dark"] .theme-switcher-slider {
  transform: translateX(100%);
  background: #1e293b;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45), 0 0 12px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Tactile Elastic Stretch while in transit */
.theme-switcher.theme-switching[data-active-theme="dark"] .theme-switcher-slider {
  animation: sliderElasticRight 0.38s cubic-bezier(0.34, 1.45, 0.64, 1);
}

.theme-switcher.theme-switching[data-active-theme="light"] .theme-switcher-slider {
  animation: sliderElasticLeft 0.38s cubic-bezier(0.34, 1.45, 0.64, 1);
}

@keyframes sliderElasticRight {
  0% { transform: translateX(0) scaleX(1); }
  45% { transform: translateX(50%) scaleX(1.18); }
  100% { transform: translateX(100%) scaleX(1); }
}

@keyframes sliderElasticLeft {
  0% { transform: translateX(100%) scaleX(1); }
  45% { transform: translateX(50%) scaleX(1.18); }
  100% { transform: translateX(0) scaleX(1); }
}

/* Button items (sit on top of the sliding glider) */
.theme-btn {
  position: relative;
  z-index: 2;
  background: transparent !important;
  border: none;
  padding: 5px 14px;
  border-radius: var(--radius-full, 9999px);
  color: var(--text-muted, #64748b);
  font-size: 12.5px;
  font-family: var(--font-sub);
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: color 0.25s ease, transform 0.15s ease;
  box-shadow: none !important;
  outline: none;
  flex: 1;
  text-align: center;
}

.theme-btn:active {
  transform: scale(0.93);
}

.theme-btn.active {
  color: var(--accent-brand, #2563eb);
  font-weight: 700;
}

[data-theme="dark"] .theme-btn.active {
  color: var(--accent-cyan, #38bdf8);
}

/* Icon rotation & spring pulse animations */
.theme-btn-icon {
  display: inline-block;
  font-size: 14px;
  line-height: 1;
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease, opacity 0.25s ease;
}

/* Sun spins and glows when activated */
.theme-btn[data-theme-val="light"].active .theme-btn-icon {
  transform: rotate(360deg) scale(1.18);
  filter: drop-shadow(0 0 5px rgba(245, 158, 11, 0.7));
  opacity: 1;
}

.theme-btn[data-theme-val="light"]:not(.active) .theme-btn-icon {
  transform: rotate(0deg) scale(0.92);
  opacity: 0.65;
}

/* Moon rotates into a crescent angle and glows */
.theme-btn[data-theme-val="dark"].active .theme-btn-icon {
  transform: rotate(-18deg) scale(1.18);
  filter: drop-shadow(0 0 5px rgba(129, 140, 248, 0.8));
  opacity: 1;
}

.theme-btn[data-theme-val="dark"]:not(.active) .theme-btn-icon {
  transform: rotate(0deg) scale(0.92);
  opacity: 0.65;
}
"""

old_theme_css_block = """/* Theme selector pill */
.theme-switcher {
  display: inline-flex;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  padding: 3px;
  gap: 2px;
}

.theme-btn {
  background: transparent;
  border: none;
  padding: 5px 12px;
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font-size: 12px;
  font-family: var(--font-sub);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.theme-btn.active, .theme-btn:hover {
  background: var(--surface-card);
  color: var(--text-main);
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

.theme-btn.active {
  color: var(--accent-brand);
  font-weight: 700;
}"""

if old_theme_css_block in css:
    css = css.replace(old_theme_css_block, animated_theme_css)
    print("Replaced static theme switcher CSS with animated sliding pill CSS.")
else:
    print("Warning: old_theme_css_block not found verbatim, appending animated CSS.")
    css += "\n" + animated_theme_css

with open(css_path, "w", encoding="utf-8", newline="") as f:
    f.write(css)

# 3. Update app.js
with open(app_path, "r", encoding="utf-8") as f:
    app_js = f.read()

old_set_theme = """function setTheme(themeName) {
  const mode = (themeName === 'dark' || themeName === 'cinematic') ? 'dark' : 'light';
  STATE.theme = mode;
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('cf_theme', mode);

  const metaTheme = $('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', mode === 'dark' ? '#0c0d10' : '#f8fafc');
  }

  $$('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeVal === mode);
  });
  showToast(`Switched to ${mode === 'dark' ? 'Dark' : 'Light'} mode`);
}"""

new_set_theme = """function setTheme(themeName) {
  const mode = (themeName === 'dark' || themeName === 'cinematic') ? 'dark' : 'light';
  STATE.theme = mode;

  // Trigger slider animation and elastic stretch on switcher container
  const switcher = $('.theme-switcher');
  if (switcher) {
    switcher.setAttribute('data-active-theme', mode);
    switcher.classList.remove('theme-switching');
    // Force DOM reflow to re-trigger CSS keyframe animation smoothly
    void switcher.offsetWidth;
    switcher.classList.add('theme-switching');
    setTimeout(() => switcher.classList.remove('theme-switching'), 420);
  }

  const applyDomTheme = () => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('cf_theme', mode);

    const metaTheme = $('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', mode === 'dark' ? '#0c0d10' : '#f8fafc');
    }

    $$('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeVal === mode);
    });
  };

  // Modern View Transition API for smooth screen cross-fade if supported
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(applyDomTheme);
  } else {
    applyDomTheme();
  }

  showToast(`Switched to ${mode === 'dark' ? 'Dark' : 'Light'} mode`);
}"""

if old_set_theme in app_js:
    app_js = app_js.replace(old_set_theme, new_set_theme)
    print("Updated setTheme in app.js with animated switcher trigger and view transitions.")
else:
    print("Warning: old_set_theme not found verbatim in app.js.")

with open(app_path, "w", encoding="utf-8", newline="") as f:
    f.write(app_js)

print("Animated theme switch integration complete.")
