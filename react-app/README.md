# MemeForge React

React/Vite frontend for MemeForge, deployed as the public GitHub Pages site for `MichaelWave369/MemeForge` while preserving the original dependency-free app in the repository root.

## Current milestone — V0.4 Remix Tools

V0.4 is intentionally about making the fast workflow faster rather than turning MemeForge into a heavy image editor.

New React features:

- one-click Remix: rotate to another concept + built-in look while preserving the uploaded image;
- grouped undo / redo, including Ctrl/Cmd+Z and redo shortcuts;
- export aspect ratios: Square 1:1, Portrait 4:5, Story 9:16, Landscape 16:9;
- simple draggable sticker / shape layers with size, position, rotation, opacity, duplicate, and remove controls;
- Duplicate checkpoint for branching from the current meme;
- compact local remix history with restore buttons;
- remix checkpoints deliberately exclude uploaded-image bytes and filenames, avoiding repeated large localStorage copies;
- the existing V0.3 template library, image editor, concept engine, scoring, project save/load, and PNG export remain intact.

## Stack

- React 19.2.8
- React DOM 19.2.8
- Vite 8.2.2
- `@vitejs/plugin-react` 6.1.0
- GitHub Pages via GitHub Actions

The app reuses MemeForge's existing local engines from `../src`:

- meme concept engine
- Meme Potential score engine
- project storage engine
- template engine
- demo trend data
- built-in template pack

V0.4 React-specific helpers live in `react-app/src`:

- `canvas.js` — variable-size Canvas renderer and sticker layers
- `useStudioHistory.js` — grouped undo/redo state
- `remix-history.js` — compact media-stripped checkpoints

## Local development

```bash
cd react-app
npm install
npm run dev
```

## Production build

```bash
cd react-app
npm install
npm run build
```

The Vite base path is `/MemeForge/` so generated assets work at the repository Pages URL.

## Deployment

`.github/workflows/pages-react.yml` builds `react-app/dist` and deploys it through GitHub Pages Actions.

The public URL is:

`https://michaelwave369.github.io/MemeForge/`

Pushes affecting the React app or shared MemeForge engines automatically rebuild and redeploy the site.

## Local-first behavior

- uploaded images are processed in the browser;
- project state is saved in browser local storage;
- reusable templates omit caption text and uploaded-image bytes;
- remix checkpoints also omit uploaded-image bytes;
- no backend or AI API is required;
- demo trend cards remain explicitly demo data.

## Relationship to the vanilla app

The root app remains intact. The React app imports the shared MemeForge engines instead of cloning their core generator/scoring/template logic. React V0.4 adds faster remix-specific UI and Canvas capabilities on top of that shared foundation.
