import * as React from 'react'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Button } from '@uisatin/ui/button'
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
} from '@uisatin/ui/dropdown'
import { ArrowRight, Eye, MoreHoriz, NavArrowDown, Send } from 'iconoir-react'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

/**
 * The Dropdown page's second section: a hiring pipeline. Each candidate's ⋯ menu moves them to
 * another stage through a Move to › submenu (radio rows, the current stage checked), and the
 * board's View menu picks the columns it shows (checkbox rows) and the order inside them (radio
 * rows). Everything is live: moving a candidate moves their card, hiding a column hides it.
 */
const stages = ['Screening', 'Interview', 'Offer'] as const
type Stage = (typeof stages)[number]
type Candidate = { id: string; name: string; initials: string; tone: AvatarTone; days: number; stage: Stage }

const people: Candidate[] = [
  { id: 'amara', name: 'Amara Okafor', initials: 'AO', tone: 'sky', days: 2, stage: 'Screening' },
  { id: 'jonas', name: 'Jonas Weber', initials: 'JW', tone: 'amber', days: 5, stage: 'Screening' },
  { id: 'priya', name: 'Priya Raman', initials: 'PR', tone: 'plum', days: 9, stage: 'Interview' },
  { id: 'mateo', name: 'Mateo Álvarez', initials: 'MÁ', tone: 'green', days: 12, stage: 'Interview' },
  { id: 'hana', name: 'Hana Sato', initials: 'HS', tone: 'fuchsia', days: 16, stage: 'Offer' },
]

const code = `import { Button } from '@uisatin/ui/button'
import {
  DropdownMenu, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@uisatin/ui/dropdown'
import { ArrowRight, Eye, MoreHoriz, NavArrowDown, Send } from 'iconoir-react'

const stages = ['Screening', 'Interview', 'Offer']

// A candidate's menu: Move to › a stage, the current one checked.
<DropdownMenu
  trigger={
    <Button variant="tertiary" size="xs" iconOnly aria-label={\`More options for \${candidate.name}\`}>
      <MoreHoriz />
    </Button>
  }
>
  <DropdownMenuItem label="Open profile" icon={<Eye />} />
  <DropdownMenuSub>
    <DropdownMenuSubTrigger label="Move to" icon={<ArrowRight />} />
    <DropdownMenuSubContent>
      <DropdownMenuRadioGroup value={candidate.stage} onValueChange={(stage) => move(candidate, stage)}>
        {stages.map((stage) => (
          <DropdownMenuRadioItem key={stage} value={stage} label={stage} />
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuSubContent>
  </DropdownMenuSub>
  <DropdownMenuItem label="Send offer" icon={<Send />} disabled={candidate.stage !== 'Offer'} />
</DropdownMenu>

// The board's view options: checkbox rows keep the menu open, so several columns go in one go.
<DropdownMenu
  align="end"
  trigger={
    <Button variant="secondary">
      View
      <NavArrowDown data-chevron />
    </Button>
  }
>
  <DropdownMenuGroup label="Show columns">
    {stages.map((stage) => (
      <DropdownMenuCheckboxItem
        key={stage}
        label={stage}
        checked={columns.includes(stage)}
        onCheckedChange={(on) => setColumns(on ? [...columns, stage] : columns.filter((c) => c !== stage))}
      />
    ))}
  </DropdownMenuGroup>
  <DropdownMenuRadioGroup label="Sort by" value={sort} onValueChange={setSort}>
    <DropdownMenuRadioItem value="newest" label="Newest first" />
    <DropdownMenuRadioItem value="name" label="Name" />
  </DropdownMenuRadioGroup>
</DropdownMenu>`

export const options: ShowcaseOption[] = [{ id: 'pipeline', label: 'Hiring pipeline', code }]

function CandidateCard({ candidate, onMove }: { candidate: Candidate; onMove: (stage: Stage) => void }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-card py-2 ps-2.5 pe-1.5 [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]">
      <Avatar aria-hidden initials={candidate.initials} tone={candidate.tone} size={24} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm leading-5 font-medium text-text-default">{candidate.name}</span>
        <span className="truncate text-xs leading-4 text-text-muted">
          {candidate.days} {candidate.days === 1 ? 'day' : 'days'} ago
        </span>
      </span>
      <DropdownMenu
        trigger={
          <Button variant="tertiary" size="xs" iconOnly aria-label={`More options for ${candidate.name}`} className="text-text-muted">
            <MoreHoriz />
          </Button>
        }
      >
        <DropdownMenuItem label="Open profile" icon={<Eye />} />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger label="Move to" icon={<ArrowRight />} />
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={candidate.stage} onValueChange={(stage) => onMove(stage as Stage)}>
              {stages.map((stage) => (
                <DropdownMenuRadioItem key={stage} value={stage} label={stage} />
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem label="Send offer" icon={<Send />} disabled={candidate.stage !== 'Offer'} />
      </DropdownMenu>
    </li>
  )
}

function Pipeline() {
  const [candidates, setCandidates] = React.useState(people)
  const [columns, setColumns] = React.useState<Stage[]>([...stages])
  const [sort, setSort] = React.useState('newest')
  const move = (id: string, stage: Stage) => setCandidates((all) => all.map((c) => (c.id === id ? { ...c, stage } : c)))
  const sorted = [...candidates].sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : a.days - b.days))
  const shown = stages.filter((s) => columns.includes(s))

  return (
    <div className="flex w-[640px] max-w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-base leading-6 font-medium text-text-default">Product designer</span>
          <span className="text-sm text-text-muted">{candidates.length} candidates</span>
        </div>
        <DropdownMenu
          align="end"
          trigger={
            <Button variant="secondary">
              View
              <NavArrowDown data-chevron />
            </Button>
          }
        >
          <DropdownMenuGroup label="Show columns">
            {stages.map((stage) => {
              const on = columns.includes(stage)
              return (
                <DropdownMenuCheckboxItem
                  key={stage}
                  label={stage}
                  checked={on}
                  // The last column showing stays: a board with none would have nothing to put back.
                  disabled={on && columns.length === 1}
                  onCheckedChange={(next) => setColumns((all) => (next ? [...all, stage] : all.filter((c) => c !== stage)))}
                />
              )
            })}
          </DropdownMenuGroup>
          <DropdownMenuRadioGroup label="Sort by" value={sort} onValueChange={setSort}>
            <DropdownMenuRadioItem value="newest" label="Newest first" />
            <DropdownMenuRadioItem value="name" label="Name" />
          </DropdownMenuRadioGroup>
        </DropdownMenu>
      </div>

      <div className="flex items-start gap-3">
        {shown.map((stage) => {
          const here = sorted.filter((c) => c.stage === stage)
          return (
            <section key={stage} className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl bg-bg-muted p-2">
              <h3 className="flex items-center justify-between px-1 pt-0.5 text-sm font-medium text-text-default">
                {stage}
                <span className="text-xs font-normal text-text-muted">{here.length}</span>
              </h3>
              <ul className="flex min-h-[52px] flex-col gap-2">
                {here.map((c) => (
                  <CandidateCard key={c.id} candidate={c} onMove={(next) => move(c.id, next)} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default function DropdownSubmenusDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Dropdown submenus" options={options} codeHtml={codeHtml} align="top" render={() => <Pipeline />} />
}
