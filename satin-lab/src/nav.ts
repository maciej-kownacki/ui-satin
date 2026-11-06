/**
 * The sidebar, group by group. Each item's `id` is the anchor of its section on the page;
 * once the content grows, the same ids become the slugs of per-component pages.
 */
export type NavItem = { id: string; title: string }
export type NavGroup = { id: string; title: string; items: NavItem[] }

export const nav: NavGroup[] = [
  {
    id: 'intro',
    title: 'Intro',
    items: [
      { id: 'what-is-satin', title: 'What is Satin?' },
      { id: 'who-is-satin-for', title: 'Who is Satin for?' },
      { id: 'how-to-use-satin', title: 'How can I use Satin?' },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    items: [
      { id: 'badge', title: 'Badge' },
      { id: 'button', title: 'Button' },
      { id: 'checkbox', title: 'Checkbox' },
      { id: 'segmented-control', title: 'Segmented control' },
      { id: 'switch', title: 'Switch' },
    ],
  },
  {
    id: 'ai-patterns',
    title: 'AI patterns',
    items: [
      { id: 'prompt-bar', title: 'Prompt bar' },
      { id: 'thinking', title: 'Thinking' },
    ],
  },
]
