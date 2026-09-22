// jsdom harness: loads the REAL index.html, then imports the REAL app.js
// (patched only to swap the CDN URL for a stub and to re-export internals).
//
// The stubs below exist because jsdom does not implement canvas, media capture
// or media playback. They are environment shims, not app behaviour — a failure
// caused by one of these is a harness limit, never an EcoScan SA defect.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const dom = new JSDOM(html, {
  url: "http://localhost:8080/",
  pretendToBeVisual: true,
  resources: undefined, // never fetch subresources
});
const { window } = dom;

/* ---------------------------------------------------------------- switches */
export const env = {
  gumBehaviour: "ok", // ok | deny | none | over | over-then-ok
  lastConstraints: null,
};

/* ---------------------------------------- records what the app actually draws */
export const drawn = { strokeRect: [], fillRect: [], fillText: [] };

/* ------------------------------------------------------- canvas (2d) stub */
const makeCtx = (canvas) => ({
  canvas,
  globalAlpha: 1, globalCompositeOperation: "source-over",
  fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, font: "10px sans-serif",
  textAlign: "start", textBaseline: "alphabetic", lineDashOffset: 0,
  drawImage() {},
  fillRect(x, y, w, h) { drawn.fillRect.push({ x, y, w, h }); },
  clearRect() {},
  strokeRect(x, y, w, h) { drawn.strokeRect.push({ x, y, w, h }); },
  beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {},
  stroke() {}, fill() {}, save() {}, restore() {},
  setTransform() {}, transform() {}, translate() {}, scale() {}, rotate() {},
  setLineDash() {}, getLineDash: () => [],
  fillText(t, x, y) { drawn.fillText.push({ t, x, y }); }, strokeText() {},
  measureText: (t) => ({ width: String(t).length * 6 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createPattern: () => null,
  getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
  putImageData() {},
});
window.HTMLCanvasElement.prototype.getContext = function () {
  if (!this.__ctx) this.__ctx = makeCtx(this);
  return this.__ctx;
};
window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,iVBORw0KGgo=";
window.HTMLCanvasElement.prototype.toBlob = function (cb) { cb && cb(new window.Blob(["x"], { type: "image/png" })); };

/* ------------------------------------------------------- camera + playback */
const makeStream = () => {
  const track = { stop() { track.stopped = true; }, stopped: false, kind: "video", readyState: "live" };
  return { getTracks: () => [track], getVideoTracks: () => [track], getAudioTracks: () => [], __track: track };
};
const reject = (name, message) => {
  const e = new Error(message);
  e.name = name;
  return Promise.reject(e);
};
window.navigator.mediaDevices = {
  getUserMedia(constraints) {
    env.lastConstraints = constraints;
    switch (env.gumBehaviour) {
      case "deny": return reject("NotAllowedError", "Permission denied");
      case "none": return reject("NotFoundError", "Requested device not found");
      case "over": return reject("OverconstrainedError", "Constraints cannot be satisfied");
      case "over-then-ok":
        env.gumBehaviour = "ok";
        return reject("OverconstrainedError", "Constraints cannot be satisfied");
      default: return Promise.resolve(makeStream());
    }
  },
  enumerateDevices: () => Promise.resolve([]),
  addEventListener() {}, removeEventListener() {},
};
window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
window.HTMLMediaElement.prototype.pause = function () {};
window.HTMLMediaElement.prototype.load = function () {};
Object.defineProperty(window.HTMLVideoElement.prototype, "videoWidth", { get: () => 640, configurable: true });
Object.defineProperty(window.HTMLVideoElement.prototype, "videoHeight", { get: () => 480, configurable: true });
Object.defineProperty(window.HTMLVideoElement.prototype, "readyState", { get: () => 4, configurable: true });

/* ------------------------------------------------------------- jsdom gaps */
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = function () {};
window.URL.createObjectURL = () => "blob:fake";
window.URL.revokeObjectURL = () => {};
// app.js calls the *global* URL, not window.URL. Node's own URL.createObjectURL
// rejects jsdom's Blob with ERR_INVALID_ARG_TYPE, so stub the global too —
// otherwise the download path fails here while working fine in a real browser.
for (const u of [window.URL, globalThis.URL]) {
  try {
    Object.defineProperty(u, "createObjectURL", { value: () => "blob:fake", configurable: true, writable: true });
    Object.defineProperty(u, "revokeObjectURL", { value: () => {}, configurable: true, writable: true });
  } catch (err) { /* read-only in some runtimes; window.URL is already stubbed */ }
}
Object.defineProperty(window.HTMLElement.prototype, "clientWidth", { get: () => 390, configurable: true });
Object.defineProperty(window.HTMLElement.prototype, "clientHeight", { get: () => 640, configurable: true });
Object.defineProperty(window.HTMLElement.prototype, "offsetWidth", { get: () => 390, configurable: true });
window.matchMedia = window.matchMedia || ((q) => ({
  matches: false, media: q, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
}));

/* ------------------------------------------------------------- globals */
// Node 22 exposes a getter-only global `navigator`, so it must be redefined.
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true, writable: true });
for (const k of ["window", "document", "localStorage", "sessionStorage", "location", "history",
  "HTMLElement", "HTMLVideoElement", "HTMLCanvasElement", "Element", "Node", "Event",
  "CustomEvent", "KeyboardEvent", "MouseEvent", "DragEvent", "Blob", "FormData",
  "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "Image", "DOMParser",
  "FileReader", "File", "FileList", "DataTransfer", "atob", "btoa"]) {
  if (window[k] !== undefined) {
    try { Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true }); }
    catch (err) { globalThis[k] = window[k]; }
  }
}
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 0));

/* ------------------------------------------- import the app AFTER globals */
export const stub = await import("./stub-transformers.mjs");
export const app = await import("./app-under-test.mjs");
export { window };
export const doc = window.document;
export { root };
