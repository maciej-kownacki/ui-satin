import * as React from 'react'
import { Combobox } from '@satin/ui/combobox'
import { Book, Bug, Flash, Palette, Rocket, Server, Shield, Wallet } from 'iconoir-react'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// Issue labels: long enough to want a search, short enough to pick several.
const labels = [
  { value: 'bug', label: 'Bug', description: 'Something is broken', Icon: Bug, icon: 'Bug' },
  { value: 'feature', label: 'Feature', description: 'New behaviour', Icon: Rocket, icon: 'Rocket' },
  { value: 'design', label: 'Design', description: 'Look and feel', Icon: Palette, icon: 'Palette' },
  { value: 'docs', label: 'Docs', description: 'Guides and reference', Icon: Book, icon: 'Book' },
  { value: 'performance', label: 'Performance', description: 'Speed and memory', Icon: Flash, icon: 'Flash' },
  { value: 'security', label: 'Security', description: 'Access and data', Icon: Shield, icon: 'Shield' },
  { value: 'infra', label: 'Infrastructure', description: 'Servers and deploys', Icon: Server, icon: 'Server' },
  { value: 'billing', label: 'Billing', description: 'Plans and invoices', Icon: Wallet, icon: 'Wallet' },
]
const label = 'Labels'
const hint = 'Teams filter their boards by these.'

// How picks work first, then the field, then what every option carries.
export const controls: ShowcaseControl[] = [
  { id: 'multiple', label: 'Multiple', type: 'switch', default: 'off' },
  { id: 'footer', label: 'Footer', type: 'switch', default: 'off' },
  { id: 'field', label: 'Label & hint', type: 'switch', default: 'on' },
  { id: 'leading', label: 'Leading icon', type: 'switch', default: 'on' },
  { id: 'description', label: 'Description', type: 'switch', default: 'off' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'
const start = (v: Record<string, string>) => (on(v, 'multiple') ? ['bug', 'design', 'docs'] : ['bug'])

const optionsFor = (v: Record<string, string>) =>
  labels.map((o) => ({
    value: o.value,
    label: o.label,
    icon: on(v, 'leading') ? <o.Icon /> : undefined,
    description: on(v, 'description') ? o.description : undefined,
  }))

function code(v: Record<string, string>) {
  const attrs = [
    on(v, 'multiple') && 'multiple',
    on(v, 'footer') && 'footer',
    on(v, 'field') ? `label="${label}"` : `aria-label="${label}"`,
    on(v, 'field') && `hint="${hint}"`,
    'placeholder="Add labels"',
    'searchPlaceholder="Search labels…"',
    `defaultValue={[${start(v).map((x) => `'${x}'`).join(', ')}]}`,
    'options={labels}',
    'onValueChange={(picked) => save(picked)}',
  ].filter(Boolean)
  return `import { Combobox } from '@satin/ui/combobox'
${on(v, 'leading') ? `import { ${labels.map((l) => l.icon).sort().join(', ')} } from 'iconoir-react'\n` : ''}
const labels = [
${labels.map((l) => `  { value: '${l.value}', label: '${l.label}'${on(v, 'leading') ? `, icon: <${l.icon} />` : ''}${on(v, 'description') ? `, description: '${l.description}'` : ''} },`).join('\n')}
]

${on(v, 'footer') ? '// Picks wait for Apply, which stays disabled until something is picked.' : on(v, 'multiple') ? '// Each pick shows as a chip; Clear appears on the label line once there are two.' : '// A pick fills the field, with its icon, and closes the list.'}
<Combobox
${attrs.map((a) => `  ${a}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    on(v, 'multiple') ? 'Multiple' : 'Single',
    on(v, 'footer') ? 'Footer' : 'No footer',
    on(v, 'field') ? 'Label & hint' : 'No label',
    on(v, 'leading') ? 'Leading icon' : 'No leading icon',
    on(v, 'description') ? 'Description' : 'No description',
  ].join(' · '),
  code: code(v),
}))

/**
 * Open on load inside the stage, without taking focus from the page. Props change in place, so
 * the list stays open and nothing flashes; only Multiple starts over, with its own picks. The
 * field keeps its place: without a label, an empty line holds the label's room.
 */
function Preview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(true)
  const openedOnce = React.useRef(false)
  return (
    <div className="relative flex h-[400px] w-72 max-w-full flex-col pt-6">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {!on(v, 'field') && <div aria-hidden className="h-[26px] shrink-0" />}
      {stage && (
        <Combobox
          key={v.multiple}
          container={stage}
          open={open}
          onOpenChange={setOpen}
          onOpenAutoFocus={(e) => {
            if (!openedOnce.current) e.preventDefault()
            openedOnce.current = true
          }}
          // Changing a prop in the bar under the stage keeps the list open.
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement | null)?.closest('[data-showcase-controls]')) e.preventDefault()
          }}
          multiple={on(v, 'multiple')}
          footer={on(v, 'footer')}
          label={on(v, 'field') ? label : undefined}
          aria-label={on(v, 'field') ? undefined : label}
          hint={on(v, 'field') ? hint : undefined}
          placeholder="Add labels"
          searchPlaceholder="Search labels…"
          defaultValue={start(v)}
          options={optionsFor(v)}
        />
      )}
    </div>
  )
}

export default function ComboboxDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Combobox" options={options} codeHtml={codeHtml} controls={controls} render={(_, v) => <Preview v={v} />} />
}
