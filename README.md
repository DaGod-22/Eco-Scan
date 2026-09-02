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
  - Yellow recycling bin — rigid containers (bottles, cans, cups)
  - Specialised drop-off — e-waste
  - Blue landfill bin — everything else / uncertain
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

- The object-detection model (`Xenova/detr-resnet-50`, ~40 MB of quantized ONNX weights) is
  downloaded on first use and cached by the browser for subsequent sessions.
- Camera access requires a secure context (HTTPS) — this is automatic on Vercel/Cloudflare.
- For ambiguous results, the app clearly labels outputs as AI-assisted estimates and reminds
  users to check the official "Which Bin" rules.

## AI Disclosure

Site code, layout, and interactive features were generated with assistance from
[Arena.ai](https://arena.ai). The student author directed the logical flow, design edits,
and verified the accuracy of all science data and bin-sorting rules.
