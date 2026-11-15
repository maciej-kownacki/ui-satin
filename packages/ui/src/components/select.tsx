'use client'

import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { MenuItemContent, menuGroupClass, menuGroupLabelClass, menuItemClass, menuSurfaceClass, type MenuItemContentProps } from './dropdown'
import { FieldSizeContext, useFormField } from './form-field'
import { useSatinLabels } from './labels'

/**
 * Select, 1:1 with the uiKit `Select` set (4022:3531): the field around it is Input's (a 13px
 * medium label 8px above, a 13px hint or error under it), the trigger is Input's skin with the
 * value and a 16px chevron (sm 28, md 32, lg 36; 12px in, 8px gaps), an optional 16px leading
 * icon (by default the picked option's own icon, when the options have icons). Placeholder is text/muted, a value text/default. While the list is open the trigger
 * keeps the focus border and ring.
 *
 * The list is the Dropdown menu: the same surface, rows, groups and options, so every option
 * takes what a `DropdownMenuItem` takes (icon, description, stacked or inline layout, 20px
 * icons, a shortcut) and the current one is marked with the check. It opens 4px under the
 * trigger, at least as wide.
 *
 * Built on the Radix Select: arrow keys, typeahead, Home/End, Escape, a native form value
 * (`name`), and focus back on the trigger. Inside a FormField, leave out `label`, `hint` and
 * `error`.
 *
 * Other props, `ref` included, go to the trigger button.
 */
export interface SelectOption extends Omit<MenuItemContentProps, 'label' | 'selected' | 'renderLabel' | 'layout' | 'iconSize'> {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectGroup {
  label?: React.ReactNode
  options: SelectOption[]
}

export interface SelectProps
  extends Omit<React.ComponentProps<typeof SelectPrimitive.Trigger>, 'value' | 'defaultValue' | 'disabled' | 'name' | 'children' | 'asChild'> {
  /** Options, or titled groups of options. */
  options: SelectOption[] | SelectGroup[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Shown while nothing is picked. Defaults to the `select` label ("Select…"). */
  placeholder?: string
  label?: React.ReactNode
  hint?: React.ReactNode
  /** An error message (replaces the hint), or `true` to mark the field invalid without one. */
  error?: React.ReactNode | boolean
  size?: 'sm' | 'md' | 'lg'
  /** A 16px icon before the value. Left out, the picked option's own icon shows there. */
  leadingIcon?: React.ReactNode
  /** Row layout of every option: description under the label, or after it. */
  layout?: MenuItemContentProps['layout']
  /** Option icon size; 20 suits stacked two-line options. */
  iconSize?: MenuItemContentProps['iconSize']
  disabled?: boolean
  required?: boolean
  /** Form field name, for a native form submit. */
  name?: string
  id?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  'aria-label'?: string
  /** Classes for the outer wrapper (label + field + hint). `className` styles the trigger. */
  wrapperClassName?: string
  className?: string
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus'
}

/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export const isOptionGroups = <T,>(o: T[] | { options: T[] }[]): o is { options: T[] }[] =>
  o.length > 0 && typeof o[0] === 'object' && o[0] !== null && 'options' in o[0]

/** Ids and state for a field with a label, a hint or an error, inside or outside a FormField. */
/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export function useFieldChrome({
  id,
  disabled,
  error,
  hint,
}: {
  id?: string
  disabled?: boolean
  error?: React.ReactNode | boolean
  hint?: React.ReactNode
}) {
  const field = useFormField()
  const autoId = React.useId()
  const controlId = id ?? field?.id ?? autoId
  const isError = typeof error === 'string' || React.isValidElement(error)
  const message = isError ? (error as React.ReactNode) : hint
  const messageId = message ? `${controlId}-hint` : undefined
  return {
    controlId,
    disabled: disabled ?? field?.disabled ?? false,
    invalid: Boolean(error) || (field?.invalid ?? false),
    required: field?.required,
    name: field?.name,
    describedBy: [field?.describedBy, messageId].filter(Boolean).join(' ') || undefined,
    message,
    messageId,
    isError,
  }
}

/** Label 8px above the control, hint or error 8px under it: Input's field, for Select and Combobox. */
/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export function FieldChrome({
  label,
  action,
  chrome,
  className,
  children,
}: {
  label?: React.ReactNode
  /** On the label's line, at the field's right edge: the smallest button, e.g. Clear. */
  action?: React.ReactNode
  chrome: ReturnType<typeof useFieldChrome>
  className?: string
  children: React.ReactNode
}) {
  return (
    <div data-slot="field-chrome" className={cn('grid w-full gap-2', className)}>
      {label && (
        // The row keeps the label's 18px whatever the action, so the field never moves.
        <div className="flex h-[18px] items-center justify-between gap-2">
          <label htmlFor={chrome.controlId} className="text-sm leading-[18px] font-medium text-text-default">
            {label}
          </label>
          {action && <div className="-my-[3px] flex shrink-0 items-center">{action}</div>}
        </div>
      )}
      {children}
      {chrome.message && (
        <p id={chrome.messageId} className={cn('text-sm', chrome.isError ? 'text-action-destructive-bg' : 'text-text-muted')}>
          {chrome.message}
        </p>
      )}
    </div>
  )
}

/** The trigger's chevron, 16px in the icon colour. */
/** @internal Shared by Satin's own components; not part of the public API and may change in any release. */
export function SelectChevron({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={cn('satin-field-icon text-text-muted', className)}>
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  label,
  hint,
  error,
  size: ownSize,
  leadingIcon,
  layout = 'inline',
  iconSize = 16,
  disabled,
  required,
  name,
  id,
  open,
  defaultOpen,
  onOpenChange,
  container,
  wrapperClassName,
  className,
  'data-force': force,
  'aria-describedby': describedBy,
  ...props
}: SelectProps) {
  const chrome = useFieldChrome({ id, disabled, error, hint })
  const size = ownSize ?? React.useContext(FieldSizeContext) ?? 'md'
  const labels = useSatinLabels()

  // Figma's `filled` and the check: track the value, controlled or not.
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const current = value ?? uncontrolled
  const groups: SelectGroup[] = isOptionGroups(options) ? (options as SelectGroup[]) : [{ options: options as SelectOption[] }]
  const lead = leadingIcon ?? groups.flatMap((g) => g.options).find((o) => o.value === current)?.icon

  return (
    <FieldChrome label={label} chrome={chrome} className={wrapperClassName}>
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => {
          if (value == null) setUncontrolled(v)
          onValueChange?.(v)
        }}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        disabled={chrome.disabled}
        required={required ?? chrome.required}
        name={name ?? chrome.name}
      >
        <SelectPrimitive.Trigger
          {...props}
          id={chrome.controlId}
          data-slot="select-trigger"
          data-size={size}
          data-filled={current ? true : undefined}
          data-invalid={chrome.invalid || undefined}
          data-disabled={chrome.disabled || undefined}
          data-force={force}
          aria-invalid={chrome.invalid || undefined}
          aria-describedby={[describedBy, chrome.describedBy].filter(Boolean).join(' ') || undefined}
          className={cn('satin-field satin-select', className)}
        >
          {lead && (
            <span className="satin-field-icon" aria-hidden>
              {lead}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-text-default">
            <SelectPrimitive.Value placeholder={<span className="text-text-muted">{placeholder ?? labels.select}</span>} />
          </span>
          <SelectPrimitive.Icon asChild>
            <SelectChevron />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal container={container}>
          <SelectPrimitive.Content
            data-slot="select-menu"
            position="popper"
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={8}
            className={cn(
              'pointer-events-auto z-50 max-w-[520px] min-w-(--radix-select-trigger-width) overflow-hidden',
              'max-h-(--radix-select-content-available-height)',
              menuSurfaceClass,
              'origin-(--radix-select-content-transform-origin) outline-none',
              'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
            )}
          >
            <SelectPrimitive.Viewport className="flex flex-col gap-1 p-1">
              {groups.map((g, gi) => {
                const rows = g.options.map((o) => (
                  <SelectPrimitive.Item
                    key={o.value}
                    value={o.value}
                    disabled={o.disabled}
                    textValue={o.label}
                    data-slot="select-item"
                    className={cn(menuItemClass, 'data-[state=checked]:bg-bg-selected')}
                  >
                    <MenuItemContent
                      label={o.label}
                      description={o.description}
                      icon={o.icon}
                      iconSize={iconSize}
                      layout={layout}
                      shortcut={o.shortcut}
                      selected={o.value === current}
                      renderLabel={(l) => <SelectPrimitive.ItemText>{l}</SelectPrimitive.ItemText>}
                    />
                  </SelectPrimitive.Item>
                ))
                return groups.length > 1 || g.label ? (
                  <SelectPrimitive.Group key={gi} className={menuGroupClass}>
                    {g.label && <SelectPrimitive.Label className={menuGroupLabelClass}>{g.label}</SelectPrimitive.Label>}
                    {rows}
                  </SelectPrimitive.Group>
                ) : (
                  <React.Fragment key={gi}>{rows}</React.Fragment>
                )
              })}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </FieldChrome>
  )
}
