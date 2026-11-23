import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Badge } from '@uisatin/ui/badge'
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
const columnOf = (id: string) => document.querySelector(`[data-column="${id}"]`) as HTMLElement
/** Interview takes only people who had a phone screen; Emma had one. */
const canMove = (p: Person, to: string) => (to === 'interview' && p.name !== 'Emma Laurent' ? 'Phone screen first' : true)
/** A confirmation the test answers by hand. */
function deferred() {
  const answers: ((ok: boolean) => void)[] = []
  const confirmMove = vi.fn((_item: Person, _to: string, _index: number) => new Promise<boolean>((resolve) => void answers.push(resolve)))
  return { confirmMove, answer: (ok: boolean) => act(async () => answers.shift()?.(ok)) }
}
/** A card the way the sales pipeline uses it: status, labelled fields, age. */
const richCard = (p: Person) => (
  <KanbanCard
    title={p.name}
    logo={<span aria-hidden>{p.name[0]}</span>}
    status={p.name === 'Tara Mendes' ? <Badge size="sm" tone="brand">Nudged · 2h</Badge> : undefined}
    fields={[
      { icon: <svg aria-hidden />, label: 'Role', value: 'Product designer' },
      { label: 'Next step', value: p.name === 'Tara Mendes' ? 'Set next step…' : 'Call on Tue', placeholder: p.name === 'Tara Mendes' },
    ]}
    footer={<Badge size="sm">Referral</Badge>}
    age={p.name === 'Tara Mendes' ? '16d' : '2d'}
    stale={p.name === 'Tara Mendes'}
  />
)

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
    // The keyboard's pick-up doesn't lean, and its moves don't spring.
    expect(card('Tara Mendes').hasAttribute('data-drag')).toBe(false)

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
    expect(document.querySelector('[data-slot="kanban-item"][data-drag]')).toBeNull()
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

  it.each(['light', 'dark'] as const)('has no axe violations in %s: at rest, lifted over a refused column, and waiting', async (theme) => {
    const { confirmMove } = deferred()
    const { user } = renderWithSatin(
      <Board
        collapsible
        onAddItem={() => {}}
        onShowMore={() => {}}
        columns={[...columns.slice(0, 2), { ...columns[2]!, more: 2 }]}
        canMove={canMove}
        confirmMove={confirmMove}
        renderCard={richCard}
      />,
      { theme },
    )
    await expectNoAxeViolations()
    card('Tara Mendes').focus()
    await user.keyboard(' {ArrowRight}')
    await expectNoAxeViolations()
    await user.keyboard('{ArrowRight} ')
    expect(card('Tara Mendes').getAttribute('aria-busy')).toBe('true')
    await expectNoAxeViolations()
    // axe walks every card three times: slow on a busy machine.
  }, 60_000)
})

describe('KanbanBoard: more cards than loaded', () => {
  const more: KanbanColumn[] = [{ ...columns[0]!, more: 2 }, { ...columns[1]!, more: 1 }, { ...columns[2]!, more: 3 }]

  it('counts them, ends the column with "+N more", and shows no empty state while there are some', () => {
    renderWithSatin(<Board columns={more} />)
    expect(screen.getByRole('list', { name: 'Screening 5 cards' })).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Interview 3 of 3 cards' })).toBeTruthy()
    expect(within(columnOf('screening')).getByText('5')).toBeTruthy()
    // Without onShowMore it's text.
    expect(within(columnOf('screening')).getByText('+2 more').tagName).toBe('P')
    expect(screen.queryByRole('button', { name: '+2 more' })).toBeNull()
    // Offer holds no loaded card but three more: no "No cards".
    expect(within(columnOf('offer')).queryByText('No cards')).toBeNull()
    expect(within(columnOf('offer')).getByText('+3 more')).toBeTruthy()
  })

  it('makes "+N more" a button with onShowMore', async () => {
    const onShowMore = vi.fn()
    const { user } = renderWithSatin(<Board columns={more} onShowMore={onShowMore} />)
    await user.click(within(columnOf('offer')).getByRole('button', { name: '+3 more' }))
    expect(onShowMore).toHaveBeenCalledExactlyOnceWith('offer')
  })

  it('counts them in what it reads out, and turns the count amber past the limit', async () => {
    const onMove = vi.fn()
    const { user } = renderWithSatin(<Board columns={more} onMove={onMove} />)
    card('Tara Mendes').focus()
    await user.keyboard(' ')
    expect(status().textContent).toBe('Picked up Tara Mendes. Screening, position 1 of 5.')
    await user.keyboard('{ArrowRight}')
    expect(status().textContent).toBe('Interview, position 1 of 4')
    expect(screen.getByRole('list', { name: 'Interview 4 cards, over the limit of 3' })).toBeTruthy()
    await user.keyboard('{End} ')
    // The last place among the loaded cards: index 2, before the one not loaded.
    expect(onMove).toHaveBeenCalledExactlyOnceWith('tara-mendes', 'interview', 2)
    expect(status().textContent).toBe('Moved Tara Mendes to Interview, position 3 of 4')
  })
})

describe('KanbanBoard: canMove', () => {
  it('dims refused columns from the lift, reads the reason on entering one, keeps the card up on Space, and cancels with Escape', async () => {
    const onMove = vi.fn()
    const check = vi.fn(canMove)
    const { user } = renderWithSatin(<Board onMove={onMove} canMove={check} />)
    card('Tara Mendes').focus()
    await user.keyboard(' ')
    // Asked once per other column, at the lift.
    expect(check.mock.calls.map(([, to]) => to)).toEqual(['interview', 'offer'])
    expect(columnOf('interview').hasAttribute('data-refused')).toBe(true)
    expect(columnOf('offer').hasAttribute('data-refused')).toBe(false)

    await user.keyboard('{ArrowRight}')
    expect(status().textContent).toBe("Can't move Tara Mendes to Interview: Phone screen first")
    expect(within(card('Tara Mendes')).getByText('Phone screen first')).toBeTruthy()
    // No highlight there, and the count leaves the card out.
    expect(columnOf('interview').hasAttribute('data-over')).toBe(false)
    expect(screen.getByRole('list', { name: 'Interview 2 of 3 cards' })).toBeTruthy()

    const said = status().firstElementChild
    await user.keyboard(' ')
    expect(card('Tara Mendes').hasAttribute('data-lifted')).toBe(true)
    expect(onMove).not.toHaveBeenCalled()
    // The same words again, in a new element, so a screen reader reads them again.
    expect(status().textContent).toBe("Can't move Tara Mendes to Interview: Phone screen first")
    expect(status().firstElementChild).not.toBe(said)

    // Passable: Offer is next.
    await user.keyboard('{ArrowRight}')
    expect(status().textContent).toBe('Offer, position 1 of 1')
    await user.keyboard('{ArrowLeft}{Escape}')
    expect(onMove).not.toHaveBeenCalled()
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    expect(columnOf('interview').hasAttribute('data-refused')).toBe(false)
    expect(check).toHaveBeenCalledTimes(2)
  })

  it('lists refused columns in the ⋯ menu with the reason, and refuses the move from there', async () => {
    const onMove = vi.fn()
    const { user } = renderWithSatin(<Board onMove={onMove} canMove={canMove} />)
    await user.click(screen.getByRole('button', { name: 'More options for Daniel Kim' }))
    const interview = within(screen.getByRole('menu')).getByRole('menuitem', { name: /^Interview/ })
    expect(interview.textContent).toBe('InterviewPhone screen first')
    expect(interview.hasAttribute('data-disabled')).toBe(false)
    await user.click(interview)
    expect(onMove).not.toHaveBeenCalled()
    expect(status().textContent).toBe("Can't move Daniel Kim to Interview: Phone screen first")
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
  })
})

describe('KanbanBoard: confirmMove', () => {
  it('puts the card back when it answers false', async () => {
    const onMove = vi.fn()
    const confirmMove = vi.fn(() => false)
    const { user } = renderWithSatin(<Board onMove={onMove} confirmMove={confirmMove} />)
    card('Tara Mendes').focus()
    await user.keyboard(' {ArrowRight} ')
    expect(confirmMove).toHaveBeenCalledExactlyOnceWith({ id: 'tara-mendes', name: 'Tara Mendes' }, 'interview', 0)
    expect(onMove).not.toHaveBeenCalled()
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    expect(status().textContent).toBe('Move cancelled. Tara Mendes is back in Screening, position 1 of 3.')
    expect(document.activeElement).toBe(card('Tara Mendes'))
    expect(screen.queryByText('Moved to Interview')).toBeNull()
  })

  it('keeps the card at its new place, busy, while a promise waits, then moves it on true', async () => {
    const onMove = vi.fn()
    const { confirmMove, answer } = deferred()
    const { user } = renderWithSatin(<Board onMove={onMove} confirmMove={confirmMove} />)
    card('Tara Mendes').focus()
    await user.keyboard(' {ArrowRight} ')
    expect(onMove).not.toHaveBeenCalled()
    expect(names('Interview')).toEqual(['Tara Mendes', 'Emma Laurent', 'Kenji Mori'])
    expect(card('Tara Mendes').hasAttribute('data-pending')).toBe(true)
    expect(card('Tara Mendes').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('list', { name: 'Interview 3 of 3 cards' })).toBeTruthy()
    // It takes no keys meanwhile.
    await user.keyboard(' ')
    expect(card('Tara Mendes').hasAttribute('data-lifted')).toBe(false)

    await answer(true)
    expect(onMove).toHaveBeenCalledExactlyOnceWith('tara-mendes', 'interview', 0)
    expect(card('Tara Mendes').hasAttribute('data-pending')).toBe(false)
    expect(names('Interview')).toEqual(['Tara Mendes', 'Emma Laurent', 'Kenji Mori'])
    expect(status().textContent).toBe('Moved Tara Mendes to Interview, position 1 of 3')
    expect(screen.getByText('Moved to Interview')).toBeTruthy()
    expect(document.activeElement).toBe(card('Tara Mendes'))
  })

  it('puts the card back on false, and gives it focus: moved by keys', async () => {
    const onMove = vi.fn()
    const { confirmMove, answer } = deferred()
    const { user } = renderWithSatin(<Board onMove={onMove} confirmMove={confirmMove} />)
    card('Priya Nair').focus()
    await user.keyboard(' {ArrowRight}{ArrowRight} ')
    expect(names('Offer')).toEqual(['Priya Nair'])
    await answer(false)
    expect(onMove).not.toHaveBeenCalled()
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    expect(names('Offer')).toEqual([])
    expect(status().textContent).toBe('Move cancelled. Priya Nair is back in Screening, position 2 of 3.')
    expect(document.activeElement).toBe(card('Priya Nair'))
  })

  it('puts the card back on false, and gives it focus: moved from the ⋯ menu', async () => {
    const onMove = vi.fn()
    const { confirmMove, answer } = deferred()
    const { user } = renderWithSatin(<Board onMove={onMove} confirmMove={confirmMove} />)
    await user.click(screen.getByRole('button', { name: 'More options for Daniel Kim' }))
    await user.click(screen.getByRole('menuitem', { name: 'Offer' }))
    expect(confirmMove).toHaveBeenCalledExactlyOnceWith({ id: 'daniel-kim', name: 'Daniel Kim' }, 'offer', 0)
    expect(names('Offer')).toEqual(['Daniel Kim'])
    await answer(false)
    expect(onMove).not.toHaveBeenCalled()
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    expect(status().textContent).toBe('Move cancelled. Daniel Kim is back in Screening, position 3 of 3.')
    expect(document.activeElement).toBe(card('Daniel Kim'))
  })

  it('asks nothing for Undo', async () => {
    const onMove = vi.fn()
    const confirmMove = vi.fn(() => true)
    const { user } = renderWithSatin(<Board onMove={onMove} confirmMove={confirmMove} />)
    card('Priya Nair').focus()
    await user.keyboard(' {ArrowRight} ')
    expect(onMove).toHaveBeenCalledExactlyOnceWith('priya-nair', 'interview', 1)
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onMove).toHaveBeenLastCalledWith('priya-nair', 'screening', 1)
    expect(confirmMove).toHaveBeenCalledTimes(1)
  })
})

describe('KanbanCard', () => {
  it('lists its fields as terms and values, and describes the card with its status and staleness', () => {
    renderWithSatin(<Board renderCard={richCard} />)
    const tara = card('Tara Mendes')
    expect(within(tara).getAllByRole('term').map((dt) => dt.textContent)).toEqual(['Role', 'Next step'])
    expect(within(tara).getAllByRole('definition').map((dd) => dd.textContent)).toEqual(['Product designer', 'Set next step…'])
    // A placeholder reads muted, a value doesn't.
    expect(within(tara).getByText('Set next step…').className).toContain('text-text-muted')
    expect(within(card('Priya Nair')).getByText('Call on Tue').className).not.toContain('text-text-muted')
    // Stale: the age in an amber Badge, with "stale" for screen readers.
    const age = within(tara).getByText('16d').closest('[data-slot="badge"]')
    expect(age?.getAttribute('data-tone')).toBe('amber')
    expect(age?.querySelector('.sr-only')?.textContent).toBe(' stale')
    expect(within(card('Priya Nair')).getByText('2d').closest('[data-slot="badge"]')).toBeNull()
    expect(screen.getByRole('listitem', { name: 'Tara Mendes', description: /^Nudged · 2h stale Press Space to pick it up\./ })).toBeTruthy()
    expect(screen.getByRole('listitem', { name: 'Priya Nair', description: /^\s*Press Space to pick it up\./ })).toBeTruthy()
  })

  it('lights up and is read out when its changed key changes, never on first render nor after a move', async () => {
    const version = (v: Record<string, number>) => (p: Person) => <KanbanCard title={p.name} changed={v[p.id] ?? 1} />
    const flash = (name: string) => card(name).querySelector('[data-slot="kanban-card-flash"]')
    const { user, rerender } = renderWithSatin(<Board renderCard={version({})} />)
    expect(document.querySelectorAll('[data-slot="kanban-card-flash"]')).toHaveLength(0)

    // A move remounts the card in its new column: still nothing.
    card('Tara Mendes').focus()
    await user.keyboard(' {ArrowRight} ')
    expect(names('Interview')).toContain('Tara Mendes')
    expect(document.querySelectorAll('[data-slot="kanban-card-flash"]')).toHaveLength(0)

    rerender(<Board renderCard={version({ 'tara-mendes': 2 })} />)
    expect(flash('Tara Mendes')).toBeTruthy()
    expect(flash('Tara Mendes')?.getAttribute('aria-hidden')).toBe('true')
    expect(flash('Priya Nair')).toBeNull()
    expect(status().textContent).toBe('Tara Mendes was updated')
  })
})

describe('KanbanBoard and KanbanCard: their new words', () => {
  it('say them in the app’s language', async () => {
    const { user, rerender } = renderWithSatin(
      <Board columns={[{ ...columns[0]!, more: 2 }, ...columns.slice(1)]} canMove={canMove} renderCard={richCard} />,
      {
        labels: {
          kanbanMore: (count) => `+${count} więcej`,
          kanbanRefused: (item, column, reason) => `Nie można przenieść ${item} do: ${column}. ${reason}`,
          kanbanStale: 'bez ruchu',
          kanbanUpdated: (item) => `Zmieniono: ${item}`,
        },
      },
    )
    expect(within(columnOf('screening')).getByText('+2 więcej')).toBeTruthy()
    expect(screen.getByRole('listitem', { name: 'Tara Mendes', description: /^Nudged · 2h bez ruchu / })).toBeTruthy()
    card('Tara Mendes').focus()
    await user.keyboard(' {ArrowRight}')
    expect(status().textContent).toBe('Nie można przenieść Tara Mendes do: Interview. Phone screen first')
    await user.keyboard('{Escape}')
    rerender(<Board renderCard={(p) => <KanbanCard title={p.name} changed={1} />} />)
    rerender(<Board renderCard={(p) => <KanbanCard title={p.name} changed={p.name === 'Kenji Mori' ? 2 : 1} />} />)
    expect(status().textContent).toBe('Zmieniono: Kenji Mori')
  })
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
    // The card the pointer carries leans (drag.css).
    const overlay = document.querySelector('[data-slot="kanban-overlay"]') as HTMLElement
    expect(overlay).toBeTruthy()
    expect(overlay.classList.contains('satin-drag')).toBe(true)
    expect(overlay.getAttribute('data-drag')).toBe('lifted')
    pointer('pointermove', window, 340, 500)
    expect(document.querySelector('[data-column="interview"]')?.hasAttribute('data-over')).toBe(true)
    expect(document.querySelector('[data-column="interview"] [data-slot="kanban-gap"]')).toBeTruthy()
    pointer('pointerup', window, 340, 500)
    expect(onMove).toHaveBeenCalledExactlyOnceWith('tara-mendes', 'interview', 2)
    expect(names('Interview')).toEqual(['Emma Laurent', 'Kenji Mori', 'Tara Mendes'])
    expect(document.querySelector('[data-slot="kanban-overlay"]')).toBeNull()
    // Dropped, it springs into its place from where it was let go.
    expect(card('Tara Mendes').getAttribute('data-flip')).toBe('settle')
    expect(card('Tara Mendes').getAttribute('data-drag')).toBe('settle')
    expect(screen.getByText('Moved to Interview')).toBeTruthy()
    rects.mockRestore()
  })

  it('dims a refused column, shows the reason under the card over it, and puts the card back when dropped there', () => {
    const rects = layoutColumns()
    const onMove = vi.fn()
    renderWithSatin(<Board onMove={onMove} canMove={canMove} />)
    pointer('pointerdown', card('Tara Mendes'), 40, 20)
    pointer('pointermove', window, 46, 22)
    expect(columnOf('interview').hasAttribute('data-refused')).toBe(true)
    pointer('pointermove', window, 340, 500)
    expect(columnOf('interview').hasAttribute('data-over')).toBe(false)
    expect(columnOf('interview').querySelector('[data-slot="kanban-gap"]')).toBeNull()
    const overlay = document.querySelector('[data-slot="kanban-overlay"]') as HTMLElement
    expect(within(overlay).getByText('Phone screen first')).toBeTruthy()
    pointer('pointerup', window, 340, 500)
    expect(onMove).not.toHaveBeenCalled()
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    expect(status().textContent).toBe("Can't move Tara Mendes to Interview: Phone screen first")
    expect(document.querySelector('[data-slot="kanban-overlay"]')).toBeNull()
    rects.mockRestore()
  })

  it('puts a dropped card back when confirmMove says no', () => {
    const rects = layoutColumns()
    const onMove = vi.fn()
    const confirmMove = vi.fn(() => false)
    renderWithSatin(<Board onMove={onMove} confirmMove={confirmMove} />)
    pointer('pointerdown', card('Tara Mendes'), 40, 20)
    pointer('pointermove', window, 46, 22)
    pointer('pointermove', window, 640, 500)
    pointer('pointerup', window, 640, 500)
    expect(confirmMove).toHaveBeenCalledExactlyOnceWith({ id: 'tara-mendes', name: 'Tara Mendes' }, 'offer', 0)
    expect(onMove).not.toHaveBeenCalled()
    expect(names('Screening')).toEqual(['Tara Mendes', 'Priya Nair', 'Daniel Kim'])
    expect(status().textContent).toBe('Move cancelled. Tara Mendes is back in Screening, position 1 of 3.')
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
