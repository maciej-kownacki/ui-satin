import { ToolCall, type ToolCallStatus } from '@uisatin/ui/tool-call'
import { Calendar } from 'iconoir-react'

/**
 * Every ToolCall status, folded and open, side by side: the header row against Thinking's tool
 * step, and the body's sections. Running started 2.4 s before the page loaded.
 */
const statuses: ToolCallStatus[] = ['pending', 'running', 'success', 'error', 'cancelled']
const input = { attendee: 'Tara Mendes', duration: 45 }
const output = {
  slots: [
    { start: '2026-11-24T09:30', end: '2026-11-24T10:15' },
    { start: '2026-11-25T13:00', end: '2026-11-25T13:45' },
    { start: '2026-11-26T16:00', end: '2026-11-26T16:45' },
  ],
}
const label = (s: string) => s[0].toUpperCase() + s.slice(1)

export function ToolCallGrid() {
  return (
    <div className="inline-grid grid-cols-[100px_400px_400px] items-start gap-x-8 gap-y-6 p-8 text-xs text-text-muted">
      <span />
      <span className="text-text-default">Folded</span>
      <span className="text-text-default">Open</span>
      {statuses.map((status) => (
        <div key={status} className="contents">
          <span className="pt-2.5 text-sm text-text-default">{label(status)}</span>
          {[false, true].map((open) => (
            <ToolCall
              key={String(open)}
              name="Find slots"
              icon={<Calendar />}
              target="calendar.findSlots"
              status={status}
              input={input}
              output={status === 'success' ? output : undefined}
              duration={status === 'success' ? 1240 : undefined}
              startedAt={status === 'running' ? Date.now() - 2400 : undefined}
              error={status === 'error' ? 'Calendar didn’t answer in 10 s.' : undefined}
              onRetry={status === 'error' ? () => {} : undefined}
              defaultOpen={open}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
