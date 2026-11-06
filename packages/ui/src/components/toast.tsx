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
 * Toasts stack bottom-right, 8px apart, newest at the bottom, three at most.
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

type ToastRecord = ToastOptions & { id: string; title: React.ReactNode; open: boolean }

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

function setOpen(id: string, open: boolean) {
  records = records.map((r) => (r.id === id ? { ...r, open } : r))
  emit()
}

function remove(id: string) {
  records = records.filter((r) => r.id !== id)
  emit()
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
    records = id === undefined ? [] : records.filter((r) => r.id !== id)
    emit()
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

/** A single toast. Lives inside `<Toaster>` (it needs the Radix toast provider). */
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
      type={intent === 'error' || intent === 'warning' ? 'foreground' : 'background'}
      className={cn(
        'pointer-events-auto relative flex w-full items-center gap-2.5 overflow-clip pr-2 pl-2.5',
        intent === 'neutral' ? 'py-2.5' : 'pt-2.5 pb-3',
        'rounded-xl border border-border-default bg-bg-popover',
        '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
        'focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)] focus-visible:outline-none',
        'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
        'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=cancel]:translate-x-0',
        'data-[swipe=cancel]:transition-transform data-[swipe=cancel]:duration-(--duration-base) data-[swipe=cancel]:ease-(--ease-out)',
        className,
      )}
      {...props}
    >
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
              <Button variant="secondary" onClick={action.onClick}>
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
    </ToastPrimitive.Root>
  )
}

/* ---------- the region ---------- */

export interface ToasterProps {
  /** Classes for the viewport; `absolute` instead of `fixed` keeps it inside a positioned parent. */
  className?: string
  /** Most toasts on screen at once. */
  limit?: number
  /** Your own controlled `<Toast>`s, rendered alongside the ones from `toast()`. */
  children?: React.ReactNode
}

export function Toaster({ className, limit = 3, children }: ToasterProps) {
  const all = React.useSyncExternalStore(subscribe, snapshot, snapshot)
  const visible = all.filter((r) => r.open).slice(-limit)

  return (
    <ToastPrimitive.Provider swipeDirection="right" label="Notifications">
      {children}
      {visible.map(({ id, title, open, duration, ...options }) => (
        <Toast
          key={id}
          title={title}
          open={open}
          duration={duration ?? 5000}
          onOpenChange={(next) => {
            setOpen(id, next)
            if (!next) remove(id)
          }}
          {...options}
        />
      ))}
      <ToastPrimitive.Viewport
        className={cn(
          'fixed right-4 bottom-4 z-[100] m-0 flex w-[397px] max-w-[calc(100%-32px)] list-none flex-col gap-2 p-0 outline-none',
          className,
        )}
      />
    </ToastPrimitive.Provider>
  )
}
