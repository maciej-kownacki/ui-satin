'use client'

/**
 * The plain functions under CsvImport, for an app that reads, maps or checks a CSV file of its
 * own: `parseCsv` (bytes to records), `matchColumns` (headers to fields), `checkCsvValue` and
 * `validateCsv` (the built-in checks per field type), `parseCsvNumber`, `parseCsvDate` and
 * `toCsv`. No React in them; the entry is still `'use client'` like every Satin entry, so call
 * them from client code, not from a Server Component.
 */

/* ---------- types ---------- */

export type CsvFieldType = 'text' | 'email' | 'number' | 'date' | 'enum'

export interface CsvImportField {
  /** The key each imported row has this value under. */
  key: string
  label: string
  /** A column has to map to it before Next, and every row needs a value in it. */
  required?: boolean
  /** The built-in check, and the shape the value is handed on in. Defaults to `text`. */
  type?: CsvFieldType
  /** Other header names that auto-match this field ("Firma", "Company name"). */
  aliases?: string[]
  /** For `enum`: a cell matches an option's label or value, ignoring case, and imports as its value. */
  options?: { value: string; label: string }[]
  /** For `date`: one more format besides dd.mm.yyyy and yyyy-mm-dd, in `dd`, `mm` and `yyyy` ("mm/dd/yyyy"). */
  dateFormat?: string
  /**
   * Runs after the built-in check passes, with the value as it will be imported (a date as
   * yyyy-mm-dd, a number as "1234.5") and the row's values by field key. Return the reason the
   * value is wrong, or null. If it throws, the cell is invalid with the thrown message.
   */
  validate?: (value: string, row: Record<string, string>) => string | null
}

/** Column index → field key, or null to skip. Keyed by index because headers can repeat or be empty. */
export type CsvMapping = Record<number, string | null>

export type CsvDelimiter = ',' | ';' | '\t'
export type CsvEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1250'

export interface CsvParseResult {
  /** Every non-blank record as read, the header row (if any) included; past `maxRows`, no more are kept. */
  records: string[][]
  /** How many non-blank records the file has, the header row included, kept or not. */
  count: number
  /** Whether the first record looks like a header row. */
  header: boolean
  delimiter: CsvDelimiter
  encoding: CsvEncoding
}

export type CsvParseErrorCode = 'excel' | 'binary' | 'unterminated' | 'empty'

/** Why a file can't be read: `excel` (an .xlsx or an old .xls, even renamed), `binary`, `unterminated` (a quote never closed), `empty`. */
export class CsvParseError extends Error {
  code: CsvParseErrorCode
  /** For `unterminated`: the record (from 1) where the open quote starts. */
  row?: number
  constructor(code: CsvParseErrorCode, message: string, row?: number) {
    super(message)
    this.name = 'CsvParseError'
    this.code = code
    this.row = row
  }
}

export interface CsvParseOptions {
  /** Data rows to keep (the header row aside). The rest are still counted. */
  maxRows?: number
  /** Stops the work; the promise rejects with an AbortError. */
  signal?: AbortSignal
  /** The records read so far, at most ten times a second. */
  onProgress?: (records: number) => void
}

/* ---------- working in slices ---------- */

/** How long one slice of work may run before it gives the page a turn, ms. */
const SLICE_MS = 8

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const abortError = () =>
  typeof DOMException === 'function' ? new DOMException('The operation was aborted.', 'AbortError') : Object.assign(new Error('Aborted'), { name: 'AbortError' })

/** True for the error an aborted parseCsv or validateCsv rejects with. */
export const isAbortError = (error: unknown) => error instanceof Error && error.name === 'AbortError'

/** @internal A piece of work done in slices: `advance` runs until the deadline and says whether it finished. */
export interface CsvJob<T> {
  advance: (deadline: number) => boolean
  result: () => T
  progress: () => number
}

/** Runs a job a slice at a time, yielding with setTimeout(0) between slices, so the page stays responsive. */
async function drive<T>(job: CsvJob<T>, signal?: AbortSignal, onProgress?: (n: number) => void): Promise<T> {
  let said = 0
  for (;;) {
    if (signal?.aborted) throw abortError()
    if (job.advance(now() + SLICE_MS)) break
    const t = now()
    if (onProgress && t - said >= 100) {
      said = t
      onProgress(job.progress())
    }
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  if (signal?.aborted) throw abortError()
  return job.result()
}

/** @internal Runs a CsvJob to the end in slices; CsvImport uses it after the first slice. */
export const runCsvJob = <T,>(job: CsvJob<T>, signal?: AbortSignal) => drive(job, signal)

/* ---------- bytes to text ---------- */

async function bytesOf(input: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (typeof input.arrayBuffer === 'function') return new Uint8Array(await input.arrayBuffer())
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(input)
  })
}

/** The text of a CSV file: UTF-16 by its BOM, else UTF-8 (BOM dropped), else Windows-1250 (a Polish Excel export). */
function decode(bytes: Uint8Array): { text: string; encoding: CsvEncoding } {
  // PK\x03\x04: a zip, which is what an .xlsx is, whatever its name says.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    throw new CsvParseError('excel', 'Excel files aren’t supported. Save it as CSV and try again.')
  }
  // D0 CF 11 E0: an OLE file, which is what an old .xls is.
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new CsvParseError('excel', 'Excel files aren’t supported. Save it as CSV and try again.')
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder('utf-16le').decode(bytes), encoding: 'utf-16le' }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder('utf-16be').decode(bytes), encoding: 'utf-16be' }
  if (bytes.includes(0)) throw new CsvParseError('binary', 'This isn’t a text file.')
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' }
  } catch {
    return { text: new TextDecoder('windows-1250').decode(bytes), encoding: 'windows-1250' }
  }
}

/* ---------- the separator ---------- */

const DELIMITERS: CsvDelimiter[] = [',', ';', '\t']

/** Characters the sniff reads at most, so a quote that never closes can't make it read the whole file. */
const SNIFF_CHARS = 64 * 1024

/**
 * The separator, from Excel's `sep=;` line or else from the first ten lines: per candidate,
 * how often it appears outside quotes on each line. One that appears the same number of times
 * on every line wins over one that doesn't; among those, the most frequent. Like the reader, a
 * quote opens only at a field's start (after a line break or any candidate), so a stray
 * `12" monitor` stays text.
 */
function sniff(text: string, start: number): CsvDelimiter {
  const counts: Record<string, number[]> = { ',': [0], ';': [0], '\t': [0] }
  let quoted = false
  let fieldStart = true
  let lines = 0
  const end = Math.min(text.length, start + SNIFF_CHARS)
  for (let i = start; i < end && lines < 10; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') i++
        else quoted = false
      }
    } else if (c === '"' && fieldStart) {
      quoted = true
      fieldStart = false
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      lines++
      fieldStart = true
      for (const d of DELIMITERS) counts[d].push(0)
    } else if (c in counts) {
      counts[c][counts[c].length - 1]++
      fieldStart = true
    } else fieldStart = false
  }
  let best: CsvDelimiter = ','
  let bestScore = -1
  for (const d of DELIMITERS) {
    // A last line cut off by the tenth, or an empty trailing one, doesn't count.
    const per = counts[d].filter((n, i, all) => i < all.length - 1 || n > 0)
    if (per.length === 0) continue
    const min = Math.min(...per)
    const max = Math.max(...per)
    if (max === 0) continue
    const score = (min === max ? 1_000_000 : 0) + min * 1000 + max
    if (score > bestScore) {
      best = d
      bestScore = score
    }
  }
  return best
}

/* ---------- records ---------- */

const NUMBERISH = /^[+\-−]?[\d\s.,]*\d[\d\s.,]*%?$/
const DATEISH = /^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A first row that is all distinct, non-empty text (no numbers, dates or emails) reads as headers. */
function looksLikeHeader(first: string[] | undefined) {
  if (!first || first.length === 0) return false
  const seen = new Set<string>()
  for (const raw of first) {
    const v = raw.trim()
    if (!v || NUMBERISH.test(v) || DATEISH.test(v) || EMAIL.test(v)) return false
    const k = v.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
  }
  return true
}

const isBlank = (record: string[]) => record.every((v) => v.trim() === '')

/** The RFC 4180 reader as a job: quoted fields, "" inside quotes, line breaks in quotes, CRLF or LF. */
function recordsJob(text: string, start: number, delimiter: string, keep: number): CsvJob<{ records: string[][]; count: number }> {
  const records: string[][] = []
  let count = 0
  let i = start
  let field = ''
  let record: string[] = []
  let quoted = false
  let quoteStart = 0
  let fieldStart = true

  const endRecord = () => {
    record.push(field)
    field = ''
    fieldStart = true
    if (!isBlank(record)) {
      count++
      if (records.length < keep) records.push(record)
    }
    record = []
  }

  return {
    advance(deadline) {
      const n = text.length
      while (i < n) {
        // Look at the clock every 2048 characters, not on every one.
        const stop = Math.min(n, i + 2048)
        for (; i < stop; i++) {
          const c = text[i]
          if (quoted) {
            if (c === '"') {
              if (text[i + 1] === '"') {
                field += '"'
                i++
              } else quoted = false
            } else field += c
          } else if (c === '"' && fieldStart) {
            quoted = true
            quoteStart = count + 1
            fieldStart = false
          } else if (c === delimiter) {
            record.push(field)
            field = ''
            fieldStart = true
          } else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++
            endRecord()
          } else {
            field += c
            fieldStart = false
          }
        }
        if (i < n && now() >= deadline) return false
      }
      if (quoted) throw new CsvParseError('unterminated', `A quote opened in row ${quoteStart} is never closed.`, quoteStart)
      if (field !== '' || record.length > 0) endRecord()
      return true
    },
    result: () => ({ records, count }),
    progress: () => count,
  }
}

/**
 * Reads a CSV file: the encoding (UTF-8 with or without a BOM, UTF-16 by its BOM, Windows-1250
 * when UTF-8 fails), the separator (`,` `;` or tab, or Excel's `sep=` line), quoted fields with
 * "" and line breaks inside, CRLF or LF. Blank rows are left out. It works in slices of 8 ms
 * with a setTimeout between them, so 10,000 rows never hold the page. Rejects with a
 * CsvParseError for an Excel file, a binary file, a quote never closed or a file with no rows;
 * with an AbortError when `signal` aborts.
 */
export async function parseCsv(input: Blob | ArrayBuffer | Uint8Array | string, options: CsvParseOptions = {}): Promise<CsvParseResult> {
  const { maxRows, signal, onProgress } = options
  if (signal?.aborted) throw abortError()
  let text: string
  let encoding: CsvEncoding = 'utf-8'
  if (typeof input === 'string') text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  else {
    const bytes = await bytesOf(input)
    if (signal?.aborted) throw abortError()
    ;({ text, encoding } = decode(bytes))
  }

  let start = 0
  let delimiter: CsvDelimiter | undefined
  const sep = /^sep=(.)\r?\n/i.exec(text.slice(0, 8))
  if (sep) {
    const d = sep[1] === 't' ? '\t' : sep[1]
    if (d === ',' || d === ';' || d === '\t') delimiter = d
    start = sep[0].length
  }
  delimiter ??= sniff(text, start)

  // The header row may be the first record, so keep one more than maxRows.
  const keep = maxRows != null ? maxRows + 1 : Infinity
  const { records, count } = await drive(recordsJob(text, start, delimiter, keep), signal, onProgress)
  if (count === 0) throw new CsvParseError('empty', 'The file has no rows.')
  return { records, count, header: looksLikeHeader(records[0]), delimiter, encoding }
}

/**
 * The column names: the first record's cells when it is a header row, each empty or repeated
 * one named by `columnLabel` ("Column 3"); without a header, every column so. As many as the
 * widest record.
 */
export function csvHeaders(result: Pick<CsvParseResult, 'records'>, header: boolean, columnLabel: (n: number) => string = (n) => `Column ${n}`) {
  let width = 0
  for (const r of result.records) if (r.length > width) width = r.length
  const first = header ? (result.records[0] ?? []) : []
  const seen = new Set<string>()
  return Array.from({ length: width }, (_, i) => {
    const name = (first[i] ?? '').trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) return columnLabel(i + 1)
    seen.add(key)
    return name
  })
}

/* ---------- matching ---------- */

/** A header as matching sees it: no diacritics (ł too), lower case, no spaces, dashes or underscores. */
export function normalizeHeader(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[łŁ]/g, 'l')
    .toLowerCase()
    .replace(/[\s\-_]+/g, '')
}

/**
 * Maps each column to a field by its header: first an exact match on the field's key or label,
 * then on its aliases, all compared through `normalizeHeader` ("E-mail" is email, "Imię i
 * nazwisko" matches an alias "Imie i nazwisko"). A field goes to the first column that matches
 * it; the other columns map to null.
 */
export function matchColumns(headers: string[], fields: CsvImportField[]): CsvMapping {
  const mapping: CsvMapping = {}
  const taken = new Set<string>()
  const keys = headers.map(normalizeHeader)
  headers.forEach((_, i) => (mapping[i] = null))
  const pass = (names: (f: CsvImportField) => string[]) => {
    keys.forEach((k, i) => {
      if (mapping[i] != null || !k) return
      const field = fields.find((f) => !taken.has(f.key) && names(f).some((n) => normalizeHeader(n) === k))
      if (field) {
        mapping[i] = field.key
        taken.add(field.key)
      }
    })
  }
  pass((f) => [f.key, f.label])
  pass((f) => f.aliases ?? [])
  return mapping
}

/* ---------- values ---------- */

const separatorsCache = new Map<string, { group: string; decimal: string }>()
/** The locale's group and decimal marks, from 1234567.5 written in it. */
function separatorsOf(locale: string) {
  let s = separatorsCache.get(locale)
  if (!s) {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5)
    s = { group: parts.find((p) => p.type === 'group')?.value ?? ',', decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.' }
    separatorsCache.set(locale, s)
  }
  return s
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A number as `locale` writes it ("1 234,50" in pl-PL, "1,234.50" in en-US), as a plain decimal
 * string ("1234.5"), or null when it isn't one. Any space (also no-break and narrow no-break)
 * groups digits; the locale's group mark only between groups of three. The digits are kept as
 * written, never through a float, so a 20-digit id or a long fraction loses nothing; leading
 * zeros, trailing fraction zeros and a `+` are dropped, and ",5" reads as "0.5".
 */
export function parseCsvNumber(raw: string, locale = 'en-US'): string | null {
  const { group, decimal } = separatorsOf(locale)
  const v = raw.trim().replace(/−/g, '-').replace(/\s/g, '')
  if (!v) return null
  const g = /\s/.test(group) ? '' : escapeRe(group)
  const d = escapeRe(decimal)
  const grouped = g ? `\\d{1,3}(?:${g}\\d{3})+` : '(?!)'
  const re = new RegExp(`^([+-]?)(\\d+|${grouped})?(?:${d}(\\d+))?$`)
  const m = re.exec(v)
  if (!m || (m[2] == null && m[3] == null)) return null
  const whole = (g && m[2] ? m[2].replace(new RegExp(g, 'g'), '') : (m[2] ?? '')).replace(/^0+/, '') || '0'
  const fraction = (m[3] ?? '').replace(/0+$/, '')
  const sign = m[1] === '-' && (whole !== '0' || fraction) ? '-' : ''
  return `${sign}${whole}${fraction ? `.${fraction}` : ''}`
}

const formatCache = new Map<string, RegExp>()
function dateRe(format: string) {
  let re = formatCache.get(format)
  if (!re) {
    const order: string[] = []
    const source = format.replace(/yyyy|dd|mm|[^dmy]+|[dmy]/gi, (t) => {
      const k = t.toLowerCase()
      if (k === 'yyyy' || k === 'dd' || k === 'mm') {
        order.push(k)
        return k === 'yyyy' ? '(\\d{4})' : '(\\d{1,2})'
      }
      return escapeRe(t)
    })
    re = new RegExp(`^${source}$`)
    ;(re as RegExp & { order?: string[] }).order = order
    formatCache.set(format, re)
  }
  return re as RegExp & { order?: string[] }
}

/** A date in dd.mm.yyyy, yyyy-mm-dd or `format` (`dd`, `mm`, `yyyy`), as yyyy-mm-dd, or null. */
export function parseCsvDate(raw: string, format?: string): string | null {
  const v = raw.trim()
  for (const f of format ? [format, 'dd.mm.yyyy', 'yyyy-mm-dd'] : ['dd.mm.yyyy', 'yyyy-mm-dd']) {
    const re = dateRe(f)
    const m = re.exec(v)
    if (!m || !re.order || re.order.length !== 3) continue
    const parts: Record<string, number> = {}
    re.order.forEach((k, i) => (parts[k] = Number(m[i + 1])))
    const { yyyy: y, mm: mo, dd: d } = parts
    const date = new Date(Date.UTC(y, mo - 1, d))
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) continue
    return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return null
}

/**
 * What is wrong with a value: a built-in check's code, `custom` with the reason `field.validate`
 * returned (or the message of what it threw), or `invalid` when it threw with no message.
 */
export type CsvValueError = { code: 'required' | 'email' | 'number' | 'date' | 'enum' | 'invalid' } | { code: 'custom'; message: string }

/**
 * The built-in check for one value (required, then the type's): the value as it will be
 * imported (`value`: text trimmed, a number "1234.5", a date yyyy-mm-dd, an enum its option's
 * value), or what is wrong. An empty value passes unless the field is required. `field.validate`
 * is not run here (it needs the whole row; validateCsv runs it).
 */
export function checkCsvValue(field: CsvImportField, raw: string, locale = 'en-US'): { value: string; error?: undefined } | { value?: undefined; error: CsvValueError } {
  const v = (raw ?? '').trim()
  if (!v) return field.required ? { error: { code: 'required' } } : { value: '' }
  switch (field.type ?? 'text') {
    case 'email':
      return EMAIL.test(v) ? { value: v } : { error: { code: 'email' } }
    case 'number': {
      const n = parseCsvNumber(v, locale)
      return n != null ? { value: n } : { error: { code: 'number' } }
    }
    case 'date': {
      const d = parseCsvDate(v, field.dateFormat)
      return d != null ? { value: d } : { error: { code: 'date' } }
    }
    case 'enum': {
      if (!field.options?.length) return { value: v }
      const k = v.toLocaleLowerCase(locale)
      const option = field.options.find((o) => o.value.toLocaleLowerCase(locale) === k || o.label.toLocaleLowerCase(locale) === k)
      return option ? { value: option.value } : { error: { code: 'enum' } }
    }
    default:
      return { value: v }
  }
}

/* ---------- checking every row ---------- */

export interface CsvCheckedRow {
  /** The row's number among the data rows, from 1. */
  n: number
  /** The record as read. */
  source: string[]
  /** The values as they will be imported, by field key. A field whose check failed keeps its trimmed text. */
  values: Record<string, string>
  /** What is wrong, by field key; null when the row is valid. */
  errors: Record<string, CsvValueError> | null
}

export interface CsvValidation {
  rows: CsvCheckedRow[]
  /** How many rows are valid. */
  valid: number
  /** Invalid cells per field key, in the fields' order. */
  errorCounts: { key: string; count: number }[]
}

export interface CsvValidateOptions {
  /** Whether the first record is the header row (left out of the rows). */
  header: boolean
  /** How numbers are written. Defaults to en-US. */
  locale?: string
  /** Data rows to check; past it, rows are left out (they are neither imported nor reported as skipped). */
  maxRows?: number
  signal?: AbortSignal
}

/** @internal The check of every row as a job in slices; validateCsv drives it, CsvImport runs its first slice at once. */
export function validationJob(records: string[][], mapping: CsvMapping, fields: CsvImportField[], options: Omit<CsvValidateOptions, 'signal'>): CsvJob<CsvValidation> {
  const { header, locale = 'en-US', maxRows } = options
  const used = Object.entries(mapping)
    .filter(([, key]) => key != null)
    .map(([index, key]) => ({ index: Number(index), field: fields.find((f) => f.key === key) }))
    .filter((u): u is { index: number; field: CsvImportField } => !!u.field)
  // Required fields with no column still need their value: every row is then missing it.
  const missing = fields.filter((f) => f.required && !used.some((u) => u.field.key === f.key))
  const first = header ? 1 : 0
  const end = Math.min(records.length, maxRows != null ? first + maxRows : Infinity)
  const rows: CsvCheckedRow[] = []
  const counts = new Map<string, number>()
  let valid = 0
  let i = first
  return {
    advance(deadline) {
      while (i < end) {
        const stop = Math.min(end, i + 200)
        for (; i < stop; i++) {
          const source = records[i]
          const values: Record<string, string> = {}
          let errors: Record<string, CsvValueError> | null = null
          for (const { index, field } of used) {
            const checked = checkCsvValue(field, source[index] ?? '', locale)
            if (checked.error) {
              values[field.key] = (source[index] ?? '').trim()
              ;(errors ??= {})[field.key] = checked.error
            } else values[field.key] = checked.value
          }
          for (const field of missing) (errors ??= {})[field.key] = { code: 'required' }
          for (const { field } of used) {
            if (!field.validate || errors?.[field.key]) continue
            let message: string | null
            try {
              message = field.validate(values[field.key], values)
            } catch (error) {
              // An app's validate that throws marks the cell, never stops the check.
              const thrown = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
              ;(errors ??= {})[field.key] = thrown ? { code: 'custom', message: thrown } : { code: 'invalid' }
              continue
            }
            if (message) (errors ??= {})[field.key] = { code: 'custom', message }
          }
          if (errors) for (const key of Object.keys(errors)) counts.set(key, (counts.get(key) ?? 0) + 1)
          else valid++
          rows.push({ n: i - first + 1, source, values, errors })
        }
        if (i < end && now() >= deadline) return false
      }
      return true
    },
    result: () => ({
      rows,
      valid,
      errorCounts: fields.filter((f) => counts.has(f.key)).map((f) => ({ key: f.key, count: counts.get(f.key)! })),
    }),
    progress: () => i - first,
  }
}

/**
 * Checks every data row against the mapped fields: required, the type's check, then
 * `field.validate`. In slices like parseCsv, so 10,000 rows (and an app's own validate) never
 * hold the page.
 */
export function validateCsv(records: string[][], mapping: CsvMapping, fields: CsvImportField[], options: CsvValidateOptions): Promise<CsvValidation> {
  const { signal, ...rest } = options
  return drive(validationJob(records, mapping, fields, rest), signal)
}

/* ---------- writing ---------- */

/**
 * Rows as CSV text: fields with the separator, a quote or a line break are quoted (quotes
 * doubled), lines end in CRLF. `bom` puts a UTF-8 BOM first, which Excel needs to read
 * diacritics right.
 */
export function toCsv(rows: string[][], { delimiter = ',', bom = false }: { delimiter?: CsvDelimiter; bom?: boolean } = {}) {
  const needs = new RegExp(`["\\r\\n${delimiter === '\t' ? '\\t' : escapeRe(delimiter)}]`)
  const body = rows.map((r) => r.map((v) => (needs.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(delimiter)).join('\r\n')
  return `${bom ? '﻿' : ''}${body}\r\n`
}
