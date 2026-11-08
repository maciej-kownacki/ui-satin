import * as React from 'react'
import { Check, EditPencil, NavArrowDown } from 'iconoir-react'
import { cn } from '../lib/utils'
import { FlappySprite, ShimmerLabel, TetrisLabel, TetrisMark, TetrisStill, type Glimmer } from './agent-loading'

/**
 * Thinking, 1:1 with the uiKit `Thinking` set (3239:20908) and its parts thinking/header
 * (3239:20766), thinking/step (3239:20791) and thinking/_mark (3239:20674).
 *
 * loading: the header only — the mark playing, the label shimmering and the elapsed time in
 * text/subtle, 12px apart, 4px padding (28 high). The mark is the tetris board (rows clearing,
 * a band of light crossing it and the label, in glimm's prism or neutral) or the flappy bird
 * running in place; see agent-loading.tsx. collapsed: mark, summary and
 * a 14px chevron. expanded: the same header with the chevron turned up, then 8px down a body
 * with 4px left inset: a 16px rail (1px line, rail-edge → rail-center → rail-edge) and, 12px
 * on, the steps 8px apart.
 *
 * Collapsed and expanded are a native `details`, so the summary toggles with click, Enter and
 * Space; `state` sets the starting state and follows later changes, `onToggle` reports them.
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

export type ThinkingState = 'loading' | 'collapsed' | 'expanded'
/** What runs beside the label: the tetris mark, or the flappy bird. */
export type ThinkingIndicator = 'tetris' | 'flappy'

export interface ThinkingProps extends Omit<React.ComponentProps<'div'>, 'onToggle'> {
  /** loading while the agent works, collapsed once it is done, expanded when people open it. */
  state?: ThinkingState
  /** The header text: "Thinking…" while loading, a summary ("Thought for 2m 45s") after. */
  label?: React.ReactNode
  /** Elapsed time next to the loading label, e.g. "1.2s". */
  time?: React.ReactNode
  steps?: ThinkingStep[]
  /** The mark beside the label. */
  indicator?: ThinkingIndicator
  /** The light that crosses the tetris mark and its label as rows clear: glimm's prism, or neutral. */
  glimmer?: Glimmer
  onToggle?: (open: boolean) => void
}

export function Thinking({
  state = 'loading',
  label = 'Thinking…',
  time,
  steps = [],
  indicator = 'tetris',
  glimmer = 'color',
  onToggle,
  className,
  ...props
}: ThinkingProps) {
  const [open, setOpen] = React.useState(state === 'expanded')
  React.useEffect(() => setOpen(state === 'expanded'), [state])

  if (state === 'loading') {
    return (
      <div data-slot="thinking" data-state="loading" className={cn('flex w-full flex-col', className)} {...props}>
        <div role="status" aria-live="polite" className="flex items-center gap-3 p-1">
          <ThinkingMark loading indicator={indicator} glimmer={glimmer} />
          {indicator === 'tetris' ? (
            <TetrisLabel glimmer={glimmer} className="text-sm whitespace-nowrap">
              {label}
            </TetrisLabel>
          ) : (
            <ShimmerLabel className="text-sm whitespace-nowrap">{label}</ShimmerLabel>
          )}
          {time != null && <span className="text-sm whitespace-nowrap text-text-subtle tabular-nums">{time}</span>}
        </div>
      </div>
    )
  }

  return (
    <div data-slot="thinking" data-state={open ? 'expanded' : 'collapsed'} className={cn('w-full', className)} {...props}>
      <details
        open={open}
        onToggle={(e) => {
          const next = e.currentTarget.open
          if (next === open) return
          setOpen(next)
          onToggle?.(next)
        }}
        className="group"
      >
        <summary className="flex w-fit cursor-pointer list-none items-center gap-3 rounded-md p-1 select-none [&::-webkit-details-marker]:hidden">
          <ThinkingMark indicator={indicator} glimmer={glimmer} />
          <span className="text-sm whitespace-nowrap text-text-muted">{label}</span>
          <NavArrowDown
            aria-hidden
            className="size-icon-size-sm shrink-0 text-text-muted transition-transform duration-(--duration-base) ease-(--ease-out) [stroke-width:1.875] group-open:rotate-180"
          />
        </summary>
        <div data-state={open ? 'open' : 'closed'} className="satin-collapsible mt-2 flex gap-3 overflow-clip pl-1">
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
      </details>
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

/** thinking/_mark: the tetris mark (playing while loading, filled once done) or the flappy bird. */
function ThinkingMark({ loading = false, indicator, glimmer }: { loading?: boolean; indicator: ThinkingIndicator; glimmer: Glimmer }) {
  if (indicator === 'flappy') return <FlappySprite size={16} run={loading} />
  return loading ? <TetrisMark glimmer={glimmer} /> : <TetrisStill />
}
