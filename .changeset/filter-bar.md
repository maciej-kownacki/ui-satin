---
'@uisatin/pro': minor
---

Filter bar (`@uisatin/pro/filter-bar`): filters as chips that read as sentences ("Stage is Interview", "Value > €20,000", "Close date this quarter"). `+ Filter` adds a chip with its editor open; each chip opens its editor in a Popover: the operator over a value control fitted to the field type (enum, multi, text, number, date, person). The editor is one surface: choices are listed in it and the operator opens its list in place, so no menu opens over another. The value is plain JSON; `applyFilters(rows, value, fields)` filters rows for a List, Table or DataGrid. Live result count with rolling digits, saved views and Save view, "+N more" past `maxVisible`, Backspace on an empty search removes the last chip. Words (`filter*`) translate through SatinLabels.
