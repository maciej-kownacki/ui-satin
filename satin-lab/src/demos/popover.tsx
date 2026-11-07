import * as React from 'react'
import { Button, cn } from '@satin/ui'
import { Popover, PopoverClose } from '@satin/ui/popover'
import { ShareIos } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Where it opens first (side, then align along that side), then what it holds.
export const controls: ShowcaseControl[] = [
  {
    id: 'side',
    label: 'Side',
    items: [
      { value: 'bottom', label: 'Bottom' },
      { value: 'top', label: 'Top' },
      { value: 'right', label: 'Right' },
      { value: 'left', label: 'Left' },
    ],
  },
  {
    id: 'align',
    label: 'Align',
    items: [
      { value: 'start', label: 'Start' },
      { value: 'center', label: 'Center' },
      { value: 'end', label: 'End' },
    ],
  },
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'body', label: 'Body', type: 'switch', default: 'off' },
  { id: 'close', label: 'Close', type: 'switch', default: 'on' },
]

const defaults: Record<string, string> = { side: 'bottom', align: 'start' }
const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}
const on = (v: Record<string, string>, id: string) => v[id] === 'on'

const title = 'Share link'
const description = 'Anyone with the link can view.'

function code(v: Record<string, string>) {
  const props = [
    ...['side', 'align'].filter((k) => v[k] !== defaults[k]).map((k) => `${k}="${v[k]}"`),
    `title="${title}"`,
    on(v, 'description') && `description="${description}"`,
    on(v, 'body') &&
      `body={
    <div className="flex items-center gap-2">
      <PopoverClose asChild><Button variant="secondary">Cancel</Button></PopoverClose>
      <Button>Copy link</Button>
    </div>
  }`,
    !on(v, 'close') && 'closeButton={false}',
  ].filter(Boolean)
  // Short prop lists stay on one line, as you'd write them.
  const open = props.length <= 2 && !on(v, 'body') ? `<Popover ${props.join(' ')}>` : `<Popover\n${props.map((p) => `  ${p}`).join('\n')}\n>`
  return `import { Button } from '@satin/ui/button'
import { Popover${on(v, 'body') ? ', PopoverClose' : ''} } from '@satin/ui/popover'
import { ShareIos } from 'iconoir-react'

${open}
  <Button variant="secondary">
    <ShareIos />
    Share
  </Button>
</Popover>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('side', v.side),
    labelOf('align', v.align),
    on(v, 'description') ? 'Description' : 'No description',
    on(v, 'body') ? 'Body' : 'No body',
    on(v, 'close') ? 'Close' : 'No close',
  ].join(' · '),
  code: code(v),
}))

// The trigger sits on the edge opposite the side, so the popover opens into the stage.
const place: Record<string, string> = {
  bottom: 'items-start justify-center',
  top: 'items-end justify-center',
  right: 'items-center justify-start',
  left: 'items-center justify-end',
}

/** Opens on load, 8px from its trigger, portalled into the stage. */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)

  return (
    <div className={cn('flex h-[260px] w-[560px] max-w-full', place[v.side])}>
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10" />
      {stage && (
        <Popover
          container={stage}
          defaultOpen
          onOpenAutoFocus={(e) => e.preventDefault()}
          side={v.side as 'bottom' | 'top' | 'right' | 'left'}
          align={v.align as 'start' | 'center' | 'end'}
          title={title}
          description={on(v, 'description') ? description : undefined}
          body={
            on(v, 'body') ? (
              <div className="flex items-center gap-2">
                <PopoverClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </PopoverClose>
                <Button>Copy link</Button>
              </div>
            ) : undefined
          }
          closeButton={on(v, 'close')}
        >
          <Button variant="secondary">
            <ShareIos />
            Share
          </Button>
        </Popover>
      )}
    </div>
  )
}

export default function PopoverDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Popover"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <Preview key={id} v={v} />}
    />
  )
}
