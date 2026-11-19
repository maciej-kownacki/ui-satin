---
'@uisatin/ui': minor
---

Calendar: `isDisabled(date)` rules out days besides `min`/`max` (weekends, booked days), and `renderDay(date, state)` draws each day: return the new `CalendarDay` part, the default day button, with your own children, `aria-label` or a Tooltip around it. `state` says whether the day is today, picked, in a range, disabled, from another month or holding the focus, and gives its full date. DatePicker, DateRangePicker and their panels pass both on to their Calendar. Days that can't be picked now have `aria-disabled` instead of `disabled`: they look the same (with the focus on one, its number is muted instead of faded, so the ring keeps its 3:1), but the arrow keys reach them and screen readers hear them as unavailable, instead of focus stalling on the day before. A DatePicker preset whose day `isDisabled` rules out is off, like the day.
