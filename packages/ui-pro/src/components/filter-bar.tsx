'use client'

import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { Chip, chipVariants } from '@uisatin/ui/chip'
import { Combobox } from '@uisatin/ui/combobox'
import { Calendar, formatDate, formatRange } from '@uisatin/ui/date-picker'
import { DropdownMenu, DropdownMenuItem } from '@uisatin/ui/dropdown'
import { Input, type InputProps } from '@uisatin/ui/input'
import { KbdGroup } from '@uisatin/ui/kbd'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { NumberInput } from '@uisatin/ui/number-input'
import { Popover } from '@uisatin/ui/popover'
import { Select, type SelectOption } from '@uisatin/ui/select'
import { RollingNumber } from './rolling-number'

/**
 * FilterBar: filters as chips that read as sentences ("Stage is Interview", "Value > 20,000",
 * "Close date this quarter"), for any list or grid. `+ Filter` opens the fields; picking one adds
 * a chip with its editor open. Each chip is a button that opens its editor in a Popover: the
 * operator (a Select) over the value, whose control fits the field's type (Select, Combobox,
 * Input, NumberInput, Calendar). Changes apply as they are made, so the result count (shown
 * live, its digits rolling) follows every chip.
 *
 * - `value` is plain JSON (`{ field, operator, value }[]`, dates as `YYYY-MM-DD`): keep it in a
 *   URL, save it as a view, send it to the server. `applyFilters(rows, value, fields)` filters
 *   rows in the browser for a List, a Table or a DataGrid.
 * - A new chip fades in and settles 4px; a removed one fades out (opacity only). Under reduced
 *   motion both are cut.
 * - A filter that can't apply (no value, a range the wrong way round, an option that's gone)
 *   shows an error edge, says why in its editor, and is left out by `applyFilters`. A new chip
 *   closed before it has a value is dropped.
 * - Past `maxVisible` chips the rest fold into "+3 more"; pressing it shows them all.
 * - `views` (a menu that sets the filters) and `onSaveView` (Save view, which asks for a name).
 * - Keys: Enter or Space on a chip opens its editor, Backspace or Delete removes it; in the
 *   editor, Enter in a field or a single pick closes it and Escape closes it as it is. Backspace
 *   in the empty search removes the last chip. `shortcut` (F) opens `+ Filter` while focus is in
 *   the bar's parent and not in a field.
 *
 * Parts, for a bar of your own: `FilterBarRoot` › `FilterBarSearch`, `FilterBarChips`,
 * `FilterBarAdd`, `FilterBarCount`, `FilterBarViews`. Other props on FilterBar and
 * FilterBarRoot, `ref` included, go to the bar's `div` (a `group` named "Filters").
 */

/* ---------- the value ---------- */

/** What a field holds, which picks its operators and its editor. */
export type FilterFieldType = 'enum' | 'multi' | 'text' | 'number' | 'date' | 'person'

export type FilterOperator =
  | 'is'
  | 'isNot'
  | 'isAnyOf'
  | 'isNoneOf'
  | 'hasAnyOf'
  | 'hasAllOf'
  | 'hasNoneOf'
  | 'contains'
  | 'doesNotContain'
  | 'startsWith'
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'inLast'
  | 'inThis'
  | 'before'
  | 'after'

/** The period of "Close date this quarter". Weeks start on Monday. */
export type FilterPeriod = 'week' | 'month' | 'quarter' | 'year'

/**
 * A filter's value, plain JSON. By operator: an option's value (`is`), several (`isAnyOf`,
 * `hasAllOf`…), text (`contains`), a number (`gt`…) or two (`between`), a day as `YYYY-MM-DD`
 * (`is`, `before`, `after` on a date) or two (`between`), a number of days (`inLast`), a
 * `FilterPeriod` (`inThis`).
 */
export type FilterValue = string | number | string[] | [number, number]

/** One chip: "Stage is Interview" is `{ field: 'stage', operator: 'is', value: 'interview' }`. */
export interface Filter {
  /** The field's `key`. */
  field: string
  operator: FilterOperator
  value: FilterValue
}

export interface FilterField {
  /** What the filters name in `field`, and what `applyFilters` reads from each row. */
  key: string
  /** The field's name, first in its chips and in the `+ Filter` menu. */
  label: string
  type: FilterFieldType
  /** The choices of an `enum`, `multi` or `person` field. A `person` option's `icon` is its 16px avatar. */
  options?: SelectOption[]
  /** The operators to offer, in order; the first is where a new filter starts. Defaults to every operator of the type (`filterOperators`). */
  operators?: FilterOperator[]
  /** A 16px icon in the `+ Filter` menu. */
  icon?: React.ReactNode
  /** person: the option that is the person using the app. It comes first in the list, as "Me", and reads "me" in a chip ("Owner is me"). */
  me?: string
  /** number: the smallest value a filter may take. */
  min?: number
  /** number: the largest value a filter may take. */
  max?: number
  /** number: the step of the arrow keys. */
  step?: number
  /** number: how values read in a chip, e.g. `{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }`. */
  format?: Intl.NumberFormatOptions
  /** text: the editor's placeholder. */
  placeholder?: string
}

/** A saved set of filters, listed in the views menu. */
export interface FilterView {
  id: string
  label: string
  value: Filter[]
}

/** The operators of each type, in the order the editor lists them; the first is where a new filter starts. */
export const filterOperators: Record<FilterFieldType, FilterOperator[]> = {
  enum: ['is', 'isNot', 'isAnyOf', 'isNoneOf'],
  person: ['is', 'isNot', 'isAnyOf', 'isNoneOf'],
  multi: ['hasAnyOf', 'hasAllOf', 'hasNoneOf'],
  text: ['contains', 'doesNotContain', 'is', 'startsWith'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between'],
  date: ['inLast', 'inThis', 'is', 'before', 'after', 'between'],
}

const PERIODS: FilterPeriod[] = ['week', 'month', 'quarter', 'year']

/* ---------- words ---------- */

const OPERATOR_TEXT: Record<FilterOperator, string> = {
  is: 'is',
  isNot: 'is not',
  isAnyOf: 'is any of',
  isNoneOf: 'is none of',
  hasAnyOf: 'has any of',
  hasAllOf: 'has all of',
  hasNoneOf: 'has none of',
  contains: 'contains',
  doesNotContain: 'does not contain',
  startsWith: 'starts with',
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  between: 'between',
  inLast: 'in the last',
  inThis: 'this',
  before: 'before',
  after: 'after',
}
const OPERATOR_NAME: Partial<Record<FilterOperator, string>> = {
  eq: 'equals',
  neq: 'does not equal',
  gt: 'greater than',
  gte: 'at least',
  lt: 'less than',
  lte: 'at most',
}

/** The words the Filter bar says on its own. They join SatinLabels, so the app translates them there. */
export const filterBarLabels = {
  /** The bar's name: a `group` around the chips, `+ Filter` and the search. */
  filterBar: 'Filters',
  /** The `+ Filter` button. */
  filterAdd: 'Filter',
  /** An operator as chips and the operator menu show it: "is", "contains", ">". */
  filterOperator: (operator: FilterOperator): string => OPERATOR_TEXT[operator],
  /**
   * An operator in words where `filterOperator` is a symbol: "greater than". Screen readers hear
   * this one. `undefined` (every word operator) means the same as `filterOperator`.
   */
  filterOperatorName: (operator: FilterOperator): string | undefined => OPERATOR_NAME[operator],
  /** The value control's name: the field and the operator ("Stage is"). */
  filterValueOf: (field: string, operator: string) => `${field} ${operator}`,
  /** The period after "this": "Close date this quarter". */
  filterPeriod: (period: FilterPeriod): string => period,
  /** The days after "in the last": "30 days". */
  filterDays: (count: number) => (count === 1 ? '1 day' : `${count} days`),
  /** Both ends of a number range, already formatted: "10,000 and 20,000". */
  filterBetween: (from: string, to: string) => `${from} and ${to}`,
  /** Text a filter looks for: “acme”. */
  filterQuoted: (text: string) => `“${text}”`,
  /** A chip with more than two picks: "3 values". */
  filterValueCount: (count: number) => `${count} values`,
  /** The person using the app, in a chip: "Owner is me". */
  filterMe: 'me',
  /** …and first in the people list. */
  filterMeOption: 'Me',
  /** The chip that stands for the filters past `maxVisible`. */
  filterMore: (count: number) => `+${count} more`,
  /**
   * The live result count, "14 results". `number` is the count as shown (it rolls); `count`
   * picks the plural. Write it with JSX: `(count, number) => <>{number} wyników</>`.
   */
  filterResults: (count: number, number: React.ReactNode): React.ReactNode => (
    <>
      {number} {count === 1 ? 'result' : 'results'}
    </>
  ),
  /** Read out after a chip is removed, with the chip's words. */
  filterRemoved: (filter: string) => `${filter} removed`,
  /** Why a filter can't apply: it has no value yet. */
  filterValueMissing: 'Add a value',
  /** …its range runs the wrong way, or past the field's limits. */
  filterValueRange: 'Check the range',
  /** …its value (or its field) isn't one of the choices any more. */
  filterValueUnknown: 'Not one of the choices',
  /** The views menu, while the filters match no view. */
  filterViews: 'Views',
  /** The button that saves the filters as a view, and the title of what it opens. */
  filterSaveView: 'Save view',
  /** The view's name field. */
  filterViewName: 'Name',
  filterSave: 'Save',
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

/* ---------- operators, shapes and checks ---------- */

/** What the value of an operator looks like, which picks its editor. */
type Shape = 'option' | 'options' | 'text' | 'number' | 'numberRange' | 'date' | 'dateRange' | 'days' | 'period'

function shapeOf(type: FilterFieldType, operator: FilterOperator): Shape {
  switch (type) {
    case 'enum':
    case 'person':
      return operator === 'isAnyOf' || operator === 'isNoneOf' ? 'options' : 'option'
    case 'multi':
      return 'options'
    case 'text':
      return 'text'
    case 'number':
      return operator === 'between' ? 'numberRange' : 'number'
    case 'date':
      return operator === 'between' ? 'dateRange' : operator === 'inLast' ? 'days' : operator === 'inThis' ? 'period' : 'date'
  }
}

const operatorsOf = (field: FilterField) => {
  const all = filterOperators[field.type]
  const own = field.operators?.filter((o) => all.includes(o))
  return own?.length ? own : all
}

const clampToField = (n: number, field: FilterField) => Math.min(Math.max(n, field.min ?? -Infinity), field.max ?? Infinity)

/** Where a new filter of this shape starts. Text and picks start empty; numbers at 0 (or the field's min). */
function initialValue(shape: Shape, field: FilterField): FilterValue {
  switch (shape) {
    case 'option':
    case 'text':
    case 'date':
      return ''
    case 'options':
      return []
    case 'number':
      return clampToField(0, field)
    case 'numberRange': {
      const n = clampToField(0, field)
      return [n, n]
    }
    case 'dateRange':
      return ['', '']
    case 'days':
      return 30
    case 'period':
      return 'month'
  }
}

/** Keeps what it can of a value when the operator changes: "is Interview" → "is any of Interview". */
function convertValue(value: FilterValue, from: Shape, to: Shape, field: FilterField): FilterValue {
  if (from === to) return value
  if (from === 'option' && to === 'options') return typeof value === 'string' && value ? [value] : []
  if (from === 'options' && to === 'option') return Array.isArray(value) && value.length ? String(value[0]) : ''
  if (from === 'number' && to === 'numberRange' && typeof value === 'number') return [value, value]
  if (from === 'numberRange' && to === 'number' && Array.isArray(value) && typeof value[0] === 'number') return value[0]
  if (from === 'date' && to === 'dateRange' && typeof value === 'string' && value) return [value, value]
  if (from === 'dateRange' && to === 'date' && Array.isArray(value)) return String(value[0] ?? '')
  return initialValue(to, field)
}

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

type Problem = 'missing' | 'range' | 'unknown'

/** Why a filter can't apply, or null when it can. */
function problemOf(filter: Filter, field: FilterField | undefined): Problem | null {
  if (!field || !operatorsOf(field).includes(filter.operator)) return 'unknown'
  const v = filter.value
  const known = (x: unknown) => typeof x === 'string' && (!field.options || field.options.some((o) => o.value === x))
  const inBounds = (n: number) => n >= (field.min ?? -Infinity) && n <= (field.max ?? Infinity)
  const isNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
  switch (shapeOf(field.type, filter.operator)) {
    case 'option':
      return typeof v !== 'string' || !v ? 'missing' : known(v) ? null : 'unknown'
    case 'options':
      return !Array.isArray(v) || v.length === 0 ? 'missing' : v.every(known) ? null : 'unknown'
    case 'text':
      return typeof v === 'string' && v.trim() ? null : 'missing'
    case 'number':
      return !isNumber(v) ? 'missing' : inBounds(v) ? null : 'range'
    case 'numberRange': {
      if (!Array.isArray(v) || v.length !== 2 || !isNumber(v[0]) || !isNumber(v[1])) return 'missing'
      return v[0] <= v[1] && inBounds(v[0]) && inBounds(v[1]) ? null : 'range'
    }
    case 'days':
      return !isNumber(v) ? 'missing' : Number.isInteger(v) && v > 0 ? null : 'range'
    case 'period':
      return PERIODS.includes(v as FilterPeriod) ? null : v ? 'unknown' : 'missing'
    case 'date':
      return parseDay(v) ? null : v ? 'unknown' : 'missing'
    case 'dateRange': {
      const [a, b] = Array.isArray(v) ? v.map(parseDay) : []
      if (!a || !b) return 'missing'
      return a <= b ? null : 'range'
    }
  }
}

/** Whether a filter applies: its field exists, its operator fits the field and its value is complete. */
export function isFilterValid(filter: Filter, fields: readonly FilterField[]) {
  return problemOf(
    filter,
    fields.find((f) => f.key === filter.field),
  ) === null
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

function matches(raw: unknown, { operator: op, value: v }: Filter, field: FilterField, today: Date): boolean {
  switch (field.type) {
    case 'enum':
    case 'person':
    case 'multi': {
      const have = (Array.isArray(raw) ? raw : raw == null ? [] : [raw]).map(String)
      const want = (Array.isArray(v) ? v : [v]).map(String)
      if (op === 'hasAllOf') return want.every((w) => have.includes(w))
      const any = want.some((w) => have.includes(w))
      return op === 'is' || op === 'isAnyOf' || op === 'hasAnyOf' ? any : !any
    }
    case 'text': {
      const text = String(raw ?? '').toLowerCase()
      const q = String(v).trim().toLowerCase()
      if (op === 'contains') return text.includes(q)
      if (op === 'doesNotContain') return !text.includes(q)
      if (op === 'startsWith') return text.startsWith(q)
      return text.trim() === q
    }
    case 'number': {
      if (raw == null || raw === '') return false
      const n = Number(raw)
      if (Number.isNaN(n)) return false
      if (op === 'between') {
        const [a, b] = v as [number, number]
        return n >= a && n <= b
      }
      const x = v as number
      return op === 'eq' ? n === x : op === 'neq' ? n !== x : op === 'gt' ? n > x : op === 'gte' ? n >= x : op === 'lt' ? n < x : n <= x
    }
    case 'date': {
      const d = dayOf(raw)
      if (!d) return false
      if (op === 'inLast') return d >= addDays(today, -(v as number)) && d <= today
      if (op === 'inThis') {
        const [start, end] = periodOf(v as FilterPeriod, today)
        return d >= start && d < end
      }
      if (op === 'between') {
        const [a, b] = (v as string[]).map(parseDay) as [Date, Date]
        return d >= a && d <= b
      }
      const day = parseDay(v) as Date
      return op === 'before' ? d < day : op === 'after' ? d > day : d.getTime() === day.getTime()
    }
  }
}

export interface ApplyFiltersOptions<T> {
  /** Reads a field from a row. Defaults to `row[field]`. */
  getValue?: (row: T, field: string) => unknown
  /** Today, for "in the last" and "this". Defaults to now. */
  today?: Date
}

/**
 * The rows every filter lets through, for a List, a Table or a DataGrid that filters in the
 * browser. Filters that can't apply (see `isFilterValid`) are left out. Text compares without
 * case; a row value that is an array matches when any of it does (`hasAllOf`: all of it).
 */
export function applyFilters<T>(rows: readonly T[], filters: readonly Filter[], fields: readonly FilterField[], options: ApplyFiltersOptions<T> = {}): T[] {
  const get = options.getValue ?? ((row: T, key: string) => (row as Record<string, unknown>)[key])
  const today = startOfDay(options.today ?? new Date())
  const active = filters.flatMap((filter) => {
    const field = fields.find((f) => f.key === filter.field)
    return field && !problemOf(filter, field) ? [{ filter, field }] : []
  })
  return rows.filter((row) => active.every(({ filter, field }) => matches(get(row, filter.field), filter, field, today)))
}

/* ---------- what a chip says ---------- */

interface ChipWords {
  field: string
  /** As shown: "is", ">". */
  operator: string
  /** In words: "is", "greater than". */
  operatorName: string
  value: string
  /** The whole chip for screen readers: "Value greater than €20,000". */
  text: string
}

function wordsOf(filter: Filter, field: FilterField | undefined, labels: Labels): ChipWords {
  const operator = labels.filterOperator(filter.operator)
  const operatorName = operatorWords(filter.operator, labels)
  const name = field?.label ?? filter.field
  const value = field ? valueWords(filter, field, labels) : ''
  return { field: name, operator, operatorName, value, text: [name, operatorName, value].filter(Boolean).join(' ') }
}

function valueWords(filter: Filter, field: FilterField, labels: Labels): string {
  const v = filter.value
  const locale = labels.dateLocale
  const optionLabel = (x: string) => (field.type === 'person' && field.me === x ? labels.filterMe : (field.options?.find((o) => o.value === x)?.label ?? x))
  const number = (n: unknown) => (typeof n === 'number' ? new Intl.NumberFormat(locale, field.format).format(n) : '')
  switch (shapeOf(field.type, filter.operator)) {
    case 'option':
      return typeof v === 'string' && v ? optionLabel(v) : ''
    case 'options': {
      const names = Array.isArray(v) ? v.map((x) => optionLabel(String(x))) : []
      if (names.length > 2) return labels.filterValueCount(names.length)
      if (!names.length) return ''
      const op = filter.operator
      const type = op === 'hasAllOf' ? 'conjunction' : op === 'isAnyOf' || op === 'hasAnyOf' ? 'disjunction' : 'unit'
      return new Intl.ListFormat(locale, { type, style: type === 'unit' ? 'short' : 'long' }).format(names)
    }
    case 'text':
      return typeof v === 'string' && v ? labels.filterQuoted(v) : ''
    case 'number':
      return number(v)
    case 'numberRange':
      return Array.isArray(v) && v.length === 2 ? labels.filterBetween(number(v[0]), number(v[1])) : ''
    case 'days':
      return typeof v === 'number' ? labels.filterDays(v) : ''
    case 'period':
      return PERIODS.includes(v as FilterPeriod) ? labels.filterPeriod(v as FilterPeriod) : String(v ?? '')
    case 'date': {
      const d = parseDay(v)
      return d ? formatDate(d, locale) : ''
    }
    case 'dateRange': {
      const [from, to] = Array.isArray(v) ? v.map(parseDay) : []
      return from ? formatRange({ from, to: to ?? null }, locale) : ''
    }
  }
}

/** An operator in words: `filterOperatorName`, or `filterOperator` where it has none. */
const operatorWords = (operator: FilterOperator, labels: Labels) => labels.filterOperatorName(operator) ?? labels.filterOperator(operator)

const problemText = (problem: Problem, labels: Labels) =>
  problem === 'missing' ? labels.filterValueMissing : problem === 'range' ? labels.filterValueRange : labels.filterValueUnknown

/** Same filters, same order: the bar is showing this view. */
const sameFilters = (a: readonly Filter[], b: readonly Filter[]) =>
  JSON.stringify(a.map((f) => [f.field, f.operator, f.value])) === JSON.stringify(b.map((f) => [f.field, f.operator, f.value]))

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/* ---------- glyphs (16px, 1.25 strokes as in Figma) ---------- */

const PlusGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 3.33333V12.6667M3.33333 8H12.6667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const CloseGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M4.50551 11.4951L8.0006 8M8.0006 8L11.4957 4.50491M8.0006 8L4.50551 4.50491M8.0006 8L11.4957 11.4951"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
const ChevronGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const SearchGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M10.6667 10.6667L13.3333 13.3333M2.66667 7.33333C2.66667 9.91066 4.756 12 7.33333 12C8.62421 12 9.79267 11.4759 10.6375 10.6289C11.4794 9.78487 12 8.62012 12 7.33333C12 4.756 9.91066 2.66667 7.33333 2.66667C4.756 2.66667 2.66667 4.756 2.66667 7.33333Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ---------- the bar ---------- */

/** A chip in the row: a filter in `value`, or the one being added (`index` null). */
interface ChipItem {
  key: string
  filter: Filter
  index: number | null
}

interface BarContextValue {
  labels: Labels
  fields: readonly FilterField[]
  fieldOf: (key: string) => FilterField | undefined
  value: Filter[]
  setValue: (next: Filter[]) => void
  /** Every chip, the one being added last. */
  items: ChipItem[]
  openKey: string | null
  openChip: (key: string) => void
  /** Closes the editor; a new chip without a value goes. */
  closeChip: (key: string) => void
  addField: (key: string) => void
  /** The chip being added gets its first complete value: it joins `value`. */
  commitNew: (filter: Filter) => void
  replace: (index: number, filter: Filter) => void
  remove: (index: number, focusAfter: boolean) => void
  /** Where focus goes when a chip's editor closes on its own. */
  returnFocus: (key: string) => void
  focusChipAt: (index: number) => void
  expanded: boolean
  expand: () => void
  maxVisible: number
  query: string
  setQuery: (query: string) => void
  resultCount?: number
  resultLabel: (count: number, number: React.ReactNode) => React.ReactNode
  views?: FilterView[]
  onSaveView?: (name: string, value: Filter[]) => void
  shortcut?: string
  registerAdd: (open: () => void) => () => void
  container?: HTMLElement | null
  today?: Date
  /** Set once the bar has rendered: chips added after it fade in. */
  mounted: React.RefObject<boolean>
  rootRef: React.RefObject<HTMLDivElement | null>
}

const BarContext = React.createContext<BarContextValue | null>(null)

function useBar(part: string) {
  const bar = React.useContext(BarContext)
  if (!bar) throw new Error(`${part} must be inside FilterBarRoot`)
  return bar
}

/** Keys that survive edits and JSON round trips: the field and which of its filters this is. */
function keyed(value: readonly Filter[], adding: Filter | null): ChipItem[] {
  const seen: Record<string, number> = {}
  const keyOf = (f: Filter) => {
    const n = (seen[f.field] = (seen[f.field] ?? -1) + 1)
    return `${f.field}#${n}`
  }
  const items: ChipItem[] = value.map((filter, index) => ({ key: keyOf(filter), filter, index }))
  if (adding) items.push({ key: keyOf(adding), filter: adding, index: null })
  return items
}

const triggerSelector = '[data-slot="filter-chip"]:not([data-leaving]) [data-slot="filter-chip-trigger"]'

export interface FilterBarRootProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  /** What can be filtered. */
  fields: FilterField[]
  /** The filters (controlled). Plain JSON. */
  value?: Filter[]
  /** The filters to start with (uncontrolled). */
  defaultValue?: Filter[]
  /** Every change: a chip added, edited into a complete value, or removed. */
  onValueChange?: (value: Filter[]) => void
  /** How many rows the filters let through, shown live ("14 results"). Leave it out to hide the count. */
  resultCount?: number
  /** The count's words, "14 deals": `number` is the rolling number, `count` picks the plural. Defaults to the `filterResults` label. */
  resultLabel?: (count: number, number: React.ReactNode) => React.ReactNode
  /** Saved filters, in a menu that sets them. The one that matches the filters is checked and names the menu. */
  views?: FilterView[]
  /** Shows Save view while the filters match no view; called with the name typed and the filters. */
  onSaveView?: (name: string, value: Filter[]) => void
  /** The search's text (controlled). */
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
  /** Chips shown before the rest fold into "+3 more". */
  maxVisible?: number
  /** One key that opens `+ Filter` while focus is in the bar's parent and not in a field; shown as Kbd. `false` for none. */
  shortcut?: string | false
  /** Portal target of the editors and menus. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** Today, for the editors' calendars. Defaults to now. */
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
  views,
  onSaveView,
  query: queryProp,
  defaultQuery = '',
  onQueryChange,
  maxVisible = 6,
  shortcut = 'F',
  container,
  today,
  className,
  children,
  ref,
  ...props
}: FilterBarRootProps) {
  const labels = useLabels()
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const mounted = React.useRef(false)
  React.useEffect(() => {
    mounted.current = true
  }, [])

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

  const [innerQuery, setInnerQuery] = React.useState(defaultQuery)
  const query = queryProp ?? innerQuery
  const setQuery = (next: string) => {
    if (queryProp === undefined) setInnerQuery(next)
    onQueryChange?.(next)
  }

  const fieldOf = React.useCallback((key: string) => fields.find((f) => f.key === key), [fields])

  // The chip being added, until its value is complete.
  const [adding, setAdding] = React.useState<Filter | null>(null)
  const addingRef = React.useRef(adding)
  const setAddingNow = (next: Filter | null) => {
    addingRef.current = next
    setAdding(next)
  }
  const items = React.useMemo(() => keyed(value, adding), [value, adding])
  const [openKey, setOpenKey] = React.useState<string | null>(null)
  const [expanded, setExpanded] = React.useState(false)

  // One polite region for what the bar says: the count, and which chip went.
  const [message, setMessage] = React.useState<React.ReactNode>(null)
  const countWords = resultLabel ?? labels.filterResults
  const speak = React.useRef({ countWords, locale: labels.dateLocale })
  speak.current = { countWords, locale: labels.dateLocale }
  const firstCount = React.useRef(true)
  React.useEffect(() => {
    if (firstCount.current) {
      firstCount.current = false
      return
    }
    if (resultCount == null) return
    // Once the count settles, so typing in a text filter isn't read out key by key.
    const t = setTimeout(() => {
      const { countWords, locale } = speak.current
      setMessage(countWords(resultCount, new Intl.NumberFormat(locale).format(resultCount)))
    }, 500)
    return () => clearTimeout(t)
  }, [resultCount])

  // Focus to move once the chips have re-rendered: the chip now at an index, or + Filter.
  const focusPlan = React.useRef<number | 'add' | null>(null)
  const focusNow = React.useCallback((plan: number | 'add') => {
    const root = rootRef.current
    if (!root) return
    const triggers = [...root.querySelectorAll<HTMLElement>(triggerSelector)]
    const add = root.querySelector<HTMLElement>('[data-slot="filter-bar-add"]')
    const target = plan === 'add' ? add : (triggers[plan] ?? triggers[plan - 1] ?? add)
    ;(target ?? root.querySelector<HTMLElement>('[data-slot="input"]'))?.focus()
  }, [])
  React.useLayoutEffect(() => {
    if (focusPlan.current == null) return
    const plan = focusPlan.current
    focusPlan.current = null
    focusNow(plan)
  })

  const addOpener = React.useRef<(() => void) | null>(null)
  const registerAdd = React.useCallback((open: () => void) => {
    addOpener.current = open
    return () => {
      if (addOpener.current === open) addOpener.current = null
    }
  }, [])

  // The shortcut, anywhere in the parent (the bar and the list it filters), except while typing.
  React.useEffect(() => {
    const parent = rootRef.current?.parentElement
    if (!parent || !shortcut) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return
      if (e.key.toLowerCase() !== shortcut.toLowerCase() || !addOpener.current) return
      e.preventDefault()
      addOpener.current()
    }
    parent.addEventListener('keydown', onKeyDown)
    return () => parent.removeEventListener('keydown', onKeyDown)
  }, [shortcut])

  const bar: BarContextValue = {
    labels,
    fields,
    fieldOf,
    value,
    setValue,
    items,
    openKey,
    openChip: (key) => setOpenKey(key),
    closeChip: (key) => {
      setOpenKey((k) => (k === key ? null : k))
      if (addingRef.current) setAddingNow(null)
    },
    addField: (key) => {
      const field = fieldOf(key)
      if (!field) return
      const operator = operatorsOf(field)[0]
      const filter: Filter = { field: key, operator, value: initialValue(shapeOf(field.type, operator), field) }
      setAddingNow(filter)
      setExpanded(true)
      setOpenKey(keyed(valueRef.current, filter).at(-1)!.key)
    },
    commitNew: (filter) => {
      if (!addingRef.current) return
      setAddingNow(null)
      setValue([...valueRef.current, filter])
    },
    replace: (index, filter) => setValue(valueRef.current.map((f, i) => (i === index ? filter : f))),
    remove: (index, focusAfter) => {
      const gone = valueRef.current[index]
      if (!gone) return
      setValue(valueRef.current.filter((_, i) => i !== index))
      setMessage(labels.filterRemoved(wordsOf(gone, fieldOf(gone.field), labels).text))
      if (focusAfter) focusPlan.current = index
    },
    returnFocus: (key) => {
      const chip = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-slot="filter-chip"]:not([data-leaving])') ?? [])].find((c) => c.dataset.filterKey === key)
      const trigger = chip?.querySelector<HTMLElement>('[data-slot="filter-chip-trigger"]')
      if (trigger) trigger.focus()
      else focusNow('add')
    },
    focusChipAt: (index) => {
      focusPlan.current = index
    },
    expanded,
    expand: () => setExpanded(true),
    maxVisible,
    query,
    setQuery,
    resultCount,
    resultLabel: countWords,
    views,
    onSaveView,
    shortcut: shortcut || undefined,
    registerAdd,
    container,
    today,
    mounted,
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
        <span role="status" className="sr-only">
          {message}
        </span>
      </div>
    </BarContext.Provider>
  )
}

/* ---------- the search ---------- */

export interface FilterBarSearchProps extends Omit<InputProps, 'value' | 'defaultValue' | 'size' | 'label' | 'hint' | 'error'> {}

/**
 * The bar's search field (Input sm with a search icon): its text is the bar's `query`. Backspace
 * in it while empty removes the last chip. Other props, `ref` included, go to the `input`.
 */
export function FilterBarSearch({ placeholder, onChange, onKeyDown, wrapperClassName, ...props }: FilterBarSearchProps) {
  const bar = useBar('FilterBarSearch')
  const { labels } = bar
  return (
    <Input
      size="sm"
      aria-label={labels.searchField}
      placeholder={placeholder ?? labels.search}
      leadingIcon={<SearchGlyph />}
      autoComplete="off"
      wrapperClassName={cn('w-[200px] shrink-0', wrapperClassName)}
      value={bar.query}
      onChange={(e) => {
        onChange?.(e)
        bar.setQuery(e.target.value)
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.defaultPrevented || e.key !== 'Backspace' || e.currentTarget.value !== '' || bar.value.length === 0) return
        e.preventDefault()
        bar.remove(bar.value.length - 1, false)
      }}
      {...props}
    />
  )
}

/* ---------- the chips ---------- */

/** A chip's words: the field, the operator (in words for screen readers) and the value. */
function ChipFace({ words, problem }: { words: ChipWords; problem: boolean }) {
  return (
    <>
      <span className="shrink-0 font-medium text-text-default">{words.field}</span>
      <span className="shrink-0 text-text-muted">{words.operator}</span>
      {words.value && (
        <span data-slot="filter-chip-value" className={cn('min-w-0 max-w-60 truncate font-medium', problem ? 'text-text-destructive' : 'text-text-default')}>
          {words.value}
        </span>
      )}
    </>
  )
}

const chipClass = cn(chipVariants({ variant: 'outline', size: 'md', neutral: true }), 'satin-filter-chip max-w-full')

/** A chip and its editor. */
function FilterChip({ item }: { item: ChipItem }) {
  const bar = useBar('FilterChip')
  const { labels } = bar
  const field = bar.fieldOf(item.filter.field)
  const open = bar.openKey === item.key
  const isNew = item.index === null
  const [entering] = React.useState(() => bar.mounted.current)

  // What the editor shows: the filter as it is being edited, complete or not. Complete changes go
  // to the bar at once; an incomplete one stays here until it is completed or the editor closes.
  const [draft, setDraftState] = React.useState(item.filter)
  const draftRef = React.useRef(draft)
  const setDraft = (next: Filter) => {
    draftRef.current = next
    setDraftState(next)
  }
  const shown = open ? draft : item.filter
  // A new chip is empty on purpose: no error edge until it has had a value.
  const found = problemOf(shown, field)
  const problem = isNew && found === 'missing' ? null : found
  const words = wordsOf(shown, field, labels)
  const describedBy = React.useId()

  const change = (next: Filter) => {
    setDraft(next)
    if (problemOf(next, field)) return
    if (item.index === null) bar.commitNew(next)
    else bar.replace(item.index, next)
  }
  // Enter in a field or a single pick: done. A new chip keeps the value it shows (30 days, 0).
  const finish = () => {
    if (item.index === null && !problemOf(draftRef.current, field)) bar.commitNew(draftRef.current)
    bar.closeChip(item.key)
  }

  const outside = React.useRef(false)

  return (
    <span
      data-slot="filter-chip"
      data-filter-key={item.key}
      data-state={open ? 'open' : 'closed'}
      data-invalid={problem ? '' : undefined}
      data-enter={entering || undefined}
      className={chipClass}
    >
      <Popover
        title={words.field}
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setDraft(item.filter)
            bar.openChip(item.key)
          } else bar.closeChip(item.key)
        }}
        side="bottom"
        align="start"
        container={bar.container}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          // A new pick list opens by itself and takes focus; otherwise the value control gets it.
          const content = e.currentTarget as HTMLElement | null
          const target = content?.querySelector<HTMLElement>('[data-filter-value]')
          if (isNew && target?.matches('button')) return
          const focusable = target?.matches('button, input') ? target : target?.querySelector<HTMLElement>('button[tabindex="0"], input, button')
          ;(focusable ?? content)?.focus()
          // Typing replaces what a number field starts with.
          if (focusable instanceof HTMLInputElement) focusable.select()
        }}
        onInteractOutside={() => {
          outside.current = true
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          // After a press elsewhere, focus stays where it went.
          if (!outside.current) bar.returnFocus(item.key)
          outside.current = false
        }}
        body={
          field ? (
            <FilterEditor field={field} filter={draft} onChange={change} onDone={finish} isNew={isNew} labels={labels} container={bar.container} today={bar.today} />
          ) : (
            <p className="text-sm text-text-destructive">{labels.filterValueUnknown}</p>
          )
        }
      >
        <button
          type="button"
          data-slot="filter-chip-trigger"
          aria-label={words.text}
          aria-describedby={problem ? describedBy : undefined}
          onKeyDown={(e) => {
            if ((e.key === 'Backspace' || e.key === 'Delete') && item.index !== null) {
              e.preventDefault()
              bar.remove(item.index, true)
            }
          }}
          className="flex h-full min-w-0 cursor-pointer items-center gap-1 rounded-pill ps-2 pe-1 outline-none"
        >
          <ChipFace words={words} problem={!!problem} />
        </button>
      </Popover>
      {problem && (
        <span id={describedBy} className="sr-only">
          {problemText(problem, labels)}
        </span>
      )}
      {item.index !== null && (
        <button
          type="button"
          data-slot="filter-chip-remove"
          aria-label={labels.removeItem(words.text)}
          onClick={() => bar.remove(item.index as number, true)}
          className={cn(
            'me-1 grid size-5 shrink-0 cursor-pointer place-items-center rounded-pill text-text-muted outline-none',
            'transition-colors duration-(--duration-fast) ease-(--ease-out)',
            'hover:bg-bg-pressed hover:text-text-default focus-visible:bg-bg-pressed focus-visible:text-text-default',
          )}
        >
          <CloseGlyph />
        </button>
      )}
    </span>
  )
}

/** A removed chip on its way out: the same face, faded, out of reach. */
function LeavingChip({ words, problem, removable, onDone }: { words: ChipWords; problem: boolean; removable: boolean; onDone: () => void }) {
  const done = React.useRef(onDone)
  done.current = onDone
  // animationend can't be relied on (a hidden tab, no CSS): the fade is 150 ms, so it goes by 400.
  React.useEffect(() => {
    const t = setTimeout(() => done.current(), 400)
    return () => clearTimeout(t)
  }, [])
  return (
    <span data-slot="filter-chip" data-leaving="" aria-hidden inert className={chipClass} onAnimationEnd={() => done.current()}>
      <span className="flex h-full min-w-0 items-center gap-1 ps-2 pe-1">
        <ChipFace words={words} problem={problem} />
      </span>
      {removable && (
        <span className="me-1 grid size-5 shrink-0 place-items-center text-text-muted">
          <CloseGlyph />
        </span>
      )}
    </span>
  )
}

export interface FilterBarChipsProps extends React.ComponentProps<'div'> {}

/**
 * The chips, then "+3 more" past `maxVisible`. Its `div` is `display: contents`, so the chips wrap
 * along with whatever sits next to them in the bar. Other props, `ref` included, go to that `div`.
 */
export function FilterBarChips({ className, ...props }: FilterBarChipsProps) {
  const bar = useBar('FilterBarChips')
  const { items, labels, maxVisible } = bar
  const hidden = bar.expanded ? 0 : Math.max(0, items.length - maxVisible)
  const visible = hidden ? items.slice(0, maxVisible) : items

  // Chips that leave fade out where they were. Only when chips just went: a view that swaps the
  // set replaces it at once.
  const [leaving, setLeaving] = React.useState<{ key: string; at: number; words: ChipWords; problem: boolean; removable: boolean }[]>([])
  const prev = React.useRef(visible)
  const round = React.useRef(0)
  React.useLayoutEffect(() => {
    const before = prev.current
    prev.current = visible
    const now = new Set(visible.map((i) => i.key))
    const was = new Set(before.map((i) => i.key))
    const gone = before.flatMap((item, at) => (now.has(item.key) ? [] : [{ item, at }]))
    if (!gone.length || visible.some((i) => !was.has(i.key))) return
    setLeaving((l) => [
      ...l,
      ...gone.map(({ item, at }) => {
        const field = bar.fieldOf(item.filter.field)
        return {
          key: `${item.key}~${++round.current}`,
          at,
          words: wordsOf(item.filter, field, labels),
          problem: !!problemOf(item.filter, field),
          removable: item.index !== null,
        }
      }),
    ])
  })

  const rows: React.ReactNode[] = visible.map((item) => <FilterChip key={item.key} item={item} />)
  for (const l of [...leaving].sort((a, b) => a.at - b.at)) {
    rows.splice(
      Math.min(l.at, rows.length),
      0,
      <LeavingChip key={l.key} words={l.words} problem={l.problem} removable={l.removable} onDone={() => setLeaving((all) => all.filter((x) => x.key !== l.key))} />,
    )
  }

  return (
    <div data-slot="filter-bar-chips" className={cn('contents', className)} {...props}>
      {rows}
      {hidden > 0 && (
        <Chip
          variant="outline"
          data-slot="filter-bar-more"
          onClick={() => {
            bar.focusChipAt(maxVisible)
            bar.expand()
          }}
        >
          {labels.filterMore(hidden)}
        </Chip>
      )}
    </div>
  )
}

/* ---------- the editor ---------- */

interface FilterEditorProps {
  field: FilterField
  filter: Filter
  onChange: (next: Filter) => void
  /** A single pick, or Enter in a field: the edit is done. */
  onDone: () => void
  isNew: boolean
  labels: Labels
  container?: HTMLElement | null
  today?: Date
}

/** The operator over the value, its control picked by the field's type and the operator. */
function FilterEditor({ field, filter, onChange, onDone, isNew, labels, container, today }: FilterEditorProps) {
  const operators = operatorsOf(field)
  const op = operators.includes(filter.operator) ? filter.operator : operators[0]
  const shape = shapeOf(field.type, op)
  const v = filter.value
  const problem = problemOf({ ...filter, operator: op }, field)
  // "Add a value" only once there was one: a new chip starts empty on purpose.
  const message = problem && (problem !== 'missing' || !isNew) ? problemText(problem, labels) : undefined
  const messageId = React.useId()
  const valueName = labels.filterValueOf(field.label, operatorWords(op, labels))
  const locale = labels.dateLocale

  const set = (value: FilterValue) => onChange({ field: field.key, operator: op, value })
  const setOperator = (next: FilterOperator) =>
    onChange({ field: field.key, operator: next, value: convertValue(v, shape, shapeOf(field.type, next), field) })

  // People: the person using the app first, as "Me".
  const options = React.useMemo(() => {
    const all = field.options ?? []
    const me = field.type === 'person' && field.me ? all.find((o) => o.value === field.me) : undefined
    return me ? [{ ...me, label: labels.filterMeOption, description: me.label }, ...all.filter((o) => o !== me)] : all
  }, [field, labels.filterMeOption])

  // The field shows the number plainly (no grouping), so it reads back the way it was typed.
  const plain = React.useMemo(() => new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 10 }), [locale])
  const numberProps = { size: 'sm' as const, min: field.min, max: field.max, step: field.step, formatValue: (n: number) => plain.format(n) }
  const pair = (Array.isArray(v) ? v : []) as unknown[]

  let control: React.ReactNode
  let ownMessage = false
  switch (shape) {
    case 'option':
      control =
        field.type === 'person' ? (
          <Combobox
            size="sm"
            options={options}
            value={typeof v === 'string' && v ? [v] : []}
            onValueChange={(next) => {
              set(next[0] ?? '')
              if (next[0]) onDone()
            }}
            aria-label={valueName}
            error={message}
            defaultOpen={isNew}
            container={container}
            data-filter-value=""
          />
        ) : (
          <Select
            size="sm"
            options={options}
            value={typeof v === 'string' ? v : ''}
            onValueChange={(x) => {
              set(x)
              onDone()
            }}
            aria-label={valueName}
            error={message}
            defaultOpen={isNew}
            container={container}
            data-filter-value=""
          />
        )
      break
    case 'options':
      control = (
        <Combobox
          multiple
          size="sm"
          options={options}
          value={Array.isArray(v) ? v.map(String) : []}
          onValueChange={set}
          aria-label={valueName}
          error={message}
          defaultOpen={isNew}
          container={container}
          data-filter-value=""
        />
      )
      break
    case 'text':
      control = (
        <Input size="sm" value={typeof v === 'string' ? v : ''} onChange={(e) => set(e.target.value)} aria-label={valueName} placeholder={field.placeholder} error={message} autoComplete="off" data-filter-value="" />
      )
      break
    case 'number':
      control = <NumberInput {...numberProps} value={typeof v === 'number' ? v : undefined} onValueChange={set} aria-label={valueName} error={message} data-filter-value="" />
      break
    case 'numberRange':
      ownMessage = true
      control = (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            {...numberProps}
            label={labels.from}
            value={typeof pair[0] === 'number' ? pair[0] : undefined}
            onValueChange={(n) => set([n, typeof pair[1] === 'number' ? pair[1] : n])}
            aria-describedby={message ? messageId : undefined}
            error={!!message}
            data-filter-value=""
          />
          <NumberInput
            {...numberProps}
            label={labels.to}
            value={typeof pair[1] === 'number' ? pair[1] : undefined}
            onValueChange={(n) => set([typeof pair[0] === 'number' ? pair[0] : n, n])}
            aria-describedby={message ? messageId : undefined}
            error={!!message}
          />
        </div>
      )
      break
    case 'days':
      control = (
        <NumberInput size="sm" min={1} step={1} value={typeof v === 'number' ? v : undefined} onValueChange={set} formatValue={labels.filterDays} aria-label={valueName} error={message} data-filter-value="" />
      )
      break
    case 'period':
      control = (
        <Select
          size="sm"
          options={PERIODS.map((p) => ({ value: p, label: labels.filterPeriod(p) }))}
          value={typeof v === 'string' ? v : ''}
          onValueChange={(p) => {
            set(p)
            onDone()
          }}
          aria-label={valueName}
          error={message}
          defaultOpen={isNew}
          container={container}
          data-filter-value=""
        />
      )
      break
    case 'date':
      ownMessage = true
      control = (
        <div role="group" aria-label={valueName} aria-describedby={message ? messageId : undefined} className="flex justify-center" data-filter-value="">
          <Calendar
            value={parseDay(v)}
            onValueChange={(d) => {
              set(toFilterDate(d))
              onDone()
            }}
            today={today}
          />
        </div>
      )
      break
    case 'dateRange': {
      ownMessage = true
      const [from, to] = pair.map(parseDay)
      control = (
        <div role="group" aria-label={valueName} aria-describedby={message ? messageId : undefined} className="flex justify-center" data-filter-value="">
          <Calendar
            mode="range"
            range={{ from: from ?? null, to: to ?? null }}
            onRangeChange={(r) => {
              set([r.from ? toFilterDate(r.from) : '', r.to ? toFilterDate(r.to) : ''])
              if (r.from && r.to) onDone()
            }}
            today={today}
          />
        </div>
      )
      break
    }
  }

  return (
    <div
      data-slot="filter-editor"
      className="flex flex-col gap-2"
      onKeyDown={(e) => {
        // Enter in a text or number field: done. (The field has used it first: a number commits.)
        const target = e.target as HTMLElement
        if (e.key === 'Enter' && target.tagName === 'INPUT' && target.getAttribute('role') !== 'combobox') {
          e.preventDefault()
          onDone()
        }
      }}
    >
      {operators.length > 1 && (
        <Select
          size="sm"
          aria-label={field.label}
          value={op}
          onValueChange={(o) => setOperator(o as FilterOperator)}
          options={operators.map((o) => {
            const name = operatorWords(o, labels)
            const text = labels.filterOperator(o)
            return { value: o, label: text, description: name !== text ? name : undefined }
          })}
          container={container}
        />
      )}
      {control}
      {ownMessage && message && (
        <p id={messageId} className="text-sm text-text-destructive">
          {message}
        </p>
      )}
    </div>
  )
}

/* ---------- + Filter ---------- */

export interface FilterBarAddProps extends Omit<React.ComponentProps<typeof Button>, 'variant' | 'asChild' | 'iconOnly'> {}

/**
 * `+ Filter`: a menu of the fields; picking one adds its chip with the editor open. Shows the
 * bar's `shortcut` as Kbd. Other props, `ref` included, go to the Button.
 */
export function FilterBarAdd({ className, children, ...props }: FilterBarAddProps) {
  const bar = useBar('FilterBarAdd')
  const { labels, shortcut, registerAdd } = bar
  const [open, setOpen] = React.useState(false)
  const picked = React.useRef(false)
  React.useEffect(() => registerAdd(() => setOpen(true)), [registerAdd])
  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      container={bar.container}
      // Picking a field hands focus to its editor, not back to this button.
      onCloseAutoFocus={(e: Event) => {
        if (picked.current) e.preventDefault()
        picked.current = false
      }}
      trigger={
        <Button
          variant="tertiary"
          data-slot="filter-bar-add"
          aria-keyshortcuts={shortcut ? shortcut.toUpperCase() : undefined}
          className={cn('shrink-0', className)}
          {...props}
        >
          <PlusGlyph />
          {children ?? labels.filterAdd}
          {shortcut && <KbdGroup keys={shortcut.toUpperCase()} aria-hidden className="ms-0.5" />}
        </Button>
      }
    >
      {bar.fields.map((f) => (
        <DropdownMenuItem
          key={f.key}
          label={f.label}
          icon={f.icon}
          layout="inline"
          onSelect={() => {
            picked.current = true
            bar.addField(f.key)
          }}
        />
      ))}
    </DropdownMenu>
  )
}

/* ---------- the count ---------- */

export interface FilterBarCountProps extends React.ComponentProps<'span'> {}

/** "14 results", its digits rolling as the count changes. Nothing without `resultCount`. Other props, `ref` included, go to its `span`. */
export function FilterBarCount({ className, ...props }: FilterBarCountProps) {
  const bar = useBar('FilterBarCount')
  if (bar.resultCount == null) return null
  const count = bar.resultCount
  const formatted = new Intl.NumberFormat(bar.labels.dateLocale).format(count)
  return (
    <span data-slot="filter-bar-count" className={cn('shrink-0 text-sm leading-5 whitespace-nowrap text-text-muted', className)} {...props}>
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

/* ---------- views ---------- */

function SaveView({ focusAfter }: { focusAfter: () => void }) {
  const bar = useBar('FilterBarViews')
  const { labels } = bar
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const saved = React.useRef(false)
  return (
    <Popover
      title={labels.filterSaveView}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setName('')
      }}
      align="end"
      container={bar.container}
      onCloseAutoFocus={(e: Event) => {
        // Saved: this button goes (the filters are a view now), so focus goes to the views menu.
        if (!saved.current) return
        saved.current = false
        e.preventDefault()
        focusAfter()
      }}
      body={
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const trimmed = name.trim()
            if (!trimmed) return
            saved.current = true
            bar.onSaveView?.(trimmed, bar.value)
            setOpen(false)
          }}
        >
          <Input size="sm" label={labels.filterViewName} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          <div className="flex justify-end">
            <Button type="submit" disabled={!name.trim()}>
              {labels.filterSave}
            </Button>
          </div>
        </form>
      }
    >
      <Button variant="tertiary" data-slot="filter-bar-save" className="shrink-0">
        {labels.filterSaveView}
      </Button>
    </Popover>
  )
}

export interface FilterBarViewsProps extends React.ComponentProps<'div'> {}

/**
 * The views menu (named after the view the filters match, or "Views") and Save view, shown while
 * the filters match no view. Other props, `ref` included, go to its `div`.
 */
export function FilterBarViews({ className, ...props }: FilterBarViewsProps) {
  const bar = useBar('FilterBarViews')
  const { labels, views, value } = bar
  const current = views?.find((view) => sameFilters(view.value, value))
  const canSave = !!bar.onSaveView && value.length > 0 && !current
  if (!views?.length && !canSave) return null
  return (
    <div data-slot="filter-bar-views" className={cn('flex shrink-0 items-center gap-1', className)} {...props}>
      {!!views?.length && (
        <DropdownMenu
          align="end"
          container={bar.container}
          trigger={
            <Button variant="tertiary" data-slot="filter-bar-views-trigger" className="shrink-0">
              {current?.label ?? labels.filterViews}
              <ChevronGlyph />
            </Button>
          }
        >
          {views.map((view) => (
            <DropdownMenuItem
              key={view.id}
              label={view.label}
              layout="inline"
              selected={view === current}
              onSelect={() => bar.setValue(view.value.map((f) => ({ ...f })))}
            />
          ))}
        </DropdownMenu>
      )}
      {canSave && (
        <SaveView
          focusAfter={() =>
            (bar.rootRef.current?.querySelector<HTMLElement>('[data-slot="filter-bar-views-trigger"]') ?? bar.rootRef.current?.querySelector<HTMLElement>('[data-slot="filter-bar-add"]'))?.focus()
          }
        />
      )}
    </div>
  )
}

/* ---------- the common case ---------- */

export interface FilterBarProps extends Omit<FilterBarRootProps, 'children'> {
  /** A search field before the chips; its text is `query`. */
  search?: boolean
  /** The search's placeholder. Defaults to the `search` label. */
  searchPlaceholder?: string
}

/**
 * The bar from props: the search (with `search`), the chips, `+ Filter`, then the count and the
 * views at the end of the row. Other props, `ref` included, go to the bar's `div`.
 */
export function FilterBar({ search = false, searchPlaceholder, ...props }: FilterBarProps) {
  return (
    <FilterBarRoot {...props}>
      {search && <FilterBarSearch placeholder={searchPlaceholder} />}
      <FilterBarChips />
      <FilterBarAdd />
      <div data-slot="filter-bar-end" className="ms-auto flex shrink-0 items-center gap-1 ps-2">
        <FilterBarCount />
        <FilterBarViews />
      </div>
    </FilterBarRoot>
  )
}
