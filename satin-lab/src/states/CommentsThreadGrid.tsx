import * as React from 'react'
import { WarningCircle } from 'iconoir-react'
import { Button } from '@uisatin/ui/button'
import { Comment, CommentsThread, commentsThreadLabels as labels, type CommentAuthor, type CommentItem } from '@uisatin/pro/comments-thread'

/**
 * Every Comments thread state, one per row: empty (the empty state over the composer), sending
 * and failed (the `Comment` part, as the thread draws a pending row, since a real one needs a
 * send), resolved (folded to one line) and disabled (read only). Fixed dates, so the page is the
 * same on every load.
 */
const MARTA: CommentAuthor = { id: 'marta', name: 'Marta Nowak' }
const JON: CommentAuthor = { id: 'jon', name: 'Jon Park' }

const ask = '@Marta Nowak can we meet her at €9.5k with a signing bonus?'
const comments: CommentItem[] = [
  { id: 'band', author: JON, body: 'Tara Mendes expects €8–10k a month. Our band tops out at €9.5k.', at: '2026-11-16T09:40:00' },
  { id: 'ask', author: JON, parentId: 'band', body: ask, mentions: [{ id: 'marta', label: 'Marta Nowak', start: 0, end: 12 }], at: '2026-11-16T10:05:00', edited: true },
  { id: 'yes', author: MARTA, parentId: 'band', body: 'Yes, €9.5k plus €5k bonus.', at: '2026-11-16T10:30:00' },
]

const noop = () => {}
const pendingBody = 'Offer sent. Tara accepted on the call.'

function Failed() {
  const id = React.useId()
  return (
    <Comment
      author={MARTA}
      at="2026-11-16T11:00:00"
      body={pendingBody}
      state="failed"
      footer={
        <>
          <span id={id} className="inline-flex items-center gap-1 text-sm leading-5 text-text-destructive">
            <WarningCircle aria-hidden className="size-3.5 [stroke-width:1.875]" />
            {labels.commentsNotSent}
          </span>
          <Button variant="secondary" size="xs" aria-describedby={id}>
            {labels.commentsRetry}
          </Button>
          <Button variant="tertiary" size="xs">
            {labels.commentsDiscard}
          </Button>
        </>
      }
    />
  )
}

const rows: { name: string; node: React.ReactNode }[] = [
  { name: 'Empty', node: <CommentsThread comments={[]} currentUser={MARTA} onReply={noop} resolvable /> },
  { name: 'Sending', node: <Comment author={MARTA} at="2026-11-16T11:00:00" body={pendingBody} state="sending" /> },
  { name: 'Failed, Retry', node: <Failed /> },
  { name: 'Resolved', node: <CommentsThread comments={comments} currentUser={MARTA} onReply={noop} resolvable defaultResolved resolvedBy={MARTA} /> },
  { name: 'Disabled', node: <CommentsThread comments={comments} currentUser={MARTA} onReply={noop} onEdit={noop} onDelete={noop} resolvable disabled /> },
]

export function CommentsThreadGrid() {
  return (
    <div className="inline-grid grid-cols-[100px_480px] items-start gap-x-8 gap-y-8 p-8 text-xs text-text-muted">
      {rows.map((r) => (
        <div key={r.name} className="contents">
          <span className="pt-1 text-sm text-text-default">{r.name}</span>
          {r.node}
        </div>
      ))}
    </div>
  )
}
