import { Stepper, type StepperStep } from '@uisatin/ui'

/** Every step state side by side: upcoming, current, complete, error and disabled, alone and combined with current. */
const steps = (states: (StepperStep['state'] | undefined)[]): StepperStep[] =>
  ['Details', 'CV', 'Questions', 'Review', 'Send'].map((label, i) => ({
    value: label.toLowerCase(),
    label,
    description: states[i] === 'error' ? 'Upload failed' : states[i] === 'disabled' ? 'Not needed' : 'Description',
    state: states[i],
  }))

const rows: { name: string; value: string; linear: boolean; states: (StepperStep['state'] | undefined)[] }[] = [
  { name: 'linear: complete, error, current, upcoming, disabled', value: 'questions', linear: true, states: [undefined, 'error', undefined, undefined, 'disabled'] },
  { name: 'non-linear: current and complete', value: 'cv', linear: false, states: ['complete', 'complete', undefined, undefined, 'disabled'] },
  { name: 'non-linear: current and error', value: 'questions', linear: false, states: ['complete', undefined, 'error', undefined, undefined] },
]

export function StepperGrid() {
  return (
    <div className="flex flex-col gap-10 p-8 text-xs text-text-muted">
      {rows.map((row) => (
        <div key={row.name} className="flex flex-col gap-3">
          <span>{row.name}</span>
          <div className="w-[720px]">
            <Stepper steps={steps(row.states)} value={row.value} linear={row.linear} layout="full" aria-label={row.name} />
          </div>
        </div>
      ))}
      <div className="flex gap-16">
        <div className="flex flex-col gap-3">
          <span>vertical</span>
          <Stepper steps={steps(rows[0].states)} value="questions" orientation="vertical" aria-label="vertical" />
        </div>
        <div className="flex w-[280px] flex-col gap-3">
          <span>compact (auto below 120px a step)</span>
          <Stepper steps={steps(rows[0].states)} value="questions" aria-label="compact" />
        </div>
      </div>
    </div>
  )
}
