import * as React from 'react'
import { Filter as FilterIcon } from 'iconoir-react'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { DateRangePicker, formatRange, type DateRange } from '@uisatin/ui/date-picker'
import { SegmentedControl, SegmentedControlSegment } from '@uisatin/ui/segmented-control'
import { Sheet, SheetClose } from '@uisatin/ui/sheet'
import { Slider } from '@uisatin/ui/slider'
import { applyFilters, isFilterValid, toFilterDate, type Filter, type FilterField } from '@uisatin/pro/filter-bar'
import { DealsTable, ME, NAMES, SCENARIO, date, dealsLabel, euro, fieldOf, fields, type Deal } from './data'

/*
 * Direction C, Panel: the bar only says what is active ("Mine · over €20k · this quarter");
 * every filter is set in one side sheet, as a form. Exploration, not package API.
 */

/* ---------- Filter[] ↔ form: the form edits one filter per field ---------- */

/** The field's filter, if there is one. */
export const readFilter = (filters: readonly Filter[], key: string) => filters.find((f) => f.field === key)

/** The filters with the field's filter swapped for `next` (in its place, so the summary keeps its order), or dropped when `next` is null. */
export function writeFilter(filters: readonly Filter[], key: string, next: Filter | null): Filter[] {
  const at = filters.findIndex((f) => f.field === key)
  const rest = filters.filter((f) => f.field !== key)
  if (!next) return rest
  return at === -1 ? [...rest, next] : [...rest.slice(0, at), next, ...rest.slice(at)]
}

/** The options a filter picks: `is` reads as a list of one; operators the form can't show read as none. */
function pickedOf(filter: Filter | undefined): string[] {
  if (!filter || !['is', 'isAnyOf', 'hasAnyOf'].includes(filter.operator)) return []
  return Array.isArray(filter.value) ? filter.value.map(String) : [String(filter.value)]
}

/** The span the Value slider covers. A range that fills it is no filter. */
export const VALUE_SPAN: [number, number] = [0, 100_000]

/** A number filter as the slider's range: the scenario's `gt 20000` is 20,000 up to the top. */
function rangeOf(filter: Filter | undefined): [number, number] {
  const [min, max] = VALUE_SPAN
  const v = filter?.value
  if (filter?.operator === 'between' && Array.isArray(v)) return [Number(v[0]), Number(v[1])]
  if (typeof v !== 'number') return [min, max]
  if (filter?.operator === 'gt' || filter?.operator === 'gte') return [v, max]
  if (filter?.operator === 'lt' || filter?.operator === 'lte') return [min, v]
  return [v, v]
}

type Period = 'month' | 'quarter' | 'year'
const PERIODS: { value: Period | 'any' | 'custom'; label: string; name: string }[] = [
  { value: 'any', label: 'Any', name: 'Any date' },
  { value: 'month', label: 'Month', name: 'This month' },
  { value: 'quarter', label: 'Quarter', name: 'This quarter' },
  { value: 'year', label: 'Year', name: 'This year' },
  { value: 'custom', label: 'Custom', name: 'Custom range' },
]
const isPeriod = (v: unknown): v is Period => v === 'month' || v === 'quarter' || v === 'year'

/** The days a period covers today, to show what "Quarter" means. */
function periodRange(period: Period): DateRange {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const first = period === 'month' ? m : period === 'quarter' ? m - (m % 3) : 0
  const months = period === 'month' ? 1 : period === 'quarter' ? 3 : 12
  return { from: new Date(y, first, 1), to: new Date(y, first + months, 0) }
}

const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/* ---------- the summary line ---------- */

const anyOf = new Intl.ListFormat('en-US', { type: 'disjunction' })
const allOf = new Intl.ListFormat('en-US', { type: 'conjunction' })
const k = (n: number) => (n >= 1000 ? `€${Math.round(n / 100) / 10}k` : euro.format(n))
const optionLabel = (key: string, value: string) => fieldOf(key).options?.find((o) => o.value === value)?.label ?? value

/** One filter in a few words: "over €20k", "this quarter". */
function describe(f: Filter): string {
  const v = f.value
  const values = Array.isArray(v) ? v.map(String) : [String(v)]
  const not = f.operator === 'isNot' || f.operator === 'isNoneOf' || f.operator === 'hasNoneOf'
  switch (f.field) {
    case 'owner': {
      if (values.length === 1 && values[0] === ME) return not ? 'not mine' : 'mine'
      const names = values.length > 2 ? `${values.length} owners` : anyOf.format(values.map((x) => (x === ME ? 'me' : (NAMES[x] ?? x))))
      return not ? `not owned by ${names}` : `owned by ${names}`
    }
    case 'stage':
    case 'tags': {
      const words = values.length > 2 ? `${values.length} ${f.field === 'stage' ? 'stages' : 'tags'}` : (f.operator === 'hasAllOf' ? allOf : anyOf).format(values.map((x) => optionLabel(f.field, x)))
      return not ? `not ${words}` : words
    }
    case 'value': {
      if (f.operator === 'between' && Array.isArray(v)) {
        const [a, b] = v as [number, number]
        return b >= VALUE_SPAN[1] ? `over ${k(a)}` : a <= VALUE_SPAN[0] ? `under ${k(b)}` : `${k(a)}–${k(b)}`
      }
      const n = Number(v)
      return f.operator === 'gt' || f.operator === 'gte' ? `over ${k(n)}` : f.operator === 'lt' || f.operator === 'lte' ? `under ${k(n)}` : k(n)
    }
    case 'close': {
      if (f.operator === 'inThis') return `this ${v}`
      if (f.operator === 'inLast') return `last ${v} days`
      if (f.operator === 'between') return `${date.format(parseDay(values[0]))} – ${date.format(parseDay(values[1]))}`
      return `${f.operator === 'is' ? 'on' : f.operator} ${date.format(parseDay(values[0]))}`
    }
    case 'company':
      return `“${v}”`
    default:
      return ''
  }
}

/** What the filters do, in one line: "Mine · over €20k · this quarter". Empty when nothing applies. */
export function summarize(filters: readonly Filter[]): string {
  const text = filters
    .filter((f) => isFilterValid(f, fields))
    .map(describe)
    .filter(Boolean)
    .join(' · ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/* ---------- the form ---------- */

export interface FilterFormProps {
  value: Filter[]
  onValueChange: (value: Filter[]) => void
  /**
   * The sections, in order, as fields: each section reads its name and options from its field
   * (pass a field with fewer options to offer fewer). Defaults to Owner, Stage, Value, Close date, Tags.
   */
  fields?: FilterField[]
}

interface SectionProps {
  field: FilterField
  filter: Filter | undefined
  onChange: (next: Filter | null) => void
}

const FORM_FIELDS = fields.filter((f) => f.type !== 'text')

/** Every filter as a form section, 16px apart. Each section reads and writes its field's one filter. */
export function FilterForm({ value, onValueChange, fields: shown = FORM_FIELDS }: FilterFormProps) {
  return (
    // 4px in, so the checkboxes' focus rings aren't clipped by the sheet's scrolling body.
    <div className="flex flex-col gap-4 p-1">
      {shown.map((field) => {
        const props: SectionProps = {
          field,
          filter: readFilter(value, field.key),
          onChange: (next) => onValueChange(writeFilter(value, field.key, next)),
        }
        if (field.type === 'number') return <ValueSection key={field.key} {...props} />
        if (field.type === 'date') return <CloseSection key={field.key} {...props} />
        if (field.options) return <OptionsSection key={field.key} {...props} />
        return null
      })}
    </div>
  )
}

/** A named group: the 13px medium heading, and on its right what the section is set to. */
function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex min-h-[18px] items-center justify-between gap-3">
        <h3 id={id} className="text-sm leading-[18px] font-medium text-text-default">
          {title}
        </h3>
        {aside && (
          // The controls already say this to screen readers.
          <span aria-hidden className="text-sm leading-[18px] text-text-muted tabular-nums">
            {aside}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/** Owner, Stage, Tags: a checkbox per option → `isAnyOf` (`hasAnyOf` on tags). "Me" comes first, as in the Filter bar. */
function OptionsSection({ field, filter, onChange }: SectionProps) {
  const picked = pickedOf(filter)
  const options = field.me ? [...(field.options ?? [])].sort((a, b) => Number(b.value === field.me) - Number(a.value === field.me)) : (field.options ?? [])
  const toggle = (value: string, on: boolean) => {
    const next = options.map((o) => o.value).filter((x) => (x === value ? on : picked.includes(x)))
    onChange(next.length ? { field: field.key, operator: field.type === 'multi' ? 'hasAnyOf' : 'isAnyOf', value: next } : null)
  }
  return (
    <Section title={field.label}>
      <div className="flex flex-col gap-2">
        {options.map((o) => {
          const name = o.value === field.me ? 'Me' : o.label
          return (
            <Checkbox
              key={o.value}
              checked={picked.includes(o.value)}
              onCheckedChange={(on) => toggle(o.value, on === true)}
              label={
                o.icon ? (
                  <span className="flex items-center gap-2">
                    {o.icon}
                    {name}
                  </span>
                ) : (
                  name
                )
              }
            />
          )
        })}
      </div>
    </Section>
  )
}

/** Value: a range slider with fields → `between`, and no filter while it spans everything. */
function ValueSection({ field, filter, onChange }: SectionProps) {
  const [min, max] = VALUE_SPAN
  const [from, to] = rangeOf(filter)
  const format = React.useMemo(() => new Intl.NumberFormat('en-US', field.format).format, [field.format])
  const aside = from <= min && to >= max ? 'Any value' : to >= max ? `${format(from)} and up` : from <= min ? `Up to ${format(to)}` : `${format(from)} – ${format(to)}`
  return (
    <Section title={field.label} aside={aside}>
      <Slider
        value={[from, to]}
        min={min}
        max={max}
        step={field.step ?? 1000}
        inputs
        formatValue={format}
        onValueChange={(v) => {
          const [a, b] = v as [number, number]
          onChange(a <= min && b >= max ? null : { field: field.key, operator: 'between', value: [a, b] })
        }}
      />
    </Section>
  )
}

/**
 * Close date: presets → `inThis`, a custom range → `between`. A segmented control always has one
 * segment on, so "Custom" is on while a range is set, or after it is pressed and before one is picked.
 */
function CloseSection({ field, filter, onChange }: SectionProps) {
  const [customPressed, setCustomPressed] = React.useState(false)
  const v = filter?.value
  const days = filter?.operator === 'between' && Array.isArray(v) ? (v as (string | number)[]).map(String) : null
  const preset = filter?.operator === 'inThis' && isPeriod(v) ? v : days || customPressed ? 'custom' : 'any'
  const range: DateRange = days ? { from: parseDay(days[0]), to: parseDay(days[1]) } : { from: null, to: null }

  const pickPreset = (next: string) => {
    setCustomPressed(next === 'custom')
    if (next === 'custom') {
      // Nothing to apply until a range is picked below.
      if (!days) onChange(null)
    } else {
      onChange(isPeriod(next) ? { field: field.key, operator: 'inThis', value: next } : null)
    }
  }
  const pickRange = (r: DateRange) => {
    setCustomPressed(true)
    onChange(r.from ? { field: field.key, operator: 'between', value: [toFilterDate(r.from), toFilterDate(r.to ?? r.from)] } : null)
  }

  return (
    <Section title={field.label} aside={isPeriod(preset) ? formatRange(periodRange(preset)) : undefined}>
      <SegmentedControl fullWidth value={preset} onValueChange={pickPreset}>
        {PERIODS.map((p) => (
          // Short words so five fit the sheet; the full name for screen readers.
          <SegmentedControlSegment key={p.value} value={p.value} aria-label={p.name}>
            {p.label}
          </SegmentedControlSegment>
        ))}
      </SegmentedControl>
      <DateRangePicker placeholder="Custom range" value={range} onValueChange={pickRange} />
    </Section>
  )
}

/* ---------- the sheet ---------- */

export interface FilterSheetProps extends FilterFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  /** The rows that match now, for the live count under the title. */
  count: number
  /** Where focus goes back on close: the button that opened it (there can be two). */
  returnFocus?: React.RefObject<HTMLElement | null>
}

/** The form in a modal right-side sheet. Changes apply live; Done only closes. */
export function FilterSheet({ open, onOpenChange, title = 'Filters', count, returnFocus, value, onValueChange, fields: shown }: FilterSheetProps) {
  // Clear all also resets the form's own state (a pressed "Custom" with no range yet).
  const [round, setRound] = React.useState(0)
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      title={title}
      description={
        <span aria-live="polite">
          {dealsLabel(count)} {count === 1 ? 'matches' : 'match'}
        </span>
      }
      onCloseAutoFocus={(e) => {
        if (!returnFocus?.current) return
        e.preventDefault()
        returnFocus.current.focus()
      }}
      footer={
        <>
          <Button
            variant="tertiary"
            className="me-auto"
            onClick={() => {
              onValueChange([])
              setRound((r) => r + 1)
            }}
          >
            Clear all
          </Button>
          <SheetClose asChild>
            <Button>Done</Button>
          </SheetClose>
        </>
      }
    >
      <FilterForm key={round} value={value} onValueChange={onValueChange} fields={shown} />
    </Sheet>
  )
}

/* ---------- direction C ---------- */

export function PanelDirection({ deals }: { deals: Deal[] }) {
  const [filters, setFilters] = React.useState<Filter[]>(SCENARIO)
  const [open, setOpen] = React.useState(false)
  const filtersButton = React.useRef<HTMLButtonElement>(null)
  const opener = React.useRef<HTMLElement | null>(null)
  const shown = applyFilters(deals, filters, fields)
  const active = filters.filter((f) => isFilterValid(f, fields)).length
  const summary = summarize(filters)
  const openFrom = (e: React.MouseEvent<HTMLButtonElement>) => {
    opener.current = e.currentTarget
    setOpen(true)
  }

  return (
    <div className="flex w-[760px] max-w-full flex-col gap-3">
      <div role="group" aria-label="Filters" className="flex items-center gap-2">
        <Button ref={filtersButton} variant="secondary" aria-haspopup="dialog" aria-expanded={open} onClick={openFrom}>
          <FilterIcon />
          Filters
          {active > 0 && (
            <Badge size="sm" shape="rounded" tone="brand">
              {active}
              <span className="sr-only"> active</span>
            </Badge>
          )}
        </Button>
        {/* The summary reads as text, but it is a way in too: pressing it opens the same sheet. */}
        <Button
          variant="tertiary"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={openFrom}
          className="min-w-0 shrink text-text-muted hover:text-text-default"
        >
          <span className="min-w-0 truncate">{summary || 'No filters'}</span>
        </Button>
        {active > 0 && (
          <Button
            variant="tertiary"
            onClick={() => {
              setFilters([])
              // The button goes away with the filters; focus stays in the bar.
              filtersButton.current?.focus()
            }}
          >
            Clear
          </Button>
        )}
        <span aria-live="polite" className="ms-auto shrink-0 text-sm text-text-muted tabular-nums">
          {dealsLabel(shown.length)}
        </span>
      </div>
      <DealsTable rows={shown} />
      <FilterSheet open={open} onOpenChange={setOpen} count={shown.length} value={filters} onValueChange={setFilters} returnFocus={opener} />
    </div>
  )
}

export const panelCode = `// Exploration, not package API: direction C, Panel. Free parts around Filter[] and applyFilters.
import { Sheet, SheetClose } from '@uisatin/ui/sheet'
import { Checkbox } from '@uisatin/ui/checkbox'
import { Slider } from '@uisatin/ui/slider'
import { SegmentedControl } from '@uisatin/ui/segmented-control'
import { DateRangePicker } from '@uisatin/ui/date-picker'
import { applyFilters, type Filter } from '@uisatin/pro/filter-bar'

export function Pipeline({ deals }: { deals: Deal[] }) {
  const [filters, setFilters] = React.useState<Filter[]>(saved)
  const [open, setOpen] = React.useState(false)
  const shown = applyFilters(deals, filters, fields)

  // The form edits one filter per field: Owner, Stage → isAnyOf (Checkbox),
  // Value → between (Slider; none at the full span), Close date → inThis
  // (SegmentedControl) or between (DateRangePicker), Tags → hasAnyOf (Checkbox).
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Filters <Badge>{filters.length}</Badge></Button>
      <Button variant="tertiary" onClick={() => setOpen(true)}>{summarize(filters)}</Button>
      <span>{shown.length} deals</span>
      <Sheet open={open} onOpenChange={setOpen} title="Filters" description={<>{shown.length} deals match</>}
        footer={<><Button variant="tertiary" onClick={() => setFilters([])}>Clear all</Button>
          <SheetClose asChild><Button>Done</Button></SheetClose></>}>
        <FilterForm value={filters} onValueChange={setFilters} />
      </Sheet>
      <Table label="Deals" columns={columns} rows={shown} />
    </>
  )
}`
