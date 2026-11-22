import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { formatBytes } from '@uisatin/ui/file-upload'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Spinner } from '@uisatin/ui/spinner'
import { Tooltip } from '@uisatin/ui/tooltip'
import { csvImportLabels } from '@uisatin/pro/csv-import'
import type { CsvFlow, FocusWant } from './flow'

/*
 * The prototype's frame pieces (root, sliding stage, blockable primary, live region), the
 * reading moment as v0 shows it, focus after a step, and its words: CsvImport's, with the app's
 * SatinLabels over them. The step's own words are v6Words in v6-header-steps.tsx.
 */

/* ---------- words ---------- */

export const useWords = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...csvImportLabels, ...labels }), [labels])
}
export type Words = ReturnType<typeof useWords>

/* ---------- small helpers ---------- */

/** Where focus lands from a script (a status line, a heading): v0's ring, shown only after keyboard use. */
export const focusTargetClass = 'rounded-xs outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]'

/**
 * Moves focus to what the flow asked for once it is on the page, only when focus was in the
 * panel (or lost with what was removed). `resolve` turns a want into an element; null waits.
 */
export function useFlowFocus(flow: CsvFlow, rootRef: React.RefObject<HTMLElement | null>, resolve: (want: FocusWant, root: HTMLElement) => HTMLElement | null) {
  React.useLayoutEffect(() => {
    const want = flow.focusNext.current
    const root = rootRef.current
    if (!want || !root) return
    const active = document.activeElement
    if (active && active !== document.body && !root.contains(active)) {
      flow.focusNext.current = null
      return
    }
    const target = resolve(want, root)
    if (!target) return
    flow.focusNext.current = null
    target.focus({ preventScroll: true })
  })
}

/* ---------- the frame's pieces ---------- */

/**
 * The fixed frame: 520 high unless the className says otherwise (h-auto flex-1 in a Dialog), a
 * column of the pieces. `data-slot="csv-import"` and `data-step` for the states page.
 */
export function Root({ variant, stage, className, ref, children, ...props }: React.ComponentProps<'div'> & { variant: number; stage: string }) {
  return (
    <div
      ref={ref}
      data-slot="csv-import"
      data-variant={variant}
      data-step={stage}
      // Tables and cards inside sit on the panel surface (bg/popover), one fill throughout, so their
      // edges carry the shape: border/default (as Attachment's edge) for the outline and every rule, 1px.
      className={cn('flex h-[520px] min-h-0 shrink flex-col [--bg-card:var(--bg-popover)] [--component-table-header:var(--bg-popover)] [&_[data-slot=table]]:border-border-default [&_[data-slot=table]]:[--border-subtle:var(--border-default)]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * The part that slides: a clipped box with one absolutely placed part inside, so the frame never
 * changes height. Give `partRef` to useStepSlide.
 */
export function Stage({ partRef, className, children }: { partRef: React.RefObject<HTMLDivElement | null>; className?: string; children: React.ReactNode }) {
  return (
    <div data-slot="csv-import-body" className="relative min-h-0 flex-1 overflow-clip">
      <div ref={partRef} data-slot="csv-import-step" className={cn('absolute inset-0 flex flex-col', className)}>
        {children}
      </div>
    </div>
  )
}

/** One polite region for reading, importing and how they ended; a new key makes it speak again. */
export function LiveRegion({ flow }: { flow: CsvFlow }) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      <span key={flow.said.n}>{flow.said.text}</span>
    </div>
  )
}

/** A primary action that can't run yet: aria-disabled, its reason in a Tooltip and the footer line it points to. */
export function Blockable({
  reason,
  reasonId,
  blocked,
  loading,
  onClick,
  children,
}: {
  reason: string | null
  reasonId: string
  blocked: boolean
  loading?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  // Always inside the Tooltip, so the button never remounts (and keeps focus) as it unblocks.
  return (
    <Tooltip label={reason ?? ''} open={reason ? undefined : false}>
      <Button loading={loading} aria-disabled={blocked && !loading ? true : undefined} aria-describedby={reason ? reasonId : undefined} onClick={onClick}>
        {children}
      </Button>
    </Tooltip>
  )
}

/** While a file is read: a Spinner and "Reading 4,212 rows…" over the file's name and size, as v0 shows it. */
export function ReadingView({ flow }: { flow: CsvFlow }) {
  const { words, n, noun, parse } = flow
  if (parse.status !== 'reading') return null
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p data-csv-focus="reading" tabIndex={-1} className={cn('flex items-center gap-2 text-base leading-5 font-medium text-text-default', focusTargetClass)}>
        <Spinner label={null} />
        {parse.read > 0 ? words.csvReading(n(parse.read), noun(parse.read)) : words.csvReadingFile(parse.file.name)}
      </p>
      <p className="text-sm text-text-muted">{`${parse.file.name} · ${formatBytes(parse.file.size)}`}</p>
    </div>
  )
}
