import * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { cn } from '../lib/utils'

/**
 * Accordion, 1:1 with the uiKit `Accordion / Item` set (4025:3554): sections under a
 * border/subtle rule, 4px top and bottom. The header is a 40px row, 8px in, radius-lg, with an
 * optional 16px lead icon (text/muted), the 14px medium title and a 16px chevron, 12px apart;
 * hover fills it bg/hover, keyboard focus adds the 2px focus ring. Open, the chevron turns up
 * and the content follows in 14px text/muted, 4 / 8 / 12 / 8 in, lined up with the title.
 *
 * Built on the Radix Accordion: the header is a button with aria-expanded, Enter or Space
 * toggles it, arrow keys move between headers. `type="single"` keeps one section open
 * (`collapsible` lets it close too); `type="multiple"` opens any number.
 *
 * Opening, the header stays put and the section grows downwards to its content's height over
 * 250 ms on the kit's ease-out, while the content settles from 98% scale (from its top edge) and
 * 92% opacity to full; closing runs the same way back in 200 ms.
 */
export type AccordionProps = React.ComponentProps<typeof AccordionPrimitive.Root>

export function Accordion({ className, ...props }: AccordionProps) {
  return <AccordionPrimitive.Root data-slot="accordion" className={cn('flex w-full flex-col', className)} {...props} />
}

export interface AccordionItemProps extends Omit<React.ComponentProps<typeof AccordionPrimitive.Item>, 'title'> {
  title: React.ReactNode
  /** A 16px icon before the title. */
  icon?: React.ReactNode
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus'
}

export function AccordionItem({ title, icon, children, className, 'data-force': force, ...props }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item data-slot="accordion-item" className={cn('border-b border-border-subtle py-1', className)} {...props}>
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
          data-force={force}
          className={cn(
            'group flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-left outline-none',
            'transition-[background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
            'hover:bg-bg-hover data-[force=hover]:bg-bg-hover',
            'focus-visible:bg-bg-hover focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
            'data-[force=focus]:bg-bg-hover data-[force=focus]:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {icon && (
            <span aria-hidden className="grid size-4 shrink-0 place-items-center text-text-muted [&_svg]:size-4 [&_svg]:[stroke-width:1.875]">
              {icon}
            </span>
          )}
          <span className="min-w-0 flex-1 text-base leading-[21px] font-medium text-text-default">{title}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="shrink-0 text-text-muted transition-transform duration-(--duration-base) ease-(--ease-out) group-data-[state=open]:rotate-180"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content data-slot="accordion-content" className="satin-accordion-content">
        <div
          className={cn(
            'pt-1 pr-2 pb-3 text-base leading-[21px] text-text-muted',
            // Lined up with the title: past the icon and its gap when there is one.
            icon ? 'pl-9' : 'pl-2',
          )}
        >
          {children}
        </div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
}
