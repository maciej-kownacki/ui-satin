import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * Switch, from the uiKit `switch` page: a 32 × 18 track with an optional label and
 * description, the switch on the left or the right. Use it for settings that apply
 * at once; use a checkbox when the choice is submitted with a form.
 */
export interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  label?: React.ReactNode
  description?: React.ReactNode
  placement?: 'left' | 'right'
}

export function Switch({ className, label, description, placement = 'left', id, ...props }: SwitchProps) {
  const autoId = React.useId()
  const switchId = id ?? autoId
  const descriptionId = description ? `${switchId}-description` : undefined

  const control = (
    <SwitchPrimitive.Root
      id={switchId}
      data-slot="switch"
      aria-describedby={descriptionId}
      className={cn(
        'peer inline-flex h-[18px] w-8 shrink-0 items-center rounded-full p-0.5',
        'bg-bg-selected transition-[background-color,box-shadow] duration-(--duration-base) ease-(--ease-out)',
        'hover:bg-border-strong data-[state=checked]:bg-action-primary-bg data-[state=checked]:hover:bg-action-primary-bg-hover',
        'focus-visible:shadow-border-focus focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        label || description ? 'mt-px' : '',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-3.5 rounded-full bg-white shadow-sm',
          'transition-transform duration-(--duration-base) ease-(--ease-out)',
          'data-[state=checked]:translate-x-3.5 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  )

  if (!label && !description) return control

  return (
    <div
      data-slot="switch-field"
      className={cn('flex items-start gap-2.5', placement === 'right' && 'flex-row-reverse justify-between')}
    >
      {control}
      <div className="grid gap-0.5 peer-disabled:opacity-50">
        {label && (
          <label htmlFor={switchId} className="text-sm leading-5 font-medium text-text-default">
            {label}
          </label>
        )}
        {description && (
          <p id={descriptionId} className="text-sm leading-5 text-text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
