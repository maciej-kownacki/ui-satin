import * as React from 'react'
import { NavArrowDown, NavArrowLeft, Xmark, XmarkCircle } from 'iconoir-react'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Calendar, type DateRange } from '@uisatin/ui/date-picker'
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
import { cn } from '@uisatin/ui/lib/utils'
import { Popover } from '@uisatin/ui/popover'
import { Tooltip } from '@uisatin/ui/tooltip'
import { applyFilters, isFilterValid, toFilterDate, type Filter, type FilterField } from '@uisatin/pro/filter-bar'
import { DealsTable, SCENARIO, STAGE_TONE, date, dealsLabel, euro, fieldOf, fields, type Deal } from './data'
import { pickedOf, readFilter, writeFilter } from './panel'

/*
 * Direction A, Facets: every field has a fixed slot in the bar, idle or set. No "+ Filter", no
 * operators: each facet opens one surface with its choices, and its × clears it. Exploration,
 * not package API.
 */

interface FacetProps {
  filters: Filter[]
  onChange: (next: Filter[]) => void
}

/* ---------- the slot ---------- */

// The slot draws the skin; the buttons inside it are bare. Idle reads as a secondary button,
// set reads as pressed in: the selected fill and the strong edge, no drop shadow.
const shellClass =
  'inline-flex h-control-height shrink-0 items-center rounded-lg border border-strong text-sm whitespace-nowrap transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-out)'
const idleClass =
  'border-border-default bg-bg-popover text-text-muted [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)] satin-hover:border-border-strong satin-hover:bg-bg-hover has-[[aria-expanded=true]]:border-border-strong has-[[aria-expanded=true]]:bg-bg-hover'
const activeClass = 'border-border-strong bg-bg-selected text-text-default'
// The Button's ring: 2px off the trigger. data-slot + aria-haspopup drop it after a mouse press (satin.css).
// Insets a little under a Button's 10px, so five facets, the clear button and the count fit one row.
const triggerClass =
  'flex h-full cursor-pointer items-center rounded-[inherit] ps-2 outline-none satin-focus:outline-2 satin-focus:outline-solid satin-focus:outline-offset-2 satin-focus:outline-action-focus-ring'
const clearClass =
  'me-1 grid size-5 shrink-0 cursor-pointer place-items-center rounded-md text-text-muted outline-none transition-colors duration-(--duration-fast) ease-(--ease-out) hover:bg-bg-pressed hover:text-text-default focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]'

interface SlotProps {
  field: FilterField
  /** The label while set; "Close" is enough next to a date. */
  short?: string
  /** The value in a few words ("Me +1"), or null while the facet is idle. */
  value: string | null
  /** The value in full, for screen readers ("me or Jon Park"). */
  full?: string
  onClear: () => void
  /** Puts the trigger in its surface: a DropdownMenu or a Popover. */
  surface: (trigger: React.ReactElement) => React.ReactNode
  /** More for the trigger button: the Popover's ↓ to open. */
  triggerProps?: React.ComponentProps<'button'>
}

function Slot({ field, short = field.label, value, full = value ?? '', onClear, surface, triggerProps }: SlotProps) {
  const ref = React.useRef<HTMLButtonElement>(null)
  const active = value !== null
  const trigger = (
    <button
      {...triggerProps}
      ref={ref}
      type="button"
      data-slot="facet-trigger"
      aria-label={active ? `${field.label}: ${full}` : undefined}
      className={cn(triggerClass, active ? 'gap-1 pe-0.5' : 'gap-1 pe-1.5')}
    >
      {active ? (
        <>
          <span className="text-text-muted">{short}:</span>
          <span className="font-medium">{value}</span>
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
    <span data-slot="facet" data-active={active || undefined} className={cn(shellClass, active ? activeClass : idleClass)}>
      {surface(trigger)}
      {active && (
        <button
          type="button"
          aria-label={`Clear ${field.label}`}
          onClick={() => {
            onClear()
            // The × goes with the value; focus stays on the slot.
            ref.current?.focus()
          }}
          className={clearClass}
        >
          <Xmark aria-hidden className="size-3.5 [stroke-width:1.875]" />
        </button>
      )}
    </span>
  )
}

/** The last group of every surface: Clear, under a rule, there even while idle so the list never jumps. */
function ClearGroup({ disabled, onClear }: { disabled: boolean; onClear: () => void }) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem label="Clear" layout="inline" disabled={disabled} onSelect={onClear} />
    </DropdownMenuGroup>
  )
}

/* ---------- Owner, Stage, Tags: any of, as checkboxes ---------- */

const anyOf = new Intl.ListFormat('en-US', { type: 'disjunction' })

/** `tones` draws each row's label as the Badge the table shows for that value (Stage). */
function OptionsFacet({ field, tones, filters, onChange }: FacetProps & { field: FilterField; tones?: Record<string, BadgeTone> }) {
  const picked = pickedOf(readFilter(filters, field.key))
  // "Me" first, as everywhere else in the lab.
  const options = [...(field.options ?? [])].sort((a, b) => Number(b.value === field.me) - Number(a.value === field.me))
  const nameOf = (value: string) => (value === field.me ? 'Me' : (options.find((o) => o.value === value)?.label ?? value))
  const on = options.filter((o) => picked.includes(o.value)).map((o) => o.value)
  const set = (next: string[]) => {
    const filter: Filter | null = !next.length
      ? null
      : field.type === 'multi'
        ? { field: field.key, operator: 'hasAnyOf', value: next }
        : next.length === 1
          ? { field: field.key, operator: 'is', value: next[0] }
          : { field: field.key, operator: 'isAnyOf', value: next }
    onChange(writeFilter(filters, field.key, filter))
  }
  const toggle = (value: string, checked: boolean) => set(options.map((o) => o.value).filter((v) => (v === value ? checked : on.includes(v))))

  return (
    <Slot
      field={field}
      value={on.length ? `${nameOf(on[0])}${on.length > 1 ? ` +${on.length - 1}` : ''}` : null}
      full={anyOf.format(on.map(nameOf))}
      onClear={() => set([])}
      surface={(trigger) => (
        // Not modal: a press on the next facet closes this menu and opens that one in one go.
        <DropdownMenu trigger={trigger} aria-label={field.label} modal={false}>
          <DropdownMenuGroup>
            {options.map((o) => (
              <DropdownMenuCheckboxItem
                key={o.value}
                label={nameOf(o.value)}
                icon={o.icon}
                layout="inline"
                renderLabel={
                  tones
                    ? (label) => (
                        <Badge size="sm" tone={tones[o.value]}>
                          {label}
                        </Badge>
                      )
                    : undefined
                }
                checked={on.includes(o.value)}
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

/* ---------- Value: one preset ---------- */

const k = (n: number) => `€${n / 1000}k`
const VALUE_PRESETS: { id: string; filter: Filter }[] = [
  { id: 'gt-10000', filter: { field: 'value', operator: 'gt', value: 10_000 } },
  { id: 'gt-20000', filter: { field: 'value', operator: 'gt', value: 20_000 } },
  { id: 'gt-50000', filter: { field: 'value', operator: 'gt', value: 50_000 } },
  { id: 'lt-10000', filter: { field: 'value', operator: 'lt', value: 10_000 } },
]
const presetLabel = (f: Filter) => `${f.operator === 'gt' ? '>' : '<'} ${k(f.value as number)}`

function ValueFacet({ filters, onChange }: FacetProps) {
  const field = fieldOf('value')
  const filter = readFilter(filters, 'value')
  const current = VALUE_PRESETS.find((p) => p.filter.operator === filter?.operator && p.filter.value === filter?.value)
  const set = (next: Filter | null) => onChange(writeFilter(filters, 'value', next))
  const full = current ? `${current.filter.operator === 'gt' ? 'over' : 'under'} ${euro.format(current.filter.value as number)}` : undefined
  return (
    <Slot
      field={field}
      value={current ? presetLabel(current.filter) : null}
      full={full}
      onClear={() => set(null)}
      surface={(trigger) => (
        <DropdownMenu trigger={trigger} aria-label={field.label} modal={false}>
          <DropdownMenuRadioGroup value={current?.id ?? ''} onValueChange={(id) => set(VALUE_PRESETS.find((p) => p.id === id)?.filter ?? null)}>
            {VALUE_PRESETS.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id} label={presetLabel(p.filter)} layout="inline" />
            ))}
          </DropdownMenuRadioGroup>
          <ClearGroup disabled={!filter} onClear={() => set(null)} />
        </DropdownMenu>
      )}
    />
  )
}

/* ---------- Close date: presets, or a range on the same surface ---------- */

const CLOSE_PRESETS: { label: string; filter: Filter }[] = [
  { label: 'This month', filter: { field: 'close', operator: 'inThis', value: 'month' } },
  { label: 'This quarter', filter: { field: 'close', operator: 'inThis', value: 'quarter' } },
  { label: 'This year', filter: { field: 'close', operator: 'inThis', value: 'year' } },
  { label: 'Last 30 days', filter: { field: 'close', operator: 'inLast', value: 30 } },
]
const CUSTOM = CLOSE_PRESETS.length

const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const rangeText = (r: DateRange) => (r.from ? `${date.format(r.from)} – ${r.to ? date.format(r.to) : '…'}` : '')

/**
 * A Popover, not a DropdownMenu: "Custom range…" swaps the list for a Calendar on the same
 * surface, and a menu keeps Tab from moving between Back and the calendar.
 */
function CloseFacet({ filters, onChange }: FacetProps) {
  const field = fieldOf('close')
  const filter = readFilter(filters, 'close')
  const at = CLOSE_PRESETS.findIndex((p) => p.filter.operator === filter?.operator && p.filter.value === filter?.value)
  const days = filter?.operator === 'between' && Array.isArray(filter.value) ? (filter.value as string[]) : null
  const range: DateRange | null = days ? { from: parseDay(days[0]), to: parseDay(days[1]) } : null
  const selected = at >= 0 ? at : range ? CUSTOM : -1
  const set = (next: Filter | null) => onChange(writeFilter(filters, 'close', next))

  const [open, setOpen] = React.useState(false)
  const [custom, setCustom] = React.useState(false)
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

  const rows = [...CLOSE_PRESETS.map((p) => p.label), 'Custom range…']
  const close = () => setOpen(false)
  const pick = (i: number) => {
    if (i !== CUSTOM) {
      set(CLOSE_PRESETS[i].filter)
      return close()
    }
    setDraft(range ?? { from: null, to: null })
    setCustom(true)
  }
  const back = () => {
    setCustom(false)
    setActive(CUSTOM)
  }
  // The swap moves focus with it: into the calendar's day, or back to the list.
  React.useEffect(() => {
    if (!open) return
    const target = custom ? calendarRef.current?.querySelector<HTMLElement>('[data-slot="calendar-day"][tabindex="0"]') : listRef.current
    target?.focus()
  }, [custom])

  const onKeyDown = (e: React.KeyboardEvent) => {
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
        aria-activedescendant={`${listId}-${active}`}
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
              key={label}
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
              <MenuItemContent label={label} description={i === CUSTOM && range ? rangeText(range) : undefined} layout="inline" selected={i === selected} />
            </div>
          )
        })}
      </div>
      <div aria-hidden className="h-(--border-width-default) bg-bg-muted" />
      <button
        type="button"
        disabled={!filter}
        data-disabled={!filter || undefined}
        onClick={() => {
          set(null)
          close()
        }}
        className={cn(menuItemClass, 'satin-hover:bg-bg-selected')}
      >
        <MenuItemContent label="Clear" layout="inline" />
      </button>
    </div>
  )

  const calendar = (
    <div ref={calendarRef} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Button variant="tertiary" size="xs" onClick={back}>
          <NavArrowLeft />
          Back
        </Button>
        <span aria-live="polite" className="text-sm text-text-muted tabular-nums">
          {draft.from ? (draft.to ? rangeText(draft) : `${date.format(draft.from)} – pick the end`) : 'Pick the first day'}
        </span>
      </div>
      <Calendar
        mode="range"
        range={draft}
        onRangeChange={(r) => {
          setDraft(r)
          // A complete range is the answer: it applies and the surface closes.
          if (r.from && r.to) {
            set({ field: 'close', operator: 'between', value: [toFilterDate(r.from), toFilterDate(r.to)] })
            close()
          }
        }}
      />
    </div>
  )

  return (
    <Slot
      field={field}
      short="Close"
      value={selected === CUSTOM && range ? rangeText(range) : selected >= 0 ? CLOSE_PRESETS[selected].label : null}
      onClear={() => set(null)}
      triggerProps={{
        // ↓ opens it too, as on the menus' triggers.
        onKeyDown: (e) => {
          byKeys.current = true
          if (e.key !== 'ArrowDown') return
          e.preventDefault()
          setCustom(false)
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
          // The title is drawn as a menu's group header, as the other facets' menus would show it:
          // 12px text/muted, in line with the rows' labels. The margins undo the Popover's 10px edge.
          title={<span className={cn(menuGroupLabelClass, '-ms-1 -mt-1.5')}>{custom ? 'Custom range' : field.label}</span>}
          // The list ends 6px from the edge, as it starts; the calendar keeps the Popover's 10px.
          className={custom ? undefined : 'pb-1.5'}
          closeButton={false}
          open={open}
          onOpenChange={(next) => {
            if (next) {
              setCustom(false)
              setActive(Math.max(0, selected))
              setViaKeys(byKeys.current)
            }
            setOpen(next)
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            listRef.current?.focus()
          }}
          // Escape on the calendar goes back to the list first, as in the Filter bar's editor.
          onEscapeKeyDown={(e: KeyboardEvent) => {
            if (!custom) return
            e.preventDefault()
            back()
          }}
          body={custom ? calendar : list}
        >
          {trigger}
        </Popover>
      )}
    />
  )
}

/* ---------- direction A ---------- */

export function FacetsDirection({ deals }: { deals: Deal[] }) {
  const [filters, setFilters] = React.useState<Filter[]>(SCENARIO)
  const barRef = React.useRef<HTMLDivElement>(null)
  const shown = applyFilters(deals, filters, fields)
  const any = filters.some((f) => isFilterValid(f, fields))
  const props = { filters, onChange: setFilters }

  return (
    <div className="flex w-[760px] max-w-full flex-col gap-3">
      {/* Sized for one row at the docs stage's width with one more facet set. The count comes last,
          so a long value pushes it to the next row before the clear button. */}
      <div ref={barRef} role="group" aria-label="Filters" className="flex flex-wrap items-center gap-1.5">
        <OptionsFacet field={fieldOf('owner')} {...props} />
        <OptionsFacet field={fieldOf('stage')} tones={STAGE_TONE} {...props} />
        <ValueFacet {...props} />
        <CloseFacet {...props} />
        <OptionsFacet field={fieldOf('tags')} {...props} />
        {any && (
          // Icon-sized: the word "Clear" pushed the count to a second row.
          <Tooltip label="Clear filters">
            <Button
              variant="tertiary"
              iconOnly
              aria-label="Clear filters"
              onClick={() => {
                setFilters([])
                // Clear goes with the filters; focus moves to the first facet.
                barRef.current?.querySelector<HTMLElement>('[data-slot="facet-trigger"]')?.focus()
              }}
            >
              <XmarkCircle />
            </Button>
          </Tooltip>
        )}
        <span aria-live="polite" className="ms-auto shrink-0 text-sm text-text-muted tabular-nums">
          {dealsLabel(shown.length)}
        </span>
      </div>
      <DealsTable rows={shown} />
    </div>
  )
}

export const facetsCode = `// Exploration, not package API: direction A, Facets. A fixed slot per field, no operators.
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@uisatin/ui/dropdown'
import { Popover } from '@uisatin/ui/popover'
import { Tooltip } from '@uisatin/ui/tooltip'
import { Calendar } from '@uisatin/ui/date-picker'
import { applyFilters, type Filter } from '@uisatin/pro/filter-bar'

export function Pipeline({ deals }: { deals: Deal[] }) {
  const [filters, setFilters] = React.useState<Filter[]>(saved)
  const shown = applyFilters(deals, filters, fields)

  // Every facet reads and writes its field's one filter. Idle: "Stage ▾". Set: "Owner: Me ×".
  // Owner, Stage, Tags → isAnyOf / hasAnyOf (DropdownMenuCheckboxItem, the menu stays open).
  // Value → gt / lt presets (DropdownMenuRadioGroup). Close date → inThis / inLast presets,
  // or "Custom range…": the same Popover swaps its list for <Calendar mode="range" /> → between.
  return (
    <>
      <div role="group" aria-label="Filters">
        <OptionsFacet field={owner} filters={filters} onChange={setFilters} />
        <OptionsFacet field={stage} filters={filters} onChange={setFilters} />
        <ValueFacet filters={filters} onChange={setFilters} />
        <CloseFacet filters={filters} onChange={setFilters} />
        <OptionsFacet field={tags} filters={filters} onChange={setFilters} />
        {filters.length > 0 && (
          <Tooltip label="Clear filters">
            <Button variant="tertiary" iconOnly aria-label="Clear filters" onClick={() => setFilters([])}><XmarkCircle /></Button>
          </Tooltip>
        )}
        <span>{shown.length} deals</span>
      </div>
      <Table label="Deals" columns={columns} rows={shown} />
    </>
  )
}`
