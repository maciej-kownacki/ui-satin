/**
 * Reads tokens/tokens.json (the source of truth) for the Tokens page, so the page can't
 * drift from the code: every alias is followed to its value, per mode for theme colours.
 */
import tokens from '../../../tokens/tokens.json'

type Node = {
  $type?: string
  $value: unknown
  $description?: string
  $extensions?: { 'com.satin'?: { css?: string; modes?: Record<string, unknown> } }
}
type Entry = Node & { path: string[] }

const flat = new Map<string, Entry>()
;(function walk(node: Record<string, unknown>, path: string[]) {
  if (node && typeof node === 'object' && '$value' in node) {
    flat.set(path.join('.'), { ...(node as Node), path })
    return
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v as Record<string, unknown>, [...path, k])
})(tokens as unknown as Record<string, unknown>, [])

const isAlias = (v: unknown): v is string => typeof v === 'string' && /^\{.+\}$/.test(v)
const target = (v: string) => flat.get(v.slice(1, -1))!
const css = (e: Entry) => e.$extensions?.['com.satin']?.css ?? ''
const dim = (v: unknown) => (typeof v === 'object' && v && 'value' in v ? (v as { value: number }).value : (v as number))

type Mode = 'Light' | 'Dark'
const valueIn = (e: Entry, mode: Mode): unknown =>
  mode === 'Dark' ? (e.$extensions?.['com.satin']?.modes?.Dark ?? e.$value) : e.$value

/** Follows aliases to a literal. Theme-to-theme aliases stay in the same mode. */
function resolve(v: unknown, mode: Mode): unknown {
  if (!isAlias(v)) return v
  const t = target(v)
  return resolve(t.path[0] === 'theme' ? valueIn(t, mode) : t.$value, mode)
}

/** The primitive a theme colour ends on, e.g. `zinc/950`. */
function primitiveName(v: unknown, mode: Mode): string | undefined {
  if (!isAlias(v)) return undefined
  const t = target(v)
  if (t.path[0] === 'primitives') return t.path.slice(1).join('/')
  return primitiveName(valueIn(t, mode), mode)
}

const of = (collection: string) => [...flat.values()].filter((e) => e.path[0] === collection)

export type ColorToken = {
  name: string
  css: string
  description?: string
  light: { value: string; primitive?: string }
  dark: { value: string; primitive?: string }
}

const roleTitles: Record<string, string> = {
  bg: 'Background',
  text: 'Text',
  border: 'Border',
  action: 'Action',
  status: 'Status',
  chart: 'Chart',
  component: 'Component',
  effect: 'Effect',
}

export const colorGroups = Object.keys(roleTitles).map((role) => ({
  role,
  title: roleTitles[role],
  description: (tokens.theme as Record<string, { $description?: string }>)[role]?.$description,
  tokens: of('theme')
    .filter((e) => e.path[1] === role)
    .map(
      (e): ColorToken => ({
        name: e.path.slice(1).join('/'),
        css: css(e),
        description: e.$description,
        light: { value: String(resolve(e.$value, 'Light')), primitive: primitiveName(e.$value, 'Light') },
        dark: { value: String(resolve(valueIn(e, 'Dark'), 'Dark')), primitive: primitiveName(valueIn(e, 'Dark'), 'Dark') },
      }),
    ),
}))

export const radii = of('radius').map((e) => ({
  name: e.path[1],
  css: css(e),
  px: dim(resolve(e.$value, 'Light')),
  description: e.$description,
}))

export const spacing = of('spacing')
  .filter((e) => e.path[1] === 'spacing')
  .map((e) => ({ name: `spacing/${e.path[2]}`, px: dim(resolve(e.$value, 'Light')), description: e.$description }))
  .sort((a, b) => a.px - b.px)

export const sizes = of('spacing')
  .filter((e) => e.path[1] === 'size')
  .map((e) => ({ name: `size/${e.path[2]}`, css: css(e), px: dim(resolve(e.$value, 'Light')), description: e.$description }))

const leading = (key: string) => dim(resolve(flat.get(`typography.leading.${key}--line-height`)?.$value, 'Light'))

export const textSizes = of('typography')
  .filter((e) => e.path[1] === 'text')
  .map((e) => ({ name: e.path[2], css: css(e), px: dim(resolve(e.$value, 'Light')), lineHeight: leading(e.path[2]) }))

export const fonts = of('typography')
  .filter((e) => e.$type === 'fontFamily')
  .map((e) => ({ name: e.path.slice(1).join('/'), css: css(e), value: String(resolve(e.$value, 'Light')) }))

export const weights = of('typography')
  .filter((e) => e.$type === 'fontWeight')
  .map((e) => ({ name: e.path.slice(1).join('/'), css: css(e), value: Number(resolve(e.$value, 'Light')) }))

export const shadows = Object.entries((tokens.styles as { effect: Record<string, { $description?: string }> }).effect)
  .filter(([k]) => !k.startsWith('$'))
  .map(([name, s]) => ({ name, css: `--${name}`, description: s.$description }))
