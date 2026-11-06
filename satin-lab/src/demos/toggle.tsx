import * as React from 'react'
import { Toggle } from '@satin/ui/toggle'
import { Code, Copy, Eye } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const filters = ['Vegan', 'Gluten free', 'Spicy', 'Nut free']

const filterCode = (variant: 'outline' | 'ghost') => `import { Toggle } from '@satin/ui/toggle'

const [vegan, setVegan] = React.useState(true)

<Toggle${variant === 'ghost' ? ' variant="ghost"' : ''} pressed={vegan} onPressedChange={setVegan}>
  Vegan
</Toggle>`

export const options: ShowcaseOption[] = [
  { id: 'outline', label: 'Outline', code: filterCode('outline') },
  { id: 'ghost', label: 'Ghost', code: filterCode('ghost') },
  {
    id: 'icon',
    label: 'With icon',
    code: `import { Toggle } from '@satin/ui/toggle'
import { Code, Eye } from 'iconoir-react'

<Toggle icon={<Eye />} defaultPressed>Preview</Toggle>
<Toggle icon={<Code />}>Code</Toggle>

<Toggle iconOnly icon={<Eye />} aria-label="Preview" defaultPressed />`,
  },
]

function Filters({ variant }: { variant: 'outline' | 'ghost' }) {
  const [on, setOn] = React.useState<Record<string, boolean>>({ Vegan: true, Spicy: true })
  return (
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Dietary filters">
      {filters.map((f) => (
        <Toggle
          key={f}
          variant={variant}
          pressed={!!on[f]}
          onPressedChange={(p) => setOn((s) => ({ ...s, [f]: p }))}
        >
          {f}
        </Toggle>
      ))}
    </div>
  )
}

export default function ToggleDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Toggle"
      options={options}
      codeHtml={codeHtml}
      render={(id) =>
        id === 'icon' ? (
          <div className="grid justify-items-center gap-3">
            <div className="flex gap-2">
              <Toggle icon={<Eye />} defaultPressed>
                Preview
              </Toggle>
              <Toggle icon={<Code />}>Code</Toggle>
            </div>
            <div className="flex gap-2">
              <Toggle size="sm" iconOnly icon={<Eye />} aria-label="Preview" defaultPressed />
              <Toggle size="sm" iconOnly icon={<Code />} aria-label="Code" />
              <Toggle size="sm" iconOnly icon={<Copy />} aria-label="Copy" />
            </div>
          </div>
        ) : (
          <Filters key={id} variant={id as 'outline' | 'ghost'} />
        )
      }
    />
  )
}
