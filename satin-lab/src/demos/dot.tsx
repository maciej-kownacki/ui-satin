import { Dot, type DotTone } from '@satin/ui/dot'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const tones: DotTone[] = ['fuchsia', 'sky', 'plum', 'green']
const statuses: { label: string; tone: DotTone; variant: 'solid' | 'outline' }[] = [
  { label: 'Running', tone: 'green', variant: 'solid' },
  { label: 'Queued', tone: 'sky', variant: 'outline' },
  { label: 'Paused', tone: 'plum', variant: 'outline' },
  { label: 'Failed', tone: 'fuchsia', variant: 'solid' },
]

export const options: ShowcaseOption[] = [
  {
    id: 'solid',
    label: 'Solid',
    code: `import { Dot } from '@satin/ui/dot'

<Dot tone="fuchsia" label="Live" />
<Dot tone="sky" label="Live" />`,
  },
  {
    id: 'outline',
    label: 'Outline',
    code: `import { Dot } from '@satin/ui/dot'

<Dot tone="fuchsia" variant="outline" label="Paused" />
<Dot tone="sky" variant="outline" label="Paused" />`,
  },
  {
    id: 'label',
    label: 'With a label',
    code: `import { Dot } from '@satin/ui/dot'

<span className="flex items-center gap-2 text-sm">
  <Dot tone="green" />
  Running
</span>`,
  },
]

export default function DotDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Dot"
      options={options}
      codeHtml={codeHtml}
      render={(id) =>
        id === 'label' ? (
          <ul className="flex flex-col gap-3">
            {statuses.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm text-text-default">
                <Dot tone={s.tone} variant={s.variant} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2">
            {tones.map((tone) => (
              <Dot key={tone} tone={tone} variant={id === 'outline' ? 'outline' : 'solid'} label={`${tone} status`} />
            ))}
          </div>
        )
      }
    />
  )
}
