/**
 * A `window.matchMedia` for jsdom (which has none) that tests can drive: the two media features
 * Satin reads, `prefers-reduced-motion` and `prefers-color-scheme`. Changing one fires `change`
 * on every list whose answer changed, as a browser does, so components that listen follow along.
 */
type Listener = (event: MediaQueryListEvent) => void

const state = { reducedMotion: false, dark: false }
const lists = new Set<{ query: string; listeners: Set<Listener>; last: boolean; list: MediaQueryList }>()

function evaluate(query: string) {
  const q = query.replace(/\s+/g, '')
  if (q.includes('prefers-reduced-motion:reduce')) return state.reducedMotion
  if (q.includes('prefers-reduced-motion:no-preference')) return !state.reducedMotion
  if (q.includes('prefers-color-scheme:dark')) return state.dark
  if (q.includes('prefers-color-scheme:light')) return !state.dark
  return false
}

function notify() {
  for (const entry of lists) {
    const matches = evaluate(entry.query)
    if (matches === entry.last) continue
    entry.last = matches
    const event = Object.assign(new Event('change'), { matches, media: entry.query }) as MediaQueryListEvent
    for (const listener of entry.listeners) listener(event)
    entry.list.onchange?.call(entry.list, event)
  }
}

export function matchMedia(query: string): MediaQueryList {
  const listeners = new Set<Listener>()
  const list = {
    media: query,
    get matches() {
      return evaluate(query)
    },
    onchange: null as MediaQueryList['onchange'],
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    // The old Safari API some code still calls.
    addListener: (listener: Listener) => listeners.add(listener),
    removeListener: (listener: Listener) => listeners.delete(listener),
    dispatchEvent: () => true,
  } as unknown as MediaQueryList
  lists.add({ query, listeners, last: evaluate(query), list })
  return list
}

/** Turns `prefers-reduced-motion: reduce` on or off for the rest of the test. */
export function setReducedMotion(on: boolean) {
  state.reducedMotion = on
  notify()
}

/** Turns `prefers-color-scheme: dark` on or off (what `data-theme="system"` follows). */
export function setColorScheme(scheme: 'light' | 'dark') {
  state.dark = scheme === 'dark'
  notify()
}

/** Back to a light, full-motion system; the setup file calls it after every test. */
export function resetMedia() {
  state.reducedMotion = false
  state.dark = false
  notify()
  lists.clear()
}
