/* Type test, never run: TableGrouped's props (controlled and uncontrolled), its part, refs, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import { Table } from '@uisatin/ui/table'
import { TableGrouped, TableRowToggle, aggregateRows, type TableGroupedColumn } from '../components/table-pro'

interface Deal {
  id: string
  company: string
  stage: 'Lead' | 'Won'
  value: number
  lines?: Deal[]
}

const eur = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' })
const columns: TableGroupedColumn<Deal>[] = [
  { key: 'company', header: 'Company', width: 200 },
  { key: 'value', header: 'Value', align: 'right', format: (v) => eur.format(v), aggregate: 'sum' },
  // A computed column brings its own cell, and its own way to total.
  { key: 'weighted', header: 'Weighted', cell: (d) => eur.format(d.value / 2), aggregate: (rows) => rows.reduce((n, d) => n + d.value / 2, 0) },
]

// @ts-expect-error: no such aggregate
const wrongAggregate: TableGroupedColumn<Deal> = { key: 'value', header: 'Value', aggregate: 'median' }
// @ts-expect-error: no such field, and no cell to compute it
const typo: TableGroupedColumn<Deal> = { key: 'valeu', header: 'Value' }

const ref = React.createRef<HTMLDivElement>()
const rows: Deal[] = []

export const uncontrolled = (
  <TableGrouped<Deal>
    ref={ref}
    label="Deals"
    columns={columns}
    rows={rows}
    getSubRows={(d) => d.lines}
    defaultExpanded={['acme']}
    groupBy="stage"
    groupOrder={['Lead', 'Won']}
    renderGroup={(g) => <strong>{g.value}</strong>}
    defaultCollapsedGroups={['Won']}
    selectable
    defaultSelected={['acme']}
    pinned="start"
    overflow="scroll"
    density="compact"
    footer
    className="w-full"
  />
)

export function Controlled() {
  const [expanded, setExpanded] = React.useState<string[]>([])
  const [collapsed, setCollapsed] = React.useState<string[]>([])
  const [selected, setSelected] = React.useState<string[]>([])
  return (
    <TableGrouped
      columns={columns}
      rows={rows}
      getSubRows={(d) => d.lines}
      expanded={expanded}
      onExpandedChange={setExpanded}
      groupBy="stage"
      collapsedGroups={collapsed}
      onCollapsedGroupsChange={setCollapsed}
      selectable
      selected={selected}
      onSelectedChange={setSelected}
      renderCell={({ row, depth, content }) => (depth === 0 ? <a href={`/deals/${row.id}`}>{content}</a> : content)}
      renderRow={({ rowProps, children }) => <tr {...rowProps}>{children}</tr>}
    />
  )
}

// @ts-expect-error: groupBy names a field of the row
export const wrongGroup = <TableGrouped columns={columns} rows={rows} groupBy="owner" />
// @ts-expect-error: only the first column pins
export const wrongPin = <TableGrouped columns={columns} rows={rows} pinned="end" />
// @ts-expect-error: no such density
export const wrongDensity = <TableGrouped columns={columns} rows={rows} density="comfortable" />

// The part, in a Free Table of your own.
const buttonRef = React.createRef<HTMLButtonElement>()
export const part = (
  <Table<Deal>
    columns={columns}
    rows={rows}
    renderCell={({ row, content }) => (
      <>
        <TableRowToggle ref={buttonRef} expanded={false} onExpandedChange={() => {}} name={row.company} />
        {content}
      </>
    )}
  />
)

export const total: number | null = aggregateRows(rows, columns[1])

export const words = (
  <SatinLabels labels={{ tableRowsUnder: (name) => `Wiersze pod ${name}`, tableGroupCount: (n) => `${n} wierszy`, tableSelectGroup: (name) => `Zaznacz ${name}` }}>
    {uncontrolled}
  </SatinLabels>
)

export { wrongAggregate, typo }
