# Portfolio — Ankit Songara

Personal portfolio site. Backend engineer at Razorpay.

**Live:** [ankit-songara.github.io](https://ankit-songara.github.io)

## Stack

- HTML / CSS / vanilla JS
- [three.js](https://threejs.org) + WebGL — animated node-network background,
  rendered in a Web Worker via OffscreenCanvas so it never blocks the main thread
  (vendored in `vendor/`; falls back to the main thread where that's unsupported)
- Fonts (Newsreader, JetBrains Mono) self-hosted in `fonts/` as woff2 subsets,
  preloaded, with a metric-matched Georgia fallback so the swap doesn't reflow
- `index.html` (~49 KB) + `scene.js` + `scene.worker.js` — no build step, no server
- No third-party requests at runtime; everything is served from this origin
- Deployed via GitHub Pages

## Features

- Animated WebGL background (node-network metaphor for distributed systems)
- Section-based scroll navigation with live HUD telemetry (scroll %, active section, node count, throughput)
- Right-side dot navigator + top nav bar
- Sections: Hero · About · Experience · Projects · Skills · Education · Contact
- Mobile-responsive
- OG / Twitter meta tags for link previews
- Scroll-reveal animations, gated so the page stays readable without JavaScript
- Respects `prefers-reduced-motion` (animations off, scene renders one static frame)
- Adaptive WebGL quality: bloom is skipped on small screens and dropped
  automatically if frame times slip
- rAF-throttled scroll handler, cached `offsetTop` reads (recomputed after web
  fonts swap in), no per-frame layout reads, no `backdrop-filter` blur

## Local preview

Single file. Just open in a browser:

```bash
# macOS / Linux
open index.html

# Windows
start index.html
```

No build step and no network dependency -- fonts, three.js and the scene are all
served from this repo. Markup and styles live in `index.html`; the WebGL scene is
`scene.js`, hosted either by `scene.worker.js` (preferred) or the main thread.

Note that `file://` won't work for the worker path because of module/worker
origin rules -- serve the folder over HTTP to test it, e.g. `npx serve`.

## Deploy

Pushed to `main` → GitHub Pages auto-builds.

```bash
git add index.html
git commit -m "update"
git push
```

Lighthouse, median of 5 runs each:

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Desktop | 100 | 100 | 100 | 100 |
| Mobile | 99 | 100 | 100 | 100 |

Total Blocking Time is 0 ms desktop / ~20 ms mobile, and main-thread work is
~0.4 s desktop / ~1.1 s mobile, because the scene renders off-thread.

Live in ~60 s.

## Contact

- Email: [ankitsongara251@gmail.com](mailto:ankitsongara251@gmail.com)
- LinkedIn: [/in/ankit-songara](https://linkedin.com/in/ankit-songara)
- GitHub: [@ankit-songara](https://github.com/ankit-songara)
