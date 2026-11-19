---
"@uisatin/ui": patch
---

A switch in Segmented control (and Tabs, Pagination) reads as one motion:
- the sliding pill starts softer, `cubic-bezier(0.32, 0.72, 0, 1)` over the same 300 ms, instead of covering half the way in two frames and then creeping;
- CodeBlock dissolves new lines in when its view or code changes, instead of cutting to them.
