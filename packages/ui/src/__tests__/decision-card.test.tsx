import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { DecisionCard, type DecisionValue } from '../components/decision-card'

const questions = [
  { title: 'What’s your dietary preference?', options: ['Gluten-free', 'Dairy-free', 'Nut-free'] },
  { title: 'How many people?', options: ['One', 'Two', 'Four'] },
  { title: 'Which day?', options: ['Monday', 'Friday'] },
].map((q) => ({ ...q, options: q.options.map((label) => ({ value: label.toLowerCase(), label })) }))

/** The flow the docs run: Continue and Skip go to the next question, the arrows move between them. */
function Flow({ onDone }: { onDone: (answers: Record<number, DecisionValue>) => void }) {
  const [index, setIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<number, DecisionValue>>({})
  const q = questions[index]
  const last = index === questions.length - 1
  const next = (answer?: DecisionValue) => {
    const all = answer === undefined ? answers : { ...answers, [index]: answer }
    setAnswers(all)
    if (last) onDone(all)
    else setIndex(index + 1)
  }
  return (
    <DecisionCard
      title={q.title}
      options={q.options}
      defaultValue={(answers[index] as string | undefined) ?? q.options[0].value}
      step={`${index + 1}/${questions.length}`}
      onPreviousStep={index > 0 ? () => setIndex(index - 1) : undefined}
      onNextStep={last ? undefined : () => setIndex(index + 1)}
      onContinue={(value) => next(value)}
      onSkip={() => next()}
    />
  )
}

const card = () => screen.getByRole('group')
const count = () => card().querySelector('[aria-live]')?.textContent

describe('DecisionCard', () => {
  it('goes to the next question on Continue, with focus in it, and submits on the last', async () => {
    const onDone = vi.fn()
    const { user } = renderWithSatin(<Flow onDone={onDone} />)
    expect(screen.getByRole('group', { name: questions[0].title })).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: 'Dairy-free' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    // The next question is the active one: its title names the card, the count moved on.
    expect(screen.getByRole('group', { name: questions[1].title })).toBeTruthy()
    expect(count()).toBe('2/3')
    // Focus went into it, on its picked answer, so it's read out.
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'One' }))
    expect(onDone).not.toHaveBeenCalled()

    // Skip moves on too; Continue on the last question submits.
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByRole('group', { name: questions[2].title })).toBeTruthy()
    expect(count()).toBe('3/3')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onDone).toHaveBeenCalledWith({ 0: 'dairy-free', 2: 'monday' })
  })

  it('goes on with the keyboard, and the step buttons keep focus', async () => {
    const { user } = renderWithSatin(<Flow onDone={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Next question' }))
    expect(count()).toBe('2/3')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next question' }))
    await user.click(screen.getByRole('button', { name: 'Previous question' }))
    expect(count()).toBe('1/3')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Previous question' }))

    // Tab to Continue (past Skip) and press Enter: on to the next question.
    screen.getByRole('button', { name: 'Skip' }).focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }))
    await user.keyboard('{Enter}')
    expect(screen.getByRole('group', { name: questions[1].title })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'One' }))
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Flow onDone={() => {}} />, { theme })
    await expectNoAxeViolations()
  })
})
