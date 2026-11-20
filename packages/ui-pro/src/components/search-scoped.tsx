'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Badge } from '@uisatin/ui/badge'
import { Chip } from '@uisatin/ui/chip'
import { MenuItemContent, menuGroupLabelClass, menuItemClass, menuSurfaceClass } from '@uisatin/ui/dropdown'
import { KbdArrowDown, KbdArrowUp, KbdHint, KbdReturn } from '@uisatin/ui/kbd'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { SearchBar, type SearchBarProps } from '@uisatin/ui/search-bar'
import { Spinner } from '@uisatin/ui/spinner'

/**
 * ScopedSearch: search across several kinds of record (candidates, jobs, notes) with filters
 * typed into the query. `stage:interview react` becomes a "Stage: Interview" chip in the field
 * and the word "react"; the results come back grouped, each group with its count.
 *
 * The field is SearchBar's (⌘K or Ctrl+K focuses it from anywhere, unless `hotkey` is off), the
 * chips sit in it before the query. Under it a menu surface opens with:
 *
 * - nothing typed: `recent` searches, then the `scopes` to filter by;
 * - a word that starts a scope (`st`): that scope, to pick; after `stage:`, its `values`;
 * - otherwise the `groups`, filtered here by the chips and the words (or as given, with
 *   `filter={false}` when your server searches), each under its label and count; or "No results
 *   for …".
 *
 * A typed `key:value` turns into a chip when a space follows it, or when its value is picked
 * from the list. With `values`, only those values make a chip; without, any word does. Quote a
 * value with spaces: `owner:"Ada Novak"`. Chips of one scope match any of their values; chips
 * of different scopes must all match.
 *
 * Keys: the arrows move the highlight (no motion), Enter runs it, Backspace at the start of
 * the query removes the last chip, Escape closes the list (and, closed, clears the words). The
 * groups fade in as they appear.
 *
 * Helpers for a server search: `parseScopedQuery(text, scopes)` reads a query string,
 * `formatScopedQuery(query)` writes one (for recent searches), `filterScopedGroups(groups,
 * query, scopes)` is the filter used here.
 *
 * Other props, `ref` included, go to the input; `wrapperClassName` styles the field around it.
 */

/** The words ScopedSearch says on its own. They join SatinLabels, so the app translates them there. */
export const scopedSearchLabels = {
  /** The name of the list of results. */
  scopedSearchResults: 'Search results',
  /** The heading over recent searches. */
  scopedSearchRecent: 'Recent searches',
  /** The heading over the scopes a search can be narrowed by. */
  scopedSearchFilters: 'Filters',
  /** A chip: the scope's label and the value's ("Stage: Interview"). */
  scopedSearchToken: (scope: string, value: string) => `${scope}: ${value}`,
  /** A group's heading for screen readers: "Candidates, 6 results". */
  scopedSearchGroup: (group: string, count: number) => `${group}, ${count === 1 ? '1 result' : `${count} results`}`,
  /** Read out as the results change, and shown in the footer. */
  scopedSearchResultCount: (count: number) => (count === 0 ? 'No results' : count === 1 ? '1 result' : `${count} results`),
  /** Read out when a chip is added. */
  scopedSearchFilterAdded: (filter: string) => `Filter added: ${filter}`,
  /** Read out when a chip is removed. */
  scopedSearchFilterRemoved: (filter: string) => `Filter removed: ${filter}`,
  /** The Backspace hint in the footer. */
  scopedSearchRemoveFilter: 'Remove filter',
  /** Shown while `loading`. */
  scopedSearchSearching: 'Searching…',
}

type ScopedSearchLabels = typeof scopedSearchLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends ScopedSearchLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...scopedSearchLabels, ...labels }), [labels])
}

/* ---------- the query ---------- */

/** A value a scope suggests after `key:`. */
export interface ScopedSearchValue {
  /** What the chip holds and the query string says. */
  value: string
  /** What the list and the chip show. Defaults to `value`. */
  label?: string
}

/** Something to narrow the search by, typed as `key:value`. */
export interface ScopedSearchScope {
  /** Typed before the colon: `stage` in `stage:interview`. Matched without case. */
  key: string
  /** Shown in the chip and the list: "Stage". */
  label: string
  /** Suggested after `key:`. With them, only these make a chip; without, any value does. */
  values?: (string | ScopedSearchValue)[]
}

/** One chip: a scope's `key` and one of its values. */
export interface ScopedSearchToken {
  key: string
  value: string
}

/** What is searched for: the chips, then the words typed after them. */
export interface ScopedSearchQuery {
  tokens: ScopedSearchToken[]
  text: string
}

/** One result row. */
export interface ScopedSearchItem {
  id: string
  label: string
  /** After the label, on the same line, muted: a role, a company, a snippet. */
  description?: string
  /** Before the label, as it is: an Avatar (20px fits the row). */
  media?: React.ReactNode
  /** Before the label, 16px muted, when there's no `media`. */
  icon?: React.ReactNode
  /** At the end of the row: a Badge, a date. */
  meta?: React.ReactNode
  /** What the chips match, by scope key: `{ stage: 'interview', owner: ['ada', 'jon'] }`. */
  fields?: Record<string, string | string[]>
  /** More words the query matches. */
  keywords?: string[]
  disabled?: boolean
  /** Runs when the row is picked, before the search's own `onSelect`. */
  onSelect?: () => void
}

/** Results of one kind, under a heading with their count. */
export interface ScopedSearchGroup {
  id: string
  /** "Candidates". */
  label: string
  items: ScopedSearchItem[]
  /** The total, when the server sends only the first few rows. Defaults to the rows shown. */
  count?: number
}

const lower = (s: string) => s.toLocaleLowerCase()

const valuesOf = (scope: ScopedSearchScope) =>
  (scope.values ?? []).map((v) => (typeof v === 'string' ? { value: v, label: v } : { value: v.value, label: v.label ?? v.value }))

const scopeOf = (scopes: ScopedSearchScope[], key: string) => scopes.find((s) => lower(s.key) === lower(key))

function resolveToken(scopes: ScopedSearchScope[], key: string, raw: string): ScopedSearchToken | null {
  const scope = scopeOf(scopes, key)
  const value = raw.replace(/^"|"$/g, '').trim()
  if (!scope || !value) return null
  if (!scope.values) return { key: scope.key, value }
  const hit = valuesOf(scope).find((v) => lower(v.value) === lower(value) || lower(v.label) === lower(value))
  return hit ? { key: scope.key, value: hit.value } : null
}

const sameToken = (a: ScopedSearchToken, b: ScopedSearchToken) => a.key === b.key && a.value === b.value

// A word `key:value` (the value maybe quoted), on its own between spaces.
const TOKEN = /(^|\s)([^\s:"]+):("[^"]*"|[^\s"]+)(?=\s|$)/g

/**
 * Reads a query string: each `key:value` of a known scope becomes a token, the rest stays as
 * text. With `partial` (while typing), a token still needs a space after it, so the word being
 * typed isn't taken early, and the text keeps its trailing space.
 */
export function parseScopedQuery(input: string, scopes: ScopedSearchScope[], { partial = false }: { partial?: boolean } = {}): ScopedSearchQuery {
  const tokens: ScopedSearchToken[] = []
  const text = input.replace(TOKEN, (match: string, lead: string, key: string, raw: string, offset: number) => {
    if (partial && offset + match.length === input.length) return match
    const token = resolveToken(scopes, key, raw)
    if (!token) return match
    if (!tokens.some((t) => sameToken(t, token))) tokens.push(token)
    return lead
  })
  const tidy = text.replace(/\s+/g, ' ').replace(/^ /, '')
  return { tokens, text: partial ? tidy : tidy.trim() }
}

/** Writes a query back as a string, `stage:interview react`: for recent searches, a URL. */
export function formatScopedQuery({ tokens, text }: ScopedSearchQuery) {
  const words = tokens.map((t) => `${t.key}:${/\s/.test(t.value) ? `"${t.value}"` : t.value}`)
  return [...words, text.trim()].filter(Boolean).join(' ')
}

const fieldValues = (item: ScopedSearchItem, key: string) => {
  const field = item.fields?.[key]
  return (field == null ? [] : Array.isArray(field) ? field : [field]).map(lower)
}

/**
 * The groups with only the rows that match: every chip's scope (one value of each scope is
 * enough), then every word in the label, description, keywords or fields. A `key:value` still
 * in the text counts as a chip; a scope still being typed (`stage:int`) narrows nothing yet.
 * Empty groups go; each group's `count` becomes its rows.
 */
export function filterScopedGroups(groups: ScopedSearchGroup[], query: ScopedSearchQuery, scopes: ScopedSearchScope[] = []): ScopedSearchGroup[] {
  const typed = parseScopedQuery(query.text, scopes)
  const byKey = new Map<string, string[]>()
  for (const t of [...query.tokens, ...typed.tokens]) byKey.set(t.key, [...(byKey.get(t.key) ?? []), lower(t.value)])
  const words = lower(typed.text)
    .split(/\s+/)
    .filter((w) => w && !(w.includes(':') && scopeOf(scopes, w.slice(0, w.indexOf(':')))))
  const matches = (item: ScopedSearchItem) => {
    for (const [key, values] of byKey) {
      const have = fieldValues(item, key)
      if (!values.some((v) => have.includes(v))) return false
    }
    if (!words.length) return true
    const hay = [item.label, item.description ?? '', ...(item.keywords ?? []), ...Object.values(item.fields ?? {}).flat()].map(lower)
    return words.every((w) => hay.some((h) => h.includes(w)))
  }
  return groups
    .map((g) => {
      const items = g.items.filter(matches)
      return { ...g, items, count: items.length }
    })
    .filter((g) => g.items.length > 0)
}

/* ---------- glyphs (iconoir's Clock and Filter, 16px) ---------- */

const glyph = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

const ClockGlyph = () => (
  <svg {...glyph}>
    <path d="M12 6L12 12L18 12" />
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
  </svg>
)
const FilterGlyph = () => (
  <svg {...glyph}>
    <path d="M3.99961 3H19.9997C20.552 3 20.9997 3.44764 20.9997 3.99987L20.9999 5.58569C21 5.85097 20.8946 6.10538 20.707 6.29295L14.2925 12.7071C14.105 12.8946 13.9996 13.149 13.9996 13.4142L13.9996 19.7192C13.9996 20.3698 13.3882 20.8472 12.7571 20.6894L10.7571 20.1894C10.3119 20.0781 9.99961 19.6781 9.99961 19.2192L9.99961 13.4142C9.99961 13.149 9.89425 12.8946 9.70672 12.7071L3.2925 6.29289C3.10496 6.10536 2.99961 5.851 2.99961 5.58579V4C2.99961 3.44772 3.44732 3 3.99961 3Z" />
  </svg>
)

/* ---------- the component ---------- */

export interface ScopedSearchProps
  extends Omit<SearchBarProps, 'value' | 'defaultValue' | 'onChange' | 'onSelect' | 'leading' | 'variant' | 'groups' | 'idleText' | 'emptyText' | 'meta' | 'hints'> {
  /** What the query can be narrowed by, typed as `key:value`. */
  scopes: ScopedSearchScope[]
  /** The results, one group per kind of record. Filtered here unless `filter` is off. */
  groups: ScopedSearchGroup[]
  /** Earlier queries as strings (`formatScopedQuery`), newest first; shown before anything is typed. */
  recent?: string[]
  /** The chips and the words, controlled. */
  value?: ScopedSearchQuery
  /** The chips and the words to start with. */
  defaultValue?: ScopedSearchQuery
  /** Every change: a chip added or removed, a word typed. */
  onValueChange?: (query: ScopedSearchQuery) => void
  /** A result picked (Enter or a click): the row, and the query that found it. The list closes. */
  onSelect?: (item: ScopedSearchItem, query: ScopedSearchQuery) => void
  /** Filter `groups` here by the chips and the words. Off when your server does it: then they show as given. */
  filter?: boolean
  /** The results are on their way: a Spinner and "Searching…" under what is shown. */
  loading?: boolean
  /** Shown when nothing matches; gets the query as a string. Defaults to the `noResultsFor` label. */
  emptyText?: (query: string) => React.ReactNode
  /** Key hints and the result count under the list. */
  hints?: boolean
  /** The list, controlled. It opens on focus, typing and ↓, and closes on Escape, a pick or a press outside. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Portal target for the list. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** A press or focus outside the field and the list; `preventDefault()` keeps the list open. */
  onInteractOutside?: (event: Event) => void
}

type Option =
  | { kind: 'recent'; key: string; query: ScopedSearchQuery; text: string }
  | { kind: 'scope'; key: string; scope: ScopedSearchScope }
  | { kind: 'value'; key: string; scope: ScopedSearchScope; value: { value: string; label: string } }
  | { kind: 'result'; key: string; item: ScopedSearchItem }

type Section = { key: string; heading: string; count?: number; options: Option[] }

// The word being typed: the last one, unless a space already follows it.
const currentWord = (text: string) => /(?:^|\s)(\S+)$/.exec(text)?.[1] ?? ''
const replaceWord = (text: string, word: string) => (/\S$/.test(text) ? text.replace(/\S+$/, word) : text + word)

export function ScopedSearch({
  scopes,
  groups,
  recent = [],
  value: valueProp,
  defaultValue,
  onValueChange,
  onSelect,
  filter = true,
  loading = false,
  emptyText,
  hints = true,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  container,
  onInteractOutside,
  onKeyDown,
  onFocus,
  onClick,
  'aria-describedby': describedBy,
  ref: forwarded,
  ...props
}: ScopedSearchProps) {
  const labels = useLabels()
  const input = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(forwarded, () => input.current as HTMLInputElement)
  const anchor = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()

  const [ownQuery, setOwnQuery] = React.useState<ScopedSearchQuery>(defaultValue ?? { tokens: [], text: '' })
  const query = valueProp ?? ownQuery
  const setQuery = (next: ScopedSearchQuery) => {
    if (valueProp == null) setOwnQuery(next)
    onValueChange?.(next)
  }

  const [ownOpen, setOwnOpen] = React.useState(defaultOpen)
  const open = openProp ?? ownOpen
  const setOpen = (next: boolean) => {
    if (next === open) return
    if (openProp == null) setOwnOpen(next)
    onOpenChange?.(next)
  }

  const [active, setActive] = React.useState(0)
  // The highlight shows the focus ring only when the arrows put it there (see menuItemClass).
  const [viaKeys, setViaKeys] = React.useState(false)
  const [message, setMessage] = React.useState('')

  const scopeLabel = (key: string) => scopeOf(scopes, key)?.label ?? key
  const valueLabel = (t: ScopedSearchToken) => valuesOf(scopeOf(scopes, t.key) ?? { key: t.key, label: t.key }).find((v) => v.value === t.value)?.label ?? t.value
  const tokenName = (t: ScopedSearchToken) => labels.scopedSearchToken(scopeLabel(t.key), valueLabel(t))

  /* What the list shows. */
  const idle = query.tokens.length === 0 && !query.text.trim()
  const word = currentWord(query.text)
  const colon = word.indexOf(':')
  const typingScope = colon > 0 ? scopeOf(scopes, word.slice(0, colon)) : undefined

  const sections: Section[] = []
  let results: ScopedSearchGroup[] = []
  // Picking a value after `stage:`: the list is its values only, until one is picked or typed out.
  let picking = false
  if (idle) {
    if (recent.length) {
      sections.push({
        key: 'recent',
        heading: labels.scopedSearchRecent,
        options: recent.map((r) => ({ kind: 'recent', key: `recent:${r}`, query: parseScopedQuery(r, scopes), text: r })),
      })
    }
    if (scopes.length) {
      sections.push({ key: 'scopes', heading: labels.scopedSearchFilters, options: scopes.map((s) => ({ kind: 'scope', key: `scope:${s.key}`, scope: s })) })
    }
  } else {
    if (typingScope?.values) {
      const typed = lower(word.slice(colon + 1).replace(/^"/, ''))
      const values = valuesOf(typingScope).filter(
        (v) => (!typed || lower(v.label).includes(typed) || lower(v.value).includes(typed)) && !query.tokens.some((t) => sameToken(t, { key: typingScope.key, value: v.value })),
      )
      if (values.length) {
        picking = true
        sections.push({
          key: `values:${typingScope.key}`,
          heading: typingScope.label,
          options: values.map((v) => ({ kind: 'value', key: `value:${v.value}`, scope: typingScope, value: v })),
        })
      }
    } else if (word && colon < 0) {
      const w = lower(word)
      const matching = scopes.filter((s) => lower(s.key).startsWith(w) || lower(s.label).startsWith(w))
      if (matching.length) sections.push({ key: 'scopes', heading: labels.scopedSearchFilters, options: matching.map((s) => ({ kind: 'scope', key: `scope:${s.key}`, scope: s })) })
    }
    if (!picking) results = filter ? filterScopedGroups(groups, query, scopes) : groups.filter((g) => g.items.length > 0)
    for (const g of results) {
      sections.push({
        key: `group:${g.id}`,
        heading: g.label,
        count: g.count ?? g.items.length,
        options: g.items.map((item) => ({ kind: 'result', key: `item:${g.id}:${item.id}`, item })),
      })
    }
  }
  const flat = sections.flatMap((s) => s.options)
  const total = results.reduce((n, g) => n + (g.count ?? g.items.length), 0)
  const shown = open && (sections.length > 0 || !idle)
  const current = flat.length ? Math.min(active, flat.length - 1) : -1
  const queryString = formatScopedQuery(query)

  // A new query starts from its first row.
  React.useEffect(() => setActive(0), [queryString])
  // Keep the highlighted row in view as the arrows move it: the list scrolls, never the page
  // (scrollIntoView would, and the list isn't placed yet on its first frame).
  const listRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const list = listRef.current
    const row = list?.querySelector(`[id="${listId}-${current}"]`)
    if (!list || !row || !viaKeys) return
    const r = row.getBoundingClientRect()
    const l = list.getBoundingClientRect()
    if (r.top < l.top) list.scrollTop -= l.top - r.top
    else if (r.bottom > l.bottom) list.scrollTop += r.bottom - l.bottom
  }, [current, viaKeys, listId])
  // The count is read out once typing settles, not on every key.
  const searching = !idle && !picking
  const summary = shown && searching && !loading ? labels.scopedSearchResultCount(total) : ''
  React.useEffect(() => {
    if (!summary) return
    const timer = setTimeout(() => setMessage(summary), 600)
    return () => clearTimeout(timer)
  }, [summary, queryString])

  const addToken = (token: ScopedSearchToken, text: string) => {
    if (query.tokens.some((t) => sameToken(t, token))) return setQuery({ ...query, text })
    setQuery({ tokens: [...query.tokens, token], text })
    setMessage(labels.scopedSearchFilterAdded(tokenName(token)))
  }
  const removeToken = (index: number) => {
    const token = query.tokens[index]
    if (!token) return
    setQuery({ ...query, tokens: query.tokens.filter((_, i) => i !== index) })
    setMessage(labels.scopedSearchFilterRemoved(tokenName(token)))
    input.current?.focus()
  }

  const run = (option: Option | undefined) => {
    if (!option) return
    if (option.kind === 'recent') setQuery(option.query)
    else if (option.kind === 'scope') setQuery({ ...query, text: replaceWord(query.text, `${option.scope.key}:`) })
    else if (option.kind === 'value') addToken({ key: option.scope.key, value: option.value.value }, query.text.replace(/\S+$/, ''))
    else if (!option.item.disabled) {
      option.item.onSelect?.()
      onSelect?.(option.item, query)
      setOpen(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseScopedQuery(e.target.value, scopes, { partial: true })
    const added = parsed.tokens.filter((t) => !query.tokens.some((q) => sameToken(q, t)))
    setQuery({ tokens: [...query.tokens, ...added], text: parsed.text })
    if (added.length) setMessage(added.map((t) => labels.scopedSearchFilterAdded(tokenName(t))).join('. '))
    // Typing opens the list; Escape clearing a closed field doesn't.
    if (e.target.value) setOpen(true)
  }

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setViaKeys(true)
      if (!shown) return setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive(flat.length ? (current + step + flat.length) % flat.length : 0)
    } else if (e.key === 'Enter' && shown && current >= 0) {
      e.preventDefault()
      run(flat[current])
    } else if (e.key === 'Backspace' && query.tokens.length && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
      e.preventDefault()
      removeToken(query.tokens.length - 1)
    }
  }

  let index = -1
  const optionRow = (option: Option) => {
    index += 1
    const i = index
    const disabled = option.kind === 'result' && option.item.disabled
    return (
      <div
        key={option.key}
        id={`${listId}-${i}`}
        role="option"
        aria-selected={i === current}
        aria-disabled={disabled || undefined}
        data-highlighted={i === current ? '' : undefined}
        data-keyboard={i === current && viaKeys ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        onPointerMove={() => {
          setViaKeys(false)
          setActive(i)
        }}
        // Keep focus in the query.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => run(option)}
        className={menuItemClass}
      >
        {option.kind === 'recent' ? (
          <MenuItemContent
            icon={<ClockGlyph />}
            layout="inline"
            label={
              <span className="flex items-center gap-1.5">
                {option.query.tokens.map((t) => (
                  <Badge key={`${t.key}:${t.value}`} size="sm" variant="outline">
                    {tokenName(t)}
                  </Badge>
                ))}
                {option.query.text && <span>{option.query.text}</span>}
              </span>
            }
          />
        ) : option.kind === 'scope' ? (
          <MenuItemContent icon={<FilterGlyph />} layout="inline" label={`${option.scope.key}:`} description={option.scope.label} />
        ) : option.kind === 'value' ? (
          <MenuItemContent icon={<FilterGlyph />} layout="inline" label={option.value.label} />
        ) : (
          <>
            {option.item.media ? (
              <span className="-ms-0.5 flex shrink-0 items-center">{option.item.media}</span>
            ) : option.item.icon ? (
              <span className="grid size-4 shrink-0 place-items-center text-text-muted [&_svg]:size-4 [&_svg]:[stroke-width:1.875]">{option.item.icon}</span>
            ) : null}
            <MenuItemContent layout="inline" label={option.item.label} description={option.item.description} />
            {option.item.meta != null && <span className="ms-auto flex shrink-0 items-center">{option.item.meta}</span>}
          </>
        )}
      </div>
    )
  }

  return (
    <PopoverPrimitive.Root open={shown} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div ref={anchor} data-slot="scoped-search" className="relative w-full">
          <SearchBar
            ref={input}
            {...props}
            role="combobox"
            aria-expanded={shown}
            aria-controls={shown ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={shown && current >= 0 ? `${listId}-${current}` : undefined}
            // The chips describe the query, so the filters are heard without leaving it.
            aria-describedby={[describedBy, query.tokens.length ? `${listId}-filters` : ''].filter(Boolean).join(' ') || undefined}
            autoComplete="off"
            value={query.text}
            onChange={onInputChange}
            onKeyDown={onInputKeyDown}
            onFocus={(e) => {
              onFocus?.(e)
              setOpen(true)
            }}
            onClick={(e) => {
              onClick?.(e)
              setOpen(true)
            }}
            // Always set (an empty list too), so the query never moves and keeps focus as chips come and go.
            leading={query.tokens.map((t, i) => (
              <Chip key={`${t.key}:${t.value}`} size="sm" variant="outline" removeLabel={labels.removeItem(tokenName(t))} onRemove={() => removeToken(i)}>
                {tokenName(t)}
              </Chip>
            ))}
          />
          <span id={`${listId}-filters`} hidden>
            {query.tokens.map(tokenName).join(', ')}
          </span>
          <span role="status" className="sr-only">
            {message}
          </span>
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal container={container}>
        <PopoverPrimitive.Content
          data-slot="scoped-search-panel"
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          aria-label={labels.scopedSearchResults}
          // Focus stays in the query, where it is.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            onInteractOutside?.(e)
            if (anchor.current?.contains(e.target as Node)) e.preventDefault()
          }}
          onEscapeKeyDown={(e) => {
            // Close only: the words stay (SearchBar's own Escape would clear them, and so would a search input's).
            e.preventDefault()
            e.stopPropagation()
            setOpen(false)
          }}
          className={cn(
            'z-50 flex w-(--radix-popover-trigger-width) max-w-[calc(100vw-16px)] min-w-72 flex-col overflow-hidden',
            menuSurfaceClass,
            'origin-(--radix-popover-content-transform-origin) outline-none',
            'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
          )}
        >
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={labels.scopedSearchResults}
            className="flex max-h-[min(400px,var(--radix-popover-content-available-height))] flex-col gap-2 overflow-y-auto p-1 empty:hidden"
          >
            {sections.map((section) => {
              const headingId = `${listId}-${section.key}`
              return (
                // Each group fades in as it appears; the rows inside never move.
                <div key={section.key} role="group" aria-labelledby={headingId} className="flex flex-col animate-[satin-fade-in_var(--duration-base)_var(--ease-out)]">
                  <div id={headingId} className={cn(menuGroupLabelClass, 'gap-1.5')}>
                    {section.count == null ? (
                      section.heading
                    ) : (
                      <>
                        <span aria-hidden>{section.heading}</span>
                        <Badge aria-hidden size="sm" shape="rounded" className="px-1.5 py-0 text-xs leading-4 tabular-nums">
                          {section.count}
                        </Badge>
                        <span className="sr-only">{labels.scopedSearchGroup(section.heading, section.count)}</span>
                      </>
                    )}
                  </div>
                  {section.options.map(optionRow)}
                </div>
              )
            })}
          </div>

          {loading ? (
            <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-text-muted">
              <Spinner size="sm" label={null} />
              {labels.scopedSearchSearching}
            </p>
          ) : (
            searching &&
            results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-text-muted animate-[satin-fade-in_var(--duration-base)_var(--ease-out)]">
                {(emptyText ?? labels.noResultsFor)(queryString)}
              </p>
            )
          )}

          {hints && (
            <div aria-hidden className="flex h-10 shrink-0 items-center gap-4 border-t border-border-subtle px-3">
              <KbdHint keys={[<KbdArrowUp key="up" />, <KbdArrowDown key="down" />]} label={labels.navigate} />
              <KbdHint keys={[<KbdReturn key="return" />]} label={labels.openItem} />
              {query.tokens.length > 0 && <KbdHint keys={['⌫']} label={labels.scopedSearchRemoveFilter} />}
              {searching && !loading && <span className="ms-auto text-xs leading-4 tracking-normal whitespace-nowrap text-text-muted tabular-nums">{labels.scopedSearchResultCount(total)}</span>}
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
