---
'@uisatin/ui': minor
'@uisatin/pro': patch
---

Dark surfaces lose their blue cast at the same lightness: `bg/canvas` #09090A, `bg/card` #121213, `bg/field` #1A1A1B, `bg/popover` #222223, `bg/muted`, `bg/hover`, `action/secondary/bg` and `status/neutral/bg` #272728, `bg/selected` and `border/default` #2F2F31, `border/subtle` #262628 (new primitives `--sa-color-canvas-dark` and `--sa-color-muted-dark`; Light is unchanged). Menus, popovers, the Attachment preview, Toast and the Bulk action bar get a soft, wide shadow in Dark (new `--sa-effect-shadow-float`, black 40% at 0 2px 20px) in place of the tight band, and keep their shadow in Light (`--sa-effect-shadow-float-contact`). They no longer read `--sa-effect-shadow-sm`, so an app that restyled menu shadows through it should set the two new variables instead.
