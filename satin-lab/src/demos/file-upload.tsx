import * as React from 'react'
import { FileUpload, type FileUploadFile } from '@satin/ui/file-upload'
import { Showcase, combos, comboId, type ShowcaseControl, type ShowcaseOption } from '../components/Showcase'

const MB = 1024 * 1024

// What the zone holds in each state. The zone works in every one: drop or browse real files and
// they upload (simulated here) or fail the type and size checks.
const presets: Record<string, FileUploadFile[]> = {
  empty: [],
  drag: [],
  uploading: [
    { id: 'u1', name: 'roadmap.pdf', size: 2.4 * MB, status: 'uploading', progress: 40 },
    { id: 'u2', name: 'menu-autumn.docx', size: 120 * 1024, status: 'uploading' },
  ],
  error: [
    { id: 'e1', name: 'screen-recording.mov', status: 'error', error: 'Type not supported' },
    { id: 'e2', name: 'dataset.csv', status: 'error', error: 'Larger than 10 MB' },
  ],
  attached: [
    { id: 'd1', name: 'roadmap.pdf', size: 2.4 * MB, status: 'done' },
    { id: 'd2', name: 'menu-autumn.docx', size: 120 * 1024, status: 'done' },
    { id: 'd3', name: 'costs-q3.xlsx', size: 84 * 1024, status: 'done' },
  ],
}

export const controls: ShowcaseControl[] = [
  {
    id: 'state',
    label: 'State',
    type: 'menu',
    default: 'empty',
    items: [
      { value: 'empty', label: 'Empty' },
      { value: 'drag', label: 'Drag over' },
      { value: 'uploading', label: 'Uploading' },
      { value: 'error', label: 'Errors' },
      { value: 'attached', label: 'Attached' },
    ],
  },
]

const first = controls[0]
const stateLabel: Record<string, string> = 'items' in first ? Object.fromEntries(first.items.map((i) => [i.value, i.label])) : {}

function code(v: Record<string, string>) {
  return `import * as React from 'react'
import { FileUpload, type FileUploadFile } from '@satin/ui/file-upload'

export function Attachments() {
  const [files, setFiles] = React.useState<FileUploadFile[]>(${v.state === 'empty' || v.state === 'drag' ? '[]' : `[
    ${presets[v.state]
      .map((f) => JSON.stringify({ id: f.id, name: f.name, ...(f.size ? { size: Math.round(f.size) } : {}), status: f.status, ...(f.progress != null ? { progress: f.progress } : {}), ...(f.error ? { error: f.error } : {}) }).replace(/"(\\w+)":/g, '$1: ').replace(/,(?=\\w)/g, ', '))
      .join(',\n    ')},
  ]`})

  return (
    <FileUpload
      files={files}
      accept=".pdf,.csv,.xlsx,image/*"
      maxSize={10 * 1024 * 1024}
      description="PDF, images, CSV · up to 10 MB"${v.state === 'drag' ? '\n      data-force="drag"' : ''}
      onFilesAdded={(added) => {
        // Start your uploads here and keep each file's progress in \`files\`.
        setFiles((fs) => [...fs, ...added.map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, status: 'uploading' as const, progress: 0 }))])
      }}
      onFilesRejected={(rejected) =>
        setFiles((fs) => [...fs, ...rejected.map((r) => ({ id: crypto.randomUUID(), name: r.file.name, status: 'error' as const, error: r.message }))])
      }
      onCancel={(f) => setFiles((fs) => fs.filter((x) => x.id !== f.id))}
      onRemove={(f) => setFiles((fs) => fs.filter((x) => x.id !== f.id))}
    />
  )
}`
}

export const options: ShowcaseOption[] = combos(controls).map((v) => ({
  id: comboId(controls, v),
  label: stateLabel[v.state],
  code: code(v),
}))

let seq = 0

// What Browse files picks in the demo, one file per click, round and round.
const SAMPLES = [
  { name: 'roadmap.pdf', size: 2.4 * MB },
  { name: 'menu-autumn.docx', size: 120 * 1024 },
  { name: 'costs-q3.xlsx', size: 84 * 1024 },
  { name: 'floor-plan.png', size: 1.1 * MB },
]
let picked = 0

function Live({ state }: { state: string }) {
  const [files, setFiles] = React.useState<FileUploadFile[]>(presets[state])
  const browse = () => {
    const f = SAMPLES[picked++ % SAMPLES.length]
    setFiles((fs) => [...fs, { id: `live-${seq++}`, name: f.name, size: f.size, status: 'uploading', progress: 0 }])
  }

  // Files added here upload for real-looking: progress climbs, then they turn into attachments.
  const live = files.some((f) => f.status === 'uploading' && f.id.startsWith('live'))
  React.useEffect(() => {
    if (!live) return
    const t = setInterval(() => {
      setFiles((fs) =>
        fs.map((f) => {
          if (f.status !== 'uploading' || !f.id.startsWith('live')) return f
          const next = (f.progress ?? 0) + 6 + Math.random() * 10
          return next >= 100 ? { ...f, status: 'done', progress: undefined } : { ...f, progress: next }
        }),
      )
    }, 160)
    return () => clearInterval(t)
  }, [live])

  return (
    <FileUpload
      files={files}
      accept=".pdf,.csv,.xlsx,.docx,image/*"
      maxSize={10 * MB}
      description="PDF, images, CSV · up to 10 MB"
      data-force={state === 'drag' ? 'drag' : undefined}
      // The page can't open a real picker for you: each click picks one sample file instead.
      onBrowse={browse}
      onFilesAdded={(added) =>
        setFiles((fs) => [...fs, ...added.map((f) => ({ id: `live-${seq++}`, name: f.name, size: f.size, status: 'uploading' as const, progress: 0 }))])
      }
      onFilesRejected={(rejected) =>
        setFiles((fs) => [...fs, ...rejected.map((r) => ({ id: `rej-${seq++}`, name: r.file.name, status: 'error' as const, error: r.message }))])
      }
      onCancel={(f) => setFiles((fs) => fs.filter((x) => x.id !== f.id))}
      onRemove={(f) => setFiles((fs) => fs.filter((x) => x.id !== f.id))}
    />
  )
}

export default function FileUploadDemo({ codeHtml }: { codeHtml: Record<string, string> }) {
  return (
    <Showcase
      name="File upload"
      options={options}
      codeHtml={codeHtml}
      controls={controls}
      render={(_, v) => (
        <div className="w-[440px] max-w-full">
          <Live key={v.state} state={v.state} />
        </div>
      )}
    />
  )
}
