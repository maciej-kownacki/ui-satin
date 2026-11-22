import { describe, expect, it, vi } from 'vitest'
import {
  CsvParseError,
  checkCsvValue,
  csvHeaders,
  matchColumns,
  normalizeHeader,
  parseCsv,
  parseCsvDate,
  parseCsvNumber,
  toCsv,
  validateCsv,
  type CsvImportField,
} from '../components/csv-import-parse'

const bytes = (...parts: (string | number[])[]) => {
  const out: number[] = []
  for (const p of parts) out.push(...(typeof p === 'string' ? new TextEncoder().encode(p) : p))
  return new Uint8Array(out)
}

describe('parseCsv', () => {
  it('reads quoted fields, escaped quotes and line breaks inside quotes, with CRLF', async () => {
    const r = await parseCsv('Name,Note\r\n"Nowak, Anna","She said ""hi""\nthen left"\r\nJan,plain\r\n')
    expect(r.delimiter).toBe(',')
    expect(r.records).toEqual([
      ['Name', 'Note'],
      ['Nowak, Anna', 'She said "hi"\nthen left'],
      ['Jan', 'plain'],
    ])
    expect(r.header).toBe(true)
    expect(r.count).toBe(3)
  })

  it('sniffs ; and tab, and honours an Excel sep= line', async () => {
    expect((await parseCsv('a;b;c\n1,5;2;3\n4;5;6')).delimiter).toBe(';')
    expect((await parseCsv('a\tb\n1\t2')).records).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    const sep = await parseCsv('sep=;\na,b;c\n1;2')
    expect(sep.delimiter).toBe(';')
    expect(sep.records[0]).toEqual(['a,b', 'c'])
  })

  it('sniffs past a stray quote that doesn’t start a field', async () => {
    // A quote mid-field is text, as the reader takes it: it must not hide the rest of the file.
    const r = await parseCsv('Screen 12";Price\nTV;100\nRadio;5')
    expect(r.delimiter).toBe(';')
    expect(r.records).toEqual([
      ['Screen 12"', 'Price'],
      ['TV', '100'],
      ['Radio', '5'],
    ])
    // A quote that opens a field and never closes still lets the sniff finish.
    await expect(parseCsv(`a;b\n"${'x;'.repeat(50_000)}`)).rejects.toMatchObject({ code: 'unterminated' })
  })

  it('drops a UTF-8 BOM and decodes UTF-16 by its BOM', async () => {
    const utf8 = await parseCsv(bytes([0xef, 0xbb, 0xbf], 'Imię,Firma\nAnna,Łódź'))
    expect(utf8.encoding).toBe('utf-8')
    expect(utf8.records[0]).toEqual(['Imię', 'Firma'])
    const text = 'a,b\n1,2'
    const le = new Uint8Array(2 + text.length * 2)
    le.set([0xff, 0xfe])
    for (let i = 0; i < text.length; i++) le[2 + i * 2] = text.charCodeAt(i)
    const r = await parseCsv(le)
    expect(r.encoding).toBe('utf-16le')
    expect(r.records).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('falls back to Windows-1250 when the bytes are not UTF-8', async () => {
    // "Miasto\nŁódź" as a Polish Excel saves it: Ł A3, ó F3, ź 9F.
    const r = await parseCsv(bytes('Miasto\n', [0xa3, 0xf3, 0x64, 0x9f]))
    expect(r.encoding).toBe('windows-1250')
    expect(r.records[1]).toEqual(['Łódź'])
  })

  it('reads a File', async () => {
    const r = await parseCsv(new File(['a,b\n1,2\n'], 'x.csv', { type: 'text/csv' }))
    expect(r.records).toHaveLength(2)
  })

  it('rejects an Excel file, a binary one and a quote never closed', async () => {
    await expect(parseCsv(bytes([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).rejects.toMatchObject({ code: 'excel' })
    // An old .xls is an OLE file.
    await expect(parseCsv(bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).rejects.toMatchObject({ code: 'excel' })
    await expect(parseCsv(bytes('a,b', [0], 'c'))).rejects.toMatchObject({ code: 'binary' })
    const open = parseCsv('a,b\n1,"never\n2,3')
    await expect(open).rejects.toBeInstanceOf(CsvParseError)
    await expect(open).rejects.toMatchObject({ code: 'unterminated', row: 2 })
    await expect(parseCsv('\n\n')).rejects.toMatchObject({ code: 'empty' })
  })

  it('leaves out blank rows, trailing ones and ;;; lines', async () => {
    const r = await parseCsv('a;b\n1;2\n;\n\n\n')
    expect(r.records).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('reads 10,000 rows in slices, yielding to the page, and counts past maxRows', async () => {
    const lines = ['Name,Email,Amount']
    for (let i = 0; i < 10_000; i++) lines.push(`"Person ${i}",p${i}@firma.pl,"1 234,50"`)
    const text = lines.join('\n')
    const spy = vi.spyOn(globalThis, 'setTimeout')
    const r = await parseCsv(text)
    expect(r.count).toBe(10_001)
    expect(r.records[10_000]).toEqual(['Person 9999', 'p9999@firma.pl', '1 234,50'])
    // Under a slow clock every slice runs out: the parse must hand the page a turn.
    let t = 0
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => (t += 5))
    spy.mockClear()
    const limited = await parseCsv(text, { maxRows: 100 })
    expect(spy.mock.calls.some(([, ms]) => ms === 0)).toBe(true)
    expect(limited.records).toHaveLength(101)
    expect(limited.count).toBe(10_001)
    clock.mockRestore()
    spy.mockRestore()
  })

  it('stops when aborted', async () => {
    const ac = new AbortController()
    ac.abort()
    await expect(parseCsv('a,b', { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('csvHeaders', () => {
  it('names empty and repeated headers by their place', async () => {
    const r = await parseCsv('Name,,Email,email\n1,2,3,4,5')
    expect(csvHeaders(r, true)).toEqual(['Name', 'Column 2', 'Email', 'Column 4', 'Column 5'])
    expect(csvHeaders(r, false, (n) => `Kolumna ${n}`)).toEqual(['Kolumna 1', 'Kolumna 2', 'Kolumna 3', 'Kolumna 4', 'Kolumna 5'])
  })

  it('takes a first row of numbers for data, not headers', async () => {
    expect((await parseCsv('1,2\n3,4')).header).toBe(false)
    expect((await parseCsv('Name,Email\nAnna,anna@firma.pl')).header).toBe(true)
  })
})

describe('matchColumns', () => {
  const fields: CsvImportField[] = [
    { key: 'name', label: 'Name', aliases: ['Imie i nazwisko', 'Full name'] },
    { key: 'email', label: 'Email' },
    { key: 'company', label: 'Company', aliases: ['Firma', 'Company name'] },
    { key: 'phone', label: 'Phone', aliases: ['Telefon'] },
  ]

  it('ignores case, diacritics, spaces, - and _', () => {
    expect(normalizeHeader('Imię i nazwisko')).toBe('imieinazwisko')
    expect(normalizeHeader('Źródło_leadu')).toBe('zrodloleadu')
    expect(normalizeHeader('Łódź')).toBe('lodz')
    expect(matchColumns(['Imię i nazwisko', 'E-mail', 'Firma', 'Telefon', 'Źródło'], fields)).toEqual({
      0: 'name',
      1: 'email',
      2: 'company',
      3: 'phone',
      4: null,
    })
  })

  it('matches keys and labels before aliases, and gives a field to its first column', () => {
    // "Company name" is an alias of company, but "company" is its key: the key wins the field.
    expect(matchColumns(['Company name', 'company'], fields)).toEqual({ 0: null, 1: 'company' })
    expect(matchColumns(['Email', 'e_mail'], fields)).toEqual({ 0: 'email', 1: null })
  })
})

describe('values', () => {
  it('reads numbers as the locale writes them', () => {
    expect(parseCsvNumber('1 234,50', 'pl-PL')).toBe('1234.5')
    expect(parseCsvNumber('1 234,50', 'pl-PL')).toBe('1234.5')
    expect(parseCsvNumber('-12,5', 'pl-PL')).toBe('-12.5')
    expect(parseCsvNumber('1,234.50', 'pl-PL')).toBeNull()
    expect(parseCsvNumber('1,234.50', 'en-US')).toBe('1234.5')
    expect(parseCsvNumber('1 234.50', 'en-US')).toBe('1234.5')
    expect(parseCsvNumber('1234,50', 'en-US')).toBeNull()
    expect(parseCsvNumber('12a', 'en-US')).toBeNull()
  })

  it('keeps every digit of a number, never going through a float', () => {
    expect(parseCsvNumber('12345678901234567890', 'en-US')).toBe('12345678901234567890')
    expect(parseCsvNumber('0.1000000000000000055511', 'en-US')).toBe('0.1000000000000000055511')
    expect(parseCsvNumber('1,234.5000', 'en-US')).toBe('1234.5')
    expect(parseCsvNumber('.5', 'en-US')).toBe('0.5')
    expect(parseCsvNumber('-,5', 'pl-PL')).toBe('-0.5')
    expect(parseCsvNumber('+007', 'en-US')).toBe('7')
    expect(parseCsvNumber('-0,00', 'pl-PL')).toBe('0')
    expect(parseCsvNumber('10', 'en-US')).toBe('10')
    expect(parseCsvNumber('.', 'en-US')).toBeNull()
    expect(parseCsvNumber('-', 'en-US')).toBeNull()
  })

  it('reads dates as dd.mm.yyyy, yyyy-mm-dd or the field’s format', () => {
    expect(parseCsvDate('03.11.2026')).toBe('2026-11-03')
    expect(parseCsvDate('3.1.2026')).toBe('2026-01-03')
    expect(parseCsvDate('2026-11-03')).toBe('2026-11-03')
    expect(parseCsvDate('11/03/2026', 'mm/dd/yyyy')).toBe('2026-11-03')
    expect(parseCsvDate('31.02.2026')).toBeNull()
    expect(parseCsvDate('11/03/2026')).toBeNull()
  })

  it('checks enums against labels and values, ignoring case', () => {
    const stage: CsvImportField = { key: 'stage', label: 'Stage', type: 'enum', options: [{ value: 'screen', label: 'Phone screen' }] }
    expect(checkCsvValue(stage, 'PHONE SCREEN')).toEqual({ value: 'screen' })
    expect(checkCsvValue(stage, 'Screen')).toEqual({ value: 'screen' })
    expect(checkCsvValue(stage, 'Offer')).toEqual({ error: { code: 'enum' } })
    expect(checkCsvValue(stage, '')).toEqual({ value: '' })
    expect(checkCsvValue({ ...stage, required: true }, ' ')).toEqual({ error: { code: 'required' } })
    expect(checkCsvValue({ key: 'e', label: 'E', type: 'email' }, 'jan@firma')).toEqual({ error: { code: 'email' } })
  })

  it('validates rows: built-in checks, then the field’s own, and counts errors by field', async () => {
    const fields: CsvImportField[] = [
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'amount', label: 'Amount', type: 'number', validate: (v) => (Number(v) > 1000 ? 'Too much' : null) },
    ]
    const records = [
      ['E-mail', 'Kwota'],
      ['anna@firma.pl', '12,5'],
      ['jan@firma', '1'],
      ['ola@firma.pl', '2 000'],
    ]
    const v = await validateCsv(records, { 0: 'email', 1: 'amount' }, fields, { header: true, locale: 'pl-PL' })
    expect(v.valid).toBe(1)
    expect(v.rows[0]).toMatchObject({ n: 1, values: { email: 'anna@firma.pl', amount: '12.5' }, errors: null })
    expect(v.rows[1].errors).toEqual({ email: { code: 'email' } })
    expect(v.rows[2].errors).toEqual({ amount: { code: 'custom', message: 'Too much' } })
    expect(v.errorCounts).toEqual([
      { key: 'email', count: 1 },
      { key: 'amount', count: 1 },
    ])
  })
})

describe('a validate that throws', () => {
  it('marks the cell with what it threw, and carries on', async () => {
    const fields: CsvImportField[] = [
      {
        key: 'code',
        label: 'Code',
        validate: (v) => {
          if (v === 'boom') throw new Error('Lookup failed')
          if (v === 'bare') throw 42
          return null
        },
      },
    ]
    const v = await validateCsv([['boom'], ['bare'], ['ok']], { 0: 'code' }, fields, { header: false })
    expect(v.rows.map((r) => r.errors)).toEqual([{ code: { code: 'custom', message: 'Lookup failed' } }, { code: { code: 'invalid' } }, null])
    expect(v.valid).toBe(1)
  })
})

describe('toCsv', () => {
  it('quotes what needs it and puts a BOM first on request', () => {
    expect(toCsv([['a', 'b;c', 'say "hi"', 'x\ny']], { delimiter: ';', bom: true })).toBe('﻿a;"b;c";"say ""hi""";"x\ny"\r\n')
    expect(toCsv([['a', 'b;c']])).toBe('a,b;c\r\n')
  })
})
