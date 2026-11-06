import * as React from 'react'
import { Button, SegmentedControl, cn } from '@satin/ui'
import { HalfMoon, Menu, NavArrowDown, NavArrowRight, SunLight, Xmark, Computer } from 'iconoir-react'
import type { NavGroup } from '../nav'

/**
 * The left column: groups that open and close (chevronRight closed, chevronDown open),
 * their items, and the theme switch. The item whose section is on screen is marked
 * current. Below 1024px it becomes a drawer behind a menu button.
 */
export function Sidebar({ nav }: { nav: NavGroup[] }) {
  const [open, setOpen] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(nav.map((g) => [g.id, true])),
  )
  const [current, setCurrent] = React.useState(nav[0]?.items[0]?.id ?? '')
  const [drawer, setDrawer] = React.useState(false)
  const menuRef = React.useRef<HTMLButtonElement>(null)
  const [wide, setWide] = React.useState(true)

  React.useEffect(() => {
    const mq = matchMedia('(min-width: 1024px)')
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Scroll spy: the current item is the last section whose top has passed the upper third.
  React.useEffect(() => {
    const ids = nav.flatMap((g) => g.items.map((i) => i.id))
    const sections = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    const update = () => {
      const line = window.innerHeight * 0.3
      let id = ids[0]
      for (const el of sections) if (el.getBoundingClientRect().top <= line) id = el.id
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      setCurrent(atBottom ? ids[ids.length - 1] : id)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [nav])

  // The drawer closes on Escape and gives focus back to the menu button.
  React.useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setDrawer(false)
      menuRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  const groupOf = (id: string) => nav.find((g) => g.items.some((i) => i.id === id))?.id

  const panel = (
    <div className="flex h-full flex-col">
      <a href="#what-is-satin" className="mb-6 flex h-8 items-center gap-2 px-2 text-base font-semibold text-text-default">
        <span aria-hidden className="size-5 rounded-md bg-action-primary-bg shadow-primary" />
        Satin
      </a>
      <nav aria-label="Documentation" className="flex-1 overflow-y-auto">
        <ul className="grid gap-4">
          {nav.map((group) => {
            const isOpen = open[group.id]
            const listId = `nav-${group.id}`
            const active = groupOf(current) === group.id
            return (
              <li key={group.id}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={listId}
                  data-active={active || undefined}
                  onClick={() => setOpen((s) => ({ ...s, [group.id]: !s[group.id] }))}
                  className={cn(
                    'flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-left text-xs font-medium text-text-subtle select-none',
                    'transition-[background-color,color] duration-(--duration-fast) ease-(--ease-out)',
                    'hover:bg-bg-hover hover:text-text-default active:bg-bg-selected data-active:text-text-muted',
                    'focus-visible:shadow-border-focus focus-visible:outline-none',
                  )}
                >
                  {isOpen ? (
                    <NavArrowDown aria-hidden className="size-icon-size-sm" />
                  ) : (
                    <NavArrowRight aria-hidden className="size-icon-size-sm" />
                  )}
                  {group.title}
                </button>
                <ul id={listId} hidden={!isOpen} className="satin-collapsible mt-1 grid gap-0.5" data-state={isOpen ? 'open' : 'closed'}>
                  {group.items.map((item) => {
                    const isCurrent = item.id === current
                    return (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          aria-current={isCurrent ? 'location' : undefined}
                          onClick={() => setDrawer(false)}
                          className={cn(
                            'flex h-8 items-center rounded-md pr-2 pl-[30px] text-sm text-text-muted',
                            'transition-[background-color,color] duration-(--duration-fast) ease-(--ease-out)',
                            'hover:bg-bg-hover hover:text-text-default active:bg-bg-selected',
                            'focus-visible:shadow-border-focus focus-visible:outline-none',
                            isCurrent && 'bg-bg-selected font-medium text-text-default hover:bg-bg-selected',
                          )}
                        >
                          {item.title}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      </nav>
      <ThemeSwitch />
    </div>
  )

  return (
    <>
      {/* Small screens: a top bar with the menu button. */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-bg-canvas/90 px-4 backdrop-blur lg:hidden">
        <a href="#what-is-satin" className="flex items-center gap-2 text-base font-semibold text-text-default">
          <span aria-hidden className="size-5 rounded-md bg-action-primary-bg shadow-primary" />
          Satin
        </a>
        <Button
          ref={menuRef}
          variant="tertiary"
          size="lg"
          iconOnly
          aria-label="Open menu"
          aria-expanded={drawer}
          aria-controls="sidebar"
          onClick={() => setDrawer(true)}
        >
          <Menu />
        </Button>
      </div>

      {drawer && (
        <div
          aria-hidden
          onClick={() => setDrawer(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        id="sidebar"
        // Off screen on small viewports: keep it out of the tab order until the drawer opens.
        inert={!wide && !drawer}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-border-subtle bg-bg-canvas p-3',
          'transition-transform duration-(--duration-slow) ease-(--ease-out)',
          drawer ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0 lg:border-r-0 lg:transition-none',
        )}
      >
        {drawer && (
          <Button
            variant="tertiary"
            size="lg"
            iconOnly
            aria-label="Close menu"
            onClick={() => {
              setDrawer(false)
              menuRef.current?.focus()
            }}
            className="absolute top-3 right-3 lg:hidden"
          >
            <Xmark />
          </Button>
        )}
        {panel}
      </aside>
    </>
  )
}

type Theme = 'light' | 'dark' | 'system'

function readTheme(): Theme {
  try {
    const t = localStorage.getItem('satin-theme')
    if (t === 'light' || t === 'dark') return t
  } catch {}
  return 'system'
}

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

function ThemeSwitch() {
  const [theme, setTheme] = React.useState<Theme>('system')

  React.useEffect(() => setTheme(readTheme()), [])
  React.useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return (
    <div className="pt-3">
      <SegmentedControl
        aria-label="Theme"
        size="xs"
        fullWidth
        value={theme}
        onValueChange={(v) => {
          const next = v as Theme
          setTheme(next)
          try {
            if (next === 'system') localStorage.removeItem('satin-theme')
            else localStorage.setItem('satin-theme', next)
          } catch {}
        }}
        items={[
          { value: 'light', label: <span className="sr-only">Light</span>, icon: <SunLight aria-hidden /> },
          { value: 'dark', label: <span className="sr-only">Dark</span>, icon: <HalfMoon aria-hidden /> },
          { value: 'system', label: <span className="sr-only">System</span>, icon: <Computer aria-hidden /> },
        ]}
      />
    </div>
  )
}
