# @uisatin/ui

## 0.5.0

### Minor Changes

- f49c44d: The pill corner (`--radius-pill`: Button's `rounded` shape, chips, tabs, segmented controls, the sidebar's rows) now changes at every step of the theme's corner scale: square at 0, 6px at 0.5, 12px at Satin's default 1, and a full pill only at 1.5. It used to be a full pill from 1 up, so Default and Large looked the same on 32px controls. The base stylesheet follows: `--radius-pill` is 12px unless a theme sets Large corners.

## 0.4.0

### Minor Changes

- 51f930e: New components built from the ones Satin already has:

  - Buttons: `ButtonGroup` (attached or spaced, with `ButtonGroupSeparator`), `SplitButton`, `ActionButton` (arrow, spinner, checkmark in one slot), and `loading` on `Button`.
  - Forms: `Form` (one layout, errors by `name`, focus on the first invalid field, `onSubmitValues`), `FormSection`, `FormActions`, `FieldGroup`, `InputGroup` with `InputGroupAddon`, `PasswordInput`, `leadingText` / `trailingText` on `Input`, and `name` on `FormField`.
  - Choices: `SelectableRadio` and `SelectableCheckbox`, in `sm` and `md`.
  - Feedback and content: `Alert`, `Spinner`, `Separator`, `Link`, `List` with `Item`.

  Fixes: `cn` now knows Satin's theme names (`text-body`, `rounded-pill`, `h-control-height`…), so `text-body` is no longer dropped next to a text colour (Banner descriptions, StreamingText and table cells take the theme's body size again) and app classes replace them as they should. Checkbox and Radio texts dim inside a disabled fieldset.

## 0.3.0

### Minor Changes

- 0d40736: Satin now sits next to an app's own Tailwind or shadcn/ui theme without touching it. The stylesheet's classes carry Satin's prefix (`sa:flex`), its theme variables are `--sa-*` (`--sa-text-sm`, `--sa-color-blue-600`, `--sa-radius`, `--sa-chart-1`…), and Tailwind's reset and Satin's base rules apply only to Satin's elements, so the app's `text-sm`, `--spacing`, `--radius`, list styles and headings stay the app's in either import order. Tailwind classes passed in `className` still replace the Satin classes they conflict with.

  Breaking for custom CSS that read Satin's primitive variables: use `--sa-color-*` and `--sa-radius-*` instead of `--color-*` and `--radius-*` (semantic tokens like `--bg-card` and `--action-primary-bg` are unchanged). `themeCss()` writes the new names. The shadcn registry ships the same prefixed source. The empty source maps are gone from the package.

- 9a4b332: Every component now takes ordinary HTML attributes and a `ref` (`id`, `data-*`, `aria-*`, `style`, handlers): fields pass them to the control a label points at (Select's trigger, NumberInput's input), overlays to their panel (Dialog, Sheet, Popover, menus, Tooltip's bubble). Each component's docs comment says where they go. Tabs' extra props are now typed.

  New `SatinLabels` (`@uisatin/ui/labels`): the words components say on their own (Close, Increase, Select all rows, Pick a date…) are English by default and can be translated or reworded for an app or part of it. A component's own prop still wins.

  Table: a column's `key` must be a field of the row unless the column renders its own `cell`, so a typo is a type error; rows no longer need an index signature. Internal helpers still exported from the root (`CloseIcon`, `menuItemClass`, `FieldChrome`…) are marked `@internal`.

## 0.2.0

### Minor Changes

- c1fdcb5: AvatarGroup: avatars side by side share one name tooltip. The first name still waits 400 ms; after that, moving to the next person slides the tooltip over to them and eases its width to the new name, instead of closing one tooltip and opening another. It closes 150 ms after the pointer leaves the row, so the gaps between faces don't close it. Focus shows it at once; Escape and blur hide it.

### Patch Changes

- c1fdcb5: Accordion and expanding groups: the content no longer scales while it opens. Chrome drew the scaled text as a bitmap, so it looked heavier until the animation ended, and the Accordion's open item did it on every page load. The section still grows downwards from under its header.
- 2fdb885: The package now links its source (`repository`, `bugs`), states `engines.node >=20.19` (it's ESM only), ships its CHANGELOG, and is published with npm provenance from the public repository.

## 0.1.1

### Patch Changes

- fd01b6e: Banner and Announcement bar: the mesh glows are now inlined as WebP data URIs (`banner-mesh`), so they show in any app. In 0.1.0 they pointed at `/figma/*.png` on uisatin.dev and were missing everywhere else.
- cb6f3e1: Type declarations now resolve under TypeScript `moduleResolution` `node16` and `nodenext`: relative imports in the `.d.ts` files carry their `.js` extension (folders point at `index.js`). `bundler` resolution is unchanged.
