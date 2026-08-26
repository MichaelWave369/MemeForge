# MemeForge Roadmap

## Product thesis

MemeForge should evolve from a fast meme prototyper into a trend-to-meme laboratory without losing the simplicity of the original tool.

The core loop stays:

```text
signal → angle → selection → template → render → share
```

## V0.1 — Local Forge

Status: **implemented**

- Manual topic input
- Demo signal prompts
- Humor-profile selection
- Weirdness control
- Local creative scoring
- 12-angle concept tournament
- Browser Canvas editor
- Multiple visual treatments
- Caption copy
- PNG export
- Responsive layout

## V0.2 — Meme Studio

Status: **implemented core**

- [x] Local image upload
- [x] Browser-side image resizing before persistence
- [x] Image cover / contain
- [x] Image position X/Y
- [x] Image zoom
- [x] Draggable top and bottom text layers
- [x] Text size / font / color / alignment controls
- [x] Outline / shadow controls
- [x] Fine-grained text X/Y placement controls
- [x] Versioned project state in `localStorage`
- [x] Explicit save / load
- [x] Debounced autosave
- [x] PNG export without editor-selection chrome

## V0.3 — Template System

Status: **implemented**

- [x] 8 original built-in layouts
- [x] User-created reusable templates
- [x] Template metadata and tags
- [x] Search
- [x] All / Favorites / Built-in / Mine filters
- [x] Template favorites
- [x] Local user-template persistence
- [x] Versioned JSON template-pack export
- [x] Versioned JSON template-pack import
- [x] Duplicate-id merge behavior
- [x] Imported value normalization and bounds checking
- [x] Approved-font allowlist
- [x] Template privacy boundary: no caption text, image bytes, or image filename in reusable packs
- [x] Applying templates preserves current caption and uploaded image

Built-in templates remain original graphic/layout recipes rather than bundled third-party meme imagery.

## V0.4 — Remix Tools

Goal: make the studio feel like a small creative workstation without adding a backend.

- [ ] Undo / redo history
- [ ] Sticker / shape layers
- [ ] Square / portrait / landscape output sizes
- [ ] Duplicate/remix current project
- [ ] Lightweight local project history
- [ ] Keyboard nudging for selected layers
- [ ] Project JSON import/export
- [ ] Storage-size meter for image-heavy projects

## V1 — Trend Radar

### Signal adapters

- GDELT / news coverage
- Google Trends when accessible under appropriate API terms
- Hacker News / technology discussion signals where useful
- Wikipedia page-view or edit activity where useful
- Manual source URL input

### Signal processing

- Provider normalization
- Topic deduplication
- Entity/topic clustering
- Freshness decay
- Velocity calculation
- Geographic filtering when supported
- Evidence links

### UI

Each trend should show separate fields such as:

```text
Trend Velocity
Freshness
Source Count
Meme Potential
Saturation
```

No single blended score should hide where the evidence came from.

## V1.5 — Optional AI creativity

- AI caption adapter
- AI punchline refinement
- AI concept expansion
- AI-generated original art prompts
- Provider/model provenance
- Cost controls
- Local-engine fallback

The application should continue functioning without AI configured.

## V2 — Meme Agents

Run multiple specialized creative passes:

```text
                 TOPIC
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
    ABSURD       NERDY      DEADPAN
     AGENT        AGENT       AGENT
       │           │           │
       └───────────┼───────────┘
                   ▼
             DIVERSITY CHECK
                   │
                   ▼
             MEME CRITIC
                   │
                   ▼
              TOP CONCEPTS
```

Possible critic dimensions:

- clarity
- novelty
- setup/punchline contrast
- visual compatibility
- topical relevance
- redundancy with other candidates

Human selection remains authoritative.

## V2.5 — Remix graph

Track local concept lineage:

```text
trend
  └── concept A
      ├── remix A1
      ├── remix A2
      └── remix A3
```

Useful for exploring how jokes evolve without needing social analytics.

## V3 — Cultural Signal Lab

With explicit opt-in analytics, MemeForge could study aggregate creative choices:

- which topics are selected
- which humor styles are selected
- which generated concepts are forged
- which templates are selected
- which concepts are remixed
- which export formats are preferred

This becomes interesting research data only when collection is transparent and consensual.

## V4 — Research interfaces

- JSON export of trend evidence
- JSON export of concept tournaments
- aggregate selection analysis
- experiment IDs
- reproducible generation seeds
- comparison of local vs AI-generated concept diversity

## Non-goals

MemeForge should not become:

- a fake virality oracle;
- a hidden surveillance product;
- a platform that silently uploads local images;
- a template exchange that quietly exports private image/caption content;
- a dependency-heavy app that stops working when one AI vendor changes an API;
- a system that presents generated claims as sourced news.

## North star

MemeForge succeeds when a user can discover a topic, create several genuinely different jokes about it, reuse or build a visual language, turn the chosen joke into a polished image without leaving the browser, and leave with a shareable artifact in a few minutes.
