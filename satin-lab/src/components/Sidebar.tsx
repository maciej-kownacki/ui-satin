import * as React from 'react'
import { Button, cn } from '@satin/ui'
import { Menu, Minus, Xmark } from 'iconoir-react'
import type { NavGroup } from '../nav'
import { AiPatternsIcon, ChevronDown, ChevronRight, ComponentsIcon, IntroIcon } from './icons'

/**
 * navigationSidebar from the docs template (uiKit 3857:5977): group headers with an icon,
 * a count and a chevron (right when closed, down when open), items indented under the
 * label, the current page as a filled pill, and the design-help banner at the bottom.
 * Below 1024px it becomes a drawer behind a menu button.
 */
const groupIcons: Record<string, typeof IntroIcon> = {
  intro: IntroIcon,
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
  const [wide, setWide] = React.useState(true)
  const menuRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const mq = matchMedia('(min-width: 1024px)')
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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

  return (
    <>
      {/* Small screens: the menu button sits in the top bar. */}
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
        className="fixed top-3 right-3 z-30 lg:hidden"
      >
        <Menu />
      </Button>

      {drawer && <div aria-hidden onClick={() => setDrawer(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}

      <aside
        id="sidebar"
        // Off screen on small viewports: keep it out of the tab order until the drawer opens.
        inert={!wide && !drawer}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[246px] border-r border-border-subtle bg-bg-card',
          'transition-transform duration-(--duration-slow) ease-(--ease-out)',
          drawer ? 'translate-x-0' : '-translate-x-full',
          'lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:shrink-0 lg:transition-none',
        )}
      >
        <div className="flex h-dvh flex-col gap-2 py-2 lg:h-full">
          {drawer && (
            <Button
              variant="tertiary"
              shape="rounded"
              iconOnly
              aria-label="Close menu"
              onClick={() => {
                setDrawer(false)
                menuRef.current?.focus()
              }}
              className="absolute top-2 right-2 z-10 lg:hidden"
            >
              <Xmark />
            </Button>
          )}

          <nav aria-label="Documentation" className="min-h-0 flex-1 overflow-y-auto px-2 lg:overflow-visible">
            <ul>
              {nav.map((group) => {
                const isOpen = open[group.id]
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
                        'flex h-8 w-full items-center gap-2 rounded-full px-3 text-left select-none',
                        'transition-colors duration-(--duration-fast) ease-(--ease-out)',
                        'hover:bg-bg-hover active:bg-bg-selected',
                        'focus-visible:shadow-border-focus focus-visible:outline-none',
                      )}
                    >
                      <Icon className="shrink-0 text-text-muted" />
                      <span className="min-w-0 flex-1 truncate text-[13px] leading-4 font-medium text-text-default">
                        {group.title}
                      </span>
                      {group.id !== 'intro' && (
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
                                'flex h-8 items-center truncate rounded-full pr-3 pl-[34px] text-[13px] leading-[19.5px]',
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

          {/* The banner stays pinned to the bottom of the window while the page scrolls. */}
          <div className="lg:sticky lg:bottom-2">
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
      <Button variant="secondary" shape="rounded" className="relative w-full border-border-default">
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
