import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { Button } from './button'
import { CloseIcon } from './dialog'

/**
 * Sheet, 1:1 with the uiKit `Sheet` set (4025:3504): a panel that slides in from an edge and sits
 * flush with it, square and borderless on that side. bottom for phones (full width, radius-2xl
 * on the top corners, a 24px handle band with a 36 × 4 border/strong grip); right or left for
 * wider screens (400px, full height, radius-2xl on the inner corners, the Dialog's 36px close
 * button 7px from the top-right corner). Both are bg/card with a
 * border/subtle edge on the open side and the shadcn `lg` shadow, 16px in and 16px between a
 * header (14px medium title over a 13px muted description, 2px apart), the content and a
 * right-aligned footer of buttons 8px apart (on the bottom sheet they share the width).
 *
 * Built on the Radix Dialog: focus moves in on open and back to the trigger on close; Escape,
 * the backdrop or the handle closes it. It slides in over 250 ms on ease-out and out over 200.
 */
export interface SheetProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Optional element that opens the sheet (rendered with `asChild`, so pass a Button). */
  trigger?: React.ReactNode
  side?: 'bottom' | 'right' | 'left'
  title: React.ReactNode
  description?: React.ReactNode
  /** The buttons at the bottom. Wrap one in `SheetClose` to make it close the sheet. */
  footer?: React.ReactNode
  children?: React.ReactNode
  /** Modal blocks the page and shows the overlay; turn it off for inline previews. */
  modal?: boolean
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  onOpenAutoFocus?: (event: Event) => void
  className?: string
}

export function Sheet({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  side = 'right',
  title,
  description,
  footer,
  children,
  modal = true,
  container,
  onOpenAutoFocus,
  className,
}: SheetProps) {
  const position = container ? 'absolute' : 'fixed'
  return (
    <DialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} modal={modal}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Overlay
          className={cn(
            position,
            'inset-0 z-50 bg-black-a40',
            'data-[state=open]:animate-[satin-fade-in_var(--duration-slow)_var(--ease-out)]',
            'data-[state=closed]:animate-[satin-fade-out_var(--duration-base)_var(--ease-out)]',
          )}
        />
        <DialogPrimitive.Content
          data-slot="sheet"
          data-side={side}
          onOpenAutoFocus={onOpenAutoFocus}
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            position,
            'z-50 flex flex-col gap-4 bg-bg-card p-4 outline-none',
            '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
            // Flush with its edge: no radius and no border on the side that touches it.
            side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85%] rounded-t-2xl border-t border-border-subtle pt-6',
            side === 'right' && 'inset-y-0 right-0 w-[400px] max-w-[calc(100%-32px)] rounded-l-2xl border-l border-border-subtle',
            side === 'left' && 'inset-y-0 left-0 w-[400px] max-w-[calc(100%-32px)] rounded-r-2xl border-r border-border-subtle',
            side === 'bottom' &&
              'data-[state=open]:animate-[satin-sheet-up_var(--duration-slow)_var(--ease-out)] data-[state=closed]:animate-[satin-sheet-down_var(--duration-base)_var(--ease-out)]',
            side === 'right' &&
              'data-[state=open]:animate-[satin-sheet-left_var(--duration-slow)_var(--ease-out)] data-[state=closed]:animate-[satin-sheet-right_var(--duration-base)_var(--ease-out)]',
            side === 'left' &&
              'data-[state=open]:animate-[satin-sheet-from-left_var(--duration-slow)_var(--ease-out)] data-[state=closed]:animate-[satin-sheet-to-left_var(--duration-base)_var(--ease-out)]',
            className,
          )}
        >
          {side === 'bottom' && (
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute inset-x-4 top-0 flex h-6 cursor-pointer items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-action-focus-ring"
            >
              <span aria-hidden className="h-1 w-9 rounded-full bg-border-strong" />
            </DialogPrimitive.Close>
          )}

          <div className={cn('flex flex-col gap-0.5', side !== 'bottom' && 'pr-8')}>
            <DialogPrimitive.Title className="text-base leading-[21px] font-medium text-text-default">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-text-muted">{description}</DialogPrimitive.Description>
            ) : null}
          </div>

          {children != null && <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>}

          {footer && (
            <div className={cn('flex shrink-0 items-center justify-end gap-2', side === 'bottom' && '*:flex-1')}>{footer}</div>
          )}

          {side !== 'bottom' && (
            <DialogPrimitive.Close asChild>
              <Button variant="tertiary" size="xl" iconOnly aria-label="Close" className="absolute top-[7px] right-[7px] rounded-lg">
                <CloseIcon />
              </Button>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Wrap a footer button in this to make it close the sheet: `<SheetClose asChild><Button…/></SheetClose>`. */
export const SheetClose = DialogPrimitive.Close
