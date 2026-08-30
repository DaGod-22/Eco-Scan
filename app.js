/* =====================================================================
   EcoScan SA — Smart Waste Sorting Guide
   Live camera + on-device object detection via Hugging Face Transformers.js
   (Xenova/detr-resnet-50). Vanilla JS, no build step.
   ===================================================================== */

/* ------------------------------------------------------------------
   ICONS — minimal line icons (24x24 stroke)
   ------------------------------------------------------------------ */
const ICONS = {
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  recycle: '<path d="M7 19H4.8a1.83 1.83 0 0 1-1.57-.88 1.78 1.78 0 0 1 0-1.79L7.2 9.5"/><path d="M11 19h8.2a1.83 1.83 0 0 0 1.56-.89 1.78 1.78 0 0 0 0-1.78L19.5 14.2"/><path d="m14 16-3 3 3 3"/><path d="M8.29 13.6 7.2 9.5 3.1 10.6"/><path d="m9.34 5.81 1.09-1.89A1.83 1.83 0 0 1 12.01 3c.64 0 1.22.33 1.57.88l1.78 3.08"/><path d="m19 5 3 1-1 3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',

  pizza: '<path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/>',
  banana: '<path d="M4 13c4-5.5 8-5.5 14-5 1.2.06 2.2.2 3 .4-1 6.5-5.5 12.6-11 12.6-2.5 0-4.5-2-4.5-3.5 0-1.2 1.2-1.8 1.8-2.4C6.5 14.8 4 14 4 13Z"/>',
  apple: '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>',
  scroll: '<path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
  carrot: '<path d="M2.27 21.73s9.87-1.42 13.85-5.4c2.86-2.86 3.88-7.13 3.88-7.13s-4.27 1.02-7.13 3.88c-3.98 3.98-5.4 13.85-5.4 13.85"/><path d="M8.69 15.31 2.27 21.73"/><path d="M15.31 8.69 21.73 2.27"/><path d="M7.5 16.5 9 18"/>',
  can: '<path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M4 9h16"/><path d="M9 14h6"/>',
  bottle: '<path d="M10 2h4"/><path d="M11 2v3.5L8.7 9.3A6 6 0 0 0 7.5 13v6.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5V13a6 6 0 0 0-1.2-3.7L13 5.5V2"/><path d="M7.5 13h9"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  jar: '<path d="M6 3h12l1 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z"/><path d="M5 6h14"/><path d="M10 11h4"/>',
  milk: '<path d="M8 2h8"/><path d="M9 2v2.79a2 2 0 0 1-.57 1.4L5.8 8.9A2 2 0 0 0 5.2 10.3V20a2 2 0 0 0 2 2h9.6a2 2 0 0 0 2-2v-9.7a2 2 0 0 0-.6-1.4l-2.63-2.71A2 2 0 0 1 15 4.79V2"/><path d="M5 10h14"/>',
  bread: '<path d="M5 8c0-2.2 1.8-4 4-4 .8 0 1.5.2 2.1.6A4 4 0 0 1 15 4c2.2 0 4 1.8 4 4 0 .6-.1 1.2-.4 1.7.3.6.4 1.3.4 2a4 4 0 0 1-4 4h-3c-.7 0-1.4-.2-2-.5A4 4 0 0 1 5 12c0-.7.2-1.4.5-2.1C5.2 9.3 5 8.7 5 8Z"/><path d="M8 8h8"/>',
  glass: '<path d="M4 4h16l-1.6 16a2 2 0 0 1-2 1.6H7.6a2 2 0 0 1-2-1.6Z"/><path d="M7 8h10"/>',
  battery: '<rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2Z"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
};

function icon(name, size) {
  return '<svg viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
}

/* ------------------------------------------------------------------
   DATA — South Australian "Which Bin" rules
   ------------------------------------------------------------------ */
const BINS = {
  green: { key: "green", name: "Green Bin", sub: "Organics (FOGO)", icon: "leaf", lid: "#1E4620" },
  yellow: { key: "yellow", name: "Yellow Bin", sub: "Recycling", icon: "recycle", lid: "#c98f00" },
  blue: { key: "blue", name: "Blue Bin", sub: "Landfill / General", icon: "trash", lid: "#2454a6" },
  hazwaste: { key: "hazwaste", name: "Specialised Drop-off", sub: "Hazwaste / E-waste", icon: "alert", lid: "#5a3fbf" },
};

// Manual lookup catalogue (known items, exact answers).
const ITEMS = [
  { id: "pizza", name: "Greasy Pizza Box", icon: "pizza", bin: "green", why: "Grease soaks into the cardboard fibres, ruining the recycling process — but those same fibres compost perfectly. In the green bin it breaks down into rich soil, not methane." },
  { id: "banana", name: "Banana Peel", icon: "banana", bin: "green", why: "Food scraps become nutrient-rich compost in the green bin. In landfill they rot without oxygen and release methane, a greenhouse gas 28× stronger than CO₂." },
  { id: "apple", name: "Apple Core", icon: "apple", bin: "green", why: "Like all food scraps, an apple core composts aerobically in the green bin into healthy soil — instead of producing methane in landfill." },
  { id: "papertowel", name: "Paper Towel", icon: "scroll", bin: "green", why: "Paper towels are usually too soiled to recycle and their fibres are too short — but they compost beautifully, so they belong in the green organics bin." },
  { id: "foodscraps", name: "Food Scraps", icon: "carrot", bin: "green", why: "In South Australia's green bin, food scraps are turned into compost at large-scale facilities. Composting with oxygen avoids the methane that landfill produces." },
  { id: "can", name: "Aluminium Can", icon: "can", bin: "yellow", why: "Aluminium is infinitely recyclable. Recycling one can saves about 95% of the energy needed to mine and refine brand-new aluminium." },
  { id: "bottle", name: "Plastic Bottle (clean)", icon: "bottle", bin: "yellow", why: "Clean PET bottles are melted down and re-formed into new products, saving oil and about 88% of the energy. Rinse it and keep the lid on." },
  { id: "cardboard", name: "Clean Cardboard Box", icon: "box", bin: "yellow", why: "Clean, flat cardboard is one of the easiest materials to recycle — it becomes new cardboard, saving trees, water and energy." },
  { id: "glassjar", name: "Glass Jar / Bottle", icon: "jar", bin: "yellow", why: "Glass jars and bottles are recycled in SA and melted into new glass. (Drinking glasses and window glass are a different type and can't be recycled.)" },
  { id: "milk", name: "Milk / Juice Carton", icon: "milk", bin: "yellow", why: "Cartons are made of layered paperboard, plastic and sometimes aluminium — South Australia's facilities can separate and recycle these layers." },
  { id: "breadbag", name: "Soft Plastic Bread Bag", icon: "bread", bin: "blue", why: "Soft plastics jam the spinning sorting machinery at recycling facilities, so they must go to landfill (or a specialised drop-off)." },
  { id: "chips", name: "Chip Packet", icon: "scroll", bin: "blue", why: "The shiny foil-plastic layers can't be separated economically, and like all soft plastics they tangle the sorting machines — so they go to landfill." },
  { id: "brokenglass", name: "Broken Drinking Glass", icon: "glass", bin: "blue", why: "Drinking glasses are a different, heat-treated glass that melts at a different temperature to jars — one wrong piece can ruin a whole recycling batch, so it goes to landfill." },
  { id: "battery", name: "AA Battery", icon: "battery", bin: "hazwaste", why: "Batteries contain toxic heavy metals and can spark fires in trucks and facilities. They CANNOT go in any household bin — drop them at a B-cycle collection point." },
  { id: "globe", name: "Light Globe", icon: "bulb", bin: "hazwaste", why: "Globes contain mercury and glass that can't be recycled normally. Take them to a specialised drop-off or a retail collection point." },
  { id: "ewaste", name: "E-waste (Phone)", icon: "phone", bin: "hazwaste", why: "Electronics contain valuable metals and toxic materials. They can't go in any household bin — recycle them at a dedicated e-waste drop-off." },
];

const GAME_ITEMS = ITEMS.filter((i) => i.bin !== "hazwaste");
const BIN_TO_CATEGORY = { green: "organics", yellow: "recycling", blue: "landfill", hazwaste: "ewaste" };

/* ------------------------------------------------------------------
   AI CLASSIFICATION (deterministic, expandable)
   ------------------------------------------------------------------ */
const WASTE_LABELS = {
  organics: ["apple", "banana", "orange", "broccoli", "carrot", "sandwich", "pizza", "cake", "donut", "hot dog", "potted plant", "bowl of food", "food"],
  recycling: ["bottle", "wine glass", "cup", "bowl", "vase", "spoon", "fork", "knife"],
  ewaste: ["cell phone", "laptop", "tv", "television", "remote", "keyboard", "mouse", "computer", "monitor"],
};

const CATEGORY_INFO = {
  organics: {
    title: "GREEN ORGANICS BIN",
    explanation: "Food and biological matter belongs in the green organics bin. Composting with oxygen turns it into rich soil — instead of rotting in landfill and releasing methane, a greenhouse gas 28× stronger than CO₂.",
  },
  recycling: {
    title: "YELLOW RECYCLING BIN",
    explanation: "Rigid containers like bottles and cans are recyclable. Empty them, rinse lightly, and keep lids on so they can be sorted and re-made into new products — saving energy and resources.",
  },
  ewaste: {
    title: "SPECIALISED DROP-OFF ONLY",
    explanation: "Electronics contain hazardous components such as batteries, circuit boards and heavy metals, and must not go in any household bin. Take them to a dedicated e-waste drop-off or retailer collection point.",
  },
  landfill: {
    title: "BLUE LANDFILL BIN",
    explanation: "Mixed-material or soft-plastic items can interfere with local sorting systems and jam recycling machinery. When uncertain, place them in the blue landfill bin — or check a specialised drop-off.",
  },
};

const UNCERTAINTY_NOTE = "AI-assisted identification — results are an estimate. For ambiguous materials, check the official Which Bin rules before disposing.";

function classify(label) {
  const l = (label || "").toLowerCase().trim();
  if (!l) return "landfill";
  if (WASTE_LABELS.organics.includes(l)) return "organics";
  if (WASTE_LABELS.recycling.includes(l)) return "recycling";
  if (WASTE_LABELS.ewaste.includes(l)) return "ewaste";
  return "landfill";
}

/* ------------------------------------------------------------------
   STATE
   ------------------------------------------------------------------ */
let cameraStream = null;
let detector = null;
let modelLoading = false;
let camState = "starting"; // starting | live | error | paused
let scanning = false;

let gameScore = 0;
let answered = 0;
let selectedItem = null;

/* ------------------------------------------------------------------
   DOM HELPERS
   ------------------------------------------------------------------ */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const video = $("#webcam");
const captureCanvas = $("#capture");
const captureCtx = captureCanvas.getContext("2d", { willReadFrequently: true });
const cameraBox = $("#camera");
const camDot = $("#cam-dot");
const camStatus = $("#cam-status");
const cameraState = $("#camera-state");
const modelState = $("#model-state");
const modelText = $("#model-text");
const modelPct = $("#model-pct");
const modelProgress = $("#model-progress");
const scanButton = $("#scan-button");
const resultEmpty = $("#result-empty");
const resultContent = $("#result-content");

/* ------------------------------------------------------------------
   NAVIGATION (SPA)
   ------------------------------------------------------------------ */
function activateTab(tab) {
  $$(".bnav-item").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
  $$(".page").forEach((p) => p.classList.toggle("is-active", p.dataset.page === tab));
  if (tab === "home") {
    ensureCamera();
  } else {
    stopCamera("paused");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".bnav-item").forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));

/* ------------------------------------------------------------------
   CAMERA
   ------------------------------------------------------------------ */
function setCamState(state, message) {
  camState = state;
  camDot.classList.remove("live", "error");
  cameraBox.classList.remove("live", "scanning");
  cameraState.classList.remove("error");

  if (state === "live") {
    camDot.classList.add("live");
    cameraBox.classList.add("live");
    camStatus.textContent = "live";
    cameraState.innerHTML = "";
    video.classList.add("active");
  } else if (state === "error") {
    camDot.classList.add("error");
    cameraStatusError(message);
  } else if (state === "paused") {
    camStatus.textContent = "paused";
    cameraState.innerHTML = '<p>Camera paused. Return to the Scan tab to resume.</p>';
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
    '<p>' + (message || "Camera unavailable.") + '</p><button class="btn btn-ghost btn-sm" id="cam-retry">' + icon("refresh", 16) + " Try again</button>";
  const retry = $("#cam-retry");
  if (retry) retry.addEventListener("click", () => startCamera());
}

async function startCamera() {
  setCamState("starting");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCamState("error", "This browser does not support camera access. Use the manual lookup below.");
    return;
  }
  try {
    stopStream(); // release any existing stream first
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    video.srcObject = cameraStream;
    await video.play();
    setCamState("live");
  } catch (err) {
    let msg = "Camera access was denied or unavailable. Use the manual lookup below.";
    if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
      msg = "Camera permission was blocked. Allow camera access in your browser and try again — or use the manual lookup below.";
    } else if (err && err.name === "NotFoundError") {
      msg = "No camera was found on this device. Use the manual lookup below.";
    }
    setCamState("error", msg);
  }
}

function stopStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  if (video.srcObject) {
    video.srcObject = null;
  }
}

function stopCamera(mode) {
  if (mode === "paused") {
    stopStream();
    setCamState("paused");
  }
}

function ensureCamera() {
  if (camState === "live") return;
  if (camState === "starting") return;
  startCamera();
}

/* ------------------------------------------------------------------
   MODEL (Transformers.js)
   ------------------------------------------------------------------ */
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/dist/transformers.web.js";
const MODEL_ID = "Xenova/detr-resnet-50";

function setModelLoading(text, pct) {
  modelState.classList.remove("ready", "error");
  modelText.textContent = text || "Loading AI model…";
  modelPct.textContent = pct != null ? pct + "%" : "";
  modelProgress.style.width = (pct != null ? pct : 0) + "%";
  syncScanButton();
}

function setModelReady() {
  modelState.classList.add("ready");
  modelState.classList.remove("error");
  modelText.textContent = "AI model ready";
  modelPct.textContent = "";
  modelProgress.style.width = "100%";
  syncScanButton();
}

function setModelError(msg) {
  modelState.classList.add("error");
  modelState.classList.remove("ready");
  modelText.textContent = msg || "Could not load the AI model.";
  modelPct.textContent = "";
  syncScanButton();
}

async function loadDetector() {
  if (detector) return detector;
  if (modelLoading) return null;
  modelLoading = true;

  try {
    setModelLoading("Loading AI engine…", 0);
    const mod = await import(TRANSFORMERS_URL);
    const pipeline = mod.pipeline;

    const makePipeline = (opts) =>
      pipeline("object-detection", MODEL_ID, {
        ...opts,
        progress_callback: (p) => {
          if (!p) return;
          if (p.status === "progress") {
            const pct = Math.max(0, Math.min(100, Math.round(p.progress || 0)));
            setModelLoading("Downloading model…", pct);
          } else if (p.status === "done") {
            setModelLoading("Finalising model…", 100);
          } else if (p.status === "ready") {
            setModelReady();
          }
        },
      });

    try {
      detector = await makePipeline({});
    } catch (e) {
      // Fall back to WASM if the default device (e.g. WebGPU) failed.
      detector = await makePipeline({ device: "wasm" });
    }
    setModelReady();
    return detector;
  } catch (err) {
    console.error("Model load failed:", err);
    setModelError("Could not load the AI model. Manual lookup still works.");
    return null;
  } finally {
    modelLoading = false;
  }
}

/* ------------------------------------------------------------------
   SCAN FLOW
   ------------------------------------------------------------------ */
function syncScanButton() {
  const ready = camState === "live" && !!detector && !scanning;
  scanButton.disabled = !ready;
  scanButton.querySelector("span").textContent = scanning ? "Scanning…" : "Scan Item";
}

function captureFrame() {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const maxW = 640;
  const scale = Math.min(1, maxW / vw);
  captureCanvas.width = Math.max(1, Math.round(vw * scale));
  captureCanvas.height = Math.max(1, Math.round(vh * scale));
  captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  return captureCanvas.toDataURL("image/jpeg", 0.85);
}

async function runScan() {
  if (scanning) return;
  if (camState !== "live") {
    if (camState === "error" || camState === "paused") ensureCamera();
    return;
  }
  if (!detector) {
    loadDetector();
    return;
  }

  scanning = true;
  cameraBox.classList.add("scanning");
  syncScanButton();

  try {
    const frame = captureFrame();
    const outputs = await detector(frame, { threshold: 0.5, percentage: true });
    handleDetections(outputs);
  } catch (err) {
    console.error("Scan failed:", err);
    renderResult({
      category: "landfill",
      title: "BLUE LANDFILL BIN",
      meta: "Scan error",
      explanation: CATEGORY_INFO.landfill.explanation,
      note: UNCERTAINTY_NOTE,
    });
  } finally {
    scanning = false;
    cameraBox.classList.remove("scanning");
    syncScanButton();
  }
}

function handleDetections(outputs) {
  const list = Array.isArray(outputs) ? outputs : [];
  if (!list.length) {
    renderResult({
      category: "landfill",
      title: "BLUE LANDFILL BIN",
      meta: "No clear object detected",
      explanation: CATEGORY_INFO.landfill.explanation,
      note: UNCERTAINTY_NOTE,
    });
    return;
  }
  list.sort((a, b) => b.score - a.score);
  const top = list[0];
  const label = (top.label || "").toLowerCase();
  const score = Math.round((top.score || 0) * 100);
  const category = classify(label);

  renderResult({
    category,
    title: CATEGORY_INFO[category].title,
    meta: "Detected: " + label + " · " + score + "% confidence",
    explanation: CATEGORY_INFO[category].explanation,
    note: category === "landfill" || score < 60 ? UNCERTAINTY_NOTE : null,
  });
}

/* ------------------------------------------------------------------
   RESULT RENDERING
   ------------------------------------------------------------------ */
function renderResult({ category, title, meta, explanation, note }) {
  resultEmpty.hidden = true;
  resultContent.hidden = false;
  resultContent.innerHTML = `
    <div class="result-card" data-category="${category}">
      <div class="cat-title">${title}</div>
      <div class="cat-meta">${meta || ""}</div>
      <div class="cat-why"><p>${explanation}</p></div>
      ${note ? `<div class="cat-note">${note}</div>` : ""}
      <div class="cat-actions">
        <button class="btn" data-action="scan-again">${icon("scan", 18)} Scan Again</button>
        <button class="btn" data-action="clear-result">Clear</button>
      </div>
    </div>`;

  const again = resultContent.querySelector('[data-action="scan-again"]');
  const clear = resultContent.querySelector('[data-action="clear-result"]');
  if (again) again.addEventListener("click", () => runScan());
  if (clear) clear.addEventListener("click", clearResult);
}

function clearResult() {
  resultContent.hidden = true;
  resultContent.innerHTML = "";
  resultEmpty.hidden = false;
}

/* ------------------------------------------------------------------
   MANUAL LOOKUP GRID
   ------------------------------------------------------------------ */
function buildItemGrid() {
  const grid = $("#item-grid");
  grid.innerHTML = ITEMS.map(
    (i) => `
      <button class="item-tile" data-id="${i.id}" type="button" aria-label="${i.name}">
        ${icon(i.icon, 24)}
        <span class="tile-name">${i.name}</span>
      </button>`
  ).join("");

  $$(".item-tile", grid).forEach((tile) =>
    tile.addEventListener("click", () => {
      const item = ITEMS.find((i) => i.id === tile.dataset.id);
      const category = BIN_TO_CATEGORY[item.bin];
      renderResult({
        category,
        title: CATEGORY_INFO[category].title,
        meta: "Manual lookup: " + item.name,
        explanation: item.why,
        note: category === "landfill" ? UNCERTAINTY_NOTE : null,
      });
    })
  );
}

/* ------------------------------------------------------------------
   BIN LEGEND
   ------------------------------------------------------------------ */
function buildLegend() {
  const legend = $("#bin-legend");
  const data = [
    { bin: BINS.green, items: ["Food scraps", "Greasy pizza boxes", "Paper towels", "Garden waste"] },
    { bin: BINS.yellow, items: ["Clean cardboard", "Plastic bottles", "Aluminium cans", "Glass jars & bottles"] },
    { bin: BINS.blue, items: ["Soft plastics", "Chip packets", "Broken glass", "Ceramics & nappies"] },
    { bin: BINS.hazwaste, items: ["Batteries", "Light globes", "E-waste", "Paint & chemicals"] },
  ];
  legend.innerHTML = data
    .map(
      (d) => `
      <div class="bin-card">
        <div class="bin-lid" style="background:${d.bin.lid}"></div>
        <h3>${icon(d.bin.icon, 17)}${d.bin.name}</h3>
        <span class="bin-sub">${d.bin.sub}</span>
        <ul>${d.items.map((i) => `<li>${i}</li>`).join("")}</ul>
      </div>`
    )
    .join("");
}

/* ------------------------------------------------------------------
   GAME
   ------------------------------------------------------------------ */
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
  binsWrap.innerHTML = household
    .map(
      (k) => `
      <div class="g-bin" data-bin="${k}" role="button" tabindex="0" aria-label="Drop into ${BINS[k].name}">
        <div class="bin-lidbar" style="background:${BINS[k].lid}"></div>
        ${icon(BINS[k].icon, 24)}
        <h3>${BINS[k].name}</h3>
        <span class="bin-sub">${BINS[k].sub}</span>
      </div>`
    )
    .join("");

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
  $("#game-score").textContent = "0";
  $("#game-round").textContent = "1";
  $("#game-feedback").hidden = true;
  buildBins();
  renderRound();
}

function renderRound() {
  const wrap = $("#game-items");
  const pool = shuffle(GAME_ITEMS).slice(0, 5);
  wrap.dataset.items = JSON.stringify(pool.map((i) => i.id));

  wrap.innerHTML = pool
    .map(
      (i) => `
      <div class="g-item" draggable="true" data-id="${i.id}" role="button" tabindex="0" aria-label="${i.name}">
        ${icon(i.icon, 26)}
        <span class="g-name">${i.name}</span>
      </div>`
    )
    .join("");

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
  $$(".g-item", wrap).forEach((o) => o.classList.remove("is-selected"));
  el.classList.add("is-selected");
  selectedItem = el.dataset.id;
}

function submitSort(itemId, binKey, binEl) {
  if (answered >= 5) return;
  const wrap = $("#game-items");
  const itemEl = $('.g-item[data-id="' + itemId + '"]', wrap);
  if (!itemEl || itemEl.classList.contains("is-done")) return;

  const item = ITEMS.find((i) => i.id === itemId);
  const correct = item.bin === binKey;
  answered++;

  if (correct) {
    gameScore++;
    itemEl.classList.add("is-correct", "is-done");
    binEl.classList.add("is-correct-flash");
    setTimeout(() => binEl.classList.remove("is-correct-flash"), 500);
  } else {
    itemEl.classList.add("is-wrong", "is-done");
    binEl.classList.add("is-wrong-flash");
    setTimeout(() => binEl.classList.remove("is-wrong-flash"), 500);
    const rightBin = $(`.g-bin[data-bin="${item.bin}"]`);
    if (rightBin) {
      rightBin.classList.add("is-correct-flash");
      setTimeout(() => rightBin.classList.remove("is-correct-flash"), 900);
    }
  }

  selectedItem = null;
  $("#game-score").textContent = String(gameScore);

  if (answered >= 5) {
    $("#game-round").textContent = "5";
    finishGame();
  } else {
    $("#game-round").textContent = String(answered + 1);
  }
}

function finishGame() {
  const fb = $("#game-feedback");
  const text = $("#game-feedback-text");
  const pct = Math.round((gameScore / 5) * 100);
  let msg;
  if (gameScore === 5) msg = "Perfect score — you're a true waste-sorting expert.";
  else if (gameScore >= 4) msg = "Great job — you really know your bins, just one or two to review.";
  else if (gameScore >= 3) msg = "Nice work — check the 'Why' explanations to level up.";
  else msg = "Good start — review the Science page, then try again.";

  text.innerHTML = `You scored <strong>${gameScore} / 5</strong> (${pct}%). ${msg}`;
  fb.hidden = false;
  fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ------------------------------------------------------------------
   WIRE UP
   ------------------------------------------------------------------ */
scanButton.addEventListener("click", runScan);
$$('[data-action="restart"]').forEach((b) => b.addEventListener("click", startGame));

/* ------------------------------------------------------------------
   INIT
   ------------------------------------------------------------------ */
function init() {
  buildLegend();
  buildItemGrid();
  buildBins();
  renderRound();
  setModelLoading("Loading AI model…", 0);
  loadDetector();
  startCamera();
}

init();
