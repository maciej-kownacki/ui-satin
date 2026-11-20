/* Type test, never run: DataGrid's columns and props, controlled and uncontrolled, its parts, refs, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import { Select } from '@uisatin/ui/select'
import {
  DataGrid,
  DataGridColumnsMenu,
  DataGridToolbar,
  DataGridViewMenu,
  dataGridLabels,
  type DataGridColumn,
  type DataGridSort,
  type DataGridView,
} from '../components/data-grid'

type Stage = 'Screening' | 'Interview' | 'Offer'
interface Candidate {
  id: string
  name: string
  stage: Stage
  applied: Date
  skills: string[]
  score: number
}

const columns: DataGridColumn<Candidate>[] = [
  { key: 'name', header: 'Name', pinned: 'start', hideable: false, sortable: true, width: 220, minWidth: 120 },
  {
    key: 'stage',
    header: 'Stage',
    editable: true,
    // `value` is typed by the key: a Stage here.
    renderCell: ({ value }) => {
      const stage: Stage = value
      return stage
    },
    renderEditor: ({ value, commit, inputProps }) => (
      <Select
        {...inputProps}
        size="sm"
        defaultOpen
        value={value}
        onValueChange={(v) => commit(v as Stage)}
        options={[{ value: 'Interview', label: 'Interview' }]}
      />
    ),
  },
  { key: 'applied', header: 'Applied', sortable: true, renderCell: ({ value }) => value.toDateString() },
  { key: 'skills', header: 'Skills', renderCell: ({ value }) => value.join(', ') },
  { key: 'score', header: 'Score', align: 'right', editable: (row) => row.stage !== 'Offer', pinned: 'end' },
  // A computed column: a key the row doesn't have, so it says so and draws its own cells.
  { key: 'actions', computed: true, header: 'Actions', renderCell: ({ row }) => row.name },
]

// @ts-expect-error: a key the row doesn't have is a typo, unless the column is computed
const typo: DataGridColumn<Candidate> = { key: 'nmae', header: 'Name' }

// @ts-expect-error: pinned is 'start' or 'end'
const wrongPin: DataGridColumn<Candidate> = { key: 'name', header: 'Name', pinned: 'left' }

// @ts-expect-error: the stage cell's value is a Stage, not a number
const wrongValue: DataGridColumn<Candidate> = { key: 'stage', header: 'Stage', renderCell: ({ value }: { value: number }) => value }

const rows: Candidate[] = []
const rootRef = React.createRef<HTMLDivElement>()
const buttonRef = React.createRef<HTMLButtonElement>()

// Uncontrolled: every column feature from its default.
export const uncontrolled = (
  <DataGrid
    ref={rootRef}
    label="Candidates"
    columns={columns}
    rows={rows}
    selectable
    defaultSort={{ key: 'name', direction: 'asc' }}
    defaultSelection={['a']}
    defaultColumnVisibility={{ skills: false }}
    defaultColumnOrder={['stage', 'name']}
    defaultColumnSizing={{ name: 240 }}
    density="compact"
    virtualize
    className="h-[480px]"
  />
)

// Controlled: the app holds every piece of state.
export function Controlled() {
  const [sort, setSort] = React.useState<DataGridSort>(null)
  const [selection, setSelection] = React.useState<string[]>([])
  const [visibility, setVisibility] = React.useState<Record<string, boolean>>({})
  const [order, setOrder] = React.useState<string[]>([])
  const [sizing, setSizing] = React.useState<Record<string, number>>({})
  const [page, setPage] = React.useState(1)
  return (
    <DataGrid
      columns={columns}
      rows={rows}
      getRowId={(c) => c.id}
      rowLabel={(c) => c.name}
      sort={sort}
      onSortChange={setSort}
      manualSort
      selectable
      selection={selection}
      onSelectionChange={setSelection}
      columnVisibility={visibility}
      onColumnVisibilityChange={setVisibility}
      columnOrder={order}
      onColumnOrderChange={setOrder}
      columnSizing={sizing}
      onColumnSizingChange={setSizing}
      pageSize={50}
      page={page}
      onPageChange={setPage}
      onCellEdit={async (rowId: string, key: string, value: unknown) => {
        void [rowId, key, value]
      }}
      loading={false}
      error="Network error"
      onRetry={() => {}}
      filtered
      onClearFilters={() => {}}
      empty={<p>No candidates yet</p>}
      noResults={<p>No candidates match</p>}
    />
  )
}

type Filters = { stage: Stage[] }
const views: DataGridView<Filters>[] = [{ id: 'mine', name: 'My interviews', sort: { key: 'name', direction: 'asc' }, columnVisibility: { source: false }, filters: { stage: ['Interview'] } }]

// The parts, in the toolbar slot.
export const parts = (
  <DataGrid
    columns={columns}
    rows={rows}
    toolbar={
      <DataGridToolbar aria-label="Candidate tools">
        <DataGridColumnsMenu ref={buttonRef} size="md" />
        <DataGridViewMenu<Filters>
          views={views}
          onViewsChange={(next) => next.map((v) => v.filters?.stage)}
          value="mine"
          onValueChange={(id, view) => [id, view?.filters?.stage]}
          filters={{ stage: ['Interview'] }}
        />
        <DataGridViewMenu defaultViews={views} defaultValue={null} />
      </DataGridToolbar>
    }
  />
)

// @ts-expect-error: rows are required
export const missing = <DataGrid columns={columns} />

// @ts-expect-error: density is compact or default
export const wrongDensity = <DataGrid columns={columns} rows={rows} density="comfortable" />

// Its words join SatinLabels.
export const translated = (
  <SatinLabels
    labels={{
      dataGridColumns: 'Kolumny',
      dataGridResizeColumn: (column) => `Zmień szerokość: ${column}`,
      dataGridView: (name, modified) => `Widok: ${name}${modified ? ', niezapisane zmiany' : ''}`,
    }}
  >
    {parts}
  </SatinLabels>
)

export const defaults: string = dataGridLabels.dataGridSaveView
// @ts-expect-error: a computed column draws its own cells
const computedWithout: DataGridColumn<Candidate> = { key: 'actions', computed: true, header: 'Actions' }

void [typo, wrongPin, wrongValue, computedWithout]
