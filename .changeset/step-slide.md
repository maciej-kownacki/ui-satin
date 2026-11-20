---
'@uisatin/ui': patch
---

Decision card's step slide (the old and new question side by side on one track, the box easing to the new height, 360 ms) is now a shared piece, `step-slide`, so Satin Pro's Command pages moves between its pages the same way; Decision card moves exactly as before. CommandMenu puts its list (or `children`) in a box of its own (`data-slot="command-menu-body"`), which the step slide moves the list in.
