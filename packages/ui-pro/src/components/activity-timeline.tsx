'use client'

import * as React from 'react'
import { TetrisStill } from '@uisatin/ui/agent-loading'
import { AgentSuggestionChanges, type AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import { Avatar } from '@uisatin/ui/avatar'
import { Button } from '@uisatin/ui/button'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { RelativeTime, dateTimeFormat, relativeTimeFormat, useRelativeClock, type RelativeTimeProps } from '@uisatin/ui/relative-time'
import { Skeleton } from '@uisatin/ui/skeleton'
import { toast } from '@uisatin/ui/toast'

/**
 * ActivityTimeline: a record's history, newest first. Who did what and when, people and agents
 * alike, under the name of each day ("Today", "Yesterday", "Monday, November 16").
 *
 * - Each entry is the actor's avatar on a rail (an agent's is the tetris mark at rest, in a
 *   circle filled like Toast's and Attachment's icon tiles, component/file-icon-bg, with a 0.75px
 *   border/strong edge, the rail's colour, so it reads on card and popover alike), the sentence
 *   (**actor** verb **target**) and its time. Today's times are relative ("5 min ago") and move
 *   on by themselves: one shared clock ticks every 30 s, and only a time whose text changes
 *   renders again. Older days show the clock time. Screen readers hear the full date.
 * - `changes` (`AgentSuggestionChange[]`) are drawn as AgentSuggestion draws them: the field, the
 *   old value struck through, an arrow, the new one.
 * - A run of `collapseRuns` (3) or more entries by the same actor folds into one row ("Agent made
 *   6 changes") that opens onto them. Which runs are open is `expanded` / `defaultExpanded` /
 *   `onExpandedChange`, by the id of any entry in the run, so a run stays open as entries join it.
 * - An entry with `revertible` gets a Revert button when the timeline has `onRevert`. While the
 *   promise it returns runs, the button spins; once it resolves, the entry is struck through with
 *   "Reverted by you", focus moves to it, and a toast says so with Undo (`onUndoRevert`). A
 *   rejected promise puts the button back; tell people why with a toast of your own. The toast
 *   needs the app's `<Toaster />`.
 * - A run opening or closing, and "Reverted by you" coming or going, change height over 300 ms:
 *   the rows below glide, the content fades in once the move starts, the chevron turns with it.
 *   New entries fade in at the top (200 ms, from 4px above). Reduced motion makes it all instant.
 * - `loading` shows three skeleton rows, `empty` (or "No activity yet") when there are no items.
 *
 * Parts, for a timeline of your own: `ActivityTimelineRoot` (revert and motion for the parts
 * inside) › `ActivityTimelineDay` or `ActivityTimelineList` › `ActivityTimelineEntry` and
 * `ActivityTimelineRun`, with `ActivityTimelineTime` for a time on its own. Other props on
 * ActivityTimeline and ActivityTimelineRoot, `ref` included, go to the root `div`.
 */

/** The words the Activity timeline says on its own. They join SatinLabels, so the app translates them there. */
export const activityTimelineLabels = {
  /** The timeline's name for screen readers: it has no visible heading of its own. */
  activity: 'Activity',
  /** When there are no entries yet. */
  noActivity: 'No activity yet',
  /**
   * A folded run: "Agent made 6 changes". `actor` is the name as shown (in medium weight); write
   * it with JSX: `(actor, count) => <>{actor}: {count} zmian</>`.
   */
  activityRun: (actor: React.ReactNode, count: number): React.ReactNode => (
    <>
      {actor} made {count} {count === 1 ? 'change' : 'changes'}
    </>
  ),
  revert: 'Revert',
  /** The Revert button's name, from the entry's `label`: "Revert stage change". */
  revertChange: (label: string) => `Revert ${label}`,
  /** Under an entry the user reverted. */
  revertedByYou: 'Reverted by you',
  /** Under an entry someone else reverted. */
  revertedBy: (name: string) => `Reverted by ${name}`,
  /** The toast after a revert, from the entry's `label`: "Reverted salary range change". */
  changeReverted: (label?: string) => (label ? `Reverted ${label}` : 'Change reverted'),
  /** The toast's action. */
  undo: 'Undo',
}

type ActivityTimelineLabels = typeof activityTimelineLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends ActivityTimelineLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...activityTimelineLabels, ...labels }), [labels])
}

/* ---------- types ---------- */

export interface ActivityActor {
  name: string
  kind: 'person' | 'agent'
  /** In place of the initials, 24px: an Avatar in the person's tone, a photo. An agent's is the tetris mark. */
  avatar?: React.ReactNode
  /** Tells apart two actors with the same name, for folding runs. */
  id?: string
}

export interface ActivityItem {
  id: string
  actor: ActivityActor
  /** What they did: "moved", "drafted", "changed". */
  verb: React.ReactNode
  /** What they did it to, after the verb in medium weight: "offer email", or a Badge for a stage. */
  target?: React.ReactNode
  /** Fields from → to, drawn as AgentSuggestion draws them. */
  changes?: AgentSuggestionChange[]
  /** When: a Date, an ISO string or a timestamp. */
  at: Date | string | number
  /** Gets a Revert button, when the timeline has `onRevert`. */
  revertible?: boolean
  /**
   * The change in a few words, for the Revert button's name and the toast: "stage change" gives
   * "Revert stage change". Defaults to the first change's field when it is a string.
   */
  label?: string
  /**
   * Already reverted: struck through, with "Reverted by you" (`true`) or "Reverted by Jon Park"
   * (`{ by: 'Jon Park' }`). Leave it out and the timeline remembers what was reverted in it.
   */
  reverted?: boolean | { by: string }
}

export type ActivityGroupBy = 'day' | 'none'

/* ---------- days and times, on Free's shared clock ---------- */

const toDate = (at: ActivityItem['at']) => (at instanceof Date ? at : new Date(at))

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

/** Whole days from `a` to `b`, by the calendar (not 24-hour spans). */
function daysBetween(a: Date, b: Date) {
  const start = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((start(b) - start(a)) / 86_400_000)
}

/** "Today", "Yesterday", then "Monday, November 16" (with the year when it isn't this one). */
function dayName(day: Date, now: number, locale: string) {
  const nowDate = new Date(now)
  const ago = daysBetween(day, nowDate)
  if (ago === 0 || ago === 1) {
    const word = relativeTimeFormat(locale, { numeric: 'auto' }).format(-ago, 'day')
    return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1)
  }
  return dateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(day.getFullYear() !== nowDate.getFullYear() && { year: 'numeric' }),
  }).format(day)
}

/* ---------- the time ---------- */

export interface ActivityTimelineTimeProps extends RelativeTimeProps {
  at: ActivityItem['at']
  /** Past today, show the date before the clock time (for a timeline not grouped by day). */
  withDate?: boolean
}

/**
 * A `<time>`: relative today ("5 min ago"), the clock time before that, kept current by the
 * shared clock. Screen readers hear the full date and time instead. It's Free's RelativeTime
 * (`@uisatin/ui/relative-time`), so a timeline and the times around it tick together. Other
 * props, `ref` included, go to the `time` element.
 */
export function ActivityTimelineTime({ withDate = false, ...props }: ActivityTimelineTimeProps) {
  return <RelativeTime data-slot="activity-timeline-time" withDate={withDate} {...props} />
}

/* ---------- the root: revert and motion for the parts inside ---------- */

type RevertStatus = 'reverting' | 'reverted'

interface TimelineContextValue {
  status: ReadonlyMap<string, RevertStatus>
  /** Undefined when the timeline has no `onRevert`: no Revert buttons. */
  revert?: (item: ActivityItem) => Promise<boolean>
  /** Set after the first render with content: entries that mount later fade in. */
  ready: React.RefObject<boolean>
  labels: ReturnType<typeof useLabels>
}

const TimelineContext = React.createContext<TimelineContextValue | null>(null)

export interface ActivityTimelineRootProps extends React.ComponentProps<'div'> {
  /**
   * Reverts an entry. Return a promise and the button spins until it settles; once it resolves
   * the entry shows as reverted and a toast offers Undo. A rejection puts the button back.
   */
  onRevert?: (item: ActivityItem) => unknown
  /** Undoes a revert, from the toast's Undo. Without it the toast has no Undo. */
  onUndoRevert?: (item: ActivityItem) => unknown
  /** Shows skeleton rows (ActivityTimeline) and marks the region busy. */
  loading?: boolean
}

/** The timeline's root on its own: Revert, its toast, and the fade of new entries for the parts inside. */
export function ActivityTimelineRoot({ onRevert, onUndoRevert, loading = false, className, children, ...props }: ActivityTimelineRootProps) {
  const labels = useLabels()
  const [status, setStatus] = React.useState<ReadonlyMap<string, RevertStatus>>(() => new Map())
  const set = React.useCallback((id: string, next?: RevertStatus) => {
    setStatus((map) => {
      const copy = new Map(map)
      if (next) copy.set(id, next)
      else copy.delete(id)
      return copy
    })
  }, [])

  const handlers = React.useRef({ onRevert, onUndoRevert })
  handlers.current = { onRevert, onUndoRevert }
  const labelsRef = React.useRef(labels)
  labelsRef.current = labels

  const revert = React.useCallback(
    async (item: ActivityItem) => {
      const { onRevert } = handlers.current
      if (!onRevert) return false
      set(item.id, 'reverting')
      try {
        await onRevert(item)
      } catch {
        set(item.id)
        return false
      }
      set(item.id, 'reverted')
      const l = labelsRef.current
      const label = labelOf(item)
      toast(l.changeReverted(label), {
        action: handlers.current.onUndoRevert
          ? {
              label: l.undo,
              onClick: () => {
                set(item.id)
                Promise.resolve(handlers.current.onUndoRevert?.(item)).catch(() => set(item.id, 'reverted'))
              },
            }
          : undefined,
      })
      return true
    },
    [set],
  )

  const ready = React.useRef(false)
  React.useEffect(() => {
    if (!loading) ready.current = true
  }, [loading])

  const value = React.useMemo(
    () => ({ status, revert: onRevert ? revert : undefined, ready, labels }),
    [status, onRevert, revert, labels],
  )

  return (
    <TimelineContext.Provider value={value}>
      <div data-slot="activity-timeline" aria-busy={loading || undefined} className={cn('flex w-full flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </TimelineContext.Provider>
  )
}

const labelOf = (item: ActivityItem) => {
  if (item.label) return item.label
  const field = item.changes?.[0]?.field
  return typeof field === 'string' ? field : undefined
}

/* ---------- lists ---------- */

export type ActivityTimelineListProps = React.ComponentProps<'ol'>

/** An ordered list of entries and runs, newest first. Name it (`aria-label`) when no day names it. Other props, `ref` included, go to the `ol`. */
export function ActivityTimelineList({ className, ...props }: ActivityTimelineListProps) {
  return <ol role="list" data-slot="activity-timeline-list" className={cn('m-0 flex list-none flex-col p-0', className)} {...props} />
}

export interface ActivityTimelineDayProps extends Omit<React.ComponentProps<'ol'>, 'title'> {
  /** The day: a Date (named "Today", "Yesterday" or by its date) or your own words. */
  day: Date | React.ReactNode
}

/** A day: its name, then its entries in a list named after it. Other props, `ref` included, go to the `ol`. */
export function ActivityTimelineDay({ day, className, ...props }: ActivityTimelineDayProps) {
  const id = React.useId()
  return (
    <div data-slot="activity-timeline-day" className="flex flex-col gap-2">
      <div id={id} data-slot="activity-timeline-day-name" className="text-xs leading-4 font-medium text-text-muted">
        {day instanceof Date ? <DayName day={day} /> : day}
      </div>
      <ActivityTimelineList aria-labelledby={id} className={className} {...props} />
    </div>
  )
}

function DayName({ day }: { day: Date }) {
  const locale = useLabels().dateLocale
  const time = day.getTime()
  return <span suppressHydrationWarning>{useRelativeClock((now) => dayName(new Date(time), now, locale))}</span>
}

/* ---------- the marker on the rail ---------- */

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0]?.toLocaleUpperCase() ?? '')
    .join('')

function ActorAvatar({ actor }: { actor: ActivityActor }) {
  if (actor.avatar) return <>{actor.avatar}</>
  if (actor.kind === 'agent')
    return (
      <span
        data-slot="activity-timeline-agent"
        className="grid size-6 place-items-center rounded-full bg-component-file-icon-bg [box-shadow:inset_0_0_0_var(--border-width-default)_var(--border-strong)]"
      >
        <TetrisStill />
      </span>
    )
  return <Avatar initials={initialsOf(actor.name)} size={24} />
}

/** The 24px column with the actor, and the rail running down from it to the next entry. */
function Marker({ actor }: { actor: ActivityActor }) {
  return (
    <>
      <span aria-hidden data-slot="activity-timeline-rail" className="absolute start-[11.5px] top-[26px] bottom-0.5 w-px bg-border-strong [li:last-child>&]:hidden" />
      <span aria-hidden className="relative flex size-6 shrink-0 items-center justify-center">
        <ActorAvatar actor={actor} />
      </span>
    </>
  )
}

/**
 * Entries that mount after the first render with content fade in (new ones at the top, one joining
 * an open run). Those mounting with a fold as it opens don't: the fold fades them in itself.
 */
function useEnter(context: TimelineContextValue | null) {
  const opening = React.useContext(FoldContext)
  const [enter] = React.useState(() => (context?.ready.current ?? false) && !opening?.current)
  return enter
}

/* ---------- a fold: height that opens and closes by itself ---------- */

/** True while the fold's first render runs, so the entries mounting with it leave the fade to it. */
const FoldContext = React.createContext<React.RefObject<boolean> | null>(null)

/** How long the fold waits for its transition before it gives up on `transitionend`. */
const FOLD_FALLBACK_MS = 400

/**
 * Content that opens and closes in height: a run's entries, "Reverted by you". The rows below
 * glide (grid rows 0fr ↔ 1fr, activity-timeline.css) and the content fades in once the move has
 * started. It stays mounted while it closes, inert, and unmounts when the move ends. It clips
 * only while it moves, so focus rings inside it show once it settles.
 */
function Fold({ open, children }: { open: boolean; children: React.ReactNode }) {
  const [present, setPresent] = React.useState(open)
  const [shown, setShown] = React.useState(open)
  const [settled, setSettled] = React.useState(open)
  if (open && !present) setPresent(true)
  if (!open && shown) setShown(false)
  if (!open && settled) setSettled(false)

  const ref = React.useRef<HTMLDivElement>(null)

  // Opening: the content is in the page at 0fr; lay that out, then go to 1fr, so the rows move.
  React.useLayoutEffect(() => {
    if (!open || shown) return
    ref.current?.getBoundingClientRect()
    setShown(true)
  }, [open, shown])

  // The move's end: settle open, or unmount closed. The timer covers a transition that never runs.
  React.useEffect(() => {
    const el = ref.current
    if (!el || (open ? !shown || settled : !present)) return
    const finish = () => (open ? setSettled(true) : setPresent(false))
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el && e.propertyName === 'grid-template-rows') finish()
    }
    el.addEventListener('transitionend', onEnd)
    const timer = window.setTimeout(finish, FOLD_FALLBACK_MS)
    return () => {
      el.removeEventListener('transitionend', onEnd)
      window.clearTimeout(timer)
    }
  }, [open, shown, settled, present])

  if (!present) return null
  return (
    <div ref={ref} data-slot="activity-timeline-fold" data-state={shown ? 'open' : 'closed'} data-settled={settled || undefined} inert={!open}>
      <div>
        <FoldOpening>{children}</FoldOpening>
      </div>
    </div>
  )
}

/** Mounts with the fold's content each time it opens: `opening` holds for that first render. */
function FoldOpening({ children }: { children: React.ReactNode }) {
  const opening = React.useRef(true)
  React.useEffect(() => {
    opening.current = false
  }, [])
  return <FoldContext.Provider value={opening}>{children}</FoldContext.Provider>
}

const rowClass = 'relative flex gap-3 pb-5 last:pb-0'

/* ---------- one entry ---------- */

export interface ActivityTimelineEntryProps extends Omit<React.ComponentProps<'li'>, 'children'> {
  item: ActivityItem
  /** Past today, write the date before the time (for a timeline not grouped by day). */
  withDate?: boolean
}

/**
 * One entry: the actor on the rail, the sentence, the time, the changes and Revert. Inside an
 * ActivityTimelineRoot it can be reverted. Other props, `ref` included, go to the `li`.
 */
export function ActivityTimelineEntry({ item, withDate = false, className, ref, ...props }: ActivityTimelineEntryProps) {
  const context = React.useContext(TimelineContext)
  const ownLabels = useLabels()
  const labels = context?.labels ?? ownLabels
  const enter = useEnter(context)
  const sentenceId = React.useId()
  const buttonId = React.useId()

  const status = context?.status.get(item.id)
  const reverting = status === 'reverting'
  const reverted = Boolean(item.reverted) || status === 'reverted'
  const revertedBy = typeof item.reverted === 'object' ? labels.revertedBy(item.reverted.by) : labels.revertedByYou
  const canRevert = Boolean(item.revertible && context?.revert) && !reverted
  const label = labelOf(item)

  // When the Revert button that had focus goes, focus moves to the entry, which now says "Reverted by you".
  const li = React.useRef<HTMLLIElement | null>(null)
  const refocus = React.useRef(false)
  React.useLayoutEffect(() => {
    if (!reverted || !refocus.current) return
    refocus.current = false
    const active = document.activeElement
    if (!active || active === document.body) li.current?.focus()
  }, [reverted])

  const hasChanges = Boolean(item.changes?.length)
  const revertButton = (
    <Button
      id={buttonId}
      variant="tertiary"
      size="xs"
      loading={reverting}
      className="shrink-0"
      // Named after the change ("Revert stage change"); without a label, after the sentence.
      aria-label={label ? labels.revertChange(label) : undefined}
      aria-labelledby={label ? undefined : `${buttonId} ${sentenceId}`}
      onClick={(e) => {
        if (reverting) return
        refocus.current = document.activeElement === e.currentTarget
        context?.revert?.(item).then((done) => {
          if (!done) refocus.current = false
        })
      }}
    >
      {labels.revert}
    </Button>
  )

  const strong = cn('font-medium', reverted ? 'text-text-muted' : 'text-text-default')
  const sentence = (
    <>
      <span className={strong}>{item.actor.name}</span> {item.verb}
      {item.target != null && (
        <>
          {' '}
          <span className={strong}>{item.target}</span>
        </>
      )}
    </>
  )

  return (
    <li
      ref={(node: HTMLLIElement | null) => {
        li.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      data-slot="activity-timeline-entry"
      data-state={reverted ? 'reverted' : reverting ? 'reverting' : undefined}
      data-enter={enter || undefined}
      aria-busy={reverting || undefined}
      tabIndex={reverted ? -1 : undefined}
      className={cn(
        rowClass,
        'rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus-ring',
        className,
      )}
      {...props}
    >
      <Marker actor={item.actor} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p id={sentenceId} className="m-0 min-w-0 flex-1 py-0.5 text-sm leading-5 text-text-muted">
            {reverted ? <s className="decoration-text-muted">{sentence}</s> : sentence}
          </p>
          <ActivityTimelineTime at={item.at} withDate={withDate} className="py-0.5" />
          {canRevert && !hasChanges && revertButton}
        </div>
        {hasChanges && (
          // The changes in a frame, Revert at its end: "Salary range 7–9k → 8–10k · Revert".
          <div data-slot="activity-timeline-changes" className="mt-2 flex items-center gap-2 rounded-lg border border-border-default py-1.5 ps-3 pe-1.5">
            <AgentSuggestionChanges
              changes={item.changes!}
              // As tall as Revert beside it, so the frame keeps its height once the button goes.
              className={cn('min-w-0 flex-1', item.revertible && 'min-h-control-height-xs justify-center')}
            />
            {canRevert && revertButton}
          </div>
        )}
        {/* Opens under the entry when it's reverted and closes on Undo; the rows below glide. */}
        <Fold open={reverted}>
          <p data-slot="activity-timeline-reverted" className="m-0 flex items-center gap-1 pt-1.5 text-sm leading-5 text-text-muted">
            <UndoGlyph />
            {revertedBy}
          </p>
        </Fold>
      </div>
    </li>
  )
}

function UndoGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="size-icon-size-sm shrink-0 rtl:-scale-x-100">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ strokeWidth: 1.875 }}>
        <path d="M4.5 8.5H15a5 5 0 0 1 0 10h-4" />
        <path d="M8.5 4.5 4.5 8.5l4 4" />
      </g>
    </svg>
  )
}

/* ---------- a folded run ---------- */

export interface ActivityTimelineRunProps extends Omit<React.ComponentProps<'li'>, 'children'> {
  /** Whose run it is: their avatar on the rail and their name in the summary. */
  actor: ActivityActor
  /** How many entries are folded. */
  count: number
  /** The newest entry's time, beside the summary. */
  at: ActivityItem['at']
  /** Past today, write the date before the time. */
  withDate?: boolean
  /** In place of "Agent made 6 changes". */
  summary?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** The run's entries (ActivityTimelineEntry), shown when it opens. */
  children: React.ReactNode
}

/**
 * Several entries by one actor folded into one row: "Agent made 6 changes", a button that opens
 * onto them (their own list, opening in height). Other props, `ref` included, go to the `li`.
 */
export function ActivityTimelineRun({
  actor,
  count,
  at,
  withDate = false,
  summary,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: ActivityTimelineRunProps) {
  const context = React.useContext(TimelineContext)
  const ownLabels = useLabels()
  const labels = context?.labels ?? ownLabels
  const enter = useEnter(context)
  const listId = React.useId()
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen)
  const open = openProp ?? ownOpen
  const toggle = () => {
    if (openProp === undefined) setOwnOpen(!open)
    onOpenChange?.(!open)
  }

  return (
    <li
      data-slot="activity-timeline-run"
      data-state={open ? 'open' : 'closed'}
      data-enter={enter || undefined}
      className={cn(rowClass, className)}
      {...props}
    >
      <Marker actor={actor} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="m-0 min-w-0 flex-1 py-0.5 text-sm leading-5">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              onClick={toggle}
              className={cn(
                'group/run inline-flex cursor-pointer items-center gap-1 rounded-sm text-start text-text-muted',
                'transition-colors duration-(--duration-fast) ease-(--ease-out) hover:text-text-default',
                'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus-ring',
              )}
            >
              <span>{summary ?? labels.activityRun(<span className="font-medium text-text-default">{actor.name}</span>, count)}</span>
              {/* Turns with the fold, on its duration and curve (activity-timeline.css). */}
              <svg
                aria-hidden
                data-slot="activity-timeline-run-chevron"
                viewBox="0 0 24 24"
                fill="none"
                className="size-icon-size-sm shrink-0 group-aria-expanded/run:rotate-180"
              >
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ strokeWidth: 1.875 }} />
              </svg>
            </button>
          </p>
          <ActivityTimelineTime at={at} withDate={withDate} className="py-0.5" />
        </div>
        {/* The gap above the entries is inside the fold, so it opens and closes with them. */}
        <Fold open={open}>
          <ActivityTimelineList id={listId} className="pt-3">
            {children}
          </ActivityTimelineList>
        </Fold>
      </div>
    </li>
  )
}

/* ---------- the whole timeline ---------- */

type Block = { kind: 'entry'; item: ActivityItem } | { kind: 'run'; items: ActivityItem[] }
type Day = { key: string; date: Date; blocks: Block[] }

const actorKey = (actor: ActivityActor) => actor.id ?? `${actor.kind}:${actor.name}`

/** Newest first, cut into days (or one), with runs of one actor folded from `min` entries. */
function arrange(items: ActivityItem[], groupBy: ActivityGroupBy, min: number | false): Day[] {
  const sorted = items
    .map((item, index) => ({ item, index, time: toDate(item.at).getTime() }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
  const days: Day[] = []
  for (const { item, time } of sorted) {
    const date = new Date(time)
    const key = groupBy === 'day' ? dayKey(date) : 'all'
    let day = days[days.length - 1]
    if (!day || day.key !== key) days.push((day = { key, date, blocks: [] }))
    const last = day.blocks[day.blocks.length - 1]
    const lastActor = last && (last.kind === 'run' ? last.items[0].actor : last.item.actor)
    if (last && lastActor && actorKey(lastActor) === actorKey(item.actor)) {
      if (last.kind === 'run') last.items.push(item)
      else day.blocks[day.blocks.length - 1] = { kind: 'run', items: [last.item, item] }
    } else day.blocks.push({ kind: 'entry', item })
  }
  // A run shorter than `min` stays as single entries.
  const threshold = min === false ? Infinity : Math.max(2, min)
  for (const day of days)
    day.blocks = day.blocks.flatMap((b) => (b.kind === 'run' && b.items.length < threshold ? b.items.map((item) => ({ kind: 'entry' as const, item })) : [b]))
  return days
}

export interface ActivityTimelineProps extends Omit<ActivityTimelineRootProps, 'children'> {
  /** The entries, in any order: the timeline shows the newest first. */
  items: ActivityItem[]
  /** A list under its name for each day, or one list. */
  groupBy?: ActivityGroupBy
  /** Runs of this many entries or more by one actor fold into one row; `false` never folds. */
  collapseRuns?: number | false
  /** The open runs, by the id of any entry in them. */
  expanded?: string[]
  defaultExpanded?: string[]
  onExpandedChange?: (expanded: string[]) => void
  /** Shown when there are no items. Defaults to "No activity yet". */
  empty?: React.ReactNode
}

/**
 * A record's history from `items`, newest first: a list under its name for each day, runs of one actor
 * folded, Revert with a toast and Undo. The root is a group named "Activity" (`activity` in
 * SatinLabels); pass `aria-labelledby` when a heading of yours names it. Other props, `ref`
 * included, go to the root `div`.
 */
export function ActivityTimeline({
  items,
  groupBy = 'day',
  collapseRuns = 3,
  expanded: expandedProp,
  defaultExpanded = [],
  onExpandedChange,
  empty,
  loading = false,
  ...props
}: ActivityTimelineProps) {
  const labels = useLabels()
  const days = React.useMemo(() => arrange(items, groupBy, collapseRuns), [items, groupBy, collapseRuns])
  const [ownExpanded, setOwnExpanded] = React.useState(defaultExpanded)
  const expanded = expandedProp ?? ownExpanded
  const setExpanded = (next: string[]) => {
    if (expandedProp === undefined) setOwnExpanded(next)
    onExpandedChange?.(next)
  }
  const withDate = groupBy === 'none'

  const blocks = (day: Day) =>
    day.blocks.map((block) => {
      if (block.kind === 'entry') return <ActivityTimelineEntry key={block.item.id} item={block.item} withDate={withDate} />
      const ids = block.items.map((i) => i.id)
      const open = ids.some((id) => expanded.includes(id))
      const newest = block.items[0]
      return (
        // Keyed by the oldest entry: new entries join a run at the top, so it keeps its state.
        <ActivityTimelineRun
          key={`run-${ids[ids.length - 1]}`}
          actor={newest.actor}
          count={block.items.length}
          at={newest.at}
          withDate={withDate}
          open={open}
          onOpenChange={(next) => setExpanded(next ? [...expanded, ...ids.filter((id) => !expanded.includes(id))] : expanded.filter((id) => !ids.includes(id)))}
        >
          {block.items.map((item) => (
            <ActivityTimelineEntry key={item.id} item={item} withDate={withDate} />
          ))}
        </ActivityTimelineRun>
      )
    })

  return (
    // No visible heading of its own: a group named "Activity", which `aria-label` or `aria-labelledby` (your heading) can rename.
    <ActivityTimelineRoot role="group" aria-label={labels.activity} loading={loading} {...props}>
      {loading ? (
        <>
          <span role="status" className="sr-only">
            {labels.loading}
          </span>
          {[0.6, 0.45, 0.55].map((width, i) => (
            <div key={i} data-slot="activity-timeline-skeleton" className="flex gap-3">
              <Skeleton shape="circle" animated className="size-6" />
              <div className="flex flex-1 flex-col gap-2 pt-1.5">
                <Skeleton animated width={`${width * 100}%`} />
                <Skeleton animated width="25%" />
              </div>
            </div>
          ))}
        </>
      ) : days.length === 0 ? (
        <p data-slot="activity-timeline-empty" className="m-0 py-6 text-center text-sm text-text-muted">
          {empty ?? labels.noActivity}
        </p>
      ) : groupBy === 'day' ? (
        days.map((day) => (
          <ActivityTimelineDay key={day.key} day={day.date}>
            {blocks(day)}
          </ActivityTimelineDay>
        ))
      ) : (
        <ActivityTimelineList>{blocks(days[0])}</ActivityTimelineList>
      )}
    </ActivityTimelineRoot>
  )
}
