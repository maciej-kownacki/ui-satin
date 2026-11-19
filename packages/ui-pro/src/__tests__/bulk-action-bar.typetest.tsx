/* Type test, never run: BulkActionBar's props, its parts, refs, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  BulkActionBar,
  BulkActionBarAction,
  BulkActionBarCount,
  BulkActionBarOverflow,
  BulkActionBarRoot,
  BulkActionBarSeparator,
  type BulkAction,
} from '../components/bulk-action-bar'
import { toastBatch } from '../components/toast-batch'

const actions: BulkAction[] = [
  { label: 'Move', onSelect: async () => {}, shortcut: 'M' },
  // Controlled: the app drives the Spinner.
  { label: 'Delete', onSelect: () => {}, tone: 'destructive', running: true },
]

// @ts-expect-error: no such tone
const wrongTone: BulkAction = { label: 'x', onSelect: () => {}, tone: 'danger' }

const barRef = React.createRef<HTMLDivElement>()
const buttonRef = React.createRef<HTMLButtonElement>()

export const props = <BulkActionBar ref={barRef} count={3} onClear={() => {}} actions={actions} overflow={actions} position="absolute" />

export const parts = (
  <BulkActionBarRoot count={2} onClear={() => {}} aria-describedby="hint">
    <BulkActionBarCount />
    <BulkActionBarSeparator />
    <BulkActionBarAction ref={buttonRef} label="Move" onSelect={() => {}} shortcut="⌘⇧M" />
    <BulkActionBarOverflow actions={actions} />
  </BulkActionBarRoot>
)

// @ts-expect-error: count and onClear are required
export const missing = <BulkActionBar actions={actions} />

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels labels={{ close: 'Zamknij', clearSelection: 'Wyczyść', bulkSelected: (n, number) => <>{number} zaznaczone</>, undoItem: (item) => `Cofnij ${item}` }}>
    {props}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ undoItem: 'Cofnij' }}>{props}</SatinLabels>

export const id: string = toastBatch({ title: (n) => `${n} moved`, items: [{ id: '1', label: 'Acme', undo: () => {} }], undoAll: (items) => items.length })
export { wrongTone }
