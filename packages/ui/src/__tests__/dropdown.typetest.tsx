/**
 * Type-checked only, never run: DropdownMenu's submenu and checkable parts, controlled and
 * uncontrolled, with a `ref` of the right element type on each part that renders one.
 */
import * as React from 'react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  type DropdownMenuCheckboxItemProps,
  type DropdownMenuRadioGroupProps,
} from '../components/dropdown'

export function Uncontrolled() {
  return (
    <DropdownMenu trigger={<button type="button">⋯</button>} dir="rtl">
      <DropdownMenuSub defaultOpen>
        <DropdownMenuSubTrigger label="Move to" icon={<svg />} layout="inline" ref={React.createRef<HTMLDivElement>()} />
        <DropdownMenuSubContent ref={React.createRef<HTMLDivElement>()} container={null}>
          <DropdownMenuRadioGroup defaultValue="screening" ref={React.createRef<HTMLDivElement>()}>
            <DropdownMenuRadioItem value="screening" label="Screening" ref={React.createRef<HTMLDivElement>()} />
            <DropdownMenuRadioItem value="offer" label="Offer" disabled closeOnSelect={false} />
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuGroup label="Show columns">
        <DropdownMenuCheckboxItem label="Interview" defaultChecked ref={React.createRef<HTMLDivElement>()} />
        <DropdownMenuCheckboxItem label="All" defaultChecked="indeterminate" closeOnSelect />
      </DropdownMenuGroup>
    </DropdownMenu>
  )
}

export function Controlled() {
  const [open, setOpen] = React.useState(false)
  const [stage, setStage] = React.useState('screening')
  const [shown, setShown] = React.useState(true)
  return (
    <DropdownMenu trigger={<button type="button">⋯</button>} open={open} onOpenChange={setOpen}>
      <DropdownMenuSub open={open} onOpenChange={(next: boolean) => setOpen(next)}>
        <DropdownMenuSubTrigger label="Move to" />
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup label="Stage" value={stage} onValueChange={(v: string) => setStage(v)}>
            <DropdownMenuRadioItem value="screening" label="Screening" shortcut="1" />
          </DropdownMenuRadioGroup>
          <DropdownMenuItem label="Archive" />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuCheckboxItem label="Interview" checked={shown} onCheckedChange={(on: boolean) => setShown(on)} />
    </DropdownMenu>
  )
}

// A checkbox row's state is a boolean or 'indeterminate'; a radio group's value is a string.
export const checked: DropdownMenuCheckboxItemProps['checked'] = 'indeterminate'
export const value: DropdownMenuRadioGroupProps['value'] = 'screening'

// @ts-expect-error a radio row needs its value
export const noValue = <DropdownMenuRadioItem label="Screening" />
// @ts-expect-error rows take a string label, like DropdownMenuItem
export const noLabel = <DropdownMenuCheckboxItem checked />
// @ts-expect-error the direction is ltr or rtl
export const wrongDir = <DropdownMenu trigger={<button type="button">x</button>} dir="auto">x</DropdownMenu>
// @ts-expect-error a checkbox row reports a boolean, not a string
export const wrongHandler = <DropdownMenuCheckboxItem label="x" onCheckedChange={(v: string) => v} />
// @ts-expect-error the submenu's row is a div, not a button
export const wrongRef = <DropdownMenuSubTrigger label="x" ref={React.createRef<HTMLButtonElement>()} />
