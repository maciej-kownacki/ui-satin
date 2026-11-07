import { CodeBlock } from '@satin/ui/code-block'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const route = `import { streamText } from "ai"

export async function POST(request: Request) {
  const { messages } = await request.json()

  const result = streamText({
    model: "anthropic/claude-sonnet-4.5",
    system: "You are a helpful assistant. Answer in one sentence.",
    messages,
  })

  return result.toUIMessageStreamResponse()
}`

const diff = ` import { streamText } from "ai"
 
 export async function POST(request: Request) {
   const { messages } = await request.json()
 
   const result = streamText({
-    model: "anthropic/claude-sonnet-4.5",
+    model: "anthropic/claude-opus-5.5",
     system: "You are a helpful assistant. Answer in one sentence.",
+    maxOutputTokens: 400,
     messages,
   })
 
   return result.toUIMessageStreamResponse()
 }`

const literal = (s: string) => '`' + s.replace(/[`$\\]/g, (c) => '\\' + c) + '`'

// View decides what the lines mean, syntax how they're coloured; then the header and the copy
// button in it, and the marked lines (code view only).
export const controls: ShowcaseControl[] = [
  { id: 'view', label: 'View', items: [{ value: 'code', label: 'Code' }, { value: 'diff', label: 'Diff' }] },
  { id: 'syntax', label: 'Syntax', type: 'switch', default: 'on' },
  { id: 'header', label: 'Header', type: 'switch', default: 'on' },
  { id: 'actions', label: 'Actions', type: 'switch', default: 'on' },
  { id: 'lines', label: 'Highlighted lines', type: 'switch', default: 'on' },
]

const on = (v: Record<string, string>, id: string) => v[id] === 'on'
const filename = 'app/api/chat/route.ts'
const highlightLines = [6, 7, 8, 9, 10]

function code(v: Record<string, string>) {
  const diffView = v.view === 'diff'
  const name = diffView ? 'diff' : 'code'
  const props = [
    diffView && 'view="diff"',
    !on(v, 'syntax') && 'highlight={false}',
    on(v, 'header') ? `filename="${filename}"` : 'showHeader={false}',
    on(v, 'header') && !on(v, 'actions') && 'showActions={false}',
    `code={${name}}`,
    !diffView && on(v, 'lines') && `highlightLines={[${highlightLines.join(', ')}]}`,
  ].filter(Boolean)
  return `import { CodeBlock } from '@satin/ui/code-block'
${diffView ? '\n// Each line starts with "+", "-" or a space, like a unified diff.\n' : '\n'}const ${name} = ${literal(diffView ? diff : route)}

export function ${diffView ? 'Change' : 'Route'}() {
  return <CodeBlock ${props.join(' ')} />
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    v.view === 'diff' ? 'Diff' : 'Code',
    on(v, 'syntax') ? 'Syntax' : 'No syntax',
    on(v, 'header') ? 'Header' : 'No header',
    on(v, 'actions') ? 'Actions' : 'No actions',
    on(v, 'lines') ? 'Highlighted lines' : 'No highlighted lines',
  ].join(' · '),
  code: code(v),
}))

export default function CodeBlockDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Code block"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="w-[600px] max-w-full">
          <CodeBlock
            view={v.view as 'code' | 'diff'}
            highlight={on(v, 'syntax')}
            showHeader={on(v, 'header')}
            showActions={on(v, 'actions')}
            filename={filename}
            code={v.view === 'diff' ? diff : route}
            highlightLines={v.view === 'code' && on(v, 'lines') ? highlightLines : undefined}
          />
        </div>
      )}
    />
  )
}
