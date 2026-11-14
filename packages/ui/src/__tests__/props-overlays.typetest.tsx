/**
 * Type-checked only, never run: every overlay, menu and citation component takes ordinary HTML
 * attributes and a `ref` of the right element type on its primary element.
 */
import * as React from 'react'
import { Dialog } from '../components/dialog'
import { Sheet } from '../components/sheet'
import { Popover, PopoverPanel } from '../components/popover'
import { HoverCard } from '../components/hover-card'
import { Tooltip } from '../components/tooltip'
import { CommandMenu } from '../components/command-menu'
import { ContextMenu, ContextMenuSub } from '../components/context-menu'
import { DropdownMenu } from '../components/dropdown'
import { Tabs } from '../components/tabs'
import { Citation, Sources } from '../components/citations'

const common = {
  id: 'x',
  'data-testid': 'x',
  'aria-describedby': 'x',
  onKeyDown: () => {},
  style: { color: 'red' },
} as const

export function PropsOverlays() {
  const source = { title: 'x', origin: 'x', href: 'https://example.com' }
  return (
    <>
      <Dialog title="x" {...common} ref={React.createRef<HTMLDivElement>()} />
      <Sheet title="x" {...common} ref={React.createRef<HTMLDivElement>()} />
      <Popover title="x" {...common} ref={React.createRef<HTMLDivElement>()}>
        <button type="button">x</button>
      </Popover>
      <PopoverPanel title="x" {...common} ref={React.createRef<HTMLDivElement>()} />
      <HoverCard trigger={<a href="#x">x</a>} {...common} ref={React.createRef<HTMLDivElement>()}>
        x
      </HoverCard>
      <Tooltip label="x" {...common} ref={React.createRef<HTMLDivElement>()}>
        <button type="button">x</button>
      </Tooltip>
      <CommandMenu groups={[]} {...common} ref={React.createRef<HTMLDivElement>()} />
      <ContextMenu trigger={<div>x</div>} {...common} ref={React.createRef<HTMLDivElement>()}>
        <ContextMenuSub label="x" {...common} ref={React.createRef<HTMLDivElement>()}>
          x
        </ContextMenuSub>
      </ContextMenu>
      <DropdownMenu trigger={<button type="button">x</button>} {...common} ref={React.createRef<HTMLDivElement>()}>
        x
      </DropdownMenu>
      <Tabs items={['a', 'b']} {...common} aria-label="x" ref={React.createRef<HTMLDivElement>()} />
      <Citation index={1} source={source} {...common} ref={React.createRef<HTMLAnchorElement>()} />
      <Sources sources={[source]} {...common} ref={React.createRef<HTMLDivElement>()} />
    </>
  )
}

// The wrong element type is rejected.
// @ts-expect-error Citation's ref is an anchor, not a div
export const wrongRef = <Citation index={1} source={{ title: 'x' }} ref={React.createRef<HTMLDivElement>()} />
