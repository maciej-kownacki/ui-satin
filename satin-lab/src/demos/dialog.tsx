import * as React from 'react'
import { Button } from '@uisatin/ui'
import { Dialog, DialogAlert, DialogClose, type DialogAlertIntent } from '@uisatin/ui/dialog'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Copy = {
  trigger: string
  title: string
  description: string
  body: string
  alert: { intent: DialogAlertIntent; title: string; description: string }
  confirm: string
}

const copy: Record<'default' | 'destructive', Copy> = {
  default: {
    trigger: 'Rename workspace',
    title: 'Rename workspace',
    description: 'The new name shows for everyone.',
    body: 'You can change it again at any time.',
    alert: { intent: 'warning', title: 'Old links stop working', description: 'Update them in your docs and bookmarks.' },
    confirm: 'Save changes',
  },
  destructive: {
    trigger: 'Delete project',
    title: 'Delete project?',
    description: 'This can’t be undone.',
    body: 'All 12 files and their version history will be removed.',
    alert: { intent: 'error', title: '3 people are editing it now', description: 'They lose any unsaved changes.' },
    confirm: 'Delete project',
  },
}

// Variant changes the role, the footer and the copy; the rest are slots any dialog can fill.
export const controls: ShowcaseControl[] = [
  { id: 'variant', label: 'Variant', items: [{ value: 'default', label: 'Default' }, { value: 'destructive', label: 'Destructive' }] },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'alert', label: 'Alert', type: 'switch', default: 'off' },
  { id: 'footer', label: 'Footer', type: 'switch', default: 'on' },
  { id: 'close', label: 'Close', type: 'switch', default: 'on' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const c = copy[v.variant as keyof typeof copy]
  const destructive = v.variant === 'destructive'
  const parts = ['Dialog', on(v, 'alert') && 'DialogAlert', on(v, 'footer') && 'DialogClose'].filter(Boolean).join(', ')
  const props = [
    destructive && 'variant="destructive"',
    `trigger={<Button variant="secondary">${c.trigger}</Button>}`,
    `title="${c.title}"`,
    on(v, 'description') && `description="${c.description}"`,
    on(v, 'alert') &&
      `alert={
    <DialogAlert
      intent="${c.alert.intent}"
      title="${c.alert.title}"
      description="${c.alert.description}"
    />
  }`,
    on(v, 'footer') &&
      `footer={
    <>
      <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
      <Button${destructive ? ' variant="destructive"' : ''}>${c.confirm}</Button>
    </>
  }`,
    !on(v, 'close') && 'closeButton={false}',
  ].filter(Boolean)
  return `import { Button } from '@uisatin/ui/button'
import { ${parts} } from '@uisatin/ui/dialog'

<Dialog
${props.map((p) => `  ${p}`).join('\n')}
>
  ${c.body}
</Dialog>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.variant === 'destructive' ? 'Destructive' : 'Default',
    on(v, 'description') ? 'Description' : 'No description',
    on(v, 'alert') ? 'Alert' : 'No alert',
    on(v, 'footer') ? 'Footer' : 'No footer',
    on(v, 'close') ? 'Close' : 'No close',
  ].join(' · '),
  code: code(v),
}))

/** The dialog opens inside the stage (portal + absolute), not over the docs page or the properties. */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const openedOnce = React.useRef(false)
  const c = copy[v.variant as keyof typeof copy]
  const destructive = v.variant === 'destructive'

  return (
    <div className="relative grid h-[300px] w-[460px] max-w-full place-items-center">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10" />
      {stage && (
        <Dialog
          container={stage}
          defaultOpen
          // Inline preview: don't lock the docs page or steal focus on load. Opened again from
          // its trigger, it takes focus like any dialog.
          modal={false}
          onOpenAutoFocus={(e) => {
            if (!openedOnce.current) e.preventDefault()
            openedOnce.current = true
          }}
          variant={v.variant as 'default' | 'destructive'}
          trigger={<Button variant="secondary">{c.trigger}</Button>}
          title={c.title}
          description={on(v, 'description') ? c.description : undefined}
          alert={on(v, 'alert') ? <DialogAlert {...c.alert} /> : undefined}
          footer={
            on(v, 'footer') ? (
              <>
                <DialogClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <Button variant={destructive ? 'destructive' : 'primary'}>{c.confirm}</Button>
              </>
            ) : undefined
          }
          closeButton={on(v, 'close')}
        >
          {c.body}
        </Dialog>
      )}
    </div>
  )
}

export default function DialogDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Dialog"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Preview key={id} v={v} />}
    />
  )
}
