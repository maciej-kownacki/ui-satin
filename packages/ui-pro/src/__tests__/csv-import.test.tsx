import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { CsvImport, CsvImportPreview, type CsvImportField, type CsvImportProps } from '../components/csv-import'
import { validateCsv } from '../components/csv-import-parse'

const fields: CsvImportField[] = [
  { key: 'name', label: 'Name', required: true, aliases: ['Imie i nazwisko'] },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'company', label: 'Company', required: true, aliases: ['Firma'] },
  { key: 'phone', label: 'Phone', aliases: ['Telefon'] },
  { key: 'value', label: 'Value', type: 'number' },
]

const leads = [
  'Imię i nazwisko;E-mail;Firma;Telefon;Źródło;Wartość',
  'Anna Nowak;anna@firma.pl;Nowak Sp. z o.o.;+48 600 100 200;Targi Poznań;1 234,50',
  'Jan Kowalski;jan@firma;Kowalski SA;+48 500 200 300;Targi Poznań;10',
  ' Ola Wiśniewska ;ola@firma.pl;Wiśnia;;Polecenie;',
  'Piotr Zieliński;piotr@firma.pl;Zieliński i syn;;Strona;7',
].join('\r\n')

const csv = (text: string, name = 'leads.csv') => new File([text], name, { type: 'text/csv' })

const noun = { one: 'lead', other: 'leads' }

function renderImport(props: Partial<CsvImportProps> = {}, labels?: Record<string, unknown>) {
  const onImport = props.onImport ?? vi.fn()
  const view = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={onImport} defaultStep="map" file={csv(leads)} {...props} />, {
    labels: { dateLocale: 'pl-PL', ...labels },
  })
  return { ...view, onImport }
}

const mapsTo = (column: string) => screen.findByRole('combobox', { name: `Maps to, CSV column ${column}` })
/** The step's content, away from the live region that repeats some of it. */
const part = () => within(document.querySelector<HTMLElement>('[data-slot="csv-import-step"]')!)
const said = () => document.querySelector('[aria-live="polite"]')?.textContent
const footerButton = (name: string | RegExp) => screen.getByRole('button', { name })

describe('CsvImportPreview', () => {
  it('jumps to the page of the first error in the list shown, with errorsOnly kept off', async () => {
    const own: CsvImportField[] = [{ key: 'email', label: 'Email', type: 'email' }]
    const records = Array.from({ length: 150 }, (_, i) => [i === 129 ? 'broken' : `p${i}@firma.pl`])
    const validation = await validateCsv(records, { 0: 'email' }, own, { header: false })
    const { user } = renderWithSatin(<CsvImportPreview fields={own} mapping={{ 0: 'email' }} validation={validation} errorsOnly={false} />)
    await user.click(screen.getByRole('button', { name: 'Email: 1 invalid' }))
    const cell = document.activeElement as HTMLElement
    expect(cell.getAttribute('data-csv-cell')).toBe('130:email')
    // Page 2 of the full list: rows 101 to 150.
    expect(screen.queryByText('p0@firma.pl')).toBeNull()
    expect(screen.getByText('p100@firma.pl')).toBeTruthy()
  })
})

describe('CsvImport', () => {
  it('reads an uploaded file, auto-matches its columns and moves to Map columns', async () => {
    const onStepChange = vi.fn()
    const onMappingChange = vi.fn()
    const { user, container } = renderWithSatin(<CsvImport fields={fields} onImport={vi.fn()} onStepChange={onStepChange} onMappingChange={onMappingChange} />)
    expect(screen.getByText('Choose a CSV file to continue')).toBeTruthy()
    expect(footerButton('Next').getAttribute('aria-disabled')).toBe('true')
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, csv(leads))
    const firma = await mapsTo('Firma')
    expect(onStepChange).toHaveBeenLastCalledWith('map')
    expect(firma.textContent).toContain('Company')
    expect((await mapsTo('E-mail')).textContent).toContain('Email')
    expect((await mapsTo('Imię i nazwisko')).textContent).toContain('Name')
    expect((await mapsTo('Źródło')).textContent).toContain('Don’t import')
    expect(onMappingChange).toHaveBeenLastCalledWith({ 0: 'name', 1: 'email', 2: 'company', 3: 'phone', 4: null, 5: null })
    expect(screen.getAllByText('Auto-matched')).toHaveLength(4)
    // Focus went to the first mapping.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Maps to, CSV column Imię i nazwisko' })))
  })

  it('reads the file once under StrictMode, the aborted first run showing nothing', async () => {
    renderWithSatin(
      <React.StrictMode>
        <CsvImport fields={fields} noun={noun} onImport={vi.fn()} defaultStep="map" file={csv(leads)} />
      </React.StrictMode>,
    )
    expect((await mapsTo('Firma')).textContent).toContain('Company')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('turns away an Excel file renamed .csv, with its reason', async () => {
    const xlsx = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0])], 'leads.csv', { type: 'text/csv' })
    renderImport({ file: xlsx, defaultStep: 'upload' })
    expect(await part().findByText('Excel files aren’t supported. Save it as CSV and try again.')).toBeTruthy()
    expect(part().getByText('leads.csv couldn’t be read')).toBeTruthy()
    expect(said()).toBe('Excel files aren’t supported. Save it as CSV and try again.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('blocks Next while a required field has no column, and says why', async () => {
    const { user } = renderImport({ file: csv('E-mail;Telefon\nanna@firma.pl;1') })
    await mapsTo('E-mail')
    const next = footerButton('Next')
    expect(next.getAttribute('aria-disabled')).toBe('true')
    const reason = screen.getByText('Map a column to Name')
    expect(next.getAttribute('aria-describedby')).toBe(reason.id)
    expect(screen.getByText('Name is required: map a column to it')).toBeTruthy()
    expect(screen.getByText('Company is required: map a column to it')).toBeTruthy()
    await user.click(next)
    expect(screen.getByRole('combobox', { name: 'Maps to, CSV column E-mail' })).toBeTruthy()
    expect(screen.queryByText(/ready/)).toBeNull()
  })

  it('marks a field mapped twice on the second column and blocks Next', async () => {
    const { user } = renderImport()
    const phone = await mapsTo('Telefon')
    await user.click(phone)
    await user.click(await screen.findByRole('option', { name: 'Email' }))
    expect(screen.getByText('Email is already mapped')).toBeTruthy()
    expect(screen.getByText('Email is mapped to two columns')).toBeTruthy()
    expect(footerButton('Next').getAttribute('aria-disabled')).toBe('true')
    expect(phone.getAttribute('aria-invalid')).toBe('true')
  })

  it('imports nothing before the click, then only the valid rows, normalised', async () => {
    const onImport = vi.fn()
    const { user } = renderImport({ onImport, defaultMapping: { 5: 'value' } })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    expect(await screen.findByText('4 rows · 3 ready · 1 with errors')).toBeTruthy()
    expect(screen.getByText('1 row won’t be imported')).toBeTruthy()
    expect(onImport).not.toHaveBeenCalled()
    // Focus is on the errors.
    await waitFor(() => expect(document.activeElement?.getAttribute('data-csv-focus')).toBe('errors'))
    await user.click(screen.getByRole('button', { name: 'Import 3 leads' }))
    expect(onImport).toHaveBeenCalledTimes(1)
    expect(onImport.mock.calls[0][0]).toEqual([
      { name: 'Anna Nowak', email: 'anna@firma.pl', company: 'Nowak Sp. z o.o.', phone: '+48 600 100 200', value: '1234.5' },
      { name: 'Ola Wiśniewska', email: 'ola@firma.pl', company: 'Wiśnia', phone: '', value: '' },
      { name: 'Piotr Zieliński', email: 'piotr@firma.pl', company: 'Zieliński i syn', phone: '', value: '7' },
    ])
    expect(await part().findByText('3 leads imported · 1 skipped')).toBeTruthy()
    expect(said()).toBe('3 leads imported · 1 skipped')
    expect(document.activeElement?.getAttribute('data-csv-focus')).toBe('result')
    expect(screen.getByRole('button', { name: 'Download skipped rows' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Import another file' })).toBeTruthy()
    // The result table lists what was imported, as sent.
    const table = screen.getByRole('table', { name: 'Imported rows' })
    expect(within(table).getByText('Anna Nowak')).toBeTruthy()
    expect(within(table).getByText('Ola Wiśniewska')).toBeTruthy()
    expect(within(table).queryByText('Jan Kowalski')).toBeNull()
    // Every step is complete; Back is gone.
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('shows the skipped rows with their reason in the Skipped segment', async () => {
    const { user } = renderImport()
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await user.click(await screen.findByRole('button', { name: 'Import 3 leads' }))
    await part().findByText('3 leads imported · 1 skipped')
    await user.click(screen.getByRole('radio', { name: 'Skipped 1' }))
    const table = screen.getByRole('table', { name: 'Skipped rows' })
    expect(within(table).getByRole('columnheader', { name: 'Reason' })).toBeTruthy()
    expect(within(table).getByText('Email: Not an email address')).toBeTruthy()
    expect(within(table).getByText('Jan Kowalski')).toBeTruthy()
  })

  it('says no row was skipped in the Skipped table body', async () => {
    const { user } = renderImport({ file: csv('Imię i nazwisko;E-mail;Firma\nAnna;anna@firma.pl;Nowak') })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await user.click(await screen.findByRole('button', { name: 'Import 1 lead' }))
    await part().findByText('1 lead imported')
    expect(screen.queryByRole('button', { name: 'Download skipped rows' })).toBeNull()
    await user.click(screen.getByRole('radio', { name: 'Skipped 0' }))
    const table = screen.getByRole('table', { name: 'Skipped rows' })
    expect(within(table).getByText('No rows were skipped')).toBeTruthy()
    expect(within(table).getByText('Every row in the file passed its checks.')).toBeTruthy()
  })

  it('links an error group to its first cell', async () => {
    const { user } = renderImport()
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await user.click(await screen.findByRole('button', { name: 'Email: 1 invalid' }))
    const cell = document.activeElement as HTMLElement
    expect(cell.getAttribute('data-csv-cell')).toBe('2:email')
    expect(cell.textContent).toContain('jan@firma')
    expect(cell.textContent).toContain('Not an email address')
    expect((screen.getByRole('checkbox', { name: 'Show only errors' }) as HTMLElement).getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByText('Anna Nowak')).toBeNull()
  })

  it('shows an import that fails before any row as nothing imported, with Retry in the table body', async () => {
    const onImport = vi.fn().mockRejectedValueOnce(new Error('The server returned 503.')).mockResolvedValueOnce(undefined)
    const { user } = renderImport({ onImport })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await user.click(await screen.findByRole('button', { name: 'Import 3 leads' }))
    expect(await part().findByText('No leads were imported · 1 skipped')).toBeTruthy()
    await waitFor(() => expect(document.activeElement?.getAttribute('data-csv-focus')).toBe('result'))
    expect(screen.getByRole('radio', { name: 'Not imported 3' })).toBeTruthy()
    const table = screen.getByRole('table', { name: 'Imported rows' })
    expect(within(table).getByRole('columnheader', { name: 'Email' })).toBeTruthy()
    expect(within(table).getByText('No leads were imported')).toBeTruthy()
    expect(within(table).getByText('The server returned 503. Your file and mapping are kept.')).toBeTruthy()
    await user.click(within(table).getByRole('button', { name: 'Retry' }))
    expect(onImport.mock.calls[1][0]).toHaveLength(3)
    expect(await part().findByText('3 leads imported · 1 skipped')).toBeTruthy()
    expect(onImport).toHaveBeenCalledTimes(2)
  })

  it('cancels an import before any row and goes back to Review', async () => {
    let signal: AbortSignal | undefined
    const onImport = vi.fn((_rows: Record<string, string>[], ctx: { signal: AbortSignal }) => {
      signal = ctx.signal
      return new Promise<void>(() => {})
    })
    const { user } = renderImport({ onImport, cancelable: true })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await user.click(await screen.findByRole('button', { name: 'Import 3 leads' }))
    expect(await part().findByText('Importing 0 of 3…')).toBeTruthy()
    // Cancel stands where Back was: Back can't run while importing.
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    await user.click(footerButton('Cancel'))
    expect(signal?.aborted).toBe(true)
    expect(await screen.findByText('4 rows · 3 ready · 1 with errors')).toBeTruthy()
  })

  it('cancels part way into a stopped result, and Retry never sends a saved row again', async () => {
    const onImport = vi
      .fn()
      .mockImplementationOnce((_rows: Record<string, string>[], ctx: { onProgress: (n: number) => void }) => {
        ctx.onProgress(1)
        return new Promise<void>(() => {})
      })
      .mockResolvedValueOnce(undefined)
    const { user } = renderImport({ onImport, cancelable: true })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await user.click(await screen.findByRole('button', { name: 'Import 3 leads' }))
    await part().findByText('Importing 1 of 3…')
    await user.click(footerButton('Cancel'))
    expect(await part().findByText('Import stopped · 1 lead imported · 2 not imported · 1 skipped')).toBeTruthy()
    expect(part().getByText('The import was cancelled.')).toBeTruthy()
    expect(within(screen.getByRole('table', { name: 'Imported rows' })).getByText('Anna Nowak')).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: 'Not imported 2' }))
    expect(within(screen.getByRole('table', { name: 'Rows not imported' })).getByText('Ola Wiśniewska')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Retry from row 2' }))
    const resent = onImport.mock.calls[1][0] as Record<string, string>[]
    expect(resent.map((r) => r.name)).toEqual(['Ola Wiśniewska', 'Piotr Zieliński'])
    expect(await part().findByText('3 leads imported · 1 skipped')).toBeTruthy()
  })

  it('works from the keyboard: Tab to Next, Enter, then Enter on Import', async () => {
    const onImport = vi.fn()
    const { user } = renderImport({ onImport })
    await mapsTo('Firma')
    const next = footerButton('Next')
    next.focus()
    await user.keyboard('{Enter}')
    const importButton = await screen.findByRole('button', { name: 'Import 3 leads' })
    importButton.focus()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(footerButton('Back'))
    await user.tab()
    expect(document.activeElement).toBe(importButton)
    await user.keyboard('{Enter}')
    expect(onImport).toHaveBeenCalledTimes(1)
  })

  it('says its words through labels', async () => {
    renderImport(
      { noun: undefined },
      {
        csvStepMap: 'Mapowanie',
        csvNext: 'Dalej',
        csvMapsToColumn: (column: string) => `Pole dla kolumny ${column}`,
        csvAutoMatched: 'Dopasowano',
        csvRowNoun: { one: 'wiersz', few: 'wiersze', many: 'wierszy', other: 'wiersza' },
      },
    )
    expect(await screen.findByRole('combobox', { name: 'Pole dla kolumny Firma' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Dalej' })).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Import steps' })).getByText('Mapowanie')).toBeTruthy()
    expect(screen.getAllByText('Dopasowano').length).toBeGreaterThan(0)
    expect(screen.getByText('leads.csv · 4 wiersze')).toBeTruthy()
  })

  it('has nothing to wait for on Upload once a file is read', async () => {
    const { user } = renderImport()
    await mapsTo('Firma')
    await user.click(footerButton('Back'))
    expect(await screen.findByText('Drop a CSV file here')).toBeTruthy()
    expect(screen.queryByText('Choose a CSV file to continue')).toBeNull()
    expect(footerButton('Next').hasAttribute('aria-disabled')).toBe(false)
  })

  it('shows Upload when it starts on Map with no file', async () => {
    const { user, container } = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={vi.fn()} defaultStep="map" />)
    expect(screen.getByText('Drop a CSV file here')).toBeTruthy()
    expect(screen.getByText('Choose a CSV file to continue')).toBeTruthy()
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, csv(leads))
    expect((await mapsTo('Firma')).textContent).toContain('Company')
  })

  it('marks a cell whose validate throws, and checks the other rows', async () => {
    const own: CsvImportField[] = fields.map((f) =>
      f.key === 'company'
        ? {
            ...f,
            validate: (v) => {
              if (v === 'Wiśnia') throw new Error('Lookup failed')
              return null
            },
          }
        : f,
    )
    const { user } = renderImport({ fields: own })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    expect(await screen.findByText('4 rows · 2 ready · 2 with errors')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Company: 1 invalid' }))
    expect((document.activeElement as HTMLElement).textContent).toContain('Lookup failed')
  })

  it('shows a check that fails with Retry, instead of hanging on Checking rows', async () => {
    let broken = true
    const date: CsvImportField = { key: 'date', label: 'Date', type: 'date' }
    Object.defineProperty(date, 'dateFormat', {
      get() {
        if (broken) throw new Error('Formats are not loaded.')
        return undefined
      },
    })
    const { user } = renderImport({ fields: [{ key: 'name', label: 'Name', required: true }, date], file: csv('Name;Date\nAnna;01.02.2024') })
    await mapsTo('Date')
    await user.click(footerButton('Next'))
    expect(await part().findByText('The rows couldn’t be checked')).toBeTruthy()
    expect(part().getByText('Formats are not loaded.')).toBeTruthy()
    expect(screen.queryByText('Checking rows…')).toBeNull()
    broken = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('1 row · 1 ready')).toBeTruthy()
  })

  it('leaves out mapped columns the file doesn’t have', async () => {
    const { user } = renderImport({ mapping: { 0: 'name', 1: 'email', 2: 'company', 9: 'name' } })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    expect(await screen.findByText('4 rows · 3 ready · 1 with errors')).toBeTruthy()
  })

  it('retries a failed import from the first row not done', async () => {
    const lines = ['Imię i nazwisko;E-mail;Firma']
    for (let i = 1; i <= 328; i++) lines.push(`Person ${i};p${i}@firma.pl;Firma ${i}`)
    let finish = () => {}
    const onImport = vi
      .fn()
      .mockImplementationOnce((_rows: Record<string, string>[], ctx: { onProgress: (n: number) => void }) => {
        ctx.onProgress(120)
        return Promise.reject(new Error('The server returned 503.'))
      })
      .mockImplementationOnce((_rows: Record<string, string>[], ctx: { onProgress: (n: number) => void }) => {
        ctx.onProgress(20)
        return new Promise<void>((resolve) => (finish = resolve))
      })
    const { user } = renderImport({ onImport, file: csv(lines.join('\n')) })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await user.click(await screen.findByRole('button', { name: 'Import 328 leads' }))
    expect(await part().findByText('Import stopped · 120 leads imported · 208 not imported')).toBeTruthy()
    expect(part().getByText('The server returned 503.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Retry from row 121' }))
    const resent = onImport.mock.calls[1][0] as Record<string, string>[]
    expect(resent).toHaveLength(208)
    expect(resent[0].name).toBe('Person 121')
    expect(await part().findByText('Importing 140 of 328…')).toBeTruthy()
    finish()
    expect(await part().findByText('328 leads imported')).toBeTruthy()
  })

  it('downloads skipped rows with formulas kept as text', async () => {
    const created: Blob[] = []
    const create = vi.fn((blob: Blob) => (created.push(blob), 'blob:skipped'))
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const file = csv(['Imię i nazwisko;E-mail;Firma', 'Anna;anna@firma.pl;Nowak', '=HYPERLINK("x");jan@firma;@SUM(A1)'].join('\n'))
    const { user } = renderImport({ file })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await user.click(await screen.findByRole('button', { name: 'Import 1 lead' }))
    await user.click(await screen.findByRole('button', { name: 'Download skipped rows' }))
    const text = await created[0].text()
    expect(text).toContain(`"'=HYPERLINK(""x"")";jan@firma;'@SUM(A1);`)
    expect(text).toContain('Imię i nazwisko;E-mail;Firma;error')
  })

  it.each(['light', 'dark'] as const)('has no axe violations on Map columns and Review in %s', async (theme) => {
    const { user } = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={vi.fn()} defaultStep="map" file={csv(leads)} />, { theme })
    await mapsTo('Firma')
    await expectNoAxeViolations()
    await user.click(footerButton('Next'))
    await screen.findByText('4 rows · 3 ready · 1 with errors')
    await expectNoAxeViolations()
  })

  it.each(['light', 'dark'] as const)('has no axe violations on the result, with rows and empty, in %s', async (theme) => {
    const onImport = vi.fn().mockRejectedValueOnce(new Error('The server returned 503.'))
    const { user } = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={onImport} defaultStep="map" file={csv(leads)} />, { theme })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await user.click(await screen.findByRole('button', { name: 'Import 3 leads' }))
    await part().findByText('No leads were imported · 1 skipped')
    await expectNoAxeViolations()
    await user.click(screen.getByRole('radio', { name: 'Skipped 1' }))
    await expectNoAxeViolations()
  })

  it.each(['light', 'dark'] as const)('has no axe violations on Upload in %s', async (theme) => {
    renderWithSatin(<CsvImport fields={fields} onImport={vi.fn()} templateHref="/leads.csv" maxRows={10000} maxSize={5 * 1024 * 1024} />, { theme })
    expect(screen.getByText('CSV with a header row, up to 10,000 rows · 5.0 MB')).toBeTruthy()
    await expectNoAxeViolations()
  })
})
