import * as React from 'react'
import { cn } from '../lib/utils'

/**
 * The agent's loading marks, from the uiKit: the tetris mark (uiKit "tetris", 3215:81593, beside
 * its label in thinkingHeader, 3215:81620) and the flappy bird (flappyAgent, 1215:69019).
 *
 * Tetris: the kit's grid of 5 × 4 dots on a 16px mark, tetrominoes falling into it a row at a
 * time. A full row fades back to the grid and what stood on it comes down; five rounds of five
 * pieces, each ending on an empty board. As a row clears a band of light crosses the dots (and
 * only the dots) and runs on through the label: `glimmer="color"` is glimm.dev's prism,
 * `neutral` a band of text/default. Plain CSS animations on transform and opacity; the
 * keyframes are written once from the script below into one <style>, the static rules are in
 * styles/components/agent-loading.css.
 *
 * Flappy: the 17 × 12 pixel bird running in place. It has one frame, so it is stacked as clipped
 * copies of itself — the body and the wing — and the wing and the whole bird step one sprite
 * pixel on a four-beat cycle.
 */
export type Glimmer = 'color' | 'neutral'

const COLS = 5
const ROWS = 4

/** Every shape the game has, in every turn used here, as [row, col] from its top left. */
const PIECES = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]],
  'I|': [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [0, 1], [1, 0], [1, 1]],
  T: [[0, 1], [1, 0], [1, 1], [1, 2]],
  'T↓': [[0, 0], [0, 1], [0, 2], [1, 1]],
  'T>': [[0, 0], [1, 0], [1, 1], [2, 0]],
  'T<': [[0, 1], [1, 0], [1, 1], [2, 1]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
  'S|': [[0, 0], [1, 0], [1, 1], [2, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
  'Z|': [[0, 1], [1, 0], [1, 1], [2, 0]],
  L: [[0, 2], [1, 0], [1, 1], [1, 2]],
  'L|': [[0, 0], [1, 0], [2, 0], [2, 1]],
  'L↓': [[0, 0], [0, 1], [0, 2], [1, 0]],
  'L|↓': [[0, 0], [0, 1], [1, 1], [2, 1]],
  J: [[0, 0], [1, 0], [1, 1], [1, 2]],
  'J|': [[0, 1], [1, 1], [2, 0], [2, 1]],
  'J↓': [[0, 0], [0, 1], [0, 2], [1, 2]],
  'J|↓': [[0, 0], [0, 1], [1, 0], [2, 0]]
} as const satisfies Record<string, readonly (readonly [number, number])[]>

type Piece = keyof typeof PIECES
/** A piece and the column its left edge comes down. */
type Drop = [Piece, number]

/**
 * Five rounds of five pieces each. Twenty dots fill the board exactly, so
 * every round ends empty — the last piece clears what is left — and the next
 * one starts on the bare grid. Between them the rounds use all seven shapes.
 */
const ROUNDS: Drop[][] = [
  // after Figma's frames: two Js build a tower in the middle, then the sides fill in and it goes in two clears
  [['J|', 1], ['J|↓', 1], ['O', 3], ['I|', 0], ['O', 3]],
  // a square and an L lay the floor; four clears, nearly a row a piece
  [['O', 0], ['L', 2], ['S', 2], ['J', 0], ['I', 1]],
  // a T to start, a J standing in the corner, a bar laid over both
  [['T', 0], ['J|', 3], ['I', 0], ['S', 2], ['L↓', 0]],
  // a pillar on the left, an L and a J lean on it, a Z and a T close it
  [['I|', 0], ['L|', 1], ['J↓', 2], ['Z|', 3], ['T↓', 1]],
  // a bar off the left edge, a Z tucked under the gap, a square in the corner
  [['I', 1], ['Z|', 0], ['J', 2], ['O', 3], ['L↓', 0]]
]

/** Milliseconds. One row of fall, the glide inside it, and everything between. */
const T = {
  step: 90,
  glide: 60,
  /** after a piece rests, before a clear or the next piece */
  lock: 220,
  /** a cleared row fading back to the board */
  clear: 260,
  /** what was above it coming down */
  settle: 200,
  /** between the settle and the next piece */
  next: 80,
  /** the empty board between rounds */
  rest: 150,
  /** the glimm band crossing the mark at a clear, and its fade once across */
  sweep: 520,
  outro: 120,
  /** how long before the fade the band sets off */
  lead: 120,
  /** the same band in the label: it picks up after the mark, a little slower across the longer text */
  textDelay: 220,
  textSweep: 600
}

/** One row down, in px — the Figma grid's 2 px dot and 1 px gap. */
const PITCH = 3

/** A moment on a timeline: an offset down in px (and, for a dot, how visible); `glide` eases into the next key. */
type Key = { t: number; y: number; on?: number; glide?: boolean }
/** A dot rests at its place on the board; its keys only move it down after a clear and fade it out. */
type Dot = { col: number; row: number; keys: Key[] }
/** A piece falls as one: its keys bring its dots from above the board to where they rest. */
type Fall = { keys: Key[]; dots: Dot[] }

/** Every piece of every round with its timeline over the whole loop, and the loop's length. */
function playRounds(rounds: Drop[][] = ROUNDS): { falls: Fall[]; clears: number[]; loop: number } {
  const falls: Fall[] = []
  /** when each clear starts, for the glimm band */
  const clears: number[] = []
  let t = 0

  for (const [n, round] of rounds.entries()) {
    // where each resting dot is now, for collisions and clears
    const board: { dot: Dot; row: number }[] = []

    for (const [name, x] of round) {
      const shape = PIECES[name]
      const height = Math.max(...shape.map(([r]) => r)) + 1
      const taken = (r: number, c: number) => r >= ROWS || board.some((b) => b.row === r && b.dot.col === c)
      // the lowest top row it can rest at, falling straight down from above the board
      let top = -height
      while (!shape.some(([r, c]) => taken(top + 1 + r, x + c))) top++
      if (shape.some(([r]) => top + r < 0)) throw new Error(`tetris round ${n + 1}: ${name} at ${x} sticks out of the top`)
      if (shape.some(([, c]) => x + c >= COLS)) throw new Error(`tetris round ${n + 1}: ${name} at ${x} sticks out of the side`)

      // from just above the board (clipped), a row a step: a quick glide, then a beat at rest
      const rows = top + height
      const fall: Fall = { keys: [{ t: 0, y: -rows * PITCH }], dots: [] }
      for (let s = 0; s < rows; s++) {
        fall.keys.push({ t, y: (s - rows) * PITCH, glide: true }, { t: t + T.glide, y: (s + 1 - rows) * PITCH })
        t += T.step
      }
      for (const [r, c] of shape) {
        const dot: Dot = { col: x + c, row: top + r, keys: [{ t: 0, y: 0, on: 1 }] }
        fall.dots.push(dot)
        board.push({ dot, row: dot.row })
      }
      falls.push(fall)
      t += T.lock

      const full = [...new Set(board.map((b) => b.row))].filter((r) => board.filter((b) => b.row === r).length === COLS)
      if (!full.length) continue
      clears.push(t)

      // the full rows fade back to the board; what stood above them comes down
      for (const { dot, row } of board.filter((b) => full.includes(b.row))) {
        const y = (row - dot.row) * PITCH
        dot.keys.push({ t, y, on: 1, glide: true }, { t: t + T.clear, y, on: 0 })
      }
      t += T.clear
      const kept = board.filter((b) => !full.includes(b.row))
      for (const b of kept) {
        const down = full.filter((r) => r > b.row).length
        if (!down) continue
        b.dot.keys.push({ t, y: (b.row - b.dot.row) * PITCH, on: 1, glide: true }, { t: t + T.settle, y: (b.row + down - b.dot.row) * PITCH, on: 1 })
        b.row += down
      }
      board.splice(0, board.length, ...kept)
      t += T.settle + T.next
    }

    if (board.length) throw new Error(`tetris round ${n + 1} leaves ${board.length} dots on the board`)
    t += T.rest
  }

  return { falls, clears, loop: t }
}

// movement on the kit's ease-out, a quick start that settles; a fade on plain ease, so the full row is seen going
const GLIDE = 'animation-timing-function:cubic-bezier(0.22,1,0.36,1)'
const FADE = 'animation-timing-function:ease'

/**
 * The CSS: `satin-tetris-f<i>` for each piece's fall, `satin-tetris-d<i>` for each of its
 * dots, `satin-tetris-glimm` for the band on the mark and `satin-tetris-glimm-text` for
 * it in the label, over a loop of `loop` ms.
 *
 * The band (glimm.dev's sweep) crosses the mark left to right as a row
 * clears, on glimm's default `ease`, then fades out past the right edge; it
 * carries on into the label as the mark's sweep runs out. Between sweeps it
 * goes back invisible.
 */
function keyframes(falls: Fall[], clears: number[], loop: number): string {
  const pct = (t: number) => `${+((t / loop) * 100).toFixed(3)}%`
  const block = (name: string, keys: Key[]) => {
    const all = [...keys, { ...keys[keys.length - 1], t: loop, glide: false }]
    const frames = all.map((k) => {
      const props = [`transform:translateY(${k.y}px)`]
      if (k.on !== undefined) props.push(`opacity:${k.on}`)
      if (k.glide) props.push(k.on === 1 && keys[keys.indexOf(k) + 1]?.on === 0 ? FADE : GLIDE)
      return `${pct(k.t)}{${props.join(';')}}`
    })
    return `@keyframes ${name}{${frames.join('')}}`
  }
  let d = 0
  const pieces = falls.flatMap((f, i) => [block(`satin-tetris-f${i}`, f.keys), ...f.dots.map((dot) => block(`satin-tetris-d${d++}`, dot.keys))])
  const band = (x: number, on: number, ease = '') => `{transform:translateX(${x}%);opacity:${on}${ease}}`
  // it sets off a beat before the fade, so the light runs over the full row as it goes
  const sweeps = clears.map((c) => c - T.lead).flatMap((t) => [
    `${pct(t - 1)}${band(-100, 0)}`,
    `${pct(t)}${band(-100, 1, ';animation-timing-function:ease')}`,
    `${pct(t + T.sweep)}${band(100, 1, ';animation-timing-function:ease-out')}`,
    `${pct(t + T.sweep + T.outro)}${band(100, 0)}`
  ])
  const glimm = `@keyframes satin-tetris-glimm{0%${band(-100, 0)}${sweeps.join('')}100%${band(100, 0)}}`
  // in the label the band is a text-clipped background three widths wide: 100% is off the left, 0% off the right
  const text = (x: number, on: number, ease = '') => `{background-position:${x}% 0;opacity:${on}${ease}}`
  const textSweeps = clears.map((c) => c - T.lead + T.textDelay).flatMap((t) => [
    `${pct(t - 1)}${text(100, 0)}`,
    `${pct(t)}${text(100, 1, ';animation-timing-function:ease')}`,
    `${pct(t + T.textSweep)}${text(0, 1, ';animation-timing-function:ease-out')}`,
    `${pct(t + T.textSweep + T.outro)}${text(0, 0)}`
  ])
  const glimmText = `@keyframes satin-tetris-glimm-text{0%${text(100, 0)}${textSweeps.join('')}100%${text(0, 0)}}`
  return [...pieces, glimm, glimmText].join('\n')
}


const { falls, clears, loop } = playRounds()

if (typeof document !== 'undefined' && !document.querySelector('style[data-satin-tetris]')) {
  const style = document.createElement('style')
  style.dataset.satinTetris = ''
  style.textContent = keyframes(falls, clears, loop)
  document.head.append(style)
}

const GRID = Array.from({ length: COLS * ROWS }, (_, i) => i)

/** The tetris mark. Memoised: its 125 animated elements never re-render with their parent. */
export const TetrisMark = React.memo(function TetrisMark({ glimmer = 'color', className }: { glimmer?: Glimmer; className?: string }) {
  let d = 0
  return (
    <span
      aria-hidden
      data-glimmer={glimmer}
      className={cn('satin-tetris', className)}
      style={{ '--satin-tetris-loop': `${loop}ms` } as React.CSSProperties}
    >
      <span className="satin-tetris__board">
        {GRID.map((i) => (
          <i key={i} />
        ))}
        {falls.map((fall, f) => (
          <span key={f} className="satin-tetris__fall" style={{ animationName: `satin-tetris-f${f}` }}>
            {fall.dots.map((dot) => (
              <b key={d} style={{ '--c': dot.col, '--r': dot.row, animationName: `satin-tetris-d${d++}` } as React.CSSProperties} />
            ))}
          </span>
        ))}
        <span className="satin-tetris__glimm">
          <span />
        </span>
      </span>
    </span>
  )
})

/** The tetris mark at rest, every dot filled: the finished header's mark. */
export function TetrisStill({ className }: { className?: string }) {
  return (
    <span aria-hidden data-still className={cn('satin-tetris', className)}>
      <span className="satin-tetris__board">
        {GRID.map((i) => (
          <i key={i} />
        ))}
      </span>
    </span>
  )
}

/**
 * The label beside the mark: a shimmer, and on top a copy of the text the band crosses after the
 * mark, on the same loop, so the light runs from the icon on through the word.
 */
export function TetrisLabel({ children, glimmer = 'color', className }: { children: React.ReactNode; glimmer?: Glimmer; className?: string }) {
  return (
    <span
      data-glimmer={glimmer}
      className={cn('satin-tetris-label', className)}
      style={{ '--satin-tetris-loop': `${loop}ms` } as React.CSSProperties}
    >
      <span className="satin-shimmer">{children}</span>
      <span className="satin-tetris-label__glimm" aria-hidden>
        <span>{children}</span>
      </span>
    </span>
  )
}

/** The label shimmer alone (a band of ink passing through muted text), for the flappy header. */
export function ShimmerLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('satin-shimmer', className)}>{children}</span>
}

const FLAPPY = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAMCAYAAACEJVa/AAAAa0lEQVR42mNgwA3+48BEAbDi/6+tUTBYDAiIMQhDM7IBMIDLIBQn4zMEl4v+owN0g8gyhJBB2A0BKUQGME1YvIUvtjBtxRYu4UoYGMMgeMAeZEfBMANISTcYhiAbhM8V2BMcFoPIScFEaQAAya9DoeSCRfcAAAAASUVORK5CYII='
// [top, right, bottom, left) in sprite pixels: the body in three bands around the wing, and the wing.
const FLAPPY_PARTS: { role: 'body' | 'wing'; rect: [number, number, number, number] }[] = [
  { role: 'body', rect: [0, 17, 3, 0] },
  { role: 'body', rect: [3, 17, 8, 6] },
  { role: 'body', rect: [8, 17, 12, 0] },
  { role: 'wing', rect: [3, 6, 8, 0] },
]

/** The flappy bird fitted into a `size` square; `run` plays the run in place. */
export function FlappySprite({ size = 16, run = true, className }: { size?: number; run?: boolean; className?: string }) {
  const cols = 17
  const rows = 12
  return (
    <span
      aria-hidden
      data-run={run || undefined}
      className={cn('satin-sprite', className)}
      style={{ width: size, height: size, '--rows': rows, '--cols': cols } as React.CSSProperties}
    >
      <span className="satin-sprite__frame" style={{ width: size, height: (size * rows) / cols }}>
        {FLAPPY_PARTS.map(({ role, rect: [t, r, b, l] }, i) => (
          <img
            key={i}
            src={FLAPPY}
            alt=""
            draggable={false}
            data-role={role}
            className="satin-sprite__part"
            style={{ clipPath: `inset(${(t / rows) * 100}% ${(1 - r / cols) * 100}% ${(1 - b / rows) * 100}% ${(l / cols) * 100}%)` }}
          />
        ))}
      </span>
    </span>
  )
}
