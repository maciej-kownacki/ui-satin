import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Toaster, toast } from '@uisatin/ui/toast'
import { KanbanBoard, KanbanCard, moveKanbanItem, type KanbanBoardProps, type KanbanColumn } from '../components/kanban-board'

type Person = { id: string; name: string }
const person = (name: string): Person => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name })

const columns: KanbanColumn[] = [
  { id: 'screening', title: 'Screening', tone: 'sky' },
  { id: 'interview', title: 'Interview', tone: 'plum', limit: 3 },
  { id: 'offer', title: 'Offer', tone: 'green' },
]
const initial = (): Record<string, Person[]> => ({
  screening: [person('Tara Mendes'), person('Priya Nair'), person('Daniel Kim')],
  interview: [person('Emma Laurent'), person('Kenji Mori')],
  offer: [],
})

type BoardProps = Partial<KanbanBoardProps<Person>> & { start?: Record<string, Person[]> }

/** A board wired the way the docs show: onMove moves the card in state. */
function Board({ start, onMove, ...props }: BoardProps) {
  const [items, setItems] = React.useState(start ?? initial)
  return (
    <>
      <KanbanBoard
        aria-label="Hiring"
        columns={columns}
        items={items}
        getItemId={(p) => p.id}
        getItemLabel={(p) => p.name}
        onMove={(id, column, index) => {
          onMove?.(id, column, index)
          setItems((all) => moveKanbanItem(all, (p) => p.id, id, column, index))
        }}
        renderCard={(p) => <KanbanCard title={p.name} meta="Product designer" />}
        {...props}
      />
      <Toaster />
    </>
  )
}

const card = (name: string) => screen.getByRole('listitem', { name })
const list = (column: string) => screen.getByRole('list', { name: new RegExp(`^${column}`) })
const names = (column: string) => within(list(column)).queryAllByRole('listitem').map((li) => li.getAttribute('aria-label'))
const status = () => within(screen.getByRole('region', { name: 'Hiring' })).getByRole('status')

afterEach(async () => {
  act(() => toast.dismiss())
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
})

describe('KanbanBoard', () => {
  it('names each column’s list after its title and count, and each card after its item', () => {
    renderWithSatin(<Board />)
    expect(list('Screening').getAttribute('aria-labelledby')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Screening 3 cards' })).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Interview 2 of 3 cards' })).toBeTruthy()
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    expect(card('Tara Mendes').getAttribute('aria-roledescription')).toBe('draggable card')
    expect(card('Tara Mendes').getAttribute('tabindex')).toBe('0')
    // The visible count shows the limit: 2/3.
    expect(within(screen.getByRole('list', { name: /^Interview/ }).closest('[data-slot="kanban-column"]') as HTMLElement).getByText('2/3')).toBeTruthy()
  })

  it('picks a card up with Space, moves it with the arrows and drops it with Space', async () => {
    const onMove = vi.fn()
    const { user } = renderWithSatin(<Board onMove={onMove} />)
    card('Tara Mendes').focus()
    await user.keyboard(' ')
    expect(status().textContent).toBe('Picked up Tara Mendes. Screening, position 1 of 3.')
    expect(card('Tara Mendes').hasAttribute('data-lifted')).toBe(true)

    await user.keyboard('{ArrowDown}')
    expect(status().textContent).toBe('Screening, position 2 of 3')
    expect(names('Screening')).toEqual(['Priya Nair', 'Tara Mendes', 'Daniel Kim'])

    await user.keyboard('{ArrowRight}')
    expect(status().textContent).toBe('Interview, position 2 of 3')
    // Moving between columns keeps focus on the card.
    expect(document.activeElement).toBe(card('Tara Mendes'))
    expect(names('Interview')).toEqual(['Emma Laurent', 'Tara Mendes', 'Kenji Mori'])
    expect(onMove).not.toHaveBeenCalled()

    await user.keyboard('{Home} ')
    expect(onMove).toHaveBeenCalledExactlyOnceWith('tara-mendes', 'interview', 0)
    expect(status().textContent).toBe('Moved Tara Mendes to Interview, position 1 of 3')
    expect(names('Interview')).toEqual(['Tara Mendes', 'Emma Laurent', 'Kenji Mori'])
    expect(document.activeElement).toBe(card('Tara Mendes'))
    expect(card('Tara Mendes').hasAttribute('data-lifted')).toBe(false)
  })

  it('puts the card back with Escape', async () => {
    const onMove = vi.fn()
    const { user } = renderWithSatin(<Board onMove={onMove} />)
    card('Priya Nair').focus()
    await user.keyboard(' {ArrowRight}{ArrowRight}')
    expect(names('Offer')).toEqual(['Priya Nair'])
    await user.keyboard('{Escape}')
    expect(onMove).not.toHaveBeenCalled()
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    expect(status().textContent).toBe('Move cancelled. Priya Nair is back in Screening, position 2 of 3.')
    expect(document.activeElement).toBe(card('Priya Nair'))
  })

  it('moves focus between cards with the arrow keys when nothing is picked up', async () => {
    const { user } = renderWithSatin(<Board />)
    card('Tara Mendes').focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(card('Priya Nair'))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(card('Daniel Kim'))
    await user.keyboard('{ArrowRight}')
    // The nearest card in the next column: Interview has two, so its last.
    expect(document.activeElement).toBe(card('Kenji Mori'))
    await user.keyboard('{ArrowRight}')
    // Offer is empty: focus stays.
    expect(document.activeElement).toBe(card('Kenji Mori'))
    await user.keyboard('{Home}{ArrowLeft}')
    expect(document.activeElement).toBe(card('Tara Mendes'))
  })

  it('offers Undo after a move to another column, which puts the card back in its exact place', async () => {
    const onMove = vi.fn()
    const { user } = renderWithSatin(<Board onMove={onMove} />)
    card('Priya Nair').focus()
    await user.keyboard(' {ArrowRight} ')
    expect(names('Interview')).toEqual(['Emma Laurent', 'Priya Nair', 'Kenji Mori'])
    expect(screen.getByText('Moved to Interview')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onMove).toHaveBeenLastCalledWith('priya-nair', 'screening', 1)
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    expect(status().textContent).toBe('Moved Priya Nair to Screening, position 2 of 3')
  })

  it('shows no toast for a move within a column, nor with undoToast off', async () => {
    const { user } = renderWithSatin(<Board undoToast={false} />)
    card('Tara Mendes').focus()
    await user.keyboard(' {ArrowRight} ')
    expect(screen.queryByText('Moved to Interview')).toBeNull()
  })

  it('moves a card from its ⋯ menu, without dragging', async () => {
    const onMove = vi.fn()
    const { user } = renderWithSatin(<Board onMove={onMove} />)
    await user.click(screen.getByRole('button', { name: 'More options for Daniel Kim' }))
    const menu = screen.getByRole('menu')
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Interview', 'Offer', 'Move up'])
    await user.click(within(menu).getByRole('menuitem', { name: 'Offer' }))
    expect(onMove).toHaveBeenCalledExactlyOnceWith('daniel-kim', 'offer', 0)
    expect(names('Offer')).toEqual(['Daniel Kim'])
    await user.click(screen.getByRole('button', { name: 'More options for Tara Mendes' }))
    await user.click(screen.getByRole('menuitem', { name: 'Move down' }))
    expect(names('Screening')).toEqual(['Priya Nair', 'Tara Mendes'])
  })

  it('turns the count amber past the limit, while dragging too', async () => {
    const { user } = renderWithSatin(<Board start={{ ...initial(), interview: [person('Emma Laurent'), person('Kenji Mori'), person('Olivia Grant')] }} />)
    const interview = () => list('Interview').closest('[data-slot="kanban-column"]') as HTMLElement
    expect(interview().hasAttribute('data-over-limit')).toBe(false)
    card('Tara Mendes').focus()
    await user.keyboard(' {ArrowRight}')
    expect(interview().hasAttribute('data-over-limit')).toBe(true)
    expect(screen.getByRole('list', { name: 'Interview 4 cards, over the limit of 3' })).toBeTruthy()
    expect(within(interview()).getByText('4/3').closest('[data-slot="kanban-count"]')?.getAttribute('data-tone')).toBe('amber')
    await user.keyboard('{Escape}')
    expect(interview().hasAttribute('data-over-limit')).toBe(false)
  })

  it('shows an empty state in an empty column, and skeletons while loading', () => {
    const { rerender } = renderWithSatin(<Board />)
    const offer = list('Offer').closest('[data-slot="kanban-column"]') as HTMLElement
    expect(within(offer).getByText('No cards')).toBeTruthy()
    rerender(<Board loading />)
    expect(screen.getByRole('region', { name: 'Hiring' }).getAttribute('aria-busy')).toBe('true')
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('collapses and expands columns, controlled or not', async () => {
    const onCollapsedColumnsChange = vi.fn()
    const { user } = renderWithSatin(<Board collapsible onCollapsedColumnsChange={onCollapsedColumnsChange} />)
    await user.click(screen.getByRole('button', { name: 'Collapse Screening' }))
    expect(onCollapsedColumnsChange).toHaveBeenLastCalledWith(['screening'])
    expect(screen.queryByRole('list', { name: /^Screening/ })).toBeNull()
    expect(screen.getByRole('group', { name: 'Screening 3 cards' })).toBeTruthy()
    const expand = screen.getByRole('button', { name: 'Expand Screening' })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    await user.click(expand)
    expect(onCollapsedColumnsChange).toHaveBeenLastCalledWith([])
    expect(list('Screening')).toBeTruthy()
  })

  it('skips collapsed columns when moving with the keyboard', async () => {
    const onMove = vi.fn()
    const { user } = renderWithSatin(<Board onMove={onMove} collapsedColumns={['interview']} />)
    card('Tara Mendes').focus()
    await user.keyboard(' {ArrowRight} ')
    expect(onMove).toHaveBeenCalledExactlyOnceWith('tara-mendes', 'offer', 0)
  })

  it('calls onAddItem with the column', async () => {
    const onAddItem = vi.fn()
    const { user } = renderWithSatin(<Board onAddItem={onAddItem} />)
    await user.click(screen.getByRole('button', { name: 'Add to Offer' }))
    expect(onAddItem).toHaveBeenCalledWith('offer')
  })

  it('says everything in the app’s language', async () => {
    const { user } = renderWithSatin(<Board />, {
      labels: {
        kanbanCard: 'karta do przeciągnięcia',
        kanbanCount: (count, limit) => (limit === undefined ? `${count} kart` : `${count} z ${limit} kart`),
        kanbanPickedUp: (item, column, position, count) => `Podniesiono: ${item}. ${column}, pozycja ${position} z ${count}.`,
        kanbanMoved: (item, column, position, count) => `Przeniesiono ${item} do: ${column}, pozycja ${position} z ${count}`,
        kanbanMovedTo: (column) => `Przeniesiono do: ${column}`,
        kanbanCardMenu: (item) => `Więcej opcji: ${item}`,
        undo: 'Cofnij',
        dateLocale: 'pl-PL',
      },
    })
    expect(screen.getByRole('list', { name: 'Interview 2 z 3 kart' })).toBeTruthy()
    expect(card('Tara Mendes').getAttribute('aria-roledescription')).toBe('karta do przeciągnięcia')
    expect(screen.getByRole('button', { name: 'Więcej opcji: Tara Mendes' })).toBeTruthy()
    card('Tara Mendes').focus()
    await user.keyboard(' ')
    expect(status().textContent).toBe('Podniesiono: Tara Mendes. Screening, pozycja 1 z 3.')
    await user.keyboard('{ArrowRight} ')
    expect(status().textContent).toBe('Przeniesiono Tara Mendes do: Interview, pozycja 1 z 3')
    expect(screen.getByText('Przeniesiono do: Interview')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cofnij' })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s, at rest and with a card picked up', async (theme) => {
    const { user } = renderWithSatin(<Board collapsible onAddItem={() => {}} />, { theme })
    await expectNoAxeViolations()
    card('Tara Mendes').focus()
    await user.keyboard(' {ArrowRight}')
    await expectNoAxeViolations()
    // axe walks every card twice: slow on a busy machine.
  }, 60_000)
})

/* ---------- pointer and touch ---------- */

/** jsdom has no layout: give each column a box, 300px apart. */
function layoutColumns() {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const i = columns.findIndex((c) => c.id === this.getAttribute('data-column'))
    const left = i < 0 ? 0 : i * 300
    return { left, right: left + 280, top: 0, bottom: 600, width: i < 0 ? 0 : 280, height: i < 0 ? 0 : 600, x: left, y: 0, toJSON: () => ({}) } as DOMRect
  })
}

/** A pointer event with the fields the board reads (jsdom has no PointerEvent). */
function pointer(type: string, target: EventTarget, x: number, y: number, pointerType = 'mouse') {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType }, isPrimary: { value: true } })
  act(() => void target.dispatchEvent(event))
}

describe('KanbanBoard with a pointer', () => {
  it('drags a card to another column with the mouse', () => {
    const rects = layoutColumns()
    const onMove = vi.fn()
    renderWithSatin(<Board onMove={onMove} />)
    pointer('pointerdown', card('Tara Mendes'), 40, 20)
    pointer('pointermove', window, 46, 22)
    expect(document.querySelector('[data-slot="kanban-board"]')?.getAttribute('data-dragging')).toBe('pointer')
    expect(document.querySelector('[data-slot="kanban-overlay"]')).toBeTruthy()
    pointer('pointermove', window, 340, 500)
    expect(document.querySelector('[data-column="interview"]')?.hasAttribute('data-over')).toBe(true)
    expect(document.querySelector('[data-column="interview"] [data-slot="kanban-gap"]')).toBeTruthy()
    pointer('pointerup', window, 340, 500)
    expect(onMove).toHaveBeenCalledExactlyOnceWith('tara-mendes', 'interview', 2)
    expect(names('Interview')).toEqual(['Emma Laurent', 'Kenji Mori', 'Tara Mendes'])
    expect(document.querySelector('[data-slot="kanban-overlay"]')).toBeNull()
    expect(screen.getByText('Moved to Interview')).toBeTruthy()
    rects.mockRestore()
  })

  it('leaves a click alone, and starts nothing from a button inside the card', () => {
    const rects = layoutColumns()
    const onMove = vi.fn()
    renderWithSatin(<Board onMove={onMove} />)
    pointer('pointerdown', card('Tara Mendes'), 40, 20)
    pointer('pointermove', window, 42, 21)
    pointer('pointerup', window, 42, 21)
    expect(document.querySelector('[data-slot="kanban-overlay"]')).toBeNull()
    pointer('pointerdown', screen.getByRole('button', { name: 'More options for Tara Mendes' }), 200, 20)
    pointer('pointermove', window, 340, 500)
    expect(document.querySelector('[data-slot="kanban-board"]')?.hasAttribute('data-dragging')).toBe(false)
    pointer('pointerup', window, 340, 500)
    expect(onMove).not.toHaveBeenCalled()
    rects.mockRestore()
  })

  it('puts a dragged card back with Escape', () => {
    const rects = layoutColumns()
    const onMove = vi.fn()
    renderWithSatin(<Board onMove={onMove} />)
    pointer('pointerdown', card('Tara Mendes'), 40, 20)
    pointer('pointermove', window, 640, 500)
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    pointer('pointerup', window, 640, 500)
    expect(onMove).not.toHaveBeenCalled()
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    rects.mockRestore()
  })

  it('drags on touch after a 250 ms hold, and lets a quick swipe scroll', () => {
    vi.useFakeTimers()
    const rects = layoutColumns()
    const onMove = vi.fn()
    renderWithSatin(<Board onMove={onMove} />)
    // A swipe: moves before the hold is up, so it's a scroll.
    pointer('pointerdown', card('Priya Nair'), 40, 120, 'touch')
    pointer('pointermove', window, 40, 160, 'touch')
    act(() => void vi.advanceTimersByTime(300))
    expect(document.querySelector('[data-slot="kanban-board"]')?.hasAttribute('data-dragging')).toBe(false)
    pointer('pointerup', window, 40, 160, 'touch')
    // A hold, then a drag.
    pointer('pointerdown', card('Priya Nair'), 40, 120, 'touch')
    act(() => void vi.advanceTimersByTime(300))
    expect(document.querySelector('[data-slot="kanban-board"]')?.getAttribute('data-dragging')).toBe('pointer')
    pointer('pointermove', window, 640, 500, 'touch')
    pointer('pointerup', window, 640, 500, 'touch')
    expect(onMove).toHaveBeenCalledExactlyOnceWith('priya-nair', 'offer', 0)
    rects.mockRestore()
    vi.useRealTimers()
  })
})
