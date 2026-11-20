'use client'

import * as React from 'react'
import { Popover } from 'radix-ui'
import { cn } from '../lib/utils'
import { Avatar } from './avatar'
import { MenuItemContent, menuGroupLabelClass, menuItemClass, menuSurfaceClass } from './dropdown'
import { KbdArrowDown, KbdArrowUp, KbdHint, KbdReturn } from './kbd'
import { useSatinLabels } from './labels'

/**
 * Mentions and commands, for PromptBar (`mentions`, `commands`) or any textarea
 * (`usePromptMentions`). `@` references a person or a record and `/` names an action; what is
 * picked goes into the text as a token, "@Tara Mendes" or "/schedule".
 *
 * The text stays in the native textarea, so typing, selection, spelling, input methods and screen
 * readers work as in any field, and a token reads as what it says ("@Tara Mendes"). The tokens'
 * fills are drawn in a layer under the textarea that copies its type and wrapping: a mention on
 * status/brand-bg with a status/brand-border edge, a command on action/secondary-bg with a
 * border/default edge, radius-sm, 3px past the text on each side. A token's text is medium, like
 * the menu's labels: Geist at medium (510) is about 3% wider than the field's 420, which would put
 * the caret and every later fill off the textarea's glyphs, so the layer instead strokes the
 * token's text, 0.029em in text/default (the field's colour), under the textarea's own glyph.
 * That adds the ink medium adds (0.4px at 14px) and leaves every width as the textarea has it.
 * A token is one unit: the caret steps over it, Backspace at its end and Delete at its start
 * remove all of it, and an edit that cuts into it takes the whole token.
 *
 * The menu is the + menu's: the menu surface across the full width of the bar, 8px above it, with
 * Popover motion (it fades and settles in). A 24px group header names it (Mentions or Commands),
 * then inline menu rows (a 20px Avatar or icon, the name, a muted description) and the ↑ ↓ / ↵ key
 * hints. It opens when `@` (or `trigger`) or `/` is typed at the start of the text or after a space,
 * and follows the text typed after it. A mention's query may hold spaces ("Tara Me"); once it has
 * a space and nothing matches, the menu closes. A command's query ends at a space; a space right
 * after a command's full name ("/schedule ") makes it a token without the menu. A message holds
 * one command, so once it has one, `/` types a slash.
 *
 * Keys, with focus in the field (the combobox pattern, without the role, which HTML doesn't allow
 * on a textarea): ↑ ↓ move the highlight, Enter or Tab inserts it, Escape closes the menu until
 * the next trigger. The field points at the list with `aria-controls` and at the highlighted row
 * with `aria-activedescendant`; a status region says how many suggestions there are and which
 * token went in or out. While an input method is composing, no menu opens and no key is taken.
 */
export interface PromptMention {
  /** Your id for the person or record; it comes back in the value. */
  id: string
  /** The name after the trigger: "Tara Mendes" goes in as "@Tara Mendes". */
  label: string
  /** One line after the name in the menu: a role, a record's type. */
  description?: string
  /** 20px, before the name in the menu. Defaults to an Avatar with the label's initials. */
  icon?: React.ReactNode
}

export interface PromptMentions {
  /** The character that opens the menu. One character; not `/`, which is for commands. Defaults to `@`. */
  trigger?: string
  /** What matches the text typed after the trigger ("" right after it). It can return a promise. */
  search: (query: string) => PromptMention[] | Promise<PromptMention[]>
}

export interface PromptCommand {
  /** Typed after the slash, with no spaces: "schedule" goes in as "/schedule". */
  name: string
  /** One line after the name in the menu. */
  description?: string
  /** 16px, before the name in the menu. */
  icon?: React.ReactNode
  /**
   * Runs when a message with this command is sent, instead of `onSubmit`. Without it, `onSubmit`
   * gets the message, with the command in its value.
   */
  run?: (input: PromptCommandInput) => void
}

export interface PromptCommandInput {
  /** The text after the command, trimmed: "interview next week". */
  args: string
  /** The whole message: its text, mentions and command. */
  value: PromptValue
  attachments: File[]
}

/** A mention in the text: `text.slice(start, end)` is the trigger and the label. */
export interface PromptMentionToken extends PromptMention {
  start: number
  end: number
}

/** The command in the text: `text.slice(start, end)` is "/" and the name. */
export interface PromptCommandToken {
  name: string
  start: number
  end: number
  /** The text after it, trimmed. */
  args: string
}

/** A prompt with its tokens: what PromptBar's `value` can be, and what it reports. */
export interface PromptValue {
  text: string
  /** In the order they appear. */
  mentions: PromptMentionToken[]
  /** A message names one command at most. */
  command?: PromptCommandToken
}

type Span = { start: number; end: number }
type Token = Span & { kind: 'mention' | 'command'; text: string }

const space = /\s/
const shift = <T extends Span>(s: T, by: number): T => ({ ...s, start: s.start + by, end: s.end + by })

/**
 * Drops tokens whose text no longer reads as them, sorts the mentions and works out the
 * command's arguments.
 */
function settle(v: PromptValue, trigger: string): PromptValue {
  const { text } = v
  const mentions = v.mentions
    .filter((m) => m.end === m.start + 1 + m.label.length && text.slice(m.start, m.end) === trigger + m.label)
    .sort((a, b) => a.start - b.start)
  const c = v.command
  const command = c && text.slice(c.start, c.end) === `/${c.name}` && c.end === c.start + 1 + c.name.length ? { ...c, args: text.slice(c.end).trim() } : undefined
  return command ? { text, mentions, command } : { text, mentions }
}

/** Every token, in order, with the text it shows. */
function tokensOf(v: PromptValue, trigger: string): Token[] {
  const list: Token[] = v.mentions.map((m) => ({ kind: 'mention' as const, start: m.start, end: m.end, text: trigger + m.label }))
  if (v.command) list.push({ kind: 'command', start: v.command.start, end: v.command.end, text: `/${v.command.name}` })
  return list.sort((a, b) => a.start - b.start)
}

/** The value with new text, each token moved by `map` (or dropped when it returns null). */
function remap(v: PromptValue, text: string, map: (s: Span) => Span | null, trigger: string): PromptValue {
  const mentions = v.mentions.flatMap((m) => {
    const s = map(m)
    return s ? [{ ...m, start: s.start, end: s.end }] : []
  })
  const s = v.command && map(v.command)
  return settle({ text, mentions, command: s && v.command ? { ...v.command, start: s.start, end: s.end } : undefined }, trigger)
}

/** Moves the tokens through an edit of the text: the ones it touches are dropped, the ones after it move. */
function edit(v: PromptValue, text: string, caret: number, trigger: string): PromptValue {
  const prev = v.text
  // What follows the caret is unchanged; what precedes the edit is the common prefix.
  let s = 0
  const maxS = Math.min(prev.length, text.length, text.length - caret)
  while (s < maxS && prev[prev.length - 1 - s] === text[text.length - 1 - s]) s++
  let p = 0
  const maxP = Math.min(prev.length - s, text.length - s)
  while (p < maxP && prev[p] === text[p]) p++
  const oldEnd = prev.length - s
  const by = text.length - prev.length
  return remap(v, text, (t) => (t.end <= p ? t : t.start >= oldEnd ? shift(t, by) : null), trigger)
}

/** Cuts [start, end) out of the text, and every token inside it. */
function cut(v: PromptValue, start: number, end: number, trigger: string): PromptValue {
  const text = v.text.slice(0, start) + v.text.slice(end)
  return remap(v, text, (t) => (t.end <= start ? t : t.start >= end ? shift(t, start - end) : null), trigger)
}

/** A prompt value from text, mentions and commands in order: `promptValue([tara, ' ', schedule, ' interview next week'])`. */
export function promptValue(parts: Array<string | PromptMention | PromptCommand>, trigger = '@'): PromptValue {
  let text = ''
  const mentions: PromptMentionToken[] = []
  let command: PromptCommandToken | undefined
  for (const part of parts) {
    const start = text.length
    if (typeof part === 'string') text += part
    else if ('name' in part) {
      text += `/${part.name}`
      command ??= { name: part.name, start, end: text.length, args: '' }
    } else {
      text += trigger + part.label
      mentions.push({ ...part, start, end: text.length })
    }
  }
  return settle({ text, mentions, command }, trigger)
}

/** @internal A prompt value from what PromptBar's `value` or `defaultValue` takes. */
export function toPromptValue(value: string | PromptValue | undefined, trigger = '@'): PromptValue {
  if (value == null) return { text: '', mentions: [] }
  return typeof value === 'string' ? { text: value, mentions: [] } : settle(value, trigger)
}

type Query = { kind: 'mention' | 'command'; trigger: string; start: number; end: number; text: string }
type Item = { kind: 'mention'; mention: PromptMention } | { kind: 'command'; command: PromptCommand }

/** The trigger the caret is typing after, if any: at the start or after a space, on the same line, outside tokens. */
function findQuery(v: PromptValue, caret: number, trigger: string | null, commands: boolean, tokens: Token[]): Query | null {
  const { text } = v
  for (let i = caret - 1; i >= Math.max(0, caret - 64); i--) {
    const ch = text[i]
    if (ch === '\n' || tokens.some((t) => i >= t.start && i < t.end)) return null
    const kind = ch === trigger ? 'mention' : commands && !v.command && ch === '/' ? 'command' : null
    if (!kind) continue
    if (i > 0 && !space.test(text[i - 1])) return null
    const query = text.slice(i + 1, caret)
    if (kind === 'command' ? space.test(query) : /^\s|\s\s/.test(query)) return null
    return { kind, trigger: ch, start: i, end: caret, text: query }
  }
  return null
}

const initialsOf = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

/** What the mirror copies from the textarea, so its text wraps on the same lines. */
const MIRRORED = [
  'boxSizing',
  'direction',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'letterSpacing',
  'wordSpacing',
  'lineHeight',
  'textAlign',
  'textIndent',
  'textTransform',
  'tabSize',
  'whiteSpace',
  'overflowWrap',
  'wordBreak',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
] as const

/** How far the mirror reaches past the textarea's sides: room for a fill at the line's edge. */
const BLEED = 4

// The fills reach 3px past the text on each side (margin pulls the box out, padding puts the text
// back), so the text sits exactly where the textarea draws it. The stroke, in the field's colour
// under its glyphs, makes the token's text medium without moving it (see the top of the file); it
// reads the token, not a colour copied from the field, so it follows a theme change at once.
const tokenClass = cn(
  '-mx-[3px] rounded-sm px-[3px] py-px box-decoration-clone',
  'text-text-default [-webkit-text-stroke:0.029em_currentColor]',
)
const mentionTokenClass = 'bg-status-brand-bg [box-shadow:inset_0_0_0_var(--border-width-default)_var(--status-brand-border)]'
const commandTokenClass = 'bg-action-secondary-bg [box-shadow:inset_0_0_0_var(--border-width-default)_var(--border-default)]'

export interface UsePromptMentionsOptions {
  /** The textarea the prompt is typed in. */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  /** What the menu opens above, at its full width. Defaults to the textarea. */
  anchorRef?: React.RefObject<HTMLElement | null>
  value: PromptValue
  onValueChange: (value: PromptValue) => void
  mentions?: PromptMentions
  commands?: PromptCommand[]
  disabled?: boolean
}

export interface PromptMentionsHandle {
  /**
   * Spread onto the textarea. To run handlers of your own, call these first and skip yours when
   * `event.defaultPrevented` (Enter and Tab in the open menu insert the highlighted row).
   */
  textareaProps: Required<
    Pick<
      React.ComponentProps<'textarea'>,
      'onChange' | 'onKeyDown' | 'onSelect' | 'onBlur' | 'onScroll' | 'onPaste' | 'onCut' | 'onCompositionStart' | 'onCompositionEnd'
    >
  > &
    Pick<React.ComponentProps<'textarea'>, 'aria-autocomplete' | 'aria-controls' | 'aria-activedescendant'>
  /** The tokens' fills: render it just before the textarea, both in a `relative` box the textarea fills; give the textarea `position: relative`. */
  overlay: React.ReactNode
  /** The menu (portaled) and the status region: render it anywhere next to the textarea. */
  menu: React.ReactNode
  /** The menu is open: Enter and Tab pick a row instead of what they'd do. */
  open: boolean
}

/**
 * Mentions and commands on a textarea of your own: PromptBar's `mentions` and `commands` are
 * built on it. Keep the value as a `PromptValue` and pass it back in.
 */
export function usePromptMentions({
  textareaRef,
  anchorRef,
  value,
  onValueChange,
  mentions,
  commands,
  disabled = false,
}: UsePromptMentionsOptions): PromptMentionsHandle {
  const labels = useSatinLabels()
  const trigger = mentions ? (mentions.trigger ?? '@') : null
  const commandsOn = !!commands?.length
  const on = !!mentions || commandsOn
  const id = React.useId()
  const listId = `${id}-list`

  // The newest value, ahead of the parent's render: handlers that run in a row read it.
  const latest = React.useRef(value)
  latest.current = value
  const mentionsRef = React.useRef(mentions)
  mentionsRef.current = mentions
  const tokens = React.useMemo(() => tokensOf(value, trigger ?? '@'), [value, trigger])

  const [query, setQueryState] = React.useState<Query | null>(null)
  const queryRef = React.useRef<Query | null>(null)
  const setQuery = (q: Query | null) => {
    const prev = queryRef.current
    if (prev === q || (prev && q && prev.kind === q.kind && prev.start === q.start && prev.end === q.end && prev.text === q.text)) return
    queryRef.current = q
    setQueryState(q)
  }
  // Escape closes the menu until the caret leaves this trigger.
  const [dismissed, setDismissed] = React.useState<string | null>(null)
  const [found, setFound] = React.useState<{ key: string; items: PromptMention[] } | null>(null)
  const [highlight, setHighlight] = React.useState({ key: '', index: 0, viaKeys: false })
  const [message, setMessage] = React.useState('')

  // An input method is composing. The menu was open when it started (its text then continues the
  // query); `composed` holds that answer from composition's end to the next key, since some
  // browsers send the composed text's input event after compositionend.
  const composing = React.useRef(false)
  const resume = React.useRef(false)
  const composed = React.useRef<null | { resume: boolean }>(null)
  const lastCaret = React.useRef(0)
  const pendingCaret = React.useRef<number | null>(null)
  const mirrorRef = React.useRef<HTMLDivElement>(null)

  const triggerKey = query ? `${query.kind}:${query.start}` : null
  const queryKey = query ? `${triggerKey}:${query.text}` : ''

  // Mentions: ask the app. A slow answer for an older query is dropped; until the first answer,
  // the menu stays shut, and after it the last answer stays up while the next one comes.
  React.useEffect(() => {
    const q = queryRef.current
    const config = mentionsRef.current
    if (!q || q.kind !== 'mention' || !config) return
    let live = true
    const key = queryKey
    const answer = config.search(q.text)
    if (Array.isArray(answer)) setFound({ key, items: answer })
    else
      answer.then(
        (items) => live && setFound({ key, items }),
        () => live && setFound({ key, items: [] }),
      )
    return () => {
      live = false
    }
  }, [queryKey])

  let items: Item[] | null = null
  if (query?.kind === 'command' && commands) {
    const q = query.text.toLowerCase()
    items = commands
      .filter((c) => c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q))
      .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
      .map((command) => ({ kind: 'command', command }))
  } else if (query?.kind === 'mention' && found?.key.startsWith(`${triggerKey}:`)) {
    items = found.items.map((mention) => ({ kind: 'mention', mention }))
  }
  const open = !!query && !disabled && dismissed !== triggerKey && items != null && (items.length > 0 || !space.test(query.text))
  const index = highlight.key === queryKey && items ? Math.min(highlight.index, Math.max(items.length - 1, 0)) : 0
  const viaKeys = highlight.key === queryKey && highlight.viaKeys
  const listed = open && items != null && items.length > 0

  // Say how many suggestions there are, or that there are none.
  React.useEffect(() => {
    if (!open || !query || !items) return
    setMessage(items.length ? labels.suggestionsCount(items.length) : labels.noResultsFor(query.trigger + query.text))
  }, [open, queryKey, items?.length, labels])

  // Put the caret after an inserted token, once the textarea shows it; keep the fills scrolled with the text.
  React.useLayoutEffect(() => {
    const el = textareaRef.current
    const mirror = mirrorRef.current
    if (el && pendingCaret.current != null && el.value === latest.current.text) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current)
      lastCaret.current = pendingCaret.current
      pendingCaret.current = null
    }
    if (!el || !mirror) return
    const style = getComputedStyle(el)
    for (const prop of MIRRORED) mirror.style[prop] = style[prop]
    mirror.style.borderStyle = 'solid'
    mirror.style.borderColor = 'transparent'
    // The mirror reaches BLEED past the textarea on both sides, so a token's fill at the line's
    // edge isn't clipped; its padding grows by as much, so the text stays put. A scrollbar
    // narrows the textarea's text; narrow the mirror's by as much.
    const bar = Math.max(0, el.offsetWidth - el.clientWidth - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth))
    const end = style.direction === 'rtl' ? 'paddingLeft' : 'paddingRight'
    mirror.style.left = mirror.style.right = `${-BLEED}px`
    mirror.style.paddingLeft = `${parseFloat(style.paddingLeft) + BLEED + (end === 'paddingLeft' ? bar : 0)}px`
    mirror.style.paddingRight = `${parseFloat(style.paddingRight) + BLEED + (end === 'paddingRight' ? bar : 0)}px`
    mirror.scrollTop = el.scrollTop
  })

  const commit = (next: PromptValue, caret?: number) => {
    latest.current = next
    if (caret != null) pendingCaret.current = caret
    onValueChange(next)
  }

  const evaluate = (v: PromptValue, caret: number | null) => {
    if (!on || disabled || caret == null) return setQuery(null)
    const q = findQuery(v, caret, trigger, commandsOn, tokensOf(v, trigger ?? '@'))
    if (!q || `${q.kind}:${q.start}` !== dismissed) setDismissed(null)
    setQuery(q)
  }

  const pick = (item: Item) => {
    const q = queryRef.current
    if (!q) return
    const v = latest.current
    const tokenText = item.kind === 'mention' ? q.trigger + item.mention.label : `/${item.command.name}`
    const after = v.text.slice(q.end)
    const pad = after.length > 0 && space.test(after[0]!) ? '' : ' '
    const text = v.text.slice(0, q.start) + tokenText + pad + after
    const by = text.length - v.text.length
    let next = remap(v, text, (t) => (t.end <= q.start ? t : t.start >= q.end ? shift(t, by) : null), trigger ?? '@')
    const span = { start: q.start, end: q.start + tokenText.length }
    next =
      item.kind === 'mention'
        ? { ...next, mentions: [...next.mentions, { ...item.mention, ...span }] }
        : { ...next, command: { name: item.command.name, ...span, args: '' } }
    commit(settle(next, trigger ?? '@'), span.end + 1)
    setMessage(labels.tokenAdded(tokenText))
    setQuery(null)
  }

  /** Removes [start, end) and says which tokens went with it. */
  const remove = (start: number, end: number) => {
    const v = latest.current
    const gone = tokensOf(v, trigger ?? '@').filter((t) => t.start < end && t.end > start)
    commit(cut(v, start, end, trigger ?? '@'), start)
    if (gone.length) setMessage(gone.map((t) => labels.tokenRemoved(t.text)).join(', '))
  }

  /** Widens a selection that cuts into a token to the whole token, before an edit replaces it. */
  const widen = (el: HTMLTextAreaElement) => {
    let a = el.selectionStart
    let b = el.selectionEnd
    if (a === b) return
    for (const t of tokensOf(latest.current, trigger ?? '@')) {
      if (t.start < b && t.end > a) {
        a = Math.min(a, t.start)
        b = Math.max(b, t.end)
      }
    }
    if (a !== el.selectionStart || b !== el.selectionEnd) el.setSelectionRange(a, b)
  }

  const textareaProps: PromptMentionsHandle['textareaProps'] = {
    onChange: (e) => {
      const el = e.currentTarget
      const text = el.value
      const caret = el.selectionStart ?? text.length
      const during = composing.current || (e.nativeEvent as InputEvent).isComposing
      const after = composed.current
      const v = latest.current
      let next = edit(v, text, caret, trigger ?? '@')
      // A space typed right after "/name" makes the command a token.
      if (on && commandsOn && !during && !after && !next.command && text.length === v.text.length + 1 && caret > 1 && space.test(text[caret - 1]!)) {
        const typed = /(?:^|\s)\/(\S+)$/.exec(text.slice(0, caret - 1))
        const command = typed && commands!.find((c) => c.name === typed[1])
        const start = caret - 2 - (typed?.[1]?.length ?? 0)
        if (command && !tokensOf(next, trigger ?? '@').some((t) => t.start < caret && t.end > start)) {
          next = settle({ ...next, command: { name: command.name, start, end: caret - 1, args: '' } }, trigger ?? '@')
          setMessage(labels.tokenAdded(`/${command.name}`))
        }
      }
      commit(next)
      lastCaret.current = caret
      // Composed text never opens the menu; it only carries on a query that was open.
      if (during || (after && !after.resume)) setQuery(null)
      else evaluate(next, caret)
    },
    onKeyDown: (e) => {
      if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229) return
      composed.current = null
      const el = e.currentTarget
      if (open && items) {
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) {
          e.preventDefault()
          const step = e.key === 'ArrowDown' ? 1 : -1
          setHighlight({ key: queryKey, index: (index + step + items.length) % items.length, viaKeys: true })
          return
        }
        const plain = !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey
        if ((e.key === 'Enter' || e.key === 'Tab') && plain && items[index]) {
          e.preventDefault()
          pick(items[index])
          return
        }
      }
      if (!on) return
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const a = el.selectionStart
        const b = el.selectionEnd
        const all = tokensOf(latest.current, trigger ?? '@')
        if (a === b) {
          // ⌘⌫ deletes to the line's start, which takes the whole token anyway.
          const t = e.metaKey ? undefined : e.key === 'Backspace' ? all.find((t) => t.end === a) : all.find((t) => t.start === a)
          if (t) {
            e.preventDefault()
            remove(t.start, t.end)
          }
        } else {
          const hit = all.filter((t) => t.start < b && t.end > a)
          if (hit.length) {
            e.preventDefault()
            remove(Math.min(a, ...hit.map((t) => t.start)), Math.max(b, ...hit.map((t) => t.end)))
          }
        }
        return
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) widen(el)
    },
    onSelect: (e) => {
      if (composing.current || (composed.current && !composed.current.resume) || !on) return
      const el = e.currentTarget
      let a = el.selectionStart
      if (a !== el.selectionEnd) return setQuery(null)
      // The caret never rests inside a token: it steps on across it, or to the nearer edge after a click.
      const t = tokensOf(latest.current, trigger ?? '@').find((t) => a > t.start && a < t.end)
      if (t) {
        const prev = lastCaret.current
        a = prev <= t.start ? t.end : prev >= t.end ? t.start : a - t.start < t.end - a ? t.start : t.end
        el.setSelectionRange(a, a)
      }
      lastCaret.current = a
      evaluate(latest.current, a)
    },
    onBlur: () => {
      composed.current = null
      setQuery(null)
    },
    onScroll: (e) => {
      if (mirrorRef.current) mirrorRef.current.scrollTop = e.currentTarget.scrollTop
    },
    onPaste: (e) => widen(e.currentTarget),
    onCut: (e) => widen(e.currentTarget),
    onCompositionStart: () => {
      composing.current = true
      resume.current = open
      setQuery(null)
    },
    onCompositionEnd: (e) => {
      composing.current = false
      composed.current = { resume: resume.current }
      if (resume.current) {
        const el = e.currentTarget
        evaluate(latest.current.text === el.value ? latest.current : edit(latest.current, el.value, el.selectionStart, trigger ?? '@'), el.selectionStart)
      }
      resume.current = false
    },
    'aria-autocomplete': on ? 'list' : undefined,
    'aria-controls': listed ? listId : undefined,
    'aria-activedescendant': listed ? `${listId}-${index}` : undefined,
  }

  if (!on) return { textareaProps, overlay: null, menu: null, open: false }

  // The text in the textarea's type, unfilled, with each token's fill and stroke.
  let at = 0
  const parts: React.ReactNode[] = []
  for (const t of tokens) {
    parts.push(value.text.slice(at, t.start))
    parts.push(
      <span key={t.start} data-token={t.kind} className={cn(tokenClass, t.kind === 'mention' ? mentionTokenClass : commandTokenClass)}>
        {t.text}
      </span>,
    )
    at = t.end
  }
  // The zero-width space keeps a trailing newline's empty line, as the textarea has it.
  parts.push(`${value.text.slice(at)}​`)

  const overlay = (
    <div
      ref={mirrorRef}
      aria-hidden
      data-slot="prompt-tokens"
      className="pointer-events-none absolute inset-0 overflow-hidden break-words whitespace-pre-wrap [-webkit-text-fill-color:transparent] select-none"
    >
      {parts}
    </div>
  )

  const name = query?.kind === 'command' ? labels.commands : labels.mentions
  const menu = (
    <>
      <span role="status" className="sr-only">
        {message}
      </span>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          if (!next && triggerKey) setDismissed(triggerKey)
        }}
      >
        <Popover.Anchor virtualRef={anchorRef ?? textareaRef} />
        <Popover.Portal>
          <Popover.Content
            data-slot="prompt-mentions"
            side="top"
            align="start"
            sideOffset={8}
            collisionPadding={8}
            aria-label={name}
            // Focus stays in the field: the list is driven from there.
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            // Only Escape dismisses it; leaving the field closes it (onBlur) without dismissing.
            onInteractOutside={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              'z-50 flex w-(--radix-popper-anchor-width) flex-col overflow-hidden',
              menuSurfaceClass,
              'origin-(--radix-popper-transform-origin) outline-none',
              'data-[state=open]:animate-[satin-enter_var(--duration-base)_var(--ease-out)]',
            )}
          >
            <div className="flex flex-col p-1">
              <div aria-hidden className={menuGroupLabelClass}>
                {name}
              </div>
              {listed ? (
                <div id={listId} role="listbox" aria-label={name} className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                  {items!.map((item, i) => (
                    <div
                      key={item.kind === 'mention' ? `@${item.mention.id}` : `/${item.command.name}`}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === index}
                      data-highlighted={i === index ? '' : undefined}
                      data-keyboard={i === index && viaKeys ? '' : undefined}
                      onPointerMove={() => {
                        if (i !== index || viaKeys) setHighlight({ key: queryKey, index: i, viaKeys: false })
                      }}
                      onClick={() => pick(item)}
                      className={menuItemClass}
                    >
                      {item.kind === 'mention' ? (
                        <MenuItemContent
                          label={item.mention.label}
                          description={item.mention.description}
                          icon={item.mention.icon ?? <Avatar initials={initialsOf(item.mention.label)} size={20} aria-hidden />}
                          iconSize={20}
                          layout="inline"
                        />
                      ) : (
                        <MenuItemContent
                          label={`/${item.command.name}`}
                          description={item.command.description}
                          icon={item.command.icon}
                          layout="inline"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-1.5 text-sm text-text-muted">{query ? labels.noResultsFor(query.trigger + query.text) : null}</p>
              )}
            </div>
            <div aria-hidden className="flex items-center gap-3 border-t border-border-default px-3 py-1.5">
              <KbdHint keys={[<KbdArrowUp key="up" />, <KbdArrowDown key="down" />]} label={labels.navigate} />
              <KbdHint keys={[<KbdReturn key="return" />]} label={labels.selectItem} />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  )

  return { textareaProps, overlay, menu, open }
}
