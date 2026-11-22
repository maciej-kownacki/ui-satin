import * as React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { StatCard, StatCardChange, type StatChange } from '../components/stat-card'

const week: StatChange = { value: 12, period: 'vs last week', direction: 'up' }
const points = [980, 1010, 1040, 1100, 1284]
const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']

const card = (name: string | RegExp) => screen.getByRole('group', { name })
const shownValue = (root: HTMLElement) => root.querySelector('[data-slot="stat-card-value"]')!.textContent
const tone = (root: HTMLElement) => root.querySelector('[data-slot="badge"]')!.getAttribute('data-tone')

afterEach(() => {
  setReducedMotion(false)
  document.documentElement.removeAttribute('dir')
})

describe('StatCard', () => {
  it('says the label, value and change in words', () => {
    renderWithSatin(<StatCard label="Signups" value={1284} change={week} sparkline={points} countUp={false} />)
    const root = card('Signups, 1,284, up 12% vs last week')
    expect(shownValue(root)).toBe('1,284')
    expect(root.textContent).toContain('vs last week')
  })

  it('colours the change by whether its direction is good, and says good or bad when down is good', () => {
    renderWithSatin(
      <>
        <StatCard label="Signups" value={1284} change={week} countUp={false} />
        <StatCard label="Refunds" value={42} change={{ value: 3, period: 'vs yesterday', direction: 'up', good: 'down' }} countUp={false} />
        <StatCard label="CAC" value={38} format={(v) => `${v} €`} change={{ value: 4.25, period: 'vs last week', direction: 'down', good: 'down' }} countUp={false} />
      </>,
    )
    expect(tone(card(/^Signups/))).toBe('green')
    expect(tone(card('Refunds, 42, up 3% vs yesterday, bad'))).toBe('red')
    expect(tone(card('CAC, 38 €, down 4.3% vs last week, good'))).toBe('green')
  })

  it('shows a flat change in grey with a dash', () => {
    renderWithSatin(<StatCard label="Conversion" value="3.1%" change={{ value: 0, period: 'vs last week', direction: 'flat' }} />)
    const root = card('Conversion, 3.1%, unchanged vs last week')
    expect(tone(root)).toBe('neutral')
  })

  it('leaves the badge and the period out without a change', () => {
    renderWithSatin(<StatCard label="Win rate" value="31%" change={null} />)
    const root = card('Win rate, 31%')
    expect(root.querySelector('[data-slot="badge"]')).toBeNull()
  })

  it('shows a dash for no value and reads "No data"', () => {
    renderWithSatin(<StatCard label="Pipeline" value={null} />)
    expect(shownValue(card('Pipeline, No data'))).toBe('—')
  })

  it('is busy while loading, with the same rows', () => {
    renderWithSatin(<StatCard label="Revenue" value={null} loading sparkline={[]} />)
    const root = card('Revenue, Loading')
    expect(root.getAttribute('aria-busy')).toBe('true')
    // Label, value and sparkline rows, as loaded.
    expect(root.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
    expect(root.querySelector('.h-5')).not.toBeNull()
    expect(root.querySelector('.h-7\\.5')).not.toBeNull()
  })

  it('keeps no sparkline row while loading when there is no sparkline', () => {
    renderWithSatin(<StatCard label="Revenue" value={null} loading />)
    expect(card('Revenue, Loading').querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2)
  })

  it('shows the error and runs Retry from the keyboard', async () => {
    const onRetry = vi.fn()
    const { user } = renderWithSatin(<StatCard label="Revenue" value={null} error onRetry={onRetry} sparkline={points} />)
    // The name is the label and the error row, which is shown once and read politely.
    const root = card("Revenue Couldn't load")
    expect(screen.getByRole('status').textContent).toBe("Couldn't load")
    await user.tab()
    const retry = screen.getByRole('button', { name: 'Retry', description: 'Revenue' })
    expect(document.activeElement).toBe(retry)
    expect(root.textContent!.split("Couldn't load")).toHaveLength(2)
    await user.keyboard('{Enter}')
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('is one link with href, named in words, with no tab stop in the sparkline', async () => {
    const { user } = renderWithSatin(<StatCard label="Signups" value={1284} change={week} sparkline={points} href="/signups" countUp={false} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    const link = screen.getByRole('link', { name: 'Signups, 1,284, up 12% vs last week' })
    expect(link.getAttribute('href')).toBe('/signups')
    expect(link.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(link.getAttribute('aria-describedby')!)!.textContent).toBe('Upward trend over 5 points, from 980 to 1,284')
    expect(screen.queryByRole('group')).toBeNull()
    await user.tab()
    expect(document.activeElement).toBe(link)
    await user.tab()
    expect(document.activeElement).toBe(document.body)
  })

  it('takes a disabled link out of the tab order', async () => {
    const { user } = renderWithSatin(<StatCard label="Signups" value={1284} sparkline={points} href="/signups" disabled countUp={false} />)
    const link = screen.getByRole('link', { name: 'Signups, 1,284' })
    expect(link.hasAttribute('href')).toBe(false)
    expect(link.getAttribute('aria-disabled')).toBe('true')
    await user.tab()
    expect(document.activeElement).toBe(document.body)
  })

  it('moves along the sparkline with the arrow keys', async () => {
    const { user } = renderWithSatin(<StatCard label="Signups" value={1284} sparkline={points} sparklineLabels={weeks} countUp={false} />)
    await user.tab()
    const spark = screen.getByRole('group', { name: 'Signups, 5 points' })
    expect(document.activeElement).toBe(spark)
    expect(document.getElementById(spark.getAttribute('aria-describedby')!)!.textContent).toBe('Upward trend over 5 points, from 980 to 1,284')
    const live = spark.querySelector('[aria-live]')!
    expect(live.textContent).toBe('Week 5: 1,284')
    await user.keyboard('{ArrowLeft}')
    expect(live.textContent).toBe('Week 4: 1,100')
    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}')
    expect(live.textContent).toBe('Week 1: 980')
    await user.keyboard('{ArrowRight}')
    expect(live.textContent).toBe('Week 2: 1,010')
    await user.tab()
    expect(live.textContent).toBe('')
  })

  it('moves the way the arrows point right to left too (the drawing is not mirrored)', async () => {
    const { user } = renderWithSatin(<StatCard label="Signups" value={1284} sparkline={points} countUp={false} />, { dir: 'rtl' })
    await user.tab()
    const live = screen.getByRole('group', { name: 'Signups, 5 points' }).querySelector('[aria-live]')!
    expect(live.textContent).toBe('5 of 5: 1,284')
    await user.keyboard('{ArrowLeft}')
    expect(live.textContent).toBe('4 of 5: 1,100')
    await user.keyboard('{ArrowRight}')
    expect(live.textContent).toBe('5 of 5: 1,284')
  })

  it('draws no sparkline from fewer than two points', () => {
    renderWithSatin(<StatCard label="Signups" value={1284} sparkline={[3]} countUp={false} />)
    expect(document.querySelector('[data-slot="stat-card-sparkline"]')).toBeNull()
  })

  it('says its words through SatinLabels', async () => {
    const { user } = renderWithSatin(
      <>
        <StatCard
          label="Rejestracje"
          value={1284}
          change={{ ...week, period: 'r/r', good: 'down' }}
          sparkline={points}
          countUp={false}
        />
        <StatCard label="Przychód" value={null} error onRetry={() => {}} />
      </>,
      {
        labels: {
          dateLocale: 'pl-PL',
          statUp: (value, period) => `wzrost o ${value} ${period}`,
          statBad: 'źle',
          statError: 'Nie udało się wczytać',
          statRetry: 'Ponów',
          chartPoints: (title, count) => `${title}, ${count} punktów`,
          statPoint: (index, count) => `${index} z ${count}`,
          statTrend: (trend, count, from, to) => `Trend ${trend === 'up' ? 'rosnący' : 'inny'}, ${count} punktów, od ${from} do ${to}`,
        },
      },
    )
    expect(card('Rejestracje, 1284, wzrost o 12% r/r, źle')).toBeTruthy()
    expect(card('Przychód Nie udało się wczytać')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ponów' })).toBeTruthy()
    await user.tab()
    const spark = screen.getByRole('group', { name: 'Rejestracje, 5 punktów' })
    expect(spark.querySelector('[aria-live]')!.textContent).toBe('5 z 5: 1284')
    expect(document.getElementById(spark.getAttribute('aria-describedby')!)!.textContent).toBe('Trend rosnący, 5 punktów, od 980 do 1284')
  })

  it('counts up the first time it shows a number', async () => {
    renderWithSatin(<StatCard label="Signups" value={1284} />)
    const root = card('Signups, 1,284')
    expect(shownValue(root)).not.toBe('1,284')
    await waitFor(() => expect(shownValue(root)).toBe('1,284'))
  })

  it('shows the final value at once under reduced motion', () => {
    setReducedMotion(true)
    renderWithSatin(<StatCard label="Signups" value={1284} />)
    expect(shownValue(card('Signups, 1,284'))).toBe('1,284')
  })

  it('counts up when loading ends, but not when the value changes later', async () => {
    const { rerender } = renderWithSatin(<StatCard label="Signups" value={null} loading />)
    rerender(<StatCard label="Signups" value={1284} />)
    const root = card('Signups, 1,284')
    expect(shownValue(root)).not.toBe('1,284')
    await waitFor(() => expect(shownValue(root)).toBe('1,284'))
    rerender(<StatCard label="Signups" value={1300} />)
    expect(shownValue(card('Signups, 1,300'))).toBe('1,300')
  })

  it('keeps the value on screen through hydration, with no count-up', async () => {
    const ui = <StatCard label="Signups" value={1284} change={week} />
    const container = document.createElement('div')
    container.innerHTML = renderToString(ui)
    document.body.appendChild(container)
    expect(shownValue(container)).toBe('1,284')
    const root = await act(async () => hydrateRoot(container, ui))
    expect(shownValue(container)).toBe('1,284')
    await new Promise((r) => setTimeout(r, 100))
    expect(shownValue(container)).toBe('1,284')
    act(() => root.unmount())
    container.remove()
  })

  it('counts up under StrictMode too', async () => {
    renderWithSatin(
      <React.StrictMode>
        <StatCard label="Signups" value={1284} />
      </React.StrictMode>,
    )
    const root = card('Signups, 1,284')
    expect(shownValue(root)).not.toBe('1,284')
    await waitFor(() => expect(shownValue(root)).toBe('1,284'))
  })

  it('writes the value with all its decimals when not counting', async () => {
    renderWithSatin(
      <>
        <StatCard label="Ratio" value={1.23456} format={(v) => String(v)} countUp={false} />
        <StatCard label="Rate" value={1e-7} format={(v) => v.toExponential()} />
      </>,
    )
    expect(shownValue(card('Ratio, 1.23456'))).toBe('1.23456')
    // Counting, 1e-7 is rounded to its 7 decimals, not to 0 or to digits it doesn't have.
    const rate = card('Rate, 1e-7')
    await waitFor(() => expect(shownValue(rate)).toBe('1e-7'))
  })

  it('shows a non-finite value as no data, and leaves non-finite points out', () => {
    renderWithSatin(
      <StatCard label="Signups" value={Number.NaN} sparkline={[980, Number.NaN, 1040, Infinity, 1284]} sparklineLabels={weeks} />,
    )
    const root = card('Signups, No data')
    expect(shownValue(root)).toBe('—')
    const spark = screen.getByRole('group', { name: 'Signups, 3 points' })
    expect(document.getElementById(spark.getAttribute('aria-describedby')!)!.textContent).toBe('Upward trend over 3 points, from 980 to 1,284')
    expect(spark.querySelector('path')!.getAttribute('d')).not.toMatch(/NaN|Infinity/)
  })

  it('keeps the sparkline row when loading ends with too few points', () => {
    const { rerender } = renderWithSatin(<StatCard label="Revenue" value={null} loading sparkline={[]} />)
    rerender(<StatCard label="Revenue" value={null} sparkline={[]} />)
    const row = card('Revenue, No data').querySelector('[data-slot="stat-card-sparkline-empty"]')!
    expect(row.getAttribute('aria-hidden')).toBe('true')
    expect(row.classList.contains('h-12')).toBe(true)
  })

  it('reads an error given as content once, from where it shows', async () => {
    renderWithSatin(<StatCard label="Revenue" value={null} error={<>Quota <b>exceeded</b></>} onRetry={() => {}} />)
    const root = card('Revenue Quota exceeded')
    expect(root.textContent!.split('Quota')).toHaveLength(2)
    expect(screen.getByRole('status').textContent).toBe('Quota exceeded')
    await expectNoAxeViolations()
  })

  it('reads a label given as content from where it shows, not twice', () => {
    renderWithSatin(
      <>
        <StatCard label={<em>Signups</em>} value={1284} change={week} countUp={false} />
        <StatCard label={<em>Visits</em>} value={50} href="/visits" countUp={false} />
      </>,
    )
    const root = card('Signups 1,284, up 12% vs last week')
    expect(root.textContent!.split('Signups')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Visits 50' })).toBeTruthy()
    expect(screen.getByRole('link').querySelector('em')).toBeNull()
  })

  it('writes the change and the name in the locale and its labels', () => {
    renderWithSatin(<StatCard label="Inscriptions" value={1284} change={{ ...week, period: 'vs semaine dernière' }} countUp={false} />, {
      labels: {
        dateLocale: 'fr-FR',
        statUp: (value, period) => `en hausse de ${value} ${period}`,
        statName: (label, value, change) => [label, value, change].filter(Boolean).join(' ; '),
      },
    })
    const pct = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(0.12)
    // A space before the sign, the narrow no-break space in current ICU.
    expect(pct).toMatch(/^12[\u00a0\u202f]%$/)
    const thousands = new Intl.NumberFormat('fr-FR').format(1284)
    const root = card(`Inscriptions ; ${thousands} ; en hausse de ${pct} vs semaine dernière`)
    expect(root.querySelector('[data-slot="badge"]')!.textContent).toBe(pct)
  })

  it('reads the change in words on its own too', () => {
    renderWithSatin(<StatCardChange value={4} direction="down" good="down" period="vs last week" />)
    expect(screen.getByText('down 4% vs last week, good')).toBeTruthy()
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    const { user } = renderWithSatin(
      <div>
        <StatCard label="Signups" value={1284} change={week} sparkline={points} sparklineLabels={weeks} countUp={false} />
        <StatCard label="CAC" value={38} change={{ value: 4, period: 'vs last week', direction: 'down', good: 'down' }} sparkline={points} href="/cac" countUp={false} />
        <StatCard label="Conversion" value="3.1%" change={{ value: 0, period: 'vs last week', direction: 'flat' }} />
        <StatCard label="Pipeline" value={null} />
        <StatCard label="Revenue" value={null} loading sparkline={[]} />
        <StatCard label="Revenue" value={null} error onRetry={() => {}} sparkline={[]} />
        <StatCard label="Win rate" value={31} sparkline={points} href="/win" disabled countUp={false} />
        <StatCard label={<em>Visits</em>} value={50} sparkline={[]} countUp={false} />
        <StatCard label={<em>Visits</em>} value={null} error={<>Quota <b>exceeded</b></>} onRetry={() => {}} />
      </div>,
      { theme },
    )
    await user.tab()
    await expectNoAxeViolations()
  })
})
