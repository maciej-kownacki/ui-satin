---
'@uisatin/ui': minor
---

Charts: the tooltip glides after the pointer. In Line, Area, Bar and Channel charts, moving across the points (or bars, or segments) no longer jumps the tooltip from one to the next: it chases the hovered point on a critically damped spring that settles in about 200 ms, with the Line chart's dot and drop line, and catches up smoothly when the pointer moves fast. Transform only; it jumps on the keyboard and under reduced motion, and the x label and the live text change at once. For custom charts: `useGlide(point, { measure, apply, immediate })`, `glideTransform` and `glideAnchor` from `@uisatin/ui/chart`, `ChartTooltip`'s `updateRef`, and `Floating`'s `updateRef`, which moves the layer within the frame for an anchor moved by a transform.
