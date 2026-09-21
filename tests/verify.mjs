// EcoScan SA functional test suite.
// Run:  node build.mjs && node verify.mjs   (or: npm test, which does both)
//
// Loads the real index.html + app.js in jsdom against a stubbed ONNX runtime.

import { app, window, stub, env, doc } from "./harness.mjs";
import {
  LABEL_TO_CONCEPT, CONCEPTS, ITEMS, GAME_ITEMS, REFERENCES, REFERENCE_ORDER,
} from "../data.js";

const COCO = ["person","bicycle","car","motorcycle","airplane","bus","train","truck","boat","traffic light","fire hydrant","street sign","stop sign","parking meter","bench","bird","cat","dog","horse","sheep","cow","elephant","bear","zebra","giraffe","hat","backpack","umbrella","shoe","eye glasses","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball","kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket","bottle","plate","wine glass","cup","fork","knife","spoon","bowl","banana","apple","sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair","couch","potted plant","bed","mirror","dining table","window","desk","toilet","door","tv","laptop","mouse","remote","keyboard","cell phone","microwave","oven","toaster","sink","refrigerator","blender","book","clock","vase","scissors","teddy bear","hair drier","toothbrush"];

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${x ? "  → " + x : ""}`); };
const t = () => doc.querySelector("#result-content .cat-title")?.textContent || "";
const catOf = () => doc.querySelector("#result-content .result-card")?.dataset.category || "";

console.log("=== 1. LAYERED PIPELINE: every COCO label reaches a concept ===");
const noConcept = COCO.filter((l) => !Object.prototype.hasOwnProperty.call(LABEL_TO_CONCEPT, l));
ok("all 90 labels have a concept", noConcept.length === 0, noConcept.join(",") || "none missing");
const badConcept = [...new Set(Object.values(LABEL_TO_CONCEPT))].filter((k) => !CONCEPTS[k]);
ok("every concept referenced exists", badConcept.length === 0, badConcept.join(",") || "none missing");
const byCat = {};
for (const l of COCO) { const a = app.analyseDetection({ label: l, score: 0.99 }); (byCat[a.category] ??= []).push(l); }
for (const k of Object.keys(byCat).sort()) console.log(`   ${k.padEnd(10)} ${String(byCat[k].length).padStart(2)}`);

console.log("\n=== 2. CONFIDENCE IS NOT JUST THE DETECTION SCORE ===");
const b = app.analyseDetection({ label: "bottle", score: 0.91 });
console.log(`   bottle @91% detection → disposal ${Math.round(b.disposalScore * 100)}% (${b.band.label})`);
ok("disposal confidence < detection confidence", b.disposalScore < 0.91, `${Math.round(b.disposalScore * 100)}% vs 91%`);
const c = app.analyseDetection({ label: "cup", score: 0.91 });
ok("ambiguous-material object scores lower", c.disposalScore < b.disposalScore, `${Math.round(c.disposalScore * 100)}% vs ${Math.round(b.disposalScore * 100)}%`);
ok("confident unambiguous food resolves", app.analyseDetection({ label: "banana", score: 0.99 }).category === "organics");

console.log("\n=== 3. LOW CONFIDENCE REFUSES TO NAME A BIN ===");
const weak = app.analyseDetection({ label: "cup", score: 0.46 });
ok("weak detection yields 'uncertain'", weak.category === "uncertain", weak.category);
app.__set({ camState: "live", detector: async () => [{ label: "cup", score: 0.46 }] });
await app.runScan();
ok("UI says identification is uncertain", /uncertain/i.test(t()) && catOf() === "uncertain", t());
ok("uncertain card names no bin", !/BIN/i.test(t()), t());
ok("uncertain card offers manual check", /Check manually/i.test(doc.querySelector("#result-content").textContent));

console.log("\n=== 4. NO-DETECTION / CRASH / UNKNOWN never name a bin ===");
app.__set({ detector: async () => [] }); await app.runScan();
ok("empty detection → none", catOf() === "none" && !/BIN/i.test(t()), t());
app.__set({ detector: async () => { throw new Error("boom"); } }); await app.runScan();
ok("crash → none", catOf() === "none" && !/BIN/i.test(t()), t());
app.__set({ detector: async () => [{ label: "flux capacitor", score: 0.9 }] }); await app.runScan();
ok("unknown label → none", catOf() === "none" && !/BIN/i.test(t()), t());
app.__set({ detector: async () => [{ label: "person", score: 0.97 }] }); await app.runScan();
ok("person → notwaste, no bin", catOf() === "notwaste" && !/BIN/i.test(t()), t());

console.log("\n=== 5. SOUTH AUSTRALIAN RULE CORRECTNESS ===");
const SA = { "wine glass":"landfill","cup":"landfill","bowl":"landfill","plate":"landfill","vase":"landfill","fork":"landfill","knife":"landfill","spoon":"landfill","mirror":"landfill","window":"landfill","bottle":"recycling","book":"recycling","banana":"organics","pizza":"organics","cell phone":"dropoff","microwave":"dropoff","toaster":"dropoff","refrigerator":"dropoff","hair drier":"dropoff","blender":"dropoff" };
const wrong = [];
for (const [l, want] of Object.entries(SA)) { const a = app.analyseDetection({ label: l, score: 0.99 }); if (a.confidentCategory !== want) wrong.push(`${l}=${a.confidentCategory}!=${want}`); }
ok("all 20 spot-checked SA mappings correct", wrong.length === 0, wrong.join("; ") || "all correct");

console.log("\n=== 6. WHAT / WHERE / WHY / SCIENCE ===");
app.__set({ detector: async () => [{ label: "bottle", score: 0.98, box: { x: 10, y: 10, width: 40, height: 40 } }] });
await app.runScan();
const rc = doc.querySelector("#result-content").textContent;
for (const k of ["What", "Where", "Why", "Science"]) ok(`result contains "${k}"`, rc.includes(k));
ok("result cites a source", !!doc.querySelector("#result-content .cat-source a"));
ok("result shows a confidence bar", !!doc.querySelector("#result-content .conf-track"));
ok("result lists unseen conditions", /photograph cannot confirm/i.test(rc));

console.log("\n=== 7. MANUAL LOOKUP ===");
ok("manual grid built", doc.querySelectorAll("#item-grid .item-tile").length === ITEMS.length, String(doc.querySelectorAll("#item-grid .item-tile").length));
ok("every item has why+science+source+icon", ITEMS.every((i) => i.science && i.why && i.src && i.icon && i.name));
ok("every item source key resolves", ITEMS.every((i) => REFERENCES[i.src]), ITEMS.filter((i) => !REFERENCES[i.src]).map((i) => i.id).join(",") || "all resolve");
ok("every item bin is valid", ITEMS.every((i) => ["green","yellow","blue","hazwaste"].includes(i.bin)));
app.showManualItem(ITEMS[0].id);
ok("manual lookup renders a verdict", !!t(), t());
ok("manual lookup shows all four steps", ["What","Where","Why","Science"].every((k) => doc.querySelector("#result-content").textContent.includes(k)));
app.showManualItem("does-not-exist");
ok("unknown manual id does not throw", true);

console.log("\n=== 8. REFERENCES ===");
ok("no 'placeholder' text in the DOM", !/placeholder/i.test(doc.documentElement.textContent));
ok("references rendered", doc.querySelectorAll("#references-list .ref").length === REFERENCE_ORDER.length, String(doc.querySelectorAll("#references-list .ref").length));
ok("every reference complete", REFERENCE_ORDER.every((k) => { const r = REFERENCES[k]; return r && r.url && /^https?:\/\//.test(r.url) && r.label && r.org && r.used; }));
ok("no duplicate references", REFERENCE_ORDER.every((k, i) => REFERENCE_ORDER.indexOf(k) === i));
ok("all reference links absolute", [...doc.querySelectorAll("#references-list a")].every((a) => /^https?:\/\//.test(a.href)));

console.log("\n=== 9. GAME ===");
app.startGame();
let ids = JSON.parse(doc.querySelector("#game-items").dataset.items);
ok("round has 5 items", ids.length === 5);
const first = ITEMS.find((i) => i.id === ids[0]);
const wrongBin = ["green","yellow","blue"].find((x) => x !== first.bin);
app.submitSort(ids[0], wrongBin, doc.querySelector(`.g-bin[data-bin="${wrongBin}"]`));
const teach = doc.querySelector("#game-teach");
ok("teaching panel appears on a wrong answer", !teach.hidden);
ok("teaching shows the correct bin", /Correct:/.test(teach.textContent));
ok("teaching explains why", /Why\?/.test(teach.textContent));
ok("teaching shows what you chose", /You chose:/.test(teach.textContent));
for (const id of ids.slice(1)) { const it = ITEMS.find((i) => i.id === id); const be = doc.querySelector(`.g-bin[data-bin="${it.bin}"]`); if (be) app.submitSort(id, it.bin, be); }
ok("score counted correctly", doc.querySelector("#game-score").textContent === "4", doc.querySelector("#game-score").textContent);
ok("feedback shown at the end", !doc.querySelector("#game-feedback").hidden);
doc.querySelector("#game-feedback [data-action='restart']").dispatchEvent(new window.Event("click", { bubbles: true }));
ok("restart resets score", doc.querySelector("#game-score").textContent === "0");
ok("restart clears feedback", doc.querySelector("#game-feedback").hidden);
ok("restart clears teaching", doc.querySelector("#game-teach").hidden);
ok("restart gives a fresh round", JSON.parse(doc.querySelector("#game-items").dataset.items).length === 5);
app.startGame();
const kId = JSON.parse(doc.querySelector("#game-items").dataset.items)[0];
doc.querySelector(`.g-item[data-id="${kId}"]`).dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
ok("keyboard select works", app.__state().selectedItem === kId, app.__state().selectedItem);
const kItem = ITEMS.find((i) => i.id === kId);
const kBin = doc.querySelector(`.g-bin[data-bin="${kItem.bin}"]`);
kBin.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
ok("keyboard submit scores", doc.querySelector("#game-score").textContent === "1");
ok("every game item has a drop target", GAME_ITEMS.every((i) => ["green","yellow","blue"].includes(i.bin)));
for (let i = 0; i < 8; i++) app.submitSort(kId, kItem.bin, kBin);
ok("over-submitting does not inflate score", doc.querySelector("#game-score").textContent === "1", doc.querySelector("#game-score").textContent);

console.log("\n=== 10. CAMERA UX ===");
env.gumBehaviour = "ok"; app.__set({ camState: "off" });
ok("camera starts", await app.startCamera() === true);
ok("scan enabled when live", !doc.querySelector("#scan-button").disabled);
env.gumBehaviour = "deny"; app.__set({ camState: "off" });
ok("denied → error state", await app.startCamera() === false && app.__state().camState === "error");
ok("error offers retry", !!doc.querySelector("#cam-retry"));
ok("denied message is actionable", /permission|blocked/i.test(doc.querySelector("#camera-state").textContent));
env.gumBehaviour = "none"; app.__set({ camState: "off" }); await app.startCamera();
ok("no-camera message", /No camera/i.test(doc.querySelector("#camera-state").textContent));
env.gumBehaviour = "ok";
const md = window.navigator.mediaDevices; delete window.navigator.mediaDevices;
app.__set({ camState: "off" }); await app.startCamera();
ok("unsupported-browser message", /does not support/i.test(doc.querySelector("#camera-state").textContent));
window.navigator.mediaDevices = md;
env.gumBehaviour = "ok"; app.__set({ camState: "off" }); await app.startCamera();
Object.defineProperty(doc, "visibilityState", { value: "hidden", configurable: true });
doc.dispatchEvent(new window.Event("visibilitychange"));
ok("tab hidden releases camera", app.__state().camState === "off");
Object.defineProperty(doc, "visibilityState", { value: "visible", configurable: true });
app.__set({ camState: "live" }); await app.ensureCamera();
ok("returning resumes camera", app.__state().camState === "live");

console.log("\n=== 11. MODEL LOAD + FAILURE RECOVERY ===");
stub.__reset(); stub.__set({ failSteps: [0, 1, 2, 3] });
app.__set({ detector: null, modelFailed: false });
await app.loadDetector({ force: true });
ok("retry control injected on failure", !!doc.querySelector("#model-state .model-retry"));
ok("scan button not permanently disabled", !doc.querySelector("#scan-button").disabled);
stub.__reset(); stub.__set({ failSteps: [0] });
app.__set({ detector: null, modelFailed: false });
await app.loadDetector({ force: true });
const sig = stub.attempts.map((a) => `${a.device}/${a.dtype}/proxy=${a.proxy}`);
ok("fallback ladder steps are distinct", new Set(sig).size === sig.length, sig.join(" → "));
ok("recovers and reports backend", /ready/i.test(doc.querySelector("#model-text").textContent), doc.querySelector("#model-text").textContent);
ok("retry removed after success", !doc.querySelector("#model-state .model-retry"));
stub.__reset();
app.__set({ detector: null, modelFailed: false });
stub.__set({ failSteps: [0, 1, 2, 3] });
await app.runScan();
ok("scan with unavailable model explains itself", /MODEL UNAVAILABLE/i.test(t()), t());

console.log("\n=== 12. FEEDBACK FORM ===");
const form = doc.querySelector("#feedback-form");
const status = doc.querySelector("#feedback-status");
form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
ok("empty submit rejected with a message", /choose a topic/i.test(status.textContent), status.textContent);
form.querySelector("select[name=type]").value = "Technical problem";
form.querySelector("textarea[name=message]").value = "The scanner said landfill for a banana.";
form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
ok("valid submit saves locally", app.loadFeedback().length === 1, String(app.loadFeedback().length));
ok("status is honest about local-only", /this browser only|Nothing was sent/i.test(status.textContent), status.textContent);
ok("entry rendered", doc.querySelectorAll("#feedback-list .fb-entry").length === 1);
ok("count updated", doc.querySelector("#feedback-count").textContent === "1");
const uncaught = [];
const onErr = (e) => uncaught.push(e.error ? String(e.error) : String(e.message));
window.addEventListener("error", onErr);
doc.querySelector("#feedback-download").dispatchEvent(new window.Event("click", { bubbles: true }));
await new Promise((r) => setTimeout(r, 0));
window.removeEventListener("error", onErr);
ok("feedback download produces no uncaught error", uncaught.length === 0, uncaught.join(" | ") || "clean");
doc.querySelector("#feedback-clear").dispatchEvent(new window.Event("click", { bubbles: true }));
ok("clear empties storage", app.loadFeedback().length === 0);
ok("empty state returns", !doc.querySelector("#feedback-empty").hidden);

console.log("\n=== 13. NAVIGATION ===");
for (const tab of ["science", "game", "report", "home"]) {
  doc.querySelector(`.bnav-item[data-tab="${tab}"]`).dispatchEvent(new window.Event("click", { bubbles: true }));
  const active = doc.querySelector(".page.is-active");
  ok(`nav → ${tab}`, active && active.dataset.page === tab, active?.dataset.page);
  ok(`${tab} sets aria-current`, doc.querySelector(`.bnav-item[data-tab="${tab}"]`).getAttribute("aria-current") === "page");
}
ok("science blocks rendered", doc.querySelectorAll("#science-blocks .science-block").length >= 4);
ok("facts rendered with sources", doc.querySelectorAll("#facts-grid .fact").length >= 6 && doc.querySelectorAll("#facts-grid .cat-source").length >= 6);
ok("MRF steps rendered", doc.querySelectorAll(".mrf-steps li").length === 5);
ok("tanglers rendered", doc.querySelectorAll(".tangler").length === 3);

console.log("\n=== 14. REPORT PAGE STRUCTURE ===");
const reportCards = [...doc.querySelectorAll("#page-report .report-card h2")].map((h) => h.textContent.trim());
console.log("   cards:", reportCards.join(" | "));
ok("section is titled 'Report', not 'Introduction'", reportCards.includes("Report") && !reportCards.includes("Introduction"), reportCards[0]);
ok("no leftover placeholder heading", !reportCards.some((h) => /PLACEHOLDER/i.test(h)));
ok("report keeps the author's three paragraphs", doc.querySelectorAll(".report-linked .report-main p").length === 3, String(doc.querySelectorAll(".report-linked .report-main p").length));
const rtext = doc.querySelector(".report-linked .report-main").textContent;
ok("report explains the origin (grandparents)", /grandparents/i.test(rtext));
ok("report names the minigame teaching", /minigame/i.test(rtext) && /why you were wrong/i.test(rtext));
ok("report names SA composters", /Jeffries/i.test(rtext) && /Peats Soil/i.test(rtext));
ok("methane 20-year figure is 80–86x", /80 to 86 times/i.test(rtext));
ok("methane 100-year figure is 28x", /28 times more damaging/i.test(rtext));
ok("stale 24x figure is gone", !/24x|24 times/i.test(rtext));
ok("methane written as CH4", /CH/.test(doc.querySelector(".report-linked .report-main").innerHTML) && doc.querySelector(".report-linked .report-main sub"));
ok("report and disclosure are in one linked wrapper", !!doc.querySelector(".report-linked > .report-main") && !!doc.querySelector(".report-linked > .ai-disclosure"));
ok("disclosure is a separate article, not merged", doc.querySelectorAll(".report-linked > article").length === 2);
ok("disclosure directly follows the report", doc.querySelector(".report-linked > .report-main").nextElementSibling.classList.contains("ai-disclosure"));
ok("exactly one AI disclosure statement on the page", doc.querySelectorAll("#page-report .ai-disclosure").length === 1, String(doc.querySelectorAll("#page-report .ai-disclosure").length));
const dtext = doc.querySelector(".report-linked .ai-disclosure").textContent;
ok("disclosure names Arena.ai", /Arena\.ai/.test(dtext));
ok("disclosure says no image leaves the device", /No image ever leaves the device/i.test(dtext));
ok("report page still has references", doc.querySelectorAll("#page-report #references-list .ref").length > 0);
ok("report page still has the feedback form", !!doc.querySelector("#page-report #feedback-form"));

console.log("\n=== 15. ACCESSIBILITY ===");
ok("skip link present", !!doc.querySelector(".skip-link"));
ok("every button has a type", [...doc.querySelectorAll("button")].every((x) => x.getAttribute("type")));
ok("scan button has a text label", !!doc.querySelector("#scan-button span")?.textContent.trim());
ok("result region is a live region", doc.querySelector("#result-content").getAttribute("aria-live") === "polite");
ok("camera status is a live region", doc.querySelector("#camera-state").getAttribute("role") === "status");
ok("progress bar has ARIA", doc.querySelector("#model-progress").getAttribute("role") === "progressbar");
ok("video has an accessible label", !!doc.querySelector("#webcam").getAttribute("aria-label"));
ok("game bins keyboard reachable", [...doc.querySelectorAll(".g-bin")].every((x) => x.getAttribute("tabindex") === "0"));
ok("game items keyboard reachable", [...doc.querySelectorAll(".g-item")].every((x) => x.getAttribute("tabindex") === "0"));
const tileLabels = [...doc.querySelectorAll(".item-tile")].map((x) => x.getAttribute("aria-label") || "");
ok("every tile names its destination", tileLabels.every((x) => /goes in the/.test(x)), tileLabels.filter((x) => !/goes in the/.test(x)).join(" | ") || "all named");
ok("tile labels unique", new Set(tileLabels).size === tileLabels.length);
ok("every decorative icon hidden from AT", [...doc.querySelectorAll("svg")].every((s) => s.getAttribute("aria-hidden") === "true" || !!(s.parentElement && s.parentElement.closest('[aria-hidden="true"]')) || !!s.closest("[aria-label]")));

console.log("\n=== 16. MODEL DOWNLOAD: recovery must not cost more than the attempt ===");
const ladder = app.deviceLadder();
const dtypes = ladder.map((l) => l.opts.dtype);
console.log("   ladder:", ladder.map((l) => `${l.opts.device}/${l.opts.dtype}`).join(" → "));
ok("no step requests fp16 (79.9 MiB)", !dtypes.includes("fp16"), dtypes.join(","));
ok("no step requests fp32 (159.1 MiB)", !dtypes.includes("fp32"), dtypes.join(","));
ok("every step uses the same q8 file", dtypes.every((d) => d === "q8"), dtypes.join(","));
ok("ladder still has a recovery step", ladder.length >= 2, String(ladder.length));

console.log("\n=== 17. REGRESSION: detection score survives the pipeline's format ===");
const frac = app.analyseDetection({ label: "bottle", score: 0.91 });
const pct = app.analyseDetection({ label: "bottle", score: 91 });
ok("fraction and percentage agree", Math.abs(frac.disposalScore - pct.disposalScore) < 1e-9, `${frac.disposalScore} vs ${pct.disposalScore}`);
ok("a 46% detection is not treated as certain", app.analyseDetection({ label: "bottle", score: 46 }).disposalScore < frac.disposalScore);
ok("score 100 caps at 1.0", app.analyseDetection({ label: "bottle", score: 100 }).detectionScore === 1);
ok("missing score is 0 not NaN", app.analyseDetection({ label: "bottle" }).detectionScore === 0);
ok("junk score is 0 not NaN", app.analyseDetection({ label: "bottle", score: "abc" }).detectionScore === 0);

console.log("\n=== 18. REGRESSION: detector must not be asked for percentage scores ===");
let seenOpts = null;
app.__set({ camState: "live", detector: async (frame, o) => { seenOpts = o; return [{ label: "bottle", score: 0.93, box: { x: 1, y: 1, width: 9, height: 9 } }]; } });
await app.runScan();
ok("threshold is passed", seenOpts && seenOpts.threshold === 0.45, JSON.stringify(seenOpts));
ok("percentage:true is NOT passed", !seenOpts || !("percentage" in seenOpts), JSON.stringify(seenOpts));

console.log("\n=== 19. MODEL DOWNLOAD IS A CHOICE, NOT A SURPRISE ===");
ok("preload button exists", !!doc.querySelector("#model-preload"));
ok("download size stated before scanning", /41\.1 MB/.test(doc.querySelector("#model-note").textContent));
app.__set({ detector: null, modelFailed: false, modelLoading: false }); app.syncScanButton();
ok("preload offered while model absent", !doc.querySelector("#model-preload").hidden);
app.__set({ detector: async () => [], modelFailed: false, modelLoading: false }); app.syncScanButton();
ok("preload hidden once ready", doc.querySelector("#model-preload").hidden);

console.log("\n=== 20. NO CONSOLE ERRORS FROM NORMAL USE ===");
const errs = []; const origErr = console.error;
console.error = (...a) => { errs.push(a.join(" ")); };
app.startGame(); app.activateTab("science"); app.activateTab("game"); app.activateTab("report"); app.activateTab("home");
app.clearResult(); app.showManualItem(ITEMS[3].id); app.clearResult();
app.__set({ camState: "live", detector: async () => [{ label: "banana", score: 0.95, box: { x: 1, y: 1, width: 10, height: 10 } }] });
await app.runScan();
console.error = origErr;
ok("no unexpected console.error", errs.length === 0, errs.join(" | ") || "clean");

console.log(`\n=== TOTAL: ${pass} pass / ${fail} fail ===`);
process.exit(fail ? 1 : 0);
