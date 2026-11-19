import * as React from 'react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { Toaster, toast } from '@uisatin/ui/toast'
import { toastBatch, type ToastBatchItem, type ToastBatchOptions } from '../components/toast-batch'

const people = [
  { id: 'tara', name: 'Tara Mendes' },
  { id: 'jon', name: 'Jon Park' },
  { id: 'ada', name: 'Ada Novak' },
]

/** The agent's batch: candidates moved to Interview, one Undo each. */
function moved(ids = people.map((p) => p.id), options: Partial<ToastBatchOptions> = {}) {
  const undo: Record<string, Mock<() => void>> = {}
  const items: ToastBatchItem[] = people
    .filter((p) => ids.includes(p.id))
    .map((p) => ({ id: p.id, label: p.name, description: 'From Screening', undo: (undo[p.id] = vi.fn<() => void>()) }))
  let id = ''
  act(() => {
    id = toastBatch({ id: 'interview', title: (count) => `${count} ${count === 1 ? 'candidate' : 'candidates'} moved`, change: 'move', items, ...options })
  })
  return { undo, id }
}

/** Text as a screen reader reads it: the rolling digits are hidden, the number is there as text. */
const spoken = (el: Element | null | undefined) => {
  if (!el) return null
  const copy = el.cloneNode(true) as Element
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove()
  return copy.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}
const titles = () => [...document.querySelectorAll('[data-slot="toast-batch-title"]')].map(spoken)
const title = () => titles()[0]
const status = () => document.querySelector('[data-slot="toast-batch-status"]')?.textContent ?? ''
const toasts = () => document.querySelectorAll('[data-slot="toast"]')
// The batch's list; the Toaster's own `ol` is a list too.
const items = () => document.querySelector<HTMLElement>('[data-slot="list"]')
const wait = (ms: number) => act(async () => void vi.advanceTimersByTime(ms))

afterEach(async () => {
  vi.useRealTimers()
  act(() => toast.dismiss())
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
})

describe('toastBatch', () => {
  it('shows one toast whose Undo undoes every item, last first, and closes', async () => {
    const { user } = renderWithSatin(<Toaster />)
    const { undo } = moved()
    expect(title()).toBe('3 candidates moved')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    for (const fn of Object.values(undo)) expect(fn).toHaveBeenCalledOnce()
    expect(undo.ada.mock.invocationCallOrder[0]).toBeLessThan(undo.tara.mock.invocationCallOrder[0])
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
    expect(toasts()).toHaveLength(0)
  })

  it('gives undoAll what is still changed, in one call', async () => {
    const undoAll = vi.fn()
    const { user } = renderWithSatin(<Toaster />)
    moved(undefined, { undoAll })
    await user.click(screen.getByRole('button', { name: 'Show' }))
    await user.click(screen.getByRole('button', { name: 'Undo move of Jon Park' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(undoAll).toHaveBeenCalledOnce()
    expect(undoAll.mock.calls[0][0].map((item: ToastBatchItem) => item.id)).toEqual(['tara', 'ada'])
  })

  it('adds items to the open batch: one toast, the count rolls up', () => {
    renderWithSatin(<Toaster />)
    moved(['tara'])
    expect(title()).toBe('1 candidate moved')
    moved(['jon'])
    moved(['ada'])
    expect(toasts()).toHaveLength(1)
    expect(title()).toBe('3 candidates moved')
    const roll = document.querySelector('[data-slot="toast-batch-title"] .satin-roll')
    expect(roll?.getAttribute('data-dir')).toBe('up')
    expect(roll?.querySelector('[data-roll="in"]')?.textContent).toBe('3')
  })

  it('keeps to the Toaster limit: adding items never stacks another toast', () => {
    renderWithSatin(<Toaster limit={2} />)
    act(() => void toast('Report exported', { duration: Infinity }))
    act(() => void toast('Invite sent', { duration: Infinity }))
    moved(['tara'])
    moved(['jon'])
    moved(['ada'])
    const all = [...toasts()] as HTMLElement[]
    expect(all).toHaveLength(3)
    // The oldest waits behind the limit; the batch is in front.
    expect(all[0].style.opacity).toBe('0')
    expect(spoken(all[2].querySelector('[data-slot="toast-batch-title"]'))).toBe('3 candidates moved')
  })

  it('takes an item sent again back into the batch, in its place', async () => {
    const { user } = renderWithSatin(<Toaster />)
    moved()
    await user.click(screen.getByRole('button', { name: 'Show' }))
    await user.click(screen.getByRole('button', { name: 'Undo move of Tara Mendes' }))
    expect(title()).toBe('2 candidates moved')
    moved(['tara'])
    expect(title()).toBe('3 candidates moved')
    expect(within(items()!).getAllByRole('listitem').map((li) => li.textContent?.startsWith('Tara'))).toEqual([true, false, false])
    expect(screen.getByRole('button', { name: 'Undo move of Tara Mendes' })).toBeTruthy()
  })

  it('opens a list named by the title, with an Undo per item; an undone item stays, struck', async () => {
    const { user } = renderWithSatin(<Toaster />)
    const { undo } = moved()
    const show = screen.getByRole('button', { name: 'Show' })
    expect(show.getAttribute('aria-expanded')).toBe('false')
    await user.click(show)
    expect(show.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(show)
    const list = screen.getByRole('list', { name: '3 candidates moved' })
    expect(show.getAttribute('aria-controls')).toBe(list.id)
    await user.click(screen.getByRole('button', { name: 'Undo move of Tara Mendes' }))
    expect(undo.tara).toHaveBeenCalledOnce()
    expect(undo.jon).not.toHaveBeenCalled()
    expect(title()).toBe('2 candidates moved')
    expect(document.querySelector('[data-undone] .line-through')?.textContent).toBe('Tara Mendes')
    // The same button keeps the focus, and now does nothing.
    const done = screen.getByRole('button', { name: 'Tara Mendes, Undone' })
    expect(done.getAttribute('aria-disabled')).toBe('true')
    expect(document.activeElement).toBe(done)
    await user.click(done)
    expect(undo.tara).toHaveBeenCalledOnce()
  })

  it('works from the keyboard: Show, then Tab to each Undo', async () => {
    const { user } = renderWithSatin(<Toaster />)
    const { undo } = moved()
    act(() => screen.getByRole('button', { name: 'Show' }).focus())
    await user.keyboard('{Enter}')
    expect(items()).toBeTruthy()
    // Show, the toast's Undo, Close, then the items.
    await user.tab()
    expect(document.activeElement?.textContent).toBe('Undo')
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo move of Tara Mendes' }))
    await user.tab()
    await user.keyboard(' ')
    expect(undo.jon).toHaveBeenCalledOnce()
    act(() => screen.getByRole('button', { name: 'Hide' }).focus())
    await user.keyboard('{Enter}')
    expect(items()).toBeNull()
  })

  it('undoes the newest batch with ⌘Z or Ctrl+Z, says "All undone", then closes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderWithSatin(<Toaster />)
    const older = vi.fn()
    act(() => void toastBatch({ title: 'Deal archived', items: [{ id: 'acme', label: 'Acme', undo: older }] }))
    const { undo } = moved()
    await user.keyboard('{Meta>}z{/Meta}')
    for (const fn of Object.values(undo)) expect(fn).toHaveBeenCalledOnce()
    expect(older).not.toHaveBeenCalled()
    expect(titles()).toContain('All undone')
    // Nothing left to undo, so no Undo; the one left is the older batch's (behind, so hidden).
    expect(screen.getAllByRole('button', { name: 'Undo', hidden: true })).toHaveLength(1)
    await user.keyboard('{Control>}z{/Control}')
    expect(older).toHaveBeenCalledOnce()
    await wait(3000 + 600)
    expect(toasts()).toHaveLength(0)
  })

  it('leaves ⌘Z to text fields, Shift+⌘Z alone, and to the app when undoShortcut is off', async () => {
    const { user } = renderWithSatin(
      <>
        <input aria-label="Note" />
        <Toaster />
      </>,
    )
    const { undo } = moved(undefined, { undoShortcut: false })
    await user.keyboard('{Meta>}z{/Meta}')
    expect(undo.tara).not.toHaveBeenCalled()
    act(() => void toastBatch({ id: 'interview', title: (n) => `${n} candidates moved`, items: [], undoShortcut: true }))
    await user.click(screen.getByRole('textbox', { name: 'Note' }))
    await user.keyboard('{Meta>}z{/Meta}')
    act(() => screen.getByRole('textbox').blur())
    await user.keyboard('{Shift>}{Meta>}z{/Meta}{/Shift}')
    expect(undo.tara).not.toHaveBeenCalled()
    // The app's own undo can still ask for it.
    act(() => void toastBatch.undo())
    expect(undo.tara).toHaveBeenCalledOnce()
    expect(title()).toBe('All undone')
  })

  it('moves focus from the toast’s Undo to Show when ⌘Z empties the batch there', async () => {
    const { user } = renderWithSatin(<Toaster />)
    moved()
    act(() => screen.getByRole('button', { name: 'Undo' }).focus())
    await user.keyboard('{Meta>}z{/Meta}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show' }))
  })

  it('stays while its list is open; after the last item it says "All undone" and closes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderWithSatin(<Toaster />)
    moved()
    await user.click(screen.getByRole('button', { name: 'Show' }))
    await wait(20_000)
    expect(title()).toBe('3 candidates moved')
    for (const name of ['Tara Mendes', 'Jon Park', 'Ada Novak']) await user.click(screen.getByRole('button', { name: `Undo move of ${name}` }))
    expect(title()).toBe('All undone')
    expect(document.querySelectorAll('[data-undone]')).toHaveLength(3)
    // Paused while focus and the pointer are on it, as every toast is.
    await wait(5000)
    expect(toasts()).toHaveLength(1)
    act(() => (document.activeElement as HTMLElement).blur())
    await user.unhover(items()!)
    await wait(3000 + 600)
    expect(toasts()).toHaveLength(0)
  })

  it('closes after its duration, started over when items join', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderWithSatin(<Toaster />)
    moved(['tara'], { duration: 4000 })
    await wait(3000)
    moved(['jon'])
    await wait(3000)
    expect(toasts()).toHaveLength(1)
    await wait(1000 + 600)
    expect(toasts()).toHaveLength(0)
  })

  it('reads the new count once per burst, not at every item', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderWithSatin(<Toaster />)
    moved(['tara'])
    await wait(200)
    moved(['jon'])
    await wait(200)
    moved(['ada'])
    await wait(300)
    expect(status()).toBe('')
    await wait(400)
    expect(status()).toBe('3 candidates moved')
    await user.click(screen.getByRole('button', { name: 'Show' }))
    await user.click(screen.getByRole('button', { name: 'Undo move of Ada Novak' }))
    await wait(700)
    expect(status()).toBe('2 candidates moved')
  })

  it('does not roll the count under reduced motion', () => {
    setReducedMotion(true)
    renderWithSatin(<Toaster />)
    moved(['tara'])
    moved(['jon'])
    expect(title()).toBe('2 candidates moved')
    expect(document.querySelector('.satin-roll')).toBeNull()
  })

  it('places the rolling number in a JSX title', () => {
    renderWithSatin(<Toaster />)
    act(() => void toastBatch({ title: (count, number) => <>Moved {number} to Interview</>, items: [{ id: 'tara', label: 'Tara Mendes', undo: () => {} }] }))
    expect(title()).toBe('Moved 1 to Interview')
    expect(document.querySelector('[data-slot="toast-batch-title"] [data-slot="rolling-number"]')?.textContent).toBe('1')
  })

  it('says its words in the app’s language', async () => {
    const { user } = renderWithSatin(<Toaster />, {
      labels: {
        undo: 'Cofnij',
        showItems: 'Pokaż',
        hideItems: 'Ukryj',
        undoItem: (item, change) => `Cofnij ${change}: ${item}`,
        undone: 'Cofnięto',
        allUndone: 'Wszystko cofnięte',
        undoWithShortcut: (keys) => `Cofnij skrótem ${keys}`,
        dateLocale: 'pl-PL',
      },
    })
    act(() => void toastBatch({ title: (n) => `Przeniesiono: ${n}`, change: 'przeniesienie', items: people.map((p) => ({ id: p.id, label: p.name, undo: () => {} })) }))
    expect(screen.getByRole('button', { name: 'Cofnij' }).getAttribute('data-radix-toast-announce-alt')).toMatch(/^Cofnij skrótem (⌘Z|Ctrl\+Z)$/)
    await user.click(screen.getByRole('button', { name: 'Pokaż' }))
    expect(screen.getByRole('button', { name: 'Ukryj' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cofnij przeniesienie: Tara Mendes' }))
    expect(screen.getByRole('button', { name: 'Tara Mendes, Cofnięto' })).toBeTruthy()
    await user.keyboard('{Control>}z{/Control}')
    expect(title()).toBe('Wszystko cofnięte')
  })

  it.each(['light', 'dark'] as const)('has no axe violations folded, open and all undone, in %s', async (theme) => {
    const { user } = renderWithSatin(<Toaster />, { theme })
    moved()
    await expectNoAxeViolations()
    await user.click(screen.getByRole('button', { name: 'Show' }))
    await user.click(screen.getByRole('button', { name: 'Undo move of Jon Park' }))
    await expectNoAxeViolations()
    act(() => void toastBatch.undo())
    await expectNoAxeViolations()
  })
})
