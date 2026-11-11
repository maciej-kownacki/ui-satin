'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Xmark } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * Banner, 1:1 with the uiKit `Banner` set (3822:3475): a title, an optional description (one
 * or two lines) and one action, on bg/card with a 1px border/default and the shadcn md shadow.
 *
 * - layout="horizontal": 450 wide, one row, 12 × 8 padding, 10 gap; the action and the close
 *   button sit on the right, 4px apart.
 * - layout="sidebar": 222 wide (the navigation column's inner width), 12 padding, 12 gap; copy on
 *   top, the action stretched across the bottom, close pinned 3px from the top-right corner.
 * - shape="rounded" is radius-xl (12). shape="pill" is fully round on a one-line horizontal
 *   banner and radius-3xl (20) wherever the banner is taller.
 * - background="mesh" lays two pre-rendered glows over the card: a light one in Multiply (shows
 *   on white, gone on dark) and a dark one in Screen (glows on dark, gone on white), so it follows
 *   the theme without variables. Figma renders one pair per layout and line count; the PNGs live
 *   in satin-lab/public/figma and can be swapped with `mesh`.
 *
 * tone="primary" turns the card action/primary/bg (border action/primary/border) with
 * action/primary/fg copy (description at 80%); its mesh is the dark glow alone, in Screen, so it
 * lightens the primary. `shimmer` sends a soft band of light across now and then.
 *
 * Title is 14/18 medium, description Body/md in text/muted, 2px apart. The close
 * button only renders when `onDismiss` is passed.
 */
const bannerVariants = cva(
  [
    'relative isolate flex max-w-full overflow-clip border border-border-default bg-bg-card',
    '[box-shadow:0_2px_4px_-2px_var(--effect-shadow-sm),0_4px_6px_-1px_var(--effect-shadow-sm)]',
  ],
  {
    variants: {
      layout: {
        horizontal: 'w-[450px] items-center gap-2.5 px-3 py-2',
        sidebar: 'w-[222px] flex-col items-start gap-3 p-3',
      },
      shape: {
        rounded: 'rounded-xl',
        pill: 'rounded-3xl',
      },
      lines: {
        one: '',
        two: '',
      },
    },
    compoundVariants: [{ layout: 'horizontal', shape: 'pill', lines: 'one', className: 'rounded-pill' }],
    defaultVariants: { layout: 'horizontal', shape: 'rounded', lines: 'one' },
  },
)

type Mesh = { light: string; dark: string }

/** Figma's pre-rendered mesh pairs, per layout and line count (served from satin-lab/public). */
export const bannerMesh: Record<'horizontal' | 'sidebar', Record<'one' | 'two', Mesh>> = {
  horizontal: {
    one: { light: '/figma/banner-mesh-light.png', dark: '/figma/banner-mesh-dark.png' },
    two: { light: '/figma/banner-mesh-two-light.png', dark: '/figma/banner-mesh-two-dark.png' },
  },
  sidebar: {
    one: { light: '/figma/banner-mesh-sidebar-light.png', dark: '/figma/banner-mesh-sidebar-dark.png' },
    two: { light: '/figma/mesh-light.png', dark: '/figma/mesh-dark.png' },
  },
}

export interface BannerProps
  extends Omit<React.ComponentProps<'div'>, 'title'>,
    Omit<VariantProps<typeof bannerVariants>, 'lines'> {
  title: React.ReactNode
  description?: React.ReactNode
  /** One action, usually `<Button variant="secondary">`. Stretches across a sidebar banner. */
  action?: React.ReactNode
  background?: 'mesh' | 'plain'
  /** `primary`: action/primary/bg with action/primary/fg text; its mesh glows lighter on top. */
  tone?: 'default' | 'primary'
  /** Now and then a soft band of light crosses the banner (off under reduced motion). */
  shimmer?: boolean
  /** Shows the close button. */
  onDismiss?: () => void
  /** Accessible name of the close button. */
  dismissLabel?: string
  /** Replace the mesh images. */
  mesh?: Mesh
}

export function Banner({
  className,
  title,
  description,
  action,
  layout = 'horizontal',
  background = 'mesh',
  tone = 'default',
  shimmer = false,
  shape = 'rounded',
  onDismiss,
  dismissLabel = 'Dismiss',
  mesh,
  ...props
}: BannerProps) {
  const lines = description ? 'two' : 'one'
  const layoutKey = layout ?? 'horizontal'
  const glow = mesh ?? bannerMesh[layoutKey][lines]
  const sidebar = layoutKey === 'sidebar'
  const primary = tone === 'primary'

  const close = onDismiss && (
    <Button
      variant="tertiary"
      shape="rounded"
      iconOnly
      aria-label={dismissLabel}
      onClick={onDismiss}
      className={cn(
        sidebar && 'absolute top-[3px] right-[3px] z-10',
        primary && 'text-action-primary-fg [&_svg]:text-action-primary-fg satin-hover:bg-action-primary-bg-hover',
      )}
    >
      <Xmark aria-hidden />
    </Button>
  )

  return (
    <div
      data-slot="banner"
      data-layout={layoutKey}
      data-background={background}
      data-tone={tone}
      className={cn(
        bannerVariants({ layout, shape, lines }),
        primary && 'border-action-primary-border bg-action-primary-bg',
        shimmer && 'satin-sheen',
        className,
      )}
      {...props}
    >
      {background === 'mesh' && primary && (
        <img
          src={glow.dark}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -inset-px -z-10 size-[calc(100%+2px)] max-w-none object-cover mix-blend-screen"
        />
      )}
      {background === 'mesh' && !primary && (
        <>
          <img
            src={glow.light}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -inset-px -z-10 size-[calc(100%+2px)] max-w-none object-cover mix-blend-multiply"
          />
          <img
            src={glow.dark}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -inset-px -z-10 size-[calc(100%+2px)] max-w-none object-cover mix-blend-screen"
          />
        </>
      )}
      <div
        className={cn(
          'flex min-w-0 flex-col justify-center text-sm',
          sidebar ? 'w-full' : 'flex-1',
          description && 'gap-0.5',
        )}
      >
        <p className={cn('truncate text-base leading-[18px] font-medium', primary ? 'text-action-primary-fg' : 'text-text-default')}>{title}</p>
        {description && (
          <p className={cn('text-body', primary ? 'text-action-primary-fg/80' : 'text-text-muted', !sidebar && 'truncate')}>{description}</p>
        )}
      </div>
      {sidebar ? (
        <>
          {action && <div className="flex w-full items-center *:flex-1">{action}</div>}
          {close}
        </>
      ) : (
        (action || close) && (
          <div className="flex shrink-0 items-center gap-1">
            {action}
            {close}
          </div>
        )
      )}
    </div>
  )
}

export { bannerVariants }
