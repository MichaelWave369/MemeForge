# MemeForge Architecture

## 1. Purpose

MemeForge converts a cultural topic into meaningfully different meme concepts, lets a human choose the strongest angle, optionally applies a reusable visual layout, and renders the result in a browser-native studio.

The architecture intentionally separates six concerns:

1. **Signal acquisition** — what people may be talking about.
2. **Creative interpretation** — which comedic angles can be applied.
3. **Scoring** — how useful a topic appears for meme creation.
4. **Template language** — reusable visual layout and styling.
5. **Rendering** — how a selected concept becomes a shareable artifact.
6. **Local persistence** — how projects, templates, and favorites survive refreshes without requiring an account or backend.

Keeping these concerns separate prevents a future live trend number from being mistaken for a creative score, a template choice, or a speculative virality prediction.

## 2. V0.3 data flow

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
│ Template Library             │
├──────────────────────────────┤
│ built-in original layouts    │
│ user layouts                 │
│ search / filters / favorites │
│ JSON pack import / export    │
└──────────┬───────────────────┘
           │ optional apply
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
 project state          export
```

## 3. Current modules

### `src/data/trends.js`

Contains demo prompts only. These are explicitly marked as demo signals in the UI.

### `src/data/templates.js`

Contains the original built-in V0.3 template pack. Built-ins are layout/style recipes, not bundled third-party meme images.

Each template describes:

```text
id
name
description
tags
source
studio
  visualTheme
  watermark
  background fit / zoom / pan
  top text-layer styling
  bottom text-layer styling
```

### `src/engines/meme-engine.js`

Pure local concept-generation logic. It produces multiple deterministic-but-topic-sensitive angles from a topic, humor-profile set, weirdness value, and requested count.

### `src/engines/score-engine.js`

Produces the local `Meme Potential` creative heuristic. It is intentionally not presented as a virality prediction.

### `src/engines/template-engine.js`

Owns template normalization, creation, application semantics, filtering, pack encoding/decoding, and user-template merging.

Important rules:

- imported numeric values must be finite and are clamped to editor-supported ranges;
- fonts are restricted to the editor’s supported font set;
- unknown themes/alignment modes/fits fall back safely;
- malformed or incompatible template packs decode to an empty set;
- user-template merge is deterministic by template id;
- applying a template preserves current meme caption text and uploaded-image data.

### `src/engines/storage-engine.js`

Owns Storage-compatible helpers for three independent local concerns:

```text
memeforge:project:v0.2
memeforge:templates:v0.3
memeforge:template-favorites:v0.3
```

The project remains on schema version 2 because V0.3 did not require changing the saved project shape. Templates and favorites have separate keys so template-library evolution does not invalidate user projects.

### `src/app.js`

Coordinates the main MemeForge studio state: concept selection, Canvas drawing, drag hit-testing, local image preprocessing, typography controls, project persistence, caption copying, and PNG export.

### `src/template-ui.js`

Coordinates the V0.3 template library UI.

Rather than creating a second copy of studio state, it uses the existing editor controls as the integration boundary. Applying a template updates those controls and dispatches the same input/change events a human edit would produce. This keeps `app.js` authoritative for actual rendering/project state.

Responsibilities include:

- render built-in and user-template cards;
- search/filter/favorite behavior;
- read the current visual layout from editor controls;
- save custom layouts locally;
- apply templates without replacing caption/image content;
- import/export versioned JSON packs;
- delete custom layouts.

### `src/styles.css`

Responsive visual system with no third-party CSS dependency. It includes the studio, draggable Canvas interaction styling, and V0.3 template-card previews.

## 4. Template privacy boundary

A reusable MemeForge template is intentionally narrower than a project.

A template can contain:

```text
visual theme
watermark preference
background fit / zoom / pan defaults
text positions
font family
font size
font color
alignment
outline / shadow
```

A template cannot contain:

```text
caption text
uploaded-image data URL
uploaded-image filename
concept board
active topic
```

This is enforced by constructing templates through a normalized layout-only schema instead of serializing the project object and deleting fields afterward.

That direction matters: **allowlist what belongs in a template rather than blacklist what should not leak.**

## 5. Image handling model

User-supplied images are selected through a local file input. V0.3 does not upload them.

Before project persistence, the browser:

1. decodes the selected image locally;
2. scales its longest edge down to at most 1600 px;
3. re-encodes it as WebP where supported, otherwise JPEG;
4. keeps the resulting data URL in project state;
5. stores it only when the project is saved/autosaved.

Template creation never copies that data URL.

## 6. Canvas interaction model

Text placement uses normalized coordinates between `0` and `1`, clamped to a safe interior region. After each draw, MemeForge records approximate text-layer bounds for pointer hit-testing.

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

The cyan selection rectangle exists only in the editor preview. PNG export redraws without selection chrome, exports, then restores the editor state.

## 7. Template-pack format

Exports use a JSON envelope:

```json
{
  "kind": "memeforge-template-pack",
  "version": 1,
  "exportedAt": "ISO-8601",
  "templates": []
}
```

Only user templates are exported. Built-ins ship with the application and are not duplicated into packs.

Import behavior is fail-closed:

- invalid JSON → no templates;
- wrong `kind` → no templates;
- unsupported version → no templates;
- malformed entries → normalized or discarded;
- duplicate ids → imported entry replaces the existing entry with that id.

## 8. Future provider boundary

Live trend data should enter through explicit provider adapters with a common result shape. The UI must keep these meanings separate:

```text
TREND VELOCITY     evidence-derived
MEME POTENTIAL     creative heuristic
ENGAGEMENT         observed after publishing, if collected
VIRALITY FORECAST  speculative model output, if implemented
```

Those values must never be silently merged into one authoritative-looking number.

## 9. AI boundary

AI remains optional. A future provider adapter may generate alternate captions, punchlines, original-image prompts, critic feedback, or diversity checks. The local engine remains the fallback and the application should still function without AI configuration.

## 10. Security and privacy model

Current guarantees:

- no shared secrets;
- no external API calls in V0.3;
- uploaded images are processed locally;
- project/template/favorite persistence uses browser local storage;
- template export excludes caption and image bytes;
- imported templates are normalized before application;
- DOM content uses `textContent`/form values rather than injected HTML;
- PNG rendering occurs locally on Canvas;
- no analytics are included.

When provider credentials are introduced:

- never place shared secret keys in client JavaScript;
- use a serverless proxy or user-owned local configuration;
- validate and rate-limit backend requests;
- treat trend-provider content as untrusted input;
- preserve provenance and evidence links;
- keep generated claims distinct from sourced facts.

## 11. Rendering philosophy

Built-in treatments and templates remain original layout/graphic recipes instead of bundled third-party meme-template imagery. User-supplied imagery is explicitly user-selected and local.

Future remote image sources must account for provenance and CORS before promising export; arbitrary remote drawing can taint the Canvas and break PNG generation.

## 12. Growth path

The key architectural rule remains:

> Keep MemeForge useful as a small static app even after smarter providers are attached.

That makes the project resilient, easy to host, easy to fork, easy to test, and useful even when external services are unavailable.
