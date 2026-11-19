/* Type test, never run: Combobox's groups, app-side search and render props. */
import * as React from 'react'
import { Combobox } from '../components/combobox'
import { Chip } from '../components/chip'
import type { SelectGroup, SelectOption } from '../components/select'

const groups: SelectGroup[] = [
  { label: 'Recent', options: [{ value: 'ams', label: 'Amsterdam' }] },
  { label: 'Europe', options: [{ value: 'ber', label: 'Berlin', description: 'Germany' }] },
]
const results: SelectOption[] = [{ value: 'waw', label: 'Warsaw' }]

export const grouped = <Combobox label="City" options={groups} filter={(o, q) => o.value.startsWith(q)} />

export const search = (
  <Combobox
    label="City"
    multiple
    options={results}
    filter={false}
    onQueryChange={(q: string) => q.trim()}
    loading
    loadingText="Searching…"
    selectedOptions={results}
    renderOption={(o, { selected }) => (
      <span>
        {o.label}
        {selected ? ' ✓' : ''}
      </span>
    )}
    renderValue={(picked, { remove, disabled }) =>
      picked.map((o) => (
        <Chip key={o.value} size="sm" disabled={disabled} onRemove={() => remove(o.value)}>
          {o.label}
        </Chip>
      ))
    }
  />
)

// @ts-expect-error: filter is a boolean or a test, not a string
export const wrongFilter = <Combobox options={results} filter="label" />

// @ts-expect-error: a group holds options, not values
export const wrongGroup = <Combobox options={[{ label: 'Recent', options: ['ams'] }]} />
