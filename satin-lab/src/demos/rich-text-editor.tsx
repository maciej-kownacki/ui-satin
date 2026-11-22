import { RichTextEditor } from '@uisatin/pro/rich-text-editor'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

// A stub: the editor with a markdown value, its formatting toolbar and the bubble over a
// selection. The @ and / menus and the full scenarios come with the next steps.
const feedback = `## Interview feedback

**Strong** craft and *clear* writing. Ask [@Marta Nowak](mention:marta) to check the take-home.

- Communication
- Craft`

export const options: ShowcaseOption[] = [
  {
    id: 'default',
    label: 'Default',
    code: `import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

// The toolbar is on by default (toolbar="minimal" or toolbar={false});
// select text with the pointer for the bubble, ⌘K for a link.
<RichTextEditor
  label="Feedback"
  hint="Shared with the hiring panel."
  defaultValue={\`${feedback.replace(/`/g, '\\`')}\`}
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
        <div className="w-full max-w-[480px]">
          {option === 'minimal' ? (
            <RichTextEditor label="Note" toolbar="minimal" placeholder="Add a note" />
          ) : (
            <RichTextEditor label="Feedback" hint="Shared with the hiring panel." defaultValue={feedback} />
          )}
        </div>
      )}
    />
  )
}
