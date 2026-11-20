---
'@uisatin/pro': minor
---

ScopedSearch (`@uisatin/pro/search-scoped`): one search box over several kinds of record or places, with a scope chip in the field ("Everywhere ▾", "Candidates ▾", "This project ▾") that says where it looks. `scopes` are data: `groups` keeps some kinds of record, `fields` keeps the rows of one place, the first is the default. Pressing the chip or typing `in:` lists the scopes with how many results each holds for the query, and a scope that finds nothing offers the ones that do. `filters` narrow inside the scope as typed `key:value` chips (`stage:interview`). Recent searches, results grouped with counts, Backspace removes the chips and then the scope, ⌘K focuses it, Escape closes the list. `parseScopedQuery`, `formatScopedQuery` and `filterScopedGroups` read, write and filter a query `{ scope, tokens, text }` for a server search.
