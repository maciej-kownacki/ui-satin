'use client'

import * as React from 'react'
import { AgentSuggestionChangeValue, type AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import { Button, type ButtonProps } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'

/**
 * ReviewableChanges: the fields an agent wants to change, each accepted or rejected on its own
 * before any of them is applied. It takes the same `changes` as AgentSuggestionChanges and draws
 * each row the same way (the field, the old value struck through, an arrow, the new one), with
 * Accept and Reject at the end of the row, or a Checkbox at its start (`control="checkbox"`).
 * Under the rows: Accept all, and Apply, which counts what it will apply ("Apply 2 changes").
 * Put it in an AgentSuggestion as its body, without the card's own `actions`.
 *
 * - A row is pending until it's decided. Accept and Reject are toggle buttons (`aria-pressed`):
 *   pressing the pressed one makes the row pending again. A checkbox accepts when checked and
 *   rejects when cleared.
 * - A rejected row's new value fades to text/muted (a Badge loses its colour); nothing else moves.
 * - Apply calls `onApply` with the accepted changes only, in order. Return a promise and the
 *   rows lock and Apply shows a Spinner until it settles (`applying`); then it says Applied, each
 *   applied row gets a check and the rest fade (`applied`). If it rejects, the rows unlock for
 *   another try; the error is yours to show. `status` sets the stage yourself.
 * - The value is `{ [id]: 'pending' | 'accepted' | 'rejected' }`, by each change's `id` (or its
 *   place, "0", "1", … when it has none); controlled with `value` and `onValueChange`, or not,
 *   with `defaultValue`. For a new set of changes, give the component a new `key`.
 * - Each row is a `role="group"` named by its field; its buttons are named after it ("Accept
 *   Stage change"). Accept all, applying and applied are read out from a polite live region.
 *
 * Parts, to put Apply in the card's `actions` row or add buttons of your own:
 * `ReviewableChangesRoot` (around the whole AgentSuggestion) › `ReviewableChangesList`,
 * `ReviewableChangesAcceptAll`, `ReviewableChangesApply`. Other props on ReviewableChanges and
 * ReviewableChangesRoot, `ref` included, go to the root `div`.
 */

/** The words field-level review says on its own. They join SatinLabels, so the app translates them there. */
export const agentChangesReviewLabels = {
  /** A row's Accept button, or its checkbox: "Accept Stage change". `field` is the change's `label`, or its `field` when that's a string. */
  acceptFieldChange: (field: string) => `Accept ${field} change`,
  /** A row's Reject button: "Reject Stage change". */
  rejectFieldChange: (field: string) => `Reject ${field} change`,
  /** The Apply button: "Apply 2 changes". `count` picks the plural; `number` is it, formatted. */
  applyFieldChanges: (count: number, number: string) => (count === 0 ? 'Apply changes' : count === 1 ? 'Apply 1 change' : `Apply ${number} changes`),
  /** Read out while Apply runs. */
  applyingFieldChanges: 'Applying changes…',
  /** Read out once they're applied: "2 changes applied". */
  fieldChangesApplied: (count: number, number: string) => (count === 1 ? '1 change applied' : `${number} changes applied`),
  /** The Apply button once it's done, and after each applied row for screen readers. */
  fieldChangeApplied: 'Applied',
  /** After each row that wasn't applied, for screen readers. */
  fieldChangeNotApplied: 'Not applied',
  /** Read out after Accept all. */
  allFieldChangesAccepted: 'All changes accepted',
}

type AgentChangesReviewLabels = typeof agentChangesReviewLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends AgentChangesReviewLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...agentChangesReviewLabels, ...labels }), [labels])
}

/* ---------- types ---------- */

/** One field the agent wants to change: AgentSuggestionChanges' entry, with an id to know it by. */
export interface ReviewableChange extends AgentSuggestionChange {
  /** Names the change in `value`. Without it, the change goes by its place in the list: "0", "1", … */
  id?: string
  /** The field's name as plain text, for the buttons' names, when `field` isn't a string. */
  label?: string
}

/** Where a row stands: not decided yet, accepted or rejected. */
export type ReviewDecision = 'pending' | 'accepted' | 'rejected'

/** Each change's decision, by its id. A change left out is pending. */
export type ReviewableChangesValue = Record<string, ReviewDecision>

/** The whole set: being reviewed, being applied, or applied. */
export type ReviewableChangesStatus = 'review' | 'applying' | 'applied'

/* ---------- glyphs ---------- */

// The Check and the X from Figma on a 16px grid, 1.25 wide (1.09 at the xs button's 14px).
const CheckGlyph = ({ className }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
    <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const XGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M4.5 11.5L8 8M8 8L11.5 4.5M8 8L4.5 4.5M8 8L11.5 11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ---------- the root ---------- */

interface ReviewContextValue {
  changes: ReviewableChange[]
  keys: string[]
  value: ReviewableChangesValue
  decide: (key: string, decision: ReviewDecision) => void
  acceptAll: () => void
  apply: () => Promise<void>
  status: ReviewableChangesStatus
  acceptedCount: number
  control: 'buttons' | 'checkbox'
  labels: ReturnType<typeof useLabels>
}

const ReviewContext = React.createContext<ReviewContextValue | null>(null)

function useReview(part: string) {
  const review = React.useContext(ReviewContext)
  if (!review) throw new Error(`${part} must be inside ReviewableChangesRoot`)
  return review
}

export interface ReviewableChangesRootProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  /** The fields the agent wants to change, as AgentSuggestionChanges takes them; add an `id` to each to key `value` by it. */
  changes: ReviewableChange[]
  /** Each change's decision, by id (controlled). A change left out is pending. */
  value?: ReviewableChangesValue
  /** The decisions to start from (uncontrolled). Everything is pending without it. */
  defaultValue?: ReviewableChangesValue
  /** Called with every decision whenever one changes. */
  onValueChange?: (value: ReviewableChangesValue) => void
  /**
   * Apply: gets the accepted changes only, in their order, and every decision. Return a promise to
   * hold the `applying` stage until it settles; if it rejects, review starts again.
   */
  onApply?: (accepted: ReviewableChange[], value: ReviewableChangesValue) => unknown
  /** Sets the stage yourself; without it, it follows `onApply`. */
  status?: ReviewableChangesStatus
  /** `buttons`: Accept and Reject at the end of each row. `checkbox`: a Checkbox at its start, checked to accept. */
  control?: 'buttons' | 'checkbox'
}

/** The state and the words for the parts inside; renders a `div`. Other props, `ref` included, go to it. */
export function ReviewableChangesRoot({
  changes,
  value: valueProp,
  defaultValue,
  onValueChange,
  onApply,
  status: statusProp,
  control = 'buttons',
  className,
  children,
  ...props
}: ReviewableChangesRootProps) {
  const labels = useLabels()
  const [inner, setInner] = React.useState<ReviewableChangesValue>(() => defaultValue ?? {})
  const value = valueProp ?? inner
  const [phase, setPhase] = React.useState<ReviewableChangesStatus>('review')
  const status = statusProp ?? phase
  const [message, setMessage] = React.useState<React.ReactNode>(null)

  const keys = React.useMemo(() => changes.map((c, i) => c.id ?? String(i)), [changes])
  const accepted = changes.filter((_, i) => value[keys[i]] === 'accepted')

  // The latest of everything, for callbacks that outlive a render.
  const latest = React.useRef({ value, keys, accepted, status, controlled: valueProp !== undefined, onValueChange, onApply })
  latest.current = { value, keys, accepted, status, controlled: valueProp !== undefined, onValueChange, onApply }

  const setValue = React.useCallback((next: ReviewableChangesValue) => {
    if (!latest.current.controlled) setInner(next)
    latest.current.onValueChange?.(next)
  }, [])

  const decide = React.useCallback(
    (key: string, decision: ReviewDecision) => {
      if (latest.current.status !== 'review') return
      setValue({ ...latest.current.value, [key]: decision })
    },
    [setValue],
  )

  const acceptAll = React.useCallback(() => {
    if (latest.current.status !== 'review') return
    setValue({ ...latest.current.value, ...Object.fromEntries(latest.current.keys.map((k) => [k, 'accepted' as const])) })
    setMessage(labels.allFieldChangesAccepted)
  }, [setValue, labels])

  const alive = React.useRef(true)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const busy = React.useRef(false)

  const apply = React.useCallback(async () => {
    const { status: now, accepted: picked, value: decisions, onApply: run } = latest.current
    if (now !== 'review' || busy.current || picked.length === 0) return
    const result = run?.(picked, decisions)
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      busy.current = true
      setPhase('applying')
      // The promise is the app's own, so it sees the error there; here the rows only unlock.
      const ok = await Promise.resolve(result).then(
        () => true,
        () => false,
      )
      busy.current = false
      if (!alive.current) return
      if (!ok) {
        setPhase('review')
        return
      }
    }
    setPhase('applied')
  }, [])

  // Read out each stage as it starts, whether onApply or `status` moved it.
  const shown = React.useRef(status)
  const acceptedCount = accepted.length
  React.useEffect(() => {
    if (shown.current === status) return
    shown.current = status
    const number = new Intl.NumberFormat(labels.dateLocale).format(acceptedCount)
    if (status === 'applying') setMessage(labels.applyingFieldChanges)
    else if (status === 'applied') setMessage(labels.fieldChangesApplied(acceptedCount, number))
    else setMessage(null)
  }, [status, acceptedCount, labels])

  const context = React.useMemo(
    () => ({ changes, keys, value, decide, acceptAll, apply, status, acceptedCount, control, labels }),
    [changes, keys, value, decide, acceptAll, apply, status, acceptedCount, control, labels],
  )

  return (
    <ReviewContext.Provider value={context}>
      <div data-slot="reviewable-changes" data-status={status} data-control={control} className={cn('flex flex-col gap-3', className)} {...props}>
        {children}
        <span role="status" className="sr-only">
          {message}
        </span>
      </div>
    </ReviewContext.Provider>
  )
}

/* ---------- the rows ---------- */

function ReviewableChangeRow({ change, id, index }: { change: ReviewableChange; id: string; index: number }) {
  const { value, decide, status, control, labels } = useReview('ReviewableChangesList')
  const fieldId = React.useId()
  const decision = value[id] ?? 'pending'
  const name = change.label ?? (typeof change.field === 'string' ? change.field : String(index + 1))
  const locked = status !== 'review'
  const applied = status === 'applied'

  return (
    <div
      role="group"
      aria-labelledby={fieldId}
      data-slot="reviewable-change"
      data-state={decision}
      className="satin-changes-review-row flex min-h-6 items-center gap-2"
    >
      {control === 'checkbox' && (
        <Checkbox
          checked={decision === 'accepted'}
          disabled={locked}
          aria-label={labels.acceptFieldChange(name)}
          onCheckedChange={(on) => decide(id, on === true ? 'accepted' : 'rejected')}
        />
      )}
      <span id={fieldId} className="w-[88px] shrink-0 text-text-muted">
        {change.field}
      </span>
      <AgentSuggestionChangeValue from={change.from} to={change.to} className="min-w-0 flex-1 flex-wrap gap-y-1" />
      {applied && <span className="sr-only">{decision === 'accepted' ? labels.fieldChangeApplied : labels.fieldChangeNotApplied}</span>}
      {control === 'buttons' && (
        <div className="ms-auto flex h-6 shrink-0 items-center gap-1">
          {applied ? (
            decision === 'accepted' && (
              <span className="grid size-6 place-items-center text-status-green-fg">
                <CheckGlyph className="size-icon-size-sm" />
              </span>
            )
          ) : (
            <>
              <Button
                variant="tertiary"
                size="xs"
                iconOnly
                data-decision="accept"
                aria-pressed={decision === 'accepted'}
                aria-label={labels.acceptFieldChange(name)}
                disabled={locked}
                className="satin-changes-review-toggle"
                onClick={() => decide(id, decision === 'accepted' ? 'pending' : 'accepted')}
              >
                <CheckGlyph />
              </Button>
              <Button
                variant="tertiary"
                size="xs"
                iconOnly
                data-decision="reject"
                aria-pressed={decision === 'rejected'}
                aria-label={labels.rejectFieldChange(name)}
                disabled={locked}
                className="satin-changes-review-toggle"
                onClick={() => decide(id, decision === 'rejected' ? 'pending' : 'rejected')}
              >
                <XGlyph />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export interface ReviewableChangesListProps extends React.ComponentProps<'div'> {}

/** The rows, one `role="group"` per change. Other props, `ref` included, go to its `div`. */
export function ReviewableChangesList({ className, ...props }: ReviewableChangesListProps) {
  const { changes, keys } = useReview('ReviewableChangesList')
  return (
    <div data-slot="reviewable-changes-list" className={cn('flex flex-col gap-2 text-base', className)} {...props}>
      {changes.map((change, i) => (
        <ReviewableChangeRow key={keys[i]} change={change} id={keys[i]} index={i} />
      ))}
    </div>
  )
}

/* ---------- the buttons ---------- */

export interface ReviewableChangesAcceptAllProps extends Omit<ButtonProps, 'asChild' | 'loading'> {}

/**
 * Accepts every change. Gone once they're applied. Its text is `acceptAll` from SatinLabels
 * unless you pass children. Other props, `ref` included, go to the Button.
 */
export function ReviewableChangesAcceptAll({ variant = 'secondary', children, onClick, ...props }: ReviewableChangesAcceptAllProps) {
  const { status, acceptAll, labels } = useReview('ReviewableChangesAcceptAll')
  if (status === 'applied') return null
  return (
    <Button
      variant={variant}
      data-slot="reviewable-changes-accept-all"
      disabled={status !== 'review'}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) acceptAll()
      }}
      {...props}
    >
      {children ?? labels.acceptAll}
    </Button>
  )
}

export interface ReviewableChangesApplyProps extends Omit<ButtonProps, 'asChild' | 'loading'> {}

/**
 * Applies the accepted changes: "Apply 2 changes", or your children. Disabled while none is
 * accepted, busy while `applying`; once `applied` it stays in place, says Applied and does
 * nothing, so focus isn't lost. Other props, `ref` included, go to the Button.
 */
export function ReviewableChangesApply({ variant = 'primary', children, className, onClick, ...props }: ReviewableChangesApplyProps) {
  const { status, acceptedCount, apply, labels } = useReview('ReviewableChangesApply')
  const applied = status === 'applied'
  const number = new Intl.NumberFormat(labels.dateLocale).format(acceptedCount)
  return (
    <Button
      variant={applied ? 'tertiary' : variant}
      data-slot="reviewable-changes-apply"
      data-status={status}
      loading={status === 'applying'}
      disabled={status === 'review' && acceptedCount === 0}
      aria-disabled={applied || undefined}
      className={cn(applied && 'pointer-events-none', className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented && status === 'review') void apply()
      }}
      {...props}
    >
      {applied ? (
        <>
          <CheckGlyph />
          {labels.fieldChangeApplied}
        </>
      ) : (
        (children ?? labels.applyFieldChanges(acceptedCount, number))
      )}
    </Button>
  )
}

/* ---------- the common case ---------- */

export interface ReviewableChangesProps extends Omit<ReviewableChangesRootProps, 'children'> {}

/**
 * The rows, then Accept all and Apply on the right, 4px further down as in AgentSuggestion's
 * actions row. Other props, `ref` included, go to the root `div`.
 */
export function ReviewableChanges(props: ReviewableChangesProps) {
  return (
    <ReviewableChangesRoot {...props}>
      <ReviewableChangesList />
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <ReviewableChangesAcceptAll />
        <ReviewableChangesApply />
      </div>
    </ReviewableChangesRoot>
  )
}
