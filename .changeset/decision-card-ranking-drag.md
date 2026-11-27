---
'@uisatin/ui': patch
'@uisatin/pro': patch
---

Decision card: the `ranking` rows drag the way Satin Pro's Kanban cards and Agent plan steps do. A press becomes a drag after 4px (on touch, after a 250 ms hold, so a swipe still scrolls). The row lifts (scale 1.02, the lift shadow, a 1° lean, mirrored in RTL) and follows the pointer; a dashed gap opens where it would land, the other rows shift on `--ease-in-out`, and the rank dots follow. `onValueChange` is called once, on drop, not on every row crossed, and the row springs into place on `--ease-spring`. Escape puts it back with no change. Alt+↑/↓ and the announcements are unchanged; under reduced motion nothing leans, shifts or springs. `drag.css` (`satin-drag`, `data-drag`) moves from Satin Pro into Free's stylesheet, so Pro now gets it from `@uisatin/ui/styles.css`; its rules are unchanged.
