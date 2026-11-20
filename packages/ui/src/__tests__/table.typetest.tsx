/* Type test, never run: Table's column keys follow the row's fields. */
import { Table, type Column } from '../components/table'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const columns: Column<Invoice>[] = [
  { key: 'customer', header: 'Customer' },
  { key: 'amount', header: 'Amount', align: 'right' },
  // A computed column brings its own cell.
  { key: 'tax', header: 'Tax', cell: (r) => r.amount * 0.23 },
]

// @ts-expect-error: no such field, and no cell to compute it
const typo: Column<Invoice> = { key: 'custmer', header: 'Customer' }

export const ok = <Table<Invoice> columns={columns} rows={[{ id: '1', customer: 'Acme', amount: 10 }]} label="Invoices" />
export { typo }

// Rows of your own in a tfoot, and props for the table element itself.
export const withFooter = (
  <Table<Invoice>
    columns={columns}
    rows={[]}
    footer={
      <tr>
        <th scope="row">Total</th>
        <td>0</td>
      </tr>
    }
    tableProps={{ role: 'treegrid', 'aria-describedby': 'hint' }}
  />
)
