// Generates app-under-test.mjs from the real ../app.js.
//
// app.js cannot be imported directly into Node: it touches `document` at module
// scope and calls init() at the bottom. So we patch exactly two things — the
// CDN URL (to the local stub) and the data.js import path — then append exports
// for every top-level function. Exports are auto-detected so this file cannot
// silently drift when app.js gains or loses a function.
//
// Run:  node build.mjs && node verify.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "..", "app.js"), "utf8");

let out = src;

const beforeUrl = out;
out = out.replace(
  /const TRANSFORMERS_URLS = \[[\s\S]*?\];/,
  'const TRANSFORMERS_URLS = ["./stub-transformers.mjs"];',
);
if (out === beforeUrl) throw new Error("build: TRANSFORMERS_URLS anchor not found in app.js");

const beforeData = out;
out = out.replace('} from "./data.js";', '} from "../data.js";');
if (out === beforeData) throw new Error("build: data.js import anchor not found in app.js");

// every top-level `function name(` / `async function name(` / `const name =` at column 0
const fns = [...out.matchAll(/^(?:async\s+)?function ([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1]);
const consts = [...out.matchAll(/^const ([A-Za-z_$][\w$]*)\s*=/gm)].map((m) => m[1]);
const names = [...new Set([...fns, ...consts])];

for (const required of ["analyseDetection", "init", "runScan", "loadDetector", "deviceLadder", "startCamera", "submitSort", "startGame"]) {
  if (!names.includes(required)) throw new Error("build: expected export missing from detection: " + required);
}

const tail = `

/* ---- appended by tests/build.mjs — not part of the shipped app.js ---- */
export { ${names.join(", ")} };
export const __state = () => ({ camState, detector, modelLoading, modelFailed, modelBackend, scanning, gameScore, answered, selectedItem, gamePool });
export const __set = (o) => {
  if ("camState" in o) camState = o.camState;
  if ("detector" in o) detector = o.detector;
  if ("scanning" in o) scanning = o.scanning;
  if ("gamePool" in o) gamePool = o.gamePool;
  if ("modelFailed" in o) modelFailed = o.modelFailed;
  if ("modelLoading" in o) modelLoading = o.modelLoading;
};
`;

fs.writeFileSync(path.join(here, "app-under-test.mjs"), out + tail);
console.log(`build: app-under-test.mjs written — ${names.length} exports`);
