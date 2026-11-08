import * as React from 'react'
import { CommandMenu, type CommandGroup } from '@satin/ui/command-menu'
import { SearchBar } from '@satin/ui/search-bar'
import { Calendar, HalfMoon, Page, Plus, Settings, UserPlus } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const data = [
  {
    label: 'Suggestions',
    items: [
      { id: 'new', label: 'New issue', description: 'In the current project', shortcut: '⌘N', Icon: Plus, icon: 'Plus' },
      { id: 'docs', label: 'Search docs', description: 'Guides and API', shortcut: '⌘/', Icon: Page, icon: 'Page' },
      { id: 'invite', label: 'Invite people', description: 'By email or link', shortcut: '⌘I', Icon: UserPlus, icon: 'UserPlus' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'settings', label: 'Settings', description: 'Members, billing', shortcut: '⌘,', Icon: Settings, icon: 'Settings' },
      { id: 'calendar', label: 'Open calendar', description: 'This week', shortcut: '⇧⌘C', Icon: Calendar, icon: 'Calendar' },
      { id: 'theme', label: 'Switch theme', description: 'Light or dark', shortcut: '⇧⌘L', Icon: HalfMoon, icon: 'HalfMoon' },
    ],
  },
]

// What each row carries, then the footer.
export const controls: ShowcaseControl[] = [
  { id: 'shortcuts', label: 'Shortcuts', type: 'switch', default: 'on' },
  { id: 'description', label: 'Description', type: 'switch', default: 'off' },
  { id: 'hints', label: 'Key hints', type: 'switch', default: 'on' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function groupsFor(v: Record<string, string>): CommandGroup[] {
  return data.map((g) => ({
    label: g.label,
    items: g.items.map((i) => ({
      id: i.id,
      label: i.label,
      icon: <i.Icon />,
      description: on(v, 'description') ? i.description : undefined,
      shortcut: on(v, 'shortcuts') ? i.shortcut : undefined,
    })),
  }))
}

function code(v: Record<string, string>) {
  const item = (i: (typeof data)[number]['items'][number]) =>
    `      { id: '${i.id}', label: '${i.label}', icon: <${i.icon} />${on(v, 'description') ? `, description: '${i.description}'` : ''}${on(v, 'shortcuts') ? `, shortcut: '${i.shortcut}'` : ''}, onSelect: () => run('${i.id}') },`
  return `import * as React from 'react'
import { CommandMenu } from '@satin/ui/command-menu'
import { SearchBar } from '@satin/ui/search-bar'
import { ${data.flatMap((g) => g.items.map((i) => i.icon)).sort().join(', ')} } from 'iconoir-react'

const [open, setOpen] = React.useState(false)

// The search in the navigation opens the menu; ⌘K or Ctrl+K does too, anywhere on the page.
<SearchBar
  readOnly
  hotkey={false}
  placeholder="Search…"
  onClick={() => setOpen(true)}
  onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
/>
<CommandMenu
  open={open}
  onOpenChange={setOpen}${on(v, 'hints') ? '' : '\n  hints={false}'}
  groups={[
${data.map((g) => `    {\n      label: '${g.label}',\n      items: [\n${g.items.map(item).map((l) => '  ' + l).join('\n')}\n      ],\n    },`).join('\n')}
  ]}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    on(v, 'shortcuts') ? 'Shortcuts' : 'No shortcuts',
    on(v, 'description') ? 'Description' : 'No description',
    on(v, 'hints') ? 'Key hints' : 'No key hints',
  ].join(' · '),
  code: code(v),
}))

/**
 * Open in the middle of the stage, over the docs-style search it came from (the sidebar's size). Dismissed (Escape, a click
 * outside, a command), it leaves the search, which opens it again. The page's own ⌘K stays
 * with the docs search.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(true)
  const openedOnce = React.useRef(false)
  return (
    <div className="relative grid h-[420px] w-[560px] max-w-full place-items-center">
      <SearchBar
        readOnly
        hotkey={false}
        placeholder="Search…"
        aria-haspopup="dialog"
        aria-expanded={open}
        wrapperClassName="w-60 cursor-pointer"
        className="cursor-pointer"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      />
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {stage && (
        <CommandMenu
          container={stage}
          open={open}
          onOpenChange={setOpen}
          modal={false}
          hotkey={false}
          onOpenAutoFocus={(e) => {
            if (!openedOnce.current) e.preventDefault()
            openedOnce.current = true
          }}
          hints={on(v, 'hints')}
          groups={groupsFor(v)}
        />
      )}
    </div>
  )
}

export default function CommandMenuDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Command menu" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
