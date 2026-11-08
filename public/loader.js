/**
 * Career Fair 2026 - Interactive Platform Tutorial Loader
 * Provides interactive exhibition tips, dot indicators, pre-recorded audio guide,
 * and user-paced navigation ("Explore Career Fair ➔") with zero rush.
 */
(function() {
  let isDismissed = false;
  let currentTipIndex = 0;
  let userInteracted = false;

  const TUTORIAL_TIPS = [
    {
      badge: 'CAREERS',
      text: 'Explore 32+ Global Careers with AI-verified eligibility, top colleges, and admission pathways.'
    },
    {
      badge: 'SPEECH LAB',
      text: 'Practice 6D Voice Articulation with instant acoustic feedback, phoneme radar, and AI pronunciation coaching.'
    },
    {
      badge: 'TELEPROMPTER',
      text: 'Live Studio News Anchor teleprompter rehearsals with camera mirror and private local device video recordings.'
    },
    {
      badge: 'LANGUAGE ARCADE',
      text: 'Compete in 11 vocabulary, grammar, and speed-typing arcade games with OCR verification on Cloudflare D1.'
    },
    {
      badge: 'STUDENT DOSSIER',
      text: 'Generate and print an official 2-Page Career Dossier featuring your tailored roadmap and cut-out business card.'
    },
    {
      badge: 'AI GUIDE AVATAR',
      text: 'Interactive holographic avatar speaks 6 studio voices and navigates every exhibition zone at your own pace.'
    }
  ];

  function showTip(idx) {
    if (idx < 0) idx = TUTORIAL_TIPS.length - 1;
    if (idx >= TUTORIAL_TIPS.length) idx = 0;
    currentTipIndex = idx;

    const textEl = document.getElementById('loader-tutorial-text');
    if (textEl) {
      textEl.style.opacity = '0';
      textEl.style.transform = 'translateY(4px)';
      setTimeout(() => {
        textEl.textContent = TUTORIAL_TIPS[idx].text;
        textEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        textEl.style.opacity = '1';
        textEl.style.transform = 'translateY(0)';
      }, 100);
    }

    const dots = document.querySelectorAll('.loader-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
    });
  }

  let loaderFallbackAudio = null;

  function nextTip() {
    userInteracted = true;
    showTip(currentTipIndex + 1);
  }

  function prevTip() {
    userInteracted = true;
    showTip(currentTipIndex - 1);
  }

  const setProgress = (val, message) => {
    const pBar = document.getElementById('loader-progress-bar');
    const pPct = document.getElementById('loader-status-pct');
    const pMsg = document.getElementById('loader-status-msg');
    if (pBar) pBar.style.width = `${val}%`;
    if (pPct) pPct.textContent = `${Math.round(val)}%`;
    if (pMsg && message) pMsg.textContent = message;
  };

  const dismissLoader = () => {
    if (isDismissed) return;
    isDismissed = true;

    const loader = document.getElementById('site-loader');
    if (loader) {
      loader.classList.add('loader-hidden');
      loader.style.setProperty('opacity', '0', 'important');
      loader.style.setProperty('pointer-events', 'none', 'important');
      loader.style.setProperty('display', 'none', 'important');
      try { loader.remove(); } catch (_) {}
    }
  };

  function initLoaderUI() {
    const nextBtn = document.getElementById('btn-loader-next-tip');
    const prevBtn = document.getElementById('btn-loader-prev-tip');
    const enterBtn = document.getElementById('btn-loader-enter');
    const audioBtn = document.getElementById('btn-loader-tutorial-audio');
    const panel = document.getElementById('loader-tips-panel');

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextTip();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        prevTip();
      });
    }

    if (enterBtn) {
      enterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dismissLoader();
      });
    }

    if (audioBtn) {
      audioBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        userInteracted = true;
        if (typeof window.playTutorialAudio === 'function') {
          if (loaderFallbackAudio) {
            try { loaderFallbackAudio.pause(); } catch (_) {}
            loaderFallbackAudio = null;
          }
          window.playTutorialAudio();
        } else {
          // If app.js not fully loaded yet, play or toggle default audio directly
          if (loaderFallbackAudio && !loaderFallbackAudio.paused) {
            loaderFallbackAudio.pause();
            loaderFallbackAudio = null;
            audioBtn.textContent = '🔊 Listen';
            return;
          }
          loaderFallbackAudio = new Audio('/audio/tutorial/tutorial_default.mp3');
          window.currentTtsAudio = loaderFallbackAudio;
          loaderFallbackAudio.play().catch(() => {});
          audioBtn.textContent = '⏹️ Stop';
          loaderFallbackAudio.onended = () => {
            audioBtn.textContent = '🔊 Listen';
            loaderFallbackAudio = null;
          };
        }
      });
    }

    const dots = document.querySelectorAll('.loader-dot');
    dots.forEach((dot, i) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        userInteracted = true;
        showTip(i);
      });
    });

    // Touch swipe support for mobile
    if (panel) {
      let touchStartX = 0;
      panel.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          touchStartX = e.touches[0].clientX;
        }
      }, { passive: true });

      panel.addEventListener('touchend', (e) => {
        if (e.changedTouches && e.changedTouches[0]) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          if (Math.abs(deltaX) > 40) {
            userInteracted = true;
            if (deltaX < 0) nextTip();
            else prevTip();
          }
        }
      }, { passive: true });
    }

    showTip(0);
    // User controls navigation at their own pace: no auto-advancing, no auto-dismissal
  }

  window.SiteLoader = {
    setProgress,
    nextTip,
    prevTip,
    dismiss: dismissLoader
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoaderUI);
  } else {
    initLoaderUI();
  }
})();
