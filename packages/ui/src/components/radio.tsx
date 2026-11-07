import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * Radio, 1:1 with the uiKit `_radioBase` (852:22410) and `Radio` (852:22426) sets: a 16px
 * circle, checked as a solid primary fill with a 6px dot, with an optional label (14/20 medium,
 * text/default) and description (14/20 regular, muted) 2px apart, 8px from the circle, on either
 * side. Disabled turns both texts text/subtle. The look of every state is
 * styles/components/radio.css.
 *
 * A Radio lives in a RadioGroup (Radix): the group owns the value, so `checked` (Figma's
 * property) follows from the group's `value` / `defaultValue`, and arrow keys move between
 * options. The label is a real `<label>`, the description is wired with `aria-describedby`.
 */
export interface RadioGroupProps extends React.ComponentProps<typeof RadioGroupPrimitive.Root> {}

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn('grid gap-3', className)} {...props} />
}

export interface RadioProps extends React.ComponentProps<typeof RadioGroupPrimitive.Item> {
  label?: React.ReactNode
  description?: React.ReactNode
  /** Which side of the text the circle sits on. */
  placement?: 'left' | 'right'
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus' | 'pressed'
}

export function Radio({ className, label, description, placement = 'left', id, disabled, ...props }: RadioProps) {
  const autoId = React.useId()
  const radioId = id ?? autoId
  const descriptionId = description ? `${radioId}-description` : undefined

  const circle = (
    <RadioGroupPrimitive.Item
      id={radioId}
      data-slot="radio"
      aria-describedby={descriptionId}
      disabled={disabled}
      className={cn('peer satin-radio', className)}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="satin-radio-dot" />
    </RadioGroupPrimitive.Item>
  )

  if (!label && !description) return circle

  return (
    <div
      data-slot="radio-field"
      // The 16px circle sits on the middle of the label's first 20px line.
      className={cn('flex items-start gap-2 [&>:first-child]:mt-0.5', placement === 'right' && 'flex-row-reverse justify-between')}
    >
      {circle}
      {/* Disabled (on the item or the whole group) turns both texts text/subtle. */}
      <div className="grid min-w-0 gap-0.5 text-base text-text-default peer-data-disabled:text-text-subtle peer-data-disabled:[&_p]:text-text-subtle">
        {label && (
          <label htmlFor={radioId} className="leading-5 font-medium">
            {label}
          </label>
        )}
        {description && (
          <p id={descriptionId} className="leading-5 text-text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
