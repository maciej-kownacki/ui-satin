import * as React from 'react'
import { Check, FilterList, Plus } from 'iconoir-react'
import { Button } from '@uisatin/ui/button'
import { Tabs } from '@uisatin/ui/tabs'
import { Toggle } from '@uisatin/ui/toggle'
import { applyFilters, isFilterValid, type Filter, type FilterField } from '@uisatin/pro/filter-bar'
import { DealsTable, ME, dealsLabel, fieldOf, fields, type Deal } from './data'
import { FilterSheet } from './panel'

/*
 * Direction D, Views: a view is the base set (whose deals), toggles narrow it on other
 * dimensions, and "More" holds the rest in the Panel's sheet. Nothing overlaps, so every part
 * is one or more plain filters and they all AND together. Exploration, not package API.
 */

/** The base sets. They only ever set the owner. */
const VIEWS: { value: string; label: string; filters: Filter[] }[] = [
  { value: 'all', label: 'All deals', filters: [] },
  { value: 'mine', label: 'My pipeline', filters: [{ field: 'owner', operator: 'is', value: ME }] },
  { value: 'team', label: 'Team', filters: [{ field: 'owner', operator: 'isNoneOf', value: [ME] }] },
]

/** Quick refinements, one filter each, on fields no view touches. */
const QUICK: { id: string; label: string; filter: Filter }[] = [
  { id: 'value', label: 'Over €20k', filter: { field: 'value', operator: 'gt', value: 20000 } },
  { id: 'quarter', label: 'Closing this quarter', filter: { field: 'close', operator: 'inThis', value: 'quarter' } },
  { id: 'vip', label: 'VIP', filter: { field: 'tags', operator: 'hasAnyOf', value: ['vip'] } },
]

/** What "More" offers: what neither a view nor a toggle covers. VIP has its toggle, so Tags here leave it out. */
const tags = fieldOf('tags')
const MORE_FIELDS: FilterField[] = [fieldOf('stage'), { ...tags, options: tags.options?.filter((o) => o.value !== 'vip') }]

export function ViewsDirection({ deals }: { deals: Deal[] }) {
  const [view, setView] = React.useState('mine')
  const [on, setOn] = React.useState<string[]>(['value', 'quarter'])
  const [more, setMore] = React.useState<Filter[]>([])
  const [open, setOpen] = React.useState(false)
  const moreButton = React.useRef<HTMLButtonElement>(null)

  // One Filter[] for applyFilters: the view's, the toggles' and the sheet's.
  const filters = [
    ...(VIEWS.find((v) => v.value === view)?.filters ?? []),
    ...QUICK.filter((q) => on.includes(q.id)).map((q) => q.filter),
    ...more,
  ]
  const shown = applyFilters(deals, filters, fields)
  // A tab counts its view as it stands, before the toggles: the size of the base set.
  const counts = React.useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.value, applyFilters(deals, v.filters, fields).length])), [deals])
  const hidden = more.filter((f) => isFilterValid(f, fields)).length

  return (
    <div className="flex w-[760px] max-w-full flex-col gap-3">
      <Tabs
        aria-label="Views"
        value={view}
        onValueChange={setView}
        items={VIEWS.map((v) => ({
          value: v.value,
          label: (
            <>
              {v.label}
              <span className="text-text-muted tabular-nums">
                <span className="sr-only">, </span>
                {counts[v.value]}
                <span className="sr-only"> deals</span>
              </span>
            </>
          ),
        }))}
      />
      <div role="group" aria-label="Refine" className="flex items-center gap-2">
        {QUICK.map((q) => {
          const pressed = on.includes(q.id)
          return (
            <Toggle
              key={q.id}
              size="sm"
              pressed={pressed}
              onPressedChange={(p) => setOn((ids) => (p ? [...ids, q.id] : ids.filter((id) => id !== q.id)))}
              // Pressed is a light fill; the check says it without colour. Plus keeps the width when off.
              icon={pressed ? <Check /> : <Plus />}
            >
              {q.label}
            </Toggle>
          )
        })}
        <Button ref={moreButton} variant="tertiary" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <FilterList />
          {hidden > 0 ? `More · ${hidden}` : 'More'}
        </Button>
        <span aria-live="polite" className="ms-auto shrink-0 text-sm text-text-muted tabular-nums">
          {dealsLabel(shown.length)}
        </span>
      </div>
      <DealsTable rows={shown} />
      <FilterSheet
        title="More filters"
        open={open}
        onOpenChange={setOpen}
        count={shown.length}
        fields={MORE_FIELDS}
        value={more}
        onValueChange={setMore}
        returnFocus={moreButton}
      />
    </div>
  )
}

export const viewsCode = `// Exploration, not package API: direction D, Views. A view is the base set; toggles AND on other fields.
import { Tabs } from '@uisatin/ui/tabs'
import { Toggle } from '@uisatin/ui/toggle'
import { applyFilters, type Filter } from '@uisatin/pro/filter-bar'

const views = {
  all: [],
  mine: [{ field: 'owner', operator: 'is', value: me }],
  team: [{ field: 'owner', operator: 'isNoneOf', value: [me] }],
}
const quick = {
  value: { field: 'value', operator: 'gt', value: 20000 },
  quarter: { field: 'close', operator: 'inThis', value: 'quarter' },
  vip: { field: 'tags', operator: 'hasAnyOf', value: ['vip'] },
}
export function Pipeline({ deals }: { deals: Deal[] }) {
  const [view, setView] = React.useState('mine')
  const [on, setOn] = React.useState(['value', 'quarter'])
  const [more, setMore] = React.useState<Filter[]>([]) // Stage and the other tags, in the Panel's sheet
  const [open, setOpen] = React.useState(false)
  const shown = applyFilters(deals, [...views[view], ...on.map((id) => quick[id]), ...more], fields)

  return (
    <>
      <Tabs aria-label="Views" value={view} onValueChange={setView} items={tabsWithCounts} />
      {toggles.map((t) => <Toggle key={t.id} size="sm" pressed={on.includes(t.id)} onPressedChange={() => setOn(flip(on, t.id))}>{t.label}</Toggle>)}
      <Button variant="tertiary" onClick={() => setOpen(true)}>More</Button> <span>{shown.length} deals</span>
      <FilterSheet open={open} onOpenChange={setOpen} title="More filters" fields={[stage, otherTags]} value={more} onValueChange={setMore} />
      <Table label="Deals" columns={columns} rows={shown} />
    </>
  )
}`
