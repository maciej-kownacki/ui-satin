/* Type test, never run: toastBatch's options, its items, toastBatch.undo, and its words in SatinLabels. */
import * as React from 'react'
import { Avatar } from '@uisatin/ui/avatar'
import { SatinLabels, type SatinLabelSet } from '@uisatin/ui/labels'
import { RollingNumber, type RollingNumberProps } from '../components/rolling-number'
import { toastBatch, toastBatchLabels, type ToastBatchItem, type ToastBatchOptions } from '../components/toast-batch'

const tara: ToastBatchItem = {
  id: 'tara',
  label: 'Tara Mendes',
  description: 'From Screening',
  media: <Avatar initials="TM" size={24} />,
  undo: () => {},
}

// A string title, a title from the count, or one that places the rolling number in JSX.
export const id: string = toastBatch({ title: 'Candidate moved', items: [tara] })
export const counted: string = toastBatch({ title: (count) => `${count} candidates moved`, items: [tara], change: 'move' })
export const placed: string = toastBatch({
  id: 'interview',
  title: (count, number) => <>Moved {number} to Interview</>,
  items: [tara],
  // Async undo is fine: whatever it returns is ignored.
  undoAll: async (items) => items.map((item) => item.id),
  undoShortcut: false,
  intent: 'neutral',
  duration: Infinity,
})

// From code, as ⌘Z does: the newest batch, or one by id.
export const undone: boolean = toastBatch.undo()
export const undoneById: boolean = toastBatch.undo('interview')

export const options: ToastBatchOptions = { title: 'Moved', items: [] }

// @ts-expect-error: an item needs its own undo
export const noUndo: ToastBatchItem = { id: 'jon', label: 'Jon Park' }

// @ts-expect-error: the label names the item in its Undo, so it is text
export const nodeLabel: ToastBatchItem = { id: 'jon', label: <b>Jon Park</b>, undo: () => {} }

// @ts-expect-error: toastBatch needs a title
toastBatch({ items: [tara] })

// @ts-expect-error: intent is one of the Toast's
toastBatch({ title: 'Moved', items: [tara], intent: 'danger' })

// Its words join SatinLabels: one provider translates Free and Pro.
export const translated = (
  <SatinLabels
    labels={{
      undo: 'Cofnij',
      undoItem: (item, change) => (change ? `Cofnij ${change}: ${item}` : `Cofnij ${item}`),
      allUndone: 'Wszystko cofnięte',
      undoWithShortcut: (keys) => `Cofnij skrótem ${keys}`,
      showItems: 'Pokaż',
    }}
  >
    <span />
  </SatinLabels>
)
export const undoItem: SatinLabelSet['undoItem'] = toastBatchLabels.undoItem

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ undoWithShortcut: 'Cofnij ⌘Z' }}><span /></SatinLabels>

// The rolling number takes the shown text, the value, and a ref.
const ref = React.createRef<HTMLSpanElement>()
export const rolling = <RollingNumber ref={ref} text="1,204" value={1204} className="font-medium" />
export const rollingProps: RollingNumberProps = { text: '3', value: 3 }

// @ts-expect-error: the value picks the direction, so it's required
export const noValue = <RollingNumber text="3" />
