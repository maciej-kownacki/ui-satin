---
"@uisatin/ui": patch
---

Fixes found while writing the accessibility notes:

- Input passes a `ref` on to the input and keeps its own, so a form library's `register()` no longer stops a click on the field's padding from focusing it.
- A Chip with `onRemove` keeps the `id`, `aria-*`, `data-*` and handlers you pass; they go on the chip's `span`.
- After a submit, Form also focuses the first control of an invalid FieldGroup.
- SearchBar has an accessible name of its own ("Search", `searchField` in SatinLabels) when the app gives none.
- AgentLoading's `time` is no longer read out on every tick; screen readers hear the label.
- The Sources pill's "3 sources" comes from SatinLabels (`sourcesCount`).
