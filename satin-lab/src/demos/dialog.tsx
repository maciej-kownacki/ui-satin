import * as React from 'react'
import { Button } from '@satin/ui'
import { Dialog, DialogAlert, DialogClose } from '@satin/ui/dialog'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const code = {
  default: `import { Button } from '@satin/ui/button'
import { Dialog, DialogClose } from '@satin/ui/dialog'

<Dialog
  trigger={<Button variant="secondary">Rename workspace</Button>}
  title="Rename workspace"
  description="The new name shows for everyone."
  footer={
    <>
      <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
      <Button>Save changes</Button>
    </>
  }
>
  You can change it again at any time.
</Dialog>`,
  destructive: `import { Button } from '@satin/ui/button'
import { Dialog, DialogClose } from '@satin/ui/dialog'

<Dialog
  variant="destructive"
  trigger={<Button variant="secondary">Delete project</Button>}
  title="Delete project?"
  description="This can’t be undone."
  footer={
    <>
      <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
      <Button variant="destructive">Delete project</Button>
    </>
  }
>
  All 12 files and their version history will be removed.
</Dialog>`,
  alert: `import { Button } from '@satin/ui/button'
import { Dialog, DialogAlert, DialogClose } from '@satin/ui/dialog'

<Dialog
  trigger={<Button variant="secondary">Publish</Button>}
  title="Publish changes"
  description="Your edits go live on the public site."
  alert={
    <DialogAlert
      intent="warning"
      title="Visitors see it right away"
      description="There is no review step on this site."
    />
  }
  footer={
    <>
      <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
      <Button>Publish</Button>
    </>
  }
/>`,
  plain: `import { Button } from '@satin/ui/button'
import { Dialog } from '@satin/ui/dialog'

<Dialog
  trigger={<Button variant="secondary">About this report</Button>}
  title="About this report"
  description="Updated every night at 02:00."
>
  Figures cover the last 30 days and exclude refunded orders.
</Dialog>`,
}

export const options: ShowcaseOption[] = [
  { id: 'default', label: 'Default', code: code.default },
  { id: 'destructive', label: 'Destructive', code: code.destructive },
  { id: 'alert', label: 'With alert', code: code.alert },
  { id: 'plain', label: 'Without footer', code: code.plain },
]

/** The dialog opens inside the stage (portal + absolute), not over the docs page. */
function Preview({ id }: { id: string }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const shared = {
    container: stage,
    defaultOpen: true,
    // Inline preview: don't lock the docs page or steal focus on load.
    modal: false,
    onOpenAutoFocus: (e: Event) => e.preventDefault(),
  }
  const cancel = (
    <DialogClose asChild>
      <Button variant="secondary">Cancel</Button>
    </DialogClose>
  )

  return (
    <>
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10" />
      {stage && id === 'default' && (
        <Dialog
          {...shared}
          trigger={<Button variant="secondary">Rename workspace</Button>}
          title="Rename workspace"
          description="The new name shows for everyone."
          footer={
            <>
              {cancel}
              <Button>Save changes</Button>
            </>
          }
        >
          You can change it again at any time.
        </Dialog>
      )}
      {stage && id === 'destructive' && (
        <Dialog
          {...shared}
          variant="destructive"
          trigger={<Button variant="secondary">Delete project</Button>}
          title="Delete project?"
          description="This can’t be undone."
          footer={
            <>
              {cancel}
              <Button variant="destructive">Delete project</Button>
            </>
          }
        >
          All 12 files and their version history will be removed.
        </Dialog>
      )}
      {stage && id === 'alert' && (
        <Dialog
          {...shared}
          trigger={<Button variant="secondary">Publish</Button>}
          title="Publish changes"
          description="Your edits go live on the public site."
          alert={
            <DialogAlert
              intent="warning"
              title="Visitors see it right away"
              description="There is no review step on this site."
            />
          }
          footer={
            <>
              {cancel}
              <Button>Publish</Button>
            </>
          }
        />
      )}
      {stage && id === 'plain' && (
        <Dialog
          {...shared}
          trigger={<Button variant="secondary">About this report</Button>}
          title="About this report"
          description="Updated every night at 02:00."
        >
          Figures cover the last 30 days and exclude refunded orders.
        </Dialog>
      )}
    </>
  )
}

export default function DialogDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Dialog" options={options} codeHtml={codeHtml} render={(id) => <Preview key={id} id={id} />} />
}
