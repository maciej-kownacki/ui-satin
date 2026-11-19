/* Type test, never run: PeoplePicker's props (controlled and not), its sources, ref, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import { PeoplePicker, type PeopleGroup, type Person } from '../components/people-picker'

const marta: Person = { id: 'marta', name: 'Marta Nowak', role: 'Hiring manager', tone: 'plum' }
const ola: Person = { id: 'ola', name: 'Ola Wiśniewska', email: 'ola@example.com', avatar: '/ola.png', disabled: true }
const teams: PeopleGroup[] = [{ label: 'Design', people: [marta, ola] }]

// @ts-expect-error: a person needs a name
const nameless: Person = { id: 'x' }

// @ts-expect-error: not an Avatar tone
const wrongTone: Person = { id: 'x', name: 'X', tone: 'orange' }

const triggerRef = React.createRef<HTMLButtonElement>()

export function Controlled() {
  const [panel, setPanel] = React.useState<Person[]>([marta])
  return <PeoplePicker ref={triggerRef} label="Panel" multiple people={[marta, ola]} recent={[marta]} value={panel} onValueChange={setPanel} maxChips={3} />
}

export const uncontrolled = <PeoplePicker aria-label="Owner" groups={teams} defaultValue={[ola]} defaultOpen footer />

export const searched = (
  <PeoplePicker
    label="Reviewers"
    multiple
    searchDelay={300}
    search={async (query, { signal }) => {
      const res = await fetch(`/people?q=${encodeURIComponent(query)}`, { signal })
      return (await res.json()) as Person[]
    }}
    onOpenChange={(open: boolean) => open}
    wrapperClassName="w-80"
  />
)

// A search may answer with groups too.
export const searchedGroups = <PeoplePicker aria-label="Owner" search={async () => teams} />

// @ts-expect-error: value holds people, not ids
export const ids = <PeoplePicker people={[marta]} value={['marta']} />

// @ts-expect-error: the picker builds its own options
export const options = <PeoplePicker people={[marta]} options={[]} />

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels labels={{ recentPeople: 'Ostatnie', searchPeople: 'Szukaj osób…', noPeopleFound: (q) => `Nikt nie pasuje do „${q}”`, removeItem: (n) => `Usuń ${n}` }}>
    <Controlled />
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ noPeopleFound: 'Nikt' }}>{uncontrolled}</SatinLabels>

export { nameless, wrongTone }
