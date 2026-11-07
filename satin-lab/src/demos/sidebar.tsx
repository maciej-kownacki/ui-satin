import * as React from 'react'
import { Sidebar, SidebarGroup, SidebarItem, SidebarSubItem } from '@satin/ui/sidebar'
import { Bookmark, Calendar, Home, Mail, Settings, Sparks } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const pages = [
  { id: 'home', label: 'Home', Icon: Home, icon: 'Home' },
  { id: 'inbox', label: 'Inbox', Icon: Mail, icon: 'Mail', count: 12 },
  { id: 'agents', label: 'Agents', Icon: Sparks, icon: 'Sparks', count: 2 },
  { id: 'calendar', label: 'Calendar', Icon: Calendar, icon: 'Calendar' },
  { id: 'settings', label: 'Settings', Icon: Settings, icon: 'Settings' },
]
const docs = [
  { id: 'intro', label: 'Introduction' },
  { id: 'setup', label: 'Getting started' },
  { id: 'guides', label: 'Agents' },
]

// The rail and the expanded list are different layouts, so that comes first. Counts are
// content either can carry; a disabled row is a state, last.
export const controls: ShowcaseControl[] = [
  { id: 'layout', label: 'Layout', items: [{ value: 'expanded', label: 'Expanded' }, { value: 'icon-only', label: 'Icon only' }] },
  { id: 'count', label: 'Counts', type: 'switch', default: 'on' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
]

// The expanded list shows the Docs group in the place of Calendar; the rail has no groups.
const itemsFor = (iconOnly: boolean) => (iconOnly ? pages : pages.filter((p) => p.id !== 'calendar'))
const disabledId = 'settings'

function code(v: Record<string, string>) {
  const iconOnly = v.layout === 'icon-only'
  const counts = v.count === 'on'
  const items = itemsFor(iconOnly)
    .map((p, i) => {
      const attrs = [
        iconOnly && 'iconOnly',
        `href="${p.id === 'home' ? '/' : `/${p.id}`}"`,
        `label="${p.label}"`,
        `icon={<${p.icon} />}`,
        i === 0 && 'active',
        counts && p.count && `count={${p.count}}`,
        v.disabled === 'on' && p.id === disabledId && 'disabled',
      ]
      return `      <SidebarItem ${attrs.filter(Boolean).join(' ')} />`
    })
    .join('\n')
  const icons = [...itemsFor(iconOnly).map((p) => p.icon), ...(iconOnly ? [] : ['Bookmark'])].sort()
  const group = iconOnly
    ? ''
    : `\n      <SidebarGroup label="Docs" icon={<Bookmark />}${counts ? ` count={${docs.length}}` : ''} className="mt-3">
${docs.map((d) => `        <SidebarSubItem href="/docs/${d.id}" label="${d.label}" />`).join('\n')}
      </SidebarGroup>`
  return `import { Sidebar, ${iconOnly ? 'SidebarItem' : 'SidebarGroup, SidebarItem, SidebarSubItem'} } from '@satin/ui/sidebar'
import { ${icons.join(', ')} } from 'iconoir-react'

export function ${iconOnly ? 'Rail' : 'AppNav'}() {
  return (
    <Sidebar aria-label="Main" className="${iconOnly ? 'w-8' : 'w-60'}">
${items}${group}
    </Sidebar>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.layout === 'icon-only' ? 'Icon only' : 'Expanded', v.count === 'on' ? 'Counts' : 'No counts', v.disabled === 'on' ? 'Disabled' : 'Enabled'].join(' · '),
  code: code(v),
}))

function Demo({ iconOnly, counts, disabled }: { iconOnly: boolean; counts: boolean; disabled: boolean }) {
  const [current, setCurrent] = React.useState('home')
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrent(id)
  }

  return (
    <Sidebar aria-label="Demo" className={iconOnly ? 'w-8' : 'w-60'}>
      {itemsFor(iconOnly).map(({ id, label, Icon, count }) => (
        <SidebarItem
          key={id}
          href={`#${id}`}
          onClick={go(id)}
          label={label}
          icon={<Icon />}
          count={counts ? count : undefined}
          iconOnly={iconOnly}
          active={current === id}
          disabled={disabled && id === disabledId}
        />
      ))}
      {!iconOnly && (
        <SidebarGroup label="Docs" icon={<Bookmark />} count={counts ? docs.length : undefined} className="mt-3">
          {docs.map((d) => (
            <SidebarSubItem key={d.id} href={`#${d.id}`} onClick={go(d.id)} label={d.label} active={current === d.id} />
          ))}
        </SidebarGroup>
      )}
    </Sidebar>
  )
}

export default function SidebarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Sidebar"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <Demo key={v.layout} iconOnly={v.layout === 'icon-only'} counts={v.count === 'on'} disabled={v.disabled === 'on'} />
      )}
    />
  )
}
