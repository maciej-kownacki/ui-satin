import * as React from 'react'
import { cn } from '../lib/utils'
import { Checkbox } from './checkbox'

/**
 * Table, 1:1 with the uiKit `Table` set (3411:21610) and its parts: table/header (3410:17835),
 * table/row (3410:18040), table/cell (3409:17760), table/headerCell (3409:17734) and
 * table/checkboxCell (3409:17703). A real `<table>`.
 *
 * - Frame: bg/card, 1px border-subtle, radius-xl, clipped.
 * - Header row: component/table-header fill, 1px border-subtle under it. Header cells pad
 *   4 / 8 / 4 / 4 around a label button (8px sides, 3px top and bottom, radius-md, medium
 *   13/18, text-muted); hover tints the button bg-hover. Sortable headers cycle
 *   none → asc → desc with a 14px arrow 10px after the label, and set aria-sort.
 * - Cells: 12 left, 10 right, 8 top and bottom, at least 40 high, regular 13/19.5, clipped
 *   with an ellipsis. Chips and other nodes sit in a row 4px apart.
 * - Checkbox column: 8px left padding, no right padding; the header box selects all.
 * - zebra: every second row on component/table-zebra.
 * - Row hover lifts the row: bg-hover, 1px border-strong edge, radius-xl, shadow sm.
 * - overflow="fit": columns are proportional (`width` is an fr weight). overflow="scroll":
 *   columns keep their pixel `width`, the first column stays in place, a 64px fade marks
 *   the clipped edge and a 6px scrollbar (bg-muted track, border-strong thumb) sits below.
 *
 * The row edge is drawn with inset shadows on the cells, since table rows can't take a
 * border radius. `data-force="hover"` on a `<tr>` shows the hover state.
 */

export type Sort = { key: string; direction: 'asc' | 'desc' } | null

export type Row = { id: string } & Record<string, unknown>

export interface Column<R extends Row = Row> {
  key: string
  header: React.ReactNode
  /** fr weight with overflow="fit" (default 1), pixels with overflow="scroll" (default 160). */
  width?: number
  sortable?: boolean
  /** Renders the cell; defaults to the row's value at `key`. */
  cell?: (row: R) => React.ReactNode
  align?: 'left' | 'right'
}

export interface TableProps<R extends Row = Row> extends Omit<React.ComponentProps<'div'>, 'children'> {
  columns: Column<R>[]
  rows: R[]
  selectable?: boolean
  zebra?: boolean
  overflow?: 'fit' | 'scroll'
  /** Called with the new sort; rows are sorted by value unless `manualSort` is set. */
  onSortChange?: (sort: Sort) => void
  defaultSort?: Sort
  /** Leave rows in the order given (sort them yourself in onSortChange). */
  manualSort?: boolean
  selected?: string[]
  onSelectedChange?: (ids: string[]) => void
  /** Accessible name of the table. */
  label?: string
}

/** The Figma sort arrow, 14 at 1.09. Pointing down for descending. */
function SortIcon({ direction }: { direction: 'asc' | 'desc' }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={cn('shrink-0 text-text-muted', direction === 'desc' && 'rotate-180')}
    >
      <path
        d="M7.00025 11.4515L7.00025 2.54852M11.2044 6.7527L7.00025 2.54852L2.79608 6.7527"
        stroke="currentColor"
        strokeWidth="1.09375"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Hover styles for the cells of a hovered (or data-force="hover") row. Written out in full so
// Tailwind sees every class.
const cellHover = {
  first: [
    'group-hover/row:rounded-l-xl group-hover/row:bg-bg-hover group-hover/row:[box-shadow:inset_1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    'group-data-[force=hover]/row:rounded-l-xl group-data-[force=hover]/row:bg-bg-hover group-data-[force=hover]/row:[box-shadow:inset_1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
  ].join(' '),
  middle: [
    'group-hover/row:bg-bg-hover group-hover/row:[box-shadow:inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    'group-data-[force=hover]/row:bg-bg-hover group-data-[force=hover]/row:[box-shadow:inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
  ].join(' '),
  last: [
    'group-hover/row:rounded-r-xl group-hover/row:bg-bg-hover group-hover/row:[box-shadow:inset_-1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    'group-data-[force=hover]/row:rounded-r-xl group-data-[force=hover]/row:bg-bg-hover group-data-[force=hover]/row:[box-shadow:inset_-1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
  ].join(' '),
  only: [
    'group-hover/row:rounded-xl group-hover/row:bg-bg-hover group-hover/row:[box-shadow:inset_0_0_0_1px_var(--border-strong)]',
    'group-data-[force=hover]/row:rounded-xl group-data-[force=hover]/row:bg-bg-hover group-data-[force=hover]/row:[box-shadow:inset_0_0_0_1px_var(--border-strong)]',
  ].join(' '),
}

// Shadow sm under a hovered row (Figma: 0 1 1 and 0 1 1.5 in effect/shadow-sm).
const rowHover =
  'hover:[filter:drop-shadow(0_1px_1px_var(--effect-shadow-sm))_drop-shadow(0_1px_1.5px_var(--effect-shadow-sm))] data-[force=hover]:[filter:drop-shadow(0_1px_1px_var(--effect-shadow-sm))_drop-shadow(0_1px_1.5px_var(--effect-shadow-sm))]'

function compare(a: unknown, b: unknown) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true })
}

export function Table<R extends Row = Row>({
  columns,
  rows,
  selectable = false,
  zebra = false,
  overflow = 'fit',
  onSortChange,
  defaultSort = null,
  manualSort = false,
  selected: selectedProp,
  onSelectedChange,
  label,
  className,
  ...props
}: TableProps<R>) {
  const [sort, setSort] = React.useState<Sort>(defaultSort)
  const [selectedState, setSelectedState] = React.useState<string[]>([])
  const selected = selectedProp ?? selectedState
  const setSelected = (ids: string[]) => {
    if (selectedProp === undefined) setSelectedState(ids)
    onSelectedChange?.(ids)
  }

  const cycleSort = (key: string) => {
    const next: Sort =
      sort?.key !== key ? { key, direction: 'asc' } : sort.direction === 'asc' ? { key, direction: 'desc' } : null
    setSort(next)
    onSortChange?.(next)
  }

  const sortedRows = React.useMemo(() => {
    if (!sort || manualSort) return rows
    const s = [...rows].sort((a, b) => compare(a[sort.key], b[sort.key]))
    return sort.direction === 'desc' ? s.reverse() : s
  }, [rows, sort, manualSort])

  const scroll = overflow === 'scroll'
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id))
  const someSelected = !allSelected && rows.some((r) => selected.includes(r.id))

  // Column widths: fr weights as percentages, or fixed pixels when scrolling.
  const totalFr = columns.reduce((n, c) => n + (c.width ?? 1), 0)
  const colWidth = (c: Column<R>) => (scroll ? `${c.width ?? 160}px` : `${((c.width ?? 1) / totalFr) * 100}%`)
  const tableWidth = scroll ? columns.reduce((n, c) => n + (c.width ?? 160), selectable ? 24 : 0) : undefined

  // The custom scrollbar and the edge fade follow the viewport's scroll position.
  const viewport = React.useRef<HTMLDivElement>(null)
  const [bar, setBar] = React.useState({ size: 1, offset: 0, atEnd: true })
  React.useEffect(() => {
    const el = viewport.current
    if (!scroll || !el) return
    const update = () => {
      const size = el.clientWidth / el.scrollWidth
      const max = el.scrollWidth - el.clientWidth
      setBar({ size, offset: max > 0 ? el.scrollLeft / el.scrollWidth : 0, atEnd: el.scrollLeft >= max - 1 })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [scroll, columns, rows])

  // The leading column(s) stay put while the rest scroll.
  const stickyFirst = (bg: string) => (scroll ? cn('sticky z-[1]', bg) : '')
  const firstDataLeft = selectable ? 'left-6' : 'left-0'

  const cellPosition = (index: number, count: number) =>
    count === 1 ? cellHover.only : index === 0 ? cellHover.first : index === count - 1 ? cellHover.last : cellHover.middle
  const cellCount = columns.length + (selectable ? 1 : 0)

  const table = (
    <table
      aria-label={label}
      className="w-full table-fixed border-separate border-spacing-0 text-left"
      // With overflow="fit" the columns keep at least 120px each, so a phone scrolls instead of crushing them.
      style={tableWidth ? { width: tableWidth, minWidth: '100%' } : { minWidth: columns.length * 120 + (selectable ? 24 : 0) }}
    >
      <colgroup>
        {selectable && <col style={{ width: 24 }} />}
        {columns.map((c) => (
          <col key={c.key} style={{ width: colWidth(c) }} />
        ))}
      </colgroup>
      <thead>
        <tr className="bg-component-table-header">
          {selectable && (
            <th
              scope="col"
              className={cn('border-b border-border-subtle py-2 pl-2 align-middle', stickyFirst('left-0 bg-component-table-header'))}
            >
              <Checkbox
                aria-label="Select all rows"
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={(v) => setSelected(v === true ? rows.map((r) => r.id) : [])}
                className="align-middle"
              />
            </th>
          )}
          {columns.map((c, i) => {
            const active = sort?.key === c.key ? sort.direction : undefined
            const labelClass =
              'inline-flex max-w-full items-center gap-2.5 overflow-hidden rounded-md px-2 py-[3px] text-sm leading-[18px] font-medium whitespace-nowrap text-text-muted'
            return (
              <th
                key={c.key}
                scope="col"
                aria-sort={c.sortable ? (active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : 'none') : undefined}
                className={cn(
                  'h-8 overflow-hidden border-b border-border-subtle py-1 pr-2 pl-1 align-middle font-medium',
                  c.align === 'right' && 'text-right',
                  i === 0 && stickyFirst(cn(firstDataLeft, 'bg-component-table-header')),
                )}
              >
                {c.sortable ? (
                  <button
                    type="button"
                    onClick={() => cycleSort(c.key)}
                    className={cn(
                      labelClass,
                      'transition-colors duration-(--duration-fast) ease-(--ease-out) focus-visible:outline-none',
                      'satin-hover:bg-bg-hover satin-focus:bg-bg-hover satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
                    )}
                  >
                    <span className="truncate">{c.header}</span>
                    {active && <SortIcon direction={active} />}
                  </button>
                ) : (
                  <span className={labelClass}>{c.header}</span>
                )}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row, r) => {
          const isSelected = selected.includes(row.id)
          const rowBg = zebra && r % 2 === 1 ? 'bg-component-table-zebra' : 'bg-bg-card'
          return (
            <tr key={row.id} data-state={isSelected ? 'selected' : undefined} className={cn('group/row', rowBg, rowHover)}>
              {selectable && (
                <td className={cn('py-2 pl-2 align-middle', cellPosition(0, cellCount), stickyFirst(cn('left-0', rowBg)))}>
                  <Checkbox
                    aria-label={`Select row ${r + 1}`}
                    checked={isSelected}
                    onCheckedChange={(v) =>
                      setSelected(v === true ? [...selected, row.id] : selected.filter((id) => id !== row.id))
                    }
                    className="align-middle"
                  />
                </td>
              )}
              {columns.map((c, i) => {
                const content = c.cell ? c.cell(row) : (row[c.key] as React.ReactNode)
                const plain = typeof content === 'string' || typeof content === 'number'
                return (
                  <td
                    key={c.key}
                    className={cn(
                      'h-10 overflow-hidden py-2 pr-2.5 pl-3 align-middle text-body leading-(--text-body--line-height) text-text-default',
                      c.align === 'right' && 'text-right',
                      cellPosition(i + (selectable ? 1 : 0), cellCount),
                      i === 0 && stickyFirst(cn(firstDataLeft, rowBg)),
                    )}
                  >
                    {plain ? (
                      <span className="block truncate">{content}</span>
                    ) : (
                      <div className={cn('flex min-w-0 items-center gap-1 overflow-hidden', c.align === 'right' && 'justify-end')}>
                        {content}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <div
      data-slot="table"
      className={cn('relative overflow-hidden rounded-xl border border-border-subtle bg-bg-card', className)}
      {...props}
    >
      {scroll ? (
        <>
          <div className="relative">
            <div
              ref={viewport}
              tabIndex={0}
              role="region"
              aria-label={label ? `${label}, scrolls sideways` : 'Table, scrolls sideways'}
              className="overflow-x-auto [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
            >
              {table}
            </div>
            <div
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-r from-bg-card-fade to-bg-card',
                'transition-opacity duration-(--duration-fast) ease-(--ease-out)',
                bar.atEnd && 'opacity-0',
              )}
            />
          </div>
          <div aria-hidden className="px-3 pt-1.5 pb-1">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-border-strong"
                style={{ width: `${bar.size * 100}%`, transform: `translateX(${(bar.offset / bar.size) * 100}%)` }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain">{table}</div>
      )}
    </div>
  )
}
