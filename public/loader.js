/**
 * Career Fair 2026 - Interactive Platform Tutorial Loader
 * Provides an active animated progress bar (0% -> 100%), smooth automated dismissal,
 * interactive exhibition tips, and instant user entry ("Explore Career Fair ➔").
 */
(function() {
  let isDismissed = false;
  let currentTipIndex = 0;
  let userInteracted = false;
  let currentProgress = 15;
  let progressTimer = null;
  let tipCycleTimer = null;

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

  function nextTip() {
    userInteracted = true;
    showTip(currentTipIndex + 1);
  }

  function prevTip() {
    userInteracted = true;
    showTip(currentTipIndex - 1);
  }

  const setProgress = (val, message) => {
    currentProgress = Math.max(currentProgress, Math.min(100, Math.round(val)));
    const pBar = document.getElementById('loader-progress-bar');
    const pPct = document.getElementById('loader-status-pct');
    const pMsg = document.getElementById('loader-status-msg');
    if (pBar) pBar.style.width = `${currentProgress}%`;
    if (pPct) pPct.textContent = `${currentProgress}%`;
    if (pMsg && message) pMsg.textContent = message;

    if (currentProgress >= 100) {
      setTimeout(dismissLoader, 200);
    }
  };

  const dismissLoader = () => {
    if (isDismissed) return;
    isDismissed = true;

    if (progressTimer) clearInterval(progressTimer);
    if (tipCycleTimer) clearInterval(tipCycleTimer);

    const loader = document.getElementById('site-loader');
    if (loader) {
      loader.classList.add('loader-hidden');
      loader.style.setProperty('transition', 'opacity 0.35s ease, transform 0.35s ease');
      loader.style.setProperty('opacity', '0', 'important');
      loader.style.setProperty('pointer-events', 'none', 'important');
      setTimeout(() => {
        try { loader.remove(); } catch (_) {}
      }, 400);
    }

    // Ensure hero live stream is rendered and playing when entering fair
    if (typeof window.renderHeroStream === 'function') {
      window.renderHeroStream();
    }
    window.dispatchEvent(new CustomEvent('siteloader:dismissed'));
  };

  function startProgressTicker() {
    const statusMessages = [
      { at: 25, msg: 'Calibrating 6D Spoken Articulation Radar...' },
      { at: 50, msg: 'Loading 32+ Global Careers & College Pathways...' },
      { at: 75, msg: 'Connecting Cloudflare D1 Intelligence...' },
      { at: 90, msg: 'Synchronizing Auditorium Live Feed...' },
      { at: 100, msg: 'Ready! Entering Career Fair 2026...' }
    ];

    setProgress(currentProgress, 'Initializing Career Intelligence Matrix...');

    progressTimer = setInterval(() => {
      if (isDismissed) {
        clearInterval(progressTimer);
        return;
      }
      if (currentProgress < 95) {
        const increment = Math.floor(Math.random() * 8) + 6; // 6-13%
        const nextVal = Math.min(95, currentProgress + increment);
        const match = statusMessages.find(m => nextVal >= m.at);
        setProgress(nextVal, match ? match.msg : null);
      }
    }, 70);
  }

  function initLoaderUI() {
    const nextBtn = document.getElementById('btn-loader-next-tip');
    const prevBtn = document.getElementById('btn-loader-prev-tip');
    const enterBtn = document.getElementById('btn-loader-enter');
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
    startProgressTicker();

    // Auto-cycle tips unless user interacted
    tipCycleTimer = setInterval(() => {
      if (!userInteracted && !isDismissed) {
        showTip(currentTipIndex + 1);
      }
    }, 3200);

    // Auto-completion on page load or after max 1.2s
    const completeAndDismiss = () => {
      setProgress(100, 'Ready! Entering Career Fair 2026...');
    };

    if (document.readyState === 'complete') {
      setTimeout(completeAndDismiss, 600);
    } else {
      window.addEventListener('load', () => setTimeout(completeAndDismiss, 400), { once: true });
      setTimeout(completeAndDismiss, 1200);
    }
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
