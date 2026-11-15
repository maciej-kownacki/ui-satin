import { SelectableCheckbox } from '@uisatin/ui/selectable-checkbox'
import { Calendar, Mail, Page } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'sm', label: 'SM' }, { value: 'md', label: 'MD' }] },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'on' },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

const tools = [
  { value: 'mail', Icon: Mail, icon: 'Mail', title: 'Email', description: 'Read and draft replies in your inbox.', checked: true },
  { value: 'calendar', Icon: Calendar, icon: 'Calendar', title: 'Calendar', description: 'See free slots and book meetings.', checked: true },
  { value: 'docs', Icon: Page, icon: 'Page', title: 'Documents', description: 'Search and quote your team’s docs.', checked: false },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const props = (t: (typeof tools)[number]) =>
    [
      `name="tools" value="${t.value}"`,
      t.checked && 'defaultChecked',
      v.size === 'sm' && 'size="sm"',
      on(v, 'icon') && `icon={<${t.icon} />}`,
      `title="${t.title}"`,
      on(v, 'description') && `description="${t.description}"`,
      on(v, 'disabled') && t.value === 'docs' && 'disabled',
    ].filter(Boolean)
  return `import { SelectableCheckbox } from '@uisatin/ui/selectable-checkbox'
${on(v, 'icon') ? `import { ${tools.map((t) => t.icon).join(', ')} } from 'iconoir-react'\n` : ''}
<div role="group" aria-label="Tools the agent may use" className="grid ${v.size === 'sm' ? 'gap-2' : 'gap-3'}">
${tools.map((t) => `  <SelectableCheckbox ${props(t).join(' ')} />`).join('\n')}
</div>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: Object.values(v).join(' · '), code: code(v) }))

export default function SelectableCheckboxDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Selectable checkbox"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => (
        <div key={id} role="group" aria-label="Tools the agent may use" className={v.size === 'sm' ? 'grid w-[360px] max-w-full gap-2' : 'grid w-[360px] max-w-full gap-3'}>
          {tools.map((t) => (
            <SelectableCheckbox
              key={t.value}
              name="tools"
              value={t.value}
              defaultChecked={t.checked}
              size={v.size as 'sm' | 'md'}
              icon={on(v, 'icon') ? <t.Icon /> : undefined}
              title={t.title}
              description={on(v, 'description') ? t.description : undefined}
              disabled={on(v, 'disabled') && t.value === 'docs'}
            />
          ))}
        </div>
      )}
    />
  )
}
