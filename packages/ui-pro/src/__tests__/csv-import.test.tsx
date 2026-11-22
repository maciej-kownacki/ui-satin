import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { CsvImport, CsvImportPreview, type CsvImportContext, type CsvImportField, type CsvImportProps } from '../components/csv-import'
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

/** A file given from the start: read at once, it opens on Map columns. */
function renderImport(props: Partial<CsvImportProps> = {}, labels?: Record<string, unknown>) {
  const onImport = props.onImport ?? vi.fn()
  const view = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={onImport} file={csv(leads)} {...props} />, {
    labels: { dateLocale: 'pl-PL', ...labels },
  })
  return { ...view, onImport }
}

const mapsTo = (column: string) => screen.findByRole('combobox', { name: `Maps to, CSV column ${column}` })
/** The step's content, away from the live region that repeats some of it. */
const part = () => within(document.querySelector<HTMLElement>('[data-slot="csv-import-step"]')!)
const said = () => document.querySelector('[aria-live="polite"]')?.textContent
const footer = () => within(document.querySelector<HTMLElement>('[data-slot="csv-import-footer"]')!)
const footerButton = (name: string | RegExp) => footer().getByRole('button', { name })
const steps = () => within(screen.getByRole('list', { name: 'Import steps' }))

/** From Map columns to Review, once the rows are checked. */
async function toReview(user: ReturnType<typeof renderImport>['user']) {
  await mapsTo('Firma')
  await user.click(footerButton('Next'))
  await waitFor(() => expect(document.querySelector('[data-csv-focus="tiles"]')).toBeTruthy())
}

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
  it('starts empty on Upload, with Next blocked and its reason', () => {
    renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={vi.fn()} />)
    expect(document.querySelector('[data-slot="csv-import"]')?.getAttribute('data-step')).toBe('upload')
    expect(screen.getByText('Import leads')).toBeTruthy()
    expect(screen.getByText('Drop your CSV file here, or browse for one')).toBeTruthy()
    const next = footerButton('Next')
    expect(next.getAttribute('aria-disabled')).toBe('true')
    const reason = footer().getByText('Choose a CSV file to continue')
    expect(next.getAttribute('aria-describedby')).toBe(reason.id)
    expect((footerButton('Back') as HTMLButtonElement).disabled).toBe(true)
    // No step can be reached yet: none of them is a button.
    expect(steps().queryAllByRole('button')).toHaveLength(0)
    expect(steps().getByText('Upload file').closest('li')?.getAttribute('aria-current')).toBe('step')
  })

  it('shows an added file as an attachment with progress, then opens Next without moving on', async () => {
    const onStepChange = vi.fn()
    const { user, container } = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={vi.fn()} onStepChange={onStepChange} />)
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, csv(leads))
    expect(await screen.findByRole('progressbar', { name: 'Uploading leads.csv' })).toBeTruthy()
    expect(footerButton('Next').getAttribute('aria-disabled')).toBe('true')
    // Loaded: the bar is through and the file is attached.
    await waitFor(() => expect(screen.getByRole('list', { name: 'Attached files' })).toBeTruthy(), { timeout: 3000 })
    expect(within(screen.getByRole('list', { name: 'Attached files' })).getByText('leads.csv')).toBeTruthy()
    const next = footerButton('Next')
    expect(next.hasAttribute('aria-disabled')).toBe(false)
    expect(footer().queryByText('Choose a CSV file to continue')).toBeNull()
    // Nothing moves on by itself.
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(onStepChange).not.toHaveBeenCalled()
    await user.click(next)
    // Next goes to Map columns, the columns auto-matched.
    expect((await mapsTo('Firma')).textContent).toContain('Company')
    expect(onStepChange).toHaveBeenLastCalledWith('map')
    expect((await mapsTo('E-mail')).textContent).toContain('Email')
    expect((await mapsTo('Imię i nazwisko')).textContent).toContain('Name')
    expect((await mapsTo('Źródło')).textContent).toContain('Don’t import')
    expect(screen.getByRole('heading', { name: 'Map CSV columns' })).toBeTruthy()
    expect(screen.getByText('Columns in your file')).toBeTruthy()
    expect(screen.getByText('Lead fields')).toBeTruthy()
    expect(screen.getAllByText(', Auto-matched')).toHaveLength(4)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Maps to, CSV column Imię i nazwisko' })))
  })

  it('opens on Map columns with a file given from the start, auto-matched', async () => {
    const onMappingChange = vi.fn()
    renderImport({ onMappingChange })
    expect((await mapsTo('Firma')).textContent).toContain('Company')
    expect(onMappingChange).toHaveBeenLastCalledWith({ 0: 'name', 1: 'email', 2: 'company', 3: 'phone', 4: null, 5: null })
  })

  it('reads the file once under StrictMode, the aborted first run showing nothing', async () => {
    renderWithSatin(
      <React.StrictMode>
        <CsvImport fields={fields} noun={noun} onImport={vi.fn()} file={csv(leads)} />
      </React.StrictMode>,
    )
    expect((await mapsTo('Firma')).textContent).toContain('Company')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('turns away an Excel file renamed .csv, with its reason', async () => {
    const xlsx = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0])], 'leads.csv', { type: 'text/csv' })
    renderImport({ file: xlsx })
    expect(await part().findByText('Excel files aren’t supported. Save it as CSV and try again.')).toBeTruthy()
    expect(part().getByText('leads.csv couldn’t be read')).toBeTruthy()
    expect(said()).toBe('Excel files aren’t supported. Save it as CSV and try again.')
    expect(part().getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('blocks Next while a required field has no column, and says why', async () => {
    const { user } = renderImport({ file: csv('E-mail;Telefon\nanna@firma.pl;1') })
    await mapsTo('E-mail')
    const next = footerButton('Next')
    expect(next.getAttribute('aria-disabled')).toBe('true')
    const reason = footer().getByText('Map a column to Name')
    expect(next.getAttribute('aria-describedby')).toBe(reason.id)
    expect(screen.getByText('Name is required: map a column to it')).toBeTruthy()
    expect(screen.getByText('Company is required: map a column to it')).toBeTruthy()
    // Review can't be reached from the steps either.
    expect(steps().queryByRole('button', { name: /Review/ })).toBeNull()
    await user.click(next)
    expect(screen.getByRole('combobox', { name: 'Maps to, CSV column E-mail' })).toBeTruthy()
    expect(document.querySelector('[data-csv-focus="tiles"]')).toBeNull()
  })

  it('marks a field mapped twice on both columns and blocks Next', async () => {
    const { user } = renderImport()
    const phone = await mapsTo('Telefon')
    await user.click(phone)
    await user.click(await screen.findByRole('option', { name: 'Email' }))
    expect(screen.getAllByText('Email is already mapped')).toHaveLength(2)
    expect(footer().getByText('Email is mapped to two columns')).toBeTruthy()
    expect(footerButton('Next').getAttribute('aria-disabled')).toBe('true')
    expect(phone.getAttribute('aria-invalid')).toBe('true')
  })

  it('goes back and forward through the steps row, forward only as far as Next would', async () => {
    const { user } = renderImport()
    await mapsTo('Firma')
    expect(steps().getByText('Map columns').closest('li')?.getAttribute('aria-current')).toBe('step')
    // Back to Upload: a done step, a button.
    await user.click(steps().getByRole('button', { name: 'Upload file, Completed' }))
    await waitFor(() => expect(document.querySelector('[data-slot="csv-import"]')?.getAttribute('data-step')).toBe('upload'))
    // The file waits there, loaded; Map and Review are both reachable.
    expect(footerButton('Next').hasAttribute('aria-disabled')).toBe(false)
    await user.click(steps().getByRole('button', { name: 'Review' }))
    await waitFor(() => expect(document.querySelector('[data-csv-focus="tiles"]')).toBeTruthy())
    expect(steps().getByText('Review').closest('li')?.getAttribute('aria-current')).toBe('step')
    await user.click(steps().getByRole('button', { name: 'Map columns, Completed' }))
    expect(await mapsTo('Firma')).toBeTruthy()
    // Unmap Company, a required field: Review is out of reach.
    await user.click(await mapsTo('Firma'))
    await user.click(await screen.findByRole('option', { name: 'Don’t import' }))
    expect(steps().queryByRole('button', { name: /Review/ })).toBeNull()
    expect(steps().getByRole('button', { name: 'Upload file, Completed' })).toBeTruthy()
  })

  it('counts the rows in two tiles on Review, the errors tile filtering the table', async () => {
    const { user } = renderImport()
    await toReview(user)
    expect(screen.getByRole('heading', { name: 'Review rows' })).toBeTruthy()
    const ready = document.querySelector<HTMLElement>('[data-csv-focus="tiles"]')!
    expect(ready.textContent).toBe('3 Leads will be imported')
    await waitFor(() => expect(document.activeElement).toBe(ready))
    const errors = screen.getByRole('button', { name: '1 Row with errors' })
    expect(errors.getAttribute('aria-pressed')).toBe('false')
    const table = screen.getByRole('table', { name: 'Rows to import' })
    expect(within(table).getByText('Anna Nowak')).toBeTruthy()
    await user.click(errors)
    expect(errors.getAttribute('aria-pressed')).toBe('true')
    expect(within(table).queryByText('Anna Nowak')).toBeNull()
    expect(within(table).getByText('Jan Kowalski')).toBeTruthy()
    await user.click(errors)
    expect(errors.getAttribute('aria-pressed')).toBe('false')
    expect(within(table).getByText('Anna Nowak')).toBeTruthy()
    // The preview's own summary, Alert and checkbox stay out: the tiles say them.
    expect(screen.queryByRole('checkbox', { name: 'Show only errors' })).toBeNull()
  })

  it('imports nothing before the click, then only the valid rows, normalised, with progress', async () => {
    let finish = () => {}
    let progress = (_n: number) => {}
    const onImport = vi.fn((_rows: Record<string, string>[], ctx: { onProgress: (n: number) => void }) => {
      progress = ctx.onProgress
      return new Promise<void>((resolve) => (finish = resolve))
    })
    const { user } = renderImport({ onImport, defaultMapping: { 5: 'value' } })
    await toReview(user)
    expect(onImport).not.toHaveBeenCalled()
    await user.click(footerButton('Import 3 leads'))
    expect(onImport).toHaveBeenCalledTimes(1)
    expect(onImport.mock.calls[0][0]).toEqual([
      { name: 'Anna Nowak', email: 'anna@firma.pl', company: 'Nowak Sp. z o.o.', phone: '+48 600 100 200', value: '1234.5' },
      { name: 'Ola Wiśniewska', email: 'ola@firma.pl', company: 'Wiśnia', phone: '', value: '' },
      { name: 'Piotr Zieliński', email: 'piotr@firma.pl', company: 'Zieliński i syn', phone: '', value: '7' },
    ])
    expect(screen.getByRole('heading', { name: 'Importing leads' })).toBeTruthy()
    expect(await part().findByText('Importing 0 of 3…')).toBeTruthy()
    progress(2)
    expect(await part().findByText('Importing 2 of 3…')).toBeTruthy()
    finish()
    const title = await screen.findByRole('heading', { name: 'Import complete' })
    expect(part().getByText('3 leads imported · 1 skipped')).toBeTruthy()
    expect(said()).toBe('3 leads imported · 1 skipped')
    await waitFor(() => expect(document.activeElement).toBe(title))
    expect(footerButton('Import another file')).toBeTruthy()
    expect(footer().queryByRole('button', { name: 'Back' })).toBeNull()
    // Every step is done.
    expect(steps().getAllByText(', Completed')).toHaveLength(3)
    const table = screen.getByRole('table', { name: 'Imported rows' })
    expect(within(table).getByText('Anna Nowak')).toBeTruthy()
    expect(within(table).queryByText('Jan Kowalski')).toBeNull()
  })

  it('shows the skipped rows of a result with their reason', async () => {
    const onDone = vi.fn()
    const { user } = renderImport({ onDone })
    await toReview(user)
    await user.click(footerButton('Import 3 leads'))
    await screen.findByRole('heading', { name: 'Import complete' })
    expect(screen.getByRole('button', { name: 'Download skipped rows' })).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: 'Skipped 1' }))
    const table = screen.getByRole('table', { name: 'Skipped rows' })
    expect(within(table).getByRole('columnheader', { name: 'Reason' })).toBeTruthy()
    expect(within(table).getByText('Email: Not an email address')).toBeTruthy()
    expect(within(table).getByText('Jan Kowalski')).toBeTruthy()
    await user.click(footerButton('Done'))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('cancels an import before any row and goes back to Review', async () => {
    let signal: AbortSignal | undefined
    const onImport = vi.fn((_rows: Record<string, string>[], ctx: { signal: AbortSignal }) => {
      signal = ctx.signal
      return new Promise<void>(() => {})
    })
    const { user } = renderImport({ onImport, cancelable: true })
    await toReview(user)
    await user.click(footerButton('Import 3 leads'))
    expect(await part().findByText('Importing 0 of 3…')).toBeTruthy()
    // Cancel stands where Back was: Back can't run while importing.
    expect(footer().queryByRole('button', { name: 'Back' })).toBeNull()
    await user.click(footerButton('Cancel'))
    expect(signal?.aborted).toBe(true)
    expect(await screen.findByRole('heading', { name: 'Review rows' })).toBeTruthy()
    await waitFor(() => expect(document.activeElement?.getAttribute('data-csv-focus')).toBe('tiles'))
    expect(footerButton('Import 3 leads')).toBeTruthy()
  })

  it('cancels part way into a stopped result, and Retry resumes without sending a saved row again', async () => {
    const onImport = vi
      .fn()
      .mockImplementationOnce((_rows: Record<string, string>[], ctx: { onProgress: (n: number) => void }) => {
        ctx.onProgress(1)
        return new Promise<void>(() => {})
      })
      .mockResolvedValueOnce(undefined)
    const { user } = renderImport({ onImport, cancelable: true })
    await toReview(user)
    await user.click(footerButton('Import 3 leads'))
    await part().findByText('Importing 1 of 3…')
    await user.click(footerButton('Cancel'))
    expect(await screen.findByRole('heading', { name: 'Import stopped' })).toBeTruthy()
    expect(part().getByText('1 lead imported · 2 not imported · 1 skipped')).toBeTruthy()
    expect(within(screen.getByRole('table', { name: 'Imported rows' })).getByText('Anna Nowak')).toBeTruthy()
    await user.click(screen.getByRole('radio', { name: 'Not imported 2' }))
    expect(within(screen.getByRole('table', { name: 'Rows not imported' })).getByText('Ola Wiśniewska')).toBeTruthy()
    // Retry is the footer's primary.
    await user.click(footerButton('Retry from row 2'))
    const resent = onImport.mock.calls[1][0] as Record<string, string>[]
    expect(resent.map((r) => r.name)).toEqual(['Ola Wiśniewska', 'Piotr Zieliński'])
    expect(await screen.findByRole('heading', { name: 'Import complete' })).toBeTruthy()
    expect(part().getByText('3 leads imported · 1 skipped')).toBeTruthy()
  })

  it('shows an import that saves nothing in the table body, with Retry in the footer', async () => {
    const onImport = vi.fn().mockRejectedValueOnce(new Error('The server returned 503.')).mockResolvedValueOnce(undefined)
    const { user } = renderImport({ onImport })
    await toReview(user)
    await user.click(footerButton('Import 3 leads'))
    const title = await screen.findByRole('heading', { name: 'Nothing was imported' })
    await waitFor(() => expect(document.activeElement).toBe(title))
    const table = screen.getByRole('table', { name: 'Imported rows' })
    expect(within(table).getByRole('columnheader', { name: 'Email' })).toBeTruthy()
    expect(within(table).getByText('No leads were imported')).toBeTruthy()
    expect(within(table).getByText('The server returned 503. Your file and mapping are kept.')).toBeTruthy()
    // Retry is in the footer only.
    expect(within(table).queryByRole('button', { name: 'Retry' })).toBeNull()
    await user.click(footerButton('Retry'))
    expect(onImport.mock.calls[1][0]).toHaveLength(3)
    expect(await screen.findByRole('heading', { name: 'Import complete' })).toBeTruthy()
  })

  it('goes back to an empty Upload with Import another file', async () => {
    const onFileChange = vi.fn()
    const { user } = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={vi.fn()} defaultMapping={{}} onFileChange={onFileChange} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, csv(leads))
    await waitFor(() => expect(footerButton('Next').hasAttribute('aria-disabled')).toBe(false), { timeout: 3000 })
    await user.click(footerButton('Next'))
    await toReview(user)
    await user.click(footerButton('Import 3 leads'))
    await screen.findByRole('heading', { name: 'Import complete' })
    await user.click(footerButton('Import another file'))
    expect(onFileChange).toHaveBeenLastCalledWith(null)
    await waitFor(() => expect(document.querySelector('[data-slot="csv-import"]')?.getAttribute('data-step')).toBe('upload'))
    expect(footer().getByText('Choose a CSV file to continue')).toBeTruthy()
  })

  it('calls onBrowse in place of the file picker, from Browse files and the zone', async () => {
    const onBrowse = vi.fn()
    const { user } = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={vi.fn()} onBrowse={onBrowse} />)
    await user.click(screen.getByRole('button', { name: 'Browse files' }))
    expect(onBrowse).toHaveBeenCalledTimes(1)
    await user.click(screen.getByText('Import leads'))
    expect(onBrowse).toHaveBeenCalledTimes(2)
  })

  it('shows the drag-over look with dragging', () => {
    renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={vi.fn()} dragging />)
    expect(screen.getByText('Drop to upload')).toBeTruthy()
  })

  it('draws the app icon it is given', async () => {
    renderImport({ appIcon: <svg data-testid="app" className="size-full" /> })
    await mapsTo('Firma')
    expect(screen.getByTestId('app')).toBeTruthy()
  })

  it('works from the keyboard: Tab to Next, Enter, then Enter on Import', async () => {
    const onImport = vi.fn()
    const { user } = renderImport({ onImport })
    await mapsTo('Firma')
    footerButton('Next').focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(document.querySelector('[data-csv-focus="tiles"]')).toBeTruthy())
    const importButton = footerButton('Import 3 leads')
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
        csvMapTitle: 'Mapuj kolumny',
        csvFileColumns: 'Kolumny w pliku',
        csvAppFields: (n: string) => `Pola: ${n}`,
        csvMapsToColumn: (column: string) => `Pole dla kolumny ${column}`,
        csvAutoMatched: 'Dopasowano',
        csvRowNoun: { one: 'wiersz', few: 'wiersze', many: 'wierszy', other: 'wiersza' },
      },
    )
    expect(await screen.findByRole('combobox', { name: 'Pole dla kolumny Firma' })).toBeTruthy()
    expect(footerButton('Dalej')).toBeTruthy()
    expect(steps().getByText('Mapowanie')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Mapuj kolumny' })).toBeTruthy()
    expect(screen.getByText('Kolumny w pliku')).toBeTruthy()
    expect(screen.getByText('Pola: wiersz')).toBeTruthy()
    expect(screen.getAllByText(', Dopasowano').length).toBeGreaterThan(0)
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
    await toReview(user)
    expect(document.querySelector('[data-csv-focus="tiles"]')?.textContent).toBe('2 Leads will be imported')
    await user.click(screen.getByRole('button', { name: '2 Rows with errors' }))
    expect(screen.getByText('Lookup failed', { exact: false })).toBeTruthy()
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
    await user.click(part().getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(document.querySelector('[data-csv-focus="tiles"]')?.textContent).toBe('1 Lead will be imported'))
  })

  it('leaves out mapped columns the file doesn’t have', async () => {
    const { user } = renderImport({ mapping: { 0: 'name', 1: 'email', 2: 'company', 9: 'name' } })
    await toReview(user)
    expect(document.querySelector('[data-csv-focus="tiles"]')?.textContent).toBe('3 Leads will be imported')
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
    await toReview(user)
    await user.click(footerButton('Import 328 leads'))
    expect(await screen.findByRole('heading', { name: 'Import stopped' })).toBeTruthy()
    expect(part().getByText('120 leads imported · 208 not imported', { exact: false })).toBeTruthy()
    expect(part().getByText('The server returned 503.', { exact: false })).toBeTruthy()
    await user.click(footerButton('Retry from row 121'))
    const resent = onImport.mock.calls[1][0] as Record<string, string>[]
    expect(resent).toHaveLength(208)
    expect(resent[0].name).toBe('Person 121')
    expect(await part().findByText('Importing 140 of 328…')).toBeTruthy()
    finish()
    expect(await part().findByText('328 leads imported')).toBeTruthy()
  })

  /** Ten valid rows, Person 1 to Person 10. */
  const tenRows = () => {
    const lines = ['Imię i nazwisko;E-mail;Firma']
    for (let i = 1; i <= 10; i++) lines.push(`Person ${i};p${i}@firma.pl;Firma ${i}`)
    return csv(lines.join('\n'))
  }
  /** Longer than the check's debounce, so a re-check a re-render started would have landed. */
  const settle = () => act(() => new Promise((r) => setTimeout(r, 300)))

  /**
   * A parent that passes `fields` and a controlled mapping inline and re-renders on every
   * onProgress: neither starts a new check, so the saved count holds.
   */
  function rerenderingHost(file: File, first: (rows: Record<string, string>[], ctx: CsvImportContext) => Promise<void>) {
    const onImport = vi.fn().mockImplementationOnce(first).mockResolvedValue(undefined)
    function Host() {
      const [, setTick] = React.useState(0)
      return (
        <CsvImport
          fields={fields.map((f) => ({ ...f }))}
          mapping={{ 0: 'name', 1: 'email', 2: 'company' }}
          noun={noun}
          file={file}
          cancelable
          onImport={(rows, ctx) =>
            onImport(rows, {
              ...ctx,
              onProgress: (done: number) => {
                ctx.onProgress(done)
                setTick((t) => t + 1)
              },
            })
          }
        />
      )
    }
    return { onImport, ...renderWithSatin(<Host />, { labels: { dateLocale: 'pl-PL' } }) }
  }

  it('retries from the first row not saved when the parent re-renders inline fields during the import', async () => {
    let progress = (_n: number) => {}
    let reject = (_e: Error) => {}
    const { user, onImport } = rerenderingHost(tenRows(), (_rows, ctx) => {
      progress = ctx.onProgress
      return new Promise<void>((_, r) => (reject = r))
    })
    await toReview(user)
    await user.click(footerButton('Import 10 leads'))
    await act(async () => progress(4))
    expect(await part().findByText('Importing 4 of 10…')).toBeTruthy()
    await settle()
    await act(async () => reject(new Error('The server returned 503.')))
    expect(await screen.findByRole('heading', { name: 'Import stopped' })).toBeTruthy()
    const retry = footerButton('Retry from row 5')
    expect(retry.hasAttribute('aria-disabled')).toBe(false)
    await user.click(retry)
    const resent = onImport.mock.calls[1][0] as Record<string, string>[]
    expect(resent.map((r) => r.name)).toEqual(['Person 5', 'Person 6', 'Person 7', 'Person 8', 'Person 9', 'Person 10'])
  })

  it('cancels into a stopped result with the right count when the parent re-renders, and keeps counting a request in flight', async () => {
    let progress = (_n: number) => {}
    const { user, onImport } = rerenderingHost(tenRows(), (_rows, ctx) => {
      progress = ctx.onProgress
      return new Promise<void>(() => {})
    })
    await toReview(user)
    await user.click(footerButton('Import 10 leads'))
    await act(async () => progress(4))
    expect(await part().findByText('Importing 4 of 10…')).toBeTruthy()
    await settle()
    await user.click(footerButton('Cancel'))
    expect(await screen.findByRole('heading', { name: 'Import stopped' })).toBeTruthy()
    expect(part().getByText('4 leads imported · 6 not imported', { exact: false })).toBeTruthy()
    // The request in flight commits two more after Cancel: the screen keeps what it showed.
    await act(async () => progress(6))
    expect(part().getByText('4 leads imported · 6 not imported', { exact: false })).toBeTruthy()
    // Retry doesn't send them again.
    await user.click(footerButton('Retry from row 5'))
    const resent = onImport.mock.calls[1][0] as Record<string, string>[]
    expect(resent.map((r) => r.name)).toEqual(['Person 7', 'Person 8', 'Person 9', 'Person 10'])
  })

  it('sends nothing when a controlled mapping drops a required column on Review', async () => {
    const file = csv(leads)
    const onImport = vi.fn()
    const ui = (mapping: CsvImportProps['mapping']) => <CsvImport fields={fields} noun={noun} onImport={onImport} file={file} mapping={mapping} />
    const { user, rerender } = renderWithSatin(ui({ 0: 'name', 1: 'email', 2: 'company' }), { labels: { dateLocale: 'pl-PL' } })
    await toReview(user)
    rerender(ui({ 0: 'name', 1: 'email' }))
    await settle()
    const button = footerButton(/^Import \d+ leads?$/)
    expect(button.getAttribute('aria-disabled')).toBe('true')
    await user.click(button)
    expect(onImport).not.toHaveBeenCalled()
    expect(screen.queryByText(/^Importing/)).toBeNull()
  })

  it('starts a new controlled file on Upload and drops the old file’s import', async () => {
    let signal: AbortSignal | undefined
    let finish = () => {}
    const onImport = vi.fn((_rows: Record<string, string>[], ctx: CsvImportContext) => {
      signal = ctx.signal
      return new Promise<void>((resolve) => (finish = resolve))
    })
    const first = csv(leads)
    const ui = (file: File) => <CsvImport fields={fields} noun={noun} onImport={onImport} file={file} />
    const { user, rerender } = renderWithSatin(ui(first), { labels: { dateLocale: 'pl-PL' } })
    await toReview(user)
    await user.click(footerButton('Import 3 leads'))
    await part().findByText('Importing 0 of 3…')
    rerender(ui(csv(leads, 'other.csv')))
    expect(signal?.aborted).toBe(true)
    await waitFor(() => expect(document.querySelector('[data-slot="csv-import"]')?.getAttribute('data-step')).toBe('upload'))
    // It arrives as an attachment and waits for Next.
    await waitFor(() => expect(footerButton('Next').hasAttribute('aria-disabled')).toBe(false), { timeout: 3000 })
    expect(within(screen.getByRole('list', { name: 'Attached files' })).getByText('other.csv')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
    // The old import ending changes nothing.
    await act(async () => finish())
    expect(screen.queryByRole('heading', { name: 'Import complete' })).toBeNull()
    expect(document.querySelector('[data-slot="csv-import"]')?.getAttribute('data-step')).toBe('upload')
  })

  it('moves focus to Browse files when a failed read is retried', async () => {
    const file = csv(leads)
    // Fails once, then reads for as long as the test looks.
    file.arrayBuffer = vi.fn().mockRejectedValueOnce(new Error('Disk gone')).mockReturnValue(new Promise<ArrayBuffer>(() => {}))
    const { user } = renderImport({ file })
    const retry = await part().findByRole('button', { name: 'Retry' })
    await user.click(retry)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Browse files' })))
  })

  it('downloads skipped rows with formulas kept as text', async () => {
    const created: Blob[] = []
    const create = vi.fn((blob: Blob) => (created.push(blob), 'blob:skipped'))
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const file = csv(['Imię i nazwisko;E-mail;Firma', 'Anna;anna@firma.pl;Nowak', '=HYPERLINK("x");jan@firma;@SUM(A1)'].join('\n'))
    const { user } = renderImport({ file })
    await toReview(user)
    await user.click(footerButton('Import 1 lead'))
    await user.click(await screen.findByRole('button', { name: 'Download skipped rows' }))
    const text = await created[0].text()
    expect(text).toContain(`"'=HYPERLINK(""x"")";jan@firma;'@SUM(A1);`)
    expect(text).toContain('Imię i nazwisko;E-mail;Firma;error')
  })

  it.each(['light', 'dark'] as const)('has no axe violations on Upload, with a file attached, in %s', async (theme) => {
    const { user, container } = renderWithSatin(
      <CsvImport fields={fields} noun={noun} onImport={vi.fn()} templateHref="/leads.csv" maxRows={10000} maxSize={5 * 1024 * 1024} />,
      { theme },
    )
    expect(screen.getByText('CSV with a header row, up to 10,000 rows · 5.0 MB')).toBeTruthy()
    await expectNoAxeViolations()
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, csv(leads))
    await waitFor(() => expect(screen.getByRole('list', { name: 'Attached files' })).toBeTruthy(), { timeout: 3000 })
    await expectNoAxeViolations()
  })

  it.each(['light', 'dark'] as const)('has no axe violations on Map columns and Review in %s', async (theme) => {
    const { user } = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={vi.fn()} file={csv(leads)} />, { theme })
    await mapsTo('Firma')
    await expectNoAxeViolations()
    await user.click(footerButton('Next'))
    await waitFor(() => expect(document.querySelector('[data-csv-focus="tiles"]')).toBeTruthy())
    await expectNoAxeViolations()
  })

  it.each(['light', 'dark'] as const)('has no axe violations on the result, empty and with rows, in %s', async (theme) => {
    const onImport = vi.fn().mockRejectedValueOnce(new Error('The server returned 503.'))
    const { user } = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={onImport} file={csv(leads)} />, { theme })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await waitFor(() => expect(document.querySelector('[data-csv-focus="tiles"]')).toBeTruthy())
    await user.click(footerButton('Import 3 leads'))
    await screen.findByRole('heading', { name: 'Nothing was imported' })
    await expectNoAxeViolations()
    await user.click(screen.getByRole('radio', { name: 'Skipped 1' }))
    await expectNoAxeViolations()
  })
})
