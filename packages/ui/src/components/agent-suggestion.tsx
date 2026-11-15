'use client'

import * as React from 'react'
import { ArrowRight } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Badge } from './badge'
import { Progress } from './progress'
import { useSatinLabels } from './labels'

/**
 * AgentSuggestion, 1:1 with the uiKit `AgentSuggestion` set (🆕 agent suggestions, 4126:3903):
 * something the agent has prepared and the user only approves — an email, a reply, a meeting,
 * tasks, an insight, an edit or a CRM update.
 *
 * A bg/card card, border/subtle, radius-xl, shadow-sm, 12px in and 12px between its parts:
 *
 * - the kind row: what it is, as a neutral Large Outline Badge (white, border/default) with a 14px icon
 *   or app logo (`kind`, `icon`), and on the right who or what it concerns (`meta`: avatars, a
 *   small Badge with the source);
 * - `title` in Label/lg (14/14 medium) and `description` in Body/lg text/muted, 8px apart;
 * - `children`: whatever the suggestion needs (time slots, tasks, a diff, changed fields);
 * - `actions`, right-aligned 8px apart, 4px further down: a secondary or tertiary button and the
 *   primary one that carries it out.
 *
 * The parts below cover the usual bodies: `AgentSuggestionQuote` (the message being answered),
 * `AgentSuggestionMetric` (a number against a limit), `AgentSuggestionDiff` (old text → new) and
 * `AgentSuggestionChanges` (fields from → to).
 */
export interface AgentSuggestionProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  /** What kind of suggestion: "Email suggestion", "Next steps", "CRM update". */
  kind: React.ReactNode
  /** A 14px icon or app logo before the kind. */
  icon?: React.ReactNode
  /** Right of the kind: avatars of the people it concerns, or a small Badge with the source. */
  meta?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  /** Buttons, right-aligned: the alternative first, the primary action last. */
  actions?: React.ReactNode
}

export function AgentSuggestion({
  kind,
  icon,
  meta,
  title,
  description,
  actions,
  children,
  className,
  ...props
}: AgentSuggestionProps) {
  const titleId = React.useId()
  return (
    <section
      data-slot="agent-suggestion"
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        'flex w-full max-w-[400px] flex-col gap-3 rounded-xl border border-border-subtle bg-bg-card p-3 text-text-default [box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
        className,
      )}
      {...props}
    >
      <div className="flex min-h-6 items-center gap-1.5">
        <div className="flex min-w-0 flex-1">
          <Badge
            size="lg"
            tone="neutral"
            variant="outline"
            className="max-w-full [&_img]:size-3.5 [&_img]:shrink-0"
          >
            {icon}
            <span className="truncate">{kind}</span>
          </Badge>
        </div>
        {meta && <div className="flex shrink-0 items-center">{meta}</div>}
      </div>

      {(title || description) && (
        <div className="flex flex-col gap-2">
          {title && (
            <div id={titleId} className="text-base leading-[14px] font-medium tracking-normal text-text-default">
              {title}
            </div>
          )}
          {description && <div className="text-base text-text-muted">{description}</div>}
        </div>
      )}

      {children}

      {actions && <div className="flex flex-wrap items-center justify-end gap-2 pt-1">{actions}</div>}
    </section>
  )
}

/** The message the suggestion answers: who sent it and what they wrote, on bg/muted. */
export function AgentSuggestionQuote({
  from,
  avatar,
  children,
  className,
}: {
  /** The sender's name. */
  from: React.ReactNode
  /** A 20px Avatar. */
  avatar?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <blockquote data-slot="agent-suggestion-quote" className={cn('m-0 flex flex-col gap-1 rounded-lg bg-bg-muted px-3 py-2', className)}>
      <div className="flex items-center gap-1.5">
        {avatar}
        <span className="text-xs leading-3 font-medium tracking-normal text-text-default">{from}</span>
      </div>
      <p className="m-0 text-base text-text-muted">{children}</p>
    </blockquote>
  )
}

/** A number against its limit: the value in Display/sm, its unit, and a 6px bar of how much is used. */
export function AgentSuggestionMetric({
  value,
  unit,
  used,
  max,
  className,
}: {
  /** As shown: "47 / 50". */
  value: React.ReactNode
  unit?: React.ReactNode
  /** With `max`, draws the bar. */
  used?: number
  max?: number
  className?: string
}) {
  return (
    <div data-slot="agent-suggestion-metric" className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl leading-[1.5] font-medium tabular-nums">{value}</span>
        {unit && <span className="text-base text-text-muted">{unit}</span>}
      </div>
      {used != null && max != null && (
        <Progress
          value={used}
          max={max}
          showValue={false}
          aria-label={typeof unit === 'string' ? unit : undefined}
          className="[&_[role=progressbar]]:h-1.5"
        />
      )}
    </div>
  )
}

/** Old text struck through on bg/muted, the new text in status/green below it. */
export function AgentSuggestionDiff({ before, after, className }: { before: React.ReactNode; after: React.ReactNode; className?: string }) {
  const labels = useSatinLabels()
  return (
    <div data-slot="agent-suggestion-diff" className={cn('flex flex-col gap-1 text-base', className)}>
      <del className="rounded-lg bg-bg-muted px-2 py-1.5 text-text-muted">
        <span className="sr-only">{labels.remove}: </span>
        {before}
      </del>
      <ins className="rounded-lg bg-status-green-bg px-2 py-1.5 text-status-green-fg no-underline">
        <span className="sr-only">{labels.add}: </span>
        {after}
      </ins>
    </div>
  )
}

export interface AgentSuggestionChange {
  field: React.ReactNode
  from?: React.ReactNode
  /** A string reads as Body/md Strong; pass a Badge for a stage or status. */
  to: React.ReactNode
}

/** Fields the agent will change: name, the old value struck through, an arrow and the new one. */
export function AgentSuggestionChanges({ changes, className }: { changes: AgentSuggestionChange[]; className?: string }) {
  return (
    <dl data-slot="agent-suggestion-changes" className={cn('m-0 flex flex-col gap-2 text-base', className)}>
      {changes.map((c, i) => (
        <div key={i} className="flex min-h-[21px] items-center gap-2">
          <dt className="w-[88px] shrink-0 text-text-muted">{c.field}</dt>
          <dd className="m-0 flex min-w-0 items-center gap-2">
            {c.from != null && (
              <>
                <del className="text-text-subtle">{c.from}</del>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-text-subtle [stroke-width:1.875] rtl:-scale-x-100" />
              </>
            )}
            {typeof c.to === 'string' ? <span className="font-medium text-text-default">{c.to}</span> : c.to}
          </dd>
        </div>
      ))}
    </dl>
  )
}
