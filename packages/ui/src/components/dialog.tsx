'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { Button } from './button'
import { useSatinLabels } from './labels'
import { CloseIcon, StatusIcon } from './alert'

// Defined in alert.tsx; re-exported so existing imports from './dialog' keep working.
export { CloseIcon, StatusIcon }

/**
 * Dialog, 1:1 with the uiKit `Dialog` set (465:66873): variant default or destructive.
 * A 425px popover surface (min 360, max 560, never wider or taller than the screen less 16px a side; the body scrolls), radius-2xl, border/default, the shadcn `lg`
 * shadow. Header 16 / 16 / 8 with a 14px medium title and a 13px muted description, a body
 * 16px in with a 12px gap (body text, any content, an optional `DialogAlert`), then a
 * right-aligned footer with 16px padding on both variants, on the same inset as the header and
 * body. The close button is a 36px tertiary icon button 8px from the top-right corner.
 *
 * Built on the Radix Dialog. The destructive variant keeps the same primitive but takes
 * `role="alertdialog"`, so screen readers announce it as an alert. Pass `container` to portal
 * it into a positioned element (the docs stage) instead of the page; the dialog then centres
 * inside that element rather than the viewport.
 *
 * Other props, `ref` included, go to the dialog's content panel.
 */
export type DialogVariant = 'default' | 'destructive'

export interface DialogProps
  extends Omit<React.ComponentProps<typeof DialogPrimitive.Content>, 'title' | 'children' | 'asChild' | 'onOpenAutoFocus'> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Optional element that opens the dialog (rendered with `asChild`, so pass a Button). */
  trigger?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  variant?: DialogVariant
  /** A `DialogAlert` shown under the body, for a side effect the user must know about. */
  alert?: React.ReactNode
  /** The actions on the right of the footer. Leave it out for a read-only dialog. */
  footer?: React.ReactNode
  /** Figma's `footerSlot`: content on the left of the footer, e.g. a "Don't ask again" checkbox. */
  footerStart?: React.ReactNode
  /** Body. A string renders as body text (13px, text/default). */
  children?: React.ReactNode
  /** Show the close button in the corner. */
  closeButton?: boolean
  /** Modal blocks the page and shows the overlay; turn it off for inline previews. */
  modal?: boolean
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null
  /** Called when focus moves into the dialog on open; `preventDefault()` keeps it where it was. */
  onOpenAutoFocus?: (event: Event) => void
  className?: string
}

export function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  variant = 'default',
  alert,
  footer,
  footerStart,
  children,
  closeButton = true,
  modal = true,
  container,
  onOpenAutoFocus,
  className,
  ...props
}: DialogProps) {
  const labels = useSatinLabels()
  // Inside a container the dialog is laid out against it, not the viewport.
  const position = container ? 'absolute' : 'fixed'
  const hasBody = children != null || alert != null

  return (
    <DialogPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} modal={modal}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal container={container}>
        {/* No overlay in Figma; black-a40 is the kit's scrim colour. Only drawn when modal. */}
        <DialogPrimitive.Overlay
          className={cn(
            position,
            'inset-0 z-50 bg-black-a40',
          )}
        />
        <div className={cn(position, 'pointer-events-none inset-0 z-50 grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center p-4')}>
          <DialogPrimitive.Content
            // No description: tell Radix on purpose, so it doesn't warn (an aria-describedby passed in still wins).
            {...(description ? {} : { 'aria-describedby': undefined })}
            {...props}
            role={variant === 'destructive' ? 'alertdialog' : 'dialog'}
            data-slot="dialog"
            data-variant={variant}
            onOpenAutoFocus={onOpenAutoFocus}
            className={cn(
              'pointer-events-auto relative flex max-h-full w-[425px] max-w-[min(560px,100%)] min-w-[min(360px,100%)] flex-col overflow-clip',
              'rounded-2xl border border-border-default bg-bg-popover',
              '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
              'focus-visible:outline-none',
              'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
              className,
            )}
          >
            <div className="flex min-h-0 flex-col gap-3">
              <div className="flex shrink-0 flex-col gap-0.5 px-4 pt-4 pb-2">
                <DialogPrimitive.Title className="pr-8 text-base leading-[14px] font-medium tracking-normal text-text-default">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="text-body text-text-muted">{description}</DialogPrimitive.Description>
                ) : null}
              </div>
              {hasBody && (
                <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 pb-3">
                  {typeof children === 'string' ? <p className="text-body text-text-default">{children}</p> : children}
                  {alert}
                </div>
              )}
            </div>

            {(footer || footerStart) && (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 p-4">
                {footerStart && <div className="flex min-w-0 flex-1 items-center">{footerStart}</div>}
                <div className="flex shrink-0 items-center gap-2">{footer}</div>
              </div>
            )}

            {closeButton && (
              <DialogPrimitive.Close asChild>
                <Button
                  variant="tertiary"
                  size="xl"
                  iconOnly
                  aria-label={labels.close}
                  className="absolute top-[7px] right-[7px] rounded-lg"
                >
                  <CloseIcon />
                </Button>
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Wrap a footer button in this to make it close the dialog: `<DialogClose asChild><Button…/></DialogClose>`. */
export const DialogClose = DialogPrimitive.Close

/* ------------------------------------------------------------------------------------------ */

export type DialogAlertIntent = 'info' | 'success' | 'warning' | 'error'

/**
 * Alert, 1:1 with the uiKit `Alert` set (475:27871): the inline notice inside a dialog.
 * radius-xl, 16 / 12 padding, the intent's status bg, a 16px status icon in the intent's
 * status fg, a 14px medium title over a 13px muted description, and an optional 28px close.
 */
export interface DialogAlertProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  intent?: DialogAlertIntent
  title: React.ReactNode
  description?: React.ReactNode
  /** Hide the status icon. */
  icon?: boolean
  /** Shows the close button; called when it is pressed. */
  onDismiss?: () => void
}

const alertTint: Record<DialogAlertIntent, string> = {
  info: 'bg-status-sky-bg text-status-sky-fg',
  success: 'bg-status-green-bg text-status-green-fg',
  warning: 'bg-status-amber-bg text-status-amber-fg',
  error: 'bg-status-red-bg text-status-red-fg',
}

export function DialogAlert({
  intent = 'info',
  title,
  description,
  icon = true,
  onDismiss,
  className,
  ...props
}: DialogAlertProps) {
  const labels = useSatinLabels()
  return (
    <div
      role={intent === 'error' || intent === 'warning' ? 'alert' : 'status'}
      data-slot="dialog-alert"
      data-intent={intent}
      className={cn('flex w-full items-center gap-3 rounded-xl px-4 py-3', alertTint[intent], className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {icon && <StatusIcon intent={intent} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-base font-medium text-text-default">{title}</p>
          {description ? <p className="text-body text-text-muted">{description}</p> : null}
        </div>
      </div>
      {onDismiss && (
        <Button variant="tertiary" iconOnly aria-label={labels.dismiss} onClick={onDismiss}>
          <CloseIcon />
        </Button>
      )}
    </div>
  )
}
