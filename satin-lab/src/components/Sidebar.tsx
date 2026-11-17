import * as React from 'react'
import { Button, SearchBar, cn } from '@uisatin/ui'
import { ArrowUpRight, Menu, Minus } from 'iconoir-react'
import { allComponents, componentPages, pagesOf, type NavGroup, type NavItem } from '../nav'
import { useScrollLock } from '../lib/scroll-lock'
import { AiPatternsIcon, AllComponentsIcon, ChartsIcon, ChevronDown, ChevronRight, ComponentsIcon, GuidesIcon, IntroIcon, RecipesIcon } from './icons'

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
  charts: ChartsIcon,
  'ai-patterns': AiPatternsIcon,
  guides: GuidesIcon,
  recipes: RecipesIcon,
}

export function Sidebar({ nav, current: currentProp }: { nav: NavGroup[]; current: string }) {
  // The clicked item becomes current at once, before the next page arrives; otherwise it
  // would go pressed → hover → current while the page loads, which reads as a flicker.
  const [current, setCurrent] = React.useState(currentProp)
  React.useEffect(() => setCurrent(currentProp), [currentProp])
  // Groups start open; a parent row (Chart) starts open only when it holds the current page.
  const [open, setOpen] = React.useState<Record<string, boolean>>(() => ({
    ...Object.fromEntries(nav.map((g) => [g.id, true])),
    ...Object.fromEntries(
      nav.flatMap((g) => g.items.filter((i) => i.children).map((i) => [i.id, i.children!.some((c) => c.id === currentProp)])),
    ),
  }))
  const [drawer, setDrawer] = React.useState(false)
  // The search box filters the pages by title; while it has a query every group shows its matches.
  const [query, setQuery] = React.useState('')
  const q = query.trim().toLowerCase()
  // A parent stays when its title or any of its pages matches, showing those pages.
  const match = (items: NavItem[]): NavItem[] =>
    items.flatMap((i) => {
      if (!i.children) return i.title.toLowerCase().includes(q) ? [i] : []
      const kids = i.title.toLowerCase().includes(q) ? i.children : match(i.children)
      return kids.length ? [{ ...i, children: kids }] : []
    })
  const shown = nav.map((g) => ({ ...g, items: q ? match(g.items) : g.items })).filter((g) => !q || g.items.length > 0)
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

  // The list keeps its scroll across page changes and reloads. The sidebar persists, but the router
  // moves its DOM into the new page, and moving an element resets its scroll. Safari also lays the
  // moved list out (and may scroll the focused link into view) after `astro:after-swap`, so one
  // restore there is not enough: the position is recorded on every scroll the user makes, and put
  // back after the swap, on the next two frames and once the page has loaded. While a page change
  // is in flight, scroll events (the reset, Safari's own scrolling) don't overwrite it.
  React.useEffect(() => {
    const KEY = 'satin-docs-nav-scroll'
    const list = () => document.getElementById('docs-nav')
    let top = Number(sessionStorage.getItem(KEY) ?? 0) || 0
    let swapping = false

    const onScroll = (e: Event) => {
      if (swapping || (e.target as HTMLElement).id !== 'docs-nav') return
      top = (e.target as HTMLElement).scrollTop
      try {
        sessionStorage.setItem(KEY, String(top))
      } catch {}
    }
    const put = () => {
      const el = list()
      if (el && el.scrollTop !== top) el.scrollTop = top
    }
    const start = () => {
      swapping = true
    }
    const settle = () => {
      put()
      requestAnimationFrame(() => {
        put()
        requestAnimationFrame(() => {
          put()
          swapping = false
        })
      })
    }

    put()
    // Capture: scroll doesn't bubble, and the list element itself is the target.
    document.addEventListener('scroll', onScroll, true)
    document.addEventListener('astro:before-preparation', start)
    document.addEventListener('astro:after-swap', settle)
    document.addEventListener('astro:page-load', settle)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('astro:before-preparation', start)
      document.removeEventListener('astro:after-swap', settle)
      document.removeEventListener('astro:page-load', settle)
    }
  }, [])

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

  const groupOf = (id: string) => nav.find((g) => pagesOf(g.items).some((i) => i.id === id))?.id

  // One page in the list; `nested` ones sit under a parent row, 12px further in.
  const link = (item: NavItem, nested: boolean) => {
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
            'flex h-8 items-center truncate rounded-pill pr-3 text-[13px] leading-[19.5px]',
            nested ? 'pl-[46px]' : 'pl-[34px]',
            'transition-[background-color,color] duration-(--duration-fast) ease-(--ease-out)',
            'focus-visible:shadow-border-focus focus-visible:outline-none',
            // Positioned, so the row paints above the hover glider, which is its hover fill.
            'relative',
            isCurrent ? 'bg-bg-selected text-text-default' : 'text-text-muted hover:text-text-default active:bg-bg-selected',
          )}
        >
          <Highlight text={item.title} query={q} />
        </a>
      </li>
    )
  }

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
        style={drag != null && !wide ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 w-full rounded-t-2xl border-t border-border-subtle bg-bg-card',
          // The drawer's slide exists only on small screens. On wide ones the sidebar has no
          // translate at all, rather than one overridden: a lost override (Safari, mid page
          // change) would leave it pushed down out of the clipped panel, its column empty.
          'max-lg:transition-transform max-lg:duration-(--duration-slow) max-lg:ease-(--ease-out)',
          drawer ? 'max-lg:translate-y-0' : 'max-lg:translate-y-full',
          'lg:relative lg:inset-auto lg:z-auto lg:w-[246px] lg:shrink-0 lg:rounded-[15px_0_0_0] lg:bg-transparent lg:border-t-0 lg:border-r dark:lg:border-[color-mix(in_oklab,var(--border-subtle)_55%,var(--bg-card))]',
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
                const first = pagesOf(shown[0]?.items ?? [])[0]
                if (e.key === 'Enter' && q && first) window.location.assign(first.href)
              }}
            />
          </div>

          <nav id="docs-nav" aria-label="Documentation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
            {q && shown.length === 0 && <p className="px-3 py-2 text-sm text-text-muted">No pages match “{query.trim()}”.</p>}
            <HoverGlider>
            <ul>
              {/* All components: the first row of the same list as the groups, a page of its own with
                  the count of them. A hidden chevron keeps its count in line with the groups' counts. */}
              {!q && (
                <li>
                  <a
                    href={allComponents.href}
                    aria-current={current === allComponents.id ? 'page' : undefined}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                      setCurrent(allComponents.id)
                      setDrawer(false)
                    }}
                    className={cn(
                      'relative flex h-8 items-center gap-2 rounded-pill px-3',
                      'transition-colors duration-(--duration-fast) ease-(--ease-out)',
                      'focus-visible:shadow-border-focus focus-visible:outline-none',
                      current === allComponents.id ? 'bg-bg-selected' : 'active:bg-bg-selected',
                    )}
                  >
                    <AllComponentsIcon className="shrink-0 text-text-muted" />
                    <span className="min-w-0 flex-1 truncate text-[13px] leading-4 font-medium text-text-default">{allComponents.title}</span>
                    <span data-tone="neutral" className="rounded-sm px-1.5 py-0.5 text-sm leading-[19.5px] text-tone-fg">
                      <span className="sr-only">, </span>
                      {componentPages().length}
                      <span className="sr-only"> pages</span>
                    </span>
                    <ChevronRight className="invisible shrink-0" />
                  </a>
                </li>
              )}
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
                        setOpen((s) => ({ ...s, [group.id]: !s[group.id] }))
                      }}
                      className={cn(
                        'relative flex h-8 w-full items-center gap-2 rounded-pill px-3 text-left select-none',
                        'transition-colors duration-(--duration-fast) ease-(--ease-out)',
                        'active:bg-bg-selected',
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
                          {pagesOf(group.items).length}
                          <span className="sr-only"> pages</span>
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronDown className="shrink-0 text-text-muted" />
                      ) : (
                        <ChevronRight className="shrink-0 text-text-muted" />
                      )}
                    </button>
                    {/* The group grows downwards from under its header, which stays put (satin-expand). */}
                    <div id={listId} data-state={isOpen ? 'open' : 'closed'} className="satin-expand">
                    <ul>
                      {group.items.map((item) =>
                        item.children ? (
                          <NavParent
                            key={item.id}
                            item={item}
                            open={q ? true : !!open[item.id]}
                            onToggle={() => setOpen((s) => ({ ...s, [item.id]: !s[item.id] }))}
                            current={current}
                            renderLink={(child) => link(child, true)}
                            query={q}
                          />
                        ) : (
                          link(item, false)
                        ),
                      )}
                    </ul>
                    </div>
                  </li>
                )
              })}
            </ul>
            </HoverGlider>
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

/**
 * A parent row in the list (Chart): the page row's look with a chevron, folding open onto its
 * pages like a group does (satin-expand). Its title turns text/default while it holds the
 * current page.
 */
function NavParent({
  item,
  open,
  onToggle,
  current,
  renderLink,
  query = '',
}: {
  item: NavItem
  open: boolean
  onToggle: () => void
  current: string
  renderLink: (child: NavItem) => React.ReactNode
  /** The search, lower-cased, to mark in the title. */
  query?: string
}) {
  const listId = `nav-${item.id}`
  const holdsCurrent = item.children!.some((c) => c.id === current)
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={onToggle}
        className={cn(
          'relative flex h-8 w-full items-center gap-2 rounded-pill pr-3 pl-[34px] text-left text-[13px] leading-[19.5px] select-none',
          'transition-[background-color,color] duration-(--duration-fast) ease-(--ease-out)',
          'hover:text-text-default active:bg-bg-selected',
          'focus-visible:shadow-border-focus focus-visible:outline-none',
          holdsCurrent ? 'text-text-default' : 'text-text-muted',
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <Highlight text={item.title} query={query} />
        </span>
        {/* How many pages fold under it, in the group header's counter. */}
        <span data-tone="neutral" className="shrink-0 rounded-sm px-1.5 py-0.5 text-sm leading-[19.5px] text-tone-fg">
          <span className="sr-only">, </span>
          {item.children!.length}
          <span className="sr-only"> pages</span>
        </span>
        {open ? <ChevronDown className="shrink-0 text-text-muted" /> : <ChevronRight className="shrink-0 text-text-muted" />}
      </button>
      <div id={listId} data-state={open ? 'open' : 'closed'} className="satin-expand">
        <ul>{item.children!.map(renderLink)}</ul>
      </div>
    </li>
  )
}

/** Banner / Mesh, Layout=Sidebar (uiKit 3822:3475): 230 wide inside the 246 sidebar. */
/**
 * The design-help banner (uiKit 3857:6969). The minus doesn't dismiss it: it folds to the 44px
 * bar from uiKit 3857:7009 (the title and an arrow on the same mesh), which opens it again. The
 * choice is kept for the visit, across pages and reloads.
 */
function HelpBanner() {
  const KEY = 'satin-help-banner'
  const [open, setOpenState] = React.useState(true)
  // Only a change the user makes animates or moves focus; the stored state on load does neither.
  const toggled = React.useRef(false)
  const swapRef = React.useRef<HTMLButtonElement>(null)
  // The card keeps its element and its height follows the change like the nav's dropdown
  // (satin-expand): --duration-slow when it opens, --duration-base when it folds, on --ease-out.
  // A click mid-way starts from the height it has reached.
  const cardRef = React.useRef<HTMLElement>(null)
  const fromHeight = React.useRef(0)
  const resize = React.useRef<Animation | null>(null)
  React.useLayoutEffect(() => {
    const card = cardRef.current
    if (!toggled.current || !card) return
    resize.current?.cancel()
    const to = card.offsetHeight
    const from = fromHeight.current
    if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const css = getComputedStyle(document.documentElement)
    const ms = (name: string) => parseFloat(css.getPropertyValue(name)) * (css.getPropertyValue(name).trim().endsWith('ms') ? 1 : 1000)
    resize.current = card.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: ms(open ? '--duration-slow' : '--duration-base'),
      easing: css.getPropertyValue('--ease-out').trim() || 'ease-out',
    })
  }, [open])
  React.useEffect(() => {
    if (toggled.current) swapRef.current?.focus()
  }, [open])
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === 'min') setOpenState(false)
    } catch {}
  }, [])
  const setOpen = (next: boolean) => {
    toggled.current = true
    // The height it has now, mid-animation included, is where the next change starts.
    fromHeight.current = cardRef.current?.offsetHeight ?? 0
    setOpenState(next)
    try {
      sessionStorage.setItem(KEY, next ? 'open' : 'min')
    } catch {}
  }

  const surface = cn(
    'relative mx-2 overflow-clip rounded-xl border border-border-default bg-bg-card',
    'shadow-[0_2px_4px_-2px_var(--effect-shadow-sm),0_4px_6px_-1px_var(--effect-shadow-sm)]',
  )
  // The content that comes in fades in over the resize, as the dropdown's rows do.
  const fade = toggled.current && 'animate-[satin-fade-in_var(--duration-base)_var(--ease-out)]'
  const mesh = (
    <>
      <img src="/figma/mesh-light.png" alt="" className="pointer-events-none absolute -inset-px size-[calc(100%+2px)] max-w-none object-cover mix-blend-multiply" />
      <img src="/figma/mesh-dark.png" alt="" className="pointer-events-none absolute -inset-px size-[calc(100%+2px)] max-w-none object-cover mix-blend-screen" />
    </>
  )

  if (!open) {
    return (
      <aside ref={cardRef} aria-label="Design help" className={surface}>
        {mesh}
        <button
          ref={swapRef}
          type="button"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className={cn(
            'group relative flex h-[42px] w-full cursor-pointer items-center justify-between pr-[7px] pl-3 text-left outline-none',
            fade,
            'focus-visible:ring-0 focus-visible:[box-shadow:inset_0_0_0_2px_var(--action-focus-ring)] rounded-[inherit]',
          )}
        >
          <span className="text-sm leading-[18px] font-medium text-text-default">Need design help?</span>
          {/* The 28px tertiary icon button from uiKit, drawn here: a button can't hold a button. */}
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-full text-text-default transition-colors duration-(--duration-fast) ease-(--ease-out) group-hover:bg-bg-hover [&_svg]:size-4 [&_svg]:[stroke-width:1.875]"
          >
            <ArrowUpRight />
          </span>
        </button>
      </aside>
    )
  }

  return (
    <aside ref={cardRef} aria-label="Design help" className={cn(surface, 'flex flex-col gap-3 p-3')}>
      {mesh}
      <div className={cn('relative flex flex-col gap-0.5 pr-6 text-sm', fade)}>
        <p className="leading-[18px] font-medium text-text-default">Need design help?</p>
        <p className="leading-[19.5px] text-text-muted">Get expert product design for your business.</p>
      </div>
      <Button asChild variant="secondary" shape="rounded" className={cn('relative w-full', fade)}>
        <a href="https://cal.com/maciej-kownacki-22br6h/15min" target="_blank" rel="noreferrer" data-track="book_call">
          Book a call
        </a>
      </Button>
      <Button
        ref={swapRef}
        variant="tertiary"
        shape="rounded"
        iconOnly
        aria-label="Minimise banner"
        aria-expanded
        onClick={() => setOpen(false)}
        className="absolute top-[3px] right-[3px] text-text-muted"
      >
        <Minus />
      </Button>
    </aside>
  )
}

/**
 * One hover fill for the whole list that slides from row to row under the pointer. Each row
 * fading its own fill in and out left both half-lit mid-way, so sweeping down the list read
 * as a flicker; one pill that moves keeps the same strength all the way. It fades in where
 * the pointer enters, follows it on --ease-out and fades out when the pointer leaves the list.
 * Mouse only, so a tap doesn't leave it behind. The rows are positioned and paint above it.
 */
function HoverGlider({ children }: { children: React.ReactNode }) {
  const wrap = React.useRef<HTMLDivElement>(null)
  const pill = React.useRef<HTMLSpanElement>(null)
  const shown = React.useRef(false)
  const move = (target: HTMLElement) => {
    const el = pill.current
    const box = wrap.current
    if (!el || !box) return
    const r = target.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    // Entering the list it is put in place at once and only fades in; after that it slides.
    el.style.transitionProperty = shown.current && !reduced ? 'transform, width, height, opacity' : 'opacity'
    el.style.transform = `translate(${r.left - b.left}px, ${r.top - b.top}px)`
    el.style.width = `${r.width}px`
    el.style.height = `${r.height}px`
    el.style.opacity = '1'
    shown.current = true
  }
  const hide = () => {
    if (pill.current) pill.current.style.opacity = '0'
    shown.current = false
  }
  return (
    <div
      ref={wrap}
      className="relative"
      onPointerOver={(e) => {
        if (e.pointerType !== 'mouse') return
        const row = (e.target as Element).closest<HTMLElement>('a, button')
        if (row && wrap.current?.contains(row)) move(row)
      }}
      onPointerLeave={hide}
    >
      <span
        ref={pill}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 rounded-pill bg-bg-hover opacity-0 duration-(--duration-base) ease-(--ease-out)"
      />
      {children}
    </div>
  )
}

/** The title with the part that matches the search in the primary colour, on a 14% tint of it. */
function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-xs bg-[color-mix(in_oklab,var(--action-primary-bg)_14%,transparent)] text-action-primary-bg">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  )
}
