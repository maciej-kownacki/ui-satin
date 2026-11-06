# Tokens

The source of truth is `tokens.json` (W3C design tokens: `$type`/`$value`, aliases as `{path}`).
`node tokens/build.mjs` (or `npm run tokens`) regenerates `packages/ui/src/styles/theme.css`, which is shadcn v4 / Tailwind v4.
Figma file: uiKit (`7uWrShjeFJHi2hMhIjoZ03`), written through the Figma MCP (`use_figma`, Plugin API).

Modes: theme tokens hold Light in `$value` and Dark in `$extensions["com.satin"].modes.Dark`.
Each token's Figma scopes and CSS variable name are also stored in `$extensions["com.satin"]`.

## Figma

| Collection | Modes | Vars | Notes |
|---|---|---|---|
| primitives | Value | 166 | hiddenFromPublishing, no scopes (never in pickers) |
| theme | Light, Dark | 91 | the semantic layer below (82 here + 9 `code/*` that live only in Figma); aliases to primitives only |
| tone | Neutral … Plum (8) | 3 | `tone/bg`, `tone/border`, `tone/fg`, each aliasing `status/{tone}/*` |
| radius | Value | 9 | radius-lg aliases radius |
| spacing | Value | 21 | spacing/* (GAP), size/* (WIDTH_HEIGHT) |
| typography | Value | 19 | font family (string), weight, size, line height |

Styles: text styles (`text/*`), with family, size, line height and weight bound to variables.
Effect styles `shadow/*`. Documentation is on the `Tokens` page.
Code syntax (WEB) is set on every semantic variable and equals its path with `-`: `bg/card` → `var(--bg-card)`.
Spacing uses `calc(var(--spacing) * n)`.

## Semantic layer

Full rationale and the old → new map: `SEMANTIC.md`. Names read `{role}/{variant}/{state}`; components bind only
these, never primitives. One value has one name (the shadcn `*-foreground` copies and `sidebar/*` were merged).

| Role | Tokens |
|---|---|
| `bg/` | `canvas`, `card`, `field`, `popover`, `muted`, `hover`, `selected`, `card-fade` |
| `text/` | `default`, `muted`, `subtle`, `placeholder`, `on-solid`, `on-inverse` |
| `border/` | `default`, `subtle`, `strong`, `input`, `focus` |
| `action/` | `primary/{bg,bg-hover,bg-pressed,border,glow,shadow}`, `secondary/{bg,bg-hover,bg-pressed}`, `destructive/{bg,bg-hover,bg-pressed}`, `inverse/{bg,bg-hover,bg-pressed,border,glow}`, `focus-ring` |
| `status/` | `{neutral,brand,sky,green,amber,red,fuchsia,plum}/{bg,border,fg}` |
| `effect/` | `shadow-ambient`, `shadow-xs|sm|md|lg`, `highlight-top` |
| `chart/` | `1`–`5` |
| `component/` | `table/{zebra,header}`, `segmented/{selected,pressed}`, `rail/{center,edge}`, `highlight/{hover,surface}-{from,to}` |

In Tailwind every colour token is a utility under `--color-*`, so classes repeat the role: `bg-bg-card`,
`text-text-muted`, `border-border-subtle`, `ring-action-focus-ring`. `effect/*` is left out of the utilities (it only feeds shadows).

Deviations from Tailwind:
- Radius uses explicit values, not calc. shadcn's derivation would make xl = 14; **12 is deliberate**. 2xl (16) and full (9999) are added.
- Tailwind scale is overridden: text-sm 13, text-base 14, text-lg 16 (Tailwind: 14/16/18), and `--tracking-tight` = -0.015em (Tailwind: -0.025em).
- Primitives are hex and override Tailwind's oklch zinc/teal/red/cyan/sky/indigo/violet steps that are defined here.

## Notes per token

Highlights (getting started): `component/highlight/hover-from|to` (Light teal-50@20 → teal-200@55, Dark teal-950@20 →
teal-500@55) and `component/highlight/surface-from|to` (teal-50@20 → teal-50 / teal-950@20 → teal-950). Figma binds each
gradient stop to one of them; the alpha lives in the primitive (`teal-*-a20`, `teal-*-a55`).
Thinking rail: `component/rail/edge|center`, a vertical line gradient (edge → center → edge). Light border-subtle-light at 25% → 100%,
Dark white-a3 → white-a10 (white-a6 vanishes on a 1px line). In CSS: `linear-gradient(var(--component-rail-edge), var(--component-rail-center), var(--component-rail-edge))`.
Secondary button: `action/secondary/bg-hover|bg-pressed` (Light zinc-100 / zinc-200, Dark #2B2B2D / #343436,
white-a8 / a12 flattened onto card). In Dark each state is lighter than the last and pressed keeps its border-strong outline.
Toggle `state=selected` uses `action/secondary/bg-pressed`, one step darker than its hover (`bg/muted`).
Surfaces, darkest to lightest (Dark, even OKLCH L steps of ~0.035): `bg/canvas` zinc-950 #09090B (whole view, sidebar) → `bg/card` #121215
(content wrapper, cards) → `bg/field` #1A1A1D (inputs: input, select trigger, checkbox, radio, prompt bar) → `bg/popover` #222225
(secondary button, chip, toggle, dropdown menu, dialog, attachment file, banners). Hover fills (`bg/muted`/`bg/hover` #27272A, secondary bg-hover #2B2B2D,
bg-pressed #343436) all sit above popover. Light: zinc-50 → white for the other three; shadows carry the elevation there.
Selected: `bg/selected` (zinc-200 / #343436) for the active dropdown item, the active pill tab and the selected segment
(`component/segmented/selected` aliases it); `component/segmented/pressed` is black-a5 / white-a6.
Table: `component/table/header` (zinc-50 / card-dark, so in Dark the header matches the rows), `component/table/zebra` (zinc-50 / field) for every second row, `bg/card-fade` (white-a0 / card-dark-a0) as the clear end of the
overflow fade (`linear-gradient(to right, var(--bg-card-fade), var(--bg-card))`) on a horizontally scrolling table or filter row.
Inverse button: `action/inverse/bg` aliases `text/default`, its label is `text/on-inverse` (aliases `bg/canvas`).

Text levels: `text/default` (primary) → `text/muted` (secondary) → `text/subtle` (tertiary,
zinc-400 / zinc-500). Tertiary is 2.5:1 on white in Light, so use it only for non-essential meta
(timestamps, counters, hints), never for body text or labels.
Placeholders use `text/placeholder` (zinc-300 / zinc-600), one step lighter again
(1.5:1 in Light, 2.6:1 in Dark). In code: `placeholder:text-text-placeholder`.
Tones (badge, avatar, chip, toast): theme `status/{neutral,brand,sky,green,amber,red,fuchsia,plum}/{bg,border,fg}`
(calm `soft-*` steps per hue: same hue as the ramp, lower OKLCH chroma — Light soft-50 / soft-200 / soft-700, Dark soft-950 / soft-900 / soft-300;
text on its tone 5.5–6:1 Light, ~9.5:1 Dark; neutral stays zinc; brand = blue, like primary; plum = pink), and a `tone` collection with one mode per tone
aliasing them as `tone/bg`, `tone/border`, `tone/fg`. Components set the tone mode per Color variant;
in CSS the same works through `data-tone="sky"` on any element.
Radius: `radius-xs` 4 for 16px avatars; `radius-3xl` 20 for rounded trays once their content wraps onto a second line (attachmentGroup).
Primitives: blue 50/200/300/500/600/700/900/950 for primary and the brand tone, all derived from **#4633D7** (blue-600) in OKLCH, one hue (277°, blue-violet; the ramp keeps the name `blue`): tints 50–300 keep Tailwind-like lightness, 500 is +0.05 L (hover), 700 −0.06 L (pressed), 900/950 sit below it (Light: 600 primary, 500 hover, 700 pressed, focus blue-600-a20). #4633D7 is already L 0.47, so Dark only nudges it: primary-dark #493DD6 (L 0.48, white text 7.2:1), primary-hover-dark #554FE7 (also ring), primary-pressed-dark #3E2AC5. The brand tone's soft-* steps follow the same hue. Dark brand tone is 900 / 500 / 300 (bg / border / text), since 950 and 900 sit too close to the Dark card; primary-focus-dark (primary-dark at 20%); sky, green, amber, fuchsia, pink steps 50/200/300/700/900/950 for tones; border-subtle-light, border-subtle-dark, border-dark, border-strong-dark, primary-border-light|dark, white-a6/10/16, black-a5..a36, transparent.
Sizes: control-height-xs, control-height, control-height-lg (32), control-height-xl (36), menu-row, toast-height, icon-size-sm, icon-size.
Button `Size` variants map to these: xs 24, default 28, lg 32, xl 36.
These become Tailwind utilities through `--spacing-*` (e.g. `h-control-height`).
Spacing `0` is also added.

## Chart

chart/1 teal-600/400, chart/2 cyan-500/400, chart/3 sky-600/400, chart/4 indigo-500/400,
chart/5 violet-500/400 (Light/Dark). This is a cool ramp that moves away from teal.
New primitives: cyan, sky, indigo, violet (two steps each).

## What Figma can't do, and how it's handled

- **Letter spacing -1.5%**: Figma number variables are px only, so a percent can't be bound.
  It is set as PERCENT directly on every text style, and `--tracking-tight` exists in CSS only.
- **Tabular numbers**: the Plugin API can't set OpenType features on text styles.
  Turn on `tnum` manually on counters (Type details → Numbers → Tabular).
- **Shadows per mode**: there is no need for separate Light and Dark styles. Shadow colors are `theme` variables
  (Dark is about 2× black), and every style carries an inner shadow 0 1 0 0 bound to `effect/highlight-top`,
  which is transparent in Light. One style resolves correctly in both modes.
- **Names**: Figma and W3C disallow `.` in names, so `spacing/0-5` = Tailwind `0.5`.
- **Line heights** are px variables in Figma (150% of the size, 130% for 2xl). CSS uses unitless ratios.

## Rules (also on the Tokens page)

- Borders: always 1px, low contrast. `border/default` for card and input outlines, `border/subtle` for internal dividers,
  `border/strong` for hover and secondary buttons. Selected = subtle fill or border-strong, never a thicker border.
- Border colours are always opaque, never an alpha primitive. Dark borders are the old white-a6/a10/a16 flattened
  onto `card` (zinc-900): `border-subtle-dark`, `border-dark`, `border-strong-dark`; `primary-border-light|dark`
  is white-a40 flattened onto `primary`. A border that needs a new shade gets a new opaque primitive.
- Focus: a 2px spread shadow (0 0 0 2) in `action/focus-ring` = primary at 20% in both modes, no offset gap. Primary and Destructive buttons use `shadow/primary-focus` /
  `shadow/destructive-focus`, which stack the same spread under their own shadow, because a layer holds one effect style.
  Spread only renders on clipping frames, so focus variants have clip content on. In code: `ring-2 ring-action-focus-ring`
  (the base `:focus-visible` rule), or `shadow-border-focus`.
- Paddings: button 0 × 10–12, card 16–20, menu inset 4.
- Icons: Iconoir, 16px at stroke 1.5, compact 14px at ~1.1, currentColor, round caps and joins.
