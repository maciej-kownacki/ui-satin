import { Calendar, Mail, Notes, Page, Suitcase } from 'iconoir-react'
import { Avatar } from '@uisatin/ui/avatar'
import { defaultActions, type PromptBarAction, type PromptBarModel } from '@uisatin/ui/prompt-bar'
import type { PromptCommand, PromptMention } from '@uisatin/ui/prompt-mentions'
import modelMark from './assets/model-mark.png'
import gmail from './assets/app-gmail.png'
import notion from './assets/app-notion.png'
import clickup from './assets/app-clickup.png'
import wintermute from './assets/app-wintermute.png'

/* What the Prompt bar and the Mentions and commands demos share, so both show the same bar. */

const Mark = () => <img src={modelMark.src} alt="" className="size-full object-cover" />

export const models: PromptBarModel[] = [
  { value: 'opus-5.5', label: 'Opus 5.5', icon: <Mark /> },
  { value: 'sonnet-5.5', label: 'Sonnet 5.5', icon: <Mark /> },
  { value: 'haiku-4.5', label: 'Haiku 4.5', icon: <Mark /> },
]

const App = ({ src }: { src: string }) => <img src={src} alt="" className="size-4 shrink-0" />

/** The + menu as in Figma: the two built-in rows, then apps the user can connect. */
export const apps: PromptBarAction[] = [
  ...defaultActions,
  { id: 'gmail', label: 'Gmail', description: 'Read and manage Gmail', icon: <App src={gmail.src} /> },
  { id: 'notion', label: 'Notion', description: 'Create and manage content', icon: <App src={notion.src} /> },
  { id: 'clickup', label: 'Clickup', description: 'Manage your work', icon: <App src={clickup.src} /> },
  { id: 'wintermute', label: 'Wintermute', description: 'Orchestrate agents', icon: <App src={wintermute.src} /> },
]

/** Sample files, so the attachments switch shows the three chip types from Figma. */
export const sampleFiles = () => ['Deal_Acme.pdf', 'Contract_draft.docx', 'Q3_costs.xlsx'].map((name) => new File([''], name))

/** The + menu's rows, with Upload a file adding the next sample file instead of opening the file picker. */
export const actionsWith = (rows: PromptBarAction[], setFiles: (update: (files: File[]) => File[]) => void) =>
  rows.map((a) =>
    a.id === 'upload'
      ? {
          ...a,
          onSelect: () =>
            setFiles((f) => {
              const samples = sampleFiles()
              return [...f, samples[f.length % samples.length]!]
            }),
        }
      : a,
  )

/** People and records a hiring team mentions. */
export const people: PromptMention[] = [
  { id: 'tara', label: 'Tara Mendes', description: 'Recruiter', icon: <Avatar initials="TM" tone="sky" size={20} aria-hidden /> },
  { id: 'tom', label: 'Tom Okafor', description: 'Engineering manager', icon: <Avatar initials="TO" tone="green" size={20} aria-hidden /> },
  { id: 'priya', label: 'Priya Nair', description: 'Candidate, Product designer', icon: <Avatar initials="PN" tone="amber" size={20} aria-hidden /> },
  { id: 'leo', label: 'Leo Martins', description: 'Hiring manager', icon: <Avatar initials="LM" tone="plum" size={20} aria-hidden /> },
]
const records: PromptMention[] = [
  { id: 'role-114', label: 'Product designer role', description: 'Opening', icon: <Suitcase /> },
  { id: 'scorecard', label: 'Interview scorecard', description: 'Document', icon: <Page /> },
]

/** `mentions.search`: people and records whose name or role has the query in it. */
export const search = (query: string) => {
  const q = query.toLowerCase()
  return [...people, ...records].filter((m) => `${m.label} ${m.description}`.toLowerCase().includes(q)).slice(0, 5)
}

/** The commands; `schedule` gets `run` when the demo shows what it was given. */
export const commandsWith = (schedule?: PromptCommand['run']): PromptCommand[] => [
  { name: 'schedule', description: 'Find a time and send an invite', icon: <Calendar />, ...(schedule && { run: schedule }) },
  { name: 'summarize', description: 'Sum up a thread or a record', icon: <Notes /> },
  { name: 'draft', description: 'Write an email for you to send', icon: <Mail /> },
]
