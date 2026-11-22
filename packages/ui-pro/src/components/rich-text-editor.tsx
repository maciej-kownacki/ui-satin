'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isLineBreakNode,
  $isTextNode,
  $setSelection,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  FORMAT_TEXT_COMMAND,
  HISTORY_MERGE_TAG,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  TextNode,
  createEditor,
  mergeRegister,
  type BaseSelection,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type EditorState,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type RangeSelection,
  type SerializedTextNode,
  type Spread,
  type TextFormatType,
} from 'lexical'
import { createEmptyHistoryState, registerHistory } from '@lexical/history'
import { $createLinkNode, $isLinkNode, $toggleLink, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  $isListItemNode,
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
  registerList,
} from '@lexical/list'
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
  type MultilineElementTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown'
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
  registerRichText,
} from '@lexical/rich-text'
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
  registerTableCellUnmergeTransform,
  registerTablePlugin,
  registerTableSelectionObserver,
} from '@lexical/table'
import { Bold, Code, Italic, Link as LinkIcon, List, NavArrowDown, NumberedListLeft, NumberedListRight, Quote, Strikethrough } from 'iconoir-react'
import { Button } from '@uisatin/ui/button'
import { DropdownMenu, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@uisatin/ui/dropdown'
import { useFormField } from '@uisatin/ui/form-field'
import { Input } from '@uisatin/ui/input'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { PopoverPanel } from '@uisatin/ui/popover'
import {
  PromptMentionsMenu,
  usePromptMenuState,
  type PromptCommand,
  type PromptMention,
  type PromptMenuItem,
  type PromptMenuQuery,
  type PromptMenuState,
} from '@uisatin/ui/prompt-mentions'
import { CharacterCount } from '@uisatin/ui/textarea'
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarToggle,
  type ToolbarButtonProps,
  type ToolbarProps,
  type ToolbarToggleProps,
} from '@uisatin/ui/toolbar'

/**
 * RichTextEditor: a field for notes, emails and job descriptions with headings, lists, quotes,
 * tables, links, bold, italic, strikethrough, inline code and @mentions. It wears Textarea's skin (the
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
 *   `+`), `> ` quotes, `[text](url)` links, `[@Tara Mendes](mention:tara-id)` mentions and GFM
 *   tables (`| a | b |` rows, a `| --- | --- |` divider under the header row, `\|` for a pipe in
 *   a cell, `<br>` between a cell's paragraphs), one blank line between blocks. A value spelled
 *   another way (`__bold__`, blank lines between list items) reads the same and comes back in
 *   this spelling with the next edit. Nothing is sent on mount, or for a change of selection.
 * - `onValueChange(value, { mentions })` fires once per edit that changes the value. A `value`
 *   the editor sent itself is never loaded back (so a parent a render behind doesn't undo the
 *   typing); any other `value` replaces the document and clears undo.
 * - Tables come in through markdown (a command's `insert`, a value) or a pasted HTML table,
 *   whose merged cells are split (markdown has none); there are no controls to add rows or
 *   columns. Tab and Shift+Tab move between cells; outside a table Tab leaves the editor.
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
 * - Formatting: a toolbar inside the field (`toolbar`, `'minimal'` or `false`) and a bubble over
 *   a pointer selection (`selectionToolbar`). Shortcuts: ⌘B, ⌘I, ⌘⇧X strikethrough, ⌘E code,
 *   ⌘⇧8 and ⌘⇧7 lists, ⌘K link (a popover under the selection), Ctrl for ⌘ off Apple. ⌥F10 in
 *   the text goes to the toolbar (or opens the bubble without one), Escape comes back.
 * - Mentions and commands: Prompt bar's menu under the trigger character. `@` (or
 *   `mentions.trigger`) at a block's start or after a space opens `mentions.search`'s answers; a
 *   pick goes in as a mention, "@Tara Mendes", one unit (Backspace takes it whole), then a space.
 *   `/` there opens `commands`; a pick takes "/query" out and runs the command, whose `insert`
 *   puts markdown at the caret. ↑ ↓ move, Enter or Tab pick, Escape closes the menu until the
 *   next trigger (and only then is taken, so a Dialog around it still closes on the next one).
 *   The text points at the list with `aria-controls` and `aria-activedescendant`; a status
 *   region says how many suggestions there are and which mention went in or out. An input
 *   method's text never opens a menu.
 *
 * Parts, for an editor of your own: `RichTextEditorRoot` (the engine and the value) ›
 * `RichTextEditorContent` (the field and the editable area) › `RichTextToolbar` (inside it),
 * and `RichTextSelectionToolbar`; items for a toolbar of your own are `RichTextBlockTypeMenu`,
 * `RichTextFormatToggle`, `RichTextBlockToggle` and `RichTextLinkButton`. `editorRef` reaches the editor
 * (`focus`, `insert`, `insertText`, `getValue`, `getSelectionRect`). Other props, `ref` included,
 * go to the root `div`; `id`, `aria-label`, `aria-labelledby`, `aria-describedby` and `autoFocus`
 * go to the editable area.
 */

/* ---------- words ---------- */

/** The words the Rich text editor says on its own. They join SatinLabels, so the app translates them there. */
export const richTextEditorLabels = {
  /** The editable area's name when it has no label, no FormField and no `aria-label`. */
  richTextEditor: 'Text editor',
  /** The formatting toolbar above the text. */
  richTextToolbar: 'Formatting',
  /** The bubble over a selection. */
  richTextSelectionToolbar: 'Selection formatting',
  /** The text style menu. */
  richTextStyle: 'Text style',
  /** The text style button's name: what it's for, then the style it shows (which is its text). */
  richTextStyleOf: (style: string) => `Text style: ${style}`,
  richTextParagraph: 'Paragraph',
  richTextHeading1: 'Heading 1',
  richTextHeading2: 'Heading 2',
  richTextHeading3: 'Heading 3',
  richTextBold: 'Bold',
  richTextItalic: 'Italic',
  richTextStrikethrough: 'Strikethrough',
  richTextCode: 'Code',
  richTextBulletList: 'Bullet list',
  richTextNumberedList: 'Numbered list',
  richTextQuote: 'Quote',
  richTextLink: 'Link',
  /** The link popover's title for a new link. */
  richTextAddLink: 'Add link',
  /** The link popover's title in a link. */
  richTextEditLink: 'Edit link',
  richTextRemoveLink: 'Remove link',
  /** The address field's name in the link popover. */
  richTextUrl: 'URL',
  richTextUrlPlaceholder: 'Paste or type a link',
  richTextUrlInvalid: 'Enter a web address, an email address or a path.',
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

/** Where the `@` menu's people and records come from: Prompt bar's `PromptMentions`, with `avatar`. */
export interface RichTextMentions {
  /** The character that opens the menu. One character, not `/`. Defaults to `@`. */
  trigger?: string
  /** What matches the text typed after the trigger ("" right after it). It can return a promise; a slow answer for an older query is dropped. */
  search: (query: string) => RichTextMention[] | Promise<RichTextMention[]>
}

/** A slash command: Prompt bar's `PromptCommand`, run where it was typed. */
export type RichTextCommand = Omit<PromptCommand, 'run'> & {
  /**
   * Runs when the command is picked, once "/query" is gone from the text. `insert` puts markdown
   * at the caret (as `editorRef`'s `insert`, whatever the `format`); `editor` is the handle.
   */
  run: (ctx: { insert: (markdown: string) => void; editor: RichTextEditorHandle }) => void
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

/**
 * A link never holds a mention: markdown can't nest a link in a link, so it wouldn't come back.
 * The mention moves out after the link, which splits around it (the part after it keeps the
 * address); a link left empty goes.
 */
function $moveMentionsOutOfLink(link: LinkNode) {
  let current = link
  for (;;) {
    const mention = current.getChildren().find($isMentionNode)
    if (!mention) return
    const after = mention.getNextSiblings()
    const url = current.getURL()
    const attributes = { rel: current.getRel(), target: current.getTarget(), title: current.getTitle() }
    current.insertAfter(mention)
    if (current.isEmpty()) current.remove()
    if (!after.length) return
    const rest = $createLinkNode(url, attributes)
    rest.append(...after)
    mention.insertAfter(rest)
    current = rest
  }
}

/* ---------- markdown ---------- */

// A mention is a link to `mention:<id>` whose text is the trigger and the label:
// [@Tara Mendes](mention:tara-id). Plain CommonMark, readable, and the id survives. The trigger
// is a symbol (never a letter, a digit or a bracket) and the label holds no unescaped bracket,
// so link text that only ends in a mention (`[see [@Ann](mention:a)](…)`) never reads as one.
const MENTION_RE = /\[([^\s\\[\]\p{L}\p{N}])((?:\\.|[^\\[\]])*)\]\(mention:([^)\s]*)\)/u
const escapeLabel = (label: string) => label.replace(/[\\[\]]/g, '\\$&')
const unescapeLabel = (label: string) => label.replace(/\\(.)/g, '$1')

const decodeId = (id: string) => {
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

/**
 * The markdown transformer for mentions. Listed before LINK, which would read it as a link.
 * Plain text that reads like a mention (typed or pasted `[@Tara](mention:tara)`) needs nothing
 * here: Lexical writes its brackets as `&#91;` and `&#93;`, so it comes back as text.
 */
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
  regExp: new RegExp(`${MENTION_RE.source}$`, 'u'),
  replace: (textNode, match) => {
    const [, trigger, label, id] = match
    const mention = $createMentionNode({ id: decodeId(id), label: unescapeLabel(label), trigger })
    mention.setFormat(textNode.getFormat())
    textNode.replace(mention)
  },
  trigger: ')',
  type: 'text-match',
}

/* GFM tables: `| a | b |` rows, a `| --- | --- |` divider under the header row. */
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/
const TABLE_DIVIDER_RE = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/
/** A line break inside a cell, which a row can't hold as a newline. */
const CELL_BREAK_RE = /<br\s*\/?>/i

/**
 * A row's cells: split on the pipes that aren't escaped, with `\|` read back as `|` (a GFM
 * escape that belongs to the table, not to the cell's markdown). Other escapes stay for the
 * cell's own reading.
 */
function splitTableRow(line: string): string[] {
  const inner = line.trim().slice(1)
  const cells: string[] = []
  let cell = ''
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!
    const next = inner[i + 1]
    if (ch === '\\' && next !== undefined) {
      cell += next === '|' ? '|' : ch + next
      i++
    } else if (ch === '|') {
      cells.push(cell.trim())
      cell = ''
    } else cell += ch
  }
  return cells
}

/** A cell from its markdown: inline marks, links and mentions, `<br>` between paragraphs. */
function $createTableCell(markdown: string, header: boolean): TableCellNode {
  const cell = $createTableCellNode(header ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS)
  const blocks = markdown.split(CELL_BREAK_RE).join('\n\n')
  const nodes = blocks.trim() ? $generateNodesFromMarkdownString(blocks, RICH_TEXT_TRANSFORMERS) : []
  cell.append(...(nodes.length ? nodes : [$createParagraphNode()]))
  return cell
}

/**
 * The markdown transformer for tables (GFM). The first row is the header; a row with fewer
 * cells is filled with empty ones, one with more loses the rest. A cell's text goes through the
 * same transformers (marks, links, mentions), with `|` escaped as `\|` and its paragraphs joined
 * by `<br>`. A table always goes out with a header row: GFM has no table without one.
 */
export const TABLE: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node) => {
    if (!$isTableNode(node)) return null
    const rows: string[] = []
    for (const row of node.getChildren()) {
      if (!$isTableRowNode(row)) continue
      const cells = row.getChildren().filter($isTableCellNode).map((cell) =>
        $convertToMarkdownString(RICH_TEXT_TRANSFORMERS, cell)
          .trim()
          .replace(/\n+/g, '<br>')
          .replace(/\|/g, '\\|'),
      )
      rows.push(`| ${cells.join(' | ')} |`)
      if (rows.length === 1) rows.push(`| ${cells.map(() => '---').join(' | ')} |`)
    }
    return rows.length ? rows.join('\n') : null
  },
  regExpStart: TABLE_ROW_RE,
  handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex }) => {
    const divider = lines[startLineIndex + 1]
    if (divider === undefined || !TABLE_DIVIDER_RE.test(divider)) return null
    const header = splitTableRow(lines[startLineIndex]!)
    if (splitTableRow(divider).length !== header.length) return null
    const rows = [header]
    let end = startLineIndex + 1
    while (end + 1 < lines.length && TABLE_ROW_RE.test(lines[end + 1]!)) rows.push(splitTableRow(lines[++end]!))
    const table = $createTableNode()
    rows.forEach((cells, index) => {
      const row = $createTableRowNode()
      for (let column = 0; column < header.length; column++) row.append($createTableCell(cells[column] ?? '', index === 0))
      table.append(row)
    })
    rootNode.append(table)
    return [true, end]
  },
  // Only read through handleImportAfterStartMatch (the editor has no markdown shortcuts).
  replace: () => false,
  type: 'multiline-element',
}

/** The nodes the editor (and a headless editor reading its value) needs. */
export const RICH_TEXT_NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, MentionNode, TableNode, TableRowNode, TableCellNode]

/**
 * The markdown the editor reads and writes. No fenced code and no highlight: the editor has no
 * block for the one and no mark for the other.
 */
export const RICH_TEXT_TRANSFORMERS: Transformer[] = [
  TABLE,
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
 * Where the code spans are, as [start, end) pairs: a run of backticks opens one and the next run
 * of the same length closes it, scanned left to right (CommonMark). A run with no match is text.
 */
function codeSpans(text: string): [number, number][] {
  const spans: [number, number][] = []
  const runAt = (i: number) => {
    let n = 0
    while (text[i + n] === '`') n++
    return n
  }
  let i = 0
  while (i < text.length) {
    if (text[i] !== '`') {
      i++
      continue
    }
    const open = runAt(i)
    let j = i + open
    let close = -1
    while (j < text.length) {
      if (text[j] !== '`') {
        j++
        continue
      }
      const run = runAt(j)
      if (run === open) {
        close = j
        break
      }
      j += run
    }
    if (close === -1) {
      i += open
      continue
    }
    spans.push([i, close + open])
    i = close + open
  }
  return spans
}

/**
 * The mentions in a value, in order, each once (by id). For markdown it reads the
 * `[@Label](mention:id)` links outside code spans; for JSON, the `mention` nodes.
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
  // A code span's text and an escaped bracket are text, not mentions, as the editor reads them.
  // Code spans are found with every backslash escape blanked (an escaped backtick opens none),
  // then blanked in the value itself, whose escapes the labels still need.
  let text = value
  for (const [start, end] of codeSpans(value.replace(/\\[\s\S]/g, '  '))) {
    text = text.slice(0, start) + ' '.repeat(end - start) + text.slice(end)
  }
  for (const m of text.matchAll(new RegExp(MENTION_RE.source, 'gu'))) {
    if (/(^|[^\\])(\\\\)*\\$/.test(text.slice(0, m.index))) continue
    add({ id: decodeId(m[3]), label: unescapeLabel(m[2]), trigger: m[1] })
  }
  return found
}

/* ---------- the engine ---------- */

/** Values sent out and not yet back through `value`: a parent this many edits behind loads its value as new. */
const MAX_PENDING = 50

/** An update that loads a value from outside: it isn't sent back through onValueChange. */
const EXTERNAL_TAG = 'satin-rte-external'
const UNSUPPORTED_FORMATS: TextFormatType[] = ['underline', 'subscript', 'superscript', 'highlight']

const THEME = {
  // The one mark with no element of its own; the rest are styled by element in rich-text-editor.css.
  text: { strikethrough: 'satin-rte-strike' },
  // A selection across table cells: the cells it covers, and the table while it has one.
  tableCellSelected: 'satin-rte-cell-selected',
  tableSelection: 'satin-rte-table-selection',
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

/**
 * Characters of text as a textarea counts them: every text node (a mention's "@Label" too), one
 * for each line break, and one between blocks (paragraphs, list items, a table cell's
 * paragraphs), not the blank line Lexical's text content puts there.
 */
function $countCharacters(): number {
  let characters = 0
  let blocks = 0
  const walk = (node: LexicalNode) => {
    if ($isTextNode(node)) characters += node.getTextContentSize()
    else if ($isLineBreakNode(node)) characters += 1
    else if ($isElementNode(node)) {
      const children = node.getChildren()
      const leaf = !node.isInline() && !$isRootOrShadowRoot(node) && !children.some((c) => $isElementNode(c) && !c.isInline())
      if (leaf) blocks++
      children.forEach(walk)
    }
  }
  walk($getRoot())
  return characters + Math.max(0, blocks - 1)
}

function readDoc(state: EditorState) {
  return state.read(() => {
    const root = $getRoot()
    const first = root.getFirstChild()
    const length = $countCharacters()
    const empty = length === 0 && root.getChildrenSize() <= 1 && (first === null || $isParagraphNode(first))
    return { length, empty }
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

/** Something a layer opens next to that isn't an element: a selection's or a character's rect. */
interface VirtualAnchor {
  getBoundingClientRect(): DOMRect
  /** The element the rect lives in, so scrolling its ancestors moves the layer with it. */
  contextElement?: Element
}

/* ---------- formatting ---------- */

/** A mark the toolbars toggle. */
export type RichTextMark = 'bold' | 'italic' | 'strikethrough' | 'code'

/** The block the selection starts in, as the toolbars name it. Headings past h3 read as paragraphs. */
export type RichTextBlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'quote'

/** What the selection is: its marks, its block, and whether it's in a link. The toolbars' pressed states. */
export interface RichTextSelectionState {
  bold: boolean
  italic: boolean
  strikethrough: boolean
  code: boolean
  block: RichTextBlockType
  link: boolean
}

const NO_SELECTION: RichTextSelectionState = { bold: false, italic: false, strikethrough: false, code: false, block: 'paragraph', link: false }

const sameState = (a: RichTextSelectionState, b: RichTextSelectionState) =>
  (Object.keys(a) as (keyof RichTextSelectionState)[]).every((key) => a[key] === b[key])

/** ⌘ on Apple platforms, Ctrl elsewhere, as Lexical reads ⌘B and ⌘I. */
const isApple = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
const noop = () => () => {}
/** Read after hydration, so the server's Ctrl and a Mac's ⌘ never disagree in the markup. */
const useIsApple = () => React.useSyncExternalStore(noop, isApple, () => false)
/** A shortcut as the tooltip shows it: "⌘⇧X" on a Mac, "Ctrl+Shift+X" elsewhere. */
const shortcutOf = (apple: boolean, key: string, shift = false) => (apple ? `⌘${shift ? '⇧' : ''}${key}` : `Ctrl+${shift ? 'Shift+' : ''}${key}`)

function $linkOf(node: LexicalNode | null): LinkNode | null {
  for (let n = node; n; n = n.getParent()) if ($isLinkNode(n)) return n
  return null
}

function $blockTypeOf(selection: RangeSelection): RichTextBlockType {
  for (let n: LexicalNode | null = selection.anchor.getNode(); n; n = n.getParent()) {
    if ($isListNode(n)) return n.getListType() === 'number' ? 'number' : 'bullet'
    if ($isQuoteNode(n)) return 'quote'
    if ($isHeadingNode(n)) {
      const tag = n.getTag()
      return tag === 'h1' || tag === 'h2' || tag === 'h3' ? tag : 'paragraph'
    }
  }
  return 'paragraph'
}

/**
 * Whether the selection has a mark: the caret's own format when collapsed, else every text node
 * it covers (an edge node it only touches doesn't count). The selection's `format` follows only
 * the browser's selection, not one set in an update.
 */
function $selectionHas(selection: RangeSelection, mark: RichTextMark) {
  if (selection.isCollapsed()) return selection.hasFormat(mark)
  const [start, end] = selection.isBackward() ? [selection.focus, selection.anchor] : [selection.anchor, selection.focus]
  const covered = selection.getNodes().filter((node): node is TextNode => {
    if (!$isTextNode(node)) return false
    if (start.type === 'text' && node.getKey() === start.key && start.offset === node.getTextContentSize()) return false
    if (end.type === 'text' && node.getKey() === end.key && end.offset === 0) return false
    return true
  })
  return covered.length > 0 && covered.every((node) => node.hasFormat(mark))
}

function $readSelectionState(): RichTextSelectionState {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return NO_SELECTION
  return {
    bold: $selectionHas(selection, 'bold'),
    italic: $selectionHas(selection, 'italic'),
    strikethrough: $selectionHas(selection, 'strikethrough'),
    code: $selectionHas(selection, 'code'),
    block: $blockTypeOf(selection),
    link: $linkOf(selection.anchor.getNode()) !== null || $linkOf(selection.focus.getNode()) !== null,
  }
}

/** The editor's selection, kept while focus is in a menu or the link popover. */
const saveSelection = (editor: LexicalEditor) => editor.getEditorState().read(() => $getSelection()?.clone() ?? null)

/** Puts a saved selection back, unless what it pointed at is gone. */
function $restoreSelection(saved: BaseSelection | null) {
  if (!saved) return
  if ($isRangeSelection(saved) && (!$getNodeByKey(saved.anchor.key) || !$getNodeByKey(saved.focus.key))) return
  $setSelection(saved.clone())
}

/** Focuses the editable area now and puts Lexical's selection back into it. */
function focusEditor(editor: LexicalEditor) {
  editor.getRootElement()?.focus({ preventScroll: true })
  editor.focus()
}

/** Turns the blocks the selection touches into `create()`'s, keeping their text. */
function $setBlocks(create: () => ElementNode) {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return
  const blocks = new Map<NodeKey, ElementNode>()
  const add = (node: LexicalNode) => {
    let n: LexicalNode | null = node
    while (n && !($isElementNode(n) && !n.isInline())) n = n.getParent()
    if (!n || $isRootOrShadowRoot(n) || $isListNode(n)) return
    // A list item that only holds a nested list: its own items change instead.
    if ($isListItemNode(n) && n.getChildren().some($isListNode)) return
    blocks.set(n.getKey(), n)
  }
  add(selection.anchor.getNode())
  selection.getNodes().forEach(add)
  add(selection.focus.getNode())
  for (const block of blocks.values()) {
    const next = create()
    next.setFormat(block.getFormatType())
    block.replace(next, true)
  }
}

/**
 * Sets the selection's blocks to `block`. Lists toggle (a bullet list again goes back to
 * paragraphs); with `toggle`, so does a quote. `saved` is put back first, for a menu that took focus.
 */
function setBlock(editor: LexicalEditor, block: RichTextBlockType, { saved, toggle = false }: { saved?: BaseSelection | null; toggle?: boolean } = {}) {
  editor.update(() => {
    if (saved) $restoreSelection(saved)
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return
    const current = $blockTypeOf(selection)
    if (block === 'bullet' || block === 'number') {
      if (current === block) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
      else editor.dispatchCommand(block === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
      return
    }
    const target = toggle && current === block ? 'paragraph' : block
    $setBlocks(() => (target === 'paragraph' ? $createParagraphNode() : target === 'quote' ? $createQuoteNode() : $createHeadingNode(target)))
  })
}

/**
 * A link as typed, made safe to keep, or null: http(s) and mailto as they are, a path or an
 * anchor (`/jobs`, `#salary`) as it is, an email address as mailto, a bare domain
 * (`example.com/brief`) with https:// before it. Any other scheme (`javascript:`) is refused.
 */
export function normalizeRichTextUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value || /\s/.test(value)) return null
  const parses = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
  if (/^https?:\/\//i.test(value)) return parses(value) ? value : null
  if (/^mailto:/i.test(value)) return value.length > 7 ? value : null
  if (/^(\/|#|\?|\.\.?\/)/.test(value)) return value
  if (/^[^@/:]+@[^@/:]+\.[^@/:]+$/.test(value)) return `mailto:${value}`
  if (/^[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)+(:\d+)?([/?#]\S*)?$/u.test(value)) {
    const url = `https://${value}`
    return parses(url) ? url : null
  }
  return null
}

/** Points at the selection as it was when called (a live range), else at `fallback`. */
function rangeAnchor(root: HTMLElement | null, fallback: Element | null): VirtualAnchor {
  const selection = typeof window === 'undefined' ? null : window.getSelection()
  const live = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  const range = live && root?.contains(live.commonAncestorContainer) ? live.cloneRange() : null
  return {
    getBoundingClientRect: () => {
      const rect = range?.getBoundingClientRect?.()
      if (rect && (rect.width || rect.height)) return rect
      const first = range?.getClientRects?.()[0]
      if (first) return first
      return (fallback ?? root)?.getBoundingClientRect() ?? new DOMRect()
    },
    contextElement: root ?? undefined,
  }
}

const nextFrame = (fn: () => void) =>
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : (setTimeout(fn, 16) as unknown as number)
const cancelFrame = (id: number) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id))

/**
 * Focuses an element in a popover layer once it can take focus: the layer mounts a render or
 * more later. Returns a cancel.
 */
function focusWhenShown(get: () => HTMLElement | null | undefined) {
  let frames = 0
  let id = 0
  const attempt = () => {
    const el = get()
    if (el) {
      el.focus({ preventScroll: true })
      if (document.activeElement === el) return
    }
    if (++frames < 20) id = nextFrame(attempt)
  }
  attempt()
  return () => cancelFrame(id)
}

/** The first item that takes focus in a toolbar. */
const firstItem = (toolbar: HTMLElement | null) => toolbar?.querySelector<HTMLElement>('button:not(:disabled)') ?? null

/** What `RichTextSelectionToolbar` lets the editor do: open it and focus it (⌥F10 with no fixed toolbar). */
interface SelectionToolbarController {
  open: () => void
}

/** The link popover's state while it's open. */
interface LinkEditorState {
  saved: BaseSelection | null
  url: string
  inLink: boolean
  anchor: VirtualAnchor
  /** The button that opened it: a press on it closes the popover instead of reopening it. */
  opener: HTMLElement | null
}

/* ---------- the @ and / menus ---------- */

/** A query as the menu state sees it, and where its trigger is: a text node and the offsets of the trigger and the caret. */
interface MenuQuery {
  query: PromptMenuQuery
  key: NodeKey
  offset: number
  end: number
}

/** A mention's query stops this far back from the caret (Prompt bar's names fit). */
const MAX_MENTION_QUERY = 50
const SPACE = /\s/

/** The character before `node` in its block, or null at the block's start (through links and other inline elements). */
function $charBefore(node: TextNode): string | null {
  let n: LexicalNode = node
  for (;;) {
    const prev = n.getPreviousSibling()
    if (prev) return $isLineBreakNode(prev) ? '\n' : prev.getTextContent().slice(-1) || null
    const parent: ElementNode | null = n.getParent()
    if (!parent || !parent.isInline()) return null
    n = parent
  }
}

/** The nearest block around a node: a paragraph, a heading, a list item, a quote. */
function $blockOf(node: LexicalNode): ElementNode | null {
  let n: LexicalNode | null = node.getParent()
  while (n && $isElementNode(n) && n.isInline()) n = n.getParent()
  return $isElementNode(n) ? n : null
}

/**
 * The trigger the caret is typing after, if any, in the caret's own text node: the mention
 * trigger or `/` at the block's start or after whitespace, then the text up to the caret. A
 * mention's query may hold single spaces (the menu closes once nothing matches after one), up to
 * 50 characters; a command's ends at whitespace. Never in a mention or in inline code.
 */
function $findMenuQuery(trigger: string | null, commands: boolean): MenuQuery | null {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed() || selection.anchor.type !== 'text') return null
  const node = selection.anchor.getNode()
  if (!$isTextNode(node) || !node.isSimpleText() || node.hasFormat('code')) return null
  const text = node.getTextContent()
  const caret = selection.anchor.offset
  for (let i = caret - 1; i >= Math.max(0, caret - 1 - MAX_MENTION_QUERY); i--) {
    const ch = text[i]!
    if (ch === '\n') return null
    const kind = ch === trigger ? 'mention' : commands && ch === '/' ? 'command' : null
    if (!kind) continue
    const before = i > 0 ? text[i - 1]! : $charBefore(node)
    if (before !== null && !SPACE.test(before)) return null
    const query = text.slice(i + 1, caret)
    if (kind === 'command' ? SPACE.test(query) : /^\s|\s\s/.test(query)) return null
    // Same block and the same place in it: the same trigger, even when its text node is split or merged.
    const block = $blockOf(node)
    let at = i
    for (const t of block?.getAllTextNodes() ?? []) {
      if (t.is(node)) break
      at += t.getTextContentSize()
    }
    const start = (Number(block?.getKey()) || 0) * 1e6 + at
    return { query: { kind, trigger: ch, text: query, start }, key: node.getKey(), offset: i, end: caret }
  }
  return null
}

const sameQuery = (a: PromptMenuQuery, b: PromptMenuQuery) => a.kind === b.kind && a.start === b.start && a.text === b.text

/** The trigger character's rectangle on screen, or its line's first rect; null when it isn't drawn (or has no layout). */
function triggerRect(editor: LexicalEditor, key: NodeKey, offset: number): DOMRect | null {
  const element = editor.getElementByKey(key)
  if (!element) return null
  const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode() as Text | null
  if (!text || text.length < offset + 1) return null
  const range = document.createRange()
  range.setStart(text, offset)
  range.setEnd(text, offset + 1)
  const rect = range.getBoundingClientRect?.()
  if (rect && (rect.width || rect.height)) return rect
  return range.getClientRects?.()[0] ?? null
}

/** RichTextMention's `avatar` as the menu's `icon`. */
const asPromptMentions = (list: RichTextMention[]): PromptMention[] =>
  list.map(({ avatar, ...mention }) => (avatar === undefined ? mention : { ...mention, icon: avatar }))

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
  /** The selection's marks, block and link: what the toolbars show pressed. */
  selection: RichTextSelectionState
  /** A fixed toolbar or a selection toolbar is there: ⌥F10 reaches it. */
  hasToolbar: boolean
  /** The fixed toolbar's element, for ⌥F10. Returns the unregister. */
  registerToolbar: (element: HTMLElement | null) => () => void
  /** The selection toolbar, for ⌥F10 when there's no fixed one. Returns the unregister. */
  registerSelectionToolbar: (controller: SelectionToolbarController) => () => void
  /** Opens the link popover over the selection (or `opener` when the selection has no rect); a second call closes it. */
  openLinkEditor: (opener?: HTMLElement | null) => void
  /** The @ or / menu: whether there is one (`aria-autocomplete`), its list's id and the highlighted row's while it lists rows. */
  menu: { on: boolean; listId?: string; activeId?: string }
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
  /**
   * The `@` menu: `search` answers the text typed after the trigger. A pick goes in as a mention
   * ("@Tara Mendes", one unit) followed by a space.
   */
  mentions?: RichTextMentions
  /** The `/` menu: a pick takes "/query" out of the text and runs the command there. */
  commands?: RichTextCommand[]
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
  mentions,
  commands,
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
      nodes: RICH_TEXT_NODES,
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
  const [selection, setSelection] = React.useState(NO_SELECTION)
  const selectionRef = React.useRef(NO_SELECTION)

  // The toolbars register themselves, so ⌥F10 knows where to go.
  const [toolbarElement, setToolbarElement] = React.useState<HTMLElement | null>(null)
  const [selectionToolbar, setSelectionToolbar] = React.useState<SelectionToolbarController | null>(null)
  const parts = React.useRef({ toolbar: toolbarElement, bubble: selectionToolbar })
  parts.current = { toolbar: toolbarElement, bubble: selectionToolbar }
  const registerToolbar = React.useCallback((element: HTMLElement | null) => {
    setToolbarElement(element)
    return () => setToolbarElement((current) => (current === element ? null : current))
  }, [])
  const registerSelectionToolbar = React.useCallback((controller: SelectionToolbarController) => {
    setSelectionToolbar(controller)
    return () => setSelectionToolbar((current) => (current === controller ? null : current))
  }, [])

  // The link popover: the selection is saved when it opens and put back when it closes.
  const [link, setLink] = React.useState<LinkEditorState | null>(null)
  const linkRef = React.useRef(link)
  const closeLinkEditor = React.useCallback(
    ({ restore, focus }: { restore: boolean; focus: boolean }) => {
      const current = linkRef.current
      if (!current) return
      linkRef.current = null
      setLink(null)
      if (restore) editor.update(() => $restoreSelection(current.saved), { discrete: true })
      if (focus) focusEditor(editor)
    },
    [editor],
  )
  const openLinkEditor = React.useCallback(
    (opener?: HTMLElement | null) => {
      if (linkRef.current) {
        closeLinkEditor({ restore: true, focus: true })
        return
      }
      if (!editor.isEditable()) return
      const info = editor.getEditorState().read(() => {
        const current = $getSelection()
        const node = $isRangeSelection(current) ? ($linkOf(current.anchor.getNode()) ?? $linkOf(current.focus.getNode())) : null
        return { saved: current?.clone() ?? null, url: node?.getURL() ?? '', inLink: node !== null }
      })
      const root = editor.getRootElement()
      const next = { ...info, opener: opener ?? null, anchor: rangeAnchor(root, opener ?? root) }
      linkRef.current = next
      setLink(next)
    },
    [editor, closeLinkEditor],
  )
  const openLinkRef = React.useRef(openLinkEditor)
  openLinkRef.current = openLinkEditor

  const applyLink = React.useCallback(
    (url: string, text: string) => {
      const current = linkRef.current
      if (!current) return
      editor.update(
        () => {
          $restoreSelection(current.saved)
          if (!$isRangeSelection($getSelection())) $getRoot().selectEnd()
          const range = $getSelection()
          if (!$isRangeSelection(range)) return
          const existing = $linkOf(range.anchor.getNode())
          if (!range.isCollapsed()) $toggleLink(url)
          else if (existing) existing.setURL(url)
          else {
            // Nothing selected: the address goes in as its own linked text.
            const node = $createLinkNode(url)
            node.append($createTextNode(text))
            range.insertNodes([node])
          }
        },
        { discrete: true },
      )
      closeLinkEditor({ restore: false, focus: true })
    },
    [editor, closeLinkEditor],
  )
  const removeLink = React.useCallback(() => {
    const current = linkRef.current
    if (!current) return
    editor.update(
      () => {
        $restoreSelection(current.saved)
        const range = $getSelection()
        if (!$isRangeSelection(range)) return
        // The whole of every link the selection touches, not only the selected part.
        const links = new Map<NodeKey, LinkNode>()
        for (const node of [range.anchor.getNode(), ...range.getNodes(), range.focus.getNode()]) {
          const found = $linkOf(node)
          if (found) links.set(found.getKey(), found)
        }
        for (const found of links.values()) {
          for (const child of found.getChildren()) found.insertBefore(child)
          found.remove()
        }
      },
      { discrete: true },
    )
    closeLinkEditor({ restore: false, focus: true })
  }, [editor, closeLinkEditor])

  const handle = React.useMemo((): RichTextEditorHandle => {
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
  }, [editor])

  // The @ and / menus: Prompt bar's menu state and menu, on a query found in the editor's text.
  const labels = useLabels()
  const trigger = mentions ? (mentions.trigger ?? '@') : null
  const commandsOn = !!commands?.length
  const menuOn = trigger !== null || commandsOn
  const [menuQuery, setMenuQuery] = React.useState<{ query: PromptMenuQuery; anchor: VirtualAnchor } | null>(null)
  const found = React.useRef<MenuQuery | null>(null)
  const promptCommands = React.useMemo(() => commands?.map(({ run: _run, ...command }) => command), [commands])
  const menu = usePromptMenuState({
    query: menuQuery?.query ?? null,
    mentions: mentions && {
      trigger: trigger ?? '@',
      search: (query) => {
        const answer = mentions.search(query)
        return Array.isArray(answer) ? asPromptMentions(answer) : answer.then(asPromptMentions)
      },
    },
    commands: promptCommands,
    disabled: isDisabled || readOnly,
  })
  const menuRef = React.useRef<PromptMenuState>(menu)
  menuRef.current = menu
  const menuConfig = React.useRef({ trigger, commandsOn, commands, labels })
  menuConfig.current = { trigger, commandsOn, commands, labels }

  /** Sets the query; a new one (another trigger or other text) gets a new anchor, on its trigger character. */
  const setQuery = React.useCallback(
    (next: MenuQuery | null) => {
      const prev = found.current
      found.current = next
      if (prev === next || (prev && next && sameQuery(prev.query, next.query))) return
      if (!next) {
        setMenuQuery(null)
        return
      }
      const root = editor.getRootElement()
      const captured = next
      const anchor: VirtualAnchor = {
        getBoundingClientRect: () => {
          const at = found.current ?? captured
          return triggerRect(editor, at.key, at.offset) ?? root?.getBoundingClientRect() ?? new DOMRect()
        },
        contextElement: root ?? undefined,
      }
      setMenuQuery({ query: next.query, anchor })
    },
    [editor],
  )

  /** Puts the picked row in: a mention for the trigger and the query, or runs a command where "/query" was. */
  const pickItem = React.useCallback(
    (item: PromptMenuItem) => {
      const at = found.current
      if (!at) return
      setQuery(null)
      const { query } = at
      let done = false
      // After the edit commits (from a key, this update runs inside Lexical's own, after it).
      const then = () => {
        if (!done) return
        const { labels, commands } = menuConfig.current
        if (item.kind === 'mention') menuRef.current.announce(labels.tokenAdded(query.trigger + item.mention.label))
        else commands?.find((c) => c.name === item.command.name)?.run({ insert: handle.insert, editor: handle })
      }
      editor.update(
        () => {
          const node = $getNodeByKey(at.key)
          if (!$isTextNode(node) || node.getTextContent().slice(at.offset, at.end) !== query.trigger + query.text) return
          if (item.kind === 'command') {
            const range = $createRangeSelection()
            range.anchor.set(at.key, at.offset, 'text')
            range.focus.set(at.key, at.end, 'text')
            $setSelection(range)
            range.removeText()
            done = true
            return
          }
          const parts = node.splitText(at.offset, at.end)
          const typed = parts[at.offset === 0 ? 0 : 1]!
          const mention = $createMentionNode({ id: item.mention.id, label: item.mention.label, trigger: query.trigger })
          mention.setFormat(typed.getFormat())
          typed.replace(mention)
          // A space after it, unless one is there already; the caret goes after the space.
          const next = mention.getNextSibling()
          if ($isTextNode(next) && !$isMentionNode(next) && SPACE.test(next.getTextContent()[0] ?? '')) next.select(1, 1)
          else {
            const space = $createTextNode(' ').setFormat(typed.getFormat())
            mention.insertAfter(space)
            space.select(1, 1)
          }
          done = true
        },
        { discrete: true, onUpdate: then },
      )
    },
    [editor, handle, setQuery],
  )
  const pickRef = React.useRef(pickItem)
  pickRef.current = pickItem

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
    // A mention is never code: markdown has no link inside a code span, so it wouldn't come back.
    const stripMention = (node: MentionNode) => {
      strip(node)
      if (node.hasFormat('code')) node.toggleFormat('code')
    }
    // ⌥F10 to the toolbar, and the shortcuts Lexical doesn't know: ⌘⇧X, ⌘E, ⌘⇧7, ⌘⇧8, ⌘K.
    // (⌘B and ⌘I are Lexical's own.)
    const onShortcut = (event: KeyboardEvent) => {
      const handled = () => {
        event.preventDefault()
        return true
      }
      if (event.altKey && event.key === 'F10') {
        const { toolbar, bubble } = parts.current
        const item = firstItem(toolbar)
        if (item) {
          item.focus()
          return handled()
        }
        if (bubble) {
          bubble.open()
          return handled()
        }
        return false
      }
      const mod = isApple() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
      if (!mod || event.altKey) return false
      const key = event.key.toLowerCase()
      if (event.shiftKey) {
        if (key === 'x' || event.code === 'KeyX') {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
          return handled()
        }
        if (key === '7' || key === '&' || event.code === 'Digit7') {
          setBlock(editor, 'number')
          return handled()
        }
        if (key === '8' || key === '*' || event.code === 'Digit8') {
          setBlock(editor, 'bullet')
          return handled()
        }
        return false
      }
      if (key === 'e') {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
        return handled()
      }
      if (key === 'k') {
        openLinkRef.current(null)
        return handled()
      }
      return false
    }
    // The menus. An input method's text never opens one; it only carries on a query that was open
    // when composing started. Until the next key after it, the composed text is left alone.
    let resume = false
    let afterComposition = false
    const findQuery = () => {
      const { trigger, commandsOn } = menuConfig.current
      if ((!trigger && !commandsOn) || !editor.isEditable() || editor.isComposing() || afterComposition) return setQuery(null)
      // Leaving the text closes the menu without forgetting an Escape (onBlur below).
      if (document.activeElement !== contentElement) return setQuery(null)
      const next = editor.getEditorState().read(() => $findMenuQuery(trigger, commandsOn))
      menuRef.current.release(next?.query ?? null)
      setQuery(next)
    }
    const onCompositionStart = () => {
      resume = menuRef.current.open
      setQuery(null)
    }
    const onCompositionEnd = () => {
      afterComposition = !resume
      resume = false
    }
    const onKeyDownNative = (event: KeyboardEvent) => {
      if (!event.isComposing && event.keyCode !== 229) afterComposition = false
    }
    const onBlurNative = () => setQuery(null)
    contentElement.addEventListener('compositionstart', onCompositionStart)
    contentElement.addEventListener('compositionend', onCompositionEnd)
    contentElement.addEventListener('keydown', onKeyDownNative, true)
    contentElement.addEventListener('blur', onBlurNative)
    /** A key the open menu takes: never while composing; `run` returns whether it did. */
    const menuKey = (run: (menu: PromptMenuState, event: KeyboardEvent | null) => boolean) => (event: KeyboardEvent | null) => {
      if (editor.isComposing() || !menuRef.current.open) return false
      if (!run(menuRef.current, event)) return false
      event?.preventDefault()
      return true
    }
    const plain = (event: KeyboardEvent | null) => !event || (!event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey)

    const unregister = mergeRegister(
      registerRichText(editor),
      registerList(editor),
      // Tables: their integrity transforms, then Tab and Shift+Tab between cells and the cell
      // selection (a Tab outside a table still leaves the editor), and merged cells split, as
      // markdown has none.
      registerTablePlugin(editor),
      registerTableSelectionObserver(editor),
      registerTableCellUnmergeTransform(editor),
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
      editor.registerNodeTransform(MentionNode, stripMention),
      editor.registerNodeTransform(LinkNode, $moveMentionsOutOfLink),
      editor.registerCommand(KEY_DOWN_COMMAND, (event) => onShortcut(event), COMMAND_PRIORITY_HIGH),
      editor.registerUpdateListener(findQuery),
      // The open menu's keys come first: in a table, the table's own arrows and Tab (high) follow.
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        menuKey((menu) => !!menu.items?.length && (menu.move(1), true)),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        menuKey((menu) => !!menu.items?.length && (menu.move(-1), true)),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        menuKey((menu, event) => !!menu.current && plain(event) && (pickRef.current(menu.current), true)),
        COMMAND_PRIORITY_CRITICAL,
      ),
      // Tab only while there are rows: with "No results" it leaves the editor as usual.
      editor.registerCommand(
        KEY_TAB_COMMAND,
        menuKey((menu, event) => menu.listed && !!menu.current && plain(event) && (pickRef.current(menu.current), true)),
        COMMAND_PRIORITY_CRITICAL,
      ),
      // Taken only while the menu is open, so a Dialog around the editor still closes on the next one.
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        menuKey((menu) => (menu.dismiss(), true)),
        COMMAND_PRIORITY_CRITICAL,
      ),
      // A mention that goes (Backspace takes it whole, a cut, an undo) is said in the status region.
      editor.registerMutationListener(
        MentionNode,
        (mutations, { updateTags, prevEditorState }) => {
          if (updateTags.has(EXTERNAL_TAG) || !menuConfig.current.trigger) return
          const gone: string[] = []
          prevEditorState.read(() => {
            for (const [key, mutation] of mutations) {
              const node = mutation === 'destroyed' ? $getNodeByKey(key) : null
              if ($isMentionNode(node)) gone.push(node.getTextContent())
            }
          })
          if (gone.length) menuRef.current.announce(gone.map(menuConfig.current.labels.tokenRemoved).join(', '))
        },
        { skipInitialization: true },
      ),
      editor.registerUpdateListener(({ editorState }) => {
        const next = editorState.read($readSelectionState)
        if (!sameState(next, selectionRef.current)) {
          selectionRef.current = next
          setSelection(next)
        }
      }),
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
        // Only a controlled editor gets values back to match; the oldest go past MAX_PENDING.
        if (controlledRef.current) {
          pending.current.push(serialized)
          if (pending.current.length > MAX_PENDING) pending.current.splice(0, pending.current.length - MAX_PENDING)
        }
        if (!controlledRef.current) setUncontrolled(serialized)
        onValueChangeRef.current?.(serialized, { mentions: richTextMentions(serialized, formatRef.current) })
      }),
    )
    // Registering the transforms marks nodes dirty for an update a moment later. Run it now, as
    // part of loading the value: a value they normalise (an underline stripped, a table
    // completed) is the document as loaded, not an edit to send.
    editor.update(() => {}, { discrete: true, tag: [EXTERNAL_TAG, HISTORY_MERGE_TAG] })
    return () => {
      unregister()
      contentElement.removeEventListener('compositionstart', onCompositionStart)
      contentElement.removeEventListener('compositionend', onCompositionEnd)
      contentElement.removeEventListener('keydown', onKeyDownNative, true)
      contentElement.removeEventListener('blur', onBlurNative)
      setQuery(null)
      editor.setRootElement(null)
    }
  }, [editor, contentElement, setQuery])

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

  React.useImperativeHandle(editorRef, () => handle, [handle])

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
    selection,
    hasToolbar: toolbarElement !== null || selectionToolbar !== null,
    registerToolbar,
    registerSelectionToolbar,
    openLinkEditor,
    menu: { on: menuOn && !isDisabled && !readOnly, listId: menu.listed ? menu.listId : undefined, activeId: menu.activeId },
  }

  // Without an anchor of its own Radix draws an empty anchor element; this one is never measured while shut.
  const contentAnchor = React.useMemo<VirtualAnchor>(
    () => ({ getBoundingClientRect: () => contentElement?.getBoundingClientRect() ?? new DOMRect(), contextElement: contentElement ?? undefined }),
    [contentElement],
  )

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
        {link && !isDisabled && !readOnly && (
          <LinkEditor
            state={link}
            onApply={applyLink}
            onRemove={removeLink}
            onDismiss={(focus) => closeLinkEditor({ restore: focus, focus })}
          />
        )}
        {menuOn && (
          <PromptMentionsMenu
            {...menu.menuProps}
            virtualAnchor={menuQuery?.anchor ?? contentAnchor}
            side="bottom"
            align="start"
            matchAnchorWidth={false}
            onPick={pickItem}
          />
        )}
      </div>
    </RichTextEditorContext.Provider>
  )
}

/* ---------- Content ---------- */

export interface RichTextEditorContentProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Drawn inside the field, before the editable area: where `RichTextToolbar` goes. */
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
          aria-keyshortcuts={editable && ctx.hasToolbar ? 'Alt+F10' : undefined}
          aria-autocomplete={ctx.menu.on ? 'list' : undefined}
          aria-controls={ctx.menu.listId}
          aria-activedescendant={ctx.menu.activeId}
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

/* ---------- toolbar items ---------- */

type LabelKey = { [K in keyof typeof richTextEditorLabels]: (typeof richTextEditorLabels)[K] extends string ? K : never }[keyof typeof richTextEditorLabels]

const MARKS: Record<RichTextMark, { icon: React.ReactNode; label: LabelKey; key: string; shift?: boolean }> = {
  bold: { icon: <Bold aria-hidden />, label: 'richTextBold', key: 'B' },
  italic: { icon: <Italic aria-hidden />, label: 'richTextItalic', key: 'I' },
  strikethrough: { icon: <Strikethrough aria-hidden />, label: 'richTextStrikethrough', key: 'X', shift: true },
  code: { icon: <Code aria-hidden />, label: 'richTextCode', key: 'E' },
}

export interface RichTextFormatToggleProps
  extends Omit<ToolbarToggleProps, 'pressed' | 'defaultPressed' | 'onPressedChange' | 'children' | 'icon' | 'label'> {
  format: RichTextMark
  /** Replaces the mark's own icon. */
  icon?: React.ReactNode
  /** Replaces the mark's own name (from SatinLabels). */
  label?: string
}

/**
 * A toolbar toggle for a mark (bold, italic, strikethrough, inline code): pressed while the
 * selection has it, with the mark's icon, name and shortcut. For a toolbar of your own inside
 * `RichTextToolbar` or `RichTextSelectionToolbar`. Other props, `ref` included, go to the `button`.
 */
export function RichTextFormatToggle({ format, icon, label, shortcut, disabled, ...props }: RichTextFormatToggleProps) {
  const ctx = useRichTextEditorContext('RichTextFormatToggle')
  const labels = useLabels()
  const apple = useIsApple()
  const mark = MARKS[format]
  return (
    <ToolbarToggle
      icon={icon ?? mark.icon}
      label={label ?? labels[mark.label]}
      shortcut={shortcut ?? shortcutOf(apple, mark.key, mark.shift)}
      pressed={ctx.selection[format]}
      onPressedChange={() => ctx.editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
      disabled={disabled ?? ctx.disabled}
      {...props}
    />
  )
}

const BLOCKS: Record<'bullet' | 'number' | 'quote', { icon: React.ReactNode; label: LabelKey; key?: string }> = {
  bullet: { icon: <List aria-hidden className="satin-rte-icon-mirror" />, label: 'richTextBulletList', key: '8' },
  number: {
    // The numbers stay readable right to left: the icon with them on the right instead of a mirror.
    icon: (
      <>
        <NumberedListLeft aria-hidden className="satin-rte-icon-ltr" />
        <NumberedListRight aria-hidden className="satin-rte-icon-rtl" />
      </>
    ),
    label: 'richTextNumberedList',
    key: '7',
  },
  quote: { icon: <Quote aria-hidden />, label: 'richTextQuote' },
}

export interface RichTextBlockToggleProps
  extends Omit<ToolbarToggleProps, 'pressed' | 'defaultPressed' | 'onPressedChange' | 'children' | 'icon' | 'label'> {
  block: 'bullet' | 'number' | 'quote'
  icon?: React.ReactNode
  label?: string
}

/**
 * A toolbar toggle for a bullet list, a numbered list or a quote: pressed while the selection is
 * in one, and pressed again it turns the blocks back into paragraphs. Other props, `ref`
 * included, go to the `button`.
 */
export function RichTextBlockToggle({ block, icon, label, shortcut, disabled, ...props }: RichTextBlockToggleProps) {
  const ctx = useRichTextEditorContext('RichTextBlockToggle')
  const labels = useLabels()
  const apple = useIsApple()
  const entry = BLOCKS[block]
  return (
    <ToolbarToggle
      icon={icon ?? entry.icon}
      label={label ?? labels[entry.label]}
      shortcut={shortcut ?? (entry.key ? shortcutOf(apple, entry.key, true) : undefined)}
      pressed={ctx.selection.block === block}
      onPressedChange={() => setBlock(ctx.editor, block, { toggle: true })}
      disabled={disabled ?? ctx.disabled}
      {...props}
    />
  )
}

export interface RichTextLinkButtonProps extends Omit<ToolbarToggleProps, 'pressed' | 'defaultPressed' | 'onPressedChange' | 'children' | 'icon' | 'label'> {
  icon?: React.ReactNode
  label?: string
}

/**
 * A toolbar toggle that opens the link popover (as ⌘K does): pressed while the selection is in a
 * link. Other props, `ref` included, go to the `button`.
 */
export function RichTextLinkButton({ icon, label, shortcut, disabled, ref, ...props }: RichTextLinkButtonProps) {
  const ctx = useRichTextEditorContext('RichTextLinkButton')
  const labels = useLabels()
  const apple = useIsApple()
  const own = React.useRef<HTMLButtonElement | null>(null)
  const refs = React.useMemo(() => mergeRefs(ref, own), [ref])
  return (
    <ToolbarToggle
      ref={refs}
      icon={icon ?? <LinkIcon aria-hidden />}
      label={label ?? labels.richTextLink}
      shortcut={shortcut ?? shortcutOf(apple, 'K')}
      aria-haspopup="dialog"
      pressed={ctx.selection.link}
      onPressedChange={() => ctx.openLinkEditor(own.current)}
      disabled={disabled ?? ctx.disabled}
      {...props}
    />
  )
}

const STYLES = [
  ['paragraph', 'richTextParagraph'],
  ['h1', 'richTextHeading1'],
  ['h2', 'richTextHeading2'],
  ['h3', 'richTextHeading3'],
] as const satisfies readonly (readonly [RichTextBlockType, LabelKey])[]

export interface RichTextBlockTypeMenuProps extends Omit<ToolbarButtonProps, 'children' | 'icon' | 'label' | 'shortcut'> {}

/**
 * The text style menu: a toolbar button that shows the current style (Paragraph, Heading 1–3)
 * and opens a menu of them as radio items. A list or a quote shows Paragraph with nothing
 * checked. Other props, `ref` included, go to the button.
 */
export function RichTextBlockTypeMenu({ disabled, className, ref, ...props }: RichTextBlockTypeMenuProps) {
  const ctx = useRichTextEditorContext('RichTextBlockTypeMenu')
  const labels = useLabels()
  const { editor } = ctx
  const saved = React.useRef<BaseSelection | null>(null)
  // Opened from the keyboard (the button had focus): focus goes back to it. From a press, to the text.
  const fromKeyboard = React.useRef(false)
  const own = React.useRef<HTMLButtonElement | null>(null)
  const refs = React.useMemo(() => mergeRefs(ref, own), [ref])
  const block = ctx.selection.block
  const value = block === 'paragraph' || block === 'h1' || block === 'h2' || block === 'h3' ? block : ''
  const current = labels[STYLES.find(([v]) => v === (value || 'paragraph'))![1]]
  return (
    <DropdownMenu
      aria-label={labels.richTextStyle}
      className="w-[200px]"
      onOpenChange={(open) => {
        if (!open) return
        saved.current = saveSelection(editor)
        fromKeyboard.current = document.activeElement === own.current
      }}
      onCloseAutoFocus={(event) => {
        if (fromKeyboard.current) return
        event.preventDefault()
        focusEditor(editor)
      }}
      trigger={
        <ToolbarButton
          ref={refs}
          aria-label={labels.richTextStyleOf(current)}
          disabled={disabled ?? ctx.disabled}
          className={cn('min-w-[7.5rem] justify-between', className)}
          {...props}
        >
          {current}
          <NavArrowDown aria-hidden />
        </ToolbarButton>
      }
    >
      <DropdownMenuRadioGroup value={value} onValueChange={(next) => setBlock(editor, next as RichTextBlockType, { saved: saved.current })}>
        {STYLES.map(([v, key]) => (
          <DropdownMenuRadioItem key={v} value={v} label={labels[key]} />
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenu>
  )
}

/* ---------- RichTextToolbar ---------- */

export interface RichTextToolbarProps extends Omit<ToolbarProps, 'variant' | 'preventFocusOnPress'> {
  /**
   * `'default'`: text style | bold, italic, strikethrough, code | bullet list, numbered list,
   * quote | link. `'minimal'`: bold, italic | bullet list | link. `children` replace either.
   */
  preset?: 'default' | 'minimal'
}

/**
 * The formatting toolbar, inside the field above the text (`RichTextEditorContent`'s children),
 * a subtle rule under it. Free's `Toolbar` with `preventFocusOnPress`, so a press keeps the
 * selection; one tab stop, ← → between items, ⌥F10 from the text reaches its first item and
 * Escape goes back to the text. Hidden when read-only; its items are disabled with the editor.
 *
 * `children` replace the preset: build one from `RichTextBlockTypeMenu`, `RichTextFormatToggle`,
 * `RichTextBlockToggle`, `RichTextLinkButton` and Free's `ToolbarSeparator`, `ToolbarButton`.
 * Other props, `ref` included, go to the toolbar `div`.
 */
export function RichTextToolbar({ preset = 'default', children, className, onKeyDown, onMouseDown, ref, 'aria-label': ariaLabel, ...props }: RichTextToolbarProps) {
  const ctx = useRichTextEditorContext('RichTextToolbar')
  const labels = useLabels()
  const { registerToolbar, editor, readOnly } = ctx
  const own = React.useRef<HTMLDivElement | null>(null)
  const refs = React.useMemo(() => mergeRefs(ref, own), [ref])
  React.useEffect(() => (readOnly ? undefined : registerToolbar(own.current)), [registerToolbar, readOnly])
  if (readOnly) return null
  return (
    <Toolbar
      ref={refs}
      preventFocusOnPress
      aria-label={ariaLabel ?? labels.richTextToolbar}
      data-rich-text-toolbar=""
      className={cn('satin-rte-toolbar w-full flex-wrap', className)}
      onMouseDown={(event) => {
        onMouseDown?.(event)
        // A press between the items keeps focus (and the selection) in the text too.
        if (event.target === event.currentTarget) event.preventDefault()
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        // Only from the toolbar's own items: an Escape in the text style menu (a portal) closes
        // the menu. Not gated on defaultPrevented: an item's tooltip prevents it as it closes.
        if (event.key === 'Escape' && event.currentTarget.contains(event.target as Node)) {
          event.preventDefault()
          focusEditor(editor)
        }
      }}
      {...props}
    >
      {children ??
        (preset === 'minimal' ? (
          <>
            <RichTextFormatToggle format="bold" />
            <RichTextFormatToggle format="italic" />
            <ToolbarSeparator />
            <RichTextBlockToggle block="bullet" />
            <ToolbarSeparator />
            <RichTextLinkButton />
          </>
        ) : (
          <>
            <RichTextBlockTypeMenu />
            <ToolbarSeparator />
            <RichTextFormatToggle format="bold" />
            <RichTextFormatToggle format="italic" />
            <RichTextFormatToggle format="strikethrough" />
            <RichTextFormatToggle format="code" />
            <ToolbarSeparator />
            <RichTextBlockToggle block="bullet" />
            <RichTextBlockToggle block="number" />
            <RichTextBlockToggle block="quote" />
            <ToolbarSeparator />
            <RichTextLinkButton />
          </>
        ))}
    </Toolbar>
  )
}

/* ---------- the link popover ---------- */

/**
 * A Popover panel under the selection with the address field, Apply and (in a link) Remove link.
 * Enter applies, Escape and the close button go back to the text with the selection put back; a
 * press or focus outside closes it where it is. A Radix Popover layer, so inside a modal Dialog
 * it takes presses and focus, and Escape closes it before the Dialog.
 */
function LinkEditor({
  state,
  onApply,
  onRemove,
  onDismiss,
}: {
  state: LinkEditorState
  onApply: (url: string, text: string) => void
  onRemove: () => void
  onDismiss: (focusEditor: boolean) => void
}) {
  const labels = useLabels()
  const [value, setValue] = React.useState(state.url)
  const [invalid, setInvalid] = React.useState(false)
  const input = React.useRef<HTMLInputElement | null>(null)
  const anchorRef = React.useRef<VirtualAnchor>(state.anchor)
  anchorRef.current = state.anchor

  return (
    <PopoverPrimitive.Root
      open
      onOpenChange={(open) => {
        // A press or focus outside (Escape is taken below).
        if (!open) onDismiss(false)
      }}
    >
      <PopoverPrimitive.Anchor virtualRef={anchorRef} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          asChild
          side="bottom"
          align="center"
          sideOffset={8}
          collisionPadding={8}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            input.current?.focus({ preventScroll: true })
          }}
          // Focus goes back to the text only on Escape, Apply or Remove (onDismiss decides).
          onCloseAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault()
            onDismiss(true)
          }}
          onInteractOutside={(event) => {
            // A press on the button that opened it closes it from there (and puts the selection back).
            if (state.opener?.contains(event.target as Node)) event.preventDefault()
          }}
        >
          <PopoverPanel
            title={state.inLink ? labels.richTextEditLink : labels.richTextAddLink}
            className="satin-rte-link pointer-events-auto z-50 outline-none"
            onClose={() => onDismiss(true)}
            body={
              <form
                className="flex flex-col gap-3"
                noValidate
                onSubmit={(event) => {
                  // Portaled, but still inside the editor in React: keep the submit from reaching a form around it.
                  event.preventDefault()
                  event.stopPropagation()
                  const url = normalizeRichTextUrl(value)
                  if (url) onApply(url, value.trim())
                  else setInvalid(true)
                }}
              >
                <Input
                  ref={input}
                  type="url"
                  aria-label={labels.richTextUrl}
                  placeholder={labels.richTextUrlPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value)
                    setInvalid(false)
                  }}
                  error={invalid ? labels.richTextUrlInvalid : undefined}
                />
                <div className="flex justify-end gap-2">
                  {state.inLink && (
                    <Button type="button" variant="secondary" onClick={onRemove}>
                      {labels.richTextRemoveLink}
                    </Button>
                  )}
                  <Button type="submit">{labels.apply}</Button>
                </div>
              </form>
            }
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/* ---------- RichTextSelectionToolbar ---------- */

export interface RichTextSelectionToolbarProps extends Omit<ToolbarProps, 'variant' | 'preventFocusOnPress' | 'orientation'> {
  /** Replaces the default items (bold, italic, strikethrough, link). */
  children?: React.ReactNode
  /**
   * Added after the items, past a separator: actions on the selection (rewrite, translate,
   * comment). They get the same context as the formatting items.
   */
  actions?: React.ReactNode
}

/**
 * The bubble over a selection: Free's `Toolbar variant="floating"` in a Radix Popover layer
 * (non-modal) above the selected text, so inside a modal Dialog it takes presses and Escape
 * reaches it first. It shows after a pointer selection (on release) or a double click, never for a
 * selection made with the keyboard; it follows a selection changed while it's up, and goes with a
 * collapsed selection, Escape, or focus leaving the text and the bubble. It doesn't take focus or
 * sit in the tab order: ⌥F10 in the text reaches it when there's no fixed toolbar (and opens it on
 * the caret), and Escape in it goes back to the text with the selection.
 *
 * `children` replace bold, italic, strikethrough and link; `actions` add to them after a
 * separator. That's the place for actions on the selected text (an AI rewrite, a comment): any
 * Toolbar item, with `editorRef`'s `getSelectionRect`, `insert` and `insertText` to act. Not drawn
 * when the editor is read-only or disabled. Other props go to the toolbar `div`.
 */
export function RichTextSelectionToolbar({ children, actions, className, onKeyDown, onMouseDown, onBlur, ref, 'aria-label': ariaLabel, ...props }: RichTextSelectionToolbarProps) {
  const ctx = useRichTextEditorContext('RichTextSelectionToolbar')
  const labels = useLabels()
  const { editor, contentElement, registerSelectionToolbar } = ctx
  const enabled = !ctx.disabled && !ctx.readOnly && contentElement !== null
  const [anchor, setAnchor] = React.useState<VirtualAnchor | null>(null)
  const anchorRef = React.useRef(anchor)
  anchorRef.current = anchor
  const own = React.useRef<HTMLDivElement | null>(null)
  const refs = React.useMemo(() => mergeRefs(ref, own), [ref])
  const open = React.useRef(false)
  // Opened with ⌥F10: stays on a collapsed selection, and its first item takes focus once shown.
  const pinned = React.useRef(false)
  const focusOnShow = React.useRef(false)
  // The Escape the layer handled, so the editor's own Escape (which leaves the text) skips it.
  const escaped = React.useRef<KeyboardEvent | null>(null)

  const anchorNow = React.useCallback((): VirtualAnchor | null => {
    const root = editor.getRootElement()
    if (!root) return null
    const captured = selectionRect(root) ?? root.getBoundingClientRect()
    return { getBoundingClientRect: () => selectionRect(root) ?? captured, contextElement: root }
  }, [editor])
  const hide = React.useCallback(() => {
    open.current = false
    pinned.current = false
    setAnchor(null)
  }, [])
  const show = React.useCallback(() => {
    const next = anchorNow()
    open.current = next !== null
    setAnchor(next)
  }, [anchorNow])

  React.useEffect(() => {
    if (!enabled || !contentElement) return
    const selected = () =>
      editor.getEditorState().read(() => {
        const range = $getSelection()
        return $isRangeSelection(range) && !range.isCollapsed()
      })
    let pointer = false
    let timer = 0
    // A moment later: Lexical takes the browser's selection in on selectionchange.
    const showIfSelected = () => {
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (selected()) show()
      }, 0)
    }
    const onPointerDown = () => {
      pointer = true
      hide()
    }
    const onPointerUp = () => {
      if (!pointer) return
      pointer = false
      showIfSelected()
    }
    const onContentBlur = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null
      if (next && own.current?.contains(next)) return
      hide()
    }
    contentElement.addEventListener('pointerdown', onPointerDown)
    contentElement.addEventListener('dblclick', showIfSelected)
    contentElement.addEventListener('blur', onContentBlur)
    document.addEventListener('pointerup', onPointerUp)
    const unregister = mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        if (!open.current) return
        const keep = editorState.read(() => {
          const range = $getSelection()
          return $isRangeSelection(range) && (pinned.current || !range.isCollapsed())
        })
        if (!keep) hide()
        // Follow the selection (Shift+arrows, a mark that changes its width), with no motion.
        else if (!pinned.current) setAnchor(anchorNow())
      }),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event) => {
          // The layer took this Escape first (and hid the bubble): the text keeps focus.
          if (event && event === escaped.current) return true
          if (!open.current) return false
          hide()
          return true
        },
        COMMAND_PRIORITY_HIGH,
      ),
    )
    return () => {
      clearTimeout(timer)
      contentElement.removeEventListener('pointerdown', onPointerDown)
      contentElement.removeEventListener('dblclick', showIfSelected)
      contentElement.removeEventListener('blur', onContentBlur)
      document.removeEventListener('pointerup', onPointerUp)
      unregister()
    }
  }, [enabled, contentElement, editor, show, hide, anchorNow])

  React.useEffect(() => {
    if (!enabled) return
    return registerSelectionToolbar({
      open: () => {
        pinned.current = true
        focusOnShow.current = true
        open.current = true
        setAnchor(anchorNow())
      },
    })
  }, [enabled, registerSelectionToolbar, anchorNow])

  React.useEffect(() => {
    if (!anchor || !focusOnShow.current) return
    focusOnShow.current = false
    return focusWhenShown(() => firstItem(own.current))
  }, [anchor])

  React.useEffect(() => {
    if (!enabled) hide()
  }, [enabled, hide])

  if (!enabled) return null
  return (
    <PopoverPrimitive.Root
      open={anchor !== null}
      onOpenChange={(next) => {
        if (!next) hide()
      }}
    >
      <PopoverPrimitive.Anchor virtualRef={anchorRef as React.RefObject<VirtualAnchor>} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          asChild
          side="top"
          align="center"
          sideOffset={8}
          collisionPadding={8}
          // Focus stays in the text (⌥F10 moves it in on purpose), and comes back to nothing on close.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          // It goes by the editor's own rules (a press in the text, the selection collapsing, focus leaving).
          onInteractOutside={(event) => event.preventDefault()}
          // The topmost layer gets Escape, wherever focus is: the bubble goes, a Dialog around it stays.
          onEscapeKeyDown={(event) => {
            event.preventDefault()
            escaped.current = event
            hide()
            focusEditor(editor)
          }}
        >
          <Toolbar
            ref={refs}
            role="toolbar"
            variant="floating"
            preventFocusOnPress
            // Out of the tab order: ⌥F10 or the pointer reach it.
            tabIndex={-1}
            aria-label={ariaLabel ?? labels.richTextSelectionToolbar}
            data-rich-text-selection-toolbar=""
            className={cn('satin-rte-bubble pointer-events-auto z-50', className)}
            onMouseDown={(event) => {
              onMouseDown?.(event)
              // A press between the items keeps the selection in the text too.
              if (event.target === event.currentTarget) event.preventDefault()
            }}
            onKeyDown={(event) => {
              onKeyDown?.(event)
              // With a tooltip open, Escape is the tooltip's layer's: this still closes the bubble.
              if (event.key === 'Escape' && event.currentTarget.contains(event.target as Node)) {
                event.preventDefault()
                hide()
                focusEditor(editor)
              }
            }}
            onBlur={(event) => {
              onBlur?.(event)
              const next = event.relatedTarget as Node | null
              if (next && (event.currentTarget.contains(next) || contentElement?.contains(next))) return
              if (next) hide()
            }}
            {...props}
          >
            {children ?? (
              <>
                <RichTextFormatToggle format="bold" />
                <RichTextFormatToggle format="italic" />
                <RichTextFormatToggle format="strikethrough" />
                <RichTextLinkButton />
              </>
            )}
            {actions != null && actions !== false && (
              <>
                <ToolbarSeparator />
                {actions}
              </>
            )}
          </Toolbar>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
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
  /**
   * The formatting toolbar inside the field: `true` (default: text style, marks, lists, quote,
   * link), `'minimal'` (bold, italic, bullet list, link) or `false`. Never drawn read-only.
   */
  toolbar?: boolean | 'minimal'
  /** The bubble over a pointer selection (bold, italic, strikethrough, link). On by default; never read-only. */
  selectionToolbar?: boolean
  /** Show a state without interacting, for state sheets. */
  'data-force'?: 'hover' | 'focus'
}

/**
 * The editor for the common case: `RichTextEditorRoot` and `RichTextEditorContent` with a label,
 * the formatting toolbar, the selection bubble, the hint or the error, and the status row. Other
 * props, `ref` included, go to the root `div`.
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
  toolbar = true,
  selectionToolbar = true,
  'data-force': force,
  ...props
}: RichTextEditorProps) {
  const labels = useLabels()
  const field = useFormField()
  const autoId = React.useId()
  const contentId = id ?? field?.id ?? autoId
  const hasMessage = typeof error === 'string' || React.isValidElement(error)
  const message = hasMessage ? error : hint
  // Not `${id}-label`: that's a FormField's label, which may be around it.
  const labelId = label ? `${contentId}-rte-label` : undefined
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
      >
        {toolbar !== false && <RichTextToolbar preset={toolbar === 'minimal' ? 'minimal' : 'default'} />}
      </RichTextEditorContent>
      {selectionToolbar && <RichTextSelectionToolbar />}
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
