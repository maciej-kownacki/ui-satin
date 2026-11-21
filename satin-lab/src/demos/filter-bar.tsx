import * as React from 'react'
import { FilterBar, applyFilters, type Filter, type FilterView } from '@uisatin/pro/filter-bar'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { DealsTable, ME, SCENARIO, fields, pipeline, type Deal } from './filter-bar-lab/data'
import { PanelDirection, panelCode } from './filter-bar-lab/panel'
import { ViewsDirection, viewsCode } from './filter-bar-lab/views'

/*
 * An exploration for now: the current Filter bar (Baseline) next to structurally different
 * directions, picked with Direction. Each lives in filter-bar-lab/, opens at the same scenario
 * (my pipeline, over €20,000, closing this quarter: 14 deals) and shows the same table.
 */

export const controls: ShowcaseControl[] = [
  {
    id: 'direction',
    label: 'Direction',
    type: 'menu',
    items: [
      { value: 'baseline', label: 'Baseline' },
      { value: 'facets', label: 'Facets' },
      { value: 'query', label: 'Query' },
      { value: 'panel', label: 'Panel' },
      { value: 'views', label: 'Views' },
    ],
  },
]

const baselineCode = `import { FilterBar, applyFilters, type Filter, type FilterField } from '@uisatin/pro/filter-bar'
import { Table } from '@uisatin/ui/table'

const fields: FilterField[] = [
  { key: 'owner', label: 'Owner', type: 'person', me: currentUser.id, options: people },
  { key: 'stage', label: 'Stage', type: 'enum', options: stages },
  { key: 'value', label: 'Value', type: 'number', min: 0, step: 1000, format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 } },
  { key: 'close', label: 'Close date', type: 'date', operators: ['inThis', 'inLast', 'is', 'before', 'after', 'between'] },
  { key: 'company', label: 'Deal', type: 'text' },
  { key: 'tags', label: 'Tags', type: 'multi', options: tags },
]

export function Pipeline({ deals }: { deals: Deal[] }) {
  // Plain JSON: keep it in the URL or save it as a view.
  const [filters, setFilters] = React.useState<Filter[]>([
    { field: 'owner', operator: 'is', value: 'tara' },
    { field: 'value', operator: 'gt', value: 20000 },
    { field: 'close', operator: 'inThis', value: 'quarter' },
  ])
  const [query, setQuery] = React.useState('')
  const shown = applyFilters(deals, filters, fields).filter((d) => d.company.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <FilterBar
        fields={fields}
        value={filters}
        onValueChange={setFilters}
        resultCount={shown.length}
        resultLabel={(count, number) => <>{number} {count === 1 ? 'deal' : 'deals'}</>}
        search
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search deals…"
        views={views}
        onSaveView={(label, value) => saveView({ label, value })}
      />
      <Table label="Deals" columns={columns} rows={shown} />
    </div>
  )
}`

// Part 2 replaces these with the Facets and Query sketches.
const pendingCode = (name: string) => `// Exploration, not package API: direction ${name}, coming in part 2.`

const LABELS: Record<string, string> = {
  baseline: 'Baseline: the current Filter bar',
  facets: 'A · Facets',
  query: 'B · Query',
  panel: 'C · Panel',
  views: 'D · Views',
}
const CODE: Record<string, string> = {
  baseline: baselineCode,
  facets: pendingCode('A, Facets'),
  query: pendingCode('B, Query'),
  panel: panelCode,
  views: viewsCode,
}
const allOptions: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: LABELS[v.direction], code: CODE[v.direction] }))

/**
 * Baseline only: the install section, the registry example and the markdown page take the
 * shortest of these, and the directions' sketches are not package API.
 */
export const options: ShowcaseOption[] = allOptions.filter((o) => o.id === 'baseline')
/** The directions' sketches, for the Code tab only (the page highlights both lists). */
export const directionOptions: ShowcaseOption[] = allOptions.filter((o) => o.id !== 'baseline')

const VIEWS: FilterView[] = [
  { id: 'all', label: 'All deals', value: [] },
  { id: 'mine', label: 'My pipeline', value: [{ field: 'owner', operator: 'is', value: ME }] },
]

/** Baseline, the Filter bar as it ships: a rep narrows the pipeline chip by chip and watches the count follow. */
function Baseline({ deals }: { deals: Deal[] }) {
  const [filters, setFilters] = React.useState<Filter[]>(SCENARIO)
  const [query, setQuery] = React.useState('')
  const [views, setViews] = React.useState(VIEWS)
  const shown = applyFilters(deals, filters, fields).filter((d) => d.company.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <div className="flex w-[760px] max-w-full flex-col gap-3">
      <FilterBar
        fields={fields}
        value={filters}
        onValueChange={setFilters}
        resultCount={shown.length}
        resultLabel={(count, number) => (
          <>
            {number} {count === 1 ? 'deal' : 'deals'}
          </>
        )}
        search
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search deals…"
        views={views}
        onSaveView={(label, value) => setViews((all) => [...all, { id: `v${all.length}`, label, value }])}
      />
      <DealsTable rows={shown} />
    </div>
  )
}

/** The direction picked; each owns its state and starts at the scenario. */
function Preview({ direction }: { direction: string }) {
  const deals = React.useMemo(pipeline, [])
  switch (direction) {
    case 'panel':
      return <PanelDirection deals={deals} />
    case 'views':
      return <ViewsDirection deals={deals} />
    // Part 2: FacetsDirection from ./filter-bar-lab/facets, QueryDirection from ./filter-bar-lab/query.
    case 'facets':
    case 'query':
      return (
        <div className="flex w-[760px] max-w-full flex-col gap-3">
          <p className="text-sm text-text-muted">Direction coming in part 2</p>
        </div>
      )
    default:
      return <Baseline deals={deals} />
  }
}

export default function FilterBarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  // The key remounts the preview on every switch, so each direction starts at the scenario.
  return <Showcase name="Filter bar" options={allOptions} codeHtml={codeHtml} controls={controls} align="top" render={(id, v) => <Preview key={id} direction={v.direction} />} />
}
