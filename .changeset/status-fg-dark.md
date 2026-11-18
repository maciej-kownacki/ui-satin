---
"@uisatin/ui": patch
---

Status colours in Dark are calmer: the text, icons and dots of Badge, Dot, Avatar, Chip, Alert, Toast and the other `status/*/fg` users now take a new `soft-400` step per hue (OKLCH L 0.70, C 0.10, at least 5.7:1 on their tint) instead of the pale `soft-300`, and neutral takes `zinc-400`. Custom brands follow through `themeCss()` (new `--sa-color-blue-soft-400`). Light is unchanged.
