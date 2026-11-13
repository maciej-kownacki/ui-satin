import { Tabs } from '@uisatin/ui/tabs'
import { Activity, Group, Settings, ViewGrid } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const tabs = [
  { value: 'overview', label: 'Overview', Icon: ViewGrid, icon: 'ViewGrid' },
  { value: 'activity', label: 'Activity', Icon: Activity, icon: 'Activity' },
  { value: 'settings', label: 'Settings', Icon: Settings, icon: 'Settings' },
  { value: 'members', label: 'Members', Icon: Group, icon: 'Group' },
]

export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', items: [{ value: 'md', label: 'Medium' }, { value: 'sm', label: 'Small' }] },
  { id: 'variant', label: 'Variant', items: [{ value: 'underline', label: 'Underline' }, { value: 'pill', label: 'Pill' }] },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'off' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

const defaults: Record<string, string> = { size: 'md', variant: 'underline' }
const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const icon = v.icon === 'on'
  const attrs = ['size', 'variant'].filter((k) => v[k] !== defaults[k]).map((k) => `\n  ${k}="${v[k]}"`).join('')
  const items = icon
    ? `[\n${tabs.map((t) => `    { value: '${t.value}', label: '${t.label}', icon: <${t.icon} /> },`).join('\n')}\n  ]`
    : `[${tabs.map((t) => `'${t.label}'`).join(', ')}]`
  return `import { Tabs } from '@uisatin/ui/tabs'
${icon ? `import { ${tabs.map((t) => t.icon).join(', ')} } from 'iconoir-react'\n` : ''}
<Tabs${attrs}${v.disabled === 'on' ? '\n  disabled' : ''}
  items={${items}}
/>`
}

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('size', v.size),
    labelOf('variant', v.variant),
    v.icon === 'on' ? 'Icon' : 'No icon',
    v.disabled === 'on' ? 'Disabled' : 'Enabled',
  ].join(' · '),
  code: code(v),
}))

export default function TabsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Tabs"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="w-[560px] max-w-full">
          <Tabs
            // Plain items use their labels as values, so the selection restarts when icons toggle.
            key={v.icon}
            aria-label="Project"
            variant={v.variant as 'underline' | 'pill'}
            size={v.size as 'md' | 'sm'}
            disabled={v.disabled === 'on'}
            items={
              v.icon === 'on'
                ? tabs.map(({ value, label, Icon }) => ({ value, label, icon: <Icon aria-hidden /> }))
                : tabs.map((t) => t.label)
            }
          />
        </div>
      )}
    />
  )
}
