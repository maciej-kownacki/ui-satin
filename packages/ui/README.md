# @uisatin/ui

[![npm](https://img.shields.io/npm/v/@uisatin/ui)](https://www.npmjs.com/package/@uisatin/ui)
[![CI](https://github.com/maciej-kownacki/ui-satin/actions/workflows/ci.yml/badge.svg)](https://github.com/maciej-kownacki/ui-satin/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/npm/l/@uisatin/ui)](https://github.com/maciej-kownacki/ui-satin/blob/main/LICENSE)

Satin's React components: shadcn-based, built on Radix, themed with Satin tokens.

[Docs](https://uisatin.dev) · [Source](https://github.com/maciej-kownacki/ui-satin/tree/main/packages/ui) · [Changelog](https://github.com/maciej-kownacki/ui-satin/blob/main/packages/ui/CHANGELOG.md) · [Issues](https://github.com/maciej-kownacki/ui-satin/issues)

**Satin Free.** This package is the free, open-source edition of Satin, under the MIT license. Satin Pro, with more components, patterns and templates, will ship separately as its own licensed package; nothing here changes when it does.

You don't need Tailwind. Satin ships one precompiled stylesheet with the tokens and every class the components use. If your app has its own Tailwind (v3 or v4) or a shadcn/ui theme, the two don't touch: Satin's classes are prefixed (`sa:flex`), its variables are `--sa-*`, and its reset only applies to Satin's elements, so your `text-sm`, `--spacing` or `--radius` stay yours in either import order.

## Install

```sh
npm i @uisatin/ui
```

Requirements: React 19 or newer (peer dependency). The package is ESM only; Node 20.19 or newer can also `require()` it. Every entry point is marked `'use client'`, so it works in React Server Components apps (Next.js App Router).

Versions: Satin is 0.x. Until 1.0 a minor release (0.2 → 0.3) may change an API; patches don't. Every change is in the changelog.

## Use

Import the styles once, at the root of your app:

```tsx
// main.tsx
import '@uisatin/ui/styles.css'
```

Then import components, from the package root or one by one:

```tsx
import { Button } from '@uisatin/ui/button'

export function Save() {
  return <Button>Save changes</Button>
}
```

**Dark mode:** add the `dark` class to `<html>` or any parent element.

**Customizing:**

- Props first: `variant`, `size`, `tone`, `shape` cover what the design system allows.
- `className` takes your own classes and lands on the component's root. With Tailwind in your app, a utility there replaces the Satin class it conflicts with (`<Button className="px-6">` drops Satin's padding for yours). Without Tailwind, use your own CSS classes; a Tailwind class name alone does nothing, because Satin's stylesheet only contains its own prefixed classes.
- Theme: brand colour and corners with `themeCss({ brand, radius })` or the customizer at https://uisatin.dev/theming. Semantic tokens (`--bg-card`, `--text-muted`, `--action-primary-bg`…) can be set in your CSS too.
- Words: the labels components say on their own (Close, Increase, Select all rows…) are English by default. Wrap the app in `<SatinLabels labels={{ close: 'Zamknij' }}>` (from `@uisatin/ui/labels`) to translate or reword any of them.
- HTML attributes and `ref`: every component passes `id`, `data-*`, `aria-*`, handlers and `ref` to its main element (the control for fields, the panel for overlays); each component's docs comment says which.
- Satin's CSS sits in cascade layers (`theme`, `base`, `components`, `utilities`). Your unlayered rules win over it, so a global `p { margin: … }` also reaches a paragraph inside a Satin Card; scope those rules or put them in `@layer base`.

**Font:** the tokens ask for Geist and Geist Mono; load them (for example with `@fontsource-variable/geist`) or the system font is used.

## Copy the source instead (shadcn registry)

Every component is also a shadcn registry item, so you can own the code:

```sh
npx shadcn@latest add https://uisatin.dev/r/button.json
```

This adds the component to `components/ui`, `cn` to `lib/utils` and the precompiled styles to `src/styles/satin.css` (import it once). See https://uisatin.dev/installation. Each registry item carries `meta.version` (the npm release its source matches) and `meta.edition`.

## Develop

```sh
npm run build -w @uisatin/ui   # dist/: ESM + types + styles.css + the published package.json
npm run pack:ui              # build and pack dist into satin-ui-x.y.z.tgz, to try in another app
npm run registry             # rebuild satin-lab/public/r (the shadcn registry)
```

## Release

Releases go through [Changesets](https://github.com/changesets/changesets):

1. With a change, run `npm run changeset`, pick patch, minor or major and describe it. Commit the file it writes.
2. On `main`, the Release workflow opens a "Version packages" pull request that bumps the version and writes the changelog.
3. Merging it publishes `packages/ui/dist` to npm (`npm run release`) and tags the commit `@uisatin/ui@x.y.z`.

The workflow publishes through npm Trusted Publishing (OIDC), so no npm token is stored: npm trusts `.github/workflows/release.yml` in this repository. `npm run release` also works by hand after `npm login`; it skips a version that is already on npm. Never `npm publish` the workspace folder: it points at `src` and refuses to publish.

The workspace `package.json` points at `src` so the docs site builds from source with its own Tailwind. `dist/package.json`, written by the build, points consumers at the compiled files.
