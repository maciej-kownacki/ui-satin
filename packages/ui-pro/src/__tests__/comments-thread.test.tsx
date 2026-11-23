import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Toaster, toast } from '@uisatin/ui/toast'
import {
  CommentComposer,
  CommentsThread,
  type CommentAuthor,
  type CommentItem,
  type CommentsThreadProps,
} from '../components/comments-thread'

const you: CommentAuthor = { id: 'u-marta', name: 'Marta Nowak' }
const tom: CommentAuthor = { id: 'u-tom', name: 'Tom Okafor' }
const tara: CommentAuthor = { id: 'u-tara', name: 'Tara Mendes' }

const at1 = new Date(2026, 10, 16, 9, 40)
const at2 = new Date(2026, 10, 16, 10, 5)
const full = (d: Date) => new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(d)

/** Tom asks about Tara's salary, Marta answers, Tom replies to her reply (which joins the root), then Marta's own note. */
const seed = (): CommentItem[] => [
  { id: 'c1', author: tom, body: 'Tara asked for 9k. Can we go there?', at: at1 },
  { id: 'c2', author: you, body: 'Budget tops at 8.5k.', at: at2, parentId: 'c1' },
  { id: 'c3', author: tom, body: 'Fine, 8.5k with a review at six months.', at: at2, parentId: 'c2', edited: true },
  { id: 'c4', author: you, body: 'Offer is out.', at: at2 },
]

let live: { add: (c: CommentItem) => void; set: React.Dispatch<React.SetStateAction<CommentItem[]>> }

/** A thread whose comments are state, as an app keeps them. */
function Live({ initial = seed(), ...props }: Omit<CommentsThreadProps, 'comments' | 'currentUser'> & { initial?: CommentItem[] }) {
  const [comments, setComments] = React.useState(initial)
  live = { add: (c) => setComments((cs) => [...cs, c]), set: setComments }
  return <CommentsThread comments={comments} currentUser={you} {...props} />
}

function deferred() {
  let resolve!: () => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const articleOf = (text: string) => screen.getByText(text).closest('article')!
const field = (name = 'Comment') => screen.getByRole('textbox', { name }) as HTMLTextAreaElement

afterEach(async () => {
  vi.useRealTimers()
  act(() => toast.dismiss())
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
})

describe('CommentsThread', () => {
  it('lists threads with replies one level deep, each comment an article named by author and full date', () => {
    renderWithSatin(<Live onReply={() => {}} />)
    const list = screen.getByRole('list', { name: 'Comments' })
    const threads = within(list).getAllByRole('listitem').filter((li) => li.parentElement === list)
    expect(threads).toHaveLength(2)
    const root = screen.getByRole('article', { name: `Comment by Tom Okafor, ${full(at1)}` })
    expect(root.getAttribute('tabindex')).toBe('-1')
    // c3 replies to c2, a reply: it joins c1's replies.
    const replies = threads[0]!.querySelector('[data-slot="comment-replies"]')!
    expect(within(replies as HTMLElement).getAllByRole('article')).toHaveLength(2)
    expect(within(replies as HTMLElement).getByText('Fine, 8.5k with a review at six months.')).toBeTruthy()
    expect(within(articleOf('Fine, 8.5k with a review at six months.')).getByText('(edited)')).toBeTruthy()
    expect(root.querySelector('time')!.getAttribute('datetime')).toBe(at1.toISOString())
    // Reply only on roots.
    expect(screen.getAllByRole('button', { name: /^Reply to/ }).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Reply to Tom Okafor',
      'Reply to Marta Nowak',
    ])
    // Comments there at first don't fade in.
    expect(root.hasAttribute('data-enter')).toBe(false)
  })

  it('makes an orphaned reply a root', () => {
    renderWithSatin(<CommentsThread currentUser={you} comments={[{ id: 'x', author: tom, body: 'Lost', at: at1, parentId: 'gone' }]} onReply={() => {}} />)
    expect(screen.getByRole('button', { name: 'Reply to Tom Okafor' })).toBeTruthy()
  })

  it('draws mentions only where the body reads them, and keeps line breaks', () => {
    renderWithSatin(
      <CommentsThread
        currentUser={you}
        comments={[
          {
            id: 'm',
            author: tom,
            body: '@Tara Mendes can you confirm?\nThanks',
            at: at1,
            mentions: [
              { id: 'u-tara', label: 'Tara Mendes', start: 0, end: 12 },
              { id: 'u-jon', label: 'Jon Park', start: 13, end: 22 },
            ],
          },
        ]}
      />,
    )
    const mentions = document.querySelectorAll('[data-slot="mention"]')
    expect(Array.from(mentions).map((m) => m.textContent)).toEqual(['@Tara Mendes'])
    expect(mentions[0]!.getAttribute('data-mention-id')).toBe('u-tara')
    expect(document.querySelector('[data-slot="comment-body"]')!.textContent).toBe('@Tara Mendes can you confirm?\nThanks')
  })

  it('sends with Ctrl+Enter and ⌘+Enter, trimmed; Enter alone is a new line', async () => {
    const onReply = vi.fn()
    const { user } = renderWithSatin(<Live onReply={onReply} />)
    await user.click(field())
    await user.keyboard('a{Enter}b')
    expect(field().value).toBe('a\nb')
    expect(onReply).not.toHaveBeenCalled()
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(onReply).toHaveBeenLastCalledWith(null, 'a\nb', [])
    expect(field().value).toBe('')
    await user.keyboard('  hi  {Meta>}{Enter}{/Meta}')
    expect(onReply).toHaveBeenLastCalledWith(null, 'hi', [])
    // Blank: nothing, and Send says it can't.
    await user.keyboard('   {Control>}{Enter}{/Control}')
    expect(onReply).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Send' }).getAttribute('aria-disabled')).toBe('true')
    // A sync handler shows no sending row.
    expect(document.querySelector('[data-state="sending"]')).toBeNull()
  })

  it('sends optimistically: a sending row until the comment arrives, which takes its place without fading again', async () => {
    const d = deferred()
    const { user } = renderWithSatin(<Live onReply={() => d.promise} />)
    await user.type(field(), 'Sending this')
    await user.keyboard('{Control>}{Enter}{/Control}')
    const row = articleOf('Sending this')
    expect(row.getAttribute('data-state')).toBe('sending')
    expect(row.getAttribute('aria-busy')).toBe('true')
    expect(within(row).getByRole('status', { name: 'Sending' })).toBeTruthy()
    expect(row.hasAttribute('data-enter')).toBe(true)
    expect(field().value).toBe('')

    act(() => live.add({ id: 'new', author: you, body: 'Sending this', at: new Date() }))
    await waitFor(() => expect(screen.getAllByText('Sending this')).toHaveLength(1))
    const real = articleOf('Sending this')
    expect(real).toBe(row)
    expect(real.getAttribute('data-comment-id')).toBe('new')
    expect(real.hasAttribute('data-state')).toBe(false)
    await act(async () => d.resolve())
    expect(screen.getAllByText('Sending this')).toHaveLength(1)
  })

  it('keeps a resolved row with no match undimmed until comments change', async () => {
    const d = deferred()
    const { user } = renderWithSatin(<Live onReply={() => d.promise} />)
    await user.type(field(), 'Lonely')
    await user.keyboard('{Control>}{Enter}{/Control}')
    await act(async () => d.resolve())
    expect(articleOf('Lonely').hasAttribute('data-state')).toBe(false)
    act(() => live.add({ id: 'other', author: tom, body: 'Unrelated', at: new Date() }))
    await waitFor(() => expect(screen.queryByText('Lonely')).toBeNull())
    // A comment that arrives after the first paint fades in.
    expect(articleOf('Unrelated').hasAttribute('data-enter')).toBe(true)
  })

  it('leaves a failed send with Not sent; Retry has focus and sends again, Discard returns to the composer', async () => {
    let attempt = deferred()
    const onReply = vi.fn(() => attempt.promise)
    const { user } = renderWithSatin(<Live onReply={onReply} />)
    await user.type(field(), 'Flaky')
    await user.keyboard('{Control>}{Enter}{/Control}')
    await act(async () => attempt.reject(new Error('offline')))
    const row = articleOf('Flaky')
    expect(row.getAttribute('data-state')).toBe('failed')
    const retry = within(row).getByRole('button', { name: 'Retry' })
    expect(document.activeElement).toBe(retry)
    expect(document.getElementById(retry.getAttribute('aria-describedby')!)!.textContent).toBe('Not sent')

    attempt = deferred()
    await user.keyboard('{Enter}')
    expect(onReply).toHaveBeenCalledTimes(2)
    expect(onReply).toHaveBeenLastCalledWith(null, 'Flaky', [])
    expect(articleOf('Flaky').getAttribute('data-state')).toBe('sending')
    expect(document.activeElement).toBe(articleOf('Flaky'))
    await act(async () => attempt.reject(new Error('offline')))

    await user.click(within(articleOf('Flaky')).getByRole('button', { name: 'Discard' }))
    expect(screen.queryByText('Flaky')).toBeNull()
    expect(document.activeElement).toBe(field())
  })

  it('replies under a root; Escape closes the reply composer and returns to Reply', async () => {
    const onReply = vi.fn()
    const { user } = renderWithSatin(<Live onReply={onReply} />)
    await user.click(screen.getByRole('button', { name: 'Reply to Tom Okafor' }))
    const reply = field('Reply to Tom Okafor')
    expect(document.activeElement).toBe(reply)
    await user.keyboard('Agreed{Control>}{Enter}{/Control}')
    expect(onReply).toHaveBeenLastCalledWith('c1', 'Agreed', [])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('textbox', { name: 'Reply to Tom Okafor' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reply to Tom Okafor' }))
  })

  it('edits in place: Save, Cancel and Escape, optimistic until the body changes', async () => {
    const d = deferred()
    const onEdit = vi.fn(() => d.promise)
    const { user } = renderWithSatin(<Live onEdit={onEdit} />)
    await user.click(within(articleOf('Offer is out.')).getByRole('button', { name: 'Edit' }))
    const editor = field('Edit comment')
    expect(editor.value).toBe('Offer is out.')
    await waitFor(() => expect(document.activeElement).toBe(editor))

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('textbox', { name: 'Edit comment' })).toBeNull()
    // Edit comes back after the editor; focus lands on it.
    const editOf = () => within(articleOf('Offer is out.')).getByRole('button', { name: 'Edit' })
    await waitFor(() => expect(document.activeElement).toBe(editOf()))

    await user.click(editOf())
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('textbox', { name: 'Edit comment' })).toBeNull()

    await user.click(editOf())
    await user.type(field('Edit comment'), ' Signed.')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onEdit).toHaveBeenCalledWith('c4', 'Offer is out. Signed.', [])
    const edited = articleOf('Offer is out. Signed.')
    expect(within(edited).getByText('(edited)')).toBeTruthy()
    expect(document.activeElement).toBe(edited)

    // The app saves: its body takes over.
    act(() => live.set((cs) => cs.map((c) => (c.id === 'c4' ? { ...c, body: 'Offer is out. Signed!', edited: true } : c))))
    expect(screen.getByText('Offer is out. Signed!')).toBeTruthy()
  })

  it('puts the old text back and reopens the editor with an error when the edit fails', async () => {
    const { user } = renderWithSatin(<Live onEdit={() => Promise.reject(new Error('offline'))} />)
    await user.click(within(articleOf('Offer is out.')).getByRole('button', { name: 'Edit' }))
    await user.clear(field('Edit comment'))
    await user.type(field('Edit comment'), 'Changed')
    await user.keyboard('{Control>}{Enter}{/Control}')
    const editor = await screen.findByRole('textbox', { name: 'Edit comment' })
    expect((editor as HTMLTextAreaElement).value).toBe('Changed')
    expect(editor.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Couldn’t save the comment. Try again.')).toBeTruthy()
    expect(screen.queryByText('Changed', { selector: 'p' })).toBeNull()
  })

  it('says (me) after your own name only', () => {
    renderWithSatin(<CommentsThread comments={seed()} currentUser={you} />, { labels: { commentsMe: '(ja)' } })
    expect(within(articleOf('Offer is out.')).getByText('(ja)')).toBeTruthy()
    expect(within(articleOf('Tara asked for 9k. Can we go there?')).queryByText('(ja)')).toBeNull()
  })

  it('names itself with title and counts the comments next to it', () => {
    const comments = seed()
    renderWithSatin(<CommentsThread comments={comments} currentUser={you} title="Comments" variant="card" />, {
      labels: { commentsCount: (n: number) => `${n} komentarzy` },
    })
    const region = screen.getByRole('region', { name: 'Comments' })
    expect(region.getAttribute('data-variant')).toBe('card')
    expect(screen.getByRole('heading', { level: 3, name: 'Comments' })).toBeTruthy()
    expect(within(region).getByText(`${comments.length} komentarzy`)).toBeTruthy()
  })

  it('offers Edit and Delete on your own comments only, Delete on anyone’s for a moderator', async () => {
    const { user, rerender } = renderWithSatin(<CommentsThread comments={seed()} currentUser={you} onEdit={() => {}} onDelete={() => {}} />)
    expect(within(articleOf('Tara asked for 9k. Can we go there?')).queryByRole('button', { name: /Actions/ })).toBeNull()
    expect(within(articleOf('Tara asked for 9k. Can we go there?')).queryByRole('button', { name: 'Edit' })).toBeNull()
    // Edit sits next to Reply on your own comment; the menu keeps Delete.
    expect(within(articleOf('Offer is out.')).getByRole('button', { name: 'Edit' })).toBeTruthy()
    await user.click(within(articleOf('Offer is out.')).getByRole('button', { name: 'Actions for comment by Marta Nowak' }))
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Delete'])
    await user.keyboard('{Escape}')

    rerender(<CommentsThread comments={seed()} currentUser={you} onEdit={() => {}} onDelete={() => {}} moderator />)
    await user.click(within(articleOf('Tara asked for 9k. Can we go there?')).getByRole('button', { name: 'Actions for comment by Tom Okafor' }))
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Delete'])
  })

  it('deletes at once with an Undo toast; Undo brings the comment back with focus', async () => {
    const onDelete = vi.fn()
    const { user } = renderWithSatin(
      <>
        <Live onDelete={onDelete} onReply={() => {}} />
        <Toaster />
      </>,
    )
    await user.click(within(articleOf('Budget tops at 8.5k.')).getByRole('button', { name: /Actions/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(screen.queryByText('Budget tops at 8.5k.')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(articleOf('Fine, 8.5k with a review at six months.')))
    expect(screen.getByText('Comment deleted')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onDelete).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(articleOf('Budget tops at 8.5k.')))
  })

  it('takes a root’s replies with it and moves focus to the composer when nothing follows', async () => {
    const { user } = renderWithSatin(
      <>
        <Live onDelete={() => {}} onReply={() => {}} moderator />
        <Toaster />
      </>,
    )
    await user.click(within(articleOf('Tara asked for 9k. Can we go there?')).getByRole('button', { name: /Actions/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(screen.queryByText('Budget tops at 8.5k.')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(articleOf('Offer is out.')))

    await user.click(within(articleOf('Offer is out.')).getByRole('button', { name: /Actions/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    await waitFor(() => expect(document.activeElement).toBe(field()))
    expect(screen.getByText('No comments yet')).toBeTruthy()
  })

  it('calls onDelete when the toast runs out', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    renderWithSatin(
      <>
        <Live onDelete={onDelete} />
        <Toaster />
      </>,
    )
    const trigger = within(articleOf('Offer is out.')).getByRole('button', { name: /Actions/ })
    act(() => void fireEvent.keyDown(trigger, { key: 'Enter' }))
    act(() => void fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' })))
    expect(screen.queryByText('Offer is out.')).toBeNull()
    act(() => void vi.advanceTimersByTime(4000))
    expect(onDelete).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(2000))
    expect(onDelete).toHaveBeenCalledExactlyOnceWith('c4')
  })

  it('deletes at once when it unmounts inside the Undo window', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    const { rerender } = renderWithSatin(
      <>
        <Live onDelete={onDelete} />
        <Toaster />
      </>,
    )
    const trigger = within(articleOf('Offer is out.')).getByRole('button', { name: /Actions/ })
    act(() => void fireEvent.keyDown(trigger, { key: 'Enter' }))
    act(() => void fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' })))
    rerender(<Toaster />)
    expect(onDelete).toHaveBeenCalledExactlyOnceWith('c4')
    act(() => void vi.advanceTimersByTime(10_000))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('brings the comment back with an error toast when onDelete fails', async () => {
    vi.useFakeTimers()
    renderWithSatin(
      <>
        <Live onDelete={() => Promise.reject(new Error('offline'))} />
        <Toaster />
      </>,
    )
    const trigger = within(articleOf('Offer is out.')).getByRole('button', { name: /Actions/ })
    act(() => void fireEvent.keyDown(trigger, { key: 'Enter' }))
    act(() => void fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' })))
    await act(async () => void (await vi.advanceTimersByTimeAsync(6000)))
    expect(screen.getByText('Offer is out.')).toBeTruthy()
    expect(screen.getByText('Couldn’t delete the comment')).toBeTruthy()
  })

  it('reads only when disabled: no composer, menu or Reply', () => {
    renderWithSatin(<CommentsThread comments={seed()} currentUser={you} onReply={() => {}} onEdit={() => {}} onDelete={() => {}} disabled />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /Actions|Reply/ })).toBeNull()
    expect(screen.getByRole('list', { name: 'Comments' })).toBeTruthy()
  })

  it('keeps the formatting toolbar and Send inside the field, and focuses the text from its empty space', async () => {
    const { user } = renderWithSatin(<Live onReply={() => {}} />)
    const box = field().closest<HTMLElement>('[data-slot="comment-composer-field"]')!
    expect(box.classList.contains('satin-field')).toBe(true)
    expect(within(box).getByRole('toolbar', { name: 'Formatting' })).toBeTruthy()
    expect(within(box).getByRole('button', { name: 'Send' })).toBeTruthy()
    expect(document.activeElement).not.toBe(field())
    await user.click(box.querySelector<HTMLElement>('[data-slot="comment-composer-actions"]')!)
    expect(document.activeElement).toBe(field())
  })

  it('marks the whole field invalid and puts the error under it, describing the text', () => {
    renderWithSatin(<CommentComposer onSubmit={() => {}} error="Too long" />)
    const text = screen.getByRole('textbox', { name: 'Comment' })
    const box = text.closest<HTMLElement>('[data-slot="comment-composer-field"]')!
    expect(box.hasAttribute('data-invalid')).toBe(true)
    expect(text.getAttribute('aria-invalid')).toBe('true')
    const message = screen.getByText('Too long')
    expect(box.contains(message)).toBe(false)
    expect(text.getAttribute('aria-describedby')?.split(' ')).toContain(message.id)
  })

  it('shows the empty state with the composer, or `empty`', () => {
    const { rerender } = renderWithSatin(<CommentsThread comments={[]} currentUser={you} onReply={() => {}} />)
    expect(screen.getByText('No comments yet')).toBeTruthy()
    expect(field()).toBeTruthy()
    rerender(<CommentsThread comments={[]} currentUser={you} onReply={() => {}} empty={<p>Nothing on Tara yet</p>} />)
    expect(screen.getByText('Nothing on Tara yet')).toBeTruthy()
    expect(screen.queryByText('No comments yet')).toBeNull()
  })

  it('opens the mentions menu on @ and sends the mentions with the body', async () => {
    const onReply = vi.fn()
    const search = vi.fn((q: string) => [tara, tom].filter((p) => p.name.toLowerCase().includes(q.toLowerCase())))
    const { user } = renderWithSatin(<Live onReply={onReply} mentions={{ search }} />)
    await user.click(field())
    await user.keyboard('@ta')
    expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeTruthy()
    expect(search).toHaveBeenLastCalledWith('ta')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['TMTara Mendes'])
    await user.keyboard('{Enter}')
    expect(field().value).toBe('@Tara Mendes ')
    await user.keyboard('please confirm{Control>}{Enter}{/Control}')
    expect(onReply).toHaveBeenLastCalledWith(null, '@Tara Mendes please confirm', [{ id: 'u-tara', label: 'Tara Mendes', start: 0, end: 12 }])
  })

  it('takes its words from SatinLabels', () => {
    renderWithSatin(<Live onReply={() => {}} />, {
      labels: {
        comments: 'Komentarze',
        commentsReply: 'Odpowiedz',
        commentsReplyTo: (name) => `Odpowiedz: ${name}`,
        commentsField: 'Komentarz',
        commentsEdited: '(edytowany)',
        commentBy: (name, date) => `Komentarz: ${name}, ${date}`,
        send: 'Wyślij',
      },
    })
    expect(screen.getByRole('list', { name: 'Komentarze' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Odpowiedz: Tom Okafor' }).textContent).toBe('Odpowiedz')
    expect(screen.getByRole('textbox', { name: 'Komentarz' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Wyślij' })).toBeTruthy()
    expect(screen.getByText('(edytowany)')).toBeTruthy()
    expect(screen.getByRole('article', { name: `Komentarz: Tom Okafor, ${full(at1)}` })).toBeTruthy()
  })

  it('keeps a sent row through a re-render with the same comments in a new array', async () => {
    const d = deferred()
    const { user } = renderWithSatin(<Live onReply={() => d.promise} />)
    await user.type(field(), 'Survives')
    await user.keyboard('{Control>}{Enter}{/Control}')
    const row = articleOf('Survives')
    await act(async () => d.resolve())
    // The parent maps its data again (a query's isPending flips): same comments, new objects.
    act(() => live.set((cs) => cs.map((c) => ({ ...c }))))
    expect(articleOf('Survives')).toBe(row)
    act(() => live.add({ id: 'saved', author: you, body: 'Survives', at: new Date() }))
    await waitFor(() => expect(screen.getAllByText('Survives')).toHaveLength(1))
    expect(articleOf('Survives')).toBe(row)
    expect(row.getAttribute('data-comment-id')).toBe('saved')
  })

  it('drops a sending row whose comment came first with a body the server rewrote', async () => {
    const d = deferred()
    const { user } = renderWithSatin(<Live onReply={() => d.promise} />)
    await user.type(field(), 'Two{Enter}lines')
    await user.keyboard('{Control>}{Enter}{/Control}')
    // A realtime push, before the promise resolves, with CRLF and a trailing space.
    act(() => live.add({ id: 'pushed', author: you, body: 'Two\r\nlines ', at: new Date() }))
    await act(async () => d.resolve())
    expect(document.querySelectorAll('[data-slot="comment"][data-comment-id="pushed"]')).toHaveLength(1)
    expect(document.querySelector('[data-comment-id^="comment-pending"]')).toBeNull()
    act(() => live.set((cs) => [...cs]))
    expect(document.querySelector('[data-comment-id^="comment-pending"]')).toBeNull()
  })

  it('reconciles two identical sends one to one', async () => {
    const sends = [deferred(), deferred()]
    const queue = [...sends]
    const { user } = renderWithSatin(<Live onReply={() => queue.shift()!.promise} />)
    await user.type(field(), 'Same')
    await user.keyboard('{Control>}{Enter}{/Control}')
    await user.type(field(), 'Same')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(screen.getAllByText('Same')).toHaveLength(2)
    act(() => live.add({ id: 's1', author: you, body: 'Same', at: new Date() }))
    expect(screen.getAllByText('Same')).toHaveLength(2)
    expect(document.querySelectorAll('[data-state="sending"]')).toHaveLength(1)
    act(() => live.add({ id: 's2', author: you, body: 'Same', at: new Date() }))
    expect(screen.getAllByText('Same')).toHaveLength(2)
    expect(document.querySelectorAll('[data-state="sending"]')).toHaveLength(0)
    await act(async () => sends.forEach((d) => d.resolve()))
    expect(Array.from(document.querySelectorAll('[data-slot="comment"]'), (el) => el.getAttribute('data-comment-id')).slice(-2)).toEqual(['s1', 's2'])
  })

  it('keeps a deleted root’s replies hidden once the app removes only the root', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    renderWithSatin(
      <>
        <Live onDelete={onDelete} onReply={() => {}} moderator />
        <Toaster />
      </>,
    )
    const trigger = within(articleOf('Tara asked for 9k. Can we go there?')).getByRole('button', { name: /Actions/ })
    act(() => void fireEvent.keyDown(trigger, { key: 'Enter' }))
    act(() => void fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' })))
    act(() => void vi.advanceTimersByTime(6000))
    expect(onDelete).toHaveBeenCalledExactlyOnceWith('c1')
    act(() => live.set((cs) => cs.filter((c) => c.id !== 'c1')))
    expect(screen.queryByText('Budget tops at 8.5k.')).toBeNull()
    expect(screen.queryByText('Fine, 8.5k with a review at six months.')).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Reply to/ }).map((b) => b.getAttribute('aria-label'))).toEqual(['Reply to Marta Nowak'])
  })

  it('keeps another open editor when an edit fails, and says so in a toast', async () => {
    const d = deferred()
    const { user } = renderWithSatin(
      <>
        <Live onEdit={() => d.promise} />
        <Toaster />
      </>,
    )
    await user.click(within(articleOf('Offer is out.')).getByRole('button', { name: 'Edit' }))
    await user.clear(field('Edit comment'))
    await user.type(field('Edit comment'), 'Changed')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(screen.getByText('Changed')).toBeTruthy()

    await user.click(within(articleOf('Budget tops at 8.5k.')).getByRole('button', { name: 'Edit' }))
    await user.type(field('Edit comment'), ' Firm.')
    await act(async () => d.reject(new Error('offline')))
    const editor = field('Edit comment')
    expect(editor.value).toBe('Budget tops at 8.5k. Firm.')
    expect(editor.closest('article')!.getAttribute('data-comment-id')).toBe('c2')
    expect(editor.getAttribute('aria-invalid')).toBeNull()
    expect(screen.getByText('Offer is out.')).toBeTruthy()
    expect(await screen.findByText('Couldn’t save the comment. Try again.')).toBeTruthy()
  })

  it('plays the entry once, so showing the comments again doesn’t replay it', () => {
    renderWithSatin(<Live onReply={() => {}} />)
    act(() => live.add({ id: 'late', author: tom, body: 'Late', at: new Date() }))
    const late = articleOf('Late')
    expect(late.hasAttribute('data-enter')).toBe(true)
    // React listens for the prefixed name where the DOM (jsdom here) has no AnimationEvent.
    fireEvent(late, new Event('AnimationEvent' in window ? 'animationend' : 'webkitAnimationEnd', { bubbles: true }))
    expect(late.hasAttribute('data-enter')).toBe(false)
  })

  it('says Cancel and Sending with Free’s words', async () => {
    const { user } = renderWithSatin(<Live onReply={() => new Promise(() => {})} />, { labels: { cancel: 'Anuluj', sending: 'Wysyłanie' } })
    await user.click(screen.getByRole('button', { name: 'Reply to Tom Okafor' }))
    expect(screen.getByRole('button', { name: 'Anuluj' })).toBeTruthy()
    await user.keyboard('Tak{Control>}{Enter}{/Control}')
    expect(screen.getByRole('status', { name: 'Wysyłanie' })).toBeTruthy()
  })

  it('deletes at once on pagehide; the toast closing later does nothing', () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    renderWithSatin(
      <>
        <Live onDelete={onDelete} />
        <Toaster />
      </>,
    )
    const trigger = within(articleOf('Offer is out.')).getByRole('button', { name: /Actions/ })
    act(() => void fireEvent.keyDown(trigger, { key: 'Enter' }))
    act(() => void fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' })))
    act(() => void window.dispatchEvent(new Event('pagehide')))
    expect(onDelete).toHaveBeenCalledExactlyOnceWith('c4')
    act(() => void vi.advanceTimersByTime(10_000))
    expect(onDelete).toHaveBeenCalledOnce()
    expect(screen.queryByText('Offer is out.')).toBeNull()
  })

  it('commits a delete on the next microtask when no Toaster is mounted', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onDelete = vi.fn()
    const { user } = renderWithSatin(<Live onDelete={onDelete} />)
    await user.click(within(articleOf('Offer is out.')).getByRole('button', { name: /Actions/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    await act(async () => {})
    expect(onDelete).toHaveBeenCalledExactlyOnceWith('c4')
    expect(screen.queryByText('Offer is out.')).toBeNull()
    warn.mockRestore()
  })

  it('puts a reply to a reply under its root when it’s listed before the root', () => {
    renderWithSatin(
      <CommentsThread
        currentUser={you}
        onReply={() => {}}
        comments={[
          { id: 'r2', author: tom, body: 'Deep', at: at2, parentId: 'r1' },
          { id: 'r1', author: you, body: 'Mid', at: at2, parentId: 'r0' },
          { id: 'r0', author: tara, body: 'Top', at: at1 },
        ]}
      />,
    )
    const list = screen.getByRole('list', { name: 'Comments' })
    const threads = within(list).getAllByRole('listitem').filter((li) => li.parentElement === list)
    expect(threads).toHaveLength(1)
    const replies = threads[0]!.querySelector<HTMLElement>('[data-slot="comment-replies"]')!
    expect(within(replies).getByText('Deep')).toBeTruthy()
    expect(within(replies).getByText('Mid')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Reply to/ }).map((b) => b.getAttribute('aria-label'))).toEqual(['Reply to Tara Mendes'])
  })

  it('moves mentions with the leading whitespace it trims', async () => {
    const onReply = vi.fn()
    const { user } = renderWithSatin(<Live onReply={onReply} mentions={{ search: () => [tara] }} />)
    await user.click(field())
    await user.keyboard('  @ta')
    await user.keyboard('{Enter}')
    await user.keyboard('ok{Control>}{Enter}{/Control}')
    expect(onReply).toHaveBeenLastCalledWith(null, '@Tara Mendes ok', [{ id: 'u-tara', label: 'Tara Mendes', start: 0, end: 12 }])
  })

  it('shows a mention’s avatar and full name in a tooltip on focus', async () => {
    renderWithSatin(
      <CommentsThread
        currentUser={you}
        comments={[
          { id: 't', author: tara, body: 'Here.', at: at1 },
          { id: 'm', author: tom, body: 'Ask @Tara Mendes', at: at2, mentions: [{ id: 'u-tara', label: 'Tara Mendes', start: 4, end: 16 }] },
        ]}
      />,
    )
    const mention = document.querySelector<HTMLElement>('[data-slot="mention"]')!
    expect(mention.getAttribute('tabindex')).toBe('0')
    act(() => mention.focus())
    const tip = await screen.findByRole('tooltip')
    // The initials are hidden from screen readers; the name is what the tooltip says.
    expect(tip.textContent).toBe('TMTara Mendes')
  })

  it('formats the selection from the toolbar and with shortcuts, through the composer’s value', async () => {
    const onReply = vi.fn()
    const { user } = renderWithSatin(<Live onReply={onReply} />)
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' })
    expect(within(toolbar).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Bold', 'Italic', 'Code', 'Bulleted list', 'Link'])
    await user.type(field(), 'make this bold')
    act(() => field().setSelectionRange(10, 14))
    await user.click(within(toolbar).getByRole('button', { name: 'Bold' }))
    expect(field().value).toBe('make this **bold**')
    expect([field().selectionStart, field().selectionEnd]).toEqual([12, 16])
    expect(document.activeElement).toBe(field())
    act(() => field().setSelectionRange(0, 4))
    await user.keyboard('{Control>}i{/Control}')
    expect(field().value).toBe('_make_ this **bold**')
    act(() => field().setSelectionRange(1, 5))
    await user.keyboard('{Control>}e{/Control}')
    expect(field().value).toBe('_`make`_ this **bold**')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(onReply).toHaveBeenLastCalledWith(null, '_`make`_ this **bold**', [])
  })

  it('makes lines a list and back, and wraps a link with its address selected', async () => {
    const { user } = renderWithSatin(<Live onReply={() => {}} />)
    await user.type(field(), 'a{Enter}b')
    act(() => field().setSelectionRange(0, 3))
    await user.click(screen.getByRole('button', { name: 'Bulleted list' }))
    expect(field().value).toBe('- a\n- b')
    act(() => field().setSelectionRange(2, 7))
    await user.click(screen.getByRole('button', { name: 'Bulleted list' }))
    expect(field().value).toBe('a\nb')
    act(() => field().setSelectionRange(2, 3))
    await user.keyboard('{Control>}k{/Control}')
    expect(field().value).toBe('a\n[b](url)')
    expect(field().value.slice(field().selectionStart, field().selectionEnd)).toBe('url')
  })

  it('takes a mark off when it is pressed again', async () => {
    const { user } = renderWithSatin(<Live onReply={() => {}} />)
    await user.click(field())
    await user.keyboard('Signed today')
    act(() => field().setSelectionRange(7, 12))
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(field().value).toBe('Signed **today**')
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(field().value).toBe('Signed today')
    expect(field().value.slice(field().selectionStart, field().selectionEnd)).toBe('today')
    // A selection that holds the marks too.
    act(() => field().setSelectionRange(7, 12))
    await user.keyboard('{Control>}i{/Control}')
    act(() => field().setSelectionRange(7, 14))
    await user.keyboard('{Control>}i{/Control}')
    expect(field().value).toBe('Signed today')
  })

  it('takes off only marks the body reads as a pair', async () => {
    const { user } = renderWithSatin(<Live onReply={() => {}} />)
    await user.click(field())
    await user.keyboard('snake_case_name')
    act(() => field().setSelectionRange(6, 10))
    await user.keyboard('{Control>}i{/Control}')
    // The underscores inside the word were never italic: the selection is wrapped, not unwrapped.
    expect(field().value).toBe('snake__case__name')
    act(() => fireEvent.change(field(), { target: { value: '**a** b **c**' } }))
    act(() => field().setSelectionRange(5, 8))
    await user.keyboard('{Control>}b{/Control}')
    expect(field().value).toBe('**a** **b** **c**')
    expect(field().value.slice(field().selectionStart, field().selectionEnd)).toBe('b')
  })

  it('trims the selection and marks each line on its own, and takes them all off again', async () => {
    const { user } = renderWithSatin(<Live onReply={() => {}} />)
    await user.click(field())
    await user.keyboard('say hi there')
    act(() => field().setSelectionRange(3, 7))
    await user.keyboard('{Control>}b{/Control}')
    expect(field().value).toBe('say **hi** there')
    expect(field().value.slice(field().selectionStart, field().selectionEnd)).toBe('hi')
    act(() => fireEvent.change(field(), { target: { value: 'one\n\n two \n' } }))
    act(() => field().setSelectionRange(0, 11))
    await user.keyboard('{Control>}i{/Control}')
    expect(field().value).toBe('_one_\n\n _two_ \n')
    expect(field().value.slice(field().selectionStart, field().selectionEnd)).toBe('one_\n\n _two')
    act(() => field().setSelectionRange(0, 15))
    await user.keyboard('{Control>}i{/Control}')
    expect(field().value).toBe('one\n\n two \n')
    expect(field().value.slice(field().selectionStart, field().selectionEnd)).toBe('one\n\n two')
  })

  it('takes a mark off through other marks round the selection', async () => {
    const { user } = renderWithSatin(<Live onReply={() => {}} />)
    await user.click(field())
    act(() => fireEvent.change(field(), { target: { value: 'go **_`x`_** now' } }))
    act(() => field().setSelectionRange(7, 8))
    await user.keyboard('{Control>}b{/Control}')
    expect(field().value).toBe('go _`x`_ now')
    expect(field().value.slice(field().selectionStart, field().selectionEnd)).toBe('x')
    await user.keyboard('{Control>}i{/Control}')
    expect(field().value).toBe('go `x` now')
    expect(field().value.slice(field().selectionStart, field().selectionEnd)).toBe('x')
  })

  it('leaves the selection where it is when the browser takes only part of a format', async () => {
    const { user } = renderWithSatin(<Live onReply={() => {}} />)
    await user.click(field())
    await user.keyboard('Signed today')
    let calls = 0
    const exec = vi.fn((_command: string, _ui?: boolean, insert?: string) => {
      if (calls++ > 0) return false
      const el = field()
      el.setRangeText(insert ?? '', el.selectionStart, el.selectionEnd, 'end')
      el.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    })
    const had = Object.getOwnPropertyDescriptor(document, 'execCommand')
    Object.defineProperty(document, 'execCommand', { configurable: true, value: exec })
    try {
      act(() => field().setSelectionRange(7, 12))
      await user.keyboard('{Control>}b{/Control}')
    } finally {
      if (had) Object.defineProperty(document, 'execCommand', had)
      else delete (document as { execCommand?: unknown }).execCommand
    }
    expect(exec).toHaveBeenCalledTimes(2)
    expect(field().value).toBe('Signed today**')
    // Not the [9, 14] the whole format would have selected.
    expect([field().selectionStart, field().selectionEnd]).toEqual([7, 7])
  })

  it('keeps ⌘/Ctrl+B, I, E and K for the mentions menu while it is open', async () => {
    const { user } = renderWithSatin(<Live onReply={() => {}} mentions={{ search: () => [tara] }} />)
    await user.click(field())
    await user.keyboard('@ta')
    expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeTruthy()
    for (const key of ['b', 'i', 'e', 'k']) await user.keyboard(`{Control>}${key}{/Control}`)
    expect(field().value).toBe('@ta')
    expect(screen.getByRole('listbox', { name: 'Mentions' })).toBeTruthy()
  })

  it('never splits a mention: a selection cutting into one takes all of it, and the mention moves', async () => {
    const onReply = vi.fn()
    const { user } = renderWithSatin(<Live onReply={onReply} mentions={{ search: () => [tara] }} />)
    await user.click(field())
    await user.keyboard('@ta{Enter}hi')
    act(() => field().setSelectionRange(3, 5))
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(field().value).toBe('**@Tara Mendes** hi')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(onReply).toHaveBeenLastCalledWith(null, '**@Tara Mendes** hi', [{ id: 'u-tara', label: 'Tara Mendes', start: 2, end: 14 }])
  })

  it('renders markdown-lite bodies, mentions inside marks, and never an unsafe link', () => {
    renderWithSatin(
      <CommentsThread
        currentUser={you}
        comments={[
          {
            id: 'md',
            author: tom,
            body: '**Ask @Tara Mendes** about _it_, `snake_case` and ~~old~~.\nSee [docs](https://example.com) or [this](javascript:evil).\n- one\n* two',
            at: at1,
            mentions: [{ id: 'u-tara', label: 'Tara Mendes', start: 6, end: 18 }],
          },
        ]}
      />,
    )
    const body = document.querySelector('[data-slot="comment-body"]')!
    const strong = body.querySelector('strong')!
    expect(strong.textContent).toBe('Ask @Tara Mendes')
    expect(strong.querySelector('[data-slot="mention"]')!.getAttribute('data-mention-id')).toBe('u-tara')
    expect(body.querySelector('em')!.textContent).toBe('it')
    expect(body.querySelector('code')!.textContent).toBe('snake_case')
    expect(body.querySelector('s')!.textContent).toBe('old')
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('href')).toBe('https://example.com')
    expect(screen.queryByRole('link', { name: 'this' })).toBeNull()
    expect(body.textContent).toContain('or this.')
    expect(body.querySelector('[href^="javascript"]')).toBeNull()
    const items = within(body.querySelector('ul')!).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['one', 'two'])
    expect(body.querySelectorAll('p')).toHaveLength(1)
  })

  it('reads mentions in a link as text, and in its address as written', () => {
    renderWithSatin(
      <CommentsThread
        currentUser={you}
        comments={[
          {
            id: 'ln',
            author: tom,
            body: '[ask **@Tara Mendes**](https://example.com) or [page](https://example.com/@Tom)',
            at: at1,
            mentions: [
              { id: 'u-tara', label: 'Tara Mendes', start: 7, end: 19 },
              { id: 'u-tom', label: 'Tom', start: 74, end: 78 },
            ],
          },
        ]}
      />,
    )
    const ask = screen.getByRole('link', { name: 'ask @Tara Mendes' })
    expect(ask.querySelector('[data-slot="mention"]')).toBeNull()
    expect(ask.querySelector('strong')!.textContent).toBe('@Tara Mendes')
    expect(screen.getByRole('link', { name: 'page' }).getAttribute('href')).toBe('https://example.com/@Tom')
  })

  it('marks an agent’s comment: the agent mark and an Agent badge, no Edit', () => {
    const agent: CommentAuthor = { id: 'a-hire', name: 'Hiring assistant', kind: 'agent' }
    renderWithSatin(<CommentsThread currentUser={you} comments={[{ id: 'a', author: agent, body: 'Band B fits.', at: at1 }]} onReply={() => {}} onEdit={() => {}} />)
    const article = screen.getByRole('article', { name: `Comment by Hiring assistant, ${full(at1)}` })
    expect(within(article).getByText('Agent')).toBeTruthy()
    expect(article.querySelector('[data-slot="comment-agent-avatar"] .satin-tetris')).toBeTruthy()
    expect(within(article).queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(within(article).getByRole('button', { name: 'Reply to Hiring assistant' })).toBeTruthy()
  })

  it('draws Reply and Edit with icons, keeping their names', () => {
    renderWithSatin(<Live onReply={() => {}} onEdit={() => {}} />)
    const reply = screen.getByRole('button', { name: 'Reply to Tom Okafor' })
    expect(reply.querySelector('svg')).toBeTruthy()
    expect(reply.textContent).toBe('Reply')
    const edit = screen.getAllByRole('button', { name: 'Edit' })[0]!
    expect(edit.querySelector('svg')).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    const { user } = renderWithSatin(
      <>
        <Live onReply={() => Promise.reject(new Error('offline'))} onEdit={() => {}} onDelete={() => {}} mentions={{ search: () => [tara] }} />
        <Toaster />
      </>,
      { theme },
    )
    await user.type(field(), 'Will fail')
    await user.keyboard('{Control>}{Enter}{/Control}')
    await screen.findByRole('button', { name: 'Retry' })
    await user.click(screen.getByRole('button', { name: 'Reply to Tom Okafor' }))
    await expectNoAxeViolations()
  })
})
