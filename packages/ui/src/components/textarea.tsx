import * as React from 'react'
import { cn } from '../lib/utils'
import { useFormField } from './form-field'

/**
 * Textarea, 1:1 with the uiKit `Textarea` set (3647:17812): the Input skin (surface fill,
 * border/default, radius-lg, shadow xs; border/strong on hover, border/focus and the focus
 * ring on focus, action/destructive/bg on error) at 96px tall with a resize grip. Above it a
 * label (medium 14/21) with an optional "(Optional)" in muted 13; under it a hint row: the
 * hint (muted) and, with `maxLength`, a counter (text/subtle) on the right. An error message
 * replaces the hint and turns the whole row action/destructive/bg. Disabled is bg/muted with
 * text/subtle and the whole field at 60%.
 *
 * `maxLength` drives the counter and is not enforced, so a pasted text can run over and show
 * it (134/120); pair it with `error` to say what to fix. The look is styles/components/
 * input.css (`.satin-field`) plus textarea.css.
 */
export interface TextareaProps extends Omit<React.ComponentProps<'textarea'>, 'onChange' | 'maxLength'> {
  label?: React.ReactNode
  /** Adds a muted "(Optional)" after the label. */
  optional?: boolean
  hint?: React.ReactNode
  /** An error message (replaces the hint), or `true` to mark the field invalid without one. */
  error?: React.ReactNode | boolean
  /** Shows a `length/maxLength` counter. */
  maxLength?: number
  onChange?: (value: string) => void
  /** Classes for the outer wrapper (label + field + hint row). `className` styles the field. */
  wrapperClassName?: string
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus'
}

export function Textarea({
  label,
  optional,
  hint,
  error,
  maxLength,
  className,
  wrapperClassName,
  id,
  disabled,
  required,
  value,
  defaultValue,
  onChange,
  'aria-describedby': ariaDescribedBy,
  'data-force': force,
  ...props
}: TextareaProps) {
  const field = useFormField()
  const autoId = React.useId()
  const textareaId = id ?? field?.id ?? autoId
  const isDisabled = disabled ?? field?.disabled ?? false
  const hasMessage = typeof error === 'string' || React.isValidElement(error)
  const invalid = Boolean(error) || (field?.invalid ?? false)
  const message = hasMessage ? error : hint

  const [uncontrolled, setUncontrolled] = React.useState(defaultValue != null ? String(defaultValue) : '')
  const text = value != null ? String(value) : uncontrolled

  const messageId = message ? `${textareaId}-hint` : undefined
  const counterId = maxLength != null ? `${textareaId}-counter` : undefined
  const describedBy =
    [ariaDescribedBy, field?.describedBy, messageId, counterId].filter(Boolean).join(' ') || undefined

  return (
    <div
      data-slot="textarea-wrapper"
      data-disabled={isDisabled || undefined}
      className={cn('satin-textarea-root grid w-full gap-2', wrapperClassName)}
    >
      {label && (
        <div className="flex items-center gap-1">
          <label htmlFor={textareaId} className="text-base leading-[21px] font-medium text-text-default">
            {label}
          </label>
          {optional && <span className="text-sm text-text-muted">(Optional)</span>}
        </div>
      )}
      <div className="relative flex">
        <textarea
          id={textareaId}
          data-slot="textarea"
          data-filled={text.length > 0 || undefined}
          data-invalid={invalid || undefined}
          data-disabled={isDisabled || undefined}
          data-force={force}
          className={cn('satin-field satin-textarea', className)}
          disabled={isDisabled}
          required={required ?? field?.required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            if (value == null) setUncontrolled(e.target.value)
            onChange?.(e.target.value)
          }}
          {...props}
        />
        {/* Figma's resizeHandle, 7px at 1px in text/subtle. */}
        <svg className="satin-textarea-grip" viewBox="0 0 7 7" fill="none" aria-hidden>
          <path d="M6.5 0.5L0.5 6.5M6.5 4L4 6.5" stroke="currentColor" strokeLinecap="round" />
        </svg>
      </div>
      {(message || maxLength != null) && (
        <div
          className={cn(
            'flex items-start gap-2 text-sm',
            hasMessage ? 'text-action-destructive-bg' : 'text-text-muted',
          )}
        >
          <p id={messageId} className="min-w-0 flex-1">
            {message}
          </p>
          {maxLength != null && (
            <p id={counterId} className={cn('shrink-0 whitespace-nowrap', !hasMessage && 'text-text-subtle')}>
              <span className="sr-only">Characters used: </span>
              {text.length}/{maxLength}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
