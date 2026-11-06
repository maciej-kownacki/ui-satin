import * as React from 'react'
import { Button } from '@satin/ui'
import { Toaster, toast } from '@satin/ui/toast'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

type Example = { id: string; label: string; fire: (duration?: number) => void; code: string }

const setup = `// Once, near the root of the app:
import { Toaster } from '@satin/ui/toast'
<Toaster />

// Anywhere:
import { toast } from '@satin/ui/toast'
`

const examples: Example[] = [
  {
    id: 'neutral',
    label: 'Neutral',
    fire: (duration) =>
      toast('Message archived', {
        description: 'It moved to the Archive folder.',
        action: { label: 'Undo' },
        duration,
      }),
    code: `${setup}
toast('Message archived', {
  description: 'It moved to the Archive folder.',
  action: { label: 'Undo', onClick: () => restore(id) },
})`,
  },
  {
    id: 'success',
    label: 'Success',
    fire: (duration) =>
      toast.success('Booking confirmed', {
        description: 'Table for 4 on Friday at 19:30.',
        action: { label: 'View' },
        duration,
      }),
    code: `${setup}
toast.success('Booking confirmed', {
  description: 'Table for 4 on Friday at 19:30.',
  action: { label: 'View', onClick: openBooking },
})`,
  },
  {
    id: 'warning',
    label: 'Warning',
    fire: (duration) =>
      toast.warning('Running low on oat milk', {
        description: 'About two days left at the current rate.',
        action: { label: 'Reorder' },
        duration,
      }),
    code: `${setup}
toast.warning('Running low on oat milk', {
  description: 'About two days left at the current rate.',
  action: { label: 'Reorder', onClick: reorder },
})`,
  },
  {
    id: 'error',
    label: 'Error',
    fire: (duration) =>
      toast.error('Payment failed', {
        description: 'The card was declined. Nothing was charged.',
        action: { label: 'Retry' },
        duration,
      }),
    code: `${setup}
toast.error('Payment failed', {
  description: 'The card was declined. Nothing was charged.',
  action: { label: 'Retry', onClick: retry },
})`,
  },
]

export const options: ShowcaseOption[] = examples.map(({ id, label, code }) => ({ id, label, code }))

/** One toast is on screen when the option opens (it stays until closed); the button adds more. */
function Preview({ id }: { id: string }) {
  const example = examples.find((e) => e.id === id) ?? examples[0]

  React.useEffect(() => {
    example.fire(Infinity)
    return () => toast.dismiss()
  }, [example])

  return (
    <>
      <div className="-mt-40">
        <Button variant="secondary" onClick={() => example.fire()}>
          Show toast
        </Button>
      </div>
      {/* Stacked inside the stage instead of the page corner. */}
      <Toaster className="absolute right-auto bottom-[72px] left-1/2 -translate-x-1/2" />
    </>
  )
}

export default function ToastDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Toast" options={options} codeHtml={codeHtml} render={(id) => <Preview key={id} id={id} />} />
}
