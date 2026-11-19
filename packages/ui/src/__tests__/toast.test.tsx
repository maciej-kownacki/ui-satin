import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { Toaster, toast } from '../components/toast'

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
