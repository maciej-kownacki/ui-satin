/**
 * Satin theming: one small config in, CSS variables out.
 *
 * Every Satin component reads tokens, never raw values, so a theme only has to repoint a few
 * of them and the whole system follows:
 *
 * - `brand` replaces the brand ramp (the `--color-blue-*` primitives and the dark-mode primary
 *   primitives). Each step keeps the lightness of the original ramp, takes the brand's hue and
 *   scales its chroma, so tints, borders and soft tones stay in the same places. The solid
 *   steps (hover, rest, pressed) sit at the brand's own lightness, lowered just enough that
 *   white text reads at 4.5:1 on rest and hover, in Light and Dark. Labels stay white for
 *   every brand, so buttons look the same family whatever the colour.
 * - `radius` scales every corner token; 1 is Satin's own, 0 is square. Pills stay pills.
 * - `fontSize` is the body size, 13 or 14. It moves the content scale only (body, body-lg,
 *   title, heading, display): what people read. The UI scale (2xs to 2xl) that badges, chips,
 *   buttons, labels and menus use stays put, so controls keep their density.
 *
 * `themeVars()` returns the variables per mode; `themeCss()` the same as a stylesheet to load
 * after `@satin/ui/styles.css`.
 */

export interface SatinTheme {
  /** Brand colour as hex, e.g. "#4633D7". */
  brand: string
  /** Corner scale: 0, 0.5, 1 (default) or 1.5. */
  radius: number
  /** Body text size in px: 13 (default) or 14. */
  fontSize: 13 | 14
}

export const defaultTheme: SatinTheme = { brand: '#4633D7', radius: 1, fontSize: 13 }

type Vars = Record<string, string>

/* ---------- OKLCH ---------- */

type Lch = [number, number, number]

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6)
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [number, number, number]
}

function rgbToOklch([r, g, b]: [number, number, number]): Lch {
  const [lr, lg, lb] = [r, g, b].map(toLinear)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360]
}

function oklchToRgb([L, C, H]: Lch): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = (rgb: number[]) => rgb.every((c) => c >= -0.0005 && c <= 1.0005)

/** OKLCH to hex, lowering chroma until the colour fits sRGB. */
function oklchToHex([L, C, H]: Lch) {
  let c = C
  let rgb = oklchToRgb([L, c, H])
  while (!inGamut(rgb) && c > 0) {
    c = Math.max(0, c - 0.005)
    rgb = oklchToRgb([L, c, H])
  }
  return '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/* ---------- Brand ---------- */

// Satin's own brand ramp. Each generated step keeps its lightness and chroma ratio.
const RAMP: Record<string, string> = {
  'blue-50': '#F2F4FF',
  'blue-200': '#CFD6FF',
  'blue-300': '#B1BBFE',
  'blue-500': '#5146E9',
  'blue-600': '#4633D7',
  'blue-700': '#3923B9',
  'blue-900': '#1D1168',
  'blue-950': '#110A47',
  'blue-soft-50': '#F3F5FF',
  'blue-soft-200': '#D9DEFB',
  'blue-soft-300': '#BEC7FC',
  'blue-soft-700': '#5158A0',
  'blue-soft-900': '#30344F',
  'blue-soft-950': '#1F2132',
  'primary-dark': '#493DD6',
  'primary-hover-dark': '#554FE7',
  'primary-pressed-dark': '#3E2AC5',
  'primary-border-light': '#9085E7',
  'primary-border-dark': '#928BE6',
}
// The steps a button is painted with: they move with the brand's lightness.
const SOLID = new Set(['blue-500', 'blue-600', 'blue-700', 'primary-dark', 'primary-hover-dark', 'primary-pressed-dark'])

// Darkest the solid fill may need to go: white on it, and on its hover, reads at 4.5:1
// (aimed at 4.7, since fitting each step into sRGB trims its chroma a little).
function solidLightness(c: number, h: number, base: number, hoverStep: number) {
  const passes = (L: number) =>
    contrast(oklchToHex([L, c, h]), '#FFFFFF') >= 4.7 && contrast(oklchToHex([L + hoverStep, c, h]), '#FFFFFF') >= 4.7
  if (passes(base)) return base
  let lo = 0.2
  let hi = base
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (passes(mid)) lo = mid
    else hi = mid
  }
  return lo
}

function brandVars(brand: string): Vars {
  const [bl, bc, bh] = rgbToOklch(hexToRgb(brand))
  const lch = (step: string) => rgbToOklch(hexToRgb(RAMP[step]))
  const [rl, rc, rh] = lch('blue-600')
  const chroma = bc / rc
  // Where the light and the dark solid fills sit: the brand's lightness, darker if white needs it.
  const light = solidLightness(bc, bh, bl, lch('blue-500')[0] - rl)
  const darkRest = lch('primary-dark')[0]
  const dark = solidLightness(bc, bh, light + (darkRest - rl), lch('primary-hover-dark')[0] - darkRest)
  const root: Vars = {}
  for (const [step, hex] of Object.entries(RAMP)) {
    const [l, c, h] = rgbToOklch(hexToRgb(hex))
    const isDark = step.endsWith('-dark') && step !== 'primary-border-dark'
    const L = SOLID.has(step) ? (isDark ? dark + (l - darkRest) : light + (l - rl)) : l
    root[`--color-${step}`] =
      step === 'blue-600' && light === bl ? brand.toUpperCase() : oklchToHex([Math.min(0.97, Math.max(0.15, L)), c * chroma, bh + (h - rh)])
  }
  root['--color-blue-600-a20'] = `${root['--color-blue-600']}33`
  root['--color-blue-500-a20'] = `${root['--color-blue-500']}33`
  root['--color-primary-focus-dark'] = `${root['--color-primary-dark']}33`
  return root
}

/* ---------- Radius and type ---------- */

const RADII: Record<string, number> = { xs: 4, sm: 6, md: 8, xl: 12, '2xl': 16, '3xl': 20 }

function radiusVars(scale: number): Vars {
  const v: Vars = {}
  for (const [k, px] of Object.entries(RADII)) v[`--radius-${k}`] = `${Math.round(px * scale * 2) / 2}px`
  v['--radius'] = `${Math.round(10 * scale * 2) / 2}px`
  return v
}

// The content scale, in steps from the body size: 13 gives 13 / 14 / 16 / 20 / 24.
const TYPE: Record<string, number> = { body: 0, 'body-lg': 1, title: 3, heading: 7, display: 11 }

function typeVars(body: number): Vars {
  const v: Vars = {}
  for (const [k, d] of Object.entries(TYPE)) v[`--text-${k}`] = `${body + d}px`
  return v
}

/* ---------- Output ---------- */

export function themeVars(theme: SatinTheme): { root: Vars; dark: Vars } {
  return { root: { ...brandVars(theme.brand), ...radiusVars(theme.radius), ...typeVars(theme.fontSize) }, dark: {} }
}

/** The theme as a stylesheet. Load it after `@satin/ui/styles.css`. */
export function themeCss(theme: SatinTheme) {
  const { root, dark } = themeVars(theme)
  const block = (sel: string, vars: Vars) =>
    `${sel} {\n${Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n')}\n}`
  return [
    `/* Satin theme: brand ${theme.brand.toUpperCase()}, radius ${theme.radius}, body ${theme.fontSize}px. */`,
    block(':root', root),
    ...(Object.keys(dark).length ? [block('.dark', dark)] : []),
    '',
  ].join('\n\n')
}

/* ---------- Random ---------- */

/** A random theme that still reads: a brand with enough chroma, any radius, either size. */
export function randomTheme(): SatinTheme {
  const hue = Math.random() * 360
  const l = 0.5 + Math.random() * 0.25
  const brand = oklchToHex([l, 0.12 + Math.random() * 0.08, hue])
  const radius = [0, 0.5, 1, 1.5][Math.floor(Math.random() * 4)]
  const fontSize = Math.random() < 0.5 ? 13 : 14
  return { brand, radius, fontSize }
}
