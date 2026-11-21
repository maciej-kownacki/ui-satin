'use client'

import * as React from 'react'
import { Search, TableRows } from 'iconoir-react'
import { DropdownMenu as DropdownPrimitive } from 'radix-ui'
import { StatusIcon } from '@uisatin/ui/alert'
import { Button, type ButtonProps } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from '@uisatin/ui/dialog'
import { Dot } from '@uisatin/ui/dot'
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem, MenuItemContent, menuItemClass } from '@uisatin/ui/dropdown'
import { EmptyState } from '@uisatin/ui/empty-state'
import { Input } from '@uisatin/ui/input'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Pagination } from '@uisatin/ui/pagination'
import { SelectChevron } from '@uisatin/ui/select'
import { Skeleton } from '@uisatin/ui/skeleton'
import { Spinner } from '@uisatin/ui/spinner'
import type { Sort } from '@uisatin/ui/table'
import { Tooltip } from '@uisatin/ui/tooltip'

/**
 * DataGrid: the table for records people work in. Table's look (the header fill, 13px cells,
 * the sort arrow) on the APG Grid pattern: one cell at a time takes focus and the arrow keys move
 * it, so a keyboard user can sort, resize, edit and save a view.
 *
 * - Columns: `width` in px (160 by default) between `minWidth` and `maxWidth`; `pinned` columns
 *   stick to the start or end and cast a soft shadow once content scrolls under them. Sort,
 *   visibility, order and sizing each work controlled or uncontrolled.
 * - Rows: 40px (`density="compact"`: 32), virtualized above 200 rows (`virtualize` to choose):
 *   only the rows on screen are drawn, under a sticky header. Give the grid a height.
 * - Editing: Enter, F2 or a double click opens the cell's editor (`renderEditor`, or an Input);
 *   Enter or Tab saves, Escape cancels. `onCellEdit` may return a promise: the cell shows a
 *   Spinner while it runs and an error edge if it rejects (Enter tries again, Escape undoes).
 * - States: `loading` (Skeleton rows), empty, `filtered` with no rows (No results), `error`. The
 *   last three are an EmptyState with its icon, centred in the visible body however far the
 *   columns scroll.
 * - Resize: drag a header's end edge (it follows the pointer, no transition), or Tab from the
 *   header to its handle and use the arrow keys.
 * - Parts for the toolbar: `DataGridToolbar`, `DataGridColumnsMenu` (show, hide and reorder
 *   columns) and `DataGridViewMenu` (saved views: name, filters, sort and columns). A view switch
 *   fades the body in over --duration-base.
 *
 * Other props, `ref` included, go to the outer `div` (the toolbar, the frame and the pager);
 * size it with `className`.
 */

/* ---------- words ---------- */

/** The words the Data grid says on its own. They join SatinLabels, so the app translates them there. */
export const dataGridLabels = {
  /** The Columns menu's trigger and name. */
  dataGridColumns: 'Columns',
  dataGridResetColumns: 'Reset columns',
  /** A column's resize handle: "Resize Name". */
  dataGridResizeColumn: (column: string) => `Resize ${column}`,
  /** Read out after a header changes the sort. */
  dataGridSorted: (column: string, direction: 'asc' | 'desc' | null) =>
    direction ? `Sorted by ${column}, ${direction === 'asc' ? 'ascending' : 'descending'}` : 'Sort removed',
  /** Read out when a cell's save finishes. */
  dataGridSaved: 'Saved',
  /** A cell whose save failed, when the error has no message of its own. */
  dataGridSaveFailed: 'Couldn’t save this change',
  /** After a failed save's message, for screen readers. */
  dataGridRetryHint: 'Enter to try again, Escape to undo',
  dataGridEmpty: 'Nothing here yet',
  dataGridEmptyDescription: 'Rows show up here once they’re added.',
  /** Under "No results", when a filter leaves no rows. */
  dataGridNoResultsDescription: 'No rows match these filters.',
  dataGridClearFilters: 'Clear filters',
  dataGridLoadFailed: 'Couldn’t load the rows',
  dataGridRetry: 'Try again',
  /** The view menu's trigger with no view picked, and its list's title. */
  dataGridViews: 'Views',
  /** The view menu trigger's name: "View: My interviews, unsaved changes". */
  dataGridView: (name: string, modified: boolean) => `View: ${name}${modified ? ', unsaved changes' : ''}`,
  dataGridSaveChanges: (name: string) => `Save changes to ${name}`,
  dataGridSaveAsView: 'Save as new view…',
  dataGridDeleteView: (name: string) => `Delete ${name}`,
  /** The save dialog's title and button. */
  dataGridSaveView: 'Save view',
  dataGridViewName: 'Name',
  dataGridViewSaved: (name: string) => `${name} saved`,
  dataGridViewApplied: (name: string) => `Showing ${name}`,
  dataGridViewDeleted: (name: string) => `${name} deleted`,
}

type DataGridLabels = typeof dataGridLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends DataGridLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...dataGridLabels, ...labels }), [labels])
}
type Labels = ReturnType<typeof useLabels>

/* ---------- types ---------- */

/** The sort: a column key and a direction, or null. Table's `Sort`. */
export type DataGridSort = Sort

/** What `renderCell` gets. */
export interface DataGridCellProps<R, V = unknown> {
  row: R
  /** The row's value at the column's key (the value being saved, while a save runs). */
  value: V
  rowId: string
}

/** What `renderEditor` gets: the value being edited and the calls that end the edit. */
export interface DataGridEditorProps<R, V = unknown> {
  row: R
  /** The draft: the cell's value, then what the editor has changed it to. */
  value: V
  /** Changes the draft. */
  onChange: (value: V) => void
  /** Saves the draft, or `value` when given (a Select saves on pick). */
  commit: (value?: V) => void
  /** Leaves the cell as it was. */
  cancel: () => void
  /** Spread on the editor's field: it's named after the column and takes focus. */
  inputProps: { 'aria-label': string; autoFocus: boolean }
}

interface DataGridColumnBase<R> {
  header: React.ReactNode
  /** The column's name in the Columns menu and on its resize handle, when `header` isn't plain text. */
  label?: string
  /** Width in px. Default 160. */
  width?: number
  /** Narrowest a resize goes, in px. Default 64. */
  minWidth?: number
  /** Widest a resize goes, in px. Default 800. */
  maxWidth?: number
  /** Sticks to the start or end edge while the rest scroll sideways. */
  pinned?: 'start' | 'end'
  sortable?: boolean
  /** `false` keeps it out of the Columns menu's switches (it always shows). */
  hideable?: boolean
  /** `right` lines the cell up at the end: the left, right to left. */
  align?: 'left' | 'right'
  /** Enter, F2 or a double click edits the cell. A function decides per row. */
  editable?: boolean | ((row: R) => boolean)
}

/** A column showing one field of the row: `key` names it, so a typo is a type error. */
export type DataGridFieldColumn<R, K extends keyof R & string = keyof R & string> = DataGridColumnBase<R> & {
  key: K
  computed?: false
  /** Draws the cell; defaults to the value as text (dates in the labels' `dateLocale`, lists joined). */
  renderCell?: (cell: DataGridCellProps<R, R[K]>) => React.ReactNode
  /** Draws the editor; defaults to an Input that saves text (or a number, for a number). */
  renderEditor?: (editor: DataGridEditorProps<R, R[K]>) => React.ReactNode
}

/**
 * A column for something the row doesn't hold as one field (actions, a sum): `computed: true`,
 * any `key`, and its own `renderCell`. It sorts by nothing unless the row has that key.
 */
export type DataGridComputedColumn<R> = DataGridColumnBase<R> & {
  key: string
  computed: true
  renderCell: (cell: DataGridCellProps<R, unknown>) => React.ReactNode
  renderEditor?: (editor: DataGridEditorProps<R, unknown>) => React.ReactNode
}

/** A column: a field of the row (its `key` types the cell's value), or a computed one (`computed: true`) with its own `renderCell`. */
export type DataGridColumn<R> = { [K in keyof R & string]: DataGridFieldColumn<R, K> }[keyof R & string] | DataGridComputedColumn<R>

/** A saved view: a name and the state it puts the grid in. `filters` is yours (the grid stores it). */
export interface DataGridView<F = unknown> {
  id: string
  name: string
  sort?: DataGridSort
  columnVisibility?: Record<string, boolean>
  columnOrder?: string[]
  columnSizing?: Record<string, number>
  filters?: F
}

// Columns as the grid handles them inside, whatever the row type.
type AnyColumn = DataGridColumnBase<unknown> & {
  key: string
  computed?: boolean
  renderCell?: (cell: DataGridCellProps<unknown, unknown>) => React.ReactNode
  renderEditor?: (editor: DataGridEditorProps<unknown, unknown>) => React.ReactNode
}

/* ---------- helpers ---------- */

const ROW_HEIGHT = { default: 40, compact: 32 } as const
const HEAD_HEIGHT = { default: 36, compact: 32 } as const
const SELECT_WIDTH = 40
const DEFAULT_WIDTH = 160
const MIN_WIDTH = 64
const MAX_WIDTH = 800
const OVERSCAN = 6
const AUTO_VIRTUALIZE = 200
const SKELETON_ROWS = 8

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const field = (row: unknown, key: string) => (row as Record<string, unknown> | null)?.[key]
const nameOf = (c: AnyColumn) => c.label ?? (typeof c.header === 'string' || typeof c.header === 'number' ? String(c.header) : c.key)
const minOf = (c: AnyColumn) => c.minWidth ?? MIN_WIDTH
const maxOf = (c: AnyColumn) => Math.max(minOf(c), c.maxWidth ?? MAX_WIDTH)
const widthOf = (c: AnyColumn, sizing: Record<string, number>) => clamp(sizing[c.key] ?? c.width ?? DEFAULT_WIDTH, minOf(c), maxOf(c))
const isEditable = (c: AnyColumn, row: unknown) => (typeof c.editable === 'function' ? c.editable(row) : !!c.editable)
const cellKey = (rowId: string, key: string) => `${rowId}\u0000${key}`
const defaultRowId = (row: unknown) => String(field(row, 'id'))

/** Known column keys in `order`, then the rest in the order `columns` gives them. */
function orderColumns(columns: AnyColumn[], order: string[]) {
  const byKey = new Map(columns.map((c) => [c.key, c]))
  const out: AnyColumn[] = []
  for (const key of order) {
    const c = byKey.get(key)
    if (c) {
      out.push(c)
      byKey.delete(key)
    }
  }
  for (const c of columns) if (byKey.has(c.key)) out.push(c)
  return out
}

function compareValues(a: unknown, b: unknown, collator: Intl.Collator) {
  // Empty cells go last, whichever way the column is sorted.
  if (a == null || a === '') return b == null || b === '' ? 0 : 1
  if (b == null || b === '') return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  const text = (v: unknown) => (Array.isArray(v) ? v.join(', ') : String(v))
  return collator.compare(text(a), text(b))
}

function formatValue(value: unknown, locale: string): React.ReactNode {
  if (value == null) return ''
  if (value instanceof Date) return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value)
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'boolean') return String(value)
  return React.isValidElement(value) ? value : String(value)
}

const messageOf = (error: unknown) =>
  error instanceof Error && error.message ? error.message : typeof error === 'string' && error ? error : undefined

/** A value with a controlled (`value`) and an uncontrolled (`defaultValue`) form, one setter for both. */
function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (value: T) => void) {
  const [own, setOwn] = React.useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : own
  const latest = React.useRef({ current, onChange, controlled })
  latest.current = { current, onChange, controlled }
  const set = React.useCallback((next: T) => {
    const l = latest.current
    if (!l.controlled) setOwn(next)
    l.current = next
    l.onChange?.(next)
  }, [])
  return [current, set] as const
}

/* ---------- icons (16px at 1.25, like the rest of Satin's glyphs) ---------- */

/** Table's sort arrow, 14 at 1.09. Pointing down for descending. */
function SortIcon({ direction }: { direction: 'asc' | 'desc' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className={cn('shrink-0 text-text-muted', direction === 'desc' && 'rotate-180')}>
      <path d="M7.00025 11.4515L7.00025 2.54852M11.2044 6.7527L7.00025 2.54852L2.79608 6.7527" stroke="currentColor" strokeWidth="1.09375" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ColumnsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
        <path d="M6.17 2.5V13.5M9.83 2.5V13.5" />
      </g>
    </svg>
  )
}

function ViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 13.5V3.5C4 2.95 4.45 2.5 5 2.5H11C11.55 2.5 12 2.95 12 3.5V13.5L8 10.83L4 13.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------- context, for the toolbar parts ---------- */

interface GridContextValue {
  /** Every column, in the order `columns` gives them. */
  columns: AnyColumn[]
  /** Every column, in the grid's current order. */
  ordered: AnyColumn[]
  sort: DataGridSort
  setSort: (sort: DataGridSort) => void
  visibility: Record<string, boolean>
  setVisibility: (visibility: Record<string, boolean>) => void
  order: string[]
  setOrder: (order: string[]) => void
  sizing: Record<string, number>
  setSizing: (sizing: Record<string, number>) => void
  /** Fades the body in: a saved view was applied. */
  switchView: () => void
  announce: (text: string) => void
  labels: Labels
}

const GridContext = React.createContext<GridContextValue | null>(null)

function useGrid(part: string) {
  const grid = React.useContext(GridContext)
  if (!grid) throw new Error(`${part} must be inside DataGrid (pass it in \`toolbar\`)`)
  return grid
}

/* ---------- the grid ---------- */

type Status = { state: 'saving' | 'error'; value: unknown; message?: string }
type Editing = { rowId: string; key: string; value: unknown }

export interface DataGridProps<R> extends Omit<React.ComponentProps<'div'>, 'children'> {
  columns: DataGridColumn<R>[]
  rows: R[]
  /** The row's id, for selection, edits and React keys. Defaults to `row.id`. */
  getRowId?: (row: R) => string
  /** The grid's accessible name. */
  label?: string
  /**
   * Names a row for its select checkbox ("Select Ada Okafor"). Defaults to the first column's
   * text, else the row's number.
   */
  rowLabel?: (row: R) => string
  sort?: DataGridSort
  defaultSort?: DataGridSort
  onSortChange?: (sort: DataGridSort) => void
  /** Leave rows in the order given (sort them yourself in onSortChange). */
  manualSort?: boolean
  /** A checkbox column; `selection` holds the picked rows' ids. */
  selectable?: boolean
  selection?: string[]
  defaultSelection?: string[]
  onSelectionChange?: (ids: string[]) => void
  /** Column key → shown. A key that's left out shows. */
  columnVisibility?: Record<string, boolean>
  defaultColumnVisibility?: Record<string, boolean>
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void
  /** Column keys in the order to show them; keys left out follow in `columns` order. Pinned columns keep their edge. */
  columnOrder?: string[]
  defaultColumnOrder?: string[]
  onColumnOrderChange?: (order: string[]) => void
  /** Column key → width in px; a key that's left out takes the column's `width`. */
  columnSizing?: Record<string, number>
  defaultColumnSizing?: Record<string, number>
  onColumnSizingChange?: (sizing: Record<string, number>) => void
  /** Row height: 40 (`default`) or 32 (`compact`). */
  density?: 'compact' | 'default'
  /**
   * Called with an edited cell's new value; update `rows` with it. Return a promise and the cell
   * shows a Spinner until it settles, or an error if it rejects (its message is shown).
   */
  onCellEdit?: (rowId: string, key: string, value: unknown) => unknown
  /** Skeleton rows in place of the body. */
  loading?: boolean
  /** The rows failed to load: a message (or `true` for the default one) in place of the body. */
  error?: React.ReactNode | boolean
  /** Shows Try again on the error state. */
  onRetry?: () => void
  /** The rows are filtered: with none left, the grid says No results instead of empty. */
  filtered?: boolean
  /** Shows Clear filters on the No results state. */
  onClearFilters?: () => void
  /** What shows when there are no rows (not filtered). Defaults to an EmptyState with a table icon. */
  empty?: React.ReactNode
  /**
   * What shows when `filtered` leaves no rows. Defaults to an EmptyState with a search icon, "No
   * results" and, with `onClearFilters`, Clear filters. Pass your own to name the search.
   */
  noResults?: React.ReactNode
  /** Draw only the rows on screen. Defaults to on above 200 rows. */
  virtualize?: boolean
  /** Rows per page, with a Pagination under the grid. Left out, every row is in one scrolling body. */
  pageSize?: number
  /** The current page, from 1. */
  page?: number
  defaultPage?: number
  onPageChange?: (page: number) => void
  /** Above the grid: `DataGridToolbar` with search, filters, `DataGridColumnsMenu`, `DataGridViewMenu`. */
  toolbar?: React.ReactNode
}

export function DataGrid<R>({
  columns: columnsProp,
  rows,
  getRowId: getRowIdProp,
  label,
  rowLabel,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  manualSort = false,
  selectable = false,
  selection: selectionProp,
  defaultSelection = [],
  onSelectionChange,
  columnVisibility,
  defaultColumnVisibility = {},
  onColumnVisibilityChange,
  columnOrder,
  defaultColumnOrder = [],
  onColumnOrderChange,
  columnSizing,
  defaultColumnSizing = {},
  onColumnSizingChange,
  density = 'default',
  onCellEdit,
  loading = false,
  error,
  onRetry,
  filtered = false,
  onClearFilters,
  empty,
  noResults,
  virtualize,
  pageSize,
  page: pageProp,
  defaultPage = 1,
  onPageChange,
  toolbar,
  className,
  ref,
  ...props
}: DataGridProps<R>) {
  const labels = useLabels()
  const columns = columnsProp as unknown as AnyColumn[]
  const getRowId = (getRowIdProp ?? defaultRowId) as (row: unknown) => string

  const [sort, setSortState] = useControllable<DataGridSort>(sortProp, defaultSort, onSortChange)
  const [selection, setSelection] = useControllable(selectionProp, defaultSelection, onSelectionChange)
  const [visibility, setVisibility] = useControllable(columnVisibility, defaultColumnVisibility, onColumnVisibilityChange)
  const [order, setOrder] = useControllable(columnOrder, defaultColumnOrder, onColumnOrderChange)
  const [sizing, setSizing] = useControllable(columnSizing, defaultColumnSizing, onColumnSizingChange)
  const [page, setPage] = useControllable(pageProp, defaultPage, onPageChange)

  const setSort = React.useCallback(
    (next: DataGridSort) => {
      setSortState(next)
      if (pageSize) setPage(1)
    },
    [setSortState, setPage, pageSize],
  )

  // One polite region for what the grid says: sort, saves, views. A counter re-announces the same words.
  const [message, setMessage] = React.useState({ text: '', n: 0 })
  const announce = React.useCallback((text: string) => setMessage((m) => ({ text, n: m.n + 1 })), [])

  /* columns */
  const ordered = React.useMemo(() => orderColumns(columns, order), [columns, order])
  const shown = ordered.filter((c) => visibility[c.key] !== false)
  const startCols = shown.filter((c) => c.pinned === 'start')
  const endCols = shown.filter((c) => c.pinned === 'end')
  const layout = [...startCols, ...shown.filter((c) => c.pinned !== 'start' && c.pinned !== 'end'), ...endCols]
  const lead = selectable ? 1 : 0
  const colCount = layout.length + lead
  const widths = layout.map((c) => widthOf(c, sizing))
  // One track per column, and a 1fr track before the end-pinned ones that takes the room left over.
  const template = [
    ...(selectable ? [`${SELECT_WIDTH}px`] : []),
    ...widths.slice(0, layout.length - endCols.length).map((w) => `${w}px`),
    'minmax(0, 1fr)',
    ...widths.slice(layout.length - endCols.length).map((w) => `${w}px`),
  ].join(' ')

  // Where each column sits: pinned offsets, the edge that casts the shadow, end columns' tracks.
  const pinStartWidth = (selectable ? SELECT_WIDTH : 0) + widths.slice(0, startCols.length).reduce((a, b) => a + b, 0)
  const pinEndWidth = widths.slice(layout.length - endCols.length).reduce((a, b) => a + b, 0)
  const place = (j: number): { pinned?: 'start' | 'end'; edge?: 'start' | 'end'; style?: React.CSSProperties } => {
    if (j < startCols.length) {
      const offset = (selectable ? SELECT_WIDTH : 0) + widths.slice(0, j).reduce((a, b) => a + b, 0)
      return { pinned: 'start', edge: j === startCols.length - 1 ? 'start' : undefined, style: { insetInlineStart: offset } }
    }
    const e = j - (layout.length - endCols.length)
    if (e >= 0) {
      const offset = widths.slice(j + 1).reduce((a, b) => a + b, 0)
      return { pinned: 'end', edge: e === 0 ? 'end' : undefined, style: { insetInlineEnd: offset, gridColumnStart: -(endCols.length - e + 1) } }
    }
    return {}
  }
  const selectPlace = { pinned: 'start' as const, edge: startCols.length === 0 ? ('start' as const) : undefined, style: { insetInlineStart: 0 } }

  /* rows */
  const collator = React.useMemo(() => new Intl.Collator(labels.dateLocale, { numeric: true, sensitivity: 'base' }), [labels.dateLocale])
  const sortedRows = React.useMemo(() => {
    if (!sort || manualSort) return rows
    const s = [...rows].sort((a, b) => compareValues(field(a, sort.key), field(b, sort.key), collator))
    return sort.direction === 'desc' ? s.reverse() : s
  }, [rows, sort, manualSort, collator])
  const pageCount = pageSize ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1
  const currentPage = clamp(page, 1, pageCount)
  const shownRows = pageSize ? sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sortedRows
  const body: 'rows' | 'loading' | 'error' | 'empty' | 'filtered' = loading
    ? 'loading'
    : error
      ? 'error'
      : shownRows.length > 0
        ? 'rows'
        : filtered
          ? 'filtered'
          : 'empty'
  const count = body === 'rows' ? shownRows.length : 0

  const selected = React.useMemo(() => new Set(selection), [selection])
  const allIds = rows.map(getRowId)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = !allSelected && allIds.some((id) => selected.has(id))
  const nameRow = (row: unknown, index: number) => {
    if (rowLabel) return labels.selectNamedRow(rowLabel(row as R))
    const first = layout[0] ? field(row, layout[0].key) : undefined
    return typeof first === 'string' || typeof first === 'number' ? labels.selectNamedRow(String(first)) : labels.selectRow(index + 1)
  }

  /* virtualization */
  const rowH = ROW_HEIGHT[density]
  const headH = HEAD_HEIGHT[density]
  const virtual = body === 'rows' && (virtualize ?? count > AUTO_VIRTUALIZE)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const gridRef = React.useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 })
  const rangeOf = React.useCallback(
    (top: number, height: number): [number, number] => {
      // Before the viewport is measured (or in a test, with no layout), assume 480px.
      const h = height || 480
      return [Math.max(0, Math.floor((top - headH) / rowH) - OVERSCAN), Math.min(count, Math.ceil((top + h - headH) / rowH) + OVERSCAN)]
    },
    [headH, rowH, count],
  )
  const [range, setRange] = React.useState<[number, number]>(() => rangeOf(0, 0))

  // Pinned shadows: on while content sits under the pinned columns. Set on the root, not in state,
  // so a sideways scroll doesn't re-render.
  const updateEdges = React.useCallback(() => {
    const el = viewportRef.current
    const root = rootRef.current
    if (!el || !root) return
    const max = el.scrollWidth - el.clientWidth
    const x = Math.abs(el.scrollLeft)
    root.toggleAttribute('data-scrolled-start', x > 0)
    root.toggleAttribute('data-scrolled-end', max > 0 && x < max - 1)
  }, [])

  const onScroll = React.useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    updateEdges()
    if (!virtual) return
    const next = rangeOf(el.scrollTop, el.clientHeight)
    setRange((r) => (r[0] === next[0] && r[1] === next[1] ? r : next))
  }, [virtual, rangeOf, updateEdges])

  React.useLayoutEffect(() => {
    onScroll()
  }, [onScroll, template])

  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const next = { width: el.clientWidth, height: el.clientHeight }
      setViewport((v) => (v.width === next.width && v.height === next.height ? v : next))
      onScroll()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [onScroll])

  /* focus: one cell at a time (APG Grid). Row 0 is the header; columns count the checkbox. */
  const [active, setActive] = React.useState({ row: 0, col: 0 })
  const act = { row: clamp(active.row, 0, count), col: clamp(active.col, 0, Math.max(0, colCount - 1)) }
  const focusRequest = React.useRef(false)
  const tabFor = (row: number, col: number) => (act.row === row && act.col === col ? 0 : -1)
  const moveTo = (row: number, col: number) => {
    setActive({ row: clamp(row, 0, count), col: clamp(col, 0, colCount - 1) })
    focusRequest.current = true
  }

  // Scrolls a cell clear of the sticky header and the pinned columns. By rectangles, so it is the
  // same left to right and right to left.
  const ensureVisible = (el: HTMLElement, header: boolean) => {
    const vp = viewportRef.current
    if (!vp) return
    const er = el.getBoundingClientRect()
    const vr = vp.getBoundingClientRect()
    if (!header) {
      const top = vr.top + headH
      const bottom = vr.top + vp.clientHeight
      if (er.top < top) vp.scrollTop -= top - er.top
      else if (er.bottom > bottom) vp.scrollTop += er.bottom - bottom
    }
    if (!el.closest('[data-pinned]')) {
      const rtl = getComputedStyle(vp).direction === 'rtl'
      const left = vr.left + (rtl ? pinEndWidth : pinStartWidth)
      const right = vr.left + vp.clientWidth - (rtl ? pinStartWidth : pinEndWidth)
      if (er.left < left) vp.scrollLeft -= left - er.left
      else if (er.right > right) vp.scrollLeft += er.right - right
    }
  }

  React.useLayoutEffect(() => {
    if (!focusRequest.current) return
    focusRequest.current = false
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-pos="${act.row}:${act.col}"]`)
    if (!el) return
    el.focus({ preventScroll: true })
    ensureVisible(el, act.row === 0)
  })

  /* sorting */
  const cycleSort = (c: AnyColumn) => {
    const next: DataGridSort =
      sort?.key !== c.key ? { key: c.key, direction: 'asc' } : sort.direction === 'asc' ? { key: c.key, direction: 'desc' } : null
    setSort(next)
    announce(labels.dataGridSorted(nameOf(c), next?.direction ?? null))
  }

  /* resizing */
  const [resizing, setResizing] = React.useState(false)
  const resize = (c: AnyColumn, width: number) => {
    const w = clamp(Math.round(width), minOf(c), maxOf(c))
    if (w !== widthOf(c, sizing)) setSizing({ ...sizing, [c.key]: w })
  }

  /* editing and saving */
  const [editing, setEditingState] = React.useState<Editing | null>(null)
  const editingRef = React.useRef<Editing | null>(null)
  const setEditing = (next: Editing | null) => {
    editingRef.current = next
    setEditingState(next)
  }
  const [statuses, setStatuses] = React.useState<Record<string, Status>>({})
  const tokens = React.useRef(new Map<string, object>())
  const setStatus = (id: string, status: Status | null) =>
    setStatuses((all) => {
      if (!status) {
        if (!(id in all)) return all
        const { [id]: _, ...rest } = all
        return rest
      }
      return { ...all, [id]: status }
    })
  const anyEditable = columns.some((c) => !!c.editable)

  const startEdit = (row: unknown, c: AnyColumn) => {
    if (!isEditable(c, row)) return
    const rowId = getRowId(row)
    const status = statuses[cellKey(rowId, c.key)]
    setEditing({ rowId, key: c.key, value: status?.state === 'error' ? status.value : field(row, c.key) })
  }

  const cancelEdit = () => {
    if (!editingRef.current) return
    setEditing(null)
    focusRequest.current = true
  }

  const commitEdit = (value: unknown) => {
    const ed = editingRef.current
    if (!ed) return
    setEditing(null)
    focusRequest.current = true
    const row = rows.find((r) => getRowId(r) === ed.rowId)
    const id = cellKey(ed.rowId, ed.key)
    tokens.current.delete(id)
    if (row === undefined || Object.is(value, field(row, ed.key))) {
      setStatus(id, null)
      return
    }
    const fail = (err: unknown) => {
      const text = messageOf(err)
      setStatus(id, { state: 'error', value, message: text })
      announce(text ? `${labels.dataGridSaveFailed}: ${text}` : labels.dataGridSaveFailed)
    }
    let result: unknown
    try {
      result = onCellEdit?.(ed.rowId, ed.key, value)
    } catch (err) {
      fail(err)
      return
    }
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      const token = {}
      tokens.current.set(id, token)
      setStatus(id, { state: 'saving', value })
      ;(result as PromiseLike<unknown>).then(
        () => {
          if (tokens.current.get(id) !== token) return
          tokens.current.delete(id)
          setStatus(id, null)
          announce(labels.dataGridSaved)
        },
        (err: unknown) => {
          if (tokens.current.get(id) !== token) return
          tokens.current.delete(id)
          fail(err)
        },
      )
    } else setStatus(id, null)
  }

  /* keys */
  const toggleRow = (id: string) => setSelection(selected.has(id) ? selection.filter((s) => s !== id) : [...selection, id])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    // Keys from a portaled menu (an editor's Select list) pass through React's tree; they aren't ours.
    if (e.defaultPrevented || !gridRef.current?.contains(target) || editingRef.current) return
    const cell = target.closest<HTMLElement>('[data-pos]')
    if (!cell || target.closest('[data-slot="data-grid-resize"]')) return
    const rtl = getComputedStyle(cell).direction === 'rtl'
    const { row, col } = act
    const pageRows = Math.max(1, Math.floor(((viewportRef.current?.clientHeight || 480) - headH) / rowH))
    const ctrl = e.ctrlKey || e.metaKey
    let to: [number, number] | null = null
    switch (e.key) {
      case 'ArrowRight':
        to = [row, col + (rtl ? -1 : 1)]
        break
      case 'ArrowLeft':
        to = [row, col + (rtl ? 1 : -1)]
        break
      case 'ArrowDown':
        to = [row + 1, col]
        break
      case 'ArrowUp':
        to = [row - 1, col]
        break
      case 'Home':
        to = ctrl ? [0, 0] : [row, 0]
        break
      case 'End':
        to = ctrl ? [count, colCount - 1] : [row, colCount - 1]
        break
      case 'PageDown':
        to = [Math.min(count, row + pageRows), col]
        break
      case 'PageUp':
        to = [Math.max(row === 0 ? 0 : 1, row - pageRows), col]
        break
    }
    if (to) {
      e.preventDefault()
      moveTo(to[0], to[1])
      return
    }
    if (row === 0) return
    const r = shownRows[row - 1]
    if (r === undefined) return
    const c = layout[col - lead]
    if (e.key === ' ' && e.shiftKey && selectable) {
      e.preventDefault()
      toggleRow(getRowId(r))
    } else if ((e.key === 'Enter' || e.key === 'F2') && c && isEditable(c, r)) {
      e.preventDefault()
      startEdit(r, c)
    } else if (e.key === 'Escape' && c && statuses[cellKey(getRowId(r), c.key)]?.state === 'error') {
      // Undo a failed save: the cell shows the row's value again.
      e.preventDefault()
      setStatus(cellKey(getRowId(r), c.key), null)
    }
  }

  const onFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-pos]')
    if (!cell || !gridRef.current?.contains(cell)) return
    const [row, col] = (cell.dataset.pos ?? '').split(':').map(Number)
    if (row !== act.row || col !== act.col) setActive({ row, col })
  }

  /* view switch: the body fades in, keyed so the animation restarts */
  const [switchCount, setSwitchCount] = React.useState(0)
  const switchView = React.useCallback(() => setSwitchCount((n) => n + 1), [])

  const context = React.useMemo<GridContextValue>(
    () => ({ columns, ordered, sort, setSort, visibility, setVisibility, order, setOrder, sizing, setSizing, switchView, announce, labels }),
    [columns, ordered, sort, setSort, visibility, setVisibility, order, setOrder, sizing, setSizing, switchView, announce, labels],
  )

  /* rendering */
  const gridId = React.useId()
  const cellText = 'text-body leading-(--text-body--line-height) text-text-default'
  const headLabel =
    'inline-flex max-w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-md px-2 py-[3px] text-sm leading-[18px] font-medium whitespace-nowrap text-text-muted'

  const header = (
    <div role="row" aria-rowindex={1} data-slot="data-grid-header-row" className="satin-data-grid-row">
      {selectable && (
        <div
          role="columnheader"
          aria-colindex={1}
          className="satin-data-grid-cell justify-center"
          data-pinned="start"
          data-pinned-edge={selectPlace.edge}
          style={selectPlace.style}
        >
          <Checkbox
            data-pos="0:0"
            tabIndex={tabFor(0, 0)}
            aria-label={labels.selectAllRows}
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            onCheckedChange={(v) => setSelection(v === true ? allIds : [])}
          />
        </div>
      )}
      {layout.map((c, j) => {
        const gc = j + lead
        const p = place(j)
        const direction = sort?.key === c.key ? sort.direction : undefined
        const width = widths[j]
        // Named by its title alone, not by the resize handle inside it.
        const titleId = `${gridId}-h-${gc}`
        return (
          <div
            key={c.key}
            role="columnheader"
            aria-labelledby={titleId}
            aria-colindex={gc + 1}
            aria-sort={c.sortable ? (direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none') : undefined}
            data-pos={c.sortable ? undefined : `0:${gc}`}
            tabIndex={c.sortable ? undefined : tabFor(0, gc)}
            data-align={c.align}
            data-pinned={p.pinned}
            data-pinned-edge={p.edge}
            style={p.style}
            className="satin-data-grid-cell ps-1 pe-2"
          >
            {c.sortable ? (
              <button
                type="button"
                data-pos={`0:${gc}`}
                tabIndex={tabFor(0, gc)}
                onClick={() => cycleSort(c)}
                className={cn(
                  headLabel,
                  'transition-colors duration-(--duration-fast) ease-(--ease-out) focus-visible:outline-none',
                  'satin-hover:bg-bg-hover satin-focus:bg-bg-hover satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
                )}
              >
                <span id={titleId} className="truncate">
                  {c.header}
                </span>
                {direction && <SortIcon direction={direction} />}
              </button>
            ) : (
              <span className={headLabel}>
                <span id={titleId} className="truncate">
                  {c.header}
                </span>
              </span>
            )}
            <ResizeHandle
              name={nameOf(c)}
              width={width}
              min={minOf(c)}
              max={maxOf(c)}
              tabIndex={act.row === 0 && act.col === gc ? 0 : -1}
              onResize={(w) => resize(c, w)}
              onDragChange={setResizing}
              onExit={() => moveTo(0, gc)}
              labels={labels}
            />
          </div>
        )
      })}
    </div>
  )

  const renderRow = (row: unknown, i: number) => {
    const rowId = getRowId(row)
    const r = i + 1
    const isSelected = selected.has(rowId)
    return (
      <div
        key={rowId}
        role="row"
        aria-rowindex={i + 2}
        aria-selected={selectable ? isSelected : undefined}
        data-slot="data-grid-row"
        className="satin-data-grid-row"
        style={virtual ? { position: 'absolute', top: i * rowH, insetInlineStart: 0, width: '100%' } : undefined}
      >
        {selectable && (
          <div
            role="gridcell"
            aria-colindex={1}
            className="satin-data-grid-cell justify-center"
            data-pinned="start"
            data-pinned-edge={selectPlace.edge}
            style={selectPlace.style}
          >
            <Checkbox
              data-pos={`${r}:0`}
              tabIndex={tabFor(r, 0)}
              aria-label={nameRow(row, i)}
              checked={isSelected}
              onCheckedChange={() => toggleRow(rowId)}
            />
          </div>
        )}
        {layout.map((c, j) => {
          const gc = j + lead
          const p = place(j)
          const id = cellKey(rowId, c.key)
          const status = statuses[id]
          const isEditing = editing?.rowId === rowId && editing.key === c.key
          const value = status ? status.value : field(row, c.key)
          const shownRow = status ? { ...(row as object), [c.key]: status.value } : row
          const content = c.renderCell ? c.renderCell({ row: shownRow, value, rowId }) : formatValue(value, labels.dateLocale)
          const plain = typeof content === 'string' || typeof content === 'number'
          const failed = status?.state === 'error'
          const messageId = failed ? `${id.replace(/\W/g, '-')}-error` : undefined
          const errorText = status?.message ?? labels.dataGridSaveFailed
          const editable = isEditable(c, row)
          return (
            <div
              key={c.key}
              role="gridcell"
              aria-colindex={gc + 1}
              data-pos={`${r}:${gc}`}
              tabIndex={tabFor(r, gc)}
              aria-readonly={anyEditable && !editable ? true : undefined}
              aria-invalid={failed || undefined}
              aria-busy={status?.state === 'saving' || undefined}
              aria-describedby={messageId}
              data-state={isEditing ? 'editing' : status?.state}
              data-align={c.align}
              data-pinned={p.pinned}
              data-pinned-edge={p.edge}
              style={p.style}
              className={cn('satin-data-grid-cell gap-1.5', isEditing ? 'px-1' : 'ps-3 pe-2.5', cellText)}
              onDoubleClick={() => startEdit(row, c)}
            >
              {isEditing ? (
                <CellEditor
                  row={shownRow}
                  column={c}
                  initial={editing.value}
                  name={nameOf(c)}
                  onCommit={commitEdit}
                  onCancel={cancelEdit}
                  onTab={(dir) => moveTo(r, gc + dir)}
                />
              ) : (
                <>
                  {plain ? (
                    <span className="min-w-0 truncate">{content}</span>
                  ) : (
                    <div className={cn('flex min-w-0 items-center gap-1 overflow-hidden', c.align === 'right' && 'justify-end')}>{content}</div>
                  )}
                  {status?.state === 'saving' && <Spinner size="xs" label={null} className="ms-auto shrink-0" />}
                  {failed && (
                    <>
                      <Tooltip label={errorText}>
                        <span tabIndex={-1} className="ms-auto grid shrink-0 place-items-center text-text-destructive">
                          <StatusIcon intent="error" />
                        </span>
                      </Tooltip>
                      <span id={messageId} className="sr-only">
                        {typeof errorText === 'string' && !/[.!?…]$/.test(errorText) ? `${errorText}.` : errorText} {labels.dataGridRetryHint}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // The rows to draw: all of them, or the ones on screen and the focused one (so Tab always finds it).
  const [first, last] = virtual ? [Math.min(range[0], count), Math.min(range[1], count)] : [0, count]
  const indices: number[] = []
  for (let i = first; i < last; i++) indices.push(i)
  const focusedRow = act.row - 1
  if (virtual && focusedRow >= 0 && (focusedRow < first || focusedRow >= last)) {
    indices.push(focusedRow)
    indices.sort((a, b) => a - b)
  }

  const messageRow = (node: React.ReactNode) => (
    <div role="row" aria-rowindex={2} data-kind="message" className="satin-data-grid-row">
      <div role="gridcell" aria-colindex={1} aria-colspan={colCount} className="satin-data-grid-cell col-span-full">
        {/* Centred in the visible body: as wide as the viewport and as tall as what is left under
            the header, and it stays put however far the columns scroll. */}
        <div
          className="sticky start-0 flex items-center justify-center px-4 py-8"
          style={{ width: viewport.width || '100%', minHeight: Math.max(0, viewport.height - headH) }}
        >
          {node}
        </div>
      </div>
    </div>
  )

  let bodyRows: React.ReactNode
  if (body === 'rows') bodyRows = indices.map((i) => renderRow(shownRows[i], i))
  else if (body === 'loading')
    bodyRows = Array.from({ length: pageSize ? Math.min(pageSize, SKELETON_ROWS) : SKELETON_ROWS }, (_, i) => (
      <div key={i} role="row" aria-rowindex={i + 2} data-kind="loading" className="satin-data-grid-row">
        {selectable && <div role="gridcell" className="satin-data-grid-cell" data-pinned="start" style={selectPlace.style} />}
        {layout.map((c, j) => (
          <div key={c.key} role="gridcell" className="satin-data-grid-cell ps-3 pe-2.5" data-pinned={place(j).pinned} style={place(j).style}>
            <Skeleton animated width={`${45 + ((i * 7 + j * 13) % 40)}%`} />
          </div>
        ))}
      </div>
    ))
  else if (body === 'error')
    bodyRows = messageRow(
      <EmptyState
        icon={<StatusIcon intent="error" />}
        title={labels.dataGridLoadFailed}
        description={error === true ? undefined : (error as React.ReactNode)}
        actions={
          onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              {labels.dataGridRetry}
            </Button>
          )
        }
      />,
    )
  else if (body === 'filtered')
    bodyRows = messageRow(
      noResults ?? (
        <EmptyState
          icon={<Search />}
          title={labels.noResults}
          description={labels.dataGridNoResultsDescription}
          actions={
            onClearFilters && (
              <Button variant="secondary" onClick={onClearFilters}>
                {labels.dataGridClearFilters}
              </Button>
            )
          }
        />
      ),
    )
  else bodyRows = messageRow(empty ?? <EmptyState icon={<TableRows />} title={labels.dataGridEmpty} description={labels.dataGridEmptyDescription} />)

  return (
    <GridContext.Provider value={context}>
      <div
        data-slot="data-grid"
        data-density={density}
        data-resizing={resizing || undefined}
        className={cn('satin-data-grid flex min-h-0 flex-col gap-3', className)}
        {...props}
        ref={(node: HTMLDivElement | null) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
      >
        {toolbar}
        <div data-slot="data-grid-frame" className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-card [--border-width-default:var(--border-width-strong)]">
          <div
            ref={viewportRef}
            data-slot="data-grid-viewport"
            onScroll={onScroll}
            className="min-h-0 flex-1 overflow-auto overscroll-contain"
            style={{ scrollPaddingTop: headH, scrollPaddingInlineStart: pinStartWidth, scrollPaddingInlineEnd: pinEndWidth }}
          >
            <div
              ref={gridRef}
              role="grid"
              aria-label={label}
              aria-rowcount={(body === 'rows' ? count : body === 'loading' ? Math.min(pageSize ?? SKELETON_ROWS, SKELETON_ROWS) : 1) + 1}
              aria-colcount={colCount}
              aria-multiselectable={selectable || undefined}
              aria-busy={loading || undefined}
              className="satin-data-grid-grid"
              style={{ '--satin-data-grid-columns': template } as React.CSSProperties}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
            >
              <div role="rowgroup" data-slot="data-grid-head" className="satin-data-grid-head">
                {header}
              </div>
              <div
                key={switchCount}
                role="rowgroup"
                data-slot="data-grid-body"
                data-switch={switchCount > 0 || undefined}
                className="satin-data-grid-body"
                style={virtual ? { position: 'relative', height: count * rowH } : undefined}
              >
                {bodyRows}
              </div>
            </div>
          </div>
        </div>
        {pageSize && pageCount > 1 && <Pagination className="self-center" pageCount={pageCount} page={currentPage} onPageChange={setPage} />}
        <span role="status" className="sr-only">
          <span key={message.n}>{message.text}</span>
        </span>
      </div>
    </GridContext.Provider>
  )
}

/* ---------- resize handle ---------- */

const RESIZE_STEP = 8
const RESIZE_STEP_LARGE = 40

function ResizeHandle({
  name,
  width,
  min,
  max,
  tabIndex,
  onResize,
  onDragChange,
  onExit,
  labels,
}: {
  name: string
  width: number
  min: number
  max: number
  tabIndex: number
  onResize: (width: number) => void
  onDragChange: (dragging: boolean) => void
  onExit: () => void
  labels: Labels
}) {
  const drag = React.useRef<{ x: number; width: number; rtl: boolean } | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const end = () => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    onDragChange(false)
  }
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={labels.dataGridResizeColumn(name)}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={tabIndex}
      data-slot="data-grid-resize"
      data-active={dragging || undefined}
      className="satin-data-grid-resize"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { x: e.clientX, width, rtl: getComputedStyle(e.currentTarget).direction === 'rtl' }
        setDragging(true)
        onDragChange(true)
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.x
        onResize(d.width + (d.rtl ? -dx : dx))
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
        const step = e.shiftKey ? RESIZE_STEP_LARGE : RESIZE_STEP
        let next: number | null = null
        if (e.key === 'ArrowRight') next = width + (rtl ? -step : step)
        else if (e.key === 'ArrowLeft') next = width + (rtl ? step : -step)
        else if (e.key === 'ArrowUp') next = width + step
        else if (e.key === 'ArrowDown') next = width - step
        else if (e.key === 'Home') next = min
        else if (e.key === 'End') next = max
        else if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          onExit()
          return
        }
        if (next === null) return
        e.preventDefault()
        e.stopPropagation()
        onResize(next)
      }}
    />
  )
}

/* ---------- cell editor ---------- */

function CellEditor({
  row,
  column,
  initial,
  name,
  onCommit,
  onCancel,
  onTab,
}: {
  row: unknown
  column: AnyColumn
  initial: unknown
  name: string
  onCommit: (value: unknown) => void
  onCancel: () => void
  onTab: (dir: 1 | -1) => void
}) {
  const custom = !!column.renderEditor
  // The default editor edits text; a number column gets its number back.
  const [draft, setDraft] = React.useState<unknown>(custom ? initial : initial == null ? '' : String(initial))
  const draftRef = React.useRef(draft)
  draftRef.current = draft
  const toValue = (v: unknown) => {
    if (custom || typeof initial !== 'number') return v
    const n = Number(String(v).trim())
    return String(v).trim() !== '' && Number.isFinite(n) ? n : v
  }
  const commit = (...args: [unknown?]) => onCommit(toValue(args.length > 0 ? args[0] : draftRef.current))
  const inputProps = { 'aria-label': name, autoFocus: true }

  return (
    <div
      data-slot="data-grid-editor"
      className="flex min-w-0 flex-1 items-center"
      onKeyDown={(e) => {
        // Keys from a portaled list (a Select's) reach here through React's tree; the editor's own only.
        if (e.defaultPrevented || e.nativeEvent.isComposing || !e.currentTarget.contains(e.target as Node)) return
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        } else if (e.key === 'Tab') {
          e.preventDefault()
          commit()
          onTab(e.shiftKey ? -1 : 1)
        }
        e.stopPropagation()
      }}
      onBlur={(e) => {
        // Focus moving into the editor's own popover (a Select's list) isn't leaving the cell.
        const to = e.relatedTarget as Element | null
        if (to && (e.currentTarget.contains(to) || to.closest('[data-radix-popper-content-wrapper]'))) return
        commit()
      }}
    >
      {column.renderEditor ? (
        column.renderEditor({ row, value: draft, onChange: setDraft, commit, cancel: onCancel, inputProps })
      ) : (
        <Input
          size="sm"
          {...inputProps}
          value={String(draft)}
          onChange={(e) => setDraft(e.target.value)}
          wrapperClassName="w-full min-w-0"
          className="w-full"
        />
      )}
    </div>
  )
}

/* ---------- toolbar parts ---------- */

/** A row above the grid for search, filters and the menus. Other props, `ref` included, go to its `div`. */
export function DataGridToolbar({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="data-grid-toolbar" className={cn('flex flex-wrap items-center gap-2', className)} {...props} />
}

export interface DataGridColumnsMenuProps extends Omit<ButtonProps, 'children' | 'asChild'> {
  /** The trigger's text. Defaults to the `dataGridColumns` label ("Columns"). */
  children?: React.ReactNode
}

/**
 * The Columns menu: a switch per column (a column with `hideable: false` stays on), Alt with ↑ or
 * ↓ moves the highlighted column, and Reset columns brings back every column in its first order
 * and width. Other props, `ref` included, go to the trigger Button.
 */
export function DataGridColumnsMenu({ children, className, ...props }: DataGridColumnsMenuProps) {
  const grid = useGrid('DataGridColumnsMenu')
  const { labels } = grid
  const hintId = React.useId()
  const items = React.useRef(new Map<string, HTMLElement>())
  const [refocus, setRefocus] = React.useState<string | null>(null)

  // A moved item is re-inserted in the list, which can drop its focus: put it back.
  React.useLayoutEffect(() => {
    if (!refocus) return
    items.current.get(refocus)?.focus()
    setRefocus(null)
  }, [refocus, grid.ordered])

  const move = (key: string, by: -1 | 1) => {
    const keys = grid.ordered.map((c) => c.key)
    const from = keys.indexOf(key)
    const to = from + by
    if (from < 0 || to < 0 || to >= keys.length) return
    keys.splice(to, 0, ...keys.splice(from, 1))
    grid.setOrder(keys)
    setRefocus(key)
    const c = grid.ordered[from]
    grid.announce(labels.positionOf(nameOf(c), to + 1, keys.length))
  }

  return (
    <DropdownMenu
      align="end"
      aria-label={labels.dataGridColumns}
      trigger={
        <Button variant="secondary" data-slot="data-grid-columns-trigger" className={className} {...props}>
          <ColumnsIcon />
          {children ?? labels.dataGridColumns}
        </Button>
      }
    >
      <DropdownMenuGroup>
        {grid.ordered.map((c) => {
          const checked = grid.visibility[c.key] !== false
          const locked = c.hideable === false
          return (
            <DropdownPrimitive.CheckboxItem
              key={c.key}
              ref={(node: HTMLDivElement | null) => {
                if (node) items.current.set(c.key, node)
                else items.current.delete(c.key)
              }}
              data-slot="data-grid-columns-item"
              checked={checked}
              disabled={locked}
              textValue={nameOf(c)}
              aria-describedby={hintId}
              className={menuItemClass}
              // The menu stays open, so several columns can change in one go.
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(v) => grid.setVisibility({ ...grid.visibility, [c.key]: v === true })}
              onKeyDown={(e) => {
                if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
                e.preventDefault()
                e.stopPropagation()
                move(c.key, e.key === 'ArrowUp' ? -1 : 1)
              }}
            >
              {/* Satin's checkbox, drawn: the item itself is the menuitemcheckbox. The glyph sits in
                  a 16px cell pulled out by -1px, as in Checkbox, so it lands on the box and not
                  1px inside its border. */}
              <span aria-hidden data-slot="data-grid-columns-box" className="satin-checkbox" data-state={checked ? 'checked' : 'unchecked'}>
                {checked && (
                  <span className="-m-px grid size-4 place-items-center">
                    <CheckIcon />
                  </span>
                )}
              </span>
              <MenuItemContent label={nameOf(c)} layout="inline" />
            </DropdownPrimitive.CheckboxItem>
          )
        })}
      </DropdownMenuGroup>
      <DropdownMenuGroup>
        <DropdownMenuItem
          label={labels.dataGridResetColumns}
          layout="inline"
          onSelect={() => {
            grid.setVisibility({})
            grid.setOrder(grid.columns.map((c) => c.key))
            grid.setSizing({})
          }}
        />
      </DropdownMenuGroup>
      <span id={hintId} hidden>
        {labels.sortableHint}
      </span>
    </DropdownMenu>
  )
}

export interface DataGridViewMenuProps<F = unknown> extends Omit<ButtonProps, 'children' | 'asChild' | 'value' | 'defaultValue'> {
  /** The saved views. */
  views?: DataGridView<F>[]
  defaultViews?: DataGridView<F>[]
  /** Called with the new list after a save, an update or a delete. */
  onViewsChange?: (views: DataGridView<F>[]) => void
  /** The view in use, by id; null for none. */
  value?: string | null
  defaultValue?: string | null
  /** Called when a view is picked or saved, after the grid takes its sort and columns: apply its `filters` here. */
  onValueChange?: (id: string | null, view: DataGridView<F> | null) => void
  /** The filters in use, saved with a new view and compared to tell a view has unsaved changes. */
  filters?: F
}

/**
 * The saved-views menu: pick a view to put the grid in its sort, columns and filters; save the
 * grid as it is as a new view (a dialog asks for the name), save changes to the view in use, or
 * delete it. A Dot on the trigger marks unsaved changes. Other props, `ref` included, go to the
 * trigger Button.
 */
export function DataGridViewMenu<F = unknown>({
  views: viewsProp,
  defaultViews = [],
  onViewsChange,
  value: valueProp,
  defaultValue = null,
  onValueChange,
  filters,
  className,
  ref,
  ...props
}: DataGridViewMenuProps<F>) {
  const grid = useGrid('DataGridViewMenu')
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const { labels } = grid
  const [views, setViews] = useControllable(viewsProp, defaultViews, onViewsChange)
  const [value, setValue] = useControllable<string | null>(valueProp, defaultValue, undefined)
  const current = views.find((v) => v.id === value) ?? null
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [name, setName] = React.useState('')

  // A view and the grid compare by what they'd show: unset parts of a view are the defaults.
  const keys = grid.columns.map((c) => c.key)
  const snapshot = (s: { sort?: DataGridSort; visibility?: Record<string, boolean>; order?: string[]; sizing?: Record<string, number>; filters?: unknown }) =>
    JSON.stringify([
      s.sort ?? null,
      keys.filter((k) => s.visibility?.[k] === false),
      orderColumns(grid.columns, s.order ?? keys).map((c) => c.key),
      grid.columns.map((c) => widthOf(c, s.sizing ?? {})),
      s.filters ?? null,
    ])
  const now = { sort: grid.sort, visibility: grid.visibility, order: grid.order, sizing: grid.sizing, filters }
  const modified =
    current !== null &&
    snapshot(now) !==
      snapshot({ sort: current.sort, visibility: current.columnVisibility, order: current.columnOrder, sizing: current.columnSizing, filters: current.filters })

  const pick = (view: DataGridView<F>) => {
    grid.setSort(view.sort ?? null)
    grid.setVisibility(view.columnVisibility ?? {})
    grid.setOrder(view.columnOrder ?? keys)
    grid.setSizing(view.columnSizing ?? {})
    grid.switchView()
    setValue(view.id)
    onValueChange?.(view.id, view)
    grid.announce(labels.dataGridViewApplied(view.name))
  }

  const state = () => ({
    sort: grid.sort,
    columnVisibility: grid.visibility,
    columnOrder: grid.ordered.map((c) => c.key),
    columnSizing: grid.sizing,
    filters,
  })

  const saveNew = (text: string) => {
    const viewName = text.trim()
    if (!viewName) return
    const base = viewName.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'view'
    let id = base
    for (let n = 2; views.some((v) => v.id === id); n++) id = `${base}-${n}`
    const view: DataGridView<F> = { id, name: viewName, ...state() }
    setViews([...views, view])
    setValue(id)
    onValueChange?.(id, view)
    setDialogOpen(false)
    grid.announce(labels.dataGridViewSaved(viewName))
  }

  const trigger = (
    <Button
      ref={(node: HTMLButtonElement | null) => {
        triggerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      variant="secondary"
      data-slot="data-grid-view-trigger"
      aria-label={current ? labels.dataGridView(current.name, modified) : undefined}
      className={className}
      {...props}
    >
      <ViewIcon />
      <span className="max-w-48 truncate">{current?.name ?? labels.dataGridViews}</span>
      {modified && <Dot tone="sky" className="-mx-1" />}
      <SelectChevron className="-me-1" />
    </Button>
  )

  return (
    <>
      <DropdownMenu align="end" trigger={trigger} aria-label={labels.dataGridViews}>
        {views.length > 0 && (
          <DropdownMenuGroup label={labels.dataGridViews}>
            {views.map((v) => (
              <DropdownMenuItem key={v.id} label={v.name} layout="inline" selected={v.id === value} onSelect={() => pick(v)} />
            ))}
          </DropdownMenuGroup>
        )}
        <DropdownMenuGroup>
          {current && modified && (
            <DropdownMenuItem
              label={labels.dataGridSaveChanges(current.name)}
              layout="inline"
              onSelect={() => {
                setViews(views.map((v) => (v.id === current.id ? { ...v, ...state() } : v)))
                grid.announce(labels.dataGridViewSaved(current.name))
              }}
            />
          )}
          <DropdownMenuItem
            label={labels.dataGridSaveAsView}
            layout="inline"
            onSelect={() => {
              setName('')
              // After the menu has closed and handed focus back to its trigger, which the dialog returns to.
              setTimeout(() => setDialogOpen(true), 0)
            }}
          />
          {current && (
            <DropdownMenuItem
              label={labels.dataGridDeleteView(current.name)}
              layout="inline"
              onSelect={() => {
                setViews(views.filter((v) => v.id !== current.id))
                setValue(null)
                onValueChange?.(null, null)
                grid.announce(labels.dataGridViewDeleted(current.name))
              }}
            />
          )}
        </DropdownMenuGroup>
      </DropdownMenu>
      <DialogRoot open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          aria-describedby={undefined}
          data-slot="data-grid-view-dialog"
          // The dialog opened from a menu item that is gone by now: focus goes back to the menu's trigger.
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            triggerRef.current?.focus()
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveNew(name)
            }}
          >
            <DialogHeader>
              <DialogTitle>{labels.dataGridSaveView}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Input label={labels.dataGridViewName} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">{labels.cancel}</Button>
              </DialogClose>
              <Button type="submit" disabled={!name.trim()}>
                {labels.dataGridSaveView}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogRoot>
    </>
  )
}
