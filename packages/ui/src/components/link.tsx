'use client'

import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../lib/utils'
import { useSatinLabels } from './labels'

/**
 * Link: text that goes somewhere. Calm by default: the text colour with a border/strong
 * underline that takes the text colour on hover, so a paragraph full of links stays readable.
 * `brand` colours it for the one link that should stand out; `muted` is for footers and meta
 * lines and only underlines on hover. Focus draws the 2px focus ring around it.
 *
 * `external` (on by itself with `target="_blank"`) adds a 12px ↗ after the text, says
 * "(opens in a new tab)" to screen readers and sets `rel="noopener noreferrer"`.
 *
 * For a router's link (Next.js, React Router) pass `asChild` and put it inside: it gets the
 * styles, the router keeps the navigation.
 */
export interface LinkProps extends React.ComponentProps<'a'> {
  variant?: 'default' | 'brand' | 'muted'
  underline?: 'always' | 'hover' | 'none'
  external?: boolean
  asChild?: boolean
}

const variantClass = {
  default: 'text-text-default decoration-border-strong hover:decoration-current',
  brand: 'text-status-brand-fg decoration-status-brand-fg/40 hover:decoration-current',
  muted: 'text-text-muted decoration-current hover:text-text-default',
}

export function Link({
  variant = 'default',
  underline,
  external,
  asChild = false,
  target,
  rel,
  className,
  children,
  ...props
}: LinkProps) {
  const labels = useSatinLabels()
  const line = underline ?? (variant === 'muted' ? 'hover' : 'always')
  const isExternal = external ?? target === '_blank'
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      data-slot="link"
      data-variant={variant}
      target={target ?? (isExternal && !asChild ? '_blank' : undefined)}
      rel={rel ?? (isExternal ? 'noopener noreferrer' : undefined)}
      className={cn(
        'rounded-xs font-medium underline-offset-[3px] outline-none [text-decoration-thickness:1px]',
        'transition-[color,text-decoration-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
        'focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        line === 'always' && 'underline',
        line === 'hover' && 'no-underline hover:underline',
        line === 'none' && 'no-underline',
        variantClass[variant],
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {children}
          {isExternal && (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="ms-0.5 inline-block align-[-1px] rtl:-scale-x-100">
                <path d="M4 3H9V8M9 3L3 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ strokeWidth: 1.1 }} />
              </svg>
              <span className="sr-only">{` ${labels.opensInNewTab}`}</span>
            </>
          )}
        </>
      )}
    </Comp>
  )
}
