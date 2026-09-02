import { paintCanvasFrame } from './paint.js';

/**
 * Records a few seconds of the live idle animation to WebM. Runs entirely on
 * an offscreen canvas at a fixed timestep, so the exported clip is smooth
 * and independent of the viewer's own frame rate.
 */
export function exportVideo(engine, colors, eyeColor, { seconds = 3, fps = 30, size = 720 } = {}) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(fps);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) =>
      window.MediaRecorder?.isTypeSupported?.(m)
    );
    if (!mime) {
      reject(new Error('Video recording is not supported in this browser.'));
      return;
    }
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kloud.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve();
    };
    recorder.onerror = (e) => reject(e.error ?? new Error('Recording failed'));

    recorder.start();
    const totalFrames = Math.round(seconds * fps);
    const startT = 1.1; // begin just before the first scheduled blink, for a lively loop
    let i = 0;

    const step = () => {
      if (i >= totalFrames) {
        recorder.stop();
        return;
      }
      const t = startT + i / fps;
      const frame = engine.sample(t);
      paintCanvasFrame(ctx, size, frame, colors, eyeColor);
      i++;
      setTimeout(step, 1000 / fps);
    };
    step();
  });
}
