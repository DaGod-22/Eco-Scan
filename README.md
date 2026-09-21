# EcoScan SA — Smart Waste Sorting Guide

An interactive educational website for the **Year 7 Multimedia** category of the
South Australian **Oliphant Science Awards**. EcoScan SA teaches South Australia's
"Which Bin" recycling rules using a live, on-device AI camera scanner, a manual
lookup of 34 verified items, a sorting game, and a science hub.

Everything runs in the browser. No photo is ever uploaded and there is no backend.

## Features

- **Live AI camera scanner** — runs on-device object detection with
  [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js)
  (model: [`Xenova/detr-resnet-50`](https://huggingface.co/Xenova/detr-resnet-50)),
  then reasons about material and condition before naming a bin.
- **Manual lookup** — 34 items with an exact bin answer, an explanation, the underlying
  science, and a named source. Needs no camera and no download.
- **Waste Sorting Mini-Game** — drag-and-drop or tap-to-sort, with the correct bin,
  the reason, and one science fact after every wrong answer.
- **Science Hub** — decomposition, methane, contamination, sorting machinery,
  material recovery and the circular economy.
- **Project Report** — introduction, methodology, 15 real references, change log,
  and an AI disclosure.

## The scanner is a pipeline, not a lookup table

Object recognition, waste classification and disposal recommendation are three
different problems with three different failure modes, so they are kept separate:

```
1. DETECTION    "There is a bottle in the frame, 91%"     the model is good at this
2. OBJECT TYPE  "A bottle is a rigid container"           fixed mapping
3. MATERIAL     "PET/HDPE — but glass bottles exist"      INFERRED, never observed
4. CONDITION    "Empty? Clean? Label attached?"           NOT OBSERVABLE from a photo
5. DECISION     "Yellow Bin, in most SA councils"         rules, vary by council
6. CONFIDENCE   detection x material share x (1 - condition risk)
```

**The number that matters is the disposal confidence, not the detection score.**
A 91% bottle detection is a 76% disposal recommendation, because the model cannot
see whether it is PET or glass, whether it is empty, or whether the label is attached.
Those unknowns are multiplied in rather than hidden.

Below the threshold the app says **"AI identification is uncertain"** and offers the
manual lookup. It never guesses a bin. The same is true when nothing is detected,
when the model crashes, and when a label is not recognised.

## Model download

| File | Size |
| --- | --- |
| `onnx/model_quantized.onnx` (int8 weights) | 41.1 MiB |
| `ort-wasm-simd-threaded.jsep.wasm` (ONNX Runtime) | 22.8 MiB |
| `transformers.web.min.js` | 0.4 MiB |

Nothing is fetched until you choose to download it — either with the
**Download the AI model now** button or by pressing *Scan Item*. First visit is about
**64 MB**; the browser caches all of it, so later visits are near-instant. Visitors who
only use the manual lookup, game or science hub download none of it.

### Why the recovery ladder only ever asks for q8

The model repo publishes several precisions, and they are **not** ordered by size the
way you would expect. An earlier version of the ladder fell back to fp16 and then fp32,
so each "recovery" attempt downloaded a model larger than the one that had just failed —
303 MiB in total before giving up.

| dtype | file | size |
| --- | --- | --- |
| `q8` | `model_quantized.onnx` | 43,102,531 B — **the only one requested** |
| `fp16` | `model_fp16.onnx` | 83,812,437 B — never requested |
| `q4` | `model_q4.onnx` | 107,866,715 B — never requested |
| `fp32` | `model.onnx` | 166,789,212 B — never requested |

Every step (`wasm/q8` threaded → `wasm/q8` → `webgpu/q8`) resolves to the same file, so
retrying a failed backend costs nothing — the bytes are already in the HTTP cache.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Structure, all static content, the manual lookup and science pages |
| `app.js` | Camera, ONNX pipeline, the detection → category analysis, UI, game, feedback |
| `data.js` | All data: SA rules, object concepts, material data, science, references, confidence model |
| `styles.css` | Brutalist-Lite design system |

All content lives in `data.js`, separate from behaviour, so the rules can be audited on
their own. Every disposal rule and science figure names one of the 15 entries in
`REFERENCES`.

- **`ITEMS`** — 34 manually verified household waste items, each with a bin, an
  explanation, the science, and a `src` key resolving to a real reference.
- **`CONCEPTS`** — 33 object concepts that all 90 detector labels map onto, each with a
  weighted material composition, an explicit list of what the model *cannot* see, and a
  council-variance note.

## Model coverage

The detector is COCO-trained and recognises **90 real object classes** (class 0 is an
unused `"N/A"` slot). All 90 resolve to a concept, and none fall through to landfill:

| Category | Labels |
| --- | --- |
| Organics | 11 |
| Recycling | 2 |
| Landfill | 41 |
| Specialised drop-off | 12 |
| Not a waste item | 24 |

This is the honest limitation of the approach: COCO was not built for waste. It has no
class for a cardboard box, a can, a battery, a nappy, soft plastic or a takeaway
container. The app says so rather than pretending, and the manual lookup covers the
streams the camera cannot see.

## Stack

- 100% vanilla HTML, CSS and JavaScript. No build step, no framework, no dependencies
  beyond the Transformers.js CDN import.
- "Brutalist-Lite" design: matte cream `#F4F4F3`, deep charcoal `#1A1A1A`, solid
  forest-green `#1E4620`, 4px corners, 1.5px solid borders, Space Grotesk headings.
- Landscape sidebar on desktop/iPad, fixed bottom navigation on phones.

## Run locally

Serve the folder with any static server (the camera needs HTTPS or localhost):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

Static — deploys with zero configuration to **Vercel** or **Cloudflare Pages**.
Camera access requires a secure context, which those provide automatically.
The camera is released when you leave the Scan tab and when the tab is hidden.

## Testing

The suite lives in `tests/` and loads the real `index.html` and `app.js` against a
stubbed ONNX runtime and a switchable `getUserMedia`.

```bash
cd tests && npm install && npm test
```

It runs **129 assertions** covering label coverage, the confidence model,
uncertain-result handling, SA rule correctness, manual lookup, references, the game,
every camera failure mode, model-failure recovery, the download ladder, the feedback
form, the report page structure, navigation and accessibility attributes.

`tests/build.mjs` regenerates `tests/app-under-test.mjs` from `../app.js` on every run
and fails if an expected function is missing, so the tests cannot silently drift away
from the shipped code. The only things it patches are the CDN URL (to the local stub)
and the `data.js` import path.

Two of those assertions exist because of bugs the earlier suite missed: the detector must
not be called with `percentage: true` (which multiplied every score by 100 and, after
clamping, made every scan look 100% certain), and no ladder step may request a precision
larger than the one that failed.

## Notes

- Rules vary by council. Where they do, the result card says so rather than picking one.
- Always follow your local council's guidelines.

## AI Disclosure

Site code, layout, and interactive features were generated with assistance from
[Arena.ai](https://arena.ai). The student author directed the logical flow, design edits,
and verified the accuracy of all science data and bin-sorting rules.
