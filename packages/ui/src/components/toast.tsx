'use client'

import * as React from 'react'
import { Toast as ToastPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { Button } from './button'
import { useSatinLabels, type SatinLabelSet } from './labels'

/**
 * Toast, 1:1 with the uiKit `Toast` set (3650:17696): intent neutral, info, success, warning or
 * error. A 397px popover surface, radius-xl, border/subtle (as on menus), the shadcn `lg` shadow, padding
 * 10 left / 8 right and 10 top and bottom (12 at the bottom on the four status intents, as in
 * Figma). A 36px radius-md icon tile in the intent's status bg, a 13px medium title (20px line)
 * over a 13px muted description (18px line, 2px under the title), then an optional secondary action and a 24px close.
 *
 * Built on the Radix Toast. Render one `<Toaster />` near the root and call `toast()` anywhere:
 *   toast.success('Booking confirmed', { description: 'Table for 4…', action: { label: 'Undo' } })
 *
 * The Toaster stacks them bottom-right, newest in front. Behind it, the next ones peek 16px above,
 * each 5% smaller, cut to the front one's height with their content faded out, so the stack is
 * even; three show at most and the rest wait, parked in the last place. Hovering or focusing the
 * stack unfolds it, one under another 8px apart at their own heights, every toast readable, and
 * pauses their timers.
 *
 * Toasts move as whole cards and never fade on the way: a new one slides up from below the
 * stack (150% of its height), a closed one slides back down the same way, and the rest move to
 * their new places at the same time. Every move is one transform on one element, 500 ms on the
 * kit's ease-out, so a toast added or closed mid-move just carries on from where it is. The
 * cut to the front one's height eases over 150 ms, the content fade over 250 ms.
 */
export type ToastIntent = 'neutral' | 'info' | 'success' | 'warning' | 'error'

/** A word for a toast, or a function that picks it from the labels in effect where the toast shows. */
export type ToastText = string | ((labels: SatinLabelSet) => string)

export interface ToastAction {
  /**
   * The button's word. A function gets the SatinLabels in effect under the Toaster, so code that
   * calls toast() outside React can still use the app's words: `(labels) => labels.undo`.
   */
  label: ToastText
  onClick?: () => void
  /**
   * How to do the same without the toast, read to screen readers in place of the button, which
   * they may never reach before it's gone: "Undo with Ctrl+Z", "Restore it from Trash".
   * Defaults to the label. Takes a function of the labels too.
   */
  altText?: ToastText
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

/** Enter, exit and re-stack, ms. A closed toast stays this long to play out. */
const MOTION_MS = 500

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
  error: 'bg-status-red-bg text-text-destructive',
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

/** The card surface: popover bg, border/subtle, radius-xl, the shadcn `lg` shadow. */
const card = (intent: ToastIntent) =>
  cn(
    'relative flex w-full items-center gap-2.5 overflow-clip ps-2.5 pe-2',
    intent === 'neutral' ? 'py-2.5' : 'pt-2.5 pb-3',
    'rounded-xl border border-border-subtle bg-bg-popover',
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
  const labels = useSatinLabels()
  const text = (t: ToastText) => (typeof t === 'function' ? t(labels) : t)
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
          <ToastPrimitive.Description className="mt-0.5 leading-[18px] text-text-muted">{description}</ToastPrimitive.Description>
        ) : null}
      </div>
      {(action || closeButton) && (
        <div className="flex shrink-0 items-center gap-1">
          {action && (
            <ToastPrimitive.Action asChild altText={text(action.altText ?? action.label)}>
              <Button
                variant="secondary"
                onClick={() => {
                  onAction?.()
                  action.onClick?.()
                }}
              >
                {text(action.label)}
              </Button>
            </ToastPrimitive.Action>
          )}
          {closeButton && (
            <ToastPrimitive.Close asChild>
              <Button variant="tertiary" size="xs" iconOnly aria-label={labels.close} className="rounded-md text-text-muted">
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
const FALLBACK_HEIGHT = 58

/** Where a toast comes in from and goes to: this much of its own height below its place. */
const OFFSCREEN = '150%'
const ease = 'var(--ease-out)'
const cardMotion = `transform ${MOTION_MS}ms ${ease}, height 150ms ${ease}`
const contentMotion = `opacity 250ms ${ease}`

interface StackedToastProps {
  record: ToastRecord
  index: number
  /** Its place in the stack, px up from the bottom, and its scale. */
  y: number
  scale: number
  /** Cut to this height (the front toast's) while it waits behind; undefined shows its own. */
  height?: number
  beyond: boolean
  contentVisible: boolean
  onMeasure: (id: string, height: number) => void
  onForget: (id: string) => void
}

/**
 * One toast in the stack, on two elements so the two movements never fight over one transform:
 * the `li` (the Radix root) takes its place in the stack, the card inside slides in and out.
 */
function StackedToast({ record, index, y, scale, height, beyond, contentVisible, onMeasure, onForget }: StackedToastProps) {
  const { id, title, open, duration, exit: _exit, intent = 'neutral', icon = true, closeButton = true, ...options } = record
  const [entered, setEntered] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    // Read the start (below the stack) so the browser has it, then move to the place: the
    // transition runs from there without waiting on animation frames.
    cardRef.current?.getBoundingClientRect()
    setEntered(true)
  }, [])

  // Its own height, whatever the stack cuts it to: the content plus the card's padding and border.
  const measured = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return
      const card = node.parentElement as HTMLElement
      const report = () => {
        const cs = getComputedStyle(card)
        const chrome = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((t, k) => t + parseFloat(cs[k as 'paddingTop']), 0)
        onMeasure(id, node.offsetHeight + chrome)
      }
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

  const inPlace = entered && open

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
        transition: `transform ${MOTION_MS}ms ${ease}, opacity ${MOTION_MS}ms ${ease}`,
      }}
    >
      <div
        ref={cardRef}
        className={cn('pointer-events-auto', card(intent), 'items-start')}
        style={{
          transform: inPlace ? 'translate3d(0, 0, 0)' : `translate3d(0, ${OFFSCREEN}, 0)`,
          height,
          transition: cardMotion,
          willChange: 'transform',
        }}
      >
        <div
          ref={measured}
          className="flex w-full min-w-0 items-center gap-2.5"
          style={{ opacity: contentVisible ? 1 : 0, transition: contentMotion }}
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
  const labels = useSatinLabels()
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

  // The stack sits at the end of the row, so it swipes away towards it: to the left in
  // right-to-left. Read from the page, so `dir` alone is enough.
  const [rtl, setRtl] = React.useState(false)
  React.useLayoutEffect(() => {
    const el = viewportRef.current
    if (el) setRtl(getComputedStyle(el).direction === 'rtl')
  })

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
  const frontHeight = slots[0] ?? FALLBACK_HEIGHT
  const scaleOf = (slot: number) => (expanded ? 1 : Math.max(1 - slot * SCALE_STEP, 0))

  // Px up from the bottom. Folded, every card is the front one's height, scaled from its bottom
  // edge, so lifting it by the height it lost puts its top exactly PEEK above the one in front.
  const offset = (slot: number) => {
    if (!expanded) return slot * PEEK + (1 - scaleOf(slot)) * frontHeight
    let y = 0
    for (let i = 0; i < slot; i++) y += (slots[i] ?? FALLBACK_HEIGHT) + GAP
    return y
  }

  // The viewport covers the whole stack, gaps included, so moving between toasts never refolds it.
  const count = Math.min(slots.length, depth)
  const height = expanded
    ? slots.slice(0, count).reduce((t, h, i) => t + h + (i ? GAP : 0), 0)
    : count
      ? frontHeight + (count - 1) * PEEK
      : 0

  return (
    <ToastPrimitive.Provider swipeDirection={rtl ? 'left' : 'right'} label={labels.notifications}>
      {children}
      {placed.map(({ record, index }) => {
        const slot = Math.min(index, depth - 1)
        return (
          <StackedToast
            key={record.id}
            record={record}
            index={index}
            y={-offset(slot)}
            scale={scaleOf(slot)}
            height={!expanded && slot > 0 && record.open ? frontHeight : heights[record.id]}
            beyond={index >= depth}
            contentVisible={expanded || index === 0}
            onMeasure={measure}
            onForget={forget}
          />
        )
      })}
      <ToastPrimitive.Viewport
        ref={viewportRef}
        // The region screen readers land on with F8, in the app's words; Radix puts the key in {hotkey}.
        label={`${labels.notifications} ({hotkey})`}
        style={{ height, transition: `height ${MOTION_MS}ms var(--ease-out)` }}
        className={cn(
          'fixed end-4 bottom-4 z-[100] m-0 w-[397px] max-w-[calc(100%-32px)] list-none p-0 outline-none',
          className,
        )}
      />
    </ToastPrimitive.Provider>
  )
}
