'use client'

import * as React from 'react'
import { Button, type ButtonProps } from './button'
import { ButtonGroup } from './button-group'
import { DropdownMenu, type DropdownMenuProps } from './dropdown'
import { useSatinLabels } from './labels'

/**
 * SplitButton: the main action and, joined to it, an arrow that opens the related ones
 * ("Publish" ▾ Schedule, Save as draft). Built from an attached ButtonGroup, two Buttons and a
 * DropdownMenu, so it takes every Button variant, size and shape, and the menu takes
 * `DropdownMenuItem`s (`label`, `icon`, `shortcut`…) and groups like any other.
 *
 * Use it when one action is the usual one and the others are its variations; when the actions
 * are equals, use a DropdownMenu on its own. The arrow is named "More options" (`menuLabel`, or
 * `moreOptions` in SatinLabels) and disabling the button disables both halves.
 */
export interface SplitButtonProps extends Omit<ButtonProps, 'iconOnly' | 'asChild'> {
  /** The related actions: `DropdownMenuItem`s, optionally in `DropdownMenuGroup`s. */
  menu: React.ReactNode
  /** Accessible name of the arrow. */
  menuLabel?: string
  /** Passed to the DropdownMenu: `align` (default `end`), `side`, `open`, `onOpenChange`… */
  menuProps?: Omit<DropdownMenuProps, 'trigger' | 'children'>
  /** Class names for the group around both halves. */
  groupClassName?: string
}

export function SplitButton({
  menu,
  menuLabel,
  menuProps,
  groupClassName,
  variant = 'primary',
  size,
  shape,
  disabled,
  children,
  ...props
}: SplitButtonProps) {
  const labels = useSatinLabels()
  return (
    <ButtonGroup variant={variant} size={size} shape={shape} className={groupClassName} data-slot="split-button">
      <Button disabled={disabled} {...props}>
        {children}
      </Button>
      <DropdownMenu
        align="end"
        {...menuProps}
        trigger={
          <Button iconOnly aria-label={menuLabel ?? labels.moreOptions} disabled={disabled}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        }
      >
        {menu}
      </DropdownMenu>
    </ButtonGroup>
  )
}
