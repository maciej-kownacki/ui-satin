/* Type test, never run: Stepper as data and as parts, controlled and uncontrolled, with a ref. */
import * as React from 'react'
import { Badge } from '../components/badge'
import { Stepper, StepperItem, type StepperStep, type StepperStepState } from '../components/stepper'

const steps: StepperStep[] = [
  { value: 'details', label: 'Details', description: 'Name and contact', state: 'complete' },
  { value: 'cv', label: 'CV', state: 'error' },
  { value: 'questions', label: 'Questions' },
  { value: 'review', label: 'Review', state: 'disabled' },
]

// Uncontrolled, from data, with a ref on the root div.
export const uncontrolled = <Stepper steps={steps} defaultValue="questions" aria-label="Application" ref={React.createRef<HTMLDivElement>()} />

// Controlled, non-linear: a click calls onValueChange with the step's value.
export function Controlled() {
  const [step, setStep] = React.useState('details')
  return <Stepper steps={steps} value={step} onValueChange={setStep} linear={false} layout="full" />
}

// Parts: a Badge in a label, content under the current vertical step, a ref on an item's li.
const state: StepperStepState | undefined = 'complete'
export const parts = (
  <Stepper value="cv" orientation="vertical" layout="compact" aria-labelledby="heading">
    <StepperItem value="details" label="Details" state={state} ref={React.createRef<HTMLLIElement>()} />
    <StepperItem
      value="cv"
      label={
        <>
          CV <Badge size="sm">Optional</Badge>
        </>
      }
      description="A PDF"
    >
      <input aria-label="CV" type="file" />
    </StepperItem>
  </Stepper>
)

// @ts-expect-error a step's state is complete, error or disabled; current comes from `value`
export const wrongState = <Stepper steps={[{ value: 'a', label: 'A', state: 'current' }]} />

// @ts-expect-error orientation is horizontal or vertical
export const wrongOrientation = <Stepper steps={steps} orientation="diagonal" />

// @ts-expect-error a StepperItem needs a value
export const noValue = <StepperItem label="Details" />
