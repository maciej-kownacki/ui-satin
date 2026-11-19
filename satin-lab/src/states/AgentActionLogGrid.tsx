import { ArrowRight, Mail } from 'iconoir-react'
import { AgentActionLogAction, AgentActionLogRoot, AgentActionLogRun, type AgentActionState, type AgentRun } from '@uisatin/pro/agent-undo-log'

/** Every state of the Agent action log (prompt 18): a run open, an action reverted, a revert failed, a run partly and fully reverted. */
const run: AgentRun = {
  id: 'screening',
  label: 'Screened new applicants for Product Designer',
  at: '2026-11-19T10:42:00',
  actions: [
    { id: 'ana', label: 'Moved Ana Silva to Interview', icon: <ArrowRight />, changes: [{ field: 'Stage', from: 'Screening', to: 'Interview' }] },
    { id: 'tom', label: 'Moved Tom Becker to Interview', icon: <ArrowRight />, changes: [{ field: 'Stage', from: 'Screening', to: 'Interview' }] },
    { id: 'email', label: 'Sent a rejection email to Lee Wong', icon: <Mail />, revertible: false, reason: "Emails can't be unsent once delivered." },
  ],
}
const revertible: AgentRun = { ...run, id: 'moves', actions: run.actions.slice(0, 2) }

const noop = () => {}

/** One log in a given state: `rows` sets each action's state by id, `reverted` the log's own list. */
function Cell({ title, log, reverted = [], rows = {}, restore = true, open = true }: { title: string; log: AgentRun; reverted?: string[]; rows?: Record<string, AgentActionState>; restore?: boolean; open?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <span>{title}</span>
      <AgentActionLogRoot runs={[log]} defaultReverted={reverted} defaultExpanded={open ? [log.id] : []} onRevert={noop} onRestore={restore ? noop : undefined} shortcut="off" aria-label={title}>
        <AgentActionLogRun run={log}>
          {log.actions.map((a) => (
            <AgentActionLogAction key={a.id} action={a} state={rows[a.id]} />
          ))}
        </AgentActionLogRun>
      </AgentActionLogRoot>
    </div>
  )
}

export function AgentActionLogGrid() {
  return (
    <div className="grid grid-cols-[repeat(2,520px)] gap-8 p-8 text-xs text-text-muted">
      <Cell title="run collapsed" log={run} open={false} />
      <Cell title="run expanded" log={run} />
      <Cell title="reverting" log={run} rows={{ ana: 'reverting' }} />
      <Cell title="action reverted (with Restore)" log={run} reverted={['ana']} />
      <Cell title="action reverted (no onRestore)" log={run} reverted={['ana']} restore={false} />
      <Cell title="revert failed" log={run} rows={{ tom: 'failed' }} />
      <Cell title="partially reverted run" log={run} reverted={['ana', 'tom']} />
      <Cell title="run fully reverted" log={revertible} reverted={['ana', 'tom']} />
    </div>
  )
}
