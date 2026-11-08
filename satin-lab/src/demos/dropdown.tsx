import * as React from 'react'
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem } from '@satin/ui/dropdown'
import { CheckCircle, Circle, Clock, Eye, XmarkCircle } from 'iconoir-react'
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
      <NavArrowDown data-chevron />
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

/**
 * The menu alone: it stays open (non-modal, so the docs page keeps scrolling) and portals into the
 * stage, hung from an empty anchor where the trigger would be, so only the menu shows.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const [status, setStatus] = React.useState(current)
  // Opening on mount pulls focus into the menu, which would yank keyboard users off the page
  // (or off the property they just changed). Hand focus back to where it was.
  const before = React.useRef<Element | null>(null)
  if (before.current === null && typeof document !== 'undefined') before.current = document.activeElement
  React.useEffect(() => {
    if (!stage) return
    const onFocus = (e: FocusEvent) => {
      const prev = before.current
      if (prev instanceof HTMLElement && prev !== document.body && prev.isConnected) {
        prev.focus({ preventScroll: true })
        return
      }
      // Nothing had focus yet: back to the top of the page, so Tab starts at the skip link.
      ;(e.target as HTMLElement).blur()
      document.body.tabIndex = -1
      document.body.focus({ preventScroll: true })
      document.body.removeAttribute('tabindex')
    }
    stage.addEventListener('focusin', onFocus, { once: true })
    return () => stage.removeEventListener('focusin', onFocus)
  }, [stage])
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

  // Room for the open menu, so it stays inside the stage: measured from the
  // menu itself, so it follows any change to the rows. The guess only holds until it opens.
  const boxRef = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState(240)
  React.useEffect(() => {
    if (!stage) return
    let resize: ResizeObserver | undefined
    const fit = (menu: Element) => {
      const box = boxRef.current
      if (box) setHeight(Math.ceil(menu.getBoundingClientRect().bottom - box.getBoundingClientRect().top))
    }
    const watch = (menu: Element) => {
      fit(menu)
      // Again once the open animation lands, since it moves the menu without resizing it.
      menu.addEventListener('animationend', () => fit(menu), { once: true })
      resize = new ResizeObserver(() => fit(menu))
      resize.observe(menu)
    }
    // The menu portals into the stage once it opens; wait for it there.
    const found = stage.querySelector('[role="menu"]')
    const added = new MutationObserver(() => {
      const menu = stage.querySelector('[role="menu"]')
      if (menu) {
        added.disconnect()
        watch(menu)
      }
    })
    if (found) watch(found)
    else added.observe(stage, { childList: true, subtree: true })
    return () => {
      added.disconnect()
      resize?.disconnect()
    }
  }, [stage])

  return (
    <div ref={boxRef} className="flex w-[255px] flex-col items-stretch" style={{ height }}>
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10" />
      {stage && (
        <DropdownMenu
          container={stage}
          open
          modal={false}
          sideOffset={0}
          aria-label="Status"
          onFocusOutside={(e) => e.preventDefault()}
          trigger={<span aria-hidden tabIndex={-1} className="pointer-events-none block h-0 w-full" />}
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
