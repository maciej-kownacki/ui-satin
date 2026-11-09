'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * Popover, 1:1 with the uiKit `Popover` component (613:18781): a 320px popover surface,
 * radius-xl, border/default, the shadcn `lg` shadow, 10px padding all round. A 13px medium
 * title (18px line) over a 13px muted description, 2px apart; a 16px close glyph in text/subtle
 * 10px from the top-right corner; an optional body slot 16px below the header. It opens 8px below its trigger, aligned to the trigger's start.
 *
 * Built on the Radix Popover. `children` is the trigger (rendered with `asChild`, so pass a
 * Button); `body` fills the body slot. Pass `container` to portal it into the docs stage.
 */
export interface PopoverProps {
  title: React.ReactNode
  description?: React.ReactNode
  /** The trigger. Rendered with `asChild`. */
  children?: React.ReactNode
  /** Figma's body slot: actions or a small form. Keep it to one task. */
  body?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  /** Show the close glyph in the corner. */
  closeButton?: boolean
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** Called when focus moves into the popover on open; `preventDefault()` keeps it where it was. */
  onOpenAutoFocus?: (event: Event) => void
  className?: string
}

const panelClass = cn(
  'relative flex w-[320px] max-w-[calc(100vw-16px)] flex-col overflow-clip pb-2.5',
  'rounded-xl border border-border-default bg-bg-popover',
  '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
)
const closeClass = cn(
  'absolute top-2.5 right-2.5 grid size-4 place-items-center rounded-sm text-text-subtle',
  'transition-colors duration-(--duration-fast) ease-(--ease-out)',
  'satin-hover:text-text-default focus-visible:outline-none satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
)
const closeIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M4.50551 11.4951L8.0006 8M8.0006 8L11.4957 4.50491M8.0006 8L4.50551 4.50491M8.0006 8L11.4957 11.4951"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** Title, description and body: what both the floating Popover and PopoverPanel show. */
function PanelBody({ titleId, title, description, body, closeButton }: { titleId: string } & Pick<PopoverProps, 'title' | 'description' | 'body' | 'closeButton'>) {
  return (
    <>
      <div className="flex flex-col gap-0.5 px-2.5 pt-2.5 text-sm">
        <p id={titleId} className={cn('leading-[18px] font-medium text-text-default', closeButton && 'pr-6')}>{title}</p>
        {description ? <p className="text-text-muted">{description}</p> : null}
      </div>
      {body ? <div className="flex flex-col gap-4 px-2.5 pt-4">{body}</div> : null}
    </>
  )
}

export function Popover({
  title,
  description,
  children,
  body,
  open,
  defaultOpen,
  onOpenChange,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  closeButton = true,
  container,
  onOpenAutoFocus,
  className,
}: PopoverProps) {
  const titleId = React.useId()
  return (
    <PopoverPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {children && <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>}
      <PopoverPrimitive.Portal container={container}>
        <PopoverPrimitive.Content
          data-slot="popover"
          aria-labelledby={titleId}
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={8}
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn(
            panelClass,
            'pointer-events-auto z-50 origin-(--radix-popover-content-transform-origin) focus-visible:outline-none',
            'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
            className,
          )}
        >
          {/* Radix Popover has no Title part; the content is labelled by the heading. */}
          <PanelBody titleId={titleId} title={title} description={description} body={body} closeButton={closeButton} />
          {closeButton && (
            <PopoverPrimitive.Close aria-label="Close" className={closeClass}>
              {closeIcon}
            </PopoverPrimitive.Close>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/**
 * The popover's panel on its own, in place: no trigger, no positioning. For docs, previews
 * and layers you anchor yourself. The close button calls `onClose`.
 */
export function PopoverPanel({
  title,
  description,
  body,
  closeButton = true,
  onClose,
  className,
}: Pick<PopoverProps, 'title' | 'description' | 'body' | 'closeButton' | 'className'> & { onClose?: () => void }) {
  const titleId = React.useId()
  return (
    <div role="dialog" aria-labelledby={titleId} data-slot="popover" className={cn(panelClass, className)}>
      <PanelBody titleId={titleId} title={title} description={description} body={body} closeButton={closeButton} />
      {closeButton && (
        <button type="button" aria-label="Close" onClick={onClose} className={closeClass}>
          {closeIcon}
        </button>
      )}
    </div>
  )
}

/** Wrap a body button in this to make it close the popover: `<PopoverClose asChild><Button…/></PopoverClose>`. */
export const PopoverClose = PopoverPrimitive.Close
