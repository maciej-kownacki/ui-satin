import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
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

  it('goes on with the keyboard, and focus stays on the step buttons', async () => {
    const { user } = renderWithSatin(<Flow onDone={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Next question' }))
    expect(count()).toBe('2/3')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next question' })))
    await user.click(screen.getByRole('button', { name: 'Previous question' }))
    expect(count()).toBe('1/3')
    // Back on the first question Previous is disabled, so focus moves to Next rather than the page.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next question' })))

    // Tab to Continue (past Skip) and press Enter: on to the next question.
    screen.getByRole('button', { name: 'Skip' }).focus()
    await user.tab()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' })))
    await user.keyboard('{Enter}')
    expect(screen.getByRole('group', { name: questions[1].title })).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'One' })))
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Flow onDone={() => {}} />, { theme })
    await expectNoAxeViolations()
  })
})

/** A pointer event with the fields the ranking reads (jsdom has no PointerEvent). */
function pointer(type: string, target: EventTarget, y: number, pointerType = 'mouse') {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: 10, clientY: y, button: 0 })
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType }, isPrimary: { value: true } })
  act(() => void target.dispatchEvent(event))
}

const ranked = [
  { value: 'budget', label: 'Budget' },
  { value: 'speed', label: 'Speed' },
  { value: 'quality', label: 'Quality' },
]

describe('DecisionCard ranking with a pointer', () => {
  const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="decision-card-rank"]'))
  const row = (label: string) => rows().find((r) => r.textContent?.includes(label))!
  const gap = () => document.querySelector('[data-slot="decision-card-rank-gap"]')
  /** jsdom lays nothing out: rows 36px high, 42px apart, in the order they stand now. */
  const layOut = () =>
    rows().forEach((el, i) => {
      el.getBoundingClientRect = () => ({ top: i * 42, bottom: i * 42 + 36, height: 36, left: 0, right: 300, width: 300, x: 0, y: i * 42, toJSON: () => ({}) }) as DOMRect
    })
  const renderRanking = () => {
    const onValueChange = vi.fn()
    renderWithSatin(<DecisionCard type="ranking" title="What matters most?" options={ranked} onValueChange={onValueChange} />)
    layOut()
    return onValueChange
  }
  const order = () => rows().map((r) => r.querySelector('span.flex-1')?.textContent)

  it('starts no drag under the 4px threshold', () => {
    const onValueChange = renderRanking()
    pointer('pointerdown', row('Budget'), 18)
    pointer('pointermove', window, 21)
    expect(row('Budget').hasAttribute('data-drag')).toBe(false)
    expect(gap()).toBeNull()
    pointer('pointerup', window, 21)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('lifts the row, opens a gap where it would land, and commits once, on drop', () => {
    const onValueChange = renderRanking()
    pointer('pointerdown', row('Budget'), 18)
    pointer('pointermove', window, 24)
    const budget = row('Budget')
    expect(budget.getAttribute('data-drag')).toBe('lifted')
    expect(budget.classList.contains('satin-drag')).toBe(true)
    expect(budget.hasAttribute('data-dragging')).toBe(true)
    expect(gap()).toBeTruthy()

    // Past the middle of Speed, then of Quality: the gap moves, nothing is committed yet.
    pointer('pointermove', window, 18 + 30)
    expect(budget.style.translate).toBe('0px 30px')
    expect(Array.from(gap()!.parentElement!.children).indexOf(gap()!)).toBe(2)
    pointer('pointermove', window, 18 + 84)
    expect(onValueChange).not.toHaveBeenCalled()
    // The order on screen hasn't changed; the rank dots already show where each would land.
    expect(order()).toEqual(['Budget', 'Speed', 'Quality'])
    expect(rows().map((r) => r.querySelector('.tabular-nums')?.textContent)).toEqual(['3', '1', '2'])

    pointer('pointerup', window, 18 + 84)
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(['speed', 'quality', 'budget'])
    expect(order()).toEqual(['Speed', 'Quality', 'Budget'])
    expect(gap()).toBeNull()
    expect(row('Budget').hasAttribute('data-dragging')).toBe(false)
    // Let go, it springs into its place (drag.css).
    expect(row('Budget').getAttribute('data-drag')).toBe('settle')
    expect(document.querySelector('[aria-live="polite"].sr-only')?.textContent).toBe('Budget, position 3 of 3')
  })

  it('puts the row back on Escape, with no change', () => {
    const onValueChange = renderRanking()
    pointer('pointerdown', row('Budget'), 18)
    pointer('pointermove', window, 18 + 84)
    expect(row('Budget').getAttribute('data-drag')).toBe('lifted')
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    expect(gap()).toBeNull()
    expect(row('Budget').hasAttribute('data-dragging')).toBe(false)
    pointer('pointerup', window, 18 + 84)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(order()).toEqual(['Budget', 'Speed', 'Quality'])
  })

  it('lifts a touched row only after a 250 ms hold; a swipe before it is a scroll', () => {
    vi.useFakeTimers()
    try {
      renderRanking()
      pointer('pointerdown', row('Speed'), 60, 'touch')
      pointer('pointermove', window, 80, 'touch')
      vi.advanceTimersByTime(300)
      expect(row('Speed').hasAttribute('data-drag')).toBe(false)
      pointer('pointerup', window, 80, 'touch')

      pointer('pointerdown', row('Speed'), 60, 'touch')
      act(() => void vi.advanceTimersByTime(250))
      expect(row('Speed').getAttribute('data-drag')).toBe('lifted')
      pointer('pointerup', window, 60, 'touch')
    } finally {
      vi.useRealTimers()
    }
  })

  it('moves rows with Alt+arrows without lifting them', () => {
    const onValueChange = renderRanking()
    row('Budget').focus()
    act(() => void row('Budget').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true })))
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(['speed', 'budget', 'quality'])
    expect(document.querySelector('[data-slot="decision-card-rank"][data-drag]')).toBeNull()
  })
})
