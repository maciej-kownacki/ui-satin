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
  const apply = () => {
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem('satin-theme', next)
    } catch {}
    window.dispatchEvent(new CustomEvent('satin-mode', { detail: next }))
  }
  const root = document.documentElement
  const same = root.classList.contains('dark') === (next === 'dark')
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const start = (document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }).startViewTransition
  if (same || reduce || !start || root.hasAttribute('data-theme-sweep')) return apply()
  sweep(start.bind(document), apply)
}

/**
 * The theme change as a curtain, like Glimmer's band but much quieter: the new theme is laid over
 * the whole screen from left to right behind a soft 12%-wide edge, and a faint prism band
 * (glimm.dev's cyan → indigo → magenta, through Glimmer's pixel grid) rides that edge. 600 ms,
 * ease-in-out since it crosses the screen. Without View Transitions, or under reduced motion, the
 * theme just changes. Styles in lab.css (`data-theme-sweep`).
 */
function sweep(start: (cb: () => void) => { finished: Promise<void> }, apply: () => void) {
  const root = document.documentElement
  root.setAttribute('data-theme-sweep', '')
  let band: HTMLElement | null = null
  const t = start(() => {
    apply()
    // Exists only in the new state, so it gets its own layer above the page for the ride.
    band = document.createElement('div')
    band.className = 'theme-sweep-band'
    band.setAttribute('aria-hidden', 'true')
    document.body.appendChild(band)
  })
  t.finished.finally(() => {
    band?.remove()
    root.removeAttribute('data-theme-sweep')
  })
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
