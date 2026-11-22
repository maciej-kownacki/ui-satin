import * as React from 'react'
import type { CsvImportField } from '@uisatin/pro/csv-import'
import { CsvImportHeaderSteps } from '../prototypes/csv-import'
import { Showcase, type ShowcaseOption } from '../components/Showcase'
import { candidatesFile } from './csv-import-data'

/*
 * HR: 80 candidates from another ATS, in a panel on the page, on the dialog's surface. It starts
 * on Upload with no file. Browse files, or a click on the drop zone, never opens the file picker
 * here: the zone shows files dragged over it for a moment, then the sample file (candidates.csv)
 * lands as if dropped, and the rest of the flow runs on it. 4 of its rows have a stage the ATS
 * doesn't have, so Review and the result show skipped rows.
 */

const candidateFields: CsvImportField[] = [
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

/** A pretend API call: 20 rows every 120 ms, reporting progress and stopping on Cancel. */
async function save(rows: Record<string, string>[], { signal, onProgress }: { signal: AbortSignal; onProgress: (done: number) => void }) {
  for (let done = 0; done < rows.length; ) {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, 120)
      signal.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('Cancelled', 'AbortError'))
      }, { once: true })
    })
    done = Math.min(done + 20, rows.length)
    onProgress(done)
  }
}

const hrCode = `import { CsvImport, type CsvImportField } from '@uisatin/pro/csv-import'

const fields: CsvImportField[] = [
  { key: 'name', label: 'Name', required: true },
  {
    key: 'stage',
    label: 'Stage',
    type: 'enum',
    required: true,
    // Matched case-insensitively against the label or the value; onImport gets the value.
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

export function ImportCandidates() {
  return (
    <CsvImport
      className="w-[640px] max-w-full rounded-2xl border border-border-subtle bg-bg-popover"
      fields={fields}
      noun={{ one: 'candidate', other: 'candidates' }}
      cancelable
      // Only the valid rows, normalised. Report progress; stop when signal aborts (Cancel).
      onImport={(rows, { signal }) => api.candidates.createMany(rows, { signal })}
    />
  )
}`

export const options: ShowcaseOption[] = [{ id: 'hr', label: 'Candidates', code: hrCode }]

/** How long the zone shows files dragged over it before the sample lands. */
const SAMPLE_DRAG_MS = 500

/** The candidates panel, on the page. Browse plays a sample drop instead of opening the picker. */
function ImportCandidates() {
  const [file, setFile] = React.useState<File | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  React.useEffect(() => () => clearTimeout(timer.current), [])
  // The drag-over look, then the file as if dropped. Under reduced motion the zone's own
  // transitions are off (motion.css), so this is two plain state changes.
  const browse = () => {
    if (dragging) return
    setDragging(true)
    timer.current = setTimeout(() => {
      setDragging(false)
      setFile(candidatesFile())
    }, SAMPLE_DRAG_MS)
  }
  return (
    <CsvImportHeaderSteps
      // The dialog's surface (DialogContent: border/subtle edge, bg/popover), here on the page.
      className="w-[640px] max-w-full rounded-2xl border border-border-subtle bg-bg-popover"
      fields={candidateFields}
      file={file}
      onFileChange={setFile}
      noun={{ one: 'candidate', other: 'candidates' }}
      cancelable
      onImport={save}
      onBrowse={browse}
      dragging={dragging}
    />
  )
}

export default function CsvImportDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return <Showcase name="CSV import" options={options} codeHtml={codeHtml} align="top" render={() => <ImportCandidates />} />
}
