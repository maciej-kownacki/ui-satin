/* Type test, never run: AgentActionLog's props, controlled and uncontrolled, its parts, refs, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  AgentActionLog,
  AgentActionLogAction,
  AgentActionLogRoot,
  AgentActionLogRun,
  agentActionLogLabels,
  type AgentAction,
  type AgentActionState,
  type AgentRun,
} from '../components/agent-undo-log'

const actions: AgentAction[] = [
  { id: 'a', label: 'Moved Ana Silva to Interview', changes: [{ field: 'Stage', from: 'Screening', to: 'Interview' }], at: new Date() },
  { id: 'b', label: 'Sent an email', revertible: false, reason: "Emails can't be unsent." },
]
const runs: AgentRun[] = [{ id: 'r', label: 'Screened applicants', at: '2026-11-19T10:42', actions }]

// @ts-expect-error: a run needs its time
const noTime: AgentRun = { id: 'r', label: 'x', actions }

const sectionRef = React.createRef<HTMLElement>()

// Uncontrolled: the log keeps what is reverted and open.
export const uncontrolled = (
  <AgentActionLog
    ref={sectionRef}
    runs={runs}
    defaultReverted={['a']}
    defaultExpanded={['r']}
    onRevert={async (action, run) => void [action.id, run.id]}
    onRevertRun={(run, left) => left.map((a) => a.id)}
    onRestore={(restored, run) => Promise.resolve([restored.length, run.label])}
    shortcut="log"
    formatTime={(at) => at.toLocaleTimeString()}
  />
)

// Controlled: the app keeps both lists.
export function Controlled() {
  const [reverted, setReverted] = React.useState<string[]>([])
  const [expanded, setExpanded] = React.useState<string[]>(['r'])
  return <AgentActionLog runs={runs} reverted={reverted} onRevertedChange={setReverted} expanded={expanded} onExpandedChange={setExpanded} onRevert={() => {}} />
}

// @ts-expect-error: runs and onRevert are required
export const missing = <AgentActionLog />

// @ts-expect-error: no such shortcut scope
export const wrongShortcut = <AgentActionLog runs={runs} onRevert={() => {}} shortcut="window" />

const state: AgentActionState = 'failed'
// @ts-expect-error: no such state
const wrongState: AgentActionState = 'undone'

const runRef = React.createRef<HTMLLIElement>()
const rowRef = React.createRef<HTMLDivElement>()
export const parts = (
  <AgentActionLogRoot runs={runs} onRevert={() => {}} aria-label="Recruiting agent">
    <AgentActionLogRun ref={runRef} run={runs[0]}>
      <AgentActionLogAction ref={rowRef} action={actions[0]} state={state}>
        <a href="/candidates/ana">Open Ana Silva</a>
      </AgentActionLogAction>
    </AgentActionLogRun>
  </AgentActionLogRoot>
)

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels labels={{ close: 'Zamknij', actionLogRevert: 'Cofnij', actionLogRevertAction: (a) => `Cofnij: ${a}`, actionLogActionCount: (n) => `${n} działania`, undo: 'Przywróć' }}>
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ actionLogRevertAction: 'Cofnij' }}>{uncontrolled}</SatinLabels>

export const words: string = agentActionLogLabels.actionLogToastReverted(2)
export { noTime, wrongState }
