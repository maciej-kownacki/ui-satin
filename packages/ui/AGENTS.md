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

## Accessibility

- The components support WCAG 2.2 AA: Radix gives roles, keys and focus management; Satin gives a 3:1 focus ring, 4.5:1 text, reduced motion, right-to-left and translatable built-in words.
- Your part: an `aria-label` on every icon-only button and on any field without a visible label, `lang` on `<html>`, landmarks and headings, and announcements for changes the components don't know about.
- Don't hide the focus ring (`outline: none` on Satin elements) or colour text with `--sa-text-subtle`, which is below 4.5:1.
- Known gaps and what to do about them: https://uisatin.dev/accessibility. In chat UIs: label who speaks in each Message, give every Citation an `href`, and announce a reply's start and end from one status region.

## Theming and dark mode

- Brand colour and corners: `themeCss({ brand: '#E5533D', radius: 1 })` from `@uisatin/ui/theme`, injected in a `<style>` after the stylesheet.
- One token: set `--sa-<token>` after `styles.css`, in `:root` and in `.dark, [data-theme='dark']`.
- Dark mode: `class="dark"` or `data-theme="dark"` on `<html>` or any parent; `data-theme="system"` follows the OS with no script.
- Variables were unprefixed before 0.6 (`--bg-card`). `@uisatin/ui/compat.css` aliased them in 0.6 and is removed in 0.7; write `--sa-*`.

## Don't

- Don't copy Satin's class names (`sa:flex`) into app markup; they're the package's own build output.
- Don't import from `@uisatin/ui/dist/...` or deep paths other than the documented entries.
- Don't wrap Satin components in another `forwardRef`: pass `ref` straight through.

## Testing (repo only)

For work on the Satin repo; the npm copy of this file leaves this section out.

- `npm test` runs every package's tests once (CI runs it next to typecheck on every PR). One package: `npm test -w @uisatin/ui`. One file, watching: `npx vitest --project ui dialog` (`--project pro` for Satin Pro).
- A runtime test is `src/__tests__/<name>.test.tsx` in packages/ui or packages/ui-pro: Vitest in jsdom with Testing Library and user-event. Type tests stay `<name>.typetest.tsx`, checked by `npm run typecheck` and never run.
- Import the helpers from `satin-test` (test/satin.tsx):
  - `renderWithSatin(ui, { labels, theme, dir })` renders inside `SatinLabels`, sets `data-theme` and `dir` on `<html>`, and returns the queries plus `user` (user-event).
  - `expectNoAxeViolations()` runs axe on the page, overlays included. Every test file calls it in light and dark.
  - `setReducedMotion(true)` and `setColorScheme('dark')` drive the mocked `matchMedia`.
- Cover: it renders; every key the component answers to (`user.tab()`, `user.keyboard('{Enter}')`, focus where it should be after); its words through `labels`; axe in light and dark. Find elements by role and name, the way a screen reader does.
- jsdom has no layout or colours: sizes, positions and contrast aren't testable here (contrast is `npm run check:contrast`; look at the rest in the docs). Toasts and other timers: wrap in `act()` and wait the motion out.

```tsx
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Dialog } from '../components/dialog'

describe('Dialog', () => {
  it('closes with Escape', async () => {
    const { user } = renderWithSatin(<Dialog defaultOpen title="Rename" />, { labels: { close: 'Zamknij' } })
    expect(screen.getByRole('button', { name: 'Zamknij' })).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Dialog defaultOpen title="Rename" />, { theme })
    await expectNoAxeViolations()
  })
})
```
