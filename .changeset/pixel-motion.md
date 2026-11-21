---
'@uisatin/ui': patch
---

The step slide's motion (Decision card, Satin Pro's Command pages) now comes from a shared piece, `pixel-motion`. Its steps are counted on the device-pixel grid from the end value, so a box whose height rests between device pixels (fractional line heights and borders) gets there without a last hop.
