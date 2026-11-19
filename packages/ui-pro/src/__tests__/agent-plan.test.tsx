import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
const labelsInOrder = () => rows().map((row) => row.querySelector('label')?.textContent)
const status = () => screen.getByRole('status')

describe('AgentPlan, draft', () => {
  it('renders the steps as an ordered list in a group named by the title', () => {
    renderWithSatin(<Plan />)
    expect(screen.getByRole('group', { name: TITLE })).toBeTruthy()
    expect(list().tagName).toBe('OL')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Draft invites', 'Send invites'])
    expect(screen.getByText('3 steps')).toBeTruthy()
    expect(screen.getByText('Calendar')).toBeTruthy()
  })

  it('leaves a step out with its checkbox, and runs the steps left in, in order', async () => {
    const onRun = vi.fn()
    const { user } = renderWithSatin(<Plan onRun={onRun} />)
    await user.click(screen.getByRole('checkbox', { name: 'Draft invites' }))
    expect(screen.getByText('2 of 3 steps')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Run plan' }))
    expect(onRun.mock.calls[0][0].map((s: AgentPlanStep) => s.id)).toEqual(['slots', 'send'])
  })

  it('disables Run while the plan is empty', async () => {
    const { user, unmount } = renderWithSatin(<Plan initial={[]} onRun={() => {}} />)
    expect((screen.getByRole('button', { name: 'Run plan' }) as HTMLButtonElement).disabled).toBe(true)
    unmount()
    renderWithSatin(<Plan initial={PLAN.slice(0, 1)} onRun={() => {}} />)
    const run = screen.getByRole('button', { name: 'Run plan' }) as HTMLButtonElement
    expect(run.disabled).toBe(false)
    await user.click(screen.getByRole('checkbox', { name: 'Find open slots' }))
    expect(run.disabled).toBe(true)
  })

  it('moves a step with Alt+↓ and Alt+↑, keeps focus on it, and reads out its new place', async () => {
    const onChange = vi.fn()
    const { user } = renderWithSatin(<Plan onChange={onChange} />)
    const box = screen.getByRole('checkbox', { name: 'Find open slots' })
    expect(box.getAttribute('aria-description')).toBe('Alt and arrow keys to move')
    box.focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(labelsInOrder()).toEqual(['Draft invites', 'Find open slots', 'Send invites'])
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Find open slots' }))
    expect(status().textContent).toBe('Find open slots, position 2 of 3')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}') // already last: stays
    expect(labelsInOrder()).toEqual(['Draft invites', 'Send invites', 'Find open slots'])
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Draft invites', 'Find open slots', 'Send invites'])
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('moves from the ⋯ button without opening its menu', async () => {
    const { user } = renderWithSatin(<Plan />)
    screen.getByRole('button', { name: 'Options for Send invites' }).focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites', 'Draft invites'])
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Options for Send invites' }))
  })

  it('moves and renames from the ⋯ menu', async () => {
    const { user } = renderWithSatin(<Plan />)
    await user.click(screen.getByRole('button', { name: 'Options for Find open slots' }))
    expect((screen.getByRole('menuitem', { name: 'Move up' }) as HTMLElement).getAttribute('aria-disabled')).toBe('true')
    await user.click(screen.getByRole('menuitem', { name: 'Move down' }))
    expect(labelsInOrder()).toEqual(['Draft invites', 'Find open slots', 'Send invites'])

    await user.click(screen.getByRole('button', { name: 'Options for Draft invites' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const field = await screen.findByRole('textbox', { name: 'Step 1' })
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    await user.clear(field)
    await user.type(field, 'Draft invites in Polish{Enter}')
    expect(labelsInOrder()[0]).toBe('Draft invites in Polish')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Options for Draft invites in Polish' }))
  })

  it('keeps the label when the rename is cancelled with Escape or left empty', async () => {
    const { user } = renderWithSatin(<Plan />)
    await user.click(screen.getByRole('button', { name: 'Options for Send invites' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const field = await screen.findByRole('textbox', { name: 'Step 3' })
    await vi.waitFor(() => expect(document.activeElement).toBe(field))
    await user.type(field, ' now{Escape}')
    expect(labelsInOrder()[2]).toBe('Send invites')
    await user.click(screen.getByRole('button', { name: 'Options for Send invites' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const again = await screen.findByRole('textbox', { name: 'Step 3' })
    await vi.waitFor(() => expect(document.activeElement).toBe(again))
    await user.clear(again)
    await user.keyboard('{Enter}')
    expect(labelsInOrder()[2]).toBe('Send invites')
  })

  it('keeps a step the agent locked: no menu, a checked box that can’t be cleared', () => {
    renderWithSatin(<Plan initial={[{ id: 'read', label: 'Read the shortlist', editable: false }, ...PLAN]} />)
    const box = screen.getByRole('checkbox', { name: 'Read the shortlist' }) as HTMLButtonElement
    expect(box.disabled).toBe(true)
    expect(box.getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByRole('button', { name: 'Options for Read the shortlist' })).toBeNull()
  })

  it('works uncontrolled from defaultSteps', async () => {
    const { user } = renderWithSatin(<AgentPlan defaultSteps={PLAN} />)
    screen.getByRole('checkbox', { name: 'Send invites' }).focus()
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(labelsInOrder()).toEqual(['Find open slots', 'Send invites', 'Draft invites'])
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
    expect(screen.getByText('Step 1 of 3')).toBeTruthy()
    expect(screen.queryByRole('checkbox')).toBeNull()

    rerender(<Run status="running" current="draft" />)
    expect(within(first).getByText('Done')).toBeTruthy()
    expect(second.getAttribute('aria-current')).toBe('step')
    expect(status().textContent).toBe('Find open slots, done')
    // A check that appears once the plan is on screen fades in.
    expect(first.querySelector('svg.satin-agent-plan-check')?.hasAttribute('data-enter')).toBe(true)

    rerender(<Run status="done" />)
    expect(within(third).getByText('Done')).toBeTruthy()
    expect(status().textContent).toBe('3 steps done')
    expect(screen.getByText('3 steps done', { selector: 'p' })).toBeTruthy()
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
        stepOptions: (step) => `Opcje: ${step}`,
        moveStepDown: 'Przesuń w dół',
        planStepCount: (count, total) => `${count} z ${total} kroków`,
        positionOf: (item, position, count) => `${item}, miejsce ${position} z ${count}`,
      },
    })
    expect(screen.getByRole('list', { name: 'Plan działania' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Uruchom plan' })).toBeTruthy()
    expect(screen.getByText('3 z 3 kroków')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Opcje: Find open slots' }))
    await user.click(screen.getByRole('menuitem', { name: 'Przesuń w dół' }))
    expect(screen.getByRole('status').textContent).toBe('Find open slots, miejsce 2 z 3')
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
