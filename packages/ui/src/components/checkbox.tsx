import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { Check, Minus } from 'iconoir-react'
import { cn } from '../lib/utils'

/**
 * Checkbox, from the uiKit `checkbox` page: a 16px box with checked and indeterminate
 * states, and an optional label and description on either side. The label is a real
 * `<label>`, the description is wired up with `aria-describedby`.
 */
export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  label?: React.ReactNode
  description?: React.ReactNode
  /** Which side of the text the box sits on. */
  placement?: 'left' | 'right'
}

export function Checkbox({ className, label, description, placement = 'left', id, ...props }: CheckboxProps) {
  const autoId = React.useId()
  const boxId = id ?? autoId
  const descriptionId = description ? `${boxId}-description` : undefined

  const box = (
    <CheckboxPrimitive.Root
      id={boxId}
      data-slot="checkbox"
      aria-describedby={descriptionId}
      className={cn(
        'peer grid size-4 shrink-0 place-items-center rounded-xs border border-border-strong bg-bg-field shadow-xs',
        'transition-[background-color,border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
        'hover:border-text-subtle focus-visible:shadow-xs-focus focus-visible:outline-none',
        'data-[state=checked]:border-transparent data-[state=checked]:bg-action-primary-bg data-[state=checked]:shadow-primary',
        'data-[state=indeterminate]:border-transparent data-[state=indeterminate]:bg-action-primary-bg data-[state=indeterminate]:shadow-primary',
        'data-[state=checked]:hover:bg-action-primary-bg-hover data-[state=indeterminate]:hover:bg-action-primary-bg-hover',
        'disabled:cursor-not-allowed disabled:opacity-50',
        label || description ? 'mt-px' : '',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center text-text-on-solid">
        {props.checked === 'indeterminate' ? (
          <Minus className="size-3" strokeWidth={2.25} aria-hidden />
        ) : (
          <Check className="size-3" strokeWidth={2.25} aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )

  if (!label && !description) return box

  return (
    <div
      data-slot="checkbox-field"
      className={cn('flex items-start gap-2', placement === 'right' && 'flex-row-reverse justify-between')}
    >
      {box}
      <div className="grid gap-0.5 peer-disabled:opacity-50">
        {label && (
          <label htmlFor={boxId} className="text-sm leading-[18px] font-medium text-text-default">
            {label}
          </label>
        )}
        {description && (
          <p id={descriptionId} className="text-sm leading-[18px] text-text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
