'use client'

import * as React from 'react'
import { Search } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Kbd, KbdArrowDown, KbdArrowUp, KbdHint, KbdReturn } from './kbd'
import { useSatinLabels } from './labels'
import { useCommandList, type CommandGroup } from './command-menu'

/**
 * SearchBar, 1:1 with the uiKit `searchBar` (3233:18871): a 32px field for the sidebar that
 * fills its container. A 16px search icon in text/muted, 13px text (placeholder text/subtle),
 * 8px padding and gaps, radius-lg, border/default on bg/card with the xs shadow; hover takes
 * border/strong, focus border/focus with the 2px focus ring. The ⌘K keys (Kbd sm) can be hidden
 * with `shortcut={false}`.
 *
 * With `shortcut`, ⌘K or Ctrl+K anywhere on the page focuses it; Escape clears it. The
 * placeholder defaults to the `search` label ("Search…").
 *
 * `variant="panel"` is search with its results in place, for a settings page or a sidebar
 * that searches its own items: a bg/muted panel (radius-2xl, border/subtle) with a 56px search
 * row (16px icon, 16px query), the results on a bg/card sheet with rounded top corners, and a
 * 44px footer of key hints (Navigate, Open) with your `meta` on the right ("59 settings
 * indexed"). Before anything is typed it shows `idleText` (or every item, without it); then the
 * `groups` filtered by label, description and keywords, as in CommandMenu: the arrows move the
 * highlight, Enter runs the item's `onSelect`, focus stays in the field.
 *
 * Other props, `ref` included, go to the input; `wrapperClassName` styles the field around it.
 */
export interface SearchBarProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  /** Show the ⌘K keycaps and listen for the shortcut. */
  shortcut?: boolean
  /** Listen for ⌘K / Ctrl+K. Defaults to `shortcut`; turn it off when something else owns the
   *  shortcut (a Command menu this bar opens) but the keycaps should still show. */
  hotkey?: boolean
  /** Classes for the outer field; `className` styles the input. */
  wrapperClassName?: string
  /** `field`: the 32px bar. `panel`: the search row over its results and a footer of key hints. */
  variant?: 'field' | 'panel'
  /** panel: what can be found, grouped, as in CommandMenu. */
  groups?: CommandGroup[]
  /** panel: shown before anything is typed, e.g. what the search looks through. Without it, every item. */
  idleText?: React.ReactNode
  /** panel: shown when nothing matches; gets the query. Defaults to the `noResultsFor` label. */
  emptyText?: (query: string) => React.ReactNode
  /** panel: on the right of the footer, e.g. "59 settings indexed". */
  meta?: React.ReactNode
  /** panel: show the Navigate and Open key hints. */
  hints?: boolean
}

export function SearchBar({
  variant = 'field',
  shortcut = variant === 'field',
  hotkey = shortcut,
  groups,
  idleText,
  emptyText,
  meta,
  hints = true,
  wrapperClassName,
  className,
  placeholder,
  onKeyDown,
  onChange,
  value,
  defaultValue,
  ref: forwarded,
  ...props
}: SearchBarProps) {
  const labels = useSatinLabels()
  const inner = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(forwarded, () => inner.current as HTMLInputElement)
  // The query, yours (value) or ours, so the panel can filter on it.
  const [own, setOwn] = React.useState(String(defaultValue ?? ''))
  const query = value != null ? String(value) : own
  const list = useCommandList(groups ?? [], query, (item) => item.onSelect?.())
  const panel = variant === 'panel'

  React.useEffect(() => {
    if (!hotkey) return
    const onKey = (e: KeyboardEvent) => {
      // A field that already used ⌘K for itself (a rich text editor's link) keeps it.
      if (e.defaultPrevented) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inner.current?.focus()
        inner.current?.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hotkey])

  const input = (
    <input
      ref={inner}
      type="search"
      // A name of its own: a placeholder isn't one every screen reader reads. Your aria-label wins.
      aria-label={labels.searchField}
      placeholder={placeholder ?? labels.search}
      {...(panel ? list.inputProps : {})}
      value={value ?? own}
      onChange={(e) => {
        if (value == null) setOwn(e.target.value)
        onChange?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && e.currentTarget.value) {
          e.preventDefault()
          const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
          set?.call(e.currentTarget, '')
          e.currentTarget.dispatchEvent(new Event('input', { bubbles: true }))
        }
        if (panel) list.onKeyDown(e)
        onKeyDown?.(e)
      }}
      className={cn(
        'min-w-0 flex-1 bg-transparent text-text-default outline-none placeholder:text-text-muted focus-visible:ring-0',
        panel ? 'text-lg leading-6' : 'text-sm',
        '[&::-webkit-search-cancel-button]:appearance-none',
        className,
      )}
      {...props}
    />
  )
  const keys = shortcut && (
    <span aria-hidden className="flex shrink-0 items-center gap-0.5">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </span>
  )

  if (panel) {
    const idle = !query.trim() && idleText != null
    return (
      <div
        data-slot="search-bar"
        data-variant="panel"
        className={cn(
          'flex w-full flex-col overflow-clip rounded-2xl border border-strong border-border-subtle bg-bg-muted',
          // Keycaps take the sheet's colour: on bg/muted their own bg/muted would vanish.
          '[--component-kbd-bg:var(--bg-card)]',
          'transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
          'has-[input:focus-visible]:border-border-focus has-[input:focus-visible]:[box-shadow:0_0_0_1px_var(--border-focus)]',
          wrapperClassName,
        )}
      >
        <label className="flex h-14 shrink-0 cursor-text items-center gap-3 px-5">
          <Search aria-hidden className="size-icon-size shrink-0 text-text-muted [stroke-width:1.875]" />
          {input}
          {keys}
        </label>
        {/* The results on a sheet of their own: rounded at the top, its sides on the panel's. */}
        <div data-slot="search-bar-results" className="-mx-px flex min-h-0 flex-col rounded-t-2xl border border-b-0 border-border-subtle bg-bg-card">
          {idle ? (
            <p className="px-6 py-12 text-center text-base leading-5 text-text-muted">{idleText}</p>
          ) : (
            list.renderList({
              label: labels.searchField,
              className: 'max-h-80',
              empty: <p className="px-4 py-10 text-center text-base leading-5 text-text-muted">{(emptyText ?? labels.noResultsFor)(query)}</p>,
            })
          )}
        </div>
        {(hints || meta != null) && (
          <div className="flex h-11 shrink-0 items-center gap-4 border-t border-border-subtle px-5">
            {hints && (
              <span aria-hidden className="flex items-center gap-4">
                <KbdHint keys={[<KbdArrowUp key="up" />, <KbdArrowDown key="down" />]} label={labels.navigate} />
                <KbdHint keys={[<KbdReturn key="return" />]} label={labels.openItem} />
              </span>
            )}
            {meta != null && <span className="ms-auto text-xs leading-4 tracking-normal text-text-muted">{meta}</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <label
      data-slot="search-bar"
      className={cn(
        'flex h-control-height-lg w-full cursor-text items-center gap-2 rounded-lg border border-strong border-border-default bg-bg-card px-2',
        '[box-shadow:0_1px_1px_0_var(--effect-shadow-xs)] transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
        'hover:border-border-strong',
        // Focus: a 2px border/focus edge, as on every field.
        'has-[input:focus-visible]:border-border-focus has-[input:focus-visible]:[box-shadow:0_0_0_1px_var(--border-focus)]',
        wrapperClassName,
      )}
    >
      <Search aria-hidden className="size-4 shrink-0 text-text-muted [stroke-width:1.875]" />
      {input}
      {keys}
    </label>
  )
}
