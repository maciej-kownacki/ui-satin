'use client'

import * as React from 'react'
import { Page, WarningCircle, Xmark } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Attachment, FileIcon } from './attachment'
import { Button } from './button'
import { Progress } from './progress'
import { useSatinLabels } from './labels'

/**
 * FileUpload, 1:1 with the uiKit `FileUpload` set (4068:3717), its `FileUploadItem` rows
 * (4068:3453) and the `fileUpload/_icon` mark (4068:3405).
 *
 * The drop zone is the dashed EmptyState: a 40px bg/muted tile with a filled file and an up
 * arrow, the title (text/base medium), what it takes (Body/md, text/muted) and Browse files
 * (secondary), 16 apart, 32 / 24 in, radius-2xl. While files are dragged over it the zone fills
 * bg/hover with a status/brand dashed border, the tile turns bg/card, the title says "Drop to
 * upload" and Browse files is disabled.
 *
 * Under the zone, 8 apart, one row per file the app is handling (`files`):
 * - uploading: the type icon on a 36px tile, the name and "1.0 of 2.4 MB · 40%" over a small
 *   Progress (indeterminate while `progress` is left out), Cancel on the right.
 * - error: status/red ground and border, a red warning mark, the name, what went wrong, Remove.
 * - done: the file as an lg Attachment, full width, one under another.
 *
 * Dropping or browsing checks every file against `accept` and `maxSize`. What passes goes to
 * `onFilesAdded`; what fails goes to `onFilesRejected` with the reason, so the app can show it
 * as an error row. The upload itself is the app's: it keeps `files` up to date.
 */
export type FileUploadStatus = 'uploading' | 'error' | 'done'

export interface FileUploadFile {
  id: string
  name: string
  /** In bytes; feeds "1.0 of 2.4 MB" and the attachment's meta. */
  size?: number
  status: FileUploadStatus
  /** 0–100 while uploading; left out, the bar runs indeterminate and the meta says "Waiting…". */
  progress?: number
  /** What went wrong, for `error`. */
  error?: React.ReactNode
  /** Type icon; picked from the name when left out. */
  icon?: React.ReactNode
}

export interface FileUploadRejection {
  file: File
  reason: 'type' | 'size'
  /** A ready message, e.g. "Type not supported" or "Larger than 10 MB". */
  message: string
}

export interface FileUploadProps extends Omit<React.ComponentProps<'div'>, 'title' | 'onDrop'> {
  files?: FileUploadFile[]
  /** As on `<input type="file">`: MIME types, `image/*` or extensions, comma separated. */
  accept?: string
  /** Largest file, in bytes. */
  maxSize?: number
  multiple?: boolean
  disabled?: boolean
  title?: React.ReactNode
  /** Shown while files are dragged over the zone. */
  dropTitle?: React.ReactNode
  /** What the zone takes, e.g. "PDF, images, CSV · up to 10 MB". */
  description?: React.ReactNode
  browseLabel?: string
  /** Called instead of opening the file picker (demos, or an app that brings its own picker). */
  onBrowse?: () => void
  onFilesAdded?: (files: File[]) => void
  onFilesRejected?: (rejections: FileUploadRejection[]) => void
  /** Cancel on an uploading row. */
  onCancel?: (file: FileUploadFile) => void
  /** Remove on an error row or a done chip. */
  onRemove?: (file: FileUploadFile) => void
  onOpen?: (file: FileUploadFile) => void
  /** Shows the drag-over look (state sheets, docs). */
  'data-force'?: 'drag'
}

export const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  const mb = n / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

/** The sent part in the total's own unit, so it reads "1.0 of 2.4 MB". */
const sentOf = (total: number, percent: number) => {
  const sent = (total * percent) / 100
  if (total < 1024) return String(Math.round(sent))
  if (total < 1024 * 1024) return String(Math.round(sent / 1024))
  const mb = total / (1024 * 1024)
  return mb < 10 ? (sent / (1024 * 1024)).toFixed(1) : String(Math.round(sent / (1024 * 1024)))
}

const ext = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '')

function accepts(file: File, accept?: string) {
  if (!accept) return true
  const type = file.type.toLowerCase()
  const e = `.${ext(file.name)}`
  return accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => (rule.startsWith('.') ? rule === e : rule.endsWith('/*') ? type.startsWith(rule.slice(0, -1)) : rule === type))
}

/** The type icon for a file name: PDF, spreadsheet, or a plain page. */
export function fileIconFor(name: string) {
  const e = ext(name)
  if (e === 'pdf') return <FileIcon type="pdf" />
  if (['xls', 'xlsx', 'csv', 'numbers'].includes(e)) return <FileIcon type="xlsx" />
  return <Page aria-hidden className="size-icon-size text-text-muted [stroke-width:1.875]" />
}

export function FileUpload({
  files = [],
  accept,
  maxSize,
  multiple = true,
  disabled = false,
  title = 'Drop files here',
  dropTitle = 'Drop to upload',
  description,
  browseLabel = 'Browse files',
  onBrowse,
  onFilesAdded,
  onFilesRejected,
  onCancel,
  onRemove,
  onOpen,
  className,
  ...props
}: FileUploadProps) {
  const labels = useSatinLabels()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const descriptionId = React.useId()
  const [dragging, setDragging] = React.useState(false)
  // dragenter/dragleave fire for every child; count them so the zone only lets go when the
  // pointer really leaves it.
  const depth = React.useRef(0)
  const over = dragging || props['data-force'] === 'drag'

  const take = (list: FileList | null) => {
    if (!list || disabled) return
    const picked = Array.from(list).slice(0, multiple ? undefined : 1)
    const ok: File[] = []
    const rejected: FileUploadRejection[] = []
    for (const file of picked) {
      if (!accepts(file, accept)) rejected.push({ file, reason: 'type', message: 'Type not supported' })
      else if (maxSize != null && file.size > maxSize) rejected.push({ file, reason: 'size', message: `Larger than ${formatBytes(maxSize)}` })
      else ok.push(file)
    }
    if (ok.length) onFilesAdded?.(ok)
    if (rejected.length) onFilesRejected?.(rejected)
  }

  const rows = files.filter((f) => f.status !== 'done')
  const done = files.filter((f) => f.status === 'done')

  return (
    <div data-slot="file-upload" className={cn('flex w-full flex-col gap-2', className)} {...props}>
      <div
        data-slot="file-upload-zone"
        data-dragging={over || undefined}
        data-disabled={disabled || undefined}
        onDragEnter={(e) => {
          if (disabled || !e.dataTransfer.types.includes('Files')) return
          e.preventDefault()
          depth.current += 1
          setDragging(true)
        }}
        onDragOver={(e) => {
          if (disabled || !e.dataTransfer.types.includes('Files')) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1)
          if (depth.current === 0) setDragging(false)
        }}
        onDrop={(e) => {
          if (disabled) return
          e.preventDefault()
          depth.current = 0
          setDragging(false)
          take(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-default px-6 py-8 text-center',
          'transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-out)',
          'data-[dragging]:border-status-brand-border data-[dragging]:bg-bg-hover',
          'data-[disabled]:opacity-50',
        )}
      >
        <UploadMark over={over} />
        <div className="flex w-full flex-col items-center gap-1">
          <p className="text-base font-medium text-text-default">{over ? dropTitle : title}</p>
          {description && (
            <p id={descriptionId} className="text-sm text-text-muted">
              {description}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          disabled={disabled || over}
          aria-describedby={description ? descriptionId : undefined}
          onClick={() => (onBrowse ? onBrowse() : inputRef.current?.click())}
        >
          {browseLabel}
        </Button>
        <input
          ref={inputRef}
          type="file"
          hidden
          tabIndex={-1}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            take(e.currentTarget.files)
            e.currentTarget.value = ''
          }}
        />
      </div>

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={labels.files}>
          {rows.map((f) => (
            <li key={f.id}>
              <FileUploadItem file={f} onCancel={onCancel} onRemove={onRemove} />
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={labels.attachedFiles}>
          {done.map((f) => (
            <li key={f.id}>
              <Attachment
                name={f.name}
                meta={[ext(f.name).toUpperCase(), f.size != null ? formatBytes(f.size) : null].filter(Boolean).join(' · ')}
                icon={f.icon ?? fileIconFor(f.name)}
                onRemove={onRemove ? () => onRemove(f) : undefined}
                onOpen={onOpen ? () => onOpen(f) : undefined}
                // Full width, one under another: the name takes the room and the remove button
                // sits at the right edge.
                className="flex w-full [&_[data-attachment-main]]:flex-1 [&_[data-attachment-name]]:max-w-none"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** One file while it uploads or after it failed (FileUploadItem 4068:3453). */
export function FileUploadItem({
  file,
  onCancel,
  onRemove,
  className,
}: {
  file: FileUploadFile
  onCancel?: (file: FileUploadFile) => void
  onRemove?: (file: FileUploadFile) => void
  className?: string
}) {
  if (file.status === 'error') {
    return (
      <div
        data-slot="file-upload-item"
        data-status="error"
        role="alert"
        className={cn('flex items-center gap-2 rounded-xl border border-status-red-border bg-status-red-bg py-2 pr-2 pl-3 text-sm', className)}
      >
        <WarningCircle aria-hidden className="size-icon-size shrink-0 text-status-red-fg [stroke-width:1.875]" />
        <span className="min-w-0 flex-1 truncate font-medium text-text-default">{file.name}</span>
        <span className="shrink-0 text-status-red-fg">{file.error ?? 'Upload failed'}</span>
        {onRemove && (
          <Button variant="tertiary" size="xs" shape="rounded" iconOnly aria-label={`Remove ${file.name}`} onClick={() => onRemove(file)}>
            <Xmark aria-hidden />
          </Button>
        )}
      </div>
    )
  }

  const known = file.progress != null
  const p = known ? Math.min(100, Math.max(0, file.progress!)) : 0
  const meta = !known
    ? 'Waiting…'
    : file.size != null
      ? `${sentOf(file.size, p)} of ${formatBytes(file.size)} · ${Math.round(p)}%`
      : `${Math.round(p)}%`

  return (
    <div
      data-slot="file-upload-item"
      data-status="uploading"
      className={cn('flex items-center gap-2 rounded-xl border border-border-default bg-bg-card p-2 text-sm', className)}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bg-muted [&_svg]:size-icon-size">
        {file.icon ?? fileIconFor(file.name)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-medium text-text-default">{file.name}</span>
          <span className="shrink-0 text-text-muted tabular-nums">{meta}</span>
        </div>
        <Progress value={known ? p : undefined} showValue={false} aria-label={`Uploading ${file.name}`} />
      </div>
      {onCancel && (
        <Button variant="tertiary" size="xs" shape="rounded" iconOnly aria-label={`Cancel ${file.name}`} onClick={() => onCancel(file)}>
          <Xmark aria-hidden />
        </Button>
      )}
    </div>
  )
}

/** fileUpload/_icon: a filled file with its corner folded and an up arrow cut out of it. */
function UploadMark({ over }: { over?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-xl transition-[background-color] duration-(--duration-fast) ease-(--ease-out)',
        over ? 'bg-bg-card' : 'bg-bg-muted',
      )}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-subtle">
        <path
          d="M6 1.5H11.5V4.5C11.5 5.33 12.17 6 13 6H16V16.5C16 17.6 15.1 18.5 14 18.5H6C4.9 18.5 4 17.6 4 16.5V3.5C4 2.4 4.9 1.5 6 1.5Z"
          fill="currentColor"
        />
        <path d="M12.75 1.75L15.75 4.75H13.25C12.97 4.75 12.75 4.53 12.75 4.25V1.75Z" fill="currentColor" opacity="0.6" />
        <path
          d="M10 15V9.25M7.75 11.5L10 9.25L12.25 11.5"
          stroke="var(--bg-muted)"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
