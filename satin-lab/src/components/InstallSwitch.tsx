import * as React from 'react'
import { SegmentedControl } from '@uisatin/ui'

type Method = 'npm' | 'shadcn'
const KEY = 'satin-install-method'

/**
 * The npm | shadcn switch above a component's install steps. Both panels are rendered by Astro
 * (passed in as slots) and stay mounted; the switch only hides the other one, so their Copy
 * buttons keep working. The choice is remembered across pages.
 */
export default function InstallSwitch({ npm, shadcn }: { npm?: React.ReactNode; shadcn?: React.ReactNode }) {
  const [method, setMethod] = React.useState<Method>('npm')
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === 'npm' || saved === 'shadcn') setMethod(saved)
    } catch {
      // Storage can be blocked; npm stays the default.
    }
  }, [])
  const choose = (value: string) => {
    const next = value as Method
    setMethod(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Not remembered, still switched.
    }
  }
  // A Satin Pro page in the public build has no registry item, so only npm, and no switch.
  if (!shadcn) return <div className="flex flex-col gap-3">{npm}</div>
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        aria-label="Install with"
        size="xs"
        className="self-start"
        items={[
          { value: 'npm', label: 'npm' },
          { value: 'shadcn', label: 'shadcn CLI' },
        ]}
        value={method}
        onValueChange={choose}
      />
      <div hidden={method !== 'npm'}>{npm}</div>
      <div hidden={method !== 'shadcn'}>{shadcn}</div>
    </div>
  )
}
