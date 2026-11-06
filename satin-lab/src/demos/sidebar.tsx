import * as React from 'react'
import { Sidebar, SidebarGroup, SidebarItem, SidebarSubItem } from '@satin/ui/sidebar'
import { Bookmark, Calendar, Home, Mail, Settings, Sparks } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const expandedCode = `import { Sidebar, SidebarGroup, SidebarItem, SidebarSubItem } from '@satin/ui/sidebar'
import { Bookmark, Home, Mail, Settings, Sparks } from 'iconoir-react'

export function AppNav() {
  return (
    <Sidebar aria-label="Main" className="w-60">
      <SidebarItem href="/" label="Home" icon={<Home />} active />
      <SidebarItem href="/inbox" label="Inbox" icon={<Mail />} count={12} />
      <SidebarItem href="/agents" label="Agents" icon={<Sparks />} count={2} />
      <SidebarItem href="/settings" label="Settings" icon={<Settings />} />
      <SidebarGroup label="Docs" icon={<Bookmark />} count={3} className="mt-3">
        <SidebarSubItem href="/docs/intro" label="Introduction" />
        <SidebarSubItem href="/docs/setup" label="Getting started" />
        <SidebarSubItem href="/docs/agents" label="Agents" disabled />
      </SidebarGroup>
    </Sidebar>
  )
}`

const iconOnlyCode = `import { Sidebar, SidebarItem } from '@satin/ui/sidebar'
import { Calendar, Home, Mail, Settings, Sparks } from 'iconoir-react'

export function Rail() {
  return (
    <Sidebar aria-label="Main" className="w-8">
      <SidebarItem iconOnly href="/" label="Home" icon={<Home />} active />
      <SidebarItem iconOnly href="/inbox" label="Inbox" icon={<Mail />} count={12} />
      <SidebarItem iconOnly href="/agents" label="Agents" icon={<Sparks />} />
      <SidebarItem iconOnly href="/calendar" label="Calendar" icon={<Calendar />} />
      <SidebarItem iconOnly href="/settings" label="Settings" icon={<Settings />} />
    </Sidebar>
  )
}`

export const options: ShowcaseOption[] = [
  { id: 'expanded', label: 'Expanded', code: expandedCode },
  { id: 'icon-only', label: 'Icon only', code: iconOnlyCode },
]

const pages = [
  { id: 'home', label: 'Home', icon: <Home /> },
  { id: 'inbox', label: 'Inbox', icon: <Mail />, count: 12 },
  { id: 'agents', label: 'Agents', icon: <Sparks />, count: 2 },
  { id: 'calendar', label: 'Calendar', icon: <Calendar /> },
  { id: 'settings', label: 'Settings', icon: <Settings /> },
]

function Demo({ iconOnly }: { iconOnly: boolean }) {
  const [current, setCurrent] = React.useState('home')
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setCurrent(id)
  }
  const items = iconOnly ? pages : pages.filter((p) => p.id !== 'calendar')

  return (
    <Sidebar aria-label="Demo" className={iconOnly ? 'w-8' : 'w-60'}>
      {items.map((p) => (
        <SidebarItem
          key={p.id}
          href={`#${p.id}`}
          onClick={go(p.id)}
          label={p.label}
          icon={p.icon}
          count={p.count}
          iconOnly={iconOnly}
          active={current === p.id}
        />
      ))}
      {!iconOnly && (
        <SidebarGroup label="Docs" icon={<Bookmark />} count={3} className="mt-3">
          <SidebarSubItem href="#intro" onClick={go('intro')} label="Introduction" active={current === 'intro'} />
          <SidebarSubItem href="#setup" onClick={go('setup')} label="Getting started" active={current === 'setup'} />
          <SidebarSubItem label="Agents" disabled />
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
      render={(id) => <Demo key={id} iconOnly={id === 'icon-only'} />}
    />
  )
}
