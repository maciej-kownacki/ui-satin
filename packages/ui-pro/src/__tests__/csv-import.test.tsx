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
  await waitFor(() => expect(document.querySelector('[data-csv-focus="tabs"]')).toBeTruthy())
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

  it('makes invalid cells editable with onCellEdit, and reports the row, the column and the value', async () => {
    const own: CsvImportField[] = [{ key: 'email', label: 'Email', type: 'email' }]
    const first = await validateCsv([['a@firma.pl'], ['broken']], { 0: 'email' }, own, { header: false })
    const fixed = await validateCsv([['a@firma.pl'], ['b@firma.pl']], { 0: 'email' }, own, { header: false })
    const edits: [number, number, string][] = []
    function App() {
      const [validation, setValidation] = React.useState(first)
      return (
        <CsvImportPreview
          fields={own}
          mapping={{ 0: 'email' }}
          validation={validation}
          onCellEdit={(row, column, value) => {
            edits.push([row, column, value])
            setValidation(fixed)
          }}
        />
      )
    }
    const { user } = renderWithSatin(<App />)
    await user.click(screen.getByRole('button', { name: 'broken, Not an email address, Edit' }))
    const field = screen.getByRole('textbox', { name: 'Email, row 2' })
    await user.clear(field)
    await user.type(field, 'b@firma.pl{Enter}')
    expect(edits).toEqual([[2, 0, 'b@firma.pl']])
    expect(screen.getByText('2 rows · 2 ready')).toBeTruthy()
    expect(said()).toBe('Row 2 is ready to import')
    // No invalid cell left: focus on the summary.
    expect(document.activeElement).toBe(screen.getByText('2 rows · 2 ready'))
  })

  it('keeps fixes pending until a validation has them, showing their values, and reads out every row that passes', async () => {
    const own: CsvImportField[] = [{ key: 'email', label: 'Email', type: 'email' }]
    const check = (...emails: string[]) => validateCsv(emails.map((e) => [e]), { 0: 'email' }, own, { header: false })
    const first = await check('bad1', 'bad2', 'bad3')
    // A check that has only the first fix: the others stay pending.
    const one = await check('a@firma.pl', 'bad2', 'bad3')
    const all = await check('a@firma.pl', 'b@firma.pl', 'c@firma.pl')
    let set: (v: typeof first) => void = () => {}
    function App() {
      const [validation, setValidation] = React.useState(first)
      set = setValidation
      return <CsvImportPreview fields={own} mapping={{ 0: 'email' }} validation={validation} onCellEdit={() => {}} />
    }
    const { user } = renderWithSatin(<App />)
    const fix = async (row: number, from: string, to: string) => {
      await user.click(screen.getByRole('button', { name: `${from}, Not an email address, Edit` }))
      const field = screen.getByRole('textbox', { name: `Email, row ${row}` })
      await user.clear(field)
      await user.type(field, `${to}{Enter}`)
    }
    await fix(1, 'bad1', 'a@firma.pl')
    // Pending: the cell shows the new value, and opening it again starts from it.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'a@firma.pl, Not an email address, Edit' }))
    await user.keyboard('{Enter}')
    expect((screen.getByRole('textbox', { name: 'Email, row 1' }) as HTMLInputElement).value).toBe('a@firma.pl')
    await user.keyboard('{Escape}')
    await fix(2, 'bad2', 'b@firma.pl')
    await fix(3, 'bad3', 'c@firma.pl')
    // A copy of the first validation settles nothing.
    act(() => set({ ...first }))
    expect(screen.getByRole('button', { name: 'c@firma.pl, Not an email address, Edit' })).toBeTruthy()
    act(() => set(one))
    expect(said()).toBe('Row 1 is ready to import')
    expect(screen.getByRole('button', { name: 'b@firma.pl, Not an email address, Edit' })).toBeTruthy()
    act(() => set(all))
    expect(said()).toBe('Row 2 is ready to import. Row 3 is ready to import')
  })

  it('leaves focus where it went after a fix committed by leaving the field', async () => {
    const own: CsvImportField[] = [
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'other', label: 'Other', type: 'email' },
    ]
    const first = await validateCsv([['broken', 'bad']], { 0: 'email', 1: 'other' }, own, { header: false })
    const still = await validateCsv([['wrong', 'bad']], { 0: 'email', 1: 'other' }, own, { header: false })
    function App() {
      const [validation, setValidation] = React.useState(first)
      return <CsvImportPreview fields={own} mapping={{ 0: 'email', 1: 'other' }} validation={validation} onCellEdit={() => setValidation(still)} />
    }
    const { user } = renderWithSatin(<App />)
    await user.click(screen.getByRole('button', { name: 'broken, Not an email address, Edit' }))
    await user.clear(screen.getByRole('textbox', { name: 'Email, row 1' }))
    await user.type(screen.getByRole('textbox', { name: 'Email, row 1' }), 'wrong')
    // Tab leaves the field for the row's other invalid cell: focus stays there.
    await user.tab()
    await waitFor(() => expect(screen.getByRole('button', { name: 'wrong, Not an email address, Edit' })).toBeTruthy())
    expect((document.activeElement as HTMLElement).dataset.csvCell).toBe('1:other')
  })

  it('keeps invalid cells plain without onCellEdit', async () => {
    const own: CsvImportField[] = [{ key: 'email', label: 'Email', type: 'email' }]
    const validation = await validateCsv([['broken']], { 0: 'email' }, own, { header: false })
    renderWithSatin(<CsvImportPreview fields={own} mapping={{ 0: 'email' }} validation={validation} />)
    expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull()
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
    expect(document.querySelector('[data-csv-focus="tabs"]')).toBeNull()
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
    await waitFor(() => expect(document.querySelector('[data-csv-focus="tabs"]')).toBeTruthy())
    expect(steps().getByText('Review').closest('li')?.getAttribute('aria-current')).toBe('step')
    await user.click(steps().getByRole('button', { name: 'Map columns, Completed' }))
    expect(await mapsTo('Firma')).toBeTruthy()
    // Unmap Company, a required field: Review is out of reach.
    await user.click(await mapsTo('Firma'))
    await user.click(await screen.findByRole('option', { name: 'Don’t import' }))
    expect(steps().queryByRole('button', { name: /Review/ })).toBeNull()
    expect(steps().getByRole('button', { name: 'Upload file, Completed' })).toBeTruthy()
  })

  it('counts the rows in two tabs on Review, opening on the errors, arrow keys moving between them', async () => {
    const { user } = renderImport()
    await toReview(user)
    expect(screen.getByRole('heading', { name: 'Review rows' })).toBeTruthy()
    const tabs = screen.getByRole('tablist', { name: 'Rows to show' })
    const ready = within(tabs).getByRole('tab', { name: '3 Leads will be imported' })
    const errors = within(tabs).getByRole('tab', { name: '1 Row with errors' })
    // Errors first, and focus on the selected tab.
    expect(errors.getAttribute('aria-selected')).toBe('true')
    await waitFor(() => expect(document.activeElement).toBe(errors))
    const panel = screen.getByRole('tabpanel', { name: '1 Row with errors' })
    const table = within(panel).getByRole('table', { name: 'Rows with errors' })
    expect(within(table).getByText('Jan Kowalski')).toBeTruthy()
    expect(within(table).queryByText('Anna Nowak')).toBeNull()
    // Arrow keys select as they move (automatic activation), Home and End too.
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(ready)
    expect(ready.getAttribute('aria-selected')).toBe('true')
    const readyTable = within(screen.getByRole('tabpanel', { name: '3 Leads will be imported' })).getByRole('table', { name: 'Rows to import' })
    expect(within(readyTable).getByText('Anna Nowak')).toBeTruthy()
    expect(within(readyTable).queryByText('Jan Kowalski')).toBeNull()
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(errors)
    expect(errors.getAttribute('aria-selected')).toBe('true')
    // The preview's own summary, Alert and checkbox stay out: the tabs say them.
    expect(screen.queryByRole('checkbox', { name: 'Show only errors' })).toBeNull()
  })

  it('gives the selected tab the tab stop from the first render', async () => {
    const { user } = renderImport()
    await toReview(user)
    const ready = screen.getByRole('tab', { name: '3 Leads will be imported' })
    const errors = screen.getByRole('tab', { name: '1 Row with errors' })
    expect(errors.tabIndex).toBe(0)
    expect(ready.tabIndex).toBe(-1)
    expect(screen.getByRole('tablist').tabIndex).toBe(-1)
    await user.keyboard('{ArrowLeft}')
    expect(ready.tabIndex).toBe(0)
    expect(errors.tabIndex).toBe(-1)
  })

  it('opens on the import tab with no errors, the errors tab empty', async () => {
    const { user } = renderImport({ file: csv('Imię i nazwisko;E-mail;Firma\nAnna;anna@firma.pl;Nowak') })
    await toReview(user)
    const ready = screen.getByRole('tab', { name: '1 Lead will be imported' })
    expect(ready.getAttribute('aria-selected')).toBe('true')
    await user.click(screen.getByRole('tab', { name: '0 Rows with errors' }))
    expect(screen.getByText('No rows with errors')).toBeTruthy()
  })

  it('fixes an invalid cell in place: the row moves to the import tab, focus to the next invalid cell', async () => {
    const file = csv(['Imię i nazwisko;E-mail;Firma', 'Anna;anna@firma;Nowak', 'Jan;jan@firma;Kowalski', 'Ola;ola@firma.pl;Wiśnia'].join('\n'))
    const onImport = vi.fn()
    const { user } = renderImport({ file, onImport })
    await toReview(user)
    const table = () => screen.getByRole('table', { name: 'Rows with errors' })
    const cell = within(table()).getByRole('button', { name: 'anna@firma, Not an email address, Edit' })
    expect(cell.getAttribute('data-csv-cell')).toBe('1:email')
    cell.focus()
    await user.keyboard('{Enter}')
    const field = screen.getByRole('textbox', { name: 'Email, row 1' }) as HTMLInputElement
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe('anna@firma')
    await user.clear(field)
    await user.type(field, 'anna@firma.pl{Enter}')
    // Checked again: Anna is ready, focus on Jan's email, and it is read out.
    await waitFor(() => expect(screen.getByRole('tab', { name: '2 Leads will be imported' })).toBeTruthy())
    expect(screen.getByRole('tab', { name: '1 Row with errors' }).getAttribute('aria-selected')).toBe('true')
    await waitFor(() => expect((document.activeElement as HTMLElement).dataset.csvCell).toBe('2:email'))
    expect(said()).toBe('Row 1 is ready to import')
    expect(within(table()).queryByText('Anna')).toBeNull()
    // The last one: the errors tab stays, empty, and takes focus.
    await user.keyboard('{F2}')
    const jan = screen.getByRole('textbox', { name: 'Email, row 2' })
    await user.clear(jan)
    await user.type(jan, 'jan@firma.pl{Enter}')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tab', { name: '0 Rows with errors' })))
    expect(screen.getByText('No rows with errors')).toBeTruthy()
    await user.click(footerButton('Import 3 leads'))
    expect((onImport.mock.calls[0][0] as Record<string, string>[]).map((r) => r.email)).toEqual(['anna@firma.pl', 'jan@firma.pl', 'ola@firma.pl'])
  })

  it('keeps a fix that still fails on its cell with the new reason, and Escape cancels', async () => {
    const { user } = renderImport()
    await toReview(user)
    await user.click(screen.getByRole('button', { name: 'jan@firma, Not an email address, Edit' }))
    const field = screen.getByRole('textbox', { name: 'Email, row 2' })
    await user.type(field, 'x{Escape}')
    const cell = screen.getByRole('button', { name: 'jan@firma, Not an email address, Edit' })
    expect(document.activeElement).toBe(cell)
    expect(screen.queryByRole('textbox', { name: 'Email, row 2' })).toBeNull()
    await user.keyboard('{Enter}')
    const again = screen.getByRole('textbox', { name: 'Email, row 2' })
    await user.clear(again)
    await user.type(again, 'still wrong{Enter}')
    await waitFor(() => expect(document.activeElement?.textContent).toBe('still wrong, Not an email address, Edit'))
    expect(screen.getByRole('tab', { name: '1 Row with errors' })).toBeTruthy()
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
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tab', { name: '1 Row with errors' })))
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

  it('lists exactly the rows sent after a resume, with a row fixed before the saved ones', async () => {
    const file = csv(['Imię i nazwisko;E-mail;Firma', 'Anna;anna@firma;Nowak', 'Jan;jan@firma.pl;Kowalski', 'Ola;ola@firma.pl;Wiśnia'].join('\n'))
    let late = (_n: number) => {}
    const onImport = vi
      .fn()
      .mockImplementationOnce((_rows: Record<string, string>[], ctx: { onProgress: (n: number) => void }) => {
        late = ctx.onProgress
        return new Promise<void>(() => {})
      })
      .mockImplementationOnce((_rows: Record<string, string>[], ctx: { onProgress: (n: number) => void }) => {
        ctx.onProgress(1)
        return Promise.reject(new Error('Down'))
      })
    const { user } = renderImport({ file, onImport, cancelable: true })
    await toReview(user)
    // Cancel before any row is reported, then the request in flight still saves Jan.
    await user.click(footerButton('Import 2 leads'))
    await user.click(footerButton('Cancel'))
    await screen.findByRole('heading', { name: 'Review rows' })
    act(() => late(1))
    // Anna, before Jan in the file, is fixed: editing stays on with a saved row.
    await user.click(screen.getByRole('button', { name: 'anna@firma, Not an email address, Edit' }))
    await user.clear(screen.getByRole('textbox', { name: 'Email, row 1' }))
    await user.type(screen.getByRole('textbox', { name: 'Email, row 1' }), 'anna@firma.pl{Enter}')
    await waitFor(() => expect(screen.getByRole('tab', { name: '3 Leads will be imported' })).toBeTruthy())
    await user.click(footerButton('Import 3 leads'))
    // Jan is not sent again; Anna is, and saved; Ola is not.
    expect((onImport.mock.calls[1][0] as Record<string, string>[]).map((r) => r.name)).toEqual(['Anna', 'Ola'])
    await screen.findByRole('heading', { name: 'Import stopped' })
    const imported = screen.getByRole('table', { name: 'Imported rows' })
    expect(within(imported).getByText('Jan')).toBeTruthy()
    expect(within(imported).getByText('Anna')).toBeTruthy()
    expect(within(imported).queryByText('Ola')).toBeNull()
    await user.click(screen.getByRole('radio', { name: 'Not imported 1' }))
    const rest = screen.getByRole('table', { name: 'Rows not imported' })
    expect(within(rest).getByText('Ola')).toBeTruthy()
    expect(within(rest).queryByText('Anna')).toBeNull()
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
    await waitFor(() => expect(document.querySelector('[data-csv-focus="tabs"]')).toBeTruthy())
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
    expect(screen.getByRole('tab', { name: '2 Leads will be imported' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '2 Rows with errors' }).getAttribute('aria-selected')).toBe('true')
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
    await waitFor(() => expect(screen.getByRole('tab', { name: '1 Lead will be imported' })).toBeTruthy())
  })

  it('leaves out mapped columns the file doesn’t have', async () => {
    const { user } = renderImport({ mapping: { 0: 'name', 1: 'email', 2: 'company', 9: 'name' } })
    await toReview(user)
    expect(screen.getByRole('tab', { name: '3 Leads will be imported' })).toBeTruthy()
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
    await waitFor(() => expect(document.querySelector('[data-csv-focus="tabs"]')).toBeTruthy())
    await expectNoAxeViolations()
  })

  it.each(['light', 'dark'] as const)('has no axe violations on the result, empty and with rows, in %s', async (theme) => {
    const onImport = vi.fn().mockRejectedValueOnce(new Error('The server returned 503.'))
    const { user } = renderWithSatin(<CsvImport fields={fields} noun={noun} onImport={onImport} file={csv(leads)} />, { theme })
    await mapsTo('Firma')
    await user.click(footerButton('Next'))
    await waitFor(() => expect(document.querySelector('[data-csv-focus="tabs"]')).toBeTruthy())
    await user.click(footerButton('Import 3 leads'))
    await screen.findByRole('heading', { name: 'Nothing was imported' })
    await expectNoAxeViolations()
    await user.click(screen.getByRole('radio', { name: 'Skipped 1' }))
    await expectNoAxeViolations()
  })
})
