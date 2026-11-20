'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Plus, Search, WarningCircle } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { Chip } from './chip'
import { MenuItemContent, menuGroupClass, menuGroupLabelClass, menuItemClass, menuSurfaceClass } from './dropdown'
import { useSatinLabels } from './labels'
import { FieldChrome, SelectChevron, isOptionGroups, useFieldChrome, type SelectGroup, type SelectOption } from './select'
import { Spinner } from './spinner'

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
 * Options can come in titled groups (`SelectGroup[]`, as in Select): each is a `group` named by
 * its 24px header, with a rule under it; a group left empty by the query is left out. Values are
 * unique across groups.
 *
 * When the app searches itself: `filter={false}` lists `options` as they are, `onQueryChange`
 * gets the query as it's typed (and '' when the list opens again), `loading` swaps the search
 * icon for a Spinner and marks the list busy, and `selectedOptions` holds the picks the current
 * results may not include, so their chips stay. `renderOption` draws a row's content and
 * `renderValue` the picks in the field, for options that need more than a label and an icon.
 *
 * `creatable` lets people add a value the list doesn't have: while the query matches no option's
 * label exactly (case aside), the list ends with a `Create "…"` row under a bg/muted rule (the
 * rule only when options show above it; after a titled group, the group's own rule). Picking it
 * calls `onCreate`; its option joins the list and is picked the way any pick is: at once, or
 * waiting for Apply with `footer`. A promise shows a Spinner on the row until it settles; a
 * rejection says so under the row, and the row stays to try again. The row works with groups,
 * `filter={false}` and while `loading`.
 *
 * Other props, `ref` included, go to the trigger button that covers the field (the element its
 * label points at); `className` styles the field around it.
 */
export interface ComboboxProps
  extends Omit<React.ComponentProps<typeof PopoverPrimitive.Trigger>, 'value' | 'defaultValue' | 'disabled' | 'children' | 'asChild'> {
  /** Options, or titled groups of options. */
  options: SelectOption[] | SelectGroup[]
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
  /**
   * How typing narrows the list: by label and description (`true`), by your own test, or not at
   * all (`false`), when the app searches and passes the results as `options`.
   */
  filter?: boolean | ((option: SelectOption, query: string) => boolean)
  /** The query as it's typed, and '' when the list opens again: for searching on the app's side. */
  onQueryChange?: (query: string) => void
  /** The app is searching: a Spinner in place of the search icon, `aria-busy` on the list. */
  loading?: boolean
  /** Shown in place of `emptyText` while `loading` and nothing is listed. Defaults to the `loading` label. */
  loadingText?: React.ReactNode
  /**
   * The picks as options, for picks `options` doesn't hold right now (search results change with
   * the query). The field takes a pick's label and icon from here first.
   */
  selectedOptions?: SelectOption[]
  /** Draws a row's content in place of the default label, description, icon and check. */
  renderOption?: (option: SelectOption, state: { selected: boolean }) => React.ReactNode
  /**
   * Draws the picks in the field in place of the chips (`multiple`) or the picked label. `remove`
   * drops one pick.
   */
  renderValue?: (picked: SelectOption[], api: { remove: (value: string) => void; disabled: boolean }) => React.ReactNode
  /** Defaults to the `apply` label. */
  applyLabel?: string
  /** Defaults to the `cancel` label. */
  cancelLabel?: string
  /** Defaults to the `clear` label. */
  clearLabel?: string
  /**
   * Offer a `Create "…"` row at the end of the list while the query matches no option exactly.
   * `label` words the row (default: the `createOption` label, which also names it for screen
   * readers).
   */
  creatable?: boolean | { label?: (query: string) => React.ReactNode }
  /**
   * Makes the option for a query from the create row (trimmed). Return it, or a promise of it:
   * the row shows a Spinner until it settles, and a rejection (or a throw) shows the
   * `createFailed` label under the row. The option is added to the list and picked; it stays
   * while the Combobox is mounted, so add it to `options` to keep it. Left out, the option is
   * `{ value: query, label: query }`.
   */
  onCreate?: (query: string) => SelectOption | Promise<SelectOption>
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

const isPromise = <T,>(x: T | Promise<T>): x is Promise<T> => typeof (x as Promise<T> | null)?.then === 'function'

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
  filter = true,
  onQueryChange,
  loading = false,
  loadingText: loadingTextProp,
  selectedOptions,
  renderOption,
  renderValue,
  applyLabel: applyLabelProp,
  cancelLabel: cancelLabelProp,
  clearLabel: clearLabelProp,
  creatable,
  onCreate,
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
  const loadingText = loadingTextProp ?? labels.loading
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

  // Options made with the create row: listed (after `options`) until the app adds them itself.
  const [created, setCreated] = React.useState<SelectOption[]>([])
  // The query whose option is on its way (a pending promise), and the one whose create failed.
  const [creating, setCreating] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState<string | null>(null)
  const [highlight, setHighlight] = React.useState<string | null>(null)

  const changeQuery = (next: string) => {
    setQuery(next)
    setActive(0)
    onQueryChange?.(next)
  }

  const setOpen = (next: boolean) => {
    if (next) {
      setPending(applied)
      if (query) changeQuery('')
      else setActive(0)
      setFailed(null)
    }
    if (openProp == null) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const given: SelectGroup[] = isOptionGroups(options) ? options : [{ options }]
  // Created options the app hasn't added yet follow the given ones, untitled.
  const extra = created.filter((c) => !given.some((g) => g.options.some((o) => o.value === c.value)))
  const groups = extra.length ? [...given, { options: extra }] : given
  const all = groups.flatMap((g) => g.options)
  const test = typeof filter === 'function' ? filter : filter ? matches : () => true
  const shownGroups = groups.map((g) => ({ ...g, options: g.options.filter((o) => test(o, query)) })).filter((g) => g.options.length > 0)
  const shown = shownGroups.flatMap((g) => g.options)

  // The create row: the query on its way, else the typed one while no label is exactly it.
  const typed = query.trim()
  const exact = all.some((o) => o.label.trim().toLowerCase() === typed.toLowerCase())
  const toCreate = creatable ? (creating ?? (typed && !exact ? typed : null)) : null
  const rows = shown.length + (toCreate == null ? 0 : 1)
  const createId = `${chrome.controlId}-create`
  // Results the app swaps in can be fewer than the highlight's place.
  const current = Math.max(0, Math.min(active, rows - 1))
  const onCreateRow = toCreate != null && current === shown.length
  const busy = creating != null
  const failedNow = !busy && failed != null && failed === toCreate
  const createLabel = typeof creatable === 'object' ? creatable.label : undefined
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

  // A promise settles renders later: read the picks, the query and the callbacks of the latest render then.
  const latest = React.useRef({ applied, commit, setOpen, open, query, changeQuery })
  React.useLayoutEffect(() => {
    latest.current = { applied, commit, setOpen, open, query, changeQuery }
  })
  // The new option takes the highlight once it is in the list, and comes into view.
  React.useLayoutEffect(() => {
    if (highlight == null) return
    const i = shown.findIndex((o) => o.value === highlight)
    if (i >= 0) {
      setActive(i)
      document.getElementById(`${listId}-${highlight}`)?.scrollIntoView?.({ block: 'nearest' })
    }
    setHighlight(null)
  }, [highlight])
  // Focus stays in the query field, so nothing scrolls the list for the arrows: keep the
  // highlighted row in view. Only for keys; a row under the pointer is in view already.
  React.useEffect(() => {
    if (!viaKeys) return
    const id = shown[current] ? `${listId}-${shown[current].value}` : onCreateRow ? createId : undefined
    if (id) document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' })
  }, [current, viaKeys])

  const added = (q: string, o: SelectOption | undefined) => {
    if (!o) return setFailed(q)
    setCreated((c) => (c.some((x) => x.value === o.value) ? c : [...c, o]))
    const now = latest.current
    // The query did its job: the whole list comes back with the new option picked and highlighted
    // (unless something else was typed meanwhile). The app hears the query go, as with typing.
    if (now.query.trim() === q) now.changeQuery('')
    setHighlight(o.value)
    if (footer) return setPending((p) => (!multiple ? [o.value] : p.includes(o.value) ? p : [...p, o.value]))
    if (multiple) return now.commit(now.applied.includes(o.value) ? now.applied : [...now.applied, o.value])
    now.commit([o.value])
    if (now.open) now.setOpen(false)
  }
  const create = (q: string) => {
    if (busy) return
    setFailed(null)
    let result: SelectOption | Promise<SelectOption>
    try {
      result = onCreate ? onCreate(q) : { value: q, label: q }
    } catch {
      return setFailed(q)
    }
    if (!isPromise(result)) return added(q, result)
    setCreating(q)
    result.then(
      (o) => {
        setCreating(null)
        added(q, o)
      },
      () => {
        setCreating(null)
        setFailed(q)
      },
    )
  }

  const find = (v: string) => selectedOptions?.find((o) => o.value === v) ?? all.find((o) => o.value === v)
  const chosen = applied.map(find).filter(Boolean) as SelectOption[]
  const remove = (v: string) => commit(applied.filter((x) => x !== v))
  // Clear leaves with the picks: focus goes back to the field instead of the page.
  const clear = () => {
    commit([])
    document.getElementById(chrome.controlId)?.focus()
  }
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
          <Button variant="tertiary" size="xs" disabled={chrome.disabled} onClick={clear}>
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
                (renderValue
                  ? renderValue(chosen, { remove, disabled: chrome.disabled })
                  : chosen.map((o) => (
                      <Chip
                        key={o.value}
                        size="sm"
                        variant="outline"
                        disabled={chrome.disabled}
                        removeLabel={labels.removeItem(o.label)}
                        onRemove={() => remove(o.value)}
                        className="relative"
                      >
                        {o.label}
                      </Chip>
                    )))}
              {triggerText && (
                <span aria-hidden className={cn('pointer-events-none! min-w-0 flex-1 truncate', chosen.length ? 'text-text-default' : 'text-text-muted')}>
                  {renderValue && chosen.length ? renderValue(chosen, { remove, disabled: chrome.disabled }) : triggerText}
                </span>
              )}
              {/* Without a label there is no line above the field for Clear: it follows the chips. */}
              {!label && chips && chosen.length > 1 && (
                <Button
                  variant="tertiary"
                  size="xs"
                  disabled={chrome.disabled}
                  className="relative ms-auto"
                  onClick={clear}
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
            // The panel is a dialog: it takes the field's name (its label, or its aria-label).
            aria-labelledby={label ? `${chrome.controlId}-label` : undefined}
            aria-label={label ? undefined : (props['aria-label'] ?? searchPlaceholder)}
            className={cn(
              'pointer-events-auto z-50 flex w-(--radix-popover-trigger-width) min-w-60 max-w-[520px] flex-col overflow-hidden',
              menuSurfaceClass,
              'origin-(--radix-popover-content-transform-origin) outline-none',
              'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
            )}
          >
            <label className="flex h-9 shrink-0 items-center gap-2 border-b border-border-subtle px-3 text-text-muted">
              {loading ? (
                <Spinner size="md" label={null} />
              ) : (
                <Search aria-hidden className="size-4 shrink-0 [stroke-width:1.875]" />
              )}
              <input
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={shown[current] ? `${listId}-${shown[current].value}` : onCreateRow ? createId : undefined}
                aria-label={searchPlaceholder}
                value={query}
                placeholder={searchPlaceholder}
                onChange={(e) => changeQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    setViaKeys(true)
                    e.preventDefault()
                    const step = e.key === 'ArrowDown' ? 1 : -1
                    setActive(rows ? (current + step + rows) % rows : 0)
                  } else if (e.key === 'Enter' && shown[current]) {
                    e.preventDefault()
                    if (!shown[current].disabled) pick(shown[current].value)
                  } else if (e.key === 'Enter' && onCreateRow && toCreate != null) {
                    e.preventDefault()
                    create(toCreate)
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-base leading-[21px] text-text-default outline-none placeholder:text-text-muted focus-visible:ring-0"
              />
            </label>

            <div
              id={listId}
              role="listbox"
              aria-multiselectable={multiple || undefined}
              aria-busy={loading || undefined}
              className={cn('flex max-h-60 flex-col gap-0.5 overflow-y-auto p-1', rows === 0 && 'hidden')}
            >
              {shownGroups.map((g, gi) => {
                const rows = g.options.map((o) => {
                  const i = shown.indexOf(o)
                  const picked = picks.includes(o.value)
                  return (
                    <div
                      key={o.value}
                      id={`${listId}-${o.value}`}
                      role="option"
                      aria-selected={picked}
                      aria-disabled={o.disabled || undefined}
                      data-highlighted={i === current ? '' : undefined}
                      data-keyboard={i === current && viaKeys ? '' : undefined}
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
                      {renderOption ? (
                        renderOption(o, { selected: picked })
                      ) : (
                        <MenuItemContent
                          label={o.label}
                          description={o.description}
                          icon={o.icon}
                          layout="inline"
                          shortcut={o.shortcut}
                          selected={picked}
                        />
                      )}
                    </div>
                  )
                })
                if (!g.label) return <React.Fragment key={gi}>{rows}</React.Fragment>
                // The header names the group; it's hidden itself so it isn't read as a row.
                const headerId = `${listId}-group-${gi}`
                return (
                  <div key={gi} role="group" aria-labelledby={headerId} className={cn(menuGroupClass, 'gap-0.5')}>
                    <div id={headerId} aria-hidden className={menuGroupLabelClass}>
                      {g.label}
                    </div>
                    {rows}
                  </div>
                )
              })}
              {/* A titled group draws its own rule under it; other rows get this one. */}
              {toCreate != null && shown.length > 0 && !shownGroups[shownGroups.length - 1].label && (
                <div aria-hidden className="-mx-1 my-0.5 h-(--border-width-default) shrink-0 bg-bg-muted" />
              )}
              {toCreate != null && (
                <div
                  id={createId}
                  role="option"
                  aria-selected={false}
                  aria-disabled={busy || undefined}
                  aria-busy={busy || undefined}
                  data-slot="combobox-create"
                  data-state={busy ? 'creating' : failedNow ? 'failed' : 'idle'}
                  data-highlighted={onCreateRow ? '' : undefined}
                  data-keyboard={onCreateRow && viaKeys ? '' : undefined}
                  onPointerMove={() => {
                    setViaKeys(false)
                    setActive(shown.length)
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => create(toCreate)}
                  className={menuItemClass}
                >
                  <MenuItemContent
                    icon={busy ? <Spinner label={null} /> : failedNow ? <WarningCircle className="text-text-destructive" /> : <Plus />}
                    label={<span className="[overflow-wrap:anywhere]">{createLabel ? createLabel(toCreate) : labels.createOption(toCreate)}</span>}
                    description={failedNow ? <span className="text-text-destructive">{labels.createFailed}</span> : undefined}
                  />
                </div>
              )}
            </div>
            {/* Outside the listbox, which may hold only options: read out as it changes. */}
            {rows === 0 && (
              <p role="status" className="px-3 py-6 text-center text-sm text-text-muted">
                {loading ? loadingText : emptyText}
              </p>
            )}
            {/* The create row says it failed; this says it once, without moving focus. */}
            {creatable && (
              <span role="status" className="sr-only">
                {failedNow ? labels.createFailed : ''}
              </span>
            )}

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
