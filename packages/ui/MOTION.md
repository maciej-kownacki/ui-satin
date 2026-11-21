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
   are fine for state changes. A layout property (height, width, max-height, top and left, margin, padding, grid
   tracks) moves only through `pixel-motion.tsx` (`easeSize`, `pixelKeyframes`) or one of the exceptions below.
   pixel-motion measures unrounded, holds every step on the device-pixel grid counted from the end value, starts and
   ends on the exact layout values and holds the content at its size while the box moves, so nothing is resampled on
   the way or snaps at the end. Never ease between `offsetHeight`, `offsetWidth` or `offsetLeft` values: they round
   to whole pixels, so the content snaps the rest of the way when the animation ends. `npm run check:motion` fails on
   anything else. The exceptions, each for a reason:
   - The sliding pill (Segmented control, Tabs, Pagination) animates `width` along with `transform`, and Avatar
     group's tooltip its bubble's width, so their corners don't stretch. The pill runs 300 ms on its own gentler
     curve, `cubic-bezier(0.32, 0.72, 0, 1)`: on `--ease-out` it covered half the way in two frames and then crept,
     which read as a snap.
   - `.satin-expand` and the Accordion, the CSS expanders: the browser lays out the height (grid rows 0fr to 1fr,
     Radix's measured height) and the content inside doesn't move. They stay on CSS because a script version changes
     what is mounted when (`forceMount`), content that streams in while it's open, and groups inside groups.
   - Toast and Notification stacks: a card's height eases between its own and the one in front as the stack opens
     and closes, and the toast viewport follows the stack; a scale would stretch text and corners. The heights come
     from computed style, unrounded, since the cards behind are scaled.
   - The Activity timeline's fold (Satin Pro): grid rows, so the rows below glide (rule 5).
   - Agent presence (Satin Pro): the layer's width and height glide with its transform to the next target, since an
     edge can't be scaled without stretching its line and corners. Not yet on the pixel grid; to revisit.
2. **Ease-out for anything the user starts.** It moves fast at first, so the interface answers the click at once.
   Never use ease-in for UI: it starts slowly and feels late.
3. **Stay under 250 ms.** Most transitions are 150–200 ms. Anything longer starts to feel like waiting. Three named
   exceptions. The dialog rises over 300 ms with its scrim, so a whole-screen change doesn't read as a cut. The step
   slide (`step-slide.tsx`: Decision card's questions, Satin Pro's Command pages): the old and new content cross on one
   track a whole frame wide while their box eases to the new height, 360 ms on `cubic-bezier(0.22, 1, 0.36, 1)`, since
   the content trades places across the full width rather than settling a few pixels. It moves in whole device pixels
   (keyframes held at each one, from and to exact layout values) and holds the moving parts at their measured size, so
   only the box's height is laid out on the way and no icon is resampled or snaps when it lands. The changed highlight on a Kanban
   card (Satin Pro) fades in over 150 ms on `--ease-out`, holds about a second and fades out over 250 ms, opacity only:
   it marks something the agent or a teammate changed, found by the eye; nobody waits for it. Under reduced motion it
   doesn't show; the card's status and an announcement still say it.
4. **Pressing gives feedback.** Buttons scale to 0.97 while held (`active:scale-[0.97]`).
5. **Nothing grows from zero.** Elements that appear start from opacity 0 and a few pixels of offset (or scale 0.95),
   never from `scale(0)`. Collapsible content fades and settles in; where its height moves, it moves through rule
   1's expanders, and two of them take their own curve. A body that folds inside a bordered card (Tool call)
   grows its height on the sliding pill's
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
