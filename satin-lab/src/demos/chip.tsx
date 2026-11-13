import * as React from 'react'
import { Chip, ChipAvatar } from '@uisatin/ui/chip'
import type { BadgeTone } from '@uisatin/ui'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const people: { tone: BadgeTone; name: string; initials: string }[] = [
  { tone: 'neutral', name: 'Anna K.', initials: 'AK' },
  { tone: 'brand', name: 'Marek N.', initials: 'MN' },
  { tone: 'sky', name: 'Julia D.', initials: 'JD' },
  { tone: 'green', name: 'Tom S.', initials: 'TS' },
  { tone: 'amber', name: 'Eva W.', initials: 'EW' },
  { tone: 'red', name: 'Leo B.', initials: 'LB' },
  { tone: 'fuchsia', name: 'Olga P.', initials: 'OP' },
  { tone: 'plum', name: 'Ray C.', initials: 'RC' },
]

const swatch = (tone: BadgeTone) => <span aria-hidden data-tone={tone} className="size-2.5 rounded-full bg-tone-fg" />
const title = (s: string) => s[0].toUpperCase() + s.slice(1)

// Size sets the height, variant the fill, tone recolours it. Dot and avatar share the leading
// slot, so they're one control; the remove button is the trailing one.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', items: [{ value: 'md', label: 'Medium' }, { value: 'sm', label: 'Small' }] },
  { id: 'variant', label: 'Variant', items: [{ value: 'subtle', label: 'Subtle' }, { value: 'outline', label: 'Outline' }] },
  {
    id: 'tone',
    label: 'Tone',
    type: 'menu',
    items: [{ value: 'all', label: 'All tones' }, ...people.map((p) => ({ value: p.tone, label: title(p.tone), icon: swatch(p.tone) }))],
  },
  {
    id: 'leading',
    label: 'Leading',
    items: [{ value: 'none', label: 'None' }, { value: 'dot', label: 'Dot' }, { value: 'avatar', label: 'Avatar' }],
  },
  { id: 'remove', label: 'Remove', type: 'switch', default: 'on' },
]

const defaults: Record<string, string> = { size: 'md', variant: 'subtle' }
const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const attrs = ['size', 'variant'].filter((k) => v[k] !== defaults[k]).map((k) => ` ${k}="${v[k]}"`).join('')
  const avatar = v.leading === 'avatar'
  const imports = `import { Chip${avatar ? ', ChipAvatar' : ''} } from '@uisatin/ui/chip'`
  const dot = v.leading === 'dot' ? ' dot' : ''
  const remove = v.remove === 'on'
  if (v.tone === 'all') {
    const rows = people
      .map((p) => `  { tone: '${p.tone}', name: '${p.name}'${avatar ? `, initials: '${p.initials}'` : ''} },`)
      .join('\n')
    return `${imports}

const people = [
${rows}
] as const

{people.map(({ tone, name${avatar ? ', initials' : ''} }) => (
  <Chip
    key={tone}
    tone={tone}${attrs}${dot}${avatar ? '\n    avatar={<ChipAvatar initials={initials} />}' : ''}${remove ? '\n    onRemove={() => remove(name)}' : ''}
  >
    {name}
  </Chip>
))}`
  }
  const p = people.find((p) => p.tone === v.tone)!
  const tone = p.tone === 'neutral' ? '' : ` tone="${p.tone}"`
  const props = `${tone}${attrs}${dot}${avatar ? ` avatar={<ChipAvatar initials="${p.initials}" />}` : ''}${remove ? ` onRemove={() => remove('${p.name}')}` : ''}`
  return `${imports}

<Chip${props}>${p.name}</Chip>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    ...['size', 'variant', 'tone'].map((k) => labelOf(k, v[k])),
    v.leading === 'none' ? 'No leading' : labelOf('leading', v.leading),
    v.remove === 'on' ? 'Remove' : 'No remove',
  ].join(' · '),
  code: code(v),
}))

// Removing stays live in the stage; once every chip is gone, one chip brings them back.
function Chips({ v }: { v: Record<string, string> }) {
  const [removed, setRemoved] = React.useState<string[]>([])
  const shown = people.filter((p) => (v.tone === 'all' || v.tone === p.tone) && !removed.includes(p.tone))
  const size = v.size as 'md' | 'sm'
  const variant = v.variant as 'subtle' | 'outline'
  return (
    <div className="flex max-w-xl flex-wrap justify-center gap-2">
      {shown.map((p) => (
        <Chip
          key={p.tone}
          tone={p.tone}
          size={size}
          variant={variant}
          dot={v.leading === 'dot'}
          avatar={v.leading === 'avatar' ? <ChipAvatar initials={p.initials} /> : undefined}
          onRemove={v.remove === 'on' ? () => setRemoved((r) => [...r, p.tone]) : undefined}
        >
          {p.name}
        </Chip>
      ))}
      {shown.length === 0 && (
        <Chip size={size} variant="outline" onClick={() => setRemoved([])}>
          Reset
        </Chip>
      )}
    </div>
  )
}

export default function ChipDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Chip"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Chips key={id} v={v} />}
    />
  )
}
