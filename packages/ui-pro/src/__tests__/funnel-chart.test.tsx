import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { expectNoAxeViolations, renderWithSatin, setReducedMotion } from 'satin-test'
import { FunnelChart, FunnelTable, funnelRows, funnelShapePath, type FunnelStage } from '../components/funnel-chart'

const hiring: FunnelStage[] = [
  { label: 'Applied', value: 240 },
  { label: 'Screening', value: 60 },
  { label: 'Interview', value: 18 },
  { label: 'Offer', value: 4 },
  { label: 'Hired', value: 3 },
]

const bars = (root: ParentNode = document) => [...root.querySelectorAll<SVGSVGElement>('[data-slot="funnel-chart-shape"]')]

afterEach(() => {
  setReducedMotion(false)
})

describe('funnelRows', () => {
  it('works out shares, conversions and drop-off', () => {
    const rows = funnelRows(hiring)
    expect(rows[0]).toMatchObject({ share: 1, fromPrevious: null, fromFirst: null, dropOff: null, bigDropOff: false })
    expect(rows[2]).toMatchObject({ share: 0.075, fromPrevious: 0.3, fromFirst: 0.075, dropOff: 42, bigDropOff: true })
    expect(rows[4]).toMatchObject({ fromPrevious: 0.75, dropOff: 1, bigDropOff: false })
  })

  it('takes the warning threshold', () => {
    expect(funnelRows(hiring, 0.8).filter((r) => r.bigDropOff)).toHaveLength(0)
    expect(funnelRows(hiring, 0.7).filter((r) => r.bigDropOff).map((r) => r.label)).toEqual(['Screening', 'Interview', 'Offer'])
  })

  it('divides by nothing as no conversion, and counts a bad value as 0', () => {
    const rows = funnelRows([
      { label: 'A', value: 10 },
      { label: 'B', value: 0 },
      { label: 'C', value: Number.NaN },
    ])
    expect(rows[1]).toMatchObject({ share: 0, fromPrevious: 0, dropOff: 10, bigDropOff: true })
    expect(rows[2]).toMatchObject({ value: 0, fromPrevious: null, fromFirst: 0, dropOff: 0, bigDropOff: false })
  })
})

describe('FunnelChart', () => {
  it('is a figure named by its title, each stage named in words', () => {
    renderWithSatin(<FunnelChart title="Hiring" range="Q3 2026" stages={hiring} />)
    const figure = screen.getByRole('figure', { name: 'Hiring' })
    const items = within(figure).getAllByRole('listitem')
    expect(items.map((li) => li.getAttribute('aria-label'))).toEqual([
      'Applied: 240',
      'Screening: 60, 25% of Applied, drop-off 180, big drop-off',
      'Interview: 18, 30% of Screening, 7.5% of Applied, drop-off 42, big drop-off',
      'Offer: 4, 22.2% of Interview, 1.7% of Applied, drop-off 14, big drop-off',
      'Hired: 3, 75% of Offer, 1.3% of Applied, drop-off 1',
    ])
  })

  it('draws each stage as thick as its share of the first to the power 0.35, easing to the next', () => {
    renderWithSatin(<FunnelChart title="Hiring" stages={hiring} />)
    const paths = bars().map((b) => b.querySelector('path')!.getAttribute('d'))
    expect(paths[0]).toBe(funnelShapePath(1, 0.25))
    expect(paths[0]).toBe('M 0 0 C 50 0 50 19.22 100 19.22 L 100 80.78 C 50 80.78 50 100 0 100 Z')
    // The last stage closes to a point: 1.25% of the first leaves about 22% thick, not a thread,
    // flat out of the stage before, then runs into the axis.
    expect(paths[4]).toBe(funnelShapePath(0.0125, 0))
    expect(paths[4]).toBe('M 0 39.21 C 25 39.21 35 49.14 100 50 C 35 50.86 25 60.79 0 60.79 Z')
    // A very small share draws thin, and never under 3%.
    expect(funnelShapePath(0.0001, 0.0001)).toBe('M 0 48.01 C 50 48.01 50 48.01 100 48.01 L 100 51.99 C 50 51.99 50 51.99 0 51.99 Z')
    expect(funnelShapePath(1e-8, 1e-8)).toBe('M 0 48.5 C 50 48.5 50 48.5 100 48.5 L 100 51.5 C 50 51.5 50 51.5 0 51.5 Z')
  })

  it('flows top to bottom when vertical', () => {
    expect(funnelShapePath(1, 0.25, true)).toBe('M 0 0 C 0 50 19.22 50 19.22 100 L 80.78 100 C 80.78 50 100 50 100 0 Z')
    expect(funnelShapePath(1, 0, true)).toBe('M 0 0 C 0 25 46 35 50 100 C 54 35 100 25 100 0 Z')
  })

  it('says the share lost under the piece of the flow that narrows, none on the last stage', () => {
    const { container } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} />)
    const items = screen.getAllByRole('listitem')
    // Applied narrows to Screening across its own column, so the 75% lost sits under Applied.
    expect(items.slice(0, 4).map((li) => li.querySelector('[data-slot="funnel-chart-step"]')!.textContent)).toEqual(['75%', '70%', '77.8%', '25%'])
    expect(items[4].querySelector('[data-slot="funnel-chart-step"]')).toBeNull()
    // Centred under the stage.
    expect(items[0].querySelector('[data-slot="funnel-chart-step"]')!.parentElement!.className).toContain('justify-center')
    // The column says only the label and the count; the steps and the tooltip say the rest.
    expect(items[2].textContent).toBe('Interview1877.8%')
    expect(container.textContent).not.toContain('drop-off 42')
  })

  it('points the tooltip at the middle of the stage, off its words', () => {
    const { container } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} />)
    const marker = container.querySelector<HTMLElement>('[data-slot="funnel-chart-marker"]')!
    expect(marker.style.top).toBe('50%')
  })

  it('says a big drop-off in words; the step under the flow looks like any other', () => {
    const { container } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} dropOffWarning={0.75} />)
    const steps = [...container.querySelectorAll('[data-slot="funnel-chart-step"]')]
    expect(steps.map((s) => s.textContent)).toEqual(['75%', '70%', '77.8%', '25%'])
    expect(container.querySelector('[data-tone="amber"]')).toBeNull()
    const items = screen.getAllByRole('listitem')
    expect(items[1].getAttribute('aria-label')).toContain('big drop-off')
    expect(items[2].getAttribute('aria-label')).not.toContain('big drop-off')
  })

  it('lights up the stage on show', () => {
    const { container } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} highlight={2} />)
    const stages = [...container.querySelectorAll('[data-slot="funnel-chart-stage"]')]
    expect(stages.map((s) => s.classList.contains('bg-bg-hover'))).toEqual([false, false, true, false, false])
    // No line between the stages: one flow.
    expect(container.querySelector('[data-slot="funnel-chart-stages"] .border-s')).toBeNull()
    // The other stages' shapes fade in a solid mix with the card, never with opacity.
    const shapes = [...container.querySelectorAll<SVGElement>('[data-slot="funnel-chart-shape"]')]
    expect(shapes.map((s) => s.style.color.includes('30%'))).toEqual([true, true, false, true, true])
    expect(shapes.every((s) => !s.style.opacity)).toBe(true)
  })

  it('fades no stage while none is on show', () => {
    const { container } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} />)
    const shapes = [...container.querySelectorAll<SVGElement>('[data-slot="funnel-chart-shape"]')]
    expect(shapes.every((s) => s.style.color === '')).toBe(true)
  })

  it('shows only the conversions asked for', () => {
    const { container, rerender } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} showConversion="both" />)
    const items = () => screen.getAllByRole('listitem')
    expect(items()[2].getAttribute('aria-label')).toBe('Interview: 18, 30% of Screening, 7.5% of Applied, drop-off 42, big drop-off')
    // The share of the first follows the count; the step under the flow says the share lost.
    expect(items()[1].textContent).toBe('Screening6025%70%')
    expect(items()[2].textContent).toBe('Interview187.5%77.8%')
    rerender(<FunnelChart title="Hiring" stages={hiring} showConversion="first" />)
    expect(container.querySelector('[data-slot="funnel-chart-step"]')).toBeNull()
    expect(items()[2].getAttribute('aria-label')).toBe('Interview: 18, 7.5% of Applied, drop-off 42, big drop-off')
  })

  it('keeps a zero stage with an empty track', () => {
    const { container } = renderWithSatin(
      <FunnelChart
        title="Checkout"
        stages={[
          { label: 'Cart', value: 50 },
          { label: 'Payment', value: 0 },
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    // The flow narrows to nothing; the stage keeps its column.
    expect(bars(container)[1].querySelector('path')!.getAttribute('d')).toBe(funnelShapePath(0, 0))
    expect(screen.getAllByRole('listitem')[1].getAttribute('aria-label')).toBe('Payment: 0, 0% of Cart, drop-off 50, big drop-off')
  })

  it('has one tab stop; arrows, Home and End move between stages', async () => {
    const { user } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} />)
    const items = screen.getAllByRole('listitem')
    await user.tab()
    expect(document.activeElement).toBe(items[0])
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(items[1])
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(items[4])
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(items[4])
    await user.keyboard('{Home}{ArrowRight}')
    expect(document.activeElement).toBe(items[1])
    expect(items.filter((li) => li.tabIndex === 0)).toEqual([items[1]])
    await user.tab()
    expect(document.activeElement).toBe(document.body)
  })

  it('shows the stage in the tooltip on focus', async () => {
    const { user } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} />)
    await user.tab()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    const tooltip = document.querySelector('[data-slot="chart-tooltip"]')!
    // A card: the stage on top, its count and drop-off, its conversions in a muted line.
    expect(tooltip.getAttribute('data-variant')).toBe('card')
    expect(tooltip.textContent).toBe('InterviewCount18Drop-off4230% of Screening · 7.5% of Applied')
    expect(tooltip.textContent).not.toContain('big drop-off')
    await user.keyboard('{End}')
    expect(document.querySelector('[data-slot="chart-tooltip"]')!.textContent).toBe('HiredCount3Drop-off175% of Offer · 1.3% of Applied')
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}')
    // The second stage's share of the previous is its share of the first: said once.
    expect(document.querySelector('[data-slot="chart-tooltip"]')!.textContent).toBe('ScreeningCount60Drop-off18025% of Applied')
    await user.keyboard('{Home}')
    // The first stage: its count alone.
    expect(document.querySelector('[data-slot="chart-tooltip"]')!.textContent).toBe('AppliedCount240')
  })

  it('moves the other way under right to left in reading order', async () => {
    const { user } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} orientation="vertical" />, { dir: 'rtl' })
    const items = screen.getAllByRole('listitem')
    await user.tab()
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(items[1])
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(items[0])
  })

  it('makes every stage a button with onStageSelect', async () => {
    const onStageSelect = vi.fn()
    const { user } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} onStageSelect={onStageSelect} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
    await user.tab()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onStageSelect).toHaveBeenCalledWith(1, hiring[1])
    await user.keyboard(' ')
    expect(onStageSelect).toHaveBeenCalledTimes(2)
    await user.click(buttons[3])
    expect(onStageSelect).toHaveBeenLastCalledWith(3, hiring[3])
  })

  it('keeps a table with the same rows, hidden unless showTable', () => {
    const { rerender } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} />)
    const table = screen.getByRole('table', { name: 'Hiring' })
    expect(table.className).toContain('sr-only')
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(6)
    expect(within(rows[3]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['18', '30%', '7.5%', '42, big drop-off'])
    rerender(<FunnelChart title="Hiring" stages={hiring} showTable />)
    expect(screen.getByRole('table', { name: 'Hiring' }).className).not.toContain('sr-only')
  })

  it('writes counts with format and numbers in the locale', () => {
    renderWithSatin(<FunnelChart title="Sales" stages={[{ label: 'Leads', value: 1200 }, { label: 'Won', value: 300 }]} format={(v) => `€${v}`} />, {
      labels: { dateLocale: 'de-DE' },
    })
    expect(screen.getAllByRole('listitem')[1].getAttribute('aria-label')).toMatch(/^Won: €300, 25\s% of Leads, drop-off €900, big drop-off$/)
  })

  it('is busy while loading, at the height of five stages', () => {
    const { container } = renderWithSatin(<FunnelChart title="Hiring" stages={[]} loading />)
    expect(screen.getByRole('figure', { name: 'Hiring' }).getAttribute('aria-busy')).toBe('true')
    expect(container.querySelector('[data-slot="funnel-chart"] > .min-h-\\[268px\\]')).not.toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows the empty state at the same height', () => {
    const { container } = renderWithSatin(<FunnelChart title="Hiring" stages={[]} empty="No applicants yet" />)
    expect(screen.getByText('No applicants yet')).not.toBeNull()
    expect(container.querySelector('[data-slot="funnel-chart"]')!.getAttribute('data-state')).toBe('empty')
    expect(container.querySelector('.min-h-\\[268px\\]')).not.toBeNull()
  })

  it('shows the error politely with Retry', async () => {
    const onRetry = vi.fn()
    const { user } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} error onRetry={onRetry} />)
    expect(screen.getByRole('status').textContent).toBe("Couldn't load")
    expect(screen.getByRole('status').className).toContain('sr-only')
    expect(screen.queryByRole('listitem')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('fades the bars in once, and not with reducedMotion', () => {
    const { rerender } = renderWithSatin(<FunnelChart title="Hiring" stages={hiring} />)
    expect(bars().every((b) => b.hasAttribute('data-enter'))).toBe(true)
    expect(bars()[2].style.animationDelay).toBe('50ms')
    rerender(<FunnelChart title="Hiring" stages={hiring} reducedMotion />)
    expect(bars().some((b) => b.hasAttribute('data-enter'))).toBe(false)
  })

  it('renders a stage tone on its bar', () => {
    renderWithSatin(<FunnelChart title="Hiring" stages={[{ label: 'Applied', value: 10 }, { label: 'Hired', value: 2, tone: 'green' }]} />)
    expect(bars()[1].getAttribute('data-tone')).toBe('green')
  })

  it.each(['light', 'dark'] as const)('has no axe violations in %s', async (theme) => {
    renderWithSatin(
      <>
        <FunnelChart title="Hiring" stages={hiring} />
        <FunnelChart title="Sales" stages={hiring} orientation="vertical" onStageSelect={() => {}} showTable />
        <FunnelChart title="Loading" stages={[]} loading />
        <FunnelChart title="Empty" stages={[]} />
        <FunnelChart title="Error" stages={[]} error onRetry={() => {}} />
      </>,
      { theme },
    )
    await expectNoAxeViolations()
  })
})

describe('FunnelTable', () => {
  it('stands alone, visible', () => {
    renderWithSatin(<FunnelTable stages={hiring} caption="Hiring" visible />)
    const table = screen.getByRole('table', { name: 'Hiring' })
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Stage', 'Count', 'From previous', 'From first', 'Drop-off'])
  })
})
