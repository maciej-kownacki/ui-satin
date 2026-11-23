import { RelativeTime } from '@uisatin/ui/relative-time'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const MIN = 60_000

// How long ago, from the moment the stage renders; older ones show the clock time.
const ago: Record<string, (now: number) => Date> = {
  now: (now) => new Date(now - 20_000),
  minutes: (now) => new Date(now - 5 * MIN),
  hours: (now) => new Date(now - 2 * 60 * MIN),
  yesterday: (now) => {
    const d = new Date(now - 86_400_000)
    d.setHours(9, 40, 0, 0)
    return d
  },
}

export const controls: ShowcaseControl[] = [
  {
    id: 'when',
    label: 'When',
    items: [
      { value: 'minutes', label: '5 minutes ago' },
      { value: 'now', label: 'Just now' },
      { value: 'hours', label: '2 hours ago' },
      { value: 'yesterday', label: 'Yesterday' },
    ],
  },
  { id: 'withDate', label: 'With date', type: 'switch', default: 'off' },
]

const labelOf = (value: string) => {
  const c = controls[0]!
  return 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

const atCode: Record<string, string> = {
  now: 'Date.now() - 20_000',
  minutes: 'Date.now() - 5 * 60_000',
  hours: 'Date.now() - 2 * 3_600_000',
  yesterday: 'comment.createdAt',
}

function code(v: Record<string, string>) {
  return `import { RelativeTime } from '@uisatin/ui/relative-time'

<RelativeTime at={${atCode[v.when]}}${v.withDate === 'on' ? ' withDate' : ''} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: `${labelOf(v.when)} · ${v.withDate === 'on' ? 'With date' : 'Time only'}`,
  code: code(v),
}))

export default function RelativeTimeDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Relative time"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <p className="flex items-baseline gap-2 text-sm text-text-default">
          <span>
            <span className="font-medium">Tara Mendes</span> commented on the offer
          </span>
          <RelativeTime at={ago[v.when]!(Date.now())} withDate={v.withDate === 'on'} />
        </p>
      )}
    />
  )
}
