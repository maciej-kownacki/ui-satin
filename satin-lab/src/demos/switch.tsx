import { Switch } from '@satin/ui'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const code = (placement: 'left' | 'right') => `import { Switch } from '@satin/ui/switch'

<Switch
  placement="${placement}"
  label="Email notifications"
  description="Send me a summary of new orders every evening."
  defaultChecked
/>`

export const options: ShowcaseOption[] = [
  { id: 'left', label: 'Switch left', code: code('left') },
  { id: 'right', label: 'Switch right', code: code('right') },
]

export default function SwitchDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Switch"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="w-80 max-w-full">
          <Switch
            key={id}
            placement={id as 'left' | 'right'}
            label="Email notifications"
            description="Send me a summary of new orders every evening."
            defaultChecked
          />
        </div>
      )}
    />
  )
}
