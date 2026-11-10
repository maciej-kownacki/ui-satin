'use client'

import * as React from 'react'
import { HoverCard } from 'radix-ui'
import { ArrowUpRight, NavArrowDown, NavArrowUp, Xmark } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * Attachment, 1:1 with the uiKit `Attachment` set (3141:20409), plus `AttachmentGroup`
 * (3144:21146) and `AttachmentPreview` (3142:20419).
 *
 * - size `sm`: a 28px chip — 16px file icon, medium 13 name (max 200, truncated), remove button.
 *   Radius-md, or full when `shape="rounded"`.
 * - size `lg`: a 32px icon tile (bg/muted) + name + 12px text/muted meta line. Radius-xl with 6px
 *   vertical padding (52 high), or full with 4px (48 high).
 * - States: default bg/popover, border/default, 0 1 1 shadow-xs. Hover border/strong (sm also
 *   turns bg/canvas). Pressed bg/muted, border/strong, and the lg tile turns bg/card. Focus keeps
 *   border/default and adds the 2px focus ring. All answer to `data-force` as well.
 * - The remove button is the DS Button (tertiary, xs, icon only, rounded), as in Figma.
 * - The whole chip opens the file (`onOpen`); `preview` shows an AttachmentPreview above it on hover.
 */

export interface AttachmentProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  name: string
  /** Type and size, e.g. "PDF · 2.4 MB". Shown on `lg` only. */
  meta?: string
  /** File type icon. Defaults to the PDF icon. */
  icon?: React.ReactNode
  size?: 'sm' | 'lg'
  /** Rounded inside the composer and chat, Default inside cards and tables. */
  shape?: 'default' | 'rounded'
  /** Shows the remove button. Leave it out once the message is sent. */
  onRemove?: () => void
  onOpen?: () => void
  /** Content for the hover preview, usually an `<AttachmentPreview>`. */
  preview?: React.ReactNode
  'data-force'?: 'hover' | 'pressed' | 'focus'
}

export function Attachment({
  className,
  name,
  meta,
  icon,
  size = 'lg',
  shape = 'default',
  onRemove,
  onOpen,
  preview,
  ...props
}: AttachmentProps) {
  const fileIcon = icon ?? <FileIcon type="pdf" />
  const lg = size === 'lg'
  const rounded = shape === 'rounded'

  const chip = (
    <div
      data-slot="attachment"
      className={cn(
        'group/attachment relative inline-flex max-w-full shrink-0 items-center border border-border-default bg-bg-popover',
        '[box-shadow:0_1px_1px_0_var(--effect-shadow-xs)]',
        'transition-[background-color,border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
        lg ? 'gap-2.5 px-2' : 'h-control-height gap-1.5 pl-2',
        !lg && (onRemove ? 'pr-0.5' : 'pr-2.5'),
        lg && (rounded ? 'rounded-pill py-1' : 'rounded-xl py-1.5'),
        !lg && (rounded ? 'rounded-pill' : 'rounded-md'),
        // Hover (satin-pressed, declared later, wins while pressed)
        'satin-hover:border-border-strong',
        !lg && 'satin-hover:bg-bg-canvas',
        // Pressed
        'satin-pressed:border-border-strong satin-pressed:bg-bg-muted',
        // Focus
        'has-[[data-attachment-main]:focus-visible]:border-border-default has-[[data-attachment-main]:focus-visible]:bg-bg-popover',
        'has-[[data-attachment-main]:focus-visible]:[box-shadow:0_1px_2px_0_var(--effect-shadow-xs),0_0_0_2px_var(--action-focus-ring)]',
        'data-[force=focus]:border-border-default data-[force=focus]:bg-bg-popover',
        'data-[force=focus]:[box-shadow:0_1px_2px_0_var(--effect-shadow-xs),0_0_0_2px_var(--action-focus-ring)]',
        className,
      )}
      {...props}
    >
      <button
        type="button"
        data-attachment-main=""
        onClick={onOpen}
        className={cn(
          'flex min-w-0 items-center text-left outline-none',
          // The whole chip is the click target; the remove button sits above it.
          'after:absolute after:inset-0 after:rounded-[inherit]',
          lg ? 'gap-2.5' : 'gap-1.5',
        )}
      >
        {lg ? (
          <>
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center bg-bg-muted [&_svg]:size-icon-size',
                rounded ? 'rounded-xl' : 'rounded-md',
                'group-active/attachment:bg-bg-card group-data-[force=pressed]/attachment:bg-bg-card',
              )}
            >
              {fileIcon}
            </span>
            <span className="flex min-w-0 flex-col">
              <span data-attachment-name="" className="max-w-[200px] truncate text-sm font-medium text-text-default">{name}</span>
              {meta && <span className="sr-only">, </span>}
              {meta && <span className="truncate text-xs text-text-muted">{meta}</span>}
            </span>
          </>
        ) : (
          <>
            <span className="flex shrink-0 [&_svg]:size-icon-size">{fileIcon}</span>
            <span data-attachment-name="" className="max-w-[200px] truncate text-sm font-medium text-text-default">{name}</span>
            {meta && <span className="sr-only">, {meta}</span>}
          </>
        )}
      </button>
      {onRemove && (
        <Button
          variant="tertiary"
          size="xs"
          shape="rounded"
          iconOnly
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          className="relative z-10"
        >
          <Xmark aria-hidden />
        </Button>
      )}
    </div>
  )

  if (!preview) return chip
  return (
    <HoverCard.Root openDelay={300} closeDelay={100}>
      <HoverCard.Trigger asChild>{chip}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-50 outline-none data-[state=open]:[animation:satin-enter_var(--duration-fast)_var(--ease-out)]"
        >
          {preview}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}

export interface AttachmentGroupProps extends React.ComponentProps<'div'> {}

/** AttachmentGroup (3144:21146): files wrap onto new rows at 576px, 4px apart. */
export function AttachmentGroup({ className, ...props }: AttachmentGroupProps) {
  return (
    <div
      data-slot="attachment-group"
      className={cn('flex max-w-[576px] flex-wrap items-start gap-1 [&>*]:shrink-0', className)}
      {...props}
    />
  )
}

export interface AttachmentPreviewProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  name: string
  icon?: React.ReactNode
  /** The first page or the first rows. Scrolls inside a fixed 176px viewport. */
  children?: React.ReactNode
  /** Left side of the footer: an `AttachmentPreviewPager` or `AttachmentPreviewSheets`. */
  navigation?: React.ReactNode
  onOpen?: () => void
  openLabel?: string
}

/**
 * AttachmentPreview (3142:20419): 296 wide, bg/popover, border/default, radius-xl, shadcn md
 * shadow. A header with the file, a 176px scrolling viewport with a fade at the bottom, a
 * border/subtle divider and a footer that moves between pages or sheets and opens the file.
 */
export function AttachmentPreview({
  className,
  name,
  icon,
  children,
  navigation,
  onOpen,
  openLabel = 'Open',
  ...props
}: AttachmentPreviewProps) {
  return (
    <div
      data-slot="attachment-preview"
      className={cn(
        'flex w-[296px] flex-col overflow-clip rounded-xl border border-border-default bg-bg-popover',
        '[box-shadow:0_4px_6px_-1px_var(--effect-shadow-sm),0_2px_4px_-2px_var(--effect-shadow-sm)]',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 px-3 py-2 [&_svg]:size-icon-size">
        <span className="flex shrink-0">{icon ?? <FileIcon type="pdf" />}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-default">{name}</span>
      </div>
      <div className="relative">
        <div
          tabIndex={0}
          aria-label={`Preview of ${name}`}
          className={cn(
            'h-[176px] overflow-x-clip overflow-y-auto pr-4 pl-3 outline-none',
            '[scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]',
            'focus-visible:[box-shadow:inset_0_0_0_2px_var(--action-focus-ring)]',
          )}
        >
          <div className="flex flex-col gap-2 pt-2 pb-3">{children}</div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute right-2.5 bottom-0 left-0 h-8 bg-linear-to-b from-transparent to-bg-popover"
        />
      </div>
      <div className="h-px bg-border-subtle" />
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1">{navigation}</div>
        <Button variant="tertiary" size="xs" onClick={onOpen}>
          {openLabel}
          <ArrowUpRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}

/** Document footer: previous / next section and "Page 1 of 3". */
export function AttachmentPreviewPager({
  page,
  total,
  onPrevious,
  onNext,
}: {
  page: number
  total: number
  onPrevious?: () => void
  onNext?: () => void
}) {
  return (
    <>
      <Button variant="tertiary" size="xs" shape="rounded" iconOnly aria-label="Previous section" disabled={page <= 1} onClick={onPrevious}>
        <NavArrowUp aria-hidden />
      </Button>
      <Button variant="tertiary" size="xs" shape="rounded" iconOnly aria-label="Next section" disabled={page >= total} onClick={onNext}>
        <NavArrowDown aria-hidden />
      </Button>
      <span className="text-xs whitespace-nowrap text-text-muted" aria-live="polite">
        Page {page} of {total}
      </span>
    </>
  )
}

/** Spreadsheet footer: one tab per sheet; the current one is filled bg/muted. */
export function AttachmentPreviewSheets({
  sheets,
  value,
  onValueChange,
}: {
  sheets: string[]
  value: string
  onValueChange?: (sheet: string) => void
}) {
  return (
    <div role="tablist" aria-label="Sheets" className="flex items-center gap-1">
      {sheets.map((sheet) => {
        const selected = sheet === value
        return (
          <button
            key={sheet}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onValueChange?.(sheet)}
            className={cn(
              'rounded-sm px-2 py-0.5 text-xs whitespace-nowrap outline-none',
              'transition-[background-color,color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
              'focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]',
              selected ? 'bg-bg-muted text-text-default' : 'text-text-muted hover:text-text-default',
            )}
          >
            {sheet}
          </button>
        )
      })}
    </div>
  )
}

/**
 * File type icons from uiKit `icon` (filePdf 3138:39947, fileXlsx 3138:39967). They keep their
 * own colours (library primitives), so they don't follow currentColor.
 */
export function FileIcon({ type, className }: { type: 'pdf' | 'xlsx'; className?: string }) {
  const page = type === 'pdf' ? 'var(--color-red-500)' : 'var(--color-green-700)'
  const fold = type === 'pdf' ? 'var(--color-red-300)' : 'var(--color-green-300)'
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={cn('size-icon-size shrink-0', className)}>
      <path
        d="M2.66673 3.33327C2.66673 2.22873 3.56218 1.33327 4.66673 1.33327H5.72127C5.86673 1.33327 6.00339 1.36788 6.13127 1.43709L13.1416 5.22945C13.2695 5.29867 13.3335 5.406 13.3335 5.55145V12.6665C13.3335 13.7711 12.438 14.6665 11.3335 14.6665H4.66673C3.56218 14.6665 2.66673 13.7711 2.66673 12.6665V3.33327Z"
        fill={page}
      />
      <path
        d="M5.93945 1.33327L13.3335 5.33327L10.8985 6.92509C10.2898 7.32303 9.78648 7.21764 9.38855 6.60891L5.93945 1.33327Z"
        fill={fold}
      />
      {type === 'pdf' ? (
        <g fill="var(--color-white)">
          <path d="M4.62457 12.9938V10.3491H5.66796C5.86855 10.3491 6.03943 10.3874 6.18062 10.4641C6.3218 10.5398 6.42941 10.6453 6.50345 10.7804C6.57835 10.9147 6.61579 11.0697 6.61579 11.2453C6.61579 11.4209 6.57792 11.5759 6.50216 11.7102C6.4264 11.8445 6.31664 11.9491 6.17287 12.024C6.02996 12.0989 5.85693 12.1363 5.65376 12.1363H4.98873V11.6882H5.56337C5.67098 11.6882 5.75965 11.6697 5.82938 11.6327C5.89997 11.5948 5.95248 11.5428 5.98692 11.4765C6.02222 11.4093 6.03986 11.3323 6.03986 11.2453C6.03986 11.1575 6.02222 11.0809 5.98692 11.0155C5.95248 10.9492 5.89997 10.898 5.82938 10.8618C5.75879 10.8248 5.66925 10.8063 5.56078 10.8063H5.18372V12.9938H4.62457Z" />
          <path d="M7.91648 12.9938H6.97898V10.3491H7.92423C8.19024 10.3491 8.41923 10.4021 8.61121 10.508C8.80319 10.613 8.95083 10.7641 9.05413 10.9612C9.1583 11.1584 9.21038 11.3943 9.21038 11.6689C9.21038 11.9444 9.1583 12.1811 9.05413 12.3791C8.95083 12.5771 8.80233 12.729 8.60863 12.8349C8.41579 12.9408 8.18507 12.9938 7.91648 12.9938ZM7.53812 12.5147H7.89323C8.05852 12.5147 8.19756 12.4854 8.31033 12.4269C8.42397 12.3675 8.5092 12.2758 8.56601 12.1518C8.62369 12.027 8.65253 11.866 8.65253 11.6689C8.65253 11.4735 8.62369 11.3138 8.56601 11.1898C8.5092 11.0658 8.4244 10.9746 8.31162 10.916C8.19885 10.8575 8.05981 10.8282 7.89453 10.8282H7.53812V12.5147Z" />
          <path d="M9.62457 12.9938V10.3491H11.3756V10.8101H10.1837V11.4403H11.2594V11.9013H10.1837V12.9938H9.62457Z" />
        </g>
      ) : (
        <g fill="var(--color-white)">
          <path d="M4.54258 10.5469L4.99589 11.3131H5.01346L5.46897 10.5469H6.00571L5.31969 11.6709L6.02107 12.7949H5.47446L5.01346 12.0276H4.99589L4.53489 12.7949H3.99047L4.69405 11.6709L4.00364 10.5469H4.54258Z" />
          <path d="M6.30646 12.7949V10.5469H6.78173V12.403H7.74544V12.7949H6.30646Z" />
          <path d="M9.27965 11.1934C9.27086 11.1049 9.23318 11.0361 9.16659 10.9871C9.1 10.9381 9.00963 10.9135 8.89548 10.9135C8.81791 10.9135 8.75242 10.9245 8.699 10.9465C8.64559 10.9677 8.60461 10.9973 8.57607 11.0354C8.54826 11.0734 8.53436 11.1166 8.53436 11.1649C8.5329 11.2051 8.54131 11.2403 8.5596 11.2703C8.57863 11.3003 8.60461 11.3263 8.63754 11.3482C8.67046 11.3694 8.70852 11.3881 8.75169 11.4042C8.79486 11.4196 8.84096 11.4327 8.88999 11.4437L9.09195 11.492C9.19001 11.5139 9.28001 11.5432 9.36197 11.5798C9.44392 11.6164 9.5149 11.6614 9.57491 11.7148C9.63491 11.7682 9.68138 11.8312 9.71431 11.9036C9.74797 11.976 9.76516 12.0591 9.76589 12.1528C9.76516 12.2903 9.73004 12.4096 9.66052 12.5106C9.59174 12.6108 9.49222 12.6888 9.36197 12.7444C9.23245 12.7993 9.07622 12.8267 8.89328 12.8267C8.71181 12.8267 8.55375 12.7989 8.41911 12.7433C8.2852 12.6877 8.18056 12.6054 8.10519 12.4963C8.03055 12.3866 7.9914 12.2508 7.98774 12.0891H8.44765C8.45277 12.1645 8.47436 12.2274 8.51241 12.2779C8.55119 12.3277 8.60278 12.3653 8.66717 12.3909C8.7323 12.4158 8.80584 12.4283 8.88779 12.4283C8.96829 12.4283 9.03817 12.4166 9.09744 12.3931C9.15744 12.3697 9.20391 12.3372 9.23684 12.2955C9.26977 12.2537 9.28623 12.2058 9.28623 12.1517C9.28623 12.1012 9.27123 12.0587 9.24123 12.0243C9.21196 11.9899 9.16879 11.9607 9.11171 11.9365C9.05536 11.9124 8.98621 11.8904 8.90426 11.8707L8.65949 11.8092C8.46997 11.7631 8.32032 11.691 8.21056 11.593C8.1008 11.4949 8.04628 11.3628 8.04701 11.1967C8.04628 11.0606 8.0825 10.9417 8.15568 10.84C8.22959 10.7383 8.33093 10.6589 8.45972 10.6018C8.58851 10.5447 8.73486 10.5162 8.89877 10.5162C9.06561 10.5162 9.21123 10.5447 9.33562 10.6018C9.46075 10.6589 9.55808 10.7383 9.62759 10.84C9.69711 10.9417 9.73296 11.0595 9.73516 11.1934H9.27965Z" />
          <path d="M10.5312 10.5469L10.9845 11.3131H11.0021L11.4576 10.5469H11.9943L11.3083 11.6709L12.0097 12.7949H11.4631L11.0021 12.0276H10.9845L10.5235 12.7949H9.97911L10.6827 11.6709L9.99228 10.5469H10.5312Z" />
        </g>
      )}
    </svg>
  )
}
