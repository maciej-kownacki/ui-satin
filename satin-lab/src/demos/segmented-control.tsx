import { SegmentedControl } from '@satin/ui'
import { Home, Folder, User } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'default',
    label: 'Default',
    code: `import { SegmentedControl } from '@satin/ui/segmented-control'

<SegmentedControl
  items={[
    { value: 'all', label: 'All' },
    { value: 'tab', label: 'Tab' },
    { value: 'agent', label: 'Agent' },
  ]}
  defaultValue="all"
/>`,
  },
  {
    id: 'rounded',
    label: 'Rounded',
    code: `import { SegmentedControl } from '@satin/ui/segmented-control'

<SegmentedControl
  shape="rounded"
  items={[
    { value: 'all', label: 'All' },
    { value: 'tab', label: 'Tab' },
    { value: 'agent', label: 'Agent' },
  ]}
  defaultValue="all"
/>`,
  },
  {
    id: 'icons',
    label: 'Icons',
    code: `import { SegmentedControl } from '@satin/ui/segmented-control'
import { Home, Folder, User } from 'iconoir-react'

<SegmentedControl
  size="lg"
  shape="rounded"
  items={[
    { value: 'home', label: 'Home', icon: <Home /> },
    { value: 'files', label: 'Files', icon: <Folder /> },
    { value: 'agent', label: 'Agent', icon: <User /> },
  ]}
  defaultValue="home"
/>`,
  },
]

export default function SegmentedControlDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Segmented control"
      options={options}
      codeHtml={codeHtml}
      render={(id) =>
        id === 'icons' ? (
          <SegmentedControl
            key={id}
            size="lg"
            shape="rounded"
            items={[
              { value: 'home', label: 'Home', icon: <Home aria-hidden /> },
              { value: 'files', label: 'Files', icon: <Folder aria-hidden /> },
              { value: 'agent', label: 'Agent', icon: <User aria-hidden /> },
            ]}
          />
        ) : (
          <SegmentedControl
            key={id}
            shape={id === 'rounded' ? 'rounded' : 'default'}
            items={[
              { value: 'all', label: 'All' },
              { value: 'tab', label: 'Tab' },
              { value: 'agent', label: 'Agent' },
            ]}
          />
        )
      }
    />
  )
}
