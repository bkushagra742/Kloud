# Kloud

A tiny, expressive avatar you shape, colour and export — built around one
rule: **only two eyes, no mouth**. Everything it can express, it expresses
through where those two eyes sit, how they're shaped, and how the head is
tilted.

Made by **Kushagra Singh Bisht**.

- Instagram: [@bkushagra742](https://instagram.com/bkushagra742)
- LinkedIn: [bkushagra742](https://linkedin.com/in/bkushagra742)
- GitHub: [@bkushagra742](https://github.com/bkushagra742)

## What it is

- **39 shapes** — circle, pebble, squircle, capsule, triangle, hexagon,
  cloud, droplet, diamond, heart, star, wave, leaf, egg, gem, flower, blob,
  arch, shield, octagon, rounded square, cross, trapezoid, house, kite, sun,
  sparkle, compass, crown, marquise, amoeba, splat, peanut, bean, acorn,
  onion, bell, daisy, clover — each defined as a radial profile so any two
  shapes can morph smoothly into each other.
- **19 expressions** — all built from four levers: head yaw/pitch/roll, eye
  spacing, per-eye proportions, and per-eye tilt. Shape and expression are
  fully independent: any expression works on any shape, because eye size and
  position are automatically refit to the silhouette in that direction.
- **Any number of colours** — pick one for a flat fill, or several for a
  smooth multi-stop gradient across the shape, with an optional slow drift.
- **Idle life** — gentle drift, blinking, breathing, and the avatar's gaze
  follows your cursor.
- **Live preview while you scroll** — on mobile, once the main preview
  scrolls out of view it becomes a small pinned bubble you can drag anywhere
  on screen, so you can see the effect of every change without scrolling
  back up. Tap it (without dragging) to jump back to the full preview.
- **Export** — PNG, static SVG, a 3-second looping WebM video, copy straight
  to the clipboard, or a shareable permalink that encodes the full design in
  the URL.
- **Dark, sectioned UI** — a single scrolling page with a sticky preview,
  distinct labeled sections for Shape / Expression / Palette / Export, and a
  right-side About drawer with social links and a GitHub star button.
- **Surprise me** — a randomize button (top bar) that picks a random shape,
  expression, and 1–3 colours at once, with a little bounce on the preview.
- **Shareable links** — every change updates the URL (via `history.replaceState`,
  no page reload) so the current design is always bookmarkable/shareable as-is.
  There's also an explicit "Link" export button that copies it to your clipboard.
- **Custom cursor** — on desktop/laptop (real mouse, not touch), hovering the
  preview swaps in a small tracking ring instead of the system cursor.
- **Scroll-reveal** — each section fades and lifts in the first time it enters
  view, once per load.
- **Respects reduced motion** — if the visitor's OS has "reduce motion" on,
  all animation collapses to instant, no exceptions.
- **Open Graph / Twitter card** — sharing the link anywhere shows a proper
  title, description, and preview image instead of a bare URL.
- **First-run guided tour** — Kloud drops in with a little bounce, then a
  short spotlight walkthrough guides you through picking a shape, an
  expression, and a colour, advancing as you actually do each thing rather
  than by clicking "Next." Runs once (remembered per browser), replayable
  any time from the About drawer.
- **Dynamic favicon** — the browser tab icon updates to match whatever
  Kloud currently looks like.
- **Idle look-around** — leave the tab alone for 30 seconds and Kloud
  glances around on its own before settling back to neutral.
- **Live description for screen readers** — an `aria-live` region
  announces the current shape, expression, and colour in plain language
  as they change (debounced, so it doesn't spam updates while you're
  actively clicking through options).
- **Cursor magnetism** — on desktop, shape and expression tiles gently
  pull toward your cursor as it passes near them, dock-style.
- **A hidden shortcut** — try the classic ↑↑↓↓←→←→ B A sequence anywhere
  on the page.

## Running it locally

No build step — but **don't double-click `index.html`**. Kloud uses native
ES module imports, and browsers block those over the `file://` protocol
(you'll see a CORS error in the console and a blank preview). Serve the
folder instead:

```bash
npm run dev
# or: python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying

This only affects local double-clicking — every real static host serves
over `http(s)`, so it just works. A few options:

- **GitHub Pages**: push this folder to a repo, enable Pages on the `main`
  branch, done.
- **Vercel** / **Netlify**: drag-and-drop the folder onto their dashboard,
  or connect the GitHub repo — no build command needed, no framework preset,
  just a static site.

## Permalink format

The URL query string mirrors the full design: `?s=<shapeId>&e=<expressionId>&c=<hex,hex,...>&a=<angle>&m=<0|1>`
— e.g. `?s=star&e=happy&c=8b5cf6,3ecf8e&a=120&m=1`. Unknown or malformed
values are ignored and fall back to defaults, so a hand-edited or broken URL
never breaks the page.

`assets/og-image.png` is a static 1200×630 share preview. If you change the
brand colours/wordmark later, regenerate it by rendering the same layout
(gradient body + wordmark + tagline) at 1200×630 and re-exporting — there's
no build step tied to it, it's just a plain image file.

## Project layout

```
index.html                app shell — hero, sticky preview, sectioned panels, about drawer
src/styles.css             dark-theme UI styles (CSS-only contour background, no image assets)
src/app.js                 wiring: state, rendering loop, scroll-spy nav, drawer, exports
src/tour.js                 first-run guided walkthrough (spotlight + narration)
src/delight.js               favicon, live description, idle look-around, tile magnetism, Konami code
src/core/
  math.js                  shared math helpers (lerp, easing, noise)
  shape.js                 the geometry engine — radial-profile silhouettes, morphing, paths
  shapes.js                the 19-shape catalogue
  face.js                  pseudo-3D two-eye positioning + idle liveliness (blink/drift/breath)
  expressions.js            the 19-expression catalogue
  colors.js                 colour presets + multi-stop gradient math
  render.js                 SVG painting: gradient defs, per-frame body/eye updates
  engine.js                 KloudEngine — blends shape/expression/look over time, samples frames
src/export/
  paint.js                  shared canvas painter (used by PNG + video export)
  snapshot.js                PNG / static SVG export, clipboard copy
  video.js                   WebM video export via canvas + MediaRecorder
assets/favicon.svg          app icon
```

## How the engine works, briefly

Every shape is a **radial profile**: 64 radius samples at fixed angles around
a center. Because every shape uses the same angle grid, morphing between any
two shapes is just linearly interpolating their radii — no path-morphing
library needed.

Eyes are positioned with a small **pseudo-3D model**: the head is a unit
sphere, the two eyes sit at fixed angular offsets from wherever the head is
"looking," and their screen position/tilt/squash comes from that sphere's
tangent plane at each eye's location. This is what makes a single expression
definition (gaze angle + eye size/tilt) look correct and proportionate on
every differently-shaped body, automatically.

## Credits & licence

Kloud is an independent redesign that reuses ideas and portions of code from
an earlier MIT-licensed project by **Jérémy Perret** — specifically the
radial-profile shape-morphing technique and the two-eye pseudo-3D face model.
Kloud's UI, dark theme, colour system, additional shapes and expressions,
scroll-sectioned layout, and export pipeline are new work by Kushagra Singh
Bisht.

See [LICENSE](./LICENSE) for the full MIT notice — it carries both the
original copyright (as the MIT license requires) and Kushagra's copyright for
everything added on top. Full credit to Jérémy Perret's original work is
recorded there.
