/* Type test, never run: PromptBar's mentions and commands, its string or PromptValue value, and the hook. */
import * as React from 'react'
import { PromptBar } from '../components/prompt-bar'
import {
  promptValue,
  usePromptMentions,
  type PromptCommand,
  type PromptMention,
  type PromptMentions,
  type PromptValue,
} from '../components/prompt-mentions'

const tara: PromptMention = { id: 'tara', label: 'Tara Mendes', description: 'Recruiter' }
const schedule: PromptCommand = { name: 'schedule', description: 'Find a time', run: ({ args, value, attachments }) => [args.trim(), value.mentions[0]?.id, attachments.length] }
const sync: PromptMentions = { search: (query) => [tara].filter((p) => p.label.includes(query)) }
const async: PromptMentions = { trigger: '#', search: async () => [tara] }

// Uncontrolled, as before and with a PromptValue.
export const plain = <PromptBar defaultValue="Hello" onSubmit={(text, files) => [text.trim(), files.length]} />
export const seeded = <PromptBar mentions={sync} commands={[schedule]} defaultValue={promptValue([tara, ' ', schedule, ' interview next week'])} />

// Controlled with a string (the old API) or with the PromptValue onValueChange reports.
export function ControlledText() {
  const [text, setText] = React.useState('')
  return <PromptBar mentions={async} value={text} onValueChange={setText} />
}
export function ControlledValue() {
  const [value, setValue] = React.useState<PromptValue>({ text: '', mentions: [] })
  return (
    <PromptBar
      mentions={sync}
      commands={[schedule]}
      value={value}
      onValueChange={(_, next) => setValue(next)}
      onSubmit={(text, files, detail) => [text, files, detail.command?.args, detail.mentions.map((m) => m.start)]}
    />
  )
}

// `ref` reaches the form.
export const withRef = <PromptBar mentions={sync} ref={React.createRef<HTMLFormElement>()} />

// The hook, on a textarea of your own.
export function Own() {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = React.useState(() => promptValue(['Hi ', tara]))
  const { textareaProps, overlay, menu, open } = usePromptMentions({ textareaRef, value, onValueChange: setValue, mentions: sync })
  return (
    <div style={{ position: 'relative' }} data-open={open}>
      {overlay}
      <textarea ref={textareaRef} value={value.text} style={{ position: 'relative' }} {...textareaProps} />
      {menu}
    </div>
  )
}

// A mention needs an id and a label; a command a name; search returns mentions.
// @ts-expect-error
export const noId: PromptMention = { label: 'Tara' }
// @ts-expect-error
export const noName: PromptCommand = { description: 'Find a time' }
// @ts-expect-error
export const wrongSearch: PromptMentions = { search: () => ['Tara'] }
// The value's text is a string, not a PromptValue's parts.
// @ts-expect-error
export const wrongValue = <PromptBar value={[tara]} />
// A form ref, not a textarea's.
// @ts-expect-error
export const wrongRef = <PromptBar ref={React.createRef<HTMLTextAreaElement>()} />
