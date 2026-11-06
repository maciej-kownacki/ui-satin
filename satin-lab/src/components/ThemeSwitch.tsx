import * as React from 'react'
import { SegmentedControl } from '@satin/ui'
import { HalfMoon, SunLight } from 'iconoir-react'

/**
 * The light / dark switch next to the logo (uiKit 3857:6060). Until someone picks one,
 * the page follows the system setting; a pick is remembered in localStorage.
 */
type Theme = 'light' | 'dark'

const systemTheme = (): Theme => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function ThemeSwitch() {
  // Unknown until mounted: the server can't know the theme, so lab.css marks the right
  // segment from the class on <html> until then, and nothing jumps on load.
  const [theme, setTheme] = React.useState<Theme | null>(null)

  React.useLayoutEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem('satin-theme')
    } catch {}
    setTheme(saved === 'light' || saved === 'dark' ? saved : systemTheme())
  }, [])

  const choose = (next: Theme) => {
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('satin-theme', next)
    } catch {}
  }

  return (
    <div className="theme-switch" data-ready={theme ? '' : undefined}>
      <SegmentedControl
        aria-label="Theme"
        size="xs"
        shape="rounded"
        value={theme ?? ''}
        onValueChange={(v) => choose(v as Theme)}
        items={[
          { value: 'light', label: <span className="sr-only">Light</span>, icon: <SunLight aria-hidden strokeWidth={1.25} /> },
          { value: 'dark', label: <span className="sr-only">Dark</span>, icon: <HalfMoon aria-hidden strokeWidth={1.25} /> },
        ]}
      />
    </div>
  )
}
