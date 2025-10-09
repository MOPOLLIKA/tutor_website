// LCP → GA4
(function () {
  if (!('PerformanceObserver' in window)) return;
  let lcpEntry;
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length) lcpEntry = entries[entries.length - 1];
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  function reportLCP() {
    if (!lcpEntry || typeof gtag !== 'function') return;
    const ms = Math.round(lcpEntry.startTime);
    gtag('event', 'lcp', {
      value: ms,
      lcp_seconds: +(ms / 1000).toFixed(3),
      element: lcpEntry.element && lcpEntry.element.tagName ? lcpEntry.element.tagName.toLowerCase() : undefined,
      url: lcpEntry.url || location.pathname,
      size: lcpEntry.size || undefined,
      transport_type: 'beacon'
    });
  }

  addEventListener('pagehide', reportLCP, { once: true });
  addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') reportLCP();
  }, { once: true });
})();

// Click tracking (passes all data-* attributes)
document.addEventListener('click', function(e) {
  const el = e.target.closest('a,button');
  if (!el) return;
  const href = el.href || '';
  const custom = el.dataset && el.dataset.gtagEvent;
  if (custom) { gtag('event', custom, el.dataset); return; }

  if (href.startsWith('mailto:')) gtag('event', 'contact_click', { method: 'email' });
  else if (href.startsWith('tel:')) gtag('event', 'contact_click', { method: 'phone' });
  else if (href.includes('wa.me') || href.includes('api.whatsapp.com')) gtag('event', 'contact_click', { method: 'whatsapp' });
  else if (href.includes('calendly.com') || href.includes('cal.com')) gtag('event', 'book_consult_click', { destination: 'calendly' });
});

// Floating CTA reveal synced to hero CTA visibility
(function () {
  const floating = document.querySelector('.floating-cta');
  const heroCTA = document.querySelector('.hero .cta');
  if (!floating || !heroCTA) return;

  const setProgress = (value) => {
    const progress = Math.min(1, Math.max(0, value));
    floating.style.setProperty('--cta-progress', progress.toFixed(3));
    if (progress > 0.06) floating.classList.add('is-interactive');
    else floating.classList.remove('is-interactive');
  };

  setProgress(0);

  if (!('IntersectionObserver' in window)) {
    setProgress(1);
    return;
  }

  const thresholds = Array.from({ length: 21 }, (_, idx) => idx / 20);
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.target !== heroCTA) continue;
      const progress = 1 - entry.intersectionRatio;
      setProgress(progress);
    }
  }, { threshold: thresholds, rootMargin: '-8px 0px -8px 0px' });

  observer.observe(heroCTA);
})();

// 24h consult promo countdown
(function () {
  const STORAGE_KEY = 'cs-prime-offer-start';
  const PROMO_WINDOW_MS = 24 * 60 * 60 * 1000;
  const PROMO_LINK = 'https://calendly.com/csprime/consult-free-diagnostic';
  const REGULAR_LINK = 'https://calendly.com/csprime/consult';

  const countdownEls = document.querySelectorAll('[data-offer-countdown]');
  const consultLinks = document.querySelectorAll('[data-consult-link]');

  if (!countdownEls.length && !consultLinks.length) return;

  const now = Date.now();
  let firstVisit = Number.NaN;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) firstVisit = parseInt(stored, 10);
  } catch (_) {}

  if (!Number.isFinite(firstVisit) || firstVisit <= 0) {
    firstVisit = now;
    try { window.localStorage.setItem(STORAGE_KEY, String(firstVisit)); } catch (_) {}
  }

  function setState(msRemaining) {
    const safeRemaining = Math.max(0, msRemaining);
    const totalSeconds = Math.floor(safeRemaining / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    const stamp = `${hours}:${minutes}:${seconds}`;

    countdownEls.forEach((el) => { el.textContent = stamp; });

    const promoActive = safeRemaining > 0;
    consultLinks.forEach((link) => {
      link.href = promoActive ? PROMO_LINK : REGULAR_LINK;
      link.dataset.offerActive = promoActive ? 'true' : 'false';
    });

    return promoActive;
  }

  setState(PROMO_WINDOW_MS - (now - firstVisit));

  const interval = window.setInterval(() => {
    const remaining = PROMO_WINDOW_MS - (Date.now() - firstVisit);
    const active = setState(remaining);
    if (!active) window.clearInterval(interval);
  }, 1000);
})();
