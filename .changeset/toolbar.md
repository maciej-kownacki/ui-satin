---
'@uisatin/ui': minor
---

Toolbar (`@uisatin/ui/toolbar`): a row of controls that is one tab stop, on the Radix toolbar. Tab enters it once and leaves it; the arrow keys move between its items and wrap, Home and End jump to the ends, and right to left the arrows flip (the direction is read from the page). `ToolbarButton` is a tertiary Button and `ToolbarToggle` a ghost Toggle that stays pressed (`aria-pressed`, controlled or not), both at the toolbar's `size` (sm 28, md 32); with an `icon` and no children they are icon-only, named by `label`, which a tooltip shows with `shortcut` as keys. `ToolbarSeparator` is a rule between sets. `variant="floating"` puts the toolbar on the menu surface, for a bubble bar that `Floating` places over a text selection, and `preventFocusOnPress` keeps a press on an item from taking focus, so an editor keeps its selection. Name it with `aria-label`.
