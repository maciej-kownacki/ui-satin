---
"@uisatin/ui": minor
---

Checkbox, Radio and an off Switch have an edge you can see: `border/input` is now the control edge, at 3:1 or more on every surface in both themes (`zinc-500` in Light, a new `zinc-450` in Dark), where it used to be a pale fill at 1.3–1.5:1. The Switch keeps its light track and gets a 1px edge in that colour. The fills that borrowed `border/input` (pressed Button and Chip, open menu triggers, the active Sidebar row, the off Switch track, disabled checked controls) move to a new `bg/pressed` token with the same values, so they look as before. If your own CSS used `--sa-border-input` as a fill, switch it to `--sa-bg-pressed`.
