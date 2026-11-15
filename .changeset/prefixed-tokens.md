---
"@uisatin/ui": minor
---

Every variable Satin declares is now `--sa-*`, the semantic tokens included: `--sa-bg-card`, `--sa-text-muted`, `--sa-border-default`, `--sa-action-primary-bg`, `--sa-status-*`, `--sa-component-*`, the control heights, and the variables components set inline (`--sa-code-plain` and the other CodeBlock colours). An app's own `--bg-card` or `--text-muted` no longer reaches Satin, and Satin's no longer lands on the app's `:root`. `themeCss()` writes the new names, and the stylesheet check now fails on any variable outside `--sa-*`.

Breaking for CSS that reads or sets the old names. To read them for one more minor version, import `@uisatin/ui/compat.css` after `styles.css`: it aliases each old name to its `--sa-*` one, in Light, Dark and every tone, and goes away in 0.7. To change a token, set the `--sa-*` name (rename `--bg-card: …` to `--sa-bg-card: …`).

Dark mode also follows `data-theme`: `data-theme="dark"` works like the `dark` class, and `data-theme="system"` follows the operating system's `prefers-color-scheme` with no script. `themeCss()` with a `scope` writes all three. The tokens themselves ship as `@uisatin/ui/tokens.json` (W3C design tokens, Light and Dark).

The reduced-motion rule now stops only Satin's elements and what's inside them, in the base layer; it used to set every element on the page to a near-zero duration with an unlayered `!important`, the app's own animations included. InputOTP's caret blinks from its own `data-slot` rule.

`@uisatin/ui/theme` (`themeCss`, `themeVars`) is no longer marked `'use client'`, so a Server Component can call `themeCss()`, e.g. in a Next.js root layout; import it from `@uisatin/ui/theme`, not the root entry, there. The Channel and Donut charts read their series colours from Satin's `--sa-chart-*` again: from npm they read the unprefixed `--chart-*`, so they lost their colours, or took an app's own shadcn chart colours.
