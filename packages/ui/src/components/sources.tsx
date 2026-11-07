import * as React from 'react'
import { Popover } from 'radix-ui'
import { Globe } from 'iconoir-react'
import { cn } from '../lib/utils'

/**
 * Sources, from the uiKit Sources docs view (3890:68183): the pages an answer was based on.
 *
 * - `card`: the uiKit Card (1122:20156) titled "Sources" — bg/card, border/default, radius-2xl,
 *   16px padding, medium 14/14 title — listing `_chat/source` rows (901:20158): bg/canvas,
 *   border/subtle, radius-lg, 16px logo, medium 13/18 title over a 12/12 text/muted URL.
 * - `chips`: numbered citation chips, "1 · stripe.com", on action/secondary-bg, radius-full,
 *   24px (`sm`, inline with text) or 28px (`md`, a row on its own). Past `maxVisible` the rest
 *   fold into one "+N sources" chip that opens the card.
 *
 * Every source opens its page; pass `onOpen` to handle that yourself (an in-app viewer, say).
 */

export type Source = {
  title: string
  url: string
  /** 16px logo or favicon. A globe when left out. */
  icon?: React.ReactNode
}

export interface SourcesProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  sources: Source[]
  variant?: 'card' | 'chips'
  /** How many sources show before the rest fold away. */
  maxVisible?: number
  /** Chip height: sm 24, md 28. */
  size?: 'sm' | 'md'
  onOpen?: (url: string) => void
  /** Card title. */
  title?: string
  /** Heading level of the card title, to fit the page's outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
}

export function Sources({
  className,
  sources = [],
  variant = 'card',
  maxVisible = 3,
  size = 'sm',
  onOpen,
  title = 'Sources',
  headingLevel = 3,
  ...props
}: SourcesProps) {
  if (variant === 'chips') {
    const visible = sources.slice(0, maxVisible)
    const rest = sources.length - visible.length
    return (
      <section
        aria-label={title}
        data-slot="sources"
        className={cn('flex flex-wrap items-center gap-1.5', className)}
        {...props}
      >
        {visible.map((source, i) => (
          <SourceLink
            key={source.url}
            source={source}
            onOpen={onOpen}
            aria-label={`Source ${i + 1}: ${source.title}, ${hostname(source.url)}`}
            className={chipClass(size)}
          >
            {i + 1} · {hostname(source.url)}
          </SourceLink>
        ))}
        {rest > 0 && (
          <Popover.Root>
            <Popover.Trigger className={chipClass(size)}>
              +{rest} {rest === 1 ? 'source' : 'sources'}
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={8}
                className="z-50 w-[440px] max-w-[calc(100vw-32px)] outline-none data-[state=open]:[animation:satin-enter_var(--duration-fast)_var(--ease-out)]"
              >
                <SourcesCard
                  title={title}
                  headingLevel={headingLevel}
                  sources={sources}
                  onOpen={onOpen}
                  className="[box-shadow:0_4px_6px_-1px_var(--effect-shadow-sm),0_2px_4px_-2px_var(--effect-shadow-sm)]"
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </section>
    )
  }

  return <SourcesCard title={title} headingLevel={headingLevel} sources={sources} onOpen={onOpen} maxVisible={maxVisible} className={className} {...props} />
}

function SourcesCard({
  title,
  headingLevel = 3,
  sources,
  onOpen,
  maxVisible,
  className,
  ...props
}: {
  title: string
  headingLevel?: SourcesProps['headingLevel']
  sources: Source[]
  onOpen?: (url: string) => void
  maxVisible?: number
  className?: string
} & Omit<React.ComponentProps<'section'>, 'title'>) {
  const [expanded, setExpanded] = React.useState(false)
  const titleId = React.useId()
  const limit = maxVisible ?? sources.length
  const shown = expanded ? sources : sources.slice(0, limit)
  const rest = sources.length - shown.length
  const Heading = `h${headingLevel}` as const

  return (
    <section
      aria-labelledby={titleId}
      data-slot="sources"
      className={cn('flex flex-col overflow-clip rounded-2xl border border-border-default bg-bg-card', className)}
      {...props}
    >
      <div className="px-4 pt-4">
        <Heading id={titleId} className="text-base leading-[14px] font-medium tracking-normal text-text-default">
          {title}
        </Heading>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <ul className="flex flex-col overflow-clip rounded-md">
          {shown.map((source) => (
            <li key={source.url} className="flex">
              <SourceLink
                source={source}
                onOpen={onOpen}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border-subtle bg-bg-canvas py-2 pr-3 pl-2.5 no-underline outline-none',
                  'transition-[border-color,background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
                  'satin-hover:border-border-default satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
                )}
              >
                <span className="flex size-4 shrink-0 items-center justify-center overflow-clip text-text-muted [&_img]:size-4 [&_svg]:size-icon-size [&_svg]:[stroke-width:1.875]">
                  {source.icon ?? <Globe aria-hidden />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm leading-[18px] font-medium text-text-default">{source.title}</span>
                  <span className="truncate text-xs leading-3 tracking-normal text-text-muted">{displayUrl(source.url)}</span>
                </span>
              </SourceLink>
            </li>
          ))}
        </ul>
        {rest > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={cn(
              'flex h-control-height-xs items-center self-start rounded-md px-2 text-sm font-medium text-text-default outline-none',
              'transition-[background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
              'satin-hover:bg-bg-hover satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
            )}
          >
            Show {rest} more
          </button>
        )}
      </div>
    </section>
  )
}

function SourceLink({
  source,
  onOpen,
  className,
  children,
  ...props
}: { source: Source; onOpen?: (url: string) => void } & React.ComponentProps<'a'>) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        if (!onOpen) return
        e.preventDefault()
        onOpen(source.url)
      }}
      className={className}
      {...props}
    >
      {children}
    </a>
  )
}

function chipClass(size: 'sm' | 'md') {
  return cn(
    'inline-flex shrink-0 items-center rounded-pill bg-action-secondary-bg px-2 text-sm font-medium whitespace-nowrap text-text-default no-underline outline-none select-none',
    'transition-[background-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out)',
    // Same as Button: full size the moment the popover opens, so it lands on the chip's real edge.
    'not-aria-expanded:active:scale-[0.97] aria-expanded:[transition-property:background-color,box-shadow]',
    'satin-hover:bg-action-secondary-bg-pressed satin-focus:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
    'data-[state=open]:bg-action-secondary-bg-pressed',
    size === 'sm' ? 'h-control-height-xs' : 'h-control-height',
  )
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}
