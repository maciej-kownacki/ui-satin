'use client'

import * as React from 'react'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Form, type FormValues } from '@uisatin/ui/form'
import { Kbd, KbdHint } from '@uisatin/ui/kbd'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Progress } from '@uisatin/ui/progress'
import { Sheet, SheetClose, type SheetProps } from '@uisatin/ui/sheet'
import { Tooltip } from '@uisatin/ui/tooltip'

/**
 * ReviewQueue: a stack of agent drafts gone through one at a time, Approve, Edit or Skip, with
 * the keyboard. Above the item, its place ("4 of 12" between ‹ and ›) over a Progress bar of how
 * many are decided; under it, the actions. When every item has a decision, a summary lists what
 * was approved and what was skipped, with Review skipped to take the skipped ones round again.
 *
 * - `renderItem` draws the item, usually an AgentSuggestion. The next item slides 8px in from the
 *   side it comes from and fades in (--duration-base, ease-out); the bar fills as items are decided.
 * - Approve calls `onApprove`, Skip calls `onSkip`, and both move on to the next undecided item.
 *   An `onApprove` that returns a promise shows a Spinner on Approve until it settles; a rejected
 *   one leaves the item where it is. An approved item is done: going back to it shows its Badge
 *   and its actions stay off. A skipped one can still be approved.
 * - Edit with `renderEditor` opens a Sheet with those fields in a Satin Form; Save calls
 *   `onEdit(item, values)` and closes it, Cancel closes it. Either way you are back on the same
 *   item with focus where it was. Without `renderEditor`, Edit calls `onEdit(item)` for an editor
 *   of your own, and the queue stays put.
 * - Keys, while focus is in the queue and not in a field: J and K for the next and previous item,
 *   A approve, E edit, S skip (`shortcuts` renames or turns them off). They show as Kbd, except
 *   on touch screens.
 * - The item is a group named after it and its place ("Anna Kowalska, 4 of 12"), read out from a
 *   polite live region as it changes, with the decision before it ("Approved. Jonas Weber, 5 of 12").
 *
 * Keep decided items in `items`: the summary lists them. The place (`index`), the decisions and
 * the editor (`editing`) can each be controlled.
 *
 * Parts, for a queue laid out your own way: `ReviewQueueRoot` › `ReviewQueueHeader`,
 * `ReviewQueueItem`, `ReviewQueueActions`, `ReviewQueueSummary`, and `useReviewQueue()` inside it.
 * Other props on ReviewQueue and ReviewQueueRoot, `ref` included, go to the `section`.
 */

/** The words the Review queue says on its own. They join SatinLabels, so the app translates them there. */
export const reviewQueueLabels = {
  /** The queue's name when it has no `title`. */
  reviewQueue: 'Review queue',
  /** "4 of 12": the item on show. Both numbers come formatted. */
  reviewPosition: (position: string, count: string) => `${position} of ${count}`,
  /** The item's name with its place, read out as it comes up: "Anna Kowalska, 4 of 12". */
  reviewItemAt: (item: string, position: string, count: string) => `${item}, ${position} of ${count}`,
  /** The progress bar's name. */
  reviewProgress: 'Reviewed',
  /** The bar's value as screen readers hear it: "3 of 12 reviewed". */
  reviewProgressValue: (done: string, count: string) => `${done} of ${count} reviewed`,
  reviewPrevious: 'Previous item',
  reviewNext: 'Next item',
  reviewApprove: 'Approve',
  reviewEdit: 'Edit',
  reviewSave: 'Save',
  /** On an approved item's Badge, over the summary's list, and read out after Approve. */
  reviewApproved: 'Approved',
  /** On a skipped item's Badge, over the summary's list, and read out after Skip. */
  reviewSkipped: 'Skipped',
  /** The summary's heading. */
  reviewAllDone: 'All reviewed',
  /** Under the heading, and read out with it: "9 approved, 3 skipped". */
  reviewTally: (approved: number, skipped: number) => `${approved} approved, ${skipped} skipped`,
  /** A summary list with nothing in it. */
  reviewNone: 'None',
  /** The summary's button that takes the skipped items round again. */
  reviewSkippedAgain: 'Review skipped',
}

type ReviewQueueLabels = typeof reviewQueueLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends ReviewQueueLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...reviewQueueLabels, ...labels }), [labels])
}

/* ---------- types ---------- */

export type ReviewDecision = 'approved' | 'skipped'

/** Each decided item's decision, by its key. */
export type ReviewDecisions = Record<string, ReviewDecision>

/** One key each; an empty string turns that one off. */
export interface ReviewQueueShortcuts {
  /** Default `A`. */
  approve?: string
  /** Default `E`. */
  edit?: string
  /** Default `S`. */
  skip?: string
  /** Default `J`. */
  next?: string
  /** Default `K`. */
  previous?: string
}

/** What `renderItem` knows about the item it draws. */
export interface ReviewQueueItemState {
  /** From 0. */
  index: number
  /** From 1, as shown: the 4 in "4 of 12". */
  position: number
  count: number
  /** Its decision so far, after going back to it. */
  decision?: ReviewDecision
  /** Its editor is open. */
  editing: boolean
}

const DEFAULT_SHORTCUTS: Required<ReviewQueueShortcuts> = { approve: 'A', edit: 'E', skip: 'S', next: 'J', previous: 'K' }

const isPromise = (value: unknown): value is PromiseLike<unknown> =>
  !!value && typeof (value as PromiseLike<unknown>).then === 'function'

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** A plain letter key, by character; by its place only when the layout types another script (Cyrillic). */
const pressed = (e: React.KeyboardEvent, key: string) => {
  if (!key) return false
  const k = key.toLowerCase()
  if (e.key.toLowerCase() === k) return true
  return e.key.length === 1 && !/[a-z]/i.test(e.key) && /^[a-z]$/.test(k) && e.code === `Key${k.toUpperCase()}`
}

const defaultKey = (item: unknown, index: number) => {
  const id = (item as { id?: unknown } | null)?.id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : String(index)
}

function setRef<E>(ref: React.Ref<E> | undefined, node: E | null) {
  if (typeof ref === 'function') ref(node)
  else if (ref) (ref as React.RefObject<E | null>).current = node
}

/* ---------- the queue's state ---------- */

type Pending = 'item' | 'summary' | null

interface QueueContextValue {
  items: readonly unknown[]
  keyOf: (item: unknown, index: number) => string
  itemLabel: (item: unknown) => string
  title?: string
  index: number
  count: number
  item: unknown
  itemKey: string | undefined
  decision?: ReviewDecision
  decisions: ReviewDecisions
  decided: number
  done: boolean
  busy: boolean
  editing: boolean
  canEdit: boolean
  /** Which way the item on show came in, for its slide; none on first show. */
  enter: 'next' | 'prev' | null
  keys: Required<ReviewQueueShortcuts> | null
  approveLabel: string
  labels: ReturnType<typeof useLabels>
  format: (n: number) => string
  next: () => void
  previous: () => void
  approve: () => void
  skip: () => void
  edit: () => void
  reviewSkipped: () => void
  itemRef: React.RefObject<HTMLDivElement | null>
  summaryRef: React.RefObject<HTMLDivElement | null>
}

const QueueContext = React.createContext<QueueContextValue | null>(null)

function useQueue(part: string) {
  const queue = React.useContext(QueueContext)
  if (!queue) throw new Error(`${part} must be inside ReviewQueueRoot`)
  return queue
}

/** The queue around a part of your own: where it is, and the actions. Inside ReviewQueueRoot. */
export function useReviewQueue<T = unknown>() {
  const q = useQueue('useReviewQueue')
  return {
    index: q.index,
    count: q.count,
    item: q.item as T | undefined,
    decision: q.decision,
    decisions: q.decisions,
    done: q.done,
    busy: q.busy,
    editing: q.editing,
    next: q.next,
    previous: q.previous,
    approve: q.approve,
    skip: q.skip,
    edit: q.edit,
    reviewSkipped: q.reviewSkipped,
  }
}

export interface ReviewQueueRootProps<T> extends Omit<React.ComponentProps<'section'>, 'title' | 'children'> {
  /** Everything to review, decided or not, in order. */
  items: readonly T[]
  /** The item in a few words ("Anna Kowalska"): names it to screen readers and in the summary. */
  itemLabel: (item: T) => string
  /** A stable key per item, for `decisions`. Defaults to the item's `id`, else its index. */
  itemKey?: (item: T, index: number) => string
  /** Over the bar, and the queue's name ("Trade fair follow-ups"). Without it the queue is named "Review queue". */
  title?: string
  /** The item on show, from 0. */
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  /** What was decided, by key. */
  decisions?: ReviewDecisions
  defaultDecisions?: ReviewDecisions
  onDecisionsChange?: (decisions: ReviewDecisions) => void
  /** The editor Sheet is open. */
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  /** Carries the item out (sends the email). Return a promise and Approve shows a Spinner until it settles. */
  onApprove?: (item: T) => unknown
  onSkip?: (item: T) => void
  /**
   * With `renderEditor`, Save calls it with the form's values, then the Sheet closes (after the
   * promise, if it returns one). Without, Edit calls it with the item alone.
   */
  onEdit?: (item: T, values?: FormValues) => unknown
  /** The editor's fields for one item, in a Sheet that Edit opens. Give each field a `name`. */
  renderEditor?: (item: T) => React.ReactNode
  /** The editor Sheet's title. Defaults to "Edit", with the item's label under it. */
  editTitle?: (item: T) => React.ReactNode
  /** More for the editor Sheet: `side`, `container`, `className`. */
  sheetProps?: Omit<SheetProps, 'open' | 'defaultOpen' | 'onOpenChange' | 'title' | 'description' | 'footer' | 'children' | 'trigger'>
  /** Rename the keys, or `false` for none. */
  shortcuts?: ReviewQueueShortcuts | false
  /** Approve's word, when the action is better named ("Send"). Defaults to `reviewApprove`. */
  approveLabel?: string
  children?: React.ReactNode
}

/** The queue's state, keys and editor; the parts go inside. */
export function ReviewQueueRoot<T>({
  items,
  itemLabel,
  itemKey,
  title,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  decisions: decisionsProp,
  defaultDecisions,
  onDecisionsChange,
  editing: editingProp,
  onEditingChange,
  onApprove,
  onSkip,
  onEdit,
  renderEditor,
  editTitle,
  sheetProps,
  shortcuts,
  approveLabel,
  className,
  children,
  onKeyDown,
  ref,
  ...props
}: ReviewQueueRootProps<T>) {
  const labels = useLabels()
  const format = React.useMemo(() => {
    const nf = new Intl.NumberFormat(labels.dateLocale)
    return (n: number) => nf.format(n)
  }, [labels.dateLocale])

  const keyOf = React.useCallback((item: unknown, i: number) => (itemKey ? itemKey(item as T, i) : defaultKey(item, i)), [itemKey])
  const count = items.length

  const [indexState, setIndexState] = React.useState(defaultIndex)
  const index = Math.min(Math.max(indexProp ?? indexState, 0), Math.max(count - 1, 0))
  const [decisionsState, setDecisionsState] = React.useState<ReviewDecisions>(defaultDecisions ?? {})
  const decisions = decisionsProp ?? decisionsState
  const [editingState, setEditingState] = React.useState(false)
  const editing = editingProp ?? editingState
  const [busy, setBusy] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [enter, setEnter] = React.useState<'next' | 'prev' | null>(null)
  const [message, setMessage] = React.useState('')

  const item = count > 0 ? items[index] : undefined
  const key = item === undefined ? undefined : keyOf(item, index)
  const decision = key === undefined ? undefined : decisions[key]
  const decided = items.reduce<number>((n, it, i) => (decisions[keyOf(it, i)] ? n + 1 : n), 0)
  const done = decided === count
  const keys = shortcuts === false ? null : { ...DEFAULT_SHORTCUTS, ...shortcuts }
  const canEdit = !!(renderEditor || onEdit)

  // Async work (an Approve that sends) finishes after renders: it reads the latest from here.
  const latest = React.useRef({ items, decisions, index, keyOf })
  latest.current = { items, decisions, index, keyOf }

  const rootRef = React.useRef<HTMLElement | null>(null)
  const itemRef = React.useRef<HTMLDivElement | null>(null)
  const summaryRef = React.useRef<HTMLDivElement | null>(null)
  const pending = React.useRef<Pending>(null)
  const returnFocus = React.useRef<HTMLElement | null>(null)

  const setIndex = (i: number) => {
    if (indexProp === undefined) setIndexState(i)
    onIndexChange?.(i)
  }
  const setDecisions = (next: ReviewDecisions) => {
    if (decisionsProp === undefined) setDecisionsState(next)
    onDecisionsChange?.(next)
  }
  const setEditing = (open: boolean) => {
    if (editingProp === undefined) setEditingState(open)
    onEditingChange?.(open)
  }

  const focusIn = (el: { current: HTMLElement | null }) => !!el.current?.contains(document.activeElement)
  const where = (i: number) => labels.reviewItemAt(itemLabel(latest.current.items[i] as T), format(i + 1), format(latest.current.items.length))

  /** Shows item `i`, says so, and keeps focus that was on the old item on the new one. */
  const show = (i: number, dir: 'next' | 'prev', said?: string) => {
    const focusOnItem = focusIn(itemRef)
    if (focusOnItem) pending.current = 'item'
    setEnter(dir)
    setIndex(i)
    // Focus landing on the item reads its name and place; the live region would say it twice.
    setMessage(focusOnItem ? (said ?? '') : said ? `${said}. ${where(i)}` : where(i))
  }

  const go = (dir: 'next' | 'prev') => {
    if (busy || done) return
    const i = index + (dir === 'next' ? 1 : -1)
    if (i < 0 || i >= count) return
    show(i, dir)
  }

  /** Records the decision and moves on to the next undecided item, or to the summary. */
  const decide = (at: number, atKey: string, verdict: ReviewDecision) => {
    const { items: list, keyOf: keyFor } = latest.current
    const next = { ...latest.current.decisions, [atKey]: verdict }
    setDecisions(next)
    const said = verdict === 'approved' ? labels.reviewApproved : labels.reviewSkipped
    for (let step = 1; step <= list.length; step++) {
      const j = (at + step) % list.length
      if (!next[keyFor(list[j], j)]) return show(j, 'next', said)
    }
    // Nothing left: the summary. Focus that was in the queue goes to its heading.
    if (focusIn(rootRef)) pending.current = 'summary'
    setEnter('next')
    const approved = list.filter((it, i) => next[keyFor(it, i)] === 'approved').length
    setMessage(`${labels.reviewAllDone}. ${labels.reviewTally(approved, list.length - approved)}`)
  }

  const approve = async () => {
    if (item === undefined || key === undefined || busy || done || decision === 'approved') return
    const at = index
    const result = onApprove?.(item as T)
    if (isPromise(result)) {
      setBusy(true)
      try {
        await result
      } catch {
        // The app says what went wrong; the item stays where it is.
        return
      } finally {
        setBusy(false)
      }
    }
    decide(at, key, 'approved')
  }

  const skip = () => {
    if (item === undefined || key === undefined || busy || done || decision === 'approved') return
    onSkip?.(item as T)
    decide(index, key, 'skipped')
  }

  const edit = () => {
    if (item === undefined || busy || done || decision === 'approved' || !canEdit) return
    if (!renderEditor) {
      onEdit?.(item as T)
      return
    }
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setEditing(true)
  }

  const save = async (values: FormValues) => {
    if (item === undefined) return
    const result = onEdit?.(item as T, values)
    if (isPromise(result)) {
      setSaving(true)
      try {
        await result
      } catch {
        return
      } finally {
        setSaving(false)
      }
    }
    setEditing(false)
  }

  const reviewSkipped = () => {
    const first = items.findIndex((it, i) => decisions[keyOf(it, i)] === 'skipped')
    if (first < 0) return
    setDecisions(Object.fromEntries(Object.entries(decisions).filter(([, d]) => d !== 'skipped')))
    pending.current = 'item'
    setEnter('next')
    setIndex(first)
    setMessage('')
  }

  // Focus follows the item or the summary when the element it was on goes away.
  React.useLayoutEffect(() => {
    const target = pending.current
    if (!target) return
    pending.current = null
    const el = target === 'summary' ? summaryRef.current : itemRef.current
    ;(el ?? rootRef.current)?.focus()
  })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(e)
    if (!keys || e.defaultPrevented || e.nativeEvent.isComposing || e.repeat) return
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
    // Not from the editor Sheet (a portal, but still a React child), and not while typing.
    if (!e.currentTarget.contains(e.target as Node) || isEditable(e.target)) return
    const run = pressed(e, keys.next)
      ? () => go('next')
      : pressed(e, keys.previous)
        ? () => go('prev')
        : pressed(e, keys.approve)
          ? () => void approve()
          : pressed(e, keys.skip)
            ? skip
            : pressed(e, keys.edit)
              ? edit
              : null
    if (!run) return
    e.preventDefault()
    run()
  }

  const value: QueueContextValue = {
    items,
    keyOf,
    itemLabel: itemLabel as (item: unknown) => string,
    title,
    index,
    count,
    item,
    itemKey: key,
    decision,
    decisions,
    decided,
    done,
    busy,
    editing,
    canEdit,
    enter,
    keys,
    approveLabel: approveLabel ?? labels.reviewApprove,
    labels,
    format,
    next: () => go('next'),
    previous: () => go('prev'),
    approve: () => void approve(),
    skip,
    edit,
    reviewSkipped,
    itemRef,
    summaryRef,
  }

  const formId = React.useId()

  return (
    <QueueContext.Provider value={value}>
      <section
        ref={(node: HTMLElement | null) => {
          rootRef.current = node
          setRef(ref, node)
        }}
        data-slot="review-queue"
        data-state={done ? 'done' : editing ? 'editing' : 'reviewing'}
        aria-label={title ?? labels.reviewQueue}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full max-w-[480px] flex-col gap-3 rounded-xl text-text-default outline-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus-ring',
          className,
        )}
        {...props}
      >
        {children}
        <span role="status" className="sr-only">
          {message}
        </span>
      </section>
      {renderEditor && item !== undefined && (
        <Sheet
          {...sheetProps}
          open={editing}
          onOpenChange={setEditing}
          title={editTitle ? editTitle(item as T) : labels.reviewEdit}
          description={editTitle ? undefined : itemLabel(item as T)}
          onCloseAutoFocus={(e: Event) => {
            sheetProps?.onCloseAutoFocus?.(e)
            // Back where Edit was pressed: the queue keeps its place, and focus with it.
            e.preventDefault()
            const back = returnFocus.current
            returnFocus.current = null
            ;(back?.isConnected ? back : (itemRef.current ?? rootRef.current))?.focus()
          }}
          footer={
            <>
              <SheetClose asChild>
                <Button variant="secondary">{labels.cancel}</Button>
              </SheetClose>
              <Button type="submit" form={formId} loading={saving}>
                {labels.reviewSave}
              </Button>
            </>
          }
        >
          <Form id={formId} onSubmitValues={(values) => void save(values)}>
            {renderEditor(item as T)}
          </Form>
        </Sheet>
      )}
    </QueueContext.Provider>
  )
}

/* ---------- parts ---------- */

/** ‹ and › on either side of "4 of 12". */
function Chevron({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="rtl:-scale-x-100">
      <path d={dir === 'prev' ? 'M15 6L9 12L15 18' : 'M9 6L15 12L9 18'} stroke="currentColor" strokeWidth="1.875" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export interface ReviewQueueHeaderProps extends React.ComponentProps<'div'> {}

/**
 * The title, the decision of an item gone back to, ‹ "4 of 12" › and the bar of how many are
 * decided. Other props, `ref` included, go to its `div`.
 */
export function ReviewQueueHeader({ className, ...props }: ReviewQueueHeaderProps) {
  const q = useQueue('ReviewQueueHeader')
  const { labels, keys, format } = q
  const navOff = q.busy || q.done
  const position = q.done ? q.count : q.index + 1
  return (
    <div data-slot="review-queue-header" className={cn('flex flex-col gap-2', className)} {...props}>
      <div className="flex min-h-6 items-center gap-2">
        <div className="min-w-0 flex-1 truncate text-base leading-5 font-medium text-text-default">{q.title}</div>
        {q.decision && !q.done && (
          <Badge size="sm" tone={q.decision === 'approved' ? 'green' : 'neutral'}>
            {q.decision === 'approved' ? labels.reviewApproved : labels.reviewSkipped}
          </Badge>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          <Tooltip label={labels.reviewPrevious} shortcut={keys?.previous || undefined}>
            <Button
              variant="tertiary"
              size="xs"
              iconOnly
              aria-label={labels.reviewPrevious}
              aria-keyshortcuts={keys?.previous || undefined}
              aria-disabled={navOff || q.index === 0 || undefined}
              data-off={navOff || q.index === 0 || undefined}
              onClick={q.previous}
              className="text-text-muted data-off:pointer-events-none data-off:opacity-50"
            >
              <Chevron dir="prev" />
            </Button>
          </Tooltip>
          <span data-slot="review-queue-position" className="min-w-12 text-center text-sm leading-5 text-text-muted tabular-nums">
            {labels.reviewPosition(format(position), format(q.count))}
          </span>
          <Tooltip label={labels.reviewNext} shortcut={keys?.next || undefined}>
            <Button
              variant="tertiary"
              size="xs"
              iconOnly
              aria-label={labels.reviewNext}
              aria-keyshortcuts={keys?.next || undefined}
              aria-disabled={navOff || q.index >= q.count - 1 || undefined}
              data-off={navOff || q.index >= q.count - 1 || undefined}
              onClick={q.next}
              className="text-text-muted data-off:pointer-events-none data-off:opacity-50"
            >
              <Chevron dir="next" />
            </Button>
          </Tooltip>
        </div>
      </div>
      <Progress
        value={q.decided}
        max={Math.max(q.count, 1)}
        showValue={false}
        aria-label={labels.reviewProgress}
        formatValue={(v) => labels.reviewProgressValue(format(v), format(q.count))}
      />
    </div>
  )
}

export interface ReviewQueueItemProps<T> extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Draws the item on show. */
  children: (item: T, state: ReviewQueueItemState) => React.ReactNode
}

/**
 * The item on show, as a group named after it and its place. Hidden once all are decided.
 * Other props, `ref` included, go to its `div`.
 */
export function ReviewQueueItem<T>({ children, className, ref, ...props }: ReviewQueueItemProps<T>) {
  const q = useQueue('ReviewQueueItem')
  if (q.done || q.item === undefined) return null
  return (
    <div
      key={q.itemKey}
      ref={(node: HTMLDivElement | null) => {
        q.itemRef.current = node
        setRef(ref, node)
      }}
      role="group"
      aria-label={q.labels.reviewItemAt(q.itemLabel(q.item), q.format(q.index + 1), q.format(q.count))}
      tabIndex={-1}
      data-slot="review-queue-item"
      data-enter={q.enter ?? undefined}
      data-decision={q.decision}
      className={cn(
        'satin-review-queue-enter flex flex-col rounded-xl outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus-ring',
        className,
      )}
      {...props}
    >
      {children(q.item as T, { index: q.index, position: q.index + 1, count: q.count, decision: q.decision, editing: q.editing })}
    </div>
  )
}

export interface ReviewQueueActionsProps extends React.ComponentProps<'div'> {}

/**
 * The J K hint, then Skip, Edit and Approve with their keys. Hidden once all are decided.
 * Other props, `ref` included, go to its `div`.
 */
export function ReviewQueueActions({ className, ...props }: ReviewQueueActionsProps) {
  const q = useQueue('ReviewQueueActions')
  if (q.done || q.item === undefined) return null
  const { labels, keys } = q
  // An approved item is done; while Approve runs, the others wait. Both keep focus where it is.
  const off = q.decision === 'approved' || q.busy
  const key = (k: string | undefined) =>
    k ? (
      <Kbd aria-hidden className="pointer-coarse:hidden">
        {k.toUpperCase()}
      </Kbd>
    ) : null
  const shortcut = (k: string | undefined) => (k ? k.toUpperCase() : undefined)
  const dim = 'data-off:pointer-events-none data-off:opacity-50'
  return (
    <div data-slot="review-queue-actions" className={cn('flex flex-wrap items-center justify-end gap-2', className)} {...props}>
      {keys && (keys.next || keys.previous) && (
        <KbdHint
          keys={[keys.next, keys.previous].filter(Boolean).map((k) => k.toUpperCase())}
          label={labels.navigate}
          aria-hidden
          className="me-auto pointer-coarse:hidden"
        />
      )}
      <Button variant="tertiary" aria-keyshortcuts={shortcut(keys?.skip)} aria-disabled={off || undefined} data-off={off || undefined} onClick={q.skip} className={dim}>
        {labels.skip}
        {key(keys?.skip)}
      </Button>
      {q.canEdit && (
        <Button variant="secondary" aria-keyshortcuts={shortcut(keys?.edit)} aria-disabled={off || undefined} data-off={off || undefined} onClick={q.edit} className={dim}>
          {labels.reviewEdit}
          {key(keys?.edit)}
        </Button>
      )}
      <Button
        aria-keyshortcuts={shortcut(keys?.approve)}
        aria-disabled={q.decision === 'approved' || undefined}
        data-off={q.decision === 'approved' || undefined}
        loading={q.busy}
        onClick={q.approve}
        className={dim}
      >
        {q.approveLabel}
        {key(keys?.approve)}
      </Button>
    </div>
  )
}

export interface ReviewQueueSummaryProps extends React.ComponentProps<'section'> {
  /** Buttons after Review skipped: what to do with the approved ones ("Back to inbox"). */
  actions?: React.ReactNode
}

function SummaryList({ label, names, none }: { label: string; names: string[]; none: string }) {
  const id = React.useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div id={id} className="flex items-center gap-1.5 text-xs leading-4 font-medium text-text-muted">
        {/* The space keeps the list's name "Approved 9", not "Approved9", for screen readers. */}
        {label}{' '}
        <span className="tabular-nums">{names.length}</span>
      </div>
      {names.length > 0 ? (
        <ul aria-labelledby={id} className="m-0 flex list-none flex-col gap-1 p-0">
          {names.map((name, i) => (
            <li key={i} className="truncate text-sm leading-5 text-text-default">
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm leading-5 text-text-muted">{none}</p>
      )}
    </div>
  )
}

/**
 * Once every item is decided: the tally, the approved and the skipped listed by name, and
 * Review skipped. Hidden until then. Other props, `ref` included, go to its `section`.
 */
export function ReviewQueueSummary({ actions, className, ...props }: ReviewQueueSummaryProps) {
  const q = useQueue('ReviewQueueSummary')
  const headingId = React.useId()
  if (!q.done) return null
  const { labels } = q
  const approved: string[] = []
  const skipped: string[] = []
  q.items.forEach((it, i) => {
    const d = q.decisions[q.keyOf(it, i)]
    if (d === 'approved') approved.push(q.itemLabel(it))
    else if (d === 'skipped') skipped.push(q.itemLabel(it))
  })
  return (
    <section
      data-slot="review-queue-summary"
      data-enter={q.enter ?? undefined}
      aria-labelledby={headingId}
      className={cn(
        'satin-review-queue-enter flex flex-col gap-4 rounded-xl border border-border-default bg-bg-popover p-3 text-text-default',
        '[box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-status-green-bg text-status-green-fg">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-col gap-1 pt-0.5">
          <div
            id={headingId}
            ref={q.summaryRef}
            tabIndex={-1}
            className="rounded-sm text-base leading-5 font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus-ring"
          >
            {labels.reviewAllDone}
          </div>
          <div className="text-sm leading-5 text-text-muted">{labels.reviewTally(approved.length, skipped.length)}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SummaryList label={labels.reviewApproved} names={approved} none={labels.reviewNone} />
        <SummaryList label={labels.reviewSkipped} names={skipped} none={labels.reviewNone} />
      </div>
      {(skipped.length > 0 || actions) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {skipped.length > 0 && (
            <Button variant="secondary" onClick={q.reviewSkipped}>
              {labels.reviewSkippedAgain}
            </Button>
          )}
          {actions}
        </div>
      )}
    </section>
  )
}

/* ---------- the common case ---------- */

export interface ReviewQueueProps<T> extends Omit<ReviewQueueRootProps<T>, 'children'> {
  /** Draws one item, usually an AgentSuggestion (give it `className="max-w-none"` to take the queue's width). */
  renderItem: (item: T, state: ReviewQueueItemState) => React.ReactNode
  /** Buttons for the summary, after Review skipped. */
  summaryActions?: React.ReactNode
}

/**
 * The queue from props: the header with the bar, the item, the actions, and the summary at the
 * end. Other props, `ref` included, go to the `section`.
 */
export function ReviewQueue<T>({ renderItem, summaryActions, ...props }: ReviewQueueProps<T>) {
  return (
    <ReviewQueueRoot<T> {...props}>
      <ReviewQueueHeader />
      <ReviewQueueItem<T>>{renderItem}</ReviewQueueItem>
      <ReviewQueueActions />
      <ReviewQueueSummary actions={summaryActions} />
    </ReviewQueueRoot>
  )
}
