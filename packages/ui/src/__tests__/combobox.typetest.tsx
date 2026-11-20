// Type test for Combobox's creatable option: checked by `npm run typecheck`, never run.
import * as React from 'react'
import { Combobox } from '../components/combobox'
import type { SelectOption } from '../components/select'

const options: SelectOption[] = [{ value: 'react', label: 'React' }]

// Uncontrolled, with `creatable` alone: the option is the query itself.
export const uncontrolled = <Combobox options={options} defaultValue={['react']} creatable ref={React.createRef<HTMLButtonElement>()} />

// Controlled and multiple, with an async onCreate and Apply.
export function Controlled() {
  const [value, setValue] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)
  return (
    <Combobox
      multiple
      footer
      options={options}
      value={value}
      onValueChange={setValue}
      open={open}
      onOpenChange={setOpen}
      creatable={{ label: (query) => <>Add skill “{query}”</> }}
      onCreate={async (query): Promise<SelectOption> => ({ value: query.toLowerCase(), label: query })}
    />
  )
}

// onCreate may answer at once.
export const sync = <Combobox options={options} creatable={{}} onCreate={(query) => ({ value: query, label: query })} />

// creatable is a switch or an object with a row label.
// @ts-expect-error
export const badCreatable = <Combobox options={options} creatable="yes" />

// The row label gets the query.
// @ts-expect-error
export const badRowLabel = <Combobox options={options} creatable={{ label: (query: number) => query }} />

// onCreate returns an option, not a bare value.
// @ts-expect-error
export const badOnCreate = <Combobox options={options} creatable onCreate={(query: string) => query} />

// The ref is the trigger button's.
// @ts-expect-error
export const badRef = <Combobox options={options} creatable ref={React.createRef<HTMLInputElement>()} />
