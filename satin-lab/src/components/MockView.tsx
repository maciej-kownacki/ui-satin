import * as React from 'react'
import { Skeleton } from '@uisatin/ui/skeleton'
import { cn } from '@uisatin/ui'

/**
 * A pretend app view for page-level components (cookie consent, announcement bar): a card with
 * a skeleton of content — a header, a few lines and two tiles — that the component sits on.
 * `top` and `bottom` take what is pinned to its edges; `overlay` floats over the content.
 */
export function MockView({
  top,
  bottom,
  overlay,
  className,
}: {
  top?: React.ReactNode
  bottom?: React.ReactNode
  overlay?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex h-[320px] w-full max-w-[720px] flex-col overflow-clip rounded-2xl border border-border-subtle bg-bg-card [box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
        className,
      )}
    >
      {top}
      <div aria-hidden className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
        <div className="flex items-center gap-3">
          <Skeleton shape="circle" className="size-8" />
          <div className="flex flex-col gap-2">
            <Skeleton width={180} />
            <Skeleton width={110} />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <Skeleton width="92%" />
          <Skeleton width="78%" />
          <Skeleton width="85%" />
          <Skeleton width="52%" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton shape="rect" className="h-24" width="100%" />
          <Skeleton shape="rect" className="h-24" width="100%" />
        </div>
      </div>
      {bottom}
      {overlay}
    </div>
  )
}
