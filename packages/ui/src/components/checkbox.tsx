import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * Checkbox, 1:1 with the uiKit `checkboxBase` (849:57531) and `checkbox` (849:57577) sets:
 * a 16px box, radius-sm, with checked and indeterminate states and an optional label and
 * description on either side. The label is a real `<label>`, the description is wired up
 * with `aria-describedby`. The look of every state lives in styles/components.css.
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
    <div
      data-slot="checkbox-field"
      className={cn('flex items-start gap-2', placement === 'right' && 'flex-row-reverse justify-between')}
    >
      {box}
      <div className="grid gap-0.5 text-sm">
        {label && (
          <label htmlFor={boxId} className="leading-4 text-text-default">
            {label}
          </label>
        )}
        {description && (
          <p id={descriptionId} className="leading-[19.5px] text-text-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
