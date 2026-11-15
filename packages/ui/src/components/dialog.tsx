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
  ...props
}: DialogProps) {
  const hasBody = children != null || alert != null

  return (
    <DialogRoot open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} modal={modal}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        // No description: tell Radix on purpose, so it doesn't warn (an aria-describedby passed in still wins).
        {...(description ? {} : { 'aria-describedby': undefined })}
        {...props}
        variant={variant}
        closeButton={closeButton}
        container={container}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {hasBody && (
          <DialogBody>
            {typeof children === 'string' ? <p className="text-body text-text-default">{children}</p> : children}
            {alert}
          </DialogBody>
        )}
        {(footer || footerStart) && <DialogFooter start={footerStart}>{footer}</DialogFooter>}
      </DialogContent>
    </DialogRoot>
  )
}

/* ---------- Parts ----------------------------------------------------------------------------
 * The same dialog in pieces, for layouts the props don't cover (a form around the body and the
 * footer, a header with an icon, a trigger elsewhere in the tree). Dialog above is built from
 * them, so both look and behave the same:
 *
 *   <DialogRoot>
 *     <DialogTrigger asChild><Button>Rename</Button></DialogTrigger>
 *     <DialogContent>
 *       <DialogHeader><DialogTitle>Rename file</DialogTitle></DialogHeader>
 *       <DialogBody>…</DialogBody>
 *       <DialogFooter><DialogClose asChild><Button>Save</Button></DialogClose></DialogFooter>
 *     </DialogContent>
 *   </DialogRoot>
 *
 * DialogTitle is required (Radix warns without one); DialogDescription is optional, and without
 * it pass `aria-describedby={undefined}` to DialogContent.
 */

/** Holds the open state: `open`, `defaultOpen`, `onOpenChange`, `modal`. */
export function DialogRoot(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

/** Opens the dialog. With `asChild` it lends its behaviour to your own Button. */
export function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

export interface DialogContentProps extends Omit<React.ComponentProps<typeof DialogPrimitive.Content>, 'asChild'> {
  variant?: DialogVariant
  /** Show the close button in the corner. */
  closeButton?: boolean
  /** Portal target. Defaults to `document.body`; inside it the dialog centres on that element. */
  container?: HTMLElement | null
}

/** The overlay and the panel, portaled; the panel takes the header, body and footer as children. */
export function DialogContent({ variant = 'default', closeButton = true, container, className, children, ...props }: DialogContentProps) {
  const labels = useSatinLabels()
  // Inside a container the dialog is laid out against it, not the viewport.
  const position = container ? 'absolute' : 'fixed'
  return (
    <DialogPrimitive.Portal container={container}>
      {/* No overlay in Figma; black-a40 is the kit's scrim colour. Only drawn when modal. */}
      <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn(position, 'inset-0 z-50 bg-black-a40')} />
      <div className={cn(position, 'pointer-events-none inset-0 z-50 grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center p-4')}>
        <DialogPrimitive.Content
          {...props}
          role={variant === 'destructive' ? 'alertdialog' : 'dialog'}
          data-slot="dialog"
          data-variant={variant}
          className={cn(
            'pointer-events-auto relative flex max-h-full w-[425px] max-w-[min(560px,100%)] min-w-[min(360px,100%)] flex-col overflow-clip',
            'rounded-2xl border border-border-default bg-bg-popover',
            '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
            'focus-visible:outline-none',
            'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
            className,
          )}
        >
          {children}
          {closeButton && (
            <DialogPrimitive.Close asChild>
              <Button variant="tertiary" size="xl" iconOnly aria-label={labels.close} className="absolute end-[7px] top-[7px] rounded-lg">
                <CloseIcon />
              </Button>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
}

/** The title and description, 16 / 16 / 8 in, clear of the close button. */
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('flex shrink-0 flex-col gap-0.5 px-4 pt-4 pb-2', className)} {...props} />
}

/** The dialog's accessible name: 14px medium. */
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('pe-8 text-base leading-[14px] font-medium tracking-normal text-text-default', className)}
      {...props}
    />
  )
}

/** One line under the title, read out after it: body size, muted. */
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn('text-body text-text-muted', className)} {...props} />
}

/** The content between header and footer; it scrolls when the dialog meets the screen's edge. */
export function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-body" className={cn('flex min-h-0 flex-col gap-3 overflow-y-auto px-4 pt-3 pb-3', className)} {...props} />
}

export interface DialogFooterProps extends React.ComponentProps<'div'> {
  /** Content on the left (Figma's `footerSlot`), e.g. a "Don't ask again" checkbox. */
  start?: React.ReactNode
}

/** The actions, right-aligned, 16px in. */
export function DialogFooter({ start, className, children, ...props }: DialogFooterProps) {
  return (
    <div data-slot="dialog-footer" className={cn('flex shrink-0 flex-wrap items-center justify-end gap-3 p-4', className)} {...props}>
      {start && <div className="flex min-w-0 flex-1 items-center">{start}</div>}
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
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
