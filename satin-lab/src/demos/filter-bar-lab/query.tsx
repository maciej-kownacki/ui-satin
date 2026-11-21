import * as React from 'react'
import { Search } from 'iconoir-react'
import { Chip } from '@uisatin/ui/chip'
import { MenuItemContent, menuGroupLabelClass, menuItemClass, menuSurfaceClass } from '@uisatin/ui/dropdown'
import { cn } from '@uisatin/ui/lib/utils'
import { applyFilters, type Filter } from '@uisatin/pro/filter-bar'
import { DealsTable, ME, NAMES, SCENARIO, STAGES, date, dealsLabel, euro, fieldOf, fields, type Deal } from './data'
import { pickedOf, readFilter, writeFilter } from './panel'

/*
 * Direction B, Query: one field does search and filters. Words search the deal's company;
 * `key:value` turns into a pill that reads as words ("Owner is me"). The list under the field
 * shows the keys and their values, so nobody needs to know the syntax. Exploration, not
 * package API.
 */

/* ---------- the grammar ---------- */

type Key = 'owner' | 'stage' | 'value' | 'close' | 'tags'

/** What can be typed before the colon, each with an example and what it means. */
const KEYS: { key: Key; example: string; meaning: string }[] = [
  { key: 'owner', example: 'me', meaning: 'Owner is me' },
  { key: 'stage', example: 'proposal', meaning: 'Stage is Proposal' },
  { key: 'value', example: '>20000', meaning: 'Value > €20,000' },
  { key: 'close', example: 'this-quarter', meaning: 'Close date this quarter' },
  { key: 'tags', example: 'vip', meaning: 'Tags include VIP' },
]
const isKey = (s: string): s is Key => KEYS.some((k) => k.key === s)

const amount = (n: string, thousands: string) => Number(n) * (thousands ? 1000 : 1)

/** One typed value as a filter: `owner:me`, `value:>20k`, `value:10000..50000`, `close:last-30-days`. Null when it is none. */
function resolve(key: Key, raw: string): Filter | null {
  const v = raw.toLowerCase()
  switch (key) {
    case 'owner': {
      const id = v === 'me' ? ME : fieldOf('owner').options?.find((o) => o.value === v || o.label.split(' ')[0].toLowerCase() === v)?.value
      return id ? { field: 'owner', operator: 'is', value: id } : null
    }
    case 'stage': {
      const stage = STAGES.find((s) => s.toLowerCase() === v)
      return stage ? { field: 'stage', operator: 'is', value: stage } : null
    }
    case 'tags': {
      const tag = fieldOf('tags').options?.find((o) => o.value === v)
      return tag ? { field: 'tags', operator: 'hasAnyOf', value: [tag.value] } : null
    }
    case 'value': {
      const one = /^([<>])(\d+(?:\.\d+)?)(k?)$/.exec(v)
      if (one) return { field: 'value', operator: one[1] === '>' ? 'gt' : 'lt', value: amount(one[2], one[3]) }
      const two = /^(\d+(?:\.\d+)?)(k?)\.\.(\d+(?:\.\d+)?)(k?)$/.exec(v)
      if (!two) return null
      const [a, b] = [amount(two[1], two[2]), amount(two[3], two[4])]
      return a <= b ? { field: 'value', operator: 'between', value: [a, b] } : null
    }
    case 'close': {
      const period = /^this-(week|month|quarter|year)$/.exec(v)
      if (period) return { field: 'close', operator: 'inThis', value: period[1] }
      const last = /^last-(\d+)-days?$/.exec(v)
      return last && Number(last[1]) > 0 ? { field: 'close', operator: 'inLast', value: Number(last[1]) } : null
    }
  }
}

/** A `key:value` word as a filter, or null. */
function tokenOf(word: string): Filter | null {
  const colon = word.indexOf(':')
  const key = word.slice(0, colon).toLowerCase()
  return colon > 0 && isKey(key) ? resolve(key, word.slice(colon + 1)) : null
}

const gathers = (key: string) => key === 'owner' || key === 'stage' || key === 'tags'

/**
 * The filters with one more value. Owners, stages and tags gather into one "any of" pill (a deal
 * has one owner, so two can only mean either); value and close date replace theirs, and so does
 * any pick for a pill being changed.
 */
function add(filters: Filter[], next: Filter, replace: boolean): Filter[] {
  let filter = next
  if (!replace && gathers(next.field)) {
    const values = [...new Set([...pickedOf(readFilter(filters, next.field)), ...pickedOf(next)])]
    filter =
      next.field === 'tags'
        ? { field: 'tags', operator: 'hasAnyOf', value: values }
        : values.length === 1
          ? { field: next.field, operator: 'is', value: values[0] }
          : { field: next.field, operator: 'isAnyOf', value: values }
  }
  return writeFilter(filters, next.field, filter)
}

/* ---------- words ---------- */

const anyOf = new Intl.ListFormat('en-US', { type: 'disjunction' })
const optionName = (key: string, value: string) =>
  key === 'owner' ? (value === ME ? 'me' : (NAMES[value] ?? value)) : (fieldOf(key).options?.find((o) => o.value === value)?.label ?? value)
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The value part: "> €20,000", "this quarter", "me or Jon Park". */
function valueText(f: Filter): string {
  const v = f.value
  if (gathers(f.field)) {
    const names = pickedOf(f).map((x) => optionName(f.field, x))
    return names.length > 2 ? `any of ${names.length}` : anyOf.format(names)
  }
  if (f.operator === 'between' && Array.isArray(v)) {
    return f.field === 'close' ? `${date.format(parseDay(String(v[0])))} – ${date.format(parseDay(String(v[1])))}` : `${euro.format(Number(v[0]))}–${euro.format(Number(v[1]))}`
  }
  if (f.operator === 'gt') return `> ${euro.format(Number(v))}`
  if (f.operator === 'lt') return `< ${euro.format(Number(v))}`
  if (f.operator === 'inThis') return `this ${v}`
  if (f.operator === 'inLast') return `last ${v} days`
  return String(v)
}

/** A pill in words: "Owner is me", "Value > €20,000", "Close date this quarter". Never the raw token. */
function pillText(f: Filter): string {
  if (f.field === 'tags') return `Tags include ${valueText(f)}`
  if (gathers(f.field)) return `${fieldOf(f.field).label} is ${valueText(f)}`
  return `${fieldOf(f.field).label} ${valueText(f)}`
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** What the list offers after `key:`, as tokens. Owners start with "me". */
function tokensOf(key: Key): { token: string; label: string; icon?: React.ReactNode }[] {
  if (key === 'owner') {
    const options = [...(fieldOf('owner').options ?? [])].sort((a, b) => Number(b.value === ME) - Number(a.value === ME))
    return options.map((o) => (o.value === ME ? { token: 'me', label: 'Me', icon: o.icon } : { token: o.value, label: o.label, icon: o.icon }))
  }
  if (key === 'stage') return STAGES.map((s) => ({ token: s.toLowerCase(), label: s }))
  if (key === 'tags') return (fieldOf('tags').options ?? []).map((o) => ({ token: o.value, label: o.label }))
  const presets = key === 'value' ? ['>10000', '>20000', '>50000', '<10000'] : ['this-month', 'this-quarter', 'this-year', 'last-30-days']
  return presets.map((token) => ({ token, label: cap(valueText(resolve(key, token) as Filter)) }))
}

/** The filter holds this one value already: its row gets the check. */
function holds(current: Filter | undefined, f: Filter) {
  if (!current) return false
  if (gathers(f.field)) return pickedOf(current).includes(pickedOf(f)[0])
  return current.operator === f.operator && JSON.stringify(current.value) === JSON.stringify(f.value)
}

/* ---------- direction B ---------- */

interface Row {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  selected?: boolean
  pick: () => void
}

export function QueryDirection({ deals }: { deals: Deal[] }) {
  const [filters, setFilters] = React.useState<Filter[]>(SCENARIO)
  const [text, setText] = React.useState('')
  const [open, setOpen] = React.useState(false)
  // A pill being changed: the list shows its key's values, and a pick replaces its value.
  const [editing, setEditing] = React.useState<Key | null>(null)
  const [active, setActive] = React.useState(0)
  // The highlight shows the focus ring only when the arrows put it there (see menuItemClass).
  const [viaKeys, setViaKeys] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  // Focus given back from script (after a pill's ×) doesn't open the list.
  const quiet = React.useRef(false)
  const listId = React.useId()
  const hintId = React.useId()
  const headerId = React.useId()

  // Free words search the company; a word with a key (`stage:pro`, still being typed) doesn't.
  const terms = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !isKey(w.slice(0, Math.max(0, w.indexOf(':')))))
  const shown = applyFilters(deals, filters, fields).filter((d) => terms.every((t) => d.company.toLowerCase().includes(t)))

  // The word at the end of the field, and what comes before it.
  const [, before, word] = /^([\s\S]*?)(\S*)$/.exec(text) as RegExpExecArray

  const focusInput = () => {
    quiet.current = true
    inputRef.current?.focus()
    quiet.current = false
  }
  const pickValue = (f: Filter, replace: boolean) => {
    setFilters(add(filters, f, replace))
    // The token typed so far becomes the pill.
    if (!replace) setText(before)
    setEditing(null)
    setOpen(false)
  }
  /** Every complete token in the field becomes a pill (Enter with nothing listed, or leaving). */
  const commitAll = () => {
    let next = filters
    const rest: string[] = []
    for (const w of text.split(/\s+/).filter(Boolean)) {
      const f = tokenOf(w)
      if (f) next = add(next, f, false)
      else rest.push(w)
    }
    if (next === filters) return
    setFilters(next)
    setText(rest.join(' '))
  }

  /* The one list: a pill's values, a key's values after `key:`, or the keys. */
  const valueRows = (key: Key, partial: string, replace: boolean): Row[] => {
    const p = partial.toLowerCase()
    const current = readFilter(filters, key)
    const offered = tokensOf(key)
    let list = offered.filter((o) => o.token.startsWith(p) || o.label.toLowerCase().includes(p))
    // What is typed, when it is a value of its own (`value:>35000`, `close:last-7-days`), comes first.
    const typed = p ? resolve(key, p) : null
    if (typed && !offered.some((o) => o.token === p)) list = [{ token: p, label: cap(valueText(typed)) }, ...list]
    return list.map((o) => {
      const f = resolve(key, o.token) as Filter
      return {
        id: `${key}:${o.token}`,
        label: o.label,
        icon: o.icon,
        description: <span className="font-mono">{`${key}:${o.token}`}</span>,
        selected: holds(current, f),
        pick: () => pickValue(f, replace),
      }
    })
  }
  const keyRows = (typed: string): Row[] =>
    KEYS.filter((k) => !typed || k.key.startsWith(typed) || fieldOf(k.key).label.toLowerCase().startsWith(typed)).map((k) => ({
      id: k.key,
      icon: fieldOf(k.key).icon,
      label: (
        <span className="font-mono text-sm font-normal">
          {k.key}:<span className="text-text-muted">{k.example}</span>
        </span>
      ),
      description: k.meaning,
      // The key goes into the field; its values follow.
      pick: () => {
        setText(`${before}${k.key}:`)
        setActive(0)
        setOpen(true)
      },
    }))

  const colon = word.indexOf(':')
  const typedKey = word.slice(0, Math.max(0, colon)).toLowerCase()
  const list: { header: string; rows: Row[] } = editing
    ? { header: fieldOf(editing).label, rows: valueRows(editing, '', true) }
    : colon > 0
      ? isKey(typedKey)
        ? { header: fieldOf(typedKey).label, rows: valueRows(typedKey, word.slice(colon + 1), false) }
        : { header: '', rows: [] }
      : { header: 'Filter by', rows: keyRows(word.toLowerCase()) }
  const rows = list.rows
  const expanded = open && rows.length > 0
  const at = Math.max(0, Math.min(active, rows.length - 1))

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setViaKeys(true)
      if (!expanded) {
        setOpen(true)
        setActive(0)
      } else setActive((at + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (expanded) rows[at].pick()
      else commitAll()
    } else if (e.key === 'Tab' && !e.shiftKey && expanded && (text || viaKeys || editing)) {
      // Tab picks once something is typed or chosen; Tab into an empty field and out again just passes.
      e.preventDefault()
      rows[at].pick()
    } else if (e.key === 'Escape' && (expanded || editing)) {
      e.preventDefault()
      setOpen(false)
      setEditing(null)
    } else if (e.key === ' ' && input.selectionStart === text.length) {
      // A complete token before the caret becomes a pill; anything else is a space.
      const f = tokenOf(word)
      if (!f) return
      e.preventDefault()
      pickValue(f, false)
    } else if (e.key === 'Backspace' && input.selectionStart === 0 && input.selectionEnd === 0 && filters.length) {
      e.preventDefault()
      setFilters(filters.slice(0, -1))
      setEditing(null)
    }
  }

  return (
    <div className="flex w-[760px] max-w-full flex-col gap-3">
      <div className="flex items-start gap-3">
        <div
          className="relative min-w-0 flex-1"
          onBlur={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
            setOpen(false)
            setEditing(null)
            setActive(0)
            commitAll()
          }}
        >
          {/* The Input skin, growing a row at a time as the pills wrap, as in Combobox multiple. */}
          <div
            data-slot="query-field"
            data-size="md"
            data-multiple=""
            data-leading=""
            onMouseDown={(e) => {
              // A press on the frame (not a pill) puts the caret in the field.
              if ((e.target as HTMLElement).closest('button, input')) return
              e.preventDefault()
              inputRef.current?.focus()
              setOpen(true)
            }}
            className="satin-field satin-combobox cursor-text!"
          >
            <span aria-hidden className="satin-field-icon satin-combobox-icon">
              <Search />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {filters.map((f, i) => {
                const words = pillText(f)
                return (
                  <Chip
                    key={f.field}
                    size="sm"
                    variant="outline"
                    // The pill being changed looks pressed while its values are listed.
                    data-force={editing === f.field ? 'pressed' : undefined}
                    removeLabel={`Remove ${words}`}
                    onRemove={() => {
                      setFilters(filters.filter((_, j) => j !== i))
                      setEditing(null)
                      setOpen(false)
                      focusInput()
                    }}
                    className="max-w-full"
                  >
                    {/* Pressing the pill lists its key's values; a pick replaces its value. */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(f.field as Key)
                        setActive(Math.max(0, valueRows(f.field as Key, '', true).findIndex((r) => r.selected)))
                        setViaKeys(false)
                        inputRef.current?.focus()
                        setOpen(true)
                      }}
                      className="-mx-2 flex h-6 cursor-pointer items-center rounded-pill px-2 outline-none"
                    >
                      {words}
                      <span className="sr-only">, change</span>
                    </button>
                  </Chip>
                )
              })}
              <input
                ref={inputRef}
                role="combobox"
                aria-label="Search and filter deals"
                aria-describedby={hintId}
                aria-expanded={expanded}
                aria-controls={expanded ? listId : undefined}
                aria-autocomplete="list"
                aria-activedescendant={expanded ? `${listId}-${at}` : undefined}
                autoComplete="off"
                spellCheck={false}
                placeholder="Search or filter…"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setEditing(null)
                  setActive(0)
                  setOpen(true)
                }}
                onFocus={() => {
                  if (quiet.current) return
                  setOpen(true)
                  setViaKeys(false)
                }}
                // After Escape, a click brings the list back.
                onClick={() => setOpen(true)}
                onKeyDown={onKeyDown}
                className="satin-field-input h-6! min-w-[140px]!"
              />
            </div>
          </div>
          <p id={hintId} className="sr-only">
            Words search the deals. Filter with owner:, stage:, value:, close: or tags:, for example owner:me.
          </p>

          {expanded && (
            <div
              id={listId}
              role="listbox"
              aria-label="Suggestions"
              className={cn('absolute start-0 top-full z-50 mt-1 flex w-[360px] max-w-full flex-col p-1', menuSurfaceClass)}
            >
              <div role="group" aria-labelledby={headerId} className="flex flex-col gap-0.5">
                <div id={headerId} aria-hidden className={menuGroupLabelClass}>
                  {list.header}
                </div>
                {rows.map((r, i) => (
                  <div
                    key={r.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={r.selected ?? false}
                    data-highlighted={i === at ? '' : undefined}
                    data-keyboard={i === at && viaKeys ? '' : undefined}
                    onPointerMove={() => {
                      setViaKeys(false)
                      setActive(i)
                    }}
                    // Focus stays in the field.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={r.pick}
                    className={cn(menuItemClass, r.selected && 'bg-bg-selected')}
                  >
                    <MenuItemContent label={r.label} description={r.description} icon={r.icon} layout="inline" selected={r.selected} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <span aria-live="polite" className="flex h-9 shrink-0 items-center text-sm text-text-muted tabular-nums">
          {dealsLabel(shown.length)}
        </span>
      </div>
      <DealsTable rows={shown} />
    </div>
  )
}

export const queryCode = `// Exploration, not package API: direction B, Query. One field for search and filters.
import { Chip } from '@uisatin/ui/chip'
import { MenuItemContent, menuItemClass } from '@uisatin/ui/dropdown'
import { applyFilters, type Filter } from '@uisatin/pro/filter-bar'

export function Pipeline({ deals }: { deals: Deal[] }) {
  const [filters, setFilters] = React.useState<Filter[]>(saved)
  const [text, setText] = React.useState('')
  // owner:me → is, value:>20000 → gt, value:10k..50k → between, close:this-quarter → inThis, close:last-30-days
  // → inLast, tags:vip → hasAnyOf. Owners, stages, tags gather into one "any of" pill; value, close replace.
  const words = text.split(/\\s+/).filter((w) => w && !isToken(w))
  const shown = applyFilters(deals, filters, fields).filter((d) => words.every((w) => d.company.toLowerCase().includes(w)))

  return (
    <>
      {/* The Input skin around pills and the text; the list under it is one listbox. */}
      <div className="satin-field satin-combobox" data-size="md" data-multiple="" data-leading="">
        <Search />
        {filters.map((f, i) => (
          <Chip key={f.field} size="sm" variant="outline" onRemove={() => setFilters(without(filters, i))}>
            <button onClick={() => edit(f.field)}>{pillText(f)}</button> {/* "Owner is me" */}
          </Chip>
        ))}
        <input role="combobox" aria-controls="suggestions" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={keys} />
      </div>
      <span>{shown.length} deals</span>
      <Table label="Deals" columns={columns} rows={shown} />
    </>
  )
}`
