---
'@uisatin/ui': patch
---

Motion fixes. The sliding pill of Tabs, Segmented control and Pagination stays under its item in a list that scrolls sideways, and no longer falls back to whole-pixel placement just because of where the control sits on the page. The step slide (Decision card, Satin Pro's Command pages) measures layout sizes, so a step taken while a dialog zooms in lands without a snap, and a height easing that something else cancels lets go of its clip. Under reduced motion, an expanding group (`satin-expand`) that folds hides its content at once instead of 200 ms later.
