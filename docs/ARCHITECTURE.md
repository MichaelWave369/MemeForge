# MemeForge Architecture

## 1. Purpose

MemeForge converts a cultural topic into a set of meaningfully different meme concepts, lets a human choose the strongest angle, and renders the result in a browser-native studio.

The architecture intentionally separates four concerns:

1. **Signal acquisition** — what people may be talking about.
2. **Creative interpretation** — which comedic angles can be applied.
3. **Scoring** — how useful a topic appears for meme creation.
4. **Rendering** — how a selected concept becomes a shareable artifact.

Keeping these concerns separate prevents a future live trend number from being mistaken for a creative score or a speculative virality prediction.

## 2. V0 data flow

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
┌──────────────────────┐
│ Canvas Meme Studio   │
├──────────────────────┤
│ edit text            │
│ choose visual theme  │
│ optional watermark   │
└──────────┬───────────┘
           │
           ├────► copy caption
           └────► export PNG
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

### `src/app.js`

Coordinates browser state, rendering, events, concept selection, Canvas drawing, caption copying, and PNG export.

### `src/styles.css`

Responsive visual system with no third-party CSS dependency.

## 4. Future provider boundary

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

## 5. AI boundary

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

## 6. Security model

V0 contains no secrets and makes no external API calls.

When provider credentials are introduced:

- never place shared secret keys in client JavaScript;
- use a serverless proxy or user-owned local configuration;
- validate and rate-limit backend requests;
- treat trend-provider content as untrusted input;
- sanitize any text inserted into the DOM;
- keep rendering on Canvas/textContent paths rather than injecting HTML.

## 7. Rendering philosophy

V0 ships original graphic treatments instead of bundling third-party meme-template imagery. This avoids cross-origin export problems and reduces copyright ambiguity.

Future user-supplied imagery can be supported through a local file picker and Canvas draw path. Remote image sources should account for CORS before promising export.

## 8. Growth path

The key architectural rule is simple:

> Keep MemeForge useful as a small static app even after smarter providers are attached.

That makes the project resilient, easy to host, easy to fork, and easy to test.
