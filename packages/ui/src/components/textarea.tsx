'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { useFormField } from './form-field'
import { useSatinLabels } from './labels'

/**
 * Textarea, 1:1 with the uiKit `Textarea` set (3647:17812): the Input skin (surface fill,
 * border/default, radius-lg, shadow xs; border/strong on hover, border/focus and the focus
 * ring on focus, action/destructive/bg on error) at 96px tall with a resize grip. Above it a
 * label (medium 13/18) with an optional "(Optional)" in muted 13; under it a hint row: the
 * hint (muted) and, with `maxLength`, a counter (text/subtle) on the right. An error message
 * replaces the hint and turns the whole row action/destructive/bg. Disabled is bg/muted with
 * text/subtle and the whole field at 60%.
 *
 * `maxLength` drives the counter and is not enforced, so a pasted text can run over and show
 * it (134/120); pair it with `error` to say what to fix. The look is styles/components/
 * input.css (`.satin-field`) plus textarea.css.
 *
 * `underlay` is drawn under the text, inside the field: `usePromptMentions().overlay`, the fills
 * of @mention tokens. With it the field's fill moves to a layer of its own under the underlay and
 * the textarea turns transparent; its border, focus ring and shadow stay on the textarea.
 *
 * Other props, `ref` included, go to the `textarea`.
 */
export interface TextareaProps extends Omit<React.ComponentProps<'textarea'>, 'onChange' | 'maxLength'> {
  label?: React.ReactNode
  /** Adds a muted "(Optional)" after the label: the `optional` label. */
  optional?: boolean
  hint?: React.ReactNode
  /** An error message (replaces the hint), or `true` to mark the field invalid without one. */
  error?: React.ReactNode | boolean
  /** Shows a `length/maxLength` counter. */
  maxLength?: number
  /** The new text, and the change event for code that needs the caret or input method state (`usePromptMentions`). */
  onChange?: (value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void
  /**
   * Drawn under the text, inside the field and unclipped: `usePromptMentions().overlay`. The
   * field's fill moves to a layer under it and the textarea turns transparent.
   */
  underlay?: React.ReactNode
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
  underlay,
  'aria-describedby': ariaDescribedBy,
  'data-force': force,
  ...props
}: TextareaProps) {
  const labels = useSatinLabels()
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
          <label htmlFor={textareaId} className="text-sm leading-[18px] font-medium text-text-default">
            {label}
          </label>
          {optional && <span className="text-sm text-text-muted">{labels.optional}</span>}
        </div>
      )}
      <div className="relative flex">
        {underlay != null && (
          <>
            {/* The field's fill, under the underlay; the textarea over both is transparent. */}
            <span
              aria-hidden
              data-slot="textarea-fill"
              data-disabled={isDisabled || undefined}
            />
            {underlay}
          </>
        )}
        <textarea
          id={textareaId}
          data-slot="textarea"
          data-filled={text.length > 0 || undefined}
          data-invalid={invalid || undefined}
          data-disabled={isDisabled || undefined}
          data-force={force}
          data-underlay={underlay != null || undefined}
          className={cn('satin-field satin-textarea', className)}
          disabled={isDisabled}
          required={required ?? field?.required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            if (value == null) setUncontrolled(e.target.value)
            onChange?.(e.target.value, e)
          }}
          {...props}
          name={props.name ?? field?.name}
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
            hasMessage ? 'text-text-destructive' : 'text-text-muted',
          )}
        >
          <p id={messageId} className="min-w-0 flex-1">
            {message}
          </p>
          {maxLength != null && (
            <CharacterCount
              id={counterId}
              count={text.length}
              max={maxLength}
              className={hasMessage ? 'text-text-destructive' : undefined}
            />
          )}
        </div>
      )}
    </div>
  )
}

export interface CharacterCountProps extends React.ComponentProps<'p'> {
  /** The characters so far. */
  count: number
  /** The limit. With it the count reads "134/120"; without it, "948 characters". */
  max?: number
}

/**
 * A character counter, the one under Textarea: "134/120" against a limit, in text/destructive
 * once over it, with "Characters used:" before it for screen readers; or, with no limit, the
 * count in words ("948 characters", the `characterCount` label, the number written in
 * `dateLocale`). Muted 14px by default, set to stay on one line at the end of a hint row.
 *
 * It isn't a live region (it changes on every key); point the field's `aria-describedby` at its
 * `id`. Other props, `ref` included, go to the `p`.
 */
export function CharacterCount({ count, max, className, ...props }: CharacterCountProps) {
  const labels = useSatinLabels()
  const over = max != null && count > max
  return (
    <p className={cn('shrink-0 text-sm whitespace-nowrap text-text-muted', className, over && 'text-text-destructive')} {...props}>
      {max != null ? (
        <>
          <span className="sr-only">{labels.charactersUsed}: </span>
          {count}/{max}
        </>
      ) : (
        labels.characterCount(count, new Intl.NumberFormat(labels.dateLocale).format(count))
      )}
    </p>
  )
}
