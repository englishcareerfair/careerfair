(function() {
  const TUTORIAL_TIPS = [
    {
      icon: '🌐',
      title: 'TIPS',
      text: 'Explore 32+ modern careers requiring English fluency, complete with entrance exams, NAAC/NIRF colleges, and admission pathways.'
    },
    {
      icon: '🎙️',
      title: 'TIPS',
      text: 'Practice spoken English in the AI Speech Lab with real-time phoneme feedback, fluency analytics, and vocal coaching.'
    },
    {
      icon: '📹',
      title: 'TIPS',
      text: 'Rehearse professional teleprompter scripts with a live video mirror, dynamic pacing controls, and recording exports.'
    },
    {
      icon: '🎮',
      title: 'TIPS',
      text: 'Sharpen your reflex grammar and vocabulary across 11 fast-paced games on the live exhibition leaderboard.'
    },
    {
      icon: '📜',
      title: 'TIPS',
      text: 'Generate and download your official 2-Page Student Career Dossier with verifiable QR credentials anytime.'
    },
    {
      icon: '📱',
      title: 'TIPS',
      text: 'On smartphones, navigation tabs dock smoothly to the bottom when you scroll down for effortless one-handed control.'
    }
  ];

  let currentTipIndex = 0;
  let tipTimer = null;
  let isDismissed = false;
  const loaderStartTime = Date.now();

  const setProgress = (val, message) => {
    // Progress bar was removed per user request; keep setProgress as no-op safe API
    const pBar = document.getElementById('loader-progress-bar');
    const pPct = document.getElementById('loader-status-pct');
    const pMsg = document.getElementById('loader-status-msg');
    if (pBar) pBar.style.width = `${val}%`;
    if (pPct) pPct.textContent = `${Math.round(val)}%`;
    if (pMsg && message) pMsg.textContent = message;
  };

  const showTip = (idx, direction = 1) => {
    if (isDismissed) return;
    currentTipIndex = (idx + TUTORIAL_TIPS.length) % TUTORIAL_TIPS.length;
    const tip = TUTORIAL_TIPS[currentTipIndex];
    const textEl = document.getElementById('loader-tutorial-text');
    const badgeEl = document.querySelector('.loader-tutorial-badge');
    const iconEl = document.querySelector('.loader-tutorial-icon');
    const dots = document.querySelectorAll('.loader-dot');

    if (textEl) {
      textEl.classList.add('text-fade');
      setTimeout(() => {
        textEl.textContent = tip.text;
        if (badgeEl) badgeEl.textContent = tip.title;
        if (iconEl) iconEl.textContent = tip.icon;
        dots.forEach((dot, dIdx) => {
          dot.classList.toggle('active', dIdx === currentTipIndex);
        });
        textEl.classList.remove('text-fade');
      }, 200);
    }
  };

  const cycleTutorialTip = () => {
    showTip(currentTipIndex + 1);
  };

  const resetTipTimer = () => {
    if (tipTimer) clearInterval(tipTimer);
    tipTimer = setInterval(cycleTutorialTip, 3200);
  };

  const setupTipButtons = () => {
    const nextBtn = document.getElementById('btn-loader-next-tip');
    const prevBtn = document.getElementById('btn-loader-prev-tip');
    const handleNext = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      isInteracting = true;
      showTip(currentTipIndex + 1);
      resetTipTimer();
    };
    const handlePrev = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      isInteracting = true;
      showTip(currentTipIndex - 1);
      resetTipTimer();
    };

    if (nextBtn) {
      nextBtn.addEventListener('click', handleNext);
      nextBtn.addEventListener('pointerdown', handleNext);
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', handlePrev);
      prevBtn.addEventListener('pointerdown', handlePrev);
    }

    const dots = document.querySelectorAll('.loader-dot');
    dots.forEach((dot, dotIdx) => {
      dot.style.cursor = 'pointer';
      dot.addEventListener('click', () => {
        isInteracting = true;
        showTip(dotIdx);
        resetTipTimer();
      });
    });

    // Touch gesture swipe response for mobile devices to cycle tips left and right
    const panel = document.getElementById('loader-tips-panel') || document.querySelector('.loader-tutorial-panel');
    if (panel && !panel.dataset.touchBound) {
      panel.dataset.touchBound = 'true';
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;

      panel.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length === 0) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }, { passive: true });

      panel.addEventListener('touchend', (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;

        // Minimum swipe threshold (30px horizontal, within 500ms, mostly horizontal)
        if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && deltaTime < 600) {
          isInteracting = true;
          if (deltaX < 0) {
            // Swiped left -> Next Tip
            showTip(currentTipIndex + 1);
          } else {
            // Swiped right -> Previous Tip
            showTip(currentTipIndex - 1);
          }
          resetTipTimer();
        }
      }, { passive: true });
    }

    resetTipTimer();
  };

  let isInteracting = false;

  const dismissLoader = () => {
    if (isDismissed) return;
    // If user is actively reading or clicking tips, give them time to explore
    if (isInteracting) {
      if (!window._dismissPending) {
        window._dismissPending = setTimeout(() => {
          isInteracting = false;
          dismissLoader();
        }, 1500);
      }
      return;
    }

    isDismissed = true;
    if (tipTimer) clearInterval(tipTimer);

    const loader = document.getElementById('site-loader');
    if (loader) {
      loader.classList.add('loader-hidden');
      loader.style.setProperty('opacity', '0', 'important');
      loader.style.setProperty('pointer-events', 'none', 'important');
      loader.style.setProperty('display', 'none', 'important');
      try { loader.remove(); } catch (_) {}
    }
  };

  window.SiteLoader = {
    setProgress,
    nextTip: () => showTip(currentTipIndex + 1),
    prevTip: () => showTip(currentTipIndex - 1),
    dismiss: dismissLoader
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTipButtons);
  } else {
    setupTipButtons();
  }

  // Safety ceiling: never block longer than 2.0s under any circumstances
  setTimeout(() => {
    if (!isDismissed) dismissLoader();
  }, 800);
})();

