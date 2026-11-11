import * as React from 'react'
import { createPortal } from 'react-dom'
import { Button, Popover, SegmentedControl, cn, defaultTheme, randomTheme, themeCss, type SatinTheme } from '@satin/ui'
import { ThemeSwitch, setMode } from './ThemeSwitch'
import { useScrollLock } from '../lib/scroll-lock'
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
  const [sheet, setSheet] = React.useState(false)
  const [narrow, setNarrow] = React.useState(false)
  React.useEffect(() => {
    const mq = matchMedia('(max-width: 1023px)')
    const sync = () => {
      setNarrow(mq.matches)
      if (!mq.matches) setSheet(false)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
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
  // A new preset brand (never the current one) and new corners from randomTheme.
  const randomize = () => {
    const brands = BRANDS.filter((b) => b.hex.toLowerCase() !== theme.brand.toLowerCase())
    update({ ...randomTheme(theme), brand: brands[Math.floor(Math.random() * brands.length)].hex })
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

  const panel = (
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

        <div className="grid grid-cols-2 gap-2 border-t border-border-subtle pt-4">
          <Button size="lg" onClick={randomize}>
            <DiceFive />
            Randomize
          </Button>
          <Button variant="secondary" size="lg" aria-label="Download satin-theme.css" onClick={download}>
            <Download />
            Download
          </Button>
        </div>
      </div>
  )

  // Copy and Reset sit in the header, where a close button would be: plain, out of the way.
  const tools = (
    <div className="flex items-center gap-0.5">
      <Button variant="tertiary" size="xs" iconOnly aria-label={copied ? 'Copied' : 'Copy CSS'} title="Copy CSS" onClick={copy}>
        {/* Iconoir's copy draws smaller inside its box than refresh, so it gets 18px to match; the
            stroke scales back so the line stays the DS's 1.09px, like refresh at 14. */}
        {copied ? <Check /> : <Copy className="!size-[18px]" style={{ strokeWidth: (1.875 * 14) / 18 }} />}
        <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
      </Button>
      <Button variant="tertiary" size="xs" iconOnly aria-label="Reset theme" title="Reset" disabled={isDefault} onClick={() => update(defaultTheme)}>
        <Refresh />
      </Button>
    </div>
  )

  const trigger = (props: React.ComponentProps<typeof Button>) => (
    // The same height as Waitlist; a palette alone on phones, where the bar is tight.
    <Button variant="secondary" size="lg" shape="rounded" aria-label="Customize" {...props}>
      <Palette />
      <span className="hidden sm:inline">Customize</span>
    </Button>
  )

  // Below 1024px the docs use bottom drawers (the page list too), so this opens as one as well.
  if (narrow)
    return (
      <>
        {trigger({ onClick: () => setSheet(true), 'aria-expanded': sheet, 'aria-haspopup': 'dialog' })}
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Customize" description="Brand and corners for every component, live." actions={tools}>
          {panel}
        </Sheet>
      </>
    )

  return (
    <Popover
      side="bottom"
      align="end"
      sideOffset={8}
      title="Customize"
      description="Brand and corners for every component, live."
      className="w-[340px]"
      closeButton={false}
      // While the theme change sweeps across, the browser sends every press to the root element
      // (the View Transition covers the page), which would read as a click outside and close
      // the panel mid-switch. Ignore those until the sweep is done.
      onInteractOutside={(e) => {
        if (document.documentElement.hasAttribute('data-theme-sweep')) e.preventDefault()
      }}
      body={
        <>
          <div className="absolute top-1.5 right-1.5">{tools}</div>
          {panel}
        </>
      }
    >
      {trigger({})}
    </Popover>
  )
}

/**
 * A bottom drawer like the page list's: full width, a handle on top that closes it on a tap
 * or a drag down, a dimmed page behind that doesn't scroll, Escape to close. It portals to
 * body so the top bar's stacking doesn't hold it.
 */
function Sheet({
  open,
  onClose,
  actions,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const [mounted, setMounted] = React.useState(false)
  const [drag, setDrag] = React.useState<number | null>(null)
  const from = React.useRef(0)
  const dragged = React.useRef(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  React.useEffect(() => setMounted(true), [])
  useScrollLock(open)

  // Focus moves into the drawer when it opens and back to what had it (the trigger) when it closes.
  React.useEffect(() => {
    if (!open) return
    const before = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('button, [href], input')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      before?.focus({ preventScroll: true })
    }
  }, [open])

  if (!mounted) return null
  return createPortal(
    <>
      {open && <div aria-hidden onClick={onClose} className="fixed inset-0 z-40 bg-black/40" />}
      <div
        ref={ref}
        role="dialog"
        aria-modal={open || undefined}
        aria-labelledby={titleId}
        inert={!open}
        style={drag != null ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] w-full flex-col rounded-t-2xl border-t border-border-subtle bg-bg-card',
          'pb-[max(16px,env(safe-area-inset-bottom))] transition-transform duration-(--duration-slow) ease-(--ease-out)',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <button
          type="button"
          aria-label="Close"
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {}
            from.current = e.clientY
            dragged.current = false
            setDrag(0)
          }}
          onPointerMove={(e) => {
            if (drag == null) return
            const dy = Math.max(0, e.clientY - from.current)
            if (dy > 4) dragged.current = true
            setDrag(dy)
          }}
          onPointerUp={() => {
            if (dragged.current && (drag ?? 0) > 80) onClose()
            setDrag(null)
          }}
          onPointerCancel={() => setDrag(null)}
          // A tap, Enter or Space closes it; a drag that didn't go far enough springs back.
          onClick={(e) => {
            if (e.detail === 0 || !dragged.current) onClose()
          }}
          className="flex h-6 w-full shrink-0 cursor-grab touch-none items-center justify-center rounded-t-2xl focus-visible:shadow-border-focus focus-visible:outline-none"
        >
          <span aria-hidden className="h-1 w-9 rounded-full bg-border-strong" />
        </button>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p id={titleId} className="text-base font-medium text-text-default">
                {title}
              </p>
              <p className="text-sm text-text-muted">{description}</p>
            </div>
            {actions}
          </div>
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}
