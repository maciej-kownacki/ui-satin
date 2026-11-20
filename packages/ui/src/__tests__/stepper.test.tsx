import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Stepper, StepperItem, type StepperStep } from '../components/stepper'

// The docs scenario: a job application on step 3, with the CV upload (step 2) failed.
const steps: StepperStep[] = [
  { value: 'details', label: 'Details', description: 'Name and contact' },
  { value: 'cv', label: 'CV', description: 'Upload failed, try again', state: 'error' },
  { value: 'questions', label: 'Questions', description: 'Three short answers' },
  { value: 'review', label: 'Review', description: 'Check and send' },
]

const items = () => within(screen.getByRole('list', { name: 'Job application' })).getAllByRole('listitem')

describe('Stepper', () => {
  it('is an ordered list with the current step and each state in the words', () => {
    renderWithSatin(<Stepper steps={steps} value="questions" layout="full" aria-label="Job application" />)
    const list = screen.getByRole('list', { name: 'Job application' })
    expect(list.tagName).toBe('OL')
    const [details, cv, questions, review] = items()
    // Linear: the step before the current one is complete without saying so.
    expect(details.textContent).toContain('Details, Completed')
    expect(cv.textContent).toContain('CV, Error')
    expect(questions.getAttribute('aria-current')).toBe('step')
    expect(review.getAttribute('aria-current')).toBeNull()
    expect(review.textContent).not.toMatch(/Completed|Error/)
    // Linear steps are text, not buttons.
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('fills the connectors up to the current step', () => {
    const { container } = renderWithSatin(<Stepper steps={steps} value="questions" layout="full" />)
    const connectors = [...container.querySelectorAll('[data-slot="stepper-connector"]')]
    // Three connectors for four steps; past Details and CV, not yet past Questions.
    expect(connectors.map((c) => c.getAttribute('data-state'))).toEqual(['complete', 'complete', null])
  })

  it('non-linear: each step is a button that Tab reaches and Enter and Space pick', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(
      <Stepper
        steps={[...steps.slice(0, 3), { ...steps[3], state: 'disabled' }]}
        defaultValue="details"
        onValueChange={onValueChange}
        linear={false}
        layout="full"
        aria-label="Job application"
      />,
    )
    const details = screen.getByRole('button', { name: 'Details' })
    expect(details.getAttribute('aria-current')).toBe('step')
    expect(details.getAttribute('aria-describedby')).toBeTruthy()
    // Non-linear: nothing is complete unless it says so.
    expect(screen.getByRole('button', { name: 'CV, Error' })).toBeTruthy()
    const review = screen.getByRole('button', { name: 'Review' })
    expect(review).toHaveProperty('disabled', true)

    await user.tab()
    expect(document.activeElement).toBe(details)
    await user.tab()
    await user.tab()
    const questions = screen.getByRole('button', { name: 'Questions' })
    expect(document.activeElement).toBe(questions)
    await user.keyboard('{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('questions')
    expect(questions.getAttribute('aria-current')).toBe('step')
    expect(details.getAttribute('aria-current')).toBeNull()

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    await user.keyboard(' ')
    expect(onValueChange).toHaveBeenLastCalledWith('cv')
    // The disabled step is left out of the tab order.
    await user.tab()
    await user.tab()
    expect(document.activeElement).not.toBe(review)
  })

  it('takes a controlled value and moves only when the app moves it', async () => {
    const onValueChange = vi.fn()
    const { user, rerender } = renderWithSatin(<Stepper steps={steps} value="details" onValueChange={onValueChange} linear={false} layout="full" />)
    await user.click(screen.getByRole('button', { name: 'Review' }))
    expect(onValueChange).toHaveBeenCalledWith('review')
    expect(screen.getByRole('button', { name: 'Details' }).getAttribute('aria-current')).toBe('step')
    rerender(<Stepper steps={steps} value="review" onValueChange={onValueChange} linear={false} layout="full" />)
    expect(screen.getByRole('button', { name: 'Review' }).getAttribute('aria-current')).toBe('step')
  })

  it('shows a vertical step’s content under it only while it is current', () => {
    const { rerender } = renderWithSatin(
      <Stepper value="cv" orientation="vertical" aria-label="Job application">
        <StepperItem value="details" label="Details">
          <p>Your details</p>
        </StepperItem>
        <StepperItem value="cv" label="CV">
          <input aria-label="CV file" type="file" />
        </StepperItem>
      </Stepper>,
    )
    expect(screen.getByLabelText('CV file')).toBeTruthy()
    expect(screen.queryByText('Your details')).toBeNull()
    rerender(
      <Stepper value="details" orientation="vertical" aria-label="Job application">
        <StepperItem value="details" label="Details">
          <p>Your details</p>
        </StepperItem>
        <StepperItem value="cv" label="CV">
          <input aria-label="CV file" type="file" />
        </StepperItem>
      </Stepper>,
    )
    expect(screen.getByText('Your details')).toBeTruthy()
    expect(screen.queryByLabelText('CV file')).toBeNull()
  })

  it('compact: "Step 3 of 4" over a progress bar named by the current step', () => {
    renderWithSatin(<Stepper steps={steps} value="questions" layout="compact" aria-label="Job application" />)
    expect(screen.queryByRole('list')).toBeNull()
    const bar = screen.getByRole('progressbar', { name: 'Questions' })
    expect(bar.getAttribute('aria-valuetext')).toBe('Step 3 of 4')
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect(bar.getAttribute('aria-valuemax')).toBe('4')
  })

  it('auto: renders both forms and leaves the choice to a container query', () => {
    const { container } = renderWithSatin(<Stepper steps={steps} value="questions" />)
    const root = container.querySelector('[data-slot="stepper"]')!
    expect(root.getAttribute('data-layout')).toBe('auto')
    expect(root.getAttribute('data-count')).toBe('4')
    expect(root.querySelector('[data-slot="stepper-list"]')).toBeTruthy()
    expect(root.querySelector('[data-slot="stepper-compact"]')).toBeTruthy()
  })

  it('speaks the app’s language', () => {
    renderWithSatin(<Stepper steps={steps} value="questions" layout="compact" />, {
      labels: { stepOf: (step, count) => `Krok ${step} z ${count}`, stepCompleted: 'Ukończony', stepError: 'Błąd' },
    })
    expect(screen.getByRole('progressbar').getAttribute('aria-valuetext')).toBe('Krok 3 z 4')
    expect(screen.getByText('Krok 3 z 4')).toBeTruthy()
  })

  it('says Completed and Error in the app’s words', () => {
    renderWithSatin(<Stepper steps={steps} value="questions" layout="full" aria-label="Job application" />, {
      labels: { stepCompleted: 'Ukończony', stepError: 'Błąd' },
    })
    const [details, cv] = items()
    expect(details.textContent).toContain('Details, Ukończony')
    expect(cv.textContent).toContain('CV, Błąd')
  })

  it('writes step numbers in the labels’ locale', () => {
    const { container } = renderWithSatin(<Stepper steps={steps} value="details" layout="full" />, { labels: { dateLocale: 'ar-EG' } })
    const numbers = [...container.querySelectorAll('[data-slot="stepper-number"]')].map((n) => n.textContent)
    expect(numbers).toEqual(['١', '٢', '٣', '٤'])
  })

  it('passes ref and other props to the root', () => {
    let root: HTMLDivElement | null = null
    renderWithSatin(<Stepper steps={steps} id="apply" ref={(node) => void (root = node)} />)
    expect(root).not.toBeNull()
    expect(root!.id).toBe('apply')
    expect(root!.getAttribute('data-slot')).toBe('stepper')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <>
        <Stepper steps={steps} value="questions" aria-label="Job application" />
        <Stepper steps={[...steps.slice(0, 3), { ...steps[3], state: 'disabled' }]} value="cv" linear={false} aria-label="Job application, by step" />
        <Stepper value="questions" orientation="vertical" aria-label="Job application, vertical">
          {steps.map((s) => (
            <StepperItem key={s.value} {...s}>
              <textarea aria-label="Why this role?" />
            </StepperItem>
          ))}
        </Stepper>
      </>,
      { theme },
    )
    await expectNoAxeViolations()
  })

  it('has no axe violations right to left', async () => {
    renderWithSatin(<Stepper steps={steps} value="questions" linear={false} aria-label="Job application" />, { dir: 'rtl' })
    await expectNoAxeViolations()
  })
})
