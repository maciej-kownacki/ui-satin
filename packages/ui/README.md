# @uisatin/ui

Satin's React components: shadcn-based, built on Radix, themed with Satin tokens. Docs: https://uisatin.dev

**Satin Free.** This package is the free, open-source edition of Satin, under the MIT license. Satin Pro, with more components, patterns and templates, will ship separately as its own licensed package; nothing here changes when it does.

You don't need Tailwind. Satin ships one precompiled stylesheet with the tokens and every class the components use.

## Install

```sh
npm i @uisatin/ui
```

React 19 or newer is a peer dependency.

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
