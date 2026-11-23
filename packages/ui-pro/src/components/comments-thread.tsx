'use client'

import * as React from 'react'
import { Bold, ChatLines, Code, EditPencil, Italic, Link as LinkIcon, List as ListIcon, MoreHoriz, Refresh, Reply, Trash, WarningCircle, Xmark } from 'iconoir-react'
import { TetrisStill } from '@uisatin/ui/agent-loading'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Badge } from '@uisatin/ui/badge'
import { Button } from '@uisatin/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@uisatin/ui/dropdown'
import { EmptyState } from '@uisatin/ui/empty-state'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { Link } from '@uisatin/ui/link'
import { List } from '@uisatin/ui/list'
import { Mention, usePromptMentions, type PromptMention, type PromptMentions, type PromptValue } from '@uisatin/ui/prompt-mentions'
import { RelativeTime, dateTimeFormat } from '@uisatin/ui/relative-time'
import { Spinner } from '@uisatin/ui/spinner'
import { Textarea } from '@uisatin/ui/textarea'
import { toast } from '@uisatin/ui/toast'
import { Toolbar, ToolbarButton } from '@uisatin/ui/toolbar'

/**
 * CommentsThread: a discussion on a record (a candidate, a deal, a campaign, an order), with
 * replies and @mentions. Not a support inbox and not a change history.
 *
 * - Root comments, each with its replies one level deep, in a `List` (`ul`) of threads. A reply
 *   whose `parentId` points at a reply joins that reply's root; a reply whose parent is missing
 *   becomes a root, unless that parent is a root deleted here. Only roots have Reply: it opens a reply composer under the replies, with focus
 *   in it; Escape closes it and puts focus back on Reply.
 * - Each comment is an `<article>` named "Comment by Marta Nowak, {full date}": avatar (initials
 *   by default), name, the time relative today (Free's `RelativeTime`, the full date for screen
 *   readers), "(edited)", the body and its `mentions` drawn as `Mention`, each with a tooltip of
 *   the person's avatar and full name on hover and focus.
 * - Bodies are markdown-lite: `**bold**` (or `__bold__`), `_italic_` (or `*italic*`),
 *   `~~struck~~`, `` `code` ``, `[text](https://…)` (http, https and mailto only; any other link
 *   shows its text alone), and lines starting `- ` or `* ` as a bulleted list. Other line breaks
 *   are kept. No HTML is ever rendered from the body.
 * - The composer is one field: the text on top and, inside the same border at its bottom, a
 *   formatting toolbar (Bold, Italic, Code, Bulleted list, Link; ⌘/Ctrl+B, I, E, K in the field)
 *   that writes those marks into the text through the field's own undo, with Send at the end.
 * - An author with `kind: 'agent'` shows the agent mark at rest in a circle (Activity timeline's)
 *   and an "Agent" Badge after the name.
 * - Your own comments say "(me)" after your name and show Edit next to Reply (`onEdit`). The ⋯
 *   menu ("Actions for comment by Marta Nowak") holds Delete, on yours or on anyone's with
 *   `moderator` (`onDelete`).
 * - Replies hang off a thread line under the root's avatar, fading out at both ends.
 * - `title` puts a heading over it with the count in a Badge ("Comments 5"); `variant="card"`
 *   sets it on a card.
 * - Send is optimistic: while `onReply`'s promise runs, a row from `currentUser` shows dimmed with
 *   a Spinner. It goes when a new comment by `currentUser` with the same parent and body arrives
 *   in `comments`, which takes the row's place without fading in again. A row whose promise
 *   resolves first stays, undimmed, until the comment ids change; if a comment of yours under the
 *   same parent already showed by then (its body rewritten by the server), the row goes. A rejected promise leaves
 *   the row with "Not sent", Retry (focused) and Discard. A handler that returns nothing shows no
 *   sending row: the comment appears when `comments` has it.
 * - Edit happens in place (Save, Cancel; Ctrl/⌘+Enter saves, Escape cancels). The new text shows
 *   until the comment's `body` changes; a rejected `onEdit` puts the old text back and reopens
 *   the editor with an error (or, when another comment's editor is open by then, keeps that one
 *   and says it in an error toast).
 * - Delete never asks: the comment (a root with its replies) goes at once, focus moves to the
 *   next comment or the composer, and a toast offers Undo with a countdown. `onDelete(id)` runs
 *   when the toast closes without Undo, or at once if the thread unmounts or the page is left
 *   first. Undo brings the comment back with focus on it; a rejected `onDelete` brings it back
 *   with an error toast. Toasts need the app's `<Toaster />`.
 * - New comments fade in, 4px up, over --duration-base; reduced motion turns it off.
 * - `disabled` reads only: no composer, menu or Reply.
 *
 * Parts, for a thread of your own: `Comment`, `CommentComposer`, `CommentActions`. Other props
 * on CommentsThread, `ref` included, go to the root `div`.
 */

/** The words the Comments thread says on its own. They join SatinLabels, so the app translates them there. Send, Cancel and the spinner's "Sending" are Free's `send`, `cancel` and `sending`. */
export const commentsThreadLabels = {
  /** The list of threads, for screen readers. */
  comments: 'Comments',
  /** The empty state's title. */
  commentsEmptyTitle: 'No comments yet',
  /** The empty state's line under the title. */
  commentsEmptyText: 'Start the discussion. Type @ to mention someone.',
  /** The composer's placeholder. */
  commentsPlaceholder: 'Write a comment…',
  /** The composer field's name. */
  commentsField: 'Comment',
  /** The reply composer's placeholder. */
  commentsReplyPlaceholder: 'Write a reply…',
  /** The Reply button's visible word. */
  commentsReply: 'Reply',
  /** The Reply button's and the reply field's name: "Reply to Marta Nowak". */
  commentsReplyTo: (name: string) => `Reply to ${name}`,
  /** The edit field's name. */
  commentsEditField: 'Edit comment',
  commentsEdit: 'Edit',
  commentsSave: 'Save',
  commentsDelete: 'Delete',
  commentsRetry: 'Retry',
  commentsDiscard: 'Discard',
  /** On a comment whose send failed; Retry is described by it. */
  commentsNotSent: 'Not sent',
  /** After the time of an edited comment. */
  commentsEdited: '(edited)',
  /** After your own name on your comments. */
  commentsMe: '(me)',
  /** The Badge after an agent's name. */
  commentsAgent: 'Agent',
  /** The composer's formatting toolbar. */
  commentsFormatting: 'Formatting',
  commentsBold: 'Bold',
  commentsItalic: 'Italic',
  commentsCode: 'Code',
  commentsList: 'Bulleted list',
  commentsLink: 'Link',
  /** The count next to `title`, for screen readers: "5 comments". */
  commentsCount: (count: number) => `${count} ${count === 1 ? 'comment' : 'comments'}`,
  /** The ⋯ button's name: "Actions for comment by Marta Nowak". */
  commentActionsFor: (name: string) => `Actions for comment by ${name}`,
  /** A comment's name for screen readers: "Comment by Marta Nowak, Monday, November 16, 2026 at 9:40 AM". */
  commentBy: (name: string, date: string) => `Comment by ${name}, ${date}`,
  /** The toast after Delete. */
  commentsDeleted: 'Comment deleted',
  /** The toast's action. */
  commentsUndo: 'Undo',
  /** The error toast when `onDelete` fails. */
  commentsDeleteFailed: 'Couldn’t delete the comment',
  /** Under the edit field when `onEdit` fails. */
  commentsSaveFailed: 'Couldn’t save the comment. Try again.',
}

type CommentsThreadLabels = typeof commentsThreadLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends CommentsThreadLabels {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...commentsThreadLabels, ...labels }), [labels])
}

/* ---------- types ---------- */

export interface CommentAuthor {
  /** Tells people apart: your own comments are those whose author id is `currentUser.id`. */
  id: string
  name: string
  /** 24px in place of the initials: an Avatar in the person's tone, a photo. 20px in the mentions menu. */
  avatar?: React.ReactNode
  /** `agent`: the agent mark in place of the initials, and an "Agent" Badge after the name. Defaults to `person`. */
  kind?: 'person' | 'agent'
}

/** A mention in a comment's body: `body.slice(start, end)` is "@" and the label. The fields of Free's `PromptMentionToken`. */
export interface CommentMention {
  id: string
  label: string
  start: number
  end: number
  /**
   * 20px, in the mention's tooltip. Left out, the thread uses the avatar of an author with this id
   * in `comments`, else the initials in the person's tone. The composer fills it from a
   * `mentions.search` result that has an `avatar`.
   */
  avatar?: React.ReactNode
  /** `agent`: the agent mark in the tooltip. Filled like `avatar`. */
  kind?: 'person' | 'agent'
}

export interface CommentItem {
  id: string
  author: CommentAuthor
  /** Markdown-lite: bold, italic, strikethrough, code, links and bulleted lists; line breaks are kept. */
  body: string
  /** When: a Date or an ISO string. */
  at: Date | string
  /** Shows "(edited)" after the time. */
  edited?: boolean
  /** The root comment it replies to. Replies are one level deep: a reply to a reply joins its root. */
  parentId?: string | null
  /** Drawn as `Mention` where the body reads "@" and the label. */
  mentions?: CommentMention[]
}

/** Who can be @mentioned. */
export interface CommentsMentions {
  /** People matching the text typed after "@" ("" right after it). It can return a promise. */
  search: (query: string) => CommentAuthor[] | Promise<CommentAuthor[]>
}

/* ---------- helpers ---------- */

type MaybePromise = void | Promise<void> | PromiseLike<void>

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  !!value && typeof (value as PromiseLike<unknown>).then === 'function'

/** Calls a handler; a throw counts as a rejected promise. */
function attempt(run: () => MaybePromise): MaybePromise {
  try {
    return run()
  } catch (error) {
    return Promise.reject(error)
  }
}

const TONES: AvatarTone[] = ['sky', 'green', 'amber', 'fuchsia', 'plum', 'brand']

/** A tone picked from the id, so a person keeps one colour across threads. */
function toneOf(id: string): AvatarTone {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return TONES[Math.abs(h) % TONES.length]!
}

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase()
}

/** An agent's avatar: the Tetris mark at rest in a circle, as the Activity timeline draws it. */
function AgentAvatar({ size }: { size: 20 | 24 }) {
  return (
    <span
      aria-hidden
      data-slot="comment-agent-avatar"
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-component-file-icon-bg [box-shadow:inset_0_0_0_var(--border-width-default)_var(--border-strong)]',
        size === 24 ? 'size-6' : 'size-5',
      )}
    >
      <TetrisStill />
    </span>
  )
}

function AuthorAvatar({ author, size }: { author: Pick<CommentAuthor, 'id' | 'name' | 'avatar' | 'kind'>; size: 20 | 24 }) {
  if (author.avatar) return <>{author.avatar}</>
  if (author.kind === 'agent') return <AgentAvatar size={size} />
  return (
    <span aria-hidden className="flex">
      <Avatar initials={initialsOf(author.name)} tone={toneOf(author.id)} size={size} />
    </span>
  )
}

/** The mentions that still read as themselves in the text, in order, without overlaps. */
function validMentions(text: string, mentions: CommentMention[] | undefined): CommentMention[] {
  if (!mentions?.length) return []
  const out: CommentMention[] = []
  let at = 0
  for (const m of [...mentions].sort((a, b) => a.start - b.start)) {
    if (m.start < at || text.slice(m.start, m.end) !== `@${m.label}`) continue
    out.push({ id: m.id, label: m.label, start: m.start, end: m.end, ...(m.avatar != null && { avatar: m.avatar }), ...(m.kind && { kind: m.kind }) })
    at = m.end
  }
  return out
}

/* ---------- the body: markdown-lite ---------- */

const SAFE_URL = /^(?:https?:\/\/|mailto:)/i

// The inline marks, in the order a tie is won. Code first: nothing inside it is a mark.
const INLINE: { kind: 'code' | 'link' | 'bold' | 'strike' | 'italic'; re: RegExp }[] = [
  { kind: 'code', re: /`([^`\n]+)`/ },
  { kind: 'link', re: /\[([^\]\n]+)\]\(([^()\s]+)\)/ },
  { kind: 'bold', re: /\*\*(?![\s*])([^\n]*?[^\s*])\*\*|__(?![\s_])([^\n]*?[^\s_])__/ },
  { kind: 'strike', re: /~~(?![\s~])([^\n]*?[^\s~])~~/ },
  // Not inside a word (snake_case stays text). The character before is captured, not looked
  // behind at, so Safari before 16.4 still parses the module.
  { kind: 'italic', re: /(^|[^\w*])\*(?![\s*])([^\n]*?[^\s*])\*(?![\w*])|(^|[^\w_])_(?![\s_])([^\n]*?[^\s_])_(?![\w_])/ },
]

/** A 20px avatar for a mention's tooltip. */
function mentionAvatar(m: CommentMention) {
  return m.avatar ?? <AuthorAvatar author={{ id: m.id, name: m.label, kind: m.kind }} size={20} />
}

/**
 * The body as React: markdown-lite, with its mentions as `Mention`. Each valid mention is swapped
 * for one private-use character before parsing, so a mark can hold a mention but never split one,
 * and swapped back as a `Mention` at the end. Only text and elements are made; never HTML.
 */
function renderBody(body: string, mentions: CommentMention[] | undefined): React.ReactNode {
  const valid = validMentions(body, mentions)
  // The first private-use character from which none the body already has stand in for mentions.
  let base = 0xe000
  while (valid.some((_, i) => body.includes(String.fromCharCode(base + i)))) base += valid.length
  let text = ''
  let at = 0
  valid.forEach((m, i) => {
    text += body.slice(at, m.start) + String.fromCharCode(base + i)
    at = m.end
  })
  text += body.slice(at)

  let key = 0
  const restore = (s: string, asText = false): React.ReactNode[] => {
    const out: React.ReactNode[] = []
    let run = ''
    for (const ch of s) {
      const i = ch.charCodeAt(0) - base
      const m = ch.length === 1 && i >= 0 && i < valid.length ? valid[i] : undefined
      if (!m) {
        run += ch
        continue
      }
      if (asText) {
        run += `@${m.label}`
        continue
      }
      if (run) out.push(run)
      run = ''
      out.push(<Mention key={key++} id={m.id} label={m.label} name={m.label} avatar={mentionAvatar(m)} />)
    }
    if (run) out.push(run)
    return out
  }
  // `plain`: inside a link, where a mention reads as its text, never a focusable span inside the `<a>`.
  const inline = (s: string, plain = false): React.ReactNode[] => {
    const out: React.ReactNode[] = []
    let rest = s
    while (rest) {
      let best: { kind: (typeof INLINE)[number]['kind']; match: RegExpExecArray; index: number; lead: number } | null = null
      for (const { kind, re } of INLINE) {
        const match = re.exec(rest)
        if (!match) continue
        // Italic captures the character before its mark: the mark starts after it.
        const lead = kind === 'italic' ? (match[1] ?? match[3] ?? '').length : 0
        const index = match.index + lead
        if (!best || index < best.index) best = { kind, match, index, lead }
      }
      if (!best) break
      const { kind, match, index } = best
      if (index > 0) out.push(...restore(rest.slice(0, index), plain))
      const inner = (kind === 'italic' ? (match[2] ?? match[4]) : (match[1] ?? match[2])) ?? ''
      if (kind === 'code')
        out.push(
          <code key={key++} data-slot="comment-code" className="rounded-xs bg-bg-muted px-1 py-px font-mono text-[0.9em]">
            {restore(inner, true)}
          </code>,
        )
      else if (kind === 'link') {
        // The address as written: a mention in it is its text again, and only then is it checked.
        const url = restore(match[2]!, true).join('')
        out.push(
          SAFE_URL.test(url) ? (
            <Link key={key++} href={url}>
              {inline(inner, true)}
            </Link>
          ) : (
            <React.Fragment key={key++}>{inline(inner, plain)}</React.Fragment>
          ),
        )
      } else if (kind === 'bold') out.push(<strong key={key++} className="font-semibold">{inline(inner, plain)}</strong>)
      else if (kind === 'strike') out.push(<s key={key++}>{inline(inner, plain)}</s>)
      else out.push(<em key={key++} className="italic">{inline(inner, plain)}</em>)
      rest = rest.slice(match.index + match[0].length)
    }
    if (rest) out.push(...restore(rest, plain))
    return out
  }

  // Blocks: runs of "- " or "* " lines are a list; everything else keeps its line breaks.
  const LIST = /^[-*] /
  const blocks: { list: boolean; lines: string[] }[] = []
  for (const line of text.split('\n')) {
    const list = LIST.test(line)
    const last = blocks[blocks.length - 1]
    if (last && last.list === list) last.lines.push(list ? line.slice(2) : line)
    else blocks.push({ list, lines: [list ? line.slice(2) : line] })
  }
  // A blank line next to a list is the list's own spacing.
  blocks.forEach((b, i) => {
    if (b.list) return
    if (blocks[i - 1]?.list) while (b.lines.length && !b.lines[0]!.trim()) b.lines.shift()
    if (blocks[i + 1]?.list) while (b.lines.length && !b.lines[b.lines.length - 1]!.trim()) b.lines.pop()
  })
  const shown = blocks.filter((b) => b.lines.length)
  if (shown.length === 1 && !shown[0]!.list) return inline(shown[0]!.lines.join('\n'))
  return shown.map((b) =>
    b.list ? (
      <ul key={key++} className="m-0 list-disc ps-5 marker:text-text-muted">
        {b.lines.map((line) => (
          <li key={key++}>{inline(line)}</li>
        ))}
      </ul>
    ) : (
      <p key={key++} className="m-0">
        {inline(b.lines.join('\n'))}
      </p>
    ),
  )
}

/** The text trimmed, with the mentions moved by what the start lost. */
function trimValue(value: PromptValue): { body: string; mentions: CommentMention[] } {
  const lead = value.text.length - value.text.trimStart().length
  const body = value.text.trim()
  const mentions = (value.mentions as (PromptValue['mentions'][number] & Pick<CommentMention, 'avatar' | 'kind'>)[])
    .map((m) => ({ id: m.id, label: m.label, start: m.start - lead, end: m.end - lead, avatar: m.avatar, kind: m.kind }))
    .filter((m) => m.start >= 0 && m.end <= body.length)
  return { body, mentions: validMentions(body, mentions) }
}

const EMPTY: PromptValue = { text: '', mentions: [] }

const toPrompt = (value: PromptValue | string | undefined): PromptValue =>
  value == null ? EMPTY : typeof value === 'string' ? { text: value, mentions: [] } : value

/* ---------- Comment ---------- */

export interface CommentProps extends Omit<React.ComponentProps<'article'>, 'children'> {
  author: CommentAuthor
  /** When: a Date or an ISO string. Shown relative today; the full date goes into the article's name. */
  at: Date | string
  /** Markdown-lite (bold, italic, strikethrough, code, links, bulleted lists); line breaks are kept. */
  body: string
  /** Drawn as `Mention`, with a tooltip of the avatar and full name, where the body reads "@" and the label. */
  mentions?: CommentMention[]
  /** Shows "(edited)" after the time. */
  edited?: boolean
  /** The current user's comment: "(me)" follows the name. */
  own?: boolean
  /** `sending`: the body dims and a Spinner says "Sending". `failed`: put "Not sent" and Retry in `footer`. */
  state?: 'sending' | 'failed'
  /** At the end of the author's line: a `CommentActions`. */
  actions?: React.ReactNode
  /** Under the body: Reply, or Retry and Discard. */
  footer?: React.ReactNode
  /** In place of the body: an edit `CommentComposer`. */
  children?: React.ReactNode
  /** Fades in 4px up as it mounts, for a comment that arrives after the thread showed. It plays once: a later Show comments doesn't replay it. */
  animateIn?: boolean
}

/**
 * One comment: an `<article tabIndex={-1}>` named "Comment by {name}, {full date}", so focus can
 * be moved to it. The avatar (initials in a tone picked from the author's id, the agent mark for
 * an agent), the name in medium 13px, an "Agent" Badge for an agent, `RelativeTime`, "(edited)"
 * in text/muted, then the body in 14/21 text/default: markdown-lite, with its line breaks. With
 * `own`, "(me)" in text/muted follows the name. Other props, `ref` included, go to the `article`.
 */
export function Comment({
  author,
  at,
  body,
  mentions,
  edited = false,
  own = false,
  state,
  actions,
  footer,
  children,
  animateIn = false,
  className,
  onAnimationEnd,
  ...props
}: CommentProps) {
  const labels = useLabels()
  // The entry plays once. Kept, it would replay whenever the thread's body shows again (display: none and back).
  const [entered, setEntered] = React.useState(false)
  const time = (at instanceof Date ? at : new Date(at)).getTime()
  const locale = labels.dateLocale
  const full = React.useMemo(() => dateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(time), [locale, time])
  return (
    <article
      data-slot="comment"
      data-state={state}
      data-enter={(animateIn && !entered) || undefined}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setEntered(true)
        onAnimationEnd?.(event)
      }}
      tabIndex={-1}
      aria-label={labels.commentBy(author.name, full)}
      aria-busy={state === 'sending' || undefined}
      className={cn(
        'flex gap-3 rounded-lg outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus-ring focus-visible:outline-solid',
        className,
      )}
      {...props}
    >
      <span className="flex shrink-0 pt-0.5">
        <AuthorAvatar author={author} size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <div data-slot="comment-header" className="flex min-h-6 items-center gap-2">
          <span className="min-w-0 truncate text-sm leading-5 font-medium text-text-default">
            {author.name}
            {own && <span className="font-normal text-text-muted"> {labels.commentsMe}</span>}
          </span>
          {author.kind === 'agent' && (
            <Badge size="sm" data-part="comment-agent" className="shrink-0">
              {labels.commentsAgent}
            </Badge>
          )}
          <RelativeTime at={time} />
          {edited && <span className="shrink-0 text-sm leading-5 text-text-muted">{labels.commentsEdited}</span>}
          {state === 'sending' && <Spinner size="xs" label={labels.sending} className="text-text-muted" />}
          {actions && <span className="ms-auto flex shrink-0">{actions}</span>}
        </div>
        {children ?? (
          <div data-slot="comment-body" className="text-body break-words whitespace-pre-wrap text-text-default">
            {renderBody(body, mentions)}
          </div>
        )}
        {footer && (
          <div data-slot="comment-footer" className="mt-1.5 flex flex-wrap items-center gap-1">
            {footer}
          </div>
        )}
      </div>
    </article>
  )
}

/* ---------- CommentActions ---------- */

export interface CommentActionsProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  /** The comment's author, for the button's name: "Actions for comment by Marta Nowak". */
  authorName: string
  /** Adds Edit. It moves focus itself (into the editor); the menu doesn't put it back on the button. */
  onEdit?: () => void
  /** Adds Delete. It moves focus itself; the menu doesn't put it back on the button. */
  onDelete?: () => void
}

/**
 * The ⋯ menu of a comment: a tertiary icon-only Button that opens a DropdownMenu with Edit and
 * Delete, as far as they're given. Nothing renders without either. Other props, `ref` included,
 * go to the button.
 */
export function CommentActions({ authorName, onEdit, onDelete, className, ...props }: CommentActionsProps) {
  const labels = useLabels()
  // An item was chosen: its handler moves focus, so the menu mustn't take it back to the trigger.
  const chosen = React.useRef(false)
  if (!onEdit && !onDelete) return null
  const choose = (run: () => void) => () => {
    chosen.current = true
    run()
  }
  return (
    <DropdownMenu
      align="end"
      className="w-auto min-w-40"
      onCloseAutoFocus={(event) => {
        if (!chosen.current) return
        chosen.current = false
        event.preventDefault()
      }}
      trigger={
        <Button
          variant="tertiary"
          size="xs"
          iconOnly
          data-part="comment-actions"
          aria-label={labels.commentActionsFor(authorName)}
          className={className}
          {...props}
        >
          <MoreHoriz aria-hidden />
        </Button>
      }
    >
      {onEdit && <DropdownMenuItem label={labels.commentsEdit} icon={<EditPencil />} onSelect={choose(onEdit)} />}
      {onDelete && <DropdownMenuItem label={labels.commentsDelete} icon={<Trash />} onSelect={choose(onDelete)} />}
    </DropdownMenu>
  )
}

/* ---------- CommentComposer ---------- */

/** ⌘ on Apple platforms, Ctrl elsewhere, read after hydration so the server's markup never disagrees. */
const isApple = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
const noop = () => () => {}
const useIsApple = () => React.useSyncExternalStore(noop, isApple, () => false)

type Format = 'bold' | 'italic' | 'code' | 'list' | 'link'
const FORMAT_KEYS: Record<string, Format> = { b: 'bold', i: 'italic', e: 'code', k: 'link' }
/** An edit of the text: `remove` characters at `at` give way to `insert`. */
type TextEdit = { at: number; remove: number; insert: string }
const LINK_URL = 'url'

/** The value through edits, the mentions after each moved by it. Applied from the end, so earlier offsets hold. */
function applyEdits(v: PromptValue, edits: TextEdit[]): PromptValue {
  let { text, mentions } = v
  for (const e of [...edits].sort((a, b) => b.at - a.at)) {
    text = text.slice(0, e.at) + e.insert + text.slice(e.at + e.remove)
    const by = e.insert.length - e.remove
    mentions = mentions.map((m) => (m.start >= e.at + e.remove ? { ...m, start: m.start + by, end: m.end + by } : m))
  }
  return { ...v, text, mentions }
}

/** Where a position lands after edits listed from the start of the text. */
function mapThrough(pos: number, edits: TextEdit[]) {
  let by = 0
  for (const e of edits) {
    if (e.at > pos) break
    if (e.at + e.remove <= pos) by += e.insert.length - e.remove
    else return e.at + by
  }
  return pos + by
}

/**
 * The edits a format makes to the selection [a, b], and the selection after. Marks wrap each line
 * of the selection, trimmed (or go round the caret), or come off where the parser reads them as a
 * pair; a list puts "- " before each line it touches, or takes it
 * off when they all have it; a link wraps the text as `[text](url)` and selects `url`.
 */
function formatEdits(text: string, a: number, b: number, format: Format): { edits: TextEdit[]; select: [number, number] } {
  if (format === 'list') {
    const starts = [text.lastIndexOf('\n', a - 1) + 1]
    for (let i = starts[0]!; i < b; i++) if (text[i] === '\n' && i + 1 < b) starts.push(i + 1)
    const listed = starts.every((at) => /^[-*] /.test(text.slice(at, at + 2)))
    const edits = listed
      ? starts.map((at) => ({ at, remove: 2, insert: '' }))
      : starts.filter((at) => !/^[-*] /.test(text.slice(at, at + 2))).map((at) => ({ at, remove: 0, insert: '- ' }))
    return { edits, select: [mapThrough(a, edits), mapThrough(b, edits)] }
  }
  if (format === 'link') {
    const edits = [
      { at: b, remove: 0, insert: `](${LINK_URL})` },
      { at: a, remove: 0, insert: '[' },
    ]
    return { edits, select: a === b ? [a + 1, a + 1] : [b + 3, b + 3 + LINK_URL.length] }
  }
  const mark: Mark = format === 'bold' ? '**' : format === 'italic' ? '_' : '`'
  const m = mark.length
  // Each line the selection touches, trimmed: marks round whitespace or a line break don't render.
  const lines: [number, number][] = []
  for (let from = a, i = a; i <= b; i++) {
    if (i < b && text[i] !== '\n') continue
    let x = from
    let y = i
    while (x < y && /\s/.test(text[x]!)) x++
    while (y > x && /\s/.test(text[y - 1]!)) y--
    if (x < y) lines.push([x, y])
    from = i + 1
  }
  // A caret, or only whitespace: the marks go round the caret.
  if (!lines.length) lines.push([a, a])
  // Pressed again, a mark takes itself off, when every line has it; otherwise the lines without it get it.
  const offs = lines.map(([x, y]) => markOff(text, x, y, mark))
  const off = offs.every(Boolean)
  const parts: MarkPart[] = lines.map(([x, y], i) => {
    const found = offs[i]
    if (found) return off ? found : { edits: [], inner: found.inner, open: 0, by: 0 }
    return {
      edits: [
        { at: x, remove: 0, insert: mark },
        { at: y, remove: 0, insert: mark },
      ],
      inner: [x, y],
      open: m,
      by: 2 * m,
    }
  })
  // The selection after: from the first line's text to the last's, inside their marks.
  let by = 0
  const inner = parts.map((p) => {
    const at: [number, number] = [p.inner[0] + by + p.open, p.inner[1] + by + p.open]
    by += p.by
    return at
  })
  return { edits: parts.flatMap((p) => p.edits), select: [inner[0]![0], inner[inner.length - 1]![1]] }
}

type Mark = '**' | '_' | '`'
// Each mark's pattern in INLINE.
const MARK_RE = { '**': 2, _: 4, '`': 0 } as const
const MARKS = Object.keys(MARK_RE) as Mark[]
/** A format's edits on one line: its text `inner`, which moves by `open` before it and `by` in all. */
type MarkPart = { edits: TextEdit[]; inner: [number, number]; open: number; by: number }

/**
 * Whether `mark` at `s` and again at `e` is a pair the body renders: the text from one through the
 * other is a whole match of the parser's own pattern (so `**a** b **c**` never pairs its middle
 * marks), and an `_` pair isn't inside a word (`snake_case_name`).
 */
function isPair(text: string, s: number, e: number, mark: Mark) {
  const m = mark.length
  if (s < 0 || e < s + m || text.slice(s, s + m) !== mark || text.slice(e, e + m) !== mark) return false
  const word = /\w/
  if (mark === '_' && (word.test(text[s - 1] ?? '') || word.test(text[e + m] ?? ''))) return false
  // Pressed twice at a caret: the empty pair the first press left.
  if (e === s + m) return true
  const whole = text.slice(s, e + m)
  const match = INLINE[MARK_RE[mark]]!.re.exec(whole)
  return match?.index === 0 && match[0] === whole
}

/**
 * Taking `mark` off the text [a, b], when it has it: a pair round it, found through other marks
 * round it too (Bold inside `**_x_**`), or a pair at its own ends. Null when it hasn't.
 */
function markOff(text: string, a: number, b: number, mark: Mark): MarkPart | null {
  const m = mark.length
  const off = (s: number, e: number, inner: [number, number]): MarkPart => ({
    edits: [
      { at: s, remove: m, insert: '' },
      { at: e, remove: m, insert: '' },
    ],
    inner,
    open: -m,
    by: -2 * m,
  })
  for (let l = a, r = b; ; ) {
    if (isPair(text, l - m, r, mark)) return off(l - m, r, [a, b])
    const other = MARKS.find((o) => o !== mark && isPair(text, l - o.length, r, o))
    if (!other) break
    l -= other.length
    r += other.length
  }
  if (b - a >= 2 * m && isPair(text, a, b - m, mark)) return off(a, b - m, [a + m, b - m])
  return null
}

export interface CommentComposerProps extends Omit<React.ComponentProps<'div'>, 'onSubmit' | 'defaultValue'> {
  /** The draft, controlled: its text and mentions. The composer doesn't clear a controlled draft on submit. */
  value?: PromptValue
  /** The first draft, uncontrolled. It clears after each submit. */
  defaultValue?: PromptValue | string
  onValueChange?: (value: PromptValue) => void
  /** Send (or Save) and Ctrl/⌘+Enter: the text trimmed, and its mentions moved to match. Not called while it's blank. */
  onSubmit: (body: string, mentions: CommentMention[]) => void
  /** Adds Cancel, which Escape presses too. */
  onCancel?: () => void
  /** The submit button's word. Defaults to Free's `send`. */
  submitLabel?: string
  /** @mentions: "@" opens a menu of the people `search` finds (Free's Prompt bar mentions). */
  mentions?: CommentsMentions
  /** The field's name for screen readers. Defaults to "Comment". */
  label?: string
  /** Defaults to "Write a comment…". */
  placeholder?: string
  disabled?: boolean
  /** Under the field, in text/destructive, and the field's description; the field is marked invalid. */
  error?: React.ReactNode
  /** Focus the field when it mounts, with the caret at the end. */
  autoFocus?: boolean
}

/**
 * One field with everything inside it: the field skin (`.satin-field`: border, hover, the focus
 * edge while anything in it has focus, the error edge, the disabled fill) round a Satin Textarea
 * with no skin of its own and, at the bottom inside the same border, the action row: the
 * formatting toolbar (Free's Toolbar, one tab stop: Bold, Italic, Code, Bulleted list, Link) at
 * the start, Cancel (with `onCancel`) and Send at the end. The text starts at 72px and grows with
 * what's typed up to 240px, then scrolls. A click on the field's empty space puts focus in the text.
 * @mentions come from `usePromptMentions`. An `error` shows under the field, in text/destructive,
 * and describes the text.
 *
 * A format writes its markdown-lite marks round the selection through the field's own editing, so
 * undo takes it back; a selection that cuts into a mention takes the whole mention. ⌘/Ctrl+B, I, E
 * and K do the same in the field. Ctrl/⌘+Enter sends, Enter alone is a new line, Escape cancels
 * when `onCancel` is given (after the mentions menu, which takes Enter and Escape while open).
 * Send stays `aria-disabled` while the text is blank. Other props, `ref` included, go to the
 * root `div`.
 */
export function CommentComposer({
  value: valueProp,
  defaultValue,
  onValueChange,
  onSubmit,
  onCancel,
  submitLabel,
  mentions,
  label,
  placeholder,
  disabled = false,
  error,
  autoFocus = false,
  className,
  ...props
}: CommentComposerProps) {
  const labels = useLabels()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [local, setLocal] = React.useState<PromptValue>(() => toPrompt(defaultValue))
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : local
  const setValue = (next: PromptValue) => {
    if (!controlled) setLocal(next)
    onValueChange?.(next)
  }

  // One search object for the hook, reading the newest `mentions`: an inline object stays cheap.
  const mentionsRef = React.useRef(mentions)
  mentionsRef.current = mentions
  // The people search found, so a sent mention keeps their avatar and kind.
  const known = React.useRef(new Map<string, CommentAuthor>())
  const search = React.useMemo<PromptMentions>(
    () => ({
      search: (query) => {
        const toMention = (people: CommentAuthor[]): PromptMention[] =>
          people.map((p) => {
            known.current.set(p.id, p)
            return { id: p.id, label: p.name, icon: <AuthorAvatar author={p} size={20} /> }
          })
        const found = mentionsRef.current?.search(query) ?? []
        return isThenable(found) ? Promise.resolve(found).then(toMention) : toMention(found)
      },
    }),
    [],
  )

  const m = usePromptMentions({ textareaRef, value, onValueChange: setValue, mentions: mentions ? search : undefined, disabled })
  const { onChange, onKeyDown, ...handlers } = m.textareaProps

  React.useEffect(() => {
    const el = textareaRef.current
    if (!autoFocus || !el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    // Only as it mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const blank = value.text.trim() === ''
  const submit = () => {
    if (blank || disabled) return
    const { body, mentions: found } = trimValue(value)
    onSubmit(
      body,
      found.map((m) => {
        const p = known.current.get(m.id)
        return { ...m, ...(m.avatar == null && p?.avatar != null && { avatar: p.avatar }), ...(!m.kind && p?.kind && { kind: p.kind }) }
      }),
    )
    if (!controlled) setLocal(EMPTY)
  }

  /* formatting */
  const apple = useIsApple()
  const keys = (key: string) => (apple ? `⌘${key}` : `Ctrl+${key}`)
  // The selection a format leaves, set again after the render its value change causes.
  const nextSelection = React.useRef<[number, number] | null>(null)
  React.useLayoutEffect(() => {
    const el = textareaRef.current
    const sel = nextSelection.current
    if (!el || !sel) return
    nextSelection.current = null
    el.setSelectionRange(sel[0], sel[1])
  })
  const format = (kind: Format) => {
    const el = textareaRef.current
    if (!el || disabled) return
    let a = Math.min(el.selectionStart, el.selectionEnd)
    let b = Math.max(el.selectionStart, el.selectionEnd)
    // Never split a mention: a selection that cuts into one takes all of it.
    for (const t of value.mentions) {
      if (t.start < a && a < t.end) a = t.start
      if (t.start < b && b < t.end) b = t.end
    }
    const { edits, select } = formatEdits(value.text, a, b, kind)
    el.focus()
    nextSelection.current = select
    // Through the field's own editing, one edit at a time from the end, so undo takes it back and
    // the mentions hook moves its tokens; where the browser can't (no execCommand), set the value.
    let native = typeof document.execCommand === 'function'
    const ordered = [...edits].sort((x, y) => y.at - x.at)
    for (let i = 0; native && i < ordered.length; i++) {
      const e = ordered[i]!
      el.setSelectionRange(e.at, e.at + e.remove)
      try {
        native = e.insert ? document.execCommand('insertText', false, e.insert) : document.execCommand('delete')
      } catch {
        native = false
      }
      // The browser took some of it and then refused: leave what it did, and the selection where it is.
      if (!native && i > 0) {
        nextSelection.current = null
        return
      }
    }
    if (!native) setValue(applyEdits(value, edits))
    el.setSelectionRange(select[0], select[1])
  }

  const errorId = `${React.useId()}-error`
  const invalid = error != null && error !== false && error !== ''

  return (
    <div data-slot="comment-composer" className={cn('flex flex-col gap-2', className)} {...props}>
      <div
        data-slot="comment-composer-field"
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        className="satin-field"
        onMouseDown={(event) => {
          // Empty space in the box (padding, the row's gaps) focuses the text; controls keep their own.
          if (disabled || (event.target as Element).closest('button, a, textarea, input')) return
          event.preventDefault()
          textareaRef.current?.focus()
        }}
      >
        <Textarea
          ref={textareaRef}
          aria-label={label ?? labels.commentsField}
          aria-describedby={invalid ? errorId : undefined}
          placeholder={placeholder ?? labels.commentsPlaceholder}
          disabled={disabled}
          value={value.text}
          // Only marks it invalid: the message goes under the whole field, not inside it.
          error={invalid || undefined}
          underlay={m.overlay}
          {...handlers}
          onChange={(_, event) => onChange(event)}
          onKeyDown={(event) => {
            onKeyDown(event)
            if (event.defaultPrevented || event.nativeEvent.isComposing) return
            // Not while the mentions menu is open: the query is being typed.
            const shortcut = !m.open && (apple ? event.metaKey : event.ctrlKey) && !event.altKey && !event.shiftKey && FORMAT_KEYS[event.key.toLowerCase()]
            if (shortcut) {
              event.preventDefault()
              format(shortcut)
            } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              submit()
            } else if (event.key === 'Escape' && onCancel) {
              event.preventDefault()
              onCancel()
            }
          }}
        />
        <div data-slot="comment-composer-actions" className="flex flex-wrap items-center gap-2 px-1.5 pb-1.5">
          <Toolbar aria-label={labels.commentsFormatting} data-slot="comment-formatting" preventFocusOnPress>
            <ToolbarButton icon={<Bold />} label={labels.commentsBold} shortcut={keys('B')} disabled={disabled} onClick={() => format('bold')} />
            <ToolbarButton icon={<Italic />} label={labels.commentsItalic} shortcut={keys('I')} disabled={disabled} onClick={() => format('italic')} />
            <ToolbarButton icon={<Code />} label={labels.commentsCode} shortcut={keys('E')} disabled={disabled} onClick={() => format('code')} />
            <ToolbarButton icon={<ListIcon />} label={labels.commentsList} disabled={disabled} onClick={() => format('list')} />
            <ToolbarButton icon={<LinkIcon />} label={labels.commentsLink} shortcut={keys('K')} disabled={disabled} onClick={() => format('link')} />
          </Toolbar>
          <div className="ms-auto flex items-center gap-1">
            {onCancel && (
              <Button variant="tertiary" onClick={onCancel} disabled={disabled}>
                {labels.cancel}
              </Button>
            )}
            <Button aria-disabled={blank || undefined} disabled={disabled} onClick={submit}>
              {submitLabel ?? labels.send}
            </Button>
          </div>
        </div>
      </div>
      {m.menu}
      {invalid && (
        <p id={errorId} className="m-0 text-sm text-text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/* ---------- CommentsThread ---------- */

export interface CommentsThreadProps extends Omit<React.ComponentProps<'div'>, 'children' | 'title'> {
  /** Every comment, roots and replies, oldest first. */
  comments: CommentItem[]
  /** Who is writing: sends as them, and Edit and Delete show on their own comments. */
  currentUser: CommentAuthor
  /**
   * A new comment (`parentId` null) or a reply to a root. Return a promise to send optimistically:
   * a dimmed row shows until the comment arrives in `comments`, and a rejection leaves it with
   * Retry. Without `onReply` there is no composer.
   */
  onReply?: (parentId: string | null, body: string, mentions: CommentMention[]) => void | Promise<void>
  /** Adds Edit to your own comments. A rejected promise puts the old text back and reopens the editor, or shows an error toast if another editor is open. */
  onEdit?: (id: string, body: string, mentions: CommentMention[]) => void | Promise<void>
  /**
   * Adds Delete to your own comments (anyone's with `moderator`). Called when the Undo toast closes
   * without Undo, or at once if the thread unmounts or the page is left first. A rejected promise
   * brings the comment back with an error toast. Deleting a root takes its replies with it, but
   * `onDelete` gets the root's id only: the app deletes the replies too. Until it does, they stay
   * hidden rather than becoming roots.
   */
  onDelete?: (id: string) => void | Promise<void>
  /** Delete on everyone's comments, not only your own. Edit stays on your own. */
  moderator?: boolean
  /** @mentions in the composers: "@" opens a menu of the people `search` finds. */
  mentions?: CommentsMentions
  /** Read only: no composer, menu or Reply. */
  disabled?: boolean
  /** In place of the default empty state ("No comments yet"). */
  empty?: React.ReactNode
  /**
   * A heading over the thread, "Comments", with the number of comments in a Badge next to it.
   * It names the thread for screen readers.
   */
  title?: React.ReactNode
  /** The heading's level. Defaults to `h3`. */
  titleAs?: 'h2' | 'h3' | 'h4'
  /** `card` puts the thread on a card: bg/card, a border/default edge, radius-xl, 16px in. Defaults to `plain`. */
  variant?: 'plain' | 'card'
}

type Pending = {
  key: string
  parentId: string | null
  body: string
  mentions: CommentMention[]
  at: Date
  /** `sent`: resolved with no matching comment yet; it stays, undimmed, until the set of comment ids changes. */
  status: 'sending' | 'sent' | 'failed'
  /** The comment ids there were when it was first sent: a match is a comment that wasn't. */
  seen: Set<string>
  /** The comment ids when it resolved. Compared by content, so a new array with the same comments keeps the row. */
  settledIds?: Set<string>
}

/** Bodies compared the way a server may store them: line endings and runs of spaces don't count. */
const looseBody = (body: string) => body.replace(/\s+/g, ' ').trim()

type Editing = { id: string; value: PromptValue; error?: React.ReactNode }

/**
 * Reply, Edit and Discard under a comment. Tertiary has no fill at rest, so a word in text/default
 * read as more of the comment: the label goes text/muted like its icon (4.5:1) and takes
 * text/default on hover, with the hover fill, so the row reads as actions, not a sentence.
 */
const FOOTER_BUTTON = 'text-text-muted satin-hover:text-text-default'

type Override = { body: string; mentions: CommentMention[]; base: string }

/** A comment row that fades in when it arrives after the thread first showed. */
function Row({ ready, ...props }: CommentProps & { ready: React.RefObject<boolean> }) {
  const [enter] = React.useState(() => ready.current)
  return <Comment animateIn={enter} {...props} />
}

export function CommentsThread({
  comments,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  moderator = false,
  mentions,
  disabled = false,
  empty,
  title,
  titleAs: TitleTag = 'h3',
  variant = 'plain',
  className,
  ref,
  ...props
}: CommentsThreadProps) {
  const labels = useLabels()
  const uid = React.useId()
  const seq = React.useRef(0)

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const setRoot = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // The newest props, for handlers that run later (a promise, a toast closing, unmount).
  const commentsRef = React.useRef(comments)
  commentsRef.current = comments
  const onDeleteRef = React.useRef(onDelete)
  onDeleteRef.current = onDelete
  const labelsRef = React.useRef(labels)
  labelsRef.current = labels

  // Rows mounted after the first paint fade in.
  const ready = React.useRef(false)
  React.useEffect(() => {
    ready.current = true
  }, [])

  /* focus, after the render that shows its target */
  const focusRef = React.useRef<(() => HTMLElement | null | undefined) | null>(null)
  const [, bump] = React.useReducer((n: number) => n + 1, 0)
  const focusLater = React.useCallback((find: () => HTMLElement | null | undefined) => {
    focusRef.current = find
    bump()
  }, [])
  React.useEffect(() => {
    const find = focusRef.current
    if (!find) return
    focusRef.current = null
    find()?.focus()
  })
  const all = (selector: string) => Array.from(rootRef.current?.querySelectorAll<HTMLElement>(selector) ?? [])
  const article = (id: string) => all('[data-slot="comment"]').find((el) => el.dataset.commentId === id)
  const part = (name: string, key?: string) =>
    all(`[data-part="${name}"]`).find((el) => key === undefined || el.dataset.key === key)
  const composerField = (key: string) =>
    all('[data-slot="comment-composer"]')
      .find((el) => el.dataset.key === key)
      ?.querySelector('textarea')

  /* sending */
  const [pending, setPending] = React.useState<Pending[]>([])
  // A comment that replaced a pending row keeps the row's key, so it doesn't mount (and fade) again.
  const keyFor = React.useRef(new Map<string, string>())
  // Comments that already showed on their own when their row's promise resolved: the row went instead.
  const claimed = React.useRef(new Set<string>())
  const matched = React.useMemo(() => {
    const out = new Map<string, string>()
    for (const p of pending) {
      const c = comments.find(
        (c) =>
          !out.has(c.id) &&
          !p.seen.has(c.id) &&
          !keyFor.current.has(c.id) &&
          !claimed.current.has(c.id) &&
          c.author.id === currentUser.id &&
          (c.parentId ?? null) === p.parentId &&
          c.body === p.body,
      )
      if (c) out.set(c.id, p.key)
    }
    return out
  }, [pending, comments, currentUser.id])
  const matchedKeys = new Set(matched.values())
  React.useEffect(() => {
    if (!matched.size) return
    for (const [id, key] of matched) keyFor.current.set(id, key)
    const done = new Set(matched.values())
    setPending((list) => list.filter((p) => !done.has(p.key)))
  }, [matched])
  // A row whose promise resolved without its comment showing up goes when the comment ids change:
  // the comment arrived (with a body the server rewrote) or the list was reloaded. A new array with
  // the same comments (a parent re-rendering `data.map(…)`) keeps it.
  React.useEffect(() => {
    setPending((list) => {
      const next = list.filter(
        (p) => !(p.status === 'sent' && p.settledIds && (p.settledIds.size !== comments.length || comments.some((c) => !p.settledIds!.has(c.id)))),
      )
      return next.length === list.length ? list : next
    })
  }, [comments])
  const keyOf = (id: string) => keyFor.current.get(id) ?? matched.get(id) ?? id

  const send = (parentId: string | null, body: string, found: CommentMention[], retry?: Pending) => {
    if (!onReply) return
    const seen = retry?.seen ?? new Set(commentsRef.current.map((c) => c.id))
    const result = attempt(() => onReply(parentId, body, found))
    if (!isThenable(result)) {
      if (retry) setPending((list) => list.filter((p) => p.key !== retry.key))
      return
    }
    const key = retry?.key ?? `comment-pending-${uid}-${++seq.current}`
    setPending((list) =>
      retry
        ? list.map((p) => (p.key === key ? { ...p, status: 'sending' } : p))
        : [...list, { key, parentId, body, mentions: found, at: new Date(), status: 'sending', seen }],
    )
    if (retry) focusLater(() => article(key))
    result.then(
      () => {
        const now = commentsRef.current
        // A comment of ours under the same parent that wasn't there at send already showed with a
        // body the server changed (CRLF, spaces), say from a realtime push: the row goes, no copy
        // stays. An exact body is left to `matched`, which keeps the row's element.
        const candidates = now.filter(
          (c) =>
            !seen.has(c.id) &&
            !keyFor.current.has(c.id) &&
            !claimed.current.has(c.id) &&
            c.author.id === currentUser.id &&
            (c.parentId ?? null) === parentId,
        )
        if (!candidates.some((c) => c.body === body)) {
          const c = candidates.find((c) => looseBody(c.body) === looseBody(body)) ?? candidates[0]
          if (c) {
            claimed.current.add(c.id)
            setPending((list) => list.filter((p) => p.key !== key))
            return
          }
        }
        const ids = new Set(now.map((c) => c.id))
        setPending((list) => list.map((p) => (p.key === key && p.status === 'sending' ? { ...p, status: 'sent', settledIds: ids } : p)))
      },
      () => {
        setPending((list) => list.map((p) => (p.key === key ? { ...p, status: 'failed' } : p)))
        focusLater(() => part('retry', key))
      },
    )
  }
  const discard = (p: Pending) => {
    setPending((list) => list.filter((q) => q.key !== p.key))
    focusLater(() => (p.parentId != null ? composerField(`reply:${p.parentId}`) : undefined) ?? composerField('root'))
  }

  /* replying */
  const [replyTo, setReplyTo] = React.useState<string | null>(null)
  const openReply = (id: string) => {
    if (replyTo === id) focusLater(() => composerField(`reply:${id}`))
    setReplyTo(id)
  }
  const closeReply = (id: string) => {
    setReplyTo(null)
    focusLater(() => part('reply', id))
  }

  /* editing */
  const [editing, setEditing] = React.useState<Editing | null>(null)
  const editingRef = React.useRef(editing)
  editingRef.current = editing
  const [overrides, setOverrides] = React.useState<Record<string, Override>>({})
  const shown = (c: CommentItem) => {
    const o = overrides[c.id]
    return o && o.base === c.body ? { body: o.body, mentions: o.mentions, edited: true } : { body: c.body, mentions: c.mentions, edited: c.edited }
  }
  // An override goes once the comment's body has changed under it.
  React.useEffect(() => {
    setOverrides((o) => {
      const stale = Object.keys(o).filter((id) => comments.find((c) => c.id === id)?.body !== o[id]!.base)
      if (!stale.length) return o
      const next = { ...o }
      for (const id of stale) delete next[id]
      return next
    })
  }, [comments])

  const startEdit = (c: CommentItem) => {
    const s = shown(c)
    setEditing({ id: c.id, value: { text: s.body, mentions: validMentions(s.body, s.mentions) } })
  }
  const cancelEdit = (id: string) => {
    setEditing(null)
    focusLater(() => article(id)?.querySelector<HTMLElement>('[data-part="edit"]'))
  }
  const saveEdit = (c: CommentItem, body: string, found: CommentMention[]) => {
    const s = shown(c)
    setEditing(null)
    focusLater(() => article(c.id))
    // Compared by place, not by object: an avatar is a React element.
    const where = (list: CommentMention[]) => list.map((m) => `${m.id}:${m.start}:${m.end}`).join()
    const same = body === s.body && where(found) === where(validMentions(s.body, s.mentions))
    if (same || !onEdit) return
    setOverrides((o) => ({ ...o, [c.id]: { body, mentions: found, base: c.body } }))
    const result = attempt(() => onEdit(c.id, body, found))
    if (isThenable(result))
      result.then(undefined, () => {
        setOverrides((o) => {
          const next = { ...o }
          delete next[c.id]
          return next
        })
        const error = labelsRef.current.commentsSaveFailed
        // Another comment's editor opened meanwhile: it stays, and the failure is a toast.
        const other = editingRef.current && editingRef.current.id !== c.id
        if (other) toast.error(error)
        setEditing((e) => (e && e.id !== c.id ? e : { id: c.id, value: { text: body, mentions: found }, error }))
      })
  }

  /* deleting */
  // Deleted comments, and whether each was a root. They stay hidden after onDelete, so a deleted
  // root's replies don't come back as roots when the app removes only the root.
  const [hidden, setHidden] = React.useState<ReadonlyMap<string, boolean>>(() => new Map())
  const deletions = React.useRef(new Map<string, { toastId: string; done: boolean }>())
  const unhide = (id: string) =>
    setHidden((s) => {
      const next = new Map(s)
      next.delete(id)
      return next
    })
  const commit = (id: string) => {
    const result = attempt(() => onDeleteRef.current?.(id))
    if (isThenable(result))
      result.then(undefined, () => {
        unhide(id)
        toast.error(labelsRef.current.commentsDeleteFailed)
      })
  }
  const remove = (c: CommentItem) => {
    // Focus goes to the next comment outside what goes (a root takes its replies), else the composer.
    const own = article(c.id)
    const gone = own && !c.parentId ? (own.closest('li') ?? own) : own
    const next = own
      ? all('[data-slot="comment"]').find(
          (el) => !!(own.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) && !gone?.contains(el),
        )
      : undefined
    const before = own ? all('[data-slot="comment"]').filter((el) => el.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING && !gone?.contains(el)).pop() : undefined
    setHidden((s) => new Map(s).set(c.id, !c.parentId || !commentsRef.current.some((p) => p.id === c.parentId)))
    focusLater(() => (next?.isConnected ? next : null) ?? composerField('root') ?? (before?.isConnected ? before : null))

    const entry = { toastId: `comments-thread-${uid}-delete-${++seq.current}`, done: false }
    deletions.current.set(c.id, entry)
    toast(labels.commentsDeleted, {
      id: entry.toastId,
      countdown: true,
      action: { label: labels.commentsUndo },
      onClose: (reason) => {
        if (entry.done) return
        entry.done = true
        deletions.current.delete(c.id)
        if (reason === 'action') {
          unhide(c.id)
          focusLater(() => article(c.id))
        } else commit(c.id)
      },
    })
  }
  // Leaving with an Undo window open deletes at once: the toast's end would come too late.
  React.useEffect(() => {
    const flush = () => {
      for (const [id, entry] of deletions.current) {
        if (entry.done) continue
        entry.done = true
        deletions.current.delete(id)
        commit(id)
        toast.dismiss(entry.toastId)
      }
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
    // commit reads only refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* the threads */
  const threads = React.useMemo(() => {
    const byId = new Map(comments.map((c) => [c.id, c]))
    const rootOf = (c: CommentItem) => {
      let cur = c
      const seen = new Set([c.id])
      while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.parentId)) {
        seen.add(cur.parentId)
        cur = byId.get(cur.parentId)!
      }
      return cur.id
    }
    const roots = new Map<string, { root: CommentItem; replies: CommentItem[] }>()
    for (const c of comments) if (rootOf(c) === c.id) roots.set(c.id, { root: c, replies: [] })
    for (const c of comments) {
      const r = rootOf(c)
      if (r === c.id) continue
      const thread = roots.get(r)
      // A loop of parents has no root: its comments stand on their own.
      if (thread) thread.replies.push(c)
      else roots.set(c.id, { root: c, replies: [] })
    }
    return { byId, threads: [...roots.values()] }
  }, [comments])

  // Hidden: a deleted comment, and anything whose chain of parents reaches a deleted root, even
  // once the root has left `comments`. Other orphans still become roots.
  const isHidden = (c: CommentItem) => {
    if (hidden.has(c.id)) return true
    const seen = new Set([c.id])
    let parent = c.parentId
    while (parent && !seen.has(parent)) {
      if (hidden.get(parent)) return true
      seen.add(parent)
      parent = threads.byId.get(parent)?.parentId
    }
    return false
  }
  const visible = threads.threads
    .filter((t) => !isHidden(t.root))
    .map((t) => ({ ...t, replies: t.replies.filter((r) => !isHidden(r)) }))
  const shownPending = pending.filter((p) => !matchedKeys.has(p.key))
  const pendingRoots = shownPending.filter((p) => p.parentId === null)
  const pendingFor = (id: string) => shownPending.filter((p) => p.parentId === id)

  const canCompose = !disabled && !!onReply

  // A mention without an avatar takes the one of an author with its id, so the tooltip shows it.
  const authors = React.useMemo(() => {
    const map = new Map<string, CommentAuthor>([[currentUser.id, currentUser]])
    for (const c of comments) if (!map.has(c.author.id)) map.set(c.author.id, c.author)
    return map
  }, [comments, currentUser])
  const withAuthors = (list: CommentMention[] | undefined) =>
    list?.map((m) => {
      const a = authors.get(m.id)
      return a && (m.avatar == null || !m.kind) ? { ...m, avatar: m.avatar ?? a.avatar, kind: m.kind ?? a.kind } : m
    })

  const renderComment = (c: CommentItem, isRoot: boolean) => {
    const s = shown(c)
    const own = c.author.id === currentUser.id
    const canEdit = !disabled && !!onEdit && own
    const canDelete = !disabled && !!onDelete && (own || moderator)
    const isEditing = editing?.id === c.id
    return (
      <Row
        ready={ready}
        data-comment-id={c.id}
        author={c.author}
        at={c.at}
        body={s.body}
        mentions={withAuthors(s.mentions)}
        edited={s.edited}
        own={own}
        actions={!isEditing && canDelete ? <CommentActions authorName={c.author.name} onDelete={() => remove(c)} /> : undefined}
        footer={
          !isEditing && ((isRoot && canCompose) || canEdit) ? (
            // -ms-2 takes back the button's 8px, so the first icon starts where the body does.
            <span className="-ms-2 flex items-center gap-1">
              {isRoot && canCompose && (
                <Button
                  variant="tertiary"
                  size="xs"
                  data-part="reply"
                  data-key={c.id}
                  aria-label={labels.commentsReplyTo(c.author.name)}
                  className={FOOTER_BUTTON}
                  onClick={() => openReply(c.id)}
                >
                  <Reply aria-hidden />
                  {labels.commentsReply}
                </Button>
              )}
              {canEdit && (
                <Button variant="tertiary" size="xs" data-part="edit" data-key={c.id} className={FOOTER_BUTTON} onClick={() => startEdit(c)}>
                  <EditPencil aria-hidden />
                  {labels.commentsEdit}
                </Button>
              )}
            </span>
          ) : undefined
        }
      >
        {isEditing ? (
          <CommentComposer
            className="mt-1"
            data-key={`edit:${c.id}`}
            value={editing.value}
            onValueChange={(value) => setEditing((e) => (e && e.id === c.id ? { ...e, value } : e))}
            onSubmit={(body, found) => saveEdit(c, body, found)}
            onCancel={() => cancelEdit(c.id)}
            submitLabel={labels.commentsSave}
            label={labels.commentsEditField}
            placeholder=""
            mentions={mentions}
            error={editing.error}
            autoFocus
          />
        ) : undefined}
      </Row>
    )
  }

  const renderPending = (p: Pending) => {
    const errorId = `${uid}-${p.key}-error`
    return (
      <li key={p.key}>
        <Row
          ready={ready}
          data-comment-id={p.key}
          author={currentUser}
          own
          at={p.at}
          body={p.body}
          mentions={withAuthors(p.mentions)}
          state={p.status === 'sending' ? 'sending' : p.status === 'failed' ? 'failed' : undefined}
          footer={
            p.status === 'failed' ? (
              <>
                <span id={errorId} className="me-1 inline-flex items-center gap-1 text-sm leading-5 text-text-destructive">
                  <WarningCircle aria-hidden className="size-3.5 [stroke-width:1.875]" />
                  {labels.commentsNotSent}
                </span>
                <Button variant="secondary" size="xs" data-part="retry" data-key={p.key} aria-describedby={errorId} onClick={() => send(p.parentId, p.body, p.mentions, p)}>
                  <Refresh aria-hidden />
                  {labels.commentsRetry}
                </Button>
                <Button variant="tertiary" size="xs" className={FOOTER_BUTTON} onClick={() => discard(p)}>
                  <Xmark aria-hidden />
                  {labels.commentsDiscard}
                </Button>
              </>
            ) : undefined
          }
        />
      </li>
    )
  }

  const hasAny = visible.length > 0 || pendingRoots.length > 0
  const count = visible.reduce((n, t) => n + 1 + t.replies.length, 0)
  const titleId = `${uid}-title`

  return (
    <div
      ref={setRoot}
      data-slot="comments-thread"
      data-variant={variant}
      aria-labelledby={title != null ? titleId : undefined}
      role={title != null ? 'region' : undefined}
      className={cn(
        'flex flex-col gap-4',
        variant === 'card' && 'rounded-xl border border-border-default bg-bg-card p-4 [box-shadow:0_1px_2px_0_var(--effect-shadow-xs)]',
        className,
      )}
      {...props}
    >
      {title != null && (
        <div data-slot="comments-thread-header" className="flex min-h-6 items-center gap-2">
          <TitleTag id={titleId} className="m-0 text-base leading-6 font-medium text-text-default">
            {title}
          </TitleTag>
          <Badge size="sm">
            <span aria-hidden>{new Intl.NumberFormat(labels.dateLocale).format(count)}</span>
            <span className="sr-only">{labels.commentsCount(count)}</span>
          </Badge>
        </div>
      )}
      <div data-slot="comments-thread-body" className="flex flex-col gap-4">
        {hasAny ? (
          <List aria-label={labels.comments} className="gap-5">
            {/* One array, so a comment that replaces its pending row keeps the row's element. */}
            {[...visible.map(({ root, replies }) => {
              const pendingReplies = pendingFor(root.id)
              return (
                <li key={keyOf(root.id)} data-slot="comments-thread-item" className="flex flex-col gap-3">
                  {renderComment(root, true)}
                  {(replies.length > 0 || pendingReplies.length > 0 || (replyTo === root.id && canCompose)) && (
                    <div data-slot="comment-replies-thread" className="relative flex flex-col gap-3 ps-9">
                      {(replies.length > 0 || pendingReplies.length > 0) && (
                        <ul role="list" data-slot="comment-replies" className="m-0 flex list-none flex-col gap-3 p-0">
                          {/* One array, so a comment that replaces its pending row keeps the row's element. */}
                          {[...replies.map((r) => <li key={keyOf(r.id)}>{renderComment(r, false)}</li>), ...pendingReplies.map(renderPending)]}
                        </ul>
                      )}
                      {replyTo === root.id && canCompose && (
                        <CommentComposer
                          data-key={`reply:${root.id}`}
                          label={labels.commentsReplyTo(root.author.name)}
                          placeholder={labels.commentsReplyPlaceholder}
                          mentions={mentions}
                          onSubmit={(body, found) => send(root.id, body, found)}
                          onCancel={() => closeReply(root.id)}
                          autoFocus
                        />
                      )}
                    </div>
                  )}
                </li>
              )
            }), ...pendingRoots.map(renderPending)]}
          </List>
        ) : (
          (empty ?? (
            <EmptyState
              className="self-center"
              icon={<ChatLines />}
              title={labels.commentsEmptyTitle}
              description={labels.commentsEmptyText}
            />
          ))
        )}
        {canCompose && <CommentComposer data-key="root" mentions={mentions} onSubmit={(body, found) => send(null, body, found)} />}
      </div>
    </div>
  )
}
