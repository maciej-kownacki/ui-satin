/* Type test, never run: ScopedSearch's props, controlled and uncontrolled, its helpers, ref, and its words in SatinLabels. */
import * as React from 'react'
import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  ScopedSearch,
  filterScopedGroups,
  formatScopedQuery,
  parseScopedQuery,
  scopedSearchLabels,
  type ScopedSearchGroup,
  type ScopedSearchItem,
  type ScopedSearchQuery,
  type ScopedSearchScope,
} from '../components/search-scoped'

const scopes: ScopedSearchScope[] = [
  { key: 'stage', label: 'Stage', values: ['screening', { value: 'interview', label: 'Interview' }] },
  { key: 'owner', label: 'Owner' },
]

const item: ScopedSearchItem = {
  id: 'ada',
  label: 'Ada Novak',
  description: 'Frontend engineer',
  media: <Avatar size={20} initials="AN" />,
  meta: <Badge size="sm">Interview</Badge>,
  fields: { stage: 'interview', owner: ['tara', 'jon'] },
  keywords: ['React'],
  onSelect: () => {},
}
const groups: ScopedSearchGroup[] = [{ id: 'candidates', label: 'Candidates', items: [item], count: 6 }]

// @ts-expect-error: a field is a string or a list of strings
const badField: ScopedSearchItem = { id: 'x', label: 'x', fields: { stage: 3 } }
// @ts-expect-error: a scope needs a label
const badScope: ScopedSearchScope = { key: 'stage' }

const inputRef = React.createRef<HTMLInputElement>()

export const uncontrolled = (
  <ScopedSearch
    ref={inputRef}
    scopes={scopes}
    groups={groups}
    recent={['stage:interview react']}
    defaultValue={parseScopedQuery('stage:interview react', scopes)}
    defaultOpen
    onSelect={(picked, query) => console.log(picked.id, formatScopedQuery(query))}
    placeholder="Search candidates, jobs, notes…"
    aria-label="Search the ATS"
    wrapperClassName="w-full"
    shortcut
    hotkey={false}
  />
)

function Controlled() {
  const [value, setValue] = React.useState<ScopedSearchQuery>({ tokens: [], text: '' })
  const [open, setOpen] = React.useState(false)
  return (
    <ScopedSearch
      scopes={scopes}
      groups={filterScopedGroups(groups, value, scopes)}
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

// @ts-expect-error: the query is tokens and text, not a string
export const stringValue = <ScopedSearch scopes={scopes} groups={groups} value="stage:interview" />

// @ts-expect-error: scopes and groups are required
export const missing = <ScopedSearch />

// SearchBar's panel props aren't ScopedSearch's.
// @ts-expect-error: no variant here
export const noVariant = <ScopedSearch scopes={scopes} groups={groups} variant="panel" />

export const words = (
  <SatinLabels
    labels={{
      scopedSearchRecent: 'Ostatnie',
      scopedSearchToken: (scope, value) => `${scope}: ${value}`,
      scopedSearchGroup: (group, count) => `${group}, wyniki: ${count}`,
      scopedSearchResultCount: (count) => `Wyniki: ${count}`,
    }}
  >
    {uncontrolled}
  </SatinLabels>
)

export const defaults: string = scopedSearchLabels.scopedSearchFilters
