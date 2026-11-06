import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * TypingIndicator, 1:1 with the uiKit Typing indicator docs view (3890:73090), composed from
 * `Dot` (369:6759) and `Avatar` — both drawn here so this file stands alone.
 *
 * Three 16px dots in the agent's tone (status/<tone>/fg): the active one is solid (8px), the
 * others an outline (7px ring, 1px). The solid dot steps along every 400ms. An optional 24px
 * initials avatar (tone bg, tone fg, semibold 10) sits 8px before the dots, and an optional
 * label in text/muted 13 8px after. With reduced motion the first dot stays solid.
 */
export type TypingIndicatorTone = 'fuchsia' | 'sky' | 'plum' | 'green'

export interface TypingIndicatorProps extends React.ComponentProps<'span'> {
  tone?: TypingIndicatorTone
  /** "Atlas is typing…". Also the accessible name; without it the name is "Typing". */
  label?: string
  showAvatar?: boolean
  /** Initials in the avatar. */
  initials?: string
}

export function TypingIndicator({
  tone = 'fuchsia',
  label,
  showAvatar = false,
  initials = 'AI',
  className,
  ...props
}: TypingIndicatorProps) {
  const [step, setStep] = React.useState(0)

  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % 3), 400)
    return () => window.clearInterval(id)
  }, [])

  return (
    <span
      data-slot="typing-indicator"
      data-tone={tone}
      role="status"
      aria-label={label ?? 'Typing'}
      className={cn('inline-flex items-center gap-2', className)}
      {...props}
    >
      {showAvatar && (
        <span
          aria-hidden
          className="flex size-6 shrink-0 items-center justify-center overflow-clip rounded-full bg-tone-bg text-center text-2xs font-semibold text-tone-fg"
        >
          {initials}
        </span>
      )}
      <span aria-hidden className="flex shrink-0 items-center text-tone-fg">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex size-4 items-center justify-center">
            <span
              className={cn(
                'size-2 rounded-full border border-current transition-colors duration-(--duration-fast) ease-(--ease-out)',
                i === step ? 'bg-current' : 'bg-transparent',
              )}
            />
          </span>
        ))}
      </span>
      {label && (
        <span aria-hidden className="text-sm whitespace-nowrap text-text-muted">
          {label}
        </span>
      )}
    </span>
  )
}
