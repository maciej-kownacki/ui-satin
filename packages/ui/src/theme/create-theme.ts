/**
 * Satin theming: one small config in, CSS variables out.
 *
 * Every Satin component reads tokens, never raw values, so a theme only has to repoint a few
 * of them and the whole system follows:
 *
 * - `brand` replaces the brand ramp (the `--color-blue-*` primitives and the dark-mode primary
 *   primitives). Each step keeps the lightness of the original ramp, takes the brand's hue and
 *   scales its chroma, so tints, borders and soft tones stay in the same places. The solid
 *   steps (hover, rest, pressed) are moved to the brand's own lightness, and the text on them
 *   switches to dark when white would fall under 4.5:1.
 * - `radius` scales every corner token; 1 is Satin's own, 0 is square. Pills stay pills.
 * - `fontSize` is the body size, 13 or 14; the rest of the type scale keeps its steps from it.
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
const DARK_TEXT = '#18181B'

function brandVars(brand: string): { root: Vars; dark: Vars } {
  const [bl, bc, bh] = rgbToOklch(hexToRgb(brand))
  const [rl, rc, rh] = rgbToOklch(hexToRgb(RAMP['blue-600']))
  const chroma = bc / rc
  const root: Vars = {}
  for (const [step, hex] of Object.entries(RAMP)) {
    const [l, c, h] = rgbToOklch(hexToRgb(hex))
    // Solid steps keep their distance from blue-600 but sit around the brand's lightness.
    const L = SOLID.has(step) ? Math.min(0.97, Math.max(0.2, bl + (l - rl))) : l
    root[`--color-${step}`] = step === 'blue-600' ? brand.toUpperCase() : oklchToHex([L, c * chroma, bh + (h - rh)])
  }
  root['--color-blue-600-a20'] = `${root['--color-blue-600']}33`
  root['--color-blue-500-a20'] = `${root['--color-blue-500']}33`
  root['--color-primary-focus-dark'] = `${root['--color-primary-dark']}33`

  // White text on the brand when it reads at 4.5:1, dark text otherwise.
  const fg = (bg: string) => (contrast(bg, '#FFFFFF') >= 4.5 ? '#FFFFFF' : DARK_TEXT)
  root['--action-primary-fg'] = fg(root['--color-blue-600'])
  const dark: Vars = { '--action-primary-fg': fg(root['--color-primary-dark']) }
  return { root, dark }
}

/* ---------- Radius and type ---------- */

const RADII: Record<string, number> = { xs: 4, sm: 6, md: 8, xl: 12, '2xl': 16, '3xl': 20 }

function radiusVars(scale: number): Vars {
  const v: Vars = {}
  for (const [k, px] of Object.entries(RADII)) v[`--radius-${k}`] = `${Math.round(px * scale * 2) / 2}px`
  v['--radius'] = `${Math.round(10 * scale * 2) / 2}px`
  return v
}

// Steps from the body size (sm): 13 gives 10 / 12 / 13 / 14 / 16 / 20 / 24, Satin's own scale.
const TYPE: Record<string, number> = { '2xs': -3, xs: -1, sm: 0, base: 1, lg: 3, xl: 7, '2xl': 11 }

function typeVars(body: number): Vars {
  const v: Vars = {}
  for (const [k, d] of Object.entries(TYPE)) v[`--text-${k}`] = `${body + d}px`
  return v
}

/* ---------- Output ---------- */

export function themeVars(theme: SatinTheme): { root: Vars; dark: Vars } {
  const brand = brandVars(theme.brand)
  return {
    root: { ...brand.root, ...radiusVars(theme.radius), ...typeVars(theme.fontSize) },
    dark: brand.dark,
  }
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
    block('.dark', dark),
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
