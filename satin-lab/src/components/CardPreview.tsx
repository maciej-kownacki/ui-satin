import * as React from 'react'
import { createPortal } from 'react-dom'
import { ShowcasePreview } from './Showcase'

type Demo = React.ComponentType<{ codeHtml: Record<string, string> }>
// Each page's demo in its own chunk, loaded when its card comes into view.
const demos = import.meta.glob<{ default: Demo }>('../demos/*.tsx')

/** The column a component page's stage gives its demo (720 minus 40 a side), so it lays out as there. */
const STAGE_WIDTH = 640

/** What a demo can open that Radix closes on a scroll, a click or Escape elsewhere on the page. */
const OVERLAYS = '[data-radix-popper-content-wrapper], [role=dialog], [role=alertdialog], [role=menu], [role=tooltip], [data-slot=hover-card]'

/** Everything in `root` that paints (text, fills, edges, shadows, images), as one box on screen. */
function drawnBox(root: Element) {
  let [l, t, r, b] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const paints =
      !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) ||
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) > 0 ||
      cs.boxShadow !== 'none' ||
      /^(svg|img|canvas|video|input|textarea)$/i.test(el.tagName) ||
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())
    if (!paints) continue
    const q = el.getBoundingClientRect()
    if (q.width < 1 || q.height < 1) continue
    l = Math.min(l, q.left)
    t = Math.min(t, q.top)
    r = Math.max(r, q.right)
    b = Math.max(b, q.bottom)
  }
  return isFinite(l) ? { l, t, r, b } : null
}

/**
 * A card's preview on the All components page: the page's own demo, live, as its stage first
 * shows it (ShowcasePreview), scaled down to fit the card and never up. Real elements, not a
 * picture, so it stays sharp at any resolution and follows the theme and the Customize brand.
 * Looked at, not used: inert, and hidden from screen readers (the card's link names it).
 *
 * The demo first mounts in an invisible holder pinned near the window's top-left corner, where
 * its menus and tooltips have the whole window to open into and nothing that scrolls closes
 * them. Once it has settled, the holder moves into the card and the demo carries on there,
 * live; a demo that opened a menu, tooltip or dialog is copied into the card instead (still
 * real elements), since Radix would close those on the next scroll, click or Escape.
 *
 * In the card, the frame crops with clip-path (an overflow would make Radix squeeze menus
 * inside it), and one layer moves and scales the demo with a transform; that layer is also the
 * containing block of the copied menus (position: fixed), so they move and scale with it.
 */
export function CardPreview({ id }: { id: string }) {
  const [Demo, setDemo] = React.useState<Demo | null>(null)
  const frame = React.useRef<HTMLDivElement>(null)
  const layer = React.useRef<HTMLDivElement>(null)
  const [holder] = React.useState(() => (typeof document === 'undefined' ? null : document.createElement('div')))
  const [phase, setPhase] = React.useState<'staging' | 'live' | 'copied'>('staging')
  const [view, setView] = React.useState({ scale: 0, x: 0, y: 0 })
  const current = React.useRef(view)
  current.current = view

  React.useEffect(() => {
    let live = true
    demos[`../demos/${id}.tsx`]?.().then((m) => live && setDemo(() => m.default))
    return () => {
      live = false
    }
  }, [id])

  // Staging: the holder sits invisible at the window's corner while the demo mounts and places
  // its menus; a few frames later it goes into the card, as itself or as a copy.
  React.useLayoutEffect(() => {
    if (!holder || !Demo) return
    // 200px in from the corner, so a tooltip has room above; a transform makes the holder the
    // menus' containing block, so their places are relative to it and survive the copy.
    Object.assign(holder.style, { position: 'fixed', left: '200px', top: '200px', width: `${STAGE_WIDTH}px`, transform: 'translateZ(0)', opacity: '0', pointerEvents: 'none', zIndex: '-1' })
    holder.setAttribute('inert', '')
    holder.setAttribute('aria-hidden', 'true')
    holder.className = 'flex justify-center'
    document.body.appendChild(holder)
    let raf = 0
    let frames = 0
    const settle = () => {
      raf = requestAnimationFrame(() => {
        // Radix parks a popper at -200% until Floating UI has placed it.
        const unplaced = [...holder.querySelectorAll<HTMLElement>('[data-radix-popper-content-wrapper]')].some((w) => w.style.transform.includes('-200%'))
        if (frames++ < 4 || (unplaced && frames < 40)) return settle()
        const target = layer.current
        if (!target) return
        if (holder.querySelector(OVERLAYS)) {
          target.replaceChildren(...[...holder.childNodes].map((n) => n.cloneNode(true)))
          setPhase('copied')
        } else {
          holder.removeAttribute('style')
          holder.style.width = '100%'
          holder.removeAttribute('inert')
          holder.removeAttribute('aria-hidden')
          target.appendChild(holder)
          setPhase('live')
        }
      })
    }
    settle()
    return () => cancelAnimationFrame(raf)
  }, [holder, Demo])

  // A copy no longer needs the demo; take the holder away with it, and on unmount in any case.
  React.useEffect(() => {
    if (phase === 'copied') holder?.remove()
  }, [phase, holder])
  React.useEffect(() => () => holder?.remove(), [holder])

  // Fit what the demo draws inside the card, with room around it. A demo taller than the card
  // (a whole form, a combobox with its list) shows from the top; a very tall one fits its width
  // instead of its height. Never scaled up.
  React.useLayoutEffect(() => {
    const f = frame.current
    const s = layer.current
    if (!f || !s || phase === 'staging') return
    const fit = () => {
      const box = drawnBox(s)
      if (!box) return
      const v = current.current
      const k0 = v.scale || 1
      const lr = s.getBoundingClientRect()
      // The drawn box in the layer's own (unscaled) pixels.
      const bx = (box.l - lr.left) / k0
      const by = (box.t - lr.top) / k0
      const bw = (box.r - box.l) / k0
      const bh = (box.b - box.t) / k0
      const FW = f.clientWidth
      const FH = f.clientHeight
      const byWidth = Math.min(1, (FW - 40) / bw)
      const whole = Math.min(byWidth, (FH - 32) / bh)
      const tall = whole < 0.5
      const k = +(tall ? byWidth : whole).toFixed(3)
      const fromTop = tall || bh * k > FH - 32
      const x = FW / 2 - (bx + bw / 2) * k
      const y = fromTop ? 20 - by * k : FH / 2 - (by + bh / 2) * k
      if (Math.abs(v.scale - k) < 0.002 && Math.abs(v.x - x) < 0.5 && Math.abs(v.y - y) < 0.5) return
      current.current = { scale: k, x, y }
      setView({ scale: k, x, y })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(f)
    ro.observe(s)
    // Some live demos settle later (a stack measuring its cards, a chart its data, text that
    // streams in).
    const late = [150, 400, 900, 1600, 2500, 4000].map((ms) => window.setTimeout(fit, ms))
    return () => {
      ro.disconnect()
      late.forEach(window.clearTimeout)
    }
  }, [phase])

  return (
    <div ref={frame} inert aria-hidden className="absolute inset-0 [clip-path:inset(0)]">
      <div
        ref={layer}
        // Laid out like the holder (a 640px row, centred), so a copy keeps its menus over their triggers.
        className="absolute top-0 left-0 flex justify-center transition-opacity duration-(--duration-base) ease-(--ease-out)"
        style={{
          width: STAGE_WIDTH,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale || 1})`,
          transformOrigin: '0 0',
          opacity: view.scale ? 1 : 0,
        }}
      />
      {holder &&
        Demo &&
        phase !== 'copied' &&
        createPortal(
          <ShowcasePreview.Provider value>
            <Demo codeHtml={{}} />
          </ShowcasePreview.Provider>,
          holder,
        )}
    </div>
  )
}
