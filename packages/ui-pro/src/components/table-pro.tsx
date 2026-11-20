'use client'

import * as React from 'react'
import { Badge } from '@uisatin/ui/badge'
import { Button, type ButtonProps } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Table, type Column, type Row, type Sort, type TableProps } from '@uisatin/ui/table'

/**
 * TableGrouped: Satin Free's Table with what a sales or finance table needs on top. Its header,
 * sorting, selection, hover, zebra and sideways scroll are Table's own; this adds:
 *
 * - `getSubRows`: rows open onto rows of their own (a deal onto its line items) with a chevron
 *   in the first column; `expanded` / `defaultExpanded` / `onExpandedChange` hold the open ids.
 * - `groupBy`: rows gather under a header row per value of a field, with the count and each
 *   column's subtotal; a group closes and opens like a row (`collapsedGroups`).
 * - Columns take `format` (how their numbers read) and `aggregate` ('sum', 'avg', 'min', 'max',
 *   'count' or a function of the rows); group headers and the `footer` totals row, in a
 *   `<tfoot>`, use both, so a total reads like the cells above it.
 * - `pinned="start"`: the first column (with the checkbox column) stays put while the rest
 *   scroll sideways, and casts a shadow over them once they do.
 * - `density="compact"`: 32px rows instead of 40.
 *
 * Rows that come into view as their group or parent opens fade in over --duration-base; heights
 * never animate. With sub-rows or groups the table is a `treegrid`: rows take focus one at a time
 * (↑ ↓ Home End move, → opens or goes to the first child, ← closes or goes to the parent, Enter
 * toggles, Space selects), carry `aria-level`, `aria-expanded` and `aria-selected`, and the
 * chevrons are pointer shortcuts with `aria-expanded` of their own.
 *
 * Totals and subtotals count the rows you pass, not their sub-rows. Groups keep the order their
 * first row has in `rows` unless `groupOrder` says otherwise; sorting a column sorts inside each
 * group and inside each parent. Other props, `ref` included, go to Table's frame.
 *
 * Part: `TableRowToggle`, the chevron button, for a Table of your own with `renderRow`.
 */

/** The words the grouped table says on its own. They join SatinLabels, so the app translates them there. */
export const tableProLabels = {
  /** The chevron of a row or a group: "Rows under Acme Corp". It says expanded or collapsed itself. */
  tableRowsUnder: (name: string) => `Rows under ${name}`,
  /** Read after a group's count: "3 rows". */
  tableGroupCount: (count: number) => `${count} ${count === 1 ? 'row' : 'rows'}`,
  /** A group's checkbox, which picks every row in it. */
  tableSelectGroup: (name: string) => `Select all in ${name}`,
}

type TableProLabels = typeof tableProLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends TableProLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...tableProLabels, ...labels }), [labels])
}

/* ---------- columns, totals ---------- */

/** How a column sums up its rows in group headers and the totals row. */
export type Aggregate = 'sum' | 'avg' | 'min' | 'max' | 'count'

/** A Table column, plus how its numbers read and how they total. */
export type TableGroupedColumn<R extends Row = Row> = Column<R> & {
  /**
   * Writes the column's numbers, e.g. `(v) => eur.format(v)`: its cells (unless it has its own
   * `cell`), the group subtotals and the total, so all three read alike. Without it, totals go
   * through `Intl.NumberFormat` in the labels' `dateLocale`.
   */
  format?: (value: number) => React.ReactNode
  /**
   * The subtotal in each group header and the total in the `footer` row: a sum, average, minimum
   * or maximum of the column's numbers, the number of rows, or your own `(rows) => number`. The
   * first column's cell names the row instead (the group, "Total"), so it takes none.
   */
  aggregate?: Aggregate | ((rows: R[]) => number | null)
}

/** A group: the value its rows share at `groupBy`, as text, and the rows. */
export type TableGroup<R extends Row = Row> = { value: string; rows: R[] }

const field = (row: Row, key: string) => (row as Record<string, unknown>)[key]

/** A column's subtotal or total for some rows, as a number; null when it has none. */
export function aggregateRows<R extends Row>(rows: R[], column: Pick<TableGroupedColumn<R>, 'key' | 'aggregate'>): number | null {
  const how = column.aggregate
  if (!how) return null
  if (typeof how === 'function') return how(rows)
  if (how === 'count') return rows.length
  const values = rows.map((r) => field(r, column.key)).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
  if (!values.length) return null
  if (how === 'sum') return values.reduce((a, b) => a + b, 0)
  if (how === 'avg') return values.reduce((a, b) => a + b, 0) / values.length
  return how === 'min' ? Math.min(...values) : Math.max(...values)
}

function compare(a: unknown, b: unknown) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true })
}

/* ---------- the toggle ---------- */

export interface TableRowToggleProps extends Omit<ButtonProps, 'children' | 'onClick' | 'variant' | 'size' | 'iconOnly'> {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  /** The row it opens, for its name: "Rows under <name>". */
  name: string
}

/**
 * The chevron that opens a row: a tertiary xs icon Button with `aria-expanded`, pointing to the
 * row's end when closed and down when open. Other props, `ref` included, go to the button.
 */
export function TableRowToggle({ expanded, onExpandedChange, name, className, ...props }: TableRowToggleProps) {
  const labels = useLabels()
  return (
    <Button
      type="button"
      variant="tertiary"
      size="xs"
      iconOnly
      aria-expanded={expanded}
      aria-label={labels.tableRowsUnder(name)}
      onClick={(e) => {
        // A click on a group's chevron is not also a click on its row.
        e.stopPropagation()
        onExpandedChange(!expanded)
      }}
      className={cn('shrink-0', className)}
      {...props}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className={cn('transition-transform duration-(--duration-fast) ease-(--ease-out)', expanded ? 'rotate-90' : 'rtl:rotate-180')}
      >
        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Button>
  )
}

/* ---------- the table ---------- */

export interface TableGroupedProps<R extends Row = Row>
  extends Omit<TableProps<R>, 'columns' | 'footer' | 'tableProps' | 'renderCell' | 'renderRow'> {
  columns: TableGroupedColumn<R>[]
  /** A row's own rows, shown under it when it's open. Rows without any get no chevron. */
  getSubRows?: (row: R) => R[] | undefined
  /** Ids of the open rows (controlled). */
  expanded?: string[]
  /** Ids of the rows open at first (uncontrolled). */
  defaultExpanded?: string[]
  onExpandedChange?: (ids: string[]) => void
  /** Gathers the rows under a header row per value of this field. */
  groupBy?: keyof R & string
  /** Group values in the order to show them; groups left out follow, in the order of their first row. */
  groupOrder?: string[]
  /** Draws a group's name in its header (a Badge, say); the value as text by default. */
  renderGroup?: (group: TableGroup<R>) => React.ReactNode
  /** Values of the closed groups (controlled). Groups are open unless listed. */
  collapsedGroups?: string[]
  /** Values of the groups closed at first (uncontrolled). */
  defaultCollapsedGroups?: string[]
  onCollapsedGroupsChange?: (values: string[]) => void
  /** Keeps the first column (and the checkbox column) in place while the rest scroll sideways, with a shadow over them. */
  pinned?: 'start'
  /** Adds the totals row, in a `<tfoot>`: "Total", then each column's `aggregate` in its `format`. */
  footer?: boolean
  /** Row height: 40px, or 32px with `compact`. */
  density?: 'default' | 'compact'
  /** Ids of the rows picked at first (uncontrolled). */
  defaultSelected?: string[]
  /**
   * Draws a body cell's content, after the column's own `cell`; the first column keeps the chevron
   * and the indent in front of it. `depth` is 0 for a row you passed, 1 for its sub-rows.
   */
  renderCell?: (cell: { row: R; column: TableGroupedColumn<R>; depth: number; content: React.ReactNode }) => React.ReactNode
  /**
   * Draws each body row, as Table's `renderRow`: spread `rowProps` (focus, keys, ARIA and styles)
   * on your `<tr>` and put `children` inside. Group header rows are drawn by the table.
   */
  renderRow?: (row: { row: R; depth: number; selected: boolean; rowProps: React.ComponentProps<'tr'>; children: React.ReactNode }) => React.ReactNode
}

type GroupItem<R extends Row> = { kind: 'group'; id: string; group: TableGroup<R>; pos: number; size: number; expanded: boolean; entering: boolean }
type RowItem<R extends Row> = {
  kind: 'row'
  id: string
  row: R
  depth: number
  level: number
  pos: number
  size: number
  expandable: boolean
  expanded: boolean
  parent?: string
  entering: boolean
}
type Item<R extends Row> = GroupItem<R> | RowItem<R>

// Groups ride along Table's rows; their ids can't be a row's.
const GROUP = '\u0000group:'
const groupId = (value: string) => GROUP + value

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [own, setOwn] = React.useState(defaultValue)
  const current = value !== undefined ? value : own
  const set = (next: T) => {
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }
  return [current, set] as const
}

// Cell boxes for the rows the table draws itself (group headers, totals), at either density.
// Table's own cells change height through table-pro.css.
const cellBox = {
  default: 'h-10 overflow-hidden py-2 ps-3 pe-2.5 align-middle text-body leading-(--text-body--line-height)',
  compact: 'h-8 overflow-hidden py-1 ps-3 pe-2.5 align-middle text-body leading-(--text-body--line-height)',
}
const checkBox = { default: 'py-2 ps-2 align-middle', compact: 'py-1 ps-2 align-middle' }

export function TableGrouped<R extends Row = Row>({
  columns,
  rows,
  getSubRows,
  expanded: expandedProp,
  defaultExpanded = [],
  onExpandedChange,
  groupBy,
  groupOrder,
  renderGroup,
  collapsedGroups: collapsedProp,
  defaultCollapsedGroups = [],
  onCollapsedGroupsChange,
  pinned,
  footer = false,
  density = 'default',
  selectable = false,
  selected: selectedProp,
  defaultSelected = [],
  onSelectedChange,
  defaultSort = null,
  onSortChange,
  manualSort = false,
  overflow = 'fit',
  rowLabel,
  renderCell,
  renderRow,
  ref,
  ...props
}: TableGroupedProps<R>) {
  const labels = useLabels()
  const [expanded, setExpanded] = useControllable(expandedProp, defaultExpanded, onExpandedChange)
  const [collapsed, setCollapsed] = useControllable(collapsedProp, defaultCollapsedGroups, onCollapsedGroupsChange)
  const [selected, setSelected] = useControllable(selectedProp, defaultSelected, onSelectedChange)
  const [sort, setSort] = React.useState<Sort>(defaultSort)
  const tree = Boolean(getSubRows || groupBy)
  const first = columns[0]

  // Rows that come into view as a group or parent opens fade in; the mark comes off once the
  // fade is over, so a later sort (which moves rows in the DOM) doesn't replay it.
  const [entering, setEntering] = React.useState<string[]>([])
  const timers = React.useRef<number[]>([])
  React.useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const markEntering = (id: string) => {
    setEntering((ids) => [...ids, id])
    timers.current.push(window.setTimeout(() => setEntering((ids) => ids.filter((x) => x !== id)), 400))
  }

  const toggleRow = (id: string, open: boolean) => {
    setExpanded(open ? [...expanded.filter((x) => x !== id), id] : expanded.filter((x) => x !== id))
    if (open) markEntering(id)
  }
  const toggleGroup = (value: string, open: boolean) => {
    setCollapsed(open ? collapsed.filter((v) => v !== value) : [...collapsed, value])
    if (open) markEntering(groupId(value))
  }

  const groups = React.useMemo(() => {
    if (!groupBy) return []
    const byValue = new Map<string, R[]>()
    for (const row of rows) {
      const value = String(field(row, groupBy) ?? '')
      const list = byValue.get(value)
      if (list) list.push(row)
      else byValue.set(value, [row])
    }
    const order = [...(groupOrder ?? []).filter((v) => byValue.has(v)), ...[...byValue.keys()].filter((v) => !groupOrder?.includes(v))]
    return order.map((value): TableGroup<R> => ({ value, rows: byValue.get(value)! }))
  }, [rows, groupBy, groupOrder])

  // What Table draws, top to bottom: group headers, rows, and the sub-rows of open rows.
  const items = React.useMemo(() => {
    const open = new Set(expanded)
    const closedGroups = new Set(collapsed)
    const fading = new Set(entering)
    const out: Item<R>[] = []
    const order = (list: R[]) => {
      if (!sort || manualSort) return list
      const sorted = [...list].sort((a, b) => compare(field(a, sort.key), field(b, sort.key)))
      return sort.direction === 'desc' ? sorted.reverse() : sorted
    }
    const walk = (list: R[], depth: number, base: number, parent: string | undefined, fadeIn: boolean) => {
      const sorted = order(list)
      sorted.forEach((row, i) => {
        const subRows = getSubRows?.(row) ?? []
        const isOpen = subRows.length > 0 && open.has(row.id)
        out.push({ kind: 'row', id: row.id, row, depth, level: base + depth, pos: i + 1, size: sorted.length, expandable: subRows.length > 0, expanded: isOpen, parent, entering: fadeIn })
        if (isOpen) walk(subRows, depth + 1, base, row.id, fadeIn || fading.has(row.id))
      })
    }
    if (groupBy) {
      groups.forEach((group, i) => {
        const id = groupId(group.value)
        const isOpen = !closedGroups.has(group.value)
        out.push({ kind: 'group', id, group, pos: i + 1, size: groups.length, expanded: isOpen, entering: false })
        if (isOpen) walk(group.rows, 0, 2, id, fading.has(id))
      })
    } else walk(rows, 0, 1, undefined, false)
    return out
  }, [rows, groups, groupBy, getSubRows, expanded, collapsed, entering, sort, manualSort])

  const nameOf = (row: R, index: number) => {
    if (rowLabel) return rowLabel(row, index)
    const value = first ? field(row, first.key) : undefined
    return typeof value === 'string' || typeof value === 'number' ? String(value) : row.id
  }

  /* --- selection: kept here; a group is picked in Table when all its rows are --- */
  const picked = new Set(selected)
  const groupPicked = (group: TableGroup<R>) => group.rows.length > 0 && group.rows.every((r) => picked.has(r.id))
  const tableSelected = [...selected, ...groups.filter(groupPicked).map((g) => groupId(g.value))]
  const onTableSelected = (next: string[]) => {
    // Table's header box clears with [] and picks every row it shows; a row box adds or drops one.
    if (next.length === 0) return setSelected([])
    const now = new Set(next)
    const before = new Set(tableSelected)
    const result = new Set(selected)
    for (const item of items) {
      if (now.has(item.id) === before.has(item.id)) continue
      const ids = item.kind === 'group' ? item.group.rows.map((r) => r.id) : [item.id]
      for (const id of ids) now.has(item.id) ? result.add(id) : result.delete(id)
    }
    setSelected([...result])
  }
  const toggleSelected = (ids: string[], on: boolean) => {
    const result = new Set(selected)
    for (const id of ids) on ? result.add(id) : result.delete(id)
    setSelected([...result])
  }

  /* --- treegrid focus: one row takes Tab, the arrows move it --- */
  const [activeId, setActiveId] = React.useState<string>()
  const active = items.some((i) => i.id === activeId) ? activeId : items[0]?.id
  const root = React.useRef<HTMLDivElement>(null)
  const focusItem = (item: Item<R> | undefined) => {
    if (!item) return
    setActiveId(item.id)
    root.current?.querySelectorAll<HTMLTableRowElement>('tbody > tr')[items.indexOf(item)]?.focus()
  }
  const onRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, item: Item<R>) => {
    if (e.target !== e.currentTarget || e.altKey || e.metaKey) return
    const index = items.indexOf(item)
    const rtl = e.currentTarget.closest('[dir]')?.getAttribute('dir') === 'rtl'
    const canOpen = item.kind === 'group' || item.expandable
    const toggle = (open: boolean) => (item.kind === 'group' ? toggleGroup(item.group.value, open) : toggleRow(item.id, open))
    switch (e.key) {
      case 'ArrowDown':
        focusItem(items[index + 1])
        break
      case 'ArrowUp':
        focusItem(items[index - 1])
        break
      case 'Home':
        focusItem(items[0])
        break
      case 'End':
        focusItem(items[items.length - 1])
        break
      case rtl ? 'ArrowLeft' : 'ArrowRight':
        if (canOpen && !item.expanded) toggle(true)
        else if (canOpen) focusItem(items[index + 1])
        break
      case rtl ? 'ArrowRight' : 'ArrowLeft':
        if (canOpen && item.expanded) toggle(false)
        else if (item.kind === 'row' && item.parent) focusItem(items.find((i) => i.id === item.parent))
        break
      case 'Enter':
        if (canOpen) toggle(!item.expanded)
        break
      case ' ':
        if (!selectable) return
        if (item.kind === 'group') toggleSelected(item.group.rows.map((r) => r.id), !groupPicked(item.group))
        else toggleSelected([item.id], !picked.has(item.id))
        break
      default:
        return
    }
    e.preventDefault()
  }
  const treeProps = (item: Item<R>, isSelected?: boolean): React.ComponentProps<'tr'> =>
    tree
      ? {
          tabIndex: item.id === active ? 0 : -1,
          'aria-level': item.kind === 'group' ? 1 : item.level,
          'aria-posinset': item.pos,
          'aria-setsize': item.size,
          'aria-expanded': item.kind === 'group' || item.expandable ? item.expanded : undefined,
          'aria-selected': selectable && item.kind === 'row' ? isSelected : undefined,
          onKeyDown: (e) => onRowKeyDown(e, item),
          onFocus: () => setActiveId(item.id),
        }
      : {}

  /* --- pinned: the shadow shows once the columns have scrolled under the first one --- */
  const [scrolled, setScrolled] = React.useState(false)
  React.useEffect(() => {
    const el = root.current
    if (!el || pinned !== 'start') return
    // Scroll doesn't bubble; catch Table's own scroller on the way down.
    const onScroll = (e: Event) => {
      if (e.target instanceof HTMLElement && e.target !== el) setScrolled(Math.abs(e.target.scrollLeft) > 0)
    }
    el.addEventListener('scroll', onScroll, true)
    return () => el.removeEventListener('scroll', onScroll, true)
  }, [pinned])

  /* --- totals --- */
  const top = groupBy ? groups.flatMap((g) => g.rows) : rows
  const total = (column: TableGroupedColumn<R>, list: R[]) => {
    const value = aggregateRows(list, column)
    if (value == null) return null
    return column.format ? column.format(value) : new Intl.NumberFormat(labels.dateLocale).format(value)
  }

  const box = cellBox[density]
  const end = (c: TableGroupedColumn<R>) => c.align === 'right' && 'text-end'

  const groupRow = (item: GroupItem<R>) => {
    const { group } = item
    const all = groupPicked(group)
    const some = !all && group.rows.some((r) => picked.has(r.id))
    // A line between groups (the first sits right under the header's own), drawn inside the
    // cells so a group row is as high as any other.
    const edge = item.pos > 1 && '[box-shadow:inset_0_var(--border-width-default)_0_var(--border-subtle)]'
    return (
      <tr
        data-group=""
        data-enter={item.entering ? '' : undefined}
        className="cursor-default bg-component-table-header"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('button, a, input, label')) toggleGroup(group.value, !item.expanded)
        }}
        {...treeProps(item)}
      >
        {selectable && (
          <td className={cn(checkBox[density], edge)}>
            <Checkbox
              aria-label={labels.tableSelectGroup(group.value)}
              checked={all ? true : some ? 'indeterminate' : false}
              onCheckedChange={(v) => toggleSelected(group.rows.map((r) => r.id), v === true)}
              className="align-middle"
            />
          </td>
        )}
        {columns.map((c, i) =>
          i === 0 ? (
            <th key={c.key} scope="row" className={cn(box, 'ps-1.5 text-start font-medium text-text-default', edge)}>
              <div className="flex min-w-0 items-center gap-1.5">
                <TableRowToggle
                  tabIndex={tree ? -1 : undefined}
                  expanded={item.expanded}
                  onExpandedChange={(open) => toggleGroup(group.value, open)}
                  name={group.value}
                />
                <span className="min-w-0 truncate">{renderGroup ? renderGroup(group) : group.value}</span>
                <Badge size="sm" variant="outline" shape="rounded">
                  <span aria-hidden>{group.rows.length}</span>
                  <span className="sr-only">{labels.tableGroupCount(group.rows.length)}</span>
                </Badge>
              </div>
            </th>
          ) : (
            <td key={c.key} className={cn(box, 'font-medium text-text-default', end(c), edge)}>
              <span className="block truncate">{total(c, group.rows)}</span>
            </td>
          ),
        )}
      </tr>
    )
  }

  // The totals row sits a quiet step off the rows: darker in Light, lighter in Dark.
  const totalsRow = footer ? (
    <tr className="bg-component-table-pro-total-bg">
      {selectable && <td className={cn(checkBox[density], 'border-t border-border-subtle')} />}
      {columns.map((c, i) =>
        i === 0 ? (
          <th key={c.key} scope="row" className={cn(box, 'border-t border-border-subtle text-start font-medium text-text-default')}>
            <span className="block truncate">{labels.total}</span>
          </th>
        ) : (
          <td key={c.key} className={cn(box, 'border-t border-border-subtle font-medium text-text-default', end(c))}>
            <span className="block truncate">{total(c, top)}</span>
          </td>
        ),
      )}
    </tr>
  ) : undefined

  const byKey = new Map(columns.map((c) => [c.key, c]))
  const tableColumns: Column<Item<R>>[] = columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: c.width,
    sortable: c.sortable,
    align: c.align,
    cell: (item) => {
      if (item.kind !== 'row') return null
      if (c.cell) return c.cell(item.row)
      const value = field(item.row, c.key)
      return c.format && typeof value === 'number' ? c.format(value) : (value as React.ReactNode)
    },
  }))

  return (
    <Table<Item<R>>
      ref={(el: HTMLDivElement | null) => {
        root.current = el
        if (typeof ref === 'function') return ref(el)
        if (ref) ref.current = el
      }}
      data-slot="table-pro"
      data-density={density}
      data-pinned={pinned}
      data-sticky={pinned || overflow === 'scroll' ? '' : undefined}
      data-selectable={selectable ? '' : undefined}
      data-scrolled={scrolled ? '' : undefined}
      {...props}
      columns={tableColumns}
      rows={items}
      overflow={overflow}
      manualSort
      defaultSort={defaultSort}
      onSortChange={(next) => {
        setSort(next)
        onSortChange?.(next)
      }}
      selectable={selectable}
      selected={tableSelected}
      onSelectedChange={onTableSelected}
      rowLabel={(item, index) => (item.kind === 'row' ? nameOf(item.row, index) : item.group.value)}
      tableProps={tree ? { role: 'treegrid', 'aria-multiselectable': selectable || undefined } : undefined}
      footer={totalsRow}
      renderCell={({ row: item, column, content }) => {
        if (item.kind !== 'row') return null
        const own = renderCell ? renderCell({ row: item.row, column: byKey.get(column.key)!, depth: item.depth, content }) : content
        if (!getSubRows || column.key !== first?.key) return own
        // The first column: the indent for the depth, then the chevron or its room.
        return (
          <div className="flex min-w-0 flex-1 items-center gap-1" style={{ paddingInlineStart: item.depth * 28 }}>
            {item.expandable ? (
              <TableRowToggle
                tabIndex={-1}
                expanded={item.expanded}
                onExpandedChange={(open) => toggleRow(item.id, open)}
                name={nameOf(item.row, items.indexOf(item))}
              />
            ) : (
              <span aria-hidden className="w-control-height-xs shrink-0" />
            )}
            {typeof own === 'string' || typeof own === 'number' ? <span className="min-w-0 truncate">{own}</span> : own}
          </div>
        )
      }}
      renderRow={({ row: item, selected: isSelected, rowProps, children }) => {
        if (item.kind === 'group') return groupRow(item)
        const merged: React.ComponentProps<'tr'> = { ...rowProps, ...treeProps(item, isSelected), 'data-enter': item.entering ? '' : undefined } as React.ComponentProps<'tr'>
        return renderRow ? (
          renderRow({ row: item.row, depth: item.depth, selected: isSelected, rowProps: merged, children })
        ) : (
          <tr {...merged}>{children}</tr>
        )
      }}
    />
  )
}
