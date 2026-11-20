'use client'

import * as React from 'react'
import { AgentLoading, type AgentLoadingIndicator, type Glimmer } from '@uisatin/ui/agent-loading'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Input } from '@uisatin/ui/input'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'

/**
 * AgentPlan: the steps an agent proposes before it acts. The person edits the plan, then Run;
 * the steps tick off as the agent works through them.
 *
 * A card on the DecisionCard's surface (bg/popover, border/default, radius-2xl, shadow-xs):
 * the title, the steps, then Run.
 *
 * - `draft`: each step is its number in a Badge, its label, and its tool (the app's logo and
 *   name) and detail in one muted line under the label. Nothing sits on the right. Drag the
 *   number, or press Alt+↑ / Alt+↓ anywhere in the step, to move it; its new place is read out.
 *   The number shows a grip on hover or keyboard focus, and a dragged step lifts while the others
 *   make room. Pressing a step opens Rename and Remove under it, one step at a time; Esc closes
 *   them. Rename turns the label into a field. Run plan is disabled while the plan is empty.
 * - `running`, `failed`, `done`: read-only, drawn like Thinking's open steps: a rail, then each
 *   step 8px apart with a 14px icon, the label in text/default and the tool and detail muted.
 *   The current step is an AgentLoading: the mark playing and its label shimmering. A finished
 *   step's check fades in. A failed step shows `error` and Retry / Skip under it.
 * - Who runs the plan is the app: `onRun` gets the steps that aren't `skipped`, and `status` and
 *   `currentStep` (the running or failed step's id) say how far it got. Steps before
 *   `currentStep` are done, the ones after it wait. Skip marks the step `skipped` through
 *   `onStepsChange`, then calls `onSkip` so the app moves on.
 * - One polite live region reads out each step as it finishes ("Find open slots, done"), a
 *   failure, and the end ("3 steps done"). When a button that had focus goes away (Run, Retry,
 *   Skip, Stop, a removed step's Remove), focus moves to the next step or the list instead of
 *   the page.
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
  /** Under the open step, beside Remove (the `remove` label). */
  renameStep: 'Rename',
  /** The field that renames a step: "Step 2". */
  stepName: (position: number) => `Step ${position}`,
  /** Read out when a step is removed from a draft. Its Remove is named by `removeItem` ("Remove Draft invites"). */
  stepRemoved: (step: string) => `${step} removed`,
  /** Read out once every step has run. */
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
  /**
   * More on the step. In a draft it shares the muted line under the label with the tool, inside
   * the step's button, so keep it to text (no links or buttons). Once the plan runs it sits muted
   * beside the label (what the step found, say).
   */
  detail?: React.ReactNode
  /** The tool or app the step uses, muted before the detail: under the label in a draft, beside it once the plan runs. */
  tool?: string
  /** The tool's logo or icon, before its name: the app's logo as an `img` (drawn at 16px; give it `alt=""`, the name follows), or an iconoir icon (14px, like a Badge's). */
  toolIcon?: React.ReactNode
  /** `false` keeps the step as the agent wrote it: it can't be renamed, removed or moved (other steps still move past it). */
  editable?: boolean
  /** Skipped after it failed: the run goes on without it, and Run plan leaves it out. */
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
  /** The steps that run, in order: all but the skipped ones. */
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
  /** Called with every step after a rename, a move, a removal, or a skip. */
  onStepsChange?: (steps: AgentPlanStep[]) => void
  /** `draft` while the person edits the plan; `running`, `failed` and `done` show it read-only. */
  status?: AgentPlanStatus
  /** The id of the step running, or the one that failed. Steps before it are done. */
  currentStep?: string
  /** Run plan was pressed: run these steps (all but the skipped ones), in this order. */
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
          lastFocused.current = e.target as HTMLElement
          onFocusCapture?.(e)
        }}
        onBlurCapture={(e) => {
          const to = e.relatedTarget as Node | null
          if (to && !e.currentTarget.contains(to)) lastFocused.current = null
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

/** The title; it names the plan. Other props, `ref` included, go to its `div`. */
export function AgentPlanHeader({ title, className, ...props }: AgentPlanHeaderProps) {
  const { labels, titleId, setHasHeader } = usePlan('AgentPlanHeader')
  React.useLayoutEffect(() => {
    setHasHeader(true)
    return () => setHasHeader(false)
  }, [setHasHeader])

  return (
    <div data-slot="agent-plan-header" className={cn('px-3 pt-3 pb-2', className)} {...props}>
      <p id={titleId} className="text-base leading-5 font-medium tracking-normal text-text-default">
        {title ?? labels.agentPlan}
      </p>
    </div>
  )
}

/* ---------- steps ---------- */

/** A drag on the way: the step, where it started and would land, how far it moved, and the rows as they stood. */
interface Drag {
  id: string
  from: number
  to: number
  dy: number
  startY: number
  mids: number[]
  min: number
  max: number
  slot: number
}

/** A row's transitions without transform: the step under the pointer, or every row the moment a drag lands. */
const STILL: React.CSSProperties = { transitionProperty: 'background-color, border-color, box-shadow' }

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
  const [editing, setEditing] = React.useState<string | null>(null)
  // The step whose Rename and Remove show.
  const [open, setOpen] = React.useState<string | null>(null)
  // This part stays mounted while the plan runs: a plan stopped back into a draft starts closed,
  // and a rename cut short doesn't come back as a field that takes focus.
  if (!draft && (open !== null || editing !== null)) {
    setOpen(null)
    setEditing(null)
  }
  // The control focus goes to once the rows are re-placed: the one it was on after a keyboard
  // move, the next step's button after a removal.
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
  const remove = (id: string) => {
    const list = order.current
    const at = list.findIndex((s) => s.id === id)
    if (at < 0) return
    const next = list.filter((s) => s.id !== id)
    order.current = next
    setSteps(next)
    announce(labels.stepRemoved(list[at].label))
    setOpen(null)
    // Focus goes to the step that took its place, or the one before. With none left, the root
    // moves focus to the list.
    const to = [...next.slice(at), ...next.slice(0, at).reverse()].find((s) => s.editable !== false)
    if (to) refocus.current = { id: to.id, part: 'label' }
  }

  const onRowKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, step: AgentPlanStep) => {
    if (e.key === 'Escape' && open === step.id && !(e.target instanceof HTMLInputElement)) {
      // Closes the step's actions; focus goes back to the step.
      e.preventDefault()
      rowOf(step.id)?.querySelector<HTMLElement>('[data-part="label"]')?.focus()
      setOpen(null)
      return
    }
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    if (e.target instanceof HTMLInputElement || step.editable === false) return
    e.preventDefault()
    const part = (e.target as HTMLElement).closest<HTMLElement>('[data-part]')?.dataset.part
    moveBy(step.id, e.key === 'ArrowUp' ? -1 : 1, part)
  }

  // A drag lifts the step: it follows the pointer (inside the list), the steps it passes slide
  // out of its way, and on release it settles into its slot. The rows are measured once, as they
  // stood when the drag began; the order changes on release, not on the way.
  const [drag, setDrag] = React.useState<Drag | null>(null)
  const dragRef = React.useRef(drag)
  dragRef.current = drag
  // Where the released step was on screen, so it can settle from there into its new place.
  const [drop, setDrop] = React.useState<{ id: string; top: number } | null>(null)

  const onGripDown = (e: React.PointerEvent<HTMLElement>, id: string) => {
    const list = listRef.current
    const from = order.current.findIndex((s) => s.id === id)
    if (e.button !== 0 || !list || from < 0) return
    e.preventDefault()
    const rows = Array.from(list.children) as HTMLElement[]
    const boxes = rows.map((row) => row.getBoundingClientRect())
    const box = boxes[from]
    if (!box) return
    const px = (value: string) => parseFloat(value) || 0
    const own = getComputedStyle(rows[from])
    setDrag({
      id,
      from,
      to: from,
      dy: 0,
      startY: e.clientY,
      mids: boxes.map((b) => b.top + b.height / 2),
      min: boxes[0].top - box.top,
      max: boxes[boxes.length - 1].bottom - box.bottom,
      // What the others slide by: the step's height with its margins and the list's gap.
      slot: box.height + px(own.marginTop) + px(own.marginBottom) + px(getComputedStyle(list).rowGap),
    })
  }

  // The drag listens on the window, not through pointer capture, so it ends wherever the pointer goes.
  const act = React.useRef({ move, sayPosition })
  act.current = { move, sayPosition }
  const dragId = drag?.id
  React.useEffect(() => {
    if (!dragId) return
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dy = Math.min(d.max, Math.max(d.min, e.clientY - d.startY))
      const center = d.mids[d.from] + dy
      let to = d.from
      for (let i = 0; i < d.from; i++)
        if (center <= d.mids[i]) {
          to = i
          break
        }
      for (let i = d.mids.length - 1; i > d.from; i--)
        if (center >= d.mids[i]) {
          to = i
          break
        }
      setDrag({ ...d, dy, to })
    }
    const onUp = () => {
      const d = dragRef.current
      if (!d) return
      setDrop({ id: d.id, top: rowOf(d.id)?.getBoundingClientRect().top ?? 0 })
      setDrag(null)
      act.current.move(d.from, d.to)
      act.current.sayPosition(d.id)
    }
    const cursor = document.body.style.cursor
    document.body.style.cursor = 'grabbing'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      document.body.style.cursor = cursor
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragId, listRef])

  // The release, FLIP: the rows stand still in their new order, and the step slides from where it
  // was let go into its slot, still lifted until it lands.
  React.useLayoutEffect(() => {
    if (!drop) return
    const row = rowOf(drop.id)
    // Lay out the new order with no transform moving, before the rows get their transitions back.
    listRef.current?.getBoundingClientRect()
    if (row) {
      const offset = drop.top - row.getBoundingClientRect().top
      // It stays lifted (data-dragging) until it lands.
      const land = () => {
        delete row.dataset.dragging
        row.removeEventListener('transitionend', land)
      }
      if (Math.abs(offset) >= 0.5) {
        row.style.transform = `translateY(${offset}px)`
        row.getBoundingClientRect()
        row.dataset.dragging = ''
        row.style.transitionProperty = ''
        row.style.transform = ''
        row.addEventListener('transitionend', land)
        setTimeout(land, 500)
      }
    }
    setDrop(null)
  }, [drop])

  // Where a row would land if the drag ended now: the numbers follow it, so the step that made
  // room already shows its new number.
  const placeOf = (i: number) => {
    if (!drag) return i
    const { from, to } = drag
    if (i === from) return to
    if (from < to && i > from && i <= to) return i - 1
    if (to < from && i >= to && i < from) return i + 1
    return i
  }

  // Each row's place while a drag is on or just ended.
  const motionOf = (step: AgentPlanStep, i: number): React.CSSProperties | undefined => {
    if (drop) return STILL
    if (!drag) return undefined
    if (step.id === drag.id) return { ...STILL, transform: `translateY(${drag.dy}px)` }
    const { from, to, slot } = drag
    const by = from < to && i > from && i <= to ? -slot : to < from && i >= to && i < from ? slot : 0
    return { transform: `translateY(${by}px)` }
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
              index={placeOf(i)}
              dragging={drag?.id === step.id}
              moving={!!drag && drag.id !== step.id}
              style={motionOf(step, i)}
              editing={editing === step.id}
              open={open === step.id}
              onEdit={(on) => setEditing(on ? step.id : null)}
              onOpen={(on) => setOpen(on ? step.id : null)}
              onRemove={() => remove(step.id)}
              onKeyDown={(e) => onRowKeyDown(e, step)}
              grip={{ onPointerDown: (e) => onGripDown(e, step.id) }}
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

const RING = 'outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]'

function DraftStep({
  step,
  index,
  dragging,
  moving,
  style,
  editing,
  open,
  onEdit,
  onOpen,
  onRemove,
  onKeyDown,
  grip,
}: {
  step: AgentPlanStep
  index: number
  dragging: boolean
  /** Another step is being dragged: this one slides out of its way. */
  moving: boolean
  style?: React.CSSProperties
  editing: boolean
  /** The step's Rename and Remove show under it. */
  open: boolean
  onEdit: (on: boolean) => void
  onOpen: (on: boolean) => void
  onRemove: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLLIElement>) => void
  grip: Pick<React.ComponentProps<'span'>, 'onPointerDown'>
}) {
  const { steps, setSteps, labels, forgetFocus } = usePlan('AgentPlanSteps')
  const editable = step.editable !== false
  const canMove = editable
  const rowRef = React.useRef<HTMLLIElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const done = React.useRef(false)
  // Enter or Escape in the field sends focus back to the step it stood in for.
  const backToLabel = React.useRef(false)
  const actionsId = React.useId()
  // The step's name is its label then its tool line, read with a space between them.
  const nameId = `${actionsId}-name`
  const metaId = `${actionsId}-meta`

  React.useLayoutEffect(() => {
    if (editing) {
      done.current = false
      inputRef.current?.focus()
      inputRef.current?.select()
    } else if (backToLabel.current) {
      backToLabel.current = false
      rowRef.current?.querySelector<HTMLElement>('[data-part="label"]')?.focus()
    }
  }, [editing])

  const finish = (save: boolean, refocus: boolean) => {
    if (done.current) return
    done.current = true
    const label = inputRef.current?.value.trim() ?? ''
    if (save && label && label !== step.label) setSteps(steps.map((s) => (s.id === step.id ? { ...s, label } : s)))
    if (refocus) backToLabel.current = true
    else forgetFocus()
    onEdit(false)
  }

  const labelClass = cn('text-sm leading-5 break-words', step.skipped ? 'text-text-muted' : 'text-text-default')

  // The step's number, which the list already says to screen readers. The pointer drags it to
  // move the step; the keyboard has Alt+↑/↓. On hover, keyboard focus or a drag, the digit gives
  // way to the grip in the same box, so nothing moves.
  const number = (
    <Badge
      size="sm"
      aria-hidden
      data-part="number"
      className={cn(
        'relative min-w-5 justify-center tabular-nums',
        canMove && 'cursor-grab touch-none select-none',
        dragging && 'cursor-grabbing',
        // Centred on the 28px field that renames an open step.
        editing && 'mt-1',
      )}
      {...(canMove ? grip : {})}
    >
      <span className={cn(canMove && 'group-hover/step:invisible group-has-[:focus-visible]/step:invisible group-data-dragging/step:invisible')}>{index + 1}</span>
      {canMove && (
        <span className="invisible absolute inset-0 flex items-center justify-center group-hover/step:visible group-has-[:focus-visible]/step:visible group-data-dragging/step:visible">
          <Grip />
        </span>
      )}
    </Badge>
  )

  const field = (
    <Input
      ref={inputRef}
      size="sm"
      aria-label={labels.stepName(index + 1)}
      defaultValue={step.label}
      // In the label's place, at its full height inside the open step's 8px.
      wrapperClassName="self-stretch"
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
  )

  return (
    <li
      ref={rowRef}
      data-slot="agent-plan-step"
      data-state="draft"
      data-step-id={step.id}
      data-dragging={dragging || undefined}
      data-skipped={step.skipped || undefined}
      data-open={open || undefined}
      onKeyDownCapture={onKeyDown}
      style={style}
      className={cn(
        'group/step flex items-start gap-2 rounded-md border border-strong border-transparent p-1',
        'transition-[background-color,border-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out)',
        // Making room for a dragged step, and landing one, take the calmer base duration.
        moving && 'duration-(--duration-base)',
        'data-dragging:duration-(--duration-base)',
        // Only a step that opens on a press fills on hover.
        editable && !open && !moving && 'satin-hover:bg-action-secondary-bg',
        // The open step keeps the card's surface, so its buttons don't sit darker on a lighter fill.
        // 8px above and below its content, grown outwards so the content doesn't move as it opens.
        'data-open:relative data-open:z-[1] data-open:-my-1 data-open:py-2 data-open:border-border-default',
        // Lifted while dragged and until it lands: above the others, on the card's surface, a soft shadow.
        'data-dragging:relative data-dragging:z-10 data-dragging:border-border-strong data-dragging:bg-bg-popover',
        'data-dragging:[box-shadow:0_4px_6px_-1px_var(--effect-shadow-sm),0_2px_4px_-2px_var(--effect-shadow-sm)]',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          {number}
          {editable && !editing ? (
            // The whole step, label and tool, is one target that opens its actions.
            <button
              type="button"
              data-part="label"
              aria-labelledby={step.tool || step.detail != null ? `${nameId} ${metaId}` : nameId}
              aria-expanded={open}
              aria-controls={open ? actionsId : undefined}
              aria-description={labels.sortableHint}
              onClick={() => onOpen(!open)}
              className={cn('-m-1 flex min-w-0 flex-1 flex-col items-start rounded-sm p-1 text-start', RING)}
            >
              <span id={nameId} className={labelClass}>
                {step.label}
              </span>
              <DraftMeta id={metaId} step={step} />
            </button>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col items-start">
              {editing ? (
                field
              ) : (
                <span data-part="label" className={labelClass}>
                  {step.label}
                </span>
              )}
              <DraftMeta step={step} className={cn(editing && 'mt-1')} />
            </div>
          )}
        </div>
        {/* Under the label, 12px apart so Remove is hard to hit by mistake: nothing sits on the right edge. */}
        {open && !editing && (
          <div id={actionsId} className="flex items-center gap-3 ps-7 pt-2">
            <Button variant="secondary" size="xs" data-part="rename" onClick={() => onEdit(true)}>
              {labels.renameStep}
            </Button>
            <Button variant="secondary" size="xs" data-part="remove" aria-label={labels.removeItem(step.label)} onClick={onRemove}>
              {labels.remove}
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}

/** A draft step's tool and detail as one muted line under its label. */
function DraftMeta({ step, id, className }: { step: AgentPlanStep; id?: string; className?: string }) {
  if (!step.tool && step.detail == null) return null
  return (
    <span id={id} className={cn('text-sm text-text-muted', className)}>
      {step.tool && (
        <>
          <ToolIcon step={step} />
          {step.tool}
        </>
      )}
      {step.tool && step.detail != null && ' · '}
      {step.detail}
    </span>
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
        <ToolIcon step={step} />
        {step.tool} · {step.detail}
      </>
    ) : step.tool ? (
      <>
        <ToolIcon step={step} />
        {step.tool}
      </>
    ) : (
      step.detail
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

/** Satin's reorder grip (DecisionCard's ranking, from Figma): six dots, 8 × 14, in the number's colour. */
function Grip() {
  return (
    <svg viewBox="0 0 8 14" aria-hidden className="shrink-0 fill-current">
      {[1.25, 6.75, 12.25].map((cy) => (
        <React.Fragment key={cy}>
          <circle cx="1.25" cy={cy} r="1.25" />
          <circle cx="6.25" cy={cy} r="1.25" />
        </React.Fragment>
      ))}
    </svg>
  )
}

/** The tool's logo or icon before its name in a step's muted line, centred on the line. */
function ToolIcon({ step }: { step: AgentPlanStep }) {
  if (step.toolIcon == null) return null
  return (
    <span
      aria-hidden
      className="me-1 inline-flex h-[1lh] items-center align-top [&_img]:size-4 [&_svg]:size-icon-size-sm [&_svg]:[stroke-width:1.875]"
    >
      {step.toolIcon}
    </span>
  )
}

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
