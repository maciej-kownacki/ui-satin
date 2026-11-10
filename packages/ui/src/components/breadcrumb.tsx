'use client'

import * as React from 'react'
import { MoreHoriz, NavArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'
import { DropdownMenu, DropdownMenuItem } from './dropdown'

/**
 * Breadcrumb, 1:1 with the uiKit `Breadcrumb` set (4025:3711): the path to the current page,
 * items 4px apart with a 14px chevron (text/subtle) between them. An item is 13px text/muted
 * in 2px × 4px of padding, radius 6; it turns text/default on hover. The last item is the
 * current page: text/default, medium, not a link.
 *
 * An item can lead with a 14px `icon`, 4px before its label; usually the first one (Home, the
 * workspace). With `hideLabel` only the icon shows, and the label names it for screen readers.
 *
 * With more items than `maxItems`, the middle ones fold into a "…" button (24px) that lists
 * them in a Dropdown; the first item and the last `maxItems - 1` stay.
 *
 * A `nav` named "Breadcrumb" around an ordered list; the current page has aria-current="page".
 */
export interface BreadcrumbItem {
  label: string
  /** A 14px icon before the label, usually on the first item. */
  icon?: React.ReactNode
  /** Show only the icon; the label still names the item for screen readers. */
  hideLabel?: boolean
  /** Where it goes. Left out (or on the current page) it is plain text, or a button with `onSelect`. */
  href?: string
  onSelect?: () => void
}

export interface BreadcrumbProps extends Omit<React.ComponentProps<'nav'>, 'children'> {
  /** From the top level down; the last one is the current page. */
  items: BreadcrumbItem[]
  /** Fold the middle into "…" when there are more items than this. */
  maxItems?: number
}

const itemClass = cn(
  'inline-flex h-6 items-center gap-1 rounded-md px-1 text-sm leading-5 whitespace-nowrap text-text-muted',
  '[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
  'transition-colors duration-(--duration-fast) ease-(--ease-out) outline-none focus-visible:shadow-border-focus',
)
const linkClass = 'cursor-pointer hover:text-text-default'

function Separator() {
  return (
    <li role="presentation" aria-hidden className="flex text-text-subtle [&_svg]:size-3.5 [&_svg]:[stroke-width:1.875]">
      <NavArrowRight />
    </li>
  )
}

export function Breadcrumb({ items, maxItems, className, 'aria-label': ariaLabel = 'Breadcrumb', ...props }: BreadcrumbProps) {
  const fold = maxItems != null && maxItems >= 2 && items.length > maxItems
  const head = fold ? items.slice(0, 1) : items
  const hidden = fold ? items.slice(1, items.length - (maxItems - 1)) : []
  const tail = fold ? items.slice(items.length - (maxItems - 1)) : []
  const last = items.length - 1

  const crumb = (item: BreadcrumbItem, index: number) => {
    const current = index === last
    const content = item.icon ? (
      <>
        <span aria-hidden className="flex">
          {item.icon}
        </span>
        <span className={item.hideLabel ? 'sr-only' : undefined}>{item.label}</span>
      </>
    ) : (
      item.label
    )
    const el = current ? (
      <span aria-current="page" className={cn(itemClass, 'font-medium text-text-default')}>
        {content}
      </span>
    ) : item.href ? (
      <a href={item.href} onClick={item.onSelect} className={cn(itemClass, linkClass)}>
        {content}
      </a>
    ) : item.onSelect ? (
      <button type="button" onClick={item.onSelect} className={cn(itemClass, linkClass)}>
        {content}
      </button>
    ) : (
      <span className={itemClass}>{content}</span>
    )
    return <li className="flex">{el}</li>
  }

  return (
    <nav data-slot="breadcrumb" aria-label={ariaLabel} className={className} {...props}>
      <ol className="flex flex-wrap items-center gap-1">
        {head.map((item, i) => (
          <React.Fragment key={`h${i}`}>
            {i > 0 && <Separator />}
            {crumb(item, i)}
          </React.Fragment>
        ))}
        {fold && (
          <>
            <Separator />
            <li className="flex">
              <DropdownMenu
                aria-label="Hidden pages"
                align="start"
                trigger={
                  <button
                    type="button"
                    aria-label={`Show ${hidden.length} more`}
                    className={cn(itemClass, linkClass, 'w-6 justify-center px-0 hover:bg-bg-hover [&_svg]:size-4')}
                  >
                    <MoreHoriz aria-hidden />
                  </button>
                }
              >
                {hidden.map((item, i) => (
                  <DropdownMenuItem
                    key={i}
                    label={item.label}
                    icon={item.icon}
                    onSelect={() => {
                      item.onSelect?.()
                      if (item.href) window.location.assign(item.href)
                    }}
                  />
                ))}
              </DropdownMenu>
            </li>
            {tail.map((item, i) => (
              <React.Fragment key={`t${i}`}>
                <Separator />
                {crumb(item, items.length - tail.length + i)}
              </React.Fragment>
            ))}
          </>
        )}
      </ol>
    </nav>
  )
}
