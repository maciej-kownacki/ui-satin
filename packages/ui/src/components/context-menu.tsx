'use client'

import * as React from 'react'
import { ContextMenu as ContextPrimitive } from 'radix-ui'
import { NavArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'
import { MenuItemContent, menuItemClass, menuSurfaceClass, type MenuItemContentProps } from './dropdown'

/**
 * ContextMenu, 1:1 with the uiKit design (🆕 context menu & hover card): DropdownMenu's surface
 * and rows, opened by right-click (or a long press) on its target, at the pointer. 255 wide, 4px
 * in, rows 0 apart, separators a 1px bg/muted rule. Shortcuts on the right as Kbd; a submenu row
 * ends in a text/muted chevron (the kit's `showSubmenu`) and opens beside it, 4px off; destructive
 * rows are action/destructive/fg (red-400 in dark), icon included, and go last.
 *
 * Built on the Radix ContextMenu: arrow keys, typeahead, Escape, Shift+F10 / the menu key on the
 * focused target.
 */
export interface ContextMenuProps {
  /** What right-click opens the menu on. Rendered with `asChild`, so pass one element. */
  trigger: React.ReactNode
  /** `ContextMenuItem`s, `ContextMenuSub`s and `ContextMenuSeparator`s. */
  children: React.ReactNode
  onOpenChange?: (open: boolean) => void
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** Modal menus block the rest of the page while open. */
  modal?: boolean
  /** Focus moved outside a non-modal menu; call `preventDefault()` to keep it open. */
  onFocusOutside?: (event: Event) => void
  className?: string
}

const contentClass = cn(
  'pointer-events-auto z-50 flex w-[255px] max-w-[calc(100vw-16px)] flex-col overflow-x-clip overflow-y-auto p-1',
  menuSurfaceClass,
  'outline-none data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
)

export function ContextMenu({
  trigger,
  children,
  onOpenChange,
  container,
  modal = true,
  onFocusOutside,
  className,
}: ContextMenuProps) {
  return (
    <ContextPrimitive.Root onOpenChange={onOpenChange} modal={modal}>
      <ContextPrimitive.Trigger asChild>{trigger}</ContextPrimitive.Trigger>
      <ContextPrimitive.Portal container={container}>
        <ContextPrimitive.Content
          data-slot="context-menu"
          collisionPadding={8}
          onFocusOutside={onFocusOutside}
          className={cn(contentClass, 'origin-(--radix-context-menu-content-transform-origin)', 'max-h-(--radix-context-menu-content-available-height)', className)}
        >
          {children}
        </ContextPrimitive.Content>
      </ContextPrimitive.Portal>
    </ContextPrimitive.Root>
  )
}

export interface ContextMenuItemProps
  extends Omit<React.ComponentProps<typeof ContextPrimitive.Item>, 'children'>,
    Pick<MenuItemContentProps, 'icon' | 'shortcut' | 'description'> {
  label: string
  /** Deletes or removes: action/destructive/fg, and best placed last. */
  destructive?: boolean
}

export function ContextMenuItem({ label, icon, shortcut, description, destructive, className, ...props }: ContextMenuItemProps) {
  return (
    <ContextPrimitive.Item
      data-slot="context-menu-item"
      textValue={label}
      className={cn(menuItemClass, destructive && '[&_*]:text-action-destructive-fg', className)}
      {...props}
    >
      <MenuItemContent label={label} icon={icon} shortcut={shortcut} description={description} layout="inline" />
    </ContextPrimitive.Item>
  )
}

export interface ContextMenuSubProps extends Pick<MenuItemContentProps, 'icon'> {
  label: string
  /** The submenu's items. */
  children: React.ReactNode
  disabled?: boolean
}

/** A row that opens a submenu beside it (hover, →, or Enter). */
export function ContextMenuSub({ label, icon, children, disabled }: ContextMenuSubProps) {
  return (
    <ContextPrimitive.Sub>
      <ContextPrimitive.SubTrigger
        data-slot="context-menu-sub"
        disabled={disabled}
        textValue={label}
        className={cn(menuItemClass, 'data-[state=open]:bg-bg-selected')}
      >
        <MenuItemContent label={label} icon={icon} layout="inline" />
        <NavArrowRight aria-hidden className="size-4 text-text-muted [stroke-width:1.875]" />
      </ContextPrimitive.SubTrigger>
      <ContextPrimitive.Portal>
        <ContextPrimitive.SubContent
          sideOffset={4}
          alignOffset={-5}
          collisionPadding={8}
          className={cn(contentClass, 'w-[220px] origin-(--radix-context-menu-content-transform-origin)')}
        >
          {children}
        </ContextPrimitive.SubContent>
      </ContextPrimitive.Portal>
    </ContextPrimitive.Sub>
  )
}

/** A 1px bg/muted rule between groups of rows. */
export function ContextMenuSeparator({ className }: { className?: string }) {
  return <ContextPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-bg-muted', className)} />
}
