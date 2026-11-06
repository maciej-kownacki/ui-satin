# ui-satin

Satin, a design system for calm, AI-native product interfaces. Docs live at [uisatin.dev](https://uisatin.dev).

| Folder | What it is |
|---|---|
| `tokens/` | The source of truth: `tokens.json` (W3C design tokens, Light/Dark), mirrored from the uiKit Figma file. `npm run tokens` regenerates `packages/ui/src/styles/theme.css`. |
| `packages/ui/` | `@satin/ui`: React components built on shadcn/ui and Radix, themed with the tokens. Motion rules: `packages/ui/MOTION.md`. |
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
@import "@satin/ui/styles.css";

// App.tsx
import { Button } from '@satin/ui/button'
```

Each component has its own entry point (`@satin/ui/<name>`), or import everything from `@satin/ui`.

## Deploy

The repo root is linked to the Vercel project `uisatin` (`.vercel/`, not committed), whose root directory is `satin-lab`.

```bash
vercel deploy --prod
```

DNS lives at name.com: A `@` → 216.198.79.1, CNAME `www` → Vercel. Nothing to change there when the site changes.
