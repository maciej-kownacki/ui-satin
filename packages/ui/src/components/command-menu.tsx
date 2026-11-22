'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Search } from 'iconoir-react'
import { cn } from '../lib/utils'
import { menuItemClass, MenuItemContent } from './dropdown'
import { useSatinLabels } from './labels'
import { Kbd, KbdArrowDown, KbdArrowUp, KbdHint, KbdReturn } from './kbd'

/**
 * Command menu, 1:1 with the uiKit `Command menu` set (4024:3582): the ⌘K palette. A 520px
 * popover surface (radius-2xl, border/subtle, the shadcn `lg` shadow) with a 48px search row
 * (16px icon, 14px query, an Esc key, 16px in) over a border/subtle rule; titled groups 8px
 * apart in 8px of padding, each with a 24px heading (12px medium, text/muted) and inline menu
 * rows; and a 40px footer of key hints (Navigate, Open on the left, Close on the right).
 *
 * Rows are the Dropdown's: a 16px icon, the label, an optional description after it and an
 * optional `shortcut` (Kbd sm) on the right. The highlighted row takes the menu highlight,
 * bg/selected, whether the pointer or the arrow keys put it there. The first match is
 * highlighted; Enter runs it and closes the menu.
 *
 * It sits in the middle of the screen (or of its `container`).
 *
 * Built on the Radix Dialog (focus trap, Escape, focus back to where it was). With `hotkey`,
 * ⌘K or Ctrl+K anywhere on the page toggles it.
 *
 * For a menu that changes what it shows (sub-pages, an answer), `query` / `onQueryChange` drive
 * the search, an item with `keepOpen` runs without closing the menu, `header` goes above the
 * search row, `children` take the list's place, and `footer` replaces the key hints. Satin Pro's
 * CommandPages is built this way.
 *
 * Other props, `ref` included, go to the menu's panel (the Radix Content).
 */
export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  /** Keys that run it outside the menu, e.g. "⌘N". Optional. */
  shortcut?: string
  /** More words to match on. */
  keywords?: string[]
  disabled?: boolean
  /** Running it leaves the menu open: for an item that changes what the menu shows, such as a sub-page. */
  keepOpen?: boolean
  onSelect?: () => void
}

export interface CommandGroup {
  label: React.ReactNode
  items: CommandItem[]
}

export interface CommandMenuProps
  extends Omit<React.ComponentProps<typeof DialogPrimitive.Content>, 'children' | 'asChild' | 'placeholder' | 'onOpenAutoFocus'> {
  groups: CommandGroup[]
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Toggle the menu with ⌘K / Ctrl+K. */
  hotkey?: boolean
  /** The search field's placeholder. Defaults to the `commandPlaceholder` label. */
  placeholder?: string
  /** Shown when nothing matches; gets the query. Defaults to the `noResultsFor` label. */
  emptyText?: (query: string) => React.ReactNode
  /** Show the footer of key hints. */
  hints?: boolean
  /** Modal blocks the page and shows the overlay; turn it off for inline previews. */
  modal?: boolean
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  onOpenAutoFocus?: (event: Event) => void
  className?: string
  /** The search text. Pass it with onQueryChange to control it; it is emptied each time the menu closes. */
  query?: string
  onQueryChange?: (query: string) => void
  /** Above the search row, such as a Breadcrumb of the pages opened so far. */
  header?: React.ReactNode
  /** Key hints in place of Navigate, Open and Close; compose them from KbdHint. Shown when `hints` is on. */
  footer?: React.ReactNode
  /** Shown in place of the list, such as an answer to the query; the search row and the footer stay. */
  children?: React.ReactNode
}

const hit = (item: CommandItem, q: string) => {
  const t = q.trim().toLowerCase()
  if (!t) return true
  return [item.label, item.description ?? '', ...(item.keywords ?? [])].some((s) => s.toLowerCase().includes(t))
}

/**
 * @internal The search behind CommandMenu and SearchBar's `panel`: the groups filtered by the
 * query (label, description, keywords), one highlighted row the arrows move and Enter runs, and
 * the listbox that shows them. `inputProps` and `onKeyDown` go on the search input, which keeps
 * focus; the rows are its `aria-activedescendant`.
 */
export function useCommandList(groups: CommandGroup[], query: string, onRun: (item: CommandItem) => void) {
  const [active, setActive] = React.useState(0)
  // The highlight shows the focus ring only when the arrows put it there (see menuItemClass).
  const [viaKeys, setViaKeys] = React.useState(false)
  const listId = React.useId()
  const listRef = React.useRef<HTMLDivElement>(null)
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((i) => hit(i, query)) })).filter((g) => g.items.length)
  const flat = shown.flatMap((g) => g.items)
  const optionId = (i: number) => `${listId}-${i}`

  // A new query, or new rows for the same one (another page), starts from its first match. Set
  // while rendering, so the old highlight never shows on the new rows.
  const rowsKey = `${query}\n${flat.map((i) => i.id).join('\n')}`
  const [seenRows, setSeenRows] = React.useState(rowsKey)
  if (seenRows !== rowsKey) {
    setSeenRows(rowsKey)
    setActive(0)
  }
  // Keep the highlighted row in view as the arrows move it.
  React.useEffect(() => {
    listRef.current?.querySelector(`[id="${optionId(active)}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (item: CommandItem | undefined) => {
    if (!item || item.disabled) return
    onRun(item)
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setViaKeys(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (flat.length ? (a + step + flat.length) % flat.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(flat[active])
    }
  }
  const inputProps = {
    role: 'combobox',
    'aria-expanded': true,
    'aria-controls': listId,
    'aria-autocomplete': 'list',
    'aria-activedescendant': flat[active] ? optionId(active) : undefined,
  } as const

  const renderList = ({ label, empty, className }: { label: string; empty: React.ReactNode; className?: string }) => {
    let index = -1
    return (
      <div ref={listRef} id={listId} role="listbox" aria-label={label} className={cn('flex min-h-0 flex-col gap-2 overflow-y-auto p-2', className)}>
        {flat.length === 0
          ? empty
          : shown.map((g, gi) => (
              <div key={gi} role="group" aria-labelledby={`${listId}-g${gi}`} className="flex flex-col">
                <div id={`${listId}-g${gi}`} className="flex h-6 items-center px-2 text-xs leading-3 font-medium tracking-normal text-text-muted">
                  {g.label}
                </div>
                {g.items.map((item) => {
                  index += 1
                  const i = index
                  return (
                    <div
                      key={item.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === active}
                      aria-disabled={item.disabled || undefined}
                      data-highlighted={i === active ? '' : undefined}
                      data-keyboard={i === active && viaKeys ? '' : undefined}
                      data-disabled={item.disabled ? '' : undefined}
                      onPointerMove={() => {
                        setViaKeys(false)
                        setActive(i)
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => run(item)}
                      className={menuItemClass}
                    >
                      <MenuItemContent label={item.label} description={item.description} icon={item.icon} layout="inline" shortcut={item.shortcut} />
                    </div>
                  )
                })}
              </div>
            ))}
      </div>
    )
  }

  return { flat, inputProps, onKeyDown, renderList }
}

export function CommandMenu({
  groups,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  hotkey = true,
  placeholder,
  emptyText,
  hints = true,
  modal = true,
  container,
  onOpenAutoFocus,
  className,
  query: queryProp,
  onQueryChange,
  header,
  footer,
  children,
  ...props
}: CommandMenuProps) {
  const labels = useSatinLabels()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp == null) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )

  const [uncontrolledQuery, setUncontrolledQuery] = React.useState('')
  const query = queryProp ?? uncontrolledQuery
  const queryChange = React.useRef(onQueryChange)
  queryChange.current = onQueryChange
  const setQuery = React.useCallback(
    (next: string) => {
      if (queryProp == null) setUncontrolledQuery(next)
      queryChange.current?.(next)
    },
    [queryProp],
  )
  const list = useCommandList(groups, query, (item) => {
    if (!item.keepOpen) setOpen(false)
    item.onSelect?.()
  })
  // Children in place of the list: the field no longer points at one.
  const showList = children == null

  React.useEffect(() => {
    if (!hotkey) return
    const onKey = (e: KeyboardEvent) => {
      // A field that already used ⌘K for itself (a rich text editor's link) keeps it.
      if (e.defaultPrevented) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hotkey, open, setOpen])

  // A fresh query every time it opens. Emptied as it closes, so a query set while it is closed
  // (to open it on a search) is the one it opens with.
  const wasOpen = React.useRef(open)
  React.useEffect(() => {
    if (wasOpen.current && !open) setQuery('')
    wasOpen.current = open
  }, [open, setQuery])

  const position = container ? 'absolute' : 'fixed'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen} modal={modal}>
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Overlay className={cn(position, 'inset-0 z-50 bg-black-a40')} />
        <div className={cn(position, 'pointer-events-none inset-0 z-50 flex items-center justify-center p-4')}>
          <DialogPrimitive.Content
            // No description: tell Radix on purpose, so it doesn't warn (an aria-describedby passed in still wins).
            aria-describedby={undefined}
            {...props}
            data-slot="command-menu"
            onOpenAutoFocus={onOpenAutoFocus}
            className={cn(
              'pointer-events-auto flex h-fit max-h-[min(480px,76vh)] w-[520px] max-w-full flex-col overflow-hidden',
              'rounded-2xl border border-border-subtle bg-bg-popover',
              '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-float-contact),0_10px_15px_-3px_var(--effect-shadow-float-contact),0_2px_20px_0_var(--effect-shadow-float)]',
              'outline-none data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
              className,
            )}
          >
            <DialogPrimitive.Title className="sr-only">{labels.commandMenu}</DialogPrimitive.Title>
            {header}
            <label className="flex h-12 shrink-0 items-center gap-2 border-b-[length:var(--border-width-strong)] border-border-subtle px-4 text-text-muted">
              <Search aria-hidden className="size-4 shrink-0 [stroke-width:1.875]" />
              <input
                {...(showList ? list.inputProps : { role: 'combobox', 'aria-expanded': false, 'aria-autocomplete': 'list' })}
                aria-label={labels.searchCommands}
                value={query}
                placeholder={placeholder ?? labels.commandPlaceholder}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={showList ? list.onKeyDown : undefined}
                className="min-w-0 flex-1 bg-transparent text-base leading-[21px] text-text-default outline-none placeholder:text-text-muted focus-visible:ring-0"
              />
              <Kbd size="md" aria-hidden>
                Esc
              </Kbd>
            </label>

            {/* The list's own box, which nothing else sizes: a menu that steps between pages (Satin
                Pro's CommandPages) slides the list in it and eases it to the new height. */}
            <div data-slot="command-menu-body" className="relative flex min-h-0 flex-col overflow-hidden">
              {showList
                ? list.renderList({
                    label: labels.commands,
                    empty: <p className="px-2 py-8 text-center text-sm text-text-muted">{(emptyText ?? labels.noResultsFor)(query)}</p>,
                  })
                : children}
            </div>

            {hints && (
              <div aria-hidden className="flex h-10 shrink-0 items-center gap-4 border-t-[length:var(--border-width-strong)] border-border-subtle px-4">
                {footer ?? (
                  <>
                    <KbdHint keys={[<KbdArrowUp key="up" />, <KbdArrowDown key="down" />]} label={labels.navigate} />
                    <KbdHint keys={[<KbdReturn key="return" />]} label={labels.openItem} />
                    <KbdHint className="ms-auto" keys={['Esc']} label={labels.close} />
                  </>
                )}
              </div>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
