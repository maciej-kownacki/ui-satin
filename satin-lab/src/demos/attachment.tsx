import * as React from 'react'
import {
  Attachment,
  AttachmentGroup,
  AttachmentPreview,
  AttachmentPreviewPager,
  AttachmentPreviewSheets,
  FileIcon,
} from '@satin/ui/attachment'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

type File = { id: string; name: string; meta: string; type: 'pdf' | 'xlsx' }

const files: File[] = [
  { id: 'deal', name: 'Deal_Acme.pdf', meta: 'PDF · 2.4 MB', type: 'pdf' },
  { id: 'costs', name: 'Q3_supplier_costs.xlsx', meta: 'XLSX · 86 KB', type: 'xlsx' },
  { id: 'brief', name: 'Brief_v2.pdf', meta: 'PDF · 640 KB', type: 'pdf' },
]

// Size and shape set the chip; "All files" shows the group and turns the code into a loop,
// one file gives the one chip you'd paste. Remove and preview are optional behaviours.
export const controls: ShowcaseControl[] = [
  { id: 'size', label: 'Size', items: [{ value: 'lg', label: 'Large' }, { value: 'sm', label: 'Small' }] },
  { id: 'shape', label: 'Shape', items: [{ value: 'default', label: 'Default' }, { value: 'rounded', label: 'Rounded' }] },
  {
    id: 'file',
    label: 'File',
    items: [
      { value: 'all', label: 'All files' },
      { value: 'deal', label: 'PDF' },
      { value: 'costs', label: 'Spreadsheet' },
    ],
  },
  { id: 'remove', label: 'Remove', type: 'switch', default: 'on' },
  { id: 'preview', label: 'Preview', type: 'switch', default: 'off' },
]

const labelOf = (id: string, value: string) => {
  const c = controls.find((c) => c.id === id)
  return c && 'items' in c ? c.items.find((i) => i.value === value)?.label : undefined
}

const previewCode: Record<string, string> = {
  deal: `<AttachmentPreview
      name="Deal_Acme.pdf"
      icon={<FileIcon type="pdf" />}
      navigation={<AttachmentPreviewPager page={page} total={3} onPrevious={previousPage} onNext={nextPage} />}
    >
      <p className="text-sm font-medium text-text-default">Master Services Agreement</p>
      <p className="text-xs text-text-muted">This Agreement is entered into by…</p>
    </AttachmentPreview>`,
  costs: `<AttachmentPreview
      name="Q3_supplier_costs.xlsx"
      icon={<FileIcon type="xlsx" />}
      navigation={<AttachmentPreviewSheets sheets={['Costs', 'Suppliers']} value={sheet} onValueChange={setSheet} />}
    >
      <SheetTable rows={rows} />
    </AttachmentPreview>`,
}

function code(v: Record<string, string>) {
  const attrs = [v.size !== 'lg' && `size="${v.size}"`, v.shape !== 'default' && `shape="${v.shape}"`].filter(Boolean)
  const remove = v.remove === 'on'
  const preview = v.preview === 'on'

  if (v.file === 'all') {
    const props = [
      'key={file.id}',
      ...attrs,
      'name={file.name}',
      'meta={file.meta}',
      'icon={<FileIcon type={file.type} />}',
      remove && 'onRemove={() => remove(file.id)}',
      // Each file renders its own first page or rows, so the loop hands that to a component.
      preview && 'preview={<FilePreview file={file} />}',
    ].filter(Boolean)
    return `import { Attachment, AttachmentGroup, FileIcon } from '@satin/ui/attachment'

const files = [
${files.map((f) => `  { id: '${f.id}', name: '${f.name}', meta: '${f.meta}', type: '${f.type}' },`).join('\n')}
] as const

<AttachmentGroup>
  {files.map((file) => (
    <Attachment
${props.map((p) => `      ${p}`).join('\n')}
    />
  ))}
</AttachmentGroup>`
  }

  const f = files.find((f) => f.id === v.file)!
  const nav = f.type === 'pdf' ? 'AttachmentPreviewPager' : 'AttachmentPreviewSheets'
  const props = [
    ...attrs,
    `name="${f.name}"`,
    `meta="${f.meta}"`,
    `icon={<FileIcon type="${f.type}" />}`,
    remove && `onRemove={() => remove('${f.id}')}`,
    preview && `preview={\n    ${previewCode[f.id]}\n  }`,
  ].filter(Boolean)
  return `import { Attachment, ${preview ? `AttachmentPreview, ${nav}, ` : ''}FileIcon } from '@satin/ui/attachment'

<Attachment
${props.map((p) => `  ${p}`).join('\n')}
/>`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: [
    labelOf('size', v.size),
    labelOf('shape', v.shape),
    labelOf('file', v.file),
    v.remove === 'on' ? 'Remove' : 'No remove',
    v.preview === 'on' ? 'Preview' : 'No preview',
  ].join(' · '),
  code: code(v),
}))

function DocumentPreview({ file }: { file: File }) {
  const [page, setPage] = React.useState(1)
  const deal = file.id === 'deal'
  const total = deal ? 3 : 2
  return (
    <AttachmentPreview
      name={file.name}
      icon={<FileIcon type="pdf" />}
      navigation={<AttachmentPreviewPager page={page} total={total} onPrevious={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />}
    >
      {deal ? (
        <>
          <p className="text-sm font-medium text-text-default">Master Services Agreement</p>
          <p className="text-xs text-text-muted">
            This Agreement is entered into by Acme Corp. ("Client") and Sature Ltd. ("Provider") and sets out the terms
            under which the Provider delivers the services described in Schedule A.
          </p>
          <p className="text-xs text-text-muted">
            1. Term. The Agreement starts on 1 November 2026 and runs for 12 months. It renews for further 12-month
            periods unless either party gives 30 days’ written notice.
          </p>
          <p className="text-xs text-text-muted">
            <span className="text-text-default">2. Fees.</span> The Client pays the fees in Schedule B within 14 days of
            each invoice. Late payments carry interest of 1% per month.
          </p>
          <p className="text-xs text-text-muted">
            3. Confidentiality. Each party keeps the other’s confidential information private and uses it only to
            perform this Agreement.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-text-default">Spring menu brief</p>
          <p className="text-xs text-text-muted">
            Goal: a lighter lunch menu for March, with two vegetarian mains and one fish dish under 1 200 zł a week in
            ingredients.
          </p>
          <p className="text-xs text-text-muted">
            <span className="text-text-default">Suppliers.</span> Keep Green Farm for vegetables and move dairy to
            Mleczarnia K. from week 2.
          </p>
        </>
      )}
    </AttachmentPreview>
  )
}

const rows = [
  ['Green Farm', '12', '1 840 zł'],
  ['Mleczarnia K.', '4', '620 zł'],
  ['Bakery Ziarno', '6', '410 zł'],
  ['Olive & Co', '3', '298 zł'],
  ['Fish Market', '5', '1 120 zł'],
  ['Spice Route', '9', '214 zł'],
  ['Total', '39', '4 502 zł'],
]

function SpreadsheetPreview({ file }: { file: File }) {
  const [sheet, setSheet] = React.useState('Costs')
  const cell = 'px-1.5 py-1 text-xs whitespace-nowrap'
  return (
    <AttachmentPreview
      name={file.name}
      icon={<FileIcon type="xlsx" />}
      navigation={<AttachmentPreviewSheets sheets={['Costs', 'Suppliers']} value={sheet} onValueChange={setSheet} />}
    >
      <table className="w-full overflow-clip rounded-md border border-border-subtle text-left [border-collapse:separate] [border-spacing:0]">
        <thead className="bg-bg-muted text-text-muted">
          <tr>
            <th className={`${cell} w-5 font-normal`} />
            <th className={`${cell} font-normal`}>Supplier</th>
            <th className={`${cell} w-11 text-right font-normal`}>Items</th>
            <th className={`${cell} w-16 text-right font-normal`}>Cost</th>
          </tr>
        </thead>
        <tbody className="text-text-default">
          {rows.map(([name, items, cost], i) => (
            <tr key={name}>
              <td className={`${cell} border-t border-border-subtle bg-bg-muted text-center text-text-muted`}>{i + 1}</td>
              <td className={`${cell} border-t border-border-subtle`}>{name}</td>
              <td className={`${cell} border-t border-border-subtle text-right`}>{items}</td>
              <td className={`${cell} border-t border-border-subtle text-right`}>{cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AttachmentPreview>
  )
}

function Demo({ v }: { v: Record<string, string> }) {
  const [list, setList] = React.useState(files)
  const shown = list.filter((f) => v.file === 'all' || v.file === f.id)
  const removed = files.filter((f) => v.file === 'all' || v.file === f.id).length > shown.length
  const chips = shown.map((file) => (
    <Attachment
      key={file.id}
      size={v.size as 'sm' | 'lg'}
      shape={v.shape as 'default' | 'rounded'}
      name={file.name}
      meta={file.meta}
      icon={<FileIcon type={file.type} />}
      onRemove={v.remove === 'on' ? () => setList((l) => l.filter((f) => f.id !== file.id)) : undefined}
      preview={
        v.preview === 'on' ? (
          file.type === 'pdf' ? <DocumentPreview file={file} /> : <SpreadsheetPreview file={file} />
        ) : undefined
      }
    />
  ))
  return (
    <div className="flex w-[min(576px,calc(100vw-80px))] flex-col items-center gap-3">
      {v.file === 'all' ? <AttachmentGroup className="justify-center">{chips}</AttachmentGroup> : chips}
      {removed ? (
        <button type="button" className="text-sm text-text-muted underline" onClick={() => setList(files)}>
          Reset files
        </button>
      ) : (
        v.preview === 'on' && <p className="text-sm text-text-muted">Hover a file to see its first page or rows.</p>
      )}
    </div>
  )
}

export default function AttachmentDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Attachment"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => <Demo v={v} />}
    />
  )
}
