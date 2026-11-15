'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Search } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { Chip } from './chip'
import { MenuItemContent, menuItemClass, menuSurfaceClass } from './dropdown'
import { useSatinLabels } from './labels'
import { FieldChrome, SelectChevron, useFieldChrome, type SelectOption } from './select'

/**
 * Combobox, 1:1 with the uiKit `Combobox` set (4023:3549): Select's field, opening a searchable
 * list. The panel is the menu surface at the field's width (240 at least): a 36px search row
 * (16px icon, 14px query, 12px in) over a border/subtle rule, then the matching options as
 * inline menu rows 2px apart in 4px of padding.
 *
 * Single: a pick fills the field with its label and closes the list. Multiple: each pick
 * toggles and the list stays open; the field shows the picks as small outline chips, 4px
 * apart, each with its own remove button, and grows a row at a time as they wrap. The chips sit
 * 3px from the field's edge, so their labels start where a value's text would. With more than
 * one pick, Clear (the xs tertiary button) shows on the label's line at the field's right edge.
 *
 * `footer` adds Cancel (secondary) and Apply (primary) under a border/subtle rule, 8px in: picks
 * then wait for Apply, which stays disabled until something is picked; Cancel or Escape drops
 * them.
 *
 * Typing filters by label and description. Arrow keys move the highlight, Enter picks it, the
 * pointer highlights what it is over. The query field is a `combobox` that owns the `listbox`.
 *
 * Other props, `ref` included, go to the trigger button that covers the field (the element its
 * label points at); `className` styles the field around it.
 */
export interface ComboboxProps
  extends Omit<React.ComponentProps<typeof PopoverPrimitive.Trigger>, 'value' | 'defaultValue' | 'disabled' | 'children' | 'asChild'> {
  options: SelectOption[]
  /** The applied picks. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  multiple?: boolean
  /** Cancel and Apply under the list; picks apply only with Apply. */
  footer?: boolean
  /** Shown while nothing is picked. Defaults to the `select` label ("Select…"). */
  placeholder?: string
  /** The query field's placeholder and name. Defaults to the `search` label. */
  searchPlaceholder?: string
  /** Shown when nothing matches the query. Defaults to the `noResults` label. */
  emptyText?: React.ReactNode
  /** Defaults to the `apply` label. */
  applyLabel?: string
  /** Defaults to the `cancel` label. */
  cancelLabel?: string
  /** Defaults to the `clear` label. */
  clearLabel?: string
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode | boolean
  size?: 'sm' | 'md' | 'lg'
  leadingIcon?: React.ReactNode
  disabled?: boolean
  id?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** Keep focus where it is when the panel opens (inline previews). */
  onOpenAutoFocus?: (event: Event) => void
  /** A press outside the panel; `preventDefault()` keeps it open. */
  onInteractOutside?: (event: Event) => void
  'aria-label'?: string
  wrapperClassName?: string
  className?: string
}

const matches = (o: SelectOption, q: string) => {
  const t = q.trim().toLowerCase()
  if (!t) return true
  return o.label.toLowerCase().includes(t) || (typeof o.description === 'string' && o.description.toLowerCase().includes(t))
}

export function Combobox({
  options,
  value,
  defaultValue = [],
  onValueChange,
  multiple = false,
  footer = false,
  placeholder: placeholderProp,
  searchPlaceholder: searchPlaceholderProp,
  emptyText: emptyTextProp,
  applyLabel: applyLabelProp,
  cancelLabel: cancelLabelProp,
  clearLabel: clearLabelProp,
  label,
  hint,
  error,
  size = 'md',
  leadingIcon,
  disabled,
  id,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  container,
  onOpenAutoFocus,
  onInteractOutside,
  wrapperClassName,
  className,
  'aria-describedby': describedBy,
  ...props
}: ComboboxProps) {
  const chrome = useFieldChrome({ id, disabled, error, hint })
  const labels = useSatinLabels()
  const placeholder = placeholderProp ?? labels.select
  const searchPlaceholder = searchPlaceholderProp ?? labels.search
  const emptyText = emptyTextProp ?? labels.noResults
  const applyLabel = applyLabelProp ?? labels.apply
  const cancelLabel = cancelLabelProp ?? labels.cancel
  const clearLabel = clearLabelProp ?? labels.clear
  const listId = `${chrome.controlId}-list`

  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const applied = value ?? uncontrolledValue
  const commit = (next: string[]) => {
    if (value == null) setUncontrolledValue(next)
    onValueChange?.(next)
  }

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen

  // With a footer, picks wait here for Apply; without one they apply at once.
  const [pending, setPending] = React.useState<string[]>(applied)
  const picks = footer ? pending : applied
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  // The highlight shows the focus ring only when the arrows put it there (see menuItemClass).
  const [viaKeys, setViaKeys] = React.useState(false)

  const setOpen = (next: boolean) => {
    if (next) {
      setPending(applied)
      setQuery('')
      setActive(0)
    }
    if (openProp == null) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const shown = options.filter((o) => matches(o, query))
  const pick = (v: string) => {
    const next = multiple ? (picks.includes(v) ? picks.filter((x) => x !== v) : [...picks, v]) : picks[0] === v && footer ? [] : [v]
    if (footer) return setPending(next)
    commit(next)
    if (!multiple) setOpen(false)
  }
  const apply = () => {
    commit(pending)
    setOpen(false)
  }

  const chosen = applied.map((v) => options.find((o) => o.value === v)).filter(Boolean) as SelectOption[]
  const chips = multiple && chosen.length > 0
  const triggerText = !multiple && chosen[0] ? chosen[0].label : chips ? null : placeholder
  // As in Select: left out, a single pick's own icon leads the field.
  const lead = leadingIcon ?? (!multiple ? chosen[0]?.icon : undefined)

  return (
    <FieldChrome
      label={label}
      chrome={chrome}
      className={wrapperClassName}
      action={
        label && multiple && chosen.length > 1 ? (
          <Button variant="tertiary" size="xs" disabled={chrome.disabled} onClick={() => commit([])}>
            {clearLabel}
          </Button>
        ) : undefined
      }
    >
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Anchor asChild>
          <div
            data-slot="combobox-field"
            data-size={size}
            data-multiple={chips || undefined}
            data-leading={lead ? true : undefined}
            data-filled={chosen.length ? true : undefined}
            data-invalid={chrome.invalid || undefined}
            data-disabled={chrome.disabled || undefined}
            data-state={open ? 'open' : 'closed'}
            className={cn('satin-field satin-select satin-combobox relative', className)}
          >
            {/* The trigger covers the whole field under the chips, so a click anywhere but a
                chip's remove button or Clear opens the list, and it takes no room in the rows. */}
            <PopoverPrimitive.Trigger
              {...props}
              id={chrome.controlId}
              data-slot="combobox-trigger"
              disabled={chrome.disabled}
              aria-invalid={chrome.invalid || undefined}
              aria-describedby={[describedBy, chrome.describedBy].filter(Boolean).join(' ') || undefined}
              aria-haspopup="listbox"
              className="absolute inset-0 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-0 disabled:cursor-not-allowed"
            >
              <span className="sr-only">{chosen.length ? chosen.map((o) => o.label).join(', ') : placeholder}</span>
            </PopoverPrimitive.Trigger>
            {lead && (
              <span className="satin-field-icon satin-combobox-icon pointer-events-none" aria-hidden>
                {lead}
              </span>
            )}
            <div className="pointer-events-none flex min-w-0 flex-1 flex-wrap items-center gap-1 *:pointer-events-auto">
              {chips &&
                chosen.map((o) => (
                  <Chip
                    key={o.value}
                    size="sm"
                    variant="outline"
                    disabled={chrome.disabled}
                    removeLabel={labels.removeItem(o.label)}
                    onRemove={() => commit(applied.filter((v) => v !== o.value))}
                    className="relative"
                  >
                    {o.label}
                  </Chip>
                ))}
              {triggerText && (
                <span aria-hidden className={cn('pointer-events-none! min-w-0 flex-1 truncate', chosen.length ? 'text-text-default' : 'text-text-muted')}>
                  {triggerText}
                </span>
              )}
              {/* Without a label there is no line above the field for Clear: it follows the chips. */}
              {!label && chips && chosen.length > 1 && (
                <Button
                  variant="tertiary"
                  size="xs"
                  disabled={chrome.disabled}
                  className="relative ms-auto"
                  onClick={() => commit([])}
                >
                  {clearLabel}
                </Button>
              )}
            </div>
            <SelectChevron className="satin-combobox-icon pointer-events-none" />
          </div>
        </PopoverPrimitive.Anchor>

        <PopoverPrimitive.Portal container={container}>
          <PopoverPrimitive.Content
            data-slot="combobox"
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={8}
            onOpenAutoFocus={onOpenAutoFocus}
            onInteractOutside={onInteractOutside}
            className={cn(
              'pointer-events-auto z-50 flex w-(--radix-popover-trigger-width) min-w-60 max-w-[520px] flex-col overflow-hidden',
              menuSurfaceClass,
              'origin-(--radix-popover-content-transform-origin) outline-none',
              'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
            )}
          >
            <label className="flex h-9 shrink-0 items-center gap-2 border-b border-border-subtle px-3 text-text-muted">
              <Search aria-hidden className="size-4 shrink-0 [stroke-width:1.875]" />
              <input
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={shown[active] ? `${listId}-${shown[active].value}` : undefined}
                aria-label={searchPlaceholder}
                value={query}
                placeholder={searchPlaceholder}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    setViaKeys(true)
                    e.preventDefault()
                    const step = e.key === 'ArrowDown' ? 1 : -1
                    setActive((a) => (shown.length ? (a + step + shown.length) % shown.length : 0))
                  } else if (e.key === 'Enter' && shown[active]) {
                    e.preventDefault()
                    if (!shown[active].disabled) pick(shown[active].value)
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-base leading-[21px] text-text-default outline-none placeholder:text-text-muted focus-visible:ring-0"
              />
            </label>

            <div
              id={listId}
              role="listbox"
              aria-multiselectable={multiple || undefined}
              className="flex max-h-60 flex-col gap-0.5 overflow-y-auto p-1"
            >
              {shown.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-text-muted">{emptyText}</p>
              ) : (
                shown.map((o, i) => {
                  const picked = picks.includes(o.value)
                  return (
                    <div
                      key={o.value}
                      id={`${listId}-${o.value}`}
                      role="option"
                      aria-selected={picked}
                      aria-disabled={o.disabled || undefined}
                      data-highlighted={i === active ? '' : undefined}
                      data-keyboard={i === active && viaKeys ? '' : undefined}
                      data-disabled={o.disabled ? '' : undefined}
                      onPointerMove={() => {
                        setViaKeys(false)
                        setActive(i)
                      }}
                      // Keep focus in the query field.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => !o.disabled && pick(o.value)}
                      className={cn(menuItemClass, picked && 'bg-bg-selected')}
                    >
                      <MenuItemContent
                        label={o.label}
                        description={o.description}
                        icon={o.icon}
                        layout="inline"
                        shortcut={o.shortcut}
                        selected={picked}
                      />
                    </div>
                  )
                })
              )}
            </div>

            {footer && (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle p-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  {cancelLabel}
                </Button>
                <Button disabled={pending.length === 0} onClick={apply}>
                  {applyLabel}
                </Button>
              </div>
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </FieldChrome>
  )
}
