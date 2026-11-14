# Satin

[![npm](https://img.shields.io/npm/v/@uisatin/ui)](https://www.npmjs.com/package/@uisatin/ui)
[![CI](https://github.com/maciej-kownacki/ui-satin/actions/workflows/ci.yml/badge.svg)](https://github.com/maciej-kownacki/ui-satin/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Satin, a design system for calm, AI-native product interfaces. Docs live at [uisatin.dev](https://uisatin.dev).

The React components are published as [`@uisatin/ui`](https://www.npmjs.com/package/@uisatin/ui) (Satin Free, MIT): `npm i @uisatin/ui`. See [packages/ui](packages/ui) for usage, and the [changelog](packages/ui/CHANGELOG.md) for what changed. Bugs and ideas: [issues](https://github.com/maciej-kownacki/ui-satin/issues).

| Folder | What it is |
|---|---|
| `tokens/` | The source of truth: `tokens.json` (W3C design tokens, Light/Dark), mirrored from the uiKit Figma file. `npm run tokens` regenerates `packages/ui/src/styles/theme.css`. |
| `packages/ui/` | `@uisatin/ui`: React components built on shadcn/ui and Radix, themed with the tokens. Motion rules: `packages/ui/MOTION.md`. |
| `satin-lab/` | The docs site (Astro + React islands), deployed to uisatin.dev. One page per intro item and component: `src/pages/{intro,components,ai-patterns}/`, listed in `src/nav.ts`. |

## Develop

```bash
npm install
npm run dev
```

The lab runs on http://localhost:4330.

## Use a component

```tsx
// app.css
@import "@uisatin/ui/styles.css";

// App.tsx
import { Button } from '@uisatin/ui/button'
```

Each component has its own entry point (`@uisatin/ui/<name>`), or import everything from `@uisatin/ui`.

## Deploy

The repo root is linked to the Vercel project `uisatin` (`.vercel/`, not committed), whose root directory is `satin-lab`.

```bash
vercel deploy --prod
```

Releases of `@uisatin/ui` go through Changesets and the Release workflow, published from GitHub Actions with npm Trusted Publishing; see [packages/ui/README.md](packages/ui/README.md#release).
