'use client'

import * as React from 'react'
import { Toolbar as ToolbarPrimitive } from 'radix-ui'
import { Button } from '@uisatin/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@uisatin/ui/dropdown'
import { KbdGroup, keysOf } from '@uisatin/ui/kbd'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Separator } from '@uisatin/ui/separator'
import { Tooltip } from '@uisatin/ui/tooltip'

/**
 * BulkActionBar: what appears when rows are selected. The count ("3 selected") with a clear
 * button, then the actions as buttons, then the rest in a ⋯ menu. A `role="toolbar"` on the
 * popover surface (bg/popover, border/subtle, radius-xl, the toast's shadow), floating at the
 * bottom of its container.
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
 * - Keys, while focus is anywhere in the bar's parent (the table and the bar): Escape clears
 *   the selection, and each action's `shortcut` runs it (a plain key is ignored while typing in
 *   a field). Arrow keys, Home and End move along the toolbar. Shortcuts show as Kbd.
 * - The count is read out from a polite live region as it changes.
 *
 * Works with Table's selection as it is: `count={selected.length}` and
 * `onClear={() => setSelected([])}`.
 *
 * Parts, for a bar of your own: `BulkActionBarRoot` › `BulkActionBarCount`,
 * `BulkActionBarSeparator`, `BulkActionBarAction`, `BulkActionBarOverflow`. Other props on
 * BulkActionBar and BulkActionBarRoot, `ref` included, go to the toolbar element.
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

/* ---------- shortcuts ---------- */

type Shortcut = { meta: boolean; ctrl: boolean; shift: boolean; alt: boolean; key: string }

const MODIFIERS: Record<string, keyof Omit<Shortcut, 'key'>> = {
  '⌘': 'meta', cmd: 'meta', command: 'meta', meta: 'meta',
  '⌃': 'ctrl', ctrl: 'ctrl', control: 'ctrl',
  '⇧': 'shift', shift: 'shift',
  '⌥': 'alt', alt: 'alt', option: 'alt', opt: 'alt',
}
const NAMED: Record<string, string> = {
  '⌫': 'Backspace', backspace: 'Backspace', '⌦': 'Delete', del: 'Delete', delete: 'Delete',
  '↵': 'Enter', '⏎': 'Enter', enter: 'Enter', return: 'Enter', space: ' ',
  '←': 'ArrowLeft', '→': 'ArrowRight', '↑': 'ArrowUp', '↓': 'ArrowDown',
}

/** "⌘⇧M", "⌫" or "Ctrl + Shift + M" as the keys a keydown must carry. */
export function parseShortcut(shortcut: string): Shortcut {
  const parsed: Shortcut = { meta: false, ctrl: false, shift: false, alt: false, key: '' }
  for (const k of keysOf(shortcut)) {
    const modifier = MODIFIERS[k] ?? MODIFIERS[k.toLowerCase()]
    if (modifier) parsed[modifier] = true
    else parsed.key = NAMED[k] ?? NAMED[k.toLowerCase()] ?? k
  }
  return parsed
}

const matches = (e: KeyboardEvent, s: Shortcut) => {
  if (e.metaKey !== s.meta || e.ctrlKey !== s.ctrl || e.altKey !== s.alt || e.shiftKey !== s.shift) return false
  if (s.key.length === 1) {
    // By character, or by the key's place when ⌥ turns the character into another (⌥M → µ).
    const k = s.key.toLowerCase()
    return e.key.toLowerCase() === k || e.code === `Key${k.toUpperCase()}` || e.code === `Digit${k}`
  }
  return e.key.toLowerCase() === s.key.toLowerCase()
}

/** The shortcut for `aria-keyshortcuts`: "Meta+Shift+M". */
const ariaShortcut = (s: Shortcut) =>
  [s.ctrl && 'Control', s.alt && 'Alt', s.shift && 'Shift', s.meta && 'Meta', s.key === ' ' ? 'Space' : s.key.length === 1 ? s.key.toUpperCase() : s.key]
    .filter(Boolean)
    .join('+')

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/* ---------- reduced motion ---------- */

const REDUCED = '(prefers-reduced-motion: reduce)'
const subscribeMotion = (onChange: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const list = window.matchMedia(REDUCED)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}
const useReducedMotion = () =>
  React.useSyncExternalStore(
    subscribeMotion,
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCED).matches,
    () => false,
  )

/* ---------- the bar ---------- */

type Registered = { shortcut: Shortcut; run: () => void; enabled: () => boolean }

interface BarContextValue {
  /** The count on show: the last one above 0, so the bar leaves as it was. */
  count: number
  open: boolean
  clear: () => void
  announce: (text: React.ReactNode) => void
  register: (entry: Registered) => () => void
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
  /** Empties the selection: the clear button and Escape call it. */
  onClear: () => void
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
  const entries = React.useRef(new Set<Registered>())
  const register = React.useCallback((entry: Registered) => {
    entries.current.add(entry)
    return () => {
      entries.current.delete(entry)
    }
  }, [])

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

  // Escape and the shortcuts, anywhere in the parent: the table and the bar.
  React.useEffect(() => {
    const container = regionRef.current?.parentElement
    if (!container || !open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const typing = isEditable(e.target)
      if (e.key === 'Escape' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        clear()
        return
      }
      if (e.repeat) return
      for (const entry of entries.current) {
        if (!entry.enabled() || !entry.shortcut.key) continue
        if (typing && !entry.shortcut.meta && !entry.shortcut.ctrl) continue
        if (matches(e, entry.shortcut)) {
          e.preventDefault()
          entry.run()
          return
        }
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

  const value = React.useMemo(
    () => ({ count: shownCount, open, clear, announce: setMessage, register, labels }),
    [shownCount, open, clear, register, labels],
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

/** One character of the count, rolling from the old to the new when they differ. */
function RollingNumber({ text, value }: { text: string; value: number }) {
  const reduced = useReducedMotion()
  const last = React.useRef({ text, value })
  const [roll, setRoll] = React.useState<{ from: string; dir: 'up' | 'down'; key: number } | null>(null)
  const round = React.useRef(0)
  React.useLayoutEffect(() => {
    const prev = last.current
    if (prev.text === text) return
    last.current = { text, value }
    setRoll(reduced ? null : { from: prev.text, dir: value > prev.value ? 'up' : 'down', key: ++round.current })
  }, [text, value, reduced])

  const width = Math.max(text.length, roll?.from.length ?? 0)
  const to = text.padStart(width, ' ')
  const from = (roll?.from ?? text).padStart(width, ' ')
  return (
    <span data-slot="bulk-action-bar-number" aria-hidden className="inline-flex tabular-nums">
      {[...to].map((ch, i) =>
        roll && from[i] !== ch ? (
          <span key={`${roll.key}-${i}`} className="satin-bulk-roll" data-dir={roll.dir}>
            <span data-roll="out">{from[i] === ' ' ? '' : from[i]}</span>
            <span data-roll="in" onAnimationEnd={() => setRoll((r) => (r?.key === roll.key ? null : r))}>
              {ch === ' ' ? '' : ch}
            </span>
          </span>
        ) : ch === ' ' ? null : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  )
}

export interface BulkActionBarCountProps extends React.ComponentProps<'div'> {}

/** "3 selected" with the clear button. Other props, `ref` included, go to its `div`. */
export function BulkActionBarCount({ className, ...props }: BulkActionBarCountProps) {
  const { count, clear, labels } = useBar('BulkActionBarCount')
  const formatted = new Intl.NumberFormat(labels.dateLocale).format(count)
  return (
    <div data-slot="bulk-action-bar-count" className={cn('flex shrink-0 items-center gap-1 ps-2', className)} {...props}>
      <span className="text-sm leading-5 font-medium whitespace-nowrap text-text-default">
        {labels.bulkSelected(
          count,
          <>
            <RollingNumber text={formatted} value={count} />
            <span className="sr-only">{formatted}</span>
          </>,
        )}
      </span>
      <Tooltip label={labels.clearSelection} shortcut="Esc">
        <ToolbarPrimitive.Button asChild>
          <Button variant="tertiary" size="xs" iconOnly aria-label={labels.clearSelection} aria-keyshortcuts="Escape" onClick={clear} className="text-text-muted">
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
    </div>
  )
}

/** A thin rule between the count and the actions. Other props, `ref` included, go to its `div`. */
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
  /** Keys that run it while focus is in the bar's parent, e.g. "⌘⇧M", "E" or "⌫". Shown as Kbd. */
  shortcut?: string
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
export function BulkActionBarAction({ label, icon, onSelect, shortcut, tone = 'default', disabled = false, running, className, ...props }: BulkActionBarActionProps) {
  const { register, announce, labels, open } = useBar('BulkActionBarAction')
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
  const runRef = React.useRef(run)
  runRef.current = run

  const parsed = React.useMemo(() => (shortcut ? parseShortcut(shortcut) : undefined), [shortcut])
  const state = React.useRef({ disabled, loading, open })
  state.current = { disabled, loading, open }
  React.useEffect(() => {
    if (!parsed) return
    return register({ shortcut: parsed, run: () => void runRef.current(), enabled: () => state.current.open && !state.current.disabled && !state.current.loading })
  }, [parsed, register])

  return (
    <ToolbarPrimitive.Button asChild disabled={disabled}>
      <Button
        variant="tertiary"
        data-slot="bulk-action-bar-action"
        data-tone={tone}
        data-state={loading ? 'running' : done ? 'done' : 'idle'}
        loading={loading}
        disabled={disabled}
        aria-keyshortcuts={parsed ? ariaShortcut(parsed) : undefined}
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
        {shortcut && <KbdGroup keys={shortcut} aria-hidden className="ms-0.5" />}
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
  const { register, labels, open } = useBar('BulkActionBarOverflow')
  const latest = React.useRef(actions)
  latest.current = actions
  const openRef = React.useRef(open)
  openRef.current = open
  const shortcuts = actions.map((a) => a.shortcut ?? '').join('\n')
  React.useEffect(() => {
    const offs = latest.current.flatMap((action, i) =>
      action.shortcut
        ? [
            register({
              shortcut: parseShortcut(action.shortcut),
              run: () => void latest.current[i]?.onSelect(),
              enabled: () => openRef.current && !latest.current[i]?.disabled && !latest.current[i]?.running,
            }),
          ]
        : [],
    )
    return () => offs.forEach((off) => off())
  }, [shortcuts, register])

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
          shortcut={action.shortcut}
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
 * The bar from props: the count and clear, a rule, a button per action, then the ⋯ menu.
 * Other props, `ref` included, go to the toolbar element.
 */
export function BulkActionBar({ actions = [], overflow = [], ...props }: BulkActionBarProps) {
  return (
    <BulkActionBarRoot {...props}>
      <BulkActionBarCount />
      {(actions.length > 0 || overflow.length > 0) && <BulkActionBarSeparator />}
      {actions.map((action) => (
        <BulkActionBarAction key={action.label} {...action} />
      ))}
      {overflow.length > 0 && <BulkActionBarOverflow actions={overflow} />}
    </BulkActionBarRoot>
  )
}
