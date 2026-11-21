'use client'

import * as React from 'react'
import { NavArrowDown, NavArrowLeft, Xmark, XmarkCircle } from 'iconoir-react'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Calendar, formatDate, formatRange, type DateRange } from '@uisatin/ui/date-picker'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  MenuItemContent,
  menuGroupLabelClass,
  menuItemClass,
} from '@uisatin/ui/dropdown'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Popover } from '@uisatin/ui/popover'
import { Tooltip } from '@uisatin/ui/tooltip'
import { RollingNumber } from './rolling-number'

/**
 * FilterBar: one facet per field, each in a fixed place in the bar, idle ("Stage ▾") or set
 * ("Owner: Me ×"). No "+ Filter" and no operators: a facet opens one surface with its choices,
 * and its × clears it. For any list or grid; changes apply as they are made.
 *
 * - `enum`, `person`, `multi`: a menu of checkboxes that stays open. One pick writes `is`,
 *   several `isAnyOf` (a `multi` field always writes `hasAnyOf`). A `person` field lists its
 *   `me` first, as "Me". When an option has a `tone`, picks show as Badges, two at most, then "+N".
 * - `number`: a menu of `presets`, one pick.
 * - `date`: `presets` ("This quarter", "Last 30 days") and Custom range…, which swaps the list
 *   for a Calendar on the same surface; a complete range applies and closes it.
 * - `value` is plain JSON (`{ field, operator, value }[]`, dates as `YYYY-MM-DD`): keep it in a
 *   URL or save it. `applyFilters(rows, value, fields)` filters rows in the browser.
 * - A field has one filter: the first filter of a field counts, and a facet's change replaces
 *   all of that field's filters. A filter no facet can say (an operator the type doesn't take,
 *   no known option, a range the wrong way round) leaves its facet idle and doesn't apply.
 * - Keys: Enter, Space or ↓ on a facet opens it; the arrows, Home and End move, Enter or Space
 *   picks, and Escape closes it (from the calendar, back to the list first).
 *
 * Parts, for a bar of your own: `FilterBarRoot` › `FilterBarFacet`, `FilterBarClear`,
 * `FilterBarCount`. Other props on FilterBar and FilterBarRoot, `ref` included, go to the bar's
 * `div` (a `group` named "Filters").
 */

/* ---------- the value ---------- */

/** What a field holds, which picks its facet. */
export type FilterFieldType = 'enum' | 'person' | 'multi' | 'number' | 'date'

/**
 * What a facet can say. `enum` and `person` take `is` and `isAnyOf`, `multi` takes `hasAnyOf`,
 * `number` takes `gt`, `gte`, `lt`, `lte` and `between`, `date` takes `inThis`, `inLast` and
 * `between`. Anything else leaves the facet idle and doesn't apply.
 */
export type FilterOperator = 'is' | 'isAnyOf' | 'hasAnyOf' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'inThis' | 'inLast'

/** The period of "This quarter". Weeks start on Monday. */
export type FilterPeriod = 'week' | 'month' | 'quarter' | 'year'

/**
 * A filter's value, plain JSON. By operator: an option's value (`is`), several (`isAnyOf`,
 * `hasAnyOf`), a number (`gt`…) or two (`between`), two days as `YYYY-MM-DD` (`between` on a
 * date), a number of days (`inLast`), a `FilterPeriod` (`inThis`).
 */
export type FilterValue = string | number | string[] | [number, number]

/** One field's filter: "Stage: Qualified" is `{ field: 'stage', operator: 'is', value: 'qualified' }`. */
export interface Filter {
  /** The field's `key`. */
  field: string
  operator: FilterOperator
  value: FilterValue
}

/** One choice of an `enum`, `multi` or `person` field. */
export interface FilterOption {
  value: string
  label: string
  /** A 16px icon before the label in the menu: a person's avatar. */
  icon?: React.ReactNode
  /**
   * The option as a Badge of this tone, in the menu and in the set facet, as a table shows it.
   * One option with a tone draws the whole field as Badges; options without one are neutral.
   */
  tone?: BadgeTone
}

/** A number facet's choice. `label` replaces the compact text ("> €10k" for "> €10K"). */
export type FilterNumberPreset =
  | { operator: 'gt' | 'gte' | 'lt' | 'lte'; value: number; label?: string }
  | { operator: 'between'; value: [number, number]; label?: string }

/** A period is "This quarter" (`inThis`); a number is "Last 30 days" (`inLast`). */
export type FilterDatePreset = FilterPeriod | number

interface FilterFieldBase {
  /** What the filters name in `field`, and what `applyFilters` reads from each row. */
  key: string
  /** The field's name: the idle facet's text, and the start of the set facet's name. */
  label: string
  /** A shorter name for the set facet only ("Close: This quarter"); screen readers hear `label`. */
  shortLabel?: string
}

export interface FilterOptionsField extends FilterFieldBase {
  /** `enum`: the row holds one of the options. `multi`: the row holds a list of them. */
  type: 'enum' | 'multi'
  options: FilterOption[]
}

export interface FilterPersonField extends FilterFieldBase {
  type: 'person'
  /** The people; an option's `icon` is its 16px avatar. */
  options: FilterOption[]
  /** The option that is the person using the app: first in the menu, as "Me". */
  me?: string
}

export interface FilterNumberField extends FilterFieldBase {
  type: 'number'
  /** The menu's choices, in order. */
  presets: FilterNumberPreset[]
  /** How numbers read, e.g. `{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }`. The facet shows them compact. */
  format?: Intl.NumberFormatOptions
}

export interface FilterDateField extends FilterFieldBase {
  type: 'date'
  /** The list's choices, in order. Defaults to this month, quarter and year, then the last 30 days. */
  presets?: FilterDatePreset[]
  /** Ends the list with Custom range…, a Calendar on the same surface. Defaults to true. */
  customRange?: boolean
}

export type FilterField = FilterOptionsField | FilterPersonField | FilterNumberField | FilterDateField

const PERIODS: readonly string[] = ['week', 'month', 'quarter', 'year']
const DATE_PRESETS: FilterDatePreset[] = ['month', 'quarter', 'year', 30]
/** Badges a set facet shows before "+N", so a long pick can't push the rest of the bar away. */
const MAX_BADGES = 2

/* ---------- words ---------- */

type Comparison = 'gt' | 'gte' | 'lt' | 'lte'
const COMPARISONS: readonly string[] = ['gt', 'gte', 'lt', 'lte']
const COMPARISON_TEXT: Record<Comparison, string> = { gt: '>', gte: '≥', lt: '<', lte: '≤' }
const COMPARISON_NAME: Record<Comparison, string> = { gt: 'over', gte: 'at least', lt: 'under', lte: 'at most' }

/** The words the Filter bar says on its own. They join SatinLabels, so the app translates them there. */
export const filterBarLabels = {
  /** The bar's name: a `group` around the facets. */
  filterBar: 'Filters',
  /** The button that clears every facet, and its tooltip. */
  filterClearAll: 'Clear filters',
  /** A set facet's ×. */
  filterClearField: (field: string) => `Clear ${field}`,
  /** A set facet's name: the field's label and its value in full ("Owner: Me or Jon Park"). */
  filterFacetValue: (field: string, value: string) => `${field}: ${value}`,
  /** A person field's `me`, first in its menu and in the facet. */
  filterMe: 'Me',
  /** The picks past the ones a set facet shows: "+2". */
  filterMore: (count: number) => `+${count}`,
  /** A number as a facet shows it, already formatted: "> €20K". */
  filterComparison: (operator: Comparison, value: string) => `${COMPARISON_TEXT[operator]} ${value}`,
  /** …and as screen readers hear it: "over €20,000". */
  filterComparisonName: (operator: Comparison, value: string) => `${COMPARISON_NAME[operator]} ${value}`,
  /** Both ends of a range, already formatted, as a facet shows them: "€10K – €20K", "Nov 3 – Nov 18". */
  filterRange: (from: string, to: string) => `${from} – ${to}`,
  /** …and as screen readers hear them: "€10,000 to €20,000". */
  filterRangeName: (from: string, to: string) => `${from} to ${to}`,
  /** A period preset: "This quarter". */
  filterThis: (period: FilterPeriod): string => `This ${period}`,
  /** A number-of-days preset: "Last 30 days". */
  filterLastDays: (count: number) => (count === 1 ? 'Last day' : `Last ${count} days`),
  /** The date list's last row, which opens the calendar. */
  filterCustomRange: 'Custom range…',
  /** The surface's title while the calendar shows. */
  filterCustomRangeTitle: 'Custom range',
  /** From the calendar back to the list. */
  filterBack: 'Back',
  /** Over the calendar, before the first day is picked. */
  filterPickStart: 'Pick the first day',
  /** …once it is: "Nov 3 – pick the end". */
  filterPickEnd: (from: string) => `${from} – pick the end`,
  /**
   * The live result count, "14 results". `number` is the count as shown (it rolls); `count`
   * picks the plural. Write it with JSX: `(count, number) => <>{number} wyników</>`.
   */
  filterResults: (count: number, number: React.ReactNode): React.ReactNode => (
    <>
      {number} {count === 1 ? 'result' : 'results'}
    </>
  ),
}

type FilterBarLabels = typeof filterBarLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends FilterBarLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...filterBarLabels, ...labels }), [labels])
}
type Labels = ReturnType<typeof useLabels>

/* ---------- checks ---------- */

const pad = (n: number) => String(n).padStart(2, '0')
/** A day as the `YYYY-MM-DD` a date filter stores, in local time. */
export const toFilterDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseDay = (s: unknown): Date | null => {
  if (typeof s !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null
}
const isNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

type OptionsField = FilterOptionsField | FilterPersonField

/** The options a filter picks that the field still has, in the field's order. Unknown values drop out. */
function picksOf(filter: Filter, field: OptionsField): string[] {
  const { operator: op, value: v } = filter
  const fits = field.type === 'multi' ? op === 'hasAnyOf' && Array.isArray(v) : (op === 'is' && typeof v === 'string') || (op === 'isAnyOf' && Array.isArray(v))
  if (!fits) return []
  const picked: unknown[] = Array.isArray(v) ? v : [v]
  return field.options.filter((o) => picked.includes(o.value)).map((o) => o.value)
}

/** A date filter's two days, when they are days and run the right way. */
function daysOf(v: unknown): [Date, Date] | null {
  if (!Array.isArray(v) || v.length !== 2) return null
  const [a, b] = v.map(parseDay)
  return a && b && a <= b ? [a, b] : null
}

/** Whether a facet can say the filter, so it applies. */
function fits(filter: Filter, field: FilterField): boolean {
  const { operator: op, value: v } = filter
  switch (field.type) {
    case 'enum':
    case 'person':
    case 'multi':
      return picksOf(filter, field).length > 0
    case 'number':
      if (op === 'between') return Array.isArray(v) && v.length === 2 && isNumber(v[0]) && isNumber(v[1]) && v[0] <= v[1]
      return COMPARISONS.includes(op) && isNumber(v)
    case 'date':
      if (op === 'inThis') return PERIODS.includes(v as string)
      if (op === 'inLast') return Number.isInteger(v) && (v as number) > 0
      return op === 'between' && daysOf(v) !== null
    default:
      return false
  }
}

/**
 * Whether a filter applies: its field exists, the field's facet takes its operator and its value
 * is complete (an options filter needs one option the field still has). It doesn't see the other
 * filters: of two on one field, `applyFilters` and the bar take the first.
 */
export function isFilterValid(filter: Filter, fields: readonly FilterField[]) {
  const field = fields.find((f) => f.key === filter.field)
  return !!field && fits(filter, field)
}

/** The filters that apply: the first of each field, when it fits. */
function activeOf(filters: readonly Filter[], fields: readonly FilterField[]) {
  const seen = new Set<string>()
  return filters.flatMap((filter) => {
    if (seen.has(filter.field)) return []
    seen.add(filter.field)
    const field = fields.find((f) => f.key === filter.field)
    return field && fits(filter, field) ? [{ filter, field }] : []
  })
}

/** The field's filter: the first one, as `applyFilters` reads it. */
const readFilter = (filters: readonly Filter[], key: string) => filters.find((f) => f.field === key)

/** The filters with all of the field's swapped for `next`, where the first was (so the order holds), or dropped when `next` is null. */
function writeFilter(filters: readonly Filter[], key: string, next: Filter | null): Filter[] {
  const at = filters.findIndex((f) => f.field === key)
  const rest = filters.filter((f) => f.field !== key)
  if (!next) return rest
  return at === -1 ? [...rest, next] : [...rest.slice(0, at), next, ...rest.slice(at)]
}

/* ---------- filtering rows ---------- */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** A row's date (a Date, `YYYY-MM-DD`, any string Date can read, or a timestamp) as its day. */
const dayOf = (raw: unknown): Date | null => {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : startOfDay(raw)
  if (typeof raw === 'string') {
    const day = parseDay(raw)
    if (day) return day
    const t = Date.parse(raw)
    return Number.isNaN(t) ? null : startOfDay(new Date(t))
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return startOfDay(new Date(raw))
  return null
}

/** The first day of `period` around `today`, and the first day after it. */
function periodOf(period: FilterPeriod, today: Date): [Date, Date] {
  const y = today.getFullYear()
  const m = today.getMonth()
  if (period === 'week') {
    const start = addDays(today, -((today.getDay() + 6) % 7))
    return [start, addDays(start, 7)]
  }
  if (period === 'month') return [new Date(y, m, 1), new Date(y, m + 1, 1)]
  if (period === 'quarter') {
    const q = m - (m % 3)
    return [new Date(y, q, 1), new Date(y, q + 3, 1)]
  }
  return [new Date(y, 0, 1), new Date(y + 1, 0, 1)]
}

/** A date filter's days: the first day in and the first day after. */
function spanOf({ operator: op, value: v }: Filter, today: Date): [Date, Date] {
  if (op === 'inThis') return periodOf(v as FilterPeriod, today)
  if (op === 'inLast') return [addDays(today, -(v as number)), addDays(today, 1)]
  const [a, b] = daysOf(v) as [Date, Date]
  return [a, addDays(b, 1)]
}

/** A test for a row's value, from a filter that fits its field. */
function matcherOf(filter: Filter, field: FilterField, today: Date): (raw: unknown) => boolean {
  const { operator: op, value: v } = filter
  switch (field.type) {
    case 'enum':
    case 'person':
    case 'multi': {
      const want = picksOf(filter, field)
      return (raw) => (Array.isArray(raw) ? raw : raw == null ? [] : [raw]).some((r) => want.includes(String(r)))
    }
    case 'number': {
      const [a, b] = op === 'between' ? (v as [number, number]) : [v as number, v as number]
      const test = (n: number) => (op === 'between' ? n >= a && n <= b : op === 'gt' ? n > a : op === 'gte' ? n >= a : op === 'lt' ? n < a : n <= a)
      return (raw) => raw != null && raw !== '' && !Number.isNaN(Number(raw)) && test(Number(raw))
    }
    case 'date': {
      const [start, end] = spanOf(filter, today)
      return (raw) => {
        const d = dayOf(raw)
        return !!d && d >= start && d < end
      }
    }
  }
}

export interface ApplyFiltersOptions<T> {
  /** Reads a field from a row. Defaults to `row[field]`. */
  getValue?: (row: T, field: string) => unknown
  /** Today, for `inThis` and `inLast`. Defaults to now. */
  today?: Date
}

/**
 * The rows every filter lets through, for a List, a Table or a DataGrid that filters in the
 * browser. As in the bar, only the first filter of a field counts, and one that can't apply (see
 * `isFilterValid`) is left out; an options filter ignores values the field doesn't have. A row
 * value that is an array matches when any of it does.
 */
export function applyFilters<T>(rows: readonly T[], filters: readonly Filter[], fields: readonly FilterField[], options: ApplyFiltersOptions<T> = {}): T[] {
  const get = options.getValue ?? ((row: T, key: string) => (row as Record<string, unknown>)[key])
  const today = startOfDay(options.today ?? new Date())
  const tests = activeOf(filters, fields).map(({ filter, field }) => ({ key: field.key, test: matcherOf(filter, field, today) }))
  return rows.filter((row) => tests.every(({ key, test }) => test(get(row, key))))
}

/* ---------- what a facet says ---------- */

type NumberChoice = { operator: FilterOperator; value: FilterValue; label?: string }

/** A number filter or preset as the facet shows it (compact, or the preset's label) and as it is heard (in full). */
function numberWords(field: FilterNumberField, labels: Labels) {
  const compact = new Intl.NumberFormat(labels.dateLocale, { notation: 'compact', ...field.format })
  const full = new Intl.NumberFormat(labels.dateLocale, field.format)
  const say = ({ operator, value }: NumberChoice, f: Intl.NumberFormat, range: typeof labels.filterRange, comparison: typeof labels.filterComparison) =>
    operator === 'between' ? range(f.format((value as number[])[0]), f.format((value as number[])[1])) : comparison(operator as Comparison, f.format(value as number))
  return {
    text: (c: NumberChoice) => c.label ?? say(c, compact, labels.filterRange, labels.filterComparison),
    name: (c: NumberChoice) => say(c, full, labels.filterRangeName, labels.filterComparisonName),
  }
}

const samePreset = (p: FilterNumberPreset, f: Filter) =>
  p.operator === f.operator && (p.operator === 'between' ? Array.isArray(f.value) && p.value[0] === f.value[0] && p.value[1] === f.value[1] : p.value === f.value)

const presetFilter = (key: string, p: FilterDatePreset): Filter =>
  typeof p === 'number' ? { field: key, operator: 'inLast', value: p } : { field: key, operator: 'inThis', value: p }

/** Days as a facet shows them: month and day in the current year, with the year otherwise. */
function dayWords(labels: Labels, today: Date) {
  const short = new Intl.DateTimeFormat(labels.dateLocale, { month: 'short', day: 'numeric' })
  const year = today.getFullYear()
  const day = (d: Date) => (d.getFullYear() === year ? short.format(d) : formatDate(d, labels.dateLocale))
  const thisYear = ([a, b]: [Date, Date]) => a.getFullYear() === year && b.getFullYear() === year
  const same = ([a, b]: [Date, Date]) => a.getTime() === b.getTime()
  return {
    day,
    text: (r: [Date, Date]) =>
      thisYear(r) ? (same(r) ? day(r[0]) : labels.filterRange(day(r[0]), day(r[1]))) : formatRange({ from: r[0], to: r[1] }, labels.dateLocale),
    // Both ends the same way: with the year, unless both are in this one.
    name: (r: [Date, Date]) => {
      const f = (d: Date) => (thisYear(r) ? short.format(d) : formatDate(d, labels.dateLocale))
      return same(r) ? f(r[0]) : labels.filterRangeName(f(r[0]), f(r[1]))
    },
  }
}

/* ---------- the bar ---------- */

interface BarContextValue {
  labels: Labels
  fields: readonly FilterField[]
  value: Filter[]
  setValue: (next: Filter[]) => void
  /** Replaces all of the field's filters with `next`, or drops them. */
  write: (key: string, next: Filter | null) => void
  resultCount?: number
  resultLabel: (count: number, number: React.ReactNode) => React.ReactNode
  container?: HTMLElement | null
  today?: Date
  rootRef: React.RefObject<HTMLDivElement | null>
}

const BarContext = React.createContext<BarContextValue | null>(null)

function useBar(part: string) {
  const bar = React.useContext(BarContext)
  if (!bar) throw new Error(`${part} must be inside FilterBarRoot`)
  return bar
}

const triggerSelector = '[data-slot="filter-bar-facet-trigger"]'

export interface FilterBarRootProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  /** What can be filtered: one facet each, in this order. */
  fields: FilterField[]
  /** The filters (controlled). Plain JSON. */
  value?: Filter[]
  /** The filters to start with (uncontrolled). */
  defaultValue?: Filter[]
  /** Every change: a pick, a preset, a range, a clear. */
  onValueChange?: (value: Filter[]) => void
  /** How many rows the filters let through, shown live ("14 results"). Leave it out to hide the count. */
  resultCount?: number
  /** The count's words, "14 deals": `number` is the rolling number, `count` picks the plural. Defaults to the `filterResults` label. */
  resultLabel?: (count: number, number: React.ReactNode) => React.ReactNode
  /** Portal target of the menus, the date surface and the tooltip. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** Today, for the calendar and for which dates show their year. Defaults to now. */
  today?: Date
}

/** The bar on its own: the parts go inside. Other props, `ref` included, go to its `div`. */
export function FilterBarRoot({
  fields,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  resultCount,
  resultLabel,
  container,
  today,
  className,
  children,
  ref,
  ...props
}: FilterBarRootProps) {
  const labels = useLabels()
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  const [inner, setInner] = React.useState(defaultValue)
  const value = valueProp ?? inner
  const valueRef = React.useRef(value)
  valueRef.current = value
  const onValueChangeRef = React.useRef(onValueChange)
  onValueChangeRef.current = onValueChange
  const controlled = valueProp !== undefined
  const setValue = React.useCallback(
    (next: Filter[]) => {
      valueRef.current = next
      if (!controlled) setInner(next)
      onValueChangeRef.current?.(next)
    },
    [controlled],
  )

  const bar: BarContextValue = {
    labels,
    fields,
    value,
    setValue,
    write: (key, next) => setValue(writeFilter(valueRef.current, key, next)),
    resultCount,
    resultLabel: resultLabel ?? labels.filterResults,
    container,
    today,
    rootRef,
  }

  return (
    <BarContext.Provider value={bar}>
      <div
        ref={(node: HTMLDivElement | null) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        role="group"
        aria-label={labels.filterBar}
        data-slot="filter-bar"
        className={cn('flex flex-wrap items-center gap-1.5', className)}
        {...props}
      >
        {children}
      </div>
    </BarContext.Provider>
  )
}

/* ---------- the facet ---------- */

// The shell draws the skin; the buttons inside it are bare. Idle reads as a secondary button,
// set reads as pressed in: the selected fill and the strong edge, no drop shadow.
const shellClass =
  'inline-flex h-control-height shrink-0 items-center rounded-lg border border-strong text-sm whitespace-nowrap transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-out)'
const idleClass =
  'border-border-default bg-bg-popover text-text-muted [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)] satin-hover:border-border-strong satin-hover:bg-bg-hover has-[[aria-expanded=true]]:border-border-strong has-[[aria-expanded=true]]:bg-bg-hover'
const activeClass = 'border-border-strong bg-bg-selected text-text-default'
// The ring sits 2px off the trigger; after a mouse press satin.css drops it ([data-slot][aria-haspopup]).
// The insets are a little under a Button's 10px, so five facets, Clear and the count fit one row.
const triggerClass =
  'flex h-full cursor-pointer items-center rounded-[inherit] ps-2 outline-none satin-focus:outline-2 satin-focus:outline-solid satin-focus:outline-offset-2 satin-focus:outline-action-focus-ring'
const clearClass =
  'me-1 grid size-5 shrink-0 cursor-pointer place-items-center rounded-md text-text-muted outline-none transition-colors duration-(--duration-fast) ease-(--ease-out) hover:bg-bg-pressed hover:text-text-default focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]'

type ShellOwnProps = Omit<React.ComponentProps<'span'>, 'children'>

interface ShellProps extends ShellOwnProps {
  field: FilterField
  /** The value in a few words ("Me +1") or Badges; null while the facet is idle. */
  value: React.ReactNode
  /** The value in full, for screen readers ("Me or Jon Park"). */
  name: string
  onClear: () => void
  /** Puts the trigger in its surface: a DropdownMenu or a Popover. */
  surface: (trigger: React.ReactElement) => React.ReactNode
  /** More for the trigger: the date facet's ↓ to open. */
  triggerProps?: React.ComponentProps<'button'>
}

function FacetShell({ field, value, name, onClear, surface, triggerProps, className, ...props }: ShellProps) {
  const { labels } = useBar('FilterBarFacet')
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const active = value !== null
  const trigger = (
    <button
      {...triggerProps}
      ref={triggerRef}
      type="button"
      data-slot="filter-bar-facet-trigger"
      aria-label={active ? labels.filterFacetValue(field.label, name) : undefined}
      className={cn(triggerClass, active ? 'gap-1 pe-0.5' : 'gap-1 pe-1.5')}
    >
      {active ? (
        <>
          <span className="text-text-muted">{field.shortLabel ?? field.label}:</span>
          {/* Flex, so Badges sit centred in the facet; words sit as they would anyway. */}
          <span className="flex items-center gap-1 font-medium">{value}</span>
        </>
      ) : (
        <>
          <span className="font-medium">{field.label}</span>
          <NavArrowDown aria-hidden className="size-4 [stroke-width:1.875]" />
        </>
      )}
    </button>
  )
  return (
    <span data-slot="filter-bar-facet" data-active={active || undefined} className={cn(shellClass, active ? activeClass : idleClass, className)} {...props}>
      {surface(trigger)}
      {active && (
        <button
          type="button"
          data-slot="filter-bar-facet-clear"
          aria-label={labels.filterClearField(field.label)}
          onClick={() => {
            onClear()
            // The × goes with the value; focus stays on the facet.
            triggerRef.current?.focus()
          }}
          className={clearClass}
        >
          <Xmark aria-hidden className="size-3.5 [stroke-width:1.875]" />
        </button>
      )}
    </span>
  )
}

/** The last group of a menu: Clear, under a rule, there even while idle so the list never jumps. */
function ClearGroup({ disabled, onClear }: { disabled: boolean; onClear: () => void }) {
  const { labels } = useBar('FilterBarFacet')
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem label={labels.clear} layout="inline" disabled={disabled} onSelect={onClear} />
    </DropdownMenuGroup>
  )
}

/* enum, person, multi: any of, as checkboxes */

function OptionsFacet({ field, ...props }: ShellOwnProps & { field: OptionsField }) {
  const bar = useBar('FilterBarFacet')
  const { labels } = bar
  const filter = readFilter(bar.value, field.key)
  const me = field.type === 'person' ? field.me : undefined
  const options = me === undefined ? field.options : [...field.options].sort((a, b) => Number(b.value === me) - Number(a.value === me))
  const nameOf = (o: FilterOption) => (o.value === me ? labels.filterMe : o.label)
  const picks = filter ? picksOf(filter, field) : []
  const on = options.filter((o) => picks.includes(o.value))
  const badges = field.options.some((o) => o.tone)
  const toneOf = (o: FilterOption) => o.tone ?? 'neutral'

  const set = (next: string[]) =>
    bar.write(
      field.key,
      !next.length
        ? null
        : field.type === 'multi'
          ? { field: field.key, operator: 'hasAnyOf', value: next }
          : next.length === 1
            ? { field: field.key, operator: 'is', value: next[0] }
            : { field: field.key, operator: 'isAnyOf', value: next },
    )
  const toggle = (value: string, checked: boolean) => set(options.filter((o) => (o.value === value ? checked : picks.includes(o.value))).map((o) => o.value))

  const shown = badges ? MAX_BADGES : 1
  const more = on.length - shown
  const value = !on.length ? null : (
    <>
      {on.slice(0, shown).map((o) =>
        badges ? (
          // A neutral fill is close to the set facet's own (bg/selected), so it gets its edge instead.
          <Badge key={o.value} size="sm" tone={toneOf(o)} variant={toneOf(o) === 'neutral' ? 'outline' : 'soft'}>
            {nameOf(o)}
          </Badge>
        ) : (
          <span key={o.value}>{nameOf(o)}</span>
        ),
      )}
      {more > 0 && <span className="tabular-nums">{labels.filterMore(more)}</span>}
    </>
  )

  return (
    <FacetShell
      {...props}
      field={field}
      value={value}
      name={new Intl.ListFormat(labels.dateLocale, { type: 'disjunction' }).format(on.map(nameOf))}
      onClear={() => set([])}
      surface={(trigger) => (
        // Not modal: a press on the next facet closes this menu and opens that one in one go.
        <DropdownMenu trigger={trigger} aria-label={field.label} modal={false} container={bar.container}>
          <DropdownMenuGroup>
            {options.map((o) => (
              <DropdownMenuCheckboxItem
                key={o.value}
                label={nameOf(o)}
                icon={o.icon}
                layout="inline"
                renderLabel={
                  badges
                    ? (label) => (
                        <Badge size="sm" tone={toneOf(o)}>
                          {label}
                        </Badge>
                      )
                    : undefined
                }
                checked={picks.includes(o.value)}
                onCheckedChange={(checked) => toggle(o.value, checked)}
              />
            ))}
          </DropdownMenuGroup>
          <ClearGroup disabled={!on.length} onClear={() => set([])} />
        </DropdownMenu>
      )}
    />
  )
}

/* number: one preset */

function NumberFacet({ field, ...props }: ShellOwnProps & { field: FilterNumberField }) {
  const bar = useBar('FilterBarFacet')
  const filter = readFilter(bar.value, field.key)
  const set = filter && fits(filter, field) ? filter : null
  const words = numberWords(field, bar.labels)
  // The facet's words come from the filter; a preset only names it and checks its row.
  const at = set ? field.presets.findIndex((p) => samePreset(p, set)) : -1
  const write = (next: Filter | null) => bar.write(field.key, next)
  return (
    <FacetShell
      {...props}
      field={field}
      value={set ? words.text(at >= 0 ? field.presets[at] : set) : null}
      name={set ? words.name(set) : ''}
      onClear={() => write(null)}
      surface={(trigger) => (
        <DropdownMenu trigger={trigger} aria-label={field.label} modal={false} container={bar.container}>
          <DropdownMenuRadioGroup
            value={at >= 0 ? String(at) : ''}
            onValueChange={(i) => {
              const p = field.presets[Number(i)]
              if (p) write({ field: field.key, operator: p.operator, value: p.value })
            }}
          >
            {field.presets.map((p, i) => (
              <DropdownMenuRadioItem key={i} value={String(i)} label={words.text(p)} layout="inline" />
            ))}
          </DropdownMenuRadioGroup>
          <ClearGroup disabled={!set} onClear={() => write(null)} />
        </DropdownMenu>
      )}
    />
  )
}

/* date: presets, or a range on the same surface */

/**
 * A Popover, not a DropdownMenu: Custom range… swaps the list for a Calendar on the same
 * surface, and a menu keeps Tab from moving between Back and the calendar. The list acts as a
 * menu would: focus stays on it while the arrows move the highlight (aria-activedescendant).
 */
function DateFacet({ field, ...props }: ShellOwnProps & { field: FilterDateField }) {
  const bar = useBar('FilterBarFacet')
  const { labels } = bar
  const today = bar.today ?? new Date()
  const days = dayWords(labels, today)
  const presets = field.presets ?? DATE_PRESETS
  const customRange = field.customRange ?? true
  const filter = readFilter(bar.value, field.key)
  const set = filter && fits(filter, field) ? filter : null
  const range = set?.operator === 'between' ? daysOf(set.value) : null
  const at = set ? presets.findIndex((p) => typeof p === 'number' ? set.operator === 'inLast' && set.value === p : set.operator === 'inThis' && set.value === p) : -1
  const CUSTOM = presets.length
  const selected = at >= 0 ? at : range && customRange ? CUSTOM : -1
  const write = (next: Filter | null) => bar.write(field.key, next)
  const presetText = (p: FilterDatePreset) => (typeof p === 'number' ? labels.filterLastDays(p) : labels.filterThis(p))
  const text = !set ? null : range ? days.text(range) : presetText(set.value as FilterDatePreset)

  const [open, setOpen] = React.useState(false)
  const [picking, setPicking] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange>({ from: null, to: null })
  const [active, setActive] = React.useState(0)
  const [focused, setFocused] = React.useState(false)
  const [hovered, setHovered] = React.useState(false)
  // The row gets the focus ring only when keys put it there (see menuItemClass).
  const [viaKeys, setViaKeys] = React.useState(false)
  const byKeys = React.useRef(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  const calendarRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()

  const rows = [...presets.map(presetText), ...(customRange ? [labels.filterCustomRange] : [])]
  const close = () => setOpen(false)
  const pick = (i: number) => {
    if (i !== CUSTOM) {
      write(presetFilter(field.key, presets[i]))
      return close()
    }
    setDraft(range ? { from: range[0], to: range[1] } : { from: null, to: null })
    setPicking(true)
  }
  const back = () => {
    setPicking(false)
    setActive(CUSTOM)
  }
  // The swap moves focus with it: into the calendar's day, or back to the list.
  React.useEffect(() => {
    if (!open) return
    const target = picking ? calendarRef.current?.querySelector<HTMLElement>('[data-slot="calendar-day"][tabindex="0"]') : listRef.current
    target?.focus()
  }, [picking])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!rows.length) return
    const move = (to: number) => {
      e.preventDefault()
      setViaKeys(true)
      setActive((to + rows.length) % rows.length)
    }
    if (e.key === 'ArrowDown') move(active + 1)
    else if (e.key === 'ArrowUp') move(active - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(rows.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(active)
    }
  }

  const list = (
    // -mt-3: 4px under the header, as in a menu, not the Popover's 16px.
    <div className="-mx-1 -mt-3 flex flex-col gap-1">
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={field.label}
        aria-activedescendant={rows.length ? `${listId}-${active}` : undefined}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPointerLeave={() => setHovered(false)}
        // The list holds focus but draws no ring of its own: the highlighted row shows it (data-keyboard).
        className="flex flex-col gap-0.5 outline-none focus-visible:ring-0"
      >
        {rows.map((label, i) => {
          const lit = i === active && (focused || hovered)
          return (
            <div
              key={i}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === selected}
              data-highlighted={lit ? '' : undefined}
              data-keyboard={lit && focused && viaKeys ? '' : undefined}
              onPointerMove={() => {
                setHovered(true)
                setViaKeys(false)
                setActive(i)
              }}
              // Focus stays on the list.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
              className={cn(menuItemClass, i === selected && 'bg-bg-selected')}
            >
              <MenuItemContent label={label} description={i === CUSTOM && range ? days.text(range) : undefined} layout="inline" selected={i === selected} />
            </div>
          )
        })}
      </div>
      <div aria-hidden className="h-(--border-width-default) bg-bg-muted" />
      <button
        type="button"
        disabled={!set}
        data-disabled={!set || undefined}
        onClick={() => {
          write(null)
          close()
        }}
        className={cn(menuItemClass, 'satin-hover:bg-bg-selected')}
      >
        <MenuItemContent label={labels.clear} layout="inline" />
      </button>
    </div>
  )

  const calendar = (
    <div ref={calendarRef} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Button variant="tertiary" size="xs" onClick={back}>
          <NavArrowLeft />
          {labels.filterBack}
        </Button>
        <span aria-live="polite" className="text-sm text-text-muted tabular-nums">
          {draft.from ? (draft.to ? days.text([draft.from, draft.to]) : labels.filterPickEnd(days.day(draft.from))) : labels.filterPickStart}
        </span>
      </div>
      <Calendar
        mode="range"
        range={draft}
        today={bar.today}
        onRangeChange={(r) => {
          setDraft(r)
          // A complete range is the answer: it applies and the surface closes.
          if (r.from && r.to) {
            write({ field: field.key, operator: 'between', value: [toFilterDate(r.from), toFilterDate(r.to)] })
            close()
          }
        }}
      />
    </div>
  )

  return (
    <FacetShell
      {...props}
      field={field}
      value={text}
      name={!set ? '' : range ? days.name(range) : (text as string)}
      onClear={() => write(null)}
      triggerProps={{
        // ↓ opens it too, as on the menus' triggers.
        onKeyDown: (e) => {
          byKeys.current = true
          if (e.key !== 'ArrowDown') return
          e.preventDefault()
          setPicking(false)
          setActive(Math.max(0, selected))
          setViaKeys(true)
          setOpen(true)
        },
        onPointerDown: () => {
          byKeys.current = false
        },
      }}
      surface={(trigger) => (
        <Popover
          // Known debt: the Popover imitates a menu with margins tied to its 10px padding. The
          // title is drawn as a menu's group header (12px text/muted, in line with the rows' labels).
          title={<span className={cn(menuGroupLabelClass, '-ms-1 -mt-1.5')}>{picking ? labels.filterCustomRangeTitle : field.label}</span>}
          // The list ends 6px from the edge, as it starts; the calendar keeps the Popover's 10px.
          className={picking ? undefined : 'pb-1.5'}
          closeButton={false}
          container={bar.container}
          open={open}
          onOpenChange={(next) => {
            if (next) {
              setPicking(false)
              setActive(Math.max(0, selected))
              setViaKeys(byKeys.current)
            }
            setOpen(next)
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            listRef.current?.focus()
          }}
          // Escape on the calendar goes back to the list first.
          onEscapeKeyDown={(e: KeyboardEvent) => {
            if (!picking) return
            e.preventDefault()
            back()
          }}
          body={picking ? calendar : list}
        >
          {trigger}
        </Popover>
      )}
    />
  )
}

export interface FilterBarFacetProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  /** The field's `key`. A key the bar's `fields` don't have renders nothing. */
  field: string
}

/**
 * One field's facet: idle, its label and a chevron; set, its value and a ×. The surface it opens
 * fits the field's type (checkboxes, presets, presets and a calendar). Other props, `ref`
 * included, go to its outer `span`.
 */
export function FilterBarFacet({ field: key, ...props }: FilterBarFacetProps) {
  const bar = useBar('FilterBarFacet')
  const field = bar.fields.find((f) => f.key === key)
  if (!field) return null
  if (field.type === 'number') return <NumberFacet field={field} {...props} />
  if (field.type === 'date') return <DateFacet field={field} {...props} />
  return <OptionsFacet field={field} {...props} />
}

/* ---------- clear and count ---------- */

export interface FilterBarClearProps extends Omit<React.ComponentProps<typeof Button>, 'variant' | 'iconOnly' | 'asChild' | 'children'> {}

/**
 * Clears every filter, then focuses the first facet. An icon button with a tooltip, so the
 * count keeps its row; nothing while no filter applies. Other props, `ref` included, go to the
 * Button.
 */
export function FilterBarClear({ onClick, ...props }: FilterBarClearProps) {
  const bar = useBar('FilterBarClear')
  if (!activeOf(bar.value, bar.fields).length) return null
  return (
    <Tooltip label={bar.labels.filterClearAll} container={bar.container}>
      <Button
        aria-label={bar.labels.filterClearAll}
        {...props}
        data-slot="filter-bar-clear"
        variant="tertiary"
        iconOnly
        onClick={(e) => {
          onClick?.(e)
          if (e.defaultPrevented) return
          bar.setValue([])
          // Clear goes with the filters; focus moves to the first facet.
          bar.rootRef.current?.querySelector<HTMLElement>(triggerSelector)?.focus()
        }}
      >
        <XmarkCircle />
      </Button>
    </Tooltip>
  )
}

export interface FilterBarCountProps extends React.ComponentProps<'span'> {}

/**
 * "14 results" at the end of the row, its digits rolling as the count changes and read out once
 * it does. Nothing without `resultCount`. Other props, `ref` included, go to its `span`.
 */
export function FilterBarCount({ className, ...props }: FilterBarCountProps) {
  const bar = useBar('FilterBarCount')
  if (bar.resultCount == null) return null
  const count = bar.resultCount
  const formatted = new Intl.NumberFormat(bar.labels.dateLocale).format(count)
  return (
    <span
      data-slot="filter-bar-count"
      aria-live="polite"
      // The whole "14 deals", not just the digits that changed.
      aria-atomic="true"
      className={cn('ms-auto shrink-0 text-sm leading-5 whitespace-nowrap text-text-muted', className)}
      {...props}
    >
      {bar.resultLabel(
        count,
        <>
          <RollingNumber text={formatted} value={count} />
          <span className="sr-only">{formatted}</span>
        </>,
      )}
    </span>
  )
}

/* ---------- the common case ---------- */

export interface FilterBarProps extends Omit<FilterBarRootProps, 'children'> {}

/**
 * The bar from props: a facet per field in order, then Clear, then the count at the end of the
 * row. Other props, `ref` included, go to the bar's `div`.
 */
export function FilterBar(props: FilterBarProps) {
  return (
    <FilterBarRoot {...props}>
      {props.fields.map((f) => (
        <FilterBarFacet key={f.key} field={f.key} />
      ))}
      <FilterBarClear />
      <FilterBarCount />
    </FilterBarRoot>
  )
}
