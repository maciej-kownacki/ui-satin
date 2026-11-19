'use client'

import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { toast, type ToastIntent } from '@uisatin/ui/toast'

/**
 * toastBatch: one toast for a change made to many items at once ("3 deals moved"), whose Undo
 * reverts all of them. Show opens the list under the title, each item with its own Undo; an
 * undone item stays in the list, struck through, and the title counts what's left. Undoing the
 * last one, or all at once, closes the toast. It closes by itself after `duration` (paused while
 * hovered or focused), but not once the list is open, so nobody loses it mid-read.
 *
 * It's a `toast()` with its own title and description, so it needs the app's `<Toaster />` and
 * stacks with the other toasts. Call it anywhere, outside React too; it returns the toast's id.
 *
 *   toastBatch({
 *     title: (count) => `${count} deals moved`,
 *     items: deals.map((d) => ({ id: d.id, label: d.name, undo: () => move(d, d.stage) })),
 *   })
 */

/** The words toastBatch says on its own. They join SatinLabels, so the app translates them there. */
export const toastBatchLabels = {
  /** The toast's action, which undoes every item, and each item's own button. */
  undo: 'Undo',
  /** An item's Undo, for screen readers: "Undo Acme Corp". */
  undoItem: (item: string) => `Undo ${item}`,
  /** An item already undone. */
  undone: 'Undone',
  /** Opens the list of items. */
  showItems: 'Show',
  /** Folds it again. */
  hideItems: 'Hide',
}

type ToastBatchLabels = typeof toastBatchLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends ToastBatchLabels {}
}

export interface ToastBatchItem {
  id: string
  /** What the item is called in the list: a deal, a file, a person. */
  label: string
  /** Puts this one item back as it was. */
  undo: () => unknown
}

export interface ToastBatchOptions {
  /** What happened. A function gets how many items are still changed: `(count) => `${count} deals moved``. */
  title: React.ReactNode | ((count: number) => React.ReactNode)
  items: ToastBatchItem[]
  /**
   * Undoes every item still changed in one go (one request instead of one per item). Gets them, in
   * their order. Without it, each item's own `undo` runs, last first.
   */
  undoAll?: (items: ToastBatchItem[]) => unknown
  intent?: ToastIntent
  /** Milliseconds before it closes while its list is folded; it stays once the list is open. */
  duration?: number
  /** The toast's id, to update or dismiss it. */
  id?: string
}

/* ---------- the store: what each batch toast shows ---------- */

type Batch = { options: ToastBatchOptions; undone: ReadonlySet<string>; expanded: boolean }

const batches = new Map<string, Batch>()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const update = (id: string, change: (batch: Batch) => Batch) => {
  const batch = batches.get(id)
  if (!batch) return
  batches.set(id, change(batch))
  for (const listener of listeners) listener()
}
const useBatch = (id: string) => React.useSyncExternalStore(subscribe, () => batches.get(id), () => batches.get(id))
const remainingOf = (batch: Batch) => batch.options.items.filter((item) => !batch.undone.has(item.id))

let counter = 0
const DEFAULT_DURATION = 8000

/** Shows (or updates) the batch's toast. */
function show(id: string) {
  const batch = batches.get(id)
  if (!batch) return
  toast(<BatchTitle id={id} />, {
    id,
    intent: batch.options.intent ?? 'success',
    // The batch keeps its own time (BatchToggle): Radix can't stop a timer it has started, and
    // an open list must not close under the reader.
    duration: Infinity,
    description: <BatchToggle id={id} />,
    details: batch.expanded ? <BatchList id={id} /> : undefined,
    // The words come from SatinLabels under the Toaster, with this file's defaults under them.
    action: { label: (labels) => ({ ...toastBatchLabels, ...labels }).undo, onClick: () => undoAll(id) },
  })
}

function undoAll(id: string) {
  const batch = batches.get(id)
  if (!batch) return
  const remaining = remainingOf(batch)
  update(id, (b) => ({ ...b, undone: new Set(b.options.items.map((item) => item.id)) }))
  if (batch.options.undoAll) batch.options.undoAll(remaining)
  else for (const item of [...remaining].reverse()) item.undo()
}

function undoItem(id: string, item: ToastBatchItem) {
  const batch = batches.get(id)
  if (!batch || batch.undone.has(item.id)) return
  item.undo()
  update(id, (b) => ({ ...b, undone: new Set([...b.undone, item.id]) }))
  const next = batches.get(id)
  if (next && remainingOf(next).length === 0) toast.dismiss(id)
}

/** Shows one toast for a batch of changes; returns its id. */
export function toastBatch(options: ToastBatchOptions): string {
  const id = options.id ?? `toast-batch-${++counter}`
  batches.set(id, { options, undone: new Set(), expanded: false })
  show(id)
  return id
}

/* ---------- what the toast shows ---------- */

function BatchTitle({ id }: { id: string }) {
  const batch = useBatch(id)
  if (!batch) return null
  const { title } = batch.options
  return <>{typeof title === 'function' ? title(remainingOf(batch).length) : title}</>
}

// Mounted toasts by batch id: a batch is forgotten once its toast is gone (not on a remount).
const mounted = new Map<string, number>()

const listIdOf = (id: string) => `${id}-items`

/**
 * The batch's timer: it closes the toast after `duration`, paused while the pointer is over the
 * toasts or focus is in them (as Radix's own timer is), and stopped for good once the list opens.
 */
function useBatchTimer(id: string, anchor: React.RefObject<HTMLElement | null>, expanded: boolean, duration: number) {
  React.useEffect(() => {
    if (expanded || duration === Infinity) return
    const viewport = anchor.current?.closest('[data-slot="toast"]')?.parentElement
    let remaining = duration
    let started = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = () => {
      clearTimeout(timer)
      started = Date.now()
      timer = setTimeout(() => toast.dismiss(id), remaining)
    }
    const pause = () => {
      if (timer === undefined) return
      clearTimeout(timer)
      timer = undefined
      remaining = Math.max(0, remaining - (Date.now() - started))
    }
    const leaveFocus = (e: FocusEvent) => {
      if (!viewport?.contains(e.relatedTarget as Node | null)) run()
    }
    viewport?.addEventListener('pointerenter', pause)
    viewport?.addEventListener('pointerleave', run)
    viewport?.addEventListener('focusin', pause)
    viewport?.addEventListener('focusout', leaveFocus)
    if (viewport?.matches(':hover') || viewport?.contains(document.activeElement)) remaining = duration
    else run()
    return () => {
      clearTimeout(timer)
      viewport?.removeEventListener('pointerenter', pause)
      viewport?.removeEventListener('pointerleave', run)
      viewport?.removeEventListener('focusin', pause)
      viewport?.removeEventListener('focusout', leaveFocus)
    }
  }, [id, anchor, expanded, duration])
}

/** Show / Hide under the title: opens the list of items under the toast's row. */
function BatchToggle({ id }: { id: string }) {
  const batch = useBatch(id)
  const labels = { ...toastBatchLabels, ...useSatinLabels() }
  const ref = React.useRef<HTMLButtonElement>(null)
  useBatchTimer(id, ref, batch?.expanded ?? false, batch?.options.duration ?? DEFAULT_DURATION)
  React.useEffect(() => {
    mounted.set(id, (mounted.get(id) ?? 0) + 1)
    return () => {
      mounted.set(id, (mounted.get(id) ?? 1) - 1)
      setTimeout(() => {
        if (!mounted.get(id)) (mounted.delete(id), batches.delete(id))
      }, 0)
    }
  }, [id])
  if (!batch) return null
  const toggle = () => {
    update(id, (b) => ({ ...b, expanded: !b.expanded }))
    show(id)
  }
  return (
    <Button
      ref={ref}
      variant="tertiary"
      size="xs"
      data-slot="toast-batch-toggle"
      // Screen readers hear the title when the toast arrives, not this button.
      data-radix-toast-announce-exclude=""
      aria-expanded={batch.expanded}
      aria-controls={batch.expanded ? listIdOf(id) : undefined}
      onClick={toggle}
      className="-ms-2 mt-0.5 text-text-muted"
    >
      {batch.expanded ? labels.hideItems : labels.showItems}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className={cn(batch.expanded && 'rotate-180')}>
        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Button>
  )
}

/** The items, each with its own Undo; an undone one stays, struck through. */
function BatchList({ id }: { id: string }) {
  const batch = useBatch(id)
  const labels = { ...toastBatchLabels, ...useSatinLabels() }
  if (!batch) return null
  return (
    <ul id={listIdOf(id)} data-slot="toast-batch" data-state="open" data-radix-toast-announce-exclude="" className="satin-collapsible flex w-full flex-col">
      {batch.options.items.map((item) => {
        const undone = batch.undone.has(item.id)
        return (
          <li key={item.id} className="flex min-h-8 w-full items-center justify-between gap-3 border-t border-border-subtle">
            <span className={cn('min-w-0 truncate', undone ? 'text-text-muted line-through' : 'text-text-default')}>{item.label}</span>
            <Button
              variant="tertiary"
              size="xs"
              aria-label={undone ? `${item.label}, ${labels.undone}` : labels.undoItem(item.label)}
              // Done, it keeps its place and the focus, and does nothing more.
              aria-disabled={undone || undefined}
              onClick={() => undoItem(id, item)}
              className={cn('shrink-0', undone && 'cursor-default text-text-muted')}
            >
              {undone ? labels.undone : labels.undo}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
