---
"@uisatin/ui": minor
---

The pill corner (`--radius-pill`: Button's `rounded` shape, chips, tabs, segmented controls, the sidebar's rows) now changes at every step of the theme's corner scale: square at 0, 6px at 0.5, 12px at Satin's default 1, and a full pill only at 1.5. It used to be a full pill from 1 up, so Default and Large looked the same on 32px controls. The base stylesheet follows: `--radius-pill` is 12px unless a theme sets Large corners.
