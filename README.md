# MemeForge

**Cultural signal → shareable joke.**

MemeForge is a local-first browser app for turning a topic into multiple distinct meme concepts, selecting the best angle, applying a reusable visual template, editing it in a browser-native meme studio, saving the project locally, and exporting the finished meme as a PNG.

V0 deliberately works **without an AI API, backend, account, or API key**. It is designed as a clean foundation for future live-trend and AI adapters without making demo data look live.

## What works now — V0.3

### Forge

- Manual topic entry
- Clearly labeled demo signal prompts
- Multi-select humor profiles
- Weirdness control
- Transparent `Meme Potential` creative heuristic
- 12-concept angle tournament

### Template Library

- 8 original built-in reusable layouts
- Template search across names, descriptions, and tags
- All / Favorites / Built-in / My Templates filters
- Favorite templates stored locally
- Save the current studio look as a reusable user template
- Delete user templates
- Versioned JSON template-pack export/import
- Imported templates normalized and bounded before use
- User-template files deliberately exclude meme captions and uploaded-image bytes
- Applying a template preserves the current caption and uploaded image

### Meme Studio

- Browser Canvas renderer
- User-supplied image backgrounds
- Browser-side image resizing before persistence
- Image cover / contain, zoom, and X/Y pan controls
- Draggable top and bottom text layers
- Per-layer font family, size, color, alignment, outline, shadow, and X/Y controls
- Multiple original visual treatments
- Optional MemeForge watermark
- Local project save / load with versioned storage format
- Autosave after edits
- Caption copy
- PNG export without editor selection outlines
- Responsive UI
- Zero runtime dependencies

Uploaded images are processed locally in the browser. MemeForge V0.3 does not upload them to a server.

## Run locally

Because MemeForge uses native JavaScript modules, serve the repository over HTTP rather than opening `index.html` directly from the filesystem.

```bash
git clone https://github.com/MichaelWave369/MemeForge.git
cd MemeForge
python -m http.server 8080
```

Then open `http://localhost:8080`.

Any simple static server works.

## Tests

```bash
npm test
```

The suite covers concept generation, creative scoring, project serialization, local storage, built-in template normalization, template privacy boundaries, import/export envelopes, de-duplication, favorites, malformed values, and HTML/JavaScript selector wiring.

GitHub Actions also syntax-checks all browser modules before running the suite.

## Static hosting

MemeForge remains intentionally static-host friendly. It can be served from:

- GitHub Pages
- Netlify
- Cloudflare Pages
- Vercel static hosting
- Any ordinary web server

For GitHub Pages, publish the repository root from the `main` branch. No build step is required.

## Architecture

```text
Topic / signal
     │
     ▼
Style + weirdness controls
     │
     ├──────────────► Meme Potential heuristic
     │
     ▼
Local Angle Engine
     │
     ▼
12-concept tournament
     │
     ▼
Selected concept
     │
     ├──────────────► Template Library
     │                  ├── built-in layouts
     │                  ├── favorites/search
     │                  ├── user layouts
     │                  └── import/export packs
     ▼
Canvas Meme Studio
     │
     ├── uploaded/local background
     ├── crop / zoom / pan
     ├── draggable text layers
     ├── typography controls
     ├── local project storage
     ├── copy caption
     └── export PNG
```

The current app has no hidden network calls. Future trend providers and AI providers belong behind explicit adapters rather than being mixed into the core generator.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the longer design.

## Template privacy boundary

A MemeForge template is a **layout**, not a copy of a finished meme.

A reusable template may store:

- visual treatment
- watermark preference
- background fit / zoom / pan defaults
- text-layer position
- font choice
- font size
- text color
- alignment
- outline / shadow preferences

A reusable template does **not** store:

- top or bottom caption text
- uploaded-image data URLs
- uploaded-image filenames

That keeps template packs small and prevents exporting private local images or text by accident.

## Meme Potential in V0

The displayed score is a **creative heuristic**, not a claim about live popularity, future virality, or social engagement. It currently combines:

- caption fit
- topic specificity
- remix potential
- visual potential
- deterministic novelty heuristic

When live trend adapters arrive, external signal measurements should be displayed separately from creative scoring so the UI never launders one kind of evidence into another.

## Roadmap

### V0.1 — Local Forge

- [x] Browser UI
- [x] Local angle engine
- [x] Meme Potential heuristic
- [x] Concept tournament
- [x] Canvas editor
- [x] PNG export

### V0.2 — Meme Studio

- [x] User-supplied image backgrounds
- [x] Browser-side image resizing
- [x] Image fit / position / zoom
- [x] Draggable text placement
- [x] Font / size / color / alignment controls
- [x] Outline and shadow controls
- [x] Save and load projects in local storage
- [x] Autosave
- [ ] Undo / redo
- [ ] Sticker / shape layers
- [ ] Multiple export aspect ratios

### V0.3 — Template System

- [x] Original built-in template library
- [x] User-created reusable templates
- [x] Favorites
- [x] Template search / filters
- [x] Versioned template import / export
- [x] Import normalization and malformed-value hardening
- [x] Privacy-safe template serialization

### V0.4 — Remix Tools

- [ ] Undo / redo stack
- [ ] Sticker / shape layers
- [ ] Square / portrait / landscape exports
- [ ] Duplicate/remix current project
- [ ] Lightweight project history

### V1 — Trend Radar

- [ ] Provider adapter interface
- [ ] GDELT/news signal adapter
- [ ] Additional public trend signals where terms permit
- [ ] Signal normalization
- [ ] Topic clustering
- [ ] Separate Trend Velocity and Meme Potential scores

### V1.5 — Optional AI adapters

- [ ] Caption-generation adapter
- [ ] Original-image-generation adapter
- [ ] Provider-agnostic prompt engine
- [ ] User-owned API configuration or serverless proxy
- [ ] Explicit provenance on AI-generated output

### V2 — Meme Tournament

- [ ] Competing humor agents
- [ ] Novelty / clarity / punchline critic
- [ ] Diversity penalty to prevent twelve near-identical jokes
- [ ] Human selection feedback

### V3 — Cultural Signal Lab

- [ ] Measure which angles users choose
- [ ] Compare signal velocity to humor-selection patterns
- [ ] Opt-in analytics only
- [ ] Export research-friendly aggregate data

See [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Design principles

1. **Do not fake live data.** Demo data says demo.
2. **Diversity beats repetition.** Concepts should be meaningfully different.
3. **Local-first before cloud-first.** The core tool should remain useful offline/static.
4. **Local images stay local.** User uploads are processed in-browser unless a future feature explicitly says otherwise.
5. **Templates reuse layouts, not private artifacts.** Caption and uploaded-image bytes stay out of template packs.
6. **Separate evidence from inference.** Trend strength, creative scoring, and predicted engagement are different things.
7. **Original by default.** Built-in treatments and templates avoid shipping copyrighted meme-template art.
8. **Provider adapters stay replaceable.** No single AI or trend source should own the architecture.

## Repository layout

```text
MemeForge/
├── index.html
├── src/
│   ├── app.js
│   ├── template-ui.js
│   ├── styles.css
│   ├── data/
│   │   ├── trends.js
│   │   └── templates.js
│   └── engines/
│       ├── meme-engine.js
│       ├── score-engine.js
│       ├── storage-engine.js
│       └── template-engine.js
├── tests/
│   └── engine.test.mjs
├── docs/
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
├── package.json
├── LICENSE
└── README.md
```

## License

MIT. See [`LICENSE`](LICENSE).

---

**MemeForge V0.3** — forge the joke, save the look, remix the culture.
