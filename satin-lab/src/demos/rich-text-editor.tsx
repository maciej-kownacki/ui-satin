import { RichTextEditor } from '@uisatin/pro/rich-text-editor'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

// A first stub: the editor with a markdown value. The toolbar, the @ and / menus and the full
// scenarios come with the next steps.
const feedback = `## Interview feedback

**Strong** craft and *clear* writing. Ask [@Marta Nowak](mention:marta) to check the take-home.

- Communication
- Craft`

export const options: ShowcaseOption[] = [
  {
    id: 'default',
    label: 'Default',
    code: `import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

<RichTextEditor
  label="Feedback"
  hint="Shared with the hiring panel."
  defaultValue={\`${feedback.replace(/`/g, '\\`')}\`}
/>`,
  },
]

export default function RichTextEditorDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Rich text editor"
      options={options}
      codeHtml={codeHtml}
      render={() => (
        <div className="w-full max-w-[480px]">
          <RichTextEditor label="Feedback" hint="Shared with the hiring panel." defaultValue={feedback} />
        </div>
      )}
    />
  )
}
