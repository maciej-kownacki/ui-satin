import {
  AgentPermissionRequest,
  type AgentPermissionMode,
  type AgentPermissionScope,
  type AgentPermissionStatus,
} from '@uisatin/pro/agent-permissions'

/**
 * Every state of the permission request side by side: asking, partial (one scope unticked), the
 * four answers, and the busy Allow. Each card is controlled, so nothing here moves on its own.
 */
const agent = { name: 'Recruiting agent', tone: 'sky', avatar: 'flappy' } as const
const scopes: AgentPermissionScope[] = [
  { resource: 'candidates', actions: ['read'], detail: 'Profiles, CVs and interview stages' },
  { resource: 'notes', actions: ['read', 'write'], detail: 'On the profiles it screens' },
  { resource: 'emails', actions: ['send'], detail: 'From tara@acme.com, only to candidates you shortlist' },
]
const all = scopes.map((s) => s.resource)

const states: { label: string; status: AgentPermissionStatus; mode?: AgentPermissionMode; value?: string[]; busy?: boolean }[] = [
  { label: 'Request', status: 'request' },
  { label: 'Partial', status: 'request', value: ['candidates', 'notes'] },
  { label: 'Allow running', status: 'request', busy: true },
  { label: 'Allowed once', status: 'allowed', mode: 'once', value: ['candidates', 'notes'] },
  { label: 'Always allowed', status: 'allowed', mode: 'always' },
  { label: 'Not allowed', status: 'denied' },
  { label: 'Access removed', status: 'revoked', value: ['candidates', 'notes'] },
]

const never = () => new Promise<void>(() => {})

export function AgentPermissionsGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,405px)] items-start gap-x-8 gap-y-10 p-8">
      {states.map((s) => (
        <div key={s.label} className="flex flex-col gap-3">
          <span className="text-xs text-text-muted">{s.label}</span>
          <AgentPermissionRequest
            agent={agent}
            description="To screen the 14 new applicants for Product Designer."
            scopes={scopes}
            status={s.status}
            mode={s.mode}
            value={s.value ?? all}
            onRevoke={() => {}}
            onAllow={never}
            // The busy card presses its own Allow once on mount, so its Spinner shows.
            ref={s.busy ? (node) => void node?.querySelector<HTMLButtonElement>('[data-slot="split-button"] button')?.click() : undefined}
          />
        </div>
      ))}
    </div>
  )
}
