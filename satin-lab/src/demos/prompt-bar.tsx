import * as React from 'react'
import { PromptBar, type PromptBarModel } from '@satin/ui/prompt-bar'
import { Showcase, type ShowcaseOption } from '../components/Showcase'
import modelMark from './assets/model-mark.png'

const Mark = () => <img src={modelMark.src} alt="" className="size-full object-cover" />

const models: PromptBarModel[] = [
  { value: 'opus-5.5', label: 'Opus 5.5', icon: <Mark /> },
  { value: 'sonnet-5.5', label: 'Sonnet 5.5', icon: <Mark /> },
  { value: 'haiku-4.5', label: 'Haiku 4.5', icon: <Mark /> },
]

/** Sample files, so the attachments option shows the three chip types from Figma. */
const sampleFiles = () =>
  ['Deal_Acme.pdf', 'Contract_draft.docx', 'Q3_costs.xlsx'].map((name) => new File([''], name))

const code = (shape: 'pill' | 'default', withFiles = false) => `import { PromptBar } from '@satin/ui/prompt-bar'

<PromptBar
  shape="${shape}"
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
