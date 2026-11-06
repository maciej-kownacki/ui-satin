import { Button } from '@satin/ui/button'
import { Tooltip } from '@satin/ui/tooltip'
import { Copy, Play, Search } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const code = (shape: 'default' | 'rounded') => `import { Tooltip } from '@satin/ui/tooltip'
import { Button } from '@satin/ui/button'
import { Copy, Play, Search } from 'iconoir-react'

export function Toolbar() {
  return (
    <div className="flex items-center gap-2">
      <Tooltip label="Copy" shortcut="⌘C" shape="${shape}">
        <Button variant="secondary" size="md" shape="${shape}" iconOnly aria-label="Copy"><Copy /></Button>
      </Tooltip>
      <Tooltip label="Search" shortcut="⌘F" shape="${shape}">
        <Button variant="secondary" size="md" shape="${shape}" iconOnly aria-label="Search"><Search /></Button>
      </Tooltip>
      <Tooltip label="Send" shortcut="⌘↵" shape="${shape}">
        <Button variant="secondary" size="md" shape="${shape}" iconOnly aria-label="Send"><Play /></Button>
      </Tooltip>
    </div>
  )
}`

export const options: ShowcaseOption[] = [
  { id: 'default', label: 'Default', code: code('default') },
  { id: 'rounded', label: 'Rounded', code: code('rounded') },
]

export default function TooltipDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Tooltip"
      options={options}
      codeHtml={codeHtml}
      render={(id) => {
        const shape = id as 'default' | 'rounded'
        return (
          <div className="flex items-center gap-2">
            {/* The first one starts open so the stage never looks empty. */}
            <Tooltip label="Copy" shortcut="⌘C" shape={shape} defaultOpen>
              <Button variant="secondary" size="md" shape={shape} iconOnly aria-label="Copy"><Copy /></Button>
            </Tooltip>
            <Tooltip label="Search" shortcut="⌘F" shape={shape}>
              <Button variant="secondary" size="md" shape={shape} iconOnly aria-label="Search"><Search /></Button>
            </Tooltip>
            <Tooltip label="Send" shortcut="⌘↵" shape={shape}>
              <Button variant="secondary" size="md" shape={shape} iconOnly aria-label="Send"><Play /></Button>
            </Tooltip>
          </div>
        )
      }}
    />
  )
}
