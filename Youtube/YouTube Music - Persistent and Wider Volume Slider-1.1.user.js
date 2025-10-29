// ==UserScript==
// @name         YouTube Music: Persistent Wide Volume Slider
// @namespace    https://example.local/
// @version      1.1
// @description  Remove transition, keep volume slider visible, and set slider length to floor(window.innerWidth/6)px on music.youtube.com
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const STYLE_ID = 'ytm-volume-slider-persistent-style';

  const baseCss = `
/* Remove transitions and force visibility/interaction */
.volume-slider.ytmusic-player-bar,
.volume-slider.ytmusic-player-bar * {
  transition: none !important;
  -webkit-transition: none !important;
  -moz-transition: none !important;
}

.volume-slider.ytmusic-player-bar {
  opacity: 1 !important;
  pointer-events: auto !important;
  visibility: visible !important;
  overflow: visible !important;
}

/* Ensure hover/focus states keep it visible */
.volume-slider.ytmusic-player-bar:hover,
.volume-slider.ytmusic-player-bar:focus,
.volume-slider.ytmusic-player-bar:active {
  opacity: 1 !important;
  pointer-events: auto !important;
  visibility: visible !important;
}

/* Clear any max-width constraints so JS can set exact pixel width */
tp-yt-paper-slider#volume-slider,
.volume-slider.ytmusic-player-bar tp-yt-paper-slider,
.volume-slider.ytmusic-player-bar .slider,
.volume-slider.ytmusic-player-bar .bar,
.volume-slider.ytmusic-player-bar .track {
  max-width: none !important;
  box-sizing: border-box !important;
}
`;

  // Inject base CSS early
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = baseCss;
    document.documentElement.appendChild(styleEl);
  }
  ensureStyle();

  // Compute target width in px: floor(window.innerWidth / 6)
  function computeWidthPx() {
    try {
      const w = Math.floor(window.innerWidth / 6);
      return (w > 0 ? w : 100) + 'px'; // fallback 100px if something odd
    } catch {
      return '100px';
    }
  }

  // Apply width to slider elements (inline styles to override shadow/inline rules)
  function applyWidthTo(el) {
    if (!el) return;
    try {
      const widthPx = computeWidthPx();
      // Prefer applying to the tp-yt-paper-slider element and its host container
      el.style.width = widthPx;
      el.style.minWidth = widthPx;
      el.style.maxWidth = widthPx;
      el.style.transition = 'none';
      // Also patch container .volume-slider if different element passed
      const host = el.closest('.volume-slider.ytmusic-player-bar');
      if (host) {
        host.style.width = widthPx;
        host.style.minWidth = widthPx;
        host.style.maxWidth = widthPx;
        host.style.transition = 'none';
      }
    } catch (e) {
      // ignore
    }
  }

  // Find relevant slider elements and patch them
  function patchAllSliders() {
    const selectors = [
      'tp-yt-paper-slider#volume-slider',
      '.volume-slider.ytmusic-player-bar'
    ];
    const found = document.querySelectorAll(selectors.join(','));
    found.forEach((el) => {
      // If the tp-yt-paper-slider is inside a wrapper, ensure we target the element itself
      if (el.tagName && el.tagName.toLowerCase() === 'tp-yt-paper-slider') {
        applyWidthTo(el);
      } else {
        // try to find inner tp-yt-paper-slider
        const inner = el.querySelector('tp-yt-paper-slider#volume-slider') || el.querySelector('tp-yt-paper-slider');
        applyWidthTo(inner || el);
      }
    });
  }

  // Observe DOM to catch dynamic insertion/removes
  const domObserver = new MutationObserver((mutations) => {
    // run patch when children added — cheap check
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        patchAllSliders();
        break;
      }
    }
    // Also ensure style element exists
    ensureStyle();
  });
  domObserver.observe(document.documentElement, { childList: true, subtree: true });

  // Reapply on load and once immediately
  window.addEventListener('load', patchAllSliders, { once: true });
  setTimeout(patchAllSliders, 500);

  // Update width on resize (throttled)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      patchAllSliders();
      resizeTimer = null;
    }, 100);
  });

  // Defensive periodic patch (small interval)
  const intervalId = setInterval(() => {
    patchAllSliders();
  }, 2000);

  // Stop interval after a while to avoid forever polling (still responds via observers/resizes)
  setTimeout(() => clearInterval(intervalId), 120000);

})();
