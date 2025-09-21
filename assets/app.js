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