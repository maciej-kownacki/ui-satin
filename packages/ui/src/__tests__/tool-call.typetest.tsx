/* Type test, never run: ToolCall's props API and its parts, controlled and uncontrolled, with refs. */
import * as React from 'react'
import { Calendar } from 'iconoir-react'
import {
  ToolCall,
  ToolCallContent,
  ToolCallError,
  ToolCallHeader,
  ToolCallRoot,
  ToolCallSection,
  type ToolCallStatus,
  type ToolCallValue,
} from '../components/tool-call'

interface Slot {
  start: string
  end: string
}
const slots: Slot[] = [{ start: '2026-11-24T09:30', end: '2026-11-24T10:15' }]

// Props, uncontrolled: the open state follows the status unless defaultOpen says otherwise.
export const uncontrolled = (
  <ToolCall
    name="Find slots"
    icon={<Calendar />}
    target="calendar.findSlots"
    status="success"
    input={{ attendee: 'Tara Mendes', duration: 45 }}
    output={{ slots }}
    duration={1240}
    defaultOpen
    maxLines={8}
    ref={React.createRef<HTMLDivElement>()}
    className="max-w-md"
  />
)

// Props, controlled, with a custom output node, an error and Retry.
export function Controlled() {
  const [open, setOpen] = React.useState(true)
  const [status, setStatus] = React.useState<ToolCallStatus>('error')
  return (
    <ToolCall
      name="Find slots"
      status={status}
      open={open}
      onOpenChange={setOpen}
      startedAt={new Date()}
      error="Calendar didn't answer in 10 s."
      onRetry={() => setStatus('running')}
      output={<ul>{slots.map((s) => <li key={s.start}>{s.start}</li>)}</ul>}
    />
  )
}

// Values: JSON-ish data, a string, a node.
export const values: ToolCallValue[] = [{ a: 1 }, [1, 2], 'plain text', 3, true, null, <span key="n">node</span>]

// Parts: the same card built by hand, with an extra section and refs on every part.
export const parts = (
  <ToolCallRoot status="error" defaultOpen={false} onOpenChange={(open: boolean) => open} ref={React.createRef<HTMLDivElement>()}>
    <ToolCallHeader name="Find slots" target="calendar.findSlots" duration={3000} ref={React.createRef<HTMLButtonElement>()} />
    <ToolCallContent ref={React.createRef<HTMLDivElement>()}>
      <ToolCallSection title="Input" value={{ attendee: 'Tara Mendes' }} maxLines={4} ref={React.createRef<HTMLDivElement>()} />
      <ToolCallError onRetry={() => {}} ref={React.createRef<HTMLDivElement>()}>
        Timed out
      </ToolCallError>
    </ToolCallContent>
  </ToolCallRoot>
)

// @ts-expect-error: status is required.
export const noStatus = <ToolCall name="Find slots" />

// @ts-expect-error: not a status.
export const badStatus = <ToolCall name="Find slots" status="done" />

// @ts-expect-error: duration is in ms, a number.
export const badDuration = <ToolCall name="Find slots" status="success" duration="1.2s" />

// @ts-expect-error: a section's title names its CodeBlock, so it is a string.
export const badTitle = <ToolCallSection title={<b>Input</b>} value={{}} />
