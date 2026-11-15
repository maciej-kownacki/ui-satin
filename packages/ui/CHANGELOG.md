# @uisatin/ui

## 0.6.0

### Minor Changes

- 0b7ebd0: Parts next to the props API, for layouts the props don't cover:

  - Dialog: `DialogRoot`, `DialogTrigger`, `DialogContent` (with `variant`, `closeButton`, `container`), `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody` and `DialogFooter` (with `start`). `Dialog` is now built from them, so both look and behave the same.
  - SegmentedControl: write the segments as `SegmentedControlSegment` children instead of `items`, when one needs more than a label and an icon.
  - Table: `renderCell` wraps or replaces every body cell's content (a link to the row), `renderRow` draws each row (`<tr {...rowProps}>{children}</tr>` with your own handler or attribute).

  SearchBar takes `ref` as a plain prop like every other component (it was the last `forwardRef`).

- 0b7ebd0: Every word a component says on its own now comes from `SatinLabels`, so an app can translate all of it. New in the set: the accessible names that wrap data (Remove and Preview of a file, Change in DecisionCard, Uploading and Cancel in FileUpload, Breadcrumb's Show N more, a line chart's point count, Pagination's pages and "Page 5 of 12", Table's scroll region), screen-reader text (Textarea's character count, CodeBlock's added and removed lines, DecisionCard's ranking moves) and the English defaults of props: AgentPicker's `createLabel` and `placeholder`, AgentLoading's and Thinking's `label`, Attachment's `openLabel`, AnnouncementBar's and Banner's `dismissLabel`, Breadcrumb's, Pagination's and CookieConsent's `aria-label`, Card's `closeLabel`, CookieConsent's message and buttons, DecisionCard's Skip, Continue and Rewrite, DonutCard's `centerLabel`, FileUpload's titles and rejection messages, Message's `thinkingLabel`, Pagination's Previous and Next, PromptBar's placeholder and + menu rows, CommandMenu's `emptyText` and Toaster's region name. A prop still wins over its label. Calendar and the date pickers name months and weekdays and write dates in the new `dateLocale` label (en-US by default), and `formatDate` and `formatRange` take a locale.

  Labels that wrap data are functions, so a translation puts the words in its own order: `removeItem`, `cancelItem`, `changeItem`, `previewOf`, `uploading`, `largerThan`, `sentOfTotal`, `showMore`, `noResultsFor`, `selectRow`, `selectNamedRow`, `tableRegion`, `codeRegion`, `chartPoints`, `positionOf`, `page` and `pageOf`. `pageOf` gets Pagination's animated number as a node, so write it with JSX.

  Table takes `rowLabel(row, index)`: each row's select checkbox then says "Select Acme Corp" instead of "Select row 3", which also stays true when the table is sorted.

  Breaking for apps that set `selectRow`: it is now a function `(row) => string` instead of the word Table put before the number, so a language can place the number where it belongs. Write `` selectRow: (n) => `Zaznacz wiersz ${n}`  `` instead of `selectRow: 'Zaznacz wiersz'`. SearchBar's placeholder is now the `search` label, "Search…" with an ellipsis like the other fields.

- 0b7ebd0: Every variable Satin declares is now `--sa-*`, the semantic tokens included: `--sa-bg-card`, `--sa-text-muted`, `--sa-border-default`, `--sa-action-primary-bg`, `--sa-status-*`, `--sa-component-*`, the control heights, and the variables components set inline (`--sa-code-plain` and the other CodeBlock colours). An app's own `--bg-card` or `--text-muted` no longer reaches Satin, and Satin's no longer lands on the app's `:root`. `themeCss()` writes the new names, and the stylesheet check now fails on any variable outside `--sa-*`.

  Breaking for CSS that reads or sets the old names. To read them for one more minor version, import `@uisatin/ui/compat.css` after `styles.css`: it aliases each old name to its `--sa-*` one, in Light, Dark and every tone, and goes away in 0.7. To change a token, set the `--sa-*` name (rename `--bg-card: …` to `--sa-bg-card: …`).

  Dark mode also follows `data-theme`: `data-theme="dark"` works like the `dark` class, and `data-theme="system"` follows the operating system's `prefers-color-scheme` with no script. `themeCss()` with a `scope` writes all three. The tokens themselves ship as `@uisatin/ui/tokens.json` (W3C design tokens, Light and Dark).

  The reduced-motion rule now stops only Satin's elements and what's inside them, in the base layer; it used to set every element on the page to a near-zero duration with an unlayered `!important`, the app's own animations included. InputOTP's caret blinks from its own `data-slot` rule.

  `@uisatin/ui/theme` (`themeCss`, `themeVars`) is no longer marked `'use client'`, so a Server Component can call `themeCss()`, e.g. in a Next.js root layout; import it from `@uisatin/ui/theme`, not the root entry, there. The Channel and Donut charts read their series colours from Satin's `--sa-chart-*` again: from npm they read the unprefixed `--chart-*`, so they lost their colours, or took an app's own shadcn chart colours.

- 0b7ebd0: Every component now works right to left. With `dir="rtl"` on `<html>`, spacing, corners, borders and text alignment mirror: Satin sets them with start and end (logical properties) instead of left and right. Button group, Split button and Input group join from the right with round outer corners; close buttons sit in the top-left corner; the Table's first column sticks on the right and its row outline, scroll fade and scroll bar follow; the user's Message bubble has its tail on the left; values in Select and the date picker start at the right.

  Arrows that mean next, previous or forward point the other way: Breadcrumb, Pagination, the date picker's months, Context menu's submenus, Sidebar groups, Decision card's steps, Announcement bar, Action button, Agent suggestion, and Link's and Attachment's open-elsewhere arrow (↖). Icons that aren't directional, such as close and check, stay.

  Switch shows on with its thumb on the left. Toaster sits in the bottom-left corner and swipes away to the left. In the date picker Left moves to the next day and Right to the one before; Page Up, Page Down, Home and End are unchanged. Pagination's numbers, Decision card's questions, Progress's indeterminate bar and Skeleton's shimmer move the right-to-left way, and Textarea's grip moves to the bottom-left corner, with the browser's resizer.

  Code blocks and InputOTP stay left to right, and the Line, Area and Bar charts keep time running left to right. A Table column with `align: 'right'` lines up at the end, so on the left in right-to-left. Left-to-right pages look exactly as before.

### Patch Changes

- 0b7ebd0: Banner and AnnouncementBar weigh about 22 kB gzipped instead of 150: their mesh glows ship at a quarter of Figma's 2× export and the browser scales them up, which, composited, differs from the full-size renders by under 1/255 on average. CI now holds Button, Banner, Dialog and the stylesheet to size budgets. The published types no longer carry the Figma node ids from the source comments. The package ships an `AGENTS.md` with the rules for coding agents that use it. The font tokens also name "Geist Variable" and "Geist Mono Variable", the families `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` register, so importing those packages is enough; before, Satin fell back to the system font.
- 0b7ebd0: Dialog, Sheet and Command menu open over the page again when installed from npm or the registry. Their `fixed` (or, inside a `container`, `absolute`) class sat in a variable the build didn't recognise as classes, so it shipped without the `sa:` prefix and matched nothing: the panel landed at the end of the page instead of centred over it. The build now prefixes every variable the source passes to `cn()` or `className`.
- 0b7ebd0: Fixes found while writing the accessibility notes:

  - Input passes a `ref` on to the input and keeps its own, so a form library's `register()` no longer stops a click on the field's padding from focusing it.
  - A Chip with `onRemove` keeps the `id`, `aria-*`, `data-*` and handlers you pass; they go on the chip's `span`.
  - After a submit, Form also focuses the first control of an invalid FieldGroup.
  - SearchBar has an accessible name of its own ("Search", `searchField` in SatinLabels) when the app gives none.
  - AgentLoading's `time` is no longer read out on every tick; screen readers hear the label.
  - The Sources pill's "3 sources" comes from SatinLabels (`sourcesCount`).

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
