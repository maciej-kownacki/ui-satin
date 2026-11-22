/* Type test, never run: RichTextEditor controlled and not, its parts, ref and editorRef, its words in SatinLabels. */
import * as React from 'react'
import { SatinLabels } from '@uisatin/ui/labels'
import { ToolbarButton, ToolbarSeparator } from '@uisatin/ui/toolbar'
import {
  RichTextBlockToggle,
  RichTextBlockTypeMenu,
  RichTextEditor,
  RichTextEditorContent,
  RichTextEditorRoot,
  RichTextFormatToggle,
  RichTextLinkButton,
  RichTextSelectionToolbar,
  RichTextToolbar,
  normalizeRichTextUrl,
  richTextMentions,
  type RichTextSelectionState,
  type RichTextCommand,
  type RichTextEditorHandle,
  type RichTextMention,
  type RichTextMentionRef,
} from '../components/rich-text-editor'

const rootRef = React.createRef<HTMLDivElement>()
const editorRef = React.createRef<RichTextEditorHandle>()

export function Controlled() {
  const [value, setValue] = React.useState('**Hi** [@Tara Mendes](mention:tara)')
  const [mentioned, setMentioned] = React.useState<RichTextMentionRef[]>([])
  return (
    <RichTextEditor
      ref={rootRef}
      editorRef={editorRef}
      label="Feedback"
      hint="Shared with the panel."
      value={value}
      onValueChange={(next, { mentions }) => {
        setValue(next)
        setMentioned(mentions)
      }}
      maxLength={500}
      status={mentioned.length ? `${mentioned.length} mentioned` : null}
    />
  )
}

export const uncontrolled = <RichTextEditor aria-label="Notes" defaultValue="# Brief" placeholder="Write" readOnly name="notes" optional />

export const json = <RichTextEditor aria-label="Notes" format="json" defaultValue="" error disabled />

// @ts-expect-error: not a format
export const wrongFormat = <RichTextEditor format="html" />

// @ts-expect-error: a value is a string
export const wrongValue = <RichTextEditor value={{ root: {} }} />

const people: RichTextMention[] = [{ id: 'tara', label: 'Tara Mendes', avatar: <span /> }]
const commands: RichTextCommand[] = [{ name: 'scorecard', run: ({ insert, editor }) => (insert('| A |'), editor.focus()) }]
export const later = <RichTextEditor aria-label="Notes" toolbar="minimal" mentions={{ search: () => people }} commands={commands} />

export const parts = (
  <SatinLabels labels={{ richTextEditor: 'Edytor tekstu' }}>
    <RichTextEditorRoot ref={rootRef} editorRef={editorRef} defaultValue="Parts" placeholder="Write" onValueChange={(v: string) => v}>
      <RichTextEditorContent aria-label="Notes" autoFocus data-force="focus" />
    </RichTextEditorRoot>
  </SatinLabels>
)

export function useHandle() {
  editorRef.current?.insert('**now**')
  editorRef.current?.insertText('now')
  const rect: DOMRect | null | undefined = editorRef.current?.getSelectionRect()
  const value: string | undefined = editorRef.current?.getValue()
  const ids: string[] = richTextMentions(value ?? '', 'markdown').map((m) => m.id)
  // @ts-expect-error: the Lexical editor isn't part of the handle
  editorRef.current?.editor
  return { rect, ids }
}

export const toolbars = (
  <SatinLabels labels={{ richTextToolbar: 'Formatowanie', richTextStyleOf: (style: string) => `Styl: ${style}` }}>
    <RichTextEditor aria-label="Notes" toolbar={false} selectionToolbar={false} />
    <RichTextEditorRoot>
      <RichTextEditorContent aria-label="Notes">
        <RichTextToolbar preset="minimal" size="md" aria-label="Format">
          <RichTextBlockTypeMenu />
          <ToolbarSeparator />
          <RichTextFormatToggle format="code" label="Kod" />
          <RichTextBlockToggle block="quote" />
          <RichTextLinkButton shortcut="⌘L" />
        </RichTextToolbar>
      </RichTextEditorContent>
      <RichTextSelectionToolbar actions={<ToolbarButton>Rewrite</ToolbarButton>} />
    </RichTextEditorRoot>
  </SatinLabels>
)

// @ts-expect-error: underline isn't a mark the editor keeps
export const wrongMark = <RichTextFormatToggle format="underline" />

// @ts-expect-error: headings go through the text style menu
export const wrongBlock = <RichTextBlockToggle block="h1" />

// @ts-expect-error: the selection toolbar is always floating
export const wrongVariant = <RichTextSelectionToolbar variant="plain" />

export const url: string | null = normalizeRichTextUrl('example.com')
export const state: RichTextSelectionState['block'] = 'number'
