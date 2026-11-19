import * as React from 'react'
import { Badge } from '@uisatin/ui/badge'
import { Card } from '@uisatin/ui/card'
import { Table, type Column } from '@uisatin/ui/table'
import { AgentPresence, type AgentPresenceState } from '@uisatin/pro/agent-presence'

/** Agent presence states: rows are the targets (a table row, a card), columns the states, held still. */
const states: AgentPresenceState[] = ['working', 'done', 'conflict']

type Row = { id: string; name: string; stage: string }
const rows: Row[] = [
  { id: 'a', name: 'Omar Haddad', stage: 'Screening' },
  { id: 'b', name: 'Tara Mendes', stage: 'Screening' },
  { id: 'c', name: 'Lena Fischer', stage: 'Interview' },
]
const columns: Column<Row>[] = [
  { key: 'name', header: 'Candidate' },
  { key: 'stage', header: 'Stage', cell: (r) => <Badge size="sm" tone={r.stage === 'Interview' ? 'plum' : 'sky'}>{r.stage}</Badge> },
]

const presence = (state: AgentPresenceState, target: string) => (
  <AgentPresence
    target={target}
    state={state}
    agent={{ name: 'Hiring assistant', tone: 'brand' }}
    label="Tara Mendes"
    person={{ name: 'Jon Park', initials: 'JP', tone: 'sky' }}
    doneDuration={Infinity}
  />
)

export function AgentPresenceGrid() {
  return (
    <div className="grid gap-8 p-8 text-xs text-text-muted">
      <div className="inline-grid grid-cols-[80px_repeat(3,280px)] items-center gap-6">
        <span />
        {states.map((s) => (
          <span key={s}>{s}</span>
        ))}
        <span>table row</span>
        {states.map((s) => (
          <div key={s} className="relative" id={`row-${s}`}>
            <Table label="Candidates" columns={columns} rows={rows} renderRow={({ row, rowProps, children }) => <tr {...rowProps} data-grid-target={row.id === 'b' ? s : undefined}>{children}</tr>} />
            {presence(s, `[data-grid-target="${s}"]`)}
          </div>
        ))}
        <span>card</span>
        {states.map((s) => (
          <div key={s} className="relative pt-4">
            <Card size="sm" title="Tara Mendes" description="Product designer" className="w-full" data-grid-card={s}>
              <Badge size="sm" tone="sky" className="self-start">
                Screening
              </Badge>
            </Card>
            {presence(s, `[data-grid-card="${s}"]`)}
          </div>
        ))}
      </div>
    </div>
  )
}
