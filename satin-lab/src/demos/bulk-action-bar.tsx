import * as React from 'react'
import { Archive, ArrowRight, Download, Label, Trash, UserPlus } from 'iconoir-react'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { Table, type Column } from '@uisatin/ui/table'
import { Toaster, toast } from '@uisatin/ui/toast'
import { BulkActionBar, type BulkAction } from '@uisatin/pro/bulk-action-bar'
import { toastBatch } from '@uisatin/pro/toast-batch'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type Stage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won'
type Deal = { id: string; company: string; owner: string; stage: Stage; value: string }

const STAGE_TONE: Record<Stage, BadgeTone> = { Lead: 'neutral', Qualified: 'sky', Proposal: 'plum', Negotiation: 'amber', Won: 'green' }

const DEALS: Deal[] = [
  { id: 'acme', company: 'Acme Corp', owner: 'Tara Mendes', stage: 'Proposal', value: '€48,000' },
  { id: 'globex', company: 'Globex', owner: 'Jon Park', stage: 'Qualified', value: '€22,500' },
  { id: 'initech', company: 'Initech', owner: 'Tara Mendes', stage: 'Proposal', value: '€31,200' },
  { id: 'umbrella', company: 'Umbrella Health', owner: 'Ada Novak', stage: 'Lead', value: '€9,800' },
  { id: 'stark', company: 'Stark Logistics', owner: 'Jon Park', stage: 'Won', value: '€64,000' },
]

const columns: Column<Deal>[] = [
  { key: 'company', header: 'Deal', width: 1.6 },
  { key: 'owner', header: 'Owner', width: 1.3 },
  {
    key: 'stage',
    header: 'Stage',
    width: 1.2,
    cell: (d) => (
      <Badge size="sm" tone={STAGE_TONE[d.stage]}>
        {d.stage}
      </Badge>
    ),
  },
  { key: 'value', header: 'Value', width: 1, align: 'right' },
]

export const controls: ShowcaseControl[] = [
  { id: 'selectAll', label: 'Select all', type: 'switch', default: 'on' },
  { id: 'overflow', label: 'More menu', type: 'switch', default: 'on' },
]

function code(v: Record<string, string>) {
  const selectAll =
    v.selectAll === 'on'
      ? `
        total={deals.length}
        onSelectAll={() => setSelected(deals.map((d) => d.id))}`
      : ''
  const overflow =
    v.overflow === 'on'
      ? `
        overflow={[
          { label: 'Export CSV', icon: <Download />, onSelect: () => exportCsv(picked) },
          { label: 'Add tag', icon: <Label />, onSelect: () => openTagPicker(picked) },
          { label: 'Archive', icon: <Archive />, onSelect: () => archive(picked) },
        ]}`
      : ''
  return `import { Table } from '@uisatin/ui/table'
import { BulkActionBar } from '@uisatin/pro/bulk-action-bar'
import { toastBatch } from '@uisatin/pro/toast-batch'

export function Deals({ deals }: { deals: Deal[] }) {
  const [selected, setSelected] = React.useState<string[]>([])
  const picked = deals.filter((d) => selected.includes(d.id))

  // Escape clears the selection while focus is anywhere in this div: the table and the bar.
  return (
    <div>
      <Table label="Deals" columns={columns} rows={deals} selectable selected={selected} onSelectedChange={setSelected} rowLabel={(d) => d.company} />
      <BulkActionBar
        count={selected.length}${selectAll}
        onClear={() => setSelected([])}
        actions={[
          {
            label: 'Move to Negotiation',
            icon: <ArrowRight />,
            onSelect: async () => {
              await moveDeals(picked, 'Negotiation')
              setSelected([])
              toastBatch({
                title: (count) => \`\${count} \${count === 1 ? 'deal' : 'deals'} moved\`,
                items: picked.map((d) => ({ id: d.id, label: d.company, undo: () => moveDeals([d], d.stage) })),
              })
            },
          },
          { label: 'Assign', icon: <UserPlus />, onSelect: () => openAssign(picked) },
          { label: 'Delete', icon: <Trash />, tone: 'destructive', onSelect: () => confirmDelete(picked) },
        ]}${overflow}
      />
    </div>
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [v.selectAll === 'on' ? 'Select all' : 'No select all', v.overflow === 'on' ? 'More menu' : 'No more menu'].join(' · '),
  code: code(v),
}))

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** The Sales scenario: three deals picked, moved to Negotiation in one go, one toast to undo them. */
function Preview({ v }: { v: Record<string, string> }) {
  const [deals, setDeals] = React.useState(DEALS)
  const [selected, setSelected] = React.useState<string[]>(['acme', 'globex', 'initech'])
  const picked = deals.filter((d) => selected.includes(d.id))

  const setStage = (ids: string[], stage: (d: Deal) => Stage) => setDeals((all) => all.map((d) => (ids.includes(d.id) ? { ...d, stage: stage(d) } : d)))

  React.useEffect(() => () => toast.dismiss(), [])

  const actions: BulkAction[] = [
    {
      label: 'Move to Negotiation',
      icon: <ArrowRight />,
      onSelect: async () => {
        const moved = picked
        await wait(700)
        setStage(
          moved.map((d) => d.id),
          () => 'Negotiation',
        )
        setSelected([])
        toastBatch({
          title: (count) => `${count} ${count === 1 ? 'deal' : 'deals'} moved`,
          duration: 12000,
          items: moved.map((d) => ({ id: d.id, label: d.company, undo: () => setStage([d.id], () => d.stage) })),
        })
      },
    },
    { label: 'Assign', icon: <UserPlus />, onSelect: () => wait(600) },
    {
      label: 'Delete',
      icon: <Trash />,
      tone: 'destructive',
      onSelect: () => {
        setDeals((all) => all.filter((d) => !selected.includes(d.id)))
        setSelected([])
      },
    },
  ]
  const overflow: BulkAction[] =
    v.overflow === 'on'
      ? [
          { label: 'Export CSV', icon: <Download />, onSelect: () => {} },
          { label: 'Add tag', icon: <Label />, onSelect: () => {} },
          { label: 'Archive', icon: <Archive />, onSelect: () => setSelected([]) },
        ]
      : []

  return (
    <div className="relative w-[640px] max-w-full pb-3">
      <Table label="Deals" columns={columns} rows={deals} selectable selected={selected} onSelectedChange={setSelected} rowLabel={(d) => d.company} />
      <BulkActionBar
        count={selected.length}
        total={deals.length}
        onSelectAll={v.selectAll === 'on' ? () => setSelected(deals.map((d) => d.id)) : undefined}
        onClear={() => setSelected([])}
        actions={actions}
        overflow={overflow}
      />
      {/* The batch toast comes up where the bar was, inside the stage. */}
      <Toaster className="absolute inset-x-0 bottom-0 mx-auto w-[397px] max-w-full" />
    </div>
  )
}

export default function BulkActionBarDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="Bulk action bar" options={options} codeHtml={codeHtml} controls={controls} render={(id, v) => <Preview key={id} v={v} />} />
}
