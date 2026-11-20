'use client'

import * as React from 'react'
import { AgentSuggestionChangeValue, type AgentSuggestionChange } from '@uisatin/ui/agent-suggestion'
import { Button } from '@uisatin/ui/button'
import { DecisionCard } from '@uisatin/ui/decision-card'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'

/**
 * ReviewableChanges: the fields an agent wants to change, reviewed one at a time before any of
 * them is applied. It's a DecisionCard (same card, header, step navigator, footer and step
 * motion), with a change as each step:
 *
 * - Header: `title` (the suggestion: "Update the Quanta deal") and `description` under it, with
 *   "‹ 1/3 ›" to move between the changes. Without a `title`, each change's field is the title.
 * - Body: the field's name (under a `title`), the old value struck through, an arrow and the new
 *   one, then (with a `source`) where it comes from: a logo, "Transcription" and the line that
 *   justifies it. Under them, Dismiss (X) and Accept (a green check and "Accept").
 * - Footer, where DecisionCard has Skip and Continue: Accept all, and Apply, which counts what it
 *   will apply ("Apply 2 changes").
 *
 * Accept and Dismiss are toggles (`aria-pressed`). Deciding a change moves to the next one still
 * pending (it slides in as DecisionCard's next question does); once none is pending, focus goes
 * to Apply. Pressing a pressed one makes its change pending again, and stays. A dismissed change's
 * new value fades to text/muted (a Badge loses its colour). The navigator goes back to any change.
 *
 * Apply calls `onApply` with the accepted changes only, in order. Return a promise and the
 * decisions lock and Apply shows a Spinner until it settles (`applying`); if it rejects, they
 * unlock for another try and the error is yours to show. Once applied, the card fades and rises
 * 4px over --duration-base, then `onApplied` fires and the app removes it, as with an
 * `onDismiss`; until then it stays faded out. Under reduced motion it goes at once. Focus, if it
 * was inside, goes to `returnFocus()`, or to the page's body when that gives nothing; "2 changes
 * applied" is read out from a live region on the body, so it's heard after the card is gone.
 * `status` holds the stage yourself.
 *
 * The value is `{ [id]: 'pending' | 'accepted' | 'rejected' }`, by each change's `id` (or its
 * place, "0", "1", … when it has none); controlled with `value` and `onValueChange`, or not, with
 * `defaultValue`. For a new set of changes, give the component a new `key`. Other props, `ref`
 * included, go to the card's `div`.
 */

/** The words field-level review says on its own. They join SatinLabels, so the app translates them there. */
export const agentChangesReviewLabels = {
  /** A change's Accept button: "Accept Stage change". `field` is the change's `label`, or its `field` when that's a string. */
  acceptFieldChange: (field: string) => `Accept ${field} change`,
  /** The visible text on Accept; its name stays `acceptFieldChange`'s. */
  acceptFieldChangeText: 'Accept',
  /** A change's Dismiss (X) button: "Dismiss Stage change". */
  rejectFieldChange: (field: string) => `Dismiss ${field} change`,
  /** The step navigator's buttons. */
  previousFieldChange: 'Previous change',
  nextFieldChange: 'Next change',
  /** The Apply button: "Apply 2 changes". `count` picks the plural; `number` is it, formatted. */
  applyFieldChanges: (count: number, number: string) => (count === 0 ? 'Apply changes' : count === 1 ? 'Apply 1 change' : `Apply ${number} changes`),
  /** Read out while Apply runs. */
  applyingFieldChanges: 'Applying changes…',
  /** Read out as the card leaves once they're applied: "2 changes applied". */
  fieldChangesApplied: (count: number, number: string) => (count === 1 ? '1 change applied' : `${number} changes applied`),
  /** Read out after Accept all. */
  allFieldChangesAccepted: 'All changes accepted',
}

type AgentChangesReviewLabels = typeof agentChangesReviewLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends AgentChangesReviewLabels {}
}

/* ---------- types ---------- */

/** One field the agent wants to change: AgentSuggestionChanges' entry, with an id to know it by. */
export interface ReviewableChange extends AgentSuggestionChange {
  /** Names the change in `value`. Without it, the change goes by its place in the list: "0", "1", … */
  id?: string
  /** The field's name as plain text, for the buttons' names and the title, when `field` isn't a string. */
  label?: string
  /** Where the change comes from: "Transcription" and the line that justifies it. */
  source?: ReviewableChangeSource
}

/** A change's source: a 16px logo, what it is, and the passage that justifies the change, shown as a quote. */
export interface ReviewableChangeSource {
  /** A 16px logo: the app the source lives in. */
  icon?: React.ReactNode
  /** What the source is: "Transcription", "Email from Tara". */
  label: React.ReactNode
  /** The passage, without quotation marks; it's set in a `q`, which adds them. */
  quote?: React.ReactNode
}

/** Where a change stands: not decided yet, accepted or rejected. */
export type ReviewDecision = 'pending' | 'accepted' | 'rejected'

/** Each change's decision, by its id. A change left out is pending. */
export type ReviewableChangesValue = Record<string, ReviewDecision>

/** The whole set: being reviewed, or being applied. Once applied, it leaves (see `onApplied`). */
export type ReviewableChangesStatus = 'review' | 'applying'

export interface ReviewableChangesProps extends Omit<React.ComponentProps<'div'>, 'title' | 'defaultValue' | 'onChange' | 'children'> {
  /** The fields the agent wants to change, as AgentSuggestionChanges takes them; add an `id` to each to key `value` by it. */
  changes: ReviewableChange[]
  /** The suggestion, in the header: "Update the Quanta deal". Without it, each change's field is the title. */
  title?: string
  /** A muted line under the title: "Based on today's call". */
  description?: string
  /** Each change's decision, by id (controlled). A change left out is pending. */
  value?: ReviewableChangesValue
  /** The decisions to start from (uncontrolled). Everything is pending without it. */
  defaultValue?: ReviewableChangesValue
  /** Called with every decision whenever one changes. */
  onValueChange?: (value: ReviewableChangesValue) => void
  /** The change to open on, by its place in `changes`. Defaults to the first. */
  defaultStep?: number
  /**
   * Apply: gets the accepted changes only, in their order, and every decision. Return a promise to
   * hold the `applying` stage until it settles; if it rejects, review starts again.
   */
  onApply?: (accepted: ReviewableChange[], value: ReviewableChangesValue) => unknown
  /**
   * Called once the accepted changes are applied and the card has left: remove it here (it stays
   * faded out until you do). Gets what `onApply` got.
   */
  onApplied?: (accepted: ReviewableChange[], value: ReviewableChangesValue) => void
  /**
   * Where focus goes when the card leaves with focus inside it: the record it updated, the next
   * suggestion. Without it, or when it gives nothing, focus goes to the page's body.
   */
  returnFocus?: () => HTMLElement | null | undefined
  /** Holds the stage yourself; without it, it follows `onApply`. */
  status?: ReviewableChangesStatus
}

/* ---------- glyphs ---------- */

// The Check and the X from Figma on a 16px grid, 1.25 wide (1.09 at the xs button's 14px).
const CheckGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const XGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path d="M4.5 11.5L8 8M8 8L11.5 4.5M8 8L4.5 4.5M8 8L11.5 11.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// The exit is --duration-base; this only ends a wait whose transitionend never comes.
const EXIT_MS = 350

// "2 changes applied" outlives the card it's about, so it's said from a live region on the body:
// one for the page, made on first use, visually hidden.
let announcer: HTMLElement | null = null
function announce(text: string) {
  if (!announcer?.isConnected) {
    announcer = document.createElement('div')
    announcer.setAttribute('role', 'status')
    announcer.setAttribute('data-slot', 'reviewable-changes-announcer')
    Object.assign(announcer.style, { position: 'absolute', width: '1px', height: '1px', margin: '-1px', overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' })
    document.body.append(announcer)
  }
  const node = announcer
  node.textContent = ''
  // A beat after clearing, so the same words twice are read twice.
  setTimeout(() => {
    node.textContent = text
  }, 50)
}

/* ---------- the component ---------- */

/** One change per step of a DecisionCard; see above. Other props, `ref` included, go to the card's `div`. */
export function ReviewableChanges({
  changes,
  title,
  description,
  value: valueProp,
  defaultValue,
  onValueChange,
  defaultStep = 0,
  onApply,
  onApplied,
  returnFocus,
  status: statusProp,
  className,
  ref,
  ...props
}: ReviewableChangesProps) {
  const labels = { ...agentChangesReviewLabels, ...useSatinLabels() }
  const rootRef = React.useRef<HTMLDivElement>(null)
  const alive = React.useRef(true)
  const busy = React.useRef(false)
  const [inner, setInner] = React.useState<ReviewableChangesValue>(() => defaultValue ?? {})
  const value = valueProp ?? inner
  // `closing`: applied, the card fading out; the parts still see `applying`, so nothing unlocks.
  const [phase, setPhase] = React.useState<ReviewableChangesStatus | 'closing'>('review')
  const status: ReviewableChangesStatus = statusProp ?? (phase === 'closing' ? 'applying' : phase)
  const [message, setMessage] = React.useState('')
  const [step, setStep] = React.useState(defaultStep)
  // Where focus goes once the next render is on screen: the new step's Accept, or Apply.
  const focusNext = React.useRef<'accept' | 'apply' | null>(null)
  const fieldId = React.useId()

  const keys = changes.map((c, i) => c.id ?? String(i))
  const accepted = changes.filter((_, i) => value[keys[i]] === 'accepted')
  const at = Math.min(Math.max(step, 0), changes.length - 1)
  const change = changes[at]
  const key = keys[at]
  const decision = value[key] ?? 'pending'
  const name = change ? (change.label ?? (typeof change.field === 'string' ? change.field : String(at + 1))) : ''
  const locked = status !== 'review'
  const number = (n: number) => new Intl.NumberFormat(labels.dateLocale).format(n)

  // The latest of everything, for callbacks that outlive a render.
  const latest = React.useRef({ accepted, value, onApplied, returnFocus, labels })
  latest.current = { accepted, value, onApplied, returnFocus, labels }

  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  React.useEffect(() => {
    const target = focusNext.current
    focusNext.current = null
    const root = rootRef.current
    if (!target || !root) return
    const el = root.querySelector<HTMLElement>(
      target === 'accept' ? '[data-decision="accept"]' : '[data-slot="reviewable-changes-apply"]:not(:disabled)',
    )
    el?.focus()
  })

  // Read out each stage as it starts, whether onApply or `status` moved it.
  const shown = React.useRef(status)
  React.useEffect(() => {
    if (shown.current === status) return
    shown.current = status
    setMessage(status === 'applying' ? labels.applyingFieldChanges : '')
  }, [status, labels.applyingFieldChanges])

  const setValue = (next: ReviewableChangesValue) => {
    if (valueProp === undefined) setInner(next)
    onValueChange?.(next)
  }

  const decide = (next: ReviewDecision) => {
    if (locked) return
    const all = { ...value, [key]: next }
    setValue(all)
    // Pressing a pressed toggle makes the change pending again, and stays.
    if (next === 'pending') return
    // On to the next change still pending, wrapping round; with none left, to Apply.
    const pending = [...keys.slice(at + 1), ...keys.slice(0, at)].find((k) => (all[k] ?? 'pending') === 'pending')
    if (pending) setStep(keys.indexOf(pending))
    focusNext.current = pending ? 'accept' : 'apply'
  }

  const acceptAll = () => {
    if (locked) return
    setValue(Object.fromEntries(keys.map((k) => [k, 'accepted' as const])))
    setMessage(labels.allFieldChangesAccepted)
    focusNext.current = 'apply'
  }

  // Applied: focus moves on, "2 changes applied" goes to the body's live region, the card fades
  // out, then onApplied hands it to the app to remove.
  const close = (picked: ReviewableChange[], decisions: ReviewableChangesValue) => {
    const target = rootRef.current
    const words = latest.current.labels
    setPhase('closing')
    announce(words.fieldChangesApplied(picked.length, number(picked.length)))
    if (!target) return
    let done = false
    const finish = () => {
      if (done || !alive.current) return
      done = true
      if (target.contains(document.activeElement)) {
        const next = latest.current.returnFocus?.()
        if (next) next.focus()
        else (document.activeElement as HTMLElement | null)?.blur()
      }
      target.setAttribute('inert', '')
      latest.current.onApplied?.(picked, decisions)
    }
    target.classList.add('satin-changes-review-exit')
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return finish()
    const timer = setTimeout(finish, EXIT_MS)
    target.addEventListener('transitionend', function onEnd(e) {
      if (e.target !== target || e.propertyName !== 'opacity') return
      target.removeEventListener('transitionend', onEnd)
      clearTimeout(timer)
      finish()
    })
  }

  const apply = async () => {
    const { accepted: picked, value: decisions } = latest.current
    if (locked || busy.current || picked.length === 0) return
    busy.current = true
    const result = onApply?.(picked, decisions)
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      setPhase('applying')
      // The promise is the app's own, so it sees the error there; here the decisions only unlock.
      const ok = await Promise.resolve(result).then(
        () => true,
        () => false,
      )
      if (!alive.current) return
      if (!ok) {
        busy.current = false
        setPhase('review')
        return
      }
    }
    close(picked, decisions)
  }

  const stepped = changes.length > 1
  return (
    <DecisionCard
      ref={(node: HTMLDivElement | null) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      data-slot="reviewable-changes"
      data-status={phase === 'closing' ? 'closing' : status}
      title={title ?? name}
      hint={description}
      step={stepped ? `${at + 1}/${changes.length}` : undefined}
      onPreviousStep={stepped && at > 0 ? () => setStep(at - 1) : undefined}
      onNextStep={stepped && at < changes.length - 1 ? () => setStep(at + 1) : undefined}
      previousStepLabel={labels.previousFieldChange}
      nextStepLabel={labels.nextFieldChange}
      className={className}
      {...props}
      footer={
        <>
          <Button variant="tertiary" data-slot="reviewable-changes-accept-all" className="text-text-muted" disabled={locked} onClick={acceptAll}>
            {labels.acceptAll}
          </Button>
          <Button
            data-slot="reviewable-changes-apply"
            loading={status === 'applying'}
            disabled={status === 'review' && accepted.length === 0}
            onClick={() => void apply()}
          >
            {labels.applyFieldChanges(accepted.length, number(accepted.length))}
          </Button>
          <span role="status" className="sr-only">
            {message}
          </span>
        </>
      }
    >
      {change && (
        // Keyed by the change, so its buttons are new ones and focus on them reads their new names.
        <div
          key={key}
          role={title ? 'group' : undefined}
          aria-labelledby={title ? fieldId : undefined}
          data-slot="reviewable-change"
          data-state={decision}
          className="satin-changes-review-row flex flex-col gap-2 px-3 pb-1 text-base"
        >
          {title && (
            <span id={fieldId} className="text-sm leading-4 text-text-muted">
              {change.field}
            </span>
          )}
          <AgentSuggestionChangeValue from={change.from} to={change.to} className="flex-wrap gap-y-1" />
          {change.source && <SourcePreview source={change.source} />}
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="secondary"
              size="xs"
              iconOnly
              data-decision="reject"
              aria-pressed={decision === 'rejected'}
              aria-label={labels.rejectFieldChange(name)}
              disabled={locked}
              className="satin-changes-review-toggle"
              onClick={() => decide(decision === 'rejected' ? 'pending' : 'rejected')}
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
              onClick={() => decide(decision === 'accepted' ? 'pending' : 'accepted')}
            >
              <CheckGlyph />
              {labels.acceptFieldChangeText}
            </Button>
          </div>
        </div>
      )}
    </DecisionCard>
  )
}

/** Where a change comes from: the app's logo, what it is ("Transcription") and the passage, as a quote. */
function SourcePreview({ source }: { source: ReviewableChangeSource }) {
  return (
    <div
      data-slot="reviewable-change-source"
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border-default bg-component-changes-review-source-bg p-3',
        '[box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {source.icon && <span className="grid size-4 shrink-0 place-items-center overflow-clip rounded-xs [&>*]:size-4">{source.icon}</span>}
        <span className="truncate text-sm leading-4 font-medium tracking-normal text-text-default">{source.label}</span>
      </span>
      {source.quote != null && <q className="text-sm text-text-muted">{source.quote}</q>}
    </div>
  )
}
