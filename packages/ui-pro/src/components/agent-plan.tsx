'use client'

import * as React from 'react'
import { AgentLoading, type AgentLoadingIndicator, type Glimmer } from '@uisatin/ui/agent-loading'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { DropdownMenu, DropdownMenuItem } from '@uisatin/ui/dropdown'
import { Input } from '@uisatin/ui/input'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'

/**
 * AgentPlan: the steps an agent proposes before it acts. The person edits the plan, then Run;
 * the steps tick off as the agent works through them.
 *
 * A card on the DecisionCard's surface (bg/popover, border/default, radius-2xl, shadow-xs):
 * the title and a muted line under it ("3 steps", "Step 2 of 3"), the steps, then Run.
 *
 * - `draft`: each step is a row with a grip, a Checkbox (unchecked leaves the step out of the
 *   run), its label and detail, the tool as a Badge, and a ⋯ menu: Edit renames it in place,
 *   Move up and Move down reorder it. Drag the grip, or press Alt+↑ / Alt+↓ anywhere in the
 *   row, to move it; its new place is read out. Run plan is disabled while no step is left in.
 * - `running`, `failed`, `done`: read-only, drawn like Thinking's open steps: a rail, then each
 *   step 8px apart with a 14px icon, the label in text/default and the tool and detail muted.
 *   The current step is an AgentLoading: the mark playing and its label shimmering. A finished
 *   step's check fades in. A failed step shows `error` and Retry / Skip under it.
 * - Who runs the plan is the app: `onRun` gets the steps left in, and `status` and
 *   `currentStep` (the running or failed step's id) say how far it got. Steps before
 *   `currentStep` are done, the ones after it wait. Skip marks the step `skipped` through
 *   `onStepsChange`, then calls `onSkip` so the app moves on.
 * - One polite live region reads out each step as it finishes ("Find open slots, done"), a
 *   failure, and the end ("3 steps done"). When a button that had focus goes away (Run, Retry,
 *   Skip, Stop), focus moves to the list instead of the page.
 *
 * Steps are controlled (`steps` + `onStepsChange`) or not (`defaultSteps`).
 *
 * Parts, for a plan of your own: `AgentPlanRoot` › `AgentPlanHeader`, `AgentPlanSteps`,
 * `AgentPlanActions`. Other props on AgentPlan and AgentPlanRoot, `ref` included, go to the
 * card's `div`.
 */

/** The words the Agent plan says on its own. They join SatinLabels, so the app translates them there. */
export const agentPlanLabels = {
  /** The title when the plan has none, and the name of its list of steps. */
  agentPlan: 'Plan',
  runPlan: 'Run plan',
  retryStep: 'Retry',
  /** In a step's ⋯ menu. */
  editStep: 'Edit',
  moveStepUp: 'Move up',
  moveStepDown: 'Move down',
  /** A step's ⋯ button. */
  stepOptions: (step: string) => `Options for ${step}`,
  /** The field that renames a step: "Step 2". */
  stepName: (position: number) => `Step ${position}`,
  /** Under the title of a draft: "3 steps", or "2 of 3 steps" when one is left out. */
  planStepCount: (count: number, total: number) =>
    count === total ? (total === 1 ? '1 step' : `${total} steps`) : `${count} of ${total} steps`,
  /** Under the title while the plan runs: "Step 2 of 3". */
  planProgress: (position: number, count: number) => `Step ${position} of ${count}`,
  /** Under the title once every step has run, and read out then. */
  planDone: (count: number) => (count === 1 ? '1 step done' : `${count} steps done`),
  /** Where a step is, for screen readers beside its hidden icon; `skipped` also shows beside it. */
  stepStatus: (status: 'pending' | 'running' | 'done' | 'failed' | 'skipped') =>
    ({ pending: 'Not started', running: 'In progress', done: 'Done', failed: 'Failed', skipped: 'Skipped' })[status],
  /** Read out as a step finishes. */
  stepDone: (step: string) => `${step}, done`,
  /** Read out when a step fails. */
  stepFailed: (step: string) => `${step}, failed`,
}

type AgentPlanLabels = typeof agentPlanLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends AgentPlanLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...agentPlanLabels, ...labels }), [labels])
}

/* ---------- types ---------- */

export interface AgentPlanStep {
  /** Stable and unique: it keys the row, and `currentStep` names the step by it. */
  id: string
  /** What the step does, in a few words. The person can rename it while the plan is a draft. */
  label: string
  /** More on the step: a line under the label in a draft, muted beside it once the plan runs (what the step found, say). */
  detail?: React.ReactNode
  /** The tool or app the step uses: a Badge in a draft, muted before the detail once the plan runs. */
  tool?: string
  /** `false` keeps the step as the agent wrote it: it can't be renamed, left out or moved (other steps still move past it). */
  editable?: boolean
  /** Left out of the run: unchecked in the draft, or skipped after it failed. */
  skipped?: boolean
}

/** Where the plan is: being edited, running, stopped at a failed step, or finished. */
export type AgentPlanStatus = 'draft' | 'running' | 'failed' | 'done'

/** Where one step is, worked out from `status` and `currentStep`. */
export type AgentPlanStepState = 'draft' | 'pending' | 'running' | 'done' | 'failed' | 'skipped'

/* ---------- context ---------- */

interface PlanContextValue {
  steps: AgentPlanStep[]
  setSteps: (steps: AgentPlanStep[]) => void
  status: AgentPlanStatus
  currentStep?: string
  /** The steps that run, in order. */
  included: AgentPlanStep[]
  stateOf: (index: number) => AgentPlanStepState
  run: () => void
  stop?: () => void
  retry?: (step: AgentPlanStep) => void
  skip?: (step: AgentPlanStep) => void
  error?: React.ReactNode
  indicator: AgentLoadingIndicator
  glimmer: Glimmer
  labels: ReturnType<typeof useLabels>
  titleId: string
  errorId: string
  setHasHeader: (has: boolean) => void
  announce: (text: string) => void
  /** Set once the plan has rendered: checks that appear after it fade in. */
  mounted: React.RefObject<boolean>
  listRef: React.RefObject<HTMLOListElement | null>
  /** The element focus left of its own accord: no need to bring it back. */
  forgetFocus: () => void
}

const PlanContext = React.createContext<PlanContextValue | null>(null)

function usePlan(part: string) {
  const plan = React.useContext(PlanContext)
  if (!plan) throw new Error(`${part} must be inside AgentPlanRoot`)
  return plan
}

/* ---------- root ---------- */

export interface AgentPlanRootProps extends Omit<React.ComponentProps<'div'>, 'title' | 'onChange' | 'defaultValue'> {
  /** The steps, in order (controlled). */
  steps?: AgentPlanStep[]
  /** The steps to start from (uncontrolled). */
  defaultSteps?: AgentPlanStep[]
  /** Called with every step after a rename, a move, a step left out or back in, or a skip. */
  onStepsChange?: (steps: AgentPlanStep[]) => void
  /** `draft` while the person edits the plan; `running`, `failed` and `done` show it read-only. */
  status?: AgentPlanStatus
  /** The id of the step running, or the one that failed. Steps before it are done. */
  currentStep?: string
  /** Run plan was pressed: run these steps (the ones left in), in this order. */
  onRun?: (steps: AgentPlanStep[]) => void
  /** Shows Stop while the plan runs or waits at a failed step. */
  onStop?: () => void
  /** Shows Retry under the failed step. */
  onRetry?: (step: AgentPlanStep) => void
  /** Shows Skip under the failed step. The step is marked `skipped` first, through `onStepsChange`. */
  onSkip?: (step: AgentPlanStep) => void
  /** Why the current step failed, under it. */
  error?: React.ReactNode
  /** The current step's mark, as on AgentLoading. */
  indicator?: AgentLoadingIndicator
  /** The light across the tetris mark and the label, as on AgentLoading. */
  glimmer?: Glimmer
}

/** The card and its state; the parts go inside. Other props, `ref` included, go to the card's `div`. */
export function AgentPlanRoot({
  steps: stepsProp,
  defaultSteps,
  onStepsChange,
  status = 'draft',
  currentStep,
  onRun,
  onStop,
  onRetry,
  onSkip,
  error,
  indicator = 'tetris',
  glimmer = 'color',
  className,
  children,
  onFocusCapture,
  onBlurCapture,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: AgentPlanRootProps) {
  const labels = useLabels()
  const [inner, setInner] = React.useState<AgentPlanStep[]>(() => defaultSteps ?? [])
  const steps = stepsProp ?? inner
  const onStepsChangeRef = React.useRef(onStepsChange)
  onStepsChangeRef.current = onStepsChange
  const setSteps = React.useCallback((next: AgentPlanStep[]) => {
    setInner(next)
    onStepsChangeRef.current?.(next)
  }, [])

  const included = React.useMemo(() => steps.filter((s) => !s.skipped), [steps])
  const currentIndex = currentStep === undefined ? -1 : steps.findIndex((s) => s.id === currentStep)
  const stateOf = React.useCallback(
    (index: number): AgentPlanStepState => {
      if (status === 'draft') return 'draft'
      if (steps[index]?.skipped) return 'skipped'
      if (status === 'done') return 'done'
      if (currentIndex === -1 || index > currentIndex) return 'pending'
      if (index < currentIndex) return 'done'
      return status === 'failed' ? 'failed' : 'running'
    },
    [status, steps, currentIndex],
  )

  const titleId = React.useId()
  const errorId = `${titleId}-error`
  const [hasHeader, setHasHeader] = React.useState(false)
  const listRef = React.useRef<HTMLOListElement>(null)
  const mounted = React.useRef(false)
  React.useEffect(() => {
    mounted.current = true
  }, [])

  // One polite region for the plan: a step finishing or failing, and the end.
  const [message, setMessage] = React.useState('')
  const last = React.useRef({ status, currentStep })
  React.useEffect(() => {
    const prev = last.current
    last.current = { status, currentStep }
    if (prev.status === status && prev.currentStep === currentStep) return
    const step = (id?: string) => steps.find((s) => s.id === id)
    if (status === 'failed') {
      const failed = step(currentStep)
      if (failed) setMessage(labels.stepFailed(failed.label))
    } else if (status === 'done' && prev.status !== 'done') {
      setMessage(labels.planDone(included.length))
    } else if (status === 'running' && prev.status === 'running' && prev.currentStep !== currentStep) {
      const finished = step(prev.currentStep)
      if (finished && !finished.skipped) setMessage(labels.stepDone(finished.label))
    }
  }, [status, currentStep, steps, included.length, labels])

  // A focused button that goes away with the state it belonged to (Run, Retry, Skip, Stop) would
  // leave focus on the page; it moves to the list instead. Focus the person moved stays put.
  const lastFocused = React.useRef<HTMLElement | null>(null)
  const forgetFocus = React.useCallback(() => {
    lastFocused.current = null
  }, [])
  React.useLayoutEffect(() => {
    const el = lastFocused.current
    if (!el) return
    const active = document.activeElement
    const lost = !active || active === document.body
    if (!el.isConnected && lost) {
      lastFocused.current = null
      listRef.current?.focus()
    } else if (el.isConnected && lost) {
      lastFocused.current = null
    }
  })

  const onRunRef = React.useRef(onRun)
  onRunRef.current = onRun
  const run = React.useCallback(() => {
    if (included.length > 0) onRunRef.current?.(included)
  }, [included])

  const value = React.useMemo<PlanContextValue>(
    () => ({
      steps,
      setSteps,
      status,
      currentStep,
      included,
      stateOf,
      run,
      stop: onStop,
      retry: onRetry,
      skip: onSkip
        ? (step) => {
            setSteps(steps.map((s) => (s.id === step.id ? { ...s, skipped: true } : s)))
            onSkip({ ...step, skipped: true })
          }
        : undefined,
      error,
      indicator,
      glimmer,
      labels,
      titleId,
      errorId,
      setHasHeader,
      announce: setMessage,
      mounted,
      listRef,
      forgetFocus,
    }),
    [steps, setSteps, status, currentStep, included, stateOf, run, onStop, onRetry, onSkip, error, indicator, glimmer, labels, titleId, errorId, forgetFocus],
  )

  return (
    <PlanContext.Provider value={value}>
      <div
        role="group"
        aria-labelledby={ariaLabelledBy ?? (hasHeader && !ariaLabel ? titleId : undefined)}
        aria-label={ariaLabel ?? (hasHeader || ariaLabelledBy ? undefined : labels.agentPlan)}
        data-slot="agent-plan"
        data-status={status}
        className={cn(
          'flex w-full max-w-full flex-col rounded-2xl border border-border-default bg-bg-popover pb-3',
          '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
          className,
        )}
        onFocusCapture={(e) => {
          // A step's ⋯ menu is portaled: its items aren't in the card, and their focus doesn't count.
          if (e.currentTarget.contains(e.target)) lastFocused.current = e.target as HTMLElement
          onFocusCapture?.(e)
        }}
        onBlurCapture={(e) => {
          const to = e.relatedTarget as Node | null
          // Focus going into a portaled menu (a step's ⋯ menu) still counts as in the plan.
          if (to && !e.currentTarget.contains(to) && !(to instanceof Element && to.closest('[data-slot="dropdown-menu"]'))) lastFocused.current = null
          onBlurCapture?.(e)
        }}
        {...props}
      >
        {children}
        <span role="status" className="sr-only">
          {message}
        </span>
      </div>
    </PlanContext.Provider>
  )
}

/* ---------- header ---------- */

export interface AgentPlanHeaderProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** What the plan is for, e.g. "Schedule interviews for 3 shortlisted candidates". Defaults to the `agentPlan` label ("Plan"). */
  title?: React.ReactNode
}

/** The title, and under it how many steps there are or how far the run got. Other props, `ref` included, go to its `div`. */
export function AgentPlanHeader({ title, className, ...props }: AgentPlanHeaderProps) {
  const { status, steps, included, currentStep, labels, titleId, setHasHeader } = usePlan('AgentPlanHeader')
  React.useLayoutEffect(() => {
    setHasHeader(true)
    return () => setHasHeader(false)
  }, [setHasHeader])

  const position = included.findIndex((s) => s.id === currentStep) + 1
  const hint =
    status === 'draft'
      ? labels.planStepCount(included.length, steps.length)
      : status === 'done'
        ? labels.planDone(included.length)
        : position > 0
          ? labels.planProgress(position, included.length)
          : labels.planStepCount(included.length, steps.length)

  return (
    <div data-slot="agent-plan-header" className={cn('flex flex-col gap-0.5 px-3 pt-3 pb-2', className)} {...props}>
      <p id={titleId} className="text-base leading-5 font-medium tracking-normal text-text-default">
        {title ?? labels.agentPlan}
      </p>
      <p className="text-base text-text-muted tabular-nums">{hint}</p>
    </div>
  )
}

/* ---------- steps ---------- */

export interface AgentPlanStepsProps extends React.ComponentProps<'div'> {}

/**
 * The steps as an ordered list: editable rows in a draft, Thinking's steps on a rail once the
 * plan runs. Other props, `ref` included, go to the `div` around the list.
 */
export function AgentPlanSteps({ className, ...props }: AgentPlanStepsProps) {
  const plan = usePlan('AgentPlanSteps')
  const { steps, setSteps, status, stateOf, labels, listRef, announce } = plan
  const draft = status === 'draft'

  // The latest order, so a drag that moves twice before React renders moves from the right place.
  const order = React.useRef(steps)
  order.current = steps
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState<string | null>(null)
  // After a keyboard move, focus goes back to the control it was on (the row was re-placed).
  const refocus = React.useRef<{ id: string; part: string } | null>(null)

  const rowOf = (id: string) =>
    Array.from(listRef.current?.children ?? []).find((el) => (el as HTMLElement).dataset.stepId === id) as HTMLElement | undefined

  React.useLayoutEffect(() => {
    const target = refocus.current
    if (!target) return
    refocus.current = null
    rowOf(target.id)?.querySelector<HTMLElement>(`[data-part="${target.part}"]`)?.focus()
  })

  const move = (from: number, to: number) => {
    const list = order.current
    if (to < 0 || to >= list.length || from === to) return false
    const next = [...list]
    const [step] = next.splice(from, 1)
    next.splice(to, 0, step)
    order.current = next
    setSteps(next)
    return true
  }
  const sayPosition = (id: string) => {
    const list = order.current
    const index = list.findIndex((s) => s.id === id)
    if (index >= 0) announce(labels.positionOf(list[index].label, index + 1, list.length))
  }
  const moveBy = (id: string, by: -1 | 1, part?: string) => {
    const from = order.current.findIndex((s) => s.id === id)
    if (from < 0 || !move(from, from + by)) return
    if (part) refocus.current = { id, part }
    sayPosition(id)
  }

  const onRowKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, step: AgentPlanStep) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    if (e.target instanceof HTMLInputElement || step.editable === false) return
    // Before Radix sees it: Alt+↓ on the ⋯ button would open its menu.
    e.preventDefault()
    const part = (e.target as HTMLElement).closest<HTMLElement>('[data-part]')?.dataset.part
    moveBy(step.id, e.key === 'ArrowUp' ? -1 : 1, part)
  }

  const onGripDown = (e: React.PointerEvent<HTMLElement>, id: string) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(id)
  }
  const onGripMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragging || !listRef.current) return
    const rows = Array.from(listRef.current.children) as HTMLElement[]
    const from = order.current.findIndex((s) => s.id === dragging)
    let to = from
    rows.forEach((row, i) => {
      const box = row.getBoundingClientRect()
      const mid = box.top + box.height / 2
      if (i < from && e.clientY < mid) to = Math.min(to, i)
      if (i > from && e.clientY > mid) to = Math.max(to, i)
    })
    if (to !== from) move(from, to)
  }
  const onGripUp = () => {
    if (dragging) sayPosition(dragging)
    setDragging(null)
  }

  return (
    <div data-slot="agent-plan-steps" data-mode={draft ? 'draft' : 'run'} className={cn(draft ? 'px-2' : 'flex gap-3 px-3 pt-1', className)} {...props}>
      {/* Thinking's rail: 16px wide, a 1px line from rail-edge to rail-center and back. */}
      {!draft && (
        <div aria-hidden className="relative w-4 shrink-0 self-stretch">
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-linear-to-b from-component-rail-edge via-component-rail-center to-component-rail-edge" />
        </div>
      )}
      <ol
        ref={listRef}
        tabIndex={-1}
        aria-label={labels.agentPlan}
        className={cn(
          'flex min-w-0 flex-1 flex-col rounded-md outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          draft ? 'gap-0.5' : 'gap-2',
        )}
      >
        {steps.map((step, i) =>
          draft ? (
            <DraftStep
              key={step.id}
              step={step}
              index={i}
              count={steps.length}
              dragging={dragging === step.id}
              editing={editing === step.id}
              onEdit={(on) => setEditing(on ? step.id : null)}
              onMove={(by) => moveBy(step.id, by)}
              onKeyDown={(e) => onRowKeyDown(e, step)}
              grip={{ onPointerDown: (e) => onGripDown(e, step.id), onPointerMove: onGripMove, onPointerUp: onGripUp, onPointerCancel: onGripUp }}
            />
          ) : (
            <RunStep key={step.id} step={step} state={stateOf(i)} />
          ),
        )}
      </ol>
    </div>
  )
}

/* ---------- a step in a draft ---------- */

function DraftStep({
  step,
  index,
  count,
  dragging,
  editing,
  onEdit,
  onMove,
  onKeyDown,
  grip,
}: {
  step: AgentPlanStep
  index: number
  count: number
  dragging: boolean
  editing: boolean
  onEdit: (on: boolean) => void
  onMove: (by: -1 | 1) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLLIElement>) => void
  grip: Pick<React.ComponentProps<'span'>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'>
}) {
  const { steps, setSteps, labels, forgetFocus } = usePlan('AgentPlanSteps')
  const id = React.useId()
  const editable = step.editable !== false
  const rowRef = React.useRef<HTMLLIElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const editRequested = React.useRef(false)
  const done = React.useRef(false)

  React.useLayoutEffect(() => {
    if (!editing) return
    done.current = false
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const menuButton = () => rowRef.current?.querySelector<HTMLElement>('[data-part="menu"]')
  const finish = (save: boolean, refocus: boolean) => {
    if (done.current) return
    done.current = true
    const label = inputRef.current?.value.trim() ?? ''
    if (save && label && label !== step.label) setSteps(steps.map((s) => (s.id === step.id ? { ...s, label } : s)))
    if (refocus) menuButton()?.focus()
    else forgetFocus()
    onEdit(false)
  }

  return (
    <li
      ref={rowRef}
      data-slot="agent-plan-step"
      data-state="draft"
      data-step-id={step.id}
      data-dragging={dragging || undefined}
      data-skipped={step.skipped || undefined}
      onKeyDownCapture={onKeyDown}
      className={cn(
        'flex items-start gap-2 rounded-md border border-transparent p-1',
        'transition-[background-color,border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
        'satin-hover:bg-action-secondary-bg',
        'data-dragging:border-border-strong data-dragging:bg-bg-popover',
        'data-dragging:[box-shadow:0_4px_6px_-1px_var(--effect-shadow-sm),0_2px_4px_-2px_var(--effect-shadow-sm)]',
      )}
    >
      {/* The grip, for the pointer: the keyboard has Alt+↑/↓, and the ⋯ menu moves it with one tap. */}
      <span
        aria-hidden
        data-part="grip"
        className={cn(
          'flex h-5 w-3 shrink-0 items-center justify-center text-text-subtle',
          editable ? 'cursor-grab touch-none hover:text-text-muted' : 'invisible',
          dragging && 'cursor-grabbing text-text-muted',
        )}
        {...(editable ? grip : {})}
      >
        <svg width="8" height="14" viewBox="0 0 8 14" className="fill-current">
          {[1.25, 6.75, 12.25].map((cy) => (
            <React.Fragment key={cy}>
              <circle cx="1.25" cy={cy} r="1.25" />
              <circle cx="6.25" cy={cy} r="1.25" />
            </React.Fragment>
          ))}
        </svg>
      </span>
      <span className="flex h-5 shrink-0 items-center">
        <Checkbox
          id={id}
          data-part="include"
          checked={!step.skipped}
          disabled={!editable}
          aria-description={editable ? labels.sortableHint : undefined}
          onCheckedChange={(on) => setSteps(steps.map((s) => (s.id === step.id ? { ...s, skipped: on !== true } : s)))}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        {editing ? (
          <Input
            ref={inputRef}
            size="sm"
            aria-label={labels.stepName(index + 1)}
            defaultValue={step.label}
            wrapperClassName="-my-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                finish(true, true)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                finish(false, true)
              }
            }}
            onBlur={() => finish(true, false)}
          />
        ) : (
          <label htmlFor={id} className={cn('text-sm leading-5 break-words', step.skipped ? 'text-text-muted' : 'text-text-default', editable && 'cursor-pointer')}>
            {step.label}
          </label>
        )}
        {step.detail != null && <span className={cn('text-sm text-text-muted', editing && 'mt-1')}>{step.detail}</span>}
      </div>
      {step.tool && (
        <Badge size="sm" variant="outline" className="mt-px">
          {step.tool}
        </Badge>
      )}
      {editable ? (
        <DropdownMenu
          align="end"
          className="w-44"
          onCloseAutoFocus={(e) => {
            // Edit was chosen: focus goes to the field, not back to ⋯.
            if (!editRequested.current) return
            editRequested.current = false
            e.preventDefault()
            inputRef.current?.focus()
          }}
          trigger={
            <Button variant="tertiary" size="xs" iconOnly data-part="menu" aria-label={labels.stepOptions(step.label)} className="-my-0.5 shrink-0 text-text-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="6" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="18" cy="12" r="1.5" />
              </svg>
            </Button>
          }
        >
          <DropdownMenuItem
            label={labels.editStep}
            layout="inline"
            onSelect={() => {
              editRequested.current = true
              onEdit(true)
            }}
          />
          <DropdownMenuItem label={labels.moveStepUp} layout="inline" disabled={index === 0} onSelect={() => onMove(-1)} />
          <DropdownMenuItem label={labels.moveStepDown} layout="inline" disabled={index === count - 1} onSelect={() => onMove(1)} />
        </DropdownMenu>
      ) : (
        <span aria-hidden className="size-6 shrink-0" />
      )}
    </li>
  )
}

/* ---------- a step once the plan runs ---------- */

/** Thinking's task step: a 14px icon, the label in text/default, the rest muted and truncating. */
function RunStep({ step, state }: { step: AgentPlanStep; state: AgentPlanStepState }) {
  const { labels, indicator, glimmer, error, errorId, retry, skip } = usePlan('AgentPlanSteps')
  const current = state === 'running' || state === 'failed'
  const meta =
    state === 'skipped' ? (
      labels.stepStatus('skipped')
    ) : step.tool && step.detail != null ? (
      <>
        {step.tool} · {step.detail}
      </>
    ) : (
      (step.tool ?? step.detail)
    )

  return (
    <li data-slot="agent-plan-step" data-state={state} data-step-id={step.id} aria-current={current ? 'step' : undefined} className="min-w-0">
      {state === 'running' ? (
        // The plan's region reads out progress, so AgentLoading's own status stays quiet. Its 16px
        // mark with 10px after it puts the label where a 14px check and 12px put it.
        <div className="flex min-w-0 items-center">
          <span className="sr-only">{labels.stepStatus('running')}</span>
          <AgentLoading role={undefined} aria-live="off" label={step.label} indicator={indicator} glimmer={glimmer} className="min-w-0 gap-2.5 overflow-hidden" />
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-3 p-1 text-sm">
          <StepIcon state={state} />
          {state !== 'skipped' && <span className="sr-only">{labels.stepStatus(state === 'draft' ? 'pending' : state)}</span>}
          <span className={cn('max-w-full shrink-0 truncate', state === 'done' || state === 'failed' ? 'text-text-default' : 'text-text-muted')}>{step.label}</span>
          {meta != null && <span className="min-w-0 flex-1 truncate text-text-muted">{meta}</span>}
        </div>
      )}
      {state === 'failed' && (error != null || retry || skip) && (
        // Under the label: 4px padding, the 14px icon and 12px.
        <div className="flex flex-col items-start gap-2 ps-[30px] pt-0.5 pb-1">
          {error != null && (
            <p id={errorId} className="text-sm text-text-destructive">
              {error}
            </p>
          )}
          {(retry || skip) && (
            <div className="flex items-center gap-1.5">
              {retry && (
                <Button variant="secondary" size="xs" aria-describedby={error != null ? errorId : undefined} onClick={() => retry(step)}>
                  {labels.retryStep}
                </Button>
              )}
              {skip && (
                <Button variant="tertiary" size="xs" className="text-text-muted" onClick={() => skip(step)}>
                  {labels.skip}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

const ICON = 'size-icon-size-sm shrink-0 [stroke-width:1.875]'

/** The icon before a read-only step, 14px like Thinking's check. */
function StepIcon({ state }: { state: AgentPlanStepState }) {
  if (state === 'done') return <DoneCheck />
  if (state === 'failed')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn(ICON, 'text-status-red-fg')}>
        <path d="M12 7v6M12 17.01l.01-.011" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    )
  if (state === 'skipped')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden className={cn(ICON, 'text-text-muted')}>
        <path d="M7 12h10" />
      </svg>
    )
  // Waiting: an open ring in text/muted.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden className={cn(ICON, 'text-text-muted')}>
      <circle cx="12" cy="12" r="7.5" />
    </svg>
  )
}

/** Thinking's check (iconoir Check, 14px at 1.875, status/green). It fades in when a step finishes, not when a done plan first shows. */
function DoneCheck() {
  const { mounted } = usePlan('AgentPlanSteps')
  const [enter] = React.useState(() => mounted.current)
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-enter={enter || undefined}
      className={cn('satin-agent-plan-check', ICON, 'text-status-green-fg')}
    >
      <path d="M5 13L9 17L19 7" />
    </svg>
  )
}

/* ---------- actions ---------- */

export interface AgentPlanActionsProps extends React.ComponentProps<'div'> {}

/**
 * Run plan in a draft (disabled while no step is left in), Stop while it runs or waits at a
 * failed step (with `onStop`). Children go before the button. Nothing shows once it's done,
 * unless you pass children. Other props, `ref` included, go to its `div`.
 */
export function AgentPlanActions({ className, children, ...props }: AgentPlanActionsProps) {
  const { status, included, run, stop, labels } = usePlan('AgentPlanActions')
  const draft = status === 'draft'
  const canStop = !!stop && (status === 'running' || status === 'failed')
  if (!draft && !canStop && children == null) return null
  return (
    <div data-slot="agent-plan-actions" className={cn('flex items-center justify-end gap-2 px-3 pt-4', className)} {...props}>
      {children}
      {/* One button that changes: pressing Run leaves focus on Stop. */}
      {draft ? (
        <Button key="main" onClick={run} disabled={included.length === 0}>
          {labels.runPlan}
        </Button>
      ) : canStop ? (
        <Button key="main" variant="secondary" onClick={stop}>
          {labels.stop}
        </Button>
      ) : null}
    </div>
  )
}

/* ---------- the common case ---------- */

export interface AgentPlanProps extends AgentPlanRootProps {
  /** What the plan is for, e.g. "Schedule interviews for 3 shortlisted candidates". Defaults to the `agentPlan` label ("Plan"). */
  title?: React.ReactNode
}

/**
 * The plan from props: the title, the steps, and Run plan or Stop. Other props, `ref` included,
 * go to the card's `div`.
 */
export function AgentPlan({ title, ...props }: AgentPlanProps) {
  return (
    <AgentPlanRoot {...props}>
      <AgentPlanHeader title={title} />
      <AgentPlanSteps />
      <AgentPlanActions />
    </AgentPlanRoot>
  )
}
