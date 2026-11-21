import { AgentPermissionRequest, type AgentPermissionScope } from '@uisatin/pro/agent-permissions'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// The scenario: a recruiting agent asks to read candidates, write notes and send emails from your address.
const agent = { name: 'Recruiting agent', tone: 'sky', avatar: 'flappy' } as const
const reason = 'To screen the 14 new applicants for Product Designer and invite the strongest to a call.'
const scopes: AgentPermissionScope[] = [
  { resource: 'candidates', actions: ['read'], detail: 'Profiles, CVs and interview stages' },
  { resource: 'notes', actions: ['write'], detail: 'On the profiles it screens' },
  { resource: 'emails', actions: ['send'], detail: 'From tara@acme.com, only to candidates you shortlist' },
]

export const controls: ShowcaseControl[] = [{ id: 'reason', label: 'Reason', type: 'switch', default: 'on' }]

function code(v: Record<string, string>) {
  const props = [
    `agent={{ name: 'Recruiting agent', tone: 'sky', avatar: 'flappy' }}`,
    v.reason === 'on' && `description="${reason}"`,
    `scopes={[
    { resource: 'candidates', actions: ['read'], detail: 'Profiles, CVs and interview stages' },
    { resource: 'notes', actions: ['write'], detail: 'On the profiles it screens' },
    { resource: 'emails', actions: ['send'], detail: 'From tara@acme.com, only to candidates you shortlist' },
  ]}`,
    '// mode is "once" or "always"; scopes are the ticked ones. Close the Dialog when it resolves.',
    'onAllow={(mode, scopes) => grant(mode, scopes)}',
    'onDeny={() => close()}',
  ].filter(Boolean)
  return `import { AgentPermissionRequest } from '@uisatin/pro/agent-permissions'

<AgentPermissionRequest
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: v.reason === 'on' ? 'Reason' : 'No reason',
  code: code(v),
}))

// An answer here holds its button for a moment, as a real grant would, then the request is back.
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 900))

export default function AgentPermissionsDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Permission request"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <AgentPermissionRequest agent={agent} description={v.reason === 'on' ? reason : undefined} scopes={scopes} onAllow={wait} onDeny={wait} />
      )}
    />
  )
}
