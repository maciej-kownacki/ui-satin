'use client'

import * as React from 'react'
import { Toolbar as ToolbarPrimitive } from 'radix-ui'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { DropdownMenu, DropdownMenuItem } from '@uisatin/ui/dropdown'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Separator } from '@uisatin/ui/separator'
import { Tooltip } from '@uisatin/ui/tooltip'
import { RollingNumber } from './rolling-number'

/**
 * BulkActionBar: what appears when rows are selected. A select-all checkbox and the count in a
 * grey Badge ("[3] selected"), then the actions as buttons, then the rest in a ⋯ menu, and the
 * clear button (×) at the end, after a rule. A `role="toolbar"` on the popover surface
 * (bg/popover, border/subtle, radius-xl, the toast's shadow), floating at the bottom of its
 * container.
 *
 * - With `total` and `onSelectAll`, the bar starts with a Checkbox: indeterminate while some
 *   are selected, checked when all are. One click selects all (`onSelectAll`); a click when all
 *   are selected clears them.
 * - The count's Badge fill is component/bulk-action-bar/count-bg: status/neutral in Light, a step
 *   lighter than the bar in Dark, where status/neutral would all but vanish on bg/popover.
 *
 * - Hidden at `count` 0. It rises 8px and fades in over --duration-slow; it leaves the same way,
 *   still showing the last count. The count's digits roll when it changes (150 ms), except under
 *   reduced motion.
 * - `position="sticky"` (default): it sits after the content and sticks 16px above the bottom
 *   of the screen while its container scrolls past, so it never covers the last row; its place
 *   stays reserved while hidden, so showing it never moves the page. `position="absolute"`
 *   lays it over the container's bottom edge instead: the container needs `position: relative`
 *   and 64px of bottom padding (`pb-16`) to keep its last row clear.
 * - An action whose `onSelect` returns a promise shows a Spinner until it settles, then a
 *   checkmark in place of its icon for a moment; screen readers hear "Done".
 * - Keys: Escape clears the selection while focus is anywhere in the bar's parent (the table and
 *   the bar), but not while typing in a field. Arrow keys, Home and End move along the toolbar.
 *   Actions have no shortcuts of their own: single keys in a list are easy to hit by accident and
 *   hard to discover.
 * - The count is read out from a polite live region as it changes.
 *
 * Works with Table's selection as it is: `count={selected.length}`, `total={rows.length}`,
 * `onSelectAll={() => setSelected(rows.map((r) => r.id))}` and `onClear={() => setSelected([])}`.
 *
 * Parts, for a bar of your own: `BulkActionBarRoot` › `BulkActionBarCount`,
 * `BulkActionBarSeparator`, `BulkActionBarAction`, `BulkActionBarOverflow`, `BulkActionBarClear`.
 * Other props on BulkActionBar and BulkActionBarRoot, `ref` included, go to the toolbar element.
 */

/** The words the Bulk action bar says on its own. They join SatinLabels, so the app translates them there. */
export const bulkActionBarLabels = {
  /** The toolbar's name. */
  bulkActions: 'Bulk actions',
  /**
   * "3 selected". `number` is the count as shown (it rolls); `count` picks the plural. Write it
   * with JSX: `(count, number) => <>Zaznaczono: {number}</>`.
   */
  bulkSelected: (count: number, number: React.ReactNode): React.ReactNode => <>{number} selected</>,
  /** The checkbox before the count. */
  selectAll: 'Select all',
  clearSelection: 'Clear selection',
  /** Read out after Escape or the clear button empties the selection. */
  selectionCleared: 'Selection cleared',
  moreActions: 'More actions',
}

type BulkActionBarLabels = typeof bulkActionBarLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends BulkActionBarLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...bulkActionBarLabels, ...labels }), [labels])
}

/* ---------- keys ---------- */

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/* ---------- the bar ---------- */

interface BarContextValue {
  /** The count on show: the last one above 0, so the bar leaves as it was. */
  count: number
  total?: number
  open: boolean
  clear: () => void
  selectAll?: () => void
  announce: (text: React.ReactNode) => void
  labels: ReturnType<typeof useLabels>
}

const BarContext = React.createContext<BarContextValue | null>(null)

function useBar(part: string) {
  const bar = React.useContext(BarContext)
  if (!bar) throw new Error(`${part} must be inside BulkActionBarRoot`)
  return bar
}

export interface BulkActionBarRootProps extends React.ComponentProps<typeof ToolbarPrimitive.Root> {
  /** How many items are selected. The bar shows from 1 and hides at 0. */
  count: number
  /** Empties the selection: the clear button, Escape and the checkbox (when all are selected) call it. */
  onClear: () => void
  /** How many items there are in all, so the checkbox knows when all of them are selected. */
  total?: number
  /** Selects every item. With it, the bar starts with a select-all Checkbox. */
  onSelectAll?: () => void
  /**
   * `sticky` sits after the content and sticks to the bottom of the screen while its container
   * scrolls past; `absolute` lays it over the container's bottom edge (give the container
   * `position: relative` and `pb-16`).
   */
  position?: 'sticky' | 'absolute'
  /** Classes for the element that places the bar (sticky or absolute, centred). */
  wrapperClassName?: string
}

/** The floating toolbar on its own: the parts go inside. */
export function BulkActionBarRoot({
  count,
  onClear,
  total,
  onSelectAll,
  position = 'sticky',
  wrapperClassName,
  className,
  children,
  onFocusCapture,
  onBlurCapture,
  ref,
  ...props
}: BulkActionBarRootProps) {
  const labels = useLabels()
  const open = count > 0
  // While it leaves, the bar still says the last count it had.
  const lastCount = React.useRef(count)
  if (open) lastCount.current = count
  const shownCount = open ? count : lastCount.current

  const regionRef = React.useRef<HTMLDivElement>(null)
  const barRef = React.useRef<HTMLDivElement>(null)

  // One polite region for what the bar says: the count, "Done", "Selection cleared".
  const [message, setMessage] = React.useState<React.ReactNode>(null)
  const formatted = new Intl.NumberFormat(labels.dateLocale).format(count)
  React.useEffect(() => {
    if (count > 0) setMessage(labels.bulkSelected(count, formatted))
  }, [count, formatted, labels])

  const onClearRef = React.useRef(onClear)
  onClearRef.current = onClear
  const clear = React.useCallback(() => {
    onClearRef.current()
    setMessage(labels.selectionCleared)
  }, [labels])

  const onSelectAllRef = React.useRef(onSelectAll)
  onSelectAllRef.current = onSelectAll
  const selectAll = React.useCallback(() => onSelectAllRef.current?.(), [])

  // Escape, anywhere in the parent: the table and the bar.
  React.useEffect(() => {
    const container = regionRef.current?.parentElement
    if (!container || !open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      if (e.key === 'Escape' && !isEditable(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        clear()
      }
    }
    container.addEventListener('keydown', onKeyDown)
    return () => container.removeEventListener('keydown', onKeyDown)
  }, [open, clear])

  // When the bar hides with focus in it, focus goes back to where it came from (the row's checkbox).
  const cameFrom = React.useRef<HTMLElement | null>(null)
  const focusInside = React.useRef(false)
  React.useLayoutEffect(() => {
    if (open || !focusInside.current) return
    focusInside.current = false
    const back = cameFrom.current
    if (back?.isConnected) back.focus()
    else if (barRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur()
  }, [open])

  const canSelectAll = onSelectAll !== undefined
  const value = React.useMemo(
    () => ({ count: shownCount, total, open, clear, selectAll: canSelectAll ? selectAll : undefined, announce: setMessage, labels }),
    [shownCount, total, open, clear, canSelectAll, selectAll, labels],
  )

  return (
    <BarContext.Provider value={value}>
      <div
        ref={regionRef}
        data-slot="bulk-action-bar-region"
        data-position={position}
        className={cn(
          'pointer-events-none z-20 flex justify-center',
          position === 'sticky' ? 'sticky bottom-4 mt-3' : 'absolute inset-x-0 bottom-4',
          wrapperClassName,
        )}
      >
        <ToolbarPrimitive.Root
          ref={(node: HTMLDivElement | null) => {
            barRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          data-slot="bulk-action-bar"
          data-state={open ? 'open' : 'closed'}
          aria-label={labels.bulkActions}
          aria-hidden={!open || undefined}
          inert={!open || undefined}
          className={cn(
            'satin-bulk-action-bar pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border-subtle bg-bg-popover p-1.5',
            '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
            className,
          )}
          onFocusCapture={(e: React.FocusEvent<HTMLDivElement>) => {
            const from = e.relatedTarget as HTMLElement | null
            if (!focusInside.current && from && !e.currentTarget.contains(from)) cameFrom.current = from
            focusInside.current = true
            onFocusCapture?.(e)
          }}
          onBlurCapture={(e: React.FocusEvent<HTMLDivElement>) => {
            const to = e.relatedTarget as Node | null
            // Focus going into a portaled menu (the ⋯ menu) still counts as in the bar.
            if (to && !e.currentTarget.contains(to) && !(to instanceof Element && to.closest('[data-slot="dropdown-menu"]'))) focusInside.current = false
            onBlurCapture?.(e)
          }}
          {...props}
        >
          {children}
        </ToolbarPrimitive.Root>
        <span role="status" className="sr-only">
          {message}
        </span>
      </div>
    </BarContext.Provider>
  )
}

/* ---------- the count ---------- */

export interface BulkActionBarCountProps extends React.ComponentProps<'div'> {}

/**
 * The select-all Checkbox (when the root has `onSelectAll`) and "[3] selected", the number in a
 * grey Badge. Other props, `ref` included, go to its `div`.
 */
export function BulkActionBarCount({ className, ...props }: BulkActionBarCountProps) {
  const { count, total, clear, selectAll, labels } = useBar('BulkActionBarCount')
  const formatted = new Intl.NumberFormat(labels.dateLocale).format(count)
  const all = total !== undefined && count >= total
  return (
    <div data-slot="bulk-action-bar-count" className={cn('flex shrink-0 items-center gap-2 ps-2 pe-1', className)} {...props}>
      {selectAll && (
        <ToolbarPrimitive.Button asChild>
          <Checkbox
            data-slot="bulk-action-bar-select-all"
            aria-label={labels.selectAll}
            checked={all ? true : 'indeterminate'}
            // One click selects all; when all are selected, it clears them.
            onCheckedChange={() => (all ? clear() : selectAll())}
            className="me-0.5"
          />
        </ToolbarPrimitive.Button>
      )}
      <span className="flex items-center gap-1.5 text-sm leading-5 font-medium whitespace-nowrap text-text-default">
        {labels.bulkSelected(
          count,
          <Badge size="sm" shape="rounded" className="min-w-5 justify-center bg-component-bulk-action-bar-count-bg">
            <RollingNumber text={formatted} value={count} data-slot="bulk-action-bar-number" />
            <span className="sr-only">{formatted}</span>
          </Badge>,
        )}
      </span>
    </div>
  )
}

/** The clear button (×), at the end of the bar. Other props, `ref` included, go to the Button. */
export function BulkActionBarClear({ className, ...props }: Omit<React.ComponentProps<typeof Button>, 'children' | 'iconOnly' | 'asChild'>) {
  const { clear, labels } = useBar('BulkActionBarClear')
  return (
    <Tooltip label={labels.clearSelection}>
      <ToolbarPrimitive.Button asChild>
        <Button
          variant="tertiary"
          iconOnly
          aria-label={labels.clearSelection}
          // Escape does the same while focus is in the table or the bar; no hint on screen.
          aria-keyshortcuts="Escape"
          data-slot="bulk-action-bar-clear"
          onClick={clear}
          className={cn('shrink-0', className)}
          {...props}
        >
          {/* 14px X at 1.09, as on Toast. */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M3.94232 10.0582L7.00053 7M7.00053 7L10.0587 3.94179M7.00053 7L3.94232 3.94179M7.00053 7L10.0587 10.0582"
              stroke="currentColor"
              strokeWidth="1.09375"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </ToolbarPrimitive.Button>
    </Tooltip>
  )
}

/** A thin rule between the count and the actions, and before the clear button. Other props, `ref` included, go to its `div`. */
export function BulkActionBarSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <ToolbarPrimitive.Separator asChild>
      <Separator orientation="vertical" decorative={false} data-slot="bulk-action-bar-separator" className={cn('mx-1 h-4 self-center', className)} {...props} />
    </ToolbarPrimitive.Separator>
  )
}

/* ---------- actions ---------- */

export interface BulkAction {
  /** What it does, in a few words: the button's text. */
  label: string
  /** A 16px icon before the label. */
  icon?: React.ReactNode
  /** Runs it. Return a promise and its button shows a Spinner until it settles. Errors are yours to show. */
  onSelect: () => unknown
  /** `destructive` colours a button's label and icon (text/destructive). */
  tone?: 'default' | 'destructive'
  disabled?: boolean
  /** Shows the Spinner yourself; without it the Spinner follows `onSelect`'s promise. */
  running?: boolean
}

export interface BulkActionBarActionProps
  extends BulkAction,
    Omit<React.ComponentProps<typeof Button>, keyof BulkAction | 'children' | 'variant' | 'loading' | 'asChild' | 'iconOnly'> {}

const DONE_MS = 1200

/** One action as a button in the bar. Other props, `ref` included, go to the Button. */
export function BulkActionBarAction({ label, icon, onSelect, tone = 'default', disabled = false, running, className, ...props }: BulkActionBarActionProps) {
  const { announce, labels } = useBar('BulkActionBarAction')
  const [pending, setPending] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const busy = React.useRef(false)
  const alive = React.useRef(true)
  const doneTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  React.useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      clearTimeout(doneTimer.current)
    }
  }, [])
  const loading = running ?? pending

  const run = async () => {
    if (busy.current || disabled || loading) return
    const result = onSelect()
    if (!result || typeof (result as PromiseLike<unknown>).then !== 'function') return
    busy.current = true
    setPending(true)
    try {
      await result
      if (!alive.current) return
      setDone(true)
      announce(labels.done)
      clearTimeout(doneTimer.current)
      doneTimer.current = setTimeout(() => alive.current && setDone(false), DONE_MS)
    } finally {
      busy.current = false
      if (alive.current) setPending(false)
    }
  }

  return (
    <ToolbarPrimitive.Button asChild disabled={disabled}>
      <Button
        variant="tertiary"
        data-slot="bulk-action-bar-action"
        data-tone={tone}
        data-state={loading ? 'running' : done ? 'done' : 'idle'}
        loading={loading}
        disabled={disabled}
        onClick={() => void run()}
        className={cn('shrink-0', tone === 'destructive' && 'text-text-destructive [&_svg]:text-text-destructive', className)}
        {...props}
      >
        {icon && (
          // The icon and the checkmark share one 16px cell and cross-fade, so the button keeps its width.
          <span className="grid size-4 shrink-0 place-items-center *:col-start-1 *:row-start-1">
            <span className={cn('grid place-items-center transition-opacity duration-(--duration-fast) ease-(--ease-out)', done && 'opacity-0')}>{icon}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              className={cn('text-status-green-fg transition-opacity duration-(--duration-fast) ease-(--ease-out)', !done && 'opacity-0')}
            >
              <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
        {label}
      </Button>
    </ToolbarPrimitive.Button>
  )
}

export interface BulkActionBarOverflowProps extends Omit<React.ComponentProps<typeof Button>, 'children' | 'variant' | 'iconOnly' | 'asChild'> {
  /** The actions in the menu, in order. */
  actions: BulkAction[]
}

/** The ⋯ button and its menu, for the actions that don't get a button. Other props, `ref` included, go to the ⋯ Button. */
export function BulkActionBarOverflow({ actions, className, ...props }: BulkActionBarOverflowProps) {
  const { labels } = useBar('BulkActionBarOverflow')

  return (
    <DropdownMenu
      side="top"
      align="end"
      trigger={
        <ToolbarPrimitive.Button asChild>
          <Button variant="tertiary" iconOnly aria-label={labels.moreActions} data-slot="bulk-action-bar-overflow" className={cn('shrink-0', className)} {...props}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="6" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="18" cy="12" r="1.5" />
            </svg>
          </Button>
        </ToolbarPrimitive.Button>
      }
    >
      {actions.map((action) => (
        <DropdownMenuItem
          key={action.label}
          label={action.label}
          icon={action.icon}
          disabled={action.disabled || action.running}
          layout="inline"
          onSelect={() => void action.onSelect()}
        />
      ))}
    </DropdownMenu>
  )
}

/* ---------- the common case ---------- */

export interface BulkActionBarProps extends Omit<BulkActionBarRootProps, 'children'> {
  /** The actions, as buttons after the count. */
  actions?: BulkAction[]
  /** More actions, in a ⋯ menu after the buttons. */
  overflow?: BulkAction[]
}

/**
 * The bar from props: the checkbox and the count, a rule, a button per action, the ⋯ menu,
 * then a rule and the clear button. Other props, `ref` included, go to the toolbar element.
 */
export function BulkActionBar({ actions = [], overflow = [], ...props }: BulkActionBarProps) {
  const hasActions = actions.length > 0 || overflow.length > 0
  return (
    <BulkActionBarRoot {...props}>
      <BulkActionBarCount />
      {hasActions && <BulkActionBarSeparator />}
      {actions.map((action) => (
        <BulkActionBarAction key={action.label} {...action} />
      ))}
      {overflow.length > 0 && <BulkActionBarOverflow actions={overflow} />}
      {hasActions && <BulkActionBarSeparator />}
      <BulkActionBarClear />
    </BulkActionBarRoot>
  )
}
