import * as React from 'react'
import { Alert } from '@uisatin/ui/alert'
import { Banner } from '@uisatin/ui/banner'
import { Button } from '@uisatin/ui/button'
import { PromptBar, defaultActions } from '@uisatin/ui/prompt-bar'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { actionsWith, apps, commandsWith, models, sampleFiles, search } from './prompt-bar-data'

const draft = 'Summarize the Acme deal for Friday'
const commands = commandsWith()

// Shape sets the bar, the switches fill its menus and chips and turn on @ and /, and state comes
// last: inactive is the empty bar, active has text to send (the border goes strong), disabled
// turns it all off.
export const controls: ShowcaseControl[] = [
  { id: 'shape', label: 'Shape', items: [{ value: 'pill', label: 'Pill' }, { value: 'default', label: 'Default' }] },
  { id: 'models', label: 'Models', type: 'switch', default: 'on' },
  { id: 'apps', label: 'Apps', type: 'switch', default: 'on' },
  { id: 'attachments', label: 'Attachments', type: 'switch', default: 'off' },
  { id: 'mentions', label: '@ and /', type: 'switch', default: 'on' },
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
    // @ and /: see Mentions and commands.
    v.mentions === 'on' && 'mentions={{ search: (query) => findPeople(query) }}',
    v.mentions === 'on' &&
      `commands={[
    { name: 'schedule', description: 'Find a time and send an invite', icon: <Calendar /> },
    { name: 'summarize', description: 'Sum up a thread or a record', icon: <Notes /> },
  ]}`,
    v.state === 'disabled' && 'disabled',
    v.mentions === 'on'
      ? 'onSubmit={(message, files, { mentions, command }) => send(message, files, mentions, command)}'
      : 'onSubmit={(message, files) => send(message, files)}',
  ].filter(Boolean)
  return `import { PromptBar${v.apps === 'on' ? ', defaultActions' : ''} } from '@uisatin/ui/prompt-bar'

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
    v.mentions === 'on' ? '@ and /' : 'No @ and /',
    labelOf('state', v.state),
  ].join(' · '),
  code: code(v),
}))

function Demo({ v }: { v: Record<string, string> }) {
  const [files, setFiles] = React.useState<File[]>(() => (v.attachments === 'on' ? sampleFiles() : []))
  const on = v.mentions === 'on'
  return (
    <div className="w-[min(600px,calc(100vw-80px))]">
      <PromptBar
        shape={v.shape as 'pill' | 'default'}
        defaultValue={v.state === 'active' ? draft : undefined}
        models={v.models === 'on' ? models : undefined}
        actions={actionsWith(v.apps === 'on' ? apps : defaultActions, setFiles)}
        attachments={files}
        onAttachmentsChange={setFiles}
        mentions={on ? { search } : undefined}
        commands={on ? commands : undefined}
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

/* ---------- notice ---------- */

// One bar per notice from Figma (4316:54633): a Banner with an action, then an info and an error Alert.
export const noticeControls: ShowcaseControl[] = [
  {
    id: 'notice',
    label: 'Notice',
    items: [
      { value: 'banner', label: 'Banner' },
      { value: 'info', label: 'Info alert' },
      { value: 'error', label: 'Error alert' },
    ],
  },
]

const noticeText = {
  info: 'You can launch your agents anywhere in the app',
  error: 'Agents will be unavailable overnight on 23.11.2026',
}

function noticeCode(notice: string) {
  const element =
    notice === 'banner'
      ? `<Banner
      layout="inline"
      icon={<ModelMark />}
      title="Fable 5.2 available"
      action={<Button variant="secondary">Relaunch</Button>}
      onDismiss={() => setNotice(false)}
    />`
      : `<Alert
      layout="inline"
      intent="${notice}"
      title="${noticeText[notice as 'info' | 'error']}"
      onDismiss={() => setNotice(false)}
    />`
  const imports =
    notice === 'banner'
      ? `import { Banner } from '@uisatin/ui/banner'
import { Button } from '@uisatin/ui/button'`
      : `import { Alert } from '@uisatin/ui/alert'`
  return `${imports}
import { PromptBar } from '@uisatin/ui/prompt-bar'

const [notice, setNotice] = React.useState(true)

<PromptBar
  notice={
    notice && ${element}
  }
  models={models}
  onSubmit={(message, files) => send(message, files)}
/>`
}

export const noticeOptions: ShowcaseOption[] = combos(noticeControls).map((v) => ({
  id: comboId(noticeControls, v),
  label: labelOfNotice(v.notice),
  code: noticeCode(v.notice),
}))

function labelOfNotice(value: string) {
  const c = noticeControls[0]!
  return ('items' in c && c.items.find((i) => i.value === value)?.label) || value
}

function NoticeDemo({ notice }: { notice: string }) {
  const [shown, setShown] = React.useState(true)
  const [files, setFiles] = React.useState<File[]>([])
  const dismiss = () => setShown(false)
  const element =
    notice === 'banner' ? (
      <Banner
        layout="inline"
        icon={models[0]!.icon}
        title="Fable 5.2 available"
        action={<Button variant="secondary">Relaunch</Button>}
        onDismiss={dismiss}
      />
    ) : (
      <Alert layout="inline" intent={notice as 'info' | 'error'} title={noticeText[notice as 'info' | 'error']} onDismiss={dismiss} />
    )
  return (
    <div className="w-[min(600px,calc(100vw-80px))]">
      <PromptBar
        notice={shown && element}
        models={models}
        actions={actionsWith(apps, setFiles)}
        attachments={files}
        onAttachmentsChange={setFiles}
      />
    </div>
  )
}

export function PromptBarNoticeDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Prompt bar with a notice"
      options={noticeOptions}
      codeHtml={codeHtml}
      controls={noticeControls}
      render={(id, v) => <NoticeDemo key={id} notice={v.notice!} />}
    />
  )
}
