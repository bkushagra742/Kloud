// Kloud replaces the fixed colour-swatch list with a real picker: any number
// of colours, blended smoothly across the shape. A single colour still works
// exactly like a flat fill; two or more become a soft multi-stop gradient
// that can gently drift, Gemini-style, when animation is enabled.

/** A handful of good starting points for the picker — not a locked palette. */
export const PRESET_COLORS = [
  '#0a0a0c', '#3b93f0', '#8b5cf6', '#e152b0',
  '#e8483f', '#f08a24', '#f0b429', '#3ecf8e',
  '#2fbfa0', '#a3a3a3', '#f1efe9', '#8b5e3c'
];

export const DEFAULT_COLORS = ['#f2f2f0'];

export function mixHex(from, to, t) {
  const parse = (h) => {
    const v = parseInt(h.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  const a = parse(from);
  const b = parse(to);
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export function isValidHex(h) {
  return /^#([0-9a-f]{6})$/i.test(h);
}

/** Even-spaced stop offsets (as %) for N colours. */
export function gradientStops(colors) {
  if (colors.length <= 1) return [{ color: colors[0] ?? '#0a0a0c', offset: 0 }];
  return colors.map((color, i) => ({ color, offset: (i / (colors.length - 1)) * 100 }));
}

/** Relative luminance, used to decide whether UI text over a colour should be light or dark. */
export function luminance(hex) {
  const v = parseInt(hex.slice(1), 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
