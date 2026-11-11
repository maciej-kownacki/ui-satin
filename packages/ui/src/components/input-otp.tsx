'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { FieldChrome, useFieldChrome } from './select'

/**
 * InputOTP, 1:1 with the uiKit design (🆕 input otp & number): a one-time code as 36×36 cells,
 * 8px apart, in groups (3 + 3 by default) split by an 8px border/strong dash. Each cell wears the
 * field skin (bg/field, border/default, radius-lg, shadow xs); the cell the next digit goes into
 * gets the focus border and ring and a blinking caret while the field has focus. A digit is
 * text/base medium. With an error every cell turns action/destructive and the message replaces the
 * hint under the cells; label, hint and error sit like Input's.
 *
 * The field is as wide as its cells, so it centres wherever it is placed. Focus shows only on
 * the active cell: the real input carries no ring of its own.
 *
 * One real <input> lies over the cells (transparent text and caret), so typing, deleting, paste
 * and the browser's SMS autofill (`autocomplete="one-time-code"`) all work as in any field, and
 * screen readers hear one text box. Only digits by default (`pattern`); `onComplete` fires when
 * every cell is filled.
 */
export interface InputOTPProps {
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
  disabled,
  autoFocus,
  id,
  name,
  className,
  ...props
}: InputOTPProps) {
  const chrome = useFieldChrome({ id, disabled, error, hint })
  const [inner, setInner] = React.useState(defaultValue)
  const value = (valueProp ?? inner).slice(0, length)
  const [focused, setFocused] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

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
      <div
        data-slot="input-otp"
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
                  chrome.invalid ? 'border-action-destructive-bg' : 'border-border-default',
                  isActive &&
                    (chrome.invalid
                      ? '[box-shadow:0_0_0_2px_var(--action-destructive-glow)]'
                      : 'border-border-focus [box-shadow:0_0_0_2px_var(--action-focus-ring)]'),
                )}
              >
                {value[i] ?? ''}
                {isActive && value.length < length && (
                  <span className="absolute h-[18px] w-px animate-[satin-caret_1s_steps(1)_infinite] bg-text-default" />
                )}
              </span>
            </React.Fragment>
          )
        })}
        <input
          ref={inputRef}
          id={chrome.controlId}
          name={name}
          value={value}
          onChange={(e) => set(e.target.value)}
          onFocus={(e) => {
            setFocused(true)
            // Always type at the end: the cells show where.
            const end = e.currentTarget.value.length
            requestAnimationFrame(() => inputRef.current?.setSelectionRange(end, end))
          }}
          onBlur={() => setFocused(false)}
          onSelect={(e) => {
            const end = e.currentTarget.value.length
            if (e.currentTarget.selectionStart !== end) e.currentTarget.setSelectionRange(end, end)
          }}
          maxLength={length}
          inputMode={pattern.test('5') && !pattern.test('a') ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          disabled={chrome.disabled}
          aria-invalid={chrome.invalid || undefined}
          aria-describedby={chrome.describedBy}
          aria-label={props['aria-label']}
          spellCheck={false}
          className="absolute inset-0 w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:none] disabled:cursor-not-allowed"
        />
      </div>
    </FieldChrome>
  )
}
