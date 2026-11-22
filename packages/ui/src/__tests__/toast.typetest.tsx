/**
 * Type-checked only, never run: toast()'s options (the countdown among them), the Toaster, and
 * a controlled and an uncontrolled `<Toast>` with a `ref` on its `<li>`.
 */
import * as React from 'react'
import { Toast, Toaster, toast, type ToastCloseReason, type ToastOptions } from '../components/toast'

const undo: ToastOptions = {
  description: 'Maya Chen · Product designer',
  action: { label: 'Undo', altText: (labels) => `${labels.close}: Ctrl+Z`, onClick: () => {} },
  duration: 5000,
  countdown: true,
}
export const id: string = toast('Candidate rejected', undo)
toast.success('Saved', { countdown: false, duration: Infinity })
toast('Saved', { id, duration: Infinity })

toast('Comment deleted', { countdown: true, onClose: (reason: ToastCloseReason) => void (reason === 'action' || reason === 'expire') })
// @ts-expect-error the reasons are action, close and expire
toast('Comment deleted', { onClose: (reason) => reason === 'timeout' })

// @ts-expect-error countdown is on or off
toast('Saved', { countdown: 'on' })
// @ts-expect-error the shortcuts set the intent themselves
toast.error('Failed', { intent: 'error' })

export function ToastTypes() {
  const [open, setOpen] = React.useState(true)
  return (
    <Toaster limit={3} className="absolute">
      <Toast title="Controlled" open={open} onOpenChange={setOpen} ref={React.createRef<HTMLLIElement>()} />
      <Toast title="Uncontrolled" defaultOpen duration={8000} intent="warning" action={{ label: 'Retry' }} data-testid="x" />
    </Toaster>
  )
}
