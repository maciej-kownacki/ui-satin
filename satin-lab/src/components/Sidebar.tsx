import * as React from 'react'
import { Button, SearchBar, cn } from '@satin/ui'
import { Menu, Minus } from 'iconoir-react'
import type { NavGroup } from '../nav'
import { useScrollLock } from '../lib/scroll-lock'
import { AiPatternsIcon, ChevronDown, ChevronRight, ComponentsIcon, IntroIcon } from './icons'

/**
 * navigationSidebar from the docs template (uiKit 3857:5977): group headers with an icon,
 * a count and a chevron (right when closed, down when open), items indented under the
 * label, the current page as a filled pill, and the design-help banner at the bottom.
 * Below 1024px it becomes a full-width bottom drawer with a handle, behind a menu button
 * left of the logo.
 */
const groupIcons: Record<string, typeof IntroIcon> = {
  docs: IntroIcon,
  components: ComponentsIcon,
  'ai-patterns': AiPatternsIcon,
}

export function Sidebar({ nav, current: currentProp }: { nav: NavGroup[]; current: string }) {
  // The clicked item becomes current at once, before the next page arrives; otherwise it
  // would go pressed → hover → current while the page loads, which reads as a flicker.
  const [current, setCurrent] = React.useState(currentProp)
  React.useEffect(() => setCurrent(currentProp), [currentProp])
  const [open, setOpen] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(nav.map((g) => [g.id, true])),
  )
  // Groups the user has opened or closed; only their lists animate, never on page load.
  const [toggled, setToggled] = React.useState<Record<string, boolean>>({})
  const [drawer, setDrawer] = React.useState(false)
  // The search box filters the pages by title; while it has a query every group shows its matches.
  const [query, setQuery] = React.useState('')
  const q = query.trim().toLowerCase()
  const shown = nav
    .map((g) => ({ ...g, items: q ? g.items.filter((i) => i.title.toLowerCase().includes(q)) : g.items }))
    .filter((g) => !q || g.items.length > 0)
  const [wide, setWide] = React.useState(true)
  const menuRef = React.useRef<HTMLButtonElement>(null)
  const asideRef = React.useRef<HTMLElement>(null)
  const backdropRef = React.useRef<HTMLDivElement>(null)
  // Closing with the handle, the backdrop or Escape gives focus back to the menu button;
  // picking a page doesn't, since the next page takes it.
  const returnFocus = React.useRef(false)
  // How far the drawer has been dragged down by its handle; null when nobody is dragging.
  const [drag, setDrag] = React.useState<number | null>(null)
  const dragFrom = React.useRef(0)
  const dragged = React.useRef(false)

  const close = () => {
    returnFocus.current = true
    setDrawer(false)
  }

  React.useEffect(() => {
    const mq = matchMedia('(min-width: 1024px)')
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useScrollLock(drawer && !wide)

  // The drawer closes on Escape and gives focus back to the menu button.
  React.useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  // The open drawer is modal: everything behind it is inert, so Tab stays in the drawer and
  // screen readers don't wander off. Focus starts on the current page.
  React.useEffect(() => {
    const aside = asideRef.current
    if (!drawer || wide || !aside) return
    const inerted: Element[] = []
    for (let el: Element = aside; el.parentElement && el !== document.body; el = el.parentElement) {
      for (const sibling of el.parentElement.children) {
        if (sibling === el || sibling === backdropRef.current || sibling.hasAttribute('inert')) continue
        sibling.setAttribute('inert', '')
        inerted.push(sibling)
      }
    }
    const start = aside.querySelector<HTMLElement>('[aria-current="page"]') ?? aside.querySelector<HTMLElement>('a, button')
    start?.focus()
    return () => {
      inerted.forEach((el) => el.removeAttribute('inert'))
      if (returnFocus.current) menuRef.current?.focus()
      returnFocus.current = false
    }
  }, [drawer, wide])

  const groupOf = (id: string) => nav.find((g) => g.items.some((i) => i.id === id))?.id

  return (
    <>
      {/* Small screens: the menu button sits in the top bar, left of the logo. */}
      <Button
        ref={menuRef}
        variant="tertiary"
        size="lg"
        shape="rounded"
        iconOnly
        aria-label="Open menu"
        aria-expanded={drawer}
        aria-controls="sidebar"
        onClick={() => setDrawer(true)}
        className="fixed top-[calc(28px-var(--control-height-lg)/2)] left-2 z-30 lg:hidden"
      >
        <Menu />
      </Button>

      {drawer && <div ref={backdropRef} aria-hidden onClick={close} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}

      <aside
        ref={asideRef}
        id="sidebar"
        role={wide ? undefined : 'dialog'}
        aria-modal={(!wide && drawer) || undefined}
        aria-label={wide ? undefined : 'Menu'}
        // Off screen on small viewports: keep it out of the tab order until the drawer opens.
        inert={!wide && !drawer}
        style={drag != null ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 w-full rounded-t-2xl border-t border-border-subtle bg-bg-card',
          'transition-transform duration-(--duration-slow) ease-(--ease-out)',
          drawer ? 'translate-y-0' : 'translate-y-full',
          'lg:relative lg:inset-auto lg:z-auto lg:w-[246px] lg:shrink-0 lg:translate-y-0 lg:rounded-none lg:border-t-0 lg:border-r lg:transition-none',
        )}
      >
        <div className="flex h-[85dvh] flex-col gap-2 pb-[max(8px,env(safe-area-inset-bottom))] lg:h-full lg:py-2">
          {/* Small screens: the handle. Drag it down or tap it to close the drawer. */}
          <button
            type="button"
            aria-label="Close menu"
            onPointerDown={(e) => {
              try {
                e.currentTarget.setPointerCapture(e.pointerId)
              } catch {}
              dragFrom.current = e.clientY
              dragged.current = false
              setDrag(0)
            }}
            onPointerMove={(e) => {
              if (drag == null) return
              const dy = Math.max(0, e.clientY - dragFrom.current)
              if (dy > 4) dragged.current = true
              setDrag(dy)
            }}
            onPointerUp={() => {
              if (dragged.current && (drag ?? 0) > 80) close()
              setDrag(null)
            }}
            // A tap, Enter or Space closes it; a drag that didn't go far enough springs back.
            onClick={(e) => {
              // detail is 0 for Enter and Space, which never come after a drag.
              if (e.detail === 0 || !dragged.current) close()
            }}
            onPointerCancel={() => setDrag(null)}
            className="flex h-6 w-full shrink-0 cursor-grab touch-none items-center justify-center rounded-t-2xl focus-visible:shadow-border-focus focus-visible:outline-none lg:hidden"
          >
            <span aria-hidden className="h-1 w-9 rounded-full bg-border-strong" />
          </button>

          <div className="shrink-0 px-2">
            <SearchBar
              aria-label="Search the docs"
              aria-controls="docs-nav"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter opens the first match.
                const first = shown[0]?.items[0]
                if (e.key === 'Enter' && q && first) window.location.assign(first.href)
              }}
            />
          </div>

          <nav id="docs-nav" aria-label="Documentation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
            {q && shown.length === 0 && <p className="px-3 py-2 text-sm text-text-muted">No pages match “{query.trim()}”.</p>}
            <ul>
              {shown.map((group) => {
                const isOpen = q ? true : open[group.id]
                const listId = `nav-${group.id}`
                const Icon = groupIcons[group.id] ?? IntroIcon
                const active = groupOf(current) === group.id
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={listId}
                      data-active={active || undefined}
                      onClick={() => {
                        setToggled((t) => ({ ...t, [group.id]: true }))
                        setOpen((s) => ({ ...s, [group.id]: !s[group.id] }))
                      }}
                      className={cn(
                        'flex h-8 w-full items-center gap-2 rounded-pill px-3 text-left select-none',
                        'transition-colors duration-(--duration-fast) ease-(--ease-out)',
                        'hover:bg-bg-hover active:bg-bg-selected',
                        'focus-visible:shadow-border-focus focus-visible:outline-none',
                      )}
                    >
                      <Icon className="shrink-0 text-text-muted" />
                      <span className="min-w-0 flex-1 truncate text-[13px] leading-4 font-medium text-text-default">
                        {group.title}
                      </span>
                      {group.id !== 'docs' && (
                        <span data-tone="neutral" className="rounded-sm px-1.5 py-0.5 text-sm leading-[19.5px] text-tone-fg">
                          <span className="sr-only">, </span>
                          {group.items.length}
                          <span className="sr-only"> pages</span>
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronDown className="shrink-0 text-text-muted" />
                      ) : (
                        <ChevronRight className="shrink-0 text-text-muted" />
                      )}
                    </button>
                    <ul
                      id={listId}
                      hidden={!isOpen}
                      data-state={isOpen ? 'open' : 'closed'}
                      className={cn(toggled[group.id] && 'satin-collapsible')}
                    >
                      {group.items.map((item) => {
                        const isCurrent = item.id === current
                        return (
                          <li key={item.id}>
                            <a
                              href={item.href}
                              aria-current={isCurrent ? 'page' : undefined}
                              onClick={(e) => {
                                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                                setCurrent(item.id)
                                setDrawer(false)
                              }}
                              className={cn(
                                'flex h-8 items-center truncate rounded-pill pr-3 pl-[34px] text-[13px] leading-[19.5px]',
                                'transition-[background-color,color] duration-(--duration-fast) ease-(--ease-out)',
                                'focus-visible:shadow-border-focus focus-visible:outline-none',
                                isCurrent
                                  ? 'bg-bg-selected text-text-default'
                                  : 'text-text-muted hover:bg-bg-hover hover:text-text-default active:bg-bg-selected',
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

          {/* The banner stays pinned under the list, which scrolls on its own. */}
          <div className="shrink-0">
            <HelpBanner />
          </div>
        </div>
      </aside>
    </>
  )
}

/** Banner / Mesh, Layout=Sidebar (uiKit 3822:3475): 230 wide inside the 246 sidebar. */
function HelpBanner() {
  const [open, setOpen] = React.useState(true)
  if (!open) return null
  return (
    <aside
      aria-label="Design help"
      className={cn(
        'relative mx-2 flex flex-col gap-3 overflow-clip rounded-xl border border-border-default bg-bg-card p-3',
        'shadow-[0_2px_4px_-2px_var(--effect-shadow-sm),0_4px_6px_-1px_var(--effect-shadow-sm)]',
      )}
    >
      <img src="/figma/mesh-light.png" alt="" className="pointer-events-none absolute -inset-px size-[calc(100%+2px)] max-w-none object-cover mix-blend-multiply" />
      <img src="/figma/mesh-dark.png" alt="" className="pointer-events-none absolute -inset-px size-[calc(100%+2px)] max-w-none object-cover mix-blend-screen" />
      <div className="relative flex flex-col gap-0.5 pr-6 text-sm">
        <p className="leading-[18px] font-medium text-text-default">Need design help?</p>
        <p className="leading-[19.5px] text-text-muted">Get expert product design for your business.</p>
      </div>
      <Button variant="secondary" shape="rounded" className="relative w-full">
        Book a call
      </Button>
      <Button
        variant="tertiary"
        shape="rounded"
        iconOnly
        aria-label="Hide banner"
        onClick={() => setOpen(false)}
        className="absolute top-[3px] right-[3px] text-text-muted"
      >
        <Minus />
      </Button>
    </aside>
  )
}
