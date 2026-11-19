'use client'

import * as React from 'react'
import { Check, Clock, NavArrowDown, NavArrowUp, Prohibition, Refresh, Tools, WarningCircle } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { CodeBlock } from './code-block'
import { useSatinLabels, type SatinLabelSet } from './labels'
import { Spinner } from './spinner'

/**
 * ToolCall: one call an agent made to a tool, as a card of its own, outside Thinking. The header
 * is Thinking's tool step (16px icon in text/muted, the name, the target in mono that truncates)
 * with the status and a 14px chevron at the end; under it, once opened, the input and the output
 * as JSON in CodeBlocks (or the app's own node), and on failure the error with Retry.
 *
 * Statuses: `pending` (queued, "Pending"), `running` (a Spinner and the time so far), `success`
 * (a green check and how long it took), `error` ("Failed" in red, the card opens on its own) and
 * `cancelled`. The status icons sit on one cell and cross-fade as the status changes.
 *
 * The header is a button with `aria-expanded` (click, Enter, Space); its name is the tool, the
 * target and the status, so "Find slots calendar.findSlots Running" is what a screen reader hears.
 * The body opens with Thinking's motion (satin-expand): it grows down from under the header and,
 * folded, stays mounted but leaves tab order and screen readers. A call that ends while the card
 * is on screen is announced politely ("Find slots Failed").
 *
 * Open state: uncontrolled, it starts as `defaultOpen` says, else open only on `error`. It opens
 * by itself when the call fails and folds back when it recovers, unless someone opened or folded
 * it by hand since. Controlled (`open` + `onOpenChange`), the app decides, failures included.
 *
 * JSON longer than `maxLines` is cut at that line with "Show all N lines" under it; Copy still
 * copies all of it, and screen readers get all of it either way.
 *
 * Props cover the usual call; the parts (ToolCallRoot, ToolCallHeader, ToolCallContent,
 * ToolCallSection, ToolCallError) build anything else, say an extra section with a link.
 */
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled'

/**
 * What a call took or gave back. A React element renders as it is; a string shows as it is in a
 * CodeBlock; anything else shows there as JSON.
 */
export type ToolCallValue = React.ReactElement | object | string | number | boolean | null

type ToolCallContextValue = {
  status: ToolCallStatus
  open: boolean
  toggle: () => void
  contentId: string
  /** The header's name, which also names each section, so two cards' "Input" never share a name. */
  nameId: string
  headerRef: React.RefObject<HTMLButtonElement | null>
  /** When the current run started (ms since 1970), while it runs. */
  startedAt?: number
  /** How long the last run took, as this card measured it. */
  took?: number
}

const ToolCallContext = React.createContext<ToolCallContextValue | null>(null)

function useToolCall(part: string) {
  const context = React.useContext(ToolCallContext)
  if (!context) throw new Error(`${part} goes inside ToolCallRoot.`)
  return context
}

const statusWords = {
  pending: 'toolCallPending',
  running: 'toolCallRunning',
  success: 'toolCallDone',
  error: 'toolCallFailed',
  cancelled: 'toolCallCancelled',
} as const satisfies Record<ToolCallStatus, keyof SatinLabelSet>

/** "1.2s", "45s", "2m 5s" in the labels' locale. */
function formatToolCallDuration(ms: number, locale: string) {
  const unit = (value: number, unit: 'second' | 'minute', digits = 0) =>
    new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
  const seconds = Math.max(0, ms) / 1000
  if (seconds < 10) return unit(Math.floor(seconds * 10) / 10, 'second', 1)
  if (seconds < 60) return unit(Math.floor(seconds), 'second')
  return `${unit(Math.floor(seconds / 60), 'minute')} ${unit(Math.floor(seconds % 60), 'second')}`
}

export interface ToolCallRootProps extends React.ComponentProps<'div'> {
  status: ToolCallStatus
  /** Open, controlled. */
  open?: boolean
  /** Open at first, uncontrolled. Left out, it follows the status: open only on `error`. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** When the call started, for the time shown while it runs. Defaults to when this card first saw it running. */
  startedAt?: Date | number
}

/** The card and its open state. Other props, `ref` included, go to the card's `<div>`. */
export function ToolCallRoot({
  status,
  open: openProp,
  defaultOpen,
  onOpenChange,
  startedAt,
  className,
  children,
  ...props
}: ToolCallRootProps) {
  const controlled = openProp !== undefined
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen ?? status === 'error')
  const open = controlled ? openProp : ownOpen
  const openRef = React.useRef(open)
  openRef.current = open
  // Opened by a failure and not touched since: it folds back once the call recovers.
  const auto = React.useRef(defaultOpen === undefined && status === 'error')
  const [run, setRun] = React.useState<{ start?: number; took?: number }>(() => (status === 'running' ? { start: Date.now() } : {}))
  const previous = React.useRef(status)
  const headerRef = React.useRef<HTMLButtonElement | null>(null)
  const id = React.useId()
  const contentId = `${id}-content`
  const nameId = `${id}-name`

  React.useEffect(() => {
    const was = previous.current
    if (was === status) return
    previous.current = status
    if (status === 'running') setRun({ start: Date.now() })
    else if (was === 'running') setRun((r) => ({ took: r.start === undefined ? undefined : Date.now() - r.start }))
    if (controlled) return
    if (status === 'error') {
      if (!openRef.current) {
        auto.current = true
        setOwnOpen(true)
      }
    } else if (was === 'error' && auto.current) {
      auto.current = false
      setOwnOpen(false)
    }
  }, [status, controlled])

  const toggle = React.useCallback(() => {
    auto.current = false
    const next = !openRef.current
    if (!controlled) setOwnOpen(next)
    onOpenChange?.(next)
  }, [controlled, onOpenChange])

  const start = startedAt === undefined ? run.start : +startedAt
  const value = React.useMemo<ToolCallContextValue>(
    () => ({ status, open, toggle, contentId, nameId, headerRef, startedAt: start, took: run.took }),
    [status, open, toggle, contentId, nameId, start, run.took],
  )

  return (
    <ToolCallContext.Provider value={value}>
      <div
        data-slot="tool-call"
        data-status={status}
        data-state={open ? 'open' : 'closed'}
        className={cn('flex w-full min-w-0 flex-col overflow-clip rounded-2xl border border-border-default bg-bg-card', className)}
        {...props}
      >
        {children}
      </div>
    </ToolCallContext.Provider>
  )
}

export interface ToolCallHeaderProps extends Omit<React.ComponentProps<'button'>, 'name' | 'children'> {
  /** The tool, e.g. "Find slots". */
  name: React.ReactNode
  /** A 16px icon before the name. Defaults to a hammer and wrench. */
  icon?: React.ReactNode
  /** What it ran on, in mono after the name: a function, a file, a URL. Truncates. */
  target?: React.ReactNode
  /** How long the call took, in ms, shown once it ends. Defaults to the time this card measured. */
  duration?: number
}

/** The button that opens and folds the card. Other props, `ref` included, go to the `<button>`. */
export function ToolCallHeader({ name, icon, target, duration, ref, onClick, className, ...props }: ToolCallHeaderProps) {
  const { status, open, toggle, contentId, nameId, headerRef, startedAt, took } = useToolCall('ToolCallHeader')
  const labels = useSatinLabels()
  const word = labels[statusWords[status]]
  const time = duration ?? took
  const locale = labels.dateLocale

  const setRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      headerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [headerRef, ref],
  )

  // Read out once when a call on screen ends; a card that mounts already done says nothing.
  const [said, setSaid] = React.useState<string>('')
  const seen = React.useRef(status)
  React.useEffect(() => {
    if (seen.current === status) return
    seen.current = status
    setSaid(status === 'success' || status === 'error' || status === 'cancelled' ? word : '')
  }, [status, word])

  return (
    <>
      <button
        ref={setRef}
        type="button"
        data-slot="tool-call-header"
        data-state={open ? 'open' : 'closed'}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) toggle()
        }}
        className={cn(
          'flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-t-[calc(var(--radius-2xl)-1px)] py-2 ps-4 pe-4 text-start text-sm outline-none select-none data-[state=closed]:rounded-b-[calc(var(--radius-2xl)-1px)]',
          'transition-colors duration-(--duration-fast) ease-(--ease-out) hover:bg-bg-hover',
          'focus-visible:[box-shadow:inset_0_0_0_2px_var(--action-focus-ring)]',
          className,
        )}
        {...props}
      >
        {/* Thinking's tool step: icon, name, mono target. */}
        <span aria-hidden className="grid shrink-0 place-items-center text-text-muted [&>svg]:size-icon-size [&>svg]:[stroke-width:1.875]">
          {icon ?? <Tools />}
        </span>
        <span id={nameId} className="shrink-0 whitespace-nowrap text-text-default">
          {name}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono tracking-normal text-text-muted">{target}</span>
        <span data-slot="tool-call-status" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <StatusIcon status={status} />
          {status === 'running' ? (
            <>
              <span className="sr-only">{word}</span>
              {/* A clock read out on every tick would drown the rest: screen readers hear "Running". */}
              {startedAt !== undefined && (
                <span aria-hidden suppressHydrationWarning className="text-text-subtle tabular-nums">
                  <Elapsed since={startedAt} locale={locale} />
                </span>
              )}
            </>
          ) : status === 'success' ? (
            <>
              <span className="sr-only">{word}</span>
              {time !== undefined && <span className="text-text-muted tabular-nums">{formatToolCallDuration(time, locale)}</span>}
            </>
          ) : (
            <span className={status === 'error' ? 'text-status-red-fg' : 'text-text-muted'}>{word}</span>
          )}
        </span>
        <NavArrowDown
          aria-hidden
          className={cn(
            'size-icon-size-sm shrink-0 text-text-muted transition-transform duration-(--duration-base) ease-(--ease-out) [stroke-width:1.875]',
            open && 'rotate-180',
          )}
        />
      </button>
      <span className="sr-only" aria-live="polite">
        {said && (
          <>
            {name} {said}
          </>
        )}
      </span>
    </>
  )
}

/** The time since `since`, ticking every 100 ms. */
function Elapsed({ since, locale }: { since: number; locale: string }) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [])
  return formatToolCallDuration(now - since, locale)
}

/**
 * The status icons on one 16px cell, one shown at a time; they cross-fade as the status changes.
 * The Spinner stays mounted only while it runs or fades out.
 */
function StatusIcon({ status }: { status: ToolCallStatus }) {
  const [previous, setPrevious] = React.useState(status)
  const [fading, setFading] = React.useState(false)
  if (previous !== status) {
    setPrevious(status)
    setFading(previous === 'running')
  }
  const layer = (on: boolean) =>
    cn('grid place-items-center transition-opacity duration-(--duration-base) ease-(--ease-out) [&>svg]:size-icon-size [&>svg]:[stroke-width:1.875]', !on && 'opacity-0')
  return (
    <span aria-hidden className="grid size-icon-size shrink-0 place-items-center *:col-start-1 *:row-start-1">
      <span className={cn(layer(status === 'pending'), 'text-text-muted')}>
        <Clock />
      </span>
      <span
        className={cn(layer(status === 'running'), 'text-text-muted')}
        onTransitionEnd={() => {
          if (status !== 'running') setFading(false)
        }}
      >
        {(status === 'running' || fading) && <Spinner size="md" label={null} />}
      </span>
      <span className={cn(layer(status === 'success'), 'text-status-green-fg')}>
        <Check />
      </span>
      <span className={cn(layer(status === 'error'), 'text-status-red-fg')}>
        <WarningCircle />
      </span>
      <span className={cn(layer(status === 'cancelled'), 'text-text-muted')}>
        <Prohibition />
      </span>
    </span>
  )
}

/**
 * The body under the header: its sections, a rule between each. Folded, it stays mounted but
 * leaves tab order and screen readers. Other props, `ref` included, go to the `<div>` that holds
 * the sections.
 */
export function ToolCallContent({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { open, contentId } = useToolCall('ToolCallContent')
  return (
    <div id={contentId} data-slot="tool-call-content" data-state={open ? 'open' : 'closed'} className="satin-expand">
      <div>
        <div className={cn('flex flex-col divide-y divide-border-subtle border-t border-border-subtle', className)} {...props}>
          {children}
        </div>
      </div>
    </div>
  )
}

export interface ToolCallSectionProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** What it holds, e.g. "Input". Names the CodeBlock (as its file name) or the group. */
  title: string
  value: ToolCallValue
  /** JSON longer than this is cut at that line, with "Show all N lines" under it. */
  maxLines?: number
}

/**
 * One titled part of the body: JSON (or a string) in a CodeBlock with Copy, or the app's own node
 * under the title. Other props, `ref` included, go to the section's `<div>`.
 */
export function ToolCallSection({ title, value, maxLines = 10, className, ...props }: ToolCallSectionProps) {
  const { nameId } = useToolCall('ToolCallSection')
  const labels = useSatinLabels()
  const id = React.useId()
  const [all, setAll] = React.useState(false)

  if (React.isValidElement(value)) {
    return (
      <div data-slot="tool-call-section" role="group" aria-labelledby={`${nameId} ${id}-title`} className={cn('flex flex-col pb-3', className)} {...props}>
        {/* The same height and type as a CodeBlock's header, so both kinds of section line up. */}
        <div className="ps-4 pe-2 pt-2 pb-1">
          <span id={`${id}-title`} className="flex min-h-6 items-center text-sm leading-[18px] font-medium text-text-default">
            {title}
          </span>
        </div>
        <div className="min-w-0 px-4">{value}</div>
      </div>
    )
  }

  const code = toText(value)
  const count = code.split('\n').length
  const long = count > maxLines
  return (
    <div data-slot="tool-call-section" className={cn('flex min-w-0 flex-col', className)} {...props}>
      {/* "Find slots Input code": the tool's name first, so every card's code has a name of its own. */}
      <span id={`${id}-name`} hidden>
        {labels.codeRegion(title)}
      </span>
      <CodeBlock
        id={`${id}-code`}
        aria-labelledby={`${nameId} ${id}-name`}
        filename={title}
        code={code}
        highlight={typeof value !== 'string'}
        className={cn('rounded-none border-0 bg-transparent', long && 'pb-1')}
        // The header (36px) and the code's top padding (4px), then 24px lines: cut after the last whole one.
        style={long && !all ? { maxHeight: 40 + maxLines * 24 } : undefined}
      />
      {long && (
        <div className="px-2 pb-2">
          <Button variant="tertiary" size="xs" aria-expanded={all} aria-controls={`${id}-code`} onClick={() => setAll(!all)}>
            {all ? <NavArrowUp /> : <NavArrowDown />}
            {all ? labels.toolCallShowLess : labels.toolCallShowAll(count)}
          </Button>
        </div>
      )}
    </div>
  )
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

export interface ToolCallErrorProps extends React.ComponentProps<'div'> {
  /** Shows Retry. Focus goes back to the header, since Retry leaves with the error. */
  onRetry?: () => void
}

/** What went wrong, in red, with Retry. Other props, `ref` included, go to its `<div>`. */
export function ToolCallError({ onRetry, className, children, ...props }: ToolCallErrorProps) {
  const { headerRef } = useToolCall('ToolCallError')
  const labels = useSatinLabels()
  return (
    <div data-slot="tool-call-error" className={cn('flex items-start gap-3 px-4 py-3', className)} {...props}>
      {children != null && <div className="min-w-0 flex-1 py-0.5 text-sm text-status-red-fg [overflow-wrap:anywhere]">{children}</div>}
      {onRetry && (
        <Button
          variant="secondary"
          size="xs"
          className="ms-auto"
          onClick={() => {
            onRetry()
            headerRef.current?.focus()
          }}
        >
          <Refresh />
          {labels.toolCallRetry}
        </Button>
      )}
    </div>
  )
}

export interface ToolCallProps extends Omit<ToolCallRootProps, 'children'> {
  /** The tool, e.g. "Find slots". */
  name: React.ReactNode
  /** A 16px icon before the name. Defaults to a hammer and wrench. */
  icon?: React.ReactNode
  /** What it ran on, in mono after the name: a function, a file, a URL. Truncates. */
  target?: React.ReactNode
  /** The arguments: JSON in a CodeBlock, or a node of your own. */
  input?: ToolCallValue
  /** What came back: JSON in a CodeBlock, or a node of your own. */
  output?: ToolCallValue
  /** What went wrong, shown on `error` above the output. */
  error?: React.ReactNode
  /** How long the call took, in ms, shown once it ends. Defaults to the time this card measured. */
  duration?: number
  /** Shows Retry on `error`. */
  onRetry?: () => void
  /** JSON longer than this is cut at that line, with "Show all N lines" under it. */
  maxLines?: number
}

/** One tool call as a card. Other props, `ref` included, go to the card's `<div>`. */
export function ToolCall({ name, icon, target, input, output, error, duration, onRetry, maxLines, status, ...props }: ToolCallProps) {
  const labels = useSatinLabels()
  return (
    <ToolCallRoot status={status} {...props}>
      <ToolCallHeader name={name} icon={icon} target={target} duration={duration} />
      <ToolCallContent>
        {input !== undefined && <ToolCallSection title={labels.toolCallInput} value={input} maxLines={maxLines} />}
        {status === 'error' && (error != null || onRetry) && <ToolCallError onRetry={onRetry}>{error}</ToolCallError>}
        {output !== undefined && <ToolCallSection title={labels.toolCallOutput} value={output} maxLines={maxLines} />}
      </ToolCallContent>
    </ToolCallRoot>
  )
}
