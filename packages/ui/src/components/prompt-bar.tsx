import * as React from 'react'
import { ArrowUp, Microphone, NavArrowDown, Plus, Sparks } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * PromptBar, from the uiKit `promptBar` page: where the user writes to an agent.
 * Add-attachment on the left, the model picker, voice and send on the right.
 * Send stays disabled until there is text; Enter sends, Shift+Enter adds a line.
 */
export interface PromptBarProps {
  /** `rectangle` grows into a card as the text wraps; `rounded` is a full pill for one-line prompts. */
  shape?: 'rectangle' | 'rounded'
  placeholder?: string
  model?: React.ReactNode
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onSubmit?: (value: string) => void
  onAttach?: () => void
  onModelClick?: () => void
  onVoice?: () => void
  className?: string
}

export function PromptBar({
  shape = 'rectangle',
  placeholder = 'Write a message',
  model = 'Model',
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onSubmit,
  onAttach,
  onModelClick,
  onVoice,
  className,
}: PromptBarProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const value = valueProp ?? inner
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim().length > 0

  const set = (next: string) => {
    setInner(next)
    onValueChange?.(next)
  }

  // Grow with the text, up to about six lines.
  React.useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [value])

  const submit = () => {
    if (!canSend) return
    onSubmit?.(value.trim())
    set('')
  }

  return (
    <form
      data-slot="prompt-bar"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={cn(
        'flex w-full items-end gap-1 border border-border-default bg-bg-field p-1.5 shadow-sm',
        'transition-shadow duration-(--duration-fast) ease-(--ease-out) focus-within:shadow-xs-focus',
        shape === 'rounded' ? 'rounded-full' : 'rounded-xl',
        className,
      )}
    >
      <Button
        variant="tertiary"
        size="lg"
        shape={shape === 'rounded' ? 'pill' : 'rectangle'}
        iconOnly
        aria-label="Add attachment"
        onClick={onAttach}
        className="text-text-muted"
      >
        <Plus />
      </Button>
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        placeholder={placeholder}
        aria-label="Message"
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          }
        }}
        className={cn(
          'w-0 min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-1.5 text-base leading-5 text-text-default outline-none',
          'placeholder:text-text-placeholder focus-visible:ring-0',
        )}
      />
      <Button
        variant="tertiary"
        size="lg"
        shape={shape === 'rounded' ? 'pill' : 'rectangle'}
        aria-haspopup="menu"
        onClick={onModelClick}
        className="gap-1 px-2"
      >
        <Sparks className="text-status-amber-fg" />
        <span className="sr-only">Model:</span>
        {model}
        <NavArrowDown className="!size-icon-size-sm text-text-muted" />
      </Button>
      <Button
        variant="tertiary"
        size="lg"
        shape={shape === 'rounded' ? 'pill' : 'rectangle'}
        iconOnly
        aria-label="Dictate"
        onClick={onVoice}
        className="text-text-muted"
      >
        <Microphone />
      </Button>
      <Button type="submit" size="lg" shape="pill" iconOnly aria-label="Send" disabled={!canSend}>
        <ArrowUp strokeWidth={2} />
      </Button>
    </form>
  )
}
