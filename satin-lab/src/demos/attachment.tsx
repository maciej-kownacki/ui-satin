import * as React from 'react'
import {
  Attachment,
  AttachmentGroup,
  AttachmentPreview,
  AttachmentPreviewPager,
  AttachmentPreviewSheets,
  FileIcon,
} from '@satin/ui/attachment'
import { Showcase, type ShowcaseOption } from '../components/Showcase'

type File = { id: string; name: string; meta: string; type: 'pdf' | 'xlsx' }

const files: File[] = [
  { id: 'deal', name: 'Deal_Acme.pdf', meta: 'PDF · 2.4 MB', type: 'pdf' },
  { id: 'costs', name: 'Q3_supplier_costs.xlsx', meta: 'XLSX · 86 KB', type: 'xlsx' },
  { id: 'brief', name: 'Brief_v2.pdf', meta: 'PDF · 640 KB', type: 'pdf' },
]

const groupCode = (size: 'sm' | 'lg', shape: 'default' | 'rounded') => `import { Attachment, AttachmentGroup, FileIcon } from '@satin/ui/attachment'

export function Draft({ files, onRemove }) {
  return (
    <AttachmentGroup>
      {files.map((file) => (
        <Attachment
          key={file.id}
          size="${size}"
          shape="${shape}"
          name={file.name}
          meta={file.meta}
          icon={<FileIcon type={file.type} />}
          onRemove={() => onRemove(file.id)}
        />
      ))}
    </AttachmentGroup>
  )
}`

const previewCode = `import { Attachment, AttachmentPreview, AttachmentPreviewPager } from '@satin/ui/attachment'

<Attachment
  name="Deal_Acme.pdf"
  meta="PDF · 2.4 MB"
  onOpen={openFile}
  preview={
    <AttachmentPreview
      name="Deal_Acme.pdf"
      onOpen={openFile}
      navigation={<AttachmentPreviewPager page={1} total={3} />}
    >
      <p className="text-sm font-medium text-text-default">Master Services Agreement</p>
      <p className="text-xs text-text-muted">This Agreement is entered into by…</p>
    </AttachmentPreview>
  }
/>`

export const options: ShowcaseOption[] = [
  { id: 'lg', label: 'Large', code: groupCode('lg', 'default') },
  { id: 'sm', label: 'Small', code: groupCode('sm', 'rounded') },
  { id: 'preview', label: 'Preview', code: previewCode },
]

function GroupDemo({ size, shape }: { size: 'sm' | 'lg'; shape: 'default' | 'rounded' }) {
  const [list, setList] = React.useState(files)
  return (
    <div className="flex w-[min(576px,calc(100vw-80px))] flex-col items-center gap-3">
      <AttachmentGroup className="justify-center">
        {list.map((file) => (
          <Attachment
            key={file.id}
            size={size}
            shape={shape}
            name={file.name}
            meta={file.meta}
            icon={<FileIcon type={file.type} />}
            onRemove={() => setList((l) => l.filter((f) => f.id !== file.id))}
          />
        ))}
      </AttachmentGroup>
      {list.length < files.length && (
        <button type="button" className="text-sm text-text-muted underline" onClick={() => setList(files)}>
          Reset files
        </button>
      )}
    </div>
  )
}

function DocumentPreview() {
  const [page, setPage] = React.useState(1)
  return (
    <AttachmentPreview
      name="Deal_Acme.pdf"
      icon={<FileIcon type="pdf" />}
      navigation={<AttachmentPreviewPager page={page} total={3} onPrevious={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />}
    >
      <p className="text-sm font-medium text-text-default">Master Services Agreement</p>
      <p className="text-xs text-text-muted">
        This Agreement is entered into by Acme Corp. ("Client") and Sature Ltd. ("Provider") and sets out the terms under
        which the Provider delivers the services described in Schedule A.
      </p>
      <p className="text-xs text-text-muted">
        1. Term. The Agreement starts on 1 November 2026 and runs for 12 months. It renews for further 12-month periods
        unless either party gives 30 days’ written notice.
      </p>
      <p className="text-xs text-text-muted">
        <span className="text-text-default">2. Fees.</span> The Client pays the fees in Schedule B within 14 days of each
        invoice. Late payments carry interest of 1% per month.
      </p>
      <p className="text-xs text-text-muted">
        3. Confidentiality. Each party keeps the other’s confidential information private and uses it only to perform
        this Agreement.
      </p>
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

function SpreadsheetPreview() {
  const [sheet, setSheet] = React.useState('Costs')
  const cell = 'px-1.5 py-1 text-xs whitespace-nowrap'
  return (
    <AttachmentPreview
      name="Q3_supplier_costs.xlsx"
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

function PreviewDemo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <AttachmentGroup>
        <Attachment name="Deal_Acme.pdf" meta="PDF · 2.4 MB" icon={<FileIcon type="pdf" />} preview={<DocumentPreview />} />
        <Attachment name="Q3_supplier_costs.xlsx" meta="XLSX · 86 KB" icon={<FileIcon type="xlsx" />} preview={<SpreadsheetPreview />} />
      </AttachmentGroup>
      <p className="text-sm text-text-muted">Hover a file to see its first page or rows.</p>
    </div>
  )
}

export default function AttachmentDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="Attachment"
      options={options}
      codeHtml={codeHtml}
      render={(id) =>
        id === 'preview' ? (
          <PreviewDemo />
        ) : (
          <GroupDemo key={id} size={id as 'sm' | 'lg'} shape={id === 'sm' ? 'rounded' : 'default'} />
        )
      }
    />
  )
}
