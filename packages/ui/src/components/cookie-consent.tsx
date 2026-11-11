'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * CookieConsent: what the site stores and the three answers, in one floating card at the
 * bottom of the page. bg/popover, border/subtle, radius-3xl, the shadcn lg shadow; 20 × 16 in.
 *
 * The message (Body/lg, text/muted) is kept to a narrow column so it reads in three short
 * lines; the actions sit to its right: Customize as a tertiary button in text/muted, then
 * Reject all as a rounded secondary button and Accept all as the rounded primary one. Below 640px the actions wrap under the message.
 *
 * `floating` pins it 16px above the bottom of the viewport, centred; leave it off to place the
 * card yourself. It is a labelled region, not a modal: the page stays usable behind it.
 */
export interface CookieConsentProps extends Omit<React.ComponentProps<'section'>, 'children'> {
  /** What the site stores and why. */
  children?: React.ReactNode
  onAccept?: () => void
  onReject?: () => void
  /** Shows Customize; open your settings from here. */
  onCustomize?: () => void
  acceptLabel?: string
  rejectLabel?: string
  customizeLabel?: string
  /** Fixed to the bottom of the viewport, centred, 16px up. */
  floating?: boolean
}

export function CookieConsent({
  children = "We use essential cookies to run this site. With your OK, we'd also use optional ones to remember settings and learn what helps.",
  onAccept,
  onReject,
  onCustomize,
  acceptLabel = 'Accept all',
  rejectLabel = 'Reject all',
  customizeLabel = 'Customize',
  floating = false,
  className,
  'aria-label': ariaLabel = 'Cookie consent',
  ...props
}: CookieConsentProps) {
  return (
    <section
      data-slot="cookie-consent"
      aria-label={ariaLabel}
      className={cn(
        'flex w-fit max-w-full flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl border border-border-subtle bg-bg-popover px-5 py-4 [box-shadow:0_1px_3px_0_var(--effect-shadow-ambient),0_16px_40px_-12px_var(--effect-shadow-lg)]',
        floating && 'fixed inset-x-4 bottom-4 z-50 mx-auto max-w-[calc(100vw-32px)]',
        className,
      )}
      {...props}
    >
      <p className="m-0 w-[280px] max-w-full min-w-0 shrink text-base text-text-muted">{children}</p>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {onCustomize && (
          <Button variant="tertiary" size="lg" shape="rounded" className="text-text-muted" onClick={onCustomize}>
            {customizeLabel}
          </Button>
        )}
        <Button variant="secondary" size="lg" shape="rounded" onClick={onReject}>
          {rejectLabel}
        </Button>
        <Button variant="primary" size="lg" shape="rounded" onClick={onAccept}>
          {acceptLabel}
        </Button>
      </div>
    </section>
  )
}
