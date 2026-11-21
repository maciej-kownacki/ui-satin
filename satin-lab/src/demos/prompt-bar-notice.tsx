import * as React from 'react'
import { Alert } from '@uisatin/ui/alert'
import { Banner } from '@uisatin/ui/banner'
import { Button } from '@uisatin/ui/button'
import { PromptBar } from '@uisatin/ui/prompt-bar'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { actionsWith, apps, models } from './prompt-bar-data'

// One bar per notice from Figma (4316:54633): a Banner with an action, then an info and an error Alert.
export const controls: ShowcaseControl[] = [
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
      icon={<Sparks />}
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
import { Button } from '@uisatin/ui/button'
import { Sparks } from 'iconoir-react'`
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

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: labelOfNotice(v.notice),
  code: noticeCode(v.notice),
}))

function labelOfNotice(value: string) {
  const c = controls[0]!
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

export default function PromptBarNoticeDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Prompt bar with a notice"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(id, v) => <NoticeDemo key={id} notice={v.notice!} />}
    />
  )
}
