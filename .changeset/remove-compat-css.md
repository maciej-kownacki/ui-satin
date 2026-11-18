---
"@uisatin/ui": minor
---

`@uisatin/ui/compat.css` is gone, as 0.6 announced. It aliased the token names from before 0.6 (`--bg-card`, `--text-muted`…) to their `--sa-*` ones. Breaking for CSS that still reads the old names: rename them to `--sa-*` (`var(--bg-card)` → `var(--sa-bg-card)`), and drop the `compat.css` import.
