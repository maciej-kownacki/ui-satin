import { SearchBar } from '@uisatin/ui/search-bar'
import type { CommandGroup } from '@uisatin/ui/command-menu'
import { Bell, Globe, Link, Lock, Palette } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// The sidebar's 32px field, or the panel with its results in place.
export const controls: ShowcaseControl[] = [
  {
    id: 'variant',
    label: 'Variant',
    items: [
      { value: 'field', label: 'Field' },
      { value: 'panel', label: 'Panel' },
    ],
  },
  {
    id: 'shortcut',
    label: 'Shortcut',
    items: [
      { value: 'on', label: '⌘K' },
      { value: 'off', label: 'None' },
    ],
  },
]

const settings: CommandGroup[] = [
  {
    label: 'Link',
    items: [
      { id: 'slug', label: 'Custom slug', description: 'The words after the domain', icon: <Link />, keywords: ['url', 'path'] },
      { id: 'domain', label: 'Domain', description: 'Where the link lives', icon: <Globe />, keywords: ['url', 'dns'] },
      { id: 'password', label: 'Password', description: 'Ask for a password before opening', icon: <Lock />, keywords: ['protect', 'private'] },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'appearance', label: 'Appearance', description: 'Theme and accent colour', icon: <Palette />, keywords: ['dark', 'theme'] },
      { id: 'notifications', label: 'Notifications', description: 'Email and in-app alerts', icon: <Bell />, keywords: ['email'] },
    ],
  },
]

function code(v: Record<string, string>) {
  if (v.variant === 'panel') {
    return `import { SearchBar } from '@uisatin/ui/search-bar'

const groups = [
  {
    label: 'Link',
    items: [
      { id: 'slug', label: 'Custom slug', description: 'The words after the domain', icon: <Link />, onSelect: () => open('slug') },
      { id: 'password', label: 'Password', description: 'Ask for a password before opening', icon: <Lock />, keywords: ['protect'] },
      // …
    ],
  },
]

<SearchBar
  variant="panel"${v.shortcut === 'on' ? '\n  shortcut' : ''}
  groups={groups}
  placeholder="Search link settings…"
  idleText="Search labels, descriptions, and related setting names."
  meta="59 settings indexed"
/>`
  }
  return `import { SearchBar } from '@uisatin/ui/search-bar'

<SearchBar${v.shortcut === 'off' ? ' shortcut={false}' : ''} placeholder="Search…" aria-label="Search" />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: `${v.variant === 'panel' ? 'Panel' : 'Field'} · ${v.shortcut === 'on' ? 'With ⌘K' : 'Without shortcut'}`,
  code: code(v),
}))

export default function SearchBarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Search bar"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) =>
        v.variant === 'panel' ? (
          <div className="w-full max-w-[560px]">
            {/* hotkey off: the docs' own search owns ⌘K on this page. */}
            <SearchBar
              variant="panel"
              shortcut={v.shortcut === 'on'}
              hotkey={false}
              groups={settings}
              placeholder="Search link settings…"
              idleText="Search labels, descriptions, and related setting names."
              meta="59 settings indexed"
            />
          </div>
        ) : (
          <div className="w-[240px]">
            <SearchBar shortcut={v.shortcut === 'on'} hotkey={false} placeholder="Search…" aria-label="Search" />
          </div>
        )
      }
    />
  )
}
