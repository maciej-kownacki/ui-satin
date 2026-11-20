import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { type AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import { ReviewableChanges, type ReviewableChange, type ReviewableChangesValue } from '../components/agent-changes-review'

/** The docs scenario: the agent updates a deal, each change with the line that justifies it. */
const call = (quote: string) => ({ label: 'Transcription', quote })
const changes: ReviewableChange[] = [
  { id: 'stage', field: 'Stage', from: 'Proposal', to: 'Negotiation', source: call('We’re ready to talk terms.') },
  { id: 'value', field: 'Value', from: '$18,000', to: '$22,000', source: call('We can go to $22k.') },
  { id: 'close', field: 'Close date', from: '30 Nov', to: '15 Dec', source: call('Let’s aim for mid-December.') },
]
const TITLE = 'Update the Quanta deal'

const card = () => screen.getByRole('group', { name: TITLE })
const change = () => document.querySelector<HTMLElement>('[data-slot="reviewable-change"]')!
const button = (name: string) => screen.getByRole('button', { name })
const counter = () => document.querySelector('[data-slot="reviewable-changes"] [aria-live]')?.textContent
// The component's own live region; "applied" is said from one on the body, which outlives it.
const status = () => document.querySelector('[data-slot="reviewable-changes"] [role="status"]')!
const announced = () => document.querySelector('[data-slot="reviewable-changes-announcer"]')?.textContent
const waitForAnnouncement = () => act(() => new Promise((resolve) => setTimeout(resolve, 60)))

function deferred() {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('ReviewableChanges', () => {
  // The card leaves at once under reduced motion; the exit has its own test below.
  beforeEach(() => setReducedMotion(true))
  afterEach(() => setReducedMotion(false))

  it('shows one change at a time, in a DecisionCard, with its source', () => {
    renderWithSatin(<ReviewableChanges title={TITLE} description="Based on today's call" changes={changes} />)
    expect(card().getAttribute('data-slot')).toBe('reviewable-changes')
    expect(within(card()).getByText("Based on today's call")).toBeTruthy()
    expect(counter()).toBe('1/3')
    // Only the first change, named by its field, its old value struck through.
    const stage = screen.getByRole('group', { name: 'Stage' })
    expect(within(stage).getByRole('deletion').textContent).toBe('Proposal')
    expect(screen.queryByRole('group', { name: 'Value' })).toBeNull()
    const source = stage.querySelector('[data-slot="reviewable-change-source"]')!
    expect(source.textContent).toContain('Transcription')
    expect(source.querySelector('q')?.textContent).toBe('We’re ready to talk terms.')
    expect(button('Accept Stage change').getAttribute('aria-pressed')).toBe('false')
    expect(button('Dismiss Stage change').getAttribute('aria-pressed')).toBe('false')
    expect((button('Previous change') as HTMLButtonElement).disabled).toBe(true)
    // Nothing accepted yet: Apply can't run.
    expect((button('Apply changes') as HTMLButtonElement).disabled).toBe(true)
  })

  it('takes AgentSuggestionChange[] as they are; without a title, each field is the title', () => {
    const plain: AgentSuggestionChange[] = [{ field: 'Owner', to: 'Tara Mendes' }]
    renderWithSatin(<ReviewableChanges changes={plain} />)
    const owner = screen.getByRole('group', { name: 'Owner' })
    expect(owner.getAttribute('data-slot')).toBe('reviewable-changes')
    expect(within(owner).queryByRole('deletion')).toBeNull()
    // One change: no step navigator.
    expect(screen.queryByRole('button', { name: 'Next change' })).toBeNull()
  })

  it('steps through with the keyboard: each decision moves on, the last one to Apply', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<ReviewableChanges title={TITLE} changes={changes} onValueChange={onValueChange} />)
    // The navigator first (Previous is disabled on the first change), then Dismiss and Accept.
    await user.tab()
    expect(document.activeElement).toBe(button('Next change'))
    await user.tab()
    expect(document.activeElement).toBe(button('Dismiss Stage change'))
    await user.tab()
    expect(document.activeElement).toBe(button('Accept Stage change'))

    await user.keyboard('{Enter}')
    expect(counter()).toBe('2/3')
    expect(onValueChange).toHaveBeenLastCalledWith({ stage: 'accepted' })
    // Focus is on the next change's Accept, a new button with its own name.
    expect(document.activeElement).toBe(button('Accept Value change'))

    await user.keyboard('{Shift>}{Tab}{/Shift}{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith({ stage: 'accepted', value: 'rejected' })
    expect(counter()).toBe('3/3')
    expect(document.activeElement).toBe(button('Accept Close date change'))

    await user.keyboard('{Enter}')
    // None pending: it stays on the last change and focus goes to Apply.
    expect(counter()).toBe('3/3')
    expect(document.activeElement).toBe(button('Apply 2 changes'))
  })

  it('goes back with the navigator, shows the decision, and toggles it back to pending', async () => {
    const { user } = renderWithSatin(<ReviewableChanges title={TITLE} changes={changes} defaultValue={{ value: 'rejected' }} />)
    await user.click(button('Next change'))
    expect(counter()).toBe('2/3')
    expect(change().getAttribute('data-state')).toBe('rejected')
    expect(button('Dismiss Value change').getAttribute('aria-pressed')).toBe('true')
    // Pressing a pressed toggle makes the change pending again, and stays on it.
    await user.click(button('Dismiss Value change'))
    expect(change().getAttribute('data-state')).toBe('pending')
    expect(counter()).toBe('2/3')
    await user.click(button('Previous change'))
    expect(counter()).toBe('1/3')
  })

  it('moves to the next pending change, wrapping round', async () => {
    const { user } = renderWithSatin(
      <ReviewableChanges title={TITLE} changes={changes} defaultValue={{ close: 'accepted' }} defaultStep={1} />,
    )
    expect(counter()).toBe('2/3')
    await user.click(button('Accept Value change'))
    // Close date is decided, so it wraps round to Stage.
    expect(counter()).toBe('1/3')
  })

  it('accepts everything with Accept all, says so, and moves focus to Apply', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(
      <ReviewableChanges title={TITLE} changes={changes} defaultValue={{ value: 'rejected' }} onValueChange={onValueChange} />,
    )
    await user.click(button('Accept all'))
    expect(onValueChange).toHaveBeenLastCalledWith({ stage: 'accepted', value: 'accepted', close: 'accepted' })
    expect(status().textContent).toBe('All changes accepted')
    expect(document.activeElement).toBe(button('Apply 3 changes'))
  })

  it('applies only the accepted changes, then leaves: onApplied, focus on the body, read out', async () => {
    const onApply = vi.fn()
    const onApplied = vi.fn()
    const { user } = renderWithSatin(
      <ReviewableChanges
        title={TITLE}
        changes={changes}
        defaultValue={{ stage: 'accepted', value: 'rejected', close: 'accepted' }}
        onApply={onApply}
        onApplied={onApplied}
      />,
    )
    await user.click(button('Apply 2 changes'))
    const value: ReviewableChangesValue = { stage: 'accepted', value: 'rejected', close: 'accepted' }
    expect(onApply).toHaveBeenCalledWith([changes[0], changes[2]], value)
    const root = document.querySelector('[data-slot="reviewable-changes"]')!
    expect(root.classList.contains('satin-changes-review-exit')).toBe(true)
    expect(root.hasAttribute('inert')).toBe(true)
    expect(onApplied).toHaveBeenCalledWith([changes[0], changes[2]], value)
    expect(document.activeElement).toBe(document.body)
    await waitForAnnouncement()
    expect(announced()).toBe('2 changes applied')
  })

  it('returns focus where the app says, once it removes the card', async () => {
    function App() {
      const [open, setOpen] = React.useState(true)
      const deal = React.useRef<HTMLButtonElement>(null)
      return (
        <>
          <button ref={deal}>Quanta deal</button>
          {open && (
            <ReviewableChanges
              title={TITLE}
              changes={changes}
              defaultValue={{ stage: 'accepted' }}
              onApplied={() => setOpen(false)}
              returnFocus={() => deal.current}
            />
          )}
        </>
      )
    }
    const { user } = renderWithSatin(<App />)
    await user.click(button('Apply 1 change'))
    expect(screen.queryByRole('group', { name: TITLE })).toBeNull()
    expect(document.activeElement).toBe(button('Quanta deal'))
  })

  it('locks while onApply runs, and unlocks for another try when it fails', async () => {
    const first = deferred()
    const onApply = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(undefined)
    const onApplied = vi.fn()
    const { user } = renderWithSatin(
      <ReviewableChanges title={TITLE} changes={changes} defaultValue={{ stage: 'accepted' }} onApply={onApply} onApplied={onApplied} />,
    )
    await user.click(button('Apply 1 change'))
    expect(card().getAttribute('data-status')).toBe('applying')
    expect(status().textContent).toBe('Applying changes…')
    expect((button('Accept Stage change') as HTMLButtonElement).disabled).toBe(true)
    expect((button('Accept all') as HTMLButtonElement).disabled).toBe(true)
    await act(async () => first.reject(new Error('offline')))
    expect(card().getAttribute('data-status')).toBe('review')
    expect((button('Accept Stage change') as HTMLButtonElement).disabled).toBe(false)
    expect(onApplied).not.toHaveBeenCalled()
    await user.click(button('Apply 1 change'))
    expect(onApplied).toHaveBeenCalledTimes(1)
  })

  it('holds a stage with status', () => {
    renderWithSatin(<ReviewableChanges title={TITLE} changes={changes} status="applying" />)
    expect(card().getAttribute('data-status')).toBe('applying')
    expect((button('Dismiss Stage change') as HTMLButtonElement).disabled).toBe(true)
  })

  it('follows a controlled value', async () => {
    function Controlled() {
      const [value, setValue] = React.useState<ReviewableChangesValue>({})
      return (
        <>
          <ReviewableChanges title={TITLE} changes={changes} value={value} onValueChange={setValue} />
          <button onClick={() => setValue({ stage: 'accepted', value: 'accepted' })}>Accept two</button>
        </>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    await user.click(button('Accept two'))
    expect(button('Accept Stage change').getAttribute('aria-pressed')).toBe('true')
    expect(button('Apply 2 changes')).toBeTruthy()
  })

  it('says its words through SatinLabels', async () => {
    const { user } = renderWithSatin(
      <ReviewableChanges title={TITLE} changes={changes} defaultValue={{ stage: 'accepted' }} onApply={() => {}} />,
      {
        labels: {
          acceptFieldChange: (field: string) => `Zaakceptuj: ${field}`,
          acceptFieldChangeText: 'Akceptuj',
          rejectFieldChange: (field: string) => `Odrzuć: ${field}`,
          nextFieldChange: 'Następna zmiana',
          applyFieldChanges: (_: number, number: string) => `Zastosuj (${number})`,
          fieldChangesApplied: (_: number, number: string) => `Zastosowano: ${number}`,
        },
      },
    )
    expect(button('Zaakceptuj: Stage').textContent).toBe('Akceptuj')
    expect(button('Odrzuć: Stage')).toBeTruthy()
    expect(button('Następna zmiana')).toBeTruthy()
    await user.click(button('Zastosuj (1)'))
    await waitForAnnouncement()
    expect(announced()).toBe('Zastosowano: 1')
  })

  it('waits for the exit before onApplied when motion is on', async () => {
    setReducedMotion(false)
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onApplied = vi.fn()
      const { user } = renderWithSatin(
        <ReviewableChanges title={TITLE} changes={changes} defaultValue={{ stage: 'accepted' }} onApplied={onApplied} />,
      )
      await user.click(button('Apply 1 change'))
      expect(card().classList.contains('satin-changes-review-exit')).toBe(true)
      expect(onApplied).not.toHaveBeenCalled()
      // jsdom runs no transitions, so the fallback ends the wait.
      await act(async () => vi.advanceTimersByTime(400))
      expect(onApplied).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, reviewing and applying', async (theme) => {
    renderWithSatin(
      <>
        <ReviewableChanges title={TITLE} changes={changes} defaultValue={{ stage: 'accepted', value: 'rejected' }} />
        <ReviewableChanges title="Second" changes={changes} status="applying" />
      </>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
