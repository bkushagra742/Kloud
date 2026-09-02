import { gradientStops, luminance } from './colors.js';

export const VIEWBOX_HALF = 130;

/** Picks a readable eye colour against the current fill — light body -> dark eyes, and back. */
export function autoEyeColor(colors) {
  const avg = colors.reduce((s, c) => s + luminance(c), 0) / Math.max(colors.length, 1);
  return avg > 0.42 ? '#0a0a0c' : '#f7f7f5';
}

/**
 * Builds (or refreshes) the gradient `<defs>` used for the body fill.
 * A single colour is just a flat fill: no gradient element needed.
 */
export function paintFill(defsEl, gradId, colors, { angle = 35, animate = false } = {}) {
  if (colors.length <= 1) return colors[0] ?? '#0a0a0c';

  let grad = defsEl.querySelector(`#${gradId}`);
  if (!grad) {
    grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', gradId);
    grad.setAttribute('gradientUnits', 'objectBoundingBox');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '1');
    grad.setAttribute('y2', '1');
    defsEl.appendChild(grad);
  }

  const rad = (angle * Math.PI) / 180;
  grad.setAttribute('x1', String(0.5 - Math.cos(rad) * 0.5));
  grad.setAttribute('y1', String(0.5 - Math.sin(rad) * 0.5));
  grad.setAttribute('x2', String(0.5 + Math.cos(rad) * 0.5));
  grad.setAttribute('y2', String(0.5 + Math.sin(rad) * 0.5));

  grad.innerHTML = '';
  for (const stop of gradientStops(colors)) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    s.setAttribute('offset', `${stop.offset}%`);
    s.setAttribute('stop-color', stop.color);
    grad.appendChild(s);
  }

  if (animate) {
    const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
    anim.setAttribute('attributeName', 'gradientTransform');
    anim.setAttribute('type', 'rotate');
    anim.setAttribute('from', '0 0.5 0.5');
    anim.setAttribute('to', '360 0.5 0.5');
    anim.setAttribute('dur', '14s');
    anim.setAttribute('repeatCount', 'indefinite');
    grad.appendChild(anim);
  } else {
    grad.querySelectorAll('animateTransform').forEach((n) => n.remove());
    grad.removeAttribute('gradientTransform');
  }

  return `url(#${gradId})`;
}

/** Paints one sampled frame onto the given SVG elements. */
export function paintFrame(els, frame, eyeColor) {
  els.body.setAttribute('d', frame.bodyPath);
  frame.eyes.forEach((eye, i) => {
    const el = els.eyes[i];
    if (!el) return;
    el.setAttribute('d', eye.d);
    el.setAttribute('transform', eye.matrix);
    el.setAttribute('fill', eyeColor);
    el.setAttribute('opacity', String(eye.alpha));
  });
}
