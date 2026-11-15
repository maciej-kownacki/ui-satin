'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { FieldDescription, FieldError, FormContext, RequiredMark, useFormContext, type FormContextValue } from './form-field'

/**
 * FieldGroup: fields or options that answer one question, under one legend: an address, a date
 * range, "Notify me about" with a list of checkboxes. It is a `<fieldset>`, so the legend names
 * the whole group for screen readers and `disabled` reaches every control in it.
 *
 * - `variant="fields"` (default) is a block of FormFields under a 16px heading; `columns` puts
 *   them side by side (City | Postcode) from the `sm` breakpoint up.
 * - `variant="choices"` is a list of Checkboxes, Switches or Radios under a label set like a
 *   FormField's, 12px apart, with one description and one error for the whole list.
 * - In a horizontal Form the legend takes the label column and the fields inside stack
 *   vertically next to it.
 * - `error` (or the Form's `errors[name]`) shows under the group and marks it invalid.
 */
export interface FieldGroupProps extends Omit<React.ComponentProps<'fieldset'>, 'children'> {
  legend: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  /** Picks the group's message out of the Form's `errors`. */
  name?: string
  required?: boolean
  variant?: 'fields' | 'choices'
  columns?: 1 | 2 | 3
  layout?: 'vertical' | 'horizontal'
  children: React.ReactNode
}

const columnClass = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }

export function FieldGroup({
  legend,
  description,
  error: ownError,
  name,
  required,
  variant = 'fields',
  columns = 1,
  layout: ownLayout,
  disabled: ownDisabled,
  className,
  children,
  ...props
}: FieldGroupProps) {
  const form = useFormContext()
  const id = React.useId()
  const error = ownError ?? (name ? form?.errors?.[name] : undefined)
  const layout = ownLayout ?? form?.layout ?? 'vertical'
  const disabled = ownDisabled ?? form?.disabled
  const invalid = Boolean(error)
  const horizontal = layout === 'horizontal'
  const choices = variant === 'choices'
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = invalid ? `${id}-error` : undefined

  // Fields inside a group stack under (or beside) its legend, never in a label column of their own.
  const inner = React.useMemo<FormContextValue>(
    () => ({ ...form, layout: 'vertical', disabled }),
    [form, disabled],
  )

  return (
    <fieldset
      data-slot="field-group"
      data-variant={variant}
      data-layout={layout}
      data-invalid={invalid || undefined}
      disabled={disabled}
      aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
      className={cn('m-0 min-w-0 border-0 p-0', className)}
      {...props}
    >
      {/* A floated legend lays out like any block, which a fieldset's own legend does not. */}
      <legend
        className={cn(
          // Logical: the legend column sits at the start side, the right in right-to-left.
          'float-start p-0 text-text-default',
          horizontal ? 'w-40' : 'w-full',
          choices ? 'text-sm leading-[18px] font-medium' : 'text-base font-medium',
          disabled && 'opacity-50',
        )}
      >
        <span className="flex items-start gap-0.5">
          {legend}
          {required && <RequiredMark />}
        </span>
        {description && (
          <FieldDescription id={descriptionId} className="mt-1 font-normal">
            {description}
          </FieldDescription>
        )}
      </legend>
      <div
        className={cn(
          'grid min-w-0',
          horizontal ? 'ms-46' : cn('clear-both', choices ? 'pt-2' : 'pt-4'),
          choices ? 'gap-3' : cn('gap-5', columnClass[columns]),
        )}
      >
        <FormContext.Provider value={inner}>{children}</FormContext.Provider>
        {invalid && <FieldError id={errorId} className={cn(columns > 1 && 'sm:col-span-full')}>{error}</FieldError>}
      </div>
    </fieldset>
  )
}
