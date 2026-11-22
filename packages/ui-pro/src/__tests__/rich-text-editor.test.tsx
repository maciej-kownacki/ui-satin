import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { $getRoot, $isElementNode, $isTextNode, createEditor, type LexicalNode } from 'lexical'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListItemNode, ListNode } from '@lexical/list'
import { LinkNode } from '@lexical/link'
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown'
import { FormField } from '@uisatin/ui/form-field'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import {
  MentionNode,
  RICH_TEXT_TRANSFORMERS,
  RichTextEditor,
  RichTextEditorContent,
  RichTextEditorRoot,
  richTextMentions,
  type RichTextEditorHandle,
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
