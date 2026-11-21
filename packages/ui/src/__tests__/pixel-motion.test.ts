import { afterEach, describe, expect, it, vi } from 'vitest'
import { setReducedMotion } from 'satin-test'
import { curve, easeSize, freeze, pixelKeyframes } from '../components/pixel-motion'

const STEP = curve(0.22, 1, 0.36, 1)
const tall = (h: number): Keyframe => ({ height: `${h}px` })
const px = (k: Keyframe) => parseFloat(String(k.height))

afterEach(() => {
  setReducedMotion(false)
  vi.unstubAllGlobals()
  // @ts-expect-error: put jsdom back as it was
  delete HTMLElement.prototype.animate
  // @ts-expect-error: put jsdom back as it was
  delete HTMLElement.prototype.getAnimations
})

describe('pixelKeyframes', () => {
  it('starts and ends on the exact values, every step held', () => {
    const frames = pixelKeyframes(120.3, 356.75, tall, { ease: STEP, duration: 360 })
    expect(frames).toHaveLength(91)
    expect(frames[0]).toEqual({ height: '120.3px', offset: 0, easing: 'steps(1, end)' })
    expect(frames.at(-1)).toEqual({ height: '356.75px', offset: 1, easing: 'steps(1, end)' })
    for (const f of frames) expect(f.easing).toBe('steps(1, end)')
  })

  it('puts every value in between on the device grid counted from the end, at 2x', () => {
    vi.stubGlobal('devicePixelRatio', 2)
    // 356.75: a rest height on a quarter pixel. Counted from zero, the last step would land on
    // 356.5 or 357 and hop the half device pixel at the end.
    const to = 356.75
    const values = pixelKeyframes(120, to, tall, { ease: STEP, duration: 360 }).slice(1, -1).map(px)
    for (const v of values) {
      const steps = (v - to) * 2
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9)
    }
    // Half CSS pixels too, not just whole ones: the grid is the device's.
    expect(values.some((v) => Math.abs(Math.round((v - to) * 2)) % 2 === 1)).toBe(true)
  })

  it('moves one way along a curve that does', () => {
    vi.stubGlobal('devicePixelRatio', 2)
    for (const [from, to] of [
      [120.5, 356.75],
      [356.75, 120.5],
    ]) {
      const values = pixelKeyframes(from, to, tall, { ease: STEP, duration: 360 }).map(px)
      const sign = Math.sign(to - from)
      for (let i = 1; i < values.length; i++) expect((values[i] - values[i - 1]) * sign).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('freeze', () => {
  it('holds the size and puts back what was there', () => {
    const el = document.createElement('div')
    el.style.width = '50%'
    const release = freeze(el, 200.5, 80.25)
    expect(el.style.width).toBe('200.5px')
    expect(el.style.maxHeight).toBe('80.25px')
    expect(el.style.contain).toBe('layout paint')
    release()
    expect(el.style.width).toBe('50%')
    expect(el.style.height).toBe('')
    expect(el.style.contain).toBe('')
  })
})

describe('easeSize', () => {
  const stubAnimate = () => {
    const calls: Keyframe[][] = []
    HTMLElement.prototype.animate = vi.fn((keyframes: Keyframe[]) => {
      calls.push(keyframes)
      return { finished: Promise.resolve(), cancel: () => {}, playState: 'running' }
    }) as unknown as HTMLElement['animate']
    HTMLElement.prototype.getAnimations = () => []
    return calls
  }

  it('eases the box on the grid, clipping and holding its content, and lets go at the end', async () => {
    const calls = stubAnimate()
    const box = document.createElement('div')
    const content = box.appendChild(document.createElement('div'))
    const run = easeSize(box, { from: 100, to: 140.75, duration: 200, ease: STEP, freeze: content })
    expect(run).not.toBeNull()
    expect(calls[0][0]).toMatchObject({ height: '100px', offset: 0 })
    expect(calls[0].at(-1)).toMatchObject({ height: '140.75px', offset: 1 })
    expect(box.style.overflow).toBe('clip')
    expect(content.style.contain).toBe('layout paint')
    await run!.finished
    await Promise.resolve()
    expect(box.style.overflow).toBe('')
    expect(content.style.contain).toBe('')
  })

  it('does nothing under reduced motion', () => {
    const calls = stubAnimate()
    setReducedMotion(true)
    const box = document.createElement('div')
    expect(easeSize(box, { from: 100, to: 140, duration: 200, ease: STEP })).toBeNull()
    expect(calls).toHaveLength(0)
    expect(box.style.overflow).toBe('')
  })
})
