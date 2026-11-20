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
 * KanbanBoard: columns of cards, each column a stage (Applied, Screening, Interview), with its
 * count and an optional limit, and cards that move between them by pointer, touch or keyboard.
 *
 * It is controlled: `items` holds the cards of each column in order, and a move only calls
 * `onMove(itemId, toColumn, index)`. Nothing moves until the app puts the card there, so
 * `onMove` is the one source of truth; `moveKanbanItem()` does the splice.
 *
 * - Pointer: press a card and move 4px (touch: hold it 250 ms, so a swipe still scrolls). The
 *   card lifts (scale 1.02, the toast's shadow) and follows the pointer without easing; a dashed
 *   gap opens where it would land and the cards around it shift on --ease-in-out. Near the
 *   edge of a column or of the board, they scroll. Dropped, it settles into place on --ease-out
 *   over 200 ms; Escape puts it back. A collapsed column takes a card at its end.
 * - Keyboard: Space picks the focused card up; ↑ ↓ move it within its column, ← → to the next
 *   column (mirrored right to left), Home and End to the top or bottom; Space drops it and
 *   Escape puts it back. Every step is read out from a polite live region: "Moved Tara Mendes
 *   to Interview, position 2 of 7". Without a card picked up, the arrow keys move focus
 *   between cards. These moves don't animate (MOTION.md: no motion on frequent keys).
 * - Without dragging: KanbanCard's ⋯ menu moves a card to another column or up and down, the
 *   single-pointer way WCAG 2.5.7 asks for.
 * - A move to another column shows a toast, "Moved to Interview", whose Undo calls `onMove`
 *   with the card's old column and index, so it goes back to the exact place. It needs the
 *   app's `<Toaster />`; turn it off with `undoToast={false}`.
 * - A column past its `limit` turns its count amber (while a card is dragged over it, too).
 *   An empty column shows an EmptyState; `loading` shows Skeleton cards.
 *
 * Words go through SatinLabels (`kanbanBoardLabels`). Other props, `ref` included, go to the
 * board's `section`; give it an `aria-label` and it becomes a named region.
 */

/** The words the Kanban board says on its own. They join SatinLabels, so the app translates them there. */
export const kanbanBoardLabels = {
  /** What a card is, read after its name: "Tara Mendes, draggable card". */
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
   * and turns amber past it. Moves past it are still allowed.
   */
  limit?: number
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
  /** A card's name for screen readers, announcements and the toast: "Tara Mendes". */
  getItemLabel: (item: T) => string
  /** The card itself, usually a `KanbanCard`. */
  renderCard: (item: T, state: KanbanCardState) => React.ReactNode
  /**
   * A card was dropped. `index` is its place in `toColumn` once it's there, from 0. Move it in
   * `items` (`moveKanbanItem()` does it); until you do, the board shows it where it was.
   */
  onMove: (itemId: string, toColumn: string, index: number) => void
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
  /** The "Moved to Interview" toast with Undo after a move to another column. Needs a `<Toaster />`. */
  undoToast?: boolean
  /** A column's width in px. */
  columnWidth?: number
}

type Place = { column: string; index: number }
type Drag = { id: string; mode: 'pointer' | 'keyboard'; from: Place; to: Place; width: number; height: number }

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
  /** Cards in a column, as the board shows it now. */
  countOf: (columnId: string) => number
  moveTo: (itemId: string, to: Place) => void
}
interface ItemContextValue {
  id: string
  label: string
  columnId: string
  index: number
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
/** Sets a FLIP phase on a card and clears it once the motion is over. */
function setFlip(el: HTMLElement, phase: 'invert' | 'shift' | 'lift' | 'settle') {
  clearTimeout(flipTimers.get(el))
  el.dataset.flip = phase
  if (phase === 'shift' || phase === 'settle') {
    flipTimers.set(
      el,
      setTimeout(() => {
        if (el.dataset.flip === phase) delete el.dataset.flip
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

/* ---------- the board ---------- */

export function KanbanBoard<T>({
  columns,
  items,
  getItemId,
  getItemLabel,
  renderCard,
  onMove,
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
  const [message, setMessage] = React.useState('')

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

  // The card as the board shows it now: moved to where a keyboard drag holds it.
  const view = React.useMemo(
    () => (drag ? moveKanbanItem(items, getItemId, drag.id, drag.to.column, drag.to.index) : items),
    [drag, items, getItemId],
  )

  const findItem = (id: string) => {
    for (const column of columns) {
      const list = items[column.id] ?? []
      const index = list.findIndex((item) => getItemId(item) === id)
      if (index >= 0) return { item: list[index]!, place: { column: column.id, index } }
    }
    return null
  }
  const titleOf = (columnId: string) => columns.find((c) => c.id === columnId)?.title ?? columnId
  /** Cards in a column once `id` has left it: the most a drop index can be. */
  const room = (columnId: string, id: string) => (items[columnId] ?? []).filter((item) => getItemId(item) !== id).length

  // Everything the window listeners need, fresh on every render.
  const latest = React.useRef({ items, columns, collapsed, getItemId, getItemLabel, onMove, labels, undoToast })
  latest.current = { items, columns, collapsed, getItemId, getItemLabel, onMove, labels, undoToast }

  /* ----- moves ----- */

  const announce = (text: string) => setMessage(text)

  /** Lands a card: calls onMove, reads it out, offers Undo. */
  const commit = (id: string, from: Place, to: Place, focus: 'keyboard' | 'pointer' | 'none') => {
    const { items, getItemLabel, labels, undoToast } = latest.current
    const found = findItem(id)
    if (!found) return
    const label = getItemLabel(found.item)
    const count = room(to.column, id) + 1
    if (focus !== 'none') focusLater(id, to.column, focus === 'keyboard')
    announce(labels.kanbanMoved(label, titleOf(to.column), to.index + 1, count))
    if (from.column === to.column && from.index === to.index) return
    latest.current.onMove(id, to.column, to.index)
    if (!undoToast || from.column === to.column) return
    const fromCount = (items[from.column] ?? []).length
    toast.success(labels.kanbanMovedTo(titleOf(to.column)), {
      description: label,
      // As long as toastBatch's Undo: time to notice the move and take it back.
      duration: UNDO_MS,
      action: {
        label: labels.undo,
        onClick: () => {
          focusLater(id, from.column, true)
          latest.current.onMove(id, from.column, from.index)
          announce(latest.current.labels.kanbanMoved(label, titleOf(from.column), from.index + 1, fromCount))
        },
      },
    })
  }

  const moveTo = (id: string, to: Place) => {
    const found = findItem(id)
    if (found) commit(id, found.place, to, 'keyboard')
  }

  /* ----- keyboard ----- */

  const lift = (id: string) => {
    const found = findItem(id)
    if (!found) return
    setDrag({ id, mode: 'keyboard', from: found.place, to: found.place, width: 0, height: 0 })
    announce(labels.kanbanPickedUp(getItemLabel(found.item), titleOf(found.place.column), found.place.index + 1, room(found.place.column, id) + 1))
  }

  const cancel = (focus: boolean) => {
    const d = dragRef.current
    if (!d) return
    const found = findItem(d.id)
    if (d.mode === 'pointer') captureLayout()
    setDrag(null)
    if (focus) focusLater(d.id, d.from.column, d.mode === 'keyboard')
    if (found) announce(labels.kanbanCancelled(getItemLabel(found.item), titleOf(d.from.column), d.from.index + 1, room(d.from.column, d.id) + 1))
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
    const found = findItem(d.id)
    if (found) announce(labels.kanbanOver(getItemLabel(found.item), titleOf(column), index + 1, room(column, d.id) + 1))
    // Within a column the card keeps its element: bring it into view after the render.
    requestAnimationFrame(() => itemEls.current.get(d.id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }))
  }

  /** Arrow keys without a card picked up: focus the next card that way. */
  const focusNeighbour = (id: string, key: string) => {
    const found = findItem(id)
    if (!found) return
    const { column, index } = found.place
    const ids = (columnId: string) => (items[columnId] ?? []).map(getItemId)
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
      if (e.key === ' ') {
        setDrag(null)
        commit(d.id, d.from, d.to, 'keyboard')
      } else if (e.key === 'Escape') cancel(true)
      else if (LIFTED_KEYS.includes(e.key)) stepLifted(e.key)
      return
    }
    if (e.key === ' ') {
      e.preventDefault()
      lift(id)
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
    const { columns, collapsed, items, getItemId } = latest.current
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
    const others = (items[best] ?? []).filter((item) => getItemId(item) !== id)
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
    setDrag({ id: p.id, mode: 'pointer', from: found.place, to: found.place, width: r.width, height: r.height })
    announce(labels.kanbanPickedUp(getItemLabel(found.item), titleOf(found.place.column), found.place.index + 1, room(found.place.column, p.id) + 1))
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
      commit(d.id, d.from, d.to, 'pointer')
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
    if (dragRef.current || press.current || !e.isPrimary || loading) return
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
      // From the lifted card's centre, scaled, down into its place.
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
    () => ({ columns, countOf: (columnId) => (view[columnId] ?? []).length, moveTo }),
    // `view` changes with `items`, so moveTo is never stale.
    [columns, view],
  )

  const dragged = drag ? findItem(drag.id) : null

  const card = (item: T, columnId: string, index: number, opts: { lifted?: boolean; source?: boolean }) => {
    const id = getItemId(item)
    const label = getItemLabel(item)
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
        tabIndex={opts.source ? -1 : 0}
        aria-roledescription={labels.kanbanCard}
        aria-label={label}
        aria-describedby={hintId}
        onPointerDown={(e) => onItemPointerDown(e, id)}
        onKeyDown={(e) => onItemKeyDown(e, id)}
        onBlur={onItemBlur}
        onContextMenu={(e) => {
          if (press.current || dragRef.current) e.preventDefault()
        }}
        className={cn(
          'satin-kanban-item group/kanban-item relative cursor-grab touch-manipulation rounded-xl select-none [-webkit-touch-callout:none]',
          'satin-focus:outline-2 satin-focus:outline-solid satin-focus:outline-offset-2 satin-focus:outline-action-focus-ring',
          // The card under the pointer leaves its place but stays in the document, so the
          // browser keeps sending its pointer and touch events.
          opts.source && 'pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden',
        )}
      >
        <ItemContext.Provider value={{ id, label, columnId, index }}>
          {renderCard(item, { columnId, index, lifted: !!opts.lifted })}
        </ItemContext.Provider>
      </li>
    )
  }

  const column = (c: KanbanColumn, i: number) => {
    const isCollapsed = collapsed.includes(c.id)
    const count = (view[c.id] ?? []).length
    const over = c.limit !== undefined && count > c.limit
    const titleId = `${baseId}-title-${i}`
    const countId = `${baseId}-count-${i}`
    const target = !!drag && drag.to.column === c.id
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
    }
    const lane =
      'flex min-h-0 shrink-0 flex-col rounded-2xl border border-border-subtle bg-bg-canvas transition-[border-color] duration-(--duration-fast) ease-(--ease-out) data-over:border-border-strong'

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
    const list = drag?.mode === 'pointer' ? items[c.id] ?? [] : view[c.id] ?? []
    const rows: React.ReactNode[] = []
    let shown = 0
    for (const item of list) {
      const id = getItemId(item)
      const isDragged = drag?.id === id
      if (drag?.mode === 'pointer' && isDragged) {
        rows.push(card(item, c.id, drag.from.index, { source: true }))
        continue
      }
      if (drag?.mode === 'pointer' && target && shown === drag.to.index) rows.push(<Gap key="kanban-gap" height={drag.height} />)
      rows.push(card(item, c.id, shown, { lifted: isDragged }))
      shown++
    }
    if (drag?.mode === 'pointer' && target && shown <= drag.to.index) rows.push(<Gap key="kanban-gap" height={drag.height} />)

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
              {count === 0 &&
                (renderEmpty ? (
                  renderEmpty(c)
                ) : (
                  <EmptyState border="dashed" title={labels.kanbanEmpty} className="w-full max-w-none min-w-0 gap-2 px-3 py-6 [&_p]:text-base" />
                ))}
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
          {message}
        </div>
        {drag?.mode === 'pointer' && dragged && (
          <>
            <div ref={probeRef} aria-hidden className="pointer-events-none fixed top-0 left-0 size-0" />
            <div
              ref={overlayRef}
              aria-hidden
              inert
              data-slot="kanban-overlay"
              className="satin-kanban-overlay pointer-events-none fixed top-0 left-0 z-50 cursor-grabbing rounded-xl"
              style={{ width: drag.width }}
            >
              <ItemContext.Provider
                value={{ id: drag.id, label: getItemLabel(dragged.item), columnId: drag.to.column, index: drag.to.index, overlay: true }}
              >
                {renderCard(dragged.item, { columnId: drag.to.column, index: drag.to.index, lifted: true })}
              </ItemContext.Provider>
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

export interface KanbanCardProps extends Omit<React.ComponentProps<typeof Card>, 'title' | 'size' | 'onClose' | 'closeLabel' | 'description' | 'footer'> {
  /** What the card is: a person, a deal, an order. */
  title: React.ReactNode
  /** One line under the title, in text/muted: a role, an amount, a date. */
  meta?: React.ReactNode
  /** Badges, in a row at the bottom. */
  badges?: React.ReactNode
  /** An Avatar or AvatarGroup at the end of the bottom row: who owns it. */
  avatar?: React.ReactNode
  /** More DropdownMenuItems for the ⋯ menu, after the moves. */
  actions?: React.ReactNode
  /** "Move to" each other column, and up and down, in the ⋯ menu. */
  moveActions?: boolean
}

/**
 * A card for `renderCard`: Satin's Card (small) with the title, a line of meta, badges and an
 * avatar, and a ⋯ menu that moves it without dragging. The menu button shows on hover and
 * focus (always on touch screens). Children go between the title and the bottom row. Other
 * props, `ref` included, go to the Card.
 */
export function KanbanCard({ title, meta, badges, avatar, actions, moveActions = true, className, children, ...props }: KanbanCardProps) {
  const item = React.useContext(ItemContext)
  const board = React.useContext(BoardContext)
  const menu = item && board && (moveActions || actions != null)
  return (
    <Card size="sm" data-slot="kanban-card" className={cn('w-full rounded-xl border-strong', className)} {...props}>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base leading-5 font-medium text-text-default">{title}</span>
          {meta != null && <span className="text-sm text-text-muted">{meta}</span>}
        </div>
        {menu && <CardMenu item={item} board={board} actions={actions} moveActions={moveActions} />}
      </div>
      {children}
      {(badges != null || avatar != null) && (
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1">{badges}</div>
          {avatar}
        </div>
      )}
    </Card>
  )
}

function CardMenu({ item, board, actions, moveActions }: { item: ItemContextValue; board: BoardContextValue; actions?: React.ReactNode; moveActions: boolean }) {
  const labels = useLabels()
  const others = board.columns.filter((c) => c.id !== item.columnId)
  const count = board.countOf(item.columnId)
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
      {moveActions && others.length > 0 && (
        <DropdownMenuGroup label={labels.kanbanMoveTo}>
          {others.map((c) => (
            <DropdownMenuItem key={c.id} label={c.title} layout="inline" onSelect={() => board.moveTo(item.id, { column: c.id, index: board.countOf(c.id) })} />
          ))}
        </DropdownMenuGroup>
      )}
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
