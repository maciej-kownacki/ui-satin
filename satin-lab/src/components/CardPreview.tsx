import * as React from 'react'
import { createPortal } from 'react-dom'
import { Skeleton } from '@uisatin/ui/skeleton'
import { ShowcasePreview } from './Showcase'

type Demo = React.ComponentType<{ codeHtml: Record<string, string> }>
// Each page's demo in its own chunk, loaded when its card comes into view.
const demos = import.meta.glob<{ default: Demo }>('../demos/*.tsx')

/** The column a component page's stage gives its demo (720 minus 40 a side), so it lays out as there. */
const STAGE_WIDTH = 640

/** What a demo can open that Radix closes on a scroll, a click or Escape elsewhere on the page. */
const OVERLAYS = '[data-radix-popper-content-wrapper], [role=dialog], [role=alertdialog], [role=menu], [role=tooltip], [data-slot=hover-card]'

/**
 * Everything in `root` that paints (text, fills, edges, shadows, images), as one box on screen.
 * A list that scrolls counts as tall as it shows, not as all its rows (how many have loaded by
 * the time it is measured would change the fit).
 */
function drawnBox(root: Element) {
  let [l, t, r, b] = [Infinity, Infinity, -Infinity, -Infinity]
  const walk = (parent: Element, top: number, bottom: number) => {
    for (const el of parent.children) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none') continue
      const q = el.getBoundingClientRect()
      const paints =
        cs.visibility !== 'hidden' &&
        (!/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) ||
          parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) > 0 ||
          cs.boxShadow !== 'none' ||
          /^(svg|img|canvas|video|input|textarea)$/i.test(el.tagName) ||
          [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()) ||
          // Room kept for content still to come (text that streams in), so the fit doesn't change as it fills.
          parseFloat(cs.minHeight) > 0)
      const qt = Math.max(top, q.top)
      const qb = Math.min(bottom, q.bottom)
      if (paints && q.width >= 1 && qb - qt >= 1) {
        l = Math.min(l, q.left)
        t = Math.min(t, qt)
        r = Math.max(r, q.right)
        b = Math.max(b, qb)
      }
      const scrolls = /auto|scroll/.test(cs.overflowY)
      walk(el, scrolls ? Math.max(top, q.top) : top, scrolls ? Math.min(bottom, q.bottom) : bottom)
    }
  }
  walk(root, -Infinity, Infinity)
  return isFinite(l) ? { l, t, r, b } : null
}

/** Animations that end (a menu or dialog opening, a sheet sliding in), not loops like a spinner. */
function endingAnimations(root: Element) {
  return root.getAnimations({ subtree: true }).filter((a) => {
    const n = a.effect?.getComputedTiming().iterations
    return n !== undefined && Number.isFinite(n) && a.playState === 'running'
  })
}

/**
 * A copy's menus are position: fixed, placed against the layer's transform. Safari scrolls
 * those on its own scrolling thread as if fixed to the window, so while the page scrolls they
 * trail behind their card and snap back when it stops. Absolute does the same layout without
 * that; where it would take a nearer positioned ancestor as its box, a margin puts it back.
 */
function unfix(root: Element) {
  const fixed = [...root.querySelectorAll<HTMLElement>('*')].filter((el) => getComputedStyle(el).position === 'fixed')
  for (const el of fixed) {
    const was = el.getBoundingClientRect()
    el.style.position = 'absolute'
    const now = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (now.left !== was.left) el.style.marginLeft = `${parseFloat(cs.marginLeft) + was.left - now.left}px`
    if (now.top !== was.top) el.style.marginTop = `${parseFloat(cs.marginTop) + was.top - now.top}px`
  }
}

type Box = { x: number; y: number; w: number; h: number }

/**
 * Where the demo goes in a frame of this size: what it draws fits inside the card with room
 * around it. A demo taller than the card (a whole form, a combobox with its list) shows from the
 * top; a very tall one fits its width instead of its height. Never scaled up. Whole device
 * pixels, so its edges and text stay crisp and don't shimmer as the page scrolls.
 */
function fitIn(box: Box, FW: number, FH: number) {
  const byWidth = Math.min(1, (FW - 40) / box.w)
  const whole = Math.min(byWidth, (FH - 32) / box.h)
  const tall = whole < 0.5
  const k = +(tall ? byWidth : whole).toFixed(3)
  const fromTop = tall || box.h * k > FH - 32
  const px = (n: number) => Math.round(n * devicePixelRatio) / devicePixelRatio
  return {
    scale: k,
    x: px(FW / 2 - (box.x + box.w / 2) * k),
    y: px(fromTop ? 20 - box.y * k : FH / 2 - (box.y + box.h / 2) * k),
  }
}

/**
 * A card's preview on the All components page: the page's own demo, live, as its stage first
 * shows it (ShowcasePreview), scaled down to fit the card and never up. Real elements, not a
 * picture, so it stays sharp at any resolution and follows the theme and the Customize brand.
 * Looked at, not used: inert, and hidden from screen readers (the card's link names it).
 *
 * The demo first mounts in an invisible holder pinned near the window's top-left corner, where
 * its menus and tooltips have the whole window to open into and nothing that scrolls closes
 * them. It stays there until it has settled: its menus placed, its opening animations done and
 * what it draws the same size for a few frames. Only then is it measured, once, and placed in
 * the card at its final scale and position, so it appears where it stays and never moves or
 * rescales after (a later fit only follows the card itself changing size). In the card the
 * demo carries on, live; one that opened a menu, tooltip or dialog is copied into the card
 * instead (still real elements), since Radix would close those on the next scroll, click or
 * Escape. Either way, opening animations that would play again in the card are finished at once.
 *
 * In the card, the frame crops with clip-path (an overflow would make Radix squeeze menus
 * inside it), and one layer moves and scales the demo with a transform; that layer is also the
 * containing block of the copied menus, so they move and scale with it. The copies are made
 * position: absolute (unfix), since Safari moves fixed ones apart from their card as it scrolls.
 */
export function CardPreview({ id }: { id: string }) {
  const [Demo, setDemo] = React.useState<Demo | null>(null)
  const frame = React.useRef<HTMLDivElement>(null)
  const layer = React.useRef<HTMLDivElement>(null)
  const [holder] = React.useState(() => (typeof document === 'undefined' ? null : document.createElement('div')))
  const [phase, setPhase] = React.useState<'staging' | 'live' | 'copied'>('staging')
  // What the demo draws, in the layer's own (unscaled) pixels, measured once when it has settled.
  const [box, setBox] = React.useState<Box | null>(null)
  const [view, setView] = React.useState({ scale: 0, x: 0, y: 0 })
  // The skeleton shows until the demo is placed, then fades out and goes (its band would keep
  // running under an invisible layer otherwise).
  const [skeleton, setSkeleton] = React.useState(true)
  React.useEffect(() => {
    if (!view.scale) return
    const t = window.setTimeout(() => setSkeleton(false), 400)
    return () => window.clearTimeout(t)
  }, [view.scale])

  React.useEffect(() => {
    let live = true
    demos[`../demos/${id}.tsx`]?.().then((m) => live && setDemo(() => m.default))
    return () => {
      live = false
    }
  }, [id])

  // Staging: the holder sits invisible at the window's corner while the demo mounts, places its
  // menus and finishes opening; then it is measured and goes into the card, as itself or as a copy.
  React.useLayoutEffect(() => {
    if (!holder || !Demo) return
    // 200px in from the corner, so a tooltip has room above; a transform makes the holder the
    // menus' containing block, so their places are relative to it and survive the copy.
    Object.assign(holder.style, { position: 'fixed', left: '200px', top: '200px', width: `${STAGE_WIDTH}px`, transform: 'translateZ(0)', opacity: '0', pointerEvents: 'none', zIndex: '-1' })
    holder.setAttribute('inert', '')
    holder.setAttribute('aria-hidden', 'true')
    holder.className = 'flex justify-center'
    document.body.appendChild(holder)
    const start = performance.now()
    let raf = 0
    let frames = 0
    let last = ''
    let same = 0
    const settle = () => {
      raf = requestAnimationFrame(() => {
        frames++
        // Radix parks a popper at -200% until Floating UI has placed it.
        const unplaced = [...holder.querySelectorAll<HTMLElement>('[data-radix-popper-content-wrapper]')].some((w) => w.style.transform.includes('-200%'))
        const opening = endingAnimations(holder).length > 0
        const h = holder.getBoundingClientRect()
        const d = drawnBox(holder)
        const key = d ? [d.l - h.left, d.t - h.top, d.r - h.left, d.b - h.top].map((n) => n.toFixed(1)).join() : ''
        same = key === last ? same + 1 : 0
        last = key
        // What it draws the same for six frames; a loop (a spinner turning) never is, so 40 frames do.
        const settled = frames >= 4 && !unplaced && !opening && d && (same >= 6 || frames >= 40)
        // Two seconds at most, whatever happens.
        if (!settled && performance.now() - start < 2000) return settle()
        const target = layer.current
        const f = frame.current
        if (!target || !f || !d) return
        const measured = { x: d.l - h.left, y: d.t - h.top, w: d.r - d.l, h: d.b - d.t }
        setBox(measured)
        setView(fitIn(measured, f.clientWidth, f.clientHeight))
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
        // Moved or copied, an element plays its opening animation again; show it as it ended instead.
        for (const a of endingAnimations(target)) a.finish()
        if (target.firstChild !== holder) unfix(target)
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

  // The card itself can change size (the window resizing, the grid's columns changing); fit the
  // same measured box to it again. The demo's own changes after it was placed never move it.
  React.useEffect(() => {
    const f = frame.current
    if (!f || !box) return
    const ro = new ResizeObserver(() => {
      const next = fitIn(box, f.clientWidth, f.clientHeight)
      setView((v) => (v.scale === next.scale && v.x === next.x && v.y === next.y ? v : next))
    })
    ro.observe(f)
    return () => ro.disconnect()
  }, [box])

  return (
    <div ref={frame} inert aria-hidden className="absolute inset-0 [clip-path:inset(0)]">
      {skeleton && (
        // A loading card: Satin's Skeleton, animated, rendered on the server too, so it is there
        // before the demo's code arrives.
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-10 transition-opacity duration-(--duration-base) ease-(--ease-out)"
          style={{ opacity: view.scale ? 0 : 1 }}
        >
          <div className="flex w-full max-w-[220px] items-center gap-3">
            <Skeleton shape="circle" animated />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton animated width="100%" />
              <Skeleton animated width="60%" />
            </div>
          </div>
          <Skeleton shape="rect" animated width="100%" height={56} className="max-w-[220px]" />
        </div>
      )}
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
