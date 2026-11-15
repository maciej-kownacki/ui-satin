'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { useSatinLabels } from './labels'

/**
 * Alert: a message that stays on the page until it's dealt with (a toast is for what just
 * happened and goes away; a banner promotes). Built on the uiKit `Alert` (475:27871) that
 * DialogAlert draws inside dialogs, for anywhere on a page: above a form, at the top of a
 * settings section, in an empty table.
 *
 * - `intent`: neutral, info, success, warning or error, the status colours from the theme.
 * - `variant`: `soft` (default) fills it with the status background; `outline` is a card
 *   surface with a border, for an alert among other cards, where only the icon carries colour.
 * - A 16px status icon on the first line (`icon={false}` hides it, or pass your own), a 14px
 *   medium title and a 13px muted description; either can be left out.
 * - `action` holds a Button or a Link: on the right when there's only a title, under the
 *   description when there is one. `onDismiss` adds the close button.
 * - Errors and warnings are `role="alert"` (read out when they appear), the rest `role="status"`.
 */
export type AlertIntent = 'neutral' | 'info' | 'success' | 'warning' | 'error'

export interface AlertProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  intent?: AlertIntent
  variant?: 'soft' | 'outline'
  title?: React.ReactNode
  description?: React.ReactNode
  /** `false` hides the status icon; a node replaces it. */
  icon?: boolean | React.ReactNode
  /** A Button or Link, or a few in a fragment. */
  action?: React.ReactNode
  /** Shows the close button; called when it is pressed. */
  onDismiss?: () => void
}

const soft: Record<AlertIntent, string> = {
  neutral: 'bg-status-neutral-bg',
  info: 'bg-status-sky-bg',
  success: 'bg-status-green-bg',
  warning: 'bg-status-amber-bg',
  error: 'bg-status-red-bg',
}

const iconColor: Record<AlertIntent, string> = {
  neutral: 'text-status-neutral-fg',
  info: 'text-status-sky-fg',
  success: 'text-status-green-fg',
  warning: 'text-status-amber-fg',
  error: 'text-status-red-fg',
}

export function Alert({
  intent = 'neutral',
  variant = 'soft',
  title,
  description,
  icon = true,
  action,
  onDismiss,
  className,
  children,
  ...props
}: AlertProps) {
  const labels = useSatinLabels()
  const body = description ?? children
  const actionBelow = action && body
  return (
    <div
      role={intent === 'error' || intent === 'warning' ? 'alert' : 'status'}
      data-slot="alert"
      data-intent={intent}
      data-variant={variant}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-xl px-4 py-3',
        variant === 'soft' ? soft[intent] : 'border border-border-default bg-bg-card [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
        className,
      )}
      {...props}
    >
      {icon !== false && (
        // 16px on the middle of the title's 20px line.
        <span className={cn('mt-0.5 grid shrink-0 place-items-center [&_svg]:size-4', iconColor[intent])}>
          {icon === true ? <StatusIcon intent={intent} /> : icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {title && <p className="text-base leading-5 font-medium text-text-default">{title}</p>}
        {body && <div className="text-body text-text-muted">{body}</div>}
        {actionBelow && <div className="mt-2.5 flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      {action && !actionBelow && <div className="-my-1 flex shrink-0 items-center gap-2">{action}</div>}
      {onDismiss && (
        <Button variant="tertiary" size="xs" iconOnly aria-label={labels.dismiss} onClick={onDismiss} className="-my-0.5 -mr-1.5">
          <CloseIcon />
        </Button>
      )}
    </div>
  )
}

/** @internal The status glyphs from Figma (16px, 1.25 stroke), drawn in currentColor. Neutral uses the info glyph. */
export function StatusIcon({ intent }: { intent: AlertIntent }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <g stroke="currentColor" style={{ strokeWidth: 1.25 }} strokeLinecap="round" strokeLinejoin="round">
        {intent === 'success' ? (
          <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" />
        ) : (
          <>
            {intent === 'info' ? (
              <>
                <path d="M8 7.70494V10.6557" />
                <path d="M8 5.35022L8.0059 5.34366" />
              </>
            ) : (
              <>
                <path d="M8 5.34428V8.29506" />
                <path d="M8 10.6563L8.0059 10.6498" />
              </>
            )}
            <path d="M8 13.9015C11.2593 13.9015 13.9015 11.2593 13.9015 8C13.9015 4.74066 11.2593 2.09845 8 2.09845C4.74066 2.09845 2.09845 4.74066 2.09845 8C2.09845 11.2593 4.74066 13.9015 8 13.9015Z" />
          </>
        )}
      </g>
    </svg>
  )
}

/** The X from Figma's close button (`icon` 16px, 1.25 stroke). */
/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4.50551 11.4951L8.0006 8M8.0006 8L11.4957 4.50491M8.0006 8L4.50551 4.50491M8.0006 8L11.4957 11.4951"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

