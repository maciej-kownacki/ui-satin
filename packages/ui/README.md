# @uisatin/ui

[![npm](https://img.shields.io/npm/v/@uisatin/ui)](https://www.npmjs.com/package/@uisatin/ui)
[![CI](https://github.com/maciej-kownacki/ui-satin/actions/workflows/ci.yml/badge.svg)](https://github.com/maciej-kownacki/ui-satin/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/npm/l/@uisatin/ui)](https://github.com/maciej-kownacki/ui-satin/blob/main/LICENSE)

Satin's React components: shadcn-based, built on Radix, themed with Satin tokens.

[Docs](https://uisatin.dev) · [Source](https://github.com/maciej-kownacki/ui-satin/tree/main/packages/ui) · [Changelog](https://github.com/maciej-kownacki/ui-satin/blob/main/packages/ui/CHANGELOG.md) · [Issues](https://github.com/maciej-kownacki/ui-satin/issues)

**Satin Free.** This package is the free, open-source edition of Satin, under the MIT license. Satin Pro, with more components, patterns and templates, will ship separately as its own licensed package; nothing here changes when it does.

You don't need Tailwind. Satin ships one precompiled stylesheet with the tokens and every class the components use. If your app has its own Tailwind (v3 or v4) or a shadcn/ui theme, the two don't touch: Satin's classes are prefixed (`sa:flex`), every variable it declares is `--sa-*` (`--sa-bg-card`, `--sa-text-sm`), and its reset and reduced-motion rule only apply to Satin's elements, so your `text-sm`, `--spacing`, `--radius` or `--bg-card` stay yours in either import order.

## Install

```sh
npm i @uisatin/ui
```

Requirements: **React 19 or newer, React 18 isn't supported.** Every component takes `ref` as a plain prop and hands it to its main element, the React 19 way; React 18 drops a `ref` passed to a function component, so refs (and Radix's focus management that relies on them) would silently break, and supporting both would mean a `forwardRef` wrapper and a second set of types around every component. The package is ESM only; Node 20.19 or newer can also `require()` it. The components and the root entry are marked `'use client'`, so Server Components can render them (Next.js App Router); `@uisatin/ui/theme` (`themeCss`, `themeVars`) and `@uisatin/ui/lib/utils` (`cn`) aren't, so a Server Component can call them.

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

**Dark mode:** add the `dark` class or `data-theme="dark"` to `<html>` or any parent element. `data-theme="system"` follows the operating system (`prefers-color-scheme`), with no script; set the attribute on the server to avoid a flash. Guide: https://uisatin.dev/guides/dark-mode.

**Customizing:**

- Props first: `variant`, `size`, `tone`, `shape` cover what the design system allows.
- `className` takes your own classes and lands on the component's root. With Tailwind in your app, a utility there replaces the Satin class it conflicts with (`<Button className="px-6">` drops Satin's padding for yours). Without Tailwind, use your own CSS classes; a Tailwind class name alone does nothing, because Satin's stylesheet only contains its own prefixed classes.
- Theme: brand colour and corners with `themeCss({ brand, radius })` from `@uisatin/ui/theme`, or the customizer at https://uisatin.dev/theming. Any semantic token (`--sa-bg-card`, `--sa-text-muted`, `--sa-action-primary-bg`…) can be set in your CSS too, after `styles.css`. Edges are `--sa-border-width-default` (0.75px, drawn as one device pixel on 1x and 2x screens) on surfaces and `--sa-border-width-strong` (1px) on anything interactive: buttons, chips, toggles, fields. The tokens themselves, Light and Dark, are in `@uisatin/ui/tokens.json` (W3C design tokens format).
- Before 0.6 the semantic tokens weren't prefixed (`--bg-card`). If your CSS still reads them, rename them to `--sa-*`: `@uisatin/ui/compat.css`, which aliased the old names in 0.6, is removed in 0.7.
- Composition: overlays and groups come with props for the common case and parts for the rest, e.g. `Dialog` (title, footer… as props) or `DialogRoot` › `DialogTrigger` › `DialogContent` › `DialogHeader` / `DialogBody` / `DialogFooter`; `SegmentedControl` with `items` or `SegmentedControlSegment` children. Every `trigger` prop is rendered `asChild`, so pass your own Button.
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
