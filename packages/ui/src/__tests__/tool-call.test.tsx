import { describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { ToolCall, ToolCallContent, ToolCallHeader, ToolCallRoot, ToolCallSection } from '../components/tool-call'

const input = { attendee: 'Tara Mendes', duration: 45 }
const slots = [
  { start: '2026-11-24T09:30', end: '2026-11-24T10:15' },
  { start: '2026-11-25T13:00', end: '2026-11-25T13:45' },
  { start: '2026-11-26T16:00', end: '2026-11-26T16:45' },
]
// 16 lines of JSON, over the default 10.
const output = { slots }

const card = (props: Partial<React.ComponentProps<typeof ToolCall>> = {}) => (
  <ToolCall name="Find slots" target="calendar.findSlots" status="success" input={input} output={output} duration={1240} {...props} />
)

const header = () => screen.getByRole('button', { name: /^Find slots/ })

describe('ToolCall', () => {
  it('names its header after the tool, the target and the status, folded once it succeeds', () => {
    renderWithSatin(card())
    expect(header().getAttribute('aria-expanded')).toBe('false')
    expect(header().textContent).toContain('calendar.findSlots')
    expect(header().textContent).toContain('Done')
    expect(header().textContent).toContain('1.2s')
  })

  it('opens and folds with Enter and Space, and says so', async () => {
    const onOpenChange = vi.fn()
    const { user } = renderWithSatin(card({ onOpenChange }))
    await user.tab()
    expect(document.activeElement).toBe(header())
    await user.keyboard('{Enter}')
    expect(header().getAttribute('aria-expanded')).toBe('true')
    await user.keyboard(' ')
    expect(header().getAttribute('aria-expanded')).toBe('false')
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
  })

  it('controls the body it opens', async () => {
    const { user } = renderWithSatin(card())
    const body = document.getElementById(header().getAttribute('aria-controls')!)!
    expect(body.getAttribute('data-state')).toBe('closed')
    await user.click(header())
    expect(body.getAttribute('data-state')).toBe('open')
    expect(within(body).getByRole('region', { name: 'Find slots Input code' })).toBeTruthy()
    expect(within(body).getByRole('region', { name: 'Find slots Output code' })).toBeTruthy()
  })

  it('opens on a failure, with the error and Retry; Retry hands focus back to the header', async () => {
    const onRetry = vi.fn()
    const { user } = renderWithSatin(card({ status: 'error', output: undefined, duration: undefined, error: 'Calendar didn’t answer in 10 s.', onRetry }))
    expect(header().getAttribute('aria-expanded')).toBe('true')
    expect(header().textContent).toContain('Failed')
    expect(screen.getByText('Calendar didn’t answer in 10 s.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(header())
  })

  it('opens by itself when the call fails and folds back when it recovers', () => {
    const { rerender } = renderWithSatin(card({ status: 'running', output: undefined }))
    expect(header().getAttribute('aria-expanded')).toBe('false')
    rerender(card({ status: 'error', output: undefined, onRetry: () => {} }))
    expect(header().getAttribute('aria-expanded')).toBe('true')
    rerender(card({ status: 'running', output: undefined }))
    expect(header().getAttribute('aria-expanded')).toBe('false')
  })

  it('stays as someone left it once they open or fold it', async () => {
    const { user, rerender } = renderWithSatin(card({ status: 'running', output: undefined }))
    await user.click(header())
    rerender(card({ status: 'success' }))
    expect(header().getAttribute('aria-expanded')).toBe('true')
  })

  it('leaves the open state to the app when controlled', async () => {
    const onOpenChange = vi.fn()
    const { user, rerender } = renderWithSatin(card({ open: false, onOpenChange }))
    await user.click(header())
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(header().getAttribute('aria-expanded')).toBe('false')
    rerender(card({ open: false, onOpenChange, status: 'error' }))
    expect(header().getAttribute('aria-expanded')).toBe('false')
  })

  it('shows the time so far while it runs, and hears "Running"', () => {
    renderWithSatin(card({ status: 'running', output: undefined, duration: undefined, startedAt: Date.now() - 2500 }))
    const status = header().querySelector('[data-slot="tool-call-status"]')!
    expect(status.textContent).toMatch(/Running2\.[5-9]s/)
  })

  it('measures the run when no duration is given', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      const { rerender } = renderWithSatin(card({ status: 'running', output: undefined, duration: undefined }))
      vi.setSystemTime(Date.now() + 3200)
      rerender(card({ status: 'success', duration: undefined }))
      expect(header().textContent).toContain('3.2s')
    } finally {
      vi.useRealTimers()
    }
  })

  it('reads out a call that ends on screen, and nothing for one that mounts done', () => {
    const { rerender } = renderWithSatin(card())
    const live = () => document.querySelector('[aria-live="polite"]')!
    expect(live().textContent).toBe('')
    rerender(card({ status: 'running', output: undefined }))
    rerender(card({ status: 'error', output: undefined }))
    expect(live().textContent).toBe('Find slots Failed')
  })

  it('cuts long JSON at maxLines, with Show all; Show less folds it back', async () => {
    const { user } = renderWithSatin(card({ defaultOpen: true }))
    const show = screen.getByRole('button', { name: 'Show all 16 lines' })
    const code = document.getElementById(show.getAttribute('aria-controls')!)!
    expect(code.style.maxHeight).toBe(`${40 + 10 * 24}px`)
    expect(show.getAttribute('aria-expanded')).toBe('false')
    await user.click(show)
    expect(code.style.maxHeight).toBe('')
    const less = screen.getByRole('button', { name: 'Show less' })
    expect(less.getAttribute('aria-expanded')).toBe('true')
    // The input is short: no button for it.
    expect(screen.getAllByRole('button', { name: /^Show/ })).toHaveLength(1)
  })

  it('renders a node of its own under the section title', () => {
    renderWithSatin(
      card({
        defaultOpen: true,
        output: (
          <ul aria-label="Free slots">
            {slots.map((s) => (
              <li key={s.start}>{s.start}</li>
            ))}
          </ul>
        ),
      }),
    )
    const group = screen.getByRole('group', { name: 'Find slots Output' })
    expect(within(group).getByRole('list', { name: 'Free slots' })).toBeTruthy()
  })

  it('shows a string as it is', () => {
    renderWithSatin(card({ defaultOpen: true, output: 'No free slots next week.' }))
    expect(screen.getByRole('region', { name: 'Find slots Output code' }).textContent).toContain('No free slots next week.')
  })

  it('speaks the app’s language', async () => {
    const { user } = renderWithSatin(card({ status: 'error', output, error: 'Timeout', onRetry: () => {} }), {
      labels: {
        toolCallFailed: 'Błąd',
        toolCallRetry: 'Ponów',
        toolCallInput: 'Wejście',
        toolCallOutput: 'Wynik',
        toolCallShowAll: (n) => `Pokaż wszystkie ${n} wierszy`,
        toolCallShowLess: 'Pokaż mniej',
        codeRegion: (name) => `Kod: ${name}`,
      },
    })
    expect(header().textContent).toContain('Błąd')
    expect(screen.getByRole('button', { name: 'Ponów' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Find slots Kod: Wejście' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Pokaż wszystkie 16 wierszy' }))
    expect(screen.getByRole('button', { name: 'Pokaż mniej' })).toBeTruthy()
  })

  it('writes times in the labels’ locale', () => {
    renderWithSatin(card({ duration: 1240 }), { labels: { dateLocale: 'pl-PL' } })
    expect(header().textContent).toContain('1,2')
  })

  it('builds the same card from its parts', async () => {
    const { user } = renderWithSatin(
      <ToolCallRoot status="cancelled">
        <ToolCallHeader name="Find slots" />
        <ToolCallContent>
          <ToolCallSection title="Input" value={input} />
        </ToolCallContent>
      </ToolCallRoot>,
    )
    expect(header().textContent).toContain('Cancelled')
    await user.click(header())
    expect(screen.getByRole('region', { name: 'Find slots Input code' })).toBeTruthy()
  })

  it('works right to left', () => {
    renderWithSatin(card(), { dir: 'rtl' })
    expect(header()).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <div>
        {/* Different tools, as in a real run: each card's code regions are named after its tool. */}
        {card({ defaultOpen: true })}
        {card({ name: 'Book room', status: 'error', output: undefined, error: 'Timeout', onRetry: () => {} })}
        {card({ name: 'Read inbox', status: 'running', output: undefined })}
        {card({ name: 'Send invite', status: 'pending', output: undefined })}
        {card({ name: 'Post to Slack', status: 'cancelled', output: <p>Stopped by Tara</p>, defaultOpen: true })}
      </div>,
      { theme },
    )
    await act(async () => {})
    await expectNoAxeViolations()
  })
})
