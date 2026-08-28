// scene.worker.js — runs the WebGL background off the main thread.
//
// Handshake matters here: transferControlToOffscreen() is irreversible, so the
// main thread must not hand over the canvas until this worker has proved it can
// actually import three.js AND obtain a WebGL context. Only then do we post
// 'ready'. Anything else posts 'unsupported' and the page falls back to running
// the same scene module on the main thread with the canvas still intact.

let createScene = null;
let scene = null;

async function preflight() {
  // 1. can we get a WebGL context in a worker at all?
  const probe = new OffscreenCanvas(1, 1);
  const gl = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!gl) throw new Error('no worker webgl');
  const lose = gl.getExtension('WEBGL_lose_context');
  if (lose) lose.loseContext();

  // 2. does the scene module (and three.js) load here?
  ({ createScene } = await import('./scene.js'));
}

preflight().then(
  () => self.postMessage({ type: 'ready' }),
  (err) => self.postMessage({ type: 'unsupported', reason: String(err && err.message || err) })
);

self.onmessage = async (ev) => {
  const m = ev.data;

  if (m.type === 'init') {
    try {
      scene = createScene({
        canvas: m.canvas,
        width: m.width, height: m.height, dpr: m.dpr,
        reduced: m.reduced, small: m.small,
        onHud: (h) => self.postMessage({ type: 'hud', ...h }),
      });
      scene.start();
      self.postMessage({ type: 'running' });
    } catch (err) {
      // The canvas is already transferred by this point, so the page cannot take
      // it back. Report so the main thread can stop feeding us updates.
      self.postMessage({ type: 'failed', reason: String(err && err.message || err) });
    }
    return;
  }

  if (!scene) return;
  if (m.type === 'scroll') scene.setScroll(m.t);
  else if (m.type === 'pointer') scene.setPointer(m.x, m.y);
  else if (m.type === 'resize') scene.setSize(m.width, m.height, m.dpr);
  else if (m.type === 'metaphor') scene.setMetaphor(m.value);
  else if (m.type === 'stop') scene.stop();
};
