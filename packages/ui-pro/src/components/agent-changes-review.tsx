'use client'

import * as React from 'react'
import { flushSync } from 'react-dom'
import { AgentSuggestionChangeValue, type AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import { Button, type ButtonProps } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'

/**
 * ReviewableChanges: the fields an agent wants to change, each accepted or rejected on its own
 * before any of them is applied. It takes the same `changes` as AgentSuggestionChanges. Each
 * change is a bordered card: the field's name on top, then the old value struck through, an
 * arrow and the new one, then (when the change has a `source`) a preview of where it comes from:
 * a logo, "Transcription" and the line it rests on. At the card's bottom right, Dismiss (X) and
 * Accept (a green check and "Accept"), both bordered xs buttons; or a Checkbox before the name
 * (`control="checkbox"`).
 * Under the cards: Accept all, and Apply, which counts what it will apply ("Apply 2 changes").
 * Put it in an AgentSuggestion as its body, without the card's own `actions`.
 *
 * - A card is pending until it's decided. Accept is a toggle button (`aria-pressed`): pressed, it
 *   takes its pressed fill; pressing it again makes the card pending. Dismiss (X) rejects the
 *   change and takes the card out: it slides 32px to the start and fades over --duration-slow,
 *   then the cards under it move up into its place with a transform over --duration-base (the
 *   panel's edge follows at the end; no height animates).
 *   Under reduced motion the card simply goes. Focus moves to the next card's Accept, or to the
 *   footer when no card is left below. The UI has no way back for a dismissed card; the app can
 *   bring it back by setting its decision to `pending` in a controlled `value`.
 * - With `control="checkbox"`, a checked box accepts and a cleared one rejects; the card stays,
 *   its new value fades to text/muted (a Badge loses its colour), and checking it again takes it
 *   back.
 * - Apply calls `onApply` with the accepted changes only, in order. Return a promise and the
 *   cards lock and Apply shows a Spinner until it settles (`applying`); then it says Applied, each
 *   applied card gets a check and the rest fade (`applied`). If it rejects, the cards unlock for
 *   another try; the error is yours to show. `status` sets the stage yourself.
 * - The value is `{ [id]: 'pending' | 'accepted' | 'rejected' }`, by each change's `id` (or its
 *   place, "0", "1", … when it has none); controlled with `value` and `onValueChange`, or not,
 *   with `defaultValue`. For a new set of changes, give the component a new `key`.
 * - Each card is a `role="group"` named by its field; its buttons are named after it ("Accept
 *   Stage change", "Dismiss Stage change"). A dismissed card, Accept all, applying and applied
 *   are read out from a polite live region.
 *
 * Parts, to put Apply in the card's `actions` row or add buttons of your own:
 * `ReviewableChangesRoot` (around the whole AgentSuggestion) › `ReviewableChangesList`,
 * `ReviewableChangesAcceptAll`, `ReviewableChangesApply`. Other props on ReviewableChanges and
 * ReviewableChangesRoot, `ref` included, go to the root `div`.
 */

/** The words field-level review says on its own. They join SatinLabels, so the app translates them there. */
export const agentChangesReviewLabels = {
  /** A card's Accept button, or its checkbox: "Accept Stage change". `field` is the change's `label`, or its `field` when that's a string. */
  acceptFieldChange: (field: string) => `Accept ${field} change`,
  /** The visible text on a card's Accept button; its name stays `acceptFieldChange`'s. */
  acceptFieldChangeText: 'Accept',
  /** A card's Dismiss (X) button: "Dismiss Stage change". */
  rejectFieldChange: (field: string) => `Dismiss ${field} change`,
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
  /** Read out when Dismiss takes a card out of the list: "Value change dismissed". */
  fieldChangeRejected: (field: string) => `${field} change dismissed`,
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
  /** Where the change comes from, drawn as a preview under it: "Transcription" and the line it rests on. */
  source?: ReviewableChangeSource
}

/** A change's source: a 16px logo, what it is, and the passage the agent read, shown as a quote. */
export interface ReviewableChangeSource {
  /** A 16px logo: the app the source lives in. */
  icon?: React.ReactNode
  /** What the source is: "Transcription", "Email from Tara". */
  label: React.ReactNode
  /** The passage, without quotation marks; it's set in a `q`, which adds them. */
  quote?: React.ReactNode
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

/* ---------- reduced motion ---------- */

const REDUCED = '(prefers-reduced-motion: reduce)'
const subscribeMotion = (onChange: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const list = window.matchMedia(REDUCED)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}
const useReducedMotion = () =>
  React.useSyncExternalStore(
    subscribeMotion,
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED).matches,
    () => false,
  )

// The swipe is --duration-slow and the gap closes in --duration-base; these only stop a wait
// whose transitionend never comes (a hidden tab, a transition the app turned off).
const SWIPE_MS = 400
const CLOSE_MS = 350

const ROW = '[data-slot="reviewable-change"]'
const FOOTER = '[data-slot="reviewable-changes-accept-all"]:not(:disabled), [data-slot="reviewable-changes-apply"]:not(:disabled)'

/* ---------- the root ---------- */

interface ReviewContextValue {
  changes: ReviewableChange[]
  keys: string[]
  value: ReviewableChangesValue
  decide: (key: string, decision: ReviewDecision) => void
  /** Rejects a row from its X: focus moves on, the row swipes out, the rest close the gap. */
  reject: (key: string, name: string, row: HTMLElement | null) => void
  /** Rows swiping out: still drawn, already rejected. */
  leaving: ReadonlySet<string>
  /** After a row's swipe: moves the rows under it up, then lets it go. */
  closeGap: (key: string, row: HTMLElement | null) => void
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
  /** `buttons`: Accept and Dismiss on each card. `checkbox`: a Checkbox before each card's name, checked to accept. */
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
  ref,
  ...props
}: ReviewableChangesRootProps) {
  const labels = useLabels()
  const alive = React.useRef(true)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [leaving, setLeaving] = React.useState<ReadonlySet<string>>(() => new Set())
  const [inner, setInner] = React.useState<ReviewableChangesValue>(() => defaultValue ?? {})
  const value = valueProp ?? inner
  const [phase, setPhase] = React.useState<ReviewableChangesStatus>('review')
  const status = statusProp ?? phase
  const [message, setMessage] = React.useState<React.ReactNode>(null)

  const keys = React.useMemo(() => changes.map((c, i) => c.id ?? String(i)), [changes])
  const accepted = changes.filter((_, i) => value[keys[i]] === 'accepted')

  // The latest of everything, for callbacks that outlive a render.
  const latest = React.useRef({ value, keys, accepted, status, reduced, control, controlled: valueProp !== undefined, onValueChange, onApply })
  latest.current = { value, keys, accepted, status, reduced, control, controlled: valueProp !== undefined, onValueChange, onApply }

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
    const { status: now, value: decisions, keys: all, control: kind } = latest.current
    if (now !== 'review') return
    // With buttons a rejected row has left the list, so Accept all leaves it out.
    const open = kind === 'buttons' ? all.filter((k) => decisions[k] !== 'rejected') : all
    setValue({ ...decisions, ...Object.fromEntries(open.map((k) => [k, 'accepted' as const])) })
    setMessage(labels.allFieldChangesAccepted)
  }, [setValue, labels])

  const reject = React.useCallback(
    (key: string, name: string, row: HTMLElement | null) => {
      if (latest.current.status !== 'review') return
      // Focus first, while the X still has it: the next row's Accept, else the footer, else the row above.
      const rows = [...(rootRef.current?.querySelectorAll<HTMLElement>(`${ROW}:not([data-leaving])`) ?? [])]
      const at = row ? rows.indexOf(row) : -1
      const control = (r?: HTMLElement) =>
        r?.querySelector<HTMLElement>('[data-decision="accept"]:not(:disabled)') ?? r?.querySelector<HTMLElement>('button:not(:disabled)')
      const next = control(rows.slice(at + 1).find((r) => control(r))) ?? rootRef.current?.querySelector<HTMLElement>(FOOTER) ?? control(rows.slice(0, Math.max(at, 0)).reverse().find((r) => control(r)))
      next?.focus()
      setValue({ ...latest.current.value, [key]: 'rejected' })
      setMessage(labels.fieldChangeRejected(name))
      if (!latest.current.reduced) setLeaving((s) => new Set(s).add(key))
    },
    [setValue, labels],
  )

  // One gap closes at a time, so two quick rejects never pull the same rows two ways.
  const gaps = React.useRef<Promise<void>>(Promise.resolve())
  const closeGap = React.useCallback((key: string, row: HTMLElement | null) => {
    const release = () => setLeaving((s) => {
      const next = new Set(s)
      next.delete(key)
      return next
    })
    gaps.current = gaps.current.then(
      () =>
        new Promise<void>((resolve) => {
          const root = rootRef.current
          const list = row?.parentElement
          if (!alive.current || !root || !row || !list) {
            if (alive.current) release()
            return resolve()
          }
          // Everything after the row, up to the root: the rows under it and the footer.
          const followers: HTMLElement[] = []
          for (let node: Element | null = row; node && node !== root; node = node.parentElement) {
            for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
              if (sib instanceof HTMLElement && !sib.hasAttribute('data-leaving')) followers.push(sib)
            }
          }
          const shift = row.offsetHeight + (parseFloat(getComputedStyle(list).rowGap) || 0)
          let done = false
          const finish = () => {
            if (done) return
            done = true
            clearTimeout(timer)
            followers[0]?.removeEventListener('transitionend', onEnd)
            // The row goes and the transforms go in the same frame, so nothing jumps but the card's edge.
            if (alive.current) flushSync(release)
            for (const f of followers) {
              f.classList.remove('satin-changes-review-shift')
              f.style.transform = ''
            }
            resolve()
          }
          const onEnd = (e: TransitionEvent) => {
            if (e.target === followers[0] && e.propertyName === 'transform') finish()
          }
          const timer = setTimeout(finish, followers.length ? CLOSE_MS : 0)
          if (!followers.length) return
          followers[0].addEventListener('transitionend', onEnd)
          for (const f of followers) f.classList.add('satin-changes-review-shift')
          void root.offsetHeight
          for (const f of followers) f.style.transform = `translateY(${-shift}px)`
        }),
    )
  }, [])

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
    () => ({ changes, keys, value, decide, reject, leaving, closeGap, acceptAll, apply, status, acceptedCount, control, labels }),
    [changes, keys, value, decide, reject, leaving, closeGap, acceptAll, apply, status, acceptedCount, control, labels],
  )

  return (
    <ReviewContext.Provider value={context}>
      <div
        ref={(node: HTMLDivElement | null) => {
          rootRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        data-slot="reviewable-changes"
        data-status={status} data-control={control} className={cn('flex flex-col gap-3', className)} {...props}>
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
  const { value, decide, reject, leaving, closeGap, status, control, labels } = useReview('ReviewableChangesList')
  const fieldId = React.useId()
  const rowRef = React.useRef<HTMLDivElement>(null)
  const decision = value[id] ?? 'pending'
  const isLeaving = control === 'buttons' && leaving.has(id)

  // Hand the row to closeGap once its swipe is over: on transitionend, or after SWIPE_MS at most.
  const handed = React.useRef(false)
  const handOff = () => {
    if (handed.current) return
    handed.current = true
    closeGap(id, rowRef.current)
  }
  React.useEffect(() => {
    if (!isLeaving) {
      handed.current = false
      return
    }
    const timer = setTimeout(() => {
      if (handed.current) return
      handed.current = true
      closeGap(id, rowRef.current)
    }, SWIPE_MS)
    return () => clearTimeout(timer)
  }, [isLeaving, id, closeGap])
  const name = change.label ?? (typeof change.field === 'string' ? change.field : String(index + 1))
  const locked = status !== 'review'
  const applied = status === 'applied'

  // With buttons, a rejected row has left the list.
  if (control === 'buttons' && decision === 'rejected' && !isLeaving) return null

  return (
    <div
      ref={rowRef}
      role="group"
      aria-labelledby={fieldId}
      data-slot="reviewable-change"
      data-state={decision}
      data-leaving={isLeaving ? '' : undefined}
      inert={isLeaving || undefined}
      className="satin-changes-review-row flex flex-col gap-2 rounded-lg border border-border-default bg-component-changes-review-card-bg p-3"
      onTransitionEnd={(e) => {
        if (isLeaving && e.target === e.currentTarget && e.propertyName === 'opacity') handOff()
      }}
    >
      <div className="flex items-center gap-2">
        {control === 'checkbox' && (
          <Checkbox
            checked={decision === 'accepted'}
            disabled={locked}
            aria-label={labels.acceptFieldChange(name)}
            onCheckedChange={(on) => decide(id, on === true ? 'accepted' : 'rejected')}
          />
        )}
        <span id={fieldId} className="min-w-0 text-sm leading-4 font-medium tracking-normal text-text-default">
          {change.field}
        </span>
      </div>
      <AgentSuggestionChangeValue from={change.from} to={change.to} className="flex-wrap gap-y-1" />
      {change.source && <ReviewableChangeSourcePreview source={change.source} />}
      {applied && <span className="sr-only">{decision === 'accepted' ? labels.fieldChangeApplied : labels.fieldChangeNotApplied}</span>}
      {/* Once applied, only an applied card keeps the row, for its check. */}
      {control === 'buttons' && !(applied && decision !== 'accepted') && (
        <div className="flex min-h-6 items-center justify-end gap-1">
          {applied ? (
            <span className="grid size-6 place-items-center text-status-green-fg">
              <CheckGlyph className="size-icon-size-sm" />
            </span>
          ) : (
            <>
              <Button
                variant="secondary"
                size="xs"
                iconOnly
                data-decision="reject"
                aria-label={labels.rejectFieldChange(name)}
                disabled={locked}
                className="satin-changes-review-toggle"
                onClick={() => reject(id, name, rowRef.current)}
              >
                <XGlyph />
              </Button>
              <Button
                variant="secondary"
                size="xs"
                data-decision="accept"
                aria-pressed={decision === 'accepted'}
                aria-label={labels.acceptFieldChange(name)}
                disabled={locked}
                className="satin-changes-review-toggle"
                onClick={() => decide(id, decision === 'accepted' ? 'pending' : 'accepted')}
              >
                <CheckGlyph />
                {labels.acceptFieldChangeText}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Where a change comes from: the app's logo, what it is ("Transcription") and the passage, as a quote. */
function ReviewableChangeSourcePreview({ source }: { source: ReviewableChangeSource }) {
  return (
    <div
      data-slot="reviewable-change-source"
      className="flex flex-col gap-2 rounded-xl border border-border-default bg-component-changes-review-source-bg p-3 [box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]"
    >
      <span className="flex min-w-0 items-center gap-2">
        {source.icon && <span className="grid size-4 shrink-0 place-items-center overflow-clip rounded-xs [&>*]:size-4">{source.icon}</span>}
        <span className="truncate text-sm leading-4 font-medium tracking-normal text-text-default">{source.label}</span>
      </span>
      {source.quote != null && <q className="text-sm text-text-muted">{source.quote}</q>}
    </div>
  )
}

export interface ReviewableChangesListProps extends React.ComponentProps<'div'> {}

/** The cards, one `role="group"` per change. Other props, `ref` included, go to its `div`. */
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
 * The cards, then Accept all and Apply on the right, 4px further down as in AgentSuggestion's
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
