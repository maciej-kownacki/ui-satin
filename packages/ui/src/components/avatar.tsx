'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { Tooltip, TooltipBubble } from './tooltip'

export type AvatarTone = 'neutral' | 'brand' | 'sky' | 'green' | 'amber' | 'red' | 'fuchsia' | 'plum'
export type AvatarSize = 16 | 20 | 24 | 32 | 40 | 48

/**
 * Avatar, 1:1 with the uiKit `Avatar` set (992:20199): initials on a tone fill, the same eight
 * hue pairs as Badge (`tone/bg` fill, `tone/fg` text, no border), six px sizes and a Circle or
 * Rounded shape. Rounded steps the radius with the size: 4 / 4 / 6 / 8 / 10 / 12.
 *
 * Type per size, from Figma: 16 → SemiBold 7/8, 20 → SemiBold 9/10 (no kit token for either),
 * 24 → text/2xs SemiBold, 32 → Label/sm 13/16, 40 → Label/lg 14/14, 48 → text/lg Medium.
 * Groups (docs example 3889:7365) overlap with -8px and stack the first on top.
 *
 * With `name` the avatar says who it is: it becomes an image named after the person, takes
 * keyboard focus, and shows the name in a Tooltip. On hover the tooltip waits 400 ms — the middle
 * of the 0.3–0.5 s NN/g recommends, so a pointer passing over a row of faces doesn't flash names —
 * and stays 150 ms after the pointer leaves. Keyboard focus shows it at once.
 *
 * Avatars side by side go in an `AvatarGroup`: the row shares one tooltip. The first name waits
 * the same 400 ms; after that, moving to the next person slides the tooltip over to them and
 * eases its width to the new name, instead of closing one tooltip and opening another.
 */
const avatarVariants = cva(
  'inline-flex shrink-0 items-center justify-center overflow-clip bg-tone-bg text-center whitespace-nowrap text-tone-fg select-none',
  {
    variants: {
      size: {
        16: 'size-4 text-[7px] leading-[8px] font-semibold tracking-normal',
        20: 'size-5 text-[9px] leading-[10px] font-semibold tracking-normal',
        24: 'size-6 text-2xs font-semibold',
        32: 'size-8 text-sm leading-4 font-medium tracking-normal',
        40: 'size-10 text-base leading-[14px] font-medium tracking-normal',
        48: 'size-12 text-lg font-medium',
      },
      shape: {
        circle: 'rounded-full',
        rounded: '',
      },
    },
    compoundVariants: [
      { shape: 'rounded', size: 16, className: 'rounded-xs' },
      { shape: 'rounded', size: 20, className: 'rounded-xs' },
      { shape: 'rounded', size: 24, className: 'rounded-sm' },
      { shape: 'rounded', size: 32, className: 'rounded-md' },
      { shape: 'rounded', size: 40, className: 'rounded-lg' },
      { shape: 'rounded', size: 48, className: 'rounded-xl' },
    ],
    defaultVariants: { size: 32, shape: 'circle' },
  },
)

export interface AvatarProps
  extends Omit<React.ComponentProps<'span'>, 'children'>,
    Omit<VariantProps<typeof avatarVariants>, 'size'> {
  /** One or two letters, or a count like "+3" at the end of a group. */
  initials: string
  tone?: AvatarTone
  size?: AvatarSize
  /** The person's name: shown in a tooltip on hover and focus, and read by screen readers. */
  name?: string
}

/** NN/g: wait 0.3–0.5 s before showing hidden content on hover; we take the middle. */
export const AVATAR_TOOLTIP_DELAY = 400
const AVATAR_TOOLTIP_CLOSE = 150

type AvatarGroupApi = { show: (el: HTMLElement, name: string, now?: boolean) => void; hide: (now?: boolean) => void }
const AvatarGroupContext = React.createContext<AvatarGroupApi | null>(null)

export function Avatar({ className, initials, tone = 'neutral', size = 32, shape, name, ...props }: AvatarProps) {
  const group = React.useContext(AvatarGroupContext)
  const grouped = group && name ? group : null
  const avatar = (
    <span
      data-slot="avatar"
      data-tone={tone}
      {...(name ? { role: 'img', 'aria-label': name, tabIndex: 0 } : {})}
      className={cn(
        avatarVariants({ size, shape }),
        name && 'outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
        className,
      )}
      {...props}
      {...(grouped && {
        onPointerEnter: (e: React.PointerEvent<HTMLSpanElement>) => (props.onPointerEnter?.(e), grouped.show(e.currentTarget, name!)),
        onPointerLeave: (e: React.PointerEvent<HTMLSpanElement>) => (props.onPointerLeave?.(e), grouped.hide()),
        onFocus: (e: React.FocusEvent<HTMLSpanElement>) => (props.onFocus?.(e), grouped.show(e.currentTarget, name!, true)),
        onBlur: (e: React.FocusEvent<HTMLSpanElement>) => (props.onBlur?.(e), grouped.hide(true)),
        onKeyDown: (e: React.KeyboardEvent<HTMLSpanElement>) => (props.onKeyDown?.(e), e.key === 'Escape' && grouped.hide(true)),
      })}
    >
      <span aria-hidden={name ? true : undefined}>{initials}</span>
    </span>
  )
  if (!name || grouped) return avatar
  return (
    <Tooltip label={name} delay={AVATAR_TOOLTIP_DELAY} closeDelay={AVATAR_TOOLTIP_CLOSE}>
      {avatar}
    </Tooltip>
  )
}

export interface AvatarGroupProps extends React.ComponentProps<'div'> {
  /** Where the shared name tooltip sits. */
  side?: 'top' | 'bottom'
}

/** Space the tooltip keeps from the avatar and from the viewport edge, as Tooltip does. */
const GAP = 8
/** The bubble's side padding (10 + 10), added to the measured name for its width. */
const BUBBLE_PADDING = 20

/**
 * A row of avatars sharing one name tooltip. It opens after AVATAR_TOOLTIP_DELAY on the first
 * person; while it's open, the next person gets it at once: it slides along the row (transform,
 * 200 ms, ease-out) and its width eases to the new name, which fades in. It closes
 * AVATAR_TOOLTIP_CLOSE after the pointer leaves the row, so the gaps between faces don't
 * close it. Focus shows it at once, Escape and blur hide it.
 */
export function AvatarGroup({ className, side = 'top', children, ...props }: AvatarGroupProps) {
  const [target, setTarget] = React.useState<{ el: HTMLElement; name: string } | null>(null)
  const [open, setOpen] = React.useState(false)
  const shown = React.useRef(false)
  const openTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const api = React.useMemo<AvatarGroupApi>(() => {
    const set = (next: boolean) => {
      shown.current = next
      setOpen(next)
    }
    return {
      show(el, name, now) {
        clearTimeout(closeTimer.current)
        clearTimeout(openTimer.current)
        setTarget({ el, name })
        if (shown.current || now) set(true)
        else openTimer.current = setTimeout(() => set(true), AVATAR_TOOLTIP_DELAY)
      },
      hide(now) {
        clearTimeout(openTimer.current)
        clearTimeout(closeTimer.current)
        if (now) set(false)
        else closeTimer.current = setTimeout(() => set(false), AVATAR_TOOLTIP_CLOSE)
      },
    }
  }, [])
  React.useEffect(
    () => () => {
      clearTimeout(openTimer.current)
      clearTimeout(closeTimer.current)
    },
    [],
  )

  return (
    <AvatarGroupContext.Provider value={api}>
      <div data-slot="avatar-group" role="group" className={cn('flex items-center gap-2', className)} {...props}>
        {children}
      </div>
      {open && target && <GroupTooltip anchor={target.el} name={target.name} side={side} />}
    </AvatarGroupContext.Provider>
  )
}

function GroupTooltip({ anchor, name, side }: { anchor: HTMLElement; name: string; side: 'top' | 'bottom' }) {
  const label = React.useRef<HTMLSpanElement>(null)
  const [width, setWidth] = React.useState<number>()
  const [point, setPoint] = React.useState<{ x: number; y: number }>()

  React.useLayoutEffect(() => {
    if (label.current) setWidth(label.current.offsetWidth + BUBBLE_PADDING)
  }, [name])

  React.useLayoutEffect(() => {
    const place = () => {
      const r = anchor.getBoundingClientRect()
      const half = (width ?? 0) / 2
      const x = Math.min(Math.max(r.left + r.width / 2, half + GAP), window.innerWidth - half - GAP)
      setPoint({ x, y: side === 'top' ? r.top - GAP : r.bottom + GAP })
    }
    place()
    addEventListener('scroll', place, true)
    addEventListener('resize', place)
    return () => {
      removeEventListener('scroll', place, true)
      removeEventListener('resize', place)
    }
  }, [anchor, side, width])

  if (!point) return null
  return createPortal(
    // A point at the avatar's edge, moved with transform so a change of person slides; the
    // bubble hangs off it, centred, so a width change grows evenly on both sides.
    <div
      aria-hidden
      data-side={side}
      className="pointer-events-none fixed top-0 left-0 z-50 transition-transform duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none"
      style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
    >
      <div
        className={cn(
          '-translate-x-1/2 transition-[opacity,translate] duration-(--duration-fast) ease-(--ease-out) starting:opacity-0',
          side === 'top' ? '-translate-y-full starting:-translate-y-[calc(100%-4px)]' : 'starting:translate-y-[-4px]',
        )}
      >
        <TooltipBubble
          className="overflow-hidden transition-[width] duration-(--duration-base) ease-(--ease-out) motion-reduce:transition-none"
          style={{ width }}
          label={
            <span key={name} ref={label} className="inline-block shrink-0 transition-opacity duration-(--duration-fast) ease-(--ease-out) starting:opacity-0">
              {name}
            </span>
          }
        />
      </div>
    </div>,
    document.body,
  )
}

export { avatarVariants }
