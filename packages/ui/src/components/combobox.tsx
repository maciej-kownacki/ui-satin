import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Search } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { MenuItemContent, menuItemClass, menuSurfaceClass } from './dropdown'
import { FieldChrome, SelectChevron, useFieldChrome, type SelectOption } from './select'

/**
 * Combobox, 1:1 with the uiKit `Combobox` set (4023:3549): Select's field and trigger, opening
 * a searchable list. The panel is the menu surface at the trigger's width (240 at least): a 36px
 * search row (16px icon, 14px query, 12px in) over a border/subtle rule, the matching options
 * as inline menu rows 2px apart in 4px of padding, and a footer under a border/subtle rule with
 * Cancel (secondary) and Apply (primary), 8px apart and 8px in.
 *
 * Picking an option only marks it; Apply commits the picks and closes, Cancel (or Escape)
 * drops them. Apply stays disabled until at least one option is picked. With `multiple`, each
 * pick toggles; otherwise a pick replaces the last one.
 *
 * Typing filters by label and description. Arrow keys move the highlight, Enter picks it, the
 * pointer highlights what it is over. The query field is a `combobox` that owns the `listbox`.
 */
export interface ComboboxProps {
  options: SelectOption[]
  /** The applied picks. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  multiple?: boolean
  placeholder?: string
  searchPlaceholder?: string
  /** Shown when nothing matches the query. */
  emptyText?: React.ReactNode
  applyLabel?: string
  cancelLabel?: string
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
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results',
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
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
  wrapperClassName,
  className,
  ...props
}: ComboboxProps) {
  const chrome = useFieldChrome({ id, disabled, error, hint })
  const listId = `${chrome.controlId}-list`

  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const applied = value ?? uncontrolledValue
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen

  // Picks made in the panel, applied only by Apply.
  const [pending, setPending] = React.useState<string[]>(applied)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)

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
  const toggle = (v: string) =>
    setPending((p) => (multiple ? (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]) : p[0] === v ? [] : [v]))
  const apply = () => {
    if (value == null) setUncontrolledValue(pending)
    onValueChange?.(pending)
    setOpen(false)
  }

  const labels = applied.map((v) => options.find((o) => o.value === v)?.label).filter(Boolean) as string[]
  const display = labels.length === 0 ? null : labels.length <= 2 ? labels.join(', ') : `${labels.length} selected`

  return (
    <FieldChrome label={label} chrome={chrome} className={wrapperClassName}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          id={chrome.controlId}
          data-slot="combobox-trigger"
          data-size={size}
          data-filled={display ? true : undefined}
          data-invalid={chrome.invalid || undefined}
          data-disabled={chrome.disabled || undefined}
          disabled={chrome.disabled}
          aria-invalid={chrome.invalid || undefined}
          aria-describedby={chrome.describedBy}
          aria-label={props['aria-label']}
          aria-haspopup="listbox"
          className={cn('satin-field satin-select', className)}
        >
          {leadingIcon && (
            <span className="satin-field-icon" aria-hidden>
              {leadingIcon}
            </span>
          )}
          <span className={cn('min-w-0 flex-1 truncate', display ? 'text-text-default' : 'text-text-muted')}>
            {display ?? placeholder}
          </span>
          <SelectChevron />
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal container={container}>
          <PopoverPrimitive.Content
            data-slot="combobox"
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={8}
            onOpenAutoFocus={onOpenAutoFocus}
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
                    e.preventDefault()
                    const step = e.key === 'ArrowDown' ? 1 : -1
                    setActive((a) => (shown.length ? (a + step + shown.length) % shown.length : 0))
                  } else if (e.key === 'Enter' && shown[active]) {
                    e.preventDefault()
                    if (!shown[active].disabled) toggle(shown[active].value)
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
                  const picked = pending.includes(o.value)
                  return (
                    <div
                      key={o.value}
                      id={`${listId}-${o.value}`}
                      role="option"
                      aria-selected={picked}
                      aria-disabled={o.disabled || undefined}
                      data-highlighted={i === active ? '' : undefined}
                      data-disabled={o.disabled ? '' : undefined}
                      onPointerMove={() => setActive(i)}
                      // Keep focus in the query field.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => !o.disabled && toggle(o.value)}
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

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle p-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
              <Button disabled={pending.length === 0} onClick={apply}>
                {applyLabel}
              </Button>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </FieldChrome>
  )
}
