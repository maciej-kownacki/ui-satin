# @uisatin/ui

## 0.7.1

### Patch Changes

- c3a0047: `themeVars()` and `themeCss()` from the package give real values for `--sa-color-blue-500-a20` and `--sa-color-blue-600-a20` with a custom brand. In 0.7.0 both came out as `undefined33`, so the selected Decision card chip lost its fill in Dark with any brand of your own. The source was right; the build's prefixing missed a key read back by name.

## 0.7.0

### Minor Changes

- dd589ce: Text that fell below WCAG's 4.5:1 now passes, and a check in CI holds it there:

  - Error text (FormField, Input, Textarea, Select, InputOTP, error toasts) uses a new `--sa-text-destructive` token, red-700 in Light and red-400 in Dark; the destructive fill it used before read 3.3:1 as text in Dark.
  - The destructive button gets darker on hover (red-700) and pressed (red-900), so its white label stays above 4.5:1; it used to get lighter and drop to 2.8:1 in Dark.
  - DatePicker's placeholder, the group names in Dropdown and Select, the old value in AgentSuggestion and Popover's close icon use `--sa-text-muted` instead of the fainter tokens.
  - A toast action takes `altText`, what Radix reads in place of the button: how to do the same without the toast ("Undo with Ctrl+Z"). It still defaults to the label.

- dd589ce: Keyboard focus is now a solid ring that reads at 3:1 or more on every surface, in Light and Dark (WCAG 1.4.11); it used to be the brand colour at 20%, about 1.1–1.4:1. `--sa-action-focus-ring` is solid (blue-600 in Light, #7075FE in Dark, the same as `--sa-border-focus`, which is lighter in Dark), and `themeCss()` works out a Dark focus colour for any brand that holds the same minimum.

  - Buttons, checkboxes, radios and switches draw the ring as an outline 2px off the control, so it reads against the page whatever the fill (on a primary button the old ring showed 1px, next to a fill of the same colour).
  - Fields (Input, Textarea, Select, Combobox, DatePicker, InputOTP, PromptBar, SearchBar) turn their edge into a 2px line in the focus colour, and in the destructive colour when invalid, where the invalid ring used to be white at 24%.
  - A menu row reached with the arrow keys takes the ring inside its edge, in Dropdown, Context menu, Select, Combobox, Command menu, AgentPicker and the PromptBar menus; with the pointer it keeps the plain highlight.
  - In forced-colors mode (Windows High Contrast), which drops these rings, whatever has keyboard focus gets an outline in the system highlight colour.

- befd6fc: Notification: a card for something the app did or heard about, with media on the left, a title and description, a badge, and a round dismiss button centred on its top-right corner. NotificationStack folds several into a pile, the first in front and two peeking below, and unfolds them one under another on hover, focus or a tap, the way Toast's stack does; a dismissed card fades out while the rest move up.
- ccdd602: `@uisatin/ui/compat.css` is gone, as 0.6 announced. It aliased the token names from before 0.6 (`--bg-card`, `--text-muted`…) to their `--sa-*` ones. Breaking for CSS that still reads the old names: rename them to `--sa-*` (`var(--bg-card)` → `var(--sa-bg-card)`), and drop the `compat.css` import.
- 673c2ba: SearchBar has a `panel` variant: search with its results in place, for a settings page or anything that searches its own items. A 56px search row over the results on a sheet of their own and a footer of key hints, with `meta` on the right ("59 settings indexed"). Give it `groups` (the same shape as CommandMenu's); before anything is typed it shows `idleText`, then the matches, which the arrows move through and Enter opens, with focus staying in the field. CommandMenu and the panel share one search and list underneath.
- 5a1059e: Select takes `menuMaxHeight`, a cap in px on its menu's height (it scrolls past it). The date picker's year list uses it to end where the date picker does, instead of running down to the window's edge.

### Patch Changes

- 5c659dc: AgentSuggestion sits on the popover fill with a border/default edge, like DecisionCard and Message; on bg/card it came out darker than the page around it in Dark. Its kind badge shows the card's fill behind its edge.
- 08ca17f: Card takes bg/popover, like Decision card: in Dark it sits a step above the page instead of below it (#222225 where it was #121215). Light stays white.
- 85a31c0: Decision card: a selected chip in Dark has a full brand edge, a brand-tinted fill and a text/default label instead of the pale brand tint. Light is unchanged. New tokens: `--sa-component-decision-chip-selected-bg`, `-border` and `-fg`.
- 3ca319e: Dialog opens with more motion: the panel rises 12px and settles from 0.98 as it fades in over 300 ms (new `--sa-duration-slower` token), and the scrim fades in with it instead of appearing at once. Closing plays the same way in 200 ms instead of cutting.
- 5a1059e: Expanding groups (`satin-expand`: Sidebar groups, Citations, Thinking) no longer cut the focus ring of what they hold: the clip reaches 2px past the content, and nothing moves.
- 5a1059e: The tile behind a file's type icon (Attachment `lg`, File upload items) is lighter in Dark, from a new component/file-icon/bg token; Light keeps bg/muted.
- b113d81: The user's Message bubble is a light grey in Dark (zinc-300) instead of near-white, from a new component/message/bubble-bg token; Light keeps action/inverse.
- 86bd44d: Notification: the neutral badge is one step lighter in Dark, so it stands off the popover fill. New token `--sa-component-notification-badge-bg`.
- 5a1059e: Input OTP's verified cells are edged in a calmer green in Dark, the Switch's mid green, from a new component/input-otp/success-border token; status/green/fg is a pale tint meant for text and read loud as a 2px edge. Light is unchanged.
- 5a1059e: Every surface shown over the interface now has the menus' edge, 1px border/subtle: Popover, Hover card, Date picker panels, Dialog, Toast, Notification (with its close button) and Attachment preview had border/default.
- 3537144: No keyboard focus ring after a mouse click on a tab, a menu row or a menu's trigger. Radix focuses these from script on a pointer press (Tabs on mousedown, menus on hover and when they close), which Chrome shows as `:focus-visible`. Satin now notes a pointer press on `<html>` (`data-satin-pointer`, cleared by the next key) and draws no ring on them until a key is pressed; Tab and the arrow keys show it as before.
- ba64316: SelectableRadio and SelectableCheckbox (`md`) set their text like Radio and Checkbox: a 14/20 medium title over a 14/20 muted description, where the title used to sit on an 18px line and the description took the theme's body size. The two lines sit flush, so the text stays 40px next to the 40px icon tile, and the checkbox sits on the middle of the 20px title line. `sm` keeps its compact 13/18.
- b113d81: A title and its description sit about 8px apart, like Checkbox and Radio fields: Toast (description on an 18px line, 2px under the title), Notification and Alert (2px), Card and Dialog headers (4px, were 2px). They used to sit 5–6.5px apart and read cramped.

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
