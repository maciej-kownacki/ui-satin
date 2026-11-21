---
'@uisatin/ui': patch
---

Things that move now measure where layout really puts them, not the rounded value. The sliding pill of Tabs, Segmented control and Pagination lands on the device pixel nearest the selected item instead of the nearest CSS pixel, and on a Segmented control with `border` it no longer starts a pixel off. Pagination's scrolling strip, the Toast and Notification stacks and Avatar group's tooltip measure unrounded too. Progress moves its bar with a transform instead of its width, so nothing is laid out on the way; at rest it looks as before, except while the done part is narrower than the track is tall.
