import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { DialogContent, DialogDescription, DialogHeader, DialogRoot, DialogTitle, DialogTrigger } from '@uisatin/ui/dialog'
import { Link } from '@uisatin/ui/link'
import { CsvImport, type CsvImportField } from '@uisatin/pro/csv-import'
import { Showcase, type ShowcaseOption } from '../components/Showcase'
import { candidatesFile, leadsFile, leadsTemplateHref } from './csv-import-data'

/*
 * Sales: a rep brings 340 people from a trade fair in Poznań into the CRM, from the Import leads
 * dialog. "E-mail" matches Email by name, "Firma" matches Company through its aliases, "Źródło"
 * stays on Don't import, and 12 emails are broken. "Use the sample file" hands the component a
 * file through `file`, so the reader can try it without one; browse and drop work as well.
 *
 * HR: 80 candidates from another ATS, in a panel on the page, starting on Map columns.
 */

const leadFields: CsvImportField[] = [
  { key: 'name', label: 'Name', aliases: ['Imię i nazwisko', 'Full name'] },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'company', label: 'Company', required: true, aliases: ['Firma', 'Company name'] },
  { key: 'phone', label: 'Phone', aliases: ['Telefon'] },
]

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

const salesCode = `import * as React from 'react'
import { Button } from '@uisatin/ui/button'
import { DialogContent, DialogDescription, DialogHeader, DialogRoot, DialogTitle, DialogTrigger } from '@uisatin/ui/dialog'
import { CsvImport, type CsvImportField } from '@uisatin/pro/csv-import'

const fields: CsvImportField[] = [
  { key: 'name', label: 'Name', aliases: ['Imię i nazwisko', 'Full name'] },
  // "E-mail" matches by name: case, diacritics, spaces, - and _ don't count.
  { key: 'email', label: 'Email', type: 'email', required: true },
  // "Firma" only matches through an alias.
  { key: 'company', label: 'Company', required: true, aliases: ['Firma', 'Company name'] },
  { key: 'phone', label: 'Phone', aliases: ['Telefon'] },
]

export function ImportLeads() {
  const [open, setOpen] = React.useState(false)
  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Import leads</Button>
      </DialogTrigger>
      {/* 640px wide with a definite height, so the import fills it and only its body scrolls. */}
      <DialogContent className="h-[min(640px,100%)] w-[640px] max-w-[min(640px,100%)]">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>People you met at the fair, from a CSV export.</DialogDescription>
        </DialogHeader>
        <CsvImport
          className="h-auto flex-1"
          fields={fields}
          noun={{ one: 'lead', other: 'leads' }}
          maxRows={10_000}
          maxSize={5 * 1024 * 1024}
          templateHref="/templates/leads.csv"
          cancelable
          // Only the valid rows, normalised. Report progress; stop when signal aborts (Cancel).
          onImport={async (rows, { signal, onProgress }) => {
            for (let done = 0; done < rows.length; done += 100) {
              await api.leads.createMany(rows.slice(done, done + 100), { signal })
              onProgress(Math.min(done + 100, rows.length))
            }
          }}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </DialogRoot>
  )
}`

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

/** The app already has the file (an export from the old ATS), so the flow starts on Map columns. */
export function ImportCandidates({ file }: { file: File }) {
  return (
    <CsvImport
      className="w-[640px] max-w-full rounded-2xl border border-border-subtle bg-bg-card"
      fields={fields}
      file={file}
      defaultStep="map"
      noun={{ one: 'candidate', other: 'candidates' }}
      onImport={(rows) => api.candidates.createMany(rows)}
    />
  )
}`

export const options: ShowcaseOption[] = [
  { id: 'sales', label: 'Import leads', code: salesCode },
  { id: 'hr', label: 'Candidates', code: hrCode },
]

/** The Import leads dialog, open inside the stage (portal + absolute), not over the docs page. */
function ImportLeads() {
  const [layer, setLayer] = React.useState<HTMLDivElement | null>(null)
  const [open, setOpen] = React.useState(true)
  const [file, setFile] = React.useState<File | null>(null)
  const openedOnce = React.useRef(false)

  return (
    <div className="relative grid h-[600px] w-[680px] max-w-full place-items-center">
      <div ref={setLayer} className="pointer-events-none absolute inset-0 z-10" />
      {layer && (
        <DialogRoot
          open={open}
          onOpenChange={(next) => {
            // A fresh start each time it opens; closing leaves the import as it was until it's gone.
            if (next) setFile(null)
            setOpen(next)
          }}
          // Inline preview: don't lock the docs page.
          modal={false}
        >
          <DialogTrigger asChild>
            <Button>Import leads</Button>
          </DialogTrigger>
          <DialogContent
            container={layer}
            className="h-[min(640px,100%)] w-[640px] max-w-[min(640px,100%)]"
            // Don't steal focus on page load; opened again from its trigger, it takes focus.
            onOpenAutoFocus={(e) => {
              if (!openedOnce.current) e.preventDefault()
              openedOnce.current = true
            }}
            // A click on the docs page around the stage doesn't close it.
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Import leads</DialogTitle>
              <DialogDescription>
                People you met at the fair, from a CSV export. No file at hand?{' '}
                <Link asChild>
                  <button type="button" onClick={() => setFile(leadsFile())}>
                    Use the sample file
                  </button>
                </Link>
              </DialogDescription>
            </DialogHeader>
            <CsvImport
              className="h-auto flex-1"
              fields={leadFields}
              noun={{ one: 'lead', other: 'leads' }}
              maxRows={10_000}
              maxSize={5 * 1024 * 1024}
              templateHref={leadsTemplateHref}
              file={file}
              onFileChange={setFile}
              cancelable
              onImport={save}
              onDone={() => setOpen(false)}
            />
          </DialogContent>
        </DialogRoot>
      )}
    </div>
  )
}

/** The candidates panel, on the page, starting on Map columns. */
function ImportCandidates() {
  const [file, setFile] = React.useState<File | null>(candidatesFile)
  return (
    <CsvImport
      className="w-[640px] max-w-full rounded-2xl border border-border-subtle bg-bg-card"
      fields={candidateFields}
      file={file}
      onFileChange={setFile}
      defaultStep="map"
      noun={{ one: 'candidate', other: 'candidates' }}
      onImport={save}
    />
  )
}

export default function CsvImportDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="CSV import"
      options={options}
      codeHtml={codeHtml}
      align="top"
      render={(id) => (id === 'hr' ? <ImportCandidates key={id} /> : <ImportLeads key={id} />)}
    />
  )
}
