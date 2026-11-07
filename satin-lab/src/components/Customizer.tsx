import * as React from 'react'
import { Button, Popover, SegmentedControl, cn, defaultTheme, randomTheme, themeCss, type SatinTheme } from '@satin/ui'
import { ThemeSwitch } from './ThemeSwitch'
import { Check, ColorPicker, Copy, DiceFive, Download, NavArrowDown, NavArrowUp, Palette, Refresh } from 'iconoir-react'

/**
 * The customizer bar: brand, corners and body size for the whole site, live, plus the light /
 * dark switch. The docs are built from Satin's own components, so the top bar, the sidebar and
 * the switches follow the theme like the previews do; only the content scale is limited to
 * what the components show, since the docs' own text is fixed. The theme is kept in
 * localStorage so the next page opens with it (Layout.astro injects it before the first
 * paint). Export gives the same stylesheet, to load after `@satin/ui/styles.css`.
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
    if (t && typeof t.brand === 'string') return { ...defaultTheme, ...t }
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
  const [open, setOpen] = React.useState(true)
  const [copied, setCopied] = React.useState(false)
  const colorRef = React.useRef<HTMLInputElement>(null)

  // Read what the reader chose last time. Below 1280px the bar stacks, so it starts collapsed.
  React.useEffect(() => {
    const saved = load()
    setTheme(saved)
    if (JSON.stringify(saved) !== JSON.stringify(defaultTheme)) apply(saved)
    setOpen(matchMedia('(min-width: 1280px)').matches)
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
  const download = () => {
    const url = URL.createObjectURL(new Blob([css], { type: 'text/css' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'satin-theme.css' })
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!open)
    return (
      <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
        <Button variant="secondary" shape="rounded" size="lg" onClick={() => setOpen(true)} aria-expanded={false} className="shadow-lg">
          <Palette />
          Customize
        </Button>
      </div>
    )

  const group = 'flex items-center gap-1 rounded-xl bg-bg-muted p-1 dark:bg-white-a6'
  const track = 'dark:bg-white-a6'
  const label = 'text-sm text-text-muted xl:sr-only'

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center md:px-4">
      <section
        aria-label="Customize Satin"
        className={cn(
          'pointer-events-auto flex w-full flex-col gap-3 md:max-w-[440px] rounded-t-2xl border border-b-0 border-border-default bg-bg-popover p-3 pb-[max(12px,env(safe-area-inset-bottom))] xl:w-auto xl:max-w-none xl:flex-row xl:items-center xl:gap-2 xl:p-2',
          // Option groups read lighter than the bar in Dark, and the picked option lighter still.
          'dark:[--component-segmented-selected:var(--color-white-a16)]',
          '[box-shadow:0_10px_30px_-8px_var(--effect-shadow-md),0_4px_6px_-4px_var(--effect-shadow-sm),inset_0_1px_0_0_var(--effect-highlight-top)]',
        )}
      >
        {/* Brand: on phones the label sits above, so all nine swatches fit in one row. */}
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-3">
          <span className={label}>Brand</span>
          <div role="radiogroup" aria-label="Brand colour" className={cn(group, 'justify-between xl:justify-start')}>
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
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-lg transition-colors md:size-8 duration-(--duration-fast) ease-(--ease-out)',
                    'hover:bg-bg-hover focus-visible:shadow-border-focus focus-visible:outline-none',
                    selected && 'bg-bg-card dark:bg-white-a16 [box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
                  )}
                >
                  <span
                    className="size-5 rounded-full [box-shadow:inset_0_0_0_1px_rgb(255_255_255/0.18),inset_0_-4px_6px_rgb(0_0_0/0.18)]"
                    style={{ background: b.hex }}
                  />
                </button>
              )
            })}
            {/* Any colour: the native picker, behind a swatch that shows the current custom pick.
                The input sits next to the button, not in it, so no control is nested in another. */}
            <span className="relative shrink-0">
              <button
                type="button"
                role="radio"
                aria-checked={custom}
                aria-label="Custom colour"
                title="Custom colour"
                onClick={() => colorRef.current?.click()}
                className={cn(
                  'grid size-7 place-items-center rounded-lg text-text-muted transition-colors duration-(--duration-fast) ease-(--ease-out) md:size-8',
                  'hover:bg-bg-hover hover:text-text-default focus-visible:shadow-border-focus focus-visible:outline-none',
                  custom && 'bg-bg-card dark:bg-white-a16 [box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
                )}
              >
                {custom ? <span className="size-5 rounded-full" style={{ background: theme.brand }} /> : <ColorPicker className="size-4" />}
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

        <span aria-hidden className="hidden h-8 w-px bg-border-subtle xl:block" />

        {/* Corners */}
        <div className="flex items-center justify-between gap-3">
          <span className={label}>Corners</span>
          <SegmentedControl
            aria-label="Corner radius"
            size="lg"
            className={track}
            items={RADII.map((r) => ({ value: String(r.value), label: <span className="sr-only">{r.label}</span>, icon: <Corner r={r.r} /> }))}
            value={String(theme.radius)}
            onValueChange={(v) => update({ radius: Number(v) })}
          />
        </div>

        <span aria-hidden className="hidden h-8 w-px bg-border-subtle xl:block" />

        {/* Body size */}
        <div className="flex items-center justify-between gap-3">
          <span className={label}>Body text</span>
          <SegmentedControl
            aria-label="Body text size"
            size="lg"
            className={track}
            items={[
              { value: '13', label: '13' },
              { value: '14', label: '14' },
            ]}
            value={String(theme.fontSize)}
            onValueChange={(v) => update({ fontSize: Number(v) as 13 | 14 })}
          />
        </div>

        <span aria-hidden className="hidden h-8 w-px bg-border-subtle xl:block" />

        {/* Light / dark, for the whole site */}
        <div className="flex items-center justify-between gap-3">
          <span className={label}>Mode</span>
          <ThemeSwitch size="lg" className={track} />
        </div>

        <span aria-hidden className="hidden h-8 w-px bg-border-subtle xl:block" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Popover
            side="top"
            align="end"
            sideOffset={12}
            title="Export theme"
            description="Load it after @satin/ui/styles.css. It only sets variables, so every component follows."
            body={
              <>
                <pre className="code-block max-h-56 overflow-auto rounded-lg bg-bg-field py-2 text-xs">
                  <code className="block px-3 whitespace-pre">{css}</code>
                </pre>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={copy}>
                    {copied ? <Check /> : <Copy />}
                    <span aria-live="polite">{copied ? 'Copied' : 'Copy CSS'}</span>
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={download}>
                    <Download />
                    Download
                  </Button>
                </div>
              </>
            }
          >
            <Button variant="secondary" size="lg" className="flex-1 xl:flex-none">
              Export
              <NavArrowUp />
            </Button>
          </Popover>
          {!isDefault && (
            <Button variant="tertiary" size="lg" iconOnly aria-label="Reset theme" title="Reset" onClick={() => update(defaultTheme)}>
              <Refresh />
            </Button>
          )}
          <Button size="lg" className="flex-1 xl:flex-none" onClick={() => update(randomTheme())}>
            <DiceFive />
            Randomize
          </Button>
          <Button
            variant="tertiary"
            size="lg"
            iconOnly
            aria-label="Hide customizer"
            title="Hide"
            onClick={() => setOpen(false)}
            className="text-text-muted"
          >
            <NavArrowDown />
          </Button>
        </div>
      </section>
    </div>
  )
}
