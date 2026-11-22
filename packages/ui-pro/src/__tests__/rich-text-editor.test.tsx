import * as React from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { $getRoot, $getSelection, $isElementNode, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_LOW, KEY_ESCAPE_COMMAND, createEditor, type LexicalEditor, type LexicalNode } from 'lexical'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { Dialog } from '@uisatin/ui/dialog'
import { FormField } from '@uisatin/ui/form-field'
import { ToolbarButton } from '@uisatin/ui/toolbar'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import {
  MentionNode,
  RICH_TEXT_TRANSFORMERS,
  RichTextEditor,
  RichTextEditorContent,
  RichTextEditorRoot,
  RichTextFormatToggle,
  RichTextSelectionToolbar,
  RichTextToolbar,
  normalizeRichTextUrl,
  richTextMentions,
  type RichTextCommand,
  type RichTextEditorHandle,
  type RichTextMention,
} from '../components/rich-text-editor'

/*
 * jsdom can't type into a contenteditable the way a browser does (user.keyboard never reaches
 * Lexical's beforeinput handling), so text goes in through the editor's handle (insertText,
 * insert). Real typing, IME and the look are checked in a browser.
 */

const DOC = [
  '# Interview feedback',
  '## Summary',
  '**Strong** craft, *clear* writing, ~~late~~ on time, `npm test` passes.',
  '- Communication\n- Craft',
  '1. First\n2. Second',
  '> Hire',
  'Ask [@Tara Mendes](mention:tara-id) and read [the brief](https://example.com/brief).',
].join('\n\n')

const textbox = () => screen.getByRole('textbox')

function renderEditor(ui: React.ReactElement<{ editorRef?: React.Ref<RichTextEditorHandle> }>, options?: Parameters<typeof renderWithSatin>[1]) {
  const ref = React.createRef<RichTextEditorHandle>()
  const result = renderWithSatin(React.cloneElement(ui, { editorRef: ref }), options)
  return { ...result, handle: () => ref.current! }
}

/** The document's nodes as `type` (and `type:tag` for headings and lists), depth first. */
function nodeTypes(markdown: string) {
  const editor = createEditor({ nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, MentionNode], onError: (e) => { throw e } })
  editor.update(() => $convertFromMarkdownString(markdown, RICH_TEXT_TRANSFORMERS), { discrete: true })
  const types: string[] = []
  const walk = (node: LexicalNode) => {
    const tag = (node as { getTag?: () => string }).getTag?.()
    types.push(tag ? `${node.getType()}:${tag}` : node.getType())
    if ($isElementNode(node)) node.getChildren().forEach(walk)
  }
  let mention: { id: string; label: string; bold: boolean } | null = null
  let back = ''
  editor.getEditorState().read(() => {
    $getRoot().getChildren().forEach(walk)
    const find = (node: LexicalNode): void => {
      if (node instanceof MentionNode) mention = { id: node.getId(), label: node.getLabel(), bold: node.hasFormat('bold') }
      if ($isElementNode(node)) node.getChildren().forEach(find)
    }
    find($getRoot())
    back = $convertToMarkdownString(RICH_TEXT_TRANSFORMERS)
  })
  return { types, mention: mention as { id: string; label: string; bold: boolean } | null, back, editor }
}

describe('RichTextEditor', () => {
  it('renders a textbox named by its label, with the placeholder while empty', () => {
    renderWithSatin(<RichTextEditor label="Feedback" hint="Shared with the panel." placeholder="Write your feedback" />)
    const box = screen.getByRole('textbox', { name: 'Feedback' })
    expect(box.getAttribute('aria-multiline')).toBe('true')
    expect(box.getAttribute('contenteditable')).toBe('true')
    expect(box.getAttribute('aria-placeholder')).toBe('Write your feedback')
    expect(box.getAttribute('aria-describedby')).toBe(`${box.id}-hint`)
    expect(document.getElementById(`${box.id}-hint`)?.textContent).toBe('Shared with the panel.')
    expect(screen.getByText('Write your feedback').getAttribute('aria-hidden')).toBe('true')
    expect(box.closest('[data-slot="rich-text-editor"]')).toBeTruthy()
  })

  it('focuses the editor from its label', async () => {
    const { user } = renderWithSatin(<RichTextEditor label="Feedback" />)
    await user.click(screen.getByText('Feedback'))
    expect(document.activeElement).toBe(textbox())
    expect(textbox().closest('[data-slot="rich-text-editor-field"]')?.getAttribute('data-force')).toBe('focus')
  })

  it('reads markdown into headings, lists, a quote, marks, a link and a MentionNode', () => {
    const { types, mention, back } = nodeTypes(DOC)
    expect(types).toEqual([
      'heading:h1', 'text',
      'heading:h2', 'text',
      'paragraph', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text',
      'list:ul', 'listitem', 'text', 'listitem', 'text',
      'list:ol', 'listitem', 'text', 'listitem', 'text',
      'quote', 'text',
      'paragraph', 'text', 'mention', 'text', 'link', 'text', 'text',
    ])
    expect(mention).toEqual({ id: 'tara-id', label: 'Tara Mendes', bold: false })
    expect(back).toBe(DOC)
  })

  it('round-trips the markdown through the editor, mentions included', () => {
    const { handle } = renderEditor(<RichTextEditor aria-label="Feedback" defaultValue={DOC} />)
    expect(handle().getValue()).toBe(DOC)
    const box = textbox()
    expect(box.querySelector('h1')?.textContent).toBe('Interview feedback')
    expect(box.querySelector('strong')?.textContent).toBe('Strong')
    expect(box.querySelector('em')?.textContent).toBe('clear')
    expect(box.querySelector('.satin-rte-strike')?.textContent).toBe('late')
    expect(box.querySelector('code')?.textContent).toBe('npm test')
    expect(box.querySelectorAll('ul > li')).toHaveLength(2)
    expect(box.querySelectorAll('ol > li')).toHaveLength(2)
    expect(box.querySelector('blockquote')?.textContent).toBe('Hire')
    expect(box.querySelector('a')?.getAttribute('href')).toBe('https://example.com/brief')
    const mention = box.querySelector('[data-slot="mention"]')
    expect(mention?.getAttribute('data-mention-id')).toBe('tara-id')
    expect(mention?.textContent).toBe('@Tara Mendes')
  })

  it('keeps marks around a mention and escapes its label and id', () => {
    const md = '**[@Ana \\[QA\\] \\\\ Ops](mention:ana%2Fqa)** wrote this.'
    const { mention, back } = nodeTypes(md)
    expect(mention).toEqual({ id: 'ana/qa', label: 'Ana [QA] \\ Ops', bold: true })
    expect(back).toBe(md)
    expect(richTextMentions(md)).toEqual([{ id: 'ana/qa', label: 'Ana [QA] \\ Ops', trigger: '@' }])
  })

  it('writes and reads Lexical JSON with format="json"', () => {
    const { editor } = nodeTypes('Ask [@Tara Mendes](mention:tara-id) **now**')
    const json = JSON.stringify(editor.getEditorState().toJSON())
    const onValueChange = vi.fn()
    const { handle } = renderEditor(<RichTextEditor aria-label="Notes" format="json" defaultValue={json} onValueChange={onValueChange} />)
    const value = JSON.parse(handle().getValue())
    const paragraph = value.root.children[0]
    expect(paragraph.children[1]).toMatchObject({ type: 'mention', id: 'tara-id', label: 'Tara Mendes', trigger: '@', text: '@Tara Mendes' })
    expect(textbox().querySelector('[data-mention-id="tara-id"]')).toBeTruthy()
    act(() => handle().insertText('!'))
    expect(onValueChange).toHaveBeenCalledTimes(1)
    const [next, details] = onValueChange.mock.calls[0]
    expect(JSON.parse(next).root.type).toBe('root')
    expect(details).toEqual({ mentions: [{ id: 'tara-id', label: 'Tara Mendes', trigger: '@' }] })
  })

  it('sends edits with their mentions, never on mount, once each in StrictMode', () => {
    const onValueChange = vi.fn()
    const ref = React.createRef<RichTextEditorHandle>()
    renderWithSatin(
      <React.StrictMode>
        <RichTextEditor aria-label="Notes" defaultValue="Ask [@Tara Mendes](mention:tara-id)" onValueChange={onValueChange} editorRef={ref} />
      </React.StrictMode>,
    )
    expect(onValueChange).not.toHaveBeenCalled()
    act(() => ref.current!.insertText(' today'))
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenCalledWith('Ask [@Tara Mendes](mention:tara-id) today', {
      mentions: [{ id: 'tara-id', label: 'Tara Mendes', trigger: '@' }],
    })
  })

  it('doesn’t send back a value it would spell differently until it’s edited', async () => {
    const onValueChange = vi.fn()
    const { handle } = renderEditor(<RichTextEditor aria-label="Notes" defaultValue={'* one\n* two\n\n__bold__'} onValueChange={onValueChange} />)
    // The list's transforms run a moment after mount; they change nothing.
    await act(async () => {})
    expect(onValueChange).not.toHaveBeenCalled()
    act(() => handle().insertText('!'))
    expect(onValueChange).toHaveBeenCalledWith('* one\n* two\n\n**bold**!', { mentions: [] })
  })

  it('ignores a stale controlled value and replaces the document on a new one', () => {
    const onValueChange = vi.fn()
    const ref = React.createRef<RichTextEditorHandle>()
    const ui = (value: string) => <RichTextEditor aria-label="Notes" value={value} onValueChange={onValueChange} editorRef={ref} />
    const { rerender } = renderWithSatin(ui('Hello'))
    expect(onValueChange).not.toHaveBeenCalled()

    act(() => ref.current!.insertText(' there'))
    act(() => ref.current!.insertText(', Tara'))
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual(['Hello there', 'Hello there, Tara'])

    // The parent is a render behind: it passes back the first edit. The document stays.
    rerender(ui('Hello there'))
    expect(ref.current!.getValue()).toBe('Hello there, Tara')
    rerender(ui('Hello there, Tara'))
    expect(ref.current!.getValue()).toBe('Hello there, Tara')

    // A value from elsewhere replaces it, without being sent back.
    rerender(ui('# Replaced'))
    expect(ref.current!.getValue()).toBe('# Replaced')
    expect(textbox().querySelector('h1')?.textContent).toBe('Replaced')
    expect(onValueChange).toHaveBeenCalledTimes(2)
  })

  it('carries the value in a hidden input and counts text with maxLength', () => {
    const { handle } = renderEditor(<RichTextEditor label="Summary" name="summary" maxLength={20} defaultValue="**Hi**" />)
    const input = document.querySelector<HTMLInputElement>('input[type="hidden"][name="summary"]')
    expect(input?.value).toBe('**Hi**')
    expect(screen.getByText('2/20')).toBeTruthy()
    act(() => handle().insertText(' all'))
    expect(input?.value).toBe('**Hi** all')
    // Text, not markdown: "Hi all".
    expect(screen.getByText('6/20')).toBeTruthy()
    const box = textbox()
    expect(box.getAttribute('aria-describedby')).toBe(`${box.id}-counter`)
  })

  it('shows a status beside the hint', () => {
    renderWithSatin(<RichTextEditor label="Notes" hint="Markdown works." status="Saved" />)
    const box = textbox()
    expect(box.getAttribute('aria-describedby')).toBe(`${box.id}-hint ${box.id}-status`)
    expect(document.getElementById(`${box.id}-status`)?.textContent).toBe('Saved')
  })

  it('takes a FormField’s label, error, required and name', () => {
    renderWithSatin(
      <FormField label="Feedback" name="feedback" error="Write at least a line." required>
        <RichTextEditor defaultValue="Ok" />
      </FormField>,
    )
    const box = screen.getByRole('textbox', { name: 'Feedback' })
    expect(box.getAttribute('aria-invalid')).toBe('true')
    expect(box.getAttribute('aria-required')).toBe('true')
    const described = box.getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)?.textContent)
    expect(described).toContain('Write at least a line.')
    expect(box.closest('[data-slot="rich-text-editor-field"]')?.hasAttribute('data-invalid')).toBe(true)
    expect(document.querySelector<HTMLInputElement>('input[name="feedback"]')?.value).toBe('Ok')
  })

  it('marks itself invalid with an error message of its own', () => {
    renderWithSatin(<RichTextEditor label="Feedback" error="Too short." />)
    const box = textbox()
    expect(box.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(box.getAttribute('aria-describedby')!)?.textContent).toBe('Too short.')
  })

  it('is focusable but not editable when read-only', async () => {
    const { user } = renderWithSatin(<RichTextEditor label="Notes" readOnly defaultValue="Signed off." />)
    const box = textbox()
    expect(box.getAttribute('contenteditable')).toBe('false')
    expect(box.getAttribute('aria-readonly')).toBe('true')
    await user.tab()
    expect(document.activeElement).toBe(box)
  })

  it('is neither focusable nor editable when disabled', async () => {
    const { user } = renderWithSatin(
      <>
        <RichTextEditor label="Notes" disabled defaultValue="Locked." />
        <button>After</button>
      </>,
    )
    const box = textbox()
    expect(box.getAttribute('contenteditable')).toBe('false')
    expect(box.getAttribute('aria-disabled')).toBe('true')
    expect(box.closest('[data-slot="rich-text-editor"]')?.hasAttribute('data-disabled')).toBe(true)
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }))
  })

  it('keeps bold, italic, links and lists from Google Docs and drops the underline', async () => {
    const html =
      '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-5c1e"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">' +
      '<span style="font-size:11pt;font-weight:700;">Bold</span><span style="font-size:11pt;font-weight:400;"> and </span>' +
      '<span style="font-size:11pt;font-weight:400;font-style:italic;">italic</span><span style="font-size:11pt;font-weight:400;"> with </span>' +
      '<a href="https://example.com/" style="text-decoration:none;"><span style="font-size:11pt;color:#1155cc;font-weight:400;text-decoration:underline;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;">a link</span></a></p>' +
      '<ul style="margin-top:0;margin-bottom:0;"><li dir="ltr" style="list-style-type:disc;"><p dir="ltr" role="presentation"><span style="font-size:11pt;">One</span></p></li>' +
      '<li dir="ltr" style="list-style-type:disc;"><p dir="ltr" role="presentation"><span style="font-size:11pt;">Two</span></p></li></ul></b>'
    // jsdom has neither; Lexical's paste handling asks whether the event is one.
    globalThis.DragEvent ??= class DragEvent extends Event {} as typeof globalThis.DragEvent
    globalThis.ClipboardEvent ??= class ClipboardEvent extends Event {} as typeof globalThis.ClipboardEvent
    // Lexical places the caret after the paste; jsdom's ranges have no rects.
    Range.prototype.getBoundingClientRect ??= () => new DOMRect()
    Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList
    const { handle } = renderEditor(<RichTextEditor aria-label="Description" format="json" />)
    act(() => handle().focus())
    // The paste lands in Lexical's next update, a microtask later.
    await act(async () => {
      const event = new Event('paste', { bubbles: true, cancelable: true })
      const data = { 'text/html': html, 'text/plain': 'Bold and italic with a link\nOne\nTwo' } as Record<string, string>
      Object.defineProperty(event, 'clipboardData', { value: { types: Object.keys(data), getData: (type: string) => data[type] ?? '' } })
      textbox().dispatchEvent(event)
    })
    const value = handle().getValue()
    const texts: { text: string; format: number }[] = []
    const walk = (node: { type: string; text?: string; format?: number; children?: unknown[] }) => {
      if (node.type === 'text' || node.type === 'mention') texts.push({ text: node.text!, format: node.format! })
      ;(node.children as (typeof node)[] | undefined)?.forEach(walk)
    }
    walk(JSON.parse(value).root)
    const UNDERLINE = 8
    expect(texts.every((t) => (t.format & UNDERLINE) === 0)).toBe(true)
    const box = textbox()
    expect(box.querySelector('strong')?.textContent).toBe('Bold')
    expect(box.querySelector('em')?.textContent).toBe('italic')
    expect(box.querySelector('a')?.getAttribute('href')).toBe('https://example.com/')
    expect([...box.querySelectorAll('ul > li')].map((li) => li.textContent)).toEqual(['One', 'Two'])
    // The same document as markdown.
    const { back } = nodeTypes('**Bold** and *italic* with [a link](https://example.com/)\n\n- One\n- Two')
    expect(back).toBe('**Bold** and *italic* with [a link](https://example.com/)\n\n- One\n- Two')
  })

  it('inserts markdown at the selection', () => {
    const onValueChange = vi.fn()
    const { handle } = renderEditor(<RichTextEditor aria-label="Notes" defaultValue="Ask " onValueChange={onValueChange} />)
    act(() => handle().insert('[@Marta Nowak](mention:marta) **now**'))
    expect(handle().getValue()).toBe('Ask [@Marta Nowak](mention:marta) **now**')
    expect(onValueChange.mock.calls.at(-1)?.[1]).toEqual({ mentions: [{ id: 'marta', label: 'Marta Nowak', trigger: '@' }] })
  })

  it('builds from parts', () => {
    renderWithSatin(
      <RichTextEditorRoot defaultValue="From parts" placeholder="Write">
        <RichTextEditorContent aria-label="Notes" />
      </RichTextEditorRoot>,
    )
    expect(screen.getByRole('textbox', { name: 'Notes' }).textContent).toBe('From parts')
  })

  it('says its words through SatinLabels', () => {
    renderWithSatin(
      <>
        <RichTextEditor />
        <RichTextEditor label="Notatki" optional maxLength={100} />
      </>,
      { labels: { richTextEditor: 'Edytor tekstu', optional: '(Opcjonalne)', charactersUsed: 'Użyto znaków' } },
    )
    expect(screen.getByRole('textbox', { name: 'Edytor tekstu' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Notatki' })).toBeTruthy()
    expect(screen.getByText('(Opcjonalne)')).toBeTruthy()
    expect(screen.getByText(/Użyto znaków/)).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <>
        <RichTextEditor label="Feedback" hint="Shared with the panel." placeholder="Write your feedback" maxLength={500} />
        <RichTextEditor label="Notes" defaultValue={DOC} readOnly />
        <FormField label="Summary" error="Required.">
          <RichTextEditor disabled />
        </FormField>
      </>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})

/* ---------- toolbars, shortcuts, links, the bubble ---------- */

/** The Lexical editor behind the textbox (Lexical keeps it on its root element). */
const lexical = () => (textbox() as unknown as { __lexicalEditor: LexicalEditor }).__lexicalEditor

/** Selects `from`–`to` in the `nth` text node, as a drag would. */
function select(from: number, to: number, nth = 0) {
  act(() => lexical().update(() => $getRoot().getAllTextNodes()[nth].select(from, to), { discrete: true }))
}

const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)))

const button = (name: string, scope?: HTMLElement) => (scope ? within(scope) : screen).getByRole('button', { name })
const pressed = (name: string, scope?: HTMLElement) => button(name, scope).getAttribute('aria-pressed')
const names = (toolbar: HTMLElement) => within(toolbar).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)

/** A pointer selection ending: the bubble checks the selection on release. */
async function pointerSelect(from: number, to: number, nth = 0) {
  fireEvent.pointerDown(textbox())
  select(from, to, nth)
  // jsdom sends selectionchange a tick later; Lexical reads the selection back from it.
  await flush()
  select(from, to, nth)
  fireEvent.pointerUp(textbox())
  return screen.findByRole('toolbar', { name: 'Selection formatting' })
}

describe('RichTextEditor toolbars', () => {
  beforeAll(() => {
    // jsdom's ranges have no rects; the bubble and the popover measure the selection.
    Range.prototype.getBoundingClientRect ??= () => new DOMRect(10, 10, 40, 16)
    Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList
  })

  it('draws the formatting toolbar inside the field: one tab stop, arrows between items', async () => {
    const { user } = renderWithSatin(<RichTextEditor label="Notes" />)
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })
    expect(toolbar.closest('[data-slot="rich-text-editor-field"]')).toBeTruthy()
    expect(names(toolbar)).toEqual([
      'Text style: Paragraph',
      'Bold',
      'Italic',
      'Strikethrough',
      'Code',
      'Bullet list',
      'Numbered list',
      'Quote',
      'Link',
    ])
    expect(within(toolbar).getAllByRole('separator')).toHaveLength(3)
    expect(button('Bold').getAttribute('aria-keyshortcuts')).toBe('Control+B')
    expect(button('Strikethrough').getAttribute('aria-keyshortcuts')).toBe('Control+Shift+X')
    expect(button('Link').getAttribute('aria-keyshortcuts')).toBe('Control+K')
    await user.tab()
    expect(document.activeElement).toBe(button('Text style: Paragraph'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(button('Bold'))
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(button('Link'))
    await user.tab()
    expect(document.activeElement).toBe(textbox())
    expect(textbox().getAttribute('aria-keyshortcuts')).toBe('Alt+F10')
  })

  it('has a minimal preset, and none with toolbar={false} or read-only', () => {
    const { unmount } = renderWithSatin(<RichTextEditor aria-label="Notes" toolbar="minimal" />)
    expect(names(screen.getByRole('toolbar', { name: 'Formatting' }))).toEqual(['Bold', 'Italic', 'Bullet list', 'Link'])
    unmount()
    renderWithSatin(
      <>
        <RichTextEditor aria-label="A" toolbar={false} selectionToolbar={false} />
        <RichTextEditor aria-label="B" readOnly />
      </>,
    )
    expect(screen.queryByRole('toolbar')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'A' }).hasAttribute('aria-keyshortcuts')).toBe(false)
  })

  it('disables its items with the editor', () => {
    renderWithSatin(<RichTextEditor aria-label="Notes" disabled />)
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })
    expect(within(toolbar).getAllByRole('button').every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  it('toggles bold on the selection and shows it pressed while the selection is bold', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Notes" defaultValue="Hello world" />)
    select(0, 5)
    expect(pressed('Bold')).toBe('false')
    await user.click(button('Bold'))
    expect(handle().getValue()).toBe('**Hello** world')
    expect(pressed('Bold')).toBe('true')
    select(1, 3, 1)
    expect(pressed('Bold')).toBe('false')
    select(1, 3)
    expect(pressed('Bold')).toBe('true')
    await user.click(button('Italic'))
    expect(handle().getValue()).toBe('**H*el*lo** world')
  })

  it('sets headings from the text style menu and lists and quotes from their toggles', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Notes" defaultValue="Title" />)
    select(0, 0)
    await user.click(button('Text style: Paragraph'))
    const item = await screen.findByRole('menuitemradio', { name: 'Heading 2' })
    expect(screen.getByRole('menuitemradio', { name: 'Paragraph' }).getAttribute('aria-checked')).toBe('true')
    await user.click(item)
    expect(handle().getValue()).toBe('## Title')
    expect(button('Text style: Heading 2')).toBeTruthy()
    // A press gives focus back to the text.
    await waitFor(() => expect(document.activeElement).toBe(textbox()))

    await user.click(button('Bullet list'))
    expect(handle().getValue()).toBe('- Title')
    expect(pressed('Bullet list')).toBe('true')
    await user.click(button('Bullet list'))
    expect(handle().getValue()).toBe('Title')
    await user.click(button('Quote'))
    expect(handle().getValue()).toBe('> Title')
    expect(pressed('Quote')).toBe('true')
    await user.click(button('Quote'))
    expect(handle().getValue()).toBe('Title')
  })

  it('answers ⌘⇧X, ⌘E, ⌘⇧8 and ⌘⇧7 (Ctrl off Apple)', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Notes" defaultValue="Hello world" />)
    act(() => handle().focus())
    select(0, 5)
    await user.keyboard('{Control>}{Shift>}x{/Shift}{/Control}')
    expect(handle().getValue()).toBe('~~Hello~~ world')
    select(1, 6, 1)
    await user.keyboard('{Control>}e{/Control}')
    expect(handle().getValue()).toBe('~~Hello~~ `world`')
    await user.keyboard('{Control>}{Shift>}8{/Shift}{/Control}')
    expect(handle().getValue()).toBe('- ~~Hello~~ `world`')
    await user.keyboard('{Control>}{Shift>}7{/Shift}{/Control}')
    expect(handle().getValue()).toBe('1. ~~Hello~~ `world`')
  })

  it('adds, edits and removes a link from the popover', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Notes" defaultValue="Hello world" />)
    act(() => handle().focus())
    select(0, 5)
    await user.keyboard('{Control>}k{/Control}')
    const dialog = await screen.findByRole('dialog', { name: 'Add link' })
    const url = within(dialog).getByRole('textbox', { name: 'URL' })
    await waitFor(() => expect(document.activeElement).toBe(url))
    expect(within(dialog).queryByRole('button', { name: 'Remove link' })).toBeNull()

    // Refused: another scheme. The popover stays with the error.
    await user.type(url, 'javascript:alert(1){Enter}')
    expect(within(dialog).getByText('Enter a web address, an email address or a path.')).toBeTruthy()
    expect(url.getAttribute('aria-invalid')).toBe('true')
    expect(handle().getValue()).toBe('Hello world')

    await user.clear(url)
    await user.type(url, 'example.com/brief{Enter}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(handle().getValue()).toBe('[Hello](https://example.com/brief) world')
    expect(document.activeElement).toBe(textbox())

    // In the link: the button is pressed and opens Edit link with the address.
    select(2, 2)
    expect(pressed('Link')).toBe('true')
    await user.click(button('Link'))
    const edit = await screen.findByRole('dialog', { name: 'Edit link' })
    expect((within(edit).getByRole('textbox', { name: 'URL' }) as HTMLInputElement).value).toBe('https://example.com/brief')
    await user.click(within(edit).getByRole('button', { name: 'Remove link' }))
    expect(handle().getValue()).toBe('Hello world')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('inserts the address as linked text with nothing selected, and closes on Escape', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Notes" defaultValue="See " />)
    act(() => handle().focus())
    select(4, 4)
    await user.keyboard('{Control>}k{/Control}')
    let url = await screen.findByRole('textbox', { name: 'URL' })
    await waitFor(() => expect(document.activeElement).toBe(url))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(textbox())

    await user.keyboard('{Control>}k{/Control}')
    url = await screen.findByRole('textbox', { name: 'URL' })
    await waitFor(() => expect(document.activeElement).toBe(url))
    await user.type(url, 'mailto:hr@example.com{Enter}')
    expect(handle().getValue()).toBe('See [mailto:hr@example.com](mailto:hr@example.com)')
  })

  it('keeps the link popover’s submit from a form around the editor', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    const ref = React.createRef<RichTextEditorHandle>()
    const { user } = renderWithSatin(
      <form onSubmit={onSubmit}>
        <RichTextEditor aria-label="Notes" defaultValue="Hello" editorRef={ref} />
      </form>,
    )
    act(() => ref.current!.focus())
    select(0, 5)
    await user.keyboard('{Control>}k{/Control}')
    const url = await screen.findByRole('textbox', { name: 'URL' })
    await waitFor(() => expect(document.activeElement).toBe(url))
    await user.type(url, 'example.com{Enter}')
    expect(ref.current!.getValue()).toBe('[Hello](https://example.com)')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('normalises addresses', () => {
    expect(normalizeRichTextUrl('example.com')).toBe('https://example.com')
    expect(normalizeRichTextUrl(' https://a.io/x?y=1 ')).toBe('https://a.io/x?y=1')
    expect(normalizeRichTextUrl('hr@example.com')).toBe('mailto:hr@example.com')
    expect(normalizeRichTextUrl('/jobs/12')).toBe('/jobs/12')
    expect(normalizeRichTextUrl('#salary')).toBe('#salary')
    expect(normalizeRichTextUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeRichTextUrl('not a link')).toBeNull()
    expect(normalizeRichTextUrl('')).toBeNull()
  })

  it('reaches the toolbar with Alt+F10 and comes back with Escape', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Notes" defaultValue="Hello" />)
    act(() => handle().focus())
    await user.keyboard('{Alt>}{F10}{/Alt}')
    expect(document.activeElement).toBe(button('Text style: Paragraph'))
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(button('Bold'))
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(textbox())
  })

  it('shows the bubble after a pointer selection and hides it when the selection collapses', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Notes" toolbar={false} defaultValue="Hello world" />)
    act(() => handle().focus())
    // A keyboard selection doesn't bring it.
    select(0, 5)
    await act(async () => new Promise((r) => setTimeout(r, 10)))
    expect(screen.queryByRole('toolbar', { name: 'Selection formatting' })).toBeNull()

    const bubble = await pointerSelect(0, 5)
    expect(bubble.getAttribute('data-variant')).toBe('floating')
    expect(names(bubble)).toEqual(['Bold', 'Italic', 'Strikethrough', 'Link'])
    // Out of the tab order.
    expect(bubble.getAttribute('tabindex')).toBe('-1')
    expect(within(bubble).getAllByRole('button').every((b) => b.getAttribute('tabindex') === '-1')).toBe(true)

    await user.click(button('Bold', bubble))
    expect(handle().getValue()).toBe('**Hello** world')
    expect(pressed('Bold', bubble)).toBe('true')

    select(2, 2)
    expect(screen.queryByRole('toolbar', { name: 'Selection formatting' })).toBeNull()

    // Escape in the text puts it away.
    await pointerSelect(1, 6, 1)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('toolbar', { name: 'Selection formatting' })).toBeNull()
  })

  it('opens and focuses the bubble with Alt+F10 when there is no toolbar', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Notes" toolbar={false} defaultValue="Hello world" />)
    act(() => handle().focus())
    expect(textbox().getAttribute('aria-keyshortcuts')).toBe('Alt+F10')
    await user.keyboard('{Alt>}{F10}{/Alt}')
    const bubble = await screen.findByRole('toolbar', { name: 'Selection formatting' })
    await waitFor(() => expect(document.activeElement).toBe(button('Bold', bubble)))
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(textbox())
    expect(screen.queryByRole('toolbar', { name: 'Selection formatting' })).toBeNull()
  })

  it('builds from parts, with actions after the bubble’s items', async () => {
    renderWithSatin(
      <RichTextEditorRoot defaultValue="Hello world">
        <RichTextEditorContent aria-label="Notes">
          <RichTextToolbar>
            <RichTextFormatToggle format="bold" />
          </RichTextToolbar>
        </RichTextEditorContent>
        <RichTextSelectionToolbar actions={<ToolbarButton>Rewrite</ToolbarButton>} />
      </RichTextEditorRoot>,
    )
    expect(names(screen.getByRole('toolbar', { name: 'Formatting' }))).toEqual(['Bold'])
    const bubble = await pointerSelect(0, 5)
    expect(names(bubble)).toEqual(['Bold', 'Italic', 'Strikethrough', 'Link', 'Rewrite'])
    expect(within(bubble).getAllByRole('separator')).toHaveLength(1)
  })

  it('says its toolbar words through SatinLabels', async () => {
    const { user } = renderWithSatin(<RichTextEditor aria-label="Notatki" defaultValue="Tekst" />, {
      labels: {
        richTextToolbar: 'Formatowanie',
        richTextStyleOf: (style: string) => `Styl tekstu: ${style}`,
        richTextParagraph: 'Akapit',
        richTextHeading1: 'Nagłówek 1',
        richTextBold: 'Pogrubienie',
        richTextLink: 'Odnośnik',
      },
    })
    const toolbar = screen.getByRole('toolbar', { name: 'Formatowanie' })
    expect(within(toolbar).getByRole('button', { name: 'Styl tekstu: Akapit' })).toBeTruthy()
    expect(within(toolbar).getByRole('button', { name: 'Pogrubienie' })).toBeTruthy()
    expect(within(toolbar).getByRole('button', { name: 'Odnośnik' })).toBeTruthy()
    await user.click(within(toolbar).getByRole('button', { name: 'Styl tekstu: Akapit' }))
    expect(await screen.findByRole('menuitemradio', { name: 'Nagłówek 1' })).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations with the bubble open in %s', async (theme) => {
    renderEditor(<RichTextEditor label="Feedback" defaultValue="Hello world" />, { theme })
    await pointerSelect(0, 5)
    await expectNoAxeViolations()
  })

  it.each(['light', 'dark'] as const)('has no axe violations with the link popover open in %s', async (theme) => {
    const { user, handle } = renderEditor(<RichTextEditor label="Feedback" defaultValue="Hello world" />, { theme })
    act(() => handle().focus())
    select(0, 5)
    await user.keyboard('{Control>}k{/Control}')
    await screen.findByRole('dialog', { name: 'Add link' })
    await expectNoAxeViolations()
  })
})

/* ---------- @ mentions and / commands ---------- */

const PEOPLE: RichTextMention[] = [
  { id: 'tara', label: 'Tara Mendes', description: 'Recruiter' },
  { id: 'marta', label: 'Marta Nowak', description: 'Hiring manager' },
  { id: 'tom', label: 'Tom Okafor', description: 'Engineering manager' },
]
const searchPeople = (query: string) => PEOPLE.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
const SCORECARD = '- Communication\n- Craft\n- Culture\n- Hire'
const scorecard = (): RichTextCommand & { run: ReturnType<typeof vi.fn> } => ({
  name: 'scorecard',
  description: 'Add the interview scorecard',
  run: vi.fn(({ insert }: { insert: (markdown: string) => void }) => insert(SCORECARD)),
})

const options = () => screen.getAllByRole('option').map((o) => o.id)
const statusText = () => screen.getAllByRole('status').map((s) => s.textContent).join(' | ')

/** Focuses the editor and puts `text` in at the caret, as typing would. */
function type(handle: () => RichTextEditorHandle, text: string) {
  act(() => handle().focus())
  act(() => handle().insertText(text))
}

describe('RichTextEditor mentions and commands', () => {
  beforeAll(() => {
    Range.prototype.getBoundingClientRect ??= () => new DOMRect(10, 10, 40, 16)
    Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList
  })

  it('opens the @ menu on an async search and drops a stale answer', async () => {
    const answers: Record<string, (list: RichTextMention[]) => void> = {}
    const search = vi.fn((query: string) => new Promise<RichTextMention[]>((resolve) => (answers[query] = resolve)))
    const { handle } = renderEditor(<RichTextEditor aria-label="Feedback" mentions={{ search }} />)
    expect(textbox().getAttribute('aria-autocomplete')).toBe('list')
    type(handle, '@')
    expect(search).toHaveBeenCalledWith('')
    // Shut until the first answer.
    expect(screen.queryByRole('listbox')).toBeNull()
    await act(async () => answers['']!(PEOPLE))
    const list = screen.getByRole('listbox', { name: 'Mentions' })
    expect(within(list).getAllByRole('option')).toHaveLength(3)
    expect(textbox().getAttribute('aria-controls')).toBe(list.id)
    expect(textbox().getAttribute('aria-activedescendant')).toBe(`${list.id}-0`)
    expect(textbox().getAttribute('role')).toBe('textbox')
    expect(textbox().hasAttribute('aria-expanded')).toBe(false)

    act(() => handle().insertText('t'))
    act(() => handle().insertText('a'))
    await act(async () => answers['ta']!([PEOPLE[0]!]))
    // The answer for "t" comes last: it's dropped.
    await act(async () => answers['t']!(PEOPLE))
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['TMTara MendesRecruiter'])
  })

  it('moves the highlight with the arrows and inserts a mention with Enter', async () => {
    const onValueChange = vi.fn()
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Feedback" mentions={{ search: searchPeople }} onValueChange={onValueChange} />)
    type(handle, 'Ask @')
    const list = screen.getByRole('listbox')
    expect(statusText()).toContain('3 suggestions')
    await user.keyboard('{ArrowDown}')
    expect(textbox().getAttribute('aria-activedescendant')).toBe(`${list.id}-1`)
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(textbox().getAttribute('aria-activedescendant')).toBe(`${list.id}-2`)
    await user.keyboard('{ArrowDown}')
    expect(options()[0]).toBe(textbox().getAttribute('aria-activedescendant'))
    await user.keyboard('{Enter}')

    expect(screen.queryByRole('listbox')).toBeNull()
    expect(textbox().hasAttribute('aria-controls')).toBe(false)
    expect(textbox().hasAttribute('aria-activedescendant')).toBe(false)
    const mention = textbox().querySelector('[data-slot="mention"]')
    expect(mention?.textContent).toBe('@Tara Mendes')
    expect(mention?.getAttribute('data-mention-id')).toBe('tara')
    // One paragraph: Enter didn't add another.
    expect(textbox().querySelectorAll('p')).toHaveLength(1)
    expect(handle().getValue()).toBe('Ask [@Tara Mendes](mention:tara) ')
    expect(onValueChange.mock.calls.at(-1)).toEqual(['Ask [@Tara Mendes](mention:tara) ', { mentions: [{ id: 'tara', label: 'Tara Mendes', trigger: '@' }] }])
    expect(statusText()).toContain('@Tara Mendes added')
    // Typing goes on after the space.
    act(() => handle().insertText('today'))
    expect(handle().getValue()).toBe('Ask [@Tara Mendes](mention:tara) today')
  })

  it('picks with Tab, keeps spaces in a mention query and uses avatar as the icon', async () => {
    const { user, handle } = renderEditor(
      <RichTextEditor
        aria-label="Feedback"
        mentions={{ search: (q) => searchPeople(q).map((p) => ({ ...p, avatar: <span data-testid={`avatar-${p.id}`} /> })) }}
      />,
    )
    type(handle, '@Marta N')
    expect(screen.getByTestId('avatar-marta')).toBeTruthy()
    await user.keyboard('{Tab}')
    expect(handle().getValue()).toBe('[@Marta Nowak](mention:marta) ')
    expect(document.activeElement).toBe(textbox())
  })

  it('picks a row with the pointer', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Feedback" mentions={{ search: searchPeople }} />)
    type(handle, 'cc @to')
    await user.click(screen.getByRole('option', { name: /Tom Okafor/ }))
    expect(handle().getValue()).toBe('cc [@Tom Okafor](mention:tom) ')
  })

  it('closes on Escape, which a Dialog around it gets the next time', async () => {
    const onOpenChange = vi.fn()
    const ref = React.createRef<RichTextEditorHandle>()
    const handle = () => ref.current!
    const { user } = renderWithSatin(
      <Dialog defaultOpen onOpenChange={onOpenChange} title="Feedback">
        <RichTextEditor aria-label="Feedback" mentions={{ search: searchPeople }} editorRef={ref} />
      </Dialog>,
    )
    type(handle, '@')
    expect(screen.getByRole('listbox')).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(onOpenChange).not.toHaveBeenCalled()
    // It stays shut while the query goes on, until the next trigger.
    act(() => handle().insertText('t'))
    expect(screen.queryByRole('listbox')).toBeNull()
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('takes Escape only while the menu is open', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Feedback" mentions={{ search: searchPeople }} />)
    type(handle, '@')
    const reached = vi.fn(() => false)
    act(() => void lexical().registerCommand(KEY_ESCAPE_COMMAND, reached, COMMAND_PRIORITY_LOW))
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(textbox())
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(reached).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(reached).toHaveBeenCalledTimes(1)
    // Not taken, it does what Escape does in the text (it leaves). Back in, a new trigger opens the menu again.
    type(handle, ' @')
    expect(screen.getByRole('listbox')).toBeTruthy()
  })

  it('says “No results” and leaves Enter and Tab alone then', async () => {
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Feedback" mentions={{ search: searchPeople }} />)
    type(handle, '@zz')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Mentions' }).textContent).toContain('No results for “@zz”')
    expect(statusText()).toContain('No results for “@zz”')
    expect(textbox().hasAttribute('aria-controls')).toBe(false)
    await user.keyboard('{Enter}')
    expect(textbox().querySelectorAll('p')).toHaveLength(2)
    // A space after no match closes it.
    type(handle, '@zz ')
    expect(screen.queryByRole('dialog', { name: 'Mentions' })).toBeNull()
  })

  it('opens / commands; a pick removes the query and runs the command, whose insert adds markdown', async () => {
    const command = scorecard()
    const other: RichTextCommand = { name: 'summary', description: 'Add a summary heading', run: vi.fn() }
    const { user, handle } = renderEditor(<RichTextEditor aria-label="Feedback" defaultValue="Great call." commands={[command, other]} />)
    act(() => handle().focus())
    act(() => lexical().update(() => $getRoot().selectEnd(), { discrete: true }))
    await user.keyboard('{Enter}')
    act(() => handle().insertText('/sc'))
    const list = screen.getByRole('listbox', { name: 'Commands' })
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual(['/scorecardAdd the interview scorecard'])
    await user.keyboard('{Enter}')
    expect(command.run).toHaveBeenCalledTimes(1)
    expect(command.run.mock.calls[0]![0].editor.getValue).toBeTypeOf('function')
    expect(other.run).not.toHaveBeenCalled()
    const value = handle().getValue()
    expect(value).not.toContain('/sc')
    expect(value).toContain(SCORECARD)
    expect([...textbox().querySelectorAll('ul > li')].map((li) => li.textContent)).toEqual(['Communication', 'Craft', 'Culture', 'Hire'])
  })

  it('opens neither menu mid-word, in a URL or after the query ends', () => {
    const { handle } = renderEditor(<RichTextEditor aria-label="Feedback" mentions={{ search: searchPeople }} commands={[scorecard()]} />)
    type(handle, 'and/or')
    expect(screen.queryByRole('listbox')).toBeNull()
    act(() => handle().insertText(' mail tara@example.com https://x.io/sc'))
    expect(screen.queryByRole('listbox')).toBeNull()
    act(() => handle().insertText(' /scorecard now'))
    expect(screen.queryByRole('listbox')).toBeNull()
    act(() => handle().insertText(' /'))
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeTruthy()
  })

  it('opens no menu while an input method is composing', () => {
    const { handle } = renderEditor(<RichTextEditor aria-label="Feedback" mentions={{ search: searchPeople }} commands={[scorecard()]} />)
    type(handle, 'Hi ')
    act(() => {
      textbox().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }))
    })
    expect(lexical().isComposing()).toBe(true)
    act(() =>
      lexical().update(
        () => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) selection.insertText('@')
        },
        { discrete: true },
      ),
    )
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Mentions' })).toBeNull()
  })

  it('removes a mention whole when an edit cuts into it, and says so', () => {
    const { handle } = renderEditor(
      <RichTextEditor aria-label="Feedback" defaultValue="Ask [@Tara Mendes](mention:tara) now" mentions={{ search: searchPeople }} />,
    )
    act(() => handle().focus())
    // Backspace at its end is Lexical's token deletion, which steps with Selection.modify (not in
    // jsdom; checked in a browser). An edit that takes part of it takes all of it.
    act(() =>
      lexical().update(
        () => {
          const mention = $getRoot().getAllTextNodes().find((n) => n instanceof MentionNode)!
          expect(mention.isToken()).toBe(true)
          mention.select(5, 12)
          const selection = $getSelection()
          if ($isRangeSelection(selection)) selection.removeText()
        },
        { discrete: true },
      ),
    )
    expect(handle().getValue()).toBe('Ask  now')
    expect(textbox().querySelector('[data-slot="mention"]')).toBeNull()
    expect(statusText()).toContain('@Tara Mendes removed')
  })

  it('pastes markdown mention text as plain text and a mention span as a mention', async () => {
    globalThis.DragEvent ??= class DragEvent extends Event {} as typeof globalThis.DragEvent
    globalThis.ClipboardEvent ??= class ClipboardEvent extends Event {} as typeof globalThis.ClipboardEvent
    const paste = async (data: Record<string, string>) =>
      act(async () => {
        const event = new Event('paste', { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'clipboardData', { value: { types: Object.keys(data), getData: (t: string) => data[t] ?? '' } })
        textbox().dispatchEvent(event)
      })
    const { handle } = renderEditor(<RichTextEditor aria-label="Feedback" format="json" />)
    act(() => handle().focus())
    await paste({ 'text/plain': 'See [@Tara Mendes](mention:tara)' })
    expect(textbox().querySelector('[data-mention-id]')).toBeNull()
    expect(textbox().textContent).toBe('See [@Tara Mendes](mention:tara)')
    await paste({ 'text/html': '<p>and <span data-slot="mention" data-mention-id="marta">@Marta Nowak</span></p>', 'text/plain': 'and @Marta Nowak' })
    const mention = textbox().querySelector('[data-mention-id="marta"]')
    expect(mention?.textContent).toBe('@Marta Nowak')
    const types: string[] = []
    const walk = (node: { type: string; children?: unknown[] }) => {
      types.push(node.type)
      ;(node.children as (typeof node)[] | undefined)?.forEach(walk)
    }
    walk(JSON.parse(handle().getValue()).root)
    expect(types.filter((t) => t === 'mention')).toHaveLength(1)
  })

  it('says its menu words through SatinLabels', () => {
    const { handle } = renderEditor(<RichTextEditor aria-label="Opinia" mentions={{ search: searchPeople }} />, {
      labels: { mentions: 'Wzmianki', suggestionsCount: (n: number) => `Propozycje: ${n}`, noResultsFor: (q: string) => `Brak wyników dla ${q}` },
    })
    type(handle, '@')
    expect(screen.getByRole('listbox', { name: 'Wzmianki' })).toBeTruthy()
    expect(statusText()).toContain('Propozycje: 3')
    act(() => handle().insertText('qq'))
    expect(screen.getByRole('dialog', { name: 'Wzmianki' }).textContent).toContain('Brak wyników dla @qq')
  })

  it('has no menus when disabled or read-only', () => {
    renderWithSatin(<RichTextEditor aria-label="Feedback" readOnly mentions={{ search: searchPeople }} />)
    expect(textbox().hasAttribute('aria-autocomplete')).toBe(false)
  })

  it.each(['light', 'dark'] as const)('has no axe violations with the @ menu open in %s', async (theme) => {
    const { handle } = renderEditor(<RichTextEditor label="Feedback" mentions={{ search: searchPeople }} />, { theme })
    type(handle, '@')
    expect(screen.getByRole('listbox')).toBeTruthy()
    await expectNoAxeViolations()
  })
})
