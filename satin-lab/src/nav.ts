/**
 * The sidebar, group by group. Every item is its own page; `id` names it in the sidebar
 * (the current item), `href` is its URL, `description` sits under its title.
 */
export type NavItem = { id: string; title: string; href: string; description: string }
export type NavGroup = { id: string; title: string; items: NavItem[] }

export const nav: NavGroup[] = [
  {
    id: 'intro',
    title: 'Intro',
    items: [
      { id: 'what-is-satin', title: 'What is Satin?', href: '/', description: 'A design system for calm product interfaces, with patterns for AI agents.' },
      { id: 'who-is-satin-for', title: 'Who is Satin for?', href: '/intro/who-is-satin-for', description: 'Anyone who designs or builds with it.' },
      { id: 'how-to-use-satin', title: 'How can I use Satin?', href: '/intro/how-to-use-satin', description: 'Import the styles once, then import components one by one.' },
    ],
  },
  {
    id: 'foundations',
    title: 'Foundations',
    items: [
      { id: 'tokens', title: 'Tokens', href: '/foundations/tokens', description: 'The colour tokens, in Light and Dark, straight from tokens.json.' },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    items: [
      { id: 'badge', title: 'Badge', href: '/components/badge', description: 'A short label for a status or a category.' },
      { id: 'button', title: 'Button', href: '/components/button', description: 'Starts an action. One primary per screen; secondary and tertiary for the rest.' },
      { id: 'checkbox', title: 'Checkbox', href: '/components/checkbox', description: 'Turns an option on or off as part of a form.' },
      { id: 'segmented-control', title: 'Segmented control', href: '/components/segmented-control', description: 'Switches between two to five views or filters in place.' },
      { id: 'switch', title: 'Switch', href: '/components/switch', description: 'Turns a setting on or off, with immediate effect.' },
    ],
  },
  {
    id: 'ai-patterns',
    title: 'AI patterns',
    items: [
      { id: 'prompt-bar', title: 'Prompt bar', href: '/ai-patterns/prompt-bar', description: 'Where people write to an agent: attachments, model, voice and send.' },
      { id: 'thinking', title: 'Thinking', href: '/ai-patterns/thinking', description: 'What an agent is doing while it works, folded into a summary when it is done.' },
    ],
  },
]

export const page = (id: string) => {
  const item = nav.flatMap((g) => g.items).find((i) => i.id === id)
  if (!item) throw new Error(`No nav item "${id}"`)
  return item
}
