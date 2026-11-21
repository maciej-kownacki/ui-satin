# Motion

Satin supports a few motion rules and nothing else. They follow Emil Kowalski's approach to interface animation:
motion should make an interface feel responsive, never make anyone wait for it.
The tokens live in `src/styles/motion.css`.

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Everything the user triggers: press, open, select, enter |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Something already on screen moving to a new place |
| `--duration-fast` | 150 ms | Hover, press, colour changes |
| `--duration-base` | 200 ms | Toggles, a section opening, a code block swapping its content |
| `--duration-slow` | 250 ms | Sheets, popovers; the upper limit for anything else |
| `--duration-slower` | 300 ms | The dialog arriving, the one thing that takes the whole screen |

## The rules

1. **Animate transform and opacity.** They don't trigger layout, so they stay smooth. Colour and shadow transitions
   are fine for state changes. The one deliberate exception is the sliding pill (Segmented control, Tabs,
   Pagination), which animates `width` along with `transform` so its corners don't stretch. It runs 300 ms on its own
   gentler curve, `cubic-bezier(0.32, 0.72, 0, 1)`: on `--ease-out` it covered half the way in two frames and then
   crept, which read as a snap.
2. **Ease-out for anything the user starts.** It moves fast at first, so the interface answers the click at once.
   Never use ease-in for UI: it starts slowly and feels late.
3. **Stay under 250 ms.** Most transitions are 150–200 ms. Anything longer starts to feel like waiting. Three named
   exceptions. The dialog rises over 300 ms with its scrim, so a whole-screen change doesn't read as a cut. The step
   slide (`step-slide.tsx`: Decision card's questions, Satin Pro's Command pages): the old and new content cross on one
   track a whole frame wide while their box eases to the new height, 360 ms on `cubic-bezier(0.22, 1, 0.36, 1)`, since
   the content trades places across the full width rather than settling a few pixels. The changed highlight on a Kanban
   card (Satin Pro) fades in over 150 ms on `--ease-out`, holds about a second and fades out over 250 ms, opacity only:
   it marks something the agent or a teammate changed, found by the eye; nobody waits for it. Under reduced motion it
   doesn't show; the card's status and an announcement still say it.
4. **Pressing gives feedback.** Buttons scale to 0.97 while held (`active:scale-[0.97]`).
5. **Nothing grows from zero.** Elements that appear start from opacity 0 and a few pixels of offset (or scale 0.95),
   never from `scale(0)`. Collapsible content fades and settles in; its height is not animated, with two exceptions.
   A body that folds inside a bordered card (Tool call) grows its height on the sliding pill's
   gentler curve, in Accordion's times: the card's edge moves with it, and on `--ease-out` it
   dropped most of the way in two frames and then crept, which read as a cut. Its content fades
   right out (in over 250 ms, out in 150 ms, so the folding edge never cuts a visible icon), and
   the fade sits on the content, whose size never changes, not on the clip that grows: a layer
   that changes size every frame is rastered again every frame, and on the GPU its icons smeared. In the Activity
   timeline (Satin Pro) a run's entries and "Reverted by you" open and close in height, so the rows
   below glide instead of jumping: grid rows go 0fr ↔ 1fr over 300 ms on the sliding pill's curve,
   and the content fades in once the move has started.
6. **Leave frequent, keyboard-driven actions alone.** Anything people do hundreds of times a day (typing, arrow keys,
   shortcuts) gets no motion.
7. **Respect reduced motion.** `prefers-reduced-motion: reduce` turns transitions and animations off.
