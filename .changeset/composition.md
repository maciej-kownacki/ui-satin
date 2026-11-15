---
"@uisatin/ui": minor
---

Parts next to the props API, for layouts the props don't cover:

- Dialog: `DialogRoot`, `DialogTrigger`, `DialogContent` (with `variant`, `closeButton`, `container`), `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody` and `DialogFooter` (with `start`). `Dialog` is now built from them, so both look and behave the same.
- SegmentedControl: write the segments as `SegmentedControlSegment` children instead of `items`, when one needs more than a label and an icon.
- Table: `renderCell` wraps or replaces every body cell's content (a link to the row), `renderRow` draws each row (`<tr {...rowProps}>{children}</tr>` with your own handler or attribute).

SearchBar takes `ref` as a plain prop like every other component (it was the last `forwardRef`).
