import { Kbd, KbdGroup } from '@uisatin/ui/kbd'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const shortcuts = { cmdk: '⌘K', palette: '⇧⌘P', esc: 'Esc', enter: '↵' } as const

// Size first, then which shortcut; a single key or the keys of one shortcut together.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', items: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }] },
  {
    id: 'keys',
    label: 'Keys',
    items: [
      { value: 'cmdk', label: '⌘K' },
      { value: 'palette', label: '⇧⌘P' },
      { value: 'esc', label: 'Esc' },
      { value: 'enter', label: '↵' },
    ],
  },
]

function code(v: Record<string, string>) {
  const keys = shortcuts[v.keys as keyof typeof shortcuts]
  const size = v.size === 'md' ? ' size="md"' : ''
  return keys.length === 1 || keys === 'Esc'
    ? `import { Kbd } from '@uisatin/ui/kbd'\n\n<Kbd${size}>${keys}</Kbd>`
    : `import { KbdGroup } from '@uisatin/ui/kbd'\n\n<KbdGroup${size} keys="${keys}" />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: `${v.size === 'md' ? 'Medium' : 'Small'} · ${shortcuts[v.keys as keyof typeof shortcuts]}`,
  code: code(v),
}))

export default function KbdDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Kbd"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => {
        const keys = shortcuts[v.keys as keyof typeof shortcuts]
        const size = v.size as 'sm' | 'md'
        return (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            Press
            {keys.length === 1 || keys === 'Esc' ? <Kbd size={size}>{keys}</Kbd> : <KbdGroup size={size} keys={keys} />}
            to {{ cmdk: 'search', palette: 'open the palette', esc: 'close', enter: 'open' }[v.keys]}
          </p>
        )
      }}
    />
  )
}
