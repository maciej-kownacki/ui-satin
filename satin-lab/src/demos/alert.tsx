import * as React from 'react'
import { Alert } from '@uisatin/ui/alert'
import { Button } from '@uisatin/ui/button'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Intent first (what it says), then the surface, then the parts it can carry.
export const controls: ShowcaseControl[] = [
  {
    id: 'intent',
    label: 'Intent',
    type: 'menu',
    default: 'info',
    items: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'info', label: 'Info' },
      { value: 'success', label: 'Success' },
      { value: 'warning', label: 'Warning' },
      { value: 'error', label: 'Error' },
    ],
  },
  { id: 'variant', label: 'Variant', items: [{ value: 'soft', label: 'Soft' }, { value: 'outline', label: 'Outline' }] },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'action', label: 'Action', type: 'switch', default: 'off' },
  { id: 'dismiss', label: 'Dismiss', type: 'switch', default: 'off' },
]

const copy: Record<string, { title: string; description: string; action: string }> = {
  neutral: { title: 'Billing moves to the new workspace on May 1', description: 'Invoices before then stay in the old one.', action: 'Learn more' },
  info: { title: 'Two people are editing this page', description: 'Your changes merge when you save.', action: 'See who' },
  success: { title: 'Domain verified', description: 'satin.dev now points at this project.', action: 'Open site' },
  warning: { title: 'You have 2 seats left', description: 'New invites wait once the plan is full.', action: 'Add seats' },
  error: { title: 'The last sync failed', description: 'The calendar token expired on Monday.', action: 'Reconnect' },
}

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const c = copy[v.intent]
  const props = [
    v.intent !== 'neutral' && `intent="${v.intent}"`,
    v.variant !== 'soft' && 'variant="outline"',
    `title="${c.title}"`,
    on(v, 'description') && `description="${c.description}"`,
    on(v, 'action') && `action={<Button variant="secondary" size="xs">${c.action}</Button>}`,
    on(v, 'dismiss') && 'onDismiss={() => setOpen(false)}',
  ].filter(Boolean)
  return `import { Alert } from '@uisatin/ui/alert'
${on(v, 'action') ? "import { Button } from '@uisatin/ui/button'\n" : ''}
<Alert
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: Object.values(v).join(' · '),
  code: code(v),
}))

function Stage({ v }: { v: Record<string, string> }) {
  const [open, setOpen] = React.useState(true)
  const c = copy[v.intent]
  return (
    <div className="grid w-[460px] max-w-full justify-items-center gap-3">
      {open ? (
        <Alert
          intent={v.intent as 'info'}
          variant={v.variant as 'soft'}
          title={c.title}
          description={on(v, 'description') ? c.description : undefined}
          action={
            on(v, 'action') ? (
              <Button variant="secondary" size="xs">
                {c.action}
              </Button>
            ) : undefined
          }
          onDismiss={on(v, 'dismiss') ? () => setOpen(false) : undefined}
        />
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Show again
        </Button>
      )}
    </div>
  )
}

export default function AlertDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Alert" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Stage key={id} v={v} />} />
}
