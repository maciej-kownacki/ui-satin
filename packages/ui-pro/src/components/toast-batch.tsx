'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@uisatin/ui/button'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Item, List } from '@uisatin/ui/list'
import { toast, type ToastIntent } from '@uisatin/ui/toast'
import { RollingNumber } from './rolling-number'

/**
 * toastBatch: one toast for a change made to many items at once ("3 candidates moved"), whose
 * Undo reverts all of them. Show opens the list under the title, each item with its own Undo;
 * an undone item stays in the list, struck through, and the title counts what's left.
 *
 *   toastBatch({
 *     id: 'move-to-interview',
 *     title: (count) => `${count} candidates moved to Interview`,
 *     change: 'move',
 *     items: picked.map((c) => ({ id: c.id, label: c.name, undo: () => move(c, c.stage) })),
 *   })
 *
 * - Called again with the same `id` while its toast is open, the new items join the batch: the
 *   count rolls up and no second toast stacks. An agent working through a list calls it once per
 *   item. An item whose `id` is already there takes its place again, changed again.
 * - The count's digits roll as it changes (not under reduced motion). In a string title they
 *   roll where the count appears; a function title also gets the rolling number as its second
 *   argument, to place in JSX: `(count, number) => <>{number} moved</>`.
 * - ⌘Z (Ctrl+Z) undoes the newest open batch, unless focus is in a text field, where it undoes
 *   the typing as usual. `toastBatch.undo(id?)` does the same from code, for an app whose own
 *   undo owns ⌘Z (`undoShortcut: false`).
 * - Undone from ⌘Z or item by item, the toast says "All undone" with every item struck, and
 *   closes a moment later. Its own Undo button closes it at once, as any toast action does.
 * - It closes by itself after `duration` (paused while hovered or focused, restarted when items
 *   join), but not while the list is open, so nobody loses it mid-read.
 * - Screen readers hear the toast when it arrives, and the new title once per burst of changes
 *   ("6 candidates moved"), not at every item. Each item's Undo is named after the change and
 *   the item: "Undo move of Tara Mendes".
 *
 * It's a `toast()` with its own title, description and details, so it needs the app's
 * `<Toaster />`, stacks with the other toasts and keeps to the Toaster's `limit`. Call it
 * anywhere, outside React too; it returns the toast's id.
 */

/** The words toastBatch says on its own. They join SatinLabels, so the app translates them there. */
export const toastBatchLabels = {
  /** The toast's action, which undoes every item, and each item's own button. */
  undo: 'Undo',
  /**
   * An item's Undo, for screen readers: "Undo move of Tara Mendes" with the batch's `change`,
   * "Undo Tara Mendes" without one.
   */
  undoItem: (item: string, change?: string) => (change ? `Undo ${change} of ${item}` : `Undo ${item}`),
  /** An item already undone. */
  undone: 'Undone',
  /** The title once every item is undone. */
  allUndone: 'All undone',
  /** Read in place of the toast's Undo, which a screen reader may not reach in time: "Undo with ⌘Z". */
  undoWithShortcut: (shortcut: string) => `Undo with ${shortcut}`,
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
  /** Stable across calls: an item sent again with the same id takes its place. */
  id: string
  /** What the item is called in the list and in its Undo's name: a person, a deal, a file. */
  label: string
  /** A muted second line under the label: where it was, what changed. */
  description?: React.ReactNode
  /** Before the label, as it is: an Avatar, a file icon. */
  media?: React.ReactNode
  /** Puts this one item back as it was. */
  undo: () => unknown
}

export interface ToastBatchOptions {
  /**
   * What happened. A function gets how many items are still changed, and that count as a rolling
   * number for JSX: `(count) => `${count} candidates moved`` or `(count, number) => <>{number} moved</>`.
   */
  title: React.ReactNode | ((count: number, number: React.ReactNode) => React.ReactNode)
  items: ToastBatchItem[]
  /** What happened to each item, as a noun, for its Undo's name: `'move'` → "Undo move of Tara Mendes". */
  change?: string
  /**
   * Undoes every item still changed in one go (one request instead of one per item). Gets them, in
   * their order. Without it, each item's own `undo` runs, last first.
   */
  undoAll?: (items: ToastBatchItem[]) => unknown
  /** ⌘Z (Ctrl+Z) undoes the batch while its toast is open. Turn it off when the app's own undo owns the shortcut. */
  undoShortcut?: boolean
  intent?: ToastIntent
  /** Milliseconds before it closes while its list is folded; it stays once the list is open. */
  duration?: number
  /** The toast's id. Call again with the same id to add items to the open batch. */
  id?: string
}

/* ---------- the store: what each batch toast shows ---------- */

type Batch = {
  /** Its own prefix for element ids: the app's id may hold anything. */
  key: string
  options: ToastBatchOptions
  undone: ReadonlySet<string>
  expanded: boolean
  /** Bumped when items join: restarts the timer. */
  round: number
  /** When it last changed, to find the newest batch for ⌘Z. */
  touched: number
}

const batches = new Map<string, Batch>()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const emit = () => {
  for (const listener of listeners) listener()
}
const update = (id: string, change: (batch: Batch) => Batch) => {
  const batch = batches.get(id)
  if (!batch) return
  batches.set(id, change(batch))
  emit()
}
const useBatch = (id: string) => React.useSyncExternalStore(subscribe, () => batches.get(id), () => batches.get(id))
const remainingOf = (batch: Batch) => batch.options.items.filter((item) => !batch.undone.has(item.id))

let counter = 0
let clock = 0
const DEFAULT_DURATION = 8000
/** How long "All undone" stays, ms. */
const UNDONE_DURATION = 3000
/** Changes closer together than this are one burst, read out once at its end, ms. */
const BURST = 600

// Mounted toasts by batch id: a batch is forgotten once its toast is gone (not on a remount).
const mounted = new Map<string, number>()
// Each batch's Show button, where focus goes when the Undo it was on goes away.
const toggles = new Map<string, HTMLElement>()

const listIdOf = (batch: Batch) => `${batch.key}-items`
const titleIdOf = (batch: Batch) => `${batch.key}-title`

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...toastBatchLabels, ...labels }), [labels])
}

const apple = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
const shortcutText = () => (apple() ? '⌘Z' : 'Ctrl+Z')

/** Shows (or updates) the batch's toast. */
function show(id: string) {
  const batch = batches.get(id)
  if (!batch) return
  const done = remainingOf(batch).length === 0
  const words = (labels: object) => ({ ...toastBatchLabels, ...labels })
  toast(<BatchTitle id={id} />, {
    id,
    intent: batch.options.intent ?? 'success',
    // The batch keeps its own time (BatchToggle): Radix can't stop a timer it has started, and
    // an open list must not close under the reader.
    duration: Infinity,
    description: <BatchToggle id={id} />,
    details: batch.expanded ? <BatchList id={id} /> : undefined,
    // Nothing left to undo, no Undo. The words come from SatinLabels under the Toaster, with
    // this file's defaults under them.
    action: done
      ? undefined
      : {
          label: (labels) => words(labels).undo,
          altText: batch.options.undoShortcut === false ? undefined : (labels) => words(labels).undoWithShortcut(shortcutText()),
          onClick: () => undoRemaining(id, false),
        },
  })
}

/**
 * The toast after everything is undone: "All undone", no Undo, gone a moment later. Focus on its
 * Undo (⌘Z pressed there) moves to Show first, so it isn't dropped with the button.
 */
function settle(id: string) {
  const toggle = toggles.get(id)
  const active = typeof document !== 'undefined' ? document.activeElement : null
  // Radix marks a toast action with its alt text; Satin's Toast always gives one.
  if (toggle && active?.hasAttribute('data-radix-toast-announce-alt') && toggle.closest('[data-slot="toast"]')?.contains(active)) toggle.focus()
  show(id)
}

/** Undoes what's left of a batch. The toast's own Undo closes it; ⌘Z and toastBatch.undo() leave "All undone". */
function undoRemaining(id: string, stay: boolean) {
  const batch = batches.get(id)
  if (!batch) return false
  const remaining = remainingOf(batch)
  if (!remaining.length) return false
  update(id, (b) => ({ ...b, undone: new Set(b.options.items.map((item) => item.id)), touched: ++clock }))
  if (batch.options.undoAll) batch.options.undoAll(remaining)
  else for (const item of [...remaining].reverse()) item.undo()
  if (stay) settle(id)
  return true
}

function undoItem(id: string, item: ToastBatchItem) {
  const batch = batches.get(id)
  if (!batch || batch.undone.has(item.id)) return
  item.undo()
  update(id, (b) => ({ ...b, undone: new Set([...b.undone, item.id]), touched: ++clock }))
  const next = batches.get(id)
  if (next && remainingOf(next).length === 0) settle(id)
}

/** The batch ⌘Z undoes: the one changed last, on screen, with something left to undo. */
function newest(shortcut: boolean) {
  let found: [string, Batch] | undefined
  for (const entry of batches) {
    const [id, batch] = entry
    if (!mounted.get(id) || !remainingOf(batch).length || (shortcut && batch.options.undoShortcut === false)) continue
    if (!found || batch.touched > found[1].touched) found = entry
  }
  return found?.[0]
}

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

function onKeyDown(e: KeyboardEvent) {
  // ⌘Z or Ctrl+Z alone; Shift makes it redo. By the character, or by the key's place when the
  // layout has no Latin z on it.
  if (e.defaultPrevented || e.repeat || e.shiftKey || e.altKey || e.metaKey === e.ctrlKey) return
  if (e.key.toLowerCase() !== 'z' && !(e.code === 'KeyZ' && !/^[a-z]$/i.test(e.key))) return
  if (isEditable(e.target)) return
  const id = newest(true)
  if (!id) return
  e.preventDefault()
  undoRemaining(id, true)
}
// One listener for every batch on screen.
let listening = 0

function showBatch(options: ToastBatchOptions): string {
  const id = options.id ?? `toast-batch-${++counter}`
  const open = batches.get(id)
  if (open) {
    // The new items join the open batch; one already there takes its place, changed again.
    const incoming = new Map(options.items.map((item) => [item.id, item]))
    const known = new Set(open.options.items.map((item) => item.id))
    const items = [...open.options.items.map((item) => incoming.get(item.id) ?? item), ...options.items.filter((item) => !known.has(item.id))]
    batches.set(id, {
      ...open,
      options: { ...open.options, ...options, items },
      undone: new Set([...open.undone].filter((key) => !incoming.has(key))),
      round: open.round + 1,
      touched: ++clock,
    })
    emit()
  } else {
    batches.set(id, { key: `satin-toast-batch-${++counter}`, options, undone: new Set(), expanded: false, round: 0, touched: ++clock })
  }
  show(id)
  return id
}

/** Shows one toast for a batch of changes, or adds to the open one with the same `id`; returns its id. */
export const toastBatch = Object.assign(showBatch, {
  /**
   * Undoes every item still changed, as ⌘Z does: in the batch with this id, or the newest one
   * on screen. Its toast says "All undone", then closes. Returns whether there was anything to undo.
   */
  undo: (id?: string): boolean => {
    const target = id ?? newest(false)
    return target ? undoRemaining(target, true) : false
  },
})

/* ---------- what the toast shows ---------- */

/** Puts the rolling number where the count is in a string title ("3 candidates moved"). */
function rollIn(title: React.ReactNode, count: number, text: string, number: React.ReactNode) {
  if (typeof title !== 'string') return title
  for (const n of new Set([text, String(count)])) {
    for (let at = title.indexOf(n); at !== -1; at = title.indexOf(n, at + 1)) {
      // The whole number, not a digit of another one.
      if (/\d/.test(title[at - 1] ?? '') || /\d/.test(title[at + n.length] ?? '')) continue
      return (
        <>
          {title.slice(0, at)}
          {number}
          {title.slice(at + n.length)}
        </>
      )
    }
  }
  return title
}

function BatchTitle({ id }: { id: string }) {
  const batch = useBatch(id)
  const labels = useLabels()
  if (!batch) return null
  const count = remainingOf(batch).length
  let content: React.ReactNode = labels.allUndone
  if (count) {
    const { title } = batch.options
    const text = new Intl.NumberFormat(labels.dateLocale).format(count)
    // The digits roll for the eye; screen readers get the number as text.
    const number = (
      <>
        <RollingNumber text={text} value={count} />
        <span className="sr-only">{text}</span>
      </>
    )
    content = typeof title === 'function' ? rollIn(title(count, number), count, text, number) : title
  }
  return (
    <span id={titleIdOf(batch)} data-slot="toast-batch-title">
      {content}
    </span>
  )
}

/** The text of an element as a screen reader reads it: without what's hidden from it. */
function spokenText(el: Element) {
  const copy = el.cloneNode(true) as Element
  for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove()
  return copy.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

/**
 * The title, read once at the end of each burst of changes. Radix reads the toast as it
 * arrives, so the first count isn't repeated. In the page's body, not the toast: a toast behind
 * another one is hidden from screen readers, and its count still changes.
 */
function BatchAnnouncer({ titleId, count }: { titleId: string; count: number }) {
  const [message, setMessage] = React.useState({ text: '', round: 0 })
  const spoken = React.useRef(count)
  React.useEffect(() => {
    if (count === spoken.current) return
    const timer = setTimeout(() => {
      spoken.current = count
      const title = document.getElementById(titleId)
      if (title) setMessage((m) => ({ text: spokenText(title), round: m.round + 1 }))
    }, BURST)
    return () => clearTimeout(timer)
  }, [titleId, count])
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => setReady(true), [])
  if (!ready) return null
  return createPortal(
    <div role="status" aria-live="polite" aria-atomic="true" data-slot="toast-batch-status" className="sr-only">
      {/* A new node each time, so the same words twice are read twice. */}
      {message.text ? <span key={message.round}>{message.text}</span> : null}
    </div>,
    document.body,
  )
}

/**
 * The batch's timer: it closes the toast after `ms`, paused while the pointer is over the toasts
 * or focus is in them (as Radix's own timer is). A new `round` (items joined) starts it over.
 */
function useBatchTimer(id: string, anchor: React.RefObject<HTMLElement | null>, ms: number, round: number) {
  React.useEffect(() => {
    if (ms === Infinity) return
    const viewport = anchor.current?.closest('[data-slot="toast"]')?.parentElement
    let remaining = ms
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
    if (!viewport?.matches(':hover') && !viewport?.contains(document.activeElement)) run()
    return () => {
      clearTimeout(timer)
      viewport?.removeEventListener('pointerenter', pause)
      viewport?.removeEventListener('pointerleave', run)
      viewport?.removeEventListener('focusin', pause)
      viewport?.removeEventListener('focusout', leaveFocus)
    }
  }, [id, anchor, ms, round])
}

/** Show / Hide under the title: opens the list of items under the toast's row. It also keeps the batch's time and ⌘Z. */
function BatchToggle({ id }: { id: string }) {
  const batch = useBatch(id)
  const labels = useLabels()
  const ref = React.useRef<HTMLButtonElement>(null)
  const count = batch ? remainingOf(batch).length : 0
  const ms = !batch ? Infinity : count === 0 ? UNDONE_DURATION : batch.expanded ? Infinity : (batch.options.duration ?? DEFAULT_DURATION)
  useBatchTimer(id, ref, ms, batch?.round ?? 0)
  React.useEffect(() => {
    mounted.set(id, (mounted.get(id) ?? 0) + 1)
    if (ref.current) toggles.set(id, ref.current)
    if (listening++ === 0) document.addEventListener('keydown', onKeyDown)
    return () => {
      mounted.set(id, (mounted.get(id) ?? 1) - 1)
      if (--listening === 0) document.removeEventListener('keydown', onKeyDown)
      // After the commit: a remount (StrictMode) comes back before this runs.
      queueMicrotask(() => {
        if (!mounted.get(id)) (mounted.delete(id), batches.delete(id), toggles.delete(id))
      })
    }
  }, [id])
  if (!batch) return null
  const toggle = () => {
    update(id, (b) => ({ ...b, expanded: !b.expanded }))
    show(id)
  }
  return (
    <>
      <Button
        ref={ref}
        variant="tertiary"
        size="xs"
        data-slot="toast-batch-toggle"
        // Screen readers hear the title when the toast arrives, not this button.
        data-radix-toast-announce-exclude=""
        aria-expanded={batch.expanded}
        aria-controls={batch.expanded ? listIdOf(batch) : undefined}
        onClick={toggle}
        className="-ms-2 mt-0.5 text-text-muted"
      >
        {batch.expanded ? labels.hideItems : labels.showItems}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className={cn(batch.expanded && 'rotate-180')}>
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>
      <BatchAnnouncer titleId={titleIdOf(batch)} count={count} />
    </>
  )
}

/** The items, each with its own Undo; an undone one stays, struck through. */
function BatchList({ id }: { id: string }) {
  const batch = useBatch(id)
  const labels = useLabels()
  if (!batch) return null
  return (
    <List
      id={listIdOf(batch)}
      variant="divided"
      size="sm"
      aria-labelledby={titleIdOf(batch)}
      data-state="open"
      data-radix-toast-announce-exclude=""
      // Fades in as it opens; a long batch scrolls inside the toast.
      className="satin-collapsible max-h-60 overflow-y-auto overscroll-contain border-t border-border-default"
    >
      {batch.options.items.map((item) => {
        const undone = batch.undone.has(item.id)
        return (
          <Item
            key={item.id}
            data-undone={undone || undefined}
            title={<span className={cn(undone && 'text-text-muted line-through')}>{item.label}</span>}
            description={item.description}
            media={item.media}
            actions={
              <Button
                variant="tertiary"
                size="xs"
                aria-label={undone ? `${item.label}, ${labels.undone}` : labels.undoItem(item.label, batch.options.change)}
                // Done, it keeps its place and the focus, and does nothing more.
                aria-disabled={undone || undefined}
                onClick={() => undoItem(id, item)}
                className={cn(undone && 'cursor-default text-text-muted')}
              >
                {undone ? labels.undone : labels.undo}
              </Button>
            }
          />
        )
      })}
    </List>
  )
}
