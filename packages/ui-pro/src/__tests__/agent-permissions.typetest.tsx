/* Type test, never run: AgentPermissionRequest's props, controlled ticks and not, its parts, refs, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  AgentPermissionFooter,
  AgentPermissionHeader,
  AgentPermissionRequest,
  AgentPermissionRoot,
  AgentPermissionScope,
  AgentPermissionScopeList,
  agentPermissionScopeId,
  type AgentPermissionMode,
  type AgentPermissionScope as Scope,
} from '../components/agent-permissions'

const scopes: Scope[] = [
  { resource: 'candidates', actions: ['read'], detail: 'Profiles, CVs and interview stages' },
  { id: 'notes', resource: 'notes', actions: ['read', 'write'] },
  { resource: 'emails', actions: ['send'], detail: <>From <b>you@acme.com</b></>, label: 'Send emails from your address' },
]

// @ts-expect-error: no such action
const wrongAction: Scope = { resource: 'files', actions: ['delete'] }

const cardRef = React.createRef<HTMLDivElement>()
const listRef = React.createRef<HTMLUListElement>()
const rowRef = React.createRef<HTMLLIElement>()

// Uncontrolled: it keeps its own ticks.
export const uncontrolled = (
  <AgentPermissionRequest
    ref={cardRef}
    agent="Recruiting agent"
    scopes={scopes}
    description="To screen this week's applicants."
    defaultValue={['candidates']}
    onAllow={(mode: AgentPermissionMode, granted: Scope[]) => fetch(`/grant?mode=${mode}&n=${granted.length}`)}
    onDeny={async () => {}}
  />
)

function Controlled() {
  const [value, setValue] = React.useState<string[]>(scopes.map(agentPermissionScopeId))
  return (
    <AgentPermissionRequest
      agent={{ name: 'Recruiting agent', initials: 'RA', tone: 'plum', avatar: 'flappy' }}
      scopes={scopes}
      value={value}
      onValueChange={setValue}
      autoFocus={false}
    />
  )
}
export const controlled = <Controlled />

export const parts = (
  <AgentPermissionRoot agent="Recruiting agent" scopes={scopes} aria-describedby="why">
    <AgentPermissionHeader description="Why it asks" />
    <AgentPermissionScopeList ref={listRef}>
      <AgentPermissionScope ref={rowRef} scope={scopes[0]} />
    </AgentPermissionScopeList>
    <AgentPermissionFooter className="pt-2" />
  </AgentPermissionRoot>
)

// @ts-expect-error: agent and scopes are required
export const missing = <AgentPermissionRequest onAllow={() => {}} />

// @ts-expect-error: it is the question only, with no answered status
export const noStatus = <AgentPermissionRequest agent="A" scopes={scopes} status="allowed" />

// @ts-expect-error: no Remove access either
export const noRevoke = <AgentPermissionRequest agent="A" scopes={scopes} onRevoke={() => {}} />

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels
    labels={{
      close: 'Zamknij',
      agentPermissionsTitle: (agent) => `${agent} chce:`,
      agentPermissionsScope: (actions, resource) => `${actions.join(' i ')}: ${resource}`,
      agentPermissionsSelected: (count, total) => `Wybrano ${count} z ${total}`,
      agentPermissionsDeny: 'Nie zezwalaj',
    }}
  >
    {uncontrolled}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ agentPermissionsTitle: 'Agent chce:' }}>{uncontrolled}</SatinLabels>

export { wrongAction }
