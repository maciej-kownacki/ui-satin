'use client'

import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * Switch, 1:1 with the uiKit `_switchBase` (3647:17617) and `Switch` (3647:17714) sets: a
 * 32 × 18 track (bg/pressed off, calm green on, each with its hover), a 14px white thumb,
 * a 2px focus ring, 50% when disabled. Label medium 13/20, description muted, 10px from
 * the track. Use it for settings that apply at once; use a checkbox inside a form.
 * The look of every state lives in styles/components.css.
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
      className={cn('peer satin-switch', className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="satin-switch-thumb" />
    </SwitchPrimitive.Root>
  )

  if (!label && !description) return control

  return (
    <div
      data-slot="switch-field"
      className={cn('flex items-start gap-2.5', placement === 'right' && 'flex-row-reverse justify-between')}
    >
      {control}
      <div className="grid gap-0.5 text-sm leading-5 peer-disabled:opacity-50">
        {label && (
          <label htmlFor={switchId} className="font-medium text-text-default">
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
