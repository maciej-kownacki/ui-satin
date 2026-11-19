import * as React from 'react'
import { ArrowRight, Label, Mail, Bookmark } from 'iconoir-react'
import { Toaster, toast } from '@uisatin/ui/toast'
import { AgentActionLog, type AgentRun } from '@uisatin/pro/agent-undo-log'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/*
 * Recruiting: the agent screened new applicants. It moved three candidates and sent one email;
 * the reader reverts one move. The email can't be unsent, and the log says why.
 *
 * Times are local wall-clock strings, so the page renders the same on the server and in the
 * browser whatever the time zone; the log writes them as times today and with the date after.
 */
const RUNS: AgentRun[] = [
  {
    id: 'screening',
    label: 'Screened new applicants for Product Designer',
    at: '2026-11-19T10:42:00',
    actions: [
      {
        id: 'ana',
        label: 'Moved Ana Silva to Interview',
        icon: <ArrowRight />,
        changes: [{ field: 'Stage', from: 'Screening', to: 'Interview' }],
      },
      {
        id: 'tom',
        label: 'Moved Tom Becker to Interview',
        icon: <ArrowRight />,
        changes: [{ field: 'Stage', from: 'Screening', to: 'Interview' }],
      },
      {
        id: 'lee',
        label: 'Moved Lee Wong to Rejected',
        icon: <ArrowRight />,
        changes: [{ field: 'Stage', from: 'Screening', to: 'Rejected' }],
      },
      {
        id: 'lee-email',
        label: 'Sent a rejection email to Lee Wong',
        icon: <Mail />,
        revertible: false,
        reason: "Emails can't be unsent once delivered. If it was a mistake, write to Lee yourself.",
      },
    ],
  },
  {
    id: 'tagging',
    label: 'Tagged applicants from the LinkedIn campaign',
    at: '2026-11-19T09:15:00',
    actions: [
      { id: 'tag', label: 'Tagged 8 applicants LinkedIn', icon: <Label />, at: '2026-11-19T09:15:00' },
      { id: 'view', label: 'Saved the view LinkedIn applicants', icon: <Bookmark />, at: '2026-11-19T09:16:00' },
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
        // The toast's Undo, and Restore on a reverted row.
        onRestore={(actions) => api.restore(actions.map((a) => a.id))}`
      : ''
  return `import { Toaster } from '@uisatin/ui/toast'
import { AgentActionLog, type AgentRun } from '@uisatin/pro/agent-undo-log'
import { ArrowRight, Mail } from 'iconoir-react'

const runs: AgentRun[] = [
  {
    id: 'screening',
    label: 'Screened new applicants for Product Designer',
    at: '2026-11-19T10:42',
    actions: [
      {
        id: 'ana',
        label: 'Moved Ana Silva to Interview',
        icon: <ArrowRight />,
        at: '2026-11-19T10:42',
        changes: [{ field: 'Stage', from: 'Screening', to: 'Interview' }],
      },
      // …Tom Becker to Interview, Lee Wong to Rejected
      {
        id: 'lee-email',
        label: 'Sent a rejection email to Lee Wong',
        icon: <Mail />,
        revertible: false,
        reason: "Emails can't be unsent once delivered. If it was a mistake, write to Lee yourself.",
      },
    ],
  },
]

export function AgentActivity() {
  return (
    <>
      <AgentActionLog
        runs={runs}
        // A rejected promise marks the row: "Couldn't revert", and Try again.
        onRevert={(action) => api.revert(action.id)}${restore}
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
        onRevert={async () => {
          await wait(600)
          if (v.fails === 'on') throw new Error('The ATS did not answer')
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
