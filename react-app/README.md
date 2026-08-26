# MemeForge React

React/Vite frontend for MemeForge, designed to deploy as the public GitHub Pages site for `MichaelWave369/MemeForge` while preserving the original dependency-free V0.3 app in the repository root.

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

`.github/workflows/pages-react.yml` builds `react-app/dist` and deploys it with the official GitHub Pages Actions flow.

If GitHub Pages has never been enabled for the repository, open:

`Repository Settings → Pages → Build and deployment → Source → GitHub Actions`

After that, pushes affecting the React app or shared MemeForge engines automatically rebuild and redeploy the site.

## Local-first behavior

The React app follows the same boundaries as vanilla MemeForge:

- uploaded images are processed in the browser;
- project state is saved in browser local storage;
- reusable templates omit caption text and uploaded-image bytes;
- no backend or AI API is required;
- demo trend cards remain explicitly demo data.

## Relationship to the vanilla app

The root V0.3 app remains intact. The React app imports the shared engines instead of cloning their logic, so both frontends use the same core generator, scoring, storage, and template formats.
