import * as React from 'react'
import { AgentPlan, type AgentPlanStatus, type AgentPlanStep } from '@uisatin/pro/agent-plan'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import googleCalendar from './assets/app-google-calendar.png'
import gmail from './assets/app-gmail.png'

const TITLE = 'Schedule interviews for 3 shortlisted candidates'

/** What the agent proposes. Each tool is an app the agent is connected to, shown with its logo. */
const PLAN: AgentPlanStep[] = [
  { id: 'slots', label: 'Find open slots', detail: 'Tue–Thu next week, 45 min with the panel', tool: 'Google Calendar', toolIcon: <img src={googleCalendar.src} alt="" /> },
  { id: 'draft', label: 'Draft invites', detail: 'One per candidate, with the role and a video link', tool: 'Gmail', toolIcon: <img src={gmail.src} alt="" /> },
  { id: 'send', label: 'Send invites', detail: 'To Maya Chen, Tomás Ruiz and Priya Nair', tool: 'Gmail', toolIcon: <img src={gmail.src} alt="" /> },
]

/** What each step leaves behind once it has run, in place of its detail. */
const RESULTS: Record<string, string> = {
  slots: '3 slots held: Tue 10:00, Wed 14:00, Thu 11:30',
  draft: '3 drafts ready',
  send: 'Sent to 3 candidates',
}

const ERROR = 'The Gmail connection expired. Reconnect it, then retry.'

/** How long the agent spends on a step, in ms. */
const STEP_MS = 1800

const finished = (steps: AgentPlanStep[], ids: string[]) => steps.map((s) => (ids.includes(s.id) ? { ...s, detail: RESULTS[s.id] } : s))

export const controls: ShowcaseControl[] = [
  {
    id: 'state',
    label: 'State',
    items: [
      { value: 'draft', label: 'Draft' },
      { value: 'running', label: 'Running' },
      { value: 'failed', label: 'Failed' },
      { value: 'done', label: 'Done' },
    ],
  },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? (c.items.find((i) => i.value === value)?.label ?? value) : value
}

/** The props that say where the run is, as the app passes them from its agent. */
const RUN_PROPS: Record<string, string[]> = {
  draft: [],
  running: ['status="running"', 'currentStep="draft"'],
  failed: ['status="failed"', 'currentStep="draft"', `error="${ERROR}"`],
  done: ['status="done"'],
}

function code(v: Record<string, string>) {
  const run = RUN_PROPS[v.state].map((p) => `      ${p}\n`).join('')
  return `import { AgentPlan, type AgentPlanStep } from '@uisatin/pro/agent-plan'

// The logos of the apps the agent is connected to, as your app already has them. An img is drawn at 16px.
const googleCalendar = <img src="/logos/google-calendar.png" alt="" />
const gmail = <img src="/logos/gmail.png" alt="" />

const plan: AgentPlanStep[] = [
  { id: 'slots', label: 'Find open slots', detail: 'Tue–Thu next week, 45 min with the panel', tool: 'Google Calendar', toolIcon: googleCalendar },
  { id: 'draft', label: 'Draft invites', detail: 'One per candidate, with the role and a video link', tool: 'Gmail', toolIcon: gmail },
  { id: 'send', label: 'Send invites', detail: 'To Maya Chen, Tomás Ruiz and Priya Nair', tool: 'Gmail', toolIcon: gmail },
]

export function InterviewPlan({ agent }: { agent: Agent }) {
  // The person edits the steps; the agent says how far it got (status, the step it's on, why it stopped).
  const [steps, setSteps] = React.useState(plan)
  return (
    <AgentPlan
      title="${TITLE}"
      steps={steps}
      onStepsChange={setSteps}
${run}      onRun={(toRun) => agent.run(toRun)}
      onStop={() => agent.stop()}
      onRetry={(step) => agent.retry(step.id)}
      onSkip={(step) => agent.skip(step.id)}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: labelOf('state', v.state),
  code: code(v),
}))

type Run = { status: AgentPlanStatus; current?: string; error?: string }

/**
 * The hiring scenario. A state picked from the control starts from the agent's plan; Run, the
 * end of a run and Stop move the control themselves and keep the person's edits.
 */
function Preview({ v, set }: { v: Record<string, string>; set: (id: string, value: string) => void }) {
  const [steps, setSteps] = React.useState<AgentPlanStep[]>(PLAN)
  const [run, setRun] = React.useState<Run>({ status: 'draft' })
  // The state the plan moved to itself, so the control's change doesn't reset it.
  const own = React.useRef<string | null>(null)

  const go = (next: Run) => {
    setRun(next)
    if (next.status !== v.state) {
      own.current = next.status
      set('state', next.status)
    }
  }

  React.useLayoutEffect(() => {
    if (own.current === v.state) {
      own.current = null
      return
    }
    const state = v.state as AgentPlanStatus
    if (state === 'draft') {
      setSteps(PLAN)
      setRun({ status: 'draft' })
    } else if (state === 'running') {
      setSteps(PLAN)
      setRun({ status: 'running', current: 'slots' })
    } else if (state === 'failed') {
      setSteps(finished(PLAN, ['slots']))
      setRun({ status: 'failed', current: 'draft', error: ERROR })
    } else {
      setSteps(finished(PLAN, ['slots', 'draft', 'send']))
      setRun({ status: 'done' })
    }
  }, [v.state])

  // The agent: each step takes a moment, leaves its result, and the next one starts.
  React.useEffect(() => {
    if (run.status !== 'running' || !run.current) return
    const timer = setTimeout(() => {
      const left = steps.filter((s) => !s.skipped)
      const next = left[left.findIndex((s) => s.id === run.current) + 1]
      setSteps((all) => finished(all, [run.current!]))
      go(next ? { status: 'running', current: next.id } : { status: 'done' })
    }, STEP_MS)
    return () => clearTimeout(timer)
  }, [run, steps])

  const nextAfter = (id: string) => {
    const from = steps.findIndex((s) => s.id === id)
    return steps.slice(from + 1).find((s) => !s.skipped)
  }

  return (
    <div className="w-[min(460px,calc(100vw-80px))]">
      <AgentPlan
        title={TITLE}
        steps={steps}
        onStepsChange={setSteps}
        status={run.status}
        currentStep={run.current}
        error={run.error}
        onRun={(toRun) => go({ status: 'running', current: toRun[0].id })}
        onStop={() => {
          // Back to the plan as it was proposed, with the person's edits kept and nothing skipped.
          setSteps((all) => all.map((s) => ({ ...s, detail: PLAN.find((p) => p.id === s.id)?.detail, skipped: false })))
          go({ status: 'draft' })
        }}
        onRetry={(step) => go({ status: 'running', current: step.id })}
        onSkip={(step) => {
          const next = nextAfter(step.id)
          go(next ? { status: 'running', current: next.id } : { status: 'done' })
        }}
      />
    </div>
  )
}

export default function AgentPlanDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Agent plan" options={options} codeHtml={codeHtml} controls={controls} align="top" render={(_, v, set) => <Preview v={v} set={set} />} />
}
