---
'@uisatin/ui': patch
---

Search bar and Command menu leave ⌘K alone when something on the page already handled it (`defaultPrevented`), so ⌘K in a rich text editor adds a link instead of jumping to search.
