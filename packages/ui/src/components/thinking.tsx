import * as React from 'react'
import { Collapsible } from 'radix-ui'
import { Check, NavArrowDown, ViewGrid } from 'iconoir-react'
import { cn } from '../lib/utils'

/**
 * Thinking, from the uiKit `thinking` page: what an agent did before it answered.
 * While it works the header reads "Thinking…" with a running timer; when it's done the
 * header collapses to a summary ("Thought for 2m 45s") that opens the steps on a rail.
 */
export type ThinkingStep =
  | { type: 'task'; label: React.ReactNode; meta?: React.ReactNode }
  | { type: 'text'; text: React.ReactNode }
  | { type: 'source'; icon?: React.ReactNode; label: React.ReactNode; meta?: React.ReactNode }
  | { type: 'tool'; icon?: React.ReactNode; label: React.ReactNode; detail?: React.ReactNode; meta?: React.ReactNode }
  | { type: 'more'; label: React.ReactNode }

export interface ThinkingProps {
  /** `loading` while the agent works, `done` once it has answered. */
  state?: 'loading' | 'done'
  /** The header: "Thinking…" while loading, a summary when done. */
  label?: React.ReactNode
  /** Elapsed time shown next to the loading label, e.g. "1.2s". */
  elapsed?: React.ReactNode
  steps?: ThinkingStep[]
  defaultOpen?: boolean
  className?: string
}

export function Thinking({
  state = 'done',
  label,
  elapsed,
  steps = [],
  defaultOpen = false,
  className,
}: ThinkingProps) {
  if (state === 'loading') {
    return (
      <div
        data-slot="thinking"
        role="status"
        aria-live="polite"
        className={cn('flex h-7 items-center gap-2.5 text-sm text-text-muted', className)}
      >
        <ThinkingMark loading />
        <span className="satin-shimmer">{label ?? 'Thinking…'}</span>
        {elapsed && <span className="text-text-subtle tabular-nums">{elapsed}</span>}
      </div>
    )
  }

  return (
    <Collapsible.Root data-slot="thinking" defaultOpen={defaultOpen} className={cn('text-sm', className)}>
      <Collapsible.Trigger
        className={cn(
          'group -mx-1.5 flex h-7 items-center gap-2.5 rounded-md px-1.5 text-text-muted',
          'transition-colors duration-(--duration-fast) ease-(--ease-out) hover:text-text-default',
          'focus-visible:shadow-border-focus focus-visible:outline-none',
        )}
      >
        <ThinkingMark />
        <span>{label ?? 'Thought for a moment'}</span>
        <NavArrowDown
          aria-hidden
          className="size-icon-size-sm transition-transform duration-(--duration-base) ease-(--ease-out) group-data-[state=open]:rotate-180"
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="satin-collapsible">
        <div className="mt-2 flex gap-3">
          <div aria-hidden className="ml-[11px] w-px shrink-0 bg-linear-to-b from-component-rail-edge via-component-rail-center to-component-rail-edge" />
          <ol className="grid min-w-0 flex-1 gap-0 pl-2">
            {steps.map((step, i) => (
              <li key={i} className="min-w-0">
                <Step step={step} />
              </li>
            ))}
          </ol>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

function Step({ step }: { step: ThinkingStep }) {
  switch (step.type) {
    case 'task':
      return (
        <Row icon={<Check className="text-status-green-fg" strokeWidth={2} />}>
          <span className="truncate text-text-default">{step.label}</span>
          {step.meta && <span className="truncate text-text-subtle">{step.meta}</span>}
        </Row>
      )
    case 'text':
      return <p className="py-1 leading-5 text-text-muted">{step.text}</p>
    case 'source':
      return (
        <Row icon={step.icon}>
          <span className="truncate text-text-default">{step.label}</span>
          {step.meta && <span className="truncate text-text-subtle">{step.meta}</span>}
        </Row>
      )
    case 'tool':
      return (
        <Row icon={step.icon}>
          <span className="text-text-default">{step.label}</span>
          {step.detail && <code className="truncate font-mono text-xs text-text-muted">{step.detail}</code>}
          {step.meta && <span className="ml-auto shrink-0 pl-3 text-text-muted tabular-nums">{step.meta}</span>}
        </Row>
      )
    case 'more':
      return <p className="flex h-5 items-center text-text-muted">{step.label}</p>
  }
}

function Row({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-7 min-w-0 items-center gap-2 [&>svg]:size-icon-size [&>svg]:shrink-0 [&>svg]:text-text-muted">
      {icon}
      {children}
    </div>
  )
}

/** The small grid mark in front of the header; it pulses while the agent is working. */
function ThinkingMark({ loading = false }: { loading?: boolean }) {
  return (
    <ViewGrid
      aria-hidden
      className={cn('size-icon-size-sm shrink-0 text-text-subtle', loading && 'animate-pulse')}
      strokeWidth={1.5}
    />
  )
}
