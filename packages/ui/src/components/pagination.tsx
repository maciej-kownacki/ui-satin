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
 * Moving between pages (`motion`), the pages keep their places and only their numbers change:
 * - scroll (default): the pill slides as in `slide`, and a number that changes in place moves
 *   out and the next one in along the way the reader pages (8px, 250 ms), so the row reads as
 *   a strip of pages scrolling under a still frame.
 * - slide: the current page's bg/selected pill slides under the numbers to the new
 *   page, like the Segmented control's, 200 ms on ease-out; a number that changes in place
 *   cross-fades.
 * - none: no motion; the current page simply takes the pill.
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
  /** How the row moves when the page changes. */
  motion?: 'slide' | 'scroll' | 'none'
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
  'relative z-10 grid h-control-height min-w-control-height place-items-center overflow-hidden rounded-lg px-1.5 text-sm text-text-muted tabular-nums',
  'transition-colors duration-(--duration-fast) ease-(--ease-out) outline-none focus-visible:shadow-border-focus',
  'hover:bg-bg-hover hover:text-text-default',
  'aria-[current=page]:font-medium aria-[current=page]:text-text-default aria-[current=page]:hover:bg-transparent',
)

type Dir = 'next' | 'prev'

/**
 * A slot's number. When it changes, the old one stays on top of the new one for the length of
 * its exit, both in one grid cell, so the slot keeps the wider of the two and nothing jumps.
 */
function PageText({ text, dir, motion }: { text: string; dir: Dir; motion: 'fade' | 'scroll' | 'none' }) {
  const [state, setState] = React.useState({ text, old: null as string | null, dir, n: 0 })
  if (state.text !== text) setState({ text, old: motion === 'none' ? null : state.text, dir, n: state.n + 1 })
  const animate = motion !== 'none' && state.n > 0
  return (
    <span className="inline-grid">
      {state.old != null && (
        <span
          key={`o${state.n}`}
          aria-hidden
          data-motion={motion}
          data-phase="out"
          data-dir={state.dir}
          className="satin-page-text col-start-1 row-start-1 text-center"
          onAnimationEnd={() => setState((s) => ({ ...s, old: null }))}
        >
          {state.old}
        </span>
      )}
      <span
        key={`n${state.n}`}
        data-motion={animate ? motion : undefined}
        data-phase={animate ? 'in' : undefined}
        data-dir={state.dir}
        className="satin-page-text col-start-1 row-start-1 text-center"
      >
        {state.text}
      </span>
    </span>
  )
}

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
  motion = 'scroll',
  className,
  'aria-label': ariaLabel = 'Pagination',
  ...props
}: PaginationProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultPage)
  const page = Math.min(Math.max(pageProp ?? uncontrolled, 1), Math.max(pageCount, 1))
  const go = (p: number) => {
    if (p < 1 || p > pageCount || p === page) return
    setAnimate(motion !== 'none')
    if (pageProp == null) setUncontrolled(p)
    onPageChange?.(p)
  }

  // Which way the reader is paging, for the scroll motion.
  const prevPage = React.useRef(page)
  const dir: Dir = page >= prevPage.current ? 'next' : 'prev'
  React.useEffect(() => {
    prevPage.current = page
  }, [page])

  // The pill under the current page: measured from the page itself, moved with a transform.
  const listRef = React.useRef<HTMLUListElement>(null)
  const [pill, setPill] = React.useState<{ x: number; width: number } | null>(null)
  const [animate, setAnimate] = React.useState(false)
  const measure = React.useCallback(() => {
    const list = listRef.current
    const el = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!list || !el) return setPill(null)
    setPill({ x: el.getBoundingClientRect().left - list.getBoundingClientRect().left, width: el.offsetWidth })
  }, [])
  React.useLayoutEffect(measure, [measure, page, pageCount, layout, siblings])
  React.useEffect(() => {
    const el = listRef.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure, layout])
  const textMotion = motion === 'scroll' ? 'scroll' : motion === 'slide' ? 'fade' : 'none'

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
            Page <PageText text={String(page)} dir={dir} motion={motion === 'scroll' ? 'scroll' : motion === 'slide' ? 'fade' : 'none'} /> of {pageCount}
          </span>
          {step(1)}
        </div>
      ) : (
        <ul ref={listRef} className="relative flex items-center gap-1">
          {pill && (
            <li
              aria-hidden
              role="presentation"
              className={cn(
                'pointer-events-none absolute top-0 left-0 h-control-height rounded-lg bg-bg-selected',
                animate && 'transition-[transform,width] duration-(--duration-base) ease-(--ease-out)',
              )}
              style={{ width: pill.width, transform: `translateX(${pill.x}px)` }}
            />
          )}
          <li>{step(-1)}</li>
          {/* Slots keep their places (keyed by position), so paging changes numbers, not elements. */}
          {paginationRange(page, pageCount, siblings).map((p, i) => {
            const gap = p === 'gap'
            // A slot is the same element whether it holds a page or the ellipsis, so a page
            // coming out from behind "…" (or going behind it) plays the same motion as a number.
            const text = <PageText text={gap ? '…' : String(p)} dir={dir} motion={textMotion} />
            return (
              <li key={i}>
                {gap
                  ? React.createElement(getHref ? 'a' : 'button', {
                      className: cn(pageClass, 'pointer-events-none'),
                      'aria-hidden': true,
                      tabIndex: -1,
                      ...(getHref ? {} : { type: 'button', disabled: true }),
                      children: text,
                    })
                  : target(p, pageClass, text, {
                      'aria-current': p === page ? 'page' : undefined,
                      'aria-label': `Page ${p}`,
                    } as React.HTMLAttributes<HTMLElement>)}
              </li>
            )
          })}
          <li>{step(1)}</li>
        </ul>
      )}
    </nav>
  )
}
