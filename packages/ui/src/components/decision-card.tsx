import * as React from 'react'
import { RadioGroup } from 'radix-ui'
import { Check, EditPencil, NavArrowLeft, NavArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { Checkbox } from './checkbox'

/**
 * DecisionCard, 1:1 with the uiKit `DecisionCard` set (3096:1626) and its `decisionItem` rows
 * (3092:61608): one question an agent asks, its answers, and Skip / Continue.
 *
 * The card is 364 wide, bg/popover, border/default, radius-2xl, shadow-xs. The header is the
 * medium 13/16 title with an optional step navigator (24px icon buttons around "1/3"); the
 * footer is a tertiary Skip in text/muted and a primary Continue, 16px above and 12px below.
 *
 * - `radio` / `checkbox`: rows of 20px with 4px padding, hover bg action/secondary, 2px apart.
 * - `chips`: wrapping 28px pills 6px apart; selected ones turn status/brand (fill, border, text).
 * - `ranking`: 10px-radius rows with a grip, a rank dot (primary for #1) and the label. Drag to
 *   reorder, or Alt + Arrow keys; the dragged row lifts with border/strong and the md shadow.
 * - `draft`: the agent's text in a bubble (radius-2xl, 4px top-left); Rewrite makes it editable.
 * - `summary`: what the card collapses to once answered, with a Change action.
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
  continueLabel?: string
  skipLabel?: string
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
  skipLabel = 'Skip',
  ...props
}: DecisionCardProps) {
  const [inner, setInner] = React.useState<DecisionValue>(
    () => defaultValue ?? initialValue(type, options),
  )
  const value = valueProp ?? inner
  const set = (next: DecisionValue) => {
    setInner(next)
    onValueChange?.(next)
  }
  const titleId = React.useId()

  const card = cn(
    'flex w-[364px] max-w-full flex-col overflow-clip rounded-2xl border border-border-default bg-bg-popover',
    '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
    className,
  )

  if (type === 'summary') {
    const values = asArray(value)
    const labels = values.map((v) => options.find((o) => o.value === v)?.label ?? v)
    return (
      <div data-slot="decision-card" data-type="summary" className={card} {...props}>
        <div className="flex items-center gap-2.5 py-2.5 pr-2.5 pl-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-action-primary-bg text-action-primary-fg">
            <Check aria-hidden className="size-icon-size-sm [stroke-width:1.875]" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs text-text-muted">{title}</span>
            <span className="truncate text-sm font-medium text-text-default">{labels.join(' · ')}</span>
          </div>
          {onEdit && (
            <Button variant="tertiary" onClick={onEdit} className="text-text-muted" aria-label={`Change ${title}`}>
              Change
            </Button>
          )}
        </div>
      </div>
    )
  }

  const empty =
    type === 'radio' ? !value : type === 'checkbox' || type === 'chips' ? asArray(value).length === 0 : false

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      data-slot="decision-card"
      data-type={type}
      className={card}
      {...props}
    >
      <Header titleId={titleId} title={title} step={step} hint={hint} onPreviousStep={onPreviousStep} onNextStep={onNextStep} />

      {type === 'radio' && (
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

      {type === 'checkbox' && (
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

      {type === 'chips' && (
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

      {type === 'ranking' && (
        <Ranking options={options} value={asArray(value)} onValueChange={set} labelledBy={titleId} />
      )}

      {type === 'draft' && (
        <Draft
          title={draftTitle}
          value={typeof value === 'string' ? value : ''}
          onValueChange={set}
          onRewrite={onRewrite}
          onSkip={onSkip}
          onContinue={() => onContinue?.(value)}
          continueLabel={continueLabel ?? 'Use reply'}
          skipLabel={skipLabel}
        />
      )}

      {type !== 'draft' && (
        <div className="flex items-center justify-end gap-2 px-3 pt-4 pb-3">
          {onSkip && (
            <Button variant="tertiary" onClick={onSkip} className="text-text-muted">
              {skipLabel}
            </Button>
          )}
          <Button onClick={() => onContinue?.(value)} disabled={empty}>
            {continueLabel ?? 'Continue'}
          </Button>
        </div>
      )}
    </div>
  )
}

function Header({
  titleId,
  title,
  step,
  hint,
  onPreviousStep,
  onNextStep,
}: {
  titleId: string
  title: string
  step?: string
  hint?: string
  onPreviousStep?: () => void
  onNextStep?: () => void
}) {
  return (
    <div className="flex flex-col gap-0.5 py-3 pr-px pl-3">
      <div className="flex items-start gap-0.5">
        <p id={titleId} className="min-w-0 flex-1 text-sm leading-4 font-medium tracking-normal text-text-default">
          {title}
        </p>
        {step && (
          <div className="flex h-[21px] shrink-0 items-center gap-1 pr-2">
            <Button
              variant="tertiary"
              size="xs"
              shape="rounded"
              iconOnly
              aria-label="Previous question"
              disabled={!onPreviousStep}
              onClick={onPreviousStep}
            >
              <NavArrowLeft aria-hidden />
            </Button>
            <span className="text-sm whitespace-nowrap text-text-muted">{step}</span>
            <Button
              variant="tertiary"
              size="xs"
              shape="rounded"
              iconOnly
              aria-label="Next question"
              disabled={!onNextStep}
              onClick={onNextStep}
            >
              <NavArrowRight aria-hidden />
            </Button>
          </div>
        )}
      </div>
      {hint && <p className="text-sm text-text-muted">{hint}</p>}
    </div>
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
          'flex size-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-bg-field outline-none',
          '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
          'transition-[background-color,border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
          'data-[state=checked]:border-action-primary-bg data-[state=checked]:bg-action-primary-bg data-[state=checked]:[box-shadow:none]',
          'focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)] data-[state=checked]:focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        )}
      >
        <RadioGroup.Indicator className="size-1.5 rounded-full bg-text-on-solid" />
      </RadioGroup.Item>
      <label htmlFor={id} className="min-w-0 flex-1 text-sm text-text-default">
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
      <label htmlFor={id} className="min-w-0 flex-1 text-sm text-text-default">
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
        'inline-flex h-control-height shrink-0 items-center gap-1.5 rounded-full border pr-2.5 pl-2 text-sm font-medium outline-none select-none',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out) active:scale-[0.97]',
        '[&_svg]:size-icon-size-sm [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
        'focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        'disabled:pointer-events-none disabled:opacity-50',
        selected
          ? 'border-status-brand-fg bg-status-brand-bg text-status-brand-fg'
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
    if (dragging) setAnnouncement(`${label(dragging)}, position ${order.indexOf(dragging) + 1} of ${order.length}`)
    setDragging(null)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, index: number) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const to = index + (e.key === 'ArrowUp' ? -1 : 1)
    if (e.altKey) {
      const next = move(index, to)
      if (next) {
        setAnnouncement(`${label(next[to])}, position ${to + 1} of ${next.length}`)
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
              aria-roledescription="sortable item"
              aria-description="Alt and arrow keys to move"
              data-dragging={lifted || undefined}
              onPointerDown={(e) => onPointerDown(e, item)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'group/rank flex cursor-grab touch-none items-center gap-2 rounded-lg border border-border-default bg-bg-popover py-2 pr-2.5 pl-2 outline-none select-none',
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
              <span className="min-w-0 flex-1 text-sm font-medium text-text-default">{label(item)}</span>
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
            'flex flex-col gap-2 rounded-2xl rounded-tl-[4px] border border-border-default bg-bg-popover px-3 py-2.5 text-sm text-text-default',
            '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
            'transition-[box-shadow,border-color] duration-(--duration-fast) ease-(--ease-out)',
            'has-[textarea:focus-visible]:border-border-strong has-[textarea:focus-visible]:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          )}
        >
          {title && <p className="leading-[18px] font-medium">{title}</p>}
          {editing ? (
            <textarea
              ref={areaRef}
              aria-label="Draft"
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
          Rewrite
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
