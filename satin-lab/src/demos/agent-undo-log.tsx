import * as React from 'react'
import { EditPencil, GitBranch, PagePlus } from 'iconoir-react'
import { Toaster, toast } from '@uisatin/ui/toast'
import { AgentActionLog, type AgentAction, type AgentRun } from '@uisatin/pro/agent-undo-log'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/*
 * A coding agent: asked to add rate limiting, it created a middleware, edited the route and the
 * tests, and pushed the branch. The reader reverts one edit; the push can't be undone from here,
 * and the log says why. An older run sits folded under it.
 *
 * Times are local wall-clock strings, so the page renders the same on the server and in the
 * browser whatever the time zone; the log writes them as times today and with the date after.
 */
const RUNS: AgentRun[] = [
  {
    id: 'rate-limit',
    label: 'Add rate limiting to the login endpoint',
    at: '2026-11-19T10:42:00',
    actions: [
      { id: 'middleware', label: 'Created', target: 'src/middleware/rate-limit.ts', added: 48, icon: <PagePlus /> },
      { id: 'route', label: 'Edited', target: 'src/routes/auth.ts', added: 6, removed: 2, icon: <EditPencil /> },
      { id: 'test', label: 'Edited', target: 'test/auth.test.ts', added: 31, removed: 4, icon: <EditPencil /> },
      {
        id: 'push',
        label: 'Pushed',
        target: 'feat/rate-limit → origin',
        icon: <GitBranch />,
        revertible: false,
        reason: 'Pushed commits stay on the remote. Revert them with a new commit.',
      },
    ],
  },
  {
    id: 'rename',
    label: 'Rename getUser to fetchUser',
    at: '2026-11-19T09:15:00',
    actions: [
      { id: 'users', label: 'Edited', target: 'src/api/users.ts', added: 4, removed: 4, icon: <EditPencil /> },
      { id: 'profile', label: 'Edited', target: 'src/routes/profile.ts', added: 2, removed: 2, icon: <EditPencil /> },
      { id: 'admin', label: 'Edited', target: 'src/routes/admin.ts', added: 2, removed: 2, icon: <EditPencil /> },
    ],
  },
]

export const controls: ShowcaseControl[] = [
  { id: 'undo', label: 'Undo the revert', type: 'switch', default: 'on' },
  { id: 'fails', label: 'Revert fails', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const restore =
    v.undo === 'on'
      ? `
        // The toast's Undo, and Restore on a reverted line: apply the change again.
        onRestore={(actions) => agent.reapply(actions.map((a) => a.id))}`
      : ''
  return `import { Toaster } from '@uisatin/ui/toast'
import { AgentActionLog, type AgentRun } from '@uisatin/pro/agent-undo-log'
import { EditPencil, GitBranch, PagePlus } from 'iconoir-react'

const runs: AgentRun[] = [
  {
    id: 'rate-limit',
    label: 'Add rate limiting to the login endpoint',
    at: '2026-11-19T10:42',
    actions: [
      { id: 'middleware', label: 'Created', target: 'src/middleware/rate-limit.ts', added: 48, icon: <PagePlus /> },
      { id: 'route', label: 'Edited', target: 'src/routes/auth.ts', added: 6, removed: 2, icon: <EditPencil /> },
      { id: 'test', label: 'Edited', target: 'test/auth.test.ts', added: 31, removed: 4, icon: <EditPencil /> },
      {
        id: 'push',
        label: 'Pushed',
        target: 'feat/rate-limit → origin',
        icon: <GitBranch />,
        revertible: false,
        reason: 'Pushed commits stay on the remote. Revert them with a new commit.',
      },
    ],
  },
]

export function AgentActivity() {
  return (
    <>
      <AgentActionLog
        runs={runs}
        // Throw an Error to say why it couldn't: "src/routes/auth.ts changed after this edit".
        onRevert={(action) => agent.revert(action.id)}${restore}
      />
      {/* Once, near the root: the toast after each revert. */}
      <Toaster />
    </>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.undo === 'on' ? 'Undo the revert' : 'No undo', v.fails === 'on' ? 'Revert fails' : 'Revert works'].join(' · '),
  code: code(v),
}))

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function Preview({ v }: { v: Record<string, string> }) {
  React.useEffect(() => () => toast.dismiss(), [])
  return (
    // Room under the log for the toast, which comes up inside the stage.
    <div className="relative w-[600px] max-w-full pb-[104px]">
      <AgentActionLog
        runs={RUNS}
        onRevert={async (action: AgentAction) => {
          await wait(600)
          // The file moved on since the agent's edit: the revert would overwrite someone's work.
          if (v.fails === 'on') throw new Error(`${action.target} changed after this edit`)
        }}
        onRestore={v.undo === 'on' ? () => wait(400) : undefined}
        // Only while focus is in the log, so ⌘Z elsewhere on the docs page stays the browser's.
        shortcut="log"
      />
      <Toaster className="absolute inset-x-0 bottom-0 mx-auto w-[397px] max-w-full" />
    </div>
  )
}

export default function AgentUndoLogDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Agent action log" options={options} codeHtml={codeHtml} controls={controls} align="top" render={(id, v) => <Preview key={id} v={v} />} />
}
