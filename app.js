/* =====================================================================
   EcoScan SA — Smart Waste Sorting Guide
   app.js — behaviour layer.

   The scanner is deliberately a LAYERED system:
     1. detection      — what the model sees (COCO-91 label + score)
     2. object type    — normalised to a waste-relevant concept
     3. material       — the plausible materials, each with a weight
     4. disposal rule  — (object, material) → South Australian category
     5. confidence     — detection × material agreement × unseen condition
     6. verdict        — a bin, or an explicit "I don't know"

   Layers 1, 3 and 4 are independent. Being 91% sure something is a
   bottle says nothing about which bin it belongs in.
   ===================================================================== */

import {
  CATEGORIES, BINS, BIN_TO_CATEGORY, LABEL_TO_CONCEPT, CONCEPTS,
  ITEMS, GAME_ITEMS, SCIENCE_FACTS, SCIENCE_BLOCKS,
  REFERENCES, REFERENCE_ORDER,
  disposalConfidence, confidenceBand,
} from "./data.js";

/* ------------------------------------------------------------------
   ICONS
   ------------------------------------------------------------------ */
const ICONS = {
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  recycle: '<path d="M7 19H4.8a1.83 1.83 0 0 1-1.57-.88 1.78 1.78 0 0 1 0-1.79L7.2 9.5"/><path d="M11 19h8.2a1.83 1.83 0 0 0 1.56-.89 1.78 1.78 0 0 0 0-1.78L19.5 14.2"/><path d="m14 16-3 3 3 3"/><path d="M8.29 13.6 7.2 9.5 3.1 10.6"/><path d="m9.34 5.81 1.09-1.89A1.83 1.83 0 0 1 12.01 3c.64 0 1.22.33 1.57.88l1.78 3.08"/><path d="m19 5 3 1-1 3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
  question: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  cameraOff: '<line x1="2" y1="2" x2="22" y2="22"/><path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  cross: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',

  pizza: '<path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/>',
  banana: '<path d="M4 13c4-5.5 8-5.5 14-5 1.2.06 2.2.2 3 .4-1 6.5-5.5 12.6-11 12.6-2.5 0-4.5-2-4.5-3.5 0-1.2 1.2-1.8 1.8-2.4C6.5 14.8 4 14 4 13Z"/>',
  carrot: '<path d="M2.27 21.73s9.87-1.42 13.85-5.4c2.86-2.86 3.88-7.13 3.88-7.13s-4.27 1.02-7.13 3.88c-3.98 3.98-5.4 13.85-5.4 13.85"/><path d="M8.69 15.31 2.27 21.73"/><path d="M15.31 8.69 21.73 2.27"/><path d="M7.5 16.5 9 18"/>',
  scroll: '<path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
  can: '<path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M4 9h16"/><path d="M9 14h6"/>',
  bottle: '<path d="M10 2h4"/><path d="M11 2v3.5L8.7 9.3A6 6 0 0 0 7.5 13v6.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V13a6 6 0 0 0-1.2-3.7L13 5.5V2"/><path d="M7.5 13h9"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  jar: '<path d="M6 3h12l1 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z"/><path d="M5 6h14"/><path d="M10 11h4"/>',
  milk: '<path d="M8 2h8"/><path d="M9 2v2.79a2 2 0 0 1-.57 1.4L5.8 8.9A2 2 0 0 0 5.2 10.3V20a2 2 0 0 0 2 2h9.6a2 2 0 0 0 2-2v-9.7a2 2 0 0 0-.6-1.4l-2.63-2.71A2 2 0 0 1 15 4.79V2"/><path d="M5 10h14"/>',
  tub: '<path d="M4 7h16l-1.4 12a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8Z"/><path d="M3 4h18v3H3z"/><path d="M8 11h8"/>',
  aerosol: '<path d="M9 8h6v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1Z"/><path d="M10 8V5h4v3"/><path d="M11 2h2v3h-2z"/><path d="M17 4h3"/><path d="M17 7h3"/>',
  paint: '<path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/><path d="M4 5h16v3H4z"/><path d="M9 12h6"/><path d="M12 2v3"/>',
  pot: '<path d="M6 8h12l-1.3 11a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8Z"/><path d="M5 5h14v3H5z"/><path d="M12 5c0-2 1-3 3-3"/>',
  bread: '<path d="M5 8c0-2.2 1.8-4 4-4 .8 0 1.5.2 2.1.6A4 4 0 0 1 15 4c2.2 0 4 1.8 4 4 0 .6-.1 1.2-.4 1.7.3.6.4 1.3.4 2a4 4 0 0 1-4 4h-3c-.7 0-1.4-.2-2-.5A4 4 0 0 1 5 12c0-.7.2-1.4.5-2.1C5.2 9.3 5 8.7 5 8Z"/><path d="M8 8h8"/>',
  packet: '<path d="M6 3h12v18H6z"/><path d="M6 7l12-2"/><path d="M6 12l12-2"/><path d="M6 17l12-2"/>',
  receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h4"/>',
  glass: '<path d="M4 4h16l-1.6 16a2 2 0 0 1-2 1.6H7.6a2 2 0 0 1-2-1.6Z"/><path d="M7 8h10"/>',
  plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
  cup: '<path d="M5 4h14l-1.2 12a3 3 0 0 1-3 2.7H9.2a3 3 0 0 1-3-2.7Z"/><path d="M19 7h1.5a2.5 2.5 0 0 1 0 5H18"/>',
  nappy: '<path d="M5 6h14v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7Z"/><path d="M5 6c0 3 1.5 4 3 4"/><path d="M19 6c0 3-1.5 4-3 4"/>',
  foam: '<path d="M4 9h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M3 6h18v3H3z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>',
  shirt: '<path d="M8 3 4 6l2 3 2-1v11h8V8l2 1 2-3-4-3-2 2h-4Z"/>',
  dust: '<path d="M4 20h16"/><path d="M7 20a5 5 0 0 1 10 0"/><path d="M12 4v6"/><circle cx="8" cy="7" r="1"/><circle cx="16" cy="9" r="1"/><circle cx="12" cy="13" r="1"/>',
  butt: '<path d="M4 18h10"/><path d="M14 18c3 0 5-2 5-5"/><path d="M4 14h8"/><path d="M17 6c1 1 2 2 2 4"/>',
  battery: '<rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2Z"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  ewaste: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="m10 10 2 2 2-2"/>',
  gas: '<path d="M9 2h6v3H9z"/><path d="M8 5h8v15a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z"/><path d="M10 10h4"/>',
  foil: '<path d="M4 6h16l-2 12H6z"/><path d="M4 6l16 2"/><path d="M8 14l8-2"/>',
  bag: '<path d="M6 7h12l-1 14H7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  envelope: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/>',
  tyre: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  cable: '<path d="M4 12h6"/><path d="M14 12h6"/><path d="M10 8a4 4 0 0 1 4 4"/><path d="M10 16a4 4 0 0 0 4-4"/>',
};

function icon(name, size) {
  const path = ICONS[name] || ICONS.question;
  return '<svg viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) +
    '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";
}

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* ------------------------------------------------------------------
   STATE
   ------------------------------------------------------------------ */
let cameraStream = null;
let detector = null;
let classifier = null;
let modelLoading = false;
let modelFailed = false;
let modelBackend = null;
let classifierLoading = false;
let classifierFailed = false;
let classifierBackend = null;
let camState = "starting"; // starting | live | error | paused | off
let scanning = false;
let lastCaptureW = 640;
let lastCaptureH = 480;
let transformersMod = null; // cached import

let gameScore = 0;
let answered = 0;
let selectedItem = null;
let gamePool = [];

const FEEDBACK_KEY = "ecoscan.feedback.v1";

/* ------------------------------------------------------------------
   DOM
   ------------------------------------------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const video = $("#webcam");
const captureCanvas = $("#capture");
const captureCtx = captureCanvas ? captureCanvas.getContext("2d", { willReadFrequently: true }) : null;
const overlayCanvas = $("#overlay");
const overlayCtx = overlayCanvas ? overlayCanvas.getContext("2d") : null;
const cameraBox = $("#camera");
const camDot = $("#cam-dot");
const camStatus = $("#cam-status");
const cameraState = $("#camera-state");
const modelState = $("#model-state");
const modelText = $("#model-text");
const modelPct = $("#model-pct");
const modelProgress = $("#model-progress");
const scanButton = $("#scan-button");
const modelPreload = $("#model-preload");
const modelNote = $("#model-note");
const resultEmpty = $("#result-empty");
const resultContent = $("#result-content");

const SCAN_THRESHOLD = 0.45;
const SCAN_TIMEOUT_MS = 90000;
// FIX: previous URL transformers.web.min.js is not a self-contained ESM.
// It starts with `import * as e from \"onnxruntime-common\"` and fails in
// browsers with bare specifier errors, so the model never loads.
// jsDelivr +esm rewrites those to absolute ESM URLs and works.
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm";
const MODEL_ID = "Xenova/detr-resnet-50";
// onnx/model_quantized.onnx for MODEL_ID, measured from the repo tree.
const MODEL_BYTES = 43102531;
const MODEL_MB = (MODEL_BYTES / 1048576).toFixed(1);
// ort-wasm-simd-threaded.jsep.wasm shipped inside the same npm package.
const WASM_BYTES = 23929658;
const FIRST_RUN_MB = ((MODEL_BYTES + WASM_BYTES) / 1048576).toFixed(0);

// Classification fallback — tiny model that recognises ~1000 ImageNet classes
// Used when DETR returns empty/unknown AND in parallel to improve recall for
// tissue, cartons, soft plastic etc. that DETR (COCO-91) can never see.
const CLASSIFICATION_MODEL_ID = "Xenova/mobilenet_v3_small_100_224";
const CLASSIFICATION_THRESHOLD = 0.15;
const CLASSIFICATION_TOPK = 10;
const CLASSIFICATION_MODEL_MB = "4.0";

/* ==================================================================
   NAVIGATION
   ================================================================== */
function activateTab(tab) {
  $$(".bnav-item").forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-current", on ? "page" : "false");
  });
  $$(".page").forEach((p) => p.classList.toggle("is-active", p.dataset.page === tab));
  const heading = $("#page-" + tab + " h1");
  if (heading) heading.setAttribute("tabindex", "-1");
  if (tab === "home") {
    ensureCamera();
  } else {
    stopCamera("paused");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (heading && heading.focus) { try { heading.focus({ preventScroll: true }); } catch (_) { heading.focus(); } }
}

$$(".bnav-item").forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));

/* ==================================================================
   CAMERA
   ================================================================== */
function setCamState(state, message) {
  camState = state;
  if (camDot) camDot.classList.remove("live", "error");
  if (cameraBox) cameraBox.classList.remove("live", "scanning");
  if (cameraState) cameraState.classList.remove("error");

  if (state === "live") {
    if (camDot) camDot.classList.add("live");
    if (cameraBox) cameraBox.classList.add("live");
    if (camStatus) camStatus.textContent = "live";
    if (cameraState) cameraState.innerHTML = "";
    if (video) video.classList.add("active");
  } else if (state === "error") {
    if (camDot) camDot.classList.add("error");
    cameraStatusError(message);
  } else if (state === "paused") {
    if (camStatus) camStatus.textContent = "paused";
    if (cameraState) cameraState.innerHTML = '<p>' + icon("cameraOff", 18) + " Camera paused. Return to the Scan tab to resume.</p>";
    if (video) video.classList.remove("active");
  } else if (state === "off") {
    if (camStatus) camStatus.textContent = "off";
    if (cameraState) cameraState.innerHTML = '<p>' + icon("cameraOff", 18) + " Camera released while this tab was hidden. Press Scan Item to restart it.</p>";
    if (video) video.classList.remove("active");
  } else {
    if (camStatus) camStatus.textContent = "starting";
    if (cameraState) cameraState.innerHTML = "<p>Requesting camera access…</p>";
    if (video) video.classList.remove("active");
  }
  syncScanButton();
}

function cameraStatusError(message) {
  if (camStatus) camStatus.textContent = "no camera";
  if (cameraState) {
    cameraState.classList.add("error");
    cameraState.innerHTML =
      '<p>' + esc(message || "Camera unavailable.") + '</p>' +
      '<button class="btn btn-ghost btn-sm" type="button" id="cam-retry">' + icon("refresh", 16) + " Try again</button>";
    const retry = $("#cam-retry");
    if (retry) retry.addEventListener("click", () => { startCamera(); });
  }
}

async function startCamera() {
  setCamState("starting");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCamState("error", "This browser does not support camera access. Use the manual lookup below.");
    return false;
  }
  try {
    stopStream();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (constraintErr) {
      if (constraintErr && constraintErr.name === "OverconstrainedError") {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } else {
        throw constraintErr;
      }
    }
    cameraStream = stream;
    if (video) {
      video.srcObject = cameraStream;
      // Ensure video metadata is loaded before play
      if (video.readyState < 1) {
        await new Promise((res, rej) => {
          const onLoaded = () => { cleanup(); res(); };
          const onErr = (e) => { cleanup(); rej(e); };
          const cleanup = () => {
            video.removeEventListener("loadedmetadata", onLoaded);
            video.removeEventListener("error", onErr);
          };
          video.addEventListener("loadedmetadata", onLoaded, { once: true });
          video.addEventListener("error", onErr, { once: true });
          // safety timeout
          setTimeout(() => { cleanup(); res(); }, 1500);
        });
      }
      try { await video.play(); } catch (playErr) {
        // Autoplay may be blocked, but we still have stream
        console.warn("video.play() failed:", playErr);
      }
    }
    setCamState("live");
    return true;
  } catch (err) {
    let msg = "Camera access was denied or unavailable. Use the manual lookup below.";
    if (err) {
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        msg = "Camera permission was blocked. Allow camera access in your browser, then press Try again — or use the manual lookup below.";
      } else if (err.name === "NotFoundError") {
        msg = "No camera was found on this device. Use the manual lookup below.";
      } else if (err.name === "NotReadableError") {
        msg = "Another application is already using the camera. Close it and press Try again — or use the manual lookup below.";
      } else if (err.name === "OverconstrainedError") {
        msg = "This device's camera does not support the requested settings. Use the manual lookup below.";
      }
    }
    setCamState("error", msg);
    return false;
  }
}

function stopStream() {
  if (cameraStream) {
    try { cameraStream.getTracks().forEach((t) => t.stop()); } catch (err) { console.warn("Could not stop a camera track:", err); }
    cameraStream = null;
  }
  if (video && video.srcObject) video.srcObject = null;
  clearOverlay();
}

function stopCamera(mode) {
  if (mode !== "paused" && mode !== "off") mode = "paused";
  stopStream();
  setCamState(mode);
}

function ensureCamera() {
  if (camState === "live") return Promise.resolve(true);
  if (camState === "starting") return Promise.resolve(false);
  return startCamera();
}

/* ==================================================================
   MODEL
   ================================================================== */
/**
 * Every step here resolves to the SAME file on the model repo
 * (onnx/model_quantized.onnx, 41.1 MiB), so retrying a failed backend is free —
 * the bytes are already in the HTTP cache.
 */
function deviceLadder() {
  const ladder = [
    { label: "CPU · WASM · quantised", opts: { device: "wasm", dtype: "q8" }, proxy: true },
    { label: "CPU · WASM · quantised", opts: { device: "wasm", dtype: "q8" }, proxy: false },
  ];
  if (typeof navigator !== "undefined" && navigator.gpu) {
    ladder.push({ label: "GPU · WebGPU · quantised", opts: { device: "webgpu", dtype: "q8" }, proxy: false });
  }
  return ladder;
}

function setModelLoading(text, pct) {
  modelFailed = false;
  if (modelState) modelState.classList.remove("ready", "error");
  if (modelText) modelText.textContent = text || "Loading AI model…";
  if (modelPct) modelPct.textContent = pct != null ? pct + "%" : "";
  if (modelProgress) {
    modelProgress.style.width = (pct != null ? pct : 0) + "%";
    modelProgress.setAttribute("aria-valuenow", String(pct != null ? pct : 0));
  }
  syncScanButton();
}

function setModelReady() {
  modelFailed = false;
  if (modelState) {
    modelState.classList.add("ready");
    modelState.classList.remove("error");
  }
  if (modelText) modelText.textContent = modelBackend ? "AI model ready · " + modelBackend : "AI model ready";
  if (modelPct) modelPct.textContent = "";
  if (modelProgress) {
    modelProgress.style.width = "100%";
    modelProgress.setAttribute("aria-valuenow", "100");
  }
  if (modelState) {
    const old = modelState.querySelector(".model-retry");
    if (old) old.remove();
  }
  syncScanButton();
}

function setModelError(msg) {
  modelFailed = true;
  if (modelState) {
    modelState.classList.add("error");
    modelState.classList.remove("ready");
  }
  if (modelText) modelText.textContent = msg || "Could not load the AI model.";
  if (modelPct) modelPct.textContent = "";
  if (modelProgress) {
    modelProgress.style.width = "0%";
    modelProgress.setAttribute("aria-valuenow", "0");
  }

  if (modelState && !modelState.querySelector(".model-retry")) {
    const row = modelState.querySelector(".model-row");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-sm model-retry";
    btn.innerHTML = icon("refresh", 16) + " Retry";
    btn.addEventListener("click", () => { loadDetector({ force: true }); });
    if (row && row.parentNode) row.parentNode.insertBefore(btn, row.nextSibling);
    else modelState.appendChild(btn);
  }
  syncScanButton();
}

const TRANSFORMERS_FALLBACKS = [
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm",
  "https://esm.run/@huggingface/transformers@3.4.0",
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/dist/transformers.min.js",
];

async function importTransformersWithFallback() {
  if (transformersMod) return transformersMod;
  const urls = [TRANSFORMERS_URL, ...TRANSFORMERS_FALLBACKS.filter(u => u !== TRANSFORMERS_URL)];
  let lastErr = null;
  for (const url of urls) {
    try {
      let host = url;
      try { host = new URL(url, location.href).hostname; } catch (_) { host = url; }
      setModelLoading("Loading AI engine from " + host + "…", 0);
      const mod = await import(url);
      let resolved = null;
      if (mod && typeof mod.pipeline === "function") resolved = mod;
      else if (mod && mod.default && typeof mod.default.pipeline === "function") resolved = mod.default;
      else throw new Error("pipeline not found in " + url);
      transformersMod = resolved;
      return resolved;
    } catch (e) {
      console.warn("Transformers import failed for", url, e);
      lastErr = e;
    }
  }
  throw lastErr || new Error("All transformer CDN imports failed");
}

async function loadDetector(opts = {}) {
  if (detector && !opts.force) return detector;
  if (modelLoading) return null;
  modelLoading = true;
  modelFailed = false;

  try {
    setModelLoading("Loading AI engine…", 0);
    const mod = await importTransformersWithFallback();
    if (!mod || typeof mod.pipeline !== "function") throw new Error("Transformers.js did not expose a pipeline() function.");
    const pipeline = mod.pipeline;
    const env = mod.env;
    if (env) {
      env.allowLocalModels = false;
      // Enable browser cache so second visit is near-instant
      if ("useBrowserCache" in env) env.useBrowserCache = true;
      // Some builds need explicit wasm paths handling
      if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
        // Keep default wasmPaths, just toggle proxy per ladder step
      }
    }

    const errors = [];
    for (const step of deviceLadder()) {
      setModelLoading("Loading AI engine · " + step.label + "…", 0);
      if (env && env.backends && env.backends.onnx && env.backends.onnx.wasm) {
        env.backends.onnx.wasm.proxy = !!step.proxy;
      }
      try {
        detector = await pipeline("object-detection", MODEL_ID, {
          ...step.opts,
          progress_callback: (p) => {
            if (!p) return;
            if (p.status === "progress") {
              const loaded = Number(p.loaded) || 0;
              const total = Number(p.total) || 0;
              const pct = Number.isFinite(p.progress)
                ? Math.max(0, Math.min(100, Math.round(p.progress)))
                : (total ? Math.max(0, Math.min(100, Math.round((loaded / total) * 100))) : 0);
              const mb = total
                ? " · " + (loaded / 1048576).toFixed(1) + "/" + (total / 1048576).toFixed(1) + " MB"
                : "";
              setModelLoading("Downloading " + (p.file || "model") + mb + " · " + step.label + "…", pct);
            } else if (p.status === "initiate") {
              setModelLoading("Requesting " + (p.file || "model files") + " · " + step.label + "…", 0);
            } else if (p.status === "done") {
              setModelLoading("Finalising model · " + step.label + "…", 100);
            }
          },
        });
        modelBackend = step.label + (step.proxy ? " · threaded" : "");
        setModelReady();
        return detector;
      } catch (stepErr) {
        console.warn("Model backend failed (" + step.label + ", proxy=" + step.proxy + "):", stepErr);
        errors.push(step.label + (step.proxy ? " (threaded)" : "") + ": " + (stepErr && stepErr.message ? stepErr.message : String(stepErr)));
        detector = null;
      }
    }
    throw new Error(errors.join(" | ") || "All model backends failed.");
  } catch (err) {
    console.error("Model load failed:", err);
    detector = null;
    const name = String((err && err.name) || "");
    const text = String((err && err.message) || err || "");
    const unreachable = name === "TypeError" || /fetch|network|import|CORS|blocked|offline|ERR_/i.test(text);
    const diagnosis = unreachable
      ? "The browser could not reach the model files. That normally means this network is blocking cdn.jsdelivr.net or huggingface.co, or the device is offline."
      : "The model could not be started in this browser.";
    setModelError(diagnosis + " Press Retry, or use the manual lookup below — it needs no download and works offline.");
    return null;
  } finally {
    modelLoading = false;
  }
}

/* ==================================================================
   CLASSIFICATION PIPELINE (layers 2 → 5) — now handles multiple
   detections ranked by disposal confidence + classification fallback
   ================================================================== */

/**
 * Coerce a detection score to a 0–1 fraction.
 * Accepts both 0-1 and 0-100 ranges.
 */
function normaliseScore(raw) {
  let s = Number(raw);
  if (!Number.isFinite(s)) return 0;
  if (s > 1) s = s / 100;
  return Math.max(0, Math.min(1, s));
}

function boxAreaFraction(box) {
  const norm = normalizeBoxToFraction(box);
  if (!norm) return 0;
  return Math.max(0, norm.w) * Math.max(0, norm.h);
}

/**
 * Core analysis for a concept key — shared by detection and classification.
 */
function analyseConceptKey(conceptKey, detectionScore, rawLabel, sourceType = "detection") {
  const concept = CONCEPTS[conceptKey];
  if (!concept) {
    console.warn("Concept missing:", conceptKey, "←", rawLabel);
    return {
      rawLabel, detectionScore, concept: null, category: "none",
      materialShare: 0, conditionRisk: 0, disposalScore: 0,
      band: confidenceBand(0), alternatives: [],
      reason: "missing-concept",
      sourceType,
    };
  }

  const totalWeight = concept.materials.reduce((s, m) => s + Math.max(0, m.weight || 0), 0) || 1;
  const byCategory = new Map();
  for (const m of concept.materials) {
    const w = Math.max(0, m.weight || 0) / totalWeight;
    byCategory.set(m.category, (byCategory.get(m.category) || 0) + w);
  }
  const ranked = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  const [topCategory, materialShare] = ranked[0] || ["none", 0];

  if (topCategory === "uncertain") {
    return {
      rawLabel, detectionScore, concept, category: "uncertain",
      materialShare, conditionRisk: concept.conditionRisk || 0, disposalScore: 0,
      band: confidenceBand(0),
      alternatives: ranked.filter(([c]) => c !== "uncertain").map(([c, w]) => ({ category: c, share: w })),
      reason: "material-ambiguous",
      sourceType,
    };
  }

  const conditionRisk = concept.conditionRisk || 0;
  const disposalScore = disposalConfidence(detectionScore, materialShare, conditionRisk);
  const band = confidenceBand(disposalScore);

  return {
    rawLabel, detectionScore, concept,
    category: band.key === "low" ? "uncertain" : topCategory,
    confidentCategory: topCategory,
    materialShare, conditionRisk, disposalScore, band,
    alternatives: ranked.slice(1).map(([category, share]) => ({ category, share })),
    reason: band.key === "low" ? "low-confidence" : "ok",
    sourceType,
  };
}

/** Layer 2+3+4+5 for a single detection. */
function analyseDetection(det) {
  const rawLabel = String((det && det.label) || "").toLowerCase().trim();
  const detectionScore = normaliseScore(det && det.score);

  if (!Object.prototype.hasOwnProperty.call(LABEL_TO_CONCEPT, rawLabel)) {
    return {
      rawLabel, detectionScore, concept: null, category: "none",
      materialShare: 0, conditionRisk: 0, disposalScore: 0,
      band: confidenceBand(0), alternatives: [],
      reason: "unknown-label",
      sourceType: "detection",
    };
  }

  const conceptKey = LABEL_TO_CONCEPT[rawLabel];
  return analyseConceptKey(conceptKey, detectionScore, rawLabel, "detection");
}

/* ---------------- Classification fallback mapping ---------------- */

const CLASSIFICATION_KEYWORDS = [
  // High-value packaging that DETR already sees but classifier helps confirm
  { keys: ["water bottle", "pop bottle", "beer bottle", "wine bottle", "bottle", "milk can", "pop can", "beer can", "tin can", "can", "beer glass", "red wine", "measuring cup"], concept: "bottle" },
  { keys: ["book jacket", "book", "paperback"], concept: "book" },
  { keys: ["banana", "apple", "orange", "broccoli", "carrot", "lemon", "strawberry", "pineapple", "mushroom", "bell pepper", "cucumber", "corn", "cauliflower", "zucchini", "artichoke", "custard apple", "pomegranate", "fig", "guacamole", "fruit", "vegetable", "granny smith"], concept: "food-fresh" },
  { keys: ["pizza", "sandwich", "hot dog", "hamburger", "cheeseburger", "cake", "donut", "bagel", "pretzel", "burrito", "taco", "carbonara", "meat loaf", "potpie"], concept: "food-prepared" },
  { keys: ["wine glass", "goblet"], concept: "drinking-glass" },
  { keys: ["cup", "mug", "espresso", "coffee mug"], concept: "cup-mug" },
  { keys: ["bowl", "plate", "platter", "crockery", "mixing bowl", "soup bowl"], concept: "crockery" },
  { keys: ["vase"], concept: "glass-decor" },
  { keys: ["mirror"], concept: "mirror" },
  { keys: ["window"], concept: "window-glass" },
  { keys: ["fork", "knife", "spoon", "cutlery", "ladle", "spatula", "cleaver"], concept: "cutlery" },
  { keys: ["cell phone", "mobile phone", "iphone", "smartphone", "cellphone", "phone"], concept: "phone" },
  { keys: ["remote", "keyboard", "mouse", "joystick", "computer mouse"], concept: "electronics-small" },
  { keys: ["laptop", "notebook", "tablet", "ipad"], concept: "electronics-portable" },
  { keys: ["television", "monitor", "screen", "crt screen", "tv"], concept: "electronics-large" },
  { keys: ["toaster", "blender", "hair dryer", "microwave", "oven", "refrigerator", "vacuum", "washer", "dryer", "coffee maker", "espresso maker", "frying pan", "wok", "dutch oven"], concept: "appliance-small" },
  { keys: ["refrigerator", "fridge"], concept: "appliance-large" },
  { keys: ["clock", "analog clock", "wall clock", "watch", "digital watch", "wristwatch"], concept: "battery-product" },
  { keys: ["hat", "tie", "shoe", "handbag", "backpack", "suitcase", "clothing", "shirt", "jacket", "jeans", "sweater", "textile", "wool", "jean", "cardigan", "jersey"], concept: "textile" },
  { keys: ["frisbee", "sports ball", "ball", "football", "basketball", "tennis ball", "golf ball", "soccer ball", "volleyball", "baseball", "rugby ball"], concept: "rigid-plastic-goods" },
  { keys: ["toothbrush", "scissors", "eyeglasses", "sunglasses", "sunglass"], concept: "small-mixed-plastic" },
  { keys: ["teddy bear", "teddy", "toy", "doll", "jigsaw puzzle"], concept: "soft-toy" },
  { keys: ["chair", "couch", "sofa", "bed", "desk", "table", "bench", "furniture", "bookcase", "filing cabinet"], concept: "furniture" },
  { keys: ["door", "sink", "toilet", "bathtub", "shower curtain"], concept: "building-fixture" },
  { keys: ["person", "people", "man", "woman", "child", "boy", "girl", "dog", "cat", "bird", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat", "traffic light", "fire hydrant", "stop sign", "parking meter"], concept: "not-waste" },

  // ---- NEW: items DETR (COCO-91) cannot see — core of the \"never recognises\" fix ----
  { keys: ["tissue", "tissue paper", "toilet tissue", "toilet paper", "paper towel", "paper towels", "napkin", "serviette", "kleenex", "paper napkin", "toilet roll", "paper hand towel"], concept: "tissue" },
  { keys: ["carton", "milk carton", "juice carton", "juice box", "milk", "soy milk", "almond milk", "chocolate milk", "juice", "orange juice", "apple juice", "long-life milk", "tetra pak", "tetrapak", "uht milk", "milk box", "beverage carton"], concept: "carton" },
  { keys: ["foil", "aluminum foil", "aluminium foil", "tin foil", "foil tray", "aluminum tray", "aluminium tray", "pie tin", "foil container"], concept: "foil" },
  { keys: ["plastic bag", "shopping bag", "carrier bag", "bread bag", "sandwich bag", "zip bag", "ziplock", "ziploc", "cling wrap", "cling film", "plastic wrap", "bubble wrap", "wrapper", "polythene bag", "bin bag", "trash bag", "grocery bag", "produce bag", "soft plastic", "flexible plastic", "film wrap"], concept: "soft-plastic" },
  { keys: ["newspaper", "newspapers", "paper", "magazine", "junk mail", "office paper", "paper bag", "cardboard", "paper towel roll", "cardboard box"], concept: "paper" },
  { keys: ["envelope", "letter", "mail", "mailing", "window envelope", "paper envelope", "manila envelope"], concept: "paper" },
  { keys: ["receipt", "till receipt", "cash receipt", "thermal paper"], concept: "receipt" },
  { keys: ["polystyrene", "styrofoam", "foam", "foam cup", "foam tray", "foam box", "foam packaging", "eps", "styrene"], concept: "polystyrene" },
  { keys: ["tyre", "tire", "car tyre", "car tire", "rubber tyre", "rubber tire"], concept: "tyre" },
  { keys: ["cable", "charger", "power cable", "usb cable", "extension cord", "power board", "power strip", "charging cable", "lead", "cord", "power cord", "ethernet cable"], concept: "cable" },
  { keys: ["plastic bag", "mailbag", "packet"], concept: "soft-plastic" },
  { keys: ["bucket", "pail", "barrel", "ashcan", "trash can", "dustbin", "wastebin"], concept: "bottle" },
  { keys: ["candle", "lighter", "broom", "mop", "brush"], concept: "small-mixed-plastic" },
];

function classificationLabelToConceptKey(label) {
  const low = String(label || "").toLowerCase();
  // Exact match first via LABEL_TO_CONCEPT (for COCO overlap)
  if (Object.prototype.hasOwnProperty.call(LABEL_TO_CONCEPT, low)) return LABEL_TO_CONCEPT[low];
  // Keyword substring match — longest keys first for specificity
  const sorted = CLASSIFICATION_KEYWORDS.slice().sort((a, b) => Math.max(...b.keys.map(k => k.length)) - Math.max(...a.keys.map(k => k.length)));
  for (const entry of sorted) {
    for (const k of entry.keys) {
      if (low.includes(k)) return entry.concept;
    }
  }
  return null;
}

function classifierLadder() {
  const dtypes = ["q8", "fp32", "fp16"];
  const ladder = [];
  for (const dtype of dtypes) {
    ladder.push({ label: "CPU · WASM · " + dtype, opts: { device: "wasm", dtype }, proxy: true });
    ladder.push({ label: "CPU · WASM · " + dtype, opts: { device: "wasm", dtype }, proxy: false });
  }
  if (typeof navigator !== "undefined" && navigator.gpu) {
    for (const dtype of dtypes) {
      ladder.push({ label: "GPU · WebGPU · " + dtype, opts: { device: "webgpu", dtype }, proxy: false });
    }
  }
  return ladder;
}

async function loadClassifier(opts = {}) {
  if (classifier && !opts.force) return classifier;
  if (classifierLoading) return null;
  classifierLoading = true;
  classifierFailed = false;

  try {
    const mod = await importTransformersWithFallback();
    const pipeline = mod.pipeline;
    const env = mod.env;
    if (env) {
      env.allowLocalModels = false;
      if ("useBrowserCache" in env) env.useBrowserCache = true;
    }

    setModelLoading("Loading image classifier (~" + CLASSIFICATION_MODEL_MB + " MB) for fallback…", 10);
    const errors = [];
    for (const step of classifierLadder()) {
      if (env && env.backends && env.backends.onnx && env.backends.onnx.wasm) {
        env.backends.onnx.wasm.proxy = !!step.proxy;
      }
      try {
        classifier = await pipeline("image-classification", CLASSIFICATION_MODEL_ID, {
          ...step.opts,
          progress_callback: (p) => {
            if (!p) return;
            if (p.status === "progress") {
              const pct = Number.isFinite(p.progress) ? Math.round(p.progress) : 0;
              setModelLoading("Downloading classifier " + (p.file || "") + " · " + step.label + "…", pct);
            }
          },
        });
        classifierBackend = step.label + (step.proxy ? " · threaded" : "");
        // Do not call setModelReady — detector is still primary
        return classifier;
      } catch (e) {
        console.warn("Classifier backend failed", step.label, e);
        errors.push(step.label + ": " + String(e && e.message ? e.message : e));
        classifier = null;
      }
    }
    throw new Error(errors.join(" | "));
  } catch (err) {
    console.error("Classifier load failed", err);
    classifier = null;
    classifierFailed = true;
    return null;
  } finally {
    classifierLoading = false;
  }
}

async function tryClassificationFallback(frame, opts = {}) {
  if (!frame) return [];
  try {
    const clf = classifier || await loadClassifier();
    if (!clf) return [];

    const topk = opts.topk || CLASSIFICATION_TOPK;
    const threshold = opts.threshold != null ? opts.threshold : CLASSIFICATION_THRESHOLD;
    const results = await withTimeout(clf(frame, { topk }), 20000, "Classification timed out");
    const list = Array.isArray(results) ? results : [results];

    const candidates = [];
    for (const r of list) {
      const score = normaliseScore(r.score);
      if (score < threshold) continue;
      const conceptKey = classificationLabelToConceptKey(r.label);
      if (!conceptKey) continue;
      const analysis = analyseConceptKey(conceptKey, score, String(r.label || "").toLowerCase(), "classification");
      if (!analysis) continue;
      if (analysis.category === "none") continue;
      candidates.push({ result: r, analysis, score });
    }

    if (!candidates.length) return [];

    // Rank by disposalScore, then raw score, then not-waste suppression
    candidates.sort((a, b) => {
      // Prefer waste over not-waste
      const aWaste = a.analysis.category === "notwaste" ? 0 : 1;
      const bWaste = b.analysis.category === "notwaste" ? 0 : 1;
      if (bWaste !== aWaste) return bWaste - aWaste;
      if (b.analysis.disposalScore !== a.analysis.disposalScore) return b.analysis.disposalScore - a.analysis.disposalScore;
      return b.score - a.score;
    });

    return candidates;
  } catch (err) {
    console.warn("Classification fallback failed", err);
    return [];
  }
}

async function tryClassificationBest(frame, opts = {}) {
  const cands = await tryClassificationFallback(frame, opts);
  return cands.length ? cands[0].analysis : null;
}

/* ==================================================================
   SCAN FLOW
   ================================================================== */
function syncScanButton() {
  // FIX: previously disabled for paused/off, so after tab hidden the button
  // said \"Press Scan Item to restart\" but was disabled — scanner looked broken.
  const canScan = (camState === "live" || camState === "paused" || camState === "off") && !scanning;
  if (scanButton) scanButton.disabled = !canScan;
  const span = scanButton ? scanButton.querySelector("span") : null;
  if (span) {
    span.textContent = scanning ? "Scanning…"
      : (camState === "live" && !detector) ? "Load model & scan"
      : (camState === "paused" || camState === "off") ? "Restart camera & scan"
      : "Scan Item";
  }
  // FIX: previously hidden when modelFailed, which hid the preload button
  // exactly when user needed it. Keep it visible unless loading or ready.
  if (modelPreload) modelPreload.hidden = !!detector || modelLoading;
}

function captureFrame() {
  // Use video dimensions if available, else fallback to last known or 640x480
  const vw = (video && video.videoWidth) ? video.videoWidth : lastCaptureW;
  const vh = (video && video.videoHeight) ? video.videoHeight : lastCaptureH;
  const safeW = Math.max(1, vw || 640);
  const safeH = Math.max(1, vh || 480);
  const scale = Math.min(1, 640 / safeW);
  const cw = Math.max(1, Math.round(safeW * scale));
  const ch = Math.max(1, Math.round(safeH * scale));
  if (captureCanvas) {
    captureCanvas.width = cw;
    captureCanvas.height = ch;
    if (captureCtx && video) {
      try {
        captureCtx.drawImage(video, 0, 0, cw, ch);
      } catch (e) {
        console.warn("captureFrame drawImage failed", e);
      }
    }
  }
  lastCaptureW = cw;
  lastCaptureH = ch;
  // Prefer returning the canvas itself for transformers.js (it accepts canvas)
  // but keep dataURL fallback for compatibility.
  // The detector can handle HTMLCanvasElement directly, which avoids base64 cost.
  if (captureCanvas) return captureCanvas;
  return "";
}

function clearOverlay() {
  if (!overlayCtx || !overlayCanvas) return;
  // Use devicePixelRatio for crisp boxes
  const dpr = window.devicePixelRatio || 1;
  const w = overlayCanvas.clientWidth || 1;
  const h = overlayCanvas.clientHeight || 1;
  overlayCanvas.width = Math.round(w * dpr);
  overlayCanvas.height = Math.round(h * dpr);
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  overlayCtx.clearRect(0, 0, w, h);
}

function normalizeBoxToFraction(box) {
  if (!box) return null;
  // Test format: {x, y, width, height} where values may be 0-100 percentages
  if ("x" in box && "width" in box) {
    let x = Number(box.x) || 0;
    let y = Number(box.y) || 0;
    let w = Number(box.width) || 0;
    let h = Number(box.height) || 0;
    // Detect if percentages 0-100
    if (x > 1 || y > 1 || w > 1 || h > 1) {
      x /= 100; y /= 100; w /= 100; h /= 100;
    }
    return { x, y, w, h };
  }
  // Real transformers.js format: {xmin, ymin, xmax, ymax}
  if ("xmin" in box && "xmax" in box) {
    let xmin = Number(box.xmin) || 0;
    let ymin = Number(box.ymin) || 0;
    let xmax = Number(box.xmax) || 0;
    let ymax = Number(box.ymax) || 0;
    // If values are normalized 0-1, use directly
    if (xmax <= 1.01 && ymax <= 1.01 && xmin >= 0 && ymin >= 0 && xmax > xmin && ymax > ymin) {
      return { x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin };
    }
    // Pixel coordinates: normalize by last capture size
    const iw = lastCaptureW || 640;
    const ih = lastCaptureH || 480;
    // Clamp to avoid negative or huge boxes
    xmin = Math.max(0, Math.min(iw, xmin));
    ymin = Math.max(0, Math.min(ih, ymin));
    xmax = Math.max(0, Math.min(iw, xmax));
    ymax = Math.max(0, Math.min(ih, ymax));
    return {
      x: xmin / iw,
      y: ymin / ih,
      w: Math.max(0, (xmax - xmin) / iw),
      h: Math.max(0, (ymax - ymin) / ih),
    };
  }
  return null;
}

function drawDetections(dets) {
  if (!overlayCtx || !overlayCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = overlayCanvas.clientWidth || 1;
  const h = overlayCanvas.clientHeight || 1;
  // Ensure canvas size matches display size * dpr
  if (overlayCanvas.width !== Math.round(w * dpr) || overlayCanvas.height !== Math.round(h * dpr)) {
    overlayCanvas.width = Math.round(w * dpr);
    overlayCanvas.height = Math.round(h * dpr);
  }
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  overlayCtx.clearRect(0, 0, w, h);

  dets.forEach((d, i) => {
    const norm = normalizeBoxToFraction(d.box);
    if (!norm) return;
    const x = norm.x * w;
    const y = norm.y * h;
    const bw = norm.w * w;
    const bh = norm.h * h;
    // Skip tiny boxes that are likely noise
    if (bw < 2 || bh < 2) return;
    const top = i === 0;
    overlayCtx.lineWidth = top ? 3 : 2;
    overlayCtx.strokeStyle = top ? "#ffd23e" : "rgba(255,255,255,.75)";
    overlayCtx.strokeRect(x, y, bw, bh);

    const text = String(d.label || "") + " " + Math.round((d.score || 0) * 100) + "%";
    overlayCtx.font = "600 12px system-ui, sans-serif";
    const tw = overlayCtx.measureText(text).width + 10;
    const ty = Math.max(0, y - 18);
    overlayCtx.fillStyle = top ? "#ffd23e" : "rgba(20,22,20,.85)";
    overlayCtx.fillRect(x, ty, tw, 18);
    overlayCtx.fillStyle = top ? "#1A1A1A" : "#fff";
    overlayCtx.fillText(text, x + 5, ty + 13);
  });
}

function withTimeout(promise, ms, message) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message + " after " + Math.round(ms / 1000) + "s")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function runScan() {
  if (scanning) return;

  if (camState !== "live") {
    const started = await ensureCamera();
    if (!started || camState !== "live") {
      if (camState === "starting") {
        renderNoVerdict({
          title: "CAMERA STARTING",
          meta: "Please wait a moment",
          body: "The camera is still starting. Wait a second and press Scan again — or use the manual lookup below.",
        });
      } else {
        renderNoVerdict({
          title: "CAMERA NOT AVAILABLE",
          meta: "Scan cancelled",
          body: "The scanner needs the camera to identify an item. Use the manual lookup below to find the right bin instead.",
        });
      }
      return;
    }
  }

  if (!detector) {
    const d = await loadDetector();
    if (!d) {
      renderNoVerdict({
        title: "AI MODEL UNAVAILABLE",
        meta: "Scan cancelled",
        body: "The on-device model could not be downloaded (about 41 MB on first use). Check your connection and press Retry above, or use the manual lookup below.",
      });
      return;
    }
  }

  scanning = true;
  if (cameraBox) cameraBox.classList.add("scanning");
  syncScanButton();

  try {
    const frame = captureFrame();
    const outputs = await withTimeout(detector(frame, { threshold: SCAN_THRESHOLD }), SCAN_TIMEOUT_MS, "Inference timed out");
    await handleDetections(outputs, frame);
  } catch (err) {
    console.error("Scan failed:", err);
    clearOverlay();
    renderNoVerdict({
      title: "SCAN FAILED",
      meta: esc(String((err && err.message) || err || "Unknown error")),
      body: "The scanner could not analyse that frame. Hold the item still, fill the frame with it, and try again — or use the manual lookup below.",
    });
  } finally {
    scanning = false;
    if (cameraBox) cameraBox.classList.remove("scanning");
    syncScanButton();
  }
}

/**
 * Multi-object pipeline v2 — always runs classification in parallel:
 * - Analyses ALL DETR detections above threshold, ranked by disposalScore
 * - Runs MobileNetV3 classification (topk 10, threshold 0.15) at same time
 * - Merges both streams into one ranking by disposalScore → detectionScore → area
 * - Handles material ambiguity, not-waste suppression, and tissue/carton etc.
 */
async function handleDetections(outputs, frame) {
  const list = Array.isArray(outputs) ? outputs.slice() : [];

  // Start classification immediately in parallel — do not wait for DETR analysis
  const classificationPromise = tryClassificationFallback(frame);

  // Always draw what we have, even if empty (clears)
  if (list.length) {
    list.sort((a, b) => (b.score || 0) - (a.score || 0));
    drawDetections(list);
  } else {
    clearOverlay();
  }

  // Analyse every detection into disposal terms
  const analysed = list.map((det) => {
    const analysis = analyseDetection(det);
    const area = boxAreaFraction(det.box);
    return { det, analysis, area, score: det.score || 0, kind: "detection" };
  });

  const known = analysed.filter(x => x.analysis && x.analysis.category !== "none");
  const unknown = analysed.filter(x => !x.analysis || x.analysis.category === "none");

  // Await classification candidates (already running)
  let classCands = [];
  try {
    classCands = await classificationPromise;
  } catch (_) {
    classCands = [];
  }

  const classAnalysed = (classCands || []).map(c => ({
    det: { label: c.result.label, score: c.score },
    analysis: c.analysis,
    area: 0,
    score: c.score,
    kind: "classification",
  }));

  // Merge both streams for ranking
  const mergedKnown = [...known, ...classAnalysed].filter(x => x.analysis && x.analysis.category !== "none");

  // Rank merged by: waste preference, disposalScore desc, detectionScore desc, area desc
  mergedKnown.sort((a, b) => {
    const aWaste = a.analysis.category === "notwaste" ? 0 : 1;
    const bWaste = b.analysis.category === "notwaste" ? 0 : 1;
    if (bWaste !== aWaste) return bWaste - aWaste;
    if (b.analysis.disposalScore !== a.analysis.disposalScore) return b.analysis.disposalScore - a.analysis.disposalScore;
    if (b.analysis.detectionScore !== a.analysis.detectionScore) return b.analysis.detectionScore - a.analysis.detectionScore;
    if ((b.area || 0) !== (a.area || 0)) return (b.area || 0) - (a.area || 0);
    return (b.score || 0) - (a.score || 0);
  });

  // Also-in-frame list from DETR only (for UI context)
  const othersDet = analysed.slice(0, 6).map(x => {
    const label = String(x.det.label || x.analysis.rawLabel || "unknown").toLowerCase();
    const pct = Math.round((x.analysis.detectionScore || x.score || 0) * 100);
    const cat = x.analysis.confidentCategory || x.analysis.category;
    const catShort = (CATEGORIES[cat] && CATEGORIES[cat].short) ? " → " + CATEGORIES[cat].short : "";
    return label + " " + pct + "%" + catShort;
  }).filter((_, i) => i > 0).slice(0, 3);

  const othersClass = classAnalysed.slice(0, 4).map(x => {
    const label = String(x.analysis.rawLabel || x.det.label || "unknown").toLowerCase();
    const pct = Math.round((x.analysis.detectionScore || 0) * 100);
    const cat = x.analysis.confidentCategory || x.analysis.category;
    const catShort = (CATEGORIES[cat] && CATEGORIES[cat].short) ? " → " + CATEGORIES[cat].short : "";
    return label + " " + pct + "%" + catShort + " (classifier)";
  });

  const others = [...othersDet, ...othersClass].slice(0, 5);

  // Case 1: nothing detected at all and classification found nothing
  if (!mergedKnown.length) {
    if (!list.length) {
      renderNoVerdict({
        title: "NO OBJECT DETECTED",
        meta: "Nothing above " + Math.round(SCAN_THRESHOLD * 100) + "% detection confidence",
        body: "The scanner could not confidently identify anything in that frame. Move closer so the item fills the frame, improve the lighting, and scan again — or use the manual lookup below. The app also tried a secondary image classifier (~" + CLASSIFICATION_MODEL_MB + " MB, top-" + CLASSIFICATION_TOPK + " at " + Math.round(CLASSIFICATION_THRESHOLD * 100) + "%) and found nothing recognisable. For tissue, milk cartons, foil and soft plastic bags, try the classifier-focused tips: fill the frame, plain background, good light.",
      });
      return;
    }
    // DETR found something but all unknown and classifier empty
    const firstUnknown = analysed[0] ? analysed[0].analysis : { rawLabel: "unknown", detectionScore: 0 };
    renderNoVerdict({
      title: "ITEM NOT RECOGNISED",
      meta: "Detected: " + esc(firstUnknown.rawLabel || "unknown") + " · " + Math.round((firstUnknown.detectionScore || 0) * 100) + "% detection confidence",
      body: "The scanner found something but has no South Australian disposal rule for it. It also tried a secondary classifier that knows ~1000 everyday objects (including tissue, carton, foil, soft plastic) and still could not map it to a bin. Check the manual lookup below or the official Which Bin guide rather than guessing.",
      also: others,
    });
    return;
  }

  // Case 2: merged best — prefer waste over not-waste already handled in sort,
  // but double-check: if best is not-waste and there is waste, skip
  let bestEntry = mergedKnown[0];
  if (bestEntry.analysis.category === "notwaste") {
    const wasteCandidate = mergedKnown.find(x => x.analysis.category !== "notwaste" && x.analysis.category !== "none" && x.analysis.category !== "uncertain");
    if (wasteCandidate) bestEntry = wasteCandidate;
  }

  renderScanResult(bestEntry.analysis, others);
}

/* ==================================================================
   RESULT RENDERING
   ================================================================== */
function sourceLine(srcKey) {
  const ref = REFERENCES[srcKey];
  if (!ref) return "";
  return '<div class="cat-source">Source: <a href="' + esc(ref.url) + '" target="_blank" rel="noopener noreferrer">' + esc(ref.label) + "</a></div>";
}

/** A neutral card that never names a bin. Used for every failure mode. */
function renderNoVerdict({ title, meta, body, also }) {
  if (resultEmpty) resultEmpty.hidden = true;
  if (resultContent) {
    resultContent.hidden = false;
    resultContent.innerHTML =
      '<div class="result-card" data-category="none">' +
        '<div class="cat-flag">' + icon("question", 16) + " No bin recommendation</div>" +
        '<div class="cat-title">' + esc(title) + "</div>" +
        '<div class="cat-meta">' + esc(meta || "") + "</div>" +
        (body ? '<div class="cat-why"><p>' + esc(body) + "</p></div>" : "") +
        (also && also.length ? '<div class="cat-also">Also in frame: ' + esc(also.join(" · ")) + "</div>" : "") +
        '<div class="cat-actions">' +
          '<button class="btn" type="button" data-action="scan-again">' + icon("scan", 18) + " Scan again</button>" +
          '<button class="btn" type="button" data-action="go-manual">' + icon("book", 18) + " Check manually</button>" +
        "</div>" +
      "</div>";
    wireResultActions();
  }
}

function renderScanResult(a, others) {
  const cat = CATEGORIES[a.category];
  const pctDet = Math.round(a.detectionScore * 100);
  const pctDis = Math.round(a.disposalScore * 100);

  const unseen = (a.concept && a.concept.unseen) || [];
  const altList = (a.alternatives || [])
    .filter((alt) => CATEGORIES[alt.category] && CATEGORIES[alt.category].bin)
    .map((alt) => CATEGORIES[alt.category].short + " (" + Math.round(alt.share * 100) + "%)");

  let inner = "";

  if (a.category === "notwaste") {
    inner =
      '<div class="cat-flag">' + icon("question", 16) + " No bin recommendation</div>" +
      '<div class="cat-title">' + esc(cat.title) + "</div>" +
      '<div class="cat-meta">Detected: ' + esc(a.rawLabel) + " · " + pctDet + "% detection confidence</div>" +
      '<div class="cat-why"><p>' + esc(a.concept.why) + "</p></div>" +
      '<div class="cat-science"><strong>The science:</strong> ' + esc(a.concept.science) + "</div>";
  } else if (a.category === "uncertain") {
    inner =
      '<div class="cat-flag is-warn">' + icon("alert", 16) + " Uncertain — no bin recommended</div>" +
      '<div class="cat-title">AI identification is uncertain</div>' +
      '<div class="cat-meta">Detected: ' + esc(a.rawLabel) + " · " + pctDet + "% detection confidence, " + pctDis + "% disposal confidence</div>" +
      '<div class="cat-why"><p>The item was detected, but its disposal category could not be determined confidently. ' +
        (a.reason === "material-ambiguous"
          ? "A photo cannot tell what material this is made from, and the material decides the bin."
          : "The confidence is too low to give you a reliable bin.") + "</p></div>" +
      (altList.length
        ? '<div class="cat-also">Possible, not confirmed: ' + esc(altList.join(" or ")) + "</div>"
        : "") +
      (unseen.length
        ? '<div class="cat-unseen">A photograph cannot show: ' + esc(unseen.join("; ")) + ".</div>"
        : "") +
      (a.concept ? '<div class="cat-science"><strong>The science:</strong> ' + esc(a.concept.science) + "</div>" : "");
  } else {
    const hedge = a.band.key === "medium"
      ? '<div class="cat-flag is-warn">' + icon("alert", 16) + " Partly confident — please verify</div>"
      : '<div class="cat-flag is-ok">' + icon("check", 16) + " Confident</div>";

    inner = hedge +
      '<div class="cat-title">' + esc(cat.title) + "</div>" +
      '<div class="cat-meta">' + esc(a.concept.name) + " · " + pctDet + "% detection confidence · " + pctDis + "% disposal confidence</div>" +

      '<div class="cat-steps">' +
        '<div class="step"><span class="step-k">What</span><span class="step-v">The scanner identified <strong>' + esc(a.rawLabel) + "</strong>, treated as " + esc(a.concept.name) + ".</span></div>" +
        '<div class="step"><span class="step-k">Where</span><span class="step-v"><strong>' + esc(cat.title) + "</strong>" + (a.concept.source ? " <span class='step-src'>(" + esc((REFERENCES[a.concept.source] || {}).org || "sourced") + ")</span>" : "") + "</span></div>" +
        '<div class="step"><span class="step-k">Why</span><span class="step-v">' + esc(a.concept.why) + "</span></div>" +
        '<div class="step"><span class="step-k">Science</span><span class="step-v">' + esc(a.concept.science) + "</span></div>" +
      "</div>" +

      (unseen.length
        ? '<div class="cat-unseen">A photograph cannot confirm: ' + esc(unseen.join("; ")) + ". Check these yourself before you dispose of the item.</div>"
        : "") +
      (altList.length
        ? '<div class="cat-also">If it is made of a different material, it may instead belong in: ' + esc(altList.join(" or ")) + ".</div>"
        : "") +
      '<div class="cat-confidence">' + confidenceBar(a) + "</div>" +
      sourceLine(a.concept.source) +
      (a.band.key === "medium"
        ? '<div class="cat-note">' + esc(a.band.advice) + "</div>"
        : "");
  }

  if (resultEmpty) resultEmpty.hidden = true;
  if (resultContent) {
    resultContent.hidden = false;
    resultContent.innerHTML =
      '<div class="result-card" data-category="' + esc(a.category) + '">' + inner +
        '<div class="cat-actions">' +
          '<button class="btn" type="button" data-action="scan-again">' + icon("scan", 18) + " Scan again</button>" +
          '<button class="btn" type="button" data-action="go-manual">' + icon("book", 18) + " Check manually</button>" +
          '<button class="btn" type="button" data-action="clear-result">Clear</button>' +
        "</div>" +
      "</div>";
    wireResultActions();
  }
}

function confidenceBar(a) {
  const pct = Math.round(a.disposalScore * 100);
  return '<div class="conf-row"><span class="conf-label">Disposal confidence</span><span class="conf-val">' + pct + "% · " + esc(a.band.label) + "</span></div>" +
    '<div class="conf-track" role="img" aria-label="Disposal confidence ' + pct + " percent, " + esc(a.band.label) + '">' +
      '<div class="conf-fill" data-band="' + esc(a.band.key) + '" style="width:' + pct + '%"></div>' +
    "</div>" +
    '<p class="conf-note">Detection confidence (' + Math.round(a.detectionScore * 100) +
      "%) measures how sure the model is about the <em>object</em>. Disposal confidence also accounts for material ambiguity and the conditions a photo cannot show.</p>";
}

function wireResultActions() {
  if (!resultContent) return;
  const again = resultContent.querySelector('[data-action="scan-again"]');
  const clear = resultContent.querySelector('[data-action="clear-result"]');
  const manual = resultContent.querySelector('[data-action="go-manual"]');
  if (again) again.addEventListener("click", () => { runScan(); });
  if (clear) clear.addEventListener("click", clearResult);
  if (manual) manual.addEventListener("click", () => {
    const panel = $("#manual-panel");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      const first = panel.querySelector(".item-tile");
      if (first) first.focus({ preventScroll: true });
    }
  });
}

function clearResult() {
  if (resultContent) {
    resultContent.hidden = true;
    resultContent.innerHTML = "";
  }
  if (resultEmpty) resultEmpty.hidden = false;
  clearOverlay();
}

/* ==================================================================
   MANUAL LOOKUP
   ================================================================== */
function buildItemGrid() {
  const grid = $("#item-grid");
  if (!grid) return;
  grid.innerHTML = ITEMS.map((i) =>
    '<button class="item-tile" data-id="' + esc(i.id) + '" type="button" aria-label="' +
        esc(i.name) + " — goes in the " + esc(BINS[i.bin].name) + " (" + esc(BINS[i.bin].sub) + ')">' +
      icon(i.icon, 24) +
      '<span class="tile-name">' + esc(i.name) + "</span>" +
      '<span class="tile-dot" data-bin="' + esc(i.bin) + '" aria-hidden="true"></span>' +
    "</button>"
  ).join("");

  $$(".item-tile", grid).forEach((tile) => {
    tile.addEventListener("click", () => showManualItem(tile.dataset.id));
  });
}

function showManualItem(id) {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) { console.warn("Unknown manual lookup item:", id); return; }
  const category = BIN_TO_CATEGORY[item.bin];
  const cat = CATEGORIES[category];
  const bin = BINS[item.bin];

  if (resultEmpty) resultEmpty.hidden = true;
  if (resultContent) {
    resultContent.hidden = false;
    resultContent.innerHTML =
      '<div class="result-card" data-category="' + esc(category) + '">' +
        '<div class="cat-flag is-ok">' + icon("check", 16) + " Confirmed from official guidance</div>" +
        '<div class="cat-title">' + esc(cat.title) + "</div>" +
        '<div class="cat-meta">Manual lookup: ' + esc(item.name) + "</div>" +
        '<div class="cat-steps">' +
          '<div class="step"><span class="step-k">What</span><span class="step-v">' + esc(item.name) + "</span></div>" +
          '<div class="step"><span class="step-k">Where</span><span class="step-v"><strong>' + esc(bin.name) + "</strong> — " + esc(bin.sub) + "</span></div>" +
          '<div class="step"><span class="step-k">Why</span><span class="step-v">' + esc(item.why) + "</span></div>" +
          '<div class="step"><span class="step-k">Science</span><span class="step-v">' + esc(item.science) + "</span></div>" +
        "</div>" +
        (item.varies ? '<div class="cat-note">' + esc(item.varies) + "</div>" : "") +
        sourceLine(item.src) +
        '<div class="cat-actions">' +
          '<button class="btn" type="button" data-action="clear-result">Clear</button>' +
        "</div>" +
      "</div>";
    wireResultActions();
  }
  const panel = $("#result-panel");
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ==================================================================
   BIN LEGEND
   ================================================================== */
function buildLegend() {
  const legend = $("#bin-legend");
  if (!legend) return;
  const data = [
    { bin: BINS.green, items: ["Food scraps & bones", "Garden prunings", "Tissues & paper towel", "Certified compostables"] },
    { bin: BINS.yellow, items: ["Glass bottles & jars", "Cans & clean tins", "Rigid plastic containers", "Paper & cardboard"] },
    { bin: BINS.blue, items: ["Soft plastics & wrappers", "Crockery & drinking glasses", "Nappies & polystyrene", "Textiles & receipts"] },
    { bin: BINS.hazwaste, items: ["Batteries (loose & embedded)", "Light globes & tubes", "E-waste & appliances", "Paint, chemicals & gas"] },
  ];
  legend.innerHTML = data.map((d) =>
    '<div class="bin-card">' +
      '<div class="bin-lid" style="background:' + esc(d.bin.lid) + '"></div>' +
      "<h3>" + icon(d.bin.icon, 17) + esc(d.bin.name) + "</h3>" +
      '<span class="bin-sub">' + esc(d.bin.sub) + "</span>" +
      "<ul>" + d.items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul>" +
    "</div>"
  ).join("");
}

/* ==================================================================
   SCIENCE PAGE
   ================================================================== */
function buildScience() {
  const facts = $("#facts-grid");
  if (facts) {
    facts.innerHTML = SCIENCE_FACTS.map((f) =>
      '<div class="panel fact">' +
        '<span class="fact-num">' + esc(f.num) + "</span>" +
        "<p><strong>" + esc(f.label) + "</strong><br>" + esc(f.body) + "</p>" +
        sourceLine(f.src) +
      "</div>"
    ).join("");
  }

  const host = $("#science-blocks");
  if (!host) return;

  host.innerHTML = SCIENCE_BLOCKS.map((b) => {
    let inner = "";
    if (b.cards && b.cards.length && b.cards[0].kind) {
      inner = '<div class="science-grid">' + b.cards.map((c) =>
        '<article class="panel science-card ' + esc(c.kind) + '">' +
          "<h3>" + esc(c.heading) + "</h3>" +
          '<p class="science-badge">' + esc(c.badge) + "</p>" +
          "<p>" + esc(c.body) + "</p>" +
          '<p class="science-note">' + esc(c.note) + "</p>" +
          sourceLine(c.src) +
        "</article>").join("") + "</div>";
    } else if (b.steps) {
      inner = '<ol class="mrf-steps">' + b.steps.map((s) =>
        "<li><strong>" + esc(s.t) + "</strong><span>" + esc(s.d) + "</span></li>").join("") + "</ol>" +
        '<div class="tanglers">' + b.tanglers.map((t) =>
          '<div class="panel tangler"><strong>' + esc(t.name) + "</strong><p>" + esc(t.d) + "</p></div>").join("") + "</div>";
    } else if (b.cards) {
      inner = '<div class="facts-grid">' + b.cards.map((c) =>
        '<div class="panel fact fact-text"><strong>' + esc(c.heading) + "</strong><p>" + esc(c.body) + "</p>" + sourceLine(c.src) + "</div>"
      ).join("") + "</div>";
    } else if (b.bars) {
      inner = '<div class="energy-grid">' + b.bars.map((bar) =>
        '<article class="panel energy-card">' +
          '<div class="energy-bar" style="--w:' + bar.pct + '%"><span>' + bar.pct + "%</span></div>" +
          "<h4>" + esc(bar.name) + "</h4>" +
          "<p>" + esc(bar.d) + "</p>" +
          sourceLine(bar.src) +
        "</article>").join("") + "</div>" +
        '<p class="flow-note">' + esc(b.caveat) + "</p>";
    }

    return '<div class="science-block" id="sci-' + esc(b.id) + '">' +
      '<h2 class="section-title">' + esc(b.title) + "</h2>" +
      '<p class="section-sub">' + esc(b.sub) + "</p>" + inner + "</div>";
  }).join("");
}

/* ==================================================================
   GAME
   ================================================================== */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBins() {
  const binsWrap = $("#game-bins");
  if (!binsWrap) return;
  const household = ["green", "yellow", "blue"];
  binsWrap.innerHTML = household.map((k) =>
    '<div class="g-bin" data-bin="' + k + '" role="button" tabindex="0" aria-label="Sort into ' + esc(BINS[k].name) + ", " + esc(BINS[k].sub) + '">' +
      '<div class="bin-lidbar" style="background:' + esc(BINS[k].lid) + '"></div>' +
      icon(BINS[k].icon, 24) +
      "<h3>" + esc(BINS[k].name) + "</h3>" +
      '<span class="bin-sub">' + esc(BINS[k].sub) + "</span>" +
    "</div>"
  ).join("");

  $$(".g-bin", binsWrap).forEach((binEl) => {
    binEl.addEventListener("dragover", (e) => { e.preventDefault(); binEl.classList.add("drag-over"); });
    binEl.addEventListener("dragleave", () => binEl.classList.remove("drag-over"));
    binEl.addEventListener("drop", (e) => {
      e.preventDefault();
      binEl.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      if (id) submitSort(id, binEl.dataset.bin, binEl);
    });
    binEl.addEventListener("click", () => { if (selectedItem) submitSort(selectedItem, binEl.dataset.bin, binEl); });
    binEl.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && selectedItem) { e.preventDefault(); submitSort(selectedItem, binEl.dataset.bin, binEl); }
    });
  });
}

function startGame() {
  gameScore = 0;
  answered = 0;
  selectedItem = null;
  gamePool = shuffle(GAME_ITEMS).slice(0, 5);
  const score = $("#game-score");
  const round = $("#game-round");
  if (score) score.textContent = "0";
  if (round) round.textContent = "1";
  const fb = $("#game-feedback");
  if (fb) { fb.hidden = true; fb.innerHTML = ""; }
  const teach = $("#game-teach");
  if (teach) { teach.hidden = true; teach.innerHTML = ""; }
  buildBins();
  renderRound();
}

function renderRound() {
  const wrap = $("#game-items");
  if (!wrap) return;
  wrap.dataset.items = JSON.stringify(gamePool.map((i) => i.id));
  wrap.innerHTML = gamePool.map((i) =>
    '<div class="g-item" draggable="true" data-id="' + esc(i.id) + '" role="button" tabindex="0" ' +
      'aria-label="' + esc(i.name) + '. Select then choose a bin.\">' +
      icon(i.icon, 26) +
      '<span class="g-name">' + esc(i.name) + "</span>" +
    "</div>"
  ).join("");

  $$(".g-item", wrap).forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      el.classList.add("dragging");
      e.dataTransfer.setData("text/plain", el.dataset.id);
      e.dataTransfer.effectAllowed = "move";
    });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
    el.addEventListener("click", () => selectGameItem(wrap, el));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectGameItem(wrap, el); }
    });
  });
}

function selectGameItem(wrap, el) {
  if (el.classList.contains("is-done")) return;
  $$(".g-item", wrap).forEach((o) => {
    o.classList.remove("is-selected");
    o.setAttribute("aria-pressed", "false");
  });
  el.classList.add("is-selected");
  el.setAttribute("aria-pressed", "true");
  selectedItem = el.dataset.id;
  const hint = $("#game-hint");
  if (hint) hint.hidden = false;
}

function submitSort(itemId, binKey, binEl) {
  if (answered >= gamePool.length) return;
  const wrap = $("#game-items");
  if (!wrap) return;
  const itemEl = $('.g-item[data-id="' + itemId + '"]', wrap);
  if (!itemEl || itemEl.classList.contains("is-done")) return;

  const item = ITEMS.find((i) => i.id === itemId);
  if (!item) { console.warn("Game item not found:", itemId); return; }

  const correct = item.bin === binKey;
  answered++;
  selectedItem = null;
  $$(".g-item", wrap).forEach((o) => { o.classList.remove("is-selected"); o.setAttribute("aria-pressed", "false"); });
  const hint = $("#game-hint");
  if (hint) hint.hidden = true;

  if (correct) {
    gameScore++;
    itemEl.classList.add("is-correct", "is-done");
    itemEl.setAttribute("aria-disabled", "true");
    flash(binEl, "is-correct-flash", 500);
  } else {
    itemEl.classList.add("is-wrong", "is-done");
    itemEl.setAttribute("aria-disabled", "true");
    flash(binEl, "is-wrong-flash", 500);
    const rightBin = $('.g-bin[data-bin="' + item.bin + '"]');
    if (rightBin) flash(rightBin, "is-correct-flash", 900);
    showTeaching(item, binKey);
  }

  const scoreEl = $("#game-score");
  if (scoreEl) scoreEl.textContent = String(gameScore);

  if (answered >= gamePool.length) {
    const roundEl = $("#game-round");
    if (roundEl) roundEl.textContent = String(gamePool.length);
    finishGame();
  } else {
    const roundEl = $("#game-round");
    if (roundEl) roundEl.textContent = String(answered + 1);
  }
}

function flash(el, cls, ms) {
  if (!el) return;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function showTeaching(item, wrongBin) {
  const teach = $("#game-teach");
  if (!teach) return;
  const bin = BINS[item.bin];
  teach.hidden = false;
  teach.innerHTML =
    '<div class="teach-head">' + icon("cross", 16) + " Not quite.</div>" +
    "<p>" + esc(item.why) + "</p>" +
    '<p class="teach-correct"><strong>Correct: ' + esc(bin.name) + "</strong> — " + esc(bin.sub) + "</p>" +
    '<p class="teach-why">' + icon("bulb", 15) + " <strong>Why?</strong> " + esc(item.science) + "</p>" +
    '<p class="teach-wrong">You chose: ' + esc(BINS[wrongBin] ? BINS[wrongBin].name : "that bin") + ".</p>" +
    sourceLine(item.src);
}

function finishGame() {
  const fb = $("#game-feedback");
  if (!fb) return;
  const pct = Math.round((gameScore / gamePool.length) * 100);
  let msg;
  if (gameScore === gamePool.length) msg = "Perfect score — you're a true waste-sorting expert.";
  else if (gameScore >= gamePool.length - 1) msg = "Great job — you really know your bins, just one or two to review.";
  else if (gameScore >= Math.ceil(gamePool.length / 2)) msg = "Nice work — read the explanations above to level up.";
  else msg = "Good start — read the Science page, then try again.";

  fb.hidden = false;
  fb.innerHTML =
    '<p class="game-final">You scored <strong>' + gameScore + " / " + gamePool.length + "</strong> (" + pct + "%). " + esc(msg) + "</p>" +
    '<div class="cat-actions">' +
      '<button class="btn btn-primary" type="button" data-action="restart">Play again</button>' +
      '<button class="btn" type="button" data-action="go-science">Read the science</button>' +
    "</div>";

  const restart = fb.querySelector('[data-action="restart"]');
  if (restart) restart.addEventListener("click", startGame);
  const sci = fb.querySelector('[data-action="go-science"]');
  if (sci) sci.addEventListener("click", () => activateTab("science"));
  fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ==================================================================
   REFERENCES
   ================================================================== */
function buildReferences() {
  const host = $("#references-list");
  if (!host) return;
  host.innerHTML = REFERENCE_ORDER.map((key, i) => {
    const r = REFERENCES[key];
    if (!r) return "";
    return '<li class="ref">' +
      '<span class="ref-n">' + (i + 1) + "</span>" +
      '<div class="ref-body">' +
        '<a class="ref-title" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.label) + "</a>" +
        '<span class="ref-org">' + esc(r.org) + "</span>" +
        '<span class="ref-used">Used in this project for: ' + esc(r.used) + "</span>" +
        '<span class="ref-url">' + esc(r.url) + "</span>" +
      "</div>" +
    "</li>";
  }).join("");

  const count = $("#references-count");
  if (count) count.textContent = String(REFERENCE_ORDER.length);
}

/* ==================================================================
   FEEDBACK — honest, local-only, with no fake submission
   ================================================================== */
function loadFeedback() {
  try {
    const raw = window.localStorage.getItem(FEEDBACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Could not read stored feedback:", err);
    return [];
  }
}

function saveFeedback(list) {
  try {
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error("Could not store feedback locally:", err);
    return false;
  }
}

function renderFeedbackList() {
  const host = $("#feedback-list");
  const empty = $("#feedback-empty");
  if (!host) return;
  const list = loadFeedback();
  if (empty) empty.hidden = list.length > 0;
  host.innerHTML = list.slice().reverse().map((f) =>
    '<li class="fb-entry">' +
      '<div class="fb-meta"><span class="fb-type">' + esc(f.type) + "</span><span class=\"fb-date\">" + esc(f.date) + "</span></div>" +
      "<p>" + esc(f.message) + "</p>" +
    "</li>"
  ).join("");
  const c = $("#feedback-count");
  if (c) c.textContent = String(list.length);
}

function initFeedbackForm() {
  const form = $("#feedback-form");
  if (!form) return;
  const status = $("#feedback-status");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const typeEl = form.querySelector('[name="type"]');
    const msgEl = form.querySelector('[name="message"]');
    const type = String((typeEl && typeEl.value) || "").trim();
    const message = String((msgEl && msgEl.value) || "").trim();

    if (!type || message.length < 5) {
      if (status) {
        status.textContent = "Please choose a topic and write at least a few words.";
        status.dataset.tone = "warn";
      }
      return;
    }

    const entry = { type, message, date: new Date().toLocaleString("en-AU") };
    const list = loadFeedback();
    list.push(entry);

    if (saveFeedback(list)) {
      form.reset();
      renderFeedbackList();
      if (status) {
        status.textContent = "Saved in this browser only. Nothing was sent anywhere — copy or download it to share it.";
        status.dataset.tone = "ok";
      }
    } else if (status) {
      status.textContent = "This browser would not let the page store your feedback. Copy your message and send it directly instead.";
      status.dataset.tone = "warn";
    }
  });

  const copy = $("#feedback-copy");
  if (copy) copy.addEventListener("click", async () => {
    const list = loadFeedback();
    if (!list.length) { setFeedbackStatus("Nothing saved yet.", "warn"); return; }
    const text = list.map((f) => "[" + f.date + "] " + f.type + "\n" + f.message).join("\n\n");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setFeedbackStatus("Copied " + list.length + " entr" + (list.length === 1 ? "y" : "ies") + " to the clipboard.", "ok");
      } else {
        throw new Error("clipboard unavailable");
      }
    } catch (err) {
      console.warn("Clipboard unavailable, falling back to download:", err);
      downloadFeedback();
      setFeedbackStatus("Clipboard was blocked, so a text file was downloaded instead.", "warn");
    }
  });

  const dl = $("#feedback-download");
  if (dl) dl.addEventListener("click", () => {
    const list = loadFeedback();
    if (!list.length) { setFeedbackStatus("Nothing saved yet.", "warn"); return; }
    downloadFeedback();
    setFeedbackStatus("Downloaded as a text file.", "ok");
  });

  const clear = $("#feedback-clear");
  if (clear) clear.addEventListener("click", () => {
    try { window.localStorage.removeItem(FEEDBACK_KEY); } catch (err) { console.warn("Could not clear stored feedback:", err); }
    renderFeedbackList();
    setFeedbackStatus("Cleared from this browser.", "ok");
  });
}

function setFeedbackStatus(text, tone) {
  const status = $("#feedback-status");
  if (!status) return;
  status.textContent = text;
  status.dataset.tone = tone || "";
}

function downloadFeedback() {
  const list = loadFeedback();
  const text = "EcoScan SA — feedback\nSaved " + new Date().toLocaleString("en-AU") + "\n\n" +
    list.map((f) => "[" + f.date + "] " + f.type + "\n" + f.message).join("\n\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ecoscan-feedback.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ==================================================================
   WIRE UP
   ================================================================== */
if (scanButton) scanButton.addEventListener("click", runScan);
$$('[data-action="restart"]').forEach((b) => b.addEventListener("click", startGame));

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && camState === "live") stopCamera("off");
});
window.addEventListener("pagehide", () => stopStream());

window.addEventListener("resize", () => {
  if (camState !== "live") clearOverlay();
});

/* ==================================================================
   INIT
   ================================================================== */
function init() {
  if (modelNote) {
    modelNote.textContent = "Runs on your device — no photo is ever uploaded. The model is about " +
      MODEL_MB + " MB and the browser runtime about " + (WASM_BYTES / 1048576).toFixed(0) +
      " MB; both download once and are then cached, so roughly " + FIRST_RUN_MB +
      " MB on a first visit and almost nothing after that.";
  }
  if (modelPreload) {
    modelPreload.addEventListener("click", () => {
      modelPreload.disabled = true;
      loadDetector({ force: false }).then((d) => { modelPreload.disabled = false; syncScanButton(); return d; });
    });
  }

  buildLegend();
  buildItemGrid();
  buildScience();
  buildReferences();
  buildBins();
  gamePool = shuffle(GAME_ITEMS).slice(0, 5);
  renderRound();
  initFeedbackForm();
  renderFeedbackList();

  // The model is deliberately NOT loaded here — it is about 41 MB and is
  // fetched lazily on the first scan. See runScan().
  setModelLoading("AI model loads on first scan (~41 MB)", 0);
  startCamera();
}

init();
