# Using @uisatin/ui (for coding agents)

Satin is a React design system: components on Radix, one precompiled stylesheet, no Tailwind needed. These rules keep generated code working and on-system. Full docs: https://uisatin.dev, every component page also as markdown (`https://uisatin.dev/components/<name>.md`), all of them in https://uisatin.dev/llms-full.txt.

## Setup

- `npm i @uisatin/ui`. React 19 or newer only: components take `ref` as a plain prop, which React 18 drops.
- Import `@uisatin/ui/styles.css` once, at the root of the app. Don't install Tailwind for Satin's sake.
- Fonts: Geist and Geist Mono (`@fontsource-variable/geist`, `next/font`), or the system font is used.
- Next.js App Router: components render from Server Components (their entries are `'use client'`). Call `themeCss()` from `@uisatin/ui/theme` (not the root entry) in a Server Component.

## Writing UI

- Import each component from its own entry: `import { Button } from '@uisatin/ui/button'` (kebab-case file name).
- Use props first: `variant`, `size`, `tone`, `shape`. Don't restyle a component into something the design system doesn't have.
- Colours, radii and type come from tokens. In your CSS read `var(--sa-bg-card)`, `var(--sa-text-muted)`, `var(--sa-border-default)`; never hard-code a hex value next to Satin components.
- `className` reaches the component's root. With the app's own Tailwind, a utility there replaces the Satin class it conflicts with; without Tailwind, use the app's CSS classes.
- Every component passes `id`, `aria-*`, `data-*`, handlers and `ref` to its main element.
- Overlays and groups: props for the common case (`<Dialog title footer trigger>`), parts when you need the structure (`DialogRoot`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogBody`, `DialogFooter`). A `trigger` prop is rendered `asChild`: pass a `Button`.
- Forms: `Form` with `FormField`s; give each field a `name` and pass `errors` keyed by name to `Form`, which focuses the first invalid control after a submit.
- Icon-only buttons need `aria-label`. Built-in words (Close, Select row…) come from `SatinLabels`; wrap the app in `<SatinLabels labels={{…}}>` to translate them.

## Theming and dark mode

- Brand colour and corners: `themeCss({ brand: '#E5533D', radius: 1 })` from `@uisatin/ui/theme`, injected in a `<style>` after the stylesheet.
- One token: set `--sa-<token>` after `styles.css`, in `:root` and in `.dark, [data-theme='dark']`.
- Dark mode: `class="dark"` or `data-theme="dark"` on `<html>` or any parent; `data-theme="system"` follows the OS with no script.
- Variables were unprefixed before 0.6 (`--bg-card`). Old CSS keeps working with `@uisatin/ui/compat.css` until 0.7; write new code with `--sa-*`.

## Don't

- Don't copy Satin's class names (`sa:flex`) into app markup; they're the package's own build output.
- Don't import from `@uisatin/ui/dist/...` or deep paths other than the documented entries.
- Don't wrap Satin components in another `forwardRef`: pass `ref` straight through.
