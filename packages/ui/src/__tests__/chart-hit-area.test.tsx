import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithSatin } from 'satin-test'
import { LineCard } from '../components/line-chart'
import { DonutCard } from '../components/donut-chart'

const data = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((label, i) => ({ label, value: (i + 1) * 10 }))

describe('chart hit areas', () => {
  it('LineCard: a pointer in the band past the plot picks the point under its x', () => {
    renderWithSatin(<LineCard title="Orders" range="This week" data={data} />)
    const plot = screen.getByRole('group', { name: /Orders/ })
    vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 400, 180))
    // The band reaching 16px above and under the plot.
    const band = plot.querySelector(':scope > span[class*="-inset-y-4"]')!
    expect(band).not.toBeNull()
    fireEvent.pointerMove(band, { clientX: 300, clientY: -10 })
    expect(plot.querySelector('[aria-live]')!.textContent).toBe('Thu: 40')
  })

  it('DonutCard: the hit ring picks its segment', () => {
    renderWithSatin(<DonutCard title="Channels" range="This week" data={data} />)
    const hits = document.querySelectorAll('circle[stroke="transparent"]')
    expect(hits).toHaveLength(data.length)
    fireEvent.pointerEnter(hits[2])
    expect(document.querySelector('[aria-live]')!.textContent).toContain('Wed')
  })
})
