'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { MessageActions, type MessageFeedback } from './message-actions'
import { Thinking, type ThinkingStep } from './thinking'

/**
 * Message, 1:1 with the uiKit Message docs view (3890:70165), composed from `_chat/userMessage`
 * (901:20155), `_chat/source` and `_chat/answerActions` (901:20164, see MessageActions).
 *
 * user: a right-aligned action/inverse bubble (12px corners, 4px bottom-right), 12 × 8
 * padding, text/on-inverse 13/19.5, wrapping at 256px of text. A source card sits 8px above
 * it: bg/canvas, border/subtle, radius 10, 16px logo, title medium 13/18, url 12/12 muted.
 *
 * assistant: no bubble, so long answers read like a document — text/default 13/19.5, with
 * the collapsed Thinking above and the actions below, 12px apart.
 */
export interface MessageSource {
  /** The page or message title, "Q3 pipeline review". */
  title: React.ReactNode
  /** Shown under the title, "docs.sature.app/q3-review". */
  url?: React.ReactNode
  /** A 16px logo or favicon. */
  icon?: React.ReactNode
  /** Makes the card a link. */
  href?: string
}

export interface MessageProps extends React.ComponentProps<'div'> {
  role?: 'user' | 'assistant'
  /** The steps the agent ran; shows a collapsed Thinking above an assistant answer. */
  thinking?: ThinkingStep[]
  /** The summary on that Thinking header. */
  thinkingLabel?: React.ReactNode
  /** A page or message the user brought in, shown as a card above their bubble. */
  source?: MessageSource
  /** Feedback, copy and share under an assistant answer. Off while it streams. */
  actions?: boolean
  timestamp?: string
  onFeedback?: (value: MessageFeedback) => void
  onCopy?: () => void
  onShare?: () => void
}

export function Message({
  role = 'assistant',
  thinking,
  thinkingLabel = 'Thought for a moment',
  source,
  actions = true,
  timestamp,
  onFeedback,
  onCopy,
  onShare,
  className,
  children,
  ...props
}: MessageProps) {
  if (role === 'user') {
    return (
      <div data-slot="message" data-role="user" className={cn('flex flex-col items-end gap-2', className)} {...props}>
        {source && <SourceCard source={source} />}
        <div className="max-w-full rounded-xl rounded-br-xs bg-action-inverse-bg px-3 py-2">
          <div className="max-w-64 text-body break-words text-text-on-inverse">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div data-slot="message" data-role="assistant" className={cn('flex flex-col items-start gap-3', className)} {...props}>
      {thinking && thinking.length > 0 && <Thinking state="collapsed" label={thinkingLabel} steps={thinking} />}
      <div className="w-full text-body break-words text-text-default">{children}</div>
      {actions && <MessageActions timestamp={timestamp} onFeedback={onFeedback} onCopy={onCopy} onShare={onShare} />}
    </div>
  )
}

function SourceCard({ source }: { source: MessageSource }) {
  const body = (
    <>
      {source.icon && <span className="flex size-4 shrink-0 items-center justify-center [&>*]:size-4">{source.icon}</span>}
      <span className="flex min-w-0 flex-col overflow-clip whitespace-nowrap">
        <span className="truncate text-sm leading-[18px] font-medium text-text-default">{source.title}</span>
        {source.url != null && (
          <span className="truncate text-xs leading-3 tracking-normal text-text-muted">{source.url}</span>
        )}
      </span>
    </>
  )
  const cls = 'flex max-w-full items-center gap-2.5 overflow-clip rounded-lg border border-border-subtle bg-bg-canvas py-2 pr-3 pl-2.5'
  return source.href ? (
    <a href={source.href} className={cls}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  )
}
