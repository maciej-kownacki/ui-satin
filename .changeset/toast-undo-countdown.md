---
'@uisatin/ui': minor
---

Toast: `countdown` on toast() options draws a 2px bar along the bottom that drains over `duration`, so people see how long Undo stays. It pauses and goes on with the timer while the toasts are hovered or focused (or the window is in the background), keeps the card's size, is `aria-hidden` and is hidden under reduced motion. Toasts from toast() now keep their own time instead of Radix's, so updating one to `duration: Infinity` stops it for good.
