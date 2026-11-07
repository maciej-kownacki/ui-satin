import * as React from 'react'
import { SegmentedControl } from '@satin/ui'
import { HalfMoon, SunLight } from 'iconoir-react'

/**
 * The light / dark switch (uiKit 3857:6060), in the customizer bar. Until someone picks one,
 * the page follows the system setting; a pick is remembered in localStorage.
 */
type Theme = 'light' | 'dark'

/** Sets light or dark for the site and tells every switch on the page. */
export function setMode(next: Theme) {
  document.documentElement.classList.toggle('dark', next === 'dark')
  try {
    localStorage.setItem('satin-theme', next)
  } catch {}
  window.dispatchEvent(new CustomEvent('satin-mode', { detail: next }))
}

const systemTheme = (): Theme => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function ThemeSwitch({ size = 'xs', className }: { size?: 'xs' | 'md' | 'lg'; className?: string }) {
  // Unknown until mounted: the server can't know the theme, so lab.css marks the right
  // segment from the class on <html> until then, and nothing jumps on load.
  const [theme, setTheme] = React.useState<Theme | null>(null)

  React.useLayoutEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem('satin-theme')
    } catch {}
    setTheme(saved === 'light' || saved === 'dark' ? saved : systemTheme())
    // Randomize in the customizer can change the mode too.
    const onMode = (e: Event) => setTheme((e as CustomEvent<Theme>).detail)
    window.addEventListener('satin-mode', onMode)
    return () => window.removeEventListener('satin-mode', onMode)
  }, [])

  const choose = (next: Theme) => {
    setTheme(next)
    setMode(next)
  }

  return (
    <div className="theme-switch" data-ready={theme ? '' : undefined}>
      <SegmentedControl
        aria-label="Theme"
        size={size}
        shape={size === 'xs' ? 'rounded' : 'default'}
        className={className}
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
