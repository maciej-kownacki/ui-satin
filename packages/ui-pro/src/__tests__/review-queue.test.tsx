import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Input } from '@uisatin/ui/input'
import { ReviewQueue, type ReviewDecisions, type ReviewQueueProps } from '../components/review-queue'

type Email = { id: string; to: string; subject: string }
const emails: Email[] = [
  { id: 'anna', to: 'Anna Kowalska', subject: 'Great meeting you at the fair' },
  { id: 'jonas', to: 'Jonas Weber', subject: 'The samples you asked for' },
  { id: 'lea', to: 'Léa Martin', subject: 'Pricing for 500 units' },
]

/** The queue as the docs wire it: each item a card with its subject and a reply field. */
function Queue(props: Partial<ReviewQueueProps<Email>>) {
  const [items, setItems] = React.useState(emails)
  return (
    <ReviewQueue
      title="Trade fair follow-ups"
      items={items}
      itemLabel={(e) => e.to}
      renderItem={(e) => (
        <article>
          <p>{e.subject}</p>
          <Input label="Note" name="note" />
        </article>
      )}
      renderEditor={(e) => <Input label="Subject" name="subject" defaultValue={e.subject} />}
      onEdit={(e, values) => setItems((all) => all.map((x) => (x.id === e.id ? { ...x, subject: String(values?.subject) } : x)))}
      {...props}
    />
  )
}

const status = () => screen.getByRole('status')
const item = () => screen.getByRole('group', { name: /of 3$/ })
const bar = () => screen.getByRole('progressbar', { name: 'Reviewed' })
const button = (name: string) => screen.getByRole('button', { name })

describe('ReviewQueue', () => {
  it('shows the first item, its place and how many are reviewed', () => {
    renderWithSatin(<Queue />)
    expect(screen.getByRole('region', { name: 'Trade fair follow-ups' })).toBeTruthy()
    expect(item().getAttribute('aria-label')).toBe('Anna Kowalska, 1 of 3')
    expect(screen.getByText('1 of 3')).toBeTruthy()
    expect(bar().getAttribute('aria-valuetext')).toBe('0 of 3 reviewed')
    expect(button('Approve').getAttribute('aria-keyshortcuts')).toBe('A')
    expect(button('Skip').getAttribute('aria-keyshortcuts')).toBe('S')
    expect(button('Edit').getAttribute('aria-keyshortcuts')).toBe('E')
  })

  it('moves with J and K, slides from the side it came from and reads out the new place', async () => {
    const { user } = renderWithSatin(<Queue />)
    button('Skip').focus()
    await user.keyboard('k')
    expect(item().getAttribute('aria-label')).toBe('Anna Kowalska, 1 of 3')
    await user.keyboard('j')
    expect(item().getAttribute('aria-label')).toBe('Jonas Weber, 2 of 3')
    expect(item().getAttribute('data-enter')).toBe('next')
    expect(status().textContent).toBe('Jonas Weber, 2 of 3')
    await user.keyboard('k')
    expect(item().getAttribute('data-enter')).toBe('prev')
    expect(status().textContent).toBe('Anna Kowalska, 1 of 3')
    // ‹ and › do the same.
    await user.click(button('Next item'))
    expect(item().getAttribute('aria-label')).toBe('Jonas Weber, 2 of 3')
  })

  it('approves with A and skips with S, moving on and saying what happened', async () => {
    const onApprove = vi.fn()
    const onSkip = vi.fn()
    const { user } = renderWithSatin(<Queue onApprove={onApprove} onSkip={onSkip} />)
    item().focus()
    await user.keyboard('a')
    expect(onApprove).toHaveBeenCalledWith(emails[0])
    // Focus was on the item, so it lands on the new one, which reads its own name and place.
    expect(document.activeElement).toBe(item())
    expect(item().getAttribute('aria-label')).toBe('Jonas Weber, 2 of 3')
    expect(status().textContent).toBe('Approved')
    expect(bar().getAttribute('aria-valuetext')).toBe('1 of 3 reviewed')
    button('Skip').focus()
    await user.keyboard('s')
    expect(onSkip).toHaveBeenCalledWith(emails[1])
    expect(status().textContent).toBe('Skipped. Léa Martin, 3 of 3')
  })

  it('leaves the keys alone while typing in a field', async () => {
    const onApprove = vi.fn()
    const { user } = renderWithSatin(<Queue onApprove={onApprove} />)
    await user.click(screen.getByRole('textbox', { name: 'Note' }))
    await user.keyboard('jaks')
    expect(onApprove).not.toHaveBeenCalled()
    expect(item().getAttribute('aria-label')).toBe('Anna Kowalska, 1 of 3')
    expect((screen.getByRole('textbox', { name: 'Note' }) as HTMLInputElement).value).toBe('jaks')
  })

  it('ends with a summary of what was approved and skipped, with focus on it, and takes the skipped round again', async () => {
    const { user } = renderWithSatin(<Queue />)
    button('Approve').focus()
    await user.keyboard('a')
    await user.keyboard('s')
    await user.keyboard('a')
    const summary = screen.getByRole('region', { name: 'All reviewed' })
    expect(document.activeElement).toBe(within(summary).getByText('All reviewed'))
    expect(status().textContent).toBe('All reviewed. 2 approved, 1 skipped')
    expect(bar().getAttribute('aria-valuetext')).toBe('3 of 3 reviewed')
    const approved = within(summary).getByRole('list', { name: 'Approved 2' })
    expect(within(approved).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Anna Kowalska', 'Léa Martin'])
    const skipped = within(summary).getByRole('list', { name: 'Skipped 1' })
    expect(within(skipped).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Jonas Weber'])
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()

    await user.click(within(summary).getByRole('button', { name: 'Review skipped' }))
    expect(item().getAttribute('aria-label')).toBe('Jonas Weber, 2 of 3')
    expect(document.activeElement).toBe(item())
    expect(bar().getAttribute('aria-valuetext')).toBe('2 of 3 reviewed')
  })

  it('keeps an approved item done: its Badge shows and its actions stay off', async () => {
    const onApprove = vi.fn()
    const { user } = renderWithSatin(<Queue onApprove={onApprove} defaultDecisions={{ anna: 'approved' }} />)
    expect(screen.getByText('Approved')).toBeTruthy()
    expect(button('Approve').getAttribute('aria-disabled')).toBe('true')
    button('Approve').focus()
    await user.keyboard('a')
    await user.keyboard('e')
    expect(onApprove).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(button('Approve'))
  })

  it('shows a Spinner while an Approve that returns a promise runs, and stays put when it fails', async () => {
    let settle: { resolve: () => void; reject: (e: Error) => void } = { resolve: () => {}, reject: () => {} }
    const onApprove = () => new Promise<void>((resolve, reject) => (settle = { resolve, reject }))
    const { user } = renderWithSatin(<Queue onApprove={onApprove} />)
    await user.click(button('Approve'))
    expect(button('Approve').getAttribute('aria-busy')).toBe('true')
    // The others wait meanwhile.
    expect(button('Skip').getAttribute('aria-disabled')).toBe('true')
    await act(async () => settle.reject(new Error('offline')))
    expect(button('Approve').hasAttribute('aria-busy')).toBe(false)
    expect(item().getAttribute('aria-label')).toBe('Anna Kowalska, 1 of 3')
    await user.click(button('Approve'))
    await act(async () => settle.resolve())
    expect(item().getAttribute('aria-label')).toBe('Jonas Weber, 2 of 3')
  })

  it('edits in a Sheet and keeps your place', async () => {
    const { user } = renderWithSatin(<Queue />)
    await user.click(button('Next item'))
    await user.click(button('Edit'))
    const sheet = screen.getByRole('dialog', { name: 'Edit' })
    const subject = within(sheet).getByRole('textbox', { name: 'Subject' })
    expect((subject as HTMLInputElement).value).toBe('The samples you asked for')
    // Keys typed in the editor stay there.
    await user.clear(subject)
    await user.type(subject, 'Samples and a jar of jam')
    await user.click(within(sheet).getByRole('button', { name: 'Save' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(item().getAttribute('aria-label')).toBe('Jonas Weber, 2 of 3')
    expect(within(item()).getByText('Samples and a jar of jam')).toBeTruthy()
    expect(document.activeElement).toBe(button('Edit'))
  })

  it('opens the editor with E and closes it with Escape, back on the same item', async () => {
    const { user } = renderWithSatin(<Queue />)
    item().focus()
    await user.keyboard('j')
    await user.keyboard('e')
    expect(screen.getByRole('dialog')).toBeTruthy()
    // J inside the Sheet is not the queue's.
    await user.keyboard('j')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(item().getAttribute('aria-label')).toBe('Jonas Weber, 2 of 3')
    expect(document.activeElement).toBe(item())
  })

  it('calls onEdit straight away when there is no editor of its own', async () => {
    const onEdit = vi.fn()
    const { user } = renderWithSatin(<Queue renderEditor={undefined} onEdit={onEdit} />)
    await user.click(button('Edit'))
    expect(onEdit).toHaveBeenCalledWith(emails[0])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('takes its place and decisions from the app when controlled', async () => {
    function Controlled() {
      const [index, setIndex] = React.useState(2)
      const [decisions, setDecisions] = React.useState<ReviewDecisions>({})
      return (
        <>
          <Queue index={index} onIndexChange={setIndex} decisions={decisions} onDecisionsChange={setDecisions} />
          <output data-testid="state">{`${index} ${JSON.stringify(decisions)}`}</output>
        </>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    expect(item().getAttribute('aria-label')).toBe('Léa Martin, 3 of 3')
    await user.click(button('Skip'))
    expect(screen.getByTestId('state').textContent).toBe('0 {"lea":"skipped"}')
    expect(item().getAttribute('aria-label')).toBe('Anna Kowalska, 1 of 3')
  })

  it('takes other keys, or none', async () => {
    const onApprove = vi.fn()
    const { user, unmount } = renderWithSatin(<Queue onApprove={onApprove} shortcuts={{ approve: 'Y' }} />)
    item().focus()
    await user.keyboard('a')
    expect(onApprove).not.toHaveBeenCalled()
    await user.keyboard('y')
    expect(onApprove).toHaveBeenCalledTimes(1)
    unmount()
    const off = renderWithSatin(<Queue onApprove={onApprove} shortcuts={false} />)
    item().focus()
    await off.user.keyboard('ja')
    expect(onApprove).toHaveBeenCalledTimes(1)
    expect(button('Approve').hasAttribute('aria-keyshortcuts')).toBe(false)
  })

  it('speaks the app’s language', async () => {
    const { user } = renderWithSatin(<Queue />, {
      labels: {
        reviewApprove: 'Zatwierdź',
        skip: 'Pomiń',
        reviewNext: 'Następny',
        reviewPosition: (p, n) => `${p} z ${n}`,
        reviewItemAt: (name, p, n) => `${name}, ${p} z ${n}`,
        reviewProgress: 'Przejrzane',
        reviewSkipped: 'Pominięte',
        reviewAllDone: 'Wszystko przejrzane',
        reviewTally: (a, s) => `zatwierdzone: ${a}, pominięte: ${s}`,
      },
    })
    expect(screen.getByText('1 z 3')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Anna Kowalska, 1 z 3' })).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Przejrzane' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Następny' }))
    expect(status().textContent).toBe('Jonas Weber, 2 z 3')
    await user.click(screen.getByRole('button', { name: 'Pomiń' }))
    expect(status().textContent).toBe('Pominięte. Léa Martin, 3 z 3')
    await user.click(screen.getByRole('button', { name: 'Zatwierdź' }))
    await user.click(screen.getByRole('button', { name: 'Zatwierdź' }))
    expect(screen.getByRole('region', { name: 'Wszystko przejrzane' })).toBeTruthy()
    expect(screen.getByText('zatwierdzone: 2, pominięte: 1')).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s while reviewing, editing and done', async (theme) => {
    const { user } = renderWithSatin(<Queue />, { theme })
    await expectNoAxeViolations()
    await user.click(button('Edit'))
    await expectNoAxeViolations()
    await user.keyboard('{Escape}')
    await user.click(button('Approve'))
    await user.click(button('Skip'))
    await user.click(button('Approve'))
    expect(screen.getByRole('region', { name: 'All reviewed' })).toBeTruthy()
    await expectNoAxeViolations()
  })
})
