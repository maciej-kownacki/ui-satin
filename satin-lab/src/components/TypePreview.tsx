import * as React from 'react'
import { Avatar, Button, Input, SegmentedControl, Switch, cn } from '@satin/ui'
import { Sidebar, SidebarItem } from '@satin/ui/sidebar'
import { Customizer } from './Customizer'
import {
  AppleShortcuts,
  ArrowUpRight,
  Bell,
  Calendar,
  ChatBubble,
  Code,
  Github,
  Label,
  Link,
  NavArrowDown,
  NavArrowLeft,
  NavArrowRight,
  Page,
  Search,
  Settings,
  Sparks,
  User,
  UserCircle,
} from 'iconoir-react'

/**
 * A type preview: settings views built only from Satin's components, side by side, with the
 * type scale switched between Satin's own and one aligned with Linear's (lab.css,
 * [data-type-scale="linear"]). Everything but the type stays the same, so the difference is
 * only the type.
 */
type Scale = 'satin' | 'linear'
type View = 'preferences' | 'accounts' | 'profile'

const NAV: { label: string; items: { id: View | string; label: string; Icon: typeof User }[] }[] = [
  {
    label: 'Personal',
    items: [
      { id: 'preferences', label: 'Preferences', Icon: Settings },
      { id: 'profile', label: 'Profile', Icon: User },
      { id: 'notifications', label: 'Notifications', Icon: Bell },
      { id: 'code', label: 'Code & reviews', Icon: Code },
      { id: 'accounts', label: 'Connected accounts', Icon: Link },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'labels', label: 'Labels', Icon: Label },
      { id: 'templates', label: 'Templates', Icon: Page },
      { id: 'agents', label: 'AI & agents', Icon: Sparks },
    ],
  },
]

function Nav({ current }: { current: View }) {
  return (
    <aside className="flex w-[232px] shrink-0 flex-col gap-4 p-2">
      <a href="#" className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-text-muted no-underline hover:text-text-default">
        <NavArrowLeft className="size-4" />
        Back to app
      </a>
      <Input size="sm" aria-label="Search settings" placeholder="Search…" leadingIcon={<Search />} />
      {NAV.map((g) => (
        <div key={g.label} className="flex flex-col gap-0.5">
          <p className="px-2 pb-1 text-xs font-medium text-text-subtle">{g.label}</p>
          <Sidebar aria-label={g.label}>
            {g.items.map((i) => (
              <SidebarItem key={i.id} href="#" label={i.label} icon={<i.Icon />} active={i.id === current} />
            ))}
          </Sidebar>
        </div>
      ))}
    </aside>
  )
}

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-base font-medium text-text-default">{title}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

const Select = ({ value }: { value: string }) => (
  <Button variant="secondary">
    {value}
    <NavArrowDown />
  </Button>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="px-1 text-lg font-medium text-text-default">{title}</h2>
    <div className="flex flex-col divide-y divide-border-subtle rounded-xl border border-border-subtle bg-bg-card">{children}</div>
  </section>
)

function Preferences() {
  return (
    <>
      <h1 className="text-2xl font-medium text-text-default">Preferences</h1>
      <Section title="General">
        <Row title="Default home view" description="Which view opens when you launch the app">
          <Select value="Inbox" />
        </Row>
        <Row title="Display names" description="How people's names show across the interface">
          <Select value="Full name" />
        </Row>
        <Row title="First day of the week" description="Used for date pickers">
          <Select value="Monday" />
        </Row>
        <Row title="Convert text emoticons" description="Strings like :) turn into emoji">
          <Switch aria-label="Convert text emoticons" defaultChecked />
        </Row>
      </Section>
      <Section title="Interface">
        <Row title="Sidebar" description="Item visibility, ordering and badge style">
          <Button variant="tertiary">Customize</Button>
        </Row>
        <Row title="Pointer cursors" description="Show a pointer over every interactive element">
          <Switch aria-label="Pointer cursors" />
        </Row>
        <Row title="Underline links" description="Always underline links in text content">
          <Switch aria-label="Underline links" />
        </Row>
      </Section>
    </>
  )
}

const ACCOUNTS = [
  { name: 'Slack', description: 'Sync message attribution and get notifications in Slack', Icon: ChatBubble },
  { name: 'GitHub', description: 'Review code here and sync attribution of git actions', Icon: Github },
  { name: 'Google Calendar', description: 'Sync your out-of-office status', Icon: Calendar },
  { name: 'Shortcuts', description: 'Run actions from the Shortcuts app', Icon: AppleShortcuts },
]

function Accounts() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium text-text-default">Connected accounts</h1>
        <p className="text-base text-text-muted">Connect your accounts to sync attribution of your actions between apps.</p>
      </div>
      <div className="flex flex-col gap-2">
        {ACCOUNTS.map(({ name, description, Icon }) => (
          <div key={name} className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-card px-4 py-3.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-bg-muted text-text-default">
              <Icon className="size-4" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-base font-medium text-text-default">{name}</p>
              <p className="truncate text-sm text-text-muted">{description}</p>
            </div>
            <Button variant="tertiary">
              Connect
              <ArrowUpRight />
            </Button>
          </div>
        ))}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-card px-4 py-3.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-bg-muted text-text-default">
            <Sparks className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-base font-medium text-text-default">MCP connectors</p>
            <p className="text-sm text-text-muted">Manage connectors for agents in AI & agents</p>
          </div>
          <NavArrowRight className="size-4 text-text-muted" />
        </div>
      </div>
    </>
  )
}

function Profile() {
  return (
    <>
      <h1 className="text-2xl font-medium text-text-default">Profile</h1>
      <div className="flex items-center gap-4">
        <Avatar initials="MK" tone="brand" size={48} />
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-medium text-text-default">Maciej Kownacki</p>
          <p className="text-sm text-text-muted">Design Manager · Joined March 2024</p>
        </div>
      </div>
      <Section title="Details">
        <div className="flex flex-col gap-4 p-4">
          <Input label="Full name" defaultValue="Maciej Kownacki" />
          <Input label="Username" defaultValue="maciej" hint="Others can mention you with @maciej" />
          <Input label="Email" defaultValue="maciej@satin.dev" leadingIcon={<UserCircle />} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary">Cancel</Button>
            <Button>Save changes</Button>
          </div>
        </div>
      </Section>
    </>
  )
}

const VIEWS: { id: View; title: string; render: () => React.ReactNode }[] = [
  { id: 'preferences', title: 'Preferences', render: () => <Preferences /> },
  { id: 'accounts', title: 'Connected accounts', render: () => <Accounts /> },
  { id: 'profile', title: 'Profile', render: () => <Profile /> },
]

export function TypePreview() {
  const [scale, setScale] = React.useState<Scale>('linear')
  return (
    <div className="flex min-h-dvh flex-col gap-5 bg-bg-canvas px-5 pt-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium text-text-default">Type preview</h1>
          <p className="max-w-[640px] text-base text-text-muted">
            The same settings views built from Satin's components, with Satin's type scale or one aligned with Linear's
            (11 / 12 / 13 for the interface, 15 to read, 18 / 20 / 24 for headings, weights 510 / 590).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Customizer />
          <SegmentedControl
          aria-label="Type scale"
          size="lg"
          items={[
            { value: 'satin', label: 'Satin today' },
            { value: 'linear', label: 'Linear' },
          ]}
          value={scale}
          onValueChange={(v) => setScale(v as Scale)}
          />
        </div>
      </header>

      {/* The views side by side; wider than the window, they scroll sideways. */}
      <div className="-mx-5 flex snap-x gap-5 overflow-x-auto px-5 pb-2" tabIndex={0} role="region" aria-label="Views">
        {VIEWS.map((v) => (
          <figure key={v.id} className="flex shrink-0 snap-start flex-col gap-2">
            <figcaption className="px-1 text-sm text-text-muted">{v.title}</figcaption>
            <div
              data-type-scale={scale === 'linear' ? 'linear' : undefined}
              className={cn('flex h-[760px] w-[980px] overflow-hidden rounded-2xl border border-border-subtle bg-bg-canvas')}
            >
              <Nav current={v.id} />
              <main className="m-2 ml-0 flex flex-1 justify-center overflow-y-auto rounded-xl border border-border-subtle bg-bg-field">
                <div className="flex w-full max-w-[600px] flex-col gap-8 px-6 py-12">{v.render()}</div>
              </main>
            </div>
          </figure>
        ))}
      </div>
    </div>
  )
}
