---
"@uisatin/ui": minor
---

Satin now sits next to an app's own Tailwind or shadcn/ui theme without touching it. The stylesheet's classes carry Satin's prefix (`sa:flex`), its theme variables are `--sa-*` (`--sa-text-sm`, `--sa-color-blue-600`, `--sa-radius`, `--sa-chart-1`…), and Tailwind's reset and Satin's base rules apply only to Satin's elements, so the app's `text-sm`, `--spacing`, `--radius`, list styles and headings stay the app's in either import order. Tailwind classes passed in `className` still replace the Satin classes they conflict with.

Breaking for custom CSS that read Satin's primitive variables: use `--sa-color-*` and `--sa-radius-*` instead of `--color-*` and `--radius-*` (semantic tokens like `--bg-card` and `--action-primary-bg` are unchanged). `themeCss()` writes the new names. The shadcn registry ships the same prefixed source. The empty source maps are gone from the package.
