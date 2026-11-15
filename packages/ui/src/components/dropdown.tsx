'use client'

import * as React from 'react'
import { DropdownMenu as DropdownPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { KbdGroup } from './kbd'
import { useSatinLabels } from './labels'

/**
 * DropdownMenu, 1:1 with the uiKit `DropdownMenu` (654:19150) and `DropdownMenu/Item`
 * (653:19165) sets. A 255px popover surface (max 520), 4px padding, radius-xl,
 * border/subtle, the shadcn `sm` shadow. Items are at least 32px high, 12px in, 6px top and
 * bottom, radius-lg, with an 8px gap between a 16px leading icon (text/muted), the content and
 * a trailing check (status green) when selected. An optional `shortcut` shows its keys (Kbd sm)
 * before the check. Hover, keyboard highlight and selected fill
 * bg/selected.
 *
 * Groups: `DropdownMenuGroup`. Content: a 14px medium label (20px line). `stacked` puts the
 * description under it, 2px apart, at 13px / 18px in text/muted; `inline` puts it on the same
 * baseline 12px after the label, at 13px, truncated. Groups have a 24px header in 12px
 * text/subtle and are 4px apart with a 1px bg/muted rule between them. Items are 4px apart.
 *
 * Built on the Radix DropdownMenu: arrow keys, typeahead, Escape, focus return.
 *
 * Other props on DropdownMenu, `ref` included, go to the menu's panel (the Radix Content).
 */
/** The popover surface menus share: radius-xl, border/subtle, bg/popover, the shadcn `sm` shadow. */
/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export const menuSurfaceClass = cn(
  'rounded-xl border border-border-subtle bg-bg-popover',
  '[box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
)
/** A group of rows, with a 1px bg/muted rule under every group but the last. */
/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export const menuGroupClass = 'flex flex-col gap-1 not-last:after:block not-last:after:h-px not-last:after:bg-bg-muted'
/** The 24px group header in 12px text/subtle. */
export const menuGroupLabelClass = 'flex h-6 items-center px-3 text-xs leading-3 tracking-normal text-text-subtle'

export interface DropdownMenuProps
  extends Omit<
    React.ComponentProps<typeof DropdownPrimitive.Content>,
    'children' | 'asChild' | 'side' | 'align' | 'sideOffset' | 'onFocusOutside'
  > {
  /** The element that opens the menu. Rendered with `asChild`, so pass a Button. */
  trigger: React.ReactNode
  /** `DropdownMenuItem`s, optionally inside `DropdownMenuGroup`s. */
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Modal menus block the rest of the page while open. */
  modal?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** Accessible name for the menu, when the trigger's text doesn't say enough. */
  'aria-label'?: string
  /** Focus moved outside a non-modal menu; call `preventDefault()` to keep it open. */
  onFocusOutside?: (event: Event) => void
  className?: string
}

export function DropdownMenu({
  trigger,
  children,
  open,
  defaultOpen,
  onOpenChange,
  modal = true,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  container,
  onFocusOutside,
  className,
  ...props
}: DropdownMenuProps) {
  return (
    <DropdownPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} modal={modal}>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal container={container}>
        <DropdownPrimitive.Content
          collisionPadding={8}
          {...props}
          data-slot="dropdown-menu"
          side={side}
          align={align}
          sideOffset={sideOffset}
          onFocusOutside={onFocusOutside}
          className={cn(
            'pointer-events-auto z-50 flex w-[255px] max-w-[520px] flex-col gap-1 overflow-x-clip overflow-y-auto p-1',
            'max-h-(--radix-dropdown-menu-content-available-height)',
            menuSurfaceClass,
            'origin-(--radix-dropdown-menu-content-transform-origin) outline-none',
            'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
            className,
          )}
        >
          {children}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  )
}

/* ------------------------------------------------------------------------------------------ */

export interface DropdownMenuGroupProps extends React.ComponentProps<typeof DropdownPrimitive.Group> {
  /** The 24px group header. */
  label?: React.ReactNode
}

/** A titled group of items (Figma `_dropdown/group`). Groups get a rule between them. */
export function DropdownMenuGroup({ label, children, className, ...props }: DropdownMenuGroupProps) {
  return (
    <DropdownPrimitive.Group
      data-slot="dropdown-group"
      // Figma's divider lives inside the group, 8px under the last item; the last group has none.
      className={cn(menuGroupClass, className)}
      {...props}
    >
      {label ? (
        <DropdownPrimitive.Label className={menuGroupLabelClass}>
          {label}
        </DropdownPrimitive.Label>
      ) : null}
      {children}
    </DropdownPrimitive.Group>
  )
}

/* ------------------------------------------------------------------------------------------ */

/** The row skin every menu shares: Dropdown, Select, Combobox and the Command menu. */
/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export const menuItemClass = cn(
  'flex min-h-menu-row w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-start outline-none select-none focus-visible:ring-0',
  'transition-colors duration-(--duration-fast) ease-(--ease-out)',
  'data-[highlighted]:bg-bg-selected data-[force=hover]:bg-bg-selected data-[selected]:bg-bg-selected',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0',
)

export interface MenuItemContentProps {
  label: React.ReactNode
  description?: React.ReactNode
  /** Leading icon. 16px by default; stacked two-line items may use 20px (`iconSize={20}`). */
  icon?: React.ReactNode
  iconSize?: 16 | 20
  /** Marks the current value: a trailing check. */
  selected?: boolean
  layout?: 'stacked' | 'inline'
  /** Keys that run the item, e.g. "⌘N", shown on the right (Figma's `showShortcut`). */
  shortcut?: string
  /** Wraps the label, e.g. in Radix Select's `ItemText`. */
  renderLabel?: (label: React.ReactNode) => React.ReactNode
}

/** What sits inside a menu row: icon, label and description, then shortcut and check. */
export function MenuItemContent({
  label,
  description,
  icon,
  iconSize = 16,
  selected = false,
  layout = 'stacked',
  shortcut,
  renderLabel = (l) => l,
}: MenuItemContentProps) {
  const labels = useSatinLabels()
  return (
    <>
      {icon ? (
        <span
          className={cn(
            'grid shrink-0 place-items-center text-text-muted',
            iconSize === 20 ? 'size-5 [&_svg]:size-5 [&_svg]:[stroke-width:1.5]' : 'size-4 [&_svg]:size-4 [&_svg]:[stroke-width:1.875]',
          )}
        >
          {icon}
        </span>
      ) : null}

      {layout === 'stacked' ? (
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <span className="text-base leading-5 font-medium text-text-default">{renderLabel(label)}</span>
          {description ? <span className="text-sm leading-[18px] text-text-muted">{description}</span> : null}
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className="shrink-0 text-base leading-5 font-medium whitespace-nowrap text-text-default">{renderLabel(label)}</span>
          {description ? (
            <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{description}</span>
          ) : null}
        </span>
      )}

      {shortcut && <KbdGroup keys={shortcut} aria-hidden />}
      {selected && <span className="sr-only">({labels.selected})</span>}
      {selected && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-status-green-fg">
          <path
            d="M3.33333 8.66667L6 11.3333L12.6667 4.66667"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  )
}

export interface DropdownMenuItemProps
  extends Omit<React.ComponentProps<typeof DropdownPrimitive.Item>, 'children'>,
    Omit<MenuItemContentProps, 'label' | 'renderLabel'> {
  label: string
}

export function DropdownMenuItem({
  label,
  description,
  icon,
  iconSize = 16,
  selected = false,
  layout = 'stacked',
  shortcut,
  className,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownPrimitive.Item
      data-slot="dropdown-item"
      data-selected={selected || undefined}
      textValue={label}
      className={cn(menuItemClass, className)}
      {...props}
    >
      <MenuItemContent
        label={label}
        description={description}
        icon={icon}
        iconSize={iconSize}
        selected={selected}
        layout={layout}
        shortcut={shortcut}
      />
    </DropdownPrimitive.Item>
  )
}
