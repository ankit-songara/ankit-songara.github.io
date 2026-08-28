# Portfolio — Ankit Songara

Personal portfolio site. Backend engineer at Razorpay.

**Live:** [ankit-songara.github.io](https://ankit-songara.github.io)

## Stack

- HTML / CSS / vanilla JS
- [three.js](https://threejs.org) + WebGL — animated node-network background, loaded
  from unpkg via an import map
- Fonts (Newsreader, JetBrains Mono) self-hosted in `fonts/` as woff2 subsets,
  preloaded, with a metric-matched Georgia fallback so the swap doesn't reflow
- Single hand-written HTML file, ~62 KB (no build step, no server)
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

No build step. Markup, styles and scripts all live in `index.html`; fonts are
served from `fonts/`. Only three.js is fetched at runtime (from unpkg), so the
background scene needs a network connection -- without one the page falls back
to its CSS gradient background and everything else works normally.

## Deploy

Pushed to `main` → GitHub Pages auto-builds.

```bash
git add index.html
git commit -m "update"
git push
```

Lighthouse (5 runs each): accessibility, best practices and SEO all 100.
Performance is desktop 61 (stable) and mobile 67-83 -- mobile is bimodal
depending on how the CDN fetch lands, not on anything in the page.
CLS is 0.00 on desktop and <=0.01 on mobile.

Live in ~60 s.

## Contact

- Email: [ankitsongara251@gmail.com](mailto:ankitsongara251@gmail.com)
- LinkedIn: [/in/ankit-songara](https://linkedin.com/in/ankit-songara)
- GitHub: [@ankit-songara](https://github.com/ankit-songara)
