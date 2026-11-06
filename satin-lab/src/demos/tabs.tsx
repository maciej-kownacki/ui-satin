import { Tabs } from '@satin/ui/tabs'
import { Activity, Group, Settings, ViewGrid } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

type Variant = 'underline' | 'pill'
type Size = 'md' | 'sm'

const code = (variant: Variant, size: Size) => `import { Tabs } from '@satin/ui/tabs'

<Tabs
  defaultValue="Overview"
  variant="${variant}"
  size="${size}"
  items={['Overview', 'Activity', 'Settings', 'Members']}
/>`

const iconCode = `import { Tabs } from '@satin/ui/tabs'
import { Activity, Group, Settings, ViewGrid } from 'iconoir-react'

<Tabs
  defaultValue="overview"
  items={[
    { value: 'overview', label: 'Overview', icon: <ViewGrid /> },
    { value: 'activity', label: 'Activity', icon: <Activity /> },
    { value: 'settings', label: 'Settings', icon: <Settings /> },
    { value: 'members', label: 'Members', icon: <Group />, disabled: true },
  ]}
/>`

export const options: ShowcaseOption[] = [
  { id: 'underline', label: 'Underline', code: code('underline', 'md') },
  { id: 'pill', label: 'Pill', code: code('pill', 'md') },
  { id: 'sm', label: 'Small', code: code('underline', 'sm') },
  { id: 'icon', label: 'With icon', code: iconCode },
]

export default function TabsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Tabs"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="w-[560px] max-w-full">
          {id === 'icon' ? (
            <Tabs
              key={id}
              aria-label="Project"
              defaultValue="overview"
              items={[
                { value: 'overview', label: 'Overview', icon: <ViewGrid /> },
                { value: 'activity', label: 'Activity', icon: <Activity /> },
                { value: 'settings', label: 'Settings', icon: <Settings /> },
                { value: 'members', label: 'Members', icon: <Group />, disabled: true },
              ]}
            />
          ) : (
            <Tabs
              key={id}
              aria-label="Project"
              defaultValue="Overview"
              variant={id === 'pill' ? 'pill' : 'underline'}
              size={id === 'sm' ? 'sm' : 'md'}
              items={['Overview', 'Activity', 'Settings', 'Members']}
            />
          )}
        </div>
      )}
    />
  )
}
