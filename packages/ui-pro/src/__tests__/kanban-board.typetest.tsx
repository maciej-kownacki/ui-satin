/* Type test, never run: KanbanBoard's props, generic items, KanbanCard, refs, and its words in SatinLabels. */
import * as React from 'react'
import { Avatar } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { DropdownMenuItem } from '@uisatin/ui/dropdown'
import { SatinLabels } from '@uisatin/ui/labels'
import { KanbanBoard, KanbanCard, kanbanBoardLabels, moveKanbanItem, type KanbanCardState, type KanbanColumn } from '../components/kanban-board'

type Deal = { key: number; company: string; value: number }
const items: Record<string, Deal[]> = { lead: [{ key: 1, company: 'Acme', value: 48_000 }], won: [] }
const columns: KanbanColumn[] = [
  { id: 'lead', title: 'Lead' },
  { id: 'won', title: 'Won', tone: 'green', limit: 5 },
]

// @ts-expect-error: a column's tone is a Dot tone
const wrongTone: KanbanColumn = { id: 'x', title: 'X', tone: 'amber' }

const boardRef = React.createRef<HTMLElement>()
const cardRef = React.createRef<HTMLDivElement>()

// The item type comes from `items`: renderCard and the getters get a Deal.
export const props = (
  <KanbanBoard
    ref={boardRef}
    aria-label="Deals"
    columns={columns}
    items={items}
    getItemId={(d) => String(d.key)}
    getItemLabel={(d) => d.company}
    onMove={(id: string, to: string, index: number) => moveKanbanItem(items, (d) => String(d.key), id, to, index)}
    renderCard={(d, state: KanbanCardState) => (
      <KanbanCard
        ref={cardRef}
        title={d.company}
        meta={`€${d.value.toFixed(0)} · ${state.columnId}`}
        badges={<Badge size="sm">Q4</Badge>}
        avatar={<Avatar size={24} initials="JP" />}
        actions={<DropdownMenuItem label="Open" onSelect={() => {}} />}
        moveActions={!state.lifted}
      />
    )}
    onAddItem={(columnId: string) => columnId}
    renderEmpty={(column) => <p>{column.title}</p>}
    loading={false}
    undoToast
    columnWidth={240}
  />
)

// Collapsed columns, controlled and uncontrolled.
export const controlled = (
  <KanbanBoard
    columns={columns}
    items={items}
    getItemId={(d) => String(d.key)}
    getItemLabel={(d) => d.company}
    onMove={() => {}}
    renderCard={(d) => <KanbanCard title={d.company} />}
    collapsible
    collapsedColumns={['won']}
    onCollapsedColumnsChange={(ids: string[]) => ids}
  />
)
export const uncontrolled = (
  <KanbanBoard
    columns={columns}
    items={items}
    getItemId={(d) => String(d.key)}
    getItemLabel={(d) => d.company}
    onMove={() => {}}
    renderCard={(d) => <KanbanCard title={d.company} />}
    defaultCollapsedColumns={['lead']}
  />
)

export const missing = (
  // @ts-expect-error: getItemLabel is required, for announcements and names
  <KanbanBoard columns={columns} items={items} getItemId={(d) => String(d.key)} onMove={() => {}} renderCard={() => null} />
)

export const wrongItem = (
  <KanbanBoard
    columns={columns}
    items={items}
    getItemId={(d) => String(d.key)}
    getItemLabel={(d) => d.company}
    onMove={() => {}}
    // @ts-expect-error: a Deal has no `name`
    renderCard={(d) => <KanbanCard title={d.name} />}
  />
)

// Pro's words join SatinLabels, typed.
export const translated = (
  <SatinLabels labels={{ kanbanEmpty: 'Brak kart', kanbanMoved: (item, column, position, count) => `${item} → ${column} (${position}/${count})`, undo: 'Cofnij' }}>
    {props}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ kanbanMovedTo: 'Przeniesiono' }}>{props}</SatinLabels>

export const moved: Record<string, Deal[]> = moveKanbanItem(items, (d) => String(d.key), '1', 'won', 0)
export const english: string = kanbanBoardLabels.kanbanCount(3, 5)
export { wrongTone }
