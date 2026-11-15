'use client'

import * as React from 'react'
import { Collapsible, Direction, Slot, Tooltip } from 'radix-ui'
import { NavArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'

/**
 * Sidebar, 1:1 with the uiKit sidebar sets: `sidebar/navigation` (0:3358), `sidebar/groupHeader`
 * (3468:18403) and `sidebar/subItem` (3468:18360).
 *
 * - `SidebarItem` is a 32px link row: 14px icon, medium 13/16 label in text/muted, radius-lg,
 *   8px padding. Hover fills bg/muted; the current page fills border/input and turns the label
 *   and icon text/default. `count` adds a red 16px counter; `iconOnly` is the 32 × 32 rail with
 *   the label in a tooltip.
 * - `SidebarGroup` is a collapsible group: the header row (12px padding, icon, label in
 *   text/default, a plain count, chevron right → down) and its `SidebarSubItem`s.
 * - `SidebarSubItem` is a regular 13px row whose text starts in line with the group label
 *   (34px in). Hover bg/muted, active bg/selected, disabled 50%.
 * - `SidebarSubGroup` is a sub-item that holds sub-items of its own (Chart → Bar chart,
 *   Channel chart): the same row with a chevron on the right, folding open and shut like the
 *   group (satin-expand, the chevron turning right → down). Its sub-items start 12px further
 *   in (46px). It opens on its own when one of them is the current page, and its label turns
 *   text/default while it holds the current page.
 *
 * Rows sit 2px apart. Focus draws the 1px border/focus outline Figma shows on the focus
 * variants, inset so the row doesn't move. Every state also answers to `data-force`.
 */

const rowFocus =
  'outline-none satin-focus:[box-shadow:inset_0_0_0_1px_var(--border-focus)]'

export interface SidebarProps extends React.ComponentProps<'nav'> {}

/** The navigation landmark. Name it with `aria-label` when a page has more than one nav. */
export function Sidebar({ className, ...props }: SidebarProps) {
  return <nav data-slot="sidebar" className={cn('flex flex-col gap-0.5', className)} {...props} />
}

export interface SidebarItemProps extends Omit<React.ComponentProps<'a'>, 'children'> {
  label: string
  icon?: React.ReactNode
  /** The current page. Sets `aria-current="page"`. */
  active?: boolean
  /** Unread or pending work. Hidden at 0. */
  count?: number
  /** The collapsed rail: icon only, label in a tooltip. */
  iconOnly?: boolean
  disabled?: boolean
  /** Render your router's link instead of `<a>`. */
  asChild?: boolean
  children?: React.ReactNode
}

export function SidebarItem({
  className,
  label,
  icon,
  active = false,
  count,
  iconOnly = false,
  disabled = false,
  asChild = false,
  href,
  children,
  ...props
}: SidebarItemProps) {
  const Comp = asChild ? Slot.Root : 'a'
  const showCount = typeof count === 'number' && count > 0
  // The tooltip opens away from the sidebar: to its left in right-to-left.
  const dir = Direction.useDirection()

  const row = (
    <Comp
      data-slot="sidebar-item"
      data-active={active || undefined}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      aria-label={iconOnly ? (showCount ? `${label}, ${count}` : label) : undefined}
      href={disabled ? undefined : href}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        'flex h-8 shrink-0 items-center gap-2 rounded-lg px-2 text-sm leading-4 font-medium tracking-normal text-text-muted no-underline select-none',
        'transition-[background-color,color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
        '[&_svg]:size-icon-size-sm [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
        'not-data-active:satin-hover:bg-bg-muted',
        rowFocus,
        'data-active:bg-border-input data-active:text-text-default',
        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
        iconOnly && 'relative size-8 justify-center px-0',
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {icon}
          {!iconOnly && <span className="min-w-0 flex-1 truncate">{label}</span>}
          {showCount && !iconOnly && <SidebarCount count={count} />}
          {showCount && iconOnly && (
            <span aria-hidden className="absolute end-1 top-1 size-1.5 rounded-full bg-action-destructive-bg" />
          )}
        </>
      )}
    </Comp>
  )

  if (!iconOnly) return row
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{row}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={dir === 'rtl' ? 'left' : 'right'}
            sideOffset={6}
            collisionPadding={8}
            className="z-50 rounded-md bg-action-inverse-bg px-2 py-1 text-xs font-medium text-text-on-inverse [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]"
          >
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

/** The red counter from sidebar/navigation: 16 high, 18 wide at least, radius-xs. */
function SidebarCount({ count }: { count: number }) {
  return (
    // 11/12 has no type token in the kit; Figma uses it raw for this counter.
    <span className="inline-flex h-4 min-w-[18px] shrink-0 items-center justify-center rounded-xs bg-action-destructive-bg px-1 text-[11px] leading-3 font-medium tracking-normal text-text-on-solid tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export interface SidebarGroupProps
  extends Omit<React.ComponentProps<typeof Collapsible.Root>, 'children'> {
  label: string
  icon?: React.ReactNode
  /** How many items the group holds. */
  count?: number
  children?: React.ReactNode
  /** Forwarded to the header button, e.g. `data-force="hover"` on a state sheet. */
  triggerProps?: React.ComponentProps<'button'> & { 'data-force'?: string }
}

export function SidebarGroup({
  className,
  label,
  icon,
  count,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  children,
  triggerProps,
  ...props
}: SidebarGroupProps) {
  // The group keeps its own open state and region, not Radix's Content: Content measures itself
  // with transitions switched off on every toggle, which would cut the fold (satin-expand).
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolled
  const regionId = React.useId()
  return (
    <Collapsible.Root
      data-slot="sidebar-group"
      open={open}
      onOpenChange={(next) => {
        if (openProp == null) setUncontrolled(next)
        onOpenChange?.(next)
      }}
      className={cn('group/sidebar-group flex flex-col gap-0.5', className)}
      {...props}
    >
      <Collapsible.Trigger
        aria-controls={regionId}
        {...triggerProps}
        className={cn(
          'flex h-8 w-full shrink-0 items-center gap-2 rounded-lg px-3 text-start text-text-muted',
          'transition-[background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
          '[&_svg]:size-icon-size-sm [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
          'not-data-active:satin-hover:bg-bg-muted',
          rowFocus,
          triggerProps?.className,
        )}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate text-sm leading-4 font-medium tracking-normal text-text-default">
          {label}
        </span>
        {typeof count === 'number' && (
          <span className="shrink-0 px-1.5 py-0.5 text-sm leading-4 font-medium tracking-normal text-tone-fg tabular-nums">
            {count}
          </span>
        )}
        {/* Points to the start when closed and down when open; right to left it starts turned
            to the left and turns the other way. */}
        <NavArrowRight
          aria-hidden
          className="transition-transform duration-(--duration-base) ease-(--ease-out) group-data-[state=open]/sidebar-group:rotate-90 motion-reduce:transition-none rtl:rotate-180"
        />
      </Collapsible.Trigger>
      {/* Always mounted so it can fold away: grows downwards from under the header (motion.css). */}
      <div id={regionId} data-state={open ? 'open' : 'closed'} className="satin-expand">
        <div className="flex flex-col gap-0.5">{children}</div>
      </div>
    </Collapsible.Root>
  )
}

export interface SidebarSubItemProps extends Omit<React.ComponentProps<'a'>, 'children'> {
  label: string
  active?: boolean
  disabled?: boolean
  asChild?: boolean
  children?: React.ReactNode
}

export function SidebarSubItem({
  className,
  label,
  active = false,
  disabled = false,
  asChild = false,
  href,
  children,
  ...props
}: SidebarSubItemProps) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      data-slot="sidebar-sub-item"
      data-active={active || undefined}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      href={disabled ? undefined : href}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        'flex h-8 shrink-0 items-center rounded-lg ps-[34px] pe-3 text-sm font-normal text-text-muted no-underline select-none',
        'transition-[background-color,color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
        'not-data-active:satin-hover:bg-bg-muted not-data-active:satin-hover:text-text-default',
        rowFocus,
        'data-active:bg-bg-selected data-active:text-text-default',
        'aria-disabled:pointer-events-none aria-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {asChild ? children : <span className="min-w-0 flex-1 truncate">{label}</span>}
    </Comp>
  )
}

export interface SidebarSubGroupProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  label: string
  /** Its `SidebarSubItem`s; they sit 12px further in. */
  children?: React.ReactNode
  /** One of its sub-items is the current page: opens it by default and marks the label. */
  active?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SidebarSubGroup({
  className,
  label,
  children,
  active = false,
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: SidebarSubGroupProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? active)
  const open = openProp ?? uncontrolled
  const regionId = React.useId()
  return (
    <div data-slot="sidebar-sub-group" data-state={open ? 'open' : 'closed'} className={cn('group/sub-group flex flex-col gap-0.5', className)} {...props}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        data-active={active || undefined}
        onClick={() => {
          if (openProp == null) setUncontrolled(!open)
          onOpenChange?.(!open)
        }}
        className={cn(
          'flex h-8 w-full shrink-0 items-center gap-2 rounded-lg ps-[34px] pe-3 text-start text-sm font-normal text-text-muted select-none',
          'transition-[background-color,color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
          'satin-hover:bg-bg-muted satin-hover:text-text-default data-active:text-text-default',
          '[&_svg]:size-icon-size-sm [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
          rowFocus,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <NavArrowRight
          aria-hidden
          className="text-text-muted transition-transform duration-(--duration-base) ease-(--ease-out) group-data-[state=open]/sub-group:rotate-90 motion-reduce:transition-none rtl:rotate-180"
        />
      </button>
      <div id={regionId} data-state={open ? 'open' : 'closed'} className="satin-expand">
        <div className="flex flex-col gap-0.5 [&>[data-slot=sidebar-sub-item]]:ps-[46px]">{children}</div>
      </div>
    </div>
  )
}
