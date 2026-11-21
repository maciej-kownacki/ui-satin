---
'@uisatin/ui': minor
---

Line heights are whole pixels. `text-sm` (13px) sits on a 20px line instead of 19.5px, and `text-2xl` (24px) on 32px instead of 31.2px, so text at these sizes is a little taller: a 10-line code block grows by 5px. On a half-pixel line every box of text ended on a half pixel, and an expander easing to that height dropped a pixel when it landed. The ratios in `--text-*--line-height` are now exact (`calc(16 / 11)` instead of 1.455), so `text-2xs` and `text-body-lg` land on 16px and 22px instead of 16.005px and 21.994px. This departs from the Figma kit's 13/19.5. Switch's label and description, and an Input group's add-ons, now set their own 20px and 21px lines.
