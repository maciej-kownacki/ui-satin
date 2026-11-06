import { CodeBlock } from '@satin/ui/code-block'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

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

const snippet = `const total = orders.reduce((sum, o) => sum + o.amount, 0)`

const literal = (s: string) => '`' + s.replace(/[`$\\]/g, (c) => '\\' + c) + '`'

export const options: ShowcaseOption[] = [
  {
    id: 'code',
    label: 'Code',
    code: `import { CodeBlock } from '@satin/ui/code-block'

const code = ${literal(route)}

export function Route() {
  return <CodeBlock filename="app/api/chat/route.ts" code={code} highlightLines={[6, 7, 8, 9, 10]} />
}`,
  },
  {
    id: 'diff',
    label: 'Diff',
    code: `import { CodeBlock } from '@satin/ui/code-block'

// Each line starts with "+", "-" or a space, like a unified diff.
const diff = ${literal(diff)}

export function Change() {
  return <CodeBlock view="diff" filename="app/api/chat/route.ts" code={diff} />
}`,
  },
  {
    id: 'inline',
    label: 'Inline',
    code: `import { CodeBlock } from '@satin/ui/code-block'

export function Snippet() {
  return <CodeBlock showHeader={false} code={${literal(snippet)}} />
}`,
  },
]

export default function CodeBlockDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Code block"
      options={options}
      codeHtml={codeHtml}
      render={(id) => (
        <div className="w-[600px] max-w-full">
          {id === 'code' && <CodeBlock filename="app/api/chat/route.ts" code={route} highlightLines={[6, 7, 8, 9, 10]} />}
          {id === 'diff' && <CodeBlock view="diff" filename="app/api/chat/route.ts" code={diff} />}
          {id === 'inline' && <CodeBlock showHeader={false} code={snippet} />}
        </div>
      )}
    />
  )
}
