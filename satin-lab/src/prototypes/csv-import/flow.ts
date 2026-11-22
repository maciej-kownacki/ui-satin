import * as React from 'react'
import type { FileUploadRejection } from '@uisatin/ui/file-upload'
import type { CsvImportProps, CsvImportResultProps, CsvNoun } from '@uisatin/pro/csv-import'
import {
  CsvParseError,
  csvHeaders,
  isAbortError,
  matchColumns,
  parseCsv,
  runCsvJob,
  validationJob,
  type CsvImportField,
  type CsvMapping,
  type CsvParseResult,
  type CsvValidation,
} from '@uisatin/pro/csv-import-parse'
import { useWords, type Words } from './shared'

/*
 * useCsvFlow: v0's lifecycle as a prototype-local copy (not a refactor of CsvImport), without
 * steps. A file is read, its columns auto-matched, the rows checked live on every mapping
 * change (debounced 150 ms, the previous check aborted), then imported, cancelled or resumed,
 * and the outcome kept for CsvImportResult. The component renders it; the flow never decides layout.
 *
 * Stage: `upload` until a file picked on the upload view is read, then `work`. A file handed in
 * at mount starts on `work` (its reading shows there), so it never slides.
 */

/** The props the prototype takes from CsvImport's. */
export type CsvVariantProps = Pick<
  CsvImportProps,
  'fields' | 'onImport' | 'noun' | 'maxRows' | 'maxSize' | 'templateHref' | 'file' | 'onFileChange' | 'cancelable' | 'onDone' | 'className'
>

export type CsvStage = 'upload' | 'work'

export type ParseState =
  | { status: 'idle' }
  | { status: 'reading'; file: File; read: number }
  | { status: 'ready'; file: File; result: CsvParseResult }
  | { status: 'error'; file: File; error: unknown }

export type ImportState =
  | { status: 'idle' }
  | { status: 'importing'; done: number; total: number }
  /** `imported` valid rows saved; `stopped` with a `reason` failed, without one was cancelled. */
  | { status: 'result'; result: 'done' | 'stopped'; imported: number; reason?: string }

/** Why Import can't run, in order of what to fix first. */
export type CsvBlock =
  | { kind: 'duplicate'; field: CsvImportField; columns: number[] }
  | { kind: 'missing'; fields: CsvImportField[] }
  | { kind: 'nothing' }
  | { kind: 'noneReady' }

/**
 * Where focus goes after the next commit: `reading`, `error` and `upload` on the upload view,
 * `work` when the working screen opens (each variant picks its element), `status` after a cancel
 * before any row was saved, `result` on the outcome.
 */
export type FocusWant = 'reading' | 'error' | 'upload' | 'work' | 'status' | 'result'

type Checked = { input: object; result: CsvValidation | null; failed?: { error: unknown } }

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const DEBOUNCE_MS = 150

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

/** Counts in the labels' locale: the number formatted, and the noun's form for it. */
function useCounts(words: Words) {
  return React.useMemo(() => {
    const numbers = new Intl.NumberFormat(words.dateLocale)
    const rules = new Intl.PluralRules(words.dateLocale)
    const n = (count: number) => numbers.format(count)
    const noun = (count: number, forms: CsvNoun = words.csvRowNoun) => forms[rules.select(count) as keyof CsvNoun] ?? forms.other
    return { n, noun }
  }, [words])
}

/** Fields with two columns (the later columns of each) and required fields with none. */
export function mappingIssues(mapping: CsvMapping, fields: CsvImportField[], columns: number) {
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

export function useCsvFlow({ fields, onImport, noun: nounProp, maxRows, maxSize, templateHref, file: fileProp, onFileChange, cancelable = false }: CsvVariantProps) {
  const words = useWords()
  const { n, noun } = useCounts(words)
  const thing = nounProp ?? words.csvRowNoun

  const [file, setFile] = useControllable<File | null>(fileProp, null, onFileChange)
  const [stage, setStage] = React.useState<CsvStage>(() => (file ? 'work' : 'upload'))
  const stageRef = React.useRef(stage)
  stageRef.current = stage
  const [parse, setParse] = React.useState<ParseState>(() => (file ? { status: 'reading', file, read: 0 } : { status: 'idle' }))
  const [header, setHeaderState] = React.useState(true)
  const [mapping, setMappingState] = React.useState<CsvMapping>({})
  const [rejection, setRejection] = React.useState<{ name: string; reason: string } | null>(null)
  const [retry, setRetry] = React.useState(0)
  const [checked, setChecked] = React.useState<Checked | null>(null)
  const [recheck, setRecheck] = React.useState(0)
  const [imp, setImp] = React.useState<ImportState>({ status: 'idle' })

  const [said, setSaid] = React.useState({ text: '', n: 0 })
  const announce = React.useCallback((text: string) => setSaid((s) => ({ text, n: s.n + 1 })), [])
  const focusNext = React.useRef<FocusWant | null>(null)

  const parseReason = React.useCallback(
    (error: unknown) => {
      if (error instanceof CsvParseError) {
        if (error.code === 'excel') return words.csvExcel
        if (error.code === 'binary') return words.csvBinary
        if (error.code === 'empty') return words.csvEmpty
        return words.csvUnterminated(n(error.row ?? 1))
      }
      return words.csvReadFailed
    },
    [words, n],
  )

  const latest = React.useRef({ fields, maxRows, words, announce, n, noun, parseReason })
  latest.current = { fields, maxRows, words, announce, n, noun, parseReason }

  /* reading the file */
  React.useEffect(() => {
    if (!file) {
      setParse({ status: 'idle' })
      setStage('upload')
      return
    }
    const ac = new AbortController()
    const { words, maxRows, announce } = latest.current
    setParse({ status: 'reading', file, read: 0 })
    setChecked(null)
    setImp({ status: 'idle' })
    announce(words.csvReadingFile(file.name))
    focusNext.current = 'reading'
    parseCsv(file, {
      maxRows,
      signal: ac.signal,
      onProgress: (read) => setParse((p) => (p.status === 'reading' && p.file === file ? { ...p, read } : p)),
    }).then(
      (result) => {
        if (ac.signal.aborted) return
        const { fields, words, announce, n, noun } = latest.current
        const headers = csvHeaders(result, result.header, words.csvColumnN)
        setParse({ status: 'ready', file, result })
        setHeaderState(result.header)
        const auto = matchColumns(headers, fields)
        setMappingState(auto)
        const rows = result.count - (result.header ? 1 : 0)
        announce(words.csvRead(n(rows), noun(rows)))
        focusNext.current = 'work'
        setStage('work')
      },
      (error) => {
        if (ac.signal.aborted || isAbortError(error)) return
        setParse({ status: 'error', file, error })
        latest.current.announce(latest.current.parseReason(error))
        focusNext.current = 'error'
      },
    )
    return () => ac.abort()
  }, [file, retry])

  const result = parse.status === 'ready' ? parse.result : null
  const headers = React.useMemo(() => (result ? csvHeaders(result, header, words.csvColumnN) : []), [result, header, words.csvColumnN])
  const dataRows = React.useMemo(() => (result ? result.records.slice(header ? 1 : 0) : []), [result, header])
  const dataCount = result ? result.count - (header ? 1 : 0) : 0
  const overLimit = maxRows != null ? Math.max(0, dataCount - maxRows) : 0
  const auto = React.useMemo(() => matchColumns(headers, fields), [headers, fields])
  const issues = mappingIssues(mapping, fields, headers.length)

  const setMapping = (next: CsvMapping) => {
    setMappingState(next)
    setImp((s) => (s.status === 'result' ? { status: 'idle' } : s))
  }

  /* checking the rows, live */
  // Required fields with no column don't mark every row: the block says so, once.
  const checkFields = React.useMemo(() => fields.map((f) => (issues.missing.includes(f) ? { ...f, required: false } : f)), [fields, issues.missing.map((f) => f.key).join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const input = React.useMemo(() => ({ result, header, mapping, checkFields }), [result, header, mapping, checkFields])
  const checkedRef = React.useRef(checked)
  checkedRef.current = checked
  React.useLayoutEffect(() => {
    if (stage !== 'work' || !input.result) return
    if (checkedRef.current?.input === input && checkedRef.current.result) return
    const ac = new AbortController()
    const failed = (error: unknown) => {
      setChecked({ input, result: null, failed: { error } })
      latest.current.announce(latest.current.words.csvCheckFailed)
    }
    const run = () => {
      try {
        const job = validationJob(input.result!.records, input.mapping, input.checkFields, { header: input.header, locale: words.dateLocale, maxRows })
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
    // fields, words and maxRows are read as they are when a check starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, input, recheck])
  /** The latest check, possibly of an older mapping while the next one runs. */
  const validation = checked?.result ?? null
  /** Whether `validation` is of the mapping on screen: Import waits for it. */
  const fresh = !!validation && checked?.input === input
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
  // The valid rows saved so far for this check of the file: Import and Retry start after them.
  const saved = React.useRef<{ validation: CsvValidation | null; done: number }>({ validation: null, done: 0 })
  const startImport = () => {
    if (!validation || !fresh) return
    const from = saved.current.validation === validation ? saved.current.done : 0
    const rows = validation.rows.filter((r) => !r.errors).map((r) => r.values)
    if (rows.length === 0) return
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
    announce(start > 0 ? words.csvImporting(n(start), n(total)) : words.csvImportStarted(n(total), noun(total, thing)))
    const live = () => run.current === id && !ac.signal.aborted
    const onProgress = (next: number) => {
      if (!live()) return
      done = Math.max(start, Math.min(total, start + next))
      saved.current = { validation, done }
      const t = now()
      if (t - shown >= 100 || done === total) {
        shown = t
        setImp((s) => (s.status === 'importing' ? { ...s, done } : s))
      }
      const quarter = Math.floor((done / Math.max(total, 1)) * 4)
      if (quarter > milestone && quarter < 4) {
        milestone = quarter
        announce(words.csvImporting(n(done), n(total)))
      }
    }
    const finish = () => {
      if (!live()) return
      saved.current = { validation, done: total }
      setImp({ status: 'result', result: 'done', imported: total })
      announce(words.csvImported(n(total), noun(total, thing), skipped ? n(skipped) : null))
      focusNext.current = 'result'
    }
    const fail = (error: unknown) => {
      if (!live()) return
      const reason = error instanceof Error && error.message ? error.message : typeof error === 'string' && error ? error : words.csvImportFailedReason
      setImp({ status: 'result', result: 'stopped', imported: done, reason })
      announce(`${words.csvImportFailed(done > 0 ? n(done) : null)}. ${reason}`)
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
      announce(words.csvImportStopped(n(done), noun(done, thing), n(validation.valid - done), skipped ? n(skipped) : null))
      focusNext.current = 'result'
    } else {
      setImp({ status: 'idle' })
      focusNext.current = 'status'
    }
  }
  const importAnother = () => {
    run.current++
    setImp({ status: 'idle' })
    setRejection(null)
    setChecked(null)
    focusNext.current = 'upload'
    setFile(null)
    setStage('upload')
  }

  /* files */
  const addFiles = (files: File[]) => {
    setRejection(null)
    if (files[0]) setFile(files[0])
  }
  const rejectFiles = (rejected: FileUploadRejection[]) => {
    const r = rejected[0]
    if (!r) return
    setRejection({ name: r.file.name, reason: r.reason === 'size' ? r.message : /\.xlsx?$/i.test(r.file.name) ? words.csvExcel : words.csvNotCsv })
  }
  const removeFile = () => setFile(null)
  const retryRead = () => setRetry((r) => r + 1)

  /* what blocks Import */
  const readyCount = validation?.valid ?? 0
  const dup = issues.duplicates.entries().next().value
  const dupField = dup ? fields.find((f) => f.key === dup[1]) : undefined
  let block: CsvBlock | null = null
  if (result) {
    if (dupField) block = { kind: 'duplicate', field: dupField, columns: [...issues.duplicates.keys()].filter((i) => mapping[i] === dupField.key) }
    else if (issues.missing.length) block = { kind: 'missing', fields: issues.missing }
    else if (issues.mapped === 0) block = { kind: 'nothing' }
    else if (fresh && readyCount === 0) block = { kind: 'noneReady' }
  }

  const importing = imp.status === 'importing'
  const finished = imp.status === 'result'
  const resultProps: CsvImportResultProps | null =
    imp.status === 'result' && validation && result
      ? {
          fields,
          mapping,
          validation,
          imported: imp.imported,
          status: imp.result,
          reason: imp.reason,
          onRetry: startImport,
          overLimit,
          noun: thing,
          headers,
          fileName: parse.status === 'ready' ? parse.file.name : undefined,
          delimiter: result.delimiter,
        }
      : null

  return {
    words,
    n,
    noun,
    /** The `noun` prop or the default. */
    thing,
    fields,
    maxRows,
    maxSize,
    templateHref,
    cancelable,
    stage,
    parse,
    rejection,
    parseReason,
    addFiles,
    rejectFiles,
    removeFile,
    retryRead,
    /** Column names (csvHeaders). */
    headers,
    /** Data rows as read (no header row), before maxRows. */
    dataRows,
    overLimit,
    mapping,
    setMapping,
    /** What auto-match picks for these headers. */
    auto,
    /** Duplicates by column index, missing required fields, how many fields are mapped. */
    issues,
    block,
    validation,
    fresh,
    checkFailed,
    recheck: () => setRecheck((r) => r + 1),
    imp,
    importing,
    finished,
    readyCount,
    startImport,
    cancelImport,
    importAnother,
    /** CsvImportResult's props on the result; null before. */
    resultProps,
    said,
    announce,
    focusNext,
  }
}

export type CsvFlow = ReturnType<typeof useCsvFlow>
