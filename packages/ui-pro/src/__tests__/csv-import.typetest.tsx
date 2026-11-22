/* Type test, never run: CsvImport's props, its parts, the plain functions, refs, and its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import {
  CsvImport,
  CsvImportMapping,
  CsvImportPreview,
  CsvImportProgress,
  CsvImportResult,
  csvImportLabels,
  type CsvImportResultFilter,
  type CsvImportField,
  type CsvImportStep,
  type CsvMapping,
  type CsvNoun,
} from '../components/csv-import'
import {
  CsvParseError,
  checkCsvValue,
  csvHeaders,
  matchColumns,
  parseCsv,
  parseCsvDate,
  parseCsvNumber,
  toCsv,
  validateCsv,
  type CsvParseResult,
  type CsvValidation,
} from '../components/csv-import-parse'

const fields: CsvImportField[] = [
  { key: 'name', label: 'Name', required: true, aliases: ['Imię i nazwisko'] },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'stage', label: 'Stage', type: 'enum', options: [{ value: 'screen', label: 'Phone screen' }] },
  { key: 'start', label: 'Start', type: 'date', dateFormat: 'mm/dd/yyyy' },
  { key: 'value', label: 'Value', type: 'number', validate: (value, row) => (Number(value) < 0 && row.stage ? 'Negative' : null) },
]

// @ts-expect-error: no such type
export const wrongType: CsvImportField = { key: 'x', label: 'X', type: 'phone' }
// @ts-expect-error: validate returns the reason or null
export const wrongValidate: CsvImportField = { key: 'x', label: 'X', validate: () => true }

const rootRef = React.createRef<HTMLDivElement>()
const file = new File([''], 'leads.csv')
const mapping: CsvMapping = { 0: 'name', 1: null }
const step: CsvImportStep = 'map'
const leads: CsvNoun = { one: 'lead', other: 'leads' }
const polish: CsvNoun = { one: 'lead', few: 'leady', many: 'leadów', other: 'leada' }

export const full = (
  <CsvImport
    ref={rootRef}
    fields={fields}
    onImport={async (rows, { signal, onProgress }) => {
      const first: Record<string, string> | undefined = rows[0]
      if (signal.aborted || !first) return
      onProgress(rows.length)
    }}
    noun={leads}
    maxRows={10_000}
    maxSize={5 * 1024 * 1024}
    templateHref="/leads-template.csv"
    step={step}
    onStepChange={(s: CsvImportStep) => s}
    file={file}
    onFileChange={(f: File | null) => f}
    mapping={mapping}
    onMappingChange={(m: CsvMapping) => m}
    onDone={() => {}}
    cancelable
    disabled={false}
    className="h-auto flex-1"
  />
)
export const uncontrolled = <CsvImport fields={fields} onImport={() => {}} defaultStep="map" file={file} defaultMapping={{ 2: 'stage' }} noun={polish} />

// @ts-expect-error: fields are required
export const noFields = <CsvImport onImport={() => {}} />
// @ts-expect-error: onImport is required
export const noImport = <CsvImport fields={fields} />
// @ts-expect-error: no such step
export const wrongStep = <CsvImport fields={fields} onImport={() => {}} step="done" />
// @ts-expect-error: no startAt; use defaultStep="map" with a file
export const startAt = <CsvImport fields={fields} onImport={() => {}} startAt="map" />
// @ts-expect-error: the mapping is by column index
export const byName = <CsvImport fields={fields} onImport={() => {}} mapping={{ Firma: 'company' }} />

declare const validation: CsvValidation
export const parts = (
  <>
    <CsvImportMapping
      fields={fields}
      headers={['Imię i nazwisko', 'E-mail']}
      rows={[['Anna', 'anna@firma.pl']]}
      mapping={mapping}
      onMappingChange={(m) => m}
      header
      onHeaderChange={(h: boolean) => h}
      meta="leads.csv · 340 rows"
      ref={React.createRef<HTMLDivElement>()}
    />
    <CsvImportPreview fields={fields} mapping={mapping} validation={validation} overLimit={20} defaultErrorsOnly ref={React.createRef<HTMLDivElement>()} />
    <CsvImportProgress done={120} total={328} ref={React.createRef<HTMLDivElement>()} />
    <CsvImportResult
      fields={fields}
      mapping={mapping}
      validation={validation}
      imported={120}
      status="stopped"
      reason="The CRM answered 503."
      onRetry={() => {}}
      overLimit={20}
      noun={{ one: 'lead', other: 'leads' }}
      defaultFilter="skipped"
      onFilterChange={(f: CsvImportResultFilter) => f}
      headers={['Imię i nazwisko', 'E-mail']}
      fileName="leads.csv"
      delimiter=";"
      ref={React.createRef<HTMLDivElement>()}
    />
  </>
)
// @ts-expect-error: the result needs how many rows were saved
export const noImported = <CsvImportResult fields={fields} mapping={mapping} validation={validation} />
// @ts-expect-error: a segment the result doesn't have
export const wrongFilter = <CsvImportResult fields={fields} mapping={mapping} validation={validation} imported={0} filter="all" />
// @ts-expect-error: the mapping part needs its headers
export const noHeaders = <CsvImportMapping fields={fields} rows={[]} mapping={mapping} onMappingChange={() => {}} />

// The plain functions.
export const parsed: Promise<CsvParseResult> = parseCsv(file, { maxRows: 100, signal: new AbortController().signal, onProgress: (n: number) => n })
export const fromText: Promise<CsvParseResult> = parseCsv('a,b\n1,2')
declare const result: CsvParseResult
export const headers: string[] = csvHeaders(result, result.header, (n) => `Kolumna ${n}`)
export const matched: CsvMapping = matchColumns(headers, fields)
export const checked: Promise<CsvValidation> = validateCsv(result.records, matched, fields, { header: true, locale: 'pl-PL', maxRows: 100 })
export const amount: string | null = parseCsvNumber('1 234,50', 'pl-PL')
export const day: string | null = parseCsvDate('03.11.2026', 'dd.mm.yyyy')
export const value: string | undefined = checkCsvValue(fields[1], 'anna@firma.pl').value
export const text: string = toCsv([['a', 'b']], { delimiter: ';', bom: true })
export const code: 'excel' | 'binary' | 'unterminated' | 'empty' = new CsvParseError('excel', 'x').code
export const defaults: string = csvImportLabels.csvNext

// Pro's words join SatinLabels: one provider for both packages, typed.
export const translated = (
  <SatinLabels
    labels={{
      close: 'Zamknij',
      csvStepUpload: 'Plik',
      csvRowNoun: { one: 'wiersz', few: 'wiersze', many: 'wierszy', other: 'wiersza' },
      csvImportRows: (count, noun) => `Importuj ${count} ${noun}`,
      csvMapsToColumn: (column) => `Pole dla kolumny ${column}`,
      csvImportStopped: (count, noun, notImported) => `Import przerwany · ${count} ${noun} · ${notImported} pominiętych`,
    }}
  >
    {full}
  </SatinLabels>
)

// @ts-expect-error: a label that carries data is a function
export const wrongLabel = <SatinLabels labels={{ csvImportRows: 'Importuj' }}>{full}</SatinLabels>
// @ts-expect-error: a noun needs its other form
export const wrongNoun = <SatinLabels labels={{ csvRowNoun: { one: 'wiersz' } }}>{full}</SatinLabels>
