import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { Input } from '@uisatin/ui/input'
import { Sheet, SheetClose } from '@uisatin/ui/sheet'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

export const controls: ShowcaseControl[] = [
  { id: 'side', label: 'Side', default: 'right', items: [{ value: 'right', label: 'Right' }, { value: 'left', label: 'Left' }, { value: 'bottom', label: 'Bottom' }] },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'footer', label: 'Footer', type: 'switch', default: 'on' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const attrs = [
    v.side !== 'right' && `side="${v.side}"`,
    'trigger={<Button variant="secondary">Edit profile</Button>}',
    'title="Edit profile"',
    on(v, 'description') && 'description="Changes save when you press Save."',
  ].filter(Boolean)
  const footer = on(v, 'footer')
    ? `\n  footer={\n    <>\n      <SheetClose asChild>\n        <Button variant="secondary">Cancel</Button>\n      </SheetClose>\n      <Button>Save</Button>\n    </>\n  }`
    : ''
  return `import { Button } from '@uisatin/ui/button'
import { Input } from '@uisatin/ui/input'
import { Sheet${on(v, 'footer') ? ', SheetClose' : ''} } from '@uisatin/ui/sheet'

<Sheet
${attrs.map((a) => `  ${a}`).join('\n')}${footer}
>
  <div className="flex flex-col gap-4">
    <Input label="Name" defaultValue="Maja Nowak" />
    <Input label="Username" defaultValue="maja" />
  </div>
</Sheet>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [{ right: 'Right', left: 'Left', bottom: 'Bottom' }[v.side], on(v, 'description') ? 'Description' : 'No description', on(v, 'footer') ? 'Footer' : 'No footer'].join(' · '),
  code: code(v),
}))

/**
 * The sheet slides in at the stage's own edges (the wrapper cancels the stage padding), not the
 * page's. It stays open while the properties change: a press outside the stage (the controls, the
 * rest of the page) doesn't close it, and changing a property opens it again if it was closed with
 * Cancel, the close button or Escape. Changing the side remounts it, so it slides in from the new edge.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const openedOnce = React.useRef(false)
  const [open, setOpen] = React.useState(true)
  const boxRef = React.useRef<HTMLDivElement>(null)

  // Where the last press landed: outside the preview it is the docs page, not the sheet's own page.
  const pressedOutside = React.useRef(false)
  React.useEffect(() => {
    const onDown = (e: PointerEvent) => {
      pressedOutside.current = !boxRef.current?.contains(e.target as Node)
    }
    // A key (Escape) is the sheet's own close, whatever was pressed before it.
    const onKey = () => {
      pressedOutside.current = false
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [])

  // A new property shows the sheet again.
  React.useEffect(() => setOpen(true), [v.description, v.footer])
  return (
    <div ref={boxRef} className="relative -mx-10 -my-6 grid h-[528px] min-w-0 flex-1 place-items-center self-stretch">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 overflow-hidden *:pointer-events-auto" />
      {stage && (
        <Sheet
          container={stage}
          open={open}
          onOpenChange={(next) => {
            if (!next && pressedOutside.current) return
            setOpen(next)
          }}
          modal={false}
          onOpenAutoFocus={(e) => {
            if (!openedOnce.current) e.preventDefault()
            openedOnce.current = true
          }}
          side={v.side as 'right' | 'left' | 'bottom'}
          trigger={<Button variant="secondary">Edit profile</Button>}
          title="Edit profile"
          description={on(v, 'description') ? 'Changes save when you press Save.' : undefined}
          footer={
            on(v, 'footer') ? (
              <>
                <SheetClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </SheetClose>
                <Button>Save</Button>
              </>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-4">
            <Input label="Name" defaultValue="Maja Nowak" />
            <Input label="Username" defaultValue="maja" />
          </div>
        </Sheet>
      )}
    </div>
  )
}

export default function SheetDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Sheet" options={options} codeHtml={codeHtml} controls={controls} render={(_, v) => <Preview key={v.side} v={v} />} />
}
