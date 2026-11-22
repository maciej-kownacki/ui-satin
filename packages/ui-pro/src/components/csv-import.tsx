'use client'

import * as React from 'react'
import { Check, Download, WarningCircle } from 'iconoir-react'
import { Alert } from '@uisatin/ui/alert'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { EmptyState } from '@uisatin/ui/empty-state'
import { FileUpload, formatBytes, type FileUploadRejection } from '@uisatin/ui/file-upload'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Link } from '@uisatin/ui/link'
import { Pagination } from '@uisatin/ui/pagination'
import { Progress } from '@uisatin/ui/progress'
import { SegmentedControl } from '@uisatin/ui/segmented-control'
import { Select } from '@uisatin/ui/select'
import { Spinner } from '@uisatin/ui/spinner'
import { useStepSlide } from '@uisatin/ui/step-slide'
import { Stepper } from '@uisatin/ui/stepper'
import { Table, type Column } from '@uisatin/ui/table'
import { Tooltip } from '@uisatin/ui/tooltip'
import {
  CsvParseError,
  csvHeaders,
  isAbortError,
  matchColumns,
  parseCsv,
  runCsvJob,
  toCsv,
  validationJob,
  type CsvCheckedRow,
  type CsvDelimiter,
  type CsvImportField,
  type CsvMapping,
  type CsvParseResult,
  type CsvValidation,
  type CsvValueError,
} from './csv-import-parse'

export type { CsvFieldType, CsvImportField, CsvMapping } from './csv-import-parse'

/**
 * CsvImport: a CSV file into your records in three steps, Upload › Map columns › Review, in one
 * panel whose frame never moves. A Stepper on top, a body of fixed height that scrolls inside,
 * and a 68px footer with Back, the reason the next action is blocked (visible text, also its
 * Tooltip and `aria-describedby`) and the primary action. Steps change with Satin's step slide
 * (useStepSlide), the only motion.
 *
 * - Upload: a FileUpload locked to CSV. Excel files (even renamed .csv), binary files and a
 *   wrong type or size show their reason in an Alert. While the file is read, a Spinner and
 *   "Reading 4,212 rows…"; then it moves to Map columns on its own.
 * - Map columns: one row per CSV column, its sample values, a "Maps to" Select of the fields
 *   plus "Don't import", and an "Auto-matched" Badge. Columns auto-match by key, label and
 *   `aliases`, ignoring case, diacritics, spaces, `-` and `_`. Next stays blocked while a
 *   required field has no column or a field has two.
 * - Review: "340 rows · 328 ready · 12 with errors", an Alert grouping the errors by field (each
 *   group jumps to its first cell), "Show only errors", and the rows, 100 a page. Nothing is
 *   sent before "Import 328 leads". Importing and its result are states of Review: Progress
 *   while `onImport` runs, then CsvImportResult, a table of what was imported and skipped
 *   with "Download skipped rows" (a CSV with an `error` column). "Import another file" takes
 *   Back's place. It never closes by itself; `onDone` adds Done.
 *
 * `onImport` gets only the valid rows, keyed by field, normalised: text trimmed, an enum as its
 * option's `value`, a number as a plain decimal ("1234.5"), a date as yyyy-mm-dd. Report
 * progress with `onProgress(done)`. A rejected promise, or Cancel (with `cancelable`, it aborts
 * `signal`) after some rows were saved, shows the result as stopped, with Retry; a failure
 * before any row shows it with nothing imported, and Cancel before any row goes back to Review.
 * Import and Retry send only the rows after the last `onProgress` count, never a saved row
 * again; the file and mapping stay.
 *
 * The root is 520px tall; in a Dialog or Sheet give it `className="h-auto flex-1"` (or
 * `h-full`) so it fills it. Parts for an app that already has the file: CsvImportMapping,
 * CsvImportPreview, CsvImportProgress, CsvImportResult, and the plain functions in `@uisatin/pro/csv-import-parse`.
 * Other props, `ref` included, go to the root.
 */

/** The words CsvImport says on its own. They join SatinLabels, so the app translates them there. */
export const csvImportLabels = {
  /** The Stepper's name. */
  csvSteps: 'Import steps',
  csvStepUpload: 'Upload',
  csvStepMap: 'Map columns',
  csvStepReview: 'Review',
  /** The default `noun`: what a row is. Add `few` and `many` for languages that need them. */
  csvRowNoun: { one: 'row', other: 'rows' } as CsvNoun,
  /** A count with its noun, already formatted and picked: "340 rows". */
  csvCount: (count: string, noun: string) => `${count} ${noun}`,
  csvBack: 'Back',
  csvNext: 'Next',
  csvCancel: 'Cancel',
  csvDone: 'Done',
  csvRetry: 'Retry',
  /** Retry after an import stopped part way: `row` is the first row not yet imported, formatted. */
  csvRetryFrom: (row: string) => `Retry from row ${row}`,
  /* Upload */
  csvDropTitle: 'Drop a CSV file here',
  /** Under the drop title: the limits, already formatted ("10,000", "5 MB"), either can be null. */
  csvUploadHint: (maxRows: string | null, maxSize: string | null) =>
    ['CSV with a header row', maxRows && `up to ${maxRows} rows`].filter(Boolean).join(', ') + (maxSize ? ` · ${maxSize}` : ''),
  csvTemplate: 'Download template',
  /** The footer while there is no file yet. */
  csvChooseFile: 'Choose a CSV file to continue',
  /** An Alert's title when a file is turned away. */
  csvRejected: (name: string) => `${name} can’t be imported`,
  csvNotCsv: 'Only CSV files can be imported. Save it as CSV and try again.',
  csvExcel: 'Excel files aren’t supported. Save it as CSV and try again.',
  csvBinary: 'This isn’t a text file. Save it as CSV and try again.',
  csvEmpty: 'The file has no rows.',
  /** A quote that is never closed; `row` is formatted. */
  csvUnterminated: (row: string) => `A quote in row ${row} is never closed. Fix it in the file and try again.`,
  csvReadFailed: 'The file couldn’t be read.',
  /** The Alert's title when reading fails. */
  csvParseFailed: (name: string) => `${name} couldn’t be read`,
  csvReadingFile: (name: string) => `Reading ${name}…`,
  /** While reading: the rows so far, formatted, with their noun. */
  csvReading: (count: string, noun: string) => `Reading ${count} ${noun}…`,
  /** Read out when the file is read. */
  csvRead: (count: string, noun: string) => `${count} ${noun} read`,
  /* Map columns */
  csvHeaderRow: 'First row is a header',
  /** A column with no header, or a repeated one: its place, from 1. */
  csvColumnN: (n: number) => `Column ${n}`,
  csvColumn: 'CSV column',
  csvSample: 'Sample',
  csvMapsTo: 'Maps to',
  csvStatus: 'Status',
  /** Each mapping Select's name. */
  csvMapsToColumn: (column: string) => `Maps to, CSV column ${column}`,
  csvDontImport: 'Don’t import',
  csvAutoMatched: 'Auto-matched',
  /** The table's name. */
  csvColumns: 'CSV columns',
  /** Over the table while a required field has no column. */
  csvRequiredMissing: (field: string) => `${field} is required: map a column to it`,
  /** The footer's reason while a required field has no column. */
  csvMapRequired: (field: string) => `Map a column to ${field}`,
  /** Under the second Select that picks a field already taken. */
  csvAlreadyMapped: (field: string) => `${field} is already mapped`,
  /** The footer's reason while a field has two columns. */
  csvMappedTwice: (field: string) => `${field} is mapped to two columns`,
  csvMapSomething: 'Map at least one column',
  /* Review */
  csvChecking: 'Checking rows…',
  csvReady: (count: string) => `${count} ready`,
  csvWithErrors: (count: string) => `${count} with errors`,
  /** Rows past `maxRows`: neither imported nor in the skipped rows file. */
  csvOverLimit: (count: string) => `${count} over the limit`,
  /** The errors Alert's title. */
  csvErrorsTitle: (count: string, noun: string) => `${count} ${noun} won’t be imported`,
  /** One group of errors, a link to its first cell: "Email: 12 invalid". */
  csvFieldErrors: (field: string, count: string) => `${field}: ${count} invalid`,
  csvShowErrors: 'Show only errors',
  /** The preview table's name. */
  csvPreview: 'Rows to import',
  /** The row number column's header. */
  csvRowNumber: '#',
  csvErrorRequired: 'Required',
  csvErrorEmail: 'Not an email address',
  csvErrorNumber: 'Not a number',
  /** `formats`: the date formats it takes, "dd.mm.yyyy or yyyy-mm-dd". */
  csvErrorDate: (formats: string) => `Not a date like ${formats}`,
  csvErrorEnum: (options: string) => `Not one of ${options}`,
  /** A field's `validate` threw without a message. */
  csvErrorInvalid: 'Not valid',
  /** The Alert's title when checking the rows fails. */
  csvCheckFailed: 'The rows couldn’t be checked',
  /** Joins two or more choices in an error ("dd.mm.yyyy or yyyy-mm-dd"). */
  csvOr: (items: string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`),
  /** The primary action, with the count and noun: "Import 328 leads". */
  csvImportRows: (count: string, noun: string) => `Import ${count} ${noun}`,
  csvNothingToImport: 'No rows are ready to import',
  csvImporting: (done: string, total: string) => `Importing ${done} of ${total}…`,
  csvImportStarted: (count: string, noun: string) => `Importing ${count} ${noun}…`,
  /** The result's heading when the import finished: "328 leads imported · 12 skipped". */
  csvImported: (count: string, noun: string, skipped: string | null) => `${count} ${noun} imported${skipped ? ` · ${skipped} skipped` : ''}`,
  /** The result's heading when an import stopped part way. */
  csvImportStopped: (count: string, noun: string, notImported: string, skipped: string | null) =>
    `Import stopped · ${count} ${noun} imported · ${notImported} not imported${skipped ? ` · ${skipped} skipped` : ''}`,
  /** The result's heading, and its empty Imported table, when no row was saved: `noun` is the zero form. */
  csvNothingImported: (noun: string, skipped: string | null) => `No ${noun} were imported${skipped ? ` · ${skipped} skipped` : ''}`,
  /** Why a stopped import stopped, when it was cancelled. */
  csvImportCancelled: 'The import was cancelled.',
  /** The result's segmented control's name. */
  csvResultFilter: 'Rows to show',
  csvSegmentImported: 'Imported',
  csvSegmentSkipped: 'Skipped',
  csvSegmentNotImported: 'Not imported',
  /** The result table's name, one per segment. */
  csvImportedTable: 'Imported rows',
  csvSkippedTable: 'Skipped rows',
  csvNotImportedTable: 'Rows not imported',
  /** The skipped rows' reason column. */
  csvReason: 'Reason',
  /** In the empty Imported table when every row is in another segment. */
  csvShowSkipped: 'Show skipped rows',
  csvNoneSkipped: 'No rows were skipped',
  csvNoneSkippedHint: 'Every row in the file passed its checks.',
  /** On done, for rows past `maxRows`. */
  csvOverLimitNote: (count: string, noun: string) => `${count} ${noun} over the limit weren’t imported and aren’t in the skipped rows file.`,
  csvDownloadSkipped: 'Download skipped rows',
  csvImportAnother: 'Import another file',
  /** The skipped rows file's last column. */
  csvErrorColumn: 'error',
  /** One reason in that column: "Email: Not an email address". */
  csvErrorCell: (field: string, reason: string) => `${field}: ${reason}`,
  /** The skipped rows file's name, from the file's name without .csv. */
  csvSkippedFile: (name: string) => `${name}-skipped.csv`,
  /** A failed import's title; `row` is how far it got, formatted, or null. */
  csvImportFailed: (row: string | null) => (row ? `Import stopped at row ${row}` : 'Import failed'),
  csvImportFailedReason: 'Something went wrong.',
  csvKept: 'Your file and mapping are kept.',
}

type CsvImportLabels = typeof csvImportLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends CsvImportLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...csvImportLabels, ...labels }), [labels])
}
type Labels = ReturnType<typeof useLabels>

/* ---------- types ---------- */

/** A noun in its plural forms: `one` and `other`, and `zero`, `two`, `few` or `many` where the language has them. */
export type CsvNoun = { one: string; other: string } & Partial<Record<'zero' | 'two' | 'few' | 'many', string>>

export type CsvImportStep = 'upload' | 'map' | 'review'

export interface CsvImportContext {
  signal: AbortSignal
  /** How many of the rows this call got are done so far. Retry resumes after the last count. */
  onProgress: (done: number) => void
}

export interface CsvImportProps extends Omit<React.ComponentProps<'div'>, 'children' | 'onChange'> {
  fields: CsvImportField[]
  /**
   * Gets only the valid rows, keyed by field, normalised (text trimmed, an enum as its option's
   * value, a number as "1234.5", a date as yyyy-mm-dd), once Import is pressed. Report progress
   * with `onProgress` and honour `signal` for Cancel. A rejected promise shows its message with
   * Retry in the result; void or a resolved promise is done. Retry resumes: it calls `onImport` again with
   * only the rows after the last `onProgress(done)` count, so report a row done once it is
   * saved. `onProgress` in that call counts from 0 again; the panel adds what was done before.
   */
  onImport: (rows: Record<string, string>[], ctx: CsvImportContext) => void | Promise<void>
  /** "lead" / "leads": used in "Import 328 leads". Defaults to the `csvRowNoun` label. */
  noun?: CsvNoun
  /** Data rows to import at most. Rows past it are counted and reported, never imported. */
  maxRows?: number
  /** Largest file, in bytes. */
  maxSize?: number
  /** A template CSV to download, linked under the drop zone. */
  templateHref?: string
  step?: CsvImportStep
  /** Start on `map` with a `file` to skip Upload. */
  defaultStep?: CsvImportStep
  onStepChange?: (step: CsvImportStep) => void
  file?: File | null
  onFileChange?: (file: File | null) => void
  mapping?: CsvMapping
  /** Wins over auto-match for its columns. */
  defaultMapping?: CsvMapping
  /** Called with each change, and with the auto-matched mapping when a new file is read. */
  onMappingChange?: (mapping: CsvMapping) => void
  /** Adds Done to the footer of the result. */
  onDone?: () => void
  /** Shows Cancel while importing: `onImport` honours its `signal`. */
  cancelable?: boolean
  disabled?: boolean
}

/* ---------- shared bits ---------- */

const SKIP = '\u0000skip'
const STEPS: CsvImportStep[] = ['upload', 'map', 'review']
const ROW_KEY = '\u0000n'
const PAGE_SIZE = 100

/** Counts in the labels' locale: the number formatted, and the noun's form for it. */
function useCounts(labels: Labels) {
  return React.useMemo(() => {
    const numbers = new Intl.NumberFormat(labels.dateLocale)
    const rules = new Intl.PluralRules(labels.dateLocale)
    const n = (count: number) => numbers.format(count)
    const noun = (count: number, forms: CsvNoun = labels.csvRowNoun) => forms[rules.select(count) as keyof CsvNoun] ?? forms.other
    return { n, noun }
  }, [labels])
}

/** The reason a value failed, in words. */
function reasonOf(error: CsvValueError, field: CsvImportField | undefined, labels: Labels) {
  switch (error.code) {
    case 'required':
      return labels.csvErrorRequired
    case 'email':
      return labels.csvErrorEmail
    case 'number':
      return labels.csvErrorNumber
    case 'date':
      return labels.csvErrorDate(labels.csvOr([field?.dateFormat, 'dd.mm.yyyy', 'yyyy-mm-dd'].filter((f): f is string => !!f)))
    case 'enum':
      return labels.csvErrorEnum(labels.csvOr((field?.options ?? []).map((o) => o.label)))
    case 'invalid':
      return labels.csvErrorInvalid
    default:
      return error.message
  }
}

/** What blocks Map columns: fields with two columns (the later column of each) and required fields with none. */
function mappingIssues(mapping: CsvMapping, fields: CsvImportField[], columns: number) {
  const seen = new Map<string, number>()
  const duplicates = new Map<number, string>()
  for (let i = 0; i < columns; i++) {
    const key = mapping[i]
    if (key == null || !fields.some((f) => f.key === key)) continue
    if (seen.has(key)) duplicates.set(i, key)
    else seen.set(key, i)
  }
  const missing = fields.filter((f) => f.required && !seen.has(f.key))
  return { duplicates, missing, mapped: seen.size }
}

/** A value controlled through `value`/`onChange`, or kept here. */
function useControllable<T>(value: T | undefined, initial: T | (() => T), onChange?: (value: T) => void) {
  const [own, setOwn] = React.useState(initial)
  const controlled = value !== undefined
  const current = controlled ? value : own
  const change = React.useRef(onChange)
  change.current = onChange
  const set = React.useCallback(
    (next: T) => {
      if (!controlled) setOwn(next)
      change.current?.(next)
    },
    [controlled],
  )
  return [current, set] as const
}

/** The focus ring for things that take focus from a script (a status line, a heading). */
const focusTargetClass = 'rounded-xs outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]'

/** A row as the tables take it. */
type TableRow = { id: string; n: number; cells: CsvCheckedRow }
type MapRow = { id: string; index: number; name: string; samples: string[] }

/** A source value as the preview shows it: plain, or in the error colour with a mark and its reason. */
function sourceCell(row: TableRow, field: CsvImportField, index: number, labels: Labels) {
  const text = (row.cells.source[index] ?? '').trim()
  const error = row.cells.errors?.[field.key]
  if (!error) return text
  const reason = reasonOf(error, field, labels)
  return (
    <Tooltip label={reason}>
      <span
        tabIndex={-1}
        data-csv-cell={`${row.n}:${field.key}`}
        className={cn(
          'inline-flex max-w-full min-w-0 items-center gap-1 rounded-xs text-text-destructive outline-none',
          // An inset ring, so the cell's clip never cuts it; the sticky # column never covers it.
          'focus-visible:[box-shadow:inset_0_0_0_2px_var(--action-focus-ring)] [scroll-margin-inline-start:56px]',
        )}
      >
        {text && <span className="truncate">{text}</span>}
        <WarningCircle aria-hidden className="size-3.5 shrink-0 [stroke-width:1.875]" />
        <span className="sr-only">, {reason}</span>
      </span>
    </Tooltip>
  )
}

/** A skipped row's reasons in words: "Email: Not an email address; Company: Required". */
function rowReasons(row: CsvCheckedRow, fields: CsvImportField[], labels: Labels) {
  return Object.entries(row.errors ?? {})
    .map(([key, e]) => {
      const field = fields.find((f) => f.key === key)
      return labels.csvErrorCell(field?.label ?? key, reasonOf(e, field, labels))
    })
    .join('; ')
}

/** Each mapped field and the column it reads, in the fields' order. */
function mappedFields(fields: CsvImportField[], mapping: CsvMapping) {
  return fields
    .map((field) => ({ field, index: Object.keys(mapping).map(Number).find((i) => mapping[i] === field.key) }))
    .filter((m): m is { field: CsvImportField; index: number } => m.index != null)
}

/** Saves the skipped rows as a CSV: every source column, then the reasons in an `error` column. */
function downloadSkippedRows(
  validation: CsvValidation,
  fields: CsvImportField[],
  labels: Labels,
  { headers, delimiter, fileName }: { headers?: string[]; delimiter?: CsvDelimiter; fileName?: string },
) {
  const skipped = validation.rows.filter((r) => r.errors)
  const width = headers?.length ?? Math.max(0, ...validation.rows.map((r) => r.source.length))
  const names = headers ?? Array.from({ length: width }, (_, i) => labels.csvColumnN(i + 1))
  // A cell starting = + - or @ would run as a formula in a spreadsheet: a ' keeps it text.
  const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v)
  const lines = [
    [...names, labels.csvErrorColumn],
    ...skipped.map((r) => [...Array.from({ length: width }, (_, i) => r.source[i] ?? ''), rowReasons(r, fields, labels)]),
  ].map((line) => line.map(safe))
  const text = toCsv(lines, { delimiter, bom: true })
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = labels.csvSkippedFile((fileName ?? 'import').replace(/\.csv$/i, ''))
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/* ---------- the mapping ---------- */

export interface CsvImportMappingProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  fields: CsvImportField[]
  /** The column names (csvHeaders). */
  headers: string[]
  /** The data rows, for each column's sample values (the first few that aren't empty). */
  rows: string[][]
  mapping: CsvMapping
  onMappingChange: (mapping: CsvMapping) => void
  /** What auto-match picked, for the Auto-matched badges. Defaults to matchColumns(headers, fields). */
  autoMapping?: CsvMapping
  /** Shows "First row is a header" with this value. */
  header?: boolean
  onHeaderChange?: (header: boolean) => void
  /** A line at the start, above the table: "leads.csv · 340 rows". */
  meta?: React.ReactNode
  disabled?: boolean
}

/** True while `ref`'s element is narrower than `px`; measured before paint and on every resize. */
function useNarrower(ref: React.RefObject<HTMLElement | null>, px: number) {
  const [narrow, setNarrow] = React.useState(false)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) setNarrow(width < px)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, px])
  return narrow
}

/**
 * The Map columns step on its own: a line for each required field still missing, and a Table
 * with one row per column (its name, sample values, a "Maps to" Select, Auto-matched). From
 * 520px wide the samples and the badge have their own columns; narrower, they fold under the
 * name. A field picked by a second column shows an error there. Other props, `ref` included,
 * go to its root.
 */
export function CsvImportMapping({
  fields,
  headers,
  rows,
  mapping,
  onMappingChange,
  autoMapping,
  header,
  onHeaderChange,
  meta,
  disabled,
  className,
  ref,
  ...props
}: CsvImportMappingProps) {
  const labels = useLabels()
  const auto = React.useMemo(() => autoMapping ?? matchColumns(headers, fields), [autoMapping, headers, fields])
  const { duplicates, missing } = mappingIssues(mapping, fields, headers.length)

  // Wide or narrow by the width it has; measured before paint, so it never shows the wrong one.
  const own = React.useRef<HTMLDivElement | null>(null)
  const narrow = useNarrower(own, 520)
  const setRef = (node: HTMLDivElement | null) => {
    own.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  const mapRows: MapRow[] = headers.map((name, index) => {
    const samples: string[] = []
    for (const r of rows) {
      const v = (r[index] ?? '').trim()
      if (v) samples.push(v)
      if (samples.length === 3) break
    }
    return { id: String(index), index, name, samples }
  })
  const options = [{ value: SKIP, label: labels.csvDontImport }, ...fields.map((f) => ({ value: f.key, label: f.label }))]

  const badge = (row: MapRow) =>
    mapping[row.index] != null && mapping[row.index] === auto[row.index] ? (
      <Badge tone="green" size="sm">
        {labels.csvAutoMatched}
      </Badge>
    ) : null

  const select = (row: MapRow) => {
    const dup = duplicates.get(row.index)
    const dupField = dup != null ? fields.find((f) => f.key === dup) : undefined
    return (
      <Select
        size="sm"
        aria-label={labels.csvMapsToColumn(row.name)}
        options={options}
        value={mapping[row.index] ?? SKIP}
        onValueChange={(v) => onMappingChange({ ...mapping, [row.index]: v === SKIP ? null : v })}
        error={dupField ? labels.csvAlreadyMapped(dupField.label) : undefined}
        disabled={disabled}
        // 1px of room on every side, so the cell's clip leaves the focus edge whole.
        wrapperClassName="min-w-0 p-px"
      />
    )
  }

  const columns: Column<MapRow>[] = narrow
    ? [
        {
          key: 'name',
          header: labels.csvColumn,
          cell: (row) => (
            <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 py-0.5">
              <span className="block max-w-full truncate">{row.name}</span>
              {row.samples.length > 0 && <span className="block max-w-full truncate text-sm text-text-muted">{row.samples.join(', ')}</span>}
              {badge(row)}
            </div>
          ),
        },
        { key: 'mapsTo', header: labels.csvMapsTo, cell: select },
      ]
    : [
        { key: 'name', header: labels.csvColumn, width: 1.1, cell: (row) => row.name },
        { key: 'sample', header: labels.csvSample, width: 1.1, cell: (row) => <span className="block truncate text-text-muted">{row.samples.join(', ')}</span> },
        { key: 'mapsTo', header: labels.csvMapsTo, width: 1.4, cell: select },
        { key: 'status', header: labels.csvStatus, width: 1.1, cell: (row) => badge(row) },
      ]

  return (
    <div ref={setRef} data-slot="csv-import-mapping" className={cn('flex flex-col gap-3', className)} {...props}>
      {(meta != null || onHeaderChange) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {meta != null && <p className="min-w-0 truncate text-sm text-text-muted">{meta}</p>}
          {onHeaderChange && <Checkbox label={labels.csvHeaderRow} checked={!!header} onCheckedChange={(v) => onHeaderChange(v === true)} disabled={disabled} />}
        </div>
      )}
      {missing.length > 0 && (
        <div className="flex flex-col gap-1">
          {missing.map((f) => (
            <p key={f.key} className="flex items-center gap-1.5 text-sm text-text-destructive">
              <WarningCircle aria-hidden className="size-3.5 shrink-0 [stroke-width:1.875]" />
              {labels.csvRequiredMissing(f.label)}
            </p>
          ))}
        </div>
      )}
      <Table<MapRow>
        label={labels.csvColumns}
        columns={columns}
        rows={mapRows}
        // Rows aren't clickable, so they don't lift on hover.
        renderRow={({ row, children }) => (
          <tr key={row.id} className="bg-bg-card">
            {children}
          </tr>
        )}
      />
    </div>
  )
}

/* ---------- the preview ---------- */

export interface CsvImportPreviewProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  fields: CsvImportField[]
  /** Which columns map to which fields: the table shows the mapped fields. */
  mapping: CsvMapping
  /** validateCsv's result. */
  validation: CsvValidation
  /** Rows past `maxRows`, in the summary. */
  overLimit?: number
  errorsOnly?: boolean
  defaultErrorsOnly?: boolean
  onErrorsOnlyChange?: (errorsOnly: boolean) => void
}

/**
 * The Review step on its own: "340 rows · 328 ready · 12 with errors", an Alert grouping the
 * errors by field (each group a link that turns on "Show only errors" and moves focus to its
 * first cell), the checkbox, and a Table of the mapped fields, 100 rows a page with Pagination
 * under it. An invalid cell is in the error colour with a warning mark and its reason (a
 * Tooltip, and read out). Other props, `ref` included, go to its root.
 */
export function CsvImportPreview({
  fields,
  mapping,
  validation,
  overLimit = 0,
  errorsOnly: errorsOnlyProp,
  defaultErrorsOnly = false,
  onErrorsOnlyChange,
  className,
  ...props
}: CsvImportPreviewProps) {
  const labels = useLabels()
  const { n, noun } = useCounts(labels)
  const [errorsOnly, setErrorsOnlyState] = useControllable(errorsOnlyProp, defaultErrorsOnly, onErrorsOnlyChange)
  const [page, setPage] = React.useState(1)
  const [pending, setPending] = React.useState<{ n: number; key: string } | null>(null)
  const tableRef = React.useRef<HTMLDivElement>(null)
  // Page numbers need about 360px; narrower, Pagination shows "Page 2 of 4" between its arrows.
  const compact = useNarrower(tableRef, 360)

  const { rows, valid, errorCounts } = validation
  const errors = rows.length - valid
  const shown = React.useMemo(() => (errorsOnly && errors > 0 ? rows.filter((r) => r.errors) : rows), [rows, errorsOnly, errors])
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  // While a jump is pending, the page is the one with its cell in the list actually shown: with
  // a controlled errorsOnly the app may keep every row.
  const pendingAt = pending ? shown.findIndex((r) => r.n === pending.n) : -1
  const current = pendingAt >= 0 ? Math.floor(pendingAt / PAGE_SIZE) + 1 : Math.min(page, pageCount)

  const setErrorsOnly = (next: boolean) => {
    setErrorsOnlyState(next)
    setPage(1)
  }

  const mapped = mappedFields(fields, mapping)

  const columns: Column<TableRow>[] = [
    { key: ROW_KEY, header: labels.csvRowNumber, width: 56, cell: (row) => <span className="text-text-muted tabular-nums">{n(row.n)}</span> },
    ...mapped.map(({ field, index }) => ({ key: field.key, header: field.label, width: 160, cell: (row: TableRow) => sourceCell(row, field, index, labels) })),
  ]
  const tableRows: TableRow[] = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((r) => ({ id: String(r.n), n: r.n, cells: r }))

  // A link to a field's errors: errors only, the page with its first one, then focus on it.
  const jump = (key: string) => {
    const first = rows.find((r) => r.errors?.[key])
    if (!first) return
    setErrorsOnlyState(true)
    setPending({ n: first.n, key })
  }
  // One commit after the jump: keep its page, focus the cell if it is there, and forget it either way.
  React.useLayoutEffect(() => {
    if (!pending) return
    setPending(null)
    if (pendingAt >= 0 && page !== current) setPage(current)
    const name = `${pending.n}:${pending.key}`
    const target = [...(tableRef.current?.querySelectorAll<HTMLElement>('[data-csv-cell]') ?? [])].find((el) => el.dataset.csvCell === name)
    if (!target) return
    target.focus({ preventScroll: true })
    target.scrollIntoView?.({ block: 'center', inline: 'center' })
  })

  // Paging by hand brings the table's top into view.
  const turnPage = (p: number) => {
    setPage(p)
    tableRef.current?.scrollIntoView?.({ block: 'start' })
  }

  const fieldLabel = (key: string) => fields.find((f) => f.key === key)?.label ?? key
  const summary = [
    labels.csvCount(n(rows.length), noun(rows.length)),
    labels.csvReady(n(valid)),
    errors > 0 && labels.csvWithErrors(n(errors)),
    overLimit > 0 && labels.csvOverLimit(n(overLimit)),
  ].filter(Boolean)

  return (
    <div data-slot="csv-import-preview" className={cn('flex flex-col gap-3', className)} {...props}>
      <p data-csv-focus="summary" tabIndex={-1} className={cn('text-base leading-5 font-medium text-text-default', focusTargetClass)}>
        {summary.join(' · ')}
      </p>
      {errors > 0 && (
        <>
          <Alert
            intent="warning"
            tabIndex={-1}
            data-csv-focus="errors"
            className={focusTargetClass}
            title={labels.csvErrorsTitle(n(errors), noun(errors))}
            description={
              <span className="flex flex-wrap gap-x-4 gap-y-1">
                {errorCounts.map(({ key, count }) => (
                  <Link key={key} asChild>
                    <button type="button" onClick={() => jump(key)}>
                      {labels.csvFieldErrors(fieldLabel(key), n(count))}
                    </button>
                  </Link>
                ))}
              </span>
            }
          />
          <Checkbox label={labels.csvShowErrors} checked={errorsOnly} onCheckedChange={(v) => setErrorsOnly(v === true)} />
        </>
      )}
      <Table<TableRow>
        ref={tableRef}
        label={labels.csvPreview}
        overflow="scroll"
        columns={columns}
        rows={tableRows}
        renderRow={({ row, children }) => (
          <tr key={row.id} className="bg-bg-card">
            {children}
          </tr>
        )}
      />
      {pageCount > 1 && <Pagination className="self-center" layout={compact ? 'compact' : 'full'} pageCount={pageCount} page={current} onPageChange={turnPage} />}
    </div>
  )
}

/* ---------- the progress ---------- */

export interface CsvImportProgressProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Rows done. */
  done: number
  /** Rows to import. */
  total: number
}

/** "Importing 120 of 328…" over a Progress bar. Other props, `ref` included, go to its root. */
export function CsvImportProgress({ done, total, className, ...props }: CsvImportProgressProps) {
  const labels = useLabels()
  const { n } = useCounts(labels)
  return (
    <div data-slot="csv-import-progress" className={cn('flex flex-col', className)} {...props}>
      <Progress size="md" value={Math.min(done, total)} max={Math.max(total, 1)} label={labels.csvImporting(n(Math.min(done, total)), n(total))} />
    </div>
  )
}

/* ---------- the result ---------- */

/** The result's segments: rows saved, rows that failed their checks, and valid rows a stopped run never sent. */
export type CsvImportResultFilter = 'imported' | 'skipped' | 'notImported'

export interface CsvImportResultProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  fields: CsvImportField[]
  /** Which columns map to which fields: the tables show the mapped fields. */
  mapping: CsvMapping
  /** validateCsv's result. */
  validation: CsvValidation
  /** Valid rows saved: the first `imported` of them, in file order (onProgress counts them in order). */
  imported: number
  /** `stopped` when the run failed or was cancelled before the last row: adds Not imported. */
  status?: 'done' | 'stopped'
  /** Why a stopped run stopped (the rejected promise's message). Without it, it was cancelled. */
  reason?: string
  /** Adds Retry to a stopped result: "Retry from row 121", or Retry in the empty table when nothing was saved. */
  onRetry?: () => void
  /** Rows past `maxRows`: a muted line under the heading. */
  overLimit?: number
  /** "lead" / "leads". Defaults to the `csvRowNoun` label. */
  noun?: CsvNoun
  filter?: CsvImportResultFilter
  /** Defaults to `imported`. */
  defaultFilter?: CsvImportResultFilter
  onFilterChange?: (filter: CsvImportResultFilter) => void
  /** The file's column names, for the skipped rows file (csvHeaders). Defaults to "Column 1"… */
  headers?: string[]
  /** The file's name: the skipped rows file is `<name>-skipped.csv`. */
  fileName?: string
  /** The skipped rows file's delimiter: the source file's (CsvParseResult.delimiter). */
  delimiter?: CsvDelimiter
  /** Disables Retry. */
  disabled?: boolean
}

/**
 * The outcome of an import as a table: a heading that says it ("328 leads imported · 12
 * skipped", the focus target, `data-csv-focus="result"`), a SegmentedControl of Imported and
 * Skipped (and Not imported when a run stopped), "Download skipped rows" (a CSV with an
 * `error` column; icon-only under 420px), and the segment's rows, 100 a page. Imported and
 * Not imported show the normalised values sent; Skipped shows a Reason column and the source
 * values, invalid cells marked as in the preview. An empty segment says why inside the table
 * body. A stopped run adds a warning Alert with "Retry from row 121"; when nothing was saved,
 * the empty Imported table carries the reason and Retry instead. Other props, `ref` included,
 * go to its root.
 */
export function CsvImportResult({
  fields,
  mapping,
  validation,
  imported: importedProp,
  status = 'done',
  reason,
  onRetry,
  overLimit = 0,
  noun: nounProp,
  filter: filterProp,
  defaultFilter = 'imported',
  onFilterChange,
  headers,
  fileName,
  delimiter,
  disabled = false,
  className,
  ref,
  ...props
}: CsvImportResultProps) {
  const labels = useLabels()
  const { n, noun } = useCounts(labels)
  const thing = nounProp ?? labels.csvRowNoun
  const [filterState, setFilterState] = useControllable(filterProp, defaultFilter, onFilterChange)
  const [page, setPage] = React.useState(1)
  const stopped = status === 'stopped'
  // A Not imported filter with nothing stopped has no segment: show Imported.
  const filter = filterState === 'notImported' && !stopped ? 'imported' : filterState

  const own = React.useRef<HTMLDivElement | null>(null)
  const tableRef = React.useRef<HTMLDivElement>(null)
  const setRef = (node: HTMLDivElement | null) => {
    own.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }
  const narrow = useNarrower(own, 420)
  // Page numbers need about 360px; narrower, Pagination shows "Page 2 of 4" between its arrows.
  const compact = useNarrower(own, 360)

  const { skipped, imported, notImported } = React.useMemo(() => {
    const valid = validation.rows.filter((r) => !r.errors)
    const count = Math.max(0, Math.min(valid.length, importedProp))
    return {
      skipped: validation.rows.filter((r) => r.errors),
      imported: valid.slice(0, count),
      notImported: stopped ? valid.slice(count) : [],
    }
  }, [validation, importedProp, stopped])

  const shown = filter === 'skipped' ? skipped : filter === 'notImported' ? notImported : imported
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const tableRows: TableRow[] = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((r) => ({ id: String(r.n), n: r.n, cells: r }))

  // After "Show skipped rows", focus goes to the segment it selected.
  const focusSegment = React.useRef(false)
  const setFilter = (next: CsvImportResultFilter) => {
    setFilterState(next)
    setPage(1)
  }
  React.useLayoutEffect(() => {
    if (!focusSegment.current) return
    focusSegment.current = false
    own.current?.querySelector<HTMLElement>('[data-slot="segmented-control-segment"][data-state="on"]')?.focus()
  })
  const turnPage = (p: number) => {
    setPage(p)
    tableRef.current?.scrollIntoView?.({ block: 'start' })
  }

  const mapped = mappedFields(fields, mapping)
  const rowNumber: Column<TableRow> = {
    key: ROW_KEY,
    header: labels.csvRowNumber,
    width: 56,
    cell: (row) => <span className="text-text-muted tabular-nums">{n(row.n)}</span>,
  }
  const columns: Column<TableRow>[] =
    filter === 'skipped'
      ? [
          rowNumber,
          {
            key: 'reason',
            header: labels.csvReason,
            width: 220,
            cell: (row) => {
              const text = rowReasons(row.cells, fields, labels)
              return (
                <Tooltip label={text}>
                  <span className="truncate">{text}</span>
                </Tooltip>
              )
            },
          },
          ...mapped.map(({ field, index }) => ({ key: field.key, header: field.label, width: 160, cell: (row: TableRow) => sourceCell(row, field, index, labels) })),
        ]
      : [rowNumber, ...mapped.map(({ field }) => ({ key: field.key, header: field.label, width: 160, cell: (row: TableRow) => row.cells.values[field.key] ?? '' }))]

  const nothing = imported.length === 0
  const failedAtStart = stopped && nothing
  const skippedText = skipped.length > 0 ? n(skipped.length) : null
  const heading = failedAtStart
    ? labels.csvNothingImported(noun(0, thing), skippedText)
    : stopped
      ? labels.csvImportStopped(n(imported.length), noun(imported.length, thing), n(notImported.length), skippedText)
      : labels.csvImported(n(imported.length), noun(imported.length, thing), skippedText)
  const why = reason ?? labels.csvImportCancelled
  const retryLabel = imported.length > 0 ? labels.csvRetryFrom(n(imported.length + 1)) : labels.csvRetry

  let empty: React.ReactNode = null
  if (filter === 'imported' && nothing) {
    empty = failedAtStart ? (
      <EmptyState
        icon={<WarningCircle />}
        title={labels.csvNothingImported(noun(0, thing), null)}
        description={`${/[.!?…]$/.test(why) ? why : `${why}.`} ${labels.csvKept}`}
        actions={
          onRetry && (
            <Button variant="secondary" onClick={onRetry} disabled={disabled}>
              {labels.csvRetry}
            </Button>
          )
        }
      />
    ) : (
      <EmptyState
        title={labels.csvNothingImported(noun(0, thing), null)}
        actions={
          skipped.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                focusSegment.current = true
                setFilter('skipped')
              }}
            >
              {labels.csvShowSkipped}
            </Button>
          )
        }
      />
    )
  } else if (filter === 'skipped' && skipped.length === 0) {
    empty = <EmptyState icon={<Check />} title={labels.csvNoneSkipped} description={labels.csvNoneSkippedHint} />
  }

  const segment = (label: string, count: number) => (
    <>
      {label}{' '}
      <span className="text-text-muted tabular-nums">{n(count)}</span>
    </>
  )
  const items = [
    { value: 'imported', label: segment(labels.csvSegmentImported, imported.length) },
    { value: 'skipped', label: segment(labels.csvSegmentSkipped, skipped.length) },
    ...(stopped ? [{ value: 'notImported', label: segment(labels.csvSegmentNotImported, notImported.length) }] : []),
  ]

  return (
    <div ref={setRef} data-slot="csv-import-result" className={cn('flex flex-col gap-3', className)} {...props}>
      <div className="flex flex-col gap-1">
        <p data-csv-focus="result" tabIndex={-1} className={cn('text-base leading-5 font-medium text-text-default', focusTargetClass)}>
          {heading}
        </p>
        {overLimit > 0 && <p className="text-sm text-text-muted">{labels.csvOverLimitNote(n(overLimit), noun(overLimit))}</p>}
      </div>
      {stopped && !failedAtStart && (
        <Alert
          intent="warning"
          title={why}
          description={labels.csvKept}
          action={
            onRetry && (
              <Button variant="secondary" size="xs" onClick={onRetry} disabled={disabled}>
                {retryLabel}
              </Button>
            )
          }
        />
      )}
      <div className="flex items-center justify-between gap-3">
        <SegmentedControl
          size="xs"
          aria-label={labels.csvResultFilter}
          items={items}
          value={filter}
          onValueChange={(v) => setFilter(v as CsvImportResultFilter)}
        />
        {skipped.length > 0 && (
          <Button
            variant="secondary"
            iconOnly={narrow}
            aria-label={narrow ? labels.csvDownloadSkipped : undefined}
            onClick={() => downloadSkippedRows(validation, fields, labels, { headers, delimiter, fileName })}
          >
            <Download aria-hidden />
            {!narrow && labels.csvDownloadSkipped}
          </Button>
        )}
      </div>
      <Table<TableRow>
        ref={tableRef}
        label={filter === 'skipped' ? labels.csvSkippedTable : filter === 'notImported' ? labels.csvNotImportedTable : labels.csvImportedTable}
        overflow="scroll"
        columns={columns}
        rows={tableRows}
        empty={empty}
        renderRow={({ row, children }) => (
          <tr key={row.id} className="bg-bg-card">
            {children}
          </tr>
        )}
      />
      {pageCount > 1 && <Pagination className="self-center" layout={compact ? 'compact' : 'full'} pageCount={pageCount} page={current} onPageChange={turnPage} />}
    </div>
  )
}

/* ---------- the flow ---------- */

type ParseState =
  | { status: 'idle' }
  | { status: 'reading'; file: File; read: number }
  | { status: 'ready'; file: File; result: CsvParseResult }
  | { status: 'error'; file: File; error: unknown }

type ImportState =
  | { status: 'idle' }
  | { status: 'importing'; done: number; total: number }
  /** The table of the outcome: `imported` valid rows saved; `stopped` with a `reason` failed, without one was cancelled. */
  | { status: 'result'; result: 'done' | 'stopped'; imported: number; reason?: string }

type Checked = { input: object; result: CsvValidation | null; failed?: { error: unknown } }

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export function CsvImport({
  fields,
  onImport,
  noun: nounProp,
  maxRows,
  maxSize,
  templateHref,
  step: stepProp,
  defaultStep = 'upload',
  onStepChange,
  file: fileProp,
  onFileChange,
  mapping: mappingProp,
  defaultMapping,
  onMappingChange,
  onDone,
  cancelable = false,
  disabled = false,
  className,
  ref,
  ...props
}: CsvImportProps) {
  const labels = useLabels()
  const { n, noun } = useCounts(labels)
  const thing = nounProp ?? labels.csvRowNoun

  const [step, setStep] = useControllable(stepProp, defaultStep, onStepChange)
  const [file, setFile] = useControllable<File | null>(fileProp, null, onFileChange)
  const [mapping, setMapping] = useControllable<CsvMapping>(mappingProp, () => defaultMapping ?? {}, onMappingChange)
  const stepRef = React.useRef(step)
  stepRef.current = step
  // The step on screen: Map or Review with no file and nothing read has only Upload to show.
  const viewRef = React.useRef<CsvImportStep>(step)

  // A file given from the start is being read from the first paint, so Map never flashes Upload.
  const [parse, setParse] = React.useState<ParseState>(() => (file ? { status: 'reading', file, read: 0 } : { status: 'idle' }))
  const [header, setHeaderState] = React.useState(true)
  const [rejection, setRejection] = React.useState<{ name: string; reason: string } | null>(null)
  const [retry, setRetry] = React.useState(0)
  const [checked, setChecked] = React.useState<Checked | null>(null)
  const [recheck, setRecheck] = React.useState(0)
  const [imp, setImp] = React.useState<ImportState>({ status: 'idle' })

  // One polite region for reading, importing and how they ended; a new key makes it speak again.
  const [said, setSaid] = React.useState({ text: '', n: 0 })
  const announce = React.useCallback((text: string) => setSaid((s) => ({ text, n: s.n + 1 })), [])

  // What gets focus after the next commit, once it is on the page.
  const focusNext = React.useRef<null | 'step' | 'reading' | 'review' | 'result' | 'error' | 'summary'>(null)

  const latest = React.useRef({ fields, defaultMapping, maxRows, labels, setMapping, setStep, announce, n, noun })
  latest.current = { fields, defaultMapping, maxRows, labels, setMapping, setStep, announce, n, noun }

  /* reading the file */
  React.useEffect(() => {
    if (!file) {
      setParse({ status: 'idle' })
      return
    }
    const ac = new AbortController()
    const { labels, maxRows, announce } = latest.current
    setParse({ status: 'reading', file, read: 0 })
    setChecked(null)
    setImp({ status: 'idle' })
    announce(labels.csvReadingFile(file.name))
    if (viewRef.current === 'upload') focusNext.current = 'reading'
    parseCsv(file, {
      maxRows,
      signal: ac.signal,
      onProgress: (read) => setParse((p) => (p.status === 'reading' && p.file === file ? { ...p, read } : p)),
    }).then(
      (result) => {
        if (ac.signal.aborted) return
        const { fields, defaultMapping, labels, setMapping, setStep, announce, n, noun } = latest.current
        const headers = csvHeaders(result, result.header, labels.csvColumnN)
        setParse({ status: 'ready', file, result })
        setHeaderState(result.header)
        setMapping(withDefaults(matchColumns(headers, fields), defaultMapping, headers.length))
        const rows = result.count - (result.header ? 1 : 0)
        announce(labels.csvRead(n(rows), noun(rows)))
        if (viewRef.current === 'upload') {
          focusNext.current = 'step'
          if (stepRef.current !== 'map') setStep('map')
        }
      },
      (error) => {
        if (ac.signal.aborted || isAbortError(error)) return
        setParse({ status: 'error', file, error })
        latest.current.announce(parseReason(error, latest.current.labels, latest.current.n))
        focusNext.current = 'error'
      },
    )
    return () => ac.abort()
  }, [file, retry])

  const view: CsvImportStep = step !== 'upload' && parse.status === 'idle' ? 'upload' : step
  viewRef.current = view
  const result = parse.status === 'ready' ? parse.result : null
  const headers = React.useMemo(() => (result ? csvHeaders(result, header, labels.csvColumnN) : []), [result, header, labels.csvColumnN])
  // A controlled mapping may name columns this file doesn't have: they play no part.
  const fileMapping = React.useMemo(() => {
    const out: CsvMapping = {}
    for (const [i, key] of Object.entries(mapping)) if (Number(i) < headers.length) out[Number(i)] = key
    return out
  }, [mapping, headers.length])
  const dataRows = React.useMemo(() => (result ? result.records.slice(header ? 1 : 0) : []), [result, header])
  const auto = React.useMemo(() => matchColumns(headers, fields), [headers, fields])
  const issues = mappingIssues(mapping, fields, headers.length)
  const dataCount = result ? result.count - (header ? 1 : 0) : 0
  const overLimit = maxRows != null ? Math.max(0, dataCount - maxRows) : 0

  const setHeader = (next: boolean) => {
    setHeaderState(next)
    if (!result) return
    const names = csvHeaders(result, next, labels.csvColumnN)
    setMapping(withDefaults(matchColumns(names, fields), defaultMapping, names.length))
  }

  /* checking the rows, on Review */
  const input = React.useMemo(() => ({ result, header, mapping: fileMapping }), [result, header, fileMapping])
  const checkedRef = React.useRef(checked)
  checkedRef.current = checked
  React.useLayoutEffect(() => {
    if (step !== 'review' || !input.result) return
    if (checkedRef.current?.input === input && checkedRef.current.result) return
    const failed = (error: unknown) => {
      setChecked({ input, result: null, failed: { error } })
      latest.current.announce(latest.current.labels.csvCheckFailed)
      focusNext.current = 'error'
    }
    const ac = new AbortController()
    try {
      const job = validationJob(input.result.records, input.mapping, fields, { header: input.header, locale: labels.dateLocale, maxRows })
      // Most files are checked in the first slice, before the step paints.
      if (job.advance(now() + 8)) {
        setChecked({ input, result: job.result() })
        return
      }
      setChecked({ input, result: null })
      runCsvJob(job, ac.signal).then(
        (result) => {
          if (!ac.signal.aborted) setChecked({ input, result })
        },
        (error) => {
          if (!ac.signal.aborted && !isAbortError(error)) failed(error)
        },
      )
    } catch (error) {
      failed(error)
    }
    return () => ac.abort()
    // fields, labels and maxRows are read as they are when the step opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, input, recheck])
  const validation = checked?.input === input ? checked.result : null
  const checkFailed = checked?.input === input ? checked.failed : undefined

  /* importing */
  const run = React.useRef(0)
  const abort = React.useRef<AbortController | null>(null)
  React.useEffect(
    () => () => {
      run.current++
      abort.current?.abort()
    },
    [],
  )
  // The valid rows saved so far for this check of the file: Import and Retry start after them,
  // so a row is never sent twice, whatever ended the run before.
  const saved = React.useRef<{ validation: CsvValidation | null; done: number }>({ validation: null, done: 0 })
  /** Sends the valid rows after the ones already saved. */
  const startImport = () => {
    if (!validation) return
    const from = saved.current.validation === validation ? saved.current.done : 0
    const rows = validation.rows.filter((r) => !r.errors).map((r) => r.values)
    const skipped = validation.rows.length - rows.length
    const id = ++run.current
    const ac = new AbortController()
    abort.current = ac
    const total = rows.length
    const start = Math.max(0, Math.min(total, from))
    let done = start
    saved.current = { validation, done }
    let shown = 0
    let milestone = Math.floor((start / Math.max(total, 1)) * 4)
    setImp({ status: 'importing', done: start, total })
    announce(start > 0 ? labels.csvImporting(n(start), n(total)) : labels.csvImportStarted(n(total), noun(total, thing)))
    const live = () => run.current === id && !ac.signal.aborted
    // The app counts the rows it got; the panel adds the ones a failed run already did.
    const onProgress = (next: number) => {
      if (!live()) return
      done = Math.max(start, Math.min(total, start + next))
      saved.current = { validation, done }
      // At most ten times a second: the step slide copies the step on every render.
      const t = now()
      if (t - shown >= 100 || done === total) {
        shown = t
        setImp((s) => (s.status === 'importing' ? { ...s, done } : s))
      }
      const quarter = Math.floor((done / Math.max(total, 1)) * 4)
      if (quarter > milestone && quarter < 4) {
        milestone = quarter
        announce(labels.csvImporting(n(done), n(total)))
      }
    }
    const finish = () => {
      if (!live()) return
      saved.current = { validation, done: total }
      setImp({ status: 'result', result: 'done', imported: total })
      announce(labels.csvImported(n(total), noun(total, thing), skipped ? n(skipped) : null))
      focusNext.current = 'result'
    }
    const fail = (error: unknown) => {
      if (!live()) return
      const reason = error instanceof Error && error.message ? error.message : typeof error === 'string' && error ? error : labels.csvImportFailedReason
      setImp({ status: 'result', result: 'stopped', imported: done, reason })
      announce(`${labels.csvImportFailed(done > 0 ? n(done) : null)}. ${reason}`)
      focusNext.current = 'result'
    }
    try {
      const out = onImport(start > 0 ? rows.slice(start) : rows, { signal: ac.signal, onProgress })
      if (out && typeof (out as Promise<void>).then === 'function') (out as Promise<void>).then(finish, fail)
      else finish()
    } catch (error) {
      fail(error)
    }
  }
  // Cancel after some rows were saved shows what was saved; before any, it is as if Import was never pressed.
  const cancelImport = () => {
    run.current++
    abort.current?.abort()
    const done = saved.current.validation === validation ? saved.current.done : 0
    if (done > 0 && validation) {
      setImp({ status: 'result', result: 'stopped', imported: done })
      const skipped = validation.rows.length - validation.valid
      announce(labels.csvImportStopped(n(done), noun(done, thing), n(validation.valid - done), skipped ? n(skipped) : null))
      focusNext.current = 'result'
    } else {
      setImp({ status: 'idle' })
      focusNext.current = 'summary'
    }
  }

  const importAnother = () => {
    run.current++
    setImp({ status: 'idle' })
    setRejection(null)
    setChecked(null)
    setFile(null)
    focusNext.current = 'step'
    setStep('upload')
  }

  const go = (next: CsvImportStep) => {
    if (next === 'upload' || next === 'map') setImp({ status: 'idle' })
    focusNext.current = next === 'review' ? 'review' : 'step'
    setStep(next)
  }

  /* the step slide */
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const partRef = React.useRef<HTMLDivElement | null>(null)
  const setRoot = (node: HTMLDivElement | null) => {
    rootRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }
  useStepSlide(view, STEPS.indexOf(view), rootRef, () => [partRef.current])
  // A step opens at its top, not where the last one was scrolled to.
  React.useLayoutEffect(() => {
    if (partRef.current) partRef.current.scrollTop = 0
  }, [view])

  // Focus moves into what changed, when focus was in the panel (or lost with what was removed).
  React.useLayoutEffect(() => {
    const want = focusNext.current
    const part = partRef.current
    const root = rootRef.current
    if (!want || !part || !root) return
    const active = document.activeElement
    if (active && active !== document.body && !root.contains(active)) {
      focusNext.current = null
      return
    }
    let target: HTMLElement | null = null
    if (want === 'reading') target = part.querySelector('[data-csv-focus="reading"]')
    else if (want === 'error') target = part.querySelector('[data-csv-focus="error"]')
    else if (want === 'result') target = part.querySelector('[data-csv-focus="result"]')
    else if (want === 'summary') target = part.querySelector('[data-csv-focus="summary"]')
    else if (want === 'review') {
      if (!validation) return
      target = part.querySelector('[data-csv-focus="errors"]') ?? part.querySelector('[data-csv-focus="summary"]')
    } else if (view === 'map') target = part.querySelector('[data-slot="select-trigger"]')
    else target = part.querySelector('button:not([disabled]), a[href], [tabindex="0"]')
    if (!target) return
    focusNext.current = null
    target.focus({ preventScroll: true })
  })

  /* the footer */
  const reasonId = React.useId()
  const importing = imp.status === 'importing'
  const finished = imp.status === 'result'
  const readyCount = validation?.valid ?? 0
  let reason: string | null = null
  // While reading, the spinner in the body says why, and once a file is read Next is open;
  // otherwise (nothing chosen yet, or a file turned away) the footer says what Next waits for.
  if (view === 'upload') reason = parse.status === 'reading' || result ? null : labels.csvChooseFile
  else if (view === 'map' && result) {
    const dup = issues.duplicates.values().next().value
    reason =
      dup != null
        ? labels.csvMappedTwice(fields.find((f) => f.key === dup)?.label ?? dup)
        : issues.missing.length
          ? labels.csvMapRequired(issues.missing[0].label)
          : issues.mapped === 0
            ? labels.csvMapSomething
            : null
  } else if (view === 'review' && validation && readyCount === 0 && !finished) reason = labels.csvNothingToImport
  const nextBlocked = view === 'upload' ? !result : view === 'map' ? !result || reason != null : !validation || readyCount === 0

  const primary =
    view === 'review' ? (
      finished ? null : (
        <Blockable
          reason={nextBlocked ? reason : null}
          reasonId={reasonId}
          disabled={disabled}
          loading={importing}
          blocked={nextBlocked}
          onClick={startImport}
        >
          {labels.csvImportRows(n(readyCount), noun(readyCount, thing))}
        </Blockable>
      )
    ) : (
      <Blockable reason={nextBlocked ? reason : null} reasonId={reasonId} disabled={disabled} blocked={nextBlocked} onClick={() => go(view === 'upload' ? 'map' : 'review')}>
        {labels.csvNext}
      </Blockable>
    )

  /* the step's content */
  const fileMeta = (f: File) => `${f.name} · ${formatBytes(f.size)}`
  const readingView = (f: File, read: number) => (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p data-csv-focus="reading" tabIndex={-1} className={cn('flex items-center gap-2 text-base leading-5 font-medium text-text-default', focusTargetClass)}>
        <Spinner label={null} />
        {read > 0 ? labels.csvReading(n(read), noun(read)) : labels.csvReadingFile(f.name)}
      </p>
      <p className="text-sm text-text-muted">{fileMeta(f)}</p>
    </div>
  )
  const parseErrorView = (f: File, error: unknown) => (
    <Alert
      intent="error"
      tabIndex={-1}
      data-csv-focus="error"
      className={focusTargetClass}
      title={labels.csvParseFailed(f.name)}
      description={parseReason(error, labels, n)}
      action={
        <Button variant="secondary" size="xs" onClick={() => setRetry((r) => r + 1)}>
          {labels.csvRetry}
        </Button>
      }
    />
  )
  // Map and Review need the file read: until then they show where reading is.
  const notReady =
    parse.status === 'reading' ? readingView(parse.file, parse.read) : parse.status === 'error' ? parseErrorView(parse.file, parse.error) : null

  let content: React.ReactNode
  if (view === 'upload') {
    content =
      parse.status === 'reading' ? (
        readingView(parse.file, parse.read)
      ) : (
        <div className="flex flex-col gap-3">
          {parse.status === 'error' && parseErrorView(parse.file, parse.error)}
          {rejection && <Alert intent="error" title={labels.csvRejected(rejection.name)} description={rejection.reason} />}
          <FileUpload
            accept=".csv,text/csv,text/plain"
            multiple={false}
            maxSize={maxSize}
            disabled={disabled}
            title={labels.csvDropTitle}
            description={labels.csvUploadHint(maxRows != null ? n(maxRows) : null, maxSize != null ? formatBytes(maxSize) : null)}
            files={parse.status === 'ready' ? [{ id: 'csv', name: parse.file.name, size: parse.file.size, status: 'done' }] : []}
            onFilesAdded={(files) => {
              setRejection(null)
              if (files[0]) setFile(files[0])
            }}
            onFilesRejected={(rejected) => {
              const r = rejected[0]
              if (r) setRejection({ name: r.file.name, reason: rejectionReason(r, labels) })
            }}
            onRemove={() => setFile(null)}
          />
          {templateHref && (
            <Link href={templateHref} download variant="muted" className="inline-flex items-center gap-1 self-start text-sm">
              <Download aria-hidden className="size-3.5 [stroke-width:1.875]" />
              {labels.csvTemplate}
            </Link>
          )}
        </div>
      )
  } else if (!result) {
    content = notReady
  } else if (view === 'map') {
    content = (
      <CsvImportMapping
        fields={fields}
        headers={headers}
        rows={dataRows}
        mapping={mapping}
        onMappingChange={setMapping}
        autoMapping={auto}
        header={header}
        onHeaderChange={setHeader}
        meta={`${parse.status === 'ready' ? parse.file.name : ''} · ${labels.csvCount(n(dataCount), noun(dataCount))}`}
        disabled={disabled}
      />
    )
  } else if (checkFailed) {
    const error = checkFailed.error
    content = (
      <Alert
        intent="error"
        tabIndex={-1}
        data-csv-focus="error"
        className={focusTargetClass}
        title={labels.csvCheckFailed}
        description={error instanceof Error && error.message ? error.message : labels.csvImportFailedReason}
        action={
          <Button
            variant="secondary"
            size="xs"
            onClick={() => {
              focusNext.current = 'review'
              setRecheck((r) => r + 1)
            }}
          >
            {labels.csvRetry}
          </Button>
        }
      />
    )
  } else if (!validation) {
    content = (
      <div className="flex h-full items-center justify-center">
        <p className="flex items-center gap-2 text-base leading-5 font-medium text-text-default">
          <Spinner label={null} />
          {labels.csvChecking}
        </p>
      </div>
    )
  } else if (imp.status === 'importing') {
    const errors = validation.rows.length - validation.valid
    content = (
      <div className="flex h-full flex-col gap-3">
        <p data-csv-focus="summary" tabIndex={-1} className={cn('text-base leading-5 font-medium text-text-default', focusTargetClass)}>
          {[
            labels.csvCount(n(validation.rows.length), noun(validation.rows.length)),
            labels.csvReady(n(validation.valid)),
            errors > 0 && labels.csvWithErrors(n(errors)),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="flex flex-1 flex-col justify-center pb-8">
          <CsvImportProgress done={imp.done} total={imp.total} />
        </div>
      </div>
    )
  } else if (imp.status === 'result') {
    content = (
      <CsvImportResult
        fields={fields}
        mapping={fileMapping}
        validation={validation}
        imported={imp.imported}
        status={imp.result}
        reason={imp.reason}
        onRetry={startImport}
        overLimit={overLimit}
        noun={thing}
        headers={headers}
        fileName={parse.status === 'ready' ? parse.file.name : undefined}
        delimiter={result.delimiter}
        disabled={disabled}
      />
    )
  } else {
    content = <CsvImportPreview fields={fields} mapping={mapping} validation={validation} overLimit={overLimit} />
  }

  const stepIndex = STEPS.indexOf(view)
  // A finished import completes every step; a stopped one leaves Review current.
  const complete = imp.status === 'result' && imp.result === 'done'
  return (
    <div ref={setRoot} data-slot="csv-import" data-step={view} className={cn('flex h-[520px] min-h-0 shrink flex-col', className)} {...props}>
      <div className="shrink-0 border-b border-border-subtle p-4">
        <Stepper
          aria-label={labels.csvSteps}
          value={view}
          steps={[
            { value: 'upload', label: labels.csvStepUpload },
            { value: 'map', label: labels.csvStepMap },
            { value: 'review', label: labels.csvStepReview },
          ].map((s, i) => ({ ...s, state: complete || i < stepIndex ? ('complete' as const) : undefined }))}
        />
      </div>
      <div data-slot="csv-import-body" className="relative min-h-0 flex-1 overflow-clip">
        <div ref={partRef} data-slot="csv-import-step" className="absolute inset-0 overflow-y-auto p-4">
          {content}
        </div>
      </div>
      <div data-slot="csv-import-footer" className="flex h-[68px] shrink-0 items-center gap-3 border-t border-border-subtle px-4">
        {/* While a cancelable import runs, Cancel takes Back's place (Back can't run then), so the
            footer never holds three buttons and fits a phone-wide dialog. */}
        {importing && cancelable ? (
          <Button variant="secondary" onClick={cancelImport}>
            {labels.csvCancel}
          </Button>
        ) : finished ? (
          // The result's way out stands where Back was: Back to Review would offer the import again.
          <Button variant="secondary" onClick={importAnother}>
            {labels.csvImportAnother}
          </Button>
        ) : (
          <Button variant="secondary" disabled={disabled || view === 'upload' || importing} onClick={() => go(view === 'review' ? 'map' : 'upload')}>
            {labels.csvBack}
          </Button>
        )}
        <p id={reasonId} className="line-clamp-2 min-w-0 flex-1 text-sm text-text-muted">
          {reason}
        </p>
        {finished ? onDone && <Button onClick={onDone}>{labels.csvDone}</Button> : primary}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        <span key={said.n}>{said.text}</span>
      </div>
    </div>
  )
}

/** A primary action that can't run yet: aria-disabled, its reason in a Tooltip and the footer line it points to. */
function Blockable({
  reason,
  reasonId,
  blocked,
  disabled,
  loading,
  onClick,
  children,
}: {
  reason: string | null
  reasonId: string
  blocked: boolean
  disabled: boolean
  loading?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  // Always inside the Tooltip, so the button never remounts (and keeps focus) as it unblocks.
  return (
    <Tooltip label={reason ?? ''} open={reason ? undefined : false}>
      <Button
        disabled={disabled}
        loading={loading}
        aria-disabled={blocked && !loading ? true : undefined}
        aria-describedby={reason ? reasonId : undefined}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  )
}

/** defaultMapping over auto-match, for the columns the file has. */
function withDefaults(auto: CsvMapping, defaults: CsvMapping | undefined, columns: number): CsvMapping {
  const out: CsvMapping = { ...auto }
  if (defaults) for (const [i, key] of Object.entries(defaults)) if (Number(i) < columns) out[Number(i)] = key
  return out
}

function parseReason(error: unknown, labels: Labels, n: (count: number) => string) {
  if (error instanceof CsvParseError) {
    if (error.code === 'excel') return labels.csvExcel
    if (error.code === 'binary') return labels.csvBinary
    if (error.code === 'empty') return labels.csvEmpty
    return labels.csvUnterminated(n(error.row ?? 1))
  }
  return labels.csvReadFailed
}

function rejectionReason(r: FileUploadRejection, labels: Labels) {
  if (r.reason === 'size') return r.message
  return /\.xlsx?$/i.test(r.file.name) ? labels.csvExcel : labels.csvNotCsv
}
