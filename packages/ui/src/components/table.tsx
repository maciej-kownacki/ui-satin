'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { Checkbox } from './checkbox'
import { useSatinLabels } from './labels'

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

/** A row: any object with a string `id`. Interfaces work too; no index signature needed. */
export type Row = { id: string }

interface ColumnBase<R extends Row> {
  header: React.ReactNode
  /** fr weight with overflow="fit" (default 1), pixels with overflow="scroll" (default 160). */
  width?: number
  sortable?: boolean
  align?: 'left' | 'right'
}

/**
 * A column. Its `key` names a field of the row and the cell shows that field, so a typo in `key`
 * is a type error. A computed column (a field the row doesn't have) gives its own `cell`.
 */
export type Column<R extends Row = Row> =
  | (ColumnBase<R> & {
      key: keyof R & string
      /** Renders the cell; defaults to the row's value at `key`. */
      cell?: (row: R) => React.ReactNode
    })
  | (ColumnBase<R> & { key: string; cell: (row: R) => React.ReactNode })

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
  /**
   * Names a row for its select checkbox ("Select Acme Corp" instead of "Select row 3"), e.g.
   * `(row) => row.name`. `index` is the row's place as shown, from 0. Without it the checkbox
   * says the row's number, which changes when the table is sorted.
   */
  rowLabel?: (row: R, index: number) => string
  /**
   * Draws every body cell's content, after the column's own `cell`: `content` is what the cell
   * would show. Wrap it (a link to the row's page), or replace it; the cell keeps its padding,
   * alignment and truncation.
   */
  renderCell?: (cell: { row: R; column: Column<R>; index: number; content: React.ReactNode }) => React.ReactNode
  /**
   * Draws each body row. Spread `rowProps` (state and styles) on your `<tr>` and put `children`
   * (the cells) inside, to add a handler, a data attribute or a context provider:
   * `renderRow={({ row, rowProps, children }) => <tr {...rowProps} onClick={() => open(row)}>{children}</tr>}`.
   */
  renderRow?: (row: { row: R; index: number; selected: boolean; rowProps: React.ComponentProps<'tr'>; children: React.ReactNode }) => React.ReactNode
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
// Tailwind sees every class. Corners are logical, so the outline mirrors right to left.
const cellHover = {
  first: [
    'group-hover/row:rounded-s-xl group-hover/row:bg-bg-hover group-hover/row:[box-shadow:inset_1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    'group-data-[force=hover]/row:rounded-s-xl group-data-[force=hover]/row:bg-bg-hover group-data-[force=hover]/row:[box-shadow:inset_1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    // An inset shadow has no logical form: right to left, the start line is on the right.
    'group-hover/row:rtl:[box-shadow:inset_-1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    'group-data-[force=hover]/row:rtl:[box-shadow:inset_-1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
  ].join(' '),
  middle: [
    'group-hover/row:bg-bg-hover group-hover/row:[box-shadow:inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    'group-data-[force=hover]/row:bg-bg-hover group-data-[force=hover]/row:[box-shadow:inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
  ].join(' '),
  last: [
    'group-hover/row:rounded-e-xl group-hover/row:bg-bg-hover group-hover/row:[box-shadow:inset_-1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    'group-data-[force=hover]/row:rounded-e-xl group-data-[force=hover]/row:bg-bg-hover group-data-[force=hover]/row:[box-shadow:inset_-1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    'group-hover/row:rtl:[box-shadow:inset_1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
    'group-data-[force=hover]/row:rtl:[box-shadow:inset_1px_0_0_var(--border-strong),inset_0_1px_0_var(--border-strong),inset_0_-1px_0_var(--border-strong)]',
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
  rowLabel,
  renderCell,
  renderRow,
  className,
  ...props
}: TableProps<R>) {
  const labels = useSatinLabels()
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
    const field = (r: R) => (r as Record<string, unknown>)[sort.key]
    const s = [...rows].sort((a, b) => compare(field(a), field(b)))
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
      // Right to left, scrollLeft runs from 0 down to -max; the thumb moves from the start the same way.
      setBar({ size, offset: max > 0 ? el.scrollLeft / el.scrollWidth : 0, atEnd: Math.abs(el.scrollLeft) >= max - 1 })
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

  // The leading column(s) stay put while the rest scroll, at the start side.
  const stickyFirst = (bg: string) => (scroll ? cn('sticky z-[1]', bg) : '')
  const firstDataStart = selectable ? 'start-6' : 'start-0'

  const cellPosition = (index: number, count: number) =>
    count === 1 ? cellHover.only : index === 0 ? cellHover.first : index === count - 1 ? cellHover.last : cellHover.middle
  const cellCount = columns.length + (selectable ? 1 : 0)

  const table = (
    <table
      aria-label={label}
      // Not text-start: a <th> centres its text unless the table sets an alignment, so it's
      // explicit, and right to left it's the right.
      className="w-full table-fixed border-separate border-spacing-0 text-left rtl:text-right"
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
              className={cn('border-b border-border-subtle py-2 ps-2 align-middle', stickyFirst('start-0 bg-component-table-header'))}
            >
              <Checkbox
                aria-label={labels.selectAllRows}
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
                  'h-8 overflow-hidden border-b border-border-subtle py-1 ps-1 pe-2 align-middle font-medium',
                  // 'right' lines up at the end: the left in right-to-left, like the numbers it is for.
                  c.align === 'right' && 'text-end',
                  i === 0 && stickyFirst(cn(firstDataStart, 'bg-component-table-header')),
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
          const rowProps: React.ComponentProps<'tr'> = { 'data-state': isSelected ? 'selected' : undefined, className: cn('group/row', rowBg, rowHover) } as React.ComponentProps<'tr'>
          const cells = (
            <>
              {selectable && (
                <td className={cn('py-2 ps-2 align-middle', cellPosition(0, cellCount), stickyFirst(cn('start-0', rowBg)))}>
                  <Checkbox
                    aria-label={rowLabel ? labels.selectNamedRow(rowLabel(row, r)) : labels.selectRow(r + 1)}
                    checked={isSelected}
                    onCheckedChange={(v) =>
                      setSelected(v === true ? [...selected, row.id] : selected.filter((id) => id !== row.id))
                    }
                    className="align-middle"
                  />
                </td>
              )}
              {columns.map((c, i) => {
                const own = c.cell ? c.cell(row) : ((row as Record<string, unknown>)[c.key] as React.ReactNode)
                const content = renderCell ? renderCell({ row, column: c, index: r, content: own }) : own
                const plain = typeof content === 'string' || typeof content === 'number'
                return (
                  <td
                    key={c.key}
                    className={cn(
                      'h-10 overflow-hidden py-2 ps-3 pe-2.5 align-middle text-body leading-(--text-body--line-height) text-text-default',
                      c.align === 'right' && 'text-end',
                      cellPosition(i + (selectable ? 1 : 0), cellCount),
                      i === 0 && stickyFirst(cn(firstDataStart, rowBg)),
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
            </>
          )
          return renderRow ? (
            <React.Fragment key={row.id}>{renderRow({ row, index: r, selected: isSelected, rowProps, children: cells })}</React.Fragment>
          ) : (
            <tr key={row.id} {...rowProps}>
              {cells}
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
              aria-label={labels.tableRegion(label)}
              className="overflow-x-auto [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
            >
              {table}
            </div>
            <div
              aria-hidden
              className={cn(
                // The fade sits at the end, where more columns wait; a gradient has no logical form.
                'pointer-events-none absolute inset-y-0 end-0 w-16 bg-linear-to-r from-bg-card-fade to-bg-card rtl:bg-linear-to-l',
                'transition-opacity duration-(--duration-fast) ease-(--ease-out)',
                bar.atEnd && 'opacity-0',
              )}
            />
          </div>
          <div aria-hidden className="px-3 pt-1.5 pb-1">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-bg-muted">
              <div
                className="absolute inset-y-0 start-0 rounded-full bg-border-strong"
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
