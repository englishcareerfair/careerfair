/**
 * English Careers Forum 2026 — Hybrid Game Completion Detector & Tesseract.js OCR
 * Seamlessly detects game completion across Jobtris, Wordle, Hangman, Blitz, Slap, etc.
 * Combines zero-latency in-memory state hooks with on-canvas OCR and interactive voice check-in.
 */

(function (window) {
  'use strict';

  let isScanning = false;
  let ocrWorker = null;
  let isCheckingIn = false;
  let lastCheckInTime = 0;
  let ocrTimer = null;
  let activeGameKey = 'jobtris';

  // Completion phrases scanned across DOM text nodes and OCR
  const COMPLETION_KEYWORDS = [
    'game over',
    'victory',
    'you won',
    'you win',
    'final score',
    'high score',
    'time up',
    'times up',
    'play again',
    'well played',
    'game complete',
    'completed'
  ];

  // ── 1. Voice & Audio Check-In Dialog ────────────────────────────────────────
  function promptGameCompletionCheck(detectedVia = 'event', score = null) {
    const now = Date.now();
    // Throttle check-in dialog to prevent annoying spam (minimum 30s between checks)
    if (isCheckingIn || (now - lastCheckInTime < 30000)) return;

    // Respect feature flag
    if (window.STATE?.config?.flags?.ocr_enabled === false) return;

    isCheckingIn = true;
    lastCheckInTime = now;

    // Play cheerful chime
    if (window.DopamineEngine && typeof window.DopamineEngine.playChime === 'function') {
      window.DopamineEngine.playChime('ding');
    }

    // Spoken voice prompt: "Awesome effort! Are you done, or would you like to keep playing?"
    const spokenPrompt = "Awesome effort! Would you like to keep playing, or move to the next exhibition?";
    if (typeof window.speak === 'function') {
      window.speak(spokenPrompt).catch(() => {});
    }

    // Create Modal
    let modal = document.getElementById('game-completion-check-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'game-completion-check-modal';
      modal.className = 'game-completion-modal-backdrop';
      document.body.appendChild(modal);
    }

    const currentScoreText = score ? `Your Current Score: <strong style="color:var(--accent-cyan);">${score} pts</strong>` : 'Great attempt!';

    modal.innerHTML = `
      <div class="game-completion-card">
        <div class="gc-icon">🎮</div>
        <h3 class="gc-title">Awesome Effort!</h3>
        <p class="gc-subtitle">
          ${currentScoreText}<br>
          Would you like to keep playing this challenge, or are you ready for the next exhibition?
        </p>

        <div class="gc-detected-tag">
          <span>⚡ Detected via: ${detectedVia === 'ocr' ? 'Tesseract.js Canvas OCR' : 'Live Game State Engine'}</span>
        </div>

        <div class="gc-actions">
          <button class="btn btn-secondary" id="btn-gc-keep-playing">
            🎮 Keep Playing
          </button>
          <button class="btn btn-primary" id="btn-gc-done-next">
            ✨ Done! Next Exhibit ➡️
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    // Button: Keep Playing
    modal.querySelector('#btn-gc-keep-playing').onclick = () => {
      modal.classList.remove('active');
      isCheckingIn = false;
      // Snooze check-in for 45s
      lastCheckInTime = Date.now() + 15000;
      if (typeof window.showToast === 'function') {
        window.showToast('🎮 Have fun! Game timer resumed.');
      }
    };

    // Button: Done! Next Exhibit
    modal.querySelector('#btn-gc-done-next').onclick = () => {
      modal.classList.remove('active');
      isCheckingIn = false;

      // Save game achievement into student profile
      if (window.STATE) {
        if (!window.STATE.studentProfile) window.STATE.studentProfile = {};
        if (!window.STATE.studentProfile.gameResults) window.STATE.studentProfile.gameResults = [];
        window.STATE.studentProfile.gameResults.push({
          game: activeGameKey,
          score: score || 'Completed',
          timestamp: Date.now()
        });
        try {
          localStorage.setItem('cf_game_results', JSON.stringify(window.STATE.studentProfile.gameResults));
        } catch (e) {}
      }

      // Celebrate with dopamine burst
      if (window.DopamineEngine) {
        window.DopamineEngine.confetti(0.5, 0.5);
        window.DopamineEngine.playChime('levelUp');
        window.DopamineEngine.unlockBadge('arcade_champ', 'Arcade Champion', '🎮');
      }

      // If Digital Guide is currently touring, advance guide tour
      if (window.DigitalHumanGuide && typeof window.DigitalHumanGuide.advanceToNextStep === 'function') {
        window.DigitalHumanGuide.advanceToNextStep();
      } else if (typeof window.switchTab === 'function') {
        // Fallback: advance to roadmap/plan
        window.switchTab('roadmap');
      }
    };
  }

  // ── 2. In-Memory State Interceptor ──────────────────────────────────────────
  function hookGameStateInterceptors() {
    // Intercept JobtrisGame game over
    const originalJobtrisDestroy = window.JobtrisGame?.prototype?.destroy;
    if (window.JobtrisGame && !window.JobtrisGame.__isHooked) {
      window.JobtrisGame.__isHooked = true;
      const originalGameOver = window.JobtrisGame.prototype.gameOver;
      if (typeof originalGameOver === 'function') {
        window.JobtrisGame.prototype.gameOver = function () {
          const res = originalGameOver.apply(this, arguments);
          promptGameCompletionCheck('state-hook', this.score);
          return res;
        };
      }
    }

    // Custom DOM event listener for custom game dispatched completions
    window.addEventListener('ecf:game_over', (e) => {
      const score = e.detail?.score || null;
      promptGameCompletionCheck('event', score);
    });

    window.addEventListener('ecf:game_complete', (e) => {
      const score = e.detail?.score || null;
      promptGameCompletionCheck('event', score);
    });
  }

  // ── 3. DOM & Canvas Tesseract.js OCR Scanner ────────────────────────────────
  async function initOcrEngine() {
    if (ocrWorker) return ocrWorker;
    if (typeof window.Tesseract !== 'undefined') {
      try {
        ocrWorker = await window.Tesseract.createWorker('eng');
      } catch (e) {
        console.warn('Tesseract worker initialization notice:', e);
      }
    }
    return ocrWorker;
  }

  async function scanGameCanvasWithOCR() {
    // Only scan if on games tab and OCR is enabled
    if (window.STATE?.activeTab !== 'games' && !document.getElementById('sec-games')?.classList.contains('active')) {
      return;
    }
    if (window.STATE?.config?.flags?.ocr_enabled === false) return;
    if (isCheckingIn || isScanning) return;

    const mount = document.getElementById('game-arena-mount');
    if (!mount) return;

    // 1. Fast DOM text search first (0ms latency check)
    const textContent = (mount.innerText || mount.textContent || '').toLowerCase();
    for (const kw of COMPLETION_KEYWORDS) {
      if (textContent.includes(kw)) {
        promptGameCompletionCheck('dom-text');
        return;
      }
    }

    // 2. Scan active canvas using Tesseract OCR if available
    const canvas = mount.querySelector('canvas');
    if (!canvas || canvas.width < 10 || canvas.height < 10) return;

    isScanning = true;
    try {
      // Downscale and preprocess for fast, reliable OCR
      const tempCv = document.createElement('canvas');
      const scale = Math.min(1, 400 / Math.max(canvas.width, canvas.height));
      tempCv.width = Math.round(canvas.width * scale);
      tempCv.height = Math.round(canvas.height * scale);
      const tCtx = tempCv.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(canvas, 0, 0, tempCv.width, tempCv.height);
        const worker = await initOcrEngine();
        if (worker) {
          const ret = await worker.recognize(tempCv);
          const recognizedText = (ret?.data?.text || '').toLowerCase();
          for (const kw of COMPLETION_KEYWORDS) {
            if (recognizedText.includes(kw)) {
              promptGameCompletionCheck('ocr');
              break;
            }
          }
        }
      }
    } catch (e) {
      // OCR scan notice
    } finally {
      isScanning = false;
    }
  }

  function startContinuousMonitoring() {
    hookGameStateInterceptors();
    if (ocrTimer) clearInterval(ocrTimer);
    ocrTimer = setInterval(scanGameCanvasWithOCR, 4500);
  }

  function setActiveGame(key) {
    activeGameKey = key;
    hookGameStateInterceptors();
  }

  // Auto-init on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startContinuousMonitoring);
  } else {
    startContinuousMonitoring();
  }

  // Export
  window.GameCompletionDetector = {
    checkIn: promptGameCompletionCheck,
    showCheckIn: promptGameCompletionCheck,
    setActiveGame: setActiveGame,
    scanNow: scanGameCanvasWithOCR,
    init: startContinuousMonitoring
  };

})(window);
