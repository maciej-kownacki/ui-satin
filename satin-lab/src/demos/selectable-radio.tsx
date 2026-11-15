import { RadioGroup } from '@uisatin/ui/radio'
import { SelectableRadio } from '@uisatin/ui/selectable-radio'
import { Building, Group, User } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'sm', label: 'SM' }, { value: 'md', label: 'MD' }] },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'on' },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

const plans = [
  { value: 'personal', Icon: User, icon: 'User', title: 'Personal', description: 'One seat, your own agents.' },
  { value: 'team', Icon: Group, icon: 'Group', title: 'Team', description: '$12 per person, shared agents.' },
  { value: 'business', Icon: Building, icon: 'Building', title: 'Business', description: 'SSO, audit log and admin roles.' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const props = (p: (typeof plans)[number]) =>
    [
      `value="${p.value}"`,
      v.size === 'sm' && 'size="sm"',
      on(v, 'icon') && `icon={<${p.icon} />}`,
      `title="${p.title}"`,
      on(v, 'description') && `description="${p.description}"`,
      on(v, 'disabled') && p.value === 'business' && 'disabled',
    ].filter(Boolean)
  return `import { RadioGroup } from '@uisatin/ui/radio'
import { SelectableRadio } from '@uisatin/ui/selectable-radio'
${on(v, 'icon') ? `import { ${plans.map((p) => p.icon).join(', ')} } from 'iconoir-react'\n` : ''}
<RadioGroup name="plan" defaultValue="team" aria-label="Plan"${v.size === 'sm' ? ' className="gap-2"' : ''}>
${plans.map((p) => `  <SelectableRadio ${props(p).join(' ')} />`).join('\n')}
</RadioGroup>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: Object.values(v).join(' · '), code: code(v) }))

export default function SelectableRadioDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Selectable radio"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => (
        <RadioGroup key={id} name="plan" defaultValue="team" aria-label="Plan" className={v.size === 'sm' ? 'w-[360px] max-w-full gap-2' : 'w-[360px] max-w-full'}>
          {plans.map((p) => (
            <SelectableRadio
              key={p.value}
              value={p.value}
              size={v.size as 'sm' | 'md'}
              icon={on(v, 'icon') ? <p.Icon /> : undefined}
              title={p.title}
              description={on(v, 'description') ? p.description : undefined}
              disabled={on(v, 'disabled') && p.value === 'business'}
            />
          ))}
        </RadioGroup>
      )}
    />
  )
}
