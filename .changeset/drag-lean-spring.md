---
'@uisatin/pro': minor
---

Agent plan and Kanban board: a card dragged with the pointer leans 1° to the left while it's carried (to the right in RTL) and, let go, springs into its place over 200 ms on Free's new `--ease-spring` (about 3% past and back, transform only). Both share one class, `satin-drag` (drag.css), with `data-drag="lifted"` / `"settle"`. Keyboard moves (Alt+↑/↓, Kanban's Space pick-up) stay instant and don't lean; under reduced motion nothing leans or springs.
