import * as React from 'react'
import { Button } from '@satin/ui'
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem } from '@satin/ui/dropdown'
import { CheckCircle, Circle, Clock, Eye, NavArrowDown, XmarkCircle } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// A status menu: the current status is the selected item, and the statuses fall into two groups.
const groups = [
  {
    label: 'Open',
    items: [
      { value: 'backlog', label: 'Backlog', description: 'Not started yet', Icon: Circle, icon: 'Circle' },
      { value: 'progress', label: 'In progress', description: 'Someone is on it', Icon: Clock, icon: 'Clock' },
      { value: 'review', label: 'In review', description: 'Waiting for approval', Icon: Eye, icon: 'Eye' },
    ],
  },
  {
    label: 'Closed',
    items: [
      { value: 'done', label: 'Done', description: 'Shipped and checked', Icon: CheckCircle, icon: 'CheckCircle' },
      { value: 'cancelled', label: 'Cancelled', description: 'Won’t be done', Icon: XmarkCircle, icon: 'XmarkCircle' },
    ],
  },
]
const items = groups.flatMap((g) => g.items)
const current = 'progress'

// Item layout shapes every row, groups split the list; then what each row carries, selection last.
export const controls: ShowcaseControl[] = [
  { id: 'layout', label: 'Layout', items: [{ value: 'stacked', label: 'Stacked' }, { value: 'inline', label: 'Inline' }] },
  { id: 'groups', label: 'Groups', type: 'switch', default: 'off' },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'on' },
  { id: 'description', label: 'Description', type: 'switch', default: 'off' },
  { id: 'selected', label: 'Selected', type: 'switch', default: 'on' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const item = (i: (typeof items)[number], indent: string) =>
    `${indent}<DropdownMenuItem${[
      v.layout === 'inline' && ' layout="inline"',
      on(v, 'icon') && ` icon={<${i.icon} />}`,
      ` label="${i.label}"`,
      on(v, 'description') && ` description="${i.description}"`,
      on(v, 'selected') && i.value === current && ' selected',
    ]
      .filter(Boolean)
      .join('')} />`
  const body = on(v, 'groups')
    ? groups
        .map((g) => `  <DropdownMenuGroup label="${g.label}">\n${g.items.map((i) => item(i, '    ')).join('\n')}\n  </DropdownMenuGroup>`)
        .join('\n')
    : items.map((i) => item(i, '  ')).join('\n')
  const icons = [...(on(v, 'icon') ? items.map((i) => i.icon) : []), 'NavArrowDown'].sort()
  return `import { Button } from '@satin/ui/button'
import { DropdownMenu, ${on(v, 'groups') ? 'DropdownMenuGroup, ' : ''}DropdownMenuItem } from '@satin/ui/dropdown'
import { ${icons.join(', ')} } from 'iconoir-react'

<DropdownMenu
  trigger={
    <Button variant="secondary">
      Status
      <NavArrowDown />
    </Button>
  }
>
${body}
</DropdownMenu>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.layout === 'inline' ? 'Inline' : 'Stacked',
    on(v, 'groups') ? 'Groups' : 'No groups',
    on(v, 'icon') ? 'Icon' : 'No icon',
    on(v, 'description') ? 'Description' : 'No description',
    on(v, 'selected') ? 'Selected' : 'No selection',
  ].join(' · '),
  code: code(v),
}))

/** The menu opens on load (non-modal, so the docs page keeps scrolling) and portals into the stage. */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const [status, setStatus] = React.useState(current)
  const row = (i: (typeof items)[number]) => (
    <DropdownMenuItem
      key={i.value}
      layout={v.layout as 'stacked' | 'inline'}
      icon={on(v, 'icon') ? <i.Icon /> : undefined}
      label={i.label}
      description={on(v, 'description') ? i.description : undefined}
      selected={on(v, 'selected') && status === i.value}
      onSelect={() => setStatus(i.value)}
    />
  )

  // Room under the trigger for the open menu, so it stays inside the stage: trigger and offset,
  // five rows (taller with a stacked description), group headers and the rule between groups.
  const rowHeight = on(v, 'description') && v.layout === 'stacked' ? 50 : 32
  const height = 40 + 10 + items.length * rowHeight + (on(v, 'groups') ? 2 * 24 + 17 : 0)

  return (
    <div className="flex w-[255px] items-start" style={{ height }}>
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10" />
      {stage && (
        <DropdownMenu
          container={stage}
          defaultOpen
          modal={false}
          trigger={
            <Button variant="secondary">
              Status
              <NavArrowDown />
            </Button>
          }
        >
          {on(v, 'groups')
            ? groups.map((g) => (
                <DropdownMenuGroup key={g.label} label={g.label}>
                  {g.items.map(row)}
                </DropdownMenuGroup>
              ))
            : items.map(row)}
        </DropdownMenu>
      )}
    </div>
  )
}

export default function DropdownDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Dropdown"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Preview key={id} v={v} />}
    />
  )
}
