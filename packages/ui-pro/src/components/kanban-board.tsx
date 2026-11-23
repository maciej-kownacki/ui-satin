'use client'

import * as React from 'react'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Card } from '@uisatin/ui/card'
import { Dot, type DotTone } from '@uisatin/ui/dot'
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem } from '@uisatin/ui/dropdown'
import { EmptyState } from '@uisatin/ui/empty-state'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Skeleton } from '@uisatin/ui/skeleton'
import { toast } from '@uisatin/ui/toast'

/**
 * KanbanBoard: columns of cards, each column a stage (Lead, Qualified, Proposal), with its
 * count and an optional limit, and cards that move between them by pointer, touch or keyboard.
 *
 * It is controlled: `items` holds the cards of each column in order, and a move only calls
 * `onMove(itemId, toColumn, index)`. Nothing moves until the app puts the card there, so
 * `onMove` is the one source of truth; `moveKanbanItem()` does the splice.
 *
 * - Pointer: press a card and move 4px (touch: hold it 250 ms, so a swipe still scrolls). The
 *   card lifts (scale 1.02, the toast's shadow, a 1° lean to the left, to the right in RTL) and
 *   follows the pointer without easing; a dashed gap opens where it would land and the cards
 *   around it shift on --ease-in-out. Near the edge of a column or of the board, they scroll.
 *   Dropped, it springs into place over 200 ms (--ease-spring, about 3% past and back; the
 *   same drop as Agent plan's steps); Escape puts it back. A collapsed column takes a card at its end.
 * - Keyboard: Space picks the focused card up; ↑ ↓ move it within its column, ← → to the next
 *   column (mirrored right to left), Home and End to the top or bottom; Space drops it and
 *   Escape puts it back. Every step is read out from a polite live region: "Moved Lumen Bank
 *   to Proposal, position 2 of 4". Without a card picked up, the arrow keys move focus
 *   between cards. These moves don't animate (MOTION.md: no motion on frequent keys).
 * - Without dragging: KanbanCard's ⋯ menu moves a card to another column or up and down, the
 *   single-pointer way WCAG 2.5.7 asks for.
 * - A move to another column shows a toast, "Moved to Proposal", whose Undo calls `onMove`
 *   with the card's old column and index, so it goes back to the exact place. It needs the
 *   app's `<Toaster />`; turn it off with `undoToast={false}`.
 * - A column past its `limit` turns its count amber (while a card is dragged over it, too).
 *   An empty column shows an EmptyState; `loading` shows Skeleton cards. A column's `more`
 *   counts cards `items` doesn't hold yet: the count includes them and the column ends with
 *   "+3 more" (a button when `onShowMore` is set).
 * - `canMove(item, column)` refuses columns: from the moment a card lifts, their cards dim and
 *   take no gap, the reason shows under the lifted card while it's over one, and a drop there
 *   puts it back and reads the reason out. The ⋯ menu lists them with the reason.
 * - `confirmMove(item, column, index)` runs before `onMove`. A promise keeps the card at its
 *   new place, dimmed and busy, until it settles: `true` moves it, anything else puts it back.
 * - KanbanCard's `changed` key: when it changes, the card lights up once (opacity only) and
 *   the board reads "Northwind Labs was updated".
 *
 * Words go through SatinLabels (`kanbanBoardLabels`). Other props, `ref` included, go to the
 * board's `section`; give it an `aria-label` and it becomes a named region.
 */

/** The words the Kanban board says on its own. They join SatinLabels, so the app translates them there. */
export const kanbanBoardLabels = {
  /** What a card is, read after its name: "Lumen Bank, draggable card". */
  kanbanCard: 'draggable card',
  /** How to move a card from the keyboard, read when a card gets focus. */
  kanbanCardHint: 'Press Space to pick it up. Arrow keys move it, Space drops it, Escape cancels.',
  /** A column's count, for screen readers. `limit` is there when the column has one. */
  kanbanCount: (count: number, limit?: number) =>
    limit === undefined
      ? `${count} ${count === 1 ? 'card' : 'cards'}`
      : count > limit
        ? `${count} cards, over the limit of ${limit}`
        : `${count} of ${limit} cards`,
  /** An empty column. */
  kanbanEmpty: 'No cards',
  kanbanAddTo: (column: string) => `Add to ${column}`,
  kanbanCollapse: (column: string) => `Collapse ${column}`,
  kanbanExpand: (column: string) => `Expand ${column}`,
  /** A card's ⋯ button. */
  kanbanCardMenu: (item: string) => `More options for ${item}`,
  /** The group of columns in a card's ⋯ menu. */
  kanbanMoveTo: 'Move to',
  kanbanMoveUp: 'Move up',
  kanbanMoveDown: 'Move down',
  /** Read out when a card is picked up. */
  kanbanPickedUp: (item: string, column: string, position: number, count: number) =>
    `Picked up ${item}. ${column}, position ${position} of ${count}.`,
  /** Read out at each step of a keyboard move. */
  kanbanOver: (item: string, column: string, position: number, count: number) => `${column}, position ${position} of ${count}`,
  /** Read out when a card lands. */
  kanbanMoved: (item: string, column: string, position: number, count: number) =>
    `Moved ${item} to ${column}, position ${position} of ${count}`,
  /** Read out when a move is cancelled. */
  kanbanCancelled: (item: string, column: string, position: number, count: number) =>
    `Move cancelled. ${item} is back in ${column}, position ${position} of ${count}.`,
  /** The toast after a card moves to another column. */
  kanbanMovedTo: (column: string) => `Moved to ${column}`,
  /** The toast's action. */
  undo: 'Undo',
  /** The end of a column with cards `items` doesn't hold yet. */
  kanbanMore: (count: number) => `+${count} more`,
  /** Read out when `canMove` refuses a column; `reason` is what it returned. */
  kanbanRefused: (item: string, column: string, reason?: string) =>
    reason ? `Can't move ${item} to ${column}: ${reason}` : `Can't move ${item} to ${column}`,
  /** Read after a stale card's name, with its status. */
  kanbanStale: 'stale',
  /** Read out when a card's `changed` key changes. */
  kanbanUpdated: (item: string) => `${item} was updated`,
}

type KanbanBoardLabels = typeof kanbanBoardLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends KanbanBoardLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...kanbanBoardLabels, ...labels }), [labels])
}

/* ---------- types ---------- */

export interface KanbanColumn {
  /** Names the column in `items`, `onMove` and `collapsedColumns`. */
  id: string
  /** The column's name: its header, its list's name, and what announcements and the toast say. */
  title: string
  /** A Dot before the title, in this tone. */
  tone?: DotTone
  /**
   * How many cards the column should hold (a work-in-progress limit). The count shows `6/8`
   * and turns amber past it. Moves past it are still allowed (`confirmMove` can ask first).
   */
  limit?: number
  /**
   * Cards in the column that `items` doesn't hold (not loaded yet, or paged). The count, the
   * limit and the announcements include them; the column ends with "+3 more". A card can only
   * land among the loaded ones.
   */
  more?: number
}

/** What `renderCard` gets besides the item. */
export interface KanbanCardState {
  /** The column the card shows in. */
  columnId: string
  /** Its place in that column, from 0. */
  index: number
  /** Picked up: following the pointer, or moving with the arrow keys. */
  lifted: boolean
}

export interface KanbanBoardProps<T> extends Omit<React.ComponentProps<'section'>, 'children'> {
  /** The columns, in order. */
  columns: KanbanColumn[]
  /** Each column's cards, in order, by column id. */
  items: Record<string, T[]>
  /** A card's id: unique on the board, stable across moves. */
  getItemId: (item: T) => string
  /** A card's name for screen readers, announcements and the toast: "Lumen Bank". */
  getItemLabel: (item: T) => string
  /** The card itself, usually a `KanbanCard`. */
  renderCard: (item: T, state: KanbanCardState) => React.ReactNode
  /**
   * A card was dropped. `index` is its place in `toColumn` once it's there, from 0, counting
   * loaded cards only (a column's `more` sit after them). Move it in `items`
   * (`moveKanbanItem()` does it); until you do, the board shows it where it was.
   */
  onMove: (itemId: string, toColumn: string, index: number) => void
  /**
   * Whether a card may go to a column. `true` allows it; anything else refuses, and a
   * non-empty string is the reason ("Set a next step first"), shown under the lifted card and
   * read out. Called once per column when a card lifts, and for the ⋯ menu; never for the
   * card's own column.
   */
  canMove?: (item: T, toColumn: string) => boolean | string
  /**
   * Asked before `onMove`, for every real move (Undo skips it). `false` puts the card back. A
   * promise keeps the card at its new place, dimmed and busy, until it settles: `true` moves
   * it, `false` or a rejection puts it back. Open a Dialog from here to ask.
   */
  confirmMove?: (item: T, toColumn: string, index: number) => boolean | Promise<boolean>
  /** Makes a column's "+3 more" a button, which calls this with the column's id. */
  onShowMore?: (columnId: string) => void
  /** Collapsed columns, by id: a narrow strip with the title and count. Controlled. */
  collapsedColumns?: string[]
  /** Collapsed columns at first, when `collapsedColumns` isn't set. */
  defaultCollapsedColumns?: string[]
  onCollapsedColumnsChange?: (collapsedColumns: string[]) => void
  /** A collapse button in every column header, and an expand button on collapsed ones. */
  collapsible?: boolean
  /** A + button in every column header, which calls this with the column's id. */
  onAddItem?: (columnId: string) => void
  /** Skeleton cards in every column, and `aria-busy` on the board. */
  loading?: boolean
  /** What an empty column shows. Defaults to an EmptyState saying "No cards". */
  renderEmpty?: (column: KanbanColumn) => React.ReactNode
  /** The "Moved to Proposal" toast with Undo after a move to another column. Needs a `<Toaster />`. */
  undoToast?: boolean
  /** A column's width in px. */
  columnWidth?: number
}

type Place = { column: string; index: number }
type Drag = {
  id: string
  mode: 'pointer' | 'keyboard'
  from: Place
  to: Place
  width: number
  height: number
  /** The columns `canMove` refused at lift, with the reason when it gave one. */
  refused: ReadonlyMap<string, string | undefined>
}
/** How a move started: a pointer drop glides back when a confirmation says no. */
type Via = 'pointer' | 'keyboard' | 'menu'
/** A move waiting for `confirmMove`'s promise: the board shows the card at `to` meanwhile. */
type Pending = { from: Place; to: Place; via: Via }

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  !!value && typeof (value as PromiseLike<unknown>).then === 'function'

/**
 * `items` with one card moved: out of its column, into `toColumn` at `index` (counted without
 * it). Returns `items` itself when the card isn't there.
 *
 *   onMove={(id, to, index) => setItems((all) => moveKanbanItem(all, (c) => c.id, id, to, index))}
 */
export function moveKanbanItem<T>(
  items: Record<string, T[]>,
  getItemId: (item: T) => string,
  itemId: string,
  toColumn: string,
  index: number,
): Record<string, T[]> {
  let moved: { item: T } | undefined
  const next: Record<string, T[]> = {}
  for (const [column, list] of Object.entries(items)) {
    next[column] = list.filter((item) => {
      if (getItemId(item) !== itemId) return true
      moved = { item }
      return false
    })
  }
  if (!moved) return items
  const target = next[toColumn] ?? (next[toColumn] = [])
  target.splice(Math.max(0, Math.min(index, target.length)), 0, moved.item)
  return next
}

/* ---------- context for KanbanCard ---------- */

interface BoardContextValue {
  columns: KanbanColumn[]
  /** Loaded cards in a column, as the board shows it now. */
  loadedOf: (columnId: string) => number
  moveTo: (itemId: string, to: Place) => void
  /** The columns a card can't go to (`canMove`), with the reason when there is one. */
  refusals: (itemId: string) => ReadonlyMap<string, string | undefined>
  /** Each card's last `changed` key, so a card that remounts in another column doesn't light up. */
  seen: Map<string, string | number>
  announce: (text: string) => void
}
interface ItemContextValue {
  id: string
  label: string
  columnId: string
  index: number
  /** The id of the card's description (its status and staleness), which KanbanCard renders. */
  descId: string
  /** In the card that follows the pointer: a picture, nothing to press. */
  overlay?: boolean
}

const BoardContext = React.createContext<BoardContextValue | null>(null)
const ItemContext = React.createContext<ItemContextValue | null>(null)

/* ---------- helpers ---------- */

const MOUSE_SLOP = 4
const TOUCH_SLOP = 8
const LONG_PRESS = 250
const EDGE = 48
const MAX_SCROLL = 14
const MOTION_MS = 260
const UNDO_MS = 8000
const LIFTED_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']

/** Things inside a card that keep their own press: a drag never starts from them. */
const INTERACTIVE =
  'button, a[href], input, select, textarea, [contenteditable=""], [contenteditable="true"], [role="button"], [role="menuitem"], [role="checkbox"], [role="switch"], [data-kanban-no-drag]'

const isInteractive = (target: EventTarget | null, card: HTMLElement) => {
  if (!(target instanceof Element) || target === card) return false
  const hit = target.closest(INTERACTIVE)
  return !!hit && hit !== card && card.contains(hit)
}

const isRtl = (el: Element | null) => !!el && getComputedStyle(el).direction === 'rtl'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** How fast to scroll when the pointer is within EDGE of `start` or `end`. */
const edgeSpeed = (p: number, start: number, end: number) => {
  if (end - start < EDGE * 3) return 0
  if (p < start + EDGE) return -Math.ceil(MAX_SCROLL * Math.min(1, (start + EDGE - p) / EDGE))
  if (p > end - EDGE) return Math.ceil(MAX_SCROLL * Math.min(1, (p - end + EDGE) / EDGE))
  return 0
}

const flipTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()
/**
 * Sets a FLIP phase on a card and clears it once the motion is over. The dropped card's two
 * phases also set drag.css's data-drag: `lift` leans it as the overlay was, `settle` springs it
 * into place.
 */
function setFlip(el: HTMLElement, phase: 'invert' | 'shift' | 'lift' | 'settle') {
  clearTimeout(flipTimers.get(el))
  el.dataset.flip = phase
  if (phase === 'lift') el.dataset.drag = 'lifted'
  else if (phase === 'settle') el.dataset.drag = 'settle'
  else delete el.dataset.drag
  if (phase === 'shift' || phase === 'settle') {
    flipTimers.set(
      el,
      setTimeout(() => {
        if (el.dataset.flip !== phase) return
        delete el.dataset.flip
        delete el.dataset.drag
      }, MOTION_MS),
    )
  }
}

/* ---------- glyphs ---------- */

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M8 3.33v9.34M3.33 8h9.34" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
)
const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="6" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="18" cy="12" r="1.5" />
  </svg>
)
/** Two chevrons pointing inward (collapse) or outward (expand); mirrored right to left. */
const CollapseIcon = ({ expand }: { expand?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="rtl:-scale-x-100">
    <path
      d={expand ? 'M6 4.67 9.33 8 6 11.33' : 'M10 4.67 6.67 8 10 11.33'}
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
/** A circle with a bar: the column won't take the card. */
const NoEntryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
    <path d="M5.25 8h5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
)
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
    <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
/** The clock with an exclamation mark beside it: nothing has happened for too long. */
const ClockAlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
    <path d="M12.2 6.6A5.5 5.5 0 1 0 12.2 10.9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    <path d="M7 6v2.75l1.75 1.25M14.5 4.5v3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="14.5" cy="10.5" r="0.75" fill="currentColor" />
  </svg>
)

/** Why the lifted card can't land here: a small pill under it, outside the column's layout. */
function RefusedNote({ reason }: { reason: string }) {
  return (
    <span
      aria-hidden
      data-slot="kanban-refused"
      className="pointer-events-none absolute start-0 top-full z-10 mt-2 inline-flex max-w-full items-center gap-1.5 rounded-pill border border-border-subtle bg-bg-popover px-2 py-1 text-sm text-text-destructive"
    >
      <NoEntryIcon />
      <span className="truncate">{reason}</span>
    </span>
  )
}

/* ---------- the board ---------- */

export function KanbanBoard<T>({
  columns,
  items,
  getItemId,
  getItemLabel,
  renderCard,
  onMove,
  canMove,
  confirmMove,
  onShowMore,
  collapsedColumns,
  defaultCollapsedColumns,
  onCollapsedColumnsChange,
  collapsible = false,
  onAddItem,
  loading = false,
  renderEmpty,
  undoToast = true,
  columnWidth = 272,
  className,
  ref,
  ...props
}: KanbanBoardProps<T>) {
  const labels = useLabels()
  const number = React.useMemo(() => new Intl.NumberFormat(labels.dateLocale), [labels.dateLocale])
  const hintId = React.useId()
  const baseId = React.useId()

  const [ownCollapsed, setOwnCollapsed] = React.useState<string[]>(defaultCollapsedColumns ?? [])
  const collapsed = collapsedColumns ?? ownCollapsed
  const setCollapsed = (next: string[]) => {
    if (collapsedColumns === undefined) setOwnCollapsed(next)
    onCollapsedColumnsChange?.(next)
  }

  const [drag, setDragState] = React.useState<Drag | null>(null)
  const dragRef = React.useRef<Drag | null>(null)
  const setDrag = (next: Drag | null) => {
    dragRef.current = next
    setDragState(next)
  }
  // `n` keys the live region's text, so the same words twice still change it and are read again.
  const [message, setMessage] = React.useState({ text: '', n: 0 })
  const [pending, setPendingState] = React.useState<ReadonlyMap<string, Pending>>(() => new Map())
  const pendingRef = React.useRef(pending)
  const setPending = (next: ReadonlyMap<string, Pending>) => {
    pendingRef.current = next
    setPendingState(next)
  }
  const seen = React.useRef(new Map<string, string | number>())

  // Elements, by id.
  const itemEls = React.useRef(new Map<string, HTMLLIElement>())
  const listEls = React.useRef(new Map<string, HTMLUListElement>())
  const columnEls = React.useRef(new Map<string, HTMLDivElement>())
  const bodyEls = React.useRef(new Map<string, HTMLDivElement>())
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const probeRef = React.useRef<HTMLDivElement>(null)

  // Motion and focus to apply after the next render.
  const flipFirst = React.useRef<Map<string, DOMRect> | null>(null)
  const settle = React.useRef<{ id: string; rect: DOMRect } | null>(null)
  // `items` as they were when it was set: if they change and the card isn't where it was meant to
  // go, the app put it elsewhere, and the focus waits no longer.
  const pendingFocus = React.useRef<{ id: string; column: string; scroll: boolean; items: Record<string, T[]> } | null>(null)
  const focusLater = (id: string, column: string, scroll: boolean) => {
    pendingFocus.current = { id, column, scroll, items: latest.current.items }
  }

  // The cards as the board shows them: `items`, with moves waiting for `confirmMove` applied…
  const shown = React.useMemo(() => {
    let all = items
    for (const [id, p] of pending) all = moveKanbanItem(all, getItemId, id, p.to.column, p.to.index)
    return all
  }, [items, pending, getItemId])
  // …and the lifted card where a drag holds it.
  const view = React.useMemo(
    () => (drag ? moveKanbanItem(shown, getItemId, drag.id, drag.to.column, drag.to.index) : shown),
    [drag, shown, getItemId],
  )

  // Everything the window listeners and promises need, fresh on every render.
  const latest = React.useRef({ items, shown, columns, collapsed, getItemId, getItemLabel, onMove, canMove, confirmMove, labels, undoToast })
  latest.current = { items, shown, columns, collapsed, getItemId, getItemLabel, onMove, canMove, confirmMove, labels, undoToast }

  const findItem = (id: string) => {
    const { columns, shown, getItemId } = latest.current
    for (const column of columns) {
      const list = shown[column.id] ?? []
      const index = list.findIndex((item) => getItemId(item) === id)
      if (index >= 0) return { item: list[index]!, place: { column: column.id, index } }
    }
    return null
  }
  const titleOf = (columnId: string) => latest.current.columns.find((c) => c.id === columnId)?.title ?? columnId
  const moreOf = (columnId: string) => latest.current.columns.find((c) => c.id === columnId)?.more ?? 0
  /** Loaded cards in a column once `id` has left it: the most a drop index can be. */
  const room = (columnId: string, id: string) => {
    const { shown, getItemId } = latest.current
    return (shown[columnId] ?? []).filter((item) => getItemId(item) !== id).length
  }
  /** The card's position count in a column it would join: the loaded cards, the unloaded, and it. */
  const total = (columnId: string, id: string) => room(columnId, id) + moreOf(columnId) + 1

  /** The columns `canMove` refuses for a card in `from`, with their reasons. */
  const refusals = (item: T, from: string) => {
    const refused = new Map<string, string | undefined>()
    const { canMove, columns } = latest.current
    if (!canMove) return refused
    for (const c of columns) {
      if (c.id === from) continue
      const answer: unknown = canMove(item, c.id)
      if (answer !== true && answer !== undefined) refused.set(c.id, typeof answer === 'string' && answer ? answer : undefined)
    }
    return refused
  }
  const refusalsOf = (id: string) => {
    const found = findItem(id)
    return found ? refusals(found.item, found.place.column) : new Map<string, string | undefined>()
  }

  /* ----- moves ----- */

  const announce = (text: string) => setMessage((m) => ({ text, n: m.n + 1 }))
  const announceRefused = (id: string, columnId: string, reason?: string) => {
    const found = findItem(id)
    if (found) announce(latest.current.labels.kanbanRefused(latest.current.getItemLabel(found.item), titleOf(columnId), reason))
  }

  /**
   * After a confirmation: focus the card where it ended up, unless something else took focus.
   * A dialog that asked returns focus once it has closed, to a card that may have moved and
   * remounted since, which leaves it on the body: catch that for a moment.
   */
  const focusIfLost = (id: string, column: string, scroll: boolean) => {
    const lost = () => {
      const active = document.activeElement
      return !active || active === document.body || active === itemEls.current.get(id)
    }
    if (lost()) return focusLater(id, column, scroll)
    const until = performance.now() + 1000
    const watch = () => {
      const active = document.activeElement
      if (lost()) {
        const el = itemEls.current.get(id)
        if (el?.isConnected && active !== el) el.focus({ preventScroll: !scroll })
      } else if (active?.closest('[role="dialog"], [role="alertdialog"]') && performance.now() < until) {
        requestAnimationFrame(watch)
      }
    }
    requestAnimationFrame(watch)
  }

  /** The move is on: calls onMove, reads it out, offers Undo. */
  const land = (id: string, item: T, from: Place, to: Place, via: Via, waited: boolean) => {
    const { getItemLabel, labels, undoToast } = latest.current
    const label = getItemLabel(item)
    ;(waited ? focusIfLost : focusLater)(id, to.column, via !== 'pointer')
    announce(labels.kanbanMoved(label, titleOf(to.column), to.index + 1, total(to.column, id)))
    latest.current.onMove(id, to.column, to.index)
    if (!undoToast || from.column === to.column) return
    const fromCount = total(from.column, id)
    toast.success(labels.kanbanMovedTo(titleOf(to.column)), {
      description: label,
      // As long as a batch Undo toast: time to notice the move and take it back.
      duration: UNDO_MS,
      action: {
        label: labels.undo,
        // Undo puts back what was confirmed: it asks nothing.
        onClick: () => {
          focusLater(id, from.column, true)
          latest.current.onMove(id, from.column, from.index)
          announce(latest.current.labels.kanbanMoved(label, titleOf(from.column), from.index + 1, fromCount))
        },
      },
    })
  }

  /** The confirmation said no: the card stays (or goes back) where it was. */
  const back = (id: string, item: T, from: Place, via: Via, waited: boolean) => {
    const { getItemLabel, labels } = latest.current
    ;(waited ? focusIfLost : focusLater)(id, from.column, via !== 'pointer')
    announce(labels.kanbanCancelled(getItemLabel(item), titleOf(from.column), from.index + 1, total(from.column, id)))
  }

  /** Lands a card, once `confirmMove` agrees. */
  const commit = (id: string, from: Place, to: Place, via: Via) => {
    const found = findItem(id)
    if (!found) return
    if (from.column === to.column && from.index === to.index) {
      focusLater(id, to.column, via !== 'pointer')
      announce(latest.current.labels.kanbanMoved(latest.current.getItemLabel(found.item), titleOf(to.column), to.index + 1, total(to.column, id)))
      return
    }
    const answer = latest.current.confirmMove?.(found.item, to.column, to.index) ?? true
    if (!isThenable(answer)) {
      if (answer === true) land(id, found.item, from, to, via, false)
      else back(id, found.item, from, via, false)
      return
    }
    // Waiting: the card shows at its new place, dimmed and busy, and takes no presses.
    setPending(new Map(pendingRef.current).set(id, { from, to, via }))
    answer.then(
      (ok) => settlePending(id, ok === true),
      () => settlePending(id, false),
    )
  }

  function settlePending(id: string, ok: boolean) {
    const p = pendingRef.current.get(id)
    if (!p) return
    const found = findItem(id)
    // A pointer move glides back; keyboard and menu moves don't move (MOTION.md: frequent keys).
    if (!ok && p.via === 'pointer') captureLayout()
    const next = new Map(pendingRef.current)
    next.delete(id)
    setPending(next)
    if (!found) return
    if (ok) land(id, found.item, p.from, p.to, p.via, true)
    else back(id, found.item, p.from, p.via, true)
  }

  /** The ⋯ menu's moves: a refused column says why instead. */
  const moveTo = (id: string, to: Place) => {
    if (pendingRef.current.has(id)) return
    const found = findItem(id)
    if (!found) return
    const refused = refusalsOf(id)
    if (refused.has(to.column)) return announceRefused(id, to.column, refused.get(to.column))
    commit(id, found.place, to, 'menu')
  }

  /* ----- keyboard ----- */

  const lift = (id: string) => {
    const found = findItem(id)
    if (!found) return
    setDrag({ id, mode: 'keyboard', from: found.place, to: found.place, width: 0, height: 0, refused: refusals(found.item, found.place.column) })
    announce(labels.kanbanPickedUp(getItemLabel(found.item), titleOf(found.place.column), found.place.index + 1, total(found.place.column, id)))
  }

  const cancel = (focus: boolean) => {
    const d = dragRef.current
    if (!d) return
    const found = findItem(d.id)
    if (d.mode === 'pointer') captureLayout()
    setDrag(null)
    if (focus) focusLater(d.id, d.from.column, d.mode === 'keyboard')
    if (found) announce(labels.kanbanCancelled(getItemLabel(found.item), titleOf(d.from.column), d.from.index + 1, total(d.from.column, d.id)))
  }

  const stepLifted = (key: string) => {
    const d = dragRef.current
    if (!d) return
    const open = columns.filter((c) => !collapsed.includes(c.id))
    let { column, index } = d.to
    if (key === 'ArrowUp') index = Math.max(0, index - 1)
    else if (key === 'ArrowDown') index = Math.min(room(column, d.id), index + 1)
    else if (key === 'Home') index = 0
    else if (key === 'End') index = room(column, d.id)
    else {
      const forward = (key === 'ArrowRight') !== isRtl(scrollerRef.current)
      const next = open[open.findIndex((c) => c.id === column) + (forward ? 1 : -1)]
      if (!next) return
      column = next.id
      index = Math.min(index, room(column, d.id))
    }
    if (column === d.to.column && index === d.to.index) return
    if (column !== d.to.column) focusLater(d.id, column, true)
    setDrag({ ...d, to: { column, index } })
    // A refused column stays passable, so the next one can be reached: it says why it won't do.
    if (d.refused.has(column)) announceRefused(d.id, column, d.refused.get(column))
    else {
      const found = findItem(d.id)
      if (found) announce(labels.kanbanOver(getItemLabel(found.item), titleOf(column), index + 1, total(column, d.id)))
    }
    // Within a column the card keeps its element: bring it into view after the render.
    requestAnimationFrame(() => itemEls.current.get(d.id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }))
  }

  /** Arrow keys without a card picked up: focus the next card that way. */
  const focusNeighbour = (id: string, key: string) => {
    const found = findItem(id)
    if (!found) return
    const { column, index } = found.place
    const ids = (columnId: string) => (shown[columnId] ?? []).map(getItemId)
    let target: string | undefined
    if (key === 'ArrowUp') target = ids(column)[index - 1]
    else if (key === 'ArrowDown') target = ids(column)[index + 1]
    else if (key === 'Home') target = ids(column)[0]
    else if (key === 'End') target = ids(column).at(-1)
    else {
      const open = columns.filter((c) => !collapsed.includes(c.id))
      const step = (key === 'ArrowRight') !== isRtl(scrollerRef.current) ? 1 : -1
      for (let i = open.findIndex((c) => c.id === column) + step; i >= 0 && i < open.length; i += step) {
        const list = ids(open[i]!.id)
        if (list.length) {
          target = list[Math.min(index, list.length - 1)]
          break
        }
      }
    }
    if (target) itemEls.current.get(target)?.focus()
  }

  const onItemKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, id: string) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey || e.nativeEvent.isComposing) return
    const d = dragRef.current
    if (d) {
      if (d.mode !== 'keyboard' || d.id !== id) return
      if (e.key === ' ' || e.key === 'Escape' || LIFTED_KEYS.includes(e.key)) e.preventDefault()
      if (e.key === ' ' && d.refused.has(d.to.column)) {
        // It can't land here: it stays up, and the reason is read again.
        announceRefused(d.id, d.to.column, d.refused.get(d.to.column))
      } else if (e.key === ' ') {
        setDrag(null)
        commit(d.id, d.from, d.to, 'keyboard')
      } else if (e.key === 'Escape') cancel(true)
      else if (LIFTED_KEYS.includes(e.key)) stepLifted(e.key)
      return
    }
    if (e.key === ' ') {
      e.preventDefault()
      // A card waiting for its confirmation can't be picked up; the arrows still leave it.
      if (!pendingRef.current.has(id)) lift(id)
    } else if (LIFTED_KEYS.includes(e.key)) {
      e.preventDefault()
      focusNeighbour(id, e.key)
    }
  }

  // Focus leaving a lifted card puts it back (a remount between columns refocuses it first).
  const onItemBlur = () => {
    if (dragRef.current?.mode !== 'keyboard') return
    requestAnimationFrame(() => {
      const d = dragRef.current
      if (d?.mode === 'keyboard' && document.activeElement !== itemEls.current.get(d.id)) cancel(false)
    })
  }

  /* ----- pointer ----- */

  const press = React.useRef<{
    id: string
    pointerId: number
    type: string
    x: number
    y: number
    el: HTMLLIElement
    timer?: ReturnType<typeof setTimeout>
  } | null>(null)
  const pointer = React.useRef({ x: 0, y: 0 })
  const grab = React.useRef({ dx: 0, dy: 0 })
  const frame = React.useRef(0)

  /** Where each card is now, for the FLIP after the next render. */
  function captureLayout() {
    if (prefersReducedMotion()) return
    const rects = new Map<string, DOMRect>()
    for (const [id, el] of itemEls.current) if (el.isConnected) rects.set(id, el.getBoundingClientRect())
    flipFirst.current = rects
  }

  const placeOverlay = () => {
    const overlay = overlayRef.current
    const probe = probeRef.current
    if (!overlay || !probe) return
    // `fixed` may sit in a transformed ancestor: measure where its 0,0 really is.
    const origin = probe.getBoundingClientRect()
    overlay.style.translate = `${pointer.current.x - grab.current.dx - origin.left}px ${pointer.current.y - grab.current.dy - origin.top}px`
  }

  /** The column and index under the pointer. */
  const hitTest = (x: number, y: number, id: string): Place | null => {
    const { columns, collapsed, shown, getItemId } = latest.current
    let best: string | null = null
    let distance = Infinity
    for (const column of columns) {
      const el = columnEls.current.get(column.id)
      if (!el) continue
      const r = el.getBoundingClientRect()
      const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0
      if (d < distance) {
        distance = d
        best = column.id
      }
    }
    if (best === null) return null
    const others = (shown[best] ?? []).filter((item) => getItemId(item) !== id)
    if (collapsed.includes(best)) return { column: best, index: others.length }
    const list = listEls.current.get(best)
    if (!list) return { column: best, index: others.length }
    // Layout positions (offsetTop), not the shifting ones, so a card mid-shift can't flicker the gap.
    const top = list.getBoundingClientRect().top
    let index = 0
    for (const item of others) {
      const el = itemEls.current.get(getItemId(item))
      if (!el || y <= top + el.offsetTop + el.offsetHeight / 2) break
      index++
    }
    return { column: best, index }
  }

  const retarget = () => {
    const d = dragRef.current
    if (!d || d.mode !== 'pointer') return
    const to = hitTest(pointer.current.x, pointer.current.y, d.id)
    if (!to || (to.column === d.to.column && to.index === d.to.index)) return
    captureLayout()
    setDrag({ ...d, to })
  }

  const autoScroll = () => {
    const d = dragRef.current
    if (!d || d.mode !== 'pointer') return
    const { x, y } = pointer.current
    let moved = false
    const scroller = scrollerRef.current
    if (scroller) {
      const r = scroller.getBoundingClientRect()
      const v = y >= r.top && y <= r.bottom ? edgeSpeed(x, r.left, r.right) : 0
      if (v) {
        const before = scroller.scrollLeft
        scroller.scrollLeft += v
        moved ||= scroller.scrollLeft !== before
      }
    }
    const body = bodyEls.current.get(d.to.column)
    if (body) {
      const r = body.getBoundingClientRect()
      const v = x >= r.left && x <= r.right ? edgeSpeed(y, r.top, r.bottom) : 0
      if (v) {
        const before = body.scrollTop
        body.scrollTop += v
        moved ||= body.scrollTop !== before
      }
    }
    if (moved) retarget()
    frame.current = requestAnimationFrame(autoScroll)
  }

  const startPointerDrag = () => {
    const p = press.current
    if (!p || dragRef.current) return
    const found = findItem(p.id)
    if (!found) return
    const r = p.el.getBoundingClientRect()
    grab.current = { dx: p.x - r.left, dy: p.y - r.top }
    setDrag({
      id: p.id,
      mode: 'pointer',
      from: found.place,
      to: found.place,
      width: r.width,
      height: r.height,
      refused: refusals(found.item, found.place.column),
    })
    announce(labels.kanbanPickedUp(getItemLabel(found.item), titleOf(found.place.column), found.place.index + 1, total(found.place.column, p.id)))
    document.body.style.setProperty('cursor', 'grabbing')
    document.body.style.setProperty('user-select', 'none')
    document.body.style.setProperty('-webkit-user-select', 'none')
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(autoScroll)
  }

  const endPress = () => {
    const p = press.current
    if (p?.timer) clearTimeout(p.timer)
    press.current = null
    cancelAnimationFrame(frame.current)
    window.removeEventListener('pointermove', listeners.move)
    window.removeEventListener('pointerup', listeners.up)
    window.removeEventListener('pointercancel', listeners.cancel)
    window.removeEventListener('keydown', listeners.key, true)
    document.removeEventListener('touchmove', listeners.touch)
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('-webkit-user-select')
  }

  // A drag ends with a click on whatever is under the pointer: swallow it.
  const swallowClick = () => {
    const stop = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('click', stop, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
  }

  const handlers = React.useRef({
    move: (_e: PointerEvent) => {},
    up: (_e: PointerEvent) => {},
    cancel: (_e: PointerEvent) => {},
    key: (_e: KeyboardEvent) => {},
  })
  handlers.current = {
    move(e) {
      const p = press.current
      if (!p || e.pointerId !== p.pointerId) return
      pointer.current = { x: e.clientX, y: e.clientY }
      if (!dragRef.current) {
        const distance = Math.hypot(e.clientX - p.x, e.clientY - p.y)
        // Touch: moving before the hold is up is a scroll, not a drag.
        if (p.type === 'touch') {
          if (distance > TOUCH_SLOP) endPress()
        } else if (distance > MOUSE_SLOP) startPointerDrag()
        return
      }
      placeOverlay()
      retarget()
    },
    up(e) {
      const p = press.current
      if (!p || e.pointerId !== p.pointerId) return
      const d = dragRef.current
      endPress()
      if (!d || d.mode !== 'pointer') return
      const rect = overlayRef.current?.getBoundingClientRect()
      captureLayout()
      if (rect && flipFirst.current) settle.current = { id: d.id, rect }
      setDrag(null)
      swallowClick()
      // Dropped on a column that won't take it: it glides back home, and the reason is read.
      if (d.refused.has(d.to.column)) announceRefused(d.id, d.to.column, d.refused.get(d.to.column))
      else commit(d.id, d.from, d.to, 'pointer')
    },
    cancel(e) {
      const p = press.current
      if (!p || e.pointerId !== p.pointerId) return
      const d = dragRef.current
      const rect = overlayRef.current?.getBoundingClientRect()
      endPress()
      if (d?.mode !== 'pointer') return
      cancel(false)
      if (rect && flipFirst.current) settle.current = { id: d.id, rect }
    },
    key(e) {
      if (e.key !== 'Escape' || dragRef.current?.mode !== 'pointer') return
      e.preventDefault()
      e.stopPropagation()
      const d = dragRef.current
      const rect = overlayRef.current?.getBoundingClientRect()
      endPress()
      cancel(false)
      if (rect && flipFirst.current) settle.current = { id: d.id, rect }
    },
  }
  // Stable functions for add/removeEventListener that call the fresh handlers.
  const listeners = React.useMemo(
    () => ({
      move: (e: PointerEvent) => handlers.current.move(e),
      up: (e: PointerEvent) => handlers.current.up(e),
      cancel: (e: PointerEvent) => handlers.current.cancel(e),
      key: (e: KeyboardEvent) => handlers.current.key(e),
      // Once a touch drag is on, the finger moves the card, not the page.
      touch: (e: TouchEvent) => {
        if (dragRef.current?.mode === 'pointer' && e.cancelable) e.preventDefault()
      },
    }),
    [],
  )

  const onItemPointerDown = (e: React.PointerEvent<HTMLLIElement>, id: string) => {
    if (dragRef.current || press.current || !e.isPrimary || loading || pendingRef.current.has(id)) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (isInteractive(e.target, e.currentTarget)) return
    press.current = { id, pointerId: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, el: e.currentTarget }
    pointer.current = { x: e.clientX, y: e.clientY }
    if (e.pointerType === 'touch') press.current.timer = setTimeout(startPointerDrag, LONG_PRESS)
    window.addEventListener('pointermove', listeners.move)
    window.addEventListener('pointerup', listeners.up)
    window.addEventListener('pointercancel', listeners.cancel)
    window.addEventListener('keydown', listeners.key, true)
    document.addEventListener('touchmove', listeners.touch, { passive: false })
  }

  React.useEffect(() => () => endPress(), [])

  /* ----- after each render: the overlay, focus, FLIP ----- */

  React.useLayoutEffect(() => {
    if (drag?.mode === 'pointer') placeOverlay()

    const focus = pendingFocus.current
    if (focus) {
      const el = itemEls.current.get(focus.id)
      if (el && el.closest('[data-slot="kanban-column"]')?.getAttribute('data-column') === focus.column) {
        pendingFocus.current = null
        if (document.activeElement !== el) el.focus({ preventScroll: !focus.scroll })
        if (focus.scroll) el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      } else if (items !== focus.items) pendingFocus.current = null
    }

    const first = flipFirst.current
    flipFirst.current = null
    const settling = settle.current
    settle.current = null
    if (!first) return
    for (const [id, el] of itemEls.current) {
      if (el.dataset.source !== undefined || id === settling?.id) continue
      const a = first.get(id)
      if (!a) continue
      el.style.removeProperty('translate')
      const b = el.getBoundingClientRect()
      const dx = a.left - b.left
      const dy = a.top - b.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
      setFlip(el, 'invert')
      el.style.translate = `${dx}px ${dy}px`
      el.getBoundingClientRect()
      setFlip(el, 'shift')
      el.style.removeProperty('translate')
    }
    const el = settling && itemEls.current.get(settling.id)
    if (settling && el) {
      // From the lifted card's centre, scaled and leaning, down into its place on the spring.
      el.style.removeProperty('translate')
      const b = el.getBoundingClientRect()
      const a = settling.rect
      setFlip(el, 'lift')
      el.style.translate = `${a.left + a.width / 2 - (b.left + b.width / 2)}px ${a.top + a.height / 2 - (b.top + b.height / 2)}px`
      el.getBoundingClientRect()
      setFlip(el, 'settle')
      el.style.removeProperty('translate')
    }
  })

  /* ----- render ----- */

  const boardContext = React.useMemo<BoardContextValue>(
    () => ({
      columns,
      loadedOf: (columnId) => (view[columnId] ?? []).length,
      moveTo,
      refusals: refusalsOf,
      seen: seen.current,
      announce,
    }),
    // `view` changes with `items`; the functions read `latest`, so they're never stale.
    [columns, view],
  )

  const dragged = drag ? findItem(drag.id) : null
  // Over a column that won't take the card: no gap, no count for it, the reason under it.
  const refusedHere = !!drag && drag.refused.has(drag.to.column)
  const reasonHere = drag && refusedHere ? drag.refused.get(drag.to.column) : undefined
  // What the counts include: the lifted card only where it can land.
  const counted = refusedHere ? shown : view

  const card = (item: T, columnId: string, index: number, opts: { lifted?: boolean; source?: boolean }) => {
    const id = getItemId(item)
    const label = getItemLabel(item)
    const descId = `${baseId}-desc-${encodeURIComponent(id)}`
    const waiting = pending.has(id)
    return (
      <li
        key={id}
        ref={(el) => {
          if (!el) return
          itemEls.current.set(id, el)
          return () => {
            if (itemEls.current.get(id) === el) itemEls.current.delete(id)
          }
        }}
        data-slot="kanban-item"
        data-lifted={opts.lifted || undefined}
        data-source={opts.source ? '' : undefined}
        data-pending={waiting || undefined}
        aria-busy={waiting || undefined}
        tabIndex={opts.source ? -1 : 0}
        aria-roledescription={labels.kanbanCard}
        aria-label={label}
        aria-describedby={`${descId} ${hintId}`}
        onPointerDown={(e) => onItemPointerDown(e, id)}
        onKeyDown={(e) => onItemKeyDown(e, id)}
        onBlur={onItemBlur}
        onContextMenu={(e) => {
          if (press.current || dragRef.current) e.preventDefault()
        }}
        className={cn(
          'satin-kanban-item satin-drag group/kanban-item relative cursor-grab touch-manipulation rounded-xl select-none [-webkit-touch-callout:none]',
          'satin-focus:outline-2 satin-focus:outline-solid satin-focus:outline-offset-2 satin-focus:outline-action-focus-ring',
          // The card under the pointer leaves its place but stays in the document, so the
          // browser keeps sending its pointer and touch events.
          opts.source && 'pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden',
        )}
      >
        <ItemContext.Provider value={{ id, label, columnId, index, descId }}>
          {renderCard(item, { columnId, index, lifted: !!opts.lifted })}
        </ItemContext.Provider>
        {opts.lifted && drag?.mode === 'keyboard' && reasonHere && <RefusedNote reason={reasonHere} />}
      </li>
    )
  }

  const column = (c: KanbanColumn, i: number) => {
    const isCollapsed = collapsed.includes(c.id)
    const more = c.more ?? 0
    const count = (counted[c.id] ?? []).length + more
    const over = c.limit !== undefined && count > c.limit
    const titleId = `${baseId}-title-${i}`
    const countId = `${baseId}-count-${i}`
    const refused = !!drag && drag.refused.has(c.id)
    const target = !!drag && drag.to.column === c.id && !refused
    const toggle = () => setCollapsed(isCollapsed ? collapsed.filter((id) => id !== c.id) : [...collapsed, c.id])
    const countBadge = !loading && (
      <Badge size="sm" shape="rounded" tone={over ? 'amber' : 'neutral'} data-slot="kanban-count" className="tabular-nums">
        <span aria-hidden>
          {number.format(count)}
          {c.limit !== undefined && `/${number.format(c.limit)}`}
        </span>
        <span id={countId} className="sr-only">
          {labels.kanbanCount(count, c.limit)}
        </span>
      </Badge>
    )
    const name = loading ? titleId : `${titleId} ${countId}`

    const shared = {
      ref: (el: HTMLDivElement | null) => {
        if (!el) return
        columnEls.current.set(c.id, el)
        return () => {
          if (columnEls.current.get(c.id) === el) columnEls.current.delete(c.id)
        }
      },
      'data-slot': 'kanban-column',
      'data-column': c.id,
      'data-state': isCollapsed ? 'collapsed' : 'expanded',
      'data-over': target || undefined,
      'data-over-limit': over || undefined,
      'data-refused': refused || undefined,
    }
    // A wash one step under the surface the board sits on, fading out down the column. No resting
    // edge, which would outline the full height; the edge shows only while the column takes a drop.
    const lane =
      'flex min-h-0 shrink-0 flex-col rounded-2xl border border-transparent bg-linear-to-b from-component-kanban-column-bg to-transparent transition-[border-color] duration-(--duration-fast) ease-(--ease-out) data-over:border-border-strong'

    if (isCollapsed) {
      return (
        <div key={c.id} {...shared} role="group" aria-labelledby={name} className={cn(lane, 'w-11 items-center gap-2 py-2')}>
          {collapsible && (
            <Button variant="tertiary" size="xs" iconOnly aria-expanded={false} aria-label={labels.kanbanExpand(c.title)} onClick={toggle}>
              <CollapseIcon expand />
            </Button>
          )}
          {c.tone && <Dot tone={c.tone} />}
          {countBadge}
          <span id={titleId} className="text-base font-medium text-text-default [writing-mode:vertical-rl]">
            {c.title}
          </span>
        </div>
      )
    }

    // What the column lists: the cards, and in pointer drags the gap where the card would land.
    const list = drag?.mode === 'pointer' ? shown[c.id] ?? [] : view[c.id] ?? []
    const gapAt = drag?.mode === 'pointer' && target ? drag.to.index : -1
    const gap = gapAt >= 0
    const gapRow = drag && <Gap key="kanban-gap" height={drag.height} />
    const rows: React.ReactNode[] = []
    let shownCards = 0
    for (const item of list) {
      const id = getItemId(item)
      const isDragged = drag?.id === id
      if (drag?.mode === 'pointer' && isDragged) {
        rows.push(card(item, c.id, drag.from.index, { source: true }))
        continue
      }
      if (shownCards === gapAt) rows.push(gapRow)
      rows.push(card(item, c.id, shownCards, { lifted: isDragged }))
      shownCards++
    }
    if (gap && shownCards <= gapAt) rows.push(gapRow)
    // Empty: no card to see, none landing, none beyond the loaded ones.
    const empty = shownCards === 0 && !gap && more === 0

    return (
      <div key={c.id} {...shared} className={lane} style={{ width: columnWidth }}>
        <div data-slot="kanban-column-header" className="flex h-11 shrink-0 items-center gap-2 ps-3 pe-2">
          {c.tone && <Dot tone={c.tone} className="-me-1" />}
          <span id={titleId} className="min-w-0 truncate text-base font-medium text-text-default">
            {c.title}
          </span>
          {countBadge}
          <span className="ms-auto flex items-center gap-0.5">
            {onAddItem && (
              <Button variant="tertiary" size="xs" iconOnly aria-label={labels.kanbanAddTo(c.title)} onClick={() => onAddItem(c.id)}>
                <PlusIcon />
              </Button>
            )}
            {collapsible && (
              <Button variant="tertiary" size="xs" iconOnly aria-expanded aria-label={labels.kanbanCollapse(c.title)} onClick={toggle}>
                <CollapseIcon />
              </Button>
            )}
          </span>
        </div>
        <div
          ref={(el) => {
            if (!el) return
            bodyEls.current.set(c.id, el)
            return () => {
              if (bodyEls.current.get(c.id) === el) bodyEls.current.delete(c.id)
            }
          }}
          data-slot="kanban-column-body"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pt-1 pb-2"
        >
          {loading ? (
            <div aria-hidden className="flex flex-col gap-2">
              {[0.72, 0.5, 0.64].map((w) => (
                <Card key={w} size="sm" className="w-full rounded-xl">
                  <Skeleton animated width={`${w * 100}%`} />
                  <Skeleton animated width="40%" />
                </Card>
              ))}
            </div>
          ) : (
            <>
              <ul
                ref={(el) => {
                  if (!el) return
                  listEls.current.set(c.id, el)
                  return () => {
                    if (listEls.current.get(c.id) === el) listEls.current.delete(c.id)
                  }
                }}
                aria-labelledby={name}
                className="relative flex flex-col gap-2"
              >
                {rows}
              </ul>
              {empty && (
                <div data-slot="kanban-empty">
                  {renderEmpty ? (
                    renderEmpty(c)
                  ) : (
                    <EmptyState border="dashed" title={labels.kanbanEmpty} className="w-full max-w-none min-w-0 gap-2 px-3 py-6 [&_p]:text-base" />
                  )}
                </div>
              )}
              {more > 0 && (
                <div data-slot="kanban-more" className={cn('flex', shownCards > 0 || gap ? 'pt-2' : '')}>
                  {onShowMore ? (
                    // "+3 more" in every column: the column's title tells them apart.
                    <Button variant="tertiary" size="xs" aria-describedby={titleId} onClick={() => onShowMore(c.id)}>
                      {labels.kanbanMore(more)}
                    </Button>
                  ) : (
                    <p className="px-1 text-sm text-text-muted">{labels.kanbanMore(more)}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <BoardContext.Provider value={boardContext}>
      <section
        ref={ref}
        data-slot="kanban-board"
        data-dragging={drag ? drag.mode : undefined}
        aria-busy={loading || undefined}
        className={cn('relative flex min-h-0 flex-col', className)}
        {...props}
      >
        <div ref={scrollerRef} data-slot="kanban-board-scroller" className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto">
          {columns.map(column)}
        </div>
        <span id={hintId} hidden>
          {labels.kanbanCardHint}
        </span>
        <div role="status" className="sr-only">
          <span key={message.n}>{message.text}</span>
        </div>
        {drag?.mode === 'pointer' && dragged && (
          <>
            <div ref={probeRef} aria-hidden className="pointer-events-none fixed top-0 left-0 size-0" />
            <div
              ref={overlayRef}
              aria-hidden
              inert
              data-slot="kanban-overlay"
              data-drag="lifted"
              className="satin-kanban-overlay satin-drag pointer-events-none fixed top-0 left-0 z-50 cursor-grabbing rounded-xl"
              style={{ width: drag.width }}
            >
              <ItemContext.Provider
                value={{ id: drag.id, label: getItemLabel(dragged.item), columnId: drag.to.column, index: drag.to.index, descId: '', overlay: true }}
              >
                {renderCard(dragged.item, { columnId: drag.to.column, index: drag.to.index, lifted: true })}
              </ItemContext.Provider>
              {reasonHere && <RefusedNote reason={reasonHere} />}
            </div>
          </>
        )}
      </section>
    </BoardContext.Provider>
  )
}

/** The dashed gap where the card under the pointer would land, as tall as the card. */
function Gap({ height }: { height: number }) {
  return <li aria-hidden data-slot="kanban-gap" className="shrink-0 rounded-xl border border-dashed border-border-strong" style={{ height }} />
}

/* ---------- the card ---------- */

/** One line of a card's `fields`: a deal's close date, value, owner, next step. */
export interface KanbanCardField {
  /** A 16px icon before the value, in text/muted, or a 16px Avatar for a person. */
  icon?: React.ReactNode
  /** What the value is ("Close date"): screen readers hear it, the icon shows it. */
  label: string
  /**
   * The value: text, a name, or a small Badge. A Badge that opens the value steps back by its
   * padding, so every value's words start at the same place.
   */
  value: React.ReactNode
  /** The value is a prompt for something missing ("Set next step…"): in text/muted. */
  placeholder?: boolean
}

export interface KanbanCardProps extends Omit<React.ComponentProps<typeof Card>, 'title' | 'size' | 'onClose' | 'closeLabel' | 'description' | 'footer'> {
  /** What the card is: a company, a person, an order. A Link when it opens a page. */
  title: React.ReactNode
  /** Before the title, in the fields' icon column: a 16px logo, or a 16px Avatar (rounded for a company). */
  logo?: React.ReactNode
  /**
   * A Badge under the title for what's happening to it ("Nudged by agent · 2h"). Screen readers
   * hear it as the card's description.
   */
  status?: React.ReactNode
  /** One line under the title, in text/muted: a role, an amount, a date. */
  meta?: React.ReactNode
  /** Labelled lines, 8px apart: icon and value, each label for screen readers. */
  fields?: KanbanCardField[]
  /** The start of the bottom row: counts (comments, tasks), Badges. */
  footer?: React.ReactNode
  /** How long it has been in its column ("3d"), with a clock, at the end of the bottom row. */
  age?: React.ReactNode
  /** It has waited too long: the age turns into an amber Badge with an alert clock, and reads "stale". */
  stale?: boolean
  /** An Avatar or AvatarGroup at the end of the bottom row: who owns it. */
  avatar?: React.ReactNode
  /**
   * A key for what the card shows (a version, an updated-at time). When it changes, not on
   * first render nor when the card moves, the card lights up once and the board reads
   * "Northwind Labs was updated". For changes nobody watched happen: an agent's, a teammate's.
   */
  changed?: string | number
  /** More DropdownMenuItems for the ⋯ menu, after the moves. */
  actions?: React.ReactNode
  /** "Move to" each other column, and up and down, in the ⋯ menu. */
  moveActions?: boolean
}

/**
 * A card for `renderCard`, laid out like a sales pipeline's lead: Satin's Card (small) with a
 * title row (logo, title, ⋯ menu), a status Badge and a line of meta under it, labelled
 * `fields`, then a bottom row with the `footer`, the age (amber when `stale`) and an avatar.
 * Children go between the fields and the bottom row. The ⋯ menu moves the card without
 * dragging; it shows on hover and focus (always on touch screens). Other props, `ref`
 * included, go to the Card.
 */
export function KanbanCard({
  title,
  logo,
  status,
  meta,
  fields,
  footer,
  age,
  stale = false,
  avatar,
  changed,
  actions,
  moveActions = true,
  className,
  children,
  ...props
}: KanbanCardProps) {
  const item = React.useContext(ItemContext)
  const board = React.useContext(BoardContext)
  const labels = useLabels()
  const menu = item && board && (moveActions || actions != null)

  // A changed key lights the card up once. The board remembers the last key of every card, so
  // a card seen for the first time, or remounting in another column, stays still (and
  // StrictMode's second mount finds its own key).
  const [flash, setFlash] = React.useState(0)
  React.useLayoutEffect(() => {
    if (!item || !board || item.overlay || changed === undefined) return
    const prev = board.seen.get(item.id)
    board.seen.set(item.id, changed)
    if (prev === undefined || prev === changed) return
    setFlash((n) => n + 1)
    board.announce(labels.kanbanUpdated(item.label))
  }, [changed])

  const hasFields = !!fields?.length
  const bottom = footer != null || age != null || avatar != null
  return (
    <Card size="sm" data-slot="kanban-card" className={cn('w-full rounded-xl border-strong', className)} {...props}>
      {flash > 0 && (
        <span
          key={flash}
          aria-hidden
          data-slot="kanban-card-flash"
          className="satin-kanban-card-flash pointer-events-none absolute inset-0 rounded-[inherit] bg-status-brand-bg [box-shadow:inset_0_0_0_1px_var(--status-brand-fg)]"
        />
      )}
      {/* Positioned, so it paints above the flash. */}
      <div className="relative flex min-w-0 flex-col">
        <div className="flex flex-col items-start gap-1">
          <div className="flex w-full items-start gap-2">
            {/* The fields' icon column, so the title starts where their values do. */}
            {logo != null && <span className="flex h-5 w-4 shrink-0 items-center justify-center [&>svg]:size-4">{logo}</span>}
            <span className="min-w-0 flex-1 text-base leading-5 font-medium break-words text-text-default">{title}</span>
            {menu && <CardMenu item={item} board={board} actions={actions} moveActions={moveActions} />}
          </div>
          {status}
          {meta != null && <span className="text-sm text-text-muted">{meta}</span>}
        </div>
        {hasFields && (
          <dl className="mt-3 flex flex-col gap-2">
            {fields.map((field, i) => (
              <div key={i} data-slot="kanban-card-field" className="flex min-w-0">
                <dt className="sr-only">{field.label}</dt>
                <dd className="flex min-h-5 min-w-0 flex-1 items-center gap-2 text-sm text-text-default">
                  {field.icon != null && <span className="flex size-4 shrink-0 items-center justify-center text-text-muted [&_svg]:size-4">{field.icon}</span>}
                  {/* A small Badge opening the value steps back by its padding, so its words start where the others do. */}
                  <span className={cn('min-w-0 truncate has-[>[data-slot=badge]:first-child]:-ms-1.5', field.placeholder && 'text-text-muted')}>{field.value}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
        {children != null && <div className="mt-3 flex flex-col gap-2">{children}</div>}
        {bottom && (
          <div className={cn('flex min-h-5 items-center gap-3', hasFields || children != null ? 'mt-4' : 'mt-3')}>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-text-muted">{footer}</div>
            {age != null &&
              (stale ? (
                <Badge size="sm" tone="amber">
                  <ClockAlertIcon />
                  {age}
                  <span className="sr-only"> {labels.kanbanStale}</span>
                </Badge>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-sm text-text-muted">
                  <ClockIcon />
                  {age}
                </span>
              ))}
            {avatar}
          </div>
        )}
      </div>
      {/* The card's description (the li points at it): its status, and whether it's stale. */}
      {item && !item.overlay && (
        <span id={item.descId} hidden>
          {status}
          {stale && ` ${labels.kanbanStale}`}
        </span>
      )}
    </Card>
  )
}

function CardMenu({ item, board, actions, moveActions }: { item: ItemContextValue; board: BoardContextValue; actions?: React.ReactNode; moveActions: boolean }) {
  const labels = useLabels()
  const count = board.loadedOf(item.columnId)
  const trigger = (
    <Button
      variant="tertiary"
      size="xs"
      iconOnly
      aria-label={labels.kanbanCardMenu(item.label)}
      className={cn(
        '-me-1 -mt-0.5 opacity-0 transition-opacity duration-(--duration-fast) ease-(--ease-out)',
        'group-hover/kanban-item:opacity-100 group-focus-within/kanban-item:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100',
      )}
    >
      <DotsIcon />
    </Button>
  )
  if (item.overlay) return trigger
  return (
    <DropdownMenu align="end" trigger={trigger}>
      {moveActions && <MoveTargets item={item} board={board} />}
      {moveActions && count > 1 && (
        <DropdownMenuGroup>
          {item.index > 0 && (
            <DropdownMenuItem label={labels.kanbanMoveUp} layout="inline" onSelect={() => board.moveTo(item.id, { column: item.columnId, index: item.index - 1 })} />
          )}
          {item.index < count - 1 && (
            <DropdownMenuItem label={labels.kanbanMoveDown} layout="inline" onSelect={() => board.moveTo(item.id, { column: item.columnId, index: item.index + 1 })} />
          )}
        </DropdownMenuGroup>
      )}
      {actions}
    </DropdownMenu>
  )
}

/**
 * "Move to" each other column. Rendered only while the menu is open, so `canMove` runs then. A
 * refused column stays a live item with its reason under it: a disabled one would hide the
 * reason from the keyboard. Choosing it reads the refusal out.
 */
function MoveTargets({ item, board }: { item: ItemContextValue; board: BoardContextValue }) {
  const labels = useLabels()
  const others = board.columns.filter((c) => c.id !== item.columnId)
  const refused = board.refusals(item.id)
  if (!others.length) return null
  return (
    <DropdownMenuGroup label={labels.kanbanMoveTo}>
      {others.map((c) => {
        const reason = refused.get(c.id)
        return (
          <DropdownMenuItem
            key={c.id}
            label={c.title}
            description={reason}
            layout={reason ? 'stacked' : 'inline'}
            onSelect={() => board.moveTo(item.id, { column: c.id, index: board.loadedOf(c.id) })}
          />
        )
      })}
    </DropdownMenuGroup>
  )
}
