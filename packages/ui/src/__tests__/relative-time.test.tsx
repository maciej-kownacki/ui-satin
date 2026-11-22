import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin } from 'satin-test'
import { RelativeTime, dateTimeFormat, relativeTimeFormat, useRelativeClock } from '../components/relative-time'

const MIN = 60_000
/** Noon today, so "minutes ago" never crosses midnight. */
const noon = () => {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d
}
const shown = (el: Element) => el.querySelector('[aria-hidden]')!.textContent
const spoken = (el: Element) => el.querySelector('.sr-only')!.textContent

describe('RelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(noon())
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is a <time> with dateTime, the short text hidden and the full date for screen readers', () => {
    const at = Date.now() - 2 * MIN
    renderWithSatin(<RelativeTime at={at} data-testid="t" />)
    const time = screen.getByTestId('t')
    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('data-slot')).toBe('relative-time')
    expect(time.getAttribute('dateTime')).toBe(new Date(at).toISOString())
    expect(shown(time)).toBe('2 min ago')
    expect(spoken(time)).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(at))
  })

  it('takes a Date, an ISO string or a timestamp, and a ref', () => {
    const at = new Date(Date.now() - 3 * MIN)
    const ref = React.createRef<HTMLTimeElement>()
    renderWithSatin(
      <>
        <RelativeTime at={at} data-testid="date" ref={ref} />
        <RelativeTime at={at.toISOString()} data-testid="iso" />
        <RelativeTime at={at.getTime()} data-testid="ms" />
      </>,
    )
    expect(ref.current).toBe(screen.getByTestId('date'))
    for (const id of ['date', 'iso', 'ms']) expect(shown(screen.getByTestId(id))).toBe('3 min ago')
  })

  it('says now, minutes and hours today, the clock time before, and the date with withDate', () => {
    const now = Date.now()
    const yesterday = new Date(now - 86_400_000)
    yesterday.setHours(9, 40, 0, 0)
    const lastYear = new Date(yesterday)
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    renderWithSatin(
      <>
        <RelativeTime at={now - 20_000} data-testid="now" />
        <RelativeTime at={now - 125 * MIN} data-testid="hours" />
        <RelativeTime at={yesterday} data-testid="clock" />
        <RelativeTime at={yesterday} withDate data-testid="date" />
        <RelativeTime at={lastYear} withDate data-testid="year" />
      </>,
    )
    expect(shown(screen.getByTestId('now'))).toBe('now')
    expect(shown(screen.getByTestId('hours'))).toBe('2 hr ago')
    expect(shown(screen.getByTestId('clock'))).toBe('9:40 AM')
    const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(yesterday)
    expect(shown(screen.getByTestId('date'))).toBe(`${month} ${yesterday.getDate()}, 9:40 AM`)
    expect(shown(screen.getByTestId('year'))).toContain(String(lastYear.getFullYear()))
  })

  it.each([
    ['en-US', '3 min ago'],
    ['en-GB', '3 min ago'],
    ['de-DE', 'vor 3 Min.'],
    ['pl-PL', '3 min temu'],
  ])('writes English units without the dot, other languages as they spell them (%s)', (dateLocale, text) => {
    renderWithSatin(<RelativeTime at={Date.now() - 3 * MIN} data-testid="t" />, { labels: { dateLocale } })
    expect(shown(screen.getByTestId('t'))).toBe(text)
  })

  it('keeps current on one shared clock that renders only the times whose text changed', () => {
    const now = Date.now()
    let commits = 0
    const view = render(
      <React.Profiler id="times" onRender={() => commits++}>
        <RelativeTime at={now - 30_000} data-testid="fresh" />
        {Array.from({ length: 10 }, (_, i) => (
          <RelativeTime key={i} at={now - 86_400_000 - i * MIN} />
        ))}
      </React.Profiler>,
    )
    expect(shown(screen.getByTestId('fresh'))).toBe('now')
    expect(vi.getTimerCount()).toBe(1)
    const before = commits
    act(() => void vi.advanceTimersByTime(30_000))
    expect(shown(screen.getByTestId('fresh'))).toBe('1 min ago')
    expect(commits).toBe(before + 1)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('gives a text of your own from the same clock', () => {
    function Minutes({ since }: { since: number }) {
      return <span data-testid="m">{useRelativeClock((now) => `${Math.floor((now - since) / MIN)}`)}</span>
    }
    const since = Date.now()
    render(<Minutes since={since} />)
    expect(screen.getByTestId('m').textContent).toBe('0')
    act(() => void vi.advanceTimersByTime(60_000))
    expect(screen.getByTestId('m').textContent).toBe('1')
  })

  it('shares its formatters', () => {
    expect(dateTimeFormat('en-US', { hour: 'numeric' })).toBe(dateTimeFormat('en-US', { hour: 'numeric' }))
    expect(relativeTimeFormat('pl-PL', { numeric: 'auto' })).toBe(relativeTimeFormat('pl-PL', { numeric: 'auto' }))
    expect(relativeTimeFormat('pl-PL', { numeric: 'auto' })).not.toBe(relativeTimeFormat('de-DE', { numeric: 'auto' }))
  })
})

describe('RelativeTime accessibility', () => {
  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <p>
        Tara Mendes commented <RelativeTime at={Date.now() - 5 * MIN} />
      </p>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})
