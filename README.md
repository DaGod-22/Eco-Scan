# EcoScan SA — Smart Waste Sorting Guide

An interactive educational website for the **Year 7 Multimedia** category of the
South Australian **Oliphant Science Awards**. EcoScan SA teaches South Australia's
"Which Bin" recycling rules using a live, on-device AI camera scanner, a drag-and-drop
sorting game, and a science hub explaining decomposition and the circular economy.

## Features

- **Live AI camera scanner** — streams the device camera and runs on-device object
  detection with [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js)
  (model: `Xenova/detr-resnet-50`). Detected objects are classified against SA bin rules:
  - Green organics bin — food and biological matter
  - Yellow recycling bin — glass bottles/jars, rigid plastic bottles, clean paper
  - Specialised drop-off — e-waste and appliances
  - Blue landfill bin — crockery, drinking glasses, soft plastics, mixed materials
  - No verdict — items that aren't waste, unrecognised labels, no detection and scan
    errors are reported as such and never presented as a bin instruction
- **Detection boxes** — every detection above the threshold is drawn on the live video,
  and secondary detections are listed in the result.
- **Manual lookup** — a fallback list of common items with exact bin answers (no camera/model needed).
- **Waste Sorting Mini-Game** — drag-and-drop (or tap-to-sort) quiz with scoring.
- **Science Hub** — decomposition (methane vs. compost) and the circular economy.
- **Project Report** — introduction, bibliography, change log, and AI disclosure.

## Stack

- 100% vanilla HTML, CSS, and JavaScript — no build step, no framework, no dependencies beyond the Transformers.js CDN import.
- Responsive "Brutalist-Lite" design system (matte cream `#F4F4F3`, deep charcoal `#1A1A1A`, solid forest-green `#1E4620` primary actions, sharp 4px corners, 1.5px solid borders, Space Grotesk headings).
- Landscape sidebar layout on desktop/iPad, fixed bottom navigation on phones.

## Run locally

Serve the folder with any static server (the camera requires HTTPS or localhost):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy

The site is static and deploys with zero configuration to **Vercel** or **Cloudflare Pages** —
drag the folder into a new project (or connect the Git repo). Camera and AI inference run
entirely in the user's browser.

## Notes

- **Download size.** The scanner is lazy-loaded: nothing is fetched until you press
  *Scan Item* the first time. That first scan downloads roughly **65 MB**:

  | File | Size |
  | --- | --- |
  | `model_quantized.onnx` (q8 weights) | 41.1 MiB |
  | `ort-wasm-simd-threaded.jsep.wasm` (ONNX Runtime) | 22.8 MiB |
  | `transformers.web.min.js` | 0.4 MiB |

  All of it is cached by the browser, so later visits start instantly. Visitors who only
  use the manual lookup, game or science hub download none of it.
- **Backends.** The model loads on CPU/WASM (quantised) by default, with an automatic
  fallback ladder to WebGPU and then to fp32 if a backend fails. WASM inference runs in a
  worker thread so the page stays responsive while scanning.
- **Model coverage.** The detector is COCO-trained, so it recognises 90 object classes.
  All 90 are mapped to a South Australian bin rule in `LABEL_MAP` (`app.js`); anything
  unexpected is reported as unrecognised rather than being defaulted to landfill.
- Camera access requires a secure context (HTTPS) — this is automatic on Vercel/Cloudflare.
  The camera is released when you leave the Scan tab and when the tab is hidden.
- For ambiguous results, the app clearly labels outputs as AI-assisted estimates and reminds
  users to check the official "Which Bin" rules.

## AI Disclosure

Site code, layout, and interactive features were generated with assistance from
[Arena.ai](https://arena.ai). The student author directed the logical flow, design edits,
and verified the accuracy of all science data and bin-sorting rules.
