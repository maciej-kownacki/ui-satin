import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithSatin, setReducedMotion } from 'satin-test'
import { useGlide, type GlidePoint } from '../components/chart'
import { LineCard } from '../components/line-chart'

/** A point every 100px along x: the glide's offsets are easy to read. */
function Probe({ point, immediate, apply }: { point: number | null; immediate?: boolean; apply: (offset: GlidePoint) => void }) {
  useGlide(point, { measure: () => (point == null ? null : { x: point * 100, y: 0 }), apply, immediate })
  return null
}

const last = (apply: ReturnType<typeof vi.fn>) => apply.mock.calls.at(-1)![0] as GlidePoint

describe('useGlide', () => {
  it('appears at the point, then glides to the next and ends exactly on it', async () => {
    const apply = vi.fn()
    const { rerender } = renderWithSatin(<Probe point={0} apply={apply} />)
    expect(last(apply)).toEqual({ x: 0, y: 0 })
    rerender(<Probe point={2} apply={apply} />)
    // Drawn where it was before the first frame: 200px back from the new point.
    expect(last(apply)).toEqual({ x: -200, y: 0 })
    await waitFor(() => expect(apply.mock.calls.length).toBeGreaterThan(3))
    const mid = apply.mock.calls.slice(2).map(([o]) => (o as GlidePoint).x)
    // On its way, never past the point (critically damped: no overshoot).
    expect(mid.every((x) => x <= 0 && x > -200)).toBe(true)
    await waitFor(() => expect(last(apply)).toEqual({ x: 0, y: 0 }), { timeout: 2000 })
  })

  it('jumps under reduced motion', () => {
    setReducedMotion(true)
    const apply = vi.fn()
    const { rerender } = renderWithSatin(<Probe point={0} apply={apply} />)
    rerender(<Probe point={3} apply={apply} />)
    expect(apply.mock.calls.every(([o]) => (o as GlidePoint).x === 0 && (o as GlidePoint).y === 0)).toBe(true)
  })

  it('jumps when the move is immediate (the keyboard)', () => {
    const apply = vi.fn()
    const { rerender } = renderWithSatin(<Probe point={0} apply={apply} immediate />)
    rerender(<Probe point={3} apply={apply} immediate />)
    expect(apply.mock.calls.every(([o]) => (o as GlidePoint).x === 0 && (o as GlidePoint).y === 0)).toBe(true)
  })
})

describe('LineCard', () => {
  const data = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((label, i) => ({ label, value: (i + 1) * 10 }))

  it('changes the tooltip and the live text at once on the arrow keys', async () => {
    const { user } = renderWithSatin(<LineCard title="Orders" range="This week" data={data} />)
    await user.tab()
    const plot = screen.getByRole('group', { name: /Orders/ })
    expect(document.activeElement).toBe(plot)
    const live = plot.querySelector('[aria-live]')!
    const tooltip = () => document.querySelector('[data-slot="chart-tooltip"]')!.textContent
    expect(live.textContent).toBe('Fri: 50')
    await waitFor(() => expect(tooltip()).toBe('Fri50'))
    await user.keyboard('{ArrowLeft}')
    expect(live.textContent).toBe('Thu: 40')
    expect(tooltip()).toBe('Thu40')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(live.textContent).toBe('Tue: 20')
    expect(tooltip()).toBe('Tue20')
  })
})
