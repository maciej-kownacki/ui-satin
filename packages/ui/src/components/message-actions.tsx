'use client'

import * as React from 'react'
import { Clock, Copy, DoubleCheck, Link, ThumbsDown, ThumbsUp } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import { useSatinLabels } from './labels'

/**
 * MessageActions, 1:1 with uiKit `_chat/answerActions` (901:20164): the row under an assistant
 * reply. Delivery status (16px icon in a 24px box) and time in text/muted medium 13, then like,
 * dislike and copy as 24px tertiary icon buttons 2px apart, then Share (tertiary xs with a
 * label). Groups sit 8px apart with 1 × 12 border/default dividers between them.
 *
 * Feedback: a clicked thumb stays pressed (border/input fill, icon text/subtle) until the other
 * one is clicked or it is clicked again; `feedback` sets it, `onFeedback` reports it.
 * The status and time show only when there is a `timestamp`.
 */
export type MessageFeedback = 'like' | 'dislike' | null

export interface MessageActionsProps extends React.ComponentProps<'div'> {
  /** "20 minutes ago". Leave it out to drop the status and time. */
  timestamp?: string
  status?: 'sending' | 'delivered'
  /** The pressed thumb. Pass it with onFeedback to control it, or once to start from it. */
  feedback?: MessageFeedback
  showShare?: boolean
  onFeedback?: (value: MessageFeedback) => void
  onCopy?: () => void
  onShare?: () => void
}

const divider = <span aria-hidden className="h-3 w-px shrink-0 rounded-full bg-border-default" />

export function MessageActions({
  timestamp,
  status = 'delivered',
  feedback: feedbackProp = null,
  showShare = true,
  onFeedback,
  onCopy,
  onShare,
  className,
  ...props
}: MessageActionsProps) {
  const labels = useSatinLabels()
  const [feedback, setFeedback] = React.useState<MessageFeedback>(feedbackProp)
  React.useEffect(() => setFeedback(feedbackProp), [feedbackProp])

  const toggle = (value: 'like' | 'dislike') => {
    const next = feedback === value ? null : value
    setFeedback(next)
    onFeedback?.(next)
  }

  const thumb = 'aria-pressed:bg-bg-pressed aria-pressed:[&_svg]:text-text-subtle'

  return (
    <div data-slot="message-actions" className={cn('flex items-center gap-2', className)} {...props}>
      {timestamp && (
        <>
          <span className="flex items-center gap-0.5">
            <span className="flex size-6 items-center justify-center text-text-muted">
              {status === 'sending' ? (
                <Clock aria-hidden className="size-icon-size [stroke-width:1.875]" />
              ) : (
                <DoubleCheck aria-hidden className="size-icon-size [stroke-width:1.875]" />
              )}
              <span className="sr-only">{status === 'sending' ? labels.sending : labels.delivered}</span>
            </span>
            <span className="text-sm font-medium whitespace-nowrap text-text-muted">{timestamp}</span>
          </span>
          {divider}
        </>
      )}
      <span className="flex items-center gap-0.5">
        <Button
          variant="tertiary"
          size="xs"
          iconOnly
          aria-label={labels.goodResponse}
          aria-pressed={feedback === 'like'}
          onClick={() => toggle('like')}
          className={thumb}
        >
          <ThumbsUp />
        </Button>
        <Button
          variant="tertiary"
          size="xs"
          iconOnly
          aria-label={labels.badResponse}
          aria-pressed={feedback === 'dislike'}
          onClick={() => toggle('dislike')}
          className={thumb}
        >
          <ThumbsDown />
        </Button>
        <Button variant="tertiary" size="xs" iconOnly aria-label={labels.copy} onClick={onCopy}>
          <Copy />
        </Button>
      </span>
      {showShare && (
        <>
          {divider}
          <Button variant="tertiary" size="xs" onClick={onShare}>
            <Link />
            {labels.share}
          </Button>
        </>
      )}
    </div>
  )
}
