'use client'

import * as React from 'react'
import { NavArrowLeft, NavArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * Pagination, 1:1 with the uiKit `Pagination` set (4025:3807), two layouts:
 * - full: Previous and Next (tertiary md buttons with their arrows) around the page numbers,
 *   4px apart: the first and last page, the current one with `siblings` on each side, and an
 *   ellipsis where pages are skipped. Pages are 28px squares, radius 10, 13px text/muted;
 *   hover bg/hover and text/default; the current page bg/selected, text/default, medium.
 * - compact: icon-only Previous and Next around "Page 5 of 12" (13px, text/muted), 8px apart.
 *
 * Previous and Next are disabled at the ends. With `getHref`, every page is a link (for pages
 * the server renders); without it they are buttons that call `onPageChange`.
 *
 * A `nav` named "Pagination"; the current page has aria-current="page".
 */
export interface PaginationProps extends Omit<React.ComponentProps<'nav'>, 'children'> {
  /** How many pages there are. */
  pageCount: number
  /** The current page, from 1. */
  page?: number
  defaultPage?: number
  onPageChange?: (page: number) => void
  /** Each page's URL: pages become links. */
  getHref?: (page: number) => string
  layout?: 'full' | 'compact'
  /** Pages shown on each side of the current one (full layout). */
  siblings?: number
  previousLabel?: string
  nextLabel?: string
}

/** The pages to show, with 'gap' where an ellipsis stands for skipped ones. Always 2 × siblings + 5 slots when there are enough pages, so the bar keeps its width. */
export function paginationRange(page: number, pageCount: number, siblings = 1): (number | 'gap')[] {
  const slots = siblings * 2 + 5
  const span = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
  if (pageCount <= slots) return span(1, pageCount)
  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, pageCount)
  const showLeftGap = left > 3
  const showRightGap = right < pageCount - 2
  if (!showLeftGap) return [...span(1, slots - 2), 'gap', pageCount]
  if (!showRightGap) return [1, 'gap', ...span(pageCount - (slots - 3), pageCount)]
  return [1, 'gap', ...span(left, right), 'gap', pageCount]
}

const pageClass = cn(
  'grid h-control-height min-w-control-height place-items-center rounded-lg px-1.5 text-sm text-text-muted tabular-nums',
  'transition-colors duration-(--duration-fast) ease-(--ease-out) outline-none focus-visible:shadow-border-focus',
  'hover:bg-bg-hover hover:text-text-default',
  'aria-[current=page]:bg-bg-selected aria-[current=page]:font-medium aria-[current=page]:text-text-default',
)

export function Pagination({
  pageCount,
  page: pageProp,
  defaultPage = 1,
  onPageChange,
  getHref,
  layout = 'full',
  siblings = 1,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  className,
  'aria-label': ariaLabel = 'Pagination',
  ...props
}: PaginationProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultPage)
  const page = Math.min(Math.max(pageProp ?? uncontrolled, 1), Math.max(pageCount, 1))
  const go = (p: number) => {
    if (p < 1 || p > pageCount || p === page) return
    if (pageProp == null) setUncontrolled(p)
    onPageChange?.(p)
  }

  // A page as a link or a button; the same skin either way.
  const target = (p: number, className: string, children: React.ReactNode, extra?: React.HTMLAttributes<HTMLElement>) =>
    getHref ? (
      <a href={getHref(p)} className={className} onClick={() => go(p)} {...extra}>
        {children}
      </a>
    ) : (
      <button type="button" className={cn('cursor-pointer', className)} onClick={() => go(p)} {...extra}>
        {children}
      </button>
    )

  const step = (dir: -1 | 1) => {
    const to = page + dir
    const disabled = to < 1 || to > pageCount
    const label = dir < 0 ? previousLabel : nextLabel
    const icon = dir < 0 ? <NavArrowLeft aria-hidden /> : <NavArrowRight aria-hidden />
    const compact = layout === 'compact'
    const content = compact ? icon : dir < 0 ? <>{icon}{label}</> : <>{label}{icon}</>
    // A link can't be disabled: at the ends it is a disabled button instead.
    return getHref && !disabled ? (
      <Button asChild variant="tertiary" iconOnly={compact} aria-label={compact ? label : undefined}>
        <a href={getHref(to)} rel={dir < 0 ? 'prev' : 'next'} onClick={() => go(to)}>
          {content}
        </a>
      </Button>
    ) : (
      <Button variant="tertiary" iconOnly={compact} aria-label={compact ? label : undefined} disabled={disabled} onClick={() => go(to)}>
        {content}
      </Button>
    )
  }

  return (
    <nav data-slot="pagination" data-layout={layout} aria-label={ariaLabel} className={cn('flex items-center', className)} {...props}>
      {layout === 'compact' ? (
        <div className="flex items-center gap-2">
          {step(-1)}
          <span className="text-sm text-text-muted tabular-nums" aria-live="polite">
            Page {page} of {pageCount}
          </span>
          {step(1)}
        </div>
      ) : (
        <ul className="flex items-center gap-1">
          <li>{step(-1)}</li>
          {paginationRange(page, pageCount, siblings).map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} aria-hidden className="grid size-control-height place-items-center text-sm text-text-muted">
                …
              </li>
            ) : (
              <li key={p}>
                {target(p, pageClass, p, {
                  'aria-current': p === page ? 'page' : undefined,
                  'aria-label': `Page ${p}`,
                } as React.HTMLAttributes<HTMLElement>)}
              </li>
            ),
          )}
          <li>{step(1)}</li>
        </ul>
      )}
    </nav>
  )
}
