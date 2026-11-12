import { Radio, RadioGroup } from '@satin/ui/radio'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const choices = [
  { value: 'public', label: 'Public', description: 'Anyone in the workspace can view.' },
  { value: 'private', label: 'Private', description: 'Only people you invite.' },
  { value: 'link', label: 'Anyone with the link', description: 'Anyone you send the link to.' },
]

// The selection stays live in the stage. Disabled is per option, so it turns off the last
// one, the way a plan-gated choice would be.
export const controls: ShowcaseControl[] = [
  { id: 'placement', label: 'Placement', items: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const rows = choices
    .map((c, i) => {
      const attrs = [
        `value="${c.value}"`,
        `label="${c.label}"`,
        v.description === 'on' && `description="${c.description}"`,
        v.placement !== 'left' && `placement="${v.placement}"`,
        v.disabled === 'on' && i === choices.length - 1 && 'disabled',
      ].filter(Boolean)
      return `  <Radio ${attrs.join(' ')} />`
    })
    .join('\n')
  return `import { Radio, RadioGroup } from '@satin/ui/radio'

<RadioGroup defaultValue="public" aria-label="Visibility">
${rows}
</RadioGroup>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    `Radio ${v.placement}`,
    v.description === 'on' ? 'Description' : 'No description',
    ...(v.disabled === 'on' ? ['Disabled option'] : []),
  ].join(' · '),
  code: code(v),
}))

export default function RadioDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Radio"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        // placement="right" gets a fixed width, so the circles visibly go to the far edge; on the left
        // the group hugs its widest row, so it sits centred on the stage.
        <RadioGroup defaultValue="public" aria-label="Visibility" className={v.placement === 'right' ? 'w-72 max-w-full' : 'w-fit max-w-72'}>
          {choices.map((c, i) => (
            <Radio
              key={c.value}
              value={c.value}
              label={c.label}
              description={v.description === 'on' ? c.description : undefined}
              placement={v.placement as 'left' | 'right'}
              disabled={v.disabled === 'on' && i === choices.length - 1}
            />
          ))}
        </RadioGroup>
      )}
    />
  )
}
