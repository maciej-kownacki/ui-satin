import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Badge } from '@uisatin/ui/badge'
import { TableGrouped, aggregateRows, type TableGroupedColumn } from '../components/table-pro'

type Deal = { id: string; company: string; stage: string; value: number; items?: Deal[] }

const deals: Deal[] = [
  {
    id: 'acme',
    company: 'Acme Corp',
    stage: 'Proposal',
    value: 48000,
    items: [
      { id: 'acme-licence', company: 'Platform licence', stage: 'Proposal', value: 36000 },
      { id: 'acme-onboarding', company: 'Onboarding', stage: 'Proposal', value: 12000 },
    ],
  },
  { id: 'globex', company: 'Globex', stage: 'Qualified', value: 22500 },
  { id: 'initech', company: 'Initech', stage: 'Proposal', value: 31200 },
]

const eur = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const columns: TableGroupedColumn<Deal>[] = [
  { key: 'company', header: 'Company', sortable: true },
  { key: 'stage', header: 'Stage' },
  { key: 'value', header: 'Value', align: 'right', sortable: true, format: (v) => eur.format(v), aggregate: 'sum' },
]

const subRows = (d: Deal) => d.items
const bodyRows = () => screen.getAllByRole('row').filter((r) => r.closest('tbody'))
const rowNamed = (name: string) => bodyRows().find((r) => r.textContent?.includes(name))!

describe('TableGrouped', () => {
  it('opens a row onto its sub-rows from the chevron, and says so', async () => {
    const onExpandedChange = vi.fn()
    const { user } = renderWithSatin(<TableGrouped label="Deals" columns={columns} rows={deals} getSubRows={subRows} onExpandedChange={onExpandedChange} />)
    expect(screen.getByRole('treegrid', { name: 'Deals' })).toBeTruthy()
    const toggle = screen.getByRole('button', { name: 'Rows under Acme Corp' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Onboarding')).toBeNull()
    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(onExpandedChange).toHaveBeenLastCalledWith(['acme'])
    const child = rowNamed('Onboarding')
    expect(child.getAttribute('aria-level')).toBe('2')
    expect(child.getAttribute('aria-setsize')).toBe('2')
    expect(rowNamed('Acme Corp').getAttribute('aria-expanded')).toBe('true')
    // Rows without sub-rows have no chevron and no aria-expanded.
    expect(rowNamed('Globex').hasAttribute('aria-expanded')).toBe(false)
    // The new rows fade in.
    expect(child.hasAttribute('data-enter')).toBe(true)
  })

  it('is controlled through expanded', async () => {
    function Controlled() {
      const [expanded, setExpanded] = React.useState<string[]>(['acme'])
      return (
        <>
          <button type="button" onClick={() => setExpanded([])}>
            Close all
          </button>
          <TableGrouped label="Deals" columns={columns} rows={deals} getSubRows={subRows} expanded={expanded} onExpandedChange={setExpanded} />
        </>
      )
    }
    const { user } = renderWithSatin(<Controlled />)
    expect(screen.getByText('Onboarding')).toBeTruthy()
    // Opened from the start: no fade.
    expect(rowNamed('Onboarding').hasAttribute('data-enter')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Close all' }))
    expect(screen.queryByText('Onboarding')).toBeNull()
  })

  it('moves between rows with the arrows, opens with → and closes with ←, as a treegrid', async () => {
    const { user } = renderWithSatin(<TableGrouped label="Deals" columns={columns} rows={deals} getSubRows={subRows} />)
    // One row takes Tab, after the two sort buttons.
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(rowNamed('Acme Corp'))
    expect(bodyRows().filter((r) => r.tabIndex === 0)).toHaveLength(1)
    await user.keyboard('{ArrowRight}')
    expect(rowNamed('Acme Corp').getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(rowNamed('Acme Corp'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(rowNamed('Platform licence'))
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(rowNamed('Onboarding'))
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(rowNamed('Acme Corp'))
    await user.keyboard('{ArrowLeft}')
    expect(screen.queryByText('Onboarding')).toBeNull()
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(rowNamed('Initech'))
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(rowNamed('Acme Corp'))
    await user.keyboard('{Enter}')
    expect(screen.getByText('Onboarding')).toBeTruthy()
    // The row that had focus keeps Tab when focus leaves and comes back.
    expect(rowNamed('Acme Corp').tabIndex).toBe(0)
  })

  it('mirrors → and ← right to left', async () => {
    const { user } = renderWithSatin(<TableGrouped label="Deals" columns={columns} rows={deals} getSubRows={subRows} />, { dir: 'rtl' })
    rowNamed('Acme Corp').focus()
    await user.keyboard('{ArrowLeft}')
    expect(rowNamed('Acme Corp').getAttribute('aria-expanded')).toBe('true')
    await user.keyboard('{ArrowRight}')
    expect(rowNamed('Acme Corp').getAttribute('aria-expanded')).toBe('false')
  })

  it('groups rows with a header, a count and the column’s subtotal in its format', async () => {
    const { user } = renderWithSatin(
      <TableGrouped label="Deals" columns={columns} rows={deals} groupBy="stage" groupOrder={['Qualified', 'Proposal']} renderGroup={(g) => <Badge>{g.value}</Badge>} />,
    )
    const groups = bodyRows().filter((r) => r.hasAttribute('data-group'))
    expect(groups.map((g) => within(g).getByRole('rowheader').textContent)).toEqual(['Qualified11 row', 'Proposal22 rows'])
    // The count shows as a number and reads as "2 rows".
    expect(within(groups[1]).getByText('2', { ignore: '.sr-only' }).getAttribute('aria-hidden')).toBe('true')
    expect(within(groups[1]).getByText('2 rows').className).toContain('sr-only')
    expect(groups[1].getAttribute('aria-level')).toBe('1')
    expect(rowNamed('Initech').getAttribute('aria-level')).toBe('2')
    expect(groups[1].textContent).toContain('€79,200')
    // Closing a group hides its rows; its chevron and the row say so.
    await user.click(screen.getByRole('button', { name: 'Rows under Proposal' }))
    expect(screen.queryByText('Initech')).toBeNull()
    expect(groups[1].getAttribute('aria-expanded')).toBe('false')
    // A click anywhere on the header opens it again.
    await user.click(within(groups[1]).getByText('€79,200'))
    expect(screen.getByText('Initech')).toBeTruthy()
  })

  it('sorts inside each group, keeping the groups in place', async () => {
    const { user } = renderWithSatin(<TableGrouped label="Deals" columns={columns} rows={deals} groupBy="stage" />)
    const header = screen.getByRole('columnheader', { name: 'Value' })
    await user.click(within(header).getByRole('button'))
    await user.click(within(header).getByRole('button'))
    expect(header.getAttribute('aria-sort')).toBe('descending')
    const names = bodyRows().map((r) => r.querySelector('th, td:first-child')?.textContent)
    expect(names[0]).toContain('Proposal')
    expect(names.slice(1, 3)).toEqual(['Acme Corp', 'Initech'])
    expect(names[3]).toContain('Qualified')
  })

  it('totals each column in a tfoot, in the column’s format', () => {
    renderWithSatin(<TableGrouped label="Deals" columns={columns} rows={deals} getSubRows={subRows} defaultExpanded={['acme']} footer />)
    const totals = screen.getByRole('rowheader', { name: 'Total' }).closest('tr')!
    expect(totals.closest('tfoot')).toBeTruthy()
    // Sub-rows aren't counted twice.
    expect(totals.textContent).toBe('Total€101,700')
  })

  it('picks a whole group from its checkbox, and every row from the header', async () => {
    const onSelectedChange = vi.fn()
    const { user } = renderWithSatin(
      <TableGrouped label="Deals" columns={columns} rows={deals} groupBy="stage" selectable defaultCollapsedGroups={['Qualified']} onSelectedChange={onSelectedChange} />,
    )
    await user.click(screen.getByRole('checkbox', { name: 'Select all in Proposal' }))
    expect(onSelectedChange).toHaveBeenLastCalledWith(['acme', 'initech'])
    expect(screen.getByRole('checkbox', { name: 'Select all rows' }).getAttribute('aria-checked')).toBe('mixed')
    // The header picks every row, those of the closed group too.
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    expect(new Set(onSelectedChange.mock.lastCall![0])).toEqual(new Set(['acme', 'initech', 'globex']))
    await user.click(screen.getByRole('checkbox', { name: 'Select Initech' }))
    expect(screen.getByRole('checkbox', { name: 'Select all in Proposal' }).getAttribute('aria-checked')).toBe('mixed')
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    expect(onSelectedChange).toHaveBeenLastCalledWith(expect.arrayContaining(['acme', 'initech', 'globex']))
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    expect(onSelectedChange).toHaveBeenLastCalledWith([])
  })

  it('selects the focused row with Space and says it is selected', async () => {
    const { user } = renderWithSatin(<TableGrouped label="Deals" columns={columns} rows={deals} getSubRows={subRows} selectable />)
    rowNamed('Globex').focus()
    await user.keyboard(' ')
    expect(rowNamed('Globex').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('checkbox', { name: 'Select Globex' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('treegrid').getAttribute('aria-multiselectable')).toBe('true')
  })

  it('stays a plain table without sub-rows or groups, with density and pinning as data attributes', () => {
    const { container } = renderWithSatin(<TableGrouped label="Deals" columns={columns} rows={deals} density="compact" pinned="start" footer />)
    expect(screen.getByRole('table', { name: 'Deals' })).toBeTruthy()
    expect(bodyRows().every((r) => !r.hasAttribute('tabindex'))).toBe(true)
    const root = container.querySelector('[data-slot="table-pro"]')!
    expect(root.getAttribute('data-density')).toBe('compact')
    expect(root.getAttribute('data-pinned')).toBe('start')
    expect(root.hasAttribute('data-sticky')).toBe(true)
  })

  it('speaks the app’s language', () => {
    renderWithSatin(<TableGrouped label="Transakcje" columns={columns} rows={deals} groupBy="stage" getSubRows={subRows} footer selectable />, {
      labels: {
        tableRowsUnder: (name) => `Wiersze pod ${name}`,
        tableGroupCount: (count) => `${count} wiersze`,
        tableSelectGroup: (name) => `Zaznacz wszystko w ${name}`,
        total: 'Razem',
      },
    })
    expect(screen.getByRole('button', { name: 'Wiersze pod Acme Corp' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Wiersze pod Proposal' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Zaznacz wszystko w Proposal' })).toBeTruthy()
    expect(screen.getByRole('rowheader', { name: 'Razem' })).toBeTruthy()
    expect(screen.getByText('2 wiersze')).toBeTruthy()
  })

  it('aggregates with sum, avg, min, max, count or a function', () => {
    const at = (aggregate: TableGroupedColumn<Deal>['aggregate']) => aggregateRows(deals, { key: 'value', aggregate })
    expect([at('sum'), at('avg'), at('min'), at('max'), at('count'), at((rows) => rows.length * 2), at(undefined)]).toEqual([
      101700, 33900, 22500, 48000, 3, 6, null,
    ])
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <TableGrouped
        label="Deals"
        columns={columns}
        rows={deals}
        groupBy="stage"
        getSubRows={subRows}
        defaultExpanded={['acme']}
        selectable
        pinned="start"
        overflow="scroll"
        footer
      />,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
