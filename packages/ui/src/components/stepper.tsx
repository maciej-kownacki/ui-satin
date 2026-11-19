'use client'

import * as React from 'react'
import { Check } from 'iconoir-react'
import { cn } from '../lib/utils'
import { useSatinLabels } from './labels'
import { Progress } from './progress'

/** What a step's place in the flow doesn't say on its own. */
export type StepperStepState = 'complete' | 'error' | 'disabled'

export interface StepperStep {
  /** Names the step; the Stepper's `value` picks the current one. */
  value: string
  label: React.ReactNode
  /** A line under the label: what the step asks for, or what went wrong. */
  description?: React.ReactNode
  /**
   * What the step's place in the flow doesn't say: `complete` (a check, "Completed" to screen
   * readers), `error` (an exclamation mark, "Error"), `disabled` (dimmed, and not a button when
   * the stepper isn't linear). Left out, a linear stepper marks the steps before the current one
   * complete.
   */
  state?: StepperStepState
}

type Orientation = 'horizontal' | 'vertical'
type Status = 'upcoming' | StepperStepState

type ItemContext = {
  index: number
  count: number
  /** The current step's index, -1 when `value` matches none. */
  current: number
  linear: boolean
  orientation: Orientation
  select: (value: string) => void
  /** The step number in the labels' locale. */
  format: (n: number) => string
  /** False during the first render, so what is there on load doesn't animate in. */
  mounted: boolean
}
const ItemContext = React.createContext<ItemContext | null>(null)

export interface StepperItemProps extends Omit<React.ComponentProps<'li'>, 'value' | 'children'> {
  /** Names the step; the Stepper's `value` picks the current one. */
  value: string
  label: React.ReactNode
  /** A line under the label: what the step asks for, or what went wrong. */
  description?: React.ReactNode
  /** See `StepperStep.state`. */
  state?: StepperStepState
  /** The step's content, shown under its label while it is the current step (vertical only). */
  children?: React.ReactNode
}

/** An exclamation mark, drawn like the iconoir icons beside it. */
function ErrorMark() {
  return (
    <svg data-slot="stepper-error-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M12 6.5v7" />
      <path d="M12 17.5h.01" />
    </svg>
  )
}

/** A step's content: fades in when its step becomes current, but not on load. */
function StepperContent({ children }: { children: React.ReactNode }) {
  const context = React.useContext(ItemContext)
  const [enter] = React.useState(() => context?.mounted ?? false)
  return (
    <div data-slot="stepper-content" data-enter={enter ? '' : undefined} className="min-w-0 ps-9 pt-3">
      {children}
    </div>
  )
}

/**
 * One step, for the Stepper's children: the place to put content under a vertical step, or a
 * label that needs more than text (a Badge). Takes its number and state from its place.
 * Other props, `ref` included, go to the `li`.
 */
export function StepperItem({ value, label, description, state, children, className, ...props }: StepperItemProps) {
  const context = React.useContext(ItemContext)
  const labels = useSatinLabels()
  const id = React.useId()
  if (!context) throw new Error('StepperItem goes inside a Stepper.')
  const { index, count, current: currentIndex, linear, orientation, select, format } = context

  const current = index === currentIndex
  const passed = linear && currentIndex >= 0 && index < currentIndex
  const status: Status = state ?? (passed ? 'complete' : 'upcoming')
  // The connector after this step fills once the flow is past it.
  const filled = status === 'complete' || passed
  const vertical = orientation === 'vertical'
  const said = status === 'complete' ? labels.stepCompleted : status === 'error' ? labels.stepError : undefined
  const stateAttrs = { 'data-state': status, 'data-current': current ? '' : undefined }

  const content = (
    <>
      <span data-slot="stepper-indicator" aria-hidden {...stateAttrs}>
        <span data-slot="stepper-number">{format(index + 1)}</span>
        <Check data-slot="stepper-check" />
        <ErrorMark />
      </span>
      <span className={cn('flex min-w-0 flex-col', vertical && 'pt-0.5')}>
        <span id={`${id}-label`} data-slot="stepper-label" {...stateAttrs} className="text-base leading-5 font-medium">
          {label}
          {said && <span className="sr-only">, {said}</span>}
        </span>
        {description != null && (
          <span id={`${id}-description`} data-slot="stepper-description" {...stateAttrs} className="mt-0.5 text-sm leading-[18px]">
            {description}
          </span>
        )}
      </span>
    </>
  )
  // 4px of padding the margin takes back: room for the focus ring without moving anything.
  const stepClass = cn('relative z-[1] -m-1 flex max-w-[calc(100%+8px)] min-w-0 p-1 text-start', vertical ? 'items-start gap-3' : 'flex-col items-start gap-2')

  return (
    <li
      data-slot="stepper-item"
      {...stateAttrs}
      // Linear, the item is the step; otherwise its button carries aria-current.
      aria-current={linear && current ? 'step' : undefined}
      {...props}
      className={cn('relative flex min-w-0 flex-col', vertical ? 'pb-6 last:pb-0' : 'flex-1 pe-4 last:flex-[0_1_auto] last:pe-0', className)}
    >
      {index < count - 1 && (
        <span
          data-slot="stepper-connector"
          data-orientation={orientation}
          data-state={filled ? 'complete' : undefined}
          aria-hidden
          className={cn('absolute', vertical ? 'start-[11px] top-7 bottom-1 w-0.5' : 'start-8 end-2 top-[11px] h-0.5')}
        />
      )}
      {linear ? (
        <div data-slot="stepper-step" className={stepClass}>
          {content}
        </div>
      ) : (
        <button
          type="button"
          data-slot="stepper-step"
          disabled={status === 'disabled'}
          aria-current={current ? 'step' : undefined}
          aria-labelledby={`${id}-label`}
          aria-describedby={description != null ? `${id}-description` : undefined}
          onClick={() => select(value)}
          className={cn(stepClass, 'cursor-pointer disabled:cursor-not-allowed')}
        >
          {content}
        </button>
      )}
      {vertical && current && children != null && <StepperContent>{children}</StepperContent>}
    </li>
  )
}

/**
 * Stepper: where a multi-step flow is (onboarding, checkout, an application). An ordered list of
 * steps, each a 24px circle with its number, a label and an optional description, joined by a
 * 2px connector. Steps are upcoming, current, complete (a check), error (an exclamation mark) or
 * disabled; stepper.css draws them from the tokens.
 *
 * - `linear` (the default): steps before the current one are complete unless they say
 *   otherwise, and nothing is clickable; the app moves `value` with its own Back and Next.
 * - `linear={false}`: each step is a button that sets `value`; only steps marked
 *   `state: 'complete'` are complete.
 *
 * Horizontal, the circles sit in a row with the labels under them. Below 120px a step it gives
 * way to "Step 3 of 4" over a Progress bar (`layout`; a container query, so it needs a width
 * from its parent, and nothing shifts after the page loads). Vertical, the circles run down the
 * start side and the current step's content (a `StepperItem`'s children) opens under its label.
 *
 * Motion: when a step completes, its connector fills over --duration-base and the check fades
 * in; the content of a new current step fades and settles in. Keyboard focus moves nothing.
 *
 * The steps come as `steps` (data) or as children, one `StepperItem` each:
 *
 *   <Stepper value={step} orientation="vertical" aria-label="Application">
 *     <StepperItem value="details" label="Details" description="Name and contact" />
 *     <StepperItem value="cv" label="CV">…the step's form…</StepperItem>
 *   </Stepper>
 *
 * `aria-label` and `aria-labelledby` name the list. Other props, `ref` included, go to the root
 * `div`.
 */
export interface StepperProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'children' | 'onChange'> {
  /** The steps as data. Or leave it out and write them as `StepperItem` children. */
  steps?: StepperStep[]
  /** The steps as elements, when one needs content under it or more than text in its label. */
  children?: React.ReactNode
  /** The current step's `value`. A value that matches no step leaves none current. */
  value?: string
  /** The current step to start on, uncontrolled. Defaults to the first. */
  defaultValue?: string
  /** Called with a step's `value` when it is clicked (only when `linear` is false). */
  onValueChange?: (value: string) => void
  /** Steps in a row with their labels under them, or down the start side with content under the current one. */
  orientation?: 'horizontal' | 'vertical'
  /**
   * True: steps go in order, the ones before the current step are complete, and none is
   * clickable. False: every step that isn't disabled is a button that makes it current.
   */
  linear?: boolean
  /**
   * `auto`: a horizontal stepper narrower than 120px a step shows "Step 3 of 4" over a Progress
   * bar instead. `full` always shows the steps, `compact` always the count and bar.
   */
  layout?: 'auto' | 'full' | 'compact'
  /** Names the list of steps. */
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function Stepper({
  steps,
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  linear = true,
  layout = 'auto',
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: StepperProps) {
  const labels = useSatinLabels()
  const items = steps
    ? steps.map((step) => <StepperItem key={step.value} {...step} />)
    : (React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<StepperItemProps>[])
  const [inner, setInner] = React.useState(() => defaultValue ?? items[0]?.props.value)
  const value = valueProp ?? inner
  const current = items.findIndex((item) => item.props.value === value)
  const count = items.length
  const vertical = orientation === 'vertical'
  // Vertical steps fit any width, so only a horizontal stepper folds.
  const mode = vertical && layout === 'auto' ? 'full' : layout

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const select = React.useCallback(
    (next: string) => {
      setInner(next)
      onValueChange?.(next)
    },
    [onValueChange],
  )
  const numbers = React.useMemo(() => new Intl.NumberFormat(labels.dateLocale), [labels.dateLocale])
  const format = React.useCallback((n: number) => numbers.format(n), [numbers])

  const currentItem = items[current]?.props
  const currentSaid = currentItem?.state === 'error' ? labels.stepError : undefined

  return (
    <div
      data-slot="stepper"
      data-orientation={orientation}
      data-layout={mode}
      data-count={count}
      {...props}
      className={cn(!vertical && 'w-full', className)}
    >
      {mode !== 'compact' && (
        <ol
          role="list"
          data-slot="stepper-list"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={cn('m-0 flex list-none p-0', vertical ? 'flex-col' : 'items-start')}
        >
          {items.map((item, index) => (
            <ItemContext.Provider key={item.key ?? index} value={{ index, count, current, linear, orientation, select, format, mounted }}>
              {item}
            </ItemContext.Provider>
          ))}
        </ol>
      )}
      {mode !== 'full' && (
        <div data-slot="stepper-compact">
          <Progress
            value={current + 1}
            max={count}
            label={
              currentItem && (
                <>
                  {currentItem.label}
                  {currentSaid && <span className="sr-only">, {currentSaid}</span>}
                </>
              )
            }
            aria-label={currentItem ? undefined : ariaLabel}
            formatValue={(step, total) => labels.stepOf(step, total)}
          />
        </div>
      )}
    </div>
  )
}
