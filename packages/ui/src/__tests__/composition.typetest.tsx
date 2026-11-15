/* Type test, never run: the props API and the parts API of the same component, side by side. */
import * as React from 'react'
import { Button } from '../components/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../components/dialog'
import { SegmentedControl, SegmentedControlSegment } from '../components/segmented-control'
import { Table, type Column } from '../components/table'
import { SatinLabels } from '../components/labels'

// Dialog: props for the common case…
export const dialogProps = (
  <Dialog trigger={<Button>Rename</Button>} title="Rename file" footer={<Button>Save</Button>}>
    Body
  </Dialog>
)

// …parts for a form around the body and footer; the content panel takes a ref and a variant.
export const dialogParts = (
  <DialogRoot defaultOpen>
    <DialogTrigger asChild>
      <Button>Rename</Button>
    </DialogTrigger>
    <DialogContent variant="destructive" ref={React.createRef<HTMLDivElement>()} aria-describedby={undefined}>
      <form>
        <DialogHeader>
          <DialogTitle>Rename file</DialogTitle>
          <DialogDescription>Names stay unique in a folder.</DialogDescription>
        </DialogHeader>
        <DialogBody>…</DialogBody>
        <DialogFooter start={<span>Draft</span>}>
          <DialogClose asChild>
            <Button type="submit">Save</Button>
          </DialogClose>
        </DialogFooter>
      </form>
    </DialogContent>
  </DialogRoot>
)

// @ts-expect-error: a variant the dialog doesn't have
export const dialogWrongVariant = <DialogContent variant="warning" />

// SegmentedControl: items as data, or segments as children (each needs a value).
export const segmentedItems = <SegmentedControl aria-label="View" items={[{ value: 'list', label: 'List' }]} />
export const segmentedChildren = (
  <SegmentedControl aria-label="View" defaultValue="list">
    <SegmentedControlSegment value="list">List</SegmentedControlSegment>
    <SegmentedControlSegment value="board" disabled>
      Board
    </SegmentedControlSegment>
  </SegmentedControl>
)
// @ts-expect-error: a segment without a value
export const segmentWithoutValue = <SegmentedControlSegment>List</SegmentedControlSegment>

// Table: a row's label, every cell wrapped, every row drawn by the app; all typed by the row.
type Account = { id: string; name: string; seats: number }
const columns: Column<Account>[] = [
  { key: 'name', header: 'Name' },
  { key: 'seats', header: 'Seats', align: 'right' },
]
export const tableSlots = (
  <Table<Account>
    columns={columns}
    rows={[{ id: '1', name: 'Acme', seats: 4 }]}
    selectable
    rowLabel={(row) => row.name}
    renderCell={({ row, column, content }) => (column.key === 'name' ? <a href={`/accounts/${row.id}`}>{content}</a> : content)}
    renderRow={({ row, rowProps, children }) => (
      <tr {...rowProps} data-account={row.name}>
        {children}
      </tr>
    )}
  />
)
// @ts-expect-error: rowLabel gets the row's own fields, and `title` isn't one
export const tableWrongField = <Table<Account> columns={columns} rows={[]} rowLabel={(row) => row.title} />

// SatinLabels: words as strings, words with data as functions.
export const labels = (
  <SatinLabels labels={{ close: 'Zamknij', selectRow: (n) => `Zaznacz wiersz ${n}`, removeItem: (name) => `Usuń ${name}` }}>
    <span />
  </SatinLabels>
)
// @ts-expect-error: selectRow is a function of the row number now
export const labelsOldString = <SatinLabels labels={{ selectRow: 'Zaznacz wiersz' }}>{null}</SatinLabels>
