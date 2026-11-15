/**
 * Known accessibility issues, for the Accessibility page (/accessibility) and llms.txt. GOV.UK's
 * format: which components, what doesn't work, who it affects, what to do until it's fixed.
 * Keep it true: when an issue is fixed, delete it here in the same change; when a review finds
 * one, add it. The per-component notes in a11y.ts say the same thing where it matters.
 */
export type KnownIssue = {
  id: string
  /** Docs page ids of the components it affects. */
  components: string[]
  title: string
  /** What doesn't work, and why. */
  problem: string
  /** Who runs into it. */
  affects: string
  /** What an app can do until it's fixed. */
  workaround: string
  /** The WCAG 2.2 success criteria it touches, if any. */
  wcag?: string[]
}

export const knownIssues: KnownIssue[] = [
  {
    id: 'control-borders',
    components: ['checkbox', 'radio', 'switch', 'selectable-radio', 'slider'],
    title: 'Control edges below 3:1',
    problem:
      'The border tokens read 1.3–1.8:1 against the surface. For a field that is one cue among several (the label, the fill), but an unchecked checkbox, an off radio or switch and a slider track have no other edge, and a selected SelectableRadio in Dark is marked by a border at 2.6:1.',
    affects: 'People with low vision, and anyone on a bright screen.',
    workaround: 'Keep a visible label next to every control. To raise the edge now, set --sa-border-input to a darker grey (#86868E in Light reads 3:1 on white).',
    wcag: ['1.4.11'],
  },
  {
    id: 'forced-colors-states',
    components: ['switch', 'radio', 'checkbox', 'toggle', 'segmented-control', 'sidebar'],
    title: 'Selected states in forced colors',
    problem:
      'Windows High Contrast and other forced-colors modes replace fills with system colours. Keyboard focus shows there (a system outline), but states drawn only with a fill, a switch that is on, the current sidebar row, a selected segment or a pressed toggle, may look the same as the unselected ones.',
    affects: 'People who use a high-contrast theme.',
    workaround: 'None in the components yet. The state is always exposed to screen readers (aria-checked, aria-pressed, aria-current).',
  },
  {
    id: 'hover-previews',
    components: ['citations', 'attachment', 'hover-card'],
    title: 'Previews that open only on hover',
    problem:
      'Citation and Attachment previews are Radix HoverCards: they open on pointer hover, not with the keyboard or touch, and Radix takes everything inside them out of the tab order, so their buttons and tabs can only be used with a mouse.',
    affects: 'Keyboard, screen reader and touch users.',
    workaround: 'Give every Citation an href to the source and keep the essential content of a preview reachable elsewhere (the Sources list, the file itself).',
    wcag: ['2.1.1', '1.4.13'],
  },
  {
    id: 'citation-without-href',
    components: ['citations'],
    title: 'A Citation without href',
    problem: 'Without href a Citation is an <a> with no destination: it can’t take focus, and its accessible name lands on an element that may not carry one.',
    affects: 'Keyboard and screen reader users.',
    workaround: 'Always pass href.',
    wcag: ['2.1.1', '4.1.2'],
  },
  {
    id: 'chat-speaker',
    components: ['message'],
    title: 'Who is speaking in a Message',
    problem: 'Message takes a role prop (user or assistant) but only uses it for styling, so screen readers hear turn after turn with nothing to say whose it is.',
    affects: 'Screen reader users.',
    workaround: 'Start each turn with a visually hidden heading ("You said", "Assistant said") or wrap it in an <article> with an aria-label.',
    wcag: ['1.3.1'],
  },
  {
    id: 'chat-streaming',
    components: ['streaming-text', 'agent-loading'],
    title: 'A streamed reply is not announced',
    problem:
      'StreamingText is deliberately not a live region, so a reply arriving word by word doesn’t flood a screen reader, but nothing says when the reply starts or ends either.',
    affects: 'Screen reader users.',
    workaround:
      'Keep one empty, visually hidden role="status" region in the chat from the start and write "Responding" into it when a reply begins and "Response complete" when it ends, once each; mount AgentLoading before the work starts.',
    wcag: ['4.1.3'],
  },
  {
    id: 'ranking-drag',
    components: ['decision-card'],
    title: 'Ranking by dragging',
    problem: 'With a pointer, DecisionCard’s ranking can only be reordered by dragging. The keyboard has Alt+↑ and Alt+↓, but a pointer user who can’t drag has no other way.',
    affects: 'People with motor impairments who use a pointer.',
    workaround: 'Offer a ranking by other means (a select per item, or move buttons) where it matters.',
    wcag: ['2.5.7'],
  },
  {
    id: 'attachment-tabs',
    components: ['attachment'],
    title: 'Sheet tabs in the Attachment preview',
    problem: 'The sheet tabs in a spreadsheet preview are separate buttons: no arrow keys between them and no tabpanel for the sheet they show.',
    affects: 'Keyboard and screen reader users.',
    workaround: 'None needed beyond Tab; the sheets stay reachable one by one.',
  },
  {
    id: 'kbd-glyphs',
    components: ['kbd', 'tooltip'],
    title: 'Keyboard symbols have no spoken name',
    problem: 'Kbd draws ⌘, ⇧, ⌥, ↵ and the arrows as symbols or hidden icons, so a shortcut in a tooltip is read as symbols or not at all.',
    affects: 'Screen reader users.',
    workaround: 'Put the shortcut in words in the control’s accessible name or description ("Search, Command K").',
    wcag: ['1.1.1'],
  },
  {
    id: 'small-targets',
    components: ['popover', 'chip'],
    title: 'Targets under 24px',
    problem: 'Popover’s close button is 16px and a Chip’s remove button 14–16px. Both pass WCAG through the spacing exception in the layouts Satin draws, but the component doesn’t guarantee the room around them.',
    affects: 'People with tremors or limited dexterity, and touch users.',
    workaround: 'Leave at least 24px between these buttons and any other target.',
    wcag: ['2.5.8'],
  },
  {
    id: 'forms-messages',
    components: ['form-field', 'form'],
    title: 'Error replaces the hint; late errors are silent',
    problem: 'When a field has an error, the error takes the hint’s place, so the hint is gone just when it helps. An error that arrives later (a server check) is not announced unless focus moves to it.',
    affects: 'Screen reader users, and anyone who needs the hint to fix the error.',
    workaround: 'Put what the hint said into the error message. Submit through Form, which moves focus to the first field with an error.',
    wcag: ['3.3.2', '4.1.3'],
  },
  {
    id: 'decorative-loops',
    components: ['banner', 'announcement-bar'],
    title: 'The sheen repeats with no pause',
    problem: 'With shimmer on, a band of light crosses the Banner or AnnouncementBar every 9 seconds for as long as the page is open. It stops under reduced motion, but nothing pauses it otherwise.',
    affects: 'People who are distracted by movement.',
    workaround: 'Leave shimmer off (the default), or turn it off after a few passes.',
    wcag: ['2.2.2'],
  },
  {
    id: 'reflow-unmeasured',
    components: ['table', 'sidebar', 'list', 'select', 'date-picker'],
    title: 'Zoom, reflow and text spacing not measured',
    problem:
      'Type and control sizes are in px, so a larger default font size in the browser doesn’t reach them (page zoom does). Table, Sidebar, List and Select cut long text with an ellipsis and no way to read the rest, and the two-month DatePicker is 584px wide.',
    affects: 'People who enlarge text or the page.',
    workaround: 'Keep labels short where they truncate, give the full text in a tooltip or a detail view, and show one month on narrow screens.',
    wcag: ['1.4.4', '1.4.10', '1.4.12'],
  },
]
