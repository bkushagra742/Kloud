// A short, first-run guided walkthrough. Runs once (localStorage flag),
// replayable from the About drawer. Each step spotlights a section and
// waits for the user to actually do the thing, rather than clicking
// "Next" through slides — Kloud narrates from a fixed bar at the bottom
// while the spotlight moves between sections above it.

const DONE_KEY = 'kloud-tour-done';

const STEPS = [
  {
    target: '#shape',
    text: "Hi, I'm Kloud. Let's build a face — pick any shape.",
    waitFor: 'kloud:shape-selected'
  },
  {
    target: '#expression',
    text: 'Now give it a feeling — try Happy, or whatever fits.',
    waitFor: 'kloud:expression-selected'
  },
  {
    target: '#palette',
    text: "What's your favourite colour? Pick one, or add a few for a gradient.",
    waitFor: 'kloud:colors-changed'
  },
  {
    target: '#export',
    text: 'When you like it, export it — PNG, SVG, video, or a link to share.',
    waitFor: null
  }
];

let highlight = null;
let callout = null;
let textEl = null;
let progressEl = null;
let nextBtn = null;
let stepIndex = 0;
let active = false;
let cleanupFns = [];

function build() {
  document.body.classList.add('kloud-tour-active');
  highlight = document.createElement('div');
  highlight.className = 'tour-highlight';
  highlight.setAttribute('aria-hidden', 'true');

  callout = document.createElement('div');
  callout.className = 'tour-callout';
  callout.setAttribute('role', 'dialog');
  callout.setAttribute('aria-label', 'Kloud walkthrough');
  callout.innerHTML = `
    <div class="tour-mark" aria-hidden="true"></div>
    <div class="tour-body">
      <p class="tour-text"></p>
      <div class="tour-controls">
        <button type="button" class="tour-skip">Skip tour</button>
        <div class="tour-right">
          <span class="tour-progress"></span>
          <button type="button" class="tour-next" hidden>Got it</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(highlight);
  document.body.appendChild(callout);

  textEl = callout.querySelector('.tour-text');
  progressEl = callout.querySelector('.tour-progress');
  nextBtn = callout.querySelector('.tour-next');

  callout.querySelector('.tour-skip').addEventListener('click', endTour);
  nextBtn.addEventListener('click', () => advance());
}

function positionHighlight(target) {
  const el = document.querySelector(target);
  if (!el || !highlight) return;
  const r = el.getBoundingClientRect();
  const pad = 10;
  highlight.style.top = `${r.top - pad}px`;
  highlight.style.left = `${r.left - pad}px`;
  highlight.style.width = `${r.width + pad * 2}px`;
  highlight.style.height = `${r.height + pad * 2}px`;
}

function showStep(i) {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];

  const step = STEPS[i];
  const el = document.querySelector(step.target);
  if (!el) {
    advance();
    return;
  }

  const reposition = () => positionHighlight(step.target);
  // Snap to the target's position immediately (even mid-scroll) instead of
  // waiting on a fixed delay disconnected from how long the scroll actually
  // takes — the scroll/resize listeners then keep it tracking in real time,
  // and the CSS transition on .tour-highlight smooths the motion between ticks.
  reposition();
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // rAF-batched: a raw scroll listener can fire many times per frame, and
  // each reposition() forces a layout read (getBoundingClientRect) — batching
  // to at most once per animation frame avoids piling up redundant reflows.
  let queued = false;
  const throttledReposition = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      reposition();
    });
  };
  window.addEventListener('scroll', throttledReposition, { passive: true });
  window.addEventListener('resize', throttledReposition);
  cleanupFns.push(() => window.removeEventListener('scroll', throttledReposition));
  cleanupFns.push(() => window.removeEventListener('resize', throttledReposition));

  textEl.textContent = step.text;
  progressEl.textContent = `${i + 1} / ${STEPS.length}`;
  nextBtn.hidden = !!step.waitFor;

  if (step.waitFor) {
    const handler = () => advance();
    document.addEventListener(step.waitFor, handler, { once: true });
    cleanupFns.push(() => document.removeEventListener(step.waitFor, handler));
  }
}

function advance() {
  stepIndex++;
  if (stepIndex >= STEPS.length) {
    endTour();
    return;
  }
  showStep(stepIndex);
}

function endTour() {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  active = false;
  document.body.classList.remove('kloud-tour-active');
  highlight?.remove();
  callout?.remove();
  highlight = null;
  callout = null;
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* private browsing or storage disabled — tour just won't remember it ran */
  }
}

export function startTour({ force = false } = {}) {
  if (active) return;
  if (!force) {
    try {
      if (localStorage.getItem(DONE_KEY)) return;
    } catch {
      /* if storage is unavailable, just run the tour every time */
    }
  }
  active = true;
  stepIndex = 0;
  build();
  showStep(0);
}
