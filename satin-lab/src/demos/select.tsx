import * as React from 'react'
import { Select, type SelectGroup, type SelectOption } from '@satin/ui/select'
import { CheckCircle, Circle, Clock, Eye, TriangleFlag, XmarkCircle } from 'iconoir-react'
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

// The field first (size, label and hint, a leading icon), then what the list shows, the state last.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', default: 'md', items: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }] },
  { id: 'field', label: 'Label & hint', type: 'switch', default: 'on' },
  { id: 'leading', label: 'Leading icon', type: 'switch', default: 'off' },
  {
    id: 'list',
    label: 'Options',
    default: 'icons',
    items: [
      { value: 'plain', label: 'Plain' },
      { value: 'icons', label: 'Icons' },
      { value: 'descriptions', label: 'Descriptions' },
      { value: 'groups', label: 'Groups' },
    ],
  },
  { id: 'state', label: 'State', items: [{ value: 'default', label: 'Default' }, { value: 'error', label: 'Error' }, { value: 'disabled', label: 'Disabled' }] },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function optionsFor(v: Record<string, string>): SelectOption[] | SelectGroup[] {
  const map = (o: (typeof all)[number]): SelectOption => ({
    value: o.value,
    label: o.label,
    icon: v.list === 'plain' ? undefined : <o.Icon />,
    description: v.list === 'descriptions' ? o.description : undefined,
  })
  return v.list === 'groups' ? groups.map((g) => ({ label: g.label, options: g.options.map(map) })) : all.map(map)
}

function code(v: Record<string, string>) {
  const icons = v.list === 'plain' ? [] : all.map((o) => o.icon)
  if (v.leading === 'on') icons.push('TriangleFlag')
  const opt = (o: (typeof all)[number], indent: string) =>
    `${indent}{ value: '${o.value}', label: '${o.label}'${v.list === 'plain' ? '' : `, icon: <${o.icon} />`}${v.list === 'descriptions' ? `, description: '${o.description}'` : ''} },`
  const list =
    v.list === 'groups'
      ? `[\n${groups.map((g) => `  { label: '${g.label}', options: [\n${g.options.map((o) => opt(o, '    ')).join('\n')}\n  ] },`).join('\n')}\n]`
      : `[\n${all.map((o) => opt(o, '  ')).join('\n')}\n]`
  const attrs = [
    v.size !== 'md' && `size="${v.size}"`,
    v.field === 'on' ? `label="${label}"` : `aria-label="${label}"`,
    v.field === 'on' && v.state !== 'error' && `hint="${hint}"`,
    'placeholder="Select a status"',
    v.state !== 'error' && 'defaultValue="progress"',
    v.leading === 'on' && 'leadingIcon={<TriangleFlag />}',
    v.list === 'descriptions' && 'layout="stacked"',
    'options={statuses}',
    v.state === 'error' && `error="${error}"`,
    v.state === 'disabled' && 'disabled',
  ].filter(Boolean)
  return `import { Select } from '@satin/ui/select'
${icons.length ? `import { ${[...new Set(icons)].sort().join(', ')} } from 'iconoir-react'\n` : ''}
const statuses = ${list}

<Select
${attrs.map((a) => `  ${a}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('size', v.size),
    v.field === 'on' ? 'Label & hint' : 'No label',
    v.leading === 'on' ? 'Leading icon' : 'No leading icon',
    labelOf('list', v.list),
    labelOf('state', v.state),
  ].join(' · '),
  code: code(v),
}))

/** The list portals into the stage, so it opens over the preview and never past it. */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  return (
    <div className="relative flex h-[400px] w-80 max-w-full flex-col pt-6">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      <Select
        key={v.state}
        container={stage}
        size={v.size as 'sm' | 'md' | 'lg'}
        label={v.field === 'on' ? label : undefined}
        aria-label={v.field === 'on' ? undefined : label}
        hint={v.field === 'on' ? hint : undefined}
        placeholder="Select a status"
        defaultValue={v.state === 'error' ? undefined : 'progress'}
        leadingIcon={v.leading === 'on' ? <TriangleFlag /> : undefined}
        layout={v.list === 'descriptions' ? 'stacked' : 'inline'}
        options={optionsFor(v)}
        error={v.state === 'error' ? error : undefined}
        disabled={v.state === 'disabled'}
      />
    </div>
  )
}

export default function SelectDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Select" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
