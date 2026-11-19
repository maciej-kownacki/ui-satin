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
const status = () => screen.getByRole('status')

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
    await user.tab()
    expect(document.activeElement).toBe(button('Accept Stage change'))
    await user.keyboard('{Enter}')
    expect(row('Stage').getAttribute('data-state')).toBe('accepted')
    expect(button('Accept Stage change').getAttribute('aria-pressed')).toBe('true')
    await user.keyboard(' ')
    expect(row('Stage').getAttribute('data-state')).toBe('pending')
    await user.keyboard(' ')
    await user.click(button('Accept Value change'))
    expect(button('Apply 2 changes')).toBeTruthy()
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

  it('Apply sends only the accepted fields, then says Applied and marks each row', async () => {
    const onApply = vi.fn()
    const { user } = renderWithSatin(
      <ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted', close: 'accepted' }} onApply={onApply} />,
    )
    await user.click(button('Dismiss Value change'))
    await user.click(button('Apply 2 changes'))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0]).toEqual([changes[0], changes[2]])
    expect(onApply.mock.calls[0][1]).toEqual({ stage: 'accepted', value: 'rejected', close: 'accepted' })

    // Focus stays on the button, which now says Applied and does nothing.
    const done = button('Applied')
    expect(document.activeElement).toBe(done)
    expect(done.getAttribute('aria-disabled')).toBe('true')
    await user.click(done)
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(status().textContent).toBe('2 changes applied')
    expect(within(row('Stage')).getByText('Applied')).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Value' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Accept Stage change' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Accept all' })).toBeNull()
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

  it('says Not applied after a row left pending at Apply', async () => {
    const { user } = renderWithSatin(<ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} onApply={() => {}} />)
    await user.click(button('Apply 1 change'))
    expect(within(row('Value')).getByText('Not applied')).toBeTruthy()
  })

  it('locks the rows while a promise from onApply runs, and unlocks them if it fails', async () => {
    const first = deferred()
    const onApply = vi.fn(() => first.promise)
    const { user } = renderWithSatin(<ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} onApply={onApply} />)
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
    renderWithSatin(<ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} status="applied" />)
    expect(button('Applied').getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('group', { name: 'Stage' }).closest('[data-slot="reviewable-changes"]')?.getAttribute('data-status')).toBe('applied')
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
        fieldChangeApplied: 'Zastosowano',
        fieldChangeNotApplied: 'Pominięto',
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
    expect(status().textContent).toBe('Zastosowano zmiany: 2')
    expect(button('Zastosowano')).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <AgentSuggestion kind="CRM update" title="Update the Quanta deal">
        <ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted', value: 'rejected' }} />
        <ReviewableChanges changes={changes} control="checkbox" defaultValue={{ stage: 'accepted' }} />
        <ReviewableChanges changes={changes} defaultValue={{ stage: 'accepted' }} status="applied" />
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
})
