import { EditPencil, GitBranch, PagePlus } from 'iconoir-react'
import { AgentActionLogAction, AgentActionLogRoot, AgentActionLogRun, type AgentActionState, type AgentRun } from '@uisatin/pro/agent-undo-log'

/** Every state of the Agent action log (prompt 18): a run open and folded, reverting, reverted, failed, partly and fully reverted. */
const run: AgentRun = {
  id: 'rate-limit',
  label: 'Add rate limiting to the login endpoint',
  at: '2026-11-19T10:42:00',
  actions: [
    { id: 'middleware', label: 'Created', target: 'src/middleware/rate-limit.ts', added: 48, icon: <PagePlus /> },
    { id: 'route', label: 'Edited', target: 'src/routes/auth.ts', added: 6, removed: 2, icon: <EditPencil /> },
    { id: 'push', label: 'Pushed', target: 'feat/rate-limit → origin', icon: <GitBranch />, revertible: false, reason: 'Pushed commits stay on the remote.' },
  ],
}
const edits: AgentRun = { ...run, id: 'edits', actions: run.actions.slice(0, 2) }

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
    <div className="grid grid-cols-[repeat(2,560px)] gap-8 p-8 text-xs text-text-muted">
      <Cell title="run collapsed" log={run} open={false} />
      <Cell title="run expanded" log={run} />
      <Cell title="reverting" log={run} rows={{ route: 'reverting' }} />
      <Cell title="action reverted (with Restore)" log={run} reverted={['route']} />
      <Cell title="action reverted (no onRestore)" log={run} reverted={['route']} restore={false} />
      <Cell title="revert failed" log={run} rows={{ route: 'failed' }} />
      <Cell title="partially reverted run" log={run} reverted={['middleware', 'route']} />
      <Cell title="run fully reverted" log={edits} reverted={['middleware', 'route']} />
    </div>
  )
}
