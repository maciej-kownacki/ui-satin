'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { Badge } from './badge'
import { useSatinLabels } from './labels'

/**
 * Notification: a card for something the app did or heard about, in a notification centre, a
 * panel or a corner of the page. It stays until it's dismissed; for a passing message use Toast.
 *
 * - `media` on the left in a 40px slot: an Avatar (`size={40}`), an app icon or an image.
 * - A 14px medium `title` over a 13px muted `description`, each cut to one line.
 * - `badge` on the right of the title: a string becomes a small rounded neutral Badge, or pass
 *   your own.
 * - `onDismiss` adds a round close button whose centre sits on the top-right corner, half over
 *   the card's edge. It shows on hover and while focus is inside the card (always on touch
 *   screens, which can't hover); `dismissVisibility="always"` keeps it on.
 * - `stacked` draws up to two plain cards peeking 8px below it, for a group shown folded. For
 *   real notifications that unfold, put them in a `NotificationStack`.
 *
 * The root is an `article` named by the title and described by the description. It is not a
 * live region: when a new one should be read out, announce it from the app (or use Toast).
 * Other props, `ref` included, go to the `article`.
 */
export interface NotificationProps extends Omit<React.ComponentProps<'article'>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  /** The picture on the left: an Avatar at size 40, an app icon or an image. */
  media?: React.ReactNode
  /** On the right of the title. A string becomes a small rounded neutral Badge. */
  badge?: React.ReactNode
  /** Plain cards peeking below it, for a folded group: 0, 1 or 2. Ignored inside a NotificationStack. */
  stacked?: 0 | 1 | 2
  /** Shows the close button on the top-right corner; called when it is pressed. */
  onDismiss?: () => void
  /** `hover` (default) shows the close button on hover and focus, `always` keeps it on. */
  dismissVisibility?: 'hover' | 'always'
}

/** How far each card behind peeks out, px, how much narrower it is per step back, the gap unfolded. */
const PEEK = 8
const SCALE_STEP = 0.05
const GAP = 8
/** Cards that show folded: the front one and two behind it. */
const DEPTH = 3
/** A card with a title and description, until it has been measured. */
const FALLBACK_HEIGHT = 66
/** Unfold, fold and re-stack, ms, on the kit's ease-out, as in Toast. */
const MOTION_MS = 500
const ease = 'var(--ease-out)'

const surface = 'rounded-2xl border border-border-default bg-bg-popover'

/** What a NotificationStack tells each card in it. */
type StackItem = {
  /** Cut to this height (the front card's) while it waits behind; undefined is its own. */
  height?: number
  /** Folded, the cards behind show only their surface. */
  contentVisible: boolean
  /** Reports the card's own height, content plus padding and border. */
  onMeasure: (height: number) => void
}
const StackItemContext = React.createContext<StackItem | null>(null)

export function Notification({
  title,
  description,
  media,
  badge,
  stacked = 0,
  onDismiss,
  dismissVisibility = 'hover',
  className,
  style,
  ...props
}: NotificationProps) {
  const labels = useSatinLabels()
  const item = React.useContext(StackItemContext)
  const id = React.useId()
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`
  const behind = item ? 0 : Math.max(0, Math.min(2, stacked))
  const hidden = item ? !item.contentVisible : false

  // Inside a stack, report the card's own height whatever the stack cuts it to.
  const onMeasure = item?.onMeasure
  const measured = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !onMeasure) return
      const card = node.parentElement as HTMLElement
      const report = () => {
        const cs = getComputedStyle(card)
        const chrome = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((t, k) => t + parseFloat(cs[k as 'paddingTop']), 0)
        onMeasure(node.offsetHeight + chrome)
      }
      report()
      const observer = new ResizeObserver(report)
      observer.observe(node)
      return () => observer.disconnect()
    },
    [onMeasure],
  )

  return (
    <article
      data-slot="notification"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // The cards behind the front one show no content, so nothing in them can be reached.
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={cn('group/notification relative isolate w-full', className)}
      // Room under it for the cards behind, so the stack doesn't overlap what follows.
      style={behind ? { marginBottom: behind * PEEK, ...style } : style}
      {...props}
    >
      {Array.from({ length: behind }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          aria-hidden
          data-slot="notification-behind"
          className={cn('absolute inset-0 origin-bottom [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]', surface)}
          style={{ zIndex: -step, transform: `translateY(${step * PEEK}px) scale(${1 - step * SCALE_STEP})` }}
        />
      ))}
      <div
        className={cn(
          'flex items-start overflow-clip p-3',
          surface,
          '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
        )}
        style={item ? { height: item.height, transition: `height 150ms ${ease}` } : undefined}
      >
        <div
          ref={measured}
          className="flex w-full min-w-0 items-center gap-3"
          style={item ? { opacity: hidden ? 0 : 1, transition: `opacity 250ms ${ease}` } : undefined}
        >
          {media && (
            <div data-slot="notification-media" className="grid size-10 shrink-0 place-items-center overflow-clip rounded-full [&>img]:size-full [&>img]:object-cover">
              {media}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 items-center gap-2">
              <p id={titleId} className="min-w-0 flex-1 truncate text-base leading-5 font-medium text-text-default">
                {title}
              </p>
              {badge != null &&
                (typeof badge === 'string' ? (
                  <Badge size="sm" shape="rounded" className="shrink-0">
                    {badge}
                  </Badge>
                ) : (
                  badge
                ))}
            </div>
            {description ? (
              <p id={descriptionId} className="truncate text-sm leading-[18px] text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          data-slot="notification-dismiss"
          aria-label={labels.dismiss}
          onClick={onDismiss}
          className={cn(
            // 24px, centred on the corner: half above the top edge, half past the end edge.
            'absolute end-0 top-0 grid size-6 -translate-y-1/2 translate-x-1/2 cursor-pointer place-items-center rounded-full rtl:-translate-x-1/2',
            'border border-border-default bg-bg-popover text-text-muted [box-shadow:0_1px_3px_0_var(--effect-shadow-sm)]',
            'transition-[opacity,color,background-color] duration-(--duration-fast) ease-(--ease-out)',
            'hover:bg-bg-hover hover:text-text-default active:bg-bg-selected',
            'satin-focus:outline-2 satin-focus:outline-solid satin-focus:outline-offset-2 satin-focus:outline-action-focus-ring',
            hidden
              ? 'opacity-0'
              : dismissVisibility === 'hover' &&
                  'opacity-0 group-focus-within/notification:opacity-100 group-hover/notification:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        >
          {/* 12px X, the close glyph at 1.25. */}
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M4.50551 11.4951L8.0006 8M8.0006 8L11.4957 4.50491M8.0006 8L4.50551 4.50491M8.0006 8L11.4957 11.4951"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </article>
  )
}

/* ---------- the stack ---------- */

/**
 * NotificationStack: several Notifications folded into one pile that unfolds, the way Toast's
 * stack does. Pass them as children, newest first, each with a `key`.
 *
 * Folded, the first card is in front and the next two peek 8px below it, each 5% narrower, cut
 * to the front one's height with their content faded out; the rest wait behind. Hovering the
 * stack, moving focus into it, or tapping it on a touch screen unfolds it: every card one under
 * another, 8px apart at its own height, each with its own close button. Leaving it folds it again.
 *
 * Unfolded cards spill over what follows instead of pushing it down, so the page doesn't jump;
 * the stack takes only its folded height. Leave room below it, or put it in a panel.
 *
 * Cards move as whole cards: one transform each, 500 ms on the kit's ease-out. A card that
 * leaves (its child is gone) fades out where it was while the rest move up; a new one fades in
 * at the front. Other props, `ref` included, go to the root `div`.
 */
export interface NotificationStackProps extends React.ComponentProps<'div'> {
  /** Notifications, newest first, each with a key. */
  children?: React.ReactNode
  /** Unfolded from the start and kept unfolded. */
  expanded?: boolean
}

type Entry = { key: string; element: React.ReactElement; leaving: boolean }

export function NotificationStack({ children, expanded: alwaysExpanded = false, className, style, ...props }: NotificationStackProps) {
  const live = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement[]

  // A child that's gone stays one motion longer, in the place it had, to fade out.
  const [leaving, setLeaving] = React.useState<Map<string, { element: React.ReactElement; index: number }>>(() => new Map())
  const previous = React.useRef<React.ReactElement[]>([])
  React.useLayoutEffect(() => {
    const now = new Set(live.map((e) => String(e.key)))
    const gone = previous.current.map((element, index) => ({ element, index })).filter((g) => !now.has(String(g.element.key)))
    const back = [...leaving.keys()].filter((k) => now.has(k))
    if (gone.length || back.length)
      setLeaving((m) => {
        const next = new Map(m)
        for (const k of back) next.delete(k)
        for (const g of gone) next.set(String(g.element.key), g)
        return next
      })
    for (const g of gone)
      setTimeout(
        () =>
          setLeaving((m) => {
            if (!m.has(String(g.element.key))) return m
            const next = new Map(m)
            next.delete(String(g.element.key))
            return next
          }),
        MOTION_MS,
      )
    previous.current = live
    // A removed card takes focus with it, and no blur says so: hand it to the next close
    // button from the keyboard, or let the stack fold.
    const root = rootRef.current
    if (gone.length && focused && root && !root.contains(document.activeElement)) {
      const next = root.querySelector<HTMLElement>('[data-slot="notification-dismiss"]:not([inert] *)')
      if (next) next.focus()
      else setFocused(false)
    }
  })

  const entries: Entry[] = live.map((element) => ({ key: String(element.key), element, leaving: false }))
  for (const [key, { element, index }] of [...leaving.entries()].sort((a, b) => a[1].index - b[1].index))
    if (!entries.some((e) => e.key === key)) entries.splice(Math.min(index, entries.length), 0, { key, element, leaving: true })

  // Hover, focus or a tap unfolds it.
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [tapped, setTapped] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!tapped) return
    const outside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setTapped(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [tapped])
  const expanded = alwaysExpanded || ((hovered || focused || tapped) && live.length > 1)

  const [heights, setHeights] = React.useState<Record<string, number>>({})
  const measureFor = React.useMemo(() => {
    const cache = new Map<string, (h: number) => void>()
    return (key: string) => {
      if (!cache.has(key)) cache.set(key, (h: number) => setHeights((c) => (c[key] === h ? c : { ...c, [key]: h })))
      return cache.get(key)!
    }
  }, [])

  const heightOf = (key: string) => heights[key] ?? FALLBACK_HEIGHT
  const frontHeight = live.length ? heightOf(String(live[0].key)) : 0
  const count = Math.min(live.length, DEPTH)
  const foldedHeight = count ? frontHeight + (count - 1) * PEEK : 0
  const expandedHeight = live.reduce((t, e, i) => t + heightOf(String(e.key)) + (i ? GAP : 0), 0)

  // Px down from the top. Folded, each card behind is the front one's height scaled from its
  // bottom edge, so moving it down PEEK per step leaves PEEK of it showing under the one before.
  let slot = 0
  let y = 0
  const placed = entries.map((entry) => {
    const s = slot
    const folded = Math.min(s, DEPTH - 1)
    const place = {
      ...entry,
      slot: s,
      y: expanded ? y : folded * PEEK,
      scale: expanded ? 1 : 1 - folded * SCALE_STEP,
      beyond: !expanded && s >= DEPTH,
    }
    if (!entry.leaving) {
      y += heightOf(entry.key) + GAP
      slot += 1
    }
    return place
  })

  return (
    <div
      ref={rootRef}
      data-slot="notification-stack"
      data-expanded={expanded || undefined}
      className={cn('relative isolate w-full', className)}
      style={{ height: foldedHeight, ...style }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      // Focus from the keyboard unfolds it; a click on a close button doesn't.
      onFocus={(e) => e.target.matches(':focus-visible') && setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      onClick={(e) => !expanded && !(e.target as HTMLElement).closest('button') && setTapped(true)}
      {...props}
    >
      {/* Covers the unfolded stack, gaps included, so moving between cards never folds it. */}
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10" style={{ height: expanded ? expandedHeight : foldedHeight }} />
      {placed.map(({ key, element, leaving: isLeaving, slot: s, y: top, scale, beyond }) => (
        <StackSlot
          key={key}
          y={top}
          scale={scale}
          z={100 - s}
          hidden={beyond || isLeaving}
          item={{
            height: !expanded && s > 0 && !isLeaving ? frontHeight : undefined,
            contentVisible: expanded || s === 0,
            onMeasure: measureFor(key),
          }}
        >
          {element}
        </StackSlot>
      ))}
    </div>
  )
}

/** One card's place in the stack; a new one fades in a few px above it. */
function StackSlot({ y, scale, z, hidden, item, children }: { y: number; scale: number; z: number; hidden: boolean; item: StackItem; children: React.ReactNode }) {
  const [entered, setEntered] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    // Read the start so the browser has it, then move to the place.
    ref.current?.getBoundingClientRect()
    setEntered(true)
  }, [])
  const shown = entered && !hidden
  return (
    <div
      ref={ref}
      className="absolute inset-x-0 top-0 origin-bottom"
      style={{
        transform: `translate3d(0, ${entered ? y : y - PEEK}px, 0) scale(${scale})`,
        opacity: shown ? 1 : 0,
        zIndex: z,
        pointerEvents: hidden ? 'none' : undefined,
        transition: `transform ${MOTION_MS}ms ${ease}, opacity 250ms ${ease}`,
        willChange: 'transform',
      }}
    >
      <StackItemContext.Provider value={item}>{children}</StackItemContext.Provider>
    </div>
  )
}
