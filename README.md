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
| `satin-lab/` | The docs site (Astro + React islands), deployed to uisatin.dev. One page per component, guide and recipe: `src/pages/{components,ai-patterns,guides,recipes}/`, listed in `src/nav.ts`; each component page also as markdown (`/components/<name>.md`) and all of them in `/llms-full.txt`. |
| `registry/` | Builds the shadcn registry (`satin-lab/public/r`) from the package, with each component's props from its types (`scripts/props.mjs`). |

Coding agents: [AGENTS.md](AGENTS.md) for this repo, [packages/ui/AGENTS.md](packages/ui/AGENTS.md) for apps that use the package.

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

`npm run build` is the public site: the pages listed in `unreleased` (satin-lab/src/nav.ts) are left out entirely, and Satin Pro is docs-only, with no Code tab, no example and no registry item carrying its source. A Vercel preview deploy (`VERCEL_ENV=preview`) or `SATIN_PREVIEW=1 npm run build` builds everything; `npm run dev` shows everything, and `SATIN_PUBLIC=1 npm run dev` shows the public site. See satin-lab/integrations/release.mjs.

Releases of `@uisatin/ui` go through Changesets and the Release workflow, published from GitHub Actions with npm Trusted Publishing; see [packages/ui/README.md](packages/ui/README.md#release).
