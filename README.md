# MemeForge

**Cultural signal → shareable joke.**

MemeForge is a local-first meme workshop for turning a topic into multiple distinct joke angles, selecting the strongest one, applying a reusable look, editing it on Canvas, and exporting a finished image quickly.

The repository now contains two frontends:

- the original dependency-free browser app in the repository root;
- the public React/Vite app in `react-app/`, automatically deployed to GitHub Pages.

Public React app: `https://michaelwave369.github.io/MemeForge/`

MemeForge deliberately works without an AI API, backend, account, or API key. Demo trend prompts remain labeled demo until V1 Trend Radar introduces evidence-backed live signal adapters.

## Current milestone — React V0.4 Remix Tools

The V0.4 goal is speed: make the one-minute meme workflow faster without turning MemeForge into a heavyweight image editor.

### Forge

- Manual topic entry
- Clearly labeled demo signal prompts
- Multi-select humor profiles
- Weirdness control
- Transparent `Meme Potential` creative heuristic
- 12-concept angle tournament

### Template Library

- 8 original built-in reusable layouts
- Search and source/favorite filters
- Local favorites
- Save the current look as a reusable user template
- Delete user templates
- Versioned JSON template-pack import/export
- Import normalization and malformed-value hardening
- Templates exclude captions, uploaded-image bytes, and uploaded-image filenames
- Applying a template preserves the current caption and image

### Meme Studio

- Browser Canvas renderer
- Local image upload and browser-side resizing
- Cover / contain, zoom, and X/Y pan
- Draggable top and bottom text layers
- Per-layer font, size, color, alignment, outline, shadow, and position controls
- Local project save/load and autosave
- PNG export

### V0.4 Remix Tools

- **One-click Remix** — choose another concept and built-in look while preserving the current uploaded image
- **Undo / redo** — grouped editing history plus Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, and Ctrl/Cmd+Y
- **Four export formats** — Square 1:1, Portrait 4:5, Story 9:16, Landscape 16:9
- **Sticker / shape layers** — draggable emoji/symbol layers with size, rotation, opacity, X/Y controls, duplicate, and remove
- **Duplicate checkpoint** — branch from the current meme without losing the current look
- **Local remix history** — recent compact checkpoints can be restored from the studio
- **Media-safe history** — remix checkpoints deliberately do not duplicate uploaded-image bytes or filenames

## Privacy boundary

Uploaded images are processed locally in the browser. MemeForge does not upload them to a server.

Reusable templates and remix checkpoints are intentionally smaller than full projects:

```text
FULL PROJECT
├── caption
├── uploaded image
├── topic / concepts
├── template state
├── stickers
└── export format

TEMPLATE
├── visual treatment
├── text styling / position
└── image-fit defaults
    ├── caption ❌
    └── image bytes ❌

REMIX CHECKPOINT
├── caption / layout
├── stickers
├── format
└── image-fit state
    └── image bytes ❌
```

This keeps local history compact and prevents a single uploaded image from being copied repeatedly into browser storage.

## React development

```bash
git clone https://github.com/MichaelWave369/MemeForge.git
cd MemeForge/react-app
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The React app uses Vite base path `/MemeForge/` for GitHub Pages.

## Vanilla app

The original dependency-free app remains in the repository root and can be served with any static HTTP server:

```bash
cd MemeForge
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Tests

Root engine/hardening tests:

```bash
npm test
```

The suite covers:

- concept generation and diversity
- Meme Potential scoring
- project storage
- template normalization and privacy boundaries
- template-pack import/export
- V0.4 export-format definitions
- remix-history media stripping
- checkpoint image preservation
- remix-history caps

GitHub Actions syntax-checks the plain JavaScript modules and runs the test suite. A separate Pages workflow installs the React dependencies, runs the Vite production build, uploads the Pages artifact, and deploys it.

## Architecture

```text
TOPIC / SIGNAL
      │
      ▼
HUMOR PROFILES + WEIRDNESS
      │
      ├──────────────► MEME POTENTIAL
      ▼
12-CONCEPT TOURNAMENT
      │
      ▼
SELECTED CONCEPT
      │
      ├──────────────► TEMPLATE LIBRARY
      ▼
CANVAS STUDIO
      │
      ├── local image
      ├── draggable text
      ├── stickers / shapes
      ├── 1:1 / 4:5 / 9:16 / 16:9
      ├── undo / redo
      └── PNG export
      │
      ▼
ONE-CLICK REMIX
      │
      ├── checkpoint current look
      ├── choose another angle
      ├── choose another built-in layout
      └── preserve uploaded image
```

The core generator, scoring, storage, template logic, demo trend data, and built-in templates live under `src/` and are reused by the React app rather than duplicated.

## Roadmap

### V0.1 — Local Forge ✅

- Browser UI
- Local angle engine
- Meme Potential heuristic
- Concept tournament
- Canvas editor
- PNG export

### V0.2 — Meme Studio ✅

- User image backgrounds
- Image fit / zoom / pan
- Draggable text
- Typography controls
- Local save/load and autosave

### V0.3 — Template System ✅

- Original template library
- User templates
- Favorites and search
- Import/export packs
- Privacy-safe serialization

### V0.4 — Remix Tools ✅

- Undo / redo
- Sticker / shape layers
- Square / portrait / story / landscape exports
- One-click remix
- Duplicate checkpoint
- Compact local remix history

### V1 — Trend Radar

- Provider adapter interface
- News/public-signal adapters
- Signal normalization
- Topic clustering
- Evidence links
- Separate Trend Velocity and Meme Potential scores

### V1.5 — Optional AI adapters

- Caption and punchline generation
- Original-image generation
- Provider-agnostic adapter layer
- User-owned API configuration or serverless proxy
- Explicit model/provider provenance

### V2 — Meme Tournament

- Competing humor agents
- Novelty / clarity / punchline critic
- Diversity penalty
- Human-selection feedback

### V3 — Cultural Signal Lab

- Opt-in aggregate creative-choice analysis
- Compare signal velocity with selected humor angles
- Research-friendly exports

## Design principles

1. **Do not fake live data.** Demo data says demo.
2. **Fast beats complicated.** New controls should shorten the path from idea to artifact.
3. **Diversity beats repetition.** Concepts should be meaningfully different.
4. **Local-first before cloud-first.** The core tool should remain useful without external services.
5. **Local images stay local.**
6. **Templates reuse layouts, not private artifacts.**
7. **Remix history avoids duplicating image bytes.**
8. **Separate evidence from inference.** Trend strength, creative scoring, and predicted engagement are different things.
9. **Original by default.** Built-in treatments avoid bundling copyrighted meme-template art.
10. **Provider adapters stay replaceable.**

## Repository layout

```text
MemeForge/
├── index.html                 # vanilla app
├── src/                       # shared core engines + vanilla UI
│   ├── app.js
│   ├── template-ui.js
│   ├── data/
│   └── engines/
├── react-app/                 # public React/Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── canvas.js
│   │   ├── remix-history.js
│   │   ├── useStudioHistory.js
│   │   ├── styles.css
│   │   └── v04.css
│   ├── package.json
│   └── vite.config.js
├── tests/
│   ├── engine.test.mjs
│   └── remix.test.mjs
├── docs/
├── .github/workflows/
├── LICENSE
└── README.md
```

## License

MIT. See [`LICENSE`](LICENSE).

---

**MemeForge V0.4** — forge it fast, remix it faster.
