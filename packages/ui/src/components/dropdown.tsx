'use client'

import * as React from 'react'
import { DropdownMenu as DropdownPrimitive } from 'radix-ui'
import { NavArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'
import { KbdGroup } from './kbd'
import { useSatinLabels } from './labels'
import { trackPointerModality } from './pointer-modality'

// Rings after a mouse press: see pointer-modality.tsx.
trackPointerModality()

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
 * text/subtle and are 4px apart with a bg/muted rule between them. Items are 4px apart.
 *
 * Submenus: `DropdownMenuSub` holds a `DropdownMenuSubTrigger` row (ending in a chevron) and a
 * `DropdownMenuSubContent` panel, which opens beside the row on hover, → or Enter and fades in
 * from 4px on the side it opens. Checkable rows: `DropdownMenuCheckboxItem` (a leading checkbox,
 * the menu stays open) and `DropdownMenuRadioItem`s in a `DropdownMenuRadioGroup` (the selected
 * check on the right, like `selected`).
 *
 * Built on the Radix DropdownMenu: arrow keys, typeahead, Escape, focus return, and the pointer's
 * safe triangle on the way from a submenu row to its panel. Right to left (read from the
 * trigger, or `dir`), ← opens a submenu and → closes it, and submenus open on the left.
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
export const menuGroupClass = 'flex flex-col gap-1 not-last:after:block not-last:after:h-(--border-width-default) not-last:after:bg-bg-muted'
/** The 24px group header in 12px text/subtle. */
// text/muted: a group's name is read to find a row, so it needs 4.5:1 (subtle is 2.6:1).
export const menuGroupLabelClass = 'flex h-6 items-center px-3 text-xs leading-3 tracking-normal text-text-muted'

export interface DropdownMenuProps
  extends Omit<
    React.ComponentProps<typeof DropdownPrimitive.Content>,
    'children' | 'asChild' | 'side' | 'align' | 'sideOffset' | 'onFocusOutside'
  > {
  /** The element that opens the menu. Rendered with `asChild`, so pass a Button. */
  trigger: React.ReactNode
  /**
   * `DropdownMenuItem`s, optionally inside `DropdownMenuGroup`s; also `DropdownMenuSub`s,
   * `DropdownMenuCheckboxItem`s and `DropdownMenuRadioGroup`s.
   */
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Modal menus block the rest of the page while open. */
  modal?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  /** Portal target, for the menu and its submenus. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** Accessible name for the menu, when the trigger's text doesn't say enough. */
  'aria-label'?: string
  /** Focus moved outside a non-modal menu; call `preventDefault()` to keep it open. */
  onFocusOutside?: (event: Event) => void
  /**
   * Reading direction: which arrow opens a submenu and the side it opens on. Read from the
   * trigger when left out.
   */
  dir?: 'ltr' | 'rtl'
  className?: string
}

type Dir = 'ltr' | 'rtl'

/** The direction an element is laid out in: its `dir`, inherited, else the CSS `direction`. */
function directionOf(el: Element): Dir {
  try {
    return el.matches(':dir(rtl)') ? 'rtl' : 'ltr'
  } catch {
    return getComputedStyle(el).direction === 'rtl' ? 'rtl' : 'ltr'
  }
}

/** Where the menu portals, so its submenus open in the same place. */
const MenuContainer = React.createContext<HTMLElement | null | undefined>(undefined)

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
  dir: dirProp,
  className,
  ...props
}: DropdownMenuProps) {
  // Radix reads the direction from a DirectionProvider only and falls back to left to right, so
  // in a right-to-left page it set dir="ltr" on the panel and kept → for opening submenus. Read it
  // from the trigger instead, again on every open; a `dir` on the menu wins.
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [pageDir, setPageDir] = React.useState<Dir>('ltr')
  const readDir = React.useCallback(() => {
    if (triggerRef.current) setPageDir(directionOf(triggerRef.current))
  }, [])
  React.useEffect(readDir, [readDir, open])
  const dir = dirProp ?? pageDir

  return (
    <DropdownPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next) => {
        if (next) readDir()
        onOpenChange?.(next)
      }}
      modal={modal}
      dir={dir}
    >
      <DropdownPrimitive.Trigger asChild ref={triggerRef}>
        {trigger}
      </DropdownPrimitive.Trigger>
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
          <MenuContainer.Provider value={container}>{children}</MenuContainer.Provider>
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
  const labelId = React.useId()
  return (
    <DropdownPrimitive.Group
      data-slot="dropdown-group"
      // The header names the group, so a screen reader says "Show columns, group" on the way in.
      aria-labelledby={label ? labelId : undefined}
      // Figma's divider lives inside the group, 8px under the last item; the last group has none.
      className={cn(menuGroupClass, className)}
      {...props}
    >
      {label ? (
        <DropdownPrimitive.Label id={labelId} className={menuGroupLabelClass}>
          {label}
        </DropdownPrimitive.Label>
      ) : null}
      {children}
    </DropdownPrimitive.Group>
  )
}

/* ------------------------------------------------------------------------------------------ */

/**
 * The row skin every menu shares: Dropdown, Select, Combobox and the Command menu. The highlight
 * is bg/selected; a row reached with the keyboard also gets the focus ring inside its edge, since
 * the fill alone is too faint to find (1.2:1). Real focus (Radix menus) shows it through
 * :focus-visible; lists that keep focus in a field (Combobox, Command menu) set data-keyboard.
 */
/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export const menuItemClass = cn(
  'flex min-h-menu-row w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-start outline-none select-none',
  'focus-visible:[box-shadow:inset_0_0_0_2px_var(--action-focus-ring)] data-[keyboard]:[box-shadow:inset_0_0_0_2px_var(--action-focus-ring)]',
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
      {selected && <SelectedCheck />}
    </>
  )
}

/** The trailing check of the current value, in status green. */
function SelectedCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-status-green-fg">
      <path
        d="M3.33333 8.66667L6 11.3333L12.6667 4.66667"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

/* ------------------------------------------------------------------------------------------ */

export interface DropdownMenuSubProps {
  /** A `DropdownMenuSubTrigger` and its `DropdownMenuSubContent`. */
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * A submenu: holds the row that opens it, a `DropdownMenuSubTrigger`, and its panel, a
 * `DropdownMenuSubContent` with the submenu's rows. Renders no element of its own.
 */
export function DropdownMenuSub({ children, open, defaultOpen, onOpenChange }: DropdownMenuSubProps) {
  return (
    <DropdownPrimitive.Sub open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {children}
    </DropdownPrimitive.Sub>
  )
}

export interface DropdownMenuSubTriggerProps
  extends Omit<React.ComponentProps<typeof DropdownPrimitive.SubTrigger>, 'children' | 'asChild'>,
    Pick<MenuItemContentProps, 'description' | 'icon' | 'iconSize' | 'layout'> {
  label: string
}

/**
 * The row that opens a submenu: an item's look, ending in a text/muted chevron (mirrored right to
 * left). It stays filled bg/selected while its submenu is open. Hover, →, Enter or Space opens it.
 *
 * Other props, `ref` included, go to the row (the Radix SubTrigger).
 */
export function DropdownMenuSubTrigger({
  label,
  description,
  icon,
  iconSize = 16,
  layout = 'stacked',
  className,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <DropdownPrimitive.SubTrigger
      data-slot="dropdown-sub-trigger"
      textValue={label}
      className={cn(menuItemClass, 'data-[state=open]:bg-bg-selected', className)}
      {...props}
    >
      <MenuItemContent label={label} description={description} icon={icon} iconSize={iconSize} layout={layout} />
      <NavArrowRight aria-hidden className="size-4 text-text-muted [stroke-width:1.875] rtl:-scale-x-100" />
    </DropdownPrimitive.SubTrigger>
  )
}

export interface DropdownMenuSubContentProps
  extends Omit<React.ComponentProps<typeof DropdownPrimitive.SubContent>, 'asChild'> {
  /** The submenu's rows: `DropdownMenuItem`s, groups, checkable rows, or another `DropdownMenuSub`. */
  children: React.ReactNode
  /** Portal target. Defaults to the menu's own `container`. */
  container?: HTMLElement | null
}

/**
 * A submenu's panel: the menu's surface, 220px wide, beside its row with the first rows level
 * (4px off). It fades in from 4px on the side it opens, so it seems to come out of the row; right
 * to left, or with no room on the right, that is the left.
 *
 * Other props, `ref` included, go to the panel (the Radix SubContent).
 */
export function DropdownMenuSubContent({ container, className, children, ...props }: DropdownMenuSubContentProps) {
  const menuContainer = React.useContext(MenuContainer)
  return (
    <DropdownPrimitive.Portal container={container === undefined ? menuContainer : container}>
      <DropdownPrimitive.SubContent
        // 4px off the row; -5 (the panel's 4px padding and 1px border) puts its first row level with it.
        sideOffset={4}
        alignOffset={-5}
        collisionPadding={8}
        {...props}
        data-slot="dropdown-sub-content"
        className={cn(
          'pointer-events-auto z-50 flex w-[220px] max-w-[calc(100vw-16px)] flex-col gap-1 overflow-x-clip overflow-y-auto p-1',
          'max-h-(--radix-dropdown-menu-content-available-height)',
          menuSurfaceClass,
          'origin-(--radix-dropdown-menu-content-transform-origin) outline-none',
          className,
        )}
      >
        {children}
      </DropdownPrimitive.SubContent>
    </DropdownPrimitive.Portal>
  )
}

/* ------------------------------------------------------------------------------------------ */

export interface DropdownMenuCheckboxItemProps
  extends Omit<
      React.ComponentProps<typeof DropdownPrimitive.CheckboxItem>,
      'children' | 'checked' | 'defaultChecked' | 'onCheckedChange'
    >,
    Omit<MenuItemContentProps, 'label' | 'renderLabel' | 'selected'> {
  label: string
  /** Controlled state. `'indeterminate'` for a row that stands for a set only partly on. */
  checked?: boolean | 'indeterminate'
  /** The state it starts in, when uncontrolled. */
  defaultChecked?: boolean | 'indeterminate'
  /** The row was toggled; an indeterminate row turns on. */
  onCheckedChange?: (checked: boolean) => void
  /** Closes the menu once toggled. Off, so several rows can be set in one go. */
  closeOnSelect?: boolean
}

/**
 * A row that turns something on or off, like a column of a view: a leading 16px checkbox (the
 * Checkbox's look) before the item's content. Its role is `menuitemcheckbox`, with `aria-checked`.
 * Enter or Space toggles it; the menu stays open unless `closeOnSelect`.
 *
 * Other props, `ref` included, go to the row (the Radix CheckboxItem).
 */
export function DropdownMenuCheckboxItem({
  label,
  description,
  icon,
  iconSize = 16,
  layout = 'stacked',
  shortcut,
  checked,
  defaultChecked = false,
  onCheckedChange,
  closeOnSelect = false,
  onSelect,
  className,
  ...props
}: DropdownMenuCheckboxItemProps) {
  const [own, setOwn] = React.useState(defaultChecked)
  const state = checked ?? own
  return (
    <DropdownPrimitive.CheckboxItem
      data-slot="dropdown-checkbox-item"
      textValue={label}
      className={cn(menuItemClass, className)}
      {...props}
      checked={state}
      onCheckedChange={(next) => {
        if (checked === undefined) setOwn(next)
        onCheckedChange?.(next)
      }}
      onSelect={(event) => {
        onSelect?.(event)
        if (!closeOnSelect) event.preventDefault()
      }}
    >
      {/* Always there, so the label never moves; its data-state draws checked and indeterminate. */}
      <DropdownPrimitive.ItemIndicator forceMount aria-hidden className="satin-checkbox">
        {/* -1px so the 16px glyph sits on the box, not inside its 1px border (as in Checkbox). */}
        <span className="-m-px grid size-4 place-items-center">
          {state === true || state === 'indeterminate' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              {state === 'indeterminate' ? (
                <path d="M3.6 8H12.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              ) : (
                <path
                  d="M3.33333 8.66667L6 11.3333L12.6667 4.66667"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          ) : null}
        </span>
      </DropdownPrimitive.ItemIndicator>
      <MenuItemContent
        label={label}
        description={description}
        icon={icon}
        iconSize={iconSize}
        layout={layout}
        shortcut={shortcut}
      />
    </DropdownPrimitive.CheckboxItem>
  )
}

/* ------------------------------------------------------------------------------------------ */

export interface DropdownMenuRadioGroupProps
  extends Omit<React.ComponentProps<typeof DropdownPrimitive.RadioGroup>, 'value' | 'defaultValue' | 'onValueChange'> {
  /** The 24px group header; it also names the group for screen readers. */
  label?: React.ReactNode
  /** Controlled: the selected row's `value`. */
  value?: string
  /** The row selected at first, when uncontrolled. */
  defaultValue?: string
  onValueChange?: (value: string) => void
}

/**
 * One choice among `DropdownMenuRadioItem`s, like a sort order or a stage: a group with the
 * `DropdownMenuGroup` look (header, rule under it).
 *
 * Other props, `ref` included, go to the group (the Radix RadioGroup).
 */
export function DropdownMenuRadioGroup({
  label,
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  ...props
}: DropdownMenuRadioGroupProps) {
  const labelId = React.useId()
  const [own, setOwn] = React.useState(defaultValue)
  return (
    <DropdownPrimitive.RadioGroup
      data-slot="dropdown-radio-group"
      aria-labelledby={label ? labelId : undefined}
      className={cn(menuGroupClass, className)}
      {...props}
      value={value ?? own}
      onValueChange={(next) => {
        if (value === undefined) setOwn(next)
        onValueChange?.(next)
      }}
    >
      {label ? (
        <DropdownPrimitive.Label id={labelId} className={menuGroupLabelClass}>
          {label}
        </DropdownPrimitive.Label>
      ) : null}
      {children}
    </DropdownPrimitive.RadioGroup>
  )
}

export interface DropdownMenuRadioItemProps
  extends Omit<React.ComponentProps<typeof DropdownPrimitive.RadioItem>, 'children'>,
    Omit<MenuItemContentProps, 'label' | 'renderLabel' | 'selected'> {
  label: string
  /** What `onValueChange` reports when this row is chosen. */
  value: string
  /** Closes the menu once chosen. On, since one choice ends the question. */
  closeOnSelect?: boolean
}

/**
 * One option in a `DropdownMenuRadioGroup`. The selected row is filled bg/selected and ends in
 * the same status-green check as a `selected` item. Its role is `menuitemradio`, with
 * `aria-checked`.
 *
 * Other props, `ref` included, go to the row (the Radix RadioItem).
 */
export function DropdownMenuRadioItem({
  label,
  description,
  icon,
  iconSize = 16,
  layout = 'stacked',
  shortcut,
  closeOnSelect = true,
  onSelect,
  className,
  ...props
}: DropdownMenuRadioItemProps) {
  return (
    <DropdownPrimitive.RadioItem
      data-slot="dropdown-radio-item"
      textValue={label}
      className={cn(menuItemClass, 'data-[state=checked]:bg-bg-selected', className)}
      {...props}
      onSelect={(event) => {
        onSelect?.(event)
        if (!closeOnSelect) event.preventDefault()
      }}
    >
      <MenuItemContent
        label={label}
        description={description}
        icon={icon}
        iconSize={iconSize}
        layout={layout}
        shortcut={shortcut}
      />
      <DropdownPrimitive.ItemIndicator className="flex shrink-0">
        <SelectedCheck />
      </DropdownPrimitive.ItemIndicator>
    </DropdownPrimitive.RadioItem>
  )
}
