import { Avatar, type AvatarSize, type AvatarTone } from '@satin/ui/avatar'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const people: { initials: string; tone: AvatarTone; name: string }[] = [
  { initials: 'RC', tone: 'neutral', name: 'Rosa Castillo' },
  { initials: 'MK', tone: 'brand', name: 'Maciej Kownacki' },
  { initials: 'AN', tone: 'sky', name: 'Anna Nowak' },
  { initials: 'JD', tone: 'green', name: 'Jonas Dahl' },
  { initials: 'EW', tone: 'amber', name: 'Emma Wright' },
  { initials: 'TS', tone: 'red', name: 'Tomás Silva' },
  { initials: 'LB', tone: 'fuchsia', name: 'Lena Brandt' },
  { initials: 'OP', tone: 'plum', name: 'Olu Peters' },
]
const sizes: AvatarSize[] = [16, 20, 24, 32, 40, 48]

const swatch = (tone: AvatarTone) => <span aria-hidden data-tone={tone} className="size-2.5 rounded-full bg-tone-fg" />
const title = (s: string) => s[0].toUpperCase() + s.slice(1)

// Size sets the box and the type, shape its corners, tone only recolours it.
// "All tones" shows the palette as a loop; one tone gives the one avatar you'd paste.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', type: 'menu', default: '32', items: sizes.map((s) => ({ value: String(s), label: `${s}px` })) },
  { id: 'shape', label: 'Shape', items: [{ value: 'circle', label: 'Circle' }, { value: 'rounded', label: 'Rounded' }] },
  {
    id: 'tone',
    label: 'Tone',
    type: 'menu',
    items: [{ value: 'all', label: 'All tones' }, ...people.map((p) => ({ value: p.tone, label: title(p.tone), icon: swatch(p.tone) }))],
  },
  { id: 'tooltip', label: 'Name tooltip', type: 'switch', default: 'on' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const attrs = (v.size === '32' ? '' : ` size={${v.size}}`) + (v.shape === 'circle' ? '' : ` shape="${v.shape}"`)
  const named = v.tooltip === 'on'
  if (v.tone === 'all') {
    const rows = people.map((p) => `  { initials: '${p.initials}', tone: '${p.tone}'${named ? `, name: '${p.name}'` : ''} },`).join('\n')
    return `import { Avatar } from '@satin/ui/avatar'

const people = [
${rows}
] as const

{people.map(({ initials, tone${named ? ', name' : ''} }) => (
  <Avatar key={tone} initials={initials} tone={tone}${named ? ' name={name}' : ''}${attrs} />
))}`
  }
  const p = people.find((p) => p.tone === v.tone)!
  const tone = p.tone === 'neutral' ? '' : ` tone="${p.tone}"`
  return `import { Avatar } from '@satin/ui/avatar'

<Avatar initials="${p.initials}"${tone}${named ? ` name="${p.name}"` : ''}${attrs} />`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [...['size', 'shape', 'tone'].map((k) => labelOf(k, v[k])), v.tooltip === 'on' ? 'Name tooltip' : 'No tooltip'].join(' · '),
  code: code(v),
}))

export default function AvatarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Avatar"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex max-w-md flex-wrap items-center justify-center gap-2">
          {people
            .filter((p) => v.tone === 'all' || v.tone === p.tone)
            .map((p) => (
              <Avatar
                key={p.tone}
                initials={p.initials}
                tone={p.tone}
                name={v.tooltip === 'on' ? p.name : undefined}
                size={Number(v.size) as AvatarSize}
                shape={v.shape as 'circle' | 'rounded'}
              />
            ))}
        </div>
      )}
    />
  )
}
