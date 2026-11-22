import * as React from 'react'
import { CsvImport, type CsvImportField, type CsvImportProps } from '@uisatin/pro/csv-import'
import { leadsCsv } from '../demos/csv-import-data'

/**
 * Every state of CSV import side by side, each in the same 640 × 520 frame so the footer and
 * the panel can be compared across them. States that need a click (importing and the
 * results) press Import from here once the rows are checked: no prop of the component exists
 * for them.
 */

const fields: CsvImportField[] = [
  { key: 'name', label: 'Name', aliases: ['Imię i nazwisko'] },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'company', label: 'Company', required: true, aliases: ['Firma'] },
  { key: 'phone', label: 'Phone', aliases: ['Telefon'] },
]
const noun = { one: 'lead', other: 'leads' }

const csvFile = (text: string, name = 'targi-poznan-leads.csv') => new File(['﻿' + text], name, { type: 'text/csv' })
/** The sample file without its Firma column, so Company (required) has nothing to map. */
const withoutCompany = () =>
  leadsCsv()
    .split('\r\n')
    .map((line) => line.split(';').filter((_, i) => i !== 2).join(';'))
    .join('\r\n')

type State = { name: string; props: () => Partial<CsvImportProps>; press?: boolean }

const never = () => new Promise<void>(() => {})

const states: State[] = [
  { name: 'empty', props: () => ({}) },
  {
    name: 'rejected file (an Excel file renamed .csv)',
    props: () => ({ file: new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00])], 'leads.csv', { type: 'text/csv' }) }),
  },
  { name: 'map: missing required field', props: () => ({ file: csvFile(withoutCompany()), defaultStep: 'map' }) },
  {
    name: 'map: duplicate mapping (Telefon picked as Email)',
    props: () => ({ file: csvFile(leadsCsv()), defaultStep: 'map', mapping: { 0: 'name', 1: 'email', 2: 'company', 3: 'email', 4: null } }),
  },
  { name: 'review with errors', props: () => ({ file: csvFile(leadsCsv()), defaultStep: 'review' }) },
  {
    name: 'importing (cancelable)',
    press: true,
    props: () => ({
      file: csvFile(leadsCsv()),
      defaultStep: 'review',
      cancelable: true,
      onImport: (_rows, { onProgress }) => {
        onProgress(120)
        return never()
      },
    }),
  },
  { name: 'result: done, 12 skipped', press: true, props: () => ({ file: csvFile(leadsCsv()), defaultStep: 'review', onImport: () => {}, onDone: () => {} }) },
  {
    name: 'result: nothing imported (onImport rejects at once)',
    press: true,
    props: () => ({
      file: csvFile(leadsCsv()),
      defaultStep: 'review',
      onImport: () => Promise.reject(new Error('The CRM answered 503: try again in a minute.')),
    }),
  },
  {
    name: 'result: stopped at 200',
    press: true,
    props: () => ({
      file: csvFile(leadsCsv()),
      defaultStep: 'review',
      onImport: (_rows, { onProgress }) => {
        onProgress(200)
        return Promise.reject(new Error('The CRM answered 503: try again in a minute.'))
      },
    }),
  },
  { name: 'parse error (a quote never closed)', props: () => ({ file: csvFile('Imię i nazwisko;E-mail;Firma\r\nAnna Nowak;anna@hydrobud.pl;"Hydrobud\r\nPiotr Mazur;piotr@pakmar.eu;Pakmar\r\n') }) },
]

/** Presses Import once it is ready (the file read and the rows checked). */
function usePressImport(frame: React.RefObject<HTMLDivElement | null>, press: boolean) {
  React.useEffect(() => {
    if (!press) return
    const timer = setInterval(() => {
      const button = [...(frame.current?.querySelectorAll<HTMLButtonElement>('[data-slot="csv-import-footer"] button') ?? [])].at(-1)
      if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || !button.textContent?.startsWith('Import')) return
      clearInterval(timer)
      button.click()
    }, 50)
    return () => clearInterval(timer)
  }, [frame, press])
}

function Frame({ state }: { state: State }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const props = React.useMemo(state.props, [state])
  usePressImport(ref, !!state.press)
  return (
    <div className="flex flex-col gap-3">
      <span>{state.name}</span>
      <div ref={ref} className="h-[520px] w-[640px] rounded-2xl border border-border-subtle bg-bg-card">
        <CsvImport className="h-full" fields={fields} noun={noun} onImport={() => {}} {...props} />
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
