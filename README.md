# Portfolio — Ankit Songara

Personal portfolio site. Backend engineer at Razorpay.

**Live:** [ankit-songara.github.io](https://ankit-songara.github.io)

## Stack

- HTML / CSS / vanilla JS
- [three.js](https://threejs.org) + WebGL — animated node-network background, loaded
  from unpkg via an import map
- Fonts (Newsreader, JetBrains Mono) from Google Fonts
- Single hand-written HTML file, ~57 KB (no build step, no server)
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

No build step. Everything is in `index.html`; three.js and the web fonts are
fetched from their CDNs at runtime, so the background scene needs a network
connection (the page degrades to its CSS gradient background without one).

## Deploy

Pushed to `main` → GitHub Pages auto-builds.

```bash
git add index.html
git commit -m "update"
git push
```

Live in ~60 s.

## Contact

- Email: [ankitsongara251@gmail.com](mailto:ankitsongara251@gmail.com)
- LinkedIn: [/in/ankit-songara](https://linkedin.com/in/ankit-songara)
- GitHub: [@ankit-songara](https://github.com/ankit-songara)
