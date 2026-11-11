import * as React from 'react'
import {
  AgentSuggestion,
  AgentSuggestionChanges,
  AgentSuggestionDiff,
  AgentSuggestionMetric,
  AgentSuggestionQuote,
} from '@satin/ui/agent-suggestion'
import { Avatar } from '@satin/ui/avatar'
import { Badge } from '@satin/ui/badge'
import { Button } from '@satin/ui/button'
import { Checkbox } from '@satin/ui/checkbox'
import { Chip } from '@satin/ui/chip'
import { Calendar, Check, EditPencil, Flash, GraphUp, Mail, Plus, SendDiagonal, TaskList } from 'iconoir-react'
import { Showcase, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

// App logos for the demo; in an app pass the logo you already have.
function SlackLogo() {
  return (
    <svg viewBox="0 0 122.8 122.8" aria-hidden>
      <path fill="#E01E5A" d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" />
      <path fill="#36C5F0" d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" />
      <path fill="#2EB67D" d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" />
      <path fill="#ECB22E" d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" />
    </svg>
  )
}
const MeetLogo = () => <img alt="" src="https://www.google.com/s2/favicons?domain=meet.google.com&sz=32" />

/** Overlapping 24px avatars of the people a suggestion concerns. */
const People = ({ people }: { people: [string, string, React.ComponentProps<typeof Avatar>['tone']][] }) => (
  <div className="flex -space-x-1">
    {people.map(([initials, name, tone]) => (
      <Avatar key={initials} initials={initials} name={name} tone={tone} size={24} />
    ))}
  </div>
)

const types = [
  { value: 'email', label: 'Email' },
  { value: 'reply', label: 'Reply' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'insight', label: 'Insight' },
  { value: 'edit', label: 'Edit' },
  { value: 'record', label: 'CRM update' },
]

export const controls: ShowcaseControl[] = [{ id: 'type', label: 'Type', type: 'menu', items: types }]

const imports = (parts: string[], more: string) =>
  `import { ${['AgentSuggestion', ...parts].join(', ')} } from '@satin/ui/agent-suggestion'\n${more}`

const codes: Record<string, string> = {
  email: `${imports([], `import { Avatar } from '@satin/ui/avatar'
import { Button } from '@satin/ui/button'
import { Mail, SendDiagonal } from 'iconoir-react'`)}

<AgentSuggestion
  kind="Email suggestion"
  icon={<Mail />}
  meta={<People people={[marcus, emma]} />}
  title="Looking for more seats?"
  description="Hi Marcus, saw Quanta's usage jumped 42% this month. Looks like the team is scaling fast. Happy to add more seats on your plan so no one gets blocked."
  actions={<>
    <Button variant="secondary">Open draft</Button>
    <Button><SendDiagonal />Send</Button>
  </>}
/>`,
  reply: `${imports(['AgentSuggestionQuote'], `import { Avatar } from '@satin/ui/avatar'
import { Button } from '@satin/ui/button'
import { Chip } from '@satin/ui/chip'
import { SendDiagonal } from 'iconoir-react'`)}

<AgentSuggestion
  kind="Reply suggestion"
  icon={<SlackLogo />}
  actions={<>
    <Button variant="secondary">Edit</Button>
    <Button><SendDiagonal />Send reply</Button>
  </>}
>
  <AgentSuggestionQuote from="Joshua Park" avatar={<Avatar initials="J" tone="plum" size={20} />}>
    Can we push the onboarding call to next week? Half the team is out.
  </AgentSuggestionQuote>
  <p>No problem, Joshua. How about Tuesday at 10:00? I'll move the invite and keep the agenda as is.</p>
  <div className="flex flex-wrap gap-1.5">
    <Chip variant="outline" size="sm">Shorter</Chip>
    <Chip variant="outline" size="sm">More formal</Chip>
    <Chip variant="outline" size="sm">Offer two times</Chip>
  </div>
</AgentSuggestion>`,
  meeting: `${imports([], `import { Button } from '@satin/ui/button'
import { Chip } from '@satin/ui/chip'
import { Calendar } from 'iconoir-react'`)}

<AgentSuggestion
  kind="Meeting suggestion"
  icon={<MeetLogo />}
  meta={<People people={[marcus, emma, joshua]} />}
  title="Quarterly review with Quanta"
  description="30 min on Google Meet. Everyone is free at these times:"
  actions={<>
    <Button variant="secondary">Other times</Button>
    <Button><Calendar />Send invite</Button>
  </>}
>
  <div role="radiogroup" aria-label="Time" className="flex flex-wrap gap-1.5">
    {slots.map((s) => (
      <Chip key={s} role="radio" aria-checked={s === slot} variant={s === slot ? 'subtle' : 'outline'}
        tone={s === slot ? 'brand' : 'neutral'} onClick={() => setSlot(s)}>{s}</Chip>
    ))}
  </div>
</AgentSuggestion>`,
  tasks: `${imports([], `import { Badge } from '@satin/ui/badge'
import { Button } from '@satin/ui/button'
import { Checkbox } from '@satin/ui/checkbox'
import { Plus, TaskList } from 'iconoir-react'`)}

<AgentSuggestion
  kind="Next steps"
  icon={<TaskList />}
  meta={<Badge size="sm">From today's call</Badge>}
  title="3 follow-ups from your call with Quanta"
  actions={<>
    <Button variant="tertiary">Dismiss</Button>
    <Button><Plus />Add {picked.length} tasks</Button>
  </>}
>
  <div className="flex flex-col gap-3 py-1">
    {tasks.map((t) => <Checkbox key={t.id} label={t.label} description={t.due} … />)}
  </div>
</AgentSuggestion>`,
  insight: `${imports(['AgentSuggestionMetric'], `import { Badge } from '@satin/ui/badge'
import { Button } from '@satin/ui/button'
import { GraphUp, Mail } from 'iconoir-react'`)}

<AgentSuggestion
  kind="Insight"
  icon={<GraphUp />}
  meta={<Badge size="sm" tone="green">+42% this month</Badge>}
  title="Quanta is close to its seat limit"
  actions={<>
    <Button variant="secondary">See usage</Button>
    <Button><Mail />Draft upsell email</Button>
  </>}
>
  <AgentSuggestionMetric value="47 / 50" unit="seats in use" used={47} max={50} />
  <p>At this pace they run out in about 9 days. Accounts that hit the limit are twice as likely to churn.</p>
</AgentSuggestion>`,
  edit: `${imports(['AgentSuggestionDiff'], `import { Badge } from '@satin/ui/badge'
import { Button } from '@satin/ui/button'
import { Check, EditPencil } from 'iconoir-react'`)}

<AgentSuggestion
  kind="Edit suggestion"
  icon={<EditPencil />}
  meta={<Badge size="sm">Proposal · Quanta</Badge>}
  title="Tighten the pricing paragraph"
  actions={<>
    <Button variant="tertiary">Dismiss</Button>
    <Button><Check />Apply</Button>
  </>}
>
  <AgentSuggestionDiff
    before="Our pricing is very flexible and can be adjusted in many different ways depending on your needs."
    after="Pricing scales with seats, and annual plans save 15%."
  />
</AgentSuggestion>`,
  record: `${imports(['AgentSuggestionChanges'], `import { Badge } from '@satin/ui/badge'
import { Button } from '@satin/ui/button'
import { Check, Flash } from 'iconoir-react'`)}

<AgentSuggestion
  kind="CRM update"
  icon={<Flash />}
  meta={<Badge size="sm">HubSpot</Badge>}
  title="Update the Quanta deal"
  description="Based on today's call:"
  actions={<>
    <Button variant="secondary">Review</Button>
    <Button><Check />Update deal</Button>
  </>}
>
  <AgentSuggestionChanges changes={[
    { field: 'Stage', from: 'Proposal', to: <Badge size="sm" tone="brand">Negotiation</Badge> },
    { field: 'Amount', from: '$24,000', to: '$31,200' },
    { field: 'Close date', from: '30 Nov', to: '15 Dec' },
  ]} />
</AgentSuggestion>`,
}

export const options: ShowcaseOption[] = types.map((t) => ({ id: t.value, label: t.label, code: codes[t.value] }))

const slots = ['Tue 18 Nov, 10:00', 'Wed 19 Nov, 14:30', 'Thu 20 Nov, 09:00']
const tasks = [
  { id: 'quote', label: 'Send the revised quote', due: 'Due Friday · Marcus asked for annual pricing' },
  { id: 'sso', label: 'Share the SSO setup guide', due: 'Due tomorrow · for their IT lead' },
  { id: 'demo', label: 'Book a demo of the analytics add-on', due: 'Next week · optional' },
]

function Meeting() {
  const [slot, setSlot] = React.useState(slots[1])
  return (
    <AgentSuggestion
      kind="Meeting suggestion"
      icon={<MeetLogo />}
      meta={<People people={[['M', 'Marcus Lee', 'sky'], ['E', 'Emma Novak', 'amber'], ['J', 'Joshua Park', 'plum']]} />}
      title="Quarterly review with Quanta"
      description="30 min on Google Meet. Everyone is free at these times:"
      actions={
        <>
          <Button variant="secondary">Other times</Button>
          <Button>
            <Calendar />
            Send invite
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Time" className="flex flex-wrap gap-1.5">
        {slots.map((s) => (
          <Chip
            key={s}
            role="radio"
            aria-checked={s === slot}
            variant={s === slot ? 'subtle' : 'outline'}
            tone={s === slot ? 'brand' : 'neutral'}
            onClick={() => setSlot(s)}
          >
            {s}
          </Chip>
        ))}
      </div>
    </AgentSuggestion>
  )
}

function Tasks() {
  const [picked, setPicked] = React.useState(['quote', 'sso'])
  return (
    <AgentSuggestion
      kind="Next steps"
      icon={<TaskList />}
      meta={<Badge size="sm">From today's call</Badge>}
      title="3 follow-ups from your call with Quanta"
      actions={
        <>
          <Button variant="tertiary">Dismiss</Button>
          <Button disabled={!picked.length}>
            <Plus />
            Add {picked.length} {picked.length === 1 ? 'task' : 'tasks'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        {tasks.map((t) => (
          <Checkbox
            key={t.id}
            label={t.label}
            description={t.due}
            checked={picked.includes(t.id)}
            onCheckedChange={(on) => setPicked((p) => (on ? [...p, t.id] : p.filter((x) => x !== t.id)))}
          />
        ))}
      </div>
    </AgentSuggestion>
  )
}

function Example({ type }: { type: string }) {
  switch (type) {
    case 'reply':
      return (
        <AgentSuggestion
          kind="Reply suggestion"
          icon={<SlackLogo />}
          actions={
            <>
              <Button variant="secondary">Edit</Button>
              <Button>
                <SendDiagonal />
                Send reply
              </Button>
            </>
          }
        >
          <AgentSuggestionQuote from="Joshua Park" avatar={<Avatar initials="J" tone="plum" size={20} />}>
            Can we push the onboarding call to next week? Half the team is out.
          </AgentSuggestionQuote>
          <p className="text-base">No problem, Joshua. How about Tuesday at 10:00? I'll move the invite and keep the agenda as is.</p>
          <div className="flex flex-wrap gap-1.5">
            {['Shorter', 'More formal', 'Offer two times'].map((c) => (
              <Chip key={c} variant="outline" size="sm">
                {c}
              </Chip>
            ))}
          </div>
        </AgentSuggestion>
      )
    case 'meeting':
      return <Meeting />
    case 'tasks':
      return <Tasks />
    case 'insight':
      return (
        <AgentSuggestion
          kind="Insight"
          icon={<GraphUp />}
          meta={
            <Badge size="sm" tone="green">
              +42% this month
            </Badge>
          }
          title="Quanta is close to its seat limit"
          actions={
            <>
              <Button variant="secondary">See usage</Button>
              <Button>
                <Mail />
                Draft upsell email
              </Button>
            </>
          }
        >
          <AgentSuggestionMetric value="47 / 50" unit="seats in use" used={47} max={50} />
          <p className="text-base text-text-muted">At this pace they run out in about 9 days. Accounts that hit the limit are twice as likely to churn.</p>
        </AgentSuggestion>
      )
    case 'edit':
      return (
        <AgentSuggestion
          kind="Edit suggestion"
          icon={<EditPencil />}
          meta={<Badge size="sm">Proposal · Quanta</Badge>}
          title="Tighten the pricing paragraph"
          actions={
            <>
              <Button variant="tertiary">Dismiss</Button>
              <Button>
                <Check />
                Apply
              </Button>
            </>
          }
        >
          <AgentSuggestionDiff
            before="Our pricing is very flexible and can be adjusted in many different ways depending on your needs."
            after="Pricing scales with seats, and annual plans save 15%."
          />
        </AgentSuggestion>
      )
    case 'record':
      return (
        <AgentSuggestion
          kind="CRM update"
          icon={<Flash />}
          meta={<Badge size="sm">HubSpot</Badge>}
          title="Update the Quanta deal"
          description="Based on today's call:"
          actions={
            <>
              <Button variant="secondary">Review</Button>
              <Button>
                <Check />
                Update deal
              </Button>
            </>
          }
        >
          <AgentSuggestionChanges
            changes={[
              {
                field: 'Stage',
                from: 'Proposal',
                to: (
                  <Badge size="sm" tone="brand">
                    Negotiation
                  </Badge>
                ),
              },
              { field: 'Amount', from: '$24,000', to: '$31,200' },
              { field: 'Close date', from: '30 Nov', to: '15 Dec' },
            ]}
          />
        </AgentSuggestion>
      )
    default:
      return (
        <AgentSuggestion
          kind="Email suggestion"
          icon={<Mail />}
          meta={<People people={[['M', 'Marcus Lee', 'sky'], ['E', 'Emma Novak', 'amber']]} />}
          title="Looking for more seats?"
          description="Hi Marcus, saw Quanta's usage jumped 42% this month. Looks like the team is scaling fast. Happy to add more seats on your plan so no one gets blocked."
          actions={
            <>
              <Button variant="secondary">Open draft</Button>
              <Button>
                <SendDiagonal />
                Send
              </Button>
            </>
          }
        />
      )
  }
}

export default function AgentSuggestionDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Agent suggestion"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="flex w-full max-w-[400px] justify-center">
          <Example type={v.type} />
        </div>
      )}
    />
  )
}
