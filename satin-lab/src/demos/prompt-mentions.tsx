import * as React from 'react'
import { Calendar, Mail, Notes, Page, Suitcase } from 'iconoir-react'
import { Avatar } from '@uisatin/ui/avatar'
import { PromptBar } from '@uisatin/ui/prompt-bar'
import { promptValue, type PromptCommand, type PromptMention, type PromptValue } from '@uisatin/ui/prompt-mentions'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

/** People and records a hiring team mentions. */
const people: PromptMention[] = [
  { id: 'tara', label: 'Tara Mendes', description: 'Recruiter', icon: <Avatar initials="TM" tone="sky" size={20} aria-hidden /> },
  { id: 'tom', label: 'Tom Okafor', description: 'Engineering manager', icon: <Avatar initials="TO" tone="green" size={20} aria-hidden /> },
  { id: 'priya', label: 'Priya Nair', description: 'Candidate, Product designer', icon: <Avatar initials="PN" tone="amber" size={20} aria-hidden /> },
  { id: 'leo', label: 'Leo Martins', description: 'Hiring manager', icon: <Avatar initials="LM" tone="plum" size={20} aria-hidden /> },
]
const records: PromptMention[] = [
  { id: 'role-114', label: 'Product designer role', description: 'Opening', icon: <Suitcase /> },
  { id: 'scorecard', label: 'Interview scorecard', description: 'Document', icon: <Page /> },
]

const search = (query: string) => {
  const q = query.toLowerCase()
  return [...people, ...records].filter((m) => `${m.label} ${m.description}`.toLowerCase().includes(q)).slice(0, 5)
}

const tara = people[0]!
const scenario = (commands: PromptCommand[]) => promptValue([tara, ' ', commands[0]!, ' interview next week'])

// Shape as on Prompt bar, commands on or off, and whether the bar starts empty or with the
// scenario typed: "@Tara Mendes /schedule interview next week".
export const controls: ShowcaseControl[] = [
  {
    id: 'state',
    label: 'State',
    items: [
      { value: 'filled', label: 'Filled' },
      { value: 'empty', label: 'Empty' },
    ],
  },
  { id: 'shape', label: 'Shape', items: [{ value: 'pill', label: 'Pill' }, { value: 'default', label: 'Default' }] },
  { id: 'commands', label: 'Commands', type: 'switch', default: 'on' },
]

function code(v: Record<string, string>) {
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
      run: ({ args, value }) => schedule(args, value.mentions),
    },
    { name: 'summarize', description: 'Sum up a thread or a record', icon: <Notes /> },
  ]}`,
    v.state === 'filled' && (v.commands === 'on' ? 'defaultValue={promptValue([tara, \' \', schedule, \' interview next week\'])}' : 'defaultValue={promptValue([tara, \' can you call me?\'])}'),
    'onSubmit={(text, files, { mentions, command }) => send(text, mentions, command)}',
  ].filter(Boolean)
  return `import { PromptBar } from '@uisatin/ui/prompt-bar'${v.state === 'filled' ? `\nimport { promptValue } from '@uisatin/ui/prompt-mentions'` : ''}

const people = [
  { id: 'tara', label: 'Tara Mendes', description: 'Recruiter', icon: <Avatar initials="TM" tone="sky" size={20} /> },
  { id: 'tom', label: 'Tom Okafor', description: 'Engineering manager', icon: <Avatar initials="TO" tone="green" size={20} /> },
]

<PromptBar
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

const label = (v: Record<string, string>) =>
  [v.state === 'filled' ? 'Filled' : 'Empty', v.shape === 'pill' ? 'Pill' : 'Default', v.commands === 'on' ? 'Commands' : 'No commands'].join(' · ')

export const options: ShowcaseOption[] = combos(controls).map((v) => ({ id: comboId(controls, v), label: label(v), code: code(v) }))

/** What the app got from the last message: the command it ran, or the text and its mentions. */
function Received({ value }: { value: { ran?: string; args?: string; text: string; mentions: string[] } }) {
  const strong = (s: string) => <span className="font-medium text-text-default">{s}</span>
  const who = value.mentions.length ? <> with {value.mentions.map((m, i) => <React.Fragment key={m}>{i > 0 && ', '}{strong(m)}</React.Fragment>)}</> : null
  return (
    <p className="text-sm text-text-muted">
      {value.ran ? (
        <>
          Ran {strong(`/${value.ran}`)}
          {value.args ? <> for “{value.args}”</> : null}
          {who}.
        </>
      ) : (
        <>
          Sent “{value.text}”{who}.
        </>
      )}
    </p>
  )
}

function Demo({ v }: { v: Record<string, string> }) {
  const [received, setReceived] = React.useState<{ ran?: string; args?: string; text: string; mentions: string[] } | null>(null)
  const names = (value: PromptValue) => value.mentions.map((m) => m.label)
  const commands: PromptCommand[] = [
    {
      name: 'schedule',
      description: 'Find a time and send an invite',
      icon: <Calendar />,
      run: ({ args, value }) => setReceived({ ran: 'schedule', args, text: value.text, mentions: names(value) }),
    },
    { name: 'summarize', description: 'Sum up a thread or a record', icon: <Notes /> },
    { name: 'draft', description: 'Write an email for you to send', icon: <Mail /> },
  ]
  const on = v.commands === 'on'
  const start = v.state === 'filled' ? (on ? scenario(commands) : promptValue([tara, ' can you call me?'])) : undefined
  return (
    // The bar sits at the bottom, so its menu opens into the room above it, as in a chat.
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
        onSubmit={(_, __, value) =>
          setReceived({ ran: value.command?.name, args: value.command?.args, text: value.text, mentions: names(value) })
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
      // Remount on every change, so the text starts from what the controls say.
      render={(id, v) => <Demo key={id} v={v} />}
    />
  )
}
