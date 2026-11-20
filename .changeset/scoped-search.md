---
'@uisatin/pro': minor
---

ScopedSearch (`@uisatin/pro/search-scoped`): search across kinds of record with filters typed into the query. `stage:interview react` turns into a "Stage: Interview" chip and the word "react"; the list shows recent searches and the scopes before anything is typed, a scope's values after `stage:`, then the results grouped with their counts. Backspace at the start of the query removes the last chip, ⌘K focuses it, Escape closes the list. `parseScopedQuery`, `formatScopedQuery` and `filterScopedGroups` read, write and filter a query for a server search.
