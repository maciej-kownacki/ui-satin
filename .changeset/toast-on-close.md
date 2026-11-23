---
'@uisatin/ui': minor
---

Toast: `onClose(reason)` on toast() options is called once, as the toast starts to leave, with why: `'action'` (its action button), `'close'` (the close button, Escape, a swipe, `toast.dismiss`, or a new toast shown under the same `id`, which replaces it) or `'expire'` (its time ran out, pauses included). It's the way to commit something when an Undo window ends without a timer of your own that would drift from the toast's: hide the item at once, delete it for real unless the reason is `'action'`. With no `<Toaster />` mounted, toast() warns and calls `onClose('expire')` on the next microtask, after the caller's own state is set. New type `ToastCloseReason`.
