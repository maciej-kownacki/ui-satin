import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Thinking } from '@uisatin/ui/thinking'
import { AgentPlan, AgentPlanRoot, AgentPlanSteps, type AgentPlanProps, type AgentPlanStatus, type AgentPlanStep } from '../components/agent-plan'

const PLAN: AgentPlanStep[] = [
  { id: 'slots', label: 'Find open slots', detail: 'Tue–Thu, 45 min', tool: 'Calendar' },
  { id: 'draft', label: 'Draft invites', tool: 'Mail' },
  { id: 'send', label: 'Send invites', tool: 'Mail' },
]
const TITLE = 'Schedule interviews for 3 shortlisted candidates'

/** The plan with its steps held by the test, the way an app holds them. */
function Plan({ initial = PLAN, onChange, ...props }: Partial<AgentPlanProps> & { initial?: AgentPlanStep[]; onChange?: (steps: AgentPlanStep[]) => void }) {
  const [steps, setSteps] = React.useState(initial)
  return (
    <AgentPlan
      title={TITLE}
      steps={steps}
      onStepsChange={(next) => {
        setSteps(next)
        onChange?.(next)
      }}
      {...props}
    />
  )
}

const list = () => screen.getByRole('list', { name: 'Plan' })
const rows = () => within(list()).getAllByRole('listitem')
/** A step's label alone: the step button holds the label, then the tool's line; a locked step's label is a span. */
const labelOf = (row: HTMLElement) => {
  const label = row.querySelector('[data-part="label"]')
  return (label?.tagName === 'BUTTON' ? label.firstElementChild : label)?.textContent
}
const labelsInOrder = () => rows().map((row) => labelOf(row))
const numbers = () => rows().map((row) => row.querySelector('[data-part="number"]')?.textContent)
/** The step's button: named by its label, then the tool's line. */
const stepButton = (label: string) => screen.getByRole('button', { name: (name) => name.startsWith(label) })
const status = () => screen.getByRole('status')
const logo = <img data-testid="calendar-logo" src="google-calendar.png" alt="" />
const WITH_LOGO: AgentPlanStep[] = [{ ...PLAN[0], toolIcon: logo }, ...PLAN.slice(1)]

describe('AgentPlan, draft', () => {
  it('renders numbered steps as an ordered list in a group named by the title, with nothing on the right', () => {
    renderWithSatin(<Plan />)
    expect(screen.getByRole('group', { name: TITLE })).toBeTruthy()
    expect(list().tagName).toBe('OL')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Draft invites', 'Send invites'])
    // The number is drawn, not read: the ordered list already gives the position.
    expect(numbers()).toEqual(['1', '2', '3'])
    expect(rows()[0].querySelector('[data-part="number"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByText('3 steps')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    // Rename and Remove wait under a step until it's opened.
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull()
  })

  it('shows the tool’s logo, name and detail in one muted line under the label, and the logo again once the plan runs', () => {
    const { rerender } = renderWithSatin(<Plan initial={WITH_LOGO} />)
    const step = rows()[0].querySelector('[data-part="label"]')!
    expect(step.firstElementChild?.textContent).toBe('Find open slots')
    const line = step.lastElementChild!
    expect(line.textContent).toBe('Calendar · Tue–Thu, 45 min')
    expect(line.className).toContain('text-text-muted')
    // A logo img is drawn at 16px and hidden: the name beside it says the same. No Badge around the tool.
    const img = within(line as HTMLElement).getByTestId('calendar-logo')
    expect(img.parentElement?.getAttribute('aria-hidden')).toBe('true')
    expect(img.parentElement?.className).toContain('[&_img]:size-4')
    expect(img.closest('[data-slot="badge"]')).toBeNull()
    rerender(<Plan initial={WITH_LOGO} status="done" />)
    expect(within(rows()[0]).getByTestId('calendar-logo')).toBeTruthy()
  })

  it('opens Rename and Remove under the step you press, one step at a time, and Esc closes them', async () => {
    const { user } = renderWithSatin(<Plan />)
    const draft = stepButton('Draft invites')
    expect(draft.getAttribute('aria-expanded')).toBe('false')
    // Named by its label, then its tool line, with a space between them.
    expect(screen.getByRole('button', { name: 'Draft invites Mail' })).toBe(draft)
    expect(draft.hasAttribute('aria-controls')).toBe(false)
    await user.click(draft)
    expect(draft.getAttribute('aria-expanded')).toBe('true')
    // The open step's card: 8px above and below, grown outwards so its content stays put.
    const row = draft.closest('li')!
    expect(row.hasAttribute('data-open')).toBe(true)
    expect(row.className).toContain('data-open:py-2')
    expect(row.className).toContain('data-open:-my-1')
    const actions = document.getElementById(draft.getAttribute('aria-controls')!)!
    expect(within(actions).getAllByRole('button').map((b) => b.textContent)).toEqual(['Rename', 'Remove'])
    expect(within(actions).getByRole('button', { name: 'Remove Draft invites' })).toBeTruthy()

    // Esc on the open step closes it; focus stays on the step.
    await user.keyboard('{Escape}')
    expect(draft.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(draft)

    // Opening another step closes the one before.
    await user.click(draft)
    await user.click(stepButton('Send invites'))
    expect(draft.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getAllByRole('button', { name: 'Rename' })).toHaveLength(1)

    // Esc from its Remove closes it too, and focus goes back to the step.
    screen.getByRole('button', { name: 'Remove Send invites' }).focus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull()
    expect(document.activeElement).toBe(stepButton('Send invites'))
  })

  it('removes a step, renumbers the rest, reads it out, and moves focus to the next step', async () => {
    const onRun = vi.fn()
    const { user } = renderWithSatin(<Plan onRun={onRun} />)
    await user.click(stepButton('Draft invites'))
    await user.click(screen.getByRole('button', { name: 'Remove Draft invites' }))
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites'])
    expect(numbers()).toEqual(['1', '2'])
    expect(status().textContent).toBe('Draft invites removed')
    expect(document.activeElement).toBe(stepButton('Send invites'))
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull()
    // The last step goes: focus moves to the one before.
    await user.keyboard('{Enter}')
    await user.tab() // Rename
    await user.tab() // Remove
    await user.keyboard('{Enter}')
    expect(labelsInOrder()).toEqual(['Find open slots'])
    expect(document.activeElement).toBe(stepButton('Find open slots'))
    await user.click(screen.getByRole('button', { name: 'Run plan' }))
    expect(onRun.mock.calls[0][0].map((s: AgentPlanStep) => s.id)).toEqual(['slots'])
  })

  it('disables Run while the plan is empty, and sends focus to the list when the last step goes', async () => {
    const { user, unmount } = renderWithSatin(<Plan initial={[]} onRun={() => {}} />)
    expect((screen.getByRole('button', { name: 'Run plan' }) as HTMLButtonElement).disabled).toBe(true)
    unmount()
    renderWithSatin(<Plan initial={PLAN.slice(0, 1)} onRun={() => {}} />)
    const run = screen.getByRole('button', { name: 'Run plan' }) as HTMLButtonElement
    expect(run.disabled).toBe(false)
    await user.click(stepButton('Find open slots'))
    await user.click(screen.getByRole('button', { name: 'Remove Find open slots' }))
    expect(run.disabled).toBe(true)
    expect(document.activeElement).toBe(list())
  })

  it('moves a step with Alt+↓ and Alt+↑, keeps focus on it, and reads out its new place', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Plan onChange={onChange} />)
    const step = stepButton('Find open slots')
    expect(step.getAttribute('aria-description')).toBe('Alt and arrow keys to move')
    step.focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(labelsInOrder()).toEqual(['Draft invites', 'Find open slots', 'Send invites'])
    expect(numbers()).toEqual(['1', '2', '3'])
    expect(document.activeElement).toBe(stepButton('Find open slots'))
    expect(status().textContent).toBe('Find open slots, position 2 of 3')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}') // already last: stays
    expect(labelsInOrder()).toEqual(['Draft invites', 'Send invites', 'Find open slots'])
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Draft invites', 'Find open slots', 'Send invites'])
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('moves from the open step’s Remove too, without removing the step', async () => {
    const { user } = renderWithSatin(<Plan />)
    await user.click(stepButton('Send invites'))
    screen.getByRole('button', { name: 'Remove Send invites' }).focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites', 'Draft invites'])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Send invites' }))
  })

  it('lifts a step dragged by its number: it follows the pointer, the others make room, and it lands on release', () => {
    renderWithSatin(<Plan />)
    // jsdom lays nothing out: rows 36px high, 40px apart.
    rows().forEach((row, i) => {
      row.getBoundingClientRect = () => ({ top: i * 40, bottom: i * 40 + 36, height: 36, left: 0, right: 300, width: 300, x: 0, y: i * 40, toJSON: () => ({}) }) as DOMRect
    })
    const [first, second, third] = rows()
    fireEvent.pointerDown(first.querySelector('[data-part="number"]')!, { button: 0, clientY: 10 })
    expect(first.hasAttribute('data-dragging')).toBe(true)
    // It leans while it's carried (drag.css), the others don't.
    expect(first.classList.contains('satin-drag')).toBe(true)
    expect(first.getAttribute('data-drag')).toBe('lifted')
    expect(second.hasAttribute('data-drag')).toBe(false)

    // Past the middle of the second row: the first follows the pointer, the second makes room.
    fireEvent.pointerMove(window, { clientY: 55 })
    expect(first.style.transform).toBe('translateY(45px)')
    expect(second.style.transform).toBe('translateY(-36px)')
    expect(third.style.transform).toBe('translateY(0px)')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Draft invites', 'Send invites'])
    // The numbers follow where the steps would land.
    expect(numbers()).toEqual(['2', '1', '3'])

    // Far below the list: it stops at the last row, and lands last.
    fireEvent.pointerMove(window, { clientY: 400 })
    expect(first.style.transform).toBe('translateY(80px)')
    fireEvent.pointerUp(window)
    expect(labelsInOrder()).toEqual(['Draft invites', 'Send invites', 'Find open slots'])
    expect(rows().every((row) => !row.style.transform || row.style.transform === 'none')).toBe(true)
    expect(status().textContent).toBe('Find open slots, position 3 of 3')
    // Let go, it springs into its slot, still lifted, and lands when its own transition ends:
    // one from inside it doesn't count.
    expect(first.getAttribute('data-drag')).toBe('settle')
    expect(first.hasAttribute('data-dragging')).toBe(true)
    fireEvent.transitionEnd(first.querySelector('[data-part="number"]')!)
    expect(first.getAttribute('data-drag')).toBe('settle')
    fireEvent.transitionEnd(first)
    expect(list().querySelector('[data-dragging]')).toBeNull()
    expect(list().querySelector('[data-drag]')).toBeNull()
  })

  it('lands a dropped step after the spring even when no transition ends, and never leans on Alt+arrows', async () => {
    vi.useFakeTimers()
    try {
      renderWithSatin(<Plan />)
      const first = rows()[0]
      fireEvent.pointerDown(first.querySelector('[data-part="number"]')!, { button: 0, clientY: 10 })
      fireEvent.pointerUp(window)
      expect(first.getAttribute('data-drag')).toBe('settle')
      vi.advanceTimersByTime(500)
      expect(first.hasAttribute('data-drag')).toBe(false)
      expect(first.hasAttribute('data-dragging')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
    stepButton('Find open slots').focus()
    fireEvent.keyDown(stepButton('Find open slots'), { key: 'ArrowDown', altKey: true })
    expect(labelsInOrder()).toEqual(['Draft invites', 'Find open slots', 'Send invites'])
    expect(list().querySelector('[data-drag]')).toBeNull()
  })

  /** Lays the rows out as they stand now, `heights` tall, 4px apart (jsdom lays nothing out). */
  const layOut = (heights: number[]) => {
    let top = 0
    rows().forEach((row, i) => {
      const at = top
      const height = heights[i] ?? 36
      top += height + 4
      row.getBoundingClientRect = () => ({ top: at, bottom: at + height, height, left: 0, right: 300, width: 300, x: 0, y: at, toJSON: () => ({}) }) as DOMRect
    })
  }
  /** Drags a step by its number `dy` px and lets go. */
  const dragBy = (label: string, dy: number) => {
    const number = rows()
      .find((row) => labelOf(row) === label)!
      .querySelector('[data-part="number"]')!
    fireEvent.pointerDown(number, { button: 0, clientY: 100 })
    fireEvent.pointerMove(window, { clientY: 100 + dy })
    fireEvent.pointerUp(window)
  }

  it('swaps the middle step with the one above or below once it passes half of it, even as the taller row', () => {
    renderWithSatin(<Plan />)
    // The middle step wraps to a second line: 56px against its neighbours' 36px.
    layOut([36, 56, 36])
    const middle = rows()[1]
    fireEvent.pointerDown(middle.querySelector('[data-part="number"]')!, { button: 0, clientY: 100 })
    // Not yet past the middle of the row above: nothing moves.
    fireEvent.pointerMove(window, { clientY: 80 })
    expect(rows()[0].style.transform).toBe('translateY(0px)')
    expect(numbers()).toEqual(['1', '2', '3'])
    // Its top edge past that middle: the row above slides down under it.
    fireEvent.pointerMove(window, { clientY: 76 })
    expect(rows()[0].style.transform).toBe('translateY(56px)')
    expect(numbers()).toEqual(['2', '1', '3'])
    fireEvent.pointerUp(window)
    expect(labelsInOrder()).toEqual(['Draft invites', 'Find open slots', 'Send invites'])
    expect(status().textContent).toBe('Draft invites, position 1 of 3')

    // Back in the middle, then down past half of the row below.
    layOut([56, 36, 36])
    dragBy('Draft invites', 41)
    layOut([36, 56, 36])
    dragBy('Draft invites', 20)
    expect(labelsInOrder()).toEqual(['Find open slots', 'Draft invites', 'Send invites'])
    dragBy('Draft invites', 24)
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites', 'Draft invites'])
    expect(status().textContent).toBe('Draft invites, position 3 of 3')
  })

  it('moves any step one place up or down by just over half a row, in a longer plan', () => {
    const FIVE: AgentPlanStep[] = ['A', 'B', 'C', 'D', 'E'].map((label) => ({ id: label, label }))
    renderWithSatin(<Plan initial={FIVE} />)
    const order = () => labelsInOrder().join('')
    for (const [label, dy, after] of [
      ['B', -24, 'BACDE'],
      ['B', 24, 'ABCDE'],
      ['C', -24, 'ACBDE'],
      ['C', 24, 'ABCDE'],
      ['D', 24, 'ABCED'],
      ['D', -24, 'ABCDE'],
      ['E', -24, 'ABCED'],
      ['A', 24, 'BACED'],
      // Two rows down, then the full list up.
      ['A', 64, 'BCEAD'],
      ['D', -400, 'DBCEA'],
    ] as const) {
      layOut([36, 36, 36, 36, 36])
      dragBy(label, dy)
      expect(order()).toBe(after)
    }
  })

  it('swaps the number for the grip on hover, keyboard focus or a drag, in the same box', () => {
    renderWithSatin(<Plan initial={[{ id: 'read', label: 'Read the shortlist', editable: false }, ...PLAN]} />)
    const [locked, movable] = rows().map((row) => row.querySelector('[data-part="number"]')!)
    expect(movable.querySelector('svg')).toBeTruthy()
    expect(movable.firstElementChild?.className).toContain('group-hover/step:invisible')
    expect(movable.firstElementChild?.className).toContain('group-has-[:focus-visible]/step:invisible')
    expect(movable.lastElementChild?.className).toContain('absolute')
    // A step that can't move keeps its digit.
    expect(locked.querySelector('svg')).toBeNull()
  })

  it('renames a step from its Rename, and returns focus to the step', async () => {
    const { user } = renderWithSatin(<Plan />)
    await user.click(stepButton('Draft invites'))
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    const field = (await screen.findByRole('textbox', { name: 'Step 2' })) as HTMLInputElement
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    // The old name is selected, so typing replaces it.
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 'Draft invites'.length])
    await user.clear(field)
    await user.type(field, 'Draft invites in Polish{Enter}')
    expect(labelsInOrder()[1]).toBe('Draft invites in Polish')
    expect(document.activeElement).toBe(stepButton('Draft invites in Polish'))
  })

  it('keeps the new name when focus leaves the field, and lets focus go where it went', async () => {
    const { user } = renderWithSatin(<Plan />)
    await user.click(stepButton('Draft invites'))
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    const field = await screen.findByRole('textbox', { name: 'Step 2' })
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    await user.clear(field)
    await user.type(field, 'Draft invites in Polish')
    await user.tab()
    expect(labelsInOrder()[1]).toBe('Draft invites in Polish')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.activeElement).not.toBe(stepButton('Draft invites in Polish'))
  })

  it('keeps the label when the rename is cancelled with Escape or left empty', async () => {
    const { user } = renderWithSatin(<Plan />)
    stepButton('Send invites').focus()
    await user.keyboard('{Enter}') // opens the step
    await user.tab() // Rename
    await user.keyboard('{Enter}')
    const field = await screen.findByRole('textbox', { name: 'Step 3' })
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    await user.type(field, ' now{Escape}')
    expect(labelsInOrder()[2]).toBe('Send invites')
    expect(document.activeElement).toBe(stepButton('Send invites'))
    await user.tab() // Rename, still open
    await user.keyboard('{Enter}')
    const again = await screen.findByRole('textbox', { name: 'Step 3' })
    await vi.waitFor(() => expect(document.activeElement).toBe(again))
    await user.clear(again)
    await user.keyboard('{Enter}')
    expect(labelsInOrder()[2]).toBe('Send invites')
  })

  it('keeps a step the agent locked: no grip, no step button, and it doesn’t move', async () => {
    const { user } = renderWithSatin(<Plan initial={[{ id: 'read', label: 'Read the shortlist', editable: false }, ...PLAN]} />)
    expect(numbers()).toEqual(['1', '2', '3', '4'])
    expect(labelsInOrder()[0]).toBe('Read the shortlist')
    expect(rows()[0].querySelector('[data-part="label"]')?.tagName).toBe('SPAN')
    expect(rows()[0].querySelector('[data-part="number"] svg')).toBeNull()
    expect(screen.queryByRole('button', { name: (name) => name.startsWith('Read the shortlist') })).toBeNull()
    // Its number doesn't drag.
    fireEvent.pointerDown(rows()[0].querySelector('[data-part="number"]')!, { button: 0, clientY: 0 })
    fireEvent.pointerMove(window, { clientY: 200 })
    fireEvent.pointerUp(window)
    expect(list().querySelector('[data-dragging]')).toBeNull()
    expect(labelsInOrder()).toEqual(['Read the shortlist', 'Find open slots', 'Draft invites', 'Send invites'])
    // The step after it still moves past it.
    stepButton('Find open slots').focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Read the shortlist', 'Draft invites', 'Send invites'])
  })

  it('works uncontrolled from defaultSteps', async () => {
    const { user } = renderWithSatin(<AgentPlan defaultSteps={PLAN} />)
    stepButton('Send invites').focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites', 'Draft invites'])
    await user.click(stepButton('Find open slots'))
    await user.click(screen.getByRole('button', { name: 'Remove Find open slots' }))
    expect(labelsInOrder()).toEqual(['Send invites', 'Draft invites'])
  })
})

describe('AgentPlan, running', () => {
  /** A run the test steps through: status and current step from props, like an app's agent. */
  function Run({ status, current, ...props }: { status: AgentPlanStatus; current?: string; onChange?: (steps: AgentPlanStep[]) => void } & Partial<AgentPlanProps>) {
    return <Plan status={status} currentStep={current} {...props} />
  }

  it('ticks steps off, marks the current one, and reads out each step as it finishes', () => {
    const { rerender } = renderWithSatin(<Run status="running" current="slots" />)
    const [first, second, third] = rows()
    expect(first.getAttribute('aria-current')).toBe('step')
    expect(within(first).getByText('In progress')).toBeTruthy()
    expect(first.querySelector('[data-slot="agent-loading"]')?.getAttribute('role')).toBeNull()
    expect(within(second).getByText('Not started')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull()

    rerender(<Run status="running" current="draft" />)
    expect(within(first).getByText('Done')).toBeTruthy()
    expect(second.getAttribute('aria-current')).toBe('step')
    expect(status().textContent).toBe('Find open slots, done')
    // A check that appears once the plan is on screen fades in.
    expect(first.querySelector('svg.satin-agent-plan-check')?.hasAttribute('data-enter')).toBe(true)

    rerender(<Run status="done" />)
    expect(within(third).getByText('Done')).toBeTruthy()
    expect(status().textContent).toBe('3 steps done')
  })

  it('draws a plan that is done already without fading its checks in', () => {
    renderWithSatin(<Run status="done" />)
    const checks = list().querySelectorAll('svg.satin-agent-plan-check')
    expect(checks).toHaveLength(3)
    checks.forEach((check) => expect(check.hasAttribute('data-enter')).toBe(false))
  })

  it('shows a failed step with its error, Retry and Skip', async () => {
    const onRetry = vi.fn()
    const onSkip = vi.fn()
    const onChange = vi.fn()
    const { user } = renderWithSatin(
      <Run status="failed" current="draft" error="The Mail connection expired." onRetry={onRetry} onSkip={onSkip} onChange={onChange} />,
    )
    const failed = rows()[1]
    expect(failed.getAttribute('aria-current')).toBe('step')
    expect(within(failed).getByText('Failed')).toBeTruthy()
    const retry = within(failed).getByRole('button', { name: 'Retry' })
    expect(retry.getAttribute('aria-describedby')).toBe(within(failed).getByText('The Mail connection expired.').id)
    await user.click(retry)
    expect(onRetry.mock.calls[0][0].id).toBe('draft')
    await user.click(within(failed).getByRole('button', { name: 'Skip' }))
    expect(onChange.mock.calls[0][0].find((s: AgentPlanStep) => s.id === 'draft').skipped).toBe(true)
    expect(onSkip.mock.calls[0][0]).toMatchObject({ id: 'draft', skipped: true })
  })

  it('reads out a failure, and moves focus to the list when the focused button goes away', async () => {
    function App() {
      const [state, setState] = React.useState<{ status: AgentPlanStatus; current?: string }>({ status: 'running', current: 'draft' })
      return (
        <>
          <button type="button" onClick={() => setState({ status: 'failed', current: 'draft' })}>
            Fail
          </button>
          <Run status={state.status} current={state.current} error="Expired." onSkip={() => setState({ status: 'running', current: 'send' })} />
        </>
      )
    }
    const { user } = renderWithSatin(<App />)
    await user.click(screen.getByRole('button', { name: 'Fail' }))
    expect(status().textContent).toBe('Draft invites, failed')
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(document.activeElement).toBe(list())
    expect(within(rows()[1]).getByText('Skipped')).toBeTruthy()
    expect(rows()[2].getAttribute('aria-current')).toBe('step')
  })

  it('comes back to a draft with no step open', async () => {
    const { user, rerender } = renderWithSatin(<Plan />)
    await user.click(stepButton('Draft invites'))
    expect(stepButton('Draft invites').getAttribute('aria-expanded')).toBe('true')
    rerender(<Plan status="running" currentStep="slots" />)
    rerender(<Plan status="draft" />)
    expect(stepButton('Draft invites').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull()
  })

  it('drops a rename cut short by the run: back in the draft, no field takes focus', async () => {
    const { user, rerender } = renderWithSatin(<Plan />)
    await user.click(stepButton('Draft invites'))
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    const field = await screen.findByRole('textbox', { name: 'Step 2' })
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    rerender(<Plan status="running" currentStep="slots" />)
    rerender(<Plan status="draft" />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.activeElement?.tagName).not.toBe('INPUT')
  })

  it('turns Run into Stop in place, so focus stays on the button', async () => {
    function App() {
      const [status, setStatus] = React.useState<AgentPlanStatus>('draft')
      return <Plan status={status} currentStep={status === 'running' ? 'slots' : undefined} onRun={() => setStatus('running')} onStop={() => setStatus('draft')} />
    }
    const { user } = renderWithSatin(<App />)
    await user.click(screen.getByRole('button', { name: 'Run plan' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Stop' }))
  })

  it('draws a finished step the way Thinking draws one', () => {
    const { container } = render(<Thinking state="expanded" steps={[{ label: 'Find open slots', meta: 'Calendar · Tue–Thu, 45 min' }]} />)
    const thinkingRow = within(container).getByText('Find open slots').parentElement!
    renderWithSatin(<Run status="done" />)
    const planRow = within(rows()[0]).getByText('Find open slots').parentElement!
    expect(planRow.className).toBe(thinkingRow.className)
    const shape = (row: Element) => [...row.children].filter((el) => !el.classList.contains('sr-only')).map((el) => [el.tagName, [...el.classList].filter((c) => c !== 'satin-agent-plan-check').sort().join(' ')])
    expect(shape(planRow)).toEqual(shape(thinkingRow))
    expect(planRow.querySelector('path')?.getAttribute('d')).toBe(thinkingRow.querySelector('path')?.getAttribute('d'))
    // The rail and the list beside it, as in Thinking's open body.
    const rail = (root: Element) => root.querySelector('ol')!.previousElementSibling!.innerHTML
    expect(rail(list().parentElement!)).toBe(rail(container))
  })
})

describe('AgentPlan, words and accessibility', () => {
  it('says its words through SatinLabels', async () => {
    const { user } = renderWithSatin(<Plan onRun={() => {}} />, {
      labels: {
        agentPlan: 'Plan działania',
        runPlan: 'Uruchom plan',
        renameStep: 'Zmień nazwę',
        removeItem: (name) => `Usuń ${name}`,
        stepRemoved: (step) => `Usunięto: ${step}`,
        positionOf: (item, position, count) => `${item}, miejsce ${position} z ${count}`,
      },
    })
    expect(screen.getByRole('list', { name: 'Plan działania' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Uruchom plan' })).toBeTruthy()
    screen.getByRole('button', { name: (name) => name.startsWith('Find open slots') }).focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(screen.getByRole('status').textContent).toBe('Find open slots, miejsce 2 z 3')
    await user.click(screen.getByRole('button', { name: (name) => name.startsWith('Draft invites') }))
    expect(screen.getByRole('button', { name: 'Zmień nazwę' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Usuń Draft invites' }))
    expect(screen.getByRole('status').textContent).toBe('Usunięto: Draft invites')
  })

  it('names itself after the title, "Plan" without one, or the label it is given', () => {
    const { unmount } = renderWithSatin(<AgentPlan defaultSteps={PLAN} />)
    expect(screen.getByRole('group', { name: 'Plan' })).toBeTruthy()
    unmount()
    renderWithSatin(
      <AgentPlanRoot defaultSteps={PLAN} aria-label="Interview plan">
        <AgentPlanSteps />
      </AgentPlanRoot>,
    )
    expect(screen.getByRole('group', { name: 'Interview plan' })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations as a draft, with a step open, running and failed, in %s', async (theme) => {
    const { user, rerender } = renderWithSatin(<Plan initial={WITH_LOGO} onRun={() => {}} />, { theme })
    await expectNoAxeViolations()
    await user.click(stepButton('Find open slots'))
    await expectNoAxeViolations()
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    await screen.findByRole('textbox', { name: 'Step 1' })
    await expectNoAxeViolations()
    rerender(<Plan status="running" currentStep="draft" onStop={() => {}} />)
    await expectNoAxeViolations()
    rerender(<Plan status="failed" currentStep="draft" error="Expired." onRetry={() => {}} onSkip={() => {}} onStop={() => {}} />)
    await expectNoAxeViolations()
    rerender(<Plan status="done" />)
    await expectNoAxeViolations()
  })
})
