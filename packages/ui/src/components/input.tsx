'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { FieldSizeContext, useFormField } from './form-field'

/**
 * Input, 1:1 with the uiKit `Input` set (820:51657): a label (medium), the field, and a hint
 * (13/19.5, muted) 8px apart. The label is 13px at every size. Three sizes: sm 28 with a 13px
 * value, md 32 and lg 36 with 14px (lg at radius-xl), fixed whatever the theme's body size; 12px side padding,
 * optional 16px leading and trailing icons 8px from the text.
 *
 * Placeholder is text/muted; a value is text/default and turns the icons from muted to
 * default (Figma's `filled`). `error` swaps the hint for the message in action/destructive/bg
 * and sets `aria-invalid`. Hover, focus and the error ring are styles/components/input.css.
 *
 * Inside a FormField, leave out `label`, `hint` and `error`: the field supplies the id,
 * description and invalid state.
 */
export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  label?: React.ReactNode
  hint?: React.ReactNode
  /** An error message (replaces the hint), or `true` to mark the field invalid without one. */
  error?: React.ReactNode | boolean
  size?: 'sm' | 'md' | 'lg'
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  /** Muted text inside the field before the value: `$`, `https://`. */
  leadingText?: React.ReactNode
  /** Muted text inside the field after the value: `USD`, `.satin.dev`, a counter. */
  trailingText?: React.ReactNode
  /** Classes for the outer wrapper (label + field + hint). `className` styles the field. */
  wrapperClassName?: string
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus'
}

export function Input({
  label,
  hint,
  error,
  size: ownSize,
  leadingIcon,
  trailingIcon,
  leadingText,
  trailingText,
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
  ref,
  ...props
}: InputProps) {
  const field = useFormField()
  const size = ownSize ?? React.useContext(FieldSizeContext) ?? 'md'
  const autoId = React.useId()
  const inputId = id ?? field?.id ?? autoId
  const isDisabled = disabled ?? field?.disabled ?? false
  const invalid = Boolean(error) || (field?.invalid ?? false)
  const message = typeof error === 'string' || React.isValidElement(error) ? error : hint
  const messageId = message ? `${inputId}-hint` : undefined
  const describedBy = [ariaDescribedBy, field?.describedBy, messageId].filter(Boolean).join(' ') || undefined

  // Figma's `filled`: track whether there is a value, controlled or not.
  const [uncontrolledFilled, setUncontrolledFilled] = React.useState(
    defaultValue != null && String(defaultValue).length > 0,
  )
  const filled = value != null ? String(value).length > 0 : uncontrolledFilled

  const inputRef = React.useRef<HTMLInputElement>(null)
  // Ours (a click on the padding focuses the input) and the app's (a form library's register()).
  const setInput = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  return (
    <div data-slot="input-wrapper" className={cn('grid w-full gap-2', wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm leading-[18px] font-medium text-text-default"
        >
          {label}
        </label>
      )}
      <div
        data-slot="input-field"
        data-size={size}
        data-filled={filled || undefined}
        data-invalid={invalid || undefined}
        data-disabled={isDisabled || undefined}
        data-force={force}
        className={cn('satin-field', className)}
        // Clicking the padding or an icon focuses the input; buttons in the icon slots keep their click.
        onMouseDown={(e) => {
          const target = e.target as HTMLElement
          if (target !== inputRef.current && !isDisabled && !target.closest('button, a, [role="button"]')) {
            e.preventDefault()
            inputRef.current?.focus()
          }
        }}
      >
        {leadingIcon && (
          <span className="satin-field-icon" aria-hidden>
            {leadingIcon}
          </span>
        )}
        {leadingText && (
          // 2px from the value, not the field's 8: `https://` reads as part of the address.
          <span data-slot="input-text" className="-me-1.5 shrink-0 whitespace-nowrap text-text-muted select-none">
            {leadingText}
          </span>
        )}
        <input
          ref={setInput}
          id={inputId}
          data-slot="input"
          className="satin-field-input"
          disabled={isDisabled}
          required={required ?? field?.required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            if (value == null) setUncontrolledFilled(e.target.value.length > 0)
            onChange?.(e)
          }}
          {...props}
          name={props.name ?? field?.name}
        />
        {trailingText && (
          <span data-slot="input-text" className="-ms-1.5 shrink-0 whitespace-nowrap text-text-muted select-none">
            {trailingText}
          </span>
        )}
        {trailingIcon && (
          // Not aria-hidden: the trailing slot may hold an action, such as a clear button.
          <span className="satin-field-icon">
            {trailingIcon}
          </span>
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={cn('text-sm', typeof error === 'string' || React.isValidElement(error) ? 'text-action-destructive-bg' : 'text-text-muted')}
        >
          {message}
        </p>
      )}
    </div>
  )
}
