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
  /**
   * `'pro'` for a page whose component is in Satin Pro (packages/ui-pro): the page, the sidebar row,
   * its card, llms.txt and its markdown twin say so. Free pages leave it out. check-docs keeps it
   * in step with where the file lives.
   */
  edition?: 'pro'
}
export type NavGroup = { id: string; title: string; items: NavItem[] }

export const nav: NavGroup[] = [
  {
    id: 'docs',
    title: 'Docs',
    items: [
      { id: 'introduction', title: 'Introduction', href: '/introduction', description: 'A design system for calm product interfaces, with patterns for AI agents.' },
      { id: 'installation', title: 'Installation', href: '/installation', description: 'Install Satin from npm in three lines, have your agent do it, or copy the source with the shadcn CLI.' },
      { id: 'theming', title: 'Theming', href: '/theming', description: 'One small config sets the brand and the corners for every component.' },
      { id: 'accessibility', title: 'Accessibility', href: '/accessibility', description: 'What Satin supports for WCAG 2.2 AA, what your app has to do, and what doesn’t work yet.' },
      {
        id: 'guides',
        title: 'Guides',
        href: '/guides/nextjs',
        description: 'Satin in your framework, and dark mode.',
        children: [
          { id: 'nextjs', title: 'Next.js', href: '/guides/nextjs', description: 'Satin in the App Router: styles and theme in the root layout, dark mode set on the server.' },
          { id: 'vite', title: 'Vite', href: '/guides/vite', description: 'Satin in a Vite React app, with dark mode applied before the first paint.' },
          { id: 'react-router', title: 'React Router', href: '/guides/react-router', description: 'Satin in React Router framework mode: styles and theme in the root route, dark mode on the html element.' },
          { id: 'astro', title: 'Astro', href: '/guides/astro', description: 'Satin components as React islands, with the styles and the theme in a layout.' },
          { id: 'tanstack-start', title: 'TanStack Start', href: '/guides/tanstack-start', description: 'Satin in TanStack Start: the stylesheet linked from the root route, dark mode on the html element.' },
          { id: 'dark-mode', title: 'Dark mode', href: '/guides/dark-mode', description: 'Dark with one attribute, a page that follows the system, and no flash on load.' },
        ],
      },
      {
        id: 'recipes',
        title: 'Recipes',
        href: '/recipes/react-hook-form',
        description: 'Satin with the libraries apps pair it with.',
        children: [
          { id: 'react-hook-form', title: 'Forms with React Hook Form', href: '/recipes/react-hook-form', description: "A sign-up form validated with Zod through React Hook Form, its errors shown by Satin's Form." },
          { id: 'ai-sdk-chat', title: 'Chat with the AI SDK', href: '/recipes/ai-sdk-chat', description: 'A chat built from PromptBar, Message and StreamingText, driven by useChat from the AI SDK.' },
          { id: 'rtl', title: 'Right-to-left', href: '/recipes/rtl', description: "Satin in Arabic, Hebrew or Persian: dir on the html element and Radix's DirectionProvider." },
        ],
      },
    ],
  },
  {
    id: 'ai-patterns',
    title: 'AI patterns',
    items: [
      { id: 'agent-picker', title: 'Agent picker', href: '/ai-patterns/agent-picker', description: 'Switches which agent answers: avatar, name and one line on what it does.' },
      { id: 'attachment', title: 'Attachment', href: '/ai-patterns/attachment', description: 'A file attached to a prompt or a message, with its type, size and a preview.' },
      { id: 'agent-suggestion', title: 'Agent suggestion', href: '/ai-patterns/agent-suggestion', description: 'Something the agent prepared, an email, a meeting or a CRM update, for the user to approve.' },
      {
        id: 'agent-changes-review',
        title: 'Reviewable changes',
        href: '/ai-patterns/agent-changes-review',
        description: 'The fields an agent wants to change, each accepted or rejected before any is applied.',
        edition: 'pro',
      },
      { id: 'decision-card', title: 'Decision card', href: '/ai-patterns/decision-card', description: 'One question from the agent, with answers to pick, rank or rewrite, and Skip or Continue.' },
      {
        id: 'agent-plan',
        title: 'Agent plan',
        href: '/ai-patterns/agent-plan',
        description: 'The steps an agent proposes before it acts: edit, reorder or leave some out, then Run, and watch them tick off.',
        edition: 'pro',
      },
      { id: 'agent-loading', title: 'Loading', href: '/ai-patterns/agent-loading', description: 'What shows while an agent works: a live mark, a shimmering label and the time so far.' },
      {
        id: 'agent-undo-log',
        title: 'Agent action log',
        href: '/ai-patterns/agent-undo-log',
        description: 'What a coding agent changed, run by run: files with their diff counts, a Revert on each, ⌘Z for the last run.',
        edition: 'pro',
      },
      {
        id: 'message-group',
        title: 'Message',
        href: '/ai-patterns/message',
        description: 'Chat turns and what they cite.',
        children: [
          { id: 'message', title: 'Message', href: '/ai-patterns/message', description: 'One chat turn: a bubble for the user, plain text with actions for the assistant.' },
          { id: 'citations', title: 'Citations', href: '/ai-patterns/citations', description: 'Numbered sources in an answer, with a preview on hover and the list under it.' },
        ],
      },      { id: 'message-actions', title: 'Message actions', href: '/ai-patterns/message-actions', description: 'Status, feedback, copy and share under an assistant reply.' },
      { id: 'prompt-bar', title: 'Prompt bar', href: '/ai-patterns/prompt-bar', description: 'Where people write to an agent: attachments, model, voice and send.' },
      {
        id: 'review-queue',
        title: 'Review queue',
        href: '/ai-patterns/review-queue',
        description: 'Agent drafts gone through one at a time, Approve, Edit or Skip with the keyboard, and a summary at the end.',
        edition: 'pro',
      },
      { id: 'streaming-text', title: 'Streaming text', href: '/ai-patterns/streaming-text', description: 'An answer writing itself out as it arrives, at an even pace with a caret.' },
      { id: 'thinking', title: 'Thinking', href: '/ai-patterns/thinking', description: 'What an agent did, folded into a summary that opens onto its steps.' },
      { id: 'tool-call', title: 'Tool call', href: '/ai-patterns/tool-call', description: 'One call an agent made to a tool: what it sent, what came back, how it went, and Retry when it failed.' },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    items: [
      { id: 'accordion', title: 'Accordion', href: '/components/accordion', description: 'Folds sections of content under their titles, one or many open at a time.' },
      { id: 'alert', title: 'Alert', href: '/components/alert', description: 'A message that stays on the page until it is dealt with: info, success, warning or error.' },
      {
        id: 'announcements',
        title: 'Announcements',
        href: '/components/banner',
        description: 'News and next steps the product shows on its own: a banner card or a bar across the page.',
        children: [
          { id: 'announcement-bar', title: 'Announcement bar', href: '/components/announcement-bar', description: 'One line of news across the top or bottom of the page, with a link and a close.' },
          { id: 'banner', title: 'Banner', href: '/components/banner', description: 'Promotes a next step, a guide or a new feature with a line of copy and one action, on a mesh or plain background.' },
        ],
      },
      { id: 'avatar', title: 'Avatar', href: '/components/avatar', description: 'Shows a person or workspace with initials on a tone colour.' },
      { id: 'badge', title: 'Badge', href: '/components/badge', description: 'A short label for a status or a category.' },
      { id: 'breadcrumb', title: 'Breadcrumb', href: '/components/breadcrumb', description: 'Shows where the page sits and leads back up the path.' },
      {
        id: 'bulk-action-bar',
        title: 'Bulk action bar',
        href: '/components/bulk-action-bar',
        description: 'Appears when rows are selected: the count, the actions with their shortcuts, and one toast to undo the batch.',
        edition: 'pro',
      },
      {
        id: 'button-family',
        title: 'Button',
        href: '/components/button',
        description: 'Buttons on their own, joined into a group, or split into an action and its variations.',
        children: [
          { id: 'button', title: 'Button', href: '/components/button', description: 'Starts an action. One primary per screen; secondary and tertiary for the rest.' },
          { id: 'button-group', title: 'Button group', href: '/components/button-group', description: 'Buttons that belong together, joined into one block or spaced as a toolbar.' },
          { id: 'split-button', title: 'Split button', href: '/components/split-button', description: 'The usual action, with an arrow that opens its variations.' },
          { id: 'action-button', title: 'Action button', href: '/components/action-button', description: 'Runs an action and shows how it went in place: a spinner, then a checkmark.' },
        ],
      },
      { id: 'card', title: 'Card', href: '/components/card', description: 'Groups related content and actions under a title, with an optional footer.' },
      {
        id: 'chart',
        title: 'Chart',
        href: '/components/bar-chart',
        description: 'Charts for one metric over time and for how a total splits.',
        children: [
          { id: 'bar-chart', title: 'Bar chart', href: '/components/bar-chart', description: 'One metric over a period as bars, with a tooltip on the hovered one.' },
          { id: 'channel-chart', title: 'Channel chart', href: '/components/channel-chart', description: 'How a total splits across channels: a stacked bar and a legend row per channel.' },
          { id: 'line-chart', title: 'Line chart', href: '/components/line-chart', description: 'One metric over a period as a smooth line, with the value of the hovered point.' },
          { id: 'area-chart', title: 'Area chart', href: '/components/area-chart', description: 'The line chart with its area filled down to the baseline in a fading gradient.' },
          { id: 'donut-chart', title: 'Donut chart', href: '/components/donut-chart', description: 'How a total splits into a few parts, as a ring with the sum in the middle.' },
        ],
      },
      { id: 'checkbox', title: 'Checkbox', href: '/components/checkbox', description: 'Turns an option on or off as part of a form.' },
      { id: 'chip', title: 'Chip', href: '/components/chip', description: 'A compact, removable tag for filters, suggestions and people.' },
      { id: 'code-block', title: 'Code block', href: '/components/code-block', description: 'Shows code or a diff with a filename, line numbers and a copy button.' },
      { id: 'combobox', title: 'Combobox', href: '/components/combobox', description: 'Picks one or more values from a long list by typing to filter it, then Apply.' },
      { id: 'command-menu', title: 'Command menu', href: '/components/command-menu', description: 'The ⌘K palette: search every action and page, then run one with Enter.' },
      {
        id: 'command-pages',
        title: 'Command pages',
        href: '/components/command-pages',
        description: 'The ⌘K palette with sub-pages (Move deal to… › Negotiation), and what no command matches handed to an agent.',
        edition: 'pro',
      },
      { id: 'cookie-consent', title: 'Cookie consent', href: '/components/cookie-consent', description: 'Asks once what the site may store: Customize, Reject all or Accept all.' },
      { id: 'dialog', title: 'Dialog', href: '/components/dialog', description: 'Asks for a decision or a short input before the user moves on.' },
      { id: 'dot', title: 'Dot', href: '/components/dot', description: 'A small status dot that marks state or category next to a label.' },
      {
        id: 'menu-group',
        title: 'Dropdown',
        href: '/components/dropdown',
        description: 'Menus of actions, from a button or a right-click.',
        children: [
          { id: 'dropdown', title: 'Dropdown', href: '/components/dropdown', description: 'Opens a short list of actions or values from a button.' },
          { id: 'context-menu', title: 'Context menu', href: '/components/context-menu', description: 'The actions for one thing, at the pointer, on right-click or a long press.' },
        ],
      },      { id: 'empty-state', title: 'Empty state', href: '/components/empty-state', description: 'Fills a space with no content yet: says why it is empty and offers the first step.' },
      { id: 'file-upload', title: 'File upload', href: '/components/file-upload', description: 'Takes files by drop or browse, shows each upload and what failed, then the attached files.' },
      {
        id: 'filter-bar',
        title: 'Filter bar',
        href: '/components/filter-bar',
        description: 'Filters as chips that read as sentences, each with its own editor, and the result count live as they change.',
        edition: 'pro',
      },
      {
        id: 'form-family',
        title: 'Form',
        href: '/components/form',
        description: 'Fields with labels and errors, grouped under a legend, laid out as one form.',
        children: [
          { id: 'form', title: 'Form', href: '/components/form', description: 'Lays out fields, groups and sections, hands them errors by name and focuses the first one.' },
          { id: 'field-group', title: 'Field group', href: '/components/field-group', description: 'Fields or options that answer one question, under one legend, with one error.' },
          { id: 'form-field', title: 'Form field', href: '/components/form-field', description: 'Wraps a control with a label, a description and an error message.' },
        ],
      },
      {
        id: 'input-group',
        title: 'Input',
        href: '/components/input',
        description: 'Fields for text, codes and numbers.',
        children: [
          { id: 'input', title: 'Input', href: '/components/input', description: 'A single line of text, with a label, a hint and icons.' },
          { id: 'input-group', title: 'Input group', href: '/components/input-group', description: 'A field joined with an addon, a select or a button in one block.' },
          { id: 'password-input', title: 'Password input', href: '/components/password-input', description: 'A password field with a show and hide button.' },
          { id: 'date-picker', title: 'Date picker', href: '/components/date-picker', description: 'Picks a day or a range from a calendar, with a quick year.' },
          { id: 'time-picker', title: 'Time picker', href: '/components/time-picker', description: 'Takes a typed time or one from a list, alone or with a day.' },
          {
            id: 'date-availability',
            title: 'Availability calendar',
            href: '/components/date-availability',
            description: 'A calendar for booking: which days have free slots and how many, full days off with the reason.',
            edition: 'pro',
          },
          { id: 'input-otp', title: 'Input OTP', href: '/components/input-otp', description: 'A one-time code in separate cells, with paste and SMS autofill.' },
          { id: 'number-input', title: 'Number input', href: '/components/number-input', description: 'A number with − and + and the arrow keys, kept between a min and a max.' },
        ],
      },      { id: 'kbd', title: 'Kbd', href: '/components/kbd', description: 'A keyboard key, alone or as the keys of one shortcut.' },
      { id: 'link', title: 'Link', href: '/components/link', description: 'Text that goes somewhere, calm in a paragraph, marked when it leaves the site.' },
      { id: 'list', title: 'List', href: '/components/list', description: 'Rows of people, files or settings, each with a title, meta and actions.' },
      { id: 'notification', title: 'Notification', href: '/components/notification', description: 'A card for something the app did or heard about, with a picture, a badge and a close on its corner.' },
      { id: 'pagination', title: 'Pagination', href: '/components/pagination', description: 'Moves through a long list one page at a time.' },
      {
        id: 'popover-group',
        title: 'Popover',
        href: '/components/popover',
        description: 'Panels that open next to what asked for them.',
        children: [
          { id: 'popover', title: 'Popover', href: '/components/popover', description: 'A small titled panel that opens next to the button that asked for it.' },
          { id: 'hover-card', title: 'Hover card', href: '/components/hover-card', description: 'A preview of a person, place or file while the pointer rests on its link.' },
        ],
      },      { id: 'progress', title: 'Progress', href: '/components/progress', description: 'Shows how far a task has got, or that it is still running.' },
      { id: 'radio', title: 'Radio', href: '/components/radio', description: 'Lets people pick exactly one option from a short list.' },
      { id: 'search-bar', title: 'Search bar', href: '/components/search-bar', description: 'A search field for the sidebar or a toolbar, with ⌘K to focus it from anywhere.' },
      { id: 'segmented-control', title: 'Segmented control', href: '/components/segmented-control', description: 'Switches between two to five views or filters in place.' },
      { id: 'select', title: 'Select', href: '/components/select', description: 'Picks one value from a list, with a label, a hint and an error like any field.' },
      {
        id: 'selectable-card',
        title: 'Selectable card',
        href: '/components/selectable-radio',
        description: 'Radios and checkboxes as whole cards, with a description and an icon.',
        children: [
          { id: 'selectable-radio', title: 'Selectable radio', href: '/components/selectable-radio', description: 'Pick one option from a few, each a card with a line of explanation and an icon.' },
          { id: 'selectable-checkbox', title: 'Selectable checkbox', href: '/components/selectable-checkbox', description: 'Pick any number of options, each a card with a line of explanation and an icon.' },
        ],
      },
      { id: 'separator', title: 'Separator', href: '/components/separator', description: 'A thin rule between blocks, across or down, with an optional word in the middle.' },
      { id: 'sheet', title: 'Sheet', href: '/components/sheet', description: 'A panel that slides in from the edge for a task that needs more room than a dialog.' },
      { id: 'sidebar', title: 'Sidebar', href: '/components/sidebar', description: 'App navigation: pages with icons and counters, collapsible groups and an icon-only rail.' },
      { id: 'skeleton', title: 'Skeleton', href: '/components/skeleton', description: 'Holds the place of content that is still loading.' },
      { id: 'slider', title: 'Slider', href: '/components/slider', description: 'Picks a number or a range by dragging, with the value to read or type.' },
      { id: 'spinner', title: 'Spinner', href: '/components/spinner', description: 'Says something is loading when there is no telling how long it takes.' },
      { id: 'stepper', title: 'Stepper', href: '/components/stepper', description: 'Shows where a multi-step flow is: the steps done, the current one and the ones ahead.' },
      { id: 'switch', title: 'Switch', href: '/components/switch', description: 'Turns a setting on or off, with immediate effect.' },
      { id: 'table', title: 'Table', href: '/components/table', description: 'Rows of records with sortable columns, selection and sideways scroll.' },
      {
        id: 'table-pro',
        title: 'Grouped table',
        href: '/components/table-pro',
        description: 'A Table whose rows open onto sub-rows and gather into groups with subtotals, with a pinned first column, a totals row and a compact density.',
        edition: 'pro',
      },
      { id: 'tabs', title: 'Tabs', href: '/components/tabs', description: 'Switches between two to six views of the same page or panel.' },
      { id: 'textarea', title: 'Textarea', href: '/components/textarea', description: 'Multi-line text input for notes, requests and longer answers.' },
      { id: 'toast', title: 'Toast', href: '/components/toast', description: 'A short, passing message about something that just happened.' },
      {
        id: 'toast-batch',
        title: 'Toast batch',
        href: '/components/toast-batch',
        description: 'One toast for many changes: a rolling count, and the list to undo each item or all of them with ⌘Z.',
        edition: 'pro',
      },
      { id: 'toggle', title: 'Toggle', href: '/components/toggle', description: 'A button that stays pressed to switch an option on or off.' },
      { id: 'tooltip', title: 'Tooltip', href: '/components/tooltip', description: 'Names an icon-only control and shows the shortcut that runs it.' },
    ],
  },
]

/** The package a page's component comes from. */
export const packageOf = (item: Pick<NavItem, 'edition'>) => (item.edition === 'pro' ? '@uisatin/pro' : '@uisatin/ui')

/** Every page in a list of items: parents give their children instead of themselves. */
export const pagesOf = (items: NavItem[]): NavItem[] => items.flatMap((i) => (i.children ? pagesOf(i.children) : [i]))

/** The group a page sits in, for the breadcrumbs above its title. */
export const groupOf = (id: string) => nav.find((g) => pagesOf(g.items).some((i) => i.id === id))!

/** The parent row a page sits under (Chart for Bar chart), if any. */
export const parentOf = (id: string) => nav.flatMap((g) => g.items).find((i) => i.children?.some((c) => c.id === id))

/** Every component and AI pattern page, the ones the All components page shows as cards. */
export const componentPages = () => nav.filter((g) => g.id === 'ai-patterns' || g.id === 'components').flatMap((g) => pagesOf(g.items))

/** The All components page: a row of its own at the top of the sidebar, outside the groups. */
export const allComponents: NavItem = {
  id: 'all-components',
  title: 'All components',
  href: '/',
  description: 'Every component and AI pattern in Satin, with a preview of each.',
}

export const page = (id: string) => {
  if (id === allComponents.id) return allComponents
  const item = pagesOf(nav.flatMap((g) => g.items)).find((i) => i.id === id)
  if (!item) throw new Error(`No nav item "${id}"`)
  return item
}
