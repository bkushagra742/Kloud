import { PROFILE_SAMPLES } from './shape.js';
import {
  hullOfCircles,
  profileFromPolygon,
  regularPolygonProfile,
  starProfile,
  superellipseProfile,
  unionOfCirclesProfile
} from './shape.js';

/** Scales radii so the tallest point sits at `max` — keeps every shape the same visual weight. */
function normalize(radii, max = 1) {
  const peak = Math.max(...radii);
  if (peak <= 0) return radii;
  const k = max / peak;
  return radii.map((r) => r * k);
}

const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * Math.PI * 2);

const pebble = normalize(
  ANGLES.map((a) => 1 + 0.075 * Math.cos(2 * a + 0.5) + 0.035 * Math.cos(3 * a + 2.1)),
  1.02
);

const cloud = normalize(
  unionOfCirclesProfile([
    { x: -0.44, y: 0.2, r: 0.54 },
    { x: 0.46, y: 0.2, r: 0.5 },
    { x: 0.02, y: 0.3, r: 0.6 },
    { x: -0.24, y: -0.3, r: 0.48 },
    { x: 0.3, y: -0.24, r: 0.44 }
  ]),
  1.02
);

const droplet = normalize(profileFromPolygon(hullOfCircles(0, 0.28, 0.66, 0, -0.96, 0.05), 0, 0), 1.04);
const capsule = profileFromPolygon(hullOfCircles(-0.42, 0, 0.62, 0.42, 0, 0.62), 0, 0);

// --- new Kloud shapes --------------------------------------------------

/** Heart: two lobes on top, a point at the bottom, built the same way as the cloud. */
const heart = normalize(
  unionOfCirclesProfile([
    { x: -0.34, y: -0.22, r: 0.5 },
    { x: 0.34, y: -0.22, r: 0.5 },
    { x: 0, y: 0.1, r: 0.42 }
  ]).map((r, i) => {
    // pull the lower arc into a point instead of a rounded belly
    const a = ANGLES[i];
    const pull = Math.sin(a) > 0.15 ? 1 - (Math.sin(a) - 0.15) * 0.5 : 1;
    return r * pull;
  }),
  1.05
);

/** Diamond: a rotated, softly rounded square. */
const diamond = normalize(regularPolygonProfile(4, 1.1, 0.16, -45), 1.06);

/** Blob wave: gentle five-lobe organic wobble. */
const wave = normalize(
  ANGLES.map((a) => 1 + 0.09 * Math.sin(5 * a + 0.6) + 0.04 * Math.cos(2 * a + 1.4)),
  1.0
);

/** Six-point star, rounded. */
const star = normalize(starProfile(6, 1.12, 0.62, 0.14), 1.08);

/** Leaf: an elongated droplet rotated onto its side. */
const leaf = normalize(profileFromPolygon(hullOfCircles(-0.62, 0.1, 0.66, 0.7, -0.36, 0.06), 0, 0), 1.02);

/** Egg: an asymmetric oval, narrower at one end. */
const egg = normalize(ANGLES.map((a) => 1 + 0.32 * Math.cos(a) - 0.08 * Math.cos(2 * a)), 1.06);

/** Gem: a sharp, faceted kite-cut outline (deliberately not rounded). */
const gem = normalize(
  profileFromPolygon(
    [
      { x: 0, y: -1.15 },
      { x: 0.62, y: -0.35 },
      { x: 0.42, y: 0.55 },
      { x: 0, y: 1.05 },
      { x: -0.42, y: 0.55 },
      { x: -0.62, y: -0.35 }
    ],
    0,
    0
  ),
  1.05
);

/** Flower: six petals with no filled centre, so the scallops read clearly. */
const flower = normalize(
  unionOfCirclesProfile(
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return { x: Math.cos(a) * 0.52, y: Math.sin(a) * 0.52, r: 0.46 };
    })
  ),
  1.02
);

/** Blob: a higher-frequency wobble than pebble/wave — reads as more "gooey". */
const blob = normalize(
  ANGLES.map((a) => 1 + 0.065 * Math.sin(4 * a + 1.2) + 0.045 * Math.cos(7 * a + 0.4)),
  1.0
);

/** Arch: a rounded dome over a flat base. */
const arch = (() => {
  const a0 = -Math.PI * 0.89;
  const a1 = -Math.PI * 0.11;
  const verts = [];
  for (let i = 0; i <= 24; i++) {
    const a = a0 + (a1 - a0) * (i / 24);
    verts.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  verts.push({ x: Math.cos(a1), y: 0.78 });
  verts.push({ x: Math.cos(a0), y: 0.78 });
  return normalize(profileFromPolygon(verts, 0, 0), 1.02);
})();

/** Shield: a rounded pentagon. */
const shield = normalize(regularPolygonProfile(5, 1.08, 0.22, -90), 1.05);

// --- batch 2: 20 more shapes --------------------------------------------

const octagon = normalize(regularPolygonProfile(8, 1.05, 0.16, 22.5), 1.04);
const roundedSquare = normalize(regularPolygonProfile(4, 1.1, 0.3, 45), 1.06);

/** Cross: a symmetric plus/cross, faceted (sharp corners, matching Gem's style). */
const cross = (() => {
  const a = 0.34;
  const b = 1.0;
  const v = [
    { x: -a, y: -b }, { x: a, y: -b }, { x: a, y: -a }, { x: b, y: -a }, { x: b, y: a }, { x: a, y: a },
    { x: a, y: b }, { x: -a, y: b }, { x: -a, y: a }, { x: -b, y: a }, { x: -b, y: -a }, { x: -a, y: -a }
  ];
  return normalize(profileFromPolygon(v, 0, 0), 1.02);
})();

const trapezoid = normalize(
  profileFromPolygon([{ x: -0.55, y: -0.95 }, { x: 0.55, y: -0.95 }, { x: 1.0, y: 0.85 }, { x: -1.0, y: 0.85 }], 0, 0.1),
  1.04
);

/** House: a square base with a pointed roof. */
const house = normalize(
  profileFromPolygon(
    [{ x: 0, y: -1.15 }, { x: 0.9, y: -0.15 }, { x: 0.9, y: 0.95 }, { x: -0.9, y: 0.95 }, { x: -0.9, y: -0.15 }],
    0,
    0.15
  ),
  1.04
);

/** Kite: a simple faceted 4-point kite (distinct from Gem's 6-point hexagonal cut). */
const kite = normalize(
  profileFromPolygon([{ x: 0, y: -1.2 }, { x: 0.55, y: -0.15 }, { x: 0, y: 0.85 }, { x: -0.55, y: -0.15 }], 0, 0),
  1.04
);

// Star-family shapes deliberately keep a broad inner radius (rather than
// sharp, thin points) so the eyes always have a solid, wide core to sit in.
const sun = normalize(starProfile(9, 1.15, 0.68, 0.09, -90), 1.1);
const sparkle = normalize(starProfile(4, 1.2, 0.56, 0.07, -90), 1.1);
const compass = normalize(starProfile(8, 1.18, 0.62, 0.11, -90), 1.1);
const crown = normalize(starProfile(5, 1.22, 0.58, 0.08, -90), 1.1);

/** Marquise: a pointed-oval gem cut. */
const marquise = normalize(superellipseProfile(2.4, 0.6, 1.15), 1.08);

/** Amoeba: a chaotic, higher-frequency organic wobble than Blob. */
const amoeba = normalize(
  ANGLES.map((a) => 1 + 0.05 * Math.sin(5 * a + 0.3) + 0.035 * Math.sin(9 * a + 1.7) + 0.02 * Math.sin(13 * a + 0.9)),
  1.0
);

/** Splat: an irregular paint-splat, built from several overlapping circles. */
const splat = normalize(
  unionOfCirclesProfile([
    { x: -0.4, y: -0.3, r: 0.42 }, { x: 0.35, y: -0.35, r: 0.38 }, { x: 0.42, y: 0.28, r: 0.4 },
    { x: -0.15, y: 0.42, r: 0.36 }, { x: -0.45, y: 0.1, r: 0.3 }, { x: 0.05, y: -0.05, r: 0.5 }, { x: 0.15, y: 0.4, r: 0.25 }
  ]),
  1.02
);

/** Peanut: two overlapping circles, pinched at the waist. */
const peanut = normalize(unionOfCirclesProfile([{ x: -0.42, y: 0, r: 0.62 }, { x: 0.42, y: 0, r: 0.62 }]), 1.02);

/** Bean: an asymmetric kidney curve. */
const bean = normalize(unionOfCirclesProfile([{ x: -0.3, y: -0.15, r: 0.6 }, { x: 0.32, y: 0.18, r: 0.72 }]), 1.02);

/** Acorn: a domed top tapering to a single point at the bottom. */
const acorn = (() => {
  const a0 = -Math.PI * 0.89;
  const a1 = -Math.PI * 0.11;
  const verts = [];
  for (let i = 0; i <= 20; i++) {
    const a = a0 + (a1 - a0) * (i / 20);
    verts.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  verts.push({ x: 0, y: 1.15 });
  return normalize(profileFromPolygon(verts, 0, 0), 1.02);
})();

/** Onion: a plump domed bulb tapering to a short point, like a mosque dome. */
const onion = normalize(profileFromPolygon(hullOfCircles(0, 0.05, 0.78, 0, -0.85, 0.1), 0, 0), 1.04);

/** Bell: a domed top flaring out to a wider flat bottom. */
const bell = (() => {
  const a0 = -Math.PI * 0.95;
  const a1 = -Math.PI * 0.05;
  const verts = [];
  for (let i = 0; i <= 20; i++) {
    const a = a0 + (a1 - a0) * (i / 20);
    verts.push({ x: Math.cos(a) * 0.8, y: Math.sin(a) * 0.8 - 0.1 });
  }
  verts.push({ x: 1.05, y: 1.05 }, { x: -1.05, y: 1.05 });
  return normalize(profileFromPolygon(verts, 0, 0), 1.02);
})();

/** Daisy: ten small petals, more and finer than Flower's six. */
const daisy = normalize(
  unionOfCirclesProfile(
    Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return { x: Math.cos(a) * 0.58, y: Math.sin(a) * 0.58, r: 0.38 };
    })
  ),
  1.02
);

/** Clover: three large, heavily-overlapping lobes — a rounded trefoil. */
const clover = normalize(
  unionOfCirclesProfile(
    Array.from({ length: 3 }, (_, i) => {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      return { x: Math.cos(a) * 0.42, y: Math.sin(a) * 0.42, r: 0.66 };
    })
  ),
  1.02
);

export const SHAPES = [
  { id: 'circle', label: 'Circle', radii: new Array(PROFILE_SAMPLES).fill(1) },
  { id: 'pebble', label: 'Pebble', radii: pebble },
  { id: 'squircle', label: 'Squircle', radii: normalize(superellipseProfile(4.2), 1.15) },
  { id: 'capsule', label: 'Capsule', radii: capsule },
  { id: 'triangle', label: 'Triangle', radii: regularPolygonProfile(3, 1.12, 0.34, -90) },
  { id: 'hexagon', label: 'Hexagon', radii: regularPolygonProfile(6, 1.04, 0.26, 0) },
  { id: 'cloud', label: 'Cloud', radii: cloud },
  { id: 'droplet', label: 'Droplet', radii: droplet },
  { id: 'diamond', label: 'Diamond', radii: diamond },
  { id: 'heart', label: 'Heart', radii: heart },
  { id: 'star', label: 'Star', radii: star },
  { id: 'wave', label: 'Wave', radii: wave },
  { id: 'leaf', label: 'Leaf', radii: leaf },
  { id: 'egg', label: 'Egg', radii: egg },
  { id: 'gem', label: 'Gem', radii: gem },
  { id: 'flower', label: 'Flower', radii: flower },
  { id: 'blob', label: 'Blob', radii: blob },
  { id: 'arch', label: 'Arch', radii: arch },
  { id: 'shield', label: 'Shield', radii: shield },
  { id: 'octagon', label: 'Octagon', radii: octagon },
  { id: 'rounded-square', label: 'Rounded Square', radii: roundedSquare },
  { id: 'cross', label: 'Cross', radii: cross },
  { id: 'trapezoid', label: 'Trapezoid', radii: trapezoid },
  { id: 'house', label: 'House', radii: house },
  { id: 'kite', label: 'Kite', radii: kite },
  { id: 'sun', label: 'Sun', radii: sun },
  { id: 'sparkle', label: 'Sparkle', radii: sparkle },
  { id: 'compass', label: 'Compass', radii: compass },
  { id: 'crown', label: 'Crown', radii: crown },
  { id: 'marquise', label: 'Marquise', radii: marquise },
  { id: 'amoeba', label: 'Amoeba', radii: amoeba },
  { id: 'splat', label: 'Splat', radii: splat },
  { id: 'peanut', label: 'Peanut', radii: peanut },
  { id: 'bean', label: 'Bean', radii: bean },
  { id: 'acorn', label: 'Acorn', radii: acorn },
  { id: 'onion', label: 'Onion', radii: onion },
  { id: 'bell', label: 'Bell', radii: bell },
  { id: 'daisy', label: 'Daisy', radii: daisy },
  { id: 'clover', label: 'Clover', radii: clover }
];

export const SHAPE_BY_ID = new Map(SHAPES.map((s) => [s.id, s]));
export const DEFAULT_SHAPE = 'circle';
