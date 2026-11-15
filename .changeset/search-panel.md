---
"@uisatin/ui": minor
---

SearchBar has a `panel` variant: search with its results in place, for a settings page or anything that searches its own items. A 56px search row over the results on a sheet of their own and a footer of key hints, with `meta` on the right ("59 settings indexed"). Give it `groups` (the same shape as CommandMenu's); before anything is typed it shows `idleText`, then the matches, which the arrows move through and Enter opens, with focus staying in the field. CommandMenu and the panel share one search and list underneath.
