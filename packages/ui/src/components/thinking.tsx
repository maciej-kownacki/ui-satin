'use client'

import * as React from 'react'
import { Check, EditPencil, NavArrowDown } from 'iconoir-react'
import { cn } from '../lib/utils'
import { FlappySprite, TetrisStill, type AgentLoadingIndicator } from './agent-loading'
import { useSatinLabels } from './labels'

/**
 * Thinking, 1:1 with the uiKit `Thinking` set (3239:20908) and its parts thinking/header
 * (3239:20766), thinking/step (3239:20791) and thinking/_mark (3239:20674).
 *
 * What an agent did, once it is done; while it works, AgentLoading (agent-loading.tsx) shows
 * instead. collapsed: the mark at rest (the full tetris board, or the flappy bird), summary
 * and a 14px chevron. expanded: the same header with the chevron turned up, then 8px down a body
 * with 4px left inset: a 16px rail (1px line, rail-edge → rail-center → rail-edge) and, 12px
 * on, the steps 8px apart.
 *
 * The header is a button (click, Enter, Space) that opens and folds the body with the
 * Accordion's motion; the folded body stays mounted but leaves tab order and screen readers.
 * `state` sets the starting state and follows later changes, `onToggle` reports them.
 */
export type ThinkingStep =
  /** A finished action: green check, label, muted meta that truncates. */
  | { type?: 'task'; label: React.ReactNode; meta?: React.ReactNode }
  /** A thought, wrapping in text/muted. */
  | { type: 'text'; text: React.ReactNode }
  /** A page that was read: 16px favicon, title, muted meta. */
  | { type: 'source'; icon?: React.ReactNode; label: React.ReactNode; meta?: React.ReactNode }
  /** A dev tool call: icon (pencil by default), name, mono target, +added −removed, meta. */
  | {
      type: 'tool'
      icon?: React.ReactNode
      label: React.ReactNode
      target?: React.ReactNode
      added?: React.ReactNode
      removed?: React.ReactNode
      meta?: React.ReactNode
    }
  /** The rest, folded: "+5 more". */
  | { type: 'more'; label: React.ReactNode }

export type ThinkingState = 'collapsed' | 'expanded'
/** The mark beside the summary, matching the AgentLoading that ran before it. */
export type ThinkingIndicator = AgentLoadingIndicator

export interface ThinkingProps extends Omit<React.ComponentProps<'div'>, 'onToggle'> {
  /** collapsed once the agent is done, expanded when people open it. */
  state?: ThinkingState
  /** The summary, e.g. "Thought for 2m 45s". Defaults to the `thought` label ("Thought"). */
  label?: React.ReactNode
  steps?: ThinkingStep[]
  /** The mark beside the summary. */
  indicator?: ThinkingIndicator
  onToggle?: (open: boolean) => void
}

export function Thinking({
  state = 'collapsed',
  label: labelProp,
  steps = [],
  indicator = 'tetris',
  onToggle,
  className,
  ...props
}: ThinkingProps) {
  const labels = useSatinLabels()
  const label = labelProp ?? labels.thought
  const [open, setOpen] = React.useState(state === 'expanded')
  React.useEffect(() => setOpen(state === 'expanded'), [state])
  const bodyId = `${React.useId()}-steps`

  return (
    <div data-slot="thinking" data-state={open ? 'expanded' : 'collapsed'} className={cn('w-full', className)} {...props}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          setOpen(!open)
          onToggle?.(!open)
        }}
        className="group flex w-fit cursor-pointer items-center gap-3 rounded-md p-1 outline-none select-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]"
      >
        <ThinkingMark indicator={indicator} />
        <span className="text-sm whitespace-nowrap text-text-muted">{label}</span>
        <NavArrowDown
          aria-hidden
          className={cn(
            'size-icon-size-sm shrink-0 text-text-muted transition-transform duration-(--duration-base) ease-(--ease-out) [stroke-width:1.875]',
            open && 'rotate-180',
          )}
        />
      </button>
      {/* The Accordion's motion (satin-expand): the body grows down from under the header, which
          never moves, and its steps settle in from the top edge; closing is quicker. */}
      <div id={bodyId} data-state={open ? 'open' : 'closed'} className="satin-expand">
        <div>
          <div className="flex gap-3 ps-1 pt-2">
            <div aria-hidden className="relative w-4 shrink-0 self-stretch">
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-linear-to-b from-component-rail-edge via-component-rail-center to-component-rail-edge" />
            </div>
            <ol className="flex min-w-0 flex-1 flex-col gap-2">
              {steps.map((step, i) => (
                <li key={i} className="min-w-0">
                  <Step step={step} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ step }: { step: ThinkingStep }) {
  switch (step.type) {
    case 'text':
      return <p className="text-body text-text-muted">{step.text}</p>
    case 'more':
      return <p className="text-sm whitespace-nowrap text-text-muted">{step.label}</p>
    case 'source':
      return (
        <div className="flex min-w-0 items-center gap-3 p-1 text-sm">
          <span className="flex size-4 shrink-0 items-center justify-center overflow-clip rounded-xs [&>*]:size-4">
            {step.icon}
          </span>
          <span className="max-w-full shrink-0 truncate text-text-default">{step.label}</span>
          {step.meta != null && <span className="min-w-0 flex-1 truncate text-text-muted">{step.meta}</span>}
        </div>
      )
    case 'tool':
      return (
        <div className="flex min-w-0 items-center gap-2 p-1 text-sm [&>svg]:size-icon-size [&>svg]:shrink-0 [&>svg]:text-text-muted [&>svg]:[stroke-width:1.875]">
          {step.icon ?? <EditPencil />}
          <span className="shrink-0 whitespace-nowrap text-text-default">{step.label}</span>
          <span className="min-w-0 flex-1 truncate font-mono tracking-normal text-text-muted">{step.target}</span>
          {(step.added != null || step.removed != null) && (
            <span className="flex shrink-0 gap-1.5 font-mono tracking-normal whitespace-nowrap">
              {step.added != null && <span className="text-status-green-fg">{step.added}</span>}
              {step.removed != null && <span className="text-status-red-fg">{step.removed}</span>}
            </span>
          )}
          {step.meta != null && <span className="shrink-0 whitespace-nowrap text-text-muted">{step.meta}</span>}
        </div>
      )
    default:
      return (
        <div className="flex min-w-0 items-center gap-3 p-1 text-sm">
          <Check aria-hidden className="size-icon-size-sm shrink-0 text-status-green-fg [stroke-width:1.875]" />
          <span className="max-w-full shrink-0 truncate text-text-default">{step.label}</span>
          {step.meta != null && <span className="min-w-0 flex-1 truncate text-text-muted">{step.meta}</span>}
        </div>
      )
  }
}

/** thinking/_mark: the tetris board filled, or the flappy bird at rest. */
function ThinkingMark({ indicator }: { indicator: ThinkingIndicator }) {
  return indicator === 'flappy' ? <FlappySprite size={16} run={false} /> : <TetrisStill />
}
