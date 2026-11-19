/* Type test, never run: CommandPages' props, its part, refs, the control, and its words in SatinLabels. */
import * as React from 'react'
import { CommandMenu } from '@uisatin/ui/command-menu'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  CommandPages,
  CommandPagesAnswer,
  commandPagesLabels,
  type CommandPage,
  type CommandPageGroup,
  type CommandPagesControl,
} from '../components/command-pages'

const stages: CommandPage = {
  title: 'Move deal to…',
  placeholder: 'Pick a stage…',
  groups: [{ label: 'Stages', items: [{ id: 'won', label: 'Won', onSelect: () => {} }] }],
}

const groups: CommandPageGroup[] = [
  {
    label: 'Acme Corp',
    items: [
      { id: 'move', label: 'Move deal to…', page: stages },
      // A page made on the spot, from onSelect.
      { id: 'owner', label: 'Assign owner…', onSelect: (menu) => menu.push({ groups: [] }) },
      { id: 'call', label: 'Log a call', shortcut: '⌘L', keywords: ['phone'], disabled: false, onSelect: (menu) => menu.close() },
    ],
  },
]

// @ts-expect-error: keepOpen is CommandMenu's; CommandPages decides when to stay open
const wrongItem: CommandPageGroup = { label: 'x', items: [{ id: 'a', label: 'A', keepOpen: true }] }

// @ts-expect-error: a page needs its groups
const wrongPage: CommandPage = { title: 'Empty' }

const panelRef = React.createRef<HTMLDivElement>()
const control = React.createRef<CommandPagesControl>()

// Uncontrolled.
export const uncontrolled = <CommandPages ref={panelRef} groups={groups} defaultOpen rootTitle="Acme Corp" hotkey={false} />

// Controlled open and query, the agent, and the moves from outside.
export function Controlled() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [answer, setAnswer] = React.useState('')
  return (
    <>
      <button onClick={() => control.current?.ask('what did Acme say last call')}>Ask about Acme</button>
      <button onClick={() => control.current?.push(stages)}>Move</button>
      <CommandPages
        open={open}
        onOpenChange={setOpen}
        query={query}
        onQueryChange={setQuery}
        groups={groups}
        onAsk={(q: string) => setAnswer(`About ${q}…`)}
        answer={answer}
        answering={false}
        controlRef={control}
        hints={false}
        modal={false}
        container={null}
      />
    </>
  )
}

// The part, as the children of a CommandMenu of your own.
export const part = (
  <CommandMenu groups={[]} defaultOpen>
    <CommandPagesAnswer ref={panelRef} question="what did Acme say last call" answer="Budget approved." answering />
  </CommandMenu>
)

// @ts-expect-error: groups are required
export const missing = <CommandPages />

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels labels={{ close: 'Zamknij', commandAskAbout: (q) => `Zapytaj agenta o „${q}”`, commandBack: 'Wstecz', commandPageOpened: (t) => `${t}. Backspace wraca.` }}>
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ commandAskAbout: 'Zapytaj agenta' }}>{uncontrolled}</SatinLabels>

export const english: string = commandPagesLabels.commandAskAbout('pricing')
export { wrongItem, wrongPage }
