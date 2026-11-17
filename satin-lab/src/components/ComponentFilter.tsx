import * as React from 'react'
import { SearchBar } from '@uisatin/ui/search-bar'
import { SegmentedControl } from '@uisatin/ui/segmented-control'

/**
 * The search and the group filter over the All components grid. The cards are static HTML
 * (pages/components/index.astro); this only hides the ones that don't match, by their
 * data-title and data-group, and says how many are left.
 */
export function ComponentFilter({ groups }: { groups: { value: string; label: string }[] }) {
  const [query, setQuery] = React.useState('')
  const [group, setGroup] = React.useState('all')
  const [shown, setShown] = React.useState<number | null>(null)

  React.useEffect(() => {
    const q = query.trim().toLowerCase()
    let n = 0
    document.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
      const match = (group === 'all' || card.dataset.group === group) && (!q || (card.dataset.title ?? '').includes(q))
      card.hidden = !match
      if (match) n++
    })
    setShown(n)
    const empty = document.querySelector<HTMLElement>('[data-cards-empty]')
    if (empty) empty.hidden = n > 0
  }, [query, group])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:w-[280px]">
        <SearchBar aria-label="Search components" placeholder="Search components…" value={query} onChange={(e) => setQuery(e.target.value)} hotkey={false} shortcut={false} />
      </div>
      <div className="flex items-center gap-3">
        <SegmentedControl aria-label="Group" items={[{ value: 'all', label: 'All' }, ...groups]} value={group} onValueChange={setGroup} />
        <span aria-live="polite" className="min-w-[72px] text-right text-sm text-text-muted">
          {shown == null ? '' : `${shown} ${shown === 1 ? 'page' : 'pages'}`}
        </span>
      </div>
    </div>
  )
}
