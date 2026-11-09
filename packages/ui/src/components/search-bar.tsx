'use client'

import * as React from 'react'
import { Search } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Kbd } from './kbd'

/**
 * SearchBar, 1:1 with the uiKit `searchBar` (3233:18871): a 32px field for the sidebar that
 * fills its container. A 16px search icon in text/muted, 13px text (placeholder text/subtle),
 * 8px padding and gaps, radius-lg, border/default on bg/card with the xs shadow; hover takes
 * border/strong, focus border/focus with the 2px focus ring. The ⌘K keys (Kbd sm) can be hidden
 * with `shortcut={false}`.
 *
 * With `shortcut`, ⌘K or Ctrl+K anywhere on the page focuses it; Escape clears it.
 */
export interface SearchBarProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  /** Show the ⌘K keycaps and listen for the shortcut. */
  shortcut?: boolean
  /** Listen for ⌘K / Ctrl+K. Defaults to `shortcut`; turn it off when something else owns the
   *  shortcut (a Command menu this bar opens) but the keycaps should still show. */
  hotkey?: boolean
  /** Classes for the outer field; `className` styles the input. */
  wrapperClassName?: string
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { shortcut = true, hotkey = shortcut, wrapperClassName, className, placeholder = 'Search...', onKeyDown, ...props },
  forwarded,
) {
  const inner = React.useRef<HTMLInputElement>(null)
  React.useImperativeHandle(forwarded, () => inner.current as HTMLInputElement)

  React.useEffect(() => {
    if (!hotkey) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inner.current?.focus()
        inner.current?.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [hotkey])

  return (
    <label
      data-slot="search-bar"
      className={cn(
        'flex h-control-height-lg w-full cursor-text items-center gap-2 rounded-lg border border-border-default bg-bg-card px-2',
        '[box-shadow:0_1px_1px_0_var(--effect-shadow-xs)] transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
        'hover:border-border-strong',
        'has-[input:focus-visible]:border-border-focus has-[input:focus-visible]:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        wrapperClassName,
      )}
    >
      <Search aria-hidden className="size-4 shrink-0 text-text-muted [stroke-width:1.875]" />
      <input
        ref={inner}
        type="search"
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && e.currentTarget.value) {
            e.preventDefault()
            const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
            set?.call(e.currentTarget, '')
            e.currentTarget.dispatchEvent(new Event('input', { bubbles: true }))
          }
          onKeyDown?.(e)
        }}
        className={cn(
          'min-w-0 flex-1 bg-transparent text-sm text-text-default outline-none placeholder:text-text-muted focus-visible:ring-0',
          '[&::-webkit-search-cancel-button]:appearance-none',
          className,
        )}
        {...props}
      />
      {shortcut && (
        <span aria-hidden className="flex shrink-0 items-center gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      )}
    </label>
  )
})
