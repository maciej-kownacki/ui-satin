'use client'

import * as React from 'react'
import { Minus, Plus } from 'iconoir-react'
import { cn } from '../lib/utils'
import { useSatinLabels } from './labels'
import { FieldChrome, useFieldChrome } from './select'

/**
 * NumberInput, 1:1 with the uiKit design (🆕 input otp & number): Input's field skin and sizes
 * (sm 28, md 32, lg 36) with − and + at its ends and the value centred, tabular. The buttons are
 * 24px squares (radius-md, hover bg/hover, text/muted → text/default); at `min` or `max` the one
 * that would cross it fades to 40% and stops.
 *
 * It's a spinbutton: ArrowUp / ArrowDown step, PageUp / PageDown step ten times, Home / End jump
 * to `min` / `max`. Typing is free while focused; Enter or leaving the field clamps it, snaps it to
 * `step` and commits; Escape puts the last value back.
 *
 * Other props, `ref` included, go to the <input>; `className` styles the field around it.
 */
export interface NumberInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'defaultValue' | 'size' | 'min' | 'max' | 'step' | 'type' | 'children'> {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  size?: 'sm' | 'md' | 'lg'
  /** How the value reads in the field and to screen readers. */
  formatValue?: (value: number) => string
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode | boolean
  disabled?: boolean
  id?: string
  name?: string
  'aria-label'?: string
  /** Classes for the outer wrapper (label + field + hint). `className` styles the field. */
  wrapperClassName?: string
  className?: string
}

const decimals = (n: number) => (String(n).split('.')[1] ?? '').length

export function NumberInput({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  size = 'md',
  formatValue = String,
  label,
  hint,
  error,
  disabled,
  id,
  name,
  wrapperClassName,
  className,
  'aria-describedby': describedBy,
  onChange,
  onBlur,
  onKeyDown,
  ...props
}: NumberInputProps) {
  const chrome = useFieldChrome({ id, disabled, error, hint })
  const labels = useSatinLabels()
  const [inner, setInner] = React.useState(defaultValue)
  const value = valueProp ?? inner
  const [draft, setDraft] = React.useState<string | null>(null)

  const clamp = (n: number) => {
    const snapped = Number.isFinite(min) ? Math.round((n - min) / step) * step + min : Math.round(n / step) * step
    return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals(step)))
  }
  const commit = (n: number) => {
    const next = clamp(n)
    setDraft(null)
    if (next === value) return
    if (valueProp == null) setInner(next)
    onValueChange?.(next)
  }
  const by = (k: number) => commit(value + k * step)

  const atMin = value <= min
  const atMax = value >= max
  const btn = cn(
    'grid size-6 shrink-0 place-items-center rounded-md text-text-muted outline-none',
    'transition-[background-color,color,opacity] duration-(--duration-fast) ease-(--ease-out)',
    'hover:bg-bg-hover hover:text-text-default focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
    'disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:[stroke-width:1.875]',
  )

  return (
    <FieldChrome label={label} chrome={chrome} className={wrapperClassName}>
      <div
        data-slot="number-input"
        data-size={size}
        data-filled
        data-invalid={chrome.invalid || undefined}
        data-disabled={chrome.disabled || undefined}
        className={cn('satin-field gap-1 px-1', className)}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={labels.decrease}
          aria-controls={chrome.controlId}
          disabled={chrome.disabled || atMin}
          onClick={() => by(-1)}
          className={btn}
        >
          <Minus aria-hidden />
        </button>
        <input
          {...props}
          id={chrome.controlId}
          name={name}
          role="spinbutton"
          inputMode="decimal"
          aria-valuenow={value}
          aria-valuemin={Number.isFinite(min) ? min : undefined}
          aria-valuemax={Number.isFinite(max) ? max : undefined}
          aria-valuetext={formatValue(value)}
          aria-invalid={chrome.invalid || undefined}
          aria-describedby={[describedBy, chrome.describedBy].filter(Boolean).join(' ') || undefined}
          disabled={chrome.disabled}
          value={draft ?? formatValue(value)}
          onChange={(e) => {
            onChange?.(e)
            setDraft(e.target.value)
          }}
          onBlur={(e) => {
            onBlur?.(e)
            if (draft != null) commit(Number(draft.replace(',', '.').replace(/[^\d.-]/g, '')) || 0)
          }}
          onKeyDown={(e) => {
            // The app's handler runs first; `preventDefault()` there skips the spinbutton keys.
            onKeyDown?.(e)
            if (e.defaultPrevented) return
            const keys: Record<string, () => void> = {
              ArrowUp: () => by(1),
              ArrowDown: () => by(-1),
              PageUp: () => by(10),
              PageDown: () => by(-10),
              Home: () => Number.isFinite(min) && commit(min),
              End: () => Number.isFinite(max) && commit(max),
              Enter: () => draft != null && commit(Number(draft.replace(',', '.').replace(/[^\d.-]/g, '')) || 0),
              Escape: () => setDraft(null),
            }
            if (keys[e.key]) {
              e.preventDefault()
              keys[e.key]()
            }
          }}
          className="satin-field-input text-center tabular-nums"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={labels.increase}
          aria-controls={chrome.controlId}
          disabled={chrome.disabled || atMax}
          onClick={() => by(1)}
          className={btn}
        >
          <Plus aria-hidden />
        </button>
      </div>
    </FieldChrome>
  )
}
