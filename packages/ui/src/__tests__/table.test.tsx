import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Table, type Column } from '../components/table'

type Invoice = { id: string; customer: string; amount: number }
const rows: Invoice[] = [
  { id: '1', customer: 'Acme', amount: 10 },
  { id: '2', customer: 'Globex', amount: 32 },
]
const columns: Column<Invoice>[] = [
  { key: 'customer', header: 'Customer', sortable: true },
  { key: 'amount', header: 'Amount', align: 'right' },
]

const footer = (
  <tr>
    <th scope="row">Total</th>
    <td>42</td>
  </tr>
)

describe('Table', () => {
  it('sorts from a header button and says so with aria-sort', async () => {
    const { user } = renderWithSatin(<Table label="Invoices" columns={columns} rows={rows} />)
    const header = screen.getByRole('columnheader', { name: 'Customer' })
    await user.click(within(header).getByRole('button'))
    expect(header.getAttribute('aria-sort')).toBe('ascending')
    await user.click(within(header).getByRole('button'))
    expect(header.getAttribute('aria-sort')).toBe('descending')
    expect(screen.getAllByRole('row')[1].textContent).toContain('Globex')
  })

  it('puts footer rows in a tfoot and tableProps on the table', () => {
    renderWithSatin(<Table label="Invoices" columns={columns} rows={rows} footer={footer} tableProps={{ role: 'grid', 'aria-describedby': 'hint' }} />)
    const table = screen.getByRole('grid', { name: 'Invoices' })
    expect(table.getAttribute('aria-describedby')).toBe('hint')
    const tfoot = table.querySelector('tfoot')
    expect(tfoot?.textContent).toBe('Total42')
    expect(screen.getByRole('rowheader', { name: 'Total' })).toBeTruthy()
  })

  it('names the row checkboxes after the rows, in the app’s words', () => {
    renderWithSatin(<Table label="Invoices" columns={columns} rows={rows} selectable rowLabel={(r) => r.customer} />, {
      labels: { selectNamedRow: (name) => `Zaznacz ${name}`, selectAllRows: 'Zaznacz wszystkie' },
    })
    expect(screen.getByRole('checkbox', { name: 'Zaznacz Acme' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Zaznacz wszystkie' })).toBeTruthy()
  })

  it('shows `empty` in one cell across the columns while there are no rows', () => {
    const { rerender } = renderWithSatin(<Table label="Invoices" columns={columns} rows={[]} selectable overflow="scroll" empty={<p>No invoices yet</p>} />)
    const cell = screen.getByText('No invoices yet').closest('td')
    expect(cell?.getAttribute('colspan')).toBe('3')
    // The header stays.
    expect(screen.getByRole('columnheader', { name: 'Customer' })).toBeTruthy()
    rerender(<Table label="Invoices" columns={columns} rows={rows} selectable overflow="scroll" empty={<p>No invoices yet</p>} />)
    expect(screen.queryByText('No invoices yet')).toBeNull()
  })

  it.each(['light', 'dark'] as const)('has no axe violations with an empty state in %s', async (theme) => {
    renderWithSatin(<Table label="Invoices" columns={columns} rows={[]} empty={<p>No invoices yet</p>} />, { theme })
    await expectNoAxeViolations()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Table label="Invoices" columns={columns} rows={rows} selectable footer={footer} />, { theme })
    await expectNoAxeViolations()
  })
})
