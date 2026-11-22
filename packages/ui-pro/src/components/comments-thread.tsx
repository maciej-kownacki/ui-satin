'use client'

import * as React from 'react'
import { ChatLines, Check, EditPencil, MoreHoriz, Trash, WarningCircle } from 'iconoir-react'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Button } from '@uisatin/ui/button'
import { DropdownMenu, DropdownMenuItem } from '@uisatin/ui/dropdown'
import { EmptyState } from '@uisatin/ui/empty-state'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'
import { List } from '@uisatin/ui/list'
import { Mention, usePromptMentions, type PromptMention, type PromptMentions, type PromptValue } from '@uisatin/ui/prompt-mentions'
import { RelativeTime, dateTimeFormat } from '@uisatin/ui/relative-time'
import { Spinner } from '@uisatin/ui/spinner'
import { Textarea } from '@uisatin/ui/textarea'
import { toast } from '@uisatin/ui/toast'

/**
 * CommentsThread: a discussion on a record (a candidate, a deal, a campaign, an order), with
 * replies, @mentions and resolve. Not a support inbox and not a change history.
 *
 * - Root comments, each with its replies one level deep, in a `List` (`ul`) of threads. A reply
 *   whose `parentId` points at a reply joins that reply's root; a reply whose parent is missing
 *   becomes a root, unless that parent is a root deleted here. Only roots have Reply: it opens a reply composer under the replies, with focus
 *   in it; Escape closes it and puts focus back on Reply.
 * - Each comment is an `<article>` named "Comment by Marta Nowak, {full date}": avatar (initials
 *   by default), name, the time relative today (Free's `RelativeTime`, the full date for screen
 *   readers), "(edited)", the body with its line breaks and its `mentions` drawn as `Mention`.
 * - The ⋯ menu ("Actions for comment by Marta Nowak") has Edit on your own comments (`onEdit`)
 *   and Delete on yours, or on anyone's with `moderator` (`onDelete`).
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
 * - `resolvable`: Resolve sits at the start of the composer's row, away from Send. A resolved
 *   thread folds to one line ("Resolved by Marta Nowak", Show comments, Reopen), opacity only.
 *   Focus goes to Reopen after Resolve and back to Resolve after Reopen. `resolved` /
 *   `defaultResolved` / `onResolve`; an `onResolve` promise is optimistic and a rejection undoes it.
 * - New comments fade in, 4px up, over --duration-base; reduced motion turns it off.
 * - `disabled` reads only: no composer, menu, Reply, Resolve or Reopen.
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
  commentsResolve: 'Resolve',
  commentsReopen: 'Reopen',
  /** The resolved bar, when nobody is named. */
  commentsResolved: 'Resolved',
  /** The resolved bar: "Resolved by Marta Nowak". */
  commentsResolvedBy: (name: string) => `Resolved by ${name}`,
  commentsShow: 'Show comments',
  commentsHide: 'Hide comments',
  /** After the time of an edited comment. */
  commentsEdited: '(edited)',
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
  /** 24px in place of the initials: an Avatar in the person's tone, a photo. */
  avatar?: React.ReactNode
}

/** A mention in a comment's body: `body.slice(start, end)` is "@" and the label. The fields of Free's `PromptMentionToken`. */
export interface CommentMention {
  id: string
  label: string
  start: number
  end: number
}

export interface CommentItem {
  id: string
  author: CommentAuthor
  /** Plain text; line breaks are kept. */
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

function AuthorAvatar({ author, size }: { author: CommentAuthor; size: 20 | 24 }) {
  if (author.avatar) return <>{author.avatar}</>
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
    out.push({ id: m.id, label: m.label, start: m.start, end: m.end })
    at = m.end
  }
  return out
}

/** The body with its mentions as `Mention`. */
function renderBody(body: string, mentions: CommentMention[] | undefined) {
  const valid = validMentions(body, mentions)
  if (!valid.length) return body
  const parts: React.ReactNode[] = []
  let at = 0
  for (const m of valid) {
    if (m.start > at) parts.push(body.slice(at, m.start))
    parts.push(<Mention key={m.start} id={m.id} label={m.label} />)
    at = m.end
  }
  if (at < body.length) parts.push(body.slice(at))
  return parts
}

/** The text trimmed, with the mentions moved by what the start lost. */
function trimValue(value: PromptValue): { body: string; mentions: CommentMention[] } {
  const lead = value.text.length - value.text.trimStart().length
  const body = value.text.trim()
  const mentions = value.mentions
    .map((m) => ({ id: m.id, label: m.label, start: m.start - lead, end: m.end - lead }))
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
  /** Plain text; line breaks are kept. */
  body: string
  /** Drawn as `Mention` where the body reads "@" and the label. */
  mentions?: CommentMention[]
  /** Shows "(edited)" after the time. */
  edited?: boolean
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
 * be moved to it. The avatar (initials in a tone picked from the author's id), the name in medium
 * 13px, `RelativeTime`, "(edited)" in text/muted, then the body in 14/21 text/default with its
 * line breaks. Other props, `ref` included, go to the `article`.
 */
export function Comment({
  author,
  at,
  body,
  mentions,
  edited = false,
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
          <span className="min-w-0 truncate text-sm leading-5 font-medium text-text-default">{author.name}</span>
          <RelativeTime at={time} />
          {edited && <span className="shrink-0 text-sm leading-5 text-text-muted">{labels.commentsEdited}</span>}
          {state === 'sending' && <Spinner size="xs" label={labels.sending} className="text-text-muted" />}
          {actions && <span className="ms-auto flex shrink-0">{actions}</span>}
        </div>
        {children ?? (
          <p data-slot="comment-body" className="m-0 text-body break-words whitespace-pre-wrap text-text-default">
            {renderBody(body, mentions)}
          </p>
        )}
        {footer && (
          <div data-slot="comment-footer" className="mt-1 flex flex-wrap items-center gap-2">
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
  /** Under the field, in text/destructive; the field is marked invalid. */
  error?: React.ReactNode
  /** Focus the field when it mounts, with the caret at the end. */
  autoFocus?: boolean
  /** At the start of the button row, away from Send: the thread puts Resolve here. */
  start?: React.ReactNode
}

/**
 * The field and Send: a Satin Textarea (64px, resizable) with @mentions from `usePromptMentions`,
 * and the button row under it. Ctrl/⌘+Enter sends, Enter alone is a new line, Escape cancels
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
  start,
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
  const search = React.useMemo<PromptMentions>(
    () => ({
      search: (query) => {
        const toMention = (people: CommentAuthor[]): PromptMention[] =>
          people.map((p) => ({ id: p.id, label: p.name, icon: <AuthorAvatar author={p} size={20} /> }))
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
    onSubmit(body, found)
    if (!controlled) setLocal(EMPTY)
  }

  return (
    <div data-slot="comment-composer" className={cn('flex flex-col gap-2', className)} {...props}>
      <Textarea
        ref={textareaRef}
        aria-label={label ?? labels.commentsField}
        placeholder={placeholder ?? labels.commentsPlaceholder}
        disabled={disabled}
        value={value.text}
        error={error || undefined}
        underlay={m.overlay}
        {...handlers}
        onChange={(_, event) => onChange(event)}
        onKeyDown={(event) => {
          onKeyDown(event)
          if (event.defaultPrevented || event.nativeEvent.isComposing) return
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            submit()
          } else if (event.key === 'Escape' && onCancel) {
            event.preventDefault()
            onCancel()
          }
        }}
      />
      {m.menu}
      <div data-slot="comment-composer-actions" className="flex flex-wrap items-center gap-2">
        {start}
        <div className="ms-auto flex items-center gap-2">
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
  )
}

/* ---------- CommentsThread ---------- */

export interface CommentsThreadProps extends Omit<React.ComponentProps<'div'>, 'children'> {
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
  /** Resolve and Reopen. A promise is optimistic; a rejection undoes the change. */
  onResolve?: (resolved: boolean) => void | Promise<void>
  /** Resolved, controlled: the thread folds to one line. */
  resolved?: boolean
  /** Resolved at first, uncontrolled. */
  defaultResolved?: boolean
  /** Named on the resolved bar ("Resolved by Marta Nowak"). Uncontrolled, resolving sets it to `currentUser`. */
  resolvedBy?: CommentAuthor
  /** Adds Resolve to the thread and Reopen to the resolved bar. */
  resolvable?: boolean
  /** Delete on everyone's comments, not only your own. Edit stays on your own. */
  moderator?: boolean
  /** @mentions in the composers: "@" opens a menu of the people `search` finds. */
  mentions?: CommentsMentions
  /** Read only: no composer, menu, Reply, Resolve or Reopen. */
  disabled?: boolean
  /** In place of the default empty state ("No comments yet"). */
  empty?: React.ReactNode
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
  onResolve,
  resolved: resolvedProp,
  defaultResolved = false,
  resolvedBy: resolvedByProp,
  resolvable = false,
  moderator = false,
  mentions,
  disabled = false,
  empty,
  className,
  ref,
  ...props
}: CommentsThreadProps) {
  const labels = useLabels()
  const uid = React.useId()
  const bodyId = `${uid}-body`
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
    focusLater(() => article(id)?.querySelector<HTMLElement>('[data-part="comment-actions"]'))
  }
  const saveEdit = (c: CommentItem, body: string, found: CommentMention[]) => {
    const s = shown(c)
    setEditing(null)
    focusLater(() => article(c.id))
    const same = body === s.body && JSON.stringify(found) === JSON.stringify(validMentions(s.body, s.mentions))
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

  /* resolving */
  const controlled = resolvedProp !== undefined
  const [localResolved, setLocalResolved] = React.useState(defaultResolved)
  const [localBy, setLocalBy] = React.useState<CommentAuthor | undefined>(undefined)
  const [optimistic, setOptimistic] = React.useState<boolean | null>(null)
  React.useEffect(() => setOptimistic(null), [resolvedProp])
  const isResolved = optimistic ?? (controlled ? resolvedProp : localResolved)
  const by = controlled ? resolvedByProp : (localBy ?? resolvedByProp)
  const [expanded, setExpanded] = React.useState(false)
  // Set by the first resolve, reopen or show: the swap fades from then on, not on the first paint.
  const [swapped, setSwapped] = React.useState(false)
  const setResolved = (next: boolean) => {
    const prevBy = localBy
    setSwapped(true)
    setExpanded(false)
    if (!controlled) {
      setLocalResolved(next)
      setLocalBy(next ? currentUser : undefined)
    }
    const result = attempt(() => onResolve?.(next))
    if (isThenable(result)) {
      if (controlled) setOptimistic(next)
      result.then(
        () => setOptimistic(null),
        () => {
          // Focus was on the control the change put there, which goes with the rollback: it moves
          // to the one that comes back (Resolve or Reopen), not to the page.
          const had = document.activeElement === part(next ? 'reopen' : 'resolve')
          setOptimistic(null)
          if (!controlled) {
            setLocalResolved(!next)
            setLocalBy(prevBy)
          }
          if (had) focusLater(() => part(next ? 'resolve' : 'reopen'))
        },
      )
    }
    focusLater(() => part(next ? 'reopen' : 'resolve'))
  }

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
  const collapsed = isResolved && !expanded

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
        mentions={s.mentions}
        edited={s.edited}
        actions={
          !isEditing && (canEdit || canDelete) ? (
            <CommentActions
              authorName={c.author.name}
              onEdit={canEdit ? () => startEdit(c) : undefined}
              onDelete={canDelete ? () => remove(c) : undefined}
            />
          ) : undefined
        }
        footer={
          isRoot && canCompose && !isEditing ? (
            <Button
              variant="tertiary"
              size="xs"
              className="-ms-2"
              data-part="reply"
              data-key={c.id}
              aria-label={labels.commentsReplyTo(c.author.name)}
              onClick={() => openReply(c.id)}
            >
              {labels.commentsReply}
            </Button>
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
          at={p.at}
          body={p.body}
          mentions={p.mentions}
          state={p.status === 'sending' ? 'sending' : p.status === 'failed' ? 'failed' : undefined}
          footer={
            p.status === 'failed' ? (
              <>
                <span id={errorId} className="inline-flex items-center gap-1 text-sm leading-5 text-text-destructive">
                  <WarningCircle aria-hidden className="size-3.5 [stroke-width:1.875]" />
                  {labels.commentsNotSent}
                </span>
                <Button variant="secondary" size="xs" data-part="retry" data-key={p.key} aria-describedby={errorId} onClick={() => send(p.parentId, p.body, p.mentions, p)}>
                  {labels.commentsRetry}
                </Button>
                <Button variant="tertiary" size="xs" onClick={() => discard(p)}>
                  {labels.commentsDiscard}
                </Button>
              </>
            ) : undefined
          }
        />
      </li>
    )
  }

  const resolveButton =
    resolvable && !disabled && !isResolved ? (
      <Button variant="tertiary" className="-ms-2.5" data-part="resolve" onClick={() => setResolved(true)}>
        <Check aria-hidden />
        {labels.commentsResolve}
      </Button>
    ) : null

  const hasAny = visible.length > 0 || pendingRoots.length > 0

  return (
    <div ref={setRoot} data-slot="comments-thread" data-resolved={isResolved || undefined} className={cn('flex flex-col gap-4', className)} {...props}>
      {isResolved && (
        <div
          data-slot="comments-thread-resolved"
          data-enter={swapped || undefined}
          className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-border-default px-3 py-1.5"
        >
          <Check aria-hidden className="size-icon-size shrink-0 text-status-green-fg [stroke-width:1.875]" />
          <span className="min-w-0 flex-1 truncate text-sm leading-5 text-text-default">
            {by ? labels.commentsResolvedBy(by.name) : labels.commentsResolved}
          </span>
          <Button
            variant="tertiary"
            size="xs"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => {
              setSwapped(true)
              setExpanded((x) => !x)
            }}
          >
            {expanded ? labels.commentsHide : labels.commentsShow}
          </Button>
          {resolvable && !disabled && (
            <Button variant="secondary" size="xs" data-part="reopen" onClick={() => setResolved(false)}>
              {labels.commentsReopen}
            </Button>
          )}
        </div>
      )}
      <div
        id={bodyId}
        data-slot="comments-thread-body"
        data-enter={swapped || undefined}
        hidden={collapsed}
        className={cn(collapsed ? 'hidden' : 'flex', 'flex-col gap-4')}
      >
        {hasAny ? (
          <List aria-label={labels.comments} className="gap-5">
            {/* One array, so a comment that replaces its pending row keeps the row's element. */}
            {[...visible.map(({ root, replies }) => {
              const pendingReplies = pendingFor(root.id)
              return (
                <li key={keyOf(root.id)} data-slot="comments-thread-item" className="flex flex-col gap-3">
                  {renderComment(root, true)}
                  {(replies.length > 0 || pendingReplies.length > 0) && (
                    <ul role="list" data-slot="comment-replies" className="m-0 flex list-none flex-col gap-3 p-0 ps-9">
                      {/* One array, so a comment that replaces its pending row keeps the row's element. */}
                      {[...replies.map((r) => <li key={keyOf(r.id)}>{renderComment(r, false)}</li>), ...pendingReplies.map(renderPending)]}
                    </ul>
                  )}
                  {replyTo === root.id && canCompose && (
                    <CommentComposer
                      className="ps-9"
                      data-key={`reply:${root.id}`}
                      label={labels.commentsReplyTo(root.author.name)}
                      placeholder={labels.commentsReplyPlaceholder}
                      mentions={mentions}
                      onSubmit={(body, found) => send(root.id, body, found)}
                      onCancel={() => closeReply(root.id)}
                      autoFocus
                    />
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
        {canCompose ? (
          <CommentComposer data-key="root" mentions={mentions} onSubmit={(body, found) => send(null, body, found)} start={resolveButton} />
        ) : (
          resolveButton && (
            <div data-slot="comments-thread-footer" className="flex">
              {resolveButton}
            </div>
          )
        )}
      </div>
    </div>
  )
}
