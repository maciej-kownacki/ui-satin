import * as React from 'react'
import { Button, Popover, SegmentedControl, cn, defaultTheme, randomTheme, themeCss, type SatinTheme } from '@satin/ui'
import { ThemeSwitch, setMode } from './ThemeSwitch'
import { Check, ColorPicker, Copy, DiceFive, Download, Palette, Refresh } from 'iconoir-react'

/**
 * The customizer: a button in the top bar, next to Waitlist, that opens a popover with brand,
 * corners and the light / dark switch for the whole site, live. The docs are built from Satin's own components, so the top bar, the sidebar and the
 * switches follow the theme like the previews do. The theme is kept in localStorage so the
 * next page opens with it (Layout.astro injects it before the first paint). Export gives the
 * same stylesheet, to load after `@satin/ui/styles.css`.
 */
// Each preset is already a fill white text reads on at 4.5:1, so the swatch is the button.
export const BRANDS = [
  { name: 'Indigo', hex: '#4633D7' },
  { name: 'Sky', hex: '#0469A5' },
  { name: 'Teal', hex: '#117167' },
  { name: 'Green', hex: '#107436' },
  { name: 'Amber', hex: '#8B5B0A' },
  { name: 'Coral', hex: '#BF2D19' },
  { name: 'Fuchsia', hex: '#A42CB7' },
  { name: 'Graphite', hex: '#3F3F46' },
]
const RADII = [
  { value: 0, label: 'Square', r: 0 },
  { value: 0.5, label: 'Small', r: 3 },
  { value: 1, label: 'Default', r: 6 },
  { value: 1.5, label: 'Large', r: 10 },
]
const STORE = 'satin-custom'
// The theme's stylesheet, read by Layout.astro before the first paint.
const STORE_CSS = 'satin-theme-css'

function apply(theme: SatinTheme) {
  const css = themeCss(theme)
  let el = document.getElementById('satin-custom') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'satin-custom'
    document.head.appendChild(el)
  }
  el.textContent = css
  try {
    localStorage.setItem(STORE, JSON.stringify(theme))
    localStorage.setItem(STORE_CSS, css)
  } catch {}
  return css
}

function load(): SatinTheme {
  try {
    const t = JSON.parse(localStorage.getItem(STORE) ?? 'null')
    // Only what the theme still has: older saves also carried a body size.
    if (t && typeof t.brand === 'string') return { brand: t.brand, radius: typeof t.radius === 'number' ? t.radius : defaultTheme.radius }
  } catch {}
  return defaultTheme
}

/** A corner with the given radius: what each corner choice looks like. */
const Corner = ({ r }: { r: number }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d={r ? `M3 14V${3 + r}a${r} ${r} 0 0 1 ${r}-${r}H14` : 'M3 14V3H14'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export function Customizer() {
  const [theme, setTheme] = React.useState<SatinTheme>(defaultTheme)
  const [copied, setCopied] = React.useState(false)
  const colorRef = React.useRef<HTMLInputElement>(null)

  // Read what the reader chose last time.
  React.useEffect(() => {
    const saved = load()
    setTheme(saved)
    if (JSON.stringify(saved) !== JSON.stringify(defaultTheme)) apply(saved)
  }, [])

  const update = (patch: Partial<SatinTheme>) =>
    setTheme((t) => {
      const next = { ...t, ...patch }
      apply(next)
      return next
    })
  const css = React.useMemo(() => themeCss(theme), [theme])
  const custom = !BRANDS.some((b) => b.hex.toLowerCase() === theme.brand.toLowerCase())
  const isDefault = JSON.stringify(theme) === JSON.stringify(defaultTheme)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(css)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }
  // Everything here: a new brand and corners every time, and light or dark.
  const randomize = () => {
    update(randomTheme(theme))
    setMode(Math.random() < 0.5 ? 'light' : 'dark')
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([css], { type: 'text/css' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'satin-theme.css' })
    a.click()
    URL.revokeObjectURL(url)
  }

  const swatch = (selected: boolean) =>
    cn(
      'grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-(--duration-fast) ease-(--ease-out)',
      'hover:bg-bg-hover focus-visible:shadow-border-focus focus-visible:outline-none',
      selected && 'bg-bg-card dark:bg-white-a16 [box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
    )
  const row = 'flex items-center justify-between gap-3'
  const label = 'text-sm text-text-muted'

  return (
    <Popover
      side="bottom"
      align="end"
      sideOffset={8}
      title="Customize"
      description="Brand and corners for every component, live."
      className="w-[340px]"
      body={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className={label}>Brand</span>
            <div role="radiogroup" aria-label="Brand colour" className="flex items-center justify-between rounded-xl bg-bg-muted p-1 dark:bg-white-a6">
              {BRANDS.map((b) => {
                const selected = b.hex.toLowerCase() === theme.brand.toLowerCase()
                return (
                  <button
                    key={b.hex}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={b.name}
                    title={b.name}
                    onClick={() => update({ brand: b.hex })}
                    className={swatch(selected)}
                  >
                    <span
                      className="size-[18px] rounded-full [box-shadow:inset_0_0_0_1px_rgb(255_255_255/0.18),inset_0_-4px_6px_rgb(0_0_0/0.18)]"
                      style={{ background: b.hex }}
                    />
                  </button>
                )
              })}
              {/* Any colour: the native picker sits next to the swatch, not in it, so no control is nested. */}
              <span className="relative shrink-0">
                <button
                  type="button"
                  role="radio"
                  aria-checked={custom}
                  aria-label="Custom colour"
                  title="Custom colour"
                  onClick={() => colorRef.current?.click()}
                  className={cn(swatch(custom), 'text-text-muted hover:text-text-default')}
                >
                  {custom ? <span className="size-[18px] rounded-full" style={{ background: theme.brand }} /> : <ColorPicker className="size-4" />}
                </button>
                <input
                  ref={colorRef}
                  type="color"
                  tabIndex={-1}
                  aria-hidden
                  value={theme.brand}
                  onChange={(e) => update({ brand: e.target.value })}
                  className="pointer-events-none absolute inset-0 size-full opacity-0"
                />
              </span>
            </div>
          </div>

          <div className={row}>
            <span className={label}>Corners</span>
            <SegmentedControl
              aria-label="Corner radius"
              size="md"
              className="dark:bg-white-a6"
              items={RADII.map((r) => ({ value: String(r.value), label: <span className="sr-only">{r.label}</span>, icon: <Corner r={r.r} /> }))}
              value={String(theme.radius)}
              onValueChange={(v) => update({ radius: Number(v) })}
            />
          </div>

          <div className={row}>
            <span className={label}>Mode</span>
            <ThemeSwitch size="md" className="dark:bg-white-a6" />
          </div>

          <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
            <Button onClick={randomize}>
              <DiceFive />
              Randomize
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={copy}>
                {copied ? <Check /> : <Copy />}
                <span aria-live="polite">{copied ? 'Copied' : 'Copy CSS'}</span>
              </Button>
              <Button variant="secondary" iconOnly aria-label="Download satin-theme.css" title="Download" onClick={download}>
                <Download />
              </Button>
              {!isDefault && (
                <Button variant="tertiary" iconOnly aria-label="Reset theme" title="Reset" onClick={() => update(defaultTheme)}>
                  <Refresh />
                </Button>
              )}
            </div>
          </div>
        </div>
      }
    >
      {/* The same height as Waitlist; a palette alone on phones, where the bar is tight. */}
      <Button variant="secondary" size="lg" shape="rounded" aria-label="Customize">
        <Palette />
        <span className="hidden sm:inline">Customize</span>
      </Button>
    </Popover>
  )
}
