'use client'

import * as React from 'react'
import { NavArrowLeft, NavArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { SLIDE_MS, useSlidingIndicator } from './sliding-indicator'

/**
 * Pagination, 1:1 with the uiKit `Pagination` set (4025:3807), two layouts:
 * - full: Previous and Next (tertiary md buttons with their arrows) around the page numbers,
 *   4px apart: the first and last page, the current one with `siblings` on each side, and an
 *   ellipsis where pages are skipped. Pages are 28px squares, radius 10, 13px text/muted;
 *   hover bg/hover and text/default; the current page bg/selected, text/default, medium.
 * - compact: icon-only Previous and Next around "Page 5 of 12" (13px, text/muted), 8px apart.
 *
 * Moving between pages (`motion`), the pages keep their places and only their numbers change:
 * - scroll (default): the pages are a strip. Each page slides from where it was to its new place,
 *   a page coming into view slides out from under the ellipsis on the side the reader pages
 *   towards, one leaving slides under the other and fades, and the pill under the current
 *   page moves on the same 300 ms curve (sliding-indicator.tsx, shared with Tabs and the
 *   Segmented control). Nothing is clipped and no number changes in place.
 * - slide: the current page's bg/selected pill slides under the numbers to the new
 *   page, like the Segmented control's, 200 ms on ease-out; a number that changes in place
 *   fades out before the new one fades in.
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

/** The strip's move, ms, and one page's step along it (a 28px page and the 4px gap), px. */
const STRIP_MS = SLIDE_MS
const STEP_PX = 32

/**
 * A slot's number. When it changes, the old one stays on top of the new one for the length of
 * its exit, both in one grid cell, so the slot keeps the wider of the two and nothing jumps.
 */
function PageText({ text, dir, motion }: { text: string; dir: Dir; motion: 'fade' | 'scroll' | 'none' }) {
  const [state, setState] = React.useState({ text, old: null as string | null, dir, n: 0 })
  if (state.text !== text) setState({ text, old: motion === 'none' ? null : state.text, dir, n: state.n + 1 })
  const animate = motion !== 'none' && state.n > 0
  return (
    // Clipped to the wider number, so in the compact "Page 5 of 12" a moving number never runs
    // into the words around it.
    <span className="inline-grid overflow-hidden align-bottom">
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
    // Where every page is on screen right now (mid-move too), for the strip to move from.
    if (motion === 'scroll') snapshot()
    if (pageProp == null) setUncontrolled(p)
    onPageChange?.(p)
  }

  // Which way the reader is paging, for the scroll motion.
  const prevPage = React.useRef(page)
  const dir: Dir = page >= prevPage.current ? 'next' : 'prev'
  React.useEffect(() => {
    prevPage.current = page
  }, [page])

  // The pill under the current page slides to the new one (sliding-indicator.tsx); with
  // motion off it just moves.
  const listRef = React.useRef<HTMLUListElement>(null)
  const pill = useSlidingIndicator<HTMLLIElement>(listRef, '[aria-current="page"]', `${page}|${pageCount}|${layout}|${siblings}`, {
    animate: motion !== 'none',
  })
  const textMotion = motion === 'slide' ? 'fade' : 'none'

  /* ---- scroll: the pages are a strip that moves (FLIP) ---- */
  // Each page is its own element, keyed by its number. When the page changes, every page that
  // stays slides from where it was to where it now is; a page coming into view slides in from
  // the side the reader is paging towards, out from under the ellipsis; one leaving slides
  // the other way and fades as it goes under the other ellipsis. The pill under the current
  // page moves on the same curve, so a page sliding into it lands with it.
  const ghostRef = React.useRef<HTMLLIElement>(null)
  const before = React.useRef<Map<string, { x: number; node: HTMLElement }> | null>(null)
  function snapshot() {
    const list = listRef.current
    if (!list) return
    const base = list.getBoundingClientRect().left
    const map = new Map<string, { x: number; node: HTMLElement }>()
    list.querySelectorAll<HTMLElement>('[data-cell]').forEach((li) => {
      const face = li.firstElementChild as HTMLElement | null
      if (face) map.set(li.dataset.cell!, { x: li.getBoundingClientRect().left - base, node: face.cloneNode(true) as HTMLElement })
    })
    before.current = map
  }
  React.useLayoutEffect(() => {
    const prev = before.current
    before.current = null
    const list = listRef.current
    if (!prev || !list || motion !== 'scroll' || layout !== 'full') return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const sign = dir === 'next' ? 1 : -1
    const timing: KeyframeAnimationOptions = { duration: STRIP_MS, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    const seen = new Set<string>()
    list.querySelectorAll<HTMLElement>('[data-cell]').forEach((li) => {
      const key = li.dataset.cell!
      seen.add(key)
      li.getAnimations().forEach((a) => a.cancel())
      const from = prev.get(key)
      if (from) {
        const dx = from.x - li.offsetLeft
        if (Math.abs(dx) > 0.5) li.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], timing)
      } else {
        li.animate([{ transform: `translateX(${sign * STEP_PX}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], timing)
      }
    })
    // Pages that left: a copy of each, where it was, sliding off and fading.
    const layer = ghostRef.current
    if (!layer) return
    for (const [key, { x, node }] of prev) {
      if (seen.has(key)) continue
      node.removeAttribute('aria-current')
      node.style.cssText = `position:absolute;top:0;left:${x}px;margin:0`
      layer.appendChild(node)
      node
        .animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-sign * STEP_PX}px)`, opacity: 0 }], {
          ...timing,
          duration: STRIP_MS * 0.6,
        })
        .finished.then(
          () => node.remove(),
          () => node.remove(),
        )
    }
  }, [page, motion, layout, dir])

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
            Page <PageText text={String(page)} dir={dir} motion={motion === 'scroll' ? 'scroll' : textMotion} /> of {pageCount}
          </span>
          {step(1)}
        </div>
      ) : (
        <ul ref={listRef} className="relative flex items-center gap-1">
          <li
            ref={pill.ref}
            aria-hidden
            role="presentation"
            className="pointer-events-none absolute top-0 left-0 h-control-height rounded-lg bg-bg-selected opacity-0"
          />
          {/* Copies of the pages that just left, playing out; under the live pages. */}
          <li ref={ghostRef} aria-hidden role="presentation" className="pointer-events-none absolute inset-0 overflow-visible" />
          <li>{step(-1)}</li>
          {motion === 'scroll'
            ? // The strip: pages keyed by their number, the two ellipses by their side.
              paginationRange(page, pageCount, siblings).map((p, i, all) => {
                const key = p === 'gap' ? (i < all.length / 2 ? 'gap-start' : 'gap-end') : `p${p}`
                return (
                  <li key={key} data-cell={key} className="relative">
                    {p === 'gap' ? (
                      <span aria-hidden className={cn(pageClass, 'pointer-events-none')}>
                        …
                      </span>
                    ) : (
                      target(p, pageClass, p, {
                        'aria-current': p === page ? 'page' : undefined,
                        'aria-label': `Page ${p}`,
                      } as React.HTMLAttributes<HTMLElement>)
                    )}
                  </li>
                )
              })
            : // Slots keep their places (keyed by position), so paging changes numbers, not elements.
              paginationRange(page, pageCount, siblings).map((p, i) => {
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
