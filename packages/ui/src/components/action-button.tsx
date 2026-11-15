'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { Button, type ButtonProps } from './button'
import { useSatinLabels } from './labels'
import { Spinner } from './spinner'

/**
 * ActionButton: a Button that runs something and shows how it went, in place. Three states:
 *
 * 1. idle: the label ("Submit" by default) with an arrow on the right;
 * 2. loading: from the click until `onAction`'s promise settles (at least `minLoading`, so a
 *    fast answer still reads as work), a Spinner in the arrow's place;
 * 3. success: in the same place, a checkmark that draws itself in, held for `resetAfter` ms,
 *    then the arrow comes back.
 *
 * The label stays as it is; only the icon slot changes, its three layers stacked on one 16px
 * cell and cross-fading (150ms), so the button never changes width. With `trailingIcon={null}`
 * there is no slot: the spinner and checkmark take the middle and the label keeps its room. If the promise rejects, the button goes straight back to idle and the
 * error is the app's to show (an Alert, a toast). While busy or done, clicks do nothing; focus
 * stays on the button and screen readers hear `aria-busy`, then "Done" (`done` in SatinLabels).
 *
 * Pass `state` to drive it yourself (a form library's submitting flag, a server push) instead.
 */
export type ActionButtonState = 'idle' | 'loading' | 'success'

export interface ActionButtonProps extends Omit<ButtonProps, 'loading' | 'onClick' | 'iconOnly' | 'asChild'> {
  /** Runs on click. The spinner stays until its promise settles. */
  onAction?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<unknown> | unknown
  /** Drive the state from outside instead. */
  state?: ActionButtonState
  onStateChange?: (state: ActionButtonState) => void
  /** Shortest time the spinner shows, in ms. */
  minLoading?: number
  /** How long the checkmark stays before the button is ready again, in ms; `null` keeps it. */
  resetAfter?: number | null
  /** Called when `onAction` rejects; without it the error is rethrown. */
  onError?: (error: unknown) => void
  /** The icon after the label; `null` for none. Defaults to an arrow. */
  trailingIcon?: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function ActionButton({
  onAction,
  state: controlled,
  onStateChange,
  onError,
  minLoading = 900,
  resetAfter = 1800,
  trailingIcon,
  onClick,
  children,
  className,
  ...props
}: ActionButtonProps) {
  const labels = useSatinLabels()
  const [own, setOwn] = React.useState<ActionButtonState>('idle')
  const state = controlled ?? own
  const alive = React.useRef(true)
  const reset = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  // Set synchronously on click, so a double click can't start the action twice.
  const busy = React.useRef(false)
  // Bumped on every success so the checkmark mounts afresh and draws in again.
  const [round, setRound] = React.useState(0)

  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      clearTimeout(reset.current)
    }
  }, [])

  const set = (next: ActionButtonState) => {
    if (!alive.current) return
    if (controlled === undefined) setOwn(next)
    if (next === 'success') setRound((r) => r + 1)
    onStateChange?.(next)
  }

  // Back to idle, from inside or outside: ready for the next click.
  React.useEffect(() => {
    if (state === 'idle') busy.current = false
  }, [state])

  // A controlled success also gets a fresh checkmark.
  React.useEffect(() => {
    if (controlled === 'success') setRound((r) => r + 1)
  }, [controlled])

  const run = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (state !== 'idle' || busy.current || event.defaultPrevented) return
    busy.current = true
    set('loading')
    const started = Date.now()
    try {
      await onAction?.(event)
      await wait(Math.max(0, minLoading - (Date.now() - started)))
      set('success')
      if (resetAfter !== null)
        reset.current = setTimeout(() => {
          busy.current = false
          set('idle')
        }, resetAfter)
    } catch (error) {
      busy.current = false
      set('idle')
      if (onError) onError(error)
      else throw error
    }
  }

  const layer = 'transition-opacity duration-(--duration-fast) ease-(--ease-out)'
  const icon =
    trailingIcon === undefined ? (
      // Iconoir's ArrowRight, drawn here so the button needs no icon package.
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 12H21M21 12L14 5M21 12L14 19" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      trailingIcon
    )

  const spinner = <Spinner size={props.size === 'xs' ? 'sm' : 'md'} label={null} />
  // Mounted from the first success on, so it fades out; a new key draws it in again.
  const check = round > 0 && (
    <svg key={round} data-slot="action-button-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3.33333 8.66667L6 11.3333L12.6667 4.66667"
        pathLength={1}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeWidth: 1.5 }}
      />
    </svg>
  )
  const show = (on: boolean) => cn('grid place-items-center', layer, !on && 'opacity-0')

  return (
    <>
      <Button
        {...props}
        data-slot="action-button"
        data-state={state}
        aria-busy={state === 'loading' || undefined}
        aria-disabled={state !== 'idle' || props['aria-disabled'] || undefined}
        className={cn('relative', state !== 'idle' && 'cursor-default', className)}
        onClick={run}
      >
        {icon !== null ? (
          <>
            {children ?? labels.submit}
            {/* The icon slot: arrow, spinner and checkmark stacked on one cell, one shown at a time. */}
            <span data-slot="action-button-icon" className="grid shrink-0 place-items-center *:col-start-1 *:row-start-1">
              <span className={show(state === 'idle')}>{icon}</span>
              <span aria-hidden className={show(state === 'loading')}>
                {spinner}
              </span>
              <span aria-hidden className={show(state === 'success')}>
                {check}
              </span>
            </span>
          </>
        ) : (
          <>
            {/* No icon: the label stays in the flow (invisible while busy), the states take the middle. */}
            <span className={cn('inline-flex items-center', layer, state !== 'idle' && 'opacity-0')}>{children ?? labels.submit}</span>
            <span aria-hidden className={cn('absolute inset-0', show(state === 'loading'))}>
              {spinner}
            </span>
            <span aria-hidden className={cn('absolute inset-0', show(state === 'success'))}>
              {check}
            </span>
          </>
        )}
      </Button>
      <span className="sr-only" aria-live="polite">
        {state === 'success' ? labels.done : ''}
      </span>
    </>
  )
}
