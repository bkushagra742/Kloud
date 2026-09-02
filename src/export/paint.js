import { gradientStops } from '../core/colors.js';
import { VIEWBOX_HALF } from '../core/render.js';

/**
 * Draws one sampled frame onto a 2D canvas context, matching the SVG output
 * pixel-for-pixel. Using Path2D directly from the same path-data strings
 * means export never needs to rasterize the live SVG (slow, async) — it's
 * pure canvas drawing, so a multi-second video captures cleanly at 30fps.
 */
export function paintCanvasFrame(ctx, size, frame, colors, eyeColor, angleDeg = 35) {
  const s = size / (VIEWBOX_HALF * 2);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(s, s);

  const bodyPath = new Path2D(frame.bodyPath);
  if (colors.length <= 1) {
    ctx.fillStyle = colors[0] ?? '#0a0a0c';
  } else {
    const rad = (angleDeg * Math.PI) / 180;
    const r = VIEWBOX_HALF * 1.5;
    const g = ctx.createLinearGradient(
      -Math.cos(rad) * r, -Math.sin(rad) * r,
      Math.cos(rad) * r, Math.sin(rad) * r
    );
    for (const stop of gradientStops(colors)) g.addColorStop(stop.offset / 100, stop.color);
    ctx.fillStyle = g;
  }
  ctx.fill(bodyPath);

  for (const eye of frame.eyes) {
    ctx.save();
    ctx.transform(...eye.m);
    ctx.globalAlpha = eye.alpha;
    ctx.fillStyle = eyeColor;
    ctx.fill(new Path2D(eye.d));
    ctx.restore();
  }

  ctx.restore();
}
