/* Type test, never run: FilterBar's props, its parts, refs, the value as JSON, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  FilterBar,
  FilterBarAdd,
  FilterBarChips,
  FilterBarCount,
  FilterBarRoot,
  FilterBarSearch,
  FilterBarViews,
  applyFilters,
  filterOperators,
  isFilterValid,
  toFilterDate,
  type Filter,
  type FilterField,
  type FilterView,
} from '../components/filter-bar'

const fields: FilterField[] = [
  { key: 'stage', label: 'Stage', type: 'enum', options: [{ value: 'interview', label: 'Interview' }] },
  { key: 'tags', label: 'Tags', type: 'multi', options: [{ value: 'vip', label: 'VIP' }] },
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Acme' },
  { key: 'value', label: 'Value', type: 'number', min: 0, step: 1000, format: { style: 'currency', currency: 'EUR' }, operators: ['gt', 'lt'] },
  { key: 'close', label: 'Close date', type: 'date', operators: ['inThis', 'inLast'] },
  { key: 'owner', label: 'Owner', type: 'person', me: 'tara', options: [{ value: 'tara', label: 'Tara Mendes' }] },
]

// @ts-expect-error: no such type
const wrongType: FilterField = { key: 'x', label: 'X', type: 'boolean' }
// @ts-expect-error: no such operator
const wrongOperator: Filter = { field: 'stage', operator: 'equals', value: 'interview' }

const value: Filter[] = [
  { field: 'stage', operator: 'is', value: 'interview' },
  { field: 'value', operator: 'between', value: [10000, 20000] },
  { field: 'close', operator: 'between', value: ['2026-10-01', '2026-12-31'] },
  { field: 'close', operator: 'inThis', value: 'quarter' },
]

// The value is plain JSON both ways.
export const roundTrip: Filter[] = JSON.parse(JSON.stringify(value))

const views: FilterView[] = [{ id: 'mine', label: 'My deals', value: [{ field: 'owner', operator: 'is', value: 'tara' }] }]

const barRef = React.createRef<HTMLDivElement>()
const inputRef = React.createRef<HTMLInputElement>()
const buttonRef = React.createRef<HTMLButtonElement>()

// Controlled.
export const controlled = (
  <FilterBar
    ref={barRef}
    fields={fields}
    value={value}
    onValueChange={(next: Filter[]) => next}
    resultCount={14}
    resultLabel={(count, number) => <>{number} {count === 1 ? 'deal' : 'deals'}</>}
    views={views}
    onSaveView={(name: string, filters: Filter[]) => [name, filters]}
    search
    query="acme"
    onQueryChange={(q: string) => q}
    maxVisible={4}
    shortcut={false}
  />
)

// Uncontrolled.
export const uncontrolled = <FilterBar fields={fields} defaultValue={value} defaultQuery="" search searchPlaceholder="Search deals…" />

// @ts-expect-error: fields are required
export const missing = <FilterBar value={value} />

export const parts = (
  <FilterBarRoot fields={fields} defaultValue={value} resultCount={3} aria-describedby="hint">
    <FilterBarSearch ref={inputRef} placeholder="Search" />
    <FilterBarChips className="gap-2" />
    <FilterBarAdd ref={buttonRef}>Add filter</FilterBarAdd>
    <FilterBarCount />
    <FilterBarViews />
  </FilterBarRoot>
)

// Filtering rows for a List or a grid.
type Deal = { stage: string; value: number; close: string; owner: string }
const deals: Deal[] = []
export const shown: Deal[] = applyFilters(deals, value, fields, { today: new Date(2026, 10, 19) })
export const read: Deal[] = applyFilters(deals, value, fields, { getValue: (row, key) => row[key as keyof Deal] })
export const valid: boolean = isFilterValid(value[0], fields)
export const day: string = toFilterDate(new Date())
export const numberOps = filterOperators.number

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels
    labels={{
      close: 'Zamknij',
      filterAdd: 'Filtr',
      filterOperator: (op) => (op === 'is' ? 'to' : op),
      filterResults: (count, number) => <>{number} wyników</>,
      filterDays: (n) => `${n} dni`,
    }}
  >
    {controlled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ filterDays: 'dni' }}>{controlled}</SatinLabels>

export { wrongType, wrongOperator }
