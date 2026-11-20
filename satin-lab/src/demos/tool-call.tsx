import * as React from 'react'
import { ToolCall, type ToolCallStatus } from '@uisatin/ui/tool-call'
import { Calendar } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/**
 * The agent calls calendar.findSlots({ attendee: 'Tara Mendes', duration: 45 }) and gets three
 * slots back. Status walks the card through its states; in Error, Retry runs it again for real:
 * the spinner and the clock, then the check.
 */
const input = { attendee: 'Tara Mendes', duration: 45 }
const slots = [
  { start: '2026-11-24T09:30', end: '2026-11-24T10:15' },
  { start: '2026-11-25T13:00', end: '2026-11-25T13:45' },
  { start: '2026-11-26T16:00', end: '2026-11-26T16:45' },
]
// Written out, so the server and the browser show the same thing whatever their time zone.
const shown = [
  { day: 'Tue, Nov 24', time: '9:30 – 10:15 AM' },
  { day: 'Wed, Nov 25', time: '1:00 – 1:45 PM' },
  { day: 'Thu, Nov 26', time: '4:00 – 4:45 PM' },
]
const error = 'Calendar didn’t answer in 10 s.'

/** Output as a node of the app's own: the three slots as rows. */
function FreeSlots() {
  return (
    <ul aria-label="Free slots" className="flex flex-col gap-1">
      {shown.map((s) => (
        <li key={s.day} className="flex items-center justify-between gap-3 rounded-lg bg-bg-muted px-3 py-2 text-sm">
          <span className="text-text-default">{s.day}</span>
          <span className="text-text-muted tabular-nums">{s.time}</span>
        </li>
      ))}
    </ul>
  )
}

// Status changes the most, so it comes first; Output only matters once there is one.
export const controls: ShowcaseControl[] = [
  {
    id: 'status',
    label: 'Status',
    // Five statuses don't fit a segmented control in half the properties bar.
    type: 'menu',
    default: 'success',
    items: [
      { value: 'pending', label: 'Pending' },
      { value: 'running', label: 'Running' },
      { value: 'success', label: 'Success' },
      { value: 'error', label: 'Error' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { id: 'output', label: 'Output', items: [{ value: 'json', label: 'JSON' }, { value: 'node', label: 'Custom' }] },
  { id: 'open', label: 'Default open', type: 'switch', default: 'on' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const props = [
    'name="Find slots"',
    'icon={<Calendar />}',
    'target="calendar.findSlots"',
    `status="${v.status}"`,
    "input={{ attendee: 'Tara Mendes', duration: 45 }}",
  ]
  if (v.status === 'success') {
    props.push(
      v.output === 'json'
        ? `output={{\n    slots: [\n${slots.map((s) => `      { start: '${s.start}', end: '${s.end}' },`).join('\n')}\n    ],\n  }}`
        : 'output={<FreeSlots />}',
      'duration={1240}',
    )
  }
  if (v.status === 'error') props.push(`error="${error}"`, 'onRetry={retry}')
  if (v.open === 'on') props.push('defaultOpen')
  return `import { ToolCall } from '@uisatin/ui/tool-call'
import { Calendar } from 'iconoir-react'

<ToolCall
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [labelOf('status', v.status), ...(v.status === 'success' ? [labelOf('output', v.output)] : []), v.open === 'on' ? 'Open' : 'Status decides'].join(' · '),
  code: code(v),
}))

/** The card on the stage. Retry runs the call: running for 1.8 s, then success with the time it took. */
function Live({ status, output, defaultOpen, setStatus }: { status: ToolCallStatus; output: string; defaultOpen: boolean; setStatus: (s: ToolCallStatus) => void }) {
  const [ran, setRan] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  // Picking a status by hand stops a run in progress.
  React.useEffect(() => {
    if (status !== 'running') clearTimeout(timer.current)
    if (status !== 'success') setRan(false)
  }, [status])
  return (
    <ToolCall
      name="Find slots"
      icon={<Calendar />}
      target="calendar.findSlots"
      status={status}
      input={input}
      output={status === 'success' ? (output === 'json' ? { slots } : <FreeSlots />) : undefined}
      // After a live run, the card shows the time it measured.
      duration={status === 'success' && !ran ? 1240 : undefined}
      error={error}
      onRetry={() => {
        setStatus('running')
        clearTimeout(timer.current)
        timer.current = setTimeout(() => {
          setRan(true)
          setStatus('success')
        }, 1800)
      }}
      defaultOpen={defaultOpen || undefined}
    />
  )
}

export default function ToolCallDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Tool call"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      align="top"
      render={(_, v, set) => (
        <div className="w-[min(480px,calc(100vw-80px))]">
          {/* A new default open state starts the card afresh. */}
          <Live
            key={v.open}
            status={v.status as ToolCallStatus}
            output={v.output}
            defaultOpen={v.open === 'on'}
            setStatus={(s) => set('status', s)}
          />
        </div>
      )}
    />
  )
}
