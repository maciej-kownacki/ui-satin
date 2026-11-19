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
      'The field is a `button` with `aria-haspopup="listbox"` and `aria-expanded`, named by `label` and described by the hint or error (`aria-describedby`, `aria-invalid`); it reads out the picks or the placeholder. Opening it moves focus to the search input, a `combobox` that points at the highlighted option with `aria-activedescendant`. The list is a `listbox` (`aria-multiselectable` with `multiple`) of options with `aria-selected`. Each chip has a "Remove <label>" button.',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the field: opens the list and focuses the search.' },
      { keys: ['A–Z'], action: 'In the search: filters the options by label and description.' },
      { keys: ['↑', '↓'], action: 'Moves the highlight, wrapping at the ends.' },
      { keys: ['Enter'], action: 'Picks the highlighted option; a single pick closes the list.' },
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
      'A Radix dropdown menu. The trigger gets `aria-haspopup="menu"` and `aria-expanded`; the panel is a `menu` (named by `aria-label` when the trigger text isn’t enough) and each row a `menuitem`. A `selected` row adds "(selected)" for screen readers. A `shortcut` is only shown and hidden from screen readers; binding the keys is up to the app. While open and modal (the default), the rest of the page can’t be reached.',
    keyboard: [
      { keys: ['Enter', 'Space', '↓'], action: 'On the trigger: opens the menu and focuses the first item.' },
      { keys: ['↑', '↓'], action: 'Moves between items.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last item.' },
      { keys: ['A–Z'], action: 'Moves to the next item whose label starts with the typed letters.' },
      { keys: ['Enter', 'Space'], action: 'Runs the focused item and closes the menu.' },
      { keys: ['Esc'], action: 'Closes the menu and returns focus to the trigger.' },
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
      'Both pickers are a `button` named by `label` and described by the hint or error (`aria-describedby`, `aria-invalid`); it opens the Calendar in a popover and moves focus into it. Each month is a `grid` labelled by its title, and the grid is one tab stop. Each day is a `button` named by its full date; picked days have `aria-selected` and today `aria-current="date"`. The arrows are named "Previous month" and "Next month", and the year Select "Year".',
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the field: opens the calendar. On a day: picks it; a range takes its start, then its end.' },
      { keys: ['←', '→'], action: 'Moves a day back or forward, turning the month when needed.' },
      { keys: ['↑', '↓'], action: 'Moves a week back or forward.' },
      { keys: ['Page Up', 'Page Down'], action: 'Moves a month back or forward.' },
      { keys: ['Home', 'End'], action: 'Moves to the Monday or the Sunday of the week.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves between the arrows, the year, the days and, in a range, Cancel and Apply.' },
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
      'Radix toasts in a `region` named "Notifications (F8)". Each toast is read out when it appears: errors and warnings at once (`aria-live="assertive"`), the others politely. Give an action `altText` that says how to do the same without the toast ("Undo with Ctrl+Z"): Radix reads it instead of the button, which a screen reader user may not reach in time; without it the label is used. The close button is named "Close". Hovering or focusing the stack pauses the timers; a swipe to the right dismisses.',
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
      { keys: ['Enter'], action: 'In the field: sends the message (not while an input method is composing).' },
      { keys: ['Shift+Enter'], action: 'In the field: adds a line.' },
      { keys: ['↑', '↓'], action: 'In the + panel’s search: moves the highlight, wrapping at the ends.' },
      { keys: ['Enter'], action: 'In the + panel’s search: runs the highlighted row.' },
      { keys: ['Esc'], action: 'Closes the open panel or menu.' },
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
}
