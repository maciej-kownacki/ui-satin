import { Button } from '@uisatin/ui'
import { PopoverPanel } from '@uisatin/ui/popover'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Only what the panel holds, top to bottom. The trigger and where the panel opens belong
// to the page that uses it, so the stage shows the panel on its own.
export const controls: ShowcaseControl[] = [
  { id: 'description', label: 'Description', type: 'switch', default: 'on' },
  { id: 'body', label: 'Body', type: 'switch', default: 'off' },
  { id: 'close', label: 'Close', type: 'switch', default: 'on' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

const title = 'Share link'
const description = 'Anyone with the link can view.'

function code(v: Record<string, string>) {
  const props = [
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
  return `${on(v, 'body') ? "import { Button } from '@uisatin/ui/button'\n" : ''}import { Popover${on(v, 'body') ? ', PopoverClose' : ''} } from '@uisatin/ui/popover'

${open}
  {trigger}
</Popover>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    on(v, 'description') ? 'Description' : 'No description',
    on(v, 'body') ? 'Body' : 'No body',
    on(v, 'close') ? 'Close' : 'No close',
  ].join(' · '),
  code: code(v),
}))

export default function PopoverDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Popover"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <PopoverPanel
          title={title}
          description={on(v, 'description') ? description : undefined}
          body={
            on(v, 'body') ? (
              <div className="flex items-center gap-2">
                <Button variant="secondary">Cancel</Button>
                <Button>Copy link</Button>
              </div>
            ) : undefined
          }
          closeButton={on(v, 'close')}
        />
      )}
    />
  )
}
