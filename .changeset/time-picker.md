---
'@uisatin/ui': minor
---

Time picker (`@uisatin/ui/time-picker`): `TimePicker` reads a typed time ("930", "9:30pm", "1430", the locale's AM/PM words) or picks one from a list every `step` minutes, with `min`, `max` and `isTimeDisabled` dimming what can't be picked; its value is `{ hours, minutes }`. `DateTimePicker` opens the Calendar with a column of times beside it. `TimeList` and `DateTimePickerPanel` are the list and the panel on their own; `parseTime` and `formatTime` are exported. 12 or 24 hours follow the `dateLocale` label unless `format` says otherwise. New words in SatinLabels: `time`, `showTimes`, `pickDateTime`, `timeHint`, `timeInvalid`, `timeUnavailable`.
