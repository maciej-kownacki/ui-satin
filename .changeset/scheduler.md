---
'@uisatin/pro': minor
---

Scheduler (`@uisatin/pro/scheduler`): day, week and month views of events over time slots, in a given `timeZone` (DST-safe, with `zonedDate()` / `zonedParts()` for the app). Drag an event to move it (it settles into its slot with --ease-out) or its bottom edge to change the end; Alt and the arrow keys do the same from the keyboard. Overlapping events sit side by side; an all-day row, a now line, free and busy slots (`availability`), working hours and read-only events. Picking slots calls `onSlotSelect`; `eventPopover` and `slotPopover` fill a popover. The week starts where `dateLocale` says, and every date and time is written in it. Its words (`scheduler*`) are translated with SatinLabels.
