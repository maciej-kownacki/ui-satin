import * as React from 'react'
import { Avatar, Badge, Button, cn, type AvatarTone } from '@uisatin/ui'
import { Toaster, toast, type ToastIntent } from '@uisatin/ui/toast'
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

/*
 * Both stages on this page read the one toast() store, so only one of them holds a Toaster: the
 * one used last. Switching closes what the other one showed.
 */
type Stage = 'intents' | 'countdown'
let activeStage: Stage = 'intents'
const stageListeners = new Set<() => void>()
const subscribeStage = (listener: () => void) => {
  stageListeners.add(listener)
  return () => {
    stageListeners.delete(listener)
  }
}
function useStageActive(stage: Stage) {
  return React.useSyncExternalStore(subscribeStage, () => activeStage === stage, () => stage === 'intents')
}
function activate(stage: Stage) {
  if (activeStage === stage) return
  toast.dismiss()
  activeStage = stage
  for (const listener of stageListeners) listener()
}

// Intent sets the tile and the copy; the rest is content a toast of any intent can drop.
export const controls: ShowcaseControl[] = [
  { id: 'intent', label: 'Intent', type: 'menu', items: Object.keys(copy).map((i) => ({ value: i, label: title(i) })) },
  { id: 'icon', label: 'Icon', type: 'switch', default: 'on' },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'action', label: 'Action', type: 'switch', default: 'on' },
  { id: 'close', label: 'Close', type: 'switch', default: 'on' },
]

const setup = `// Once, near the root of the app:
import { Toaster } from '@uisatin/ui/toast'
<Toaster />

// Anywhere:
import { toast } from '@uisatin/ui/toast'
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
  const active = useStageActive('intents')
  const fire = React.useCallback(
    (duration?: number) => {
      activate('intents')
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
      {active && <Toaster className="absolute right-0 bottom-0 left-0 w-full max-w-full" />}
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

/* ---------- Undo countdown: rejecting a candidate ---------- */

type Candidate = { id: string; name: string; initials: string; tone: AvatarTone; role: string }

const candidates: Candidate[] = [
  { id: 'maya', name: 'Maya Chen', initials: 'MC', tone: 'sky', role: 'Product designer' },
  { id: 'tomas', name: 'Tomás Ruiz', initials: 'TR', tone: 'green', role: 'Frontend engineer' },
  { id: 'ines', name: 'Inês Duarte', initials: 'ID', tone: 'plum', role: 'Design researcher' },
]

export const countdownControls: ShowcaseControl[] = [{ id: 'countdown', label: 'Countdown', type: 'switch', default: 'on' }]

function countdownCode(v: Record<string, string>) {
  const countdown = v.countdown === 'on'
  return `${setup}
function reject(candidate: Candidate) {
  setStage(candidate.id, 'rejected')
  toast('Candidate rejected', {
    description: \`\${candidate.name} · \${candidate.role}\`,
    // Screen readers hear this instead of the button, which they may not reach in time.
    action: { label: 'Undo', altText: 'Undo with Ctrl+Z', onClick: () => setStage(candidate.id, 'screening') },
    duration: 5000,${countdown ? '\n    countdown: true,' : ''}
  })
}`
}

export const countdownOptions: ShowcaseOption[] = combos(countdownControls).map((v) => ({
  id: comboId(countdownControls, v),
  label: v.countdown === 'on' ? 'Undo countdown' : 'No countdown',
  code: countdownCode(v),
}))

const editable = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/**
 * Three candidates in screening. Reject one and a toast offers Undo for 5 s, its bar draining
 * along the bottom; hovering or focusing the toast stops it. Ctrl+Z (⌘Z) undoes the last
 * rejection too, as the action's altText tells screen readers.
 */
function CountdownPreview({ v }: { v: Record<string, string> }) {
  const active = useStageActive('countdown')
  const [rejected, setRejected] = React.useState<string[]>([])

  const restore = React.useCallback((id: string) => {
    setRejected((r) => r.filter((x) => x !== id))
    toast.dismiss(`reject-${id}`)
  }, [])

  const reject = (c: Candidate) => {
    activate('countdown')
    setRejected((r) => [...r.filter((x) => x !== c.id), c.id])
    toast('Candidate rejected', {
      id: `reject-${c.id}`,
      description: `${c.name} · ${c.role}`,
      action: { label: 'Undo', altText: 'Undo with Ctrl+Z', onClick: () => restore(c.id) },
      duration: 5000,
      countdown: v.countdown === 'on',
    })
  }

  // The keyboard way the altText promises: the last rejection comes back.
  const last = rejected[rejected.length - 1]
  React.useEffect(() => {
    if (!last) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z' || editable(e.target)) return
      e.preventDefault()
      restore(last)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, restore])

  React.useEffect(() => () => toast.dismiss(), [])

  // The list on top, the toasts rising from the bottom of this box, so they never cover a row.
  return (
    <div className="relative flex h-[320px] w-[397px] max-w-full flex-col">
      <div className="rounded-xl border border-border-subtle bg-bg-card">
        <div className="flex h-11 items-center justify-between border-b border-border-subtle ps-4 pe-2">
          <span className="text-sm font-medium text-text-default">Screening</span>
          {rejected.length ? (
            <Button variant="tertiary" size="xs" onClick={() => rejected.forEach(restore)}>
              Reset
            </Button>
          ) : (
            <span className="pe-2 text-sm text-text-muted">{candidates.length} candidates</span>
          )}
        </div>
        <ul className="flex flex-col">
          {candidates.map((c, i) => {
            const out = rejected.includes(c.id)
            return (
              <li key={c.id} className={cn('flex h-14 items-center gap-3 ps-4 pe-3', i > 0 && 'border-t border-border-subtle')}>
                <Avatar initials={c.initials} tone={c.tone} size={32} />
                <span className="flex min-w-0 flex-1 flex-col text-sm">
                  <span className={cn('truncate font-medium', out ? 'text-text-muted line-through' : 'text-text-default')}>{c.name}</span>
                  <span className="truncate text-text-muted">{c.role}</span>
                </span>
                {out ? (
                  <Badge tone="red" size="sm">
                    Rejected
                  </Badge>
                ) : (
                  <Button variant="secondary" size="xs" onClick={() => reject(c)} aria-label={`Reject ${c.name}`}>
                    Reject
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      {active && <Toaster className="absolute right-0 bottom-0 left-0 w-full max-w-full" />}
    </div>
  )
}

export function ToastCountdownDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Undo countdown"
      options={countdownOptions}
      codeHtml={codeHtml}
      controls={countdownControls}
      render={(id, v) => <CountdownPreview key={id} v={v} />}
    />
  )
}
