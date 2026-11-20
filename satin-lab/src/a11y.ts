/**
 * Accessibility and keyboard notes per component, keyed by docs page id: what assistive tech
 * gets (roles, accessible names, live regions, what the app must supply) and the keys it
 * answers to. DocSection prints them as the page's Accessibility section, and the markdown
 * pages (/components/<name>.md) and llms-full.txt carry them.
 *
 * Write what the component does, checked against its source and the Radix primitive under it;
 * nothing aspirational. Leave `keyboard` out when the component takes no keys of its own (a
 * Badge), and say so in `summary` when that's worth knowing.
 */
export type KeyboardRow = {
  /** Keys as they're printed on the keyboard, one entry per alternative: ['Enter', 'Space']. */
  keys: string[]
  action: string
}

export type A11y = {
  /** One to three sentences: role and name, states it announces, what the app must provide. */
  summary: string
  keyboard?: KeyboardRow[]
}

export const a11y: Record<string, A11y> = {
  accordion: {
    summary:
      'Each header is a `button` inside a heading, with `aria-expanded` and `aria-controls` pointing at its section, which is a `region` labelled by the header. A closed section leaves the accessibility tree. The chevron and the `icon` are hidden from screen readers.',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'Opens or closes the focused section. With `type="single"`, the open one closes only when `collapsible`.' },
      { keys: ['↓'], action: 'Moves focus to the next header, wrapping to the first.' },
      { keys: ['↑'], action: 'Moves focus to the previous header, wrapping to the last.' },
      { keys: ['Home'], action: 'Moves focus to the first header.' },
      { keys: ['End'], action: 'Moves focus to the last header.' },
    ],
  },
  alert: {
    summary:
      'Errors and warnings are `role="alert"`, so screen readers read them out when they appear; the other intents are `role="status"`, read politely. The status icon is hidden, so say the severity in the title when it matters. The close button is named "Dismiss" (`dismiss` in SatinLabels).',
  },
  'announcement-bar': {
    summary:
      'A `region` named "Announcement" (pass `aria-label` to change it). It is not a live region, so it is not read out when it appears. The close button is named "Dismiss announcement" (`dismissLabel`); an `action` with `href` renders as a link. The mesh images are hidden from screen readers.',
  },
  banner: {
    summary:
      'A plain `div` with no role; the title is a paragraph, not a heading, so wrap the banner in a landmark or give it a heading when it needs one. The close button is named "Dismiss" (`dismissLabel`). The mesh images are hidden and `shimmer` stops under reduced motion.',
  },
  avatar: {
    summary:
      'Without `name` the initials are plain text. With `name` the avatar becomes `role="img"` named after the person, takes keyboard focus and shows the name in a tooltip; the initials are hidden. In an `AvatarGroup` (`role="group"`) the avatars share one tooltip.',
    keyboard: [
      { keys: ['Tab'], action: 'Focuses an avatar with a `name` and shows the name at once.' },
      { keys: ['Esc'], action: 'Hides the name.' },
    ],
  },
  badge: {
    summary: 'A `span` with no role: screen readers read its text in line. The tone is colour only, so the label has to carry the meaning.',
  },
  breadcrumb: {
    summary:
      'A `nav` named "Breadcrumb" (`aria-label` overrides it) around an ordered list. The current page is plain text with `aria-current="page"`. With `hideLabel` the label stays for screen readers. The separators are hidden. Folded items sit behind a button named "Show 3 more" that opens a menu named "Hidden pages".',
    keyboard: [
      { keys: ['Enter', 'Space', '↓'], action: 'On the "…" button: opens the menu of hidden pages.' },
      { keys: ['↑', '↓'], action: 'Moves between the hidden pages.' },
      { keys: ['Enter', 'Space'], action: 'Goes to the highlighted page.' },
      { keys: ['Esc'], action: 'Closes the menu and returns focus to the "…" button.' },
    ],
  },
  button: {
    summary:
      'A native `button` with `type="button"` unless you set `type`; `asChild` puts the styles on your own element instead. An `iconOnly` button needs an `aria-label`. While `loading` it keeps focus and its place in the tab order, adds `aria-busy` and `aria-disabled`, and ignores clicks.',
    keyboard: [{ keys: ['Enter', 'Space'], action: 'Activates the button. Does nothing while `loading`.' }],
  },
  'bulk-action-bar': {
    summary:
      'A `toolbar` named "Bulk actions" (`bulkActions` in SatinLabels), after the content it acts on. It starts with a "Select all" checkbox (`aria-checked="mixed"` while some are selected). The count is read out from a polite `status` region as it changes ("3 selected"), and "Selection cleared" or "Done" when that happens; the rolling digits are hidden from screen readers. The clear button carries `aria-keyshortcuts="Escape"`; the actions have no shortcuts. While hidden the bar is `inert`. When it hides with focus inside, focus goes back to where it came from (the row checkbox). The batch toast is read out like any toast; each item\'s Undo is named after the item ("Undo Acme Corp").',
    keyboard: [
      { keys: ['Tab'], action: 'Moves into the toolbar, onto the last button used, and out of it.' },
      { keys: ['→', '←'], action: 'Moves to the next or previous button, wrapping around; mirrored right to left.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last button.' },
      { keys: ['Space'], action: 'On the checkbox: selects all, or clears when all are selected.' },
      { keys: ['Enter', 'Space'], action: 'Runs the focused action, opens the ⋯ menu, or clears with ×.' },
      { keys: ['Esc'], action: 'Clears the selection, while focus is in the table or the bar (not while typing in a field).' },
    ],
  },
  'button-group': {
    summary:
      'A `div` with `role="group"`; give it an `aria-label` that says what the buttons are for ("Text alignment"). Each button stays its own tab stop. `ButtonGroupSeparator` is a vertical `separator`.',
  },
  'split-button': {
    summary:
      'Two buttons in a `role="group"`: the main action, then an arrow named "More options" (`menuLabel`) that opens a DropdownMenu. `disabled` disables both.',
    keyboard: [
      { keys: ['Enter', 'Space', '↓'], action: 'On the arrow: opens the menu.' },
      { keys: ['↑', '↓'], action: 'Moves between the menu items.' },
      { keys: ['A–Z'], action: 'Jumps to the item whose label starts with the typed letters.' },
      { keys: ['Esc'], action: 'Closes the menu and returns focus to the arrow.' },
    ],
  },
  'action-button': {
    summary:
      'A Button. While the action runs it has `aria-busy` and `aria-disabled`, keeps focus and ignores clicks; on success a polite live region says "Done" (`done` in SatinLabels). The spinner and checkmark are hidden. A failed action goes back to idle silently, so announce the error yourself.',
    keyboard: [{ keys: ['Enter', 'Space'], action: 'Runs `onAction`. Does nothing while busy or done.' }],
  },
  card: {
    summary:
      'With a `title` the card is `role="group"` labelled by it; without one it is a plain `div`. The title is not a heading. The close button is named "Close" (`closeLabel`).',
  },
  'bar-chart': {
    summary:
      'The card is `role="figure"` labelled by its title. The bars are a list named after the title; each bar is a tab stop named "label: value unit", and focusing it shows its tooltip. The axis and grid lines are hidden. With `periods`, the Select in the header is named "Period".',
    keyboard: [{ keys: ['Tab', 'Shift+Tab'], action: 'Moves from bar to bar and shows the focused bar’s value.' }],
  },
  'channel-chart': {
    summary:
      'The card is `role="figure"` labelled by its title. The stacked bar is hidden; the legend is a list named after the title, and each row is a tab stop named "label: value, share%". Focusing a row brings its channel forward. With `periods`, the Select in the header is named "Period".',
    keyboard: [{ keys: ['Tab', 'Shift+Tab'], action: 'Moves from channel to channel in the legend.' }],
  },
  'line-chart': {
    summary:
      'The card is `role="figure"` labelled by its title. The plot is one tab stop, a `role="group"` named "title, 12 points" (`chartPoints` in SatinLabels). Focusing it picks the last point, and a polite live region reads the picked point as "label: value". The line and axes are hidden.',
    keyboard: [
      { keys: ['Tab'], action: 'Focuses the plot and picks the last point.' },
      { keys: ['←', '→'], action: 'Picks the previous or next point; stops at the ends.' },
    ],
  },
  'area-chart': {
    summary:
      'The same as the Line chart: the card is `role="figure"` labelled by its title, and the plot is one tab stop, a `role="group"` named "title, 12 points". Focusing it picks the last point, and a polite live region reads the picked point as "label: value". The line, area and axes are hidden.',
    keyboard: [
      { keys: ['Tab'], action: 'Focuses the plot and picks the last point.' },
      { keys: ['←', '→'], action: 'Picks the previous or next point; stops at the ends.' },
    ],
  },
  'donut-chart': {
    summary:
      'The card is `role="figure"` labelled by its title. The ring is hidden. The legend is a list named after the title; each pill is a tab stop named "label: value, share%". The middle of the ring is a polite live region, so moving to a part reads its value and share.',
    keyboard: [{ keys: ['Tab', 'Shift+Tab'], action: 'Moves from part to part and shows its value in the middle.' }],
  },
  checkbox: {
    summary:
      'A Radix checkbox: a `button` with `role="checkbox"` and `aria-checked` (`mixed` when indeterminate). `label` names it with `aria-labelledby` and `description` adds `aria-describedby`; without a label, pass `aria-label`. Inside a `form` it also renders a hidden input, so the value submits.',
    keyboard: [{ keys: ['Space'], action: 'Checks or unchecks the box. Enter does nothing, as WAI-ARIA asks.' }],
  },
  chip: {
    summary:
      'Without `onRemove` the chip is a native `button`. With `onRemove` it is a `span` holding a remove button named "Remove <label>" (`removeLabel`), and only that button takes focus. The dot is hidden, and the tone is colour only.',
    keyboard: [{ keys: ['Enter', 'Space'], action: 'Activates the chip, or removes it from the remove button.' }],
  },
  'code-block': {
    summary:
      'The code is a `pre` with `role="region"`, named "<filename> code" (or "Code"), and a tab stop, so keyboard users can scroll long lines. Line numbers are hidden. In a diff, added and removed lines say "added" or "removed" to screen readers. The Copy button’s label is a polite live region that says "Copied" for 1.5 s.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves to the Copy button, then to the code.' },
      { keys: ['←', '→'], action: 'Scrolls long lines while the code has focus.' },
    ],
  },
  combobox: {
    summary:
      'The field is a `button` with `aria-haspopup="listbox"` and `aria-expanded`, named by `label` and described by the hint or error (`aria-describedby`, `aria-invalid`); it reads out the picks or the placeholder. Opening it moves focus to the search input, a `combobox` that points at the highlighted option with `aria-activedescendant`. The list is a `listbox` (`aria-multiselectable` with `multiple`) of options with `aria-selected`; titled groups are `group`s named by their headers, and the list is `aria-busy` while `loading`. Each chip has a "Remove <label>" button; Clear gives focus back to the field. With `creatable`, the Create row is the list’s last option, named by the `createOption` label ("Create “Figma”"); while `onCreate` waits it is `aria-busy` and `aria-disabled`, and a failure is said once from a status region and stays under the row.',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the field: opens the list and focuses the search.' },
      { keys: ['A–Z'], action: 'In the search: filters the options by label and description.' },
      { keys: ['↑', '↓'], action: 'Moves the highlight, wrapping at the ends.' },
      { keys: ['Enter'], action: 'Picks the highlighted option; a single pick closes the list. On the Create row, makes the option and picks it (again after a failure).' },
      { keys: ['Tab'], action: 'With `footer`, moves to Cancel and Apply.' },
      { keys: ['Esc'], action: 'Closes the list, drops picks waiting for Apply and returns focus to the field.' },
    ],
  },
  'command-menu': {
    summary:
      'A Radix dialog titled "Command menu" for screen readers. The search input is a `combobox` named "Search commands" that points at the highlighted row with `aria-activedescendant`; the rows are options in a `listbox` named "Commands", grouped under their headings. The key hints in the footer are hidden.',
    keyboard: [
      { keys: ['⌘K', 'Ctrl+K'], action: 'Opens or closes the menu from anywhere on the page, unless `hotkey` is off.' },
      { keys: ['↑', '↓'], action: 'Moves the highlight, wrapping at the ends.' },
      { keys: ['Enter'], action: 'Runs the highlighted command and closes the menu.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Keep focus inside the menu while it is modal (the default).' },
      { keys: ['Esc'], action: 'Closes the menu and returns focus to where it was.' },
    ],
  },
  'cookie-consent': {
    summary:
      'A `section` named "Cookie consent" (`aria-label` overrides it), so it is a region landmark. It is not a modal and not a live region: focus stays where it was and the page stays usable. The answers are native buttons.',
  },
  dialog: {
    summary:
      'A Radix dialog: `role="dialog"`, or `role="alertdialog"` when destructive, labelled by `title` and described by `description`. The title is required. Opening it moves focus into the dialog; while it is modal (the default) the rest of the page is hidden from screen readers and can’t be reached. Closing returns focus to the trigger. The close button is named "Close". A `DialogAlert` is `role="alert"` for errors and warnings and `role="status"` otherwise.',
    keyboard: [
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves focus through the dialog, staying inside it while it is modal.' },
      { keys: ['Esc'], action: 'Closes the dialog and returns focus to the trigger.' },
    ],
  },
  dot: {
    summary:
      'Without `label` the dot is hidden from screen readers; pair it with visible text. With `label` it is `role="img"` named by it ("Running").',
  },
  dropdown: {
    summary:
      'A Radix dropdown menu. The trigger gets `aria-haspopup="menu"` and `aria-expanded`; the panel is a `menu` (named by `aria-label` when the trigger text isn’t enough) and each row a `menuitem`. A `selected` row adds "(selected)" for screen readers. A `shortcut` is only shown and hidden from screen readers; binding the keys is up to the app. While open and modal (the default), the rest of the page can’t be reached. A submenu row is a `menuitem` with `aria-haspopup="menu"` and `aria-expanded`, and its panel another `menu`; on the way to it the pointer has a safe triangle, so cutting across other rows doesn’t close it. Checkbox rows are `menuitemcheckbox` and radio rows `menuitemradio`, each with `aria-checked` (`mixed` when indeterminate); their checkbox and check are hidden. A group with a header is a `group` named by it ("Show columns"). Right to left, read from the trigger or `dir`, the arrows that open and close submenus swap and submenus open on the left.',
    keyboard: [
      { keys: ['Enter', 'Space', '↓'], action: 'On the trigger: opens the menu and focuses the first item.' },
      { keys: ['↑', '↓'], action: 'Moves between items, skipping disabled ones.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last item.' },
      { keys: ['A–Z'], action: 'Moves to the next item whose label starts with the typed letters.' },
      { keys: ['Enter', 'Space'], action: 'Runs the focused item and closes the menu. On a checkbox row: toggles it and keeps the menu open. On a radio row: selects it and closes the menu.' },
      { keys: ['→', 'Enter', 'Space'], action: 'On a submenu row: opens the submenu and focuses its first item (← right to left).' },
      { keys: ['←'], action: 'In a submenu: closes it and returns focus to its row (→ right to left).' },
      { keys: ['Esc'], action: 'Closes the menu, submenus included, and returns focus to the trigger.' },
    ],
  },
  'context-menu': {
    summary:
      'A Radix context menu on the `trigger`, opened by the `contextmenu` event: right-click, a long press, or Shift+F10 and the menu key when the trigger has focus, so make the trigger focusable. The panel is a `menu` of `menuitem` rows; a submenu row has `aria-haspopup="menu"`. Shortcuts are only shown. Keyboard and screen-reader users can’t always reach a context menu, so put the same actions somewhere else too.',
    keyboard: [
      { keys: ['Shift+F10'], action: 'On the focused trigger: opens the menu, where the browser fires `contextmenu`.' },
      { keys: ['↑', '↓'], action: 'Moves between items.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last item.' },
      { keys: ['A–Z'], action: 'Moves to the next item whose label starts with the typed letters.' },
      { keys: ['Enter', 'Space'], action: 'Runs the focused item, or opens its submenu.' },
      { keys: ['→'], action: 'Opens the submenu of the focused row.' },
      { keys: ['←'], action: 'Closes the submenu and goes back to its row.' },
      { keys: ['Esc'], action: 'Closes the menu.' },
    ],
  },
  'empty-state': {
    summary:
      'A plain `div` with no role. The icon is hidden. The title is a paragraph, not a heading, so add a heading around it if the page outline needs one. `actions` are your own buttons or links.',
  },
  'file-upload': {
    summary:
      'Dropping files works by pointer only; Browse files is a native button that opens the file picker, described by `description`, so keyboard users get the same path. The rows are lists named "Files" and "Attached files". An uploading row has a Progress named "Uploading <name>" and a "Cancel <name>" button; an error row is `role="alert"`, so it is read out when it appears, with a "Remove <name>" button. Rejected files are only reported to `onFilesRejected`; show them as error rows so they are announced.',
    keyboard: [{ keys: ['Enter', 'Space'], action: 'On Browse files: opens the file picker.' }],
  },
  form: {
    summary:
      'A native `form` with `noValidate` on by default, so your own messages replace the browser’s. After a submit, when errors appear, focus moves to the first control with `aria-invalid="true"`, so keyboard and screen-reader users land on what needs fixing. Messages from `errors` reach each field by `name`. `disabled` wraps the fields in a native `fieldset`, which disables every control inside. `FormSection` is a `section` labelled by its `h3` title.',
  },
  'field-group': {
    summary:
      'A native `fieldset`: the `legend` names the whole group for screen readers, and `disabled` reaches every control in it. The description and the error are linked with `aria-describedby`. The required mark is hidden, so set `required` on the controls too. After a submit with errors, Form focuses the first control of an invalid group, in document order with the other fields.',
  },
  'form-field': {
    summary:
      'The `label` points at the control by id (`htmlFor`, generated when left out). Input, Textarea and Select inside pick up the id, `name`, `aria-describedby` (the description, or the error in its place), `aria-invalid`, `disabled` and `required`; other controls read them with `useFormField()`. The error is not a live region; it is read when the control is focused. The required mark is hidden.',
  },
  input: {
    summary:
      'A native `input`. `label` renders a `label` pointing at it; the hint, or the error in its place, is linked with `aria-describedby`, and an error sets `aria-invalid`. Without a label, pass `aria-label`. The leading icon is hidden; the trailing slot is not, so a button there needs its own name. Inside a FormField, the field supplies all of this.',
  },
  'input-group': {
    summary:
      'A `div` with `role="group"` around the parts. Give it an `aria-label`, or wrap it in a FormField whose label names the field inside. Each Input, Select and Button keeps its own name and tab stop; an `InputGroupAddon` is plain text.',
  },
  'password-input': {
    summary:
      'An Input of type password. The show and hide button is named "Show password" or "Hide password" and has `aria-pressed`; it keeps focus and the caret where they are. `autoComplete` is `current-password` by default; pass `new-password` on sign-up so password managers suggest one.',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the button: shows or hides the password.' },
    ],
  },
  'date-picker': {
    summary:
      'Both pickers are a `button` named by `label` and described by the hint or error (`aria-describedby`, `aria-invalid`); it opens the Calendar in a popover and moves focus into it. Each month is a `grid` labelled by its title, and the grid is one tab stop. Each day is a `button` named by its full date; picked days have `aria-selected` and today `aria-current="date"`. Days that can\'t be picked (outside `min`/`max`, or `isDisabled`) have `aria-disabled` rather than `disabled`, so the arrow keys still reach them and a reason drawn with `renderDay` is heard and seen; Enter and clicks do nothing there. The arrows are named "Previous month" and "Next month", and the year Select "Year". Presets come before the calendar as a `listbox` named "Presets", one tab stop; each preset is an `option` named by its label, the one matching the value `aria-selected`, one outside `min` and `max` (or, in DatePicker, on a day `isDisabled` rules out) `aria-disabled`. Picking a preset moves the calendar to its month.',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the field: opens the calendar. On a day: picks it; a range takes its start, then its end.' },
      { keys: ['←', '→'], action: 'Moves a day back or forward, turning the month when needed.' },
      { keys: ['↑', '↓'], action: 'Moves a week back or forward.' },
      { keys: ['Page Up', 'Page Down'], action: 'Moves a month back or forward.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or the last day of the week (from the locale, or `weekStartsOn`). In the presets: to the first or the last preset.' },
      { keys: ['↑', '↓'], action: 'In the presets: moves to the previous or the next preset without picking it (← and → too, where the list runs in a row).' },
      { keys: ['Enter', 'Space'], action: 'On a preset: picks it. DatePicker closes; a range picker shows the range and waits for Apply.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves between the presets, the arrows, the year, the days and, in a range, Cancel and Apply.' },
      { keys: ['Esc'], action: 'Closes the calendar and returns focus to the field; a range not yet applied is dropped.' },
    ],
  },
  'input-otp': {
    summary:
      'One real `input` over the cells, with `autocomplete="one-time-code"` and a numeric keyboard for digits, so screen readers hear one text box and paste and SMS autofill work. Name it with `label` or `aria-label`. The cells, dashes and caret are hidden. The cell taking the next character shows the focus; a full field shows it on its last cell only when the keyboard tabs into it, so filling in the code doesn’t leave a ring behind. The message under the cells is a polite live region, so a hint changing to "Checking…", success or an error is read out; an error also sets `aria-invalid`. The resend countdown is plain text, so it isn’t read out every second; when it ends it becomes a "Resend code" button. A suggested code is announced once ("Code 428 193 received") and is a button right after the field, named "Use code 428 193 From Messages"; choosing it fills the field and leaves the focus there.',
    keyboard: [
      { keys: ['Backspace'], action: 'Deletes the last character. The caret always stays at the end.' },
      { keys: ['Tab'], action: 'From the field, moves to the suggested code, then to Resend code once it’s open.' },
      { keys: ['Esc'], action: 'Puts the suggested code away until a different one arrives.' },
    ],
  },
  'number-input': {
    summary:
      'The `input` has `role="spinbutton"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext` from `formatValue`, named by `label` or `aria-label`. The − and + buttons are named "Decrease" and "Increase", point at the input with `aria-controls` and are left out of the tab order, since the keys do the same.',
    keyboard: [
      { keys: ['↑', '↓'], action: 'Steps up or down by `step`.' },
      { keys: ['Page Up', 'Page Down'], action: 'Steps ten times.' },
      { keys: ['Home', 'End'], action: 'Jumps to `min` or `max`, when set.' },
      { keys: ['Enter'], action: 'Clamps a typed value, snaps it to `step` and commits it.' },
      { keys: ['Esc'], action: 'Drops what was typed and puts the last value back.' },
    ],
  },
  kbd: {
    summary:
      'A native `kbd` element, read as its text; screen readers may say symbols such as ⌘ in different ways. `KbdArrowUp`, `KbdArrowDown` and `KbdReturn` are hidden glyphs with no text, so add words for screen readers next to them, or hide the hint when the same help is spoken elsewhere.',
  },
  link: {
    summary:
      'A native `a`; `asChild` puts the styles on your router’s link. An external link adds a hidden arrow and "(opens in a new tab)" for screen readers, and `rel="noopener noreferrer"`.',
    keyboard: [{ keys: ['Enter'], action: 'Follows the link.' }],
  },
  list: {
    summary:
      'A `ul` with `role="list"`, so the list survives `list-style: none`; give it an `aria-label` when no heading names it. In an interactive row the title is the `a` or `button`, stretched over the row: one tab stop named by the title. A selected link has `aria-current="page"`, a selected button `aria-pressed`. `actions` stay their own tab stops, and the icon tile is hidden.',
  },
  pagination: {
    summary:
      'A `nav` named "Pagination" (`aria-label` overrides it) around a list. Pages are named "Page 3"; the current one has `aria-current="page"`. Previous and Next are disabled at the ends and named when icon-only. The compact "Page 5 of 12" is a polite live region. The ellipsis is hidden. With `getHref` the pages are links, otherwise buttons.',
  },
  popover: {
    summary:
      'A Radix popover: the trigger gets `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`; the panel is `role="dialog"` labelled by the title. It is not modal: opening moves focus into the panel, Tab can leave it, and focus leaving closes it. The close button is named "Close".',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the trigger: opens or closes the popover.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves through the panel; leaving it closes the popover.' },
      { keys: ['Esc'], action: 'Closes the popover and returns focus to the trigger.' },
    ],
  },
  'hover-card': {
    summary:
      'A Radix hover card. It opens when the trigger is hovered or focused, after `openDelay`, and closes after `closeDelay`. The card is not in the tab order and is not linked to the trigger, so keyboard and screen-reader users don’t reach what is inside: keep it to extra context the page works without.',
    keyboard: [
      { keys: ['Tab'], action: 'Focusing the trigger opens the card after `openDelay`; moving on closes it.' },
      { keys: ['Esc'], action: 'Closes the card.' },
    ],
  },
  progress: {
    summary:
      'A `div` with `role="progressbar"`, named by `label` (or `aria-label`), with `aria-valuemin`, `aria-valuemax` and `aria-valuetext` from `formatValue`. `aria-valuenow` is set only while the amount is known, so a bar without `value` reads as indeterminate. The percentage text is hidden, since `aria-valuetext` says it. Progress is not a live region; announce the end of a long task yourself.',
  },
  radio: {
    summary:
      'A Radix radio group: `RadioGroup` is a `radiogroup` (name it with `aria-label` or `aria-labelledby`, or put it in a FieldGroup), each Radio a `button` with `role="radio"` and `aria-checked`. `label` names a Radio with `aria-labelledby` and `description` adds `aria-describedby`. The group is one tab stop. Inside a `form` it also renders hidden inputs, so the value submits.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves into the group, onto the checked radio (or the first), and out again.' },
      { keys: ['↑', '↓', '←', '→'], action: 'Moves to the previous or next radio and checks it, wrapping at the ends.' },
      { keys: ['Space'], action: 'Checks the focused radio. Enter does nothing, as WAI-ARIA asks.' },
    ],
  },
  'search-bar': {
    summary:
      'A native `input` of type search (`searchbox`) named "Search" (`searchField` in SatinLabels) unless you pass `aria-label` ("Search docs"); the icon and keycaps are hidden. In the panel the input is a `combobox` that controls the results `listbox`; the highlighted row is its `aria-activedescendant`, so focus stays in the field.',
    keyboard: [
      { keys: ['⌘K', 'Ctrl+K'], action: 'Focuses the field and selects its text, from anywhere on the page, unless `hotkey` is off.' },
      { keys: ['↑', '↓'], action: 'Panel: moves the highlight through the results, wrapping at the ends.' },
      { keys: ['Enter'], action: 'Panel: opens the highlighted result (its `onSelect`).' },
      { keys: ['Esc'], action: 'Clears the field when it has text.' },
    ],
  },
  'segmented-control': {
    summary:
      'A single-select Radix toggle group: the track is a `group` (name it with `aria-label`, "View") and each segment a `button` with `role="radio"` and `aria-checked`. The group is one tab stop. Pressing the selected segment again keeps it selected. An icon-only segment needs an `aria-label`. The sliding pill is hidden.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves into the control, onto the selected segment, and out again.' },
      { keys: ['←', '→', '↑', '↓'], action: 'Moves focus to the previous or next segment, wrapping at the ends. It doesn’t select.' },
      { keys: ['Home', 'End'], action: 'Moves focus to the first or last segment.' },
      { keys: ['Enter', 'Space'], action: 'Selects the focused segment.' },
    ],
  },
  select: {
    summary:
      'A Radix select. The trigger is a `button` with `role="combobox"`, `aria-expanded` and `aria-controls`, named by `label` (or `aria-label`) and described by the hint or error (`aria-describedby`, `aria-invalid`). The list is a `listbox` of options, with group labels; the current one shows a check and adds "(selected)" for screen readers. Closing returns focus to the trigger. Inside a `form`, a hidden native `select` carries the value.',
    keyboard: [
      { keys: ['Enter', 'Space', '↑', '↓'], action: 'On the trigger: opens the list on the current option.' },
      { keys: ['A–Z'], action: 'On the closed trigger: picks the next option whose label starts with the typed letters. In the list: moves to it.' },
      { keys: ['↑', '↓'], action: 'Moves between options.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last option.' },
      { keys: ['Enter', 'Space'], action: 'Picks the focused option and closes the list.' },
      { keys: ['Esc'], action: 'Closes the list without picking.' },
    ],
  },
  'selectable-radio': {
    summary:
      'Each card is a Radix radio: a `button` with `role="radio"` and `aria-checked`, labelled by its title and described by its description. The icon tile is hidden. Put the cards in a `RadioGroup` and name the group.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves into the group, onto the checked card (or the first), and out again.' },
      { keys: ['↑', '↓', '←', '→'], action: 'Moves to the previous or next card and checks it, wrapping at the ends.' },
      { keys: ['Space'], action: 'Checks the focused card.' },
    ],
  },
  'selectable-checkbox': {
    summary:
      'A Checkbox (`role="checkbox"`, `aria-checked`) inside a card that is its `label`, so the whole card toggles it. The box is labelled by the card’s title and described by its description. The icon tile is hidden. For one legend over several cards, put them in a FieldGroup.',
    keyboard: [{ keys: ['Space'], action: 'Checks or unchecks the focused card.' }],
  },
  separator: {
    summary:
      'Decorative by default: `role="none"`, so screen readers skip it. With `decorative={false}` it is `role="separator"` with `aria-orientation`. A `label` is plain text either way and is read.',
  },
  sheet: {
    summary:
      'A Radix dialog that slides in from an edge: `role="dialog"` labelled by `title` and described by `description`. The title is required. Opening it moves focus in; while modal (the default) the rest of the page is hidden from screen readers and can’t be reached; closing returns focus to the trigger. The close button and the bottom sheet’s handle are both buttons named "Close".',
    keyboard: [
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves focus through the sheet, staying inside it while it is modal.' },
      { keys: ['Esc'], action: 'Closes the sheet and returns focus to the trigger.' },
    ],
  },
  sidebar: {
    summary:
      '`Sidebar` is a `nav` landmark; name it with `aria-label` when the page has more than one. Items are links; the current page has `aria-current="page"`. A disabled item gets `aria-disabled`, loses its `href` and leaves the tab order. An `iconOnly` item is named by its label (and count) and shows it in a tooltip. Group and sub-group headers are buttons with `aria-expanded` and `aria-controls`; a folded group’s rows are hidden from the tab order and screen readers.',
    keyboard: [
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves through the items and headers, skipping folded rows.' },
      { keys: ['Enter'], action: 'Follows the focused item.' },
      { keys: ['Enter', 'Space'], action: 'On a group or sub-group header: opens or folds it.' },
    ],
  },
  skeleton: {
    summary: 'Every block is `aria-hidden`, so screen readers skip it. Put `aria-busy="true"` on the region that is loading and take it off when the content arrives.',
  },
  slider: {
    summary:
      'A Radix slider with a `slider` role per thumb, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and `aria-valuetext` from `formatValue`. One thumb is named by `label` (or `aria-label`); a range’s thumbs are named "From" and "To". The readout and the tooltip are hidden, since the thumbs say the value. The `inputs` are named "Value", or "From" and "To". Inside a `form`, hidden inputs carry the value.',
    keyboard: [
      { keys: ['←', '→', '↑', '↓'], action: 'Moves the focused thumb one `step`.' },
      { keys: ['Page Up', 'Page Down'], action: 'Moves it ten steps; Shift with an arrow does the same.' },
      { keys: ['Home', 'End'], action: 'Moves it to `min` or `max`.' },
      { keys: ['Enter'], action: 'In an input: clamps the typed value, snaps it to `step` and commits it.' },
      { keys: ['Esc'], action: 'In an input: puts the current value back.' },
    ],
  },
  spinner: {
    summary:
      'On its own it is `role="status"` named "Loading" (or `label`). With `label={null}` it is hidden from screen readers, for a spinner inside something that already says it is busy, such as a loading Button.',
  },
  switch: {
    summary:
      'A Radix switch: a `button` with `role="switch"` and `aria-checked`. `label` names it with `aria-labelledby` and `description` adds `aria-describedby`; without a label, pass `aria-label`. Inside a `form` it also renders a hidden input, so the value submits.',
    keyboard: [{ keys: ['Space', 'Enter'], action: 'Turns the switch on or off.' }],
  },
  table: {
    summary:
      'A native `table` named by `label`, with `scope="col"` headers. A sortable header holds a `button` and sets `aria-sort`. With `selectable`, the header checkbox is named "Select all rows" and is `mixed` while some are picked; each row’s checkbox is named "Select row 3", or "Select <name>" with `rowLabel`, which stays right after sorting. With `overflow="scroll"` the table sits in a focusable `region` named "<label>, scrolls sideways", so keyboard users can scroll it; the fade and the scrollbar are hidden.',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On a sortable header: sorts ascending, then descending, then not at all.' },
      { keys: ['Space'], action: 'On a checkbox: selects or clears the row, or every row.' },
      { keys: ['←', '→'], action: 'Scrolls a scrolling table sideways while its region has focus.' },
    ],
  },
  tabs: {
    summary:
      'Built on Radix Tabs: a `tablist` (named by `aria-label`) of `tab` buttons with `aria-selected`; each `TabsContent` is a `tabpanel` labelled by its tab and focusable. Without panels the tabs drop `aria-controls`. Moving onto a tab selects it. The sliding indicator is hidden.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves into the tab list onto the selected tab, then on to its panel.' },
      { keys: ['←', '→'], action: 'Moves to the previous or next tab and selects it, wrapping at the ends.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last tab and selects it.' },
    ],
  },
  textarea: {
    summary:
      'A native `textarea`. `label` points at it; the hint, or the error in its place, and the counter are linked with `aria-describedby`, and an error sets `aria-invalid`. The counter reads as "Characters used: 34/120". `maxLength` is not set on the element, so typing past it is allowed and only the counter says so; the grip is hidden.',
  },
  notification: {
    summary:
      'An `article` named by its title and described by its description; the media and the cards stacked behind are hidden from screen readers unless the media names itself (an Avatar with `name`). It is not a live region: announce a new notification from the app, or use Toast. The close button is a 24px `button` named "Dismiss" (`dismiss` in SatinLabels); it shows on hover and whenever focus is inside the card, and on touch screens always.',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the close button, dismisses the notification.' },
      { keys: ['Tab'], action: 'In a NotificationStack, moving focus into it unfolds it; then Tab goes through every card’s close button. Folded, the cards behind are inert and hidden from screen readers.' },
    ],
  },
  toast: {
    summary:
      'Radix toasts in a `region` named "Notifications (F8)". Each toast is read out when it appears: errors and warnings at once (`aria-live="assertive"`), the others politely. Give an action `altText` that says how to do the same without the toast ("Undo with Ctrl+Z"): Radix reads it instead of the button, which a screen reader user may not reach in time; without it the label is used. The close button is named "Close". Hovering or focusing the stack pauses the timers; a swipe to the right dismisses. The `countdown` bar is `aria-hidden` and hidden under reduced motion, so give the action an `altText` with the keyboard way to undo.',
    keyboard: [
      { keys: ['F8'], action: 'Moves focus to the toasts.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves through the toasts and their buttons.' },
      { keys: ['Esc'], action: 'Closes the focused toast.' },
    ],
  },
  toggle: {
    summary:
      'A Radix toggle: a `button` with `aria-pressed`. An `iconOnly` toggle needs an `aria-label`; keep the label the same whether it is on or off, since `aria-pressed` carries the state.',
    keyboard: [{ keys: ['Enter', 'Space'], action: 'Presses or releases the toggle.' }],
  },
  tooltip: {
    summary:
      'A Radix tooltip. While open, the trigger is described by it (`aria-describedby`) and a hidden copy with `role="tooltip"` holds the label and the shortcut. It describes the trigger but doesn’t name it, so an icon-only trigger still needs an `aria-label`. The trigger must be focusable.',
    keyboard: [
      { keys: ['Tab'], action: 'Focusing the trigger opens the tooltip at once.' },
      { keys: ['Esc'], action: 'Closes it.' },
    ],
  },
  'agent-picker': {
    summary:
      'A Button that opens a Radix dropdown menu: the trigger has `aria-haspopup="menu"` and `aria-expanded` and reads the current agent’s name (or "Choose an agent"). The agents are `menuitemradio` rows in a radio group, the current one `aria-checked`; "New agent" is a plain `menuitem`. Avatars and the check are hidden. The menu is not modal: the page behind stays reachable to screen readers.',
    keyboard: [
      { keys: ['Enter', 'Space', '↓'], action: 'On the trigger: opens the menu and focuses the first item.' },
      { keys: ['↑', '↓'], action: 'Moves between agents.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last item.' },
      { keys: ['A–Z'], action: 'Moves to the next agent whose name starts with the typed letters.' },
      { keys: ['Enter', 'Space'], action: 'Picks the focused agent and closes the menu.' },
      { keys: ['Esc'], action: 'Closes the menu and returns focus to the trigger.' },
    ],
  },
  attachment: {
    summary:
      'The chip is a `button` that runs `onOpen`, named by the file name (and its meta on `lg`); the built-in file icons are hidden. The remove button is named "Remove <name>". A `preview` opens in a hover card on hover or focus, which keyboard and screen-reader users can’t move into, so offer the same content through `onOpen`. Inside `AttachmentPreview` the scroll area is a focusable region named "Preview of <name>", the pager buttons are "Previous section" and "Next section" with a polite page count, and the sheets are a `tablist` named "Sheets".',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'Opens the file, or removes it from the remove button.' },
    ],
  },
  'agent-suggestion': {
    summary:
      'A `section`, labelled by `title` when there is one, so it is a region landmark. In `AgentSuggestionDiff` the old text is a `del` and the new an `ins`, read as "Remove:" and "Add:". `AgentSuggestionChanges` is a description list with the arrows hidden, and `AgentSuggestionMetric`’s bar is a Progress named by `unit`. The actions are your own buttons; name them by what they do ("Send email").',
  },
  'agent-changes-review': {
    summary:
      'Each card is a `role="group"` named by its field. Accept is a toggle button with `aria-pressed` (its visible text "Accept" starts its name) and Dismiss a plain button, both named after the change ("Accept Stage change", "Dismiss Stage change", `acceptFieldChange` and `rejectFieldChange` in SatinLabels; a change whose `field` isn\'t a string needs a `label`); with `control="checkbox"` the card\'s Checkbox carries the Accept name. Dismiss takes the card out: focus moves first to the next card\'s Accept, or to Accept all or Apply when no card is left below, the leaving card is `inert`, and "Value change dismissed" (`fieldChangeRejected`) is read out. Under reduced motion the card goes without the slide. Accepted is `aria-pressed` and the pressed fill, never colour alone. A change\'s source is a `q`, so its quotation marks follow the page\'s language; the logo is decorative. The old value is a `del`, the arrow hidden. Accept all and "Applying changes…" are also read out from a polite `status` region. While applying, Apply is `aria-busy` (it keeps focus) and the cards are disabled. Once applied, the suggestion leaves: focus goes to `returnFocus()`, or to the page\'s body when the app gives none, the suggestion turns `inert`, and "2 changes applied" is read out from a polite `status` region on the body, which outlives it. A rejected value turns text/muted, a Badge grey, so its text keeps its contrast.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves through each card\'s Dismiss and Accept (or its Checkbox), then Accept all and Apply.' },
      { keys: ['Enter', 'Space'], action: 'On Accept: accepts, or makes the card pending again when pressed. On Dismiss: takes the card out and moves focus on. On a Checkbox, Space accepts or rejects.' },
    ],
  },
  'decision-card': {
    summary:
      'A `role="group"` labelled by the title. The answers follow `type`: `radio` is a Radix radio group, `checkbox` a list of Checkboxes, `chips` buttons with `aria-pressed`, `ranking` an ordered list of focusable rows announced as "sortable item" with the hint "Alt and arrow keys to move", and `draft` the text that Rewrite (`aria-pressed`) turns into a textarea named "Draft". After a move, a polite live region reads the row’s new place ("Budget, position 2 of 4"). The step buttons are named "Previous question" and "Next question" and the step count is a polite live region. In `summary`, Change is named "Change <title>".',
    keyboard: [
      { keys: ['↑', '↓', '←', '→'], action: '`radio`: moves to the previous or next answer and picks it.' },
      { keys: ['Space'], action: '`checkbox`: checks or unchecks the answer. `chips`: picks or drops the chip (Enter works too).' },
      { keys: ['↑', '↓'], action: '`ranking`: moves focus to the row above or below.' },
      { keys: ['Alt+↑', 'Alt+↓'], action: '`ranking`: moves the focused row up or down and reads its new place.' },
    ],
  },
  'agent-loading': {
    summary:
      'A `role="status"` region with `aria-live="polite"`: screen readers read the label ("Thinking…") and read it again when it changes. `time` is hidden from screen readers, so a clock that ticks every second stays quiet. Mount the component before the work starts, or it may not be announced: a live region filled at the moment it appears is the one screen readers miss most. The tetris mark and the bird are hidden, and under reduced motion they stop moving.',
  },
  message: {
    summary:
      'A plain `div`; the `role` prop picks the layout (`user` or `assistant`) and is not an ARIA role, so nothing says who is speaking. Add it yourself (a visually hidden "You said" or the agent’s name), and put the conversation in a `role="log"` region if new turns should be read out. A `source` with `href` is a link. The assistant turn adds a folded Thinking and MessageActions.',
  },
  citations: {
    summary:
      '`Citation` is a link named "Source 2: <title>" (`aria-label` overrides it) that opens its source in a new tab; without `href` it is not focusable. Its preview is a hover card that opens on hover or focus and can’t be reached by keyboard, so keep the quote in the Sources list too. `Sources` is a `button` with `aria-expanded` and `aria-controls` over an ordered list of links; while folded, the list is hidden from the tab order and screen readers.',
    keyboard: [
      { keys: ['Tab'], action: 'Focusing a citation opens its preview after a short delay.' },
      { keys: ['Esc'], action: 'Closes the preview.' },
      { keys: ['Enter', 'Space'], action: 'On Sources: opens or folds the list.' },
    ],
  },
  'message-actions': {
    summary:
      'A row of buttons with no role of its own. Like and dislike are icon buttons named "Good response" and "Bad response" with `aria-pressed`; copy is named "Copy"; Share has a visible label. The delivery icon is hidden and replaced by "Sending" or "Delivered" for screen readers. Copying gives no spoken feedback, so confirm it yourself (a toast).',
    keyboard: [{ keys: ['Enter', 'Space'], action: 'Presses the focused button; a pressed thumb is released by pressing it again.' }],
  },
  'prompt-bar': {
    summary:
      'A `form`. The text field is a `textarea` named "Message". The + button is named "Add to conversation" and opens a panel with the same name: a search `combobox` named "Search agents and tools" over a `listbox` named "Agents and tools", and an "Add an agent" button. The model button reads "Model: <name>" and opens a menu of `menuitemradio` rows. Dictation is named "Dictate" or "Stop dictation" with `aria-pressed`; Send is named "Send" and stays disabled until there is text or a file. Attachments are a list named "Attachments", each with a "Remove <name>" button.',
    keyboard: [
      { keys: ['Enter'], action: 'In the field: sends the message (not while an input method is composing, nor while the @ or / menu is open, where it picks the highlighted row).' },
      { keys: ['Shift+Enter'], action: 'In the field: adds a line.' },
      { keys: ['↑', '↓'], action: 'In the + panel’s search: moves the highlight, wrapping at the ends.' },
      { keys: ['Enter'], action: 'In the + panel’s search: runs the highlighted row.' },
      { keys: ['Esc'], action: 'Closes the open panel or menu, the @ or / menu first.' },
    ],
  },
  'streaming-text': {
    summary:
      'The whole text received is in the DOM from the start (letters not yet written are only transparent), so screen readers get it at once, and the box is `aria-busy` while it streams. It is not a live region, so arriving text isn’t read out on its own. The caret is hidden. Under reduced motion it shows everything received straight away.',
  },
  thinking: {
    summary:
      'The header is a `button` with `aria-expanded` and `aria-controls`, named by the summary ("Thought for 2m 45s"). The steps are an ordered list; folded, they stay mounted but leave the tab order and screen readers. The mark, chevron and rail are hidden, and so is a task’s check.',
    keyboard: [{ keys: ['Enter', 'Space'], action: 'Opens or folds the steps.' }],
  },
  'kanban-board': {
    summary:
      'Each column\'s cards are a list named after the column and its count ("Interview, 6 of 8 cards"; past the limit, "7 cards, over the limit of 6"). Every card is a focusable list item named by `getItemLabel`, described as a "draggable card" with how to move it from the keyboard. Moves are read out from a polite `status` region: "Picked up Tara Mendes. Screening, position 1 of 12.", each step, then "Moved Tara Mendes to Interview, position 2 of 7" or "Move cancelled". Dragging has a single-pointer alternative (WCAG 2.5.7): a card\'s ⋯ menu moves it to another column, or up and down. The Undo toast is read out like any toast. Every word is in SatinLabels (`kanbanBoardLabels`). Give the board an `aria-label` to make it a named region.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves through the cards and the buttons in them, column by column.' },
      { keys: ['↑', '↓', '←', '→'], action: 'Moves focus to the card above or below, or to the nearest card in the next column; mirrored right to left.' },
      { keys: ['Home', 'End'], action: 'Moves focus to the first or last card in the column.' },
      { keys: ['Space'], action: 'Picks up the focused card, and drops it where it is.' },
      { keys: ['↑', '↓'], action: 'With a card picked up: moves it one place up or down in its column.' },
      { keys: ['←', '→'], action: 'With a card picked up: moves it to the previous or next column (collapsed ones are skipped); mirrored right to left.' },
      { keys: ['Home', 'End'], action: 'With a card picked up: moves it to the top or bottom of its column.' },
      { keys: ['Esc'], action: 'Puts a picked-up card back where it was, also during a pointer drag.' },
    ],
  },
  'agent-presence': {
    summary:
      'The edge and the label are hidden from screen readers; what they show is read out from a polite `status` region instead: "Hiring assistant is updating Tara Mendes" as the agent starts on a target or moves to the next, "Hiring assistant updated Lena Fischer" when it\'s done, and "Jon Park is editing Omar Haddad; Hiring assistant is waiting" in a conflict (`agentPresenceWorking`, `agentPresenceDone`, `agentPresenceConflict` in SatinLabels). `label` names the target in those sentences, so give it the row\'s or card\'s name. Each state has its own words on the label, so colour is never the only cue, and a conflict\'s edge is dashed. It takes no focus and no pointer, and never changes the target, so nothing moves under it. Under reduced motion it neither fades nor glides and the mark stands still.',
  },
  'data-grid': {
    summary:
      'A `grid` (APG Grid pattern) named by `label`, with `aria-rowcount` and `aria-colcount` and each row and cell numbered, so the count stays right while only the rows on screen exist. One cell at a time is in the tab order; a sortable header holds a `button` and sets `aria-sort`. With `selectable` the grid is `aria-multiselectable` and rows set `aria-selected`; the checkboxes are named "Select <name>" after the first column or `rowLabel`. Each resize handle is a focusable `separator` named "Resize <column>" with its width as `aria-valuenow`. An editor is named after its column. A saving cell is `aria-busy`; a failed one is `aria-invalid` and described by its error. Sorting, saves and views are read out from a polite `status` region. The Columns menu is a menu of `menuitemcheckbox` rows; the view menu says "View: <name>, unsaved changes" when the grid has moved from the view.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves into the grid, onto the cell last focused. From a header, moves on to its resize handle; Tab again leaves the grid.' },
      { keys: ['←', '→', '↑', '↓'], action: 'Moves one cell; ← and → are mirrored right to left. The header row is part of the grid.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last cell of the row; with ⌃ or ⌘, of the grid.' },
      { keys: ['Page Up', 'Page Down'], action: 'Moves up or down by a screen of rows.' },
      { keys: ['Enter', 'Space'], action: 'On a sortable header: sorts ascending, then descending, then not at all. On a checkbox (Space): selects the row, or every row.' },
      { keys: ['⇧ Space'], action: 'Selects or clears the focused cell’s row.' },
      { keys: ['Enter', 'F2'], action: 'On an editable cell: opens its editor (double click does too). On a cell whose save failed: edits the value that failed.' },
      { keys: ['Enter', 'Tab'], action: 'In an editor: saves. Tab then moves to the next cell, ⇧ Tab to the previous one.' },
      { keys: ['Esc'], action: 'In an editor: cancels. On a cell whose save failed: drops the change.' },
      { keys: ['←', '→'], action: 'On a resize handle: narrows or widens the column by 8px (40px with ⇧); Home and End go to its narrowest and widest. Enter or Esc goes back to the header.' },
      { keys: ['⌥ ↑', '⌥ ↓'], action: 'In the Columns menu: moves the highlighted column up or down.' },
    ],
  },
  'search-scoped': {
    summary:
      'The input is a `combobox` (named "Search" through `searchField`, or your `aria-label`) that controls a `listbox` named "Search results"; the highlighted row is its `aria-activedescendant`, so focus stays in the query. Rows sit in a `group` per section, named by its heading with the count read as words ("Candidates, 6 results"). The chips are described to the input (`aria-describedby`), so the filters are heard without leaving the query; each chip has a remove button ("Remove Stage: Interview"). A polite `status` says "Filter added: …" or "Filter removed: …", and the result count once typing settles. The footer of key hints is hidden from screen readers. Every word is in SatinLabels (`scopedSearch*`).',
    keyboard: [
      { keys: ['⌘K', 'Ctrl+K'], action: 'Focuses the query and opens the list, from anywhere on the page, unless `hotkey` is off.' },
      { keys: ['↑', '↓'], action: 'Moves the highlight through the list, wrapping at the ends; ↓ opens a closed list. No motion.' },
      { keys: ['Enter'], action: 'Runs the highlighted row: a recent search fills the query, a scope types `key:`, a value makes its chip, a result calls `onSelect` and closes the list.' },
      { keys: ['Space'], action: 'After a `key:value`, turns it into a chip.' },
      { keys: ['Backspace'], action: 'At the start of the query, removes the last chip.' },
      { keys: ['Esc'], action: 'Closes the list and keeps the query; with the list closed, clears the words.' },
      { keys: ['Shift+Tab'], action: 'From the query, to the chips’ remove buttons.' },
    ],
  },
  stepper: {
    summary:
      'An ordered list (`role="list"`, so it stays a list without bullets) named by `aria-label`. The current step has `aria-current="step"`. A complete or failed step says so after its label, "Details, Completed" or "CV, Error" (`stepCompleted` and `stepError` in SatinLabels); the circles and their numbers are hidden, since the list gives each step its place. Linear, the steps are plain text; with `linear={false}` each is a `button` named by its label and described by its description, and a disabled step is a disabled button. Narrow, the list gives way to a `progressbar` named by the current step and read as "Step 3 of 4" (`stepOf`).',
    keyboard: [
      { keys: ['Tab'], action: 'With `linear={false}`: moves through the steps that aren’t disabled. Linear steps take no focus.' },
      { keys: ['Enter', 'Space'], action: 'With `linear={false}`: makes the focused step current.' },
    ],
  },
  'agent-undo-log': {
    summary:
      'A `section` named "Agent actions" (`actionLog` in SatinLabels, or your `aria-label`), so it is a region landmark, around a list of runs. Each run\'s header is a `button` with `aria-expanded` and `aria-controls`, read as its name, how many actions and when; a closed run\'s actions leave the accessibility tree. Every Revert is an icon button named after its action and target ("Revert Edited src/routes/auth.ts"), with a tooltip, and stays the one focused button through the revert: busy (`aria-busy`) while it runs, then Restore, or Reverted with `aria-disabled`, or Try again after a failure, whose reason is shown as text. An action that can\'t be reverted has no button (its lock is hidden); its reason is read with "Can\'t be reverted:" before it. The glyphs and the rail are hidden. Failures and restores are read from a polite `status` region; a revert is read out by its toast, whose Undo screen readers hear as "Restore it from the action log", since the row\'s Restore does the same. The button of the run ⌘Z would revert carries `aria-keyshortcuts` and shows the keys as Kbd. Reverted rows are struck through and muted, and say so in their button.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves through the run headers, the Revert run buttons and the open runs\' Revert buttons.' },
      { keys: ['Enter', 'Space'], action: 'On a run header: opens or closes its actions. On a button: reverts, restores or tries again.' },
      { keys: ['⌘Z', 'Ctrl+Z'], action: 'Reverts what is left of the newest run and opens it: ⌘Z on Apple, Ctrl+Z elsewhere. Anywhere on the page by default (`shortcut="log"`: only while focus is in the log). Left alone while typing in a field, and when there is nothing left to revert.' },
    ],
  },
  'command-pages': {
    summary:
      'Everything CommandMenu has (a Radix dialog, the search as a `combobox` pointing at the highlighted `option`), plus: on a sub-page a `Breadcrumb` (a `nav` named "Breadcrumb", the current page `aria-current="page"`, earlier pages as buttons) sits above the search, and a polite `status` region reads out each page\'s name with "Backspace goes back" (`commandPageOpened` in SatinLabels) as it opens, and the page\'s name on the way back. The ask row is an option named \'Ask the agent about "…"\' (`commandAskAbout`) under an "Agent" heading. On the agent\'s page the search stops pointing at a list (`aria-expanded="false"`); the answer is a focusable `region` named after the question, AgentLoading says "Thinking…", and the same status region reads the whole answer once it is complete. The key hints, ⌫ Back included, are hidden from screen readers, which hear the hint with each page instead. A row\'s kind icon (a person, a company) is decorative: its label and the group\'s heading say what it is. A completed command\'s `success` toast is read out by the Toaster\'s polite region after the menu closes and focus is back where it was.',
    keyboard: [
      { keys: ['↑', '↓'], action: 'Moves the highlight, wrapping at the ends.' },
      { keys: ['Enter'], action: 'Runs the highlighted row: opens its page, runs it and closes the menu, or asks the agent. On the agent\'s page, asks the follow-up in the search.' },
      { keys: ['Backspace'], action: 'In the empty search, goes back one page and puts back the search you had there. Held down, it goes back only once.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Move between the breadcrumb\'s buttons, the search and the answer; focus stays in the menu while it is modal.' },
      { keys: ['Esc'], action: 'Closes the menu from any page and returns focus to where it was; it opens again on the first page.' },
    ],
  },
  'time-picker': {
    summary:
      'TimePicker\'s field is a `combobox` named by its label and described by a format hint ("Type a time like 2:30 PM", `timeHint` in SatinLabels) and by the hint or error. Focus stays in it while the `listbox` of times is open; `aria-activedescendant` follows the highlighted time. Each time is an `option`: the picked one `aria-selected`, unavailable ones `aria-disabled`. Typed text that isn\'t an available time sets `aria-invalid` and says why under the field (`timeInvalid`, `timeUnavailable`). The chevron, "Show times", is out of the tab order. DateTimePicker\'s field is a `button` that opens the Calendar (as on Date picker) with the times as a `listbox` named "Time"; picking a day with no time yet moves focus to the times.',
    keyboard: [
      { keys: ['↓', '↑'], action: 'On the field: opens the list on the picked time, then moves to the next or previous available time.' },
      { keys: ['Alt+↓', 'Alt+↑'], action: 'Opens or closes the list without moving the highlight.' },
      { keys: ['Page Down', 'Page Up'], action: 'Moves an hour on or back.' },
      { keys: ['Home', 'End'], action: 'In TimeList and the date-and-time panel: the first or last available time. In the field they move the caret.' },
      { keys: ['0–9', 'A', 'P'], action: 'Type-ahead: the list jumps to the time typed so far ("14", "2p"). In a TimeList a second\'s pause starts over.' },
      { keys: ['Enter'], action: 'Picks the highlighted time once the arrows or the pointer moved there; otherwise reads what was typed ("930", "9:30pm"). In a TimeList, Space picks too.' },
      { keys: ['Esc'], action: 'Closes the list and leaves focus in the field. With the list closed, puts back the time the field showed.' },
      { keys: ['Tab'], action: 'Reads what was typed, closes the list and moves on.' },
    ],
  },
  'tool-call': {
    summary:
      'The header is a `button` with `aria-expanded` and `aria-controls`, named by the tool, its target and the status ("Find slots calendar.findSlots Running"); the clock that ticks while it runs is hidden. Folded, the body stays mounted but leaves the tab order and screen readers. Each section is named after the tool ("Find slots Input code"), so two cards’ code never shares a name. A call that ends while the card is on screen is read out politely ("Find slots Failed"); Retry hands focus back to the header, since it leaves with the error.',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the header: opens or folds the card.' },
      { keys: ['Tab'], action: 'Open, moves through each section’s Copy and code, Show all, and Retry.' },
      { keys: ['←', '→'], action: 'Scrolls long lines while a section’s code has focus.' },
    ],
  },
  'agent-permissions': {
    summary:
      'A `role="group"` named by its title ("Recruiting agent wants to:") and described by `description`. The scopes are a list; each row is the label of its Checkbox, named by a plain verb and the resource ("Read candidates") and described by its detail, and a scope that sends adds ", Sends as you" to its name. Focus starts on Don’t allow, the safest answer, inside a Dialog (`autoFocus` elsewhere; it never takes focus from someone typing in a chat). After an answer, focus moves to the summary’s button (or the summary) and a polite `status` region reads the answer ("Always allowed: Read candidates, Write notes"); Change brings focus back to Don’t allow. While `onAllow`, `onDeny` or `onRevoke` runs, its button is `aria-busy` and the rest are disabled. The summary is a group named "Recruiting agent · Always allowed".',
    keyboard: [
      { keys: ['Tab'], action: 'Moves through the scopes’ checkboxes, then Don’t allow, Allow once and its arrow.' },
      { keys: ['Space'], action: 'On a scope: ticks or unticks it.' },
      { keys: ['Enter', 'Space'], action: 'On a button: answers, removes access, or brings the request back (Change).' },
      { keys: ['Enter', 'Space', '↓'], action: 'On the arrow: opens the menu with Always allow.' },
      { keys: ['↑', '↓'], action: 'Moves in the menu; Enter picks, Esc closes it and returns to the arrow.' },
    ],
  },
  'prompt-mentions': {
    summary:
      'Focus stays in the "Message" `textarea`, which follows the combobox pattern without its role (HTML allows no role on a textarea): it has `aria-autocomplete="list"`, and while the menu shows rows, `aria-controls` names the `listbox` ("Mentions" or "Commands") and `aria-activedescendant` names the highlighted `option`. The text is the field’s own, so a token reads as what it says, "@Tara Mendes", and spelling, selection and input methods work as in any field; the tokens’ fills are a hidden layer under it. A `status` region says how many suggestions there are, "No results for “@zz”", and "@Tara Mendes added" or "removed". While an input method composes, no menu opens and no key is taken. The menu’s rows are hidden from the tab order; the panel is named like its list. The menu lives only while focus is in the field: the + button, the model menu, dictation or Send take focus and close it, and @ or / typed in the + panel’s search is that search’s text. Escape closes the menu alone, not a dialog the bar sits in.',
    keyboard: [
      { keys: ['@', '/'], action: 'At the start or after a space: opens the mentions or the commands. The text typed after it filters them.' },
      { keys: ['↑', '↓'], action: 'In the open menu: moves the highlight, wrapping at the ends.' },
      { keys: ['Enter', 'Tab'], action: 'In the open menu: inserts the highlighted row as a token, followed by a space.' },
      { keys: ['Esc'], action: 'Closes the menu until the next @ or /.' },
      { keys: ['Backspace'], action: 'Right after a token: removes the whole token. Delete does the same just before one.' },
      { keys: ['←', '→'], action: 'Steps over a token in one move.' },
      { keys: ['Enter'], action: 'With the menu shut or empty: sends; a message with a command runs it.' },
    ],
  },
  'table-pro': {
    summary:
      'Table as it is (named by `label`, `aria-sort` on sortable headers, named checkboxes), plus: with sub-rows or groups the `table` takes `role="treegrid"`, and its body rows carry `aria-level`, `aria-posinset`, `aria-setsize`, `aria-expanded` when they open and `aria-selected` when `selectable`. One row is in the Tab order at a time; the row checkboxes stay in it too, as in Table. Each chevron is a button named "Rows under <name>" with `aria-expanded`, left out of the Tab order because the row\'s keys do the same. A group header\'s name is its row header and its count reads "3 rows"; the totals row sits in a `tfoot` with a "Total" row header. The pinned column\'s shadow is decoration.',
    keyboard: [
      { keys: ['↓', '↑'], action: 'Moves to the next or previous row, group headers included.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last row.' },
      { keys: ['→'], action: 'Opens a closed row or group; on an open one, moves to its first row. Mirrored right to left.' },
      { keys: ['←'], action: 'Closes an open row or group; otherwise moves to the row or group it sits under. Mirrored right to left.' },
      { keys: ['Enter'], action: 'Opens or closes the row or group.' },
      { keys: ['Space'], action: 'With `selectable`, picks or drops the row, or every row of a group.' },
      { keys: ['Enter', 'Space'], action: 'On a sortable header: sorts ascending, then descending, then not at all, inside each group.' },
    ],
  },
  'toast-batch': {
    summary:
      'A toast like any other, read out as it arrives with its Undo replaced by "Undo with ⌘Z" (`undoWithShortcut`), since a screen reader user may not reach the button in time. When items join or are undone, the new title is read once at the end of the burst ("6 candidates moved"), from a polite `status` region; the rolling digits are hidden and the number is there as text. Show is a disclosure button (`aria-expanded`, `aria-controls`) for a list named by the title. Each item\'s Undo is named after the change and the item ("Undo move of Tara Mendes"); once undone it says "Tara Mendes, Undone", keeps the focus and is `aria-disabled`. When ⌘Z empties the batch with focus on its Undo, focus moves to Show.',
    keyboard: [
      { keys: ['⌘Z', 'Ctrl+Z'], action: 'Undoes the newest batch on screen, unless focus is in a text field.' },
      { keys: ['Enter', 'Space'], action: 'On Show, opens or folds the list; on an Undo, undoes the batch or that item.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves through Show, Undo, Close, then the items\' Undo buttons.' },
      { keys: ['F8'], action: 'Moves focus to the toasts.' },
    ],
  },
  'activity-timeline': {
    summary:
      'The timeline is a `group` named "Activity" (`activity` in SatinLabels), since it has no visible heading; pass `aria-labelledby` when a heading of yours names it. Each day is an ordered list named after the day ("Today"); without days it is one list. Times are `<time>` elements whose text for screen readers is the full date and time, not "5 min. ago". A folded run is a `button` with `aria-expanded` and `aria-controls`, named by its summary ("Agent made 4 changes"). Revert is named after the change ("Revert salary range change", from the entry\'s `label`), or after the entry\'s sentence without one; while it runs the entry is `aria-busy`. Once reverted, focus moves to the entry, which says "Reverted by you", and the toast with Undo is read out like any toast. Avatars and the rail are hidden from screen readers: the sentence names the actor. New entries are not announced; when they arrive live, say so from your own status region.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves through the run buttons and Revert buttons, newest first.' },
      { keys: ['Enter', 'Space'], action: 'On a run: opens or folds its entries. On Revert: reverts the change.' },
      { keys: ['F8'], action: 'Moves to the toast after a revert, to reach Undo (the Toaster\'s hotkey).' },
    ],
  },
  'filter-bar': {
    summary:
      'A `group` named "Filters" (`filterBar` in SatinLabels). Each chip is a button named in words, "Value greater than €20,000" (`filterOperatorName` reads symbols out), that opens its editor: a Popover dialog named after the field, whose operator control is named after the field ("Stage") and value control after both ("Stage is"). A chip that can\'t apply is described by why ("Check the range"). Its remove button is named "Remove Stage is Interview". A polite `status` region reads the result count once it settles and which chip was removed; the rolling digits are hidden from screen readers.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves through the search, each chip and its remove button, `+ Filter`, the views menu and Save view.' },
      { keys: ['Enter', 'Space'], action: 'On a chip: opens its editor, focus on the value. On `+ Filter`: opens the fields.' },
      { keys: ['Backspace', 'Delete'], action: 'On a chip: removes it; focus moves to the chip that takes its place, or to `+ Filter`.' },
      { keys: ['Backspace'], action: 'In the empty search: removes the last chip; focus stays in the search.' },
      { keys: ['Enter'], action: 'In an editor\'s text or number field: keeps the value and closes the editor. A pick from a single-choice list or a calendar closes it too.' },
      { keys: ['Esc'], action: 'Closes the editor as it is, focus back on its chip. A new chip still without a value goes, focus back on `+ Filter`.' },
      { keys: ['F'], action: 'Opens `+ Filter` while focus is in the bar or the list it filters (not while typing). Set with `shortcut`, or `false` for none.' },
    ],
  },
  'agent-plan': {
    summary:
      'A `role="group"` named by the title, around an ordered list named "Plan" (`agentPlan` in SatinLabels). In a draft each step’s label is a button named by the label and described as "Press to rename. Alt and arrow keys to move"; pressing it turns the label into a field named "Step 2". Its × is named "Remove <step>"; after a removal focus goes to the next step’s × and the live region says "<step> removed". The step’s number is hidden, since the list already gives the position, and dragging it is pointer-only: a pointer that can’t drag has no other way to reorder (see Known gaps). Once it runs, each step says where it is to screen readers ("Done", "In progress", "Not started", "Failed", "Skipped") beside its hidden icon, and the current one has `aria-current="step"`; the AgentLoading in it keeps quiet. One polite live region reads out a step finishing ("Find open slots, done"), a failure, the end ("3 steps done") and a step’s new place after a move. Retry is described by the error. When the focused button goes away (Run, Retry, Skip, Stop), focus moves to the list.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves through each step’s label and ×, then Run plan.' },
      { keys: ['Enter', 'Space'], action: 'On a label: renames the step. On ×: removes it.' },
      { keys: ['Alt+↑', 'Alt+↓'], action: 'With focus anywhere in a step: moves it up or down and reads out its new place.' },
      { keys: ['Enter'], action: 'In the rename field: keeps the new name and returns to the label (an empty name keeps the old one).' },
      { keys: ['Esc'], action: 'In the rename field: keeps the old name and returns to the label.' },
    ],
  },
  'review-queue': {
    summary:
      'A `section` named after its `title` ("Review queue" without one). The item on show is a `group` named after it and its place ("Anna Kowalska, 4 of 12"); when it changes, a polite `status` region reads the new name and place, with the decision before it ("Approved. Jonas Weber, 5 of 12"). If focus was on the item, it moves to the new one, which reads itself instead. The bar is a `progressbar` named "Reviewed" with the value "3 of 12 reviewed". Skip, Edit and Approve name their keys with `aria-keyshortcuts`; the Kbd on them is hidden. On an approved item, or while Approve runs, the actions are `aria-disabled` and keep focus. Edit opens a Sheet (a dialog named "Edit", or `editTitle`, with the item as its description); closing it puts focus back where it was. When all are decided, focus that was in the queue moves to the summary\'s heading, and the summary is a region named "All reviewed". Over its list, a SegmentedControl (radios "Approved 9" and "Skipped 3"; arrow keys move between them, Enter or Space picks) picks what the list shows; the list is named after it ("Approved"), and `itemMedia` beside each name is hidden, since the name says who.',
    keyboard: [
      { keys: ['J', 'K'], action: 'Next or previous item, while focus is in the queue and not in a field.' },
      { keys: ['A'], action: 'Approves the item and moves on to the next undecided one.' },
      { keys: ['S'], action: 'Skips the item and moves on.' },
      { keys: ['E'], action: 'Opens the editor Sheet; Esc or Cancel closes it on the same item.' },
      { keys: ['Tab'], action: 'Moves through ‹ ›, the item\'s own controls, then Skip, Edit and Approve.' },
    ],
  },
  'people-picker': {
    summary:
      'Combobox\'s roles, with people in them: each option is named by the person and their role, "Marta Nowak, Hiring manager" (a hidden comma joins them; the avatar is hidden). Recent and every titled group are `group`s named by their headers. While a search runs the last results stay, narrowed by the query; one that takes longer than 300 ms marks the list `aria-busy`. "Searching…", "No one matches" or a failed search are read out from a `status` region. A disabled person is `aria-disabled`. Each chip has a "Remove <name>" button; after a removal focus moves to the chip that takes its place, or to the field. The "+N" chip is a button named "Show N more"; it shows the rest and moves focus to the first of them.',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the field: opens the list and focuses the search.' },
      { keys: ['A–Z'], action: 'In the search: filters by name, role and email, ignoring accents, or runs `search` after a pause.' },
      { keys: ['↑', '↓'], action: 'Moves the highlight across the groups, wrapping at the ends.' },
      { keys: ['Enter'], action: 'Picks the highlighted person and, with `multiple`, drops one already picked; a single pick closes the list.' },
      { keys: ['Esc'], action: 'Closes the list and returns focus to the field.' },
      { keys: ['Tab'], action: 'Out of the field, through the chips\' remove buttons and the "+N" chip.' },
    ],
  },
  'agent-changes-review': {
    summary:
      'Each card is a `role="group"` named by its field. Accept is a toggle button with `aria-pressed` (its visible text "Accept" starts its name) and Dismiss a plain button, both named after the change ("Accept Stage change", "Dismiss Stage change", `acceptFieldChange` and `rejectFieldChange` in SatinLabels; a change whose `field` isn\'t a string needs a `label`); with `control="checkbox"` the card\'s Checkbox carries the Accept name. Dismiss takes the card out: focus moves first to the next card\'s Accept, or to Accept all or Apply when no card is left below, the leaving card is `inert`, and "Value change dismissed" (`fieldChangeRejected`) is read out. Under reduced motion the card goes without the slide. Accepted is `aria-pressed` and the pressed fill, never colour alone. A change\'s source is a `q`, so its quotation marks follow the page\'s language; the logo is decorative. The old value is a `del`, the arrow hidden. Accept all, "Applying changes…" and "2 changes applied" are also read out from a polite `status` region. While applying, Apply is `aria-busy` and the cards are disabled; once applied, Apply keeps focus as an `aria-disabled` "Applied" and each card says "Applied" or "Not applied" to screen readers. A rejected value turns text/muted, a Badge grey, so its text keeps its contrast.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves through each card\'s Dismiss and Accept (or its Checkbox), then Accept all and Apply.' },
      { keys: ['Enter', 'Space'], action: 'On Accept: accepts, or makes the card pending again when pressed. On Dismiss: takes the card out and moves focus on. On a Checkbox, Space accepts or rejects.' },
    ],
  },
  'date-availability': {
    summary:
      'Calendar\'s grid, one tab stop, with each day a `button` named by its full date and what it offers: "Thursday, November 26, 2026, 3 free slots", or why it can\'t be picked ("…, Fully booked", or the app\'s `reason`). A full day has `aria-disabled` instead of `disabled`, so the arrow keys reach it and its tooltip opens there; Enter and clicks do nothing. The dots are hidden from screen readers, and the tooltip isn\'t added as a description, since the name already says it. Few slots read as a ring, not only a colour. Translate the words with `availabilitySlots`, `availabilityFreeSlots`, `availabilityFull` and `availabilityDay` in SatinLabels.',
    keyboard: [
      { keys: ['←', '→'], action: 'Moves a day back or forward, onto full days too, turning the month when needed; mirrored right to left.' },
      { keys: ['↑', '↓'], action: 'Moves a week back or forward.' },
      { keys: ['Page Up', 'Page Down'], action: 'Moves a month back or forward.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or the last day of the week (from the locale, or `weekStartsOn`).' },
      { keys: ['Enter', 'Space'], action: 'Picks the focused day if it has free slots.' },
      { keys: ['Esc'], action: 'Closes the open tooltip; in AvailabilityDatePicker, a second Esc closes the calendar and returns focus to the field.' },
    ],
  },
  scheduler: {
    summary:
      'Day and Week are a `grid` named after the period and the time zone ("November 15 – 21, 2026, Central European Standard Time"): a column header per day (today with `aria-current="date"`), a row header per slot, and a `gridcell` per slot named with its day and time, "busy" or "free", and the events in it; picked slots are `aria-selected`. The time column\'s header gives the zone\'s long name. Month is a `grid` of day cells named with the date and how many events. Events are `button`s named with their title and full time, described by their attendees and how to move them; they sit in their slot, reached from the grid with Enter. Moves, resizes, picks and period changes are read out from a polite `status` region. Dragging works from the keyboard too (Alt and the arrows), so no move needs a pointer.',
    keyboard: [
      { keys: ['Tab'], action: 'Moves into the grid, onto the last slot (or day) focused, and on out.' },
      { keys: ['←', '→'], action: 'Grid: the slot on the previous or next day, paging past the period\'s ends; mirrored right to left.' },
      { keys: ['↑', '↓'], action: 'Grid: the previous or next slot (the all-day row above the first); Month: the week before or after.' },
      { keys: ['Home', 'End'], action: 'Grid: the first or last day shown (Ctrl: the all-day row, the last slot).' },
      { keys: ['Page Up', 'Page Down'], action: 'Grid: the previous or next week, day or month.' },
      { keys: ['Shift+↑', 'Shift+↓'], action: 'Grid: stretches a pick over more slots of the day; Enter picks them.' },
      { keys: ['Enter', 'Space'], action: 'Grid: on an empty slot, picks it (`onSlotSelect`, and `slotPopover`); on an event\'s slot, moves to the event. Shift+Enter always picks. On an event: opens it (`onEventOpen`, and `eventPopover`).' },
      { keys: ['Alt+←', 'Alt+→'], action: 'Event: moves it a day earlier or later, at the same time.' },
      { keys: ['Alt+↑', 'Alt+↓'], action: 'Event: moves it a slot earlier or later (Month: a week).' },
      { keys: ['Alt+Shift+↑', 'Alt+Shift+↓'], action: 'Event: ends it a slot earlier or later, never shorter than one slot.' },
      { keys: ['↑', '↓'], action: 'Event: the previous or next event that day (Month: and "3 more").' },
      { keys: ['Esc'], action: 'Event: back to its slot in the grid. Grid: clears the pick. While dragging: puts the event back.' },
    ],
  },
}
