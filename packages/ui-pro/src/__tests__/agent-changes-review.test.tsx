import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { AgentSuggestion, AgentSuggestionChanges, type AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import {
  ReviewableChanges,
  ReviewableChangesApply,
  ReviewableChangesList,
  ReviewableChangesRoot,
  type ReviewableChange,
  type ReviewableChangesValue,
} from '../components/agent-changes-review'

/** The docs scenario: the agent updates a deal. */
const changes: ReviewableChange[] = [
  { id: 'stage', field: 'Stage', from: 'Proposal', to: 'Negotiation' },
  { id: 'value', field: 'Value', from: '$18,000', to: '$22,000' },
  { id: 'close', field: 'Close date', from: '30 Nov', to: '15 Dec' },
]

const row = (field: string) => screen.getByRole('group', { name: field })
const button = (name: string) => screen.getByRole('button', { name })
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
  // Rows rejected with X go at once under reduced motion; the swipe has its own tests below.
  beforeEach(() => setReducedMotion(true))
  afterEach(() => setReducedMotion(false))

  it('renders AgentSuggestionChange[] as AgentSuggestionChanges does', () => {
    const plain: AgentSuggestionChange[] = [
      { field: 'Stage', from: 'Proposal', to: 'Negotiation' },
      { field: 'Owner', to: 'Tara Mendes' },
    ]
    const { container } = renderWithSatin(
      <>
        <AgentSuggestionChanges changes={plain} />
        <ReviewableChanges changes={plain} />
      </>,
    )
    const [before, after] = [...container.querySelectorAll('[data-slot="agent-suggestion-change-value"]')]
      .reduce<Element[][]>((sides, el, i) => (sides[i < 2 ? 0 : 1].push(el), sides), [[], []])
      .map((side) => side.map((el) => el.outerHTML))
    // The same value markup, row by row: the old value struck through, the arrow, the new one.
    expect(after.map((html) => html.replace(/ class="[^"]*"/, ''))).toEqual(before.map((html) => html.replace(/ class="[^"]*"/, '')))
    expect(within(row('Stage')).getByRole('deletion').textContent).toBe('Proposal')
    expect(within(row('Owner')).queryByRole('deletion')).toBeNull()
  })

  it('names each row after its field and its buttons after the change', () => {
    renderWithSatin(<ReviewableChanges changes={changes} />)
    const stage = within(row('Stage'))
    expect(stage.getByRole('button', { name: 'Accept Stage change' }).getAttribute('aria-pressed')).toBe('false')
    // Dismiss isn't a toggle: it takes the card out.
    expect(stage.getByRole('button', { name: 'Dismiss Stage change' }).hasAttribute('aria-pressed')).toBe(false)
    expect(row('Stage').getAttribute('data-state')).toBe('pending')
    // Nothing accepted yet: Apply can't run.
    expect((button('Apply changes') as HTMLButtonElement).disabled).toBe(true)
  })

  it('accepts field by field with the keyboard, and toggles Accept back to pending', async () => {
    const { user } = renderWithSatin(<ReviewableChanges changes={changes} />)
    // Dismiss comes first, then Accept, as they sit at the card's bottom right.
    await user.tab()
    expect(document.activeElement).toBe(button('Dismiss Stage change'))
    await user.tab()
    expect(document.activeElement).toBe(button('Accept Stage change'))
    // The visible text is "Accept"; the name says which change.
    expect(button('Accept Stage change').textContent).toBe('Accept')
    await user.keyboard('{Enter}')
    expect(row('Stage').getAttribute('data-state')).toBe('accepted')
    expect(button('Accept Stage change').getAttribute('aria-pressed')).toBe('true')
    await user.keyboard(' ')
    expect(row('Stage').getAttribute('data-state')).toBe('pending')
    await user.keyboard(' ')
    await user.click(button('Accept Value change'))
    expect(button('Apply 2 changes')).toBeTruthy()
  })

  it('draws a change\'s source under it, as a quote', () => {
    renderWithSatin(
      <ReviewableChanges
        changes={[{ id: 'stage', field: 'Stage', from: 'Proposal', to: 'Negotiation', source: { icon: <svg />, label: 'Transcription', quote: 'Orders over €500 need a manager’s approval.' } }, ...changes.slice(1)]}
      />,
    )
    const source = row('Stage').querySelector('[data-slot="reviewable-change-source"]')!
    expect(source.textContent).toContain('Transcription')
    expect(source.querySelector('q')!.textContent).toBe('Orders over €500 need a manager’s approval.')
    expect(row('Value').querySelector('[data-slot="reviewable-change-source"]')).toBeNull()
  })

  it('X takes the row out, says so, keeps the counts, and moves focus to the next row', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(
      <ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted', value: 'accepted' }} onValueChange={onValueChange} />,
    )
    expect(button('Apply 2 changes')).toBeTruthy()
    button('Dismiss Value change').focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('group', { name: 'Value' })).toBeNull()
    expect(onValueChange).toHaveBeenLastCalledWith({ stage: 'accepted', value: 'rejected' })
    expect(status().textContent).toBe('Value change dismissed')
    expect(button('Apply 1 change')).toBeTruthy()
    expect(document.activeElement).toBe(button('Accept Close date change'))
    // The last row: focus goes to the footer.
    await user.click(button('Dismiss Close date change'))
    expect(document.activeElement).toBe(button('Accept all'))
    // Accept all leaves the rejected rows out.
    await user.click(button('Accept all'))
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-labelledby') && g.textContent?.slice(0, 5))).toHaveLength(1)
    expect(button('Apply 1 change')).toBeTruthy()
  })

  it('leaves out rows that start rejected, and brings one back when the app sets it pending', async () => {
    function Controlled() {
      const [value, setValue] = React.useState<ReviewableChangesValue>({ value: 'rejected' })
      return (
        <>
          <ReviewableChanges changes={changes} value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue((v) => ({ ...v, value: 'pending' }))}>
            Bring back
          </button>
        </>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    expect(screen.queryByRole('group', { name: 'Value' })).toBeNull()
    await user.click(button('Bring back'))
    expect(row('Value').getAttribute('data-state')).toBe('pending')
  })

  it('Apply sends only the accepted fields, then the suggestion leaves and onApplied fires', async () => {
    const onApply = vi.fn()
    const onApplied = vi.fn()
    const { user } = renderWithSatin(
      <AgentSuggestion kind="CRM update" title="Update the Quanta deal">
        <ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted', close: 'accepted' }} onApply={onApply} onApplied={onApplied} />
      </AgentSuggestion>,
    )
    await user.click(button('Dismiss Value change'))
    await user.click(button('Apply 2 changes'))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0]).toEqual([changes[0], changes[2]])
    expect(onApply.mock.calls[0][1]).toEqual({ stage: 'accepted', value: 'rejected', close: 'accepted' })
    // Under reduced motion it goes at once: the whole AgentSuggestion, faded out and inert.
    expect(onApplied).toHaveBeenCalledWith([changes[0], changes[2]], { stage: 'accepted', value: 'rejected', close: 'accepted' })
    const card = document.querySelector('[data-slot="agent-suggestion"]')!
    expect(card.classList.contains('satin-changes-review-exit')).toBe(true)
    expect(card.hasAttribute('inert')).toBe(true)
    // Focus was on Apply: with no returnFocus it goes to the body, and the body's live region says why.
    expect(document.activeElement).toBe(document.body)
    await waitForAnnouncement()
    expect(announced()).toBe('2 changes applied')
  })

  it('hands focus to returnFocus when it leaves', async () => {
    function App() {
      const [open, setOpen] = React.useState(true)
      const deal = React.useRef<HTMLHeadingElement>(null)
      return (
        <>
          <h2 ref={deal} tabIndex={-1}>
            Quanta
          </h2>
          {open && (
            <ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} onApply={() => {}} onApplied={() => setOpen(false)} returnFocus={() => deal.current} />
          )}
        </>
      )
    }
    const { user } = renderWithSatin(<App />)
    await user.click(button('Apply 1 change'))
    expect(screen.queryByRole('group', { name: 'Stage' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Quanta' }))
  })

  it('Accept all accepts every field and says so', async () => {
    const onApply = vi.fn()
    const { user } = renderWithSatin(<ReviewableChanges changes={changes} defaultValue={{ value: 'accepted' }} onApply={onApply} />)
    await user.click(button('Accept all'))
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('data-state'))).toEqual(['accepted', 'accepted', 'accepted'])
    expect(status().textContent).toBe('All changes accepted')
    await user.click(button('Apply 3 changes'))
    expect(onApply.mock.calls[0][0]).toEqual(changes)
  })

  it('locks the rows while a promise from onApply runs, and unlocks them if it fails', async () => {
    const first = deferred()
    const onApply = vi.fn(() => first.promise)
    const onApplied = vi.fn()
    const { user } = renderWithSatin(<ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} onApply={onApply} onApplied={onApplied} />)
    const apply = button('Apply 1 change')
    await user.click(apply)
    expect(apply.getAttribute('aria-busy')).toBe('true')
    expect(status().textContent).toBe('Applying changes…')
    expect((button('Dismiss Stage change') as HTMLButtonElement).disabled).toBe(true)
    expect((button('Accept all') as HTMLButtonElement).disabled).toBe(true)
    // A second press while it runs does nothing.
    await user.click(apply)
    expect(onApply).toHaveBeenCalledTimes(1)

    await act(async () => {
      first.reject(new Error('Offline'))
      await first.promise.catch(() => {})
    })
    expect((button('Dismiss Stage change') as HTMLButtonElement).disabled).toBe(false)
    expect(button('Apply 1 change').getAttribute('aria-busy')).toBeNull()

    // The second try goes through: it leaves only once the promise resolves.
    const second = deferred()
    onApply.mockImplementation(() => second.promise)
    await user.click(button('Apply 1 change'))
    expect(onApplied).not.toHaveBeenCalled()
    await act(async () => {
      second.resolve()
      await second.promise
    })
    expect(onApplied).toHaveBeenCalledTimes(1)
  })

  it('is controlled with value and onValueChange', async () => {
    const seen: ReviewableChangesValue[] = []
    function Controlled() {
      const [value, setValue] = React.useState<ReviewableChangesValue>({ close: 'accepted' })
      return (
        <ReviewableChanges
          changes={changes}
          value={value}
          onValueChange={(next) => {
            seen.push(next)
            setValue(next)
          }}
        />
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    expect(row('Close date').getAttribute('data-state')).toBe('accepted')
    await user.click(button('Dismiss Stage change'))
    expect(seen.at(-1)).toEqual({ close: 'accepted', stage: 'rejected' })
    expect(screen.queryByRole('group', { name: 'Stage' })).toBeNull()

    // A value the app holds fixed doesn't move.
    const { user: user2 } = renderWithSatin(<ReviewableChanges changes={[changes[0]]} value={{}} />)
    // The first one's Stage row has left, so this is the second one's.
    const second = screen.getByRole('group', { name: 'Stage' })
    await user2.click(within(second).getByRole('button', { name: 'Accept Stage change' }))
    expect(second.getAttribute('data-state')).toBe('pending')
  })

  it('keys a change by its place when it has no id', async () => {
    const onValueChange = vi.fn()
    const { user } = renderWithSatin(<ReviewableChanges changes={[{ field: 'Stage', to: 'Won' }, { field: 'Owner', to: 'Ada' }]} onValueChange={onValueChange} />)
    await user.click(button('Accept Owner change'))
    expect(onValueChange).toHaveBeenLastCalledWith({ '1': 'accepted' })
  })

  it('takes a checkbox per row: checked accepts, cleared rejects', async () => {
    const onApply = vi.fn()
    const { user } = renderWithSatin(<ReviewableChanges changes={changes} control="checkbox" onApply={onApply} />)
    const stage = screen.getByRole('checkbox', { name: 'Accept Stage change' })
    await user.tab()
    expect(document.activeElement).toBe(stage)
    await user.keyboard(' ')
    expect(row('Stage').getAttribute('data-state')).toBe('accepted')
    await user.click(screen.getByRole('checkbox', { name: 'Accept Value change' }))
    await user.click(screen.getByRole('checkbox', { name: 'Accept Value change' }))
    expect(row('Value').getAttribute('data-state')).toBe('rejected')
    expect(screen.queryByRole('button', { name: 'Dismiss Stage change' })).toBeNull()
    await user.click(button('Apply 1 change'))
    expect(onApply.mock.calls[0][0]).toEqual([changes[0]])
    expect((screen.getByRole('checkbox', { name: 'Accept Stage change' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('follows a status the app sets', () => {
    renderWithSatin(<ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} status="applying" />)
    expect(button('Apply 1 change').getAttribute('aria-busy')).toBe('true')
    expect((button('Accept Stage change') as HTMLButtonElement).disabled).toBe(true)
    expect(row('Stage').closest('[data-slot="reviewable-changes"]')?.getAttribute('data-status')).toBe('applying')
  })

  it('composes with AgentSuggestion through its parts, with Apply in the card’s actions', async () => {
    const onApply = vi.fn()
    const ref = React.createRef<HTMLDivElement>()
    const { user } = renderWithSatin(
      <ReviewableChangesRoot ref={ref} changes={changes} defaultValue={{ close: 'accepted' }} onApply={onApply}>
        <AgentSuggestion kind="CRM update" title="Update the Quanta deal" actions={<ReviewableChangesApply>Update deal</ReviewableChangesApply>}>
          <ReviewableChangesList />
        </AgentSuggestion>
      </ReviewableChangesRoot>,
    )
    expect(ref.current?.getAttribute('data-slot')).toBe('reviewable-changes')
    expect(within(screen.getByRole('region', { name: 'Update the Quanta deal' })).getAllByRole('group')).toHaveLength(3)
    await user.click(button('Update deal'))
    expect(onApply.mock.calls[0][0]).toEqual([changes[2]])
  })

  it('takes its words from SatinLabels', async () => {
    const { user } = renderWithSatin(<ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} onApply={() => {}} />, {
      labels: {
        acceptFieldChange: (field) => `Zaakceptuj: ${field}`,
        rejectFieldChange: (field) => `Odrzuć: ${field}`,
        acceptAll: 'Zaakceptuj wszystko',
        applyFieldChanges: (count, number) => `Zastosuj zmiany (${number})`,
        fieldChangesApplied: (count, number) => `Zastosowano zmiany: ${number}`,
        allFieldChangesAccepted: 'Zaakceptowano wszystko',
        fieldChangeRejected: (field) => `Odrzucono: ${field}`,
        dateLocale: 'pl-PL',
      },
    })
    await user.click(button('Odrzuć: Value'))
    expect(status().textContent).toBe('Odrzucono: Value')
    await user.click(button('Zaakceptuj wszystko'))
    expect(status().textContent).toBe('Zaakceptowano wszystko')
    await user.click(button('Zastosuj zmiany (2)'))
    await waitForAnnouncement()
    expect(announced()).toBe('Zastosowano zmiany: 2')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <AgentSuggestion kind="CRM update" title="Update the Quanta deal">
        <ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted', value: 'rejected' }} />
        <ReviewableChanges changes={changes} control="checkbox" defaultValue={{ stage: 'accepted' }} />
        <ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} status="applying" />
      </AgentSuggestion>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})

describe('ReviewableChanges, rejecting with motion', () => {
  it('swipes the row out, keeps it inert until the gap closes, then lets it go', async () => {
    const { user } = renderWithSatin(<ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} />)
    await user.click(button('Dismiss Stage change'))
    const leaving = screen.getAllByRole('group', { hidden: true })[0]
    expect(leaving.hasAttribute('data-leaving')).toBe(true)
    expect(leaving.hasAttribute('inert')).toBe(true)
    // Focus left the X before the row went inert.
    expect(document.activeElement).toBe(button('Accept Value change'))
    expect(button('Apply changes')).toBeTruthy()
    // jsdom fires no transitionend: the fallbacks let the row go.
    await act(() => new Promise((resolve) => setTimeout(resolve, 900)))
    expect(screen.queryByRole('group', { name: 'Stage', hidden: true })).toBeNull()
    // The rows under it are back in place.
    expect(row('Value').style.transform).toBe('')
    expect(row('Value').classList.contains('satin-changes-review-shift')).toBe(false)
  })

  it('fades the suggestion out after Apply, then calls onApplied', async () => {
    const onApplied = vi.fn()
    const { user } = renderWithSatin(
      <AgentSuggestion kind="CRM update" title="Update the Quanta deal">
        <ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} onApply={() => {}} onApplied={onApplied} />
      </AgentSuggestion>,
    )
    await user.click(button('Apply 1 change'))
    const card = document.querySelector('[data-slot="agent-suggestion"]')!
    expect(card.classList.contains('satin-changes-review-exit')).toBe(true)
    // Still fading: Apply stays busy, and onApplied waits for the end.
    expect(button('Apply 1 change').getAttribute('aria-busy')).toBe('true')
    expect(onApplied).not.toHaveBeenCalled()
    // jsdom fires no transitionend: the fallback ends it.
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)))
    expect(onApplied).toHaveBeenCalledTimes(1)
    expect(card.hasAttribute('inert')).toBe(true)
  })
})
