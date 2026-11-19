'use client'

import * as React from 'react'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Chip, ChipAvatar } from '@uisatin/ui/chip'
import { Combobox, type ComboboxProps } from '@uisatin/ui/combobox'
import { MenuItemContent } from '@uisatin/ui/dropdown'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import type { SelectGroup, SelectOption } from '@uisatin/ui/select'

/**
 * PeoplePicker: Combobox for people. Each row is a 20px avatar, the name and, muted after it, the
 * role (or the email), read as one phrase: "Marta Nowak, Hiring manager". Picks show as chips
 * with a 16px avatar; one pick fills the field with its avatar and name.
 *
 * - Where the people come from: `people` (one list) or `groups` (titled sections, e.g. teams),
 *   filtered as you type with no delay; or `search(query, { signal })`, which the picker calls
 *   `searchDelay` ms (150) after the last keystroke, and at once with '' when the list opens. A
 *   newer query aborts the older request (`signal`) and its late answer is dropped.
 * - While a search runs, the last results stay, narrowed by the new query at once, so the list
 *   never blanks between keystrokes; with nothing left to show it says "Searching…", never "No
 *   one matches". An answer later than 300 ms swaps the search icon for a Spinner and marks the
 *   list `aria-busy`; quicker ones show none. A rejected search says so in place of the list.
 * - `recent` comes first, under "Recent", while the query is empty; the same people aren't listed
 *   again below. Typing filters `people` and `groups` by name, role and email, ignoring case and
 *   accents ("wisn" finds Wiśniewska).
 * - `maxChips` folds the chips after that many into a "+N" chip; pressing it shows them all.
 * - A `disabled` person is listed but can't be picked; say why in `role` ("On leave").
 * - Removing a chip moves focus to the chip that takes its place, or to the field.
 *
 * `value` holds the picked people themselves, not their ids, so chips keep their names and faces
 * whatever the search shows. Every other Combobox prop (label, hint, error, `footer`, size, open
 * state) works as it does there. Other props, `ref` included, go to the trigger button that
 * covers the field; `wrapperClassName` styles the picker's outer element.
 */

/** The words the People picker says on its own. They join SatinLabels, so the app translates them there. */
export const peoplePickerLabels = {
  /** The group of people picked lately, first while the query is empty. */
  recentPeople: 'Recent',
  /** The group under Recent, with everyone else. */
  allPeople: 'People',
  /** The field's placeholder with `multiple`. */
  addPeople: 'Add people',
  /** The field's placeholder for one person. */
  choosePerson: 'Choose a person',
  /** The search field's placeholder and name. */
  searchPeople: 'Search people…',
  /** Shown while a search runs and nothing is listed yet. */
  searchingPeople: 'Searching…',
  /** Shown when no one matches; `query` is what was typed (may be ''). */
  noPeopleFound: (query: string) => (query ? `No one matches “${query}”` : 'No people to show'),
  /** Shown when `search` fails. */
  peopleSearchFailed: 'Couldn’t search. Type again to retry.',
}

type PeoplePickerLabels = typeof peoplePickerLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends PeoplePickerLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...peoplePickerLabels, ...labels }), [labels])
}

export interface Person {
  /** Unique among everyone the picker may list. */
  id: string
  name: string
  /** Shown after the name and read with it: "Marta Nowak, Hiring manager". */
  role?: string
  /** Searched, and shown in place of the role when there is none. */
  email?: string
  /** An image URL. Without one, or if it fails to load, the avatar shows the name's initials. */
  avatar?: string
  /** The initials avatar's tone. Defaults to one chosen from the id, so a person always gets the same. */
  tone?: AvatarTone
  /** Listed but can't be picked. Say why in `role`. */
  disabled?: boolean
}

export interface PeopleGroup {
  /** The group's header, which also names it for screen readers. */
  label: string
  people: Person[]
}

export interface PeopleSearchOptions {
  /** Aborted when a newer query, or closing the list, makes this request stale. */
  signal: AbortSignal
}

export interface PeoplePickerProps
  extends Omit<
    ComboboxProps,
    | 'options'
    | 'value'
    | 'defaultValue'
    | 'onValueChange'
    | 'filter'
    | 'onQueryChange'
    | 'loading'
    | 'loadingText'
    | 'selectedOptions'
    | 'renderOption'
    | 'renderValue'
  > {
  /** Everyone who can be picked, in one list. */
  people?: Person[]
  /** Everyone who can be picked, in titled groups (teams, offices) instead of one list. */
  groups?: PeopleGroup[]
  /**
   * Searches on the app's side, in place of `people` and `groups`. Resolve to people, or to titled
   * groups of them.
   */
  search?: (query: string, options: PeopleSearchOptions) => Promise<Person[] | PeopleGroup[]>
  /** Milliseconds without typing before `search` runs. */
  searchDelay?: number
  /** People picked lately: listed first, under "Recent", while the query is empty. */
  recent?: Person[]
  /** The picked people. */
  value?: Person[]
  defaultValue?: Person[]
  onValueChange?: (people: Person[]) => void
  /** With `multiple`: chips shown before the rest fold into a "+N" chip. All of them by default. */
  maxChips?: number
}

/* ---------- people ---------- */

/** Initials avatars rotate through the hues; red is left out, so no one reads as an error. */
const TONES: AvatarTone[] = ['sky', 'green', 'amber', 'fuchsia', 'plum', 'brand']

const toneOf = (person: Person): AvatarTone => {
  if (person.tone) return person.tone
  let hash = 0
  for (const ch of person.id) hash = (hash * 31 + ch.codePointAt(0)!) | 0
  return TONES[Math.abs(hash) % TONES.length]
}

/** "Marta Nowak" → "MN", "Ada" → "A": the first letters of the first and last words. */
export const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = Array.from(words[0] ?? '')[0] ?? ''
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** Lower case without accents, so "wisn" finds "Wiśniewska" and "lukasz" finds "Łukasz". */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/ł/g, 'l')

const matchesPerson = (person: Person, query: string) => {
  const q = fold(query.trim())
  return !q || [person.name, person.role, person.email].some((field) => field != null && fold(field).includes(q))
}

const isGroups = (list: Person[] | PeopleGroup[]): list is PeopleGroup[] => list.length > 0 && 'people' in list[0]

type Section = { label?: string; people: Person[] }
const sectionsOf = (list?: Person[] | PeopleGroup[]): Section[] =>
  !list?.length ? [] : isGroups(list) ? list.map((g) => ({ label: g.label, people: g.people })) : [{ people: list }]

/** A face at 16 (chips, the field) or 20 (rows). Decorative: the name is always next to it. */
function PersonAvatar({ person, size }: { person: Person; size: 16 | 20 }) {
  const [broken, setBroken] = React.useState<string>()
  if (person.avatar && broken !== person.avatar) {
    return (
      <img
        src={person.avatar}
        alt=""
        onError={() => setBroken(person.avatar)}
        className={cn('shrink-0 rounded-full object-cover', size === 16 ? 'size-4' : 'size-5')}
      />
    )
  }
  const initials = initialsOf(person.name)
  return size === 16 ? (
    <ChipAvatar initials={initials} tone={toneOf(person)} />
  ) : (
    <Avatar aria-hidden initials={initials} tone={toneOf(person)} size={20} />
  )
}

const toOption = (person: Person): SelectOption => ({
  value: person.id,
  label: person.name,
  description: person.role ?? person.email,
  disabled: person.disabled,
  // The field's leading icon when one person is picked.
  icon: <PersonAvatar person={person} size={16} />,
})

/* ---------- the picker ---------- */

/** A search answering sooner than this shows no Spinner, so quick results don't flash one. */
const SPINNER_DELAY = 300

export function PeoplePicker({
  people,
  groups,
  search,
  searchDelay = 150,
  recent,
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  maxChips,
  placeholder,
  searchPlaceholder,
  emptyText,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  wrapperClassName,
  ...props
}: PeoplePickerProps) {
  const labels = useLabels()

  const [uncontrolled, setUncontrolled] = React.useState<Person[]>(defaultValue ?? [])
  const picked = value ?? uncontrolled
  const commit = (next: Person[]) => {
    if (value == null) setUncontrolled(next)
    onValueChange?.(next)
  }

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (openProp == null) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  /* Search: debounced, the stale request aborted, its late answer dropped. */
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<Person[] | PeopleGroup[]>()
  // The query `results` answer; while it isn't the typed one, they're narrowed on the spot.
  const [answered, setAnswered] = React.useState<string>()
  // A search for the typed query hasn't answered yet / hasn't for SPINNER_DELAY.
  const [pending, setPending] = React.useState(false)
  const [slow, setSlow] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const searchRef = React.useRef(search)
  React.useEffect(() => {
    searchRef.current = search
  })
  const searching = search != null

  React.useEffect(() => {
    if (!searching || !open) {
      setPending(false)
      setSlow(false)
      return
    }
    const controller = new AbortController()
    // Pending from the keystroke, so an empty list reads "Searching…", not "No one matches".
    setPending(true)
    // The Spinner only once the answer is late: quick searches don't flash it.
    const spinner = setTimeout(() => setSlow(true), SPINNER_DELAY)
    const settle = (found: Person[] | PeopleGroup[], error: boolean) => {
      if (controller.signal.aborted) return
      clearTimeout(spinner)
      setResults(found)
      setAnswered(query)
      setFailed(error)
      setPending(false)
      setSlow(false)
    }
    const timer = setTimeout(
      () => {
        searchRef.current?.(query, { signal: controller.signal }).then(
          (found) => settle(found, false),
          () => settle([], true),
        )
      },
      query ? searchDelay : 0,
    )
    return () => {
      clearTimeout(timer)
      clearTimeout(spinner)
      controller.abort()
    }
  }, [searching, open, query, searchDelay])

  /* The list: Recent while the query is empty, then the rest, each person once. */
  const base = searching ? sectionsOf(results) : sectionsOf(groups ?? people)
  // A local list filters as you type; search results are the app's answer, except while the
  // answer to this query is on its way: then the last ones, narrowed by it, stand in.
  const narrow = !searching || answered !== query
  const filtered = narrow ? base.map((s) => ({ ...s, people: s.people.filter((p) => matchesPerson(p, query)) })) : base
  const showRecent = !query.trim() && recent != null && recent.length > 0
  const seen = new Set<string>()
  const once = (list: Person[]) => list.filter((p) => !seen.has(p.id) && seen.add(p.id))
  const sections: Section[] = [
    ...(showRecent ? [{ label: labels.recentPeople, people: once(recent) }] : []),
    ...filtered.map((s) => ({ ...s, people: once(s.people) })),
  ].filter((s) => s.people.length > 0)
  const listed = sections.flatMap((s) => s.people)
  const options: SelectGroup[] = sections.map((s) => ({
    // A list under Recent gets a header too, so the two read as two groups.
    label: s.label ?? (sections.length > 1 ? labels.allPeople : undefined),
    options: s.people.map(toOption),
  }))

  const byId = new Map<string, Person>()
  for (const p of [...listed, ...picked]) byId.set(p.id, p)

  /* Chips: folded after maxChips; focus follows a removal or the reveal. */
  const [expanded, setExpanded] = React.useState(false)
  const overflowing = multiple && maxChips != null && picked.length > maxChips
  if (!overflowing && expanded) setExpanded(false)
  const folded = overflowing && !expanded

  const rootRef = React.useRef<HTMLDivElement>(null)
  const focusChip = React.useRef<number | null>(null)
  React.useEffect(() => {
    const i = focusChip.current
    if (i == null) return
    focusChip.current = null
    const root = rootRef.current
    const removes = root?.querySelectorAll<HTMLElement>('[data-slot="chip-remove"]') ?? []
    const target = removes[Math.min(i, removes.length - 1)] ?? root?.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')
    target?.focus()
  })

  const removePerson = (id: string, index: number) => {
    focusChip.current = index
    commit(picked.filter((p) => p.id !== id))
  }

  return (
    <div ref={rootRef} data-slot="people-picker" className={wrapperClassName}>
      <Combobox
        {...props}
        multiple={multiple}
        open={open}
        onOpenChange={setOpen}
        options={options}
        filter={false}
        onQueryChange={setQuery}
        loading={slow}
        loadingText={labels.searchingPeople}
        emptyText={pending ? labels.searchingPeople : failed ? labels.peopleSearchFailed : (emptyText ?? labels.noPeopleFound(query.trim()))}
        placeholder={placeholder ?? (multiple ? labels.addPeople : labels.choosePerson)}
        searchPlaceholder={searchPlaceholder ?? labels.searchPeople}
        value={picked.map((p) => p.id)}
        selectedOptions={picked.map(toOption)}
        onValueChange={(ids) => commit(ids.map((id) => byId.get(id)).filter((p): p is Person => p != null))}
        renderOption={(option, { selected }) => {
          const person = byId.get(option.value)!
          const detail = person.role ?? person.email
          return (
            <MenuItemContent
              icon={<PersonAvatar person={person} size={20} />}
              iconSize={20}
              layout="inline"
              label={person.name}
              // The comma is for screen readers: "Marta Nowak, Hiring manager".
              description={
                detail ? (
                  <>
                    <span className="sr-only">, </span>
                    {detail}
                  </>
                ) : undefined
              }
              selected={selected}
            />
          )
        }}
        renderValue={
          multiple
            ? (chosen, { disabled }) => {
                const all = chosen.map((o) => byId.get(o.value)).filter((p): p is Person => p != null)
                const chips = folded ? all.slice(0, maxChips) : all
                const hidden = all.length - chips.length
                return (
                  <>
                    {chips.map((person, i) => (
                      <Chip
                        key={person.id}
                        size="sm"
                        variant="outline"
                        avatar={<PersonAvatar person={person} size={16} />}
                        disabled={disabled}
                        removeLabel={labels.removeItem(person.name)}
                        onRemove={() => removePerson(person.id, i)}
                        className="relative"
                      >
                        {person.name}
                      </Chip>
                    ))}
                    {hidden > 0 && (
                      <Chip
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        aria-label={labels.showMore(hidden)}
                        onClick={() => {
                          focusChip.current = chips.length
                          setExpanded(true)
                        }}
                        className="relative"
                      >
                        +{hidden}
                      </Chip>
                    )}
                  </>
                )
              }
            : undefined
        }
      />
    </div>
  )
}
