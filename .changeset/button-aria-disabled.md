---
'@uisatin/ui': patch
---

Button: `aria-disabled` now looks disabled (50% opacity, no hover change, no press scale) and swallows clicks, while the button stays focusable and keeps its pointer events, so a Tooltip or a line it points to with `aria-describedby` can say why it can't run yet. A loading button keeps its own look. The `satin-hover` and `satin-pressed` variants skip anything marked `data-disabled`.
