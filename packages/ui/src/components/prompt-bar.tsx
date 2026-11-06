import * as React from 'react'
import { DropdownMenu, Popover } from 'radix-ui'
import { ArrowUp, Attachment as AttachmentIcon, Check, Globe, Microphone, NavArrowDown, Page, Plus, Search, Xmark } from 'iconoir-react'
import { cn } from '../lib/utils'
import { Button } from './button'

/**
 * PromptBar, 1:1 with the uiKit `PromptBar` set (3158:21803), its input row
 * `_prompterInteractions` (3157:23767), `_dictationButton` (3156:40589), the `Attachment` chips
 * (3141:20409) and the two menus `_dropdowns/addToConversation` (3157:23548) and
 * `dropdowns/models`.
 *
 * The bar: bg/field, 1px border/default, shadow/xs, 8px padding, rows 8px apart. shape
 * default = radius 12 with Default buttons; pill = radius-full on one line, radius 20 once
 * attachments or a second line of text add height, with Rounded buttons. The input row is
 * add (+), the field (14/21, placeholder text/subtle), then 4px apart the model select, dictation
 * and send — all 28px DS buttons. state inactive: border/default and send disabled; active (the
 * field focused, or text to send): border/strong and send enabled.
 *
 * Menus open 8px above: + opens addToConversation across the full width of the bar, the model
 * select opens the models list (241px, right-aligned); the trigger shows its pressed fill.
 * Dictation toggles to the primary button with a three-bar wave that moves while it records.
 * Enter sends, Shift+Enter adds a line.
 */
export interface PromptBarModel {
  value: string
  label: string
  /** 20px in the menu, 16px on the select. */
  icon?: React.ReactNode
}

export interface PromptBarAction {
  id: string
  label: string
  description?: string
  /** 16px icon. */
  icon?: React.ReactNode
  /** Without it, the `upload` action opens the file picker and adds the files as attachments. */
  onSelect?: () => void
}

export interface PromptBarProps extends Omit<React.ComponentProps<'form'>, 'onSubmit'> {
  shape?: 'pill' | 'default'
  /** The text. Pass it with onValueChange to control it. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  /** Files shown as chips above the field; people can remove them before sending. */
  attachments?: File[]
  onAttachmentsChange?: (files: File[]) => void
  /** The selected model's value (or its label, when there is no `models` list). */
  model?: string
  /** The models menu. Without it the select shows `model` and opens nothing. */
  models?: PromptBarModel[]
  onModelChange?: (value: string) => void
  /** Icon on the select when `models` doesn't give one. */
  modelIcon?: React.ReactNode
  /** Rows of the + menu. Defaults to Upload a file and Web search. */
  actions?: PromptBarAction[]
  /** The + at the end of the menu's search row. */
  onAddAgent?: () => void
  onDictationChange?: (recording: boolean) => void
  disabled?: boolean
  onSubmit?: (value: string, attachments: File[]) => void
}

/** Upload a file and Web search: spread them into `actions` to add your own rows after them. */
export const defaultActions: PromptBarAction[] = [
  { id: 'upload', label: 'Upload a file', description: 'Select a file from your computer', icon: <AttachmentIcon /> },
  { id: 'web', label: 'Web search', description: 'Research and find on the internet', icon: <Globe /> },
]

/** Menu card: bg/popover, border/subtle, radius 12, shadow/sm. */
const menuCard = [
  'overflow-clip rounded-xl border border-border-subtle bg-bg-popover',
  '[box-shadow:0_1px_3px_0_var(--effect-shadow-sm),0_1px_2px_-1px_var(--effect-shadow-sm)]',
  'origin-(--radix-popper-transform-origin) data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
  'focus-visible:outline-none',
]

export function PromptBar({
  shape = 'pill',
  value: valueProp,
  defaultValue = '',
  onValueChange,
  placeholder = 'Write a message',
  attachments: attachmentsProp,
  onAttachmentsChange,
  model: modelProp,
  models,
  onModelChange,
  modelIcon,
  actions = defaultActions,
  onAddAgent,
  onDictationChange,
  disabled = false,
  onSubmit,
  className,
  ...props
}: PromptBarProps) {
  const [innerValue, setInnerValue] = React.useState(defaultValue)
  const value = valueProp ?? innerValue
  const [files, setFiles] = React.useState<File[]>(attachmentsProp ?? [])
  React.useEffect(() => setFiles(attachmentsProp ?? []), [attachmentsProp])
  const [model, setModel] = React.useState(modelProp ?? models?.[0]?.value ?? '')
  React.useEffect(() => {
    if (modelProp != null) setModel(modelProp)
  }, [modelProp])
  const [addOpen, setAddOpen] = React.useState(false)
  const [recording, setRecording] = React.useState(false)
  const [multiline, setMultiline] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const setValue = (next: string) => {
    setInnerValue(next)
    onValueChange?.(next)
  }
  const setAttachments = (next: File[]) => {
    setFiles(next)
    onAttachmentsChange?.(next)
  }

  const canSend = !disabled && (value.trim().length > 0 || files.length > 0)
  const current = models?.find((m) => m.value === model)
  const pill = shape === 'pill'
  const btnShape = pill ? 'rounded' : 'default'

  // The field grows with the text, up to six lines; a pill turns into radius 20 once it wraps.
  React.useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const h = Math.min(el.scrollHeight, 6 * 21 + 7)
    el.style.height = `${h}px`
    setMultiline(h > 28)
  }, [value])

  const submit = () => {
    if (!canSend) return
    onSubmit?.(value.trim(), files)
    setValue('')
    setAttachments([])
  }

  const runAction = (action: PromptBarAction) => {
    setAddOpen(false)
    if (action.onSelect) action.onSelect()
    else if (action.id === 'upload') fileRef.current?.click()
  }

  return (
    <Popover.Root open={addOpen} onOpenChange={setAddOpen}>
      <Popover.Anchor asChild>
        <form
          data-slot="prompt-bar"
          data-shape={shape}
          data-filled={value.length > 0 || undefined}
          aria-disabled={disabled || undefined}
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className={cn(
            'flex w-full flex-col gap-2 border border-border-default bg-bg-field p-2 [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
            'transition-[border-color,border-radius] duration-(--duration-fast) ease-(--ease-out)',
            'has-[textarea:focus]:border-border-strong data-filled:border-border-strong',
            pill ? (files.length > 0 || multiline ? 'rounded-3xl' : 'rounded-full') : 'rounded-xl',
            disabled && 'opacity-50',
            className,
          )}
          {...props}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? [])
              if (picked.length) setAttachments([...files, ...picked])
              e.target.value = ''
            }}
          />

          {files.length > 0 && (
            <ul aria-label="Attachments" className="flex flex-wrap gap-1 pb-1">
              {files.map((file, i) => (
                <li key={`${file.name}-${i}`}>
                  <AttachmentChip
                    file={file}
                    rounded={pill}
                    disabled={disabled}
                    onRemove={() => setAttachments(files.filter((_, j) => j !== i))}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-2">
            <Popover.Trigger asChild>
              <Button
                variant="tertiary"
                size="md"
                shape={btnShape}
                iconOnly
                disabled={disabled}
                aria-label="Add to conversation"
                className="data-[state=open]:bg-border-input"
              >
                <Plus />
              </Button>
            </Popover.Trigger>

            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              disabled={disabled}
              placeholder={placeholder}
              aria-label="Message"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  submit()
                }
              }}
              className={cn(
                'block h-7 min-w-0 flex-1 resize-none bg-transparent py-[3.5px] text-base leading-[21px] text-text-default',
                'outline-none placeholder:text-text-subtle focus-visible:ring-0 disabled:cursor-not-allowed',
              )}
            />

            <div className="flex shrink-0 items-center gap-1">
              <ModelSelect
                models={models}
                model={model}
                label={current?.label ?? model}
                icon={current?.icon ?? modelIcon}
                shape={btnShape}
                disabled={disabled}
                onChange={(next) => {
                  setModel(next)
                  onModelChange?.(next)
                }}
              />
              <DictationButton
                shape={btnShape}
                recording={recording}
                disabled={disabled}
                onToggle={() => {
                  setRecording(!recording)
                  onDictationChange?.(!recording)
                }}
              />
              <Button type="submit" variant="primary" size="md" shape={btnShape} iconOnly aria-label="Send" disabled={!canSend}>
                <ArrowUp />
              </Button>
            </div>
          </div>
        </form>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          avoidCollisions={false}
          aria-label="Add to conversation"
          className={cn(menuCard, 'z-50 flex w-(--radix-popper-anchor-width) flex-col')}
        >
          <AddMenu actions={actions} onAction={runAction} onAddAgent={onAddAgent} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/* ---------- add to conversation ---------- */

function AddMenu({
  actions,
  onAction,
  onAddAgent,
}: {
  actions: PromptBarAction[]
  onAction: (a: PromptBarAction) => void
  onAddAgent?: () => void
}) {
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const id = React.useId()
  const q = query.trim().toLowerCase()
  const shown = q
    ? actions.filter((a) => `${a.label} ${a.description ?? ''}`.toLowerCase().includes(q))
    : actions
  const index = Math.min(active, Math.max(shown.length - 1, 0))

  return (
    <>
      <div className="flex items-center gap-1 pr-1.5">
        <label className="flex flex-1 items-center gap-2 px-3 py-1.5">
          <Search aria-hidden className="size-icon-size shrink-0 text-text-muted [stroke-width:1.875]" />
          <input
            role="combobox"
            aria-expanded
            aria-controls={`${id}-list`}
            aria-activedescendant={shown.length ? `${id}-${index}` : undefined}
            aria-label="Search agents and tools"
            placeholder="Search agents and tools"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((index + 1) % Math.max(shown.length, 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((index - 1 + shown.length) % Math.max(shown.length, 1))
              } else if (e.key === 'Enter' && shown[index]) {
                e.preventDefault()
                onAction(shown[index])
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm text-text-default outline-none placeholder:text-text-muted focus-visible:ring-0"
          />
        </label>
        <Button variant="tertiary" size="xs" iconOnly aria-label="Add an agent" onClick={onAddAgent}>
          <Plus />
        </Button>
      </div>
      <div aria-hidden className="h-px bg-border-subtle" />
      <div id={`${id}-list`} role="listbox" aria-label="Agents and tools" className="flex flex-col p-1">
        {shown.map((a, i) => (
          <div
            key={a.id}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === index}
            onPointerMove={() => setActive(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onAction(a)}
            className={cn(
              'flex min-h-8 items-center gap-2 rounded-lg px-2 py-1.5',
              '[&>svg]:size-icon-size [&>svg]:shrink-0 [&>svg]:text-text-muted [&>svg]:[stroke-width:1.875]',
              i === index && 'bg-bg-hover',
            )}
          >
            {a.icon}
            <span className="flex min-w-0 flex-1 items-baseline gap-3">
              <span className="shrink-0 text-sm leading-[13px] font-medium whitespace-nowrap text-text-default">{a.label}</span>
              {a.description && <span className="min-w-0 flex-1 truncate text-sm text-text-muted">{a.description}</span>}
            </span>
          </div>
        ))}
        {shown.length === 0 && <p className="px-2 py-1.5 text-sm text-text-muted">No matches</p>}
      </div>
      <ShortcutHints keyBorder="border-border-subtle" text="text-text-subtle" />
    </>
  )
}

/* ---------- models ---------- */

function ModelSelect({
  models,
  model,
  label,
  icon,
  shape,
  disabled,
  onChange,
}: {
  models?: PromptBarModel[]
  model: string
  label: string
  icon?: React.ReactNode
  shape: 'rounded' | 'default'
  disabled: boolean
  onChange: (value: string) => void
}) {
  if (!label) return null
  const trigger = (
    <Button
      variant="tertiary"
      size="md"
      shape={shape}
      disabled={disabled}
      className="data-[state=open]:bg-border-input"
    >
      {icon && <span className="flex size-4 shrink-0 items-center justify-center [&>*]:size-4">{icon}</span>}
      <span className="sr-only">Model: </span>
      {label}
      <NavArrowDown aria-hidden />
    </Button>
  )
  if (!models?.length) return trigger

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="end"
          sideOffset={8}
          avoidCollisions={false}
          className={cn(menuCard, 'z-50 w-[241px]')}
        >
          <DropdownMenu.RadioGroup value={model} onValueChange={onChange} className="flex flex-col p-1">
            {models.map((m) => (
              <DropdownMenu.RadioItem
                key={m.value}
                value={m.value}
                className={cn(
                  'flex min-h-8 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none select-none',
                  'data-highlighted:bg-bg-hover data-[state=checked]:bg-bg-selected',
                )}
              >
                <span className="flex size-5 shrink-0 items-center justify-center [&>*]:size-5">{m.icon}</span>
                <span className="min-w-0 flex-1 truncate text-sm leading-[13px] font-medium text-text-default">{m.label}</span>
                <DropdownMenu.ItemIndicator>
                  <Check aria-hidden className="size-icon-size text-status-green-fg [stroke-width:1.875]" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <ShortcutHints keyBorder="border-border-default" text="text-text-muted" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** The footer both menus share: ↑ ↓ Navigate, ↵ Select. Keys are 14px caps on bg/card. */
function ShortcutHints({ keyBorder, text }: { keyBorder: string; text: string }) {
  const key = cn(
    'flex size-3.5 items-center justify-center overflow-clip rounded-xs border-[0.5px] bg-bg-card text-text-muted',
    '[box-shadow:0_1px_2px_0_var(--effect-shadow-xs)] [&>svg]:size-2.5',
    keyBorder,
  )
  const label = cn('text-xs leading-4 tracking-normal whitespace-nowrap', text)
  return (
    <div aria-hidden className="flex items-center gap-3 border-t border-border-subtle bg-bg-canvas px-3 py-1.5 dark:bg-bg-muted">
      <span className="flex items-center gap-1">
        <span className="flex items-center gap-0.5">
          <span className={key}>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.00018 8.17963L5.00018 1.82037M8.00316 4.82335L5.00018 1.82037L1.9972 4.82335" />
            </svg>
          </span>
          <span className={key}>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.99982 1.82037L4.99982 8.17963M1.99684 5.17665L4.99982 8.17963L8.0028 5.17665" />
            </svg>
          </span>
        </span>
        <span className={label}>Navigate</span>
      </span>
      <span className="flex items-center gap-1">
        <span className={key}>
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.27083 8.02083L2.8125 6.5625L4.27083 5.10417" />
            <path d="M2.8125 6.5625H5.3125C6.23296 6.5625 6.97917 5.81629 6.97917 4.89583V1.97917" />
          </svg>
        </span>
        <span className={label}>Select</span>
      </span>
    </div>
  )
}

/* ---------- dictation ---------- */

function DictationButton({
  shape,
  recording,
  disabled,
  onToggle,
}: {
  shape: 'rounded' | 'default'
  recording: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const waveRef = React.useRef<SVGSVGElement>(null)

  // The three bars of the wave breathe out of step while recording (transform only).
  React.useEffect(() => {
    const svg = waveRef.current
    if (!recording || !svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const anims = Array.from(svg.querySelectorAll('path')).map((bar, i) =>
      bar.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.45)' }, { transform: 'scaleY(1)' }], {
        duration: 900,
        delay: i * 150,
        iterations: Infinity,
        easing: 'ease-in-out',
      }),
    )
    return () => anims.forEach((a) => a.cancel())
  }, [recording])

  return (
    <Button
      variant={recording ? 'primary' : 'tertiary'}
      size="md"
      shape={shape}
      iconOnly
      disabled={disabled}
      aria-label={recording ? 'Stop dictation' : 'Dictate'}
      aria-pressed={recording}
      onClick={onToggle}
    >
      {recording ? (
        <svg ref={waveRef} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
          <path d="M4.66667 6.33333V9.66633" strokeWidth="1.25" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          <path d="M8 3.66667V12.3337" strokeWidth="1.25" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          <path d="M11.3333 5.33333V10.6663" strokeWidth="1.25" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
        </svg>
      ) : (
        <Microphone />
      )}
    </Button>
  )
}

/* ---------- attachments ---------- */

function AttachmentChip({
  file,
  rounded,
  disabled,
  onRemove,
}: {
  file: File
  rounded: boolean
  disabled: boolean
  onRemove: () => void
}) {
  return (
    <span
      data-slot="attachment"
      className={cn(
        'flex h-control-height items-center gap-1.5 border border-border-default bg-bg-popover pr-0.5 pl-2',
        '[filter:drop-shadow(0_1px_1px_var(--effect-shadow-xs))]',
        'transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-out)',
        'hover:border-border-strong hover:bg-bg-canvas active:border-border-strong active:bg-bg-muted',
        rounded ? 'rounded-full' : 'rounded-md',
      )}
    >
      <FileIcon name={file.name} />
      <span className="max-w-[200px] truncate text-sm font-medium text-text-default">{file.name}</span>
      <Button
        variant="tertiary"
        size="xs"
        shape="rounded"
        iconOnly
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
      >
        <Xmark className="![stroke-width:1.64]" />
      </Button>
    </span>
  )
}

/* File type icons keep their own colours (library primitives), 1:1 with Icon=filePdf/Doc/Xlsx. */
const PAGE =
  'M2.66673 3.33327C2.66673 2.22873 3.56218 1.33327 4.66673 1.33327H5.72127C5.86673 1.33327 6.00339 1.36788 6.13127 1.43709L13.1416 5.22945C13.2695 5.29867 13.3335 5.406 13.3335 5.55145V12.6665C13.3335 13.7711 12.438 14.6665 11.3335 14.6665H4.66673C3.56218 14.6665 2.66673 13.7711 2.66673 12.6665V3.33327Z'
const FOLD = 'M5.93945 1.33327L13.3335 5.33327L10.8985 6.92509C10.2898 7.32303 9.78648 7.21764 9.38855 6.60891L5.93945 1.33327Z'
const LABELS = {
  pdf: [
    'M4.62458 12.9938V10.3491H5.66796C5.86855 10.3491 6.03943 10.3875 6.18062 10.4641C6.3218 10.5398 6.42941 10.6453 6.50345 10.7804C6.57835 10.9147 6.61579 11.0697 6.61579 11.2453C6.61579 11.4209 6.57792 11.5759 6.50216 11.7102C6.4264 11.8445 6.31664 11.9491 6.17287 12.024C6.02996 12.0989 5.85693 12.1363 5.65376 12.1363H4.98873V11.6882H5.56337C5.67098 11.6882 5.75965 11.6697 5.82938 11.6327C5.89997 11.5948 5.95249 11.5428 5.98692 11.4765C6.02222 11.4093 6.03986 11.3323 6.03986 11.2453C6.03986 11.1575 6.02222 11.0809 5.98692 11.0155C5.95249 10.9492 5.89997 10.898 5.82938 10.8618C5.75879 10.8248 5.66925 10.8063 5.56078 10.8063H5.18372V12.9938H4.62458Z',
    'M7.91648 12.9938H6.97898V10.3491H7.92423C8.19024 10.3491 8.41923 10.4021 8.61121 10.508C8.80319 10.613 8.95083 10.7641 9.05413 10.9612C9.1583 11.1584 9.21038 11.3943 9.21038 11.6689C9.21038 11.9444 9.1583 12.1811 9.05413 12.3791C8.95083 12.5771 8.80233 12.729 8.60863 12.8349C8.41579 12.9408 8.18507 12.9938 7.91648 12.9938ZM7.53812 12.5147H7.89323C8.05852 12.5147 8.19756 12.4854 8.31033 12.4269C8.42397 12.3675 8.5092 12.2758 8.56601 12.1518C8.62369 12.027 8.65253 11.866 8.65253 11.6689C8.65253 11.4735 8.62369 11.3138 8.56601 11.1898C8.5092 11.0658 8.4244 10.9746 8.31162 10.916C8.19885 10.8575 8.05982 10.8282 7.89453 10.8282H7.53812V12.5147Z',
    'M9.62458 12.9938V10.3491H11.3756V10.8101H10.1837V11.4403H11.2594V11.9013H10.1837V12.9938H9.62458Z',
  ],
  doc: [
    'M5.02585 12.9938H4.08835V10.3491H5.0336C5.29961 10.3491 5.52861 10.4021 5.72058 10.508C5.91256 10.613 6.0602 10.7641 6.16351 10.9612C6.26767 11.1584 6.31976 11.3943 6.31976 11.6689C6.31976 11.9444 6.26767 12.1811 6.16351 12.3791C6.0602 12.5771 5.9117 12.729 5.718 12.8349C5.52516 12.9408 5.29445 12.9938 5.02585 12.9938ZM4.6475 12.5147H5.00261C5.1679 12.5147 5.30693 12.4854 5.41971 12.4269C5.53334 12.3675 5.61857 12.2758 5.67539 12.1518C5.73307 12.027 5.76191 11.866 5.76191 11.6689C5.76191 11.4735 5.73307 11.3138 5.67539 11.1898C5.61857 11.0658 5.53377 10.9746 5.421 10.916C5.30822 10.8575 5.16919 10.8282 5.0039 10.8282H4.6475V12.5147Z',
    'M9.16422 11.6715C9.16422 11.9598 9.10955 12.2052 9.00022 12.4075C8.89175 12.6098 8.74368 12.7643 8.55601 12.8711C8.36919 12.977 8.15914 13.0299 7.92584 13.0299C7.69082 13.0299 7.4799 12.9766 7.29309 12.8698C7.10628 12.7631 6.95864 12.6085 6.85017 12.4062C6.7417 12.2039 6.68746 11.959 6.68746 11.6715C6.68746 11.3831 6.7417 11.1377 6.85017 10.9354C6.95864 10.7331 7.10628 10.579 7.29309 10.4731C7.4799 10.3664 7.69082 10.313 7.92584 10.313C8.15914 10.313 8.36919 10.3664 8.55601 10.4731C8.74368 10.579 8.89175 10.7331 9.00022 10.9354C9.10955 11.1377 9.16422 11.3831 9.16422 11.6715ZM8.59733 11.6715C8.59733 11.4846 8.56935 11.3271 8.51339 11.1988C8.4583 11.0706 8.38039 10.9733 8.27966 10.907C8.17894 10.8407 8.061 10.8076 7.92584 10.8076C7.79068 10.8076 7.67274 10.8407 7.57202 10.907C7.47129 10.9733 7.39295 11.0706 7.337 11.1988C7.2819 11.3271 7.25435 11.4846 7.25435 11.6715C7.25435 11.8583 7.2819 12.0158 7.337 12.1441C7.39295 12.2723 7.47129 12.3696 7.57202 12.4359C7.67274 12.5022 7.79068 12.5353 7.92584 12.5353C8.061 12.5353 8.17894 12.5022 8.27966 12.4359C8.38039 12.3696 8.4583 12.2723 8.51339 12.1441C8.56935 12.0158 8.59733 11.8583 8.59733 11.6715Z',
    'M11.9118 11.275H11.3462C11.3359 11.2018 11.3148 11.1368 11.283 11.08C11.2511 11.0223 11.2102 10.9733 11.1603 10.9328C11.1103 10.8924 11.0527 10.8614 10.9872 10.8398C10.9227 10.8183 10.8525 10.8076 10.7768 10.8076C10.6399 10.8076 10.5206 10.8416 10.4191 10.9096C10.3175 10.9767 10.2387 11.0749 10.1827 11.204C10.1268 11.3323 10.0988 11.4881 10.0988 11.6715C10.0988 11.86 10.1268 12.0184 10.1827 12.1467C10.2396 12.2749 10.3188 12.3718 10.4204 12.4372C10.5219 12.5026 10.6394 12.5353 10.7729 12.5353C10.8478 12.5353 10.9171 12.5254 10.9808 12.5056C11.0454 12.4858 11.1026 12.457 11.1525 12.4191C11.2025 12.3804 11.2438 12.3335 11.2765 12.2784C11.3101 12.2233 11.3333 12.1604 11.3462 12.0898L11.9118 12.0924C11.8972 12.2138 11.8606 12.3309 11.8021 12.4437C11.7444 12.5556 11.6665 12.6559 11.5683 12.7445C11.4711 12.8324 11.3548 12.9021 11.2197 12.9537C11.0854 13.0045 10.9334 13.0299 10.7638 13.0299C10.528 13.0299 10.317 12.9766 10.1311 12.8698C9.94601 12.7631 9.79966 12.6085 9.69205 12.4062C9.5853 12.2039 9.53192 11.959 9.53192 11.6715C9.53192 11.3831 9.58616 11.1377 9.69463 10.9354C9.8031 10.7331 9.95031 10.579 10.1363 10.4731C10.3222 10.3664 10.5314 10.313 10.7638 10.313C10.9171 10.313 11.0591 10.3345 11.19 10.3775C11.3217 10.4206 11.4383 10.4834 11.5399 10.5661C11.6415 10.6479 11.7242 10.7482 11.7879 10.867C11.8524 10.9858 11.8938 11.1218 11.9118 11.275Z',
  ],
  xls: [
    'M4.54258 10.5469L4.99589 11.3131H5.01346L5.46897 10.5469H6.00571L5.31969 11.6709L6.02107 12.7949H5.47446L5.01346 12.0276H4.99589L4.53489 12.7949H3.99047L4.69405 11.6709L4.00364 10.5469H4.54258Z',
    'M6.30646 12.7949V10.5469H6.78173V12.403H7.74544V12.7949H6.30646Z',
    'M9.27965 11.1934C9.27086 11.1049 9.23318 11.0361 9.16659 10.9871C9.1 10.9381 9.00963 10.9135 8.89548 10.9135C8.81791 10.9135 8.75242 10.9245 8.699 10.9465C8.64559 10.9677 8.60461 10.9973 8.57607 11.0354C8.54826 11.0734 8.53436 11.1166 8.53436 11.1649C8.5329 11.2051 8.54131 11.2403 8.5596 11.2703C8.57863 11.3003 8.60461 11.3263 8.63754 11.3482C8.67046 11.3694 8.70852 11.3881 8.75169 11.4042C8.79486 11.4196 8.84096 11.4327 8.88999 11.4437L9.09195 11.492C9.19001 11.5139 9.28001 11.5432 9.36197 11.5798C9.44392 11.6164 9.5149 11.6614 9.57491 11.7148C9.63491 11.7682 9.68138 11.8312 9.71431 11.9036C9.74797 11.976 9.76516 12.0591 9.76589 12.1528C9.76516 12.2903 9.73004 12.4096 9.66052 12.5106C9.59174 12.6108 9.49222 12.6888 9.36197 12.7444C9.23245 12.7993 9.07622 12.8267 8.89328 12.8267C8.71181 12.8267 8.55375 12.7989 8.41911 12.7433C8.2852 12.6877 8.18056 12.6054 8.10519 12.4963C8.03055 12.3866 7.9914 12.2508 7.98774 12.0891H8.44765C8.45277 12.1645 8.47436 12.2274 8.51241 12.2779C8.55119 12.3277 8.60278 12.3653 8.66717 12.3909C8.7323 12.4158 8.80584 12.4283 8.88779 12.4283C8.96829 12.4283 9.03817 12.4166 9.09744 12.3931C9.15744 12.3697 9.20391 12.3372 9.23684 12.2955C9.26977 12.2537 9.28623 12.2058 9.28623 12.1517C9.28623 12.1012 9.27123 12.0587 9.24123 12.0243C9.21196 11.9899 9.16879 11.9607 9.11171 11.9365C9.05536 11.9124 8.98621 11.8904 8.90426 11.8707L8.65949 11.8092C8.46997 11.7631 8.32032 11.691 8.21056 11.593C8.1008 11.4949 8.04628 11.3628 8.04701 11.1967C8.04628 11.0606 8.0825 10.9417 8.15568 10.84C8.22959 10.7383 8.33093 10.6589 8.45972 10.6018C8.58851 10.5447 8.73486 10.5162 8.89877 10.5162C9.06561 10.5162 9.21123 10.5447 9.33562 10.6018C9.46075 10.6589 9.55808 10.7383 9.62759 10.84C9.69711 10.9417 9.73296 11.0595 9.73516 11.1934H9.27965Z',
    'M10.5312 10.5469L10.9845 11.3131H11.0021L11.4576 10.5469H11.9943L11.3083 11.6709L12.0097 12.7949H11.4631L11.0021 12.0276H10.9845L10.5235 12.7949H9.97911L10.6827 11.6709L9.99228 10.5469H10.5312Z',
  ],
}
const FILE_COLORS = {
  pdf: ['var(--color-red-500)', 'var(--color-red-300)'],
  doc: ['var(--color-sky-600)', 'var(--color-sky-300)'],
  xls: ['var(--color-green-700)', 'var(--color-green-300)'],
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const kind = ext === 'pdf' ? 'pdf' : ext === 'doc' || ext === 'docx' ? 'doc' : ext === 'xls' || ext === 'xlsx' || ext === 'csv' ? 'xls' : null
  if (!kind) return <Page aria-hidden className="size-4 shrink-0 text-text-muted [stroke-width:1.875]" />
  const [page, fold] = FILE_COLORS[kind]
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-4 shrink-0">
      <path d={PAGE} fill={page} />
      <path d={FOLD} fill={fold} />
      {LABELS[kind].map((d, i) => (
        <path key={i} d={d} fill="var(--color-white)" />
      ))}
    </svg>
  )
}
