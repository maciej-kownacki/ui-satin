'use client'

import * as React from 'react'
import {
  $getRoot,
  $getSelection,
  $insertNodes,
  $isParagraphNode,
  $isRangeSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  FORMAT_TEXT_COMMAND,
  TextNode,
  createEditor,
  mergeRegister,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  type TextFormatType,
} from 'lexical'
import { createEmptyHistoryState, registerHistory } from '@lexical/history'
import { $toggleLink, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { ListItemNode, ListNode, registerList } from '@lexical/list'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  $generateNodesFromMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown'
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text'
import { useFormField } from '@uisatin/ui/form-field'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import type { PromptCommand, PromptMention } from '@uisatin/ui/prompt-mentions'
import { CharacterCount } from '@uisatin/ui/textarea'

/**
 * RichTextEditor: a field for notes, emails and job descriptions with headings, lists, quotes,
 * links, bold, italic, strikethrough, inline code and @mentions. It wears Textarea's skin (the
 * `.satin-field` edge, fill and focus ring, at least 96px tall with a resize grip), with a label
 * above, and the hint or the error and a `status` slot (a character count with `maxLength`) under
 * it, so it sits next to Input and Textarea in a Form.
 *
 * The engine is Lexical (an optional peer of `@uisatin/pro`: install `lexical` and the
 * `@lexical/*` packages this entry imports). It's exported only as `@uisatin/pro/rich-text-editor`,
 * never from the package root, so an app that doesn't use it never loads Lexical.
 *
 * - `value` is markdown (`format="markdown"`, the default) or Lexical's JSON (`format="json"`,
 *   `JSON.stringify(editorState.toJSON())`). Controlled (`value`, `onValueChange`) or not
 *   (`defaultValue`).
 * - The markdown is the editor's own spelling: `**bold**`, `*italic*`, `~~struck~~`, `` `code` ``,
 *   `# ` to `### ` headings, `- ` and `1. ` lists (a list keeps the marker it came with, `*` or
 *   `+`), `> ` quotes, `[text](url)` links and `[@Tara Mendes](mention:tara-id)` mentions, one
 *   blank line between blocks. A value spelled another way (`__bold__`, blank lines between list
 *   items) reads the same and comes back in this spelling with the next edit. Nothing is sent on
 *   mount, or for a change of selection.
 * - `onValueChange(value, { mentions })` fires once per edit that changes the value. A `value`
 *   the editor sent itself is never loaded back (so a parent a render behind doesn't undo the
 *   typing); any other `value` replaces the document and clears undo.
 * - Underline, subscript, superscript and highlight aren't supported: pasted text (a Google Docs
 *   link arrives underlined) keeps its bold, italic, links and lists and drops those.
 * - Disabled: not editable, out of the tab order, the field at 60%. Read-only: not editable, but
 *   still focusable and selectable, with `aria-readonly`.
 * - The content is a `role="textbox"` with `aria-multiline`, named by the label (or a FormField's
 *   label, or `aria-label`), described by the hint or the error and the count.
 *
 * Inside a FormField it takes the field's id, label, description, error, `disabled`, `required`
 * and `name`. With `name` a hidden input carries the value into a native form submit.
 *
 * Parts, for an editor of your own: `RichTextEditorRoot` (the engine and the value) ›
 * `RichTextEditorContent` (the field and the editable area). `editorRef` reaches the editor
 * (`focus`, `insert`, `insertText`, `getValue`, `getSelectionRect`). Other props, `ref` included,
 * go to the root `div`; `id`, `aria-label`, `aria-labelledby`, `aria-describedby` and `autoFocus`
 * go to the editable area.
 */

/* ---------- words ---------- */

/** The words the Rich text editor says on its own. They join SatinLabels, so the app translates them there. */
export const richTextEditorLabels = {
  /** The editable area's name when it has no label, no FormField and no `aria-label`. */
  richTextEditor: 'Text editor',
}

type RichTextEditorLabels = typeof richTextEditorLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends RichTextEditorLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...richTextEditorLabels, ...labels }), [labels])
}

/* ---------- types ---------- */

/** Markdown when `format` is `'markdown'`; Lexical's serialized editor state as a JSON string when `'json'`. */
export type RichTextDocument = string

export type RichTextFormat = 'markdown' | 'json'

/** Someone (or something) to mention: Prompt bar's `PromptMention`, with `avatar` for its `icon`. */
export type RichTextMention = PromptMention & {
  /** 20px, before the name in the menu. Wins over `icon`. */
  avatar?: React.ReactNode
}

/** A mention as it sits in the document. */
export interface RichTextMentionRef {
  id: string
  label: string
  /** The character it was typed with, `@` by default. */
  trigger: string
}

/** A slash command: Prompt bar's `PromptCommand`, run where it was typed. */
export type RichTextCommand = Omit<PromptCommand, 'run'> & {
  /** Runs when the command is picked; `insert` puts markdown (or JSON, by `format`) at the caret. */
  run: (ctx: { insert: (value: RichTextDocument) => void; editor: RichTextEditorHandle }) => void
}

export interface RichTextValueDetails {
  /** The mentions in the new value, in order, each once. */
  mentions: RichTextMentionRef[]
}

/** What `editorRef` reaches. */
export interface RichTextEditorHandle {
  /** Focuses the editable area, keeping its selection. */
  focus: () => void
  /** Inserts markdown at the selection (at the end when there is none), parsed into blocks and marks. */
  insert: (markdown: string) => void
  /** Inserts plain text at the selection (at the end when there is none). */
  insertText: (text: string) => void
  /** The current value, in the editor's `format`. */
  getValue: () => RichTextDocument
  /** The selection's rectangle on screen, or null when the selection isn't in the editor. */
  getSelectionRect: () => DOMRect | null
}

/* ---------- MentionNode ---------- */

export type SerializedMentionNode = Spread<{ type: 'mention'; id: string; label: string; trigger: string }, SerializedTextNode>

/**
 * A mention in the document: a token-mode text node that reads "@Tara Mendes" (selected, deleted
 * and copied whole) and keeps the id. Its DOM is Free's `Mention` markup,
 * `<span data-slot="mention" data-mention-id>`, so Free's mention.css styles it.
 */
export class MentionNode extends TextNode {
  __id: string
  __label: string
  __trigger: string

  static getType(): string {
    return 'mention'
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__id, node.__label, node.__trigger, node.__text, node.__key)
  }

  constructor(id: string, label: string, trigger = '@', text?: string, key?: NodeKey) {
    super(text ?? `${trigger}${label}`, key)
    this.__id = id
    this.__label = label
    this.__trigger = trigger
  }

  getId(): string {
    return this.getLatest().__id
  }

  getLabel(): string {
    return this.getLatest().__label
  }

  getTrigger(): string {
    return this.getLatest().__trigger
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const dom = super.createDOM(config, editor)
    dom.setAttribute('data-slot', 'mention')
    dom.setAttribute('data-mention-id', this.__id)
    return dom
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span')
    element.setAttribute('data-slot', 'mention')
    element.setAttribute('data-mention-id', this.__id)
    element.setAttribute('data-mention-label', this.__label)
    element.textContent = this.getTextContent()
    return { element }
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: HTMLElement) =>
        node.hasAttribute('data-mention-id') ? { conversion: $convertMentionElement, priority: 1 } : null,
    }
  }

  static importJSON(json: SerializedMentionNode): MentionNode {
    return $createMentionNode({ id: json.id, label: json.label, trigger: json.trigger }).updateFromJSON(json)
  }

  exportJSON(): SerializedMentionNode {
    return { ...super.exportJSON(), type: 'mention', id: this.getId(), label: this.getLabel(), trigger: this.getTrigger() }
  }

  isTextEntity(): true {
    return true
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }
}

function $convertMentionElement(element: HTMLElement): DOMConversionOutput {
  const id = element.getAttribute('data-mention-id') ?? ''
  const text = element.textContent ?? ''
  const trigger = text.charAt(0) || '@'
  const label = element.getAttribute('data-mention-label') ?? text.slice(1)
  return { node: $createMentionNode({ id, label, trigger }) }
}

export function $createMentionNode({ id, label, trigger = '@' }: { id: string; label: string; trigger?: string }): MentionNode {
  return new MentionNode(id, label, trigger).setMode('token')
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
  return node instanceof MentionNode
}

/* ---------- markdown ---------- */

// A mention is a link to `mention:<id>` whose text is the trigger and the label:
// [@Tara Mendes](mention:tara-id). Plain CommonMark, readable, and the id survives.
const MENTION_RE = /\[([^\s\\\]])((?:\\.|[^\\\]])*)\]\(mention:([^)\s]*)\)/
const escapeLabel = (label: string) => label.replace(/[\\[\]]/g, '\\$&')
const unescapeLabel = (label: string) => label.replace(/\\(.)/g, '$1')

const decodeId = (id: string) => {
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

/** The markdown transformer for mentions. Listed before LINK, which would read it as a link. */
export const MENTION: TextMatchTransformer = {
  dependencies: [MentionNode],
  export: (node, _exportChildren, exportFormat) => {
    if (!$isMentionNode(node)) return null
    const link = `[${node.getTrigger()}${escapeLabel(node.getLabel())}](mention:${encodeURIComponent(node.getId())})`
    // Bold, italic and the rest go around the whole link (**[@Tara](mention:tara)**): the
    // placeholder gets the marks, then the link takes its place, unescaped.
    return exportFormat(node, '\u0000').replace('\u0000', link)
  },
  importRegExp: MENTION_RE,
  regExp: new RegExp(`${MENTION_RE.source}$`),
  replace: (textNode, match) => {
    const [, trigger, label, id] = match
    const mention = $createMentionNode({ id: decodeId(id), label: unescapeLabel(label), trigger })
    mention.setFormat(textNode.getFormat())
    textNode.replace(mention)
  },
  trigger: ')',
  type: 'text-match',
}

/**
 * The markdown the editor reads and writes. No fenced code and no highlight: the editor has no
 * block for the one and no mark for the other.
 */
export const RICH_TEXT_TRANSFORMERS: Transformer[] = [
  HEADING,
  QUOTE,
  UNORDERED_LIST,
  ORDERED_LIST,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  MENTION,
  LINK,
]

/**
 * The mentions in a value, in order, each once (by id). For markdown it reads the
 * `[@Label](mention:id)` links; for JSON, the `mention` nodes.
 */
export function richTextMentions(value: RichTextDocument, format: RichTextFormat = 'markdown'): RichTextMentionRef[] {
  const found: RichTextMentionRef[] = []
  const seen = new Set<string>()
  const add = (m: RichTextMentionRef) => {
    if (seen.has(m.id)) return
    seen.add(m.id)
    found.push(m)
  }
  if (format === 'json') {
    if (!value) return found
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return
      const n = node as { type?: string; id?: string; label?: string; trigger?: string; children?: unknown[] }
      if (n.type === 'mention' && typeof n.id === 'string') add({ id: n.id, label: n.label ?? '', trigger: n.trigger ?? '@' })
      n.children?.forEach(walk)
    }
    try {
      walk((JSON.parse(value) as { root?: unknown }).root)
    } catch {
      // Not JSON: no mentions.
    }
    return found
  }
  for (const m of value.matchAll(new RegExp(MENTION_RE.source, 'g'))) {
    add({ id: decodeId(m[3]), label: unescapeLabel(m[2]), trigger: m[1] })
  }
  return found
}

/* ---------- the engine ---------- */

/** An update that loads a value from outside: it isn't sent back through onValueChange. */
const EXTERNAL_TAG = 'satin-rte-external'
const UNSUPPORTED_FORMATS: TextFormatType[] = ['underline', 'subscript', 'superscript', 'highlight']

const THEME = {
  // The one mark with no element of its own; the rest are styled by element in rich-text-editor.css.
  text: { strikethrough: 'satin-rte-strike' },
}

/** Replaces the document with `value`. JSON goes through `setEditorState`, markdown through an update. */
function loadValue(editor: LexicalEditor, value: string, format: RichTextFormat, tag?: string) {
  if (format === 'json' && value) {
    editor.setEditorState(editor.parseEditorState(value), tag ? { tag } : undefined)
    return
  }
  editor.update(() => $convertFromMarkdownString(format === 'json' ? '' : value, RICH_TEXT_TRANSFORMERS), { discrete: true, tag })
}

function serialize(state: EditorState, format: RichTextFormat): string {
  if (format === 'json') return JSON.stringify(state.toJSON())
  return state.read(() => $convertToMarkdownString(RICH_TEXT_TRANSFORMERS))
}

function readDoc(state: EditorState) {
  return state.read(() => {
    const root = $getRoot()
    const text = root.getTextContent()
    const first = root.getFirstChild()
    const empty = text === '' && root.getChildrenSize() <= 1 && (first === null || $isParagraphNode(first))
    return { length: text.length, empty }
  })
}

function selectionRect(root: HTMLElement | null): DOMRect | null {
  const selection = typeof window === 'undefined' ? null : window.getSelection()
  if (!root || !selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null
  const rect = range.getBoundingClientRect?.()
  if (rect && (rect.width || rect.height)) return rect
  return range.getClientRects?.()[0] ?? root.getBoundingClientRect()
}

/* ---------- context ---------- */

interface RichTextEditorContextValue {
  /** The Lexical editor. Internal: the parts in this file reach it, apps get `RichTextEditorHandle`. */
  editor: LexicalEditor
  format: RichTextFormat
  /** The editable area's id. */
  contentId: string
  /** What names the editable area (a label's id), if anything. */
  labelledBy?: string
  describedBy?: string
  placeholder?: string
  disabled: boolean
  readOnly: boolean
  invalid: boolean
  required: boolean
  /** The document has no text and one empty paragraph: the placeholder shows. */
  empty: boolean
  /** Characters of text, for a count. */
  length: number
  /** The editable area has focus: the field draws its ring. */
  focused: boolean
  setFocused: (focused: boolean) => void
  /** The editable area, once mounted. */
  setContentElement: (element: HTMLElement | null) => void
  contentElement: HTMLElement | null
}

const RichTextEditorContext = React.createContext<RichTextEditorContextValue | null>(null)

function useRichTextEditorContext(part: string) {
  const context = React.useContext(RichTextEditorContext)
  if (!context) throw new Error(`${part} must be inside RichTextEditorRoot (or RichTextEditor).`)
  return context
}

/* ---------- Root ---------- */

export interface RichTextEditorRootProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'id'> {
  /** The document (controlled). Markdown or JSON, by `format`. */
  value?: RichTextDocument
  /** The document to start with (uncontrolled). */
  defaultValue?: RichTextDocument
  /** Each edit that changes the value, with the mentions in it. Never on mount, never for a selection change. */
  onValueChange?: (value: RichTextDocument, details: RichTextValueDetails) => void
  /** `'markdown'` (default) or `'json'` (Lexical's serialized editor state). */
  format?: RichTextFormat
  /** The editable area's id. A FormField's id, or generated, when left out. */
  id?: string
  /** The id of what names the editable area. A FormField's label when left out. */
  labelledBy?: string
  /** Ids added to the editable area's `aria-describedby`, after a FormField's. */
  describedBy?: string
  /** Shown in the empty editor, and its `aria-placeholder`. */
  placeholder?: string
  /** Not editable, out of the tab order, at 60%. A FormField's or Form's when left out. */
  disabled?: boolean
  /** Not editable, still focusable and selectable. */
  readOnly?: boolean
  /** Marks the editor invalid. A FormField's error sets it too. */
  invalid?: boolean
  required?: boolean
  /** Names a hidden input that carries the value in a native form submit. A FormField's `name` when left out. */
  name?: string
  /** The editor's handle: focus, insert, insertText, getValue, getSelectionRect. */
  editorRef?: React.Ref<RichTextEditorHandle>
}

/**
 * The engine and the value, with no look of its own: a `div` (`data-slot="rich-text-editor"`)
 * that holds the parts. Other props, `ref` included, go to the `div`.
 */
export function RichTextEditorRoot({
  value,
  defaultValue,
  onValueChange,
  format = 'markdown',
  id,
  labelledBy,
  describedBy,
  placeholder,
  disabled,
  readOnly = false,
  invalid,
  required,
  name,
  editorRef,
  className,
  children,
  ...props
}: RichTextEditorRootProps) {
  const field = useFormField()
  const autoId = React.useId()
  const contentId = id ?? field?.id ?? autoId
  const isDisabled = disabled ?? field?.disabled ?? false
  const isInvalid = invalid ?? field?.invalid ?? false
  const isRequired = required ?? field?.required ?? false
  const fieldName = name ?? field?.name
  const controlled = value !== undefined

  // Created once (StrictMode runs this twice and keeps one), with the first value loaded in a
  // discrete update: it commits before the root element is set, so it never reaches onValueChange.
  const [editor] = React.useState(() => {
    const instance = createEditor({
      namespace: 'satin-rich-text-editor',
      theme: THEME,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, MentionNode],
      editable: !isDisabled && !readOnly,
      onError: (error) => {
        throw error
      },
    })
    loadValue(instance, value ?? defaultValue ?? '', format)
    return instance
  })

  const initial = value ?? defaultValue ?? ''
  // The last value sent out or taken in, and the values sent out that `value` hasn't come back with yet.
  const lastValue = React.useRef(initial)
  const pending = React.useRef<string[]>([])
  const [uncontrolled, setUncontrolled] = React.useState(initial)
  const current = controlled ? value : uncontrolled
  const [doc, setDoc] = React.useState(() => readDoc(editor.getEditorState()))
  const docRef = React.useRef(doc)
  // The document as last serialised, sent or not.
  const shown = React.useRef('')
  const [focused, setFocused] = React.useState(false)
  const [contentElement, setContentElement] = React.useState<HTMLElement | null>(null)

  const onValueChangeRef = React.useRef(onValueChange)
  React.useEffect(() => {
    onValueChangeRef.current = onValueChange
  })
  const formatRef = React.useRef(format)
  formatRef.current = format
  const controlledRef = React.useRef(controlled)
  controlledRef.current = controlled

  React.useEffect(() => {
    editor.setEditable(!isDisabled && !readOnly)
  }, [editor, isDisabled, readOnly])

  // The root element and every registration in one effect, undone together.
  React.useEffect(() => {
    if (!contentElement) return
    editor.setRootElement(contentElement)
    shown.current = serialize(editor.getEditorState(), formatRef.current)
    const strip = (node: TextNode) => {
      for (const f of UNSUPPORTED_FORMATS) if (node.hasFormat(f)) node.toggleFormat(f)
    }
    const unregister = mergeRegister(
      registerRichText(editor),
      registerList(editor),
      registerHistory(editor, createEmptyHistoryState(), 300),
      editor.registerCommand(
        TOGGLE_LINK_COMMAND,
        (payload) => {
          if (payload === null || typeof payload === 'string') $toggleLink(payload)
          else {
            const { url, ...attributes } = payload
            $toggleLink(url, attributes)
          }
          return true
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      // ⌘U and the rest of the unsupported marks do nothing; pasted ones are stripped below.
      editor.registerCommand(FORMAT_TEXT_COMMAND, (f) => UNSUPPORTED_FORMATS.includes(f), COMMAND_PRIORITY_HIGH),
      editor.registerNodeTransform(TextNode, strip),
      editor.registerNodeTransform(MentionNode, strip),
      editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        const next = readDoc(editorState)
        if (next.empty !== docRef.current.empty || next.length !== docRef.current.length) {
          docRef.current = next
          setDoc(next)
        }
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return
        // Registering transforms marks nodes dirty without changing them (and a mark that's
        // stripped changes nothing): only a different serialisation is an edit.
        const serialized = serialize(editorState, formatRef.current)
        if (serialized === shown.current) return
        shown.current = serialized
        if (tags.has(EXTERNAL_TAG) || serialized === lastValue.current) return
        lastValue.current = serialized
        pending.current.push(serialized)
        if (!controlledRef.current) setUncontrolled(serialized)
        onValueChangeRef.current?.(serialized, { mentions: richTextMentions(serialized, formatRef.current) })
      }),
    )
    return () => {
      unregister()
      editor.setRootElement(null)
    }
  }, [editor, contentElement])

  // A `value` the editor sent itself is an echo: drop it and the older ones from the queue. Any
  // other value replaces the document (never compared with a re-serialisation, which may spell it
  // differently) and clears undo.
  React.useEffect(() => {
    if (value === undefined) return
    const queue = pending.current
    const echo = queue.indexOf(value)
    if (echo !== -1) {
      queue.splice(0, echo + 1)
      return
    }
    if (value === lastValue.current) return
    lastValue.current = value
    queue.length = 0
    loadValue(editor, value, formatRef.current, EXTERNAL_TAG)
    shown.current = serialize(editor.getEditorState(), formatRef.current)
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined)
  }, [editor, value])

  React.useImperativeHandle(
    editorRef,
    (): RichTextEditorHandle => {
      const $selectionOrEnd = () => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) return selection
        $getRoot().selectEnd()
        return $getSelection()
      }
      return {
        focus: () => {
          // Focus now (Lexical's focus restores the selection in an update, a moment later).
          editor.getRootElement()?.focus({ preventScroll: true })
          editor.focus()
        },
        insert: (markdown) =>
          editor.update(
            () => {
              const selection = $selectionOrEnd()
              if (!$isRangeSelection(selection)) return
              $insertNodes($generateNodesFromMarkdownString(markdown, RICH_TEXT_TRANSFORMERS))
            },
            { discrete: true },
          ),
        insertText: (text) =>
          editor.update(
            () => {
              const selection = $selectionOrEnd()
              if ($isRangeSelection(selection)) selection.insertText(text)
            },
            { discrete: true },
          ),
        getValue: () => serialize(editor.getEditorState(), formatRef.current),
        getSelectionRect: () => selectionRect(editor.getRootElement()),
      }
    },
    [editor],
  )

  const context: RichTextEditorContextValue = {
    editor,
    format,
    contentId,
    labelledBy: labelledBy ?? field?.labelId,
    describedBy: [field?.describedBy, describedBy].filter(Boolean).join(' ') || undefined,
    placeholder,
    disabled: isDisabled,
    readOnly,
    invalid: isInvalid,
    required: isRequired,
    empty: doc.empty,
    length: doc.length,
    focused,
    setFocused,
    contentElement,
    setContentElement,
  }

  return (
    <RichTextEditorContext.Provider value={context}>
      <div
        data-slot="rich-text-editor"
        data-disabled={isDisabled || undefined}
        data-readonly={readOnly || undefined}
        className={cn('satin-rte-root', className)}
        {...props}
      >
        {children}
        {fieldName && <input type="hidden" name={fieldName} value={current} disabled={isDisabled} />}
      </div>
    </RichTextEditorContext.Provider>
  )
}

/* ---------- Content ---------- */

export interface RichTextEditorContentProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Drawn inside the field, before the editable area: where a toolbar goes. */
  // TODO(P2b): RichTextToolbar goes here.
  children?: React.ReactNode
  /** Focus the editor on mount. */
  autoFocus?: boolean
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus'
}

/**
 * The field (`.satin-field`, Textarea's skin) with the editable area in it
 * (`data-slot="rich-text-editor-content"`, `role="textbox"`), the placeholder and the resize
 * grip. `className` and the field's other props go to the field; `id`, `aria-label`,
 * `aria-labelledby`, `aria-describedby` and `autoFocus` to the editable area.
 */
export function RichTextEditorContent({
  children,
  className,
  id,
  autoFocus,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'data-force': force,
  ...props
}: RichTextEditorContentProps) {
  const labels = useLabels()
  const ctx = useRichTextEditorContext('RichTextEditorContent')
  const { editor, setContentElement, setFocused } = ctx
  const editable = !ctx.disabled && !ctx.readOnly
  const labelledBy = ariaLabelledBy ?? (ariaLabel ? undefined : ctx.labelledBy)
  const describedBy = [ariaDescribedBy, ctx.describedBy].filter(Boolean).join(' ') || undefined

  React.useEffect(() => {
    if (autoFocus && ctx.contentElement) editor.focus()
    // Only on mount, once the editable area is there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.contentElement])

  return (
    <div
      data-slot="rich-text-editor-field"
      data-invalid={ctx.invalid || undefined}
      data-disabled={ctx.disabled || undefined}
      data-filled={!ctx.empty || undefined}
      data-focused={ctx.focused || undefined}
      data-force={force ?? (ctx.focused ? 'focus' : undefined)}
      className={cn('satin-field satin-rte', className)}
      {...props}
    >
      {children}
      <div className="satin-rte-scroll">
        <div
          ref={setContentElement}
          id={id ?? ctx.contentId}
          data-slot="rich-text-editor-content"
          className="satin-rte-content"
          contentEditable={editable}
          suppressContentEditableWarning
          role="textbox"
          tabIndex={ctx.disabled ? undefined : 0}
          aria-multiline
          aria-label={ariaLabel ?? (labelledBy ? undefined : labels.richTextEditor)}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={ctx.invalid || undefined}
          aria-required={ctx.required || undefined}
          aria-readonly={ctx.readOnly || undefined}
          aria-disabled={ctx.disabled || undefined}
          aria-placeholder={ctx.empty && ctx.placeholder ? ctx.placeholder : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {ctx.empty && ctx.placeholder && (
          <div className="satin-rte-placeholder" aria-hidden>
            {ctx.placeholder}
          </div>
        )}
      </div>
      {/* Textarea's grip, 7px at 1px in text/subtle. */}
      <svg className="satin-rte-grip" viewBox="0 0 7 7" fill="none" aria-hidden>
        <path d="M6.5 0.5L0.5 6.5M6.5 4L4 6.5" stroke="currentColor" strokeLinecap="round" />
      </svg>
    </div>
  )
}

/* ---------- RichTextEditor ---------- */

export interface RichTextEditorProps extends Omit<RichTextEditorRootProps, 'children' | 'labelledBy' | 'describedBy' | 'invalid'> {
  label?: React.ReactNode
  /** Adds a muted "(Optional)" after the label: the `optional` label. */
  optional?: boolean
  hint?: React.ReactNode
  /** An error message (replaces the hint), or `true` to mark the editor invalid without one. */
  error?: React.ReactNode | boolean
  /** Under the field on the right, like Textarea's counter: "Saved", a count of your own. */
  status?: React.ReactNode
  /** Shows a `length/maxLength` count of the text (not the markdown) in the status slot. Not enforced. */
  maxLength?: number
  /** Focus the editor on mount. */
  autoFocus?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  /** Classes for the field (the edge and the editable area). `className` styles the outer wrapper. */
  fieldClassName?: string
  /** The formatting toolbar: `true` (default), `'minimal'` (bold, italic, list, link) or `false`. Not drawn yet. */
  // TODO(P2b): the toolbar, the link popover and the selection bubble.
  toolbar?: boolean | 'minimal'
  /** The `@` menu: where mentions come from. Not wired yet; mentions in a value already load and round-trip. */
  // TODO(P2c): the mention menu, on Free's PromptMentionsMenu and usePromptMenuState.
  mentions?: {
    /** The character that opens the menu. Defaults to `@`. */
    trigger?: string
    search: (query: string) => RichTextMention[] | Promise<RichTextMention[]>
  }
  /** The `/` menu. Not wired yet. */
  // TODO(P2c): the command menu.
  commands?: RichTextCommand[]
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus'
}

/**
 * The editor for the common case: `RichTextEditorRoot` and `RichTextEditorContent` with a label,
 * the hint or the error, and the status row. Other props, `ref` included, go to the root `div`.
 */
export function RichTextEditor({
  label,
  optional,
  hint,
  error,
  status,
  maxLength,
  autoFocus,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  fieldClassName,
  className,
  // TODO(P2b, P2c): the toolbar, the mention menu and the command menu.
  toolbar: _toolbar,
  mentions: _mentions,
  commands: _commands,
  'data-force': force,
  ...props
}: RichTextEditorProps) {
  const labels = useLabels()
  const field = useFormField()
  const autoId = React.useId()
  const contentId = id ?? field?.id ?? autoId
  const hasMessage = typeof error === 'string' || React.isValidElement(error)
  const message = hasMessage ? error : hint
  const labelId = label ? `${contentId}-label` : undefined
  const messageId = message ? `${contentId}-hint` : undefined
  const counterId = maxLength != null ? `${contentId}-counter` : undefined
  const statusId = status != null && status !== false ? `${contentId}-status` : undefined
  const editorRef = React.useRef<RichTextEditorHandle>(null)
  const outerEditorRef = props.editorRef
  const editorRefs = React.useMemo(() => mergeRefs(outerEditorRef, editorRef), [outerEditorRef])

  return (
    <RichTextEditorRoot
      {...props}
      id={contentId}
      labelledBy={labelId}
      describedBy={[messageId, counterId, statusId].filter(Boolean).join(' ') || undefined}
      invalid={Boolean(error) || (field?.invalid ?? false)}
      editorRef={editorRefs}
      className={cn('grid w-full gap-2', className)}
    >
      {label && (
        <div className="flex items-center gap-1">
          <label
            id={labelId}
            onClick={(e) => {
              // A label can't point at a contenteditable box: it focuses the editor itself.
              e.preventDefault()
              editorRef.current?.focus()
            }}
            className="text-sm leading-[18px] font-medium text-text-default"
          >
            {label}
          </label>
          {optional && <span className="text-sm text-text-muted">{labels.optional}</span>}
        </div>
      )}
      <RichTextEditorContent
        className={fieldClassName}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        data-force={force}
      />
      <StatusRow message={message} messageId={messageId} isError={hasMessage} status={status} statusId={statusId} maxLength={maxLength} counterId={counterId} />
    </RichTextEditorRoot>
  )
}

function StatusRow({
  message,
  messageId,
  isError,
  status,
  statusId,
  maxLength,
  counterId,
}: {
  message: React.ReactNode
  messageId?: string
  isError: boolean
  status: React.ReactNode
  statusId?: string
  maxLength?: number
  counterId?: string
}) {
  const ctx = useRichTextEditorContext('RichTextEditor')
  if (!message && !statusId && maxLength == null) return null
  return (
    <div className={cn('flex items-start gap-2 text-sm', isError ? 'text-text-destructive' : 'text-text-muted')}>
      <p id={messageId} className="min-w-0 flex-1">
        {message}
      </p>
      {statusId && (
        <div id={statusId} className="shrink-0 text-sm whitespace-nowrap text-text-muted">
          {status}
        </div>
      )}
      {maxLength != null && (
        <CharacterCount id={counterId} count={ctx.length} max={maxLength} className={isError ? 'text-text-destructive' : undefined} />
      )}
    </div>
  )
}

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  return (value) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === 'function') return ref(value)
      if (ref) (ref as React.RefObject<T | null>).current = value
    })
    return () => {
      refs.forEach((ref, i) => {
        const cleanup = cleanups[i]
        if (typeof cleanup === 'function') cleanup()
        else if (typeof ref === 'function') ref(null)
        else if (ref) (ref as React.RefObject<T | null>).current = null
      })
    }
  }
}
