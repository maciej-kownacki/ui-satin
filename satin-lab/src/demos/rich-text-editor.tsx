import * as React from 'react'
import { ChatBubble, ClipboardCheck, Notes } from 'iconoir-react'
import { createEditor } from 'lexical'
import { $convertFromMarkdownString } from '@lexical/markdown'
import { Avatar } from '@uisatin/ui/avatar'
import { Button } from '@uisatin/ui/button'
import { Dialog, DialogClose } from '@uisatin/ui/dialog'
import { Form, FormActions } from '@uisatin/ui/form'
import { FormField } from '@uisatin/ui/form-field'
import { ToolbarButton } from '@uisatin/ui/toolbar'
import {
  RICH_TEXT_NODES,
  RICH_TEXT_TRANSFORMERS,
  RichTextEditor,
  RichTextEditorContent,
  RichTextEditorRoot,
  RichTextSelectionToolbar,
  RichTextToolbar,
  type RichTextCommand,
  type RichTextMention,
} from '@uisatin/pro/rich-text-editor'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'
import { people as promptPeople } from './prompt-bar-data'

/* ---------- Interview feedback: the main demo ---------- */

// A recruiter writes interview feedback: @ mentions the panel (the Prompt bar demo's people and
// Marta), / scorecard adds the scorecard, a table to fill in (Tab moves between its cells).
const people: RichTextMention[] = [
  { id: 'marta', label: 'Marta Nowak', description: 'Design lead, panel', avatar: <Avatar initials="MN" tone="fuchsia" size={20} aria-hidden /> },
  ...promptPeople,
]

/** `mentions.search`, slow as an API would be, so the menu shows how it waits for the first answer. */
const searchIn = (list: RichTextMention[]) => (query: string) =>
  new Promise<RichTextMention[]>((resolve) => {
    const q = query.toLowerCase()
    setTimeout(() => resolve(list.filter((p) => `${p.label} ${p.description}`.toLowerCase().includes(q)).slice(0, 5)), 120)
  })
const search = searchIn(people)

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

**Strong** craft and *clear* writing. [@Marta Nowak](mention:marta) can you check the take-home before Friday?`

const hint = 'Shared with the hiring panel. Type @ to mention someone, / for commands.'
const error = 'Add a hire recommendation before you send it.'

/** Markdown as Lexical's JSON, the way `format="json"` stores it: the same nodes and transformers the editor uses. */
function toJson(markdown: string) {
  const editor = createEditor({ nodes: RICH_TEXT_NODES, onError: (e) => { throw e } })
  editor.update(() => $convertFromMarkdownString(markdown, RICH_TEXT_TRANSFORMERS), { discrete: true })
  return JSON.stringify(editor.getEditorState().toJSON())
}

// The layout first (what the field draws), then the format, then the states.
export const controls: ShowcaseControl[] = [
  {
    id: 'toolbar',
    label: 'Toolbar',
    items: [
      { value: 'default', label: 'Default' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'hidden', label: 'Hidden' },
    ],
  },
  { id: 'format', label: 'Format', items: [{ value: 'markdown', label: 'Markdown' }, { value: 'json', label: 'JSON' }] },
  { id: 'readOnly', label: 'Read-only', type: 'switch', default: 'off' },
  { id: 'disabled', label: 'Disabled', type: 'switch', default: 'off' },
  { id: 'error', label: 'Error', type: 'switch', default: 'off' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'

function code(v: Record<string, string>) {
  const json = v.format === 'json'
  const attrs = [
    'label="Feedback"',
    `hint="${hint}"`,
    on(v, 'error') && `error="${error}"`,
    v.toolbar === 'minimal' && 'toolbar="minimal"',
    v.toolbar === 'hidden' && 'toolbar={false}',
    json && 'format="json"',
    json ? 'defaultValue={savedState}' : 'defaultValue={feedback}',
    on(v, 'readOnly') && 'readOnly',
    on(v, 'disabled') && 'disabled',
    'mentions={{ search: (query) => api.people(query) }}',
    `commands={[
    {
      name: 'scorecard',
      description: 'Add the interview scorecard',
      icon: <ClipboardCheck />,
      run: ({ insert }) => insert(scorecard),
    },
  ]}`,
    `onValueChange={(${json ? 'state' : 'markdown'}, { mentions }) => save(${json ? 'state' : 'markdown'}, mentions)}`,
  ].filter(Boolean)
  return `import { ClipboardCheck } from 'iconoir-react'
import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

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
${
  json
    ? `
// With format="json" the value is Lexical's editor state as a string,
// JSON.stringify(editorState.toJSON()). Store what onValueChange sends
// and give it back as defaultValue (or value) the next time.
const savedState = loadFeedback(candidateId)
`
    : `
// A mention is a link with the mention: scheme.
const feedback = \`## Interview feedback: Priya Nair

**Strong** craft and *clear* writing. [@Marta Nowak](mention:marta) can you check the take-home before Friday?\`
`
}
<RichTextEditor
${attrs.map((a) => `  ${a}`).join('\n')}
/>`
}

const toolbarLabel: Record<string, string> = { default: 'Default toolbar', minimal: 'Minimal toolbar', hidden: 'No toolbar' }

// One option per combination, so the Code tab always shows what the stage shows.
export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    toolbarLabel[v.toolbar],
    v.format === 'json' ? 'JSON' : 'Markdown',
    on(v, 'readOnly') && 'Read-only',
    on(v, 'disabled') && 'Disabled',
    on(v, 'error') && 'Error',
  ]
    .filter(Boolean)
    .join(' · '),
  code: code(v),
}))

function FeedbackPreview({ v }: { v: Record<string, string> }) {
  const format = v.format === 'json' ? 'json' : 'markdown'
  const initial = React.useMemo(() => (format === 'json' ? toJson(feedback) : feedback), [format])
  return (
    <div className="grid w-[520px] max-w-full gap-4">
      <RichTextEditor
        label="Feedback"
        hint={hint}
        error={on(v, 'error') ? error : undefined}
        toolbar={v.toolbar === 'hidden' ? false : v.toolbar === 'minimal' ? 'minimal' : true}
        format={format}
        defaultValue={initial}
        readOnly={on(v, 'readOnly')}
        disabled={on(v, 'disabled')}
        mentions={{ search }}
        commands={commands}
      />
    </div>
  )
}

export default function RichTextEditorDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Rich text editor"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      align="top"
      // A new format starts again from the sample, written in that format.
      render={(_, v) => <FeedbackPreview key={v.format} v={v} />}
    />
  )
}

/* ---------- Other teams: sales, marketing, commerce ---------- */

const salesPeople: RichTextMention[] = [
  { id: 'dana', label: 'Dana Whitfield', description: 'Account owner, Northwind', avatar: <Avatar initials="DW" tone="sky" size={20} aria-hidden /> },
  { id: 'sam', label: 'Sam Osei', description: 'Solutions engineer', avatar: <Avatar initials="SO" tone="green" size={20} aria-hidden /> },
  { id: 'ines', label: 'Inês Costa', description: 'Sales lead', avatar: <Avatar initials="IC" tone="amber" size={20} aria-hidden /> },
]
const searchSales = searchIn(salesPeople)

const salesNote = `Good call with Northwind: they want **SSO** and the *annual* plan before the renewal on December 12.

- Send the security questionnaire
- Book a pricing review

[@Dana Whitfield](mention:dana) you own the account, can you take the pricing review?`

const brief = `# Spring launch: Ridge trail shoe

## Goal

Grow first orders from trail runners by **20%** in six weeks.

## Channels

1. Newsletter, March 4
2. Instagram reels with the run club
3. A store-window takeover in Denver

## Assets

The photos and the launch deck are in the [campaign folder](https://example.com/campaigns/spring-ridge).`

// What a paste from Google Docs leaves: bold, italic, the list and the link; its underline is gone.
const productDescription = `**Ridge trail shoe.** A light trail shoe with a *rock plate* and a sticky outsole for wet roots and loose gravel.

- 280 g in a men's size 9
- 6 mm drop, 32 mm stack
- Recycled mesh upper

Read the [size guide](https://example.com/size-guide) before you order: it runs half a size small.`

const quote = (s: string) => s.replaceAll('`', '\\`')

export const teamOptions: ShowcaseOption[] = [
  {
    id: 'sales',
    label: 'Sales follow-up',
    code: `import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

const note = \`${quote(salesNote)}\`

<RichTextEditor
  label="Follow-up"
  toolbar="minimal"
  defaultValue={note}
  mentions={{ search: (query) => crm.teammates(query) }}
  onValueChange={(markdown, { mentions }) => notify(mentions)}
/>`,
  },
  {
    id: 'brief',
    label: 'Campaign brief',
    code: `import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

const brief = \`${quote(brief)}\`

<RichTextEditor label="Brief" defaultValue={brief} onValueChange={saveBrief} />`,
  },
  {
    id: 'product',
    label: 'Product description',
    code: `import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

// Pasted from Google Docs: bold, italic, the list and the link stay.
const description = \`${quote(productDescription)}\`

<RichTextEditor
  label="Description"
  hint="Shown on the product page."
  defaultValue={description}
  onValueChange={saveDescription}
/>`,
  },
]

export function RichTextEditorTeamsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Rich text editor for other teams"
      options={teamOptions}
      codeHtml={codeHtml}
      align="top"
      render={(option) => (
        <div className="w-[520px] max-w-full">
          {option === 'sales' ? (
            <RichTextEditor key="sales" label="Follow-up" toolbar="minimal" defaultValue={salesNote} mentions={{ search: searchSales }} />
          ) : option === 'brief' ? (
            <RichTextEditor key="brief" label="Brief" defaultValue={brief} />
          ) : (
            <RichTextEditor key="product" label="Description" hint="Shown on the product page." defaultValue={productDescription} />
          )}
        </div>
      )}
    />
  )
}

/* ---------- In a dialog, with a count ---------- */

const excerpt = 'Our **spring collection** is out: twelve trail shoes tested on real mud, and the *Ridge* leads the pack.'

export const dialogOptions: ShowcaseOption[] = [
  {
    id: 'dialog',
    label: 'Edit featured excerpt',
    code: `import { Button } from '@uisatin/ui/button'
import { Dialog, DialogClose } from '@uisatin/ui/dialog'
import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

const [draft, setDraft] = useState(excerpt)

<Dialog
  trigger={<Button variant="secondary">Edit featured excerpt</Button>}
  title="Edit featured excerpt"
  description="Shown on the blog's front page, under the title."
  footer={
    <>
      <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
      <DialogClose asChild><Button onClick={() => saveExcerpt(draft)}>Save</Button></DialogClose>
    </>
  }
>
  {/* maxLength counts the text, not the markdown, in the status slot. */}
  <RichTextEditor
    label="Excerpt"
    toolbar="minimal"
    maxLength={280}
    defaultValue={excerpt}
    onValueChange={setDraft}
  />
</Dialog>`,
  },
]

function ExcerptPreview() {
  const [saved, setSaved] = React.useState(excerpt)
  const [draft, setDraft] = React.useState(excerpt)
  return (
    <div className="grid w-[440px] max-w-full gap-4">
      <RichTextEditor label="Featured excerpt" readOnly toolbar={false} value={saved} />
      <Dialog
        onOpenChange={(open) => open && setDraft(saved)}
        trigger={<Button variant="secondary" className="justify-self-start">Edit featured excerpt</Button>}
        title="Edit featured excerpt"
        description="Shown on the blog's front page, under the title."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button onClick={() => setSaved(draft)}>Save</Button>
            </DialogClose>
          </>
        }
      >
        <RichTextEditor label="Excerpt" toolbar="minimal" maxLength={280} defaultValue={saved} onValueChange={setDraft} />
      </Dialog>
    </div>
  )
}

export function RichTextEditorDialogDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Rich text editor in a dialog" options={dialogOptions} codeHtml={codeHtml} render={() => <ExcerptPreview />} />
}

/* ---------- Selection actions ---------- */

const releaseNotes = `## Release 4.2

Exports now keep **column widths**, and a shared view opens on the *same filters* for everyone. Large boards load about twice as fast.`

export const selectionOptions: ShowcaseOption[] = [
  {
    id: 'actions',
    label: 'Comment on a selection',
    code: `import { ChatBubble } from 'iconoir-react'
import { ToolbarButton } from '@uisatin/ui/toolbar'
import {
  RichTextEditorRoot,
  RichTextEditorContent,
  RichTextToolbar,
  RichTextSelectionToolbar,
} from '@uisatin/pro/rich-text-editor'

<RichTextEditorRoot labelledBy="notes-label" defaultValue={releaseNotes}>
  <span id="notes-label">Release notes</span>
  <RichTextEditorContent>
    <RichTextToolbar preset="minimal" />
  </RichTextEditorContent>
  {/* actions go after the formatting items, past a separator. */}
  <RichTextSelectionToolbar
    actions={
      <ToolbarButton
        icon={<ChatBubble />}
        label="Comment"
        onClick={() => addComment(window.getSelection()?.toString() ?? '')}
      />
    }
  />
</RichTextEditorRoot>`,
  },
]

function SelectionPreview() {
  const [comments, setComments] = React.useState<string[]>([])
  const id = React.useId()
  const addComment = () => {
    const text = window.getSelection()?.toString().trim()
    if (text) setComments((c) => [...c, text])
  }
  return (
    <div className="grid w-[520px] max-w-full gap-4">
      <RichTextEditorRoot labelledBy={`${id}-label`} defaultValue={releaseNotes} className="grid gap-2">
        <span id={`${id}-label`} className="text-sm leading-[18px] font-medium text-text-default">
          Release notes
        </span>
        <RichTextEditorContent>
          <RichTextToolbar preset="minimal" />
        </RichTextEditorContent>
        <RichTextSelectionToolbar actions={<ToolbarButton icon={<ChatBubble />} label="Comment" onClick={addComment} />} />
      </RichTextEditorRoot>
      <div className="grid gap-2 text-sm">
        <span className="text-text-muted">{comments.length ? `Comments (${comments.length})` : 'Select some text and pick Comment in the bubble.'}</span>
        {comments.length > 0 && (
          <ul className="grid gap-1.5">
            {comments.map((c, i) => (
              <li key={i} className="rounded-md bg-bg-muted px-3 py-2 text-text-default">
                “{c}”
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function RichTextEditorSelectionDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Rich text selection actions" options={selectionOptions} codeHtml={codeHtml} align="top" render={() => <SelectionPreview />} />
}

/* ---------- In a form ---------- */

const formError = 'Describe what the person will own.'

export const formOptions: ShowcaseOption[] = [
  {
    id: 'form',
    label: 'Job post',
    code: `import { Button } from '@uisatin/ui/button'
import { Form, FormActions } from '@uisatin/ui/form'
import { FormField } from '@uisatin/ui/form-field'
import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

const [errors, setErrors] = useState({})

// FormField gives the editor its label, hint, error, required and name;
// a hidden input carries the markdown into the form's values.
<Form
  errors={errors}
  onSubmitValues={(values) =>
    setErrors(String(values.responsibilities).trim() ? {} : { responsibilities: '${formError}' })
  }
>
  <FormField
    name="responsibilities"
    label="Responsibilities"
    description="Shown on the job post."
    required
  >
    <RichTextEditor toolbar="minimal" placeholder="What will they own in the first year?" />
  </FormField>
  <FormActions>
    <Button type="submit">Publish</Button>
  </FormActions>
</Form>`,
  },
]

function FormPreview() {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [published, setPublished] = React.useState(false)
  return (
    <Form
      className="w-[440px] max-w-full"
      errors={errors}
      onSubmitValues={(values) => {
        const ok = String(values.responsibilities ?? '').trim() !== ''
        setErrors(ok ? {} : { responsibilities: formError })
        setPublished(ok)
      }}
    >
      <FormField name="responsibilities" label="Responsibilities" description="Shown on the job post." required>
        <RichTextEditor toolbar="minimal" placeholder="What will they own in the first year?" onValueChange={() => setPublished(false)} />
      </FormField>
      <FormActions align="between">
        <span role="status" className="text-sm text-text-muted">
          {published ? 'Published' : ''}
        </span>
        <Button type="submit">Publish</Button>
      </FormActions>
    </Form>
  )
}

export function RichTextEditorFormDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Rich text editor in a form" options={formOptions} codeHtml={codeHtml} align="top" render={() => <FormPreview />} />
}
