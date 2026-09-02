import { blendExpression } from './expressions.js';
import { blinkScale, eyePoses, liveliness } from './face.js';
import { clamp, easings, lerp, r2 } from './math.js';
import { blend, capsulePath, closedPath, radiusAtAngle, silhouette, toPoints } from './shape.js';

const NO_LOOK = { yaw: 0, pitch: 0, mix: 0, spin: 0, wander: 1 };
const lerpLook = (a, b, t) => ({
  yaw: lerp(a.yaw, b.yaw, t),
  pitch: lerp(a.pitch, b.pitch, t),
  mix: lerp(a.mix, b.mix, t),
  spin: lerp(a.spin, b.spin, t),
  wander: lerp(a.wander, b.wander, t)
});

const MORPH = 0.45;
const LOOK_MORPH = 0.24;

/**
 * A clockless engine: `sample(t)` is a pure function of time. Pause, resume,
 * scrub and export-at-an-arbitrary-frame all just work because nothing is
 * remembered except *when* the last change happened.
 */
export class KloudEngine {
  constructor(scale = 100, radii, expression) {
    this.scale = scale;
    this.shape = radii;
    this.shapePrev = null;
    this.shapeAt = -10;
    this.expr = expression;
    this.exprPrev = null;
    this.exprAt = -10;
    this.look = NO_LOOK;
    this.lookPrev = NO_LOOK;
    this.lookAt = -10;
    this.pts = [];
  }

  setShape(radii, now = 0) {
    if (radii === this.shape) return;
    this.shapePrev = this.shape;
    this.shape = radii;
    this.shapeAt = now;
  }

  setExpression(expression, now = 0) {
    if (expression === this.expr) return;
    this.exprPrev = this.expr;
    this.expr = expression;
    this.exprAt = now;
  }

  setLook(look, now, morph = LOOK_MORPH) {
    if (look && !Number.isFinite(look.yaw + look.pitch + look.mix + look.spin + look.wander)) return;
    this.lookPrev = this.lookAtTime(now);
    this.look = look ?? NO_LOOK;
    this.lookAt = now;
    this.lookMorph = morph;
  }

  shapeAtTime(now) {
    const to = this.shape;
    const from = this.shapePrev;
    if (!to || !from) return to;
    const k = (now - this.shapeAt) / MORPH;
    if (k >= 1) return to;
    const t = easings.easeOutQuint(clamp(k));
    return to.map((r, i) => lerp(from[i] ?? r, r, t));
  }

  exprAtTime(now) {
    const to = this.expr;
    const from = this.exprPrev;
    if (!to || !from) return to;
    const k = (now - this.exprAt) / MORPH;
    if (k >= 1) return to;
    return blendExpression(from, to, easings.easeOutQuint(clamp(k)));
  }

  lookAtTime(now) {
    const k = (now - this.lookAt) / (this.lookMorph ?? LOOK_MORPH);
    if (k >= 1) return this.look;
    return lerpLook(this.lookPrev, this.look, easings.easeOutQuint(clamp(k)));
  }

  sample(now, opts = {}) {
    const R = this.scale;
    const shape = this.shapeAtTime(now);
    const expr = this.exprAtTime(now);
    const look = this.lookAtTime(now);
    const life = liveliness(now, {
      wander: look.wander,
      blink: opts.blink !== false,
      float: opts.float !== false
    });

    const gaze = {
      yaw: lerp(expr.gaze.yaw, look.yaw, look.mix) + life.dYaw - look.spin,
      pitch: lerp(expr.gaze.pitch, look.pitch, look.mix) + life.dPitch,
      roll: expr.gaze.roll + life.dRoll
    };

    const sil = silhouette(shape, { sy: life.breath, cx: life.driftX, cy: life.driftY });
    const bodyPath = closedPath(toPoints(sil, R, this.pts));

    const bodyRadius = (x, y) => radiusAtAngle(shape, Math.atan2(y, x));

    const eyes = [];
    const poses = eyePoses(gaze, R, expr.split);
    for (let i = 0; i < 2; i++) {
      const e = poses[i];
      if (e.depth <= 0.02) continue;
      const cfg = expr.eyes[i];
      const fit = bodyRadius(e.x, e.y);
      const phi = ((cfg.tilt ?? 0) * Math.PI) / 180;
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const ax = e.a * cp + e.c * sp;
      const ay = e.b * cp + e.d * sp;
      const cx2 = -e.a * sp + e.c * cp;
      const cy2 = -e.b * sp + e.d * cp;
      const k = blinkScale(Math.min(life.lid, cfg.open));
      const ex = e.x * fit + sil.cx * R;
      const ey = e.y * fit + sil.cy * R;
      const m = [r2(ax), r2(ay * k), r2(cx2), r2(cy2 * k), r2(ex), r2(ey)];
      eyes.push({
        d: capsulePath(cfg.w * R, cfg.h * R),
        matrix: `matrix(${m.join(',')})`,
        m,
        alpha: clamp(e.depth / 0.12)
      });
    }

    return { bodyPath, eyes };
  }
}
