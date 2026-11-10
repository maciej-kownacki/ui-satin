'use client'

import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cva } from 'class-variance-authority'
import { cn } from '../lib/utils'
import { useSlidingIndicator } from './sliding-indicator'

/**
 * Tabs, 1:1 with the uiKit `Tabs` (3635:18677) and `tabs/item` (3635:18591) sets.
 *
 * Underline: tabs 32px apart on a 1px border/default rule; md is 36px high with a 14px label,
 * sm 32px with 13px. The selected tab has a 2px action/primary indicator sitting on the rule;
 * hover shows it in border/strong. Focus draws a 1.5px border/focus ring around the label.
 *
 * Pill: tabs 4px apart, radius-full; md 32px high with 12px sides, sm 28px with 10px. Hover
 * fills bg/muted, selected bg/selected, focus a 1px border/focus ring.
 *
 * The selected tab's indicator (the underline's 2px bar, the pill's bg/selected) is one element
 * that slides from tab to tab under the labels, as in the Segmented control and Pagination
 * (sliding-indicator.tsx): 300 ms, the leading edge first.
 *
 * Labels are text/muted, text/default on hover, focus and selected; disabled is 50%. Optional
 * 16px leading icon, 6px from the label. Built on the Radix Tabs (arrow keys move between tabs).
 * States answer to `data-force="hover" | "focus"` for state sheets.
 */
export type TabItem =
  | string
  | {
      value: string
      label: React.ReactNode
      /** 16px leading icon. */
      icon?: React.ReactNode
      disabled?: boolean
    }

export interface TabsProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  variant?: 'underline' | 'pill'
  size?: 'md' | 'sm'
  /** Disable every tab. */
  disabled?: boolean
  /** Accessible name for the tab list. */
  'aria-label'?: string
  /** `TabsContent` panels, one per item value. */
  children?: React.ReactNode
  className?: string
}

const list = cva('relative flex', {
  variants: {
    variant: {
      // The rule is an inset shadow, so the 2px indicator can sit on top of it (as in Figma).
      underline: 'items-end gap-8 [box-shadow:inset_0_-1px_0_var(--border-default)]',
      pill: 'items-center gap-1',
    },
  },
})

const trigger = cva(
  [
    'group/tab relative flex shrink-0 items-center font-medium whitespace-nowrap text-text-muted select-none',
    'transition-[color,background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
    'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
    'satin-hover:text-text-default satin-focus:text-text-default data-[state=active]:text-text-default',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:[stroke-width:1.875]',
  ],
  {
    variants: {
      variant: {
        underline: '',
        pill: [
          'rounded-pill',
          'data-[state=inactive]:satin-hover:bg-bg-muted',
          'satin-focus:[box-shadow:0_0_0_1px_var(--border-focus)]',
        ],
      },
      size: {
        md: 'text-base',
        sm: 'text-sm',
      },
    },
    compoundVariants: [
      { variant: 'underline', size: 'md', className: 'h-control-height-xl' },
      { variant: 'underline', size: 'sm', className: 'h-control-height-lg' },
      { variant: 'pill', size: 'md', className: 'h-control-height-lg px-3' },
      { variant: 'pill', size: 'sm', className: 'h-control-height px-2.5' },
    ],
  },
)

function normalize(item: TabItem) {
  return typeof item === 'string' ? { value: item, label: item as React.ReactNode } : item
}

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = 'underline',
  size = 'md',
  disabled = false,
  children,
  className,
  ...props
}: TabsProps) {
  const tabs = items.map(normalize)
  const listRef = React.useRef<HTMLDivElement>(null)
  // Uncontrolled tabs: follow the selection here too, so the indicator knows when to move.
  const [current, setCurrent] = React.useState(value ?? defaultValue ?? tabs[0]?.value)
  const selected = value ?? current
  const indicator = useSlidingIndicator(listRef, '[role="tab"][data-state="active"]', `${selected}|${variant}|${size}|${tabs.length}`)

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      value={value}
      defaultValue={defaultValue ?? (value === undefined ? tabs[0]?.value : undefined)}
      onValueChange={(v) => {
        setCurrent(v)
        onValueChange?.(v)
      }}
      className={cn('flex flex-col', className)}
    >
      <TabsPrimitive.List ref={listRef} aria-label={props['aria-label']} className={list({ variant })}>
        <span
          ref={indicator.ref}
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-0 opacity-0',
            variant === 'underline' ? 'bottom-0 z-10 h-0.5 rounded-full bg-action-primary-bg' : 'top-1/2 z-0 -translate-y-1/2 rounded-pill bg-bg-selected',
            variant === 'pill' && (size === 'md' ? 'h-control-height-lg' : 'h-control-height'),
          )}
        />
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            disabled={disabled || tab.disabled}
            // Without TabsContent there is no panel to point at.
            {...(children == null && { 'aria-controls': undefined })}
            className={cn(
              trigger({ variant, size }),
              variant === 'pill' && 'z-10',
              // Before the indicator is placed (server render), the selected tab paints its own.
              !indicator.ready && variant === 'pill' && 'data-[state=active]:bg-bg-selected',
            )}
          >
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-sm',
                variant === 'underline' &&
                  'group-focus-visible/tab:[box-shadow:inset_0_0_0_1.5px_var(--border-focus)] group-data-[force=focus]/tab:[box-shadow:inset_0_0_0_1.5px_var(--border-focus)]',
              )}
            >
              {tab.icon}
              {tab.label}
            </span>
            {variant === 'underline' && (
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-transparent',
                  'transition-colors duration-(--duration-fast) ease-(--ease-out)',
                  'group-data-[state=inactive]/tab:group-hover/tab:bg-border-strong group-data-[state=inactive]/tab:group-data-[force=hover]/tab:bg-border-strong',
                  !indicator.ready && 'group-data-[state=active]/tab:bg-action-primary-bg',
                )}
              />
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  )
}

/** The panel for one tab value. */
export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('rounded-md focus-visible:shadow-border-focus focus-visible:outline-none', className)} {...props} />
}
