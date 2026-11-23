---
'@uisatin/pro': patch
---

Activity timeline: `ActivityTimelineTime` is now Free's RelativeTime (`@uisatin/ui/relative-time`) with its own `data-slot="activity-timeline-time"`, and the day names read the same clock (`useRelativeClock`), so a timeline and any RelativeTime around it tick on one clock instead of two. Its props, text and markup are unchanged; the copy of the clock and the formatters is gone from the Pro file.
