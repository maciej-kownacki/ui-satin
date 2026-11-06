import * as React from 'react'
import { Button } from '@satin/ui'
import { Popover, PopoverClose } from '@satin/ui/popover'
import { ShareIos, Trash } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

const code = {
  default: `import { Button } from '@satin/ui/button'
import { Popover } from '@satin/ui/popover'

<Popover title="Share link" description="Anyone with the link can view.">
  <Button variant="secondary">Share</Button>
</Popover>`,
  content: `import { Button } from '@satin/ui/button'
import { Popover, PopoverClose } from '@satin/ui/popover'

<Popover
  title="Delete 3 files?"
  description="This can’t be undone."
  body={
    <div className="flex items-center gap-2">
      <PopoverClose asChild><Button variant="secondary">Cancel</Button></PopoverClose>
      <Button variant="destructive">Delete</Button>
    </div>
  }
>
  <Button variant="secondary">Delete</Button>
</Popover>`,
}

export const options: ShowcaseOption[] = [
  { id: 'default', label: 'Title and description', code: code.default },
  { id: 'content', label: 'With content', code: code.content },
]

/** Opens on load, 8px under its trigger, portalled into the stage. */
function Preview({ id }: { id: string }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const shared = {
    container: stage,
    defaultOpen: true,
    onOpenAutoFocus: (e: Event) => e.preventDefault(),
  }

  return (
    <div className="flex h-[150px] w-[320px] items-start">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10" />
      {stage && id === 'default' && (
        <Popover {...shared} title="Share link" description="Anyone with the link can view.">
          <Button variant="secondary">
            <ShareIos />
            Share
          </Button>
        </Popover>
      )}
      {stage && id === 'content' && (
        <Popover
          {...shared}
          title="Delete 3 files?"
          description="This can’t be undone."
          body={
            <div className="flex items-center gap-2">
              <PopoverClose asChild>
                <Button variant="secondary">Cancel</Button>
              </PopoverClose>
              <Button variant="destructive">Delete</Button>
            </div>
          }
        >
          <Button variant="secondary">
            <Trash />
            Delete
          </Button>
        </Popover>
      )}
    </div>
  )
}

export default function PopoverDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Popover" options={options} codeHtml={codeHtml} render={(id) => <Preview key={id} id={id} />} />
}
