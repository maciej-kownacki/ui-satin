import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Toaster, toast } from '@uisatin/ui/toast'
import { AgentActionLog, AgentActionLogAction, AgentActionLogRoot, AgentActionLogRun, type AgentRun } from '../components/agent-undo-log'

/** The docs scenario: three candidates moved and one email sent, and an older run. */
const runs: AgentRun[] = [
  {
    id: 'screening',
    label: 'Screened applicants',
    at: '2026-11-19T10:42:00',
    actions: [
      { id: 'ana', label: 'Moved Ana Silva to Interview', changes: [{ field: 'Stage', from: 'Screening', to: 'Interview' }] },
      { id: 'tom', label: 'Moved Tom Becker to Interview' },
      { id: 'lee', label: 'Moved Lee Wong to Rejected' },
      { id: 'email', label: 'Sent an email to Lee Wong', revertible: false, reason: "Emails can't be unsent." },
    ],
  },
  {
    id: 'tagging',
    label: 'Tagged applicants',
    at: '2026-11-19T09:15:00',
    actions: [{ id: 'tag', label: 'Tagged 8 applicants' }],
  },
]

/** A promise the test settles by hand, to see the row while it waits. */
function deferred() {
  let resolve!: () => void
  let reject!: (e: unknown) => void
  const promise = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)))
  return { promise, resolve, reject }
}

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))
// By what it says in the log (the toast may say it too).
const inLog = (text: string, slot: string) =>
  screen.getAllByText(text).map((el) => el.closest(`[data-slot="${slot}"]`)).find(Boolean) as HTMLElement
const row = (name: string) => inLog(name, 'agent-action-log-action')
const runOf = (name: string) => inLog(name, 'agent-action-log-run')
/** A run's header, named by its label, count and time. */
const header = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const status = () => screen.getAllByRole('status', { hidden: true }).find((el) => el.closest('[data-slot="agent-action-log"]'))!

const setPlatform = (platform: string) => Object.defineProperty(window.navigator, 'platform', { value: platform, configurable: true })

beforeEach(() => setPlatform('MacIntel'))
afterEach(async () => {
  act(() => toast.dismiss())
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
})

describe('AgentActionLog', () => {
  it('lists the runs, the newest open, with a Revert named after each action', () => {
    renderWithSatin(<AgentActionLog runs={runs} onRevert={() => {}} />)
    expect(screen.getByRole('region', { name: 'Agent actions' })).toBeTruthy()
    expect(header('Screened applicants').getAttribute('aria-expanded')).toBe('true')
    expect(header('Tagged applicants').getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('button', { name: 'Revert Moved Ana Silva to Interview' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Revert Moved Lee Wong to Rejected' })).toBeTruthy()
    // A closed run's actions are out of reach.
    expect(screen.getByRole('button', { name: 'Revert Tagged 8 applicants' }).closest('[inert]')).not.toBeNull()
    expect(within(runOf('Screened applicants')).getByText('4 actions')).toBeTruthy()
  })

  it('names a coding action by its verb and target, with its +added −removed', async () => {
    const code: AgentRun[] = [
      {
        id: 'rate',
        label: 'Add rate limiting',
        at: '2026-11-19T10:42:00',
        actions: [
          { id: 'route', label: 'Edited', target: 'src/routes/auth.ts', added: 6, removed: 2 },
          { id: 'push', label: 'Pushed', target: 'feat/rate-limit', revertible: false, reason: 'Pushed commits stay on the remote.' },
        ],
      },
    ]
    const onRevert = vi.fn(async () => {
      throw new Error('src/routes/auth.ts changed after this edit')
    })
    const { user } = renderWithSatin(<AgentActionLog runs={code} onRevert={onRevert} />)
    const route = row('src/routes/auth.ts')
    expect(route.querySelector('[data-slot="agent-action-log-diff"]')!.textContent).toBe('+6−2')
    // The run's header sums them.
    expect(within(header('Add rate limiting')).getByText('+6')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Revert Edited src/routes/auth.ts' }))
    await flush()
    expect(within(route).getByText("Couldn't revert: src/routes/auth.ts changed after this edit")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again to revert Edited src/routes/auth.ts' })).toBeTruthy()
    expect(within(row('feat/rate-limit')).queryByRole('button')).toBeNull()
  })

  it('says why an action can’t be reverted, in place of its button', () => {
    renderWithSatin(<AgentActionLog runs={runs} onRevert={() => {}} />)
    expect(within(row('Sent an email to Lee Wong')).queryByRole('button')).toBeNull()
    const reason = row('Sent an email to Lee Wong').querySelector('[data-slot="agent-action-log-reason"]')!
    expect(reason.textContent).toBe("Can't be reverted: Emails can't be unsent.")
  })

  it('reverts one action: a Spinner while it runs, then struck through, and a toast with Undo', async () => {
    const pending = deferred()
    const onRevert = vi.fn(() => pending.promise)
    const onRestore = vi.fn()
    const { user } = renderWithSatin(
      <>
        <AgentActionLog runs={runs} onRevert={onRevert} onRestore={onRestore} />
        <Toaster />
      </>,
    )
    const button = screen.getByRole('button', { name: 'Revert Moved Ana Silva to Interview' })
    await user.click(button)
    expect(onRevert).toHaveBeenCalledWith(runs[0].actions[0], runs[0])
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(row('Moved Ana Silva to Interview').getAttribute('data-state')).toBe('reverting')

    await act(async () => pending.resolve())
    expect(row('Moved Ana Silva to Interview').getAttribute('data-state')).toBe('reverted')
    // The same button, still focused, now puts it back.
    expect(button.getAttribute('aria-label')).toBe('Restore Moved Ana Silva to Interview')
    expect(document.activeElement).toBe(button)
    expect(within(runOf('Screened applicants')).getByText('1 of 4 reverted')).toBeTruthy()

    const toastEl = await screen.findByText('Action reverted')
    const card = toastEl.closest('[data-slot="toast"]') as HTMLElement
    expect(within(card).getByText('Moved Ana Silva to Interview')).toBeTruthy()
    await user.click(within(card).getByRole('button', { name: 'Undo' }))
    expect(onRestore).toHaveBeenCalledWith([runs[0].actions[0]], runs[0])
    await flush()
    expect(row('Moved Ana Silva to Interview').getAttribute('data-state')).toBe('done')
    expect(status().textContent).toBe('Restored Moved Ana Silva to Interview')
  })

  it('without onRestore, a reverted action just says Reverted and its toast has no Undo', async () => {
    const { user } = renderWithSatin(
      <>
        <AgentActionLog runs={runs} onRevert={() => {}} />
        <Toaster />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Revert Moved Tom Becker to Interview' }))
    await flush()
    const button = screen.getByRole('button', { name: 'Reverted: Moved Tom Becker to Interview' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    const card = (await screen.findByText('Action reverted')).closest('[data-slot="toast"]') as HTMLElement
    expect(within(card).queryByRole('button', { name: 'Undo' })).toBeNull()
  })

  it('marks a failed revert, reads it out, and tries again', async () => {
    let fail = true
    const onRevert = vi.fn(async () => {
      if (fail) throw new Error('offline')
    })
    const { user } = renderWithSatin(<AgentActionLog runs={runs} onRevert={onRevert} />)
    await user.click(screen.getByRole('button', { name: 'Revert Moved Lee Wong to Rejected' }))
    await flush()
    expect(row('Moved Lee Wong to Rejected').getAttribute('data-state')).toBe('failed')
    // The Error's message says why.
    expect(within(row('Moved Lee Wong to Rejected')).getByText("Couldn't revert: offline")).toBeTruthy()
    expect(status().textContent).toBe("Couldn't revert Moved Lee Wong to Rejected")
    expect(within(runOf('Screened applicants')).getByText("1 couldn't be reverted")).toBeTruthy()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again to revert Moved Lee Wong to Rejected' }))
    await flush()
    expect(row('Moved Lee Wong to Rejected').getAttribute('data-state')).toBe('reverted')
    expect(onRevert).toHaveBeenCalledTimes(2)
  })

  it('reverts what is left of a run, newest first, and leaves what can’t be reverted', async () => {
    const order: string[] = []
    const { user } = renderWithSatin(<AgentActionLog runs={runs} defaultReverted={['tom']} onRevert={(a) => void order.push(a.id)} onRestore={() => {}} />)
    expect(within(runOf('Screened applicants')).getByText('1 of 4 reverted')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Revert run: Screened applicants' }))
    await flush()
    expect(order).toEqual(['lee', 'ana'])
    expect(within(runOf('Screened applicants')).getByText('3 of 4 reverted')).toBeTruthy()
    // Nothing left: the same button now restores the run.
    expect(screen.getByRole('button', { name: 'Restore run: Screened applicants' })).toBeTruthy()
    expect(row('Sent an email to Lee Wong').getAttribute('data-state')).toBe('done')
  })

  it('reverts a run in one request with onRevertRun', async () => {
    const onRevert = vi.fn()
    const onRevertRun = vi.fn()
    const { user } = renderWithSatin(<AgentActionLog runs={runs} onRevert={onRevert} onRevertRun={onRevertRun} />)
    await user.click(screen.getByRole('button', { name: 'Revert run: Screened applicants' }))
    await flush()
    expect(onRevert).not.toHaveBeenCalled()
    expect(onRevertRun).toHaveBeenCalledWith(runs[0], [runs[0].actions[2], runs[0].actions[1], runs[0].actions[0]])
    expect(runOf('Screened applicants').getAttribute('data-state')).toBe('partial')
  })

  it('⌘Z reverts the newest run, then the one before; not while typing', async () => {
    const reverted: string[] = []
    const { user } = renderWithSatin(
      <>
        <input aria-label="Note" />
        <AgentActionLog runs={[...runs].reverse()} defaultExpanded={[]} onRevert={(a) => void reverted.push(a.id)} />
      </>,
    )
    // The run it would revert shows the keys and names them.
    expect(screen.getByRole('button', { name: 'Revert run: Screened applicants' }).getAttribute('aria-keyshortcuts')).toBe('Meta+Z')

    screen.getByRole('textbox', { name: 'Note' }).focus()
    await user.keyboard('{Meta>}z{/Meta}')
    expect(reverted).toEqual([])

    act(() => (document.activeElement as HTMLElement).blur())
    await user.keyboard('{Meta>}z{/Meta}')
    await flush()
    expect(reverted).toEqual(['lee', 'tom', 'ana'])
    // It opens the run, so what changed is in view.
    expect(header('Screened applicants').getAttribute('aria-expanded')).toBe('true')

    await user.keyboard('{Meta>}z{/Meta}')
    await flush()
    expect(reverted).toEqual(['lee', 'tom', 'ana', 'tag'])
  })

  it('takes Ctrl+Z off Apple, and only inside the log with shortcut="log"', async () => {
    setPlatform('Win32')
    const onRevert = vi.fn()
    const { user } = renderWithSatin(
      <>
        <button type="button">Elsewhere</button>
        <AgentActionLog runs={runs} onRevert={onRevert} shortcut="log" />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Revert run: Screened applicants' }).getAttribute('aria-keyshortcuts')).toBe('Control+Z')
    screen.getByRole('button', { name: 'Elsewhere' }).focus()
    await user.keyboard('{Control>}z{/Control}')
    expect(onRevert).not.toHaveBeenCalled()
    header('Tagged applicants').focus()
    await user.keyboard('{Meta>}z{/Meta}')
    expect(onRevert).not.toHaveBeenCalled()
    await user.keyboard('{Control>}z{/Control}')
    await flush()
    expect(onRevert).toHaveBeenCalledTimes(3)
  })

  it('opens and closes a run with Enter and Space, and reports it', async () => {
    const onExpandedChange = vi.fn()
    const { user } = renderWithSatin(<AgentActionLog runs={runs} onRevert={() => {}} onExpandedChange={onExpandedChange} />)
    const tagging = header('Tagged applicants')
    tagging.focus()
    await user.keyboard('{Enter}')
    expect(tagging.getAttribute('aria-expanded')).toBe('true')
    expect(onExpandedChange).toHaveBeenLastCalledWith(['screening', 'tagging'])
    await user.keyboard(' ')
    expect(tagging.getAttribute('aria-expanded')).toBe('false')
    // Tab goes from the header to its run's button.
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Revert run: Tagged applicants' }))
  })

  it('follows a controlled reverted list', async () => {
    function Controlled() {
      const [reverted, setReverted] = React.useState<string[]>(['ana'])
      return (
        <>
          <output>{reverted.join(',')}</output>
          <AgentActionLog runs={runs} reverted={reverted} onRevertedChange={setReverted} onRevert={() => {}} />
        </>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    expect(row('Moved Ana Silva to Interview').getAttribute('data-state')).toBe('reverted')
    await user.click(screen.getByRole('button', { name: 'Revert Moved Tom Becker to Interview' }))
    await flush()
    expect(screen.getByText('ana,tom')).toBeTruthy()
    expect(row('Moved Tom Becker to Interview').getAttribute('data-state')).toBe('reverted')
  })

  it('composes from parts, with a row whose state the app sets', () => {
    const ref = React.createRef<HTMLElement>()
    renderWithSatin(
      <AgentActionLogRoot ref={ref} runs={runs} onRevert={() => {}} aria-label="Recruiting agent">
        <AgentActionLogRun run={runs[0]}>
          <AgentActionLogAction action={runs[0].actions[0]} state="failed" />
        </AgentActionLogRun>
      </AgentActionLogRoot>,
    )
    expect(ref.current?.getAttribute('data-slot')).toBe('agent-action-log')
    expect(screen.getByRole('region', { name: 'Recruiting agent' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again to revert Moved Ana Silva to Interview' })).toBeTruthy()
  })

  it('speaks the app’s language', async () => {
    const { user } = renderWithSatin(
      <>
        <AgentActionLog runs={runs} onRevert={() => {}} onRestore={() => {}} />
        <Toaster />
      </>,
      {
        labels: {
          actionLog: 'Działania agenta',
          actionLogRevert: 'Cofnij',
          actionLogRevertAction: (a) => `Cofnij: ${a}`,
          actionLogRevertRunNamed: (r) => `Cofnij przebieg: ${r}`,
          actionLogActionCount: (n) => `${n} działania`,
          actionLogCantRevert: 'Nie da się cofnąć',
          actionLogToastReverted: () => 'Cofnięto działanie',
          undo: 'Przywróć',
          dateLocale: 'pl-PL',
        },
      },
    )
    expect(screen.getByRole('region', { name: 'Działania agenta' })).toBeTruthy()
    expect(within(runOf('Screened applicants')).getByText('4 działania')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cofnij przebieg: Screened applicants' })).toBeTruthy()
    expect(row('Sent an email to Lee Wong').querySelector('[data-slot="agent-action-log-reason"]')!.textContent).toBe("Nie da się cofnąć: Emails can't be unsent.")
    await user.click(screen.getByRole('button', { name: 'Cofnij: Moved Ana Silva to Interview' }))
    const card = (await screen.findByText('Cofnięto działanie')).closest('[data-slot="toast"]') as HTMLElement
    expect(within(card).getByRole('button', { name: 'Przywróć' })).toBeTruthy()
    // Times in the labels' locale: 24-hour in Polish.
    expect(within(runOf('Screened applicants')).getByText(/10:42/).textContent).not.toMatch(/AM|PM/)
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, in every state', async (theme) => {
    const { user } = renderWithSatin(
      <>
        <AgentActionLog
          runs={runs}
          defaultExpanded={['screening', 'tagging']}
          defaultReverted={['tom']}
          onRevert={(a) => {
            if (a.id === 'lee') throw new Error('offline')
          }}
          onRestore={() => {}}
        />
        <Toaster />
      </>,
      { theme },
    )
    await user.click(screen.getByRole('button', { name: 'Revert Moved Lee Wong to Rejected' }))
    await user.click(screen.getByRole('button', { name: 'Revert Tagged 8 applicants' }))
    await flush()
    expect(row('Moved Lee Wong to Rejected').getAttribute('data-state')).toBe('failed')
    await expectNoAxeViolations()
  })
})
