import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * Dialog, 1:1 with the uiKit `Dialog` set (465:66873): variant default or destructive.
 * A 425px popover surface (min 360, max 560), radius-2xl, border/default, the shadcn `lg`
 * shadow. Header 16 / 16 / 8 with a 14px medium title and a 13px muted description, a body
 * 16px in with a 12px gap (body text, any content, an optional `DialogAlert`), then a
 * right-aligned footer: 12px padding on default, 16px on destructive. The close button is a
 * 36px tertiary icon button 8px from the top-right corner.
 *
 * Built on the Radix Dialog. The destructive variant keeps the same primitive but takes
 * `role="alertdialog"`, so screen readers announce it as an alert. Pass `container` to portal
 * it into a positioned element (the docs stage) instead of the page; the dialog then centres
 * inside that element rather than the viewport.
 */
export type DialogVariant = 'default' | 'destructive'

export interface DialogProps {
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

/** The X from Figma's close button (`icon` 16px, 1.25 stroke). */
function CloseIcon() {
  return (
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
}: DialogProps) {
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
        <div className={cn(position, 'pointer-events-none inset-0 z-50 grid place-items-center p-4')}>
          <DialogPrimitive.Content
            role={variant === 'destructive' ? 'alertdialog' : 'dialog'}
            data-slot="dialog"
            data-variant={variant}
            onOpenAutoFocus={onOpenAutoFocus}
            // No description: tell Radix on purpose, so it doesn't warn.
            {...(description ? {} : { 'aria-describedby': undefined })}
            className={cn(
              'pointer-events-auto relative flex w-[425px] max-w-[560px] min-w-[360px] flex-col overflow-clip',
              'rounded-2xl border border-border-default bg-bg-popover',
              '[box-shadow:0_4px_6px_-4px_var(--effect-shadow-sm),0_10px_15px_-3px_var(--effect-shadow-sm)]',
              'focus-visible:outline-none',
              'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
              className,
            )}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5 px-4 pt-4 pb-2">
                <DialogPrimitive.Title className="pr-8 text-base leading-[14px] font-medium tracking-normal text-text-default">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="text-body text-text-muted">{description}</DialogPrimitive.Description>
                ) : null}
              </div>
              {hasBody && (
                <div className="flex flex-col gap-3 px-4 pb-3">
                  {typeof children === 'string' ? <p className="text-body text-text-default">{children}</p> : children}
                  {alert}
                </div>
              )}
            </div>

            {(footer || footerStart) && (
              <div className={cn('flex items-center justify-end gap-3', variant === 'destructive' ? 'p-4' : 'p-3')}>
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
                  aria-label="Close"
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

/** The four status glyphs from Figma (16px, 1.25 stroke), drawn in currentColor. */
export function StatusIcon({ intent }: { intent: DialogAlertIntent }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <g stroke="currentColor" style={{ strokeWidth: 1.25 }} strokeLinecap="round" strokeLinejoin="round">
        {intent === 'success' ? (
          <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" />
        ) : (
          <>
            {intent === 'info' ? (
              <>
                <path d="M8 7.70494V10.6557" />
                <path d="M8 5.35022L8.0059 5.34366" />
              </>
            ) : (
              <>
                <path d="M8 5.34428V8.29506" />
                <path d="M8 10.6563L8.0059 10.6498" />
              </>
            )}
            <path d="M8 13.9015C11.2593 13.9015 13.9015 11.2593 13.9015 8C13.9015 4.74066 11.2593 2.09845 8 2.09845C4.74066 2.09845 2.09845 4.74066 2.09845 8C2.09845 11.2593 4.74066 13.9015 8 13.9015Z" />
          </>
        )}
      </g>
    </svg>
  )
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
        <Button variant="tertiary" iconOnly aria-label="Dismiss" onClick={onDismiss}>
          <CloseIcon />
        </Button>
      )}
    </div>
  )
}
