---
'@uisatin/ui': minor
---

CommandMenu: slots for a menu that changes what it shows. `query` / `onQueryChange` control the search (it is now emptied as the menu closes rather than as it opens, so a query set while closed is the one it opens with); an item with `keepOpen` runs without closing the menu; `header` goes above the search row, `children` take the list's place (the search then stops pointing at a list) and `footer` replaces the key hints. The highlight goes back to the first row whenever the rows change, not only when the query does, so a new set of rows never opens with a stale highlight. Satin Pro's CommandPages is built on these.
