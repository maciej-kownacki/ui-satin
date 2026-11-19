'use client'

import * as React from 'react'
import { AgentSuggestionChanges, type AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import { Button } from '@uisatin/ui/button'
import { KbdGroup } from '@uisatin/ui/kbd'
import { useSatinLabels, type SatinLabelSet } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Item, List } from '@uisatin/ui/list'
import { toast } from '@uisatin/ui/toast'

/**
 * AgentActionLog: what an agent did, run by run, and a way back for each of it. Undo over
 * confirm: the agent acts without asking, and every action it took can be reverted on its own.
 *
 * - A run is a header (its name, how many actions, when) that opens onto its actions, with a
 *   Revert run button for whatever of it is still in effect. The newest run starts open.
 * - Each action is a row: its icon, what it did, the fields it changed (AgentSuggestionChanges,
 *   from → to), the time, and Revert. An action that can't be reverted (an email already sent)
 *   has no button; it says why in its place.
 * - Revert calls `onRevert`; while its promise runs the button shows a Spinner. Done, the row
 *   strikes through and fades to text/muted, and a toast says so, with Undo when `onRestore` is
 *   given (the row then offers Restore too, for anyone the toast is gone for). A rejected
 *   promise leaves the row as it was, says it couldn't, and turns the button into Try again.
 * - ⌘Z (Ctrl+Z off Apple) reverts the newest run with anything left to revert, anywhere on the
 *   page (`shortcut="log"`: only while focus is in the log; `"off"`: never). It leaves ⌘Z alone
 *   while focus is in a text field, and when there is nothing left to revert. The run it would
 *   revert shows the keys on its button.
 *
 * Toasts need the app's `<Toaster />`. Runs show in the order given (newest first, usually).
 *
 * Parts, for a log of your own: `AgentActionLogRoot` (the state, ⌘Z and the list) ›
 * `AgentActionLogRun` › `AgentActionLogAction`. Other props on AgentActionLog and
 * AgentActionLogRoot, `ref` included, go to the `section`.
 */

/** The words the Agent action log says on its own. They join SatinLabels, so the app translates them there. */
export const agentActionLogLabels = {
  /** The log's name for screen readers, when it has no `aria-label` of its own. */
  actionLog: 'Agent actions',
  /** An action's button. */
  actionLogRevert: 'Revert',
  /** Its name for screen readers: "Revert Moved Ana Silva to Interview". */
  actionLogRevertAction: (action: string) => `Revert ${action}`,
  /** A run's button, which reverts whatever of the run is still in effect. */
  actionLogRevertRun: 'Revert run',
  /** Its name for screen readers: "Revert run: Screened new applicants". */
  actionLogRevertRunNamed: (run: string) => `Revert run: ${run}`,
  /** A reverted action's button, which puts it back (with `onRestore`). */
  actionLogRestore: 'Restore',
  actionLogRestoreAction: (action: string) => `Restore ${action}`,
  /** A reverted run's button (with `onRestore`). */
  actionLogRestoreRun: 'Restore run',
  actionLogRestoreRunNamed: (run: string) => `Restore run: ${run}`,
  /** A reverted action's button when nothing puts it back: it stays, and does nothing. */
  actionLogReverted: 'Reverted',
  /** Its name for screen readers: "Reverted: Moved Ana Silva to Interview". */
  actionLogRevertedAction: (action: string) => `Reverted: ${action}`,
  /** Before the reason an action can't be reverted, for screen readers; shown on its own when there is no reason. */
  actionLogCantRevert: "Can't be reverted",
  /** Under an action whose revert failed. */
  actionLogRevertFailed: "Couldn't revert",
  /** The button of an action whose revert failed. */
  actionLogRetry: 'Try again',
  actionLogRetryAction: (action: string) => `Try again to revert ${action}`,
  /** Read out when a revert fails. */
  actionLogRevertFailedNamed: (action: string) => `Couldn't revert ${action}`,
  /** Read out when Restore puts an action, or a run, back. */
  actionLogRestored: (action: string) => `Restored ${action}`,
  actionLogRestoreFailed: (action: string) => `Couldn't restore ${action}`,
  /** Under a run's name: "4 actions". */
  actionLogActionCount: (count: number) => (count === 1 ? '1 action' : `${count} actions`),
  /** Under a run's name once some of it is reverted: "1 of 4 reverted". */
  actionLogRevertedCount: (reverted: number, count: number) => `${reverted} of ${count} reverted`,
  /** Under a run's name when some of its reverts failed. */
  actionLogFailedCount: (count: number) => `${count} couldn't be reverted`,
  /** The toast's title after a revert; the action or the run is its description. */
  actionLogToastReverted: (count: number) => (count === 1 ? 'Action reverted' : `${count} actions reverted`),
  /** The toast's Undo, which restores what was just reverted. Shared with toastBatch. */
  undo: 'Undo',
  /** How to undo it without the toast, read to screen readers in place of the button. */
  actionLogUndoHint: 'Restore it from the action log',
}

type AgentActionLogLabels = typeof agentActionLogLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends AgentActionLogLabels {}
}

const withDefaults = (labels: SatinLabelSet) => ({ ...agentActionLogLabels, ...labels })
const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => withDefaults(labels), [labels])
}

/* ---------- data ---------- */

/** A time: a Date, an ISO string or a timestamp. */
export type AgentActionTime = Date | string | number

export interface AgentAction {
  id: string
  /** What the agent did, as a sentence: "Moved Ana Silva to Interview". It names the row's buttons and the toast. */
  label: string
  /** A 16px icon before it. */
  icon?: React.ReactNode
  /** One more line under it, cut to fit: where, for whom. */
  description?: React.ReactNode
  /** The fields it changed, as AgentSuggestionChanges shows them: field, from, to. */
  changes?: AgentSuggestionChange[]
  /** When it happened. */
  at?: AgentActionTime
  /** `false` when it can't be undone (a sent email): no Revert, and `reason` in its place. Default `true`. */
  revertible?: boolean
  /** Why it can't be reverted, said under it: "Emails can't be unsent once delivered." */
  reason?: React.ReactNode
}

export interface AgentRun {
  id: string
  /** What the agent was asked to do, or did: "Screened new applicants for Product Designer". */
  label: string
  /** When the run started. ⌘Z reverts the newest run with anything left to revert. */
  at: AgentActionTime
  actions: AgentAction[]
  /** A 16px icon or the agent's 20px Avatar before the run's name. */
  icon?: React.ReactNode
}

/** Where an action stands: still in effect, being reverted (or restored), reverted, or its revert failed. */
export type AgentActionState = 'done' | 'reverting' | 'reverted' | 'failed'

const toDate = (t: AgentActionTime) => (t instanceof Date ? t : new Date(t))
const timeOf = (t: AgentActionTime) => toDate(t).getTime()

/* ---------- small hooks ---------- */

/** A list of ids, controlled (`value` + `onChange`) or not (`defaultValue`). */
function useIds(value: string[] | undefined, defaultValue: string[] | (() => string[]), onChange?: (ids: string[]) => void) {
  const [inner, setInner] = React.useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : inner
  // The latest list, also between two changes made before the next render (a run reverted one by one).
  const ref = React.useRef(current)
  ref.current = current
  const state = React.useRef({ controlled, onChange })
  state.current = { controlled, onChange }
  const change = React.useCallback((next: (ids: string[]) => string[]) => {
    const ids = next(ref.current)
    ref.current = ids
    if (!state.current.controlled) setInner(ids)
    state.current.onChange?.(ids)
  }, [])
  return [current, change] as const
}

const noop = () => () => {}
/** After hydration: "today" and the platform are only known in the browser. */
const useHydrated = () =>
  React.useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
const isApple = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** Something that may be a promise, as one: a throw becomes a rejection. */
const attempt = (run: () => unknown) => new Promise((resolve) => resolve(run()))

/* ---------- the root: state, ⌘Z and the list ---------- */

interface LogContextValue {
  labels: ReturnType<typeof useLabels>
  stateOf: (action: AgentAction) => AgentActionState
  isExpanded: (run: AgentRun) => boolean
  toggle: (run: AgentRun) => void
  revert: (action: AgentAction, run: AgentRun) => void
  revertRun: (run: AgentRun) => void
  restore: (actions: AgentAction[], run: AgentRun) => void
  runBusy: (run: AgentRun) => boolean
  canRestore: boolean
  /** The run ⌘Z reverts, with the keys to show on its button; none when the shortcut is off. */
  shortcutRun?: string
  keys: { show: string; aria: string }
  formatTime: (at: AgentActionTime) => React.ReactNode
}

const LogContext = React.createContext<LogContextValue | null>(null)
const RunContext = React.createContext<AgentRun | null>(null)

function useLog(part: string) {
  const log = React.useContext(LogContext)
  if (!log) throw new Error(`${part} must be inside AgentActionLogRoot`)
  return log
}

export interface AgentActionLogRootProps extends React.ComponentProps<'section'> {
  /** The runs, in the order shown: newest first, usually. */
  runs: AgentRun[]
  /**
   * Reverts one action. Return a promise: the button shows a Spinner until it settles, and a
   * rejection marks the row as failed, with Try again.
   */
  onRevert: (action: AgentAction, run: AgentRun) => unknown
  /**
   * Reverts what is left of a run in one go (one request), for Revert run and ⌘Z. Gets the
   * actions still in effect, newest first. Without it, `onRevert` runs for each, newest first.
   */
  onRevertRun?: (run: AgentRun, actions: AgentAction[]) => unknown
  /**
   * Puts reverted actions back: the toast's Undo, and Restore on a reverted row or run. Without
   * it the toast has no Undo and a reverted row just says Reverted.
   */
  onRestore?: (actions: AgentAction[], run: AgentRun) => unknown
  /** Ids of the reverted actions, controlled. */
  reverted?: string[]
  /** Ids of the actions already reverted when the log mounts. */
  defaultReverted?: string[]
  onRevertedChange?: (reverted: string[]) => void
  /** Ids of the open runs, controlled. */
  expanded?: string[]
  /** Ids of the runs open when the log mounts. Default: the first run. */
  defaultExpanded?: string[]
  onExpandedChange?: (expanded: string[]) => void
  /**
   * Where ⌘Z (Ctrl+Z off Apple) reverts the newest run: anywhere on the page (`document`, the
   * default), only while focus is in the log (`log`), or nowhere (`off`).
   */
  shortcut?: 'document' | 'log' | 'off'
  /** Writes a time. Default: the time of day, with the date when it isn't today, in `dateLocale`. */
  formatTime?: (at: Date) => React.ReactNode
}

/** The log on its own: the state, ⌘Z and the list. `AgentActionLogRun`s go inside. */
export function AgentActionLogRoot({
  runs,
  onRevert,
  onRevertRun,
  onRestore,
  reverted: revertedProp,
  defaultReverted,
  onRevertedChange,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  shortcut = 'document',
  formatTime: formatTimeProp,
  className,
  children,
  ref,
  ...props
}: AgentActionLogRootProps) {
  const labels = useLabels()
  const hydrated = useHydrated()
  const apple = hydrated ? isApple() : true

  const [reverted, setReverted] = useIds(revertedProp, defaultReverted ?? [], onRevertedChange)
  const [expanded, setExpanded] = useIds(expandedProp, () => defaultExpanded ?? (runs[0] ? [runs[0].id] : []), onExpandedChange)
  // In-flight and failed reverts are the log's own business.
  const [busy, setBusy] = React.useState<ReadonlySet<string>>(() => new Set())
  const [failed, setFailed] = React.useState<ReadonlySet<string>>(() => new Set())
  const [busyRuns, setBusyRuns] = React.useState<ReadonlySet<string>>(() => new Set())
  const [message, setMessage] = React.useState('')
  const busyRef = React.useRef(busy)
  busyRef.current = busy

  const revertedSet = React.useMemo(() => new Set(reverted), [reverted])
  const expandedSet = React.useMemo(() => new Set(expanded), [expanded])

  const edit = (set: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>, ids: string[], on: boolean) =>
    set((current) => {
      const next = new Set(current)
      for (const id of ids) on ? next.add(id) : next.delete(id)
      return next
    })

  // The callbacks and labels of the last render, for the async work and the ⌘Z listener.
  const latest = React.useRef({ onRevert, onRevertRun, onRestore, labels, runs, revertedSet })
  latest.current = { onRevert, onRevertRun, onRestore, labels, runs, revertedSet }

  // The toast that says each action was reverted, so restoring it another way closes it.
  const toasts = React.useRef(new Map<string, string>())

  const restore = React.useCallback((actions: AgentAction[], run: AgentRun) => {
    const { onRestore, revertedSet } = latest.current
    const targets = actions.filter((a) => revertedSet.has(a.id) && !busyRef.current.has(a.id))
    if (!onRestore || !targets.length) return
    const ids = targets.map((a) => a.id)
    for (const id of ids) {
      const t = toasts.current.get(id)
      if (t) toast.dismiss(t)
      toasts.current.delete(id)
    }
    edit(setBusy, ids, true)
    const name = targets.length === 1 ? targets[0].label : run.label
    attempt(() => onRestore(targets, run)).then(
      () => {
        setReverted((current) => current.filter((id) => !ids.includes(id)))
        setMessage(latest.current.labels.actionLogRestored(name))
      },
      () => setMessage(latest.current.labels.actionLogRestoreFailed(name)),
    ).finally(() => edit(setBusy, ids, false))
  }, [setReverted])

  /** Says it in a toast, with Undo when the app can restore. */
  const announceReverted = React.useCallback(
    (actions: AgentAction[], run: AgentRun) => {
      const { labels, onRestore } = latest.current
      const id = toast(labels.actionLogToastReverted(actions.length), {
        intent: 'success',
        description: actions.length === 1 ? actions[0].label : run.label,
        action: onRestore
          ? {
              // Picked under the Toaster, from the app's words over this file's defaults.
              label: (l) => withDefaults(l).undo,
              altText: (l) => withDefaults(l).actionLogUndoHint,
              onClick: () => restore(actions, run),
            }
          : undefined,
      })
      for (const a of actions) toasts.current.set(a.id, id)
    },
    [restore],
  )

  const revert = React.useCallback(
    (action: AgentAction, run: AgentRun) => {
      if (action.revertible === false || latest.current.revertedSet.has(action.id) || busyRef.current.has(action.id)) return
      edit(setBusy, [action.id], true)
      edit(setFailed, [action.id], false)
      attempt(() => latest.current.onRevert(action, run)).then(
        () => {
          setReverted((current) => (current.includes(action.id) ? current : [...current, action.id]))
          announceReverted([action], run)
        },
        () => {
          edit(setFailed, [action.id], true)
          setMessage(latest.current.labels.actionLogRevertFailedNamed(action.label))
        },
      ).finally(() => edit(setBusy, [action.id], false))
    },
    [setReverted, announceReverted],
  )

  /** What of a run can still be reverted, newest first. */
  const leftOf = (run: AgentRun) =>
    run.actions.filter((a) => a.revertible !== false && !latest.current.revertedSet.has(a.id) && !busyRef.current.has(a.id)).reverse()

  const revertRun = React.useCallback(
    async (run: AgentRun) => {
      const targets = leftOf(run)
      if (!targets.length) return
      const ids = targets.map((a) => a.id)
      edit(setBusyRuns, [run.id], true)
      edit(setBusy, ids, true)
      edit(setFailed, ids, false)
      const done: AgentAction[] = []
      const failedNow: AgentAction[] = []
      const { onRevertRun, onRevert } = latest.current
      if (onRevertRun) {
        await attempt(() => onRevertRun(run, targets)).then(
          () => done.push(...targets),
          () => failedNow.push(...targets),
        )
        setReverted((current) => [...current, ...done.map((a) => a.id).filter((id) => !current.includes(id))])
        edit(setBusy, ids, false)
      } else {
        // One by one, newest first; each row settles as its own revert does.
        for (const action of targets) {
          await attempt(() => onRevert(action, run)).then(
            () => {
              done.push(action)
              setReverted((current) => (current.includes(action.id) ? current : [...current, action.id]))
            },
            () => failedNow.push(action),
          )
          edit(setBusy, [action.id], false)
        }
      }
      edit(setFailed, failedNow.map((a) => a.id), true)
      edit(setBusyRuns, [run.id], false)
      if (done.length) announceReverted(done, run)
      if (failedNow.length) setMessage(latest.current.labels.actionLogRevertFailedNamed(failedNow.length === 1 ? failedNow[0].label : run.label))
    },
    // leftOf reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setReverted, announceReverted],
  )

  // The run ⌘Z reverts: the newest with anything left to revert.
  const shortcutRun = React.useMemo(() => {
    if (shortcut === 'off') return undefined
    let best: AgentRun | undefined
    for (const run of runs) {
      if (!run.actions.some((a) => a.revertible !== false && !revertedSet.has(a.id))) continue
      if (!best || timeOf(run.at) > timeOf(best.at)) best = run
    }
    return best
  }, [runs, revertedSet, shortcut])

  const sectionRef = React.useRef<HTMLElement>(null)
  const shortcutRef = React.useRef(shortcutRun)
  shortcutRef.current = shortcutRun
  React.useEffect(() => {
    if (shortcut === 'off') return
    const target: HTMLElement | Document | null = shortcut === 'log' ? sectionRef.current : document
    if (!target) return
    const onKeyDown = (e: Event) => {
      const k = e as KeyboardEvent
      if (k.defaultPrevented || k.isComposing || k.repeat || k.shiftKey || k.altKey) return
      if (apple ? !k.metaKey || k.ctrlKey : !k.ctrlKey || k.metaKey) return
      if (k.key.toLowerCase() !== 'z' && k.code !== 'KeyZ') return
      // A field's own undo comes first.
      if (isEditable(k.target)) return
      const run = shortcutRef.current
      if (!run || !leftOf(run).length) return
      k.preventDefault()
      // Open it, so what changed is in view.
      setExpanded((current) => (current.includes(run.id) ? current : [...current, run.id]))
      revertRun(run)
    }
    target.addEventListener('keydown', onKeyDown)
    return () => target.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcut, apple, revertRun, setExpanded])

  const formatTime = React.useCallback(
    (at: AgentActionTime) => {
      const date = toDate(at)
      if (formatTimeProp) return formatTimeProp(date)
      // "Today" is the reader's, so it's decided after hydration; the server writes the date.
      const now = new Date()
      const today = hydrated && date.toDateString() === now.toDateString()
      return new Intl.DateTimeFormat(labels.dateLocale, today ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
    },
    [formatTimeProp, hydrated, labels.dateLocale],
  )

  const value = React.useMemo<LogContextValue>(
    () => ({
      labels,
      stateOf: (action) => (busy.has(action.id) ? 'reverting' : revertedSet.has(action.id) ? 'reverted' : failed.has(action.id) ? 'failed' : 'done'),
      isExpanded: (run) => expandedSet.has(run.id),
      toggle: (run) => setExpanded((current) => (current.includes(run.id) ? current.filter((id) => id !== run.id) : [...current, run.id])),
      revert,
      revertRun: (run) => void revertRun(run),
      restore,
      runBusy: (run) => busyRuns.has(run.id),
      canRestore: !!onRestore,
      shortcutRun: shortcutRun?.id,
      keys: apple ? { show: '⌘Z', aria: 'Meta+Z' } : { show: 'Ctrl Z', aria: 'Control+Z' },
      formatTime,
    }),
    [labels, busy, revertedSet, failed, expandedSet, setExpanded, revert, revertRun, restore, busyRuns, onRestore, shortcutRun, apple, formatTime],
  )

  return (
    <LogContext.Provider value={value}>
      <section
        ref={(node: HTMLElement | null) => {
          sectionRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        data-slot="agent-action-log"
        aria-label={props['aria-labelledby'] ? undefined : labels.actionLog}
        className={cn('w-full overflow-hidden rounded-xl border border-border-default bg-bg-card text-text-default [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]', className)}
        {...props}
      >
        <ol role="list" className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0">
          {children}
        </ol>
        <span role="status" className="sr-only">
          {message}
        </span>
      </section>
    </LogContext.Provider>
  )
}

/* ---------- a run ---------- */

const Chevron = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export interface AgentActionLogRunProps extends Omit<React.ComponentProps<'li'>, 'children'> {
  run: AgentRun
  /** The rows. Default: an `AgentActionLogAction` for each of the run's actions. */
  children?: React.ReactNode
}

/**
 * One run: a header that opens onto its actions, with Revert run (or Restore run once it's all
 * reverted). Other props, `ref` included, go to its `li`.
 */
export function AgentActionLogRun({ run, children, className, ...props }: AgentActionLogRunProps) {
  const log = useLog('AgentActionLogRun')
  const { labels } = log
  const bodyId = `${React.useId()}-actions`
  const open = log.isExpanded(run)
  const busy = log.runBusy(run)

  const states = run.actions.map((a) => (a.revertible === false ? 'fixed' : log.stateOf(a)))
  const count = run.actions.length
  const revertedCount = states.filter((s) => s === 'reverted').length
  const failedCount = states.filter((s) => s === 'failed').length
  const left = states.some((s) => s === 'done' || s === 'failed')
  const revertible = states.some((s) => s !== 'fixed')
  const state = revertedCount === 0 ? 'done' : revertedCount === count ? 'reverted' : 'partial'

  const shortcut = log.shortcutRun === run.id && !busy
  // Revert run while anything is left; Restore run once nothing is (with onRestore); else it stays, done.
  const button = !revertible ? null : left || busy ? (
    <Button
      variant="secondary"
      size="xs"
      loading={busy}
      aria-label={labels.actionLogRevertRunNamed(run.label)}
      aria-keyshortcuts={shortcut ? log.keys.aria : undefined}
      onClick={() => log.revertRun(run)}
    >
      {labels.actionLogRevertRun}
      {shortcut && <KbdGroup keys={log.keys.show} aria-hidden className="ms-0.5" />}
    </Button>
  ) : log.canRestore ? (
    <Button
      variant="tertiary"
      size="xs"
      aria-label={labels.actionLogRestoreRunNamed(run.label)}
      onClick={() => log.restore(run.actions.filter((a) => log.stateOf(a) === 'reverted'), run)}
      className="text-text-muted"
    >
      {labels.actionLogRestoreRun}
    </Button>
  ) : (
    <Button variant="tertiary" size="xs" aria-disabled aria-label={labels.actionLogRevertedAction(run.label)} className="cursor-default text-text-muted">
      {labels.actionLogReverted}
    </Button>
  )

  return (
    <RunContext.Provider value={run}>
      <li data-slot="agent-action-log-run" data-state={state} data-expanded={open || undefined} className={cn('satin-agent-action-log-run min-w-0', className)} {...props}>
        <div className="flex min-h-12 items-center gap-2 py-2 ps-2 pe-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => log.toggle(run)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md p-1 text-start outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]"
          >
            <Chevron className={cn('shrink-0 text-text-muted transition-transform duration-(--duration-base) ease-(--ease-out)', !open && '-rotate-90 rtl:rotate-90')} />
            {run.icon && <span className="flex size-5 shrink-0 items-center justify-center text-text-muted [&_svg]:size-4 [&_svg]:[stroke-width:1.875]">{run.icon}</span>}
            <span className="flex min-w-0 flex-1 flex-col">
              <span data-slot="agent-action-log-run-label" className="truncate text-sm leading-5 font-medium text-text-default">
                {run.label}
              </span>
              <span className="truncate text-sm leading-5 text-text-muted">
                <span>{revertedCount ? labels.actionLogRevertedCount(revertedCount, count) : labels.actionLogActionCount(count)}</span>
                {' · '}
                <time dateTime={toDate(run.at).toISOString()}>{log.formatTime(run.at)}</time>
                {failedCount > 0 && (
                  <>
                    {' · '}
                    <span className="text-text-destructive">{labels.actionLogFailedCount(failedCount)}</span>
                  </>
                )}
              </span>
            </span>
          </button>
          {button}
        </div>
        {/* The Accordion's motion (satin-expand): the rows open down from under the header.
            Closed, they leave tab order and screen readers at once, while they fold. */}
        <div id={bodyId} data-state={open ? 'open' : 'closed'} inert={!open || undefined} className="satin-expand">
          <div>
            <List size="sm" className="pe-2 pb-2 ps-7">
              {children ?? run.actions.map((action) => <AgentActionLogAction key={action.id} action={action} />)}
            </List>
          </div>
        </div>
      </li>
    </RunContext.Provider>
  )
}

/* ---------- an action ---------- */

const Lock = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-[3px] shrink-0">
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
)
const Warning = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-[3px] shrink-0">
    <path d="M8 5.34V8.3M8 10.66l.01-.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 13.9A5.9 5.9 0 1 0 8 2.1a5.9 5.9 0 0 0 0 11.8Z" stroke="currentColor" strokeWidth="1.25" />
  </svg>
)

// Item types its root as the div it is alone; in the run's List it is an li.
export interface AgentActionLogActionProps extends Omit<React.ComponentProps<'div'>, 'title' | 'children' | 'onClick'> {
  action: AgentAction
  /** Sets the row's state yourself, for a log you drive. Default: the log's. */
  state?: AgentActionState
  /** More under the action's fields: a link to the record, a note. */
  children?: React.ReactNode
}

/**
 * One action, an Item: its icon, what it did, what it changed, the time and its button (Revert,
 * then Restore or Reverted; Try again after a failure). One that can't be reverted says why in
 * the button's place. Other props, `ref` included, go to its `li`.
 */
export function AgentActionLogAction({ action, state: stateProp, children, className, ...props }: AgentActionLogActionProps) {
  const log = useLog('AgentActionLogAction')
  const run = React.useContext(RunContext)
  if (!run) throw new Error('AgentActionLogAction must be inside AgentActionLogRun')
  const { labels } = log
  const state = stateProp ?? log.stateOf(action)
  const fixed = action.revertible === false

  // One button that changes its words, so focus stays on it through the whole revert.
  const button = fixed ? null : state === 'reverted' ? (
    log.canRestore ? (
      <Button variant="tertiary" size="xs" aria-label={labels.actionLogRestoreAction(action.label)} onClick={() => log.restore([action], run)} className="-my-0.5 text-text-muted">
        {labels.actionLogRestore}
      </Button>
    ) : (
      // Done, it keeps its place and the focus, and does nothing more.
      <Button variant="tertiary" size="xs" aria-disabled aria-label={labels.actionLogRevertedAction(action.label)} className="-my-0.5 cursor-default text-text-muted">
        {labels.actionLogReverted}
      </Button>
    )
  ) : (
    <Button
      variant="tertiary"
      size="xs"
      loading={state === 'reverting'}
      aria-label={state === 'failed' ? labels.actionLogRetryAction(action.label) : labels.actionLogRevertAction(action.label)}
      onClick={() => log.revert(action, run)}
      className="-my-0.5"
    >
      {state === 'failed' ? labels.actionLogRetry : labels.actionLogRevert}
    </Button>
  )

  const below = (
    <>
      {action.changes?.length ? <AgentSuggestionChanges changes={action.changes} className="text-sm [&>div]:min-h-5" /> : null}
      {fixed && (
        <p data-slot="agent-action-log-reason" className="m-0 flex gap-1.5 text-sm leading-5 text-text-muted">
          <Lock />
          <span>
            {action.reason ? (
              <>
                <span className="sr-only">{labels.actionLogCantRevert}: </span>
                {action.reason}
              </>
            ) : (
              labels.actionLogCantRevert
            )}
          </span>
        </p>
      )}
      {state === 'failed' && (
        <p data-slot="agent-action-log-error" className="m-0 flex gap-1.5 text-sm leading-5 text-text-destructive">
          <Warning />
          <span>{labels.actionLogRevertFailed}</span>
        </p>
      )}
      {children}
    </>
  )
  const hasBelow = !!action.changes?.length || fixed || state === 'failed' || children != null

  return (
    <Item
      size="sm"
      data-slot="agent-action-log-action"
      data-state={state}
      data-revertible={fixed ? 'false' : undefined}
      media={action.icon ? <span className="flex h-5 w-4 items-center justify-center text-text-muted [&_svg]:size-4 [&_svg]:[stroke-width:1.875]">{action.icon}</span> : undefined}
      title={<span data-slot="agent-action-log-action-label">{action.label}</span>}
      // The time sits in the text column, so the buttons on the right line up whatever they say.
      description={
        action.description != null || action.at != null ? (
          <>
            {action.description}
            {action.description != null && action.at != null ? ' · ' : null}
            {action.at != null ? <time dateTime={toDate(action.at).toISOString()}>{log.formatTime(action.at)}</time> : null}
          </>
        ) : undefined
      }
      actions={button}
      className={cn('satin-agent-action items-start', className)}
      {...props}
    >
      {hasBelow ? <div className="flex flex-col gap-1.5">{below}</div> : undefined}
    </Item>
  )
}

/* ---------- the whole log ---------- */

export interface AgentActionLogProps extends Omit<AgentActionLogRootProps, 'children'> {}

/**
 * The log from `runs`: each run's header and its actions, Revert on each, Revert run and ⌘Z
 * for the newest. Other props, `ref` included, go to the `section`.
 */
export function AgentActionLog({ runs, ...props }: AgentActionLogProps) {
  return (
    <AgentActionLogRoot runs={runs} {...props}>
      {runs.map((run) => (
        <AgentActionLogRun key={run.id} run={run} />
      ))}
    </AgentActionLogRoot>
  )
}
