---
'@uisatin/ui': minor
---

Combobox: `creatable` ends the list with a `Create "…"` row while the query matches no option exactly, and `onCreate` makes the option (or a promise of it), which is then picked. The row shows a Spinner while it waits and says so under it if it fails. New labels `createOption` and `createFailed`.
