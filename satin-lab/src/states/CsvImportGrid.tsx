import * as React from 'react'
import { CsvImport, type CsvImportField, type CsvImportProps } from '@uisatin/pro/csv-import'
import { SatinMark } from '../demos/csv-import'
import { candidatesCsv } from '../demos/csv-import-data'

/**
 * Every state of the CSV import the docs page shows (Satin Pro's CsvImport), with the docs'
 * candidates, side by side in the same 640 × 600 frame on the dialog's surface, so the steps row
 * and the footer can be compared across them. A file handed in starts on Map columns; states
 * further on press Next, then Import, from here once they are there: no prop exists for them.
 */

const fields: CsvImportField[] = [
  { key: 'name', label: 'Name', required: true },
  {
    key: 'stage',
    label: 'Stage',
    type: 'enum',
    required: true,
    options: [
      { value: 'applied', label: 'Applied' },
      { value: 'screening', label: 'Screening' },
      { value: 'interview', label: 'Interview' },
      { value: 'offer', label: 'Offer' },
      { value: 'hired', label: 'Hired' },
    ],
  },
  { key: 'source', label: 'Source' },
]
const noun = { one: 'candidate', other: 'candidates' }

const csvFile = (text: string) => new File([text], 'candidates.csv', { type: 'text/csv' })
const rows = () => candidatesCsv().split('\r\n')
/** The sample without its Stage column, so Stage (required) has nothing to map. */
const withoutStage = () =>
  rows()
    .map((line) => line.split(',').filter((_, i) => i !== 1).join(','))
    .join('\r\n')
/** The sample without its 4 rows whose stage the ATS doesn't have: an import with nothing to skip. */
const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired']
const withoutOffStage = () =>
  rows()
    .filter((line, i) => i === 0 || STAGES.includes((line.split(',')[1] ?? '').toLowerCase()))
    .join('\r\n')

const never = () => new Promise<void>(() => {})
const atsDown = () => Promise.reject(new Error('The ATS answered 503: try again in a minute.'))

/** `next` presses Next (to Review) once it is there; `press` then presses Import once the rows are checked. */
type State = { name: string; props: () => Partial<CsvImportProps>; next?: boolean; press?: boolean }

const states: State[] = [
  { name: 'upload', props: () => ({}) },
  { name: 'upload, the sample being dropped (drag-over look)', props: () => ({ dragging: true }) },
  { name: 'map (auto-matched)', props: () => ({ file: csvFile(candidatesCsv()) }) },
  { name: 'map blocked (Stage has no column)', props: () => ({ file: csvFile(withoutStage()) }) },
  { name: 'review with errors', next: true, props: () => ({ file: csvFile(candidatesCsv()) }) },
  {
    name: 'importing (cancelable)',
    next: true,
    press: true,
    props: () => ({
      file: csvFile(candidatesCsv()),
      cancelable: true,
      onImport: (_rows, { onProgress }) => {
        onProgress(40)
        return never()
      },
    }),
  },
  { name: 'result: done, 4 skipped', next: true, press: true, props: () => ({ file: csvFile(candidatesCsv()), onImport: () => {}, onDone: () => {} }) },
  { name: 'result: done, none skipped', next: true, press: true, props: () => ({ file: csvFile(withoutOffStage()), onImport: () => {}, onDone: () => {} }) },
  { name: 'result: nothing imported (onImport rejects at once)', next: true, press: true, props: () => ({ file: csvFile(candidatesCsv()), onImport: atsDown }) },
  {
    name: 'result: stopped at 40',
    next: true,
    press: true,
    props: () => ({
      file: csvFile(candidatesCsv()),
      onImport: (_rows, { onProgress }) => {
        onProgress(40)
        return atsDown()
      },
    }),
  },
]

/** The footer's last button whose text passes `match`, once it is there and enabled. */
const footerButton = (frame: HTMLElement, match: (text: string) => boolean) => {
  const button = [...frame.querySelectorAll<HTMLButtonElement>('[data-slot="csv-import-footer"] button')].at(-1)
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || !match(button.textContent ?? '')) return null
  return button
}

/** Presses Next, then Import, as the state asks, each once it is ready. */
function usePresses(frame: React.RefObject<HTMLDivElement | null>, state: State) {
  React.useEffect(() => {
    if (!state.next && !state.press) return
    let next = !!state.next
    const timer = setInterval(() => {
      if (!frame.current) return
      if (next) {
        const button = footerButton(frame.current, (t) => t === 'Next')
        if (!button) return
        next = false
        button.click()
        if (!state.press) clearInterval(timer)
        return
      }
      const button = footerButton(frame.current, (t) => t.startsWith('Import'))
      if (!button) return
      clearInterval(timer)
      button.click()
    }, 50)
    return () => clearInterval(timer)
  }, [frame, state])
}

function Frame({ state }: { state: State }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const props = React.useMemo(state.props, [state])
  usePresses(ref, state)
  return (
    <div className="flex flex-col gap-3">
      <span>{state.name}</span>
      <div ref={ref} className="h-[600px] w-[640px] rounded-2xl border border-border-subtle bg-bg-popover">
        <CsvImport className="h-full" fields={fields} noun={noun} appIcon={<SatinMark />} onImport={() => {}} {...props} />
      </div>
    </div>
  )
}

export function CsvImportGrid() {
  return (
    <div className="flex flex-wrap gap-10 p-8 text-xs text-text-muted">
      {states.map((state) => (
        <Frame key={state.name} state={state} />
      ))}
    </div>
  )
}
