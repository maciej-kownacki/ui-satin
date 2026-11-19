---
'@uisatin/pro': minor
---

Availability calendar (`@uisatin/pro/date-availability`): `AvailabilityCalendar` and `AvailabilityDatePicker` show each day's free slots from `availability` (keyed by ISO date) with a green dot (a ring at `fewSlots` or fewer) and a tooltip ("3 slots"), said in the day's name too. Full days fade and can't be picked but stay reachable with the arrow keys, their reason ("Fully booked", or the app's `reason`) in the tooltip and the name. `useAvailability()` gives the `isDisabled` and `renderDay` for any Calendar or picker. Words: `availabilitySlots`, `availabilityFreeSlots`, `availabilityFull`, `availabilityDay`.
