import * as React from 'react'
import { PromptBar, defaultActions, type PromptBarAction, type PromptBarModel } from '@satin/ui/prompt-bar'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import modelMark from './assets/model-mark.png'
import gmail from './assets/app-gmail.png'
import notion from './assets/app-notion.png'
import clickup from './assets/app-clickup.png'
import wintermute from './assets/app-wintermute.png'

const Mark = () => <img src={modelMark.src} alt="" className="size-full object-cover" />

const models: PromptBarModel[] = [
  { value: 'opus-5.5', label: 'Opus 5.5', icon: <Mark /> },
  { value: 'sonnet-5.5', label: 'Sonnet 5.5', icon: <Mark /> },
  { value: 'haiku-4.5', label: 'Haiku 4.5', icon: <Mark /> },
]

const App = ({ src }: { src: string }) => <img src={src} alt="" className="size-4 shrink-0" />

/** The + menu as in Figma: the two built-in rows, then apps the user can connect. */
const apps: PromptBarAction[] = [
  ...defaultActions,
  { id: 'gmail', label: 'Gmail', description: 'Read and manage Gmail', icon: <App src={gmail.src} /> },
  { id: 'notion', label: 'Notion', description: 'Create and manage content', icon: <App src={notion.src} /> },
  { id: 'clickup', label: 'Clickup', description: 'Manage your work', icon: <App src={clickup.src} /> },
  { id: 'wintermute', label: 'Wintermute', description: 'Orchestrate agents', icon: <App src={wintermute.src} /> },
]

/** Sample files, so the attachments switch shows the three chip types from Figma. */
const sampleFiles = () =>
  ['Deal_Acme.pdf', 'Contract_draft.docx', 'Q3_costs.xlsx'].map((name) => new File([''], name))

const draft = 'Summarize the Acme deal for Friday'

// Shape sets the bar, the switches fill its menus and chips, and state comes last: inactive is
// the empty bar, active has text to send (the border goes strong), disabled turns it all off.
export const controls: ShowcaseControl[] = [
  { id: 'shape', label: 'Shape', items: [{ value: 'pill', label: 'Pill' }, { value: 'default', label: 'Default' }] },
  { id: 'models', label: 'Models', type: 'switch', default: 'on' },
  { id: 'apps', label: 'Apps', type: 'switch', default: 'on' },
  { id: 'attachments', label: 'Attachments', type: 'switch', default: 'off' },
  {
    id: 'state',
    label: 'State',
    items: [
      { value: 'inactive', label: 'Inactive' },
      { value: 'active', label: 'Active' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

function code(v: Record<string, string>) {
  const props = [
    v.shape !== 'pill' && `shape="${v.shape}"`,
    v.state === 'active' && `defaultValue="${draft}"`,
    v.apps === 'on' &&
      `actions={[
    ...defaultActions,
    { id: 'gmail', label: 'Gmail', description: 'Read and manage Gmail', icon: <GmailLogo /> },
    { id: 'notion', label: 'Notion', description: 'Create and manage content', icon: <NotionLogo /> },
  ]}`,
    v.models === 'on' &&
      `models={[
    { value: 'opus-5.5', label: 'Opus 5.5', icon: <ModelMark /> },
    { value: 'sonnet-5.5', label: 'Sonnet 5.5', icon: <ModelMark /> },
    { value: 'haiku-4.5', label: 'Haiku 4.5', icon: <ModelMark /> },
  ]}`,
    v.attachments === 'on' && 'attachments={files}',
    v.attachments === 'on' && 'onAttachmentsChange={setFiles}',
    v.state === 'disabled' && 'disabled',
    'onSubmit={(message, files) => send(message, files)}',
  ].filter(Boolean)
  return `import { PromptBar${v.apps === 'on' ? ', defaultActions' : ''} } from '@satin/ui/prompt-bar'

<PromptBar
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('shape', v.shape),
    v.models === 'on' ? 'Models' : 'No models',
    v.apps === 'on' ? 'Apps' : 'No apps',
    v.attachments === 'on' ? 'Attachments' : 'No attachments',
    labelOf('state', v.state),
  ].join(' · '),
  code: code(v),
}))

function Demo({ v }: { v: Record<string, string> }) {
  const [files, setFiles] = React.useState<File[]>(() => (v.attachments === 'on' ? sampleFiles() : []))
  // Upload a file adds the next sample file here instead of opening the system file picker.
  const upload = () =>
    setFiles((f) => {
      const samples = sampleFiles()
      return [...f, samples[f.length % samples.length]]
    })
  const actions = (v.apps === 'on' ? apps : defaultActions).map((a) => (a.id === 'upload' ? { ...a, onSelect: upload } : a))
  return (
    <div className="w-[min(600px,calc(100vw-80px))]">
      <PromptBar
        shape={v.shape as 'pill' | 'default'}
        defaultValue={v.state === 'active' ? draft : undefined}
        models={v.models === 'on' ? models : undefined}
        actions={actions}
        attachments={files}
        onAttachmentsChange={setFiles}
        disabled={v.state === 'disabled'}
      />
    </div>
  )
}

export default function PromptBarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Prompt bar"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      // Remount on every change, so the text and files start from what the controls say.
      render={(id, v) => <Demo key={id} v={v} />}
    />
  )
}
