'use client'

import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * Checkbox, 1:1 with the uiKit `checkboxBase` (849:57531) and `checkbox` (849:57577) sets:
 * a 16px box, radius-sm, with checked and indeterminate states and an optional label and
 * description on either side, both 14px whatever the theme's body size (label medium,
 * description regular). With a label or description the whole field is a `<label>`, so a
 * click anywhere on it (box, label, description) toggles the box, and hovering it hovers the
 * box; the label names the box, the description is wired up with `aria-describedby`. The look of every state lives in styles/components.css.
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
  const labelId = label ? `${boxId}-label` : undefined
  const descriptionId = description ? `${boxId}-description` : undefined

  const box = (
    <CheckboxPrimitive.Root
      id={boxId}
      data-slot="checkbox"
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      className={cn('peer satin-checkbox', className)}
      {...props}
    >
      {/* -1px so the 16px glyph sits on the box, not inside its 1px border. */}
      <CheckboxPrimitive.Indicator className="-m-px grid size-4 place-items-center">
        {/* The Check and Indeterminate glyphs from Figma, 16px at 1.25. */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          {props.checked === 'indeterminate' ? (
            <path d="M3.6 8H12.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          ) : (
            <path
              d="M3.33333 8.66667L6 11.3333L12.6667 4.66667"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )

  if (!label && !description) return box

  return (
    // The whole field is the <label>: the control, its label and its description all toggle it.
    <label
      htmlFor={boxId}
      data-slot="checkbox-field"
      // The 16px box sits on the middle of the label's first 20px line.
      className={cn('flex cursor-pointer items-start gap-2 has-disabled:cursor-not-allowed has-data-disabled:cursor-not-allowed [&>:first-child]:mt-0.5', placement === 'right' && 'flex-row-reverse justify-between')}
    >
      {box}
      <div className="grid gap-0.5 text-base">
        {label && (
          <span id={labelId} className="block leading-5 font-medium text-text-default">
            {label}
          </span>
        )}
        {description && (
          <span id={descriptionId} className="block leading-5 text-text-muted">
            {description}
          </span>
        )}
      </div>
    </label>
  )
}
