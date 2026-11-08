/**
 * The sidebar, group by group. Every item is its own page; `id` names it in the sidebar
 * (the current item), `href` is its URL, `description` sits under its title.
 */
export type NavItem = { id: string; title: string; href: string; description: string }
export type NavGroup = { id: string; title: string; items: NavItem[] }

export const nav: NavGroup[] = [
  {
    id: 'docs',
    title: 'Docs',
    items: [
      { id: 'introduction', title: 'Introduction', href: '/', description: 'A design system for calm product interfaces, with patterns for AI agents.' },
      { id: 'theming', title: 'Theming', href: '/theming', description: 'One small config sets the brand and the corners for every component.' },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    items: [
      { id: 'avatar', title: 'Avatar', href: '/components/avatar', description: 'Shows a person or workspace with initials on a tone colour.' },
      { id: 'badge', title: 'Badge', href: '/components/badge', description: 'A short label for a status or a category.' },
      { id: 'banner', title: 'Banner', href: '/components/banner', description: 'Promotes a next step, a guide or a new feature with a line of copy and one action, on a mesh or plain background.' },
      { id: 'button', title: 'Button', href: '/components/button', description: 'Starts an action. One primary per screen; secondary and tertiary for the rest.' },
      { id: 'card', title: 'Card', href: '/components/card', description: 'Groups related content and actions under a title, with an optional footer.' },
      { id: 'checkbox', title: 'Checkbox', href: '/components/checkbox', description: 'Turns an option on or off as part of a form.' },
      { id: 'chip', title: 'Chip', href: '/components/chip', description: 'A compact, removable tag for filters, suggestions and people.' },
      { id: 'code-block', title: 'Code block', href: '/components/code-block', description: 'Shows code or a diff with a filename, line numbers and a copy button.' },
      { id: 'dialog', title: 'Dialog', href: '/components/dialog', description: 'Asks for a decision or a short input before the user moves on.' },
      { id: 'dot', title: 'Dot', href: '/components/dot', description: 'A small status dot that marks state or category next to a label.' },
      { id: 'dropdown', title: 'Dropdown', href: '/components/dropdown', description: 'Opens a short list of actions or values from a button.' },
      { id: 'empty-state', title: 'Empty state', href: '/components/empty-state', description: 'Fills a space with no content yet: says why it is empty and offers the first step.' },
      { id: 'form-field', title: 'Form field', href: '/components/form-field', description: 'Wraps a control with a label, a description and an error message.' },
      { id: 'input', title: 'Input', href: '/components/input', description: 'A single line of text, with a label, a hint and icons.' },
      { id: 'popover', title: 'Popover', href: '/components/popover', description: 'A small titled panel that opens next to the button that asked for it.' },
      { id: 'radio', title: 'Radio', href: '/components/radio', description: 'Lets people pick exactly one option from a short list.' },
      { id: 'segmented-control', title: 'Segmented control', href: '/components/segmented-control', description: 'Switches between two to five views or filters in place.' },
      { id: 'sidebar', title: 'Sidebar', href: '/components/sidebar', description: 'App navigation: pages with icons and counters, collapsible groups and an icon-only rail.' },
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
    id: 'charts',
    title: 'Charts',
    items: [
      { id: 'bar-chart', title: 'Bar chart', href: '/charts/bar-chart', description: 'One metric over a period as bars, with a tooltip on the hovered one.' },
      { id: 'channel-chart', title: 'Channel chart', href: '/charts/channel-chart', description: 'How a total splits across channels: a stacked bar and a legend row per channel.' },
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
      { id: 'thinking', title: 'Thinking', href: '/ai-patterns/thinking', description: 'What an agent did, folded into a summary that opens onto its steps.' },
    ],
  },
]

/** The group a page sits in, for the breadcrumbs above its title. */
export const groupOf = (id: string) => nav.find((g) => g.items.some((i) => i.id === id))!

export const page = (id: string) => {
  const item = nav.flatMap((g) => g.items).find((i) => i.id === id)
  if (!item) throw new Error(`No nav item "${id}"`)
  return item
}
