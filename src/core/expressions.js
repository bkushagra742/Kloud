// Kloud's face is only ever two capsules — no mouth. Every expression is
// four levers: head orientation (gaze), eye spacing (split), eye
// proportions, and each eye's own tilt. Mirrored tilts (tops converging or
// diverging) are what read as anger or sadness with no mouth at all.

import { EYE_H, EYE_SPLIT, EYE_W, REST_GAZE } from './face.js';
import { lerp } from './math.js';

const eye = (w, h, tilt = 0, open = 1) => ({ w, h, tilt, open });
const pair = (w, h, tilt = 0, open = 1) => [eye(w, h, tilt, open), eye(w, h, -tilt, open)];

export const EXPRESSIONS = [
  { id: 'neutral', label: 'Neutral', gaze: { ...REST_GAZE }, split: EYE_SPLIT, eyes: [eye(EYE_W, EYE_H), eye(EYE_W, EYE_H)] },
  { id: 'focused', label: 'Focused', gaze: { yaw: 4, pitch: 5, roll: -4 }, split: 16, eyes: pair(0.21, 0.44) },
  { id: 'surprised', label: 'Surprised', gaze: { yaw: 3, pitch: -3, roll: 0 }, split: 19, eyes: pair(0.45, 0.47) },
  { id: 'excited', label: 'Excited', gaze: { yaw: 6, pitch: -14, roll: 0 }, split: 19.5, eyes: pair(0.4, 0.56, -10) },
  { id: 'happy', label: 'Happy', gaze: { yaw: 5, pitch: 9, roll: 0 }, split: 17, eyes: pair(0.27, 0.17, 14) },
  { id: 'joyful', label: 'Joyful', gaze: { yaw: 4, pitch: 14, roll: 0 }, split: 18, eyes: pair(0.34, 0.13, 20) },
  { id: 'angry', label: 'Angry', gaze: { yaw: 3, pitch: 7, roll: 0 }, split: 17, eyes: pair(0.34, 0.15, 30) },
  { id: 'sad', label: 'Sad', gaze: { yaw: 3, pitch: -13, roll: 0 }, split: 16, eyes: pair(0.22, 0.4, -28) },
  { id: 'scared', label: 'Scared', gaze: { yaw: 2, pitch: -20, roll: 0 }, split: 20.5, eyes: pair(0.4, 0.6) },
  { id: 'suspicious', label: 'Suspicious', gaze: { yaw: 12, pitch: 6, roll: -6 }, split: 16, eyes: [eye(0.21, 0.4), eye(0.22, 0.15)] },
  { id: 'confused', label: 'Confused', gaze: { yaw: -14, pitch: 3, roll: 8 }, split: 16.5, eyes: [eye(0.2, 0.44, -18), eye(0.28, 0.17, 14)] },
  { id: 'curious', label: 'Curious', gaze: { yaw: 16, pitch: -9, roll: -15 }, split: 16.5, eyes: [eye(0.24, 0.46, -8), eye(0.2, 0.38, -8)] },
  { id: 'proud', label: 'Proud', gaze: { yaw: 5, pitch: 17, roll: 0 }, split: 17, eyes: pair(0.3, 0.15, 18) },
  { id: 'shy', label: 'Shy', gaze: { yaw: -19, pitch: -14, roll: -7 }, split: 14, eyes: pair(0.17, 0.3) },
  { id: 'unimpressed', label: 'Unimpressed', gaze: { yaw: -22, pitch: 2, roll: 0 }, split: 16, eyes: pair(0.3, 0.12) },
  { id: 'sleepy', label: 'Sleepy', gaze: { yaw: 6, pitch: -9, roll: -3 }, split: 16, eyes: pair(0.2, 0.42, 0, 0.42) },
  // new to Kloud
  { id: 'wink', label: 'Wink', gaze: { yaw: 6, pitch: 6, roll: -3 }, split: 17, eyes: [eye(0.26, 0.16, 8), eye(0.05, 0.42, 0)] },
  { id: 'love', label: 'Love', gaze: { yaw: 0, pitch: 8, roll: 0 }, split: 18, eyes: pair(0.42, 0.42, 45) },
  { id: 'dizzy', label: 'Dizzy', gaze: { yaw: 10, pitch: 4, roll: 18 }, split: 17.5, eyes: pair(0.3, 0.3, 40) }
];

export const EXPRESSION_BY_ID = new Map(EXPRESSIONS.map((e) => [e.id, e]));
export const DEFAULT_EXPRESSION = 'neutral';

const lerpEyeCfg = (a, b, t) => ({
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  tilt: lerp(a.tilt ?? 0, b.tilt ?? 0, t),
  open: lerp(a.open, b.open, t)
});

export function blendExpression(a, b, t) {
  return {
    id: b.id,
    gaze: {
      yaw: lerp(a.gaze.yaw, b.gaze.yaw, t),
      pitch: lerp(a.gaze.pitch, b.gaze.pitch, t),
      roll: lerp(a.gaze.roll, b.gaze.roll, t)
    },
    split: lerp(a.split, b.split, t),
    eyes: [lerpEyeCfg(a.eyes[0], b.eyes[0], t), lerpEyeCfg(a.eyes[1], b.eyes[1], t)]
  };
}
