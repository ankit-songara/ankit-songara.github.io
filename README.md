# Portfolio — Ankit Songara

Personal portfolio site. Backend engineer at Razorpay.

**Live:** [ankit-songara.github.io](https://ankit-songara.github.io)

## Stack

- HTML / CSS / vanilla JS
- [three.js](https://threejs.org) + WebGL — animated node-network background
- Single self-contained HTML bundle (no build step, no server)
- Deployed via GitHub Pages

## Features

- Animated WebGL background (node-network metaphor for distributed systems)
- Section-based scroll navigation with live HUD telemetry (scroll %, active section, node count, throughput)
- Right-side dot navigator + top nav bar
- Sections: Hero · About · Experience · Projects · Skills · Education · Contact
- Mobile-responsive
- OG / Twitter meta tags for link previews
- Locked 60 fps scroll performance (no `backdrop-filter` blur, rAF-throttled scroll handler, cached `offsetTop` reads)

## Local preview

Single file. Just open in a browser:

```bash
# macOS / Linux
open index.html

# Windows
start index.html
```

No build step, no dependencies. Page self-unpacks compressed assets via `DecompressionStream`.

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
