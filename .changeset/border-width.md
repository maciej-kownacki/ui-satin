---
'@uisatin/ui': minor
---

Stroke widths by one rule, interactive → strong, surfaces → default. New tokens `border-width/strong` (1px, `--sa-border-width-strong`) for the edge of anything you click, press, type into, toggle or drag (buttons in every variant and their rings, chips, toggles, segmented controls, attachment chips, drop zones, fields, Checkbox, Radio, Selectable cards, the Slider thumb) and `border-width/default` (0.75px, `--sa-border-width-default`) for surfaces and decoration (cards, popovers and menus, dialogs, sheets, toasts, tables, separators, badges, Kbd, code blocks). The default is written in CSS as what browsers draw for 0.75px (1px on 1x screens, 0.5px on 2x, 0.667px on 3x) so box-shadow strokes are as crisp as borders. Focus rings and error edges keep their widths. `cn()` knows `border-strong` is a width, so it no longer drops it next to a border colour.
