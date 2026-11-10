'use client'

import * as React from 'react'
import { Toast as ToastPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * Toast, 1:1 with the uiKit `Toast` set (3650:17696): intent neutral, info, success, warning or
 * error. A 397px popover surface, radius-xl, border/default, the shadcn `lg` shadow, padding
 * 10 left / 8 right and 10 top and bottom (12 at the bottom on the four status intents, as in
 * Figma). A 36px radius-md icon tile in the intent's status bg, a 13px medium title (20px line)
 * over a 13px muted description (16px line), then an optional secondary action and a 24px close.
 *
 * Built on the Radix Toast. Render one `<Toaster />` near the root and call `toast()` anywhere:
 *   toast.success('Booking confirmed', { description: 'Table for 4…', action: { label: 'Undo' } })
 *
 * The Toaster stacks them bottom-right, newest in front. Behind it, the next ones peek 16px above,
 * each 5% smaller, their content hidden; three show at most and the rest wait, parked in the last
 * place. Hovering or focusing the stack unfolds it, one under another 8px apart, with every
 * toast readable, and pauses their timers. A toast comes in from 24px below over 250 ms. The
 * front one leaves the way it came, 24px down and faded, quicker (200 ms), while the next one
 * comes forward into its place behind it, so the two never cross. One further back (closed
 * from the unfolded stack) fades where it is, shrinking to 96%. All on the kit's ease-out.
 */
export type ToastIntent = 'neutral' | 'info' | 'success' | 'warning' | 'error'

export interface ToastAction {
  label: string
  onClick?: () => void
}

export interface ToastOptions {
  description?: React.ReactNode
  intent?: ToastIntent
  action?: ToastAction
  /** The small close button on the right. */
  closeButton?: boolean
  /** The status icon tile on the left. */
  icon?: boolean
  /** Milliseconds before it closes by itself. `Infinity` keeps it until dismissed. */
  duration?: number
  id?: string
}

type ExitReason = 'close' | 'action'
type ToastRecord = ToastOptions & { id: string; title: React.ReactNode; open: boolean; exit?: ExitReason }

/** Enter, exit and re-stack, ms (--duration-slow). A closed toast stays this long to play out. */
const MOTION_MS = 250

/* ---------- the store behind toast() ---------- */

let records: ToastRecord[] = []
const listeners = new Set<() => void>()
let counter = 0

function emit() {
  for (const listener of listeners) listener()
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function snapshot() {
  return records
}

function show(title: React.ReactNode, options: ToastOptions = {}) {
  const id = options.id ?? `toast-${++counter}`
  const next: ToastRecord = { ...options, id, title, open: true }
  records = records.some((r) => r.id === id) ? records.map((r) => (r.id === id ? next : r)) : [...records, next]
  emit()
  return id
}

function remove(id: string) {
  records = records.filter((r) => r.id !== id)
  emit()
}

/** Marks a toast as leaving, so the stack can play it out, and drops it one motion later. */
function close(id: string, reason: ExitReason = 'close') {
  const r = records.find((r) => r.id === id)
  if (!r || !r.open) return
  records = records.map((r) => (r.id === id ? { ...r, open: false, exit: reason } : r))
  emit()
  setTimeout(() => remove(id), MOTION_MS)
}

type Shortcut = (title: React.ReactNode, options?: Omit<ToastOptions, 'intent'>) => string

/** Show a toast. Returns its id, which `toast.dismiss(id)` takes. */
export const toast = Object.assign((title: React.ReactNode, options?: ToastOptions) => show(title, options), {
  info: ((title, options) => show(title, { ...options, intent: 'info' })) as Shortcut,
  success: ((title, options) => show(title, { ...options, intent: 'success' })) as Shortcut,
  warning: ((title, options) => show(title, { ...options, intent: 'warning' })) as Shortcut,
  error: ((title, options) => show(title, { ...options, intent: 'error' })) as Shortcut,
  /** Close one toast, or all of them. */
  dismiss: (id?: string) => {
    for (const r of id === undefined ? records : records.filter((r) => r.id === id)) close(r.id)
  },
})

/* ---------- glyphs, from Figma ---------- */

const tile: Record<ToastIntent, string> = {
  neutral: 'bg-status-neutral-bg text-text-default',
  info: 'bg-status-sky-bg text-status-sky-fg',
  success: 'bg-status-green-bg text-status-green-fg',
  warning: 'bg-status-amber-bg text-status-amber-fg',
  // Figma draws the error glyph in action/destructive (#DC2626), not status-red-fg.
  error: 'bg-status-red-bg text-action-destructive-bg',
}

function IntentIcon({ intent }: { intent: ToastIntent }) {
  if (intent === 'neutral') {
    // Notification glyph, 14px inside a 16px box.
    return (
      <svg width="16" height="16" viewBox="-1 -1 16 16" fill="none" aria-hidden>
        <g stroke="currentColor" style={{ strokeWidth: 1.25 }} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.2738 4.61052C12.3146 4.61052 13.1582 3.76684 13.1582 2.72612C13.1582 1.6854 12.3146 0.841726 11.2738 0.841726C10.2331 0.841726 9.38944 1.6854 9.38944 2.72612C9.38944 3.76684 10.2331 4.61052 11.2738 4.61052Z" />
          <path d="M12.9121 7.12311V9.13483C12.9121 11.3569 11.1107 13.1583 8.88866 13.1583H4.86521C2.64313 13.1583 0.84177 11.3569 0.84177 9.13483V5.11139C0.84177 2.8893 2.64313 1.08794 4.86521 1.08794H6.87694" />
        </g>
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <g stroke="currentColor" style={{ strokeWidth: 1.25 }} strokeLinecap="round" strokeLinejoin="round">
        {intent === 'success' ? (
          <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" />
        ) : (
          <>
            {intent === 'info' ? (
              <>
                <path d="M8 7.70494V10.6557" />
                <path d="M8 5.35022L8.0059 5.34366" />
              </>
            ) : (
              <>
                <path d="M8 5.34428V8.29506" />
                <path d="M8 10.6563L8.0059 10.6498" />
              </>
            )}
            <path d="M8 13.9015C11.2593 13.9015 13.9015 11.2593 13.9015 8C13.9015 4.74066 11.2593 2.09845 8 2.09845C4.74066 2.09845 2.09845 4.74066 2.09845 8C2.09845 11.2593 4.74066 13.9015 8 13.9015Z" />
          </>
        )}
      </g>
    </svg>
  )
}

/* ---------- one toast ---------- */

export interface ToastProps extends Omit<React.ComponentProps<typeof ToastPrimitive.Root>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  intent?: ToastIntent
  action?: ToastAction
  closeButton?: boolean
  icon?: boolean
}

/** The card surface: popover bg, border/default, radius-xl, the shadcn `lg` shadow. */
const card = (intent: ToastIntent) =>
  cn(
    'relative flex w-full items-center gap-2.5 overflow-clip pr-2 pl-2.5',
    intent === 'neutral' ? 'py-2.5' : 'pt-2.5 pb-3',
    'rounded-xl border border-border-default bg-bg-popover',
    '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
  )

/** What sits on the card: the icon tile, title and description, the action and the close. */
function ToastContent({
  title,
  description,
  intent,
  action,
  closeButton,
  icon,
  onAction,
}: Pick<ToastProps, 'title' | 'description' | 'action' | 'closeButton' | 'icon'> & {
  intent: ToastIntent
  onAction?: () => void
}) {
  return (
    <>
      {icon && (
        <div className={cn('grid size-9 shrink-0 place-items-center rounded-md', tile[intent])}>
          <IntentIcon intent={intent} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col text-sm">
        <ToastPrimitive.Title className="leading-5 font-medium text-text-default">{title}</ToastPrimitive.Title>
        {description ? (
          <ToastPrimitive.Description className="leading-4 text-text-muted">{description}</ToastPrimitive.Description>
        ) : null}
      </div>
      {(action || closeButton) && (
        <div className="flex shrink-0 items-center gap-1">
          {action && (
            <ToastPrimitive.Action asChild altText={action.label}>
              <Button
                variant="secondary"
                onClick={() => {
                  onAction?.()
                  action.onClick?.()
                }}
              >
                {action.label}
              </Button>
            </ToastPrimitive.Action>
          )}
          {closeButton && (
            <ToastPrimitive.Close asChild>
              <Button variant="tertiary" size="xs" iconOnly aria-label="Close" className="rounded-md text-text-muted">
                {/* 14px X at 1.09, from Figma. */}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path
                    d="M3.94232 10.0582L7.00053 7M7.00053 7L10.0587 3.94179M7.00053 7L3.94232 3.94179M7.00053 7L10.0587 10.0582"
                    stroke="currentColor"
                    strokeWidth="1.09375"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </ToastPrimitive.Close>
          )}
        </div>
      )}
    </>
  )
}

const radixType = (intent: ToastIntent) => (intent === 'error' || intent === 'warning' ? 'foreground' : 'background')

/** A single toast on its own. Lives inside `<Toaster>` (it needs the Radix toast provider). */
export function Toast({
  title,
  description,
  intent = 'neutral',
  action,
  closeButton = true,
  icon = true,
  duration = 5000,
  className,
  ...props
}: ToastProps) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-intent={intent}
      duration={duration}
      type={radixType(intent)}
      className={cn(
        'pointer-events-auto',
        card(intent),
        'focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)] focus-visible:outline-none',
        'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
        className,
      )}
      {...props}
    >
      <ToastContent title={title} description={description} intent={intent} action={action} closeButton={closeButton} icon={icon} />
    </ToastPrimitive.Root>
  )
}

/* ---------- the stack ---------- */

/** Peek of each toast behind the front one, px; the scale each step back loses; gap unfolded, px. */
const PEEK = 16
const SCALE_STEP = 0.05
const GAP = 8
/** Where a toast comes in from and where the front one goes, px below its place. */
const ENTER_Y = 24
const EXIT_Y = 24
/** A toast leaving from further back fades where it is, to this scale. */
const EXIT_SCALE = 0.96
/** Leaving is a response, so it is quicker than arriving. */
const EXIT_MS = 200
const FALLBACK_HEIGHT = 58

const motion = `transform ${MOTION_MS}ms var(--ease-out), opacity ${MOTION_MS}ms var(--ease-out)`
const exitMotion = `transform ${EXIT_MS}ms var(--ease-out), opacity ${EXIT_MS}ms var(--ease-out)`

interface StackedToastProps {
  record: ToastRecord
  index: number
  y: number
  scale: number
  beyond: boolean
  contentVisible: boolean
  onMeasure: (id: string, height: number) => void
  onForget: (id: string) => void
}

/**
 * One toast in the stack, on two elements so the two movements never fight over one transform:
 * the `li` (the Radix root) takes its place in the stack, the card inside takes the way in and out.
 */
function StackedToast({ record, index, y, scale, beyond, contentVisible, onMeasure, onForget }: StackedToastProps) {
  const { id, title, open, duration, exit, intent = 'neutral', icon = true, closeButton = true, ...options } = record
  const [entered, setEntered] = React.useState(false)
  React.useEffect(() => {
    // Two frames: one paints the start, the next flips to the place, so the move has two ends.
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])

  const measured = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return
      // Layout height: the stack's scale never gets into it.
      const report = () => onMeasure(id, node.offsetHeight)
      report()
      const observer = new ResizeObserver(report)
      observer.observe(node)
      return () => {
        observer.disconnect()
        onForget(id)
      }
    },
    [id, onMeasure, onForget],
  )

  const settled = entered && open
  // The front one goes back down the way it came; one behind it fades in place, so it never
  // slides over its neighbours.
  const front = index === 0
  const cardTransform = settled
    ? 'translate3d(0, 0, 0)'
    : open || front
      ? `translate3d(0, ${open ? ENTER_Y : EXIT_Y}px, 0)`
      : `translate3d(0, 0, 0) scale(${EXIT_SCALE})`

  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-intent={intent}
      // Kept mounted while it plays out; the store drops it one motion later.
      forceMount
      open={open}
      onOpenChange={(next) => !next && close(id)}
      duration={duration ?? 5000}
      type={radixType(intent)}
      className={cn(
        'absolute inset-x-0 bottom-0 origin-bottom outline-none',
        'focus-visible:[&>div]:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x)',
        'data-[swipe=cancel]:transition-[translate] data-[swipe=cancel]:duration-(--duration-base) data-[swipe=cancel]:ease-(--ease-out)',
      )}
      style={{
        transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
        opacity: beyond ? 0 : 1,
        zIndex: 1000 - index,
        pointerEvents: beyond || !open ? 'none' : undefined,
        transition: motion,
      }}
    >
      <div
        ref={measured}
        className={cn('pointer-events-auto', card(intent))}
        style={{
          transform: cardTransform,
          opacity: settled ? 1 : 0,
          transition: open ? motion : exitMotion,
        }}
      >
        <div
          className="flex w-full min-w-0 items-center gap-2.5"
          style={{ opacity: contentVisible ? 1 : 0, transition: motion }}
          // The cards behind the front one show no content, so nothing in them can be reached.
          aria-hidden={!contentVisible || undefined}
          inert={!contentVisible || undefined}
        >
          <ToastContent
            title={title}
            intent={intent}
            icon={icon}
            closeButton={closeButton}
            onAction={() => close(id, 'action')}
            {...options}
          />
        </div>
      </div>
    </ToastPrimitive.Root>
  )
}

/* ---------- the region ---------- */

export interface ToasterProps {
  /** Classes for the viewport; `absolute` instead of `fixed` keeps it inside a positioned parent. */
  className?: string
  /** Most toasts on screen at once; the rest wait behind. */
  limit?: number
  /** Your own controlled `<Toast>`s, rendered alongside the ones from `toast()`. */
  children?: React.ReactNode
}

export function Toaster({ className, limit = 3, children }: ToasterProps) {
  const all = React.useSyncExternalStore(subscribe, snapshot, snapshot)
  // Newest first: index 0 is the front of the stack.
  const stack = React.useMemo(() => [...all].reverse(), [all])

  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  // Native listeners: the toasts are portalled into the viewport, so React's own events from
  // them never reach it. pointermove (as Radix's pause uses) also catches a pointer at rest there.
  const viewportRef = React.useRef<HTMLOListElement>(null)
  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const enter = () => setHovered(true)
    const leave = () => setHovered(false)
    const focusIn = () => setFocused(true)
    const focusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) setFocused(false)
    }
    el.addEventListener('pointermove', enter)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('focusin', focusIn)
    el.addEventListener('focusout', focusOut)
    return () => {
      el.removeEventListener('pointermove', enter)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('focusin', focusIn)
      el.removeEventListener('focusout', focusOut)
    }
  }, [])
  const expanded = (hovered || focused) && stack.some((r) => r.open)

  const [heights, setHeights] = React.useState<Record<string, number>>({})
  const measure = React.useCallback((id: string, h: number) => setHeights((c) => (c[id] === h ? c : { ...c, [id]: h })), [])
  const forget = React.useCallback(
    (id: string) =>
      setHeights((c) => {
        if (!(id in c)) return c
        const { [id]: _, ...rest } = c
        return rest
      }),
    [],
  )

  // A toast on its way out keeps its index but frees its place, so the ones behind move up.
  const placed: { record: ToastRecord; index: number }[] = []
  let cursor = 0
  for (const record of stack) {
    placed.push({ record, index: cursor })
    if (record.open) cursor += 1
  }
  const slots = stack.filter((r) => r.open).map((r) => heights[r.id] ?? FALLBACK_HEIGHT)
  const depth = Math.max(limit, 1)

  const offset = (slot: number) => {
    if (!expanded) return slot * PEEK
    let y = 0
    for (let i = 0; i < slot; i++) y += (slots[i] ?? FALLBACK_HEIGHT) + GAP
    return y
  }

  // The viewport covers the whole stack, gaps included, so moving between toasts never refolds it.
  const count = Math.min(slots.length, depth)
  let height = 0
  if (expanded) height = slots.slice(0, count).reduce((t, h, i) => t + h + (i ? GAP : 0), 0)
  else for (let i = 0; i < count; i++) height = Math.max(height, i * PEEK + slots[i] * (1 - i * SCALE_STEP))

  return (
    <ToastPrimitive.Provider swipeDirection="right" label="Notifications">
      {children}
      {placed.map(({ record, index }) => {
        const slot = Math.min(index, depth - 1)
        return (
          <StackedToast
            key={record.id}
            record={record}
            index={index}
            y={-offset(slot)}
            scale={expanded ? 1 : Math.max(1 - slot * SCALE_STEP, 0)}
            beyond={index >= depth}
            contentVisible={expanded || index === 0}
            onMeasure={measure}
            onForget={forget}
          />
        )
      })}
      <ToastPrimitive.Viewport
        ref={viewportRef}
        style={{ height, transition: `height ${MOTION_MS}ms var(--ease-out)` }}
        className={cn(
          'fixed right-4 bottom-4 z-[100] m-0 w-[397px] max-w-[calc(100%-32px)] list-none p-0 outline-none',
          className,
        )}
      />
    </ToastPrimitive.Provider>
  )
}
