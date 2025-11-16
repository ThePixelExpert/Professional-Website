// src/traceAnimations.js
// Initialize smoother stroke-dashoffset animations for background traces using Web Animations API.
// This recomputes path lengths on resize and restarts animations so dash patterns don't jump.

function parseDurationToMs(dur) {
  if (!dur) return null;
  // examples: "8.5s", "6000ms"
  dur = dur.trim();
  if (dur.endsWith('ms')) return parseFloat(dur);
  if (dur.endsWith('s')) return parseFloat(dur) * 1000;
  const n = parseFloat(dur);
  return isNaN(n) ? null : n;
}

export default function initTraceAnimations() {
  if (typeof document === 'undefined') return;

  const selector = '#circuit-bg svg';
  const svg = document.querySelector(selector);
  if (!svg) return;

  // find animated polylines/paths that use the trace gradient (same elements you animated via SMIL)
  const traces = Array.from(svg.querySelectorAll('polyline, path')).filter(el => {
    // include only ones that visually use the trace gradient (either inherited or direct stroke attr)
    const stroke = el.getAttribute('stroke') || window.getComputedStyle(el).stroke;
    return stroke && stroke.indexOf('#traceGradient') !== -1 || stroke && stroke.indexOf('traceGradient') !== -1 || stroke && stroke.includes('url(#traceGradient)');
  });

  // store running animations so we can cancel them on resize
  let running = [];

  function setup() {
    // cancel previous
    running.forEach(a => a.cancel && a.cancel());
    running = [];

    traces.forEach(el => {
      // get total length (works for path & polyline in modern browsers)
      let len = 0;
      try {
        len = el.getTotalLength();
        if (!isFinite(len) || len <= 0) {
          // fallback guess
          len = 2000;
        }
      } catch (e) {
        len = 2000; // fallback
      }

      // determine animation duration by checking any SMIL animate child (fallback to 7000ms)
      let durMs = 7000;
      const smil = el.querySelector && el.querySelector('animate[attributeName="stroke-dashoffset"]');
      if (smil) {
        const rawDur = smil.getAttribute('dur');
        const parsed = parseDurationToMs(rawDur);
        if (parsed) durMs = parsed;
      }

      // Determine dash/pulse sizes:
      // Use a pulse length roughly 1/6..1/12 of the full length so you get clear pulses.
      const pulse = Math.max(8, Math.round(len / 8));
      const gap = Math.max(8, Math.round(len)); // large gap so pulses wrap nicely

      el.style.strokeDasharray = `${pulse} ${gap}`;
      // ensure we start with an offset equal to the total length so animation goes from off->on
      el.style.strokeDashoffset = `${len}px`;

      // Use Web Animations API for smoother control (linear, infinite).
      // We animate from len to 0, using px units to avoid unitless interpolation issues.
      try {
        const anim = el.animate(
          [
            { strokeDashoffset: `${len}px` },
            { strokeDashoffset: `0px` }
          ],
          {
            duration: durMs,
            iterations: Infinity,
            easing: 'linear'
          }
        );
        // ensure the element keeps the animated value (although we continuously run it)
        anim.play();
        running.push(anim);
      } catch (err) {
        // if WAAPI unavailable, fallback to setting SMIL animation presence and hope the CSS hints help
        // nothing else to do here
        console.warn('Web Animations API not available; falling back to SMIL for', el, err);
      }
    });
  }

  // debounce resize
  let to;
  function onResize() {
    clearTimeout(to);
    to = setTimeout(() => {
      setup();
    }, 120);
  }

  // initial setup
  setup();
  window.addEventListener('resize', onResize);
  // if devicePixelRatio changes (e.g. zoom), also recompute
  let lastDPR = window.devicePixelRatio;
  setInterval(() => {
    if (lastDPR !== window.devicePixelRatio) {
      lastDPR = window.devicePixelRatio;
      setup();
    }
  }, 500);
}
