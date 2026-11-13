import { Progress } from '@uisatin/ui/progress'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'value', label: 'Value', items: [{ value: '40', label: '40%' }, { value: '100', label: '100%' }, { value: 'unknown', label: 'Unknown' }] },
  { id: 'size', label: 'Size', items: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }] },
  { id: 'label', label: 'Label', type: 'switch', default: 'on' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const p = [
    v.value !== 'unknown' && `value={${v.value}}`,
    on(v, 'label') ? 'label="Uploading files"' : 'aria-label="Uploading files"',
    v.size === 'md' && 'size="md"',
  ].filter(Boolean)
  return `import { Progress } from '@uisatin/ui/progress'\n\n<Progress ${p.join(' ')} />`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.value === 'unknown' ? 'Unknown' : `${v.value}%`, v.size === 'md' ? 'Medium' : 'Small'].join(' · '),
  code: code(v),
}))

export default function ProgressDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Progress"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="w-80 max-w-full">
          <Progress
            value={v.value === 'unknown' ? undefined : Number(v.value)}
            label={on(v, 'label') ? 'Uploading files' : undefined}
            aria-label="Uploading files"
            size={v.size as 'sm' | 'md'}
          />
        </div>
      )}
    />
  )
}
