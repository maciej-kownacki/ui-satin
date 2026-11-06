import * as React from 'react'
import { Card } from '@satin/ui/card'
import { Button } from '@satin/ui/button'
import { Checkbox } from '@satin/ui/checkbox'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

export const options: ShowcaseOption[] = [
  {
    id: 'default',
    label: 'Default',
    code: `import { Card } from '@satin/ui/card'
import { Button } from '@satin/ui/button'
import { Checkbox } from '@satin/ui/checkbox'

<Card
  title="Notifications"
  description="Choose what we email you about."
  footer={
    <>
      <Button variant="secondary">Cancel</Button>
      <Button>Save</Button>
    </>
  }
  onClose={() => setOpen(false)}
>
  <div className="flex flex-col gap-3">
    <Checkbox label="Weekly summary" defaultChecked />
    <Checkbox label="New bookings" />
  </div>
</Card>`,
  },
  {
    id: 'small',
    label: 'Small',
    code: `import { Card } from '@satin/ui/card'

<Card size="sm" title="Notifications" description="Choose what we email you about.">
  …
</Card>`,
  },
  {
    id: 'read-only',
    label: 'No footer',
    code: `import { Card } from '@satin/ui/card'

<Card title="Notifications" description="Choose what we email you about.">
  …
</Card>`,
  },
]

function Example({ id }: { id: string }) {
  const [open, setOpen] = React.useState(true)
  React.useEffect(() => setOpen(true), [id])
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Show card
      </Button>
    )
  return (
    <Card
      size={id === 'small' ? 'sm' : 'md'}
      title="Notifications"
      description="Choose what we email you about."
      footer={
        id === 'read-only' ? undefined : (
          <>
            <Button variant="secondary">Cancel</Button>
            <Button>Save</Button>
          </>
        )
      }
      onClose={id === 'default' ? () => setOpen(false) : undefined}
    >
      <div className="flex flex-col gap-3">
        <Checkbox label="Weekly summary" defaultChecked />
        <Checkbox label="New bookings" />
      </div>
    </Card>
  )
}

export default function CardDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Card" options={options} codeHtml={codeHtml} render={(id) => <Example id={id} />} />
}
