import { SearchBar } from '@uisatin/ui/search-bar'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// The sidebar's search field: with or without the ⌘K keys.
export const controls: ShowcaseControl[] = [
  {
    id: 'shortcut',
    label: 'Shortcut',
    items: [
      { value: 'on', label: '⌘K' },
      { value: 'off', label: 'None' },
    ],
  },
]

function code(v: Record<string, string>) {
  return `import { SearchBar } from '@uisatin/ui/search-bar'

<SearchBar${v.shortcut === 'off' ? ' shortcut={false}' : ''} placeholder="Search…" aria-label="Search" />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: v.shortcut === 'on' ? 'With ⌘K' : 'Without shortcut',
  code: code(v),
}))

export default function SearchBarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Search bar"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="w-[240px]">
          {/* hotkey off: the docs' own search owns ⌘K on this page. */}
          <SearchBar shortcut={v.shortcut === 'on'} hotkey={false} placeholder="Search…" aria-label="Search" />
        </div>
      )}
    />
  )
}
