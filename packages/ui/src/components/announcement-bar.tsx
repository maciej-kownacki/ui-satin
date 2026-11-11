'use client'

import * as React from 'react'
import { ArrowRight, Xmark } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { bannerMesh } from './banner'

/**
 * AnnouncementBar: one line of news across the top (or bottom) edge of the page, with a button
 * to read more and an optional close.
 *
 * `tone` sets the fill: primary (action/primary/bg, the default), inverse (action/inverse/bg) or
 * default (bg/card between two border/subtle rules). The bar is 44 high, the message centred in Body/lg with
 * the action after it, 12px apart: a secondary xs Button with a 14px arrow. The close button,
 * when `onDismiss` is passed, sits 12px from the right edge: a 28px square, the 16px cross at
 * 70% that turns full on hover over action/primary/bg-hover.
 *
 * `background="mesh"` adds the Banner's glow over the primary; `shimmer` sends a soft band of
 * light across now and then.
 *
 * `sticky` keeps it on the top or bottom edge of its scroll container as the page scrolls.
 * Long messages wrap; the close keeps its corner.
 */
export interface AnnouncementBarProps extends React.ComponentProps<'div'> {
  /** The button after the message; with `href` it renders as a link. */
  action?: { label: React.ReactNode; href?: string; onClick?: () => void }
  onDismiss?: () => void
  dismissLabel?: string
  /** Sticks to the top or bottom edge of its scroll container. */
  sticky?: 'top' | 'bottom'
  /**
   * `primary`: action/primary/bg (the default). `inverse`: action/inverse/bg, near-black in light
   * and near-white in dark. `default`: bg/card with border/subtle rules above and below, like a Banner.
   */
  tone?: 'primary' | 'inverse' | 'default'
  /** `mesh` lays the Banner's glow over the bar: lighter on primary and inverse, coloured on default. */
  background?: 'plain' | 'mesh'
  /** Now and then a soft band of light crosses the bar (off under reduced motion). */
  shimmer?: boolean
}

export function AnnouncementBar({
  action,
  onDismiss,
  dismissLabel = 'Dismiss announcement',
  sticky,
  tone = 'primary',
  background = 'plain',
  shimmer = false,
  children,
  className,
  ...props
}: AnnouncementBarProps) {
  const toneClass = {
    primary: 'bg-action-primary-bg text-action-primary-fg',
    inverse: 'bg-action-inverse-bg text-text-on-inverse',
    default: 'bg-bg-card text-text-default [box-shadow:inset_0_1px_0_var(--border-subtle),inset_0_-1px_0_var(--border-subtle)]',
  }[tone]
  const closeClass = {
    primary: 'text-action-primary-fg opacity-70 hover:bg-action-primary-bg-hover hover:opacity-100',
    inverse: 'text-text-on-inverse opacity-70 hover:bg-action-inverse-bg-hover hover:opacity-100',
    default: 'text-text-muted hover:bg-bg-hover hover:text-text-default',
  }[tone]
  const label = action && (
    <>
      {action.label}
      <ArrowRight aria-hidden />
    </>
  )

  return (
    <div
      role="region"
      aria-label="Announcement"
      data-slot="announcement-bar"
      data-tone={tone}
      className={cn(
        'relative isolate flex min-h-11 w-full items-center justify-center px-12 py-2 text-base',
        toneClass,
        shimmer && 'satin-sheen',
        sticky === 'top' && 'sticky top-0 z-40',
        sticky === 'bottom' && 'sticky bottom-0 z-40',
        className,
      )}
      {...props}
    >
      {background === 'mesh' && tone === 'default' && (
        <img
          src={bannerMesh.horizontal.one.light}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 size-full max-w-none object-cover mix-blend-multiply"
        />
      )}
      {background === 'mesh' && (
        <img
          src={bannerMesh.horizontal.one.dark}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 size-full max-w-none object-cover mix-blend-screen"
        />
      )}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <p className="m-0">{children}</p>
        {action &&
          (action.href ? (
            <Button asChild variant="secondary" size="xs" className="shrink-0 no-underline">
              <a href={action.href} onClick={action.onClick}>
                {label}
              </a>
            </Button>
          ) : (
            <Button variant="secondary" size="xs" className="shrink-0" onClick={action.onClick}>
              {label}
            </Button>
          ))}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          className={cn(
            'absolute top-1/2 right-3 grid size-7 -translate-y-1/2 place-items-center rounded-md outline-none',
            closeClass,
            'transition-[opacity,background-color] duration-(--duration-fast) ease-(--ease-out)',
            'focus-visible:opacity-100 focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          )}
        >
          <Xmark aria-hidden className="size-4 [stroke-width:1.875]" />
        </button>
      )}
    </div>
  )
}
