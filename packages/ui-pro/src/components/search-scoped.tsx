'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Clock, Filter, NavArrowDown } from 'iconoir-react'
import { Badge } from '@uisatin/ui/badge'
import { Chip } from '@uisatin/ui/chip'
import { MenuItemContent, menuGroupLabelClass, menuItemClass, menuSurfaceClass } from '@uisatin/ui/dropdown'
import { KbdArrowDown, KbdArrowUp, KbdHint, KbdReturn } from '@uisatin/ui/kbd'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { SearchBar, type SearchBarProps } from '@uisatin/ui/search-bar'
import { Spinner } from '@uisatin/ui/spinner'

/**
 * ScopedSearch: one search box for a product with several kinds of record, where people say
 * where to look. The scope sits in the field as a chip, "Everywhere ▾", "Candidates ▾", "This
 * project ▾": click it (or type `in:`) to pick another, and the results follow. Use it when a
 * search spans kinds or places and a single list of hits would bury the one wanted. A plain
 * SearchBar filters one list; the Command menu runs actions and jumps between pages.
 *
 * - `scopes` are data: a kind of record (`groups: ['candidates']`), a place (`fields: {
 *   project: 'atlas' }`), or both. The first is the default, usually Everywhere. A scope can
 *   bring its own placeholder ("Search candidates…").
 * - `filters` narrow inside the scope: `stage:interview` typed into the query turns into a
 *   "Stage: Interview" chip when a space follows it, or when its value is picked from the list.
 *   With `values`, only those make a chip; without, any word does. Quote values with spaces:
 *   `owner:"Ada Novak"`. Chips of one filter match any of their values; different filters must
 *   all match.
 * - The list: nothing typed shows `recent` searches and what can be typed (`in:`, the
 *   filters); `in:` or the scope chip lists the scopes, each with how many results it holds for
 *   the query; otherwise the `groups` with their counts. A scope that finds nothing offers the
 *   scopes that do.
 *
 * Keys: the arrows move the highlight (no motion), Enter runs it, Backspace at the start of
 * the query removes the last chip (the scope last, back to the default), Escape closes the
 * list (and, closed, clears the words), ⌘K or Ctrl+K focuses the field from anywhere unless
 * `hotkey` is off. Groups fade in as they appear.
 *
 * Results are filtered here (by scope, chips and words) unless `filter` is off: then the app
 * searches on its side with the query from `onValueChange` and passes `groups` as they come.
 * `parseScopedQuery`, `formatScopedQuery` and `filterScopedGroups` read, write and filter a
 * query (for recent searches, a URL, a server).
 *
 * Other props, `ref` included, go to the input; `wrapperClassName` styles the field around it.
 */

/** The words ScopedSearch says on its own. They join SatinLabels, so the app translates them there. */
export const scopedSearchLabels = {
  /** The name of the list of results. */
  scopedSearchResults: 'Search results',
  /** The heading over recent searches. */
  scopedSearchRecent: 'Recent searches',
  /** The heading over the scopes. */
  scopedSearchScopes: 'Search in',
  /** The heading over what can be typed (`in:`, the filters). */
  scopedSearchFilters: 'Filters',
  /** The scope chip's name, and how the field describes its scope: "Search in: Candidates". */
  scopedSearchScope: (scope: string) => `Search in: ${scope}`,
  /** Read out when the scope changes. */
  scopedSearchScopeChanged: (scope: string) => `Searching in ${scope}`,
  /** A filter chip: the filter's label and the value's ("Stage: Interview"). */
  scopedSearchToken: (filter: string, value: string) => `${filter}: ${value}`,
  /** A group's heading for screen readers: "Candidates, 6 results". */
  scopedSearchGroup: (group: string, count: number) => `${group}, ${count === 1 ? '1 result' : `${count} results`}`,
  /** Read out as the results change, shown in the footer and beside each scope. */
  scopedSearchResultCount: (count: number) => (count === 0 ? 'No results' : count === 1 ? '1 result' : `${count} results`),
  /** When a narrow scope finds nothing. */
  scopedSearchNoResultsIn: (query: string, scope: string) => `No results for “${query}” in ${scope}`,
  /** Read out when a filter chip is added. */
  scopedSearchFilterAdded: (filter: string) => `Filter added: ${filter}`,
  /** Read out when a filter chip is removed. */
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

/** Where the search looks: a kind of record, a place, or everything. */
export interface ScopedSearchScope {
  /** Typed after `in:` (`in:candidates`) and kept in the query. */
  value: string
  /** "Everywhere", "Candidates", "This project". */
  label: string
  /** 16px, before the label in the chip and the list. */
  icon?: React.ReactNode
  /** After the label in the list: what it holds. */
  description?: string
  /** The field's placeholder while this scope is on: "Search candidates…". */
  placeholder?: string
  /** The ids of the groups it searches. All of them when left out. */
  groups?: string[]
  /** What a row's `fields` must hold to be in it: `{ project: 'atlas' }`. */
  fields?: Record<string, string>
}

/** A value a filter suggests after `key:`. */
export interface ScopedSearchValue {
  /** What the chip holds and the query string says. */
  value: string
  /** What the list and the chip show. Defaults to `value`. */
  label?: string
}

/** Something to narrow by inside the scope, typed as `key:value`. */
export interface ScopedSearchFilter {
  /** Typed before the colon: `stage` in `stage:interview`. Matched without case. */
  key: string
  /** Shown in the chip and the list: "Stage". */
  label: string
  /** Suggested after `key:`. With them, only these make a chip; without, any value does. */
  values?: (string | ScopedSearchValue)[]
}

/** One filter chip: a filter's `key` and one of its values. */
export interface ScopedSearchToken {
  key: string
  value: string
}

/** What is searched for: where (the scope's `value`; the first scope when left out), the filter chips, then the words. */
export interface ScopedSearchQuery {
  scope?: string
  tokens: ScopedSearchToken[]
  text: string
}

/** What a query is read and filtered against. */
export interface ScopedSearchOptions {
  scopes?: ScopedSearchScope[]
  filters?: ScopedSearchFilter[]
  /** The word before a typed scope: `in` in `in:candidates`. */
  scopeKey?: string
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
  /** What scopes and filters match, by key: `{ stage: 'interview', owner: ['ada', 'jon'] }`. */
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
const unquote = (raw: string) => raw.replace(/^"|"$/g, '').trim()
const quote = (value: string) => (/\s/.test(value) ? `"${value}"` : value)

const valuesOf = (filter: ScopedSearchFilter) =>
  (filter.values ?? []).map((v) => (typeof v === 'string' ? { value: v, label: v } : { value: v.value, label: v.label ?? v.value }))

const filterOf = (filters: ScopedSearchFilter[], key: string) => filters.find((f) => lower(f.key) === lower(key))
const scopeNamed = (scopes: ScopedSearchScope[], raw: string) => {
  const v = lower(unquote(raw))
  return v ? scopes.find((s) => lower(s.value) === v || lower(s.label) === v) : undefined
}

function resolveToken(filters: ScopedSearchFilter[], key: string, raw: string): ScopedSearchToken | null {
  const filter = filterOf(filters, key)
  const value = unquote(raw)
  if (!filter || !value) return null
  if (!filter.values) return { key: filter.key, value }
  const hit = valuesOf(filter).find((v) => lower(v.value) === lower(value) || lower(v.label) === lower(value))
  return hit ? { key: filter.key, value: hit.value } : null
}

const sameToken = (a: ScopedSearchToken, b: ScopedSearchToken) => a.key === b.key && a.value === b.value

// A word `key:value` (the value maybe quoted), on its own between spaces.
const TOKEN = /(^|\s)([^\s:"]+):("[^"]*"|[^\s"]+)(?=\s|$)/g

/**
 * Reads a query string: `in:<scope>` sets the scope, each `key:value` of a known filter
 * becomes a token, the rest stays as text. With `partial` (while typing), a token still needs
 * a space after it, so the word being typed isn't taken early, and the text keeps its trailing
 * space.
 */
export function parseScopedQuery(input: string, { scopes = [], filters = [], scopeKey = 'in' }: ScopedSearchOptions = {}, { partial = false }: { partial?: boolean } = {}): ScopedSearchQuery {
  let scope: string | undefined
  const tokens: ScopedSearchToken[] = []
  const text = input.replace(TOKEN, (match: string, lead: string, key: string, raw: string, offset: number) => {
    if (partial && offset + match.length === input.length) return match
    if (lower(key) === lower(scopeKey)) {
      const found = scopeNamed(scopes, raw)
      if (!found) return match
      scope = found.value
      return lead
    }
    const token = resolveToken(filters, key, raw)
    if (!token) return match
    if (!tokens.some((t) => sameToken(t, token))) tokens.push(token)
    return lead
  })
  const tidy = text.replace(/\s+/g, ' ').replace(/^ /, '')
  return { ...(scope ? { scope } : {}), tokens, text: partial ? tidy : tidy.trim() }
}

/** Writes a query back as a string, `in:candidates stage:interview react`: for recent searches, a URL. */
export function formatScopedQuery({ scope, tokens, text }: ScopedSearchQuery, { scopeKey = 'in' }: Pick<ScopedSearchOptions, 'scopeKey'> = {}) {
  const words = [...(scope ? [`${scopeKey}:${quote(scope)}`] : []), ...tokens.map((t) => `${t.key}:${quote(t.value)}`)]
  return [...words, text.trim()].filter(Boolean).join(' ')
}

const fieldValues = (item: ScopedSearchItem, key: string) => {
  const field = item.fields?.[key]
  return (field == null ? [] : Array.isArray(field) ? field : [field]).map(lower)
}

/**
 * The groups with only the rows that match: the scope (its groups, its fields), every filter
 * chip (one value of each filter is enough), then every word in the label, description,
 * keywords or fields. A `key:value` still in the text counts as a chip; one still being typed
 * (`stage:int`) narrows nothing yet. Empty groups go; each group's `count` becomes its rows.
 */
export function filterScopedGroups(groups: ScopedSearchGroup[], query: ScopedSearchQuery, options: ScopedSearchOptions = {}): ScopedSearchGroup[] {
  const { scopes = [], filters = [], scopeKey = 'in' } = options
  const typed = parseScopedQuery(query.text, options)
  const scope = scopes.find((s) => s.value === (typed.scope ?? query.scope ?? scopes[0]?.value))
  const byKey = new Map<string, string[]>()
  for (const t of [...query.tokens, ...typed.tokens]) byKey.set(t.key, [...(byKey.get(t.key) ?? []), lower(t.value)])
  const words = lower(typed.text)
    .split(/\s+/)
    .filter((w) => {
      if (!w) return false
      const colon = w.indexOf(':')
      return !(colon > 0 && (filterOf(filters, w.slice(0, colon)) || w.slice(0, colon) === lower(scopeKey)))
    })
  const matches = (item: ScopedSearchItem) => {
    for (const [key, value] of Object.entries(scope?.fields ?? {})) if (!fieldValues(item, key).includes(lower(value))) return false
    for (const [key, values] of byKey) {
      const have = fieldValues(item, key)
      if (!values.some((v) => have.includes(v))) return false
    }
    if (!words.length) return true
    const hay = [item.label, item.description ?? '', ...(item.keywords ?? []), ...Object.values(item.fields ?? {}).flat()].map(lower)
    return words.every((w) => hay.some((h) => h.includes(w)))
  }
  return groups
    .filter((g) => !scope?.groups || scope.groups.includes(g.id))
    .map((g) => {
      const items = g.items.filter(matches)
      return { ...g, items, count: items.length }
    })
    .filter((g) => g.items.length > 0)
}

const totalOf = (groups: ScopedSearchGroup[]) => groups.reduce((n, g) => n + (g.count ?? g.items.length), 0)

/* ---------- the component ---------- */

export interface ScopedSearchProps
  extends Omit<SearchBarProps, 'value' | 'defaultValue' | 'onChange' | 'onSelect' | 'leading' | 'variant' | 'groups' | 'idleText' | 'emptyText' | 'meta' | 'hints'> {
  /** Where the search can look; the first is the default. Shown as a chip in the field. Without, it searches everything. */
  scopes?: ScopedSearchScope[]
  /** What narrows the search inside the scope, typed as `key:value`. */
  filters?: ScopedSearchFilter[]
  /** The results, one group per kind of record. Filtered here unless `filter` is off. */
  groups: ScopedSearchGroup[]
  /** Earlier queries as strings (`formatScopedQuery`), newest first; shown before anything is typed. */
  recent?: string[]
  /** The scope, the chips and the words, controlled. */
  value?: ScopedSearchQuery
  /** The scope, the chips and the words to start with. */
  defaultValue?: ScopedSearchQuery
  /** Every change: a scope picked, a chip added or removed, a word typed. */
  onValueChange?: (query: ScopedSearchQuery) => void
  /** A result picked (Enter or a click): the row, and the query that found it. The list closes. */
  onSelect?: (item: ScopedSearchItem, query: ScopedSearchQuery) => void
  /** The word before a typed scope: `in` in `in:candidates`. */
  scopeKey?: string
  /** Filter `groups` here by scope, chips and words. Off when your server does it: then they show as given. */
  filter?: boolean
  /** The results are on their way: a Spinner and "Searching…" under what is shown. */
  loading?: boolean
  /** Shown when nothing matches; gets the query as a string. Defaults to the `noResultsFor` label (`scopedSearchNoResultsIn` in a narrow scope). */
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
  | { kind: 'recent'; key: string; query: ScopedSearchQuery }
  | { kind: 'key'; key: string; word: string; label: string }
  | { kind: 'scope'; key: string; scope: ScopedSearchScope; count?: number; typed: boolean }
  | { kind: 'value'; key: string; filter: ScopedSearchFilter; value: { value: string; label: string } }
  | { kind: 'result'; key: string; item: ScopedSearchItem }

type Section = { key: string; heading: string; count?: number; options: Option[] }

// The word being typed: the last one, unless a space already follows it.
const currentWord = (text: string) => /(?:^|\s)(\S+)$/.exec(text)?.[1] ?? ''
const replaceWord = (text: string, word: string) => (/\S$/.test(text) ? text.replace(/\S+$/, word) : text + word)
const dropWord = (text: string) => text.replace(/\S+$/, '')

export function ScopedSearch({
  scopes = [],
  filters = [],
  groups,
  recent = [],
  value: valueProp,
  defaultValue,
  onValueChange,
  onSelect,
  scopeKey = 'in',
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
  placeholder,
  'aria-describedby': describedBy,
  ref: forwarded,
  ...props
}: ScopedSearchProps) {
  const labels = useLabels()
  const input = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(forwarded, () => input.current as HTMLInputElement)
  const anchor = React.useRef<HTMLDivElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()
  const options: ScopedSearchOptions = { scopes, filters, scopeKey }

  const [ownQuery, setOwnQuery] = React.useState<ScopedSearchQuery>(defaultValue ?? { tokens: [], text: '' })
  const query = valueProp ?? ownQuery
  const setQuery = (next: ScopedSearchQuery) => {
    if (valueProp == null) setOwnQuery(next)
    onValueChange?.(next)
  }

  const [ownOpen, setOwnOpen] = React.useState(defaultOpen)
  const open = openProp ?? ownOpen
  const setOpen = (next: boolean) => {
    if (!next) setChoosing(false)
    if (next === open) return
    if (openProp == null) setOwnOpen(next)
    onOpenChange?.(next)
  }

  // The scope chip was pressed: the list shows the scopes until one is picked.
  const [choosing, setChoosing] = React.useState(false)
  const [active, setActive] = React.useState(0)
  // The highlight shows the focus ring only when the arrows put it there (see menuItemClass).
  const [viaKeys, setViaKeys] = React.useState(false)
  const [message, setMessage] = React.useState('')

  const defaultScope = scopes[0]
  const scope = scopes.find((s) => s.value === query.scope) ?? defaultScope
  const narrowed = !!scope && scope !== defaultScope
  const filterLabel = (key: string) => filterOf(filters, key)?.label ?? key
  const valueLabel = (t: ScopedSearchToken) => valuesOf(filterOf(filters, t.key) ?? { key: t.key, label: t.key }).find((v) => v.value === t.value)?.label ?? t.value
  const tokenName = (t: ScopedSearchToken) => labels.scopedSearchToken(filterLabel(t.key), valueLabel(t))
  const filtered = (q: ScopedSearchQuery) => (filter ? filterScopedGroups(groups, q, options) : groups.filter((g) => g.items.length > 0))
  const countIn = (s: ScopedSearchScope) => (filter ? totalOf(filterScopedGroups(groups, { ...query, scope: s.value }, options)) : undefined)

  /* What the list shows. */
  const idle = query.tokens.length === 0 && !query.text.trim()
  const word = currentWord(query.text)
  const colon = word.indexOf(':')
  const typedKey = colon > 0 ? word.slice(0, colon) : ''
  const typedValue = lower(unquote(word.slice(colon + 1)))
  const typingScope = colon > 0 && scopes.length > 0 && lower(typedKey) === lower(scopeKey)
  const typingFilter = colon > 0 ? filterOf(filters, typedKey) : undefined
  const scopeOption = (s: ScopedSearchScope, typed: boolean, withCount: boolean): Option => ({ kind: 'scope', key: `scope:${s.value}`, scope: s, typed, count: withCount ? countIn(s) : undefined })
  const keyOptions = (prefix: string): Option[] => [
    ...(scopes.length && lower(scopeKey).startsWith(prefix) ? [{ kind: 'key' as const, key: `key:${scopeKey}`, word: `${scopeKey}:`, label: labels.scopedSearchScopes }] : []),
    ...filters.filter((f) => lower(f.key).startsWith(prefix) || lower(f.label).startsWith(prefix)).map((f) => ({ kind: 'key' as const, key: `key:${f.key}`, word: `${f.key}:`, label: f.label })),
  ]

  const sections: Section[] = []
  let results: ScopedSearchGroup[] = []
  // Picking a scope or a value: the list is those only, until one is picked or typed out.
  let picking = false
  if (choosing) {
    picking = true
    sections.push({ key: 'scopes', heading: labels.scopedSearchScopes, options: scopes.map((s) => scopeOption(s, false, !idle)) })
  } else if (idle) {
    if (recent.length) {
      sections.push({ key: 'recent', heading: labels.scopedSearchRecent, options: recent.map((r) => ({ kind: 'recent', key: `recent:${r}`, query: parseScopedQuery(r, options) })) })
    }
    const keys = keyOptions('')
    if (keys.length) sections.push({ key: 'keys', heading: labels.scopedSearchFilters, options: keys })
  } else {
    if (typingScope) {
      const matching = scopes.filter((s) => !typedValue || lower(s.value).startsWith(typedValue) || lower(s.label).includes(typedValue))
      if (matching.length) {
        picking = true
        sections.push({ key: 'scopes', heading: labels.scopedSearchScopes, options: matching.map((s) => scopeOption(s, true, false)) })
      }
    } else if (typingFilter?.values) {
      const values = valuesOf(typingFilter).filter(
        (v) => (!typedValue || lower(v.label).includes(typedValue) || lower(v.value).includes(typedValue)) && !query.tokens.some((t) => sameToken(t, { key: typingFilter.key, value: v.value })),
      )
      if (values.length) {
        picking = true
        sections.push({ key: `values:${typingFilter.key}`, heading: typingFilter.label, options: values.map((v) => ({ kind: 'value', key: `value:${v.value}`, filter: typingFilter, value: v })) })
      }
    } else if (word && colon < 0) {
      const keys = keyOptions(lower(word))
      if (keys.length) sections.push({ key: 'keys', heading: labels.scopedSearchFilters, options: keys })
    }
    if (!picking) {
      results = filtered(query)
      for (const g of results) {
        sections.push({
          key: `group:${g.id}`,
          heading: g.label,
          count: g.count ?? g.items.length,
          options: g.items.map((item) => ({ kind: 'result', key: `item:${g.id}:${item.id}`, item })),
        })
      }
      // A narrow scope that finds nothing points at the scopes that do.
      if (!results.length && narrowed && !loading) {
        const elsewhere = scopes.filter((s) => s !== scope).map((s) => scopeOption(s, false, true)).filter((o) => o.kind === 'scope' && (o.count == null ? o.scope === defaultScope : o.count > 0))
        if (elsewhere.length) sections.push({ key: 'elsewhere', heading: labels.scopedSearchScopes, options: elsewhere })
      }
    }
  }
  const flat = sections.flatMap((s) => s.options)
  const total = totalOf(results)
  const shown = open && (sections.length > 0 || !idle)
  const current = flat.length ? Math.min(active, flat.length - 1) : -1
  const queryString = formatScopedQuery({ ...query, scope: undefined })
  const searching = !idle && !picking

  // A new query, or the scope list opening, starts from its first row (the current scope there).
  React.useEffect(() => {
    setActive(choosing ? Math.max(0, scopes.indexOf(scope!)) : 0)
  }, [queryString, query.scope, choosing])
  // Keep the highlighted row in view as the arrows move it: the list scrolls, never the page
  // (scrollIntoView would, and the list isn't placed yet on its first frame).
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
  const summary = shown && searching && !loading ? labels.scopedSearchResultCount(total) : ''
  React.useEffect(() => {
    if (!summary) return
    const timer = setTimeout(() => setMessage(summary), 600)
    return () => clearTimeout(timer)
  }, [summary, queryString, query.scope])

  const pickScope = (next: ScopedSearchScope, text = query.text) => {
    setChoosing(false)
    setQuery({ ...query, scope: next.value, text })
    if (next !== scope) setMessage(labels.scopedSearchScopeChanged(next.label))
  }
  const addToken = (token: ScopedSearchToken, text: string) => {
    if (query.tokens.some((t) => sameToken(t, token))) return setQuery({ ...query, text })
    setQuery({ ...query, tokens: [...query.tokens, token], text })
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
    else if (option.kind === 'key') setQuery({ ...query, text: replaceWord(query.text, option.word) })
    else if (option.kind === 'scope') pickScope(option.scope, option.typed ? dropWord(query.text) : query.text)
    else if (option.kind === 'value') addToken({ key: option.filter.key, value: option.value.value }, dropWord(query.text))
    else if (!option.item.disabled) {
      option.item.onSelect?.()
      onSelect?.(option.item, query)
      setOpen(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseScopedQuery(e.target.value, options, { partial: true })
    const added = parsed.tokens.filter((t) => !query.tokens.some((q) => sameToken(q, t)))
    const typedScope = parsed.scope ? scopes.find((s) => s.value === parsed.scope) : undefined
    setChoosing(false)
    setQuery({ ...query, ...(typedScope ? { scope: typedScope.value } : {}), tokens: [...query.tokens, ...added], text: parsed.text })
    const said = [
      ...(typedScope && typedScope !== scope ? [labels.scopedSearchScopeChanged(typedScope.label)] : []),
      ...added.map((t) => labels.scopedSearchFilterAdded(tokenName(t))),
    ]
    if (said.length) setMessage(said.join('. '))
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
    } else if (e.key === 'Backspace' && e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
      // The filter chips go first, then the scope, back to the default.
      if (query.tokens.length) {
        e.preventDefault()
        removeToken(query.tokens.length - 1)
      } else if (narrowed && defaultScope) {
        e.preventDefault()
        pickScope(defaultScope)
      }
    }
  }

  const toggleScopes = () => {
    setChoosing(!(choosing && shown))
    setOpen(true)
    input.current?.focus()
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
            icon={<Clock />}
            layout="inline"
            label={
              <span className="flex items-center gap-1.5">
                {option.query.scope && (
                  <Badge size="sm">{scopes.find((s) => s.value === option.query.scope)?.label ?? option.query.scope}</Badge>
                )}
                {option.query.tokens.map((t) => (
                  <Badge key={`${t.key}:${t.value}`} size="sm" variant="outline">
                    {tokenName(t)}
                  </Badge>
                ))}
                {option.query.text && <span>{option.query.text}</span>}
              </span>
            }
          />
        ) : option.kind === 'key' ? (
          <MenuItemContent icon={<Filter />} layout="inline" label={option.word} description={option.label} />
        ) : option.kind === 'scope' ? (
          <>
            <MenuItemContent icon={option.scope.icon} layout="inline" label={option.scope.label} description={option.scope.description} />
            {option.count != null && (
              <span className="ms-auto shrink-0 text-sm text-text-muted tabular-nums">
                <span aria-hidden>{option.count}</span>
                <span className="sr-only">{labels.scopedSearchResultCount(option.count)}</span>
              </span>
            )}
            {option.scope === scope && (
              <>
                <span className="sr-only">({labels.selected})</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={cn('shrink-0 text-status-green-fg', option.count == null && 'ms-auto')}>
                  <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </>
        ) : option.kind === 'value' ? (
          <MenuItemContent icon={<Filter />} layout="inline" label={option.value.label} />
        ) : (
          <>
            {option.item.media ? (
              // The group header reads these slots to line up with the labels (see its class).
              <span data-slot="scoped-search-media" className="-ms-0.5 flex shrink-0 items-center">
                {option.item.media}
              </span>
            ) : option.item.icon ? (
              <span data-slot="menu-item-icon" className="grid size-4 shrink-0 place-items-center text-text-muted [&_svg]:size-4 [&_svg]:[stroke-width:1.875]">
                {option.item.icon}
              </span>
            ) : null}
            <MenuItemContent layout="inline" label={option.item.label} description={option.item.description} />
            {option.item.meta != null && <span className="ms-auto flex shrink-0 items-center">{option.item.meta}</span>}
          </>
        )}
      </div>
    )
  }

  const described = [scope ? labels.scopedSearchScope(scope.label) : '', ...query.tokens.map(tokenName)].filter(Boolean).join(', ')

  return (
    <PopoverPrimitive.Root open={shown} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div ref={anchor} data-slot="scoped-search" className="relative w-full">
          <SearchBar
            ref={input}
            {...props}
            placeholder={placeholder ?? scope?.placeholder}
            role="combobox"
            aria-expanded={shown}
            aria-controls={shown ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={shown && current >= 0 ? `${listId}-${current}` : undefined}
            // The scope and the chips describe the query, so they are heard without leaving it.
            aria-describedby={[describedBy, described ? `${listId}-query` : ''].filter(Boolean).join(' ') || undefined}
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
              setChoosing(false)
              setOpen(true)
            }}
            // Always set (an empty list too), so the query never moves and keeps focus as chips come and go.
            leading={[
              scope && (
                <Chip
                  key="scope"
                  size="sm"
                  aria-label={labels.scopedSearchScope(scope.label)}
                  aria-haspopup="listbox"
                  aria-expanded={choosing && shown}
                  aria-controls={choosing && shown ? listId : undefined}
                  // Focus stays in the query, which then lists the scopes.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleScopes}
                  className="[&_[data-slot=chip-label]]:gap-1 [&_[data-slot=chip-label]]:pe-1.5"
                >
                  {scope.icon && <span className="grid size-3.5 place-items-center text-text-muted [&_svg]:size-3.5 [&_svg]:[stroke-width:1.875]">{scope.icon}</span>}
                  {scope.label}
                  <NavArrowDown aria-hidden className="size-3.5 text-text-muted [stroke-width:1.875]" />
                </Chip>
              ),
              ...query.tokens.map((t, i) => (
                <Chip key={`${t.key}:${t.value}`} size="sm" variant="outline" removeLabel={labels.removeItem(tokenName(t))} onRemove={() => removeToken(i)}>
                  {tokenName(t)}
                </Chip>
              )),
            ]}
          />
          <span id={`${listId}-query`} hidden>
            {described}
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
          {/* Nothing found says so first; a narrow scope then offers the scopes that hold results. */}
          {searching && !loading && results.length === 0 && (
            <p className={cn('px-3 text-center text-sm text-text-muted animate-[satin-fade-in_var(--duration-base)_var(--ease-out)]', sections.length ? 'pt-6 pb-2' : 'py-8')}>
              {emptyText ? emptyText(queryString) : narrowed && scope ? labels.scopedSearchNoResultsIn(queryString, scope.label) : labels.noResultsFor(queryString)}
            </p>
          )}
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
                  {/* Past a 20px Avatar pulled 2px out (12 - 2 + 20 + 8); past an icon, the shared header's own inset. */}
                  <div id={headingId} className={cn(menuGroupLabelClass, 'gap-1.5 [&:has(~*_[data-slot=scoped-search-media])]:ps-9.5')}>
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

          {loading && (
            <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-text-muted">
              <Spinner size="sm" label={null} />
              {labels.scopedSearchSearching}
            </p>
          )}

          {hints && (
            <div aria-hidden className="flex h-10 shrink-0 items-center gap-4 border-t border-border-subtle px-3">
              <KbdHint keys={[<KbdArrowUp key="up" />, <KbdArrowDown key="down" />]} label={labels.navigate} />
              <KbdHint keys={[<KbdReturn key="return" />]} label={labels.openItem} />
              {query.tokens.length > 0 && <KbdHint keys={['⌫']} label={labels.scopedSearchRemoveFilter} />}
              {searching && !loading && (
                <span className="ms-auto text-xs leading-4 tracking-normal whitespace-nowrap text-text-muted tabular-nums">{labels.scopedSearchResultCount(total)}</span>
              )}
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
