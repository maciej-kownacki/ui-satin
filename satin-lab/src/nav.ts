/**
 * The sidebar, group by group. Every item is its own page; `id` names it in the sidebar
 * (the current item), `href` is its URL, `description` sits under its title.
 */
export type NavItem = {
  id: string
  title: string
  href: string
  description: string
  /** A parent row in the sidebar (Chart) that folds open onto these pages; it has no page itself. */
  children?: NavItem[]
}
export type NavGroup = { id: string; title: string; items: NavItem[] }

export const nav: NavGroup[] = [
  {
    id: 'docs',
    title: 'Docs',
    items: [
      { id: 'introduction', title: 'Introduction', href: '/', description: 'A design system for calm product interfaces, with patterns for AI agents.' },
      { id: 'installation', title: 'Installation', href: '/installation', description: 'Set Satin up with your coding agent, or by hand with the shadcn CLI or the npm package.' },
      { id: 'theming', title: 'Theming', href: '/theming', description: 'One small config sets the brand and the corners for every component.' },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    items: [
      { id: 'accordion', title: 'Accordion', href: '/components/accordion', description: 'Folds sections of content under their titles, one or many open at a time.' },
      { id: 'avatar', title: 'Avatar', href: '/components/avatar', description: 'Shows a person or workspace with initials on a tone colour.' },
      { id: 'badge', title: 'Badge', href: '/components/badge', description: 'A short label for a status or a category.' },
      { id: 'banner', title: 'Banner', href: '/components/banner', description: 'Promotes a next step, a guide or a new feature with a line of copy and one action, on a mesh or plain background.' },
      { id: 'breadcrumb', title: 'Breadcrumb', href: '/components/breadcrumb', description: 'Shows where the page sits and leads back up the path.' },
      { id: 'button', title: 'Button', href: '/components/button', description: 'Starts an action. One primary per screen; secondary and tertiary for the rest.' },
      { id: 'card', title: 'Card', href: '/components/card', description: 'Groups related content and actions under a title, with an optional footer.' },
      {
        id: 'chart',
        title: 'Chart',
        href: '/components/bar-chart',
        description: 'Charts for one metric over time and for how a total splits.',
        children: [
          { id: 'bar-chart', title: 'Bar chart', href: '/components/bar-chart', description: 'One metric over a period as bars, with a tooltip on the hovered one.' },
          { id: 'channel-chart', title: 'Channel chart', href: '/components/channel-chart', description: 'How a total splits across channels: a stacked bar and a legend row per channel.' },
        ],
      },
      { id: 'checkbox', title: 'Checkbox', href: '/components/checkbox', description: 'Turns an option on or off as part of a form.' },
      { id: 'chip', title: 'Chip', href: '/components/chip', description: 'A compact, removable tag for filters, suggestions and people.' },
      { id: 'code-block', title: 'Code block', href: '/components/code-block', description: 'Shows code or a diff with a filename, line numbers and a copy button.' },
      { id: 'combobox', title: 'Combobox', href: '/components/combobox', description: 'Picks one or more values from a long list by typing to filter it, then Apply.' },
      { id: 'command-menu', title: 'Command menu', href: '/components/command-menu', description: 'The ⌘K palette: search every action and page, then run one with Enter.' },
      { id: 'dialog', title: 'Dialog', href: '/components/dialog', description: 'Asks for a decision or a short input before the user moves on.' },
      { id: 'dot', title: 'Dot', href: '/components/dot', description: 'A small status dot that marks state or category next to a label.' },
      { id: 'dropdown', title: 'Dropdown', href: '/components/dropdown', description: 'Opens a short list of actions or values from a button.' },
      { id: 'empty-state', title: 'Empty state', href: '/components/empty-state', description: 'Fills a space with no content yet: says why it is empty and offers the first step.' },
      { id: 'form-field', title: 'Form field', href: '/components/form-field', description: 'Wraps a control with a label, a description and an error message.' },
      { id: 'input', title: 'Input', href: '/components/input', description: 'A single line of text, with a label, a hint and icons.' },
      { id: 'kbd', title: 'Kbd', href: '/components/kbd', description: 'A keyboard key, alone or as the keys of one shortcut.' },
      { id: 'pagination', title: 'Pagination', href: '/components/pagination', description: 'Moves through a long list one page at a time.' },
      { id: 'popover', title: 'Popover', href: '/components/popover', description: 'A small titled panel that opens next to the button that asked for it.' },
      { id: 'progress', title: 'Progress', href: '/components/progress', description: 'Shows how far a task has got, or that it is still running.' },
      { id: 'radio', title: 'Radio', href: '/components/radio', description: 'Lets people pick exactly one option from a short list.' },
      { id: 'segmented-control', title: 'Segmented control', href: '/components/segmented-control', description: 'Switches between two to five views or filters in place.' },
      { id: 'select', title: 'Select', href: '/components/select', description: 'Picks one value from a list, with a label, a hint and an error like any field.' },
      { id: 'sheet', title: 'Sheet', href: '/components/sheet', description: 'A panel that slides in from the edge for a task that needs more room than a dialog.' },
      { id: 'sidebar', title: 'Sidebar', href: '/components/sidebar', description: 'App navigation: pages with icons and counters, collapsible groups and an icon-only rail.' },
      { id: 'skeleton', title: 'Skeleton', href: '/components/skeleton', description: 'Holds the place of content that is still loading.' },
      { id: 'slider', title: 'Slider', href: '/components/slider', description: 'Picks a number or a range by dragging, with the value to read or type.' },
      { id: 'switch', title: 'Switch', href: '/components/switch', description: 'Turns a setting on or off, with immediate effect.' },
      { id: 'table', title: 'Table', href: '/components/table', description: 'Rows of records with sortable columns, selection and sideways scroll.' },
      { id: 'tabs', title: 'Tabs', href: '/components/tabs', description: 'Switches between two to six views of the same page or panel.' },
      { id: 'textarea', title: 'Textarea', href: '/components/textarea', description: 'Multi-line text input for notes, requests and longer answers.' },
      { id: 'toast', title: 'Toast', href: '/components/toast', description: 'A short, passing message about something that just happened.' },
      { id: 'toggle', title: 'Toggle', href: '/components/toggle', description: 'A button that stays pressed to switch an option on or off.' },
      { id: 'tooltip', title: 'Tooltip', href: '/components/tooltip', description: 'Names an icon-only control and shows the shortcut that runs it.' },
    ],
  },
  {
    id: 'ai-patterns',
    title: 'AI patterns',
    items: [
      { id: 'agent-picker', title: 'Agent picker', href: '/ai-patterns/agent-picker', description: 'Switches which agent answers: avatar, name and one line on what it does.' },
      { id: 'attachment', title: 'Attachment', href: '/ai-patterns/attachment', description: 'A file attached to a prompt or a message, with its type, size and a preview.' },
      { id: 'decision-card', title: 'Decision card', href: '/ai-patterns/decision-card', description: 'One question from the agent, with answers to pick, rank or rewrite, and Skip or Continue.' },
      { id: 'agent-loading', title: 'Loading', href: '/ai-patterns/agent-loading', description: 'What shows while an agent works: a live mark, a shimmering label and the time so far.' },
      { id: 'message', title: 'Message', href: '/ai-patterns/message', description: 'One chat turn: a bubble for the user, plain text with actions for the assistant.' },
      { id: 'message-actions', title: 'Message actions', href: '/ai-patterns/message-actions', description: 'Status, feedback, copy and share under an assistant reply.' },
      { id: 'prompt-bar', title: 'Prompt bar', href: '/ai-patterns/prompt-bar', description: 'Where people write to an agent: attachments, model, voice and send.' },
      { id: 'streaming-text', title: 'Streaming text', href: '/ai-patterns/streaming-text', description: 'An answer writing itself out as it arrives, at an even pace with a caret.' },
      { id: 'thinking', title: 'Thinking', href: '/ai-patterns/thinking', description: 'What an agent did, folded into a summary that opens onto its steps.' },
    ],
  },
]

/** Every page in a list of items: parents give their children instead of themselves. */
export const pagesOf = (items: NavItem[]): NavItem[] => items.flatMap((i) => (i.children ? pagesOf(i.children) : [i]))

/** The group a page sits in, for the breadcrumbs above its title. */
export const groupOf = (id: string) => nav.find((g) => pagesOf(g.items).some((i) => i.id === id))!

/** The parent row a page sits under (Chart for Bar chart), if any. */
export const parentOf = (id: string) => nav.flatMap((g) => g.items).find((i) => i.children?.some((c) => c.id === id))

export const page = (id: string) => {
  const item = pagesOf(nav.flatMap((g) => g.items)).find((i) => i.id === id)
  if (!item) throw new Error(`No nav item "${id}"`)
  return item
}
