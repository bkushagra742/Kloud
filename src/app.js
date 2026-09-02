import { DEFAULT_COLORS, PRESET_COLORS, isValidHex } from './core/colors.js';
import { KloudEngine } from './core/engine.js';
import { DEFAULT_EXPRESSION, EXPRESSIONS, EXPRESSION_BY_ID } from './core/expressions.js';
import { autoEyeColor, paintFill, paintFrame } from './core/render.js';
import { DEFAULT_SHAPE, SHAPES, SHAPE_BY_ID } from './core/shapes.js';
import { exportPNG, exportSVG, copyPNGToClipboard } from './export/snapshot.js';
import { exportVideo } from './export/video.js';
import { startTour } from './tour.js';
import {
  initDescription, updateDescription, updateFavicon,
  initIdleEgg, initTileMagnetism, initKonami
} from './delight.js';

// ---------------------------------------------------------------- state

const state = {
  shapeId: DEFAULT_SHAPE,
  expressionId: DEFAULT_EXPRESSION,
  colors: [...DEFAULT_COLORS],
  angle: 35,
  animate: false
};

// ---------------------------------------------------------------- permalink: read URL before first render

function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  const s = params.get('s');
  const e = params.get('e');
  const c = params.get('c');
  const a = params.get('a');
  const m = params.get('m');

  if (s && SHAPE_BY_ID.has(s)) state.shapeId = s;
  if (e && EXPRESSION_BY_ID.has(e)) state.expressionId = e;
  if (c) {
    const colors = c
      .split(',')
      .map((h) => `#${h.trim().replace(/^#/, '')}`)
      .filter(isValidHex)
      .slice(0, 6);
    if (colors.length) state.colors = colors;
  }
  if (a !== null && Number.isFinite(Number(a))) state.angle = Math.min(359, Math.max(0, Number(a)));
  if (m === '1') state.animate = true;
}
readStateFromUrl();

const engine = new KloudEngine(100, SHAPE_BY_ID.get(state.shapeId).radii, EXPRESSION_BY_ID.get(state.expressionId));

// ---------------------------------------------------------------- DOM refs

const svg = document.getElementById('kloudSvg');
const defs = svg.querySelector('defs');
const els = {
  body: document.getElementById('kloudBody'),
  eyes: [document.getElementById('kloudEye0'), document.getElementById('kloudEye1')]
};
const stageCard = document.getElementById('stageCard');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const fineHoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

// Batches gaze-follow and custom-cursor position updates to at most once
// per animation frame. Calling getBoundingClientRect() on every raw
// pointermove forces a synchronous layout on every pixel of mouse movement
// (measured: ~1 forced reflow per event) — but simply caching it and only
// refreshing on resize/pointerenter breaks during the stage's own drop-in
// entrance animation, which moves it via CSS transform for ~0.9s after
// load, well within when a visitor is likely to first move their mouse.
// rAF-throttling fixes both: still at most one layout read per frame
// (not per event), but never more than one frame stale, so it stays
// correct through any animation or scroll happening at the same time.
let pendingPointerEvent = null;
let pointerRafQueued = false;
const pointerMoveHandlers = [];

function onStagePointerMove(e) {
  pendingPointerEvent = e;
  if (pointerRafQueued) return;
  pointerRafQueued = true;
  requestAnimationFrame(() => {
    pointerRafQueued = false;
    if (!pendingPointerEvent) return;
    const r = stageCard.getBoundingClientRect();
    for (const handler of pointerMoveHandlers) handler(pendingPointerEvent, r);
  });
}
stageCard.addEventListener('pointermove', onStagePointerMove);

// ---------------------------------------------------------------- fill / eye colour

let currentFill = state.colors[0];
let eyeColor = autoEyeColor(state.colors);

function refreshFill() {
  currentFill = paintFill(defs, 'kloud-grad', state.colors, {
    angle: state.angle,
    animate: state.animate && !reduceMotion.matches
  });
  eyeColor = autoEyeColor(state.colors);
  els.body.setAttribute('fill', currentFill);
}
refreshFill();

// ---------------------------------------------------------------- render loop

const start = performance.now();
function now() {
  return (performance.now() - start) / 1000;
}

let lastFaviconUpdate = 0;
function tick() {
  const t = now();
  const frame = engine.sample(t);
  paintFrame(els, frame, eyeColor);
  // Favicon updates are cheap but visibly flicker if done every frame —
  // throttled to a slow cadence, still catches blinks/idle-look changes.
  if (t - lastFaviconUpdate > 1.2) {
    lastFaviconUpdate = t;
    updateFavicon(frame, state.colors, eyeColor);
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

initDescription();
const markInteraction = initIdleEgg(engine, now);
document.addEventListener('pointerdown', markInteraction, { passive: true });

// ---------------------------------------------------------------- cursor look

pointerMoveHandlers.push((e, r) => {
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  engine.setLook({ yaw: x * 34, pitch: -y * 26, mix: 1, spin: 0, wander: 0.35 }, now());
});
stageCard.addEventListener('pointerleave', () => {
  engine.setLook(null, now());
});

// ---------------------------------------------------------------- static preview frames (for tiles)

function staticFrame(radii, expression) {
  const e = new KloudEngine(46, radii, expression);
  return e.sample(1.6, { blink: false, float: false });
}

function tileSvg(frame, fillColor) {
  const eyeC = autoEyeColor([fillColor]);
  const eyes = frame.eyes
    .map((eye) => `<path d="${eye.d}" transform="${eye.matrix}" fill="${eyeC}" opacity="${eye.alpha}"/>`)
    .join('');
  return (
    `<svg viewBox="-58 -58 116 116" aria-hidden="true">` +
    `<path d="${frame.bodyPath}" fill="${fillColor}"/>${eyes}</svg>`
  );
}

// ---------------------------------------------------------------- shape grid

const shapeGrid = document.getElementById('shapeGrid');
const shapeButtons = new Map();
SHAPES.forEach((shape, i) => {
  const btn = document.createElement('button');
  btn.className = 'tile';
  btn.type = 'button';
  btn.title = shape.label;
  btn.setAttribute('aria-label', shape.label);
  btn.style.animationDelay = `${Math.min(i * 22, 260)}ms`;
  const frame = staticFrame(shape.radii, EXPRESSION_BY_ID.get('neutral'));
  btn.innerHTML = tileSvg(frame, '#e9e9ea');
  btn.addEventListener('click', () => selectShape(shape.id));
  if (shape.id === state.shapeId) btn.classList.add('is-selected');
  shapeGrid.appendChild(btn);
  shapeButtons.set(shape.id, btn);
});

function selectShape(id) {
  const shape = SHAPE_BY_ID.get(id);
  if (!shape) return;
  state.shapeId = id;
  engine.setShape(shape.radii, now());
  updateSelection(shapeGrid, shapeButtons.get(id));
  syncUrl();
  announceState();
  markInteraction();
  document.dispatchEvent(new CustomEvent('kloud:shape-selected'));
}

// ---------------------------------------------------------------- expression grid

const expressionGrid = document.getElementById('expressionGrid');
const expressionButtons = new Map();
EXPRESSIONS.forEach((expr, i) => {
  const btn = document.createElement('button');
  btn.className = 'tile';
  btn.type = 'button';
  btn.title = expr.label;
  btn.setAttribute('aria-label', expr.label);
  btn.style.animationDelay = `${Math.min(i * 22, 260)}ms`;
  const frame = staticFrame(SHAPE_BY_ID.get('circle').radii, expr);
  btn.innerHTML = tileSvg(frame, '#e9e9ea');
  btn.addEventListener('click', () => selectExpression(expr.id));
  if (expr.id === state.expressionId) btn.classList.add('is-selected');
  expressionGrid.appendChild(btn);
  expressionButtons.set(expr.id, btn);
});

function selectExpression(id) {
  const expr = EXPRESSION_BY_ID.get(id);
  if (!expr) return;
  state.expressionId = id;
  engine.setExpression(expr, now());
  updateSelection(expressionGrid, expressionButtons.get(id));
  syncUrl();
  announceState();
  markInteraction();
  document.dispatchEvent(new CustomEvent('kloud:expression-selected'));
}

function announceState() {
  const shape = SHAPE_BY_ID.get(state.shapeId);
  const expr = EXPRESSION_BY_ID.get(state.expressionId);
  updateDescription(shape?.label ?? 'circle', expr?.label ?? 'neutral', state.colors);
}

function updateSelection(grid, activeBtn) {
  grid.querySelectorAll('.tile').forEach((t) => t.classList.remove('is-selected'));
  activeBtn?.classList.add('is-selected');
}

// ---------------------------------------------------------------- colour panel

const colorChips = document.getElementById('colorChips');
const colorPicker = document.getElementById('colorPicker');
const presetRow = document.getElementById('presetRow');
const angleRow = document.getElementById('angleRow');
const angleSlider = document.getElementById('angleSlider');
const animateRow = document.getElementById('animateRow');
const animateToggle = document.getElementById('animateToggle');

angleSlider.value = String(state.angle);
animateToggle.checked = state.animate;

function renderChips() {
  colorChips.innerHTML = '';
  state.colors.forEach((hex, i) => {
    const chip = document.createElement('span');
    chip.className = 'color-chip';
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = hex;
    chip.appendChild(swatch);
    const label = document.createElement('span');
    label.textContent = hex.toUpperCase();
    chip.appendChild(label);
    if (state.colors.length > 1) {
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '×';
      rm.setAttribute('aria-label', `Remove ${hex}`);
      rm.addEventListener('click', () => {
        state.colors.splice(i, 1);
        onColorsChanged();
      });
      chip.appendChild(rm);
    }
    colorChips.appendChild(chip);
  });
  const multi = state.colors.length > 1;
  angleRow.hidden = !multi;
  animateRow.hidden = !multi;
}

function onColorsChanged() {
  if (state.colors.length === 0) state.colors = [...DEFAULT_COLORS];
  renderChips();
  refreshFill();
  syncUrl();
  announceState();
  markInteraction();
  document.dispatchEvent(new CustomEvent('kloud:colors-changed'));
}

colorPicker.addEventListener('input', (e) => {
  const hex = e.target.value;
  if (!isValidHex(hex)) return;
  if (state.colors.length >= 6) state.colors.shift();
  state.colors.push(hex);
  onColorsChanged();
});

document.getElementById('clearColors').addEventListener('click', () => {
  state.colors = [...DEFAULT_COLORS];
  state.angle = 35;
  state.animate = false;
  angleSlider.value = '35';
  animateToggle.checked = false;
  onColorsChanged();
});

for (const hex of PRESET_COLORS) {
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'preset-swatch';
  sw.style.background = hex;
  sw.setAttribute('aria-label', `Use ${hex}`);
  sw.addEventListener('click', () => {
    if (state.colors.length >= 6) state.colors.shift();
    state.colors.push(hex);
    onColorsChanged();
  });
  presetRow.appendChild(sw);
}

angleSlider.addEventListener('input', (e) => {
  state.angle = Number(e.target.value);
  refreshFill();
  syncUrl();
});

animateToggle.addEventListener('change', (e) => {
  state.animate = e.target.checked;
  refreshFill();
  syncUrl();
});

renderChips();

// ---------------------------------------------------------------- randomize

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomizeDesign() {
  const shape = randomPick(SHAPES);
  const expr = randomPick(EXPRESSIONS);
  const count = 1 + Math.floor(Math.random() * 3); // 1-3 colours
  const pool = [...PRESET_COLORS];
  const colors = [];
  for (let i = 0; i < count && pool.length; i++) {
    colors.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }

  selectShape(shape.id);
  selectExpression(expr.id);
  state.colors = colors;
  state.angle = Math.floor(Math.random() * 360);
  state.animate = colors.length > 1 && Math.random() < 0.5;
  angleSlider.value = String(state.angle);
  animateToggle.checked = state.animate;
  renderChips();
  refreshFill();
  syncUrl();
  announceState();

  if (!reduceMotion.matches) {
    stageCard.classList.remove('is-bouncing');
    // eslint-disable-next-line no-unused-expressions
    stageCard.offsetWidth; // restart the animation
    stageCard.classList.add('is-bouncing');
  }
}

document.getElementById('randomizeBtn')?.addEventListener('click', randomizeDesign);

// ---------------------------------------------------------------- shareable permalink

let urlSyncTimer = null;
function syncUrl() {
  clearTimeout(urlSyncTimer);
  urlSyncTimer = setTimeout(() => {
    const params = new URLSearchParams();
    params.set('s', state.shapeId);
    params.set('e', state.expressionId);
    params.set('c', state.colors.map((h) => h.replace('#', '')).join(','));
    params.set('a', String(Math.round(state.angle)));
    if (state.animate) params.set('m', '1');
    const url = `${location.pathname}?${params.toString()}`;
    history.replaceState(null, '', url);
  }, 250);
}
syncUrl();

document.getElementById('copyLink')?.addEventListener('click', async () => {
  syncUrl();
  clearTimeout(urlSyncTimer);
  const params = new URLSearchParams();
  params.set('s', state.shapeId);
  params.set('e', state.expressionId);
  params.set('c', state.colors.map((h) => h.replace('#', '')).join(','));
  params.set('a', String(Math.round(state.angle)));
  if (state.animate) params.set('m', '1');
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  history.replaceState(null, '', url);
  try {
    await navigator.clipboard.writeText(url);
    setStatus('Link copied.');
  } catch {
    setStatus('Could not copy — copy it from the address bar.');
  }
});

// ---------------------------------------------------------------- section nav (scroll-spy)

const jumpBtns = document.querySelectorAll('.jump-btn');
const blocks = document.querySelectorAll('.block[data-section]');

jumpBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.jump);
    target?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  });
});

// Picks whichever section's top has most recently crossed a fixed reference
// line — more reliable than IntersectionObserver margins for short sections
// that can pass entirely through the "active" band in a single scroll frame.
const REFERENCE_Y = 160;
let spyQueued = false;

function updateActiveSection() {
  spyQueued = false;
  const scrollable = document.documentElement.scrollHeight > window.innerHeight + 4;
  const atBottom = scrollable && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  let current = atBottom ? blocks[blocks.length - 1] : blocks[0];
  if (!atBottom) {
    for (const block of blocks) {
      if (block.getBoundingClientRect().top - REFERENCE_Y <= 0) current = block;
    }
  }
  const id = current?.dataset.section;
  jumpBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.jump === id));
}

window.addEventListener(
  'scroll',
  () => {
    if (spyQueued) return;
    spyQueued = true;
    requestAnimationFrame(updateActiveSection);
  },
  { passive: true }
);
updateActiveSection();

// ---------------------------------------------------------------- scroll-reveal for sections

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  blocks.forEach((b) => revealObserver.observe(b));
} else {
  blocks.forEach((b) => b.classList.add('is-revealed'));
}

// ---------------------------------------------------------------- mobile pin-on-scroll

// `.stage` stays position:static even while pinned (only its child
// `.stage-card` becomes fixed), so observing `.stage` itself is safe —
// its own position never moves, avoiding an observer feedback loop.
const stageEl = document.querySelector('.stage');
const mobileQuery = window.matchMedia('(max-width: 860px)');

function clearDragPosition() {
  // Dragging sets inline left/top directly on stageCard. Once unpinned it
  // reverts to position:relative, where leftover left/top still shift it
  // away from its normal document-flow spot — clear them so it snaps back.
  stageCard.style.left = '';
  stageCard.style.top = '';
  stageCard.style.right = '';
  stageCard.style.bottom = '';
}

// Pinning makes stage-card position:fixed, which removes it from the
// document flow — its container (.stage) would otherwise collapse by the
// card's own height (~350-400px on mobile) and yank everything below it
// upward in one frame. Locking in the natural height as min-height keeps
// that space reserved regardless of pin state, so nothing jumps.
function measureStageHeight() {
  if (stageEl.classList.contains('is-pinned')) return;
  const h = stageEl.offsetHeight;
  if (h > 0) stageEl.style.minHeight = `${h}px`;
}
requestAnimationFrame(() => requestAnimationFrame(measureStageHeight));
window.addEventListener('resize', measureStageHeight);

function setPinned(pinned) {
  const wasPinned = stageEl.classList.contains('is-pinned');
  stageEl.classList.toggle('is-pinned', pinned);
  if (wasPinned && !pinned) {
    clearDragPosition();
    measureStageHeight();
  }
}

const stagePinObserver = new IntersectionObserver(
  (entries) => {
    if (!mobileQuery.matches) {
      setPinned(false);
      return;
    }
    setPinned(!entries[0].isIntersecting);
  },
  { threshold: 0 }
);
stagePinObserver.observe(stageEl);

mobileQuery.addEventListener('change', () => {
  if (!mobileQuery.matches) setPinned(false);
});

stageCard.addEventListener('click', () => {
  if (stageEl.classList.contains('is-pinned') && !wasDragged) {
    document.getElementById('stageAnchor').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  }
});

// ---------------------------------------------------------------- drag the pinned bubble

const DRAG_THRESHOLD = 6;
let dragging = false;
let wasDragged = false;
let dragStartX = 0;
let dragStartY = 0;
let pointerOffsetX = 0;
let pointerOffsetY = 0;

stageCard.addEventListener('pointerdown', (e) => {
  if (!stageEl.classList.contains('is-pinned')) return;
  dragging = true;
  wasDragged = false;
  const r = stageCard.getBoundingClientRect();
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  pointerOffsetX = e.clientX - r.left;
  pointerOffsetY = e.clientY - r.top;
  stageCard.setPointerCapture(e.pointerId);
});

stageCard.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  if (!wasDragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
  wasDragged = true;

  const w = stageCard.offsetWidth;
  const h = stageCard.offsetHeight;
  const margin = 6;
  const left = clampNum(e.clientX - pointerOffsetX, margin, window.innerWidth - w - margin);
  const top = clampNum(e.clientY - pointerOffsetY, margin, window.innerHeight - h - margin);

  stageCard.style.left = `${left}px`;
  stageCard.style.top = `${top}px`;
  stageCard.style.right = 'auto';
  stageCard.style.bottom = 'auto';
});

function endDrag(e) {
  if (!dragging) return;
  dragging = false;
  if (e && stageCard.hasPointerCapture?.(e.pointerId)) {
    stageCard.releasePointerCapture(e.pointerId);
  }
}
stageCard.addEventListener('pointerup', endDrag);
stageCard.addEventListener('pointercancel', endDrag);

function clampNum(v, lo, hi) {
  if (hi < lo) return lo;
  return Math.min(Math.max(v, lo), hi);
}

// Re-clamp into view on resize/orientation change so it can't get stranded off-screen.
window.addEventListener('resize', () => {
  if (!stageEl.classList.contains('is-pinned') || !stageCard.style.left) return;
  const w = stageCard.offsetWidth;
  const h = stageCard.offsetHeight;
  const margin = 6;
  stageCard.style.left = `${clampNum(parseFloat(stageCard.style.left), margin, window.innerWidth - w - margin)}px`;
  stageCard.style.top = `${clampNum(parseFloat(stageCard.style.top), margin, window.innerHeight - h - margin)}px`;
});

// ---------------------------------------------------------------- custom cursor (desktop / fine-pointer only)

let cursorEl = null;
let moveCursorRegistered = false;

function moveCursor(e, r) {
  if (!cursorEl) return;
  cursorEl.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
}

function enableCustomCursor() {
  if (cursorEl) return;
  cursorEl = document.createElement('div');
  cursorEl.className = 'stage-cursor';
  cursorEl.setAttribute('aria-hidden', 'true');
  stageCard.appendChild(cursorEl);
  stageCard.classList.add('has-custom-cursor');
  if (!moveCursorRegistered) {
    pointerMoveHandlers.push(moveCursor);
    moveCursorRegistered = true;
  }
  stageCard.addEventListener('pointerenter', showCursor);
  stageCard.addEventListener('pointerleave', hideCursor);
}

function disableCustomCursor() {
  if (!cursorEl) return;
  stageCard.classList.remove('has-custom-cursor');
  stageCard.removeEventListener('pointerenter', showCursor);
  stageCard.removeEventListener('pointerleave', hideCursor);
  cursorEl.remove();
  cursorEl = null;
}

function showCursor() { cursorEl?.classList.add('is-visible'); }
function hideCursor() { cursorEl?.classList.remove('is-visible'); }

function applyCursorPreference() {
  if (fineHoverQuery.matches) enableCustomCursor();
  else disableCustomCursor();
}
applyCursorPreference();
fineHoverQuery.addEventListener('change', applyCursorPreference);

// ---------------------------------------------------------------- about drawer

const aboutBtn = document.getElementById('aboutBtn');
const aboutDrawer = document.getElementById('aboutDrawer');
const aboutBackdrop = document.getElementById('aboutBackdrop');
const aboutClose = document.getElementById('aboutClose');

function openAbout() {
  aboutDrawer.hidden = false;
  aboutBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeAbout() {
  aboutDrawer.hidden = true;
  aboutBackdrop.hidden = true;
  document.body.style.overflow = '';
}
aboutBtn.addEventListener('click', openAbout);
aboutClose.addEventListener('click', closeAbout);
aboutBackdrop.addEventListener('click', closeAbout);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !aboutDrawer.hidden) closeAbout();
});

document.getElementById('replayTour')?.addEventListener('click', () => {
  closeAbout();
  startTour({ force: true });
});

// ---------------------------------------------------------------- first-run tour

// The localStorage flag inside tour.js already tracks whether this browser
// has seen it — no need to also guess from the URL. (An earlier version
// tried to skip the tour when arriving via a shared link, but Kloud's own
// permalink sync rewrites the URL on every visit, which made that check
// fire on ordinary reloads too — the flag alone is the correct signal.)
setTimeout(() => startTour(), 900);

// ---------------------------------------------------------------- export

const exportStatus = document.getElementById('exportStatus');
function setStatus(msg) {
  exportStatus.textContent = msg;
  if (msg) setTimeout(() => { if (exportStatus.textContent === msg) exportStatus.textContent = ''; }, 3200);
}

document.getElementById('exportPng').addEventListener('click', () => {
  const frame = engine.sample(now());
  exportPNG(frame, state.colors, eyeColor, 1024);
  setStatus('PNG saved.');
});

document.getElementById('exportSvg').addEventListener('click', () => {
  const frame = engine.sample(now());
  exportSVG(frame, state.colors, eyeColor);
  setStatus('SVG saved.');
});

document.getElementById('exportCopy').addEventListener('click', async () => {
  const frame = engine.sample(now());
  try {
    await copyPNGToClipboard(frame, state.colors, eyeColor, 512);
    setStatus('Copied to clipboard.');
  } catch {
    setStatus('Clipboard copy is not available here.');
  }
});

const exportVideoBtn = document.getElementById('exportVideo');
exportVideoBtn.addEventListener('click', async () => {
  exportVideoBtn.disabled = true;
  setStatus('Recording 3s of video…');
  try {
    await exportVideo(engine, state.colors, eyeColor, { seconds: 3, fps: 30, size: 720 });
    setStatus('Video saved.');
  } catch (err) {
    setStatus(err.message ?? 'Video export failed.');
  } finally {
    exportVideoBtn.disabled = false;
  }
});

// ---------------------------------------------------------------- tile magnetism

initTileMagnetism(shapeGrid, fineHoverQuery);
initTileMagnetism(expressionGrid, fineHoverQuery);

// ---------------------------------------------------------------- hidden Konami-code easter egg

initKonami(() => {
  if (reduceMotion.matches) {
    setStatus('You found it. (Motion is reduced, so the light show stays off.)');
    return;
  }
  const savedColors = [...state.colors];
  const savedAngle = state.angle;
  const savedAnimate = state.animate;

  const toast = document.createElement('div');
  toast.className = 'konami-toast';
  toast.textContent = '✨ You found it.';
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('is-visible'));

  state.colors = ['#e8483f', '#f08a24', '#f0b429', '#3ecf8e', '#3b93f0', '#8b5cf6', '#e152b0'];
  state.animate = true;
  renderChips();
  refreshFill();

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 400);
    state.colors = savedColors;
    state.angle = savedAngle;
    state.animate = savedAnimate;
    angleSlider.value = String(state.angle);
    animateToggle.checked = state.animate;
    renderChips();
    refreshFill();
    syncUrl();
  }, 5000);
});
