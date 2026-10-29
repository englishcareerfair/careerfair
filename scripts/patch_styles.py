with open('careerfair/public/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update color tokens for optimal contrast (WCAG AAA compliant)
css = css.replace(
    """[data-theme="dark"], [data-theme="cinematic"] {
  --bg-canvas: #0c0d10;
  --bg-subtle: #131518;
  --surface-card: #181a1f;
  --surface-hover: #1f2227;
  --surface-raised: #242830;
  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-glow: 0 0 20px rgba(0, 0, 0, 0.6);
  --text-main: #f4f4f5;
  --text-muted: #a1a1aa;
  --text-dim: #71717a;""",
    """[data-theme="dark"], [data-theme="cinematic"] {
  --bg-canvas: #0b0c10;
  --bg-subtle: #13151b;
  --surface-card: #191c24;
  --surface-hover: #212632;
  --surface-raised: #282e3c;
  --border: rgba(255, 255, 255, 0.12);
  --border-strong: rgba(56, 189, 248, 0.4);
  --border-glow: 0 0 20px rgba(0, 0, 0, 0.7);
  --text-main: #f8fafc;
  --text-muted: #cbd5e1;
  --text-dim: #94a3b8;"""
)

css = css.replace(
    """[data-theme="light"], [data-theme="corporate"], :root {
  --bg-canvas: #f8fafc;
  --bg-subtle: #edf2f7;
  --surface-card: #ffffff;
  --surface-hover: #f1f5f9;
  --surface-raised: #ffffff;
  --border: #cbd5e1;
  --border-strong: #2563eb;
  --border-glow: 0 0 16px rgba(37, 99, 235, 0.18);
  --text-main: #0f172a;
  --text-muted: #475569;
  --text-dim: #64748b;""",
    """[data-theme="light"], [data-theme="corporate"], :root {
  --bg-canvas: #f8fafc;
  --bg-subtle: #f1f5f9;
  --surface-card: #ffffff;
  --surface-hover: #e2e8f0;
  --surface-raised: #ffffff;
  --border: #cbd5e1;
  --border-strong: #1d4ed8;
  --border-glow: 0 0 16px rgba(37, 99, 235, 0.2);
  --text-main: #090d16;
  --text-muted: #334155;
  --text-dim: #475569;"""
)

# 2. Append Mobile Perfection & High-Dopamine Game Styles
extra_css = """

/* ==========================================================================
   MOBILE RESPONSIVENESS, ERGONOMICS & HIGH-DOPAMINE GAME STYLES (v6.4)
   ========================================================================== */

/* Universal Touch & Contrast Guardrails */
button, a, input, select, textarea {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

::placeholder {
  color: var(--text-dim) !important;
  opacity: 0.85;
}

/* ── 15-SECOND WORD BLITZ (HIGH-DOPAMINE SPEED LEXICAL RUSH) ── */
.blitz-arena {
  background: var(--surface-card);
  border: 2px solid var(--accent-cyan);
  border-radius: var(--radius-lg);
  padding: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 36px rgba(0, 240, 255, 0.14);
}

.blitz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.blitz-timer-bar-wrap {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 18px;
}

.blitz-timer-bar {
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, #10b981, #00f0ff, #ff2a85);
  transition: width 0.1s linear, background 0.3s ease;
}

.blitz-hud-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: 13.5px;
  font-weight: 700;
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-main);
}

.blitz-streak-active {
  color: #fbbf24 !important;
  border-color: #fbbf24 !important;
  animation: streakFlame 0.8s infinite alternate;
}

@keyframes streakFlame {
  0% { transform: scale(1); filter: drop-shadow(0 0 2px #fbbf24); }
  100% { transform: scale(1.06); filter: drop-shadow(0 0 8px #f59e0b); }
}

.blitz-word-stage {
  text-align: center;
  padding: 24px 16px;
  margin-bottom: 18px;
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  position: relative;
}

.blitz-target-word {
  font-family: var(--font-display);
  font-size: clamp(28px, 6.5vw, 42px);
  font-weight: 800;
  color: var(--accent-cyan);
  letter-spacing: -0.01em;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.blitz-question-sub {
  font-size: 14.5px;
  color: var(--text-muted);
  font-weight: 600;
}

.blitz-choices-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.blitz-choice-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px 12px;
  min-height: 58px;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 2px solid var(--border);
  color: var(--text-main);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.blitz-choice-btn:active {
  transform: scale(0.96);
}

.blitz-choice-btn.correct-burst {
  background: rgba(16, 185, 129, 0.25) !important;
  border-color: #10b981 !important;
  color: #10b981 !important;
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
}

.blitz-choice-btn.wrong-burst {
  background: rgba(239, 68, 68, 0.25) !important;
  border-color: #ef4444 !important;
  color: #ef4444 !important;
}

/* ── 20-SECOND GRAMMAR SLAP (REFLEX SURVIVAL) ── */
.slap-arena {
  background: var(--surface-card);
  border: 2px solid var(--accent-magenta);
  border-radius: var(--radius-lg);
  padding: 22px;
  box-shadow: 0 12px 36px rgba(255, 42, 133, 0.14);
}

.slap-card-box {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 28px 20px;
  text-align: center;
  margin: 16px 0 20px;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.slap-sentence-text {
  font-size: clamp(17px, 4.4vw, 22px);
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.45;
}

.slap-buttons-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.btn-slap-valid {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  min-height: 64px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.3);
  transition: transform 0.12s ease;
}

.btn-slap-error {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  min-height: 64px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.3);
  transition: transform 0.12s ease;
}

.btn-slap-valid:active, .btn-slap-error:active {
  transform: scale(0.95);
}

/* ── MOBILE VIEWPORT REFINEMENTS (<= 640px) ── */
@media (max-width: 640px) {
  .blitz-choices-grid {
    grid-template-columns: 1fr;
  }
  
  .arc-carousel {
    height: 230px;
  }
  
  .arc-card {
    width: 210px;
    min-height: 170px;
    padding: 16px 14px;
  }
  
  .arc-card h3 {
    font-size: 15px;
  }
  
  .arc-card p {
    font-size: 11.5px;
  }
  
  .quest-arena {
    padding: 16px;
  }
  
  .quest-output-box {
    padding: 14px;
    font-size: 14px;
  }
  
  .quest-choice-btn {
    min-height: 48px;
    padding: 10px 14px;
    font-size: 13px;
  }

  /* Table Horizontal Scrolling with Finger Polish */
  .table-wrapper {
    margin: 0 -12px;
    padding: 0 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    min-width: 540px;
  }

  /* Mobile bottom actions padding to avoid home bar overlap */
  body {
    padding-bottom: calc(24px + env(safe-area-inset-bottom));
  }
}
"""

css += extra_css

with open('careerfair/public/styles.css', 'w', encoding='utf-8', newline='') as f:
    f.write(css)

print("Updated public/styles.css with contrast tokens, mobile ergonomics, and high-dopamine game styles")
