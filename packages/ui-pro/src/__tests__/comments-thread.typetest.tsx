import * as React from 'react'
import type { PromptValue } from '@uisatin/ui/prompt-mentions'
import {
  Comment,
  CommentActions,
  CommentComposer,
  CommentsThread,
  commentsThreadLabels,
  type CommentAuthor,
  type CommentItem,
  type CommentMention,
} from '../components/comments-thread'

const me: CommentAuthor = { id: 'u1', name: 'Marta Nowak' }
const comments: CommentItem[] = [
  { id: 'c1', author: me, body: '@Tara Mendes ok', at: new Date(), mentions: [{ id: 't', label: 'Tara Mendes', start: 0, end: 12 }] },
  { id: 'c2', author: { ...me, avatar: <img alt="" /> }, body: 'Reply', at: '2026-11-16T09:40:00Z', parentId: 'c1', edited: true },
]

export function Uncontrolled() {
  const ref = React.useRef<HTMLDivElement>(null)
  return (
    <CommentsThread
      ref={ref}
      comments={comments}
      currentUser={me}
      defaultResolved
      resolvable
      moderator
      onReply={async (parentId: string | null, body: string, mentions: CommentMention[]) => void [parentId, body, mentions]}
      onEdit={(id, body, mentions) => void [id, body, mentions]}
      onDelete={async (id) => void id}
      onResolve={(resolved: boolean) => void resolved}
      mentions={{ search: async (q) => [me].filter((p) => p.name.includes(q)) }}
      empty={<p>Nothing yet</p>}
      aria-describedby="x"
    />
  )
}

export function Controlled() {
  const [resolved, setResolved] = React.useState(false)
  return <CommentsThread comments={comments} currentUser={me} resolvable resolved={resolved} resolvedBy={me} onResolve={setResolved} disabled={false} />
}

export function Parts() {
  const article = React.useRef<HTMLElement>(null)
  const composer = React.useRef<HTMLDivElement>(null)
  const button = React.useRef<HTMLButtonElement>(null)
  const [value, setValue] = React.useState<PromptValue>({ text: '', mentions: [] })
  return (
    <>
      <Comment ref={article} author={me} at={new Date()} body="Hi" state="sending" animateIn actions={<CommentActions ref={button} authorName="Marta Nowak" onEdit={() => {}} onDelete={() => {}} />} footer={<span />} />
      <CommentComposer ref={composer} value={value} onValueChange={setValue} onSubmit={(body: string, mentions: CommentMention[]) => void [body, mentions]} onCancel={() => {}} submitLabel="Save" />
      <CommentComposer defaultValue="Draft" onSubmit={() => {}} mentions={{ search: () => [me] }} start={<span />} error="Failed" autoFocus />
    </>
  )
}

const word: string = commentsThreadLabels.commentActionsFor('Marta')
void word

// @ts-expect-error currentUser is required
export const NoUser = () => <CommentsThread comments={comments} />

// @ts-expect-error a mention needs its offsets
export const BadMention: CommentMention = { id: 'x', label: 'X' }

// @ts-expect-error resolved is a boolean
export const BadResolved = () => <CommentsThread comments={comments} currentUser={me} resolved="yes" />
