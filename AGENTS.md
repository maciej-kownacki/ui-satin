# Working on the Satin repo (for coding agents)

Monorepo: `packages/ui` is `@uisatin/ui` (React 19 components on Radix), `satin-lab` is the docs site at https://uisatin.dev (Astro, builds the components from source with its own Tailwind), `tokens/tokens.json` is the design-token source, `registry/build.mjs` writes the shadcn registry into `satin-lab/public/r`. Rules for apps that use the package are in `packages/ui/AGENTS.md`.

## Commands

```sh
npm run dev            # docs site at http://localhost:4330
npm run typecheck      # tsc on packages/ui
npm run build:ui       # packages/ui/dist: prefixed JS, types, styles.css, compat.css, tokens.json
npm run tokens         # tokens.json → packages/ui/src/styles/theme.css (never edit theme.css by hand)
npm run registry       # build, props.json, sizes.json, then the registry in satin-lab/public/r
npm run size           # size budgets (.size-limit.json)
npm run check:types    # the packed types under node16, nodenext and bundler
npm run check:docs     # props.json is fresh; nav, registry and package exports agree
npm run check:contrast # text 4.5:1, focus and error edges 3:1, Light and Dark, themeCss brands
node scripts/check-theme.mjs # the built themeVars()/themeCss(): no broken value for any brand or corner scale
node scripts/check-css.mjs && node scripts/check-cn.mjs
```

## How the package is built

- The source writes plain Tailwind classes and plain variable names (`bg-bg-card`, `var(--bg-card)`). The npm build (`packages/ui/build/`) prefixes every class (`sa:`) and every variable (`--sa-*`), so the shipped CSS shares no name with an app. `check-css` fails on anything unprefixed; the build fails on a class list or `var(--x)` in the JS that the rewrite couldn't reach, so write class lists and variable names as whole strings, never built from templates (`var(--chart-${i})` is a bug).
- Hand-written CSS selects Satin's elements by `data-slot`, never by a Tailwind class name.
- Every component's root (and portaled content) carries `data-slot`; the reduced-motion rule and docs tooling rely on it.
- Component entries get `'use client'`; `theme/` and `lib/utils` must stay server-safe (no React, no hooks).
- Figma node ids in JSDoc are fine in the source; the build strips them from the published types.

## Conventions

- Components take `ref` as a prop and spread the rest onto their main element; document where in the component's JSDoc ("Other props, `ref` included, go to …").
- Words a component says on its own go through `SatinLabels` (`labels.tsx`), never as English literals.
- Focus: never remove it without drawing it. Use the `--action-focus-ring` colour (solid, 3:1 on every surface): an outline 2px off for standalone controls, a 2px edge for fields. Text colours need 4.5:1 on every surface they sit on; `npm run check:contrast` checks the tokens. Known gaps live in `satin-lab/src/accessibility.ts` and on /accessibility: add one when you find it, delete it when you fix it.
- Props for the common case, parts for composition (see `dialog.tsx`, `segmented-control.tsx`).
- Every change to `packages/ui` that users see needs a changeset (`npm run changeset`).
- Docs: a component page is `satin-lab/src/pages/components/<id>.astro` with a demo in `satin-lab/src/demos/<id>.tsx`, its sidebar entry in `nav.ts`, its API description in `api.ts`, accessibility notes in `a11y.ts`. Props come from the types (`scripts/props.mjs` → `props.json`); regenerate it when props change.
- Writing style in code comments and docs: short plain sentences that say why; no filler.
