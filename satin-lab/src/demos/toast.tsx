import * as React from 'react'
import { Button } from '@satin/ui'
import { Toaster, toast, type ToastIntent } from '@satin/ui/toast'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Copy = { title: string; description: string; action: string; onClick: string }

const copy: Record<ToastIntent, Copy> = {
  neutral: { title: 'Message archived', description: 'It moved to the Archive folder.', action: 'Undo', onClick: '() => restore(id)' },
  info: { title: 'Update available', description: 'Reload to get the latest version.', action: 'Reload', onClick: 'reload' },
  success: { title: 'Booking confirmed', description: 'Table for 4 on Friday at 19:30.', action: 'View', onClick: 'openBooking' },
  warning: { title: 'Running low on oat milk', description: 'About two days left at the current rate.', action: 'Reorder', onClick: 'reorder' },
  error: { title: 'Payment failed', description: 'The card was declined. Nothing was charged.', action: 'Retry', onClick: 'retry' },
}

const title = (s: string) => s[0].toUpperCase() + s.slice(1)

// Intent sets the tile and the copy; the rest is content a toast of any intent can drop.
export const controls: ShowcaseControl[] = [
  { id: 'intent', label: 'Intent', type: 'menu', items: Object.keys(copy).map((i) => ({ value: i, label: title(i) })) },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'on' },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'action', label: 'Action', type: 'switch', default: 'on' },
  { id: 'close', label: 'Close', type: 'switch', default: 'on' },
]

const setup = `// Once, near the root of the app:
import { Toaster } from '@satin/ui/toast'
<Toaster />

// Anywhere:
import { toast } from '@satin/ui/toast'
`

function code(v: Record<string, string>) {
  const c = copy[v.intent as ToastIntent]
  const fn = v.intent === 'neutral' ? 'toast' : `toast.${v.intent}`
  const fields = [
    v.icon === 'off' && 'icon: false',
    v.description === 'on' && `description: '${c.description}'`,
    v.action === 'on' && `action: { label: '${c.action}', onClick: ${c.onClick} }`,
    v.close === 'off' && 'closeButton: false',
  ].filter(Boolean)
  const args = fields.length ? `, {\n${fields.map((f) => `  ${f},`).join('\n')}\n}` : ''
  return `${setup}
${fn}('${c.title}'${args})`
}

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    title(v.intent),
    on(v, 'icon') ? 'Icon' : 'No icon',
    on(v, 'description') ? 'Description' : 'No description',
    on(v, 'action') ? 'Action' : 'No action',
    on(v, 'close') ? 'Close' : 'No close',
  ].join(' · '),
  code: code(v),
}))

/** One toast is on screen when the combination opens (it stays until closed); the button adds more. */
function Preview({ v }: { v: Record<string, string> }) {
  const fire = React.useCallback(
    (duration?: number) => {
      const c = copy[v.intent as ToastIntent]
      toast(c.title, {
        intent: v.intent as ToastIntent,
        icon: on(v, 'icon'),
        description: on(v, 'description') ? c.description : undefined,
        action: on(v, 'action') ? { label: c.action } : undefined,
        closeButton: on(v, 'close'),
        duration,
      })
    },
    [v],
  )

  React.useEffect(() => {
    fire(Infinity)
    return () => toast.dismiss()
  }, [fire])

  // The stack grows up from the bottom of this box, so it stays in the stage, above the properties.
  return (
    <div className="relative flex h-[260px] w-[397px] max-w-full justify-center">
      <Button variant="secondary" onClick={() => fire()}>
        Show toast
      </Button>
      <Toaster className="absolute right-0 bottom-0 left-0 w-full max-w-full" />
    </div>
  )
}

export default function ToastDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Toast"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Preview key={id} v={v} />}
    />
  )
}
