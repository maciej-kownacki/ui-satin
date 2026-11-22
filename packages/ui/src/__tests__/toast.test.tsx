import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Toaster, toast, type ToastOptions } from '../components/toast'

// toast() keeps one store for the page; empty it between tests.
afterEach(async () => {
  act(() => toast.dismiss())
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
})

describe('Toast', () => {
  it('shows what toast() says, with its action', async () => {
    const onUndo = vi.fn()
    renderWithSatin(<Toaster />)
    act(() => {
      toast.success('Deal moved', { description: 'Acme is in Negotiation.', action: { label: 'Undo', onClick: onUndo } })
    })
    expect(screen.getByText('Deal moved')).toBeTruthy()
    expect(screen.getByText('Acme is in Negotiation.')).toBeTruthy()
    screen.getByRole('button', { name: 'Undo' }).click()
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('shows details under the row', async () => {
    renderWithSatin(<Toaster />)
    act(() => {
      toast('3 files uploaded', { details: <ul aria-label="Files"><li>a.pdf</li></ul> })
    })
    expect(screen.getByRole('list', { name: 'Files' }).closest('[data-slot="toast-details"]')).toBeTruthy()
  })

  it('takes the action word from the labels when given a function', async () => {
    renderWithSatin(<Toaster />, { labels: { cancel: 'Anuluj' } })
    act(() => {
      toast('Upload started', { action: { label: (labels) => labels.cancel } })
    })
    expect(screen.getByRole('button', { name: 'Anuluj' })).toBeTruthy()
  })

  it('takes F8 to the toasts, and Enter on Close closes it', async () => {
    const { user } = renderWithSatin(<Toaster />, { labels: { close: 'Zamknij', notifications: 'Powiadomienia' } })
    act(() => {
      toast('Saved', { duration: Infinity })
    })
    await user.keyboard('[F8]')
    expect(screen.getByRole('region', { name: /Powiadomienia/ }).contains(document.activeElement)).toBe(true)
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Zamknij' }))
    await user.keyboard('{Enter}')
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
    expect(screen.queryByText('Saved')).toBeNull()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Toaster />, { theme })
    act(() => {
      toast.warning('Sync paused', { description: 'Reconnect to carry on.', action: { label: 'Retry' } })
    })
    await expectNoAxeViolations()
  })
})

/* ---------- countdown: on a fake clock, so the timing holds on a busy machine ---------- */

const tick = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })
const bar = () => document.querySelector<HTMLElement>('[data-slot="toast-countdown"]')
/** F8, as Radix listens for it: focus goes to the toasts' region. */
const pressF8 = () => act(() => void fireEvent.keyDown(document, { key: 'F8', code: 'F8' }))

/** The demo's toast: Undo for 400 ms, with its keyboard way for screen readers. */
const rejected = (options: ToastOptions = {}) =>
  toast('Candidate rejected', {
    description: 'Maya Chen · Product designer',
    action: { label: 'Undo', altText: 'Undo with Ctrl+Z' },
    duration: 400,
    countdown: true,
    ...options,
  })

describe('Toast timer and countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    act(() => toast.dismiss())
    tick(600)
    vi.useRealTimers()
  })

  it('closes a toast by itself after its duration', () => {
    renderWithSatin(<Toaster />)
    act(() => {
      toast('Saved', { duration: 200 })
    })
    tick(199)
    expect(screen.getByText('Saved')).toBeTruthy()
    tick(1 + 500)
    expect(screen.queryByText('Saved')).toBeNull()
  })

  it('draws a bar hidden from screen readers that drains over the duration', () => {
    renderWithSatin(<Toaster />)
    act(() => {
      rejected()
    })
    const countdown = bar()
    expect(countdown?.getAttribute('aria-hidden')).toBe('true')
    expect(countdown?.dataset.state).toBe('running')
    expect(countdown?.style.animationDuration).toBe('400ms')
    expect(countdown?.style.animationPlayState).toBe('running')
    expect(countdown?.closest('[data-slot="toast"]')).toBeTruthy()
    // The action still tells screen readers the way to undo without the toast.
    expect(screen.getByRole('button', { name: 'Undo' }).getAttribute('data-radix-toast-announce-alt')).toBe('Undo with Ctrl+Z')
  })

  it('draws nothing without countdown, or with no time to count', () => {
    renderWithSatin(<Toaster />)
    act(() => {
      toast('Saved', { duration: 400 })
      toast('Uploading', { duration: Infinity, countdown: true })
    })
    expect(bar()).toBeNull()
  })

  it('stops with the timer while focus is in the toasts, and goes on from there when it leaves', () => {
    renderWithSatin(
      <>
        <button type="button">Reject</button>
        <Toaster />
      </>,
      { labels: { notifications: 'Powiadomienia' } },
    )
    act(() => {
      rejected()
    })
    tick(100)
    pressF8()
    expect(screen.getByRole('region', { name: /Powiadomienia/ }).contains(document.activeElement)).toBe(true)
    expect(bar()?.dataset.state).toBe('paused')
    expect(bar()?.style.animationPlayState).toBe('paused')
    // Paused well past its whole duration, it's still there.
    tick(5000)
    expect(screen.getByText('Candidate rejected')).toBeTruthy()

    act(() => screen.getByRole('button', { name: 'Reject' }).focus())
    expect(bar()?.dataset.state).toBe('running')
    // It goes on with the 300 ms it had left, no more, no less.
    tick(299)
    expect(bar()?.dataset.state).toBe('running')
    tick(1)
    expect(bar()?.dataset.state).toBe('expired')
    tick(500)
    expect(screen.queryByText('Candidate rejected')).toBeNull()
  })

  it('stops while the pointer is over the toasts', () => {
    renderWithSatin(<Toaster />)
    act(() => {
      rejected()
    })
    const region = screen.getByRole('region').querySelector('ol') as HTMLElement
    act(() => void fireEvent.pointerMove(screen.getByText('Candidate rejected')))
    expect(bar()?.dataset.state).toBe('paused')
    tick(5000)
    expect(screen.getByText('Candidate rejected')).toBeTruthy()
    act(() => void fireEvent.pointerLeave(region))
    expect(bar()?.dataset.state).toBe('running')
    tick(400)
    expect(bar()?.dataset.state).toBe('expired')
  })

  it('stops while the window is in the background', () => {
    renderWithSatin(<Toaster />)
    act(() => {
      rejected()
    })
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(bar()?.dataset.state).toBe('paused')
    tick(5000)
    expect(screen.getByText('Candidate rejected')).toBeTruthy()
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(bar()?.dataset.state).toBe('running')
  })

  it('stops for good when the same toast is updated to Infinity', () => {
    renderWithSatin(<Toaster />)
    act(() => {
      rejected({ id: 'reject-maya' })
    })
    tick(200)
    act(() => {
      rejected({ id: 'reject-maya', duration: Infinity })
    })
    expect(bar()).toBeNull()
    tick(5000)
    expect(screen.getByText('Candidate rejected')).toBeTruthy()
  })

  it('starts over when the same toast gets a new duration', () => {
    renderWithSatin(<Toaster />)
    act(() => {
      rejected({ id: 'reject-maya' })
    })
    tick(300)
    act(() => {
      rejected({ id: 'reject-maya', duration: 500 })
    })
    expect(bar()?.style.animationDuration).toBe('500ms')
    tick(499)
    expect(bar()?.dataset.state).toBe('running')
    tick(1)
    expect(bar()?.dataset.state).toBe('expired')
  })
})

describe('Toast countdown, by keyboard and on the real clock', () => {
  it('takes Undo with Enter, in the app’s words, and leaves by it', async () => {
    const onUndo = vi.fn()
    const { user } = renderWithSatin(<Toaster />, { labels: { close: 'Zamknij' } })
    act(() => {
      rejected({ duration: 5000, action: { label: 'Undo', altText: 'Undo with Ctrl+Z', onClick: onUndo } })
    })
    expect(screen.getByRole('button', { name: 'Zamknij' })).toBeTruthy()
    await user.keyboard('[F8]')
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo' }))
    await user.keyboard('{Enter}')
    expect(onUndo).toHaveBeenCalledOnce()
    // It left by its action, not by running out: the bar stops where it was.
    expect(bar()?.dataset.state).toBe('paused')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(<Toaster />, { theme })
    act(() => {
      rejected({ duration: 5000 })
    })
    await expectNoAxeViolations()
  })
})

/* ---------- onClose: why it left, once ---------- */

describe('Toast onClose', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    act(() => toast.dismiss())
    tick(600)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('says "action" when its action is taken, once', () => {
    const onClose = vi.fn()
    renderWithSatin(<Toaster />)
    act(() => {
      rejected({ onClose })
    })
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Undo' })))
    expect(onClose).toHaveBeenCalledExactlyOnceWith('action')
    tick(600)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('says "close" for the close button, Escape and toast.dismiss', () => {
    const onClose = vi.fn()
    renderWithSatin(<Toaster />)
    act(() => {
      toast('Saved', { duration: Infinity, onClose })
    })
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Close' })))
    expect(onClose).toHaveBeenCalledExactlyOnceWith('close')
    tick(600)

    const onEscape = vi.fn()
    act(() => {
      toast('Moved', { duration: Infinity, onClose: onEscape })
    })
    const close = screen.getByRole('button', { name: 'Close' })
    act(() => close.focus())
    act(() => void fireEvent.keyDown(close, { key: 'Escape', code: 'Escape' }))
    expect(onEscape).toHaveBeenCalledExactlyOnceWith('close')
    tick(600)

    const onDismiss = vi.fn()
    let id = ''
    act(() => {
      id = toast('Archived', { duration: Infinity, onClose: onDismiss })
    })
    act(() => toast.dismiss(id))
    act(() => toast.dismiss(id))
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('close')
  })

  it('says "expire" when its time runs out', () => {
    const onClose = vi.fn()
    renderWithSatin(<Toaster />)
    act(() => {
      rejected({ onClose })
    })
    tick(399)
    expect(onClose).not.toHaveBeenCalled()
    tick(1)
    expect(onClose).toHaveBeenCalledExactlyOnceWith('expire')
    tick(600)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('tells the toast a new one replaces under the same id that it closed', () => {
    const first = vi.fn()
    const second = vi.fn()
    renderWithSatin(<Toaster />)
    act(() => {
      rejected({ id: 'reject-maya', onClose: first })
    })
    act(() => {
      rejected({ id: 'reject-maya', onClose: second })
    })
    expect(first).toHaveBeenCalledExactlyOnceWith('close')
    expect(second).not.toHaveBeenCalled()
    tick(400)
    expect(second).toHaveBeenCalledExactlyOnceWith('expire')
    expect(first).toHaveBeenCalledOnce()
  })

  it('warns and calls back with "expire" when no Toaster is mounted', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const order: string[] = []
    const onClose = vi.fn(() => order.push('onClose'))
    toast('Comment deleted', { onClose })
    order.push('after toast()')
    expect(onClose).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(onClose).toHaveBeenCalledExactlyOnceWith('expire')
    expect(order).toEqual(['after toast()', 'onClose'])
    expect(warn).toHaveBeenCalledOnce()
    // A Toaster mounted later shows it, but doesn't call back a second time.
    renderWithSatin(<Toaster />)
    act(() => toast.dismiss())
    expect(onClose).toHaveBeenCalledOnce()
  })
})
