---
'@uisatin/ui': minor
---

DatePicker, DateRangePicker and their panels take `presets`: a listbox of shortcuts before the calendar, at its side where both fit and above it where they don't (in a popover, the room beside the trigger decides). `datePresets` holds `today`, `tomorrow`, `nextWeek`, `last7Days`, `last30Days` and `thisQuarter`, worded through new SatinLabels keys (`presets`, `presetToday`…). Picking a preset moves the calendar to its month; a range still waits for Apply.

The week now starts on the `dateLocale` label's first day (Sunday in en-US, Monday in pl-PL), for the calendar and for Next week; `weekStartsOn` pins it (`weekStartsOn={1}` keeps Monday). After the month arrows turn the month, a day in view stays reachable with Tab.
