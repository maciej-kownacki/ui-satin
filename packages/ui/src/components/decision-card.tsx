'use client'

import * as React from 'react'
import { RadioGroup } from 'radix-ui'
import { Check, EditPencil, NavArrowLeft, NavArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { useSatinLabels } from './labels'
import { useStepSlide } from './step-slide'

/**
 * DecisionCard, 1:1 with the uiKit `DecisionCard` set (3096:1626) and its `decisionItem` rows
 * (3092:61608): one question an agent asks, its answers, and Skip / Continue.
 *
 * The card is 364 wide, bg/popover, border/default, radius-2xl, shadow-xs. The header is the
 * medium 14/20 title with an optional step navigator (24px icon buttons around "1/3"); the
 * footer is a tertiary Skip in text/muted and a primary Continue, 16px above and 12px below.
 *
 * - `radio` / `checkbox`: rows of 20px with 4px padding, hover bg action/secondary, 2px apart.
 * - `chips`: wrapping 28px pills 6px apart; selected ones take component/decision-chip: status/brand
 *   in Light, a brand edge and tint with a text/default label in Dark.
 * - `ranking`: 10px-radius rows with a grip, a rank dot (primary for #1) and the label. Drag to
 *   reorder, or Alt + Arrow keys; the dragged row lifts with border/strong and the md shadow.
 * - `draft`: the agent's text in a bubble (radius-2xl, 4px top-left); Rewrite makes it editable.
 * - `summary`: what the card collapses to once answered, with a Change action.
 *
 * Stepping between questions slides like a track: the old title and answers and the new ones sit
 * side by side, 24px apart, and move a whole card's width to the side (the new ones in from the
 * right going forward), the one leaving fading out; each part's box eases to the new height as
 * they go, clipped while it moves. All of it is 360 ms on cubic-bezier(0.22, 1, 0.36, 1)
 * (step-slide.tsx, which Satin Pro's CommandPages shares). The
 * "1/3" count rolls its changed digit like an odometer (up going forward, down going back, 350
 * ms). The navigator and the footer stay put. Stepping again mid-slide carries on from where
 * things are. A part that reads the same on both steps (a title every step shares) stays still.
 * Under reduced motion nothing moves: the step just changes. Moving on with Continue or Skip
 * puts focus into the new question (its picked answer, or its first control); the step buttons
 * keep it. The card doesn't step by itself: move `step`, `title` and the answers from
 * `onContinue` and `onSkip`.
 *
 * For a step none of the types covers, pass `children`: they take the answers' place and move
 * with the step. `footer` takes Skip and Continue's place, in the same row. Other props, `ref`
 * included, go to the card's `div`.
 */

export type DecisionOption = {
  value: string
  label: string
  /** 14px icon, used by `chips`. */
  icon?: React.ReactNode
}

export type DecisionValue = string | string[]

export interface DecisionCardProps
  extends Omit<React.ComponentProps<'div'>, 'title' | 'defaultValue' | 'onChange'> {
  type?: 'radio' | 'checkbox' | 'chips' | 'ranking' | 'draft' | 'summary'
  title: string
  /** "1/3". Shows the step navigator. */
  step?: string
  onPreviousStep?: () => void
  onNextStep?: () => void
  /** A muted line under the title, e.g. "Select up to 5". */
  hint?: string
  options?: DecisionOption[]
  /**
   * radio: the chosen value. checkbox / chips: the chosen values. ranking: every value in order.
   * draft: the text. summary: the values to list.
   */
  value?: DecisionValue
  defaultValue?: DecisionValue
  onValueChange?: (value: DecisionValue) => void
  /** chips: how many can be picked. */
  max?: number
  /** draft: the bold first line of the draft, e.g. the subject. */
  draftTitle?: string
  onContinue?: (value: DecisionValue) => void
  onSkip?: () => void
  /** summary: reopens the question. */
  onEdit?: () => void
  /** draft: called when Rewrite is pressed, after the field becomes editable. */
  onRewrite?: () => void
  /** Defaults to the `continue` label, or `useReply` on a draft. */
  continueLabel?: string
  /** Defaults to the `skip` label. */
  skipLabel?: string
  /** The step navigator's previous button. Defaults to the `previousQuestion` label. */
  previousStepLabel?: string
  /** The step navigator's next button. Defaults to the `nextQuestion` label. */
  nextStepLabel?: string
  /** A body of your own, in place of the type's answers; it moves with the step. */
  children?: React.ReactNode
  /** Actions of your own, in place of Skip and Continue, in the footer row (not on a draft). */
  footer?: React.ReactNode
}

export function DecisionCard({
  className,
  type = 'radio',
  title,
  step,
  onPreviousStep,
  onNextStep,
  hint,
  options = [],
  value: valueProp,
  defaultValue,
  onValueChange,
  max,
  draftTitle,
  onContinue,
  onSkip,
  onEdit,
  onRewrite,
  continueLabel,
  skipLabel: skipLabelProp,
  previousStepLabel,
  nextStepLabel,
  children,
  footer,
  ref,
  ...props
}: DecisionCardProps) {
  const labels = useSatinLabels()
  const skipLabel = skipLabelProp ?? labels.skip
  const [inner, setInner] = React.useState<DecisionValue>(
    () => defaultValue ?? initialValue(type, options),
  )
  // A new question (another step or title) starts from its own default, not the last one's picks.
  const question = step ?? title
  const [innerFor, setInnerFor] = React.useState(question)
  if (innerFor !== question) {
    setInnerFor(question)
    setInner(defaultValue ?? initialValue(type, options))
  }
  const value = valueProp ?? inner
  const set = (next: DecisionValue) => {
    setInner(next)
    onValueChange?.(next)
  }
  const titleId = React.useId()
  const cardRef = React.useRef<HTMLDivElement>(null)
  const titleRef = React.useRef<HTMLDivElement>(null)
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const footerRef = React.useRef<HTMLDivElement>(null)
  useStepSlide(question, stepIndex(step), cardRef, () => [titleRef.current, bodyRef.current])

  // Continue or Skip took the user to another question: focus goes into it (its picked answer,
  // or the first control), so the new question is read out and answered from there. From the
  // step buttons, focus stays on them. `inStep` remembers focus in the answers or the footer, for
  // when the step takes that control away (a draft's footer is its own) and focus falls to the page.
  const inStep = React.useRef(false)
  React.useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const onFocusIn = (e: FocusEvent) => {
      inStep.current = !!(footerRef.current?.contains(e.target as Node) || bodyRef.current?.contains(e.target as Node))
    }
    // Leaving the card clears it, but not a control the step took away: browsers send focusout
    // for that too, so it waits until after the step's layout effects and checks the control is
    // still on the page.
    const onFocusOut = (e: FocusEvent) => {
      if (card.contains(e.relatedTarget as Node | null)) return
      const from = e.target as Node
      queueMicrotask(() => {
        if (from.isConnected) inStep.current = false
      })
    }
    card.addEventListener('focusin', onFocusIn)
    card.addEventListener('focusout', onFocusOut)
    return () => {
      card.removeEventListener('focusin', onFocusIn)
      card.removeEventListener('focusout', onFocusOut)
    }
  }, [])
  const shown = React.useRef(question)
  React.useLayoutEffect(() => {
    if (shown.current === question) return
    shown.current = question
    const active = document.activeElement
    const lost = !active || active === document.body
    if (!footerRef.current?.contains(active) && !(lost && inStep.current)) return
    const body = bodyRef.current
    const target =
      body?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
      [...(body?.querySelectorAll<HTMLElement>(TABBABLE) ?? [])].find((n) => n.getAttribute('role') !== 'radiogroup') ??
      body?.querySelector<HTMLElement>('[role="radio"]:not(:disabled)')
    target?.focus({ preventScroll: true })
  }, [question])

  const card = cn(
    'flex w-[364px] max-w-full flex-col overflow-clip rounded-2xl border border-border-default bg-bg-popover',
    '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
    className,
  )

  if (type === 'summary') {
    const values = asArray(value)
    const picked = values.map((v) => options.find((o) => o.value === v)?.label ?? v)
    return (
      <div ref={ref} data-slot="decision-card" data-type="summary" className={card} {...props}>
        <div className="flex items-center gap-2.5 py-2.5 ps-3 pe-2.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-action-primary-bg text-action-primary-fg">
            <Check aria-hidden className="size-icon-size-sm [stroke-width:1.875]" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs text-text-muted">{title}</span>
            <span className="truncate text-sm font-medium text-text-default">{picked.join(' · ')}</span>
          </div>
          {onEdit && (
            <Button variant="tertiary" onClick={onEdit} className="text-text-muted" aria-label={labels.changeItem(title)}>
              {labels.change}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const own = children != null
  const empty =
    type === 'radio' ? !value : type === 'checkbox' || type === 'chips' ? asArray(value).length === 0 : false

  return (
    <div
      ref={(node: HTMLDivElement | null) => {
        cardRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      role="group"
      aria-labelledby={titleId}
      data-slot="decision-card"
      data-type={type}
      className={card}
      {...props}
    >
      <Header
        titleRef={titleRef}
        titleId={titleId}
        title={title}
        step={step}
        hint={hint}
        onPreviousStep={onPreviousStep}
        onNextStep={onNextStep}
        previousStepLabel={previousStepLabel}
        nextStepLabel={nextStepLabel}
      />
      <div className="relative">
        <div ref={bodyRef}>
      {own && children}

      {!own && type === 'radio' && (
        <RadioGroup.Root
          aria-labelledby={titleId}
          value={typeof value === 'string' ? value : ''}
          onValueChange={set}
          className="flex flex-col gap-0.5 px-2"
        >
          {options.map((option) => (
            <DecisionItem key={option.value}>
              <RadioRow option={option} />
            </DecisionItem>
          ))}
        </RadioGroup.Root>
      )}

      {!own && type === 'checkbox' && (
        <div className="flex flex-col gap-0.5 px-2">
          {options.map((option) => {
            const checked = asArray(value).includes(option.value)
            return (
              <DecisionItem key={option.value}>
                <CheckboxRow
                  option={option}
                  checked={checked}
                  onCheckedChange={(on) => set(toggle(asArray(value), option.value, on))}
                />
              </DecisionItem>
            )
          })}
        </div>
      )}

      {!own && type === 'chips' && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-1">
          {options.map((option) => {
            const chosen = asArray(value)
            const selected = chosen.includes(option.value)
            const full = max !== undefined && chosen.length >= max && !selected
            return (
              <DecisionChip
                key={option.value}
                option={option}
                selected={selected}
                disabled={full}
                onPressedChange={(on) => set(toggle(chosen, option.value, on))}
              />
            )
          })}
        </div>
      )}

      {!own && type === 'ranking' && (
        <Ranking key={question} options={options} value={asArray(value)} onValueChange={set} labelledBy={titleId} />
      )}

      {!own && type === 'draft' && (
        <Draft
          key={question}
          title={draftTitle}
          value={typeof value === 'string' ? value : ''}
          onValueChange={set}
          onRewrite={onRewrite}
          onSkip={onSkip}
          onContinue={() => onContinue?.(value)}
          continueLabel={continueLabel ?? labels.useReply}
          skipLabel={skipLabel}
        />
      )}

        </div>
      </div>

      {type !== 'draft' && footer !== undefined && (
        <div ref={footerRef} className="flex items-center justify-end gap-2 px-3 pt-4 pb-3">
          {footer}
        </div>
      )}
      {type !== 'draft' && footer === undefined && (
        <div ref={footerRef} className="flex items-center justify-end gap-2 px-3 pt-4 pb-3">
          {onSkip && (
            <Button variant="tertiary" onClick={onSkip} className="text-text-muted">
              {skipLabel}
            </Button>
          )}
          <Button onClick={() => onContinue?.(value)} disabled={empty}>
            {continueLabel ?? labels.continue}
          </Button>
        </div>
      )}
    </div>
  )
}

function Header({
  titleRef,
  titleId,
  title,
  step,
  hint,
  onPreviousStep,
  onNextStep,
  previousStepLabel,
  nextStepLabel,
}: {
  titleRef: React.Ref<HTMLDivElement>
  titleId: string
  title: string
  step?: string
  hint?: string
  onPreviousStep?: () => void
  onNextStep?: () => void
  previousStepLabel?: string
  nextStepLabel?: string
}) {
  const labels = useSatinLabels()
  return (
    <div className="flex items-start gap-0.5 py-3 ps-3 pe-px">
      {/* The title and hint move with the question; the step navigator stays. */}
      <div className="relative min-w-0 flex-1">
        <div ref={titleRef} className="flex flex-col gap-0.5">
          <p id={titleId} className="text-base leading-5 font-medium tracking-normal text-text-default">
            {title}
          </p>
          {hint && <p className="text-base text-text-muted">{hint}</p>}
        </div>
      </div>
      {step && (
        <div className="flex h-[21px] shrink-0 items-center gap-1 pe-2">
          <Button
            variant="tertiary"
            size="xs"
            shape="rounded"
            iconOnly
            aria-label={previousStepLabel ?? labels.previousQuestion}
            disabled={!onPreviousStep}
            onClick={onPreviousStep}
          >
            {/* Mirrored right to left, where the previous question is to the right. */}
            <NavArrowLeft aria-hidden className="rtl:-scale-x-100" />
          </Button>
          <StepCount step={step} />
          <Button
            variant="tertiary"
            size="xs"
            shape="rounded"
            iconOnly
            aria-label={nextStepLabel ?? labels.nextQuestion}
            disabled={!onNextStep}
            onClick={onNextStep}
          >
            <NavArrowRight aria-hidden className="rtl:-scale-x-100" />
          </Button>
        </div>
      )}
    </div>
  )
}

// The controls a question's answers can take focus at. A radio group's root is left out: it only
// hands focus on to its items, which it hasn't registered yet when the question is new.
const TABBABLE = 'button:not(:disabled):not([tabindex="-1"]), input:not(:disabled):not([tabindex="-1"]), textarea:not(:disabled), [tabindex="0"]'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const stepIndex = (step?: string) => (step ? parseInt(step, 10) || 0 : 0)

const ROLL_MS = 350
const ROLL_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

/**
 * The "1/3" count. Its changed digits roll like an odometer, in a box one line high: up going
 * forward, down going back. Screen readers get the plain count from a polite live region.
 */
function StepCount({ step }: { step: string }) {
  const last = React.useRef(step)
  const round = React.useRef(0)
  const [roll, setRoll] = React.useState<{ from: string; up: boolean; key: number } | null>(null)
  React.useLayoutEffect(() => {
    const from = last.current
    if (from === step) return
    last.current = step
    setRoll(reducedMotion() ? null : { from, up: stepIndex(step) >= stepIndex(from), key: ++round.current })
  }, [step])

  // Right-aligned, so units stay over units when a digit is gained or lost.
  const width = Math.max(step.length, roll?.from.length ?? 0)
  const to = step.padStart(width, ' ')
  const from = (roll?.from ?? step).padStart(width, ' ')
  const cell = (ch: string) => (ch === ' ' ? '' : ch)
  return (
    <span className="text-sm whitespace-nowrap text-text-muted tabular-nums">
      <span aria-live="polite" className="sr-only">
        {step}
      </span>
      <span aria-hidden className="inline-flex">
        {[...to].map((ch, i) =>
          roll && from[i] !== ch ? (
            <span key={`${roll.key}-${i}`} className="inline-flex h-lh flex-col overflow-hidden">
              <span
                className="flex flex-col"
                ref={(column) => {
                  if (!column || column.dataset.rolled) return
                  column.dataset.rolled = ''
                  const end = roll.up ? 'translateY(-50%)' : 'translateY(0)'
                  column
                    .animate([{ transform: roll.up ? 'translateY(0)' : 'translateY(-50%)' }, { transform: end }], { duration: ROLL_MS, easing: ROLL_EASE })
                    .finished.then(
                      () => setRoll((r) => (r?.key === roll.key ? null : r)),
                      () => {},
                    )
                }}
              >
                <span className="h-lh">{cell(roll.up ? from[i] : ch)}</span>
                <span className="h-lh">{cell(roll.up ? ch : from[i])}</span>
              </span>
            </span>
          ) : ch === ' ' ? null : (
            <span key={i}>{ch}</span>
          ),
        )}
      </span>
    </span>
  )
}

/** `decisionItem` (3092:61608): 4px padding, radius-md, action/secondary fill on hover. */
function DecisionItem({ children, 'data-force': force }: { children: React.ReactNode; 'data-force'?: 'hover' }) {
  return (
    <div
      data-force={force}
      className="rounded-md p-1 transition-[background-color] duration-(--duration-fast) ease-(--ease-out) satin-hover:bg-action-secondary-bg"
    >
      {children}
    </div>
  )
}

function RadioRow({ option }: { option: DecisionOption }) {
  const id = React.useId()
  return (
    <div className="flex h-5 items-center gap-2">
      <RadioGroup.Item
        id={id}
        value={option.value}
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full border border-strong border-border-strong bg-bg-field outline-none',
          '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
          'transition-[background-color,border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
          'data-[state=checked]:border-action-primary-bg data-[state=checked]:bg-action-primary-bg data-[state=checked]:[box-shadow:none]',
          'focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)] data-[state=checked]:focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        )}
      >
        <RadioGroup.Indicator className="size-1.5 rounded-full bg-text-on-solid" />
      </RadioGroup.Item>
      <label htmlFor={id} className="min-w-0 flex-1 text-base text-text-default">
        {option.label}
      </label>
    </div>
  )
}

function CheckboxRow({
  option,
  checked,
  onCheckedChange,
}: {
  option: DecisionOption
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = React.useId()
  return (
    <div className="flex h-5 items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(c) => onCheckedChange(c === true)} />
      <label htmlFor={id} className="min-w-0 flex-1 text-base text-text-default">
        {option.label}
      </label>
    </div>
  )
}

function DecisionChip({
  option,
  selected,
  disabled,
  onPressedChange,
}: {
  option: DecisionOption
  selected: boolean
  disabled?: boolean
  onPressedChange: (pressed: boolean) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onPressedChange(!selected)}
      className={cn(
        'inline-flex h-control-height shrink-0 items-center gap-1.5 rounded-pill border border-strong ps-2 pe-2.5 text-base font-medium outline-none select-none',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out) active:scale-[0.97]',
        '[&_svg]:size-icon-size-sm [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
        'focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        'disabled:pointer-events-none disabled:opacity-50',
        selected
          ? // component/decision-chip: status/brand in Light; in Dark a brand edge and tint with a
            // text/default label, since status/brand fg is a pale tint there.
            'border-component-decision-chip-selected-border bg-component-decision-chip-selected-bg text-component-decision-chip-selected-fg'
          : 'border-border-default bg-bg-popover text-text-default hover:border-border-strong [&_svg]:text-text-muted',
      )}
    >
      {option.icon}
      {option.label}
    </button>
  )
}

function Ranking({
  options,
  value,
  onValueChange,
  labelledBy,
}: {
  options: DecisionOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  labelledBy: string
}) {
  const labels = useSatinLabels()
  const order = value.length ? value : options.map((o) => o.value)
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [announcement, setAnnouncement] = React.useState('')
  const listRef = React.useRef<HTMLOListElement>(null)
  const label = (v: string) => options.find((o) => o.value === v)?.label ?? v

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return
    const next = [...order]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onValueChange(next)
    return next
  }

  const onPointerDown = (e: React.PointerEvent<HTMLLIElement>, item: string) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(item)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    if (!dragging || !listRef.current) return
    const rows = Array.from(listRef.current.children) as HTMLElement[]
    const from = order.indexOf(dragging)
    let to = from
    rows.forEach((row, i) => {
      const box = row.getBoundingClientRect()
      const mid = box.top + box.height / 2
      if (i < from && e.clientY < mid) to = Math.min(to, i)
      if (i > from && e.clientY > mid) to = Math.max(to, i)
    })
    if (to !== from) move(from, to)
  }
  const onPointerUp = () => {
    if (dragging) setAnnouncement(labels.positionOf(label(dragging), order.indexOf(dragging) + 1, order.length))
    setDragging(null)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, index: number) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const to = index + (e.key === 'ArrowUp' ? -1 : 1)
    if (e.altKey) {
      const next = move(index, to)
      if (next) {
        setAnnouncement(labels.positionOf(label(next[to]), to + 1, next.length))
        requestAnimationFrame(() => (listRef.current?.children[to] as HTMLElement | undefined)?.focus())
      }
    } else {
      ;(listRef.current?.children[to] as HTMLElement | undefined)?.focus()
    }
  }

  return (
    <div className="px-3 pb-1">
      <ol ref={listRef} aria-labelledby={labelledBy} className="flex flex-col gap-1.5">
        {order.map((item, i) => {
          const lifted = dragging === item
          return (
            <li
              key={item}
              tabIndex={0}
              aria-roledescription={labels.sortableItem}
              aria-description={labels.sortableHint}
              data-dragging={lifted || undefined}
              onPointerDown={(e) => onPointerDown(e, item)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'group/rank flex cursor-grab touch-none items-center gap-2 rounded-lg border border-strong border-border-default bg-bg-popover py-2 ps-2 pe-2.5 outline-none select-none',
                'transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
                'hover:border-border-strong focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
                'data-dragging:cursor-grabbing data-dragging:border-border-strong',
                'data-dragging:[box-shadow:0_4px_6px_-1px_var(--effect-shadow-sm),0_2px_4px_-2px_var(--effect-shadow-sm)]',
              )}
            >
              <Grip />
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full text-xs tabular-nums',
                  i === 0 ? 'bg-action-primary-bg text-action-primary-fg' : 'bg-bg-muted text-text-muted',
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-base font-medium text-text-default">{label(item)}</span>
            </li>
          )
        })}
      </ol>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}

/** The 8 × 14 six-dot grip from Figma: text/subtle at rest, text/muted while dragging. */
function Grip() {
  return (
    <svg
      width="8"
      height="14"
      viewBox="0 0 8 14"
      aria-hidden
      className="shrink-0 fill-current text-text-subtle group-data-dragging/rank:text-text-muted"
    >
      {[1.25, 6.75, 12.25].map((cy) => (
        <React.Fragment key={cy}>
          <circle cx="1.25" cy={cy} r="1.25" />
          <circle cx="6.25" cy={cy} r="1.25" />
        </React.Fragment>
      ))}
    </svg>
  )
}

function Draft({
  title,
  value,
  onValueChange,
  onRewrite,
  onSkip,
  onContinue,
  continueLabel,
  skipLabel,
}: {
  title?: string
  value: string
  onValueChange: (value: string) => void
  onRewrite?: () => void
  onSkip?: () => void
  onContinue: () => void
  continueLabel: string
  skipLabel: string
}) {
  const labels = useSatinLabels()
  const [editing, setEditing] = React.useState(false)
  const areaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [value, editing])

  return (
    <>
      <div className="px-3 pb-1">
        <div
          className={cn(
            'flex flex-col gap-2 rounded-2xl rounded-ss-[4px] border border-strong border-border-default bg-bg-popover px-3 py-2.5 text-base text-text-default',
            '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
            'transition-[box-shadow,border-color] duration-(--duration-fast) ease-(--ease-out)',
            'has-[textarea:focus-visible]:border-border-focus has-[textarea:focus-visible]:[box-shadow:0_0_0_1px_var(--border-focus)]',
          )}
        >
          {title && <p className="leading-[18px] font-medium">{title}</p>}
          {editing ? (
            <textarea
              ref={areaRef}
              aria-label={labels.draft}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              className="w-full resize-none bg-transparent outline-none"
            />
          ) : (
            <p className="whitespace-pre-wrap">{value}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pt-4 pb-3">
        <Button
          variant="tertiary"
          className="text-text-muted"
          aria-pressed={editing}
          onClick={() => {
            setEditing(true)
            requestAnimationFrame(() => areaRef.current?.focus())
            onRewrite?.()
          }}
        >
          <EditPencil aria-hidden />
          {labels.rewrite}
        </Button>
        <div className="flex items-center gap-2">
          {onSkip && (
            <Button variant="tertiary" onClick={onSkip} className="text-text-muted">
              {skipLabel}
            </Button>
          )}
          <Button onClick={onContinue} disabled={!value.trim()}>
            {continueLabel}
          </Button>
        </div>
      </div>
    </>
  )
}

/** A static `decisionItem` row in its hover state, for state sheets. */
export function DecisionItemPreview({ children, hover }: { children: React.ReactNode; hover?: boolean }) {
  return <DecisionItem data-force={hover ? 'hover' : undefined}>{children}</DecisionItem>
}

function initialValue(type: DecisionCardProps['type'], options: DecisionOption[]): DecisionValue {
  if (type === 'ranking') return options.map((o) => o.value)
  if (type === 'radio' || type === 'draft') return ''
  return []
}

function asArray(value: DecisionValue | undefined): string[] {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

function toggle(list: string[], item: string, on: boolean) {
  return on ? (list.includes(item) ? list : [...list, item]) : list.filter((v) => v !== item)
}
