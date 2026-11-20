'use client'

import * as React from 'react'
import { CheckCircle } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { useSatinLabels } from './labels'
import { trackPointerModality } from './pointer-modality'
import { FieldChrome, useFieldChrome } from './select'

/**
 * InputOTP, 1:1 with the uiKit design (🆕 input otp & number): a one-time code as 36×36 cells,
 * 8px apart, in groups (3 + 3 by default) split by an 8px border/strong dash. Each cell wears the
 * field skin (bg/field, border/default, radius-lg, shadow xs); the cell the next digit goes into
 * gets the focus border and ring and a blinking caret while the field has focus; once every cell
 * is filled none is active (the last one shows the focus only when the keyboard tabs into a field
 * that's already full). A digit is
 * text/base medium. With an error every cell turns action/destructive and the message replaces the
 * hint under the cells; label, hint and error sit like Input's. With `success` (the code checked
 * out) every cell's border turns component/input-otp/success-border (status/green/fg in Light, the
 * Switch's mid green in Dark) and the message, in status/green/fg, leads with a
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
 * A code that arrives all at once (the suggestion, a paste, the browser's autofill) rolls into the
 * cells like slot-machine reels: each cell is a window on a short reel that runs down through
 * the digit before its own (7, then 8) and settles on it, softly blurred while it moves, 500ms on
 * ease-out, each cell 100ms after the one on its left, so no more than two move at once. No cell shows as active until the
 * last reel stops. Typed digits just appear.
 *
 * `onResend` adds a row 32px under the message, as wide as the cells (so a suggestion has room
 * between them): "Didn’t get it?" on the left
 * and, on the right, "Resend in 0:27" counting down from `resendAfter` seconds in text/muted, then
 * a tertiary xs "Resend code". A click calls `onResend`; when it returns a promise the button
 * shows its spinner until it settles, and once it's sent the countdown starts again. The row keeps
 * its 24px whatever it shows, and goes invisible (keeping its room) once the code checks out.
 *
 * `suggestion` is a code that came in by text or email (read with the WebOTP API, pushed by your
 * server, or in a prototype). It shows as a popover 16px under the cells, centred: a dark chip in
 * both themes (component/input-otp/suggestion-*: the inverse surface in Light, bg/popover with a
 * 1px border/default edge in Dark), radius-lg, shadow md and the top highlight, 32px tall, with a
 * 20px Messages mark drawn in small squares (two green message bubbles), the code in groups
 * (medium) and where it came from ("From Messages", at 64%). Pressed, it goes a step darker and
 * down to 97%, as a Button does. Choosing it fills the cells, as typing would, and fires
 * `onComplete`; the focus stays in the field and the popover fades out. It fades in from 4px above, shows only while the
 * field is being filled in (not once it holds that code, is complete, invalid or verified), hides
 * the hint it covers, and Esc puts it away until a different code arrives.
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
  /** Shows "Didn’t get it?" with a resend under the cells, open after `resendAfter` seconds. Return a promise to show a spinner until the code is sent. */
  onResend?: () => void | Promise<unknown>
  /** Seconds before the code can be sent again, counted from when the field appears and from each resend. */
  resendAfter?: number
  /** A code that arrived by text or email, offered in a popover under the cells; choosing it fills them. */
  suggestion?: string
  /** Where the suggested code came from, after it in the popover. Defaults to the `fromMessages` label. */
  suggestionFrom?: React.ReactNode
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
  onResend,
  resendAfter = 30,
  suggestion,
  suggestionFrom,
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
  onKeyDown,
  ...props
}: InputOTPProps) {
  const labels = useSatinLabels()
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
  // A full field has no cell to type into, so none shows as active once the code is in. Only when
  // the keyboard brings the focus to a field that's already full does the last cell show it.
  const [tabbedInFull, setTabbedInFull] = React.useState(false)
  React.useEffect(() => trackPointerModality(), [])
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
    setTabbedInFull(false)
    const next = [...raw].filter((c) => pattern.test(c)).join('').slice(0, length)
    if (valueProp == null) setInner(next)
    onValueChange?.(next)
    if (next.length === length && next !== value) onComplete?.(next)
  }

  const active = Math.min(value.length, length - 1)
  const cells = Array.from({ length }, (_, i) => i)

  // The suggested code, in the characters the field takes, and shown in the cells' groups.
  const suggested = suggestion ? [...suggestion].filter((c) => pattern.test(c)).join('').slice(0, length) : ''
  const [dismissed, setDismissed] = React.useState<string | null>(null)
  const showSuggestion =
    suggested.length === length &&
    suggested !== dismissed &&
    value !== suggested &&
    value.length < length &&
    !chrome.invalid &&
    !isSuccess &&
    !chrome.disabled
  const spaced = groupSize > 0 ? (suggested.match(new RegExp(`.{1,${groupSize}}`, 'g')) ?? []).join(' ') : suggested

  // A code that arrives at once rolls in from cell `from` on; `key` restarts the reels.
  const [roll, setRoll] = React.useState<{ from: number; key: number } | null>(null)
  const rollFrom = (from: number) => setRoll((r) => ({ from, key: (r?.key ?? 0) + 1 }))
  const stagger = 100
  // The popover stays a moment after it's chosen, to fade out.
  const [leaving, setLeaving] = React.useState<string | null>(null)
  const isLeaving = leaving !== null && leaving === suggested
  const choose = () => {
    setLeaving(suggested)
    rollFrom(0)
    set(suggested)
    inputRef.current?.focus()
  }

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
          // No active cell while the reels run: the ring would sit on a cell still rolling.
          const isActive = focused && !roll && i === active && (value.length < length || tabbedInFull)
          const rolling = roll !== null && i >= roll.from && value[i] != null
          return (
            <React.Fragment key={i}>
              {groupSize > 0 && i > 0 && i % groupSize === 0 && (
                <span aria-hidden className="h-px w-2 shrink-0 bg-border-strong" />
              )}
              <span
                aria-hidden
                data-active={isActive || undefined}
                className={cn(
                  'relative grid size-9 shrink-0 place-items-center overflow-clip rounded-lg border border-strong bg-bg-field text-base leading-[21px] font-medium text-text-default',
                  '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
                  'transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
                  chrome.invalid ? 'border-action-destructive-bg' : isSuccess ? 'border-component-input-otp-success-border' : 'border-border-default',
                  // The cell taking the next digit: its edge doubles to 2px, in the field's state colour.
                  isActive &&
                    (chrome.invalid
                      ? '[box-shadow:0_0_0_1px_var(--action-destructive-bg)]'
                      : isSuccess
                        ? '[box-shadow:0_0_0_1px_var(--component-input-otp-success-border)]'
                        : 'border-border-focus [box-shadow:0_0_0_1px_var(--border-focus)]'),
                )}
              >
                {rolling ? (
                  <Reel
                    key={roll.key}
                    char={value[i]}
                    delay={(i - roll.from) * stagger}
                    onEnd={i === value.length - 1 ? () => setRoll(null) : undefined}
                  />
                ) : (
                  (value[i] ?? '')
                )}
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
            // Pasted or autofilled: two or more characters at once roll in; a typed one just appears.
            const next = [...e.target.value].filter((c) => pattern.test(c)).join('').slice(0, length)
            if (next.length - value.length > 1) rollFrom(next.startsWith(value) ? value.length : 0)
            else setRoll(null)
            set(e.target.value)
          }}
          onFocus={(e) => {
            onFocus?.(e)
            setFocused(true)
            setTabbedInFull(
              e.currentTarget.value.length >= length && !document.documentElement.hasAttribute('data-satin-pointer'),
            )
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
          onKeyDown={(e) => {
            onKeyDown?.(e)
            if (e.key === 'Escape' && showSuggestion) setDismissed(suggested)
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
        {(showSuggestion || isLeaving) && (
          // Next after the input, so Tab reaches it; a click keeps the focus in the field.
          <button
            key={suggested}
            type="button"
            data-slot="input-otp-suggestion"
            data-leaving={isLeaving || undefined}
            tabIndex={isLeaving ? -1 : undefined}
            aria-hidden={isLeaving || undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={isLeaving ? undefined : choose}
            onAnimationEnd={(e) => {
              if (isLeaving && e.target === e.currentTarget) setLeaving(null)
            }}
            className={cn(
              isLeaving && 'pointer-events-none',
              'absolute inset-x-0 top-full z-10 mx-auto mt-4 flex h-8 w-fit items-center gap-2 rounded-lg ps-1.5 pe-3 text-sm whitespace-nowrap select-none',
              'bg-component-input-otp-suggestion-bg text-component-input-otp-suggestion-fg',
              '[box-shadow:0_8px_12px_0_var(--effect-shadow-md),0_1px_1.5px_0_var(--effect-shadow-ambient),inset_0_1px_0_0_var(--effect-highlight-top),inset_0_0_0_var(--border-width-strong)_var(--component-input-otp-suggestion-border)]',
              // Pressed like a Button: a step darker and down to 97%, and it stays down while it fades out.
              'transition-[background-color,scale] duration-(--duration-fast) ease-(--ease-out)',
              'satin-hover:bg-component-input-otp-suggestion-bg-hover',
              'satin-pressed:scale-[0.97] satin-pressed:bg-component-input-otp-suggestion-bg-pressed',
              isLeaving && 'scale-[0.97] bg-component-input-otp-suggestion-bg-pressed',
              'outline-none satin-focus:outline-2 satin-focus:outline-offset-2 satin-focus:outline-action-focus-ring satin-focus:outline-solid',
            )}
          >
            <MessagesMark />
            <span className="sr-only">{labels.useCode} </span>
            <span className="font-medium tabular-nums">{spaced}</span>{' '}
            <span className="text-component-input-otp-suggestion-fg/64">{suggestionFrom ?? labels.fromMessages}</span>
          </button>
        )}
      </div>
      {/* 0 wide and min-w-full: as wide as the cells, never wider; min-h-5 holds the line while empty. */}
      <p
        id={messageId}
        aria-live="polite"
        className={cn(
          'flex min-h-5 w-0 min-w-full items-start gap-1.5 text-sm leading-5',
          isError ? 'text-text-destructive' : successMessage ? 'text-status-green-fg' : 'text-text-muted',
          // The suggestion covers this line; the hint goes rather than peek out on either side.
          (showSuggestion || isLeaving) && 'invisible',
        )}
      >
        {successMessage && <CheckCircle aria-hidden className="mt-0.5 size-4 shrink-0 [stroke-width:1.875]" />}
        {message}
      </p>
      {onResend && <Resend onResend={onResend} after={resendAfter} hidden={isSuccess} disabled={chrome.disabled} />}
      {/* Always there, so screen readers are already listening when a code arrives. */}
      <span role="status" className="sr-only">
        {showSuggestion ? labels.codeReceived(spaced) : ''}
      </span>
    </FieldChrome>
  )
}

/**
 * The Messages mark in the code suggestion, 20px, drawn in small squares like the cells it fills:
 * two message bubbles on a 10 × 10 grid (1.5px squares, 0.5px apart), the deep green one behind
 * with its tail bottom-left and the light green one in front with its tail bottom-right, a row of
 * squares left out between them.
 */
const MARK = [
  '.bbbbb....',
  'bbbbbbb...',
  'bbbbbbb...',
  'bbbbbbb...',
  'bbbb......',
  'bbb..ffff.',
  'bb..ffffff',
  'b...ffffff',
  '.....fffff',
  '........ff',
]
function MessagesMark() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
      {MARK.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === '.' ? null : (
            <rect
              key={`${x}-${y}`}
              x={x * 2 + 0.25}
              y={y * 2 + 0.25}
              width="1.5"
              height="1.5"
              rx="0.25"
              fill={c === 'f' ? 'var(--component-input-otp-suggestion-icon)' : 'var(--component-input-otp-suggestion-icon-back)'}
            />
          ),
        ),
      )}
    </svg>
  )
}

/**
 * One cell's reel: the character over the one before it (for a digit; a letter gets a blank) and
 * a blank, top to bottom. It starts on the blank and runs down to the character.
 */
function Reel({ char, delay, onEnd }: { char: string; delay: number; onEnd?: () => void }) {
  const d = /\d/.test(char) ? Number(char) : null
  const before = (n: number) => (d === null ? '' : String((d - n + 10) % 10))
  return (
    <span
      aria-hidden
      data-slot="input-otp-reel"
      style={{ animationDelay: `${delay}ms` }}
      onAnimationEnd={onEnd}
      className="absolute inset-x-0 top-0 grid h-[300%] grid-rows-3"
    >
      <span className="grid place-items-center">{char}</span>
      <span className="grid place-items-center">{before(1)}</span>
      <span />
    </span>
  )
}

/** m:ss, "0:27". */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** "Didn’t get it?" and the resend: a countdown, then the button; sending again restarts it. */
function Resend({
  onResend,
  after,
  hidden,
  disabled,
}: {
  onResend: () => void | Promise<unknown>
  after: number
  hidden: boolean
  disabled: boolean
}) {
  const labels = useSatinLabels()
  const [left, setLeft] = React.useState(after)
  const [round, setRound] = React.useState(0)
  const [sending, setSending] = React.useState(false)
  // Counted from a timestamp, not by ticks, so a throttled background tab still lands on time.
  React.useEffect(() => {
    setLeft(after)
    const start = Date.now()
    const id = window.setInterval(() => {
      const next = Math.max(0, after - Math.floor((Date.now() - start) / 1000))
      setLeft(next)
      if (next === 0) window.clearInterval(id)
    }, 250)
    return () => window.clearInterval(id)
  }, [after, round])

  const resend = async () => {
    const result = onResend()
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      setSending(true)
      try {
        await result
      } catch {
        // Not sent: the button stays, to try again.
        setSending(false)
        return
      }
      setSending(false)
    }
    setRound((n) => n + 1)
  }

  return (
    <div
      data-slot="input-otp-resend"
      className={cn('mt-8 flex h-6 w-0 min-w-full items-center justify-between gap-2 text-sm leading-5 text-text-muted', hidden && 'invisible')}
    >
      <span>{labels.didntGetCode}</span>
      {left > 0 ? (
        <span className="tabular-nums">{labels.resendIn(clock(left))}</span>
      ) : (
        <Button variant="tertiary" size="xs" className="-me-2" loading={sending} disabled={disabled} onClick={resend}>
          {labels.resendCode}
        </Button>
      )}
    </div>
  )
}
