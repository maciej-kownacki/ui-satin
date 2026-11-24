import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { renderWithSatin } from 'satin-test'
import { ChartTooltip } from '../components/chart'

describe('ChartTooltip', () => {
  it('is a pill with a pointer by default', () => {
    const { container } = renderWithSatin(<ChartTooltip label="Mon" value="12" />)
    const tip = container.querySelector('[data-slot="chart-tooltip"]')!
    expect(tip.getAttribute('data-variant')).toBeNull()
    expect(tip.querySelector('svg')).not.toBeNull()
  })

  it('with rows is a card: the label, a row per series with its colour, the note, no pointer', () => {
    const { container } = renderWithSatin(
      <ChartTooltip
        label="Purchased"
        rows={[
          { color: 'var(--chart-1)', label: 'Mobile', value: '1,540' },
          { color: 'var(--chart-2)', label: 'Desktop', value: '2,050' },
        ]}
        note="43% kept"
      />,
    )
    const tip = container.querySelector('[data-slot="chart-tooltip"]')!
    expect(tip.getAttribute('data-variant')).toBe('card')
    expect(tip.querySelector('svg')).toBeNull()
    expect(tip.textContent).toBe('PurchasedMobile1,540Desktop2,05043% kept')
    const swatches = tip.querySelectorAll<HTMLElement>('[aria-hidden]')
    expect([...swatches].map((s) => s.style.background)).toEqual(['var(--chart-1)', 'var(--chart-2)'])
  })
})
