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
   are fine for state changes. A layout property (height, width, max-height, top and left, margin, padding, gap,
   line height, font size, border widths, grid tracks) moves only through `pixel-motion.tsx` (`easeSize`,
   `pixelKeyframes`) or one of the exceptions below. pixel-motion measures layout sizes unrounded and unscaled, holds
   every step on the device-pixel grid counted from the end value, and starts and ends on the exact layout values, so
   the box isn't resampled on the way and doesn't snap at the end. Line heights are whole pixels (13px text on a 20px
   line), so content heights end on whole pixels and a box easing to them doesn't hop at the end. Only with `freeze`
   does it also hold the content at its size while the box moves; without it the content is laid out again at every
   step. Never ease between `offsetHeight`, `offsetWidth` or `offsetLeft` values: they round to whole pixels, so the
   content snaps the rest of the way when the animation ends. The one place Satin moves something from them is the
   sliding pill's fallback: while its list is scaled (a dialog zooming in) or the selected item is moved inside it
   (Pagination's strip), rects count the transform and offsets are the only measure that doesn't, so for as long as
   the transform lasts the pill lands on whole CSS pixels. `npm run check:motion` fails on anything else; each
   exception carries a `motion-allow: <reason>` comment where it happens. The exceptions, each for a reason:
   - The sliding pill (Segmented control, Tabs, Pagination) animates `width` along with `transform`, and Avatar
     group's tooltip its bubble's width, so their corners don't stretch. The pill runs 300 ms on its own gentler
     curve, `cubic-bezier(0.32, 0.72, 0, 1)`: on `--ease-out` it covered half the way in two frames and then crept,
     which read as a snap.
   - The CSS expanders: `.satin-expand`, the Accordion and the Activity timeline's fold (Satin Pro). The browser lays
     out the height (grid rows 0fr to 1fr, Radix's measured height) and the content inside doesn't move. They stay on
     CSS because a script version changes what is mounted when (`forceMount`), content that streams in while it's
     open, and groups inside groups. Two of them take their own curve (rule 5).
   - Toast and Notification stacks: a card's height eases between its own and the one in front as the stack opens
     and closes, and the toast viewport follows the stack; a scale would stretch text and corners. The heights come
     from computed style, unrounded, since the cards behind are scaled.
   - Agent presence (Satin Pro): the layer's width and height glide with its transform to the next target, since an
     edge can't be scaled without stretching its line and corners. Not yet on the pixel grid; to revisit.
2. **Ease-out for anything the user starts.** It moves fast at first, so the interface answers the click at once.
   Never use ease-in for UI: it starts slowly and feels late.
   The one exception follows the pointer rather than a click: the chart tooltip's glide (`useGlide` in `chart.tsx`).
   As the pointer moves across a Line, Area, Bar or Channel chart (and Satin Pro's Stat card sparkline), the tooltip,
   with the dot and the drop line where there are any, chases the hovered point on a critically damped spring that
   looks settled in about 200 ms (stiffness ≈ 685, damping ≈ 52, no bounce) and snaps exactly onto the point at
   rest. A spring, not a curve, because the target moves while it travels: it keeps its speed and catches up
   smoothly when the pointer moves fast, where a restarted ease-out would jerk. Transform only, written per frame,
   no React render. It jumps when it first appears, on the keyboard (rule 6) and under reduced motion (rule 7); the
   x label and the live text change at once.
3. **Stay under 250 ms.** Most transitions are 150–200 ms. Anything longer starts to feel like waiting. The longer
   ones, all of them:
   - The dialog rises over 300 ms (`--duration-slower`) with its scrim, so a whole-screen change doesn't read as a cut.
   - The sliding pill (rule 1) and the Activity timeline's fold (rule 5): 300 ms on the pill's gentler curve.
     Pagination's strip of pages moves with the pill, so it takes the same 300 ms, on `--ease-out`.
   - Progress: the bar slides to a new value over 300 ms on `--ease-out`. It follows work, not a click; nobody waits
     for it.
   - The step slide (`step-slide.tsx`: Decision card's questions, Satin Pro's Command pages): the old and new content
     cross on one track a whole frame wide while their box eases to the new height, 360 ms on
     `cubic-bezier(0.22, 1, 0.36, 1)`, since the content trades places across the full width rather than settling a
     few pixels. It moves in whole device pixels (keyframes held at each one, from and to exact layout values) and
     holds the moving parts at their measured size, so only the box's height is laid out on the way and no icon is
     resampled or snaps when it lands.
   - Toast and Notification stacks: whole cards move over 500 ms on `--ease-out` as they come, go and re-stack, and
     the toast viewport's height follows. A card travels its own height or more; `--ease-out` covers more than four
     fifths of it in the first 150 ms, so the stack answers at once and the rest only settles it.
   - Decision card's count rolls its changed digits over 350 ms, an odometer turning one line (transform only).
   - The changed highlight on a Kanban card (Satin Pro) fades in over 150 ms on `--ease-out`, holds about a second
     and fades out over 250 ms, opacity only: it marks something the agent or a teammate changed, found by the eye;
     nobody waits for it. Under reduced motion it doesn't show; the card's status and an announcement still say it.

   Loops that show something is going on (Spinner, the shimmer, Skeleton, Progress without a value, Prompt bar's
   recording wave, the dotted arrow in CSV import's drop zone in Satin Pro, opacity and colour only) aren't transitions and keep their own pace.
4. **Pressing gives feedback.** Buttons scale to 0.97 while held (`active:scale-[0.97]`).
5. **Nothing grows from zero.** Elements that appear start from opacity 0 and a few pixels of offset (or scale 0.95),
   never from `scale(0)`. Collapsible content fades and settles in; where its height moves, it moves through rule
   1's CSS expanders, and two of them take their own curve. A body that folds inside a bordered card (Tool call)
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
