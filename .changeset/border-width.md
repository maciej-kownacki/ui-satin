---
'@uisatin/ui': minor
---

Edges are 0.75px: new tokens `border-width/default` (0.75px) and `border-width/strong` (1px), `--sa-border-width-default` and `--sa-border-width-strong`. Cards, menus, popovers, buttons, chips, outline badges, separators, table lines and every other `border` take the default, written in CSS as what browsers draw for 0.75px (1px on 1x screens, 0.5px on 2x, 0.667px on 3x) so box-shadow strokes are as crisp as borders. The boundaries of form controls (fields, Input group, OTP cells, Search bar, Prompt bar, Checkbox, Radio, Selectable cards, the Slider thumb, the outline Dot) keep 1px, as do focus rings and error edges. Kbd's edge now follows the token.
