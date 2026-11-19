import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { Stepper, StepperItem, type StepperStepState } from '@uisatin/ui/stepper'
import { Textarea } from '@uisatin/ui/textarea'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/** The job application: Details → CV → Questions → Review. */
const STEPS = [
  { value: 'details', label: 'Details', description: 'Name and contact' },
  { value: 'cv', label: 'CV', description: 'A PDF, up to 10 MB' },
  { value: 'questions', label: 'Questions', description: 'Three short answers' },
  { value: 'review', label: 'Review', description: 'Check and send' },
]
const CV_FAILED = 'Upload failed, try again'

export const controls: ShowcaseControl[] = [
  { id: 'orientation', label: 'Orientation', items: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }] },
  { id: 'width', label: 'Width', items: [{ value: 'wide', label: 'Wide' }, { value: 'narrow', label: 'Narrow' }] },
  { id: 'linear', label: 'Linear', type: 'switch', default: 'on' },
]

function code(v: Record<string, string>) {
  const vertical = v.orientation === 'vertical'
  const linear = v.linear === 'on'
  const attrs = [
    'value={step}',
    !linear && 'onValueChange={setStep}',
    vertical && 'orientation="vertical"',
    !linear && 'linear={false}',
    'aria-label="Job application"',
  ].filter(Boolean)
  const head = `import { Stepper${vertical ? ', StepperItem' : ''} } from '@uisatin/ui/stepper'
import { Button } from '@uisatin/ui/button'

// The CV upload failed: the step says so, and the flow goes on.
const state = (value: string) => (value === 'cv' && cvFailed ? 'error' : done.includes(value) ? 'complete' : undefined)
`
  if (vertical)
    return `${head}
<Stepper ${attrs.join(' ')}>
  <StepperItem value="details" label="Details" description="Name and contact" state={state('details')} />
  <StepperItem value="cv" label="CV" description={cvFailed ? '${CV_FAILED}' : 'A PDF, up to 10 MB'} state={state('cv')} />
  <StepperItem value="questions" label="Questions" description="Three short answers" state={state('questions')}>
    <Textarea label="Why this role?" rows={2} />
    <Button onClick={next}>Continue</Button>
  </StepperItem>
  <StepperItem value="review" label="Review" description="Check and send" state={state('review')} />
</Stepper>`
  return `${head}
<Stepper
  ${attrs.join('\n  ')}
  steps={[
    { value: 'details', label: 'Details', description: 'Name and contact', state: state('details') },
    { value: 'cv', label: 'CV', description: cvFailed ? '${CV_FAILED}' : 'A PDF, up to 10 MB', state: state('cv') },
    { value: 'questions', label: 'Questions', description: 'Three short answers', state: state('questions') },
    { value: 'review', label: 'Review', description: 'Check and send', state: state('review') },
  ]}
/>
{/* Narrower than 480px (120px a step), it shows "Step 3 of 4" over a bar instead. */}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.orientation === 'vertical' ? 'Vertical' : 'Horizontal', v.width === 'narrow' ? 'Narrow' : 'Wide', v.linear === 'on' ? 'Linear' : 'Non-linear'].join(' · '),
  code: code(v),
}))

/** What each step asks for, under the stepper (or under the current step, vertical). */
function StepBody({ step, cvFailed, onRetry }: { step: string; cvFailed: boolean; onRetry: () => void }) {
  if (step === 'details') return <p className="text-sm text-text-muted">Ada Novak · ada@example.com · +48 600 100 200</p>
  if (step === 'cv')
    return cvFailed ? (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-text-muted">ada-novak-cv.pdf is 14 MB.</p>
        <Button size="xs" variant="secondary" onClick={onRetry}>
          Upload a smaller file
        </Button>
      </div>
    ) : (
      <p className="text-sm text-text-muted">ada-novak-cv.pdf · 2.1 MB</p>
    )
  if (step === 'questions') return <Textarea label="Why this role?" rows={2} defaultValue="I’ve built design systems for six years and want to" />
  return <p className="text-sm text-text-muted">Everything in one place before you send it.</p>
}

function Preview({ v }: { v: Record<string, string> }) {
  const vertical = v.orientation === 'vertical'
  const linear = v.linear === 'on'
  // Step 3 of 4, with the CV upload (step 2) failed.
  const [step, setStep] = React.useState('questions')
  const [done, setDone] = React.useState<string[]>(['details'])
  const [cvFailed, setCvFailed] = React.useState(true)

  const index = STEPS.findIndex((s) => s.value === step)
  const state = (value: string): StepperStepState | undefined =>
    value === 'cv' && cvFailed ? 'error' : done.includes(value) ? 'complete' : undefined
  const steps = STEPS.map((s) => ({ ...s, description: s.value === 'cv' && cvFailed ? CV_FAILED : s.description, state: state(s.value) }))

  const next = () => {
    setDone((d) => (d.includes(step) ? d : [...d, step]))
    if (index < STEPS.length - 1) setStep(STEPS[index + 1].value)
  }
  const back = () => index > 0 && setStep(STEPS[index - 1].value)
  const body = <StepBody step={step} cvFailed={cvFailed} onRetry={() => setCvFailed(false)} />
  const footer = (
    <div className="flex gap-2">
      <Button variant="secondary" size="xs" onClick={back} disabled={index === 0}>
        Back
      </Button>
      <Button size="xs" onClick={next} disabled={index === STEPS.length - 1}>
        {index === STEPS.length - 2 ? 'Review' : 'Continue'}
      </Button>
    </div>
  )

  if (vertical)
    return (
      <div className={v.width === 'narrow' ? 'w-[320px] max-w-full' : 'w-[440px] max-w-full'}>
        <Stepper value={step} onValueChange={setStep} orientation="vertical" linear={linear} aria-label="Job application">
          {steps.map((s) => (
            <StepperItem key={s.value} {...s}>
              <div className="flex flex-col gap-3">
                {body}
                {footer}
              </div>
            </StepperItem>
          ))}
        </Stepper>
      </div>
    )

  return (
    <div className={v.width === 'narrow' ? 'w-[320px] max-w-full' : 'w-[600px] max-w-full'}>
      <Stepper value={step} onValueChange={setStep} steps={steps} linear={linear} aria-label="Job application" />
      <div className="mt-6 flex min-h-[132px] flex-col gap-4 border-t border-border-subtle pt-5">
        <div className="flex-1">{body}</div>
        {footer}
      </div>
    </div>
  )
}

export default function StepperDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Stepper" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
