'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Form field, 1:1 with the uiKit `FormField` set (3649:17775): a label, a control slot, then a
 * description or, when `error` is set, an error message in its place. Vertical puts the label
 * 8px above the control; horizontal puts it in a 160px column, 24px to the left. Description
 * and error sit 6px under the control. Disabled dims the label and description to 50% and
 * disables the control.
 *
 * The control is wired through context: Input and Textarea pick up the field's id (so the
 * label points at them), `aria-describedby` (description or error), `aria-invalid` and
 * `disabled`. Any other control can read the same values with `useFormField()`.
 */
export interface FormFieldContextValue {
  id: string
  describedBy?: string
  invalid: boolean
  disabled: boolean
  required: boolean
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

/** The id, describedby, invalid, disabled and required of the surrounding FormField, if any. */
export function useFormField() {
  return React.useContext(FormFieldContext)
}

export interface FormFieldProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  label: React.ReactNode
  description?: React.ReactNode
  /** An error message. It replaces the description and marks the control invalid. */
  error?: React.ReactNode
  layout?: 'vertical' | 'horizontal'
  disabled?: boolean
  /** Shows the required mark after the label and sets `required` on the control. */
  required?: boolean
  /** The id given to the control. Generated when left out. */
  htmlFor?: string
  children: React.ReactNode
}

export function FormField({
  label,
  description,
  error,
  layout = 'vertical',
  disabled = false,
  required = false,
  htmlFor,
  className,
  children,
  ...props
}: FormFieldProps) {
  const autoId = React.useId()
  const id = htmlFor ?? autoId
  const invalid = Boolean(error)
  const messageId = invalid ? `${id}-error` : description ? `${id}-description` : undefined

  const context = React.useMemo<FormFieldContextValue>(
    () => ({ id, describedBy: messageId, invalid, disabled, required }),
    [id, messageId, invalid, disabled, required],
  )

  return (
    <FormFieldContext.Provider value={context}>
      <div
        data-slot="form-field"
        data-layout={layout}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        className={cn('flex w-full items-start', layout === 'vertical' ? 'flex-col gap-2' : 'gap-6', className)}
        {...props}
      >
        <label
          htmlFor={id}
          className={cn(
            'flex items-start gap-0.5 text-sm leading-[18px] font-medium text-text-default',
            layout === 'horizontal' && 'w-40 shrink-0',
            disabled && 'opacity-50',
          )}
        >
          {label}
          {required && (
            // The required mark from Figma (the `sparkle 2` glyph in _label), 6px, in the label colour.
            <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" aria-hidden className="shrink-0">
              <path d="M3.63636 2.18023L5.55372 1.41279L6 2.75581L4.04959 3.43605L5.27273 5.14535L4.18182 6L2.95868 4.20349L1.80165 6L0.694215 5.14535L1.91736 3.43605L0 2.75581L0.446281 1.41279L2.31405 2.18023V0H3.63636V2.18023Z" />
            </svg>
          )}
        </label>
        <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
          {children}
          {invalid ? (
            <p id={messageId} className="flex items-start gap-1.5 text-sm text-action-destructive-bg">
              {/* Figma's 14px warning circle at 1.09px. */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.09375"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="mt-[2.75px] shrink-0"
              >
                <path d="M7 4.67613V7.25806" />
                <path d="M7 9.32422L7.0059 9.31766" />
                <path d="M6.99995 12.1638C9.85184 12.1638 12.1638 9.85184 12.1638 6.99995C12.1638 4.14803 9.85184 1.83609 6.99995 1.83609C4.14803 1.83609 1.83609 4.14803 1.83609 6.99995C1.83609 9.85184 4.14803 12.1638 6.99995 12.1638Z" />
              </svg>
              <span>{error}</span>
            </p>
          ) : (
            description && (
              <p id={messageId} className={cn('text-sm text-text-muted', disabled && 'opacity-50')}>
                {description}
              </p>
            )
          )}
        </div>
      </div>
    </FormFieldContext.Provider>
  )
}
