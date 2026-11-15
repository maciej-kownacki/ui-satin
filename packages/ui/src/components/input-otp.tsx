'use client'

import * as React from 'react'
import { CheckCircle } from 'iconoir-react'
import { cn } from '../lib/utils'
import { FieldChrome, useFieldChrome } from './select'

/**
 * InputOTP, 1:1 with the uiKit design (🆕 input otp & number): a one-time code as 36×36 cells,
 * 8px apart, in groups (3 + 3 by default) split by an 8px border/strong dash. Each cell wears the
 * field skin (bg/field, border/default, radius-lg, shadow xs); the cell the next digit goes into
 * gets the focus border and ring and a blinking caret while the field has focus. A digit is
 * text/base medium. With an error every cell turns action/destructive and the message replaces the
 * hint under the cells; label, hint and error sit like Input's. With `success` (the code checked
 * out) every cell's border turns status/green/fg and the message, in the same colour, leads with a
 * 16px check.
 *
 * The message never moves the cells: it is as wide as the cells (it wraps rather than widening
 * the field, which would shift a centred field sideways) and keeps a 20px line even while empty,
 * so swapping hint → "Checking…" → success or error leaves the code where it is.
 *
 * The field is as wide as its cells, so it centres wherever it is placed. Focus shows only on
 * the active cell: the real input carries no ring of its own.
 *
 * One real <input> lies over the cells (transparent text and caret), so typing, deleting, paste
 * and the browser's SMS autofill (`autocomplete="one-time-code"`) all work as in any field, and
 * screen readers hear one text box. Only digits by default (`pattern`); `onComplete` fires when
 * every cell is filled.
 *
 * Other props, `ref` included, go to that <input>; `className` styles the field around it.
 */
export interface InputOTPProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'defaultValue' | 'pattern' | 'type' | 'maxLength' | 'children'> {
  /** How many characters. */
  length?: number
  /** Cells per group; groups are split by a dash. 0 for one group. */
  groupSize?: number
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Every cell is filled. */
  onComplete?: (value: string) => void
  /** Which characters are allowed. Digits by default. */
  pattern?: RegExp
  label?: React.ReactNode
  hint?: React.ReactNode
  /** An error message (replaces the hint), or `true` to mark the cells invalid without one. */
  error?: React.ReactNode | boolean
  /** The code checked out: a message under the cells (replaces the hint), or `true` for green cells alone. Ignored while there is an error. */
  success?: React.ReactNode | boolean
  disabled?: boolean
  autoFocus?: boolean
  id?: string
  name?: string
  'aria-label'?: string
  className?: string
}

export function InputOTP({
  length = 6,
  groupSize = 3,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onComplete,
  pattern = /^\d$/,
  label,
  hint,
  error,
  success,
  disabled,
  autoFocus,
  id,
  name,
  className,
  'aria-describedby': describedByProp,
  ref,
  onChange,
  onFocus,
  onBlur,
  onSelect,
  ...props
}: InputOTPProps) {
  // The message under the cells is drawn here, so the chrome only gets whether there is an error.
  const chrome = useFieldChrome({ id, disabled, error: error ? true : undefined })
  const isError = typeof error === 'string' || React.isValidElement(error)
  const isSuccess = !chrome.invalid && Boolean(success)
  const successMessage = isSuccess && success !== true ? (success as React.ReactNode) : null
  const message = isError ? (error as React.ReactNode) : successMessage ?? (chrome.invalid ? null : hint)
  const messageId = message ? `${chrome.controlId}-message` : undefined
  const describedBy = [describedByProp, chrome.describedBy, messageId].filter(Boolean).join(' ') || undefined
  const [inner, setInner] = React.useState(defaultValue)
  const value = (valueProp ?? inner).slice(0, length)
  const [focused, setFocused] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  // The app's ref and ours, on the one <input>.
  const setInput = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  const set = (raw: string) => {
    const next = [...raw].filter((c) => pattern.test(c)).join('').slice(0, length)
    if (valueProp == null) setInner(next)
    onValueChange?.(next)
    if (next.length === length && next !== value) onComplete?.(next)
  }

  const active = Math.min(value.length, length - 1)
  const cells = Array.from({ length }, (_, i) => i)

  return (
    <FieldChrome label={label} chrome={chrome} className={cn('w-fit', className)}>
      {/* A code reads left to right in any page, digit by digit. */}
      <div
        data-slot="input-otp"
        dir="ltr"
        data-disabled={chrome.disabled || undefined}
        className={cn('relative flex w-fit items-center gap-2', chrome.disabled && 'opacity-50')}
      >
        {cells.map((i) => {
          const isActive = focused && i === active
          return (
            <React.Fragment key={i}>
              {groupSize > 0 && i > 0 && i % groupSize === 0 && (
                <span aria-hidden className="h-px w-2 shrink-0 bg-border-strong" />
              )}
              <span
                aria-hidden
                data-active={isActive || undefined}
                className={cn(
                  'relative grid size-9 shrink-0 place-items-center rounded-lg border bg-bg-field text-base leading-[21px] font-medium text-text-default',
                  '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
                  'transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
                  chrome.invalid ? 'border-action-destructive-bg' : isSuccess ? 'border-status-green-fg' : 'border-border-default',
                  // The cell taking the next digit: its edge doubles to 2px, in the field's state colour.
                  isActive &&
                    (chrome.invalid
                      ? '[box-shadow:0_0_0_1px_var(--action-destructive-bg)]'
                      : isSuccess
                        ? '[box-shadow:0_0_0_1px_var(--status-green-fg)]'
                        : 'border-border-focus [box-shadow:0_0_0_1px_var(--border-focus)]'),
                )}
              >
                {value[i] ?? ''}
                {isActive && value.length < length && (
                  <span data-slot="input-otp-caret" aria-hidden className="absolute h-[18px] w-px bg-text-default" />
                )}
              </span>
            </React.Fragment>
          )
        })}
        <input
          {...props}
          ref={setInput}
          id={chrome.controlId}
          name={name}
          value={value}
          onChange={(e) => {
            onChange?.(e)
            set(e.target.value)
          }}
          onFocus={(e) => {
            onFocus?.(e)
            setFocused(true)
            // Always type at the end: the cells show where.
            const end = e.currentTarget.value.length
            requestAnimationFrame(() => inputRef.current?.setSelectionRange(end, end))
          }}
          onBlur={(e) => {
            onBlur?.(e)
            setFocused(false)
          }}
          onSelect={(e) => {
            onSelect?.(e)
            const end = e.currentTarget.value.length
            if (e.currentTarget.selectionStart !== end) e.currentTarget.setSelectionRange(end, end)
          }}
          maxLength={length}
          inputMode={pattern.test('5') && !pattern.test('a') ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          disabled={chrome.disabled}
          aria-invalid={chrome.invalid || undefined}
          aria-describedby={describedBy}
          spellCheck={false}
          className="absolute inset-0 w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:none] disabled:cursor-not-allowed"
        />
      </div>
      {/* 0 wide and min-w-full: as wide as the cells, never wider; min-h-5 holds the line while empty. */}
      <p
        id={messageId}
        aria-live="polite"
        className={cn(
          'flex min-h-5 w-0 min-w-full items-start gap-1.5 text-sm leading-5',
          isError ? 'text-text-destructive' : successMessage ? 'text-status-green-fg' : 'text-text-muted',
        )}
      >
        {successMessage && <CheckCircle aria-hidden className="mt-0.5 size-4 shrink-0 [stroke-width:1.875]" />}
        {message}
      </p>
    </FieldChrome>
  )
}
