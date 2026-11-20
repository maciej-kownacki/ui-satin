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
const labelsInOrder = () => rows().map((row) => row.querySelector('[data-part="label"]')?.textContent)
const numbers = () => rows().map((row) => row.querySelector('[data-part="number"]')?.textContent)
const status = () => screen.getByRole('status')
const logo = <img data-testid="calendar-logo" src="google-calendar.png" alt="" />

describe('AgentPlan, draft', () => {
  it('renders numbered steps as an ordered list in a group named by the title, with no step count', () => {
    renderWithSatin(<Plan />)
    expect(screen.getByRole('group', { name: TITLE })).toBeTruthy()
    expect(list().tagName).toBe('OL')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Draft invites', 'Send invites'])
    // The number is drawn, not read: the ordered list already gives the position.
    expect(numbers()).toEqual(['1', '2', '3'])
    expect(rows()[0].querySelector('[data-part="number"]')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByText('3 steps')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('shows the tool as a plain Badge with its logo, and the logo again once the plan runs', () => {
    const steps = [{ ...PLAN[0], toolIcon: logo }, ...PLAN.slice(1)]
    const { rerender } = renderWithSatin(<Plan initial={steps} />)
    const badge = screen.getByText('Calendar').closest('[data-slot="badge"]')!
    expect(badge.className).toContain('bg-transparent')
    // A logo img is sized by the badge (16px), and hidden: the name beside it says the same.
    expect(badge.className).toContain('[&_img]:size-4')
    expect(within(badge as HTMLElement).getByTestId('calendar-logo').parentElement?.getAttribute('aria-hidden')).toBe('true')
    rerender(<Plan initial={steps} status="done" />)
    expect(within(rows()[0]).getByTestId('calendar-logo')).toBeTruthy()
  })

  it('removes a step with its ×, renumbers the rest, reads it out, and moves focus to the next ×', async () => {
    const onRun = vi.fn()
    const { user } = renderWithSatin(<Plan onRun={onRun} />)
    await user.click(screen.getByRole('button', { name: 'Remove Draft invites' }))
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites'])
    expect(numbers()).toEqual(['1', '2'])
    expect(status().textContent).toBe('Draft invites removed')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Send invites' }))
    // The last step goes: focus moves to the × before it.
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Find open slots' }))
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
    await user.click(screen.getByRole('button', { name: 'Remove Find open slots' }))
    expect(run.disabled).toBe(true)
    expect(document.activeElement).toBe(list())
  })

  it('moves a step with Alt+↓ and Alt+↑, keeps focus on it, and reads out its new place', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Plan onChange={onChange} />)
    const label = screen.getByRole('button', { name: 'Find open slots' })
    expect(label.getAttribute('aria-description')).toBe('Press to rename. Alt and arrow keys to move')
    label.focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(labelsInOrder()).toEqual(['Draft invites', 'Find open slots', 'Send invites'])
    expect(numbers()).toEqual(['1', '2', '3'])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Find open slots' }))
    expect(status().textContent).toBe('Find open slots, position 2 of 3')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}') // already last: stays
    expect(labelsInOrder()).toEqual(['Draft invites', 'Send invites', 'Find open slots'])
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Draft invites', 'Find open slots', 'Send invites'])
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('moves from the × too, without removing the step', async () => {
    const { user } = renderWithSatin(<Plan />)
    screen.getByRole('button', { name: 'Remove Send invites' }).focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites', 'Draft invites'])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Send invites' }))
  })

  it('moves a step dragged down by its number, and ends the drag even though its row moved', () => {
    renderWithSatin(<Plan />)
    fireEvent.pointerDown(rows()[0].querySelector('[data-part="number"]')!, { button: 0 })
    expect(rows()[0].hasAttribute('data-dragging')).toBe(true)
    // jsdom lays nothing out: every row's middle is at 0, so any point below it is past them all.
    fireEvent.pointerMove(window, { clientY: 10 })
    expect(labelsInOrder()).toEqual(['Draft invites', 'Send invites', 'Find open slots'])
    fireEvent.pointerUp(window)
    expect(list().querySelector('[data-dragging]')).toBeNull()
    expect(status().textContent).toBe('Find open slots, position 3 of 3')
  })

  it('renames a step by pressing its label, and returns focus to it', async () => {
    const { user } = renderWithSatin(<Plan />)
    await user.click(screen.getByRole('button', { name: 'Draft invites' }))
    const field = await screen.findByRole('textbox', { name: 'Step 2' })
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    await user.clear(field)
    await user.type(field, 'Draft invites in Polish{Enter}')
    expect(labelsInOrder()[1]).toBe('Draft invites in Polish')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Draft invites in Polish' }))
  })

  it('keeps the label when the rename is cancelled with Escape or left empty', async () => {
    const { user } = renderWithSatin(<Plan />)
    screen.getByRole('button', { name: 'Send invites' }).focus()
    await user.keyboard('{Enter}')
    const field = await screen.findByRole('textbox', { name: 'Step 3' })
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    await user.type(field, ' now{Escape}')
    expect(labelsInOrder()[2]).toBe('Send invites')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Send invites' }))
    await user.keyboard('{Enter}')
    const again = await screen.findByRole('textbox', { name: 'Step 3' })
    await vi.waitFor(() => expect(document.activeElement).toBe(again))
    await user.clear(again)
    await user.keyboard('{Enter}')
    expect(labelsInOrder()[2]).toBe('Send invites')
  })

  it('keeps a step the agent locked: no ×, no rename, and it doesn’t move', async () => {
    const { user } = renderWithSatin(<Plan initial={[{ id: 'read', label: 'Read the shortlist', editable: false }, ...PLAN]} />)
    expect(numbers()).toEqual(['1', '2', '3', '4'])
    expect(screen.queryByRole('button', { name: 'Remove Read the shortlist' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Read the shortlist' })).toBeNull()
    // The step after it still moves past it.
    screen.getByRole('button', { name: 'Find open slots' }).focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Read the shortlist', 'Draft invites', 'Send invites'])
  })

  it('works uncontrolled from defaultSteps', async () => {
    const { user } = renderWithSatin(<AgentPlan defaultSteps={PLAN} />)
    screen.getByRole('button', { name: 'Send invites' }).focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites', 'Draft invites'])
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
        stepHint: 'Naciśnij, by zmienić nazwę',
        removeItem: (name) => `Usuń ${name}`,
        stepRemoved: (step) => `Usunięto: ${step}`,
        positionOf: (item, position, count) => `${item}, miejsce ${position} z ${count}`,
      },
    })
    expect(screen.getByRole('list', { name: 'Plan działania' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Uruchom plan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Find open slots' }).getAttribute('aria-description')).toBe('Naciśnij, by zmienić nazwę')
    screen.getByRole('button', { name: 'Find open slots' }).focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(screen.getByRole('status').textContent).toBe('Find open slots, miejsce 2 z 3')
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

  it.each(['light', 'dark'] as const)('has no axe violations as a draft, running and failed, in %s', async (theme) => {
    const { rerender } = renderWithSatin(<Plan onRun={() => {}} />, { theme })
    await expectNoAxeViolations()
    rerender(<Plan status="running" currentStep="draft" onStop={() => {}} />)
    await expectNoAxeViolations()
    rerender(<Plan status="failed" currentStep="draft" error="Expired." onRetry={() => {}} onSkip={() => {}} onStop={() => {}} />)
    await expectNoAxeViolations()
    rerender(<Plan status="done" />)
    await expectNoAxeViolations()
  })
})

describe('AgentPlan, layouts', () => {
  const STEPS: AgentPlanStep[] = [{ ...PLAN[0], toolIcon: logo }, ...PLAN.slice(1)]

  it('hover: tool and detail in one muted line under the label, and an × shown on hover or focus', async () => {
    const { user } = renderWithSatin(<Plan initial={STEPS} layout="hover" />)
    expect(screen.getByText('Calendar · Tue–Thu, 45 min', { exact: false }).closest('[data-slot="badge"]')).toBeNull()
    expect(within(rows()[0]).getByTestId('calendar-logo')).toBeTruthy()
    const remove = screen.getByRole('button', { name: 'Remove Draft invites' })
    expect(remove.className).toContain('group-focus-within/step:opacity-100')
    expect(remove.className).toContain('[@media(hover:none)]:opacity-100')
    await user.click(remove)
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites'])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Send invites' }))
  })

  it('select: nothing on the right; the step opens Rename and Remove under it, and Esc closes them', async () => {
    const { user } = renderWithSatin(<Plan layout="select" />)
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull()
    const step = screen.getByRole('button', { name: /^Draft invites/ })
    expect(step.getAttribute('aria-expanded')).toBe('false')
    expect(step.getAttribute('aria-description')).toBe('Alt and arrow keys to move')
    await user.click(step)
    expect(step.getAttribute('aria-expanded')).toBe('true')
    const actions = document.getElementById(step.getAttribute('aria-controls')!)!
    expect(within(actions).getAllByRole('button').map((b) => b.textContent)).toEqual(['Rename', 'Remove'])

    await user.click(within(actions).getByRole('button', { name: 'Rename' }))
    const field = await screen.findByRole('textbox', { name: 'Step 2' })
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    await user.clear(field)
    await user.type(field, 'Draft the invites{Enter}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Draft the invites/ }))

    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: /^Draft the invites/ }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Rename' })).toBeNull()

    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Remove Draft the invites' }))
    // The step button holds the label and the tool's line; the label comes first.
    expect(rows().map((row) => row.querySelector('[data-part="label"]')?.firstChild?.textContent)).toEqual(['Find open slots', 'Send invites'])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Send invites/ }))
    expect(status().textContent).toBe('Draft the invites removed')
  })

  it('edit: no step controls until Edit plan; then a checkbox and a field per step, and Done', async () => {
    const onRun = vi.fn()
    const { user } = renderWithSatin(<Plan layout="edit" onRun={onRun} />)
    expect(within(list()).queryAllByRole('button')).toHaveLength(0)
    expect(within(list()).queryAllByRole('checkbox')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Edit plan' }))
    expect(screen.queryByRole('button', { name: 'Edit plan' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Run plan' })).toBeNull()
    // Focus goes to the first step, not the page.
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Find open slots' }))

    await user.click(screen.getByRole('checkbox', { name: 'Draft invites' }))
    const field = screen.getByRole('textbox', { name: 'Step 3' })
    await user.clear(field)
    await user.type(field, 'Send the invites{Enter}')
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}') // in a field: doesn't move
    screen.getByRole('checkbox', { name: 'Find open slots' }).focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

    const done = screen.getByRole('button', { name: 'Done' })
    await user.click(done)
    // The same button: focus stays on it as it turns back into Run plan.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Run plan' }))
    expect(rows().map((row) => row.querySelector('[data-part="label"]')?.textContent)).toEqual(['Draft invites', 'Find open slots', 'Send the invites'])
    await user.click(screen.getByRole('button', { name: 'Run plan' }))
    expect(onRun.mock.calls[0][0].map((s: AgentPlanStep) => s.id)).toEqual(['slots', 'send'])
  })

  it.each(['light', 'dark'] as const)('has no axe violations in any layout, in %s', async (theme) => {
    const { user, rerender } = renderWithSatin(<Plan initial={STEPS} layout="hover" onRun={() => {}} />, { theme })
    await expectNoAxeViolations()
    rerender(<Plan initial={STEPS} layout="select" onRun={() => {}} />)
    await user.click(screen.getByRole('button', { name: /^Find open slots/ }))
    await expectNoAxeViolations()
    rerender(<Plan initial={STEPS} layout="edit" onRun={() => {}} />)
    await expectNoAxeViolations()
    await user.click(screen.getByRole('button', { name: 'Edit plan' }))
    await expectNoAxeViolations()
  })
})
