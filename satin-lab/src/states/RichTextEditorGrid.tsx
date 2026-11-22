import * as React from 'react'
import { Avatar } from '@uisatin/ui/avatar'
import { PromptMentionsMenu, type PromptMenuItem } from '@uisatin/ui/prompt-mentions'
import { RichTextEditor } from '@uisatin/pro/rich-text-editor'

/**
 * Every Rich text editor state, one per row: empty with the placeholder, focused with the @ menu
 * open under it (the menu drawn by itself, anchored to the field, since a real one needs typing),
 * read-only, disabled and error.
 */
const feedback = `**Strong** craft and *clear* writing. [@Marta Nowak](mention:marta) can you check the take-home?

- Portfolio review: yes
- Hire: leaning yes`

const items: PromptMenuItem[] = [
  { kind: 'mention', mention: { id: 'marta', label: 'Marta Nowak', description: 'Design lead, panel', icon: <Avatar initials="MN" tone="fuchsia" size={20} aria-hidden /> } },
  { kind: 'mention', mention: { id: 'mateo', label: 'Mateo Ruiz', description: 'Engineering manager', icon: <Avatar initials="MR" tone="green" size={20} aria-hidden /> } },
]

const common = { label: 'Feedback', hint: 'Shared with the hiring panel.' }
const noop = () => {}

function MenuOpen() {
  const anchor = React.useRef<HTMLDivElement>(null)
  return (
    // Room under the field for the menu, so it doesn't cover the next row.
    <div className="pb-36">
      <div ref={anchor}>
        <RichTextEditor {...common} defaultValue="Can you check the take-home, @ma" data-force="focus" mentions={{ search: () => [] }} />
      </div>
      <PromptMentionsMenu
        open
        heading={false}
        kind="mention"
        items={items}
        index={0}
        viaKeys={false}
        query="@ma"
        listId="rte-grid-menu"
        message=""
        onPick={noop}
        onHighlight={noop}
        onDismiss={noop}
        anchorRef={anchor}
        side="bottom"
        align="start"
        matchAnchorWidth={false}
      />
    </div>
  )
}

const rows: { name: string; node: React.ReactNode }[] = [
  { name: 'Empty', node: <RichTextEditor {...common} placeholder="How did the interview go?" /> },
  { name: 'Focus, @ menu', node: <MenuOpen /> },
  { name: 'Read-only', node: <RichTextEditor {...common} defaultValue={feedback} readOnly /> },
  { name: 'Disabled', node: <RichTextEditor {...common} defaultValue={feedback} disabled /> },
  { name: 'Error', node: <RichTextEditor {...common} defaultValue={feedback} error="Add a hire recommendation before you send it." /> },
]

export function RichTextEditorGrid() {
  return (
    <div className="inline-grid grid-cols-[100px_480px] items-start gap-x-8 gap-y-8 p-8 text-xs text-text-muted">
      {rows.map((r) => (
        <div key={r.name} className="contents">
          <span className="pt-7 text-sm text-text-default">{r.name}</span>
          {r.node}
        </div>
      ))}
    </div>
  )
}
