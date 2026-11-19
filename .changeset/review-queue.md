---
'@uisatin/pro': minor
---

Review queue (`@uisatin/pro/review-queue`): agent drafts gone through one at a time, Approve, Edit or Skip. Its place ("4 of 12") sits over a bar that fills as items are decided; the next item slides 8px in. J and K move, A, E and S act, but not while typing in a field; the place is read out as it changes. Edit opens the item's fields in a Sheet and brings you back to the same item. At the end, a summary lists them one under another (`itemMedia` puts an Avatar beside each name), with a SegmentedControl between Approved and Skipped, and Review skipped to go round again. Parts (`ReviewQueueRoot`, `ReviewQueueHeader`, `ReviewQueueItem`, `ReviewQueueActions`, `ReviewQueueSummary`, `useReviewQueue`) for a layout of your own; its words (`review*`) are translated with SatinLabels.
