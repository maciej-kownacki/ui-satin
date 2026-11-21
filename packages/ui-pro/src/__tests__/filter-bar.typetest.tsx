/* Type test, never run: FilterBar's fields as a union, its props, its parts, refs, the value as JSON, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import * as filterBar from '../components/filter-bar'
import {
  FilterBar,
  FilterBarClear,
  FilterBarCount,
  FilterBarFacet,
  FilterBarRoot,
  applyFilters,
  isFilterValid,
  toFilterDate,
  type Filter,
  type FilterDateField,
  type FilterField,
  type FilterNumberField,
  type FilterOptionsField,
  type FilterPersonField,
} from '../components/filter-bar'

const fields: FilterField[] = [
  { key: 'owner', label: 'Owner', type: 'person', me: 'tara', options: [{ value: 'tara', label: 'Tara Mendes', icon: <span /> }] },
  { key: 'stage', label: 'Stage', type: 'enum', options: [{ value: 'won', label: 'Won', tone: 'green' }] },
  { key: 'tags', label: 'Tags', type: 'multi', options: [{ value: 'vip', label: 'VIP' }] },
  {
    key: 'value',
    label: 'Value',
    type: 'number',
    format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 },
    presets: [
      { operator: 'gt', value: 20000, label: '> €20k' },
      { operator: 'between', value: [10000, 20000] },
    ],
  },
  { key: 'close', label: 'Close date', shortLabel: 'Close', type: 'date', presets: ['quarter', 30], customRange: false },
  { key: 'created', label: 'Created', type: 'date' },
]

// Each type narrows to its own shape.
export const person: FilterPersonField = { key: 'owner', label: 'Owner', type: 'person', options: [] }
export const stage: FilterOptionsField = { key: 'stage', label: 'Stage', type: 'enum', options: [] }
export const value: FilterNumberField = { key: 'value', label: 'Value', type: 'number', presets: [] }
export const close: FilterDateField = { key: 'close', label: 'Close date', type: 'date' }

// @ts-expect-error: a number field needs presets
export const noPresets: FilterField = { key: 'value', label: 'Value', type: 'number' }
// @ts-expect-error: an enum field needs options
export const noOptions: FilterField = { key: 'stage', label: 'Stage', type: 'enum' }
// @ts-expect-error: no text type
export const text: FilterField = { key: 'name', label: 'Name', type: 'text' }
// @ts-expect-error: fields take no operators
export const operators: FilterField = { key: 'close', label: 'Close date', type: 'date', operators: ['inThis'] }
// @ts-expect-error: fields take no icon
export const icon: FilterField = { key: 'close', label: 'Close date', type: 'date', icon: <span /> }
// @ts-expect-error: me is a person field's
export const enumMe: FilterField = { key: 'stage', label: 'Stage', type: 'enum', me: 'tara', options: [] }
// @ts-expect-error: a between preset takes two numbers
export const halfRange: FilterField = { key: 'value', label: 'Value', type: 'number', presets: [{ operator: 'between', value: 10000 }] }
// @ts-expect-error: no such date preset
export const wrongPeriod: FilterField = { key: 'close', label: 'Close date', type: 'date', presets: ['decade'] }
// @ts-expect-error: no such operator any more
export const wrongOperator: Filter = { field: 'stage', operator: 'isNot', value: 'won' }

const filters: Filter[] = [
  { field: 'owner', operator: 'is', value: 'tara' },
  { field: 'stage', operator: 'isAnyOf', value: ['won', 'lead'] },
  { field: 'tags', operator: 'hasAnyOf', value: ['vip'] },
  { field: 'value', operator: 'between', value: [10000, 20000] },
  { field: 'close', operator: 'between', value: ['2026-10-01', '2026-12-31'] },
  { field: 'created', operator: 'inLast', value: 30 },
]

// The value is plain JSON both ways.
export const roundTrip: Filter[] = JSON.parse(JSON.stringify(filters))

const barRef = React.createRef<HTMLDivElement>()
const facetRef = React.createRef<HTMLSpanElement>()
const buttonRef = React.createRef<HTMLButtonElement>()
const countRef = React.createRef<HTMLSpanElement>()

// Controlled.
export const controlled = (
  <FilterBar
    ref={barRef}
    fields={fields}
    value={filters}
    onValueChange={(next: Filter[]) => next}
    resultCount={14}
    resultLabel={(count, number) => (
      <>
        {number} {count === 1 ? 'deal' : 'deals'}
      </>
    )}
    container={null}
    today={new Date(2026, 10, 19)}
  />
)

// Uncontrolled.
export const uncontrolled = <FilterBar fields={fields} defaultValue={filters} />

// @ts-expect-error: fields are required
export const missing = <FilterBar value={filters} />
// @ts-expect-error: no search any more
export const search = <FilterBar fields={fields} search />
// @ts-expect-error: no views any more
export const views = <FilterBar fields={fields} views={[]} />
// @ts-expect-error: no folding any more
export const folding = <FilterBar fields={fields} maxVisible={4} />

export const parts = (
  <FilterBarRoot fields={fields} defaultValue={filters} resultCount={3} aria-describedby="hint">
    <FilterBarFacet ref={facetRef} field="stage" className="max-w-60" />
    <FilterBarFacet field="owner" />
    <FilterBarClear ref={buttonRef} className="ms-1" />
    <FilterBarCount ref={countRef} />
  </FilterBarRoot>
)

// @ts-expect-error: Clear draws its own icon
export const clearChildren = <FilterBarClear>Clear</FilterBarClear>
// @ts-expect-error: a facet names its field
export const noField = <FilterBarFacet />

// Filtering rows for a List or a grid.
type Deal = { owner: string; stage: string; value: number; close: string; tags: string[] }
const deals: Deal[] = []
export const shown: Deal[] = applyFilters(deals, filters, fields, { today: new Date(2026, 10, 19) })
export const read: Deal[] = applyFilters(deals, filters, fields, { getValue: (row, key) => row[key as keyof Deal] })
export const valid: boolean = isFilterValid(filters[0], fields)
export const day: string = toFilterDate(new Date())

// What went with the chips is gone.
// @ts-expect-error: removed
export const chips = filterBar.FilterBarChips
// @ts-expect-error: removed
export const add = filterBar.FilterBarAdd
// @ts-expect-error: removed
export const searchPart = filterBar.FilterBarSearch
// @ts-expect-error: removed
export const viewsPart = filterBar.FilterBarViews
// @ts-expect-error: removed
export const operatorList = filterBar.filterOperators
// @ts-expect-error: removed
export type View = filterBar.FilterView

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels
    labels={{
      clear: 'Wyczyść',
      filterBar: 'Filtry',
      filterMe: 'Ja',
      filterComparison: (operator, v) => `${operator === 'gt' || operator === 'gte' ? 'od' : 'do'} ${v}`,
      filterThis: (period) => (period === 'quarter' ? 'Ten kwartał' : period),
      filterLastDays: (n) => `Ostatnie ${n} dni`,
      filterResults: (count, number) => <>{number} wyników</>,
    }}
  >
    {controlled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ filterLastDays: 'dni' }}>{controlled}</SatinLabels>
// @ts-expect-error: the old operator words are gone
export const oldLabel = <SatinLabels labels={{ filterOperator: () => 'to' }}>{controlled}</SatinLabels>
