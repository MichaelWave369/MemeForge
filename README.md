# MemeForge

**Cultural signal → shareable joke.**

MemeForge is a local-first browser app for turning a topic into multiple distinct meme concepts, selecting the best angle, editing it on a canvas, and exporting the finished meme as a PNG.

V0 deliberately works **without an AI API, backend, account, or API key**. It is designed as a clean foundation for future live-trend and AI adapters without making demo data look live.

## What works now

- Manual topic entry
- Clearly labeled demo signal prompts
- Multi-select humor profiles
- Weirdness control
- Transparent `Meme Potential` creative heuristic
- 12-concept angle tournament
- Original-browser Canvas meme renderer
- Editable top and bottom text
- Multiple original visual treatments
- Optional MemeForge watermark
- Caption copy
- PNG export
- Responsive UI
- Zero runtime dependencies

## Run locally

Because MemeForge uses native JavaScript modules, serve the repository over HTTP rather than opening `index.html` directly from the filesystem.

```bash
git clone https://github.com/MichaelWave369/MemeForge.git
cd MemeForge
python -m http.server 8080
```

Then open `http://localhost:8080`.

Any simple static server works.

## Static hosting

MemeForge V0 is intentionally static-host friendly. It can be served from:

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
     ▼
Canvas Meme Studio
     │
     ├── edit copy
     ├── visual treatment
     ├── copy caption
     └── export PNG
```

The current app has no hidden network calls. Future trend providers and AI providers belong behind explicit adapters rather than being mixed into the core generator.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the longer design.

## Meme Potential in V0

The displayed score is a **creative heuristic**, not a claim about live popularity, future virality, or social engagement. It currently combines:

- caption fit
- topic specificity
- remix potential
- visual potential
- deterministic novelty heuristic

When live trend adapters arrive, external signal measurements should be displayed separately from creative scoring so the UI never launders one kind of evidence into another.

## Roadmap

### V0.x — Forge locally

- [x] Browser UI
- [x] Local angle engine
- [x] Meme Potential heuristic
- [x] Concept tournament
- [x] Canvas editor
- [x] PNG export
- [ ] User-supplied image backgrounds
- [ ] Local template library
- [ ] Save recent projects in local storage

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

### V2 — Meme tournament

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
4. **Separate evidence from inference.** Trend strength, creative scoring, and predicted engagement are different things.
5. **Original by default.** V0 uses generated graphic treatments instead of shipping copyrighted meme-template art.
6. **Provider adapters stay replaceable.** No single AI or trend source should own the architecture.

## Repository layout

```text
MemeForge/
├── index.html
├── src/
│   ├── app.js
│   ├── styles.css
│   ├── data/
│   │   └── trends.js
│   └── engines/
│       ├── meme-engine.js
│       └── score-engine.js
├── docs/
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
├── LICENSE
└── README.md
```

## License

MIT. See [`LICENSE`](LICENSE).

---

**MemeForge V0.1** — build the joke engine first; plug in the firehose second.
