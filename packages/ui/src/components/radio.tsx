import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * Radio, 1:1 with the uiKit `_radioBase` (852:22410) and `Radio` (852:22426) sets: a 16px
 * circle, checked as a solid primary fill with a 6px dot, with an optional label (13/16,
 * text/default) and description (13/19.5, muted) 4px apart, 8px from the circle, on either
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
      className={cn('flex items-start gap-2', placement === 'right' && 'flex-row-reverse justify-between')}
    >
      {circle}
      {/* Disabled (on the item or the whole group) turns both texts text/subtle. */}
      <div className="grid min-w-0 gap-1 text-sm text-text-default peer-data-disabled:text-text-subtle peer-data-disabled:[&_p]:text-text-subtle">
        {label && (
          <label htmlFor={radioId} className="leading-4">
            {label}
          </label>
        )}
        {description && (
          <p id={descriptionId} className="text-text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
