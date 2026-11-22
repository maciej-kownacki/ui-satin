import { ClipboardCheck, Notes } from 'iconoir-react'
import { Avatar } from '@uisatin/ui/avatar'
import { RichTextEditor, type RichTextCommand, type RichTextMention } from '@uisatin/pro/rich-text-editor'
import { Showcase, type ShowcaseOption } from '../components/Showcase'
import { people as promptPeople } from './prompt-bar-data'

// A recruiter writes interview feedback: @ mentions the panel (the Prompt bar demo's people and
// Marta), / scorecard adds the scorecard, a table to fill in (Tab moves between its cells).
const people: RichTextMention[] = [
  { id: 'marta', label: 'Marta Nowak', description: 'Design lead, panel', avatar: <Avatar initials="MN" tone="fuchsia" size={20} aria-hidden /> },
  ...promptPeople,
]

/** `mentions.search`, slow as an API would be, so the menu shows how it waits for the first answer. */
const search = (query: string) =>
  new Promise<RichTextMention[]>((resolve) => {
    const q = query.toLowerCase()
    setTimeout(() => resolve(people.filter((p) => `${p.label} ${p.description}`.toLowerCase().includes(q)).slice(0, 5)), 120)
  })

/** The scorecard as markdown: a GFM table with a header row, ratings and notes left empty. */
const scorecard = [
  '| Area | Rating | Notes |',
  '| --- | --- | --- |',
  '| Communication |  |  |',
  '| Craft |  |  |',
  '| Culture |  |  |',
  '| Hire |  |  |',
].join('\n')

const commands: RichTextCommand[] = [
  {
    name: 'scorecard',
    description: 'Add the interview scorecard',
    icon: <ClipboardCheck />,
    run: ({ insert }) => insert(scorecard),
  },
  {
    name: 'summary',
    description: 'Start with a summary heading',
    icon: <Notes />,
    run: ({ insert }) => insert('## Summary'),
  },
]

const feedback = `## Interview feedback: Priya Nair

**Strong** craft and *clear* writing. Ask [@Marta Nowak](mention:marta) to check the take-home.`

export const options: ShowcaseOption[] = [
  {
    id: 'default',
    label: 'Interview feedback',
    code: `import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

// @ mentions the panel, / scorecard adds the scorecard (a table:
// Tab moves between its cells). Select text with the pointer for
// the bubble, ⌘K for a link.
const scorecard = [
  '| Area | Rating | Notes |',
  '| --- | --- | --- |',
  '| Communication |  |  |',
  '| Craft |  |  |',
  '| Culture |  |  |',
  '| Hire |  |  |',
].join('\\n')

<RichTextEditor
  label="Feedback"
  hint="Shared with the hiring panel. Type @ to mention someone, / for commands."
  defaultValue={feedback}
  mentions={{ search: (query) => api.people(query) }}
  commands={[
    {
      name: 'scorecard',
      description: 'Add the interview scorecard',
      icon: <ClipboardCheck />,
      run: ({ insert }) => insert(scorecard),
    },
  ]}
  onValueChange={(markdown, { mentions }) => save(markdown, mentions)}
/>`,
  },
  {
    id: 'minimal',
    label: 'Minimal toolbar',
    code: `import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

<RichTextEditor label="Note" toolbar="minimal" placeholder="Add a note" />`,
  },
]

export default function RichTextEditorDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Rich text editor"
      options={options}
      codeHtml={codeHtml}
      render={(option) => (
        <div className="w-full max-w-[520px]">
          {option === 'minimal' ? (
            <RichTextEditor label="Note" toolbar="minimal" placeholder="Add a note" />
          ) : (
            <RichTextEditor
              label="Feedback"
              hint="Shared with the hiring panel. Type @ to mention someone, / for commands."
              defaultValue={feedback}
              mentions={{ search }}
              commands={commands}
            />
          )}
        </div>
      )}
    />
  )
}
