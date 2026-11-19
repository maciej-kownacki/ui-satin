# @uisatin/pro

Satin Pro: the larger components and AI patterns of the Satin design system (bulk actions, data grids, schedulers, agent review flows), built on [Satin Free](../ui) (`@uisatin/ui`).

[Docs](https://uisatin.dev) · [Source](https://github.com/maciej-kownacki/ui-satin/tree/main/packages/ui-pro)

> **TODO(distribution):** Satin Pro is not published. How it is distributed (npm, a private registry, the shadcn registry behind a key) and under which license is decided separately. Until then the package is `"private": true`, its `prepublishOnly` refuses to run, and its license is `UNLICENSED`. Nothing in this folder may be published to npm.

## Use

Satin Pro sits on top of Satin Free and needs the same version of it:

```sh
npm i @uisatin/ui @uisatin/pro
```

Load Pro's stylesheet after Free's, once, at the root of the app:

```tsx
import '@uisatin/ui/styles.css'
import '@uisatin/pro/styles.css'
```

Then import each component from its own entry:

```tsx
import { BulkActionBar } from '@uisatin/pro/bulk-action-bar'
```

Everything in Free's README holds here too: React 19 or newer, ESM only, `'use client'` on every component entry, dark mode with `.dark` or `data-theme`, the theme from `themeCss()` in `@uisatin/ui/theme`. The words Pro components say on their own go through Free's `SatinLabels`: one provider translates both packages.

## How it's built

- Pro components live in `src/components/<name>.tsx`, one npm entry each (`@uisatin/pro/<name>`). They import Free components from `@uisatin/ui/<name>` and never copy them; Free is a peer dependency, so the app holds one copy of it and of its React contexts (labels, toasts).
- The build is Free's: tsup with the `sa:` class prefix, `--sa-*` variables, types from tsc (`build/`, sharing `packages/ui/build/prefix.mjs` and `dist.mjs`). Build Free first: Pro's types read Free's built types, and Pro's stylesheet leaves out everything Free's already has, so `dist/styles.css` holds only what Pro adds.
- `"satin": { "edition": "pro" }` in package.json is what the shadcn registry (`registry/build.mjs`) reads to mark Pro items `meta.edition: "pro"`; the docs mark Pro pages with `edition: 'pro'` in `satin-lab/src/nav.ts`.
- Hand-written CSS for a state-heavy component goes in `src/styles/components/<name>.css` (`.satin-<name>` classes reading Free's plain semantic variables), imported from `src/styles/pro.css`.
