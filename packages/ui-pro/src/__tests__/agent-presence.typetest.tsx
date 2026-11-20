/* Type test, never run: AgentPresence's props, its parts, the list hook, refs, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  AgentPresence,
  AgentPresenceLabel,
  AgentPresenceOutline,
  AgentPresenceRoot,
  useAgentPresence,
  type AgentPresenceValue,
} from '../components/agent-presence'

const rowRef = React.createRef<HTMLTableRowElement>()
const layerRef = React.createRef<HTMLDivElement>()
const labelRef = React.createRef<HTMLSpanElement>()

// A ref, a selector, an element or nothing; the agent as a name or as AgentPicker's agent.
export const byRef = <AgentPresence ref={layerRef} target={rowRef} agent="Satin" label="Tara Mendes" />
export const bySelector = (
  <AgentPresence target='[data-row="tara"]' agent={{ name: 'Hiring assistant', tone: 'plum', avatar: 'flappy' }} label="Tara Mendes" state="done" doneDuration={3000} />
)
export const conflict = (
  <AgentPresence target={rowRef} agent="Satin" label="Tara Mendes" state="conflict" person={{ name: 'Jon Park', initials: 'JP', tone: 'sky' }} />
)
export const hidden = <AgentPresence target={null} agent="Satin" label="" />
// The step it's on, said on the label in place of the name.
export const step = <AgentPresence target={rowRef} agent="Satin" label="Tara Mendes" activity="Drafting invite…" />

// @ts-expect-error: a step is words, read out too
export const wrongActivity = <AgentPresence target={rowRef} agent="Satin" label="Tara" activity={<b>Sending</b>} />

// @ts-expect-error: no such state
export const wrongState = <AgentPresence target={rowRef} agent="Satin" label="Tara" state="busy" />
// @ts-expect-error: label is required, it names the target for screen readers
export const noLabel = <AgentPresence target={rowRef} agent="Satin" />
// @ts-expect-error: a tone comes from the agent, not a prop
export const wrongTone = <AgentPresence target={rowRef} agent="Satin" label="Tara" tone="plum" />

export const parts = (
  <AgentPresenceRoot target={rowRef} state="working" tone="sky" announcement="Satin is updating Tara Mendes" className="z-20">
    <AgentPresenceOutline />
    <AgentPresenceLabel ref={labelRef} variant="outline">
      Satin · Stage
    </AgentPresenceLabel>
  </AgentPresenceRoot>
)

// The list hook: uncontrolled, or controlled with value / onValueChange.
export function Uncontrolled() {
  const presence = useAgentPresence()
  presence.start('tara', 'Tara Mendes')
  presence.start('tara', 'Tara Mendes', 'Sending…')
  const activity: string | undefined = presence.props.activity
  presence.conflict('Jon Park')
  presence.done()
  presence.clear()
  const attrs: { 'data-agent-presence': string } = presence.item('tara')
  return (
    <div className="relative" title={activity}>
      <div {...attrs} />
      <AgentPresence {...presence.props} agent="Satin" />
    </div>
  )
}

export function Controlled() {
  const [value, setValue] = React.useState<AgentPresenceValue | null>({ id: 'tara', label: 'Tara Mendes', state: 'working' })
  const presence = useAgentPresence({ value, onValueChange: setValue })
  return <AgentPresence {...presence.props} agent="Satin" />
}

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels
    labels={{
      agentPresenceWorking: (agent, target) => `${agent} aktualizuje: ${target}`,
      agentPresenceActivity: (agent, target, activity) => `${agent} (${target}): ${activity}`,
      agentPresenceEditing: (person) => `${person} edytuje`,
    }}
  >
    {byRef}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ agentPresenceEditing: 'edytuje' }}>{byRef}</SatinLabels>
