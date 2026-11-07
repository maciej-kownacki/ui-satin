# @satin/ui

Satin's React components: shadcn-based, built on Radix, themed with Satin tokens. Docs: https://uisatin.dev

You don't need Tailwind. Satin ships one precompiled stylesheet with the tokens and every class the components use.

## Install

```sh
npm i @satin/ui
```

React 19 or newer is a peer dependency.

## Use

Import the styles once, at the root of your app:

```tsx
// main.tsx
import '@satin/ui/styles.css'
```

Then import components, from the package root or one by one:

```tsx
import { Button } from '@satin/ui/button'

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

This adds the component to `components/ui`, `cn` to `lib/utils` and the precompiled styles to `src/styles/satin.css` (import it once). See https://uisatin.dev/#installation.

## Develop

```sh
npm run build -w @satin/ui   # dist/: ESM + types + styles.css + the published package.json
npm publish packages/ui/dist # publish the built package, not the workspace folder
npm run registry             # rebuild satin-lab/public/r (the shadcn registry)
```

The workspace `package.json` points at `src` so the docs site builds from source with its own Tailwind. `dist/package.json`, written by the build, points consumers at the compiled files.
