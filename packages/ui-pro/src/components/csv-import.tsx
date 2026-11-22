'use client'

import * as React from 'react'
import { ArrowRight, Calendar, Check, Database, Download, Filter, Hashtag, List, Mail, Text, WarningCircle } from 'iconoir-react'
import { Alert } from '@uisatin/ui/alert'
import { Attachment, FileIcon } from '@uisatin/ui/attachment'
import { Button } from '@uisatin/ui/button'
import { Checkbox } from '@uisatin/ui/checkbox'
import { DialogDescription, DialogTitle } from '@uisatin/ui/dialog'
import { EmptyState } from '@uisatin/ui/empty-state'
import { FileUpload, FileUploadItem, formatBytes, type FileUploadFile, type FileUploadRejection } from '@uisatin/ui/file-upload'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Link } from '@uisatin/ui/link'
import { Pagination } from '@uisatin/ui/pagination'
import { Progress } from '@uisatin/ui/progress'
import { SegmentedControl } from '@uisatin/ui/segmented-control'
import { Select } from '@uisatin/ui/select'
import { Spinner } from '@uisatin/ui/spinner'
import { useStepSlide } from '@uisatin/ui/step-slide'
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
 * CsvImport: a CSV file into your records in three steps, Upload file › Map columns › Review, in
 * one panel whose frame never moves. On top, the steps in a row: the current one on the primary
 * action's fill, done ones with a check, and each one a button back, or forward as far as Next
 * would go. In the middle, the step, which slides (useStepSlide) and scrolls as one. At the
 * bottom, 68px: Back, the reason the primary is blocked (visible text, also its Tooltip and
 * `aria-describedby`), and the primary.
 *
 * - Upload file: the drop zone fills the step. Its picture is the file going into the app: the
 *   file's tile, a dotted arrow that pulses toward the app (`appIcon`), the app's tile. Excel
 *   files (even renamed .csv), binary files and a wrong type or size show their reason in an
 *   Alert. An added file shows under the zone as an attachment whose bar fills while it is read;
 *   Next opens once it is. Nothing moves on by itself.
 * - Map columns: one flat card, "Columns in your file → Lead fields": each column's name and
 *   first values, and a Select of the fields (each with its type's icon) plus "Don't import".
 *   Columns auto-match by key, label and `aliases`, ignoring case, diacritics, spaces, `-` and
 *   `_`. Next stays blocked while a required field has no column or a field has two.
 * - Review: two tiles, "328 leads will be imported" and "12 rows with errors" (a toggle that
 *   shows only those rows), then the rows, 100 a page. Nothing is sent before "Import 328
 *   leads". Importing and its result are states of Review: Progress while `onImport` runs, then
 *   CsvImportResult's table of what was imported and skipped. "Import another file" takes
 *   Back's place. It never closes by itself; `onDone` adds Done.
 *
 * `onImport` gets only the valid rows, keyed by field, normalised: text trimmed, an enum as its
 * option's `value`, a number as a plain decimal ("1234.5"), a date as yyyy-mm-dd. Report
 * progress with `onProgress(done)`. A rejected promise, or Cancel (with `cancelable`, it aborts
 * `signal`) after some rows were saved, shows the result as stopped, with Retry as the footer's
 * primary; a failure before any row shows it with nothing imported, and Cancel before any row
 * goes back to Review. Import and Retry send only the rows after the last `onProgress` count
 * (one reported after Cancel included), never a saved row again; the file and mapping stay.
 *
 * The root is 600px tall; in a Dialog or Sheet give it `className="h-auto flex-1"` (or `h-full`)
 * so it fills it, and `inDialog` so the steps' titles name the dialog. Tables and cards inside
 * sit on the panel's own fill: put it on a surface (`bg-bg-popover`). Parts for an app that
 * already has the file: CsvImportMapping, CsvImportPreview, CsvImportProgress, CsvImportResult,
 * and the plain functions in `@uisatin/pro/csv-import-parse`. Other props, `ref` included, go to
 * the root.
 */

/** The words CsvImport says on its own. They join SatinLabels, so the app translates them there. */
export const csvImportLabels = {
  /** The steps row's name. */
  csvSteps: 'Import steps',
  csvStepUpload: 'Upload file',
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
  /** The drop zone's title, with the noun's plural: "Import candidates". */
  csvUploadTitle: (noun: string) => `Import ${noun}`,
  /** What to do, under the drop zone's title. */
  csvDropText: 'Drop your CSV file here, or browse for one',
  /** Under that: the limits, already formatted ("10,000", "5 MB"), either can be null. */
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
  /** Read out when a file starts being read. */
  csvReadingFile: (name: string) => `Reading ${name}…`,
  /** Read out when the file is read. */
  csvRead: (count: string, noun: string) => `${count} ${noun} read`,
  /* Map columns */
  csvMapTitle: 'Map CSV columns',
  /** `noun` is the singular: "lead". */
  csvMapText: (noun: string) => `Pick the ${noun} field each column fills, or leave the column out.`,
  /** The mapping card's two headings; `noun` is the singular: "Lead fields". */
  csvFileColumns: 'Columns in your file',
  csvAppFields: (noun: string) => `${noun.charAt(0).toUpperCase()}${noun.slice(1)} fields`,
  /** A column with no header, or a repeated one: its place, from 1. */
  csvColumnN: (n: number) => `Column ${n}`,
  /** Each mapping Select's name. */
  csvMapsToColumn: (column: string) => `Maps to, CSV column ${column}`,
  csvDontImport: 'Don’t import',
  csvAutoMatched: 'Auto-matched',
  /** The mapping list's name. */
  csvColumns: 'CSV columns',
  /** In the card while a required field has no column. */
  csvRequiredMissing: (field: string) => `${field} is required: map a column to it`,
  /** The footer's reason while a required field has no column. */
  csvMapRequired: (field: string) => `Map a column to ${field}`,
  /** Under the column whose Select picks a field already taken. */
  csvAlreadyMapped: (field: string) => `${field} is already mapped`,
  /** The footer's reason while a field has two columns. */
  csvMappedTwice: (field: string) => `${field} is mapped to two columns`,
  csvMapSomething: 'Map at least one column',
  /* Review */
  csvReviewTitle: 'Review rows',
  csvReviewText: 'Rows with errors are skipped. The rest are imported.',
  /** Review's first tile, under the count; `noun` is picked for the count: "Candidates will be imported". */
  csvWillImport: (noun: string) => `${noun.charAt(0).toUpperCase()}${noun.slice(1)} will be imported`,
  /** Review's second tile, under the count; `noun` is the row noun picked for it: "Rows with errors". */
  csvRowsWithErrors: (noun: string) => `${noun.charAt(0).toUpperCase()}${noun.slice(1)} with errors`,
  /** Under the tiles when the file is longer than `maxRows`. */
  csvOverLimitText: (count: string, noun: string) => `${count} more ${noun} are over the limit and won’t be imported.`,
  csvChecking: 'Checking rows…',
  csvReady: (count: string) => `${count} ready`,
  csvWithErrors: (count: string) => `${count} with errors`,
  /** Rows past `maxRows`: neither imported nor in the skipped rows file. */
  csvOverLimit: (count: string) => `${count} over the limit`,
  /** The errors Alert's title (CsvImportPreview). */
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
  /* Importing */
  csvImportingTitle: (noun: string) => `Importing ${noun}`,
  csvImportingText: 'Only rows that passed their checks are sent.',
  csvImporting: (done: string, total: string) => `Importing ${done} of ${total}…`,
  csvImportStarted: (count: string, noun: string) => `Importing ${count} ${noun}…`,
  /* The result */
  csvDoneTitle: 'Import complete',
  csvNothingTitle: 'Nothing was imported',
  csvStoppedTitle: 'Import stopped',
  /** Under "Import stopped": the counts. */
  csvStoppedText: (count: string, noun: string, notImported: string, skipped: string | null) =>
    `${count} ${noun} imported · ${notImported} not imported${skipped ? ` · ${skipped} skipped` : ''}`,
  /** Under "Import complete", and CsvImportResult's heading: "328 leads imported · 12 skipped". */
  csvImported: (count: string, noun: string, skipped: string | null) => `${count} ${noun} imported${skipped ? ` · ${skipped} skipped` : ''}`,
  /** CsvImportResult's heading when an import stopped part way, and read out then. */
  csvImportStopped: (count: string, noun: string, notImported: string, skipped: string | null) =>
    `Import stopped · ${count} ${noun} imported · ${notImported} not imported${skipped ? ` · ${skipped} skipped` : ''}`,
  /** CsvImportResult's heading, and its empty Imported table, when no row was saved: `noun` is the zero form. */
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
  /** A failed import, read out; `row` is how far it got, formatted, or null. */
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
   * After Cancel, `onProgress` still counts (the screen keeps what it showed at Cancel), so a
   * request already in flight that commits is not sent again by the next Import or Retry.
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
  /**
   * A file given from the start is read at once and opens on Map columns. A new one given later
   * starts on Upload, as an added file does, and ends an import of the old one.
   */
  file?: File | null
  onFileChange?: (file: File | null) => void
  /** Called with the step on screen as it changes. */
  onStepChange?: (step: CsvImportStep) => void
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
  /**
   * Your app's mark, where the file goes: in the drop zone's picture (a 24px box on a 40px muted
   * tile) and the mapping card's heading (16px). Give it `className="size-full"`. Defaults to a
   * database glyph.
   */
  appIcon?: React.ReactNode
  /**
   * Inside a Dialog with no header of its own: each step's title and description become the
   * dialog's DialogTitle and DialogDescription, its name and description.
   */
  inDialog?: boolean
  /**
   * Called in place of the file picker, from Browse files and from a click on the drop zone (a
   * demo can drop a sample file with it). Left out, both open the picker.
   */
  onBrowse?: () => void
  /** Shows the drop zone as files dragged over it would (state sheets, docs). */
  dragging?: boolean
}

/* ---------- shared bits ---------- */

/** Don't import, as a Select value. */
const SKIP = '\u0000skip'
const STEPS: CsvImportStep[] = ['upload', 'map', 'review']
const ROW_KEY = '\u0000n'
const PAGE_SIZE = 100
/** How long the rows wait for the mapping to settle before they are checked again, ms. */
const DEBOUNCE_MS = 150

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

/** Sets a component's own ref and the one it was given. */
function useMergedRef<T>(ref: React.Ref<T> | undefined) {
  const own = React.useRef<T | null>(null)
  // Stable while `ref` is, so React doesn't detach and reattach it on every render.
  const set = React.useCallback(
    (node: T | null) => {
      own.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.RefObject<T | null>).current = node
    },
    [ref],
  )
  return [own, set] as const
}

/** The focus ring for things that take focus from a script (a status line, a heading). */
const focusTargetClass = 'rounded-xs outline-none focus-visible:[box-shadow:0_0_0_2px_var(--action-focus-ring)]'

/** A row as the tables take it. */
type TableRow = { id: string; n: number; cells: CsvCheckedRow }

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

/* ---------- the app's mark and the field icons ---------- */

/** The app's mark in a box of the size given; the default is a database glyph. */
function AppMark({ icon, className }: { icon?: React.ReactNode; className: string }) {
  return (
    <span aria-hidden className={cn('relative flex shrink-0 items-center justify-center', className)}>
      {icon ?? <Database className="size-full text-text-muted [stroke-width:1.5]" />}
    </span>
  )
}

/** A field's icon by its type, for its option and the Select showing it. */
function fieldIcon(field: CsvImportField) {
  switch (field.type) {
    case 'email':
      return <Mail />
    case 'number':
      return <Hashtag />
    case 'date':
      return <Calendar />
    case 'enum':
      return <List />
    default:
      return <Text />
  }
}

/**
 * A tile as FileUpload draws its upload mark: 40, radius-xl, bg/muted, no edge or shadow; it
 * turns bg/card while files are dragged over the zone, as the mark does.
 */
function Tile({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bg-muted transition-[background-color] duration-(--duration-fast) ease-(--ease-out) in-data-[dragging]:bg-bg-card">
      {children}
    </span>
  )
}

/*
 * The arrow from the file to the app, drawn in dots: a shaft along the middle row and a chevron
 * head pointing at the app's tile, on a 7 × 5 grid. Every dot rests dim and a pulse runs through
 * the columns from the file to the app (styles/components/csv-import.css), the head's side
 * branches with their column. Under reduced motion it holds still at a quiet fade toward the app.
 */
const ARROW = ['....x..', '.....x.', 'xxxxxxx', '.....x.', '....x..']
/** Each column's still opacity under reduced motion, file side to app side. Whole class strings. */
const ARROW_FADE = [
  'motion-reduce:opacity-40',
  'motion-reduce:opacity-50',
  'motion-reduce:opacity-60',
  'motion-reduce:opacity-70',
  'motion-reduce:opacity-80',
  'motion-reduce:opacity-90',
  'motion-reduce:opacity-100',
]
/** Each column's place in the pulse, file side first. */
const ARROW_DELAY = ['0ms', '120ms', '240ms', '360ms', '480ms', '600ms', '720ms']
function Dots() {
  return (
    <span aria-hidden data-slot="csv-import-arrow" className="grid grid-cols-[repeat(7,2px)] gap-[1.5px]">
      {ARROW.flatMap((row, r) =>
        [...row].map((cell, c) =>
          cell === 'x' ? (
            <span key={`${r}-${c}`} data-dot="" className={cn('size-[2px] rounded-full bg-text-muted opacity-25', ARROW_FADE[c])} style={{ animationDelay: ARROW_DELAY[c] }} />
          ) : (
            <span key={`${r}-${c}`} className="size-[2px]" />
          ),
        ),
      )}
    </span>
  )
}

/* ---------- the mapping ---------- */

export interface CsvImportMappingProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  fields: CsvImportField[]
  /** The column names (csvHeaders). */
  headers: string[]
  /** The data rows, for each column's first values (the first three that aren't empty). */
  rows: string[][]
  mapping: CsvMapping
  onMappingChange: (mapping: CsvMapping) => void
  /** What auto-match picked, for the Auto-matched checks. Defaults to matchColumns(headers, fields). */
  autoMapping?: CsvMapping
  /** "lead" / "leads": the heading says "Lead fields". Defaults to the `csvRowNoun` label. */
  noun?: CsvNoun
  /** Your app's mark beside that heading, 16px; give it `className="size-full"`. Defaults to a database glyph. */
  appIcon?: React.ReactNode
  disabled?: boolean
}

/**
 * Both columns of the card: the file's column, the arrow, the field. Under 480 wide the arrow
 * goes (the headings still say which side is which); under 360 the field's Select goes under the
 * column's name, so it keeps room for its value.
 */
const mapGrid =
  'grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-3 @max-[479px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @max-[479px]:gap-2 @max-[359px]:grid-cols-[minmax(0,1fr)]'

/**
 * The Map columns step on its own, one flat card: a heading row, "Columns in your file → Lead
 * fields", then one row per column, rows divided by a line. A row is the column's name (a check
 * when auto-matched) over its first values, an arrow, and the field's Select, each field led by
 * its type's icon. A required field with no column says so under the heading; a field picked
 * twice marks both Selects and says so in the row. Don't import reads muted, as a placeholder.
 * It lays out by its container's width (`@container` on an ancestor). Other props, `ref`
 * included, go to its root.
 */
export function CsvImportMapping({
  fields,
  headers,
  rows,
  mapping,
  onMappingChange,
  autoMapping,
  noun: nounProp,
  appIcon,
  disabled,
  className,
  ...props
}: CsvImportMappingProps) {
  const labels = useLabels()
  const thing = nounProp ?? labels.csvRowNoun
  const id = React.useId()
  const auto = React.useMemo(() => autoMapping ?? matchColumns(headers, fields), [autoMapping, headers, fields])
  const { duplicates, missing } = mappingIssues(mapping, fields, headers.length)
  const options = [{ value: SKIP, label: labels.csvDontImport }, ...fields.map((f) => ({ value: f.key, label: f.label, icon: fieldIcon(f) }))]
  return (
    <div
      data-slot="csv-import-mapping"
      className={cn('flex shrink-0 flex-col rounded-xl border border-border-default [--border-width-default:var(--border-width-strong)]', className)}
      {...props}
    >
      <div className={cn(mapGrid, 'h-10 shrink-0 border-b border-border-default px-3 text-sm font-medium text-text-muted')}>
        <span className="flex min-w-0 items-center gap-2">
          <FileIcon type="xlsx" />
          <span className="truncate">{labels.csvFileColumns}</span>
        </span>
        <span className="@max-[479px]:hidden" />
        <span className="flex min-w-0 items-center gap-2 @max-[359px]:hidden">
          <AppMark icon={appIcon} className="size-4" />
          <span className="truncate">{labels.csvAppFields(thing.one ?? thing.other)}</span>
        </span>
      </div>
      {missing.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1 border-b border-border-default px-3 py-2">
          {missing.map((f) => (
            <p key={f.key} className="flex items-center gap-1.5 text-sm text-text-destructive">
              <WarningCircle aria-hidden className="size-3.5 shrink-0 [stroke-width:1.875]" />
              {labels.csvRequiredMissing(f.label)}
            </p>
          ))}
        </div>
      )}
      <ul aria-label={labels.csvColumns} className="m-0 list-none p-0">
        {headers.map((name, index) => {
          const samples: string[] = []
          for (const r of rows) {
            const v = (r[index] ?? '').trim()
            if (v) samples.push(v)
            if (samples.length === 3) break
          }
          const value = mapping[index] ?? null
          const skip = value == null || !fields.some((f) => f.key === value)
          const matched = !skip && value === auto[index]
          // Both Selects of a field picked twice are marked; `duplicates` holds only the later ones.
          const dupField = !skip && [...duplicates.values()].includes(value!) ? fields.find((f) => f.key === value) : undefined
          const lineId = `${id}-${index}`
          return (
            <li
              key={index}
              data-csv-col={index}
              data-csv-skip={skip ? '' : undefined}
              className={cn(mapGrid, 'min-h-[52px] border-b border-border-default px-3 py-2 last:border-b-0')}
            >
              <div className="flex min-w-0 flex-col">
                <span className="flex min-w-0 items-center gap-1.5 text-sm leading-5 text-text-default">
                  <span className="truncate">{name}</span>
                  {matched && (
                    <Tooltip label={labels.csvAutoMatched}>
                      <span className="inline-flex shrink-0 text-status-green-fg">
                        <Check aria-hidden className="size-3.5 [stroke-width:2]" />
                        <span className="sr-only">, {labels.csvAutoMatched}</span>
                      </span>
                    </Tooltip>
                  )}
                </span>
                <span id={lineId} className={cn('truncate text-xs leading-4', dupField ? 'text-text-destructive' : 'text-text-muted')}>
                  {dupField ? labels.csvAlreadyMapped(dupField.label) : samples.join(', ')}
                </span>
              </div>
              <ArrowRight aria-hidden className={cn('size-4 [stroke-width:1.875] @max-[479px]:hidden', skip ? 'text-text-subtle' : 'text-text-muted')} />
              <Select
                size="sm"
                aria-label={labels.csvMapsToColumn(name)}
                aria-describedby={dupField ? lineId : undefined}
                options={options}
                value={value ?? SKIP}
                onValueChange={(v) => onMappingChange({ ...mapping, [index]: v === SKIP ? null : v })}
                error={!!dupField}
                disabled={disabled}
                // Don't import reads as a placeholder would: the value's box is the trigger's one
                // span not hidden from screen readers.
                className={cn(skip && '[&>span:not([aria-hidden])]:text-text-muted')}
                // 1px of room on every side, so the row's clip leaves the focus edge whole.
                wrapperClassName="min-w-0 p-px"
              />
            </li>
          )
        })}
      </ul>
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
 * The rows of the Review step on their own: "340 rows · 328 ready · 12 with errors", an Alert
 * grouping the errors by field (each group a link that turns on "Show only errors" and moves
 * focus to its first cell), the checkbox, and a Table of the mapped fields, 100 rows a page with
 * Pagination under it. An invalid cell is in the error colour with a warning mark and its reason
 * (a Tooltip, and read out). Other props, `ref` included, go to its root.
 */
export function CsvImportPreview(props: CsvImportPreviewProps) {
  return <Preview {...props} />
}

/** CsvImportPreview; `bare` leaves out the summary, the Alert and the checkbox (CsvImport's tiles say them). */
function Preview({
  fields,
  mapping,
  validation,
  overLimit = 0,
  errorsOnly: errorsOnlyProp,
  defaultErrorsOnly = false,
  onErrorsOnlyChange,
  bare = false,
  className,
  ...props
}: CsvImportPreviewProps & { bare?: boolean }) {
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

  // Back to the first page whenever the filter changes, from here or from the app.
  const [seenFilter, setSeenFilter] = React.useState(errorsOnly)
  if (seenFilter !== errorsOnly) {
    setSeenFilter(errorsOnly)
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
      {!bare && (
        <p data-csv-focus="summary" tabIndex={-1} className={cn('text-base leading-5 font-medium text-text-default', focusTargetClass)}>
          {summary.join(' · ')}
        </p>
      )}
      {!bare && errors > 0 && (
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
          <Checkbox label={labels.csvShowErrors} checked={errorsOnly} onCheckedChange={(v) => setErrorsOnlyState(v === true)} />
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
export function CsvImportResult(props: CsvImportResultProps) {
  return <Result {...props} />
}

/** CsvImportResult; `bare` leaves out the heading and the stopped Alert (CsvImport's step title and footer say them). */
function Result({
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
  bare = false,
  className,
  ref,
  ...props
}: CsvImportResultProps & { bare?: boolean }) {
  const labels = useLabels()
  const { n, noun } = useCounts(labels)
  const thing = nounProp ?? labels.csvRowNoun
  const [filterState, setFilterState] = useControllable(filterProp, defaultFilter, onFilterChange)
  const [page, setPage] = React.useState(1)
  const stopped = status === 'stopped'
  // A Not imported filter with nothing stopped has no segment: show Imported.
  const filter = filterState === 'notImported' && !stopped ? 'imported' : filterState

  const [own, setRef] = useMergedRef<HTMLDivElement>(ref)
  const tableRef = React.useRef<HTMLDivElement>(null)
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
  const overLimitNote = overLimit > 0 && <p className="text-sm text-text-muted">{labels.csvOverLimitNote(n(overLimit), noun(overLimit))}</p>

  return (
    <div ref={setRef} data-slot="csv-import-result" className={cn('flex flex-col gap-3', className)} {...props}>
      {bare ? (
        overLimitNote
      ) : (
        <div className="flex flex-col gap-1">
          <p data-csv-focus="result" tabIndex={-1} className={cn('text-base leading-5 font-medium text-text-default', focusTargetClass)}>
            {heading}
          </p>
          {overLimitNote}
        </div>
      )}
      {!bare && stopped && !failedAtStart && (
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
  | { status: 'reading'; file: File }
  | { status: 'ready'; file: File; result: CsvParseResult }
  | { status: 'error'; file: File; error: unknown }

type ImportState =
  | { status: 'idle' }
  | { status: 'importing'; done: number; total: number }
  /** `imported` valid rows saved; `stopped` with a `reason` failed, without one was cancelled. */
  | { status: 'result'; result: 'done' | 'stopped'; imported: number; reason?: string }

/** Why Next or Import can't run, in order of what to fix first. */
type Block =
  | { kind: 'duplicate'; field: CsvImportField; columns: number[] }
  | { kind: 'missing'; fields: CsvImportField[] }
  | { kind: 'nothing' }
  | { kind: 'noneReady' }

/**
 * Where focus goes after the next commit: `error` on a read that failed, `step` into the step
 * that opened (or back into Upload when a failed read is retried), `tiles` after a cancel before
 * any row was saved, `title` on the outcome.
 */
type FocusWant = 'error' | 'step' | 'tiles' | 'title'

type Checked = { input: object; result: CsvValidation | null; failed?: { error: unknown } }

/** An import run: what it sent (the read, and fields and mapping by content), its check, and the valid rows saved. */
type SavedRun = { id: number; result: CsvParseResult; key: string; validation: CsvValidation; done: number }

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

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

/**
 * The lifecycle, without layout: a file is read, its columns auto-matched, the rows checked
 * live on every mapping change (debounced, the previous check aborted), then imported,
 * cancelled or resumed, and the outcome kept for the result.
 */
function useCsvFlow({
  fields,
  onImport,
  noun: nounProp,
  maxRows,
  file: fileProp,
  onFileChange,
  mapping: mappingProp,
  defaultMapping,
  onMappingChange,
}: Pick<CsvImportProps, 'fields' | 'onImport' | 'noun' | 'maxRows' | 'file' | 'onFileChange' | 'mapping' | 'defaultMapping' | 'onMappingChange'>) {
  const labels = useLabels()
  const { n, noun } = useCounts(labels)
  const thing = nounProp ?? labels.csvRowNoun

  const [file, setFile] = useControllable<File | null>(fileProp, null, onFileChange)
  const [mapping, setMappingValue] = useControllable<CsvMapping>(mappingProp, () => defaultMapping ?? {}, onMappingChange)
  // A file given from the start is being read from the first paint.
  const [parse, setParse] = React.useState<ParseState>(() => (file ? { status: 'reading', file } : { status: 'idle' }))
  const [rejection, setRejection] = React.useState<{ name: string; reason: string } | null>(null)
  const [retry, setRetry] = React.useState(0)
  const [checked, setChecked] = React.useState<Checked | null>(null)
  const [recheck, setRecheck] = React.useState(0)
  const [imp, setImp] = React.useState<ImportState>({ status: 'idle' })

  // One polite region for reading, importing and how they ended; a new key makes it speak again.
  const [said, setSaid] = React.useState({ text: '', n: 0 })
  const announce = React.useCallback((text: string) => setSaid((s) => ({ text, n: s.n + 1 })), [])
  const focusNext = React.useRef<FocusWant | null>(null)

  const latest = React.useRef({ fields, defaultMapping, maxRows, labels, setMappingValue, announce, n, noun })
  latest.current = { fields, defaultMapping, maxRows, labels, setMappingValue, announce, n, noun }

  /* importing: one run at a time, and a run that is no longer `run.current` changes nothing on screen */
  const run = React.useRef(0)
  const abort = React.useRef<AbortController | null>(null)
  React.useEffect(
    () => () => {
      run.current++
      abort.current?.abort()
    },
    [],
  )

  /* reading the file */
  React.useEffect(() => {
    // A new file (or none) ends an import of the old one, so its outcome never lands on this one.
    run.current++
    abort.current?.abort()
    if (!file) {
      setParse({ status: 'idle' })
      return
    }
    const ac = new AbortController()
    const { labels, maxRows, announce } = latest.current
    setParse({ status: 'reading', file })
    setChecked(null)
    setImp({ status: 'idle' })
    announce(labels.csvReadingFile(file.name))
    parseCsv(file, { maxRows, signal: ac.signal }).then(
      (result) => {
        if (ac.signal.aborted) return
        const { fields, defaultMapping, labels, setMappingValue, announce, n, noun } = latest.current
        const headers = csvHeaders(result, result.header, labels.csvColumnN)
        setParse({ status: 'ready', file, result })
        setMappingValue(withDefaults(matchColumns(headers, fields), defaultMapping, headers.length))
        const rows = result.count - (result.header ? 1 : 0)
        announce(labels.csvRead(n(rows), noun(rows)))
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

  const result = parse.status === 'ready' ? parse.result : null
  const header = result?.header ?? true
  const headers = React.useMemo(() => (result ? csvHeaders(result, result.header, labels.csvColumnN) : []), [result, labels.csvColumnN])
  // Fields and the mapping count by their content, so a parent that builds them again on every
  // render (inline `fields`, a controlled mapping) doesn't start a new check, or lose the count
  // of rows saved. A field's `validate` is the one given when its content last changed.
  const fieldsKey = JSON.stringify(fields)
  const stableFields = React.useMemo(() => fields, [fieldsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // A controlled mapping may name columns this file doesn't have: they play no part.
  const mappingKey = JSON.stringify(Object.entries(mapping).filter(([i]) => Number(i) < headers.length))
  const fileMapping = React.useMemo(() => {
    const out: CsvMapping = {}
    for (const [i, key] of Object.entries(mapping)) if (Number(i) < headers.length) out[Number(i)] = key
    return out
  }, [mappingKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const dataRows = React.useMemo(() => (result ? result.records.slice(header ? 1 : 0) : []), [result, header])
  const dataCount = result ? result.count - (header ? 1 : 0) : 0
  const overLimit = maxRows != null ? Math.max(0, dataCount - maxRows) : 0
  const auto = React.useMemo(() => matchColumns(headers, stableFields), [headers, stableFields])
  const issues = mappingIssues(fileMapping, stableFields, headers.length)

  const setMapping = (next: CsvMapping) => {
    setMappingValue(next)
    setImp((s) => (s.status === 'result' ? { status: 'idle' } : s))
  }

  /* checking the rows, live */
  // Required fields with no column don't mark every row: Map columns says so, once.
  const missingKeys = issues.missing.map((f) => f.key).join()
  const checkFields = React.useMemo(
    () => stableFields.map((f) => (issues.missing.includes(f) ? { ...f, required: false } : f)),
    [stableFields, missingKeys], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const input = React.useMemo(() => ({ result, header, mapping: fileMapping, checkFields }), [result, header, fileMapping, checkFields])
  const checkedRef = React.useRef(checked)
  checkedRef.current = checked
  React.useLayoutEffect(() => {
    if (!input.result) return
    if (checkedRef.current?.input === input && checkedRef.current.result) return
    const ac = new AbortController()
    const failed = (error: unknown) => {
      setChecked({ input, result: null, failed: { error } })
      latest.current.announce(latest.current.labels.csvCheckFailed)
    }
    const run = () => {
      try {
        const job = validationJob(input.result!.records, input.mapping, input.checkFields, { header: input.header, locale: labels.dateLocale, maxRows })
        // Most files are checked in the first slice, before the next paint.
        if (job.advance(now() + 8)) {
          setChecked({ input, result: job.result() })
          return
        }
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
    }
    // The first check runs at once; later ones wait for the mapping to settle.
    if (!checkedRef.current?.result) {
      run()
      return () => ac.abort()
    }
    const t = setTimeout(run, DEBOUNCE_MS)
    return () => {
      clearTimeout(t)
      ac.abort()
    }
    // fields, labels and maxRows are read as they are when a check starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, recheck])
  /** The latest check, possibly of an older mapping while the next one runs. */
  const validation = checked?.result ?? null
  /** Whether `validation` is of the mapping on screen: Import waits for it. */
  const fresh = !!validation && checked?.input === input
  const checkFailed = checked?.input === input ? checked.failed : undefined

  /* what blocks Next and Import */
  const readyCount = validation?.valid ?? 0
  const dup = issues.duplicates.entries().next().value
  const dupField = dup ? fields.find((f) => f.key === dup[1]) : undefined
  let block: Block | null = null
  if (result) {
    if (dupField) block = { kind: 'duplicate', field: dupField, columns: [...issues.duplicates.keys()].filter((i) => fileMapping[i] === dupField.key) }
    else if (issues.missing.length) block = { kind: 'missing', fields: issues.missing }
    else if (issues.mapped === 0) block = { kind: 'nothing' }
    else if (fresh && readyCount === 0) block = { kind: 'noneReady' }
  }

  /* importing */
  // The last run, with its own check and the valid rows it saved. Import and Retry start after
  // that count when they would send the same rows (the same read of the file, the same mapping
  // and fields by content), so a row is never sent twice, whatever ended the run before.
  const saved = React.useRef<SavedRun | null>(null)
  const runKey = `${fieldsKey}|${mappingKey}|${missingKeys}`
  const startImport = () => {
    // Blockable is only aria-disabled, so a click still lands here.
    if (!result || !validation || !fresh || block) return
    const last = saved.current
    const from = last && last.result === result && last.key === runKey ? last.done : 0
    const rows = validation.rows.filter((r) => !r.errors).map((r) => r.values)
    if (rows.length === 0) return
    const skipped = validation.rows.length - rows.length
    const id = ++run.current
    const ac = new AbortController()
    abort.current = ac
    const total = rows.length
    const start = Math.max(0, Math.min(total, from))
    let done = start
    const own: SavedRun = { id, result, key: runKey, validation, done }
    saved.current = own
    let shown = 0
    let milestone = Math.floor((start / Math.max(total, 1)) * 4)
    setImp({ status: 'importing', done: start, total })
    announce(start > 0 ? labels.csvImporting(n(start), n(total)) : labels.csvImportStarted(n(total), noun(total, thing)))
    const live = () => run.current === id && !ac.signal.aborted
    // The app counts the rows it got; the panel adds the ones a failed run already did.
    const onProgress = (next: number) => {
      done = Math.max(start, Math.min(total, start + next))
      // Kept after Cancel too, off screen: a request in flight that still commits is not sent again.
      if (saved.current === own) own.done = done
      if (!live()) return
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
      own.done = total
      setImp({ status: 'result', result: 'done', imported: total })
      announce(labels.csvImported(n(total), noun(total, thing), skipped ? n(skipped) : null))
      focusNext.current = 'title'
    }
    const fail = (error: unknown) => {
      if (!live()) return
      const reason = error instanceof Error && error.message ? error.message : typeof error === 'string' && error ? error : labels.csvImportFailedReason
      setImp({ status: 'result', result: 'stopped', imported: done, reason })
      announce(`${labels.csvImportFailed(done > 0 ? n(done) : null)}. ${reason}`)
      focusNext.current = 'title'
    }
    try {
      const out = onImport(start > 0 ? rows.slice(start) : rows, { signal: ac.signal, onProgress })
      if (out && typeof (out as Promise<void>).then === 'function') (out as Promise<void>).then(finish, fail)
      else finish()
    } catch (error) {
      fail(error)
    }
  }
  const cancelImport = () => {
    // The count of the run being cancelled, against its own check.
    const own = saved.current?.id === run.current ? saved.current : null
    run.current++
    abort.current?.abort()
    if (own && own.done > 0) {
      const { done, validation } = own
      setImp({ status: 'result', result: 'stopped', imported: done })
      const skipped = validation.rows.length - validation.valid
      announce(labels.csvImportStopped(n(done), noun(done, thing), n(validation.valid - done), skipped ? n(skipped) : null))
      focusNext.current = 'title'
    } else {
      setImp({ status: 'idle' })
      focusNext.current = 'tiles'
    }
  }
  const importAnother = () => {
    run.current++
    setImp({ status: 'idle' })
    setRejection(null)
    setChecked(null)
    setFile(null)
  }

  /* files */
  const addFiles = (files: File[]) => {
    setRejection(null)
    if (files[0]) setFile(files[0])
  }
  const rejectFiles = (rejected: FileUploadRejection[]) => {
    const r = rejected[0]
    if (r) setRejection({ name: r.file.name, reason: rejectionReason(r, labels) })
  }

  return {
    labels,
    n,
    noun,
    /** The `noun` prop or the default. */
    thing,
    fields,
    parse,
    result,
    rejection,
    addFiles,
    rejectFiles,
    removeFile: () => setFile(null),
    // The Alert and its Retry go in this commit, so focus moves on into Upload (Browse files).
    retryRead: () => {
      focusNext.current = 'step'
      setParse((p) => (p.status === 'error' ? { status: 'reading', file: p.file } : p))
      setRetry((r) => r + 1)
    },
    headers,
    dataRows,
    overLimit,
    mapping: fileMapping,
    setMapping,
    auto,
    block,
    validation,
    fresh,
    checkFailed,
    recheck: () => setRecheck((r) => r + 1),
    imp,
    importing: imp.status === 'importing',
    finished: imp.status === 'result',
    readyCount,
    startImport,
    cancelImport,
    importAnother,
    said,
    focusNext,
  }
}

type CsvFlow = ReturnType<typeof useCsvFlow>

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

export function CsvImport({
  fields,
  onImport,
  noun,
  maxRows,
  maxSize,
  templateHref,
  file,
  onFileChange,
  onStepChange,
  mapping,
  defaultMapping,
  onMappingChange,
  onDone,
  cancelable = false,
  disabled = false,
  appIcon,
  inDialog = false,
  onBrowse,
  dragging = false,
  className,
  ref,
  ...props
}: CsvImportProps) {
  const flow = useCsvFlow({ fields, onImport, noun, maxRows, file, onFileChange, mapping, defaultMapping, onMappingChange })
  const { labels, n } = flow
  const [rootRef, setRoot] = useMergedRef<HTMLDivElement>(ref)
  const partRef = React.useRef<HTMLDivElement | null>(null)
  const reasonId = React.useId()

  // The step the person is on. A file read on Upload waits there as an attachment until Next;
  // no file goes back to Upload. A file given from the start opens on Map columns once read; a
  // new one given later (a controlled `file`) starts on Upload, as an added one does.
  const [step, setStep] = React.useState<CsvImportStep>(() => (flow.parse.status === 'idle' ? 'upload' : 'map'))
  const flowFile = flow.parse.status === 'idle' ? null : flow.parse.file
  const [stepFile, setStepFile] = React.useState(flowFile)
  if (flowFile !== stepFile) {
    setStepFile(flowFile)
    if (step !== 'upload') setStep('upload')
  } else if (flow.parse.status === 'idle' && step !== 'upload') setStep('upload')
  const ready = flow.parse.status === 'ready'
  // The attachment under the zone fills a progress bar while the file is read: 10% every 60ms,
  // held at 90% until the read is done, so even a quick read shows it arriving. The file is
  // loaded once both are through.
  const parseFile = flow.parse.status === 'reading' || flow.parse.status === 'ready' ? flow.parse.file : null
  const [load, setLoad] = React.useState<{ file: File | null; progress: number }>({ file: parseFile, progress: 100 })
  if (load.file !== parseFile) setLoad({ file: parseFile, progress: parseFile ? 0 : 100 })
  React.useEffect(() => {
    if (load.progress >= 100) return
    const t = setTimeout(() => setLoad((l) => ({ ...l, progress: Math.min(ready ? 100 : 90, l.progress + 10) })), 60)
    return () => clearTimeout(t)
  }, [load, ready])
  const loaded = ready && load.progress >= 100
  // What is on screen: until the file is read, Upload with its attachment.
  const view: CsvImportStep = ready ? step : 'upload'

  // Only the step slides; the steps row and the footer stay put.
  useStepSlide(view, STEPS.indexOf(view), rootRef, () => [partRef.current])
  // A step opens at its top, not where the last one was scrolled to.
  React.useLayoutEffect(() => {
    if (partRef.current) partRef.current.scrollTop = 0
  }, [view])

  const stepChange = React.useRef(onStepChange)
  stepChange.current = onStepChange
  const shownStep = React.useRef(view)
  React.useEffect(() => {
    if (shownStep.current === view) return
    shownStep.current = view
    stepChange.current?.(view)
  }, [view])

  // Focus moves into what changed, when focus was in the panel (or lost with what was removed).
  React.useLayoutEffect(() => {
    const want = flow.focusNext.current
    const root = rootRef.current
    const part = partRef.current
    if (!want || !root || !part) return
    const active = document.activeElement
    if (active && active !== document.body && !root.contains(active)) {
      flow.focusNext.current = null
      return
    }
    const q = (s: string) => part.querySelector<HTMLElement>(s)
    let target: HTMLElement | null = null
    if (want === 'error') target = q('[data-csv-focus="error"]')
    else if (want === 'title') target = q('[data-csv-focus="title"]')
    else if (want === 'tiles') target = q('[data-csv-focus="tiles"]')
    else if (view === 'upload') target = q('button:not([disabled]), a[href], [tabindex="0"]')
    else if (view === 'map') {
      // The column to fix first: a duplicate, else the first on Don't import while a required
      // field has no column, else the first.
      const block = flow.block
      if (block?.kind === 'duplicate') target = q(`[data-csv-col="${block.columns[0]}"] [data-slot="select-trigger"]`)
      else if (block?.kind === 'missing') target = q('[data-csv-skip] [data-slot="select-trigger"]') ?? q('[data-slot="select-trigger"]')
      else target = q('[data-slot="select-trigger"]')
    } else if (flow.validation) target = q('[data-csv-focus="tiles"]')
    if (!target) return
    flow.focusNext.current = null
    target.focus({ preventScroll: true })
  })

  const go = (next: CsvImportStep) => {
    flow.focusNext.current = 'step'
    setStep(next)
  }
  const importAnother = () => {
    flow.importAnother()
    flow.focusNext.current = 'step'
    setStep('upload')
  }

  /* what blocks the primary, and why */
  const block = flow.block
  const mapBlock = block && block.kind !== 'noneReady' ? block : null
  let reason: string | null = null
  let blocked = false
  if (view === 'upload') {
    blocked = !loaded
    reason = !parseFile ? labels.csvChooseFile : null
  } else if (view === 'map') {
    blocked = !!mapBlock
    if (mapBlock?.kind === 'duplicate') reason = labels.csvMappedTwice(mapBlock.field.label)
    else if (mapBlock?.kind === 'missing') reason = labels.csvMapRequired(mapBlock.fields[0].label)
    else if (mapBlock?.kind === 'nothing') reason = labels.csvMapSomething
  } else if (!flow.finished) {
    blocked = !!block || !flow.fresh
    reason = flow.importing ? null : block?.kind === 'noneReady' ? labels.csvNothingToImport : null
  } else if (flow.imp.status === 'result' && flow.imp.result === 'stopped') {
    // Retry waits, like Import, for a check of the mapping on screen.
    blocked = !!block || !flow.fresh
    reason = flow.fresh ? null : labels.csvChecking
  }

  let primary: React.ReactNode
  const imp = flow.imp
  if (view === 'review' && imp.status === 'result' && imp.result === 'stopped') {
    // A stopped run, or one that saved nothing: Retry sends the rows not yet imported.
    primary = (
      <Blockable reason={reason} reasonId={reasonId} blocked={blocked} disabled={disabled} onClick={flow.startImport}>
        {imp.imported > 0 ? labels.csvRetryFrom(n(imp.imported + 1)) : labels.csvRetry}
      </Blockable>
    )
  } else if (view === 'review') {
    primary = flow.finished ? (
      onDone && <Button onClick={onDone}>{labels.csvDone}</Button>
    ) : (
      <Blockable reason={reason} reasonId={reasonId} blocked={blocked} disabled={disabled} loading={flow.importing} onClick={flow.startImport}>
        {labels.csvImportRows(n(flow.readyCount), flow.noun(flow.readyCount, flow.thing))}
      </Blockable>
    )
  } else {
    primary = (
      <Blockable reason={reason} reasonId={reasonId} blocked={blocked} disabled={disabled} onClick={() => !blocked && go(view === 'upload' ? 'map' : 'review')}>
        {labels.csvNext}
      </Blockable>
    )
  }

  // While a cancelable import runs Cancel stands where Back was (Back can't run then), so the
  // footer never holds three buttons; on the result, Import another file, since Back to Review
  // would offer the import again.
  let back: React.ReactNode
  if (flow.importing && cancelable)
    back = (
      <Button variant="secondary" onClick={flow.cancelImport}>
        {labels.csvCancel}
      </Button>
    )
  else if (flow.finished)
    back = (
      <Button variant="secondary" onClick={importAnother}>
        {labels.csvImportAnother}
      </Button>
    )
  else
    back = (
      <Button variant="secondary" disabled={disabled || view === 'upload' || flow.importing} onClick={() => go(view === 'review' ? 'map' : 'upload')}>
        {labels.csvBack}
      </Button>
    )

  return (
    <div
      ref={setRoot}
      data-slot="csv-import"
      data-step={flow.finished ? 'result' : view}
      // A size container, so the steps row, the mapping card and the footer fold at a narrow
      // width. Tables and cards inside sit on the panel's fill, one fill throughout, so their
      // edges carry the shape: border/default for the outline and every rule, 1px.
      className={cn(
        '@container flex h-[600px] min-h-0 shrink flex-col [--bg-card:var(--bg-popover)] [--component-table-header:var(--bg-popover)] [&_[data-slot=table]]:border-border-default [&_[data-slot=table]]:[--border-subtle:var(--border-default)]',
        className,
      )}
      {...props}
    >
      <HeaderSteps
        view={view}
        complete={imp.status === 'result' && imp.result === 'done'}
        labels={labels}
        n={n}
        // A step is a way back, or forward as far as Next would go: never while importing or after
        // a finished import, Map once the file is read, Review once the mapping holds.
        reachable={(s) => !disabled && !flow.importing && !flow.finished && (s === 'upload' || (loaded && (s === 'map' || !mapBlock)))}
        onGo={go}
      />
      <div data-slot="csv-import-body" className="relative min-h-0 flex-1 overflow-clip">
        {/* Title, description and body scroll as one. */}
        <div ref={partRef} data-slot="csv-import-step" className="absolute inset-0 flex flex-col overflow-y-auto px-4 pb-4">
          {view === 'upload' ? (
            <UploadBody
              flow={flow}
              maxRows={maxRows}
              maxSize={maxSize}
              templateHref={templateHref}
              disabled={disabled}
              appIcon={appIcon}
              inDialog={inDialog}
              onBrowse={onBrowse}
              dragging={dragging}
              progress={load.progress}
              loaded={loaded}
            />
          ) : (
            <>
              <StepHeading flow={flow} view={view} inDialog={inDialog} />
              <StepBody flow={flow} view={view} appIcon={appIcon} disabled={disabled} />
            </>
          )}
        </div>
      </div>
      <div data-slot="csv-import-footer" className="flex h-[68px] shrink-0 items-start gap-3 px-4 pt-4 @max-[440px]:gap-2">
        {back}
        {/* The reason stays in the Tooltip and aria-describedby where there is no room to show it. */}
        <div className="flex min-h-9 min-w-0 flex-1 items-center">
          <p id={reasonId} className="line-clamp-2 text-sm text-text-muted @max-[400px]:sr-only">
            {reason}
          </p>
        </div>
        {primary}
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        <span key={flow.said.n}>{flow.said.text}</span>
      </div>
    </div>
  )
}

/* ---------- the steps row ---------- */

/*
 * The steps as the header row: a numbered circle and a label each, a dot between. Upcoming steps
 * are muted on bg/muted; the current one is solid action/primary with its number in
 * action/primary fg, as Stepper draws its current step, and its label in text/default medium; a
 * done one shows a check. The row is 37 high with the circles at its bottom, 13 from the top, so a
 * dialog's close button (36 at 7 from the corner) sits on their centre line; the end stays free
 * for it. Under 480 wide only the current step keeps its label (the others keep theirs for screen
 * readers); under 360 the dots between them go too. Free's Stepper draws its labels under the
 * circles, or folds to a count, so the row is drawn here.
 */
function HeaderSteps({
  view,
  complete,
  labels,
  n,
  reachable,
  onGo,
}: {
  view: CsvImportStep
  complete: boolean
  labels: Labels
  n: (count: number) => string
  reachable: (step: CsvImportStep) => boolean
  onGo: (step: CsvImportStep) => void
}) {
  const current = complete ? -1 : STEPS.indexOf(view)
  const stepLabel = { upload: labels.csvStepUpload, map: labels.csvStepMap, review: labels.csvStepReview }
  return (
    <div data-slot="csv-import-steps" className="flex h-[37px] shrink-0 items-end ps-4 pe-14">
      <ol aria-label={labels.csvSteps} className="m-0 flex min-w-0 list-none items-center gap-3 p-0 @max-[479px]:gap-2">
        {STEPS.map((s, i) => {
          const state = complete || i < current ? 'complete' : i === current ? 'current' : 'upcoming'
          const content = (
            <>
              <span
                aria-hidden
                data-state={state}
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full text-xs leading-none font-medium tabular-nums',
                  state === 'current' ? 'bg-action-primary-bg text-action-primary-fg' : 'bg-bg-muted text-text-muted',
                  state === 'complete' && 'text-text-default',
                )}
              >
                {state === 'complete' ? <Check className="size-3.5 [stroke-width:2]" /> : n(i + 1)}
              </span>
              <span
                className={cn(
                  'truncate text-sm whitespace-nowrap',
                  state === 'current' ? 'font-medium text-text-default' : 'text-text-muted group-hover/step:text-text-default @max-[479px]:sr-only',
                )}
              >
                {stepLabel[s]}
                {state === 'complete' && <span className="sr-only">, {labels.stepCompleted}</span>}
              </span>
            </>
          )
          return (
            <li key={s} aria-current={state === 'current' ? 'step' : undefined} className="flex min-w-0 items-center gap-3 @max-[479px]:gap-2">
              {i > 0 && <span aria-hidden className="size-1 shrink-0 rounded-full bg-border-strong @max-[359px]:hidden" />}
              {/* The current step stays text; another one you can reach is a button that goes there. */}
              {state !== 'current' && reachable(s) ? (
                <button
                  type="button"
                  onClick={() => onGo(s)}
                  className="group/step -m-1 flex min-w-0 items-center gap-3 rounded-full p-1 outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--action-focus-ring) @max-[479px]:gap-2"
                >
                  {content}
                </button>
              ) : (
                <span className="flex min-w-0 items-center gap-3 @max-[479px]:gap-2">{content}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ---------- upload ---------- */

/**
 * Upload as one block: the drop zone fills the step, and its picture is the file going into the
 * app; its title and first line say what to do, its second what it takes. An added file shows
 * under the zone with its bar. Errors go above the zone, the template link under it.
 */
function UploadBody({
  flow,
  maxRows,
  maxSize,
  templateHref,
  disabled,
  appIcon,
  inDialog,
  onBrowse,
  dragging,
  progress,
  loaded,
}: {
  flow: CsvFlow
  maxRows?: number
  maxSize?: number
  templateHref?: string
  disabled: boolean
  appIcon?: React.ReactNode
  inDialog: boolean
  onBrowse?: () => void
  dragging: boolean
  progress: number
  loaded: boolean
}) {
  const { labels, n, parse, thing } = flow
  const limits = labels.csvUploadHint(maxRows != null ? n(maxRows) : null, maxSize != null ? formatBytes(maxSize) : null)
  const text = (
    <>
      <span className="block">{labels.csvDropText}</span>
      {limits && <span className="block">{limits}</span>}
    </>
  )
  // In a Dialog the zone's title and lines are its name and description, as spans in FileUpload's
  // paragraphs, in the paragraphs' own type.
  const asTitle = (t: React.ReactNode) =>
    inDialog ? (
      <DialogTitle asChild className="pe-0 leading-[inherit]">
        <span>{t}</span>
      </DialogTitle>
    ) : (
      t
    )
  const browsing = !!onBrowse && !disabled
  const satin = useSatinLabels()
  const attachment: FileUploadFile | null =
    parse.status === 'reading' || parse.status === 'ready'
      ? { id: 'csv', name: parse.file.name, size: parse.file.size, status: loaded ? 'done' : 'uploading', progress }
      : null
  return (
    <div className="flex flex-1 flex-col gap-3 pt-4">
      {parse.status === 'error' && (
        <Alert
          intent="error"
          tabIndex={-1}
          data-csv-focus="error"
          className={focusTargetClass}
          title={labels.csvParseFailed(parse.file.name)}
          description={parseReason(parse.error, labels, n)}
          action={
            <Button variant="secondary" size="xs" onClick={flow.retryRead}>
              {labels.csvRetry}
            </Button>
          }
        />
      )}
      {flow.rejection && <Alert intent="error" title={labels.csvRejected(flow.rejection.name)} description={flow.rejection.reason} />}
      {/* The attachment lands inside the zone, at its foot, so the zone keeps its size. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <FileUpload
        accept=".csv,text/csv,text/plain"
        multiple={false}
        maxSize={maxSize}
        disabled={disabled}
        media={
          <span aria-hidden className="flex items-center gap-3">
            <Tile>
              <FileIcon type="xlsx" className="size-6" />
            </Tile>
            <Dots />
            <Tile>
              <AppMark icon={appIcon} className="size-6" />
            </Tile>
          </span>
        }
        title={asTitle(labels.csvUploadTitle(thing.other))}
        // The dialog keeps a name while files are dragged over.
        dropTitle={asTitle(labels.dropToUpload)}
        description={
          inDialog ? (
            <DialogDescription asChild className="block text-sm">
              <span>{text}</span>
            </DialogDescription>
          ) : (
            text
          )
        }
        files={[]}
        onFilesAdded={flow.addFiles}
        onFilesRejected={flow.rejectFiles}
        onRemove={flow.removeFile}
        onBrowse={onBrowse}
        data-force={dragging ? 'drag' : undefined}
        // With onBrowse, a click anywhere on the zone browses too (Browse files calls it itself).
        // The zone isn't a control of its own: keyboard users have Browse files.
        onClick={
          browsing
            ? (e: React.MouseEvent<HTMLDivElement>) => {
                const target = e.target as HTMLElement
                if (!dragging && target.closest('[data-slot="file-upload-zone"]') && !target.closest('button')) onBrowse?.()
              }
            : undefined
        }
        // The zone takes the step's height, its content centred in it.
        className={cn(
          'flex-1 [&>[data-slot=file-upload-zone]]:flex-1 [&>[data-slot=file-upload-zone]]:justify-center',
          browsing && '[&>[data-slot=file-upload-zone]:not([data-dragging])]:cursor-pointer',
        )}
      />
      {/* As FileUpload lists its files: an uploading row while the file is read, then the
          attachment. Here they sit inside the zone, at its foot, so the zone keeps its size. */}
      {attachment && (
        <ul
          className="absolute inset-x-4 bottom-4 m-0 list-none p-0"
          aria-label={attachment.status === 'done' ? satin.attachedFiles : satin.files}
        >
          <li>
            {attachment.status === 'done' ? (
              <Attachment
                name={attachment.name}
                meta={`CSV · ${formatBytes(attachment.size ?? 0)}`}
                icon={<FileIcon type="xlsx" />}
                onRemove={flow.removeFile}
                className="flex w-full [&_[data-attachment-main]]:flex-1 [&_[data-attachment-name]]:max-w-none"
              />
            ) : (
              <FileUploadItem file={attachment} />
            )}
          </li>
        </ul>
      )}
      </div>
      {templateHref && (
        <Link href={templateHref} download variant="muted" className="inline-flex items-center gap-1 self-start text-sm">
          <Download aria-hidden className="size-3.5 [stroke-width:1.875]" />
          {labels.csvTemplate}
        </Link>
      )}
    </div>
  )
}

/* ---------- the step's title ---------- */

/**
 * From Map columns on: a left-aligned title and description in the dialog header's type
 * (DialogTitle, DialogDescription), scrolling with the step. On the result the title says the
 * outcome (CsvImportResult's own heading is left out) and takes focus.
 */
function StepHeading({ flow, view, inDialog }: { flow: CsvFlow; view: CsvImportStep; inDialog: boolean }) {
  const { labels, n, noun, thing, imp } = flow
  let title: string
  let text: React.ReactNode = null
  const outcome = imp.status === 'result'
  if (imp.status === 'result') {
    const valid = flow.validation?.valid ?? 0
    const skipped = flow.validation ? flow.validation.rows.length - valid : 0
    const skippedText = skipped > 0 ? n(skipped) : null
    if (imp.result === 'done') {
      title = labels.csvDoneTitle
      text = labels.csvImported(n(imp.imported), noun(imp.imported, thing), skippedText)
    } else if (imp.imported === 0) {
      title = labels.csvNothingTitle
      text = imp.reason ?? labels.csvImportCancelled
    } else {
      title = labels.csvStoppedTitle
      const counts = labels.csvStoppedText(n(imp.imported), noun(imp.imported, thing), n(valid - imp.imported), skippedText)
      text = imp.reason ? (
        <>
          {counts}
          <br />
          {imp.reason}
        </>
      ) : (
        counts
      )
    }
  } else if (view === 'map') {
    title = labels.csvMapTitle
    text = labels.csvMapText(thing.one ?? thing.other)
  } else if (imp.status === 'importing') {
    title = labels.csvImportingTitle(thing.other)
    text = labels.csvImportingText
  } else {
    title = labels.csvReviewTitle
    text = labels.csvReviewText
  }

  // DialogTitle's type; no end padding, the close button sits in the steps row above.
  const titleClass = 'pe-0 text-base leading-[14px] font-medium tracking-normal text-text-default'
  // On the result the title is where focus goes; the ring shows only after keyboard use.
  const titleProps = outcome ? { tabIndex: -1, 'data-csv-focus': 'title', className: cn(titleClass, focusTargetClass) } : { className: titleClass }
  return (
    <div data-slot="csv-import-heading" className="flex shrink-0 flex-col gap-1 pt-8 pb-5">
      {inDialog ? (
        <>
          <DialogTitle {...titleProps}>{title}</DialogTitle>
          {text && <DialogDescription>{text}</DialogDescription>}
        </>
      ) : (
        <>
          <h2 {...titleProps}>{title}</h2>
          {text && <p className="text-body text-text-muted">{text}</p>}
        </>
      )}
    </div>
  )
}

/* ---------- the step's body ---------- */

/** Map columns' card, then Review: checking, its tiles and rows, importing, the result. */
function StepBody({ flow, view, appIcon, disabled }: { flow: CsvFlow; view: CsvImportStep; appIcon?: React.ReactNode; disabled: boolean }) {
  const { labels, n, noun, validation, imp } = flow
  if (view === 'map')
    return (
      <CsvImportMapping
        fields={flow.fields}
        headers={flow.headers}
        rows={flow.dataRows}
        mapping={flow.mapping}
        onMappingChange={flow.setMapping}
        autoMapping={flow.auto}
        noun={flow.thing}
        appIcon={appIcon}
        disabled={disabled}
      />
    )
  if (imp.status === 'result' && validation && flow.result)
    return (
      <Result
        bare
        fields={flow.fields}
        mapping={flow.mapping}
        validation={validation}
        imported={imp.imported}
        status={imp.result}
        reason={imp.reason}
        overLimit={flow.overLimit}
        noun={flow.thing}
        headers={flow.headers}
        fileName={flow.parse.status === 'ready' ? flow.parse.file.name : undefined}
        delimiter={flow.result.delimiter}
      />
    )
  if (flow.checkFailed) {
    const error = flow.checkFailed.error
    return (
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
              flow.focusNext.current = 'step'
              flow.recheck()
            }}
          >
            {labels.csvRetry}
          </Button>
        }
      />
    )
  }
  if (!validation)
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="flex items-center gap-2 text-base leading-5 font-medium text-text-default">
          <Spinner label={null} />
          {labels.csvChecking}
        </p>
      </div>
    )
  if (imp.status === 'importing') {
    const errors = validation.rows.length - validation.valid
    return (
      <div className="flex flex-1 flex-col gap-3">
        <p data-csv-focus="summary" tabIndex={-1} className={cn('text-base leading-5 font-medium text-text-default', focusTargetClass)}>
          {[labels.csvCount(n(validation.rows.length), noun(validation.rows.length)), labels.csvReady(n(validation.valid)), errors > 0 && labels.csvWithErrors(n(errors))]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="flex flex-1 flex-col justify-center pb-8">
          <CsvImportProgress done={imp.done} total={imp.total} />
        </div>
      </div>
    )
  }
  return <ReviewBody flow={flow} validation={validation} />
}

/*
 * Review: the counts as two separate muted tiles (rows that will be imported, rows with
 * errors), then the preview's table. The errors tile is a toggle for the errors-only filter; it
 * stands for the preview's summary line, its errors Alert and its "Show only errors" checkbox.
 * With no errors it is plain muted text. Its own component, so the filter starts off on every
 * visit to Review.
 */
function ReviewBody({ flow, validation }: { flow: CsvFlow; validation: CsvValidation }) {
  const { labels, n, noun, thing } = flow
  const [errorsOnly, setErrorsOnly] = React.useState(false)
  const errors = validation.rows.length - validation.valid
  const half = 'flex min-w-0 flex-col gap-0.5 rounded-xl bg-bg-muted px-4 py-3 text-start'
  const count = 'text-2xl leading-8 font-semibold tabular-nums'
  return (
    <>
      <div data-slot="csv-import-tiles" className="mb-4 grid shrink-0 grid-cols-2 gap-3 @max-[399px]:grid-cols-1">
        {/* Focus lands here on entering Review: the count and its label are read as one. */}
        <div tabIndex={-1} data-csv-focus="tiles" className={cn(focusTargetClass, half)}>
          <span className={cn(count, 'text-text-default')}>{n(validation.valid)}</span>
          {/* A space, so the count and its label are read as two words (here and below). */}{' '}
          <span className="truncate text-sm text-text-default">{labels.csvWillImport(noun(validation.valid, thing))}</span>
        </div>
        {errors > 0 ? (
          <button
            type="button"
            aria-pressed={errorsOnly}
            onClick={() => setErrorsOnly(!errorsOnly)}
            className={cn(
              half,
              'relative cursor-pointer outline-offset-2 transition-[background-color,box-shadow] duration-(--duration-fast) ease-(--ease-out) focus-visible:outline-2 focus-visible:outline-(--action-focus-ring)',
              // Pressed: the status red fill with a 1px inset edge of its foreground, as a selected card's edge.
              errorsOnly ? 'bg-status-red-bg shadow-[inset_0_0_0_var(--border-width-strong)_var(--status-red-fg)]' : 'satin-hover:bg-bg-selected',
            )}
          >
            <span className={cn(count, 'text-status-red-fg')}>{n(errors)}</span>{' '}
            <span className="truncate text-sm text-text-default">{labels.csvRowsWithErrors(noun(errors))}</span>
            {/* Says the tile filters, on the count's centre line; red while the filter is on. */}
            <Filter aria-hidden className={cn('absolute end-4 top-5 size-4 [stroke-width:1.875]', errorsOnly ? 'text-status-red-fg' : 'text-text-muted')} />
          </button>
        ) : (
          <div className={half}>
            <span className={cn(count, 'text-text-muted')}>{n(0)}</span>{' '}
            <span className="truncate text-sm text-text-muted">{labels.csvRowsWithErrors(noun(0))}</span>
          </div>
        )}
      </div>
      {flow.overLimit > 0 && <p className="-mt-2 mb-4 text-sm text-text-muted">{labels.csvOverLimitText(n(flow.overLimit), noun(flow.overLimit, thing))}</p>}
      <Preview bare fields={flow.fields} mapping={flow.mapping} validation={validation} errorsOnly={errorsOnly} onErrorsOnlyChange={setErrorsOnly} />
    </>
  )
}
