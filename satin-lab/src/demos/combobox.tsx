import * as React from 'react'
import { Combobox } from '@uisatin/ui/combobox'
import type { SelectOption } from '@uisatin/ui/select'
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
  return `import { Combobox } from '@uisatin/ui/combobox'
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

/*
 * Creatable: a recruiter tags a candidate's skills and adds one the list doesn't have. The stage
 * opens with "Framer Motion" already typed, so the create row is the first thing it shows.
 */
const skills: SelectOption[] = [
  { value: 'react', label: 'React' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'figma', label: 'Figma' },
  { value: 'framer', label: 'Framer' },
  { value: 'motion-design', label: 'Motion design' },
  { value: 'prototyping', label: 'Prototyping' },
  { value: 'design-systems', label: 'Design systems' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'user-research', label: 'User research' },
]
const skillHint = 'Type a skill we don’t list to add it.'
const typedSkill = 'Framer Motion'

export const creatableControls: ShowcaseControl[] = [
  { id: 'multiple', label: 'Multiple', type: 'switch', default: 'on' },
  { id: 'footer', label: 'Footer', type: 'switch', default: 'off' },
  {
    id: 'result',
    label: 'onCreate',
    items: [
      { value: 'resolves', label: 'Resolves' },
      { value: 'rejects', label: 'Rejects' },
    ],
  },
  { id: 'rowLabel', label: 'Row label', type: 'switch', default: 'off' },
]

const startSkills = (v: Record<string, string>) => (on(v, 'multiple') ? ['react', 'typescript'] : [])

function creatableCode(v: Record<string, string>) {
  const attrs = [
    on(v, 'multiple') && 'multiple',
    on(v, 'footer') && 'footer',
    'label="Skills"',
    `hint="${skillHint}"`,
    'placeholder="Add skills"',
    'searchPlaceholder="Search skills…"',
    on(v, 'multiple') && `defaultValue={[${startSkills(v).map((x) => `'${x}'`).join(', ')}]}`,
    'options={skills}',
    on(v, 'rowLabel') ? 'creatable={{ label: (name) => `Add skill “${name}”` }}' : 'creatable',
    'onCreate={createSkill}',
    'onValueChange={(picked) => save(picked)}',
  ].filter(Boolean)
  const note =
    v.result === 'rejects'
      ? '// When createSkill rejects, the row says it couldn’t, and picking it again retries.'
      : on(v, 'footer')
        ? '// The new skill is picked and waits for Apply with the rest.'
        : on(v, 'multiple')
          ? '// The new skill is picked: a chip in the field, a checked row in the list.'
          : '// The new skill fills the field and the list closes.'
  return `import { Combobox } from '@uisatin/ui/combobox'

const skills = [
${skills.map((s) => `  { value: '${s.value}', label: '${s.label}' },`).join('\n')}
]

// Saves the skill and answers with its option; the row shows a spinner meanwhile.
async function createSkill(name: string) {
  const skill = await api.skills.create({ name })
  return { value: skill.id, label: skill.name }
}

${note}
<Combobox
${attrs.map((a) => `  ${a}`).join('\n')}
/>`
}

export const creatableOptions: ShowcaseOption[] = combos(creatableControls).map((v) => ({
  id: comboId(creatableControls, v),
  label: [
    on(v, 'multiple') ? 'Multiple' : 'Single',
    on(v, 'footer') ? 'Footer' : 'No footer',
    v.result === 'rejects' ? 'onCreate rejects' : 'onCreate resolves',
    on(v, 'rowLabel') ? 'Own row label' : 'Default row label',
  ].join(' · '),
  code: creatableCode(v),
}))

/** Stands in for the app's request: a second on the way, then the skill or an error. */
const createSkill = (name: string, fail: boolean) =>
  new Promise<SelectOption>((resolve, reject) =>
    setTimeout(
      () => (fail ? reject(new Error('The skills service is offline')) : resolve({ value: name.toLowerCase().replace(/\s+/g, '-'), label: name })),
      1000,
    ),
  )

/** Types into a React field the way a person does, so its onChange runs. */
function typeInto(input: HTMLInputElement, text: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, text)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * One run of the scenario. Any prop change starts it over (the stage keys it), open, with the
 * skill typed and focus left where it was.
 */
function CreatableField({ v, stage }: { v: Record<string, string>; stage: HTMLElement }) {
  const [open, setOpen] = React.useState(true)
  const typed = React.useRef(false)
  return (
    <Combobox
      container={stage}
      open={open}
      onOpenChange={setOpen}
      onOpenAutoFocus={(e) => {
        if (typed.current) return
        typed.current = true
        e.preventDefault()
        const input = (e.target as HTMLElement).querySelector('input')
        if (input) typeInto(input, typedSkill)
      }}
      onInteractOutside={(e) => {
        if ((e.target as HTMLElement | null)?.closest('[data-showcase-controls]')) e.preventDefault()
      }}
      multiple={on(v, 'multiple')}
      footer={on(v, 'footer')}
      label="Skills"
      hint={skillHint}
      placeholder="Add skills"
      searchPlaceholder="Search skills…"
      defaultValue={startSkills(v)}
      options={skills}
      creatable={on(v, 'rowLabel') ? { label: (name) => `Add skill “${name}”` } : true}
      onCreate={(name) => createSkill(name, v.result === 'rejects')}
    />
  )
}

function CreatablePreview({ v }: { v: Record<string, string> }) {
  const [stage, setStage] = React.useState<HTMLDivElement | null>(null)
  return (
    <div className="relative flex h-[400px] w-72 max-w-full flex-col pt-6">
      <div ref={setStage} className="pointer-events-none absolute inset-0 z-10 *:pointer-events-auto" />
      {stage && <CreatableField key={comboId(creatableControls, v)} v={v} stage={stage} />}
    </div>
  )
}

export function ComboboxCreatableDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Creatable combobox"
      options={creatableOptions}
      codeHtml={codeHtml}
      controls={creatableControls}
      render={(_, v) => <CreatablePreview v={v} />}
    />
  )
}
