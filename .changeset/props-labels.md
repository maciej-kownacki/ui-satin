---
"@uisatin/ui": minor
---

Every component now takes ordinary HTML attributes and a `ref` (`id`, `data-*`, `aria-*`, `style`, handlers): fields pass them to the control a label points at (Select's trigger, NumberInput's input), overlays to their panel (Dialog, Sheet, Popover, menus, Tooltip's bubble). Each component's docs comment says where they go. Tabs' extra props are now typed.

New `SatinLabels` (`@uisatin/ui/labels`): the words components say on their own (Close, Increase, Select all rows, Pick a date…) are English by default and can be translated or reworded for an app or part of it. A component's own prop still wins.

Table: a column's `key` must be a field of the row unless the column renders its own `cell`, so a typo is a type error; rows no longer need an index signature. Internal helpers still exported from the root (`CloseIcon`, `menuItemClass`, `FieldChrome`…) are marked `@internal`.
