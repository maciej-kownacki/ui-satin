/* Type test, never run: AgentPlan's props, controlled and uncontrolled, its parts, refs, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  AgentPlan,
  AgentPlanActions,
  AgentPlanHeader,
  AgentPlanRoot,
  AgentPlanSteps,
  type AgentPlanStatus,
  type AgentPlanStep,
} from '../components/agent-plan'

const steps: AgentPlanStep[] = [
  { id: 'slots', label: 'Find open slots', detail: <>Tue–Thu, 45 min</>, tool: 'Calendar', toolIcon: <svg /> },
  { id: 'send', label: 'Send invites', editable: false, skipped: false },
]

// @ts-expect-error: a step needs a label
const noLabel: AgentPlanStep = { id: 'x' }
// @ts-expect-error: no such status
const wrongStatus: AgentPlanStatus = 'paused'

const cardRef = React.createRef<HTMLDivElement>()

// Controlled: the app holds the steps and says how far the run got.
export const controlled = (
  <AgentPlan
    ref={cardRef}
    title="Schedule interviews for 3 shortlisted candidates"
    steps={steps}
    onStepsChange={(next) => next.map((s) => s.id)}
    status="failed"
    currentStep="send"
    onRun={(run) => run.length}
    onStop={() => {}}
    onRetry={(step) => step.id}
    onSkip={(step) => step.skipped}
    error="The Mail connection expired."
    indicator="flappy"
    glimmer="neutral"
  />
)

// Uncontrolled: the plan keeps its own edits.
export const uncontrolled = <AgentPlan defaultSteps={steps} onRun={() => {}} />

// Parts, each taking a ref and its element's props.
export const parts = (
  <AgentPlanRoot ref={cardRef} defaultSteps={steps} status="draft" aria-label="Interview plan">
    <AgentPlanHeader ref={React.createRef<HTMLDivElement>()} title={<strong>Plan</strong>} />
    <AgentPlanSteps ref={React.createRef<HTMLDivElement>()} className="px-3" />
    <AgentPlanActions ref={React.createRef<HTMLDivElement>()}>
      <button type="button">Cancel</button>
    </AgentPlanActions>
  </AgentPlanRoot>
)

// @ts-expect-error: onRun gets the steps to run
export const wrongRun = <AgentPlan steps={steps} onRun={(count: number) => count} />

// @ts-expect-error: AgentPlan has no layout prop
export const noLayout = <AgentPlan steps={steps} layout="select" />

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels
    labels={{
      close: 'Zamknij',
      runPlan: 'Uruchom plan',
      stepDone: (step) => `${step}: gotowe`,
      stepRemoved: (step) => `Usunięto: ${step}`,
      stepStatus: (status) => (status === 'done' ? 'Gotowe' : status),
    }}
  >
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ stepDone: 'gotowe' }}>{uncontrolled}</SatinLabels>

export { noLabel, wrongStatus }
