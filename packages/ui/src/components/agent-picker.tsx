import * as React from 'react'
import { DropdownMenu } from 'radix-ui'
import { Check, NavArrowDown, Plus } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'
import type { BadgeTone } from './badge'

/**
 * AgentPicker, from the uiKit Agent picker docs view (3890:47473): a rounded Button with the
 * current agent's avatar, name and a chevron, opening a menu of agents. Menu rows are 1:1
 * with `DropdownMenu/Item` (653:19165): 8px side padding, radius-lg, medium 13/13 label and a
 * 13px text/muted description 4px under it (`layout=stacked`, 20px avatar), or the label alone
 * (`layout=inline`, 16px avatar) when `showDescription` is off. Hover and the selected row
 * fill bg/selected; the selected row also shows a check in status/green, so selection never
 * relies on colour alone. The menu is bg/popover, a border/subtle hairline, radius-xl, 4px
 * padding, 255 wide, with the shadcn sm shadow.
 *
 * Built on Radix DropdownMenu (radio group semantics, arrow keys, typeahead, Escape).
 * The avatar is a small local one on the Badge hue pairs, so this file has no dependency
 * on a separate Avatar component.
 */

export type Agent = {
  id: string
  name: string
  /** One line on what the agent does. */
  description?: string
  /** Two letters for the avatar; taken from the name when left out. */
  initials?: string
  /** Avatar hue, same pairs as Badge. */
  tone?: BadgeTone
}

export interface AgentPickerProps {
  agents: Agent[]
  /** The selected agent's id. */
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  /** Show the one-line description under each name. Turn it off once agents are familiar. */
  showDescription?: boolean
  /** Secondary under the composer, Tertiary inside dense toolbars. */
  variant?: 'secondary' | 'tertiary'
  /** md is the 28px trigger, xs the 24px one. */
  size?: 'md' | 'xs'
  /** Adds a "New agent" action under the list. */
  onCreate?: () => void
  /** Label for the create action. */
  createLabel?: string
  /** Shown on the trigger when nothing is selected. */
  placeholder?: string
  /** Controlled open state, e.g. to show the menu open on a docs stage. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Render the menu in place instead of in a portal. */
  disablePortal?: boolean
  className?: string
}

export function AgentPicker({
  agents,
  value: valueProp,
  defaultValue,
  onValueChange,
  showDescription = true,
  variant = 'secondary',
  size = 'md',
  onCreate,
  createLabel = 'New agent',
  placeholder = 'Choose an agent',
  open,
  defaultOpen,
  onOpenChange,
  disablePortal = false,
  className,
}: AgentPickerProps) {
  const [inner, setInner] = React.useState(defaultValue ?? agents[0]?.id)
  const value = valueProp ?? inner
  const current = agents.find((a) => a.id === value)

  const select = (id: string) => {
    setInner(id)
    onValueChange?.(id)
  }

  const content = (
    <AgentMenu
      agents={agents}
      value={value}
      onValueChange={select}
      showDescription={showDescription}
      onCreate={onCreate}
      createLabel={createLabel}
    />
  )

  return (
    <DropdownMenu.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          variant={variant}
          size={size}
          shape="rounded"
          aria-label={current ? `Agent: ${current.name}` : placeholder}
          className={cn('data-[state=open]:bg-action-secondary-bg-hover', className)}
        >
          {current && <AgentAvatar agent={current} size={16} />}
          <span className="truncate">{current ? current.name : placeholder}</span>
          <NavArrowDown aria-hidden />
        </Button>
      </DropdownMenu.Trigger>
      {disablePortal ? content : <DropdownMenu.Portal>{content}</DropdownMenu.Portal>}
    </DropdownMenu.Root>
  )
}

function AgentMenu({
  agents,
  value,
  onValueChange,
  showDescription,
  onCreate,
  createLabel,
}: {
  agents: Agent[]
  value?: string
  onValueChange: (id: string) => void
  showDescription: boolean
  onCreate?: () => void
  createLabel: string
}) {
  return (
    <DropdownMenu.Content
      align="start"
      sideOffset={8}
      className={cn(
        'z-50 flex w-[255px] max-w-[520px] flex-col gap-1 rounded-xl border border-border-subtle bg-bg-popover p-1 outline-none',
        '[box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
        'data-[state=open]:[animation:satin-enter_var(--duration-fast)_var(--ease-out)]',
      )}
    >
      <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange} className="flex flex-col">
        {agents.map((agent) => (
          <AgentMenuItem key={agent.id} agent={agent} showDescription={showDescription} />
        ))}
      </DropdownMenu.RadioGroup>
      {onCreate && (
        <DropdownMenu.Item
          onSelect={onCreate}
          className={cn(
            'flex h-control-height-xs items-center gap-1 self-start rounded-md px-2 text-sm font-medium text-text-default outline-none select-none',
            'transition-[background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out)',
            '[&_svg]:size-icon-size-sm [&_svg]:text-text-muted [&_svg]:[stroke-width:1.875]',
            'data-highlighted:bg-bg-hover',
          )}
        >
          <Plus aria-hidden />
          {createLabel}
        </DropdownMenu.Item>
      )}
    </DropdownMenu.Content>
  )
}

export interface AgentMenuItemProps
  extends Omit<React.ComponentProps<typeof DropdownMenu.RadioItem>, 'value' | 'children'> {
  agent: Agent
  showDescription?: boolean
  'data-force'?: 'hover'
}

/** One row of the menu, `DropdownMenu/Item` (653:19165). Must sit inside the picker's radio group. */
export function AgentMenuItem({ agent, showDescription = true, className, ...props }: AgentMenuItemProps) {
  const stacked = showDescription && !!agent.description
  return (
    <DropdownMenu.RadioItem
      value={agent.id}
      className={cn(agentRowClass, className)}
      {...props}
    >
      <AgentAvatar agent={agent} size={stacked ? 20 : 16} />
      <AgentRowText agent={agent} stacked={stacked} />
      <DropdownMenu.ItemIndicator className="flex shrink-0">
        <Check aria-hidden className="size-icon-size text-status-green-fg [stroke-width:1.875]" />
      </DropdownMenu.ItemIndicator>
    </DropdownMenu.RadioItem>
  )
}

const agentRowClass = cn(
  'flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none select-none',
  'transition-[background-color] duration-(--duration-fast) ease-(--ease-out)',
  'data-highlighted:bg-bg-selected data-[force=hover]:bg-bg-selected data-[state=checked]:bg-bg-selected',
)

function AgentRowText({ agent, stacked }: { agent: Agent; stacked: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
      <span className="text-sm leading-[13px] font-medium text-text-default">{agent.name}</span>
      {stacked && <span className="text-sm font-normal text-text-muted">{agent.description}</span>}
    </span>
  )
}

/**
 * A static menu row for state sheets and docs (no menu around it): the same look as a menu
 * item, with `state` forced to default, hover or selected.
 */
export function AgentPickerRow({
  agent,
  state = 'default',
  showDescription = true,
  className,
}: {
  agent: Agent
  state?: 'default' | 'hover' | 'selected'
  showDescription?: boolean
  className?: string
}) {
  const stacked = showDescription && !!agent.description
  return (
    <div
      data-force={state === 'hover' ? 'hover' : undefined}
      data-state={state === 'selected' ? 'checked' : undefined}
      className={cn(agentRowClass, className)}
    >
      <AgentAvatar agent={agent} size={stacked ? 20 : 16} />
      <AgentRowText agent={agent} stacked={stacked} />
      {state === 'selected' && (
        <Check aria-hidden className="size-icon-size shrink-0 text-status-green-fg [stroke-width:1.875]" />
      )}
    </div>
  )
}

/**
 * Initials on a Badge hue pair, round. 16px uses semibold 7/8, 20px semibold 9/10, as on
 * the uiKit Avatar (992:20199). These sizes have no type token, so they stay raw.
 */
export function AgentAvatar({ agent, size = 16 }: { agent: Agent; size?: 16 | 20 }) {
  const initials = agent.initials ?? toInitials(agent.name)
  return (
    <span
      aria-hidden
      data-tone={agent.tone ?? 'brand'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-tone-bg font-semibold tracking-normal text-tone-fg',
        size === 16 ? 'size-4 text-[7px] leading-2' : 'size-5 text-[9px] leading-[10px]',
      )}
    >
      {initials}
    </span>
  )
}

function toInitials(name: string) {
  const words = name.trim().split(/\s+/)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)
  return letters.toUpperCase()
}
