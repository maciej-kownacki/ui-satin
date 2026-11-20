/* Type test, never run: ScopedSearch's props, controlled and uncontrolled, its helpers, ref, and its words in SatinLabels. */
import * as React from 'react'
import { Folder, Globe } from 'iconoir-react'
import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  ScopedSearch,
  filterScopedGroups,
  formatScopedQuery,
  parseScopedQuery,
  scopedSearchLabels,
  type ScopedSearchFilter,
  type ScopedSearchGroup,
  type ScopedSearchItem,
  type ScopedSearchQuery,
  type ScopedSearchScope,
} from '../components/search-scoped'

// Scopes are data: a kind of record, a place, or everything.
const scopes: ScopedSearchScope[] = [
  { value: 'all', label: 'Everywhere', icon: <Globe /> },
  { value: 'candidates', label: 'Candidates', groups: ['candidates'], placeholder: 'Search candidates…', description: 'People who applied' },
  { value: 'atlas', label: 'This project', icon: <Folder />, fields: { project: 'atlas' } },
]
const filters: ScopedSearchFilter[] = [
  { key: 'stage', label: 'Stage', values: ['screening', { value: 'interview', label: 'Interview' }] },
  { key: 'owner', label: 'Owner' },
]

const item: ScopedSearchItem = {
  id: 'ada',
  label: 'Ada Novak',
  description: 'Frontend engineer',
  media: <Avatar size={20} initials="AN" />,
  meta: <Badge size="sm">Interview</Badge>,
  fields: { stage: 'interview', owner: ['tara', 'jon'], project: 'atlas' },
  keywords: ['React'],
  onSelect: () => {},
}
const groups: ScopedSearchGroup[] = [{ id: 'candidates', label: 'Candidates', items: [item], count: 6 }]

// @ts-expect-error: a field is a string or a list of strings
const badField: ScopedSearchItem = { id: 'x', label: 'x', fields: { stage: 3 } }
// @ts-expect-error: a scope needs a value
const badScope: ScopedSearchScope = { label: 'Everywhere' }
// @ts-expect-error: a scope's fields hold one value each
const badScopeFields: ScopedSearchScope = { value: 'x', label: 'x', fields: { owner: ['a', 'b'] } }

const inputRef = React.createRef<HTMLInputElement>()

export const uncontrolled = (
  <ScopedSearch
    ref={inputRef}
    scopes={scopes}
    filters={filters}
    groups={groups}
    recent={['in:candidates stage:interview react']}
    defaultValue={parseScopedQuery('in:candidates stage:interview react', { scopes, filters })}
    defaultOpen
    onSelect={(picked, query) => console.log(picked.id, query.scope, formatScopedQuery(query))}
    placeholder="Search candidates, jobs, notes…"
    aria-label="Search the ATS"
    wrapperClassName="w-full"
    shortcut
    hotkey={false}
    onInteractOutside={(e) => e.preventDefault()}
  />
)

// Without scopes or filters it is a grouped search; `w:` instead of `in:`.
export const plain = <ScopedSearch groups={groups} scopeKey="w" />

function Controlled() {
  const [value, setValue] = React.useState<ScopedSearchQuery>({ scope: 'atlas', tokens: [], text: '' })
  const [open, setOpen] = React.useState(false)
  return (
    <ScopedSearch
      scopes={scopes}
      filters={filters}
      groups={filterScopedGroups(groups, value, { scopes, filters })}
      filter={false}
      loading={false}
      value={value}
      onValueChange={setValue}
      open={open}
      onOpenChange={setOpen}
      emptyText={(q) => <>Nothing for {q}</>}
      hints={false}
      container={null}
    />
  )
}
export const controlled = <Controlled />

// @ts-expect-error: the query is a scope, tokens and text, not a string
export const stringValue = <ScopedSearch groups={groups} value="in:candidates" />

// @ts-expect-error: groups are required
export const missing = <ScopedSearch scopes={scopes} />

// SearchBar's panel props aren't ScopedSearch's.
// @ts-expect-error: no variant here
export const noVariant = <ScopedSearch groups={groups} variant="panel" />

export const words = (
  <SatinLabels
    labels={{
      scopedSearchRecent: 'Ostatnie',
      scopedSearchScopes: 'Szukaj w',
      scopedSearchScope: (scope) => `Szukaj w: ${scope}`,
      scopedSearchScopeChanged: (scope) => `Szukam w: ${scope}`,
      scopedSearchNoResultsIn: (query, scope) => `Brak wyników dla „${query}” w: ${scope}`,
      scopedSearchToken: (filter, value) => `${filter}: ${value}`,
      scopedSearchGroup: (group, count) => `${group}, wyniki: ${count}`,
      scopedSearchResultCount: (count) => `Wyniki: ${count}`,
    }}
  >
    {uncontrolled}
  </SatinLabels>
)

export const defaults: string = scopedSearchLabels.scopedSearchScopes
export const written: string = formatScopedQuery({ scope: 'atlas', tokens: [], text: 'onboarding' }, { scopeKey: 'w' })
