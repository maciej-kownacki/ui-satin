'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { FieldDescription, FormContext, useFormContext, type FormContextValue } from './form-field'

/**
 * Form: a `<form>` that lays out FormFields, FieldGroups and FormSections and sets them once.
 *
 * - `layout` places every field's label above its control (vertical) or in a 160px column to the
 *   left (horizontal, for settings pages); a field's own `layout` still wins.
 * - `errors` holds messages by field `name` (`{ email: 'Enter an email' }`); each FormField or
 *   FieldGroup with that `name` shows its message and marks its control invalid. Feed it from
 *   your own validation, a server response, or a form library (`errors.email?.message`).
 * - After a submit, and whenever errors appear where there were none, focus moves to the first
 *   invalid control, so a screen reader and the keyboard land on what needs fixing.
 * - `disabled` greys out and disables every field and button inside (a native fieldset), for a
 *   form that is saving or read-only.
 * - `onSubmitValues` hands over the values as an object (repeated names become arrays) and
 *   prevents the page reload; plain `onSubmit` works as usual.
 */
export type FormValues = Record<string, FormDataEntryValue | FormDataEntryValue[]>

export interface FormProps extends React.ComponentProps<'form'> {
  layout?: 'vertical' | 'horizontal'
  /** Error messages by field `name`. */
  errors?: FormContextValue['errors']
  disabled?: boolean
  /** Called on submit with the form's values; the default submit (a page load) is prevented. */
  onSubmitValues?: (values: FormValues, event: React.FormEvent<HTMLFormElement>) => void
}

/** The form's values as an object; a name that appears more than once (checkboxes) becomes an array. */
export function formValues(form: HTMLFormElement): FormValues {
  const values: FormValues = {}
  for (const [key, value] of new FormData(form)) {
    const prev = values[key]
    values[key] = prev === undefined ? value : Array.isArray(prev) ? [...prev, value] : [prev, value]
  }
  return values
}

const hasErrors = (errors?: FormContextValue['errors']) => !!errors && Object.values(errors).some(Boolean)

export function Form({
  layout = 'vertical',
  errors,
  disabled,
  onSubmit,
  onSubmitValues,
  noValidate = true,
  className,
  children,
  ref,
  ...props
}: FormProps) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [submits, setSubmits] = React.useState(0)
  const context = React.useMemo<FormContextValue>(() => ({ layout, disabled, errors }), [layout, disabled, errors])

  // Errors that are new (after a submit, or arriving from a server) take the focus to the first
  // invalid control; errors clearing as the user types never move it.
  const hadErrors = React.useRef(false)
  const lastSubmit = React.useRef(0)
  React.useEffect(() => {
    const now = hasErrors(errors)
    const submitted = submits !== lastSubmit.current
    if (now && (submitted || !hadErrors.current)) {
      // A field marked invalid, or the first control of an invalid FieldGroup (a fieldset can't be).
      const first = formRef.current?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-slot="field-group"][data-invalid] :is(input:not([type="hidden"]), button, select, textarea, [tabindex]:not([tabindex="-1"]))',
      )
      // Only once there's been a submit, so a form that opens with errors (a demo, a draft) doesn't grab focus.
      if (submits > 0) first?.focus()
    }
    hadErrors.current = now
    lastSubmit.current = submits
  }, [errors, submits])

  const setRefs = (node: HTMLFormElement | null) => {
    formRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  return (
    <FormContext.Provider value={context}>
      <form
        ref={setRefs}
        data-slot="form"
        data-layout={layout}
        noValidate={noValidate}
        onSubmit={(event) => {
          setSubmits((n) => n + 1)
          if (onSubmitValues) {
            event.preventDefault()
            onSubmitValues(formValues(event.currentTarget), event)
          }
          onSubmit?.(event)
        }}
        className={cn('w-full', className)}
        {...props}
      >
        {/* A fieldset carries `disabled` to every native control and button inside. */}
        <fieldset disabled={disabled} className="m-0 grid min-w-0 gap-6 border-0 p-0">
          {children}
        </fieldset>
      </form>
    </FormContext.Provider>
  )
}

/**
 * A titled part of a longer form (Profile, Notifications): a 16px title, an optional
 * description, then its fields. Sections after the first are set off by a rule.
 */
export interface FormSectionProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
}

export function FormSection({ title, description, className, children, ...props }: FormSectionProps) {
  const id = React.useId()
  return (
    <section
      aria-labelledby={`${id}-title`}
      data-slot="form-section"
      className={cn(
        'grid gap-5 not-first:border-t not-first:border-border-default not-first:pt-6',
        className,
      )}
      {...props}
    >
      <header className="grid gap-1">
        <h3 id={`${id}-title`} className="text-base font-medium text-text-default">
          {title}
        </h3>
        {description && <FieldDescription>{description}</FieldDescription>}
      </header>
      <div className="grid gap-5">{children}</div>
    </section>
  )
}

/**
 * The form's buttons, usually a ButtonGroup or a Cancel + Submit pair. `align="end"` (default)
 * puts them on the right; `start` lines them up with the controls, past the label column in a
 * horizontal form; `between` pushes the first child left (Delete) and the rest right.
 */
export interface FormActionsProps extends React.ComponentProps<'div'> {
  align?: 'start' | 'end' | 'between'
}

export function FormActions({ align = 'end', className, ...props }: FormActionsProps) {
  const form = useFormContext()
  return (
    <div
      data-slot="form-actions"
      className={cn(
        'flex flex-wrap items-center gap-2',
        align === 'end' && 'justify-end',
        align === 'between' && 'justify-end [&>:first-child]:me-auto',
        align === 'start' && form?.layout === 'horizontal' && 'ps-46',
        className,
      )}
      {...props}
    />
  )
}
