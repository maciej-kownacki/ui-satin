'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { HoverCard } from './hover-card'
import { useSatinLabels } from './labels'

/**
 * Citations and sources, 1:1 with the uiKit design (🆕 citations): where an answer comes from.
 *
 * - `Citation`: a numbered chip right after the claim — 16 high, text/xs medium on bg/muted,
 *   radius-sm; hover bg/hover with a border/strong ring. Resting on it (or focusing it) opens a
 *   HoverCard with the source: logo and where it lives, the title, and the quoted passage.
 * - `Sources`: under the message, a pill with the sources' logos stacked and "3 sources"; it
 *   opens into the list — number, logo, title, where it lives — each row a link.
 *
 * A source's `icon` is its logo (an app's or a site's favicon); without one it gets a tile with
 * its first letter, so a missing favicon never leaves a hole.
 */
export interface CitationSource {
  title: string
  /** Where it comes from: the app or site, "Notion" or "freshfarm.pl". */
  origin?: string
  href?: string
  /** A 16px logo or favicon. */
  icon?: React.ReactNode
  /** The passage the answer relies on, shown in the preview. */
  quote?: string
}

function SourceIcon({ source }: { source: CitationSource }) {
  if (source.icon) return <span className="grid size-4 shrink-0 place-items-center overflow-clip rounded-xs [&>*]:size-4">{source.icon}</span>
  return (
    <span aria-hidden className="grid size-4 shrink-0 place-items-center rounded-xs bg-bg-muted text-[10px] leading-none font-semibold text-text-muted">
      {source.title.charAt(0).toUpperCase()}
    </span>
  )
}

/** The numbered chip. Other props, `ref` included, go to its `a` (an `aria-label` passed in replaces the default). */
export interface CitationProps extends Omit<React.ComponentProps<'a'>, 'children'> {
  /** 1-based, as in the Sources list. */
  index: number
  source: CitationSource
  className?: string
}

export function Citation({ index, source, className, 'aria-label': ariaLabel, ...props }: CitationProps) {
  const labels = useSatinLabels()
  const chip = (
    <a
      {...props}
      data-slot="citation"
      href={source.href}
      target={source.href ? '_blank' : undefined}
      rel={source.href ? 'noreferrer' : undefined}
      aria-label={ariaLabel ?? `${labels.source} ${index}: ${source.title}`}
      className={cn(
        'mx-0.5 inline-grid h-4 min-w-4 translate-y-[-1px] place-items-center rounded-sm bg-bg-muted px-1 align-middle text-xs leading-none font-medium text-text-default no-underline tabular-nums outline-none',
        'transition-[background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
        'hover:bg-bg-hover hover:[box-shadow:inset_0_0_0_1px_var(--border-strong)] focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        className,
      )}
    >
      {index}
    </a>
  )
  return (
    <HoverCard trigger={chip} side="top" align="center" className="w-[300px] gap-2 p-3">
      <span className="flex items-center gap-2 text-xs text-text-muted">
        <SourceIcon source={source} />
        <span className="truncate">{source.origin}</span>
      </span>
      <span className="text-sm font-medium text-text-default">{source.title}</span>
      {source.quote && <span className="text-body text-text-muted">“{source.quote}”</span>}
    </HoverCard>
  )
}

/** The sources pill and list. Other props, `ref` included, go to its root `div`. */
export interface SourcesProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  sources: CitationSource[]
  /** Start with the list open. */
  defaultOpen?: boolean
  className?: string
}

export function Sources({ sources, defaultOpen = false, className, ...props }: SourcesProps) {
  const labels = useSatinLabels()
  const [open, setOpen] = React.useState(defaultOpen)
  const listId = React.useId()
  return (
    <div {...props} data-slot="sources" className={cn('flex flex-col gap-2', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex h-8 w-fit items-center gap-2 rounded-pill border border-border-default py-1 ps-1.5 pe-3 text-sm font-medium text-text-default outline-none',
          'transition-[border-color,background-color] duration-(--duration-fast) ease-(--ease-out)',
          'hover:border-border-strong focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
          open && 'bg-bg-hover',
        )}
      >
        <span className="flex items-center gap-0.5">
          {sources.slice(0, 3).map((s, i) => (
            <SourceIcon key={i} source={s} />
          ))}
        </span>
        {labels.sourcesCount(sources.length)}
      </button>
      <div id={listId} data-state={open ? 'open' : 'closed'} className="satin-expand">
        <div>
          <ol className="flex flex-col gap-0.5">
            {sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.href}
                  target={s.href ? '_blank' : undefined}
                  rel={s.href ? 'noreferrer' : undefined}
                  className="flex items-center gap-3 rounded-lg p-2 text-sm no-underline outline-none transition-colors duration-(--duration-fast) ease-(--ease-out) hover:bg-bg-hover focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]"
                >
                  <span className="grid h-4 min-w-4 place-items-center rounded-sm bg-bg-muted px-1 text-xs leading-none font-medium text-text-default tabular-nums">{i + 1}</span>
                  <SourceIcon source={s} />
                  <span className="min-w-0 flex-1 truncate text-text-default">{s.title}</span>
                  {s.origin && <span className="shrink-0 text-text-muted">{s.origin}</span>}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
