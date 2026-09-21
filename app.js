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
let modelLoading = false;
let modelFailed = false;
let modelBackend = null;
let camState = "starting"; // starting | live | error | paused | off
let scanning = false;

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
const captureCtx = captureCanvas.getContext("2d", { willReadFrequently: true });
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
const photoImg = $("#scan-photo");
const photoInput = $("#photo-input");
const photoButton = $("#photo-button");
let photoActive = false;
let photoDataUrl = "";
const modelNote = $("#model-note");
const resultEmpty = $("#result-empty");
const resultContent = $("#result-content");

const SCAN_THRESHOLD = 0.45;
const SCAN_TIMEOUT_MS = 90000;
/**
 * Browser-ESM entry points for Transformers.js, tried in order.
 *
 * The plain dist bundle (dist/transformers.web.min.js) begins with:
 *   import*as e from"onnxruntime-common";import*as t from"onnxruntime-web";
 * Those are BARE specifiers. A browser resolves a bare specifier relative to
 * the importing script, so it requests
 *   https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/dist/onnxruntime-common
 * which 404s, and the dynamic import() rejects before a single line of the
 * library runs. That file is a bundler intermediate, not a browser entry point.
 *
 * The `+esm` endpoints are pre-bundled with every bare specifier rewritten to
 * a root-relative URL ("/npm/onnxruntime-common/+esm"), which is the only form
 * a browser can actually resolve. Verified by inspecting the served bytes.
 */
const TRANSFORMERS_URLS = [
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/+esm",
  "https://esm.sh/@huggingface/transformers@3.4.0",
];
const MODEL_ID = "Xenova/detr-resnet-50";
// onnx/model_quantized.onnx for MODEL_ID, measured from the repo tree.
const MODEL_BYTES = 43102531;
const MODEL_MB = (MODEL_BYTES / 1048576).toFixed(1);
// ort-wasm-simd-threaded.jsep.wasm shipped inside the same npm package.
const WASM_BYTES = 23929658;
const FIRST_RUN_MB = ((MODEL_BYTES + WASM_BYTES) / 1048576).toFixed(0);

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
  camDot.classList.remove("live", "error");
  cameraBox.classList.remove("live", "scanning");
  cameraState.classList.remove("error");

  if (state === "live") {
    camDot.classList.add("live");
    cameraBox.classList.add("live");
    camStatus.textContent = "live";
    // an explicit message (e.g. "photo loaded") wins over clearing the panel
    cameraState.innerHTML = message ? "<p>" + esc(message) + "</p>" : "";
    video.classList.add("active");
  } else if (state === "error") {
    camDot.classList.add("error");
    cameraStatusError(message);
  } else if (state === "paused") {
    camStatus.textContent = "paused";
    cameraState.innerHTML = '<p>' + icon("cameraOff", 18) + " Camera paused. Return to the Scan tab to resume.</p>";
    video.classList.remove("active");
  } else if (state === "off") {
    camStatus.textContent = "off";
    cameraState.innerHTML = '<p>' + icon("cameraOff", 18) + " Camera released while this tab was hidden. Press Scan Item to restart it.</p>";
    video.classList.remove("active");
  } else {
    camStatus.textContent = "starting";
    cameraState.innerHTML = "<p>Requesting camera access…</p>";
    video.classList.remove("active");
  }
  syncScanButton();
}

function cameraStatusError(message) {
  camStatus.textContent = "no camera";
  cameraState.classList.add("error");
  cameraState.innerHTML =
    '<p>' + esc(message || "Camera unavailable.") + '</p>' +
    '<button class="btn btn-ghost btn-sm" type="button" id="cam-retry">' + icon("refresh", 16) + " Try again</button>";
  const retry = $("#cam-retry");
  if (retry) retry.addEventListener("click", () => { startCamera(); });
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
    video.srcObject = cameraStream;
    await video.play();
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
  if (video.srcObject) video.srcObject = null;
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
 *
 * This ladder used to escalate to webgpu/fp16 (79.9 MiB) and then wasm/fp32
 * (159.1 MiB). Each "recovery" attempt therefore downloaded a model up to four
 * times larger than the one that had just failed — 303 MiB in total before
 * giving up. Recovery must never cost more than the attempt it is recovering
 * from. Verified sizes from the repo tree:
 *   q8/model_quantized.onnx  43,102,531 B   <- used by every step
 *   fp16/model_fp16.onnx     83,812,437 B   <- never requested
 *   fp32/model.onnx         166,789,212 B   <- never requested
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
  modelState.classList.remove("ready", "error");
  modelText.textContent = text || "Loading AI model…";
  modelPct.textContent = pct != null ? pct + "%" : "";
  modelProgress.style.width = (pct != null ? pct : 0) + "%";
  modelProgress.setAttribute("aria-valuenow", String(pct != null ? pct : 0));
  syncScanButton();
}

function setModelReady() {
  modelFailed = false;
  modelState.classList.add("ready");
  modelState.classList.remove("error");
  modelText.textContent = modelBackend ? "AI model ready · " + modelBackend : "AI model ready";
  modelPct.textContent = "";
  modelProgress.style.width = "100%";
  modelProgress.setAttribute("aria-valuenow", "100");
  const old = modelState.querySelector(".model-retry");
  if (old) old.remove();
  syncScanButton();
}

function setModelError(msg) {
  modelFailed = true;
  modelState.classList.add("error");
  modelState.classList.remove("ready");
  modelText.textContent = msg || "Could not load the AI model.";
  modelPct.textContent = "";
  modelProgress.style.width = "0%";
  modelProgress.setAttribute("aria-valuenow", "0");

  if (!modelState.querySelector(".model-retry")) {
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

async function loadDetector(opts = {}) {
  if (detector && !opts.force) return detector;
  if (modelLoading) return null;
  modelLoading = true;
  modelFailed = false;

  try {
    setModelLoading("Loading AI engine…", 0);
    let mod = null;
    const importErrors = [];
    for (const url of TRANSFORMERS_URLS) {
      try {
        const candidate = await import(/* @vite-ignore */ url);
        if (candidate && typeof candidate.pipeline === "function") { mod = candidate; break; }
        importErrors.push(url + " — loaded but exposed no pipeline()");
      } catch (importErr) {
        console.warn("Could not load Transformers.js from " + url + ":", importErr);
        importErrors.push(url + " — " + ((importErr && importErr.message) || String(importErr)));
      }
    }
    if (!mod) throw new Error("Could not load the Transformers.js library. " + importErrors.join(" | "));
    const pipeline = mod.pipeline;
    const env = mod.env;
    if (env) env.allowLocalModels = false;

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
   CLASSIFICATION PIPELINE (layers 2 → 5)
   ================================================================== */

/**
 * Coerce a detection score to a 0–1 fraction.
 * transformers.js emits fractions by default but multiplies by 100 when a
 * caller passes `percentage: true`. Accept either rather than silently
 * clamping 91 down to 1 — that bug made every scan look 100% certain.
 */
function normaliseScore(raw) {
  let s = Number(raw);
  if (!Number.isFinite(s)) return 0;
  if (s > 1) s = s / 100;
  return Math.max(0, Math.min(1, s));
}

/** Layer 2+3+4+5 for a single detection. */
function analyseDetection(det) {
  const rawLabel = String((det && det.label) || "").toLowerCase().trim();
  const detectionScore = normaliseScore(det && det.score);

  // Layer 2 — object recognition result → waste-relevant concept
  if (!Object.prototype.hasOwnProperty.call(LABEL_TO_CONCEPT, rawLabel)) {
    return {
      rawLabel, detectionScore, concept: null, category: "none",
      materialShare: 0, conditionRisk: 0, disposalScore: 0,
      band: confidenceBand(0), alternatives: [],
      reason: "unknown-label",
    };
  }

  const conceptKey = LABEL_TO_CONCEPT[rawLabel];
  const concept = CONCEPTS[conceptKey];
  if (!concept) {
    console.warn("Concept missing for label:", rawLabel, "→", conceptKey);
    return {
      rawLabel, detectionScore, concept: null, category: "none",
      materialShare: 0, conditionRisk: 0, disposalScore: 0,
      band: confidenceBand(0), alternatives: [],
      reason: "missing-concept",
    };
  }

  // Layer 3 — aggregate materials by the category they lead to
  const totalWeight = concept.materials.reduce((s, m) => s + Math.max(0, m.weight || 0), 0) || 1;
  const byCategory = new Map();
  for (const m of concept.materials) {
    const w = Math.max(0, m.weight || 0) / totalWeight;
    byCategory.set(m.category, (byCategory.get(m.category) || 0) + w);
  }
  const ranked = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  const [topCategory, materialShare] = ranked[0];

  // A concept whose most likely material is itself "uncertain" cannot yield a verdict.
  if (topCategory === "uncertain") {
    return {
      rawLabel, detectionScore, concept, category: "uncertain",
      materialShare, conditionRisk: concept.conditionRisk || 0, disposalScore: 0,
      band: confidenceBand(0),
      alternatives: ranked.filter(([c]) => c !== "uncertain").map(([c, w]) => ({ category: c, share: w })),
      reason: "material-ambiguous",
    };
  }

  // Layer 5 — disposal confidence
  const conditionRisk = concept.conditionRisk || 0;
  const disposalScore = disposalConfidence(detectionScore, materialShare, conditionRisk);
  const band = confidenceBand(disposalScore);

  // Layer 6 — verdict, or an explicit refusal to guess
  return {
    rawLabel, detectionScore, concept,
    category: band.key === "low" ? "uncertain" : topCategory,
    confidentCategory: topCategory,
    materialShare, conditionRisk, disposalScore, band,
    alternatives: ranked.slice(1).map(([category, share]) => ({ category, share })),
    reason: band.key === "low" ? "low-confidence" : "ok",
  };
}

/* ==================================================================
   SCAN FLOW
   ================================================================== */
function syncScanButton() {
  const ready = camState === "live" && !scanning;
  scanButton.disabled = !ready;
  const span = scanButton.querySelector("span");
  if (span) {
    span.textContent = scanning ? "Scanning…"
      : (camState === "live" && !detector) ? "Load model & scan"
      : "Scan Item";
  }
  // Offer the download as a deliberate choice rather than a surprise mid-scan.
  if (modelPreload) modelPreload.hidden = !!detector || modelLoading || modelFailed;
}

function captureFrame() {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const scale = Math.min(1, 640 / vw);
  captureCanvas.width = Math.max(1, Math.round(vw * scale));
  captureCanvas.height = Math.max(1, Math.round(vh * scale));
  captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  return captureCanvas.toDataURL("image/jpeg", 0.85);
}

function clearOverlay() {
  if (!overlayCtx || !overlayCanvas) return;
  overlayCanvas.width = overlayCanvas.clientWidth || 1;
  overlayCanvas.height = overlayCanvas.clientHeight || 1;
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

/**
 * Draw detection boxes on the overlay.
 *
 * The pipeline returns `box: { xmin, ymin, xmax, ymax }` in PIXELS of the frame
 * we handed it (transformers.js rescales back to the original image size). An
 * earlier version read `b.x / b.y / b.width / b.height`, which are not keys the
 * pipeline ever emits, so every value was undefined, coalesced to 0, and every
 * box was drawn at the top-left corner with zero size — the boxes were never
 * visible at all.
 *
 * Scaling is done from the known source pixel dimensions rather than the
 * pipeline's `percentage` option, so the result does not depend on whether that
 * option returns 0-100 or 0-1.
 */
function drawDetections(dets, srcW, srcH) {
  if (!overlayCtx || !overlayCanvas) return;
  const w = overlayCanvas.clientWidth || 1;
  const h = overlayCanvas.clientHeight || 1;
  overlayCanvas.width = w;
  overlayCanvas.height = h;
  overlayCtx.clearRect(0, 0, w, h);

  const sw = Number(srcW) > 0 ? Number(srcW) : 1;
  const sh = Number(srcH) > 0 ? Number(srcH) : 1;
  const sx = w / sw;
  const sy = h / sh;

  dets.forEach((d, i) => {
    const b = (d && d.box) || {};
    // primary shape from the pipeline; the fallback keeps older/stub shapes working
    const left = Number.isFinite(b.xmin) ? b.xmin : (Number.isFinite(b.x) ? b.x : 0);
    const top0 = Number.isFinite(b.ymin) ? b.ymin : (Number.isFinite(b.y) ? b.y : 0);
    const right = Number.isFinite(b.xmax) ? b.xmax : left + (Number.isFinite(b.width) ? b.width : 0);
    const bottom = Number.isFinite(b.ymax) ? b.ymax : top0 + (Number.isFinite(b.height) ? b.height : 0);
    const x = left * sx;
    const y = top0 * sy;
    const bw = Math.max(0, (right - left) * sx);
    const bh = Math.max(0, (bottom - top0) * sy);
    if (bw <= 0 || bh <= 0) return;
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

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Scan a chosen photo instead of the live camera.
 *
 * getUserMedia is frequently unavailable even when a camera exists — inside a
 * sandboxed or cross-origin iframe without an `allow="camera"` permission policy
 * it throws a SecurityError before the user is ever prompted. This path runs the
 * exact same model and the exact same analysis, so the scanner still works.
 */
async function loadPhoto(file) {
  if (!file) return false;
  if (!/^image\//.test(file.type || "")) {
    setCamState("error", "That file is not an image. Choose a photo such as a JPG or PNG.");
    return false;
  }
  photoDataUrl = await readAsDataURL(file);
  photoActive = true;
  if (photoImg) {
    photoImg.src = photoDataUrl;
    photoImg.hidden = false;
  }
  if (video) video.style.visibility = "hidden";
  stopStream();
  setCamState("live", "Photo loaded — press Scan Item");
  return true;
}

async function runScan() {
  if (scanning) return;

  if (!photoActive && camState !== "live") {
    if (camState === "error" || camState === "paused" || camState === "off") {
      const started = await ensureCamera();
      if (!started) {
        renderNoVerdict({
          title: "CAMERA NOT AVAILABLE",
          meta: "Scan cancelled",
          body: "The scanner needs the camera to identify an item. Choose \u201cUse a photo instead of the camera\u201d below, or use the manual lookup to find the right bin.",
        });
      }
    }
    return;
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
  cameraBox.classList.add("scanning");
  syncScanButton();

  try {
    const frame = photoActive ? photoDataUrl : captureFrame();
    const frameW = photoActive ? (photoImg.naturalWidth || 640) : captureCanvas.width;
    const frameH = photoActive ? (photoImg.naturalHeight || 480) : captureCanvas.height;
    // No `percentage` option: that flag rescales the BOX coordinates only (never
    // the scores), and its scale is ambiguous. Boxes stay in pixels of `frame`,
    // whose dimensions we know exactly, so drawDetections can scale them itself.
    const outputs = await withTimeout(detector(frame, { threshold: SCAN_THRESHOLD }), SCAN_TIMEOUT_MS, "Inference timed out");
    handleDetections(outputs, frameW, frameH);
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
    cameraBox.classList.remove("scanning");
    syncScanButton();
  }
}

function handleDetections(outputs, srcW, srcH) {
  const list = Array.isArray(outputs) ? outputs.slice() : [];

  if (!list.length) {
    clearOverlay();
    renderNoVerdict({
      title: "NO OBJECT DETECTED",
      meta: "Nothing above " + Math.round(SCAN_THRESHOLD * 100) + "% detection confidence",
      body: "The scanner could not confidently identify anything in that frame. Move closer so the item fills the frame, improve the lighting, and scan again — or use the manual lookup below.",
    });
    return;
  }

  list.sort((a, b) => (b.score || 0) - (a.score || 0));
  drawDetections(list, srcW, srcH);

  const analysis = analyseDetection(list[0]);
  const others = list.slice(1, 4).map((d) => String(d.label || "").toLowerCase() + " " + Math.round((d.score || 0) * 100) + "%");

  if (analysis.category === "none") {
    renderNoVerdict({
      title: "ITEM NOT RECOGNISED",
      meta: "Detected: " + esc(analysis.rawLabel || "unknown") + " · " + Math.round(analysis.detectionScore * 100) + "% detection confidence",
      body: "The scanner found something but has no South Australian disposal rule for it. Check the manual lookup below or the official Which Bin guide rather than guessing.",
      also: others,
    });
    return;
  }

  renderScanResult(analysis, others);
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
  resultEmpty.hidden = true;
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

function renderScanResult(a, others) {
  const cat = CATEGORIES[a.category];
  const isVerdict = !!cat.bin;
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

  resultEmpty.hidden = true;
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
  resultContent.hidden = true;
  resultContent.innerHTML = "";
  resultEmpty.hidden = false;
  clearOverlay();
}

/* ==================================================================
   MANUAL LOOKUP
   ================================================================== */
function buildItemGrid() {
  const grid = $("#item-grid");
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

  resultEmpty.hidden = true;
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
  const panel = $("#result-panel");
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ==================================================================
   BIN LEGEND
   ================================================================== */
function buildLegend() {
  const legend = $("#bin-legend");
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
      'aria-label="' + esc(i.name) + '. Select then choose a bin.">' +
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
scanButton.addEventListener("click", runScan);
$$('[data-action="restart"]').forEach((b) => b.addEventListener("click", startGame));

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && camState === "live") stopCamera("off");
});
window.addEventListener("pagehide", () => stopStream());

window.addEventListener("resize", () => {
  // Keep overlay boxes aligned with the video box after a layout change.
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
  if (photoButton && photoInput) {
    photoButton.addEventListener("click", () => { photoInput.click(); });
    photoInput.addEventListener("change", () => {
      const f = photoInput.files && photoInput.files[0];
      photoInput.value = "";
      if (f) loadPhoto(f).catch((err) => {
        console.error("Could not read that photo:", err);
        setCamState("error", "That photo could not be read. Try a different image.");
      });
    });
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
