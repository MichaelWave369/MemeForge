# MemeForge Architecture

## 1. Purpose

MemeForge converts a cultural topic into a set of meaningfully different meme concepts, lets a human choose the strongest angle, and renders the result in a browser-native studio.

The architecture intentionally separates five concerns:

1. **Signal acquisition** — what people may be talking about.
2. **Creative interpretation** — which comedic angles can be applied.
3. **Scoring** — how useful a topic appears for meme creation.
4. **Rendering** — how a selected concept becomes a shareable artifact.
5. **Local project state** — how user edits survive refreshes without requiring an account or backend.

Keeping these concerns separate prevents a future live trend number from being mistaken for a creative score or a speculative virality prediction.

## 2. V0.2 data flow

```text
┌──────────────────────┐
│ Manual topic / demos │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Humor profile set    │
│ + weirdness control  │
└───────┬──────────────┘
        │
        ├─────────────────────────┐
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│ Local Angle      │      │ Meme Potential   │
│ Engine           │      │ Heuristic        │
└────────┬─────────┘      └──────────────────┘
         │
         ▼
┌──────────────────────┐
│ 12-concept board     │
└──────────┬───────────┘
           │ human selection
           ▼
┌──────────────────────────────┐
│ Canvas Meme Studio           │
├──────────────────────────────┤
│ local image upload           │
│ resize / contain / cover     │
│ background zoom + pan        │
│ draggable text layers        │
│ typography + layer styling   │
│ optional watermark           │
└───────┬───────────────┬──────┘
        │               │
        ▼               ▼
 localStorage       PNG / caption
 versioned state       export
```

## 3. Current modules

### `src/data/trends.js`

Contains demo prompts only. These are explicitly marked as demo signals in the UI.

### `src/engines/meme-engine.js`

Pure local concept-generation logic.

Inputs:

```text
topic: string
selectedStyles: string[]
weirdness: number
count: number
```

Outputs a list of concepts with:

```text
style
title
top
bottom
caption
note
rank
```

The engine uses multiple factories per humor profile and deterministic seeded ordering. This keeps output stable enough to debug while still varying by topic, style set, and weirdness value.

### `src/engines/score-engine.js`

Produces a creative heuristic from local inputs. It is intentionally described as a heuristic, not a prediction of virality.

Current factors:

- caption fit
- specificity
- remix potential
- visual potential
- novelty heuristic

### `src/engines/storage-engine.js`

Owns the versioned local-project envelope and storage helpers.

Responsibilities:

- encode a project with an explicit schema version;
- reject malformed or incompatible saved data;
- save/load against a Storage-compatible interface;
- report write failures instead of throwing into the UI;
- keep browser persistence logic testable without browser globals.

The current storage schema is `v2` and uses the key:

```text
memeforge:project:v0.2
```

### `src/app.js`

Coordinates browser state, concept selection, Canvas drawing, drag hit-testing, local image preprocessing, typography controls, persistence, caption copying, and PNG export.

The in-memory studio model contains:

```text
visualTheme
watermark
activeLayer
background
  dataUrl
  name
  fit
  zoom
  x
  y
layers
  top
  bottom
```

Each text layer includes copy, normalized X/Y position, size, font, color, alignment, outline, and shadow state.

### `src/styles.css`

Responsive visual system with no third-party CSS dependency. The Canvas uses `touch-action: none` so pointer dragging works with both mouse and touch input.

## 4. Image handling model

User-supplied images are selected through a local file input. V0.2 does not upload them.

Before persistence, the browser:

1. decodes the selected image locally;
2. scales its longest edge down to at most 1600 px;
3. re-encodes it as WebP where supported, otherwise JPEG;
4. keeps the resulting data URL in the project state;
5. stores it only when the local project is saved/autosaved.

This reduces storage pressure while preserving enough resolution for the current 1080×1080 export target.

`localStorage` still has browser-specific quotas. A large image can therefore cause a save failure even after resizing; the UI reports that failure rather than implying the project was saved.

## 5. Canvas interaction model

Text placement is stored as normalized coordinates between `0` and `1`, then clamped to a safe interior region of the canvas. This keeps layer placement independent of CSS display size.

After each draw, MemeForge records approximate text-layer bounds. Pointer interaction follows:

```text
pointer down
   ↓
hit-test text bounds
   ↓
select layer
   ↓
store pointer offset
   ↓
pointer move → normalized X/Y
   ↓
redraw + autosave
```

The cyan selection rectangle exists only in the editor preview. PNG export redraws once without selection chrome, exports, then restores the editor preview.

## 6. Future provider boundary

Live data should enter through adapters with a common result shape.

Suggested interface:

```js
{
  provider: 'gdelt',
  fetchedAt: 'ISO-8601 timestamp',
  topic: 'string',
  signals: {
    velocity: 0,
    volume: 0,
    freshness: 0
  },
  evidence: [
    {
      title: 'string',
      url: 'string',
      publishedAt: 'ISO-8601 timestamp'
    }
  ]
}
```

The UI should distinguish:

```text
TREND VELOCITY     evidence-derived
MEME POTENTIAL     creative heuristic
ENGAGEMENT         observed after publishing, if ever collected
VIRALITY FORECAST  speculative model output, if ever implemented
```

Those values must never be silently merged into one authoritative-looking number.

## 7. AI boundary

AI should be optional. A future AI adapter can generate:

- alternate captions
- alternate punchlines
- original image prompts
- critic feedback
- concept diversity checks

Suggested provider interface:

```js
async function generateAngles({ topic, styles, weirdness, count }) {
  return {
    provider,
    model,
    generatedAt,
    concepts
  };
}
```

The existing local engine remains the fallback.

## 8. Security and privacy model

V0.2 contains no secrets and makes no external API calls.

Current guarantees:

- uploaded images are processed locally;
- saved project state is written to browser local storage;
- DOM text is written through `textContent` or form values rather than injected HTML;
- PNG rendering occurs locally on Canvas;
- no analytics are included.

When provider credentials are introduced:

- never place shared secret keys in client JavaScript;
- use a serverless proxy or user-owned local configuration;
- validate and rate-limit backend requests;
- treat trend-provider content as untrusted input;
- sanitize any text inserted into the DOM;
- keep rendering on Canvas/textContent paths rather than injecting HTML.

## 9. Rendering philosophy

Built-in treatments remain original graphic treatments instead of bundled third-party meme-template imagery. User-supplied imagery is explicitly user-selected and local.

Future remote image sources must account for CORS and provenance before promising export. A remote image that taints the Canvas would break local PNG generation, so remote asset loading should go through a controlled adapter rather than arbitrary URL drawing.

## 10. Growth path

The key architectural rule is simple:

> Keep MemeForge useful as a small static app even after smarter providers are attached.

That makes the project resilient, easy to host, easy to fork, easy to test, and useful even when external services are unavailable.
