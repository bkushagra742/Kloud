import { gradientStops } from '../core/colors.js';
import { VIEWBOX_HALF } from '../core/render.js';
import { paintCanvasFrame } from './paint.js';

function download(blobOrUrl, filename) {
  const url = blobOrUrl instanceof Blob ? URL.createObjectURL(blobOrUrl) : blobOrUrl;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (blobOrUrl instanceof Blob) setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function exportPNG(frame, colors, eyeColor, size = 1024, filename = 'kloud.png') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  paintCanvasFrame(ctx, size, frame, colors, eyeColor);
  canvas.toBlob((blob) => blob && download(blob, filename), 'image/png');
}

export function buildStaticSVG(frame, colors, eyeColor, angleDeg = 35) {
  const half = VIEWBOX_HALF;
  let fill = colors[0] ?? '#0a0a0c';
  let defs = '';
  if (colors.length > 1) {
    const rad = (angleDeg * Math.PI) / 180;
    const x1 = (0.5 - Math.cos(rad) * 0.5) * 100;
    const y1 = (0.5 - Math.sin(rad) * 0.5) * 100;
    const x2 = (0.5 + Math.cos(rad) * 0.5) * 100;
    const y2 = (0.5 + Math.sin(rad) * 0.5) * 100;
    const stops = gradientStops(colors)
      .map((s) => `<stop offset="${s.offset}%" stop-color="${s.color}"/>`)
      .join('');
    defs = `<defs><linearGradient id="g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient></defs>`;
    fill = 'url(#g)';
  }
  const eyes = frame.eyes
    .map((e) => `<path d="${e.d}" transform="${e.matrix}" fill="${eyeColor}" opacity="${e.alpha}"/>`)
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half} ${-half} ${half * 2} ${half * 2}">` +
    `${defs}<path d="${frame.bodyPath}" fill="${fill}"/>${eyes}</svg>`
  );
}

export function exportSVG(frame, colors, eyeColor, filename = 'kloud.svg') {
  const svg = buildStaticSVG(frame, colors, eyeColor);
  download(new Blob([svg], { type: 'image/svg+xml' }), filename);
}

export async function copyPNGToClipboard(frame, colors, eyeColor, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  paintCanvasFrame(ctx, size, frame, colors, eyeColor);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return false;
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  return true;
}
