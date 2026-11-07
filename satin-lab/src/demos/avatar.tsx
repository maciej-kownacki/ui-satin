import { Avatar, type AvatarSize, type AvatarTone } from '@satin/ui/avatar'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const people: { initials: string; tone: AvatarTone }[] = [
  { initials: 'RC', tone: 'neutral' },
  { initials: 'MK', tone: 'brand' },
  { initials: 'AN', tone: 'sky' },
  { initials: 'JD', tone: 'green' },
  { initials: 'EW', tone: 'amber' },
  { initials: 'TS', tone: 'red' },
  { initials: 'LB', tone: 'fuchsia' },
  { initials: 'OP', tone: 'plum' },
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
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const attrs = (v.size === '32' ? '' : ` size={${v.size}}`) + (v.shape === 'circle' ? '' : ` shape="${v.shape}"`)
  if (v.tone === 'all') {
    const rows = people.map((p) => `  { initials: '${p.initials}', tone: '${p.tone}' },`).join('\n')
    return `import { Avatar } from '@satin/ui/avatar'

const people = [
${rows}
] as const

{people.map(({ initials, tone }) => (
  <Avatar key={tone} initials={initials} tone={tone}${attrs} />
))}`
  }
  const p = people.find((p) => p.tone === v.tone)!
  const tone = p.tone === 'neutral' ? '' : ` tone="${p.tone}"`
  return `import { Avatar } from '@satin/ui/avatar'

<Avatar initials="${p.initials}"${tone}${attrs} />`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: ['size', 'shape', 'tone'].map((k) => labelOf(k, v[k])).join(' · '),
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
              <Avatar key={p.tone} {...p} size={Number(v.size) as AvatarSize} shape={v.shape as 'circle' | 'rounded'} />
            ))}
        </div>
      )}
    />
  )
}
