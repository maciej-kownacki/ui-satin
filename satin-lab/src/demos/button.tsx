import { Button } from '@satin/ui'
import { Calendar, Plus, Trash } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const code = (shape: 'rectangle' | 'pill') => `import { Button } from '@satin/ui/button'
import { Calendar, Plus, Trash } from 'iconoir-react'

export function Actions() {
  return (
    <div className="flex items-center gap-2">
      <Button shape="${shape}"><Calendar />Schedule</Button>
      <Button variant="secondary" shape="${shape}">Cancel</Button>
      <Button variant="tertiary" shape="${shape}">Skip</Button>
      <Button variant="destructive" shape="${shape}" iconOnly aria-label="Delete"><Trash /></Button>
      <Button variant="inverse" shape="${shape}" iconOnly aria-label="Add"><Plus /></Button>
    </div>
  )
}`

export const options: ShowcaseOption[] = [
  { id: 'rectangle', label: 'Rectangle', code: code('rectangle') },
  { id: 'pill', label: 'Pill', code: code('pill') },
]

export default function ButtonDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Button"
      options={options}
      codeHtml={codeHtml}
      render={(id) => {
        const shape = id as 'rectangle' | 'pill'
        return (
          <div className="flex items-center gap-2">
            <Button shape={shape}><Calendar />Schedule</Button>
            <Button variant="secondary" shape={shape}>Cancel</Button>
            <Button variant="tertiary" shape={shape}>Skip</Button>
            <Button variant="destructive" shape={shape} iconOnly aria-label="Delete"><Trash /></Button>
            <Button variant="inverse" shape={shape} iconOnly aria-label="Add"><Plus /></Button>
          </div>
        )
      }}
    />
  )
}
