'use client'

import * as React from 'react'
import { FlappySprite, TetrisMark } from '@uisatin/ui/agent-loading'
import type { Agent } from '@uisatin/ui/agent-picker'
import { Avatar, type AvatarTone } from '@uisatin/ui/avatar'
import { Badge, type BadgeTone } from '@uisatin/ui/badge'
import { useSatinLabels } from '@uisatin/ui/labels'
import { cn } from '@uisatin/ui/lib/utils'

/**
 * AgentPresence: shows which row or card an agent is editing right now. It draws an edge in the
 * agent's tone over the target and a small label on the target's top edge, at its end corner
 * (the agent's mark playing and its name), and tells screen readers politely ("Satin is updating
 * Tara Mendes").
 *
 * - `target` is the element: a ref, the element itself, or a selector. For a list, let
 *   `useAgentPresence()` hand each item a data attribute and keep where the agent is.
 * - It never touches the target, so nothing moves: the presence is an absolutely positioned layer
 *   in the nearest positioned ancestor of where you render it. Render it inside the same
 *   `position: relative` container as the targets (a `div` around the Table or the board), and it
 *   scrolls with them. It follows the target's corner radius (a table row gets radius-xl, like its
 *   hover) and stops at the edges of anything that clips the target (the Table's frame).
 * - States: `working` (the agent's tone), `done` (green with a check; after `doneDuration` it
 *   fades out) and `conflict` (amber, dashed, the person's avatar: someone is editing the same
 *   row). Colour is never the only cue: the label says each state in words.
 * - Motion: it fades in over --duration-fast; moving to another target it glides there on
 *   --ease-in-out (--duration-slow). It follows its own target without gliding (a scroll, a
 *   sort), so it never trails behind it. Under reduced motion nothing fades or glides and the mark
 *   stands still: a static edge and label.
 *
 * Parts, for a presence of your own: `AgentPresenceRoot` (tracks the target and speaks) ›
 * `AgentPresenceOutline`, `AgentPresenceLabel`. Other props on AgentPresence and
 * AgentPresenceRoot, `ref` included, go to the positioned layer.
 */

/** The words the Agent presence says on its own. They join SatinLabels, so the app translates them there. */
export const agentPresenceLabels = {
  /** Read out when the agent starts on a target, or moves to the next one. */
  agentPresenceWorking: (agent: string, target: string) => `${agent} is updating ${target}`,
  /** Read out when the agent is done with the target. */
  agentPresenceDone: (agent: string, target: string) => `${agent} updated ${target}`,
  /** Read out when a person edits the same target. */
  agentPresenceConflict: (agent: string, target: string, person: string) => `${person} is editing ${target}; ${agent} is waiting`,
  /** The label in a conflict: who else is editing. */
  agentPresenceEditing: (person: string) => `${person} is editing`,
}

type AgentPresenceLabelSet = typeof agentPresenceLabels
declare module '@uisatin/ui/labels' {
  interface SatinLabelSet extends AgentPresenceLabelSet {}
}

const useLabels = () => {
  const labels = useSatinLabels()
  return React.useMemo(() => ({ ...agentPresenceLabels, ...labels }), [labels])
}

/* ---------- types ---------- */

/** What the agent is doing to the target. */
export type AgentPresenceState = 'working' | 'done' | 'conflict'

/** The element the agent is on: a ref, the element, a selector, or nothing (hidden). */
export type AgentPresenceTarget = string | Element | React.RefObject<Element | null> | null | undefined

/** The agent: its name, or the same object AgentPicker takes (`tone`, `avatar: 'flappy'`). */
export type AgentPresenceAgent = string | (Omit<Agent, 'id'> & { id?: string })

/** The person editing the same target, for `conflict`: a name, or a name with an avatar. */
export type AgentPresencePerson = string | { name: string; initials?: string; tone?: AvatarTone }

const nameOf = (who: AgentPresenceAgent | AgentPresencePerson) => (typeof who === 'string' ? who : who.name)

/** "Jon Park" → "JP", "Satin" → "SA", as AgentPicker's avatar does. */
const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/)
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase()
}

/* ---------- tracking the target ---------- */

function resolve(target: AgentPresenceTarget): Element | null {
  if (!target || typeof document === 'undefined') return null
  if (typeof target === 'string') return document.querySelector(target)
  if ('current' in target) return target.current
  return target
}

/** The ancestors between the target and the layer that clip what they hold. */
function clipsOf(el: Element, layer: Element) {
  const clips: Element[] = []
  for (let node = el.parentElement; node && !node.contains(layer); node = node.parentElement) {
    const style = getComputedStyle(node)
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') clips.push(node)
  }
  return clips
}

/** The target's corner, or none for a table row, whose corners are on its cells. */
function radiusOf(el: Element) {
  const radius = getComputedStyle(el).borderTopLeftRadius
  return radius && radius !== '0px' ? radius : ''
}

type Box = { x: number; y: number; w: number; h: number }

/**
 * Where the target shows, in the layer's parent's own pixels, cut to what clips it; null when none
 * of it shows. Measured on screen, then divided by the parent's scale on screen: under a scaled
 * ancestor (a preview shrunk with `scale()`, CSS zoom) every rect comes back scaled, but the layer
 * is laid out in the parent's unscaled pixels, like the parent's own children.
 */
function place(el: Element, clips: Element[], parent: HTMLElement): Box | null {
  const p = parent.getBoundingClientRect()
  const sx = parent.offsetWidth ? p.width / parent.offsetWidth : 1
  const sy = parent.offsetHeight ? p.height / parent.offsetHeight : 1
  let { left, top, right, bottom } = el.getBoundingClientRect()
  for (const clip of clips) {
    const r = clip.getBoundingClientRect()
    left = Math.max(left, r.left + clip.clientLeft * sx)
    top = Math.max(top, r.top + clip.clientTop * sy)
    right = Math.min(right, r.left + (clip.clientLeft + clip.clientWidth) * sx)
    bottom = Math.min(bottom, r.top + (clip.clientTop + clip.clientHeight) * sy)
  }
  if (right - left < 0.5 || bottom - top < 0.5) return null
  // On whole device pixels as drawn, so the label's text stays sharp and the edge doesn't shimmer.
  const dpr = window.devicePixelRatio || 1
  const snap = (v: number, scale: number) => Math.round(v * scale * dpr) / (scale * dpr)
  return {
    x: snap((left - p.left) / sx - parent.clientLeft + parent.scrollLeft, sx),
    y: snap((top - p.top) / sy - parent.clientTop + parent.scrollTop, sy),
    w: snap((right - left) / sx, sx),
    h: snap((bottom - top) / sy, sy),
  }
}

const nextFrame = (fn: () => void) =>
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : (setTimeout(fn, 16) as unknown as number)
const cancelFrame = (id: number) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id))

/** How long a glide to a new target keeps its transition: --duration-slow and a frame. */
const GLIDE_MS = 270

/**
 * Keeps the layer over the target, every frame while there is one. Writes straight to the layer,
 * so following a scroll or a resize re-renders nothing. A new target (another element) glides;
 * the same target moving (a scroll, a sort, a reflow) is followed at once.
 */
function useTrack(layerRef: React.RefObject<HTMLDivElement | null>, target: AgentPresenceTarget, active: boolean) {
  const targetRef = React.useRef(target)
  targetRef.current = target
  React.useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    if (!active || target == null) {
      layer.removeAttribute('data-shown')
      return
    }
    let frame = 0
    let el: Element | null = null
    let clips: Element[] = []
    let radius = ''
    let last = ''
    let glideUntil = 0
    // A target set while it shows is a move: glide to it. One set while hidden appears in place.
    let pendingGlide = layer.hasAttribute('data-shown')
    const tick = () => {
      const wanted = targetRef.current
      const stale =
        !el || !el.isConnected || (typeof wanted === 'string' ? !el.matches(wanted) : wanted !== el && resolve(wanted) !== el)
      if (stale) {
        const found = resolve(wanted)
        if (found !== el) {
          if (el && found) pendingGlide = true
          el = found
          clips = el ? clipsOf(el, layer) : []
          radius = el ? radiusOf(el) : ''
        }
      }
      const parent = (layer.offsetParent as HTMLElement | null) ?? document.body
      const box = el ? place(el, clips, parent) : null
      if (!box) {
        layer.removeAttribute('data-shown')
        last = ''
      } else {
        const key = `${box.x}|${box.y}|${box.w}|${box.h}|${radius}`
        const shown = layer.hasAttribute('data-shown')
        if (key !== last) {
          if (pendingGlide && shown) glideUntil = performance.now() + GLIDE_MS
          pendingGlide = false
          layer.toggleAttribute('data-glide', performance.now() < glideUntil)
          layer.style.transform = `translate(${box.x}px, ${box.y}px)`
          layer.style.width = `${box.w}px`
          layer.style.height = `${box.h}px`
          if (radius) layer.style.setProperty('--agent-presence-radius', radius)
          else layer.style.removeProperty('--agent-presence-radius')
          last = key
        } else if (glideUntil && performance.now() >= glideUntil) {
          glideUntil = 0
          layer.removeAttribute('data-glide')
        }
        if (!shown) layer.setAttribute('data-shown', '')
      }
      frame = nextFrame(tick)
    }
    tick()
    return () => cancelFrame(frame)
  }, [layerRef, target, active])
}

/* ---------- the root ---------- */

interface PresenceContextValue {
  state: AgentPresenceState
  tone: BadgeTone
}
const PresenceContext = React.createContext<PresenceContextValue | null>(null)

function usePresence(part: string) {
  const presence = React.useContext(PresenceContext)
  if (!presence) throw new Error(`${part} must be inside AgentPresenceRoot`)
  return presence
}

/** The tone each state draws in: the agent's own while it works. */
const toneOf = (state: AgentPresenceState, tone: BadgeTone): BadgeTone => (state === 'done' ? 'green' : state === 'conflict' ? 'amber' : tone)

export interface AgentPresenceRootProps extends React.ComponentProps<'div'> {
  /** The element the agent is on: a ref, the element, or a selector. `null` hides the presence (it fades out). */
  target: AgentPresenceTarget
  /** `working` in the agent's tone, `done` green (then it fades out), `conflict` amber: a person edits the same target. */
  state?: AgentPresenceState
  /** The agent's tone while it works, the Badge hue pairs. Done is always green, conflict amber. */
  tone?: BadgeTone
  /** What screen readers hear, politely, each time it changes: "Satin is updating Tara Mendes". */
  announcement?: string
  /** How long `done` stays before it fades out, in ms; `Infinity` keeps it. */
  doneDuration?: number
}

/**
 * Tracks the target and lays a box over it, the size of the target, for the outline and the label
 * inside; speaks `announcement` from a polite status region. Other props, `ref` included, go to
 * the layer (an absolutely positioned `div`, hidden from screen readers).
 */
export function AgentPresenceRoot({
  target,
  state = 'working',
  tone = 'brand',
  announcement,
  doneDuration = 1500,
  className,
  children,
  ref,
  ...props
}: AgentPresenceRootProps) {
  const layerRef = React.useRef<HTMLDivElement>(null)

  // Done stays a moment, then fades out; a new target or state brings it back.
  const [faded, setFaded] = React.useState(false)
  React.useEffect(() => {
    setFaded(false)
    // Infinity keeps it (a timer would round it to 0 and fire at once).
    if (state !== 'done' || target == null || !Number.isFinite(doneDuration)) return
    const timer = setTimeout(() => setFaded(true), doneDuration)
    return () => clearTimeout(timer)
  }, [state, target, doneDuration])

  useTrack(layerRef, target, !faded)

  // The region is in the page before it speaks, so the first words aren't lost.
  const [message, setMessage] = React.useState('')
  React.useEffect(() => {
    setMessage(target != null && announcement ? announcement : '')
  }, [target, announcement])

  const shownTone = toneOf(state, tone)
  const value = React.useMemo(() => ({ state, tone: shownTone }), [state, shownTone])

  return (
    <PresenceContext.Provider value={value}>
      <div
        ref={(node: HTMLDivElement | null) => {
          layerRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        data-slot="agent-presence"
        data-state={state}
        data-tone={shownTone}
        aria-hidden
        className={cn('satin-agent-presence', className)}
        {...props}
      >
        {children}
      </div>
      <span role="status" className="sr-only">
        {message}
      </span>
    </PresenceContext.Provider>
  )
}

/** The edge over the target, in the state's tone; dashed in a conflict. Other props, `ref` included, go to its `span`. */
export function AgentPresenceOutline({ className, ...props }: React.ComponentProps<'span'>) {
  const { state } = usePresence('AgentPresenceOutline')
  return <span data-slot="agent-presence-outline" data-state={state} className={cn('satin-agent-presence-outline', className)} {...props} />
}

export interface AgentPresenceLabelProps extends Omit<React.ComponentProps<typeof Badge>, 'tone' | 'size'> {}

/**
 * The small label on the target's top edge, at its end corner: a small Badge in the state's tone.
 * Put the mark and the words inside. Other props, `ref` included, go to the Badge.
 */
export function AgentPresenceLabel({ className, ...props }: AgentPresenceLabelProps) {
  const { tone } = usePresence('AgentPresenceLabel')
  return <Badge size="sm" tone={tone} data-slot="agent-presence-label" className={cn('satin-agent-presence-label', className)} {...props} />
}

/* ---------- the common case ---------- */

/** The 16px check on the done label, as on the Bulk action bar. */
function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.33333 8.66667L6 11.3333L12.6667 4.66667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export interface AgentPresenceProps extends Omit<AgentPresenceRootProps, 'children' | 'announcement' | 'tone'> {
  /** Who is editing: a name, or AgentPicker's agent (its `tone` colours the presence; `avatar: 'flappy'` runs the bird). */
  agent: AgentPresenceAgent
  /** The target's name, for screen readers: "Tara Mendes" makes "Satin is updating Tara Mendes". */
  label: string
  /** For `conflict`: the person editing the same target. */
  person?: AgentPresencePerson
}

/**
 * The outline and the label from props: the agent's mark and name while it works, a check and
 * Done, or the person's avatar and "Jon Park is editing" in a conflict. Other props, `ref`
 * included, go to the layer.
 */
export function AgentPresence({ agent, label, person, state = 'working', ...props }: AgentPresenceProps) {
  const labels = useLabels()
  const agentName = nameOf(agent)
  const personName = person ? nameOf(person) : ''
  const tone = typeof agent === 'string' ? 'brand' : (agent.tone ?? 'brand')
  const flappy = typeof agent !== 'string' && agent.avatar === 'flappy'
  const conflict = state === 'conflict' && person != null

  const announcement =
    state === 'done'
      ? labels.agentPresenceDone(agentName, label)
      : conflict
        ? labels.agentPresenceConflict(agentName, label, personName)
        : labels.agentPresenceWorking(agentName, label)

  return (
    <AgentPresenceRoot state={state} tone={tone} announcement={announcement} {...props}>
      <AgentPresenceOutline />
      <AgentPresenceLabel>
        {state === 'done' ? (
          <>
            <CheckMark />
            {labels.done}
          </>
        ) : conflict ? (
          <>
            <Avatar
              size={16}
              initials={typeof person === 'string' ? initialsOf(person) : (person.initials ?? initialsOf(person.name))}
              tone={typeof person === 'string' ? 'neutral' : (person.tone ?? 'neutral')}
            />
            {labels.agentPresenceEditing(personName)}
          </>
        ) : (
          <>
            {flappy ? <FlappySprite size={16} run={state === 'working'} /> : <TetrisMark glimmer="neutral" />}
            {agentName}
          </>
        )}
      </AgentPresenceLabel>
    </AgentPresenceRoot>
  )
}

/* ---------- lists ---------- */

/** Where the agent is in a list: the item's id, its name for screen readers, and the state. */
export interface AgentPresenceValue {
  id: string
  /** The item's name, for screen readers ("Tara Mendes"). */
  label: string
  state: AgentPresenceState
  person?: AgentPresencePerson
}

export interface UseAgentPresenceOptions {
  /** Where the agent is, controlled; `null` for nowhere. */
  value?: AgentPresenceValue | null
  /** Where the agent starts, uncontrolled. */
  defaultValue?: AgentPresenceValue | null
  /** Called with where the agent goes next (from `start`, `done`, `conflict`, `clear`). */
  onValueChange?: (value: AgentPresenceValue | null) => void
}

export interface AgentPresenceList {
  /** Where the agent is, or `null`. */
  value: AgentPresenceValue | null
  /**
   * The data attribute that makes an item a target: spread it on the item's element, e.g. on the
   * Table's row, `renderRow={({ row, rowProps, children }) => <tr {...rowProps} {...presence.item(row.id)}>{children}</tr>}`.
   */
  item: (id: string) => { 'data-agent-presence': string }
  /** Puts the agent on an item (working), or moves it there. Call it again after a conflict to carry on. */
  start: (id: string, label: string) => void
  /** The agent is done with the item it's on: green with a check, then it fades out. */
  done: () => void
  /** A person is editing the item the agent is on. */
  conflict: (person: AgentPresencePerson) => void
  /** Takes the presence away (it fades out). */
  clear: () => void
  /** For `<AgentPresence {...presence.props} agent="Satin" />`: `target`, `label`, `state` and `person`. */
  props: Pick<AgentPresenceProps, 'target' | 'label' | 'state' | 'person'>
}

/** A CSS string: the id in quotes, escaped, for an attribute selector. */
const cssString = (s: string) => `"${s.replace(/[\\"]/g, '\\$&').replace(/\n/g, '\\a ')}"`

/**
 * Keeps where one agent is in a list (Table rows, Kanban cards): spread `item(id)` on each item
 * and `props` on an AgentPresence, then move it with `start`, `done`, `conflict` and `clear`.
 * Controlled with `value` and `onValueChange`, or not.
 */
export function useAgentPresence({ value: valueProp, defaultValue = null, onValueChange }: UseAgentPresenceOptions = {}): AgentPresenceList {
  const scope = React.useId()
  const [own, setOwn] = React.useState<AgentPresenceValue | null>(defaultValue)
  const value = valueProp !== undefined ? valueProp : own
  const latest = React.useRef(value)
  latest.current = value
  const onChange = React.useRef(onValueChange)
  onChange.current = onValueChange
  const controlled = valueProp !== undefined

  const set = React.useCallback(
    (next: AgentPresenceValue | null) => {
      latest.current = next
      if (!controlled) setOwn(next)
      onChange.current?.(next)
    },
    [controlled],
  )

  const item = React.useCallback((id: string) => ({ 'data-agent-presence': `${scope}/${id}` }), [scope])
  const start = React.useCallback((id: string, label: string) => set({ id, label, state: 'working' }), [set])
  const done = React.useCallback(() => {
    if (latest.current) set({ ...latest.current, state: 'done', person: undefined })
  }, [set])
  const conflict = React.useCallback(
    (person: AgentPresencePerson) => {
      if (latest.current) set({ ...latest.current, state: 'conflict', person })
    },
    [set],
  )
  const clear = React.useCallback(() => set(null), [set])

  const props = React.useMemo(
    () => ({
      target: value ? `[data-agent-presence=${cssString(`${scope}/${value.id}`)}]` : null,
      label: value?.label ?? '',
      state: value?.state ?? 'working',
      person: value?.person,
    }),
    [value, scope],
  )

  return React.useMemo(() => ({ value, item, start, done, conflict, clear, props }), [value, item, start, done, conflict, clear, props])
}
