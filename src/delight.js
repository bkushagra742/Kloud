// A handful of small, self-contained "delight" features layered on top of
// the core app — each one degrades harmlessly if something's missing, and
// none of them are required for Kloud to work.

const NAMED_COLORS = [
  { name: 'black', hex: '#0a0a0c' }, { name: 'white', hex: '#f7f7f5' },
  { name: 'grey', hex: '#a3a3a3' }, { name: 'red', hex: '#e8483f' },
  { name: 'orange', hex: '#f08a24' }, { name: 'yellow', hex: '#f0b429' },
  { name: 'green', hex: '#3ecf8e' }, { name: 'teal', hex: '#2fbfa0' },
  { name: 'blue', hex: '#3b93f0' }, { name: 'purple', hex: '#8b5cf6' },
  { name: 'pink', hex: '#e152b0' }, { name: 'brown', hex: '#8b5e3c' }
];

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function lightness(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
}

/** Nearest named colour by simple RGB distance, with a light/dark prefix. */
export function nameColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 'a custom colour';
  const [r, g, b] = hexToRgb(hex);
  let best = NAMED_COLORS[0];
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const [cr, cg, cb] = hexToRgb(c.hex);
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (best.name === 'black' || best.name === 'white' || best.name === 'grey') return best.name;
  const l = lightness(hex);
  if (l > 0.75) return `light ${best.name}`;
  if (l < 0.32) return `dark ${best.name}`;
  return best.name;
}

export function describeColors(colors) {
  if (colors.length <= 1) return nameColor(colors[0]);
  const names = colors.map(nameColor);
  return `a ${names.join('-to-')} gradient`;
}

// ---------------------------------------------------------------- live description

let descEl = null;
export function initDescription() {
  descEl = document.createElement('div');
  descEl.id = 'kloudDescription';
  descEl.className = 'sr-only';
  descEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(descEl);
}

let descTimer = null;
export function updateDescription(shapeLabel, exprLabel, colors) {
  if (!descEl) return;
  clearTimeout(descTimer);
  // Debounced — dragging a colour slider or clicking through tiles quickly
  // shouldn't spam a screen reader with every intermediate state.
  descTimer = setTimeout(() => {
    descEl.textContent = `Kloud is currently a ${shapeLabel.toLowerCase()} shape, feeling ${exprLabel.toLowerCase()}, coloured ${describeColors(colors)}.`;
  }, 500);
}

// ---------------------------------------------------------------- dynamic favicon

let faviconLink = null;
let faviconCanvas = null;
export function updateFavicon(frame, colors, eyeColor) {
  if (!faviconLink) faviconLink = document.querySelector('link[rel="icon"]');
  if (!faviconLink) return;
  if (!faviconCanvas) {
    faviconCanvas = document.createElement('canvas');
    faviconCanvas.width = 64;
    faviconCanvas.height = 64;
  }
  const ctx = faviconCanvas.getContext('2d');
  const half = 130;
  const scale = 64 / (half * 2);
  ctx.clearRect(0, 0, 64, 64);
  ctx.save();
  ctx.translate(32, 32);
  ctx.scale(scale, scale);

  ctx.fillStyle = colors[0] ?? '#0a0a0c';
  if (colors.length > 1) {
    const g = ctx.createLinearGradient(-half, -half, half, half);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = g;
  }
  ctx.fill(new Path2D(frame.bodyPath));

  for (const eye of frame.eyes) {
    ctx.save();
    ctx.transform(...eye.m);
    ctx.globalAlpha = eye.alpha;
    ctx.fillStyle = eyeColor;
    ctx.fill(new Path2D(eye.d));
    ctx.restore();
  }
  ctx.restore();

  faviconLink.href = faviconCanvas.toDataURL('image/png');
}

// ---------------------------------------------------------------- idle easter egg

const IDLE_DELAY = 30_000;

/**
 * After a stretch of no interaction, gives Kloud something to do on its
 * own — a slow look-around — rather than just idling in place. Call the
 * returned `markInteraction()` on any real user action to reset the timer.
 */
export function initIdleEgg(engine, nowFn) {
  let idleTimer = null;
  let sequenceTimers = [];

  function clearSequence() {
    sequenceTimers.forEach(clearTimeout);
    sequenceTimers = [];
  }

  function runLookAround() {
    const beats = [
      { yaw: -22, pitch: 6, delay: 0 },
      { yaw: 20, pitch: -8, delay: 1400 },
      { yaw: 0, pitch: 10, delay: 2800 },
      { yaw: 0, pitch: 0, delay: 4200, end: true }
    ];
    for (const b of beats) {
      const t = setTimeout(() => {
        if (b.end) {
          engine.setLook(null, nowFn());
        } else {
          engine.setLook({ yaw: b.yaw, pitch: b.pitch, mix: 1, spin: 0, wander: 0.4 }, nowFn(), 1.1);
        }
      }, b.delay);
      sequenceTimers.push(t);
    }
    idleTimer = setTimeout(runLookAround, 4200 + 9000);
  }

  function markInteraction() {
    clearTimeout(idleTimer);
    clearSequence();
    idleTimer = setTimeout(runLookAround, IDLE_DELAY);
  }

  markInteraction();
  return markInteraction;
}

// ---------------------------------------------------------------- tile magnetism (fine-pointer only)

/** Tiles gently pull toward the cursor as it passes over the grid, dock-style. */
export function initTileMagnetism(gridEl, fineHoverQuery) {
  let rafQueued = false;
  let lastEvent = null;

  function apply() {
    rafQueued = false;
    const tiles = gridEl.querySelectorAll('.tile');
    if (!lastEvent) return;
    for (const tile of tiles) {
      const r = tile.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(lastEvent.clientX - cx, lastEvent.clientY - cy);
      const radius = 110;
      if (dist < radius) {
        const strength = 1 - dist / radius;
        const pull = strength * 6;
        const dx = ((cx - lastEvent.clientX) / (dist || 1)) * -pull;
        const dy = ((cy - lastEvent.clientY) / (dist || 1)) * -pull;
        // Folds in the scale/lift the tile's own CSS :hover rule normally
        // provides — an inline transform here would otherwise silently
        // override that rule entirely (inline styles always win), losing
        // the lift effect for exactly the tiles nearest the cursor.
        const scale = 1 + strength * 0.06;
        const lift = strength * 3;
        tile.style.transform = `translate(${dx}px, ${dy - lift}px) scale(${scale.toFixed(3)})`;
      } else {
        tile.style.transform = '';
      }
    }
  }

  function onMove(e) {
    lastEvent = e;
    if (rafQueued) return;
    rafQueued = true;
    requestAnimationFrame(apply);
  }

  function onLeave() {
    lastEvent = null;
    gridEl.querySelectorAll('.tile').forEach((t) => { t.style.transform = ''; });
  }

  function attach() {
    gridEl.addEventListener('pointermove', onMove);
    gridEl.addEventListener('pointerleave', onLeave);
  }
  function detach() {
    gridEl.removeEventListener('pointermove', onMove);
    gridEl.removeEventListener('pointerleave', onLeave);
    onLeave();
  }

  if (fineHoverQuery.matches) attach();
  fineHoverQuery.addEventListener('change', () => {
    if (fineHoverQuery.matches) attach();
    else detach();
  });
}

// ---------------------------------------------------------------- Konami code

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export function initKonami(onSuccess) {
  let progress = 0;
  document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[progress]) {
      progress++;
      if (progress === KONAMI.length) {
        progress = 0;
        onSuccess();
      }
    } else {
      progress = key === KONAMI[0] ? 1 : 0;
    }
  });
}
