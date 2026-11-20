import * as React from 'react'
import {
  AgentPermissionRequest,
  agentPermissionScopeId,
  type AgentPermissionScope,
  type AgentPermissionStatus,
} from '@uisatin/pro/agent-permissions'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// The scenario: a recruiting agent asks to read candidates, write notes and send emails from your address.
const agent = { name: 'Recruiting agent', tone: 'sky', avatar: 'flappy' } as const
const reason = 'To screen the 14 new applicants for Product Designer and invite the strongest to a call.'
const scopes: AgentPermissionScope[] = [
  { resource: 'candidates', actions: ['read'], detail: 'Profiles, CVs and interview stages' },
  { resource: 'notes', actions: ['write'], detail: 'On the profiles it screens' },
  { resource: 'emails', actions: ['send'], detail: 'From tara@acme.com, only to candidates you shortlist' },
]

// The answer is the prop that changes the most, so it leads; Allow, Don't allow, Remove access
// and Change on the stage move it too.
export const controls: ShowcaseControl[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'menu',
    items: [
      { value: 'request', label: 'Request' },
      { value: 'once', label: 'Allowed once' },
      { value: 'always', label: 'Always allowed' },
      { value: 'denied', label: 'Not allowed' },
      { value: 'revoked', label: 'Access removed' },
    ],
  },
  { id: 'reason', label: 'Reason', type: 'switch', default: 'on' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

const statusOf = (value: string): AgentPermissionStatus => (value === 'once' || value === 'always' ? 'allowed' : (value as AgentPermissionStatus))

function code(v: Record<string, string>) {
  const answered =
    v.status === 'request'
      ? []
      : [`defaultStatus="${statusOf(v.status)}"`, v.status === 'once' || v.status === 'always' ? `mode="${v.status}"` : undefined].filter(Boolean)
  const props = [
    `agent={{ name: 'Recruiting agent', tone: 'sky', avatar: 'flappy' }}`,
    v.reason === 'on' && `description="${reason}"`,
    `scopes={[
    { resource: 'candidates', actions: ['read'], detail: 'Profiles, CVs and interview stages' },
    { resource: 'notes', actions: ['write'], detail: 'On the profiles it screens' },
    { resource: 'emails', actions: ['send'], detail: 'From tara@acme.com, only to candidates you shortlist' },
  ]}`,
    ...answered,
    '// mode is "once" or "always"; scopes are the ticked ones.',
    'onAllow={(mode, scopes) => grant(mode, scopes)}',
    'onDeny={() => deny()}',
    'onRevoke={() => revoke()}',
  ].filter(Boolean)
  return `import { AgentPermissionRequest } from '@uisatin/pro/agent-permissions'

<AgentPermissionRequest
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [labelOf('status', v.status), v.reason === 'on' ? 'Reason' : 'No reason'].join(' · '),
  code: code(v),
}))

/**
 * The stage drives the request with the Status control: answering it moves the control (and the
 * code), and picking a status shows that answer. The ticks stay across answers, so Change brings
 * back the request as it was left.
 */
function Demo({ v, set }: { v: Record<string, string>; set: (id: string, value: string) => void }) {
  const [value, setValue] = React.useState(() => scopes.map(agentPermissionScopeId))
  return (
    <AgentPermissionRequest
      agent={agent}
      description={v.reason === 'on' ? reason : undefined}
      scopes={scopes}
      status={statusOf(v.status)}
      mode={v.status === 'once' ? 'once' : 'always'}
      value={value}
      onValueChange={setValue}
      onAllow={(mode) => set('status', mode)}
      onStatusChange={(status) => status !== 'allowed' && set('status', status)}
      onRevoke={() => {}}
    />
  )
}

export default function AgentPermissionsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Permission request"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v, set) => (
        // The request hangs from the top of the stage, so folding to its summary never moves its top edge.
        // Below md the rows wrap, so the request runs taller.
        <div className="h-[464px] w-[405px] max-w-full self-start md:h-[404px]">
          <Demo v={v} set={set} />
        </div>
      )}
    />
  )
}
