/**
 * Reads the theme colours from tokens/tokens.json (the source of truth) for the Tokens page,
 * so the page can't drift from the code: every alias is followed to its value, per mode.
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

type Mode = 'Light' | 'Dark'
const valueIn = (e: Entry, mode: Mode): unknown =>
  mode === 'Dark' ? (e.$extensions?.['com.satin']?.modes?.Dark ?? e.$value) : e.$value

/** Follows aliases to a literal. Theme-to-theme aliases stay in the same mode. */
function resolve(v: unknown, mode: Mode): unknown {
  if (!isAlias(v)) return v
  const t = target(v)
  return resolve(t.path[0] === 'theme' ? valueIn(t, mode) : t.$value, mode)
}

const of = (collection: string) => [...flat.values()].filter((e) => e.path[0] === collection)

export type ColorToken = { name: string; css: string; light: string; dark: string }

const roles: Record<string, { title: string; description: string }> = {
  bg: { title: 'Background', description: 'Surfaces from the canvas up to popovers, and their hover and selected fills.' },
  text: { title: 'Text', description: 'Copy on every surface, from default to placeholder and on solid fills.' },
  border: { title: 'Border', description: 'Hairlines, dividers, field outlines and the focus ring.' },
  action: { title: 'Action', description: 'Buttons and other controls, per variant and state.' },
  status: { title: 'Status', description: 'Info, success, warning and error, for alerts, toasts and fields.' },
  chart: { title: 'Chart', description: 'Series colours for bars, lines and shares.' },
  component: { title: 'Component', description: 'Values only one component uses, like tones and the scrollbar.' },
  effect: { title: 'Effect', description: 'Shadow and glow colours.' },
}

export const colorGroups = Object.keys(roles).map((role) => ({
  role,
  ...roles[role],
  tokens: of('theme')
    .filter((e) => e.path[1] === role)
    .map(
      (e): ColorToken => ({
        name: e.path.slice(1).join('/'),
        css: css(e),
        light: String(resolve(e.$value, 'Light')),
        dark: String(resolve(valueIn(e, 'Dark'), 'Dark')),
      }),
    ),
}))
