import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { simulateReadableStream, type ChatTransport, type UIMessage, type UIMessageChunk } from 'ai'
import { AgentLoading } from '@uisatin/ui/agent-loading'
import { Button } from '@uisatin/ui/button'
import { Message } from '@uisatin/ui/message'
import { PromptBar } from '@uisatin/ui/prompt-bar'
import { StreamingText } from '@uisatin/ui/streaming-text'
import { Showcase, type ShowcaseOption } from '../../components/Showcase'

/**
 * Recipe: a chat from PromptBar, Message and StreamingText, driven by useChat from @ai-sdk/react
 * (AI SDK 7). The docs can't call a model, so useChat gets a transport of our own: it picks a
 * canned reply and streams it back as UI message chunks (start, text-start, a text-delta per
 * word, text-end, finish), which is what the real /api/chat route sends. Everything above the
 * transport is the same code a real app runs.
 */

const replies: { match: RegExp; text: string }[] = [
  {
    match: /dark|theme|light/i,
    text: 'Put data-theme="dark" on the html element, or on any panel, and every Satin component inside it switches to its dark tokens. data-theme="system" follows the operating system with no script at all. To avoid a flash on load, set the attribute before the first paint, from a cookie on the server or a few lines of inline script.',
  },
  {
    match: /install|setup|set up|start|npm/i,
    text: 'Run npm i @uisatin/ui, import @uisatin/ui/styles.css once at the root of your app, then import each component from its own entry, like @uisatin/ui/button. You need React 19. Tailwind is optional: Satin ships its own compiled stylesheet, with prefixed classes that never meet yours.',
  },
  {
    match: /stream|chat|ai sdk|usechat/i,
    text: 'useChat keeps the conversation and its status. PromptBar sends the text with sendMessage, each turn renders as a Message, and the reply that is still arriving goes through StreamingText, which writes it out at an even pace with a caret, however unevenly the model sends it.',
  },
]
const fallback =
  'This preview has no model behind it, so the answer comes from a short script, streamed one word at a time the way a model would send it. In your app the same components read from useChat, and the text comes from your /api/chat route. Ask about installing Satin, dark mode or streaming for a more useful reply.'

/** The text of a message: AI SDK messages are a list of parts, and text is one kind of part. */
const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('')

/** Answers from the script above instead of a server, as the chunks a /api/chat route streams. */
const scriptedTransport: ChatTransport<UIMessage> = {
  async sendMessages({ messages }) {
    const question = textOf(messages[messages.length - 1])
    const reply = replies.find((r) => r.match.test(question))?.text ?? fallback
    const words = reply.match(/\S+\s*/g) ?? []
    return simulateReadableStream<UIMessageChunk>({
      initialDelayInMs: 900,
      chunkDelayInMs: 45,
      chunks: [
        { type: 'start' },
        { type: 'text-start', id: 'text' },
        ...words.map((delta) => ({ type: 'text-delta' as const, id: 'text', delta })),
        { type: 'text-end', id: 'text' },
        { type: 'finish' },
      ],
    })
  },
  // Nothing to resume: every reply is made on the spot.
  async reconnectToStream() {
    return null
  },
}

export const code = `'use client'

import * as React from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { AgentLoading } from '@uisatin/ui/agent-loading'
import { Button } from '@uisatin/ui/button'
import { Message } from '@uisatin/ui/message'
import { PromptBar } from '@uisatin/ui/prompt-bar'
import { StreamingText } from '@uisatin/ui/streaming-text'

// AI SDK messages are a list of parts; text is one kind of part.
const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('')

export function Chat() {
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })
  // Replies StreamingText has finished writing out; their actions show from then on.
  const [written, setWritten] = React.useState<string[]>([])
  const busy = status === 'submitted' || status === 'streaming'

  return (
    <div className="chat">
      <div className="chat-log">
        {messages.map((m, i) => {
          const text = textOf(m)
          if (m.role === 'user') return <Message key={m.id} role="user">{text}</Message>
          const live = status === 'streaming' && i === messages.length - 1
          return (
            <Message
              key={m.id}
              role="assistant"
              actions={written.includes(m.id)}
              onCopy={() => navigator.clipboard.writeText(text)}
            >
              <StreamingText
                text={text}
                streaming={live}
                onDone={() => setWritten((ids) => [...ids, m.id])}
              />
            </Message>
          )
        })}
        {status === 'submitted' && <AgentLoading />}
        {error && (
          <p role="alert">
            The answer didn't come through. <Button variant="secondary" size="md" onClick={() => regenerate()}>Try again</Button>
          </p>
        )}
      </div>

      {busy && (
        <Button variant="tertiary" size="md" onClick={() => stop()}>
          Stop
        </Button>
      )}
      <PromptBar disabled={busy} onSubmit={(text) => sendMessage({ text })} />
    </div>
  )
}`

export const options: ShowcaseOption[] = [{ id: 'chat', label: 'Chat.tsx', code }]

function Chat() {
  const { messages, sendMessage, status, stop } = useChat({ transport: scriptedTransport })
  const [written, setWritten] = React.useState<string[]>([])
  const busy = status === 'submitted' || status === 'streaming'
  const log = React.useRef<HTMLDivElement>(null)
  const bar = React.useRef<HTMLFormElement>(null)

  // Keep the newest line in view while StreamingText writes it out.
  React.useEffect(() => {
    const el = log.current
    const inner = el?.firstElementChild
    if (!el || !inner) return
    const follow = new ResizeObserver(() => (el.scrollTop = el.scrollHeight))
    follow.observe(inner)
    return () => follow.disconnect()
  }, [])

  // The bar is disabled while a reply arrives; give it the focus back once it's done.
  const wasBusy = React.useRef(false)
  React.useEffect(() => {
    if (wasBusy.current && !busy) bar.current?.querySelector('textarea')?.focus()
    wasBusy.current = busy
  }, [busy])

  return (
    <div className="flex h-[460px] w-[520px] max-w-full flex-col gap-3">
      <div ref={log} className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 px-1 pb-2">
          {messages.length === 0 && (
            <p className="pt-2 text-base text-text-muted">
              Ask anything. The replies are scripted, since this page has no model; try installing, dark mode or streaming.
            </p>
          )}
          {messages.map((m, i) => {
            const text = textOf(m)
            if (m.role === 'user')
              return (
                <Message key={m.id} role="user">
                  {text}
                </Message>
              )
            const live = status === 'streaming' && i === messages.length - 1
            return (
              <Message key={m.id} role="assistant" actions={written.includes(m.id)} onCopy={() => navigator.clipboard?.writeText(text)}>
                <StreamingText text={text} streaming={live} onDone={() => setWritten((ids) => (ids.includes(m.id) ? ids : [...ids, m.id]))} />
              </Message>
            )
          })}
          {status === 'submitted' && <AgentLoading />}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        {busy && (
          <Button variant="tertiary" size="md" onClick={() => stop()}>
            Stop
          </Button>
        )}
        <PromptBar ref={bar} disabled={busy} placeholder="Ask about Satin" onSubmit={(text) => sendMessage({ text })} />
      </div>
    </div>
  )
}

export default function AiSdkChatDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Chat with the AI SDK" options={options} codeHtml={codeHtml} render={() => <Chat />} />
}
