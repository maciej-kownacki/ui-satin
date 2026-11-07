import { Dot, type DotTone } from '@satin/ui/dot'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Each dot stands alone in the stage, so each carries its status as an accessible name.
const statuses: { tone: DotTone; label: string }[] = [
  { tone: 'fuchsia', label: 'Failed' },
  { tone: 'sky', label: 'Queued' },
  { tone: 'plum', label: 'Paused' },
  { tone: 'green', label: 'Running' },
]

const swatch = (tone: DotTone) => <span aria-hidden data-tone={tone} className="size-2.5 rounded-full bg-tone-fg" />
const title = (s: string) => s[0].toUpperCase() + s.slice(1)

export const controls: ShowcaseControl[] = [
  { id: 'variant', label: 'Variant', items: [{ value: 'solid', label: 'Solid' }, { value: 'outline', label: 'Outline' }] },
  {
    id: 'tone',
    label: 'Tone',
    type: 'menu',
    items: [{ value: 'all', label: 'All tones' }, ...statuses.map((s) => ({ value: s.tone, label: title(s.tone), icon: swatch(s.tone) }))],
  },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const variant = v.variant === 'solid' ? '' : ` variant="${v.variant}"`
  if (v.tone === 'all') {
    const rows = statuses.map((s) => `  { tone: '${s.tone}', label: '${s.label}' },`).join('\n')
    return `import { Dot } from '@satin/ui/dot'

const statuses = [
${rows}
] as const

{statuses.map(({ tone, label }) => (
  <Dot key={tone} tone={tone}${variant} label={label} />
))}`
  }
  const s = statuses.find((s) => s.tone === v.tone)!
  const tone = s.tone === 'fuchsia' ? '' : ` tone="${s.tone}"`
  return `import { Dot } from '@satin/ui/dot'

<Dot${tone}${variant} label="${s.label}" />`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: ['variant', 'tone'].map((k) => labelOf(k, v[k])).join(' · '),
  code: code(v),
}))

export default function DotDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Dot"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex items-center gap-2">
          {statuses
            .filter((s) => v.tone === 'all' || v.tone === s.tone)
            .map((s) => (
              <Dot key={s.tone} tone={s.tone} variant={v.variant as 'solid' | 'outline'} label={s.label} />
            ))}
        </div>
      )}
    />
  )
}
