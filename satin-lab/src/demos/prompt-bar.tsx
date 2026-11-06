import * as React from 'react'
import { PromptBar, defaultActions, type PromptBarAction, type PromptBarModel } from '@satin/ui/prompt-bar'
import { Showcase, type ShowcaseOption } from '../components/Showcase'
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
const actions: PromptBarAction[] = [
  ...defaultActions,
  { id: 'gmail', label: 'Gmail', description: 'Read and manage Gmail', icon: <App src={gmail.src} /> },
  { id: 'notion', label: 'Notion', description: 'Create and manage content', icon: <App src={notion.src} /> },
  { id: 'clickup', label: 'Clickup', description: 'Manage your work', icon: <App src={clickup.src} /> },
  { id: 'wintermute', label: 'Wintermute', description: 'Orchestrate agents', icon: <App src={wintermute.src} /> },
]

/** Sample files, so the attachments option shows the three chip types from Figma. */
const sampleFiles = () =>
  ['Deal_Acme.pdf', 'Contract_draft.docx', 'Q3_costs.xlsx'].map((name) => new File([''], name))

const code = (shape: 'pill' | 'default', withFiles = false) => `import { PromptBar, defaultActions } from '@satin/ui/prompt-bar'

<PromptBar
  shape="${shape}"
  actions={[
    ...defaultActions,
    { id: 'gmail', label: 'Gmail', description: 'Read and manage Gmail', icon: <GmailLogo /> },
    { id: 'notion', label: 'Notion', description: 'Create and manage content', icon: <NotionLogo /> },
  ]}
  models={[
    { value: 'opus-5.5', label: 'Opus 5.5', icon: <ModelMark /> },
    { value: 'sonnet-5.5', label: 'Sonnet 5.5', icon: <ModelMark /> },
    { value: 'haiku-4.5', label: 'Haiku 4.5', icon: <ModelMark /> },
  ]}${withFiles ? `
  attachments={files}
  onAttachmentsChange={setFiles}` : ''}
  onSubmit={(message, files) => send(message, files)}
/>`

export const options: ShowcaseOption[] = [
  { id: 'pill', label: 'Pill', code: code('pill') },
  { id: 'default', label: 'Default', code: code('default') },
  { id: 'attachments', label: 'Attachments', code: code('pill', true) },
]

function Demo({ shape, withFiles }: { shape: 'pill' | 'default'; withFiles?: boolean }) {
  const [sent, setSent] = React.useState<string | null>(null)
  const [files, setFiles] = React.useState<File[]>(() => (withFiles ? sampleFiles() : []))
  return (
    <div className="grid w-[min(600px,calc(100vw-80px))] gap-3">
      <p aria-live="polite" className="min-h-5 text-center text-sm text-text-muted">
        {sent ?? 'Type a message and press Enter. + and the model open their menus.'}
      </p>
      <PromptBar
        shape={shape}
        models={models}
        actions={actions}
        attachments={files}
        onAttachmentsChange={setFiles}
        onSubmit={(message, attached) =>
          setSent(`Sent: “${message || '(no text)'}”${attached.length ? ` with ${attached.length} file(s)` : ''}`)
        }
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
      render={(id) => (
        <Demo key={id} shape={id === 'default' ? 'default' : 'pill'} withFiles={id === 'attachments'} />
      )}
    />
  )
}
