// scene.js — infrastructure graph + scroll-driven camera.
//
// Deliberately free of DOM and window references so the exact same module runs
// inside a Web Worker (driving an OffscreenCanvas) or, when that isn't
// available, on the main thread. Everything environment-specific — size, device
// pixel ratio, scroll position, pointer, HUD output — is injected by the host.

import * as THREE from './vendor/three/build/three.module.min.js';
import { EffectComposer } from './vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/three/examples/jsm/postprocessing/OutputPass.js';

// Dedicated workers expose requestAnimationFrame in current Chrome and Firefox,
// but not everywhere. Fall back to a timer so the worker path still animates.
const raf = typeof requestAnimationFrame === 'function'
  ? (cb) => requestAnimationFrame(cb)
  : (cb) => setTimeout(cb, 16);

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ANCHORS = [
  { pos: [0, 1, 38],     look: [0, 0, 0] },
  { pos: [-18, 8, 22],   look: [-4, 2, 4] },
  { pos: [28, -2, 8],    look: [4, 0, -8] },
  { pos: [-22, -6, -18], look: [0, 2, -8] },
  { pos: [8, 24, -14],   look: [0, 0, -16] },
  { pos: [-14, -4, -28], look: [0, 0, -22] },
  { pos: [0, 6, -50],    look: [0, 0, -30] },
].map(a => ({ pos: new THREE.Vector3(...a.pos), look: new THREE.Vector3(...a.look) }));

export function createScene(opts) {
  const { canvas, reduced = false, small = false, onHud = () => {} } = opts;

  let vw = Math.max(1, opts.width | 0);
  let vh = Math.max(1, opts.height | 0);
  let dpr = opts.dpr || 1;

  let useBloom = !small && !reduced;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !small,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x08111f, 0.012);

  const camera = new THREE.PerspectiveCamera(55, vw / vh, 0.1, 600);
  camera.position.set(0, 0, 30);

  const COLORS = {
    brass: new THREE.Color('#c7a25b'),
    brassDim: new THREE.Color('#8a7340'),
    cream: new THREE.Color('#e6dcc4'),
    ink: new THREE.Color('#3d4a6a'),
  };
  const ACCENTS = [COLORS.brass, COLORS.brassDim, COLORS.cream, COLORS.brass];

  scene.add(new THREE.AmbientLight(0x2a3550, 0.5));
  const key = new THREE.DirectionalLight(0xc7a25b, 0.45);
  key.position.set(20, 30, 20);
  scene.add(key);
  const rim = new THREE.PointLight(0x6a85b0, 0.5, 80);
  rim.position.set(-30, -10, -20);
  scene.add(rim);

  const sceneGroup = new THREE.Group();
  scene.add(sceneGroup);
  let CURRENT = null;

  // ---------- layout ----------
  function generateLayout(variant, rng) {
    const nodes = [];
    if (variant === 'rings') {
      for (let r = 0; r < 6; r++) {
        const z = 8 - r * 8, radius = 6 + (r % 3) * 3, count = 8 + r * 2;
        nodes.push({ pos: new THREE.Vector3(0, 0, z), size: 1.2, kind: 'core', accent: r % 4 });
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + r * 0.3;
          nodes.push({
            pos: new THREE.Vector3(Math.cos(a) * radius, Math.sin(a * 2) * 1.5, z + (rng() - 0.5) * 1.2),
            size: 0.4 + rng() * 0.4, kind: rng() < 0.3 ? 'service' : 'node', accent: r % 4,
          });
        }
      }
    } else if (variant === 'lattice') {
      const X = 5, Y = 3, Z = 7;
      for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) for (let z = 0; z < Z; z++) {
        const isCore = (x + y + z) % 5 === 0;
        nodes.push({
          pos: new THREE.Vector3(
            (x - (X - 1) / 2) * 5 + (rng() - 0.5) * 0.6,
            (y - (Y - 1) / 2) * 5 + (rng() - 0.5) * 0.6,
            (z - (Z - 1) / 2) * 6 + (rng() - 0.5) * 0.6),
          size: isCore ? 1.2 : 0.45 + rng() * 0.3,
          kind: isCore ? 'core' : 'node', accent: (x + z) % 4,
        });
      }
    } else {
      const clusters = [
        { c: new THREE.Vector3(0, 0, 4), r: 8, n: 14, accent: 0 },
        { c: new THREE.Vector3(-2, 0, -10), r: 10, n: 18, accent: 1 },
        { c: new THREE.Vector3(2, -2, -24), r: 9, n: 16, accent: 2 },
      ];
      clusters.forEach((cl) => {
        nodes.push({ pos: cl.c.clone(), size: 1.4, kind: 'core', accent: cl.accent });
        for (let i = 0; i < cl.n; i++) {
          const theta = rng() * Math.PI * 2;
          const phi = Math.acos(2 * rng() - 1);
          const r = cl.r * (0.4 + rng() * 0.6);
          nodes.push({
            pos: new THREE.Vector3(
              cl.c.x + r * Math.sin(phi) * Math.cos(theta),
              cl.c.y + r * Math.cos(phi) * 0.6,
              cl.c.z + r * Math.sin(phi) * Math.sin(theta)),
            size: 0.4 + rng() * 0.5,
            kind: rng() < 0.25 ? 'service' : 'node', accent: cl.accent,
          });
        }
      });
      for (let i = 0; i < 24; i++) {
        nodes.push({
          pos: new THREE.Vector3((rng() - 0.5) * 60, (rng() - 0.5) * 18, -30 + (rng() - 0.5) * 60),
          size: 0.25 + rng() * 0.3, kind: 'satellite', accent: Math.floor(rng() * 4),
        });
      }
    }

    const edges = [], dists = [];
    for (let i = 0; i < nodes.length; i++) {
      dists.length = 0;
      for (let j = i + 1; j < nodes.length; j++) {
        const d = nodes[i].pos.distanceTo(nodes[j].pos);
        if (d > 0.1 && d < 12) dists.push({ j, d });
      }
      dists.sort((a, b) => a.d - b.d);
      const k = nodes[i].kind === 'core' ? 5 : 2;
      for (let n = 0; n < Math.min(k, dists.length); n++) edges.push({ a: i, b: dists[n].j });
    }
    return { nodes, edges };
  }

  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) Array.isArray(o.material) ? o.material.forEach(m => m.dispose()) : o.material.dispose();
    });
    g.clear();
  }

  function buildLayout(variant) {
    disposeGroup(sceneGroup);
    const rng = mulberry32(1337);
    const { nodes, edges } = generateLayout(variant, rng);

    const nodeMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0x445577, metalness: 0.4, roughness: 0.5, flatShading: true }),
      nodes.length);
    const dummy = new THREE.Object3D();
    const tmpColor = new THREE.Color();
    nodes.forEach((n, i) => {
      dummy.position.copy(n.pos);
      dummy.scale.setScalar(n.size);
      dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);
      dummy.updateMatrix();
      nodeMesh.setMatrixAt(i, dummy.matrix);
      const accent = ACCENTS[n.accent];
      if (n.kind === 'core') tmpColor.copy(accent);
      else if (n.kind === 'service') tmpColor.copy(accent).lerp(COLORS.ink, 0.3);
      else tmpColor.copy(COLORS.ink).lerp(accent, 0.15);
      nodeMesh.setColorAt(i, tmpColor);
    });
    nodeMesh.instanceMatrix.needsUpdate = true;
    nodeMesh.instanceColor.needsUpdate = true;
    sceneGroup.add(nodeMesh);

    const coreHalos = new THREE.Group();
    const haloGeom = new THREE.SphereGeometry(1, 12, 12);
    nodes.forEach((n) => {
      if (n.kind !== 'core') return;
      const halo = new THREE.Mesh(haloGeom, new THREE.MeshBasicMaterial({
        color: ACCENTS[n.accent], transparent: true, opacity: 0.06,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      halo.position.copy(n.pos);
      halo.userData.radius = n.size * 1.6;
      halo.userData.phase = rng() * Math.PI * 2;
      halo.scale.setScalar(halo.userData.radius);
      coreHalos.add(halo);
    });
    sceneGroup.add(coreHalos);

    const edgePositions = new Float32Array(edges.length * 6);
    const edgeColors = new Float32Array(edges.length * 6);
    edges.forEach((e, i) => {
      const a = nodes[e.a].pos, b = nodes[e.b].pos;
      edgePositions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
      const ca = ACCENTS[nodes[e.a].accent], cb = ACCENTS[nodes[e.b].accent];
      edgeColors.set([ca.r * .55, ca.g * .55, ca.b * .55, cb.r * .55, cb.g * .55, cb.b * .55], i * 6);
    });
    const edgeGeom = new THREE.BufferGeometry();
    edgeGeom.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgeGeom.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));
    sceneGroup.add(new THREE.LineSegments(edgeGeom, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.32,
      blending: THREE.AdditiveBlending, depthWrite: false })));

    const packetMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      edges.length);
    const packets = [];
    for (let ei = 0; ei < edges.length; ei++) {
      packets.push({ edge: ei, t: rng(), speed: 0.12 + rng() * 0.25, size: 0.35 + rng() * 0.8 });
      // colours never change — set once, not every frame
      packetMesh.setColorAt(ei, ACCENTS[nodes[edges[ei].a].accent]);
    }
    if (packetMesh.instanceColor) packetMesh.instanceColor.needsUpdate = true;

    const starCount = small ? 200 : 380;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const base = new THREE.Color(0x7a8499);
    for (let i = 0; i < starCount; i++) {
      const r = 80 + rng() * 200, th = rng() * Math.PI * 2, ph = Math.acos(2 * rng() - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.cos(ph);
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 50;
      const b = 0.25 + rng() * 0.55;
      starCol[i * 3] = base.r * b; starCol[i * 3 + 1] = base.g * b; starCol[i * 3 + 2] = base.b * b;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(starGeom, new THREE.PointsMaterial({
      size: 0.5, vertexColors: true, transparent: true, opacity: 0.55,
      sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sceneGroup.add(stars);
    sceneGroup.add(packetMesh);

    CURRENT = { nodes, edges, packets, packetMesh, coreHalos: coreHalos.children, stars };
    onHud({ nodes: nodes.length });
  }

  // ---------- post-processing ----------
  let composer = null;
  function buildComposer() {
    if (composer) { composer.dispose(); composer = null; }
    if (!useBloom) return;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(vw, vh), 0.32, 0.55, 0.55));
    composer.addPass(new OutputPass());
    composer.setSize(vw, vh);
  }

  function applySize(w, h, ratio) {
    w = Math.max(1, w | 0); h = Math.max(1, h | 0);
    if (ratio) dpr = ratio;
    if (w === vw && h === vh && !ratio) return;
    vw = w; vh = h;
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(vw, vh, false);
    if (composer) composer.setSize(vw, vh);
  }

  renderer.setPixelRatio(dpr);
  renderer.setSize(vw, vh, false);
  buildComposer();

  // ---------- camera ----------
  const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
  const camPos = new THREE.Vector3().copy(ANCHORS[0].pos);
  const camLook = new THREE.Vector3().copy(ANCHORS[0].look);
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  // frame-rate independent: a flat lerp factor runs 2x fast at 120Hz
  const damp = (rate, dt) => 1 - Math.pow(1 - rate, dt * 60);

  let scrollT = 0, mouseX = 0, mouseY = 0, px = 0, py = 0;

  function updateCamera(t, dt) {
    const segments = ANCHORS.length - 1;
    const s = t * segments;
    const i = Math.min(Math.floor(s), segments - 1);
    const local = easeInOut(s - i);
    tmpPos.lerpVectors(ANCHORS[i].pos, ANCHORS[i + 1].pos, local);
    tmpLook.lerpVectors(ANCHORS[i].look, ANCHORS[i + 1].look, local);
    camPos.lerp(tmpPos, damp(0.08, dt));
    camLook.lerp(tmpLook, damp(0.08, dt));
  }

  // ---------- loop ----------
  const clock = new THREE.Clock();
  const pDummy = new THREE.Object3D();
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pP = new THREE.Vector3();
  let time = 0, throughputCounter = 0, throughputDisplay = 0, hudTimer = 0;
  let frames = 0, frameAccum = 0, degraded = 0;
  let running = false, lost = false;

  function renderFrame() {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function frame() {
    if (!running) return;
    raf(frame);
    if (lost) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;

    updateCamera(scrollT, dt);
    px += (mouseX * 1.6 - px) * damp(0.05, dt);
    py += (-mouseY * 1.0 - py) * damp(0.05, dt);
    camera.position.set(camPos.x + px, camPos.y + py, camPos.z);
    camera.lookAt(camLook);

    sceneGroup.rotation.y = Math.sin(time * 0.05) * 0.1 + scrollT * Math.PI * 0.15;

    if (CURRENT) {
      const halos = CURRENT.coreHalos;
      for (let i = 0; i < halos.length; i++) {
        const h = halos[i];
        h.scale.setScalar(h.userData.radius * (1 + Math.sin(time * 1.5 + h.userData.phase) * 0.15));
        h.material.opacity = 0.04 + Math.sin(time * 1.2 + h.userData.phase) * 0.025;
      }
      CURRENT.stars.rotation.y = time * 0.005;

      const pk = CURRENT.packets, nodes = CURRENT.nodes, edges = CURRENT.edges;
      for (let i = 0; i < pk.length; i++) {
        const p = pk[i];
        p.t += p.speed * dt;
        if (p.t > 1) { p.t -= 1; throughputCounter++; }
        const e = edges[p.edge];
        pA.copy(nodes[e.a].pos); pB.copy(nodes[e.b].pos);
        pP.lerpVectors(pA, pB, p.t);
        pDummy.position.copy(pP);
        pDummy.scale.setScalar(p.size);
        pDummy.updateMatrix();
        CURRENT.packetMesh.setMatrixAt(i, pDummy.matrix);
      }
      CURRENT.packetMesh.instanceMatrix.needsUpdate = true;
    }

    hudTimer += dt;
    throughputDisplay += (throughputCounter / Math.max(dt, 0.001) - throughputDisplay) * damp(0.05, dt);
    throughputCounter = 0;
    if (hudTimer > 0.12) { hudTimer = 0; onHud({ throughput: Math.round(throughputDisplay) }); }

    renderFrame();

    if (degraded < 2) {
      frames++; frameAccum += dt;
      if (frames >= 90) {
        const avg = frameAccum / frames;
        frames = 0; frameAccum = 0;
        if (avg > 0.024) {            // sustained sub-42fps
          degraded++;
          if (useBloom) { useBloom = false; buildComposer(); }
          else { dpr = Math.max(1, dpr - 0.5); applySize(vw, vh, dpr); }
        }
      }
    }
  }

  if (canvas.addEventListener) {
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; }, false);
    canvas.addEventListener('webglcontextrestored', () => {
      lost = false; buildComposer(); clock.getDelta();
    }, false);
  }

  buildLayout('network');

  return {
    start() {
      if (reduced) {
        // honour the OS setting: one still frame, no loop
        updateCamera(0, 1);
        camera.position.copy(camPos);
        camera.lookAt(camLook);
        renderFrame();
        return;
      }
      if (running) return;
      running = true;
      clock.getDelta();
      raf(frame);
    },
    stop() { running = false; },
    setSize(w, h, ratio) { applySize(w, h, ratio); },
    setScroll(t) { scrollT = t < 0 ? 0 : t > 1 ? 1 : t; },
    setPointer(x, y) { mouseX = x; mouseY = y; },
    setMetaphor(v) { buildLayout(['network', 'rings', 'lattice'].includes(v) ? v : 'network'); },
  };
}
