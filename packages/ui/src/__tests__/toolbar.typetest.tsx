/* Type test, never run: Toolbar and its items, with refs, controlled and uncontrolled toggles. */
import * as React from 'react'
import { DropdownMenu, DropdownMenuItem } from '../components/dropdown'
import { Toolbar, ToolbarButton, ToolbarSeparator, ToolbarToggle } from '../components/toolbar'

const Icon = () => <svg aria-hidden />

export function Formatting() {
  const [bold, setBold] = React.useState(false)
  return (
    <Toolbar aria-label="Formatting" size="md" variant="floating" orientation="horizontal" loop={false} dir="rtl" preventFocusOnPress ref={React.createRef<HTMLDivElement>()}>
      <DropdownMenu trigger={<ToolbarButton>Paragraph</ToolbarButton>}>
        <DropdownMenuItem label="Heading 1" />
      </DropdownMenu>
      <ToolbarSeparator ref={React.createRef<HTMLDivElement>()} />
      <ToolbarToggle icon={<Icon />} label="Bold" shortcut="⌘B" pressed={bold} onPressedChange={setBold} ref={React.createRef<HTMLButtonElement>()} />
      <ToolbarToggle icon={<Icon />} label="Italic" defaultPressed tooltip={false} />
      <ToolbarButton icon={<Icon />} label="Link" onClick={() => {}} ref={React.createRef<HTMLButtonElement>()} />
      <ToolbarButton variant="primary">Save</ToolbarButton>
    </Toolbar>
  )
}

// @ts-expect-error a toolbar is sm or md
export const wrongSize = <Toolbar aria-label="x" size="lg" />

// @ts-expect-error a toolbar is plain or floating
export const wrongVariant = <Toolbar aria-label="x" variant="outline" />

// @ts-expect-error the toolbar sets the item's size
export const itemSize = <ToolbarButton size="xs" />

// @ts-expect-error a toolbar toggle is always ghost
export const toggleVariant = <ToolbarToggle variant="outline" />
