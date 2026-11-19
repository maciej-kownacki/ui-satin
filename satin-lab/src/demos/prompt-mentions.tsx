import * as React from 'react'
import { PromptBar } from '@uisatin/ui/prompt-bar'
import { promptValue, type PromptCommand, type PromptValue } from '@uisatin/ui/prompt-mentions'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { actionsWith, apps, commandsWith, models, people, sampleFiles, search } from './prompt-bar-data'

const tara = people[0]!
const scenario = (commands: PromptCommand[]) => promptValue([tara, ' ', commands[0]!, ' interview next week'])

// The whole Prompt bar (+ menu, models, files, dictation, send) with @ and / on. State: the
// scenario typed ("@Tara Mendes /schedule interview next week"), the empty bar, or the scenario
// in a disabled bar. Shape as on Prompt bar, commands and files on or off.
export const controls: ShowcaseControl[] = [
  {
    id: 'state',
    label: 'State',
    items: [
      { value: 'filled', label: 'Filled' },
      { value: 'empty', label: 'Empty' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
  { id: 'shape', label: 'Shape', items: [{ value: 'pill', label: 'Pill' }, { value: 'default', label: 'Default' }] },
  { id: 'commands', label: 'Commands', type: 'switch', default: 'on' },
  { id: 'attachments', label: 'Attachments', type: 'switch', default: 'off' },
]

function code(v: Record<string, string>) {
  const seeded = v.state !== 'empty'
  const props = [
    v.shape !== 'pill' && `shape="${v.shape}"`,
    `mentions={{
    // Called as the query changes ("" right after @); it can return a promise.
    search: (query) => people.filter((p) => p.label.toLowerCase().includes(query.toLowerCase())),
  }}`,
    v.commands === 'on' &&
      `commands={[
    {
      name: 'schedule',
      description: 'Find a time and send an invite',
      icon: <Calendar />,
      // "@Tara Mendes /schedule interview next week": args is "interview next week".
      run: ({ args, value, attachments }) => schedule(args, value.mentions, attachments),
    },
    { name: 'summarize', description: 'Sum up a thread or a record', icon: <Notes /> },
  ]}`,
    seeded &&
      (v.commands === 'on'
        ? "defaultValue={promptValue([tara, ' ', schedule, ' interview next week'])}"
        : "defaultValue={promptValue([tara, ' can you call me?'])}"),
    // The rest of the bar works as without them.
    'models={models}',
    'actions={actions}',
    v.attachments === 'on' && 'attachments={files}',
    v.attachments === 'on' && 'onAttachmentsChange={setFiles}',
    v.state === 'disabled' && 'disabled',
    'onSubmit={(text, files, { mentions, command }) => send(text, files, mentions, command)}',
  ].filter(Boolean)
  return `import { PromptBar } from '@uisatin/ui/prompt-bar'${seeded ? `\nimport { promptValue } from '@uisatin/ui/prompt-mentions'` : ''}

const people = [
  { id: 'tara', label: 'Tara Mendes', description: 'Recruiter', icon: <Avatar initials="TM" tone="sky" size={20} /> },
  { id: 'tom', label: 'Tom Okafor', description: 'Engineering manager', icon: <Avatar initials="TO" tone="green" size={20} /> },
]

<PromptBar
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

const label = (v: Record<string, string>) =>
  [
    { filled: 'Filled', empty: 'Empty', disabled: 'Disabled' }[v.state],
    v.shape === 'pill' ? 'Pill' : 'Default',
    v.commands === 'on' ? 'Commands' : 'No commands',
    v.attachments === 'on' ? 'Attachments' : 'No attachments',
  ].join(' · ')

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: label(v), code: code(v) }))

type Received = { ran?: string; args?: string; text: string; mentions: string[]; files: number }

/** What the app got from the last message: the command it ran, or the text, with its mentions and files. */
function Received({ value }: { value: Received }) {
  const strong = (s: string) => <span className="font-medium text-text-default">{s}</span>
  const who = value.mentions.length ? <> with {value.mentions.map((m, i) => <React.Fragment key={m}>{i > 0 && ', '}{strong(m)}</React.Fragment>)}</> : null
  const files = value.files ? <> and {strong(value.files === 1 ? '1 file' : `${value.files} files`)}</> : null
  return (
    <p className="text-sm text-text-muted">
      {value.ran ? (
        <>
          Ran {strong(`/${value.ran}`)}
          {value.args ? <> for “{value.args}”</> : null}
          {who}
          {files}.
        </>
      ) : (
        <>
          Sent {value.text ? <>“{value.text}”</> : 'the files'}
          {who}
          {value.text ? files : null}.
        </>
      )}
    </p>
  )
}

function Demo({ v }: { v: Record<string, string> }) {
  const [received, setReceived] = React.useState<Received | null>(null)
  const [files, setFiles] = React.useState<File[]>(() => (v.attachments === 'on' ? sampleFiles() : []))
  const names = (value: PromptValue) => value.mentions.map((m) => m.label)
  const commands = commandsWith(({ args, value, attachments }) =>
    setReceived({ ran: 'schedule', args, text: value.text, mentions: names(value), files: attachments.length }),
  )
  const on = v.commands === 'on'
  const start = v.state === 'empty' ? undefined : on ? scenario(commands) : promptValue([tara, ' can you call me?'])
  return (
    // The bar sits at the bottom, so its menus open into the room above it, as in a chat.
    <div className="flex h-[300px] w-[min(600px,calc(100vw-80px))] flex-col justify-end gap-3">
      <div aria-live="polite" className="min-h-5 px-1">
        {received && <Received value={received} />}
      </div>
      <PromptBar
        shape={v.shape as 'pill' | 'default'}
        placeholder={on ? 'Write a message, @ to mention, / for a command' : 'Write a message, @ to mention'}
        mentions={{ search }}
        commands={on ? commands : undefined}
        defaultValue={start}
        models={models}
        actions={actionsWith(apps, setFiles)}
        attachments={files}
        onAttachmentsChange={setFiles}
        disabled={v.state === 'disabled'}
        onSubmit={(_, sent, value) =>
          setReceived({ ran: value.command?.name, args: value.command?.args, text: value.text, mentions: names(value), files: sent.length })
        }
      />
    </div>
  )
}

export default function PromptMentionsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Mentions and commands"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      // Remount on every change, so the text and files start from what the controls say.
      render={(id, v) => <Demo key={id} v={v} />}
    />
  )
}
