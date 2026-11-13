import * as React from 'react'
import { Select, type SelectGroup, type SelectOption } from '@uisatin/ui/select'
import { CheckCircle, Circle, Clock, Eye, XmarkCircle } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// The statuses from the Dropdown page, so the two lists read the same.
const groups = [
  {
    label: 'Open',
    options: [
      { value: 'backlog', label: 'Backlog', description: 'Not started yet', Icon: Circle, icon: 'Circle' },
      { value: 'progress', label: 'In progress', description: 'Someone is on it', Icon: Clock, icon: 'Clock' },
      { value: 'review', label: 'In review', description: 'Waiting for approval', Icon: Eye, icon: 'Eye' },
    ],
  },
  {
    label: 'Closed',
    options: [
      { value: 'done', label: 'Done', description: 'Shipped and checked', Icon: CheckCircle, icon: 'CheckCircle' },
      { value: 'cancelled', label: 'Cancelled', description: 'Won’t be done', Icon: XmarkCircle, icon: 'XmarkCircle' },
    ],
  },
]
const all = groups.flatMap((g) => g.options)
const label = 'Status'
const hint = 'Everyone on the project sees it.'
const error = 'Pick a status before you save.'

// The field first (size, label and hint), then what every option carries, the state last. A
// leading icon puts each option's icon in the list and the picked one's in the field.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }] },
  { id: 'field', label: 'Label & hint', type: 'switch', default: 'on' },
  { id: 'leading', label: 'Leading icon', type: 'switch', default: 'on' },
  { id: 'description', label: 'Description', type: 'switch', default: 'off' },
  { id: 'groups', label: 'Groups', type: 'switch', default: 'off' },
  { id: 'state', label: 'State', items: [{ value: 'default', label: 'Default' }, { value: 'error', label: 'Error' }, { value: 'disabled', label: 'Disabled' }] },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'
const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function optionsFor(v: Record<string, string>): SelectOption[] | SelectGroup[] {
  const map = (o: (typeof all)[number]): SelectOption => ({
    value: o.value,
    label: o.label,
    icon: on(v, 'leading') ? <o.Icon /> : undefined,
    description: on(v, 'description') ? o.description : undefined,
  })
  return on(v, 'groups') ? groups.map((g) => ({ label: g.label, options: g.options.map(map) })) : all.map(map)
}

function code(v: Record<string, string>) {
  const icons = on(v, 'leading') ? all.map((o) => o.icon) : []
  const opt = (o: (typeof all)[number], indent: string) =>
    `${indent}{ value: '${o.value}', label: '${o.label}'${on(v, 'leading') ? `, icon: <${o.icon} />` : ''}${on(v, 'description') ? `, description: '${o.description}'` : ''} },`
  const list = on(v, 'groups')
    ? `[\n${groups.map((g) => `  { label: '${g.label}', options: [\n${g.options.map((o) => opt(o, '    ')).join('\n')}\n  ] },`).join('\n')}\n]`
    : `[\n${all.map((o) => opt(o, '  ')).join('\n')}\n]`
  const attrs = [
    v.size !== 'md' && `size="${v.size}"`,
    on(v, 'field') ? `label="${label}"` : `aria-label="${label}"`,
    on(v, 'field') && v.state !== 'error' && `hint="${hint}"`,
    'placeholder="Select a status"',
    v.state !== 'error' && 'defaultValue="progress"',
    'options={statuses}',
    v.state === 'error' && `error="${error}"`,
    v.state === 'disabled' && 'disabled',
  ].filter(Boolean)
  return `import { Select } from '@uisatin/ui/select'
${icons.length ? `import { ${[...new Set(icons)].sort().join(', ')} } from 'iconoir-react'\n` : ''}
// Options with icons put the picked one's icon in the field too.
const statuses = ${list}

<Select
${attrs.map((a) => `  ${a}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('size', v.size),
    on(v, 'field') ? 'Label & hint' : 'No label',
    on(v, 'leading') ? 'Leading icon' : 'No leading icon',
    on(v, 'description') ? 'Description' : 'No description',
    on(v, 'groups') ? 'Groups' : 'No groups',
    labelOf('state', v.state),
  ].join(' · '),
  code: code(v),
}))

/**
 * The list portals into the stage, so it opens over the preview and never past it. The field
 * keeps its place whatever the props: without a label, an empty line holds the label's room.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  return (
    <div className="relative flex h-[400px] w-80 max-w-full flex-col pt-6">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {!on(v, 'field') && <div aria-hidden className="h-[26px] shrink-0" />}
      <Select
        // Only the state remounts it, so its starting value applies; other props change in place.
        key={v.state}
        container={stage}
        size={v.size as 'sm' | 'md' | 'lg'}
        label={on(v, 'field') ? label : undefined}
        aria-label={on(v, 'field') ? undefined : label}
        hint={on(v, 'field') ? hint : undefined}
        placeholder="Select a status"
        defaultValue={v.state === 'error' ? undefined : 'progress'}
        layout={on(v, 'description') ? 'stacked' : 'inline'}
        options={optionsFor(v)}
        error={v.state === 'error' ? error : undefined}
        disabled={v.state === 'disabled'}
      />
    </div>
  )
}

export default function SelectDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Select" options={options} codeHtml={codeHtml} controls={controls} render={(_, v) => <Preview v={v} />} />
}
