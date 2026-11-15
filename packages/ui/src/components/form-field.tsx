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
 *
 * Inside a `Form` (form.tsx) a field takes the form's layout and disabled state, and with a
 * `name` it shows the form's `errors[name]` and names its control, so the form's fields are
 * set in one place. Its own props still win.
 */
export interface FormFieldContextValue {
  id: string
  /** The field's `name`, given to Input, Textarea and Select for a native submit. */
  name?: string
  describedBy?: string
  invalid: boolean
  disabled: boolean
  required: boolean
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

/**
 * What a Form (or a FieldGroup inside one) hands the fields in it. Defined here, not in form.tsx,
 * so a FormField works on its own and the form only adds to it.
 */
export interface FormContextValue {
  layout?: 'vertical' | 'horizontal'
  disabled?: boolean
  /** Error messages by field `name`. */
  errors?: Partial<Record<string, React.ReactNode>>
}

export const FormContext = React.createContext<FormContextValue | null>(null)

/** The size an InputGroup gives the fields in it (Input, Select), unless they set their own. */
export const FieldSizeContext = React.createContext<'sm' | 'md' | 'lg' | null>(null)

/** The layout, disabled state and errors of the surrounding Form, if any. */
export function useFormContext() {
  return React.useContext(FormContext)
}

/** The id, describedby, invalid, disabled and required of the surrounding FormField, if any. */
export function useFormField() {
  return React.useContext(FormFieldContext)
}

export interface FormFieldProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  label: React.ReactNode
  /** Names the control and picks this field's message out of the Form's `errors`. */
  name?: string
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
  name,
  error: ownError,
  layout: ownLayout,
  disabled: ownDisabled,
  required = false,
  htmlFor,
  className,
  children,
  ...props
}: FormFieldProps) {
  const form = useFormContext()
  const error = ownError ?? (name ? form?.errors?.[name] : undefined)
  const layout = ownLayout ?? form?.layout ?? 'vertical'
  const disabled = ownDisabled ?? form?.disabled ?? false
  const autoId = React.useId()
  const id = htmlFor ?? autoId
  const invalid = Boolean(error)
  const messageId = invalid ? `${id}-error` : description ? `${id}-description` : undefined

  const context = React.useMemo<FormFieldContextValue>(
    () => ({ id, name, describedBy: messageId, invalid, disabled, required }),
    [id, name, messageId, invalid, disabled, required],
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
          {required && <RequiredMark />}
        </label>
        <div className="flex w-full min-w-0 flex-1 flex-col gap-1.5">
          {children}
          {invalid ? (
            <FieldError id={messageId}>{error}</FieldError>
          ) : (
            description && (
              <FieldDescription id={messageId} className={cn(disabled && 'opacity-50')}>
                {description}
              </FieldDescription>
            )
          )}
        </div>
      </div>
    </FormFieldContext.Provider>
  )
}

/** @internal The required mark from Figma (the `sparkle 2` glyph in _label), 6px, in the label colour. */
export function RequiredMark() {
  return (
    <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M3.63636 2.18023L5.55372 1.41279L6 2.75581L4.04959 3.43605L5.27273 5.14535L4.18182 6L2.95868 4.20349L1.80165 6L0.694215 5.14535L1.91736 3.43605L0 2.75581L0.446281 1.41279L2.31405 2.18023V0H3.63636V2.18023Z" />
    </svg>
  )
}

/** @internal A field's or a group's error: Figma's 14px warning circle and the message, in red. */
export function FieldError({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <p id={id} className={cn('flex items-start gap-1.5 text-sm text-action-destructive-bg', className)}>
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
      <span>{children}</span>
    </p>
  )
}

/** @internal A field's or a group's description, muted. */
export function FieldDescription({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <p id={id} className={cn('text-sm text-text-muted', className)}>
      {children}
    </p>
  )
}
