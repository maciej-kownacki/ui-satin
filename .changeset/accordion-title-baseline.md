---
'@uisatin/ui': patch
---

Accordion: the title of the section below an opening one no longer drops a pixel when the section finishes opening. The title's line is 20px instead of 21px, which puts its baseline on a whole pixel in the 40px row; Chrome draws text on whole pixels, rounding half up, so the old half-pixel baseline drew a pixel high while the height eased in. At rest the title draws in the same place.
