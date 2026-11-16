import * as React from 'react'
import { Notification, NotificationStack } from '@uisatin/ui/notification'
import { Avatar } from '@uisatin/ui/avatar'
import { Button } from '@uisatin/ui/button'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// A stack or one card, then what's on the left, the parts it can carry and the close.
export const controls: ShowcaseControl[] = [
  { id: 'layout', label: 'Layout', items: [{ value: 'stack', label: 'Stack' }, { value: 'single', label: 'Single' }] },
  { id: 'media', label: 'Media', items: [{ value: 'avatar', label: 'Avatar' }, { value: 'icon', label: 'Icon' }] },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'badge', label: 'Badge', type: 'switch', default: 'on' },
  {
    id: 'dismiss',
    label: 'Dismiss',
    items: [
      { value: 'off', label: 'Off' },
      { value: 'hover', label: 'On hover' },
      { value: 'always', label: 'Always' },
    ],
    default: 'hover',
  },
]

const copy = {
  avatar: { title: 'Maya Chen replied to your comment', description: 'Looks good, ship it on Thursday.', badge: 'Mention' },
  icon: { title: 'Automated document request sent', description: 'Requesting W2 & bank statements', badge: 'Docs requested' },
}

function code(v: Record<string, string>) {
  if (v.layout === 'stack') return stackCode(v)
  const c = copy[v.media as 'avatar']
  const props = [
    v.media === 'avatar' ? 'media={<Avatar initials="MC" tone="plum" size={40} />}' : 'media={<DocumentIcon />}',
    `title="${c.title}"`,
    v.description === 'on' && `description="${c.description}"`,
    v.badge === 'on' && `badge="${c.badge}"`,
    v.dismiss !== 'off' && 'onDismiss={() => setOpen(false)}',
    v.dismiss === 'always' && 'dismissVisibility="always"',
  ].filter(Boolean)
  return `import { Notification } from '@uisatin/ui/notification'
${v.media === 'avatar' ? "import { Avatar } from '@uisatin/ui/avatar'\n" : ''}
<Notification
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: Object.values(v).join(' · '),
  code: code(v),
}))

/** An app icon for the demo: a document on the sky tone. */
function DocumentIcon() {
  return (
    <span className="grid size-10 place-items-center rounded-full bg-status-sky-bg text-status-sky-fg">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 21.4V2.6a.6.6 0 0 1 .6-.6h11.15a.6.6 0 0 1 .42.18l3.65 3.64a.6.6 0 0 1 .18.43V21.4a.6.6 0 0 1-.6.6H4.6a.6.6 0 0 1-.6-.6ZM8 10h8M8 18h8M8 14h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function Stage({ v }: { v: Record<string, string> }) {
  return v.layout === 'stack' ? <StackStage v={v} /> : <SingleStage v={v} />
}

function SingleStage({ v }: { v: Record<string, string> }) {
  const [open, setOpen] = React.useState(true)
  const c = copy[v.media as 'avatar']
  return (
    <div className="grid w-[420px] max-w-full justify-items-center px-3 py-3">
      {open ? (
        <Notification
          media={v.media === 'avatar' ? <Avatar initials="MC" tone="plum" size={40} /> : <DocumentIcon />}
          title={c.title}
          description={v.description === 'on' ? c.description : undefined}
          badge={v.badge === 'on' ? c.badge : undefined}
          onDismiss={v.dismiss !== 'off' ? () => setOpen(false) : undefined}
          dismissVisibility={v.dismiss === 'always' ? 'always' : 'hover'}
        />
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Show again
        </Button>
      )}
    </div>
  )
}

export default function NotificationDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Notification" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Stage key={id} v={v} />} />
}

/** The stack's notifications, newest first; the first one follows the Media control. */
const feed = [
  { id: 'n4', title: 'Contract signed by Jordan Lee', description: 'Offer accepted, start date March 3', badge: 'Hired', initials: 'JL', tone: 'green' },
  { id: 'n3', title: 'Interview moved to Friday', description: 'Ana Ruiz, 2:30 pm with the design team', badge: 'Calendar', initials: 'AR', tone: 'sky' },
  { id: 'n2', title: 'Welcome package sent', description: 'Welcome package & schedule sent', badge: 'Onboarding', initials: 'OB', tone: 'amber' },
] as const

function stackCode(v: Record<string, string>) {
  const props = [
    'media={n.media}',
    'title={n.title}',
    v.description === 'on' && 'description={n.description}',
    v.badge === 'on' && 'badge={n.badge}',
    v.dismiss !== 'off' && 'onDismiss={() => dismiss(n.id)}',
    v.dismiss === 'always' && 'dismissVisibility="always"',
  ].filter(Boolean)
  return `import { Notification, NotificationStack } from '@uisatin/ui/notification'

// Newest first, each with a key. Hover, focus or tap unfolds the stack.
<NotificationStack>
  {notifications.map((n) => (
    <Notification
      key={n.id}
${props.map((p) => `      ${p}`).join('\n')}
    />
  ))}
</NotificationStack>`
}

function StackStage({ v }: { v: Record<string, string> }) {
  const c = copy[v.media as 'avatar']
  const all = React.useMemo(
    () => [
      { id: 'n5', title: c.title, description: c.description, badge: c.badge, media: v.media === 'avatar' ? <Avatar initials="MC" tone="plum" size={40} /> : <DocumentIcon /> },
      ...feed.map((n) => ({ ...n, media: <Avatar initials={n.initials} tone={n.tone} size={40} /> })),
    ],
    [c, v.media],
  )
  const [ids, setIds] = React.useState(() => all.map((n) => n.id))
  const items = all.filter((n) => ids.includes(n.id))
  return (
    // Room below for the stack to unfold into.
    <div className="flex h-[360px] w-[420px] max-w-full flex-col items-center gap-4 px-3 pt-3">
      <NotificationStack>
        {items.map((n) => (
          <Notification
            key={n.id}
            media={n.media}
            title={n.title}
            description={v.description === 'on' ? n.description : undefined}
            badge={v.badge === 'on' ? n.badge : undefined}
            onDismiss={v.dismiss !== 'off' ? () => setIds((list) => list.filter((id) => id !== n.id)) : undefined}
            dismissVisibility={v.dismiss === 'always' ? 'always' : 'hover'}
          />
        ))}
      </NotificationStack>
      {items.length < all.length && (
        <Button variant="secondary" size="xs" className="mt-auto mb-3" onClick={() => setIds(all.map((n) => n.id))}>
          Show all again
        </Button>
      )}
    </div>
  )
}
