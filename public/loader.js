/**
 * Career Fair 2026 - Instant Optimized Site Loader
 * Ultra-fast, lightweight loader dismisser with zero blocking.
 */
(function() {
  let isDismissed = false;

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

  window.SiteLoader = {
    setProgress,
    nextTip: () => {},
    prevTip: () => {},
    dismiss: dismissLoader
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(dismissLoader, 300);
    });
  } else {
    setTimeout(dismissLoader, 300);
  }

  // Safety ceiling: never block longer than 600ms
  setTimeout(() => {
    if (!isDismissed) dismissLoader();
  }, 600);
})();
