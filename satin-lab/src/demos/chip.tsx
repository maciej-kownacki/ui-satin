import * as React from 'react'
import { Chip, ChipAvatar } from '@satin/ui/chip'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const filtersCode = `import { Chip } from '@satin/ui/chip'

export function Filters() {
  const [filters, setFilters] = React.useState(['Gluten-free', 'Vegan', 'Nut-free'])
  return (
    <div className="flex items-center gap-2">
      {filters.map((f) => (
        <Chip key={f} onRemove={() => setFilters(filters.filter((x) => x !== f))}>{f}</Chip>
      ))}
    </div>
  )
}`

const suggestionsCode = `import { Chip } from '@satin/ui/chip'

export function Suggestions() {
  return (
    <div className="flex items-center gap-2">
      <Chip variant="outline">Lunch</Chip>
      <Chip variant="outline">Dinner</Chip>
      <Chip variant="outline">Takeaway</Chip>
    </div>
  )
}`

const tonesCode = `import { Chip } from '@satin/ui/chip'

const tones = ['neutral', 'brand', 'sky', 'green', 'amber', 'red', 'fuchsia', 'plum'] as const

export function Tones() {
  return (
    <div className="flex flex-wrap gap-2">
      {tones.map((tone) => (
        <Chip key={tone} tone={tone} dot>{tone[0].toUpperCase() + tone.slice(1)}</Chip>
      ))}
    </div>
  )
}`

const peopleCode = `import { Chip, ChipAvatar } from '@satin/ui/chip'

export function People() {
  return (
    <div className="flex items-center gap-2">
      <Chip variant="outline" avatar={<ChipAvatar initials="AK" />}>Anna K.</Chip>
      <Chip variant="outline" dot>Online</Chip>
      <Chip variant="outline" size="sm" avatar={<ChipAvatar initials="MN" />}>Marek</Chip>
    </div>
  )
}`

export const options: ShowcaseOption[] = [
  { id: 'filters', label: 'Filters', code: filtersCode },
  { id: 'suggestions', label: 'Suggestions', code: suggestionsCode },
  { id: 'tones', label: 'Tones', code: tonesCode },
  { id: 'people', label: 'People', code: peopleCode },
]

const tones = ['neutral', 'brand', 'sky', 'green', 'amber', 'red', 'fuchsia', 'plum'] as const

function Filters() {
  const [filters, setFilters] = React.useState(['Gluten-free', 'Vegan', 'Nut-free'])
  return (
    <div className="flex items-center gap-2">
      {filters.map((f) => (
        <Chip key={f} onRemove={() => setFilters(filters.filter((x) => x !== f))}>
          {f}
        </Chip>
      ))}
      {filters.length === 0 && (
        <Chip variant="outline" onClick={() => setFilters(['Gluten-free', 'Vegan', 'Nut-free'])}>
          Reset filters
        </Chip>
      )}
    </div>
  )
}

export default function ChipDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Chip"
      options={options}
      codeHtml={codeHtml}
      render={(id) => {
        if (id === 'filters') return <Filters />
        if (id === 'suggestions')
          return (
            <div className="flex items-center gap-2">
              <Chip variant="outline">Lunch</Chip>
              <Chip variant="outline">Dinner</Chip>
              <Chip variant="outline">Takeaway</Chip>
            </div>
          )
        if (id === 'tones')
          return (
            <div className="grid grid-cols-4 gap-2">
              {tones.map((tone) => (
                <Chip key={tone} tone={tone} dot>
                  {tone[0].toUpperCase() + tone.slice(1)}
                </Chip>
              ))}
            </div>
          )
        return (
          <div className="flex items-center gap-2">
            <Chip variant="outline" avatar={<ChipAvatar initials="AK" />}>Anna K.</Chip>
            <Chip variant="outline" dot>Online</Chip>
            <Chip variant="outline" size="sm" avatar={<ChipAvatar initials="MN" />}>Marek</Chip>
          </div>
        )
      }}
    />
  )
}
