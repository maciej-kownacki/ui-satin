'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Item: one row of a list. The thing almost every screen repeats: a person, a file, a project,
 * a setting, a search result, a notification. Left to right:
 *
 * - `icon` in a 32px muted tile (28 at sm), or `media` as it is (an Avatar, a thumbnail);
 * - `title` (13px medium) over `description` (13px muted), each on one line, cut with an ellipsis;
 *   `children` go under them for anything longer (Chips, a Progress);
 * - `meta` on the right in muted 13px: a time, a size, a Badge, a Kbd;
 * - `actions` at the far right: Buttons, a Switch, a DropdownMenu `⋯`.
 *
 * With `href` (or `onClick`) the row is a link (or a button) and the whole row is its target,
 * with a hover and a focus ring; `actions` stay their own controls on top of it. `selected`
 * marks the current row. Rows go in a `List`, or stand alone with `variant="outline"`.
 */
export interface ItemProps extends Omit<React.ComponentProps<'div'>, 'title' | 'onClick'> {
  title: React.ReactNode
  description?: React.ReactNode
  /** A glyph shown in a muted tile. */
  icon?: React.ReactNode
  /** Shown as is, in place of the tile: an Avatar, an image. */
  media?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  href?: string
  /** Link target, e.g. `_blank`. */
  target?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  selected?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
  /** `outline` draws a card border, for a row on its own. Rows in a List take the List's look. */
  variant?: 'plain' | 'outline'
}

interface ListContextValue {
  variant: 'plain' | 'divided' | 'card'
  size: 'sm' | 'md'
}

const ListContext = React.createContext<ListContextValue | null>(null)

export function Item({
  title,
  description,
  icon,
  media,
  meta,
  actions,
  href,
  target,
  onClick,
  selected = false,
  disabled = false,
  size: ownSize,
  variant = 'plain',
  className,
  children,
  ...props
}: ItemProps) {
  const list = React.useContext(ListContext)
  const size = ownSize ?? list?.size ?? 'md'
  const sm = size === 'sm'
  const interactive = (href !== undefined || onClick !== undefined) && !disabled
  // An li in a List; the ref types differ only by element, so it's typed as the div it is alone.
  const Root = (list ? 'li' : 'div') as 'div'
  // Edge to edge inside a divided list or a card, rounded on its own.
  const flush = list?.variant === 'divided' || list?.variant === 'card'

  // The title is the link or button; its ::after stretches over the row, so the row is the target.
  const target_ = 'outline-none after:absolute after:inset-0'
  const titleText = <span className="block truncate">{title}</span>
  const titleNode = href !== undefined && !disabled ? (
    <a href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} data-slot="item-target" aria-current={selected ? 'page' : undefined} className={cn(target_, 'no-underline text-inherit')}>
      {titleText}
    </a>
  ) : onClick && !disabled ? (
    <button type="button" data-slot="item-target" aria-pressed={selected || undefined} onClick={onClick} className={cn(target_, 'block w-full cursor-pointer text-left')}>
      {titleText}
    </button>
  ) : (
    titleText
  )

  return (
    <Root
      data-slot="item"
      data-size={size}
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        'relative flex min-w-0 items-center',
        sm ? 'min-h-10 gap-2.5 px-2 py-1.5' : 'min-h-14 gap-3 px-3 py-2.5',
        flush ? (list?.variant === 'card' ? (sm ? 'px-3' : 'px-4') : 'px-0') : 'rounded-lg',
        variant === 'outline' && !list && 'border border-border-default bg-bg-card [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
        'transition-colors duration-(--duration-fast) ease-(--ease-out)',
        interactive && 'hover:bg-bg-hover',
        interactive && flush && list?.variant === 'divided' && 'hover:bg-transparent [&:hover_[data-slot=item-title]]:underline',
        selected && 'bg-bg-selected hover:bg-bg-selected',
        // The focus ring of the stretched link, drawn on the row.
        'has-[[data-slot=item-target]:focus-visible]:[box-shadow:inset_0_0_0_2px_var(--action-focus-ring)]',
        disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {media ? (
        <span className="flex shrink-0 items-center">{media}</span>
      ) : icon ? (
        <span
          aria-hidden
          className={cn(
            'grid shrink-0 place-items-center rounded-lg bg-bg-muted text-text-muted [&_svg]:size-icon-size [&_svg]:[stroke-width:1.875]',
            sm ? 'size-7' : 'size-8',
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div data-slot="item-title" className="text-sm leading-5 font-medium text-text-default underline-offset-[3px]">
          {titleNode}
        </div>
        {description && <p className="truncate text-sm leading-5 text-text-muted">{description}</p>}
        {children && <div className="mt-1.5">{children}</div>}
      </div>
      {meta && <div className="shrink-0 text-sm text-text-muted tabular-nums">{meta}</div>}
      {actions && (
        // Above the stretched target, so they stay their own controls.
        <div className="relative z-10 flex shrink-0 items-center gap-1">{actions}</div>
      )}
    </Root>
  )
}

/**
 * List: Items under each other. `plain` (default) keeps them apart by 2px with rounded hovers,
 * for menus of links and search results; `divided` runs a rule between rows, edge to edge, for
 * feeds and settings; `card` puts the divided rows in a bordered card. `size` is passed to every
 * Item. It's a `ul`; give it an `aria-label` when the heading above doesn't name it.
 */
export interface ListProps extends React.ComponentProps<'ul'> {
  variant?: 'plain' | 'divided' | 'card'
  size?: 'sm' | 'md'
}

export function List({ variant = 'plain', size = 'md', className, ...props }: ListProps) {
  const context = React.useMemo(() => ({ variant, size }), [variant, size])
  return (
    <ListContext.Provider value={context}>
      <ul
        role="list"
        data-slot="list"
        data-variant={variant}
        className={cn(
          'm-0 flex w-full list-none flex-col p-0',
          variant === 'plain' && 'gap-0.5',
          variant !== 'plain' && 'divide-y divide-border-default',
          variant === 'card' &&
            'overflow-hidden rounded-xl border border-border-default bg-bg-card [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
          className,
        )}
        {...props}
      />
    </ListContext.Provider>
  )
}
